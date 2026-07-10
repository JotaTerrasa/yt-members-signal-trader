import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TradeEventStore } from '../src/tradeEventStore.js';

test('serializa, compacta y recupera eventos sin perderlos', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'trade-events-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'events.json');
  const store = new TradeEventStore(filePath);
  await store.init();

  await Promise.all(Array.from({ length: 125 }, (_, index) => store.append({
    at: new Date(1_700_000_000_000 + index).toISOString(),
    status: 'demo_order_sent',
    signal: { symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 100 + index } }
  })));
  await store.flush();

  const restored = new TradeEventStore(filePath);
  await restored.init();
  assert.equal(restored.list().length, 125);
  const raw = await readFile(filePath, 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw));
});
