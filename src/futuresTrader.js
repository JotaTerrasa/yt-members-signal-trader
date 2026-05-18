import { BingXClient } from './bingxClient.js';
import { parseFuturesSignal, parseFuturesSignals } from './futuresSignalParser.js';

export class FuturesTrader {
  constructor({ configStore, paperStore, onLog, onTrade }) {
    this.configStore = configStore;
    this.paperStore = paperStore;
    this.onLog = onLog;
    this.onTrade = onTrade;
    this.contractCache = new Map();
  }

  parse(text) {
    return parseFuturesSignal(text);
  }

  parseAll(text) {
    return parseFuturesSignals(text);
  }

  async testConnection() {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const client = this.client(config);
    return client.getBalance();
  }

  async applyVst({ amount = 10000 } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const client = this.client({ ...config, mode: 'demo' });
    return client.getVst({ amount, adjustType: 0 });
  }

  async executeProbe(input = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const symbol = normalizeSymbol(input.symbol || 'BTC-USDT');
    const direction = String(input.direction || 'LONG').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
    const notionalUSDT = positiveNumber(input.notionalUSDT, config.defaultNotionalUSDT || 10);
    const leverage = Math.max(1, Math.trunc(Number(input.leverage || config.maxLeverage || 1)));
    const stopLossPercent = clampNumber(input.stopLossPercent, 0.05, 5, 0.35);
    const takeProfitPercent = clampNumber(input.takeProfitPercent, 0.05, 10, stopLossPercent * 2);
    const client = this.client(config);
    const entryPrice = await this.fetchMarketPrice(client, symbol);
    const stopLoss = direction === 'LONG'
      ? entryPrice * (1 - stopLossPercent / 100)
      : entryPrice * (1 + stopLossPercent / 100);
    const takeProfit = direction === 'LONG'
      ? entryPrice * (1 + takeProfitPercent / 100)
      : entryPrice * (1 - takeProfitPercent / 100);

    const signal = {
      isSignal: true,
      symbol,
      direction,
      entry: { type: 'MARKET', price: null },
      stopLoss,
      takeProfits: [takeProfit],
      leverage,
      notionalUSDT,
      rawText: [
        'PRUEBA MANUAL CONTROLADA',
        `${direction} ${symbol}`,
        `entry mercado ${entryPrice}`,
        `SL ${stopLoss}`,
        `TP ${takeProfit}`,
        `${leverage}x`,
        `${notionalUSDT} USDT`
      ].join('\n')
    };

    return this.executeSignal(signal, {
      post: {
        id: `manual-probe-${Date.now()}`,
        url: null
      },
      phase: 'manual_probe'
    });
  }

  async getMonthlyPnl({ months = 3 } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const client = this.client(config);
    const ranges = buildMonthRanges(months);
    const records = [];

    for (const range of ranges) {
      const response = await client.getIncome({
        startTime: range.startTime,
        endTime: range.endTime,
        limit: 1000
      });
      const items = Array.isArray(response.data) ? response.data : [];
      records.push(...items);
    }

    const summary = buildPnlSummary(records, ranges);
    if (this.paperStore) {
      const positions = await this.paperStore.markToMarket((symbol) => this.fetchMarketPrice(client, symbol));
      mergePaperSummary(summary, this.paperStore.monthlySummary(ranges), positions);
    }
    return summary;
  }

  async getPaperOnlyPnl({ months = 3, warning = '' } = {}) {
    const ranges = buildMonthRanges(months);
    const summary = buildPnlSummary([], ranges);
    if (this.paperStore) {
      mergePaperSummary(summary, this.paperStore.monthlySummary(ranges), this.paperStore.list());
    }
    if (warning) {
      summary.warning = warning;
    }
    return summary;
  }

  async getExchangeOpenPositions() {
    const config = this.configStore.getBingX({ includeSecrets: true });
    if (!config.enabled || config.mode === 'test' || !config.apiKey || !config.apiSecret) {
      return [];
    }

    const client = this.client(config);
    const response = await client.getPositions();
    const rows = Array.isArray(response.data) ? response.data : [];
    const open = rows.filter((position) => Math.abs(Number(position.availableAmt || position.positionAmt || 0)) > 0);

    return Promise.all(open.map((position) => this.normalizeExchangePosition(client, position, config).catch((error) => ({
      id: `exchange_${position.symbol}_${position.positionSide || position.side || 'BOTH'}`,
      source: config.mode,
      status: 'open',
      symbol: position.symbol,
      direction: normalizePositionSide(position),
      quantity: Math.abs(Number(position.availableAmt || position.positionAmt || 0)),
      leverage: Number(position.leverage || 0),
      error: error.message,
      raw: position
    }))));
  }

  async normalizeExchangePosition(client, position, config) {
    const symbol = position.symbol;
    const quantity = Math.abs(Number(position.availableAmt || position.positionAmt || 0));
    const entryPrice = firstFiniteNumber([
      position.avgPrice,
      position.averagePrice,
      position.entryPrice,
      position.positionAvgPrice
    ]);
    const currentPrice = firstFiniteNumber([
      position.markPrice,
      position.lastPrice
    ]) || await this.fetchMarketPrice(client, symbol).catch(() => entryPrice);
    const leverage = Number(position.leverage || 0);
    const exposure = firstFiniteNumber([
      position.positionValue,
      position.notional,
      position.positionNotional,
      Number.isFinite(currentPrice) ? quantity * currentPrice : NaN
    ]);
    const notional = leverage > 0 && Number.isFinite(exposure) ? exposure / leverage : exposure;
    const unrealizedPnl = firstFiniteNumber([
      position.unrealizedProfit,
      position.unrealizedPnl,
      position.pnl,
      position.profit
    ]) || 0;

    return {
      id: `exchange_${config.mode}_${symbol}_${position.positionId || position.positionSide || position.side || 'BOTH'}`,
      source: config.mode,
      status: 'open',
      symbol,
      direction: normalizePositionSide(position),
      quantity,
      entryPrice,
      currentPrice,
      closePrice: null,
      stopLoss: null,
      takeProfit: null,
      leverage,
      notional,
      exposure,
      unrealizedPnl,
      realizedPnl: 0,
      paperPnl: unrealizedPnl,
      openedAt: timestampIso([
        position.createTime,
        position.updateTime,
        position.openTime,
        position.time
      ]),
      closedAt: null,
      raw: position
    };
  }

  async processPosts(posts, payload) {
    const results = [];
    for (const post of posts) {
      const signals = parseFuturesSignals(post.text || '').filter((signal) => signal.isSignal);
      for (const signal of signals) {
        const result = signal.action === 'CLOSE'
          ? await this.executeCloseSignal(signal, { post, phase: payload.phase })
          : signal.action === 'MOVE_SL_BE'
            ? await this.executeMoveStopSignal(signal, { post, phase: payload.phase })
            : await this.executeSignal(signal, { post, phase: payload.phase });
        results.push(result);
      }
    }
    return results;
  }

  async executeCloseSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    if (config.mode === 'live' && !config.liveConfirmed) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'live_not_confirmed' });
    }

    const client = this.client(config);
    const closePrice = Number(signal.closePrice) || await this.fetchMarketPrice(client, signal.symbol);
    const closePercent = Number(signal.closePercent || 100);
    const closedPaperPositions = config.mode === 'test' && this.paperStore
      ? await this.paperStore.closeBySymbol({ symbol: signal.symbol, price: closePrice, percent: closePercent, reason: 'youtube_close', post, phase })
      : [];
    const exchangeClose = config.mode !== 'test'
      ? await this.closeExchangePositions({ client, signal, closePercent })
      : null;

    const event = this.emitTrade({
      ...baseEvent,
      status: closeStatus(config, exchangeClose),
      closePrice,
      closePercent,
      closedPaperPositions,
      exchangeClose
    });

    if (closedPaperPositions.length) {
      this.log(`PAPER CLOSE ${signal.symbol} ${closePercent}% @ ${closePrice} (${closedPaperPositions.length})`, 'info');
    } else if (exchangeClose?.orders?.length) {
      this.log(`${modePrefix(config)} CLOSE ${signal.symbol} ${closePercent}% (${exchangeClose.orders.length})`, config.mode === 'live' ? 'warn' : 'info');
    } else {
      this.log(`Cierre detectado para ${signal.symbol}, sin posicion paper abierta.`, 'warn');
    }

    return event;
  }

  async executeMoveStopSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    const movedPaperPositions = config.mode === 'test' && this.paperStore
      ? await this.paperStore.moveStopToBreakEven({ symbol: signal.symbol, post, phase })
      : [];

    const event = this.emitTrade({
      ...baseEvent,
      status: config.mode === 'test' ? 'paper_sl_be_sent' : `${config.mode}_sl_be_detected`,
      movedPaperPositions
    });

    if (movedPaperPositions.length) {
      this.log(`PAPER SL BE ${signal.symbol} (${movedPaperPositions.length})`, 'info');
    } else {
      this.log(`SL a BE detectado para ${signal.symbol}, sin posicion paper abierta.`, 'warn');
    }

    return event;
  }

  async executeSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    if (config.mode === 'live' && !config.liveConfirmed) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'live_not_confirmed' });
    }

    if (config.mode === 'live' && config.dryRunRequired && !config.dryRunCompletedAt) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'dry_run_required' });
    }

    const validation = validateSignal(signal, config);
    if (!validation.ok) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: validation.reason });
    }

    const client = this.client(config);
    const contract = await this.getContract(client, signal.symbol);
    const leverageResult = resolveLeverage(signal, config, contract);
    if (!leverageResult.ok) {
      return this.emitTrade({
        ...baseEvent,
        status: 'blocked',
        reason: leverageResult.reason
      });
    }

    const leverage = leverageResult.value;
    const riskValidation = this.validateRisk(signal, config, { leverage });
    if (!riskValidation.ok) {
      return this.emitTrade({
        ...baseEvent,
        status: 'blocked',
        reason: riskValidation.reason,
        risk: riskValidation.snapshot
      });
    }

    const referenceEntryPrice = signal.entry?.price ? Number(signal.entry.price) : null;
    const entryPrice = await this.fetchMarketPrice(client, signal.symbol);
    const sizing = await this.resolveOrderSizing({ client, signal, config });
    const notional = sizing.notional;
    const exposure = notional * leverage;
    const quantity = roundDown(exposure / entryPrice, contract.quantityPrecision);

    if (quantity <= 0 || quantity < contract.tradeMinQuantity || notional < contract.tradeMinUSDT) {
      return this.emitTrade({
        ...baseEvent,
        status: 'blocked',
        reason: `quantity_too_small:${quantity}`
      });
    }

    await client.setMarginType({ symbol: signal.symbol, marginType: config.marginType }).catch((error) => {
      this.log(`BingX marginType: ${error.message}`, 'warn');
    });
    await client.setLeverage({ symbol: signal.symbol, side: signal.direction, leverage });

    const order = buildOrder({
      signal,
      quantity,
      leverage,
      clientOrderId: clientOrderId(post?.id || signal.rawText)
    });
    const test = config.mode === 'test';
    const response = await client.placeOrder(order, { test });
    const paperPosition = test && this.paperStore
      ? await this.paperStore.openPosition({ signal, post, phase, order, response, entryPrice, quantity, leverage, notional, exposure })
      : null;
    const bingx = test ? await this.configStore.markDryRunCompleted().catch(() => null) : null;

    const result = this.emitTrade({
      ...baseEvent,
      status: orderStatus(config),
      order,
      response,
      sizing,
      referenceEntryPrice,
      paperPosition,
      bingx
    });

    this.log(`${modePrefix(config)} ${signal.symbol} ${signal.direction} qty ${quantity}`, test || config.mode === 'demo' ? 'info' : 'warn');
    return result;
  }

  async getContract(client, symbol) {
    if (this.contractCache.has(symbol)) {
      return this.contractCache.get(symbol);
    }

    const response = await client.getContracts(symbol);
    const item = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!item || item.apiStateOpen !== 'true') {
      throw new Error(`BingX no permite abrir ${symbol} por API ahora mismo.`);
    }

    const contract = {
      symbol: item.symbol,
      quantityPrecision: Number(item.quantityPrecision || 4),
      pricePrecision: Number(item.pricePrecision || 4),
      tradeMinQuantity: Number(item.tradeMinQuantity || 0),
      tradeMinUSDT: Number(item.tradeMinUSDT || 0),
      maxLeverage: contractMaxLeverage(item)
    };
    this.contractCache.set(symbol, contract);
    return contract;
  }

  async fetchMarketPrice(client, symbol) {
    const ticker = await client.getTicker(symbol);
    return Number(ticker.data?.lastPrice || ticker.data?.price || ticker.data?.askPrice || ticker.data?.bidPrice);
  }

  async resolveOrderSizing({ client, signal, config }) {
    if (config.mode === 'demo') {
      const balance = await this.fetchAccountCapital(client);
      const baseCapital = positiveNumber(config.vstBaseCapital, 1000);
      const percent = clampNumber(config.vstCapitalPercent, 1, 100, 15);
      const notional = roundMoney(baseCapital * (percent / 100));
      if (balance.available < notional) {
        throw new Error(`No hay VST disponible suficiente: hacen falta ${notional} ${balance.asset} y hay ${roundMoney(balance.available)} ${balance.asset}.`);
      }
      return {
        mode: 'vst_fixed_base_percent',
        baseCapital,
        capitalPercent: percent,
        availableCapital: balance.available,
        asset: balance.asset,
        notional
      };
    }

    const signalNotional = Number(signal.notionalUSDT);
    const requestedNotional = Number.isFinite(signalNotional) && signalNotional > 0
      ? signalNotional
      : Number(config.defaultNotionalUSDT);
    const notional = config.mode === 'test'
      ? requestedNotional
      : Math.min(requestedNotional, Number(config.maxNotionalUSDT));

    return {
      mode: signal.notionalUSDT ? 'signal_notional' : 'configured_notional',
      notional
    };
  }

  async fetchAccountCapital(client) {
    const response = await client.getBalance();
    const rows = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
    const preferred = rows.find((row) => ['VST', 'USDT'].includes(String(row.asset || '').toUpperCase())) || rows[0] || {};
    const available = [
      preferred.availableMargin,
      preferred.equity,
      preferred.balance
    ].map(Number).find((value) => Number.isFinite(value) && value > 0);

    if (!Number.isFinite(available) || available <= 0) {
      throw new Error('No hay capital disponible en BingX VST para calcular el 15%.');
    }

    return {
      asset: preferred.asset || 'VST',
      available
    };
  }

  client(config) {
    return new BingXClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      environment: environmentForMode(config.mode)
    });
  }

  async closeExchangePositions({ client, signal, closePercent = 100 }) {
    const response = await client.getPositions(signal.symbol);
    const positions = (Array.isArray(response.data) ? response.data : [])
      .filter((position) => position.symbol === signal.symbol)
      .filter((position) => Math.abs(Number(position.availableAmt || position.positionAmt || 0)) > 0);

    if (!positions.length) {
      return { positions: [], orders: [] };
    }

    const contract = await this.getContract(client, signal.symbol);
    const percent = Math.min(100, Math.max(1, Number(closePercent) || 100));
    const orders = [];

    for (const position of positions) {
      if (percent >= 99.9 && position.positionId) {
        orders.push({
          position,
          response: await client.closePosition({ positionId: position.positionId })
        });
        continue;
      }

      const available = Math.abs(Number(position.availableAmt || position.positionAmt || 0));
      const quantity = roundDown(available * (percent / 100), contract.quantityPrecision);
      if (quantity <= 0) {
        continue;
      }

      const positionSide = position.positionSide || 'BOTH';
      const signedAmount = Number(position.positionAmt || 0);
      const order = {
        symbol: signal.symbol,
        side: positionSide === 'SHORT' || (positionSide === 'BOTH' && signedAmount < 0) ? 'BUY' : 'SELL',
        positionSide,
        type: 'MARKET',
        quantity,
        clientOrderId: clientOrderId(`close-${position.positionId || signal.rawText || Date.now()}`)
      };
      if (positionSide === 'BOTH') {
        order.reduceOnly = 'true';
      }

      orders.push({
        position,
        order,
        response: await client.placeOrder(order, { test: false })
      });
    }

    return { positions, orders };
  }

  validateRisk(signal, config, { leverage }) {
    const snapshot = this.paperStore?.riskSnapshot?.() || {};
    const maxOpenPositions = Number(config.maxOpenPositions || 0);
    if (maxOpenPositions > 0 && Number(snapshot.openPositions || 0) >= maxOpenPositions) {
      return { ok: false, reason: `max_open_positions:${snapshot.openPositions}/${maxOpenPositions}`, snapshot };
    }

    const maxSignalLeverage = Number(config.maxSignalLeverage || 0);
    if (maxSignalLeverage > 0 && Number(leverage || 0) > maxSignalLeverage) {
      return { ok: false, reason: `signal_leverage_above_risk_max:${leverage}>${maxSignalLeverage}`, snapshot };
    }

    const dailyLimit = Number(config.maxDailyLossUSDT || 0);
    if (dailyLimit > 0 && Number(snapshot.dailyPnl || 0) <= -Math.abs(dailyLimit)) {
      return { ok: false, reason: `daily_loss_limit:${snapshot.dailyPnl}`, snapshot };
    }

    const monthlyLimit = Number(config.maxMonthlyLossUSDT || 0);
    if (monthlyLimit > 0 && Number(snapshot.monthlyPnl || 0) <= -Math.abs(monthlyLimit)) {
      return { ok: false, reason: `monthly_loss_limit:${snapshot.monthlyPnl}`, snapshot };
    }

    return { ok: true, snapshot };
  }

  riskSnapshot() {
    return this.paperStore?.riskSnapshot?.() || {
      openPositions: 0,
      openExposure: 0,
      dailyPnl: 0,
      monthlyPnl: 0
    };
  }

  emitTrade(event) {
    this.onTrade?.(event);
    return event;
  }

  log(message, level = 'info') {
    this.onLog?.({
      level,
      message,
      at: new Date().toISOString()
    });
  }
}

function validateSignal(signal, config) {
  const allowlist = new Set(String(config.allowedSymbols || '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean));
  if (allowlist.size && !allowlist.has(signal.symbol)) {
    return { ok: false, reason: `symbol_not_allowed:${signal.symbol}` };
  }

  if (config.requireStopLoss && !signal.stopLoss) {
    return { ok: false, reason: 'missing_stop_loss' };
  }

  return { ok: true };
}

function orderStatus(config) {
  if (config.mode === 'demo') {
    return 'demo_order_sent';
  }
  return config.mode === 'live' ? 'live_order_sent' : 'test_order_sent';
}

function closeStatus(config, exchangeClose) {
  if (config.mode === 'test') {
    return 'paper_close_sent';
  }
  if (!exchangeClose?.orders?.length) {
    return `${config.mode}_close_no_position`;
  }
  return `${config.mode}_close_sent`;
}

function modePrefix(config) {
  if (config.mode === 'demo') {
    return 'BingX DEMO VST';
  }
  return config.mode === 'live' ? 'BingX LIVE' : 'BingX TEST';
}

function environmentForMode(mode) {
  return mode === 'demo' ? 'prod-vst' : 'prod-live';
}

function normalizeSymbol(value) {
  const text = String(value || '').trim().toUpperCase().replace('/', '-');
  if (/^[A-Z0-9]{2,12}-[A-Z]{3,5}$/.test(text)) {
    return text;
  }
  const compact = text.match(/^([A-Z0-9]{2,12})(USDT|USDC)$/);
  return compact ? `${compact[1]}-${compact[2]}` : text;
}

function normalizePositionSide(position) {
  const explicit = String(position.positionSide || '').toUpperCase();
  if (explicit === 'LONG' || explicit === 'SHORT') {
    return explicit;
  }
  const amount = Number(position.positionAmt || position.availableAmt || 0);
  return amount < 0 ? 'SHORT' : 'LONG';
}

function firstFiniteNumber(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return NaN;
}

function timestampIso(values) {
  const timestamp = firstFiniteNumber(values);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Number(fallback);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function buildOrder({ signal, quantity, clientOrderId }) {
  const isLong = signal.direction === 'LONG';
  const order = {
    symbol: signal.symbol,
    side: isLong ? 'BUY' : 'SELL',
    positionSide: signal.direction,
    type: 'MARKET',
    quantity,
    clientOrderId,
    workingType: 'MARK_PRICE'
  };

  const takeProfit = signal.takeProfits[0];
  if (takeProfit) {
    order.takeProfit = JSON.stringify({
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: takeProfit,
      workingType: 'MARK_PRICE'
    });
  }

  if (signal.stopLoss) {
    order.stopLoss = JSON.stringify({
      type: 'STOP_MARKET',
      stopPrice: signal.stopLoss,
      workingType: 'MARK_PRICE'
    });
  }

  return order;
}

function resolveLeverage(signal, config, contract) {
  const value = signal.leverage ? Number(signal.leverage) : Number(config.maxLeverage);
  const source = signal.leverage ? 'signal' : 'fallback';

  if (!Number.isFinite(value) || value < 1) {
    return { ok: false, reason: `invalid_leverage:${value}` };
  }

  if (Number.isFinite(contract.maxLeverage) && value > contract.maxLeverage) {
    return {
      ok: false,
      reason: `${source}_leverage_above_contract_max:${value}>${contract.maxLeverage}`
    };
  }

  return {
    ok: true,
    value: Math.trunc(value)
  };
}

function roundDown(value, precision) {
  const factor = 10 ** precision;
  return Math.floor(Number(value) * factor) / factor;
}

function contractMaxLeverage(item) {
  const values = [
    item.maxLongLeverage,
    item.maxShortLeverage,
    item.maxLeverage,
    item.leverage
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);

  return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY;
}

function clientOrderId(value) {
  let hash = 0;
  const text = String(value || Date.now());
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `yt${Date.now().toString(36)}${Math.abs(hash).toString(36)}`.slice(0, 32);
}

const pnlIncomeTypes = new Set([
  'REALIZED_PNL',
  'FUNDING_FEE',
  'TRADING_FEE',
  'INSURANCE_CLEAR',
  'ADL',
  'SYSTEM_DEDUCTION',
  'GTD_PRICE'
]);

function buildMonthRanges(input) {
  const months = Math.min(3, Math.max(1, Math.trunc(Number(input)) || 3));
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ranges = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth() - offset, 1);
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    ranges.push({
      month: monthKey(start),
      startTime: start.getTime(),
      endTime: Math.min(next.getTime() - 1, now.getTime())
    });
  }

  return ranges;
}

function buildPnlSummary(records, ranges) {
  const rangeMonths = new Set(ranges.map((range) => range.month));
  const buckets = new Map();

  for (const range of ranges) {
    ensureBucket(buckets, range.month, 'USDT');
  }

  for (const record of records) {
    const time = Number(record.time);
    if (!Number.isFinite(time)) {
      continue;
    }

    const month = monthKey(new Date(time));
    if (!rangeMonths.has(month)) {
      continue;
    }

    const incomeType = String(record.incomeType || '').toUpperCase();
    const income = Number(record.income);
    if (!Number.isFinite(income)) {
      continue;
    }

    const bucket = ensureBucket(buckets, month, String(record.asset || 'USDT').toUpperCase());
    bucket.records += 1;
    bucket.byType[incomeType] = roundMoney((bucket.byType[incomeType] || 0) + income);

    if (!pnlIncomeTypes.has(incomeType)) {
      continue;
    }

    bucket.total = roundMoney(bucket.total + income);
    if (incomeType === 'REALIZED_PNL') {
      bucket.realized = roundMoney(bucket.realized + income);
      bucket.closedTrades += 1;
    } else if (incomeType === 'TRADING_FEE') {
      bucket.fees = roundMoney(bucket.fees + income);
    } else if (incomeType === 'FUNDING_FEE') {
      bucket.funding = roundMoney(bucket.funding + income);
    } else {
      bucket.adjustments = roundMoney(bucket.adjustments + income);
    }
  }

  const months = Array.from(buckets.values()).sort(comparePnlRows);
  const currentMonthKey = monthKey(new Date());

  return {
    currentMonthKey,
    range: {
      months: ranges.length,
      startTime: ranges[0]?.startTime || null,
      endTime: ranges.at(-1)?.endTime || null
    },
    months,
    currentMonth: summarizeRows(months.filter((row) => row.month === currentMonthKey)),
    totals: summarizeRows(months),
    recent: normalizeRecentRecords(records, rangeMonths)
  };
}

function ensureBucket(buckets, month, asset) {
  const key = `${month}|${asset}`;
  if (!buckets.has(key)) {
    buckets.set(key, {
      month,
      asset,
      total: 0,
      realized: 0,
      fees: 0,
      funding: 0,
      adjustments: 0,
      paperPnl: 0,
      paperRealized: 0,
      paperUnrealized: 0,
      openPaperTrades: 0,
      closedPaperTrades: 0,
      testOrders: 0,
      liveOrders: 0,
      closedTrades: 0,
      records: 0,
      byType: {}
    });
  }
  return buckets.get(key);
}

function summarizeRows(rows) {
  return rows.reduce((summary, row) => ({
    total: roundMoney(summary.total + row.total),
    realized: roundMoney(summary.realized + row.realized),
    fees: roundMoney(summary.fees + row.fees),
    funding: roundMoney(summary.funding + row.funding),
    adjustments: roundMoney(summary.adjustments + row.adjustments),
    paperPnl: roundMoney(summary.paperPnl + Number(row.paperPnl || 0)),
    paperRealized: roundMoney(summary.paperRealized + Number(row.paperRealized || 0)),
    paperUnrealized: roundMoney(summary.paperUnrealized + Number(row.paperUnrealized || 0)),
    openPaperTrades: summary.openPaperTrades + Number(row.openPaperTrades || 0),
    closedPaperTrades: summary.closedPaperTrades + Number(row.closedPaperTrades || 0),
    testOrders: summary.testOrders + Number(row.testOrders || 0),
    liveOrders: summary.liveOrders + Number(row.liveOrders || 0),
    closedTrades: summary.closedTrades + row.closedTrades,
    records: summary.records + row.records
  }), {
    total: 0,
    realized: 0,
    fees: 0,
    funding: 0,
    adjustments: 0,
    paperPnl: 0,
    paperRealized: 0,
    paperUnrealized: 0,
    openPaperTrades: 0,
    closedPaperTrades: 0,
    testOrders: 0,
    liveOrders: 0,
    closedTrades: 0,
    records: 0
  });
}

function mergePaperSummary(summary, paperRows, positions = []) {
  const byKey = new Map(summary.months.map((row) => [`${row.month}|${row.asset}`, row]));

  for (const paperRow of paperRows) {
    const row = ensureBucket(byKey, paperRow.month, paperRow.asset || 'USDT');
    const paperPnl = Number(paperRow.paperPnl || 0);
    const paperRealized = Number(paperRow.paperRealized || 0);

    row.paperPnl = roundMoney(Number(row.paperPnl || 0) + paperPnl);
    row.paperRealized = roundMoney(Number(row.paperRealized || 0) + paperRealized);
    row.paperUnrealized = roundMoney(Number(row.paperUnrealized || 0) + Number(paperRow.paperUnrealized || 0));
    row.openPaperTrades = Number(row.openPaperTrades || 0) + Number(paperRow.openPaperTrades || 0);
    row.closedPaperTrades = Number(row.closedPaperTrades || 0) + Number(paperRow.closedPaperTrades || 0);
    row.testOrders = Number(row.testOrders || 0) + Number(paperRow.testOrders || 0);
    row.total = roundMoney(row.total + paperPnl);
    row.realized = roundMoney(row.realized + paperRealized);
    row.closedTrades += Number(paperRow.closedPaperTrades || 0);
  }

  summary.months = Array.from(byKey.values()).sort(comparePnlRows);
  summary.currentMonth = summarizeRows(summary.months.filter((row) => row.month === summary.currentMonthKey));
  summary.totals = summarizeRows(summary.months);
  summary.paper = {
    enabled: true,
    rows: paperRows,
    positions
  };
}

function normalizeRecentRecords(records, rangeMonths) {
  return records
    .filter((record) => Number.isFinite(Number(record.time)) && rangeMonths.has(monthKey(new Date(Number(record.time)))))
    .sort((a, b) => Number(b.time) - Number(a.time))
    .slice(0, 40)
    .map((record) => ({
      time: Number(record.time),
      month: monthKey(new Date(Number(record.time))),
      symbol: record.symbol || '',
      incomeType: record.incomeType || '',
      income: Number(record.income || 0),
      asset: record.asset || 'USDT',
      info: record.info || ''
    }));
}

function comparePnlRows(a, b) {
  return b.month.localeCompare(a.month) || a.asset.localeCompare(b.asset);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100000000) / 100000000;
}
