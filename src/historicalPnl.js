import { parseFuturesSignals } from './futuresSignalParser.js';

export function buildHistoricalPnl(posts, { months = 72, defaultNotionalUSDT = 10, fallbackLeverage = 1 } = {}) {
  const now = new Date();
  const ranges = buildMonthRanges(months, now);
  const rangeMonths = new Set(ranges.map((range) => range.month));
  const rows = new Map();
  const positions = [];
  const openPositions = [];
  const stats = {
    posts: Array.isArray(posts) ? posts.length : 0,
    openSignals: 0,
    closeSignals: 0,
    skippedSignals: 0,
    unmatchedCloses: 0
  };

  for (const range of ranges) {
    ensureRow(rows, range.month, 'USDT');
  }

  const orderedPosts = [...(posts || [])]
    .map((post, index) => ({ post, index, at: estimatePostDate(post, now) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime() || b.index - a.index);

  for (const item of orderedPosts) {
    const signals = parseFuturesSignals(item.post.text || '').filter((signal) => signal.isSignal);
    for (const signal of signals) {
      if (signal.action === 'CLOSE') {
        stats.closeSignals += 1;
        const closed = closeHistoricalPositions({ signal, post: item.post, at: item.at, openPositions, positions });
        if (!closed) {
          stats.unmatchedCloses += 1;
        }
        continue;
      }

      const position = openHistoricalPosition({
        signal,
        post: item.post,
        at: item.at,
        defaultNotionalUSDT,
        fallbackLeverage
      });
      if (!position) {
        stats.skippedSignals += 1;
        continue;
      }

      stats.openSignals += 1;
      openPositions.push(position);
      positions.push(position);
    }
  }

  for (const position of positions) {
    const month = position.status === 'closed'
      ? monthKey(new Date(position.closedAt))
      : monthKey(new Date(position.openedAt));
    if (!rangeMonths.has(month)) {
      continue;
    }

    const row = ensureRow(rows, month, 'USDT');
    row.testOrders += 1;
    if (position.status === 'closed') {
      row.closedTrades += 1;
      row.closedPaperTrades += 1;
      row.paperRealized = roundMoney(row.paperRealized + Number(position.realizedPnl || 0));
    } else {
      row.openPaperTrades += 1;
    }
    row.paperPnl = roundMoney(row.paperRealized + row.paperUnrealized);
    row.total = row.paperPnl;
    row.realized = row.paperRealized;
  }

  const monthsRows = Array.from(rows.values()).sort(compareRows);
  return {
    range: {
      months: ranges.length,
      startTime: ranges[0]?.startTime || null,
      endTime: ranges.at(-1)?.endTime || null
    },
    months: monthsRows,
    totals: summarizeRows(monthsRows),
    positions: positions.sort((a, b) => Date.parse(b.closedAt || b.openedAt) - Date.parse(a.closedAt || a.openedAt)),
    stats: {
      ...stats,
      closedTrades: positions.filter((position) => position.status === 'closed').length,
      openTrades: positions.filter((position) => position.status === 'open').length
    }
  };
}

function openHistoricalPosition({ signal, post, at, defaultNotionalUSDT, fallbackLeverage }) {
  const entryPrice = Number(signal.entry?.price);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return null;
  }

  const signalLeverage = Number(signal.leverage);
  const leverage = Number.isFinite(signalLeverage) && signalLeverage > 0 ? signalLeverage : Number(fallbackLeverage || 1);
  const signalNotional = Number(signal.notionalUSDT);
  const notional = Number.isFinite(signalNotional) && signalNotional > 0 ? signalNotional : Number(defaultNotionalUSDT || 10);
  const exposure = notional * leverage;
  const quantity = exposure / entryPrice;

  if (![leverage, notional, exposure, quantity].every(Number.isFinite) || quantity <= 0) {
    return null;
  }

  return {
    id: historicalId(`${post?.id || signal.rawText}:${signal.symbol}:${entryPrice}`),
    status: 'open',
    openedAt: at.toISOString(),
    closedAt: null,
    symbol: signal.symbol,
    direction: signal.direction,
    quantity,
    entryPrice,
    currentPrice: entryPrice,
    closePrice: null,
    closeReason: null,
    stopLoss: signal.stopLoss ? Number(signal.stopLoss) : null,
    takeProfit: signal.takeProfits?.[0] ? Number(signal.takeProfits[0]) : null,
    takeProfits: Array.isArray(signal.takeProfits) ? signal.takeProfits.map(Number).filter(Number.isFinite) : [],
    leverage,
    notional,
    exposure,
    unrealizedPnl: 0,
    realizedPnl: 0,
    paperPnl: 0,
    postId: post?.id || null,
    postUrl: post?.url || null,
    publishedText: post?.publishedText || '',
    historical: true
  };
}

function closeHistoricalPositions({ signal, post, at, openPositions, positions }) {
  const closePrice = Number(signal.closePrice);
  if (!Number.isFinite(closePrice) || closePrice <= 0) {
    return 0;
  }

  let closed = 0;
  for (const position of positions) {
    if (position.status !== 'open' || position.symbol !== signal.symbol) {
      continue;
    }

    position.status = 'closed';
    position.closedAt = at.toISOString();
    position.closePrice = closePrice;
    position.closeReason = 'youtube_close';
    position.currentPrice = closePrice;
    position.realizedPnl = calculatePnl(position, closePrice);
    position.unrealizedPnl = 0;
    position.paperPnl = position.realizedPnl;
    position.closePostId = post?.id || null;
    position.closePostUrl = post?.url || null;
    closed += 1;
  }

  for (let index = openPositions.length - 1; index >= 0; index -= 1) {
    if (openPositions[index].status !== 'open') {
      openPositions.splice(index, 1);
    }
  }

  return closed;
}

function calculatePnl(position, price) {
  const quantity = Number(position.quantity);
  const entryPrice = Number(position.entryPrice);
  const currentPrice = Number(price);
  if (![quantity, entryPrice, currentPrice].every(Number.isFinite)) {
    return 0;
  }

  const direction = position.direction === 'SHORT' ? -1 : 1;
  return roundMoney((currentPrice - entryPrice) * quantity * direction);
}

function buildMonthRanges(input, now) {
  const months = Math.min(120, Math.max(1, Math.trunc(Number(input)) || 72));
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ranges = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth() - offset, 1);
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    ranges.push({
      month: monthKey(start),
      startTime: start.getTime(),
      endTime: Math.min(next.getTime() - 1, now.getTime())
    });
  }

  return ranges;
}

function estimatePostDate(post, now) {
  const age = relativeAgeMs(post?.publishedText);
  if (Number.isFinite(age)) {
    return new Date(now.getTime() - age);
  }

  const fallback = Date.parse(post?.firstSeenAt || post?.scrapedAt || 0);
  return Number.isFinite(fallback) ? new Date(fallback) : now;
}

function relativeAgeMs(value) {
  const text = normalizeRelativeText(value);
  if (!text) {
    return Number.POSITIVE_INFINITY;
  }

  if (/^(ahora|just now|now)$/.test(text)) {
    return 0;
  }

  if (text === 'ayer' || text === 'yesterday') {
    return unitMs.day;
  }

  const spanish = text.match(/hace\s+(un|una|uno|\d+)\s+([a-z]+)/);
  const english = text.match(/(a|an|one|\d+)\s+([a-z]+)\s+ago/);
  const match = spanish || english;
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  return parseAmount(match[1]) * unitFromText(match[2]);
}

function normalizeRelativeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(value) {
  return /^(un|una|uno|a|an|one)$/.test(value) ? 1 : Number(value);
}

function unitFromText(value) {
  const unit = value.toLowerCase();
  if (/^seg|^sec|^second/.test(unit)) {
    return unitMs.second;
  }
  if (/^min|^minute/.test(unit)) {
    return unitMs.minute;
  }
  if (/^hora|^hour/.test(unit)) {
    return unitMs.hour;
  }
  if (/^dia|^day/.test(unit)) {
    return unitMs.day;
  }
  if (/^sem|^week/.test(unit)) {
    return unitMs.week;
  }
  if (/^mes|^month/.test(unit)) {
    return unitMs.month;
  }
  if (/^ano|^year/.test(unit)) {
    return unitMs.year;
  }
  return Number.POSITIVE_INFINITY;
}

function ensureRow(rows, month, asset) {
  const key = `${month}|${asset}`;
  if (!rows.has(key)) {
    rows.set(key, {
      month,
      asset,
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
      closedTrades: 0,
      records: 0,
      testOrders: 0,
      liveOrders: 0
    });
  }
  return rows.get(key);
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
    closedTrades: summary.closedTrades + Number(row.closedTrades || 0),
    testOrders: summary.testOrders + Number(row.testOrders || 0),
    liveOrders: summary.liveOrders + Number(row.liveOrders || 0),
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
    closedTrades: 0,
    testOrders: 0,
    liveOrders: 0,
    records: 0
  });
}

function compareRows(a, b) {
  return b.month.localeCompare(a.month) || a.asset.localeCompare(b.asset);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function historicalId(value) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `hist_${Math.abs(hash).toString(36)}`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100000000) / 100000000;
}

const unitMs = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
};
