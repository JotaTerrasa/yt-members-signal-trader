import { timingSafeEqual } from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function buildHttpSecurity(env = process.env) {
  const username = String(env.APP_BASIC_USER || '').trim();
  const password = String(env.APP_BASIC_PASSWORD || '');
  if (Boolean(username) !== Boolean(password)) {
    throw new Error('APP_BASIC_USER y APP_BASIC_PASSWORD deben configurarse juntos.');
  }
  return {
    host: String(env.HOST || '127.0.0.1').trim() || '127.0.0.1',
    basicAuth: username && password ? { username, password } : null
  };
}

export function applySecurityHeaders(response) {
  response.setHeader('content-security-policy', [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com https://cdn.plot.ly",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; '));
  response.setHeader('cross-origin-opener-policy', 'same-origin');
  response.setHeader('referrer-policy', 'no-referrer');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('permissions-policy', 'camera=(), geolocation=(), microphone=()');
}

export function authorizeHttpRequest(request, requestUrl, security) {
  if (!security.basicAuth || requestUrl.pathname === '/api/health') {
    return { ok: true };
  }
  const value = String(request.headers.authorization || '');
  if (!value.startsWith('Basic ')) {
    return { ok: false, status: 401, reason: 'authentication_required' };
  }
  let decoded = '';
  try {
    decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
  } catch {
    return { ok: false, status: 401, reason: 'invalid_authentication' };
  }
  const separator = decoded.indexOf(':');
  const username = separator >= 0 ? decoded.slice(0, separator) : decoded;
  const password = separator >= 0 ? decoded.slice(separator + 1) : '';
  const ok = safeEqual(username, security.basicAuth.username)
    && safeEqual(password, security.basicAuth.password);
  return ok
    ? { ok: true }
    : { ok: false, status: 401, reason: 'invalid_authentication' };
}

export function validateMutationOrigin(request) {
  if (SAFE_METHODS.has(String(request.method || 'GET').toUpperCase())) {
    return { ok: true };
  }
  const origin = String(request.headers.origin || '').trim();
  if (!origin) {
    return { ok: true };
  }
  try {
    const originUrl = new URL(origin);
    const expectedHost = String(request.headers['x-forwarded-host'] || request.headers.host || '').trim();
    return originUrl.host === expectedHost
      ? { ok: true }
      : { ok: false, status: 403, reason: 'untrusted_origin' };
  } catch {
    return { ok: false, status: 403, reason: 'invalid_origin' };
  }
}

export function createMutationRateLimiter({ limit = 120, windowMs = 60_000 } = {}) {
  const buckets = new Map();
  return function check(request, now = Date.now()) {
    if (SAFE_METHODS.has(String(request.method || 'GET').toUpperCase())) {
      return { ok: true };
    }
    const key = String(request.headers['cf-connecting-ip'] || request.socket?.remoteAddress || 'local');
    const current = buckets.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return { ok: true };
    }
    current.count += 1;
    if (current.count <= limit) {
      return { ok: true };
    }
    return {
      ok: false,
      status: 429,
      reason: 'mutation_rate_limit',
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000))
    };
  };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
