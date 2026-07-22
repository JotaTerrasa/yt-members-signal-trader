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
    pnlIsolationPassed: true
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
