import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ExecutionRetryStore } from '../src/executionRetryStore.js';

test('ExecutionRetryStore conserva, actualiza y elimina reintentos', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fm-retries-'));
  const filePath = join(directory, 'execution-retries.json');
  try {
    const store = new ExecutionRetryStore(filePath);
    await store.init();
    await store.upsert(retryItem({ attempts: 1 }));
    await store.upsert(retryItem({ attempts: 2, lastReason: 'fetch failed' }));
    await store.flush();

    const restored = new ExecutionRetryStore(filePath);
    await restored.init();
    assert.equal(restored.list().length, 1);
    assert.equal(restored.list()[0].attempts, 2);
    assert.equal(restored.list()[0].lastReason, 'fetch failed');

    await restored.remove('opening', 'demo|post-1|SOL-USDT|LONG|81.9|81');
    assert.equal(restored.list().length, 0);
    assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')).items, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function retryItem(overrides = {}) {
  return {
    kind: 'opening',
    key: 'demo|post-1|SOL-USDT|LONG|81.9|81',
    signal: {
      isSignal: true,
      symbol: 'SOL-USDT',
      direction: 'LONG',
      stopLoss: 81
    },
    executionMode: 'demo',
    queuedAt: '2026-07-13T10:00:00.000Z',
    expiresAt: '2026-07-13T10:03:00.000Z',
    attempts: 0,
    timer: setTimeout(() => {}, 10),
    ...overrides
  };
}
