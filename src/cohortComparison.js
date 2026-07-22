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
  const entryDiagnosis = buildEntryDiagnosis({ current, previous });
  const prospectiveCloseExecution = current?.summary?.closeExecutionAnalysis || null;

  return {
    generatedAt: new Date().toISOString(),
    status,
    previous: previousPeriod,
    current: currentPeriod,
    verdicts,
    metrics,
    statistics,
    entryDiagnosis,
    prospectiveCloseExecution,
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

function buildEntryDiagnosis({ current, previous }) {
  const currentAnalysis = current?.summary?.entryExecutionAnalysis;
  const previousAnalysis = previous?.summary?.entryExecutionAnalysis;
  if (!currentAnalysis?.totals || !previousAnalysis?.totals) {
    return null;
  }

  const stages = [
    compareEntryStage('signalToQuote', 'Señal a cotización', previousAnalysis.totals, currentAnalysis.totals),
    compareEntryStage('quoteToFill', 'Cotización a fill', previousAnalysis.totals, currentAnalysis.totals)
  ];
  const bySymbol = compareEntryGroups(previousAnalysis.bySymbol, currentAnalysis.bySymbol, { minimumSamples: 3 });
  const byRoute = compareEntryGroups(previousAnalysis.byRoute, currentAnalysis.byRoute, { minimumSamples: 3 });
  const byPackageSlot = compareEntryGroups(previousAnalysis.byPackageSlot, currentAnalysis.byPackageSlot, { minimumSamples: 3 });
  const mixAnalysis = {
    bySymbol: decomposeEntryMix(previousAnalysis.bySymbol, currentAnalysis.bySymbol),
    byPackageSlot: decomposeEntryMix(previousAnalysis.byPackageSlot, currentAnalysis.byPackageSlot)
  };
  const currentTotal = currentAnalysis.totals;
  const immediate = entryGroup(currentAnalysis.byRoute, 'immediate');
  const retried = entryGroup(currentAnalysis.byRoute, 'retried');
  const dominantStage = [...stages]
    .filter((stage) => finiteNumber(stage.currentAverageAdversePercent) !== null)
    .sort((left, right) => Number(right.currentAverageAdversePercent) - Number(left.currentAverageAdversePercent))[0] || null;
  const dominantSymbol = [...(currentAnalysis.bySymbol || [])]
    .filter((group) => Number(group.openings || 0) >= 3 && finiteNumber(group.averageAdversePercent) !== null)
    .sort((left, right) => Number(right.averageAdversePercent) - Number(left.averageAdversePercent))[0] || null;
  const comparableDeterioration = [...bySymbol]
    .filter((group) => group.assessment === 'worse')
    .sort((left, right) => (
      Number(right.deltaAboveTolerancePercent || 0) - Number(left.deltaAboveTolerancePercent || 0)
      || Number(right.deltaAverageAdversePercent || 0) - Number(left.deltaAverageAdversePercent || 0)
    ))[0] || null;
  const totalAbove = Number(currentTotal.aboveTolerance || 0);
  const retriedAbove = Number(retried?.aboveTolerance || 0);
  const immediateAbove = Number(immediate?.aboveTolerance || 0);
  const retrySharePercent = totalAbove > 0 ? round(retriedAbove / totalAbove * 100) : null;
  const stageSpread = stages.length === 2
    ? Math.abs(Number(stages[0].currentAverageAdversePercent || 0) - Number(stages[1].currentAverageAdversePercent || 0))
    : 0;
  const stageKey = stageSpread <= 0.01 ? 'mixed' : dominantStage?.key || 'insufficient';
  const stageLabel = stageKey === 'signalToQuote'
    ? 'El mayor arrastre aparece antes de enviar la orden'
    : stageKey === 'quoteToFill'
      ? 'El mayor arrastre aparece entre la cotización y el fill'
      : stageKey === 'mixed'
        ? 'El arrastre está repartido entre las dos fases de entrada'
        : 'Faltan datos para localizar el arrastre de entrada';
  const retryDetail = totalAbove > 0
    ? `${immediateAbove}/${totalAbove} entradas sobre el umbral se ejecutaron sin espera de reintento; ${retriedAbove}/${totalAbove}, tras reintento.`
    : 'No hay entradas actuales sobre el umbral configurado.';
  const symbolDetail = dominantSymbol
    ? `${dominantSymbol.label} registra la media actual más alta entre los activos con al menos tres aperturas: ${formatMetricNumber(dominantSymbol.averageAdversePercent, 4)}%.`
    : 'Ningún activo alcanza todavía tres aperturas medibles en la cohorte actual.';
  const comparableDetail = comparableDeterioration
    ? `El deterioro comparable más claro está en ${comparableDeterioration.label}: ${formatMetricNumber(comparableDeterioration.previousAboveTolerancePercent, 1)}% → ${formatMetricNumber(comparableDeterioration.currentAboveTolerancePercent, 1)}% sobre el umbral.`
    : 'Ningún activo tiene aún una comparación antes/después concluyente.';
  const packagePattern = summarizeCurrentPackagePattern(currentAnalysis.byPackageSlot, currentTotal);
  const packageDetail = packagePattern
    ? `La primera apertura del paquete promedia ${formatMetricNumber(packagePattern.firstAverageAdversePercent, 4)}%; las posteriores, ${formatMetricNumber(packagePattern.laterAverageAdversePercent, 4)}%. El tiempo medio desde detección hasta el primer intento pasa de ${formatMetricNumber(packagePattern.firstReactionAverageSeconds, 2)} s a ${formatMetricNumber(packagePattern.laterReactionAverageSeconds, 2)} s, mientras que inicio→fill ronda ${formatMetricNumber(packagePattern.attemptToFillAverageSeconds, 2)} s.`
    : 'Falta muestra para separar la primera apertura de las posteriores.';
  const mixDetail = finiteNumber(mixAnalysis.byPackageSlot?.compositionSharePercent) !== null
    ? `El cambio de mezcla por posición explica descriptivamente ${formatMetricNumber(mixAnalysis.byPackageSlot.compositionSharePercent, 1)}% del aumento medio observado.`
    : 'El efecto de mezcla por posición todavía no puede reconciliarse.';

  return {
    tolerancePercent: currentAnalysis.tolerancePercent,
    timezone: currentAnalysis.timezone || 'Europe/Madrid',
    summary: {
      key: stageKey,
      label: stageLabel,
      detail: `${symbolDetail} ${comparableDetail} ${packageDetail} ${mixDetail} ${retryDetail}`,
      caveat: 'Es una asociación descriptiva. Activo y posición dentro del paquete están correlacionados; sus desgloses son lecturas alternativas y no deben sumarse como causas. La microestructura solo se mide en aperturas nuevas con bookTicker fresco y no modifica la ejecución.',
      currentOpenings: Number(currentTotal.openings || 0),
      currentAboveTolerance: totalAbove,
      immediateAboveTolerance: immediateAbove,
      retriedAboveTolerance: retriedAbove,
      retrySharePercent,
      dominantSymbol: dominantSymbol?.key || null,
      comparableDeteriorationSymbol: comparableDeterioration?.key || null,
      dominantStage: dominantStage?.key || null,
      packagePattern
    },
    stages,
    bySymbol,
    byRoute,
    byPackageSlot,
    mixAnalysis,
    prospectiveMicrostructure: currentTotal.microstructure || null,
    timing: compareEntryTiming(previousAnalysis.totals?.latency, currentAnalysis.totals?.latency),
    currentByLatency: currentAnalysis.byLatency || [],
    currentByTimeWindow: currentAnalysis.byTimeWindow || []
  };
}

function compareEntryStage(key, label, previousTotals, currentTotals) {
  const previous = previousTotals?.[key] || {};
  const current = currentTotals?.[key] || {};
  const previousAverage = finiteNumber(previous.averageAdversePercent);
  const currentAverage = finiteNumber(current.averageAdversePercent);
  return {
    key,
    label,
    previousMeasured: Number(previous.measured || 0),
    currentMeasured: Number(current.measured || 0),
    previousAverageAdversePercent: round(previousAverage),
    currentAverageAdversePercent: round(currentAverage),
    previousAverageSignedPercent: round(previous.averageSignedPercent),
    currentAverageSignedPercent: round(current.averageSignedPercent),
    deltaAverageAdversePercent: previousAverage === null || currentAverage === null
      ? null
      : round(currentAverage - previousAverage),
    assessment: entryDeltaAssessment({
      previousAverage,
      currentAverage,
      previousSamples: Number(previous.measured || 0),
      currentSamples: Number(current.measured || 0),
      minimumSamples: 3,
      tolerance: 0.005
    })
  };
}

function compareEntryGroups(previousGroups = [], currentGroups = [], { minimumSamples = 3 } = {}) {
  const previousMap = new Map((previousGroups || []).map((group) => [group.key, group]));
  const currentMap = new Map((currentGroups || []).map((group) => [group.key, group]));
  const keys = [...new Set([...previousMap.keys(), ...currentMap.keys()])];
  return keys.map((key) => {
    const previous = previousMap.get(key) || {};
    const current = currentMap.get(key) || {};
    const previousAverage = finiteNumber(previous.averageAdversePercent);
    const currentAverage = finiteNumber(current.averageAdversePercent);
    const previousAbove = finiteNumber(previous.aboveTolerancePercent);
    const currentAbove = finiteNumber(current.aboveTolerancePercent);
    const averageAssessment = entryDeltaAssessment({
      previousAverage,
      currentAverage,
      previousSamples: Number(previous.measured || 0),
      currentSamples: Number(current.measured || 0),
      minimumSamples,
      tolerance: 0.005
    });
    const rateAssessment = entryDeltaAssessment({
      previousAverage: previousAbove,
      currentAverage: currentAbove,
      previousSamples: Number(previous.measured || 0),
      currentSamples: Number(current.measured || 0),
      minimumSamples,
      tolerance: 5
    });
    return {
      key,
      label: current.label || previous.label || key,
      previousOpenings: Number(previous.openings || 0),
      currentOpenings: Number(current.openings || 0),
      previousAverageAdversePercent: round(previousAverage),
      currentAverageAdversePercent: round(currentAverage),
      deltaAverageAdversePercent: previousAverage === null || currentAverage === null
        ? null
        : round(currentAverage - previousAverage),
      previousAboveTolerancePercent: round(previousAbove),
      currentAboveTolerancePercent: round(currentAbove),
      deltaAboveTolerancePercent: previousAbove === null || currentAbove === null
        ? null
        : round(currentAbove - previousAbove),
      currentLatencyP95Seconds: round(current.latency?.p95Seconds),
      previousReactionAverageSeconds: round(previous.latency?.reaction?.averageSeconds),
      currentReactionAverageSeconds: round(current.latency?.reaction?.averageSeconds),
      previousAttemptToFillAverageSeconds: round(previous.latency?.attemptToFill?.averageSeconds),
      currentAttemptToFillAverageSeconds: round(current.latency?.attemptToFill?.averageSeconds),
      currentMatchedEntryImpactPerRow: round(current.matchedEntryImpactPerRow),
      assessment: combineEntryAssessments(averageAssessment, rateAssessment)
    };
  }).sort((left, right) => (
    Number(right.currentAverageAdversePercent ?? -1) - Number(left.currentAverageAdversePercent ?? -1)
    || right.currentOpenings - left.currentOpenings
    || left.key.localeCompare(right.key)
  ));
}

function summarizeCurrentPackagePattern(groups = [], totals = {}) {
  const first = entryGroup(groups, 'slot_1');
  const later = aggregateEntryGroups((groups || []).filter((group) => (
    ['slot_2', 'slot_3', 'slot_4_plus'].includes(group.key)
  )));
  if (!first || Number(first.measured || 0) < 3 || !later || later.measured < 3) {
    return null;
  }
  return {
    firstOpenings: Number(first.openings || 0),
    laterOpenings: later.openings,
    firstAverageAdversePercent: round(first.averageAdversePercent),
    laterAverageAdversePercent: round(later.averageAdversePercent),
    firstAboveTolerancePercent: round(first.aboveTolerancePercent),
    laterAboveTolerancePercent: round(later.aboveTolerancePercent),
    firstReactionAverageSeconds: round(first.latency?.reaction?.averageSeconds),
    laterReactionAverageSeconds: round(later.reactionAverageSeconds),
    attemptToFillAverageSeconds: round(totals?.latency?.attemptToFill?.averageSeconds),
    exchangeBacked: Number(totals?.latency?.exchangeBacked || 0)
  };
}

function aggregateEntryGroups(groups = []) {
  const valid = (groups || []).filter((group) => (
    Number(group.measured || 0) > 0
    && finiteNumber(group.averageAdversePercent) !== null
  ));
  const measured = valid.reduce((sum, group) => sum + Number(group.measured || 0), 0);
  if (!measured) {
    return null;
  }
  const openings = valid.reduce((sum, group) => sum + Number(group.openings || 0), 0);
  const above = valid.reduce((sum, group) => sum + Number(group.aboveTolerance || 0), 0);
  const weighted = (selector) => {
    const withValue = valid
      .map((group) => ({ group, value: finiteNumber(selector(group)) }))
      .filter((item) => item.value !== null);
    const denominator = withValue.reduce((sum, item) => sum + Number(item.group.measured || 0), 0);
    return denominator
      ? withValue.reduce((sum, item) => sum + item.value * Number(item.group.measured || 0), 0) / denominator
      : null;
  };
  return {
    openings,
    measured,
    averageAdversePercent: weighted((group) => group.averageAdversePercent),
    aboveTolerancePercent: above / measured * 100,
    reactionAverageSeconds: weighted((group) => group.latency?.reaction?.averageSeconds)
  };
}

function decomposeEntryMix(previousGroups = [], currentGroups = []) {
  const previousMap = new Map((previousGroups || []).map((group) => [group.key, group]));
  const currentMap = new Map((currentGroups || []).map((group) => [group.key, group]));
  const keys = [...new Set([...previousMap.keys(), ...currentMap.keys()])];
  const previousTotal = [...previousMap.values()].reduce((sum, group) => sum + Number(group.measured || 0), 0);
  const currentTotal = [...currentMap.values()].reduce((sum, group) => sum + Number(group.measured || 0), 0);
  if (!keys.length || !previousTotal || !currentTotal) {
    return null;
  }
  const comparable = keys.every((key) => {
    const previous = previousMap.get(key);
    const current = currentMap.get(key);
    return previous && current
      && Number(previous.measured || 0) > 0
      && Number(current.measured || 0) > 0
      && finiteNumber(previous.averageAdversePercent) !== null
      && finiteNumber(current.averageAdversePercent) !== null;
  });
  if (!comparable) {
    return null;
  }
  let compositionEffect = 0;
  let withinGroupEffect = 0;
  let previousAverage = 0;
  let currentAverage = 0;
  const groups = keys.map((key) => {
    const previous = previousMap.get(key);
    const current = currentMap.get(key);
    const previousShare = Number(previous.measured) / previousTotal;
    const currentShare = Number(current.measured) / currentTotal;
    const previousMean = Number(previous.averageAdversePercent);
    const currentMean = Number(current.averageAdversePercent);
    const composition = (currentShare - previousShare) * (previousMean + currentMean) / 2;
    const within = (currentMean - previousMean) * (previousShare + currentShare) / 2;
    compositionEffect += composition;
    withinGroupEffect += within;
    previousAverage += previousShare * previousMean;
    currentAverage += currentShare * currentMean;
    return {
      key,
      label: current.label || previous.label || key,
      previousSharePercent: round(previousShare * 100),
      currentSharePercent: round(currentShare * 100),
      previousAverageAdversePercent: round(previousMean),
      currentAverageAdversePercent: round(currentMean),
      compositionEffect: round(composition),
      withinGroupEffect: round(within)
    };
  });
  const observedDelta = currentAverage - previousAverage;
  const residual = observedDelta - compositionEffect - withinGroupEffect;
  return {
    previousOpenings: previousTotal,
    currentOpenings: currentTotal,
    observedDelta: round(observedDelta),
    previousAverageAdversePercent: round(previousAverage),
    currentAverageAdversePercent: round(currentAverage),
    compositionEffect: round(compositionEffect),
    withinGroupEffect: round(withinGroupEffect),
    compositionSharePercent: Math.abs(observedDelta) > 0.0000001
      ? round(compositionEffect / observedDelta * 100)
      : null,
    residual: Math.abs(residual) <= 0.0000001 ? 0 : round(residual),
    groups
  };
}

function compareEntryTiming(previous = {}, current = {}) {
  return {
    previousExchangeBacked: Number(previous.exchangeBacked || 0),
    currentExchangeBacked: Number(current.exchangeBacked || 0),
    reactionAverageSeconds: compareTimingValue(previous.reaction?.averageSeconds, current.reaction?.averageSeconds),
    attemptToFillAverageSeconds: compareTimingValue(previous.attemptToFill?.averageSeconds, current.attemptToFill?.averageSeconds),
    totalP95Seconds: compareTimingValue(previous.p95Seconds, current.p95Seconds)
  };
}

function compareTimingValue(previous, current) {
  const previousValue = finiteNumber(previous);
  const currentValue = finiteNumber(current);
  return {
    previous: round(previousValue),
    current: round(currentValue),
    delta: previousValue === null || currentValue === null ? null : round(currentValue - previousValue)
  };
}

function entryDeltaAssessment({
  previousAverage,
  currentAverage,
  previousSamples,
  currentSamples,
  minimumSamples,
  tolerance
}) {
  if (previousAverage === null || currentAverage === null
    || previousSamples < minimumSamples || currentSamples < minimumSamples) {
    return 'insufficient';
  }
  const delta = currentAverage - previousAverage;
  if (Math.abs(delta) <= tolerance) return 'stable';
  return delta < 0 ? 'improved' : 'worse';
}

function combineEntryAssessments(left, right) {
  if (left === 'insufficient' || right === 'insufficient') return 'insufficient';
  if (left === right) return left;
  if (left === 'stable') return right;
  if (right === 'stable') return left;
  return 'mixed';
}

function entryGroup(groups = [], key = '') {
  return (groups || []).find((group) => group.key === key) || null;
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
