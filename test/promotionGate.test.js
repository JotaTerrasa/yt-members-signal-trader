import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPromotionGate } from '../src/promotionGate.js';

test('la puerta nunca activa live y exige muestra completa', () => {
  const collecting = buildPromotionGate({
    coverage: coverageSummary({ packages: 10, completePackages: 10, expectedOpenings: 30, executedOpenings: 30 }),
    exchangeSafety: safeExchange()
  });
  assert.equal(collecting.status, 'collecting');
  assert.equal(collecting.automaticLivePromotion, false);
  assert.equal(collecting.explicitLiveConfirmationRequired, true);

  const eligible = buildPromotionGate({
    coverage: coverageSummary({ packages: 50, completePackages: 50, expectedOpenings: 150, executedOpenings: 150 }),
    exchangeSafety: safeExchange(),
    economics: { closedTrades: 150, netPnl: 24.5 }
  });
  assert.equal(eligible.status, 'eligible_for_review');
  assert.equal(eligible.eligibleForReview, true);
});

test('un hueco operativo bloquea la promocion aunque haya muestra', () => {
  const result = buildPromotionGate({
    coverage: coverageSummary({
      packages: 50,
      completePackages: 49,
      incompletePackages: 1,
      expectedOpenings: 150,
      executedOpenings: 149,
      missingOpenings: 1
    }),
    exchangeSafety: safeExchange(),
    economics: { closedTrades: 149, netPnl: 20 }
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.eligibleForReview, false);
  assert.equal(result.criteria.find((item) => item.key === 'missing-openings').ok, false);
});

test('una replica negativa tras costes no puede promocionarse', () => {
  const result = buildPromotionGate({
    coverage: coverageSummary({ packages: 50, completePackages: 50, expectedOpenings: 150, executedOpenings: 150 }),
    exchangeSafety: safeExchange(),
    economics: { closedTrades: 150, netPnl: -12.4 }
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.criteria.find((item) => item.key === 'net-after-costs').ok, false);
});

function coverageSummary(overrides = {}) {
  return {
    summary: {
      packages: 0,
      completePackages: 0,
      pendingPackages: 0,
      incompletePackages: 0,
      expectedOpenings: 0,
      executedOpenings: 0,
      pendingOpenings: 0,
      missingOpenings: 0,
      parseFailures: 0,
      ...overrides
    }
  };
}

function safeExchange() {
  return {
    enabled: true,
    level: 'ok',
    stale: false,
    demo: { missingStopLoss: 0, orphanOrders: 0 },
    real: { missingStopLoss: 0, orphanOrders: 0 }
  };
}
