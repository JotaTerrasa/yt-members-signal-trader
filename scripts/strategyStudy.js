import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { BingXClient } from '../src/bingxClient.js';
import { parseFuturesSignals } from '../src/futuresSignalParser.js';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dataDir = join(rootDir, '.data');
const outputDir = join(dataDir, 'strategy-study');
const gitReportDir = join(rootDir, 'docs', 'strategy-reports');
const bingxReadRetries = 3;
const days = clampInteger(argValue('--days'), 1, 365, 14);
const offline = hasFlag('--offline') || process.env.STRATEGY_STUDY_OFFLINE === '1';
const now = Date.now();
const startTime = now - days * 24 * 60 * 60 * 1000;

await mkdir(outputDir, { recursive: true });
await mkdir(gitReportDir, { recursive: true });

const [config, postsData, tradeEventsData] = await Promise.all([
  readJson(join(dataDir, 'config.json'), {}),
  readJson(join(dataDir, 'posts.json'), { posts: [] }),
  readJson(join(dataDir, 'trade-events.json'), { events: [] })
]);

const signals = extractSignals(postsData.posts || []);
const liveOrderResult = await fetchLiveOrders(config.bingx, { startTime, endTime: now, offline });
const { history: liveOrders, openOrders: liveOpenOrders } = liveOrderResult;
const localPositions = buildPositionsFromTradeEvents(tradeEventsData.events || []);
const positions = liveOrders.length ? buildPositionStudy(liveOrders, liveOpenOrders) : localPositions;
const openPositions = positions.filter((position) => position.status === 'open');
const closedPositions = positions.filter((position) => position.status === 'closed');
const signalStats = summarizeSignals(signals);
const performance = summarizePerformance(closedPositions, openPositions);
const playbook = summarizePlaybook(signals, positions);
const study = {
  generatedAt: new Date().toISOString(),
  window: {
    days,
    startAt: new Date(startTime).toISOString(),
    endAt: new Date(now).toISOString()
  },
  sample: {
    posts: postsData.posts?.length || 0,
    parsedSignals: signals.length,
    liveOrders: liveOrders.length,
    liveOpenOrders: liveOpenOrders.length,
    positions: positions.length,
    closedPositions: closedPositions.length,
    openPositions: openPositions.length,
    persistedTradeEvents: tradeEventsData.events?.length || 0
  },
  dataQuality: {
    orderHistorySource: liveOrders.length ? 'bingx_order_history' : 'local_trade_events',
    orderHistoryAvailable: liveOrderResult.available,
    warning: liveOrderResult.warning,
    localFallbackPositions: liveOrders.length ? 0 : localPositions.length
  },
  signalStats,
  performance,
  playbook,
  positions,
  signals,
  tradeEvents: tradeEventsData.events || []
};

const markdownReport = renderMarkdown(study);
const snapshotName = `strategy-study-${study.generatedAt.slice(0, 19).replaceAll(':', '-').replace('T', '-')}.md`;
await writeFile(join(outputDir, 'strategy-study.json'), `${JSON.stringify(study, null, 2)}\n`);
await writeFile(join(outputDir, 'strategy-report.md'), markdownReport);
await writeFile(join(gitReportDir, 'latest.md'), markdownReport);
await writeFile(join(gitReportDir, snapshotName), markdownReport);

console.log(JSON.stringify({
  ok: true,
  report: join(outputDir, 'strategy-report.md'),
  json: join(outputDir, 'strategy-study.json'),
  gitBackup: join(gitReportDir, snapshotName),
  sample: study.sample,
  dataQuality: study.dataQuality,
  performance: study.performance
}, null, 2));

async function fetchLiveOrders(bingx = {}, { startTime, endTime, offline = false }) {
  if (offline) {
    return {
      history: [],
      openOrders: [],
      available: false,
      warning: 'Offline mode enabled; BingX live order history was not requested.'
    };
  }

  if (!bingx.apiKey || !bingx.apiSecret) {
    return {
      history: [],
      openOrders: [],
      available: false,
      warning: 'BingX credentials are not configured; live order history was not requested.'
    };
  }

  const client = new BingXClient({
    apiKey: bingx.apiKey,
    apiSecret: bingx.apiSecret,
    environment: 'prod-live'
  });

  const rows = [];
  const maxWindowMs = 7 * 24 * 60 * 60 * 1000 - 1000;
  try {
    for (let cursor = startTime; cursor < endTime; cursor += maxWindowMs) {
      const chunkEnd = Math.min(endTime, cursor + maxWindowMs);
      const response = await retryBingXRead(() => client.request('GET', '/openApi/swap/v2/trade/allOrders', {
        startTime: cursor,
        endTime: chunkEnd,
        limit: 1000
      }), {
        label: `order history ${new Date(cursor).toISOString()}-${new Date(chunkEnd).toISOString()}`
      });
      const chunkRows = response?.data?.orders || response?.data || [];
      if (Array.isArray(chunkRows)) {
        rows.push(...chunkRows);
      }
    }

    const [openOrdersResponse] = await Promise.all([
      retryBingXRead(() => client.getOpenOrders(), { label: 'open orders' }).catch(() => ({ data: [] }))
    ]);
    const openRows = openOrdersResponse?.data?.orders || openOrdersResponse?.data || [];
    const byId = new Map(rows.map((order) => [String(order.orderId || order.orderID || ''), order]));
    return {
      history: [...byId.values()].map(normalizeOrder).sort((left, right) => left.time - right.time),
      openOrders: Array.isArray(openRows) ? openRows.map(normalizeOrder) : [],
      available: true,
      warning: null
    };
  } catch (error) {
    return {
      history: [],
      openOrders: [],
      available: false,
      warning: `BingX live order history unavailable: ${safeErrorMessage(error)}`
    };
  }
}

async function retryBingXRead(task, { label }) {
  let lastError = null;
  for (let attempt = 1; attempt <= bingxReadRetries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < bingxReadRetries) {
        await sleep(750 * attempt);
      }
    }
  }

  throw new Error(`${label} failed after ${bingxReadRetries} attempts: ${safeErrorMessage(lastError)}`);
}

function extractSignals(posts = []) {
  const signals = [];
  for (const post of posts) {
    const parsed = parseFuturesSignals(post.text || '').filter((signal) => signal.isSignal);
    for (const signal of parsed) {
      signals.push({
        postId: post.id || null,
        postUrl: post.url || null,
        source: post.source || 'youtube',
        firstSeenAt: post.firstSeenAt || post.scrapedAt || null,
        action: signal.action || 'OPEN',
        symbol: signal.symbol || null,
        direction: signal.direction || null,
        entryType: signal.entry?.type || null,
        entryPrice: finiteOrNull(signal.entry?.price),
        stopLoss: finiteOrNull(signal.stopLoss),
        takeProfits: Array.isArray(signal.takeProfits) ? signal.takeProfits.map(finiteOrNull).filter((value) => value !== null) : [],
        leverage: finiteOrNull(signal.leverage),
        notionalUSDT: finiteOrNull(signal.notionalUSDT),
        rawText: signal.rawText || post.text || ''
      });
    }
  }
  return signals.sort((left, right) => Date.parse(left.firstSeenAt || 0) - Date.parse(right.firstSeenAt || 0));
}

function buildPositionStudy(orders = [], openOrders = []) {
  const groups = new Map();
  for (const order of orders) {
    if (!order.positionID) {
      continue;
    }
    if (!groups.has(order.positionID)) {
      groups.set(order.positionID, []);
    }
    groups.get(order.positionID).push(order);
  }

  return [...groups.entries()].map(([positionID, rows]) => {
    const sorted = rows.sort((left, right) => left.time - right.time);
    const entries = sorted.filter((order) => order.isEntry && order.executedQty > 0);
    const exits = sorted.filter((order) => order.isExit && order.executedQty > 0);
    const protective = sorted.filter((order) => order.isExit && order.executedQty === 0);
    const entry = entries[0] || null;
    const symbol = entry?.symbol || sorted[0]?.symbol || '';
    const direction = entry?.positionSide || sorted[0]?.positionSide || '';
    const entryQty = sum(entries, 'executedQty');
    const exitQty = sum(exits, 'executedQty');
    const status = exitQty >= entryQty && entryQty > 0 ? 'closed' : 'open';
    const grossPnl = sum(exits, 'profit');
    const commission = sum(sorted, 'commission');
    const netPnl = grossPnl + commission;
    const avgEntry = weightedAverage(entries, 'avgPrice', 'executedQty');
    const avgExit = weightedAverage(exits, 'avgPrice', 'executedQty');
    const currentProtective = status === 'open' ? openOrders.filter((order) => (
      order.symbol === symbol
      && order.positionSide === direction
      && order.executedQty === 0
      && ['NEW', 'PENDING', 'PARTIALLY_FILLED'].includes(order.status || 'NEW')
    )) : [];
    const firstStop = currentProtective.find((order) => order.type.includes('STOP') && order.stopPrice > 0)?.stopPrice
      || sorted.find((order) => order.type.includes('STOP') && order.stopPrice > 0)?.stopPrice
      || null;
    const firstTp = currentProtective.find((order) => order.type.includes('TAKE_PROFIT') && order.stopPrice > 0)?.stopPrice
      || sorted.find((order) => order.type.includes('TAKE_PROFIT') && order.stopPrice > 0)?.stopPrice
      || null;
    const lastExit = exits.at(-1) || null;
    const outcome = lastExit ? outcomeFromOrder(lastExit) : 'OPEN';

    return {
      positionID,
      symbol,
      direction,
      status,
      outcome,
      openedAt: entry ? new Date(entry.time).toISOString() : null,
      closedAt: lastExit ? new Date(lastExit.updateTime || lastExit.time).toISOString() : null,
      entryType: entry?.type || null,
      entryQty,
      exitQty,
      avgEntry,
      avgExit,
      firstStop,
      firstTp,
      leverage: entry?.leverage || null,
      grossPnl,
      commission,
      netPnl,
      riskDistancePct: avgEntry && firstStop ? Math.abs(avgEntry - firstStop) / avgEntry * 100 : null,
      rewardDistancePct: avgEntry && firstTp ? Math.abs(firstTp - avgEntry) / avgEntry * 100 : null,
      orders: sorted,
      currentProtectiveOrders: currentProtective,
      protectiveOrderCount: protective.length
    };
  }).sort((left, right) => Date.parse(left.openedAt || 0) - Date.parse(right.openedAt || 0));
}

function buildPositionsFromTradeEvents(events = []) {
  const byPosition = new Map();
  for (const event of events) {
    const exchangePosition = event.exchangePosition;
    if (!exchangePosition?.id) {
      continue;
    }
    byPosition.set(exchangePosition.id, { event, exchangePosition });
  }

  return [...byPosition.values()].map(({ event, exchangePosition }) => {
    const status = exchangePosition.status || (String(event.status || '').includes('closed') ? 'closed' : 'open');
    const entryQty = finiteOrNull(exchangePosition.quantity) || 0;
    const avgEntry = finiteOrNull(exchangePosition.entryPrice);
    const avgExit = finiteOrNull(exchangePosition.closePrice) || finiteOrNull(exchangePosition.currentPrice);
    const netPnl = firstFinite(
      exchangePosition.paperPnl,
      exchangePosition.unrealizedPnl,
      exchangePosition.realizedPnl,
      exchangePosition.raw?.realisedProfit,
      0
    );

    return {
      positionID: exchangePosition.id,
      symbol: exchangePosition.symbol || '',
      direction: exchangePosition.direction || '',
      status,
      outcome: status === 'closed' ? event.reason || event.status || 'LOCAL_EVENT_CLOSE' : 'OPEN',
      openedAt: exchangePosition.openedAt || null,
      closedAt: status === 'closed' ? exchangePosition.closedAt || event.at || null : null,
      entryType: 'LOCAL_EVENT',
      entryQty,
      exitQty: status === 'closed' ? entryQty : 0,
      avgEntry,
      avgExit,
      firstStop: finiteOrNull(exchangePosition.stopLoss),
      firstTp: finiteOrNull(exchangePosition.takeProfit),
      leverage: finiteOrNull(exchangePosition.leverage),
      grossPnl: netPnl,
      commission: 0,
      netPnl,
      riskDistancePct: avgEntry && exchangePosition.stopLoss ? Math.abs(avgEntry - exchangePosition.stopLoss) / avgEntry * 100 : null,
      rewardDistancePct: avgEntry && exchangePosition.takeProfit ? Math.abs(exchangePosition.takeProfit - avgEntry) / avgEntry * 100 : null,
      orders: [],
      currentProtectiveOrders: exchangePosition.protectiveOrders || [],
      protectiveOrderCount: Array.isArray(exchangePosition.protectiveOrders) ? exchangePosition.protectiveOrders.length : 0
    };
  }).sort((left, right) => Date.parse(left.openedAt || 0) - Date.parse(right.openedAt || 0));
}

function summarizeSignals(signals = []) {
  const byAction = countBy(signals, (signal) => signal.action);
  const opens = signals.filter((signal) => signal.action === 'OPEN');
  const management = signals.filter((signal) => signal.action !== 'OPEN');
  return {
    total: signals.length,
    byAction,
    openCount: opens.length,
    managementCount: management.length,
    symbols: countBy(signals.filter((signal) => signal.symbol), (signal) => signal.symbol),
    averageLeverage: average(opens.map((signal) => signal.leverage)),
    averageStopDistancePct: average(opens.map((signal) => (
      signal.entryPrice && signal.stopLoss ? Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice * 100 : null
    ))),
    averageRewardDistancePct: average(opens.map((signal) => (
      signal.entryPrice && signal.takeProfits[0] ? Math.abs(signal.takeProfits[0] - signal.entryPrice) / signal.entryPrice * 100 : null
    )))
  };
}

function summarizePerformance(closedPositions = [], openPositions = []) {
  const wins = closedPositions.filter((position) => position.netPnl > 0);
  const losses = closedPositions.filter((position) => position.netPnl < 0);
  return {
    closedTrades: closedPositions.length,
    openTrades: openPositions.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closedPositions.length ? wins.length / closedPositions.length : null,
    grossPnl: sum(closedPositions, 'grossPnl'),
    commission: sum(closedPositions, 'commission'),
    netPnl: sum(closedPositions, 'netPnl'),
    averageWin: average(wins.map((position) => position.netPnl)),
    averageLoss: average(losses.map((position) => position.netPnl)),
    profitFactor: Math.abs(sum(losses, 'netPnl')) > 0 ? sum(wins, 'netPnl') / Math.abs(sum(losses, 'netPnl')) : null,
    outcomes: countBy(closedPositions, (position) => position.outcome)
  };
}

function summarizePlaybook(signals = [], positions = []) {
  const opens = signals.filter((signal) => signal.action === 'OPEN');
  const packs = new Map();
  for (const signal of opens) {
    const key = signal.postId || signal.firstSeenAt || 'unknown';
    if (!packs.has(key)) {
      packs.set(key, {
        postId: signal.postId,
        firstSeenAt: signal.firstSeenAt,
        symbols: [],
        directions: [],
        leverage: signal.leverage,
        entryTypes: []
      });
    }
    const pack = packs.get(key);
    pack.symbols.push(signal.symbol);
    pack.directions.push(signal.direction);
    pack.entryTypes.push(signal.entryType);
  }

  return {
    packs: [...packs.values()].map((pack) => ({
      ...pack,
      symbolCount: pack.symbols.length,
      symbols: [...new Set(pack.symbols)],
      directions: [...new Set(pack.directions)],
      entryTypes: [...new Set(pack.entryTypes)]
    })),
    commonPackSizes: countBy([...packs.values()], (pack) => String(pack.symbols.length)),
    entryTypes: countBy(opens, (signal) => signal.entryType || 'UNKNOWN'),
    managementActions: countBy(signals.filter((signal) => signal.action !== 'OPEN'), (signal) => signal.action),
    liveOutcomesBySymbol: countBy(positions.filter((position) => position.status === 'closed'), (position) => `${position.symbol}:${position.outcome}`)
  };
}

function renderMarkdown(study) {
  const lines = [];
  lines.push('# Strategy Study');
  lines.push('');
  lines.push(`Generated: ${study.generatedAt}`);
  lines.push(`Window: ${study.window.startAt} to ${study.window.endAt} (${study.window.days} days)`);
  lines.push('');
  lines.push('## Data Quality');
  lines.push('');
  lines.push(`- Order history source: ${study.dataQuality.orderHistorySource}`);
  lines.push(`- BingX order history available: ${study.dataQuality.orderHistoryAvailable ? 'yes' : 'no'}`);
  lines.push(`- Local fallback positions: ${study.dataQuality.localFallbackPositions}`);
  if (study.dataQuality.warning) {
    lines.push(`- Warning: ${study.dataQuality.warning}`);
  }
  lines.push('');
  lines.push('## Sample');
  lines.push('');
  lines.push(`- Posts/messages stored: ${study.sample.posts}`);
  lines.push(`- Parsed signals: ${study.sample.parsedSignals}`);
  lines.push(`- Live orders from BingX: ${study.sample.liveOrders}`);
  lines.push(`- Live open protective/orders now: ${study.sample.liveOpenOrders}`);
  lines.push(`- Reconstructed positions: ${study.sample.positions}`);
  lines.push(`- Closed positions: ${study.sample.closedPositions}`);
  lines.push(`- Open positions: ${study.sample.openPositions}`);
  lines.push(`- Persisted local trade events: ${study.sample.persistedTradeEvents}`);
  lines.push('');
  lines.push('## Performance');
  lines.push('');
  lines.push(`- Net PnL closed: ${money(study.performance.netPnl)} USDT`);
  lines.push(`- Gross PnL closed: ${money(study.performance.grossPnl)} USDT`);
  lines.push(`- Commission: ${money(study.performance.commission)} USDT`);
  lines.push(`- Win rate: ${pct(study.performance.winRate)}`);
  lines.push(`- Profit factor: ${number(study.performance.profitFactor)}`);
  lines.push(`- Outcomes: ${jsonInline(study.performance.outcomes)}`);
  lines.push('');
  lines.push('## Signal Shape');
  lines.push('');
  lines.push(`- Actions: ${jsonInline(study.signalStats.byAction)}`);
  lines.push(`- Symbols: ${jsonInline(study.signalStats.symbols)}`);
  lines.push(`- Average leverage: ${number(study.signalStats.averageLeverage)}`);
  lines.push(`- Average stop distance: ${pctDecimal(study.signalStats.averageStopDistancePct)}`);
  lines.push(`- Average reward distance: ${pctDecimal(study.signalStats.averageRewardDistancePct)}`);
  lines.push('');
  lines.push('## Playbook Hypotheses');
  lines.push('');
  lines.push('- Build positions in packs, usually multiple tickers with the same direction and leverage.');
  lines.push('- Stops are mandatory and often exchange-specific.');
  lines.push('- Management messages can modify TP/SL after entry; these are part of the strategy, not noise.');
  lines.push('- Telegram/Web messages may contain management earlier than posts, so they should be logged even if not used for future autonomous trading.');
  lines.push('');
  lines.push('## Current Statistical Status');
  lines.push('');
  lines.push(statisticalStatus(study.performance.closedTrades));
  lines.push('');
  lines.push('## Closed Positions');
  lines.push('');
  lines.push('| Opened | Symbol | Outcome | Entry | Exit | Net USDT | SL | TP |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const position of study.positions.filter((item) => item.status === 'closed')) {
    lines.push([
      position.openedAt || '',
      position.symbol,
      position.outcome,
      number(position.avgEntry),
      number(position.avgExit),
      money(position.netPnl),
      number(position.firstStop),
      number(position.firstTp)
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  lines.push('## Open Positions');
  lines.push('');
  lines.push('| Opened | Symbol | Entry | SL | TP | Qty |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const position of study.positions.filter((item) => item.status === 'open')) {
    lines.push([
      position.openedAt || '',
      position.symbol,
      number(position.avgEntry),
      number(position.firstStop),
      number(position.firstTp),
      number(position.entryQty - position.exitQty)
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  return `${lines.join('\n').trimEnd()}\n`;
}

function normalizeOrder(order) {
  const executedQty = Number(order.executedQty || 0);
  const reduceOnly = order.reduceOnly === true || String(order.reduceOnly).toLowerCase() === 'true';
  return {
    ...order,
    orderId: String(order.orderId || order.orderID || ''),
    positionID: String(order.positionID || ''),
    time: Number(order.time || 0),
    updateTime: Number(order.updateTime || order.time || 0),
    executedQty,
    origQty: Number(order.origQty || 0),
    avgPrice: Number(order.avgPrice || 0),
    stopPrice: Number(order.stopPrice || 0),
    profit: Number(order.profit || 0),
    commission: Number(order.commission || 0),
    leverage: Number(String(order.leverage || '').replace(/x/i, '')) || null,
    isEntry: !reduceOnly && executedQty > 0,
    isExit: reduceOnly
  };
}

function outcomeFromOrder(order) {
  if (order.type.includes('TAKE_PROFIT')) return 'TP';
  if (order.type.includes('STOP')) return 'SL';
  if (order.type === 'MARKET') return 'SIGNAL_CLOSE';
  return order.type || 'CLOSED';
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) || 'UNKNOWN';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item?.[key] || 0), 0);
}

function average(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sumValue, value) => sumValue + value, 0) / finite.length : null;
}

function weightedAverage(items, valueKey, weightKey) {
  const totalWeight = sum(items, weightKey);
  if (!totalWeight) return null;
  return items.reduce((total, item) => total + Number(item[valueKey] || 0) * Number(item[weightKey] || 0), 0) / totalWeight;
}

function finiteOrNull(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function firstFinite(...values) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return null;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function safeErrorMessage(error) {
  const message = error?.message || String(error);
  return message.replace(/(apiKey|apiSecret|signature|X-BX-APIKEY)=?[^&\s]*/gi, '$1=[redacted]');
}

function clampInteger(value, min, max, fallback) {
  const numberValue = Math.trunc(Number(value));
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

function money(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '-';
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(4).replace(/\.?0+$/, '') : '-';
}

function pct(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '-';
}

function pctDecimal(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(3)}%` : '-';
}

function jsonInline(value) {
  return JSON.stringify(value || {});
}

function statisticalStatus(closedTrades) {
  if (closedTrades < 30) {
    return `Sample is exploratory only (${closedTrades} closed positions). Do not treat it as statistically significant.`;
  }
  if (closedTrades < 100) {
    return `Sample is directional but still fragile (${closedTrades} closed positions). Keep collecting before automating.`;
  }
  return `Sample is large enough to start testing formal hypotheses (${closedTrades} closed positions), but still needs out-of-sample validation.`;
}
