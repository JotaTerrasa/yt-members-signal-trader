import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, open, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MAGIC = Buffer.from('FMBAK002');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const modulePath = fileURLToPath(import.meta.url);
const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function main(values) {
  const command = String(values[0] || '').toLowerCase();
  const args = parseArgs(values.slice(1));
  if (command === 'init-key') {
    await initializeKey(args.keyFile);
  } else if (command === 'configure-mirror') {
    await configureBackupMirror(args);
  } else if (command === 'disable-mirror') {
    await disableBackupMirror(args);
  } else if (command === 'mirror-status') {
    await printBackupMirrorStatus(args);
  } else if (command === 'create') {
    await createBackupCommand(args);
  } else if (command === 'verify') {
    await verifyBackup(args);
  } else if (command === 'drill') {
    await drillBackupCommand(args);
  } else if (command === 'restore') {
    await restoreBackup(args);
  } else {
    fail('Uso: secureBackup.js init-key|configure-mirror|disable-mirror|mirror-status|create|verify|drill|restore [opciones]');
  }
}

export async function createBackupCommand(options, { root = projectRoot, silent = false } = {}) {
  const attemptedAt = new Date().toISOString();
  let created = null;
  let restoreDrill = null;
  let mirror = null;
  try {
    created = await createBackup(options, { root, silent: true });
    restoreDrill = options.drill
      ? await drillBackup({ input: created.output, keyFile: options.keyFile }, { silent: true })
      : null;
    mirror = await mirrorBackupIfConfigured(created.output, {
      keyFile: options.keyFile,
      configFile: options.configFile,
      localBackupDir: dirname(created.output)
    });
    const successAt = validBackupTimestamp(restoreDrill?.metadata?.createdAt) || new Date().toISOString();
    await updateSecureBackupStatus({
      lastAttemptAt: attemptedAt,
      lastSuccessAt: successAt,
      lastFailureAt: null,
      lastError: null,
      lastFile: basename(created.output),
      bytes: created.bytes,
      includeProfile: created.includeProfile,
      verified: created.verified,
      restoreDrill: statusDrillResult(restoreDrill),
      mirror: statusMirrorResult(mirror),
      ...(created.includeProfile ? {
        lastProfileSuccessAt: successAt,
        lastProfileFile: basename(created.output),
        profileBytes: created.bytes,
        profileRestoreDrill: statusDrillResult(restoreDrill)
      } : {})
    }, { root });
  } catch (error) {
    await updateSecureBackupStatus({
      lastAttemptAt: attemptedAt,
      lastFailureAt: new Date().toISOString(),
      lastError: safeStatusError(error),
      ...(created ? {
        lastFile: basename(created.output),
        bytes: created.bytes,
        includeProfile: created.includeProfile,
        verified: created.verified,
        ...(mirror ? { mirror: statusMirrorResult(mirror) } : {})
      } : {})
    }, { root }).catch(() => {});
    throw error;
  }

  if (mirror.configured && !mirror.ok) {
    fail(`El backup local es correcto, pero la réplica externa falló: ${mirror.lastError}`);
  }
  const result = { ...created, restoreDrill, mirror };
  if (!silent) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

async function drillBackupCommand(options) {
  const attemptedAt = new Date().toISOString();
  try {
    const result = await drillBackup(options, { silent: true });
    const inputInfo = await stat(result.input);
    const current = await readSecureBackupStatusRecord();
    const backupCreatedAt = validBackupTimestamp(result.metadata.createdAt) || result.checkedAt;
    const updatesLatestData = isAtLeastAsRecent(backupCreatedAt, current.lastSuccessAt);
    const updatesLatestProfile = result.metadata.includeProfile
      && isAtLeastAsRecent(backupCreatedAt, current.lastProfileSuccessAt);
    await updateSecureBackupStatus({
      lastAttemptAt: attemptedAt,
      lastFailureAt: null,
      lastError: null,
      ...(updatesLatestData ? {
        lastSuccessAt: backupCreatedAt,
        lastFile: basename(result.input),
        bytes: inputInfo.size,
        includeProfile: result.metadata.includeProfile,
        verified: true,
        restoreDrill: statusDrillResult(result)
      } : {}),
      ...(updatesLatestProfile ? {
        lastProfileSuccessAt: backupCreatedAt,
        lastProfileFile: basename(result.input),
        profileBytes: inputInfo.size,
        profileRestoreDrill: statusDrillResult(result)
      } : {})
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await updateSecureBackupStatus({
      lastAttemptAt: attemptedAt,
      lastFailureAt: new Date().toISOString(),
      lastError: safeStatusError(error)
    }).catch(() => {});
    throw error;
  }
}

async function initializeKey(keyFileInput) {
  const keyFile = resolveKeyFile(keyFileInput);
  const existing = await stat(keyFile).catch(() => null);
  if (existing?.isFile()) {
    await hardenPrivateFilePermissions(keyFile);
    console.log(JSON.stringify({ ok: true, created: false, keyFile }, null, 2));
    return;
  }
  await mkdir(dirname(keyFile), { recursive: true });
  await writeFile(keyFile, `${randomBytes(48).toString('base64url')}\n`, { mode: 0o600, flag: 'wx' });
  await hardenPrivateFilePermissions(keyFile);
  console.log(JSON.stringify({ ok: true, created: true, keyFile }, null, 2));
}

async function hardenPrivateFilePermissions(keyFile) {
  if (process.platform !== 'win32') {
    await chmod(keyFile, 0o600);
    return;
  }
  const username = String(process.env.USERNAME || '').trim();
  const domain = String(process.env.USERDOMAIN || '').trim();
  if (!username) {
    fail('No se pudo determinar el usuario para proteger la clave de backup.');
  }
  const identity = domain ? `${domain}\\${username}` : username;
  await run('icacls', [keyFile, '/inheritance:r', '/grant:r', `${identity}:(R,W)`], {
    cwd: dirname(keyFile),
    capture: true
  });
}

export async function configureBackupMirror(options = {}, {
  configFile,
  localBackupDir = join(projectRoot, '.data', 'backups', 'secure'),
  root = projectRoot,
  silent = false
} = {}) {
  const targetInput = String(options.target || '').trim();
  if (!targetInput) {
    fail('Indica el destino con --target.');
  }
  const targetDir = resolve(targetInput);
  const projectDir = resolve(root);
  const localDir = resolve(localBackupDir);
  const configPath = resolveMirrorConfigFile(options.configFile || configFile);
  if (isPathWithin(projectDir, targetDir) || isPathWithin(localDir, targetDir)) {
    fail('El destino de la réplica no puede estar dentro del proyecto ni de sus backups locales.');
  }
  await Promise.all([
    mkdir(targetDir, { recursive: true }),
    mkdir(localDir, { recursive: true }),
    mkdir(dirname(configPath), { recursive: true })
  ]);
  const [targetReal, localReal, projectReal] = await Promise.all([
    realpath(targetDir),
    realpath(localDir),
    realpath(projectDir)
  ]);
  if (isPathWithin(projectReal, targetReal) || isPathWithin(localReal, targetReal)) {
    fail('El destino de la réplica no puede estar dentro del proyecto ni de sus backups locales.');
  }
  const [targetInfo, localInfo] = await Promise.all([stat(targetReal), stat(localReal)]);
  const sameVolume = targetInfo.dev === localInfo.dev;
  const allowSameVolume = Boolean(options.allowSameVolume);
  if (sameVolume && !allowSameVolume) {
    fail('El destino está en el mismo sistema de archivos. Usa otra unidad o confirma --allow-same-volume para una carpeta sincronizada.');
  }

  const config = {
    version: 1,
    enabled: true,
    targetDir: targetReal,
    allowSameVolume,
    configuredAt: new Date().toISOString()
  };
  await writePrivateJsonFile(configPath, config);

  const result = {
    ok: true,
    configured: true,
    configFile: configPath,
    targetDir: targetReal,
    targetLabel: mirrorTargetLabel(targetReal),
    sameVolume,
    resilient: !sameVolume,
    cloudSyncUnverified: sameVolume
  };
  if (!silent) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

export async function disableBackupMirror(options = {}, {
  configFile,
  root = projectRoot,
  silent = false
} = {}) {
  const configPath = resolveMirrorConfigFile(options.configFile || configFile);
  const current = await readBackupMirrorConfigRecord({ configFile: configPath });
  const changed = Boolean(current?.enabled);
  if (current && changed) {
    await writePrivateJsonFile(configPath, {
      ...current,
      enabled: false,
      disabledAt: new Date().toISOString()
    });
  } else if (current) {
    await hardenPrivateFilePermissions(configPath);
  }
  await updateSecureBackupStatus({
    mirror: statusMirrorResult({ configured: false, ok: true })
  }, { root });

  const result = {
    ok: true,
    configured: false,
    enabled: false,
    changed,
    configFile: configPath,
    preservedConfig: Boolean(current),
    preservedBackups: true,
    targetLabel: current?.targetDir ? mirrorTargetLabel(current.targetDir) : null
  };
  if (!silent) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

async function printBackupMirrorStatus(options = {}) {
  const configFile = resolveMirrorConfigFile(options.configFile);
  const record = await readBackupMirrorConfigRecord({ configFile });
  if (!record || !record.enabled) {
    console.log(JSON.stringify({
      ok: true,
      configured: false,
      enabled: false,
      configFile,
      preservedConfig: Boolean(record),
      targetDir: record?.targetDir || null,
      targetLabel: record?.targetDir ? mirrorTargetLabel(record.targetDir) : null,
      disabledAt: validBackupTimestamp(record?.disabledAt)
    }, null, 2));
    return;
  }
  const config = await loadBackupMirrorConfig({ configFile });
  const localBackupDir = join(projectRoot, '.data', 'backups', 'secure');
  await mkdir(localBackupDir, { recursive: true });
  const [targetInfo, localInfo] = await Promise.all([
    stat(config.targetDir).catch(() => null),
    stat(localBackupDir)
  ]);
  const sameVolume = targetInfo ? targetInfo.dev === localInfo.dev : null;
  console.log(JSON.stringify({
    ok: Boolean(targetInfo?.isDirectory()),
    configured: true,
    enabled: true,
    configFile,
    targetDir: config.targetDir,
    targetLabel: mirrorTargetLabel(config.targetDir),
    reachable: Boolean(targetInfo?.isDirectory()),
    sameVolume,
    resilient: sameVolume === false,
    cloudSyncUnverified: sameVolume === true
  }, null, 2));
}

export async function mirrorBackupIfConfigured(inputValue, {
  keyFile,
  configFile,
  localBackupDir = dirname(resolve(inputValue))
} = {}) {
  const resolvedConfigFile = resolveMirrorConfigFile(configFile);
  let config;
  try {
    config = await loadBackupMirrorConfig({ configFile: resolvedConfigFile });
  } catch (error) {
    return {
      configured: true,
      ok: false,
      resilient: false,
      sameVolume: null,
      targetLabel: null,
      lastError: safeStatusError(error)
    };
  }
  if (!config) {
    return {
      configured: false,
      ok: true,
      resilient: false,
      sameVolume: null,
      targetLabel: null,
      lastError: null
    };
  }

  const input = resolve(inputValue);
  const targetDir = config.targetDir;
  const targetLabel = mirrorTargetLabel(targetDir);
  const output = join(targetDir, basename(input));
  const partialOutput = `${output}.${process.pid}-${Date.now()}.partial`;
  try {
    await Promise.all([
      mkdir(targetDir, { recursive: true }),
      mkdir(localBackupDir, { recursive: true })
    ]);
    const [inputInfo, targetInfo, localInfo] = await Promise.all([
      stat(input),
      stat(targetDir),
      stat(localBackupDir)
    ]);
    const sameVolume = targetInfo.dev === localInfo.dev;
    if (sameVolume && !config.allowSameVolume) {
      fail('La réplica configurada ha pasado al mismo sistema de archivos y requiere revisión.');
    }
    const existing = await stat(output).catch(() => null);
    if (existing) {
      if (!existing.isFile() || existing.size !== inputInfo.size) {
        fail(`Ya existe una réplica distinta con el nombre ${basename(output)}.`);
      }
      await verifyBackup({ input: output, keyFile }, { silent: true });
      return {
        configured: true,
        ok: true,
        output,
        targetLabel,
        bytes: existing.size,
        checkedAt: new Date().toISOString(),
        verified: true,
        reused: true,
        sameVolume,
        resilient: !sameVolume,
        cloudSyncUnverified: sameVolume,
        lastError: null
      };
    }

    await copyFile(input, partialOutput);
    const verification = await verifyBackup({ input: partialOutput, keyFile }, { silent: true });
    await rename(partialOutput, output);
    if (process.platform !== 'win32') {
      await chmod(output, 0o600);
    }
    const outputInfo = await stat(output);
    return {
      configured: true,
      ok: true,
      output,
      targetLabel,
      bytes: outputInfo.size,
      checkedAt: new Date().toISOString(),
      verified: verification.ok,
      reused: false,
      sameVolume,
      resilient: !sameVolume,
      cloudSyncUnverified: sameVolume,
      lastError: null
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      targetLabel,
      bytes: null,
      checkedAt: new Date().toISOString(),
      verified: false,
      sameVolume: null,
      resilient: false,
      cloudSyncUnverified: false,
      lastError: safeStatusError(error)
    };
  } finally {
    await rm(partialOutput, { force: true }).catch(() => {});
  }
}

export async function loadBackupMirrorConfig({ configFile } = {}) {
  const config = await readBackupMirrorConfigRecord({ configFile });
  if (!config || !config.enabled) {
    return null;
  }
  return {
    version: 1,
    enabled: true,
    targetDir: config.targetDir,
    allowSameVolume: config.allowSameVolume,
    configuredAt: config.configuredAt
  };
}

async function readBackupMirrorConfigRecord({ configFile } = {}) {
  const configPath = resolveMirrorConfigFile(configFile);
  const raw = await readFile(configPath, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') {
      return '';
    }
    throw error;
  });
  if (!raw) {
    return null;
  }
  const config = JSON.parse(raw);
  if (config?.version !== 1
    || typeof config.enabled !== 'boolean'
    || !String(config.targetDir || '').trim()) {
    fail('La configuración de la réplica externa no es válida.');
  }
  return {
    version: 1,
    enabled: config.enabled,
    targetDir: resolve(config.targetDir),
    allowSameVolume: Boolean(config.allowSameVolume),
    configuredAt: validBackupTimestamp(config.configuredAt),
    disabledAt: validBackupTimestamp(config.disabledAt)
  };
}

async function writePrivateJsonFile(filePath, value) {
  const partialPath = `${filePath}.${process.pid}-${Date.now()}.partial`;
  await mkdir(dirname(filePath), { recursive: true });
  try {
    await writeFile(partialPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await rename(partialPath, filePath);
    await hardenPrivateFilePermissions(filePath);
  } finally {
    await rm(partialPath, { force: true }).catch(() => {});
  }
}

export async function createBackup(options, { root = projectRoot, silent = false } = {}) {
  const keyFile = resolveKeyFile(options.keyFile);
  const passphrase = await readPassphrase(keyFile);
  const includeProfile = Boolean(options.includeProfile);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = resolve(options.output || join(root, '.data', 'backups', 'secure', `futures-magician-${timestamp}.fmbak`));
  const partialOutput = `${output}.${process.pid}-${Date.now()}.partial`;
  const temporaryArchive = join(tmpdir(), `futures-magician-${process.pid}-${Date.now()}.tar.gz`);
  await mkdir(dirname(output), { recursive: true });
  if (await stat(output).catch(() => null)) {
    fail(`El destino del backup ya existe: ${output}`);
  }

  try {
    const inputs = ['.data', ...(includeProfile ? ['.yt-profile'] : [])];
    await run('tar', [
      '-czf', temporaryArchive,
      '--exclude=.data/backups/secure',
      '--exclude=.data/restore-tests',
      '--exclude=.yt-profile/Default/Cache',
      '--exclude=.yt-profile/Default/Code Cache',
      '--exclude=.yt-profile/Default/GPUCache',
      '--exclude=.yt-profile/Default/Sessions',
      '--exclude=.yt-profile/Default/Safe Browsing Network',
      '--exclude=.yt-profile/Default/LOCK',
      '--exclude=.yt-profile/Singleton*',
      ...inputs
    ], { cwd: root });
    const metadata = {
      version: 2,
      createdAt: new Date().toISOString(),
      includeProfile,
      inputs,
      cipher: 'aes-256-gcm',
      kdf: 'scrypt'
    };
    await encryptArchive({ input: temporaryArchive, output: partialOutput, passphrase, metadata });
    const verification = await inspectBackup({ input: partialOutput, passphrase });
    assertBackupContents(verification, inputs);
    await rename(partialOutput, output);
    const info = await stat(output);
    const result = {
      ok: true,
      output,
      bytes: info.size,
      includeProfile,
      keyFile,
      verified: true,
      entries: verification.files.length,
      roots: verification.roots
    };
    if (!silent) {
      console.log(JSON.stringify(result, null, 2));
    }
    return result;
  } finally {
    await rm(temporaryArchive, { force: true });
    await rm(partialOutput, { force: true });
  }
}

export async function verifyBackup(options, { silent = false } = {}) {
  const input = requiredFile(options.input || options._[0], 'Indica el backup con --input.');
  const keyFile = resolveKeyFile(options.keyFile);
  const passphrase = await readPassphrase(keyFile);
  const verification = await inspectBackup({ input, passphrase });
  const inputs = backupInputs(verification.metadata);
  assertBackupContents(verification, inputs);
  validateBackupEntries(verification.files, inputs);
  const result = {
    ok: true,
    input,
    metadata: verification.metadata,
    entries: verification.files.length,
    roots: verification.roots
  };
  if (!silent) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

export async function drillBackup(options, { silent = false } = {}) {
  const input = requiredFile(options.input || options._?.[0], 'Indica el backup con --input.');
  const keyFile = resolveKeyFile(options.keyFile);
  const passphrase = await readPassphrase(keyFile);
  const temporaryArchive = join(tmpdir(), `futures-magician-drill-${process.pid}-${Date.now()}.tar.gz`);
  const temporaryTarget = await mkdtemp(join(tmpdir(), 'futures-magician-restore-drill-'));
  try {
    const metadata = await decryptArchive({ input, output: temporaryArchive, passphrase });
    const listing = await run('tar', ['-tzf', temporaryArchive], { capture: true });
    const files = listing.split(/\r?\n/).filter(Boolean);
    const roots = backupRoots(files);
    const inputs = backupInputs(metadata);
    assertBackupContents({ metadata, files, roots }, inputs);
    validateBackupEntries(files, inputs);
    await run('tar', ['-xzf', temporaryArchive, '-C', temporaryTarget]);
    for (const root of inputs) {
      const rootInfo = await stat(join(temporaryTarget, root)).catch(() => null);
      if (!rootInfo?.isDirectory()) {
        fail(`El simulacro no pudo restaurar el directorio ${root}.`);
      }
    }
    const result = {
      ok: true,
      input,
      checkedAt: new Date().toISOString(),
      metadata,
      entries: files.length,
      roots,
      extracted: true,
      cleaned: true
    };
    if (!silent) {
      console.log(JSON.stringify(result, null, 2));
    }
    return result;
  } finally {
    await rm(temporaryArchive, { force: true });
    await rm(temporaryTarget, { recursive: true, force: true });
  }
}

async function inspectBackup({ input, passphrase }) {
  const temporaryArchive = join(tmpdir(), `futures-magician-verify-${process.pid}-${Date.now()}.tar.gz`);
  try {
    const metadata = await decryptArchive({ input, output: temporaryArchive, passphrase });
    const listing = await run('tar', ['-tzf', temporaryArchive], { capture: true });
    const files = listing.split(/\r?\n/).filter(Boolean);
    const roots = backupRoots(files);
    return { metadata, files, roots };
  } finally {
    await rm(temporaryArchive, { force: true });
  }
}

function assertBackupContents({ metadata, files, roots }, inputs) {
  if (metadata?.version !== 2 || metadata?.cipher !== 'aes-256-gcm' || metadata?.kdf !== 'scrypt') {
    fail('La verificación del backup devolvió metadatos incompatibles.');
  }
  if (!files.length) {
    fail('La verificación del backup no encontró ningún archivo.');
  }
  const missingRoots = inputs.filter((input) => !roots.includes(input));
  if (missingRoots.length) {
    fail(`La verificación del backup no encontró: ${missingRoots.join(', ')}.`);
  }
}

function backupInputs(metadata = {}) {
  const inputs = Array.isArray(metadata.inputs) ? metadata.inputs.map(String) : [];
  if (!inputs.length || inputs.some((input) => !['.data', '.yt-profile'].includes(input))) {
    fail('La lista de directorios del backup no es válida.');
  }
  return [...new Set(inputs)];
}

function backupRoots(files = []) {
  return [...new Set(files.map((entry) => entry.replace(/^\.\//, '').split('/')[0]).filter(Boolean))];
}

export function validateBackupEntries(files = [], inputs = []) {
  const allowedRoots = new Set(inputs);
  for (const entry of files) {
    const normalized = String(entry || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
    const parts = normalized.split('/').filter(Boolean);
    const unsafe = !normalized
      || normalized.startsWith('/')
      || /^[a-z]:/i.test(normalized)
      || parts.includes('..')
      || parts.includes('.')
      || !allowedRoots.has(parts[0]);
    if (unsafe) {
      fail(`El backup contiene una ruta no permitida: ${entry}.`);
    }
  }
  return true;
}

async function restoreBackup(options) {
  const input = requiredFile(options.input || options._[0], 'Indica el backup con --input.');
  const keyFile = resolveKeyFile(options.keyFile);
  const passphrase = await readPassphrase(keyFile);
  const defaultTarget = join(projectRoot, '.data', 'restore-tests', new Date().toISOString().replace(/[:.]/g, '-'));
  const target = resolve(options.target || defaultTarget);
  if (target === projectRoot && options.confirmLive !== 'RESTORE_LIVE_DATA') {
    fail('Restaurar sobre el proyecto exige --confirm-live RESTORE_LIVE_DATA.');
  }
  const temporaryArchive = join(tmpdir(), `futures-magician-restore-${process.pid}-${Date.now()}.tar.gz`);
  await mkdir(target, { recursive: true });
  try {
    const metadata = await decryptArchive({ input, output: temporaryArchive, passphrase });
    const listing = await run('tar', ['-tzf', temporaryArchive], { capture: true });
    const files = listing.split(/\r?\n/).filter(Boolean);
    const roots = backupRoots(files);
    const inputs = backupInputs(metadata);
    assertBackupContents({ metadata, files, roots }, inputs);
    validateBackupEntries(files, inputs);
    await run('tar', ['-xzf', temporaryArchive, '-C', target]);
    console.log(JSON.stringify({ ok: true, input, target, metadata }, null, 2));
  } finally {
    await rm(temporaryArchive, { force: true });
  }
}

async function encryptArchive({ input, output, passphrase, metadata }) {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(metadataBuffer.length);
  const aad = Buffer.concat([MAGIC, lengthBuffer, metadataBuffer]);
  const header = Buffer.concat([aad, salt, iv]);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);

  await new Promise((resolvePromise, rejectPromise) => {
    const inputStream = createReadStream(input);
    const outputStream = createWriteStream(output, { mode: 0o600 });
    const failStream = (error) => rejectPromise(error);
    inputStream.on('error', failStream);
    cipher.on('error', failStream);
    outputStream.on('error', failStream);
    outputStream.on('close', resolvePromise);
    outputStream.write(header);
    inputStream.pipe(cipher).pipe(outputStream, { end: false });
    cipher.on('end', () => outputStream.end(cipher.getAuthTag()));
  });
}

async function decryptArchive({ input, output, passphrase }) {
  const fileInfo = await stat(input);
  if (fileInfo.size < MAGIC.length + 4 + SALT_BYTES + IV_BYTES + TAG_BYTES) {
    fail('El archivo no tiene un formato de backup válido.');
  }
  const handle = await open(input, 'r');
  try {
    const prefix = Buffer.alloc(MAGIC.length + 4);
    await handle.read(prefix, 0, prefix.length, 0);
    if (!prefix.subarray(0, MAGIC.length).equals(MAGIC)) {
      fail('El archivo no es un backup Futures Magician compatible.');
    }
    const metadataLength = prefix.readUInt32BE(MAGIC.length);
    if (metadataLength <= 0 || metadataLength > 64 * 1024) {
      fail('La cabecera del backup no es válida.');
    }
    const metadataBuffer = Buffer.alloc(metadataLength);
    await handle.read(metadataBuffer, 0, metadataLength, prefix.length);
    const salt = Buffer.alloc(SALT_BYTES);
    const iv = Buffer.alloc(IV_BYTES);
    const saltPosition = prefix.length + metadataLength;
    await handle.read(salt, 0, SALT_BYTES, saltPosition);
    await handle.read(iv, 0, IV_BYTES, saltPosition + SALT_BYTES);
    const tag = Buffer.alloc(TAG_BYTES);
    await handle.read(tag, 0, TAG_BYTES, fileInfo.size - TAG_BYTES);
    const aad = Buffer.concat([prefix, metadataBuffer]);
    const key = scryptSync(passphrase, salt, 32);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const dataStart = saltPosition + SALT_BYTES + IV_BYTES;
    const dataEnd = fileInfo.size - TAG_BYTES - 1;
    await pipeline(
      createReadStream(input, { start: dataStart, end: dataEnd }),
      decipher,
      createWriteStream(output, { mode: 0o600 })
    );
    return JSON.parse(metadataBuffer.toString('utf8'));
  } finally {
    await handle.close();
  }
}

async function readPassphrase(keyFile) {
  const envValue = String(process.env.FUTURES_BACKUP_PASSPHRASE || '').trim();
  const value = envValue || String(await readFile(keyFile, 'utf8').catch(() => '')).trim();
  if (value.length < 24) {
    fail(`No hay una clave segura. Ejecuta init-key o define FUTURES_BACKUP_PASSPHRASE (mínimo 24 caracteres). Ruta: ${keyFile}`);
  }
  return value;
}

function resolveKeyFile(value) {
  return resolve(value || process.env.FUTURES_BACKUP_KEY_FILE || join(homedir(), '.futures-magician', 'backup.key'));
}

function requiredFile(value, message) {
  if (!value) {
    fail(message);
  }
  return resolve(value);
}

function parseArgs(values) {
  const result = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      result._.push(value);
      continue;
    }
    const key = value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (key === 'includeProfile' || key === 'drill' || key === 'allowSameVolume') {
      result[key] = true;
      continue;
    }
    result[key] = values[index + 1];
    index += 1;
  }
  return result;
}

async function updateSecureBackupStatus(patch, { root = projectRoot } = {}) {
  const statusPath = join(root, '.data', 'backups', 'secure', 'status.json');
  const partialPath = `${statusPath}.${process.pid}-${Date.now()}.partial`;
  await mkdir(dirname(statusPath), { recursive: true });
  const current = await readFile(statusPath, 'utf8')
    .then((value) => JSON.parse(value))
    .catch(() => ({}));
  const next = {
    version: 1,
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  try {
    await writeFile(partialPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    await rename(partialPath, statusPath);
  } finally {
    await rm(partialPath, { force: true });
  }
  return next;
}

async function readSecureBackupStatusRecord({ root = projectRoot } = {}) {
  const statusPath = join(root, '.data', 'backups', 'secure', 'status.json');
  return readFile(statusPath, 'utf8')
    .then((value) => JSON.parse(value))
    .catch(() => ({}));
}

function validBackupTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function isAtLeastAsRecent(candidate, current) {
  const candidateTime = Date.parse(String(candidate || ''));
  const currentTime = Date.parse(String(current || ''));
  return Number.isFinite(candidateTime) && (!Number.isFinite(currentTime) || candidateTime >= currentTime);
}

function statusDrillResult(result) {
  if (!result) {
    return null;
  }
  return {
    ok: Boolean(result.ok),
    checkedAt: validBackupTimestamp(result.checkedAt),
    entries: Number(result.entries) || 0,
    roots: Array.isArray(result.roots) ? result.roots.filter((root) => root === '.data' || root === '.yt-profile') : [],
    extracted: Boolean(result.extracted),
    cleaned: Boolean(result.cleaned)
  };
}

function statusMirrorResult(result = {}) {
  return {
    configured: Boolean(result.configured),
    ok: Boolean(result.ok),
    checkedAt: validBackupTimestamp(result.checkedAt),
    lastFile: result.output ? basename(result.output) : null,
    targetLabel: String(result.targetLabel || '').trim().slice(0, 120) || null,
    bytes: Number.isFinite(Number(result.bytes)) ? Number(result.bytes) : null,
    verified: Boolean(result.verified),
    reused: Boolean(result.reused),
    sameVolume: typeof result.sameVolume === 'boolean' ? result.sameVolume : null,
    resilient: Boolean(result.resilient),
    cloudSyncUnverified: Boolean(result.cloudSyncUnverified),
    lastError: safeStatusError(result.lastError || '') || null
  };
}

function resolveMirrorConfigFile(value) {
  return resolve(value || process.env.FUTURES_BACKUP_MIRROR_CONFIG || join(homedir(), '.futures-magician', 'backup-mirror.json'));
}

function mirrorTargetLabel(targetDir) {
  return basename(resolve(targetDir)) || resolve(targetDir);
}

function isPathWithin(parent, candidate) {
  const pathFromParent = relative(parent, candidate);
  return pathFromParent === ''
    || (!isAbsolute(pathFromParent) && pathFromParent !== '..' && !pathFromParent.startsWith(`..${sep}`));
}

function safeStatusError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 300);
}

function run(commandName, commandArgs, { cwd = projectRoot, capture = false } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(commandName, commandArgs, {
      cwd,
      windowsHide: true,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(stdout);
      } else {
        rejectPromise(new Error(`${basename(commandName)} terminó con código ${code}: ${stderr.trim()}`));
      }
    });
  });
}

function fail(message) {
  throw new Error(message);
}
