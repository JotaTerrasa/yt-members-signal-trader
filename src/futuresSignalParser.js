const longWords = ['LONG', 'LARGO', 'BUY', 'COMPRA', 'COMPRAR'];
const shortWords = ['SHORT', 'CORTO', 'SELL', 'VENTA', 'VENDER'];
const directionWords = [...longWords, ...shortWords];
const symbolIgnoreWords = new Set([
  'USDT', 'USDC', 'BINGX', 'STOP', 'STOPLOSS', 'SL', 'TP', 'TPS', 'TAKE', 'PROFIT', 'OBJETIVO',
  'OBJETIVOS', 'TARGET', 'TARGETS', 'ENTRY', 'ENTRADA', 'PRECIO', 'APALANCAMIENTO', 'ORDEN',
  'TOTAL', 'TODO', 'TODOS', 'TODAS', 'A', 'AL', 'DE', 'DEL', 'EL', 'LA', 'LAS', 'LOS', 'UN',
  'UNA', 'UNO', 'Y', 'O', 'QUE', 'CON', 'POR', 'PARA', 'EN', 'TRAS', 'OS', 'SE', 'SI', 'NO',
  'AHORA', 'ACTUALIZO', 'BAJO', 'BAJISTAS', 'BENIGNO', 'COBERTURAS', 'DOBLE', 'DOS',
  'INDIVIDUALES', 'MEDIA', 'PCE', 'PORTFOLIO', 'SEMANAL', 'TENIAMOS', 'ZONA'
]);
const managementBaseSymbols = new Set([
  'BTC', 'ETH', 'SOL', 'SUI', 'XRP', 'ADA', 'DOT', 'LINK', 'AVAX', 'DOGE', 'BNB', 'NEAR',
  'FET', 'RENDER', 'WIF', 'PEPE', 'TON', 'OP', 'ARB', 'INJ', 'SEI', 'APT', 'LTC', 'BCH',
  'TRX', 'ETC', 'FIL', 'UNI', 'AAVE', 'ATOM'
]);
const baseSymbolAliases = new Map([
  ['BITCOIN', 'BTC'],
  ['BT', 'BTC'],
  ['ETHEREUM', 'ETH'],
  ['ETHER', 'ETH'],
  ['SOLANA', 'SOL'],
  ['RIPPLE', 'XRP'],
  ['CARDANO', 'ADA'],
  ['POLKADOT', 'DOT'],
  ['CHAINLINK', 'LINK'],
  ['AVALANCHE', 'AVAX'],
  ['DOGECOIN', 'DOGE'],
  ['DOGE', 'DOGE'],
  ['BNB', 'BNB']
]);
const closeWordsPattern = /\b(CIERRE|CIERRES|CIERRO|CERRAR|CERRAMOS|CERRADO|CERRANDO|CLOSED?|CLOSE|SALIR|SALIMOS|FUERA)\b/i;
const closeLineStartPattern = /^\W*(CIERRE|CIERRES|CIERRO|CERRAR|CERRAMOS|CERRADO|CERRANDO|CLOSED?|CLOSE|SALIR|SALIMOS|FUERA)\b/i;
const takeProfitLineStartPattern = /^\W*(TPS?|TAKE\s*PROFITS?|TAKE\s*PROFIT|OBJETIVOS?|TARGETS?)\b/i;
const listPrefixPattern = /^\W*(?:(?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SEPTIMO|OCTAVO|NOVENO|DECIMO|FIRST|SECOND|THIRD|\d+)\s*[:.)-]\s*)/i;
const symbolPricePattern = /\b([A-Z]{2,12})\.?(?:\s*[-/]\s*USDT|\s*USDT)?\s+(?:(?:A|AL|EN|TO|AT|@|=|->)\s*)?(?:BINGX\s*)?(\d+(?:[.,]\d+)?\s*[kK]?)\b/gi;
const stopLossLineStartPattern = /^\W*(?:MODIFICACI[OÓ]N|MODIFICAR|MODIF|CAMBIO|CAMBIAR|AJUSTE|AJUSTAR)?\s*(?:SL|STOP|STOPLOSS|STOP\s+LOSS|STOPS)\b/i;

export function parseFuturesSignal(text) {
  return parseFuturesSignals(text)[0];
}

export function parseFuturesSignals(text) {
  const raw = String(text || '');
  const closeAllSignals = parseCloseAllSignals(raw);
  if (closeAllSignals.length) {
    return closeAllSignals.map(normalizeSignalPrices);
  }

  const structured = parseStructuredSignals(raw);
  const managementSignals = parsePositionManagementSignals(raw);
  const combined = mergeStructuredAndManagementSignals(structured, managementSignals);
  if (combined.length) {
    return combined.map(normalizeSignalPrices);
  }


  return [normalizeSignalPrices(parseSingleFuturesSignal(raw))];
}

function parsePositionManagementSignals(raw) {
  return [
    ...parseCloseSignals(raw),
    ...parseTakeProfitSignals(raw),
    ...parseStopLossModificationSignals(raw),
    ...parseBreakEvenSignals(raw)
  ];
}

function mergeStructuredAndManagementSignals(structured, management) {
  const openSignals = structured.map((signal) => {
    const sameSymbolTakeProfits = management
      .filter((item) => item.action === 'SET_TAKE_PROFIT' && item.symbol === signal.symbol)
      .flatMap((item) => item.takeProfits || [item.takeProfit])
      .filter((value) => Number.isFinite(Number(value)) && Number(value) > 0)
      .map(Number);
    const sameSymbolStopLoss = management.find((item) => item.action === 'SET_STOP_LOSS' && item.symbol === signal.symbol)?.stopLoss;

    return {
      ...signal,
      stopLoss: signal.stopLoss || sameSymbolStopLoss || null,
      takeProfits: signal.takeProfits?.length ? signal.takeProfits : uniqueNumbers(sameSymbolTakeProfits).slice(0, 6)
    };
  });

  return [...openSignals, ...management];
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
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const closeStart = lines.findIndex(isCloseHeaderLine);
  if (closeStart < 0) {
    return [];
  }

  const closePercent = parseClosePercent(raw);
  const signals = [];
  for (const line of lines.slice(closeStart)) {
    for (const closeTarget of parseCloseTargetsFromLine(line)) {
      signals.push({
        isSignal: true,
        action: 'CLOSE',
        symbol: `${closeTarget.baseSymbol}-USDT`,
        closePrice: closeTarget.price,
        closePercent,
        rawText: raw
      });
    }
  }

  return dedupeSignals(signals);
}

function parseCloseAllSignals(raw) {
  const normalized = normalize(raw).replace(/\s+/g, ' ').trim();
  const closeAllPatterns = [
    /\bCERRAD(?:LO|LAS|LOS)?\s+TODO(?:S|AS)?\b/i,
    /\bCERRAR\s+TODO(?:S|AS)?\b/i,
    /\bCIERRE\s+(?:TOTAL\s+)?TODO(?:S|AS)?\b/i,
    /\bCIERRE\s+TOTAL\s+DE\s+TODO(?:S|AS)?\b/i,
    /\bCERRAMOS\s+TODO(?:S|AS)?\b/i,
    /\bCLOSE\s+ALL\b/i,
    /\bCLOSE\s+EVERYTHING\b/i,
    /\bSAL(?:IR|IMOS)\s+DE\s+TODO(?:S|AS)?\b/i
  ];

  if (!closeAllPatterns.some((pattern) => pattern.test(normalized))) {
    return [];
  }

  return [{
    isSignal: true,
    action: 'CLOSE_ALL',
    closePercent: parseClosePercent(raw),
    rawText: raw
  }];
}

function isCloseHeaderLine(line) {
  return closeLineStartPattern.test(normalize(line).trim());
}

function parseCloseTargetsFromLine(line) {
  const text = String(line || '').trim();
  if (!text) {
    return [];
  }

  const normalized = stripListPrefix(text);
  const headerLine = isCloseHeaderLine(normalized);
  const body = headerLine
    ? normalized
      .replace(closeLineStartPattern, ' ')
      .replace(/\b(TOTAL|PARCIAL|PARCIALMENTE|PARTIAL|MITAD|HALF)\b/gi, ' ')
      .replace(/\b\d{1,3}\s*%\b/g, ' ')
    : text;

  if (!headerLine && !looksLikeCloseTickerLine(text)) {
    return [];
  }

  const matches = [...body.matchAll(/\b([A-Z]{2,12})\.?(?:\s*[-/]\s*USDT|\s*USDT)?(?:\s+(?:BINGX\s*)?(\d+(?:[.,]\d+)?\s*[kK]?))?\b/gi)];
  return matches
    .map((match) => ({
      baseSymbol: normalizeBaseSymbol(match[1]),
      price: match[2] ? parseNumberToken(match[2]) : null
    }))
    .filter((target) => isManagementSymbolCandidate(target.baseSymbol) && !closeWordsPattern.test(target.baseSymbol));
}

function looksLikeCloseTickerLine(line) {
  return /^\W*[A-Z]{2,12}\.?(?:\s*[-/]\s*USDT|\s*USDT)?(?:\s+(?:BINGX\s*)?\d+(?:[.,]\d+)?\s*[kK]?)?\W*$/i.test(line);
}

function parseTakeProfitSignals(raw) {
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const signals = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!isTakeProfitHeaderLine(lines[index])) {
      continue;
    }

    for (const line of sectionLines(lines, index, isTakeProfitBoundaryLine)) {
      for (const target of parseTakeProfitTargetsFromLine(line)) {
        if (!Number.isFinite(target.price) || target.price <= 0) {
          continue;
        }

        signals.push({
          isSignal: true,
          action: 'SET_TAKE_PROFIT',
          symbol: `${target.baseSymbol}-USDT`,
          takeProfit: target.price,
          takeProfits: [target.price],
          rawText: raw
        });
      }
    }
  }

  return dedupeSignals(signals);
}

function isTakeProfitHeaderLine(line) {
  return takeProfitLineStartPattern.test(stripListPrefix(line));
}

function isTakeProfitBoundaryLine(line, offset) {
  return offset > 0 && (
    isStopLossModificationHeaderLine(line)
    || isCloseHeaderLine(line)
    || Boolean(parseDirectionLine(line))
  );
}

function parseTakeProfitTargetsFromLine(line) {
  const text = String(line || '').trim();
  if (!text) {
    return [];
  }

  const normalized = stripListPrefix(text);
  const headerLine = isTakeProfitHeaderLine(normalized);
  const body = headerLine
    ? normalized.replace(takeProfitLineStartPattern, ' ')
    : text;

  if (!headerLine && !looksLikeCloseTickerLine(text)) {
    return [];
  }

  const matches = [...body.matchAll(symbolPricePattern)];
  return matches
    .map((match) => ({
      baseSymbol: normalizeBaseSymbol(match[1]),
      price: parseNumberToken(match[2])
    }))
    .filter((target) => isManagementSymbolCandidate(target.baseSymbol));
}

function parseStopLossModificationSignals(raw) {
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const signals = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!isStopLossModificationHeaderLine(lines[index])) {
      continue;
    }

    for (const line of sectionLines(lines, index, isStopLossBoundaryLine)) {
      for (const target of parseStopLossTargetsFromLine(line)) {
        if (!Number.isFinite(target.price) || target.price <= 0) {
          continue;
        }

        signals.push({
          isSignal: true,
          action: 'SET_STOP_LOSS',
          symbol: `${target.baseSymbol}-USDT`,
          stopLoss: target.price,
          rawText: raw
        });
      }
    }
  }

  return dedupeSignals(signals);
}

function isStopLossModificationHeaderLine(line) {
  const normalized = stripListPrefix(line);
  if (!stopLossLineStartPattern.test(normalized)) {
    return false;
  }
  if (/\b(MODIFICACI[O ]N|MODIFICAR|MODIF|CAMBIO|CAMBIAR|AJUSTE|AJUSTAR)\b/i.test(normalized)) {
    return true;
  }

  const remainder = normalized.replace(stopLossLineStartPattern, ' ').trim();
  return !remainder || !/\b[A-Z]{2,12}\b|\d/.test(remainder);
}

function isStopLossBoundaryLine(line, offset) {
  return offset > 0 && (
    isTakeProfitHeaderLine(line)
    || isCloseHeaderLine(line)
    || Boolean(parseDirectionLine(line))
  );
}

function parseStopLossTargetsFromLine(line) {
  const text = String(line || '').trim();
  if (!text) {
    return [];
  }

  const normalized = stripListPrefix(text);
  const headerLine = isStopLossModificationHeaderLine(normalized);
  const body = headerLine
    ? normalized.replace(stopLossLineStartPattern, ' ')
    : text;

  if (!headerLine && !looksLikeCloseTickerLine(text)) {
    return [];
  }

  const matches = [...body.matchAll(symbolPricePattern)];
  return matches
    .map((match) => ({
      baseSymbol: normalizeBaseSymbol(match[1]),
      price: parseNumberToken(match[2])
    }))
    .filter((target) => isManagementSymbolCandidate(target.baseSymbol));
}

function parseBreakEvenSignals(raw) {
  const text = stripUrls(String(raw || ''));
  if (!hasBreakEvenInstruction(text)) {
    return [];
  }

  const matches = parseBreakEvenTargets(text);
  const signals = [];
  for (const baseSymbol of matches) {
    signals.push({
      isSignal: true,
      action: 'MOVE_SL_BE',
      symbol: `${baseSymbol}-USDT`,
      rawText: raw
    });
  }

  return dedupeSignals(signals);
}

function hasBreakEvenInstruction(value) {
  const text = normalize(stripUrls(value)).replace(/\s+/g, ' ').trim();
  return [
    /\b(?:SL|STOP|STOPLOSS|STOP LOSS)\s*(?:A|AL|TO|EN|->|=|:)?\s*(?:BE|BREAK\s*EVEN|BREAKEVEN)\b/i,
    /\b(?:MOVER|MUEVE|MOVEMOS|MOVE|PONER|PONE|PONEMOS|PASAR|PASA|PASAMOS|SUBIR|SUBE|SUBIMOS|AJUSTAR|AJUSTA|AJUSTAMOS)\b.{0,60}\b(?:SL|STOP|STOPLOSS|STOP LOSS)\b.{0,60}\b(?:BE|BREAK\s*EVEN|BREAKEVEN|ENTRADA|ENTRY|PRECIO DE ENTRADA)\b/i,
    /\b(?:SL|STOP|STOPLOSS|STOP LOSS)\b.{0,60}\b(?:ENTRADA|ENTRY|PRECIO DE ENTRADA)\b/i
  ].some((pattern) => pattern.test(text));
}

function parseBreakEvenTargets(text) {
  const pairMatches = [...text.matchAll(/\b([A-Z0-9]{2,12})(?:\s*[-/]\s*USDT|\s*USDT)\b/gi)]
    .map((match) => normalizeBaseSymbol(match[1]))
    .filter(isBreakEvenSymbolCandidate);
  if (pairMatches.length) {
    return [...new Set(pairMatches)];
  }

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const targetLines = lines.filter((line) => hasBreakEvenInstruction(line));
  const context = (targetLines.length ? targetLines : (lines.length <= 3 ? lines : [])).join(' ');
  if (!context) {
    return [];
  }

  return [...new Set(
    [...context.matchAll(/\b([A-Z0-9]{2,12})\b/gi)]
      .map((match) => normalizeBaseSymbol(match[1]))
      .filter(isBreakEvenSymbolCandidate)
  )];
}

function isBreakEvenSymbolCandidate(baseSymbol) {
  if (
    !isManagementSymbolCandidate(baseSymbol)
    || ['BE', 'BREAK', 'EVEN', 'BREAKEVEN', 'MOVER', 'MUEVE', 'MOVE', 'PONER', 'PASAR', 'SUBIR', 'AJUSTAR', 'ENTRADA', 'ENTRY'].includes(baseSymbol)
  ) {
    return false;
  }
  return true;
}

function isManagementSymbolCandidate(baseSymbol) {
  return managementBaseSymbols.has(baseSymbol) && !symbolIgnoreWords.has(baseSymbol);
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

function sectionLines(lines, startIndex, isBoundary) {
  const section = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const offset = index - startIndex;
    const line = lines[index];
    if (offset > 0 && isBoundary(line, offset)) {
      break;
    }
    section.push(line);
  }
  return section;
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
    const stopLoss = parseSymbolStopLoss(block, item.baseSymbol, item.rawBaseSymbol) ?? (directionLines.length === 1 ? parseStopLoss(raw) : null);
    const takeProfits = parseSymbolTakeProfits(block, item.baseSymbol, item.rawBaseSymbol);
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
  const match = String(line || '').match(new RegExp(`^\\W*(${directionWords.join('|')})\\s+([A-Z]{2,12})\\.?(?:\\s+(?:BINGX\\s*)?(\\d+(?:[.,]\\d+)?\\s*[kK]?))?\\b`, 'i'));
  if (!match) {
    return null;
  }

  const rawBaseSymbol = match[2].toUpperCase();
  const baseSymbol = normalizeBaseSymbol(rawBaseSymbol);
  if (symbolIgnoreWords.has(baseSymbol)) {
    return null;
  }

  const directionWord = match[1].toUpperCase();
  const direction = longWords.includes(directionWord) ? 'LONG' : 'SHORT';
  const price = match[3] ? parseNumberToken(match[3]) : null;

  return {
    baseSymbol,
    rawBaseSymbol,
    direction,
    price: Number.isFinite(price) && price > 0 ? price : null
  };
}

function parseSymbol(raw, normalized) {
  const pair = raw.match(/\b([A-Z0-9]{2,12})\s*[-/]\s*(USDT|USDC)\b/i);
  if (pair) {
    return `${normalizeBaseSymbol(pair[1])}-${pair[2].toUpperCase()}`;
  }

  const compact = raw.match(/\b([A-Z][A-Z0-9]{1,11})(USDT|USDC)\b/i);
  if (compact) {
    return `${normalizeBaseSymbol(compact[1])}-${compact[2].toUpperCase()}`;
  }

  const directional = parseDirectionLine(raw);
  if (directional) {
    return `${directional.baseSymbol}-USDT`;
  }

  const cashtag = raw.match(/\$([A-Z]{2,12})\b/);
  if (cashtag && hasDirectionContext(normalized)) {
    return `${normalizeBaseSymbol(cashtag[1])}-USDT`;
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

function parseSymbolStopLoss(raw, baseSymbol, rawBaseSymbol = baseSymbol) {
  const pattern = baseSymbolPattern(baseSymbol, rawBaseSymbol);
  const line = raw.split(/\n+/).find((item) => (
    pattern.test(item)
    && /\b(SL|STOP|STOPLOSS|STOP LOSS|INVALIDATION|INVALIDACION)\b/i.test(item)
  ));
  const numbers = extractNumbers(line || '');
  return numbers[0] || null;
}

function parseSymbolTakeProfits(raw, baseSymbol, rawBaseSymbol = baseSymbol) {
  const pattern = baseSymbolPattern(baseSymbol, rawBaseSymbol);
  const lines = raw.split(/\n+/).filter((item) => (
    pattern.test(item)
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

function normalizeBaseSymbol(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return baseSymbolAliases.get(normalized) || normalized;
}

function baseSymbolPattern(baseSymbol, rawBaseSymbol = baseSymbol) {
  const values = [...new Set([
    normalizeBaseSymbol(baseSymbol),
    String(rawBaseSymbol || '').trim().toUpperCase()
  ].filter(Boolean))].map(escapeRegExp);
  return new RegExp(`\\b(?:${values.join('|')})\\b`, 'i');
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
  if (next.takeProfit) {
    next.takeProfit = normalizeSymbolPrice(baseSymbol, next.takeProfit);
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripUrls(value) {
  return String(value || '').replace(/https?:\/\/\S+/gi, ' ');
}

function normalize(value) {
  return String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stripListPrefix(value) {
  return normalize(value).trim().replace(listPrefixPattern, '').trim();
}
