import test from 'node:test';
import assert from 'node:assert/strict';
import { editedOpeningSignals } from '../src/editedSignalRecovery.js';
import { parseFuturesSignals } from '../src/futuresSignalParser.js';

test('recupera solo la apertura cuyo stop fue corregido al editar el post', () => {
  const previousText = [
    'ORDEN',
    'LONG BTC 64222',
    'STOP BTC BINGX 63500',
    'APALANCAMIENTO X25',
    'LONG ETH 1885',
    'STOP ETH BINGX 165',
    'APALANCAMIENTO X25',
    'LONG SOL 76.2',
    'STOP SOL BINGX 75.4',
    'APALANCAMIENTO X25'
  ].join('\n');
  const currentText = previousText.replace('STOP ETH BINGX 165', 'STOP ETH BINGX 1865');

  const recovered = editedOpeningSignals({
    previousText,
    currentText,
    parseSignals: parseFuturesSignals
  });

  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].symbol, 'ETH-USDT');
  assert.equal(recovered[0].stopLoss, 1865);
});

test('una edicion de prosa o take profit no vuelve a abrir posiciones', () => {
  const previousText = 'ORDEN\nLONG ETH 1885\nSTOP ETH BINGX 1865\nAPALANCAMIENTO X25';
  const currentText = `${previousText}\n\nTAKE PROFITS\nETH 1910\nTexto aclaratorio.`;

  const recovered = editedOpeningSignals({
    previousText,
    currentText,
    parseSignals: parseFuturesSignals
  });

  assert.deepEqual(recovered, []);
});

test('una edicion no puede anadir un ticker o una direccion nuevos', () => {
  const previousText = 'ORDEN\nLONG ETH 1885\nSTOP ETH BINGX 1865\nAPALANCAMIENTO X25';
  const currentText = `${previousText}\n\nSHORT BTC 64000\nSTOP BTC BINGX 64600\nAPALANCAMIENTO X25`;

  const recovered = editedOpeningSignals({
    previousText,
    currentText,
    parseSignals: parseFuturesSignals
  });

  assert.deepEqual(recovered, []);
});
