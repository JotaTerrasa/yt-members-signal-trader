import assert from 'node:assert/strict';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { backupStorageAlertAction, evaluateBackupStorage, inspectBackupStorage } from '../src/backupStorage.js';

const GIB = 1024 ** 3;
const now = Date.parse('2026-07-23T12:00:00.000Z');

test('clasifica espacio sano, bajo y crítico con umbrales explícitos', () => {
  const healthy = evaluateBackupStorage({
    available: true,
    totalBytes: 100 * GIB,
    freeBytes: 50 * GIB,
    backupFiles: 10,
    backupBytes: 2 * GIB
  }, now);
  const warning = evaluateBackupStorage({
    available: true,
    totalBytes: 100 * GIB,
    freeBytes: 8 * GIB
  }, now);
  const critical = evaluateBackupStorage({
    available: true,
    totalBytes: 100 * GIB,
    freeBytes: 1 * GIB
  }, now);

  assert.equal(healthy.level, 'ok');
  assert.equal(healthy.freePercent, 50);
  assert.equal(healthy.backupSharePercent, 2);
  assert.equal(warning.level, 'warn');
  assert.equal(warning.reason, 'low_free_space');
  assert.equal(critical.level, 'critical');
  assert.equal(critical.reason, 'critical_free_space');
  assert.equal(critical.warningThresholdBytes, 10 * GIB);
  assert.equal(critical.criticalThresholdBytes, 2 * GIB);
});

test('un parcial abandonado genera aviso sin inventar falta de espacio', () => {
  const status = evaluateBackupStorage({
    available: true,
    totalBytes: 200 * GIB,
    freeBytes: 150 * GIB,
    partialFiles: 2,
    partialBytes: 4096,
    stalePartialFiles: 1
  }, now);

  assert.equal(status.level, 'warn');
  assert.equal(status.reason, 'stale_partial_files');
  assert.equal(status.partialFiles, 2);
  assert.equal(status.stalePartialFiles, 1);
});

test('limita avisos repetidos, escala a crítico y registra la recuperación', () => {
  const cooldownMs = 6 * 60 * 60 * 1000;
  assert.equal(backupStorageAlertAction({
    previousLevel: 'ok',
    currentLevel: 'warn',
    lastAlertAt: 0,
    now,
    cooldownMs
  }), 'alert');
  assert.equal(backupStorageAlertAction({
    previousLevel: 'warn',
    currentLevel: 'warn',
    lastAlertAt: now - 60 * 1000,
    now,
    cooldownMs
  }), 'none');
  assert.equal(backupStorageAlertAction({
    previousLevel: 'warn',
    currentLevel: 'critical',
    lastAlertAt: now - 60 * 1000,
    now,
    cooldownMs
  }), 'alert');
  assert.equal(backupStorageAlertAction({
    previousLevel: 'warn',
    currentLevel: 'warn',
    lastAlertAt: now - cooldownMs,
    now,
    cooldownMs
  }), 'alert');
  assert.equal(backupStorageAlertAction({
    previousLevel: 'critical',
    currentLevel: 'ok',
    lastAlertAt: now - 60 * 1000,
    now,
    cooldownMs
  }), 'recovered');
});

test('sanea una inspección no disponible sin publicar rutas', () => {
  const status = evaluateBackupStorage({
    available: false,
    lastError: 'storage_ENOENT\nC:\\ruta\\privada'
  }, now);

  assert.equal(status.level, 'unavailable');
  assert.equal(status.reason, 'inspection_unavailable');
  assert.equal(status.freeBytes, null);
  assert.equal(status.lastError, 'storage_ENOENT');
});

test('inspecciona únicamente contenedores y parciales del directorio local', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-storage-test-'));
  const stalePartial = join(directory, 'abandoned.fmbak.123.partial');
  await Promise.all([
    writeFile(join(directory, 'one.fmbak'), Buffer.alloc(11)),
    writeFile(join(directory, 'two.fmbak'), Buffer.alloc(13)),
    writeFile(stalePartial, Buffer.alloc(7)),
    writeFile(join(directory, 'ignore.txt'), Buffer.alloc(100))
  ]);
  await utimes(stalePartial, new Date(now - 2 * 60 * 60 * 1000), new Date(now - 2 * 60 * 60 * 1000));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const status = await inspectBackupStorage(directory, { now });

  assert.equal(status.available, true);
  assert.equal(status.backupFiles, 2);
  assert.equal(status.backupBytes, 24);
  assert.equal(status.partialFiles, 1);
  assert.equal(status.partialBytes, 7);
  assert.equal(status.stalePartialFiles, 1);
  assert.ok(status.totalBytes > 0);
  assert.ok(status.freeBytes > 0);
  assert.ok(['warn', 'critical'].includes(status.level));
});

test('una instalación nueva sin directorio secure se mide como cero copias', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'futures-magician-storage-empty-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const status = await inspectBackupStorage(join(root, 'secure-no-creado'), {
    filesystemPath: root,
    now
  });

  assert.equal(status.available, true);
  assert.equal(status.backupFiles, 0);
  assert.equal(status.backupBytes, 0);
  assert.equal(status.partialFiles, 0);
  assert.ok(status.totalBytes > 0);
});
