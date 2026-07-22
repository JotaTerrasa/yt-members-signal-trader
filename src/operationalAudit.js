const transientClosePatterns = [
  /please try again later/i,
  /(?:system|service).*(?:currently )?busy|currently busy/i,
  /temporar(?:y|ily|io|iamente)/i,
  /timeout|timed out|etimedout/i,
  /fetch failed|network|socket|econn|enotfound/i,
  /rate.?limit|too many requests|\b429\b/i,
  /service unavailable|bad gateway|gateway timeout/i,
  /internal server error/i
];

export function isRetryableCloseError(reason = '') {
  const message = String(reason || '').trim();
  return Boolean(message) && transientClosePatterns.some((pattern) => pattern.test(message));
}

export function cohortSampleStatus(closedTrades = 0) {
  const count = Math.max(0, Math.trunc(Number(closedTrades) || 0));
  if (count >= 100) {
    return {
      key: 'contrastable',
      label: 'Muestra contrastable',
      detail: `${count} cierres posteriores al cambio`
    };
  }
  if (count >= 30) {
    return {
      key: 'preliminary',
      label: 'Muestra preliminar',
      detail: `${count}/100 cierres; útil para orientar, todavía frágil`
    };
  }
  return {
    key: 'exploratory',
    label: 'Muestra exploratoria',
    detail: `${count}/30 cierres mínimos para una primera lectura`
  };
}

export function commissionEvidence({ incomeRows = [], commissionRate = null } = {}) {
  const byType = {};
  for (const row of incomeRows || []) {
    const type = String(row?.incomeType || 'UNKNOWN').toUpperCase();
    const income = Number(row?.income || 0);
    if (!Number.isFinite(income)) {
      continue;
    }
    byType[type] = roundMoney((byType[type] || 0) + income);
  }

  const detectedRebate = Object.entries(byType)
    .filter(([type, amount]) => /REBATE|COMMISSION/.test(type) && Number(amount) > 0)
    .reduce((sum, [, amount]) => sum + Number(amount || 0), 0);
  const takerRate = finiteRate(commissionRate?.takerCommissionRate);
  const makerRate = finiteRate(commissionRate?.makerCommissionRate);

  return {
    detectedRebate: roundMoney(detectedRebate),
    rebateDetected: detectedRebate > 0,
    takerCommissionRate: takerRate,
    makerCommissionRate: makerRate,
    takerCommissionPercent: takerRate === null ? null : roundMoney(takerRate * 100),
    makerCommissionPercent: makerRate === null ? null : roundMoney(makerRate * 100),
    incomeTypes: byType
  };
}

export function estimateReplicaEconomics({
  rows = [],
  takerCommissionRate = null,
  makerCommissionRate = null
} = {}) {
  const takerRate = finiteRate(takerCommissionRate);
  const makerRate = finiteRate(makerCommissionRate);
  const referenceRows = (rows || []).filter((row) => (
    row?.sheet
    && Number.isFinite(Number(row?.replica?.pnl))
    && Number(row?.replica?.notional) > 0
    && Number(row?.replica?.leverage) > 0
  ));
  const gross = roundMoney(referenceRows.reduce((sum, row) => sum + Number(row.replica.pnl || 0), 0));
  const exposure = roundMoney(referenceRows.reduce((sum, row) => (
    sum + Number(row.replica.notional || 0) * Number(row.replica.leverage || 0)
  ), 0));
  const marketFees = takerRate === null ? null : roundMoney(-exposure * takerRate * 2);
  const makerEntryFees = takerRate === null || makerRate === null
    ? null
    : roundMoney(-exposure * (makerRate + takerRate));

  return {
    rows: referenceRows.length,
    exposure,
    gross,
    marketFees,
    marketNet: marketFees === null ? null : roundMoney(gross + marketFees),
    makerEntryFees,
    makerEntryNet: makerEntryFees === null ? null : roundMoney(gross + makerEntryFees)
  };
}

export function cohortWindowBounds({ startedAt, endedAt = null, monthWindow = {} } = {}) {
  const parsedStart = Date.parse(startedAt || '');
  if (!Number.isFinite(parsedStart) || parsedStart <= 0) {
    return null;
  }
  const parsedEnd = Date.parse(endedAt || '');
  const monthStart = Number(monthWindow.startTime);
  const monthEnd = Number(monthWindow.endTime);
  if (!Number.isFinite(monthStart) || !Number.isFinite(monthEnd)) {
    return null;
  }
  const startTime = Math.max(monthStart, parsedStart);
  const endTime = Math.min(monthEnd, Number.isFinite(parsedEnd) && parsedEnd > 0 ? parsedEnd : monthEnd);
  return endTime > startTime ? { startTime, endTime, resetAt: parsedStart } : null;
}

export function auditRowBelongsToWindow(row = {}, window = {}) {
  const timestamp = firstValidTimestamp([
    row?.vst?.openingAt,
    row?.sheet?.openedAt,
    row?.vst?.closingAt,
    row?.sheet?.closedAt
  ]);
  return Number.isFinite(timestamp)
    && timestamp >= Number(window.startTime)
    && timestamp <= Number(window.endTime);
}

export function monitorHealthFinding(health = {}) {
  const level = String(health.level || 'unknown').toLowerCase();
  if (!health.running || health.stale || level === 'error' || level === 'unknown') {
    return {
      severity: 'critical',
      code: 'monitor_unhealthy',
      detail: 'El monitor está parado, obsoleto o sin un estado verificable.'
    };
  }
  if (level !== 'ok') {
    return {
      severity: 'warn',
      code: 'monitor_degraded',
      detail: 'El monitor sigue activo, pero mantiene un aviso transitorio que debe vigilarse.'
    };
  }
  return null;
}

export function buildNetEntryShadowAudit({ events = [], config = {} } = {}) {
  const openings = (events || [])
    .filter((event) => event?.status === 'demo_order_sent' && event?.netEntryFilter?.enabled)
    .sort(compareEventTime);
  const closures = uniquePositionClosures(events);
  const usedClosures = new Set();
  const rows = openings.map((opening) => {
    const closure = matchingPositionClosure(opening, closures, usedClosures);
    if (closure?.key) {
      usedClosures.add(closure.key);
    }
    const grossPnl = closure ? positionGrossPnl(closure.event?.exchangePosition) : null;
    const estimatedCost = nonNegativeFinite(opening.netEntryFilter?.estimatedRoundTripCost);
    const estimatedNetPnl = grossPnl === null ? null : roundMoney(grossPnl - estimatedCost);
    return {
      at: opening.at || null,
      symbol: opening.signal?.symbol || null,
      decision: opening.netEntryFilter?.decision || 'enter',
      reason: opening.netEntryFilter?.reason || '',
      closed: grossPnl !== null,
      grossPnl,
      estimatedCost,
      estimatedNetPnl
    };
  });
  const flagged = rows.filter((row) => row.decision === 'avoid_shadow' || row.decision === 'blocked');
  const closedFlagged = flagged.filter((row) => row.closed);
  const closedEntered = rows.filter((row) => row.decision === 'enter' && row.closed);
  const estimatedGrossFlagged = sumFinite(closedFlagged.map((row) => row.grossPnl));
  const estimatedCostFlagged = sumFinite(closedFlagged.map((row) => row.estimatedCost));
  const estimatedNetFlagged = sumFinite(closedFlagged.map((row) => row.estimatedNetPnl));
  const configuredMaxBreakEven = finiteOrNull(config.netEntryFilterMaxBreakEvenMarginPercent);
  const observedLeverage = mostCommonPositiveNumber(openings.map((event) => event.netEntryFilter?.leverage));
  const feeBuffer = positiveFinite(config.costGuardFeeBuffer, 2);
  const feeRate = positiveFinite(openings[0]?.costGuard?.feeRate, 0.0005);
  const inherentBreakEvenMarginPercent = observedLeverage === null
    ? null
    : roundMoney(feeRate * 2 * feeBuffer * observedLeverage * 100);
  const nonDiscriminatingBreakEven = configuredMaxBreakEven !== null
    && configuredMaxBreakEven > 0
    && inherentBreakEvenMarginPercent !== null
    && inherentBreakEvenMarginPercent > configuredMaxBreakEven;
  const reasonCounts = countFailureReasons(flagged);
  const topReason = Object.entries(reasonCounts).sort((left, right) => right[1] - left[1])[0] || null;

  return {
    enabled: config.netEntryFilterEnabled !== false,
    mode: String(config.netEntryFilterMode || 'shadow').toLowerCase() === 'block' ? 'block' : 'shadow',
    sample: rows.length,
    flagged: flagged.length,
    entered: rows.length - flagged.length,
    closed: rows.filter((row) => row.closed).length,
    open: rows.filter((row) => !row.closed).length,
    closedFlagged: closedFlagged.length,
    closedEntered: closedEntered.length,
    winnersFlagged: closedFlagged.filter((row) => Number(row.estimatedNetPnl) > 0).length,
    losersFlagged: closedFlagged.filter((row) => Number(row.estimatedNetPnl) < 0).length,
    estimatedGrossFlagged,
    estimatedCostFlagged,
    estimatedNetFlagged,
    observedLeverage,
    configuredMaxBreakEven,
    inherentBreakEvenMarginPercent,
    nonDiscriminatingBreakEven,
    topReason: topReason ? { reason: topReason[0], count: topReason[1] } : null,
    recommendation: netEntryAuditRecommendation({
      sample: rows.length,
      closedFlagged: closedFlagged.length,
      estimatedNetFlagged,
      nonDiscriminatingBreakEven
    }),
    recent: rows.slice(-8).reverse()
  };
}

function uniquePositionClosures(events = []) {
  const byPosition = new Map();
  for (const event of events || []) {
    if (!['exchange_signal_closed', 'exchange_position_closed', 'exchange_stop_closed'].includes(event?.status)) {
      continue;
    }
    const position = event.exchangePosition;
    const symbol = position?.symbol || event.signal?.symbol;
    if (!position || !symbol) {
      continue;
    }
    const key = position.id || `${symbol}|${position.openedAt || event.at || ''}`;
    const existing = byPosition.get(key);
    if (!existing || positionGrossPnl(position) !== null) {
      byPosition.set(key, { key, event });
    }
  }
  return [...byPosition.values()].sort((left, right) => compareEventTime(left.event, right.event));
}

function matchingPositionClosure(opening, closures, usedClosures) {
  const symbol = String(opening.signal?.symbol || '').toUpperCase();
  const openedAt = Date.parse(opening.at || '');
  if (!symbol || !Number.isFinite(openedAt)) {
    return null;
  }
  const candidates = closures.filter((closure) => {
    if (usedClosures.has(closure.key)) {
      return false;
    }
    const position = closure.event?.exchangePosition || {};
    if (String(position.symbol || closure.event?.signal?.symbol || '').toUpperCase() !== symbol) {
      return false;
    }
    const positionOpenedAt = Date.parse(position.openedAt || '');
    const closedAt = Date.parse(closure.event?.at || '');
    return Number.isFinite(positionOpenedAt)
      ? Math.abs(positionOpenedAt - openedAt) <= 2 * 60 * 1000
      : Number.isFinite(closedAt) && closedAt >= openedAt;
  });
  return candidates.sort((left, right) => {
    const leftOpenedAt = Date.parse(left.event?.exchangePosition?.openedAt || left.event?.at || '');
    const rightOpenedAt = Date.parse(right.event?.exchangePosition?.openedAt || right.event?.at || '');
    return Math.abs(leftOpenedAt - openedAt) - Math.abs(rightOpenedAt - openedAt);
  })[0] || null;
}

function positionGrossPnl(position = {}) {
  const candidates = [position.paperPnl, position.unrealizedPnl, position.realizedPnl];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && (number !== 0 || value !== undefined)) {
      return roundMoney(number);
    }
  }
  return null;
}

function countFailureReasons(rows = []) {
  const counts = {};
  for (const row of rows) {
    const reason = String(row.reason || '').replace(/^net_entry_filter:/, '');
    for (const item of reason.split('|').filter(Boolean)) {
      const key = item.split(':')[0] || item;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function netEntryAuditRecommendation({ sample, closedFlagged, estimatedNetFlagged, nonDiscriminatingBreakEven }) {
  if (!sample) {
    return { key: 'waiting', label: 'Esperando muestra', detail: 'Todavia no hay entradas evaluadas.' };
  }
  if (nonDiscriminatingBreakEven) {
    return {
      key: 'review_threshold',
      label: 'Revisar umbral',
      detail: 'El break-even configurado marca por construccion todas las entradas con el apalancamiento observado.'
    };
  }
  if (closedFlagged < 20) {
    return {
      key: 'measuring',
      label: 'Seguir midiendo',
      detail: `${closedFlagged}/20 operaciones marcadas con cierre; muestra aun exploratoria.`
    };
  }
  if (estimatedNetFlagged < 0) {
    return {
      key: 'candidate_block',
      label: 'Candidata a bloqueo',
      detail: 'La muestra marcada pierde neto estimado; requiere revision humana antes de cambiar el modo.'
    };
  }
  return {
    key: 'keep_shadow',
    label: 'Mantener sombra',
    detail: 'Las operaciones marcadas no muestran una perdida neta que justifique bloquearlas.'
  };
}

function compareEventTime(left, right) {
  return Date.parse(left?.at || 0) - Date.parse(right?.at || 0);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveFinite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function mostCommonPositiveNumber(values = []) {
  const counts = new Map();
  for (const value of values) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      continue;
    }
    counts.set(number, (counts.get(number) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function sumFinite(values = []) {
  return roundMoney(values.reduce((sum, value) => {
    const number = Number(value);
    return Number.isFinite(number) ? sum + number : sum;
  }, 0));
}

function firstValidTimestamp(values) {
  for (const value of values) {
    const timestamp = Date.parse(value || '');
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }
  return NaN;
}

function finiteRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
}
