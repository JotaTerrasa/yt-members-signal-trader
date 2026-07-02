const fallbackPortfolioUrl = 'https://4tfs.short.gy/14may';
const cacheMs = 5 * 60 * 1000;
const cache = new Map();
const sourceCache = new Map();
const sheetNamesCache = new Map();

const spanishMonths = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE'
];

export function clearReferenceLedgerCache() {
  cache.clear();
  sourceCache.clear();
  sheetNamesCache.clear();
}

export async function resolvePortfolioSource(portfolioUrl = fallbackPortfolioUrl) {
  const requestedUrl = String(portfolioUrl || fallbackPortfolioUrl).trim();
  const cached = sourceCache.get(requestedUrl);
  if (cached && Date.now() - cached.at < cacheMs) {
    return cached.value;
  }

  const directId = extractSpreadsheetId(requestedUrl);
  if (directId) {
    const direct = portfolioSource({
      originalUrl: requestedUrl,
      resolvedUrl: requestedUrl,
      spreadsheetId: directId
    });
    sourceCache.set(requestedUrl, { at: Date.now(), value: direct });
    return direct;
  }

  const response = await fetch(requestedUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 YouTubePostsScraper/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`No se pudo resolver el portfolio: HTTP ${response.status}`);
  }

  let resolvedUrl = response.url || requestedUrl;
  let spreadsheetId = extractSpreadsheetId(resolvedUrl);
  if (!spreadsheetId) {
    const body = await response.text();
    const embeddedUrl = extractSpreadsheetUrl(body);
    resolvedUrl = embeddedUrl || resolvedUrl;
    spreadsheetId = extractSpreadsheetId(embeddedUrl || body);
  }
  if (!spreadsheetId) {
    throw new Error('El enlace de portfolio no apunta a un Google Sheet legible.');
  }

  const source = portfolioSource({
    originalUrl: requestedUrl,
    resolvedUrl,
    spreadsheetId
  });
  sourceCache.set(requestedUrl, { at: Date.now(), value: source });
  return source;
}

function extractSpreadsheetId(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  const urlMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  const idMatch = text.match(/^[a-zA-Z0-9-_]{30,}$/);
  return idMatch ? idMatch[0] : '';
}

function extractSpreadsheetUrl(value) {
  const text = String(value || '').replace(/\\\//g, '/').replace(/&amp;/g, '&');
  const match = text.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+[^"'\s<]*/);
  return match ? match[0] : '';
}

function portfolioSource({ originalUrl, resolvedUrl, spreadsheetId }) {
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return {
    originalUrl,
    resolvedUrl,
    spreadsheetId,
    spreadsheetUrl
  };
}

export async function loadReferenceLedger({ month = currentMonthKey(), portfolioUrl = fallbackPortfolioUrl } = {}) {
  const source = await resolvePortfolioSource(portfolioUrl);
  const cacheKey = `${month}:${source.spreadsheetId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < cacheMs) {
    return cached.value;
  }

  const requestedSheetName = sheetNameForMonth(month);
  let sheetName = requestedSheetName;
  let rows = await fetchSheetRows(source.spreadsheetId, sheetName);
  let positions = positionsFromRows(rows, month, sheetName);

  if (!positions.length) {
    const alternatives = await compatibleSheetNames(source.spreadsheetId, requestedSheetName, month);
    for (const alternative of alternatives) {
      const alternativeRows = await fetchSheetRows(source.spreadsheetId, alternative);
      const alternativePositions = positionsFromRows(alternativeRows, month, alternative);
      if (alternativePositions.length) {
        sheetName = alternative;
        rows = alternativeRows;
        positions = alternativePositions;
        break;
      }
    }
  }

  if (!positions.length) {
    throw new Error(`La hoja ${requestedSheetName} no tiene ordenes legibles.`);
  }

  const row = summaryRow(month, positions);
  const equity = parseNumber(rows[0]?.[10]);
  const value = {
    month,
    sheetName,
    spreadsheetUrl: source.spreadsheetUrl,
    fetchedAt: new Date().toISOString(),
    startingCapital: Number.isFinite(equity) ? roundMoney(equity - row.paperPnl) : null,
    equity: Number.isFinite(equity) ? equity : null,
    row,
    positions,
    source: {
      type: 'google_sheet',
      label: sheetName,
      requestedLabel: requestedSheetName,
      url: source.originalUrl,
      spreadsheetUrl: source.spreadsheetUrl,
      resolvedUrl: source.resolvedUrl,
      spreadsheetId: source.spreadsheetId
    }
  };

  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

export async function applyReferenceLedger(historical, { month = currentMonthKey(), portfolioUrl = fallbackPortfolioUrl } = {}) {
  let reference;
  try {
    reference = await loadReferenceLedger({ month, portfolioUrl });
  } catch (error) {
    return {
      ...historical,
      source: {
        ...(historical.source || {}),
        referenceLedgerError: error.message
      }
    };
  }

  const months = historical.months.map((row) => (row.month === month ? reference.row : row));
  if (!months.some((row) => row.month === month)) {
    months.push(reference.row);
  }
  months.sort(compareRows);

  const positions = [
    ...historical.positions.filter((position) => monthKey(position.closedAt || position.openedAt) !== month),
    ...reference.positions
  ].sort((left, right) => Date.parse(right.closedAt || right.openedAt || 0) - Date.parse(left.closedAt || left.openedAt || 0));

  return {
    ...historical,
    months,
    totals: summarizeRows(months),
    positions,
    source: {
      ...(historical.source || {}),
      referenceLedger: {
        ...reference.source,
        startingCapital: reference.startingCapital,
        equity: reference.equity
      },
      alignedMonth: month
    },
    stats: {
      ...(historical.stats || {}),
      referenceLedgerOrders: reference.positions.length
    }
  };
}

async function fetchSheetRows(spreadsheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo leer ${sheetName}: HTTP ${response.status}`);
  }
  return parseGvizRows(await response.text());
}

function positionsFromRows(rows, month, sheetName) {
  return rows
    .slice(2)
    .filter((row) => Number.isFinite(Number(row[0])) && row[2])
    .map((row) => referencePosition(row, month, sheetName))
    .filter(Boolean);
}

async function compatibleSheetNames(spreadsheetId, requestedSheetName, month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = spanishMonths[monthNumber - 1];
  if (!year || !label) {
    return [];
  }

  const names = await listSpreadsheetSheetNames(spreadsheetId);
  const matching = names.filter((name) => (
    normalizeSheetName(name).startsWith(normalizeSheetName(`FUTUROS ${label}`))
    && normalizeSheetName(name) !== normalizeSheetName(requestedSheetName)
  ));

  return matching.sort((left, right) => {
    const leftYear = sheetNameYear(left);
    const rightYear = sheetNameYear(right);
    const leftFuture = leftYear >= year ? 0 : 1;
    const rightFuture = rightYear >= year ? 0 : 1;
    return leftFuture - rightFuture
      || Math.abs(leftYear - year) - Math.abs(rightYear - year)
      || left.localeCompare(right);
  });
}

async function listSpreadsheetSheetNames(spreadsheetId) {
  const cached = sheetNamesCache.get(spreadsheetId);
  if (cached && Date.now() - cached.at < cacheMs) {
    return cached.value;
  }

  const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`, {
    headers: {
      'user-agent': 'Mozilla/5.0 YouTubePostsScraper/1.0'
    }
  });
  if (!response.ok) {
    return [];
  }

  const body = await response.text();
  const names = [...new Set([...body.matchAll(/FUTUROS [A-ZÁÉÍÓÚÑ]+(?: PARTE \d+)?(?: 20\d{2})?(?: PARTE \d+)?/g)]
    .map((match) => match[0].replace(/\\"$/, '').trim()))];
  sheetNamesCache.set(spreadsheetId, { at: Date.now(), value: names });
  return names;
}

function normalizeSheetName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function sheetNameYear(value) {
  const match = String(value || '').match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

function referencePosition(row, month, sheetName) {
  const orderNumber = Number(row[0]);
  const symbol = `${String(row[2] || '').trim().toUpperCase()}-USDT`;
  const direction = String(row[3] || '').trim().toUpperCase();
  const entryPrice = parseNumber(row[4]);
  const closePrice = parseNumber(row[5]);
  const leverage = parseNumber(row[6]);
  const notional = parseNumber(row[7]);
  const exposure = parseNumber(row[8]) || notional * leverage;
  const pnl = parseNumber(row[10]);
  const parsedDate = parseSpanishDate(row[1]);
  if (parsedDate && monthKey(parsedDate) !== month) {
    return null;
  }
  const date = parsedDate || firstDayOfMonth(month);
  const quantity = entryPrice > 0 ? exposure / entryPrice : 0;

  if (!symbol || !direction || !entryPrice || !leverage || !notional || !Number.isFinite(pnl)) {
    return null;
  }

  const status = closePrice > 0 ? 'closed' : 'open';
  const at = date.toISOString();
  return {
    id: `ref_${month}_${orderNumber}`,
    status,
    openedAt: at,
    closedAt: status === 'closed' ? at : null,
    symbol,
    direction,
    quantity,
    entryPrice,
    currentPrice: closePrice || entryPrice,
    closePrice: closePrice || null,
    closeReason: status === 'closed' ? 'reference_ledger' : null,
    stopLoss: null,
    takeProfit: null,
    takeProfits: [],
    leverage,
    notional,
    exposure,
    unrealizedPnl: status === 'open' ? pnl : 0,
    realizedPnl: status === 'closed' ? pnl : 0,
    paperPnl: pnl,
    orderNumber,
    outcome: row[11] || '',
    referenceSheet: sheetName,
    historical: true,
    referenceLedger: true
  };
}

function summaryRow(month, positions) {
  const closed = positions.filter((position) => position.status === 'closed');
  const open = positions.filter((position) => position.status !== 'closed');
  const paperRealized = roundMoney(closed.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0));
  const paperUnrealized = roundMoney(open.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0));
  const paperPnl = roundMoney(paperRealized + paperUnrealized);

  return {
    month,
    asset: 'USDT',
    total: paperPnl,
    realized: paperRealized,
    fees: 0,
    funding: 0,
    adjustments: 0,
    paperPnl,
    paperRealized,
    paperUnrealized,
    openPaperTrades: open.length,
    closedPaperTrades: closed.length,
    closedTrades: closed.length,
    records: 0,
    testOrders: positions.length,
    liveOrders: 0
  };
}

function parseGvizRows(payload) {
  const json = String(payload || '')
    .replace(/^[\s\S]*?google\.visualization\.Query\.setResponse\(/, '')
    .replace(/\);\s*$/, '');
  const parsed = JSON.parse(json);
  return (parsed.table?.rows || []).map((row) => (
    (row.c || []).map((cell) => (cell ? cell.v : null))
  ));
}

function parseNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return NaN;
  }

  const negative = raw.startsWith('-') || raw.includes('-$') || raw.includes('-€');
  const cleaned = raw
    .replace(/[$€\s%]/g, '')
    .replace(/^-/, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number(cleaned);
  if (!Number.isFinite(number)) {
    return NaN;
  }
  return negative ? -number : number;
}

function parseSpanishDate(value) {
  const gvizDate = String(value || '').match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (gvizDate) {
    return new Date(Date.UTC(Number(gvizDate[1]), Number(gvizDate[2]), Number(gvizDate[3]), 12));
  }

  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value || '').trim())) {
    return excelDate(Number(value));
  }

  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12));
}

function excelDate(serial) {
  if (!Number.isFinite(serial)) {
    return null;
  }
  return new Date(Date.UTC(1899, 11, 30, 12) + serial * 86400000);
}

function firstDayOfMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1, 12));
}

function sheetNameForMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = spanishMonths[monthNumber - 1];
  if (!year || !label) {
    throw new Error(`Mes no valido: ${month}`);
  }
  return `FUTUROS ${label} ${year}`;
}

function currentMonthKey() {
  return monthKey(new Date());
}

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function compareRows(left, right) {
  return right.month.localeCompare(left.month) || left.asset.localeCompare(right.asset);
}

function summarizeRows(rows) {
  return rows.reduce((summary, row) => ({
    total: roundMoney(summary.total + Number(row.total || 0)),
    realized: roundMoney(summary.realized + Number(row.realized || 0)),
    fees: roundMoney(summary.fees + Number(row.fees || 0)),
    funding: roundMoney(summary.funding + Number(row.funding || 0)),
    adjustments: roundMoney(summary.adjustments + Number(row.adjustments || 0)),
    paperPnl: roundMoney(summary.paperPnl + Number(row.paperPnl || 0)),
    paperRealized: roundMoney(summary.paperRealized + Number(row.paperRealized || 0)),
    paperUnrealized: roundMoney(summary.paperUnrealized + Number(row.paperUnrealized || 0)),
    openPaperTrades: summary.openPaperTrades + Number(row.openPaperTrades || 0),
    closedPaperTrades: summary.closedPaperTrades + Number(row.closedPaperTrades || 0),
    testOrders: summary.testOrders + Number(row.testOrders || 0),
    liveOrders: summary.liveOrders + Number(row.liveOrders || 0),
    closedTrades: summary.closedTrades + Number(row.closedTrades || 0),
    records: summary.records + Number(row.records || 0)
  }), {
    total: 0,
    realized: 0,
    fees: 0,
    funding: 0,
    adjustments: 0,
    paperPnl: 0,
    paperRealized: 0,
    paperUnrealized: 0,
    openPaperTrades: 0,
    closedPaperTrades: 0,
    testOrders: 0,
    liveOrders: 0,
    closedTrades: 0,
    records: 0
  });
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100000000) / 100000000;
}
