const DEFAULT_CAPTURE_TOLERANCE_MS = 2 * 60 * 1000;
const DEFAULT_MAX_CHECK_DELAY_MS = 60 * 60 * 1000;
const MIN_CHECK_DELAY_MS = 250;

export function localMonthKey(date = new Date()) {
  const safeDate = validDate(date) || new Date();
  return `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}`;
}

export function localMonthStart(date = new Date()) {
  const safeDate = validDate(date) || new Date();
  return new Date(safeDate.getFullYear(), safeDate.getMonth(), 1);
}

export function monthKeyFromTimestamp(value) {
  const date = validDate(value);
  return date ? localMonthKey(date) : '';
}

export function monthlyResetPlan({ bingx = {}, now = new Date() } = {}) {
  const safeNow = validDate(now) || new Date();
  const month = localMonthKey(safeNow);
  const vstResetMonth = monthKeyFromTimestamp(bingx.vstPnlResetAt);
  const liveResetMonth = monthKeyFromTimestamp(bingx.livePnlResetAt);
  const complete = bingx.monthlyResetMonth === month
    && vstResetMonth === month
    && liveResetMonth === month;

  if (complete) {
    return {
      required: false,
      month,
      resetAt: null
    };
  }

  const existingReset = bingx.monthlyResetMonth === month
    ? [bingx.livePnlResetAt, bingx.vstPnlResetAt]
      .map(validDate)
      .find((date) => date && localMonthKey(date) === month)
    : null;

  return {
    required: true,
    month,
    resetAt: existingReset || localMonthStart(safeNow)
  };
}

export function nextMonthlyResetCheckDelay({
  now = new Date(),
  maxDelayMs = DEFAULT_MAX_CHECK_DELAY_MS
} = {}) {
  const safeNow = validDate(now) || new Date();
  const nextMonth = new Date(safeNow.getFullYear(), safeNow.getMonth() + 1, 1);
  const remaining = Math.max(0, nextMonth.getTime() - safeNow.getTime());
  const maximum = Math.max(MIN_CHECK_DELAY_MS, finiteNumber(maxDelayMs, DEFAULT_MAX_CHECK_DELAY_MS));
  return Math.max(MIN_CHECK_DELAY_MS, Math.min(maximum, remaining));
}

export function buildMonthlyPnlBoundary({
  month,
  resetAt,
  capturedAt = new Date(),
  reason = 'manual',
  accounts = {},
  vstExternalFunding = 0,
  captureToleranceMs = DEFAULT_CAPTURE_TOLERANCE_MS
} = {}) {
  const safeResetAt = validDate(resetAt);
  const safeCapturedAt = validDate(capturedAt);
  if (!safeResetAt || !safeCapturedAt) {
    return null;
  }

  const delayMs = safeCapturedAt.getTime() - safeResetAt.getTime();
  const toleranceMs = Math.max(0, finiteNumber(captureToleranceMs, DEFAULT_CAPTURE_TOLERANCE_MS));
  const timely = delayMs >= -1000 && delayMs <= toleranceMs;
  const demo = capturedAccount(accounts.demo, {
    asset: 'VST',
    externalFunding: vstExternalFunding,
    timely
  });
  const live = capturedAccount(accounts.live, {
    asset: 'USDT',
    externalFunding: 0,
    timely
  });
  const anyAvailable = demo.available || live.available;
  const quality = anyAvailable ? (timely ? 'exact' : 'late') : 'unavailable';

  return normalizeMonthlyPnlBoundary({
    version: 1,
    month: validMonthKey(month) || localMonthKey(safeResetAt),
    resetAt: safeResetAt.toISOString(),
    capturedAt: safeCapturedAt.toISOString(),
    reason: safeText(reason, 40) || 'manual',
    quality,
    delayMs,
    captureToleranceMs: toleranceMs,
    demo,
    live
  });
}

export function normalizeMonthlyPnlBoundary(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const resetAt = isoTimestamp(input.resetAt);
  const capturedAt = isoTimestamp(input.capturedAt);
  const month = validMonthKey(input.month) || monthKeyFromTimestamp(resetAt);
  if (!resetAt || !capturedAt || !month) {
    return null;
  }

  const quality = normalizeQuality(input.quality);
  return {
    version: 1,
    month,
    resetAt,
    capturedAt,
    reason: safeText(input.reason, 40) || 'unknown',
    quality,
    delayMs: finiteNumber(input.delayMs, Date.parse(capturedAt) - Date.parse(resetAt)),
    captureToleranceMs: Math.max(
      0,
      finiteNumber(input.captureToleranceMs, DEFAULT_CAPTURE_TOLERANCE_MS)
    ),
    demo: normalizeCapturedAccount(input.demo, 'VST', quality),
    live: normalizeCapturedAccount(input.live, 'USDT', quality)
  };
}

export function monthlyPnlAdjustment({
  realized = 0,
  rawFloating = 0,
  boundary = null,
  mode,
  month,
  resetAt
} = {}) {
  const realizedValue = finiteNumber(realized, 0);
  const rawFloatingValue = finiteNumber(rawFloating, 0);
  const resolved = resolveBoundaryAccount({ boundary, mode, month, resetAt });
  const openingUnrealized = resolved.applied
    ? finiteNumber(resolved.account.unrealizedPnl, 0)
    : 0;
  const floating = rawFloatingValue - openingUnrealized;

  return {
    total: roundMoney(realizedValue + floating),
    realized: roundMoney(realizedValue),
    floating: roundMoney(floating),
    rawFloating: roundMoney(rawFloatingValue),
    openingUnrealized: roundMoney(openingUnrealized),
    monthlyBoundary: publicBoundaryState(resolved)
  };
}

export function monthlyEquityDelta({
  strategyEquity,
  boundary = null,
  mode,
  month,
  resetAt
} = {}) {
  const current = optionalFiniteNumber(strategyEquity);
  const resolved = resolveBoundaryAccount({ boundary, mode, month, resetAt });
  const opening = optionalFiniteNumber(resolved.account?.strategyEquity);
  if (current === null || !resolved.applied || opening === null) {
    return {
      total: null,
      openingStrategyEquity: opening,
      monthlyBoundary: publicBoundaryState(resolved)
    };
  }

  return {
    total: roundMoney(current - opening),
    openingStrategyEquity: roundMoney(opening),
    monthlyBoundary: publicBoundaryState(resolved)
  };
}

function resolveBoundaryAccount({ boundary, mode, month, resetAt }) {
  const normalized = normalizeMonthlyPnlBoundary(boundary);
  const modeKey = mode === 'demo' ? 'demo' : 'live';
  const account = normalized?.[modeKey] || null;
  let reason = '';

  if (!normalized) {
    reason = 'missing';
  } else if (month && normalized.month !== month) {
    reason = 'month_mismatch';
  } else if (resetAt && Math.abs(Date.parse(normalized.resetAt) - Date.parse(resetAt)) > 1000) {
    reason = 'reset_mismatch';
  } else if (!account?.available) {
    reason = 'unavailable';
  } else if (!account.applied) {
    reason = normalized.quality === 'late' ? 'late' : 'not_applied';
  }

  return {
    boundary: normalized,
    account,
    mode: modeKey,
    applied: !reason && Boolean(account?.applied),
    reason
  };
}

function publicBoundaryState(resolved) {
  const boundary = resolved.boundary;
  if (!boundary) {
    return null;
  }
  return {
    month: boundary.month,
    resetAt: boundary.resetAt,
    capturedAt: boundary.capturedAt,
    reason: boundary.reason,
    quality: boundary.quality,
    delayMs: boundary.delayMs,
    mode: resolved.mode,
    available: Boolean(resolved.account?.available),
    applied: Boolean(resolved.applied),
    openingUnrealized: optionalFiniteNumber(resolved.account?.unrealizedPnl),
    openingStrategyEquity: optionalFiniteNumber(resolved.account?.strategyEquity),
    error: resolved.account?.error || '',
    ignoredReason: resolved.reason || ''
  };
}

function capturedAccount(value, { asset, externalFunding, timely }) {
  const source = value?.balance && typeof value.balance === 'object' ? value.balance : value;
  const equity = optionalFiniteNumber(source?.equity);
  const available = Boolean(source && equity !== null);
  const safeExternalFunding = Math.max(0, finiteNumber(externalFunding, 0));
  return {
    asset: safeText(source?.asset, 12).toUpperCase() || asset,
    available,
    applied: available && timely,
    balance: optionalFiniteNumber(source?.balance),
    equity,
    availableMargin: optionalFiniteNumber(source?.availableMargin),
    usedMargin: optionalFiniteNumber(source?.usedMargin),
    unrealizedPnl: optionalFiniteNumber(source?.unrealizedProfit) ?? 0,
    externalFunding: safeExternalFunding,
    strategyEquity: equity === null ? null : equity - safeExternalFunding,
    error: available ? '' : safeText(value?.error, 240)
  };
}

function normalizeCapturedAccount(input, fallbackAsset, boundaryQuality) {
  if (!input || typeof input !== 'object') {
    return {
      asset: fallbackAsset,
      available: false,
      applied: false,
      balance: null,
      equity: null,
      availableMargin: null,
      usedMargin: null,
      unrealizedPnl: null,
      externalFunding: 0,
      strategyEquity: null,
      error: ''
    };
  }

  const equity = optionalFiniteNumber(input.equity);
  const available = Boolean(input.available) && equity !== null;
  return {
    asset: safeText(input.asset, 12).toUpperCase() || fallbackAsset,
    available,
    applied: available && boundaryQuality === 'exact' && Boolean(input.applied),
    balance: optionalFiniteNumber(input.balance),
    equity,
    availableMargin: optionalFiniteNumber(input.availableMargin),
    usedMargin: optionalFiniteNumber(input.usedMargin),
    unrealizedPnl: optionalFiniteNumber(input.unrealizedPnl),
    externalFunding: Math.max(0, finiteNumber(input.externalFunding, 0)),
    strategyEquity: optionalFiniteNumber(input.strategyEquity),
    error: safeText(input.error, 240)
  };
}

function normalizeQuality(value) {
  return ['exact', 'late', 'unavailable'].includes(value) ? value : 'unavailable';
}

function validMonthKey(value) {
  const text = String(value || '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? text : '';
}

function isoTimestamp(value) {
  const date = validDate(value);
  return date ? date.toISOString() : null;
}

function validDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function optionalFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
}
