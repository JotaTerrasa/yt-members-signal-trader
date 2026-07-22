import test from 'node:test';
import assert from 'node:assert/strict';
import { closeAdverseDeviationPercent, entryAdverseDeviationPercent, resolveCloseFill, resolveEntryFill, resolveEntryReference } from '../src/executionAuditPrices.js';

test('la auditoría distingue la referencia de la señal del precio real de entrada', () => {
  const event = {
    entryPrice: 1621.81,
    signal: { entry: { price: 1620 } },
    response: { data: { order: { avgPrice: '1623.44', executedQty: '0.462' } } }
  };

  assert.deepEqual(resolveEntryReference(event), { price: 1620, source: 'signal_reference' });
  assert.deepEqual(resolveEntryFill(event), { price: 1623.44, source: 'exchange_fill' });
});

test('reconstruye el fill de cierre LONG con el PnL y la cantidad de BingX', () => {
  const fill = resolveCloseFill({
    opening: { signal: { direction: 'LONG' } },
    closeEvent: {
      exchangePosition: {
        direction: 'LONG',
        entryPrice: 1623.44,
        quantity: 0.462,
        currentPrice: 1624.37
      }
    },
    realizedSource: { income: -1.1422 }
  });

  assert.equal(fill.source, 'derived_position_pnl');
  assert.ok(Math.abs(fill.price - 1620.9677) < 0.0001);
});

test('reconstruye el fill de cierre SHORT en el sentido correcto', () => {
  const fill = resolveCloseFill({
    opening: { signal: { direction: 'SHORT' } },
    closeEvent: {
      exchangePosition: {
        direction: 'SHORT',
        entryPrice: 100,
        quantity: 2
      }
    },
    realizedSource: { income: 6 }
  });

  assert.deepEqual(fill, { price: 97, source: 'derived_position_pnl' });
});

test('mide el deslizamiento adverso según fase y dirección', () => {
  assert.equal(entryAdverseDeviationPercent({ actual: 101, reference: 100, direction: 'LONG' }), 1);
  assert.equal(entryAdverseDeviationPercent({ actual: 99, reference: 100, direction: 'SHORT' }), 1);
  assert.equal(closeAdverseDeviationPercent({ actual: 99, reference: 100, direction: 'LONG' }), 1);
  assert.equal(closeAdverseDeviationPercent({ actual: 101, reference: 100, direction: 'SHORT' }), 1);
  assert.equal(closeAdverseDeviationPercent({ actual: 101, reference: 100, direction: 'LONG' }), 0);
});
