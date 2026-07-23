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

  await page.focus('#posts-tab');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => (
    document.activeElement?.id === 'logs-tab'
      && document.querySelector('#logs-tab')?.getAttribute('aria-selected') === 'true'
      && !document.querySelector('#logs-view')?.classList.contains('hidden')
  ), null, { timeout: 5_000 });
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.activeElement?.id === 'posts-tab', null, { timeout: 5_000 });
  await page.keyboard.press('End');
  await page.waitForFunction(() => (
    document.activeElement?.id === 'pnl-tab'
      && document.querySelector('#pnl-tab')?.getAttribute('aria-selected') === 'true'
      && !document.querySelector('#pnl-view')?.classList.contains('hidden')
  ), null, { timeout: 5_000 });
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.activeElement?.id === 'posts-tab', null, { timeout: 5_000 });
  const viewTabSemantics = await page.evaluate(() => ({
    selected: [...document.querySelectorAll('[role="tab"]')]
      .filter((tab) => tab.getAttribute('aria-selected') === 'true')
      .map((tab) => tab.id),
    orientation: document.querySelector('[role="tablist"]')?.getAttribute('aria-orientation') || '',
    panels: ['posts-view', 'logs-view', 'pnl-view'].map((id) => {
      const panel = document.getElementById(id);
      return {
        id,
        role: panel?.getAttribute('role') || '',
        labelledBy: panel?.getAttribute('aria-labelledby') || '',
        tabIndex: panel?.tabIndex
      };
    })
  }));
  if (viewTabSemantics.orientation !== 'horizontal'
    || viewTabSemantics.selected.length !== 1
    || viewTabSemantics.selected[0] !== 'posts-tab'
    || viewTabSemantics.panels.some((panel) => (
      panel.role !== 'tabpanel'
        || panel.labelledBy !== panel.id.replace('-view', '-tab')
        || panel.tabIndex !== 0
    ))) {
    throw new Error(`Las vistas principales no conservan semántica y teclado ARIA: ${JSON.stringify(viewTabSemantics)}.`);
  }

  const logGrouping = await page.evaluate(() => {
    const refreshMessage = 'Telegram Web refrescado automaticamente cada 30 segundos.';
    const groups = groupLogsForDisplay([
      { level: 'info', message: refreshMessage, at: '2026-07-23T10:02:00.000Z' },
      { level: 'info', message: refreshMessage, at: '2026-07-23T10:01:30.000Z' },
      { level: 'info', message: refreshMessage, at: '2026-07-23T10:01:00.000Z' },
      { level: 'error', message: 'Orden rechazada', at: '2026-07-23T10:00:30.000Z' },
      { level: 'error', message: 'Orden rechazada', at: '2026-07-23T10:00:20.000Z' },
      { level: 'info', message: refreshMessage, at: '2026-07-23T10:00:00.000Z' },
      { level: 'info', message: refreshMessage, at: '2026-07-23T09:59:30.000Z' }
    ]);
    return groups.map((group) => ({
      level: group.level,
      message: group.message,
      count: group.groupCount,
      earliestAt: group.groupEarliestAt,
      latestAt: group.groupLatestAt
    }));
  });
  if (logGrouping.length !== 4
    || logGrouping[0]?.count !== 3
    || logGrouping[0]?.earliestAt !== '2026-07-23T10:01:00.000Z'
    || logGrouping[0]?.latestAt !== '2026-07-23T10:02:00.000Z'
    || logGrouping[1]?.count !== 1
    || logGrouping[2]?.count !== 1
    || logGrouping[3]?.count !== 2) {
    throw new Error(`La agrupación visual de eventos ocultó o mezcló incidencias: ${JSON.stringify(logGrouping)}.`);
  }

  const incidentLifecycleState = await page.evaluate(() => {
    const healthy = {
      health: { level: 'ok', running: true, phase: 'live', stale: false, noVisiblePosts: false, visiblePosts: 10 },
      exchangeSafety: { level: 'ok', stale: false },
      pnlBackoff: { active: false }
    };
    const degraded = {
      health: { level: 'warn', running: true, phase: 'live', stale: true, noVisiblePosts: true, visiblePosts: 0 },
      exchangeSafety: { level: 'warn', stale: true },
      pnlBackoff: { active: true }
    };
    const recovered = incidentLifecycle({ type: 'bingx_sync', level: 'warn' }, healthy);
    const active = incidentLifecycle({ type: 'bingx_sync', level: 'warn' }, degraded);
    const sheetRecovered = incidentLifecycle({ type: 'youtube_empty', level: 'warn' }, healthy);
    const rateLimitActive = incidentLifecycle({ type: 'bingx_pnl_rate_limit', level: 'warn' }, degraded);
    const info = incidentLifecycle({ type: 'backup', level: 'info' }, healthy);
    return {
      recovered,
      active,
      sheetRecovered,
      rateLimitActive,
      info,
      recoveredMarkup: renderIncidentItem({
        at: '2026-07-23T00:11:02.024Z',
        type: 'bingx_sync',
        title: 'Reconciliación BingX',
        message: 'BingX sync: timestamp is invalid',
        level: 'warn',
        lifecycle: recovered
      })
    };
  });
  if (incidentLifecycleState.recovered.key !== 'recovered'
    || incidentLifecycleState.active.key !== 'active'
    || incidentLifecycleState.sheetRecovered.key !== 'recovered'
    || incidentLifecycleState.rateLimitActive.key !== 'active'
    || incidentLifecycleState.info.key !== 'info'
    || !incidentLifecycleState.recoveredMarkup.includes('Recuperada')
    || !incidentLifecycleState.recoveredMarkup.includes('incident-item warn recovered')) {
    throw new Error(`La UI no distingue incidencias activas, recuperadas e informativas: ${JSON.stringify(incidentLifecycleState)}.`);
  }

  const exchangeSafetyPanels = await page.evaluate(() => {
    const previousSafety = appState.exchangeSafety;
    appState.exchangeSafety = {
      level: 'ok',
      mode: 'demo',
      enabled: true,
      ageSeconds: 4,
      stale: false,
      real: {
        asset: 'USDT',
        openPositions: 0,
        protectedStopLoss: 0,
        protectedTakeProfit: 0,
        missingStopLoss: 0,
        missingTakeProfit: 0,
        openOrders: 0,
        orphanOrders: 0
      },
      demo: {
        asset: 'VST',
        balance: {
          asset: 'VST',
          equity: 571.75,
          availableMargin: 526.36,
          usedMargin: 44.7,
          marginUsagePercent: 7.82
        },
        openPositions: 1,
        protectedStopLoss: 1,
        protectedTakeProfit: 0,
        missingStopLoss: 0,
        missingTakeProfit: 1,
        openOrders: 1,
        orphanOrders: 0,
        exposure: 1119.17,
        floatingPnl: 0.73,
        nearestLiquidation: {
          symbol: 'BTC-USDT',
          distancePercent: 3.63
        }
      },
      checks: []
    };
    renderExchangeSafetyPanel();
    const demoPanel = document.querySelector('#demo-safety-panel');
    const realPanel = document.querySelector('#exchange-safety-panel');
    const tpCheck = [...document.querySelectorAll('#demo-safety-checks .exchange-safety-check')]
      .find((item) => item.textContent.includes('TP demo'));
    const liquidationMetric = [...document.querySelectorAll('#demo-safety-metrics > div')]
      .find((item) => item.textContent.includes('Liq. cercana'));
    const result = {
      demoStatus: document.querySelector('#demo-safety-status')?.textContent.trim() || '',
      realStatus: document.querySelector('#exchange-safety-status')?.textContent.trim() || '',
      demoText: demoPanel?.textContent.replace(/\s+/g, ' ').trim() || '',
      realText: realPanel?.textContent.replace(/\s+/g, ' ').trim() || '',
      tpClass: tpCheck?.className || '',
      tpText: tpCheck?.textContent.replace(/\s+/g, ' ').trim() || '',
      liquidationClass: liquidationMetric?.querySelector('strong')?.className || '',
      liquidationText: liquidationMetric?.textContent.replace(/\s+/g, ' ').trim() || '',
      scrollMarginTop: Number.parseFloat(getComputedStyle(demoPanel).scrollMarginTop || '0')
    };
    appState.exchangeSafety = previousSafety;
    renderExchangeSafetyPanel();
    return result;
  });
  if (exchangeSafetyPanels.demoStatus !== 'Demo protegido'
    || exchangeSafetyPanels.realStatus !== 'Real inactivo'
    || !exchangeSafetyPanels.demoText.includes('Equity VST')
    || !exchangeSafetyPanels.demoText.includes('SL demo confirmado')
    || !exchangeSafetyPanels.realText.includes('la cuenta real no se esta operando')
    || !exchangeSafetyPanels.tpClass.includes('pending')
    || !exchangeSafetyPanels.tpText.includes('0/1')
    || !exchangeSafetyPanels.liquidationClass.includes('negative')
    || !exchangeSafetyPanels.liquidationText.includes('BTC-USDT')
    || exchangeSafetyPanels.scrollMarginTop < 80) {
    throw new Error(`Los paneles de seguridad demo/real no reflejan el modo y las protecciones: ${JSON.stringify(exchangeSafetyPanels)}.`);
  }

  const versionPage = await browser.newPage();
  const versionPageErrors = [];
  let frontendVersionTag = 'v1';
  let versionDocumentRequests = 0;
  versionPage.on('pageerror', (error) => versionPageErrors.push(error.message));
  versionPage.on('request', (request) => {
    if (request.resourceType() === 'document') {
      versionDocumentRequests += 1;
    }
  });
  await versionPage.route('**/*?ui-version-check=1', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        etag: `"${frontendVersionTag}"`,
        'last-modified': 'Thu, 23 Jul 2026 00:00:00 GMT',
        'content-length': '0'
      },
      body: ''
    });
  });
  await versionPage.goto(`${baseUrl}/?frontend-version-check=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await versionPage.waitForFunction(() => (
    document.documentElement.dataset.uiVersionStatus === 'current'
  ), null, { timeout: 10_000 });

  frontendVersionTag = 'v2';
  await versionPage.evaluate(() => checkFrontendVersion());
  await versionPage.waitForFunction(() => (
    document.documentElement.dataset.uiVersionStatus === 'outdated'
      && !document.querySelector('#frontend-update')?.classList.contains('hidden')
      && document.querySelector('#frontend-update-action')?.textContent.includes('Actualizar ahora')
  ), null, { timeout: 10_000 });
  await versionPage.setViewportSize({ width: 390, height: 844 });
  const updateBannerGeometry = await versionPage.evaluate(() => {
    const banner = document.querySelector('#frontend-update');
    const button = document.querySelector('#frontend-update-action');
    const rect = banner?.getBoundingClientRect();
    const buttonRect = button?.getBoundingClientRect();
    return {
      position: banner ? getComputedStyle(banner).position : '',
      rect: rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null,
      buttonRect: buttonRect ? { left: buttonRect.left, right: buttonRect.right } : null,
      viewport: { width: innerWidth, height: innerHeight },
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  });
  if (updateBannerGeometry.position !== 'fixed'
    || !updateBannerGeometry.rect
    || updateBannerGeometry.rect.left < 0
    || updateBannerGeometry.rect.right > updateBannerGeometry.viewport.width + 1
    || updateBannerGeometry.rect.top < 0
    || updateBannerGeometry.rect.bottom > updateBannerGeometry.viewport.height + 1
    || updateBannerGeometry.buttonRect?.left < updateBannerGeometry.rect.left
    || updateBannerGeometry.buttonRect?.right > updateBannerGeometry.rect.right
    || updateBannerGeometry.pageOverflow) {
    throw new Error(`El aviso de actualización no cabe en móvil: ${JSON.stringify(updateBannerGeometry)}.`);
  }
  await versionPage.locator('#frontend-update-action').click();
  await versionPage.waitForFunction(() => (
    document.documentElement.dataset.uiVersionStatus === 'current'
      && document.querySelector('#frontend-update')?.classList.contains('hidden')
  ), null, { timeout: 15_000 });
  if (versionDocumentRequests < 2 || versionPageErrors.length) {
    throw new Error(`La actualización del frontend no completó su recarga: ${versionDocumentRequests} documentos · ${versionPageErrors.join(' | ')}`);
  }

  const autoVersionPage = await browser.newPage();
  const autoVersionPageErrors = [];
  let autoFrontendVersionTag = 'v1';
  let autoVersionDocumentRequests = 0;
  autoVersionPage.on('pageerror', (error) => autoVersionPageErrors.push(error.message));
  autoVersionPage.on('request', (request) => {
    if (request.resourceType() === 'document') {
      autoVersionDocumentRequests += 1;
    }
  });
  await autoVersionPage.route('**/*?ui-version-check=1', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        etag: `"${autoFrontendVersionTag}"`,
        'last-modified': 'Thu, 23 Jul 2026 00:00:00 GMT',
        'content-length': '0'
      },
      body: ''
    });
  });
  await autoVersionPage.goto(`${baseUrl}/?frontend-auto-update-check=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await autoVersionPage.waitForFunction(() => (
    document.documentElement.dataset.uiVersionStatus === 'current'
  ), null, { timeout: 10_000 });
  await autoVersionPage.locator('#channel-url').focus();
  autoFrontendVersionTag = 'v2';
  await autoVersionPage.evaluate(() => checkFrontendVersion());
  await autoVersionPage.evaluate(() => {
    window.clearTimeout(frontendUpdateReloadTimer);
    frontendUpdateReloadTimer = null;
    scheduleFrontendUpdateReload(50);
  });
  await autoVersionPage.waitForTimeout(150);
  const editingDeferral = await autoVersionPage.evaluate(() => ({
    documentRequests: performance.getEntriesByType('navigation').length,
    status: document.documentElement.dataset.uiVersionStatus,
    message: document.querySelector('#frontend-update-message')?.textContent || ''
  }));
  if (autoVersionDocumentRequests !== 1
    || editingDeferral.status !== 'outdated'
    || !editingDeferral.message.includes('cuando termines de editar')) {
    throw new Error(`La actualización automática interrumpió una edición activa: ${JSON.stringify({ autoVersionDocumentRequests, editingDeferral })}.`);
  }
  await autoVersionPage.evaluate(() => {
    document.activeElement?.blur();
    window.clearTimeout(frontendUpdateReloadTimer);
    frontendUpdateReloadTimer = null;
    scheduleFrontendUpdateReload(50);
  });
  await autoVersionPage.waitForFunction(() => (
    document.documentElement.dataset.uiVersionStatus === 'current'
      && document.querySelector('#frontend-update')?.classList.contains('hidden')
  ), null, { timeout: 15_000 });
  if (autoVersionDocumentRequests < 2 || autoVersionPageErrors.length) {
    throw new Error(`La actualización automática del frontend no terminó: ${autoVersionDocumentRequests} documentos · ${autoVersionPageErrors.join(' | ')}`);
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
  await pnlIsolationPage.waitForFunction(() => (
    document.querySelectorAll('#reliability-domains .reliability-domain').length === 5
    && document.querySelector('#reliability-reason')?.textContent
  ), null, { timeout: 10_000 });
  const reliabilityDiagnosis = await pnlIsolationPage.evaluate(() => ({
    status: document.querySelector('#reliability-status')?.textContent || '',
    reason: document.querySelector('#reliability-reason')?.textContent || '',
    domains: [...document.querySelectorAll('#reliability-domains .reliability-domain')].map((item) => item.textContent.replace(/\s+/g, ' ').trim())
  }));
  if (reliabilityDiagnosis.status === 'Bloqueada por fiabilidad'
    || (!reliabilityDiagnosis.reason.includes('Pendiente:') && !reliabilityDiagnosis.reason.includes('verificadas'))
    || !reliabilityDiagnosis.domains.some((item) => item.startsWith('Rentabilidad'))) {
    throw new Error(`El diagnóstico de promoción sigue siendo ambiguo: ${JSON.stringify(reliabilityDiagnosis)}.`);
  }
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
      body: JSON.stringify(nativeSheetFixturePayload(fixtureMonth, fixtureAt, fixtureOpenAt))
    });
  });

  await nativeSheetPage.goto(`${baseUrl}/?native-sheet-check=${Date.now()}#external-sheet-panel`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await nativeSheetPage.waitForFunction(() => {
    const panel = document.querySelector('#external-sheet-panel');
    const status = document.querySelector('#external-sheet-status');
    const panelRect = panel?.getBoundingClientRect();
    return panel
      && panel.dataset.sheetState !== 'loading'
      && document.querySelectorAll('#external-sheet-body tr').length === 2
      && status?.textContent.includes('datos hasta')
      && panelRect.top >= 0
      && panelRect.top <= 180
      && panelRect.bottom > 0
      && panelRect.top < document.documentElement.clientHeight;
  }, null, { timeout: 20_000 });
  await nativeSheetPage.waitForTimeout(250);
  const nativeSheetState = await nativeSheetPage.evaluate(() => {
    const panel = document.querySelector('#external-sheet-panel');
    const panelRect = panel?.getBoundingClientRect();
    return {
      iframeCount: document.querySelectorAll('#external-sheet-panel iframe').length,
      rowCount: document.querySelectorAll('#external-sheet-body tr').length,
      status: document.querySelector('#external-sheet-status')?.textContent || '',
      summary: document.querySelector('#external-sheet-summary')?.textContent || '',
      firstRow: document.querySelector('#external-sheet-body tr')?.textContent || '',
      tableVisible: !document.querySelector('#external-sheet-native')?.classList.contains('hidden'),
      panelTop: panelRect?.top ?? null,
      panelBottom: panelRect?.bottom ?? null,
      viewportHeight: document.documentElement.clientHeight
    };
  });
  if (nativeSheetState.iframeCount !== 0
    || nativeSheetState.rowCount !== 2
    || !nativeSheetState.tableVisible
    || nativeSheetState.panelTop == null
    || nativeSheetState.panelTop < 0
    || nativeSheetState.panelTop > 180
    || nativeSheetState.panelBottom <= 0
    || nativeSheetState.panelTop >= nativeSheetState.viewportHeight
    || !nativeSheetState.summary.includes('1 abiertas')
    || !nativeSheetState.firstRow.includes('SL 195')
    || !nativeSheetState.firstRow.includes('ABIERTA')) {
    throw new Error(`La hoja externa no uso la tabla nativa: ${JSON.stringify(nativeSheetState)}.`);
  }
  if (nativeSheetErrors.length) {
    throw new Error(`Errores JavaScript en la hoja nativa: ${nativeSheetErrors.join(' | ')}`);
  }

  const mobileSheetPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileSheetErrors = [];
  const mobileSheetFixture = nativeSheetFixturePayload(fixtureMonth, fixtureAt, fixtureOpenAt);
  mobileSheetFixture.historical.positions = Array.from({ length: 45 }, (_, index) => ({
    ...mobileSheetFixture.historical.positions[0],
    id: `sheet-mobile-${index + 1}`,
    orderNumber: index + 1,
    symbol: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'][index % 3],
    openedAt: new Date(fixtureAt.getTime() + (index * 60_000)).toISOString(),
    closedAt: new Date(fixtureAt.getTime() + (index * 60_000)).toISOString(),
    entryPrice: 100 + index,
    closePrice: 101 + index,
    realizedPnl: index % 4 === 0 ? -5 : 15,
    outcome: index % 4 === 0 ? 'PERDIDA' : 'GANADA'
  }));
  mobileSheetFixture.historical.months[0] = {
    ...mobileSheetFixture.historical.months[0],
    total: 435,
    realized: 435,
    closedTrades: 45,
    openPaperTrades: 0
  };
  mobileSheetPage.on('pageerror', (error) => mobileSheetErrors.push(error.message));
  await mobileSheetPage.route('**/api/historical-pnl?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(mobileSheetFixture)
    });
  });
  await mobileSheetPage.goto(`${baseUrl}/?mobile-sheet-check=${Date.now()}#external-sheet-panel`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  await mobileSheetPage.waitForFunction(() => (
    document.querySelector('#external-sheet-panel')?.dataset.sheetState !== 'loading'
      && document.querySelectorAll('#external-sheet-body tr').length === 40
      && document.querySelectorAll('#reliability-domains .reliability-domain').length === 5
  ), null, { timeout: 20_000 });
  await mobileSheetPage.click('[data-external-sheet-scroll="right"]');
  await mobileSheetPage.click('[data-external-sheet-scroll="down"]');
  await mobileSheetPage.waitForFunction(() => {
    const wrap = document.querySelector('.external-sheet-table-wrap');
    return wrap && wrap.scrollLeft > 0 && wrap.scrollTop > 0;
  }, null, { timeout: 5_000 });
  const mobileSheetState = await mobileSheetPage.evaluate(() => {
    const panel = document.querySelector('#external-sheet-panel');
    const wrap = document.querySelector('.external-sheet-table-wrap');
    const domainGrid = document.querySelector('#reliability-domains');
    const demoSafetyPanel = document.querySelector('#demo-safety-panel');
    const demoSafetyMetrics = document.querySelector('#demo-safety-metrics');
    const skipLink = document.querySelector('.skip-link');
    const panelRect = panel?.getBoundingClientRect();
    const demoSafetyRect = demoSafetyPanel?.getBoundingClientRect();
    const skipLinkRect = skipLink?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      viewportWidth,
      pageOverflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth,
      panelLeft: panelRect?.left ?? null,
      panelRight: panelRect?.right ?? null,
      demoSafetyLeft: demoSafetyRect?.left ?? null,
      demoSafetyRight: demoSafetyRect?.right ?? null,
      demoMetricColumns: demoSafetyMetrics
        ? getComputedStyle(demoSafetyMetrics).gridTemplateColumns.split(' ').filter(Boolean).length
        : 0,
      clippedDemoMetrics: demoSafetyMetrics
        ? [...demoSafetyMetrics.children].filter((item) => item.scrollWidth > item.clientWidth + 1).length
        : -1,
      rowCount: document.querySelectorAll('#external-sheet-body tr').length,
      tableClientWidth: wrap?.clientWidth ?? 0,
      tableScrollWidth: wrap?.scrollWidth ?? 0,
      tableClientHeight: wrap?.clientHeight ?? 0,
      tableScrollHeight: wrap?.scrollHeight ?? 0,
      tableScrollLeft: wrap?.scrollLeft ?? 0,
      tableScrollTop: wrap?.scrollTop ?? 0,
      tableOverflowX: wrap ? getComputedStyle(wrap).overflowX : '',
      tableOverflowY: wrap ? getComputedStyle(wrap).overflowY : '',
      domainCount: domainGrid?.children.length ?? 0,
      domainColumns: domainGrid ? getComputedStyle(domainGrid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      clippedDomains: domainGrid
        ? [...domainGrid.children].filter((item) => item.scrollWidth > item.clientWidth + 1).length
        : -1,
      skipLinkVisible: Boolean(skipLinkRect && skipLinkRect.bottom > 0 && skipLinkRect.top < innerHeight),
      netEntryAuditText: document.querySelector('#net-entry-filter-audit')?.textContent || ''
    };
  });
  if (mobileSheetState.viewportWidth !== 390
    || mobileSheetState.pageOverflowX > 1
    || mobileSheetState.panelLeft == null
    || mobileSheetState.panelLeft < 0
    || mobileSheetState.panelRight > mobileSheetState.viewportWidth + 1
    || mobileSheetState.demoSafetyLeft == null
    || mobileSheetState.demoSafetyLeft < 0
    || mobileSheetState.demoSafetyRight > mobileSheetState.viewportWidth + 1
    || mobileSheetState.demoMetricColumns !== 2
    || mobileSheetState.clippedDemoMetrics !== 0
    || mobileSheetState.rowCount !== 40
    || mobileSheetState.tableScrollWidth <= mobileSheetState.tableClientWidth
    || mobileSheetState.tableScrollHeight <= mobileSheetState.tableClientHeight
    || mobileSheetState.tableScrollLeft <= 0
    || mobileSheetState.tableScrollTop <= 0
    || mobileSheetState.tableOverflowX !== 'auto'
    || mobileSheetState.tableOverflowY !== 'auto'
    || mobileSheetState.domainCount !== 5
    || mobileSheetState.domainColumns !== 1
    || mobileSheetState.clippedDomains !== 0
    || mobileSheetState.skipLinkVisible
    || !mobileSheetState.netEntryAuditText.includes('PnL de las entradas marcadas')) {
    throw new Error(`La vista móvil no conserva scroll y lectura completa: ${JSON.stringify(mobileSheetState)}.`);
  }
  if (mobileSheetErrors.length) {
    throw new Error(`Errores JavaScript en la vista móvil: ${mobileSheetErrors.join(' | ')}`);
  }

  await mobileSheetPage.setViewportSize({ width: 768, height: 1024 });
  await mobileSheetPage.waitForTimeout(100);
  const tabletSheetState = await mobileSheetPage.evaluate(() => {
    const panel = document.querySelector('#external-sheet-panel');
    const wrap = document.querySelector('.external-sheet-table-wrap');
    const domainGrid = document.querySelector('#reliability-domains');
    const panelRect = panel?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      viewportWidth,
      pageOverflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth,
      panelLeft: panelRect?.left ?? null,
      panelRight: panelRect?.right ?? null,
      tableClientWidth: wrap?.clientWidth ?? 0,
      tableScrollWidth: wrap?.scrollWidth ?? 0,
      tableClientHeight: wrap?.clientHeight ?? 0,
      tableScrollHeight: wrap?.scrollHeight ?? 0,
      tableOverflowX: wrap ? getComputedStyle(wrap).overflowX : '',
      tableOverflowY: wrap ? getComputedStyle(wrap).overflowY : '',
      domainCount: domainGrid?.children.length ?? 0,
      domainColumns: domainGrid ? getComputedStyle(domainGrid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      clippedDomains: domainGrid
        ? [...domainGrid.children].filter((item) => item.scrollWidth > item.clientWidth + 1).length
        : -1
    };
  });
  if (tabletSheetState.viewportWidth !== 768
    || tabletSheetState.pageOverflowX > 1
    || tabletSheetState.panelLeft == null
    || tabletSheetState.panelLeft < 0
    || tabletSheetState.panelRight > tabletSheetState.viewportWidth + 1
    || tabletSheetState.tableScrollWidth <= tabletSheetState.tableClientWidth
    || tabletSheetState.tableScrollHeight <= tabletSheetState.tableClientHeight
    || tabletSheetState.tableOverflowX !== 'auto'
    || tabletSheetState.tableOverflowY !== 'auto'
    || tabletSheetState.domainCount !== 5
    || tabletSheetState.domainColumns !== 3
    || tabletSheetState.clippedDomains !== 0) {
    throw new Error(`La vista de tableta no conserva scroll y lectura completa: ${JSON.stringify(tabletSheetState)}.`);
  }

  await nativeSheetPage.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await nativeSheetPage.waitForFunction(() => window.scrollY <= 5, null, { timeout: 5_000 });
  await nativeSheetPage.evaluate(() => {
    document.querySelector('#pnl-tab')?.click();
  });
  await nativeSheetPage.waitForTimeout(250);
  const releasedAnchorScroll = await nativeSheetPage.evaluate(() => window.scrollY);
  if (releasedAnchorScroll > 5) {
    throw new Error(`El ancla de la hoja recupero el scroll tras un render posterior: ${releasedAnchorScroll}px.`);
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
    || !outcomeImpactState.categories.some((row) => row.includes('Signo distinto antes de costes') && row.includes('-24') && row.includes('7,7%'))
    || !outcomeImpactState.categories.some((row) => row.includes('Ganancia absorbida por costes') && row.includes('1'))
    || !outcomeImpactState.categories.some((row) => row.includes('Mismo signo neto') && row.includes('3'))
    || !outcomeImpactState.symbols.some((row) => row.includes('SOL-USDT') && row.includes('-13') && row.includes('13,3%') && row.includes('-15'))
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
    frontendVersionUpdatePassed: true,
    frontendAutoReloadPassed: true,
    viewTabsKeyboardPassed: true,
    logGroupingPassed: true,
    incidentLifecyclePassed: true,
    exchangeSafetyPanelsPassed: true,
    historicalFailures,
    pnlIsolationPassed: true,
    externalSheetNativePassed: true,
    externalSheetAnchorPassed: true,
    externalSheetOpenRowsPassed: true,
    externalSheetPendingPnlPassed: true,
    externalSheetNavigationPassed: true,
    mobileSheetResponsivePassed: true,
    mobileReliabilityResponsivePassed: true,
    tabletSheetResponsivePassed: true,
    tabletReliabilityResponsivePassed: true,
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

function nativeSheetFixturePayload(fixtureMonth, fixtureAt, fixtureOpenAt) {
  return {
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
  };
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
          grossGapVsReplica: -32,
          fees: -6.5,
          funding: -0.5,
          costs: -7,
          costShareOfGapPercent: 17.94871795,
          bingxNet: 16,
          gapVsReplica: -39,
          residual: 0,
          reconciled: true,
          groups: [
            { key: 'market_driven_mismatch', label: labels.market_driven_mismatch, rows: 2, netMismatch: 2, replicaPnl: 20, bingxGross: -4, grossGapVsReplica: -24, costs: -2, costShareOfGapPercent: 7.69230769, bingxNet: -6, gapVsReplica: -26 },
            { key: 'cost_driven_mismatch', label: labels.cost_driven_mismatch, rows: 1, netMismatch: 1, replicaPnl: 5, bingxGross: 1, grossGapVsReplica: -4, costs: -2, costShareOfGapPercent: 33.33333333, bingxNet: -1, gapVsReplica: -6 },
            { key: 'same_net_sign', label: labels.same_net_sign, rows: 3, sameNetSign: 3, netMismatch: 0, replicaPnl: 30, bingxGross: 26, grossGapVsReplica: -4, costs: -3, costShareOfGapPercent: 42.85714286, bingxNet: 23, gapVsReplica: -7 }
          ],
          bySymbol: [
            { key: 'SOL-USDT', label: 'SOL-USDT', rows: 2, netMismatch: 1, marketDrivenNetMismatch: 1, costDrivenNetMismatch: 0, grossGapVsReplica: -13, costs: -2, costShareOfGapPercent: 13.33333333, gapVsReplica: -15 },
            { key: 'SUI-USDT', label: 'SUI-USDT', rows: 1, netMismatch: 1, marketDrivenNetMismatch: 1, costDrivenNetMismatch: 0, grossGapVsReplica: -12, costs: -1, costShareOfGapPercent: 7.69230769, gapVsReplica: -13 },
            { key: 'ETH-USDT', label: 'ETH-USDT', rows: 2, netMismatch: 1, marketDrivenNetMismatch: 0, costDrivenNetMismatch: 1, grossGapVsReplica: -6, costs: -3, costShareOfGapPercent: 33.33333333, gapVsReplica: -9 },
            { key: 'BTC-USDT', label: 'BTC-USDT', rows: 1, netMismatch: 0, marketDrivenNetMismatch: 0, costDrivenNetMismatch: 0, grossGapVsReplica: -1, costs: -1, costShareOfGapPercent: 50, gapVsReplica: -2 }
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
