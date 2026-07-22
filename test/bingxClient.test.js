import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBingXJsonText } from '../src/bingxClient.js';

test('conserva sin perdida de precision todos los identificadores largos de BingX', () => {
  const parsed = parseBingXJsonText(`{
    "orderId": 2075601044592656385,
    "positionID": 2075601044672348161,
    "tradeId": 2075601044672348162,
    "triggerOrderId": 2075601044672348163,
    "mainOrderId": 2075601044672348164
  }`);

  assert.deepEqual(parsed, {
    orderId: '2075601044592656385',
    positionID: '2075601044672348161',
    tradeId: '2075601044672348162',
    triggerOrderId: '2075601044672348163',
    mainOrderId: '2075601044672348164'
  });
});
