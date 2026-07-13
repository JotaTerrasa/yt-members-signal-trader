import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetryableOpeningEvent, openingClientOrderId, openingExecutionKey } from '../src/executionReliability.js';

const signal = {
  isSignal: true,
  symbol: 'SOL-USDT',
  direction: 'LONG',
  entry: { type: 'LIMIT', price: 81.9 },
  stopLoss: 81
};

test('openingClientOrderId es determinista por modo, post y senal', () => {
  const input = { executionMode: 'demo', postId: 'post-1', signal };
  assert.equal(openingClientOrderId(input), openingClientOrderId(input));
  assert.match(openingClientOrderId(input), /^yt[a-f0-9]{28}$/);
  assert.notEqual(
    openingClientOrderId(input),
    openingClientOrderId({ ...input, signal: { ...signal, symbol: 'BTC-USDT' } })
  );
  assert.equal(
    openingExecutionKey(input),
    'demo|post-1|SOL-USDT|LONG|81.9|81'
  );
});

test('solo reintenta fallos de apertura transitorios o de precio recuperable', () => {
  assert.equal(isRetryableOpeningEvent({
    status: 'blocked',
    executionMode: 'demo',
    reason: 'exchange_stop_loss_invalid:SL Price must be lower than Last Price',
    signal
  }), true);
  assert.equal(isRetryableOpeningEvent({
    status: 'error',
    executionMode: 'demo',
    reason: 'fetch failed',
    signal
  }), true);
  assert.equal(isRetryableOpeningEvent({
    status: 'error',
    executionMode: 'demo',
    reason: 'No hay VST disponible suficiente: hacen falta 45 VST y hay 8 VST.',
    signal
  }, { vstTechnicalReserveEnabled: true }), true);
  assert.equal(isRetryableOpeningEvent({
    status: 'error',
    executionMode: 'live',
    reason: 'No hay USDT suficiente',
    signal
  }), false);
  assert.equal(isRetryableOpeningEvent({
    status: 'blocked',
    executionMode: 'demo',
    reason: 'stop_loss_distance_too_high:8%>5%',
    signal
  }), false);
});
