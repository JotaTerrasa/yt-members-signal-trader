import { chromium } from 'playwright';

const baseUrl = optionValue('--base-url') || 'http://127.0.0.1:5178';
let browser;

try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  let injectedFailures = 0;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/telegram', async (route) => {
    if (injectedFailures === 0) {
      injectedFailures += 1;
      await route.fulfill({
        status: 503,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ error: 'Fallo temporal QA' })
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`${baseUrl}/?bootstrap-recovery-check=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await page.waitForFunction(() => {
    const alert = document.querySelector('#client-error');
    return alert
      && !alert.classList.contains('hidden')
      && alert.dataset.source === 'bootstrap'
      && alert.textContent.includes('Panel cargado parcialmente');
  }, null, { timeout: 10_000 });

  const partial = await page.evaluate(() => ({
    runtime: document.documentElement.dataset.runtimeId || '',
    status: document.querySelector('#status-text')?.textContent || '',
    alert: document.querySelector('#client-error')?.textContent || ''
  }));
  if (!partial.runtime || !partial.status) {
    throw new Error('El resto del panel no termino de arrancar durante el fallo parcial.');
  }

  await page.waitForFunction(() => {
    const alert = document.querySelector('#client-error');
    return alert?.classList.contains('hidden') && !alert.dataset.source && !alert.textContent;
  }, null, { timeout: 10_000 });
  if (injectedFailures !== 1) {
    throw new Error(`Se esperaban 1 fallo inyectado y hubo ${injectedFailures}.`);
  }
  if (pageErrors.length) {
    throw new Error(`Errores JavaScript en el arranque: ${pageErrors.join(' | ')}`);
  }

  const realtimePage = await browser.newPage();
  const realtimePageErrors = [];
  let realtimeInjectedFailures = 0;
  let realtimeRequests = 0;
  realtimePage.on('pageerror', (error) => realtimePageErrors.push(error.message));
  await realtimePage.route('**/api/events', async (route) => {
    realtimeRequests += 1;
    if (realtimeRequests === 1) {
      realtimeInjectedFailures += 1;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        headers: {
          'cache-control': 'no-cache, no-transform',
          'x-accel-buffering': 'no'
        },
        body: 'retry: 1000\n\nevent: state\ndata: {"runtime":\n\n'
      });
      return;
    }
    if (realtimeRequests === 2) {
      await delay(1500);
    }
    await route.continue();
  });

  await realtimePage.goto(`${baseUrl}/?realtime-recovery-check=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await realtimePage.waitForFunction(() => {
    const alert = document.querySelector('#client-error');
    return document.documentElement.dataset.realtimePayloadStatus === 'error'
      && alert
      && !alert.classList.contains('hidden')
      && alert.dataset.source === 'realtime'
      && alert.textContent.includes('actualización dañada');
  }, null, { timeout: 10_000 });

  await realtimePage.waitForFunction(() => {
    const alert = document.querySelector('#client-error');
    return document.documentElement.dataset.realtimePayloadStatus === 'ok'
      && document.documentElement.dataset.runtimeId
      && (!alert || alert.dataset.source !== 'realtime');
  }, null, { timeout: 10_000 });
  if (realtimeInjectedFailures !== 1 || realtimeRequests < 2) {
    throw new Error(`La prueba SSE no completo el ciclo de recuperacion: ${realtimeInjectedFailures}/${realtimeRequests}.`);
  }
  if (realtimePageErrors.length) {
    throw new Error(`Errores JavaScript tras el evento SSE corrupto: ${realtimePageErrors.join(' | ')}`);
  }

  const timeoutPage = await browser.newPage();
  const timeoutPageErrors = [];
  let timeoutInjectedFailures = 0;
  let timeoutRequests = 0;
  timeoutPage.on('pageerror', (error) => timeoutPageErrors.push(error.message));
  await timeoutPage.route('**/api/telegram-source', async (route) => {
    timeoutRequests += 1;
    if (timeoutRequests === 1) {
      timeoutInjectedFailures += 1;
      await delay(9000);
      await route.continue().catch(() => {});
      return;
    }
    await route.continue();
  });

  await timeoutPage.goto(`${baseUrl}/?bootstrap-timeout-check=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await timeoutPage.waitForFunction(() => {
    const alert = document.querySelector('#client-error');
    return alert
      && !alert.classList.contains('hidden')
      && alert.dataset.source === 'bootstrap'
      && alert.textContent.includes('/api/telegram-source')
      && alert.textContent.includes('8 segundos');
  }, null, { timeout: 12_000 });

  const timeoutPartial = await timeoutPage.evaluate(() => ({
    runtime: document.documentElement.dataset.runtimeId || '',
    status: document.querySelector('#status-text')?.textContent || ''
  }));
  if (!timeoutPartial.runtime || !timeoutPartial.status) {
    throw new Error('El endpoint colgado bloqueo el resto del panel.');
  }

  await timeoutPage.waitForFunction(() => {
    const alert = document.querySelector('#client-error');
    return alert?.classList.contains('hidden') && !alert.dataset.source && !alert.textContent;
  }, null, { timeout: 15_000 });
  if (timeoutInjectedFailures !== 1 || timeoutRequests < 2) {
    throw new Error(`La prueba de timeout no completo el reintento: ${timeoutInjectedFailures}/${timeoutRequests}.`);
  }
  if (timeoutPageErrors.length) {
    throw new Error(`Errores JavaScript tras el timeout inicial: ${timeoutPageErrors.join(' | ')}`);
  }

  const pnlIsolationPage = await browser.newPage();
  const pnlIsolationErrors = [];
  let historicalFailures = 0;
  let pnlSourcesRequests = 0;
  let replicaAuditRequests = 0;
  pnlIsolationPage.on('pageerror', (error) => pnlIsolationErrors.push(error.message));
  await pnlIsolationPage.route('**/api/historical-pnl?**', async (route) => {
    historicalFailures += 1;
    await route.fulfill({
      status: 503,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: 'Hoja no disponible en QA' })
    });
  });
  await pnlIsolationPage.route('**/api/bingx/pnl-sources', async (route) => {
    pnlSourcesRequests += 1;
    await route.continue();
  });
  await pnlIsolationPage.route('**/api/replica-audit', async (route) => {
    replicaAuditRequests += 1;
    await route.continue();
  });

  await pnlIsolationPage.goto(`${baseUrl}/?pnl-isolation-check=${Date.now()}#external-sheet-panel`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await pnlIsolationPage.waitForFunction(() => {
    const pnlView = document.querySelector('#pnl-view');
    const sheetStatus = document.querySelector('#external-sheet-status');
    const sheetEmpty = document.querySelector('#external-sheet-empty');
    const sourceGrid = document.querySelector('#pnl-source-grid');
    return pnlView
      && !pnlView.classList.contains('hidden')
      && sheetStatus?.textContent.includes('No disponible')
      && sheetEmpty?.textContent.includes('No se pudo actualizar la hoja')
      && sourceGrid?.children.length >= 2
      && !document.querySelector('#external-sheet-panel')?.getAttribute('aria-busy')?.includes('true');
  }, null, { timeout: 20_000 });
  if (historicalFailures < 1 || pnlSourcesRequests < 1 || replicaAuditRequests < 1) {
    throw new Error(`La prueba PnL no consulto todas las fuentes: ${historicalFailures}/${pnlSourcesRequests}/${replicaAuditRequests}.`);
  }
  if (pnlIsolationErrors.length) {
    throw new Error(`Errores JavaScript al aislar Google Sheet: ${pnlIsolationErrors.join(' | ')}`);
  }

  const nativeSheetPage = await browser.newPage();
  const nativeSheetErrors = [];
  const fixtureMonth = localMonthKey();
  const fixtureAt = new Date();
  fixtureAt.setDate(1);
  fixtureAt.setHours(12, 0, 0, 0);
  const fixtureOpenAt = new Date();
  nativeSheetPage.on('pageerror', (error) => nativeSheetErrors.push(error.message));
  await nativeSheetPage.route('**/api/historical-pnl?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        historical: {
          source: {
            alignedMonth: fixtureMonth,
            referenceLedger: {
              label: 'HOJA QA',
              url: 'https://docs.google.com/spreadsheets/d/qa/edit'
            }
          },
          months: [{
            month: fixtureMonth,
            asset: 'USDT',
            total: 15,
            realized: 15,
            closedTrades: 1,
            openPaperTrades: 1
          }],
          positions: [
            {
              id: 'sheet-qa-1',
              orderNumber: 1,
              status: 'closed',
              referenceLedger: true,
              symbol: 'BTC-USDT',
              direction: 'LONG',
              leverage: 25,
              openedAt: fixtureAt.toISOString(),
              closedAt: fixtureAt.toISOString(),
              entryPrice: 100,
              closePrice: 101,
              realizedPnl: 15,
              notional: 1500,
              outcome: 'GANADA'
            },
            {
              id: 'sheet-qa-2',
              orderNumber: 2,
              status: 'open',
              referenceLedger: true,
              symbol: 'ETH-USDT',
              direction: 'LONG',
              leverage: 25,
              openedAt: fixtureOpenAt.toISOString(),
              closedAt: null,
              entryPrice: 200,
              stopLoss: 195,
              realizedPnl: null,
              paperPnl: null,
              notional: 1500,
              outcome: 'ABIERTA'
            }
          ]
        }
      })
    });
  });

  await nativeSheetPage.goto(`${baseUrl}/?native-sheet-check=${Date.now()}#external-sheet-panel`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await nativeSheetPage.waitForFunction(() => {
    const panel = document.querySelector('#external-sheet-panel');
    const status = document.querySelector('#external-sheet-status');
    return panel
      && panel.dataset.sheetState !== 'loading'
      && document.querySelectorAll('#external-sheet-body tr').length === 2
      && status?.textContent.includes('datos hasta');
  }, null, { timeout: 20_000 });
  const nativeSheetState = await nativeSheetPage.evaluate(() => ({
    iframeCount: document.querySelectorAll('#external-sheet-panel iframe').length,
    rowCount: document.querySelectorAll('#external-sheet-body tr').length,
    status: document.querySelector('#external-sheet-status')?.textContent || '',
    summary: document.querySelector('#external-sheet-summary')?.textContent || '',
    firstRow: document.querySelector('#external-sheet-body tr')?.textContent || '',
    tableVisible: !document.querySelector('#external-sheet-native')?.classList.contains('hidden')
  }));
  if (nativeSheetState.iframeCount !== 0
    || nativeSheetState.rowCount !== 2
    || !nativeSheetState.tableVisible
    || !nativeSheetState.summary.includes('1 abiertas')
    || !nativeSheetState.firstRow.includes('SL 195')
    || !nativeSheetState.firstRow.includes('ABIERTA')) {
    throw new Error(`La hoja externa no uso la tabla nativa: ${JSON.stringify(nativeSheetState)}.`);
  }
  if (nativeSheetErrors.length) {
    throw new Error(`Errores JavaScript en la hoja nativa: ${nativeSheetErrors.join(' | ')}`);
  }

  await nativeSheetPage.click('[data-performance-source="sheet"]');
  await nativeSheetPage.waitForFunction(() => {
    const curveStatus = document.querySelector('#pnl-curve-status')?.textContent || '';
    const openSignal = [...document.querySelectorAll('#historical-signal-list .historical-signal-item')]
      .find((item) => item.textContent.includes('ETH-USDT'));
    const openPnl = openSignal?.querySelector('.trade-history-main > span')?.textContent.trim();
    const simulationRows = [...document.querySelectorAll('#pnl-sim-list .simulation-row')];
    return curveStatus.includes('1 operaciones simuladas')
      && curveStatus.includes('1 pendientes sin PnL')
      && openPnl === '-'
      && simulationRows.length === 1
      && !simulationRows.some((row) => row.textContent.includes('ETH-USDT'));
  }, null, { timeout: 20_000 });
  if (nativeSheetErrors.length) {
    throw new Error(`Errores JavaScript al excluir PnL pendiente: ${nativeSheetErrors.join(' | ')}`);
  }

  const sheetNavigationPage = await browser.newPage({ viewport: { width: 760, height: 800 } });
  const sheetNavigationErrors = [];
  const navigationPositions = Array.from({ length: 45 }, (_, index) => ({
    id: `sheet-navigation-${index + 1}`,
    orderNumber: 45 - index,
    status: 'closed',
    referenceLedger: true,
    symbol: index % 2 === 0 ? 'BTC-USDT' : 'ETH-USDT',
    direction: 'LONG',
    leverage: 25,
    openedAt: fixtureAt.toISOString(),
    closedAt: fixtureAt.toISOString(),
    entryPrice: 100 + index,
    closePrice: 101 + index,
    realizedPnl: 1,
    paperPnl: 1,
    notional: 1500,
    outcome: 'GANADA'
  }));
  sheetNavigationPage.on('pageerror', (error) => sheetNavigationErrors.push(error.message));
  await sheetNavigationPage.route('**/api/historical-pnl?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        historical: {
          source: {
            alignedMonth: fixtureMonth,
            referenceLedger: {
              label: 'HOJA NAVEGACION QA',
              url: 'https://docs.google.com/spreadsheets/d/qa-navigation/edit'
            }
          },
          months: [{
            month: fixtureMonth,
            asset: 'USDT',
            total: 45,
            realized: 45,
            closedTrades: 45,
            openPaperTrades: 0
          }],
          positions: navigationPositions
        }
      })
    });
  });
  await sheetNavigationPage.goto(`${baseUrl}/?sheet-navigation-check=${Date.now()}#external-sheet-panel`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await sheetNavigationPage.waitForFunction(() => (
    document.querySelectorAll('#external-sheet-body tr').length === 40
      && document.querySelector('#external-sheet-pagination-status')?.textContent.includes('40 de 45')
  ), null, { timeout: 20_000 });
  await sheetNavigationPage.click('#external-sheet-load-more');
  await sheetNavigationPage.click('[data-external-sheet-scroll="down"]');
  await sheetNavigationPage.click('[data-external-sheet-scroll="right"]');
  await sheetNavigationPage.waitForTimeout(700);
  const navigationState = await sheetNavigationPage.evaluate(() => {
    const wrap = document.querySelector('.external-sheet-table-wrap');
    const rows = [...document.querySelectorAll('#external-sheet-body tr')];
    return {
      rows: rows.length,
      firstOrder: rows[0]?.querySelector('td:first-child strong')?.textContent.trim() || '',
      lastOrder: rows.at(-1)?.querySelector('td:first-child strong')?.textContent.trim() || '',
      status: document.querySelector('#external-sheet-pagination-status')?.textContent || '',
      loadMoreHidden: document.querySelector('#external-sheet-load-more')?.classList.contains('hidden'),
      scrollTop: wrap?.scrollTop || 0,
      scrollLeft: wrap?.scrollLeft || 0,
      scrollTopMax: wrap ? wrap.scrollHeight - wrap.clientHeight : 0,
      scrollLeftMax: wrap ? wrap.scrollWidth - wrap.clientWidth : 0
    };
  });
  if (navigationState.rows !== 45
    || navigationState.firstOrder !== '45'
    || navigationState.lastOrder !== '1'
    || !navigationState.status.includes('45 de 45')
    || !navigationState.loadMoreHidden
    || navigationState.scrollTopMax <= 0
    || navigationState.scrollLeftMax <= 0
    || navigationState.scrollTop <= 0
    || navigationState.scrollLeft <= 0) {
    throw new Error(`La hoja no permitio recorrer todas sus filas: ${JSON.stringify(navigationState)}.`);
  }
  if (sheetNavigationErrors.length) {
    throw new Error(`Errores JavaScript al navegar la hoja: ${sheetNavigationErrors.join(' | ')}`);
  }

  const outcomeImpactPage = await browser.newPage({ viewport: { width: 760, height: 900 } });
  const outcomeImpactErrors = [];
  const outcomeImpactFixture = economicImpactAuditFixture(fixtureMonth);
  outcomeImpactPage.on('pageerror', (error) => outcomeImpactErrors.push(error.message));
  await outcomeImpactPage.route('**/api/bingx', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        bingx: {
          enabled: false,
          mode: 'demo',
          apiKeyConfigured: false,
          apiSecretConfigured: false
        },
        trades: [],
        paperTrades: [],
        exchangePositions: [],
        exchangeSafety: {},
        risk: {}
      })
    });
  });
  await outcomeImpactPage.route('**/api/historical-pnl?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        historical: {
          source: { alignedMonth: fixtureMonth },
          months: [],
          positions: []
        }
      })
    });
  });
  await outcomeImpactPage.route('**/api/bingx/pnl-sources**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, month: fixtureMonth, sources: {}, positions: { vst: [], live: [] } })
    });
  });
  await outcomeImpactPage.route('**/api/replica-audit**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(outcomeImpactFixture)
    });
  });

  await outcomeImpactPage.goto(`${baseUrl}/?outcome-impact-check=${Date.now()}#sheet-vst-alignment`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await outcomeImpactPage.waitForFunction(() => (
    document.querySelectorAll('.replica-impact-table:not(.symbol) tbody tr').length === 3
      && document.querySelectorAll('.replica-impact-table.symbol tbody tr').length === 4
      && document.querySelectorAll('.replica-audit-table tbody tr').length === 6
  ), null, { timeout: 20_000 });

  const outcomeImpactState = await outcomeImpactPage.evaluate(() => {
    const categoryRows = [...document.querySelectorAll('.replica-impact-table:not(.symbol) tbody tr')];
    const symbolRows = [...document.querySelectorAll('.replica-impact-table.symbol tbody tr')];
    const wraps = [...document.querySelectorAll('.replica-impact-table-wrap')];
    wraps[0]?.scrollTo({ left: wraps[0].scrollWidth, behavior: 'instant' });
    return {
      total: document.querySelector('.replica-outcome-impact-total strong')?.textContent || '',
      categories: categoryRows.map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
      symbols: symbolRows.map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
      horizontalRange: wraps[0] ? wraps[0].scrollWidth - wraps[0].clientWidth : 0,
      horizontalPosition: wraps[0]?.scrollLeft || 0
    };
  });
  if (!outcomeImpactState.total.includes('-39')
    || !outcomeImpactState.categories.some((row) => row.includes('Signo distinto antes de costes') && row.includes('2'))
    || !outcomeImpactState.categories.some((row) => row.includes('Ganancia absorbida por costes') && row.includes('1'))
    || !outcomeImpactState.categories.some((row) => row.includes('Mismo signo neto') && row.includes('3'))
    || !outcomeImpactState.symbols.some((row) => row.includes('SOL-USDT') && row.includes('-15'))
    || outcomeImpactState.horizontalRange <= 0
    || outcomeImpactState.horizontalPosition <= 0) {
    throw new Error(`El impacto económico no se representó correctamente: ${JSON.stringify(outcomeImpactState)}.`);
  }

  await outcomeImpactPage.click('.replica-outcome-impact [data-replica-filter="market_mismatch"]');
  await outcomeImpactPage.waitForFunction(() => (
    document.querySelectorAll('.replica-audit-table tbody tr').length === 2
      && document.querySelector('.replica-box-title span')?.textContent.includes('2 filtradas de 6')
  ));
  const marketOutcomeSymbols = await outcomeImpactPage.locator('.replica-audit-table tbody tr td:nth-child(2) strong').allTextContents();
  if (marketOutcomeSymbols.join(',') !== 'SOL-USDT,SUI-USDT') {
    throw new Error(`El filtro causal devolvió activos incorrectos: ${marketOutcomeSymbols.join(', ')}.`);
  }

  await outcomeImpactPage.click('.replica-outcome-impact [data-replica-filter="symbol:SOL-USDT"]');
  await outcomeImpactPage.waitForFunction(() => (
    document.querySelectorAll('.replica-audit-table tbody tr').length === 2
      && document.querySelector('.replica-box-title span')?.textContent.includes('2 filtradas de 6')
      && document.querySelector('.replica-impact-filter.active')?.textContent.includes('SOL-USDT')
  ));
  const solOutcomeSymbols = await outcomeImpactPage.locator('.replica-audit-table tbody tr td:nth-child(2) strong').allTextContents();
  if (solOutcomeSymbols.some((symbol) => symbol !== 'SOL-USDT')) {
    throw new Error(`El filtro de activo mezcló operaciones: ${solOutcomeSymbols.join(', ')}.`);
  }

  await outcomeImpactPage.click('[data-replica-filter="all"]');
  await outcomeImpactPage.waitForFunction(() => (
    document.querySelectorAll('.replica-audit-table tbody tr').length === 6
      && document.querySelector('.replica-outcome-filter.active')?.dataset.replicaFilter === 'all'
  ));
  if (outcomeImpactErrors.length) {
    throw new Error(`Errores JavaScript en el impacto económico: ${outcomeImpactErrors.join(' | ')}`);
  }

  const manualRefreshPage = await browser.newPage();
  const manualRefreshErrors = [];
  const manualRefreshRequests = {
    historical: [],
    sources: [],
    audit: [],
    pnl: []
  };
  manualRefreshPage.on('pageerror', (error) => manualRefreshErrors.push(error.message));
  await manualRefreshPage.route('**/api/bingx', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        bingx: {
          enabled: false,
          mode: 'demo',
          apiKeyConfigured: true,
          apiSecretConfigured: true
        },
        trades: [],
        paperTrades: [],
        exchangePositions: [],
        exchangeSafety: {},
        risk: {}
      })
    });
  });
  await manualRefreshPage.route('**/api/historical-pnl?**', async (route) => {
    manualRefreshRequests.historical.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ historical: { source: {}, months: [], positions: [] } })
    });
  });
  await manualRefreshPage.route('**/api/bingx/pnl-sources**', async (route) => {
    manualRefreshRequests.sources.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, month: fixtureMonth, sources: {}, positions: { vst: [], live: [] } })
    });
  });
  await manualRefreshPage.route('**/api/replica-audit**', async (route) => {
    manualRefreshRequests.audit.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, audit: { month: fixtureMonth, summary: {}, rows: [] } })
    });
  });
  await manualRefreshPage.route('**/api/bingx/pnl?**', async (route) => {
    manualRefreshRequests.pnl.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, pnl: { months: [], paper: { positions: [] } } })
    });
  });

  await manualRefreshPage.goto(`${baseUrl}/?manual-pnl-refresh-check=${Date.now()}#external-sheet-panel`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await manualRefreshPage.waitForFunction(() => {
    const button = document.querySelector('#refresh-pnl');
    return button && !button.disabled;
  }, null, { timeout: 20_000 });

  Object.values(manualRefreshRequests).forEach((requests) => requests.splice(0));
  await manualRefreshPage.locator('#refresh-pnl').click();
  await manualRefreshPage.waitForFunction(() => {
    const button = document.querySelector('#refresh-pnl');
    return button && !button.disabled;
  }, null, { timeout: 20_000 });

  const missingForcedRefresh = Object.entries(manualRefreshRequests)
    .filter(([, requests]) => !requests.some((url) => new URL(url).searchParams.get('refresh') === '1'))
    .map(([key]) => key);
  if (missingForcedRefresh.length) {
    throw new Error(`El boton Actualizar no forzo estas fuentes: ${missingForcedRefresh.join(', ')}.`);
  }
  if (manualRefreshErrors.length) {
    throw new Error(`Errores JavaScript en el refresco manual: ${manualRefreshErrors.join(' | ')}`);
  }

  console.log(JSON.stringify({
    ok: true,
    injectedFailures,
    runtime: partial.runtime,
    statusDuringFailure: partial.status,
    recovered: true,
    realtimeInjectedFailures,
    realtimeRecovered: true,
    timeoutInjectedFailures,
    timeoutRecovered: true,
    historicalFailures,
    pnlIsolationPassed: true,
    externalSheetNativePassed: true,
    externalSheetOpenRowsPassed: true,
    externalSheetPendingPnlPassed: true,
    externalSheetNavigationPassed: true,
    outcomeImpactPanelPassed: true,
    manualPnlRefreshPassed: true
  }));
} finally {
  await browser?.close().catch(() => {});
}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function localMonthKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function economicImpactAuditFixture(month) {
  const closedAt = `${month}-15T12:00:00.000Z`;
  const definitions = [
    { symbol: 'SOL-USDT', category: 'market_driven_mismatch', replicaPnl: 10, grossPnl: -2, fees: -1, funding: 0, netPnl: -3 },
    { symbol: 'SOL-USDT', category: 'same_net_sign', replicaPnl: 8, grossPnl: 7, fees: -1, funding: 0, netPnl: 6 },
    { symbol: 'ETH-USDT', category: 'cost_driven_mismatch', replicaPnl: 5, grossPnl: 1, fees: -2, funding: 0, netPnl: -1 },
    { symbol: 'ETH-USDT', category: 'same_net_sign', replicaPnl: 12, grossPnl: 10, fees: -1, funding: 0, netPnl: 9 },
    { symbol: 'BTC-USDT', category: 'same_net_sign', replicaPnl: 10, grossPnl: 9, fees: -0.5, funding: -0.5, netPnl: 8 },
    { symbol: 'SUI-USDT', category: 'market_driven_mismatch', replicaPnl: 10, grossPnl: -2, fees: -1, funding: 0, netPnl: -3 }
  ];
  const labels = {
    market_driven_mismatch: 'Signo distinto antes de costes',
    cost_driven_mismatch: 'Ganancia absorbida por costes',
    same_net_sign: 'Mismo signo neto'
  };
  const rows = definitions.map((definition, index) => {
    const marketMismatch = definition.category === 'market_driven_mismatch';
    const costMismatch = definition.category === 'cost_driven_mismatch';
    const sameNetSign = definition.category === 'same_net_sign';
    return {
      id: `impact-${index + 1}`,
      sequence: index + 1,
      orderNumber: index + 1,
      symbol: definition.symbol,
      direction: 'LONG',
      severity: sameNetSign ? 'positive' : 'negative',
      cause: labels[definition.category],
      detail: 'Muestra sintética de validación visual.',
      sheet: { pnl: definition.replicaPnl * 10, entry: 100, exit: 101 },
      replica: { pnl: definition.replicaPnl, notional: 45 },
      vst: {
        openingAt: closedAt,
        closingAt: closedAt,
        entry: 100,
        exit: 101,
        signalEntry: 100,
        signalClose: 101,
        entryPriceSource: 'exchange_fill',
        closePriceSource: 'exchange_order_history',
        grossPnl: definition.grossPnl,
        fees: definition.fees + definition.funding,
        funding: definition.funding,
        netPnl: definition.netPnl
      },
      diff: { net: definition.netPnl - definition.replicaPnl, entryPercent: 0, closePercent: 0 },
      outcome: {
        comparable: true,
        key: definition.category,
        label: labels[definition.category],
        sameNetSign,
        netMismatch: !sameNetSign,
        grossMeasured: true,
        grossMismatch: marketMismatch,
        marketDrivenNetMismatch: marketMismatch,
        costDrivenNetMismatch: costMismatch,
        otherNetMismatch: false,
        grossMismatchRecoveredByCosts: false
      }
    };
  });

  return {
    ok: true,
    audit: {
      month,
      summary: {
        sheetRows: 6,
        vstOpenings: 6,
        vstCloses: 6,
        sheetPnl: 550,
        replicaPnl: 55,
        defaultNotionalVST: 45,
        bingxGross: 23,
        bingxFees: -6.5,
        bingxFunding: -0.5,
        bingxNet: 16,
        netGap: -39,
        issueCounts: {
          'Signo distinto de mercado': 2,
          'Ganancia absorbida por costes': 1,
          Alineada: 3
        },
        pairedOutcomeAnalysis: {
          rows: 6,
          sheetWins: 6,
          vstWins: 3,
          sheetWinRate: 100,
          vstWinRate: 50,
          winRateGapPoints: -50,
          sameNetSign: 3,
          netSignMismatch: 3,
          sheetWinVstLoss: 3,
          sheetLossVstWin: 0,
          marketDrivenNetMismatch: 2,
          costDrivenNetMismatch: 1,
          otherNetMismatch: 0,
          grossMismatchRecoveredByCosts: 0
        },
        pairedOutcomeImpact: {
          rows: 6,
          replicaPnl: 55,
          bingxGross: 23,
          fees: -6.5,
          funding: -0.5,
          costs: -7,
          bingxNet: 16,
          gapVsReplica: -39,
          residual: 0,
          reconciled: true,
          groups: [
            { key: 'market_driven_mismatch', label: labels.market_driven_mismatch, rows: 2, netMismatch: 2, replicaPnl: 20, bingxGross: -4, costs: -2, bingxNet: -6, gapVsReplica: -26 },
            { key: 'cost_driven_mismatch', label: labels.cost_driven_mismatch, rows: 1, netMismatch: 1, replicaPnl: 5, bingxGross: 1, costs: -2, bingxNet: -1, gapVsReplica: -6 },
            { key: 'same_net_sign', label: labels.same_net_sign, rows: 3, sameNetSign: 3, netMismatch: 0, replicaPnl: 30, bingxGross: 26, costs: -3, bingxNet: 23, gapVsReplica: -7 }
          ],
          bySymbol: [
            { key: 'SOL-USDT', label: 'SOL-USDT', rows: 2, netMismatch: 1, marketDrivenNetMismatch: 1, costDrivenNetMismatch: 0, gapVsReplica: -15 },
            { key: 'SUI-USDT', label: 'SUI-USDT', rows: 1, netMismatch: 1, marketDrivenNetMismatch: 1, costDrivenNetMismatch: 0, gapVsReplica: -13 },
            { key: 'ETH-USDT', label: 'ETH-USDT', rows: 2, netMismatch: 1, marketDrivenNetMismatch: 0, costDrivenNetMismatch: 1, gapVsReplica: -9 },
            { key: 'BTC-USDT', label: 'BTC-USDT', rows: 1, netMismatch: 0, marketDrivenNetMismatch: 0, costDrivenNetMismatch: 0, gapVsReplica: -2 }
          ]
        },
        signAnalysis: { marketMismatch: 2, costFlip: 1, netMismatch: 3, pairedRows: 6 },
        fillQuality: {},
        missingReasonCounts: {},
        stopAnalysis: { total: 0, aligned: 0, divergent: 0 },
        referenceCoverage: {
          latestSheetAt: closedAt,
          stale: false,
          provisionalLatestDay: false,
          outsideCoverageRows: 0
        }
      },
      source: { orderHistory: { available: true, records: 6 } },
      rows
    }
  };
}
