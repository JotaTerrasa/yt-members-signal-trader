import test from 'node:test';
import assert from 'node:assert/strict';
import { BingXClient, parseBingXJsonText } from '../src/bingxClient.js';

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

test('consulta el reloj publico de BingX con la cabecera de origen oficial', async (t) => {
  const originalFetch = global.fetch;
  const requests = [];
  t.after(() => {
    global.fetch = originalFetch;
  });
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ code: 0, data: { serverTime: 1784721600123 } })
    };
  };

  const client = new BingXClient({ environment: 'prod-vst' });
  const response = await client.getServerTime();

  assert.equal(response.data.serverTime, 1784721600123);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://open-api-vst.bingx.com/openApi/swap/v2/server/time');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers['X-SOURCE-KEY'], 'BX-AI-SKILL');
});
