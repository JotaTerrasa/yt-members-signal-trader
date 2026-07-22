import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateReplicaReferenceCoverage, auditRowBelongsToWindow, buildCloseFailureAttempts, buildNetEntryShadowAudit, buildOpeningFailureAttempts, buildReplicaGapBridge, buildUnprocessedCloseSignals, cohortAuditRowHasOrigin, cohortSampleStatus, cohortWindowBounds, commissionEvidence, estimateReplicaEconomics, isRetryableCloseError, monitorHealthFinding, observedCloseKind, referenceCoverageEndTime, replicaStopAlignment, scopeReplicaCohortInputs, summarizeReplicaStops } from '../src/operationalAudit.js';
import { buildSignalCoverage } from '../src/signalCoverage.js';

test('clasifica solo errores temporales de cierre como reintentables', () => {
  assert.equal(isRetryableCloseError('Please try again later.'), true);
  assert.equal(isRetryableCloseError('The system is currently busy, please try again later.'), true);
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

test('acota las fuentes antes de emparejar una cohorte', () => {
  const window = {
    startTime: Date.parse('2026-07-15T07:00:00.000Z'),
    endTime: Date.parse('2026-07-22T07:00:00.000Z')
  };
  const scoped = scopeReplicaCohortInputs({
    sheetRows: [
      { orderNumber: 1, openedAt: '2026-07-14T12:00:00.000Z' },
      { orderNumber: 2, openedAt: '2026-07-15T12:00:00.000Z' }
    ],
    incomeRows: [
      { tradeId: 'old', time: Date.parse('2026-07-14T12:00:00.000Z') },
      { tradeId: 'new', time: Date.parse('2026-07-16T12:00:00.000Z') }
    ],
    events: [
      { eventId: 'old', at: '2026-07-14T12:00:00.000Z' },
      { eventId: 'new', at: '2026-07-16T12:00:00.000Z' }
    ],
    window
  });

  assert.deepEqual(scoped.sheetRows.map((row) => row.orderNumber), [2]);
  assert.deepEqual(scoped.incomeRows.map((row) => row.tradeId), ['new']);
  assert.deepEqual(scoped.events.map((event) => event.eventId), ['new']);
});

test('una cohorte excluye cierres heredados sin apertura propia', () => {
  assert.equal(cohortAuditRowHasOrigin({ sheet: null, vst: { openingAt: null, closingAt: '2026-07-16T12:00:00.000Z' } }), false);
  assert.equal(cohortAuditRowHasOrigin({ sheet: { orderNumber: 2 }, vst: { openingAt: null } }), true);
  assert.equal(cohortAuditRowHasOrigin({ sheet: null, vst: { openingAt: '2026-07-16T10:00:00.000Z' } }), true);
});

test('separa extras reales de operaciones posteriores a la cobertura de la hoja', () => {
  const result = annotateReplicaReferenceCoverage([
    {
      id: 'before',
      cause: 'Extra en VST',
      vst: { openingAt: '2026-07-15T11:00:00.000Z' }
    },
    {
      id: 'same-day',
      cause: 'Extra en VST',
      vst: { openingAt: '2026-07-15T20:00:00.000Z' }
    },
    {
      id: 'after',
      cause: 'Extra en VST',
      vst: { openingAt: '2026-07-17T12:00:00.000Z' }
    }
  ], [{ openedAt: '2026-07-15T12:00:00.000Z' }]);

  assert.equal(result.rows[0].cause, 'Extra en VST');
  assert.equal(result.rows[1].cause, 'Extra en VST');
  assert.equal(result.rows[2].cause, 'Fuera de cobertura de la hoja');
  assert.equal(result.coverage.latestSheetAt, '2026-07-15T12:00:00.000Z');
  assert.equal(result.coverage.coverageThroughAt, '2026-07-15T23:59:59.999Z');
  assert.equal(result.coverage.latestVstAt, '2026-07-17T12:00:00.000Z');
  assert.equal(result.coverage.lagHours, 36.00000028);
  assert.equal(result.coverage.stale, true);
  assert.equal(result.coverage.outsideCoverageRows, 1);
  assert.equal(result.coverage.comparableRows, 2);
});

test('extiende la cobertura de una fecha de hoja hasta el final de ese dia UTC', () => {
  assert.equal(
    referenceCoverageEndTime([{ openedAt: '2026-07-15T12:00:00.000Z' }]),
    Date.parse('2026-07-15T23:59:59.999Z')
  );
});

test('conserva solo el fallo terminal de una apertura que nunca se ejecuto', () => {
  const signal = {
    symbol: 'SOL-USDT',
    direction: 'LONG',
    entry: { price: 75.93 }
  };
  const attempts = buildOpeningFailureAttempts([
    {
      eventId: 'blocked',
      at: '2026-07-14T12:34:00.000Z',
      postId: 'post-missing',
      status: 'blocked',
      reason: 'entry_adverse_deviation_too_high:0.28%>0.15%',
      signal
    },
    {
      eventId: 'expired',
      at: '2026-07-14T12:37:00.000Z',
      postId: 'post-missing',
      status: 'demo_order_retry_expired',
      reason: 'entry_adverse_deviation_too_high:0.36%>0.15%',
      signal
    },
    {
      eventId: 'temporary-block',
      at: '2026-07-14T13:30:00.000Z',
      postId: 'post-recovered',
      status: 'blocked',
      reason: 'exchange_stop_loss_invalid',
      signal
    },
    {
      eventId: 'sent',
      at: '2026-07-14T13:31:00.000Z',
      postId: 'post-recovered',
      status: 'demo_order_sent',
      signal
    }
  ]);

  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].eventId, 'expired');
  assert.equal(attempts[0].category, 'entry_deviation');
});

test('distingue un stop alineado de uno realmente contrario a la hoja', () => {
  assert.equal(replicaStopAlignment({
    closeStatus: 'exchange_stop_closed',
    replicaPnl: -12.53,
    grossPnl: -14.06,
    closeDiffPercent: 0.09
  }), 'aligned');
  assert.equal(replicaStopAlignment({
    closeStatus: 'exchange_stop_closed',
    replicaPnl: 7.31,
    grossPnl: -3.28,
    closeDiffPercent: 1.43
  }), 'divergent');
  assert.equal(replicaStopAlignment({
    closeStatus: 'exchange_stop_closed',
    replicaPnl: -10,
    grossPnl: -12,
    closeDiffPercent: 0.21
  }), 'slippage');
  assert.equal(replicaStopAlignment({
    closeStatus: 'exchange_signal_closed',
    replicaPnl: -10,
    grossPnl: -12,
    closeDiffPercent: 0.05
  }), 'not_stop');
});

test('infiere un stop histórico cuando el cierre genérico coincide con el SL', () => {
  assert.deepEqual(observedCloseKind({
    status: 'exchange_position_closed',
    hasCloseSignal: false,
    direction: 'LONG',
    stopLoss: 1860,
    closePrice: 1860,
    grossPnl: -13.8
  }), { kind: 'stop', source: 'price_and_pnl' });

  assert.deepEqual(observedCloseKind({
    status: 'exchange_position_closed',
    hasCloseSignal: true,
    direction: 'LONG',
    stopLoss: 1860,
    closePrice: 1860,
    grossPnl: -13.8
  }), { kind: 'other', source: 'exchange_position_closed' });
});

test('el puente contable reconcilia réplica, incidencias, costes y neto BingX', () => {
  const bridge = buildReplicaGapBridge({
    rows: [
      { sheet: {}, replica: { pnl: 10 }, vst: { grossPnl: 7 }, cause: 'Diferencia de ejecución' },
      { sheet: {}, replica: { pnl: -2 }, vst: { grossPnl: null }, cause: 'No ejecutada en VST' },
      { sheet: null, replica: { pnl: null }, vst: { grossPnl: 3 }, cause: 'Fuera de cobertura de la hoja' },
      { sheet: null, replica: { pnl: null }, vst: { grossPnl: -1 }, cause: 'Extra en VST' },
      { sheet: null, replica: { pnl: null }, vst: { grossPnl: -4 }, cause: 'Cierre sin apertura enlazada' },
      { sheet: null, replica: { pnl: null }, vst: { grossPnl: 2 }, cause: 'Sin clasificar' }
    ],
    bingxFees: -1.5,
    bingxFunding: -0.5
  });

  assert.equal(bridge.replicaPnl, 8);
  assert.equal(bridge.bingxGross, 7);
  assert.equal(bridge.bingxNet, 5);
  assert.equal(bridge.residual, 0);
  assert.equal(bridge.reconciled, true);
  assert.deepEqual(bridge.counts, {
    sheet: 2,
    matched: 1,
    missingExecution: 1,
    sheetWithoutResult: 0,
    outsideCoverage: 1,
    extras: 1,
    unlinkedCloses: 1,
    otherUnreferenced: 1
  });
  assert.deepEqual(Object.fromEntries(bridge.steps.map((step) => [step.key, step.value])), {
    matched_gap: -3,
    missing_execution: 2,
    sheet_without_result: 0,
    outside_coverage: 3,
    extra_execution: -1,
    unlinked_close: -4,
    other_unreferenced: 2,
    fees: -1.5,
    funding: -0.5
  });
  assert.equal(bridge.steps.find((step) => step.key === 'fees').count, null);
});

test('resume solo los stops comparables y separa los que no tienen hoja', () => {
  const summary = summarizeReplicaStops([
    { vst: { stopAlignment: 'aligned', aggregatedOpenings: 1 } },
    { vst: { stopAlignment: 'divergent', aggregatedOpenings: 3, closeFailures: [{ category: 'close_guard_runtime_error' }] } },
    { vst: { stopAlignment: 'divergent', aggregatedOpenings: 1, unprocessedCloses: [{ category: 'historical_close_typo' }] } },
    { vst: { stopAlignment: 'unknown', aggregatedOpenings: 1 } },
    { vst: { stopAlignment: 'not_stop', aggregatedOpenings: 1 } }
  ]);

  assert.deepEqual(summary, {
    observed: 4,
    total: 3,
    aligned: 1,
    divergent: 2,
    slippage: 0,
    unknown: 1,
    closeFailureDivergent: 1,
    runtimeGuardFailureDivergent: 1,
    unprocessedCloseDivergent: 1,
    aggregatedDivergent: 1
  });
});

test('extrae el fallo histórico de una señal de cierre demo', () => {
  const failures = buildCloseFailureAttempts([
    {
      eventId: 'btc-close-error',
      at: '2026-07-11T17:47:15.558Z',
      status: 'error',
      executionMode: 'demo',
      reason: 'CLOSE_GUARD_MIN_NET_PNL is not defined',
      signal: { action: 'CLOSE', symbol: 'BTC-USDT' }
    },
    {
      eventId: 'btc-open',
      at: '2026-07-11T16:18:46.805Z',
      status: 'demo_order_sent',
      signal: { symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 64141 } }
    }
  ]);

  assert.equal(failures.length, 1);
  assert.equal(failures[0].eventId, 'btc-close-error');
  assert.equal(failures[0].category, 'close_guard_runtime_error');
});

test('detecta un cierre parseable guardado sin evento de ejecución', () => {
  const signals = [
    { isSignal: true, action: 'CLOSE', symbol: 'BTC-USDT', closePrice: 63170 },
    { isSignal: true, action: 'CLOSE', symbol: 'ETH-USDT', closePrice: 1790 },
    { isSignal: true, action: 'CLOSE', symbol: 'SOL-USDT', closePrice: 81.92 }
  ];
  const closes = buildUnprocessedCloseSignals({
    posts: [{
      id: 'missed-close',
      url: 'https://www.youtube.com/post/missed-close',
      firstSeenAt: '2026-07-05T21:58:25.879Z',
      text: 'CUERRE TOTAL\nBTC 63170\nETH 1790\nSOL 81.92'
    }],
    events: [{
      postId: 'missed-close',
      signal: { action: 'CLOSE', symbol: 'BTC-USDT' }
    }],
    parseSignals: () => signals,
    startTime: Date.parse('2026-07-01T00:00:00Z'),
    endTime: Date.parse('2026-08-01T00:00:00Z')
  });

  assert.deepEqual(closes.map((close) => close.signal.symbol), ['ETH-USDT', 'SOL-USDT']);
  assert.ok(closes.every((close) => close.category === 'historical_close_typo'));
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
