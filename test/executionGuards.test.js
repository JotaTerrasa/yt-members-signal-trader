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
