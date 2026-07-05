import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
const backupDir = join(dataDir, 'backups');
const profileDir = join(rootDir, '.yt-profile');
const port = Number(process.env.PORT || 5178);
const EXCHANGE_SYNC_POLL_MS = 30_000;
const EXCHANGE_SYNC_MIN_INTERVAL_MS = 10_000;
const EXCHANGE_SYNC_STALE_MS = 90_000;
const EXCHANGE_SAFETY_ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const EXCHANGE_ORDER_SETTLE_SYNC_DELAY_MS = 5_000;
const EXCHANGE_STOP_LOSS_REPAIR_DELAY_MS = 7_000;
const EXCHANGE_PROTECTION_GRACE_MS = 20_000;
const EXCHANGE_ORPHAN_GRACE_MS = 20_000;
const EXCHANGE_STOP_CLOSE_TOLERANCE_PERCENT = 0.15;
const DUPLICATE_SIGNAL_WINDOW_MS = 12 * 60 * 60 * 1000;
const HEALTH_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const NO_VISIBLE_POSTS_ALERT_GRACE_MS = 15 * 60 * 1000;
const MONTHLY_RESET_CHECK_MS = 60 * 60 * 1000;
const PNL_CACHE_TTL_MS = 45_000;
const PNL_BACKOFF_DEFAULT_MS = 5 * 60 * 1000;
const PNL_BACKOFF_MAX_MS = 15 * 60 * 1000;
const REDACTED_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BACKEND_RESTART_CONFIRMATION = 'REINICIAR_BACKEND';
const STOP_LOSS_RETRY_FIRST_DELAY_MS = 10_000;
const STOP_LOSS_RETRY_INTERVAL_MS = 15_000;
const STOP_LOSS_RETRY_MAX_AGE_MS = 10 * 60 * 1000;
const STOP_LOSS_RETRY_MAX_ATTEMPTS = 40;
const CLOSE_GUARD_RETRY_FIRST_DELAY_MS = 10_000;
const CLOSE_GUARD_RETRY_INTERVAL_MS = 15_000;
const CLOSE_GUARD_RETRY_MAX_AGE_MS = 10 * 60 * 1000;
const CLOSE_GUARD_RETRY_MAX_ATTEMPTS = 40;

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
    markExchangeSafetyGrace(event);
    scheduleExchangeSyncForTrade(event);
    scheduleStopLossRepairForTrade(event);
    handleStopLossRetryEvent(event);
    handleCloseGuardRetryEvent(event);
    broadcast('state', state);
  }
});
const clients = new Set();
let pnlCache = null;
let pnlSourcesCache = null;
let replicaAuditCache = null;
let pnlLastGood = null;
let pnlSourcesLastGood = null;
let pnlBackoffUntil = 0;
let pnlBackoffReason = '';
let backupTimer = null;
let lastBackupStatus = {
  lastRunAt: null,
  nextRunAt: null,
  lastFile: null,
  lastError: null
};
const lastPriceBroadcast = new Map();
let exchangeOpenSymbols = new Set();
let exchangePositionsCache = [];
let exchangeBalancesCache = {};
let exchangeOpenOrdersCache = [];
let exchangeSyncInFlight = false;
let lastExchangeSyncAt = 0;
let lastExchangeSyncReason = '';
let backendRestartScheduled = false;
const pendingExchangeClosures = new Map();
const exchangeSafetyAlerts = new Map();
const liveProtectionGraceUntil = new Map();
const liveOrphanGraceUntil = new Map();
const pendingStopLossRetries = new Map();
const pendingCloseGuardRetries = new Map();
const closeGuardTelegramNotifications = new Set();

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

function portfolioSourceForReference(portfolio = {}) {
  return portfolio.resolvedUrl || portfolio.spreadsheetId || portfolio.url;
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
  if (payload.phase === 'backfill') {
    return { enabled: false, reason: 'historico en modo lectura', options: {} };
  }

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

function handleStopLossRetryEvent(event = {}) {
  const key = stopLossRetryKeyFromEvent(event);
  if (!key) {
    return;
  }

  if (isOpeningExecutionStatusForRetry(event.status)) {
    clearStopLossRetry(key, 'opened');
    return;
  }

  if (shouldQueueStopLossRetry(event)) {
    queueStopLossRetry(event, key);
  }
}

function handleCloseGuardRetryEvent(event = {}) {
  const key = closeGuardRetryKeyFromEvent(event);
  if (!key) {
    return;
  }

  if (isCloseExecutionStatusForRetry(event.status)) {
    clearCloseGuardRetry(key, 'closed');
    return;
  }

  if (shouldQueueCloseGuardRetry(event)) {
    queueCloseGuardRetry(event, key);
  }
}

function shouldQueueStopLossRetry(event = {}) {
  const status = String(event.status || '');
  const mode = String(event.executionMode || '').toLowerCase();
  const signal = event.signal || {};
  return status === 'blocked'
    && (mode === 'demo' || mode === 'live')
    && signal.symbol
    && signal.direction
    && !isPositionManagementSignal(signal)
    && isRetryableStopLossReason(event.reason);
}

function isRetryableStopLossReason(reason = '') {
  return /^(exchange_stop_loss_invalid|entry_missed_invalid_(?:long|short)_stop_loss|invalid_(?:long|short)_stop_loss):/i
    .test(String(reason || ''));
}

function shouldQueueCloseGuardRetry(event = {}) {
  const status = String(event.status || '');
  const mode = String(event.executionMode || '').toLowerCase();
  const signal = event.signal || {};
  return status === `${mode}_close_guarded`
    && (mode === 'demo' || mode === 'live')
    && signal.action === 'CLOSE'
    && signal.symbol
    && Number(signal.closePrice) > 0;
}

function queueStopLossRetry(event, key = stopLossRetryKeyFromEvent(event)) {
  if (!key) {
    return null;
  }

  const existing = pendingStopLossRetries.get(key);
  if (existing) {
    existing.lastReason = event.reason || existing.lastReason;
    existing.lastBlockedAt = event.at || new Date().toISOString();
    existing.updatedAt = new Date().toISOString();
    broadcast('state', state);
    return existing;
  }

  const now = Date.now();
  const item = {
    key,
    signal: event.signal,
    post: {
      id: event.postId || null,
      url: event.postUrl || null,
      firstSeenAt: event.at || new Date().toISOString()
    },
    originalPhase: event.phase || null,
    executionMode: String(event.executionMode || '').toLowerCase(),
    queuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + STOP_LOSS_RETRY_MAX_AGE_MS).toISOString(),
    attempts: 0,
    lastReason: event.reason || '',
    lastBlockedAt: event.at || new Date(now).toISOString(),
    lastCheckedAt: null,
    lastMarketPrice: null,
    nextRunAt: null,
    timer: null
  };

  pendingStopLossRetries.set(key, item);
  pushLog({
    level: 'warn',
    message: `Reintento pendiente por SL ${item.executionMode}: ${item.signal.symbol} ${item.signal.direction}.`,
    at: new Date().toISOString()
  });
  scheduleStopLossRetryTimer(item, STOP_LOSS_RETRY_FIRST_DELAY_MS);
  broadcast('state', state);
  return item;
}

function queueCloseGuardRetry(event, key = closeGuardRetryKeyFromEvent(event)) {
  if (!key) {
    return null;
  }

  const existing = pendingCloseGuardRetries.get(key);
  if (existing) {
    existing.lastReason = closeGuardEventReason(event) || existing.lastReason;
    existing.lastBlockedAt = event.at || new Date().toISOString();
    existing.updatedAt = new Date().toISOString();
    broadcast('state', state);
    return existing;
  }

  const now = Date.now();
  const item = {
    key,
    signal: event.signal,
    post: {
      id: event.postId || null,
      url: event.postUrl || null,
      firstSeenAt: event.at || new Date().toISOString()
    },
    originalPhase: event.phase || null,
    executionMode: String(event.executionMode || '').toLowerCase(),
    queuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CLOSE_GUARD_RETRY_MAX_AGE_MS).toISOString(),
    attempts: 0,
    lastReason: closeGuardEventReason(event),
    lastBlockedAt: event.at || new Date(now).toISOString(),
    lastCheckedAt: null,
    nextRunAt: null,
    timer: null
  };

  pendingCloseGuardRetries.set(key, item);
  pushLog({
    level: 'warn',
    message: `Cierre protegido pendiente ${item.executionMode}: ${item.signal.symbol}.`,
    at: new Date().toISOString()
  });
  scheduleCloseGuardRetryTimer(item, CLOSE_GUARD_RETRY_FIRST_DELAY_MS);
  broadcast('state', state);
  return item;
}

function scheduleStopLossRetryTimer(item, delayMs = STOP_LOSS_RETRY_INTERVAL_MS) {
  if (!item || !pendingStopLossRetries.has(item.key)) {
    return;
  }
  if (item.timer) {
    clearTimeout(item.timer);
  }
  const delay = Math.max(1000, Number(delayMs || STOP_LOSS_RETRY_INTERVAL_MS));
  item.nextRunAt = new Date(Date.now() + delay).toISOString();
  item.timer = setTimeout(() => {
    runStopLossRetry(item.key).catch((error) => {
      const current = pendingStopLossRetries.get(item.key);
      if (!current) {
        return;
      }
      current.lastReason = error.message;
      current.lastCheckedAt = new Date().toISOString();
      pushLog({
        level: 'warn',
        message: `Reintento SL ${current.signal.symbol}: ${error.message}`,
        at: new Date().toISOString()
      });
      rescheduleOrExpireStopLossRetry(current, `retry_error:${error.message}`);
    });
  }, delay);
  item.timer.unref();
}

function scheduleCloseGuardRetryTimer(item, delayMs = CLOSE_GUARD_RETRY_INTERVAL_MS) {
  if (!item || !pendingCloseGuardRetries.has(item.key)) {
    return;
  }
  if (item.timer) {
    clearTimeout(item.timer);
  }
  const delay = Math.max(1000, Number(delayMs || CLOSE_GUARD_RETRY_INTERVAL_MS));
  item.nextRunAt = new Date(Date.now() + delay).toISOString();
  item.timer = setTimeout(() => {
    runCloseGuardRetry(item.key).catch(async (error) => {
      const current = pendingCloseGuardRetries.get(item.key);
      if (!current) {
        return;
      }
      current.lastReason = error.message;
      current.lastCheckedAt = new Date().toISOString();
      pushLog({
        level: 'warn',
        message: `Reintento cierre protegido ${current.signal.symbol}: ${error.message}`,
        at: new Date().toISOString()
      });
      await rescheduleOrExpireCloseGuardRetry(current, `retry_error:${error.message}`);
    });
  }, delay);
  item.timer.unref();
}

async function runStopLossRetry(key) {
  const item = pendingStopLossRetries.get(key);
  if (!item) {
    return;
  }
  item.timer = null;

  if (stopLossRetryExpired(item)) {
    expireStopLossRetry(item, item.lastReason || 'retry_expired');
    return;
  }

  if (hasOpenPositionForStopLossRetry(item) || hasOpeningExecutionForStopLossRetry(item)) {
    clearStopLossRetry(key, 'already_open');
    return;
  }

  const baseConfig = configStore.getBingX({ includeSecrets: true });
  if (!baseConfig.enabled) {
    expireStopLossRetry(item, 'bingx_disabled');
    return;
  }
  if (!configAllowsRetryMode(baseConfig.mode, item.executionMode)) {
    expireStopLossRetry(item, `mode_changed:${baseConfig.mode}`);
    return;
  }
  if (item.executionMode === 'live' && !baseConfig.liveConfirmed) {
    expireStopLossRetry(item, 'live_not_confirmed');
    return;
  }

  const config = {
    ...baseConfig,
    mode: item.executionMode
  };
  const readiness = await stopLossRetryReadiness(item, config);
  item.attempts += 1;
  item.lastCheckedAt = new Date().toISOString();
  item.lastMarketPrice = readiness.marketPrice || null;
  item.lastReason = readiness.reason || item.lastReason;

  if (!readiness.ok) {
    rescheduleOrExpireStopLossRetry(item, readiness.reason);
    return;
  }

  pushLog({
    level: 'warn',
    message: `Reintentando orden pendiente ${item.executionMode}: ${item.signal.symbol} ${item.signal.direction} con precio ${readiness.marketPrice}.`,
    at: new Date().toISOString()
  });

  const result = await futuresTrader.executeSignalWithConfig(item.signal, {
    post: item.post,
    phase: 'stop_loss_retry'
  }, config);

  if (isOpeningExecutionStatusForRetry(result?.status)) {
    clearStopLossRetry(key, 'opened');
    return;
  }

  if (shouldQueueStopLossRetry(result)) {
    item.lastReason = result.reason || item.lastReason;
    item.lastBlockedAt = result.at || item.lastBlockedAt;
    rescheduleOrExpireStopLossRetry(item, item.lastReason);
    return;
  }

  expireStopLossRetry(item, result?.reason || result?.status || 'retry_not_executable');
}

async function runCloseGuardRetry(key) {
  const item = pendingCloseGuardRetries.get(key);
  if (!item) {
    return;
  }
  item.timer = null;

  if (closeGuardRetryExpired(item)) {
    await executeExpiredCloseGuardFallback(item, item.lastReason || 'retry_expired');
    return;
  }

  const baseConfig = configStore.getBingX({ includeSecrets: true });
  if (!baseConfig.enabled) {
    expireCloseGuardRetry(item, 'bingx_disabled');
    return;
  }
  if (!configAllowsRetryMode(baseConfig.mode, item.executionMode)) {
    expireCloseGuardRetry(item, `mode_changed:${baseConfig.mode}`);
    return;
  }
  if (item.executionMode === 'live' && !baseConfig.liveConfirmed) {
    expireCloseGuardRetry(item, 'live_not_confirmed');
    return;
  }

  const config = {
    ...baseConfig,
    mode: item.executionMode
  };
  item.attempts += 1;
  item.lastCheckedAt = new Date().toISOString();

  pushLog({
    level: 'warn',
    message: `Reintentando cierre protegido ${item.executionMode}: ${item.signal.symbol}.`,
    at: new Date().toISOString()
  });

  const result = await futuresTrader.executeCloseSignalWithConfig(item.signal, {
    post: item.post,
    phase: 'close_guard_retry'
  }, config);

  if (isCloseExecutionStatusForRetry(result?.status)) {
    clearCloseGuardRetry(key, 'closed');
    return;
  }

  if (shouldQueueCloseGuardRetry(result)) {
    item.lastReason = closeGuardEventReason(result) || item.lastReason;
    await rescheduleOrExpireCloseGuardRetry(item, item.lastReason);
    return;
  }

  expireCloseGuardRetry(item, result?.reason || result?.status || 'retry_not_executable');
}

async function stopLossRetryReadiness(item, config) {
  const marketPrice = await futuresTrader.fetchMarketPrice(
    futuresTrader.marketClient(config),
    item.signal.symbol
  );
  const stopLoss = Number(item.signal.stopLoss);
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    return {
      ok: false,
      marketPrice,
      reason: `invalid_stop_loss:${item.signal.stopLoss}`
    };
  }

  const direction = String(item.signal.direction || '').toUpperCase();
  if (direction === 'LONG' && stopLoss >= marketPrice) {
    return {
      ok: false,
      marketPrice,
      reason: `waiting_long_stop_loss:${stopLoss}>=${marketPrice}`
    };
  }
  if (direction === 'SHORT' && stopLoss <= marketPrice) {
    return {
      ok: false,
      marketPrice,
      reason: `waiting_short_stop_loss:${stopLoss}<=${marketPrice}`
    };
  }

  return { ok: true, marketPrice, reason: '' };
}

function rescheduleOrExpireStopLossRetry(item, reason) {
  if (!item || !pendingStopLossRetries.has(item.key)) {
    return;
  }
  item.lastReason = reason || item.lastReason;
  if (stopLossRetryExpired(item)) {
    expireStopLossRetry(item, item.lastReason || 'retry_expired');
    return;
  }
  scheduleStopLossRetryTimer(item, STOP_LOSS_RETRY_INTERVAL_MS);
  broadcast('state', state);
}

async function rescheduleOrExpireCloseGuardRetry(item, reason) {
  if (!item || !pendingCloseGuardRetries.has(item.key)) {
    return;
  }
  item.lastReason = reason || item.lastReason;
  if (closeGuardRetryExpired(item)) {
    await executeExpiredCloseGuardFallback(item, item.lastReason || 'retry_expired');
    return;
  }
  scheduleCloseGuardRetryTimer(item, CLOSE_GUARD_RETRY_INTERVAL_MS);
  broadcast('state', state);
}

function stopLossRetryExpired(item) {
  return Date.now() >= Date.parse(item.expiresAt || 0)
    || Number(item.attempts || 0) >= STOP_LOSS_RETRY_MAX_ATTEMPTS;
}

function closeGuardRetryExpired(item) {
  return Date.now() >= Date.parse(item.expiresAt || 0)
    || Number(item.attempts || 0) >= CLOSE_GUARD_RETRY_MAX_ATTEMPTS;
}

function expireStopLossRetry(item, reason = 'retry_expired') {
  clearStopLossRetry(item.key, reason);
  const event = {
    at: new Date().toISOString(),
    status: `${item.executionMode}_order_retry_expired`,
    reason,
    signal: item.signal,
    postId: item.post?.id || null,
    postUrl: item.post?.url || null,
    phase: 'stop_loss_retry',
    executionMode: item.executionMode,
    retry: publicStopLossRetryItem(item)
  };
  recordTradeEvent(event);
  notifyTradeCriticalEvent(event);
}

async function executeExpiredCloseGuardFallback(item, reason = 'retry_expired') {
  if (!item || !pendingCloseGuardRetries.has(item.key)) {
    return;
  }

  const baseConfig = configStore.getBingX({ includeSecrets: true });
  if (!baseConfig.enabled) {
    expireCloseGuardRetry(item, 'bingx_disabled');
    return;
  }
  if (!configAllowsRetryMode(baseConfig.mode, item.executionMode)) {
    expireCloseGuardRetry(item, `mode_changed:${baseConfig.mode}`);
    return;
  }
  if (item.executionMode === 'live' && !baseConfig.liveConfirmed) {
    expireCloseGuardRetry(item, 'live_not_confirmed');
    return;
  }

  const config = {
    ...baseConfig,
    mode: item.executionMode
  };
  const finalReason = reason || item.lastReason || 'retry_expired';
  item.lastReason = finalReason;
  item.lastCheckedAt = new Date().toISOString();

  pushLog({
    level: 'warn',
    message: `Cierre protegido expirado ${item.executionMode}: cerrando ${item.signal.symbol} a mercado.`,
    at: new Date().toISOString()
  });

  try {
    const result = await futuresTrader.executeCloseSignalWithConfig(item.signal, {
      post: item.post,
      phase: 'close_guard_expired_fallback',
      forceCloseAfterGuard: true,
      closeGuardExpiredReason: finalReason
    }, config);

    if (isCloseExecutionStatusForRetry(result?.status)) {
      clearCloseGuardRetry(item.key, 'expired_force_closed');
      return;
    }

    expireCloseGuardRetry(item, result?.reason || result?.status || finalReason);
  } catch (error) {
    expireCloseGuardRetry(item, `fallback_error:${error.message}`);
  }
}

function expireCloseGuardRetry(item, reason = 'retry_expired') {
  clearCloseGuardRetry(item.key, reason);
  const event = {
    at: new Date().toISOString(),
    status: `${item.executionMode}_close_guard_expired`,
    reason,
    signal: item.signal,
    postId: item.post?.id || null,
    postUrl: item.post?.url || null,
    phase: 'close_guard_retry',
    executionMode: item.executionMode,
    retry: publicCloseGuardRetryItem(item)
  };
  recordTradeEvent(event);
  notifyTradeCriticalEvent(event);
}

function clearStopLossRetry(key, reason = '') {
  const item = pendingStopLossRetries.get(key);
  if (!item) {
    return;
  }
  if (item.timer) {
    clearTimeout(item.timer);
  }
  pendingStopLossRetries.delete(key);
  if (reason) {
    pushLog({
      level: reason === 'opened' || reason === 'already_open' ? 'info' : 'warn',
      message: `Reintento SL finalizado ${item.signal.symbol}: ${reason}.`,
      at: new Date().toISOString()
    });
  }
  broadcast('state', state);
}

function clearCloseGuardRetry(key, reason = '') {
  const item = pendingCloseGuardRetries.get(key);
  if (!item) {
    return;
  }
  if (item.timer) {
    clearTimeout(item.timer);
  }
  pendingCloseGuardRetries.delete(key);
  if (reason) {
    pushLog({
      level: reason === 'closed' ? 'info' : 'warn',
      message: `Cierre protegido finalizado ${item.signal?.symbol || ''}: ${reason}.`.trim(),
      at: new Date().toISOString()
    });
  }
  broadcast('state', state);
}

function stopLossRetryKeyFromEvent(event = {}) {
  const signal = event.signal || {};
  const mode = String(event.executionMode || '').toLowerCase();
  if (!mode || !signal.symbol || !signal.direction || isPositionManagementSignal(signal)) {
    return '';
  }
  return [
    mode,
    event.postId || '',
    normalizePositionSymbol(signal.symbol),
    String(signal.direction || '').toUpperCase(),
    signal.entry?.price || '',
    signal.stopLoss || ''
  ].join('|');
}

function closeGuardRetryKeyFromEvent(event = {}) {
  const signal = event.signal || {};
  const mode = String(event.executionMode || '').toLowerCase();
  if (!mode || !signal.symbol || signal.action !== 'CLOSE') {
    return '';
  }
  return [
    mode,
    event.postId || '',
    normalizePositionSymbol(signal.symbol),
    signal.closePrice || '',
    signal.closePercent || 100
  ].join('|');
}

function closeGuardTelegramKeyFromEvent(event = {}) {
  return closeGuardRetryKeyFromEvent(event) || [
    String(event.executionMode || '').toLowerCase(),
    event.postId || '',
    normalizePositionSymbol(event.signal?.symbol || ''),
    event.signal?.closePrice || '',
    event.signal?.closePercent || event.closePercent || 100
  ].join('|');
}

function hasOpenPositionForStopLossRetry(item) {
  const symbol = normalizePositionSymbol(item.signal.symbol);
  const direction = String(item.signal.direction || '').toUpperCase();
  return exchangePositionsCache.some((position) => (
    position.source === item.executionMode
    && position.status === 'open'
    && normalizePositionSymbol(position.symbol) === symbol
    && String(position.direction || '').toUpperCase() === direction
  ));
}

function hasOpeningExecutionForStopLossRetry(item) {
  return state.trades.some((event) => (
    isOpeningExecutionStatusForRetry(event.status)
    && stopLossRetryKeyFromEvent(event) === item.key
  ));
}

function configAllowsRetryMode(configMode, executionMode) {
  if (executionMode === 'demo') {
    return configMode === 'demo' || configMode === 'dual';
  }
  if (executionMode === 'live') {
    return configMode === 'live' || configMode === 'dual';
  }
  return false;
}

function isOpeningExecutionStatusForRetry(status) {
  const value = String(status || '');
  return value === 'test_order_sent'
    || value === 'demo_order_sent'
    || value === 'live_order_sent';
}

function isCloseExecutionStatusForRetry(status) {
  const value = String(status || '');
  return value === 'demo_close_sent'
    || value === 'live_close_sent'
    || value === 'demo_close_no_position'
    || value === 'live_close_no_position';
}

function stopLossRetryQueueState() {
  return [...pendingStopLossRetries.values()].map(publicStopLossRetryItem);
}

function closeGuardRetryQueueState() {
  return [...pendingCloseGuardRetries.values()].map(publicCloseGuardRetryItem);
}

function publicStopLossRetryItem(item) {
  return {
    key: item.key,
    symbol: item.signal?.symbol || '',
    direction: item.signal?.direction || '',
    executionMode: item.executionMode,
    postId: item.post?.id || null,
    postUrl: item.post?.url || null,
    queuedAt: item.queuedAt,
    expiresAt: item.expiresAt,
    attempts: item.attempts,
    nextRunAt: item.nextRunAt,
    lastCheckedAt: item.lastCheckedAt,
    lastMarketPrice: item.lastMarketPrice,
    lastReason: item.lastReason
  };
}

function publicCloseGuardRetryItem(item) {
  return {
    key: item.key,
    symbol: item.signal?.symbol || '',
    executionMode: item.executionMode,
    closePrice: item.signal?.closePrice || null,
    closePercent: item.signal?.closePercent || 100,
    postId: item.post?.id || null,
    postUrl: item.post?.url || null,
    queuedAt: item.queuedAt,
    expiresAt: item.expiresAt,
    attempts: item.attempts,
    nextRunAt: item.nextRunAt,
    lastCheckedAt: item.lastCheckedAt,
    lastReason: item.lastReason
  };
}

function hydrateStopLossRetryQueueFromEvents() {
  const cutoff = Date.now() - STOP_LOSS_RETRY_MAX_AGE_MS;
  for (const event of [...state.trades].reverse()) {
    const timestamp = Date.parse(event.at || 0);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      continue;
    }
    if (!shouldQueueStopLossRetry(event)) {
      continue;
    }
    const key = stopLossRetryKeyFromEvent(event);
    if (!key || pendingStopLossRetries.has(key)) {
      continue;
    }
    if (state.trades.some((candidate) => (
      Date.parse(candidate.at || 0) > timestamp
      && isOpeningExecutionStatusForRetry(candidate.status)
      && stopLossRetryKeyFromEvent(candidate) === key
    ))) {
      continue;
    }
    const item = queueStopLossRetry(event, key);
    if (item) {
      item.expiresAt = new Date(timestamp + STOP_LOSS_RETRY_MAX_AGE_MS).toISOString();
    }
  }
}

function hydrateCloseGuardRetryQueueFromEvents() {
  const cutoff = Date.now() - CLOSE_GUARD_RETRY_MAX_AGE_MS;
  for (const event of [...state.trades].reverse()) {
    const timestamp = Date.parse(event.at || 0);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      continue;
    }
    if (!shouldQueueCloseGuardRetry(event)) {
      continue;
    }
    const key = closeGuardRetryKeyFromEvent(event);
    if (!key || pendingCloseGuardRetries.has(key)) {
      continue;
    }
    if (state.trades.some((candidate) => (
      Date.parse(candidate.at || 0) > timestamp
      && isCloseExecutionStatusForRetry(candidate.status)
      && closeGuardRetryKeyFromEvent(candidate) === key
    ))) {
      continue;
    }
    const item = queueCloseGuardRetry(event, key);
    if (item) {
      item.expiresAt = new Date(timestamp + CLOSE_GUARD_RETRY_MAX_AGE_MS).toISOString();
    }
  }
}

function closeGuardEventReason(event = {}) {
  return event.reason
    || event.exchangeClose?.skipped?.[0]?.reason
    || event.exchangeClose?.skipped?.[0]?.guard?.reason
    || 'close_guarded';
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

    if (requestUrl.pathname === '/api/admin/restart' && request.method === 'POST') {
      const body = await readJson(request);
      if (body.confirm !== BACKEND_RESTART_CONFIRMATION) {
        return sendJson(response, { error: `Confirma ${BACKEND_RESTART_CONFIRMATION} para reiniciar el backend.` }, 400);
      }
      scheduleBackendRestart('ui');
      return sendJson(response, {
        ok: true,
        restarting: true,
        managedByPm2: Boolean(process.env.pm_id || process.env.PM2_HOME),
        message: 'Backend reiniciandose.'
      });
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
      pnlLastGood = null;
      pnlSourcesLastGood = null;
      clearPnlBackoff();
      broadcast('bingx', { bingx });
      notifyBingxPauseChange(previous, bingx);
      return sendJson(response, { ok: true, bingx });
    }

    if (requestUrl.pathname === '/api/bingx/month-reset' && request.method === 'POST') {
      const bingx = await resetMonthlyAccounting({ reason: 'manual' });
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

      const results = await futuresTrader.processPosts([post], { phase: 'manual_replay' }, {
        duplicateGuard: duplicateOpenSignalGuard
      });
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
      if (pnlCache && pnlCache.months === String(months) && Date.now() - pnlCache.at < PNL_CACHE_TTL_MS) {
        return sendJson(response, { ok: true, ...pnlCache.payload, cached: true });
      }

      const cooldown = pnlBackoffInfo();
      if (cooldown.active) {
        const payload = await cachedOrPaperPnlPayload({ months, warning: cooldown.reason, cooldownUntil: cooldown.until });
        pnlCache = { months: String(months), at: Date.now(), payload };
        return sendJson(response, { ok: true, ...payload, cached: true, backoff: true });
      }

      try {
        const pnl = await futuresTrader.getMonthlyPnl({ months });
        clearPnlBackoff();
        const payload = { pnl };
        pnlCache = { months: String(months), at: Date.now(), payload };
        pnlLastGood = { months: String(months), at: Date.now(), pnl };
        return sendJson(response, { ok: true, pnl });
      } catch (error) {
        const cooldownUntil = startPnlBackoff(error);
        const payload = await cachedOrPaperPnlPayload({ months, warning: error.message, cooldownUntil });
        pnlCache = { months: String(months), at: Date.now(), payload };
        pushLog({ level: 'warn', message: `BingX PnL no disponible, usando cache/backoff: ${safePublicMessage(error.message)}`, at: new Date().toISOString() });
        return sendJson(response, { ok: true, ...payload });
      }
    }

    if (requestUrl.pathname === '/api/bingx/pnl-sources' && request.method === 'GET') {
      if (pnlSourcesCache && Date.now() - pnlSourcesCache.at < PNL_CACHE_TTL_MS) {
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

      const cooldown = pnlBackoffInfo();
      if (cooldown.active) {
        const payload = pnlSourcesLastGood ? {
          ...pnlSourcesLastGood.payload,
          cached: true,
          stale: true,
          warning: cooldown.reason,
          cooldownUntil: new Date(cooldown.until).toISOString()
        } : {
          ok: true,
          month: currentMonthKey(),
          sources: {
            vst: emptyPnlSource('vst', 'Futuros VST', 'Demo VST', 'VST', sourceErrorStatus(cooldown.reason)),
            live: emptyPnlSource('live', 'Futuros reales', 'Live real', 'USDT', sourceErrorStatus(cooldown.reason))
          },
          positions: {
            vst: [],
            live: []
          },
          cached: true,
          stale: false,
          warning: cooldown.reason,
          cooldownUntil: new Date(cooldown.until).toISOString()
        };
        pnlSourcesCache = { at: Date.now(), payload };
        return sendJson(response, payload);
      }

      const [vst, live] = await Promise.all([
        exchangePnlSource({ key: 'vst', mode: 'demo', label: 'Futuros VST', modeLabel: 'Demo VST', asset: 'VST' }),
        exchangePnlSource({ key: 'live', mode: 'live', label: 'Futuros reales', modeLabel: 'Live real', asset: 'USDT' })
      ]);
      const sourceWarning = [vst.source?.error, live.source?.error]
        .filter(Boolean)
        .find((message) => /frequency|rate|100410|limit/i.test(message));
      const cooldownUntil = sourceWarning ? startPnlBackoff(new Error(sourceWarning)) : 0;

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
        },
        warning: sourceWarning || '',
        cooldownUntil: cooldownUntil ? new Date(cooldownUntil).toISOString() : null
      };
      pnlSourcesCache = { at: Date.now(), payload };
      if (!sourceWarning) {
        pnlSourcesLastGood = { at: Date.now(), payload };
      }
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
      const referencePortfolioUrl = portfolioSourceForReference(portfolio);
      const parsedHistorical = buildHistoricalPnl(store.list(), {
        months: requestUrl.searchParams.get('months') || 72,
        defaultNotionalUSDT: bingx.monthlyOrderNotionalUSDT || bingx.defaultNotionalUSDT || 30,
        fallbackLeverage: bingx.maxLeverage || 1
      });
      const historical = await applyReferenceLedger(parsedHistorical, {
        month: requestUrl.searchParams.get('month') || currentMonthKey(),
        portfolioUrl: referencePortfolioUrl
      });
      return sendJson(response, { ok: true, historical });
    }

    if (requestUrl.pathname === '/api/reference-ledger' && request.method === 'GET') {
      const month = requestUrl.searchParams.get('month') || currentMonthKey();
      const portfolio = configStore.getPortfolio();
      const reference = await loadReferenceLedger({ month, portfolioUrl: portfolioSourceForReference(portfolio) });
      return sendJson(response, { ok: true, reference });
    }

    if (requestUrl.pathname === '/api/replica-audit' && request.method === 'GET') {
      const month = requestUrl.searchParams.get('month') || currentMonthKey();
      if (replicaAuditCache?.month === month && Date.now() - replicaAuditCache.at < PNL_CACHE_TTL_MS) {
        return sendJson(response, { ok: true, audit: replicaAuditCache.audit, cached: true });
      }
      const audit = await buildReplicaAudit({ month });
      replicaAuditCache = { month, at: Date.now(), audit };
      return sendJson(response, { ok: true, audit });
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

    if (requestUrl.pathname === '/api/strategy-study/latest' && request.method === 'GET') {
      const strategyStudy = await loadLatestStrategyStudy();
      return sendJson(response, { ok: true, ...strategyStudy });
    }

    if (requestUrl.pathname === '/api/operational-status' && request.method === 'GET') {
      return sendJson(response, {
        ok: true,
        generatedAt: new Date().toISOString(),
        health: buildHealth(),
        exchangeSafety: buildExchangeSafety(),
        incidents: buildIncidentSnapshot(),
        backup: lastBackupStatus,
        pnlBackoff: pnlBackoffInfo()
      });
    }

    if (requestUrl.pathname === '/api/backup/redacted' && request.method === 'GET') {
      const backup = await buildRedactedBackup();
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="futures-magician-backup-${backup.generatedAt.slice(0, 10)}.json"`
      });
      return response.end(JSON.stringify(backup, null, 2));
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
  hydrateStopLossRetryQueueFromEvents();
  hydrateCloseGuardRetryQueueFromEvents();
  checkAutomaticMonthlyReset({ reason: 'startup' }).catch((error) => {
    pushLog({ level: 'warn', message: `Reset mensual: ${error.message}`, at: new Date().toISOString() });
  });
  syncExchangePositions({ reason: 'startup' }).catch((error) => {
    pushLog({ level: 'warn', message: `BingX sync: ${error.message}`, at: new Date().toISOString() });
    syncPriceSubscriptions();
  });
  resumeMonitorOnStartup().catch((error) => {
    pushLog({ level: 'error', message: `Auto-resume monitor: ${error.message}`, at: new Date().toISOString() });
  });
  scheduleAutomaticRedactedBackup();
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

setInterval(() => {
  checkAutomaticMonthlyReset({ reason: 'timer' }).catch((error) => {
    pushLog({ level: 'warn', message: `Reset mensual: ${error.message}`, at: new Date().toISOString() });
  });
}, MONTHLY_RESET_CHECK_MS).unref();

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
    stopLossRetryQueue: stopLossRetryQueueState(),
    closeGuardRetryQueue: closeGuardRetryQueueState(),
    exchangeSafety: buildExchangeSafety(),
    stats: store.stats()
  };
}

async function cachedOrPaperPnlPayload({ months, warning, cooldownUntil }) {
  const lastGood = pnlLastGood && pnlLastGood.months === String(months) ? pnlLastGood.pnl : null;
  if (lastGood) {
    return {
      pnl: {
        ...lastGood,
        warning
      },
      warning,
      stale: true,
      cooldownUntil: new Date(cooldownUntil).toISOString(),
      lastGoodAt: new Date(pnlLastGood.at).toISOString()
    };
  }

  const pnl = await futuresTrader.getPaperOnlyPnl({ months, warning });
  return {
    pnl,
    warning,
    stale: false,
    cooldownUntil: new Date(cooldownUntil).toISOString()
  };
}

async function resetMonthlyAccounting({ resetAt = new Date(), reason = 'manual' } = {}) {
  const date = resetAt instanceof Date ? resetAt : new Date(resetAt);
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
  const bingx = await configStore.resetMonthlyAccounting({
    resetAt: safeDate,
    month: currentMonthKeyForDate(safeDate)
  });
  clearPnlCaches();
  broadcast('bingx', { bingx });
  pushLog({
    level: reason.startsWith('auto') ? 'warn' : 'info',
    message: `Reset mensual aplicado (${reason}): VST ${bingx.vstPnlResetAt}, real ${bingx.livePnlResetAt}.`,
    at: new Date().toISOString()
  });
  return bingx;
}

async function checkAutomaticMonthlyReset({ reason = 'timer' } = {}) {
  const now = new Date();
  const month = currentMonthKeyForDate(now);
  const bingx = configStore.getBingX();
  const vstResetMonth = monthKeyFromIso(bingx.vstPnlResetAt);
  const liveResetMonth = monthKeyFromIso(bingx.livePnlResetAt);
  if (bingx.monthlyResetMonth === month && vstResetMonth === month && liveResetMonth === month) {
    return null;
  }

  return resetMonthlyAccounting({
    resetAt: resetDateForMonthlyCatchUp({ bingx, month, now }),
    reason: reason === 'startup' ? 'auto-startup' : 'auto'
  });
}

function resetDateForMonthlyCatchUp({ bingx = {}, month, now = new Date() } = {}) {
  if (bingx.monthlyResetMonth === month) {
    const existing = [bingx.livePnlResetAt, bingx.vstPnlResetAt]
      .map((value) => new Date(value || 0))
      .find((date) => Number.isFinite(date.getTime()) && currentMonthKeyForDate(date) === month);
    if (existing) {
      return existing;
    }
  }
  return monthStartDate(now);
}

function clearPnlCaches() {
  pnlCache = null;
  pnlSourcesCache = null;
  pnlLastGood = null;
  pnlSourcesLastGood = null;
  clearPnlBackoff();
}

function pnlBackoffInfo() {
  const active = pnlBackoffUntil > Date.now();
  return {
    active,
    until: pnlBackoffUntil,
    reason: active ? pnlBackoffReason : ''
  };
}

function startPnlBackoff(error) {
  const message = safePublicMessage(error?.message || String(error));
  const until = parsePnlBackoffUntil(message);
  pnlBackoffUntil = Math.max(pnlBackoffUntil, until);
  pnlBackoffReason = message;
  return pnlBackoffUntil;
}

function clearPnlBackoff() {
  pnlBackoffUntil = 0;
  pnlBackoffReason = '';
}

function parsePnlBackoffUntil(message = '') {
  const now = Date.now();
  const match = String(message).match(/unblocked after\s+(\d{10,})/i);
  const parsed = match ? Number(match[1]) : 0;
  if (Number.isFinite(parsed) && parsed > now) {
    return Math.min(parsed, now + PNL_BACKOFF_MAX_MS);
  }
  return now + PNL_BACKOFF_DEFAULT_MS;
}

async function loadLatestStrategyStudy() {
  const [study, markdown] = await Promise.all([
    readJsonFile(join(dataDir, 'strategy-study', 'strategy-study.json'), null),
    readTextFile(join(rootDir, 'docs', 'strategy-reports', 'latest.md'), '')
  ]);

  return {
    generatedAt: study?.generatedAt || null,
    reportAvailable: Boolean(study || markdown),
    study: study ? summarizeStrategyStudy(study) : null,
    markdown: markdown ? markdown.slice(0, 40_000) : ''
  };
}

function summarizeStrategyStudy(study = {}) {
  const closed = Number(study.performance?.closedTrades || 0);
  const winRate = study.performance?.winRate == null ? null : Number(study.performance.winRate) * 100;
  return {
    generatedAt: study.generatedAt || null,
    window: study.window || null,
    sample: study.sample || {},
    dataQuality: study.dataQuality || {},
    performance: {
      closedTrades: closed,
      openTrades: Number(study.performance?.openTrades || 0),
      wins: Number(study.performance?.wins || 0),
      losses: Number(study.performance?.losses || 0),
      netPnl: roundMoney(study.performance?.netPnl || 0),
      grossPnl: roundMoney(study.performance?.grossPnl || 0),
      commission: roundMoney(study.performance?.commission || 0),
      averageWin: roundMoney(study.performance?.averageWin || 0),
      averageLoss: roundMoney(study.performance?.averageLoss || 0),
      winRate,
      profitFactor: study.performance?.profitFactor == null ? null : Number(study.performance.profitFactor),
      outcomes: study.performance?.outcomes || {}
    },
    signalStats: {
      total: Number(study.signalStats?.total || 0),
      openCount: Number(study.signalStats?.openCount || 0),
      managementCount: Number(study.signalStats?.managementCount || 0),
      byAction: study.signalStats?.byAction || {},
      symbols: study.signalStats?.symbols || {},
      averageLeverage: study.signalStats?.averageLeverage ?? null,
      averageStopDistancePct: study.signalStats?.averageStopDistancePct ?? null,
      averageRewardDistancePct: study.signalStats?.averageRewardDistancePct ?? null
    },
    playbook: {
      commonPackSizes: study.playbook?.commonPackSizes || {},
      entryTypes: study.playbook?.entryTypes || {},
      managementActions: study.playbook?.managementActions || {},
      liveOutcomesBySymbol: study.playbook?.liveOutcomesBySymbol || {}
    },
    statisticalStatus: statisticalStatusLabel(closed)
  };
}

async function buildRedactedBackup() {
  const strategyStudy = await loadLatestStrategyStudy();
  const snapshot = currentState();
  snapshot.logs = (snapshot.logs || []).map((log) => ({
    ...log,
    message: safePublicMessage(log.message)
  }));
  return {
    generatedAt: new Date().toISOString(),
    redacted: true,
    redaction: 'API keys, API secrets, bot tokens and chat identifiers are omitted.',
    config: redactedConfig(),
    state: snapshot,
    health: buildHealth(),
    risk: futuresTrader.riskSnapshot(),
    exchangeSafety: buildExchangeSafety(),
    stats: store.stats(),
    posts: store.list(),
    tradeEvents: tradeEventStore.list(1000),
    paperTrades: paperStore.list(),
    strategyStudy: strategyStudy.study,
    recentLogs: state.logs.slice(0, 200).map((log) => ({
      ...log,
      message: safePublicMessage(log.message)
    }))
  };
}

function redactedConfig() {
  const telegram = configStore.getTelegram();
  const bingx = configStore.getBingX();
  const {
    botTokenPreview,
    chatId,
    ...telegramSafe
  } = telegram;
  const {
    apiKeyPreview,
    apiSecretPreview,
    ...bingxSafe
  } = bingx;

  return {
    telegram: {
      ...telegramSafe,
      chatIdConfigured: Boolean(chatId)
    },
    telegramSource: configStore.getTelegramSource(),
    monitor: configStore.getMonitor(),
    portfolio: configStore.getPortfolio(),
    bingx: bingxSafe
  };
}

async function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function readTextFile(filePath, fallback = '') {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

function safePublicMessage(message = '') {
  return String(message)
    .replace(/(apiKey|apiSecret|signature|X-BX-APIKEY)=?[^&\s]*/gi, '$1=[redacted]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]');
}

function statisticalStatusLabel(closedTrades) {
  if (closedTrades < 30) {
    return `Muestra exploratoria (${closedTrades} cierres): no es estadisticamente significativa.`;
  }
  if (closedTrades < 100) {
    return `Muestra direccional pero fragil (${closedTrades} cierres): seguir acumulando antes de automatizar.`;
  }
  return `Muestra suficiente para empezar a contrastar hipotesis (${closedTrades} cierres), con validacion fuera de muestra.`;
}

function buildIncidentSnapshot() {
  const logs = state.logs || [];
  const incidents = logs
    .map(classifyIncidentLog)
    .filter(Boolean)
    .slice(0, 30);
  const counts = incidents.reduce((summary, incident) => {
    summary.total += 1;
    summary[incident.level] = (summary[incident.level] || 0) + 1;
    summary.byType[incident.type] = (summary.byType[incident.type] || 0) + 1;
    return summary;
  }, {
    total: 0,
    warn: 0,
    error: 0,
    info: 0,
    byType: {}
  });

  return {
    generatedAt: new Date().toISOString(),
    windowHours: 24,
    counts,
    items: incidents
  };
}

function classifyIncidentLog(log = {}) {
  const at = Date.parse(log.at || 0);
  if (!Number.isFinite(at) || Date.now() - at > 24 * 60 * 60 * 1000) {
    return null;
  }

  const message = String(log.message || '');
  const level = String(log.level || 'info');
  const rules = [
    [/No se detectaron mensajes Telegram/i, 'telegram_web_empty', 'Telegram Web sin mensajes visibles'],
    [/No se detectaron posts|YouTube no esta devolviendo posts/i, 'youtube_empty', 'YouTube sin posts visibles'],
    [/BingX PnL no disponible|Rate-limit PnL|frequency limit|100410/i, 'bingx_pnl_rate_limit', 'BingX PnL en rate-limit'],
    [/BingX sync|BingX safety|BingX posiciones/i, 'bingx_sync', 'Reconciliacion BingX'],
    [/Health:|Telegram health|Alerta scraper/i, 'monitor_health', 'Salud del monitor'],
    [/Auto-resume monitor/i, 'auto_resume', 'Auto-resume monitor'],
    [/Backup redacted/i, 'backup', 'Backup automatico']
  ];
  const matched = rules.find(([pattern]) => pattern.test(message));
  if (!matched && level !== 'error') {
    return null;
  }

  return {
    at: new Date(at).toISOString(),
    level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
    type: matched?.[1] || 'error',
    title: matched?.[2] || 'Error',
    message: safePublicMessage(message)
  };
}

function scheduleAutomaticRedactedBackup() {
  if (backupTimer) {
    clearInterval(backupTimer);
  }

  const nextRunAt = new Date(Date.now() + REDACTED_BACKUP_INTERVAL_MS).toISOString();
  lastBackupStatus = {
    ...lastBackupStatus,
    nextRunAt
  };

  setTimeout(() => {
    writeAutomaticRedactedBackup('startup').catch((error) => {
      lastBackupStatus.lastError = safePublicMessage(error.message);
      pushLog({ level: 'error', message: `Backup redacted: ${safePublicMessage(error.message)}`, at: new Date().toISOString() });
    });
  }, 10_000).unref();

  backupTimer = setInterval(() => {
    writeAutomaticRedactedBackup('daily').catch((error) => {
      lastBackupStatus.lastError = safePublicMessage(error.message);
      pushLog({ level: 'error', message: `Backup redacted: ${safePublicMessage(error.message)}`, at: new Date().toISOString() });
    });
  }, REDACTED_BACKUP_INTERVAL_MS);
  backupTimer.unref();
}

async function writeAutomaticRedactedBackup(reason = 'scheduled') {
  await mkdir(backupDir, { recursive: true });
  const backup = await buildRedactedBackup();
  const day = backup.generatedAt.slice(0, 10);
  const snapshotPath = join(backupDir, `futures-magician-backup-${day}.json`);
  const latestPath = join(backupDir, 'latest-redacted.json');
  const payload = `${JSON.stringify({
    ...backup,
    automaticReason: reason
  }, null, 2)}\n`;
  await Promise.all([
    writeFile(snapshotPath, payload),
    writeFile(latestPath, payload)
  ]);
  lastBackupStatus = {
    lastRunAt: backup.generatedAt,
    nextRunAt: new Date(Date.now() + REDACTED_BACKUP_INTERVAL_MS).toISOString(),
    lastFile: snapshotPath,
    lastError: null
  };
  pushLog({
    level: 'info',
    message: `Backup redacted generado: ${snapshotPath}`,
    at: new Date().toISOString()
  });
  return lastBackupStatus;
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

function scheduleExchangeSyncForTrade(event = {}) {
  const reason = event.status || 'trade';
  const runSync = () => {
    syncExchangePositions({ reason }).catch((error) => {
      pushLog({ level: 'warn', message: `BingX sync: ${error.message}`, at: new Date().toISOString() });
      syncPriceSubscriptions();
    });
  };

  if (shouldDelayExchangeSync(event)) {
    setTimeout(runSync, EXCHANGE_ORDER_SETTLE_SYNC_DELAY_MS).unref();
    return;
  }

  runSync();
}

function scheduleStopLossRepairForTrade(event = {}) {
  const status = String(event.status || '');
  const mode = String(event.executionMode || '').toLowerCase();
  const signal = event.signal || {};
  if (
    !isOpeningExecutionStatusForRetry(status)
    || (mode !== 'demo' && mode !== 'live')
    || !signal.symbol
    || !signal.direction
    || !signal.stopLoss
  ) {
    return;
  }

  setTimeout(() => {
    repairMissingStopLossForTrade(event).catch((error) => {
      pushLog({
        level: 'warn',
        message: `Repair SL ${signal.symbol}: ${error.message}`,
        at: new Date().toISOString()
      });
    });
  }, EXCHANGE_STOP_LOSS_REPAIR_DELAY_MS).unref();
}

async function repairMissingStopLossForTrade(event = {}) {
  const mode = String(event.executionMode || '').toLowerCase();
  const signal = event.signal || {};
  const baseConfig = configStore.getBingX({ includeSecrets: true });
  if (!baseConfig.enabled || !configAllowsRetryMode(baseConfig.mode, mode)) {
    return;
  }
  if (mode === 'live' && !baseConfig.liveConfirmed) {
    return;
  }

  const config = {
    ...baseConfig,
    mode
  };
  futuresTrader.clearOpenOrdersCache({ mode });
  const positions = await futuresTrader.getExchangeOpenPositions({ mode });
  const target = positions.find((position) => (
    position.status === 'open'
    && normalizePositionSymbol(position.symbol) === normalizePositionSymbol(signal.symbol)
    && String(position.direction || '').toUpperCase() === String(signal.direction || '').toUpperCase()
  ));

  if (!target || hasStopLossProtection(target)) {
    return;
  }

  pushLog({
    level: mode === 'live' ? 'warn' : 'info',
    message: `Repair SL ${mode}: ${signal.symbol} ${signal.direction} -> ${signal.stopLoss}.`,
    at: new Date().toISOString()
  });
  futuresTrader.clearOpenOrdersCache({ mode });
  await futuresTrader.executeStopLossSignalWithConfig({
    ...signal,
    action: 'SET_STOP_LOSS'
  }, {
    post: {
      id: event.postId || null,
      url: event.postUrl || null,
      firstSeenAt: event.at || new Date().toISOString()
    },
    phase: 'auto_stop_loss_repair'
  }, config);
  futuresTrader.clearOpenOrdersCache({ mode });
  await syncExchangePositions({ reason: 'auto_stop_loss_repair' }).catch((error) => {
    pushLog({ level: 'warn', message: `BingX sync repair SL: ${error.message}`, at: new Date().toISOString() });
  });
}

function shouldDelayExchangeSync(event = {}) {
  const status = String(event.status || '');
  return event.executionMode === 'live' && (
    status === 'live_order_sent'
    || status === 'live_close_sent'
    || status.includes('close_all')
  );
}

function markExchangeSafetyGrace(event = {}) {
  if (!isLiveCriticalEvent(event)) {
    return;
  }

  const status = String(event.status || '');
  if (status === 'live_order_sent' && event.signal?.symbol) {
    const key = exchangeSafetyPositionKey(event.signal.symbol, event.signal.direction);
    liveProtectionGraceUntil.set(key, Date.now() + EXCHANGE_PROTECTION_GRACE_MS);
  }

  if (status === 'live_close_sent' || status.includes('close_all')) {
    const positions = event.exchangeClose?.positions || [];
    for (const position of positions) {
      liveOrphanGraceUntil.set(
        exchangeSafetyPositionKey(position.symbol, position.positionSide || position.direction || exchangePositionSide(position)),
        Date.now() + EXCHANGE_ORPHAN_GRACE_MS
      );
    }
    if (!positions.length && event.signal?.symbol) {
      liveOrphanGraceUntil.set(exchangeSafetyPositionKey(event.signal.symbol, '*'), Date.now() + EXCHANGE_ORPHAN_GRACE_MS);
    }
  }
}

function isLiveCriticalEvent(event = {}) {
  const status = String(event.status || '');
  return event.executionMode === 'live'
    || status.startsWith('live_')
    || event.exchangePosition?.source === 'live';
}

function exchangeSafetyPositionKey(symbol, direction = '*') {
  return `${normalizePositionSymbol(symbol)}:${String(direction || '*').toUpperCase()}`;
}

function exchangePositionSide(position = {}) {
  const explicit = String(position.positionSide || '').toUpperCase();
  if (explicit === 'LONG' || explicit === 'SHORT') {
    return explicit;
  }
  const amount = Number(position.positionAmt || position.quantity || 0);
  return amount < 0 ? 'SHORT' : 'LONG';
}

function graceActive(map, key) {
  const until = Number(map.get(key) || 0);
  if (until <= Date.now()) {
    if (until) {
      map.delete(key);
    }
    return false;
  }
  return true;
}

function liveProtectionGraceActive(position = {}) {
  return graceActive(liveProtectionGraceUntil, exchangeSafetyPositionKey(position.symbol, position.direction));
}

function liveOrphanGraceActive(order = {}) {
  return graceActive(liveOrphanGraceUntil, exchangeSafetyPositionKey(order.symbol, order.positionSide))
    || graceActive(liveOrphanGraceUntil, exchangeSafetyPositionKey(order.symbol, '*'));
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
  const actionable = missing.filter((position) => !liveProtectionGraceActive(position));
  if (!actionable.length) {
    return;
  }
  const key = `missing-live-sl:${actionable.map((position) => `${position.symbol}:${position.direction}`).sort().join('|')}`;
  const now = Date.now();
  if (now - Number(exchangeSafetyAlerts.get(key) || 0) < EXCHANGE_SAFETY_ALERT_COOLDOWN_MS) {
    return;
  }
  exchangeSafetyAlerts.set(key, now);

  const details = [
    `${actionable.length} posicion(es) reales sin SL confirmado.`,
    `Sync: ${reason}`,
    ...actionable.map((position) => (
      `${position.symbol} ${position.direction || ''} entrada ${position.entryPrice || '-'} actual ${position.currentPrice || '-'}`
    ))
  ].join('\n');

  pushLog({
    level: 'warn',
    message: `BingX real sin SL confirmado: ${actionable.map((position) => position.symbol).join(', ')}.`,
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
  const actionable = orphanOrders.filter((order) => !liveOrphanGraceActive(order));
  if (!actionable.length) {
    return;
  }
  const key = `orphan-live-orders:${actionable.map((order) => `${order.symbol}:${order.orderId || order.clientOrderId}`).sort().join('|')}`;
  const now = Date.now();
  if (now - Number(exchangeSafetyAlerts.get(key) || 0) < EXCHANGE_SAFETY_ALERT_COOLDOWN_MS) {
    return;
  }
  exchangeSafetyAlerts.set(key, now);
  const details = [
    `${actionable.length} orden(es) protectoras reales sin posicion asociada.`,
    `Sync: ${reason}`,
    ...actionable.map((order) => `${order.symbol} ${order.type || ''} ${order.stopPrice || ''}`.trim())
  ].join('\n');
  pushLog({
    level: 'warn',
    message: `BingX real con ordenes huerfanas: ${actionable.map((order) => order.symbol).join(', ')}.`,
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
  if (!isTelegramTradeEvent(event)) {
    return;
  }
  if (!shouldNotifyTradeTelegram(event)) {
    return;
  }

  const title = telegramTradeTitle(event);
  const details = [
    event.signal?.symbol ? `${event.signal.symbol} ${event.signal.direction || event.signal.action || ''}`.trim() : '',
    event.status ? `Estado: ${event.status}` : '',
    event.sizing?.notional ? `Orden: ${formatSigned(event.sizing.notional).replace('+', '')} ${event.sizing.asset || 'USDT'}` : '',
    event.costGuard?.enabled ? costGuardAlertLine(event.costGuard) : '',
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

function shouldNotifyTradeTelegram(event = {}) {
  const status = String(event.status || '');
  if (isCloseGuardRetryStatus(status)) {
    const key = closeGuardTelegramKeyFromEvent(event);
    if (!key) {
      return true;
    }
    if (closeGuardTelegramNotifications.has(key)) {
      return false;
    }
    closeGuardTelegramNotifications.add(key);
    return true;
  }

  if (isCloseGuardTerminalStatus(status) || isCloseExecutionStatusForRetry(status)) {
    const key = closeGuardTelegramKeyFromEvent(event);
    if (key) {
      closeGuardTelegramNotifications.delete(key);
    }
  }

  return true;
}

function isCloseGuardRetryStatus(status = '') {
  const value = String(status || '');
  return value === 'demo_close_guarded' || value === 'live_close_guarded';
}

function isCloseGuardTerminalStatus(status = '') {
  const value = String(status || '');
  return value === 'demo_close_guard_expired' || value === 'live_close_guard_expired';
}

function costGuardAlertLine(costGuard = {}) {
  const asset = costGuard.asset || 'USDT';
  const status = costGuard.warn ? 'aviso' : costGuard.status || 'ok';
  const cost = Number(costGuard.bufferedRoundTripCost || costGuard.estimatedRoundTripCost || 0);
  const marginRoi = Number(costGuard.breakEvenMarginRoiPercent || 0);
  return `Coste: ${status} - ${formatSigned(cost).replace('+', '')} ${asset} / BE margen ${formatPercentNumber(marginRoi)}`;
}

function isTelegramTradeEvent(event = {}) {
  const status = String(event.status || '');
  return event.executionMode === 'live'
    || event.executionMode === 'demo'
    || status.startsWith('live_')
    || status.startsWith('demo_')
    || event.exchangePosition?.source === 'live'
    || event.exchangePosition?.source === 'demo';
}

function telegramTradeTitle(event = {}) {
  const status = String(event.status || '');
  const demo = event.executionMode === 'demo'
    || status.startsWith('demo_')
    || event.exchangePosition?.source === 'demo';
  const suffix = demo ? 'VST demo' : 'real';

  if (status === 'live_order_sent') {
    return 'Orden real enviada';
  }
  if (status === 'demo_order_sent') {
    return 'Orden VST demo enviada';
  }
  if (status === 'live_tp_sent') {
    return 'TP real colocado';
  }
  if (status === 'demo_tp_sent') {
    return 'TP VST demo colocado';
  }
  if (status === 'live_sl_sent') {
    return 'SL real colocado';
  }
  if (status === 'demo_sl_sent') {
    return 'SL VST demo colocado';
  }
  if (status.includes('close_all')) {
    return `Cierre total ${suffix}`;
  }
  if (status.includes('close_guard_expired')) {
    return `Cierre ${suffix} protegido expirado`;
  }
  if (status.includes('close_guard')) {
    return `Cierre ${suffix} protegido`;
  }
  if (status.includes('cancel_orders')) {
    return demo ? 'Ordenes VST demo canceladas' : 'Ordenes reales canceladas';
  }
  if (status.includes('close')) {
    return `Cierre ${suffix} enviado`;
  }
  return demo ? 'Evento VST demo' : 'Evento critico real';
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
  return closedNearStop({ price, stop, direction: position.direction })
    ? 'exchange_stop_closed'
    : 'exchange_position_closed';
}

function closedNearStop({ price, stop, direction }) {
  const tolerance = Math.abs(stop) * (EXCHANGE_STOP_CLOSE_TOLERANCE_PERCENT / 100);
  if (String(direction || '').toUpperCase() === 'SHORT') {
    return price >= stop - tolerance;
  }
  return price <= stop + tolerance;
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
    if (lastHealthAlertKey) {
      await notifyHealthRecovered(health);
    }
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

async function notifyHealthRecovered(health = {}) {
  const previousKey = lastHealthAlertKey;
  lastHealthAlertKey = '';
  noVisiblePostsStartedAt = 0;

  if (!previousKey) {
    return;
  }

  const details = [
    `El monitor vuelve a estar OK. Posts visibles: ${health.visiblePosts || 0}.`,
    health.lastRunAt ? `Ultima lectura: ${health.lastRunAt}.` : ''
  ].filter(Boolean).join('\n');

  await telegramNotifier.sendAlert('Scraper YouTube recuperado', details)
    .then((result) => {
      if (result.sent) {
        pushLog({ level: 'info', message: 'Recuperacion del scraper enviada por Telegram.', at: new Date().toISOString() });
      }
    })
    .catch((error) => {
      pushLog({ level: 'error', message: `Telegram health recovered: ${error.message}`, at: new Date().toISOString() });
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
  const data = event === 'state' ? currentState() : payload;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
  const value = Number(config.monthlyInitialCapitalVST || config.vstBaseCapital || 300);
  return Number.isFinite(value) && value > 0 ? value : 300;
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

async function buildReplicaAudit({ month = currentMonthKey() } = {}) {
  const portfolio = configStore.getPortfolio();
  const reference = await loadReferenceLedger({ month, portfolioUrl: portfolioSourceForReference(portfolio) });
  const config = configStore.getBingX({ includeSecrets: true });
  const publicConfig = configStore.getBingX();
  const sheetRows = (reference?.positions || [])
    .map((position, index) => ({ ...position, _auditOrder: index }))
    .filter((position) => monthKeyFromIso(position.closedAt || position.openedAt) === month)
    .sort(compareAuditSheetRows);
  const monthWindow = auditMonthWindow({ month, resetAt: config.vstPnlResetAt });
  const incomeRows = await demoIncomeRows({ config, monthWindow });
  const events = tradeEventStore.list()
    .filter(Boolean)
    .filter((event) => auditEventInWindow(event, monthWindow))
    .filter((event) => auditEventIsDemo(event));
  const rows = buildReplicaAuditRows({
    sheetRows,
    incomeRows,
    events,
    defaultNotional: publicConfig.defaultNotionalUSDT || publicConfig.monthlyOrderNotionalUSDT || 0
  });
  const summary = summarizeReplicaAudit({
    rows,
    sheetRows,
    incomeRows,
    events,
    reference,
    config: publicConfig,
    monthWindow
  });

  return {
    month,
    generatedAt: new Date().toISOString(),
    source: {
      label: reference?.sheetName || reference?.source?.label || formatMonthLabel(month),
      url: reference?.spreadsheetUrl || reference?.source?.spreadsheetUrl || portfolioSourceForReference(portfolio),
      startingCapital: reference?.startingCapital ?? null,
      equity: reference?.equity ?? null
    },
    window: {
      startAt: new Date(monthWindow.startTime).toISOString(),
      endAt: new Date(monthWindow.endTime).toISOString(),
      resetAt: config.vstPnlResetAt || null
    },
    summary,
    rows
  };
}

async function demoIncomeRows({ config, monthWindow }) {
  if (!config.apiKey || !config.apiSecret) {
    return [];
  }
  const client = futuresTrader.client({ ...config, mode: 'demo' });
  const response = await client.getIncome({
    startTime: monthWindow.startTime,
    endTime: monthWindow.endTime,
    limit: 1000
  });
  return Array.isArray(response.data) ? response.data : [];
}

function buildReplicaAuditRows({ sheetRows = [], incomeRows = [], events = [], defaultNotional = 0 }) {
  const sheetBySymbol = groupAuditRowsBySymbol(sheetRows, auditPositionSymbol);
  const openingsBySymbol = groupAuditRowsBySymbol(auditOpeningEvents(events), (event) => auditEventSymbol(event));
  const closeEventsBySymbol = groupAuditRowsBySymbol(auditCloseEvents(events), (event) => auditEventSymbol(event));
  const realizedBySymbol = groupAuditRowsBySymbol(auditIncomeByType(incomeRows, 'REALIZED_PNL'), (record) => auditIncomeSymbol(record));
  const openingFeesBySymbol = groupAuditRowsBySymbol(auditFeeRows(incomeRows, 'opening'), (record) => auditIncomeSymbol(record));
  const closingFeesBySymbol = groupAuditRowsBySymbol(auditFeeRows(incomeRows, 'closing'), (record) => auditIncomeSymbol(record));
  const fundingBySymbol = auditFundingBySymbol(incomeRows);
  const symbols = new Set([
    ...sheetBySymbol.keys(),
    ...openingsBySymbol.keys(),
    ...realizedBySymbol.keys()
  ].filter(Boolean));
  const rows = [];

  for (const symbol of [...symbols].sort()) {
    const sheet = sheetBySymbol.get(symbol) || [];
    const openings = openingsBySymbol.get(symbol) || [];
    const closes = realizedBySymbol.get(symbol) || [];
    const closeEvents = closeEventsBySymbol.get(symbol) || [];
    const openingFees = openingFeesBySymbol.get(symbol) || [];
    const closingFees = closingFeesBySymbol.get(symbol) || [];
    const max = Math.max(sheet.length, openings.length, closes.length);
    const fundingShare = closes.length ? Number(fundingBySymbol.get(symbol) || 0) / closes.length : 0;

    for (let index = 0; index < max; index += 1) {
      rows.push(replicaAuditRow({
        symbol,
        sequence: index + 1,
        sheet: sheet[index] || null,
        opening: openings[index] || null,
        realized: closes[index] || null,
        closeEvent: closeEvents[index] || null,
        openingFee: openingFees[index] || null,
        closingFee: closingFees[index] || null,
        fundingShare,
        defaultNotional
      }));
    }
  }

  return rows.sort((left, right) => (
    Number(left.orderNumber || 9999) - Number(right.orderNumber || 9999)
    || left.symbol.localeCompare(right.symbol)
    || left.sequence - right.sequence
  ));
}

function replicaAuditRow({
  symbol,
  sequence,
  sheet,
  opening,
  realized,
  closeEvent,
  openingFee,
  closingFee,
  fundingShare,
  defaultNotional
}) {
  const sheetPnl = auditNumber(sheet?.realizedPnl ?? sheet?.paperPnl, null);
  const sheetNotional = auditNumber(sheet?.notional, 0);
  const entryPrice = auditOpeningPrice(opening);
  const closePrice = auditClosePrice(closeEvent);
  const notional = auditNumber(opening?.sizing?.notional, 0) || auditNumber(opening?.notional, 0) || auditNumber(defaultNotional, 0);
  const scaleRatio = sheetNotional > 0 && notional > 0 ? notional / sheetNotional : 0;
  const replicaPnl = sheetPnl == null ? null : roundMoney(sheetPnl * scaleRatio);
  const grossPnl = realized ? roundMoney(Number(realized.income || 0)) : null;
  const fees = roundMoney(Number(openingFee?.income || 0) + Number(closingFee?.income || 0) + Number(fundingShare || 0));
  const netPnl = grossPnl == null ? null : roundMoney(grossPnl + fees);
  const entryDiffPercent = auditPercentDiff(entryPrice, sheet?.entryPrice);
  const closeDiffPercent = auditPercentDiff(closePrice, sheet?.closePrice || sheet?.currentPrice);
  const diffGross = grossPnl == null || replicaPnl == null ? null : roundMoney(grossPnl - replicaPnl);
  const diffNet = netPnl == null || replicaPnl == null ? null : roundMoney(netPnl - replicaPnl);
  const status = auditRowStatus({
    sheet,
    opening,
    realized,
    closeEvent,
    replicaPnl,
    grossPnl,
    netPnl,
    fees,
    entryDiffPercent,
    closeDiffPercent
  });

  return {
    id: [symbol, sequence, sheet?.orderNumber || 'extra'].join('|'),
    orderNumber: sheet?.orderNumber || null,
    symbol,
    sequence,
    direction: sheet?.direction || opening?.signal?.direction || closeEvent?.signal?.direction || '',
    sheet: sheet ? {
      entry: auditRound(sheet.entryPrice),
      exit: auditRound(sheet.closePrice || sheet.currentPrice),
      pnl: auditRound(sheetPnl),
      notional: auditRound(sheetNotional),
      outcome: sheet.outcome || ''
    } : null,
    replica: {
      notional: auditRound(notional),
      scaleRatio: auditRound(scaleRatio),
      pnl: auditRound(replicaPnl)
    },
    vst: {
      entry: auditRound(entryPrice),
      exit: auditRound(closePrice),
      grossPnl: auditRound(grossPnl),
      fees: auditRound(fees),
      netPnl: auditRound(netPnl),
      openingAt: opening?.at || null,
      closingAt: realized ? new Date(Number(realized.time || 0)).toISOString() : closeEvent?.at || null,
      closeStatus: closeEvent?.status || '',
      closeReason: closeEvent?.reason || '',
      postUrl: opening?.postUrl || closeEvent?.postUrl || ''
    },
    diff: {
      gross: auditRound(diffGross),
      net: auditRound(diffNet),
      entryPercent: auditRound(entryDiffPercent),
      closePercent: auditRound(closeDiffPercent)
    },
    cause: status.cause,
    detail: status.detail,
    severity: status.severity
  };
}

function auditRowStatus({
  sheet,
  opening,
  realized,
  closeEvent,
  replicaPnl,
  grossPnl,
  netPnl,
  fees,
  entryDiffPercent,
  closeDiffPercent
}) {
  if (sheet && !opening) {
    return { cause: 'No ejecutada en VST', detail: 'Existe en la hoja, pero no hay apertura demo emparejada.', severity: 'negative' };
  }
  if (!sheet && opening) {
    return { cause: 'Extra en VST', detail: 'Hay apertura demo que no aparece en la hoja externa.', severity: 'warn' };
  }
  if (opening && !realized) {
    return { cause: 'Abierta o sin cierre', detail: 'La señal entró, pero no hay cierre realizado emparejado en BingX.', severity: 'warn' };
  }
  if (String(closeEvent?.status || '') === 'exchange_stop_closed') {
    return { cause: 'Stop antes del cierre', detail: 'BingX cerró por stop antes de poder replicar la salida de la hoja.', severity: 'negative' };
  }
  if (replicaPnl != null && netPnl != null && Math.sign(replicaPnl) !== Math.sign(netPnl) && Math.abs(replicaPnl) > 0.01 && Math.abs(netPnl) > 0.01) {
    return { cause: 'Signo distinto', detail: 'La hoja gana/pierde en sentido contrario al neto VST.', severity: 'negative' };
  }
  if (grossPnl != null && Math.abs(Number(fees || 0)) > Math.max(0.5, Math.abs(grossPnl) * 0.6)) {
    return { cause: 'Fees dominan', detail: 'El coste de abrir/cerrar pesa demasiado frente al bruto de la operación.', severity: 'negative' };
  }
  if (entryDiffPercent != null && entryDiffPercent > 0.15) {
    return { cause: 'Entrada desviada', detail: 'La entrada real queda lejos de la entrada de la hoja.', severity: 'warn' };
  }
  if (closeDiffPercent != null && closeDiffPercent > 0.15) {
    return { cause: 'Salida desviada', detail: 'El cierre real queda lejos del cierre de la hoja.', severity: 'warn' };
  }
  if (replicaPnl != null && netPnl != null && Math.abs(netPnl - replicaPnl) > Math.max(1, Math.abs(replicaPnl) * 0.25)) {
    return { cause: 'Diferencia de ejecución', detail: 'La diferencia neta supera el margen normal de réplica.', severity: 'warn' };
  }
  return { cause: 'Alineada', detail: 'La operación está razonablemente cerca de la réplica teórica.', severity: 'positive' };
}

function summarizeReplicaAudit({ rows, sheetRows, incomeRows, events, reference, config, monthWindow }) {
  const sheetPnl = roundMoney(sheetRows.reduce((sum, row) => sum + Number(row.realizedPnl ?? row.paperPnl ?? 0), 0));
  const replicaPnl = roundMoney(rows.reduce((sum, row) => sum + Number(row.replica?.pnl || 0), 0));
  const bingxGross = roundMoney(rows.reduce((sum, row) => sum + Number(row.vst?.grossPnl || 0), 0));
  const bingxFees = roundMoney(auditIncomeByType(incomeRows, 'TRADING_FEE').reduce((sum, row) => sum + Number(row.income || 0), 0));
  const bingxFunding = roundMoney(auditIncomeByType(incomeRows, 'FUNDING_FEE').reduce((sum, row) => sum + Number(row.income || 0), 0));
  const bingxNet = roundMoney(bingxGross + bingxFees + bingxFunding);
  const openings = auditOpeningEvents(events);
  const closes = auditIncomeByType(incomeRows, 'REALIZED_PNL');
  const issueCounts = rows.reduce((totals, row) => {
    totals[row.cause] = (totals[row.cause] || 0) + 1;
    return totals;
  }, {});
  const worstRows = [...rows]
    .filter((row) => Number.isFinite(Number(row.diff?.net)))
    .sort((left, right) => Math.abs(Number(right.diff.net || 0)) - Math.abs(Number(left.diff.net || 0)))
    .slice(0, 8)
    .map((row) => row.id);

  return {
    sheetRows: sheetRows.length,
    vstOpenings: openings.length,
    vstCloses: closes.length,
    incomeRecords: incomeRows.length,
    eventRecords: events.length,
    sheetPnl,
    replicaPnl,
    bingxGross,
    bingxFees,
    bingxFunding,
    bingxNet,
    grossGap: roundMoney(bingxGross - replicaPnl),
    netGap: roundMoney(bingxNet - replicaPnl),
    monthlyOrderPercent: config.monthlyOrderPercent || null,
    monthlyInitialCapitalVST: config.monthlyInitialCapitalVST || config.vstBaseCapital || null,
    defaultNotionalVST: config.defaultNotionalUSDT || null,
    startingCapital: reference?.startingCapital ?? null,
    equity: reference?.equity ?? null,
    issueCounts,
    worstRows,
    resetApplied: Number.isFinite(monthWindow.resetAt) && monthWindow.resetAt > 0
  };
}

function auditMonthWindow({ month, resetAt = null }) {
  const [year, monthNumber] = String(month || currentMonthKey()).split('-').map(Number);
  const start = new Date(year, (monthNumber || 1) - 1, 1);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const now = Date.now();
  const resetTime = Date.parse(resetAt || 0);
  const sameResetMonth = Number.isFinite(resetTime) && currentMonthKeyForDate(new Date(resetTime)) === month;
  const startTime = sameResetMonth ? Math.max(start.getTime(), resetTime) : start.getTime();
  return {
    startTime,
    endTime: Math.min(next.getTime() - 1, now),
    resetAt: sameResetMonth ? resetTime : 0
  };
}

function auditEventInWindow(event = {}, window) {
  event = event || {};
  const timestamp = Date.parse(event.at || 0);
  return Number.isFinite(timestamp) && timestamp >= window.startTime && timestamp <= window.endTime;
}

function auditEventIsDemo(event = {}) {
  event = event || {};
  const status = String(event.status || '').toLowerCase();
  const mode = String(event.executionMode || '').toLowerCase();
  const source = String(event.exchangePosition?.source || event.position?.source || '').toLowerCase();
  return mode === 'demo' || status.startsWith('demo_') || source === 'demo';
}

function auditOpeningEvents(events = []) {
  return events
    .filter((event) => String(event.status || '') === 'demo_order_sent')
    .sort(compareAuditEventTime);
}

function auditCloseEvents(events = []) {
  return events
    .filter((event) => (
      String(event.status || '') === 'exchange_signal_closed'
      || String(event.status || '') === 'exchange_stop_closed'
      || String(event.status || '') === 'exchange_position_closed'
    ))
    .sort(compareAuditEventTime);
}

function auditIncomeByType(rows = [], type = '') {
  const target = String(type || '').toUpperCase();
  return rows
    .filter((row) => String(row.incomeType || '').toUpperCase() === target)
    .sort((left, right) => Number(left.time || 0) - Number(right.time || 0));
}

function auditFeeRows(rows = [], phase = '') {
  const pattern = new RegExp(phase, 'i');
  return auditIncomeByType(rows, 'TRADING_FEE')
    .filter((row) => pattern.test(String(row.info || '')));
}

function auditFundingBySymbol(rows = []) {
  const totals = new Map();
  for (const row of auditIncomeByType(rows, 'FUNDING_FEE')) {
    const symbol = auditIncomeSymbol(row);
    totals.set(symbol, roundMoney((totals.get(symbol) || 0) + Number(row.income || 0)));
  }
  return totals;
}

function groupAuditRowsBySymbol(rows = [], symbolFactory) {
  const groups = new Map();
  for (const row of rows) {
    const symbol = symbolFactory(row);
    if (!symbol) {
      continue;
    }
    if (!groups.has(symbol)) {
      groups.set(symbol, []);
    }
    groups.get(symbol).push(row);
  }
  return groups;
}

function compareAuditSheetRows(left, right) {
  return Number(left.orderNumber || left._auditOrder || 0) - Number(right.orderNumber || right._auditOrder || 0);
}

function compareAuditEventTime(left, right) {
  return Date.parse(left.at || 0) - Date.parse(right.at || 0);
}

function auditPositionSymbol(position = {}) {
  position = position || {};
  return normalizePositionSymbol(position.symbol || '');
}

function auditEventSymbol(event = {}) {
  event = event || {};
  return normalizePositionSymbol(event.signal?.symbol || event.order?.symbol || event.exchangePosition?.symbol || '');
}

function auditIncomeSymbol(record = {}) {
  record = record || {};
  return normalizePositionSymbol(record.symbol || '');
}

function auditOpeningPrice(event = {}) {
  event = event || {};
  return auditNumber(event.entryPrice ?? event.response?.data?.order?.avgPrice ?? event.marketPrice, null);
}

function auditClosePrice(event = {}) {
  event = event || {};
  return auditNumber(event.exchangePosition?.closePrice ?? event.exchangePosition?.currentPrice ?? event.closePrice, null);
}

function auditPercentDiff(actual, expected) {
  const left = Number(actual);
  const right = Number(expected);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= 0) {
    return null;
  }
  return Math.abs(left - right) / right * 100;
}

function auditNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function auditRound(value) {
  return value == null || !Number.isFinite(Number(value)) ? null : roundMoney(value);
}

function formatMonthLabel(month) {
  const [year, value] = String(month || '').split('-');
  return value && year ? `${value}/${year}` : String(month || '');
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

function scheduleBackendRestart(reason = 'manual') {
  if (backendRestartScheduled) {
    return;
  }
  backendRestartScheduled = true;
  pushLog({
    level: 'warn',
    message: `Reinicio de backend solicitado (${reason}).`,
    at: new Date().toISOString()
  });
  setTimeout(() => {
    shutdown().catch((error) => {
      console.error(`Backend restart failed: ${error.message}`);
      process.exit(1);
    });
  }, 350).unref();
}

async function shutdown() {
  for (const client of clients) {
    client.end();
  }
  clients.clear();
  priceFeed.destroy();
  if (backupTimer) {
    clearInterval(backupTimer);
  }
  for (const item of pendingStopLossRetries.values()) {
    if (item.timer) {
      clearTimeout(item.timer);
    }
  }
  pendingStopLossRetries.clear();
  for (const item of pendingCloseGuardRetries.values()) {
    if (item.timer) {
      clearTimeout(item.timer);
    }
  }
  pendingCloseGuardRetries.clear();
  await scraper.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

function formatSigned(value) {
  const number = Number(value || 0);
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${Math.round((number + Number.EPSILON) * 10000) / 10000}`;
}

function formatPercentNumber(value) {
  const number = Number(value || 0);
  return `${Math.round((number + Number.EPSILON) * 100) / 100}%`;
}

function currentMonthKey() {
  return currentMonthKeyForDate(new Date());
}

function currentMonthKeyForDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthKeyFromIso(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? currentMonthKeyForDate(date) : '';
}

function monthStartDate(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
