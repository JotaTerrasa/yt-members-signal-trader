const managementActions = new Set(['CLOSE', 'CLOSE_ALL', 'MOVE_SL_BE', 'SET_TAKE_PROFIT', 'SET_STOP_LOSS']);

export function buildSignalCoverage({
  posts = [],
  events = [],
  parseSignals,
  mode = 'demo',
  since = null,
  retryWindowMs = 3 * 60 * 1000,
  now = Date.now()
} = {}) {
  const startTime = Date.parse(since || 0);
  const modes = mode === 'dual' ? ['demo', 'live'] : [String(mode || 'demo').toLowerCase()];
  const packages = [];

  for (const post of posts || []) {
    if (!isYouTubePost(post)) {
      continue;
    }
    const detectedAt = postTimestamp(post);
    if (!Number.isFinite(detectedAt) || (Number.isFinite(startTime) && startTime > 0 && detectedAt < startTime)) {
      continue;
    }

    const parsed = safelyParseSignals(parseSignals, post.text || '')
      .filter(isOpeningSignal)
      .map(normalizeExpectedSignal);
    const heuristic = parsed.length ? [] : heuristicOpeningSignals(post.text || '');
    const expected = uniqueSignals(parsed.length ? parsed : heuristic);
    if (!expected.length) {
      continue;
    }

    for (const executionMode of modes) {
      if (executionMode === 'test') {
        continue;
      }
      packages.push(buildPackage({
        post,
        detectedAt,
        expected,
        parseFailure: !parsed.length && Boolean(heuristic.length),
        events,
        executionMode,
        retryWindowMs,
        now
      }));
    }
  }

  packages.sort((left, right) => right.detectedAtMs - left.detectedAtMs);
  const summary = packages.reduce((totals, item) => ({
    packages: totals.packages + 1,
    completePackages: totals.completePackages + (item.status === 'complete' ? 1 : 0),
    pendingPackages: totals.pendingPackages + (item.status === 'pending' ? 1 : 0),
    incompletePackages: totals.incompletePackages + (item.status === 'incomplete' ? 1 : 0),
    expectedOpenings: totals.expectedOpenings + item.expectedCount,
    executedOpenings: totals.executedOpenings + item.executedCount,
    pendingOpenings: totals.pendingOpenings + item.pendingCount,
    missingOpenings: totals.missingOpenings + item.missingCount,
    correctedAfterEventOpenings: totals.correctedAfterEventOpenings + item.correctedAfterEventCount,
    correctedAfterEventMissingOpenings: totals.correctedAfterEventMissingOpenings + item.correctedAfterEventMissingCount,
    parseFailures: totals.parseFailures + (item.parseFailure ? 1 : 0)
  }), {
    packages: 0,
    completePackages: 0,
    pendingPackages: 0,
    incompletePackages: 0,
    expectedOpenings: 0,
    executedOpenings: 0,
    pendingOpenings: 0,
    missingOpenings: 0,
    correctedAfterEventOpenings: 0,
    correctedAfterEventMissingOpenings: 0,
    parseFailures: 0
  });

  return {
    generatedAt: new Date(now).toISOString(),
    since: Number.isFinite(startTime) && startTime > 0 ? new Date(startTime).toISOString() : null,
    mode,
    summary,
    latestPackage: packages[0] || null,
    packages
  };
}

function buildPackage({ post, detectedAt, expected, parseFailure, events, executionMode, retryWindowMs, now }) {
  const postEvents = (events || [])
    .filter((event) => String(event?.postId || '') === String(post.id || ''))
    .sort((left, right) => Date.parse(left.at || 0) - Date.parse(right.at || 0));
  const eventsById = new Map((events || [])
    .filter((event) => event?.eventId)
    .map((event) => [String(event.eventId), event]));
  const ageMs = Math.max(0, now - detectedAt);
  const signals = expected.map((signal) => {
    const matching = postEvents
      .filter((event) => eventMatchesSignal(event, signal))
      .filter((event) => eventMode(event) === executionMode || linkedExecution(event, eventsById, executionMode));
    const sent = matching.find((event) => String(event.status || '') === `${executionMode}_order_sent`) || null;
    const linked = sent ? null : matching
      .map((event) => linkedExecution(event, eventsById, executionMode))
      .find(Boolean) || null;
    const execution = sent || linked?.target || null;
    const latest = matching.at(-1) || null;
    const correctionAfterEvent = describeSignalCorrection(signal, latest);
    const retryExpired = matching.some((event) => String(event.status || '').includes('order_retry_expired'));
    const pending = !execution && !retryExpired && ageMs < retryWindowMs;
    return {
      ...signal,
      status: execution ? 'executed' : pending ? 'pending' : 'missing',
      executionAt: execution?.at || null,
      finalStatus: sent?.status || (linked ? `${executionMode}_order_linked` : latest?.status || ''),
      reason: execution ? '' : latest?.reason || (parseFailure ? 'parser_no_structured_signal' : 'no_execution_event'),
      correctionAfterEvent,
      linkedExecution: Boolean(linked),
      linkedEventId: linked?.target?.eventId || null
    };
  });
  const executedCount = signals.filter((signal) => signal.status === 'executed').length;
  const pendingCount = signals.filter((signal) => signal.status === 'pending').length;
  const missingCount = signals.filter((signal) => signal.status === 'missing').length;
  const correctedAfterEventCount = signals.filter((signal) => signal.correctionAfterEvent).length;
  const correctedAfterEventMissingCount = signals.filter((signal) => signal.status === 'missing' && signal.correctionAfterEvent).length;
  const status = executedCount === signals.length
    ? 'complete'
    : pendingCount > 0
      ? 'pending'
      : 'incomplete';

  return {
    key: `${executionMode}|${post.id || detectedAt}`,
    postId: post.id || null,
    postUrl: post.url || null,
    detectedAt: new Date(detectedAt).toISOString(),
    detectedAtMs: detectedAt,
    executionMode,
    status,
    parseFailure,
    expectedCount: signals.length,
    executedCount,
    pendingCount,
    missingCount,
    correctedAfterEventCount,
    correctedAfterEventMissingCount,
    signals
  };
}

function safelyParseSignals(parseSignals, text) {
  if (typeof parseSignals !== 'function') {
    return [];
  }
  try {
    const result = parseSignals(text);
    return Array.isArray(result) ? result : [];
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

function normalizeExpectedSignal(signal = {}) {
  return {
    symbol: normalizeSymbol(signal.symbol),
    direction: String(signal.direction || '').toUpperCase(),
    entryPrice: finiteNumber(signal.entry?.price),
    stopLoss: finiteNumber(signal.stopLoss),
    leverage: finiteNumber(signal.leverage),
    takeProfits: Array.isArray(signal.takeProfits) ? signal.takeProfits.map(finiteNumber).filter(Boolean) : []
  };
}

function heuristicOpeningSignals(text = '') {
  const results = [];
  const pattern = /^[^\p{L}\p{N}\r\n]{0,12}(LONG|SHORT)\s+([A-Z0-9]{2,16}(?:[-/]USDT)?)\b/gimu;
  for (const match of String(text || '').matchAll(pattern)) {
    results.push({
      symbol: normalizeSymbol(match[2]),
      direction: match[1].toUpperCase(),
      entryPrice: null,
      stopLoss: null,
      takeProfits: []
    });
  }
  return uniqueSignals(results);
}

function uniqueSignals(signals = []) {
  const seen = new Set();
  return signals.filter((signal) => {
    const key = `${normalizeSymbol(signal.symbol)}|${String(signal.direction || '').toUpperCase()}`;
    if (!signal.symbol || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function eventMatchesSignal(event = {}, signal = {}) {
  const eventSymbol = normalizeSymbol(event.signal?.symbol || event.order?.symbol || '');
  const eventDirection = String(event.signal?.direction || event.order?.positionSide || '').toUpperCase();
  return eventSymbol === normalizeSymbol(signal.symbol)
    && eventDirection === String(signal.direction || '').toUpperCase();
}

function eventMode(event = {}) {
  const explicit = String(event.executionMode || '').toLowerCase();
  if (explicit) {
    return explicit;
  }
  const snapshotMode = String(event.auditSnapshot?.mode || event.exchangePosition?.source || '').toLowerCase();
  if (snapshotMode === 'demo' || snapshotMode === 'live' || snapshotMode === 'test') {
    return snapshotMode;
  }
  const status = String(event.status || '').toLowerCase();
  return status.startsWith('demo_') ? 'demo' : status.startsWith('live_') ? 'live' : '';
}

function describeSignalCorrection(expected = {}, event = null) {
  if (!event?.signal) {
    return null;
  }
  const observed = {
    entryPrice: finiteNumber(event.signal?.entry?.price),
    stopLoss: finiteNumber(event.signal?.stopLoss),
    leverage: finiteNumber(event.signal?.leverage)
  };
  const changes = {};
  for (const field of ['entryPrice', 'stopLoss', 'leverage']) {
    if (numbersDiffer(observed[field], expected[field])) {
      changes[field] = {
        processed: observed[field],
        current: expected[field]
      };
    }
  }
  if (!Object.keys(changes).length) {
    return null;
  }
  return {
    eventAt: event.at || null,
    eventStatus: event.status || null,
    changes
  };
}

function numbersDiffer(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }
  return Math.abs(left - right) > Math.max(1e-8, Math.abs(right) * 1e-8);
}

function linkedExecution(event = {}, eventsById = new Map(), executionMode = '') {
  if (String(event.status || '') !== 'skipped'
    || String(event.reason || '') !== 'duplicate_open_signal'
    || !event.duplicateOf) {
    return null;
  }
  const target = eventsById.get(String(event.duplicateOf));
  if (!target
    || eventMode(target) !== executionMode
    || String(target.status || '') !== `${executionMode}_order_sent`) {
    return null;
  }
  return { link: event, target };
}

function isYouTubePost(post = {}) {
  const url = String(post.url || post.channelUrl || '').toLowerCase();
  return !url || url.includes('youtube.com');
}

function postTimestamp(post = {}) {
  for (const value of [post.firstSeenAt, post.scrapedAt, post.lastSeenAt]) {
    const timestamp = Date.parse(value || 0);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }
  return NaN;
}

function normalizeSymbol(value = '') {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.endsWith('USDT') ? `${compact.slice(0, -4)}-USDT` : compact ? `${compact}-USDT` : '';
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
