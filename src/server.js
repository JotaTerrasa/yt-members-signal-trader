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
import { TradeEventStore } from './tradeEventStore.js';
import { YouTubePostsScraper, normalizePostsUrl, normalizeTelegramWebUrl } from './youtubeScraper.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const publicDir = join(rootDir, 'public');
const dataDir = join(rootDir, '.data');
const profileDir = join(rootDir, '.yt-profile');
const port = Number(process.env.PORT || 5178);
const EXCHANGE_SYNC_POLL_MS = 30_000;
const EXCHANGE_SYNC_MIN_INTERVAL_MS = 10_000;
const EXCHANGE_SYNC_STALE_MS = 90_000;
const EXCHANGE_SAFETY_ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const DUPLICATE_SIGNAL_WINDOW_MS = 12 * 60 * 60 * 1000;
const HEALTH_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const NO_VISIBLE_POSTS_ALERT_GRACE_MS = 5 * 60 * 1000;

await mkdir(dataDir, { recursive: true });
await mkdir(profileDir, { recursive: true });

const store = new PostStore(join(dataDir, 'posts.json'));
await store.init();

const configStore = new ConfigStore(join(dataDir, 'config.json'));
await configStore.init();

const paperStore = new PaperTradeStore(join(dataDir, 'paper-trades.json'));
await paperStore.init();

const tradeEventStore = new TradeEventStore(join(dataDir, 'trade-events.json'));
await tradeEventStore.init();

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
  tradeEventStore,
  onLog: (entry) => pushLog(entry),
  onTrade: (event) => {
    pnlSourcesCache = null;
    recordTradeEvent(event);
    notifyTradeCriticalEvent(event);
    syncExchangePositions({ reason: event.status || 'trade' }).catch((error) => {
      pushLog({ level: 'warn', message: `BingX sync: ${error.message}`, at: new Date().toISOString() });
      syncPriceSubscriptions();
    });
    broadcast('state', state);
  }
});
const clients = new Set();
let pnlCache = null;
let pnlSourcesCache = null;
const lastPriceBroadcast = new Map();
let exchangeOpenSymbols = new Set();
let exchangePositionsCache = [];
let exchangeBalancesCache = {};
let exchangeOpenOrdersCache = [];
let exchangeSyncInFlight = false;
let lastExchangeSyncAt = 0;
let lastExchangeSyncReason = '';
const pendingExchangeClosures = new Map();
const exchangeSafetyAlerts = new Map();

const state = {
  browserOpen: false,
  running: false,
  phase: 'idle',
  channelUrl: '',
  currentScroll: 0,
  maxScrolls: 0,
  visiblePosts: 0,
  visibleTelegramMessages: 0,
  telegramWebUrl: '',
  lastTelegramRunAt: null,
  lastRunAt: null,
  lastError: null,
  health: null,
  priceFeed: null,
  logs: [],
  trades: tradeEventStore.list(200),
  stats: store.stats()
};
let lastHealthAlertKey = '';
let lastHealthAlertAt = 0;
let noVisiblePostsStartedAt = 0;

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
  if (progress.source === 'telegram_web') {
    state.visibleTelegramMessages = progress.visibleMessages || 0;
  } else {
    state.currentScroll = progress.currentScroll;
    state.maxScrolls = progress.maxScrolls;
    state.visiblePosts = progress.visiblePosts;
  }
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
  const posts = filterIncomingPosts(payload);
  const result = await store.upsertMany(posts, payload);
  state.stats = store.stats();
  state.lastRunAt = payload.scrapedAt;
  if (payload.source === 'telegram_web') {
    state.lastTelegramRunAt = payload.scrapedAt;
    state.telegramWebUrl = payload.channelUrl || state.telegramWebUrl;
  }
  broadcast('posts', {
    inserted: result.inserted,
    updated: result.updated,
    total: result.total,
    phase: payload.phase,
    source: payload.source || 'youtube'
  });
  broadcast('state', state);

  if (result.inserted.length || result.updated.length) {
    await detectPortfolioUpdate([...result.inserted, ...result.updated]);
  }

  if (result.inserted.length) {
    const sourceLabel = sourceItemLabel(payload);
    pushLog({
      level: 'info',
      message: `${result.inserted.length} ${sourceLabel} nuevos detectados.`,
      at: new Date().toISOString()
    });

    if (payload.source !== 'telegram_web') {
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
    }

    const tradePlan = tradingPlanForPayload(payload);
    if (!tradePlan.enabled) {
      const signalCount = countParsedSignals(result.inserted);
      if (signalCount) {
        pushLog({
          level: 'warn',
          message: `${signalCount} senales Telegram detectadas sin ejecutar (${tradePlan.reason}).`,
          at: new Date().toISOString()
        });
      }
      return;
    }

    futuresTrader.processPosts(result.inserted, payload, tradePlan.options)
      .then((tradeResults) => {
        const accepted = tradeResults.filter((result) => result.status.endsWith('_order_sent'));
        if (accepted.length) {
          const modes = [...new Set(accepted.map((result) => result.status.replace(/_order_sent$/, '')))];
          const executionMode = modes.join('+');
          pushLog({
            level: 'warn',
            message: `${accepted.length} senales enviadas a BingX (${executionMode}).`,
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

function sourceItemLabel(payload = {}) {
  return payload.source === 'telegram_web' ? 'mensajes Telegram' : 'publicaciones';
}

function filterIncomingPosts(payload = {}) {
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  if (payload.source !== 'telegram_web') {
    return posts;
  }
  return posts.filter((post) => futuresTrader.parseAll(post.text || '').some((signal) => signal.isSignal));
}

function tradingPlanForPayload(payload = {}) {
  if (payload.source !== 'telegram_web') {
    return {
      enabled: true,
      reason: '',
      options: {
        duplicateGuard: duplicateOpenSignalGuard
      }
    };
  }

  const telegramSource = configStore.getTelegramSource();
  if (!telegramSource.executeSignals) {
    return { enabled: false, reason: 'ejecucion Telegram desactivada', options: {} };
  }

  const bingx = configStore.getBingX();
  if (usesLiveMode(bingx.mode) && !telegramSource.liveConfirmed) {
    return { enabled: false, reason: 'live Telegram no confirmado', options: {} };
  }

  return {
    enabled: true,
    reason: '',
    options: {
      filterSignal: (signal) => telegramSource.executeOpenSignals || isPositionManagementSignal(signal),
      filteredReason: 'telegram_open_signals_disabled',
      duplicateGuard: duplicateOpenSignalGuard
    }
  };
}

function isPositionManagementSignal(signal = {}) {
  return ['CLOSE', 'CLOSE_ALL', 'MOVE_SL_BE', 'SET_TAKE_PROFIT', 'SET_STOP_LOSS'].includes(signal.action);
}

function duplicateOpenSignalGuard(signal = {}) {
  if (!signal.symbol || !signal.direction || isPositionManagementSignal(signal)) {
    return null;
  }

  const duplicate = tradeEventStore.findRecentOpenSignal(signal, {
    windowMs: DUPLICATE_SIGNAL_WINDOW_MS
  });
  if (!duplicate) {
    return null;
  }

  return {
    reason: 'duplicate_open_signal',
    eventId: duplicate.eventId || null,
    at: duplicate.at || null
  };
}

function countParsedSignals(posts = []) {
  return posts.reduce((total, post) => (
    total + futuresTrader.parseAll(post.text || '').filter((signal) => signal.isSignal).length
  ), 0);
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

    if (requestUrl.pathname === '/api/telegram-source' && request.method === 'GET') {
      return sendJson(response, { telegramSource: configStore.getTelegramSource() });
    }

    if (requestUrl.pathname === '/api/telegram-source' && request.method === 'PUT') {
      const body = await readJson(request);
      if (body.enabled) {
        try {
          body.url = normalizeTelegramWebUrl(body.url);
        } catch (error) {
          return sendJson(response, { error: error.message }, 400);
        }
      }
      const telegramSource = await configStore.updateTelegramSource(body);
      scraper.updateTelegramSource(telegramSource);
      state.telegramWebUrl = telegramSource.url || state.telegramWebUrl;
      broadcast('telegramSource', { telegramSource });
      broadcast('state', state);
      return sendJson(response, { ok: true, telegramSource });
    }

    if (requestUrl.pathname === '/api/bingx' && request.method === 'GET') {
      const exchangePositions = await syncExchangePositions({ reason: 'api' }).catch((error) => {
        pushLog({ level: 'warn', message: `BingX posiciones: ${error.message}`, at: new Date().toISOString() });
        return exchangePositionsCache;
      });
      return sendJson(response, {
        bingx: configStore.getBingX(),
        trades: state.trades,
        paperTrades: paperStore.list(),
        exchangePositions,
        exchangeSafety: buildExchangeSafety(exchangePositions),
        exchangeOpenOrders: exchangeOpenOrdersCache,
        risk: futuresTrader.riskSnapshot()
      });
    }

    if (requestUrl.pathname === '/api/bingx/open-positions' && request.method === 'GET') {
      const positions = await syncExchangePositions({ reason: 'api' });
      return sendJson(response, { ok: true, positions, exchangeSafety: buildExchangeSafety(positions) });
    }

    if (requestUrl.pathname === '/api/bingx/emergency/close-all-real' && request.method === 'POST') {
      const body = await readJson(request);
      if (body.confirm !== 'CERRAR_TODO_REAL') {
        return sendJson(response, { error: 'Confirma CERRAR_TODO_REAL para cerrar todas las posiciones reales.' }, 400);
      }
      const result = await futuresTrader.emergencyCloseAllRealPositions({ closePercent: 100 });
      const event = {
        at: new Date().toISOString(),
        status: result.orders?.length ? 'live_emergency_close_all_sent' : 'live_emergency_close_all_no_position',
        reason: 'manual_emergency',
        executionMode: 'live',
        exchangeClose: result
      };
      recordTradeEvent(event);
      notifyTradeCriticalEvent(event);
      pnlCache = null;
      pnlSourcesCache = null;
      await syncExchangePositions({ reason: 'manual_emergency_close' }).catch(() => exchangePositionsCache);
      return sendJson(response, { ok: true, result, exchangeSafety: buildExchangeSafety() });
    }

    if (requestUrl.pathname === '/api/bingx/emergency/cancel-all-real' && request.method === 'POST') {
      const body = await readJson(request);
      if (body.confirm !== 'CANCELAR_ORDENES_REAL') {
        return sendJson(response, { error: 'Confirma CANCELAR_ORDENES_REAL para cancelar ordenes pendientes reales.' }, 400);
      }
      const result = await futuresTrader.cancelAllRealOpenOrders();
      const event = {
        at: new Date().toISOString(),
        status: result.canceled?.length ? 'live_emergency_cancel_orders_sent' : 'live_emergency_cancel_orders_empty',
        reason: 'manual_emergency',
        executionMode: 'live',
        exchangeCancel: result
      };
      recordTradeEvent(event);
      notifyTradeCriticalEvent(event);
      await syncExchangePositions({ reason: 'manual_emergency_cancel' }).catch(() => exchangePositionsCache);
      return sendJson(response, { ok: true, result, exchangeSafety: buildExchangeSafety() });
    }

    if (requestUrl.pathname === '/api/bingx' && request.method === 'PUT') {
      const body = await readJson(request);
      const previous = configStore.getBingX();
      const bingx = await configStore.updateBingX(body);
      pnlCache = null;
      pnlSourcesCache = null;
      broadcast('bingx', { bingx });
      notifyBingxPauseChange(previous, bingx);
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
      recordTradeEvent(event);
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
      if (usesLiveMode(bingx.mode) && body.confirm !== 'LIVE_MINIMA') {
        return sendJson(response, { error: 'Confirma LIVE_MINIMA para enviar una prueba real.' }, 400);
      }
      const result = await futuresTrader.executeProbe(body);
      pnlCache = null;
      return sendJson(response, { ok: true, result });
    }

    if (requestUrl.pathname === '/api/bingx/replay-latest-signal' && request.method === 'POST') {
      const body = await readJson(request);
      const bingx = configStore.getBingX();
      if (usesLiveMode(bingx.mode) && body.confirm !== 'REPLAY_LIVE') {
        return sendJson(response, { error: 'Confirma REPLAY_LIVE para reejecutar una senal en live.' }, 400);
      }

      const post = findReplayPost(body.postId);
      if (!post) {
        return sendJson(response, { error: 'No hay publicaciones con senales para reejecutar.' }, 404);
      }

      const results = await futuresTrader.processPosts([post], { phase: 'manual_replay' });
      pnlCache = null;
      pushLog({
        level: usesLiveMode(bingx.mode) ? 'warn' : 'info',
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

    if (requestUrl.pathname === '/api/bingx/pnl-sources' && request.method === 'GET') {
      if (pnlSourcesCache && Date.now() - pnlSourcesCache.at < 45000) {
        return sendJson(response, { ...pnlSourcesCache.payload, cached: true });
      }

      const bingx = configStore.getBingX();
      if (!bingx.apiKeyConfigured || !bingx.apiSecretConfigured) {
        const payload = {
          ok: true,
          month: currentMonthKey(),
          sources: {
            vst: emptyPnlSource('vst', 'Futuros VST', 'Demo VST', 'VST', 'Configura API BingX'),
            live: emptyPnlSource('live', 'Futuros reales', 'Live real', 'USDT', 'Configura API BingX')
          },
          positions: {
            vst: [],
            live: []
          }
        };
        pnlSourcesCache = { at: Date.now(), payload };
        return sendJson(response, payload);
      }

      const [vst, live] = await Promise.all([
        exchangePnlSource({ key: 'vst', mode: 'demo', label: 'Futuros VST', modeLabel: 'Demo VST', asset: 'VST' }),
        exchangePnlSource({ key: 'live', mode: 'live', label: 'Futuros reales', modeLabel: 'Live real', asset: 'USDT' })
      ]);

      const payload = {
        ok: true,
        month: currentMonthKey(),
        sources: {
          vst: vst.source,
          live: live.source
        },
        positions: {
          vst: vst.positions,
          live: live.positions
        }
      };
      pnlSourcesCache = { at: Date.now(), payload };
      return sendJson(response, payload);
    }

    if (requestUrl.pathname === '/api/risk' && request.method === 'GET') {
      return sendJson(response, {
        ok: true,
        risk: futuresTrader.riskSnapshot(),
        exchangeSafety: buildExchangeSafety(),
        bingx: configStore.getBingX()
      });
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

    if (requestUrl.pathname === '/api/trade-events' && request.method === 'GET') {
      const limit = Number(requestUrl.searchParams.get('limit') || 200);
      return sendJson(response, {
        ok: true,
        events: tradeEventStore.list(Math.min(Math.max(limit, 1), 1000))
      });
    }

    if (requestUrl.pathname === '/api/audit' && request.method === 'GET') {
      return sendJson(response, {
        ok: true,
        generatedAt: new Date().toISOString(),
        health: buildHealth(),
        risk: futuresTrader.riskSnapshot(),
        bingx: configStore.getBingX(),
        telegram: configStore.getTelegram(),
        telegramSource: configStore.getTelegramSource(),
        portfolio: configStore.getPortfolio(),
        exchangeSafety: buildExchangeSafety(),
        exchangePositions: exchangePositionsCache,
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

    if (requestUrl.pathname === '/api/browser/open-telegram' && request.method === 'POST') {
      const body = await readJson(request);
      const configured = configStore.getTelegramSource();
      let telegramUrl;
      try {
        telegramUrl = normalizeTelegramWebUrl(body.url || configured.url);
      } catch (error) {
        return sendJson(response, { error: error.message }, 400);
      }
      await scraper.openTelegram(telegramUrl);
      state.browserOpen = scraper.isBrowserOpen;
      state.telegramWebUrl = telegramUrl;
      broadcast('state', state);
      return sendJson(response, { ok: true, state: currentState(), url: telegramUrl });
    }

    if (requestUrl.pathname === '/api/scrape/start' && request.method === 'POST') {
      const body = await readJson(request);
      const result = await startScraperMonitor(body, { persistMonitor: true, reason: 'api' });
      if (!result.ok) {
        return sendJson(response, { error: result.error }, result.status || 400);
      }
      return sendJson(response, { ok: true, state: currentState() });
    }

    if (requestUrl.pathname === '/api/scrape/stop' && request.method === 'POST') {
      scraper.stop();
      await configStore.updateMonitor({ ...configStore.getMonitor(), autoResume: false });
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
  syncExchangePositions({ reason: 'startup' }).catch((error) => {
    pushLog({ level: 'warn', message: `BingX sync: ${error.message}`, at: new Date().toISOString() });
    syncPriceSubscriptions();
  });
  resumeMonitorOnStartup().catch((error) => {
    pushLog({ level: 'error', message: `Auto-resume monitor: ${error.message}`, at: new Date().toISOString() });
  });
});

setInterval(() => {
  checkHealth().catch((error) => {
    pushLog({ level: 'error', message: `Health: ${error.message}`, at: new Date().toISOString() });
  });
}, 30000).unref();

setInterval(() => {
  syncExchangePositions({ reason: 'poll' }).catch((error) => {
    pushLog({ level: 'warn', message: `BingX sync: ${error.message}`, at: new Date().toISOString() });
  });
}, EXCHANGE_SYNC_POLL_MS).unref();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function resumeMonitorOnStartup() {
  const monitor = configStore.getMonitor();
  if (!monitor.autoResume || !monitor.live) {
    return;
  }

  const result = await startScraperMonitor({
    channelUrl: monitor.channelUrl,
    backfill: false,
    live: true,
    pollIntervalSeconds: monitor.pollIntervalSeconds,
    maxScrolls: monitor.maxScrolls
  }, { persistMonitor: false, reason: 'startup' });

  if (!result.ok) {
    state.lastError = result.error;
    pushLog({
      level: 'error',
      message: `Auto-resume monitor: ${result.error}`,
      at: new Date().toISOString()
    });
    return;
  }

  pushLog({
    level: 'info',
    message: 'Monitor live rearmado automaticamente al arrancar.',
    at: new Date().toISOString()
  });
}

async function startScraperMonitor(input = {}, { persistMonitor = false } = {}) {
  if (scraper.running) {
    return { ok: false, status: 409, error: 'Ya hay un scrapeo en curso.' };
  }

  if (!input.backfill && !input.live) {
    return { ok: false, status: 400, error: 'Activa posts pasados, monitor continuo o ambos.' };
  }

  let normalizedUrl;
  try {
    normalizedUrl = normalizePostsUrl(input.channelUrl);
  } catch (error) {
    return { ok: false, status: 400, error: error.message };
  }

  let telegramSource = configStore.getTelegramSource();
  if (input.telegramSource) {
    telegramSource = await configStore.updateTelegramSource(input.telegramSource);
  }
  if (telegramSource.enabled) {
    try {
      telegramSource = {
        ...telegramSource,
        url: normalizeTelegramWebUrl(telegramSource.url)
      };
    } catch (error) {
      return { ok: false, status: 400, error: error.message };
    }
  }

  const pollIntervalSeconds = Number(input.pollIntervalSeconds) || 30;
  const maxScrolls = Number(input.maxScrolls) || 120;
  const backfill = Boolean(input.backfill);
  const live = Boolean(input.live);

  if (persistMonitor) {
    await configStore.updateMonitor({
      autoResume: live,
      channelUrl: normalizedUrl,
      backfill: false,
      live,
      pollIntervalSeconds,
      maxScrolls
    });
  }

  state.lastError = null;
  state.running = true;
  state.phase = backfill ? 'backfill' : 'live';
  state.channelUrl = normalizedUrl;
  state.telegramWebUrl = telegramSource.url || '';
  state.currentScroll = 0;
  state.maxScrolls = maxScrolls;
  broadcast('state', state);

  scraper.start({
    channelUrl: normalizedUrl,
    backfill,
    live,
    pollIntervalSeconds,
    maxScrolls,
    telegramSource
  }).catch((error) => {
    state.running = false;
    state.phase = 'idle';
    state.lastError = error.message;
    pushLog({ level: 'error', message: error.message, at: new Date().toISOString() });
    broadcast('state', state);
  });

  return { ok: true };
}

function currentState() {
  state.health = buildHealth();
  state.priceFeed = priceFeed.status();
  return {
    ...state,
    browserOpen: scraper.isBrowserOpen,
    running: scraper.running,
    monitor: configStore.getMonitor(),
    telegramSource: configStore.getTelegramSource(),
    portfolio: configStore.getPortfolio(),
    exchangeSafety: buildExchangeSafety(),
    stats: store.stats()
  };
}

function syncPriceSubscriptions(exchangePositionsOrSymbols) {
  if (Array.isArray(exchangePositionsOrSymbols)) {
    exchangeOpenSymbols = new Set(exchangePositionsOrSymbols.map(positionSymbol).filter(Boolean));
  }
  priceFeed.setSymbols([...paperStore.openSymbols(), ...exchangeOpenSymbols]);
  state.priceFeed = priceFeed.status();
}

async function syncExchangePositions({ reason = 'poll' } = {}) {
  if (exchangeSyncInFlight) {
    return exchangePositionsCache;
  }

  if (
    ['api', 'poll'].includes(reason)
    && lastExchangeSyncAt
    && Date.now() - lastExchangeSyncAt < EXCHANGE_SYNC_MIN_INTERVAL_MS
  ) {
    return exchangePositionsCache;
  }

  const config = configStore.getBingX();
  if (!config.enabled || config.mode === 'test' || !config.apiKeyConfigured || !config.apiSecretConfigured) {
    const previous = exchangePositionsCache;
    exchangePositionsCache = [];
    syncPriceSubscriptions(exchangePositionsCache);
    if (previous.length) {
      broadcast('exchangePositions', {
        positions: exchangePositionsCache,
        closedPositions: previous,
        exchangeSafety: buildExchangeSafety(exchangePositionsCache),
        reason
      });
    }
    return exchangePositionsCache;
  }

  exchangeSyncInFlight = true;
  try {
    const expectedSources = new Set(exchangeSourcesForMode(config.mode));
    const previous = exchangePositionsCache.filter((position) => expectedSources.has(position.source));
    const sourceChanged = exchangePositionsCache.some((position) => position.source && !expectedSources.has(position.source));
    if (sourceChanged) {
      pendingExchangeClosures.clear();
    }
    const next = await futuresTrader.getExchangeOpenPositions();
    await syncExchangeAccountState(config).catch((error) => {
      pushLog({ level: 'warn', message: `BingX cuenta: ${error.message}`, at: new Date().toISOString() });
    });
    lastExchangeSyncAt = Date.now();
    lastExchangeSyncReason = reason;
    const closedCandidates = sourceChanged ? [] : detectClosedExchangePositions(previous, next);
    const partialPositions = sourceChanged ? [] : detectPartialExchangePositions(previous, next);
    const closedPositions = confirmClosedExchangePositions(closedCandidates, next, reason);
    const visibleNext = mergeUnconfirmedExchangePositions(next, closedCandidates, closedPositions, reason);
    exchangePositionsCache = visibleNext;
    syncPriceSubscriptions(visibleNext);
    evaluateExchangeSafety(visibleNext, reason).catch((error) => {
      pushLog({ level: 'error', message: `BingX safety: ${error.message}`, at: new Date().toISOString() });
    });

    if (reason !== 'poll' || sourceChanged || closedPositions.length || partialPositions.length || positionsChanged(previous, visibleNext)) {
      broadcast('exchangePositions', {
        positions: visibleNext,
        closedPositions,
        partialPositions,
        exchangeSafety: buildExchangeSafety(visibleNext),
        reason
      });
    }

    for (const position of closedPositions) {
      handleExchangeClosedPosition(position, reason);
    }
    for (const position of partialPositions) {
      handleExchangePartialPosition(position, reason);
    }

    return exchangePositionsCache;
  } finally {
    exchangeSyncInFlight = false;
  }
}

function detectClosedExchangePositions(previous, next) {
  const openKeys = new Set(next.map(exchangePositionIdentityKey));
  return previous.filter((position) => !openKeys.has(exchangePositionIdentityKey(position)));
}

function detectPartialExchangePositions(previous, next) {
  const previousByKey = new Map(previous.map((position) => [exchangePositionIdentityKey(position), position]));
  return next
    .map((position) => {
      const before = previousByKey.get(exchangePositionIdentityKey(position));
      const beforeQuantity = Number(before?.quantity || 0);
      const afterQuantity = Number(position.quantity || 0);
      if (!before || !Number.isFinite(beforeQuantity) || !Number.isFinite(afterQuantity) || afterQuantity >= beforeQuantity || afterQuantity <= 0) {
        return null;
      }
      return {
        ...position,
        previousQuantity: beforeQuantity,
        closedQuantity: roundMoney(beforeQuantity - afterQuantity),
        partialPercent: beforeQuantity > 0 ? roundMoney(((beforeQuantity - afterQuantity) / beforeQuantity) * 100) : null
      };
    })
    .filter(Boolean);
}

function mergeUnconfirmedExchangePositions(next, candidates, confirmed, reason) {
  if (reason !== 'poll' || !candidates.length) {
    return next;
  }

  const confirmedKeys = new Set(confirmed.map(exchangePositionIdentityKey));
  const openKeys = new Set(next.map(exchangePositionIdentityKey));
  const merged = [...next];
  for (const candidate of candidates) {
    const key = exchangePositionIdentityKey(candidate);
    if (!confirmedKeys.has(key) && !openKeys.has(key)) {
      merged.push(candidate);
      openKeys.add(key);
    }
  }

  return merged;
}

function confirmClosedExchangePositions(candidates, next, reason) {
  const now = Date.now();
  const openKeys = new Set(next.map(exchangePositionIdentityKey));
  for (const key of pendingExchangeClosures.keys()) {
    if (openKeys.has(key)) {
      pendingExchangeClosures.delete(key);
    }
  }

  if (String(reason || '').includes('close')) {
    for (const candidate of candidates) {
      pendingExchangeClosures.delete(exchangePositionIdentityKey(candidate));
    }
    return candidates;
  }

  if (reason !== 'poll') {
    return candidates;
  }

  const confirmed = [];
  const candidateKeys = new Set();
  for (const candidate of candidates) {
    const key = exchangePositionIdentityKey(candidate);
    candidateKeys.add(key);
    const pending = pendingExchangeClosures.get(key);
    const misses = Number(pending?.misses || 0) + 1;
    const firstMissingAt = Number(pending?.firstMissingAt || now);
    if (misses >= 2 && now - firstMissingAt >= 4000) {
      confirmed.push(pending?.position || candidate);
      pendingExchangeClosures.delete(key);
      continue;
    }

    pendingExchangeClosures.set(key, {
      firstMissingAt,
      misses,
      position: pending?.position || candidate
    });
  }

  for (const [key, pending] of pendingExchangeClosures.entries()) {
    if (openKeys.has(key) || candidateKeys.has(key)) {
      continue;
    }

    const misses = Number(pending.misses || 0) + 1;
    if (misses >= 2 && now - Number(pending.firstMissingAt || now) >= 4000) {
      confirmed.push(pending.position);
      pendingExchangeClosures.delete(key);
      continue;
    }

    pendingExchangeClosures.set(key, {
      ...pending,
      misses
    });
  }

  return confirmed;
}

function positionsChanged(previous, next) {
  if (previous.length !== next.length) {
    return true;
  }
  const previousKeys = previous.map(exchangePositionKey).sort().join('|');
  const nextKeys = next.map(exchangePositionKey).sort().join('|');
  return previousKeys !== nextKeys;
}

function exchangePositionKey(position) {
  return [
    position.id,
    position.symbol,
    position.direction,
    position.raw?.positionId,
    position.raw?.positionID
  ].filter(Boolean).join(':');
}

function exchangePositionIdentityKey(position) {
  return [
    position.source,
    position.symbol,
    position.direction
  ].filter(Boolean).join(':');
}

function exchangeSourcesForMode(mode) {
  if (mode === 'dual') {
    return ['demo', 'live'];
  }
  return [mode === 'demo' ? 'demo' : 'live'];
}

async function syncExchangeAccountState(config = configStore.getBingX()) {
  if (!config.enabled || config.mode === 'test' || !config.apiKeyConfigured || !config.apiSecretConfigured) {
    exchangeBalancesCache = {};
    exchangeOpenOrdersCache = [];
    return;
  }

  const modes = exchangeSourcesForMode(config.mode);
  const [balances, openOrders] = await Promise.all([
    Promise.allSettled(modes.map((mode) => futuresTrader.getExchangeBalance({ mode: mode === 'demo' ? 'demo' : 'live' }))),
    futuresTrader.getExchangeOpenOrders({ mode: config.mode })
  ]);

  exchangeBalancesCache = {};
  balances.forEach((result, index) => {
    const mode = modes[index];
    exchangeBalancesCache[mode] = result.status === 'fulfilled' ? result.value : null;
  });
  exchangeOpenOrdersCache = openOrders;
}

function buildExchangeSafety(inputPositions = exchangePositionsCache) {
  const config = configStore.getBingX();
  const credentialsOk = Boolean(config.apiKeyConfigured && config.apiSecretConfigured);
  const exchangeEnabled = Boolean(config.enabled && config.mode !== 'test' && credentialsOk);
  const positions = Array.isArray(inputPositions) ? inputPositions : [];
  const livePositions = positions.filter((position) => position.source === 'live' && position.status === 'open');
  const demoPositions = positions.filter((position) => position.source === 'demo' && position.status === 'open');
  const liveWithoutStopLoss = livePositions.filter((position) => !hasStopLossProtection(position));
  const liveWithoutTakeProfit = livePositions.filter((position) => !hasTakeProfitProtection(position));
  const demoWithoutStopLoss = demoPositions.filter((position) => !hasStopLossProtection(position));
  const liveOrders = exchangeOpenOrdersCache.filter((order) => order.source === 'live');
  const demoOrders = exchangeOpenOrdersCache.filter((order) => order.source === 'demo');
  const liveOrphanOrders = orphanProtectiveOrders(liveOrders, livePositions);
  const demoOrphanOrders = orphanProtectiveOrders(demoOrders, demoPositions);
  const ageMs = lastExchangeSyncAt ? Date.now() - lastExchangeSyncAt : null;
  const stale = exchangeEnabled && (ageMs === null || ageMs > EXCHANGE_SYNC_STALE_MS);
  const missingRequiredStops = Boolean(config.requireStopLoss && usesLiveMode(config.mode) && liveWithoutStopLoss.length);
  const orphanRequired = Boolean(usesLiveMode(config.mode) && liveOrphanOrders.length);
  const level = !exchangeEnabled
    ? 'idle'
    : stale || missingRequiredStops || orphanRequired ? 'warn' : 'ok';

  return {
    level,
    mode: config.mode,
    enabled: exchangeEnabled,
    liveArmed: usesLiveMode(config.mode) && Boolean(config.liveConfirmed),
    lastSyncAt: lastExchangeSyncAt ? new Date(lastExchangeSyncAt).toISOString() : null,
    lastSyncReason: lastExchangeSyncReason,
    ageSeconds: ageMs === null ? null : Math.max(0, Math.round(ageMs / 1000)),
    stale,
    staleAfterSeconds: Math.round(EXCHANGE_SYNC_STALE_MS / 1000),
    real: exchangeSafetySummary(livePositions, liveWithoutStopLoss, liveWithoutTakeProfit, liveOrders, liveOrphanOrders, exchangeBalancesCache.live, 'USDT'),
    demo: exchangeSafetySummary(demoPositions, demoWithoutStopLoss, [], demoOrders, demoOrphanOrders, exchangeBalancesCache.demo, 'VST'),
    checks: [
      {
        key: 'exchange-sync',
        label: 'Reconciliacion BingX',
        ok: exchangeEnabled && !stale,
        detail: exchangeEnabled
          ? (ageMs === null ? 'sin lectura' : `${Math.max(0, Math.round(ageMs / 1000))}s`)
          : 'sin exchange activo'
      },
      {
        key: 'live-armed',
        label: 'Live real armado',
        ok: !usesLiveMode(config.mode) || Boolean(config.liveConfirmed),
        detail: usesLiveMode(config.mode) ? (config.liveConfirmed ? 'confirmado' : 'pendiente') : 'no aplica'
      },
      {
        key: 'live-stop-loss',
        label: 'SL real confirmado',
        ok: !config.requireStopLoss || !liveWithoutStopLoss.length,
        detail: `${Math.max(0, livePositions.length - liveWithoutStopLoss.length)}/${livePositions.length}`
      },
      {
        key: 'live-take-profit',
        label: 'TP real detectado',
        ok: !livePositions.length || !liveWithoutTakeProfit.length,
        detail: `${Math.max(0, livePositions.length - liveWithoutTakeProfit.length)}/${livePositions.length}`
      },
      {
        key: 'orphan-orders',
        label: 'Ordenes huerfanas',
        ok: !liveOrphanOrders.length,
        detail: String(liveOrphanOrders.length)
      },
      {
        key: 'duplicate-guard',
        label: 'Anti-duplicados',
        ok: true,
        detail: `${Math.round(DUPLICATE_SIGNAL_WINDOW_MS / (60 * 60 * 1000))}h`
      }
    ]
  };
}

function exchangeSafetySummary(positions, withoutStopLoss, withoutTakeProfit, openOrders, orphanOrders, balance, asset) {
  return {
    asset,
    balance: balanceSummaryForSafety(balance),
    openPositions: positions.length,
    protectedStopLoss: Math.max(0, positions.length - withoutStopLoss.length),
    protectedTakeProfit: Math.max(0, positions.length - withoutTakeProfit.length),
    missingStopLoss: withoutStopLoss.length,
    missingTakeProfit: withoutTakeProfit.length,
    openOrders: openOrders.length,
    orphanOrders: orphanOrders.length,
    nearestLiquidation: nearestLiquidationSummary(positions),
    exposure: roundMoney(positions.reduce((sum, position) => (
      sum + Number(position.exposure || position.notional || 0)
    ), 0)),
    floatingPnl: roundMoney(positions.reduce((sum, position) => (
      sum + Number(position.unrealizedPnl ?? position.paperPnl ?? 0)
    ), 0)),
    withoutStopLoss: withoutStopLoss.map(publicExchangeSafetyPosition),
    withoutTakeProfit: withoutTakeProfit.map(publicExchangeSafetyPosition),
    orphanOrderItems: orphanOrders.map(publicOpenOrder)
  };
}

function balanceSummaryForSafety(balance) {
  if (!balance) {
    return null;
  }
  const equity = Number(balance.equity || 0);
  const usedMargin = Number(balance.usedMargin || 0);
  return {
    asset: balance.asset || 'USDT',
    balance: roundMoney(balance.balance || 0),
    equity: roundMoney(equity),
    availableMargin: roundMoney(balance.availableMargin || 0),
    usedMargin: roundMoney(usedMargin),
    frozenMargin: roundMoney(balance.frozenMargin || 0),
    marginUsagePercent: equity > 0 ? roundMoney((usedMargin / equity) * 100) : 0,
    unrealizedProfit: roundMoney(balance.unrealizedProfit || 0)
  };
}

function nearestLiquidationSummary(positions = []) {
  const items = positions
    .map((position) => {
      const liquidation = Number(position.raw?.liquidationPrice || position.liquidationPrice || 0);
      const price = Number(position.currentPrice || 0);
      if (!Number.isFinite(liquidation) || !Number.isFinite(price) || liquidation <= 0 || price <= 0) {
        return null;
      }
      return {
        symbol: position.symbol,
        direction: position.direction,
        liquidationPrice: liquidation,
        currentPrice: price,
        distancePercent: roundMoney(Math.abs(price - liquidation) / price * 100)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distancePercent - right.distancePercent);
  return items[0] || null;
}

function publicExchangeSafetyPosition(position) {
  return {
    id: position.id,
    source: position.source,
    symbol: position.symbol,
    direction: position.direction,
    entryPrice: position.entryPrice,
    currentPrice: position.currentPrice,
    unrealizedPnl: position.unrealizedPnl,
    exposure: position.exposure || position.notional || 0
  };
}

function orphanProtectiveOrders(openOrders = [], positions = []) {
  return openOrders.filter((order) => (
    isProtectiveOrder(order)
    && !positions.some((position) => (
      normalizePositionSymbol(position.symbol) === normalizePositionSymbol(order.symbol)
      && (!order.positionSide || String(order.positionSide).toUpperCase() === String(position.direction || '').toUpperCase())
    ))
  ));
}

function isProtectiveOrder(order = {}) {
  const type = String(order.type || '').toUpperCase();
  return type.includes('STOP') || type.includes('TAKE_PROFIT');
}

function publicOpenOrder(order = {}) {
  return {
    orderId: order.orderId,
    clientOrderId: order.clientOrderId,
    source: order.source,
    symbol: order.symbol,
    side: order.side,
    positionSide: order.positionSide,
    type: order.type,
    status: order.status,
    stopPrice: order.stopPrice,
    quantity: order.quantity
  };
}

function normalizePositionSymbol(value) {
  return String(value || '').toUpperCase().replace('/', '-');
}

function hasStopLossProtection(position = {}) {
  return Number(position.stopLoss || 0) > 0
    || (Array.isArray(position.protectiveOrders) && position.protectiveOrders.some((order) => (
      String(order.type || '').toUpperCase().includes('STOP')
      && !String(order.type || '').toUpperCase().includes('TAKE_PROFIT')
      && Number(order.stopPrice || 0) > 0
    )));
}

function hasTakeProfitProtection(position = {}) {
  return Number(position.takeProfit || 0) > 0
    || (Array.isArray(position.protectiveOrders) && position.protectiveOrders.some((order) => (
      String(order.type || '').toUpperCase().includes('TAKE_PROFIT')
      && Number(order.stopPrice || 0) > 0
    )));
}

async function evaluateExchangeSafety(positions = exchangePositionsCache, reason = 'poll') {
  const config = configStore.getBingX();
  if (!usesLiveMode(config.mode)) {
    return;
  }

  const missing = positions
    .filter((position) => position.source === 'live' && position.status === 'open')
    .filter((position) => !hasStopLossProtection(position));
  const liveOrders = exchangeOpenOrdersCache.filter((order) => order.source === 'live');
  const orphanOrders = orphanProtectiveOrders(liveOrders, positions.filter((position) => position.source === 'live' && position.status === 'open'));
  if (config.requireStopLoss) {
    await alertMissingLiveStops(missing, reason);
  }
  await alertOrphanLiveOrders(orphanOrders, reason);
}

async function alertMissingLiveStops(missing, reason) {
  if (!missing.length) {
    return;
  }
  const key = `missing-live-sl:${missing.map((position) => `${position.symbol}:${position.direction}`).sort().join('|')}`;
  const now = Date.now();
  if (now - Number(exchangeSafetyAlerts.get(key) || 0) < EXCHANGE_SAFETY_ALERT_COOLDOWN_MS) {
    return;
  }
  exchangeSafetyAlerts.set(key, now);

  const details = [
    `${missing.length} posicion(es) reales sin SL confirmado.`,
    `Sync: ${reason}`,
    ...missing.map((position) => (
      `${position.symbol} ${position.direction || ''} entrada ${position.entryPrice || '-'} actual ${position.currentPrice || '-'}`
    ))
  ].join('\n');

  pushLog({
    level: 'warn',
    message: `BingX real sin SL confirmado: ${missing.map((position) => position.symbol).join(', ')}.`,
    at: new Date().toISOString()
  });

  await telegramNotifier.sendAlert('Riesgo BingX real', details)
    .then((result) => {
      if (result.sent) {
        pushLog({ level: 'warn', message: 'Alerta de riesgo real enviada por Telegram.', at: new Date().toISOString() });
      }
    });
}

async function alertOrphanLiveOrders(orphanOrders, reason) {
  if (!orphanOrders.length) {
    return;
  }
  const key = `orphan-live-orders:${orphanOrders.map((order) => `${order.symbol}:${order.orderId || order.clientOrderId}`).sort().join('|')}`;
  const now = Date.now();
  if (now - Number(exchangeSafetyAlerts.get(key) || 0) < EXCHANGE_SAFETY_ALERT_COOLDOWN_MS) {
    return;
  }
  exchangeSafetyAlerts.set(key, now);
  const details = [
    `${orphanOrders.length} orden(es) protectoras reales sin posicion asociada.`,
    `Sync: ${reason}`,
    ...orphanOrders.map((order) => `${order.symbol} ${order.type || ''} ${order.stopPrice || ''}`.trim())
  ].join('\n');
  pushLog({
    level: 'warn',
    message: `BingX real con ordenes huerfanas: ${orphanOrders.map((order) => order.symbol).join(', ')}.`,
    at: new Date().toISOString()
  });
  await telegramNotifier.sendAlert('Descuadre BingX real', details).catch((error) => {
    pushLog({ level: 'error', message: `Telegram BingX orphan: ${error.message}`, at: new Date().toISOString() });
  });
}

function usesLiveMode(mode) {
  return mode === 'live' || mode === 'dual';
}

function notifyTradeExecutionError(event) {
  if (event?.status !== 'error') {
    return;
  }

  const mode = event.executionMode === 'demo'
    ? 'VST demo'
    : event.executionMode === 'live'
      ? 'Real'
      : event.executionMode || 'BingX';
  const details = [
    `${mode} ${event.signal?.symbol || 'senal'}`.trim(),
    event.signal?.direction ? `Lado: ${event.signal.direction}` : '',
    event.reason ? `Error: ${event.reason}` : '',
    event.postUrl ? `Post: ${event.postUrl}` : ''
  ].filter(Boolean).join('\n');

  telegramNotifier.sendAlert('Error orden BingX', details)
    .then((result) => {
      if (result.sent) {
        pushLog({ level: 'warn', message: 'Error de orden BingX enviado por Telegram.', at: new Date().toISOString() });
      }
    })
    .catch((error) => {
      pushLog({ level: 'error', message: `Telegram BingX order error: ${error.message}`, at: new Date().toISOString() });
    });
}

function notifyTradeCriticalEvent(event = {}) {
  notifyTradeExecutionError(event);
  if (!isLiveCriticalEvent(event)) {
    return;
  }

  const title = criticalTradeTitle(event);
  const details = [
    event.signal?.symbol ? `${event.signal.symbol} ${event.signal.direction || event.signal.action || ''}`.trim() : '',
    event.status ? `Estado: ${event.status}` : '',
    event.sizing?.notional ? `Orden: ${formatSigned(event.sizing.notional).replace('+', '')} ${event.sizing.asset || 'USDT'}` : '',
    event.takeProfit ? `TP: ${event.takeProfit}` : '',
    event.stopLoss ? `SL: ${event.stopLoss}` : '',
    event.closePercent ? `Cierre: ${event.closePercent}%` : '',
    event.reason ? `Motivo: ${event.reason}` : '',
    event.postUrl ? `Post: ${event.postUrl}` : ''
  ].filter(Boolean).join('\n');

  telegramNotifier.sendAlert(title, details || event.status)
    .then((result) => {
      if (result.sent) {
        pushLog({ level: 'warn', message: `${title} enviado por Telegram.`, at: new Date().toISOString() });
      }
    })
    .catch((error) => {
      pushLog({ level: 'error', message: `Telegram critical trade: ${error.message}`, at: new Date().toISOString() });
    });
}

function isLiveCriticalEvent(event = {}) {
  const status = String(event.status || '');
  return event.executionMode === 'live'
    || status.startsWith('live_')
    || event.exchangePosition?.source === 'live';
}

function criticalTradeTitle(event = {}) {
  const status = String(event.status || '');
  if (status === 'live_order_sent') {
    return 'Orden real enviada';
  }
  if (status === 'live_tp_sent') {
    return 'TP real colocado';
  }
  if (status === 'live_sl_sent') {
    return 'SL real colocado';
  }
  if (status.includes('close_all')) {
    return 'Cierre total real';
  }
  if (status.includes('cancel_orders')) {
    return 'Ordenes reales canceladas';
  }
  if (status.includes('close')) {
    return 'Cierre real enviado';
  }
  return 'Evento critico real';
}

function notifyBingxPauseChange(previous = {}, next = {}) {
  const changes = [];
  if (!previous.entriesPaused && next.entriesPaused) {
    changes.push('Entradas pausadas');
  }
  if (previous.entriesPaused && !next.entriesPaused) {
    changes.push('Entradas reactivadas');
  }
  if (!previous.managementOnly && next.managementOnly) {
    changes.push('Solo gestion de cierres/SL/TP');
  }
  if (previous.managementOnly && !next.managementOnly) {
    changes.push('Gestion normal reactivada');
  }
  if (!changes.length) {
    return;
  }
  telegramNotifier.sendAlert('Bot BingX actualizado', changes.join('\n'))
    .catch((error) => {
      pushLog({ level: 'error', message: `Telegram BingX pause: ${error.message}`, at: new Date().toISOString() });
    });
}

function handleExchangeClosedPosition(position, reason) {
  const asset = position.source === 'demo' ? 'VST' : 'USDT';
  const event = {
    at: new Date().toISOString(),
    status: exchangeCloseStatus(position, reason),
    reason,
    signal: {
      symbol: position.symbol,
      direction: position.direction
    },
    exchangePosition: {
      ...position,
      status: 'closed'
    }
  };
  recordTradeEvent(event);
  pushLog({
    level: 'warn',
    message: `BingX cerro ${position.symbol} ${position.direction || ''}.`,
    at: event.at
  });
  telegramNotifier.sendAlert(
    exchangeCloseTitle(event.status),
    [
      `${position.symbol} ${position.direction || ''}`.trim(),
      `Entrada: ${formatSigned(position.entryPrice || 0).replace('+', '')}`,
      position.stopLoss ? `Stop: ${position.stopLoss}` : '',
      position.currentPrice ? `Ultimo precio: ${position.currentPrice}` : '',
      position.unrealizedPnl ? `PnL previo: ${formatSigned(position.unrealizedPnl)} ${asset}` : ''
    ].filter(Boolean).join('\n')
  ).catch((error) => {
    pushLog({ level: 'error', message: `Telegram BingX close: ${error.message}`, at: new Date().toISOString() });
  });
}

function handleExchangePartialPosition(position, reason) {
  const event = {
    at: new Date().toISOString(),
    status: 'exchange_position_partial',
    reason,
    signal: {
      symbol: position.symbol,
      direction: position.direction
    },
    exchangePosition: position
  };
  recordTradeEvent(event);
  pushLog({
    level: 'warn',
    message: `BingX parcial ${position.symbol}: ${position.closedQuantity || '?'} cerrados.`,
    at: event.at
  });
  if (position.source === 'live') {
    telegramNotifier.sendAlert(
      'Cierre parcial real detectado',
      [
        `${position.symbol} ${position.direction || ''}`.trim(),
        `Cerrado aprox: ${position.closedQuantity || '-'}`,
        position.partialPercent ? `${position.partialPercent}%` : '',
        `Queda: ${position.quantity || '-'}`
      ].filter(Boolean).join('\n')
    ).catch((error) => {
      pushLog({ level: 'error', message: `Telegram BingX partial: ${error.message}`, at: new Date().toISOString() });
    });
  }
}

function exchangeCloseStatus(position, reason) {
  if (String(reason || '').includes('close')) {
    return 'exchange_signal_closed';
  }
  const price = Number(position.currentPrice);
  const stop = Number(position.stopLoss);
  if (!Number.isFinite(price) || !Number.isFinite(stop) || stop <= 0) {
    return 'exchange_position_closed';
  }
  if (position.direction === 'SHORT') {
    return price >= stop ? 'exchange_stop_closed' : 'exchange_position_closed';
  }
  return price <= stop ? 'exchange_stop_closed' : 'exchange_position_closed';
}

function exchangeCloseTitle(status) {
  return {
    exchange_stop_closed: 'Stop cerrado en BingX',
    exchange_signal_closed: 'Cierre ejecutado en BingX',
    exchange_position_closed: 'Posicion cerrada en BingX'
  }[status] || 'Posicion cerrada en BingX';
}

async function handlePriceTick(tick) {
  const result = await paperStore.applyMarketPrice({
    symbol: tick.symbol,
    price: tick.price,
    source: tick.source || 'bingx_ws'
  });

  const now = Date.now();
  const last = lastPriceBroadcast.get(tick.symbol) || 0;
  if (result.closed.length || now - last > 750) {
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
    recordTradeEvent(event);
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

function recordTradeEvent(event) {
  const storedEvent = {
    ...event,
    auditSnapshot: event.auditSnapshot || {
      health: buildHealth(),
      exchangeSafety: buildExchangeSafety(),
      mode: configStore.getBingX().mode,
      capturedAt: new Date().toISOString()
    }
  };
  state.trades.unshift(storedEvent);
  state.trades = state.trades.slice(0, 200);
  tradeEventStore.append(storedEvent).catch((error) => {
    pushLog({ level: 'error', message: `Trade event store: ${error.message}`, at: new Date().toISOString() });
  });
  broadcast('trade', storedEvent);
}

function positionSymbol(value) {
  if (typeof value === 'string') {
    return value;
  }
  return value?.symbol || value?.signal?.symbol || '';
}

function buildHealth() {
  const telegram = configStore.getTelegram();
  const staleMs = Math.max(1, Number(telegram.healthStaleMinutes || 3)) * 60 * 1000;
  const lastRunTime = state.lastRunAt ? Date.parse(state.lastRunAt) : NaN;
  const ageMs = Number.isFinite(lastRunTime) && lastRunTime > 0 ? Date.now() - lastRunTime : null;
  const stale = scraper.running && state.phase === 'live' && ageMs !== null && ageMs > staleMs;
  const noVisiblePosts = scraper.running && state.phase === 'live' && Number(state.visiblePosts || 0) === 0;
  const lastError = state.lastError || null;
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
  const now = Date.now();
  const health = buildHealth();
  state.health = health;
  broadcast('state', state);
  if (health.level !== 'warn') {
    noVisiblePostsStartedAt = 0;
    return;
  }

  if (health.noVisiblePosts) {
    noVisiblePostsStartedAt ||= now;
  } else {
    noVisiblePostsStartedAt = 0;
  }

  const noVisiblePostsSeconds = noVisiblePostsStartedAt
    ? Math.round((now - noVisiblePostsStartedAt) / 1000)
    : 0;
  const onlyNoVisiblePosts = health.noVisiblePosts && !health.stale && !health.lastError;
  if (onlyNoVisiblePosts && noVisiblePostsSeconds < Math.round(NO_VISIBLE_POSTS_ALERT_GRACE_MS / 1000)) {
    return;
  }

  const key = [
    health.stale ? 'stale' : '',
    health.noVisiblePosts ? 'no_posts' : '',
    health.lastError || ''
  ].filter(Boolean).join('|');
  if (!key) {
    return;
  }
  if (key === lastHealthAlertKey && now - lastHealthAlertAt < HEALTH_ALERT_COOLDOWN_MS) {
    return;
  }
  if (key !== lastHealthAlertKey && now - lastHealthAlertAt < HEALTH_ALERT_COOLDOWN_MS) {
    return;
  }

  lastHealthAlertKey = key;
  lastHealthAlertAt = now;
  const details = [
    health.stale ? `Ultima lectura hace ${health.ageSeconds}s.` : '',
    health.noVisiblePosts ? `YouTube no esta devolviendo posts visibles desde hace ${Math.max(1, noVisiblePostsSeconds)}s.` : '',
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

async function exchangePnlSource({ key, mode, label, modeLabel, asset }) {
  const [pnlResult, positionsResult] = await Promise.allSettled([
    futuresTrader.getMonthlyPnl({ months: 3, mode, includePaper: false }),
    Promise.all([
      futuresTrader.getExchangeOpenPositions({ mode }),
      futuresTrader.getExchangeBalance({ mode })
    ])
  ]);
  const pnl = pnlResult.status === 'fulfilled' ? pnlResult.value : null;
  const [positions, balance] = positionsResult.status === 'fulfilled' ? positionsResult.value : [[], null];
  const error = [pnlResult, positionsResult]
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message || String(result.reason))
    .filter(Boolean)
    .join(' · ');

  if (!pnl && !positions.length) {
    const fallback = fallbackPnlSourceFromBalance({ key, mode, label, modeLabel, asset, balance, error });
    if (fallback) {
      return {
        source: fallback,
        positions
      };
    }
    return {
      source: emptyPnlSource(key, label, modeLabel, asset, sourceErrorStatus(error)),
      positions: []
    };
  }

  return {
    source: summarizeExchangePnlSource({ key, mode, label, modeLabel, asset, pnl, positions, balance, error }),
    positions
  };
}

function summarizeExchangePnlSource({ key, mode, label, modeLabel, asset, pnl, positions = [], balance = null, error = '' }) {
  const month = currentMonthKey();
  const rows = (pnl?.months || []).filter((row) => row.month === month);
  const income = summarizePnlRows(rows);
  const open = positions.filter((position) => position.status === 'open');
  const floating = roundMoney(open.reduce((sum, position) => (
    sum + Number(position.unrealizedPnl ?? position.paperPnl ?? 0)
  ), 0));
  const exposure = roundMoney(open.reduce((sum, position) => (
    sum + Number(position.exposure || position.notional || 0)
  ), 0));
  const realizedNet = Number(income.total || 0);
  const realizedTrades = (pnl?.recent || [])
    .filter((record) => record.month === month && String(record.incomeType).toUpperCase() === 'REALIZED_PNL');
  const winners = realizedTrades.filter((record) => Number(record.income || 0) > 0).length;

  return {
    key,
    label,
    modeLabel,
    month,
    asset,
    available: true,
    status: sourceStatusText({ open, realizedTrades, error }),
    error: error ? sourceErrorStatus(error) : '',
    total: roundMoney(realizedNet + floating),
    realized: roundMoney(realizedNet),
    grossRealized: roundMoney(income.realized || 0),
    floating,
    fees: roundMoney(income.fees || 0),
    funding: roundMoney(income.funding || 0),
    exposure,
    openPositions: open.length,
    closedTrades: Number(income.closedTrades || 0),
    records: Number(income.records || 0),
    winRate: realizedTrades.length ? (winners / realizedTrades.length) * 100 : null,
    balance: balanceSummary(balance),
    baseline: mode === 'demo' ? demoBaseline() : null
  };
}

function fallbackPnlSourceFromBalance({ key, mode, label, modeLabel, asset, balance, error = '' }) {
  if (!balance || !Number.isFinite(Number(balance.equity))) {
    return null;
  }

  const baseline = mode === 'demo' ? demoBaseline() : null;
  const floating = roundMoney(Number(balance.unrealizedProfit || 0));
  const total = Number.isFinite(baseline)
    ? roundMoney(Number(balance.equity || 0) - baseline)
    : floating;
  const realized = roundMoney(total - floating);

  return {
    key,
    label,
    modeLabel,
    month: currentMonthKey(),
    asset: balance.asset || asset,
    available: true,
    status: sourceErrorStatus(error) === 'No disponible'
      ? 'Equity de cuenta'
      : `${sourceErrorStatus(error)} · equity de cuenta`,
    error: sourceErrorStatus(error),
    total,
    realized,
    grossRealized: realized,
    floating,
    fees: 0,
    funding: 0,
    exposure: roundMoney(Number(balance.usedMargin || 0)),
    openPositions: 0,
    closedTrades: 0,
    records: 0,
    winRate: null,
    balance: balanceSummary(balance),
    baseline
  };
}

function demoBaseline() {
  const config = configStore.getBingX();
  const value = Number(config.vstBaseCapital || 1000);
  return Number.isFinite(value) && value > 0 ? value : 1000;
}

function balanceSummary(balance) {
  if (!balance) {
    return null;
  }

  return {
    asset: balance.asset,
    balance: roundMoney(balance.balance),
    equity: roundMoney(balance.equity),
    availableMargin: roundMoney(balance.availableMargin),
    usedMargin: roundMoney(balance.usedMargin),
    unrealizedProfit: roundMoney(balance.unrealizedProfit)
  };
}

function sourceStatusText({ open, realizedTrades, error }) {
  if (error) {
    const suffix = open.length ? ` · ${open.length} abiertas` : '';
    return `${sourceErrorStatus(error)}${suffix}`;
  }
  if (open.length) {
    return `${open.length} abiertas`;
  }
  return realizedTrades.length ? 'Sin abiertas' : 'Sin operaciones';
}

function sourceErrorStatus(error = '') {
  if (/frequency|rate|100410|limit/i.test(error)) {
    return 'Rate-limit PnL temporal';
  }
  return error || 'No disponible';
}

function emptyPnlSource(key, label, modeLabel, asset, error = '') {
  return {
    key,
    label,
    modeLabel,
    month: currentMonthKey(),
    asset,
    available: false,
    status: error || 'No disponible',
    error,
    total: 0,
    realized: 0,
    grossRealized: 0,
    floating: 0,
    fees: 0,
    funding: 0,
    exposure: 0,
    openPositions: 0,
    closedTrades: 0,
    records: 0,
    winRate: null
  };
}

function summarizePnlRows(rows = []) {
  return rows.reduce((summary, row) => ({
    total: roundMoney(summary.total + Number(row.total || 0)),
    realized: roundMoney(summary.realized + Number(row.realized || 0)),
    fees: roundMoney(summary.fees + Number(row.fees || 0)),
    funding: roundMoney(summary.funding + Number(row.funding || 0)),
    closedTrades: summary.closedTrades + Number(row.closedTrades || 0),
    records: summary.records + Number(row.records || 0)
  }), {
    total: 0,
    realized: 0,
    fees: 0,
    funding: 0,
    closedTrades: 0,
    records: 0
  });
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
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
