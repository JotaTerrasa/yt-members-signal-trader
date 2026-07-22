import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSignalCoverage } from '../src/signalCoverage.js';

test('no confunde prosa en castellano con una apertura LONG', () => {
  const coverage = buildSignalCoverage({
    posts: [{
      id: 'analysis-post',
      url: 'https://www.youtube.com/post/analysis-post',
      firstSeenAt: '2026-07-16T11:51:06.415Z',
      text: 'Creo que queda subida. Mi punto pivote de long es la zona 63500.'
    }],
    events: [],
    parseSignals: () => [],
    since: '2026-07-15T00:00:00.000Z',
    now: Date.parse('2026-07-16T12:00:00.000Z')
  });

  assert.equal(coverage.summary.packages, 0);
  assert.equal(coverage.summary.parseFailures, 0);
});

test('mantiene la alerta heuristica para una linea de apertura no parseada', () => {
  const coverage = buildSignalCoverage({
    posts: [{
      id: 'malformed-signal',
      url: 'https://www.youtube.com/post/malformed-signal',
      firstSeenAt: '2026-07-16T11:51:06.415Z',
      text: 'ORDEN\n\n!! LONG BTC'
    }],
    events: [],
    parseSignals: () => [],
    since: '2026-07-15T00:00:00.000Z',
    now: Date.parse('2026-07-16T12:00:00.000Z')
  });

  assert.equal(coverage.summary.packages, 1);
  assert.equal(coverage.summary.expectedOpenings, 1);
  assert.equal(coverage.summary.parseFailures, 1);
  assert.equal(coverage.packages[0].signals[0].symbol, 'BTC-USDT');
});

test('explica una apertura perdida cuando el post se corrigio despues del bloqueo', () => {
  const coverage = buildSignalCoverage({
    posts: [{
      id: 'corrected-post',
      url: 'https://www.youtube.com/post/corrected-post',
      firstSeenAt: '2026-07-16T11:51:06.415Z',
      text: 'current signal'
    }],
    events: [{
      at: '2026-07-16T11:51:08.099Z',
      postId: 'corrected-post',
      executionMode: 'demo',
      status: 'blocked',
      reason: 'stop_loss_distance_too_high:12.2499%>5%',
      signal: {
        symbol: 'ETH-USDT',
        direction: 'LONG',
        entry: { price: 1885 },
        stopLoss: 1650,
        leverage: 25
      }
    }],
    parseSignals: () => [{
      isSignal: true,
      symbol: 'ETH-USDT',
      direction: 'LONG',
      entry: { price: 1885 },
      stopLoss: 1865,
      leverage: 25
    }],
    since: '2026-07-15T00:00:00.000Z',
    now: Date.parse('2026-07-16T12:00:00.000Z')
  });

  const signal = coverage.packages[0].signals[0];
  assert.equal(signal.status, 'missing');
  assert.equal(signal.reason, 'stop_loss_distance_too_high:12.2499%>5%');
  assert.deepEqual(signal.correctionAfterEvent, {
    eventAt: '2026-07-16T11:51:08.099Z',
    eventStatus: 'blocked',
    changes: {
      stopLoss: { processed: 1650, current: 1865 }
    }
  });
  assert.equal(coverage.summary.correctedAfterEventOpenings, 1);
  assert.equal(coverage.summary.correctedAfterEventMissingOpenings, 1);
});
