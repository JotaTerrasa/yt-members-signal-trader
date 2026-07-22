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

  async getCommissionRate(symbol = 'BTC-USDT') {
    return this.request('GET', '/openApi/swap/v2/user/commissionRate', { symbol });
  }

  async getContracts(symbol) {
    return this.request('GET', '/openApi/swap/v2/quote/contracts', symbol ? { symbol } : {});
  }

  async getTicker(symbol) {
    return this.publicRequest('/openApi/swap/v2/quote/ticker', { symbol });
  }

  async getServerTime() {
    return this.publicRequest('/openApi/swap/v2/server/time');
  }

  async getPositions(symbol) {
    return this.request('GET', '/openApi/swap/v2/user/positions', symbol ? { symbol } : {});
  }

  async getOpenOrders(symbol) {
    return this.request('GET', '/openApi/swap/v2/trade/openOrders', symbol ? { symbol } : {});
  }

  async getOrderHistory(params = {}) {
    return this.request('GET', '/openApi/swap/v2/trade/allOrders', params);
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

  async cancelOrder({ symbol, orderId, clientOrderId }) {
    return this.request('DELETE', '/openApi/swap/v2/trade/order', {
      symbol,
      orderId,
      clientOrderId
    });
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

    const networkAttempts = [];
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

        const body = await parseJsonResponse(response);
        if (!response.ok || body.code !== 0) {
          throw new Error(body.msg || `BingX devolvio HTTP ${response.status}`);
        }
        return body;
      } catch (error) {
        if (!isNetworkOrTimeout(error)) {
          throw error;
        }
        networkAttempts.push({ baseUrl, error });
        if (baseUrl === urls[urls.length - 1]) {
          throw buildNetworkError('BingX no respondio por red', networkAttempts);
        }
      }
    }

    throw buildNetworkError('BingX no respondio por red', networkAttempts);
  }

  async publicRequest(path, payload = {}) {
    const encoded = buildEncodedQuery(payload);
    const urls = API_BASE_URLS[this.environment] || API_BASE_URLS['prod-live'];

    const networkAttempts = [];
    for (const baseUrl of urls) {
      const url = encoded ? `${baseUrl}${path}?${encoded}` : `${baseUrl}${path}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-SOURCE-KEY': 'BX-AI-SKILL'
          },
          signal: AbortSignal.timeout(10000)
        });

        const body = await parseJsonResponse(response);
        if (!response.ok || body.code !== 0) {
          throw new Error(body.msg || `BingX devolvio HTTP ${response.status}`);
        }
        return body;
      } catch (error) {
        if (!isNetworkOrTimeout(error)) {
          throw error;
        }
        networkAttempts.push({ baseUrl, error });
        if (baseUrl === urls[urls.length - 1]) {
          throw buildNetworkError('BingX no respondio por red', networkAttempts);
        }
      }
    }

    throw buildNetworkError('BingX no respondio por red', networkAttempts);
  }
}

function isNetworkOrTimeout(error) {
  return error instanceof TypeError
    || error?.name === 'AbortError'
    || error?.name === 'TimeoutError';
}

function buildNetworkError(prefix, attempts = []) {
  const details = attempts
    .map(({ baseUrl, error }) => `${new URL(baseUrl).host}: ${describeNetworkError(error)}`)
    .join('; ');
  const message = details ? `${prefix}: ${details}` : prefix;
  const wrapped = new Error(message);
  wrapped.cause = attempts.at(-1)?.error;
  return wrapped;
}

function describeNetworkError(error) {
  const code = error?.cause?.code || error?.code || '';
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return 'timeout tras 10s';
  }
  if (code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
    return 'certificado local no confiable (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)';
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return `DNS ${code}`;
  }
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
    return `conexion ${code}`;
  }
  return [error?.message || String(error), code].filter(Boolean).join(' ');
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  return parseBingXJsonText(text);
}

export function parseBingXJsonText(text) {
  return JSON.parse(String(text || '{}').replace(
    /("(?:orderId|orderID|positionId|positionID|tradeId|tradeID|triggerOrderId|mainOrderId)"\s*:\s*)(\d{16,})/g,
    '$1"$2"'
  ));
}

function buildEncodedQuery(parameters) {
  return Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
