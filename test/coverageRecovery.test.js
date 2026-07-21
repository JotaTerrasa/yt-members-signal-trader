import test from 'node:test';
import assert from 'node:assert/strict';
import { coverageRecoveryCandidates } from '../src/coverageRecovery.js';

const post = {
  id: 'post-1',
  url: 'https://www.youtube.com/post/post-1',
  text: 'LONG SOL 80\nSTOP SOL 79'
};
const signal = {
  isSignal: true,
  symbol: 'SOL-USDT',
  direction: 'LONG',
  entry: { price: 80 },
  stopLoss: 79
};

test('recupera solo huecos demo recientes sin evento de ejecución', () => {
  const now = Date.parse('2026-07-15T10:01:00.000Z');
  const candidates = coverageRecoveryCandidates({
    coverage: {
      packages: [{
        key: 'demo|post-1',
        postId: 'post-1',
        detectedAtMs: now - 60_000,
        executionMode: 'demo',
        status: 'pending',
        signals: [{ symbol: 'SOL-USDT', direction: 'LONG', status: 'pending', reason: 'no_execution_event' }]
      }]
    },
    posts: [post],
    parseSignals: () => [signal],
    executionMode: 'demo',
    now
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].signal.stopLoss, 79);
});

test('no persigue huecos expirados ni errores que ya tienen motivo', () => {
  const now = Date.parse('2026-07-15T10:10:00.000Z');
  const basePackage = {
    key: 'demo|post-1',
    postId: 'post-1',
    executionMode: 'demo',
    status: 'pending'
  };
  const expired = coverageRecoveryCandidates({
    coverage: {
      packages: [{
        ...basePackage,
        detectedAtMs: now - 10 * 60_000,
        signals: [{ symbol: 'SOL-USDT', direction: 'LONG', status: 'pending', reason: 'no_execution_event' }]
      }]
    },
    posts: [post],
    parseSignals: () => [signal],
    executionMode: 'demo',
    now
  });
  const explained = coverageRecoveryCandidates({
    coverage: {
      packages: [{
        ...basePackage,
        detectedAtMs: now - 60_000,
        signals: [{ symbol: 'SOL-USDT', direction: 'LONG', status: 'pending', reason: 'entry_adverse_deviation_too_high' }]
      }]
    },
    posts: [post],
    parseSignals: () => [signal],
    executionMode: 'demo',
    now
  });

  assert.equal(expired.length, 0);
  assert.equal(explained.length, 0);
});
