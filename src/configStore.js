import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const defaultConfig = {
  version: 1,
  portfolio: {
    url: 'https://4tfs.short.gy/14may',
    detectedAt: null,
    postId: null,
    postUrl: null,
    resolvedUrl: null,
    spreadsheetId: null
  },
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyBackfill: false,
    notifyHealth: true,
    healthStaleMinutes: 3
  },
  telegramSource: {
    enabled: false,
    url: '',
    maxMessages: 40,
    refreshSeconds: 30,
    executeSignals: false,
    executeOpenSignals: false,
    liveConfirmed: false
  },
  monitor: {
    autoResume: false,
    channelUrl: '',
    backfill: false,
    live: true,
    pollIntervalSeconds: 30,
    maxScrolls: 120,
    updatedAt: null
  },
  bingx: {
    enabled: false,
    mode: 'test',
    apiKey: '',
    apiSecret: '',
    defaultNotionalUSDT: 30,
    maxNotionalUSDT: 30,
    monthlyInitialCapitalUSDT: 300,
    monthlyInitialCapitalVST: 300,
    monthlyOrderPercent: 10,
    maxLeverage: 5,
    marginType: 'ISOLATED',
    requireStopLoss: true,
    forceMarketEntries: false,
    allowedSymbols: '',
    liveConfirmed: false,
    entriesPaused: false,
    managementOnly: false,
    dryRunRequired: true,
    dryRunCompletedAt: null,
    maxOpenPositions: 5,
    maxDailyOrders: 0,
    maxDailyLossUSDT: 0,
    maxMonthlyLossUSDT: 0,
    maxSignalLeverage: 125,
    maxSignalAgeMinutes: 5,
    maxEntryDeviationPercent: 0.15,
    maxStopDistancePercent: 5,
    costGuardEnabled: true,
    costGuardMode: 'block',
    costGuardFeeBuffer: 2,
    costGuardMaxMarginBreakEvenPercent: 3,
    estimatedCommissionRebatePercent: 22,
    improvementCohortStartedAt: null,
    vstBaseCapital: 300,
    vstCapitalPercent: 10,
    vstPnlResetAt: null,
    livePnlResetAt: null,
    monthlyResetAt: null,
    monthlyResetMonth: null
  }
};

export class ConfigStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = structuredClone(defaultConfig);
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = mergeConfig(parsed);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }
  }

  async save() {
    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`);
  }

  getTelegram({ includeToken = false } = {}) {
    const telegram = this.data.telegram;
    if (includeToken) {
      return { ...telegram };
    }

    return {
      enabled: telegram.enabled,
      chatId: telegram.chatId,
      notifyBackfill: telegram.notifyBackfill,
      notifyHealth: telegram.notifyHealth,
      healthStaleMinutes: telegram.healthStaleMinutes,
      botTokenConfigured: Boolean(telegram.botToken),
      botTokenPreview: tokenPreview(telegram.botToken)
    };
  }

  async updateTelegram(input) {
    const current = this.data.telegram;
    const next = {
      enabled: Boolean(input.enabled),
      botToken: current.botToken,
      chatId: clean(input.chatId),
      notifyBackfill: Boolean(input.notifyBackfill),
      notifyHealth: input.notifyHealth !== false,
      healthStaleMinutes: clampInteger(input.healthStaleMinutes, 1, 60, defaultConfig.telegram.healthStaleMinutes)
    };

    if (input.clearBotToken) {
      next.botToken = '';
    } else if (typeof input.botToken === 'string' && input.botToken.trim()) {
      next.botToken = input.botToken.trim();
    }

    this.data.telegram = next;
    await this.save();
    return this.getTelegram();
  }

  async updateTelegramChatId(chatId) {
    this.data.telegram.chatId = clean(chatId);
    await this.save();
    return this.getTelegram();
  }

  getTelegramSource() {
    return { ...this.data.telegramSource };
  }

  async updateTelegramSource(input = {}) {
    const next = {
      enabled: Boolean(input.enabled),
      url: clean(input.url),
      maxMessages: clampInteger(input.maxMessages, 5, 200, defaultConfig.telegramSource.maxMessages),
      refreshSeconds: clampInteger(input.refreshSeconds, 30, 3600, defaultConfig.telegramSource.refreshSeconds),
      executeSignals: Boolean(input.executeSignals),
      executeOpenSignals: Boolean(input.executeOpenSignals),
      liveConfirmed: Boolean(input.executeSignals && input.liveConfirmed)
    };

    this.data.telegramSource = next;
    await this.save();
    return this.getTelegramSource();
  }

  getMonitor() {
    return { ...this.data.monitor };
  }

  async updateMonitor(input = {}) {
    const current = this.data.monitor || defaultConfig.monitor;
    const next = {
      autoResume: Boolean(input.autoResume),
      channelUrl: clean(input.channelUrl) || current.channelUrl || defaultConfig.monitor.channelUrl,
      backfill: Boolean(input.backfill),
      live: input.live === undefined ? current.live !== false : Boolean(input.live),
      pollIntervalSeconds: clampInteger(
        input.pollIntervalSeconds,
        5,
        3600,
        current.pollIntervalSeconds || defaultConfig.monitor.pollIntervalSeconds
      ),
      maxScrolls: clampInteger(
        input.maxScrolls,
        0,
        1000,
        current.maxScrolls || defaultConfig.monitor.maxScrolls
      ),
      updatedAt: new Date().toISOString()
    };

    this.data.monitor = next;
    await this.save();
    return this.getMonitor();
  }

  getBingX({ includeSecrets = false } = {}) {
    const bingx = normalizeBingXConfig(this.data.bingx);
    if (includeSecrets) {
      return { ...bingx };
    }

    return {
      enabled: bingx.enabled,
      mode: bingx.mode,
      environment: environmentForMode(bingx.mode),
      defaultNotionalUSDT: bingx.defaultNotionalUSDT,
      maxNotionalUSDT: bingx.maxNotionalUSDT,
      monthlyInitialCapitalUSDT: bingx.monthlyInitialCapitalUSDT,
      monthlyInitialCapitalVST: bingx.monthlyInitialCapitalVST,
      monthlyOrderPercent: bingx.monthlyOrderPercent,
      monthlyOrderNotionalUSDT: bingx.monthlyOrderNotionalUSDT,
      monthlyOrderNotionalVST: bingx.monthlyOrderNotionalVST,
      maxLeverage: bingx.maxLeverage,
      marginType: bingx.marginType,
      requireStopLoss: bingx.requireStopLoss,
      forceMarketEntries: Boolean(bingx.forceMarketEntries),
      allowedSymbols: bingx.allowedSymbols,
      liveConfirmed: bingx.liveConfirmed,
      entriesPaused: Boolean(bingx.entriesPaused),
      managementOnly: Boolean(bingx.managementOnly),
      dryRunRequired: bingx.dryRunRequired,
      dryRunCompletedAt: bingx.dryRunCompletedAt,
      maxOpenPositions: bingx.maxOpenPositions,
      maxDailyOrders: bingx.maxDailyOrders,
      maxDailyLossUSDT: bingx.maxDailyLossUSDT,
      maxMonthlyLossUSDT: bingx.maxMonthlyLossUSDT,
      maxSignalLeverage: bingx.maxSignalLeverage,
      maxSignalAgeMinutes: bingx.maxSignalAgeMinutes,
      maxEntryDeviationPercent: bingx.maxEntryDeviationPercent,
      maxStopDistancePercent: bingx.maxStopDistancePercent,
      costGuardEnabled: Boolean(bingx.costGuardEnabled),
      costGuardMode: bingx.costGuardMode,
      costGuardFeeBuffer: bingx.costGuardFeeBuffer,
      costGuardMaxMarginBreakEvenPercent: bingx.costGuardMaxMarginBreakEvenPercent,
      estimatedCommissionRebatePercent: bingx.estimatedCommissionRebatePercent,
      improvementCohortStartedAt: bingx.improvementCohortStartedAt || null,
      vstBaseCapital: bingx.vstBaseCapital,
      vstCapitalPercent: bingx.vstCapitalPercent,
      vstPnlResetAt: bingx.vstPnlResetAt || null,
      livePnlResetAt: bingx.livePnlResetAt || null,
      monthlyResetAt: bingx.monthlyResetAt || null,
      monthlyResetMonth: bingx.monthlyResetMonth || null,
      apiKeyConfigured: Boolean(bingx.apiKey),
      apiSecretConfigured: Boolean(bingx.apiSecret),
      apiKeyPreview: tokenPreview(bingx.apiKey),
      apiSecretPreview: tokenPreview(bingx.apiSecret)
    };
  }

  async updateBingX(input) {
    const current = this.data.bingx;
    const mode = normalizeBingXMode(input.mode);
    const currentNormalized = normalizeBingXConfig(current);
    const monthlyInitialCapitalUSDT = positiveNumber(
      input.monthlyInitialCapitalUSDT,
      currentNormalized.monthlyInitialCapitalUSDT || defaultConfig.bingx.monthlyInitialCapitalUSDT
    );
    const monthlyInitialCapitalVST = positiveNumber(
      input.monthlyInitialCapitalVST,
      currentNormalized.monthlyInitialCapitalVST || defaultConfig.bingx.monthlyInitialCapitalVST
    );
    const monthlyOrderPercent = clampNumber(
      input.monthlyOrderPercent,
      1,
      100,
      currentNormalized.monthlyOrderPercent || defaultConfig.bingx.monthlyOrderPercent
    );
    const monthlyOrderNotionalUSDT = monthlyOrderNotional(monthlyInitialCapitalUSDT, monthlyOrderPercent);
    const next = {
      enabled: Boolean(input.enabled),
      mode,
      apiKey: current.apiKey,
      apiSecret: current.apiSecret,
      defaultNotionalUSDT: monthlyOrderNotionalUSDT,
      maxNotionalUSDT: monthlyOrderNotionalUSDT,
      monthlyInitialCapitalUSDT,
      monthlyInitialCapitalVST,
      monthlyOrderPercent,
      maxLeverage: clampInteger(input.maxLeverage, 1, 125, defaultConfig.bingx.maxLeverage),
      marginType: clean(input.marginType).toUpperCase() === 'CROSSED' ? 'CROSSED' : 'ISOLATED',
      requireStopLoss: Boolean(input.requireStopLoss),
      forceMarketEntries: Boolean(input.forceMarketEntries),
      allowedSymbols: clean(input.allowedSymbols),
      liveConfirmed: (mode === 'live' || mode === 'dual') && Boolean(input.liveConfirmed),
      entriesPaused: Boolean(input.entriesPaused),
      managementOnly: Boolean(input.managementOnly),
      dryRunRequired: input.dryRunRequired !== false,
      dryRunCompletedAt: current.dryRunCompletedAt || null,
      maxOpenPositions: clampInteger(input.maxOpenPositions, 1, 100, defaultConfig.bingx.maxOpenPositions),
      maxDailyOrders: clampInteger(input.maxDailyOrders, 0, 500, defaultConfig.bingx.maxDailyOrders),
      maxDailyLossUSDT: nonNegativeNumber(input.maxDailyLossUSDT, defaultConfig.bingx.maxDailyLossUSDT),
      maxMonthlyLossUSDT: nonNegativeNumber(input.maxMonthlyLossUSDT, defaultConfig.bingx.maxMonthlyLossUSDT),
      maxSignalLeverage: clampInteger(input.maxSignalLeverage, 1, 125, defaultConfig.bingx.maxSignalLeverage),
      maxSignalAgeMinutes: clampInteger(input.maxSignalAgeMinutes, 0, 1440, defaultConfig.bingx.maxSignalAgeMinutes),
      maxEntryDeviationPercent: clampNumber(input.maxEntryDeviationPercent, 0, 50, defaultConfig.bingx.maxEntryDeviationPercent),
      maxStopDistancePercent: clampNumber(input.maxStopDistancePercent, 0, 50, defaultConfig.bingx.maxStopDistancePercent),
      costGuardEnabled: input.costGuardEnabled !== false,
      costGuardMode: normalizeCostGuardMode(input.costGuardMode),
      costGuardFeeBuffer: clampNumber(input.costGuardFeeBuffer, 1, 10, defaultConfig.bingx.costGuardFeeBuffer),
      costGuardMaxMarginBreakEvenPercent: clampNumber(
        input.costGuardMaxMarginBreakEvenPercent,
        0,
        100,
        defaultConfig.bingx.costGuardMaxMarginBreakEvenPercent
      ),
      estimatedCommissionRebatePercent: clampNumber(
        input.estimatedCommissionRebatePercent,
        0,
        100,
        defaultConfig.bingx.estimatedCommissionRebatePercent
      ),
      improvementCohortStartedAt: isoDateOrCurrent(
        input.improvementCohortStartedAt,
        current.improvementCohortStartedAt || defaultConfig.bingx.improvementCohortStartedAt
      ),
      vstBaseCapital: monthlyInitialCapitalVST,
      vstCapitalPercent: monthlyOrderPercent,
      vstPnlResetAt: input.clearVstPnlReset
        ? null
        : isoDateOrCurrent(input.vstPnlResetAt, current.vstPnlResetAt || defaultConfig.bingx.vstPnlResetAt),
      livePnlResetAt: input.clearLivePnlReset
        ? null
        : isoDateOrCurrent(input.livePnlResetAt, current.livePnlResetAt || defaultConfig.bingx.livePnlResetAt),
      monthlyResetAt: current.monthlyResetAt || null,
      monthlyResetMonth: current.monthlyResetMonth || null
    };

    if (input.clearApiKey) {
      next.apiKey = '';
    } else if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
      next.apiKey = input.apiKey.trim();
    }

    if (input.clearApiSecret) {
      next.apiSecret = '';
    } else if (typeof input.apiSecret === 'string' && input.apiSecret.trim()) {
      next.apiSecret = input.apiSecret.trim();
    }

    this.data.bingx = next;
    await this.save();
    return this.getBingX();
  }

  async ensureImprovementCohort({ startedAt = new Date() } = {}) {
    const current = normalizeBingXConfig(this.data.bingx);
    if (current.improvementCohortStartedAt) {
      return current.improvementCohortStartedAt;
    }
    const date = startedAt instanceof Date ? startedAt : new Date(startedAt);
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
    this.data.bingx.improvementCohortStartedAt = safeDate.toISOString();
    await this.save();
    return this.data.bingx.improvementCohortStartedAt;
  }

  async resetImprovementCohort({ startedAt = new Date() } = {}) {
    const date = startedAt instanceof Date ? startedAt : new Date(startedAt);
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
    this.data.bingx.improvementCohortStartedAt = safeDate.toISOString();
    await this.save();
    return this.getBingX();
  }

  async resetMonthlyAccounting({ resetAt = new Date(), month = null } = {}) {
    const date = resetAt instanceof Date ? resetAt : new Date(resetAt);
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
    this.data.bingx.vstPnlResetAt = safeDate.toISOString();
    this.data.bingx.livePnlResetAt = safeDate.toISOString();
    this.data.bingx.monthlyResetAt = new Date().toISOString();
    this.data.bingx.monthlyResetMonth = clean(month) || monthKey(safeDate);
    await this.save();
    return this.getBingX();
  }

  async markDryRunCompleted(date = new Date()) {
    this.data.bingx.dryRunCompletedAt = date.toISOString();
    await this.save();
    return this.getBingX();
  }

  getPortfolio() {
    return { ...this.data.portfolio };
  }

  async updatePortfolio(input = {}) {
    const current = this.data.portfolio || defaultConfig.portfolio;
    const nextUrl = clean(input.url) || current.url || defaultConfig.portfolio.url;
    const urlChanged = nextUrl !== current.url;
    this.data.portfolio = {
      ...current,
      url: nextUrl,
      detectedAt: clean(input.detectedAt) || current.detectedAt || null,
      postId: clean(input.postId) || current.postId || null,
      postUrl: clean(input.postUrl) || current.postUrl || null,
      resolvedUrl: clean(input.resolvedUrl) || (urlChanged ? null : current.resolvedUrl || null),
      spreadsheetId: clean(input.spreadsheetId) || (urlChanged ? null : current.spreadsheetId || null)
    };
    await this.save();
    return this.getPortfolio();
  }
}

function mergeConfig(input) {
  return {
    ...structuredClone(defaultConfig),
    ...input,
    telegram: {
      ...defaultConfig.telegram,
      ...(input?.telegram || {})
    },
    telegramSource: {
      ...defaultConfig.telegramSource,
      ...(input?.telegramSource || {})
    },
    monitor: {
      ...defaultConfig.monitor,
      ...(input?.monitor || {})
    },
    portfolio: {
      ...defaultConfig.portfolio,
      ...(input?.portfolio || {})
    },
    bingx: {
      ...defaultConfig.bingx,
      ...(input?.bingx || {})
    }
  };
}

function clean(value) {
  return String(value || '').trim();
}

function normalizeBingXMode(value) {
  const mode = clean(value).toLowerCase();
  return ['test', 'demo', 'live', 'dual'].includes(mode) ? mode : 'test';
}

function environmentForMode(mode) {
  if (mode === 'dual') {
    return 'prod-vst+prod-live';
  }
  return mode === 'demo' ? 'prod-vst' : 'prod-live';
}

function normalizeCostGuardMode(value) {
  return clean(value).toLowerCase() === 'block' ? 'block' : 'warn';
}

function normalizeBingXConfig(input = {}) {
  const monthlyInitialCapitalUSDT = positiveNumber(
    input.monthlyInitialCapitalUSDT,
    defaultConfig.bingx.monthlyInitialCapitalUSDT
  );
  const monthlyInitialCapitalVST = positiveNumber(
    input.monthlyInitialCapitalVST,
    defaultConfig.bingx.monthlyInitialCapitalVST
  );
  const monthlyOrderPercent = clampNumber(
    input.monthlyOrderPercent,
    1,
    100,
    defaultConfig.bingx.monthlyOrderPercent
  );
  const monthlyOrderNotionalUSDT = monthlyOrderNotional(monthlyInitialCapitalUSDT, monthlyOrderPercent);
  const monthlyOrderNotionalVST = monthlyOrderNotional(monthlyInitialCapitalVST, monthlyOrderPercent);

  return {
    ...input,
    defaultNotionalUSDT: monthlyOrderNotionalUSDT,
    maxNotionalUSDT: monthlyOrderNotionalUSDT,
    monthlyInitialCapitalUSDT,
    monthlyInitialCapitalVST,
    monthlyOrderPercent,
    monthlyOrderNotionalUSDT,
    monthlyOrderNotionalVST,
    maxSignalAgeMinutes: clampInteger(input.maxSignalAgeMinutes, 0, 1440, defaultConfig.bingx.maxSignalAgeMinutes),
    maxEntryDeviationPercent: clampNumber(input.maxEntryDeviationPercent, 0, 50, defaultConfig.bingx.maxEntryDeviationPercent),
    maxStopDistancePercent: clampNumber(input.maxStopDistancePercent, 0, 50, defaultConfig.bingx.maxStopDistancePercent),
    costGuardEnabled: input.costGuardEnabled !== false,
    costGuardMode: normalizeCostGuardMode(input.costGuardMode),
    costGuardFeeBuffer: clampNumber(input.costGuardFeeBuffer, 1, 10, defaultConfig.bingx.costGuardFeeBuffer),
    costGuardMaxMarginBreakEvenPercent: clampNumber(
      input.costGuardMaxMarginBreakEvenPercent,
      0,
      100,
      defaultConfig.bingx.costGuardMaxMarginBreakEvenPercent
    ),
    estimatedCommissionRebatePercent: clampNumber(
      input.estimatedCommissionRebatePercent,
      0,
      100,
      defaultConfig.bingx.estimatedCommissionRebatePercent
    ),
    vstBaseCapital: monthlyInitialCapitalVST,
    vstCapitalPercent: monthlyOrderPercent
  };
}

function monthlyOrderNotional(capital, percent) {
  return roundMoney(Number(capital || 0) * (Number(percent || 0) / 100));
}

function tokenPreview(token) {
  if (!token) {
    return '';
  }
  return `...${token.slice(-6)}`;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function clampInteger(value, min, max, fallback) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function isoDateOrCurrent(value, current) {
  if (value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    return current || null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : current || null;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
