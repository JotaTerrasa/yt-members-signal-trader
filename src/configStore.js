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
    refreshSeconds: 300,
    executeSignals: false,
    executeOpenSignals: false,
    liveConfirmed: false
  },
  bingx: {
    enabled: false,
    mode: 'test',
    apiKey: '',
    apiSecret: '',
    defaultNotionalUSDT: 10,
    maxNotionalUSDT: 25,
    maxLeverage: 5,
    marginType: 'ISOLATED',
    requireStopLoss: true,
    allowedSymbols: '',
    liveConfirmed: false,
    dryRunRequired: true,
    dryRunCompletedAt: null,
    maxOpenPositions: 5,
    maxDailyLossUSDT: 0,
    maxMonthlyLossUSDT: 0,
    maxSignalLeverage: 125,
    vstBaseCapital: 1000,
    vstCapitalPercent: 15
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

  getBingX({ includeSecrets = false } = {}) {
    const bingx = this.data.bingx;
    if (includeSecrets) {
      return { ...bingx };
    }

    return {
      enabled: bingx.enabled,
      mode: bingx.mode,
      environment: environmentForMode(bingx.mode),
      defaultNotionalUSDT: bingx.defaultNotionalUSDT,
      maxNotionalUSDT: bingx.maxNotionalUSDT,
      maxLeverage: bingx.maxLeverage,
      marginType: bingx.marginType,
      requireStopLoss: bingx.requireStopLoss,
      allowedSymbols: bingx.allowedSymbols,
      liveConfirmed: bingx.liveConfirmed,
      dryRunRequired: bingx.dryRunRequired,
      dryRunCompletedAt: bingx.dryRunCompletedAt,
      maxOpenPositions: bingx.maxOpenPositions,
      maxDailyLossUSDT: bingx.maxDailyLossUSDT,
      maxMonthlyLossUSDT: bingx.maxMonthlyLossUSDT,
      maxSignalLeverage: bingx.maxSignalLeverage,
      vstBaseCapital: bingx.vstBaseCapital,
      vstCapitalPercent: bingx.vstCapitalPercent,
      apiKeyConfigured: Boolean(bingx.apiKey),
      apiSecretConfigured: Boolean(bingx.apiSecret),
      apiKeyPreview: tokenPreview(bingx.apiKey),
      apiSecretPreview: tokenPreview(bingx.apiSecret)
    };
  }

  async updateBingX(input) {
    const current = this.data.bingx;
    const mode = normalizeBingXMode(input.mode);
    const next = {
      enabled: Boolean(input.enabled),
      mode,
      apiKey: current.apiKey,
      apiSecret: current.apiSecret,
      defaultNotionalUSDT: positiveNumber(input.defaultNotionalUSDT, defaultConfig.bingx.defaultNotionalUSDT),
      maxNotionalUSDT: positiveNumber(input.maxNotionalUSDT, defaultConfig.bingx.maxNotionalUSDT),
      maxLeverage: clampInteger(input.maxLeverage, 1, 125, defaultConfig.bingx.maxLeverage),
      marginType: clean(input.marginType).toUpperCase() === 'CROSSED' ? 'CROSSED' : 'ISOLATED',
      requireStopLoss: Boolean(input.requireStopLoss),
      allowedSymbols: clean(input.allowedSymbols),
      liveConfirmed: (mode === 'live' || mode === 'dual') && Boolean(input.liveConfirmed),
      dryRunRequired: input.dryRunRequired !== false,
      dryRunCompletedAt: current.dryRunCompletedAt || null,
      maxOpenPositions: clampInteger(input.maxOpenPositions, 1, 100, defaultConfig.bingx.maxOpenPositions),
      maxDailyLossUSDT: nonNegativeNumber(input.maxDailyLossUSDT, defaultConfig.bingx.maxDailyLossUSDT),
      maxMonthlyLossUSDT: nonNegativeNumber(input.maxMonthlyLossUSDT, defaultConfig.bingx.maxMonthlyLossUSDT),
      maxSignalLeverage: clampInteger(input.maxSignalLeverage, 1, 125, defaultConfig.bingx.maxSignalLeverage),
      vstBaseCapital: positiveNumber(input.vstBaseCapital, defaultConfig.bingx.vstBaseCapital),
      vstCapitalPercent: clampNumber(input.vstCapitalPercent, 1, 100, defaultConfig.bingx.vstCapitalPercent)
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
