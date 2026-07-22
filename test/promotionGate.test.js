import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPromotionGate } from '../src/promotionGate.js';

test('la puerta nunca activa live y exige muestra completa', () => {
  const collecting = buildPromotionGate({
    coverage: coverageSummary({ packages: 10, completePackages: 10, expectedOpenings: 30, executedOpenings: 30 }),
    exchangeSafety: safeExchange()
  });
  assert.equal(collecting.status, 'collecting');
  assert.equal(collecting.label, 'Recogiendo muestra');
  assert.equal(collecting.reasonSummary, 'Pendiente: muestra y rentabilidad.');
  assert.equal(collecting.domains.find((item) => item.key === 'reliability').status, 'ok');
  assert.equal(collecting.automaticLivePromotion, false);
  assert.equal(collecting.explicitLiveConfirmationRequired, true);

  const eligible = buildPromotionGate({
    coverage: coverageSummary({ packages: 50, completePackages: 50, expectedOpenings: 150, executedOpenings: 150 }),
    exchangeSafety: safeExchange(),
    economics: { closedTrades: 150, netPnl: 24.5 }
  });
  assert.equal(eligible.status, 'eligible_for_review');
  assert.equal(eligible.eligibleForReview, true);
  assert.equal(eligible.domains.every((item) => item.ok), true);
  assert.equal(eligible.blockers.total, 0);
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
  assert.equal(result.label, 'No apta para revisión');
  assert.equal(result.eligibleForReview, false);
  assert.equal(result.criteria.find((item) => item.key === 'missing-openings').ok, false);
  assert.equal(result.domains.find((item) => item.key === 'reliability').status, 'blocked');
});

test('una replica negativa tras costes no puede promocionarse', () => {
  const result = buildPromotionGate({
    coverage: coverageSummary({ packages: 50, completePackages: 50, expectedOpenings: 150, executedOpenings: 150 }),
    exchangeSafety: safeExchange(),
    economics: { closedTrades: 150, netPnl: -12.4 }
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.criteria.find((item) => item.key === 'net-after-costs').ok, false);
  assert.equal(result.domains.find((item) => item.key === 'economics').detail, '-12,4 VST · -0,0827 VST/cierre · 150 cierres');
  assert.deepEqual(result.blockers.groups, ['economics']);
});

test('explica una apertura perdida por una corrección posterior sin ocultar el bloqueo', () => {
  const result = buildPromotionGate({
    coverage: coverageSummary({
      packages: 16,
      completePackages: 15,
      expectedOpenings: 48,
      executedOpenings: 47,
      missingOpenings: 1,
      correctedAfterEventMissingOpenings: 1
    }),
    exchangeSafety: safeExchange(),
    economics: { closedTrades: 43, netPnl: -90.3774 }
  });

  assert.equal(result.metrics.correctedAfterEventMissingOpenings, 1);
  assert.equal(result.criteria.find((item) => item.key === 'missing-openings').detail, '1 · 1 por corrección posterior');
  assert.equal(result.domains.find((item) => item.key === 'reliability').detail, '47/48 aperturas · 1 fallo por corrección posterior');
  assert.equal(result.reasonSummary, 'Pendiente: muestra, fiabilidad y rentabilidad.');
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
