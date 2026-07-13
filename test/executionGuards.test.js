import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCostGuard,
  FuturesTrader,
  validateEntryDeviation,
  validateSignalAge,
  validateStopDistance
} from '../src/futuresTrader.js';

const config = {
  mode: 'demo',
  costGuardEnabled: true,
  costGuardMode: 'block',
  costGuardFeeBuffer: 2,
  costGuardMaxMarginBreakEvenPercent: 3,
  maxEntryDeviationPercent: 0.15
};

test('bloquea una entrada LONG perseguida y acepta una entrada mejor', () => {
  const signal = { direction: 'LONG', entry: { type: 'LIMIT', price: 100 } };
  const chased = validateEntryDeviation({
    signal,
    marketPrice: 100.2,
    referenceEntryPrice: 100,
    config,
    forceMarketEntry: true
  });
  const improved = validateEntryDeviation({
    signal,
    marketPrice: 99.8,
    referenceEntryPrice: 100,
    config,
    forceMarketEntry: true
  });

  assert.equal(chased.ok, false);
  assert.match(chased.reason, /^entry_adverse_deviation_too_high:/);
  assert.equal(improved.ok, true);
});

test('aplica la desviación desfavorable en sentido inverso para SHORT', () => {
  const signal = { direction: 'SHORT', entry: { type: 'LIMIT', price: 100 } };
  const chased = validateEntryDeviation({
    signal,
    marketPrice: 99.8,
    referenceEntryPrice: 100,
    config,
    forceMarketEntry: true
  });
  const improved = validateEntryDeviation({
    signal,
    marketPrice: 100.2,
    referenceEntryPrice: 100,
    config,
    forceMarketEntry: true
  });

  assert.equal(chased.ok, false);
  assert.equal(improved.ok, true);
});

test('el filtro de coste no bloquea indiscriminadamente una señal sin TP', () => {
  const guard = buildCostGuard({
    config,
    signal: { direction: 'LONG', stopLoss: 99 },
    entryPrice: 100,
    notional: 45,
    exposure: 1125,
    leverage: 25
  });

  assert.equal(guard.warn, true);
  assert.equal(guard.block, false);
  assert.equal(guard.targetEdgeKnown, false);
  assert.equal(guard.costToStopRiskPercent, 20);
});

test('el filtro solo bloquea cuando un TP explícito no cubre el coste', () => {
  const blocked = buildCostGuard({
    config,
    signal: { direction: 'LONG', stopLoss: 99, takeProfits: [100.1] },
    entryPrice: 100,
    notional: 45,
    exposure: 1125,
    leverage: 25
  });
  const accepted = buildCostGuard({
    config,
    signal: { direction: 'LONG', stopLoss: 99, takeProfits: [100.4] },
    entryPrice: 100,
    notional: 45,
    exposure: 1125,
    leverage: 25
  });

  assert.equal(blocked.block, true);
  assert.match(blocked.reason, /^cost_guard_non_positive_target_edge:/);
  assert.equal(accepted.block, false);
  assert.equal(accepted.targetEdgeKnown, true);
});

test('la reserva técnica VST recarga una vez hasta el objetivo y contabiliza el incremento real', async () => {
  let balance = 140;
  let externalFunding = 0;
  const adjustments = [];
  const events = [];
  const config = {
    enabled: true,
    mode: 'demo',
    apiKey: 'demo-key',
    apiSecret: 'demo-secret',
    monthlyInitialCapitalVST: 300,
    monthlyOrderPercent: 15,
    maxLeverage: 25,
    vstTechnicalReserveEnabled: true,
    vstTechnicalReserveTargetVST: 500
  };
  const client = {
    getBalance: async () => ({
      data: [{
        asset: 'VST',
        balance: String(balance),
        equity: String(balance),
        availableMargin: String(balance),
        usedMargin: '0'
      }]
    }),
    getVst: async ({ amount, adjustType }) => {
      adjustments.push({ amount, adjustType });
      balance += amount;
      return { code: 0, data: { balance: String(balance) } };
    }
  };
  const trader = new FuturesTrader({
    configStore: {
      getBingX: () => ({ ...config }),
      recordVstTechnicalFunding: async ({ amount }) => {
        externalFunding += amount;
        return { amount, total: externalFunding, at: '2026-07-13T00:00:00.000Z' };
      }
    },
    paperStore: null,
    tradeEventStore: null,
    onTrade: (event) => events.push(event)
  });
  trader.client = (clientConfig) => {
    assert.equal(clientConfig.mode, 'demo');
    return client;
  };

  const signals = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].map((symbol) => ({
    isSignal: true,
    symbol,
    direction: 'LONG',
    leverage: 25
  }));
  const funded = await trader.ensureVstTechnicalReserve({ signals });
  const alreadyCovered = await trader.ensureVstTechnicalReserve({ signals });

  assert.deepEqual(adjustments, [{ amount: 360, adjustType: 0 }]);
  assert.equal(funded.funded, true);
  assert.equal(funded.actualAmount, 360);
  assert.equal(funded.after.available, 500);
  assert.equal(funded.packageRequirement.openingCount, 3);
  assert.equal(externalFunding, 360);
  assert.equal(alreadyCovered.funded, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'demo_vst_technical_reserve_funded');
});

test('un paquete de tres aperturas comparte un único preflight de reserva VST', async () => {
  let balance = 140;
  let available = 140;
  let externalFunding = 0;
  const adjustments = [];
  const orders = [];
  const prices = {
    'BTC-USDT': 64010,
    'ETH-USDT': 1816,
    'SOL-USDT': 77.28
  };
  const config = {
    enabled: true,
    mode: 'demo',
    apiKey: 'demo-key',
    apiSecret: 'demo-secret',
    monthlyInitialCapitalVST: 300,
    monthlyOrderPercent: 15,
    maxLeverage: 25,
    maxSignalLeverage: 125,
    maxSignalAgeMinutes: 5,
    maxEntryDeviationPercent: 0.15,
    maxStopDistancePercent: 5,
    marginType: 'ISOLATED',
    requireStopLoss: true,
    forceMarketEntries: true,
    costGuardEnabled: true,
    costGuardMode: 'warn',
    costGuardFeeBuffer: 2,
    costGuardMaxMarginBreakEvenPercent: 3,
    vstTechnicalReserveEnabled: true,
    vstTechnicalReserveTargetVST: 500
  };
  const client = {
    getBalance: async () => ({
      data: [{
        asset: 'VST',
        balance: String(balance),
        equity: String(balance),
        availableMargin: String(available),
        usedMargin: String(balance - available)
      }]
    }),
    getVst: async ({ amount, adjustType }) => {
      adjustments.push({ amount, adjustType });
      balance += amount;
      available += amount;
      return { code: 0, data: { balance: String(balance) } };
    },
    setMarginType: async () => ({ code: 0 }),
    setLeverage: async () => ({ code: 0 }),
    placeOrder: async (order) => {
      orders.push(order);
      available -= 45;
      return { code: 0, data: { order: { orderId: String(orders.length) } } };
    }
  };
  const trader = new FuturesTrader({
    configStore: {
      getBingX: () => ({ ...config }),
      recordVstTechnicalFunding: async ({ amount }) => {
        externalFunding += amount;
        return { amount, total: externalFunding, at: '2026-07-13T00:00:00.000Z' };
      }
    },
    paperStore: null,
    tradeEventStore: { countOpeningExecutions: () => 0 }
  });
  trader.client = () => client;
  trader.marketClient = () => ({});
  trader.getContract = async () => ({
    quantityPrecision: 4,
    tradeMinQuantity: 0,
    tradeMinUSDT: 0,
    maxLeverage: 125
  });
  trader.fetchMarketPrice = async (_client, symbol) => prices[symbol];
  trader.validateRisk = async () => ({ ok: true, snapshot: {} });

  const [post] = [{
    id: 'three-signal-package',
    firstSeenAt: new Date().toISOString(),
    text: [
      'LONG BTC 64010',
      'STOP BTC BINGX 63500',
      'APALANCAMIENTO X25',
      '1500USDT',
      'LONG ETH 1816',
      'STOP ETH BINGX 1797',
      'APALANCAMIENTO X25',
      '1500USDT',
      'LONG SOL 77.28',
      'STOP SOL BINGX 76.4',
      'APALANCAMIENTO X25',
      '1500USDT'
    ].join('\n')
  }];
  const results = await trader.processPosts([post], { phase: 'live' });

  assert.equal(results.filter((event) => event.status === 'demo_order_sent').length, 3);
  assert.equal(orders.length, 3);
  assert.deepEqual(adjustments, [{ amount: 360, adjustType: 0 }]);
  assert.equal(externalFunding, 360);
  assert.equal(available, 365);
});

test('un cierre explícito se ejecuta aunque el mercado ya esté peor', async () => {
  let closedPositionId = null;
  const client = {
    getPositions: async () => ({
      data: [{
        positionId: 'position-1',
        symbol: 'ETH-USDT',
        positionSide: 'LONG',
        availableAmt: '1',
        avgPrice: '1749.93'
      }]
    }),
    closePosition: async ({ positionId }) => {
      closedPositionId = positionId;
      return { code: 0 };
    },
    getOpenOrders: async () => ({ data: [] })
  };
  const trader = new FuturesTrader({
    configStore: { getBingX: () => ({}) },
    paperStore: null,
    tradeEventStore: null
  });
  trader.getContract = async () => ({ quantityPrecision: 3 });
  trader.fetchMarketPrice = async () => 1759;

  const result = await trader.closeExchangePositions({
    client,
    marketClient: {},
    config: { mode: 'demo' },
    signal: {
      action: 'CLOSE',
      symbol: 'ETH-USDT',
      direction: 'LONG',
      closePrice: 1765
    },
    closePercent: 100
  });

  assert.equal(closedPositionId, 'position-1');
  assert.equal(result.orders.length, 1);
  assert.equal(result.skipped.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0].reason, /^close_price_slippage:/);
});

test('un cierre rentable alineado evalúa el PnL neto y se envía sin errores', async () => {
  let closedPositionId = null;
  const client = {
    getPositions: async () => ({
      data: [{
        positionId: 'btc-position',
        symbol: 'BTC-USDT',
        positionSide: 'LONG',
        availableAmt: '0.01',
        avgPrice: '64010'
      }]
    }),
    closePosition: async ({ positionId }) => {
      closedPositionId = positionId;
      return { code: 0 };
    },
    getOpenOrders: async () => ({ data: [] })
  };
  const trader = new FuturesTrader({
    configStore: { getBingX: () => ({}) },
    paperStore: null,
    tradeEventStore: null
  });
  trader.getContract = async () => ({ quantityPrecision: 3 });
  trader.fetchMarketPrice = async () => 64344;

  const result = await trader.closeExchangePositions({
    client,
    marketClient: {},
    config: { mode: 'demo' },
    signal: {
      action: 'CLOSE',
      symbol: 'BTC-USDT',
      direction: 'LONG',
      closePrice: 64344
    },
    closePercent: 100
  });

  assert.equal(closedPositionId, 'btc-position');
  assert.equal(result.orders.length, 1);
  assert.equal(result.warnings.length, 0);
});

test('un error interno del guard no impide ejecutar un cierre explícito', async () => {
  let closedPositionId = null;
  const position = {
    positionId: 'guard-failure-position',
    symbol: 'BTC-USDT',
    positionSide: 'LONG',
    availableAmt: '0.01'
  };
  Object.defineProperty(position, 'avgPrice', {
    get() {
      throw new Error('guard boom');
    }
  });
  const client = {
    getPositions: async () => ({ data: [position] }),
    closePosition: async ({ positionId }) => {
      closedPositionId = positionId;
      return { code: 0 };
    },
    getOpenOrders: async () => ({ data: [] })
  };
  const trader = new FuturesTrader({
    configStore: { getBingX: () => ({}) },
    paperStore: null,
    tradeEventStore: null
  });
  trader.getContract = async () => ({ quantityPrecision: 3 });
  trader.fetchMarketPrice = async () => 64344;

  const result = await trader.closeExchangePositions({
    client,
    marketClient: {},
    config: { mode: 'demo' },
    signal: {
      action: 'CLOSE',
      symbol: 'BTC-USDT',
      direction: 'LONG',
      closePrice: 64344
    },
    closePercent: 100
  });

  assert.equal(closedPositionId, 'guard-failure-position');
  assert.equal(result.orders.length, 1);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].reason, 'close_guard_error:guard boom');
});

test('un error temporal de cierre conserva el modo para poder reintentarse', async () => {
  const trader = new FuturesTrader({
    configStore: {
      getBingX: () => ({ enabled: true, mode: 'demo', liveConfirmed: false })
    },
    paperStore: null,
    tradeEventStore: null
  });
  trader.client = () => ({
    getPositions: async () => {
      throw new Error('Please try again later.');
    }
  });
  trader.marketClient = () => ({});

  const result = await trader.executeCloseSignal({
    isSignal: true,
    action: 'CLOSE',
    symbol: 'SOL-USDT',
    closePrice: 79,
    closePercent: 100
  }, {
    post: { id: 'close-post', url: 'https://www.youtube.com/post/close-post' },
    phase: 'live'
  });

  assert.equal(result.status, 'error');
  assert.equal(result.executionMode, 'demo');
  assert.equal(result.reason, 'Please try again later.');
});

test('el límite de posiciones usa la cuenta de BingX y no el almacén paper', async () => {
  const trader = new FuturesTrader({
    configStore: { getBingX: () => ({ mode: 'demo' }) },
    paperStore: { riskSnapshot: () => ({ openPositions: 0 }) },
    tradeEventStore: { countOpeningExecutions: () => 0 }
  });
  const client = {
    getPositions: async () => ({
      data: Array.from({ length: 5 }, (_, index) => ({
        positionId: String(index),
        availableAmt: '1',
        positionValue: '100'
      }))
    })
  };

  const result = await trader.validateRisk({}, {
    mode: 'demo',
    maxOpenPositions: 5,
    maxSignalLeverage: 125,
    maxDailyOrders: 0,
    maxDailyLossUSDT: 0,
    maxMonthlyLossUSDT: 0
  }, { leverage: 25, client });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'max_open_positions:5/5');
  assert.equal(result.snapshot.openExposure, 500);
});

test('el límite diario suma PnL, fees y funding de la cuenta', async () => {
  const trader = new FuturesTrader({
    configStore: { getBingX: () => ({ mode: 'demo' }) },
    paperStore: null,
    tradeEventStore: { countOpeningExecutions: () => 0 }
  });
  const client = {
    getPositions: async () => ({ data: [] }),
    getIncome: async () => ({
      data: [
        { income: '-4', time: Date.now(), incomeType: 'REALIZED_PNL' },
        { income: '-1.5', time: Date.now(), incomeType: 'TRADING_FEE' }
      ]
    })
  };

  const result = await trader.validateRisk({}, {
    mode: 'demo',
    maxOpenPositions: 5,
    maxSignalLeverage: 125,
    maxDailyOrders: 0,
    maxDailyLossUSDT: 5,
    maxMonthlyLossUSDT: 100,
    vstPnlResetAt: new Date(Date.now() - 60_000).toISOString()
  }, { leverage: 25, client });

  assert.equal(result.ok, false);
  assert.match(result.reason, /^daily_loss_limit:-5.5/);
  assert.equal(result.snapshot.monthlyPnl, -5.5);
});

test('bloquea una apertura publicada hace más de cinco minutos', () => {
  const result = validateSignalAge({
    publishedText: 'hace 12 minutos',
    firstSeenAt: new Date().toISOString()
  }, 'live', { maxSignalAgeMinutes: 5 });

  assert.equal(result.ok, false);
  assert.match(result.reason, /^stale_signal:12m>5m$/);
  assert.equal(validateSignalAge({ publishedText: 'hace 12 minutos' }, 'manual_replay', { maxSignalAgeMinutes: 5 }).ok, true);
});

test('bloquea stops anormalmente lejanos aunque estén en el lado correcto', () => {
  const invalid = validateStopDistance({ direction: 'LONG', stopLoss: 7600 }, 76539, {
    maxStopDistancePercent: 5
  });
  const valid = validateStopDistance({ direction: 'LONG', stopLoss: 76000 }, 76539, {
    maxStopDistancePercent: 5
  });

  assert.equal(invalid.ok, false);
  assert.match(invalid.reason, /^stop_loss_distance_too_high:/);
  assert.equal(valid.ok, true);
});
