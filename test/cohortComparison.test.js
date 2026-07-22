import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCohortComparison } from '../src/cohortComparison.js';

function cohort({
  startedAt,
  endedAt = null,
  closes = 40,
  matched = closes,
  historicalIncidents = 0,
  rowNet = 1,
  net = rowNet * closes,
  gross = net,
  fees = 0,
  funding = 0,
  entryAbove = 10,
  entryAverage = 0.1,
  closeAbove = 8,
  closeAverage = 0.08,
  closeP95 = 2,
  entryExecutionAnalysis = null
}) {
  return {
    startedAt,
    endedAt,
    sampleStatus: { key: closes >= 100 ? 'contrastable' : 'preliminary' },
    rows: Array.from({ length: closes }, (_, index) => ({
      id: `row-${startedAt}-${index}`,
      vst: { grossPnl: rowNet, openingFee: 0, closingFee: 0, funding: 0 }
    })),
    summary: {
      vstCloses: closes,
      bingxGross: gross,
      bingxFees: fees,
      bingxFunding: funding,
      bingxNet: net,
      fillQuality: {
        entryMeasured: closes,
        entryAboveTolerance: entryAbove,
        entryAverageAdversePercent: entryAverage,
        closeMeasured: closes,
        closeAboveTolerance: closeAbove,
        closeAverageAdversePercent: closeAverage
      },
      executionLatency: {
        closing: { total: { p95Seconds: closeP95 } }
      },
      entryExecutionAnalysis,
      executionRouteAnalysis: {
        gap: -matched,
        counts: {
          matched,
          observedClosed: closes,
          historicalIncidentObservedRows: historicalIncidents,
          guardRetryObservedRows: 0,
          evidenceGapObservedRows: 0
        }
      },
      executionPriceChain: {
        entryImpact: -matched * 0.5,
        exitImpact: -matched * 0.5
      },
      orderHistoryEvidence: {
        closedRows: closes,
        exactCloseRows: closes,
        unlinkedCloseRows: 0
      }
    }
  };
}

test('contrasta dos cohortes sin confundir mejora técnica con cobertura de referencia', () => {
  const previous = cohort({
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: '2026-07-10T00:00:00.000Z',
    historicalIncidents: 4,
    rowNet: 1,
    closeAverage: 0.18,
    closeP95: 4
  });
  const current = cohort({
    startedAt: '2026-07-10T00:00:00.000Z',
    historicalIncidents: 0,
    rowNet: 2,
    net: 80,
    gross: 80,
    closeAverage: 0.09,
    closeP95: 2
  });
  const comparison = buildCohortComparison({ current, previous });

  assert.equal(comparison.status.key, 'preliminary');
  assert.equal(comparison.previous.closes, 40);
  assert.equal(comparison.current.closes, 40);
  assert.equal(comparison.metrics.find((metric) => metric.key === 'historical_incident_rate').assessment, 'improved');
  assert.equal(comparison.metrics.find((metric) => metric.key === 'close_adverse_average').assessment, 'improved');
  assert.equal(comparison.statistics.conclusion, 'improved');
  assert.equal(comparison.statistics.meanDifference, 1);
  assert.equal(comparison.statistics.ci95Low, 1);
  assert.equal(comparison.statistics.ci95High, 1);
  assert.equal(comparison.overall.key, 'positive');
});

test('marca como parcial una comparación cuya hoja solo cubre una fracción de la cohorte', () => {
  const previous = cohort({
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: '2026-07-10T00:00:00.000Z',
    rowNet: 1
  });
  const current = cohort({
    startedAt: '2026-07-10T00:00:00.000Z',
    matched: 8,
    rowNet: 1
  });
  const comparison = buildCohortComparison({ current, previous });

  assert.equal(comparison.status.key, 'partial_reference');
  assert.equal(comparison.current.referenceCoveragePercent, 20);
  assert.equal(comparison.metrics.find((metric) => metric.key === 'reference_coverage').assessment, 'partial');
  assert.equal(comparison.metrics.find((metric) => metric.key === 'matched_gap_per_operation').assessment, 'partial');
  assert.equal(comparison.statistics.conclusion, 'inconclusive');
  assert.equal(comparison.overall.key, 'inconclusive');
});

test('distingue un empeoramiento económico respaldado de un resultado inconcluso', () => {
  const previous = cohort({
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: '2026-07-10T00:00:00.000Z',
    rowNet: 2,
    net: 80,
    gross: 80
  });
  const current = cohort({
    startedAt: '2026-07-10T00:00:00.000Z',
    rowNet: -2,
    net: -80,
    gross: -80
  });
  const comparison = buildCohortComparison({ current, previous });

  assert.equal(comparison.statistics.conclusion, 'worse');
  assert.equal(comparison.overall.key, 'negative');
  assert.equal(comparison.overall.label, 'Empeoramiento económico respaldado');
});

test('no construye un contraste sin una cohorte anterior completa', () => {
  assert.equal(buildCohortComparison({ current: cohort({ startedAt: '2026-07-10T00:00:00.000Z' }) }), null);
});

test('explica dónde se concentra el deterioro de entrada sin culpar automáticamente a los reintentos', () => {
  const analysis = ({ signalStage, fillStage, symbols, routes, slots, openings, above, reaction, attemptToFill, microstructure = null }) => ({
    tolerancePercent: 0.15,
    timezone: 'Europe/Madrid',
    totals: {
      openings,
      measured: openings,
      aboveTolerance: above,
      signalToQuote: { measured: openings, averageAdversePercent: signalStage, averageSignedPercent: signalStage },
      quoteToFill: { measured: openings, averageAdversePercent: fillStage, averageSignedPercent: fillStage },
      latency: {
        exchangeBacked: openings,
        p95Seconds: reaction + attemptToFill,
        reaction: { averageSeconds: reaction },
        attemptToFill: { averageSeconds: attemptToFill }
      },
      microstructure
    },
    bySymbol: symbols,
    byRoute: routes,
    byLatency: [],
    byTimeWindow: [],
    byPackageSlot: slots
  });
  const previousAnalysis = analysis({
    signalStage: 0.05,
    fillStage: 0.04,
    openings: 8,
    above: 2,
    reaction: 1,
    attemptToFill: 2,
    symbols: [
      { key: 'SOL-USDT', label: 'SOL-USDT', openings: 4, measured: 4, averageAdversePercent: 0.1, aboveTolerancePercent: 25, latency: {} },
      { key: 'BTC-USDT', label: 'BTC-USDT', openings: 4, measured: 4, averageAdversePercent: 0.05, aboveTolerancePercent: 25, latency: {} }
    ],
    routes: [
      { key: 'immediate', label: 'Sin espera de reintento', openings: 6, measured: 6, aboveTolerance: 1, aboveTolerancePercent: 16.67, averageAdversePercent: 0.06, latency: {} },
      { key: 'retried', label: 'Con espera de reintento', openings: 2, measured: 2, aboveTolerance: 1, aboveTolerancePercent: 50, averageAdversePercent: 0.15, latency: {} }
    ],
    slots: [
      { key: 'slot_1', label: 'Primera del paquete', openings: 4, measured: 4, aboveTolerance: 1, aboveTolerancePercent: 25, averageAdversePercent: 0.1, latency: { reaction: { averageSeconds: 0.1 }, attemptToFill: { averageSeconds: 2 } } },
      { key: 'slot_2', label: 'Segunda del paquete', openings: 4, measured: 4, aboveTolerance: 1, aboveTolerancePercent: 25, averageAdversePercent: 0.1, latency: { reaction: { averageSeconds: 2 }, attemptToFill: { averageSeconds: 2 } } }
    ]
  });
  const currentAnalysis = analysis({
    signalStage: 0.2,
    fillStage: 0.04,
    openings: 8,
    above: 5,
    reaction: 1.5,
    attemptToFill: 2.1,
    microstructure: {
      instrumented: 3,
      topOfBookMeasured: 3,
      spread: { measured: 3, averagePercent: 0.02 },
      lastToExecutable: { measured: 3, averageAdversePercent: 0.01 },
      executableToFill: { measured: 3, averageAdversePercent: 0.03 },
      orderRequestRoundTripMs: { count: 3, average: 180 }
    },
    symbols: [
      { key: 'SOL-USDT', label: 'SOL-USDT', openings: 4, measured: 4, averageAdversePercent: 0.25, aboveTolerancePercent: 100, latency: {} },
      { key: 'BTC-USDT', label: 'BTC-USDT', openings: 4, measured: 4, averageAdversePercent: 0.04, aboveTolerancePercent: 25, latency: {} }
    ],
    routes: [
      { key: 'immediate', label: 'Sin espera de reintento', openings: 7, measured: 7, aboveTolerance: 4, aboveTolerancePercent: 57.14, averageAdversePercent: 0.15, latency: {} },
      { key: 'retried', label: 'Con espera de reintento', openings: 1, measured: 1, aboveTolerance: 1, aboveTolerancePercent: 100, averageAdversePercent: 0.3, latency: {} }
    ],
    slots: [
      { key: 'slot_1', label: 'Primera del paquete', openings: 3, measured: 3, aboveTolerance: 0, aboveTolerancePercent: 0, averageAdversePercent: 0.1, latency: { reaction: { averageSeconds: 0.1 }, attemptToFill: { averageSeconds: 2.1 } } },
      { key: 'slot_2', label: 'Segunda del paquete', openings: 5, measured: 5, aboveTolerance: 5, aboveTolerancePercent: 100, averageAdversePercent: 0.2, latency: { reaction: { averageSeconds: 2.2 }, attemptToFill: { averageSeconds: 2.1 } } }
    ]
  });
  const comparison = buildCohortComparison({
    previous: cohort({
      startedAt: '2026-07-01T00:00:00.000Z',
      endedAt: '2026-07-10T00:00:00.000Z',
      entryExecutionAnalysis: previousAnalysis
    }),
    current: cohort({
      startedAt: '2026-07-10T00:00:00.000Z',
      entryExecutionAnalysis: currentAnalysis
    })
  });

  assert.equal(comparison.entryDiagnosis.summary.key, 'signalToQuote');
  assert.equal(comparison.entryDiagnosis.summary.dominantSymbol, 'SOL-USDT');
  assert.equal(comparison.entryDiagnosis.summary.comparableDeteriorationSymbol, 'SOL-USDT');
  assert.equal(comparison.entryDiagnosis.summary.immediateAboveTolerance, 4);
  assert.equal(comparison.entryDiagnosis.summary.retriedAboveTolerance, 1);
  assert.equal(comparison.entryDiagnosis.stages.find((stage) => stage.key === 'signalToQuote').assessment, 'worse');
  assert.equal(comparison.entryDiagnosis.bySymbol.find((group) => group.key === 'SOL-USDT').assessment, 'worse');
  assert.equal(comparison.entryDiagnosis.byRoute.find((group) => group.key === 'retried').assessment, 'insufficient');
  assert.equal(comparison.entryDiagnosis.byPackageSlot.find((group) => group.key === 'slot_2').assessment, 'worse');
  assert.equal(comparison.entryDiagnosis.summary.packagePattern.firstOpenings, 3);
  assert.equal(comparison.entryDiagnosis.summary.packagePattern.laterOpenings, 5);
  assert.equal(comparison.entryDiagnosis.mixAnalysis.byPackageSlot.observedDelta, 0.0625);
  assert.equal(comparison.entryDiagnosis.mixAnalysis.byPackageSlot.compositionSharePercent, 10);
  assert.equal(comparison.entryDiagnosis.timing.attemptToFillAverageSeconds.current, 2.1);
  assert.equal(comparison.entryDiagnosis.prospectiveMicrostructure.topOfBookMeasured, 3);
  assert.equal(comparison.entryDiagnosis.prospectiveMicrostructure.orderRequestRoundTripMs.average, 180);
});
