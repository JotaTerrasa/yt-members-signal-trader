export function resolveEntryReference(event = {}) {
  return resolveFirst([
    candidate(event?.referenceEntryPrice, 'signal_reference'),
    candidate(event?.signal?.entry?.requestedPrice, 'signal_reference'),
    candidate(event?.signal?.entry?.price, 'signal_reference')
  ]);
}

export function resolveEntryFill(event = {}) {
  const reference = resolveEntryReference(event);
  return resolveFirst([
    candidate(event?.response?.data?.order?.avgPrice, 'exchange_fill'),
    candidate(event?.exchangePosition?.entryPrice, 'exchange_position'),
    candidate(event?.entryPrice, 'market_snapshot'),
    candidate(event?.marketPrice, 'market_snapshot'),
    reference
  ]);
}

export function resolveEntryQuantity(event = {}) {
  return finitePositive([
    event?.response?.data?.order?.executedQty,
    event?.order?.quantity,
    event?.response?.data?.order?.quantity,
    event?.exchangePosition?.quantity
  ]);
}

export function resolveCloseReference(event = {}) {
  return resolveFirst([
    candidate(event?.closePrice, 'signal_reference'),
    candidate(event?.signal?.closePrice, 'signal_reference')
  ]);
}

export function resolveCloseFill({
  opening = {},
  closeEvent = {},
  closeSignalEvent = {},
  realized = null,
  realizedSource = null
} = {}) {
  const reported = resolveFirst([
    candidate(closeEvent?.exchangePosition?.closePrice, 'exchange_fill'),
    candidate(closeEvent?.closePrice, 'exchange_fill')
  ]);
  if (reported) {
    return reported;
  }

  const positionEntry = finitePositive([
    closeEvent?.exchangePosition?.entryPrice,
    closeEvent?.exchangePosition?.raw?.avgPrice
  ]);
  const positionQuantity = finitePositive([
    closeEvent?.exchangePosition?.quantity,
    closeEvent?.exchangePosition?.raw?.positionAmt,
    closeEvent?.exchangePosition?.raw?.availableAmt
  ]);
  const sourcePnl = finiteNumber(realizedSource?.income ?? realized?.income);
  const closeRatio = closePercentRatio(closeSignalEvent);
  const positionFill = derivedClosePrice({
    entryPrice: positionEntry,
    quantity: positionQuantity == null ? null : positionQuantity * closeRatio,
    realizedPnl: sourcePnl,
    direction: executionDirection(opening, closeEvent)
  });
  if (positionFill !== null) {
    return { price: positionFill, source: 'derived_position_pnl' };
  }

  const entryFill = resolveEntryFill(opening);
  const openingQuantity = resolveEntryQuantity(opening);
  const allocatedPnl = finiteNumber(realized?.income);
  const tradeFill = derivedClosePrice({
    entryPrice: entryFill?.price,
    quantity: openingQuantity == null ? null : openingQuantity * closeRatio,
    realizedPnl: allocatedPnl,
    direction: executionDirection(opening, closeEvent)
  });
  if (tradeFill !== null) {
    return { price: tradeFill, source: 'derived_trade_pnl' };
  }

  return resolveFirst([
    candidate(closeEvent?.exchangePosition?.currentPrice, 'market_snapshot'),
    candidate(closeEvent?.exchangePosition?.raw?.markPrice, 'market_snapshot'),
    resolveCloseReference(closeSignalEvent)
  ]);
}

export function entryAdverseDeviationPercent({ actual, reference, direction } = {}) {
  const signed = entrySignedDeviationPercent({ actual, reference, direction });
  return signed === null ? null : Math.max(0, signed);
}

export function closeAdverseDeviationPercent({ actual, reference, direction } = {}) {
  const signed = closeSignedDeviationPercent({ actual, reference, direction });
  return signed === null ? null : Math.max(0, signed);
}

export function entrySignedDeviationPercent({ actual, reference, direction } = {}) {
  return signedDeviationPercent({ actual, reference, direction, phase: 'entry' });
}

export function closeSignedDeviationPercent({ actual, reference, direction } = {}) {
  return signedDeviationPercent({ actual, reference, direction, phase: 'close' });
}

export function absoluteDeviationPercent(actual, reference) {
  const measured = finiteNumber(actual);
  const expected = finiteNumber(reference);
  if (measured === null || expected === null || expected <= 0) {
    return null;
  }
  return Math.abs(measured - expected) / expected * 100;
}

function signedDeviationPercent({ actual, reference, direction, phase }) {
  const measured = finiteNumber(actual);
  const expected = finiteNumber(reference);
  if (measured === null || expected === null || expected <= 0) {
    return null;
  }
  const side = String(direction || '').toUpperCase();
  const signed = phase === 'entry'
    ? side === 'SHORT' ? expected - measured : measured - expected
    : side === 'SHORT' ? measured - expected : expected - measured;
  return signed / expected * 100;
}

function derivedClosePrice({ entryPrice, quantity, realizedPnl, direction }) {
  const entry = finiteNumber(entryPrice);
  const size = finiteNumber(quantity);
  const pnl = finiteNumber(realizedPnl);
  if (entry === null || entry <= 0 || size === null || size <= 0 || pnl === null) {
    return null;
  }
  const price = String(direction || '').toUpperCase() === 'SHORT'
    ? entry - (pnl / size)
    : entry + (pnl / size);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function executionDirection(opening, closeEvent) {
  return closeEvent?.exchangePosition?.direction
    || closeEvent?.signal?.direction
    || opening?.signal?.direction
    || '';
}

function closePercentRatio(event = {}) {
  const percent = finiteNumber(event?.closePercent ?? event?.signal?.closePercent);
  if (percent === null) {
    return 1;
  }
  return Math.min(100, Math.max(0.0001, percent)) / 100;
}

function candidate(value, source) {
  const price = finiteNumber(value);
  return price !== null && price > 0 ? { price, source } : null;
}

function resolveFirst(candidates) {
  return candidates.find(Boolean) || null;
}

function finitePositive(values) {
  for (const value of values) {
    const number = finiteNumber(value);
    if (number !== null && number > 0) {
      return Math.abs(number);
    }
  }
  return null;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
