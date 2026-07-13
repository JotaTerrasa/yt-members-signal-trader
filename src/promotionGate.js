const DEFAULT_MIN_PACKAGES = 50;
const DEFAULT_MIN_COVERAGE_PERCENT = 99;

export function buildPromotionGate({
  coverage = null,
  exchangeSafety = null,
  openingRetries = [],
  closeRetries = [],
  economics = null,
  minPackages = DEFAULT_MIN_PACKAGES,
  minCoveragePercent = DEFAULT_MIN_COVERAGE_PERCENT
} = {}) {
  const summary = coverage?.summary || {};
  const packages = nonNegative(summary.packages);
  const completePackages = nonNegative(summary.completePackages);
  const expectedOpenings = nonNegative(summary.expectedOpenings);
  const executedOpenings = nonNegative(summary.executedOpenings);
  const missingOpenings = nonNegative(summary.missingOpenings);
  const pendingOpenings = nonNegative(summary.pendingOpenings);
  const parseFailures = nonNegative(summary.parseFailures);
  const coveragePercent = ratioPercent(executedOpenings, expectedOpenings);
  const completePercent = ratioPercent(completePackages, packages);
  const safety = exchangeSafety || {};
  const demo = safety.demo || {};
  const real = safety.real || {};
  const missingStops = nonNegative(demo.missingStopLoss) + nonNegative(real.missingStopLoss);
  const orphanOrders = nonNegative(demo.orphanOrders) + nonNegative(real.orphanOrders);
  const retries = (openingRetries?.length || 0) + (closeRetries?.length || 0);
  const economicNet = Number(economics?.netPnl);
  const economicClosedTrades = Number(economics?.closedTrades);
  const economicsAvailable = Number.isFinite(economicNet) && Number.isFinite(economicClosedTrades) && economicClosedTrades > 0;

  const criteria = [
    criterion('sample', 'Muestra de paquetes', packages >= minPackages, `${packages}/${minPackages}`, 'sample'),
    criterion('opening-coverage', 'Cobertura de aperturas', expectedOpenings > 0 && coveragePercent >= minCoveragePercent, `${formatPercent(coveragePercent)} / ${formatPercent(minCoveragePercent)}`, 'reliability'),
    criterion('complete-packages', 'Paquetes completos', packages > 0 && completePercent >= minCoveragePercent, `${formatPercent(completePercent)} / ${formatPercent(minCoveragePercent)}`, 'reliability'),
    criterion('parse-failures', 'Fallos de parser', parseFailures === 0, String(parseFailures), 'reliability'),
    criterion('missing-openings', 'Aperturas perdidas', missingOpenings === 0, String(missingOpenings), 'reliability'),
    criterion('pending-openings', 'Aperturas pendientes', pendingOpenings === 0, String(pendingOpenings), 'transient'),
    criterion('retry-queue', 'Reintentos pendientes', retries === 0, String(retries), 'transient'),
    {
      ...criterion(
        'net-after-costs',
        'Neto tras costes',
        economicsAvailable && economicNet > 0,
        economicsAvailable ? `${formatNumber(economicNet)} en ${economicClosedTrades} cierres` : 'sin evidencia calculada',
        'economics'
      ),
      available: economicsAvailable
    },
    criterion('exchange-sync', 'Reconciliacion BingX', !safety.enabled || (!safety.stale && safety.level !== 'warn'), safety.enabled ? (safety.stale ? 'desactualizada' : safety.level || 'sin dato') : 'no aplica', 'safety'),
    criterion('stop-protection', 'Posiciones sin SL', missingStops === 0, String(missingStops), 'safety'),
    criterion('orphan-orders', 'Ordenes protectoras huerfanas', orphanOrders === 0, String(orphanOrders), 'safety')
  ];

  const hardFailures = criteria.filter((item) => (
    item.group !== 'sample'
    && item.group !== 'transient'
    && item.group !== 'economics'
    && !item.ok
  ) || (item.group === 'economics' && item.available && !item.ok));
  const waiting = criteria.filter((item) => (
    item.group === 'transient' && !item.ok
  ) || (item.group === 'economics' && !item.available));
  const sampleReady = criteria.find((item) => item.key === 'sample')?.ok === true;
  const eligibleForReview = sampleReady && hardFailures.length === 0 && waiting.length === 0;
  const status = eligibleForReview
    ? 'eligible_for_review'
    : hardFailures.length
      ? 'blocked'
      : 'collecting';

  return {
    generatedAt: new Date().toISOString(),
    status,
    label: {
      eligible_for_review: 'Apta para revision humana',
      blocked: 'Bloqueada por fiabilidad',
      collecting: 'Recogiendo muestra'
    }[status],
    eligibleForReview,
    automaticLivePromotion: false,
    explicitLiveConfirmationRequired: true,
    thresholds: {
      minPackages,
      minCoveragePercent
    },
    metrics: {
      packages,
      completePackages,
      completePercent,
      expectedOpenings,
      executedOpenings,
      coveragePercent,
      missingOpenings,
      pendingOpenings,
      parseFailures,
      retries,
      missingStops,
      orphanOrders,
      economicNet: economicsAvailable ? economicNet : null,
      economicClosedTrades: economicsAvailable ? economicClosedTrades : 0
    },
    criteria
  };
}

function criterion(key, label, ok, detail, group) {
  return { key, label, ok: Boolean(ok), detail, group };
}

function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function ratioPercent(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-ES', { maximumFractionDigits: 4 });
}
