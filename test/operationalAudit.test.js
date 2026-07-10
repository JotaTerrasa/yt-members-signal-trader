import test from 'node:test';
import assert from 'node:assert/strict';
import { cohortSampleStatus, commissionEvidence, isRetryableCloseError } from '../src/operationalAudit.js';
import { buildSignalCoverage } from '../src/signalCoverage.js';

test('clasifica solo errores temporales de cierre como reintentables', () => {
  assert.equal(isRetryableCloseError('Please try again later.'), true);
  assert.equal(isRetryableCloseError('fetch failed'), true);
  assert.equal(isRetryableCloseError('Invalid API key'), false);
});

test('separa la tarifa real de una devolución no acreditada', () => {
  const evidence = commissionEvidence({
    incomeRows: [
      { incomeType: 'TRADING_FEE', income: '-10' },
      { incomeType: 'REALIZED_PNL', income: '4' }
    ],
    commissionRate: {
      takerCommissionRate: 0.0005,
      makerCommissionRate: 0.0002
    }
  });

  assert.equal(evidence.detectedRebate, 0);
  assert.equal(evidence.rebateDetected, false);
  assert.equal(evidence.takerCommissionPercent, 0.05);
  assert.equal(evidence.makerCommissionPercent, 0.02);
});

test('clasifica el tamaño de la cohorte sin vender certeza prematura', () => {
  assert.equal(cohortSampleStatus(12).key, 'exploratory');
  assert.equal(cohortSampleStatus(45).key, 'preliminary');
  assert.equal(cohortSampleStatus(100).key, 'contrastable');
});

test('audita paquetes completos e incompletos desde el inicio de cohorte', () => {
  const now = Date.parse('2026-07-10T10:10:00.000Z');
  const posts = [{
    id: 'package-1',
    url: 'https://www.youtube.com/post/package-1',
    firstSeenAt: '2026-07-10T10:00:00.000Z',
    text: 'LONG BTC 60000\nSTOP BTC 59000\nLONG ETH 1700\nSTOP ETH 1680'
  }];
  const parseSignals = () => [
    { isSignal: true, symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 60000 }, stopLoss: 59000 },
    { isSignal: true, symbol: 'ETH-USDT', direction: 'LONG', entry: { price: 1700 }, stopLoss: 1680 }
  ];
  const coverage = buildSignalCoverage({
    posts,
    events: [{
      at: '2026-07-10T10:00:03.000Z',
      postId: 'package-1',
      executionMode: 'demo',
      status: 'demo_order_sent',
      signal: { symbol: 'BTC-USDT', direction: 'LONG' }
    }],
    parseSignals,
    mode: 'demo',
    since: '2026-07-10T09:00:00.000Z',
    retryWindowMs: 180000,
    now
  });

  assert.equal(coverage.latestPackage.status, 'incomplete');
  assert.equal(coverage.latestPackage.executedCount, 1);
  assert.equal(coverage.latestPackage.missingCount, 1);
  assert.equal(coverage.summary.incompletePackages, 1);
});
