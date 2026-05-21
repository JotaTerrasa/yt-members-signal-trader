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
    this.telegramPage = null;
    this.telegramSource = { enabled: false, url: '', maxMessages: 40, refreshSeconds: 300 };
    this.telegramLastRefreshAt = 0;
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

  async openTelegram(telegramUrl) {
    const url = normalizeTelegramWebUrl(telegramUrl);
    const page = await this.ensureTelegramPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    this.log('Telegram Web abierto. Inicia sesion en Chromium si aun no lo has hecho.');
    return { url: page.url() };
  }

  async start({ channelUrl, backfill, live, pollIntervalSeconds, maxScrolls, telegramSource = {} }) {
    if (this.running) {
      throw new Error('Ya hay un scrapeo en curso.');
    }
    this.running = true;
    this.stopRequested = false;

    const normalizedUrl = normalizePostsUrl(channelUrl);
    const intervalMs = Math.max(10, Number(pollIntervalSeconds) || 30) * 1000;
    const scrollLimit = clamp(Number(maxScrolls) || 120, 1, 500);
    const telegram = this.updateTelegramSource(telegramSource);

    try {
      const page = await this.ensurePage();
      this.emit('status', { running: true, phase: backfill ? 'backfill' : 'live', channelUrl: normalizedUrl });

      if (backfill) {
        await this.backfill(page, normalizedUrl, { maxScrolls: scrollLimit });
        if (telegram.enabled) {
          await this.readTelegramOnce(telegram, 'backfill');
        }
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
      this.telegramPage = null;
      this.telegramLastRefreshAt = 0;
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
        this.telegramPage = null;
        this.log('La ventana de Chromium se ha cerrado.');
      });
    }

    const pages = this.context.pages();
    this.page = this.page && !this.page.isClosed() ? this.page : pages[0] || await this.context.newPage();
    this.page.setDefaultTimeout(15000);
    return this.page;
  }

  async ensureTelegramPage() {
    await this.ensurePage();
    const pages = this.context.pages();
    this.telegramPage = this.telegramPage && !this.telegramPage.isClosed()
      ? this.telegramPage
      : pages.find((page) => page.url().includes('web.telegram.org')) || await this.context.newPage();
    this.telegramPage.setDefaultTimeout(15000);
    return this.telegramPage;
  }

  updateTelegramSource(input = {}) {
    const next = normalizeTelegramSource(input);
    const previous = this.telegramSource || {};
    if (previous.url !== next.url || previous.refreshSeconds !== next.refreshSeconds || previous.enabled !== next.enabled) {
      this.telegramLastRefreshAt = 0;
    }
    this.telegramSource = next;
    return next;
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

      const telegram = this.telegramSource;
      if (telegram.enabled) {
        await this.readTelegramOnce(telegram, 'live').catch((error) => {
          this.log(`Lectura Telegram fallida, se reintentara: ${conciseError(error)}`, 'warn');
        });
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
      source: 'youtube',
      scrapedAt: new Date().toISOString()
    });
  }

  async readTelegramOnce(telegram, phase) {
    const page = await this.ensureTelegramPage();
    const now = Date.now();
    const shouldRefresh = this.shouldRefreshTelegram(telegram, now);
    const navigation = await this.gotoTelegramChat(page, telegram.url, { refresh: shouldRefresh });
    if (!this.telegramLastRefreshAt || navigation.navigated || navigation.refreshed) {
      this.telegramLastRefreshAt = Date.now();
    }
    if (navigation.refreshed) {
      this.log(`Telegram Web refrescado automaticamente cada ${telegram.refreshSeconds} segundos.`);
    }
    if (await this.telegramNeedsLogin(page)) {
      this.emit('progress', {
        source: 'telegram_web',
        phase,
        currentScroll: 0,
        maxScrolls: 0,
        visibleMessages: 0
      });
      return;
    }
    const messages = await this.extractVisibleTelegramMessages(page, {
      phase,
      channelUrl: telegram.url,
      maxMessages: telegram.maxMessages
    });
    this.emit('progress', {
      source: 'telegram_web',
      phase,
      currentScroll: 0,
      maxScrolls: 0,
      visibleMessages: messages.length
    });
    this.emit('posts', {
      posts: messages,
      phase,
      channelUrl: telegram.url,
      source: 'telegram_web',
      scrapedAt: new Date().toISOString()
    });
  }

  shouldRefreshTelegram(telegram, now = Date.now()) {
    const refreshMs = Math.max(0, Number(telegram.refreshSeconds) || 0) * 1000;
    return refreshMs > 0
      && this.telegramLastRefreshAt > 0
      && now - this.telegramLastRefreshAt >= refreshMs;
  }

  async gotoTelegramChat(page, url, { refresh = false } = {}) {
    let navigated = false;
    let refreshed = false;
    if (!page.url().startsWith(url)) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      navigated = true;
    } else if (refresh) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      refreshed = true;
    }
    await page.waitForTimeout(1800);
    await page.keyboard.press('End').catch(() => {});
    await page.evaluate(() => {
      const scrollables = [...document.querySelectorAll('main, section, div')]
        .filter((node) => node.scrollHeight > node.clientHeight + 80);
      for (const node of scrollables.slice(-6)) {
        node.scrollTop = node.scrollHeight;
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
    }).catch(() => {});
    await page.waitForTimeout(700);

    const count = await page.locator('[data-mid], .message, .bubble').count().catch(() => 0);
    if (count === 0) {
      const needsLogin = await this.telegramNeedsLogin(page);
      this.log(
        needsLogin
          ? 'Telegram Web pide iniciar sesion en Chromium.'
          : 'No se detectaron mensajes Telegram. Si ves una pantalla de login, inicia sesion en Chromium.',
        'warn'
      );
    }
    return { navigated, refreshed };
  }

  async telegramNeedsLogin(page) {
    return page.evaluate(() => {
      const text = String(document.body?.innerText || '').toLowerCase();
      return text.includes('log in to telegram')
        || text.includes('log in by phone number')
        || text.includes('link desktop device')
        || text.includes('continuar en espa');
    }).catch(() => false);
  }

  async extractVisibleTelegramMessages(page, meta) {
    return page.evaluate(({ phase, channelUrl, maxMessages }) => {
      const chatKey = chatKeyFromUrl(channelUrl);
      const channelName = cleanText(
        document.querySelector('.chat-info .peer-title')?.textContent ||
        document.querySelector('.topbar .peer-title')?.textContent ||
        document.querySelector('[class*="peer-title"]')?.textContent ||
        document.querySelector('[class*="chat-title"]')?.textContent ||
        'Telegram Web'
      );
      const nodes = findMessageNodes().slice(-Math.max(5, Number(maxMessages) || 40));

      return nodes.map((node) => extractMessage(node)).filter(Boolean);

      function findMessageNodes() {
        const selectorGroups = [
          '[data-mid]',
          '.message',
          '.bubble',
          '[id^="message-"]'
        ];

        for (const selector of selectorGroups) {
          const nodes = uniqueElements([...document.querySelectorAll(selector)])
            .filter(isUsefulMessageNode);
          if (nodes.length) {
            return nodes.filter((node) => !nodes.some((other) => other !== node && node.contains(other)));
          }
        }

        return [];
      }

      function isUsefulMessageNode(node) {
        const rect = node.getBoundingClientRect();
        const text = cleanTelegramText(node.innerText || node.textContent || '');
        return rect.width > 120
          && rect.height > 18
          && text.length > 1
          && !/^(search|buscar|emoji|sticker|menu)$/i.test(text);
      }

      function extractMessage(node) {
        const textNode = node.querySelector('.text-content, .translatable-message, [class*="text-content"], [class*="message-text"]') || node;
        const text = cleanTelegramText(textNode.innerText || textNode.textContent || node.innerText || '');
        if (!text || isTelegramLoginText(text) || !looksLikeTradingMessage(text)) {
          return null;
        }

        const timeNode = node.querySelector('time, .time, .message-time, [datetime], [title]');
        const publishedText = cleanText(
          timeNode?.getAttribute('datetime') ||
          timeNode?.getAttribute('title') ||
          timeNode?.textContent ||
          ''
        );
        const rawId = node.getAttribute('data-mid') ||
          node.querySelector('[data-mid]')?.getAttribute('data-mid') ||
          node.id ||
          '';
        const id = rawId
          ? `telegram-${chatKey}-${cleanId(rawId)}`
          : `telegram-${chatKey}-${stableHash(`${publishedText}|${text}`)}`;

        return {
          id,
          url: channelUrl,
          channelUrl,
          channelName,
          author: channelName,
          publishedText,
          text,
          likeText: '',
          commentText: '',
          isMembersOnly: false,
          source: 'telegram_web',
          images: [],
          links: extractLinks(node),
          pollOptions: [],
          scrapedAt: new Date().toISOString(),
          scrapePhase: phase
        };
      }

      function extractLinks(node) {
        return uniqueStrings(
          [...node.querySelectorAll('a[href]')]
            .map((anchor) => anchor.href)
            .filter((href) => href && !href.startsWith('javascript:'))
        );
      }

      function cleanTelegramText(value) {
        return cleanText(value)
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !/^\d{1,2}:\d{2}(?:\s?(am|pm))?$/i.test(line))
          .filter((line) => !/^(edited|visto|views?|reactions?)$/i.test(line))
          .join('\n')
          .trim();
      }

      function isTelegramLoginText(value) {
        const text = String(value || '').toLowerCase();
        return text.includes('log in to telegram')
          || text.includes('log in by phone number')
          || text.includes('link desktop device')
          || text.includes('continuar en espa');
      }

      function looksLikeTradingMessage(value) {
        return /\b(cierre|cerrar|orden|long|short|tps?|take profit|stop|sl|apalancamiento|bingx)\b/i.test(String(value || ''));
      }

      function cleanText(value) {
        return String(value || '')
          .replace(/\u00a0/g, ' ')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      function cleanId(value) {
        return String(value || '').replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-');
      }

      function chatKeyFromUrl(value) {
        try {
          const url = new URL(value);
          return cleanId(url.hash || url.pathname || 'chat');
        } catch {
          return 'chat';
        }
      }

      function stableHash(value) {
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
          hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
        }
        return `hash-${Math.abs(hash)}`;
      }

      function uniqueElements(items) {
        return [...new Set(items)];
      }

      function uniqueStrings(items) {
        return [...new Set(items.map((item) => cleanText(item)).filter(Boolean))];
      }
    }, meta).catch((error) => {
      this.log(`No se pudieron extraer mensajes Telegram: ${error.message}`, 'error');
      return [];
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

export function normalizeTelegramWebUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('Introduce la URL del canal de Telegram Web.');
  }

  let raw = trimmed;
  if (/^-?\d+$/.test(raw) || raw.startsWith('#')) {
    raw = `https://web.telegram.org/k/#${raw.replace(/^#/, '')}`;
  }
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://web.telegram.org/k/#${raw}`;
  }

  const url = new URL(raw);
  if (!/(^|\.)web\.telegram\.org$/i.test(url.hostname)) {
    throw new Error('La URL debe ser de web.telegram.org.');
  }

  if (!url.pathname || url.pathname === '/') {
    url.pathname = '/k/';
  }
  if (!url.hash) {
    throw new Error('La URL de Telegram Web debe incluir el chat en el hash.');
  }
  return url.toString();
}

function normalizeTelegramSource(input = {}) {
  const enabled = Boolean(input.enabled);
  if (!enabled) {
    return { enabled: false, url: '', maxMessages: 40, refreshSeconds: 300 };
  }
  return {
    enabled: true,
    url: normalizeTelegramWebUrl(input.url),
    maxMessages: clamp(Number(input.maxMessages) || 40, 5, 200),
    refreshSeconds: clamp(Number(input.refreshSeconds) || 300, 30, 3600)
  };
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
