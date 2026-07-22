import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createBackup, verifyBackup } from '../scripts/secureBackup.js';

async function backupFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'futures-magician-backup-test-'));
  const dataDir = join(root, '.data');
  const backupDir = join(dataDir, 'backups', 'secure');
  const keyFile = join(root, 'backup.key');
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'config.json'), JSON.stringify({ mode: 'demo' }));
  await writeFile(join(dataDir, 'trade-events.json'), JSON.stringify({ events: [{ id: 'event-1' }] }));
  await writeFile(keyFile, `${'test-backup-key-'.repeat(3)}\n`);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, backupDir, keyFile };
}

test('publica una copia cifrada solo después de verificarla', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'verified.fmbak');
  const created = await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });

  assert.equal(created.verified, true);
  assert.deepEqual(created.roots, ['.data']);
  assert.ok(created.entries >= 3);
  assert.ok((await stat(output)).size > 0);
  const verified = await verifyBackup({ input: output, keyFile: fixture.keyFile }, { silent: true });
  assert.equal(verified.ok, true);
  assert.deepEqual(verified.roots, ['.data']);
  assert.equal((await readdir(fixture.backupDir)).some((name) => name.endsWith('.partial')), false);
});

test('detecta una copia cifrada dañada', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'corrupt.fmbak');
  await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });
  const contents = await readFile(output);
  contents[Math.floor(contents.length / 2)] ^= 0xff;
  await writeFile(output, contents);

  await assert.rejects(
    verifyBackup({ input: output, keyFile: fixture.keyFile }, { silent: true })
  );
});

test('incluye y verifica el perfil cuando se solicita', async (t) => {
  const fixture = await backupFixture(t);
  const profileDir = join(fixture.root, '.yt-profile', 'Default');
  const output = join(fixture.backupDir, 'profile.fmbak');
  await mkdir(profileDir, { recursive: true });
  await writeFile(join(profileDir, 'Cookies'), 'encrypted-browser-session');

  const created = await createBackup({
    output,
    keyFile: fixture.keyFile,
    includeProfile: true
  }, {
    root: fixture.root,
    silent: true
  });

  assert.deepEqual(created.roots, ['.data', '.yt-profile']);
  const verified = await verifyBackup({ input: output, keyFile: fixture.keyFile }, { silent: true });
  assert.deepEqual(verified.roots, ['.data', '.yt-profile']);
});

test('no sustituye una copia que ya existe', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'existing.fmbak');
  await mkdir(fixture.backupDir, { recursive: true });
  await writeFile(output, 'previous-backup');

  await assert.rejects(
    createBackup({ output, keyFile: fixture.keyFile }, {
      root: fixture.root,
      silent: true
    }),
    /ya existe/
  );
  assert.equal(await readFile(output, 'utf8'), 'previous-backup');
});

test('no deja un backup final ni parcial cuando falla el archivado', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'futures-magician-backup-failure-'));
  const keyFile = join(root, 'backup.key');
  const backupDir = join(root, 'backups');
  const output = join(backupDir, 'failed.fmbak');
  await writeFile(keyFile, `${'test-backup-key-'.repeat(3)}\n`);
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    createBackup({ output, keyFile }, { root, silent: true })
  );
  assert.equal(await stat(output).catch(() => null), null);
  assert.equal((await readdir(backupDir)).some((name) => name.endsWith('.partial')), false);
});
