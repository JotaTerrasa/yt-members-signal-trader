import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSecureBackupStatus } from '../src/backupContinuity.js';

const now = Date.parse('2026-07-23T12:00:00.000Z');

test('publica una copia reciente y restaurada sin exponer campos desconocidos', () => {
  const status = buildSecureBackupStatus({
    lastAttemptAt: '2026-07-23T11:00:00.000Z',
    lastSuccessAt: '2026-07-23T11:01:00.000Z',
    lastFile: 'futures-magician-data.fmbak',
    bytes: 2048,
    verified: true,
    restoreDrill: {
      ok: true,
      extracted: true,
      checkedAt: '2026-07-23T11:02:00.000Z',
      entries: 42,
      roots: ['.data', 'unexpected']
    },
    lastProfileSuccessAt: '2026-07-20T04:00:00.000Z',
    lastProfileFile: 'futures-magician-profile.fmbak',
    profileRestoreDrill: {
      ok: true,
      extracted: true,
      checkedAt: '2026-07-23T10:00:00.000Z'
    },
    mirror: {
      configured: true,
      ok: true,
      checkedAt: '2026-07-23T11:03:00.000Z',
      lastFile: 'futures-magician-data.fmbak',
      targetLabel: 'Unidad externa',
      bytes: 2048,
      verified: true,
      sameVolume: false,
      resilient: true
    },
    keyRecovery: {
      verified: true,
      checkedAt: '2026-07-22T11:03:00.000Z',
      targetLabel: 'USB recuperación',
      fingerprint: '0123456789abcdef',
      sameVolume: false,
      resilient: true
    },
    storage: {
      available: true,
      checkedAt: '2026-07-23T11:04:00.000Z',
      level: 'ok',
      reason: 'ok',
      totalBytes: 100000,
      freeBytes: 60000,
      freePercent: 60,
      backupFiles: 14,
      backupBytes: 4000,
      backupSharePercent: 4,
      partialFiles: 0,
      partialBytes: 0,
      stalePartialFiles: 0
    },
    secretField: 'no-publicar'
  }, now);

  assert.equal(status.available, true);
  assert.equal(status.stale, false);
  assert.equal(status.restoreDrill.ok, true);
  assert.equal(status.restoreDrill.stale, false);
  assert.deepEqual(status.restoreDrill.roots, ['.data']);
  assert.equal(status.profile.stale, false);
  assert.equal(status.profile.restoreDrill.ok, true);
  assert.equal(status.mirror.ok, true);
  assert.equal(status.mirror.stale, false);
  assert.equal(status.mirror.resilient, true);
  assert.equal(status.keyRecovery.verified, true);
  assert.equal(status.keyRecovery.stale, false);
  assert.equal(status.keyRecovery.resilient, true);
  assert.equal(status.keyRecovery.fingerprint, '0123456789abcdef');
  assert.equal(status.storage.level, 'ok');
  assert.equal(status.storage.freePercent, 60);
  assert.equal(status.storage.backupFiles, 14);
  assert.equal(Object.hasOwn(status, 'secretField'), false);
});

test('marca como caducados los datos y el perfil sin un simulacro reciente', () => {
  const status = buildSecureBackupStatus({
    lastSuccessAt: '2026-07-21T00:00:00.000Z',
    lastProfileSuccessAt: '2026-07-10T00:00:00.000Z',
    lastProfileFile: 'profile.fmbak',
    restoreDrill: {
      ok: true,
      extracted: true,
      checkedAt: '2026-07-21T00:00:00.000Z'
    },
    mirror: {
      configured: true,
      ok: true,
      verified: true,
      checkedAt: '2026-07-21T00:00:00.000Z',
      sameVolume: false,
      resilient: true
    }
  }, now);

  assert.equal(status.stale, true);
  assert.equal(status.restoreDrill.stale, true);
  assert.equal(status.profile.available, true);
  assert.equal(status.profile.stale, true);
  assert.equal(status.mirror.stale, true);
});

test('sanea nombres, errores y fechas antes de enviarlos al navegador', () => {
  const status = buildSecureBackupStatus({
    lastSuccessAt: 'fecha-invalida',
    lastFile: '../backup.fmbak',
    lastError: 'fallo\ncon detalle',
    bytes: -1,
    keyRecovery: {
      verified: true,
      checkedAt: 'fecha-invalida',
      targetLabel: '../USB\\privado',
      fingerprint: 'no-es-una-huella',
      lastError: 'fallo\nclave'
    },
    storage: {
      available: true,
      level: 'inventado',
      reason: 'C:\\ruta\\privada',
      freePercent: 900,
      backupFiles: -5,
      lastError: 'storage_EACCES\nC:\\ruta\\privada'
    }
  }, now);

  assert.equal(status.available, false);
  assert.equal(status.lastFile, null);
  assert.equal(status.lastError, 'fallo con detalle');
  assert.equal(status.bytes, null);
  assert.equal(status.stale, true);
  assert.equal(status.keyRecovery.checkedAt, null);
  assert.equal(status.keyRecovery.targetLabel, '.. USB privado');
  assert.equal(status.keyRecovery.fingerprint, null);
  assert.equal(status.keyRecovery.lastError, 'fallo clave');
  assert.equal(status.keyRecovery.stale, true);
  assert.equal(status.storage.level, 'unavailable');
  assert.equal(status.storage.reason, 'inspection_unavailable');
  assert.equal(status.storage.freePercent, null);
  assert.equal(status.storage.backupFiles, 0);
  assert.equal(status.storage.lastError, 'storage_EACCES');
});
