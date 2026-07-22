const managementActions = new Set(['CLOSE', 'CLOSE_ALL', 'MOVE_SL_BE', 'SET_TAKE_PROFIT', 'SET_STOP_LOSS']);

export function editedOpeningSignals({ previousText = '', currentText = '', parseSignals } = {}) {
  if (typeof parseSignals !== 'function' || String(previousText) === String(currentText)) {
    return [];
  }

  const previousByKey = new Map(
    openingSignals(parseSignals, previousText)
      .map((signal) => [signalKey(signal), signal])
  );

  return openingSignals(parseSignals, currentText).filter((signal) => {
    const previous = previousByKey.get(signalKey(signal));
    return previous && openingFingerprint(previous) !== openingFingerprint(signal);
  });
}

function openingSignals(parseSignals, text) {
  try {
    const signals = parseSignals(String(text || ''));
    return (Array.isArray(signals) ? signals : []).filter(isOpeningSignal);
  } catch {
    return [];
  }
}

function isOpeningSignal(signal = {}) {
  const action = String(signal.action || '').toUpperCase();
  return signal.isSignal !== false
    && !managementActions.has(action)
    && Boolean(signal.symbol)
    && ['LONG', 'SHORT'].includes(String(signal.direction || '').toUpperCase());
}

function signalKey(signal = {}) {
  return `${normalizeSymbol(signal.symbol)}|${String(signal.direction || '').toUpperCase()}`;
}

function openingFingerprint(signal = {}) {
  return JSON.stringify({
    entryType: String(signal.entry?.type || '').toUpperCase(),
    entryPrice: finiteNumber(signal.entry?.price),
    stopLoss: finiteNumber(signal.stopLoss),
    leverage: finiteNumber(signal.leverage)
  });
}

function normalizeSymbol(value = '') {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.endsWith('USDT') ? `${compact.slice(0, -4)}-USDT` : compact ? `${compact}-USDT` : '';
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
