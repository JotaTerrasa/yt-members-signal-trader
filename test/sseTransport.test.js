import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSseEvent, formatSseRetry } from '../src/sseTransport.js';

test('serializa un evento SSE completo y termina el bloque', () => {
  assert.equal(
    formatSseEvent('heartbeat', { at: '2026-07-22T17:00:00.000Z' }),
    'event: heartbeat\ndata: {"at":"2026-07-22T17:00:00.000Z"}\n\n'
  );
});

test('elimina saltos del nombre y acota el retry mínimo', () => {
  assert.equal(formatSseEvent('state\nretry: 1', { ok: true }).startsWith('event: stateretry: 1\n'), true);
  assert.equal(formatSseRetry(250), 'retry: 1000\n\n');
  assert.equal(formatSseRetry(5000), 'retry: 5000\n\n');
});
