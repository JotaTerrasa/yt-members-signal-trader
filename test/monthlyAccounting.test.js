import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyPnlBoundary,
  localMonthKey,
  monthlyEquityDelta,
  monthlyPnlAdjustment,
  monthlyResetPlan,
  nextMonthlyResetCheckDelay,
  normalizeMonthlyPnlBoundary
} from '../src/monthlyAccounting.js';

test('el cambio de mes se planifica una sola vez desde la medianoche local', () => {
  const now = new Date(2026, 7, 1, 0, 0, 5);
  const previousReset = new Date(2026, 6, 1, 0, 0, 0).toISOString();
  const pending = monthlyResetPlan({
    now,
    bingx: {
      monthlyResetMonth: '2026-07',
      vstPnlResetAt: previousReset,
      livePnlResetAt: previousReset
    }
  });

  assert.equal(pending.required, true);
  assert.equal(pending.month, '2026-08');
  assert.equal(pending.resetAt.getTime(), new Date(2026, 7, 1, 0, 0, 0).getTime());

  const appliedReset = new Date(2026, 7, 1, 0, 0, 0).toISOString();
  const complete = monthlyResetPlan({
    now,
    bingx: {
      monthlyResetMonth: '2026-08',
      vstPnlResetAt: appliedReset,
      livePnlResetAt: appliedReset
    }
  });

  assert.deepEqual(complete, {
    required: false,
    month: '2026-08',
    resetAt: null
  });
});

test('el temporizador apunta a medianoche cuando falta menos de una hora', () => {
  const nearBoundary = new Date(2026, 6, 31, 23, 42, 0);
  const daytime = new Date(2026, 6, 31, 12, 0, 0);

  assert.equal(nextMonthlyResetCheckDelay({ now: nearBoundary }), 18 * 60 * 1000);
  assert.equal(nextMonthlyResetCheckDelay({ now: daytime }), 60 * 60 * 1000);
});

test('el snapshot exacto conserva equity estratégica y sobrevive a normalización', () => {
  const resetAt = new Date(2026, 7, 1, 0, 0, 0);
  const boundary = buildMonthlyPnlBoundary({
    month: localMonthKey(resetAt),
    resetAt,
    capturedAt: new Date(resetAt.getTime() + 30_000),
    reason: 'auto',
    vstExternalFunding: 555,
    accounts: {
      demo: {
        balance: {
          asset: 'VST',
          balance: 860,
          equity: 855,
          availableMargin: 500,
          usedMargin: 355,
          unrealizedProfit: -5
        }
      },
      live: {
        balance: {
          asset: 'USDT',
          balance: 320,
          equity: 325,
          availableMargin: 280,
          usedMargin: 45,
          unrealizedProfit: 5
        }
      }
    }
  });
  const restored = normalizeMonthlyPnlBoundary(JSON.parse(JSON.stringify(boundary)));

  assert.equal(restored.quality, 'exact');
  assert.equal(restored.demo.applied, true);
  assert.equal(restored.demo.strategyEquity, 300);
  assert.equal(restored.demo.unrealizedPnl, -5);
  assert.equal(restored.live.applied, true);
  assert.equal(restored.live.strategyEquity, 325);
});

test('un arranque tardío guarda diagnóstico pero no aplica una frontera falsa', () => {
  const resetAt = new Date(2026, 7, 1, 0, 0, 0);
  const boundary = buildMonthlyPnlBoundary({
    month: localMonthKey(resetAt),
    resetAt,
    capturedAt: new Date(resetAt.getTime() + 5 * 60 * 1000),
    reason: 'auto-startup',
    accounts: {
      demo: {
        balance: {
          asset: 'VST',
          balance: 300,
          equity: 302,
          unrealizedProfit: 2
        }
      }
    }
  });

  assert.equal(boundary.quality, 'late');
  assert.equal(boundary.demo.available, true);
  assert.equal(boundary.demo.applied, false);

  const result = monthlyPnlAdjustment({
    realized: 4,
    rawFloating: 3,
    boundary,
    mode: 'demo',
    month: boundary.month,
    resetAt: boundary.resetAt
  });
  assert.equal(result.total, 7);
  assert.equal(result.monthlyBoundary.applied, false);
  assert.equal(result.monthlyBoundary.ignoredReason, 'late');
});

test('una posición abierta solo aporta el movimiento posterior al cambio de mes', () => {
  const resetAt = new Date(2026, 7, 1, 0, 0, 0);
  const boundary = buildMonthlyPnlBoundary({
    month: localMonthKey(resetAt),
    resetAt,
    capturedAt: new Date(resetAt.getTime() + 5_000),
    accounts: {
      demo: {
        balance: {
          asset: 'VST',
          balance: 300,
          equity: 292,
          unrealizedProfit: -8
        }
      }
    }
  });

  const result = monthlyPnlAdjustment({
    realized: 12,
    rawFloating: -3,
    boundary,
    mode: 'demo',
    month: boundary.month,
    resetAt: boundary.resetAt
  });

  assert.equal(result.rawFloating, -3);
  assert.equal(result.openingUnrealized, -8);
  assert.equal(result.floating, 5);
  assert.equal(result.total, 17);
});

test('al cerrar después de medianoche se descuenta el flotante ya atribuido al mes anterior', () => {
  const resetAt = new Date(2026, 7, 1, 0, 0, 0);
  const boundary = buildMonthlyPnlBoundary({
    month: localMonthKey(resetAt),
    resetAt,
    capturedAt: new Date(resetAt.getTime() + 5_000),
    accounts: {
      demo: {
        balance: {
          asset: 'VST',
          balance: 300,
          equity: 310,
          unrealizedProfit: 10
        }
      }
    }
  });

  const result = monthlyPnlAdjustment({
    realized: 30,
    rawFloating: 0,
    boundary,
    mode: 'demo',
    month: boundary.month,
    resetAt: boundary.resetAt
  });
  const equity = monthlyEquityDelta({
    strategyEquity: 330,
    boundary,
    mode: 'demo',
    month: boundary.month,
    resetAt: boundary.resetAt
  });

  assert.equal(result.floating, -10);
  assert.equal(result.total, 20);
  assert.equal(equity.total, 20);
  assert.equal(equity.openingStrategyEquity, 310);
});
