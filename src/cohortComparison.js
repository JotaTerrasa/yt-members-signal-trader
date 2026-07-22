const bootstrapIterations = 4000;

export function buildCohortComparison({ current = null, previous = null } = {}) {
  if (!current?.summary || !previous?.summary) {
    return null;
  }

  const currentPeriod = cohortPeriodSnapshot(current);
  const previousPeriod = cohortPeriodSnapshot(previous);
  const referenceIsPartial = currentPeriod.matched < 30
    || currentPeriod.referenceCoveragePercent < 80;
  const metrics = [
    comparisonMetric({
      key: 'historical_incident_rate',
      label: 'Incidencias técnicas',
      description: 'Operaciones con parser o guard histórico por cada 100 cierres observados.',
      scope: 'reliability',
      unit: 'percent',
      previous: rate(previousPeriod.historicalIncidents, previousPeriod.observedClosed),
      current: rate(currentPeriod.historicalIncidents, currentPeriod.observedClosed),
      direction: 'lower',
      tolerance: 1
    }),
    comparisonMetric({
      key: 'exact_fill_coverage',
      label: 'Cobertura de precios exactos',
      description: 'Ciclos cerrados reconstruidos con el precio medio ejecutado del histórico de BingX.',
      scope: 'reliability',
      unit: 'percent',
      previous: previousPeriod.exactFillCoveragePercent,
      current: currentPeriod.exactFillCoveragePercent,
      direction: 'higher',
      tolerance: 0.5
    }),
    comparisonMetric({
      key: 'entry_above_tolerance_rate',
      label: 'Entradas sobre 0,15%',
      description: 'Proporción de entradas con desviación adversa superior al umbral.',
      scope: 'entry',
      unit: 'percent',
      previous: rate(previous.summary.fillQuality?.entryAboveTolerance, previous.summary.fillQuality?.entryMeasured),
      current: rate(current.summary.fillQuality?.entryAboveTolerance, current.summary.fillQuality?.entryMeasured),
      direction: 'lower',
      tolerance: 1
    }),
    comparisonMetric({
      key: 'entry_adverse_average',
      label: 'Desviación media de entrada',
      description: 'Desviación adversa media entre la señal y el fill.',
      scope: 'entry',
      unit: 'percent',
      previous: previous.summary.fillQuality?.entryAverageAdversePercent,
      current: current.summary.fillQuality?.entryAverageAdversePercent,
      direction: 'lower',
      tolerance: 0.005
    }),
    comparisonMetric({
      key: 'close_above_tolerance_rate',
      label: 'Cierres sobre 0,15%',
      description: 'Proporción de cierres medidos con desviación adversa superior al umbral.',
      scope: 'closing',
      unit: 'percent',
      previous: rate(previous.summary.fillQuality?.closeAboveTolerance, previous.summary.fillQuality?.closeMeasured),
      current: rate(current.summary.fillQuality?.closeAboveTolerance, current.summary.fillQuality?.closeMeasured),
      direction: 'lower',
      tolerance: 1
    }),
    comparisonMetric({
      key: 'close_adverse_average',
      label: 'Desviación media de cierre',
      description: 'Desviación adversa media entre el objetivo conocido y el fill.',
      scope: 'closing',
      unit: 'percent',
      previous: previous.summary.fillQuality?.closeAverageAdversePercent,
      current: current.summary.fillQuality?.closeAverageAdversePercent,
      direction: 'lower',
      tolerance: 0.005
    }),
    comparisonMetric({
      key: 'close_latency_p95',
      label: 'Latencia de cierre p95',
      description: 'Tiempo total del 95% de los cierres por señal.',
      scope: 'closing',
      unit: 'seconds',
      previous: previous.summary.executionLatency?.closing?.total?.p95Seconds,
      current: current.summary.executionLatency?.closing?.total?.p95Seconds,
      direction: 'lower',
      tolerance: 0.25
    }),
    comparisonMetric({
      key: 'cost_per_close',
      label: 'Coste por cierre',
      description: 'Valor absoluto de comisiones y funding dividido entre cierres.',
      scope: 'economics',
      unit: 'vst_per_close',
      previous: perClose(Math.abs(Number(previous.summary.bingxFees || 0) + Number(previous.summary.bingxFunding || 0)), previousPeriod.closes),
      current: perClose(Math.abs(Number(current.summary.bingxFees || 0) + Number(current.summary.bingxFunding || 0)), currentPeriod.closes),
      direction: 'lower',
      tolerance: 0.02
    }),
    comparisonMetric({
      key: 'gross_per_close',
      label: 'Bruto por cierre',
      description: 'PnL bruto de BingX dividido entre cierres.',
      scope: 'economics',
      unit: 'vst_per_close',
      previous: perClose(previous.summary.bingxGross, previousPeriod.closes),
      current: perClose(current.summary.bingxGross, currentPeriod.closes),
      direction: 'higher',
      tolerance: 0.05
    }),
    comparisonMetric({
      key: 'net_per_close',
      label: 'Neto por cierre',
      description: 'PnL después de comisiones y funding dividido entre cierres.',
      scope: 'economics',
      unit: 'vst_per_close',
      previous: perClose(previous.summary.bingxNet, previousPeriod.closes),
      current: perClose(current.summary.bingxNet, currentPeriod.closes),
      direction: 'higher',
      tolerance: 0.05
    }),
    comparisonMetric({
      key: 'reference_coverage',
      label: 'Cobertura de la hoja',
      description: 'Operaciones emparejadas respecto a todos los cierres observados.',
      scope: 'alignment',
      unit: 'percent',
      previous: previousPeriod.referenceCoveragePercent,
      current: currentPeriod.referenceCoveragePercent,
      direction: 'higher',
      tolerance: 5,
      quality: referenceIsPartial ? 'partial' : 'complete'
    }),
    comparisonMetric({
      key: 'matched_gap_per_operation',
      label: 'Gap por operación comparable',
      description: 'Diferencia bruta frente a la réplica dividida entre operaciones emparejadas.',
      scope: 'alignment',
      unit: 'vst_per_match',
      previous: perClose(previous.summary.executionRouteAnalysis?.gap, previousPeriod.matched),
      current: perClose(current.summary.executionRouteAnalysis?.gap, currentPeriod.matched),
      direction: 'higher',
      tolerance: 0.25,
      quality: referenceIsPartial ? 'partial' : 'complete'
    }),
    comparisonMetric({
      key: 'entry_impact_per_match',
      label: 'Impacto de entrada por comparable',
      description: 'Impacto atribuido a la entrada dividido entre operaciones emparejadas.',
      scope: 'alignment',
      unit: 'vst_per_match',
      previous: perClose(previous.summary.executionPriceChain?.entryImpact, previousPeriod.matched),
      current: perClose(current.summary.executionPriceChain?.entryImpact, currentPeriod.matched),
      direction: 'higher',
      tolerance: 0.25,
      quality: referenceIsPartial ? 'partial' : 'complete'
    }),
    comparisonMetric({
      key: 'exit_impact_per_match',
      label: 'Impacto de salida por comparable',
      description: 'Impacto atribuido a la salida dividido entre operaciones emparejadas.',
      scope: 'alignment',
      unit: 'vst_per_match',
      previous: perClose(previous.summary.executionPriceChain?.exitImpact, previousPeriod.matched),
      current: perClose(current.summary.executionPriceChain?.exitImpact, currentPeriod.matched),
      direction: 'higher',
      tolerance: 0.25,
      quality: referenceIsPartial ? 'partial' : 'complete'
    })
  ];

  const statistics = linkedNetBootstrap({ current, previous });
  const status = comparisonStatus({ currentPeriod, referenceIsPartial });
  const verdicts = comparisonVerdicts({ metrics, statistics, currentPeriod, previousPeriod, referenceIsPartial });

  return {
    generatedAt: new Date().toISOString(),
    status,
    previous: previousPeriod,
    current: currentPeriod,
    verdicts,
    metrics,
    statistics,
    overall: overallComparisonVerdict({ statistics, currentPeriod, verdicts })
  };
}

function cohortPeriodSnapshot(cohort) {
  const summary = cohort.summary || {};
  const routes = summary.executionRouteAnalysis || {};
  const observedClosed = Number(routes.counts?.observedClosed || summary.vstCloses || 0);
  const matched = Number(routes.counts?.matched || 0);
  const exactClosed = Number(summary.orderHistoryEvidence?.closedRows || 0);
  const exactRows = Number(summary.orderHistoryEvidence?.exactCloseRows || 0);
  return {
    startedAt: cohort.startedAt || null,
    endedAt: cohort.endedAt || null,
    sampleKey: cohort.sampleStatus?.key || null,
    closes: Number(summary.vstCloses || 0),
    observedClosed,
    matched,
    referenceCoveragePercent: rate(matched, observedClosed),
    exactFillCoveragePercent: rate(exactRows, exactClosed),
    historicalIncidents: Number(routes.counts?.historicalIncidentObservedRows || 0),
    guardRetries: Number(routes.counts?.guardRetryObservedRows || 0),
    evidenceGaps: Number(routes.counts?.evidenceGapObservedRows || 0),
    unlinkedCloses: Number(summary.orderHistoryEvidence?.unlinkedCloseRows || 0),
    gross: round(summary.bingxGross),
    fees: round(summary.bingxFees),
    funding: round(summary.bingxFunding),
    net: round(summary.bingxNet)
  };
}

function comparisonMetric({
  key,
  label,
  description,
  scope,
  unit,
  previous,
  current,
  direction,
  tolerance = 0,
  quality = 'complete'
}) {
  const previousValue = finiteNumber(previous);
  const currentValue = finiteNumber(current);
  if (previousValue === null || currentValue === null) {
    return {
      key,
      label,
      description,
      scope,
      unit,
      direction,
      quality: 'insufficient',
      previous: previousValue,
      current: currentValue,
      delta: null,
      deltaPercent: null,
      assessment: 'insufficient'
    };
  }
  const delta = currentValue - previousValue;
  const deltaPercent = Math.abs(previousValue) > 0.0000001
    ? (delta / Math.abs(previousValue)) * 100
    : null;
  let assessment = 'stable';
  if (quality === 'partial') {
    assessment = 'partial';
  } else if (Math.abs(delta) > tolerance) {
    const favorable = direction === 'lower' ? delta < 0 : delta > 0;
    assessment = favorable ? 'improved' : 'worse';
  }
  return {
    key,
    label,
    description,
    scope,
    unit,
    direction,
    quality,
    previous: round(previousValue),
    current: round(currentValue),
    delta: round(delta),
    deltaPercent: round(deltaPercent),
    assessment
  };
}

function linkedNetBootstrap({ current, previous }) {
  const currentValues = closedNetRows(current.rows);
  const previousValues = closedNetRows(previous.rows);
  const currentStats = descriptiveStats(currentValues);
  const previousStats = descriptiveStats(previousValues);
  if (currentValues.length < 2 || previousValues.length < 2) {
    return {
      method: 'bootstrap_determinista_media_neta_enlazada',
      iterations: 0,
      current: currentStats,
      previous: previousStats,
      meanDifference: null,
      ci95Low: null,
      ci95High: null,
      probabilityCurrentHigherPercent: null,
      conclusion: 'insufficient'
    };
  }

  let seed = 0x6d2b79f5;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const differences = [];
  for (let iteration = 0; iteration < bootstrapIterations; iteration += 1) {
    differences.push(
      bootstrapMean(currentValues, random)
      - bootstrapMean(previousValues, random)
    );
  }
  differences.sort((left, right) => left - right);
  const ci95Low = quantile(differences, 0.025);
  const ci95High = quantile(differences, 0.975);
  const probabilityCurrentHigherPercent = 100 * differences.filter((value) => value > 0).length / differences.length;
  return {
    method: 'bootstrap_determinista_media_neta_enlazada',
    iterations: bootstrapIterations,
    current: currentStats,
    previous: previousStats,
    meanDifference: round(currentStats.mean - previousStats.mean),
    ci95Low: round(ci95Low),
    ci95High: round(ci95High),
    probabilityCurrentHigherPercent: round(probabilityCurrentHigherPercent),
    conclusion: ci95Low > 0 ? 'improved' : ci95High < 0 ? 'worse' : 'inconclusive'
  };
}

function comparisonStatus({ currentPeriod, referenceIsPartial }) {
  if (currentPeriod.closes < 30) {
    return {
      key: 'exploratory',
      label: 'Muestra exploratoria',
      detail: `${currentPeriod.closes}/30 cierres para una primera lectura`
    };
  }
  if (referenceIsPartial) {
    return {
      key: 'partial_reference',
      label: 'Cobertura parcial',
      detail: `${currentPeriod.matched}/${currentPeriod.observedClosed} cierres actuales tienen referencia en la hoja`
    };
  }
  if (currentPeriod.closes < 100) {
    return {
      key: 'preliminary',
      label: 'Muestra preliminar',
      detail: `${currentPeriod.closes}/100 cierres para una comparación contrastable`
    };
  }
  return {
    key: 'contrastable',
    label: 'Muestra contrastable',
    detail: `${currentPeriod.closes} cierres posteriores a las mejoras`
  };
}

function comparisonVerdicts({ metrics, statistics, currentPeriod, previousPeriod, referenceIsPartial }) {
  const metric = (key) => metrics.find((item) => item.key === key);
  const combined = (keys) => {
    const assessments = keys.map((key) => metric(key)?.assessment).filter(Boolean);
    if (assessments.every((value) => value === 'improved')) return 'improved';
    if (assessments.every((value) => value === 'worse')) return 'worse';
    if (assessments.every((value) => value === 'stable')) return 'stable';
    return 'mixed';
  };
  const currentNetPerClose = perClose(currentPeriod.net, currentPeriod.closes);
  return [
    {
      key: 'reliability',
      label: 'Fiabilidad',
      status: currentPeriod.historicalIncidents === 0 && currentPeriod.unlinkedCloses === 0
        ? (previousPeriod.historicalIncidents > 0 ? 'improved' : 'stable')
        : 'worse',
      detail: `${currentPeriod.historicalIncidents} incidencias técnicas y ${currentPeriod.unlinkedCloses} cierres sin enlazar en la cohorte actual`
    },
    {
      key: 'entry',
      label: 'Entradas',
      status: combined(['entry_above_tolerance_rate', 'entry_adverse_average']),
      detail: `${formatMetricNumber(metric('entry_above_tolerance_rate')?.current, 1)}% superan el 0,15% adverso`
    },
    {
      key: 'closing',
      label: 'Cierres',
      status: combined(['close_above_tolerance_rate', 'close_adverse_average', 'close_latency_p95']),
      detail: `Media adversa ${formatMetricNumber(metric('close_adverse_average')?.current, 4)}%; p95 ${formatMetricNumber(metric('close_latency_p95')?.current, 2)} s`
    },
    {
      key: 'economics',
      label: 'Economía',
      status: Number(currentNetPerClose) > 0 ? 'positive' : 'negative',
      detail: `${formatMetricNumber(currentNetPerClose, 4)} VST netos por cierre; contraste ${statisticsConclusionLabel(statistics.conclusion)}`
    },
    {
      key: 'alignment',
      label: 'Alineación',
      status: referenceIsPartial ? 'partial' : combined(['matched_gap_per_operation', 'entry_impact_per_match', 'exit_impact_per_match']),
      detail: `${currentPeriod.matched}/${currentPeriod.observedClosed} cierres comparables con la hoja`
    }
  ];
}

function overallComparisonVerdict({ statistics, currentPeriod, verdicts }) {
  const reliability = verdicts.find((item) => item.key === 'reliability')?.status;
  const entry = verdicts.find((item) => item.key === 'entry')?.status;
  const closing = verdicts.find((item) => item.key === 'closing')?.status;
  const netPerClose = perClose(currentPeriod.net, currentPeriod.closes);
  if (statistics.conclusion === 'improved' && Number(netPerClose) > 0) {
    return {
      key: 'positive',
      label: 'Mejora económica respaldada',
      detail: 'La media enlazada mejora y el neto por cierre es positivo en la muestra actual.'
    };
  }
  if (statistics.conclusion === 'worse') {
    return {
      key: 'negative',
      label: 'Empeoramiento económico respaldado',
      detail: 'El intervalo del cambio neto queda por debajo de cero en la muestra observada.'
    };
  }
  if (statistics.conclusion === 'improved') {
    return {
      key: 'inconclusive',
      label: 'Mejora relativa; economía todavía negativa',
      detail: 'La media enlazada mejora, pero el neto por cierre de la cohorte actual sigue siendo negativo.'
    };
  }
  if (statistics.conclusion === 'insufficient') {
    return {
      key: 'inconclusive',
      label: 'Muestra insuficiente',
      detail: 'Todavía no hay cierres enlazados suficientes para estimar el cambio económico.'
    };
  }
  return {
    key: 'inconclusive',
    label: 'Mejora técnica; rentabilidad no demostrada',
    detail: `Fiabilidad: ${assessmentNoun(reliability)}; entradas: ${assessmentNoun(entry)}; cierres: ${assessmentNoun(closing)}. El intervalo del cambio neto cruza cero.`
  };
}

function assessmentNoun(value) {
  return {
    improved: 'mejora observada',
    worse: 'empeoramiento observado',
    stable: 'sin cambio relevante',
    mixed: 'lectura mixta',
    partial: 'lectura parcial'
  }[value] || 'sin lectura concluyente';
}

function statisticsConclusionLabel(value) {
  return {
    improved: 'favorable',
    worse: 'desfavorable',
    inconclusive: 'inconcluso',
    insufficient: 'sin muestra suficiente'
  }[value] || 'sin clasificar';
}

function formatMetricNumber(value, maximumFractionDigits = 2) {
  const number = finiteNumber(value);
  return number === null
    ? '-'
    : number.toLocaleString('es-ES', { maximumFractionDigits });
}

function closedNetRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => finiteNumber(row?.vst?.grossPnl) !== null)
    .map((row) => (
      Number(row.vst.grossPnl)
      + Number(row.vst.openingFee || 0)
      + Number(row.vst.closingFee || 0)
      + Number(row.vst.funding || 0)
    ));
}

function descriptiveStats(values = []) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) {
    return { samples: 0, mean: null, median: null, winRatePercent: null, minimum: null, maximum: null };
  }
  const midpoint = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  return {
    samples: sorted.length,
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    median: round(median),
    winRatePercent: round(100 * sorted.filter((value) => value > 0).length / sorted.length),
    minimum: round(sorted[0]),
    maximum: round(sorted.at(-1))
  };
}

function bootstrapMean(values, random) {
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[Math.floor(random() * values.length)];
  }
  return sum / values.length;
}

function quantile(sorted, ratio) {
  return sorted[Math.floor((sorted.length - 1) * ratio)];
}

function rate(numerator, denominator) {
  const top = finiteNumber(numerator);
  const bottom = finiteNumber(denominator);
  return top === null || bottom === null || bottom <= 0 ? null : 100 * top / bottom;
}

function perClose(value, count) {
  const amount = finiteNumber(value);
  const total = finiteNumber(count);
  return amount === null || total === null || total <= 0 ? null : amount / total;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value) {
  const number = finiteNumber(value);
  return number === null ? null : Math.round((number + Number.EPSILON) * 100000000) / 100000000;
}
