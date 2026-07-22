import { closeAdverseDeviationPercent, closeSignedDeviationPercent, entryAdverseDeviationPercent, entrySignedDeviationPercent } from './executionAuditPrices.js';

const transientClosePatterns = [
  /please try again later/i,
  /(?:system|service).*(?:currently )?busy|currently busy/i,
  /temporar(?:y|ily|io|iamente)/i,
  /timeout|timed out|etimedout/i,
  /fetch failed|network|socket|econn|enotfound/i,
  /rate.?limit|too many requests|\b429\b/i,
  /service unavailable|bad gateway|gateway timeout/i,
  /internal server error/i
];

export function isRetryableCloseError(reason = '') {
  const message = String(reason || '').trim();
  return Boolean(message) && transientClosePatterns.some((pattern) => pattern.test(message));
}

export function cohortSampleStatus(closedTrades = 0) {
  const count = Math.max(0, Math.trunc(Number(closedTrades) || 0));
  if (count >= 100) {
    return {
      key: 'contrastable',
      label: 'Muestra contrastable',
      detail: `${count} cierres posteriores al cambio`
    };
  }
  if (count >= 30) {
    return {
      key: 'preliminary',
      label: 'Muestra preliminar',
      detail: `${count}/100 cierres; útil para orientar, todavía frágil`
    };
  }
  return {
    key: 'exploratory',
    label: 'Muestra exploratoria',
    detail: `${count}/30 cierres mínimos para una primera lectura`
  };
}

export function commissionEvidence({ incomeRows = [], commissionRate = null } = {}) {
  const byType = {};
  for (const row of incomeRows || []) {
    const type = String(row?.incomeType || 'UNKNOWN').toUpperCase();
    const income = Number(row?.income || 0);
    if (!Number.isFinite(income)) {
      continue;
    }
    byType[type] = roundMoney((byType[type] || 0) + income);
  }

  const detectedRebate = Object.entries(byType)
    .filter(([type, amount]) => /REBATE|COMMISSION/.test(type) && Number(amount) > 0)
    .reduce((sum, [, amount]) => sum + Number(amount || 0), 0);
  const takerRate = finiteRate(commissionRate?.takerCommissionRate);
  const makerRate = finiteRate(commissionRate?.makerCommissionRate);

  return {
    detectedRebate: roundMoney(detectedRebate),
    rebateDetected: detectedRebate > 0,
    takerCommissionRate: takerRate,
    makerCommissionRate: makerRate,
    takerCommissionPercent: takerRate === null ? null : roundMoney(takerRate * 100),
    makerCommissionPercent: makerRate === null ? null : roundMoney(makerRate * 100),
    incomeTypes: byType
  };
}

export function estimateReplicaEconomics({
  rows = [],
  takerCommissionRate = null,
  makerCommissionRate = null
} = {}) {
  const takerRate = finiteRate(takerCommissionRate);
  const makerRate = finiteRate(makerCommissionRate);
  const referenceRows = (rows || []).filter((row) => (
    row?.sheet
    && Number.isFinite(Number(row?.replica?.pnl))
    && Number(row?.replica?.notional) > 0
    && Number(row?.replica?.leverage) > 0
  ));
  const gross = roundMoney(referenceRows.reduce((sum, row) => sum + Number(row.replica.pnl || 0), 0));
  const exposure = roundMoney(referenceRows.reduce((sum, row) => (
    sum + Number(row.replica.notional || 0) * Number(row.replica.leverage || 0)
  ), 0));
  const marketFees = takerRate === null ? null : roundMoney(-exposure * takerRate * 2);
  const makerEntryFees = takerRate === null || makerRate === null
    ? null
    : roundMoney(-exposure * (makerRate + takerRate));

  return {
    rows: referenceRows.length,
    exposure,
    gross,
    marketFees,
    marketNet: marketFees === null ? null : roundMoney(gross + marketFees),
    makerEntryFees,
    makerEntryNet: makerEntryFees === null ? null : roundMoney(gross + makerEntryFees)
  };
}

export function classifyPairedOutcome(row = {}) {
  const sheetPnl = row?.sheet?.pnl;
  const netPnl = row?.vst?.netPnl;
  if (!pairedOutcomeHasResult(sheetPnl) || !pairedOutcomeHasResult(netPnl)) {
    return {
      comparable: false,
      key: 'not_comparable',
      label: 'Sin resultado comparable',
      sameNetSign: false,
      netMismatch: false,
      grossMeasured: false,
      grossMismatch: false,
      marketDrivenNetMismatch: false,
      costDrivenNetMismatch: false,
      otherNetMismatch: false,
      grossMismatchRecoveredByCosts: false
    };
  }

  const sheetSign = outcomeSign(sheetPnl);
  const netSign = outcomeSign(netPnl);
  const grossMeasured = pairedOutcomeHasResult(row?.vst?.grossPnl);
  const grossSign = grossMeasured ? outcomeSign(row.vst.grossPnl) : 0;
  const sameNetSign = sheetSign === netSign;
  const netMismatch = !sameNetSign && sheetSign !== 0 && netSign !== 0;
  const grossMismatch = grossMeasured
    && sheetSign !== 0
    && grossSign !== 0
    && sheetSign !== grossSign;
  const costDrivenNetMismatch = netMismatch
    && sheetSign > 0
    && grossSign > 0
    && netSign < 0;
  const marketDrivenNetMismatch = netMismatch && grossMismatch;
  const otherNetMismatch = netMismatch
    && !marketDrivenNetMismatch
    && !costDrivenNetMismatch;
  const grossMismatchRecoveredByCosts = grossMismatch && sameNetSign;
  const key = marketDrivenNetMismatch
    ? 'market_driven_mismatch'
    : costDrivenNetMismatch
      ? 'cost_driven_mismatch'
      : otherNetMismatch
        ? 'other_net_mismatch'
        : grossMismatchRecoveredByCosts
          ? 'gross_mismatch_recovered'
          : sameNetSign
            ? 'same_net_sign'
            : 'neutral_difference';
  const label = {
    market_driven_mismatch: 'Signo distinto antes de costes',
    cost_driven_mismatch: 'Ganancia absorbida por costes',
    other_net_mismatch: 'Signo neto distinto',
    gross_mismatch_recovered: 'Bruto distinto; neto realineado por costes',
    same_net_sign: 'Mismo signo neto',
    neutral_difference: 'Resultado neutro'
  }[key];

  return {
    comparable: true,
    key,
    label,
    sheetSign,
    grossSign: grossMeasured ? grossSign : null,
    netSign,
    sameNetSign,
    netMismatch,
    grossMeasured,
    grossMismatch,
    marketDrivenNetMismatch,
    costDrivenNetMismatch,
    otherNetMismatch,
    grossMismatchRecoveredByCosts
  };
}

export function summarizePairedOutcomes(rows = []) {
  const pairs = (rows || []).filter((row) => (
    pairedOutcomeHasResult(row?.sheet?.pnl) && pairedOutcomeHasResult(row?.vst?.netPnl)
  ));
  let sheetWins = 0;
  let vstWins = 0;
  let bothWin = 0;
  let bothLoss = 0;
  let sameNetSign = 0;
  let netSignMismatch = 0;
  let sheetWinVstLoss = 0;
  let sheetLossVstWin = 0;
  let grossSignMeasured = 0;
  let grossSignMismatch = 0;
  let costFlip = 0;
  let marketDrivenNetMismatch = 0;
  let costDrivenNetMismatch = 0;
  let otherNetMismatch = 0;
  let grossMismatchRecoveredByCosts = 0;

  for (const row of pairs) {
    const sheetPnl = Number(row.sheet.pnl);
    const netPnl = Number(row.vst.netPnl);
    const sheetWin = sheetPnl > 0;
    const vstWin = netPnl > 0;
    const outcome = classifyPairedOutcome(row);

    sheetWins += sheetWin ? 1 : 0;
    vstWins += vstWin ? 1 : 0;
    bothWin += sheetWin && vstWin ? 1 : 0;
    bothLoss += !sheetWin && !vstWin ? 1 : 0;
    sheetWinVstLoss += sheetWin && !vstWin ? 1 : 0;
    sheetLossVstWin += !sheetWin && vstWin ? 1 : 0;
    if (outcome.sameNetSign) {
      sameNetSign += 1;
    } else if (outcome.netMismatch) {
      netSignMismatch += 1;
    }
    grossSignMeasured += outcome.grossMeasured ? 1 : 0;
    grossSignMismatch += outcome.grossMismatch ? 1 : 0;
    costFlip += outcome.costDrivenNetMismatch ? 1 : 0;
    marketDrivenNetMismatch += outcome.marketDrivenNetMismatch ? 1 : 0;
    costDrivenNetMismatch += outcome.costDrivenNetMismatch ? 1 : 0;
    otherNetMismatch += outcome.otherNetMismatch ? 1 : 0;
    grossMismatchRecoveredByCosts += outcome.grossMismatchRecoveredByCosts ? 1 : 0;
  }

  const sheetWinRate = pairs.length ? roundMoney((sheetWins / pairs.length) * 100) : null;
  const vstWinRate = pairs.length ? roundMoney((vstWins / pairs.length) * 100) : null;

  return {
    rows: pairs.length,
    sheetWins,
    vstWins,
    sheetWinRate,
    vstWinRate,
    winRateGapPoints: sheetWinRate === null || vstWinRate === null
      ? null
      : roundMoney(vstWinRate - sheetWinRate),
    bothWin,
    bothLoss,
    sameNetSign,
    netSignMismatch,
    sheetWinVstLoss,
    sheetLossVstWin,
    grossSignMeasured,
    grossSignMismatch,
    costFlip,
    marketDrivenNetMismatch,
    costDrivenNetMismatch,
    otherNetMismatch,
    grossMismatchRecoveredByCosts
  };
}

const PAIRED_OUTCOME_IMPACT_GROUPS = [
  { key: 'market_driven_mismatch', label: 'Signo distinto antes de costes' },
  { key: 'cost_driven_mismatch', label: 'Ganancia absorbida por costes' },
  { key: 'other_net_mismatch', label: 'Signo neto distinto sin atribución' },
  { key: 'same_net_sign', label: 'Mismo signo neto' },
  { key: 'neutral_difference', label: 'Resultado neutro' }
];

export function summarizePairedOutcomeImpact(rows = []) {
  const pairs = (rows || []).filter((row) => (
    pairedOutcomeHasResult(row?.sheet?.pnl) && pairedOutcomeHasResult(row?.vst?.netPnl)
  ));
  const groups = new Map(PAIRED_OUTCOME_IMPACT_GROUPS.map(({ key, label }) => [
    key,
    pairedOutcomeImpactAccumulator(key, label)
  ]));
  const bySymbol = new Map();
  const totals = pairedOutcomeImpactAccumulator('all', 'Todas las operaciones comparables');

  for (const row of pairs) {
    const outcome = row.outcome?.comparable ? row.outcome : classifyPairedOutcome(row);
    const groupKey = primaryPairedOutcomeImpactKey(outcome);
    const group = groups.get(groupKey) || groups.get('neutral_difference');
    const symbol = row.symbol || 'Sin activo';
    const symbolGroup = bySymbol.get(symbol) || pairedOutcomeImpactAccumulator(symbol, symbol);
    addPairedOutcomeImpact(group, row, outcome);
    addPairedOutcomeImpact(symbolGroup, row, outcome);
    addPairedOutcomeImpact(totals, row, outcome);
    bySymbol.set(symbol, symbolGroup);
  }

  return {
    ...finalizePairedOutcomeImpact(totals),
    groups: PAIRED_OUTCOME_IMPACT_GROUPS
      .map(({ key }) => finalizePairedOutcomeImpact(groups.get(key)))
      .filter((group) => group.rows > 0),
    bySymbol: [...bySymbol.values()]
      .map(finalizePairedOutcomeImpact)
      .sort((left, right) => left.gapVsReplica - right.gapVsReplica || left.key.localeCompare(right.key))
  };
}

function primaryPairedOutcomeImpactKey(outcome = {}) {
  if (outcome.marketDrivenNetMismatch) {
    return 'market_driven_mismatch';
  }
  if (outcome.costDrivenNetMismatch) {
    return 'cost_driven_mismatch';
  }
  if (outcome.otherNetMismatch) {
    return 'other_net_mismatch';
  }
  if (outcome.sameNetSign) {
    return 'same_net_sign';
  }
  return 'neutral_difference';
}

function pairedOutcomeImpactAccumulator(key, label) {
  return {
    key,
    label,
    rows: 0,
    sameNetSign: 0,
    netMismatch: 0,
    marketDrivenNetMismatch: 0,
    costDrivenNetMismatch: 0,
    otherNetMismatch: 0,
    grossMismatchRecoveredByCosts: 0,
    replicaPnl: 0,
    bingxGross: 0,
    fees: 0,
    funding: 0,
    bingxNet: 0,
    gapVsReplica: 0
  };
}

function addPairedOutcomeImpact(accumulator, row, outcome) {
  const replicaPnl = finiteOrNull(row?.replica?.pnl) ?? 0;
  const bingxGross = finiteOrNull(row?.vst?.grossPnl) ?? 0;
  const funding = finiteOrNull(row?.vst?.funding) ?? 0;
  const openingFee = finiteOrNull(row?.vst?.openingFee);
  const closingFee = finiteOrNull(row?.vst?.closingFee);
  const fees = openingFee !== null || closingFee !== null
    ? (openingFee ?? 0) + (closingFee ?? 0)
    : (finiteOrNull(row?.vst?.fees) ?? 0) - funding;
  const bingxNet = finiteOrNull(row?.vst?.netPnl) ?? 0;

  accumulator.rows += 1;
  accumulator.sameNetSign += outcome.sameNetSign ? 1 : 0;
  accumulator.netMismatch += outcome.netMismatch ? 1 : 0;
  accumulator.marketDrivenNetMismatch += outcome.marketDrivenNetMismatch ? 1 : 0;
  accumulator.costDrivenNetMismatch += outcome.costDrivenNetMismatch ? 1 : 0;
  accumulator.otherNetMismatch += outcome.otherNetMismatch ? 1 : 0;
  accumulator.grossMismatchRecoveredByCosts += outcome.grossMismatchRecoveredByCosts ? 1 : 0;
  accumulator.replicaPnl += replicaPnl;
  accumulator.bingxGross += bingxGross;
  accumulator.fees += fees;
  accumulator.funding += funding;
  accumulator.bingxNet += bingxNet;
  accumulator.gapVsReplica += bingxNet - replicaPnl;
}

function finalizePairedOutcomeImpact(accumulator) {
  const costs = roundMoney(accumulator.fees + accumulator.funding);
  const grossGapVsReplica = roundMoney(accumulator.bingxGross - accumulator.replicaPnl);
  const gapVsReplica = roundMoney(accumulator.gapVsReplica);
  const costShareOfGapPercent = grossGapVsReplica <= 0 && costs <= 0 && gapVsReplica < 0
    ? roundMoney((Math.abs(costs) / Math.abs(gapVsReplica)) * 100)
    : null;
  const residual = roundMoney(accumulator.bingxNet - accumulator.bingxGross - costs);
  return {
    key: accumulator.key,
    label: accumulator.label,
    rows: accumulator.rows,
    sameNetSign: accumulator.sameNetSign,
    netMismatch: accumulator.netMismatch,
    marketDrivenNetMismatch: accumulator.marketDrivenNetMismatch,
    costDrivenNetMismatch: accumulator.costDrivenNetMismatch,
    otherNetMismatch: accumulator.otherNetMismatch,
    grossMismatchRecoveredByCosts: accumulator.grossMismatchRecoveredByCosts,
    replicaPnl: roundMoney(accumulator.replicaPnl),
    bingxGross: roundMoney(accumulator.bingxGross),
    grossGapVsReplica,
    fees: roundMoney(accumulator.fees),
    funding: roundMoney(accumulator.funding),
    costs,
    costShareOfGapPercent,
    bingxNet: roundMoney(accumulator.bingxNet),
    gapVsReplica,
    averageGapVsReplica: accumulator.rows
      ? roundMoney(accumulator.gapVsReplica / accumulator.rows)
      : 0,
    residual,
    reconciled: Math.abs(residual) <= 0.01
  };
}

export function cohortWindowBounds({ startedAt, endedAt = null, monthWindow = {} } = {}) {
  const parsedStart = Date.parse(startedAt || '');
  if (!Number.isFinite(parsedStart) || parsedStart <= 0) {
    return null;
  }
  const parsedEnd = Date.parse(endedAt || '');
  const monthStart = Number(monthWindow.startTime);
  const monthEnd = Number(monthWindow.endTime);
  if (!Number.isFinite(monthStart) || !Number.isFinite(monthEnd)) {
    return null;
  }
  const startTime = Math.max(monthStart, parsedStart);
  const endTime = Math.min(monthEnd, Number.isFinite(parsedEnd) && parsedEnd > 0 ? parsedEnd : monthEnd);
  return endTime > startTime ? { startTime, endTime, resetAt: parsedStart } : null;
}

export function auditRowBelongsToWindow(row = {}, window = {}) {
  const timestamp = firstValidTimestamp([
    row?.vst?.openingAt,
    row?.sheet?.openedAt,
    row?.vst?.closingAt,
    row?.sheet?.closedAt
  ]);
  return Number.isFinite(timestamp)
    && timestamp >= Number(window.startTime)
    && timestamp <= Number(window.endTime);
}

export function scopeReplicaCohortInputs({ sheetRows = [], incomeRows = [], events = [], window = {} } = {}) {
  const startTime = Number(window.startTime);
  const endTime = Number(window.endTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return { sheetRows: [], incomeRows: [], events: [] };
  }

  return {
    sheetRows: sheetRows.filter((row) => timestampInWindow(
      Date.parse(row?.openedAt || row?.closedAt || 0),
      startTime,
      endTime
    )),
    incomeRows: incomeRows.filter((row) => timestampInWindow(
      Number(row?.time || 0),
      startTime,
      endTime
    )),
    events: events.filter((event) => timestampInWindow(
      Date.parse(event?.at || 0),
      startTime,
      endTime
    ))
  };
}

export function cohortAuditRowHasOrigin(row = {}) {
  return Boolean(row.sheet || row.vst?.openingAt);
}

export function annotateReplicaReferenceCoverage(rows = [], sheetRows = [], { staleAfterHours = 24 } = {}) {
  const latestSheetTime = latestTimestamp(sheetRows.flatMap((row) => [row?.openedAt, row?.closedAt]));
  const comparisonCoverage = referenceComparisonCoverage(sheetRows);
  const coverageEndTime = comparisonCoverage.coverageEndTime;
  const freshnessEndTime = comparisonCoverage.matchingEndTime;
  const latestVstTime = latestTimestamp(rows.map((row) => row?.vst?.openingAt));
  let outsideCoverageRows = 0;
  const annotatedRows = rows.map((row) => {
    const openingTime = Date.parse(row?.vst?.openingAt || 0);
    if (row?.cause !== 'Extra en VST'
      || !Number.isFinite(coverageEndTime)
      || !Number.isFinite(openingTime)
      || openingTime <= coverageEndTime) {
      return row;
    }
    outsideCoverageRows += 1;
    return {
      ...row,
      cause: 'Fuera de cobertura de la hoja',
      detail: comparisonCoverage.provisionalLatestDay
        ? 'La última jornada de la hoja sigue abierta; esta apertura VST queda pendiente hasta que se publique su resultado.'
        : 'La apertura VST es posterior a la última operación disponible en la hoja y todavía no puede compararse.',
      severity: 'warn'
    };
  });
  const lagHours = Number.isFinite(freshnessEndTime) && Number.isFinite(latestVstTime) && latestVstTime > freshnessEndTime
    ? roundMoney((latestVstTime - freshnessEndTime) / 3_600_000)
    : 0;

  return {
    rows: annotatedRows,
    coverage: {
      latestSheetAt: Number.isFinite(latestSheetTime) ? new Date(latestSheetTime).toISOString() : null,
      coverageThroughAt: Number.isFinite(coverageEndTime) ? new Date(coverageEndTime).toISOString() : null,
      matchingThroughAt: Number.isFinite(freshnessEndTime) ? new Date(freshnessEndTime).toISOString() : null,
      latestVstAt: Number.isFinite(latestVstTime) ? new Date(latestVstTime).toISOString() : null,
      lagHours,
      staleAfterHours,
      stale: outsideCoverageRows > 0 && lagHours > staleAfterHours,
      provisionalLatestDay: comparisonCoverage.provisionalLatestDay,
      openReferenceRows: comparisonCoverage.openReferenceRows,
      outsideCoverageRows,
      comparableRows: Math.max(0, annotatedRows.length - outsideCoverageRows)
    }
  };
}

export function referenceCoverageEndTime(sheetRows = []) {
  const latestSheetTime = latestTimestamp(sheetRows.flatMap((row) => [row?.openedAt, row?.closedAt]));
  if (!Number.isFinite(latestSheetTime)) {
    return NaN;
  }
  const date = new Date(latestSheetTime);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) - 1;
}

export function referenceComparisonCoverage(sheetRows = []) {
  const matchingEndTime = referenceCoverageEndTime(sheetRows);
  if (!Number.isFinite(matchingEndTime)) {
    return {
      matchingEndTime: NaN,
      coverageEndTime: NaN,
      provisionalLatestDay: false,
      openReferenceRows: 0
    };
  }

  const latestDayStart = matchingEndTime - 86_400_000 + 1;
  const openReferenceRows = sheetRows.filter((row) => {
    if (String(row?.status || '').toLowerCase() !== 'open') {
      return false;
    }
    const rowTime = latestTimestamp([row?.openedAt, row?.closedAt]);
    return Number.isFinite(rowTime) && rowTime >= latestDayStart && rowTime <= matchingEndTime;
  }).length;
  const provisionalLatestDay = openReferenceRows > 0;

  return {
    matchingEndTime,
    coverageEndTime: provisionalLatestDay ? latestDayStart - 1 : matchingEndTime,
    provisionalLatestDay,
    openReferenceRows
  };
}

function outcomeSign(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) <= 0.01) {
    return 0;
  }
  return Math.sign(number);
}

function pairedOutcomeHasResult(value) {
  return value !== null
    && value !== undefined
    && value !== ''
    && Number.isFinite(Number(value));
}

export function buildOpeningFailureAttempts(events = []) {
  const groups = new Map();
  for (const event of events || []) {
    const key = openingAttemptKey(event);
    if (!key) {
      continue;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(event);
  }

  const attempts = [];
  for (const group of groups.values()) {
    if (group.some((event) => String(event?.status || '') === 'demo_order_sent')) {
      continue;
    }
    const failures = group
      .filter((event) => isOpeningFailureStatus(event?.status))
      .sort((left, right) => Date.parse(left?.at || 0) - Date.parse(right?.at || 0));
    const failure = failures.at(-1);
    if (!failure) {
      continue;
    }
    attempts.push({
      eventId: failure.eventId || null,
      at: failure.at || null,
      status: failure.status || 'error',
      reason: String(failure.reason || failure.error || 'Motivo no registrado.'),
      category: openingFailureCategory(failure.reason || failure.error),
      postId: failure.postId || null,
      postUrl: failure.postUrl || null,
      executionKey: failure.executionKey || null,
      signal: failure.signal || null
    });
  }

  return attempts.sort((left, right) => Date.parse(left.at || 0) - Date.parse(right.at || 0));
}

export function buildCloseFailureAttempts(events = []) {
  return (events || [])
    .filter((event) => String(event?.signal?.action || '').toUpperCase() === 'CLOSE')
    .filter((event) => isCloseFailureStatus(event?.status))
    .map((event) => ({
      eventId: event.eventId || null,
      at: event.at || null,
      status: event.status || 'error',
      reason: String(event.reason || event.error || 'Motivo no registrado.'),
      category: closeFailureCategory(event),
      postId: event.postId || null,
      postUrl: event.postUrl || null,
      signal: event.signal || null
    }))
    .sort((left, right) => Date.parse(left.at || 0) - Date.parse(right.at || 0));
}

export function buildUnprocessedCloseSignals({
  posts = [],
  events = [],
  parseSignals = () => [],
  startTime = Number.NEGATIVE_INFINITY,
  endTime = Number.POSITIVE_INFINITY
} = {}) {
  const processedEvents = (events || []).filter((event) => isCloseAction(event?.signal?.action));
  const candidates = [];

  for (const post of posts || []) {
    const at = Date.parse(post?.firstSeenAt || post?.scrapedAt || 0);
    if (!Number.isFinite(at) || at < startTime || at > endTime) {
      continue;
    }
    const signals = parseSignals(post?.text || '').filter((signal) => (
      signal?.isSignal && isCloseAction(signal?.action)
    ));
    for (const signal of signals) {
      const processed = processedEvents.some((event) => (
        event?.postId === post?.id && closeSignalMatchesEvent(signal, event?.signal)
      ));
      if (processed) {
        continue;
      }
      const category = /\bCUERRES?\b/i.test(String(post?.text || ''))
        ? 'historical_close_typo'
        : 'close_signal_without_event';
      candidates.push({
        at: new Date(at).toISOString(),
        postId: post?.id || null,
        postUrl: post?.url || null,
        category,
        reason: category === 'historical_close_typo'
          ? 'La publicación se guardó, pero el parser vigente entonces no reconoció la errata CUERRE.'
          : 'La publicación contiene un cierre reconocible, pero no existe un evento de ejecución.',
        signal
      });
    }
  }

  return candidates.sort((left, right) => Date.parse(left.at || 0) - Date.parse(right.at || 0));
}

export function replicaStopAlignment({
  closeStatus = '',
  replicaPnl = null,
  grossPnl = null,
  closeDiffPercent = null,
  maxCloseDiffPercent = 0.15
} = {}) {
  if (String(closeStatus || '') !== 'exchange_stop_closed') {
    return 'not_stop';
  }
  const reference = nullableNumber(replicaPnl);
  const observed = nullableNumber(grossPnl);
  if (reference === null || observed === null || Math.abs(reference) <= 0.01 || Math.abs(observed) <= 0.01) {
    return 'unknown';
  }
  if (Math.sign(reference) !== Math.sign(observed)) {
    return 'divergent';
  }
  const closeDiff = nullableNumber(closeDiffPercent);
  if (closeDiff !== null && closeDiff > Number(maxCloseDiffPercent || 0.15)) {
    return 'slippage';
  }
  return 'aligned';
}

export function observedCloseKind({
  status = '',
  hasCloseSignal = false,
  direction = '',
  stopLoss = null,
  closePrice = null,
  grossPnl = null,
  tolerancePercent = 0.25
} = {}) {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus.includes('stop')) {
    return { kind: 'stop', source: 'exchange_status' };
  }
  if (hasCloseSignal || normalizedStatus !== 'exchange_position_closed' || Number(grossPnl) >= 0) {
    return { kind: 'other', source: normalizedStatus || 'unknown' };
  }
  const stop = Number(stopLoss);
  const close = Number(closePrice);
  if (!Number.isFinite(stop) || stop <= 0 || !Number.isFinite(close) || close <= 0) {
    return { kind: 'other', source: normalizedStatus || 'unknown' };
  }
  const tolerance = Math.max(0, Number(tolerancePercent) || 0) / 100;
  const side = String(direction || '').toUpperCase();
  const nearOrBeyondStop = side === 'SHORT'
    ? close >= stop * (1 - tolerance)
    : close <= stop * (1 + tolerance);
  return nearOrBeyondStop
    ? { kind: 'stop', source: 'price_and_pnl' }
    : { kind: 'other', source: normalizedStatus || 'unknown' };
}

export function summarizeReplicaStops(rows = []) {
  const stopRows = (rows || []).filter((row) => (
    row?.vst?.stopAlignment && row.vst.stopAlignment !== 'not_stop'
  ));
  const comparable = stopRows.filter((row) => row.vst.stopAlignment !== 'unknown');
  return {
    observed: stopRows.length,
    total: comparable.length,
    aligned: comparable.filter((row) => row.vst.stopAlignment === 'aligned').length,
    divergent: comparable.filter((row) => row.vst.stopAlignment === 'divergent').length,
    slippage: comparable.filter((row) => row.vst.stopAlignment === 'slippage').length,
    unknown: stopRows.filter((row) => row.vst.stopAlignment === 'unknown').length,
    closeFailureDivergent: comparable.filter((row) => (
      row.vst.stopAlignment === 'divergent' && Number(row.vst.closeFailures?.length || 0) > 0
    )).length,
    runtimeGuardFailureDivergent: comparable.filter((row) => (
      row.vst.stopAlignment === 'divergent'
      && row.vst.closeFailures?.some((failure) => failure.category === 'close_guard_runtime_error')
    )).length,
    unprocessedCloseDivergent: comparable.filter((row) => (
      row.vst.stopAlignment === 'divergent' && Number(row.vst.unprocessedCloses?.length || 0) > 0
    )).length,
    aggregatedDivergent: comparable.filter((row) => (
      row.vst.stopAlignment === 'divergent' && Number(row.vst.aggregatedOpenings || 1) > 1
    )).length
  };
}

export function buildReplicaGapBridge({ rows = [], bingxFees = 0, bingxFunding = 0 } = {}) {
  const auditRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const sheetRows = auditRows.filter((row) => Boolean(row.sheet));
  const pendingReferenceRows = sheetRows.filter((row) => row.sheet?.status === 'open');
  const settledSheetRows = sheetRows.filter((row) => row.sheet?.status !== 'open');
  const matchedRows = settledSheetRows.filter(hasReplicaGrossPnl);
  const missingRows = settledSheetRows.filter((row) => (
    !hasReplicaGrossPnl(row) && row.cause === 'No ejecutada en VST'
  ));
  const unresolvedSheetRows = settledSheetRows.filter((row) => (
    !hasReplicaGrossPnl(row) && row.cause !== 'No ejecutada en VST'
  ));
  const unreferencedRows = auditRows.filter((row) => !row.sheet);
  const outsideCoverageRows = unreferencedRows.filter((row) => row.cause === 'Fuera de cobertura de la hoja');
  const extraRows = unreferencedRows.filter((row) => row.cause === 'Extra en VST');
  const unlinkedCloseRows = unreferencedRows.filter((row) => row.cause === 'Cierre sin apertura enlazada');
  const knownUnreferenced = new Set([
    'Fuera de cobertura de la hoja',
    'Extra en VST',
    'Cierre sin apertura enlazada'
  ]);
  const otherRows = unreferencedRows.filter((row) => !knownUnreferenced.has(row.cause));

  const replicaPnl = sumFinite(settledSheetRows.map((row) => row.replica?.pnl));
  const matchedReplicaPnl = sumFinite(matchedRows.map((row) => row.replica?.pnl));
  const matchedGrossPnl = sumFinite(matchedRows.map((row) => row.vst?.grossPnl));
  const pendingReferenceGrossPnl = sumFinite(pendingReferenceRows.map((row) => row.vst?.grossPnl));
  const observedGross = sumFinite(auditRows.map((row) => row.vst?.grossPnl));
  const fees = roundMoney(bingxFees);
  const funding = roundMoney(bingxFunding);
  const steps = [
    bridgeStep('matched_gap', 'Emparejadas vs hoja', matchedGrossPnl - matchedReplicaPnl, matchedRows.length),
    bridgeStep('missing_execution', 'No ejecutadas', -sumFinite(missingRows.map((row) => row.replica?.pnl)), missingRows.length),
    bridgeStep('sheet_without_result', 'Hoja sin cierre VST', -sumFinite(unresolvedSheetRows.map((row) => row.replica?.pnl)), unresolvedSheetRows.length),
    bridgeStep('pending_reference', 'Resultado pendiente en hoja', pendingReferenceGrossPnl, pendingReferenceRows.length),
    bridgeStep('outside_coverage', 'Posteriores sin hoja', sumFinite(outsideCoverageRows.map((row) => row.vst?.grossPnl)), outsideCoverageRows.length),
    bridgeStep('extra_execution', 'Extras en cobertura', sumFinite(extraRows.map((row) => row.vst?.grossPnl)), extraRows.length),
    bridgeStep('unlinked_close', 'Cierres no enlazados', sumFinite(unlinkedCloseRows.map((row) => row.vst?.grossPnl)), unlinkedCloseRows.length),
    bridgeStep('other_unreferenced', 'Otros sin referencia', sumFinite(otherRows.map((row) => row.vst?.grossPnl)), otherRows.length),
    bridgeStep('fees', 'Comisiones', fees, null),
    bridgeStep('funding', 'Funding', funding, null)
  ];
  const grossSteps = steps.filter((step) => !['fees', 'funding'].includes(step.key));
  const reconstructedGross = roundMoney(replicaPnl + sumFinite(grossSteps.map((step) => step.value)));
  const observedNet = roundMoney(observedGross + fees + funding);
  const reconstructedNet = roundMoney(reconstructedGross + fees + funding);
  const residual = roundMoney(observedNet - reconstructedNet);

  return {
    replicaPnl,
    bingxGross: observedGross,
    bingxFees: fees,
    bingxFunding: funding,
    bingxNet: observedNet,
    reconstructedGross,
    reconstructedNet,
    residual,
    reconciled: Math.abs(residual) <= 0.01,
    counts: {
      sheet: sheetRows.length,
      matched: matchedRows.length,
      missingExecution: missingRows.length,
      sheetWithoutResult: unresolvedSheetRows.length,
      pendingReference: pendingReferenceRows.length,
      outsideCoverage: outsideCoverageRows.length,
      extras: extraRows.length,
      unlinkedCloses: unlinkedCloseRows.length,
      otherUnreferenced: otherRows.length
    },
    steps
  };
}

export function buildMatchedGapAttribution(rows = []) {
  const matchedRows = (Array.isArray(rows) ? rows : []).filter((row) => (
    Boolean(row?.sheet)
    && nullableNumber(row?.replica?.pnl) !== null
    && nullableNumber(row?.vst?.grossPnl) !== null
  ));
  const totals = {
    replicaPnl: 0,
    bingxGross: 0,
    sheetAccounting: 0,
    entryExecution: 0,
    exitExecution: 0,
    sizeAndFills: 0,
    insufficientEvidence: 0
  };
  const bySymbol = new Map();
  const byCloseKind = new Map();
  const rowAttributions = [];
  let decomposableRows = 0;

  for (const row of matchedRows) {
    const replicaPnl = Number(row.replica.pnl);
    const bingxGross = Number(row.vst.grossPnl);
    const gap = bingxGross - replicaPnl;
    totals.replicaPnl += replicaPnl;
    totals.bingxGross += bingxGross;

    const attribution = matchedRowAttribution(row);
    if (attribution) {
      decomposableRows += 1;
      totals.sheetAccounting += attribution.sheetAccounting;
      totals.entryExecution += attribution.entryExecution;
      totals.exitExecution += attribution.exitExecution;
      totals.sizeAndFills += attribution.sizeAndFills;
      rowAttributions.push({
        id: row.id || null,
        orderNumber: row.orderNumber ?? null,
        symbol: row.symbol || '',
        direction: row.direction || '',
        replicaPnl: roundMoney(replicaPnl),
        bingxGross: roundMoney(bingxGross),
        gap: roundMoney(gap),
        entryImpact: roundMoney(attribution.entryExecution),
        exitImpact: roundMoney(attribution.exitExecution),
        sizeAndFillsImpact: roundMoney(attribution.sizeAndFills),
        sheetEntry: nullableNumber(row.sheet.entry),
        bingxEntry: nullableNumber(row.vst.entry),
        sheetExit: nullableNumber(row.sheet.exit),
        bingxExit: nullableNumber(row.vst.exit),
        closeKind: String(row.vst.closeKind || 'other')
      });
    } else {
      totals.insufficientEvidence += gap;
    }

    addMatchedGapGroup(bySymbol, row.symbol || 'Sin activo', {
      replicaPnl,
      bingxGross,
      gap,
      attribution
    });
    addMatchedGapGroup(byCloseKind, String(row.vst.closeKind || 'other'), {
      replicaPnl,
      bingxGross,
      gap,
      attribution
    });
  }

  const incompleteRows = matchedRows.length - decomposableRows;
  const steps = [
    bridgeStep('sheet_accounting', 'Contabilidad de la hoja', totals.sheetAccounting, decomposableRows),
    bridgeStep('entry_execution', 'Diferencia de entrada', totals.entryExecution, decomposableRows),
    bridgeStep('exit_execution', 'Diferencia de salida', totals.exitExecution, decomposableRows),
    bridgeStep('size_and_fills', 'Cantidad y fills', totals.sizeAndFills, decomposableRows),
    bridgeStep('insufficient_evidence', 'Evidencia incompleta', totals.insufficientEvidence, incompleteRows)
  ];
  const replicaPnl = roundMoney(totals.replicaPnl);
  const bingxGross = roundMoney(totals.bingxGross);
  const reconstructedGross = roundMoney(replicaPnl + sumFinite(steps.map((step) => step.value)));
  const residual = roundMoney(bingxGross - reconstructedGross);

  return {
    replicaPnl,
    bingxGross,
    gap: roundMoney(bingxGross - replicaPnl),
    reconstructedGross,
    residual,
    reconciled: Math.abs(residual) <= 0.01,
    counts: {
      matched: matchedRows.length,
      decomposable: decomposableRows,
      incomplete: incompleteRows
    },
    steps,
    bySymbol: matchedGapGroups(bySymbol),
    byCloseKind: matchedGapGroups(byCloseKind),
    topRows: rowAttributions
      .sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap))
      .slice(0, 8)
  };
}

export function buildExecutionRouteAnalysis(rows = []) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const matchedRows = sourceRows.filter((row) => (
    Boolean(row?.sheet)
    && nullableNumber(row?.replica?.pnl) !== null
    && nullableNumber(row?.vst?.grossPnl) !== null
  ));
  const observed = summarizeObservedExecutionRoutes(sourceRows);
  const groups = new Map();
  let replicaPnlTotal = 0;
  let bingxGrossTotal = 0;

  for (const row of matchedRows) {
    const route = executionRouteDescriptor(row);
    const replicaPnl = Number(row.replica.pnl);
    const bingxGross = Number(row.vst.grossPnl);
    const gap = bingxGross - replicaPnl;
    const attribution = matchedRowAttribution(row);
    const priceChain = executionPriceChainRowAttribution(row);
    const group = groups.get(route.key) || createExecutionRouteGroup(route);

    replicaPnlTotal += replicaPnl;
    bingxGrossTotal += bingxGross;
    group.rows += 1;
    group.replicaPnl += replicaPnl;
    group.bingxGross += bingxGross;
    group.gap += gap;
    group.fees += Number(row.vst?.openingFee || 0) + Number(row.vst?.closingFee || 0);
    group.funding += Number(row.vst?.funding || 0);
    group.aggregatedRows += Number(row.vst?.aggregatedOpenings || 1) > 1 ? 1 : 0;
    group.stopRows += row.vst?.closeKind === 'stop' ? 1 : 0;
    group.closeFailureEvents += Number(row.vst?.closeFailures?.length || 0);
    group.unprocessedCloseSignals += Number(row.vst?.unprocessedCloses?.length || 0);
    if (attribution) {
      group.decomposableRows += 1;
      group.entryImpact += attribution.entryExecution;
      group.exitImpact += attribution.exitExecution;
      group.sizeAndFillsImpact += attribution.sizeAndFills;
    }
    if (priceChain) {
      const values = priceChain.values;
      group.referenceAndTargetImpact += values.entry_reference + values.exit_target;
      group.preSendMoveImpact += values.entry_quote_move + values.exit_quote_move;
      group.quoteToFillImpact += values.entry_fill + values.exit_fill;
      group.missingTraceImpact += values.entry_missing_evidence + values.exit_missing_evidence;
      group.fullExitPathRows += priceChain.fullExitPath ? 1 : 0;
    }

    const latencyEventId = row.trace?.closeSignalEventId || row.trace?.closeEventId || row.id;
    const detectedAt = Date.parse(row.vst?.closingDetectedAt || '');
    const completedAt = Date.parse(row.vst?.closeSignalAt || '');
    if (latencyEventId
      && !group.latencyEventIds.has(latencyEventId)
      && Number.isFinite(detectedAt)
      && Number.isFinite(completedAt)
      && completedAt >= detectedAt) {
      group.latencyEventIds.add(latencyEventId);
      group.closeLatencies.push((completedAt - detectedAt) / 1000);
    }
    groups.set(route.key, group);
  }

  const routeGroups = [...groups.values()]
    .map(finalizeExecutionRouteGroup)
    .sort((left, right) => (
      executionRouteOrder(left.key) - executionRouteOrder(right.key)
      || Math.abs(Number(right.gap || 0)) - Math.abs(Number(left.gap || 0))
    ));
  const families = summarizeExecutionRouteFamilies(routeGroups);
  const replicaPnl = roundMoney(replicaPnlTotal);
  const bingxGross = roundMoney(bingxGrossTotal);
  const gap = roundMoney(bingxGross - replicaPnl);
  const reconstructedGap = roundMoney(sumFinite(routeGroups.map((group) => group.gap)));
  const residual = roundMoney(gap - reconstructedGap);

  return {
    replicaPnl,
    bingxGross,
    gap,
    reconstructedGap,
    residual,
    reconciled: Math.abs(residual) <= 0.01,
    counts: {
      matched: matchedRows.length,
      routes: routeGroups.length,
      historicalIncidentRows: families.find((family) => family.key === 'historical_defect')?.rows || 0,
      guardRetryRows: families.find((family) => family.key === 'guard_retry')?.rows || 0,
      evidenceGapRows: families.find((family) => family.key === 'evidence_gap')?.rows || 0,
      observedClosed: observed.closedRows,
      historicalIncidentObservedRows: observed.families.find((family) => family.key === 'historical_defect')?.rows || 0,
      guardRetryObservedRows: observed.families.find((family) => family.key === 'guard_retry')?.rows || 0,
      evidenceGapObservedRows: observed.families.find((family) => family.key === 'evidence_gap')?.rows || 0
    },
    families,
    groups: routeGroups,
    observed,
    topRows: matchedRows
      .map((row) => {
        const route = executionRouteDescriptor(row);
        const replica = Number(row.replica.pnl);
        const gross = Number(row.vst.grossPnl);
        return {
          id: row.id || null,
          orderNumber: row.orderNumber ?? null,
          symbol: row.symbol || '',
          route: route.key,
          routeLabel: route.label,
          replicaPnl: roundMoney(replica),
          bingxGross: roundMoney(gross),
          gap: roundMoney(gross - replica),
          closingAt: row.vst?.closingAt || null
        };
      })
      .sort((left, right) => Math.abs(Number(right.gap || 0)) - Math.abs(Number(left.gap || 0)))
      .slice(0, 8)
  };
}

export function buildExecutionPriceChainAttribution(rows = []) {
  const matchedRows = (Array.isArray(rows) ? rows : []).filter((row) => (
    Boolean(row?.sheet)
    && nullableNumber(row?.replica?.pnl) !== null
    && nullableNumber(row?.vst?.grossPnl) !== null
  ));
  const stepKeys = [
    'sheet_accounting',
    'entry_reference',
    'entry_quote_move',
    'entry_fill',
    'entry_missing_evidence',
    'exit_target',
    'exit_quote_move',
    'exit_fill',
    'exit_missing_evidence',
    'size_and_fills',
    'insufficient_evidence'
  ];
  const totals = Object.fromEntries(stepKeys.map((key) => [key, 0]));
  const stepCounts = Object.fromEntries(stepKeys.map((key) => [key, 0]));
  let replicaPnlTotal = 0;
  let bingxGrossTotal = 0;
  let decomposableRows = 0;
  let fullEntryPath = 0;
  let fullExitPath = 0;

  for (const row of matchedRows) {
    const replicaPnl = Number(row.replica.pnl);
    const bingxGross = Number(row.vst.grossPnl);
    replicaPnlTotal += replicaPnl;
    bingxGrossTotal += bingxGross;
    const attribution = executionPriceChainRowAttribution(row);
    if (!attribution) {
      totals.insufficient_evidence += bingxGross - replicaPnl;
      stepCounts.insufficient_evidence += 1;
      continue;
    }
    decomposableRows += 1;
    fullEntryPath += attribution.fullEntryPath ? 1 : 0;
    fullExitPath += attribution.fullExitPath ? 1 : 0;
    for (const [key, value] of Object.entries(attribution.values)) {
      totals[key] += value;
    }
    for (const key of attribution.evidence) {
      stepCounts[key] += 1;
    }
  }

  const labels = {
    sheet_accounting: 'Contabilidad de la hoja',
    entry_reference: 'Referencia de entrada',
    entry_quote_move: 'Señal a cotización',
    entry_fill: 'Cotización a fill de entrada',
    entry_missing_evidence: 'Entrada sin traza intermedia',
    exit_target: 'Objetivo de salida',
    exit_quote_move: 'Objetivo a cotización',
    exit_fill: 'Cotización a fill de salida',
    exit_missing_evidence: 'Salida sin traza intermedia',
    size_and_fills: 'Cantidad y fills',
    insufficient_evidence: 'Evidencia base incompleta'
  };
  const steps = stepKeys.map((key) => bridgeStep(
    key,
    labels[key],
    totals[key],
    stepCounts[key]
  ));
  const replicaPnl = roundMoney(replicaPnlTotal);
  const bingxGross = roundMoney(bingxGrossTotal);
  const reconstructedGross = roundMoney(replicaPnl + sumFinite(steps.map((step) => step.value)));
  const rawResidual = bingxGross - reconstructedGross;
  const residual = Math.abs(rawResidual) <= 0.0000001 ? 0 : roundMoney(rawResidual);

  return {
    replicaPnl,
    bingxGross,
    gap: roundMoney(bingxGross - replicaPnl),
    reconstructedGross,
    residual,
    reconciled: Math.abs(residual) <= 0.01,
    counts: {
      matched: matchedRows.length,
      decomposable: decomposableRows,
      incomplete: matchedRows.length - decomposableRows,
      fullEntryPath,
      fullExitPath
    },
    entryImpact: roundMoney(
      totals.entry_reference
      + totals.entry_quote_move
      + totals.entry_fill
      + totals.entry_missing_evidence
    ),
    exitImpact: roundMoney(
      totals.exit_target
      + totals.exit_quote_move
      + totals.exit_fill
      + totals.exit_missing_evidence
    ),
    steps,
    mainDrags: steps
      .filter((step) => Number(step.value) < -0.0000001)
      .sort((left, right) => Number(left.value) - Number(right.value))
      .slice(0, 4)
  };
}

export function buildEntryExecutionAnalysis(rows = [], { tolerancePercent = 0.15 } = {}) {
  const tolerance = Math.max(0, Number(tolerancePercent) || 0.15);
  const points = assignEntryPackageSlots(uniqueEntryExecutionPoints(rows));
  const totals = summarizeEntryExecutionGroup('all', 'Todas las aperturas', points, tolerance);
  const bySymbol = groupedEntryExecution(points, (point) => point.symbol)
    .map(([key, items]) => summarizeEntryExecutionGroup(key, key, items, tolerance))
    .sort(compareEntryExecutionGroups);
  const routeLabels = {
    immediate: 'Sin espera de reintento',
    retried: 'Con espera de reintento',
    unknown: 'Sin latencia completa'
  };
  const routeOrder = ['immediate', 'retried', 'unknown'];
  const byRouteMap = new Map(groupedEntryExecution(points, (point) => point.route));
  const byRoute = routeOrder
    .filter((key) => byRouteMap.has(key))
    .map((key) => summarizeEntryExecutionGroup(key, routeLabels[key], byRouteMap.get(key), tolerance));
  const latencyLabels = {
    under_5s: 'Hasta 5 s',
    from_5_to_30s: 'De 5 a 30 s',
    from_30_to_120s: 'De 30 a 120 s',
    over_120s: 'Más de 120 s',
    unknown: 'Sin latencia completa'
  };
  const latencyOrder = ['under_5s', 'from_5_to_30s', 'from_30_to_120s', 'over_120s', 'unknown'];
  const latencyMap = new Map(groupedEntryExecution(points, (point) => point.latencyBucket));
  const byLatency = latencyOrder
    .filter((key) => latencyMap.has(key))
    .map((key) => summarizeEntryExecutionGroup(key, latencyLabels[key], latencyMap.get(key), tolerance));
  const timeLabels = {
    night: '00:00–05:59',
    morning: '06:00–11:59',
    afternoon: '12:00–17:59',
    evening: '18:00–23:59',
    unknown: 'Hora desconocida'
  };
  const timeOrder = ['night', 'morning', 'afternoon', 'evening', 'unknown'];
  const timeMap = new Map(groupedEntryExecution(points, (point) => point.timeWindow));
  const byTimeWindow = timeOrder
    .filter((key) => timeMap.has(key))
    .map((key) => summarizeEntryExecutionGroup(key, timeLabels[key], timeMap.get(key), tolerance));
  const packageSlotLabels = {
    slot_1: 'Primera del paquete',
    slot_2: 'Segunda del paquete',
    slot_3: 'Tercera del paquete',
    slot_4_plus: 'Cuarta o posterior',
    unknown: 'Posición desconocida'
  };
  const packageSlotOrder = ['slot_1', 'slot_2', 'slot_3', 'slot_4_plus', 'unknown'];
  const packageSlotMap = new Map(groupedEntryExecution(points, (point) => point.packageSlotKey));
  const byPackageSlot = packageSlotOrder
    .filter((key) => packageSlotMap.has(key))
    .map((key) => summarizeEntryExecutionGroup(key, packageSlotLabels[key], packageSlotMap.get(key), tolerance));

  return {
    tolerancePercent: roundMoney(tolerance),
    timezone: 'Europe/Madrid',
    exchangeTimestampPrecisionSeconds: 1,
    totals,
    bySymbol,
    byRoute,
    byLatency,
    byTimeWindow,
    byPackageSlot
  };
}

export function buildCloseExecutionAnalysis(rows = [], { tolerancePercent = 0.15 } = {}) {
  const tolerance = Math.max(0, Number(tolerancePercent) || 0.15);
  const points = uniqueCloseExecutionPoints(rows);
  const totals = summarizeCloseExecutionGroup('all', 'Todos los cierres explícitos', points, tolerance);
  const bySymbol = groupedEntryExecution(points, (point) => point.symbol)
    .map(([key, items]) => summarizeCloseExecutionGroup(key, key, items, tolerance))
    .sort((left, right) => Number(right.closes || 0) - Number(left.closes || 0) || left.key.localeCompare(right.key));
  return {
    tolerancePercent: roundMoney(tolerance),
    exchangeTimestampPrecisionSeconds: 1,
    totals,
    bySymbol
  };
}

export function summarizeExecutionLatency(rows = []) {
  return {
    opening: summarizeLatencyPhase(rows, {
      eventId: (row) => row?.trace?.openingEventId,
      detectedAt: (row) => row?.vst?.openingDetectedAt,
      firstAttemptAt: (row) => row?.vst?.openingFirstAttemptAt,
      completedAt: (row) => row?.vst?.openingAt
    }),
    closing: summarizeLatencyPhase(rows, {
      eventId: (row) => row?.trace?.closeSignalEventId,
      detectedAt: (row) => row?.vst?.closingDetectedAt,
      firstAttemptAt: (row) => row?.vst?.closingFirstAttemptAt,
      completedAt: (row) => row?.vst?.closeSignalAt
    })
  };
}

function uniqueCloseExecutionPoints(rows = []) {
  const unique = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const telemetry = row?.vst?.closeTelemetry || null;
    const closeSignalAt = row?.vst?.closeSignalAt || null;
    if (!telemetry && !closeSignalAt) {
      continue;
    }
    const eventId = row?.trace?.closeSignalEventId
      || [row?.vst?.closePostUrl, row?.symbol, closeSignalAt].filter(Boolean).join('|');
    if (!eventId || !row?.symbol) {
      continue;
    }
    const key = `${eventId}|${row.symbol}`;
    const point = closeExecutionPoint(row, eventId);
    const existing = unique.get(key);
    if (!existing || closeExecutionEvidenceScore(point) > closeExecutionEvidenceScore(existing)) {
      unique.set(key, point);
    }
  }
  return [...unique.values()];
}

function closeExecutionPoint(row, eventId) {
  const direction = String(row?.direction || '').toUpperCase();
  const telemetry = row?.vst?.closeTelemetry || null;
  const topOfBook = telemetry?.topOfBook || null;
  const executableQuote = direction === 'SHORT'
    ? positiveNumber(topOfBook?.askPrice)
    : positiveNumber(topOfBook?.bidPrice);
  const quoteAvailable = Boolean(topOfBook?.available) && !topOfBook?.stale && executableQuote !== null;
  const lastPrice = positiveNumber(telemetry?.preCloseMarketRead?.price)
    ?? positiveNumber(telemetry?.positionMarketPrice)
    ?? positiveNumber(row?.vst?.preCloseMarket);
  const fill = positiveNumber(row?.vst?.exit);
  const target = positiveNumber(row?.vst?.closeTarget);
  const detectedAt = validTimestamp(row?.vst?.closingDetectedAt);
  const closeSignalAt = validTimestamp(row?.vst?.closeSignalAt);
  const orderRequestStartedAt = validTimestamp(telemetry?.orderRequest?.startedAt);
  const fillAt = validTimestamp(row?.vst?.closingAt);
  const quoteTiming = executionQuoteTiming(topOfBook, orderRequestStartedAt, quoteAvailable);
  return {
    eventId,
    symbol: row?.symbol || 'UNKNOWN',
    direction,
    target,
    lastPrice,
    fill,
    telemetryCaptured: Boolean(telemetry),
    topOfBookCaptured: quoteAvailable,
    topOfBookStale: Boolean(topOfBook?.stale),
    executableQuote: quoteAvailable ? executableQuote : null,
    spreadPercent: quoteAvailable ? nullableNumber(topOfBook?.spreadPercent) : null,
    quoteAgeMs: quoteAvailable ? nullableNumber(topOfBook?.ageMs) : null,
    ...quoteTiming,
    lastToExecutableAdversePercent: quoteAvailable
      ? closeAdverseDeviationPercent({ actual: executableQuote, reference: lastPrice, direction })
      : null,
    lastToExecutableSignedPercent: quoteAvailable
      ? closeSignedDeviationPercent({ actual: executableQuote, reference: lastPrice, direction })
      : null,
    executableToFillAdversePercent: quoteAvailable
      ? closeAdverseDeviationPercent({ actual: fill, reference: executableQuote, direction })
      : null,
    executableToFillSignedPercent: quoteAvailable
      ? closeSignedDeviationPercent({ actual: fill, reference: executableQuote, direction })
      : null,
    tickerRoundTripMs: nullableNumber(telemetry?.preCloseMarketRead?.roundTripMs),
    orderRequestRoundTripMs: nullableNumber(telemetry?.orderRequest?.roundTripMs),
    detectedToRequestSeconds: timestampDeltaSeconds(orderRequestStartedAt, detectedAt),
    signalToRequestSeconds: timestampDeltaSeconds(orderRequestStartedAt, closeSignalAt),
    requestToFillSeconds: timestampDeltaSeconds(fillAt, orderRequestStartedAt, { precisionToleranceSeconds: 2 })
  };
}

function closeExecutionEvidenceScore(point = {}) {
  return [
    point.target,
    point.lastPrice,
    point.executableQuote,
    point.fill,
    point.orderRequestRoundTripMs,
    point.requestToFillSeconds
  ].filter((value) => value !== null && value !== undefined).length;
}

function summarizeCloseExecutionGroup(key, label, points, tolerancePercent) {
  const items = Array.isArray(points) ? points : [];
  const requestToFill = entryValueStats(items.map((point) => point.requestToFillSeconds), { allowNegative: false });
  const signalToRequest = entryValueStats(items.map((point) => point.signalToRequestSeconds), { allowNegative: false });
  const executableToFill = entryPercentStats(items.map((point) => point.executableToFillAdversePercent));
  return {
    key,
    label,
    closes: items.length,
    instrumented: items.filter((point) => point.telemetryCaptured).length,
    topOfBookMeasured: items.filter((point) => point.topOfBookCaptured).length,
    aboveTolerance: items.filter((point) => (
      point.executableToFillAdversePercent !== null
      && point.executableToFillAdversePercent > tolerancePercent
    )).length,
    aboveTolerancePercent: executableToFill.count
      ? roundMoney(items.filter((point) => (
        point.executableToFillAdversePercent !== null
        && point.executableToFillAdversePercent > tolerancePercent
      )).length / executableToFill.count * 100)
      : null,
    microstructure: summarizeEntryMicrostructure(items),
    latency: {
      signalToRequest,
      requestToFill
    }
  };
}

function uniqueEntryExecutionPoints(rows = []) {
  const unique = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const openingAt = row?.vst?.openingAt || null;
    const eventId = String(
      row?.trace?.openingEventId
      || row?.trace?.openingOrderId
      || (openingAt ? `${row?.symbol || ''}|${openingAt}|${row?.vst?.entry || ''}` : '')
    ).trim();
    if (!eventId) {
      continue;
    }
    const candidate = entryExecutionPoint(row, eventId);
    const existing = unique.get(eventId);
    if (!existing || entryExecutionEvidenceScore(candidate) > entryExecutionEvidenceScore(existing)) {
      unique.set(eventId, candidate);
    }
  }
  return [...unique.values()];
}

function entryExecutionPoint(row, eventId) {
  const direction = String(row?.direction || '').toUpperCase();
  const signal = positiveNumber(row?.vst?.signalEntry);
  const quote = positiveNumber(row?.vst?.preOrderMarket);
  const fill = positiveNumber(row?.vst?.entry);
  const detectedAt = validTimestamp(row?.vst?.openingDetectedAt);
  const firstAttemptAt = validTimestamp(row?.vst?.openingFirstAttemptAt);
  const successfulAttemptAt = validTimestamp(row?.vst?.openingAttemptAt || row?.vst?.openingAt);
  const exchangeFillAt = validTimestamp(row?.vst?.openingFillAt);
  const telemetry = row?.vst?.entryTelemetry || null;
  const topOfBook = telemetry?.topOfBook || null;
  const packageObservation = telemetry?.packageObservation || null;
  const packageStartQuote = packageObservation?.startQuote || null;
  const orderRequestStartedAt = validTimestamp(telemetry?.orderRequest?.startedAt);
  const packageStartedAt = validTimestamp(packageObservation?.startedAt);
  const executableQuote = direction === 'SHORT'
    ? positiveNumber(topOfBook?.bidPrice)
    : positiveNumber(topOfBook?.askPrice);
  const quoteAvailable = Boolean(topOfBook?.available) && !topOfBook?.stale && executableQuote !== null;
  const packageStartExecutableQuote = direction === 'SHORT'
    ? positiveNumber(packageStartQuote?.bidPrice)
    : positiveNumber(packageStartQuote?.askPrice);
  const packageStartQuoteAvailable = Boolean(packageStartQuote?.available)
    && !packageStartQuote?.stale
    && packageStartExecutableQuote !== null;
  const packageQueueWaitMs = [packageStartedAt, orderRequestStartedAt].every(Number.isFinite)
    && orderRequestStartedAt >= packageStartedAt
    ? orderRequestStartedAt - packageStartedAt
    : null;
  const validQueueTiming = [detectedAt, firstAttemptAt, successfulAttemptAt].every(Number.isFinite)
    && firstAttemptAt >= detectedAt
    && successfulAttemptAt >= firstAttemptAt;
  const reactionSeconds = validQueueTiming ? (firstAttemptAt - detectedAt) / 1000 : null;
  const retryWaitSeconds = validQueueTiming ? (successfulAttemptAt - firstAttemptAt) / 1000 : null;
  const attemptToFillSeconds = timestampDeltaSeconds(exchangeFillAt, successfulAttemptAt, { precisionToleranceSeconds: 2 });
  const preparationSeconds = timestampDeltaSeconds(orderRequestStartedAt, successfulAttemptAt);
  const requestToFillSeconds = timestampDeltaSeconds(exchangeFillAt, orderRequestStartedAt, { precisionToleranceSeconds: 2 });
  const detectedToFillSeconds = timestampDeltaSeconds(exchangeFillAt, detectedAt, { precisionToleranceSeconds: 2 });
  const totalLatencySeconds = detectedToFillSeconds
    ?? (validQueueTiming ? (successfulAttemptAt - detectedAt) / 1000 : null);
  const attribution = executionPriceChainRowAttribution(row);
  const quoteTiming = executionQuoteTiming(topOfBook, orderRequestStartedAt, quoteAvailable);
  const entryImpact = attribution
    ? sumFinite([
        attribution.values.entry_reference,
        attribution.values.entry_quote_move,
        attribution.values.entry_fill,
        attribution.values.entry_missing_evidence
      ])
    : null;

  return {
    id: eventId,
    postId: entryExecutionPostId(row),
    successfulAttemptAt: Number.isFinite(successfulAttemptAt) ? successfulAttemptAt : null,
    exchangeFillAt: Number.isFinite(exchangeFillAt) ? exchangeFillAt : null,
    symbol: String(row?.symbol || 'UNKNOWN').toUpperCase(),
    direction,
    signal,
    quote,
    fill,
    totalAdversePercent: nullableNumber(row?.vst?.entrySlippagePercent)
      ?? entryAdverseDeviationPercent({ actual: fill, reference: signal, direction }),
    totalSignedPercent: entrySignedDeviationPercent({ actual: fill, reference: signal, direction }),
    signalToQuoteAdversePercent: entryAdverseDeviationPercent({ actual: quote, reference: signal, direction }),
    signalToQuoteSignedPercent: entrySignedDeviationPercent({ actual: quote, reference: signal, direction }),
    quoteToFillAdversePercent: entryAdverseDeviationPercent({ actual: fill, reference: quote, direction }),
    quoteToFillSignedPercent: entrySignedDeviationPercent({ actual: fill, reference: quote, direction }),
    telemetryCaptured: Boolean(telemetry),
    topOfBookCaptured: quoteAvailable,
    topOfBookStale: Boolean(topOfBook?.stale),
    executableQuote: quoteAvailable ? executableQuote : null,
    spreadPercent: quoteAvailable ? nullableNumber(topOfBook?.spreadPercent) : null,
    quoteAgeMs: quoteAvailable ? nullableNumber(topOfBook?.ageMs) : null,
    ...quoteTiming,
    lastToExecutableAdversePercent: quoteAvailable
      ? entryAdverseDeviationPercent({ actual: executableQuote, reference: quote, direction })
      : null,
    lastToExecutableSignedPercent: quoteAvailable
      ? entrySignedDeviationPercent({ actual: executableQuote, reference: quote, direction })
      : null,
    executableToFillAdversePercent: quoteAvailable
      ? entryAdverseDeviationPercent({ actual: fill, reference: executableQuote, direction })
      : null,
    executableToFillSignedPercent: quoteAvailable
      ? entrySignedDeviationPercent({ actual: fill, reference: executableQuote, direction })
      : null,
    packageSlot: positiveInteger(packageObservation?.slot),
    packageSize: positiveInteger(packageObservation?.size),
    packageStartedAt: Number.isFinite(packageStartedAt) ? packageStartedAt : null,
    packageStartQuoteCaptured: packageStartQuoteAvailable,
    packageStartQuoteStale: Boolean(packageStartQuote?.stale),
    packageStartExecutableQuote: packageStartQuoteAvailable ? packageStartExecutableQuote : null,
    packageQueueWaitMs,
    packageStartToPreOrderAdversePercent: packageStartQuoteAvailable && quoteAvailable
      ? entryAdverseDeviationPercent({ actual: executableQuote, reference: packageStartExecutableQuote, direction })
      : null,
    packageStartToPreOrderSignedPercent: packageStartQuoteAvailable && quoteAvailable
      ? entrySignedDeviationPercent({ actual: executableQuote, reference: packageStartExecutableQuote, direction })
      : null,
    tickerRoundTripMs: nullableNumber(telemetry?.preOrderMarketRead?.roundTripMs),
    orderRequestRoundTripMs: nullableNumber(telemetry?.orderRequest?.roundTripMs),
    preparationSeconds,
    requestToFillSeconds,
    reactionSeconds,
    retryWaitSeconds,
    attemptToFillSeconds,
    totalLatencySeconds,
    exchangeTimingBacked: Number.isFinite(exchangeFillAt),
    route: retryWaitSeconds === null ? 'unknown' : retryWaitSeconds > 0.5 ? 'retried' : 'immediate',
    latencyBucket: entryLatencyBucket(totalLatencySeconds),
    timeWindow: entryTimeWindow(row?.vst?.openingDetectedAt || row?.vst?.openingAt),
    matchedEntryImpact: entryImpact === null ? null : roundMoney(entryImpact)
  };
}

function entryExecutionEvidenceScore(point = {}) {
  return [
    point.signal,
    point.quote,
    point.fill,
    point.executableQuote,
    point.packageStartExecutableQuote,
    point.packageQueueWaitMs,
    point.orderRequestRoundTripMs,
    point.totalAdversePercent,
    point.attemptToFillSeconds,
    point.totalLatencySeconds,
    point.matchedEntryImpact
  ].filter((value) => value !== null && value !== undefined).length;
}

function summarizeEntryExecutionGroup(key, label, points, tolerancePercent) {
  const items = Array.isArray(points) ? points : [];
  const measured = items.filter((point) => point.totalAdversePercent !== null);
  const aboveTolerance = measured.filter((point) => point.totalAdversePercent > tolerancePercent).length;
  const latencyValues = items.map((point) => point.totalLatencySeconds);
  const reactionValues = items.map((point) => point.reactionSeconds);
  const retryWaitValues = items.map((point) => point.retryWaitSeconds);
  const attemptToFillValues = items.map((point) => point.attemptToFillSeconds);
  const preparationValues = items.map((point) => point.preparationSeconds);
  const requestToFillValues = items.map((point) => point.requestToFillSeconds);
  const matchedImpacts = items.map((point) => point.matchedEntryImpact).filter((value) => value !== null);
  const signalToQuote = entryStageStats(items, 'signalToQuote');
  const quoteToFill = entryStageStats(items, 'quoteToFill');
  const adverse = entryPercentStats(measured.map((point) => point.totalAdversePercent));
  const latency = entryValueStats(latencyValues, { allowNegative: false });
  const reaction = entryValueStats(reactionValues, { allowNegative: false });
  const retryWait = entryValueStats(retryWaitValues, { allowNegative: false });
  const attemptToFill = entryValueStats(attemptToFillValues, { allowNegative: false });
  const preparation = entryValueStats(preparationValues, { allowNegative: false });
  const requestToFill = entryValueStats(requestToFillValues, { allowNegative: false });
  const matchedEntryImpact = sumFinite(matchedImpacts);

  return {
    key,
    label,
    openings: items.length,
    measured: measured.length,
    aboveTolerance,
    aboveTolerancePercent: measured.length ? roundMoney(aboveTolerance / measured.length * 100) : null,
    averageAdversePercent: adverse.average,
    medianAdversePercent: adverse.median,
    p95AdversePercent: adverse.p95,
    signalToQuote,
    quoteToFill,
    latency: {
      measured: latency.count,
      exchangeBacked: items.filter((point) => point.exchangeTimingBacked).length,
      retried: items.filter((point) => point.route === 'retried').length,
      averageSeconds: latency.average,
      medianSeconds: latency.median,
      p95Seconds: latency.p95,
      reaction: {
        measured: reaction.count,
        averageSeconds: reaction.average,
        medianSeconds: reaction.median,
        p95Seconds: reaction.p95
      },
      retryWait: {
        measured: retryWait.count,
        averageSeconds: retryWait.average,
        medianSeconds: retryWait.median,
        p95Seconds: retryWait.p95
      },
      attemptToFill: {
        measured: attemptToFill.count,
        averageSeconds: attemptToFill.average,
        medianSeconds: attemptToFill.median,
        p95Seconds: attemptToFill.p95
      },
      preparation: {
        measured: preparation.count,
        averageSeconds: preparation.average,
        medianSeconds: preparation.median,
        p95Seconds: preparation.p95
      },
      requestToFill: {
        measured: requestToFill.count,
        averageSeconds: requestToFill.average,
        medianSeconds: requestToFill.median,
        p95Seconds: requestToFill.p95
      }
    },
    microstructure: summarizeEntryMicrostructure(items),
    matchedEconomicRows: matchedImpacts.length,
    matchedEntryImpact: matchedImpacts.length ? roundMoney(matchedEntryImpact) : null,
    matchedEntryImpactPerRow: matchedImpacts.length ? roundMoney(matchedEntryImpact / matchedImpacts.length) : null
  };
}

function entryStageStats(points, prefix) {
  const adverse = entryPercentStats(points.map((point) => point[`${prefix}AdversePercent`]));
  const signed = entryValueStats(points.map((point) => point[`${prefix}SignedPercent`]));
  return {
    measured: adverse.count,
    averageAdversePercent: adverse.average,
    medianAdversePercent: adverse.median,
    p95AdversePercent: adverse.p95,
    averageSignedPercent: signed.average
  };
}

function summarizeEntryMicrostructure(points = []) {
  const instrumented = points.filter((point) => point.telemetryCaptured).length;
  const topOfBookMeasured = points.filter((point) => point.topOfBookCaptured).length;
  const packageStartQuoteMeasured = points.filter((point) => point.packageStartQuoteCaptured).length;
  const spread = entryPercentStats(points.map((point) => point.spreadPercent));
  const quoteAge = entryValueStats(points.map((point) => point.quoteAgeMs), { allowNegative: false });
  const tickerRoundTrip = entryValueStats(points.map((point) => point.tickerRoundTripMs), { allowNegative: false });
  const orderRequestRoundTrip = entryValueStats(points.map((point) => point.orderRequestRoundTripMs), { allowNegative: false });
  const packageQueueWait = entryValueStats(points.map((point) => point.packageQueueWaitMs), { allowNegative: false });
  const exchangeToReceipt = entryValueStats(points.map((point) => point.exchangeToLocalReceiptMs));
  const receiptToRequest = entryValueStats(points.map((point) => point.localReceiptToRequestMs), { allowNegative: false });
  const exchangeToRequest = entryValueStats(points.map((point) => point.exchangeToRequestMs));
  return {
    instrumented,
    topOfBookMeasured,
    staleQuotes: points.filter((point) => point.topOfBookStale).length,
    coveragePercent: points.length ? roundMoney(topOfBookMeasured / points.length * 100) : null,
    spread: {
      measured: spread.count,
      averagePercent: spread.average,
      medianPercent: spread.median,
      p95Percent: spread.p95
    },
    lastToExecutable: entryTelemetryStageStats(points, 'lastToExecutable'),
    executableToFill: entryTelemetryStageStats(points, 'executableToFill'),
    quoteAgeMs: quoteAge,
    tickerRoundTripMs: tickerRoundTrip,
    orderRequestRoundTripMs: orderRequestRoundTrip,
    exchangeClock: {
      measured: points.filter((point) => point.exchangeTimestampCaptured).length,
      possibleClockSkew: points.filter((point) => (
        point.exchangeTimestampCaptured && Number(point.exchangeToLocalReceiptMs) < 0
      )).length,
      exchangeToLocalReceiptMs: exchangeToReceipt,
      localReceiptToRequestMs: receiptToRequest,
      exchangeToRequestMs: exchangeToRequest
    },
    packageQueue: {
      startQuoteMeasured: packageStartQuoteMeasured,
      staleStartQuotes: points.filter((point) => point.packageStartQuoteStale).length,
      waitMs: packageQueueWait,
      executableMove: entryTelemetryStageStats(points, 'packageStartToPreOrder')
    }
  };
}

function executionQuoteTiming(quote, requestStartedAt, quoteAvailable) {
  const exchangeAt = validTimestamp(quote?.exchangeAt);
  const receivedAt = validTimestamp(quote?.receivedAt);
  const captured = Boolean(quoteAvailable) && [exchangeAt, receivedAt].every(Number.isFinite);
  if (!captured) {
    return {
      exchangeTimestampCaptured: false,
      exchangeToLocalReceiptMs: null,
      localReceiptToRequestMs: null,
      exchangeToRequestMs: null
    };
  }
  const receiptToRequest = Number.isFinite(requestStartedAt) && requestStartedAt >= receivedAt
    ? requestStartedAt - receivedAt
    : null;
  return {
    exchangeTimestampCaptured: true,
    exchangeToLocalReceiptMs: receivedAt - exchangeAt,
    localReceiptToRequestMs: receiptToRequest,
    exchangeToRequestMs: Number.isFinite(requestStartedAt) ? requestStartedAt - exchangeAt : null
  };
}

function entryTelemetryStageStats(points, prefix) {
  const adverse = entryPercentStats(points.map((point) => point[`${prefix}AdversePercent`]));
  const signed = entryValueStats(points.map((point) => point[`${prefix}SignedPercent`]));
  return {
    measured: adverse.count,
    averageAdversePercent: adverse.average,
    medianAdversePercent: adverse.median,
    p95AdversePercent: adverse.p95,
    averageSignedPercent: signed.average
  };
}

function entryPercentStats(values) {
  return entryValueStats(values, { allowNegative: false });
}

function entryValueStats(values, { allowNegative = true } = {}) {
  const sorted = (values || [])
    .map(nullableNumber)
    .filter((value) => value !== null && (allowNegative || value >= 0))
    .sort((left, right) => left - right);
  if (!sorted.length) {
    return { count: 0, average: null, median: null, p95: null };
  }
  const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    count: sorted.length,
    average: roundMoney(average),
    median: roundMoney(sorted[Math.floor((sorted.length - 1) * 0.5)]),
    p95: roundMoney(sorted[Math.floor((sorted.length - 1) * 0.95)])
  };
}

function groupedEntryExecution(points, selector) {
  const groups = new Map();
  for (const point of points || []) {
    const key = selector(point) || 'unknown';
    const items = groups.get(key) || [];
    items.push(point);
    groups.set(key, items);
  }
  return [...groups.entries()];
}

function assignEntryPackageSlots(points = []) {
  const packages = new Map();
  for (const point of points) {
    if (positiveInteger(point.packageSlot)) {
      point.packageSlotKey = entryPackageSlotKey(point.packageSlot);
      continue;
    }
    if (!point.postId) {
      point.packageSlot = null;
      point.packageSlotKey = 'unknown';
      continue;
    }
    const items = packages.get(point.postId) || [];
    items.push(point);
    packages.set(point.postId, items);
  }
  for (const items of packages.values()) {
    items.sort((left, right) => (
      Number(left.successfulAttemptAt || left.exchangeFillAt || 0)
      - Number(right.successfulAttemptAt || right.exchangeFillAt || 0)
      || left.id.localeCompare(right.id)
    ));
    items.forEach((point, index) => {
      point.packageSlot = index + 1;
      point.packageSlotKey = entryPackageSlotKey(index + 1);
    });
  }
  return points;
}

function entryPackageSlotKey(slot) {
  return Number(slot) >= 4 ? 'slot_4_plus' : `slot_${Number(slot)}`;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function entryExecutionPostId(row = {}) {
  const explicit = String(row?.trace?.openingPostId || '').trim();
  if (explicit) {
    return explicit;
  }
  const executionKey = String(row?.trace?.executionKey || '');
  const parts = executionKey.split('|');
  return parts.length > 1 ? String(parts[1] || '').trim() || null : null;
}

function timestampDeltaSeconds(later, earlier, { precisionToleranceSeconds = 0 } = {}) {
  if (![later, earlier].every(Number.isFinite)) {
    return null;
  }
  const delta = (later - earlier) / 1000;
  if (delta < -Math.max(0, Number(precisionToleranceSeconds) || 0)) {
    return null;
  }
  return Math.max(0, delta);
}

function compareEntryExecutionGroups(left, right) {
  return Number(right.averageAdversePercent ?? -1) - Number(left.averageAdversePercent ?? -1)
    || Number(right.aboveTolerancePercent ?? -1) - Number(left.aboveTolerancePercent ?? -1)
    || right.openings - left.openings
    || left.key.localeCompare(right.key);
}

function validTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

function entryLatencyBucket(seconds) {
  const value = nullableNumber(seconds);
  if (value === null || value < 0) return 'unknown';
  if (value <= 5) return 'under_5s';
  if (value <= 30) return 'from_5_to_30s';
  if (value <= 120) return 'from_30_to_120s';
  return 'over_120s';
}

function entryTimeWindow(value) {
  const timestamp = validTimestamp(value);
  if (!Number.isFinite(timestamp)) {
    return 'unknown';
  }
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(timestamp)).find((part) => part.type === 'hour');
  const hour = Number(hourPart?.value);
  if (!Number.isFinite(hour)) return 'unknown';
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function executionPriceChainRowAttribution(row = {}) {
  const sheetEntry = positiveNumber(row?.sheet?.entry);
  const sheetExit = positiveNumber(row?.sheet?.exit);
  const bingxEntry = positiveNumber(row?.vst?.entry);
  const bingxExit = positiveNumber(row?.vst?.exit);
  const notional = positiveNumber(row?.replica?.notional);
  const leverage = positiveNumber(row?.replica?.leverage);
  const replicaPnl = nullableNumber(row?.replica?.pnl);
  const bingxGross = nullableNumber(row?.vst?.grossPnl);
  if ([sheetEntry, sheetExit, bingxEntry, bingxExit, notional, leverage, replicaPnl, bingxGross].some((value) => value === null)) {
    return null;
  }

  const context = { notional, leverage, direction: row.direction };
  const values = {
    sheet_accounting: linearPositionPnl(context, sheetEntry, sheetExit) - replicaPnl,
    entry_reference: 0,
    entry_quote_move: 0,
    entry_fill: 0,
    entry_missing_evidence: 0,
    exit_target: 0,
    exit_quote_move: 0,
    exit_fill: 0,
    exit_missing_evidence: 0,
    size_and_fills: 0
  };
  const evidence = new Set(['sheet_accounting', 'size_and_fills']);
  const entryImpact = (from, to) => symmetricEntryImpact(context, from, to, sheetExit, bingxExit);
  const exitImpact = (from, to) => symmetricExitImpact(context, from, to, sheetEntry, bingxEntry);

  const signalEntry = positiveNumber(row?.vst?.signalEntry);
  const entryQuote = positiveNumber(row?.vst?.preOrderMarket);
  let entryCursor = sheetEntry;
  if (signalEntry !== null) {
    values.entry_reference += entryImpact(entryCursor, signalEntry);
    evidence.add('entry_reference');
    entryCursor = signalEntry;
  }
  if (entryQuote !== null) {
    const key = signalEntry !== null ? 'entry_quote_move' : 'entry_missing_evidence';
    values[key] += entryImpact(entryCursor, entryQuote);
    evidence.add(key);
    entryCursor = entryQuote;
  }
  if (entryQuote !== null) {
    values.entry_fill += entryImpact(entryCursor, bingxEntry);
    evidence.add('entry_fill');
  } else {
    values.entry_missing_evidence += entryImpact(entryCursor, bingxEntry);
    evidence.add('entry_missing_evidence');
  }

  const closeTarget = positiveNumber(row?.vst?.closeTarget);
  const closeQuote = positiveNumber(row?.vst?.preCloseMarket);
  let exitCursor = sheetExit;
  if (closeTarget !== null) {
    values.exit_target += exitImpact(exitCursor, closeTarget);
    evidence.add('exit_target');
    exitCursor = closeTarget;
  }
  if (closeQuote !== null) {
    const key = closeTarget !== null ? 'exit_quote_move' : 'exit_missing_evidence';
    values[key] += exitImpact(exitCursor, closeQuote);
    evidence.add(key);
    exitCursor = closeQuote;
  }
  if (closeQuote !== null) {
    values.exit_fill += exitImpact(exitCursor, bingxExit);
    evidence.add('exit_fill');
  } else {
    values.exit_missing_evidence += exitImpact(exitCursor, bingxExit);
    evidence.add('exit_missing_evidence');
  }

  values.size_and_fills = bingxGross - linearPositionPnl(context, bingxEntry, bingxExit);
  return {
    values,
    evidence,
    fullEntryPath: signalEntry !== null && entryQuote !== null,
    fullExitPath: closeTarget !== null && closeQuote !== null
  };
}

function symmetricEntryImpact(context, from, to, sheetExit, bingxExit) {
  return 0.5 * (
    (linearPositionPnl(context, to, sheetExit) - linearPositionPnl(context, from, sheetExit))
    + (linearPositionPnl(context, to, bingxExit) - linearPositionPnl(context, from, bingxExit))
  );
}

function symmetricExitImpact(context, from, to, sheetEntry, bingxEntry) {
  return 0.5 * (
    (linearPositionPnl(context, sheetEntry, to) - linearPositionPnl(context, sheetEntry, from))
    + (linearPositionPnl(context, bingxEntry, to) - linearPositionPnl(context, bingxEntry, from))
  );
}

function summarizeLatencyPhase(rows, selectors) {
  const unique = new Map();
  for (const row of rows || []) {
    const eventId = selectors.eventId(row);
    if (!eventId || unique.has(eventId)) {
      continue;
    }
    unique.set(eventId, row);
  }
  const reaction = [];
  const retryWait = [];
  const total = [];
  let retried = 0;
  let delayed = 0;
  for (const row of unique.values()) {
    const detectedAt = Date.parse(selectors.detectedAt(row) || '');
    const firstAttemptAt = Date.parse(selectors.firstAttemptAt(row) || '');
    const completedAt = Date.parse(selectors.completedAt(row) || '');
    if (![detectedAt, firstAttemptAt, completedAt].every(Number.isFinite)
      || firstAttemptAt < detectedAt
      || completedAt < firstAttemptAt) {
      continue;
    }
    const reactionSeconds = (firstAttemptAt - detectedAt) / 1000;
    const retrySeconds = (completedAt - firstAttemptAt) / 1000;
    const totalSeconds = (completedAt - detectedAt) / 1000;
    reaction.push(reactionSeconds);
    retryWait.push(retrySeconds);
    total.push(totalSeconds);
    retried += retrySeconds > 0.5 ? 1 : 0;
    delayed += totalSeconds > 5 ? 1 : 0;
  }
  return {
    events: unique.size,
    measured: total.length,
    retried,
    delayedAbove5Seconds: delayed,
    reaction: latencyStats(reaction),
    retryWait: latencyStats(retryWait),
    total: latencyStats(total)
  };
}

function latencyStats(values = []) {
  const sorted = values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
  const percentile = (ratio) => {
    if (!sorted.length) {
      return null;
    }
    return roundMoney(sorted[Math.floor((sorted.length - 1) * ratio)]);
  };
  return {
    count: sorted.length,
    medianSeconds: percentile(0.5),
    p90Seconds: percentile(0.9),
    p95Seconds: percentile(0.95),
    maxSeconds: sorted.length ? roundMoney(sorted.at(-1)) : null
  };
}

function matchedRowAttribution(row = {}) {
  const sheetEntry = positiveNumber(row?.sheet?.entry);
  const sheetExit = positiveNumber(row?.sheet?.exit);
  const bingxEntry = positiveNumber(row?.vst?.entry);
  const bingxExit = positiveNumber(row?.vst?.exit);
  const notional = positiveNumber(row?.replica?.notional);
  const leverage = positiveNumber(row?.replica?.leverage);
  const replicaPnl = nullableNumber(row?.replica?.pnl);
  const bingxGross = nullableNumber(row?.vst?.grossPnl);
  if ([sheetEntry, sheetExit, bingxEntry, bingxExit, notional, leverage, replicaPnl, bingxGross].some((value) => value === null)) {
    return null;
  }

  const context = { notional, leverage, direction: row.direction };
  const sheetPrices = linearPositionPnl(context, sheetEntry, sheetExit);
  const bingxEntrySheetExit = linearPositionPnl(context, bingxEntry, sheetExit);
  const sheetEntryBingxExit = linearPositionPnl(context, sheetEntry, bingxExit);
  const bingxPrices = linearPositionPnl(context, bingxEntry, bingxExit);

  return {
    sheetAccounting: sheetPrices - replicaPnl,
    entryExecution: 0.5 * (
      (bingxEntrySheetExit - sheetPrices)
      + (bingxPrices - sheetEntryBingxExit)
    ),
    exitExecution: 0.5 * (
      (sheetEntryBingxExit - sheetPrices)
      + (bingxPrices - bingxEntrySheetExit)
    ),
    sizeAndFills: bingxGross - bingxPrices
  };
}

function linearPositionPnl({ notional, leverage, direction }, entry, exit) {
  const multiplier = String(direction || '').toUpperCase() === 'SHORT' ? -1 : 1;
  return notional * leverage * multiplier * (exit - entry) / entry;
}

function addMatchedGapGroup(groups, key, { replicaPnl, bingxGross, gap, attribution }) {
  if (!groups.has(key)) {
    groups.set(key, {
      key,
      rows: 0,
      decomposable: 0,
      replicaPnl: 0,
      bingxGross: 0,
      gap: 0,
      sheetAccountingImpact: 0,
      entryImpact: 0,
      exitImpact: 0,
      sizeAndFillsImpact: 0,
      incompleteImpact: 0
    });
  }
  const group = groups.get(key);
  group.rows += 1;
  group.replicaPnl += replicaPnl;
  group.bingxGross += bingxGross;
  group.gap += gap;
  if (attribution) {
    group.decomposable += 1;
    group.sheetAccountingImpact += attribution.sheetAccounting;
    group.entryImpact += attribution.entryExecution;
    group.exitImpact += attribution.exitExecution;
    group.sizeAndFillsImpact += attribution.sizeAndFills;
  } else {
    group.incompleteImpact += gap;
  }
}

function matchedGapGroups(groups) {
  return [...groups.values()]
    .map((group) => Object.fromEntries(Object.entries(group).map(([key, value]) => (
      typeof value === 'number' && key !== 'rows' && key !== 'decomposable'
        ? [key, roundMoney(value)]
        : [key, value]
    ))))
    .sort((left, right) => Math.abs(Number(right.gap || 0)) - Math.abs(Number(left.gap || 0)));
}

function executionRouteDescriptor(row = {}) {
  const closeFailures = Array.isArray(row.vst?.closeFailures) ? row.vst.closeFailures : [];
  const unprocessedCloses = Array.isArray(row.vst?.unprocessedCloses) ? row.vst.unprocessedCloses : [];
  const failureCategories = new Set(closeFailures.map((failure) => failure?.category).filter(Boolean));
  const stopped = row.vst?.closeKind === 'stop';
  const hasCloseSignal = Boolean(row.vst?.closeSignalAt || row.trace?.closeSignalEventId);

  if (unprocessedCloses.length) {
    return stopped
      ? executionRoute('unprocessed_close_then_stop', 'Cierre no procesado; salida posterior por stop', 'historical_defect')
      : executionRoute('unprocessed_close_then_exit', 'Cierre no procesado; salida posterior', 'historical_defect');
  }
  if (failureCategories.has('close_guard_runtime_error')) {
    return stopped
      ? executionRoute('runtime_error_then_stop', 'Error histórico del guard; salida posterior por stop', 'historical_defect')
      : executionRoute('runtime_error_recovered', 'Error histórico del guard; cierre recuperado', 'historical_defect');
  }
  if (failureCategories.has('close_slippage_guard')) {
    return stopped
      ? executionRoute('guard_retry_then_stop', 'Guard de cierre; salida posterior por stop', 'guard_retry')
      : executionRoute('guard_retry_then_exit', 'Guard de cierre; ejecución posterior', 'guard_retry');
  }
  if (closeFailures.length) {
    return stopped
      ? executionRoute('close_failure_then_stop', 'Cierre fallido; salida posterior por stop', 'close_incident')
      : executionRoute('close_failure_recovered', 'Cierre fallido; ejecución posterior', 'close_incident');
  }
  if (stopped) {
    return executionRoute('stop_before_close', 'Stop antes de otra señal de cierre', 'observed_execution');
  }
  if (hasCloseSignal) {
    return executionRoute('explicit_close', 'Cierre explícito ejecutado', 'observed_execution');
  }
  return executionRoute('no_local_close_evidence', 'Salida sin señal local enlazada', 'evidence_gap');
}

function executionRoute(key, label, family) {
  return { key, label, family };
}

function summarizeObservedExecutionRoutes(rows = []) {
  const groups = new Map();
  const families = new Map();
  let closedRows = 0;
  for (const row of rows) {
    if (nullableNumber(row?.vst?.grossPnl) === null) {
      continue;
    }
    closedRows += 1;
    const route = executionRouteDescriptor(row);
    const group = groups.get(route.key) || { ...route, rows: 0 };
    group.rows += 1;
    groups.set(route.key, group);
    const family = families.get(route.family) || {
      key: route.family,
      label: executionRouteFamilyLabel(route.family),
      rows: 0
    };
    family.rows += 1;
    families.set(route.family, family);
  }
  return {
    closedRows,
    groups: [...groups.values()].sort((left, right) => (
      executionRouteOrder(left.key) - executionRouteOrder(right.key)
    )),
    families: [...families.values()].sort((left, right) => (
      executionRouteFamilyOrder(left.key) - executionRouteFamilyOrder(right.key)
    ))
  };
}

function createExecutionRouteGroup(route) {
  return {
    ...route,
    rows: 0,
    decomposableRows: 0,
    replicaPnl: 0,
    bingxGross: 0,
    gap: 0,
    entryImpact: 0,
    exitImpact: 0,
    sizeAndFillsImpact: 0,
    referenceAndTargetImpact: 0,
    preSendMoveImpact: 0,
    quoteToFillImpact: 0,
    missingTraceImpact: 0,
    fees: 0,
    funding: 0,
    aggregatedRows: 0,
    stopRows: 0,
    closeFailureEvents: 0,
    unprocessedCloseSignals: 0,
    fullExitPathRows: 0,
    latencyEventIds: new Set(),
    closeLatencies: []
  };
}

function finalizeExecutionRouteGroup(group) {
  return {
    key: group.key,
    label: group.label,
    family: group.family,
    rows: group.rows,
    decomposableRows: group.decomposableRows,
    replicaPnl: roundMoney(group.replicaPnl),
    bingxGross: roundMoney(group.bingxGross),
    gap: roundMoney(group.gap),
    entryImpact: roundMoney(group.entryImpact),
    exitImpact: roundMoney(group.exitImpact),
    sizeAndFillsImpact: roundMoney(group.sizeAndFillsImpact),
    referenceAndTargetImpact: roundMoney(group.referenceAndTargetImpact),
    preSendMoveImpact: roundMoney(group.preSendMoveImpact),
    quoteToFillImpact: roundMoney(group.quoteToFillImpact),
    missingTraceImpact: roundMoney(group.missingTraceImpact),
    fees: roundMoney(group.fees),
    funding: roundMoney(group.funding),
    aggregatedRows: group.aggregatedRows,
    stopRows: group.stopRows,
    closeFailureEvents: group.closeFailureEvents,
    unprocessedCloseSignals: group.unprocessedCloseSignals,
    fullExitPathRows: group.fullExitPathRows,
    closeLatency: latencyStats(group.closeLatencies)
  };
}

function summarizeExecutionRouteFamilies(groups = []) {
  const families = new Map();
  for (const group of groups) {
    const family = families.get(group.family) || {
      key: group.family,
      label: executionRouteFamilyLabel(group.family),
      rows: 0,
      replicaPnl: 0,
      bingxGross: 0,
      gap: 0,
      entryImpact: 0,
      exitImpact: 0,
      fees: 0,
      funding: 0
    };
    family.rows += group.rows;
    family.replicaPnl += group.replicaPnl;
    family.bingxGross += group.bingxGross;
    family.gap += group.gap;
    family.entryImpact += group.entryImpact;
    family.exitImpact += group.exitImpact;
    family.fees += group.fees;
    family.funding += group.funding;
    families.set(group.family, family);
  }
  return [...families.values()]
    .map((family) => ({
      ...family,
      replicaPnl: roundMoney(family.replicaPnl),
      bingxGross: roundMoney(family.bingxGross),
      gap: roundMoney(family.gap),
      entryImpact: roundMoney(family.entryImpact),
      exitImpact: roundMoney(family.exitImpact),
      fees: roundMoney(family.fees),
      funding: roundMoney(family.funding)
    }))
    .sort((left, right) => executionRouteFamilyOrder(left.key) - executionRouteFamilyOrder(right.key));
}

function executionRouteFamilyLabel(key) {
  return {
    observed_execution: 'Ejecución observada',
    historical_defect: 'Incidencia histórica corregida',
    guard_retry: 'Reintento protegido',
    close_incident: 'Otra incidencia de cierre',
    evidence_gap: 'Evidencia local incompleta'
  }[key] || key;
}

function executionRouteOrder(key) {
  return {
    explicit_close: 10,
    stop_before_close: 20,
    unprocessed_close_then_stop: 30,
    unprocessed_close_then_exit: 31,
    runtime_error_then_stop: 40,
    runtime_error_recovered: 41,
    guard_retry_then_stop: 50,
    guard_retry_then_exit: 51,
    close_failure_then_stop: 60,
    close_failure_recovered: 61,
    no_local_close_evidence: 70
  }[key] ?? 99;
}

function executionRouteFamilyOrder(key) {
  return {
    observed_execution: 10,
    historical_defect: 20,
    guard_retry: 30,
    close_incident: 40,
    evidence_gap: 50
  }[key] ?? 99;
}

function positiveNumber(value) {
  const number = nullableNumber(value);
  return number !== null && number > 0 ? number : null;
}

function bridgeStep(key, label, value, count) {
  return {
    key,
    label,
    value: roundMoney(value),
    count: count !== null && count !== undefined && Number.isFinite(Number(count))
      ? Number(count)
      : null
  };
}

function hasReplicaGrossPnl(row = {}) {
  return nullableNumber(row?.vst?.grossPnl) !== null;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function openingAttemptKey(event = {}) {
  const signal = event?.signal || {};
  if (signal.action || !event?.postId || !signal.symbol || !signal.direction) {
    return '';
  }
  const entryPrice = Number(signal.entry?.price);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return '';
  }
  return [event.postId, signal.symbol, signal.direction, entryPrice].join('|').toUpperCase();
}

function isOpeningFailureStatus(status = '') {
  const value = String(status || '').toLowerCase();
  return value === 'blocked'
    || value === 'error'
    || value === 'demo_order_retry_expired'
    || value === 'demo_order_failed'
    || value === 'demo_order_rejected';
}

function isCloseFailureStatus(status = '') {
  const value = String(status || '').toLowerCase();
  return value === 'error'
    || value === 'blocked'
    || value === 'demo_close_guarded'
    || value === 'demo_close_guard_expired'
    || value === 'demo_close_retry_expired';
}

function isCloseAction(action = '') {
  const value = String(action || '').toUpperCase();
  return value === 'CLOSE' || value === 'CLOSE_ALL';
}

function closeSignalMatchesEvent(expected = {}, observed = {}) {
  const expectedAction = String(expected?.action || '').toUpperCase();
  const observedAction = String(observed?.action || '').toUpperCase();
  if (!isCloseAction(observedAction)) {
    return false;
  }
  if (expectedAction === 'CLOSE_ALL' || observedAction === 'CLOSE_ALL') {
    return true;
  }
  return String(expected?.symbol || '').toUpperCase() === String(observed?.symbol || '').toUpperCase();
}

function closeFailureCategory(event = {}) {
  const status = String(event.status || '').toLowerCase();
  const reason = String(event.reason || event.error || '');
  if (/CLOSE_GUARD_MIN_NET_PNL|close_guard_error|ReferenceError|is not defined/i.test(reason)) {
    return 'close_guard_runtime_error';
  }
  if (/close_price_slippage/i.test(reason) || status === 'demo_close_guarded') {
    return 'close_slippage_guard';
  }
  if (status.includes('expired')) {
    return 'close_retry_expired';
  }
  return 'exchange_close_error';
}

function openingFailureCategory(reason = '') {
  const value = String(reason || '');
  if (/cost_guard/i.test(value)) {
    return 'cost_guard';
  }
  if (/VST disponible|insufficient margin/i.test(value)) {
    return 'insufficient_vst';
  }
  if (/entry_adverse_deviation/i.test(value)) {
    return 'entry_deviation';
  }
  if (/stop_loss_distance/i.test(value)) {
    return 'stop_distance';
  }
  if (/stop_loss_invalid|SL Price must|invalid_(?:long|short)_stop_loss/i.test(value)) {
    return 'invalid_stop';
  }
  return 'other';
}

export function monitorHealthFinding(health = {}) {
  const level = String(health.level || 'unknown').toLowerCase();
  if (!health.running || health.stale || level === 'error' || level === 'unknown') {
    return {
      severity: 'critical',
      code: 'monitor_unhealthy',
      detail: 'El monitor está parado, obsoleto o sin un estado verificable.'
    };
  }
  const onlyNoVisiblePosts = Boolean(health.noVisiblePosts) && !health.stale && !health.lastError;
  const noVisiblePostsSeconds = Number(health.noVisiblePostsSeconds);
  const noVisiblePostsGraceSeconds = Number(health.noVisiblePostsGraceSeconds);
  if (onlyNoVisiblePosts
    && Number.isFinite(noVisiblePostsSeconds)
    && Number.isFinite(noVisiblePostsGraceSeconds)
    && noVisiblePostsGraceSeconds > 0
    && noVisiblePostsSeconds < noVisiblePostsGraceSeconds) {
    return null;
  }
  if (level !== 'ok') {
    return {
      severity: 'warn',
      code: 'monitor_degraded',
      detail: 'El monitor sigue activo, pero mantiene un aviso transitorio que debe vigilarse.'
    };
  }
  return null;
}

function timestampInWindow(timestamp, startTime, endTime) {
  return Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
}

function latestTimestamp(values = []) {
  const timestamps = values
    .map((value) => Date.parse(value || 0))
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : NaN;
}

export function buildNetEntryShadowAudit({ events = [], config = {} } = {}) {
  const openings = (events || [])
    .filter((event) => event?.status === 'demo_order_sent' && event?.netEntryFilter?.enabled)
    .sort(compareEventTime);
  const closures = uniquePositionClosures(events);
  const usedClosures = new Set();
  const rows = openings.map((opening) => {
    const closure = matchingPositionClosure(opening, closures, usedClosures);
    if (closure?.key) {
      usedClosures.add(closure.key);
    }
    const grossPnl = closure ? positionGrossPnl(closure.event?.exchangePosition) : null;
    const estimatedCost = nonNegativeFinite(opening.netEntryFilter?.estimatedRoundTripCost);
    const estimatedNetPnl = grossPnl === null ? null : roundMoney(grossPnl - estimatedCost);
    return {
      at: opening.at || null,
      symbol: opening.signal?.symbol || null,
      decision: opening.netEntryFilter?.decision || 'enter',
      reason: opening.netEntryFilter?.reason || '',
      closed: grossPnl !== null,
      grossPnl,
      estimatedCost,
      estimatedNetPnl
    };
  });
  const flagged = rows.filter((row) => row.decision === 'avoid_shadow' || row.decision === 'blocked');
  const closedFlagged = flagged.filter((row) => row.closed);
  const closedEntered = rows.filter((row) => row.decision === 'enter' && row.closed);
  const estimatedGrossFlagged = sumFinite(closedFlagged.map((row) => row.grossPnl));
  const estimatedCostFlagged = sumFinite(closedFlagged.map((row) => row.estimatedCost));
  const estimatedNetFlagged = sumFinite(closedFlagged.map((row) => row.estimatedNetPnl));
  const configuredMaxBreakEven = finiteOrNull(config.netEntryFilterMaxBreakEvenMarginPercent);
  const observedLeverage = mostCommonPositiveNumber(openings.map((event) => event.netEntryFilter?.leverage));
  const feeBuffer = positiveFinite(config.costGuardFeeBuffer, 2);
  const feeRate = positiveFinite(openings[0]?.costGuard?.feeRate, 0.0005);
  const inherentBreakEvenMarginPercent = observedLeverage === null
    ? null
    : roundMoney(feeRate * 2 * feeBuffer * observedLeverage * 100);
  const nonDiscriminatingBreakEven = configuredMaxBreakEven !== null
    && configuredMaxBreakEven > 0
    && inherentBreakEvenMarginPercent !== null
    && inherentBreakEvenMarginPercent > configuredMaxBreakEven;
  const reasonCounts = countFailureReasons(flagged);
  const topReason = Object.entries(reasonCounts).sort((left, right) => right[1] - left[1])[0] || null;

  return {
    enabled: config.netEntryFilterEnabled !== false,
    mode: String(config.netEntryFilterMode || 'shadow').toLowerCase() === 'block' ? 'block' : 'shadow',
    sample: rows.length,
    flagged: flagged.length,
    entered: rows.length - flagged.length,
    closed: rows.filter((row) => row.closed).length,
    open: rows.filter((row) => !row.closed).length,
    closedFlagged: closedFlagged.length,
    closedEntered: closedEntered.length,
    winnersFlagged: closedFlagged.filter((row) => Number(row.estimatedNetPnl) > 0).length,
    losersFlagged: closedFlagged.filter((row) => Number(row.estimatedNetPnl) < 0).length,
    estimatedGrossFlagged,
    estimatedCostFlagged,
    estimatedNetFlagged,
    observedLeverage,
    configuredMaxBreakEven,
    inherentBreakEvenMarginPercent,
    nonDiscriminatingBreakEven,
    topReason: topReason ? { reason: topReason[0], count: topReason[1] } : null,
    recommendation: netEntryAuditRecommendation({
      sample: rows.length,
      closedFlagged: closedFlagged.length,
      estimatedNetFlagged,
      nonDiscriminatingBreakEven
    }),
    recent: rows.slice(-8).reverse()
  };
}

function uniquePositionClosures(events = []) {
  const byPosition = new Map();
  for (const event of events || []) {
    if (!['exchange_signal_closed', 'exchange_position_closed', 'exchange_stop_closed'].includes(event?.status)) {
      continue;
    }
    const position = event.exchangePosition;
    const symbol = position?.symbol || event.signal?.symbol;
    if (!position || !symbol) {
      continue;
    }
    const key = position.id || `${symbol}|${position.openedAt || event.at || ''}`;
    const existing = byPosition.get(key);
    if (!existing || positionGrossPnl(position) !== null) {
      byPosition.set(key, { key, event });
    }
  }
  return [...byPosition.values()].sort((left, right) => compareEventTime(left.event, right.event));
}

function matchingPositionClosure(opening, closures, usedClosures) {
  const symbol = String(opening.signal?.symbol || '').toUpperCase();
  const openedAt = Date.parse(opening.at || '');
  if (!symbol || !Number.isFinite(openedAt)) {
    return null;
  }
  const candidates = closures.filter((closure) => {
    if (usedClosures.has(closure.key)) {
      return false;
    }
    const position = closure.event?.exchangePosition || {};
    if (String(position.symbol || closure.event?.signal?.symbol || '').toUpperCase() !== symbol) {
      return false;
    }
    const positionOpenedAt = Date.parse(position.openedAt || '');
    const closedAt = Date.parse(closure.event?.at || '');
    return Number.isFinite(positionOpenedAt)
      ? Math.abs(positionOpenedAt - openedAt) <= 2 * 60 * 1000
      : Number.isFinite(closedAt) && closedAt >= openedAt;
  });
  return candidates.sort((left, right) => {
    const leftOpenedAt = Date.parse(left.event?.exchangePosition?.openedAt || left.event?.at || '');
    const rightOpenedAt = Date.parse(right.event?.exchangePosition?.openedAt || right.event?.at || '');
    return Math.abs(leftOpenedAt - openedAt) - Math.abs(rightOpenedAt - openedAt);
  })[0] || null;
}

function positionGrossPnl(position = {}) {
  const candidates = [position.paperPnl, position.unrealizedPnl, position.realizedPnl];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && (number !== 0 || value !== undefined)) {
      return roundMoney(number);
    }
  }
  return null;
}

function countFailureReasons(rows = []) {
  const counts = {};
  for (const row of rows) {
    const reason = String(row.reason || '').replace(/^net_entry_filter:/, '');
    for (const item of reason.split('|').filter(Boolean)) {
      const key = item.split(':')[0] || item;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function netEntryAuditRecommendation({ sample, closedFlagged, estimatedNetFlagged, nonDiscriminatingBreakEven }) {
  if (!sample) {
    return { key: 'waiting', label: 'Esperando muestra', detail: 'Todavia no hay entradas evaluadas.' };
  }
  if (nonDiscriminatingBreakEven) {
    return {
      key: 'review_threshold',
      label: 'Revisar umbral',
      detail: 'El break-even configurado marca por construccion todas las entradas con el apalancamiento observado.'
    };
  }
  if (closedFlagged < 20) {
    return {
      key: 'measuring',
      label: 'Seguir midiendo',
      detail: `${closedFlagged}/20 operaciones marcadas con cierre; muestra aun exploratoria.`
    };
  }
  if (estimatedNetFlagged < 0) {
    return {
      key: 'candidate_block',
      label: 'Candidata a bloqueo',
      detail: 'La muestra marcada pierde neto estimado; requiere revision humana antes de cambiar el modo.'
    };
  }
  return {
    key: 'keep_shadow',
    label: 'Mantener sombra',
    detail: 'Las operaciones marcadas no muestran una perdida neta que justifique bloquearlas.'
  };
}

function compareEventTime(left, right) {
  return Date.parse(left?.at || 0) - Date.parse(right?.at || 0);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveFinite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function mostCommonPositiveNumber(values = []) {
  const counts = new Map();
  for (const value of values) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      continue;
    }
    counts.set(number, (counts.get(number) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function sumFinite(values = []) {
  return roundMoney(values.reduce((sum, value) => {
    const number = Number(value);
    return Number.isFinite(number) ? sum + number : sum;
  }, 0));
}

function firstValidTimestamp(values) {
  for (const value of values) {
    const timestamp = Date.parse(value || '');
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }
  return NaN;
}

function finiteRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
}
