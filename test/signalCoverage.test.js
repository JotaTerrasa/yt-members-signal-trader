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
