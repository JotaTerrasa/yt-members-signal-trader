import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeHttpRequest, buildHttpSecurity, createMutationRateLimiter, validateMutationOrigin } from '../src/httpSecurity.js';

test('la autenticacion basica es opcional y valida credenciales completas', () => {
  const open = buildHttpSecurity({});
  assert.equal(authorizeHttpRequest(request(), url('/api/state'), open).ok, true);

  const secured = buildHttpSecurity({ APP_BASIC_USER: 'jaime', APP_BASIC_PASSWORD: 'secreto' });
  assert.equal(authorizeHttpRequest(request(), url('/api/state'), secured).ok, false);
  const authorization = `Basic ${Buffer.from('jaime:secreto').toString('base64')}`;
  assert.equal(authorizeHttpRequest(request({ authorization }), url('/api/state'), secured).ok, true);
  assert.equal(authorizeHttpRequest(request(), url('/api/health'), secured).ok, true);
  assert.throws(() => buildHttpSecurity({ APP_BASIC_USER: 'jaime' }));
});

test('las mutaciones de navegador solo aceptan el mismo origen', () => {
  assert.equal(validateMutationOrigin(request({ origin: 'http://localhost:5178' }, 'POST')).ok, true);
  assert.equal(validateMutationOrigin(request({ origin: 'https://otro.example' }, 'POST')).ok, false);
  assert.equal(validateMutationOrigin(request({}, 'POST')).ok, true);
});

test('el limitador afecta a mutaciones y no a lecturas', () => {
  const check = createMutationRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(check(request({}, 'POST'), 0).ok, true);
  assert.equal(check(request({}, 'POST'), 1).ok, true);
  assert.equal(check(request({}, 'POST'), 2).status, 429);
  assert.equal(check(request({}, 'GET'), 3).ok, true);
});

function request(headers = {}, method = 'GET') {
  return {
    method,
    headers: { host: 'localhost:5178', ...headers },
    socket: { remoteAddress: '127.0.0.1' }
  };
}

function url(pathname) {
  return new URL(pathname, 'http://localhost:5178');
}
