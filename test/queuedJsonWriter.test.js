import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QueuedJsonWriter } from '../src/queuedJsonWriter.js';

test('serializa escrituras y deja siempre un JSON completo', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-json-'));
  const filePath = join(directory, 'state.json');
  const writer = new QueuedJsonWriter(filePath);

  try {
    const writes = Array.from({ length: 25 }, (_, index) => writer.write({ version: 1, index }));
    await Promise.all(writes);
    await writer.flush();

    const stored = JSON.parse(await readFile(filePath, 'utf8'));
    const files = await readdir(directory);
    assert.deepEqual(stored, { version: 1, index: 24 });
    assert.deepEqual(files, ['state.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
