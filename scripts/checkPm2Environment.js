import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_APP_NAME = 'yt-members-signal-trader';
const PRIVATE_PREFIXES = [
  'BROWSER_USE_',
  'CODEX_',
  'ELEVENLABS_',
  'GCLOUD_',
  'GOOGLE_CLOUD_',
  'NODE_REPL_'
];
const PRIVATE_NAME_PATTERN = /(?:^|_)(?:API_?KEY|AUTH|CREDENTIALS?|PASSWORD|PASSPHRASE|PRIVATE_?KEY|SECRET|TOKEN)(?:_|$)/i;

export function privateEnvironmentNames(environment = {}) {
  return Object.keys(environment)
    .filter((name) => PRIVATE_PREFIXES.some((prefix) => name.toUpperCase().startsWith(prefix))
      || PRIVATE_NAME_PATTERN.test(name))
    .sort();
}

export function inspectPm2Environment({ processes = [], dump = [], appName = DEFAULT_APP_NAME } = {}) {
  const runtimeRecord = processes.find((item) => item?.name === appName) || null;
  const dumpRecord = dump.find((item) => item?.name === appName) || null;
  const runtimeEnvironment = runtimeRecord?.pm2_env || {};
  const runtimeNames = privateEnvironmentNames({
    ...runtimeEnvironment,
    ...(runtimeEnvironment.env || {})
  });
  const dumpNames = privateEnvironmentNames({
    ...(dumpRecord || {}),
    ...(dumpRecord?.env || {})
  });

  return {
    ok: runtimeNames.length === 0 && dumpNames.length === 0,
    appName,
    runtime: {
      found: Boolean(runtimeRecord),
      privateEnvironmentNames: runtimeNames
    },
    dump: {
      found: Boolean(dumpRecord),
      privateEnvironmentNames: dumpNames
    }
  };
}

function readPm2Processes() {
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'pm2';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pm2.cmd jlist --silent'] : ['jlist', '--silent'];
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.error?.code === 'ENOENT') {
    return [];
  }
  if (result.status !== 0) {
    if (/not recognized|no se reconoce|not found/i.test(String(result.stderr || ''))) {
      return [];
    }
    throw new Error(`pm2 jlist terminó con código ${result.status}.`);
  }
  return JSON.parse(String(result.stdout || '[]'));
}

function readPm2Dump() {
  const dumpPath = join(process.env.PM2_HOME || join(homedir(), '.pm2'), 'dump.pm2');
  if (!existsSync(dumpPath)) {
    return [];
  }
  return JSON.parse(readFileSync(dumpPath, 'utf8'));
}

function main() {
  const result = inspectPm2Environment({
    processes: readPm2Processes(),
    dump: readPm2Dump()
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  main();
}
