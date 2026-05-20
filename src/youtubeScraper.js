import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const POST_SELECTORS = [
  'ytd-backstage-post-thread-renderer',
  'ytd-backstage-post-renderer',
  'ytd-post-renderer'
].join(',');

export class YouTubePostsScraper extends EventEmitter {
  constructor({ profileDir }) {
    super();
    this.profileDir = profileDir;
    this.context = null;
    this.page = null;
    this.running = false;
    this.stopRequested = false;
  }

  get isBrowserOpen() {
    return Boolean(this.context);
  }

  async openYouTube() {
    const page = await this.ensurePage();
    await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
    await this.dismissConsent(page);
    this.log('Sesion de YouTube abierta. Inicia sesion en la ventana de Chromium si aun no lo has hecho.');
    return { url: page.url() };
  }

  async start({ channelUrl, backfill, live, pollIntervalSeconds, maxScrolls }) {
    if (this.running) {
      throw new Error('Ya hay un scrapeo en curso.');
    }
    this.running = true;
    this.stopRequested = false;

    const normalizedUrl = normalizePostsUrl(channelUrl);
    const intervalMs = Math.max(10, Number(pollIntervalSeconds) || 30) * 1000;
    const scrollLimit = clamp(Number(maxScrolls) || 120, 1, 500);

    try {
      const page = await this.ensurePage();
      this.emit('status', { running: true, phase: backfill ? 'backfill' : 'live', channelUrl: normalizedUrl });

      if (backfill) {
        await this.backfill(page, normalizedUrl, { maxScrolls: scrollLimit });
      }

      if (live && !this.stopRequested) {
        await this.liveLoop(page, normalizedUrl, { intervalMs });
      }
    } finally {
      this.running = false;
      this.emit('status', { running: false, phase: 'idle', channelUrl: normalizedUrl });
    }
  }

  stop() {
    this.stopRequested = true;
    this.log('Parando el monitor cuando termine la iteracion actual.');
  }

  async close() {
    this.stopRequested = true;
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
      this.page = null;
    }
  }

  async ensurePage() {
    if (!this.context) {
      this.context = await chromium.launchPersistentContext(this.profileDir, {
        headless: false,
        viewport: { width: 1440, height: 1000 },
        args: ['--disable-blink-features=AutomationControlled']
      });
      this.context.on('close', () => {
        this.context = null;
        this.page = null;
        this.log('La ventana de Chromium se ha cerrado.');
      });
    }

    const pages = this.context.pages();
    this.page = this.page && !this.page.isClosed() ? this.page : pages[0] || await this.context.newPage();
    this.page.setDefaultTimeout(15000);
    return this.page;
  }

  async backfill(page, url, { maxScrolls }) {
    this.log(`Backfill iniciado: ${url}`);
    await this.gotoPosts(page, url);

    const seenIds = new Set();
    let idleRounds = 0;

    for (let index = 0; index < maxScrolls && !this.stopRequested; index += 1) {
      await this.expandVisiblePosts(page);
      const posts = await this.extractVisiblePosts(page, { phase: 'backfill', channelUrl: url });
      this.emitPosts(posts, 'backfill', url);

      const beforeSeen = seenIds.size;
      for (const post of posts) {
        seenIds.add(post.id);
      }
      if (seenIds.size <= beforeSeen) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
      }

      const beforeHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.evaluate(() => window.scrollBy({ top: Math.round(window.innerHeight * 2.3), behavior: 'instant' }));
      await page.waitForTimeout(900);
      const afterHeight = await page.evaluate(() => document.documentElement.scrollHeight);

      this.emit('progress', {
        phase: 'backfill',
        currentScroll: index + 1,
        maxScrolls,
        visiblePosts: seenIds.size
      });

      if (idleRounds >= 5 && afterHeight === beforeHeight) {
        break;
      }
    }

    await this.expandVisiblePosts(page);
    this.emitPosts(await this.extractVisiblePosts(page, { phase: 'backfill', channelUrl: url }), 'backfill', url);
    this.log('Backfill terminado.');
  }

  async liveLoop(page, url, { intervalMs }) {
    this.log(`Monitor en tiempo casi real activo cada ${Math.round(intervalMs / 1000)} segundos.`);
    this.emit('status', { running: true, phase: 'live', channelUrl: url });

    while (!this.stopRequested) {
      try {
        await this.gotoPosts(page, url);
        await this.expandVisiblePosts(page);

        const topPosts = await this.extractVisiblePosts(page, { phase: 'live', channelUrl: url });
        this.emitPosts(topPosts, 'live', url);
        this.emit('progress', {
          phase: 'live',
          currentScroll: 0,
          maxScrolls: 0,
          visiblePosts: topPosts.length
        });
      } catch (error) {
        this.log(`Lectura YouTube fallida, se reintentara: ${conciseError(error)}`, 'warn');
      }

      await sleepInterruptible(intervalMs, () => this.stopRequested);
    }
  }

  async gotoPosts(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.dismissConsent(page);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    const postCount = await page.locator(POST_SELECTORS).count().catch(() => 0);
    if (postCount === 0) {
      this.log('No se detectaron posts aun. Si ves una pantalla de login, inicia sesion en Chromium y vuelve a iniciar el scrapeo.', 'warn');
    }
  }

  async dismissConsent(page) {
    const labels = [
      'Accept all',
      'Reject all',
      'I agree',
      'Aceptar todo',
      'Rechazar todo',
      'Acepto'
    ];

    for (const label of labels) {
      const button = page.getByRole('button', { name: label, exact: true });
      if (await button.count().catch(() => 0)) {
        await button.first().click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
        return;
      }
    }
  }

  async expandVisiblePosts(page) {
    const labels = ['read more', 'show more', 'mostrar mas', 'mostrar más', 'ver mas', 'ver más', 'leer mas', 'leer más'];
    await page.evaluate((lowerLabels) => {
      const candidates = [
        ...document.querySelectorAll('button, tp-yt-paper-button, yt-button-shape button')
      ];

      for (const candidate of candidates) {
        const text = (candidate.innerText || candidate.textContent || candidate.getAttribute('aria-label') || '').trim().toLowerCase();
        if (!text) {
          continue;
        }
        if (lowerLabels.some((label) => text.includes(label))) {
          candidate.click();
        }
      }
    }, labels).catch(() => {});
    await page.waitForTimeout(250);
  }

  async extractVisiblePosts(page, meta) {
    return page.evaluate(({ phase, channelUrl }) => {
      const postNodes = findPostNodes();
      const channelName = cleanText(
        document.querySelector('ytd-channel-name #text')?.textContent ||
        document.querySelector('#channel-name #text')?.textContent ||
        document.title.replace(/- YouTube$/i, '')
      );

      return postNodes.map((node) => extractPost(node, { phase, channelUrl, channelName })).filter(Boolean);

      function findPostNodes() {
        const direct = [
          ...document.querySelectorAll('ytd-backstage-post-thread-renderer'),
          ...document.querySelectorAll('ytd-backstage-post-renderer'),
          ...document.querySelectorAll('ytd-post-renderer')
        ];

        if (direct.length) {
          return uniqueElements(direct);
        }

        const richItems = [...document.querySelectorAll('ytd-rich-item-renderer')];
        return richItems.filter((item) => {
          const text = item.innerText || '';
          const hasPostLink = Boolean(item.querySelector('a[href*="/post/"], a[href*="community?lb="]'));
          return hasPostLink || /miembros|members|hace|ago|publicacion|post/i.test(text);
        });
      }

      function extractPost(node, context) {
        const timeLink = node.querySelector('a[href*="/post/"], a[href*="community?lb="], #published-time-text a, ytd-backstage-post-metadata-renderer a');
        const url = timeLink?.href ? absolutize(timeLink.href) : null;
        const publishedText = cleanText(
          node.querySelector('#published-time-text')?.textContent ||
          node.querySelector('ytd-backstage-post-metadata-renderer a')?.textContent ||
          timeLink?.textContent ||
          ''
        );

        const contentElement = node.querySelector('#content-text, #home-content-text, yt-formatted-string#content-text, yt-formatted-string#home-content-text');
        const text = cleanText(contentElement?.innerText || contentElement?.textContent || fallbackPostText(node));
        const author = cleanText(
          node.querySelector('#author-text')?.textContent ||
          node.querySelector('ytd-channel-name #text')?.textContent ||
          context.channelName ||
          ''
        );

        const links = uniqueStrings(
          [...node.querySelectorAll('a[href]')]
            .map((anchor) => absolutize(anchor.href))
            .filter((href) => href && !href.startsWith('javascript:'))
        );

        const images = uniqueStrings(
          [...node.querySelectorAll('img[src]')]
            .filter((img) => {
              const rect = img.getBoundingClientRect();
              const width = img.naturalWidth || rect.width;
              const height = img.naturalHeight || rect.height;
              return width >= 80 && height >= 60;
            })
            .map((img) => img.currentSrc || img.src)
            .filter(Boolean)
        );

        const pollOptions = uniqueStrings(
          [...node.querySelectorAll('ytd-backstage-poll-renderer tp-yt-paper-radio-button, ytd-backstage-poll-renderer #choice-text, ytd-poll-choice-renderer')]
            .map((item) => cleanText(item.textContent))
            .filter(Boolean)
        );

        const badgesText = cleanText(
          [...node.querySelectorAll('ytd-badge-supported-renderer, badge-shape, .badge-style-type-members-only')]
            .map((item) => item.textContent)
            .join(' ')
        );

        const isMembersOnly = /member|members|miembro|miembros|solo para/i.test(`${badgesText} ${node.innerText || ''}`);
        const likeText = cleanText(
          node.querySelector('#vote-count-middle')?.textContent ||
          node.querySelector('#vote-count-left')?.textContent ||
          node.querySelector('ytd-toggle-button-renderer #text')?.textContent ||
          ''
        );
        const commentText = cleanText(
          node.querySelector('ytd-comment-button-renderer #count')?.textContent ||
          node.querySelector('#reply-button-end #count')?.textContent ||
          ''
        );

        const id = extractPostId(url) || stableHash(`${context.channelUrl}|${publishedText}|${text}|${images.join('|')}`);
        if (!text && !url && images.length === 0 && pollOptions.length === 0) {
          return null;
        }

        return {
          id,
          url,
          channelUrl: context.channelUrl,
          channelName: context.channelName,
          author,
          publishedText,
          text,
          likeText,
          commentText,
          isMembersOnly,
          images,
          links,
          pollOptions,
          scrapedAt: new Date().toISOString(),
          scrapePhase: context.phase
        };
      }

      function fallbackPostText(node) {
        const raw = cleanText(node.innerText || node.textContent || '');
        return raw
          .split('\n')
          .filter((line) => !/^(like|likes|reply|replies|comment|comments|me gusta|responder|comentarios?)$/i.test(line.trim()))
          .join('\n');
      }

      function cleanText(value) {
        return String(value || '')
          .replace(/\u00a0/g, ' ')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      function uniqueElements(items) {
        return [...new Set(items)];
      }

      function uniqueStrings(items) {
        return [...new Set(items.map((item) => cleanText(item)).filter(Boolean))];
      }

      function absolutize(href) {
        try {
          return new URL(href, location.origin).toString();
        } catch {
          return null;
        }
      }

      function extractPostId(url) {
        if (!url) {
          return null;
        }
        const match = url.match(/(?:\/post\/|[?&]lb=)([^?&#/]+)/);
        return match?.[1] || null;
      }

      function stableHash(value) {
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
          hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
        }
        return `hash-${Math.abs(hash)}`;
      }
    }, meta).catch((error) => {
      this.log(`No se pudieron extraer posts visibles: ${error.message}`, 'error');
      return [];
    });
  }

  emitPosts(posts, phase, channelUrl) {
    this.emit('posts', {
      posts,
      phase,
      channelUrl,
      scrapedAt: new Date().toISOString()
    });
  }

  log(message, level = 'info') {
    this.emit('log', {
      level,
      message,
      at: new Date().toISOString()
    });
  }
}

export function normalizePostsUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('Introduce la URL del canal o de la pestana de publicaciones.');
  }

  let raw = trimmed;
  if (!/^https?:\/\//i.test(raw)) {
    raw = raw.startsWith('@') ? `https://www.youtube.com/${raw}` : `https://www.youtube.com/@${raw}`;
  }

  const url = new URL(raw);
  if (!/(^|\.)youtube\.com$/i.test(url.hostname)) {
    throw new Error('La URL debe ser de youtube.com.');
  }

  const path = url.pathname.replace(/\/+$/, '');
  const hasPostsPath = /\/(posts|community)$/i.test(path);
  if (!hasPostsPath) {
    url.pathname = `${path}/posts`;
  }

  url.search = '';
  url.hash = '';
  return url.toString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function conciseError(error) {
  return String(error?.message || error || '')
    .split('\n')[0]
    .replace(/\s+/g, ' ')
    .trim();
}

async function sleepInterruptible(totalMs, shouldStop) {
  const step = 500;
  let elapsed = 0;
  while (elapsed < totalMs && !shouldStop()) {
    const wait = Math.min(step, totalMs - elapsed);
    await sleep(wait);
    elapsed += wait;
  }
}
