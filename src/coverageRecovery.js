const managementActions = new Set(['CLOSE', 'CLOSE_ALL', 'MOVE_SL_BE', 'SET_TAKE_PROFIT', 'SET_STOP_LOSS']);

export function coverageRecoveryCandidates({
  coverage = null,
  posts = [],
  parseSignals,
  executionMode = 'demo',
  graceMs = 20_000,
  maxAgeMs = 3 * 60 * 1000,
  now = Date.now()
} = {}) {
  if (String(executionMode || '').toLowerCase() !== 'demo' || typeof parseSignals !== 'function') {
    return [];
  }

  const postsById = new Map((posts || []).map((post) => [String(post?.id || ''), post]));
  const candidates = [];
  for (const signalPackage of coverage?.packages || []) {
    if (signalPackage.executionMode !== 'demo' || signalPackage.status !== 'pending') {
      continue;
    }
    const ageMs = now - Number(signalPackage.detectedAtMs || Date.parse(signalPackage.detectedAt || 0));
    if (!Number.isFinite(ageMs) || ageMs < graceMs || ageMs >= maxAgeMs) {
      continue;
    }

    const post = postsById.get(String(signalPackage.postId || ''));
    if (!post) {
      continue;
    }
    const parsedSignals = safeParse(parseSignals, post.text || '').filter(isOpeningSignal);
    for (const expected of signalPackage.signals || []) {
      if (expected.status !== 'pending' || expected.reason !== 'no_execution_event') {
        continue;
      }
      const signal = parsedSignals.find((candidate) => sameSignal(candidate, expected));
      if (!signal) {
        continue;
      }
      candidates.push({
        key: [signalPackage.key, normalizeSymbol(expected.symbol), expected.direction].join('|'),
        packageKey: signalPackage.key,
        post,
        signal
      });
    }
  }
  return candidates;
}

function safeParse(parseSignals, text) {
  try {
    const parsed = parseSignals(text);
    return Array.isArray(parsed) ? parsed : [];
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

function sameSignal(signal = {}, expected = {}) {
  return normalizeSymbol(signal.symbol) === normalizeSymbol(expected.symbol)
    && String(signal.direction || '').toUpperCase() === String(expected.direction || '').toUpperCase();
}

function normalizeSymbol(value = '') {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.endsWith('USDT') ? `${compact.slice(0, -4)}-USDT` : compact ? `${compact}-USDT` : '';
}
