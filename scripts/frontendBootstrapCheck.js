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

  await page.keyboard.press('Tab');
  await page.waitForFunction(() => document.activeElement?.classList.contains('skip-link'), null, { timeout: 3_000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (
    window.location.hash === '#workspace'
      && document.activeElement?.id === 'workspace'
      && document.querySelector('#workspace')?.getBoundingClientRect().top >= 80
  ), null, { timeout: 3_000 });

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

  const searchAccessibleName = await page.locator('#search').getAttribute('aria-label');
  if (searchAccessibleName !== 'Filtrar publicaciones') {
    throw new Error(`El buscador de publicaciones no tiene un nombre accesible: ${searchAccessibleName || 'vacío'}.`);
  }

  const semanticSpanishCopy = await page.evaluate(() => {
    const headings = [...document.querySelectorAll('h1, #pnl-view h2, #pnl-view h3, #pnl-view h4')]
      .map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent.replace(/\s+/g, ' ').trim()
      }));
    const required = [
      'Futures Magician',
      'Operativa',
      'Estudio estratégico',
      'Línea de vida real',
      'Simulación',
      'Evolución mensual'
    ];
    const forbidden = [
      'Estudio estrategico',
      'Linea de vida real',
      'Simulacion',
      'Evolucion mensual'
    ];
    return {
      toolPanelLabel: document.querySelector('#tool-panel')?.getAttribute('aria-label') || '',
      channelLabel: document.querySelector('label[for="channel-url"]')?.textContent.trim() || '',
      postsTab: document.querySelector('#posts-tab')?.textContent.replace(/\s+/g, ' ').trim() || '',
      maxScrollsLabel: document.querySelector('label[for="max-scrolls"]')?.textContent.replace(/\s+/g, ' ').trim() || '',
      bingxPanelLabel: document.querySelector('details[aria-label="Operativa BingX"]')?.getAttribute('aria-label') || '',
      bingxModeOptions: [...document.querySelectorAll('#bingx-mode option')].map((option) => option.textContent.trim()),
      marginOptions: [...document.querySelectorAll('#bingx-margin option')].map((option) => option.textContent.trim()),
      apiKeyLabel: document.querySelector('label[for="bingx-api-key"]')?.textContent.trim() || '',
      maxLeverageLabel: document.querySelector('label[for="bingx-max-signal-leverage"]')?.textContent.replace(/\s+/g, ' ').trim() || '',
      breakEvenLabel: document.querySelector('label[for="bingx-cost-guard-max-margin"]')?.textContent.replace(/\s+/g, ' ').trim() || '',
      dryRunLabel: document.querySelector('#bingx-dry-run-required')?.closest('label')?.textContent.replace(/\s+/g, ' ').trim() || '',
      headings,
      missingRequired: required.filter((text) => !headings.some((heading) => heading.text === text)),
      forbiddenPresent: forbidden.filter((text) => headings.some((heading) => heading.text === text)),
      levelJumps: headings.slice(1).filter((heading, index) => heading.level > headings[index].level + 1)
    };
  });
  if (semanticSpanishCopy.toolPanelLabel !== 'Configuración operativa'
    || semanticSpanishCopy.channelLabel !== 'Canal o pestaña de publicaciones'
    || semanticSpanishCopy.postsTab !== 'Publicaciones'
    || semanticSpanishCopy.maxScrollsLabel !== 'Desplazamientos máx.'
    || semanticSpanishCopy.bingxPanelLabel !== 'Operativa BingX'
    || JSON.stringify(semanticSpanishCopy.bingxModeOptions) !== JSON.stringify(['Orden de prueba', 'Demo VST', 'Real USDT', 'Demo VST + Real USDT'])
    || JSON.stringify(semanticSpanishCopy.marginOptions) !== JSON.stringify(['Aislado', 'Cruzado'])
    || semanticSpanishCopy.apiKeyLabel !== 'Clave API'
    || semanticSpanishCopy.maxLeverageLabel !== 'Apalancamiento máx. de la señal'
    || semanticSpanishCopy.breakEvenLabel !== 'Punto de equilibrio máx. sobre margen (%)'
    || semanticSpanishCopy.dryRunLabel !== 'Exigir simulación previa antes de operar en real'
    || semanticSpanishCopy.missingRequired.length
    || semanticSpanishCopy.forbiddenPresent.length
    || semanticSpanishCopy.levelJumps.length) {
    throw new Error(`La estructura semántica o la ortografía principal de la UI retrocedieron: ${JSON.stringify(semanticSpanishCopy)}.`);
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
    const previousState = appState.state;
    const previousTelegramSource = appState.telegramSource;
    const previousTelegramLastVisibleAt = appState.telegramLastVisibleAt;
    const currentTelegramReadAt = new Date().toISOString();
    appState.state = {
      ...(previousState || {}),
      visibleTelegramMessages: 0,
      lastTelegramRunAt: currentTelegramReadAt
    };
    appState.telegramSource = {
      ...(previousTelegramSource || {}),
      refreshSeconds: 30
    };
    trackTelegramVisibility({
      visibleTelegramMessages: 2,
      lastTelegramRunAt: currentTelegramReadAt
    });
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
    const telegramRecovered = incidentLifecycle({
      type: 'telegram_web_empty',
      level: 'warn',
      at: '2026-07-23T10:02:00.000Z'
    }, healthy);
    appState.telegramLastVisibleAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const telegramActive = incidentLifecycle({
      type: 'telegram_web_empty',
      level: 'warn',
      at: new Date().toISOString()
    }, healthy);
    appState.telegramLastVisibleAt = currentTelegramReadAt;
    const rateLimitActive = incidentLifecycle({ type: 'bingx_pnl_rate_limit', level: 'warn' }, degraded);
    const info = incidentLifecycle({ type: 'backup', level: 'info' }, healthy);
    const grouped = groupIncidentViews([
      {
        type: 'telegram_web_empty',
        level: 'warn',
        at: '2026-07-23T10:02:00.000Z',
        title: 'Telegram Web sin mensajes visibles',
        message: 'Primera lectura vacía',
        lifecycle: telegramRecovered
      },
      {
        type: 'telegram_web_empty',
        level: 'warn',
        at: '2026-07-23T10:01:00.000Z',
        title: 'Telegram Web sin mensajes visibles',
        message: 'Segunda lectura vacía',
        lifecycle: telegramRecovered
      },
      {
        type: 'bingx_sync',
        level: 'warn',
        at: '2026-07-23T10:00:00.000Z',
        title: 'Reconciliación BingX',
        message: 'BingX sync: timestamp is invalid',
        lifecycle: recovered
      },
      {
        type: 'error',
        level: 'error',
        at: '2026-07-23T09:59:00.000Z',
        title: 'Error',
        message: 'Fallo A',
        lifecycle: { key: 'active', label: 'Activa' }
      },
      {
        type: 'error',
        level: 'error',
        at: '2026-07-23T09:58:00.000Z',
        title: 'Error',
        message: 'Fallo B',
        lifecycle: { key: 'active', label: 'Activa' }
      }
    ]);
    appState.state = previousState;
    appState.telegramSource = previousTelegramSource;
    appState.telegramLastVisibleAt = previousTelegramLastVisibleAt;
    return {
      recovered,
      active,
      sheetRecovered,
      telegramRecovered,
      telegramActive,
      rateLimitActive,
      info,
      grouped: grouped.map((incident) => ({
        type: incident.type,
        occurrences: incident.occurrences,
        lifecycle: incident.lifecycle
      })),
      recoveredMarkup: renderIncidentItem({
        at: '2026-07-23T00:11:02.024Z',
        type: 'bingx_sync',
        title: 'Reconciliación BingX',
        message: 'BingX sync: timestamp is invalid',
        level: 'warn',
        lifecycle: recovered
      }),
      groupedMarkup: renderIncidentItem(grouped[0])
    };
  });
  if (incidentLifecycleState.recovered.key !== 'recovered'
    || incidentLifecycleState.active.key !== 'active'
    || incidentLifecycleState.sheetRecovered.key !== 'recovered'
    || incidentLifecycleState.telegramRecovered.key !== 'recovered'
    || incidentLifecycleState.telegramActive.key !== 'active'
    || incidentLifecycleState.rateLimitActive.key !== 'active'
    || incidentLifecycleState.info.key !== 'info'
    || incidentLifecycleState.grouped.length !== 4
    || incidentLifecycleState.grouped[0]?.type !== 'telegram_web_empty'
    || incidentLifecycleState.grouped[0]?.occurrences !== 2
    || incidentLifecycleState.grouped[0]?.lifecycle?.key !== 'recovered'
    || incidentLifecycleState.grouped.filter((incident) => incident.type === 'error').length !== 2
    || !incidentLifecycleState.recoveredMarkup.includes('Recuperada')
    || !incidentLifecycleState.recoveredMarkup.includes('incident-item warn recovered')
    || !incidentLifecycleState.groupedMarkup.includes('Recuperada · 2 veces')) {
    throw new Error(`La UI no distingue incidencias activas, recuperadas e informativas: ${JSON.stringify(incidentLifecycleState)}.`);
  }

  const backupContinuityPanel = await page.evaluate(() => {
    const previousStatus = appState.operationalStatus;
    appState.operationalStatus = {
      ...(previousStatus || {}),
      backup: { lastRunAt: new Date().toISOString(), lastError: null },
      secureBackup: {
        available: true,
        stale: false,
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
        restoreDrill: { ok: true, stale: false, checkedAt: new Date().toISOString() },
        profile: { available: true, stale: false, lastSuccessAt: new Date().toISOString() },
        mirror: {
          configured: true,
          ok: true,
          stale: false,
          checkedAt: new Date().toISOString(),
          sameVolume: false,
          resilient: true,
          lastError: null
        },
        keyRecovery: {
          verified: true,
          stale: false,
          checkedAt: new Date().toISOString(),
          sameVolume: false,
          resilient: true,
          lastError: null
        },
        storage: {
          available: true,
          checkedAt: new Date().toISOString(),
          level: 'ok',
          reason: 'ok',
          freeBytes: 50 * (1024 ** 3),
          freePercent: 50,
          backupFiles: 12,
          backupBytes: 2 * (1024 ** 3),
          stalePartialFiles: 0
        }
      }
    };
    renderGuardDashboard();
    const text = document.querySelector('#guard-metrics')?.textContent.replace(/\s+/g, ' ').trim() || '';
    appState.operationalStatus = previousStatus;
    renderGuardDashboard();
    return text;
  });
  if (!backupContinuityPanel.includes('Copia redactada')
    || !backupContinuityPanel.includes('Copia cifrada')
    || !backupContinuityPanel.includes('restaurado')
    || !backupContinuityPanel.includes('Almacén local')
    || !backupContinuityPanel.includes('12 copias')
    || !backupContinuityPanel.includes('Disco libre')
    || !backupContinuityPanel.includes('50 GB')
    || !backupContinuityPanel.includes('Perfil Chromium')
    || !backupContinuityPanel.includes('guardado')
    || !backupContinuityPanel.includes('Réplica externa')
    || !backupContinuityPanel.includes('Clave recuperación')
    || !backupContinuityPanel.includes('verificada')) {
    throw new Error(`El panel no distingue las copias restaurables: ${backupContinuityPanel}.`);
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
    || !exchangeSafetyPanels.realText.includes('la cuenta real no se está operando')
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
    return panel
      && panel.dataset.sheetState !== 'loading'
      && document.querySelectorAll('#external-sheet-body tr').length === 2
      && status?.textContent.includes('datos hasta');
  }, null, { timeout: 20_000 });
  await nativeSheetPage.focus('[data-pnl-section-link="external-sheet-panel"]');
  await nativeSheetPage.keyboard.press('Enter');
  await waitForPnlAnchor(nativeSheetPage, 'external-sheet-panel');
  await nativeSheetPage.waitForTimeout(250);
  const nativeSheetAnchorState = await readPnlAnchorState(nativeSheetPage, 'external-sheet-panel');
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
    || nativeSheetState.panelTop < nativeSheetAnchorState.stickyBottom + 4
    || nativeSheetState.panelTop > nativeSheetAnchorState.stickyBottom + 52
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
  await sheetNavigationPage.focus('[data-pnl-section-link="my-ledger-section"]');
  await sheetNavigationPage.keyboard.press('Enter');
  await waitForPnlAnchor(sheetNavigationPage, 'my-ledger-section');
  await sheetNavigationPage.focus('[data-pnl-section-link="external-sheet-panel"]');
  await sheetNavigationPage.keyboard.press('Enter');
  await waitForPnlAnchor(sheetNavigationPage, 'external-sheet-panel');
  const externalSheetAnchorState = await readPnlAnchorState(sheetNavigationPage, 'external-sheet-panel');
  if (externalSheetAnchorState.activeSection !== 'external-sheet-panel'
    || externalSheetAnchorState.focusedId !== 'external-sheet-panel') {
    throw new Error(`La hoja externa no quedó como destino activo: ${JSON.stringify(externalSheetAnchorState)}.`);
  }
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
  let delayedPlotlyRequests = 0;
  outcomeImpactPage.on('pageerror', (error) => outcomeImpactErrors.push(error.message));
  await outcomeImpactPage.route('**/vendor/plotly.min.js*', async (route) => {
    delayedPlotlyRequests += 1;
    await delay(1200);
    await route.continue();
  });
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
    document.querySelectorAll('.replica-audit-table tbody tr').length === 3
      && document.querySelector('#economic-diagnosis')
      && document.querySelector('[data-economic-diagnosis-scope="cohort"]')?.getAttribute('aria-pressed') === 'true'
  ), null, { timeout: 20_000 });

  const cohortScopeState = await outcomeImpactPage.evaluate(() => {
    const economicDiagnosis = document.querySelector('#economic-diagnosis');
    return {
      economicDiagnosis: economicDiagnosis?.textContent.replace(/\s+/g, ' ').trim() || '',
      economicSegments: document.querySelectorAll('.economic-diagnosis-segment').length,
      activeEconomicScope: document.querySelector('[data-economic-diagnosis-scope][aria-pressed="true"]')
        ?.dataset.economicDiagnosisScope || '',
      rowCount: document.querySelectorAll('.replica-audit-table tbody tr').length,
      rowLabel: document.querySelector('.replica-audit > .replica-box-title span')?.textContent || '',
      metricText: document.querySelector('.replica-audit-grid')?.textContent.replace(/\s+/g, ' ').trim() || '',
      bridgeText: document.querySelector('#replica-gap-bridge')?.textContent.replace(/\s+/g, ' ').trim() || '',
      attributionText: document.querySelector('#replica-matched-gap-panel')?.textContent.replace(/\s+/g, ' ').trim() || '',
      plotlyPending: document.querySelector('#replica-matched-gap-waterfall')?.dataset.plotlyLayoutStable === 'false',
      drilldowns: [...document.querySelectorAll('[data-economic-drilldown]')].map((link) => ({
        key: link.dataset.economicDrilldown,
        href: link.getAttribute('href'),
        targetExists: Boolean(document.querySelector(link.getAttribute('href')))
      }))
    };
  });
  if (cohortScopeState.activeEconomicScope !== 'cohort'
    || cohortScopeState.rowCount !== 3
    || !cohortScopeState.rowLabel.includes('Cohorte vigente · 3 filas')
    || !cohortScopeState.metricText.includes('Réplica teórica 20,00 VST')
    || !cohortScopeState.metricText.includes('BingX neto 5,00 VST')
    || !cohortScopeState.bridgeText.includes('Emparejadas vs hoja -9,00 VST')
    || !cohortScopeState.attributionText.includes('Diferencia de entrada -10,00 VST')
    || !cohortScopeState.attributionText.includes('Diferencia de salida 1,00 VST')
    || !cohortScopeState.plotlyPending
    || !cohortScopeState.economicDiagnosis.includes('Muestra preliminar desde')
    || !cohortScopeState.economicDiagnosis.includes('Réplica teórica 20,00 VST')
    || !cohortScopeState.economicDiagnosis.includes('BingX neto 5,00 VST')
    || !cohortScopeState.economicDiagnosis.includes('Brecha total -15,00 VST')
    || !cohortScopeState.economicDiagnosis.includes('Ejecución emparejada -9,00 VST 60%')
    || !cohortScopeState.economicDiagnosis.includes('Comisiones y financiación -4,00 VST 26,7%')
    || !cohortScopeState.economicDiagnosis.includes('La ejecución de precios es el mayor arrastre')
    || !cohortScopeState.economicDiagnosis.includes('La entrada concentra 100%')
    || !cohortScopeState.economicDiagnosis.includes('Mayor tramo individual: Cotización a ejecución de entrada, -6,00 VST')
    || !cohortScopeState.economicDiagnosis.includes('100% de cierres con ejecución exacta')
    || !cohortScopeState.economicDiagnosis.includes('Sin incidencias históricas en la muestra')
    || !cohortScopeState.economicDiagnosis.includes('no demuestra rentabilidad futura')
    || cohortScopeState.economicSegments !== 3
    || cohortScopeState.drilldowns.length !== 3
    || cohortScopeState.drilldowns.some((link) => !link.targetExists)
    || !cohortScopeState.drilldowns.some((link) => link.key === 'execution' && link.href === '#replica-matched-gap-panel')
    || !cohortScopeState.drilldowns.some((link) => link.key === 'costs' && link.href === '#cost-control-panel')
    || !cohortScopeState.drilldowns.some((link) => link.key === 'coverage' && link.href === '#replica-gap-bridge')) {
    throw new Error(`La cohorte no gobernó toda la auditoría visible: ${JSON.stringify(cohortScopeState)}.`);
  }

  await waitForPnlAnchor(outcomeImpactPage, 'sheet-vst-alignment', { focus: false });
  const sectionNavigationState = await outcomeImpactPage.evaluate(() => {
    const nav = document.querySelector('#pnl-section-nav');
    const links = [...(nav?.querySelectorAll('[data-pnl-section-link]') || [])];
    return {
      position: nav ? getComputedStyle(nav).position : '',
      active: nav?.querySelector('[aria-current="location"]')?.dataset.pnlSectionLink || '',
      links: links.map((link) => ({
        target: link.dataset.pnlSectionLink,
        href: link.getAttribute('href'),
        targetExists: Boolean(document.getElementById(link.dataset.pnlSectionLink)),
        targetTabIndex: document.getElementById(link.dataset.pnlSectionLink)?.tabIndex
      })),
      contentOverflow: getComputedStyle(document.querySelector('.content-panel')).overflow
    };
  });
  if (sectionNavigationState.position !== 'sticky'
    || sectionNavigationState.active !== 'sheet-vst-alignment'
    || sectionNavigationState.links.length !== 8
    || sectionNavigationState.links.some((link) => (
      !link.targetExists
        || link.targetTabIndex !== -1
        || link.href !== `#${link.target}`
    ))
    || sectionNavigationState.contentOverflow !== 'clip') {
    throw new Error(`La navegación de Rendimiento no quedó completa: ${JSON.stringify(sectionNavigationState)}.`);
  }

  const alignmentScrollControls = await outcomeImpactPage.evaluate(() => {
    const expected = {
      up: 'Subir en la auditoría',
      down: 'Bajar en la auditoría',
      left: 'Desplazar auditoría a la izquierda',
      right: 'Desplazar auditoría a la derecha'
    };
    return [...document.querySelectorAll('[data-alignment-scroll]')].map((button) => {
      const direction = button.dataset.alignmentScroll;
      const rect = button.getBoundingClientRect();
      return {
        direction,
        expected: expected[direction],
        label: button.getAttribute('aria-label') || '',
        title: button.getAttribute('title') || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        icons: button.querySelectorAll('svg').length,
        iconHidden: button.querySelector('svg')?.getAttribute('aria-hidden') === 'true'
      };
    });
  });
  if (alignmentScrollControls.length !== 4
    || alignmentScrollControls.some((control) => (
      control.label !== control.expected
        || control.title !== control.expected
        || control.width !== 34
        || control.height !== 34
        || control.icons !== 1
        || !control.iconHidden
    ))) {
    throw new Error(`Los controles de desplazamiento de la auditoría no son estables y accesibles: ${JSON.stringify(alignmentScrollControls)}.`);
  }

  await outcomeImpactPage.focus('[data-pnl-section-link="my-ledger-section"]');
  await outcomeImpactPage.keyboard.press('Enter');
  await waitForPnlAnchor(outcomeImpactPage, 'my-ledger-section');
  const ledgerAnchorState = await readPnlAnchorState(outcomeImpactPage, 'my-ledger-section');
  if (ledgerAnchorState.activeSection !== 'my-ledger-section') {
    throw new Error(`Mi hoja no quedó seleccionada en la navegación: ${JSON.stringify(ledgerAnchorState)}.`);
  }

  await outcomeImpactPage.focus('[data-pnl-section-link="sheet-vst-alignment"]');
  await outcomeImpactPage.keyboard.press('Enter');
  await waitForPnlAnchor(outcomeImpactPage, 'sheet-vst-alignment');

  await outcomeImpactPage.setViewportSize({ width: 1280, height: 900 });
  await outcomeImpactPage.focus('[data-pnl-section-link="sheet-vst-alignment"]');
  await outcomeImpactPage.keyboard.press('Enter');
  await waitForPnlAnchor(outcomeImpactPage, 'sheet-vst-alignment');
  const desktopAnchorState = await readPnlAnchorState(outcomeImpactPage, 'sheet-vst-alignment');
  const desktopToolbar = desktopAnchorState.sticky.find((item) => item.selector === '.content-toolbar');
  const desktopSectionNav = desktopAnchorState.sticky.find((item) => item.selector === '#pnl-section-nav');
  if (desktopToolbar?.position !== 'sticky'
    || desktopToolbar.top < 90
    || desktopSectionNav?.position !== 'sticky'
    || desktopSectionNav.top < desktopToolbar.bottom
    || desktopAnchorState.top < desktopAnchorState.stickyBottom + 4
    || desktopAnchorState.activeSection !== 'sheet-vst-alignment') {
    throw new Error(`Las barras fijas se solapan en escritorio: ${JSON.stringify(desktopAnchorState)}.`);
  }

  await outcomeImpactPage.setViewportSize({ width: 760, height: 900 });
  await outcomeImpactPage.focus('[data-pnl-section-link="sheet-vst-alignment"]');
  await outcomeImpactPage.keyboard.press('Enter');
  await waitForPnlAnchor(outcomeImpactPage, 'sheet-vst-alignment');

  await outcomeImpactPage.focus('[data-economic-drilldown="execution"]');
  await outcomeImpactPage.keyboard.press('Enter');
  await outcomeImpactPage.waitForFunction(() => {
    const top = document.querySelector('#replica-matched-gap-panel')?.getBoundingClientRect().top;
    const chart = document.querySelector('#replica-matched-gap-waterfall');
    return Number.isFinite(top)
      && top >= 80
      && top <= 130
      && chart?.dataset.plotlyLayoutStable === 'true'
      && document.activeElement?.id === 'replica-matched-gap-panel';
  }, null, { timeout: 6_000 });
  const executionDrilldownState = await outcomeImpactPage.evaluate(() => ({
    hash: window.location.hash,
    top: document.querySelector('#replica-matched-gap-panel')?.getBoundingClientRect().top,
    focusedId: document.activeElement?.id || '',
    layoutStable: document.querySelector('#replica-matched-gap-waterfall')?.dataset.plotlyLayoutStable || '',
    text: document.querySelector('#replica-matched-gap-panel')?.textContent.replace(/\s+/g, ' ').trim() || ''
  }));
  if (executionDrilldownState.hash !== '#replica-matched-gap-panel'
    || !Number.isFinite(executionDrilldownState.top)
    || executionDrilldownState.top < 80
    || executionDrilldownState.top > 130
    || executionDrilldownState.focusedId !== 'replica-matched-gap-panel'
    || executionDrilldownState.layoutStable !== 'true'
    || delayedPlotlyRequests !== 1
    || !executionDrilldownState.text.includes('-10,00 VST')) {
    throw new Error(`El acceso a la evidencia de ejecución no quedó alineado: ${JSON.stringify(executionDrilldownState)}.`);
  }

  await outcomeImpactPage.evaluate(() => {
    const target = document.querySelector('#replica-matched-gap-panel');
    target?.replaceWith(target.cloneNode(true));
  });
  await outcomeImpactPage.waitForFunction(() => (
    document.activeElement?.id === 'replica-matched-gap-panel'
      && document.querySelector('#replica-matched-gap-panel')?.getBoundingClientRect().top >= 80
      && document.querySelector('#replica-matched-gap-panel')?.getBoundingClientRect().top <= 130
  ), null, { timeout: 3_000 });
  await outcomeImpactPage.evaluate(() => {
    stopPnlHashLayoutObserver();
    const target = document.querySelector('#replica-matched-gap-panel');
    target?.replaceWith(target.cloneNode(true));
    settlePnlHashAnchor();
  });
  await outcomeImpactPage.waitForFunction(() => (
    document.activeElement?.id === 'replica-matched-gap-panel'
  ), null, { timeout: 3_000 });

  const economicDrilldownTargets = [
    ['costs', 'cost-control-panel', 'Coste operativo'],
    ['coverage', 'replica-gap-bridge', 'Puente contable']
  ];
  for (const [key, targetId, expectedText] of economicDrilldownTargets) {
    await outcomeImpactPage.focus(`[data-economic-drilldown="${key}"]`);
    await outcomeImpactPage.keyboard.press('Enter');
    await outcomeImpactPage.waitForFunction((id) => {
      const top = document.getElementById(id)?.getBoundingClientRect().top;
      return window.location.hash === `#${id}`
        && Number.isFinite(top)
        && top >= 80
        && top <= 130
        && document.activeElement?.id === id;
    }, targetId, { timeout: 3_000 });
    const state = await outcomeImpactPage.evaluate((id) => ({
      hash: window.location.hash,
      top: document.getElementById(id)?.getBoundingClientRect().top,
      focusedId: document.activeElement?.id || '',
      text: document.getElementById(id)?.textContent.replace(/\s+/g, ' ').trim() || ''
    }), targetId);
    if (state.hash !== `#${targetId}`
      || !Number.isFinite(state.top)
      || state.top < 80
      || state.top > 130
      || state.focusedId !== targetId
      || !state.text.includes(expectedText)) {
      throw new Error(`El acceso ${key} no alcanzó su evidencia: ${JSON.stringify(state)}.`);
    }
  }

  await outcomeImpactPage.evaluate(() => {
    window.location.hash = '#sheet-vst-alignment';
  });
  await outcomeImpactPage.waitForFunction(() => {
    const top = document.querySelector('#sheet-vst-alignment')?.getBoundingClientRect().top;
    return Number.isFinite(top) && top >= 80 && top <= 130;
  }, null, { timeout: 3_000 });
  await outcomeImpactPage.evaluate(() => {
    const panel = document.querySelector('#sheet-vst-alignment');
    const spacer = document.createElement('div');
    spacer.id = 'qa-pnl-layout-shift';
    spacer.style.height = '900px';
    panel?.parentElement?.insertBefore(spacer, panel);
  });
  await outcomeImpactPage.waitForFunction(() => {
    const top = document.querySelector('#sheet-vst-alignment')?.getBoundingClientRect().top;
    return Number.isFinite(top) && top >= 80 && top <= 130;
  }, null, { timeout: 3_000 });
  const shiftedAnchorState = await outcomeImpactPage.evaluate(() => ({
    hash: window.location.hash,
    top: document.querySelector('#sheet-vst-alignment')?.getBoundingClientRect().top,
    spacerHeight: document.querySelector('#qa-pnl-layout-shift')?.getBoundingClientRect().height || 0
  }));
  if (shiftedAnchorState.hash !== '#sheet-vst-alignment'
    || !Number.isFinite(shiftedAnchorState.top)
    || shiftedAnchorState.top < 80
    || shiftedAnchorState.top > 130
    || shiftedAnchorState.spacerHeight !== 900) {
    throw new Error(`El ancla PnL se perdió tras cambiar el layout: ${JSON.stringify(shiftedAnchorState)}.`);
  }
  await outcomeImpactPage.evaluate(() => {
    document.querySelector('#qa-pnl-layout-shift')?.remove();
  });
  await outcomeImpactPage.waitForFunction(() => {
    const top = document.querySelector('#sheet-vst-alignment')?.getBoundingClientRect().top;
    return Number.isFinite(top) && top >= 80 && top <= 130;
  }, null, { timeout: 3_000 });

  await outcomeImpactPage.click('[data-economic-diagnosis-scope="month"]');
  await outcomeImpactPage.waitForFunction(() => (
    document.querySelector('[data-economic-diagnosis-scope="month"]')?.getAttribute('aria-pressed') === 'true'
      && document.querySelectorAll('.replica-impact-table:not(.symbol) tbody tr').length === 3
      && document.querySelectorAll('.replica-impact-table.symbol tbody tr').length === 4
      && document.querySelectorAll('.replica-audit-table tbody tr').length === 6
      && document.querySelector('#economic-diagnosis')?.textContent.includes('55,00 VST')
      && document.activeElement?.dataset?.economicDiagnosisScope === 'month'
  ));

  const outcomeImpactState = await outcomeImpactPage.evaluate(() => {
    const categoryRows = [...document.querySelectorAll('.replica-impact-table:not(.symbol) tbody tr')];
    const symbolRows = [...document.querySelectorAll('.replica-impact-table.symbol tbody tr')];
    const wraps = [...document.querySelectorAll('.replica-impact-table-wrap')];
    const economicDiagnosis = document.querySelector('#economic-diagnosis');
    wraps[0]?.scrollTo({ left: wraps[0].scrollWidth, behavior: 'instant' });
    return {
      total: document.querySelector('.replica-outcome-impact-total strong')?.textContent || '',
      categories: categoryRows.map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
      symbols: symbolRows.map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
      economicDiagnosis: economicDiagnosis?.textContent.replace(/\s+/g, ' ').trim() || '',
      economicSegments: [...document.querySelectorAll('.economic-diagnosis-segment')]
        .map((segment) => segment.style.getPropertyValue('--economic-share')),
      activeEconomicScope: document.querySelector('[data-economic-diagnosis-scope][aria-pressed="true"]')
        ?.dataset.economicDiagnosisScope || '',
      focusedEconomicScope: document.activeElement?.dataset?.economicDiagnosisScope || '',
      rowCount: document.querySelectorAll('.replica-audit-table tbody tr').length,
      rowLabel: document.querySelector('.replica-audit > .replica-box-title span')?.textContent || '',
      metricText: document.querySelector('.replica-audit-grid')?.textContent.replace(/\s+/g, ' ').trim() || '',
      horizontalRange: wraps[0] ? wraps[0].scrollWidth - wraps[0].clientWidth : 0,
      horizontalPosition: wraps[0]?.scrollLeft || 0
    };
  });
  if (!outcomeImpactState.total.includes('-39')
    || !outcomeImpactState.categories.some((row) => row.includes('Signo distinto antes de costes') && row.includes('-24') && row.includes('7,7%'))
    || !outcomeImpactState.categories.some((row) => row.includes('Ganancia absorbida por costes') && row.includes('1'))
    || !outcomeImpactState.categories.some((row) => row.includes('Mismo signo neto') && row.includes('3'))
    || !outcomeImpactState.symbols.some((row) => row.includes('SOL-USDT') && row.includes('-13') && row.includes('13,3%') && row.includes('-15'))
    || outcomeImpactState.activeEconomicScope !== 'month'
    || outcomeImpactState.focusedEconomicScope !== 'month'
    || outcomeImpactState.rowCount !== 6
    || !outcomeImpactState.rowLabel.includes('Mes completo · 6 filas')
    || !outcomeImpactState.metricText.includes('Réplica teórica 55,00 VST')
    || !outcomeImpactState.metricText.includes('BingX neto 16,00 VST')
    || !outcomeImpactState.economicDiagnosis.includes('Réplica teórica 55,00 VST')
    || !outcomeImpactState.economicDiagnosis.includes('BingX neto 16,00 VST')
    || !outcomeImpactState.economicDiagnosis.includes('Brecha total -39,00 VST')
    || !outcomeImpactState.economicDiagnosis.includes('Ejecución emparejada -32,00 VST 82,1%')
    || !outcomeImpactState.economicDiagnosis.includes('Comisiones y financiación -7,00 VST 17,9%')
    || !outcomeImpactState.economicDiagnosis.includes('La salida concentra 62,5%')
    || !outcomeImpactState.economicDiagnosis.includes('Mayor tramo individual: Cotización a ejecución de salida, -11,00 VST')
    || !outcomeImpactState.economicDiagnosis.includes('1 incidencia histórica separada')
    || !outcomeImpactState.economicDiagnosis.includes('todo el histórico del mes')
    || outcomeImpactState.economicSegments.length !== 2
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
  await outcomeImpactPage.locator('#economic-diagnosis').evaluate((element) => {
    element.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await outcomeImpactPage.waitForTimeout(50);
  const economicDiagnosisAnchorTop = await outcomeImpactPage.locator('#economic-diagnosis').evaluate((element) => (
    element.getBoundingClientRect().top
  ));
  if (economicDiagnosisAnchorTop < 80 || economicDiagnosisAnchorTop > 130) {
    throw new Error(`El ancla del diagnóstico económico quedó tapada: top=${economicDiagnosisAnchorTop}.`);
  }
  await outcomeImpactPage.click('[data-economic-diagnosis-scope="cohort"]');
  await outcomeImpactPage.waitForFunction(() => (
    document.querySelector('[data-economic-diagnosis-scope="cohort"]')?.getAttribute('aria-pressed') === 'true'
      && document.querySelectorAll('.replica-audit-table tbody tr').length === 3
      && document.querySelector('.replica-audit > .replica-box-title span')?.textContent.includes('Cohorte vigente')
  ));
  await outcomeImpactPage.setViewportSize({ width: 390, height: 844 });
  await outcomeImpactPage.focus('[data-pnl-section-link="sheet-vst-alignment"]');
  await outcomeImpactPage.keyboard.press('Enter');
  await waitForPnlAnchor(outcomeImpactPage, 'sheet-vst-alignment');
  const economicDiagnosisMobile = await outcomeImpactPage.evaluate(() => {
    const flow = document.querySelector('.economic-diagnosis-flow');
    const causes = document.querySelector('.economic-diagnosis-causes');
    const scope = document.querySelector('.economic-diagnosis-scope');
    const drilldowns = [...document.querySelectorAll('.economic-diagnosis-link')];
    const sectionNav = document.querySelector('#pnl-section-nav');
    const activeSectionLink = sectionNav?.querySelector('[aria-current="location"]');
    const sectionNavRect = sectionNav?.getBoundingClientRect();
    const activeSectionRect = activeSectionLink?.getBoundingClientRect();
    return {
      viewportWidth: innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      flowColumns: flow ? getComputedStyle(flow).gridTemplateColumns.split(' ').length : 0,
      causeColumns: causes ? getComputedStyle(causes).gridTemplateColumns.split(' ').length : 0,
      diagnosisWidth: document.querySelector('#economic-diagnosis')?.getBoundingClientRect().width || 0,
      scopeWidth: scope?.getBoundingClientRect().width || 0,
      scopeButtonCount: scope?.querySelectorAll('button').length || 0,
      rowCount: document.querySelectorAll('.replica-audit-table tbody tr').length,
      drilldownsFit: drilldowns.every((link) => (
        link.getBoundingClientRect().width <= link.closest('.economic-diagnosis-cause').getBoundingClientRect().width
      )),
      sectionNavPosition: sectionNav ? getComputedStyle(sectionNav).position : '',
      sectionNavTop: sectionNavRect?.top ?? null,
      sectionNavLeft: sectionNavRect?.left ?? null,
      sectionNavRight: sectionNavRect?.right ?? null,
      sectionNavClientWidth: sectionNav?.clientWidth || 0,
      sectionNavScrollWidth: sectionNav?.scrollWidth || 0,
      activeSection: activeSectionLink?.dataset.pnlSectionLink || '',
      activeSectionVisible: Boolean(
        sectionNavRect
          && activeSectionRect
          && activeSectionRect.left >= sectionNavRect.left - 1
          && activeSectionRect.right <= sectionNavRect.right + 1
      )
    };
  });
  if (economicDiagnosisMobile.documentScrollWidth > economicDiagnosisMobile.viewportWidth
    || economicDiagnosisMobile.flowColumns !== 1
    || economicDiagnosisMobile.causeColumns !== 1
    || economicDiagnosisMobile.diagnosisWidth <= 0
    || economicDiagnosisMobile.diagnosisWidth > economicDiagnosisMobile.viewportWidth
    || economicDiagnosisMobile.scopeWidth <= 0
    || economicDiagnosisMobile.scopeWidth > economicDiagnosisMobile.diagnosisWidth
    || economicDiagnosisMobile.scopeButtonCount !== 2
    || economicDiagnosisMobile.rowCount !== 3
    || !economicDiagnosisMobile.drilldownsFit
    || economicDiagnosisMobile.sectionNavPosition !== 'sticky'
    || economicDiagnosisMobile.sectionNavTop == null
    || economicDiagnosisMobile.sectionNavTop < 60
    || economicDiagnosisMobile.sectionNavTop > 66
    || economicDiagnosisMobile.sectionNavLeft == null
    || economicDiagnosisMobile.sectionNavLeft < -1
    || economicDiagnosisMobile.sectionNavRight > economicDiagnosisMobile.viewportWidth + 1
    || economicDiagnosisMobile.sectionNavScrollWidth <= economicDiagnosisMobile.sectionNavClientWidth
    || economicDiagnosisMobile.activeSection !== 'sheet-vst-alignment'
    || !economicDiagnosisMobile.activeSectionVisible) {
    throw new Error(`El diagnóstico económico no respondió bien en móvil: ${JSON.stringify(economicDiagnosisMobile)}.`);
  }
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
  let manualRefreshDelayMs = 0;
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
    if (manualRefreshDelayMs > 0) {
      await delay(manualRefreshDelayMs);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        historical: {
          source: {
            alignedMonth: fixtureMonth,
            referenceLedger: {
              label: 'HOJA REFRESCO QA',
              url: 'https://docs.google.com/spreadsheets/d/qa-refresh/edit'
            }
          },
          months: [],
          positions: []
        }
      })
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
    const globalButton = document.querySelector('#refresh-pnl');
    const localButton = document.querySelector('#external-sheet-retry');
    return globalButton
      && !globalButton.disabled
      && localButton
      && !localButton.disabled
      && !localButton.classList.contains('hidden');
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

  Object.values(manualRefreshRequests).forEach((requests) => requests.splice(0));
  manualRefreshDelayMs = 350;
  await manualRefreshPage.locator('#external-sheet-retry').click();
  await manualRefreshPage.waitForFunction(() => {
    const button = document.querySelector('#external-sheet-retry');
    return button?.disabled
      && button.getAttribute('aria-label') === 'Actualizando hoja externa'
      && document.querySelector('#external-sheet-panel')?.getAttribute('aria-busy') === 'true';
  }, null, { timeout: 2_000 });
  await manualRefreshPage.waitForFunction(() => {
    const button = document.querySelector('#external-sheet-retry');
    return button
      && !button.disabled
      && button.getAttribute('aria-label') === 'Actualizar hoja externa'
      && document.querySelector('#external-sheet-panel')?.getAttribute('aria-busy') === 'false';
  }, null, { timeout: 20_000 });
  const missingLocalForcedRefresh = Object.entries(manualRefreshRequests)
    .filter(([, requests]) => !requests.some((url) => new URL(url).searchParams.get('refresh') === '1'))
    .map(([key]) => key);
  if (missingLocalForcedRefresh.length) {
    throw new Error(`El refresco local de la hoja no forzo estas fuentes: ${missingLocalForcedRefresh.join(', ')}.`);
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
    skipLinkPassed: true,
    searchAccessibleNamePassed: true,
    semanticHeadingHierarchyPassed: true,
    spanishUiCopyPassed: true,
    viewTabsKeyboardPassed: true,
    logGroupingPassed: true,
    incidentLifecyclePassed: true,
    backupContinuityPanelPassed: true,
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
    economicDiagnosisPanelPassed: true,
    economicDiagnosisScopeTogglePassed: true,
    pnlSectionNavigationPassed: true,
    pnlSectionNavigationResponsivePassed: true,
    alignmentScrollControlsPassed: true,
    outcomeImpactPanelPassed: true,
    manualPnlRefreshPassed: true,
    externalSheetLocalRefreshPassed: true
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

async function waitForPnlAnchor(page, targetId, { focus = true, timeout = 6_000 } = {}) {
  await page.waitForFunction(({ id, requireFocus }) => {
    const target = document.getElementById(id);
    if (!target) {
      return false;
    }
    const stickyBottom = ['.topbar', '.content-toolbar', '#pnl-section-nav']
      .reduce((maximum, selector) => {
        const node = document.querySelector(selector);
        if (!node) {
          return maximum;
        }
        const position = getComputedStyle(node).position;
        const rect = node.getBoundingClientRect();
        return ['fixed', 'sticky'].includes(position)
          && rect.bottom > 0
          && rect.top < innerHeight
          ? Math.max(maximum, rect.bottom)
          : maximum;
      }, 0);
    const top = target.getBoundingClientRect().top;
    const sectionLink = document.querySelector(`[data-pnl-section-link="${CSS.escape(id)}"]`);
    return window.location.hash === `#${id}`
      && Number.isFinite(top)
      && top >= stickyBottom + 4
      && top <= stickyBottom + 52
      && (!sectionLink || sectionLink.getAttribute('aria-current') === 'location')
      && (!requireFocus || document.activeElement?.id === id);
  }, { id: targetId, requireFocus: focus }, { timeout });
}

async function readPnlAnchorState(page, targetId) {
  return page.evaluate((id) => {
    const target = document.getElementById(id);
    const sticky = ['.topbar', '.content-toolbar', '#pnl-section-nav']
      .map((selector) => {
        const node = document.querySelector(selector);
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        return {
          selector,
          position: getComputedStyle(node).position,
          top: rect.top,
          bottom: rect.bottom
        };
      })
      .filter(Boolean);
    const stickyBottom = sticky.reduce((maximum, item) => (
      ['fixed', 'sticky'].includes(item.position)
        && item.bottom > 0
        && item.top < innerHeight
        ? Math.max(maximum, item.bottom)
        : maximum
    ), 0);
    return {
      hash: window.location.hash,
      top: target?.getBoundingClientRect().top,
      focusedId: document.activeElement?.id || '',
      stickyBottom,
      sticky,
      activeSection: document.querySelector('#pnl-section-nav [aria-current="location"]')
        ?.dataset.pnlSectionLink || ''
    };
  }, targetId);
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
        gapBridge: {
          replicaPnl: 55,
          bingxFees: -6.5,
          bingxFunding: -0.5,
          bingxNet: 16,
          residual: 0,
          reconciled: true,
          counts: { matched: 6 },
          steps: [
            { key: 'matched_gap', label: 'Emparejadas vs hoja', value: -32, count: 6 },
            { key: 'missing_execution', label: 'No ejecutadas', value: 0, count: 0 },
            { key: 'fees', label: 'Comisiones', value: -6.5, count: null },
            { key: 'funding', label: 'Funding', value: -0.5, count: null }
          ]
        },
        matchedGapAttribution: {
          replicaPnl: 55,
          bingxGross: 23,
          gap: -32,
          residual: 0,
          reconciled: true,
          counts: { matched: 6, decomposable: 6 },
          steps: [
            { key: 'entry_execution', label: 'Diferencia de entrada', value: -12, count: 6 },
            { key: 'exit_execution', label: 'Diferencia de salida', value: -20, count: 6 },
            { key: 'size_and_fills', label: 'Cantidad y fills', value: 0, count: 6 }
          ],
          bySymbol: [],
          byCloseKind: []
        },
        executionPriceChain: {
          replicaPnl: 55,
          bingxGross: 23,
          residual: 0,
          reconciled: true,
          counts: { matched: 6, decomposable: 6, fullExitPath: 6 },
          steps: [
            { key: 'entry_reference', label: 'Referencia de entrada', value: -3, count: 6 },
            { key: 'entry_quote_move', label: 'Señal a cotización', value: -4, count: 6 },
            { key: 'entry_fill', label: 'Cotización a fill de entrada', value: -5, count: 6 },
            { key: 'entry_missing_evidence', label: 'Entrada sin traza', value: 0, count: 0 },
            { key: 'exit_target', label: 'Objetivo de salida', value: -4, count: 6 },
            { key: 'exit_quote_move', label: 'Objetivo a cotización', value: -5, count: 6 },
            { key: 'exit_fill', label: 'Cotización a fill de salida', value: -11, count: 6 },
            { key: 'exit_missing_evidence', label: 'Salida sin traza', value: 0, count: 0 },
            { key: 'size_and_fills', label: 'Cantidad y fills', value: 0, count: 6 }
          ],
          mainDrags: [
            { key: 'exit_fill', label: 'Cotización a fill de salida', value: -11, count: 6 },
            { key: 'entry_fill', label: 'Cotización a fill de entrada', value: -5, count: 6 }
          ]
        },
        executionRouteAnalysis: {
          families: [
            { key: 'historical_defect', label: 'Incidencia histórica corregida', rows: 1, gap: -2 }
          ],
          groups: []
        },
        orderHistoryEvidence: {
          available: true,
          closedRows: 6,
          exactCloseRows: 6,
          exactCloseCoveragePercent: 100
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
      cohort: {
        startedAt: '2026-07-15T07:05:17.987Z',
        endedAt: null,
        generatedAt: closedAt,
        sampleStatus: {
          key: 'preliminary',
          label: 'Muestra preliminar',
          detail: '3/100 cierres; útil para orientar, todavía frágil'
        },
        summary: {
          sheetRows: 3,
          vstOpenings: 3,
          vstCloses: 3,
          replicaPnl: 20,
          replicaEstimatedMarketNet: 18,
          bingxGross: 9,
          bingxFees: -3,
          bingxFunding: -1,
          bingxNet: 5,
          referenceCoverage: {
            comparableRows: 3,
            outsideCoverageRows: 0,
            stale: false,
            provisionalLatestDay: false
          },
          gapBridge: {
            replicaPnl: 20,
            bingxFees: -3,
            bingxFunding: -1,
            bingxNet: 5,
            residual: 0,
            reconciled: true,
            counts: { matched: 3 },
            steps: [
              { key: 'matched_gap', label: 'Emparejadas vs hoja', value: -9, count: 3 },
              { key: 'missing_execution', label: 'No ejecutadas', value: -2, count: 1 },
              { key: 'fees', label: 'Comisiones', value: -3, count: null },
              { key: 'funding', label: 'Funding', value: -1, count: null }
            ]
          },
          matchedGapAttribution: {
            replicaPnl: 18,
            bingxGross: 9,
            gap: -9,
            residual: 0,
            reconciled: true,
            counts: { matched: 3, decomposable: 3 },
            steps: [
              { key: 'entry_execution', label: 'Diferencia de entrada', value: -10, count: 3 },
              { key: 'exit_execution', label: 'Diferencia de salida', value: 1, count: 3 },
              { key: 'size_and_fills', label: 'Cantidad y fills', value: 0, count: 3 }
            ],
            bySymbol: [],
            byCloseKind: []
          },
          executionPriceChain: {
            mainDrags: [
              { key: 'entry_fill', label: 'Cotización a fill de entrada', value: -6, count: 3 },
              { key: 'exit_fill', label: 'Cotización a fill de salida', value: -2, count: 3 }
            ]
          },
          executionRouteAnalysis: {
            families: [],
            groups: []
          },
          orderHistoryEvidence: {
            available: true,
            closedRows: 3,
            exactCloseRows: 3,
            exactCloseCoveragePercent: 100
          }
        },
        rows: rows.slice(0, 3)
      },
      source: { orderHistory: { available: true, records: 6 } },
      rows
    }
  };
}
