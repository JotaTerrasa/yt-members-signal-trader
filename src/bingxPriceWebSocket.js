import { EventEmitter } from 'node:events';
import { gunzipSync } from 'node:zlib';
import WebSocket from 'ws';

const DEFAULT_URL = 'wss://open-api-swap.bingx.com/swap-market';
const MARKET_TYPE = 'BingX Futuros Perpetuo USDⓈ';
const PRICE_CHANNEL = 'lastPrice';
const RECONNECT_MS = 3000;
const STALE_MS = 45000;

export class BingXPriceWebSocket extends EventEmitter {
  constructor({ url = DEFAULT_URL, onLog } = {}) {
    super();
    this.url = url;
    this.onLog = onLog;
    this.ws = null;
    this.symbols = new Set();
    this.prices = new Map();
    this.connected = false;
    this.connecting = false;
    this.lastMessageAt = null;
    this.lastError = null;
    this.lastConnectAt = null;
    this.reconnectTimer = null;
    this.staleTimer = null;
    this.reconnects = 0;
  }

  setSymbols(symbols) {
    const next = new Set(
      symbols
        .map(normalizeSymbol)
        .filter(Boolean)
    );
    const added = [...next].filter((symbol) => !this.symbols.has(symbol));
    const removed = [...this.symbols].filter((symbol) => !next.has(symbol));
    this.symbols = next;

    for (const symbol of removed) {
      this.prices.delete(symbol);
      this.unsubscribe(symbol);
    }

    if (!this.symbols.size) {
      this.close();
      this.emitStatus();
      return;
    }

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect();
      return;
    }

    for (const symbol of added) {
      this.subscribe(symbol);
    }
    this.emitStatus();
  }

  status() {
    return {
      enabled: this.symbols.size > 0,
      connected: this.connected,
      connecting: this.connecting,
      symbols: [...this.symbols].sort(),
      prices: [...this.prices.values()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
      marketType: MARKET_TYPE,
      channel: PRICE_CHANNEL,
      lastMessageAt: this.lastMessageAt,
      lastConnectAt: this.lastConnectAt,
      lastError: this.lastError,
      reconnects: this.reconnects,
      url: this.url
    };
  }

  connect() {
    if (!this.symbols.size || this.connecting || this.connected) {
      return;
    }

    this.clearReconnect();
    this.connecting = true;
    this.lastError = null;
    this.emitStatus();

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.on('open', () => {
      this.connected = true;
      this.connecting = false;
      this.lastConnectAt = new Date().toISOString();
      this.log('info', `WS BingX conectado (${this.symbols.size} simbolos).`);
      for (const symbol of this.symbols) {
        this.subscribe(symbol);
      }
      this.startStaleWatch();
      this.emitStatus();
    });

    ws.on('message', (raw) => {
      this.handleMessage(raw);
    });

    ws.on('error', (error) => {
      this.lastError = error.message;
      this.log('error', `WS BingX: ${error.message}`);
      this.emitStatus();
    });

    ws.on('close', () => {
      const hadSymbols = this.symbols.size > 0;
      this.connected = false;
      this.connecting = false;
      this.stopStaleWatch();
      this.emitStatus();
      if (hadSymbols) {
        this.scheduleReconnect();
      }
    });
  }

  close() {
    this.clearReconnect();
    this.stopStaleWatch();
    this.connected = false;
    this.connecting = false;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.removeAllListeners();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }

  destroy() {
    this.symbols.clear();
    this.close();
  }

  subscribe(symbol) {
    this.send({
      id: `sub-${symbol}-${Date.now()}`,
      reqType: 'sub',
      dataType: `${symbol}@${PRICE_CHANNEL}`
    });
  }

  unsubscribe(symbol) {
    this.send({
      id: `unsub-${symbol}-${Date.now()}`,
      reqType: 'unsub',
      dataType: `${symbol}@${PRICE_CHANNEL}`
    });
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
  }

  handleMessage(raw) {
    let text;
    try {
      text = decodeMessage(raw);
    } catch (error) {
      this.lastError = `No se pudo leer WS: ${error.message}`;
      this.emitStatus();
      return;
    }

    this.lastMessageAt = new Date().toISOString();
    if (text === 'Ping' || text === 'ping') {
      this.send(text === 'Ping' ? 'Pong' : 'pong');
      this.emitStatus();
      return;
    }

    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }

    if (message.ping || message.Ping) {
      this.send(message.ping ? { pong: message.ping } : 'Pong');
      this.emitStatus();
      return;
    }

    const ticks = extractTicks(message);
    for (const tick of ticks) {
      if (!this.symbols.has(tick.symbol)) {
        continue;
      }
      const normalizedTick = {
        ...tick,
        source: 'bingx_ws',
        marketType: MARKET_TYPE,
        channel: PRICE_CHANNEL,
        at: this.lastMessageAt
      };
      this.prices.set(tick.symbol, normalizedTick);
      this.emit('price', normalizedTick);
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !this.symbols.size) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnects += 1;
      this.connect();
    }, RECONNECT_MS);
    this.reconnectTimer.unref();
  }

  clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  startStaleWatch() {
    this.stopStaleWatch();
    this.staleTimer = setInterval(() => {
      if (!this.connected || !this.lastMessageAt) {
        return;
      }
      if (Date.now() - Date.parse(this.lastMessageAt) > STALE_MS) {
        this.lastError = 'WS sin ticks recientes, reconectando.';
        this.log('warn', this.lastError);
        this.close();
        if (this.symbols.size) {
          this.scheduleReconnect();
        }
      }
    }, 15000);
    this.staleTimer.unref();
  }

  stopStaleWatch() {
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  emitStatus() {
    this.emit('status', this.status());
  }

  log(level, message) {
    this.onLog?.({ level, message, at: new Date().toISOString() });
  }
}

function decodeMessage(raw) {
  const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  try {
    return gunzipSync(buffer).toString('utf8');
  } catch {
    return buffer.toString('utf8');
  }
}

function extractTicks(message) {
  const defaultSymbol = symbolFromChannel(message.dataType || message.stream || message.topic || message.channel);
  const payload = message.data ?? message.tick ?? message;
  const rows = Array.isArray(payload) ? payload : [payload];

  return rows
    .map((row) => {
      const symbol = normalizeSymbol(row?.symbol || row?.s || row?.pair || defaultSymbol);
      const price = firstFiniteNumber(
        row?.lastPrice,
        row?.price,
        row?.last,
        row?.close,
        row?.c,
        row?.p,
        row?.markPrice,
        row?.indexPrice,
        row?.bidPrice,
        row?.askPrice
      );
      if (!symbol || !Number.isFinite(price) || price <= 0) {
        return null;
      }
      return { symbol, price };
    })
    .filter(Boolean);
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return NaN;
}

function symbolFromChannel(channel) {
  const match = String(channel || '').match(/([A-Z0-9]+[-_/]USDT)/i);
  return match ? normalizeSymbol(match[1]) : '';
}

function normalizeSymbol(value) {
  const text = String(value || '').trim().toUpperCase();
  if (!text) {
    return '';
  }
  if (text.includes('-')) {
    return text;
  }
  if (text.includes('/')) {
    return text.replace('/', '-');
  }
  if (text.endsWith('USDT')) {
    return `${text.slice(0, -4)}-USDT`;
  }
  return text;
}
