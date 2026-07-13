import { createHash } from 'node:crypto';

const managementActions = new Set(['CLOSE', 'CLOSE_ALL', 'MOVE_SL_BE', 'SET_TAKE_PROFIT', 'SET_STOP_LOSS']);

export function openingExecutionKey({ executionMode = '', postId = '', signal = {} } = {}) {
  if (!isOpeningSignal(signal)) {
    return '';
  }
  return [
    String(executionMode || '').toLowerCase(),
    String(postId || signal.rawText || ''),
    normalizeSymbol(signal.symbol),
    String(signal.direction || '').toUpperCase(),
    finiteFingerprintNumber(signal.entry?.price),
    finiteFingerprintNumber(signal.stopLoss)
  ].join('|');
}

export function openingClientOrderId({ executionMode = '', postId = '', signal = {} } = {}) {
  const key = openingExecutionKey({ executionMode, postId, signal });
  if (!key) {
    throw new Error('opening_client_order_id_requires_signal');
  }
  return `yt${createHash('sha256').update(key).digest('hex').slice(0, 28)}`;
}

export function isOpeningExecutionStatus(status) {
  const value = String(status || '');
  return value === 'test_order_sent'
    || value === 'demo_order_sent'
    || value === 'live_order_sent';
}

export function isRetryableOpeningEvent(event = {}, { vstTechnicalReserveEnabled = false } = {}) {
  const status = String(event.status || '').toLowerCase();
  const mode = String(event.executionMode || '').toLowerCase();
  const reason = String(event.reason || '');
  if ((mode !== 'demo' && mode !== 'live') || !isOpeningSignal(event.signal)) {
    return false;
  }

  if (status === 'blocked') {
    return /^(exchange_stop_loss_invalid|entry_missed_invalid_(?:long|short)_stop_loss|invalid_(?:long|short)_stop_loss|entry_adverse_deviation_too_high):/i.test(reason);
  }

  if (status !== 'error') {
    return false;
  }

  if (mode === 'demo' && vstTechnicalReserveEnabled && /no hay vst disponible suficiente/i.test(reason)) {
    return true;
  }

  return /(fetch failed|econnreset|econnrefused|etimedout|timed?\s*out|socket hang up|network|temporary|temporarily|service unavailable|server busy|too many requests|rate limit|frequency limit|\b429\b|\b100410\b|no_market_price|duplicate.*client.*order)/i.test(reason);
}

function isOpeningSignal(signal = {}) {
  const action = String(signal.action || '').toUpperCase();
  return signal.isSignal !== false
    && !managementActions.has(action)
    && Boolean(signal.symbol)
    && ['LONG', 'SHORT'].includes(String(signal.direction || '').toUpperCase());
}

function normalizeSymbol(value = '') {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.endsWith('USDT') ? `${compact.slice(0, -4)}-USDT` : compact ? `${compact}-USDT` : '';
}

function finiteFingerprintNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(number) : '';
}
