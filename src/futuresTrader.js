import { BingXClient } from './bingxClient.js';
import { parseFuturesSignal, parseFuturesSignals } from './futuresSignalParser.js';

const OPEN_ORDERS_CACHE_MS = 60_000;
const OPEN_ORDERS_ERROR_LOG_MS = 60_000;
const OPEN_ORDERS_DEFAULT_BACKOFF_MS = 60_000;

export class FuturesTrader {
  constructor({ configStore, paperStore, onLog, onTrade }) {
    this.configStore = configStore;
    this.paperStore = paperStore;
    this.onLog = onLog;
    this.onTrade = onTrade;
    this.contractCache = new Map();
    this.openOrdersCache = new Map();
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
    const marketClient = this.marketClient(config);
    const entryPrice = await this.fetchMarketPrice(marketClient, symbol);
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

  async getMonthlyPnl({ months = 3, mode = null, includePaper = true } = {}) {
    const config = {
      ...this.configStore.getBingX({ includeSecrets: true }),
      ...(mode ? { mode } : {})
    };
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
    if (includePaper && this.paperStore) {
      const marketClient = this.marketClient(config);
      const positions = await this.paperStore.markToMarket((symbol) => this.fetchMarketPrice(marketClient, symbol));
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

  async getExchangeOpenPositions({ mode = null } = {}) {
    const config = {
      ...this.configStore.getBingX({ includeSecrets: true }),
      ...(mode ? { mode } : {})
    };
    if (config.mode === 'dual') {
      const [demo, live] = await Promise.all([
        this.getExchangeOpenPositions({ mode: 'demo' }),
        this.getExchangeOpenPositions({ mode: 'live' })
      ]);
      return [...demo, ...live];
    }

    if (config.mode === 'test' || !config.apiKey || !config.apiSecret) {
      return [];
    }

    const client = this.client(config);
    const [response, openOrders] = await Promise.all([
      client.getPositions(),
      this.getCachedOpenOrders(client, config)
    ]);
    const rows = Array.isArray(response.data) ? response.data : [];
    const open = rows.filter((position) => Math.abs(Number(position.availableAmt || position.positionAmt || 0)) > 0);

    return Promise.all(open.map((position) => this.normalizeExchangePosition(client, position, config, openOrders).catch((error) => ({
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

  async getCachedOpenOrders(client, config) {
    const key = openOrdersCacheKey(config);
    const now = Date.now();
    const cached = this.openOrdersCache.get(key);
    if (cached?.blockedUntil && now < cached.blockedUntil) {
      return cached.orders || [];
    }

    if (cached?.orders && now - Number(cached.fetchedAt || 0) < OPEN_ORDERS_CACHE_MS) {
      return cached.orders;
    }

    try {
      const response = await client.getOpenOrders();
      const orders = extractOpenOrders(response);
      this.openOrdersCache.set(key, {
        orders,
        fetchedAt: now,
        blockedUntil: 0,
        lastLoggedAt: cached?.lastLoggedAt || 0
      });
      return orders;
    } catch (error) {
      const message = conciseError(error);
      const blockedUntil = rateLimitBlockedUntil(message) || now + OPEN_ORDERS_DEFAULT_BACKOFF_MS;
      const shouldLog = now - Number(cached?.lastLoggedAt || 0) > OPEN_ORDERS_ERROR_LOG_MS;
      this.openOrdersCache.set(key, {
        orders: cached?.orders || [],
        fetchedAt: cached?.fetchedAt || 0,
        blockedUntil,
        lastLoggedAt: shouldLog ? now : cached?.lastLoggedAt || 0
      });
      if (shouldLog) {
        this.log(`BingX openOrders ${config.mode}: ${openOrdersBackoffMessage(message, blockedUntil)}`, 'warn');
      }
      return cached?.orders || [];
    }
  }

  async getExchangeBalance({ mode = null } = {}) {
    const config = {
      ...this.configStore.getBingX({ includeSecrets: true }),
      ...(mode ? { mode } : {})
    };
    if (!config.apiKey || !config.apiSecret) {
      return null;
    }

    const client = this.client(config);
    const response = await client.getBalance();
    const rows = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
    const targetAsset = config.mode === 'demo' ? 'VST' : 'USDT';
    const row = rows.find((item) => String(item.asset || '').toUpperCase() === targetAsset) || rows[0];
    if (!row) {
      return null;
    }

    return {
      asset: String(row.asset || targetAsset).toUpperCase(),
      balance: Number(row.balance || 0),
      equity: Number(row.equity || row.balance || 0),
      availableMargin: Number(row.availableMargin || 0),
      usedMargin: Number(row.usedMargin || 0),
      frozenMargin: Number(row.frozenMargin || 0),
      unrealizedProfit: Number(row.unrealizedProfit || 0),
      realizedProfit: Number(row.realizedProfit || 0),
      raw: row
    };
  }

  async normalizeExchangePosition(client, position, config, openOrders = []) {
    const symbol = position.symbol;
    const quantity = Math.abs(Number(position.availableAmt || position.positionAmt || 0));
    const protectiveOrders = protectiveOrdersForPosition(position, openOrders);
    const entryPrice = firstFiniteNumber([
      position.avgPrice,
      position.averagePrice,
      position.entryPrice,
      position.positionAvgPrice
    ]);
    const currentPrice = firstFiniteNumber([
      position.markPrice,
      position.lastPrice
    ]) || await this.fetchMarketPrice(this.marketClient(config), symbol).catch(() => entryPrice);
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
      stopLoss: protectiveOrders.stopLoss,
      takeProfit: protectiveOrders.takeProfit,
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
      protectiveOrders: protectiveOrders.orders,
      raw: position
    };
  }

  async processPosts(posts, payload, options = {}) {
    const results = [];
    const filterSignal = typeof options.filterSignal === 'function' ? options.filterSignal : null;
    const filteredReason = options.filteredReason || 'signal_filtered';
    for (const post of posts) {
      const signals = parseFuturesSignals(post.text || '').filter((signal) => signal.isSignal);
      for (const signal of signals) {
        const baseEvent = {
          at: new Date().toISOString(),
          signal,
          postId: post?.id || null,
          postUrl: post?.url || null,
          phase: payload.phase || null
        };
        if (filterSignal && !filterSignal(signal)) {
          results.push(this.emitTrade({
            ...baseEvent,
            status: 'skipped',
            reason: filteredReason
          }));
          continue;
        }

        try {
          const result = signal.action === 'CLOSE'
            ? await this.executeCloseSignal(signal, { post, phase: payload.phase })
            : signal.action === 'CLOSE_ALL'
              ? await this.executeCloseAllSignal(signal, { post, phase: payload.phase })
              : signal.action === 'MOVE_SL_BE'
                ? await this.executeMoveStopSignal(signal, { post, phase: payload.phase })
                : signal.action === 'SET_STOP_LOSS'
                  ? await this.executeStopLossSignal(signal, { post, phase: payload.phase })
                  : signal.action === 'SET_TAKE_PROFIT'
                    ? await this.executeTakeProfitSignal(signal, { post, phase: payload.phase })
                    : await this.executeSignal(signal, { post, phase: payload.phase });
          results.push(...asArray(result));
        } catch (error) {
          const failed = this.emitTrade({
            at: new Date().toISOString(),
            signal,
            postId: post?.id || null,
            postUrl: post?.url || null,
            phase: payload.phase || null,
            status: 'error',
            reason: error.message
          });
          results.push(failed);
          this.log(`BingX ${signal.symbol || 'senal'}: ${error.message}`, 'error');
        }
      }
    }
    return results;
  }

  async executeCloseSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    if (config.mode === 'dual') {
      const results = [];
      for (const targetConfig of executionConfigs(config)) {
        try {
          results.push(await this.executeCloseSignalWithConfig(signal, { post, phase }, targetConfig));
        } catch (error) {
          results.push(this.executionError(signal, { post, phase }, targetConfig, error));
        }
      }
      return results;
    }

    return this.executeCloseSignalWithConfig(signal, { post, phase }, config);
  }

  async executeCloseAllSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    if (config.mode === 'dual') {
      const results = [];
      for (const targetConfig of executionConfigs(config)) {
        try {
          results.push(await this.executeCloseAllSignalWithConfig(signal, { post, phase }, targetConfig));
        } catch (error) {
          results.push(this.executionError(signal, { post, phase }, targetConfig, error));
        }
      }
      return results;
    }

    return this.executeCloseAllSignalWithConfig(signal, { post, phase }, config);
  }

  async executeCloseAllSignalWithConfig(signal, { post, phase } = {}, config) {
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    if (config.mode === 'live' && !config.liveConfirmed) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'live_not_confirmed' });
    }

    const closePercent = Number(signal.closePercent || 100);
    const closedPaperPositions = config.mode === 'test' && this.paperStore
      ? await this.paperStore.closeAll({ percent: closePercent, reason: 'close_all', post, phase })
      : [];
    const exchangeClose = config.mode !== 'test'
      ? await this.closeAllExchangePositions({ client: this.client(config), closePercent })
      : null;

    const event = this.emitTrade({
      ...baseEvent,
      status: closeAllStatus(config, exchangeClose, closedPaperPositions),
      closePercent,
      closedPaperPositions,
      exchangeClose
    });

    if (closedPaperPositions.length) {
      this.log(`PAPER CLOSE ALL ${closePercent}% (${closedPaperPositions.length})`, 'warn');
    } else if (exchangeClose?.orders?.length) {
      this.log(`${modePrefix(config)} CLOSE ALL ${closePercent}% (${exchangeClose.orders.length})`, 'warn');
    } else {
      this.log(`Cierre total detectado, sin posiciones abiertas en ${modePrefix(config)}.`, 'warn');
    }

    return event;
  }

  async executeCloseSignalWithConfig(signal, { post, phase } = {}, config) {
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    if (config.mode === 'live' && !config.liveConfirmed) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'live_not_confirmed' });
    }

    const client = this.client(config);
    const marketClient = this.marketClient(config);
    const closePrice = Number(signal.closePrice) || await this.fetchMarketPrice(marketClient, signal.symbol);
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
    if (config.mode === 'dual') {
      const results = [];
      for (const targetConfig of executionConfigs(config)) {
        try {
          results.push(await this.executeMoveStopSignalWithConfig(signal, { post, phase }, targetConfig));
        } catch (error) {
          results.push(this.executionError(signal, { post, phase }, targetConfig, error));
        }
      }
      return results;
    }

    return this.executeMoveStopSignalWithConfig(signal, { post, phase }, config);
  }

  async executeMoveStopSignalWithConfig(signal, { post, phase } = {}, config) {
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode
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

  async executeTakeProfitSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    if (config.mode === 'dual') {
      const results = [];
      for (const targetConfig of executionConfigs(config)) {
        try {
          results.push(await this.executeTakeProfitSignalWithConfig(signal, { post, phase }, targetConfig));
        } catch (error) {
          results.push(this.executionError(signal, { post, phase }, targetConfig, error));
        }
      }
      return results;
    }

    return this.executeTakeProfitSignalWithConfig(signal, { post, phase }, config);
  }

  async executeTakeProfitSignalWithConfig(signal, { post, phase } = {}, config) {
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    if (config.mode === 'live' && !config.liveConfirmed) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'live_not_confirmed' });
    }

    const takeProfit = firstFiniteNumber([
      signal.takeProfit,
      Array.isArray(signal.takeProfits) ? signal.takeProfits[0] : null
    ]);
    if (!Number.isFinite(takeProfit) || takeProfit <= 0) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: `invalid_take_profit:${signal.takeProfit}` });
    }

    const paperPositions = config.mode === 'test' && this.paperStore
      ? await this.paperStore.setTakeProfitBySymbol({ symbol: signal.symbol, price: takeProfit, post, phase })
      : [];
    const exchangeTakeProfit = config.mode !== 'test'
      ? await this.setExchangeTakeProfit({ client: this.client(config), marketClient: this.marketClient(config), config, signal, takeProfit })
      : null;

    const event = this.emitTrade({
      ...baseEvent,
      status: takeProfitStatus(config, paperPositions, exchangeTakeProfit),
      takeProfit,
      paperPositions,
      exchangeTakeProfit
    });

    if (paperPositions.length) {
      this.log(`PAPER TP ${signal.symbol} @ ${takeProfit} (${paperPositions.length})`, 'info');
    } else if (exchangeTakeProfit?.orders?.length) {
      this.log(`${modePrefix(config)} TP ${signal.symbol} @ ${takeProfit} (${exchangeTakeProfit.orders.length})`, config.mode === 'live' ? 'warn' : 'info');
    } else if (exchangeTakeProfit?.positions?.length) {
      const reason = exchangeTakeProfit.skipped?.[0]?.reason || 'no_colocado';
      this.log(`TP detectado para ${signal.symbol}, no colocado: ${reason}.`, 'warn');
    } else {
      this.log(`TP detectado para ${signal.symbol}, sin posicion abierta.`, 'warn');
    }

    return event;
  }

  async executeStopLossSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    if (config.mode === 'dual') {
      const results = [];
      for (const targetConfig of executionConfigs(config)) {
        try {
          results.push(await this.executeStopLossSignalWithConfig(signal, { post, phase }, targetConfig));
        } catch (error) {
          results.push(this.executionError(signal, { post, phase }, targetConfig, error));
        }
      }
      return results;
    }

    return this.executeStopLossSignalWithConfig(signal, { post, phase }, config);
  }

  async executeStopLossSignalWithConfig(signal, { post, phase } = {}, config) {
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode
    };

    if (!config.enabled) {
      return this.emitTrade({ ...baseEvent, status: 'skipped', reason: 'bingx_disabled' });
    }

    if (config.mode === 'live' && !config.liveConfirmed) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: 'live_not_confirmed' });
    }

    const stopLoss = Number(signal.stopLoss);
    if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
      return this.emitTrade({ ...baseEvent, status: 'blocked', reason: `invalid_stop_loss:${signal.stopLoss}` });
    }

    const paperPositions = config.mode === 'test' && this.paperStore
      ? await this.paperStore.setStopLossBySymbol({ symbol: signal.symbol, price: stopLoss, post, phase })
      : [];
    const exchangeStopLoss = config.mode !== 'test'
      ? await this.setExchangeStopLoss({ client: this.client(config), marketClient: this.marketClient(config), config, signal, stopLoss })
      : null;

    const event = this.emitTrade({
      ...baseEvent,
      status: stopLossStatus(config, paperPositions, exchangeStopLoss),
      stopLoss,
      paperPositions,
      exchangeStopLoss
    });

    if (paperPositions.length) {
      this.log(`PAPER SL ${signal.symbol} @ ${stopLoss} (${paperPositions.length})`, 'info');
    } else if (exchangeStopLoss?.orders?.length) {
      this.log(`${modePrefix(config)} SL ${signal.symbol} @ ${stopLoss} (${exchangeStopLoss.orders.length})`, config.mode === 'live' ? 'warn' : 'info');
    } else if (exchangeStopLoss?.positions?.length) {
      const reason = exchangeStopLoss.skipped?.[0]?.reason || 'no_colocado';
      this.log(`SL detectado para ${signal.symbol}, no colocado: ${reason}.`, 'warn');
    } else {
      this.log(`SL detectado para ${signal.symbol}, sin posicion abierta.`, 'warn');
    }

    return event;
  }

  async executeSignal(signal, { post, phase } = {}) {
    const config = this.configStore.getBingX({ includeSecrets: true });
    if (config.mode === 'dual') {
      const results = [];
      for (const targetConfig of executionConfigs(config)) {
        try {
          results.push(await this.executeSignalWithConfig(signal, { post, phase }, targetConfig));
        } catch (error) {
          results.push(this.executionError(signal, { post, phase }, targetConfig, error));
        }
      }
      return results;
    }

    return this.executeSignalWithConfig(signal, { post, phase }, config);
  }

  async executeSignalWithConfig(signal, { post, phase } = {}, config) {
    const baseEvent = {
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode
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
    const marketClient = this.marketClient(config);
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
    const marketPrice = await this.fetchMarketPrice(marketClient, signal.symbol);
    const entryPrice = signal.entry?.type === 'LIMIT' && Number.isFinite(referenceEntryPrice) && referenceEntryPrice > 0
      ? referenceEntryPrice
      : marketPrice;
    const stopValidation = validateStopLossAgainstMarket(signal, entryPrice);
    if (!stopValidation.ok) {
      return this.emitTrade({
        ...baseEvent,
        status: 'blocked',
        reason: stopValidation.reason,
        marketPrice,
        referenceEntryPrice
      });
    }

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
      marketPrice,
      entryPrice,
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
    const data = Array.isArray(ticker.data)
      ? ticker.data.find((item) => normalizeSymbol(item.symbol) === normalizeSymbol(symbol))
      : ticker.data?.ticker || ticker.data;
    const price = firstFiniteNumber([
      data?.lastPrice,
      data?.price,
      data?.markPrice,
      data?.indexPrice,
      data?.askPrice,
      data?.bidPrice
    ]);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`no_market_price:${symbol}`);
    }
    return price;
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

    if (config.mode === 'live') {
      const configuredNotional = positiveNumber(config.defaultNotionalUSDT, 10);
      const maxNotional = positiveNumber(config.maxNotionalUSDT, configuredNotional);
      return {
        mode: 'live_fixed_notional',
        asset: 'USDT',
        configuredNotional,
        maxNotional,
        notional: roundMoney(Math.min(configuredNotional, maxNotional))
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

  marketClient(config) {
    return new BingXClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      environment: 'prod-live'
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

  async closeAllExchangePositions({ client, closePercent = 100 }) {
    const response = await client.getPositions();
    const positions = (Array.isArray(response.data) ? response.data : [])
      .filter((position) => Math.abs(Number(position.availableAmt || position.positionAmt || 0)) > 0);

    if (!positions.length) {
      return { positions: [], orders: [] };
    }

    const percent = Math.min(100, Math.max(1, Number(closePercent) || 100));
    const contractCache = new Map();
    const orders = [];

    for (const position of positions) {
      const symbol = position.symbol;
      if (!symbol) {
        continue;
      }

      if (percent >= 99.9 && position.positionId) {
        orders.push({
          position,
          response: await client.closePosition({ positionId: position.positionId })
        });
        continue;
      }

      if (!contractCache.has(symbol)) {
        contractCache.set(symbol, await this.getContract(client, symbol));
      }
      const contract = contractCache.get(symbol);
      const available = Math.abs(Number(position.availableAmt || position.positionAmt || 0));
      const quantity = roundDown(available * (percent / 100), contract.quantityPrecision);
      if (quantity <= 0) {
        continue;
      }

      const positionSide = position.positionSide || 'BOTH';
      const signedAmount = Number(position.positionAmt || 0);
      const order = {
        symbol,
        side: positionSide === 'SHORT' || (positionSide === 'BOTH' && signedAmount < 0) ? 'BUY' : 'SELL',
        positionSide,
        type: 'MARKET',
        quantity,
        clientOrderId: clientOrderId(`close-all-${position.positionId || symbol || Date.now()}`)
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

  async setExchangeTakeProfit({ client, marketClient, config, signal, takeProfit }) {
    const response = await client.getPositions(signal.symbol);
    const positions = (Array.isArray(response.data) ? response.data : [])
      .filter((position) => position.symbol === signal.symbol)
      .filter((position) => Math.abs(Number(position.availableAmt || position.positionAmt || 0)) > 0);

    if (!positions.length) {
      return { positions: [], orders: [], canceled: [], skipped: [] };
    }

    const marketPrice = await this.fetchMarketPrice(marketClient, signal.symbol).catch(() => null);
    const openOrders = await this.getCachedOpenOrders(client, config);
    const contract = await this.getContract(client, signal.symbol);
    const canceled = [];
    const orders = [];
    const skipped = [];

    for (const position of positions) {
      const positionSide = position.positionSide || normalizePositionSide(position);
      const direction = normalizePositionSide(position);
      const currentPrice = firstFiniteNumber([
        position.markPrice,
        position.lastPrice,
        marketPrice
      ]);
      const validation = validateTakeProfitAgainstMarket({ direction, takeProfit, marketPrice: currentPrice });
      if (!validation.ok) {
        skipped.push({ position, reason: validation.reason, marketPrice: currentPrice });
        continue;
      }

      for (const existing of takeProfitOrdersForPosition(position, openOrders)) {
        const orderId = existing.orderId || existing.orderID;
        if (!orderId) {
          continue;
        }
        try {
          canceled.push({
            order: existing,
            response: await client.cancelOrder({ symbol: signal.symbol, orderId })
          });
        } catch (error) {
          this.log(`BingX TP previo ${signal.symbol}: ${error.message}`, 'warn');
        }
      }

      const available = Math.abs(Number(position.availableAmt || position.positionAmt || 0));
      const quantity = roundDown(available, contract.quantityPrecision);
      if (quantity <= 0) {
        skipped.push({ position, reason: `quantity_too_small:${quantity}`, marketPrice: currentPrice });
        continue;
      }

      const order = {
        symbol: signal.symbol,
        side: direction === 'SHORT' ? 'BUY' : 'SELL',
        positionSide,
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: takeProfit,
        quantity,
        workingType: 'MARK_PRICE'
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

    if (canceled.length || orders.length) {
      this.openOrdersCache.delete(openOrdersCacheKey(config));
    }

    return { positions, orders, canceled, skipped };
  }

  async setExchangeStopLoss({ client, marketClient, config, signal, stopLoss }) {
    const response = await client.getPositions(signal.symbol);
    const positions = (Array.isArray(response.data) ? response.data : [])
      .filter((position) => position.symbol === signal.symbol)
      .filter((position) => Math.abs(Number(position.availableAmt || position.positionAmt || 0)) > 0);

    if (!positions.length) {
      return { positions: [], orders: [], canceled: [], skipped: [] };
    }

    const marketPrice = await this.fetchMarketPrice(marketClient, signal.symbol).catch(() => null);
    const openOrders = await this.getCachedOpenOrders(client, config);
    const contract = await this.getContract(client, signal.symbol);
    const canceled = [];
    const orders = [];
    const skipped = [];

    for (const position of positions) {
      const positionSide = position.positionSide || normalizePositionSide(position);
      const direction = normalizePositionSide(position);
      const currentPrice = firstFiniteNumber([
        position.markPrice,
        position.lastPrice,
        marketPrice
      ]);
      const validation = validateStopLossAgainstMarket({ direction, stopLoss }, currentPrice);
      if (!validation.ok) {
        skipped.push({ position, reason: validation.reason, marketPrice: currentPrice });
        continue;
      }

      for (const existing of stopLossOrdersForPosition(position, openOrders)) {
        const orderId = existing.orderId || existing.orderID;
        if (!orderId) {
          continue;
        }
        try {
          canceled.push({
            order: existing,
            response: await client.cancelOrder({ symbol: signal.symbol, orderId })
          });
        } catch (error) {
          this.log(`BingX SL previo ${signal.symbol}: ${error.message}`, 'warn');
        }
      }

      const available = Math.abs(Number(position.availableAmt || position.positionAmt || 0));
      const quantity = roundDown(available, contract.quantityPrecision);
      if (quantity <= 0) {
        skipped.push({ position, reason: `quantity_too_small:${quantity}`, marketPrice: currentPrice });
        continue;
      }

      const order = {
        symbol: signal.symbol,
        side: direction === 'SHORT' ? 'BUY' : 'SELL',
        positionSide,
        type: 'STOP_MARKET',
        stopPrice: stopLoss,
        quantity,
        workingType: 'MARK_PRICE'
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

    if (canceled.length || orders.length) {
      this.openOrdersCache.delete(openOrdersCacheKey(config));
    }

    return { positions, orders, canceled, skipped };
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

  executionError(signal, { post, phase } = {}, config, error) {
    const failed = this.emitTrade({
      at: new Date().toISOString(),
      signal,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      executionMode: config.mode,
      status: 'error',
      reason: error.message
    });
    this.log(`BingX ${modePrefix(config)} ${signal.symbol || 'senal'}: ${error.message}`, 'error');
    return failed;
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

function validateStopLossAgainstMarket(signal, marketPrice) {
  if (!signal.stopLoss) {
    return { ok: true };
  }

  const stopLoss = Number(signal.stopLoss);
  const price = Number(marketPrice);
  if (!Number.isFinite(stopLoss) || !Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: `invalid_stop_loss:${signal.stopLoss}` };
  }

  if (signal.direction === 'LONG' && stopLoss >= price) {
    return { ok: false, reason: `invalid_long_stop_loss:${stopLoss}>=${price}` };
  }

  if (signal.direction === 'SHORT' && stopLoss <= price) {
    return { ok: false, reason: `invalid_short_stop_loss:${stopLoss}<=${price}` };
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

function closeAllStatus(config, exchangeClose, closedPaperPositions = []) {
  if (config.mode === 'test') {
    return closedPaperPositions.length ? 'paper_close_all_sent' : 'paper_close_all_no_position';
  }
  if (!exchangeClose?.orders?.length) {
    return `${config.mode}_close_all_no_position`;
  }
  return `${config.mode}_close_all_sent`;
}

function takeProfitStatus(config, paperPositions, exchangeTakeProfit) {
  if (config.mode === 'test') {
    return paperPositions.length ? 'paper_tp_sent' : 'paper_tp_no_position';
  }
  if (exchangeTakeProfit?.orders?.length) {
    return `${config.mode}_tp_sent`;
  }
  if (exchangeTakeProfit?.positions?.length) {
    return `${config.mode}_tp_blocked`;
  }
  return `${config.mode}_tp_no_position`;
}

function stopLossStatus(config, paperPositions, exchangeStopLoss) {
  if (config.mode === 'test') {
    return paperPositions.length ? 'paper_sl_sent' : 'paper_sl_no_position';
  }
  if (exchangeStopLoss?.orders?.length) {
    return `${config.mode}_sl_sent`;
  }
  if (exchangeStopLoss?.positions?.length) {
    return `${config.mode}_sl_blocked`;
  }
  return `${config.mode}_sl_no_position`;
}

function validateTakeProfitAgainstMarket({ direction, takeProfit, marketPrice }) {
  const price = Number(marketPrice);
  const target = Number(takeProfit);
  if (!Number.isFinite(target) || target <= 0) {
    return { ok: false, reason: `invalid_take_profit:${takeProfit}` };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: true };
  }
  if (direction === 'LONG' && target <= price) {
    return { ok: false, reason: `invalid_long_take_profit:${target}<=${price}` };
  }
  if (direction === 'SHORT' && target >= price) {
    return { ok: false, reason: `invalid_short_take_profit:${target}>=${price}` };
  }
  return { ok: true };
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

function openOrdersCacheKey(config) {
  return `${config.mode}:${environmentForMode(config.mode)}`;
}

function rateLimitBlockedUntil(message) {
  const match = String(message || '').match(/unblocked after\s+(\d{10,})/i);
  if (!match) {
    return null;
  }
  const timestamp = Number(match[1]);
  return Number.isFinite(timestamp) && timestamp > Date.now() ? timestamp : null;
}

function openOrdersBackoffMessage(message, blockedUntil) {
  const lower = String(message || '').toLowerCase();
  const isRateLimited = lower.includes('100410') || lower.includes('rate limit') || lower.includes('frequency limit');
  if (isRateLimited && blockedUntil) {
    return `rate-limit, pausado hasta ${new Date(blockedUntil).toLocaleTimeString('es-ES')}`;
  }
  return `${message}; se usara cache durante ${Math.round(OPEN_ORDERS_DEFAULT_BACKOFF_MS / 1000)}s`;
}

function conciseError(error) {
  return String(error?.message || error || '')
    .split('\n')[0]
    .replace(/\s+/g, ' ')
    .trim();
}

function executionConfigs(config) {
  if (config.mode !== 'dual') {
    return [config];
  }
  return [
    { ...config, mode: 'demo' },
    { ...config, mode: 'live' }
  ];
}

function asArray(value) {
  return Array.isArray(value) ? value : [value].filter(Boolean);
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

function extractOpenOrders(response) {
  const rows = response?.data?.orders ?? response?.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

function protectiveOrdersForPosition(position, openOrders = []) {
  const symbol = normalizeSymbol(position.symbol);
  const positionSide = normalizePositionSide(position);
  const orders = openOrders.filter((order) => (
    normalizeSymbol(order.symbol) === symbol
    && (!order.positionSide || String(order.positionSide).toUpperCase() === positionSide)
    && ['NEW', 'PARTIALLY_FILLED'].includes(String(order.status || 'NEW').toUpperCase())
  ));
  const stopLossOrder = orders.find((order) => isStopLossOrder(order));
  const takeProfitOrder = orders.find((order) => isTakeProfitOrder(order));

  return {
    stopLoss: orderStopPrice(stopLossOrder),
    takeProfit: orderStopPrice(takeProfitOrder),
    orders: orders.map((order) => ({
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      positionSide: order.positionSide,
      type: order.type,
      stopPrice: orderStopPrice(order),
      status: order.status
    }))
  };
}

function takeProfitOrdersForPosition(position, openOrders = []) {
  const symbol = normalizeSymbol(position.symbol);
  const positionSide = normalizePositionSide(position);
  return openOrders.filter((order) => (
    normalizeSymbol(order.symbol) === symbol
    && (!order.positionSide || String(order.positionSide).toUpperCase() === positionSide)
    && ['NEW', 'PARTIALLY_FILLED'].includes(String(order.status || 'NEW').toUpperCase())
    && isTakeProfitOrder(order)
  ));
}

function stopLossOrdersForPosition(position, openOrders = []) {
  const symbol = normalizeSymbol(position.symbol);
  const positionSide = normalizePositionSide(position);
  return openOrders.filter((order) => (
    normalizeSymbol(order.symbol) === symbol
    && (!order.positionSide || String(order.positionSide).toUpperCase() === positionSide)
    && ['NEW', 'PARTIALLY_FILLED'].includes(String(order.status || 'NEW').toUpperCase())
    && isStopLossOrder(order)
  ));
}

function isStopLossOrder(order = {}) {
  const type = String(order.type || order.stopLoss?.type || '').toUpperCase();
  return type.includes('STOP') && !type.includes('TAKE_PROFIT');
}

function isTakeProfitOrder(order = {}) {
  const type = String(order.type || order.takeProfit?.type || '').toUpperCase();
  return type.includes('TAKE_PROFIT');
}

function orderStopPrice(order = {}) {
  const value = firstFiniteNumber([
    order.stopPrice,
    order.stopLoss?.stopPrice,
    order.takeProfit?.stopPrice,
    order.stopLossEntrustPrice,
    order.takeProfitEntrustPrice
  ]);
  return Number.isFinite(value) && value > 0 ? value : null;
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
  const limitPrice = signal.entry?.type === 'LIMIT' ? Number(signal.entry.price) : NaN;
  const order = {
    symbol: signal.symbol,
    side: isLong ? 'BUY' : 'SELL',
    positionSide: signal.direction,
    type: Number.isFinite(limitPrice) && limitPrice > 0 ? 'LIMIT' : 'MARKET',
    quantity,
    clientOrderId,
    workingType: 'MARK_PRICE'
  };

  if (order.type === 'LIMIT') {
    order.price = limitPrice;
    order.timeInForce = 'GTC';
  }

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
