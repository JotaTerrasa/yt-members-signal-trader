import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicWriteFile, replaceFileWithRetry } from '../src/atomicFile.js';

test('reintenta un bloqueo transitorio de Windows antes de sustituir el archivo', async () => {
  let attempts = 0;
  const waits = [];
  await replaceFileWithRetry('source.tmp', 'destination.json', {
    renameFile: async () => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('archivo bloqueado');
        error.code = attempts === 1 ? 'EPERM' : 'EBUSY';
        throw error;
      }
    },
    wait: async (milliseconds) => waits.push(milliseconds)
  });

  assert.equal(attempts, 3);
  assert.deepEqual(waits, [25, 50]);
});

test('no reintenta un error de disco que no es transitorio', async () => {
  let attempts = 0;
  await assert.rejects(
    replaceFileWithRetry('source.tmp', 'destination.json', {
      renameFile: async () => {
        attempts += 1;
        const error = new Error('sin espacio');
        error.code = 'ENOSPC';
        throw error;
      },
      wait: async () => assert.fail('no debe esperar')
    }),
    { code: 'ENOSPC' }
  );
  assert.equal(attempts, 1);
});

test('limpia el temporal cuando la sustitución atómica falla', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-atomic-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'state.json');

  await assert.rejects(
    atomicWriteFile(filePath, '{"ok":true}\n', {
      renameFile: async () => {
        const error = new Error('fallo permanente');
        error.code = 'EIO';
        throw error;
      }
    }),
    { code: 'EIO' }
  );
  assert.deepEqual(await readdir(directory), []);
});
