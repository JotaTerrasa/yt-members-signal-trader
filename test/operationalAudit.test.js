import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateReplicaReferenceCoverage, auditRowBelongsToWindow, buildCloseExecutionAnalysis, buildCloseFailureAttempts, buildEntryExecutionAnalysis, buildExecutionPriceChainAttribution, buildExecutionRouteAnalysis, buildMatchedGapAttribution, buildNetEntryShadowAudit, buildOpeningFailureAttempts, buildReplicaGapBridge, buildUnprocessedCloseSignals, cohortAuditRowHasOrigin, cohortSampleStatus, cohortWindowBounds, commissionEvidence, estimateReplicaEconomics, isRetryableCloseError, monitorHealthFinding, observedCloseKind, referenceCoverageEndTime, replicaStopAlignment, scopeReplicaCohortInputs, summarizeExecutionLatency, summarizeReplicaStops } from '../src/operationalAudit.js';
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
    pendingReference: 0,
    outsideCoverage: 1,
    extras: 1,
    unlinkedCloses: 1,
    otherUnreferenced: 1
  });
  assert.deepEqual(Object.fromEntries(bridge.steps.map((step) => [step.key, step.value])), {
    matched_gap: -3,
    missing_execution: 2,
    sheet_without_result: 0,
    pending_reference: 0,
    outside_coverage: 3,
    extra_execution: -1,
    unlinked_close: -4,
    other_unreferenced: 2,
    fees: -1.5,
    funding: -0.5
  });
  assert.equal(bridge.steps.find((step) => step.key === 'fees').count, null);
});

test('el puente separa los cierres cuyo resultado sigue pendiente en la hoja', () => {
  const bridge = buildReplicaGapBridge({
    rows: [
      { sheet: { status: 'closed' }, replica: { pnl: 10 }, vst: { grossPnl: 7 }, cause: 'Diferencia de ejecución' },
      { sheet: { status: 'open' }, replica: { pnl: null }, vst: { grossPnl: -2 }, cause: 'Resultado pendiente en hoja' },
      { sheet: { status: 'open' }, replica: { pnl: null }, vst: { grossPnl: null }, cause: 'Abierta en ambas' }
    ],
    bingxFees: -1,
    bingxFunding: 0
  });

  assert.equal(bridge.replicaPnl, 10);
  assert.equal(bridge.bingxGross, 5);
  assert.equal(bridge.bingxNet, 4);
  assert.equal(bridge.counts.pendingReference, 2);
  assert.equal(bridge.steps.find((step) => step.key === 'pending_reference').value, -2);
  assert.equal(bridge.residual, 0);
  assert.equal(bridge.reconciled, true);
});

test('descompone el gap emparejado entre entrada, salida, cantidad y evidencia incompleta', () => {
  const attribution = buildMatchedGapAttribution([
    {
      id: 'BTC|1',
      symbol: 'BTC-USDT',
      direction: 'LONG',
      sheet: { entry: 100, exit: 110 },
      replica: { pnl: 2, notional: 10, leverage: 2 },
      vst: { entry: 105, exit: 110, grossPnl: 0.9, closeKind: 'other' }
    },
    {
      id: 'ETH|1',
      symbol: 'ETH-USDT',
      direction: 'SHORT',
      sheet: { entry: 200, exit: 180 },
      replica: { pnl: 2, notional: 10, leverage: 2 },
      vst: { entry: 200, exit: 190, grossPnl: 1.1, closeKind: 'stop' }
    },
    {
      id: 'SOL|1',
      symbol: 'SOL-USDT',
      direction: 'LONG',
      sheet: { entry: 50, exit: 55 },
      replica: { pnl: 1, notional: 10, leverage: 1 },
      vst: { entry: null, exit: null, grossPnl: -1, closeKind: 'other' }
    }
  ]);

  assert.equal(attribution.replicaPnl, 5);
  assert.equal(attribution.bingxGross, 1);
  assert.equal(attribution.gap, -4);
  assert.equal(attribution.residual, 0);
  assert.equal(attribution.reconciled, true);
  assert.deepEqual(attribution.counts, { matched: 3, decomposable: 2, incomplete: 1 });
  assert.deepEqual(Object.fromEntries(attribution.steps.map((step) => [step.key, step.value])), {
    sheet_accounting: 0,
    entry_execution: -1.04761905,
    exit_execution: -1,
    size_and_fills: 0.04761905,
    insufficient_evidence: -2
  });
  assert.equal(attribution.bySymbol[0].key, 'SOL-USDT');
  assert.equal(attribution.byCloseKind.find((group) => group.key === 'stop').gap, -0.9);
  assert.equal(attribution.topRows[0].id, 'BTC|1');
});

test('separa las rutas de salida sin confundir incidencias históricas con ejecución observada', () => {
  const row = (id, vst) => ({
    id,
    symbol: 'BTC-USDT',
    direction: 'LONG',
    sheet: { entry: 100, exit: 110 },
    replica: { pnl: 2, notional: 10, leverage: 2 },
    vst: { entry: 100, exit: 110, openingFee: -0.1, closingFee: -0.1, ...vst },
    trace: vst.trace || {}
  });
  const analysis = buildExecutionRouteAnalysis([
    row('explicit', {
      grossPnl: 2,
      closeKind: 'other',
      closingDetectedAt: '2026-07-20T10:00:00.000Z',
      closeSignalAt: '2026-07-20T10:00:01.000Z',
      trace: { closeSignalEventId: 'close-explicit' }
    }),
    row('stop', { exit: 95, grossPnl: -1, closeKind: 'stop' }),
    row('unprocessed', {
      exit: 95,
      grossPnl: -1,
      closeKind: 'stop',
      unprocessedCloses: [{ category: 'historical_close_typo' }]
    }),
    row('runtime-stop', {
      exit: 95,
      grossPnl: -1,
      closeKind: 'stop',
      closeFailures: [{ category: 'close_guard_runtime_error' }]
    }),
    row('runtime-recovered', {
      exit: 105,
      grossPnl: 1,
      closeKind: 'other',
      closeFailures: [{ category: 'close_guard_runtime_error' }]
    }),
    row('guard-recovered', {
      exit: 105,
      grossPnl: 1,
      closeKind: 'other',
      closeFailures: [{ category: 'close_slippage_guard' }]
    }),
    row('evidence-gap', { grossPnl: 2, closeKind: 'other' }),
    {
      ...row('outside-runtime', {
        exit: 95,
        grossPnl: -1,
        closeKind: 'stop',
        closeFailures: [{ category: 'close_guard_runtime_error' }]
      }),
      sheet: null
    }
  ]);

  assert.equal(analysis.counts.matched, 7);
  assert.equal(analysis.counts.routes, 7);
  assert.equal(analysis.counts.historicalIncidentRows, 3);
  assert.equal(analysis.counts.guardRetryRows, 1);
  assert.equal(analysis.counts.evidenceGapRows, 1);
  assert.equal(analysis.counts.observedClosed, 8);
  assert.equal(analysis.counts.historicalIncidentObservedRows, 4);
  assert.equal(analysis.gap, -11);
  assert.equal(analysis.residual, 0);
  assert.equal(analysis.reconciled, true);
  assert.equal(analysis.families.find((family) => family.key === 'observed_execution').rows, 2);
  assert.equal(analysis.families.find((family) => family.key === 'historical_defect').rows, 3);
  assert.equal(analysis.groups.find((group) => group.key === 'explicit_close').closeLatency.medianSeconds, 1);
  assert.equal(analysis.groups.find((group) => group.key === 'runtime_error_then_stop').closeFailureEvents, 1);
  assert.equal(analysis.groups.find((group) => group.key === 'unprocessed_close_then_stop').unprocessedCloseSignals, 1);
  assert.equal(analysis.observed.groups.find((group) => group.key === 'runtime_error_then_stop').rows, 2);
});

test('reconcilia el gap por tramos entre señal, cotización y fill', () => {
  const attribution = buildExecutionPriceChainAttribution([
    {
      symbol: 'BTC-USDT',
      direction: 'LONG',
      sheet: { entry: 100, exit: 110 },
      replica: { pnl: 2, notional: 10, leverage: 2 },
      vst: {
        signalEntry: 101,
        preOrderMarket: 103,
        entry: 105,
        closeTarget: 109,
        preCloseMarket: 108,
        exit: 107,
        grossPnl: 0.5
      }
    },
    {
      symbol: 'ETH-USDT',
      direction: 'SHORT',
      sheet: { entry: 200, exit: 180 },
      replica: { pnl: 2, notional: 10, leverage: 2 },
      vst: {
        signalEntry: 199,
        preOrderMarket: 198,
        entry: 197,
        closeTarget: null,
        preCloseMarket: null,
        exit: 190,
        grossPnl: 1
      }
    }
  ]);

  const steps = Object.fromEntries(attribution.steps.map((step) => [step.key, step]));
  assert.equal(attribution.replicaPnl, 4);
  assert.equal(attribution.bingxGross, 1.5);
  assert.equal(attribution.gap, -2.5);
  assert.equal(attribution.residual, 0);
  assert.equal(attribution.reconciled, true);
  assert.deepEqual(attribution.counts, {
    matched: 2,
    decomposable: 2,
    incomplete: 0,
    fullEntryPath: 2,
    fullExitPath: 1
  });
  assert.equal(steps.entry_reference.count, 2);
  assert.equal(steps.entry_quote_move.count, 2);
  assert.equal(steps.entry_fill.count, 2);
  assert.equal(steps.exit_target.count, 1);
  assert.equal(steps.exit_quote_move.count, 1);
  assert.equal(steps.exit_fill.count, 1);
  assert.equal(steps.exit_missing_evidence.count, 1);
  assert.equal(
    Math.round(attribution.steps.reduce((sum, step) => sum + step.value, 0) * 1e7) / 1e7,
    attribution.gap
  );
});

test('mide reacción y reintentos sin duplicar un mismo cierre', () => {
  const summary = summarizeExecutionLatency([
    {
      trace: { openingEventId: 'open-1', closeSignalEventId: 'close-1' },
      vst: {
        openingDetectedAt: '2026-07-20T10:00:00.000Z',
        openingFirstAttemptAt: '2026-07-20T10:00:01.000Z',
        openingAt: '2026-07-20T10:00:03.000Z',
        closingDetectedAt: '2026-07-20T11:00:00.000Z',
        closingFirstAttemptAt: '2026-07-20T11:00:00.500Z',
        closeSignalAt: '2026-07-20T11:00:01.000Z'
      }
    },
    {
      trace: { openingEventId: 'open-2', closeSignalEventId: 'close-1' },
      vst: {
        openingDetectedAt: '2026-07-20T12:00:00.000Z',
        openingFirstAttemptAt: '2026-07-20T12:00:00.500Z',
        openingAt: '2026-07-20T12:00:10.000Z',
        closingDetectedAt: '2026-07-20T11:00:00.000Z',
        closingFirstAttemptAt: '2026-07-20T11:00:00.500Z',
        closeSignalAt: '2026-07-20T11:00:01.000Z'
      }
    }
  ]);

  assert.equal(summary.opening.events, 2);
  assert.equal(summary.opening.measured, 2);
  assert.equal(summary.opening.retried, 2);
  assert.equal(summary.opening.delayedAbove5Seconds, 1);
  assert.equal(summary.opening.total.medianSeconds, 3);
  assert.equal(summary.opening.total.maxSeconds, 10);
  assert.equal(summary.closing.events, 1);
  assert.equal(summary.closing.measured, 1);
  assert.equal(summary.closing.total.medianSeconds, 1);
});

test('localiza la desviación de entrada por fase, activo, paquete, microestructura y fill sin duplicar aperturas', () => {
  const row = ({ id, postId, symbol, direction = 'LONG', signal, quote, fill, detectedAt, firstAttemptAt, openingAt, fillAt, telemetry = null }) => ({
    id,
    symbol,
    direction,
    trace: {
      openingEventId: id,
      openingPostId: postId,
      executionKey: `demo|${postId}|${symbol}|${direction}|${signal}|90`
    },
    vst: {
      signalEntry: signal,
      preOrderMarket: quote,
      entry: fill,
      entrySlippagePercent: null,
      openingDetectedAt: detectedAt,
      openingFirstAttemptAt: firstAttemptAt,
      openingAttemptAt: openingAt,
      openingFillAt: fillAt,
      openingAt,
      entryTelemetry: telemetry
    }
  });
  const btc = row({
    id: 'btc-1',
    postId: 'post-a',
    symbol: 'BTC-USDT',
    signal: 100,
    quote: 100.1,
    fill: 100.2,
    detectedAt: '2026-07-20T08:00:00.000Z',
    firstAttemptAt: '2026-07-20T08:00:01.000Z',
    openingAt: '2026-07-20T08:00:01.000Z',
    fillAt: '2026-07-20T08:00:02.000Z',
    telemetry: {
      preOrderMarketRead: { price: 100.1, roundTripMs: 40 },
      topOfBook: {
        available: true,
        bidPrice: 100.09,
        askPrice: 100.11,
        spreadPercent: 0.01998,
        receivedAt: '2026-07-20T08:00:01.425Z',
        exchangeAt: '2026-07-20T08:00:01.450Z',
        ageMs: 75
      },
      packageObservation: {
        startedAt: '2026-07-20T08:00:00.000Z',
        size: 2,
        slot: 1,
        startQuote: { available: true, bidPrice: 99.99, askPrice: 100.01, stale: false }
      },
      orderRequest: { startedAt: '2026-07-20T08:00:01.500Z', roundTripMs: 120 }
    }
  });
  const eth = row({
    id: 'eth-1',
    postId: 'post-a',
    symbol: 'ETH-USDT',
    direction: 'SHORT',
    signal: 100,
    quote: 99.95,
    fill: 99.9,
    detectedAt: '2026-07-20T12:00:00.000Z',
    firstAttemptAt: '2026-07-20T12:00:01.000Z',
    openingAt: '2026-07-20T12:00:01.000Z',
    fillAt: '2026-07-20T12:00:02.000Z',
    telemetry: {
      preOrderMarketRead: { price: 99.95, roundTripMs: 50 },
      topOfBook: {
        available: true,
        bidPrice: 99.94,
        askPrice: 99.96,
        spreadPercent: 0.02001,
        receivedAt: '2026-07-20T12:00:01.375Z',
        exchangeAt: '2026-07-20T12:00:01.300Z',
        ageMs: 125
      },
      packageObservation: {
        startedAt: '2026-07-20T12:00:00.000Z',
        size: 2,
        slot: 2,
        startQuote: { available: true, bidPrice: 100.04, askPrice: 100.06, stale: false }
      },
      orderRequest: { startedAt: '2026-07-20T12:00:01.500Z', roundTripMs: 140 }
    }
  });
  const sol = row({
    id: 'sol-1',
    postId: 'post-b',
    symbol: 'SOL-USDT',
    signal: 100,
    quote: 100.2,
    fill: 100.3,
    detectedAt: '2026-07-20T22:00:00.000Z',
    firstAttemptAt: '2026-07-20T22:00:01.000Z',
    openingAt: '2026-07-20T22:01:01.000Z',
    fillAt: '2026-07-20T22:01:02.000Z'
  });
  const analysis = buildEntryExecutionAnalysis([btc, eth, sol, { ...btc }]);

  assert.equal(analysis.totals.openings, 3);
  assert.equal(analysis.totals.measured, 3);
  assert.equal(analysis.totals.aboveTolerance, 2);
  assert.equal(analysis.byRoute.find((group) => group.key === 'immediate').openings, 2);
  assert.equal(analysis.byRoute.find((group) => group.key === 'retried').openings, 1);
  assert.equal(analysis.byLatency.find((group) => group.key === 'from_30_to_120s').openings, 1);
  assert.equal(analysis.byPackageSlot.find((group) => group.key === 'slot_1').openings, 2);
  assert.equal(analysis.byPackageSlot.find((group) => group.key === 'slot_2').openings, 1);
  assert.equal(analysis.byTimeWindow.find((group) => group.key === 'morning').openings, 1);
  assert.equal(analysis.byTimeWindow.find((group) => group.key === 'night').openings, 1);
  assert.equal(analysis.totals.signalToQuote.measured, 3);
  assert.equal(analysis.totals.quoteToFill.measured, 3);
  assert.equal(analysis.totals.latency.exchangeBacked, 3);
  assert.equal(analysis.totals.latency.attemptToFill.medianSeconds, 1);
  assert.equal(analysis.totals.latency.preparation.measured, 2);
  assert.equal(analysis.totals.microstructure.instrumented, 2);
  assert.equal(analysis.totals.microstructure.topOfBookMeasured, 2);
  assert.equal(analysis.totals.microstructure.spread.measured, 2);
  assert.equal(analysis.totals.microstructure.lastToExecutable.measured, 2);
  assert.equal(analysis.totals.microstructure.executableToFill.measured, 2);
  assert.equal(analysis.totals.microstructure.orderRequestRoundTripMs.average, 130);
  assert.equal(analysis.totals.microstructure.tickerRoundTripMs.average, 45);
  assert.equal(analysis.totals.microstructure.exchangeClock.measured, 2);
  assert.equal(analysis.totals.microstructure.exchangeClock.exchangeToLocalReceiptMs.average, 25);
  assert.equal(analysis.totals.microstructure.exchangeClock.localReceiptToRequestMs.average, 100);
  assert.equal(analysis.totals.microstructure.exchangeClock.exchangeToRequestMs.average, 125);
  assert.equal(analysis.totals.microstructure.exchangeClock.possibleClockSkew, 1);
  assert.equal(analysis.totals.microstructure.packageQueue.startQuoteMeasured, 2);
  assert.equal(analysis.totals.microstructure.packageQueue.executableMove.measured, 2);
  assert.equal(analysis.totals.microstructure.packageQueue.waitMs.average, 1500);
  assert.ok(analysis.totals.microstructure.packageQueue.executableMove.averageAdversePercent > 0.09);
  assert.ok(analysis.totals.microstructure.packageQueue.executableMove.averageAdversePercent < 0.11);
  assert.equal(analysis.byPackageSlot.find((group) => group.key === 'slot_2').microstructure.packageQueue.startQuoteMeasured, 1);
  assert.equal(analysis.timezone, 'Europe/Madrid');
  assert.equal(analysis.exchangeTimestampPrecisionSeconds, 1);
});

test('separa spread y fill en la microestructura prospectiva de los cierres', () => {
  const row = ({ id, symbol, direction, lastPrice, bidPrice, askPrice, fill }) => ({
    id,
    symbol,
    direction,
    trace: { closeSignalEventId: id },
    vst: {
      exit: fill,
      closeTarget: lastPrice,
      closeSignalAt: '2026-07-22T12:00:00.000Z',
      closingAt: '2026-07-22T12:00:02.000Z',
      closeTelemetry: {
        mode: 'observational_only',
        preCloseMarketRead: { price: lastPrice, roundTripMs: 45 },
        topOfBook: {
          available: true,
          bidPrice,
          askPrice,
          spreadPercent: Math.abs(askPrice - bidPrice) / ((askPrice + bidPrice) / 2) * 100,
          receivedAt: '2026-07-22T12:00:00.420Z',
          exchangeAt: '2026-07-22T12:00:00.400Z',
          ageMs: 80,
          stale: false
        },
        orderRequest: {
          startedAt: '2026-07-22T12:00:00.500Z',
          roundTripMs: 150
        }
      }
    }
  });
  const analysis = buildCloseExecutionAnalysis([
    row({ id: 'close-eth', symbol: 'ETH-USDT', direction: 'LONG', lastPrice: 101.05, bidPrice: 101, askPrice: 101.1, fill: 100.9 }),
    row({ id: 'close-btc', symbol: 'BTC-USDT', direction: 'SHORT', lastPrice: 99.05, bidPrice: 98.9, askPrice: 99, fill: 99.2 })
  ]);

  assert.equal(analysis.totals.closes, 2);
  assert.equal(analysis.totals.instrumented, 2);
  assert.equal(analysis.totals.topOfBookMeasured, 2);
  assert.equal(analysis.totals.aboveTolerance, 1);
  assert.equal(analysis.totals.microstructure.spread.measured, 2);
  assert.equal(analysis.totals.microstructure.lastToExecutable.measured, 2);
  assert.equal(analysis.totals.microstructure.executableToFill.measured, 2);
  assert.equal(analysis.totals.microstructure.orderRequestRoundTripMs.average, 150);
  assert.equal(analysis.totals.microstructure.exchangeClock.measured, 2);
  assert.equal(analysis.totals.microstructure.exchangeClock.exchangeToLocalReceiptMs.average, 20);
  assert.equal(analysis.totals.microstructure.exchangeClock.localReceiptToRequestMs.average, 80);
  assert.equal(analysis.totals.microstructure.exchangeClock.exchangeToRequestMs.average, 100);
  assert.equal(analysis.bySymbol.length, 2);
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
  const withinGrace = monitorHealthFinding({
    level: 'warn',
    running: true,
    stale: false,
    noVisiblePosts: true,
    noVisiblePostsSeconds: 120,
    noVisiblePostsGraceSeconds: 900,
    lastError: null
  });
  const graceExpired = monitorHealthFinding({
    level: 'warn',
    running: true,
    stale: false,
    noVisiblePosts: true,
    noVisiblePostsSeconds: 901,
    noVisiblePostsGraceSeconds: 900,
    lastError: null
  });
  const stopped = monitorHealthFinding({ level: 'warn', running: false, stale: true });

  assert.equal(transient.severity, 'warn');
  assert.equal(transient.code, 'monitor_degraded');
  assert.equal(withinGrace, null);
  assert.equal(graceExpired.severity, 'warn');
  assert.equal(graceExpired.code, 'monitor_degraded');
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
