import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigStore } from '../src/configStore.js';
import { buildMonthlyPnlBoundary } from '../src/monthlyAccounting.js';

test('la reserva VST y sus aportaciones sobreviven a guardados y reinicios', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-config-'));
  const filePath = join(directory, 'config.json');

  try {
    const store = new ConfigStore(filePath);
    await store.init();
    await store.updateVstTechnicalReserve({ enabled: true, targetVST: 500 });
    await store.recordVstTechnicalFunding({ amount: 361, at: '2026-07-13T08:00:00.000Z' });
    await store.updateBingX({
      ...store.getBingX(),
      mode: 'demo',
      enabled: true,
      monthlyInitialCapitalVST: 300,
      monthlyOrderPercent: 15,
      vstStopWorkingType: 'CONTRACT_PRICE',
      liveStopWorkingType: 'MARK_PRICE'
    });

    const restored = new ConfigStore(filePath);
    await restored.init();
    const bingx = restored.getBingX();

    assert.equal(bingx.vstTechnicalReserveEnabled, true);
    assert.equal(bingx.vstTechnicalReserveTargetVST, 500);
    assert.equal(bingx.vstTechnicalExternalFundingVST, 361);
    assert.equal(bingx.vstTechnicalLastTopUpAt, '2026-07-13T08:00:00.000Z');
    assert.equal(bingx.monthlyInitialCapitalVST, 300);
    assert.equal(bingx.monthlyOrderNotionalVST, 45);
    assert.equal(bingx.vstStopWorkingType, 'CONTRACT_PRICE');
    assert.equal(bingx.liveStopWorkingType, 'MARK_PRICE');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('la lectura independiente de Telegram se conserva y respeta limites seguros', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-telegram-'));
  const filePath = join(directory, 'config.json');

  try {
    const store = new ConfigStore(filePath);
    await store.init();
    await store.updateTelegramSource({
      enabled: true,
      url: 'https://web.telegram.org/k/#-123',
      maxMessages: 50,
      pollSeconds: 2,
      refreshSeconds: 30,
      executeSignals: true,
      executeOpenSignals: false
    });

    const restored = new ConfigStore(filePath);
    await restored.init();
    const source = restored.getTelegramSource();

    assert.equal(source.pollSeconds, 5);
    assert.equal(source.refreshSeconds, 30);
    assert.equal(source.executeSignals, true);
    assert.equal(source.executeOpenSignals, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('iniciar una cohorte nueva archiva la frontera anterior', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-cohort-'));
  const filePath = join(directory, 'config.json');

  try {
    const store = new ConfigStore(filePath);
    await store.init();
    await store.resetImprovementCohort({ startedAt: '2026-07-10T08:00:00.000Z' });
    await store.resetImprovementCohort({ startedAt: '2026-07-15T08:00:00.000Z' });

    const restored = new ConfigStore(filePath);
    await restored.init();
    const bingx = restored.getBingX();

    assert.equal(bingx.improvementCohortStartedAt, '2026-07-15T08:00:00.000Z');
    assert.deepEqual(bingx.improvementCohortHistory, [
      {
        startedAt: '2026-07-10T08:00:00.000Z',
        endedAt: '2026-07-15T08:00:00.000Z'
      }
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('el corte mensual persiste el snapshot de frontera tras reiniciar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-monthly-boundary-'));
  const filePath = join(directory, 'config.json');

  try {
    const resetAt = new Date(2026, 7, 1, 0, 0, 0);
    const boundary = buildMonthlyPnlBoundary({
      month: '2026-08',
      resetAt,
      capturedAt: new Date(resetAt.getTime() + 10_000),
      vstExternalFunding: 555,
      accounts: {
        demo: {
          balance: {
            asset: 'VST',
            balance: 850,
            equity: 855,
            unrealizedProfit: 5
          }
        },
        live: {
          error: 'Saldo no disponible'
        }
      }
    });
    const store = new ConfigStore(filePath);
    await store.init();
    await store.resetMonthlyAccounting({
      resetAt,
      month: '2026-08',
      boundary
    });
    await store.updateBingX({
      ...store.getBingX(),
      enabled: true,
      mode: 'demo'
    });

    const restored = new ConfigStore(filePath);
    await restored.init();
    const bingx = restored.getBingX();

    assert.equal(bingx.monthlyResetMonth, '2026-08');
    assert.equal(bingx.vstPnlResetAt, resetAt.toISOString());
    assert.equal(bingx.livePnlResetAt, resetAt.toISOString());
    assert.equal(bingx.monthlyPnlBoundary.month, '2026-08');
    assert.equal(bingx.monthlyPnlBoundary.demo.applied, true);
    assert.equal(bingx.monthlyPnlBoundary.demo.strategyEquity, 300);
    assert.equal(bingx.monthlyPnlBoundary.live.applied, false);
    assert.equal(bingx.monthlyPnlBoundary.live.error, 'Saldo no disponible');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
