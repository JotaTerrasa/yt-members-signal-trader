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
      monthlyOrderPercent: 15
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
