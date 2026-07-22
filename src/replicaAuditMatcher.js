const GAP_COST = 1;
const MAX_MATCH_ENTRY_DIFF_PERCENT = 4;
const CLOSE_EVENT_MATCH_WINDOW_MS = 5 * 60 * 1000;
const FEE_MATCH_WINDOW_MS = 5 * 60 * 1000;

export function alignReplicaAuditRecords({
  sheetRows = [],
  openings = [],
  realizedRows = [],
  closeEvents = [],
  openingFees = [],
  closingFees = [],
  fundingRows = [],
  sheetCoverageEndTime = null
} = {}) {
  const lifecycles = buildExecutionLifecycles({
    openings,
    realizedRows,
    closeEvents,
    openingFees,
    closingFees,
    fundingRows
  });
  const aligned = alignBySymbol(sheetRows, lifecycles, sheetCoverageEndTime);
  const matchedRealized = new Set(aligned.map((item) => item.realizedSource || item.realized).filter(Boolean));

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

  return aligned;
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

function buildExecutionLifecycles({ openings, realizedRows, closeEvents, openingFees, closingFees, fundingRows }) {
  const openingsBySymbol = groupBySymbol(openings, eventSymbol);
  const realizedBySymbol = groupBySymbol(realizedRows, incomeSymbol);
  const closeEventsBySymbol = groupBySymbol(closeEvents, eventSymbol);
  const openingFeesBySymbol = groupBySymbol(openingFees, incomeSymbol);
  const fundingBySymbol = groupBySymbol(fundingRows, incomeSymbol);
  const usedCloseEvents = new Set();
  const usedOpeningFees = new Set();
  const lifecycles = [];

  for (const [symbol, symbolOpenings] of openingsBySymbol) {
    const sortedOpenings = [...symbolOpenings].sort(compareEventTime);
    const matchedOpenings = new Set();
    let previousCloseAt = Number.NEGATIVE_INFINITY;

    for (const realizedSource of realizedBySymbol.get(symbol) || []) {
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
      const closingFeeSource = closingFeeForRealized(realizedSource, closingFees);
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
          closeEvent,
          openingFee,
          closingFee: closingFeeSource ? { ...closingFeeSource, income: allocation.closingFee } : null,
          closingFeeSource,
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
        openingFee,
        closingFee: null,
        funding: 0,
        aggregatedOpenings: 1
      });
    }
  }

  return lifecycles;
}

function allocateCycleAmounts({ openings, realized, closingFee, funding, closeEvent }) {
  const closePrice = closeEventPrice(closeEvent);
  const rawPnlWeights = openings.map((opening) => {
    const entry = openingPrice(opening);
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
  const diff = percentDiff(sheet?.entryPrice, openingPrice(opening));
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
  const value = Date.parse(event?.at || 0);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function incomeTime(row) {
  const value = Number(row?.time);
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function openingPrice(event) {
  return firstFinite([
    event?.entryPrice,
    event?.response?.data?.order?.avgPrice,
    event?.marketPrice,
    event?.signal?.entry?.price
  ]);
}

function openingQuantity(event) {
  return firstFinite([
    event?.order?.quantity,
    event?.response?.data?.order?.executedQty,
    event?.response?.data?.order?.quantity
  ]);
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
  const price = openingPrice(event);
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
