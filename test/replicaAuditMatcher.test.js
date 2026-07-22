import test from 'node:test';
import assert from 'node:assert/strict';
import { alignReplicaAuditRecords, alignSequences, attachCloseFailures } from '../src/replicaAuditMatcher.js';

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
