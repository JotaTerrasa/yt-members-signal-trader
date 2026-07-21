const transientClosePatterns = [
  /please try again later/i,
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
