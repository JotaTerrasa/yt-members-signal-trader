import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exchangeProtectionGaps,
  hasStopLossProtection,
  hasTakeProfitProtection
} from '../src/exchangeProtection.js';

test('distingue un stop real de un take profit ausente', () => {
  const position = {
    symbol: 'BTC-USDT',
    stopLoss: 65_500,
    takeProfit: null,
    protectiveOrders: [
      { type: 'STOP_MARKET', stopPrice: 65_500, status: 'NEW' }
    ]
  };

  assert.equal(hasStopLossProtection(position), true);
  assert.equal(hasTakeProfitProtection(position), false);
  const gaps = exchangeProtectionGaps([position]);
  assert.deepEqual(gaps.withoutStopLoss, []);
  assert.deepEqual(gaps.withoutTakeProfit, [position]);
});

test('reconoce protecciones embebidas y ordenes take profit', () => {
  const embedded = {
    stopLoss: 1.07,
    takeProfit: 1.13
  };
  const ordered = {
    protectiveOrders: [
      { type: 'STOP_MARKET', stopPrice: 1.07 },
      { type: 'TAKE_PROFIT_MARKET', stopPrice: 1.13 }
    ]
  };

  assert.equal(hasStopLossProtection(embedded), true);
  assert.equal(hasTakeProfitProtection(embedded), true);
  assert.equal(hasStopLossProtection(ordered), true);
  assert.equal(hasTakeProfitProtection(ordered), true);
  assert.deepEqual(exchangeProtectionGaps([embedded, ordered]), {
    withoutStopLoss: [],
    withoutTakeProfit: []
  });
});
