import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostStore } from '../src/store.js';

test('PostStore distingue una edicion de texto y conserva la version anterior', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'futures-magician-posts-'));
  try {
    const store = new PostStore(join(directory, 'posts.json'));
    await store.init();
    await store.upsertMany([{ id: 'post-1', text: 'STOP ETH 165' }]);
    const result = await store.upsertMany([{ id: 'post-1', text: 'STOP ETH 1865' }]);

    assert.equal(result.edited.length, 1);
    assert.equal(result.edited[0].previousText, 'STOP ETH 165');
    assert.equal(result.edited[0].currentText, 'STOP ETH 1865');
    assert.equal(result.edited[0].post.text, 'STOP ETH 1865');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
