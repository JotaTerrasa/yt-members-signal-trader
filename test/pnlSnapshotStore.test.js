import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyPnlSourcesFallback, PnlSnapshotStore } from '../src/pnlSnapshotStore.js';

test('conserva el ultimo PnL valido entre reinicios y respeta el mes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-pnl-'));
  const filePath = join(directory, 'pnl-snapshots.json');

  try {
    const first = new PnlSnapshotStore(filePath);
    await first.init();
    await first.setPnl({
      months: 3,
      at: 1000,
      pnl: { months: [{ month: '2026-07', total: 12.5 }] }
    });
    await first.setSources({
      month: '2026-07',
      at: 2000,
      payload: { ok: true, month: '2026-07', sources: { vst: { total: 12.5 } } }
    });

    const restored = new PnlSnapshotStore(filePath);
    await restored.init();

    assert.equal(restored.getPnl(3).pnl.months[0].total, 12.5);
    assert.equal(restored.getSources('2026-07').payload.sources.vst.total, 12.5);
    assert.equal(restored.getSources('2026-08'), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('limpia snapshots sin borrar el archivo de estado', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-pnl-clear-'));
  const filePath = join(directory, 'pnl-snapshots.json');

  try {
    const store = new PnlSnapshotStore(filePath);
    await store.init();
    await store.setSources({
      month: '2026-07',
      payload: { ok: true, month: '2026-07' }
    });
    await store.clear();

    const restored = new PnlSnapshotStore(filePath);
    await restored.init();
    assert.equal(restored.getSources('2026-07'), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('un snapshot corrupto no impide arrancar la aplicacion', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-pnl-corrupt-'));
  const filePath = join(directory, 'pnl-snapshots.json');

  try {
    await writeFile(filePath, '{incompleto', 'utf8');
    const store = new PnlSnapshotStore(filePath);
    await store.init();

    assert.equal(store.getPnl(3), null);
    assert.equal(JSON.parse(await readFile(filePath, 'utf8')).version, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reutiliza solo la fuente fallida y conserva la lectura actual de las demas', () => {
  const payload = {
    sources: {
      vst: { total: 0, error: 'The system is currently busy' },
      live: { total: 7 }
    },
    positions: {
      vst: [],
      live: [{ symbol: 'BTC-USDT' }]
    }
  };
  const snapshot = {
    at: Date.parse('2026-07-22T08:00:00.000Z'),
    payload: {
      sources: {
        vst: { total: -24, fees: -10 },
        live: { total: 3 }
      },
      positions: {
        vst: [{ symbol: 'ETH-USDT' }],
        live: []
      }
    }
  };

  const merged = applyPnlSourcesFallback({
    payload,
    sourceErrors: { vst: 'The system is currently busy', live: '' },
    snapshot
  });

  assert.equal(merged.sources.vst.total, -24);
  assert.equal(merged.sources.live.total, 7);
  assert.equal(merged.positions.vst[0].symbol, 'ETH-USDT');
  assert.equal(merged.positions.live[0].symbol, 'BTC-USDT');
  assert.equal(merged.cached, true);
  assert.equal(merged.stale, true);
  assert.equal(merged.lastGoodAt, '2026-07-22T08:00:00.000Z');
});
