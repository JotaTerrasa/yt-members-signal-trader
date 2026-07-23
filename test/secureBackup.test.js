import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';
import { configureBackupMirror, createBackup, createBackupCommand, disableBackupMirror, drillBackup, loadBackupMirrorConfig, mirrorBackupIfConfigured, validateBackupEntries, verifyBackup } from '../scripts/secureBackup.js';

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

test('demuestra una restauración real en un directorio temporal', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'restore-drill.fmbak');
  await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });

  const drilled = await drillBackup({ input: output, keyFile: fixture.keyFile }, { silent: true });

  assert.equal(drilled.ok, true);
  assert.equal(drilled.extracted, true);
  assert.equal(drilled.cleaned, true);
  assert.deepEqual(drilled.roots, ['.data']);
  assert.ok(drilled.entries >= 3);
});

test('rechaza rutas que podrían salir del destino de restauración', () => {
  assert.equal(validateBackupEntries(['.data/', '.data/config.json'], ['.data']), true);
  assert.throws(() => validateBackupEntries(['../secreto.txt', '.data/config.json'], ['.data']), /ruta no permitida/);
  assert.throws(() => validateBackupEntries(['/tmp/secreto.txt'], ['.data']), /ruta no permitida/);
  assert.throws(() => validateBackupEntries(['.yt-profile/Cookies'], ['.data']), /ruta no permitida/);
});

test('publica y verifica una réplica sin confundir una carpeta del mismo disco con resiliencia', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'mirror-source.fmbak');
  const mirrorDir = join(fixture.root, 'mirror-target');
  const configFile = join(fixture.root, 'private', 'backup-mirror.json');
  await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });

  await assert.rejects(
    configureBackupMirror({ target: mirrorDir }, {
      configFile,
      localBackupDir: fixture.backupDir,
      silent: true
    }),
    /mismo sistema de archivos/
  );
  const configured = await configureBackupMirror({ target: mirrorDir, allowSameVolume: true }, {
    configFile,
    localBackupDir: fixture.backupDir,
    silent: true
  });
  const mirrored = await mirrorBackupIfConfigured(output, {
    keyFile: fixture.keyFile,
    configFile,
    localBackupDir: fixture.backupDir
  });

  assert.equal(configured.sameVolume, true);
  assert.equal(configured.resilient, false);
  assert.equal(mirrored.ok, true);
  assert.equal(mirrored.verified, true);
  assert.equal(mirrored.sameVolume, true);
  assert.equal(mirrored.resilient, false);
  assert.ok((await stat(join(mirrorDir, basename(output)))).isFile());
  assert.equal((await readdir(mirrorDir)).some((name) => name.endsWith('.partial')), false);
});

test('no replica sin configuración y rechaza como destino el directorio local', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'without-mirror.fmbak');
  const missingConfig = join(fixture.root, 'missing-mirror.json');
  const nestedTarget = join(fixture.backupDir, 'nested');
  await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });

  const skipped = await mirrorBackupIfConfigured(output, {
    keyFile: fixture.keyFile,
    configFile: missingConfig,
    localBackupDir: fixture.backupDir
  });
  assert.equal(skipped.configured, false);
  assert.equal(skipped.ok, true);

  await assert.rejects(
    configureBackupMirror({ target: nestedTarget, allowSameVolume: true }, {
      configFile: join(fixture.root, 'nested-config.json'),
      localBackupDir: fixture.backupDir,
      silent: true
    }),
    /dentro del proyecto ni de sus backups locales/
  );
  assert.equal(await stat(nestedTarget).catch(() => null), null);
});

test('conserva el backup local y denuncia una réplica existente dañada', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'damaged-mirror-source.fmbak');
  const mirrorDir = join(fixture.root, 'damaged-mirror-target');
  const configFile = join(fixture.root, 'private', 'damaged-backup-mirror.json');
  await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });
  await configureBackupMirror({ target: mirrorDir, allowSameVolume: true }, {
    configFile,
    localBackupDir: fixture.backupDir,
    silent: true
  });

  const original = await readFile(output);
  const damaged = Buffer.from(original);
  damaged[Math.floor(damaged.length / 2)] ^= 0xff;
  const mirrorOutput = join(mirrorDir, basename(output));
  await writeFile(mirrorOutput, damaged);

  const mirrored = await mirrorBackupIfConfigured(output, {
    keyFile: fixture.keyFile,
    configFile,
    localBackupDir: fixture.backupDir
  });

  assert.equal(mirrored.configured, true);
  assert.equal(mirrored.ok, false);
  assert.equal(mirrored.verified, false);
  assert.match(mirrored.lastError, /autenticidad|autenticar|authenticate/i);
  assert.deepEqual(await readFile(output), original);
  assert.deepEqual(await readFile(mirrorOutput), damaged);
  assert.equal((await readdir(mirrorDir)).some((name) => name.endsWith('.partial')), false);
});

test('un fallo exclusivo de réplica no marca como fallido el backup local restaurado', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'local-success-mirror-failure.fmbak');
  const invalidTarget = join(fixture.root, 'mirror-target-is-a-file');
  const configFile = join(fixture.root, 'private', 'failing-backup-mirror.json');
  await mkdir(join(fixture.root, 'private'), { recursive: true });
  await writeFile(invalidTarget, 'no es un directorio');
  await writeFile(configFile, JSON.stringify({
    version: 1,
    enabled: true,
    targetDir: invalidTarget,
    allowSameVolume: true,
    configuredAt: new Date().toISOString()
  }));

  await assert.rejects(
    createBackupCommand({
      output,
      keyFile: fixture.keyFile,
      configFile,
      drill: true
    }, {
      root: fixture.root,
      silent: true
    }),
    /backup local es correcto, pero la réplica externa falló/
  );

  const status = JSON.parse(await readFile(join(fixture.backupDir, 'status.json'), 'utf8'));
  assert.ok(status.lastSuccessAt);
  assert.equal(status.lastFailureAt, null);
  assert.equal(status.lastError, null);
  assert.equal(status.verified, true);
  assert.equal(status.restoreDrill.ok, true);
  assert.equal(status.restoreDrill.extracted, true);
  assert.equal(status.mirror.configured, true);
  assert.equal(status.mirror.ok, false);
  assert.ok(status.mirror.lastError);
  assert.equal((await verifyBackup({ input: output, keyFile: fixture.keyFile }, { silent: true })).ok, true);
});

test('desactiva la réplica sin borrar su configuración ni las copias existentes', async (t) => {
  const fixture = await backupFixture(t);
  const output = join(fixture.backupDir, 'mirror-before-disable.fmbak');
  const mirrorDir = join(fixture.root, 'mirror-before-disable-target');
  const configFile = join(fixture.root, 'private', 'disable-backup-mirror.json');
  await createBackup({ output, keyFile: fixture.keyFile }, {
    root: fixture.root,
    silent: true
  });
  await configureBackupMirror({ target: mirrorDir, allowSameVolume: true }, {
    configFile,
    localBackupDir: fixture.backupDir,
    silent: true
  });
  const mirrored = await mirrorBackupIfConfigured(output, {
    keyFile: fixture.keyFile,
    configFile,
    localBackupDir: fixture.backupDir
  });
  assert.equal(mirrored.ok, true);

  const disabled = await disableBackupMirror({ configFile }, {
    root: fixture.root,
    silent: true
  });
  const disabledAgain = await disableBackupMirror({ configFile }, {
    root: fixture.root,
    silent: true
  });
  const storedConfig = JSON.parse(await readFile(configFile, 'utf8'));
  const status = JSON.parse(await readFile(join(fixture.backupDir, 'status.json'), 'utf8'));
  const skipped = await mirrorBackupIfConfigured(output, {
    keyFile: fixture.keyFile,
    configFile,
    localBackupDir: fixture.backupDir
  });

  assert.equal(disabled.changed, true);
  assert.equal(disabled.preservedConfig, true);
  assert.equal(disabled.preservedBackups, true);
  assert.equal(disabledAgain.changed, false);
  assert.equal(storedConfig.enabled, false);
  assert.ok(storedConfig.disabledAt);
  assert.equal(await loadBackupMirrorConfig({ configFile }), null);
  assert.equal(skipped.configured, false);
  assert.equal(status.mirror.configured, false);
  assert.ok((await stat(output)).isFile());
  assert.ok((await stat(join(mirrorDir, basename(output)))).isFile());
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
