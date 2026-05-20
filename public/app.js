const elements = {
  channelUrl: document.querySelector('#channel-url'),
  openBrowser: document.querySelector('#open-browser'),
  start: document.querySelector('#start-scrape'),
  stop: document.querySelector('#stop-scrape'),
  backfill: document.querySelector('#backfill-enabled'),
  live: document.querySelector('#live-enabled'),
  pollInterval: document.querySelector('#poll-interval'),
  maxScrolls: document.querySelector('#max-scrolls'),
  statusPill: document.querySelector('#status-pill'),
  statusText: document.querySelector('#status-text'),
  metricTotal: document.querySelector('#metric-total'),
  metricVisible: document.querySelector('#metric-visible'),
  metricLast: document.querySelector('#metric-last'),
  postsTab: document.querySelector('#posts-tab'),
  logsTab: document.querySelector('#logs-tab'),
  pnlTab: document.querySelector('#pnl-tab'),
  postsView: document.querySelector('#posts-view'),
  logsView: document.querySelector('#logs-view'),
  pnlView: document.querySelector('#pnl-view'),
  postsList: document.querySelector('#posts-list'),
  emptyPosts: document.querySelector('#empty-posts'),
  logsList: document.querySelector('#logs-list'),
  refreshPnl: document.querySelector('#refresh-pnl'),
  pnlStatus: document.querySelector('#pnl-status'),
  pnlSourceGrid: document.querySelector('#pnl-source-grid'),
  performanceSourceGrid: document.querySelector('#performance-source-grid'),
  pnlMonthLabel: document.querySelector('#pnl-month-label'),
  pnlTotalMonth: document.querySelector('#pnl-total-month'),
  pnlHeroDetail: document.querySelector('#pnl-hero-detail'),
  pnlResultLabel: document.querySelector('#pnl-result-label'),
  pnlPaperMonth: document.querySelector('#pnl-paper-month'),
  pnlOpenExposure: document.querySelector('#pnl-open-exposure'),
  pnlFeesMonth: document.querySelector('#pnl-fees-month'),
  pnlFundingMonth: document.querySelector('#pnl-funding-month'),
  pnlTestOrders: document.querySelector('#pnl-test-orders'),
  pnlClosedTrades: document.querySelector('#pnl-closed-trades'),
  pnlModeLabel: document.querySelector('#pnl-mode-label'),
  pnlWinRate: document.querySelector('#pnl-win-rate'),
  pnlCurveStatus: document.querySelector('#pnl-curve-status'),
  pnlCurve: document.querySelector('#pnl-curve'),
  pnlChartStatus: document.querySelector('#pnl-chart-status'),
  pnlChart: document.querySelector('#pnl-chart'),
  historicalPnlStatus: document.querySelector('#historical-pnl-status'),
  historicalPnlTitle: document.querySelector('#historical-pnl-title'),
  historicalPnlTotal: document.querySelector('#historical-pnl-total'),
  historicalPnlClosed: document.querySelector('#historical-pnl-closed'),
  historicalPnlOpenSignals: document.querySelector('#historical-pnl-open-signals'),
  historicalPnlMonths: document.querySelector('#historical-pnl-months'),
  historicalPnlChart: document.querySelector('#historical-pnl-chart'),
  historicalPnlTable: document.querySelector('#historical-pnl-table'),
  historicalSignalTitle: document.querySelector('#historical-signal-title'),
  historicalSignalStatus: document.querySelector('#historical-signal-status'),
  historicalSignalList: document.querySelector('#historical-signal-list'),
  pnlSimNotional: document.querySelector('#pnl-sim-notional'),
  pnlSimTotal: document.querySelector('#pnl-sim-total'),
  pnlSimRealized: document.querySelector('#pnl-sim-realized'),
  pnlSimFloating: document.querySelector('#pnl-sim-floating'),
  pnlSimExposure: document.querySelector('#pnl-sim-exposure'),
  pnlSimList: document.querySelector('#pnl-sim-list'),
  pnlSimSource: document.querySelector('#pnl-sim-source'),
  pnlSimSymbol: document.querySelector('#pnl-sim-symbol'),
  pnlSimSide: document.querySelector('#pnl-sim-side'),
  pnlSimOutcome: document.querySelector('#pnl-sim-outcome'),
  pnlSimLeverage: document.querySelector('#pnl-sim-leverage'),
  pnlSimFee: document.querySelector('#pnl-sim-fee'),
  pnlSimCapital: document.querySelector('#pnl-sim-capital'),
  pnlSimMetrics: document.querySelector('#pnl-sim-metrics'),
  pnlNote: document.querySelector('#pnl-note'),
  pnlEmpty: document.querySelector('#pnl-empty'),
  liveReadinessStatus: document.querySelector('#live-readiness-status'),
  liveReadinessList: document.querySelector('#live-readiness-list'),
  armLive: document.querySelector('#arm-live'),
  disarmLive: document.querySelector('#disarm-live'),
  healthStatus: document.querySelector('#health-status'),
  healthMetrics: document.querySelector('#health-metrics'),
  riskStatus: document.querySelector('#risk-status'),
  riskMetrics: document.querySelector('#risk-metrics'),
  tickerPnlStatus: document.querySelector('#ticker-pnl-status'),
  tickerPnlChart: document.querySelector('#ticker-pnl-chart'),
  dailyPnlStatus: document.querySelector('#daily-pnl-status'),
  dailyPnlGrid: document.querySelector('#daily-pnl-grid'),
  pnlTable: document.querySelector('#pnl-table'),
  openPositionsStatus: document.querySelector('#open-positions-status'),
  openPositionsEmpty: document.querySelector('#open-positions-empty'),
  openPositionsList: document.querySelector('#open-positions-list'),
  tradeHistoryStatus: document.querySelector('#trade-history-status'),
  tradeHistoryEmpty: document.querySelector('#trade-history-empty'),
  tradeHistoryList: document.querySelector('#trade-history-list'),
  search: document.querySelector('#search'),
  clearPosts: document.querySelector('#clear-posts'),
  telegramEnabled: document.querySelector('#telegram-enabled'),
  telegramToken: document.querySelector('#telegram-token'),
  telegramChatId: document.querySelector('#telegram-chat-id'),
  telegramBackfill: document.querySelector('#telegram-backfill'),
  telegramHealth: document.querySelector('#telegram-health'),
  telegramHealthMinutes: document.querySelector('#telegram-health-minutes'),
  saveTelegram: document.querySelector('#save-telegram'),
  detectTelegram: document.querySelector('#detect-telegram'),
  testTelegram: document.querySelector('#test-telegram'),
  telegramStatus: document.querySelector('#telegram-status'),
  bingxEnabled: document.querySelector('#bingx-enabled'),
  bingxMode: document.querySelector('#bingx-mode'),
  bingxMargin: document.querySelector('#bingx-margin'),
  bingxApiKey: document.querySelector('#bingx-api-key'),
  bingxApiSecret: document.querySelector('#bingx-api-secret'),
  bingxNotional: document.querySelector('#bingx-notional'),
  bingxMaxNotional: document.querySelector('#bingx-max-notional'),
  bingxMaxLeverage: document.querySelector('#bingx-max-leverage'),
  bingxSymbols: document.querySelector('#bingx-symbols'),
  bingxRequireSl: document.querySelector('#bingx-require-sl'),
  bingxMaxOpen: document.querySelector('#bingx-max-open'),
  bingxMaxSignalLeverage: document.querySelector('#bingx-max-signal-leverage'),
  bingxVstBaseCapital: document.querySelector('#bingx-vst-base-capital'),
  bingxVstCapitalPercent: document.querySelector('#bingx-vst-capital-percent'),
  bingxDailyLoss: document.querySelector('#bingx-daily-loss'),
  bingxMonthlyLoss: document.querySelector('#bingx-monthly-loss'),
  bingxDryRunRequired: document.querySelector('#bingx-dry-run-required'),
  bingxLiveConfirmRow: document.querySelector('#bingx-live-confirm-row'),
  bingxLiveConfirm: document.querySelector('#bingx-live-confirm'),
  saveBingx: document.querySelector('#save-bingx'),
  testBingx: document.querySelector('#test-bingx'),
  parseBingx: document.querySelector('#parse-bingx'),
  vstBingx: document.querySelector('#vst-bingx'),
  probeBingx: document.querySelector('#probe-bingx'),
  bingxProbeSymbol: document.querySelector('#bingx-probe-symbol'),
  bingxProbeSide: document.querySelector('#bingx-probe-side'),
  bingxProbeNotional: document.querySelector('#bingx-probe-notional'),
  bingxProbeLeverage: document.querySelector('#bingx-probe-leverage'),
  bingxProbeSl: document.querySelector('#bingx-probe-sl'),
  bingxProbeTp: document.querySelector('#bingx-probe-tp'),
  bingxParserText: document.querySelector('#bingx-parser-text'),
  bingxStatus: document.querySelector('#bingx-status'),
  clientError: document.querySelector('#client-error')
};

const appState = {
  state: null,
  posts: [],
  postsUpdatedAt: null,
  postsLoading: false,
  telegram: null,
  bingx: null,
  pnl: null,
  pnlSources: null,
  pnlSource: '',
  performanceSource: '',
  pnlLoading: false,
  pnlError: '',
  simTouched: false,
  trades: [],
  paperTrades: [],
  exchangePositions: [],
  risk: null,
  logs: []
};

init();

async function init() {
  bindEvents();
  await Promise.all([loadState(), loadPosts(), loadTelegram(), loadBingx()]);
  connectEvents();
  window.lucide?.createIcons();
}

function bindEvents() {
  elements.openBrowser.addEventListener('click', async () => {
    await runAction(async () => {
      await postJson('/api/browser/open', {});
      await loadState();
    });
  });

  elements.start.addEventListener('click', async () => {
    await runAction(async () => {
      const payload = {
        channelUrl: elements.channelUrl.value,
        backfill: elements.backfill.checked,
        live: elements.live.checked,
        pollIntervalSeconds: Number(elements.pollInterval.value),
        maxScrolls: Number(elements.maxScrolls.value)
      };
      await postJson('/api/scrape/start', payload);
      await loadState();
    });
  });

  elements.stop.addEventListener('click', async () => {
    await runAction(async () => {
      await postJson('/api/scrape/stop', {});
      await loadState();
    });
  });

  elements.clearPosts.addEventListener('click', async () => {
    if (!confirm('Vaciar el archivo local de publicaciones?')) {
      return;
    }
    await runAction(async () => {
      await postJson('/api/posts/clear', {});
      appState.posts = [];
      renderPosts();
      await loadState();
    });
  });

  elements.search.addEventListener('input', renderPosts);
  elements.postsTab.addEventListener('click', () => switchView('posts'));
  elements.logsTab.addEventListener('click', () => switchView('logs'));
  elements.pnlTab.addEventListener('click', () => {
    switchView('pnl');
    loadPnl().catch((error) => {
      appState.pnlError = error.message;
      renderPnl();
    });
  });
  elements.refreshPnl.addEventListener('click', async () => {
    await runAction(async () => {
      await loadPnl();
    });
  });
  elements.pnlSourceGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pnl-source]');
    if (!button) {
      return;
    }
    appState.pnlSource = button.dataset.pnlSource;
    appState.performanceSource = button.dataset.pnlSource;
    renderPnl();
  });
  elements.performanceSourceGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-performance-source]');
    if (!button) {
      return;
    }
    appState.performanceSource = button.dataset.performanceSource;
    renderPerformanceSourceGrid(pnlSourceCards(currentReferenceLedger()), appState.performanceSource);
    renderPnlCurve();
    renderSimulation();
    renderPnlChart(performanceMonthlyRows());
    renderHistoricalPnl();
  });
  elements.armLive.addEventListener('click', async () => {
    await runAction(async () => {
      const readiness = liveReadiness();
      if (!readiness.ready) {
        renderLiveReadiness(readiness);
        throw new Error('Live aun no esta preparado. Revisa el checklist.');
      }
      const confirmed = confirm('Vas a armar LIVE REAL. Las proximas señales validas podran enviar ordenes reales a BingX. Continuar?');
      if (!confirmed) {
        return;
      }
      elements.bingxEnabled.checked = true;
      elements.bingxMode.value = 'live';
      elements.bingxLiveConfirm.checked = true;
      const bingx = await saveBingxConfig();
      renderBingx(bingx, 'Live armado');
      renderPnl();
    });
  });
  elements.disarmLive.addEventListener('click', async () => {
    await runAction(async () => {
      elements.bingxMode.value = 'test';
      elements.bingxLiveConfirm.checked = false;
      const bingx = await saveBingxConfig();
      renderBingx(bingx, 'Modo test armado');
      renderPnl();
    });
  });
  [
    elements.pnlSimNotional,
    elements.pnlSimSymbol,
    elements.pnlSimSide,
    elements.pnlSimOutcome,
    elements.pnlSimLeverage,
    elements.pnlSimFee,
    elements.pnlSimCapital
  ].forEach((control) => {
    control.addEventListener('input', () => {
      if (control === elements.pnlSimNotional) {
        appState.simTouched = true;
      }
      renderPnlCurve();
      renderSimulation();
    });
    control.addEventListener('change', () => {
      renderPnlCurve();
      renderSimulation();
    });
  });

  elements.saveTelegram.addEventListener('click', async () => {
    await runAction(async () => {
      const telegram = await saveTelegramConfig();
      renderTelegram(telegram, 'Configuracion guardada');
    });
  });

  elements.detectTelegram.addEventListener('click', async () => {
    await runAction(async () => {
      await saveTelegramConfig();
      renderTelegram(appState.telegram, 'Detectando chat...');
      const response = await postJson('/api/telegram/detect-chat', {});
      appState.telegram = response.telegram;
      renderTelegram(response.telegram, `Chat detectado: ${response.selected.title}`);
    });
  });

  elements.testTelegram.addEventListener('click', async () => {
    await runAction(async () => {
      const telegram = await saveTelegramConfig();
      renderTelegram(telegram, 'Enviando prueba...');
      await postJson('/api/telegram/test', {});
      renderTelegram(telegram, 'Prueba enviada');
    });
  });

  elements.bingxMode.addEventListener('change', () => {
    elements.bingxLiveConfirmRow.classList.toggle('hidden', elements.bingxMode.value !== 'live');
  });

  elements.saveBingx.addEventListener('click', async () => {
    await runAction(async () => {
      const bingx = await saveBingxConfig();
      renderBingx(bingx, 'Configuracion guardada');
      await loadPnl();
    });
  });

  elements.testBingx.addEventListener('click', async () => {
    await runAction(async () => {
      const bingx = await saveBingxConfig();
      renderBingx(bingx, 'Validando API...');
      await postJson('/api/bingx/test-connection', {});
      renderBingx(bingx, 'API validada');
      await loadPnl();
    });
  });

  elements.parseBingx.addEventListener('click', async () => {
    await runAction(async () => {
      const response = await postJson('/api/bingx/parse-test', { text: elements.bingxParserText.value });
      const signals = response.signals || [response.signal].filter(Boolean);
      const validSignals = signals.filter((signal) => signal.isSignal);
      const firstInvalid = signals.find((signal) => !signal.isSignal);
      renderBingx(appState.bingx, validSignals.length
        ? `Senales: ${validSignals.map((signal) => `${signal.symbol} ${signal.direction}`).join(', ')}`
        : `No es senal: ${(firstInvalid?.reasons || []).join(', ')}`);
    });
  });

  elements.vstBingx.addEventListener('click', async () => {
    await runAction(async () => {
      elements.bingxMode.value = 'demo';
      const bingx = await saveBingxConfig();
      renderBingx(bingx, 'Actualizando VST...');
      await postJson('/api/bingx/vst', { amount: 10000 });
      renderBingx(appState.bingx, 'VST listo');
    });
  });

  elements.probeBingx.addEventListener('click', async () => {
    await runAction(async () => {
      const bingx = await saveBingxConfig();
      let confirmToken = '';
      if (bingx.mode === 'live') {
        const confirmed = confirm('Esto envia una orden real minima a BingX con SL/TP. Continuar?');
        if (!confirmed) {
          return;
        }
        confirmToken = 'LIVE_MINIMA';
      }
      const response = await postJson('/api/bingx/probe', {
        symbol: elements.bingxProbeSymbol.value,
        direction: elements.bingxProbeSide.value,
        notionalUSDT: Number(elements.bingxProbeNotional.value),
        leverage: Number(elements.bingxProbeLeverage.value),
        stopLossPercent: Number(elements.bingxProbeSl.value),
        takeProfitPercent: Number(elements.bingxProbeTp.value),
        confirm: confirmToken
      });
      renderBingx(appState.bingx, tradeStatusLabel(response.result?.status));
      await loadBingx();
    });
  });
}

async function loadState() {
  const state = await fetchJson('/api/state');
  appState.state = state;
  appState.logs = state.logs || appState.logs;
  renderState();
  renderLogs();
}

async function loadPosts() {
  if (appState.postsLoading) {
    return;
  }
  appState.postsLoading = true;
  try {
    const response = await fetchJson('/api/posts');
    appState.posts = response.posts || [];
    appState.postsUpdatedAt = response.stats?.updatedAt || null;
    renderPosts();
  } finally {
    appState.postsLoading = false;
  }
}

async function loadTelegram() {
  const response = await fetchJson('/api/telegram');
  appState.telegram = response.telegram;
  renderTelegram(response.telegram);
}

async function loadBingx() {
  const response = await fetchJson('/api/bingx');
  appState.bingx = response.bingx;
  appState.trades = response.trades || appState.trades;
  appState.paperTrades = response.paperTrades || appState.paperTrades;
  appState.exchangePositions = response.exchangePositions || appState.exchangePositions;
  appState.risk = response.risk || appState.risk;
  renderBingx(response.bingx);
  if (response.bingx?.apiKeyConfigured && response.bingx?.apiSecretConfigured) {
    await loadPnl();
  } else {
    renderPnl();
  }
}

async function loadPnl() {
  if (appState.pnlLoading) {
    return;
  }

  appState.pnlLoading = true;
  appState.pnlError = '';
  renderPnl();

  try {
    const [historicalResponse, sourcesResponse] = await Promise.all([
      fetchJson('/api/historical-pnl?months=72'),
      fetchJson('/api/bingx/pnl-sources').catch((error) => ({
        ok: false,
        error: error.message,
        sources: {},
        positions: {}
      }))
    ]);
    const historical = historicalResponse.historical;
    appState.pnlSources = sourcesResponse;
    appState.pnl = {
      ...(appState.pnl || {}),
      months: appState.pnl?.months || [],
      historical
    };
    renderPnl();

    if (appState.bingx?.apiKeyConfigured && appState.bingx?.apiSecretConfigured) {
      try {
        const response = await fetchJson('/api/bingx/pnl?months=3');
        appState.pnl = {
          ...response.pnl,
          historical
        };
        appState.pnlError = response.warning || response.pnl?.warning || '';
        appState.paperTrades = response.pnl?.paper?.positions || appState.paperTrades;
      } catch (error) {
        appState.pnl = {
          months: [],
          historical
        };
        appState.pnlError = error.message;
      }
    } else {
      appState.pnl = {
        months: [],
        historical
      };
    }
  } catch (error) {
    appState.pnlError = error.message;
  } finally {
    appState.pnlLoading = false;
    renderPnl();
  }
}

function connectEvents() {
  const source = new EventSource('/api/events');

  source.addEventListener('state', (event) => {
    appState.state = JSON.parse(event.data);
    appState.logs = appState.state.logs || appState.logs;
    appState.trades = appState.state.trades || appState.trades;
    renderState();
    renderLogs();
    renderPnl();
    syncPostsIfNeeded(appState.state);
  });

  source.addEventListener('posts', async () => {
    await loadPosts();
  });

  source.addEventListener('log', (event) => {
    appState.logs.unshift(JSON.parse(event.data));
    appState.logs = appState.logs.slice(0, 200);
    renderLogs();
  });

  source.addEventListener('telegram', (event) => {
    const payload = JSON.parse(event.data);
    appState.telegram = payload.telegram;
    renderTelegram(payload.telegram);
  });

  source.addEventListener('bingx', (event) => {
    const payload = JSON.parse(event.data);
    appState.bingx = payload.bingx;
    renderBingx(payload.bingx);
  });

  source.addEventListener('trade', (event) => {
    const payload = JSON.parse(event.data);
    appState.trades.unshift(payload);
    appState.trades = appState.trades.slice(0, 200);
    if (payload.exchangePosition) {
      removeExchangePosition(payload.exchangePosition);
    }
    if (Array.isArray(payload.paperTrades)) {
      appState.paperTrades = payload.paperTrades;
    }
    if (payload.paperPosition) {
      upsertPaperTrade(payload.paperPosition);
    }
    for (const position of payload.closedPaperPositions || []) {
      upsertPaperTrade(position);
    }
    for (const position of payload.movedPaperPositions || []) {
      upsertPaperTrade(position);
    }
    if (payload.bingx) {
      appState.bingx = payload.bingx;
      renderBingx(payload.bingx);
    }
    renderBingx(appState.bingx, `Trade: ${payload.status}`);
    renderPnl();
    if (String(payload.status || '').endsWith('_order_sent')) {
      loadPnl().catch((error) => {
        appState.pnlError = error.message;
        renderPnl();
      });
    }
  });

  source.addEventListener('exchangePositions', (event) => {
    const payload = JSON.parse(event.data);
    appState.exchangePositions = payload.positions || [];
    renderPnl();
  });

  source.addEventListener('price', (event) => {
    const payload = JSON.parse(event.data);
    const exchangePriceChanged = applyExchangePriceTick(payload.tick);
    for (const position of payload.updatedPaperPositions || []) {
      upsertPaperTrade(position);
    }
    for (const position of payload.closedPaperPositions || []) {
      upsertPaperTrade(position);
    }
    if (exchangePriceChanged || payload.updatedPaperPositions?.length || payload.closedPaperPositions?.length) {
      renderPnl();
    }
  });
}

function renderState() {
  const state = appState.state || {};
  const running = Boolean(state.running);
  const phase = state.phase || 'idle';

  elements.statusPill.classList.toggle('running', running);
  elements.statusText.textContent = running ? phaseLabel(phase) : 'Inactivo';
  elements.start.disabled = running;
  elements.stop.disabled = !running;
  elements.openBrowser.disabled = running;
  elements.metricTotal.textContent = String(state.stats?.totalPosts || 0);
  elements.metricVisible.textContent = String(state.visiblePosts || 0);
  elements.metricLast.textContent = formatDateTime(state.lastRunAt || state.stats?.updatedAt);

  if (state.channelUrl && !elements.channelUrl.value) {
    elements.channelUrl.value = state.channelUrl;
  }
}

function renderPosts() {
  const query = normalize(elements.search.value);
  const posts = appState.posts
    .filter((post) => {
      if (!query) {
        return true;
      }
      return normalize(`${post.text} ${post.author} ${post.channelName} ${post.publishedText}`).includes(query);
    })
    .sort(comparePostsNewestFirst);

  elements.emptyPosts.classList.toggle('hidden', posts.length > 0);
  elements.emptyPosts.textContent = emptyPostsText(query);
  elements.postsList.innerHTML = posts.map(renderPost).join('');
}

function syncPostsIfNeeded(state) {
  const total = state?.stats?.totalPosts || 0;
  const updatedAt = state?.stats?.updatedAt || null;
  const listIsStale = total !== appState.posts.length || (updatedAt && updatedAt !== appState.postsUpdatedAt);

  if (listIsStale) {
    loadPosts().catch((error) => showClientError(error.message));
  }
}

function emptyPostsText(query) {
  if (query && appState.posts.length > 0) {
    return 'No hay publicaciones que coincidan con el filtro.';
  }
  if ((appState.state?.stats?.totalPosts || 0) > 0 && appState.posts.length === 0) {
    return 'Cargando publicaciones guardadas...';
  }
  return 'Pega la URL del canal, abre sesion y lanza el scrapeo.';
}

function renderPost(post) {
  const images = (post.images || []).slice(0, 4).map((src) => (
    `<img src="${escapeAttribute(src)}" alt="">`
  )).join('');
  const postUrl = post.url ? `<a href="${escapeAttribute(post.url)}" target="_blank" rel="noreferrer">Abrir post</a>` : '';
  const memberBadge = post.isMembersOnly ? '<span class="member-badge">Miembros</span>' : '';
  const poll = post.pollOptions?.length ? `<span>Encuesta: ${escapeHtml(post.pollOptions.join(' / '))}</span>` : '';

  return `
    <article class="post-card">
      <div class="post-meta">
        <strong>${escapeHtml(post.author || post.channelName || 'Canal')}</strong>
        <span>${escapeHtml(post.publishedText || 'Sin fecha visible')}</span>
        ${memberBadge}
      </div>
      <p class="post-text">${escapeHtml(post.text || '(post sin texto)')}</p>
      ${images ? `<div class="post-assets">${images}</div>` : ''}
      <div class="post-footer">
        ${post.likeText ? `<span>${escapeHtml(post.likeText)} likes</span>` : ''}
        ${post.commentText ? `<span>${escapeHtml(post.commentText)} comentarios</span>` : ''}
        ${poll}
        ${postUrl}
        <span>Visto: ${escapeHtml(formatDateTime(post.firstSeenAt))}</span>
      </div>
    </article>
  `;
}

function renderLogs() {
  const logs = appState.logs || [];
  elements.logsList.innerHTML = logs.map((log) => `
    <div class="log-row ${escapeAttribute(log.level || 'info')}">
      <span class="log-level">${escapeHtml(log.level || 'info')}</span>
      <span class="log-message">${escapeHtml(log.message || '')}</span>
      <span class="log-time">${escapeHtml(formatDateTime(log.at))}</span>
    </div>
  `).join('') || '<div class="empty-state">Sin eventos todavia.</div>';
}

function renderPnl() {
  const configured = Boolean(appState.bingx?.apiKeyConfigured && appState.bingx?.apiSecretConfigured);
  const reference = currentReferenceLedger();
  const rows = pnlRowsWithReferenceLedger(pnlRowsWithLocalTrades(appState.pnl?.months || []), reference);
  const openPositions = openTradingPositions();
  const closedPositions = closedPaperPositions();
  const sources = pnlSourceCards(reference);
  const selectedSource = selectedPnlSource(sources);
  const displayPositions = positionsForPnlSource(selectedSource.key, reference);
  const displayClosedPositions = displayPositions.filter((position) => position.status === 'closed');
  const winRate = selectedSource.winRate ?? calculateWinRate(displayClosedPositions);
  const hasActivity = rows.some((row) => row.records || row.testOrders || row.liveOrders || row.paperPnl);
  const hasHistorical = Boolean(appState.pnl?.historical);
  const hasReference = Boolean(reference);
  const hasLocalPaper = (appState.paperTrades || []).length > 0;
  const hasPaperActivity = rows.some((row) => row.testOrders || row.openPaperTrades || row.closedPaperTrades || row.paperPnl || row.paperUnrealized);
  const hasBingxActivity = rows.some((row) => row.records || row.liveOrders);

  elements.refreshPnl.disabled = appState.pnlLoading || !configured;
  renderPnlSourceGrid(sources, selectedSource.key);
  renderPerformanceSourceGrid(sources, selectedPerformanceSource(sources).key);
  elements.pnlMonthLabel.textContent = `${formatMonth(selectedSource.month || currentMonthKey())} · ${selectedSource.label}`;
  elements.pnlTotalMonth.textContent = formatSourceMoney(sourcePrimaryValue(selectedSource), selectedSource);
  elements.pnlHeroDetail.textContent = sourceHeroDetail(selectedSource);
  elements.pnlResultLabel.textContent = sourcePrimaryLabel(selectedSource);
  elements.pnlPaperMonth.textContent = formatSourceMoney(sourcePrimaryValue(selectedSource), selectedSource);
  elements.pnlOpenExposure.textContent = formatSourceMoney(selectedSource.exposure, selectedSource);
  elements.pnlFeesMonth.textContent = formatSourceMoney(selectedSource.fees, selectedSource);
  elements.pnlFundingMonth.textContent = formatSourceMoney(selectedSource.funding, selectedSource);
  elements.pnlTestOrders.textContent = String(selectedSource.openPositions || 0);
  elements.pnlClosedTrades.textContent = String(selectedSource.closedTrades || closedPositions.length);
  elements.pnlModeLabel.textContent = selectedSource.modeLabel;
  elements.pnlWinRate.textContent = formatPercent(winRate);
  elements.pnlNote.textContent = sourceNoteText(selectedSource);

  if (!configured) {
    elements.pnlStatus.textContent = 'Configura BingX para leer el PnL mensual.';
    elements.pnlEmpty.textContent = 'Configura BingX para leer el PnL mensual.';
    elements.pnlEmpty.classList.remove('hidden');
  } else if (appState.pnlLoading) {
    elements.pnlStatus.textContent = 'Leyendo PnL de BingX...';
    elements.pnlEmpty.classList.add('hidden');
  } else if (appState.pnlError) {
    const friendlyError = friendlyBingxError(appState.pnlError);
    elements.pnlStatus.textContent = hasLocalPaper
      ? `BingX: ${friendlyError}. Paper local disponible.`
      : hasHistorical ? `BingX: ${friendlyError}. Historico YouTube disponible.` : friendlyError;
    elements.pnlEmpty.textContent = friendlyError;
    elements.pnlEmpty.classList.toggle('hidden', hasHistorical || hasLocalPaper);
  } else if (!rows.length) {
    elements.pnlStatus.textContent = 'Sin PnL todavia.';
    elements.pnlEmpty.textContent = 'Sin PnL todavia. Las ordenes test apareceran aqui como paper trading.';
    elements.pnlEmpty.classList.remove('hidden');
  } else {
    elements.pnlStatus.textContent = hasActivity
      ? `${selectedSource.label} · ${selectedSource.status || pnlSourceText({ hasPaperActivity, hasBingxActivity, hasReference })}`
      : 'Sin PnL todavia.';
    elements.pnlEmpty.classList.add('hidden');
  }

  ensureSimulationDefault();
  elements.pnlTable.innerHTML = rows.map(renderPnlRow).join('');
  renderPnlCurve();
  renderSimulation();
  renderPnlChart(performanceMonthlyRows(rows));
  renderLiveReadiness();
  renderHealthPanel();
  renderRiskPanel(openPositions, closedPositions);
  renderTickerPnl();
  renderDailyPnl();
  renderHistoricalPnl();
  renderOpenPositions(openPositions);
  renderTradeHistory();
  elements.pnlNote.classList.toggle('warn', appState.bingx?.mode !== 'live');
  window.lucide?.createIcons();
}

function pnlSourceCards(reference = currentReferenceLedger()) {
  const sheet = sheetPnlSource(reference);
  const vstPositions = positionsForPnlSource('vst', reference);
  const livePositions = positionsForPnlSource('live', reference);
  const vst = exchangeSourceWithPositions(appState.pnlSources?.sources?.vst, vstPositions, {
    key: 'vst',
    label: 'Futuros VST',
    modeLabel: 'Demo VST',
    asset: 'VST'
  });
  const live = exchangeSourceWithPositions(appState.pnlSources?.sources?.live, livePositions, {
    key: 'live',
    label: 'Futuros reales',
    modeLabel: 'Live real',
    asset: 'USDT'
  });
  return [sheet, vst, live];
}

function sheetPnlSource(reference = currentReferenceLedger()) {
  if (!reference?.row) {
    return emptyClientPnlSource({
      key: 'sheet',
      label: 'Google Sheet',
      modeLabel: 'Excel ref.',
      asset: 'USDT',
      status: 'Sin hoja cargada'
    });
  }

  const positions = reference.positions || [];
  const open = positions.filter((position) => position.status === 'open');
  const closed = positions.filter((position) => position.status === 'closed');
  const row = reference.row;
  const floating = Number(row.paperUnrealized || 0);
  const realized = Number(row.realized || row.paperRealized || 0);
  const total = Number(row.total || row.paperPnl || realized + floating);

  return {
    key: 'sheet',
    label: 'Google Sheet',
    modeLabel: 'Excel ref.',
    month: row.month || currentMonthKey(),
    asset: row.asset || 'USDT',
    available: true,
    status: `${positions.length} ops. referencia`,
    total,
    realized,
    floating,
    fees: 0,
    funding: 0,
    exposure: open.reduce((sum, position) => sum + Number(position.exposure || position.notional || 0), 0),
    openPositions: open.length,
    closedTrades: Number(row.closedTrades || closed.length),
    records: positions.length,
    winRate: calculateWinRate(closed)
  };
}

function exchangeSourceWithPositions(source, positions, fallback) {
  const base = source || emptyClientPnlSource({
    ...fallback,
    status: appState.pnlSources?.error || 'No cargado'
  });
  const open = positions.filter((position) => position.status === 'open');
  const floating = roundPnl(open.reduce((sum, position) => (
    sum + Number(position.unrealizedPnl ?? position.paperPnl ?? 0)
  ), 0));
  const exposure = roundPnl(open.reduce((sum, position) => (
    sum + Number(position.exposure || position.notional || 0)
  ), 0));
  const realized = Number(base.realized || 0);

  return {
    ...base,
    key: fallback.key,
    label: fallback.label,
    modeLabel: fallback.modeLabel,
    asset: base.asset || fallback.asset,
    floating,
    exposure,
    openPositions: open.length,
    total: roundPnl(realized + floating)
  };
}

function emptyClientPnlSource({ key, label, modeLabel, asset, status = 'No disponible' }) {
  return {
    key,
    label,
    modeLabel,
    month: currentMonthKey(),
    asset,
    available: false,
    status,
    total: 0,
    realized: 0,
    floating: 0,
    fees: 0,
    funding: 0,
    exposure: 0,
    openPositions: 0,
    closedTrades: 0,
    records: 0,
    winRate: null
  };
}

function selectedPnlSource(sources = pnlSourceCards()) {
  const preferred = appState.pnlSource || defaultPnlSourceKey(sources);
  const selected = sources.find((source) => source.key === preferred) || sources.find((source) => source.available) || sources[0];
  appState.pnlSource = selected?.key || 'sheet';
  return selected || emptyClientPnlSource({
    key: 'sheet',
    label: 'Google Sheet',
    modeLabel: 'Excel ref.',
    asset: 'USDT'
  });
}

function defaultPnlSourceKey(sources) {
  if (appState.bingx?.mode === 'live') {
    return 'live';
  }
  if (appState.bingx?.mode === 'demo') {
    return 'vst';
  }
  return sources.find((source) => source.key === 'sheet' && source.available) ? 'sheet' : 'vst';
}

function renderPnlSourceGrid(sources, selectedKey) {
  elements.pnlSourceGrid.innerHTML = sources.map((source) => {
    const lines = sourceSecondaryLines(source);
    return `
      <button class="pnl-source-card ${source.key === selectedKey ? 'active' : ''} ${source.available ? '' : 'unavailable'}" type="button" data-pnl-source="${escapeAttribute(source.key)}">
        <span>${escapeHtml(source.label)}</span>
        <strong class="${sourcePrimaryClass(source)}">${escapeHtml(formatSourceMoney(sourcePrimaryValue(source), source))}</strong>
        <small>${escapeHtml(source.modeLabel)} · ${escapeHtml(sourcePrimaryLabel(source))}</small>
        ${lines.length ? `
          <div>
            ${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}
          </div>
        ` : ''}
      </button>
    `;
  }).join('');
}

function selectedPerformanceSource(sources = pnlSourceCards()) {
  const preferred = appState.performanceSource || appState.pnlSource || defaultPnlSourceKey(sources);
  const selected = sources.find((source) => source.key === preferred) || sources[0];
  appState.performanceSource = selected?.key || 'sheet';
  return selected || emptyClientPnlSource({
    key: 'sheet',
    label: 'Google Sheet',
    modeLabel: 'Excel ref.',
    asset: 'USDT'
  });
}

function renderPerformanceSourceGrid(sources, selectedKey) {
  elements.performanceSourceGrid.innerHTML = sources.map((source) => {
    const count = performanceSourcePositions(source.key, currentReferenceLedger(), source).positions.length;
    return `
      <button class="performance-source-button ${source.key === selectedKey ? 'active' : ''} ${count ? '' : 'empty'}" type="button" data-performance-source="${escapeAttribute(source.key)}">
        <span>${escapeHtml(source.label)}</span>
        <strong>${escapeHtml(String(count))}</strong>
      </button>
    `;
  }).join('');
}

function sourcePrimaryValue(source) {
  if (source.key === 'vst' && Number.isFinite(Number(source.balance?.equity))) {
    return Number(source.balance.equity);
  }
  return Number(source.total || 0);
}

function sourcePrimaryLabel(source) {
  if (source.key === 'vst' && Number.isFinite(Number(source.balance?.equity))) {
    return 'Cuenta VST total';
  }
  return source.key === 'live' ? 'Resultado real mes' : 'Resultado mes';
}

function sourcePrimaryClass(source) {
  return source.key === 'vst' && Number.isFinite(Number(source.balance?.equity))
    ? 'amount'
    : amountClass(source.total);
}

function sourceHeroDetail(source) {
  if (source.key === 'vst' && Number.isFinite(Number(source.balance?.equity))) {
    return 'Saldo total de la cuenta demo VST';
  }
  return `${formatSourceMoney(source.realized, source)} realizado · ${formatSourceMoney(source.floating, source)} flotante`;
}

function sourceSecondaryLines(source) {
  if (source.key === 'vst' && source.balance) {
    return [];
  }
  return [
    `${formatSourceMoney(source.realized, source)} realizado`,
    `${formatSourceMoney(source.floating, source)} flotante`
  ];
}

function pnlSourceText({ hasPaperActivity, hasBingxActivity, hasReference }) {
  if (hasReference) {
    return `${currentReferenceLedger()?.label || 'Ledger Excel'} · Google Sheet`;
  }
  const range = appState.pnl?.range?.months || 3;
  if (hasPaperActivity && hasBingxActivity) {
    return `BingX real + paper local · ultimos ${range} meses`;
  }
  if (hasPaperActivity) {
    return `Paper trading local · ${formatMonth(currentMonthKey())} con precios de BingX`;
  }
  return `PnL real de BingX · ultimos ${range} meses`;
}

function sourceNoteText(source) {
  if (source.key === 'sheet') {
    return 'Google Sheet es la referencia externa. No representa necesariamente lo que se ha enviado a BingX desde esta app.';
  }
  if (source.key === 'vst') {
    return 'Futuros VST muestra solamente el saldo total de la cuenta demo de BingX.';
  }
  if (source.key === 'live') {
    return 'Futuros reales lee la cuenta real de BingX. Mantenlo separado de VST antes de armar live.';
  }
  return 'Cada tarjeta separa una fuente de PnL para evitar mezclar referencia, demo y real.';
}

function pnlNoteText({ hasPaperActivity, hasBingxActivity, hasReference }) {
  if (hasReference) {
    return 'Vista alineada con el Excel de referencia. La operativa en vivo local queda separada en posiciones y eventos.';
  }
  if (hasPaperActivity && hasBingxActivity) {
    return 'El neto combina PnL real de BingX y paper trading local. Revisa Paper total para separar la parte simulada.';
  }
  if (hasPaperActivity) {
    return 'Modo test: el neto superior suma paper local. Las posiciones abiertas se actualizan con el last price de BingX Futuros Perpetuo USDⓈ.';
  }
  return 'El PnL mostrado viene de BingX. En modo test las ordenes nuevas se registran como paper trading local.';
}

function friendlyBingxError(message) {
  const text = String(message || '');
  if (/frequency|rate|100410|limit/i.test(text)) {
    return 'rate-limit temporal en PnL';
  }
  return text || 'no disponible';
}

function renderPnlCurve() {
  const source = filteredSimulationSource();
  const targetNotional = Number(elements.pnlSimNotional.value || averagePositionNotional() || 0);
  const positions = simulatedPositions(targetNotional, source.positions);
  const items = equityCurveItems(positions);
  const values = [0, ...items.map((item) => item.equity)];
  const finalValue = values.at(-1) || 0;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const drawdown = calculateMaxDrawdown(values);
  elements.pnlCurveStatus.textContent = `${items.length} operaciones · ${source.label}`;

  if (!items.length) {
    elements.pnlCurve.innerHTML = '<div class="pnl-chart-empty">Sin operaciones para graficar.</div>';
    return;
  }

  elements.pnlCurve.innerHTML = `
    ${renderLineSvg(values, finalValue)}
    <div class="curve-stats">
      <div>
        <span>Neto</span>
        <strong class="${amountClass(finalValue)}">${escapeHtml(formatMoney(finalValue, source.asset))}</strong>
      </div>
      <div>
        <span>Maximo</span>
        <strong class="${amountClass(maxValue)}">${escapeHtml(formatMoney(maxValue, source.asset))}</strong>
      </div>
      <div>
        <span>Minimo</span>
        <strong class="${amountClass(minValue)}">${escapeHtml(formatMoney(minValue, source.asset))}</strong>
      </div>
      <div>
        <span>Drawdown</span>
        <strong class="${amountClass(-drawdown)}">${escapeHtml(formatMoney(-drawdown, source.asset))}</strong>
      </div>
    </div>
  `;
}

function renderPnlChart(rows) {
  const orderedRows = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  const maxAbs = Math.max(1, ...orderedRows.map((row) => Math.abs(Number(row.total || 0))));
  elements.pnlChartStatus.textContent = `${orderedRows.length || appState.pnl?.range?.months || 3} meses`;

  if (!orderedRows.length) {
    elements.pnlChart.innerHTML = '<div class="pnl-chart-empty">Sin datos mensuales todavia.</div>';
    return;
  }

  elements.pnlChart.innerHTML = orderedRows.map((row) => {
    const width = Math.max(4, Math.round((Math.abs(Number(row.total || 0)) / maxAbs) * 100));
    return `
      <div class="pnl-bar-row">
        <span>${escapeHtml(formatShortMonth(row.month))}</span>
        <div class="pnl-bar-track" aria-hidden="true">
          <div class="pnl-bar ${amountTone(row.total)}" style="width: ${escapeAttribute(width)}%"></div>
        </div>
        <strong class="${amountClass(row.total)}">${escapeHtml(formatUsdt(row.total))}</strong>
      </div>
    `;
  }).join('');
}

function liveReadiness() {
  const bingx = appState.bingx || {};
  const telegram = appState.telegram || {};
  const health = appState.state?.health || {};
  const risk = localRiskSnapshot();
  const maxOpen = Number(bingx.maxOpenPositions || 0);
  const monthlyLimit = Number(bingx.maxMonthlyLossUSDT || 0);
  const maxSignalLeverage = Number(bingx.maxSignalLeverage || 0);
  const dryRunOk = bingx.dryRunRequired === false
    || Boolean(bingx.dryRunCompletedAt)
    || (appState.paperTrades || []).length > 0;

  const items = [
    {
      key: 'monitor',
      label: 'Monitor live leyendo',
      ok: Boolean(appState.state?.running && appState.state?.phase === 'live' && health.level === 'ok')
    },
    {
      key: 'telegram',
      label: 'Telegram activo',
      ok: Boolean(telegram.enabled && telegram.botTokenConfigured && telegram.chatId)
    },
    {
      key: 'bingx',
      label: 'API BingX validada',
      ok: Boolean(bingx.apiKeyConfigured && bingx.apiSecretConfigured)
    },
    {
      key: 'sl',
      label: 'Stop loss obligatorio',
      ok: Boolean(bingx.requireStopLoss)
    },
    {
      key: 'risk',
      label: 'Riesgo operativo configurado',
      ok: maxOpen > 0 && maxSignalLeverage > 0
    },
    {
      key: 'dry-run',
      label: 'Dry-run/test ya ejecutado',
      ok: dryRunOk
    },
    {
      key: 'capacity',
      label: 'No hay bloqueo local',
      ok: !(maxOpen > 0 && risk.openPositions >= maxOpen)
        && !(monthlyLimit > 0 && risk.monthlyPnl <= -Math.abs(monthlyLimit))
    }
  ];

  return {
    items,
    ready: items.every((item) => item.ok),
    live: bingx.mode === 'live' && bingx.liveConfirmed
  };
}

function renderLiveReadiness(readiness = liveReadiness()) {
  const missing = readiness.items.filter((item) => !item.ok).length;
  elements.liveReadinessStatus.textContent = readiness.live
    ? 'Live armado'
    : readiness.ready ? 'Listo' : `${missing} pendientes`;
  elements.liveReadinessStatus.className = amountClass(readiness.live || readiness.ready ? 1 : -1);
  elements.armLive.disabled = !readiness.ready || readiness.live;
  elements.disarmLive.disabled = !readiness.live && appState.bingx?.mode !== 'live';
  elements.liveReadinessList.innerHTML = readiness.items.map((item) => `
    <div class="live-check ${item.ok ? 'ok' : 'missing'}">
      <i data-lucide="${item.ok ? 'check' : 'x'}"></i>
      <span>${escapeHtml(item.label)}</span>
    </div>
  `).join('');
}

function renderHealthPanel() {
  const health = appState.state?.health || {};
  const feed = appState.state?.priceFeed || {};
  const level = health.level || 'idle';
  elements.healthStatus.textContent = healthStatusLabel(level);
  elements.healthStatus.className = amountClass(level === 'warn' ? -1 : level === 'ok' ? 1 : 0);
  const feedLabel = feed.connected
    ? `${feed.symbols?.length || 0} activos`
    : feed.enabled ? 'reconectando' : 'sin abiertas';
  elements.healthMetrics.innerHTML = [
    ['Ultima lectura', health.ageSeconds === null || health.ageSeconds === undefined ? '-' : `${health.ageSeconds}s`, health.stale ? 'negative' : ''],
    ['Posts visibles', String(health.visiblePosts ?? appState.state?.visiblePosts ?? 0), health.noVisiblePosts ? 'negative' : ''],
    ['WS precios', feedLabel, feed.connected ? 'positive' : feed.enabled ? 'negative' : ''],
    ['Mercado', feed.marketType ? 'Futuros USDⓈ' : '-', '']
  ].map(renderOpsMetric).join('');
}

function renderRiskPanel(openPositions = openPaperPositions(), closedPositions = closedPaperPositions()) {
  const risk = localRiskSnapshot(openPositions, closedPositions);
  const config = appState.bingx || {};
  const maxOpen = Number(config.maxOpenPositions || 0);
  const dailyLimit = Number(config.maxDailyLossUSDT || 0);
  const monthlyLimit = Number(config.maxMonthlyLossUSDT || 0);
  const blocked = (maxOpen > 0 && risk.openPositions >= maxOpen)
    || (dailyLimit > 0 && risk.dailyPnl <= -Math.abs(dailyLimit))
    || (monthlyLimit > 0 && risk.monthlyPnl <= -Math.abs(monthlyLimit));

  elements.riskStatus.textContent = blocked ? 'Bloqueo local activo' : 'Local dentro de limites';
  elements.riskStatus.className = amountClass(blocked ? -1 : 1);
  const dailyText = dailyLimit > 0
    ? `${formatUsdt(risk.dailyPnl)} / -${formatUsdt(dailyLimit)}`
    : `${formatUsdt(risk.dailyPnl)} / sin limite`;
  const monthlyText = monthlyLimit > 0
    ? `${formatUsdt(risk.monthlyPnl)} / -${formatUsdt(monthlyLimit)}`
    : `${formatUsdt(risk.monthlyPnl)} / sin limite`;

  elements.riskMetrics.innerHTML = [
    ['Abiertas local', `${risk.openPositions}/${maxOpen || '-'}`, maxOpen > 0 && risk.openPositions >= maxOpen ? 'negative' : ''],
    ['Exposicion local', formatUsdt(risk.openExposure), ''],
    ['PnL dia local', dailyText, risk.dailyPnl < 0 ? 'negative' : 'positive'],
    ['PnL mes local', monthlyText, risk.monthlyPnl < 0 ? 'negative' : 'positive']
  ].map(renderOpsMetric).join('');
}

function renderTickerPnl() {
  const { positions, label } = dashboardPositions();
  const rows = [...groupPositions(positions, (position) => position.symbol || '-').entries()]
    .map(([key, items]) => ({
      label: key.replace('-USDT', ''),
      value: roundPnl(items.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0)),
      count: items.length
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  elements.tickerPnlStatus.textContent = `${rows.length} tickers · ${label}`;
  elements.tickerPnlChart.innerHTML = renderAmountBars(rows, (row) => `${row.count} ops.`);
}

function renderDailyPnl() {
  const { positions, label } = dashboardPositions();
  const rows = [...groupPositions(positions, (position) => dayKeyFromValue(position.closedAt || position.openedAt)).entries()]
    .map(([key, items]) => ({
      label: key,
      value: roundPnl(items.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0)),
      count: items.length
    }))
    .filter((row) => row.label)
    .sort((a, b) => a.label.localeCompare(b.label));

  elements.dailyPnlStatus.textContent = `${rows.length} dias · ${label}`;
  if (!rows.length) {
    elements.dailyPnlGrid.innerHTML = '<div class="pnl-chart-empty">Sin dias con actividad.</div>';
    return;
  }

  elements.dailyPnlGrid.innerHTML = rows.map((row) => `
    <div class="daily-cell ${amountTone(row.value)}">
      <span>${escapeHtml(formatShortDay(row.label))}</span>
      <strong class="${amountClass(row.value)}">${escapeHtml(formatUsdt(row.value))}</strong>
      <small>${escapeHtml(row.count)} ops.</small>
    </div>
  `).join('');
}

function renderOpsMetric([label, value, className]) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong class="${escapeAttribute(className || '')}">${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderAmountBars(rows, metaFactory = () => '') {
  if (!rows.length) {
    return '<div class="pnl-chart-empty">Sin datos.</div>';
  }

  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(Number(row.value || 0))));
  return rows.map((row) => {
    const width = Math.max(4, Math.round((Math.abs(Number(row.value || 0)) / maxAbs) * 100));
    const meta = metaFactory(row);
    return `
      <div class="pnl-bar-row">
        <span>${escapeHtml(row.label)}</span>
        <div class="pnl-bar-track" aria-hidden="true">
          <div class="pnl-bar ${amountTone(row.value)}" style="width: ${escapeAttribute(width)}%"></div>
        </div>
        <strong class="${amountClass(row.value)}">${escapeHtml(formatUsdt(row.value))}${meta ? `<small>${escapeHtml(meta)}</small>` : ''}</strong>
      </div>
    `;
  }).join('');
}

function dashboardPositions() {
  const reference = currentReferenceLedger();
  const source = selectedPnlSource(pnlSourceCards(reference));
  const positions = positionsForPnlSource(source.key, reference);
  if (positions.length) {
    return {
      label: source.label,
      positions
    };
  }

  return {
    label: source.label,
    positions: simulationBaseSourcePositions().positions
  };
}

function performanceSourcePositions(key, reference = currentReferenceLedger(), source = null) {
  const resolvedSource = source || pnlSourceCards(reference).find((item) => item.key === key);
  const label = resolvedSource?.label || 'Rendimiento';
  const asset = resolvedSource?.asset || 'USDT';

  if (key === 'sheet') {
    const targetMonth = currentMonthKey();
    const historicalPositions = (appState.pnl?.historical?.positions || [])
      .filter((position) => monthKeyFromValue(position.closedAt || position.openedAt) === targetMonth && position.referenceLedger);
    return {
      key,
      label: reference?.label || appState.pnl?.historical?.source?.referenceLedger?.label || label,
      asset,
      positions: reference?.positions?.length ? reference.positions : historicalPositions
    };
  }

  return {
    key,
    label,
    asset,
    positions: positionsForPnlSource(key, reference)
  };
}

function performanceMonthlyRows(fallbackRows = []) {
  const reference = currentReferenceLedger();
  const source = selectedPerformanceSource(pnlSourceCards(reference));
  if (source.key === 'sheet') {
    return reference?.row ? [reference.row] : fallbackRows.filter((row) => row.month === currentMonthKey());
  }

  const positions = performanceSourcePositions(source.key, reference, source).positions;
  const byMonth = new Map();
  for (const position of positions) {
    const month = monthKeyFromValue(position.closedAt || position.openedAt) || currentMonthKey();
    const row = byMonth.get(month) || createPnlRow(month, source.asset || 'USDT', {});
    const pnl = Number(position.paperPnl ?? position.unrealizedPnl ?? position.realizedPnl ?? 0);
    row.total = roundPnl(row.total + pnl);
    row.paperPnl = roundPnl(row.paperPnl + pnl);
    if (position.status === 'closed') {
      row.realized = roundPnl(row.realized + Number(position.realizedPnl || pnl));
      row.paperRealized = row.realized;
      row.closedTrades += 1;
      row.closedPaperTrades += 1;
    } else {
      row.paperUnrealized = roundPnl(row.paperUnrealized + Number(position.unrealizedPnl ?? pnl));
      row.openPaperTrades += 1;
    }
    row.testOrders += 1;
    byMonth.set(month, row);
  }

  if (byMonth.size) {
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
  }

  if (source.month) {
    return [createPnlRow(source.month, source.asset || 'USDT', {
      total: source.total,
      realized: source.realized,
      paperPnl: source.total,
      paperRealized: source.realized,
      paperUnrealized: source.floating,
      closedTrades: source.closedTrades,
      testOrders: source.records || source.openPositions
    })];
  }

  return [];
}

function currentReferenceLedger() {
  const month = currentMonthKey();
  const source = appState.pnl?.historical?.source;
  if (source?.alignedMonth !== month || !source?.referenceLedger) {
    return null;
  }

  const row = (appState.pnl?.historical?.months || []).find((item) => item.month === month);
  const positions = (appState.pnl?.historical?.positions || [])
    .filter((position) => position.referenceLedger && monthKeyFromValue(position.closedAt || position.openedAt) === month);
  if (!row || !positions.length) {
    return null;
  }

  return {
    row: createPnlRow(row.month, row.asset, row),
    positions,
    label: source.referenceLedger.label || formatMonth(month),
    url: source.referenceLedger.url || ''
  };
}

function pnlRowsWithReferenceLedger(rows, reference = currentReferenceLedger()) {
  if (!reference?.row) {
    return rows;
  }
  return [
    reference.row,
    ...rows.filter((row) => row.month !== reference.row.month)
  ].sort((a, b) => b.month.localeCompare(a.month) || a.asset.localeCompare(b.asset));
}

function groupPositions(positions, keyFactory) {
  const groups = new Map();
  for (const position of positions || []) {
    const key = keyFactory(position);
    if (!key) {
      continue;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(position);
  }
  return groups;
}

function localRiskSnapshot(openPositions = openPaperPositions(), closedPositions = closedPaperPositions()) {
  const today = dayKeyFromValue(new Date());
  const month = currentMonthKey();
  const positions = [...openPositions, ...closedPositions];
  return {
    openPositions: openPositions.length,
    openExposure: roundPnl(openPositions.reduce((sum, position) => sum + Number(position.exposure || position.notional || 0), 0)),
    dailyPnl: roundPnl(positions
      .filter((position) => dayKeyFromValue(position.closedAt || position.openedAt) === today)
      .reduce((sum, position) => sum + Number(position.paperPnl || 0), 0)),
    monthlyPnl: roundPnl(positions
      .filter((position) => monthKeyFromValue(position.closedAt || position.openedAt) === month)
      .reduce((sum, position) => sum + Number(position.paperPnl || 0), 0))
  };
}

function healthStatusLabel(level) {
  if (level === 'ok') {
    return 'OK';
  }
  if (level === 'warn') {
    return 'Revisar';
  }
  return 'Inactivo';
}

function renderHistoricalPnl() {
  const targetMonth = currentMonthKey();
  const reference = currentReferenceLedger();
  const source = selectedPerformanceSource(pnlSourceCards(reference));
  const sourcePositions = performanceSourcePositions(source.key, reference, source);
  const asset = sourcePositions.asset || source.asset || 'USDT';
  const sourceLabel = sourcePositions.label || source.label || formatMonth(targetMonth);
  const monthLabel = formatMonth(targetMonth);
  const positions = (sourcePositions.positions || [])
    .filter((position) => monthKeyFromValue(position.closedAt || position.openedAt) === targetMonth);
  const rows = performanceMonthlyRows()
    .filter((row) => row.month === targetMonth)
    .map((row) => createPnlRow(row.month, row.asset || asset, row));
  const activeRows = rows
    .filter((row) => row.paperPnl || row.total || row.closedTrades || row.testOrders || row.openPaperTrades);
  const totals = summarizePnlRows(rows);
  const totalValue = totals.paperPnl || totals.total;
  const closedCount = positions.filter((position) => position.status === 'closed').length || totals.closedTrades || 0;
  const operationCount = positions.length || totals.testOrders || totals.records || 0;

  elements.historicalPnlTitle.textContent = `Historico ${source.label}: ${monthLabel}`;
  elements.historicalSignalTitle.textContent = `Señales ${source.label}`;
  elements.historicalPnlStatus.textContent = appState.pnlLoading && !activeRows.length ? 'Calculando...' : sourceLabel;
  elements.historicalPnlTotal.textContent = formatMoney(totalValue, asset);
  elements.historicalPnlTotal.className = amountClass(totalValue);
  elements.historicalPnlClosed.textContent = String(closedCount);
  elements.historicalPnlOpenSignals.textContent = String(operationCount);
  elements.historicalPnlMonths.textContent = activeRows.length ? sourceLabel : '-';
  elements.historicalPnlChart.innerHTML = renderPnlBars(activeRows);
  elements.historicalPnlTable.innerHTML = activeRows.map((row) => `
    <tr>
      <td>
        <strong>${escapeHtml(formatMonth(row.month))}</strong>
        <span>${escapeHtml(row.asset || 'USDT')}</span>
      </td>
      <td class="${amountClass(row.paperPnl || row.total)}">${escapeHtml(formatMoney(row.paperPnl || row.total, row.asset || asset))}</td>
      <td>${escapeHtml(row.closedTrades || 0)}</td>
      <td>${escapeHtml(row.testOrders || 0)}</td>
    </tr>
  `).join('');
  renderHistoricalSignals(positions, targetMonth, source.label, asset);
}

function renderHistoricalSignals(positions, targetMonth, sourceLabel = 'Google Sheet', asset = 'USDT') {
  const items = positions
    .filter((position) => monthKeyFromValue(position.closedAt || position.openedAt) === targetMonth)
    .sort((a, b) => Date.parse(b.closedAt || b.openedAt || 0) - Date.parse(a.closedAt || a.openedAt || 0));

  elements.historicalSignalStatus.textContent = `${items.length} señales`;
  if (!items.length) {
    elements.historicalSignalList.innerHTML = `<div class="empty-state compact">Sin señales en ${escapeHtml(sourceLabel)} para ${escapeHtml(formatMonth(targetMonth))}.</div>`;
    return;
  }

  elements.historicalSignalList.innerHTML = items.map((position) => renderHistoricalSignalItem(position, asset)).join('');
}

function renderHistoricalSignalItem(position, asset = 'USDT') {
  const postLink = position.postUrl
    ? `<a href="${escapeAttribute(position.postUrl)}" target="_blank" rel="noreferrer">Entrada</a>`
    : '';
  const closeLink = position.closePostUrl
    ? `<a href="${escapeAttribute(position.closePostUrl)}" target="_blank" rel="noreferrer">Cierre</a>`
    : '';
  const status = position.status === 'closed'
    ? `cerrada por ${closeReasonLabel(position.closeReason)}`
    : 'abierta';

  return `
    <article class="trade-history-item historical-signal-item">
      <div class="trade-history-main">
        <div>
          <strong>${escapeHtml(position.symbol || '-')}</strong>
          <span>${escapeHtml(`${position.direction || '-'} · ${status} · ${formatLeverage(position.leverage)}`)}</span>
        </div>
        <span class="${amountClass(position.paperPnl)}">${escapeHtml(formatMoney(position.paperPnl, asset))}</span>
      </div>
      <div class="trade-history-meta">
        <span>${escapeHtml(formatDateTime(position.closedAt || position.openedAt))}</span>
        <span>Entrada ${escapeHtml(formatPrice(position.entryPrice))}</span>
        <span>Cierre ${escapeHtml(formatPrice(position.closePrice))}</span>
        <span>SL ${escapeHtml(formatPrice(position.stopLoss))}</span>
        <span>${escapeHtml(formatMoney(position.notional, asset))}</span>
        ${postLink}
        ${closeLink}
      </div>
    </article>
  `;
}

function renderPnlBars(rows) {
  const orderedRows = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  if (!orderedRows.length) {
    return '<div class="pnl-chart-empty">Sin meses con actividad.</div>';
  }

  const maxAbs = Math.max(1, ...orderedRows.map((row) => Math.abs(Number(row.paperPnl || row.total || 0))));
  return orderedRows.map((row) => {
    const value = Number(row.paperPnl || row.total || 0);
    const width = Math.max(4, Math.round((Math.abs(value) / maxAbs) * 100));
    return `
      <div class="pnl-bar-row">
        <span>${escapeHtml(formatShortMonthYear(row.month))}</span>
        <div class="pnl-bar-track" aria-hidden="true">
          <div class="pnl-bar ${amountTone(value)}" style="width: ${escapeAttribute(width)}%"></div>
        </div>
        <strong class="${amountClass(value)}">${escapeHtml(formatMoney(value, row.asset || 'USDT'))}</strong>
      </div>
    `;
  }).join('');
}

function renderLineSvg(values, finalValue) {
  const width = 100;
  const height = 44;
  const padding = 4;
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;
  const coordinates = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = padding + ((maxValue - value) / range) * (height - padding * 2);
    return { x, y };
  });
  const points = coordinates.map((point) => `${roundPnl(point.x)},${roundPnl(point.y)}`).join(' ');
  const zeroY = padding + ((maxValue - 0) / range) * (height - padding * 2);
  const last = coordinates.at(-1) || { x: 0, y: zeroY };
  const first = coordinates[0] || { x: 0, y: zeroY };
  const areaPoints = `${points} ${roundPnl(last.x)},${roundPnl(zeroY)} ${roundPnl(first.x)},${roundPnl(zeroY)}`;

  return `
    <svg class="equity-svg ${amountTone(finalValue)}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Curva de PnL acumulado">
      <line class="equity-zero" x1="0" x2="${width}" y1="${roundPnl(zeroY)}" y2="${roundPnl(zeroY)}"></line>
      <polygon class="equity-area" points="${escapeAttribute(areaPoints)}"></polygon>
      <polyline class="equity-line" points="${escapeAttribute(points)}"></polyline>
      <circle class="equity-point" cx="${roundPnl(last.x)}" cy="${roundPnl(last.y)}" r="1.7"></circle>
    </svg>
  `;
}

function renderPnlRow(row) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(formatMonth(row.month))}</strong>
        <span>${escapeHtml(row.asset || 'USDT')}</span>
      </td>
      <td class="${amountClass(row.total)}">${escapeHtml(formatUsdt(row.total))}</td>
      <td class="${amountClass(row.realized)}">${escapeHtml(formatUsdt(row.realized))}</td>
      <td class="${amountClass(row.paperPnl)}">${escapeHtml(formatUsdt(row.paperPnl))}</td>
      <td class="${amountClass(row.fees)}">${escapeHtml(formatUsdt(row.fees))}</td>
      <td class="${amountClass(row.funding)}">${escapeHtml(formatUsdt(row.funding))}</td>
      <td class="${amountClass(row.adjustments)}">${escapeHtml(formatUsdt(row.adjustments))}</td>
      <td>${escapeHtml(row.closedTrades || 0)}</td>
      <td>${escapeHtml(row.testOrders || 0)}</td>
    </tr>
  `;
}

function renderOpenPositions(openPositions = openTradingPositions()) {
  elements.openPositionsStatus.textContent = `${openPositions.length} abiertas`;
  elements.openPositionsEmpty.classList.toggle('hidden', openPositions.length > 0);
  elements.openPositionsEmpty.textContent = `Sin posiciones abiertas en ${selectedPnlSource().label}.`;
  elements.openPositionsList.innerHTML = openPositions.map(renderOpenPositionCard).join('');
}

function renderOpenPositionCard(position) {
  const sideClass = escapeAttribute(String(position.direction || '').toLowerCase());
  const sourceLabel = position.source === 'demo'
    ? 'Demo VST'
    : position.source === 'live' ? 'Live real' : 'Paper';
  const pnl = Number(position.unrealizedPnl ?? position.paperPnl ?? 0);
  const liveClass = position.liveTickAt ? ' live-price' : '';
  const quantity = positionQuantity(position);
  const baseAsset = positionBaseAsset(position.symbol);
  const stopPrices = activeStopPrices(position);
  const stopSummary = stopPrices.length
    ? `Stops ${stopPrices.length}: ${stopPrices.map(formatPrice).join(', ')}`
    : 'Stops 0';
  const entryLabel = position.source === 'demo' || position.source === 'live'
    ? 'Entrada media'
    : 'Entrada';
  const quantityText = quantity > 0
    ? `Cantidad ${formatQuantity(quantity)} ${baseAsset}`
    : null;
  return `
    <article class="position-card ${sideClass}">
      <div class="position-card-top">
        <div>
          <span class="side ${sideClass}">${escapeHtml(position.direction || '-')}</span>
          <strong>${escapeHtml(position.symbol || '-')}</strong>
        </div>
        <span class="${amountClass(pnl)}${liveClass}">${escapeHtml(formatUsdt(pnl))}</span>
      </div>
      <div class="position-card-grid">
        <div>
          <span>${escapeHtml(entryLabel)}</span>
          <strong>${escapeHtml(formatPrice(position.entryPrice))}</strong>
        </div>
        <div>
          <span>Actual</span>
          <strong class="${liveClass.trim()}">${escapeHtml(formatPrice(position.currentPrice))}</strong>
        </div>
        <div>
          <span>Stop</span>
          <strong>${escapeHtml(formatPrice(position.stopLoss))}</strong>
        </div>
        <div>
          <span>Take profit</span>
          <strong>${escapeHtml(formatPrice(position.takeProfit))}</strong>
        </div>
      </div>
      <div class="position-card-footer">
        <span>${escapeHtml(sourceLabel)}</span>
        ${quantityText ? `<span>${escapeHtml(quantityText)}</span>` : ''}
        <span>${escapeHtml(formatLeverage(position.leverage))}</span>
        <span>Margen ${escapeHtml(formatUsdt(position.notional))}</span>
        <span>Exposicion ${escapeHtml(formatUsdt(position.exposure || position.notional))}</span>
        <span>${escapeHtml(stopSummary)}</span>
        <span>${escapeHtml(formatDuration(position.openedAt, position.closedAt))}</span>
      </div>
    </article>
  `;
}

function positionQuantity(position) {
  return Math.abs(Number(position.quantity || position.raw?.availableAmt || position.raw?.positionAmt || 0));
}

function positionBaseAsset(symbol) {
  const text = String(symbol || '').toUpperCase();
  return text.split(/[-/]/)[0] || 'CONTR.';
}

function activeStopPrices(position) {
  const orders = Array.isArray(position.protectiveOrders) ? position.protectiveOrders : [];
  return orders
    .filter((order) => String(order.status || '').toUpperCase() !== 'CANCELED')
    .filter((order) => String(order.type || '').toUpperCase().includes('STOP'))
    .map((order) => Number(order.stopPrice))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => b - a);
}

function openTradingPositions() {
  return positionsForPnlSource(selectedPnlSource().key).filter((position) => position.status === 'open');
}

function exchangePositionMode() {
  return appState.bingx?.mode === 'demo' || appState.bingx?.mode === 'live';
}

function positionsForPnlSource(key, reference = currentReferenceLedger()) {
  if (key === 'sheet') {
    return reference?.positions || [];
  }

  if (key === 'vst') {
    const liveCurrent = appState.bingx?.mode === 'demo' ? appState.exchangePositions || [] : [];
    return liveCurrent.length ? liveCurrent : appState.pnlSources?.positions?.vst || [];
  }

  if (key === 'live') {
    const liveCurrent = appState.bingx?.mode === 'live' ? appState.exchangePositions || [] : [];
    return liveCurrent.length ? liveCurrent : appState.pnlSources?.positions?.live || [];
  }

  return exchangePositionMode() ? openExchangePositions() : openPaperPositions();
}

function openExchangePositions() {
  return (appState.exchangePositions || [])
    .filter((position) => position.status === 'open')
    .sort((a, b) => Math.abs(Number(b.unrealizedPnl || b.paperPnl || 0)) - Math.abs(Number(a.unrealizedPnl || a.paperPnl || 0)));
}

function openPaperPositions() {
  return (appState.paperTrades || [])
    .filter((position) => position.status === 'open')
    .sort((a, b) => Math.abs(Number(b.paperPnl || 0)) - Math.abs(Number(a.paperPnl || 0)));
}

function closedPaperPositions() {
  return (appState.paperTrades || [])
    .filter((position) => position.status === 'closed');
}

function equityCurveItems(positions = appState.paperTrades || []) {
  const ordered = positions
    .filter((position) => Number.isFinite(Number(position.paperPnl)))
    .sort((a, b) => Date.parse(a.closedAt || a.openedAt || 0) - Date.parse(b.closedAt || b.openedAt || 0));
  let equity = 0;
  return ordered.map((position) => {
    const pnl = Number(position.paperPnl || 0);
    equity = roundPnl(equity + pnl);
    return {
      id: position.id,
      at: position.closedAt || position.openedAt,
      symbol: position.symbol,
      pnl,
      equity
    };
  });
}

function ensureSimulationDefault() {
  if (appState.simTouched || elements.pnlSimNotional.value) {
    return;
  }
  if (!simulationBaseSourcePositions().positions.length && appState.pnlLoading) {
    return;
  }
  const notional = averagePositionNotional() || Number(appState.bingx?.defaultNotionalUSDT || 0) || 10;
  elements.pnlSimNotional.value = String(Math.round(notional * 100) / 100);
}

function averagePositionNotional() {
  const notionals = filteredSimulationSource().positions
    .map((position) => Number(position.notional || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!notionals.length) {
    return 0;
  }
  return notionals.reduce((sum, value) => sum + value, 0) / notionals.length;
}

function renderSimulation() {
  renderSimulationFilters();
  const targetNotional = Number(elements.pnlSimNotional.value || 0);
  const source = filteredSimulationSource();
  const positions = simulatedPositions(targetNotional, source.positions);
  const total = positions.reduce((sum, position) => sum + position.paperPnl, 0);
  const realized = positions.reduce((sum, position) => sum + position.realizedPnl, 0);
  const floating = positions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
  const exposure = positions
    .filter((position) => position.status === 'open')
    .reduce((sum, position) => sum + position.exposure, 0);
  const metrics = calculateSimulationMetrics(positions);
  const asset = source.asset || 'USDT';

  elements.pnlSimSource.textContent = source.label;
  elements.pnlSimTotal.textContent = formatMoney(total, asset);
  elements.pnlSimTotal.className = amountClass(total);
  elements.pnlSimRealized.textContent = formatMoney(realized, asset);
  elements.pnlSimRealized.className = amountClass(realized);
  elements.pnlSimFloating.textContent = formatMoney(floating, asset);
  elements.pnlSimFloating.className = amountClass(floating);
  elements.pnlSimExposure.textContent = formatMoney(exposure, asset);
  elements.pnlSimMetrics.innerHTML = renderSimulationMetrics(metrics, asset);

  if (!positions.length) {
    elements.pnlSimList.innerHTML = '<div class="simulation-empty">Sin operaciones para simular.</div>';
    return;
  }

  elements.pnlSimList.innerHTML = positions
    .sort((a, b) => Math.abs(b.paperPnl) - Math.abs(a.paperPnl))
    .slice(0, 6)
    .map((position) => `
      <div class="simulation-row">
        <div>
          <strong>${escapeHtml(position.symbol || '-')}</strong>
          <span>${escapeHtml(position.status === 'open' ? 'abierta' : closeReasonLabel(position.closeReason))} · ${escapeHtml(formatLeverage(position.leverage))} · fee ${escapeHtml(formatMoney(position.fee || 0, asset))}</span>
        </div>
        <span class="${amountClass(position.paperPnl)}">${escapeHtml(formatMoney(position.paperPnl, asset))}</span>
      </div>
    `).join('');
}

function renderSimulationFilters() {
  const base = simulationBaseSourcePositions();
  const symbols = [...new Set(base.positions.map((position) => position.symbol).filter(Boolean))].sort();
  const signature = `${base.key || ''}|${symbols.join('|')}`;
  if (elements.pnlSimSymbol.dataset.options === signature) {
    return;
  }

  const selected = elements.pnlSimSymbol.value || 'ALL';
  elements.pnlSimSymbol.innerHTML = [
    '<option value="ALL">Todos</option>',
    ...symbols.map((symbol) => `<option value="${escapeAttribute(symbol)}">${escapeHtml(symbol.replace('-USDT', ''))}</option>`)
  ].join('');
  elements.pnlSimSymbol.value = symbols.includes(selected) ? selected : 'ALL';
  elements.pnlSimSymbol.dataset.options = signature;
}

function simulationBaseSourcePositions() {
  const reference = currentReferenceLedger();
  const source = selectedPerformanceSource(pnlSourceCards(reference));
  return performanceSourcePositions(source.key, reference, source);
}

function filteredSimulationSource() {
  const base = simulationBaseSourcePositions();
  const symbol = elements.pnlSimSymbol.value || 'ALL';
  const side = elements.pnlSimSide.value || 'ALL';
  const outcome = elements.pnlSimOutcome.value || 'ALL';
  const positions = base.positions.filter((position) => {
    if (symbol !== 'ALL' && position.symbol !== symbol) {
      return false;
    }
    if (side !== 'ALL' && position.direction !== side) {
      return false;
    }
    if (outcome === 'WIN' && Number(position.paperPnl || 0) <= 0) {
      return false;
    }
    if (outcome === 'LOSS' && Number(position.paperPnl || 0) >= 0) {
      return false;
    }
    if (outcome === 'OPEN' && position.status !== 'open') {
      return false;
    }
    return true;
  });

  const filterParts = [
    symbol !== 'ALL' ? symbol.replace('-USDT', '') : '',
    side !== 'ALL' ? side : '',
    outcome !== 'ALL' ? outcomeLabel(outcome) : ''
  ].filter(Boolean);

  return {
    key: base.key,
    label: filterParts.length ? `${base.label} · ${filterParts.join(' · ')}` : base.label,
    asset: base.asset || 'USDT',
    positions
  };
}

function simulatedPositions(targetNotional, sourcePositions = filteredSimulationSource().positions) {
  if (!Number.isFinite(targetNotional) || targetNotional <= 0) {
    return [];
  }
  return sourcePositions.map((position) => {
    const originalNotional = Number(position.notional || 0);
    const scale = originalNotional > 0 ? targetNotional / originalNotional : 0;
    const originalLeverage = Number(position.leverage || 1);
    const leverageOverride = Number(elements.pnlSimLeverage.value || 0);
    const leverage = Number.isFinite(leverageOverride) && leverageOverride > 0 ? leverageOverride : originalLeverage;
    const leverageScale = originalLeverage > 0 ? leverage / originalLeverage : 1;
    const feeRate = Math.max(0, Number(elements.pnlSimFee.value || 0)) / 100;
    const exposure = roundPnl(targetNotional * leverage);
    const fee = roundPnl(exposure * feeRate);
    const grossPaperPnl = roundPnl(Number(position.paperPnl || 0) * scale * leverageScale);
    const grossRealizedPnl = roundPnl(Number(position.realizedPnl || 0) * scale * leverageScale);
    const grossUnrealizedPnl = roundPnl(Number(position.unrealizedPnl || 0) * scale * leverageScale);
    const isOpen = position.status === 'open';
    const netPaperPnl = roundPnl(grossPaperPnl - fee);
    return {
      ...position,
      notional: targetNotional,
      leverage,
      exposure,
      fee,
      grossPaperPnl,
      paperPnl: netPaperPnl,
      realizedPnl: isOpen ? 0 : roundPnl(grossRealizedPnl - fee),
      unrealizedPnl: isOpen ? roundPnl(grossUnrealizedPnl - fee) : 0
    };
  });
}

function calculateSimulationMetrics(positions) {
  const closed = positions.filter((position) => position.status === 'closed');
  const wins = closed.filter((position) => Number(position.paperPnl || 0) > 0);
  const losses = closed.filter((position) => Number(position.paperPnl || 0) < 0);
  const total = positions.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0);
  const grossProfit = wins.reduce((sum, position) => sum + Number(position.paperPnl || 0), 0);
  const grossLoss = losses.reduce((sum, position) => sum + Math.abs(Number(position.paperPnl || 0)), 0);
  const values = [0, ...equityCurveItems(positions).map((item) => item.equity)];
  const drawdown = calculateMaxDrawdown(values);
  const capital = Number(elements.pnlSimCapital.value || 0);

  return {
    operations: positions.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Number.POSITIVE_INFINITY : null),
    average: positions.length ? total / positions.length : 0,
    best: Math.max(0, ...positions.map((position) => Number(position.paperPnl || 0))),
    worst: Math.min(0, ...positions.map((position) => Number(position.paperPnl || 0))),
    drawdown,
    roi: Number.isFinite(capital) && capital > 0 ? (total / capital) * 100 : null,
    fees: positions.reduce((sum, position) => sum + Number(position.fee || 0), 0)
  };
}

function renderSimulationMetrics(metrics, asset = 'USDT') {
  return [
    ['Ops.', String(metrics.operations || 0), ''],
    ['Win rate', formatPercent(metrics.winRate), ''],
    ['Profit factor', formatRatio(metrics.profitFactor), ''],
    ['Media', formatMoney(metrics.average, asset), amountClass(metrics.average)],
    ['Mejor', formatMoney(metrics.best, asset), amountClass(metrics.best)],
    ['Peor', formatMoney(metrics.worst, asset), amountClass(metrics.worst)],
    ['Drawdown', formatMoney(-metrics.drawdown, asset), amountClass(-metrics.drawdown)],
    ['ROI', formatPercent(metrics.roi), amountClass(metrics.roi)]
  ].map(([label, value, className]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong class="${escapeAttribute(className)}">${escapeHtml(value)}</strong>
    </div>
  `).join('');
}

function calculateMaxDrawdown(values) {
  let peak = values[0] || 0;
  let drawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    drawdown = Math.max(drawdown, peak - value);
  }
  return drawdown;
}

function renderOpenPositionRow(position) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(position.symbol || '-')}</strong>
        <span>${escapeHtml(formatUsdt(position.notional))} · exp. ${escapeHtml(formatUsdt(position.exposure || position.notional))}</span>
      </td>
      <td><span class="side ${escapeAttribute(String(position.direction || '').toLowerCase())}">${escapeHtml(position.direction || '-')}</span></td>
      <td>${escapeHtml(formatLeverage(position.leverage))}</td>
      <td>${escapeHtml(formatPrice(position.entryPrice))}</td>
      <td>${escapeHtml(formatPrice(position.currentPrice))}</td>
      <td>${escapeHtml(formatPrice(position.stopLoss))}</td>
      <td>${escapeHtml(formatPrice(position.takeProfit))}</td>
      <td class="${amountClass(position.paperPnl)}">${escapeHtml(formatUsdt(position.paperPnl))}</td>
      <td>${escapeHtml(formatDuration(position.openedAt, position.closedAt))}</td>
    </tr>
  `;
}

function renderTradeHistory() {
  const items = tradeHistoryItems();
  elements.tradeHistoryStatus.textContent = `${items.length} eventos`;
  elements.tradeHistoryEmpty.classList.toggle('hidden', items.length > 0);
  elements.tradeHistoryList.innerHTML = items.map(renderTradeHistoryItem).join('');
}

function renderTradeHistoryItem(item) {
  const postLink = item.postUrl
    ? `<a href="${escapeAttribute(item.postUrl)}" target="_blank" rel="noreferrer">Post</a>`
    : '';
  const closeText = item.closeReason ? `Cierre: ${closeReasonLabel(item.closeReason)}` : item.reason || '';

  return `
    <article class="trade-history-item">
      <div class="trade-history-main">
        <div>
          <strong>${escapeHtml(item.symbol || 'Senal')}</strong>
          <span>${escapeHtml(`${item.direction || '-'} · ${item.statusLabel}`)}</span>
        </div>
        <span class="${amountClass(item.pnl)}">${escapeHtml(formatUsdt(item.pnl))}</span>
      </div>
      <div class="trade-history-meta">
        <span>${escapeHtml(formatDateTime(item.at))}</span>
        <span>Entrada ${escapeHtml(formatPrice(item.entryPrice))}</span>
        <span>SL ${escapeHtml(formatPrice(item.stopLoss))}</span>
        <span>${escapeHtml(closeText)}</span>
        ${postLink}
      </div>
    </article>
  `;
}

function renderTelegram(telegram = appState.telegram, message = '') {
  if (!telegram) {
    return;
  }

  appState.telegram = telegram;
  elements.telegramEnabled.checked = Boolean(telegram.enabled);
  elements.telegramBackfill.checked = Boolean(telegram.notifyBackfill);
  elements.telegramHealth.checked = telegram.notifyHealth !== false;
  elements.telegramHealthMinutes.value = telegram.healthStaleMinutes || 3;
  elements.telegramChatId.value = telegram.chatId || '';
  elements.telegramToken.value = '';
  elements.telegramToken.placeholder = telegram.botTokenConfigured
    ? `Token guardado ${telegram.botTokenPreview}`
    : '123456:ABC...';

  const ready = telegram.enabled && telegram.botTokenConfigured && telegram.chatId;
  elements.telegramStatus.textContent = message || (ready ? 'Telegram activo' : 'Sin configurar');
  elements.telegramStatus.classList.toggle('ok', Boolean(message) || Boolean(ready));
  elements.telegramStatus.classList.toggle('warn', telegram.enabled && !ready);
}

async function saveTelegramConfig() {
  const payload = {
    enabled: elements.telegramEnabled.checked,
    chatId: elements.telegramChatId.value,
    notifyBackfill: elements.telegramBackfill.checked,
    notifyHealth: elements.telegramHealth.checked,
    healthStaleMinutes: Number(elements.telegramHealthMinutes.value)
  };

  if (elements.telegramToken.value.trim()) {
    payload.botToken = elements.telegramToken.value.trim();
  }

  const response = await putJson('/api/telegram', payload);
  appState.telegram = response.telegram;
  return response.telegram;
}

function renderBingx(bingx = appState.bingx, message = '') {
  if (!bingx) {
    return;
  }

  appState.bingx = bingx;
  elements.bingxEnabled.checked = Boolean(bingx.enabled);
  elements.bingxMode.value = bingx.mode || 'test';
  elements.bingxMargin.value = bingx.marginType || 'ISOLATED';
  elements.bingxApiKey.value = '';
  elements.bingxApiSecret.value = '';
  elements.bingxApiKey.placeholder = bingx.apiKeyConfigured ? `API key guardada ${bingx.apiKeyPreview}` : 'BingX API key';
  elements.bingxApiSecret.placeholder = bingx.apiSecretConfigured ? `Secret guardado ${bingx.apiSecretPreview}` : 'BingX API secret';
  elements.bingxNotional.value = bingx.defaultNotionalUSDT || 10;
  elements.bingxMaxNotional.value = bingx.maxNotionalUSDT || 25;
  elements.bingxMaxLeverage.value = bingx.maxLeverage || 5;
  elements.bingxSymbols.value = bingx.allowedSymbols || '';
  elements.bingxRequireSl.checked = Boolean(bingx.requireStopLoss);
  elements.bingxMaxOpen.value = bingx.maxOpenPositions || 5;
  elements.bingxMaxSignalLeverage.value = bingx.maxSignalLeverage || 125;
  elements.bingxVstBaseCapital.value = bingx.vstBaseCapital || 1000;
  elements.bingxVstCapitalPercent.value = bingx.vstCapitalPercent || 15;
  elements.bingxDailyLoss.value = bingx.maxDailyLossUSDT ?? 100;
  elements.bingxMonthlyLoss.value = bingx.maxMonthlyLossUSDT ?? 500;
  elements.bingxDryRunRequired.checked = bingx.dryRunRequired !== false;
  elements.bingxLiveConfirm.checked = Boolean(bingx.liveConfirmed);
  elements.bingxLiveConfirmRow.classList.toggle('hidden', elements.bingxMode.value !== 'live');

  const ready = bingx.enabled && bingx.apiKeyConfigured && bingx.apiSecretConfigured && (bingx.mode !== 'live' || bingx.liveConfirmed);
  const modeLabel = bingxModeLabel(bingx.mode);
  elements.bingxStatus.textContent = message || (ready ? `${modeLabel} activo` : `${modeLabel} desactivado`);
  elements.bingxStatus.classList.toggle('ok', Boolean(message) || Boolean(ready && bingx.mode !== 'live'));
  elements.bingxStatus.classList.toggle('warn', bingx.mode === 'live' && (ready || bingx.enabled));
}

async function saveBingxConfig() {
  const payload = {
    enabled: elements.bingxEnabled.checked,
    mode: elements.bingxMode.value,
    marginType: elements.bingxMargin.value,
    defaultNotionalUSDT: Number(elements.bingxNotional.value),
    maxNotionalUSDT: Number(elements.bingxMaxNotional.value),
    maxLeverage: Number(elements.bingxMaxLeverage.value),
    allowedSymbols: elements.bingxSymbols.value,
    requireStopLoss: elements.bingxRequireSl.checked,
    maxOpenPositions: Number(elements.bingxMaxOpen.value),
    maxSignalLeverage: Number(elements.bingxMaxSignalLeverage.value),
    vstBaseCapital: Number(elements.bingxVstBaseCapital.value),
    vstCapitalPercent: Number(elements.bingxVstCapitalPercent.value),
    maxDailyLossUSDT: Number(elements.bingxDailyLoss.value),
    maxMonthlyLossUSDT: Number(elements.bingxMonthlyLoss.value),
    dryRunRequired: elements.bingxDryRunRequired.checked,
    liveConfirmed: elements.bingxLiveConfirm.checked
  };

  if (elements.bingxApiKey.value.trim()) {
    payload.apiKey = elements.bingxApiKey.value.trim();
  }
  if (elements.bingxApiSecret.value.trim()) {
    payload.apiSecret = elements.bingxApiSecret.value.trim();
  }

  const response = await putJson('/api/bingx', payload);
  appState.bingx = response.bingx;
  return response.bingx;
}

function upsertPaperTrade(position) {
  const index = appState.paperTrades.findIndex((item) => item.id === position.id || item.clientOrderId === position.clientOrderId);
  if (index >= 0) {
    appState.paperTrades[index] = { ...appState.paperTrades[index], ...position };
  } else {
    appState.paperTrades.unshift(position);
  }
}

function removeExchangePosition(position) {
  const key = exchangePositionKey(position);
  appState.exchangePositions = (appState.exchangePositions || [])
    .filter((item) => exchangePositionKey(item) !== key);
}

function exchangePositionKey(position) {
  return [
    position?.id,
    position?.symbol,
    position?.direction,
    position?.raw?.positionId,
    position?.raw?.positionID
  ].filter(Boolean).join(':');
}

function applyExchangePriceTick(tick) {
  const symbol = normalizeTradeSymbol(tick?.symbol);
  const price = Number(tick?.price);
  if (!symbol || !Number.isFinite(price) || price <= 0) {
    return false;
  }

  let changed = false;
  appState.exchangePositions = (appState.exchangePositions || []).map((position) => {
    if (position.status !== 'open' || normalizeTradeSymbol(position.symbol) !== symbol) {
      return position;
    }
    changed = true;
    return recalculateExchangePosition(position, price, tick.at);
  });
  return changed;
}

function recalculateExchangePosition(position, currentPrice, tickAt) {
  const quantity = Math.abs(Number(position.quantity || position.raw?.availableAmt || position.raw?.positionAmt || 0));
  const entryPrice = Number(position.entryPrice);
  const leverage = Number(position.leverage || 0);
  const exposure = Number.isFinite(quantity) ? roundPnl(quantity * currentPrice) : Number(position.exposure || 0);
  const notional = leverage > 0 ? roundPnl(exposure / leverage) : exposure;
  const direction = String(position.direction || '').toUpperCase();
  const priceMove = direction === 'SHORT'
    ? entryPrice - currentPrice
    : currentPrice - entryPrice;
  const unrealizedPnl = Number.isFinite(priceMove) && Number.isFinite(quantity)
    ? roundPnl(priceMove * quantity)
    : Number(position.unrealizedPnl || position.paperPnl || 0);

  return {
    ...position,
    currentPrice,
    exposure,
    notional,
    unrealizedPnl,
    paperPnl: unrealizedPnl,
    liveTickAt: tickAt || new Date().toISOString()
  };
}

function normalizeTradeSymbol(value) {
  const text = String(value || '').trim().toUpperCase();
  if (!text) {
    return '';
  }
  if (text.includes('-')) {
    return text;
  }
  if (text.includes('/')) {
    return text.replace('/', '-');
  }
  return text.endsWith('USDT') ? `${text.slice(0, -4)}-USDT` : text;
}

function tradeHistoryItems() {
  const paperIds = new Set((appState.paperTrades || []).map((position) => position.id).filter(Boolean));
  const exchangeItems = (appState.exchangePositions || []).map((position) => ({
    kind: 'exchange',
    id: position.id,
    at: position.openedAt || new Date().toISOString(),
    symbol: position.symbol,
    direction: position.direction,
    statusLabel: position.source === 'demo' ? 'Demo VST abierta' : 'Live abierta',
    entryPrice: position.entryPrice,
    stopLoss: position.stopLoss,
    pnl: position.unrealizedPnl,
    closeReason: '',
    reason: '',
    postUrl: ''
  }));
  const paperItems = (appState.paperTrades || []).map((position) => ({
    kind: 'paper',
    id: position.id,
    at: position.closedAt || position.openedAt,
    symbol: position.symbol,
    direction: position.direction,
    statusLabel: position.status === 'open' ? 'paper abierta' : `paper ${closeReasonLabel(position.closeReason)}`,
    entryPrice: position.entryPrice,
    stopLoss: position.stopLoss,
    pnl: position.paperPnl,
    closeReason: position.closeReason,
    reason: '',
    postUrl: position.postUrl
  }));

  const eventItems = (appState.trades || [])
    .filter((event) => !event.paperPosition || !paperIds.has(event.paperPosition.id))
    .map((event) => ({
      kind: 'event',
      id: `${event.at}:${event.signal?.symbol || event.status}`,
      at: event.at,
      symbol: event.signal?.symbol || '',
      direction: event.signal?.direction || '',
      statusLabel: tradeStatusLabel(event.status),
      entryPrice: event.signal?.entry?.price || null,
      stopLoss: event.signal?.stopLoss || null,
      pnl: 0,
      closeReason: '',
      reason: event.reason ? reasonLabel(event.reason) : '',
      postUrl: event.postUrl
    }));

  return [...exchangeItems, ...paperItems, ...eventItems]
    .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0))
    .slice(0, 8);
}

function pnlRowsWithLocalTrades(rows) {
  const normalized = rows.map((row) => createPnlRow(row.month, row.asset, row));
  const hasServerPaper = normalized.some((row) => row.paperPnl || row.testOrders || row.openPaperTrades || row.closedPaperTrades);
  if (!hasServerPaper) {
    normalized.push(...localPaperRows());
  }
  return normalized
    .sort((a, b) => b.month.localeCompare(a.month) || a.asset.localeCompare(b.asset));
}

function localPaperRows() {
  const rows = new Map();
  const currentMonth = currentMonthKey();
  for (const position of appState.paperTrades || []) {
    const month = position.status === 'open'
      ? currentMonth
      : monthKeyFromValue(position.closedAt || position.openedAt);
    if (!month) {
      continue;
    }
    const row = rows.get(month) || createPnlRow(month, 'USDT', {});
    row.testOrders += 1;
    if (position.status === 'closed') {
      row.closedPaperTrades += 1;
      row.closedTrades += 1;
      row.paperRealized = roundPnl(row.paperRealized + Number(position.realizedPnl || position.paperPnl || 0));
    } else {
      row.openPaperTrades += 1;
      row.paperUnrealized = roundPnl(row.paperUnrealized + Number(position.unrealizedPnl || position.paperPnl || 0));
    }
    row.paperPnl = roundPnl(row.paperRealized + row.paperUnrealized);
    row.realized = row.paperRealized;
    row.total = row.paperPnl;
    rows.set(month, row);
  }
  return [...rows.values()];
}

function createPnlRow(month, asset = 'USDT', row = {}) {
  return {
    month,
    asset: asset || 'USDT',
    total: Number(row.total || 0),
    realized: Number(row.realized || 0),
    fees: Number(row.fees || 0),
    funding: Number(row.funding || 0),
    adjustments: Number(row.adjustments || 0),
    paperPnl: Number(row.paperPnl || 0),
    paperRealized: Number(row.paperRealized || 0),
    paperUnrealized: Number(row.paperUnrealized || 0),
    openPaperTrades: Number(row.openPaperTrades || 0),
    closedPaperTrades: Number(row.closedPaperTrades || 0),
    closedTrades: Number(row.closedTrades || 0),
    records: Number(row.records || 0),
    testOrders: Number(row.testOrders || 0),
    liveOrders: Number(row.liveOrders || 0)
  };
}

function summarizePnlRows(rows) {
  return rows.reduce((summary, row) => ({
    total: roundPnl(summary.total + row.total),
    realized: roundPnl(summary.realized + row.realized),
    fees: roundPnl(summary.fees + row.fees),
    funding: roundPnl(summary.funding + row.funding),
    adjustments: roundPnl(summary.adjustments + row.adjustments),
    paperPnl: roundPnl(summary.paperPnl + row.paperPnl),
    paperRealized: roundPnl(summary.paperRealized + row.paperRealized),
    paperUnrealized: roundPnl(summary.paperUnrealized + row.paperUnrealized),
    openPaperTrades: summary.openPaperTrades + row.openPaperTrades,
    closedPaperTrades: summary.closedPaperTrades + row.closedPaperTrades,
    closedTrades: summary.closedTrades + row.closedTrades,
    testOrders: summary.testOrders + row.testOrders,
    liveOrders: summary.liveOrders + row.liveOrders,
    records: summary.records + row.records
  }), {
    total: 0,
    realized: 0,
    fees: 0,
    funding: 0,
    adjustments: 0,
    paperPnl: 0,
    paperRealized: 0,
    paperUnrealized: 0,
    openPaperTrades: 0,
    closedPaperTrades: 0,
    closedTrades: 0,
    testOrders: 0,
    liveOrders: 0,
    records: 0
  });
}

function currentMonthKey() {
  return monthKeyFromValue(new Date());
}

function monthKeyFromValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKeyFromValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonth(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  if (!year || !month) {
    return value || '-';
  }
  return new Intl.DateTimeFormat('es', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
}

function formatShortMonth(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  if (!year || !month) {
    return value || '-';
  }
  return new Intl.DateTimeFormat('es', {
    month: 'short'
  }).format(new Date(year, month - 1, 1)).replace('.', '');
}

function formatShortMonthYear(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  if (!year || !month) {
    return value || '-';
  }
  const monthLabel = new Intl.DateTimeFormat('es', {
    month: 'short'
  }).format(new Date(year, month - 1, 1)).replace('.', '');
  return `${monthLabel} ${String(year).slice(2)}`;
}

function formatShortDay(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) {
    return value || '-';
  }
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(year, month - 1, day)).replace('.', '');
}

function formatSourceMoney(value, source) {
  return formatMoney(value, source?.asset || 'USDT');
}

function formatUsdt(value) {
  return formatMoney(value, 'USDT');
}

function formatMoney(value, asset = 'USDT') {
  return `${Number(value || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })} ${asset || 'USDT'}`;
}

function formatPercent(value) {
  if (value == null) {
    return '-';
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  return `${number.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })}%`;
}

function formatRatio(value) {
  if (value === Number.POSITIVE_INFINITY) {
    return '∞';
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  return number.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return '-';
  }
  return number.toLocaleString('es-ES', {
    minimumFractionDigits: number < 1 ? 4 : 2,
    maximumFractionDigits: number < 1 ? 8 : 4
  });
}

function formatQuantity(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return '-';
  }
  return number.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: number < 1 ? 6 : 4
  });
}

function formatLeverage(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return '-';
  }
  return `${number}x`;
}

function formatDuration(startValue, endValue) {
  if (!startValue) {
    return '-';
  }

  const start = Date.parse(startValue);
  const end = endValue ? Date.parse(endValue) : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '-';
  }

  const minutes = Math.floor((end - start) / unitMs.minute);
  if (minutes < 1) {
    return '<1 min';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function closeReasonLabel(value) {
  return {
    take_profit: 'TP',
    stop_loss: 'SL',
    manual: 'manual',
    youtube_close: 'YouTube',
    youtube_close_partial: 'YouTube parcial'
  }[value] || 'cerrada';
}

function tradeStatusLabel(value) {
  return {
    demo_order_sent: 'demo VST enviada',
    demo_close_sent: 'cierre demo VST',
    demo_close_no_position: 'demo sin posicion',
    demo_sl_be_detected: 'SL BE demo detectado',
    test_order_sent: 'test enviada',
    live_order_sent: 'live enviada',
    live_close_sent: 'cierre live enviado',
    live_close_no_position: 'live sin posicion',
    live_sl_be_detected: 'SL BE live detectado',
    exchange_stop_closed: 'stop BingX cerrado',
    exchange_signal_closed: 'cierre BingX ejecutado',
    exchange_position_closed: 'posicion BingX cerrada',
    paper_close_sent: 'cierre paper',
    paper_price_close: 'cierre por precio',
    paper_sl_be_sent: 'SL a BE paper',
    close_signal_detected: 'cierre detectado',
    move_sl_be_detected: 'SL BE detectado',
    blocked: 'bloqueada',
    skipped: 'saltada'
  }[value] || value || '-';
}

function bingxModeLabel(value) {
  return {
    test: 'Test order',
    demo: 'Demo VST',
    live: 'Live real'
  }[value] || 'Test order';
}

function outcomeLabel(value) {
  return {
    WIN: 'Ganadoras',
    LOSS: 'Perdedoras',
    OPEN: 'Abiertas'
  }[value] || value || '';
}

function reasonLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replaceAll(':', ': ');
}

function amountClass(value) {
  const number = Number(value || 0);
  if (number > 0) {
    return 'amount positive';
  }
  if (number < 0) {
    return 'amount negative';
  }
  return 'amount';
}

function amountTone(value) {
  const number = Number(value || 0);
  if (number > 0) {
    return 'positive';
  }
  if (number < 0) {
    return 'negative';
  }
  return 'neutral';
}

function calculateWinRate(positions) {
  const closed = positions.filter((position) => Number.isFinite(Number(position.paperPnl)));
  if (!closed.length) {
    return null;
  }
  const winners = closed.filter((position) => Number(position.paperPnl || 0) > 0).length;
  return (winners / closed.length) * 100;
}

function roundPnl(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100000000) / 100000000;
}

function switchView(view) {
  const posts = view === 'posts';
  const logs = view === 'logs';
  const pnl = view === 'pnl';
  elements.postsTab.classList.toggle('active', posts);
  elements.logsTab.classList.toggle('active', logs);
  elements.pnlTab.classList.toggle('active', pnl);
  elements.postsView.classList.toggle('hidden', !posts);
  elements.logsView.classList.toggle('hidden', !logs);
  elements.pnlView.classList.toggle('hidden', !pnl);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return data;
}

async function putJson(url, payload) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return data;
}

async function runAction(action) {
  clearClientError();
  try {
    await action();
  } catch (error) {
    showClientError(error.message);
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return data;
}

function phaseLabel(phase) {
  return {
    backfill: 'Leyendo historico',
    live: 'Monitor activo',
    idle: 'Inactivo'
  }[phase] || phase;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(date);
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function showClientError(message) {
  elements.clientError.textContent = message;
  elements.clientError.classList.remove('hidden');
}

function clearClientError() {
  elements.clientError.textContent = '';
  elements.clientError.classList.add('hidden');
}

function comparePostsNewestFirst(a, b) {
  const aAge = relativeAgeMs(a.publishedText);
  const bAge = relativeAgeMs(b.publishedText);

  if (Number.isFinite(aAge) && Number.isFinite(bAge) && aAge !== bAge) {
    return aAge - bAge;
  }

  if (Number.isFinite(aAge) !== Number.isFinite(bAge)) {
    return Number.isFinite(aAge) ? -1 : 1;
  }

  const aSeen = Date.parse(a.firstSeenAt || 0);
  const bSeen = Date.parse(b.firstSeenAt || 0);
  return bSeen - aSeen;
}

function relativeAgeMs(value) {
  const text = normalizeRelativeText(value);
  if (!text) {
    return Number.POSITIVE_INFINITY;
  }

  if (/^(ahora|just now|now)$/.test(text)) {
    return 0;
  }

  if (text === 'ayer' || text === 'yesterday') {
    return unitMs.day;
  }

  const spanish = text.match(/hace\s+(un|una|uno|\d+)\s+([a-z]+)/);
  const english = text.match(/(a|an|one|\d+)\s+([a-z]+)\s+ago/);
  const match = spanish || english;
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  return parseAmount(match[1]) * unitFromText(match[2]);
}

function normalizeRelativeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(value) {
  return /^(un|una|uno|a|an|one)$/.test(value) ? 1 : Number(value);
}

function unitFromText(value) {
  const unit = value.toLowerCase();
  if (/^seg|^sec|^second/.test(unit)) {
    return unitMs.second;
  }
  if (/^min|^minute/.test(unit)) {
    return unitMs.minute;
  }
  if (/^hora|^hour/.test(unit)) {
    return unitMs.hour;
  }
  if (/^dia|^day/.test(unit)) {
    return unitMs.day;
  }
  if (/^semana|^week/.test(unit)) {
    return unitMs.week;
  }
  if (/^mes|^month/.test(unit)) {
    return unitMs.month;
  }
  if (/^ano|^year/.test(unit)) {
    return unitMs.year;
  }
  return Number.POSITIVE_INFINITY;
}

const unitMs = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
};
