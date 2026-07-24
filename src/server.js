import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { constants as zlibConstants, createBrotliCompress, createGzip } from 'node:zlib';
import { ConfigStore } from './configStore.js';
import { buildCohortComparison } from './cohortComparison.js';
import { coverageRecoveryCandidates } from './coverageRecovery.js';
import { BingXClient } from './bingxClient.js';
import { estimateBingXClockSample } from './bingxClock.js';
import { BingXPriceWebSocket } from './bingxPriceWebSocket.js';
import { buildSecureBackupStatus } from './backupContinuity.js';
import { backupStorageAlertAction, inspectBackupStorage } from './backupStorage.js';
import { isOpeningExecutionStatus, isRetryableOpeningEvent } from './executionReliability.js';
import { ExecutionRetryStore } from './executionRetryStore.js';
import { exchangeProtectionGaps, hasStopLossProtection } from './exchangeProtection.js';
import { FuturesTrader, validateEntryDeviation } from './futuresTrader.js';
import { applySecurityHeaders, authorizeHttpRequest, buildHttpSecurity, createMutationRateLimiter, validateMutationOrigin } from './httpSecurity.js';
import { buildHistoricalPnl } from './historicalPnl.js';
import { PaperTradeStore } from './paperTradeStore.js';
import { detectPortfolioUrl } from './portfolioDetector.js';
import { editedOpeningSignals } from './editedSignalRecovery.js';
import { closeAdverseDeviationPercent, entryAdverseDeviationPercent, resolveCloseFill, resolveCloseReference, resolveEntryFill, resolveEntryReference } from './executionAuditPrices.js';
import { applyPnlSourcesFallback, PnlSnapshotStore } from './pnlSnapshotStore.js';
import { buildPromotionGate } from './promotionGate.js';
import { alignReplicaAuditRecords } from './replicaAuditMatcher.js';
import { annotateReplicaReferenceCoverage, buildCloseExecutionAnalysis, buildCloseFailureAttempts, buildEntryExecutionAnalysis, buildExecutionPriceChainAttribution, buildExecutionRouteAnalysis, buildMatchedGapAttribution, buildNetEntryShadowAudit, buildOpeningFailureAttempts, buildReplicaGapBridge, buildUnprocessedCloseSignals, classifyPairedOutcome, cohortAuditRowHasOrigin, cohortSampleStatus, cohortWindowBounds, commissionEvidence, estimateReplicaEconomics, isRetryableCloseError, observedCloseKind, referenceCoverageEndTime, replicaStopAlignment, scopeReplicaCohortInputs, summarizeExecutionLatency, summarizePairedOutcomeImpact, summarizePairedOutcomes, summarizeReplicaStops } from './operationalAudit.js';
import { groupOperationalIncidents, summarizeOperationalIncidents } from './operationalIncidents.js';
import {
  buildMonthlyPnlBoundary,
  monthlyEquityDelta,
  monthlyPnlAdjustment,
  monthlyResetPlan,
  nextMonthlyResetCheckDelay
} from './monthlyAccounting.js';
import { buildSignalCoverage } from './signalCoverage.js';
import { formatSseEvent, formatSseRetry } from './sseTransport.js';
import { applyReferenceLedger, clearReferenceLedgerCache, loadReferenceLedger, resolvePortfolioSource } from './referenceLedger.js';
import { PostStore } from './store.js';
import { etagMatches, isCompressibleStatic, selectStaticEncoding, staticEtag } from './staticDelivery.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { TradeEventStore } from './tradeEventStore.js';
import { YouTubePostsScraper, normalizePostsUrl, normalizeTelegramWebUrl } from './youtubeScraper.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const execFileAsync = promisify(execFile);
const rootDir = resolve(__dirname, '..');
const publicDir = join(rootDir, 'public');
const vendorAssets = new Map([
  ['/vendor/lucide.min.js', join(rootDir, 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js')],
  ['/vendor/plotly.min.js', join(rootDir, 'node_modules', 'plotly.js-dist-min', 'plotly.min.js')]
]);
const dataDir = join(rootDir, '.data');
const backupDir = join(dataDir, 'backups');
const secureBackupDir = join(backupDir, 'secure');
const secureBackupStatusFile = join(secureBackupDir, 'status.json');
const profileDir = join(rootDir, '.yt-profile');
const port = Number(process.env.PORT || 5178);
const httpSecurity = buildHttpSecurity();
const host = httpSecurity.host;
const mutationRateLimiter = createMutationRateLimiter();
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
const MONTHLY_RESET_CHECK_MAX_MS = 60 * 60 * 1000;
const PNL_CACHE_TTL_MS = 45_000;
const ORDER_HISTORY_OVERLAP_MS = 10 * 60 * 1000;
const ORDER_HISTORY_MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 - 1000;
const PNL_BACKOFF_DEFAULT_MS = 5 * 60 * 1000;
const PNL_BACKOFF_MAX_MS = 15 * 60 * 1000;
const REDACTED_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BACKUP_STORAGE_CHECK_MS = 15 * 60 * 1000;
const BACKUP_STORAGE_CACHE_MS = 60 * 1000;
const BACKUP_STORAGE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const BACKEND_RESTART_CONFIRMATION = 'REINICIAR_BACKEND';
const STOP_LOSS_RETRY_FIRST_DELAY_MS = 10_000;
const STOP_LOSS_RETRY_INTERVAL_MS = 15_000;
const STOP_LOSS_RETRY_MAX_AGE_MS = 3 * 60 * 1000;
const STOP_LOSS_RETRY_MAX_ATTEMPTS = 12;
const SIGNAL_COVERAGE_RECOVERY_GRACE_MS = 20_000;
const CLOSE_GUARD_RETRY_FIRST_DELAY_MS = 10_000;
const CLOSE_GUARD_RETRY_INTERVAL_MS = 15_000;
const CLOSE_GUARD_RETRY_MAX_AGE_MS = 3 * 60 * 1000;
const CLOSE_GUARD_RETRY_MAX_ATTEMPTS = 12;
const SIGNAL_COVERAGE_CHECK_MS = 60_000;
const ENTRY_QUOTE_WATCH_MS = 10 * 60 * 1000;
const ENTRY_QUOTE_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const ENTRY_QUOTE_HISTORY_MAX_SYMBOLS = 24;
const BINGX_CLOCK_POLL_MS = 5 * 60 * 1000;
const BINGX_CLOCK_STALE_MS = 15 * 60 * 1000;
const SSE_HEARTBEAT_INTERVAL_MS = 15_000;
const SSE_RETRY_MS = 3_000;
const serverRuntime = Object.freeze({
  id: randomUUID(),
  startedAt: new Date().toISOString()
});

await mkdir(dataDir, { recursive: true });
await mkdir(profileDir, { recursive: true });

const store = new PostStore(join(dataDir, 'posts.json'));
await store.init();

const configStore = new ConfigStore(join(dataDir, 'config.json'));
await configStore.init();
await configStore.ensureImprovementCohort();

const paperStore = new PaperTradeStore(join(dataDir, 'paper-trades.json'));
await paperStore.init();

const tradeEventStore = new TradeEventStore(join(dataDir, 'trade-events.json'));
await tradeEventStore.init();

const executionRetryStore = new ExecutionRetryStore(join(dataDir, 'execution-retries.json'));
await executionRetryStore.init();

const pnlSnapshotStore = new PnlSnapshotStore(join(dataDir, 'pnl-snapshots.json'));
await pnlSnapshotStore.init();

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
  watchMarketSymbols: (symbols) => watchEntryMarketSymbols(symbols),
  marketQuoteSnapshot: (symbol) => priceFeed.quoteSnapshot(symbol, { maxAgeMs: 5000 }),
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
let demoOrderHistoryCache = null;
let pnlLastGood = null;
let pnlSourcesLastGood = pnlSnapshotStore.getSources(currentMonthKey());
let pnlBackoffUntil = 0;
let pnlBackoffReason = '';
let backupTimer = null;
let backupStorageTimer = null;
let backupStorageCheckInFlight = null;
let backupStorageStatus = {
  available: false,
  checkedAt: null,
  level: 'unavailable',
  reason: 'inspection_unavailable',
  lastError: null
};
let backupStorageLastAlertAt = 0;
let backupStorageLastAlertLevel = null;
let signalCoverageTimer = null;
let bingxClockTimer = null;
let monthlyResetTimer = null;
let monthlyResetInFlight = null;
let bingxClockInFlight = null;
let bingxClockStatus = {
  available: false,
  source: 'bingx_server_time',
  environment: null,
  checkedAt: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  error: null,
  observationalOnly: true
};
let lastBackupStatus = {
  lastRunAt: null,
  nextRunAt: null,
  lastFile: null,
  lastError: null
};
const lastPriceBroadcast = new Map();
const entryQuoteWatchUntil = new Map();
const persistentEntryQuoteSeenAt = new Map();
let persistentEntryQuoteSymbolsSeeded = false;
let entryQuoteWatchTimer = null;
let exchangeOpenSymbols = new Set();
let exchangePositionsCache = [];
let exchangeBalancesCache = {};
let exchangeOpenOrdersCache = [];
let exchangeSyncInFlight = false;
let lastExchangeSyncAt = 0;
let lastExchangeSyncReason = '';
let backendRestartScheduled = false;
let shutdownPromise = null;
const pendingExchangeClosures = new Map();
const exchangeSafetyAlerts = new Map();
const liveProtectionGraceUntil = new Map();
const liveOrphanGraceUntil = new Map();
const pendingStopLossRetries = new Map();
const pendingCloseGuardRetries = new Map();
const openingRetryTelegramNotifications = new Set();
const closeGuardTelegramNotifications = new Set();
const signalCoverageNotifications = new Set();
const signalCoverageRecoveryInFlight = new Set();
let tradeProcessingQueue = Promise.resolve();

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
  signalCoverage: null,
  promotionGate: null,
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
  state.priceFeed = priceFeedState(status);
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

  if (result.edited.length && payload.source !== 'telegram_web') {
    await recoverEditedPostOpenings(result.edited);
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

    const tradeResults = await enqueueTradeProcessing(result.inserted, payload, tradePlan.options);
    const accepted = tradeResults.filter((tradeResult) => tradeResult.status.endsWith('_order_sent'));
    if (accepted.length) {
      const modes = [...new Set(accepted.map((tradeResult) => tradeResult.status.replace(/_order_sent$/, '')))];
      const executionMode = modes.join('+');
      pushLog({
        level: 'warn',
        message: `${accepted.length} señales enviadas a BingX (${executionMode}).`,
        at: new Date().toISOString()
      });
    }
    await refreshSignalCoverage({ notify: true, recover: true });
    const delayedCoverageCheck = setTimeout(() => {
      refreshSignalCoverage({ notify: true, recover: true }).catch((error) => {
        pushLog({ level: 'warn', message: `Cobertura de señales: ${error.message}`, at: new Date().toISOString() });
      });
    }, STOP_LOSS_RETRY_MAX_AGE_MS + 5_000);
    delayedCoverageCheck.unref();
  }
}

function enqueueTradeProcessing(posts, payload, options) {
  const task = tradeProcessingQueue
    .catch(() => null)
    .then(() => futuresTrader.processPosts(posts, payload, options));
  tradeProcessingQueue = task.catch(() => null);
  return task;
}

async function recoverEditedPostOpenings(edits = []) {
  const config = configStore.getBingX({ includeSecrets: true });
  if (!config.enabled || config.mode !== 'demo') {
    return 0;
  }

  let attempted = 0;
  for (const edit of edits) {
    const signals = editedOpeningSignals({
      previousText: edit.previousText,
      currentText: edit.currentText,
      parseSignals: (text) => futuresTrader.parseAll(text)
    });
    for (const signal of signals) {
      await enqueueCoverageRecovery({
        signal,
        post: edit.post,
        phase: 'edited_post_recovery',
        logMessage: `Recuperando apertura corregida en una edicion de YouTube: ${signal.symbol} ${signal.direction}.`
      });
      attempted += 1;
    }
  }

  if (attempted) {
    await refreshSignalCoverage({ notify: true, recover: true });
  }
  return attempted;
}

async function recoverMissingCoverageExecutions(coverage) {
  const config = configStore.getBingX({ includeSecrets: true });
  if (!config.enabled || config.mode !== 'demo') {
    return 0;
  }
  const candidates = coverageRecoveryCandidates({
    coverage,
    posts: store.list(),
    parseSignals: (text) => futuresTrader.parseAll(text),
    executionMode: 'demo',
    graceMs: SIGNAL_COVERAGE_RECOVERY_GRACE_MS,
    maxAgeMs: STOP_LOSS_RETRY_MAX_AGE_MS
  });
  let attempted = 0;
  for (const candidate of candidates) {
    if (signalCoverageRecoveryInFlight.has(candidate.key)) {
      continue;
    }
    signalCoverageRecoveryInFlight.add(candidate.key);
    try {
      await enqueueCoverageRecovery(candidate);
      attempted += 1;
    } finally {
      signalCoverageRecoveryInFlight.delete(candidate.key);
    }
  }
  return attempted;
}

function enqueueCoverageRecovery(candidate) {
  const task = tradeProcessingQueue
    .catch(() => null)
    .then(async () => {
      const duplicate = duplicateOpenSignalGuard(candidate.signal);
      if (duplicate) {
        return futuresTrader.emitTrade({
          at: new Date().toISOString(),
          signal: candidate.signal,
          postId: candidate.post?.id || null,
          postUrl: candidate.post?.url || null,
          phase: 'coverage_recovery',
          executionMode: duplicate.executionMode || 'demo',
          executionKey: duplicate.executionKey || null,
          status: 'skipped',
          reason: 'duplicate_open_signal',
          duplicateOf: duplicate.eventId || null,
          duplicateAt: duplicate.at || null
        });
      }

      pushLog({
        level: 'warn',
        message: candidate.logMessage || `Recuperando hueco de cobertura Demo: ${candidate.signal.symbol} ${candidate.signal.direction}.`,
        at: new Date().toISOString()
      });
      return futuresTrader.executeSignal(candidate.signal, {
        post: candidate.post,
        phase: candidate.phase || 'coverage_recovery'
      });
    });
  tradeProcessingQueue = task.catch(() => null);
  return task;
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
    at: duplicate.at || null,
    executionMode: duplicate.executionMode || executionModeFromOpeningStatus(duplicate.status),
    executionKey: duplicate.executionKey || null
  };
}

function executionModeFromOpeningStatus(status = '') {
  const match = String(status || '').match(/^(test|demo|live)_order_sent$/);
  return match?.[1] || '';
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
  const config = configStore.getBingX();
  return isRetryableOpeningEvent(event, {
    vstTechnicalReserveEnabled: Boolean(config.vstTechnicalReserveEnabled)
  });
}

function shouldQueueCloseGuardRetry(event = {}) {
  const status = String(event.status || '');
  const mode = String(event.executionMode || '').toLowerCase();
  const signal = event.signal || {};
  const action = String(signal.action || '').toUpperCase();
  if ((mode !== 'demo' && mode !== 'live') || (action !== 'CLOSE' && action !== 'CLOSE_ALL')) {
    return false;
  }
  if (status === `${mode}_close_guarded`) {
    return action === 'CLOSE' && Boolean(signal.symbol) && Number(signal.closePrice) > 0;
  }
  return status === 'error' && isRetryableCloseError(event.reason);
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
    persistExecutionRetry('opening', existing);
    broadcast('state', state);
    return existing;
  }

  const now = Date.now();
  const item = {
    kind: 'opening',
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
  persistExecutionRetry('opening', item);
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
    persistExecutionRetry('close', existing);
    broadcast('state', state);
    return existing;
  }

  const now = Date.now();
  const item = {
    kind: 'close',
    key,
    signal: event.signal,
    post: {
      id: event.postId || null,
      url: event.postUrl || null,
      firstSeenAt: event.at || new Date().toISOString()
    },
    originalPhase: event.phase || null,
    executionMode: String(event.executionMode || '').toLowerCase(),
    retryKind: event.status === 'error' ? 'exchange_error' : 'close_guard',
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
  persistExecutionRetry('close', item);
  pushLog({
    level: 'warn',
    message: `Cierre pendiente ${item.executionMode}: ${item.signal.symbol || 'todas las posiciones'} (${item.retryKind}).`,
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
  persistExecutionRetry('opening', item);
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
  persistExecutionRetry('close', item);
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
        message: `Reintento cierre ${current.signal.symbol || 'total'}: ${error.message}`,
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

  await syncExchangePositions({ reason: 'opening_retry_preflight' }).catch((error) => {
    pushLog({
      level: 'warn',
      message: `Reconciliacion previa a reintento ${item.signal.symbol}: ${error.message}`,
      at: new Date().toISOString()
    });
  });
  if (hasOpenPositionForStopLossRetry(item) || hasOpeningExecutionForStopLossRetry(item)) {
    clearStopLossRetry(key, 'already_open');
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
  persistExecutionRetry('opening', item);

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
  persistExecutionRetry('close', item);

  pushLog({
    level: 'warn',
    message: `Reintentando cierre ${item.executionMode}: ${item.signal.symbol || 'todas las posiciones'}.`,
    at: new Date().toISOString()
  });

  const result = item.signal.action === 'CLOSE_ALL'
    ? await futuresTrader.executeCloseAllSignalWithConfig(item.signal, {
      post: item.post,
      phase: 'close_execution_retry'
    }, config)
    : await futuresTrader.executeCloseSignalWithConfig(item.signal, {
      post: item.post,
      phase: 'close_execution_retry'
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

  const entryValidation = validateEntryDeviation({
    signal: item.signal,
    marketPrice,
    referenceEntryPrice: item.signal.entry?.price,
    config,
    forceMarketEntry: true
  });
  if (!entryValidation.ok) {
    return {
      ok: false,
      marketPrice,
      reason: entryValidation.reason
    };
  }

  return { ok: true, marketPrice, reason: '' };
}

function rescheduleOrExpireStopLossRetry(item, reason) {
  if (!item || !pendingStopLossRetries.has(item.key)) {
    return;
  }
  item.lastReason = reason || item.lastReason;
  persistExecutionRetry('opening', item);
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
  persistExecutionRetry('close', item);
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
    message: `Cierre pendiente expirado ${item.executionMode}: último intento para ${item.signal.symbol || 'todas las posiciones'}.`,
    at: new Date().toISOString()
  });

  try {
    const result = item.signal.action === 'CLOSE_ALL'
      ? await futuresTrader.executeCloseAllSignalWithConfig(item.signal, {
        post: item.post,
        phase: 'close_execution_retry_expired'
      }, config)
      : await futuresTrader.executeCloseSignalWithConfig(item.signal, {
        post: item.post,
        phase: 'close_execution_retry_expired',
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
  const retryKind = item.retryKind || 'close_guard';
  const event = {
    at: new Date().toISOString(),
    status: retryKind === 'exchange_error'
      ? `${item.executionMode}_close_retry_expired`
      : `${item.executionMode}_close_guard_expired`,
    reason,
    signal: item.signal,
    postId: item.post?.id || null,
    postUrl: item.post?.url || null,
    phase: retryKind === 'exchange_error' ? 'close_execution_retry' : 'close_guard_retry',
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
  removePersistedExecutionRetry('opening', key);
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
  removePersistedExecutionRetry('close', key);
  if (reason) {
    pushLog({
      level: reason === 'closed' ? 'info' : 'warn',
      message: `Reintento de cierre finalizado ${item.signal?.symbol || 'total'}: ${reason}.`.trim(),
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
  if (event.executionKey) {
    return String(event.executionKey);
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
  const action = String(signal.action || '').toUpperCase();
  if (!mode || (action !== 'CLOSE' && action !== 'CLOSE_ALL')) {
    return '';
  }
  return [
    mode,
    event.postId || '',
    action,
    normalizePositionSymbol(signal.symbol || '__ALL__'),
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
  return isOpeningExecutionStatus(status);
}

function isCloseExecutionStatusForRetry(status) {
  const value = String(status || '');
  return value === 'demo_close_sent'
    || value === 'live_close_sent'
    || value === 'demo_close_no_position'
    || value === 'live_close_no_position'
    || value === 'demo_close_all_sent'
    || value === 'live_close_all_sent'
    || value === 'demo_close_all_no_position'
    || value === 'live_close_all_no_position';
}

function stopLossRetryQueueState() {
  return [...pendingStopLossRetries.values()].map(publicStopLossRetryItem);
}

function closeGuardRetryQueueState() {
  return [...pendingCloseGuardRetries.values()].map(publicCloseGuardRetryItem);
}

function persistExecutionRetry(kind, item) {
  executionRetryStore.upsert({
    ...item,
    kind,
    timer: undefined
  }).catch((error) => {
    pushLog({
      level: 'error',
      message: `Persistencia de reintento ${kind}: ${error.message}`,
      at: new Date().toISOString()
    });
  });
}

function removePersistedExecutionRetry(kind, key) {
  executionRetryStore.remove(kind, key).catch((error) => {
    pushLog({
      level: 'error',
      message: `Limpieza de reintento ${kind}: ${error.message}`,
      at: new Date().toISOString()
    });
  });
}

function hydrateExecutionRetryQueuesFromStore() {
  for (const stored of executionRetryStore.list()) {
    const item = {
      ...stored,
      timer: null
    };
    const nextAt = Date.parse(item.nextRunAt || 0);
    const delay = Number.isFinite(nextAt) ? Math.max(1000, nextAt - Date.now()) : 1000;
    if (item.kind === 'opening' && !pendingStopLossRetries.has(item.key)) {
      pendingStopLossRetries.set(item.key, item);
      scheduleStopLossRetryTimer(item, delay);
    }
    if (item.kind === 'close' && !pendingCloseGuardRetries.has(item.key)) {
      pendingCloseGuardRetries.set(item.key, item);
      scheduleCloseGuardRetryTimer(item, delay);
    }
  }
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
    action: item.signal?.action || 'CLOSE',
    retryKind: item.retryKind || 'close_guard',
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
    applySecurityHeaders(response);
    const requestUrl = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);
    const authorization = authorizeHttpRequest(request, requestUrl, httpSecurity);
    if (!authorization.ok) {
      response.setHeader('www-authenticate', 'Basic realm="Futures Magician", charset="UTF-8"');
      return sendJson(response, { error: authorization.reason }, authorization.status);
    }
    const originValidation = validateMutationOrigin(request);
    if (!originValidation.ok) {
      return sendJson(response, { error: originValidation.reason }, originValidation.status);
    }
    const rateLimit = mutationRateLimiter(request);
    if (!rateLimit.ok) {
      response.setHeader('retry-after', String(rateLimit.retryAfterSeconds));
      return sendJson(response, { error: rateLimit.reason }, rateLimit.status);
    }

    if (requestUrl.pathname === '/api/events') {
      return handleEvents(response);
    }

    if (requestUrl.pathname === '/api/state' && request.method === 'GET') {
      return sendJson(response, currentState());
    }

    if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, { ok: true, runtime: serverRuntime, health: buildHealth() });
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
      const credentialsChanged = Boolean(String(body.apiKey || '').trim() || String(body.apiSecret || '').trim());
      await clearPnlCaches({ clearSnapshots: credentialsChanged });
      broadcast('bingx', { bingx });
      notifyBingxPauseChange(previous, bingx);
      measureBingXClock({ reason: 'config_changed' }).catch(() => {});
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

    if (requestUrl.pathname === '/api/bingx/vst-reserve' && request.method === 'POST') {
      const body = await readJson(request);
      if (body.confirm !== 'ACTIVAR_RESERVA_VST') {
        return sendJson(response, { error: 'Confirma ACTIVAR_RESERVA_VST para activar la reserva técnica demo.' }, 400);
      }
      await configStore.updateVstTechnicalReserve({
        enabled: true,
        targetVST: body.targetVST || 500
      });
      const reserve = await futuresTrader.ensureVstTechnicalReserve({
        force: true,
        phase: 'manual_vst_reserve_activation'
      });
      await clearPnlCaches({ clearSnapshots: true });
      await syncExchangePositions({ reason: 'vst_reserve_activation' }).catch(() => exchangePositionsCache);
      const updated = configStore.getBingX();
      broadcast('bingx', { bingx: updated });
      return sendJson(response, { ok: true, bingx: updated, reserve });
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
      const forceRefresh = readRefreshRequested(requestUrl);
      if (!forceRefresh && pnlCache && pnlCache.months === String(months) && Date.now() - pnlCache.at < PNL_CACHE_TTL_MS) {
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
        await rememberPnlSnapshot({ months: String(months), at: Date.now(), pnl });
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
      const forceRefresh = readRefreshRequested(requestUrl);
      if (!forceRefresh && pnlSourcesCache && Date.now() - pnlSourcesCache.at < PNL_CACHE_TTL_MS) {
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
          cooldownUntil: new Date(cooldown.until).toISOString(),
          lastGoodAt: new Date(pnlSourcesLastGood.at).toISOString()
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
      const sourceErrors = {
        vst: vst.source?.error || '',
        live: live.source?.error || ''
      };
      const sourceWarning = Object.values(sourceErrors).find(Boolean) || '';
      const cooldownUntil = sourceWarning && isRetryableCloseError(sourceWarning)
        ? startPnlBackoff(new Error(sourceWarning))
        : 0;

      let payload = {
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
      payload = applyPnlSourcesFallback({
        payload,
        sourceErrors,
        snapshot: pnlSourcesLastGood
      });
      pnlSourcesCache = { at: Date.now(), payload };
      if (!sourceWarning) {
        await rememberPnlSourcesSnapshot({ at: Date.now(), payload });
      }
      return sendJson(response, payload);
    }

    if (requestUrl.pathname === '/api/risk' && request.method === 'GET') {
      const risk = await futuresTrader.refreshRiskSnapshot();
      return sendJson(response, {
        ok: true,
        risk,
        exchangeSafety: buildExchangeSafety(),
        bingx: configStore.getBingX()
      });
    }

    if (requestUrl.pathname === '/api/price-feed' && request.method === 'GET') {
      return sendJson(response, { ok: true, priceFeed: priceFeedState() });
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
        portfolioUrl: referencePortfolioUrl,
        forceRefresh: readRefreshRequested(requestUrl)
      });
      return sendJson(response, { ok: true, historical });
    }

    if (requestUrl.pathname === '/api/reference-ledger' && request.method === 'GET') {
      const month = requestUrl.searchParams.get('month') || currentMonthKey();
      const portfolio = configStore.getPortfolio();
      const reference = await loadReferenceLedger({
        month,
        portfolioUrl: portfolioSourceForReference(portfolio),
        forceRefresh: readRefreshRequested(requestUrl)
      });
      return sendJson(response, { ok: true, reference });
    }

    if (requestUrl.pathname === '/api/replica-audit' && request.method === 'GET') {
      const month = requestUrl.searchParams.get('month') || currentMonthKey();
      const forceRefresh = readRefreshRequested(requestUrl);
      if (!forceRefresh && replicaAuditCache?.month === month && Date.now() - replicaAuditCache.at < PNL_CACHE_TTL_MS) {
        return sendJson(response, { ok: true, audit: replicaAuditCache.audit, cached: true });
      }
      const audit = await buildReplicaAudit({ month, forceRefresh });
      replicaAuditCache = { month, at: Date.now(), audit };
      state.promotionGate = buildCurrentPromotionGate();
      broadcast('state', state);
      return sendJson(response, { ok: true, audit });
    }

    if (requestUrl.pathname === '/api/replica-audit/cohort/start' && request.method === 'POST') {
      const body = await readJson(request);
      if (body.confirm !== 'INICIAR_COHORTE') {
        return sendJson(response, { error: 'Confirma INICIAR_COHORTE para iniciar una nueva cohorte.' }, 400);
      }
      const bingx = await configStore.resetImprovementCohort({ startedAt: body.startedAt || new Date() });
      replicaAuditCache = null;
      signalCoverageNotifications.clear();
      const signalCoverage = await refreshSignalCoverage({ notify: false });
      return sendJson(response, {
        ok: true,
        startedAt: bingx.improvementCohortStartedAt,
        signalCoverage
      });
    }

    if (requestUrl.pathname === '/api/signal-coverage' && request.method === 'GET') {
      const signalCoverage = await refreshSignalCoverage({ notify: false });
      return sendJson(response, { ok: true, signalCoverage });
    }

    if (requestUrl.pathname === '/api/execution-packages' && request.method === 'GET') {
      const signalCoverage = await refreshSignalCoverage({ notify: false });
      return sendJson(response, {
        ok: true,
        signalCoverage,
        openingRetries: stopLossRetryQueueState(),
        closeRetries: closeGuardRetryQueueState(),
        promotionGate: buildCurrentPromotionGate(signalCoverage)
      });
    }

    if (requestUrl.pathname === '/api/promotion-gate' && request.method === 'GET') {
      return sendJson(response, {
        ok: true,
        promotionGate: buildCurrentPromotionGate()
      });
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
      const secureBackup = await loadSecureBackupStatus();
      return sendJson(response, {
        ok: true,
        generatedAt: new Date().toISOString(),
        health: buildHealth(),
        exchangeSafety: buildExchangeSafety(),
        incidents: buildIncidentSnapshot(secureBackup),
        backup: lastBackupStatus,
        secureBackup,
        pnlBackoff: pnlBackoffInfo(),
        priceFeed: priceFeedState(),
        signalCoverage: state.signalCoverage,
        promotionGate: buildCurrentPromotionGate()
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

    return serveStatic(requestUrl.pathname, request, response);
  } catch (error) {
    pushLog({ level: 'error', message: error.message, at: new Date().toISOString() });
    return sendJson(response, { error: error.message }, Number(error.statusCode || 500));
  }
});

server.once('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    const owner = await portOwnerSummary(port);
    console.error(`No se puede iniciar: el puerto ${port} ya lo usa ${owner}. No se cambiara de puerto automaticamente.`);
  } else {
    console.error(`Servidor HTTP: ${error.message}`);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`YouTube Posts Scraper disponible en http://${displayHost(host)}:${port}`);
  hydrateExecutionRetryQueuesFromStore();
  hydrateStopLossRetryQueueFromEvents();
  hydrateCloseGuardRetryQueueFromEvents();
  checkAutomaticMonthlyReset({ reason: 'startup' })
    .catch((error) => {
      pushLog({ level: 'warn', message: `Reset mensual: ${error.message}`, at: new Date().toISOString() });
    })
    .finally(() => scheduleMonthlyResetCheck());
  syncExchangePositions({ reason: 'startup' }).catch((error) => {
    pushLog({ level: 'warn', message: `BingX sync: ${error.message}`, at: new Date().toISOString() });
    syncPriceSubscriptions();
  });
  measureBingXClock({ reason: 'startup' }).catch(() => {});
  resumeMonitorOnStartup().catch((error) => {
    pushLog({ level: 'error', message: `Auto-resume monitor: ${error.message}`, at: new Date().toISOString() });
  });
  scheduleAutomaticRedactedBackup();
  refreshBackupStorage({ notify: true, force: true }).catch((error) => {
    pushLog({ level: 'warn', message: `Almacenamiento backups: ${error.message}`, at: new Date().toISOString() });
  });
  refreshSignalCoverage({ notify: false, rememberExisting: true, recover: true }).catch((error) => {
    pushLog({ level: 'warn', message: `Cobertura de señales: ${error.message}`, at: new Date().toISOString() });
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

bingxClockTimer = setInterval(() => {
  measureBingXClock({ reason: 'poll' }).catch(() => {});
}, BINGX_CLOCK_POLL_MS);
bingxClockTimer.unref();

signalCoverageTimer = setInterval(() => {
  refreshSignalCoverage({ notify: true, recover: true }).catch((error) => {
    pushLog({ level: 'warn', message: `Cobertura de señales: ${error.message}`, at: new Date().toISOString() });
  });
}, SIGNAL_COVERAGE_CHECK_MS);
signalCoverageTimer.unref();

backupStorageTimer = setInterval(() => {
  refreshBackupStorage({ notify: true, force: true }).catch((error) => {
    pushLog({ level: 'warn', message: `Almacenamiento backups: ${error.message}`, at: new Date().toISOString() });
  });
}, BACKUP_STORAGE_CHECK_MS);
backupStorageTimer.unref();

const sseHeartbeatTimer = setInterval(() => {
  broadcast('heartbeat', { at: new Date().toISOString() });
}, SSE_HEARTBEAT_INTERVAL_MS);
sseHeartbeatTimer.unref();

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
  state.priceFeed = priceFeedState();
  state.promotionGate = buildCurrentPromotionGate();
  state.netEntryFilterAudit = buildNetEntryShadowAudit({
    events: tradeEventStore.list(),
    config: configStore.getBingX()
  });
  return {
    ...state,
    runtime: serverRuntime,
    browserOpen: scraper.isBrowserOpen,
    running: scraper.running,
    monitor: configStore.getMonitor(),
    telegramSource: configStore.getTelegramSource(),
    portfolio: configStore.getPortfolio(),
    openingRetryQueue: stopLossRetryQueueState(),
    stopLossRetryQueue: stopLossRetryQueueState(),
    closeRetryQueue: closeGuardRetryQueueState(),
    closeGuardRetryQueue: closeGuardRetryQueueState(),
    exchangeSafety: buildExchangeSafety(),
    stats: store.stats()
  };
}

function buildCurrentPromotionGate(coverage = state.signalCoverage) {
  return buildPromotionGate({
    coverage,
    exchangeSafety: buildExchangeSafety(),
    openingRetries: stopLossRetryQueueState(),
    closeRetries: closeGuardRetryQueueState(),
    economics: currentPromotionEconomics()
  });
}

function currentPromotionEconomics() {
  const summary = replicaAuditCache?.audit?.cohort?.summary;
  if (!summary) {
    return null;
  }
  return {
    closedTrades: Number(summary.vstCloses || 0),
    grossPnl: Number(summary.bingxGross || 0),
    fees: Number(summary.bingxFees || 0),
    funding: Number(summary.bingxFunding || 0),
    netPnl: Number(summary.bingxNet || 0)
  };
}

function currentRealtimeState() {
  const { logs, trades, ...realtime } = currentState();
  return realtime;
}

function priceFeedState(feedStatus = priceFeed.status()) {
  return {
    ...feedStatus,
    clock: currentBingXClockStatus()
  };
}

function currentBingXClockStatus(nowMs = Date.now()) {
  const lastSuccessMs = Date.parse(bingxClockStatus.lastSuccessAt || '');
  const ageMs = bingxClockStatus.available && Number.isFinite(lastSuccessMs)
    ? Math.max(0, nowMs - lastSuccessMs)
    : null;
  const stale = ageMs === null || ageMs > BINGX_CLOCK_STALE_MS;
  const sampleLevel = bingxClockStatus.sampleLevel || bingxClockStatus.level || 'unavailable';
  return {
    ...bingxClockStatus,
    ageMs,
    stale,
    sampleLevel,
    level: !bingxClockStatus.available ? 'unavailable' : stale ? 'stale' : sampleLevel
  };
}

async function measureBingXClock({ reason = 'poll' } = {}) {
  if (bingxClockInFlight) {
    return bingxClockInFlight;
  }

  const task = (async () => {
    const environment = bingxClockEnvironment();
    const client = new BingXClient({ environment });
    const requestedAtMs = Date.now();
    try {
      const response = await client.getServerTime();
      const receivedAtMs = Date.now();
      const serverTime = response?.data?.serverTime
        ?? response?.serverTime
        ?? (typeof response?.data === 'number' ? response.data : null);
      const sample = estimateBingXClockSample({
        serverTime,
        requestedAtMs,
        receivedAtMs,
        environment
      });
      const recoveredFromError = Boolean(bingxClockStatus.error);
      bingxClockStatus = {
        ...sample,
        sampleLevel: sample.level,
        lastAttemptAt: sample.receivedAt,
        lastSuccessAt: sample.receivedAt,
        reason,
        error: null
      };
      if (recoveredFromError) {
        pushLog({
          level: 'info',
          message: 'Reloj BingX REST recuperado.',
          at: sample.receivedAt
        });
      }
    } catch (error) {
      const at = new Date().toISOString();
      const message = error?.message || String(error);
      const isNewError = bingxClockStatus.error !== message;
      bingxClockStatus = {
        ...bingxClockStatus,
        environment,
        lastAttemptAt: at,
        reason,
        error: message
      };
      if (isNewError) {
        pushLog({
          level: 'warn',
          message: `Reloj BingX REST: ${message}`,
          at
        });
      }
    }

    state.priceFeed = priceFeedState();
    broadcast('state', state);
    return currentBingXClockStatus();
  })();

  bingxClockInFlight = task;
  try {
    return await task;
  } finally {
    if (bingxClockInFlight === task) {
      bingxClockInFlight = null;
    }
  }
}

function bingxClockEnvironment() {
  return configStore.getBingX().mode === 'demo' ? 'prod-vst' : 'prod-live';
}

async function cachedOrPaperPnlPayload({ months, warning, cooldownUntil }) {
  const matchingSnapshot = pnlLastGood && pnlLastGood.months === String(months)
    ? pnlLastGood
    : pnlSnapshotStore.getPnl(months);
  if (matchingSnapshot) {
    pnlLastGood = matchingSnapshot;
  }
  const lastGood = matchingSnapshot?.pnl || null;
  if (lastGood) {
    return {
      pnl: {
        ...lastGood,
        warning
      },
      warning,
      stale: true,
      cooldownUntil: new Date(cooldownUntil).toISOString(),
      lastGoodAt: new Date(matchingSnapshot.at).toISOString()
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

async function rememberPnlSnapshot(snapshot) {
  pnlLastGood = snapshot;
  await pnlSnapshotStore.setPnl(snapshot).catch((error) => {
    pushLog({
      level: 'warn',
      message: `No se pudo persistir el snapshot PnL: ${safePublicMessage(error.message)}`,
      at: new Date().toISOString()
    });
  });
}

async function rememberPnlSourcesSnapshot(snapshot) {
  pnlSourcesLastGood = {
    ...snapshot,
    month: snapshot.payload?.month || currentMonthKey()
  };
  await pnlSnapshotStore.setSources(pnlSourcesLastGood).catch((error) => {
    pushLog({
      level: 'warn',
      message: `No se pudo persistir el snapshot de fuentes PnL: ${safePublicMessage(error.message)}`,
      at: new Date().toISOString()
    });
  });
}

async function resetMonthlyAccounting({ resetAt = new Date(), reason = 'manual' } = {}) {
  if (monthlyResetInFlight) {
    return monthlyResetInFlight;
  }
  monthlyResetInFlight = performMonthlyAccountingReset({ resetAt, reason });
  try {
    return await monthlyResetInFlight;
  } finally {
    monthlyResetInFlight = null;
  }
}

async function performMonthlyAccountingReset({ resetAt = new Date(), reason = 'manual' } = {}) {
  const date = resetAt instanceof Date ? resetAt : new Date(resetAt);
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
  const month = currentMonthKeyForDate(safeDate);
  const boundary = await captureMonthlyPnlBoundary({
    resetAt: safeDate,
    month,
    reason
  });
  const bingx = await configStore.resetMonthlyAccounting({
    resetAt: safeDate,
    month,
    boundary
  });
  await clearPnlCaches({ clearSnapshots: true });
  broadcast('bingx', { bingx });
  const appliedModes = ['demo', 'live']
    .filter((mode) => boundary?.[mode]?.applied)
    .map((mode) => mode === 'demo' ? 'VST' : 'real');
  const boundaryStatus = boundary?.quality === 'late'
    ? 'snapshot tardío no aplicado'
    : appliedModes.length
      ? `snapshot aplicado a ${appliedModes.join(' y ')}`
      : 'snapshot no disponible';
  pushLog({
    level: reason.startsWith('auto') ? 'warn' : 'info',
    message: `Reset mensual aplicado (${reason}): VST ${bingx.vstPnlResetAt}, real ${bingx.livePnlResetAt}; ${boundaryStatus}.`,
    at: new Date().toISOString()
  });
  return bingx;
}

async function checkAutomaticMonthlyReset({ reason = 'timer' } = {}) {
  const now = new Date();
  const bingx = configStore.getBingX();
  const plan = monthlyResetPlan({ bingx, now });
  if (!plan.required) {
    return null;
  }

  return resetMonthlyAccounting({
    resetAt: plan.resetAt,
    reason: reason === 'startup' ? 'auto-startup' : 'auto'
  });
}

async function captureMonthlyPnlBoundary({ resetAt, month, reason }) {
  const config = configStore.getBingX();
  const results = await Promise.allSettled([
    futuresTrader.getExchangeBalance({ mode: 'demo' }),
    futuresTrader.getExchangeBalance({ mode: 'live' })
  ]);
  const capturedAt = new Date();
  const accountResult = (result) => {
    if (result.status === 'fulfilled' && result.value) {
      return { balance: result.value };
    }
    const message = result.status === 'rejected'
      ? safePublicMessage(result.reason?.message || String(result.reason))
      : 'Saldo no disponible';
    return { error: message };
  };

  return buildMonthlyPnlBoundary({
    month,
    resetAt,
    capturedAt,
    reason,
    vstExternalFunding: config.vstTechnicalExternalFundingVST,
    accounts: {
      demo: accountResult(results[0]),
      live: accountResult(results[1])
    }
  });
}

function scheduleMonthlyResetCheck() {
  if (monthlyResetTimer) {
    clearTimeout(monthlyResetTimer);
  }
  const delay = nextMonthlyResetCheckDelay({
    now: new Date(),
    maxDelayMs: MONTHLY_RESET_CHECK_MAX_MS
  });
  monthlyResetTimer = setTimeout(() => {
    monthlyResetTimer = null;
    checkAutomaticMonthlyReset({ reason: 'timer' })
      .catch((error) => {
        pushLog({ level: 'warn', message: `Reset mensual: ${error.message}`, at: new Date().toISOString() });
      })
      .finally(() => scheduleMonthlyResetCheck());
  }, delay);
  monthlyResetTimer.unref();
}

async function clearPnlCaches({ clearSnapshots = false } = {}) {
  pnlCache = null;
  pnlSourcesCache = null;
  pnlLastGood = null;
  pnlSourcesLastGood = null;
  replicaAuditCache = null;
  if (clearSnapshots) {
    demoOrderHistoryCache = null;
  }
  clearPnlBackoff();
  if (clearSnapshots) {
    await pnlSnapshotStore.clear().catch((error) => {
      pushLog({
        level: 'warn',
        message: `No se pudo invalidar el snapshot PnL: ${safePublicMessage(error.message)}`,
        at: new Date().toISOString()
      });
    });
  } else {
    pnlSourcesLastGood = pnlSnapshotStore.getSources(currentMonthKey());
  }
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

async function refreshSignalCoverage({ notify = false, rememberExisting = false, recover = false } = {}) {
  const bingx = configStore.getBingX();
  const buildCoverage = () => buildSignalCoverage({
    posts: store.list(),
    events: tradeEventStore.list(),
    parseSignals: (text) => futuresTrader.parseAll(text),
    mode: bingx.mode,
    since: bingx.improvementCohortStartedAt,
    retryWindowMs: STOP_LOSS_RETRY_MAX_AGE_MS
  });
  let coverage = buildCoverage();
  if (recover) {
    const recovered = await recoverMissingCoverageExecutions(coverage);
    if (recovered > 0) {
      coverage = buildCoverage();
    }
  }
  state.signalCoverage = coverage;
  state.promotionGate = buildCurrentPromotionGate(coverage);
  if (rememberExisting) {
    rememberSignalCoverageNotifications(coverage);
  }
  if (notify) {
    await notifySignalCoverage(coverage);
  }
  return coverage;
}

async function notifySignalCoverage(coverage) {
  const terminalPackages = (coverage?.packages || []).filter((item) => item.status !== 'pending');
  for (const item of terminalPackages) {
    if (item.status === 'complete' && item.expectedCount < 2) {
      continue;
    }
    const key = signalCoverageNotificationKey(item);
    if (signalCoverageNotifications.has(key)) {
      continue;
    }
    signalCoverageNotifications.add(key);
    const missing = item.signals
      .filter((signal) => signal.status !== 'executed')
      .map((signal) => `${signal.symbol} ${signal.direction}: ${signal.reason || signal.status}`);
    const title = item.status === 'complete'
      ? 'Paquete de señales completo'
      : 'Paquete de señales incompleto';
    const details = [
      `${item.executionMode.toUpperCase()}: ${item.executedCount}/${item.expectedCount} aperturas ejecutadas.`,
      ...missing,
      item.postUrl ? `Post: ${item.postUrl}` : ''
    ].filter(Boolean).join('\n');
    await telegramNotifier.sendAlert(title, details).catch((error) => {
      pushLog({ level: 'error', message: `Telegram cobertura: ${error.message}`, at: new Date().toISOString() });
    });
  }
}

function rememberSignalCoverageNotifications(coverage) {
  for (const item of coverage?.packages || []) {
    if (item.status !== 'pending') {
      signalCoverageNotifications.add(signalCoverageNotificationKey(item));
    }
  }
}

function signalCoverageNotificationKey(item = {}) {
  return `${item.key}|${item.status}|${item.executedCount}|${item.missingCount}`;
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

function buildIncidentSnapshot(secureBackup = {}) {
  const logs = state.logs || [];
  const storageIncident = buildBackupStorageIncident(secureBackup.storage);
  const groupedIncidents = groupOperationalIncidents([
    ...(storageIncident ? [storageIncident] : []),
    ...logs
    .map(classifyIncidentLog)
    .filter(Boolean)
  ]);
  const incidents = groupedIncidents.slice(0, 30);
  const counts = summarizeOperationalIncidents(groupedIncidents, {
    displayed: incidents.length
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
  if (signalCoverageTimer) {
    clearInterval(signalCoverageTimer);
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

function buildBackupStorageIncident(storage = {}) {
  if (!['warn', 'critical', 'unavailable'].includes(storage.level)) {
    return null;
  }
  return {
    at: storage.checkedAt || new Date().toISOString(),
    level: storage.level === 'critical' ? 'error' : 'warn',
    type: 'backup_storage',
    title: storage.level === 'critical' ? 'Espacio de backup crítico' : 'Revisar almacenamiento de backups',
    message: backupStorageSummary(storage)
  };
}

async function loadSecureBackupStatus() {
  const [record, storage] = await Promise.all([
    readFile(secureBackupStatusFile, 'utf8')
      .then((value) => JSON.parse(value))
      .catch(() => ({})),
    refreshBackupStorage({ notify: false })
  ]);
  return buildSecureBackupStatus({ ...record, storage });
}

async function refreshBackupStorage({ notify = false, force = false } = {}) {
  const checkedAt = Date.parse(String(backupStorageStatus.checkedAt || ''));
  if (!force && Number.isFinite(checkedAt) && Date.now() - checkedAt < BACKUP_STORAGE_CACHE_MS) {
    return backupStorageStatus;
  }
  if (backupStorageCheckInFlight) {
    const current = await backupStorageCheckInFlight;
    if (notify) {
      await notifyBackupStorageStatus(current);
    }
    return current;
  }

  backupStorageCheckInFlight = (async () => {
    const current = await inspectBackupStorage(secureBackupDir, { filesystemPath: dataDir });
    backupStorageStatus = current;
    if (notify) {
      await notifyBackupStorageStatus(current);
    }
    return current;
  })();
  try {
    return await backupStorageCheckInFlight;
  } finally {
    backupStorageCheckInFlight = null;
  }
}

async function notifyBackupStorageStatus(storage = {}) {
  const level = String(storage.level || 'unavailable');
  const action = backupStorageAlertAction({
    previousLevel: backupStorageLastAlertLevel,
    currentLevel: level,
    lastAlertAt: backupStorageLastAlertAt,
    now: Date.now(),
    cooldownMs: BACKUP_STORAGE_ALERT_COOLDOWN_MS
  });
  if (action === 'recovered') {
    const message = `Almacenamiento recuperado. ${backupStorageSummary(storage)}`;
    pushLog({ level: 'info', message, at: new Date().toISOString() });
    await telegramNotifier.sendAlert('Almacenamiento de backups recuperado', message).catch((error) => {
      pushLog({ level: 'warn', message: `Telegram storage recovery: ${error.message}`, at: new Date().toISOString() });
    });
    backupStorageLastAlertAt = Date.now();
    backupStorageLastAlertLevel = level;
    return;
  }
  if (action === 'none') {
    backupStorageLastAlertLevel = level;
    return;
  }
  backupStorageLastAlertLevel = level;
  backupStorageLastAlertAt = Date.now();
  const title = level === 'critical'
    ? 'Espacio crítico para backups'
    : level === 'unavailable'
      ? 'No se puede medir el almacenamiento'
      : 'Espacio de backups bajo';
  const message = `${backupStorageSummary(storage)} No se ha borrado ningún archivo.`;
  pushLog({
    level: level === 'critical' ? 'error' : 'warn',
    message: `${title}: ${message}`,
    at: new Date().toISOString()
  });
  await telegramNotifier.sendAlert(title, message).catch((error) => {
    pushLog({ level: 'warn', message: `Telegram storage alert: ${error.message}`, at: new Date().toISOString() });
  });
}

function backupStorageSummary(storage = {}) {
  if (!storage.available) {
    return 'La aplicación no pudo medir el almacenamiento local de backups.';
  }
  const free = formatStorageBytes(storage.freeBytes);
  const freePercent = Number.isFinite(Number(storage.freePercent))
    ? `${Number(storage.freePercent).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`
    : '-';
  const backupSize = formatStorageBytes(storage.backupBytes);
  const stale = Number(storage.stalePartialFiles || 0);
  const partialText = stale > 0
    ? ` Hay ${stale} parcial${stale === 1 ? '' : 'es'} abandonado${stale === 1 ? '' : 's'}.`
    : '';
  return `Libres ${free} (${freePercent}); ${Number(storage.backupFiles || 0)} copias ocupan ${backupSize}.${partialText}`;
}

function formatStorageBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '-';
  }
  const units = [
    ['TB', 1024 ** 4],
    ['GB', 1024 ** 3],
    ['MB', 1024 ** 2],
    ['KB', 1024]
  ];
  const selected = units.find(([, divisor]) => bytes >= divisor);
  if (!selected) {
    return `${Math.round(bytes)} B`;
  }
  return `${(bytes / selected[1]).toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${selected[0]}`;
}

function syncPriceSubscriptions(exchangePositionsOrSymbols) {
  if (Array.isArray(exchangePositionsOrSymbols)) {
    exchangeOpenSymbols = new Set(exchangePositionsOrSymbols.map(positionSymbol).filter(Boolean));
  }
  const watchedSymbols = activeEntryQuoteSymbols();
  const recentSignalSymbols = activePersistentEntryQuoteSymbols();
  priceFeed.setSymbols([
    ...paperStore.openSymbols(),
    ...exchangeOpenSymbols,
    ...recentSignalSymbols,
    ...watchedSymbols
  ]);
  state.priceFeed = priceFeedState();
  scheduleEntryQuoteWatchCleanup();
}

function watchEntryMarketSymbols(symbols = []) {
  const expiresAt = Date.now() + ENTRY_QUOTE_WATCH_MS;
  for (const value of symbols) {
    const symbol = positionSymbol(value);
    if (symbol) {
      rememberPersistentEntryQuoteSymbol(symbol, Date.now());
      entryQuoteWatchUntil.set(symbol, expiresAt);
    }
  }
  syncPriceSubscriptions();
}

function activePersistentEntryQuoteSymbols() {
  seedPersistentEntryQuoteSymbols();
  const cutoff = Date.now() - ENTRY_QUOTE_HISTORY_RETENTION_MS;
  for (const [symbol, seenAt] of persistentEntryQuoteSeenAt) {
    if (Number(seenAt) < cutoff) {
      persistentEntryQuoteSeenAt.delete(symbol);
    }
  }
  return [...persistentEntryQuoteSeenAt.keys()];
}

function seedPersistentEntryQuoteSymbols() {
  if (persistentEntryQuoteSymbolsSeeded) {
    return;
  }
  persistentEntryQuoteSymbolsSeeded = true;
  const cutoff = Date.now() - ENTRY_QUOTE_HISTORY_RETENTION_MS;
  for (const post of store.list()) {
    const seenAt = Date.parse(post?.firstSeenAt || '');
    if (!Number.isFinite(seenAt) || seenAt < cutoff) {
      continue;
    }
    for (const signal of futuresTrader.parseAll(post?.text || '')) {
      if (signal?.isSignal && !signal.action && signal.symbol) {
        rememberPersistentEntryQuoteSymbol(signal.symbol, seenAt);
      }
    }
  }
}

function rememberPersistentEntryQuoteSymbol(value, seenAt = Date.now()) {
  const symbol = positionSymbol(value);
  const timestamp = Number(seenAt);
  if (!symbol || !Number.isFinite(timestamp)) {
    return;
  }
  persistentEntryQuoteSeenAt.set(symbol, Math.max(timestamp, Number(persistentEntryQuoteSeenAt.get(symbol) || 0)));
  if (persistentEntryQuoteSeenAt.size <= ENTRY_QUOTE_HISTORY_MAX_SYMBOLS) {
    return;
  }
  const oldest = [...persistentEntryQuoteSeenAt.entries()]
    .sort((left, right) => Number(left[1]) - Number(right[1]));
  for (const [staleSymbol] of oldest.slice(0, persistentEntryQuoteSeenAt.size - ENTRY_QUOTE_HISTORY_MAX_SYMBOLS)) {
    persistentEntryQuoteSeenAt.delete(staleSymbol);
  }
}

function activeEntryQuoteSymbols() {
  const now = Date.now();
  for (const [symbol, expiresAt] of entryQuoteWatchUntil) {
    if (Number(expiresAt) <= now) {
      entryQuoteWatchUntil.delete(symbol);
    }
  }
  return [...entryQuoteWatchUntil.keys()];
}

function scheduleEntryQuoteWatchCleanup() {
  if (entryQuoteWatchTimer) {
    clearTimeout(entryQuoteWatchTimer);
    entryQuoteWatchTimer = null;
  }
  const nextExpiry = Math.min(...entryQuoteWatchUntil.values());
  if (!Number.isFinite(nextExpiry)) {
    return;
  }
  entryQuoteWatchTimer = setTimeout(() => {
    entryQuoteWatchTimer = null;
    syncPriceSubscriptions();
  }, Math.max(50, nextExpiry - Date.now() + 50));
  entryQuoteWatchTimer.unref();
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
  const liveProtectionGaps = exchangeProtectionGaps(livePositions);
  const demoProtectionGaps = exchangeProtectionGaps(demoPositions);
  const liveWithoutStopLoss = liveProtectionGaps.withoutStopLoss;
  const liveWithoutTakeProfit = liveProtectionGaps.withoutTakeProfit;
  const demoWithoutStopLoss = demoProtectionGaps.withoutStopLoss;
  const demoWithoutTakeProfit = demoProtectionGaps.withoutTakeProfit;
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
    demo: exchangeSafetySummary(demoPositions, demoWithoutStopLoss, demoWithoutTakeProfit, demoOrders, demoOrphanOrders, exchangeBalancesCache.demo, 'VST'),
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
  if (event.phase === 'close_execution_retry' || event.phase === 'stop_loss_retry') {
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
  if (event.status === 'error') {
    return;
  }
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
    event.vstReserve?.actualAmount ? `Recarga técnica: +${formatSigned(event.vstReserve.actualAmount).replace('+', '')} VST` : '',
    event.vstReserve?.after?.available ? `Margen VST disponible: ${formatSigned(event.vstReserve.after.available).replace('+', '')} VST` : '',
    event.vstReserve?.externalFundingTotal ? `Aportaciones técnicas acumuladas: ${formatSigned(event.vstReserve.externalFundingTotal).replace('+', '')} VST` : '',
    event.sizing?.notional ? `Orden: ${formatSigned(event.sizing.notional).replace('+', '')} ${event.sizing.asset || 'USDT'}` : '',
    event.costGuard?.enabled ? costGuardAlertLine(event.costGuard) : '',
    event.netEntryFilter?.enabled ? netEntryFilterAlertLine(event.netEntryFilter) : '',
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
  if (shouldQueueStopLossRetry(event)) {
    const key = stopLossRetryKeyFromEvent(event);
    if (key && openingRetryTelegramNotifications.has(key)) {
      return false;
    }
    if (key) {
      openingRetryTelegramNotifications.add(key);
    }
  }
  if (isOpeningExecutionStatusForRetry(status) || status.includes('order_retry_expired')) {
    const key = stopLossRetryKeyFromEvent(event);
    if (key) {
      openingRetryTelegramNotifications.delete(key);
    }
  }
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
  return value === 'demo_close_guard_expired'
    || value === 'live_close_guard_expired'
    || value === 'demo_close_retry_expired'
    || value === 'live_close_retry_expired';
}

function costGuardAlertLine(costGuard = {}) {
  const asset = costGuard.asset || 'USDT';
  const status = costGuard.block
    ? 'bloqueo'
    : costGuard.warn ? 'aviso' : costGuard.status || 'ok';
  const cost = Number(costGuard.bufferedRoundTripCost || costGuard.estimatedRoundTripCost || 0);
  const marginRoi = Number(costGuard.breakEvenMarginRoiPercent || 0);
  return `Coste: ${status} - ${formatSigned(cost).replace('+', '')} ${asset} / BE margen ${formatPercentNumber(marginRoi)}`;
}

function netEntryFilterAlertLine(filter = {}) {
  const decision = filter.block
    ? 'bloqueo'
    : filter.warn ? 'sombra no entraria' : filter.decision || 'entraria';
  const costRisk = filter.costToRiskPercent == null ? '-' : formatPercentNumber(filter.costToRiskPercent);
  const rewardRisk = filter.rewardRisk == null ? '-' : String(filter.rewardRisk);
  const reason = filter.reason ? ` · ${filter.reason}` : '';
  return `Filtro neto: ${decision} · coste/riesgo ${costRisk} · R/R ${rewardRisk}${reason}`;
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
  if (status === 'demo_vst_technical_reserve_funded') {
    return 'Reserva técnica VST recargada';
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
  if (status.includes('close_retry_expired')) {
    return `Cierre ${suffix} sin ejecutar`;
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
  const noVisiblePostsSeconds = noVisiblePosts && noVisiblePostsStartedAt
    ? Math.max(0, Math.round((Date.now() - noVisiblePostsStartedAt) / 1000))
    : 0;
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
    noVisiblePostsSeconds,
    noVisiblePostsGraceSeconds: Math.round(NO_VISIBLE_POSTS_ALERT_GRACE_MS / 1000),
    visiblePosts: Number(state.visiblePosts || 0),
    scraper: scraper.diagnostics,
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
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });
  response.write(formatSseRetry(SSE_RETRY_MS));
  response.write(formatSseEvent('state', currentState()));
  clients.add(response);
  response.on('close', () => clients.delete(response));
}

function broadcast(event, payload) {
  const data = event === 'state' ? currentRealtimeState() : payload;
  const message = formatSseEvent(event, data);
  for (const client of clients) {
    if (client.destroyed || client.writableEnded) {
      clients.delete(client);
      continue;
    }
    try {
      client.write(message);
    } catch {
      clients.delete(client);
      client.destroy();
    }
  }
}

function pushLog(entry) {
  state.logs.unshift(entry);
  state.logs = state.logs.slice(0, 200);
  broadcast('log', entry);
}

async function readJson(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > 1024 * 1024) {
      const error = new Error('request_body_too_large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readRefreshRequested(requestUrl) {
  return String(requestUrl.searchParams.get('refresh') || '').trim() === '1';
}

async function serveStatic(pathname, request, response) {
  const vendorFilePath = vendorAssets.get(pathname);
  let filePath = vendorFilePath;

  if (!filePath) {
    const decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    filePath = resolve(publicDir, `.${decoded}`);
    if (!filePath.startsWith(publicDir)) {
      response.writeHead(403);
      return response.end('Forbidden');
    }
  }

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    response.writeHead(404);
    return response.end('Not found');
  }

  const extension = extname(filePath);
  const cacheControl = vendorFilePath
    ? 'public, max-age=31536000, immutable'
    : extension === '.html'
      ? 'no-store'
      : 'no-cache';
  const etag = staticEtag(info);
  const compressible = isCompressibleStatic(extension, info.size);
  const encoding = selectStaticEncoding(request.headers['accept-encoding'], {
    extension,
    size: info.size
  });
  const commonHeaders = {
    'content-type': mimeType(extension),
    'cache-control': cacheControl,
    etag,
    'last-modified': info.mtime.toUTCString()
  };
  if (compressible) {
    commonHeaders.vary = 'Accept-Encoding';
  }

  if (cacheControl !== 'no-store' && etagMatches(request.headers['if-none-match'], etag)) {
    response.writeHead(304, commonHeaders);
    return response.end();
  }

  const headers = { ...commonHeaders };
  if (encoding) {
    headers['content-encoding'] = encoding;
  } else {
    headers['content-length'] = info.size;
  }
  response.writeHead(200, headers);
  if (request.method === 'HEAD') {
    return response.end();
  }

  const stream = createReadStream(filePath);
  stream.on('error', (error) => response.destroy(error));
  if (encoding === 'br') {
    const encoder = createBrotliCompress({
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 }
    });
    encoder.on('error', (error) => response.destroy(error));
    return stream.pipe(encoder).pipe(response);
  }
  if (encoding === 'gzip') {
    const encoder = createGzip({ level: 6 });
    encoder.on('error', (error) => response.destroy(error));
    return stream.pipe(encoder).pipe(response);
  }
  return stream.pipe(response);
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

function displayHost(value) {
  return value === '0.0.0.0' || value === '::' ? 'localhost' : value;
}

async function exchangePnlSource({ key, mode, label, modeLabel, asset }) {
  const [pnlResult, positionsResult, commissionResult] = await Promise.allSettled([
    futuresTrader.getMonthlyPnl({ months: 3, mode, includePaper: false }),
    Promise.all([
      futuresTrader.getExchangeOpenPositions({ mode }),
      futuresTrader.getExchangeBalance({ mode })
    ]),
    futuresTrader.getCommissionRate({ mode, symbol: 'BTC-USDT' })
  ]);
  const pnl = pnlResult.status === 'fulfilled' ? pnlResult.value : null;
  const [positions, balance] = positionsResult.status === 'fulfilled' ? positionsResult.value : [[], null];
  const commissionRate = commissionResult.status === 'fulfilled' ? commissionResult.value : null;
  const error = [pnlResult, positionsResult, commissionResult]
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
    source: summarizeExchangePnlSource({ key, mode, label, modeLabel, asset, pnl, positions, balance, commissionRate, error }),
    positions
  };
}

function summarizeExchangePnlSource({ key, mode, label, modeLabel, asset, pnl, positions = [], balance = null, commissionRate = null, error = '' }) {
  const month = currentMonthKey();
  const config = configStore.getBingX();
  const rows = (pnl?.months || []).filter((row) => row.month === month);
  const income = summarizePnlRows(rows);
  const open = positions.filter((position) => position.status === 'open');
  const rawFloating = roundMoney(open.reduce((sum, position) => (
    sum + Number(position.unrealizedPnl ?? position.paperPnl ?? 0)
  ), 0));
  const exposure = roundMoney(open.reduce((sum, position) => (
    sum + Number(position.exposure || position.notional || 0)
  ), 0));
  const realizedNet = Number(income.total || 0);
  const realizedTrades = (pnl?.recent || [])
    .filter((record) => record.month === month && String(record.incomeType).toUpperCase() === 'REALIZED_PNL');
  const winners = realizedTrades.filter((record) => Number(record.income || 0) > 0).length;
  const commission = commissionEvidence({
    incomeRows: Object.entries(income.byType || {}).map(([incomeType, value]) => ({ incomeType, income: value })),
    commissionRate
  });
  const technicalReserve = mode === 'demo' ? demoTechnicalReserveAccounting() : null;
  const adjustment = monthlyPnlAdjustment({
    realized: realizedNet,
    rawFloating,
    boundary: config.monthlyPnlBoundary,
    mode,
    month,
    resetAt: mode === 'demo' ? config.vstPnlResetAt : config.livePnlResetAt
  });

  return {
    key,
    label,
    modeLabel,
    month,
    asset,
    available: true,
    status: sourceStatusText({ open, realizedTrades, error }),
    error: error ? sourceErrorStatus(error) : '',
    total: adjustment.total,
    realized: adjustment.realized,
    grossRealized: roundMoney(income.realized || 0),
    floating: adjustment.floating,
    rawFloating: adjustment.rawFloating,
    openingFloating: adjustment.openingUnrealized,
    monthlyBoundary: adjustment.monthlyBoundary,
    fees: roundMoney(income.fees || 0),
    funding: roundMoney(income.funding || 0),
    adjustments: roundMoney(income.adjustments || 0),
    incomeTypes: income.byType || {},
    commission,
    exposure,
    openPositions: open.length,
    closedTrades: Number(income.closedTrades || 0),
    records: Number(income.records || 0),
    winRate: realizedTrades.length ? (winners / realizedTrades.length) * 100 : null,
    balance: balanceSummary(balance, technicalReserve),
    baseline: mode === 'demo' ? demoBaseline() : null,
    technicalReserve
  };
}

function fallbackPnlSourceFromBalance({ key, mode, label, modeLabel, asset, balance, error = '' }) {
  if (!balance || !Number.isFinite(Number(balance.equity))) {
    return null;
  }

  const baseline = mode === 'demo' ? demoBaseline() : null;
  const config = configStore.getBingX();
  const month = currentMonthKey();
  const technicalReserve = mode === 'demo' ? demoTechnicalReserveAccounting() : null;
  const effectiveEquity = mode === 'demo'
    ? Number(balance.equity || 0) - Number(technicalReserve.externalFunding || 0)
    : Number(balance.equity || 0);
  const rawFloating = roundMoney(Number(balance.unrealizedProfit || 0));
  const resetAt = mode === 'demo' ? config.vstPnlResetAt : config.livePnlResetAt;
  const floatingAdjustment = monthlyPnlAdjustment({
    realized: 0,
    rawFloating,
    boundary: config.monthlyPnlBoundary,
    mode,
    month,
    resetAt
  });
  const equityDelta = monthlyEquityDelta({
    strategyEquity: effectiveEquity,
    boundary: config.monthlyPnlBoundary,
    mode,
    month,
    resetAt
  });
  const total = equityDelta.total !== null
    ? equityDelta.total
    : Number.isFinite(baseline)
      ? roundMoney(effectiveEquity - baseline)
      : rawFloating;
  const floating = floatingAdjustment.floating;
  const realized = roundMoney(total - floating);

  return {
    key,
    label,
    modeLabel,
    month,
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
    rawFloating,
    openingFloating: floatingAdjustment.openingUnrealized,
    monthlyBoundary: equityDelta.monthlyBoundary || floatingAdjustment.monthlyBoundary,
    fees: 0,
    funding: 0,
    exposure: roundMoney(Number(balance.usedMargin || 0)),
    openPositions: 0,
    closedTrades: 0,
    records: 0,
    winRate: null,
    balance: balanceSummary(balance, technicalReserve),
    baseline,
    technicalReserve
  };
}

function demoBaseline() {
  const config = configStore.getBingX();
  const value = Number(config.monthlyInitialCapitalVST || config.vstBaseCapital || 300);
  return Number.isFinite(value) && value > 0 ? value : 300;
}

function demoTechnicalReserveAccounting() {
  const config = configStore.getBingX();
  return {
    enabled: Boolean(config.vstTechnicalReserveEnabled),
    target: roundMoney(config.vstTechnicalReserveTargetVST || 500),
    externalFunding: roundMoney(config.vstTechnicalExternalFundingVST || 0),
    lastTopUpAt: config.vstTechnicalLastTopUpAt || null
  };
}

function balanceSummary(balance, technicalReserve = null) {
  if (!balance) {
    return null;
  }

  const externalFunding = roundMoney(technicalReserve?.externalFunding || 0);
  const strategyBalance = roundMoney(Number(balance.balance || 0) - externalFunding);
  const strategyEquity = roundMoney(Number(balance.equity || 0) - externalFunding);

  return {
    asset: balance.asset,
    balance: roundMoney(balance.balance),
    equity: roundMoney(balance.equity),
    availableMargin: roundMoney(balance.availableMargin),
    usedMargin: roundMoney(balance.usedMargin),
    unrealizedProfit: roundMoney(balance.unrealizedProfit),
    externalFunding,
    strategyBalance,
    strategyEquity
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

async function buildReplicaAudit({ month = currentMonthKey(), forceRefresh = false } = {}) {
  const portfolio = configStore.getPortfolio();
  let reference = null;
  let referenceError = null;
  try {
    reference = await loadReferenceLedger({
      month,
      portfolioUrl: portfolioSourceForReference(portfolio),
      forceRefresh
    });
  } catch (error) {
    referenceError = error.message;
  }
  const config = configStore.getBingX({ includeSecrets: true });
  const publicConfig = configStore.getBingX();
  const sheetRows = (reference?.positions || [])
    .map((position, index) => ({ ...position, _auditOrder: index }))
    .filter((position) => monthKeyFromIso(position.closedAt || position.openedAt) === month)
    .sort(compareAuditSheetRows);
  const monthWindow = auditMonthWindow({ month, resetAt: config.vstPnlResetAt });
  const [incomeRows, commissionRate, orderHistory] = await Promise.all([
    demoIncomeRows({ config, monthWindow }),
    demoCommissionRate({ config }).catch(() => null),
    demoOrderHistory({ config, monthWindow, forceRefresh })
  ]);
  const windowEvents = tradeEventStore.list()
    .filter(Boolean)
    .filter((event) => auditEventInWindow(event, monthWindow));
  const events = windowEvents.filter((event) => auditEventIsDemo(event, windowEvents));
  const posts = store.list();
  const unprocessedCloses = buildUnprocessedCloseSignals({
    posts,
    events,
    parseSignals: (text) => futuresTrader.parseAll(text),
    startTime: monthWindow.startTime,
    endTime: monthWindow.endTime
  });
  const rowAudit = annotateReplicaReferenceCoverage(buildReplicaAuditRows({
    sheetRows,
    incomeRows,
    events,
    posts,
    orderRows: orderHistory.rows,
    unprocessedCloses,
    defaultNotional: publicConfig.defaultNotionalUSDT || publicConfig.monthlyOrderNotionalUSDT || 0
  }), sheetRows);
  const rows = rowAudit.rows.map((row) => ({
    ...row,
    outcome: classifyPairedOutcome(row)
  }));
  const summary = summarizeReplicaAudit({
    rows,
    sheetRows,
    incomeRows,
    events,
    reference,
    config: publicConfig,
    monthWindow,
    commissionRate,
    referenceCoverage: rowAudit.coverage
  });
  const cohort = buildReplicaAuditCohort({
    startedAt: publicConfig.improvementCohortStartedAt,
    sheetRows,
    incomeRows,
    events,
    posts,
    orderRows: orderHistory.rows,
    unprocessedCloses,
    reference,
    config: publicConfig,
    monthWindow,
    commissionRate
  });
  const cohortHistory = (publicConfig.improvementCohortHistory || [])
    .map((item) => buildReplicaAuditCohort({
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      sheetRows,
      incomeRows,
      events,
      posts,
      orderRows: orderHistory.rows,
      unprocessedCloses,
      reference,
      config: publicConfig,
      monthWindow,
      commissionRate
    }))
    .filter(Boolean);
  const activeCohortStart = Date.parse(cohort?.startedAt || '');
  const previousCohort = cohortHistory
    .filter((item) => {
      const endedAt = Date.parse(item.endedAt || '');
      return Number.isFinite(activeCohortStart)
        && Number.isFinite(endedAt)
        && endedAt <= activeCohortStart;
    })
    .sort((left, right) => Date.parse(right.endedAt) - Date.parse(left.endedAt))[0] || null;
  const cohortComparison = buildCohortComparison({ current: cohort, previous: previousCohort });

  return {
    month,
    generatedAt: new Date().toISOString(),
    source: {
      label: reference?.sheetName || reference?.source?.label || formatMonthLabel(month),
      url: reference?.spreadsheetUrl || reference?.source?.spreadsheetUrl || portfolioSourceForReference(portfolio),
      startingCapital: reference?.startingCapital ?? null,
      equity: reference?.equity ?? null,
      error: referenceError,
      orderHistory: {
        available: orderHistory.available,
        stale: orderHistory.stale,
        records: orderHistory.rows.length,
        fetchedAt: orderHistory.fetchedAt,
        error: orderHistory.error
      }
    },
    window: {
      startAt: new Date(monthWindow.startTime).toISOString(),
      endAt: new Date(monthWindow.endTime).toISOString(),
      resetAt: config.vstPnlResetAt || null
    },
    summary,
    cohort,
    cohortHistory,
    cohortComparison,
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

async function demoCommissionRate({ config }) {
  if (!config.apiKey || !config.apiSecret) {
    return null;
  }
  const client = futuresTrader.client({ ...config, mode: 'demo' });
  const response = await client.getCommissionRate('BTC-USDT');
  return response?.data?.commission || response?.data || null;
}

async function demoOrderHistory({ config, monthWindow, forceRefresh = false }) {
  if (!config.apiKey || !config.apiSecret) {
    return { rows: [], available: false, stale: false, fetchedAt: null, throughTime: null, error: 'Credenciales VST no configuradas.' };
  }
  const now = Date.now();
  const endTime = Math.min(Number(monthWindow.endTime || now), now);
  const cacheKey = `${Number(monthWindow.startTime || 0)}|${String(config.apiKey).slice(-8)}`;
  if (!forceRefresh && demoOrderHistoryCache?.key === cacheKey && now - demoOrderHistoryCache.at < PNL_CACHE_TTL_MS) {
    return { ...demoOrderHistoryCache.value, cached: true };
  }
  const previous = demoOrderHistoryCache?.key === cacheKey ? demoOrderHistoryCache.value : null;
  const startTime = previous?.throughTime
    ? Math.max(Number(monthWindow.startTime || 0), Number(previous.throughTime) - ORDER_HISTORY_OVERLAP_MS)
    : Number(monthWindow.startTime || 0);
  const client = futuresTrader.client({ ...config, mode: 'demo' });
  try {
    const freshRows = [];
    for (let cursor = startTime; cursor <= endTime; cursor += ORDER_HISTORY_MAX_WINDOW_MS) {
      const chunkEnd = Math.min(endTime, cursor + ORDER_HISTORY_MAX_WINDOW_MS);
      const response = await client.getOrderHistory({
        startTime: cursor,
        endTime: chunkEnd,
        limit: 1000
      });
      const rows = response?.data?.orders || response?.data || [];
      if (Array.isArray(rows)) {
        freshRows.push(...rows);
      }
      if (chunkEnd >= endTime) {
        break;
      }
    }
    const byId = new Map((previous?.rows || []).map((order) => [auditOrderId(order), order]));
    for (const order of freshRows) {
      const orderId = auditOrderId(order);
      if (orderId) {
        byId.set(orderId, order);
      }
    }
    const value = {
      rows: [...byId.values()].sort((left, right) => auditOrderTime(left) - auditOrderTime(right)),
      available: true,
      stale: false,
      fetchedAt: new Date(now).toISOString(),
      throughTime: endTime,
      error: null
    };
    demoOrderHistoryCache = { key: cacheKey, at: now, value };
    return value;
  } catch (error) {
    if (previous?.rows?.length) {
      const value = {
        ...previous,
        stale: true,
        error: `No se pudo refrescar el historico de ordenes: ${safePublicMessage(error.message)}`
      };
      demoOrderHistoryCache = { key: cacheKey, at: now, value };
      return value;
    }
    return {
      rows: [],
      available: false,
      stale: false,
      fetchedAt: null,
      throughTime: null,
      error: `Historico de ordenes no disponible: ${safePublicMessage(error.message)}`
    };
  }
}

function auditOrderId(order = {}) {
  return String(order.orderId || order.orderID || '').trim();
}

function openingOrderIdForAudit(opening = {}) {
  return String(
    opening?.response?.data?.order?.orderId
    || opening?.response?.data?.order?.orderID
    || ''
  ).trim() || null;
}

function auditOrderTime(order = {}) {
  const timestamp = Number(order.time || order.updateTime);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildReplicaAuditCohort({
  startedAt,
  endedAt = null,
  sheetRows,
  incomeRows,
  events,
  posts,
  orderRows,
  unprocessedCloses,
  reference,
  config,
  monthWindow,
  commissionRate
}) {
  const cohortWindow = cohortWindowBounds({ startedAt, endedAt, monthWindow });
  if (!cohortWindow) {
    return null;
  }
  const {
    sheetRows: cohortSheetRows,
    incomeRows: cohortIncomeRows,
    events: cohortEvents
  } = scopeReplicaCohortInputs({ sheetRows, incomeRows, events, window: cohortWindow });
  const cohortOrderRows = (orderRows || []).filter((order) => {
    const timestamp = auditOrderTime(order);
    return timestamp >= cohortWindow.startTime && timestamp <= cohortWindow.endTime;
  });
  const rawRows = buildReplicaAuditRows({
    sheetRows: cohortSheetRows,
    incomeRows: cohortIncomeRows,
    events: cohortEvents,
    posts,
    orderRows: cohortOrderRows,
    unprocessedCloses: (unprocessedCloses || []).filter((close) => auditEventInWindow(close, cohortWindow)),
    defaultNotional: config.defaultNotionalUSDT || config.monthlyOrderNotionalUSDT || 0
  }).filter(cohortAuditRowHasOrigin);
  const rowAudit = annotateReplicaReferenceCoverage(rawRows, cohortSheetRows);
  const rows = rowAudit.rows;
  const summary = summarizeReplicaAudit({
    rows,
    sheetRows: cohortSheetRows,
    incomeRows: cohortIncomeRows,
    events: cohortEvents,
    reference,
    config,
    monthWindow: cohortWindow,
    commissionRate,
    scopeToRows: true,
    referenceCoverage: rowAudit.coverage
  });
  return {
    startedAt: new Date(cohortWindow.startTime).toISOString(),
    endedAt: endedAt ? new Date(cohortWindow.endTime).toISOString() : null,
    generatedAt: new Date().toISOString(),
    sampleStatus: cohortSampleStatus(summary.vstCloses),
    summary,
    rows
  };
}

function buildReplicaAuditRows({ sheetRows = [], incomeRows = [], events = [], posts = [], orderRows = [], unprocessedCloses = [], defaultNotional = 0 }) {
  const timingContext = buildAuditTimingContext({ events, posts });
  const aligned = alignReplicaAuditRecords({
    sheetRows,
    openings: auditOpeningEvents(events),
    realizedRows: auditIncomeByType(incomeRows, 'REALIZED_PNL'),
    closeEvents: auditCloseEvents(events),
    closeSignalEvents: auditCloseSignalEvents(events),
    openingFailures: buildOpeningFailureAttempts(events),
    closeFailures: buildCloseFailureAttempts(events),
    unprocessedCloses,
    openingFees: auditFeeRows(incomeRows, 'opening'),
    closingFees: auditFeeRows(incomeRows, 'closing'),
    fundingRows: auditIncomeByType(incomeRows, 'FUNDING_FEE'),
    orderRows,
    sheetCoverageEndTime: referenceCoverageEndTime(sheetRows)
  });
  const sequences = new Map();
  const rows = aligned.map((record) => {
    const symbol = auditPositionSymbol(record.sheet)
      || auditEventSymbol(record.opening)
      || auditIncomeSymbol(record.realized);
    const sequence = (sequences.get(symbol) || 0) + 1;
    sequences.set(symbol, sequence);
    return replicaAuditRow({
      symbol,
      sequence,
      ...record,
      timingContext,
      defaultNotional
    });
  });

  return rows.sort((left, right) => (
    Number(left.orderNumber || 9999) - Number(right.orderNumber || 9999)
    || left.symbol.localeCompare(right.symbol)
    || left.sequence - right.sequence
  ));
}

function buildAuditTimingContext({ events = [], posts = [] } = {}) {
  const postsById = new Map((posts || [])
    .filter((post) => post?.id)
    .map((post) => [String(post.id), post]));
  const firstAttemptByKey = new Map();
  for (const event of events || []) {
    const action = auditAttemptAction(event);
    const key = auditAttemptKey(event, action);
    const timestamp = Date.parse(event?.at || '');
    if (!key || !Number.isFinite(timestamp)) {
      continue;
    }
    const current = firstAttemptByKey.get(key);
    if (!current || timestamp < current.timestamp) {
      firstAttemptByKey.set(key, { timestamp, at: event.at });
    }
  }
  return { postsById, firstAttemptByKey };
}

function auditAttemptAction(event = {}) {
  const action = String(event?.signal?.action || '').toUpperCase();
  if (action.startsWith('CLOSE')) {
    return 'CLOSE';
  }
  return event?.signal?.entry ? 'OPEN' : '';
}

function auditAttemptKey(event = {}, action = auditAttemptAction(event)) {
  const postId = String(event?.postId || '').trim();
  const symbol = auditEventSymbol(event);
  return postId && symbol && action ? `${postId}|${symbol}|${action}` : '';
}

function auditEventTiming(event, action, timingContext = {}) {
  if (!event) {
    return { detectedAt: null, firstAttemptAt: null };
  }
  const post = timingContext.postsById?.get(String(event.postId || ''));
  const firstAttempt = timingContext.firstAttemptByKey?.get(auditAttemptKey(event, action));
  return {
    detectedAt: post?.firstSeenAt || null,
    firstAttemptAt: firstAttempt?.at || event.at || null
  };
}

function auditPreCloseMarket({ symbol, closeSignalEvent, closeEvent }) {
  const positions = closeSignalEvent?.exchangeClose?.positions || [];
  const position = positions.find((item) => auditPositionSymbol(item) === symbol) || positions[0];
  return firstAuditPrice([
    position?.markPrice,
    position?.lastPrice,
    closeEvent?.exchangePosition?.currentPrice,
    closeEvent?.exchangePosition?.raw?.markPrice
  ]);
}

function replicaAuditRow({
  symbol,
  sequence,
  sheet,
  opening,
  realized,
  realizedSource,
  realizedSources = [],
  closeEvent,
  closeSignalEvent,
  closeOrderEvidence,
  openingFee,
  closingFee,
  closingFeeSources = [],
  funding,
  openingFailure,
  closeFailures = [],
  unprocessedCloses = [],
  unmatchedClose,
  aggregatedOpenings,
  orderHistoryBacked = false,
  timingContext,
  defaultNotional
}) {
  const sheetIsOpen = sheet?.status === 'open';
  const sheetPnl = sheetIsOpen ? null : auditNumber(sheet?.realizedPnl ?? sheet?.paperPnl, null);
  const sheetNotional = auditNumber(sheet?.notional, 0);
  const leverage = auditNumber(sheet?.leverage ?? opening?.signal?.leverage, 1);
  const entryFill = resolveEntryFill(opening);
  const entryReference = resolveEntryReference(opening);
  const closeReference = resolveCloseReference(closeSignalEvent);
  const closeFill = resolveCloseFill({
    opening,
    closeEvent,
    closeSignalEvent,
    closeOrderEvidence,
    realized,
    realizedSource
  });
  const entryPrice = entryFill?.price ?? null;
  const closePrice = closeFill?.price ?? null;
  const notional = auditNumber(opening?.sizing?.notional, 0) || auditNumber(opening?.notional, 0) || auditNumber(defaultNotional, 0);
  const scaleRatio = sheetNotional > 0 && notional > 0 ? notional / sheetNotional : 0;
  const replicaPnl = sheetPnl == null ? null : roundMoney(sheetPnl * scaleRatio);
  const grossPnl = realized ? roundMoney(Number(realized.income || 0)) : null;
  const openingFeeAmount = roundMoney(Number(openingFee?.income || 0));
  const closingFeeAmount = roundMoney(Number(closingFee?.income || 0));
  const fundingAmount = roundMoney(Number(funding || 0));
  const fees = roundMoney(openingFeeAmount + closingFeeAmount + fundingAmount);
  const netPnl = grossPnl == null ? null : roundMoney(grossPnl + fees);
  const entryDiffPercent = auditPercentDiff(entryPrice, sheet?.entryPrice);
  const closeDiffPercent = sheetIsOpen
    ? null
    : auditPercentDiff(closePrice, sheet?.closePrice || sheet?.currentPrice);
  const direction = sheet?.direction || opening?.signal?.direction || closeEvent?.signal?.direction || '';
  const entrySlippagePercent = entryAdverseDeviationPercent({
    actual: entryPrice,
    reference: entryReference?.price,
    direction
  });
  const closeSlippagePercent = closeAdverseDeviationPercent({
    actual: closePrice,
    reference: closeReference?.price,
    direction
  });
  const historyStopLoss = closeOrderEvidence?.types?.some((type) => String(type).includes('STOP'))
    ? closeOrderEvidence?.stopPrices?.at(-1)
    : null;
  const stopLoss = auditNumber(
    historyStopLoss ?? closeEvent?.exchangePosition?.stopLoss ?? opening?.signal?.stopLoss,
    null
  );
  const historyCloseStatus = closeOrderEvidence?.types?.some((type) => String(type).includes('STOP'))
    ? 'exchange_stop_closed'
    : closeOrderEvidence?.orderIds?.length ? 'exchange_signal_closed' : '';
  const closeKind = observedCloseKind({
    status: closeEvent?.status || historyCloseStatus,
    hasCloseSignal: Boolean(closeSignalEvent),
    direction,
    stopLoss,
    closePrice,
    grossPnl
  });
  const openingTiming = auditEventTiming(opening, 'OPEN', timingContext);
  const closingTiming = auditEventTiming(closeSignalEvent, 'CLOSE', timingContext);
  const openingExchangeTime = Number(opening?.historyOrder?.time);
  const openingFillAt = Number.isFinite(openingExchangeTime) && openingExchangeTime > 0
    ? new Date(openingExchangeTime).toISOString()
    : null;
  const preOrderMarket = firstAuditPrice([
    opening?.marketPrice,
    opening?.entryPrice
  ]);
  const closeTarget = closeReference?.price
    ?? (closeKind.kind === 'stop' ? stopLoss : null);
  const preCloseMarket = auditPreCloseMarket({ symbol, closeSignalEvent, closeEvent });
  const closeTelemetry = auditCloseTelemetry(closeSignalEvent, symbol);
  const stopAlignment = replicaStopAlignment({
    closeStatus: closeKind.kind === 'stop' ? 'exchange_stop_closed' : closeEvent?.status,
    replicaPnl,
    grossPnl,
    closeDiffPercent
  });
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
    closeDiffPercent,
    stopAlignment,
    closeFailures,
    unprocessedCloses,
    openingFailure,
    unmatchedClose
  });

  return {
    id: [symbol, sequence, sheet?.orderNumber || 'extra'].join('|'),
    orderNumber: sheet?.orderNumber || null,
    symbol,
    sequence,
    direction: sheet?.direction || opening?.signal?.direction || closeEvent?.signal?.direction || '',
    sheet: sheet ? {
      status: sheet.status || 'closed',
      entry: auditRound(sheet.entryPrice),
      exit: sheetIsOpen ? null : auditRound(sheet.closePrice || sheet.currentPrice),
      stopLoss: auditRound(sheet.stopLoss),
      pnl: auditRound(sheetPnl),
      notional: auditRound(sheetNotional),
      leverage: auditRound(leverage),
      outcome: sheet.outcome || '',
      openedAt: sheet.openedAt || null,
      closedAt: sheet.closedAt || null
    } : null,
    replica: {
      notional: auditRound(notional),
      leverage: auditRound(leverage),
      scaleRatio: auditRound(scaleRatio),
      pnl: auditRound(replicaPnl)
    },
    vst: {
      entry: auditRound(entryPrice),
      exit: auditRound(closePrice),
      signalEntry: auditRound(entryReference?.price),
      signalClose: auditRound(closeReference?.price),
      preOrderMarket: auditRound(preOrderMarket),
      entryTelemetry: auditEntryTelemetry(opening?.executionTelemetry),
      closeTarget: auditRound(closeTarget),
      preCloseMarket: auditRound(preCloseMarket),
      closeTelemetry,
      stopLoss: auditRound(stopLoss),
      entryPriceSource: entryFill?.source || '',
      closePriceSource: closeFill?.source || '',
      orderHistoryBacked: Boolean(orderHistoryBacked),
      openingHistoryOnly: Boolean(opening?.historyOrderOnly),
      closeOrderIds: closeOrderEvidence?.orderIds || [],
      closeOrderTypes: closeOrderEvidence?.types || [],
      closeKind: closeKind.kind,
      closeKindSource: closeKind.source,
      entrySlippagePercent: auditRound(entrySlippagePercent),
      closeSlippagePercent: auditRound(closeSlippagePercent),
      grossPnl: auditRound(grossPnl),
      fees: auditRound(fees),
      openingFee: auditRound(openingFeeAmount),
      closingFee: auditRound(closingFeeAmount),
      funding: auditRound(fundingAmount),
      netPnl: auditRound(netPnl),
      openingDetectedAt: openingTiming.detectedAt,
      openingFirstAttemptAt: openingTiming.firstAttemptAt,
      openingAttemptAt: opening?.at || null,
      openingFillAt,
      openingAt: opening?.at || null,
      closingDetectedAt: closingTiming.detectedAt,
      closingFirstAttemptAt: closingTiming.firstAttemptAt,
      closeSignalAt: closeSignalEvent?.at || null,
      closingAt: realized ? new Date(Number(realized.time || 0)).toISOString() : closeEvent?.at || null,
      closeStatus: closeEvent?.status || historyCloseStatus,
      closeReason: closeEvent?.reason || '',
      stopAlignment,
      closeFailures: closeFailures.map((failure) => ({
        status: failure.status || 'error',
        reason: failure.reason || '',
        category: failure.category || 'exchange_close_error',
        at: failure.at || null,
        postUrl: failure.postUrl || ''
      })),
      unprocessedCloses: unprocessedCloses.map((close) => ({
        action: close.signal?.action || 'CLOSE',
        symbol: close.signal?.symbol || '',
        closePrice: auditRound(auditNumber(close.signal?.closePrice, null)),
        closePercent: auditRound(auditNumber(close.signal?.closePercent, 100)),
        category: close.category || 'close_signal_without_event',
        reason: close.reason || '',
        at: close.at || null,
        postId: close.postId || null,
        postUrl: close.postUrl || ''
      })),
      aggregatedOpenings: Number(aggregatedOpenings || 1),
      postUrl: opening?.postUrl || openingFailure?.postUrl || closeEvent?.postUrl || '',
      closePostUrl: closeSignalEvent?.postUrl || ''
    },
    failure: openingFailure ? {
      status: openingFailure.status || 'error',
      reason: openingFailure.reason || '',
      category: openingFailure.category || 'other',
      at: openingFailure.at || null,
      entry: auditRound(auditNumber(openingFailure.signal?.entry?.price, null)),
      postUrl: openingFailure.postUrl || ''
    } : null,
    diff: {
      gross: auditRound(diffGross),
      net: auditRound(diffNet),
      entryPercent: auditRound(entryDiffPercent),
      closePercent: auditRound(closeDiffPercent)
    },
    trace: {
      openingEventId: opening?.eventId || null,
      openingPostId: opening?.postId || null,
      openingFailureEventId: openingFailure?.eventId || null,
      executionKey: opening?.executionKey || null,
      closeEventId: closeEvent?.eventId || null,
      closeSignalEventId: closeSignalEvent?.eventId || null,
      exchangePositionId: closeEvent?.exchangePosition?.id || null,
      tradeId: realized?.tradeId || null,
      tradeIds: [...new Set([
        ...(realized?.tradeIds || []),
        ...realizedSources.map((source) => String(source?.tradeId || '')).filter(Boolean)
      ])],
      openingFeeTradeId: openingFee?.tradeId || null,
      closingFeeTradeId: closingFee?.tradeId || null,
      closingFeeTradeIds: [...new Set([
        ...(closingFee?.tradeIds || []),
        ...closingFeeSources.map((source) => String(source?.tradeId || '')).filter(Boolean)
      ])],
      openingOrderId: opening?.historyOrder?.orderId || openingOrderIdForAudit(opening),
      closeOrderIds: closeOrderEvidence?.orderIds || [],
      exchangePositionIds: closeOrderEvidence?.positionIds || [],
      unprocessedClosePostIds: [...new Set(unprocessedCloses.map((close) => close.postId).filter(Boolean))]
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
  closeDiffPercent,
  stopAlignment,
  closeFailures = [],
  unprocessedCloses = [],
  openingFailure,
  unmatchedClose
}) {
  if (unmatchedClose) {
    return { cause: 'Cierre sin apertura enlazada', detail: 'BingX registra un cierre que no se ha podido asociar a una apertura guardada.', severity: 'negative' };
  }
  if (sheet && !opening) {
    return {
      cause: 'No ejecutada en VST',
      detail: openingFailureDetail(openingFailure),
      severity: 'negative'
    };
  }
  if (!sheet && opening) {
    return { cause: 'Extra en VST', detail: 'Hay apertura demo que no aparece en la hoja externa.', severity: 'warn' };
  }
  if (unprocessedCloses.length) {
    const typoCount = unprocessedCloses.filter((close) => close.category === 'historical_close_typo').length;
    return {
      cause: 'Cierre no procesado',
      detail: `Histórico: ${unprocessedCloses.length} cierre${unprocessedCloses.length === 1 ? '' : 's'} no ${unprocessedCloses.length === 1 ? 'generó' : 'generaron'} ejecución${typoCount ? '; CUERRE ya está cubierto' : ''}.`,
      severity: 'negative'
    };
  }
  if (sheet?.status === 'open') {
    return realized
      ? {
          cause: 'Resultado pendiente en hoja',
          detail: 'BingX ya cerró la operación, pero la hoja todavía conserva la fila abierta y no publica PnL final.',
          severity: 'warn'
        }
      : {
          cause: 'Abierta en ambas',
          detail: 'La operación continúa abierta tanto en la hoja como en BingX.',
          severity: 'positive'
        };
  }
  if (opening && !realized) {
    return { cause: 'Abierta o sin cierre', detail: 'La señal entró, pero no hay cierre realizado emparejado en BingX.', severity: 'warn' };
  }
  if (stopAlignment === 'divergent') {
    if (closeFailures.length) {
      const runtimeGuardFailures = closeFailures.filter((failure) => failure.category === 'close_guard_runtime_error').length;
      return {
        cause: 'Cierre fallido antes del stop',
        detail: `${closeFailures.length} señal${closeFailures.length === 1 ? '' : 'es'} de cierre ${closeFailures.length === 1 ? 'falló' : 'fallaron'} antes del stop${runtimeGuardFailures ? `; ${runtimeGuardFailures} por el fallo histórico del guard` : ''}.`,
        severity: 'negative'
      };
    }
    return { cause: 'Stop antes del cierre', detail: 'BingX cerró por stop, pero la operación equivalente de la hoja terminó con el signo contrario.', severity: 'negative' };
  }
  if (stopAlignment === 'slippage') {
    return { cause: 'Stop con deslizamiento', detail: 'La hoja y BingX pierden en el mismo sentido, pero el precio de stop se desvió más del 0,15%.', severity: 'warn' };
  }
  if (replicaPnl != null && netPnl != null && Math.sign(replicaPnl) !== Math.sign(netPnl) && Math.abs(replicaPnl) > 0.01 && Math.abs(netPnl) > 0.01) {
    const grossMatchesReference = grossPnl != null
      && Math.abs(grossPnl) > 0.01
      && Math.sign(replicaPnl) === Math.sign(grossPnl);
    if (grossMatchesReference && Math.sign(grossPnl) !== Math.sign(netPnl)) {
      return {
        cause: 'Ganancia absorbida por costes',
        detail: 'El movimiento bruto coincide con la hoja, pero comisiones y funding vuelven negativo el neto VST.',
        severity: 'negative'
      };
    }
    return {
      cause: 'Signo distinto de mercado',
      detail: 'El PnL bruto de BingX termina con signo contrario a la operación equivalente de la hoja.',
      severity: 'negative'
    };
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
  if (stopAlignment === 'aligned') {
    return { cause: 'Stop alineado', detail: 'La hoja y BingX cerraron con el mismo signo y a menos del 0,15% de diferencia.', severity: 'positive' };
  }
  if (stopAlignment === 'unknown') {
    return { cause: 'Stop sin referencia', detail: 'BingX cerró por stop, pero faltan datos suficientes para compararlo con la hoja.', severity: 'warn' };
  }
  return { cause: 'Alineada', detail: 'La operación está razonablemente cerca de la réplica teórica.', severity: 'positive' };
}

function openingFailureDetail(failure) {
  if (!failure) {
    return 'Existe en la hoja, pero no hay apertura demo ni un intento fallido emparejado.';
  }
  const details = {
    cost_guard: 'El filtro de costes vigente en ese momento bloqueó la entrada.',
    insufficient_vst: 'BingX rechazó la entrada por margen VST insuficiente.',
    entry_deviation: 'La entrada agotó sus reintentos porque el precio se alejó del límite permitido.',
    stop_distance: 'La validación bloqueó un stop demasiado alejado de la entrada.',
    invalid_stop: 'BingX rechazó la orden porque el stop ya quedaba en un lado inválido del precio.'
  };
  return details[failure.category]
    || `El intento terminó como ${failure.status || 'error'}: ${failure.reason || 'motivo no registrado'}`;
}

function summarizeReplicaAudit({
  rows,
  sheetRows,
  incomeRows,
  events,
  reference,
  config,
  monthWindow,
  commissionRate = null,
  scopeToRows = false,
  referenceCoverage = null
}) {
  const sheetPnl = roundMoney(sheetRows.reduce((sum, row) => sum + Number(row.realizedPnl ?? row.paperPnl ?? 0), 0));
  const replicaPnl = roundMoney(rows.reduce((sum, row) => sum + Number(row.replica?.pnl || 0), 0));
  const bingxGross = roundMoney(rows.reduce((sum, row) => sum + Number(row.vst?.grossPnl || 0), 0));
  const bingxFees = scopeToRows
    ? roundMoney(rows.reduce((sum, row) => (
        sum + Number(row.vst?.openingFee || 0) + Number(row.vst?.closingFee || 0)
      ), 0))
    : roundMoney(auditIncomeByType(incomeRows, 'TRADING_FEE').reduce((sum, row) => sum + Number(row.income || 0), 0));
  const bingxFunding = scopeToRows
    ? roundMoney(rows.reduce((sum, row) => sum + Number(row.vst?.funding || 0), 0))
    : roundMoney(auditIncomeByType(incomeRows, 'FUNDING_FEE').reduce((sum, row) => sum + Number(row.income || 0), 0));
  const bingxNet = roundMoney(bingxGross + bingxFees + bingxFunding);
  const estimatedCommissionRebatePercent = Number(config.estimatedCommissionRebatePercent || 0);
  const estimatedCommissionRebate = roundMoney(Math.abs(bingxFees) * (estimatedCommissionRebatePercent / 100));
  const bingxNetAfterEstimatedRebate = roundMoney(bingxNet + estimatedCommissionRebate);
  const commission = commissionEvidence({ incomeRows, commissionRate });
  const replicaEconomics = estimateReplicaEconomics({
    rows,
    takerCommissionRate: commission.takerCommissionRate,
    makerCommissionRate: commission.makerCommissionRate
  });
  const orderHistoryEvidence = summarizeOrderHistoryEvidence(rows);
  const openings = scopeToRows || orderHistoryEvidence.backedRows
    ? rows.filter((row) => row.vst?.openingAt)
    : auditOpeningEvents(events);
  const closes = scopeToRows
    ? new Set(rows
        .filter((row) => row.vst?.grossPnl != null)
        .map((row) => row.trace?.tradeId || row.id))
    : new Set(auditIncomeByType(incomeRows, 'REALIZED_PNL').map((row) => row.tradeId || `${row.symbol}|${row.time}`));
  const issueCounts = rows.reduce((totals, row) => {
    totals[row.cause] = (totals[row.cause] || 0) + 1;
    return totals;
  }, {});
  const pairedOutcomeAnalysis = summarizePairedOutcomes(rows);
  const pairedOutcomeImpact = summarizePairedOutcomeImpact(rows);
  const signAnalysis = {
    marketMismatch: pairedOutcomeAnalysis.marketDrivenNetMismatch,
    grossMismatch: pairedOutcomeAnalysis.grossSignMismatch,
    grossMismatchRecoveredByCosts: pairedOutcomeAnalysis.grossMismatchRecoveredByCosts,
    costFlip: pairedOutcomeAnalysis.costFlip,
    netMismatch: pairedOutcomeAnalysis.netSignMismatch,
    pairedRows: pairedOutcomeAnalysis.rows
  };
  const fillQuality = summarizeReplicaFillQuality(rows);
  const gapBridge = buildReplicaGapBridge({ rows, bingxFees, bingxFunding });
  const matchedGapAttribution = buildMatchedGapAttribution(rows);
  const executionRouteAnalysis = buildExecutionRouteAnalysis(rows);
  const executionPriceChain = buildExecutionPriceChainAttribution(rows);
  const executionLatency = summarizeExecutionLatency(rows);
  const entryExecutionAnalysis = buildEntryExecutionAnalysis(rows);
  const closeExecutionAnalysis = buildCloseExecutionAnalysis(rows);
  const missingReasonCounts = rows
    .filter((row) => row.cause === 'No ejecutada en VST')
    .reduce((totals, row) => {
      const key = row.failure?.category || 'unexplained';
      totals[key] = (totals[key] || 0) + 1;
      return totals;
    }, {});
  const stopAnalysis = summarizeReplicaStops(rows);
  const worstRows = [...rows]
    .filter((row) => Number.isFinite(Number(row.diff?.net)))
    .sort((left, right) => Math.abs(Number(right.diff.net || 0)) - Math.abs(Number(left.diff.net || 0)))
    .slice(0, 8)
    .map((row) => row.id);
  const aggregatedRows = rows.filter((row) => Number(row.vst?.aggregatedOpenings || 1) > 1);
  const aggregatedCycles = new Set(aggregatedRows.map((row) => [
    row.symbol,
    row.vst?.closingAt || ''
  ].join('|'))).size;
  const unprocessedCloseRows = rows.filter((row) => Number(row.vst?.unprocessedCloses?.length || 0) > 0);
  const unprocessedClosePosts = new Set(unprocessedCloseRows.flatMap((row) => (
    row.trace?.unprocessedClosePostIds || []
  )));

  return {
    sheetRows: sheetRows.length,
    vstOpenings: openings.length,
    vstCloses: closes.size,
    incomeRecords: incomeRows.length,
    eventRecords: events.length,
    sheetPnl,
    replicaPnl,
    replicaEstimatedMarketFees: replicaEconomics.marketFees,
    replicaEstimatedMarketNet: replicaEconomics.marketNet,
    replicaEstimatedMakerEntryFees: replicaEconomics.makerEntryFees,
    replicaEstimatedMakerEntryNet: replicaEconomics.makerEntryNet,
    replicaEstimatedFeeRows: replicaEconomics.rows,
    bingxGross,
    bingxFees,
    bingxFunding,
    bingxNet,
    estimatedCommissionRebatePercent,
    estimatedCommissionRebate,
    bingxNetAfterEstimatedRebate,
    actualCommissionRebate: commission.detectedRebate,
    commissionRebateDetected: commission.rebateDetected,
    takerCommissionRate: commission.takerCommissionRate,
    makerCommissionRate: commission.makerCommissionRate,
    takerCommissionPercent: commission.takerCommissionPercent,
    makerCommissionPercent: commission.makerCommissionPercent,
    grossGap: roundMoney(bingxGross - replicaPnl),
    netGap: roundMoney(bingxNet - replicaPnl),
    monthlyOrderPercent: config.monthlyOrderPercent || null,
    monthlyInitialCapitalVST: config.monthlyInitialCapitalVST || config.vstBaseCapital || null,
    defaultNotionalVST: config.defaultNotionalUSDT || null,
    startingCapital: reference?.startingCapital ?? null,
    equity: reference?.equity ?? null,
    issueCounts,
    pairedOutcomeAnalysis,
    pairedOutcomeImpact,
    signAnalysis,
    fillQuality,
    orderHistoryEvidence,
    gapBridge,
    matchedGapAttribution,
    executionRouteAnalysis,
    executionPriceChain,
    executionLatency,
    entryExecutionAnalysis,
    closeExecutionAnalysis,
    missingReasonCounts,
    stopAnalysis,
    unprocessedCloseRows: unprocessedCloseRows.length,
    unprocessedClosePosts: unprocessedClosePosts.size,
    aggregatedRows: aggregatedRows.length,
    aggregatedCycles,
    worstRows,
    resetApplied: Number.isFinite(monthWindow.resetAt) && monthWindow.resetAt > 0,
    referenceCoverage
  };
}

function summarizeReplicaFillQuality(rows = []) {
  const entryRows = rows.filter((row) => (
    row.vst?.entrySlippagePercent !== null
    && row.vst?.entrySlippagePercent !== undefined
    && Number.isFinite(Number(row.vst.entrySlippagePercent))
  ));
  const closeRows = rows.filter((row) => (
    row.vst?.closeSlippagePercent !== null
    && row.vst?.closeSlippagePercent !== undefined
    && Number.isFinite(Number(row.vst.closeSlippagePercent))
  ));
  return {
    entryMeasured: entryRows.length,
    entryAboveTolerance: entryRows.filter((row) => Number(row.vst.entrySlippagePercent) > 0.15).length,
    entryAverageAdversePercent: auditRound(entryRows.length
      ? entryRows.reduce((sum, row) => sum + Number(row.vst.entrySlippagePercent), 0) / entryRows.length
      : null),
    closeMeasured: closeRows.length,
    closeAboveTolerance: closeRows.filter((row) => Number(row.vst.closeSlippagePercent) > 0.15).length,
    closeAverageAdversePercent: auditRound(closeRows.length
      ? closeRows.reduce((sum, row) => sum + Number(row.vst.closeSlippagePercent), 0) / closeRows.length
      : null),
    entrySources: countReplicaPriceSources(rows, 'entryPriceSource'),
    closeSources: countReplicaPriceSources(rows, 'closePriceSource')
  };
}

function summarizeOrderHistoryEvidence(rows = []) {
  const openingRows = rows.filter((row) => row.vst?.openingAt);
  const backedRows = rows.filter((row) => row.vst?.orderHistoryBacked && row.vst?.openingAt);
  const closedRows = backedRows.filter((row) => row.vst?.grossPnl !== null && row.vst?.grossPnl !== undefined);
  const closeOrderIds = new Set(backedRows.flatMap((row) => row.vst?.closeOrderIds || []));
  const positionIds = new Set(backedRows.flatMap((row) => row.trace?.exchangePositionIds || []));
  const recoveredOpenings = backedRows.filter((row) => row.vst?.openingHistoryOnly).length;
  const exactCloseRows = closedRows.filter((row) => row.vst?.closePriceSource === 'exchange_order_history').length;
  const partialCloseRows = backedRows.filter((row) => Number(row.vst?.closeOrderIds?.length || 0) > 1).length;
  const unlinkedCloseRows = rows.filter((row) => row.cause === 'Cierre sin apertura enlazada').length;
  return {
    available: backedRows.length > 0,
    openingRows: openingRows.length,
    backedRows: backedRows.length,
    fallbackRows: Math.max(0, openingRows.length - backedRows.length),
    closedRows: closedRows.length,
    exactCloseRows,
    exactCloseCoveragePercent: closedRows.length
      ? auditRound(exactCloseRows / closedRows.length * 100)
      : null,
    closeOrders: closeOrderIds.size,
    positions: positionIds.size,
    recoveredOpenings,
    localEventCoveragePercent: backedRows.length
      ? auditRound((backedRows.length - recoveredOpenings) / backedRows.length * 100)
      : null,
    partialCloseRows,
    unlinkedCloseRows
  };
}

function countReplicaPriceSources(rows = [], key = '') {
  return rows.reduce((totals, row) => {
    const source = String(row.vst?.[key] || 'unavailable');
    totals[source] = (totals[source] || 0) + 1;
    return totals;
  }, {});
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

function auditEventIsDemo(event = {}, allEvents = []) {
  event = event || {};
  if (auditEventExplicitlyDemo(event)) {
    return true;
  }
  const status = String(event.status || '').toLowerCase();
  if (status !== 'error' && status !== 'blocked') {
    return false;
  }
  if (/\bVST\b/i.test(String(event.reason || event.error || ''))) {
    return true;
  }
  return Boolean(event.postId) && allEvents.some((candidate) => (
    candidate !== event
    && candidate?.postId === event.postId
    && auditEventExplicitlyDemo(candidate)
  ));
}

function auditEventExplicitlyDemo(event = {}) {
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

function auditCloseSignalEvents(events = []) {
  return events
    .filter((event) => (
      String(event.status || '') === 'demo_close_sent'
      && (String(event.signal?.action || '').toUpperCase() === 'CLOSE'
        || String(event.signal?.action || '').toUpperCase() === 'CLOSE_ALL')
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

function auditPercentDiff(actual, expected) {
  if (actual === null || actual === undefined || actual === ''
    || expected === null || expected === undefined || expected === '') {
    return null;
  }
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

function firstAuditPrice(values = []) {
  for (const value of values) {
    const number = auditNumber(value, null);
    if (number !== null && number > 0) {
      return number;
    }
  }
  return null;
}

function auditRound(value) {
  return value == null || !Number.isFinite(Number(value)) ? null : roundMoney(value);
}

function auditEntryTelemetry(telemetry) {
  if (!telemetry || typeof telemetry !== 'object') {
    return null;
  }
  return {
    schemaVersion: Number(telemetry.schemaVersion || 1),
    mode: telemetry.mode || 'observational_only',
    initialMarketRead: auditTelemetryMarketRead(telemetry.initialMarketRead),
    preOrderMarketRead: auditTelemetryMarketRead(telemetry.preOrderMarketRead),
    topOfBook: auditTelemetryQuote(telemetry.topOfBook),
    packageObservation: auditEntryPackageObservation(telemetry.packageObservation),
    orderRequest: auditTelemetryRequest(telemetry.orderRequest)
  };
}

function auditEntryPackageObservation(observation) {
  return observation && typeof observation === 'object' ? {
    startedAt: observation.startedAt || null,
    size: auditRound(observation.size),
    slot: auditRound(observation.slot),
    startQuote: auditTelemetryQuote(observation.startQuote)
  } : null;
}

function auditCloseTelemetry(closeSignalEvent, symbol) {
  const orders = Array.isArray(closeSignalEvent?.exchangeClose?.orders)
    ? closeSignalEvent.exchangeClose.orders
    : [];
  const order = orders.find((item) => auditPositionSymbol(item?.position) === symbol)
    || (orders.length === 1 ? orders[0] : null);
  const telemetry = order?.executionTelemetry || closeSignalEvent?.closeExecutionTelemetry;
  if (!telemetry || typeof telemetry !== 'object') {
    return null;
  }
  return {
    schemaVersion: Number(telemetry.schemaVersion || 1),
    mode: telemetry.mode || 'observational_only',
    direction: telemetry.direction || null,
    closeSide: telemetry.closeSide || null,
    requestType: telemetry.requestType || null,
    positionMarketPrice: auditRound(telemetry.positionMarketPrice),
    preCloseMarketRead: auditTelemetryMarketRead(telemetry.preCloseMarketRead),
    topOfBook: auditTelemetryQuote(telemetry.topOfBook),
    orderRequest: auditTelemetryRequest(telemetry.orderRequest)
  };
}

function auditTelemetryMarketRead(read) {
  return read && typeof read === 'object' ? {
    price: auditRound(read.price),
    requestedAt: read.requestedAt || null,
    receivedAt: read.receivedAt || null,
    roundTripMs: auditRound(read.roundTripMs)
  } : null;
}

function auditTelemetryQuote(quote) {
  return quote && typeof quote === 'object' ? {
    available: Boolean(quote.available),
    reason: quote.reason || '',
    bidPrice: auditRound(quote.bidPrice),
    askPrice: auditRound(quote.askPrice),
    bidQuantity: auditRound(quote.bidQuantity),
    askQuantity: auditRound(quote.askQuantity),
    midPrice: auditRound(quote.midPrice),
    spreadAbsolute: auditRound(quote.spreadAbsolute),
    spreadPercent: auditRound(quote.spreadPercent),
    receivedAt: quote.receivedAt || null,
    exchangeAt: quote.exchangeAt || null,
    ageMs: auditRound(quote.ageMs),
    stale: Boolean(quote.stale)
  } : null;
}

function auditTelemetryRequest(request) {
  return request && typeof request === 'object' ? {
    startedAt: request.startedAt || null,
    completedAt: request.completedAt || null,
    roundTripMs: auditRound(request.roundTripMs)
  } : null;
}

function formatMonthLabel(month) {
  const [year, value] = String(month || '').split('-');
  return value && year ? `${value}/${year}` : String(month || '');
}

function summarizePnlRows(rows = []) {
  return rows.reduce((summary, row) => {
    for (const [type, value] of Object.entries(row.byType || {})) {
      summary.byType[type] = roundMoney((summary.byType[type] || 0) + Number(value || 0));
    }
    return {
      ...summary,
      total: roundMoney(summary.total + Number(row.total || 0)),
      realized: roundMoney(summary.realized + Number(row.realized || 0)),
      fees: roundMoney(summary.fees + Number(row.fees || 0)),
      funding: roundMoney(summary.funding + Number(row.funding || 0)),
      adjustments: roundMoney(summary.adjustments + Number(row.adjustments || 0)),
      closedTrades: summary.closedTrades + Number(row.closedTrades || 0),
      records: summary.records + Number(row.records || 0)
    };
  }, {
    total: 0,
    realized: 0,
    fees: 0,
    funding: 0,
    adjustments: 0,
    closedTrades: 0,
    records: 0,
    byType: {}
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
  if (shutdownPromise) {
    return shutdownPromise;
  }
  shutdownPromise = performShutdown();
  return shutdownPromise;
}

async function performShutdown() {
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  const serverClosed = new Promise((resolveClose) => {
    if (!server.listening) {
      resolveClose();
      return;
    }
    server.close(() => resolveClose());
  });

  for (const client of clients) {
    client.end();
  }
  clients.clear();
  priceFeed.destroy();
  if (entryQuoteWatchTimer) {
    clearTimeout(entryQuoteWatchTimer);
    entryQuoteWatchTimer = null;
  }
  if (backupTimer) {
    clearInterval(backupTimer);
  }
  if (backupStorageTimer) {
    clearInterval(backupStorageTimer);
    backupStorageTimer = null;
  }
  if (signalCoverageTimer) {
    clearInterval(signalCoverageTimer);
  }
  if (bingxClockTimer) {
    clearInterval(bingxClockTimer);
    bingxClockTimer = null;
  }
  if (monthlyResetTimer) {
    clearTimeout(monthlyResetTimer);
    monthlyResetTimer = null;
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
  const results = await Promise.allSettled([
    scraper.close(),
    configStore.flush(),
    store.flush(),
    paperStore.flush(),
    tradeEventStore.flush(),
    executionRetryStore.flush(),
    pnlSnapshotStore.flush(),
    serverClosed
  ]);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`Cierre ordenado incompleto: ${result.reason?.message || result.reason}`);
    }
  }
  clearTimeout(forceExit);
  process.exit(0);
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

async function portOwnerSummary(targetPort) {
  if (process.platform !== 'win32') {
    return 'otro proceso';
  }
  try {
    const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], { windowsHide: true });
    const line = String(stdout || '')
      .split(/\r?\n/)
      .find((item) => new RegExp(`:${targetPort}\\s+.*LISTENING\\s+\\d+\\s*$`, 'i').test(item));
    const pid = line?.trim().split(/\s+/).at(-1);
    if (!pid) {
      return 'otro proceso (PID no disponible)';
    }
    const task = await execFileAsync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { windowsHide: true })
      .catch(() => ({ stdout: '' }));
    const processName = String(task.stdout || '').match(/^"([^"]+)"/)?.[1];
    return processName ? `${processName} (PID ${pid})` : `el PID ${pid}`;
  } catch {
    return 'otro proceso (propietario no disponible)';
  }
}

function currentMonthKeyForDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthKeyFromIso(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? currentMonthKeyForDate(date) : '';
}
