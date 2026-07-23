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
    secretField: 'no-publicar'
  }, now);

  assert.equal(status.available, true);
  assert.equal(status.stale, false);
  assert.equal(status.restoreDrill.ok, true);
  assert.equal(status.restoreDrill.stale, false);
  assert.deepEqual(status.restoreDrill.roots, ['.data']);
  assert.equal(status.profile.stale, false);
  assert.equal(status.profile.restoreDrill.ok, true);
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
    }
  }, now);

  assert.equal(status.stale, true);
  assert.equal(status.restoreDrill.stale, true);
  assert.equal(status.profile.available, true);
  assert.equal(status.profile.stale, true);
});

test('sanea nombres, errores y fechas antes de enviarlos al navegador', () => {
  const status = buildSecureBackupStatus({
    lastSuccessAt: 'fecha-invalida',
    lastFile: '../backup.fmbak',
    lastError: 'fallo\ncon detalle',
    bytes: -1
  }, now);

  assert.equal(status.available, false);
  assert.equal(status.lastFile, null);
  assert.equal(status.lastError, 'fallo con detalle');
  assert.equal(status.bytes, null);
  assert.equal(status.stale, true);
});
