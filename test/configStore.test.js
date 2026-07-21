import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigStore } from '../src/configStore.js';

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
