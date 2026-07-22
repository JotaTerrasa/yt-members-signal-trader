import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRowBelongsToWindow, buildNetEntryShadowAudit, cohortSampleStatus, cohortWindowBounds, commissionEvidence, estimateReplicaEconomics, isRetryableCloseError, monitorHealthFinding } from '../src/operationalAudit.js';
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

test('estima la réplica neta con entrada y cierre taker sin inventar devoluciones', () => {
  const economics = estimateReplicaEconomics({
    rows: [{
      sheet: { pnl: 100 },
      replica: { pnl: 12, notional: 45, leverage: 25 }
    }],
    takerCommissionRate: 0.0005,
    makerCommissionRate: 0.0002
  });

  assert.equal(economics.marketFees, -1.125);
  assert.equal(economics.marketNet, 10.875);
  assert.equal(economics.makerEntryFees, -0.7875);
  assert.equal(economics.makerEntryNet, 11.2125);
});

test('una cohorte activa sin fecha final permanece abierta hasta el fin del periodo', () => {
  const window = cohortWindowBounds({
    startedAt: '2026-07-10T08:00:00.000Z',
    monthWindow: {
      startTime: Date.parse('2026-07-01T00:00:00.000Z'),
      endTime: Date.parse('2026-08-01T00:00:00.000Z')
    }
  });

  assert.equal(window.startTime, Date.parse('2026-07-10T08:00:00.000Z'));
  assert.equal(window.endTime, Date.parse('2026-08-01T00:00:00.000Z'));
});

test('un cierre de una posición abierta antes de la cohorte no contamina la cohorte nueva', () => {
  const window = {
    startTime: Date.parse('2026-07-15T08:00:00.000Z'),
    endTime: Date.parse('2026-08-01T00:00:00.000Z')
  };
  const carryIn = {
    vst: {
      openingAt: '2026-07-14T15:00:00.000Z',
      closingAt: '2026-07-16T10:00:00.000Z'
    }
  };
  const newOpening = {
    vst: {
      openingAt: '2026-07-16T09:00:00.000Z',
      closingAt: '2026-07-16T10:00:00.000Z'
    }
  };

  assert.equal(auditRowBelongsToWindow(carryIn, window), false);
  assert.equal(auditRowBelongsToWindow(newOpening, window), true);
});

test('una lectura vacía aislada no se confunde con un monitor caído', () => {
  const transient = monitorHealthFinding({ level: 'warn', running: true, stale: false });
  const stopped = monitorHealthFinding({ level: 'warn', running: false, stale: true });

  assert.equal(transient.severity, 'warn');
  assert.equal(transient.code, 'monitor_degraded');
  assert.equal(stopped.severity, 'critical');
  assert.equal(stopped.code, 'monitor_unhealthy');
  assert.equal(monitorHealthFinding({ level: 'ok', running: true, stale: false }), null);
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

test('mide el resultado del filtro neto en sombra sin activar bloqueos', () => {
  const events = [{
    at: '2026-07-21T09:42:32.000Z',
    status: 'demo_order_sent',
    signal: { symbol: 'BTC-USDT', direction: 'LONG' },
    netEntryFilter: {
      enabled: true,
      mode: 'shadow',
      decision: 'avoid_shadow',
      reason: 'net_entry_filter:break_even_margin:5>3',
      leverage: 25,
      estimatedRoundTripCost: 1.125
    },
    costGuard: { feeRate: 0.0005 }
  }, {
    at: '2026-07-21T10:00:00.000Z',
    status: 'exchange_signal_closed',
    signal: { symbol: 'BTC-USDT', direction: 'LONG' },
    exchangePosition: {
      id: 'btc-position',
      symbol: 'BTC-USDT',
      openedAt: '2026-07-21T09:42:35.000Z',
      paperPnl: 9.125
    }
  }];

  const audit = buildNetEntryShadowAudit({
    events,
    config: {
      netEntryFilterEnabled: true,
      netEntryFilterMode: 'shadow',
      netEntryFilterMaxBreakEvenMarginPercent: 3,
      costGuardFeeBuffer: 2
    }
  });

  assert.equal(audit.sample, 1);
  assert.equal(audit.flagged, 1);
  assert.equal(audit.closedFlagged, 1);
  assert.equal(audit.estimatedGrossFlagged, 9.125);
  assert.equal(audit.estimatedNetFlagged, 8);
  assert.equal(audit.inherentBreakEvenMarginPercent, 5);
  assert.equal(audit.nonDiscriminatingBreakEven, true);
  assert.equal(audit.recommendation.key, 'review_threshold');
});

test('enlaza la misma apertura cuando Telegram la ejecuta antes que YouTube', () => {
  const now = Date.parse('2026-07-10T10:01:00.000Z');
  const posts = [{
    id: 'youtube-package',
    url: 'https://www.youtube.com/post/youtube-package',
    firstSeenAt: '2026-07-10T10:00:00.000Z',
    text: 'LONG BTC 60000\nSTOP BTC 59000'
  }];
  const signal = { isSignal: true, symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 60000 }, stopLoss: 59000 };
  const coverage = buildSignalCoverage({
    posts,
    events: [{
      eventId: 'telegram-execution',
      at: '2026-07-10T09:59:58.000Z',
      postId: 'telegram-message',
      executionMode: 'demo',
      status: 'demo_order_sent',
      signal
    }, {
      at: '2026-07-10T10:00:01.000Z',
      postId: 'youtube-package',
      status: 'skipped',
      reason: 'duplicate_open_signal',
      duplicateOf: 'telegram-execution',
      signal
    }],
    parseSignals: () => [signal],
    mode: 'demo',
    since: '2026-07-10T09:00:00.000Z',
    retryWindowMs: 180000,
    now
  });

  assert.equal(coverage.latestPackage.status, 'complete');
  assert.equal(coverage.latestPackage.signals[0].linkedExecution, true);
  assert.equal(coverage.latestPackage.signals[0].linkedEventId, 'telegram-execution');
});

test('conserva el motivo de un error demo histórico aunque no tenga executionMode', () => {
  const now = Date.parse('2026-07-10T10:05:00.000Z');
  const signal = { isSignal: true, symbol: 'SOL-USDT', direction: 'LONG', entry: { price: 80 }, stopLoss: 79 };
  const coverage = buildSignalCoverage({
    posts: [{
      id: 'package-error',
      url: 'https://www.youtube.com/post/package-error',
      firstSeenAt: '2026-07-10T10:00:00.000Z',
      text: 'LONG SOL 80\nSTOP SOL 79'
    }],
    events: [{
      at: '2026-07-10T10:00:01.000Z',
      postId: 'package-error',
      status: 'error',
      reason: 'No hay VST disponible suficiente',
      auditSnapshot: { mode: 'demo' },
      signal
    }],
    parseSignals: () => [signal],
    mode: 'demo',
    since: '2026-07-10T09:00:00.000Z',
    retryWindowMs: 180000,
    now
  });

  assert.equal(coverage.latestPackage.status, 'incomplete');
  assert.equal(coverage.latestPackage.signals[0].reason, 'No hay VST disponible suficiente');
});
