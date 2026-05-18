import crypto from 'node:crypto';

const API_BASE_URLS = {
  'prod-live': ['https://open-api.bingx.com', 'https://open-api.bingx.pro'],
  'prod-vst': ['https://open-api-vst.bingx.com', 'https://open-api-vst.bingx.pro']
};

export class BingXClient {
  constructor({ apiKey, apiSecret, environment = 'prod-live' }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.environment = environment;
  }

  async getBalance() {
    return this.request('GET', '/openApi/swap/v3/user/balance', {});
  }

  async getIncome(params = {}) {
    return this.request('GET', '/openApi/swap/v2/user/income', params);
  }

  async getContracts(symbol) {
    return this.request('GET', '/openApi/swap/v2/quote/contracts', symbol ? { symbol } : {});
  }

  async getTicker(symbol) {
    return this.request('GET', '/openApi/swap/v2/quote/ticker', { symbol });
  }

  async getPositions(symbol) {
    return this.request('GET', '/openApi/swap/v2/user/positions', symbol ? { symbol } : {});
  }

  async setLeverage({ symbol, side, leverage }) {
    return this.request('POST', '/openApi/swap/v2/trade/leverage', {
      symbol,
      side,
      leverage
    });
  }

  async setMarginType({ symbol, marginType }) {
    return this.request('POST', '/openApi/swap/v2/trade/marginType', {
      symbol,
      marginType
    });
  }

  async placeOrder(order, { test = true } = {}) {
    return this.request('POST', test ? '/openApi/swap/v2/trade/order/test' : '/openApi/swap/v2/trade/order', order);
  }

  async closePosition({ positionId }) {
    return this.request('POST', '/openApi/swap/v1/trade/closePosition', { positionId });
  }

  async getVst({ amount = 10000, adjustType = 0 } = {}) {
    return this.request('POST', '/openApi/swap/v2/trade/getVst', { amount, adjustType });
  }

  async request(method, path, payload) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Faltan API key o secret de BingX.');
    }

    const timestamp = Date.now();
    const parameters = {
      ...payload,
      timestamp,
      recvWindow: 5000
    };
    const encoded = buildEncodedQuery(parameters);
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(encoded)
      .digest('hex');
    const signedPayload = `${encoded}&signature=${signature}`;
    const urls = API_BASE_URLS[this.environment] || API_BASE_URLS['prod-live'];

    let lastNetworkError = null;
    for (const baseUrl of urls) {
      const url = method === 'POST' ? `${baseUrl}${path}` : `${baseUrl}${path}?${signedPayload}`;
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'X-BX-APIKEY': this.apiKey,
            'X-SOURCE-KEY': 'BX-AI-SKILL',
            ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {})
          },
          body: method === 'POST' ? signedPayload : undefined,
          signal: AbortSignal.timeout(10000)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.code !== 0) {
          throw new Error(body.msg || `BingX devolvio HTTP ${response.status}`);
        }
        return body;
      } catch (error) {
        if (!isNetworkOrTimeout(error) || baseUrl === urls[urls.length - 1]) {
          throw error;
        }
        lastNetworkError = error;
      }
    }

    throw lastNetworkError || new Error('BingX no respondio.');
  }
}

function isNetworkOrTimeout(error) {
  return error instanceof TypeError
    || error?.name === 'AbortError'
    || error?.name === 'TimeoutError';
}

function buildEncodedQuery(parameters) {
  return Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
