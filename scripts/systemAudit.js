import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFuturesSignals } from '../src/futuresSignalParser.js';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dataDir = join(rootDir, '.data');
const reportDir = join(rootDir, 'docs', 'audits');
const dataReportDir = join(dataDir, 'audits');
const month = argument('--month') || localMonthKey();
const generatedAt = new Date().toISOString();

await Promise.all([mkdir(reportDir, { recursive: true }), mkdir(dataReportDir, { recursive: true })]);

const [postsData, eventsData, replicaPayload, operationalPayload, riskPayload, telegramSourcePayload, eventFile] = await Promise.all([
  readJson(join(dataDir, 'posts.json'), { posts: [] }),
  readJson(join(dataDir, 'trade-events.json'), { events: [] }),
  fetchJson(`/api/replica-audit?month=${encodeURIComponent(month)}`),
  fetchJson('/api/operational-status'),
  fetchJson('/api/risk'),
  fetchJson('/api/telegram-source'),
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
const closeQuality = summarizeCloses(events);
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
    incidents24h: operationalPayload?.incidents?.counts || null,
    risk: pickRisk(riskPayload?.risk),
    configuration: pickConfig(riskPayload?.bingx, telegramSourcePayload?.telegramSource)
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
    aggregatedRows: summary.aggregatedRows || 0,
    aggregatedCycles: summary.aggregatedCycles || 0,
    issueCounts: summary.issueCounts || {}
  } : null
};
report.findings = buildFindings(report);

const markdown = renderMarkdown(report);
const stamp = generatedAt.slice(0, 19).replaceAll(':', '-').replace('T', '-');
await Promise.all([
  writeFile(join(dataReportDir, 'system-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  writeFile(join(reportDir, 'latest.md'), markdown, 'utf8'),
  writeFile(join(reportDir, `system-audit-${stamp}.md`), markdown, 'utf8')
]);

console.log(JSON.stringify({
  ok: true,
  month,
  report: join(reportDir, 'latest.md'),
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
      const reference = Number(event.referenceEntryPrice || event.signal?.entry?.price);
      const actual = Number(event.entryPrice || event.response?.data?.order?.avgPrice);
      if (!Number.isFinite(reference) || reference <= 0 || !Number.isFinite(actual) || actual <= 0) {
        return null;
      }
      const direction = String(event.signal?.direction || '').toUpperCase();
      const signed = direction === 'SHORT'
        ? (reference - actual) / reference * 100
        : (actual - reference) / reference * 100;
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

function summarizeCloses(events) {
  const rows = events
    .filter((event) => /_close_sent$/.test(String(event.status || '')) && event.signal?.action === 'CLOSE')
    .map((event) => {
      const published = Number(event.closePrice || event.signal?.closePrice);
      const position = event.exchangeClose?.orders?.[0]?.position || event.exchangeClose?.positions?.[0];
      const market = Number(position?.markPrice || position?.lastPrice);
      if (!Number.isFinite(published) || published <= 0 || !Number.isFinite(market) || market <= 0) {
        return null;
      }
      const direction = String(event.signal?.direction || position?.positionSide || 'LONG').toUpperCase();
      const signed = direction === 'SHORT'
        ? (market - published) / published * 100
        : (published - market) / published * 100;
      const exposure = Number(position?.positionValue || 0);
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
  if (report.replica?.issueCounts?.['No ejecutada en VST']) {
    findings.push({ severity: 'high', code: 'sheet_operations_missing', detail: `${report.replica.issueCounts['No ejecutada en VST']} operaciones de la hoja no tienen apertura VST emparejada.` });
  }
  if (report.runtime.health?.level !== 'ok') {
    findings.push({ severity: 'critical', code: 'monitor_unhealthy', detail: 'El monitor no está en estado operativo correcto.' });
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
    `- Devolución estimada (${r.estimatedCommissionRebatePercent ?? 0}%): ${money(r.estimatedCommissionRebate)} VST`,
    `- Neto tras devolución estimada: ${money(r.netAfterEstimatedRebate)} VST`,
    `- Ciclos con entradas agregadas: ${r.aggregatedCycles ?? 0} (${r.aggregatedRows ?? 0} filas)`,
    `- Clasificación: ${JSON.stringify(r.issueCounts || {})}`,
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
    `- Recarga Telegram: ${report.runtime.configuration?.telegramRefreshSeconds || '-'} s`,
    '',
    '## Interpretación',
    '',
    'El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. Una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.',
    ''
  ];
  return `${lines.join('\n')}\n`;
}

function sameSignal(event, signal) {
  return event.postId === signal.postId
    && String(event.signal?.symbol || '') === signal.symbol
    && String(event.signal?.direction || '') === signal.direction;
}

function reasonType(reason) {
  return String(reason || 'unknown').split(':')[0] || 'unknown';
}

function pickHealth(health = {}) {
  return {
    level: health.level || 'unknown',
    running: Boolean(health.running),
    phase: health.phase || '',
    ageSeconds: finite(health.ageSeconds),
    visiblePosts: finite(health.visiblePosts),
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

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function percent(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '-';
}
