import assert from 'node:assert/strict';
import test from 'node:test';
import { clockOffsetLevel, estimateBingXClockSample } from '../src/bingxClock.js';

test('estima el desfase de BingX desde el punto medio del viaje REST', () => {
  const sample = estimateBingXClockSample({
    requestedAtMs: 1_784_721_600_000,
    receivedAtMs: 1_784_721_600_100,
    serverTime: 1_784_721_600_450,
    environment: 'prod-vst'
  });

  assert.equal(sample.roundTripMs, 100);
  assert.equal(sample.uncertaintyMs, 50);
  assert.equal(sample.offsetMs, 400);
  assert.equal(sample.absoluteOffsetMs, 400);
  assert.equal(sample.level, 'warn');
  assert.equal(sample.environment, 'prod-vst');
  assert.equal(sample.observationalOnly, true);
});

test('clasifica offsets sanos, de aviso y criticos', () => {
  assert.equal(clockOffsetLevel(250), 'ok');
  assert.equal(clockOffsetLevel(250.1), 'warn');
  assert.equal(clockOffsetLevel(1_999.9), 'warn');
  assert.equal(clockOffsetLevel(2_000), 'critical');
  assert.equal(clockOffsetLevel(Number.NaN), 'unavailable');
});

test('rechaza intervalos temporales imposibles', () => {
  assert.throws(() => estimateBingXClockSample({
    requestedAtMs: 2_000,
    receivedAtMs: 1_000,
    serverTime: 1_500
  }), /receivedAtMs/);
});
