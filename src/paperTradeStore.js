import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class PaperTradeStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      version: 1,
      updatedAt: null,
      positions: []
    };
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.positions)) {
        this.data = parsed;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }
  }

  async save() {
    this.data.updatedAt = new Date().toISOString();
    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`);
  }

  list() {
    return [...this.data.positions].sort((a, b) => Date.parse(b.openedAt || 0) - Date.parse(a.openedAt || 0));
  }

  async clear() {
    const cleared = this.data.positions.length;
    this.data.positions = [];
    await this.save();
    return cleared;
  }

  openSymbols() {
    return [...new Set(
      this.data.positions
        .filter((position) => position.status === 'open')
        .map((position) => position.symbol)
        .filter(Boolean)
    )].sort();
  }

  async openPosition({ signal, post, phase, order, response, entryPrice, quantity, leverage, notional, exposure }) {
    const clientOrderId = order?.clientOrderId || paperId(signal.symbol);
    const signalKey = stableSignalKey(signal);
    const existing = this.data.positions.find((position) => (
      position.clientOrderId === clientOrderId
      || position.signalKey === signalKey
    ));
    if (existing) {
      return existing;
    }

    const position = {
      id: paperId(`${clientOrderId}:${signal.symbol}`),
      status: 'open',
      openedAt: new Date().toISOString(),
      closedAt: null,
      symbol: signal.symbol,
      direction: signal.direction,
      quantity: Number(quantity),
      entryPrice: Number(entryPrice),
      currentPrice: Number(entryPrice),
      closePrice: null,
      closeReason: null,
      stopLoss: signal.stopLoss ? Number(signal.stopLoss) : null,
      takeProfit: signal.takeProfits?.[0] ? Number(signal.takeProfits[0]) : null,
      takeProfits: Array.isArray(signal.takeProfits) ? signal.takeProfits.map(Number).filter(Number.isFinite) : [],
      leverage: Number(leverage),
      notional: Number(notional),
      exposure: Number(exposure || Number(notional) * Number(leverage)),
      unrealizedPnl: 0,
      realizedPnl: 0,
      paperPnl: 0,
      postId: post?.id || null,
      postUrl: post?.url || null,
      phase: phase || null,
      clientOrderId,
      signalKey,
      exchangeResponse: response?.data || response || null
    };

    this.data.positions.unshift(position);
    await this.save();
    return position;
  }

  async markToMarket(fetchPrice) {
    const prices = new Map();
    let changed = false;

    for (const position of this.data.positions) {
      if (position.status !== 'open') {
        continue;
      }

      if (!prices.has(position.symbol)) {
        prices.set(position.symbol, await fetchPrice(position.symbol).catch(() => null));
      }

      const currentPrice = Number(prices.get(position.symbol));
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        continue;
      }

      const close = paperClose(position, currentPrice);
      if (close) {
        position.status = 'closed';
        position.closedAt = new Date().toISOString();
        position.closePrice = close.price;
        position.closeReason = close.reason;
        position.currentPrice = currentPrice;
        position.realizedPnl = calculatePnl(position, close.price);
        position.unrealizedPnl = 0;
        position.paperPnl = position.realizedPnl;
      } else {
        position.currentPrice = currentPrice;
        position.unrealizedPnl = calculatePnl(position, currentPrice);
        position.paperPnl = position.unrealizedPnl;
      }
      changed = true;
    }

    if (changed) {
      await this.save();
    }

    return this.list();
  }

  async applyMarketPrice({ symbol, price, source = 'market' }) {
    const currentPrice = Number(price);
    if (!symbol || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      return { updated: [], closed: [] };
    }

    const updated = [];
    const closed = [];
    let changed = false;

    for (const position of this.data.positions) {
      if (position.status !== 'open' || position.symbol !== symbol) {
        continue;
      }

      const close = paperClose(position, currentPrice);
      position.currentPrice = currentPrice;
      position.priceSource = source;
      position.priceUpdatedAt = new Date().toISOString();

      if (close) {
        position.status = 'closed';
        position.closedAt = new Date().toISOString();
        position.closePrice = close.price;
        position.closeReason = close.reason;
        position.triggerPrice = currentPrice;
        position.realizedPnl = calculatePnl(position, close.price);
        position.unrealizedPnl = 0;
        position.paperPnl = position.realizedPnl;
        closed.push(position);
      } else {
        position.unrealizedPnl = calculatePnl(position, currentPrice);
        position.paperPnl = position.unrealizedPnl;
        updated.push(position);
      }
      changed = true;
    }

    if (changed) {
      await this.save();
    }

    return { updated, closed };
  }

  async closeBySymbol({ symbol, price, percent = 100, reason = 'youtube_close', post, phase }) {
    const closed = [];
    const closeRatio = Math.min(100, Math.max(1, Number(percent) || 100)) / 100;
    for (const position of this.data.positions) {
      if (position.status !== 'open' || position.symbol !== symbol) {
        continue;
      }

      const closePrice = Number(price || position.currentPrice);
      if (!Number.isFinite(closePrice) || closePrice <= 0) {
        continue;
      }

      if (closeRatio >= 0.999) {
        position.status = 'closed';
        position.closedAt = new Date().toISOString();
        position.closePrice = closePrice;
        position.closeReason = reason;
        position.currentPrice = closePrice;
        position.realizedPnl = calculatePnl(position, closePrice);
        position.unrealizedPnl = 0;
        position.paperPnl = position.realizedPnl;
        position.closePostId = post?.id || null;
        position.closePostUrl = post?.url || null;
        position.closePhase = phase || null;
        position.closePercent = 100;
        closed.push(position);
        continue;
      }

      const originalQuantity = Number(position.quantity || 0);
      const closeQuantity = roundMoney(originalQuantity * closeRatio);
      const remainingQuantity = roundMoney(originalQuantity - closeQuantity);
      if (closeQuantity <= 0 || remainingQuantity <= 0) {
        continue;
      }

      const closedPosition = {
        ...position,
        id: paperId(`${position.id}:partial:${Date.now()}`),
        status: 'closed',
        closedAt: new Date().toISOString(),
        quantity: closeQuantity,
        notional: roundMoney(Number(position.notional || 0) * closeRatio),
        exposure: roundMoney(Number(position.exposure || 0) * closeRatio),
        closePrice,
        closeReason: `${reason}_partial`,
        currentPrice: closePrice,
        realizedPnl: calculatePnl({ ...position, quantity: closeQuantity }, closePrice),
        unrealizedPnl: 0,
        closePostId: post?.id || null,
        closePostUrl: post?.url || null,
        closePhase: phase || null,
        closePercent: roundMoney(closeRatio * 100),
        sourcePositionId: position.id,
        paperPnl: 0
      };
      closedPosition.paperPnl = closedPosition.realizedPnl;

      position.quantity = remainingQuantity;
      position.notional = roundMoney(Number(position.notional || 0) * (1 - closeRatio));
      position.exposure = roundMoney(Number(position.exposure || 0) * (1 - closeRatio));
      position.currentPrice = closePrice;
      position.unrealizedPnl = calculatePnl(position, closePrice);
      position.paperPnl = position.unrealizedPnl;

      this.data.positions.unshift(closedPosition);
      closed.push(closedPosition);
    }

    if (closed.length) {
      await this.save();
    }

    return closed;
  }

  async moveStopToBreakEven({ symbol, post, phase }) {
    const updated = [];
    for (const position of this.data.positions) {
      if (position.status !== 'open' || position.symbol !== symbol) {
        continue;
      }

      position.stopLoss = Number(position.entryPrice);
      position.updatedAt = new Date().toISOString();
      position.lastManagement = 'move_sl_be';
      position.managementPostId = post?.id || null;
      position.managementPostUrl = post?.url || null;
      position.managementPhase = phase || null;
      updated.push(position);
    }

    if (updated.length) {
      await this.save();
    }

    return updated;
  }

  riskSnapshot(now = new Date()) {
    const day = dayKey(now);
    const month = monthKey(now);
    const openPositions = this.data.positions.filter((position) => position.status === 'open');
    const dailyPositions = this.data.positions.filter((position) => dayKey(new Date(position.closedAt || position.openedAt)) === day);
    const monthlyPositions = this.data.positions.filter((position) => monthKey(new Date(position.closedAt || position.openedAt)) === month);
    const dailyPnl = roundMoney(dailyPositions.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0));
    const monthlyPnl = roundMoney(monthlyPositions.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0));

    return {
      openPositions: openPositions.length,
      openExposure: roundMoney(openPositions.reduce((sum, position) => sum + Number(position.exposure || position.notional || 0), 0)),
      dailyPnl,
      monthlyPnl,
      day,
      month
    };
  }

  toCsv() {
    const fields = [
      'id',
      'status',
      'symbol',
      'direction',
      'openedAt',
      'closedAt',
      'entryPrice',
      'currentPrice',
      'closePrice',
      'stopLoss',
      'takeProfit',
      'leverage',
      'notional',
      'exposure',
      'quantity',
      'paperPnl',
      'realizedPnl',
      'unrealizedPnl',
      'closeReason',
      'closePercent',
      'triggerPrice',
      'priceSource',
      'priceUpdatedAt',
      'postUrl',
      'closePostUrl'
    ];
    const rows = this.list().map((position) => fields.map((field) => csvValue(position[field])).join(','));
    return `${fields.join(',')}\n${rows.join('\n')}\n`;
  }

  monthlySummary(ranges) {
    const rangeMonths = new Set(ranges.map((range) => range.month));
    const currentMonth = monthKey(new Date());
    const rows = new Map();

    for (const position of this.data.positions) {
      const month = position.status === 'open'
        ? currentMonth
        : monthKey(new Date(position.closedAt || position.openedAt));
      if (!rangeMonths.has(month)) {
        continue;
      }

      const row = ensureRow(rows, month, 'USDT');
      row.testOrders += 1;

      if (position.status === 'closed') {
        row.closedPaperTrades += 1;
        row.paperRealized = roundMoney(row.paperRealized + Number(position.realizedPnl || 0));
      } else {
        row.openPaperTrades += 1;
        row.paperUnrealized = roundMoney(row.paperUnrealized + Number(position.unrealizedPnl || 0));
      }

      row.paperPnl = roundMoney(row.paperRealized + row.paperUnrealized);
    }

    return Array.from(rows.values()).sort((a, b) => b.month.localeCompare(a.month));
  }
}

function ensureRow(rows, month, asset) {
  const key = `${month}|${asset}`;
  if (!rows.has(key)) {
    rows.set(key, {
      month,
      asset,
      paperPnl: 0,
      paperRealized: 0,
      paperUnrealized: 0,
      openPaperTrades: 0,
      closedPaperTrades: 0,
      testOrders: 0
    });
  }
  return rows.get(key);
}

function paperClose(position, currentPrice) {
  const stopLoss = position.stopLoss === null || position.stopLoss === undefined ? NaN : Number(position.stopLoss);
  const takeProfit = position.takeProfit === null || position.takeProfit === undefined ? NaN : Number(position.takeProfit);

  if (position.direction === 'LONG') {
    if (Number.isFinite(stopLoss) && currentPrice <= stopLoss) {
      return { reason: 'stop_loss', price: stopLoss };
    }
    if (Number.isFinite(takeProfit) && currentPrice >= takeProfit) {
      return { reason: 'take_profit', price: takeProfit };
    }
    return null;
  }

  if (Number.isFinite(stopLoss) && currentPrice >= stopLoss) {
    return { reason: 'stop_loss', price: stopLoss };
  }
  if (Number.isFinite(takeProfit) && currentPrice <= takeProfit) {
    return { reason: 'take_profit', price: takeProfit };
  }
  return null;
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

function stableSignalKey(signal) {
  return [
    signal.symbol,
    signal.direction,
    signal.entry?.type || '',
    signal.entry?.price || '',
    signal.stopLoss || '',
    signal.leverage || '',
    signal.notionalUSDT || ''
  ].join('|');
}

function paperId(value = Date.now()) {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `paper_${Date.now().toString(36)}_${Math.abs(hash).toString(36)}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100000000) / 100000000;
}

function csvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = Array.isArray(value) || typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
