const CLOCK_OK_MAX_OFFSET_MS = 250;
const CLOCK_CRITICAL_MIN_OFFSET_MS = 2_000;

export function estimateBingXClockSample({
  serverTime,
  requestedAtMs,
  receivedAtMs,
  environment = 'prod-live'
}) {
  const serverTimeMs = finiteTimestamp(serverTime, 'serverTime');
  const requestMs = finiteTimestamp(requestedAtMs, 'requestedAtMs');
  const receiptMs = finiteTimestamp(receivedAtMs, 'receivedAtMs');

  if (receiptMs < requestMs) {
    throw new Error('receivedAtMs no puede ser anterior a requestedAtMs.');
  }

  const roundTripMs = receiptMs - requestMs;
  const midpointMs = requestMs + (roundTripMs / 2);
  const offsetMs = serverTimeMs - midpointMs;
  const absoluteOffsetMs = Math.abs(offsetMs);

  return {
    available: true,
    source: 'bingx_server_time',
    environment,
    requestedAt: new Date(requestMs).toISOString(),
    receivedAt: new Date(receiptMs).toISOString(),
    checkedAt: new Date(receiptMs).toISOString(),
    serverAt: new Date(serverTimeMs).toISOString(),
    midpointAt: new Date(midpointMs).toISOString(),
    roundTripMs,
    uncertaintyMs: roundTripMs / 2,
    offsetMs,
    absoluteOffsetMs,
    level: clockOffsetLevel(absoluteOffsetMs),
    observationalOnly: true
  };
}

export function clockOffsetLevel(absoluteOffsetMs) {
  const value = Number(absoluteOffsetMs);
  if (!Number.isFinite(value) || value < 0) {
    return 'unavailable';
  }
  if (value <= CLOCK_OK_MAX_OFFSET_MS) {
    return 'ok';
  }
  if (value >= CLOCK_CRITICAL_MIN_OFFSET_MS) {
    return 'critical';
  }
  return 'warn';
}

function finiteTimestamp(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} no contiene un timestamp valido.`);
  }
  return number;
}
