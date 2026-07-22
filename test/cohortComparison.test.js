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
  closeP95 = 2
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
