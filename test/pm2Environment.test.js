import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { privateEnvironmentNames, inspectPm2Environment } from '../scripts/checkPm2Environment.js';

test('el ecosistema PM2 excluye credenciales heredadas y conserva rutas necesarias', () => {
  const require = createRequire(import.meta.url);
  const configPath = require.resolve('../ecosystem.config.cjs');
  process.env.FUTURES_TEST_SECRET_TOKEN = 'credential-sentinel';
  delete require.cache[configPath];
  const app = require(configPath).apps[0];
  delete process.env.FUTURES_TEST_SECRET_TOKEN;

  assert.equal(app.filter_env.includes('FUTURES_TEST_SECRET_TOKEN'), true);
  assert.equal(Object.hasOwn(app.env, 'FUTURES_TEST_SECRET_TOKEN'), false);
  assert.equal(app.env.NODE_ENV, 'production');
  if (process.env.PATH) {
    assert.equal(app.env.PATH, process.env.PATH);
  }
});

test('la auditoría PM2 informa solo nombres privados y revisa proceso y dump', () => {
  const result = inspectPm2Environment({
    processes: [{
      name: 'yt-members-signal-trader',
      pm2_env: {
        PATH: 'safe',
        env: { BINGX_API_KEY: 'runtime-value', CODEX_THREAD_ID: 'runtime-id' }
      }
    }],
    dump: [{
      name: 'yt-members-signal-trader',
      APP_BASIC_PASSWORD: 'dump-value',
      env: { ELEVENLABS_API_KEY: 'dump-key' }
    }]
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.runtime.privateEnvironmentNames, ['BINGX_API_KEY', 'CODEX_THREAD_ID']);
  assert.deepEqual(result.dump.privateEnvironmentNames, ['APP_BASIC_PASSWORD', 'ELEVENLABS_API_KEY']);
  assert.equal(JSON.stringify(result).includes('runtime-value'), false);
  assert.equal(JSON.stringify(result).includes('dump-key'), false);
});

test('la detección reconoce prefijos y sufijos privados sin marcar variables del sistema', () => {
  assert.deepEqual(privateEnvironmentNames({
    PATH: 'safe',
    LOCALAPPDATA: 'safe',
    OPENAI_API_KEY: 'private',
    SERVICE_TOKEN: 'private',
    NODE_REPL_TRUSTED_CODE_PATHS: 'private'
  }), ['NODE_REPL_TRUSTED_CODE_PATHS', 'OPENAI_API_KEY', 'SERVICE_TOKEN']);
});
