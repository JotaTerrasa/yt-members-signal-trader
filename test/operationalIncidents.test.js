import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupOperationalIncidents,
  summarizeOperationalIncidents
} from '../src/operationalIncidents.js';

test('agrupa repeticiones antes del límite sin perder su frecuencia', () => {
  const repeated = Array.from({ length: 40 }, (_, index) => ({
    at: new Date(Date.parse('2026-07-23T10:00:00.000Z') + index * 1000).toISOString(),
    level: 'warn',
    type: 'telegram_web_empty',
    title: 'Telegram Web sin mensajes visibles',
    message: `Lectura vacía ${index + 1}`
  }));
  const groups = groupOperationalIncidents([
    ...repeated,
    {
      at: '2026-07-23T10:01:00.000Z',
      level: 'error',
      type: 'bingx_sync',
      title: 'Reconciliación BingX',
      message: 'Sin respuesta'
    }
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].type, 'bingx_sync');
  assert.equal(groups[1].type, 'telegram_web_empty');
  assert.equal(groups[1].occurrences, 40);
  assert.equal(groups[1].firstAt, '2026-07-23T10:00:00.000Z');
  assert.equal(groups[1].lastAt, '2026-07-23T10:00:39.000Z');
});

test('conserva separados los errores genéricos con mensajes distintos', () => {
  const groups = groupOperationalIncidents([
    {
      at: '2026-07-23T10:00:00.000Z',
      level: 'error',
      type: 'error',
      title: 'Error',
      message: 'Fallo A'
    },
    {
      at: '2026-07-23T10:01:00.000Z',
      level: 'error',
      type: 'error',
      title: 'Error',
      message: 'Fallo B'
    },
    {
      at: '2026-07-23T10:02:00.000Z',
      level: 'error',
      type: 'error',
      title: 'Error',
      message: 'Fallo A'
    }
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].message, 'Fallo A');
  assert.equal(groups[0].occurrences, 2);
  assert.equal(groups[1].message, 'Fallo B');
  assert.equal(groups[1].occurrences, 1);
});

test('resume ocurrencias y grupos como magnitudes distintas', () => {
  const groups = groupOperationalIncidents([
    {
      at: '2026-07-23T10:00:00.000Z',
      level: 'warn',
      type: 'telegram_web_empty',
      occurrences: 29
    },
    {
      at: '2026-07-23T10:01:00.000Z',
      level: 'warn',
      type: 'youtube_empty'
    },
    {
      at: '2026-07-23T10:02:00.000Z',
      level: 'error',
      type: 'error',
      message: 'Fallo'
    }
  ]);
  const summary = summarizeOperationalIncidents(groups, { displayed: 2 });

  assert.deepEqual(summary, {
    total: 31,
    groups: 3,
    displayed: 2,
    warn: 30,
    error: 1,
    info: 0,
    byType: {
      telegram_web_empty: 29,
      youtube_empty: 1,
      error: 1
    }
  });
});
