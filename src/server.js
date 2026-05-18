import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigStore } from './configStore.js';
import { BingXPriceWebSocket } from './bingxPriceWebSocket.js';
import { FuturesTrader } from './futuresTrader.js';
import { buildHistoricalPnl } from './historicalPnl.js';
import { PaperTradeStore } from './paperTradeStore.js';
import { detectPortfolioUrl } from './portfolioDetector.js';
import { applyReferenceLedger, clearReferenceLedgerCache, loadReferenceLedger, resolvePortfolioSource } from './referenceLedger.js';
import { PostStore } from './store.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { YouTubePostsScraper, normalizePostsUrl } from './youtubeScraper.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const publicDir = join(rootDir, 'public');
const dataDir = join(rootDir, '.data');
const profileDir = join(rootDir, '.yt-profile');
const port = Number(process.env.PORT || 5178);

await mkdir(dataDir, { recursive: true });
await mkdir(profileDir, { recursive: true });

const store = new PostStore(join(dataDir, 'posts.json'));
await store.init();

const configStore = new ConfigStore(join(dataDir, 'config.json'));
await configStore.init();

const paperStore = new PaperTradeStore(join(dataDir, 'paper-trades.json'));
await paperStore.init();

const scraper = new YouTubePostsScraper({ profileDir });
const telegramNotifier = new TelegramNotifier({
  configStore,
  onLog: (entry) => pushLog(entry)
});
const priceFeed = new BingXPriceWebSocket({
  onLog: (entry) => pushLog(entry)
});
const futuresTrader = new FuturesTrader({
  configStore,
  paperStore,
  onLog: (entry) => pushLog(entry),
  onTrade: (event) => {
    state.trades.unshift(event);
    state.trades = state.trades.slice(0, 200);
    broadcast('trade', event);
    syncPriceSubscriptions();
    broadcast('state', state);
  }
});
const clients = new Set();
let pnlCache = null;
const lastPriceBroadcast = new Map();

const state = {
  browserOpen: false,
  running: false,
  phase: 'idle',
  channelUrl: '',
  currentScroll: 0,
  maxScrolls: 0,
  visiblePosts: 0,
  lastRunAt: null,
  lastError: null,
  health: null,
  priceFeed: null,
  logs: [],
  trades: [],
  stats: store.stats()
};
let lastHealthAlertKey = '';
let lastHealthAlertAt = 0;

scraper.on('log', (entry) => {
  pushLog(entry);
});

scraper.on('status', (next) => {
  state.browserOpen = scraper.isBrowserOpen;
  state.running = next.running;
  state.phase = next.phase;
  state.channelUrl = next.channelUrl || state.channelUrl;
  state.lastRunAt = new Date().toISOString();
  broadcast('state', state);
});

scraper.on('progress', (progress) => {
  state.currentScroll = progress.currentScroll;
  state.maxScrolls = progress.maxScrolls;
  state.visiblePosts = progress.visiblePosts;
  broadcast('state', state);
});

scraper.on('posts', (payload) => {
  handlePosts(payload).catch((error) => {
    pushLog({ level: 'error', message: error.message, at: new Date().toISOString() });
  });
});

priceFeed.on('status', (status) => {
  state.priceFeed = status;
  broadcast('state', state);
});

priceFeed.on('price', (tick) => {
  handlePriceTick(tick).catch((error) => {
    pushLog({ level: 'error', message: `WS price: ${error.message}`, at: new Date().toISOString() });
  });
});

async function handlePosts(payload) {
  const result = await store.upsertMany(payload.posts, payload);
  state.stats = store.stats();
  state.lastRunAt = payload.scrapedAt;
  broadcast('posts', {
    inserted: result.inserted,
    updated: result.updated,
    total: result.total,
    phase: payload.phase
  });
  broadcast('state', state);

  if (result.inserted.length || result.updated.length) {
    await detectPortfolioUpdate([...result.inserted, ...result.updated]);
  }

  if (result.inserted.length) {
    pushLog({
      level: 'info',
      message: `${result.inserted.length} publicaciones nuevas detectadas.`,
      at: new Date().toISOString()
    });

    telegramNotifier.notifyPosts(result.inserted, payload)
      .then((telegramResult) => {
        if (telegramResult.sent) {
          pushLog({
            level: 'info',
            message: `${telegramResult.sent} alertas enviadas por Telegram.`,
            at: new Date().toISOString()
          });
        }
      })
      .catch((error) => {
        pushLog({
          level: 'error',
          message: `Telegram: ${error.message}`,
          at: new Date().toISOString()
        });
      });

    futuresTrader.processPosts(result.inserted, payload)
      .then((tradeResults) => {
        const accepted = tradeResults.filter((result) => result.status.endsWith('_order_sent'));
        if (accepted.length) {
          pushLog({
            level: 'warn',
            message: `${accepted.length} senales enviadas a BingX (${accepted[0].status.startsWith('test') ? 'test' : 'live'}).`,
            at: new Date().toISOString()
          });
        }
      })
      .catch((error) => {
        pushLog({
          level: 'error',
          message: `BingX: ${error.message}`,
          at: new Date().toISOString()
        });
      });
  }
}

async function detectPortfolioUpdate(posts) {
  const detected = detectPortfolioUrl(posts);
  if (!detected) {
    return null;
  }

  const current = configStore.getPortfolio();
  if (current.url === detected.url) {
    return current;
  }

  try {
    const portfolio = await updatePortfolioSource(detected);
    pushLog({
      level: 'info',
      message: `Portfolio actualizado desde YouTube: ${portfolio.url}`,
      at: new Date().toISOString()
    });
    return portfolio;
  } catch (error) {
    pushLog({
      level: 'warn',
      message: `Portfolio detectado pero no usable (${detected.url}): ${error.message}`,
      at: new Date().toISOString()
    });
    return null;
  }
}

async function updatePortfolioSource(input) {
  const source = await resolvePortfolioSource(input.url);
  const portfolio = await configStore.updatePortfolio({
    ...input,
    resolvedUrl: source.resolvedUrl,
    spreadsheetId: source.spreadsheetId
  });
  clearReferenceLedgerCache();
  pnlCache = null;
  broadcast('portfolio', { portfolio });
  broadcast('state', state);
  return portfolio;
}

function findReplayPost(postId) {
  const posts = store.list();
  if (postId) {
    return posts.find((post) => post.id === postId || post.url === postId) || null;
  }

  return posts.find((post) => futuresTrader.parseAll(post.text || '').some((signal) => signal.isSignal)) || null;
}

function publicPostSummary(post) {
  return {
    id: post.id,
    url: post.url,
    publishedText: post.publishedText,
    firstSeenAt: post.firstSeenAt,
    text: String(post.text || '').slice(0, 500)
  };
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    if (requestUrl.pathname === '/api/events') {
      return handleEvents(response);
    }

    if (requestUrl.pathname === '/api/state' && request.method === 'GET') {
      return sendJson(response, currentState());
    }

    if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, { ok: true, health: buildHealth() });
    }

    if (requestUrl.pathname === '/api/posts' && request.method === 'GET') {
      return sendJson(response, { posts: store.list(), stats: store.stats() });
    }

    if (requestUrl.pathname === '/api/telegram' && request.method === 'GET') {
      return sendJson(response, { telegram: configStore.getTelegram() });
    }

    if (requestUrl.pathname === '/api/telegram' && request.method === 'PUT') {
      const body = await readJson(request);
      const telegram = await configStore.updateTelegram(body);
      broadcast('telegram', { telegram });
      return sendJson(response, { ok: true, telegram });
    }

    if (requestUrl.pathname === '/api/telegram/test' && request.method === 'POST') {
      await telegramNotifier.sendTest();
      pushLog({
        level: 'info',
        message: 'Mensaje de prueba enviado por Telegram.',
        at: new Date().toISOString()
      });
      return sendJson(response, { ok: true });
    }

    if (requestUrl.pathname === '/api/telegram/detect-chat' && request.method === 'POST') {
      const chats = await telegramNotifier.detectChats();
      const selected = chats[0];
      const telegram = await configStore.updateTelegramChatId(selected.id);
      broadcast('telegram', { telegram });
      pushLog({
        level: 'info',
        message: `Chat de Telegram detectado: ${selected.title} (${selected.id}).`,
        at: new Date().toISOString()
      });
      return sendJson(response, { ok: true, selected, chats, telegram });
    }

    if (requestUrl.pathname === '/api/bingx' && request.method === 'GET') {
      return sendJson(response, {
        bingx: configStore.getBingX(),
        trades: state.trades,
        paperTrades: paperStore.list(),
        risk: futuresTrader.riskSnapshot()
      });
    }

    if (requestUrl.pathname === '/api/bingx' && request.method === 'PUT') {
      const body = await readJson(request);
      const bingx = await configStore.updateBingX(body);
      pnlCache = null;
      broadcast('bingx', { bingx });
      return sendJson(response, { ok: true, bingx });
    }

    if (requestUrl.pathname === '/api/bingx/paper/clear' && request.method === 'POST') {
      const cleared = await paperStore.clear();
      pnlCache = null;
      syncPriceSubscriptions();
      const event = {
        at: new Date().toISOString(),
        status: 'paper_cleared',
        cleared,
        paperTrades: []
      };
      state.trades.unshift(event);
      state.trades = state.trades.slice(0, 200);
      broadcast('trade', event);
      broadcast('state', state);
      pushLog({
        level: 'info',
        message: `${cleared} operaciones paper locales limpiadas.`,
        at: new Date().toISOString()
      });
      return sendJson(response, { ok: true, cleared, paperTrades: [], risk: futuresTrader.riskSnapshot() });
    }

    if (requestUrl.pathname === '/api/bingx/test-connection' && request.method === 'POST') {
      const result = await futuresTrader.testConnection();
      pushLog({
        level: 'info',
        message: 'Conexion BingX validada.',
        at: new Date().toISOString()
      });
      return sendJson(response, { ok: true, result });
    }

    if (requestUrl.pathname === '/api/bingx/vst' && request.method === 'POST') {
      const body = await readJson(request);
      const result = await futuresTrader.applyVst({ amount: body.amount || 10000 });
      pushLog({
        level: 'info',
        message: `Saldo VST actualizado: ${result.data?.balance || result.data || 'ok'}.`,
        at: new Date().toISOString()
      });
      return sendJson(response, { ok: true, result });
    }

    if (requestUrl.pathname === '/api/bingx/probe' && request.method === 'POST') {
      const body = await readJson(request);
      const bingx = configStore.getBingX();
      if (bingx.mode === 'live' && body.confirm !== 'LIVE_MINIMA') {
        return sendJson(response, { error: 'Confirma LIVE_MINIMA para enviar una prueba real.' }, 400);
      }
      const result = await futuresTrader.executeProbe(body);
      pnlCache = null;
      return sendJson(response, { ok: true, result });
    }

    if (requestUrl.pathname === '/api/bingx/replay-latest-signal' && request.method === 'POST') {
      const body = await readJson(request);
      const bingx = configStore.getBingX();
      if (bingx.mode === 'live' && body.confirm !== 'REPLAY_LIVE') {
        return sendJson(response, { error: 'Confirma REPLAY_LIVE para reejecutar una senal en live.' }, 400);
      }

      const post = findReplayPost(body.postId);
      if (!post) {
        return sendJson(response, { error: 'No hay publicaciones con senales para reejecutar.' }, 404);
      }

      const results = await futuresTrader.processPosts([post], { phase: 'manual_replay' });
      pnlCache = null;
      pushLog({
        level: bingx.mode === 'live' ? 'warn' : 'info',
        message: `Replay de senal ejecutado: ${results.length} eventos (${post.url}).`,
        at: new Date().toISOString()
      });
      return sendJson(response, { ok: true, post: publicPostSummary(post), results });
    }

    if (requestUrl.pathname === '/api/bingx/pnl' && request.method === 'GET') {
      const bingx = configStore.getBingX();
      if (!bingx.apiKeyConfigured || !bingx.apiSecretConfigured) {
        return sendJson(response, { error: 'Configura la API key y secret de BingX para leer el PnL.' }, 400);
      }

      const months = requestUrl.searchParams.get('months') || 3;
      if (pnlCache && pnlCache.months === String(months) && Date.now() - pnlCache.at < 45000) {
        return sendJson(response, { ok: true, pnl: pnlCache.pnl, cached: true });
      }

      try {
        const pnl = await futuresTrader.getMonthlyPnl({ months });
        pnlCache = { months: String(months), at: Date.now(), pnl };
        return sendJson(response, { ok: true, pnl });
      } catch (error) {
        const pnl = await futuresTrader.getPaperOnlyPnl({ months, warning: error.message });
        pnlCache = { months: String(months), at: Date.now(), pnl };
        pushLog({ level: 'warn', message: `BingX PnL no disponible, usando paper local: ${error.message}`, at: new Date().toISOString() });
        return sendJson(response, { ok: true, pnl, warning: error.message });
      }
    }

    if (requestUrl.pathname === '/api/risk' && request.method === 'GET') {
      return sendJson(response, { ok: true, risk: futuresTrader.riskSnapshot(), bingx: configStore.getBingX() });
    }

    if (requestUrl.pathname === '/api/price-feed' && request.method === 'GET') {
      return sendJson(response, { ok: true, priceFeed: priceFeed.status() });
    }

    if (requestUrl.pathname === '/api/historical-pnl' && request.method === 'GET') {
      const bingx = configStore.getBingX();
      const portfolio = configStore.getPortfolio();
      const parsedHistorical = buildHistoricalPnl(store.list(), {
        months: requestUrl.searchParams.get('months') || 72,
        defaultNotionalUSDT: bingx.defaultNotionalUSDT || 10,
        fallbackLeverage: bingx.maxLeverage || 1
      });
      const historical = await applyReferenceLedger(parsedHistorical, {
        month: requestUrl.searchParams.get('month') || currentMonthKey(),
        portfolioUrl: portfolio.url
      });
      return sendJson(response, { ok: true, historical });
    }

    if (requestUrl.pathname === '/api/reference-ledger' && request.method === 'GET') {
      const month = requestUrl.searchParams.get('month') || currentMonthKey();
      const portfolio = configStore.getPortfolio();
      const reference = await loadReferenceLedger({ month, portfolioUrl: portfolio.url });
      return sendJson(response, { ok: true, reference });
    }

    if (requestUrl.pathname === '/api/portfolio' && request.method === 'GET') {
      return sendJson(response, { ok: true, portfolio: configStore.getPortfolio() });
    }

    if (requestUrl.pathname === '/api/portfolio' && request.method === 'PUT') {
      const body = await readJson(request);
      const portfolio = await updatePortfolioSource({
        url: body.url,
        detectedAt: new Date().toISOString(),
        postId: body.postId,
        postUrl: body.postUrl
      });
      return sendJson(response, { ok: true, portfolio });
    }

    if (requestUrl.pathname === '/api/bingx/parse-test' && request.method === 'POST') {
      const body = await readJson(request);
      const signals = futuresTrader.parseAll(body.text || '');
      return sendJson(response, { ok: true, signal: signals[0], signals });
    }

    if (requestUrl.pathname === '/api/posts/clear' && request.method === 'POST') {
      await store.clear();
      state.stats = store.stats();
      broadcast('posts', { inserted: [], updated: [], total: 0, phase: 'clear' });
      broadcast('state', state);
      return sendJson(response, { ok: true });
    }

    if (requestUrl.pathname === '/api/export.json' && request.method === 'GET') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="youtube-posts.json"'
      });
      return response.end(store.toJson());
    }

    if (requestUrl.pathname === '/api/export.csv' && request.method === 'GET') {
      response.writeHead(200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="youtube-posts.csv"'
      });
      return response.end(store.toCsv());
    }

    if (requestUrl.pathname === '/api/trades.csv' && request.method === 'GET') {
      response.writeHead(200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="paper-trades.csv"'
      });
      return response.end(paperStore.toCsv());
    }

    if (requestUrl.pathname === '/api/audit' && request.method === 'GET') {
      return sendJson(response, {
        ok: true,
        generatedAt: new Date().toISOString(),
        health: buildHealth(),
        risk: futuresTrader.riskSnapshot(),
        bingx: configStore.getBingX(),
        telegram: configStore.getTelegram(),
        portfolio: configStore.getPortfolio(),
        stats: store.stats(),
        recentLogs: state.logs.slice(0, 80),
        recentEvents: state.trades.slice(0, 120),
        paperTrades: paperStore.list()
      });
    }

    if (requestUrl.pathname === '/api/browser/open' && request.method === 'POST') {
      await scraper.openYouTube();
      state.browserOpen = scraper.isBrowserOpen;
      broadcast('state', state);
      return sendJson(response, { ok: true, state: currentState() });
    }

    if (requestUrl.pathname === '/api/scrape/start' && request.method === 'POST') {
      if (scraper.running) {
        return sendJson(response, { error: 'Ya hay un scrapeo en curso.' }, 409);
      }

      const body = await readJson(request);
      if (!body.backfill && !body.live) {
        return sendJson(response, { error: 'Activa posts pasados, monitor continuo o ambos.' }, 400);
      }

      let normalizedUrl;
      try {
        normalizedUrl = normalizePostsUrl(body.channelUrl);
      } catch (error) {
        return sendJson(response, { error: error.message }, 400);
      }

      state.lastError = null;
      state.running = true;
      state.phase = body.backfill ? 'backfill' : 'live';
      state.channelUrl = normalizedUrl;
      state.currentScroll = 0;
      state.maxScrolls = Number(body.maxScrolls) || 0;
      broadcast('state', state);

      scraper.start({
        channelUrl: normalizedUrl,
        backfill: Boolean(body.backfill),
        live: Boolean(body.live),
        pollIntervalSeconds: Number(body.pollIntervalSeconds) || 30,
        maxScrolls: Number(body.maxScrolls) || 120
      }).catch((error) => {
        state.running = false;
        state.phase = 'idle';
        state.lastError = error.message;
        pushLog({ level: 'error', message: error.message, at: new Date().toISOString() });
        broadcast('state', state);
      });

      return sendJson(response, { ok: true, state: currentState() });
    }

    if (requestUrl.pathname === '/api/scrape/stop' && request.method === 'POST') {
      scraper.stop();
      return sendJson(response, { ok: true });
    }

    return serveStatic(requestUrl.pathname, response);
  } catch (error) {
    pushLog({ level: 'error', message: error.message, at: new Date().toISOString() });
    return sendJson(response, { error: error.message }, 500);
  }
});

server.listen(port, () => {
  console.log(`YouTube Posts Scraper disponible en http://localhost:${port}`);
  syncPriceSubscriptions();
});

setInterval(() => {
  checkHealth().catch((error) => {
    pushLog({ level: 'error', message: `Health: ${error.message}`, at: new Date().toISOString() });
  });
}, 30000).unref();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function currentState() {
  state.health = buildHealth();
  state.priceFeed = priceFeed.status();
  return {
    ...state,
    browserOpen: scraper.isBrowserOpen,
    running: scraper.running,
    portfolio: configStore.getPortfolio(),
    stats: store.stats()
  };
}

function syncPriceSubscriptions() {
  priceFeed.setSymbols(paperStore.openSymbols());
  state.priceFeed = priceFeed.status();
}

async function handlePriceTick(tick) {
  const result = await paperStore.applyMarketPrice({
    symbol: tick.symbol,
    price: tick.price,
    source: tick.source || 'bingx_ws'
  });

  if (!result.updated.length && !result.closed.length) {
    return;
  }

  const now = Date.now();
  const last = lastPriceBroadcast.get(tick.symbol) || 0;
  if (result.closed.length || now - last > 1000) {
    lastPriceBroadcast.set(tick.symbol, now);
    broadcast('price', {
      tick,
      updatedPaperPositions: result.updated,
      closedPaperPositions: result.closed
    });
  }

  if (!result.closed.length) {
    return;
  }

  for (const position of result.closed) {
    const event = {
      at: position.closedAt,
      status: 'paper_price_close',
      postUrl: position.postUrl,
      signal: {
        symbol: position.symbol,
        direction: position.direction
      },
      priceTick: tick,
      closedPaperPositions: [position]
    };
    state.trades.unshift(event);
    state.trades = state.trades.slice(0, 200);
    broadcast('trade', event);
    pushLog({
      level: 'warn',
      message: `Cierre paper por ${position.closeReason} en ${position.symbol}: ${position.closePrice}.`,
      at: new Date().toISOString()
    });
    telegramNotifier.sendAlert(
      'Cierre paper por precio',
      [
        `${position.symbol} ${position.direction}`,
        `Motivo: ${position.closeReason}`,
        `Cierre: ${position.closePrice}`,
        `Tick BingX: ${tick.price}`,
        `PnL: ${formatSigned(position.paperPnl)} USDT`
      ].join('\n')
    ).catch((error) => {
      pushLog({ level: 'error', message: `Telegram price close: ${error.message}`, at: new Date().toISOString() });
    });
  }

  syncPriceSubscriptions();
  broadcast('state', state);
}

function buildHealth() {
  const telegram = configStore.getTelegram();
  const staleMs = Math.max(1, Number(telegram.healthStaleMinutes || 3)) * 60 * 1000;
  const lastRunTime = state.lastRunAt ? Date.parse(state.lastRunAt) : NaN;
  const ageMs = Number.isFinite(lastRunTime) && lastRunTime > 0 ? Date.now() - lastRunTime : null;
  const stale = scraper.running && state.phase === 'live' && ageMs !== null && ageMs > staleMs;
  const noVisiblePosts = scraper.running && state.phase === 'live' && Number(state.visiblePosts || 0) === 0;
  const recentError = state.logs.find((log) => (
    log.level === 'error'
    && Date.now() - Date.parse(log.at || 0) < 15 * 60 * 1000
  ));
  const lastError = state.lastError || recentError?.message || null;
  const level = stale || noVisiblePosts || lastError ? 'warn' : scraper.running ? 'ok' : 'idle';

  return {
    level,
    running: scraper.running,
    phase: state.phase,
    lastRunAt: state.lastRunAt,
    ageSeconds: ageMs === null ? null : Math.max(0, Math.round(ageMs / 1000)),
    stale,
    staleAfterSeconds: Math.round(staleMs / 1000),
    noVisiblePosts,
    visiblePosts: Number(state.visiblePosts || 0),
    lastError,
    checkedAt: new Date().toISOString()
  };
}

async function checkHealth() {
  const health = buildHealth();
  state.health = health;
  broadcast('state', state);
  if (health.level !== 'warn') {
    return;
  }

  const key = [
    health.stale ? 'stale' : '',
    health.noVisiblePosts ? 'no_posts' : '',
    health.lastError || ''
  ].filter(Boolean).join('|');
  const now = Date.now();
  if (!key || (key === lastHealthAlertKey && now - lastHealthAlertAt < 15 * 60 * 1000)) {
    return;
  }

  lastHealthAlertKey = key;
  lastHealthAlertAt = now;
  const details = [
    health.stale ? `Ultima lectura hace ${health.ageSeconds}s.` : '',
    health.noVisiblePosts ? 'YouTube no esta devolviendo posts visibles.' : '',
    health.lastError ? `Ultimo error: ${health.lastError}` : ''
  ].filter(Boolean).join('\n');

  await telegramNotifier.sendAlert('Alerta scraper YouTube', details)
    .then((result) => {
      if (result.sent) {
        pushLog({ level: 'warn', message: 'Alerta de salud enviada por Telegram.', at: new Date().toISOString() });
      }
    })
    .catch((error) => {
      pushLog({ level: 'error', message: `Telegram health: ${error.message}`, at: new Date().toISOString() });
    });
}

function handleEvents(response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive'
  });
  response.write(`event: state\ndata: ${JSON.stringify(currentState())}\n\n`);
  clients.add(response);
  response.on('close', () => clients.delete(response));
}

function broadcast(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

function pushLog(entry) {
  state.logs.unshift(entry);
  state.logs = state.logs.slice(0, 200);
  broadcast('log', entry);
  broadcast('state', state);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function serveStatic(pathname, response) {
  const decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const filePath = resolve(publicDir, `.${decoded}`);
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    return response.end('Forbidden');
  }

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    response.writeHead(404);
    return response.end('Not found');
  }

  const stream = createReadStream(filePath);
  response.writeHead(200, { 'content-type': mimeType(extname(filePath)) });
  stream.pipe(response);
}

function mimeType(extension) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  }[extension] || 'application/octet-stream';
}

async function shutdown() {
  for (const client of clients) {
    client.end();
  }
  clients.clear();
  priceFeed.destroy();
  await scraper.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

function formatSigned(value) {
  const number = Number(value || 0);
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${Math.round((number + Number.EPSILON) * 10000) / 10000}`;
}

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
