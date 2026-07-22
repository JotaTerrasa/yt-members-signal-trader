import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const VOLUME_TARGETS = [
  '/app/.data',
  '/app/.yt-profile',
  '/app/docs/strategy-reports',
  '/app/docs/audits'
];
const PROBE_FILE = '.futures-magician-persistence-check';

try {
  await main();
} catch (error) {
  console.error(`ERROR Docker smoke check: ${error.message}`);
  process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const image = String(options.image || 'futures-magician:local');
  const port = validPort(options.port || 15178);
  const timeoutMs = validTimeout(options.timeout || 60_000);
  const suffix = `${process.pid}-${randomUUID().slice(0, 8)}`;
  const container = `futures-magician-smoke-${suffix}`;
  const volumes = VOLUME_TARGETS.map((_, index) => `futures-magician-smoke-${index}-${suffix}`);

  try {
    volumes.forEach((volume) => runDocker(['volume', 'create', volume], { capture: true }));

    const firstHealth = await startAndWait({ container, volumes, image, port, timeoutMs });
    await verifyRealtimeStream(port);
    writeProbes(container);
    removeContainer(container);

    const secondHealth = await startAndWait({ container, volumes, image, port, timeoutMs });
    const probes = readProbes(container);
    const uid = runDocker(['exec', container, 'id', '-u'], { capture: true });

    console.log(JSON.stringify({
      ok: true,
      image,
      port,
      firstHealth: firstHealth.health?.level || 'ok',
      secondHealth: secondHealth.health?.level || 'ok',
      persistedVolumes: probes.length,
      uid
    }, null, 2));
  } catch (error) {
    const logs = runDocker(['logs', container], { capture: true, ignoreFailure: true });
    if (logs) {
      console.error(logs);
    }
    throw error;
  } finally {
    removeContainer(container);
    volumes.forEach((volume) => {
      runDocker(['volume', 'rm', volume], { capture: true, ignoreFailure: true });
    });
  }
}

async function startAndWait({ container, volumes, image, port, timeoutMs }) {
  const args = [
    'run',
    '--detach',
    '--name', container,
    '--publish', `127.0.0.1:${port}:5178`,
    '--env', 'NODE_ENV=production',
    '--env', 'HOST=0.0.0.0',
    '--env', 'PORT=5178',
    '--env', 'PLAYWRIGHT_HEADLESS=true'
  ];
  VOLUME_TARGETS.forEach((target, index) => {
    args.push('--mount', `source=${volumes[index]},target=${target}`);
  });
  args.push(image);
  runDocker(args, { capture: true });
  const health = await waitForHealth(port, timeoutMs);
  await verifyStaticAssets(port);
  return health;
}

async function waitForHealth(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'sin respuesta';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(3_000)
      });
      const payload = await response.json();
      if (response.ok && payload.ok === true) {
        return payload;
      }
      lastError = `HTTP ${response.status}, ok=${payload.ok}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(500);
  }
  throw new Error(`El contenedor no alcanzo /api/health: ${lastError}`);
}

async function verifyStaticAssets(port) {
  const assets = ['/vendor/lucide.min.js?v=1.25.0', '/vendor/plotly.min.js?v=2.35.2'];
  for (const asset of assets) {
    const response = await fetch(`http://127.0.0.1:${port}${asset}`, {
      method: 'HEAD',
      headers: { 'accept-encoding': 'br, gzip' },
      signal: AbortSignal.timeout(5_000)
    });
    const contentType = String(response.headers.get('content-type') || '');
    const cacheControl = String(response.headers.get('cache-control') || '');
    const etag = String(response.headers.get('etag') || '');
    const encoding = String(response.headers.get('content-encoding') || '');
    if (!response.ok
      || !contentType.includes('text/javascript')
      || !cacheControl.includes('immutable')
      || !etag
      || encoding !== 'br') {
      throw new Error(`Recurso visual no disponible en Docker: ${asset} (HTTP ${response.status})`);
    }

    const conditional = await fetch(`http://127.0.0.1:${port}${asset}`, {
      method: 'HEAD',
      headers: {
        'accept-encoding': 'br, gzip',
        'if-none-match': etag
      },
      signal: AbortSignal.timeout(5_000)
    });
    if (conditional.status !== 304) {
      throw new Error(`El recurso visual no responde 304 en Docker: ${asset} (HTTP ${conditional.status})`);
    }
  }
}

async function verifyRealtimeStream(port) {
  const signal = AbortSignal.timeout(20_000);
  const response = await fetch(`http://127.0.0.1:${port}/api/events`, {
    headers: { accept: 'text/event-stream' },
    signal
  });
  const cacheControl = String(response.headers.get('cache-control') || '');
  const buffering = String(response.headers.get('x-accel-buffering') || '');
  if (!response.ok
    || !String(response.headers.get('content-type') || '').includes('text/event-stream')
    || !cacheControl.includes('no-transform')
    || buffering.toLowerCase() !== 'no') {
    throw new Error(`Canal SSE no preparado para streaming (HTTP ${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = '';
  try {
    while (!content.includes('event: heartbeat')) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      content += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  if (!content.includes('retry: 3000')
    || !content.includes('event: state')
    || !content.includes('event: heartbeat')) {
    throw new Error('El canal SSE no entregó retry, estado inicial y heartbeat.');
  }
}

function writeProbes(container) {
  const source = `const fs=require('fs');const paths=${JSON.stringify(VOLUME_TARGETS)};paths.forEach((path,index)=>fs.writeFileSync(path+'/${PROBE_FILE}','probe-'+index));`;
  runDocker(['exec', container, 'node', '-e', source], { capture: true });
}

function readProbes(container) {
  const source = `const fs=require('fs');const paths=${JSON.stringify(VOLUME_TARGETS)};console.log(JSON.stringify(paths.map((path,index)=>({path,value:fs.readFileSync(path+'/${PROBE_FILE}','utf8'),expected:'probe-'+index}))));`;
  const output = runDocker(['exec', container, 'node', '-e', source], { capture: true });
  const probes = JSON.parse(output);
  if (probes.length !== VOLUME_TARGETS.length || probes.some((probe) => probe.value !== probe.expected)) {
    throw new Error(`La persistencia no coincide: ${output}`);
  }
  return probes;
}

function removeContainer(container) {
  runDocker(['rm', '--force', container], { capture: true, ignoreFailure: true });
}

function runDocker(args, { capture = false, ignoreFailure = false } = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true
  });
  if (result.error) {
    if (ignoreFailure) {
      return '';
    }
    throw result.error;
  }
  if (result.status !== 0 && !ignoreFailure) {
    throw new Error(`docker ${args[0]} termino con codigo ${result.status}: ${(result.stderr || '').trim()}`);
  }
  return (result.stdout || '').trim();
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith('--')) {
      throw new Error(`Argumento no reconocido: ${key}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Falta el valor de ${key}`);
    }
    options[key.slice(2)] = value;
    index += 1;
  }
  return options;
}

function validPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Puerto no valido: ${value}`);
  }
  return port;
}

function validTimeout(value) {
  const timeout = Number(value);
  if (!Number.isFinite(timeout) || timeout < 1_000 || timeout > 300_000) {
    throw new Error(`Timeout no valido: ${value}`);
  }
  return timeout;
}
