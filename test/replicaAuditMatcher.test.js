import test from 'node:test';
import assert from 'node:assert/strict';
import { alignReplicaAuditRecords, alignSequences, attachCloseFailures, attachUnprocessedCloses } from '../src/replicaAuditMatcher.js';

function opening(at, symbol, price, direction = 'LONG') {
  return {
    at,
    status: 'demo_order_sent',
    signal: { symbol, direction },
    entryPrice: price
  };
}

test('un hueco intermedio no desplaza las operaciones posteriores', () => {
  const sheet = [
    { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
    { orderNumber: 2, symbol: 'ETH-USDT', direction: 'LONG', entryPrice: 10 },
    { orderNumber: 3, symbol: 'SOL-USDT', direction: 'LONG', entryPrice: 1 },
    { orderNumber: 4, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 110 }
  ];
  const executions = [
    { opening: opening('2026-07-01T10:00:00Z', 'BTC-USDT', 100.1) },
    { opening: opening('2026-07-01T10:00:01Z', 'ETH-USDT', 10.01) },
    { opening: opening('2026-07-01T11:00:00Z', 'BTC-USDT', 110.1) }
  ];

  const aligned = alignSequences(sheet, executions);

  assert.equal(aligned.length, 4);
  assert.equal(aligned[2].sheet.orderNumber, 3);
  assert.equal(aligned[2].opening, null);
  assert.equal(aligned[3].sheet.orderNumber, 4);
  assert.equal(aligned[3].opening.entryPrice, 110.1);
});

test('una ejecución extra queda aislada y no contamina la siguiente pareja', () => {
  const sheet = [
    { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
    { orderNumber: 2, symbol: 'ETH-USDT', direction: 'LONG', entryPrice: 10 }
  ];
  const executions = [
    { opening: opening('2026-07-01T10:00:00Z', 'BTC-USDT', 100) },
    { opening: opening('2026-07-01T10:00:01Z', 'SOL-USDT', 1) },
    { opening: opening('2026-07-01T10:00:02Z', 'ETH-USDT', 10) }
  ];

  const aligned = alignSequences(sheet, executions);

  assert.equal(aligned.length, 3);
  assert.equal(aligned[1].sheet, null);
  assert.equal(aligned[1].opening.signal.symbol, 'SOL-USDT');
  assert.equal(aligned[2].sheet.orderNumber, 2);
  assert.equal(aligned[2].opening.signal.symbol, 'ETH-USDT');
});

test('enlaza PnL y comisiones por ciclo de vida y tradeId', () => {
  const open = opening('2026-07-01T10:00:00Z', 'BTC-USDT', 100);
  const realized = {
    symbol: 'BTC-USDT',
    incomeType: 'REALIZED_PNL',
    income: '5',
    time: Date.parse('2026-07-01T10:30:00Z'),
    tradeId: 'close-1'
  };
  const closingFee = {
    symbol: 'BTC-USDT',
    incomeType: 'TRADING_FEE',
    income: '-0.5',
    info: 'Position closing fee',
    time: realized.time,
    tradeId: 'close-1'
  };
  const openingFee = {
    symbol: 'BTC-USDT',
    incomeType: 'TRADING_FEE',
    income: '-0.5',
    info: 'Position opening fee',
    time: Date.parse('2026-07-01T10:00:01Z'),
    tradeId: 'open-1'
  };

  const [row] = alignReplicaAuditRecords({
    sheetRows: [{ orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 }],
    openings: [open],
    realizedRows: [realized],
    openingFees: [openingFee],
    closingFees: [closingFee]
  });

  assert.equal(row.opening, open);
  assert.equal(row.realizedSource, realized);
  assert.equal(row.realized.income, 5);
  assert.equal(row.openingFee, openingFee);
  assert.equal(row.closingFeeSource, closingFee);
  assert.equal(row.closingFee.income, -0.5);
});

test('enlaza la señal de cierre enviada con el cierre confirmado posterior', () => {
  const open = {
    ...opening('2026-07-01T10:00:00Z', 'ETH-USDT', 100),
    response: { data: { order: { avgPrice: '101', executedQty: '2' } } }
  };
  const closeSignal = {
    at: '2026-07-01T10:29:59Z',
    status: 'demo_close_sent',
    signal: { action: 'CLOSE', symbol: 'ETH-USDT', direction: 'LONG', closePrice: 105 }
  };
  const closeEvent = {
    at: '2026-07-01T10:30:01Z',
    status: 'exchange_signal_closed',
    signal: { symbol: 'ETH-USDT', direction: 'LONG' }
  };
  const realized = {
    symbol: 'ETH-USDT',
    incomeType: 'REALIZED_PNL',
    income: '8',
    time: Date.parse('2026-07-01T10:30:00Z'),
    tradeId: 'close-eth'
  };

  const [row] = alignReplicaAuditRecords({
    sheetRows: [{ orderNumber: 1, symbol: 'ETH-USDT', direction: 'LONG', entryPrice: 100 }],
    openings: [open],
    realizedRows: [realized],
    closeEvents: [closeEvent],
    closeSignalEvents: [closeSignal]
  });

  assert.equal(row.closeEvent, closeEvent);
  assert.equal(row.closeSignalEvent, closeSignal);
});

test('empareja con la entrada publicada aunque el precio real se desvíe', () => {
  const first = {
    ...opening('2026-07-01T10:00:00Z', 'BTC-USDT', 109),
    signal: { symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 100 } },
    response: { data: { order: { avgPrice: '109', executedQty: '1' } } }
  };
  const second = {
    ...opening('2026-07-01T10:10:00Z', 'BTC-USDT', 101),
    signal: { symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 110 } },
    response: { data: { order: { avgPrice: '101', executedQty: '1' } } }
  };

  const rows = alignReplicaAuditRecords({
    sheetRows: [
      { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
      { orderNumber: 2, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 110 }
    ],
    openings: [first, second]
  });

  assert.equal(rows[0].opening, first);
  assert.equal(rows[1].opening, second);
});

test('un reintento tardío de un activo no cruza los paquetes de otros activos', () => {
  const aligned = alignReplicaAuditRecords({
    sheetRows: [
      { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
      { orderNumber: 2, symbol: 'ETH-USDT', direction: 'LONG', entryPrice: 10 },
      { orderNumber: 3, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 110 }
    ],
    openings: [
      opening('2026-07-01T10:00:00Z', 'BTC-USDT', 100),
      opening('2026-07-01T10:01:00Z', 'BTC-USDT', 110),
      opening('2026-07-01T10:02:00Z', 'ETH-USDT', 10)
    ]
  });

  assert.deepEqual(aligned.map((row) => ({
    order: row.sheet?.orderNumber,
    symbol: row.opening?.signal?.symbol
  })), [
    { order: 1, symbol: 'BTC-USDT' },
    { order: 2, symbol: 'ETH-USDT' },
    { order: 3, symbol: 'BTC-USDT' }
  ]);
});

test('una apertura posterior a la cobertura de la hoja no rellena un hueco anterior', () => {
  const lateOpening = opening('2026-07-16T09:00:00Z', 'BTC-USDT', 110);
  const rows = alignReplicaAuditRecords({
    sheetRows: [
      { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
      { orderNumber: 2, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 110 }
    ],
    openings: [
      opening('2026-07-15T10:00:00Z', 'BTC-USDT', 100),
      lateOpening
    ],
    sheetCoverageEndTime: Date.parse('2026-07-15T23:59:59.999Z')
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].sheet.orderNumber, 1);
  assert.equal(rows[0].opening.entryPrice, 100);
  assert.equal(rows[1].sheet.orderNumber, 2);
  assert.equal(rows[1].opening, null);
  assert.equal(rows[2].sheet, null);
  assert.equal(rows[2].opening, lateOpening);
});

test('enlaza un fallo solo con la fila ausente del mismo dia, activo, direccion y precio', () => {
  const matchedFailure = {
    eventId: 'missing-sol',
    at: '2026-07-11T16:18:49.000Z',
    status: 'error',
    reason: 'No hay VST disponible suficiente.',
    signal: {
      symbol: 'SOL-USDT',
      direction: 'LONG',
      entry: { price: 78.15 }
    }
  };
  const wrongDay = {
    ...matchedFailure,
    eventId: 'other-sol',
    at: '2026-07-12T16:18:49.000Z'
  };
  const rows = alignReplicaAuditRecords({
    sheetRows: [{
      orderNumber: 112,
      symbol: 'SOL-USDT',
      direction: 'LONG',
      entryPrice: 78.15,
      openedAt: '2026-07-11T12:00:00.000Z'
    }],
    openingFailures: [wrongDay, matchedFailure]
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].opening, null);
  assert.equal(rows[0].openingFailure, matchedFailure);
});

test('enlaza un cierre fallido solo durante la vida de la posición del mismo activo', () => {
  const openingEvent = opening('2026-07-10T15:20:24Z', 'BTC-USDT', 64037);
  const stopEvent = {
    at: '2026-07-13T01:56:35Z',
    status: 'exchange_stop_closed',
    signal: { symbol: 'BTC-USDT', direction: 'LONG' }
  };
  const relevantFailure = {
    at: '2026-07-11T17:47:15Z',
    signal: { action: 'CLOSE', symbol: 'BTC-USDT' },
    status: 'error',
    reason: 'CLOSE_GUARD_MIN_NET_PNL is not defined'
  };
  const records = attachCloseFailures([{
    opening: openingEvent,
    closeEvent: stopEvent,
    realized: { time: Date.parse('2026-07-13T01:55:52Z') }
  }], [
    { ...relevantFailure, at: '2026-07-10T14:00:00Z' },
    relevantFailure,
    { ...relevantFailure, signal: { action: 'CLOSE', symbol: 'ETH-USDT' } },
    { ...relevantFailure, at: '2026-07-13T02:10:00Z' }
  ]);

  assert.deepEqual(records[0].closeFailures, [relevantFailure]);
});

test('enlaza un cierre sin evento solo con posiciones que ya estaban abiertas', () => {
  const missedClose = {
    at: '2026-07-05T21:58:25.879Z',
    postId: 'missed-close',
    signal: { action: 'CLOSE', symbol: 'SOL-USDT', closePrice: 81.92 }
  };
  const closeTime = Date.parse('2026-07-06T03:22:16Z');
  const records = attachUnprocessedCloses([
    {
      opening: opening('2026-07-05T21:52:06Z', 'SOL-USDT', 81.518),
      realized: { time: closeTime }
    },
    {
      opening: opening('2026-07-05T22:34:37Z', 'SOL-USDT', 81.8),
      realized: { time: closeTime }
    },
    {
      opening: opening('2026-07-05T21:50:30Z', 'ETH-USDT', 1781.28),
      realized: { time: closeTime }
    }
  ], [missedClose]);

  assert.deepEqual(records[0].unprocessedCloses, [missedClose]);
  assert.equal(records[1].unprocessedCloses, undefined);
  assert.equal(records[2].unprocessedCloses, undefined);
});

test('reparte un cierre de una posición agregada entre todas sus aperturas', () => {
  const first = {
    ...opening('2026-07-01T10:00:00Z', 'BTC-USDT', 100),
    order: { quantity: 1 },
    costGuard: { exposure: 100 }
  };
  const second = {
    ...opening('2026-07-01T10:10:00Z', 'BTC-USDT', 102),
    order: { quantity: 1 },
    costGuard: { exposure: 102 }
  };
  const realized = {
    symbol: 'BTC-USDT',
    incomeType: 'REALIZED_PNL',
    income: '6',
    time: Date.parse('2026-07-01T10:30:00Z'),
    tradeId: 'merged-close'
  };
  const closingFee = {
    symbol: 'BTC-USDT',
    incomeType: 'TRADING_FEE',
    income: '-1',
    time: realized.time,
    tradeId: 'merged-close'
  };
  const closeEvent = {
    at: '2026-07-01T10:30:01Z',
    status: 'exchange_signal_closed',
    signal: { symbol: 'BTC-USDT', direction: 'LONG' },
    exchangePosition: { currentPrice: 104 }
  };

  const rows = alignReplicaAuditRecords({
    sheetRows: [
      { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
      { orderNumber: 2, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 102 }
    ],
    openings: [first, second],
    realizedRows: [realized],
    closeEvents: [closeEvent],
    closingFees: [closingFee]
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].realized.aggregatedOpenings, 2);
  assert.equal(rows[1].realized.aggregatedOpenings, 2);
  assert.equal(rows.reduce((sum, row) => sum + Number(row.realized.income), 0), 6);
  assert.equal(rows.reduce((sum, row) => sum + Number(row.closingFee.income), 0), -1);
  assert.equal(rows.some((row) => row.unmatchedClose), false);
});

test('agrupa varios registros de PnL del mismo cierre agregado sin dejar cierres huerfanos', () => {
  const openings = [
    {
      ...opening('2026-07-10T15:20:24Z', 'BTC-USDT', 64047.4),
      order: { quantity: 0.0175 },
      costGuard: { exposure: 1120.8295 }
    },
    {
      ...opening('2026-07-11T16:18:46Z', 'BTC-USDT', 64153.5),
      order: { quantity: 0.0175 },
      costGuard: { exposure: 1122.68625 }
    },
    {
      ...opening('2026-07-12T18:28:45Z', 'BTC-USDT', 64035),
      order: { quantity: 0.0175 },
      costGuard: { exposure: 1120.6125 }
    }
  ];
  const closedAt = Date.parse('2026-07-13T01:55:52Z');
  const realizedRows = [-10.47204, -10.55325, -10.65227].map((income, index) => ({
    symbol: 'BTC-USDT',
    incomeType: 'REALIZED_PNL',
    income,
    time: closedAt,
    tradeId: `close-${index + 1}`
  }));
  const closingFees = [-0.55545191, -0.5554113, -0.55536179].map((income, index) => ({
    symbol: 'BTC-USDT',
    incomeType: 'TRADING_FEE',
    info: 'Position closing fee',
    income,
    time: closedAt,
    tradeId: `close-${index + 1}`
  }));
  const closeEvent = {
    at: '2026-07-13T01:56:35Z',
    status: 'exchange_stop_closed',
    signal: { symbol: 'BTC-USDT', direction: 'LONG' },
    exchangePosition: { currentPrice: 63529.4 }
  };

  const rows = alignReplicaAuditRecords({
    sheetRows: openings.map((item, index) => ({
      orderNumber: index + 1,
      symbol: 'BTC-USDT',
      direction: 'LONG',
      entryPrice: item.entryPrice
    })),
    openings,
    realizedRows,
    closeEvents: [closeEvent],
    closingFees
  });

  assert.equal(rows.length, 3);
  assert.equal(rows.some((row) => row.unmatchedClose), false);
  assert.equal(rows.reduce((sum, row) => sum + Number(row.realized.income), 0), -31.67756);
  assert.ok(Math.abs(rows.reduce((sum, row) => sum + Number(row.closingFee.income), 0) + 1.666225) < 0.00000001);
  assert.deepEqual(rows[0].realizedSources, realizedRows);
  assert.deepEqual(rows[0].closingFeeSources, closingFees);
  assert.equal(rows[0].realizedSource.groupedRecords, 3);
  assert.equal(rows[0].closingFeeSource.groupedRecords, 3);
});

test('el historico de ordenes reconstruye cierres parciales y recupera una apertura local ausente', () => {
  const firstOpening = {
    ...opening('2026-07-01T10:00:00Z', 'BTC-USDT', 100),
    signal: { symbol: 'BTC-USDT', direction: 'LONG', entry: { price: 100 }, stopLoss: 90, leverage: 25 },
    response: { data: { order: { orderId: 'entry-1', avgPrice: '100', executedQty: '1' } } },
    order: { quantity: 1, clientOrderId: 'local-1' },
    sizing: { notional: 4 }
  };
  const realizedRows = [
    { symbol: 'BTC-USDT', incomeType: 'REALIZED_PNL', income: -8, time: Date.parse('2026-07-01T10:20:00Z'), tradeId: 'stop-2' },
    { symbol: 'BTC-USDT', incomeType: 'REALIZED_PNL', income: 5, time: Date.parse('2026-07-01T10:30:00Z'), tradeId: 'close-1' }
  ];
  const closingFees = [
    { symbol: 'BTC-USDT', incomeType: 'TRADING_FEE', info: 'Position closing fee', income: -0.1, time: realizedRows[0].time, tradeId: 'stop-2' },
    { symbol: 'BTC-USDT', incomeType: 'TRADING_FEE', info: 'Position closing fee', income: -0.1, time: realizedRows[1].time, tradeId: 'close-1' }
  ];
  const orderRows = [
    { orderId: 'entry-1', positionID: 'position-1', symbol: 'BTC-USDT', positionSide: 'LONG', type: 'MARKET', reduceOnly: false, executedQty: 1, avgPrice: 100, leverage: 25, time: Date.parse('2026-07-01T10:00:01Z') },
    { orderId: 'entry-2', positionID: 'position-1', symbol: 'BTC-USDT', positionSide: 'LONG', type: 'MARKET', reduceOnly: false, executedQty: 1, avgPrice: 102, leverage: 25, stopLossEntrustPrice: 95, time: Date.parse('2026-07-01T10:10:01Z') },
    { orderId: 'stop-order-2', positionID: 'position-1', symbol: 'BTC-USDT', positionSide: 'LONG', type: 'STOP_MARKET', reduceOnly: true, executedQty: 1, avgPrice: 94, stopPrice: 95, profit: -8, commission: -0.1, time: Date.parse('2026-07-01T10:20:00Z') },
    { orderId: 'close-order-1', positionID: 'position-1', symbol: 'BTC-USDT', positionSide: 'LONG', type: 'MARKET', reduceOnly: true, executedQty: 1, avgPrice: 105, profit: 5, commission: -0.1, time: Date.parse('2026-07-01T10:30:00Z') }
  ];

  const rows = alignReplicaAuditRecords({
    sheetRows: [
      { orderNumber: 1, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 100 },
      { orderNumber: 2, symbol: 'BTC-USDT', direction: 'LONG', entryPrice: 102 }
    ],
    openings: [firstOpening],
    realizedRows,
    closingFees,
    orderRows
  });

  assert.equal(rows.length, 2);
  assert.equal(rows.some((row) => row.unmatchedClose), false);
  assert.equal(rows[0].opening.historyOrderOnly, undefined);
  assert.equal(rows[0].realized.income, 5);
  assert.equal(rows[0].closeOrderEvidence.avgPrice, 105);
  assert.equal(rows[1].opening.historyOrderOnly, true);
  assert.equal(rows[1].realized.income, -8);
  assert.equal(rows[1].closeOrderEvidence.avgPrice, 94);
  assert.equal(rows.reduce((sum, row) => sum + Number(row.closingFee.income), 0), -0.2);
});
