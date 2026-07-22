import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
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
  await main(process.argv.slice(2));
}

async function main(values) {
  const command = String(values[0] || '').toLowerCase();
  const args = parseArgs(values.slice(1));
  if (command === 'init-key') {
    await initializeKey(args.keyFile);
  } else if (command === 'create') {
    await createBackup(args);
  } else if (command === 'verify') {
    await verifyBackup(args);
  } else if (command === 'restore') {
    await restoreBackup(args);
  } else {
    fail('Uso: secureBackup.js init-key|create|verify|restore [opciones]');
  }
}

async function initializeKey(keyFileInput) {
  const keyFile = resolveKeyFile(keyFileInput);
  const existing = await stat(keyFile).catch(() => null);
  if (existing?.isFile()) {
    await hardenKeyPermissions(keyFile);
    console.log(JSON.stringify({ ok: true, created: false, keyFile }, null, 2));
    return;
  }
  await mkdir(dirname(keyFile), { recursive: true });
  await writeFile(keyFile, `${randomBytes(48).toString('base64url')}\n`, { mode: 0o600, flag: 'wx' });
  await hardenKeyPermissions(keyFile);
  console.log(JSON.stringify({ ok: true, created: true, keyFile }, null, 2));
}

async function hardenKeyPermissions(keyFile) {
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

async function inspectBackup({ input, passphrase }) {
  const temporaryArchive = join(tmpdir(), `futures-magician-verify-${process.pid}-${Date.now()}.tar.gz`);
  try {
    const metadata = await decryptArchive({ input, output: temporaryArchive, passphrase });
    const listing = await run('tar', ['-tzf', temporaryArchive], { capture: true });
    const files = listing.split(/\r?\n/).filter(Boolean);
    const roots = [...new Set(files.map((entry) => entry.replace(/^\.\//, '').split('/')[0]).filter(Boolean))];
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
    if (key === 'includeProfile') {
      result[key] = true;
      continue;
    }
    result[key] = values[index + 1];
    index += 1;
  }
  return result;
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
