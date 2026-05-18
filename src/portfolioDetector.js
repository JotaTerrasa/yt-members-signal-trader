const portfolioUrlPattern = /https?:\/\/[^\s<>"']+/gi;
const portfolioTextPattern = /\bportfolio\b|nuevo enlace|completamente actualizado|spot y futuros|futuros/i;

export function detectPortfolioUrl(posts = []) {
  for (const post of posts) {
    const text = String(post?.text || '');
    if (!portfolioTextPattern.test(text)) {
      continue;
    }

    const candidates = extractPostUrls(post).filter(isPortfolioUrl);
    if (!candidates.length) {
      continue;
    }

    return {
      url: candidates[0],
      postId: post.id || null,
      postUrl: post.url || null,
      detectedAt: post.firstSeenAt || post.lastSeenAt || new Date().toISOString()
    };
  }

  return null;
}

function extractPostUrls(post) {
  const found = [];
  for (const match of String(post?.text || '').matchAll(portfolioUrlPattern)) {
    found.push(match[0]);
  }

  for (const item of post?.links || []) {
    if (typeof item === 'string') {
      found.push(item);
      continue;
    }

    if (item?.url) {
      found.push(item.url);
    }
    if (item?.href) {
      found.push(item.href);
    }
  }

  return [...new Set(found.map(normalizeUrl).filter(Boolean))];
}

function normalizeUrl(value) {
  const cleaned = String(value || '').trim().replace(/[.,;!]+$/g, '');
  if (!cleaned) {
    return '';
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.hostname.endsWith('youtube.com') && parsed.pathname === '/redirect') {
      return normalizeUrl(parsed.searchParams.get('q') || parsed.searchParams.get('url') || '');
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

function isPortfolioUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (host === '4tfs.short.gy' || host.endsWith('.short.gy')) {
      return true;
    }
    return host === 'docs.google.com' && parsed.pathname.includes('/spreadsheets/');
  } catch {
    return false;
  }
}
