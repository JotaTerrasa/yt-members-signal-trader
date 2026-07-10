import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFuturesSignals } from '../src/futuresSignalParser.js';

test('reconoce cierres aunque BTC llegue abreviado como BT.', () => {
  const signals = parseFuturesSignals('CIERRES\n\nBT. 61507\nETH 1663\nSUI 0.744');

  assert.deepEqual(signals.map(({ action, symbol, closePrice }) => ({ action, symbol, closePrice })), [
    { action: 'CLOSE', symbol: 'BTC-USDT', closePrice: 61507 },
    { action: 'CLOSE', symbol: 'ETH-USDT', closePrice: 1663 },
    { action: 'CLOSE', symbol: 'SUI-USDT', closePrice: 0.744 }
  ]);
});

test('reconoce cierre total escrito en lenguaje natural', () => {
  const [signal] = parseFuturesSignals('CERRADLO TODO');
  assert.equal(signal.action, 'CLOSE_ALL');
});

test('parsea una apertura SHORT con el stop en el lado correcto', () => {
  const [signal] = parseFuturesSignals([
    'ORDEN',
    'SHORT BTC 62000',
    'STOP BTC BINGX 62500',
    'APALANCAMIENTO X25',
    '1500USDT'
  ].join('\n'));

  assert.equal(signal.symbol, 'BTC-USDT');
  assert.equal(signal.direction, 'SHORT');
  assert.equal(signal.entry.price, 62000);
  assert.equal(signal.stopLoss, 62500);
  assert.equal(signal.leverage, 25);
});

test('extrae apertura, todos los TP y una modificación de SL del mismo mensaje', () => {
  const signals = parseFuturesSignals([
    'Primero: modificacion sl btc a 76200',
    'Segundo: take profits',
    '',
    'BTC 78711',
    'ETH 2182',
    'SOL 88.7',
    'SUI 1.13',
    '',
    'LONG ETH 2118',
    'STOP ETH BINGX 2095',
    'APALANCAMIENTO X25',
    '1500USDT'
  ].join('\n'));

  const opening = signals.find((signal) => !signal.action);
  const takeProfits = signals.filter((signal) => signal.action === 'SET_TAKE_PROFIT');
  const stopUpdate = signals.find((signal) => signal.action === 'SET_STOP_LOSS');

  assert.equal(opening.symbol, 'ETH-USDT');
  assert.deepEqual(opening.takeProfits, [2182]);
  assert.deepEqual(takeProfits.map((signal) => signal.symbol), [
    'BTC-USDT',
    'ETH-USDT',
    'SOL-USDT',
    'SUI-USDT'
  ]);
  assert.equal(stopUpdate.symbol, 'BTC-USDT');
  assert.equal(stopUpdate.stopLoss, 76200);
});
