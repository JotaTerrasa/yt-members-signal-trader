import assert from 'node:assert/strict';
import test from 'node:test';
import { BingXPriceWebSocket } from '../src/bingxPriceWebSocket.js';

test('suscribe precio y bookTicker sin confundir bid/ask con el precio de mercado', () => {
  const sent = [];
  const feed = new BingXPriceWebSocket();
  feed.ws = {
    readyState: 1,
    send: (payload) => sent.push(JSON.parse(payload))
  };

  feed.subscribe('BTC-USDT');

  assert.deepEqual(sent.map((item) => item.dataType), [
    'BTC-USDT@lastPrice',
    'BTC-USDT@bookTicker'
  ]);
});

test('conserva una instantánea fresca de bid/ask y solo emite price para lastPrice', () => {
  const feed = new BingXPriceWebSocket();
  feed.symbols.add('BTC-USDT');
  const prices = [];
  const quotes = [];
  feed.on('price', (tick) => prices.push(tick));
  feed.on('quote', (quote) => quotes.push(quote));

  feed.handleMessage(Buffer.from(JSON.stringify({
    dataType: 'BTC-USDT@bookTicker',
    data: {
      s: 'BTC-USDT',
      b: '65999.5',
      B: '1.25',
      a: '66000.5',
      A: '0.75',
      T: 1784721600123
    }
  })));

  assert.equal(prices.length, 0);
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0].bidPrice, 65999.5);
  assert.equal(quotes[0].askPrice, 66000.5);
  assert.equal(quotes[0].midPrice, 66000);
  assert.equal(quotes[0].spreadAbsolute, 1);
  assert.equal(quotes[0].exchangeAt, '2026-07-22T12:00:00.123Z');

  const snapshot = feed.quoteSnapshot('BTC-USDT', { maxAgeMs: 5000 });
  assert.equal(snapshot.stale, false);
  assert.equal(snapshot.askQuantity, 0.75);
  assert.equal(feed.status().quotes.length, 1);

  feed.handleMessage(Buffer.from(JSON.stringify({
    dataType: 'BTC-USDT@lastPrice',
    data: { s: 'BTC-USDT', c: '66000.2', T: 1784721600200 }
  })));

  assert.equal(prices.length, 1);
  assert.equal(prices[0].price, 66000.2);
});
