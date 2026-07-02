import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 5178);
const checks = [];

await check('Node.js 20+', async () => {
  const [major] = process.versions.node.split('.').map(Number);
  if (!Number.isFinite(major) || major < 20) {
    throw new Error(`Node actual: ${process.versions.node}`);
  }
  return process.versions.node;
});

await check('package-lock.json', async () => {
  await access(resolve(rootDir, 'package-lock.json'), constants.R_OK);
  return 'presente';
});

await check('Chromium de Playwright', async () => {
  const executable = chromium.executablePath();
  await access(executable, constants.X_OK).catch(async () => access(executable, constants.R_OK));
  return executable;
});

await check('Directorio .data', async () => {
  const dir = resolve(rootDir, '.data');
  await mkdir(dir, { recursive: true });
  await access(dir, constants.W_OK);
  return dir;
});

await check('Perfil Chromium .yt-profile', async () => {
  const dir = resolve(rootDir, '.yt-profile');
  await mkdir(dir, { recursive: true });
  await access(dir, constants.W_OK);
  return dir;
});

await check('Puerto local', async () => {
  const available = await portAvailable(port);
  if (!available) {
    throw new Error(`ocupado (${port}); correcto si la app ya esta levantada`);
  }
  return `libre (${port})`;
}, { warnOnly: true });

for (const item of checks) {
  const icon = item.level === 'ok' ? 'OK' : item.level === 'warn' ? 'AVISO' : 'ERROR';
  console.log(`${icon} ${item.name}: ${item.detail}`);
}

const errors = checks.filter((item) => item.level === 'error');
if (errors.length) {
  console.error('\nEl paquete no esta listo. Corrige los errores anteriores y vuelve a ejecutar npm run package:check.');
  process.exit(1);
}

console.log('\nPaquete listo para arrancar.');

async function check(name, action, options = {}) {
  try {
    const detail = await action();
    checks.push({ level: 'ok', name, detail });
  } catch (error) {
    checks.push({
      level: options.warnOnly ? 'warn' : 'error',
      name,
      detail: error.message
    });
  }
}

function portAvailable(targetPort) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => {
      server.close(() => resolveAvailable(true));
    });
    server.listen(targetPort);
  });
}
