const COMPRESSIBLE_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg']);

export function isCompressibleStatic(extension, size, minimumBytes = 1024) {
  return COMPRESSIBLE_EXTENSIONS.has(String(extension || '').toLowerCase())
    && Number(size) >= minimumBytes;
}

export function selectStaticEncoding(acceptEncoding, { extension, size } = {}) {
  if (!isCompressibleStatic(extension, size)) {
    return '';
  }

  const qualities = parseAcceptEncoding(acceptEncoding);
  const brotliQuality = encodingQuality(qualities, 'br');
  const gzipQuality = encodingQuality(qualities, 'gzip');
  if (brotliQuality <= 0 && gzipQuality <= 0) {
    return '';
  }
  return brotliQuality >= gzipQuality ? 'br' : 'gzip';
}

export function staticEtag({ size, mtimeMs } = {}) {
  const normalizedSize = Math.max(0, Number(size) || 0);
  const normalizedTime = Math.max(0, Math.trunc(Number(mtimeMs) || 0));
  return `W/"${normalizedSize.toString(16)}-${normalizedTime.toString(16)}"`;
}

export function etagMatches(headerValue, etag) {
  const candidates = String(headerValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return candidates.includes('*') || candidates.includes(etag);
}

function parseAcceptEncoding(value) {
  const qualities = new Map();
  for (const entry of String(value || '').split(',')) {
    const [rawName, ...parameters] = entry.trim().split(';');
    const name = rawName.trim().toLowerCase();
    if (!name) {
      continue;
    }
    let quality = 1;
    for (const parameter of parameters) {
      const match = parameter.trim().match(/^q\s*=\s*(\d+(?:\.\d+)?)$/i);
      if (match) {
        quality = Math.min(1, Math.max(0, Number(match[1])));
      }
    }
    qualities.set(name, quality);
  }
  return qualities;
}

function encodingQuality(qualities, encoding) {
  if (qualities.has(encoding)) {
    return qualities.get(encoding);
  }
  return qualities.get('*') || 0;
}
