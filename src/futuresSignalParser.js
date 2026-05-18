const longWords = ['LONG', 'LARGO', 'BUY', 'COMPRA', 'COMPRAR'];
const shortWords = ['SHORT', 'CORTO', 'SELL', 'VENTA', 'VENDER'];
const directionWords = [...longWords, ...shortWords];
const symbolIgnoreWords = new Set(['USDT', 'USDC', 'BINGX', 'STOP', 'STOPLOSS', 'SL', 'TP', 'ENTRY', 'ENTRADA', 'PRECIO', 'APALANCAMIENTO', 'ORDEN', 'TOTAL']);
const closeWordsPattern = /\b(CIERRE|CIERRES|CIERRO|CERRAR|CERRAMOS|CERRADO|CERRANDO|CLOSED?|CLOSE|SALIR|SALIMOS|FUERA)\b/i;

export function parseFuturesSignal(text) {
  return parseFuturesSignals(text)[0];
}

export function parseFuturesSignals(text) {
  const raw = String(text || '');
  const managementSignals = parsePositionManagementSignals(raw);
  if (managementSignals.length) {
    return managementSignals.map(normalizeSignalPrices);
  }

  const structured = parseStructuredSignals(raw);
  if (structured.length) {
    return structured.map(normalizeSignalPrices);
  }

  return [normalizeSignalPrices(parseSingleFuturesSignal(raw))];
}

function parsePositionManagementSignals(raw) {
  return [
    ...parseCloseSignals(raw),
    ...parseBreakEvenSignals(raw)
  ];
}

function parseSingleFuturesSignal(raw) {
  const normalized = normalize(raw);
  const symbol = parseSymbol(raw, normalized);
  const direction = parseDirection(normalized);
  const entry = parseEntry(raw, normalized);
  const stopLoss = parseStopLoss(raw);
  const takeProfits = parseTakeProfits(raw);
  const leverage = parseLeverage(raw);
  const notionalUSDT = parseNotionalUSDT(raw);

  const reasons = [];
  if (!symbol) {
    reasons.push('missing_symbol');
  }
  if (!direction) {
    reasons.push('missing_direction');
  }

  const hasTradePlan = entry || stopLoss || takeProfits.length || leverage;
  if (!hasTradePlan) {
    reasons.push('missing_trade_plan');
  }

  if (reasons.length) {
    return {
      isSignal: false,
      reasons,
      rawText: raw
    };
  }

  return {
    isSignal: true,
    symbol,
    direction,
    entry,
    stopLoss,
    takeProfits,
    leverage,
    notionalUSDT,
    rawText: raw
  };
}

function parseCloseSignals(raw) {
  if (!closeWordsPattern.test(raw)) {
    return [];
  }

  const closePercent = parseClosePercent(raw);
  const matches = [...raw.matchAll(/\b([A-Z]{2,12})(?:\s*[-/]\s*USDT|\s*USDT)?(?:\s+(?:BINGX\s*)?(\d+(?:[.,]\d+)?\s*[kK]?))?\b/gi)];
  const signals = [];
  for (const match of matches) {
    const baseSymbol = match[1].toUpperCase();
    if (symbolIgnoreWords.has(baseSymbol) || closeWordsPattern.test(baseSymbol)) {
      continue;
    }

    signals.push({
      isSignal: true,
      action: 'CLOSE',
      symbol: `${baseSymbol}-USDT`,
      closePrice: match[2] ? parseNumberToken(match[2]) : null,
      closePercent,
      rawText: raw
    });
  }

  return dedupeSignals(signals);
}

function parseBreakEvenSignals(raw) {
  const text = String(raw || '');
  const hasBreakEven = /\b(BE|BREAK\s*EVEN|BREAKEVEN)\b/i.test(text)
    || (/\b(SL|STOP|STOPLOSS|STOP LOSS)\b/i.test(text) && /\b(ENTRADA|ENTRY|PRECIO\s+DE\s+ENTRADA)\b/i.test(text));
  if (!hasBreakEven) {
    return [];
  }

  const matches = [...text.matchAll(/\b([A-Z]{2,12})(?:\s*[-/]\s*USDT|\s*USDT)?\b/gi)];
  const signals = [];
  for (const match of matches) {
    const baseSymbol = match[1].toUpperCase();
    if (symbolIgnoreWords.has(baseSymbol) || baseSymbol === 'BE' || baseSymbol === 'BREAK' || baseSymbol === 'EVEN') {
      continue;
    }

    signals.push({
      isSignal: true,
      action: 'MOVE_SL_BE',
      symbol: `${baseSymbol}-USDT`,
      rawText: raw
    });
  }

  return dedupeSignals(signals);
}

function parseClosePercent(raw) {
  const percent = String(raw || '').match(/\b(\d{1,3})(?:[.,]\d+)?\s*%/);
  if (percent) {
    return Math.min(100, Math.max(1, Number(percent[1])));
  }
  if (/\b(MITAD|HALF)\b/i.test(raw)) {
    return 50;
  }
  if (/\b(PARCIAL|PARCIALMENTE|PARTIAL)\b/i.test(raw)) {
    return 50;
  }
  return 100;
}

function parseStructuredSignals(raw) {
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const directionLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseDirectionLine(lines[index]);
    if (parsed) {
      directionLines.push({ ...parsed, index });
    }
  }

  if (!directionLines.length) {
    return [];
  }

  return directionLines.map((item, itemIndex) => {
    const next = directionLines[itemIndex + 1]?.index ?? lines.length;
    const block = lines.slice(item.index, next).join('\n');
    const stopLoss = parseSymbolStopLoss(block, item.baseSymbol) ?? (directionLines.length === 1 ? parseStopLoss(raw) : null);
    const takeProfits = parseSymbolTakeProfits(block, item.baseSymbol);
    const leverage = parseLeverage(block) ?? parseLeverage(raw);
    const notionalUSDT = parseNotionalUSDT(block);

    return {
      isSignal: true,
      symbol: `${item.baseSymbol}-USDT`,
      direction: item.direction,
      entry: item.price ? { type: 'LIMIT', price: item.price } : parseEntry(block, normalize(block)),
      stopLoss,
      takeProfits,
      leverage,
      notionalUSDT,
      rawText: raw
    };
  });
}

function parseDirectionLine(line) {
  const match = String(line || '').match(new RegExp(`\\b(${directionWords.join('|')})\\s+([A-Z]{2,12})(?:\\s+(?:BINGX\\s*)?(\\d+(?:[.,]\\d+)?\\s*[kK]?))?\\b`, 'i'));
  if (!match) {
    return null;
  }

  const baseSymbol = match[2].toUpperCase();
  if (symbolIgnoreWords.has(baseSymbol)) {
    return null;
  }

  const directionWord = match[1].toUpperCase();
  const direction = longWords.includes(directionWord) ? 'LONG' : 'SHORT';
  const price = match[3] ? parseNumberToken(match[3]) : null;

  return {
    baseSymbol,
    direction,
    price: Number.isFinite(price) && price > 0 ? price : null
  };
}

function parseSymbol(raw, normalized) {
  const pair = raw.match(/\b([A-Z0-9]{2,12})\s*[-/]\s*(USDT|USDC)\b/i);
  if (pair) {
    return `${pair[1].toUpperCase()}-${pair[2].toUpperCase()}`;
  }

  const compact = raw.match(/\b([A-Z][A-Z0-9]{1,11})(USDT|USDC)\b/i);
  if (compact) {
    return `${compact[1].toUpperCase()}-${compact[2].toUpperCase()}`;
  }

  const directional = parseDirectionLine(raw);
  if (directional) {
    return `${directional.baseSymbol}-USDT`;
  }

  const cashtag = raw.match(/\$([A-Z]{2,12})\b/);
  if (cashtag && hasDirectionContext(normalized)) {
    return `${cashtag[1].toUpperCase()}-USDT`;
  }

  return null;
}

function parseDirection(normalized) {
  if (longWords.some((word) => hasWord(normalized, word))) {
    return 'LONG';
  }
  if (shortWords.some((word) => hasWord(normalized, word))) {
    return 'SHORT';
  }
  return null;
}

function parseEntry(raw, normalized) {
  if (/\b(MARKET|MERCADO|CMP|AHORA)\b/i.test(normalized)) {
    return { type: 'MARKET', price: null };
  }

  const line = findLine(raw, /\b(ENTRY|ENTRADA|ENTER|OPEN|ABRIR)\b/i);
  const numbers = extractNumbers(line || '');
  if (numbers.length) {
    return { type: 'LIMIT', price: numbers[0] };
  }

  return null;
}

function parseStopLoss(raw) {
  const line = findLine(raw, /\b(SL|STOP|STOPLOSS|STOP LOSS|INVALIDATION|INVALIDACION)\b/i);
  const numbers = extractNumbers(line || '');
  return numbers[0] || null;
}

function parseTakeProfits(raw) {
  const direct = [...raw.matchAll(/\b(?:TP\d*|TAKE\s*PROFIT|TARGET|OBJETIVO)\s*[:#-]?\s*(\d+(?:[.,]\d+)?)/gi)]
    .map((match) => Number(match[1].replace(',', '.')))
    .filter((number) => Number.isFinite(number) && number > 0);

  if (direct.length) {
    return uniqueNumbers(direct).slice(0, 6);
  }

  const lines = raw.split(/\n+/).filter((line) => /\b(TP\d*|TAKE PROFIT|TARGET|OBJETIVO)\b/i.test(line));
  return uniqueNumbers(lines.flatMap(extractNumbers)).slice(0, 6);
}

function parseSymbolStopLoss(raw, baseSymbol) {
  const line = raw.split(/\n+/).find((item) => (
    new RegExp(`\\b${baseSymbol}\\b`, 'i').test(item)
    && /\b(SL|STOP|STOPLOSS|STOP LOSS|INVALIDATION|INVALIDACION)\b/i.test(item)
  ));
  const numbers = extractNumbers(line || '');
  return numbers[0] || null;
}

function parseSymbolTakeProfits(raw, baseSymbol) {
  const lines = raw.split(/\n+/).filter((item) => (
    new RegExp(`\\b${baseSymbol}\\b`, 'i').test(item)
    && /\b(TP\d*|TAKE PROFIT|TARGET|OBJETIVO)\b/i.test(item)
  ));
  return uniqueNumbers(lines.flatMap(extractNumbers)).slice(0, 6);
}

function parseLeverage(raw) {
  const match = raw.match(/\b(?:x\s*)?(\d{1,3})\s*x\b/i) || raw.match(/\b(?:LEV|LEVERAGE|APAL|APALANCAMIENTO)\D{0,10}(\d{1,3})\b/i);
  return match ? Number(match[1]) : null;
}

function parseNotionalUSDT(raw) {
  const values = [...String(raw || '').matchAll(/\b(\d+(?:[.,]\d+)?)\s*USDT\b/gi)]
    .map((match) => Number(match[1].replace(',', '.')))
    .filter((number) => Number.isFinite(number) && number > 0);
  return values[0] || null;
}

function findLine(raw, pattern) {
  return raw.split(/\n+/).find((line) => pattern.test(line)) || '';
}

function extractNumbers(value) {
  return [...String(value || '').matchAll(/(?<![A-Za-z])\d+(?:[.,]\d+)?\s*[kK]?/g)]
    .map((match) => parseNumberToken(match[0]))
    .filter((number) => Number.isFinite(number) && number > 0);
}

function parseNumberToken(value) {
  const text = String(value || '').trim();
  const multiplier = /k$/i.test(text) ? 1000 : 1;
  const normalized = text.replace(/[kK]\s*$/, '').replace(',', '.').trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number * multiplier : NaN;
}

function uniqueNumbers(values) {
  return [...new Set(values.map((value) => Number(value)))];
}

function normalizeSignalPrices(signal) {
  if (!signal?.symbol) {
    return signal;
  }

  const baseSymbol = signal.symbol.split('-')[0];
  const next = { ...signal };
  if (next.entry?.price) {
    next.entry = {
      ...next.entry,
      price: normalizeSymbolPrice(baseSymbol, next.entry.price)
    };
  }
  if (next.stopLoss) {
    next.stopLoss = normalizeSymbolPrice(baseSymbol, next.stopLoss);
  }
  if (Array.isArray(next.takeProfits)) {
    next.takeProfits = next.takeProfits.map((price) => normalizeSymbolPrice(baseSymbol, price));
  }
  if (next.closePrice) {
    next.closePrice = normalizeSymbolPrice(baseSymbol, next.closePrice);
  }
  return next;
}

function normalizeSymbolPrice(baseSymbol, value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    return value;
  }

  if (baseSymbol === 'BTC' && price < 10000) {
    return scaleUpToMagnitude(price, 10000);
  }
  if (baseSymbol === 'ETH' && price < 1000) {
    return scaleUpToMagnitude(price, 1000);
  }
  return price;
}

function scaleUpToMagnitude(value, minimum) {
  let price = Number(value);
  while (price > 0 && price < minimum) {
    price *= 10;
  }
  return price;
}

function dedupeSignals(signals) {
  const seen = new Set();
  const deduped = [];
  for (const signal of signals) {
    const key = `${signal.action}:${signal.symbol}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(signal);
  }
  return deduped;
}

function hasDirectionContext(normalized) {
  return [...longWords, ...shortWords].some((word) => hasWord(normalized, word));
}

function hasWord(text, word) {
  return new RegExp(`(^|[^A-Z])${word}([^A-Z]|$)`, 'i').test(text);
}

function normalize(value) {
  return String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
}
