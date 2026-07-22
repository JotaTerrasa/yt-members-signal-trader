import { resolveEntryFill, resolveEntryReference, resolveEntryQuantity } from './executionAuditPrices.js';

const GAP_COST = 1;
const MAX_MATCH_ENTRY_DIFF_PERCENT = 4;
const MAX_FAILURE_MATCH_ENTRY_DIFF_PERCENT = 0.1;
const CLOSE_EVENT_MATCH_WINDOW_MS = 5 * 60 * 1000;
const FEE_MATCH_WINDOW_MS = 5 * 60 * 1000;
const ORDER_INCOME_MATCH_WINDOW_MS = 3 * 1000;
const ORDER_PROFIT_MATCH_TOLERANCE = 0.001;
const ORDER_HISTORY_MIN_EVENT_COVERAGE = 0.8;
const QUANTITY_TOLERANCE = 0.00000001;

export function alignReplicaAuditRecords({
  sheetRows = [],
  openings = [],
  realizedRows = [],
  closeEvents = [],
  closeSignalEvents = [],
  openingFees = [],
  closingFees = [],
  fundingRows = [],
  orderRows = [],
  openingFailures = [],
  closeFailures = [],
  unprocessedCloses = [],
  sheetCoverageEndTime = null
} = {}) {
  const lifecycles = buildExecutionLifecycles({
    openings,
    realizedRows,
    closeEvents,
    closeSignalEvents,
    openingFees,
    closingFees,
    fundingRows,
    orderRows
  });
  const aligned = attachOpeningFailures(
    alignBySymbol(sheetRows, lifecycles, sheetCoverageEndTime),
    openingFailures
  );
  const matchedRealized = new Set(aligned.flatMap((item) => (
    item.realizedSources?.length
      ? item.realizedSources
      : [item.realizedSource || item.realized]
  )).filter(Boolean));

  for (const realized of realizedRows) {
    if (matchedRealized.has(realized)) {
      continue;
    }
    aligned.push({
      sheet: null,
      opening: null,
      realized,
      closeEvent: nearestCloseEvent(realized, closeEvents),
      openingFee: null,
      closingFee: closingFeeForRealized(realized, closingFees),
      funding: 0,
      unmatchedClose: true
    });
  }

  return attachUnprocessedCloses(
    attachCloseFailures(aligned, closeFailures),
    unprocessedCloses
  );
}

export function attachOpeningFailures(records = [], failures = []) {
  const used = new Set();
  const candidates = [...(failures || [])].sort((left, right) => eventTime(left) - eventTime(right));
  return (records || []).map((record) => {
    if (!record?.sheet || record?.opening) {
      return record;
    }
    const sheetDate = utcDateKey(record.sheet?.openedAt || record.sheet?.closedAt);
    if (!sheetDate) {
      return record;
    }
    const match = candidates
      .filter((failure) => !used.has(failure))
      .filter((failure) => eventSymbol(failure) === normalizeSymbol(record.sheet?.symbol))
      .filter((failure) => {
        const sheetDirection = normalizeDirection(record.sheet?.direction);
        const failureDirection = normalizeDirection(failure?.signal?.direction);
        return !sheetDirection || !failureDirection || sheetDirection === failureDirection;
      })
      .filter((failure) => utcDateKey(failure?.at) === sheetDate)
      .map((failure) => ({
        failure,
        entryDiff: percentDiff(record.sheet?.entryPrice, openingReferencePrice(failure))
      }))
      .filter((item) => item.entryDiff !== null && item.entryDiff <= MAX_FAILURE_MATCH_ENTRY_DIFF_PERCENT)
      .sort((left, right) => left.entryDiff - right.entryDiff || eventTime(left.failure) - eventTime(right.failure))[0];
    if (!match) {
      return record;
    }
    used.add(match.failure);
    return { ...record, openingFailure: match.failure };
  });
}

export function attachCloseFailures(records = [], failures = []) {
  const candidates = [...(failures || [])].sort((left, right) => eventTime(left) - eventTime(right));
  return (records || []).map((record) => {
    const openingAt = eventTime(record?.opening);
    const closingAt = Math.min(
      eventTime(record?.closeEvent),
      incomeTime(record?.realizedSource || record?.realized)
    );
    if (!Number.isFinite(openingAt) || !Number.isFinite(closingAt)) {
      return record;
    }
    const direction = normalizeDirection(record?.opening?.signal?.direction);
    const symbol = eventSymbol(record?.opening);
    const matches = candidates.filter((failure) => {
      const failureAt = eventTime(failure);
      const failureDirection = normalizeDirection(failure?.signal?.direction);
      return eventSymbol(failure) === symbol
        && failureAt >= openingAt
        && failureAt <= closingAt
        && (!direction || !failureDirection || direction === failureDirection);
    });
    return matches.length ? { ...record, closeFailures: matches } : record;
  });
}

export function attachUnprocessedCloses(records = [], closes = []) {
  const candidates = [...(closes || [])].sort((left, right) => eventTime(left) - eventTime(right));
  return (records || []).map((record) => {
    const openingAt = eventTime(record?.opening);
    if (!Number.isFinite(openingAt)) {
      return record;
    }
    const closingAt = Math.min(
      eventTime(record?.closeEvent),
      incomeTime(record?.realizedSource || record?.realized)
    );
    const direction = normalizeDirection(record?.opening?.signal?.direction);
    const symbol = eventSymbol(record?.opening);
    const matches = candidates.filter((close) => {
      const closeAt = eventTime(close);
      const closeDirection = normalizeDirection(close?.signal?.direction);
      const closeSymbol = eventSymbol(close);
      const closesAll = String(close?.signal?.action || '').toUpperCase() === 'CLOSE_ALL';
      return (closesAll || closeSymbol === symbol)
        && closeAt >= openingAt
        && closeAt <= closingAt
        && (!direction || !closeDirection || direction === closeDirection);
    });
    return matches.length ? { ...record, unprocessedCloses: matches } : record;
  });
}

function alignBySymbol(sheetRows, lifecycles, sheetCoverageEndTime = null) {
  const sheetBySymbol = groupBySymbol(sheetRows, (row) => normalizeSymbol(row?.symbol));
  const lifecycleBySymbol = groupBySymbol(lifecycles, (row) => eventSymbol(row?.opening));
  const symbols = new Set([...sheetBySymbol.keys(), ...lifecycleBySymbol.keys()]);
  const aligned = [];
  const hasCoverageBoundary = Number.isFinite(sheetCoverageEndTime);
  for (const symbol of symbols) {
    const symbolLifecycles = (lifecycleBySymbol.get(symbol) || []).sort(compareLifecycleTime);
    const comparableLifecycles = hasCoverageBoundary
      ? symbolLifecycles.filter((item) => !Number.isFinite(eventTime(item?.opening)) || eventTime(item?.opening) <= sheetCoverageEndTime)
      : symbolLifecycles;
    const outsideCoverageLifecycles = hasCoverageBoundary
      ? symbolLifecycles.filter((item) => Number.isFinite(eventTime(item?.opening)) && eventTime(item?.opening) > sheetCoverageEndTime)
      : [];
    aligned.push(...alignSequences(
      (sheetBySymbol.get(symbol) || []).sort(compareSheetOrder),
      comparableLifecycles
    ));
    aligned.push(...outsideCoverageLifecycles.map((item) => ({ sheet: null, ...item })));
  }
  return aligned.sort((left, right) => {
    const leftOrder = Number(left.sheet?.orderNumber || Number.POSITIVE_INFINITY);
    const rightOrder = Number(right.sheet?.orderNumber || Number.POSITIVE_INFINITY);
    return leftOrder - rightOrder || compareLifecycleTime(left, right);
  });
}

export function alignSequences(sheetRows = [], lifecycles = []) {
  const rowCount = sheetRows.length + 1;
  const columnCount = lifecycles.length + 1;
  const costs = Array.from({ length: rowCount }, () => Array(columnCount).fill(Number.POSITIVE_INFINITY));
  const steps = Array.from({ length: rowCount }, () => Array(columnCount).fill(null));
  costs[0][0] = 0;

  for (let row = 1; row < rowCount; row += 1) {
    costs[row][0] = row * GAP_COST;
    steps[row][0] = 'sheet';
  }
  for (let column = 1; column < columnCount; column += 1) {
    costs[0][column] = column * GAP_COST;
    steps[0][column] = 'execution';
  }

  for (let row = 1; row < rowCount; row += 1) {
    for (let column = 1; column < columnCount; column += 1) {
      const match = costs[row - 1][column - 1] + matchCost(sheetRows[row - 1], lifecycles[column - 1]);
      const skipSheet = costs[row - 1][column] + GAP_COST;
      const skipExecution = costs[row][column - 1] + GAP_COST;
      const best = Math.min(match, skipSheet, skipExecution);
      costs[row][column] = best;
      steps[row][column] = best === match ? 'match' : best === skipSheet ? 'sheet' : 'execution';
    }
  }

  const aligned = [];
  let row = sheetRows.length;
  let column = lifecycles.length;
  while (row > 0 || column > 0) {
    const step = steps[row][column];
    if (step === 'match') {
      aligned.push({ sheet: sheetRows[row - 1], ...lifecycles[column - 1] });
      row -= 1;
      column -= 1;
      continue;
    }
    if (step === 'sheet') {
      aligned.push(emptyLifecycle(sheetRows[row - 1]));
      row -= 1;
      continue;
    }
    aligned.push({ sheet: null, ...lifecycles[column - 1] });
    column -= 1;
  }

  return aligned.reverse();
}

function buildExecutionLifecycles(args) {
  if (hasUsableOrderHistory(args.orderRows)) {
    const historyLifecycles = buildOrderBackedLifecycles(args);
    if (historyLifecycles) {
      return historyLifecycles;
    }
  }
  return buildIncomeBackedLifecycles(args);
}

function hasUsableOrderHistory(rows = []) {
  const orders = (rows || []).map(normalizeOrderEvidence).filter(Boolean);
  return orders.some((order) => !order.isClose) && orders.some((order) => order.isClose);
}

function buildOrderBackedLifecycles({
  openings = [],
  realizedRows = [],
  closeEvents = [],
  closeSignalEvents = [],
  openingFees = [],
  closingFees = [],
  fundingRows = [],
  orderRows = []
}) {
  const orders = orderRows.map(normalizeOrderEvidence).filter(Boolean);
  const entryOrders = orders.filter((order) => !order.isClose).sort(compareOrderTime);
  const closeOrders = orders.filter((order) => order.isClose).sort(compareOrderTime);
  const openingByOrderId = new Map();
  const openingByClientOrderId = new Map();
  for (const opening of openings) {
    const orderId = openingOrderId(opening);
    const clientOrderId = String(opening?.order?.clientOrderId || '').trim();
    if (orderId) {
      openingByOrderId.set(orderId, opening);
    }
    if (clientOrderId) {
      openingByClientOrderId.set(clientOrderId, opening);
    }
  }
  const matchedOpeningEvents = new Set();
  const records = entryOrders.map((order) => {
    const sourceOpening = openingByOrderId.get(order.orderId)
      || openingByClientOrderId.get(order.clientOrderId)
      || null;
    if (sourceOpening) {
      matchedOpeningEvents.add(sourceOpening);
    }
    const opening = auditOpeningFromOrder(order, sourceOpening);
    return {
      opening,
      order,
      positionId: order.positionId,
      quantity: order.quantity,
      remainingQuantity: order.quantity,
      openedAt: order.time,
      stopLoss: firstFinite([opening?.signal?.stopLoss, order.stopPrice]),
      allocations: []
    };
  });
  const coveredEvents = openings.filter((opening) => matchedOpeningEvents.has(opening)).length;
  const coverage = openings.length ? coveredEvents / openings.length : 1;
  if (coverage < ORDER_HISTORY_MIN_EVENT_COVERAGE) {
    return null;
  }

  for (const opening of openings.filter((event) => !matchedOpeningEvents.has(event))) {
    const quantity = openingQuantity(opening);
    if (!(quantity > 0)) {
      continue;
    }
    records.push({
      opening,
      order: null,
      positionId: openingPositionId(opening),
      quantity,
      remainingQuantity: quantity,
      openedAt: eventTime(opening),
      stopLoss: firstFinite([opening?.signal?.stopLoss]),
      allocations: []
    });
  }
  records.sort((left, right) => left.openedAt - right.openedAt);

  const incomeByOrder = matchCloseOrdersToIncome(closeOrders, realizedRows);
  const incomeCoverage = realizedRows.length
    ? incomeByOrder.size / Math.min(closeOrders.length || 1, realizedRows.length)
    : 1;
  if (incomeCoverage < ORDER_HISTORY_MIN_EVENT_COVERAGE) {
    return null;
  }
  const closingFeeByOrder = new Map();
  for (const order of closeOrders) {
    const realized = incomeByOrder.get(order.orderId);
    const fee = realized ? closingFeeForRealized(realized, closingFees) : null;
    if (fee) {
      closingFeeByOrder.set(order.orderId, fee);
    }
  }

  for (const closeOrder of closeOrders) {
    allocateCloseOrder({
      closeOrder,
      records,
      realizedSource: incomeByOrder.get(closeOrder.orderId) || null,
      closingFeeSource: closingFeeByOrder.get(closeOrder.orderId) || null
    });
  }

  const fundingByOpening = allocateFundingByOpening(records, fundingRows);
  const usedOpeningFees = new Set();
  const positionOpeningCounts = records.reduce((counts, record) => {
    if (record.positionId) {
      counts.set(record.positionId, (counts.get(record.positionId) || 0) + 1);
    }
    return counts;
  }, new Map());

  return records.map((record) => {
    const openingFee = nearestUnusedIncome(
      openingFees.filter((fee) => incomeSymbol(fee) === eventSymbol(record.opening)),
      record.openedAt,
      usedOpeningFees,
      FEE_MATCH_WINDOW_MS
    );
    if (openingFee) {
      usedOpeningFees.add(openingFee);
    }
    if (!record.allocations.length) {
      return {
        opening: record.opening,
        realized: null,
        realizedSource: null,
        realizedSources: [],
        closeEvent: null,
        closeSignalEvent: null,
        closeOrderEvidence: null,
        openingFee,
        closingFee: null,
        closingFeeSource: null,
        closingFeeSources: [],
        funding: fundingByOpening.get(record) || 0,
        aggregatedOpenings: positionOpeningCounts.get(record.positionId) || 1,
        orderHistoryBacked: true
      };
    }

    const closedAt = Math.max(...record.allocations.map((allocation) => allocation.order.time));
    const realizedSources = uniqueObjects(record.allocations.map((allocation) => allocation.realizedSource).filter(Boolean));
    const closingFeeSources = uniqueObjects(record.allocations.map((allocation) => allocation.closingFeeSource).filter(Boolean));
    const symbol = eventSymbol(record.opening);
    const realizedSource = aggregateAllocatedIncome(record.allocations, 'realized', realizedSources, closedAt, symbol);
    const closingFeeSource = aggregateAllocatedIncome(record.allocations, 'closingFee', closingFeeSources, closedAt, symbol);
    const closeOrderEvidence = aggregateCloseOrderEvidence(record.allocations);
    const closeEvent = nearestEventBySymbol(closeEvents, symbol, closedAt, record.openedAt);
    const closeSignalEvent = nearestPrecedingEventBySymbol(
      closeSignalEvents,
      symbol,
      closeEvent ? eventTime(closeEvent) : closedAt,
      record.openedAt
    );
    const aggregatedOpenings = Math.max(
      positionOpeningCounts.get(record.positionId) || 1,
      ...record.allocations.map((allocation) => allocation.sharedOpenings || 1)
    );

    return {
      opening: record.opening,
      realized: realizedSource ? {
        ...realizedSource,
        allocationRatio: roundAmount(closeOrderEvidence.quantity / record.quantity),
        aggregatedOpenings
      } : null,
      realizedSource,
      realizedSources,
      closeEvent,
      closeSignalEvent,
      closeOrderEvidence,
      openingFee,
      closingFee: closingFeeSource,
      closingFeeSource,
      closingFeeSources,
      funding: fundingByOpening.get(record) || 0,
      aggregatedOpenings,
      orderHistoryBacked: true
    };
  });
}

function normalizeOrderEvidence(row = {}) {
  const orderId = String(row.orderId || row.orderID || '').trim();
  const symbol = normalizeSymbol(row.symbol);
  const quantity = firstFinite([row.executedQty]);
  const avgPrice = firstFinite([row.avgPrice]);
  const time = Number(row.time || row.updateTime);
  if (!orderId || !symbol || !(quantity > 0) || !(avgPrice > 0) || !Number.isFinite(time)) {
    return null;
  }
  const isClose = row.reduceOnly === true || String(row.reduceOnly).toLowerCase() === 'true';
  return {
    raw: row,
    orderId,
    clientOrderId: String(row.clientOrderId || '').trim(),
    positionId: String(row.positionID || row.positionId || '').trim(),
    symbol,
    direction: normalizeDirection(row.positionSide),
    quantity,
    avgPrice,
    profit: Number(row.profit || 0),
    commission: Number(row.commission || 0),
    stopPrice: firstFinite([row.stopPrice, row.stopLossEntrustPrice, attachedStopPrice(row)]) || 0,
    leverage: firstFinite([String(row.leverage || '').replace(/x/i, '')]) || 1,
    type: String(row.type || row.orderType || '').toUpperCase(),
    isClose,
    time
  };
}

function auditOpeningFromOrder(order, sourceOpening) {
  if (sourceOpening) {
    const responseOrder = sourceOpening?.response?.data?.order || {};
    return {
      ...sourceOpening,
      response: {
        ...sourceOpening.response,
        data: {
          ...sourceOpening.response?.data,
          order: {
            ...responseOrder,
            orderId: order.orderId,
            positionID: order.positionId,
            avgPrice: String(order.avgPrice),
            executedQty: String(order.quantity)
          }
        }
      },
      historyOrder: compactOrderEvidence(order)
    };
  }
  const exposure = order.avgPrice * order.quantity;
  const notional = exposure / order.leverage;
  return {
    at: new Date(order.time).toISOString(),
    status: 'demo_order_history',
    executionMode: 'demo',
    signal: {
      isSignal: true,
      symbol: order.symbol,
      direction: order.direction,
      entry: { type: 'MARKET', price: order.avgPrice },
      stopLoss: order.stopPrice || null,
      takeProfits: [],
      leverage: order.leverage
    },
    order: {
      symbol: order.symbol,
      type: 'MARKET',
      quantity: order.quantity,
      clientOrderId: order.clientOrderId || null
    },
    response: {
      data: {
        order: {
          orderId: order.orderId,
          positionID: order.positionId,
          avgPrice: String(order.avgPrice),
          executedQty: String(order.quantity)
        }
      }
    },
    sizing: { notional: roundAmount(notional) },
    costGuard: { exposure: roundAmount(exposure) },
    marketPrice: order.avgPrice,
    entryPrice: order.avgPrice,
    referenceEntryPrice: order.avgPrice,
    historyOrderOnly: true,
    historyOrder: compactOrderEvidence(order),
    eventId: `order-history|${order.orderId}`
  };
}

function compactOrderEvidence(order) {
  return {
    orderId: order.orderId,
    positionId: order.positionId,
    type: order.type,
    avgPrice: order.avgPrice,
    quantity: order.quantity,
    profit: order.profit,
    commission: order.commission,
    stopPrice: order.stopPrice,
    time: order.time
  };
}

function attachedStopPrice(row = {}) {
  if (row.stopLoss && typeof row.stopLoss === 'object') {
    return firstFinite([row.stopLoss.stopPrice, row.stopLoss.price]);
  }
  if (typeof row.stopLoss !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(row.stopLoss);
    return firstFinite([parsed?.stopPrice, parsed?.price]);
  } catch {
    return null;
  }
}

function openingOrderId(opening = {}) {
  return String(
    opening?.response?.data?.order?.orderId
    || opening?.response?.data?.order?.orderID
    || opening?.historyOrder?.orderId
    || ''
  ).trim();
}

function openingPositionId(opening = {}) {
  return String(
    opening?.response?.data?.order?.positionID
    || opening?.response?.data?.order?.positionId
    || opening?.exchangePosition?.id
    || ''
  ).trim();
}

function matchCloseOrdersToIncome(closeOrders = [], realizedRows = []) {
  const used = new Set();
  const matches = new Map();
  for (const order of closeOrders) {
    const match = realizedRows
      .map((row, index) => ({
        row,
        index,
        timeDiff: Math.abs(incomeTime(row) - order.time),
        profitDiff: Math.abs(Number(row?.income || 0) - order.profit)
      }))
      .filter((item) => !used.has(item.index))
      .filter((item) => incomeSymbol(item.row) === order.symbol)
      .filter((item) => item.timeDiff <= ORDER_INCOME_MATCH_WINDOW_MS)
      .sort((left, right) => left.profitDiff - right.profitDiff || left.timeDiff - right.timeDiff)[0];
    if (!match || match.profitDiff > ORDER_PROFIT_MATCH_TOLERANCE) {
      continue;
    }
    used.add(match.index);
    matches.set(order.orderId, match.row);
  }
  return matches;
}

function allocateCloseOrder({ closeOrder, records, realizedSource, closingFeeSource }) {
  let remaining = closeOrder.quantity;
  const candidates = records.filter((record) => (
    record.remainingQuantity > QUANTITY_TOLERANCE
    && record.openedAt <= closeOrder.time
    && eventSymbol(record.opening) === closeOrder.symbol
    && (!closeOrder.positionId || !record.positionId || record.positionId === closeOrder.positionId)
    && (!closeOrder.direction || !normalizeDirection(record.opening?.signal?.direction)
      || normalizeDirection(record.opening?.signal?.direction) === closeOrder.direction)
  ));
  sortCloseCandidates(candidates, closeOrder);
  const selected = [];
  for (const record of candidates) {
    if (remaining <= QUANTITY_TOLERANCE) {
      break;
    }
    const quantity = Math.min(record.remainingQuantity, remaining);
    record.remainingQuantity = roundAmount(record.remainingQuantity - quantity);
    remaining = roundAmount(remaining - quantity);
    selected.push({ record, quantity });
  }
  for (const { record, quantity } of selected) {
    const ratio = quantity / closeOrder.quantity;
    record.allocations.push({
      order: closeOrder,
      quantity,
      realized: roundAmount(Number(realizedSource?.income ?? closeOrder.profit) * ratio),
      closingFee: roundAmount(Number(closingFeeSource?.income ?? closeOrder.commission) * ratio),
      realizedSource,
      closingFeeSource,
      sharedOpenings: selected.length
    });
  }
}

function sortCloseCandidates(candidates, closeOrder) {
  if (closeOrder.stopPrice > 0) {
    candidates.sort((left, right) => {
      const leftDistance = left.stopLoss > 0
        ? Math.abs(left.stopLoss - closeOrder.stopPrice) / closeOrder.stopPrice
        : Number.POSITIVE_INFINITY;
      const rightDistance = right.stopLoss > 0
        ? Math.abs(right.stopLoss - closeOrder.stopPrice) / closeOrder.stopPrice
        : Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance
        || Math.abs(left.remainingQuantity - closeOrder.quantity) - Math.abs(right.remainingQuantity - closeOrder.quantity)
        || right.openedAt - left.openedAt;
    });
    return;
  }
  candidates.sort((left, right) => left.openedAt - right.openedAt);
}

function aggregateCloseOrderEvidence(allocations = []) {
  const quantity = sum(allocations.map((allocation) => allocation.quantity));
  const avgPrice = quantity > 0
    ? sum(allocations.map((allocation) => allocation.order.avgPrice * allocation.quantity)) / quantity
    : null;
  return {
    source: 'exchange_order_history',
    avgPrice: roundAmount(avgPrice),
    quantity: roundAmount(quantity),
    orderIds: [...new Set(allocations.map((allocation) => allocation.order.orderId))],
    positionIds: [...new Set(allocations.map((allocation) => allocation.order.positionId).filter(Boolean))],
    types: [...new Set(allocations.map((allocation) => allocation.order.type).filter(Boolean))],
    stopPrices: [...new Set(allocations.map((allocation) => allocation.order.stopPrice).filter((value) => value > 0))],
    closedAt: allocations.length
      ? new Date(Math.max(...allocations.map((allocation) => allocation.order.time))).toISOString()
      : null
  };
}

function aggregateAllocatedIncome(allocations, valueKey, sources, time, symbol) {
  const income = roundAmount(sum(allocations.map((allocation) => allocation[valueKey])));
  const tradeIds = sources.map((source) => String(source?.tradeId || '')).filter(Boolean);
  return {
    ...(sources[0] || {}),
    symbol: sources[0]?.symbol || symbol,
    incomeType: sources[0]?.incomeType || (valueKey === 'realized' ? 'REALIZED_PNL' : 'TRADING_FEE'),
    income,
    time,
    tradeId: tradeIds.length === 1 ? tradeIds[0] : '',
    tradeIds,
    groupedRecords: sources.length || allocations.length,
    source: 'exchange_order_history'
  };
}

function allocateFundingByOpening(records = [], fundingRows = []) {
  const totals = new Map(records.map((record) => [record, 0]));
  for (const funding of fundingRows) {
    const timestamp = incomeTime(funding);
    const symbol = incomeSymbol(funding);
    const active = records.filter((record) => (
      eventSymbol(record.opening) === symbol
      && record.openedAt <= timestamp
      && (!record.allocations.length || Math.max(...record.allocations.map((allocation) => allocation.order.time)) >= timestamp)
    ));
    if (!active.length) {
      continue;
    }
    const weights = active.map((record) => openingExposure(record.opening));
    const parts = allocateAmount(Number(funding.income || 0), weights);
    active.forEach((record, index) => totals.set(record, roundAmount((totals.get(record) || 0) + parts[index])));
  }
  return totals;
}

function nearestEventBySymbol(rows, symbol, targetTime, minimumTime) {
  return rows
    .filter((row) => eventSymbol(row) === symbol && eventTime(row) >= minimumTime)
    .map((row) => ({ row, distance: Math.abs(eventTime(row) - targetTime) }))
    .filter((item) => item.distance <= CLOSE_EVENT_MATCH_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance)[0]?.row || null;
}

function nearestPrecedingEventBySymbol(rows, symbol, targetTime, minimumTime) {
  return rows
    .filter((row) => eventSymbol(row) === symbol)
    .filter((row) => eventTime(row) >= minimumTime && eventTime(row) <= targetTime)
    .map((row) => ({ row, distance: targetTime - eventTime(row) }))
    .filter((item) => item.distance <= CLOSE_EVENT_MATCH_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance)[0]?.row || null;
}

function uniqueObjects(values = []) {
  return [...new Set(values)];
}

function compareOrderTime(left, right) {
  return left.time - right.time || left.orderId.localeCompare(right.orderId);
}

function buildIncomeBackedLifecycles({ openings, realizedRows, closeEvents, closeSignalEvents, openingFees, closingFees, fundingRows }) {
  const openingsBySymbol = groupBySymbol(openings, eventSymbol);
  const realizedBySymbol = groupBySymbol(realizedRows, incomeSymbol);
  const closeEventsBySymbol = groupBySymbol(closeEvents, eventSymbol);
  const closeSignalsBySymbol = groupBySymbol(closeSignalEvents, eventSymbol);
  const openingFeesBySymbol = groupBySymbol(openingFees, incomeSymbol);
  const fundingBySymbol = groupBySymbol(fundingRows, incomeSymbol);
  const usedCloseEvents = new Set();
  const usedCloseSignals = new Set();
  const usedOpeningFees = new Set();
  const lifecycles = [];

  for (const [symbol, symbolOpenings] of openingsBySymbol) {
    const sortedOpenings = [...symbolOpenings].sort(compareEventTime);
    const matchedOpenings = new Set();
    let previousCloseAt = Number.NEGATIVE_INFINITY;

    for (const realizedCycle of groupRealizedCycles(realizedBySymbol.get(symbol) || [])) {
      const realizedSource = realizedCycle.aggregate;
      const realizedAt = incomeTime(realizedSource);
      const cycleOpenings = sortedOpenings.filter((opening) => (
        !matchedOpenings.has(opening)
        && eventTime(opening) > previousCloseAt
        && eventTime(opening) <= realizedAt
      ));
      previousCloseAt = realizedAt;
      if (!cycleOpenings.length) {
        continue;
      }

      const closeEvent = nearestUnusedEvent(
        closeEventsBySymbol.get(symbol) || [],
        realizedAt,
        eventTime(cycleOpenings[0]),
        usedCloseEvents
      );
      if (closeEvent) {
        usedCloseEvents.add(closeEvent);
      }
      const closeSignalEvent = nearestUnusedPrecedingEvent(
        closeSignalsBySymbol.get(symbol) || [],
        closeEvent ? eventTime(closeEvent) : realizedAt,
        eventTime(cycleOpenings[0]),
        usedCloseSignals
      );
      if (closeSignalEvent) {
        usedCloseSignals.add(closeSignalEvent);
      }
      const closingFeeCycle = closingFeeCycleForRealized(realizedCycle.sources, closingFees);
      const closingFeeSource = closingFeeCycle.aggregate;
      const fundingTotal = sumFunding(
        fundingBySymbol.get(symbol) || [],
        eventTime(cycleOpenings[0]),
        realizedAt
      );
      const allocations = allocateCycleAmounts({
        openings: cycleOpenings,
        realized: Number(realizedSource.income || 0),
        closingFee: Number(closingFeeSource?.income || 0),
        funding: fundingTotal,
        closeEvent
      });

      cycleOpenings.forEach((opening, index) => {
        const openingFee = nearestUnusedIncome(
          openingFeesBySymbol.get(symbol) || [],
          eventTime(opening),
          usedOpeningFees,
          FEE_MATCH_WINDOW_MS
        );
        if (openingFee) {
          usedOpeningFees.add(openingFee);
        }
        matchedOpenings.add(opening);
        const allocation = allocations[index];
        lifecycles.push({
          opening,
          realized: {
            ...realizedSource,
            income: allocation.realized,
            allocationRatio: allocation.ratio,
            aggregatedOpenings: cycleOpenings.length
          },
          realizedSource,
          realizedSources: realizedCycle.sources,
          closeEvent,
          closeSignalEvent,
          openingFee,
          closingFee: closingFeeSource ? { ...closingFeeSource, income: allocation.closingFee } : null,
          closingFeeSource,
          closingFeeSources: closingFeeCycle.sources,
          funding: allocation.funding,
          aggregatedOpenings: cycleOpenings.length
        });
      });
    }

    for (const opening of sortedOpenings.filter((item) => !matchedOpenings.has(item))) {
      const openingFee = nearestUnusedIncome(
        openingFeesBySymbol.get(symbol) || [],
        eventTime(opening),
        usedOpeningFees,
        FEE_MATCH_WINDOW_MS
      );
      if (openingFee) {
        usedOpeningFees.add(openingFee);
      }
      lifecycles.push({
        opening,
        realized: null,
        realizedSource: null,
        closeEvent: null,
        closeSignalEvent: null,
        openingFee,
        closingFee: null,
        funding: 0,
        aggregatedOpenings: 1
      });
    }
  }

  return lifecycles;
}

function groupRealizedCycles(rows = []) {
  const groups = [];
  for (const row of rows) {
    const timestamp = incomeTime(row);
    const current = groups.at(-1);
    if (current && current.timestamp === timestamp) {
      current.sources.push(row);
      continue;
    }
    groups.push({ timestamp, sources: [row] });
  }
  return groups.map((group) => ({
    sources: group.sources,
    aggregate: aggregateIncomeRows(group.sources)
  }));
}

function closingFeeCycleForRealized(realizedSources = [], closingFees = []) {
  const used = new Set();
  const sources = [];
  for (const realized of realizedSources) {
    const fee = closingFeeForRealized(realized, closingFees);
    if (fee && !used.has(fee)) {
      used.add(fee);
      sources.push(fee);
    }
  }
  return {
    sources,
    aggregate: aggregateIncomeRows(sources)
  };
}

function aggregateIncomeRows(rows = []) {
  if (!rows.length) {
    return null;
  }
  if (rows.length === 1) {
    return rows[0];
  }
  const tradeIds = rows.map((row) => String(row?.tradeId || '')).filter(Boolean);
  return {
    ...rows[0],
    income: roundAmount(rows.reduce((total, row) => total + Number(row?.income || 0), 0)),
    tradeId: '',
    tradeIds,
    groupedRecords: rows.length
  };
}

function allocateCycleAmounts({ openings, realized, closingFee, funding, closeEvent }) {
  const closePrice = closeEventPrice(closeEvent);
  const rawPnlWeights = openings.map((opening) => {
    const entry = openingFillPrice(opening);
    const quantity = openingQuantity(opening);
    const direction = normalizeDirection(opening?.signal?.direction);
    if (!Number.isFinite(closePrice) || !Number.isFinite(entry) || !Number.isFinite(quantity)) {
      return 0;
    }
    const gross = direction === 'SHORT'
      ? (entry - closePrice) * quantity
      : (closePrice - entry) * quantity;
    return Math.abs(gross);
  });
  const exposureWeights = openings.map((opening) => openingExposure(opening));
  const pnlWeights = sum(rawPnlWeights) > 0 ? rawPnlWeights : exposureWeights;
  const realizedParts = allocateAmount(realized, pnlWeights);
  const feeParts = allocateAmount(closingFee, exposureWeights);
  const fundingParts = allocateAmount(funding, exposureWeights);
  const totalWeight = sum(exposureWeights) || openings.length;

  return openings.map((opening, index) => ({
    realized: realizedParts[index],
    closingFee: feeParts[index],
    funding: fundingParts[index],
    ratio: roundAmount((exposureWeights[index] || 1) / totalWeight)
  }));
}

function allocateAmount(total, weights) {
  const target = Number(total || 0);
  const measuredWeight = sum(weights);
  const hasMeasuredWeight = measuredWeight > 0;
  const weightTotal = hasMeasuredWeight ? measuredWeight : weights.length || 1;
  let assigned = 0;
  return weights.map((weight, index) => {
    const normalizedWeight = hasMeasuredWeight ? Number(weight || 0) : 1;
    const value = index === weights.length - 1
      ? target - assigned
      : target * (normalizedWeight / weightTotal);
    const rounded = roundAmount(value);
    assigned += rounded;
    return rounded;
  });
}

function matchCost(sheet, lifecycle) {
  const opening = lifecycle?.opening;
  if (!opening || normalizeSymbol(sheet?.symbol) !== eventSymbol(opening)) {
    return Number.POSITIVE_INFINITY;
  }
  const sheetDirection = normalizeDirection(sheet?.direction);
  const openingDirection = normalizeDirection(opening?.signal?.direction);
  if (sheetDirection && openingDirection && sheetDirection !== openingDirection) {
    return Number.POSITIVE_INFINITY;
  }
  const diff = percentDiff(sheet?.entryPrice, openingReferencePrice(opening));
  if (diff == null) {
    return 0.25;
  }
  if (diff > MAX_MATCH_ENTRY_DIFF_PERCENT) {
    return GAP_COST * 2 + Math.min(diff, 10);
  }
  return Math.min(GAP_COST * 1.5, diff / 2);
}

function emptyLifecycle(sheet) {
  return {
    sheet,
    opening: null,
    realized: null,
    closeEvent: null,
    openingFee: null,
    closingFee: null,
    funding: 0
  };
}

function firstUnusedAfter(rows, timestamp, used) {
  return rows.find((row) => !used.has(row) && incomeTime(row) >= timestamp) || null;
}

function nearestUnusedEvent(rows, targetTime, minimumTime, used) {
  const candidates = rows
    .filter((row) => !used.has(row) && eventTime(row) >= minimumTime)
    .map((row) => ({ row, distance: Number.isFinite(targetTime) ? Math.abs(eventTime(row) - targetTime) : 0 }))
    .filter((item) => !Number.isFinite(targetTime) || item.distance <= CLOSE_EVENT_MATCH_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance);
  return candidates[0]?.row || null;
}

function nearestUnusedIncome(rows, targetTime, used, maxDistance) {
  return rows
    .filter((row) => !used.has(row))
    .map((row) => ({ row, distance: Math.abs(incomeTime(row) - targetTime) }))
    .filter((item) => item.distance <= maxDistance)
    .sort((left, right) => left.distance - right.distance)[0]?.row || null;
}

function nearestCloseEvent(realized, events) {
  const symbol = incomeSymbol(realized);
  const target = incomeTime(realized);
  return events
    .filter((event) => eventSymbol(event) === symbol)
    .map((event) => ({ event, distance: Math.abs(eventTime(event) - target) }))
    .filter((item) => item.distance <= CLOSE_EVENT_MATCH_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance)[0]?.event || null;
}

function closingFeeForRealized(realized, closingFees) {
  if (!realized) {
    return null;
  }
  const tradeId = String(realized.tradeId || '');
  if (tradeId) {
    const exact = closingFees.find((fee) => String(fee.tradeId || '') === tradeId);
    if (exact) {
      return exact;
    }
  }
  const symbol = incomeSymbol(realized);
  const target = incomeTime(realized);
  return closingFees
    .filter((fee) => incomeSymbol(fee) === symbol)
    .map((fee) => ({ fee, distance: Math.abs(incomeTime(fee) - target) }))
    .filter((item) => item.distance <= FEE_MATCH_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance)[0]?.fee || null;
}

function sumFunding(rows, startTime, endTime) {
  if (!Number.isFinite(startTime)) {
    return 0;
  }
  const limit = Number.isFinite(endTime) ? endTime : Number.POSITIVE_INFINITY;
  return rows.reduce((sum, row) => {
    const timestamp = incomeTime(row);
    return timestamp >= startTime && timestamp <= limit ? sum + Number(row.income || 0) : sum;
  }, 0);
}

function nextOpeningTime(openings, index, symbol) {
  for (let cursor = index + 1; cursor < openings.length; cursor += 1) {
    if (eventSymbol(openings[cursor]) === symbol) {
      return eventTime(openings[cursor]);
    }
  }
  return Number.POSITIVE_INFINITY;
}

function groupBySymbol(rows, symbolFactory) {
  const groups = new Map();
  for (const row of rows) {
    const symbol = symbolFactory(row);
    if (!symbol) {
      continue;
    }
    if (!groups.has(symbol)) {
      groups.set(symbol, []);
    }
    groups.get(symbol).push(row);
  }
  for (const rowsForSymbol of groups.values()) {
    rowsForSymbol.sort((left, right) => rowTime(left) - rowTime(right));
  }
  return groups;
}

function compareSheetOrder(left, right) {
  return Number(left?.orderNumber || left?._auditOrder || 0) - Number(right?.orderNumber || right?._auditOrder || 0);
}

function compareLifecycleTime(left, right) {
  return eventTime(left?.opening) - eventTime(right?.opening);
}

function compareEventTime(left, right) {
  return eventTime(left) - eventTime(right);
}

function rowTime(row) {
  return row?.at ? eventTime(row) : incomeTime(row);
}

function eventTime(event) {
  if (!event?.at) {
    return Number.POSITIVE_INFINITY;
  }
  const value = Date.parse(event.at);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function nearestUnusedPrecedingEvent(rows, targetTime, minimumTime, used) {
  return rows
    .filter((row) => !used.has(row))
    .filter((row) => eventTime(row) >= minimumTime && eventTime(row) <= targetTime)
    .map((row) => ({ row, distance: targetTime - eventTime(row) }))
    .filter((item) => item.distance <= CLOSE_EVENT_MATCH_WINDOW_MS)
    .sort((left, right) => left.distance - right.distance)[0]?.row || null;
}

function utcDateKey(value) {
  if (!value) {
    return '';
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
}

function incomeTime(row) {
  const value = Number(row?.time);
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function openingReferencePrice(event) {
  return resolveEntryReference(event)?.price ?? openingFillPrice(event);
}

function openingFillPrice(event) {
  return resolveEntryFill(event)?.price ?? null;
}

function openingQuantity(event) {
  return resolveEntryQuantity(event);
}

function openingExposure(event) {
  const explicit = firstFinite([
    event?.costGuard?.exposure,
    event?.sizing?.notional && event?.signal?.leverage
      ? Number(event.sizing.notional) * Number(event.signal.leverage)
      : null
  ]);
  if (explicit) {
    return explicit;
  }
  const quantity = openingQuantity(event);
  const price = openingFillPrice(event);
  return quantity && price ? quantity * price : 1;
}

function closeEventPrice(event) {
  return firstFinite([
    event?.exchangePosition?.closePrice,
    event?.exchangePosition?.currentPrice,
    event?.closePrice,
    event?.exchangeClose?.orders?.[0]?.position?.markPrice
  ]);
}

function eventSymbol(event) {
  return normalizeSymbol(event?.signal?.symbol || event?.order?.symbol || event?.exchangePosition?.symbol);
}

function incomeSymbol(row) {
  return normalizeSymbol(row?.symbol);
}

function normalizeSymbol(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.endsWith('USDT') ? `${compact.slice(0, -4)}-USDT` : compact;
}

function normalizeDirection(value) {
  const direction = String(value || '').toUpperCase();
  return direction === 'LONG' || direction === 'SHORT' ? direction : '';
}

function percentDiff(left, right) {
  const first = Number(left);
  const second = Number(right);
  if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0) {
    return null;
  }
  return Math.abs(first - second) / first * 100;
}

function firstFinite(values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }
  return null;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
}
