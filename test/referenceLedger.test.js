import assert from 'node:assert/strict';
import test from 'node:test';
import { clearReferenceLedgerCache, loadReferenceLedger } from '../src/referenceLedger.js';

const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1234567890abcdefghijklmnopqrstuvwxyz/edit';

test('el refresco manual omite la cache y deduplica lecturas simultaneas', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  const requestOptions = [];

  globalThis.fetch = async (_url, options) => {
    fetchCount += 1;
    requestOptions.push(options || {});
    await delay(10);
    return new Response(gvizPayload(fetchCount === 1 ? 10 : 25), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  try {
    clearReferenceLedgerCache();
    const first = await loadReferenceLedger({ month: '2026-07', portfolioUrl: spreadsheetUrl });
    const cached = await loadReferenceLedger({ month: '2026-07', portfolioUrl: spreadsheetUrl });
    const refreshed = await loadReferenceLedger({
      month: '2026-07',
      portfolioUrl: spreadsheetUrl,
      forceRefresh: true
    });

    assert.equal(fetchCount, 2);
    assert.equal(first.row.paperPnl, 10);
    assert.equal(cached.row.paperPnl, 10);
    assert.equal(refreshed.row.paperPnl, 25);
    assert.equal(requestOptions[1].headers['cache-control'], 'no-cache');

    clearReferenceLedgerCache();
    fetchCount = 0;
    await Promise.all([
      loadReferenceLedger({ month: '2026-07', portfolioUrl: spreadsheetUrl, forceRefresh: true }),
      loadReferenceLedger({ month: '2026-07', portfolioUrl: spreadsheetUrl, forceRefresh: true })
    ]);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearReferenceLedgerCache();
  }
});

function gvizPayload(pnl) {
  const rows = [
    sheetRow([null, null, null, null, null, null, null, null, null, null, 10_000 + pnl]),
    sheetRow(['#', 'FECHA', 'ACTIVO', 'DIRECCION', 'ENTRADA', 'SALIDA', 'APALANCAMIENTO', 'MARGEN', 'EXPOSICION', null, 'PNL']),
    sheetRow([1, '02/07/2026', 'BTC', 'LONG', 60_000, 61_000, 25, 1500, 37_500, null, pnl, pnl >= 0 ? 'GANADA' : 'PERDIDA'])
  ];
  return `google.visualization.Query.setResponse(${JSON.stringify({ table: { rows } })});`;
}

function sheetRow(values) {
  return { c: values.map((value) => (value === null ? null : { v: value })) };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
