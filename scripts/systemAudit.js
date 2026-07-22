import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeSignedDeviationPercent, entrySignedDeviationPercent, resolveEntryFill, resolveEntryReference } from '../src/executionAuditPrices.js';
import { parseFuturesSignals } from '../src/futuresSignalParser.js';
import { monitorHealthFinding } from '../src/operationalAudit.js';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dataDir = join(rootDir, '.data');
const reportDir = join(rootDir, 'docs', 'audits');
const dataReportDir = join(dataDir, 'audits');
const month = argument('--month') || localMonthKey();
const generatedAt = new Date().toISOString();

await Promise.all([mkdir(reportDir, { recursive: true }), mkdir(dataReportDir, { recursive: true })]);

const [postsData, eventsData, replicaPayload, operationalPayload, riskPayload, telegramSourcePayload, signalCoveragePayload, promotionGatePayload, eventFile] = await Promise.all([
  readJson(join(dataDir, 'posts.json'), { posts: [] }),
  readJson(join(dataDir, 'trade-events.json'), { events: [] }),
  fetchJson(`/api/replica-audit?month=${encodeURIComponent(month)}&refresh=1`),
  fetchJson('/api/operational-status'),
  fetchJson('/api/risk'),
  fetchJson('/api/telegram-source'),
  fetchJson('/api/signal-coverage'),
  fetchJson('/api/promotion-gate'),
  stat(join(dataDir, 'trade-events.json')).catch(() => null)
]);

const replica = replicaPayload?.audit || null;
const startAt = replica?.window?.startAt || `${month}-01T00:00:00.000Z`;
const endAt = replica?.window?.endAt || generatedAt;
const events = (eventsData.events || []).filter((event) => inWindow(event.at, startAt, endAt));
const posts = (postsData.posts || []).filter((post) => inWindow(post.firstSeenAt || post.scrapedAt, startAt, endAt));
const parsedSignals = parsedPostSignals(posts);
const coverage = buildCoverage(parsedSignals, events);
const entryQuality = summarizeEntries(events);
const closeQuality = summarizeCloses(replica?.rows || []);
const eventSummary = summarizeEvents(events);
const duplicateExecutions = findDuplicateExecutions(events);
const summary = replica?.summary || {};
const report = {
  generatedAt,
  month,
  window: { startAt, endAt },
  runtime: {
    health: pickHealth(operationalPayload?.health),
    exchangeSafety: pickExchangeSafety(operationalPayload?.exchangeSafety),
    bingxClock: pickBingXClock(operationalPayload?.priceFeed?.clock),
    incidents24h: operationalPayload?.incidents?.counts || null,
    risk: pickRisk(riskPayload?.risk),
    configuration: pickConfig(riskPayload?.bingx, telegramSourcePayload?.telegramSource),
    signalCoverage: signalCoveragePayload?.signalCoverage || operationalPayload?.signalCoverage || null,
    promotionGate: promotionGatePayload?.promotionGate || operationalPayload?.promotionGate || null
  },
  data: {
    posts: posts.length,
    parsedSignals: parsedSignals.length,
    events: events.length,
    eventStoreBytes: eventFile?.size || 0
  },
  coverage,
  entryQuality,
  closeQuality,
  eventSummary,
  duplicateExecutions,
  replica: replica ? {
    sheetRows: summary.sheetRows || 0,
    openings: summary.vstOpenings || 0,
    closes: summary.vstCloses || 0,
    sheetPnl: summary.sheetPnl || 0,
    theoreticalReplicaPnl: summary.replicaPnl || 0,
    bingxGross: summary.bingxGross || 0,
    fees: summary.bingxFees || 0,
    funding: summary.bingxFunding || 0,
    net: summary.bingxNet || 0,
    estimatedCommissionRebatePercent: summary.estimatedCommissionRebatePercent || 0,
    estimatedCommissionRebate: summary.estimatedCommissionRebate || 0,
    netAfterEstimatedRebate: summary.bingxNetAfterEstimatedRebate || 0,
    actualCommissionRebate: summary.actualCommissionRebate || 0,
    commissionRebateDetected: Boolean(summary.commissionRebateDetected),
    takerCommissionPercent: summary.takerCommissionPercent ?? null,
    makerCommissionPercent: summary.makerCommissionPercent ?? null,
    aggregatedRows: summary.aggregatedRows || 0,
    aggregatedCycles: summary.aggregatedCycles || 0,
    issueCounts: summary.issueCounts || {},
    signAnalysis: summary.signAnalysis || {},
    fillQuality: summary.fillQuality || {},
    gapBridge: summary.gapBridge || null,
    matchedGapAttribution: summary.matchedGapAttribution || null,
    executionRouteAnalysis: summary.executionRouteAnalysis || null,
    executionPriceChain: summary.executionPriceChain || null,
    executionLatency: summary.executionLatency || null,
    orderHistoryEvidence: summary.orderHistoryEvidence || null,
    orderHistorySource: replica.source?.orderHistory || null,
    missingReasonCounts: summary.missingReasonCounts || {},
    stopAnalysis: summary.stopAnalysis || {},
    unprocessedCloseRows: summary.unprocessedCloseRows || 0,
    unprocessedClosePosts: summary.unprocessedClosePosts || 0,
    referenceCoverage: summary.referenceCoverage || null
  } : null,
  cohort: replica?.cohort ? {
    startedAt: replica.cohort.startedAt,
    generatedAt: replica.cohort.generatedAt,
    sampleStatus: replica.cohort.sampleStatus || null,
    summary: pickCohortSummary(replica.cohort.summary)
  } : null,
  cohortComparison: replica?.cohortComparison || null
};
report.findings = buildFindings(report);

const markdown = renderMarkdown(report);
const archiveName = `system-audit-${localDayKey()}.md`;
await Promise.all([
  writeFile(join(dataReportDir, 'system-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  writeFile(join(reportDir, 'latest.md'), markdown, 'utf8'),
  writeFile(join(reportDir, archiveName), markdown, 'utf8')
]);

console.log(JSON.stringify({
  ok: true,
  month,
  report: join(reportDir, 'latest.md'),
  archive: join(reportDir, archiveName),
  data: join(dataReportDir, 'system-audit.json'),
  findings: report.findings,
  coverage: report.coverage,
  replica: report.replica
}, null, 2));

function parsedPostSignals(posts) {
  const output = [];
  for (const post of posts) {
    for (const signal of parseFuturesSignals(post.text || '').filter((item) => item.isSignal)) {
      output.push({
        postId: post.id || null,
        source: post.source || 'youtube',
        at: post.firstSeenAt || post.scrapedAt || null,
        action: signal.action || 'OPEN',
        symbol: signal.symbol || '',
        direction: signal.direction || '',
        entryPrice: finite(signal.entry?.price),
        stopLoss: finite(signal.stopLoss),
        leverage: finite(signal.leverage)
      });
    }
  }
  return output;
}

function buildCoverage(signals, events) {
  const expectedOpenings = signals.filter((signal) => signal.action === 'OPEN' && signal.source !== 'telegram_web');
  const states = { executed: 0, blocked: 0, skipped: 0, error: 0, missingEvent: 0 };
  const blockedReasons = {};
  for (const signal of expectedOpenings) {
    const matching = events.filter((event) => sameSignal(event, signal));
    if (matching.some((event) => /_order_sent$/.test(String(event.status || '')))) {
      states.executed += 1;
      continue;
    }
    const blocked = matching.find((event) => event.status === 'blocked');
    if (blocked) {
      states.blocked += 1;
      const reason = reasonType(blocked.reason);
      blockedReasons[reason] = (blockedReasons[reason] || 0) + 1;
      continue;
    }
    if (matching.some((event) => event.status === 'error')) {
      states.error += 1;
    } else if (matching.some((event) => event.status === 'skipped')) {
      states.skipped += 1;
    } else {
      states.missingEvent += 1;
    }
  }
  return {
    expectedOpenings: expectedOpenings.length,
    ...states,
    executionRatePercent: expectedOpenings.length ? round(states.executed / expectedOpenings.length * 100) : null,
    blockedReasons
  };
}

function summarizeEntries(events) {
  const rows = events
    .filter((event) => /_order_sent$/.test(String(event.status || '')) && !event.signal?.action)
    .map((event) => {
      const reference = resolveEntryReference(event)?.price;
      const actual = resolveEntryFill(event)?.price;
      if (!Number.isFinite(reference) || reference <= 0 || !Number.isFinite(actual) || actual <= 0) {
        return null;
      }
      const direction = String(event.signal?.direction || '').toUpperCase();
      const signed = entrySignedDeviationPercent({ actual, reference, direction });
      const exposure = Number(event.costGuard?.exposure || 0);
      return { signed, adverse: Math.max(0, signed), drag: exposure * signed / 100 };
    })
    .filter(Boolean);
  const adverse = rows.filter((row) => row.adverse > 0);
  return {
    measured: rows.length,
    adverse: adverse.length,
    aboveTolerance: rows.filter((row) => row.adverse > 0.15).length,
    averageSignedPercent: average(rows.map((row) => row.signed)),
    estimatedNetDrag: round(sum(rows.map((row) => row.drag))),
    estimatedAdverseDrag: round(sum(adverse.map((row) => row.drag)))
  };
}

function summarizeCloses(replicaRows) {
  const rows = replicaRows
    .filter((row) => row.vst?.signalClose != null && row.vst?.exit != null)
    .map((row) => {
      const published = Number(row.vst.signalClose);
      const actual = Number(row.vst.exit);
      if (!Number.isFinite(published) || published <= 0 || !Number.isFinite(actual) || actual <= 0) {
        return null;
      }
      const direction = String(row.direction || 'LONG').toUpperCase();
      const signed = closeSignedDeviationPercent({ actual, reference: published, direction });
      const exposure = Number(row.replica?.notional || 0) * Number(row.replica?.leverage || 1);
      return { signed, adverse: Math.max(0, signed), drag: exposure * signed / 100 };
    })
    .filter(Boolean);
  const adverse = rows.filter((row) => row.adverse > 0);
  return {
    measured: rows.length,
    adverse: adverse.length,
    aboveWarning: rows.filter((row) => row.adverse > 0.15).length,
    averageSignedPercent: average(rows.map((row) => row.signed)),
    estimatedNetDrag: round(sum(rows.map((row) => row.drag)))
  };
}

function summarizeEvents(events) {
  const statuses = {};
  const reasons = {};
  for (const event of events) {
    const status = String(event.status || 'unknown');
    statuses[status] = (statuses[status] || 0) + 1;
    if (event.reason) {
      const reason = reasonType(event.reason);
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }
  return { statuses, reasons };
}

function findDuplicateExecutions(events) {
  const counts = new Map();
  for (const event of events.filter((item) => /_order_sent$/.test(String(item.status || '')) && !item.signal?.action)) {
    const key = [
      event.executionMode,
      event.postId,
      event.signal?.symbol,
      event.signal?.direction,
      event.referenceEntryPrice || event.signal?.entry?.price
    ].join('|');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const groups = [...counts.entries()].filter(([, count]) => count > 1);
  return { groups: groups.length, executions: sum(groups.map(([, count]) => count)) };
}

function buildFindings(report) {
  const findings = [];
  if (report.coverage.missingEvent) {
    findings.push({ severity: 'critical', code: 'signals_without_event', detail: `${report.coverage.missingEvent} señales no tienen evento de ejecución ni bloqueo.` });
  }
  if (report.duplicateExecutions.groups) {
    findings.push({ severity: 'critical', code: 'duplicate_executions', detail: `${report.duplicateExecutions.groups} huellas tienen ejecuciones duplicadas.` });
  }
  if (report.entryQuality.aboveTolerance) {
    findings.push({ severity: 'high', code: 'entry_chasing', detail: `${report.entryQuality.aboveTolerance} entradas superaron el 0,15% de desviación adversa.` });
  }
  if (report.closeQuality.aboveWarning) {
    findings.push({ severity: 'high', code: 'close_slippage', detail: `${report.closeQuality.aboveWarning} cierres superaron el 0,15% de desviación adversa.` });
  }
  if (report.replica && Math.abs(report.replica.fees) > Math.abs(report.replica.bingxGross)) {
    findings.push({ severity: 'high', code: 'fees_dominate', detail: 'Las comisiones acumuladas superan el PnL bruto de BingX.' });
  }
  if (report.replica?.signAnalysis?.marketMismatch) {
    findings.push({
      severity: 'high',
      code: 'market_sign_mismatch',
      detail: `${report.replica.signAnalysis.marketMismatch} operaciones terminaron con signo bruto contrario a la hoja; no se explican solo por comisiones.`
    });
  }
  if (report.replica?.signAnalysis?.costFlip) {
    findings.push({
      severity: 'high',
      code: 'profit_absorbed_by_costs',
      detail: `${report.replica.signAnalysis.costFlip} operaciones coincidieron con la hoja en bruto, pero comisiones y funding convirtieron la ganancia VST en pérdida neta.`
    });
  }
  if (report.replica?.gapBridge?.reconciled === false) {
    findings.push({
      severity: 'critical',
      code: 'gap_bridge_unreconciled',
      detail: `El puente contable deja un residual de ${money(report.replica.gapBridge.residual)} VST.`
    });
  }
  if (report.replica?.matchedGapAttribution?.reconciled === false) {
    findings.push({
      severity: 'critical',
      code: 'matched_gap_unreconciled',
      detail: `El desglose de operaciones emparejadas deja un residual de ${money(report.replica.matchedGapAttribution.residual)} VST.`
    });
  }
  if (report.replica?.executionRouteAnalysis?.reconciled === false) {
    findings.push({
      severity: 'critical',
      code: 'execution_routes_unreconciled',
      detail: `Las rutas causales de salida dejan un residual de ${money(report.replica.executionRouteAnalysis.residual)} VST.`
    });
  }
  if (Number(report.replica?.executionRouteAnalysis?.counts?.historicalIncidentRows || 0) > 0) {
    const historical = report.replica.executionRouteAnalysis.families
      ?.find((family) => family.key === 'historical_defect');
    findings.push({
      severity: 'info',
      code: 'historical_close_incidents_isolated',
      detail: `${historical?.rows || 0} operaciones están asociadas a incidencias históricas ya corregidas, con un gap observado de ${money(historical?.gap)} VST; no se interpreta como contrafactual recuperable.`
    });
  }
  if (report.replica?.executionPriceChain?.reconciled === false) {
    findings.push({
      severity: 'critical',
      code: 'execution_price_chain_unreconciled',
      detail: `La cadena señal-cotización-fill deja un residual de ${money(report.replica.executionPriceChain.residual)} VST.`
    });
  }
  if (report.replica) {
    const source = report.replica.orderHistorySource || {};
    const evidence = report.replica.orderHistoryEvidence || {};
    if (!source.available) {
      findings.push({
        severity: 'high',
        code: 'order_history_unavailable',
        detail: 'BingX no entregó el histórico de órdenes; la auditoría usa el fallback de eventos e ingresos.'
      });
    } else if (source.stale) {
      findings.push({
        severity: 'high',
        code: 'order_history_stale',
        detail: 'La auditoría usa una copia anterior del histórico de órdenes porque el refresco de BingX falló.'
      });
    } else if (!evidence.available) {
      findings.push({
        severity: 'critical',
        code: 'order_history_not_reconciled',
        detail: 'BingX entregó órdenes, pero no alcanzaron la cobertura mínima para reconstruir los ciclos; se activó el fallback.'
      });
    }
    if (Number(evidence.unlinkedCloseRows || 0) > 0) {
      findings.push({
        severity: 'critical',
        code: 'unlinked_exchange_closes',
        detail: `${evidence.unlinkedCloseRows} cierres de BingX siguen sin apertura enlazada.`
      });
    }
    if (Number(evidence.closedRows || 0) > Number(evidence.exactCloseRows || 0)) {
      findings.push({
        severity: 'high',
        code: 'close_fill_evidence_incomplete',
        detail: `${Number(evidence.closedRows || 0) - Number(evidence.exactCloseRows || 0)} ciclos cerrados no tienen avgPrice exacto del histórico de órdenes.`
      });
    }
    if (Number(evidence.recoveredOpenings || 0) > 0) {
      findings.push({
        severity: 'info',
        code: 'openings_recovered_from_exchange',
        detail: `${evidence.recoveredOpenings} aperturas ausentes en los eventos locales fueron recuperadas desde BingX.`
      });
    }
  }
  if (report.replica?.issueCounts?.['No ejecutada en VST']) {
    const missingSheetOperations = report.replica.issueCounts['No ejecutada en VST'];
    findings.push({
      severity: 'high',
      code: 'sheet_operations_missing',
      detail: missingSheetOperations === 1
        ? '1 operación de la hoja no tiene apertura VST emparejada.'
        : `${missingSheetOperations} operaciones de la hoja no tienen apertura VST emparejada. Motivos: ${missingReasonSummary(report.replica.missingReasonCounts)}.`
    });
  }
  if (report.replica?.unprocessedClosePosts) {
    findings.push({
      severity: 'high',
      code: 'historical_close_unprocessed',
      detail: `${report.replica.unprocessedClosePosts} publicación histórica de cierre no generó evento y afectó a ${report.replica.unprocessedCloseRows} posiciones. La errata CUERRE ya está cubierta por el parser actual.`
    });
  }
  if (report.replica?.stopAnalysis?.divergent) {
    const stops = report.replica.stopAnalysis;
    const aggregated = Number(stops.aggregatedDivergent || 0);
    const failedCloses = Number(stops.closeFailureDivergent || 0);
    const runtimeGuardFailures = Number(stops.runtimeGuardFailureDivergent || 0);
    const unprocessedCloses = Number(stops.unprocessedCloseDivergent || 0);
    findings.push({
      severity: 'high',
      code: 'reference_stop_divergence',
      detail: `${stops.divergent} stops cerraron con signo contrario a la hoja; ${stops.aligned} de ${stops.total} stops comparables sí quedaron alineados${failedCloses ? `, ${failedCloses} divergencias estuvieron precedidas por cierres fallidos` : ''}${runtimeGuardFailures ? ` por el fallo histórico del guard` : ''}${aggregated ? ` y esas ${aggregated} posiciones terminaron agregadas` : ''}${unprocessedCloses ? `; ${unprocessedCloses} divergencia${unprocessedCloses === 1 ? '' : 's'} ${unprocessedCloses === 1 ? 'procedió' : 'procedieron'} de cierres no procesados` : ''}.`
    });
  }
  if (report.replica?.referenceCoverage?.stale) {
    const referenceCoverage = report.replica.referenceCoverage;
    findings.push({
      severity: 'info',
      code: 'sheet_reference_stale',
      detail: `${referenceCoverage.outsideCoverageRows || 0} aperturas VST son posteriores al último día disponible en la hoja (cobertura hasta ${referenceCoverage.coverageThroughAt || referenceCoverage.latestSheetAt || 'sin fecha'}). No se clasifican como extras mientras falte esa referencia.`
    });
  }
  if (report.replica?.referenceCoverage?.provisionalLatestDay) {
    const referenceCoverage = report.replica.referenceCoverage;
    findings.push({
      severity: 'info',
      code: 'sheet_reference_provisional',
      detail: `La última jornada de la hoja conserva ${referenceCoverage.openReferenceRows || 0} filas abiertas. ${referenceCoverage.outsideCoverageRows || 0} aperturas VST quedan pendientes de referencia y no se tratan como extras hasta que se publiquen los cierres.`
    });
  }
  if (report.runtime.signalCoverage?.summary?.missingOpenings) {
    const missingOpenings = report.runtime.signalCoverage.summary.missingOpenings;
    const correctedAfterEvent = Number(report.runtime.signalCoverage.summary.correctedAfterEventMissingOpenings || 0);
    const unexplainedOpenings = Math.max(0, missingOpenings - correctedAfterEvent);
    if (correctedAfterEvent) {
      findings.push({
        severity: unexplainedOpenings ? 'critical' : 'high',
        code: 'post_correction_miss',
        detail: `${correctedAfterEvent} apertura${correctedAfterEvent === 1 ? '' : 's'} faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.`
      });
    }
    if (unexplainedOpenings) {
      findings.push({
        severity: 'critical',
        code: 'incomplete_signal_packages',
        detail: unexplainedOpenings === 1
          ? '1 apertura falta en paquetes posteriores a las mejoras sin una corrección posterior que la explique.'
          : `${unexplainedOpenings} aperturas faltan en paquetes posteriores a las mejoras sin una corrección posterior que las explique.`
      });
    }
  }
  if (report.cohortComparison) {
    const comparison = report.cohortComparison;
    const verdict = (key) => comparison.verdicts?.find((item) => item.key === key);
    if (verdict('reliability')?.status === 'improved') {
      findings.push({
        severity: 'info',
        code: 'cohort_reliability_improved',
        detail: `La cohorte actual reduce las incidencias técnicas observadas de ${comparison.previous?.historicalIncidents ?? '-'} a ${comparison.current?.historicalIncidents ?? '-'} operaciones.`
      });
    }
    if (verdict('entry')?.status === 'worse') {
      findings.push({
        severity: 'high',
        code: 'cohort_entry_execution_worse',
        detail: `La ejecución de entrada empeora frente a la cohorte anterior: ${verdict('entry').detail}.`
      });
    }
    if (verdict('economics')?.status === 'negative') {
      findings.push({
        severity: 'high',
        code: 'cohort_net_per_close_negative',
        detail: `La economía de la cohorte actual sigue siendo negativa: ${verdict('economics').detail}.`
      });
    }
    if (comparison.status?.key === 'partial_reference') {
      const detail = comparison.status.detail || 'La hoja no cubre todavía toda la cohorte actual.';
      findings.push({
        severity: 'info',
        code: 'cohort_reference_partial',
        detail: withFinalPeriod(detail)
      });
    }
    if (comparison.statistics?.conclusion === 'inconclusive') {
      findings.push({
        severity: 'info',
        code: 'cohort_effect_inconclusive',
        detail: `El intervalo exploratorio del cambio neto va de ${money(comparison.statistics.ci95Low)} a ${money(comparison.statistics.ci95High)} VST por cierre y cruza cero.`
      });
    }
    if (comparison.entryDiagnosis?.summary) {
      findings.push({
        severity: 'info',
        code: 'entry_execution_attribution',
        detail: `${withFinalPeriod(comparison.entryDiagnosis.summary.label)} ${withFinalPeriod(comparison.entryDiagnosis.summary.detail)}`.trim()
      });
    }
  }
  if (report.replica && Math.abs(report.replica.fees) > 0 && !report.replica.commissionRebateDetected) {
    findings.push({ severity: 'info', code: 'rebate_not_detected', detail: 'BingX no acredita ninguna devolución de comisiones en el histórico consultado.' });
  }
  const healthFinding = monitorHealthFinding(report.runtime.health);
  if (healthFinding) {
    findings.push(healthFinding);
  }
  if (!findings.length) {
    findings.push({ severity: 'info', code: 'no_critical_findings', detail: 'No se detectan incidencias críticas con la evidencia disponible.' });
  }
  return findings;
}

function renderMarkdown(report) {
  const r = report.replica || {};
  const lines = [
    '# Auditoría integral del sistema',
    '',
    `Generada: ${report.generatedAt}`,
    `Mes auditado: ${report.month}`,
    `Ventana: ${report.window.startAt} a ${report.window.endAt}`,
    '',
    '## Resumen ejecutivo',
    '',
    ...report.findings.map((finding) => `- **${finding.severity.toUpperCase()} · ${finding.code}:** ${finding.detail}`),
    '',
    '## Cobertura de señales',
    '',
    `- Aperturas esperadas desde publicaciones: ${report.coverage.expectedOpenings}`,
    `- Ejecutadas: ${report.coverage.executed}`,
    `- Bloqueadas: ${report.coverage.blocked}`,
    `- Sin evento: ${report.coverage.missingEvent}`,
    `- Tasa de ejecución: ${percent(report.coverage.executionRatePercent)}`,
    `- Razones de bloqueo: ${JSON.stringify(report.coverage.blockedReasons)}`,
    '',
    '## Calidad de ejecución',
    '',
    `- Entradas medibles: ${report.entryQuality.measured}`,
    `- Entradas adversas: ${report.entryQuality.adverse}`,
    `- Entradas por encima del 0,15%: ${report.entryQuality.aboveTolerance}`,
    `- Arrastre neto estimado en entradas: ${money(report.entryQuality.estimatedNetDrag)} VST`,
    `- Cierres medibles: ${report.closeQuality.measured}`,
    `- Cierres por encima del 0,15%: ${report.closeQuality.aboveWarning}`,
    `- Arrastre neto estimado en cierres: ${money(report.closeQuality.estimatedNetDrag)} VST`,
    '',
    '## Réplica y costes',
    '',
    `- Filas de la hoja: ${r.sheetRows ?? '-'}`,
    `- Aperturas VST: ${r.openings ?? '-'}`,
    `- Réplica teórica escalada: ${money(r.theoreticalReplicaPnl)} VST`,
    `- PnL bruto BingX: ${money(r.bingxGross)} VST`,
    `- Comisiones: ${money(r.fees)} VST`,
    `- Funding: ${money(r.funding)} VST`,
    `- Neto observado: ${money(r.net)} VST`,
    `- Devolución acreditada por BingX: ${money(r.actualCommissionRebate)} VST (${r.commissionRebateDetected ? 'detectada' : 'no detectada'})`,
    `- Tarifa taker observada: ${percent(r.takerCommissionPercent)}`,
    `- Tarifa maker observada: ${percent(r.makerCommissionPercent)}`,
    `- Devolución estimada (${r.estimatedCommissionRebatePercent ?? 0}%): ${money(r.estimatedCommissionRebate)} VST`,
    `- Neto hipotético tras devolución estimada: ${money(r.netAfterEstimatedRebate)} VST`,
    `- Ciclos con entradas agregadas: ${r.aggregatedCycles ?? 0} (${r.aggregatedRows ?? 0} filas)`,
    `- Histórico exacto de órdenes: ${r.orderHistorySource?.available ? (r.orderHistorySource.stale ? 'disponible en caché' : 'disponible') : 'no disponible'}`,
    `- Órdenes históricas leídas: ${r.orderHistorySource?.records ?? 0}`,
    `- Cierres con fill exacto: ${r.orderHistoryEvidence?.exactCloseRows ?? 0} de ${r.orderHistoryEvidence?.closedRows ?? 0}`,
    `- Órdenes de cierre / posiciones reconstruidas: ${r.orderHistoryEvidence?.closeOrders ?? 0} / ${r.orderHistoryEvidence?.positions ?? 0}`,
    `- Aperturas recuperadas desde BingX: ${r.orderHistoryEvidence?.recoveredOpenings ?? 0}`,
    `- Cobertura de eventos locales: ${percent(r.orderHistoryEvidence?.localEventCoveragePercent)}`,
    `- Cierres sin apertura enlazada: ${r.orderHistoryEvidence?.unlinkedCloseRows ?? 0}`,
    `- Última operación disponible en la hoja: ${r.referenceCoverage?.latestSheetAt || 'sin fecha'}`,
    `- Cobertura fiable para comparar hasta: ${r.referenceCoverage?.coverageThroughAt || 'sin fecha'}`,
    `- Cobertura permitida para emparejar hasta: ${r.referenceCoverage?.matchingThroughAt || r.referenceCoverage?.coverageThroughAt || 'sin fecha'}`,
    `- Última jornada provisional / filas abiertas: ${r.referenceCoverage?.provisionalLatestDay ? 'sí' : 'no'} / ${r.referenceCoverage?.openReferenceRows ?? 0}`,
    `- Última apertura VST: ${r.referenceCoverage?.latestVstAt || 'sin fecha'}`,
    `- Aperturas VST posteriores sin referencia: ${r.referenceCoverage?.outsideCoverageRows ?? 0}`,
    `- Motivos de aperturas ausentes: ${missingReasonSummary(r.missingReasonCounts)}`,
    `- Publicaciones históricas de cierre sin evento: ${r.unprocessedClosePosts ?? 0}`,
    `- Posiciones afectadas por cierres no procesados: ${r.unprocessedCloseRows ?? 0}`,
    `- Signos distintos por mercado / por costes: ${r.signAnalysis?.marketMismatch ?? 0} / ${r.signAnalysis?.costFlip ?? 0}`,
    `- Ejecuciones de entrada > 0,15%: ${r.fillQuality?.entryAboveTolerance ?? 0} de ${r.fillQuality?.entryMeasured ?? 0}`,
    `- Ejecuciones de salida > 0,15%: ${r.fillQuality?.closeAboveTolerance ?? 0} de ${r.fillQuality?.closeMeasured ?? 0}`,
    `- Fuentes de entrada: ${JSON.stringify(r.fillQuality?.entrySources || {})}`,
    `- Fuentes de salida: ${JSON.stringify(r.fillQuality?.closeSources || {})}`,
    `- Stops comparables alineados / divergentes / con deslizamiento: ${r.stopAnalysis?.aligned ?? 0} / ${r.stopAnalysis?.divergent ?? 0} / ${r.stopAnalysis?.slippage ?? 0}`,
    `- Stops observados sin hoja comparable: ${r.stopAnalysis?.unknown ?? 0}`,
    `- Stops divergentes precedidos por cierres fallidos: ${r.stopAnalysis?.closeFailureDivergent ?? 0}`,
    `- Stops divergentes por el fallo histórico del guard: ${r.stopAnalysis?.runtimeGuardFailureDivergent ?? 0}`,
    `- Stops divergentes tras un cierre no procesado: ${r.stopAnalysis?.unprocessedCloseDivergent ?? 0}`,
    `- Stops divergentes en posiciones agregadas: ${r.stopAnalysis?.aggregatedDivergent ?? 0}`,
    `- Clasificación: ${JSON.stringify(r.issueCounts || {})}`,
    '',
    '## Puente contable',
    '',
    ...renderGapBridgeLines(r.gapBridge),
    '',
    '## Desglose del gap emparejado',
    '',
    ...renderMatchedGapAttributionLines(r.matchedGapAttribution),
    '',
    '## Rutas causales de salida',
    '',
    ...renderExecutionRouteLines(r.executionRouteAnalysis),
    '',
    '## Cadena señal, cotización y fill',
    '',
    ...renderExecutionPriceChainLines(r.executionPriceChain, r.executionLatency),
    '',
    '## Cohorte posterior a las mejoras',
    '',
    ...renderCohortLines(report.cohort, report.runtime.signalCoverage),
    '',
    '## Contraste antes y después',
    '',
    ...renderCohortComparisonLines(report.cohortComparison),
    '',
    '## Estado operativo',
    '',
    `- Monitor: ${report.runtime.health?.level || 'sin datos'}`,
    `- Fase: ${report.runtime.health?.phase || 'sin datos'}`,
    `- Posiciones abiertas: ${report.runtime.risk?.openPositions ?? '-'}`,
    `- PnL diario: ${money(report.runtime.risk?.dailyPnl)}`,
    `- PnL mensual: ${money(report.runtime.risk?.monthlyPnl)}`,
    `- Modo: ${report.runtime.configuration?.mode || 'sin datos'}`,
    `- Desviación adversa máxima: ${percent(report.runtime.configuration?.maxEntryDeviationPercent)}`,
    `- Antigüedad máxima de apertura: ${report.runtime.configuration?.maxSignalAgeMinutes ?? '-'} min`,
    `- Distancia máxima del stop: ${percent(report.runtime.configuration?.maxStopDistancePercent)}`,
    `- Lectura Telegram: ${report.runtime.configuration?.telegramPollSeconds || '-'} s`,
    `- Recarga Telegram: ${report.runtime.configuration?.telegramRefreshSeconds || '-'} s`,
    `- Puerta de promoción: ${report.runtime.promotionGate?.label || 'sin datos'}`,
    `- Criterios pendientes: ${(report.runtime.promotionGate?.criteria || []).filter((item) => !item.ok).map((item) => item.label).join(', ') || 'ninguno'}`,
    `- Reloj REST BingX: ${clockStatus(report.runtime.bingxClock)}`,
    '',
    '## Interpretación',
    '',
    'El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.',
    ''
  ];
  return lines.join('\n');
}

function renderGapBridgeLines(bridge) {
  if (!bridge || !Array.isArray(bridge.steps)) {
    return ['- Sin puente disponible.'];
  }
  const stepLines = bridge.steps
    .filter((step) => Math.abs(Number(step.value || 0)) > 0.0000001 || Number(step.count || 0) > 0)
    .map((step) => {
      const count = step.count !== null && step.count !== undefined ? ` (${step.count} operaciones)` : '';
      return `- ${step.label}${count}: ${money(step.value)} VST`;
    });
  return [
    `- Réplica teórica inicial: ${money(bridge.replicaPnl)} VST`,
    ...stepLines,
    `- Bruto BingX reconstruido: ${money(bridge.reconstructedGross)} VST`,
    `- Neto BingX reconstruido: ${money(bridge.reconstructedNet)} VST`,
    `- Residual: ${money(bridge.residual)} VST (${bridge.reconciled ? 'reconciliado' : 'revisar'})`
  ];
}

function renderMatchedGapAttributionLines(attribution) {
  if (!attribution || !Array.isArray(attribution.steps)) {
    return ['- Sin desglose disponible.'];
  }
  const stepLines = attribution.steps
    .filter((step) => Math.abs(Number(step.value || 0)) > 0.0000001 || Number(step.count || 0) > 0)
    .map((step) => `- ${step.label}: ${money(step.value)} VST`);
  const symbolLines = (attribution.bySymbol || [])
    .map((item) => `- ${item.key}: gap ${money(item.gap)} VST; entrada ${money(item.entryImpact)}; salida ${money(item.exitImpact)}; cantidad/fills ${money(item.sizeAndFillsImpact)}.`);
  return [
    `- Operaciones emparejadas / descomponibles: ${attribution.counts?.matched ?? 0} / ${attribution.counts?.decomposable ?? 0}`,
    `- Réplica teórica emparejada: ${money(attribution.replicaPnl)} VST`,
    ...stepLines,
    `- Bruto BingX emparejado: ${money(attribution.bingxGross)} VST`,
    `- Residual: ${money(attribution.residual)} VST (${attribution.reconciled ? 'reconciliado' : 'revisar'})`,
    '- Por activo:',
    ...symbolLines
  ];
}

function renderExecutionRouteLines(analysis) {
  if (!analysis || !Array.isArray(analysis.groups)) {
    return ['- Sin rutas causales disponibles.'];
  }
  const familyLines = (analysis.families || []).map((family) => (
    `- ${family.label}: ${family.rows} operaciones; gap ${money(family.gap)} VST; entrada ${money(family.entryImpact)} VST; salida ${money(family.exitImpact)} VST.`
  ));
  const routeLines = analysis.groups.map((group) => (
    `- ${group.label}: ${group.rows} operaciones; réplica ${money(group.replicaPnl)} VST; BingX bruto ${money(group.bingxGross)} VST; gap ${money(group.gap)} VST; ${group.closeFailureEvents} intentos fallidos; ${group.unprocessedCloseSignals} cierres sin evento.`
  ));
  return [
    `- Operaciones emparejadas: ${analysis.counts?.matched ?? 0}`,
    `- Incidencias históricas ya corregidas: ${analysis.counts?.historicalIncidentRows ?? 0}`,
    `- Reintentos protegidos: ${analysis.counts?.guardRetryRows ?? 0}`,
    `- Salidas sin señal local enlazada: ${analysis.counts?.evidenceGapRows ?? 0}`,
    `- Residual: ${money(analysis.residual)} VST (${analysis.reconciled ? 'reconciliado' : 'revisar'})`,
    '- Familias:',
    ...familyLines,
    '- Rutas:',
    ...routeLines,
    '- Nota: el gap asociado a una ruta describe lo observado y no equivale a dinero contrafactualmente recuperable.'
  ];
}

function renderExecutionPriceChainLines(chain, latency) {
  if (!chain || !Array.isArray(chain.steps)) {
    return ['- Sin cadena de precios disponible.'];
  }
  const stepLines = chain.steps
    .filter((step) => Math.abs(Number(step.value || 0)) > 0.0000001 || Number(step.count || 0) > 0)
    .map((step) => `- ${step.label} (${step.count ?? 0} operaciones): ${money(step.value)} VST`);
  const opening = latency?.opening || {};
  const closing = latency?.closing || {};
  return [
    `- Operaciones emparejadas / cadena base completa: ${chain.counts?.matched ?? 0} / ${chain.counts?.decomposable ?? 0}`,
    `- Entradas con señal y cotización / salidas con objetivo y cotización: ${chain.counts?.fullEntryPath ?? 0} / ${chain.counts?.fullExitPath ?? 0}`,
    ...stepLines,
    `- Bruto BingX reconstruido: ${money(chain.reconstructedGross)} VST`,
    `- Residual: ${money(chain.residual)} VST (${chain.reconciled ? 'reconciliado' : 'revisar'})`,
    `- Latencia de apertura: mediana ${seconds(opening.total?.medianSeconds)}, p95 ${seconds(opening.total?.p95Seconds)}, ${opening.retried ?? 0} con espera de reintento.`,
    `- Latencia de cierre por señal: mediana ${seconds(closing.total?.medianSeconds)}, p95 ${seconds(closing.total?.p95Seconds)}, ${closing.retried ?? 0} con espera de reintento.`
  ];
}

function pickCohortSummary(summary = {}) {
  return {
    sheetRows: summary.sheetRows || 0,
    openings: summary.vstOpenings || 0,
    closes: summary.vstCloses || 0,
    sheetPnl: summary.sheetPnl || 0,
    theoreticalReplicaPnl: summary.replicaPnl || 0,
    bingxGross: summary.bingxGross || 0,
    fees: summary.bingxFees || 0,
    funding: summary.bingxFunding || 0,
    net: summary.bingxNet || 0,
    actualCommissionRebate: summary.actualCommissionRebate || 0,
    commissionRebateDetected: Boolean(summary.commissionRebateDetected),
    issueCounts: summary.issueCounts || {},
    signAnalysis: summary.signAnalysis || {},
    fillQuality: summary.fillQuality || {},
    gapBridge: summary.gapBridge || null,
    matchedGapAttribution: summary.matchedGapAttribution || null,
    executionRouteAnalysis: summary.executionRouteAnalysis || null,
    executionPriceChain: summary.executionPriceChain || null,
    executionLatency: summary.executionLatency || null,
    orderHistoryEvidence: summary.orderHistoryEvidence || null,
    missingReasonCounts: summary.missingReasonCounts || {},
    stopAnalysis: summary.stopAnalysis || {},
    unprocessedCloseRows: summary.unprocessedCloseRows || 0,
    unprocessedClosePosts: summary.unprocessedClosePosts || 0,
    referenceCoverage: summary.referenceCoverage || null
  };
}

function renderCohortLines(cohort, signalCoverage) {
  if (!cohort) {
    return ['- La cohorte todavía no está inicializada.'];
  }
  const sample = cohort.sampleStatus || {};
  const summary = cohort.summary || {};
  const packages = signalCoverage?.summary || {};
  return [
    `- Inicio: ${cohort.startedAt}`,
    `- Muestra: ${sample.label || sample.status || 'sin clasificar'} (${summary.closes || 0} cierres)`,
    `- Aperturas / cierres: ${summary.openings || 0} / ${summary.closes || 0}`,
    `- Filas comparables / VST posteriores sin referencia: ${summary.referenceCoverage?.comparableRows || 0} / ${summary.referenceCoverage?.outsideCoverageRows || 0}`,
    `- Última operación disponible en la hoja: ${summary.referenceCoverage?.latestSheetAt || 'sin fecha'}`,
    `- Última jornada provisional / filas abiertas: ${summary.referenceCoverage?.provisionalLatestDay ? 'sí' : 'no'} / ${summary.referenceCoverage?.openReferenceRows ?? 0}`,
    `- Neto observado: ${money(summary.net)} VST`,
    `- Comisiones: ${money(summary.fees)} VST`,
    `- Paquetes completos: ${packages.completePackages || 0} de ${packages.packages || 0}`,
    `- Aperturas esperadas / ejecutadas / faltantes: ${packages.expectedOpenings || 0} / ${packages.executedOpenings || 0} / ${packages.missingOpenings || 0}`,
    `- Faltantes con corrección posterior demostrada: ${packages.correctedAfterEventMissingOpenings || 0}`,
    `- Motivos de aperturas ausentes: ${missingReasonSummary(summary.missingReasonCounts)}`,
    `- Cierres históricos sin evento / posiciones afectadas: ${summary.unprocessedClosePosts || 0} / ${summary.unprocessedCloseRows || 0}`,
    `- Signos distintos por mercado / por costes: ${summary.signAnalysis?.marketMismatch || 0} / ${summary.signAnalysis?.costFlip || 0}`,
    `- Ejecuciones de entrada / salida > 0,15%: ${summary.fillQuality?.entryAboveTolerance || 0} / ${summary.fillQuality?.closeAboveTolerance || 0}`,
    `- Stops comparables alineados / divergentes: ${summary.stopAnalysis?.aligned || 0} / ${summary.stopAnalysis?.divergent || 0}`,
    `- Divergencias precedidas por cierres fallidos: ${summary.stopAnalysis?.closeFailureDivergent || 0}`,
    `- Fallos heurísticos de parseo: ${packages.parseFailures || 0}`,
    `- Clasificación: ${JSON.stringify(summary.issueCounts || {})}`
  ];
}

function renderCohortComparisonLines(comparison) {
  if (!comparison) {
    return ['- No existe una cohorte anterior cerrada con la que construir el contraste.'];
  }
  const previous = comparison.previous || {};
  const current = comparison.current || {};
  const statistics = comparison.statistics || {};
  const metricLines = (comparison.metrics || []).map((metric) => (
    `- ${metric.label}: antes ${cohortMetricValue(metric, metric.previous)}; ahora ${cohortMetricValue(metric, metric.current)}; cambio ${cohortMetricDelta(metric)}; ${cohortAssessmentLabel(metric.assessment)}.`
  ));
  const verdictLines = (comparison.verdicts || []).map((verdict) => (
    `- ${verdict.label}: ${cohortAssessmentLabel(verdict.status)}. ${withFinalPeriod(verdict.detail || '')}`
  ));
  return [
    `- Estado: ${comparison.status?.label || 'sin clasificar'}. ${withFinalPeriod(comparison.status?.detail || '')}`,
    `- Antes: ${previous.closes || 0} cierres; ${previous.matched || 0}/${previous.observedClosed || 0} con referencia; ${percent(previous.exactFillCoveragePercent)} con precio ejecutado exacto.`,
    `- Ahora: ${current.closes || 0} cierres; ${current.matched || 0}/${current.observedClosed || 0} con referencia; ${percent(current.exactFillCoveragePercent)} con precio ejecutado exacto.`,
    `- Veredicto global: ${comparison.overall?.label || 'sin lectura'}. ${withFinalPeriod(comparison.overall?.detail || '')}`,
    '- Lecturas por ámbito:',
    ...verdictLines,
    '- Métricas normalizadas:',
    ...metricLines,
    ...renderEntryDiagnosisLines(comparison.entryDiagnosis),
    ...renderCloseExecutionLines(comparison.prospectiveCloseExecution),
    `- Media neta enlazada: antes ${money(statistics.previous?.mean)} VST; ahora ${money(statistics.current?.mean)} VST; diferencia ${money(statistics.meanDifference)} VST por cierre.`,
    `- Bootstrap determinista (${statistics.iterations || 0} iteraciones): intervalo del 95% ${money(statistics.ci95Low)} a ${money(statistics.ci95High)} VST; probabilidad exploratoria de mejora ${percent(statistics.probabilityCurrentHigherPercent)}; lectura ${cohortAssessmentLabel(statistics.conclusion)}.`,
    '- Límite: el contraste describe esta muestra. La cobertura parcial y un intervalo que cruce cero impiden afirmar una mejora económica o garantizar rentabilidad futura.'
  ];
}

function renderEntryDiagnosisLines(diagnosis) {
  if (!diagnosis?.summary) {
    return ['- Diagnóstico de entrada: sin telemetría suficiente.'];
  }
  const stageLines = (diagnosis.stages || []).map((stage) => (
    `- Fase ${stage.label}: antes ${percent(stage.previousAverageAdversePercent)}; ahora ${percent(stage.currentAverageAdversePercent)}; cambio ${signedPercentPoints(stage.deltaAverageAdversePercent)}; ${cohortAssessmentLabel(stage.assessment)}.`
  ));
  const symbolLines = (diagnosis.bySymbol || []).map((group) => (
    `- ${group.label}: ${group.previousOpenings || 0} → ${group.currentOpenings || 0} aperturas; media ${percent(group.previousAverageAdversePercent)} → ${percent(group.currentAverageAdversePercent)}; ${percent(group.currentAboveTolerancePercent)} sobre 0,15%; ${cohortAssessmentLabel(group.assessment)}.`
  ));
  const routeLines = (diagnosis.byRoute || []).map((group) => (
    `- ${group.label}: ${group.currentOpenings || 0} aperturas actuales; media ${percent(group.currentAverageAdversePercent)}; ${percent(group.currentAboveTolerancePercent)} sobre 0,15%; ${cohortAssessmentLabel(group.assessment)}.`
  ));
  const packageLines = (diagnosis.byPackageSlot || []).map((group) => (
    `- ${group.label}: ${group.previousOpenings || 0} → ${group.currentOpenings || 0} aperturas; media ${percent(group.previousAverageAdversePercent)} → ${percent(group.currentAverageAdversePercent)}; detección a primer intento ${seconds(group.currentReactionAverageSeconds)}; inicio a fill ${seconds(group.currentAttemptToFillAverageSeconds)}; ${cohortAssessmentLabel(group.assessment)}.`
  ));
  const timing = diagnosis.timing || {};
  const timingLines = [
    `- Reacción hasta el intento: ${seconds(timing.reactionAverageSeconds?.previous)} → ${seconds(timing.reactionAverageSeconds?.current)}.`,
    `- Inicio del intento a fill: ${seconds(timing.attemptToFillAverageSeconds?.previous)} → ${seconds(timing.attemptToFillAverageSeconds?.current)}.`,
    `- Latencia total p95: ${seconds(timing.totalP95Seconds?.previous)} → ${seconds(timing.totalP95Seconds?.current)}; ${timing.currentExchangeBacked || 0} aperturas actuales con hora del histórico de BingX.`
  ];
  const mix = diagnosis.mixAnalysis?.byPackageSlot;
  const mixLines = mix ? [
    `- Mezcla por posición del paquete: ${signedPercentPoints(mix.compositionEffect)}; cambio dentro de cada posición: ${signedPercentPoints(mix.withinGroupEffect)}; variación observada: ${signedPercentPoints(mix.observedDelta)}.`,
    `- Proporción descriptiva asociada a la mezcla por posición: ${percent(mix.compositionSharePercent)}. Este desglose no se suma al desglose por activo.`
  ] : [];
  const microstructure = diagnosis.prospectiveMicrostructure || {};
  const packageQueue = microstructure.packageQueue || {};
  const microstructureLines = [
    `- Cobertura bid/ask prospectiva: ${microstructure.topOfBookMeasured || 0}/${diagnosis.summary.currentOpenings || 0} aperturas; ${microstructure.staleQuotes || 0} instantáneas caducadas.`,
    `- Spread medio observado: ${percent(microstructure.spread?.averagePercent)}; last a precio ejecutable ${percent(microstructure.lastToExecutable?.averageAdversePercent)}; precio ejecutable a fill ${percent(microstructure.executableToFill?.averageAdversePercent)}.`,
    `- RTT local medio: ticker ${milliseconds(microstructure.tickerRoundTripMs?.average)}; orden ${milliseconds(microstructure.orderRequestRoundTripMs?.average)}; antigüedad mediana de la cotización ${milliseconds(microstructure.quoteAgeMs?.median)}.`,
    `- Reloj de bookTicker: ${microstructure.exchangeClock?.measured || 0}/${microstructure.topOfBookMeasured || 0} con marca BingX; BingX a recepción local ${milliseconds(microstructure.exchangeClock?.exchangeToLocalReceiptMs?.median)} de mediana; recepción local a envío ${milliseconds(microstructure.exchangeClock?.localReceiptToRequestMs?.median)}; ${microstructure.exchangeClock?.possibleClockSkew || 0} con desfase aparente.`,
    `- Secuencia del paquete: ${packageQueue.startQuoteMeasured || 0}/${diagnosis.summary.currentOpenings || 0} con cotización inicial; espera media hasta el envío ${milliseconds(packageQueue.waitMs?.average)}; movimiento adverso durante la cola ${percent(packageQueue.executableMove?.averageAdversePercent)}.`
  ];
  return [
    `- Diagnóstico de entrada: ${withFinalPeriod(diagnosis.summary.label)} ${withFinalPeriod(diagnosis.summary.detail)}`.trim(),
    '- Descomposición por fase:',
    ...stageLines,
    '- Comparación por activo:',
    ...symbolLines,
    '- Comparación por ruta:',
    ...routeLines,
    '- Tiempo observado hasta el fill:',
    ...timingLines,
    '- Microestructura prospectiva (solo aperturas nuevas):',
    ...microstructureLines,
    '- Comparación por posición dentro del paquete:',
    ...packageLines,
    ...mixLines,
    `- Límite del diagnóstico: ${withFinalPeriod(diagnosis.summary.caveat || '')}`
  ];
}

function renderCloseExecutionLines(analysis) {
  if (!analysis?.totals) {
    return ['- Microestructura prospectiva de cierre: sin telemetría suficiente.'];
  }
  const totals = analysis.totals;
  const microstructure = totals.microstructure || {};
  const symbolLines = (analysis.bySymbol || [])
    .filter((group) => Number(group.topOfBookMeasured || 0) > 0)
    .map((group) => (
      `- ${group.label}: ${group.topOfBookMeasured || 0}/${group.closes || 0} cierres medidos; ejecutable a fill ${percent(group.microstructure?.executableToFill?.averageAdversePercent)}; ${group.aboveTolerance || 0} sobre 0,15%.`
    ));
  return [
    '- Microestructura prospectiva de cierre (solo cierres explícitos nuevos):',
    `- Cobertura bid/ask prospectiva: ${totals.topOfBookMeasured || 0}/${totals.closes || 0} cierres; ${microstructure.staleQuotes || 0} instantáneas caducadas.`,
    `- Spread medio observado: ${percent(microstructure.spread?.averagePercent)}; último precio a ejecutable ${percent(microstructure.lastToExecutable?.averageAdversePercent)}; ejecutable a fill ${percent(microstructure.executableToFill?.averageAdversePercent)}.`,
    `- RTT local medio: ticker ${milliseconds(microstructure.tickerRoundTripMs?.average)}; orden ${milliseconds(microstructure.orderRequestRoundTripMs?.average)}; antigüedad mediana de la cotización ${milliseconds(microstructure.quoteAgeMs?.median)}.`,
    `- Reloj de bookTicker: ${microstructure.exchangeClock?.measured || 0}/${microstructure.topOfBookMeasured || 0} con marca BingX; BingX a recepción local ${milliseconds(microstructure.exchangeClock?.exchangeToLocalReceiptMs?.median)} de mediana; recepción local a envío ${milliseconds(microstructure.exchangeClock?.localReceiptToRequestMs?.median)}; ${microstructure.exchangeClock?.possibleClockSkew || 0} con desfase aparente.`,
    ...symbolLines
  ];
}

function signedPercentPoints(value) {
  if (!Number.isFinite(Number(value))) {
    return '-';
  }
  const number = Number(value);
  return `${number > 0 ? '+' : ''}${number.toFixed(Math.abs(number) < 1 ? 4 : 2)} pp`;
}

function cohortMetricValue(metric, value) {
  if (!Number.isFinite(Number(value))) {
    return '-';
  }
  if (metric.unit === 'percent') {
    return percent(value);
  }
  if (metric.unit === 'seconds') {
    return seconds(value);
  }
  return `${money(value)} VST`;
}

function cohortMetricDelta(metric) {
  if (!Number.isFinite(Number(metric.delta))) {
    return '-';
  }
  const value = Number(metric.delta);
  const sign = value > 0 ? '+' : '';
  if (metric.unit === 'percent') {
    return `${sign}${value.toFixed(2)} pp`;
  }
  if (metric.unit === 'seconds') {
    return `${sign}${value.toFixed(2)} s`;
  }
  return `${sign}${money(value)} VST`;
}

function cohortAssessmentLabel(value) {
  return {
    improved: 'mejora',
    worse: 'empeora',
    stable: 'estable',
    mixed: 'mixto',
    positive: 'positivo',
    negative: 'negativo',
    partial: 'cobertura parcial',
    inconclusive: 'inconclusa',
    insufficient: 'muestra insuficiente'
  }[value] || value || 'sin clasificar';
}

function withFinalPeriod(value) {
  const text = String(value || '').trim();
  return !text || /[.!?]$/.test(text) ? text : `${text}.`;
}

function sameSignal(event, signal) {
  return event.postId === signal.postId
    && String(event.signal?.symbol || '') === signal.symbol
    && String(event.signal?.direction || '') === signal.direction;
}

function reasonType(reason) {
  return String(reason || 'unknown').split(':')[0] || 'unknown';
}

function missingReasonSummary(counts = {}) {
  const labels = {
    invalid_stop: 'stop inválido',
    cost_guard: 'filtro de costes',
    insufficient_vst: 'margen VST insuficiente',
    entry_deviation: 'desviación de entrada',
    stop_distance: 'distancia de stop',
    other: 'otro motivo',
    unexplained: 'sin evidencia'
  };
  const parts = Object.entries(counts || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([key, count]) => `${count} ${labels[key] || key}`);
  return parts.join(', ') || 'ninguna';
}

function pickHealth(health = {}) {
  return {
    level: health.level || 'unknown',
    running: Boolean(health.running),
    phase: health.phase || '',
    ageSeconds: finite(health.ageSeconds),
    visiblePosts: finite(health.visiblePosts),
    stale: Boolean(health.stale),
    noVisiblePosts: Boolean(health.noVisiblePosts),
    noVisiblePostsSeconds: finite(health.noVisiblePostsSeconds),
    noVisiblePostsGraceSeconds: finite(health.noVisiblePostsGraceSeconds),
    consecutiveEmptyReads: finite(health.scraper?.consecutiveEmptyReads),
    recoveryCount: finite(health.scraper?.recoveryCount),
    lastError: health.lastError || null
  };
}

function pickExchangeSafety(safety = {}) {
  return {
    level: safety.level || 'unknown',
    mode: safety.mode || '',
    lastSyncAt: safety.lastSyncAt || null,
    stale: Boolean(safety.stale),
    demoOpenPositions: finite(safety.demo?.openPositions),
    demoMissingStopLoss: finite(safety.demo?.missingStopLoss),
    realOpenPositions: finite(safety.real?.openPositions),
    realMissingStopLoss: finite(safety.real?.missingStopLoss)
  };
}

function pickRisk(risk = {}) {
  return {
    openPositions: finite(risk.openPositions),
    openExposure: finite(risk.openExposure),
    dailyPnl: finite(risk.dailyPnl),
    monthlyPnl: finite(risk.monthlyPnl),
    source: risk.source || ''
  };
}

function pickConfig(config = {}, telegramSource = {}) {
  return {
    mode: config.mode || '',
    entriesPaused: Boolean(config.entriesPaused),
    managementOnly: Boolean(config.managementOnly),
    maxEntryDeviationPercent: finite(config.maxEntryDeviationPercent),
    maxSignalAgeMinutes: finite(config.maxSignalAgeMinutes),
    maxStopDistancePercent: finite(config.maxStopDistancePercent),
    costGuardMode: config.costGuardMode || '',
    estimatedCommissionRebatePercent: finite(config.estimatedCommissionRebatePercent),
    telegramPollSeconds: finite(telegramSource.pollSeconds),
    telegramRefreshSeconds: finite(telegramSource.refreshSeconds)
  };
}

async function fetchJson(pathname) {
  try {
    const response = await fetch(`http://localhost:5178${pathname}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

function inWindow(value, startAt, endAt) {
  const timestamp = Date.parse(value || 0);
  return Number.isFinite(timestamp) && timestamp >= Date.parse(startAt) && timestamp <= Date.parse(endAt);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function localMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function localDayKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return finite(value);
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function average(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? round(sum(numbers) / numbers.length) : null;
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
}

function money(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(4) : '-';
}

function pickBingXClock(clock = {}) {
  return {
    available: Boolean(clock.available),
    level: clock.level || 'unavailable',
    environment: clock.environment || '',
    offsetMs: finiteOrNull(clock.offsetMs),
    roundTripMs: finiteOrNull(clock.roundTripMs),
    uncertaintyMs: finiteOrNull(clock.uncertaintyMs),
    ageMs: finiteOrNull(clock.ageMs),
    stale: Boolean(clock.stale),
    checkedAt: clock.checkedAt || null,
    error: clock.error || null,
    observationalOnly: clock.observationalOnly !== false
  };
}

function clockStatus(clock = {}) {
  if (!clock.available) {
    return clock.error ? `sin medición (${clock.error})` : 'sin medición';
  }
  const offset = Number(clock.offsetMs);
  const sign = offset > 0 ? '+' : '';
  const age = clock.ageMs === null ? '-' : seconds(clock.ageMs / 1000);
  return `${sign}${milliseconds(offset)} de offset; RTT ${milliseconds(clock.roundTripMs)}; antigüedad ${age}; ${clock.level}${clock.stale ? ' (caducado)' : ''}; solo observación`;
}

function seconds(value) {
  if (value === null || value === undefined || value === '') {
    return 'sin datos';
  }
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(number < 10 ? 2 : 1)} s` : 'sin datos';
}

function milliseconds(value) {
  if (value === null || value === undefined || value === '') {
    return 'sin datos';
  }
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(0)} ms` : 'sin datos';
}

function percent(value) {
  if (value === null || value === undefined || value === '') {
    return 'sin datos';
  }
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : 'sin datos';
}
