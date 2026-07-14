const elements = {
  toolPanel: document.querySelector('#tool-panel'),
  toggleControls: document.querySelector('#toggle-controls'),
  headerSourceStatus: document.querySelector('#header-source-status'),
  headerModeStatus: document.querySelector('#header-mode-status'),
  headerModeChip: document.querySelector('#header-mode-chip'),
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
  restartBackend: document.querySelector('#restart-backend'),
  metricTotal: document.querySelector('#metric-total'),
  metricVisible: document.querySelector('#metric-visible'),
  metricLast: document.querySelector('#metric-last'),
  postsTab: document.querySelector('#posts-tab'),
  logsTab: document.querySelector('#logs-tab'),
  pnlTab: document.querySelector('#pnl-tab'),
  postsActions: document.querySelector('#posts-actions'),
  postsView: document.querySelector('#posts-view'),
  logsView: document.querySelector('#logs-view'),
  pnlView: document.querySelector('#pnl-view'),
  postsList: document.querySelector('#posts-list'),
  emptyPosts: document.querySelector('#empty-posts'),
  postsPagination: document.querySelector('#posts-pagination'),
  postsPaginationStatus: document.querySelector('#posts-pagination-status'),
  postsLoadMore: document.querySelector('#posts-load-more'),
  logsList: document.querySelector('#logs-list'),
  logsPagination: document.querySelector('#logs-pagination'),
  logsPaginationStatus: document.querySelector('#logs-pagination-status'),
  logsLoadMore: document.querySelector('#logs-load-more'),
  refreshPnl: document.querySelector('#refresh-pnl'),
  monthReset: document.querySelector('#month-reset'),
  monthResetStatus: document.querySelector('#month-reset-status'),
  pnlStatus: document.querySelector('#pnl-status'),
  pnlSourceGrid: document.querySelector('#pnl-source-grid'),
  reliabilityPanel: document.querySelector('#reliability-panel'),
  reliabilityStatus: document.querySelector('#reliability-status'),
  reliabilitySummary: document.querySelector('#reliability-summary'),
  reliabilityCriteria: document.querySelector('#reliability-criteria'),
  costControlPanel: document.querySelector('#cost-control-panel'),
  costControlStatus: document.querySelector('#cost-control-status'),
  costControlSummary: document.querySelector('#cost-control-summary'),
  costControlSymbols: document.querySelector('#cost-control-symbols'),
  costControlShadow: document.querySelector('#cost-control-shadow'),
  costControlActions: document.querySelector('#cost-control-actions'),
  protectedClosePanel: document.querySelector('#protected-close-panel'),
  protectedCloseStatus: document.querySelector('#protected-close-status'),
  protectedCloseList: document.querySelector('#protected-close-list'),
  performanceSourceGrid: document.querySelector('#performance-source-grid'),
  performanceOverview: document.querySelector('#performance-overview'),
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
  pnlMonthlyRoi: document.querySelector('#pnl-monthly-roi'),
  sheetSimPanel: document.querySelector('#sheet-sim-panel'),
  sheetSimCapital: document.querySelector('#sheet-sim-capital'),
  sheetSimRoi: document.querySelector('#sheet-sim-roi'),
  sheetSimGain: document.querySelector('#sheet-sim-gain'),
  sheetSimEquity: document.querySelector('#sheet-sim-equity'),
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
  alignmentStatus: document.querySelector('#alignment-status'),
  alignmentSummary: document.querySelector('#alignment-summary'),
  replicaControl: document.querySelector('#replica-control'),
  alignmentTable: document.querySelector('#alignment-table'),
  performanceTableTitle: document.querySelector('#performance-table-title'),
  performanceTableStatus: document.querySelector('#performance-table-status'),
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
  realModeBanner: document.querySelector('#real-mode-banner'),
  guardStatus: document.querySelector('#guard-status'),
  guardMetrics: document.querySelector('#guard-metrics'),
  incidentStatus: document.querySelector('#incident-status'),
  incidentList: document.querySelector('#incident-list'),
  pnlEmpty: document.querySelector('#pnl-empty'),
  liveReadinessStatus: document.querySelector('#live-readiness-status'),
  liveReadinessList: document.querySelector('#live-readiness-list'),
  armLive: document.querySelector('#arm-live'),
  disarmLive: document.querySelector('#disarm-live'),
  healthStatus: document.querySelector('#health-status'),
  healthMetrics: document.querySelector('#health-metrics'),
  telegramWatchStatus: document.querySelector('#telegram-watch-status'),
  telegramWatchMetrics: document.querySelector('#telegram-watch-metrics'),
  telegramWatchChecks: document.querySelector('#telegram-watch-checks'),
  riskStatus: document.querySelector('#risk-status'),
  riskMetrics: document.querySelector('#risk-metrics'),
  exchangeSafetyStatus: document.querySelector('#exchange-safety-status'),
  exchangeSafetyMetrics: document.querySelector('#exchange-safety-metrics'),
  exchangeSafetyChecks: document.querySelector('#exchange-safety-checks'),
  emergencyStatus: document.querySelector('#emergency-status'),
  pauseEntries: document.querySelector('#pause-entries'),
  managementOnly: document.querySelector('#management-only'),
  cancelRealOrders: document.querySelector('#cancel-real-orders'),
  closeRealAll: document.querySelector('#close-real-all'),
  tickerPnlStatus: document.querySelector('#ticker-pnl-status'),
  tickerPnlChart: document.querySelector('#ticker-pnl-chart'),
  dailyPnlStatus: document.querySelector('#daily-pnl-status'),
  dailyPnlGrid: document.querySelector('#daily-pnl-grid'),
  pnlTable: document.querySelector('#pnl-table'),
  openPositionsStatus: document.querySelector('#open-positions-status'),
  openPositionsEmpty: document.querySelector('#open-positions-empty'),
  openPositionsList: document.querySelector('#open-positions-list'),
  realLifecycleStatus: document.querySelector('#real-lifecycle-status'),
  realLifecycleList: document.querySelector('#real-lifecycle-list'),
  strategyStudyStatus: document.querySelector('#strategy-study-status'),
  strategyStudyGrid: document.querySelector('#strategy-study-grid'),
  strategyStudyInsights: document.querySelector('#strategy-study-insights'),
  myLedgerStatus: document.querySelector('#my-ledger-status'),
  myLedgerSummary: document.querySelector('#my-ledger-summary'),
  myLedgerTabs: document.querySelector('#my-ledger-tabs'),
  myLedgerEmpty: document.querySelector('#my-ledger-empty'),
  myLedgerBody: document.querySelector('#my-ledger-body'),
  myLedgerResultSort: document.querySelector('#my-ledger-result-sort'),
  myLedgerResultSortState: document.querySelector('#my-ledger-result-sort-state'),
  externalSheetStatus: document.querySelector('#external-sheet-status'),
  externalSheetFrame: document.querySelector('#external-sheet-frame'),
  externalSheetEmpty: document.querySelector('#external-sheet-empty'),
  externalSheetLink: document.querySelector('#external-sheet-link'),
  tradeHistoryStatus: document.querySelector('#trade-history-status'),
  tradeHistoryEmpty: document.querySelector('#trade-history-empty'),
  tradeHistoryList: document.querySelector('#trade-history-list'),
  realAuditTable: document.querySelector('#real-audit-table'),
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
  telegramSourceEnabled: document.querySelector('#telegram-source-enabled'),
  telegramSourceUrl: document.querySelector('#telegram-source-url'),
  telegramSourceMax: document.querySelector('#telegram-source-max'),
  telegramSourceRefresh: document.querySelector('#telegram-source-refresh'),
  telegramSourceExecute: document.querySelector('#telegram-source-execute'),
  telegramSourceOpenSignals: document.querySelector('#telegram-source-open-signals'),
  telegramSourceLiveConfirmRow: document.querySelector('#telegram-source-live-confirm-row'),
  telegramSourceLiveConfirm: document.querySelector('#telegram-source-live-confirm'),
  saveTelegramSource: document.querySelector('#save-telegram-source'),
  openTelegramSource: document.querySelector('#open-telegram-source'),
  telegramSourceStatus: document.querySelector('#telegram-source-status'),
  bingxEnabled: document.querySelector('#bingx-enabled'),
  bingxMode: document.querySelector('#bingx-mode'),
  bingxMargin: document.querySelector('#bingx-margin'),
  bingxVstStopWorkingType: document.querySelector('#bingx-vst-stop-working-type'),
  bingxLiveStopWorkingType: document.querySelector('#bingx-live-stop-working-type'),
  bingxApiKey: document.querySelector('#bingx-api-key'),
  bingxApiSecret: document.querySelector('#bingx-api-secret'),
  bingxMonthlyInitialUsdt: document.querySelector('#bingx-monthly-initial-usdt'),
  bingxMonthlyOrderPercent: document.querySelector('#bingx-monthly-order-percent'),
  bingxNotional: document.querySelector('#bingx-notional'),
  bingxMaxNotional: document.querySelector('#bingx-max-notional'),
  bingxMaxLeverage: document.querySelector('#bingx-max-leverage'),
  bingxSymbols: document.querySelector('#bingx-symbols'),
  bingxRequireSl: document.querySelector('#bingx-require-sl'),
  bingxForceMarket: document.querySelector('#bingx-force-market'),
  bingxEntriesPaused: document.querySelector('#bingx-entries-paused'),
  bingxManagementOnly: document.querySelector('#bingx-management-only'),
  bingxMaxOpen: document.querySelector('#bingx-max-open'),
  bingxMaxDailyOrders: document.querySelector('#bingx-max-daily-orders'),
  bingxMaxSignalLeverage: document.querySelector('#bingx-max-signal-leverage'),
  bingxMaxSignalAge: document.querySelector('#bingx-max-signal-age'),
  bingxMaxEntryDeviation: document.querySelector('#bingx-max-entry-deviation'),
  bingxMaxStopDistance: document.querySelector('#bingx-max-stop-distance'),
  bingxCostGuardEnabled: document.querySelector('#bingx-cost-guard-enabled'),
  bingxCostGuardMode: document.querySelector('#bingx-cost-guard-mode'),
  bingxCostGuardBuffer: document.querySelector('#bingx-cost-guard-buffer'),
  bingxCostGuardMaxMargin: document.querySelector('#bingx-cost-guard-max-margin'),
  bingxEstimatedFeeRebate: document.querySelector('#bingx-estimated-fee-rebate'),
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

const PLOTLY_CDN_SOURCES = [
  'https://cdn.plot.ly/plotly-2.35.2.min.js',
  'https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.35.2/plotly.min.js',
  'https://unpkg.com/plotly.js-dist-min@2.35.2/plotly.min.js'
];
let plotlyLoadPromise = null;
const POSTS_PAGE_SIZE = 40;
const LOGS_PAGE_SIZE = 60;

const appState = {
  state: null,
  posts: [],
  postsUpdatedAt: null,
  postsLoading: false,
  postsDirty: false,
  postsVisibleLimit: POSTS_PAGE_SIZE,
  logsVisibleLimit: LOGS_PAGE_SIZE,
  eventsConnected: null,
  telegram: null,
  telegramSource: null,
  bingx: null,
  pnl: null,
  pnlSources: null,
  replicaAudit: null,
  pnlSource: '',
  performanceSource: '',
  performanceRange: '1D',
  ledgerFilter: 'ops',
  ledgerResultSort: '',
  sheetSimCapital: storedSheetSimCapital(),
  sheetSimTouched: false,
  pnlLoading: false,
  pnlError: '',
  pnlMeta: null,
  simTouched: false,
  trades: [],
  paperTrades: [],
  exchangePositions: [],
  exchangeSafety: null,
  strategyStudy: null,
  operationalStatus: null,
  portfolio: null,
  risk: null,
  logs: []
};

const COST_GUARD_TAKER_FEE_RATE = 0.0005;

init();

async function init() {
  bindEvents();
  initializeResponsiveControls();
  const initialLoads = [loadState(), loadTelegram(), loadTelegramSource(), loadStrategyStudy(), loadOperationalStatus(), loadBingx()];
  if (pnlHashTarget()) {
    appState.postsDirty = true;
  } else {
    initialLoads.push(loadPosts());
  }
  await Promise.all(initialLoads);
  connectEvents();
  window.addEventListener('hashchange', () => {
    applyHashNavigation();
  });
  applyHashNavigation();
  window.lucide?.createIcons();
}

function bindEvents() {
  elements.toggleControls?.addEventListener('click', () => {
    setControlsCollapsed(!elements.toolPanel.classList.contains('mobile-collapsed'));
  });

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
        maxScrolls: Number(elements.maxScrolls.value),
        telegramSource: telegramSourcePayload()
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

  elements.restartBackend.addEventListener('click', async () => {
    const confirmed = confirm('Reiniciar backend ahora? PM2 lo levantara de nuevo. No toca ordenes ni configuracion.');
    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      elements.restartBackend.disabled = true;
      elements.statusText.textContent = 'Reiniciando backend...';
      elements.statusPill.classList.remove('running');
      try {
        await postJson('/api/admin/restart', { confirm: 'REINICIAR_BACKEND' });
      } catch (error) {
        if (!/fetch|network|load failed|failed to fetch/i.test(error.message)) {
          throw error;
        }
      } finally {
        setTimeout(() => window.location.reload(), 4500);
      }
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

  elements.search.addEventListener('input', () => {
    appState.postsVisibleLimit = POSTS_PAGE_SIZE;
    renderPosts();
  });
  elements.postsLoadMore?.addEventListener('click', () => {
    appState.postsVisibleLimit += POSTS_PAGE_SIZE;
    renderPosts();
  });
  elements.logsLoadMore?.addEventListener('click', () => {
    appState.logsVisibleLimit += LOGS_PAGE_SIZE;
    renderLogs();
  });
  elements.myLedgerTabs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-ledger-filter]');
    if (!button) {
      return;
    }
    appState.ledgerFilter = button.dataset.ledgerFilter || 'all';
    renderMyLedger();
  });
  elements.myLedgerResultSort?.addEventListener('click', () => {
    appState.ledgerResultSort = appState.ledgerResultSort === 'asc' ? 'desc' : 'asc';
    renderMyLedger();
  });
  const alignmentPanel = document.querySelector('#sheet-vst-alignment');
  alignmentPanel?.addEventListener('click', async (event) => {
    const cohortButton = event.target.closest('[data-start-improvement-cohort]');
    if (cohortButton) {
      const confirmed = window.confirm('¿Iniciar una cohorte nueva desde este momento? El histórico anterior se conserva.');
      if (!confirmed) {
        return;
      }
      await runAction(async () => {
        await postJson('/api/replica-audit/cohort/start', { confirm: 'INICIAR_COHORTE' });
        appState.replicaAudit = null;
        await loadPnl();
      });
      return;
    }
    const button = event.target.closest('[data-alignment-scroll]');
    if (!button) {
      return;
    }
    scrollAlignmentTable(button.dataset.alignmentScroll);
  });
  alignmentPanel?.addEventListener('wheel', (event) => {
    const wrap = event.target.closest('.replica-audit-wrap, .alignment-wrap');
    if (!wrap) {
      return;
    }
    const canScrollVertically = wrap.scrollHeight > wrap.clientHeight;
    const canScrollHorizontally = wrap.scrollWidth > wrap.clientWidth;
    if (!canScrollVertically && !canScrollHorizontally) {
      return;
    }
    event.preventDefault();
    wrap.scrollTop += event.deltaY;
    wrap.scrollLeft += event.deltaX;
  }, { passive: false });
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
  elements.monthReset.addEventListener('click', async () => {
    await runAction(async () => {
      const confirmed = confirm('Resetear el mes de rendimiento VST y real desde este momento? No toca ordenes abiertas ni la logica de senales.');
      if (!confirmed) {
        return;
      }
      elements.monthReset.disabled = true;
      elements.monthResetStatus.textContent = 'Reseteando mes...';
      try {
        const response = await postJson('/api/bingx/month-reset', {});
        appState.bingx = response.bingx;
        renderBingx(response.bingx, 'Mes reseteado');
        await loadPnl();
      } finally {
        elements.monthReset.disabled = false;
      }
    });
  });
  elements.sheetSimCapital.addEventListener('input', () => {
    const value = Number(elements.sheetSimCapital.value || 0);
    appState.sheetSimTouched = true;
    appState.sheetSimCapital = Number.isFinite(value) && value > 0 ? value : null;
    storeSheetSimCapital(appState.sheetSimCapital);
    const selectedSource = selectedPnlSource(pnlSourceCards());
    renderSheetCapitalSimulator(selectedSource, sourceMonthlyRoi(selectedSource));
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
    const sources = pnlSourceCards(currentReferenceLedger());
    const source = selectedPerformanceSource(sources);
    renderPerformanceSourceGrid(sources, source.key);
    renderPerformanceOverview(source);
    renderPerformanceTable(performanceTableRows(source, [], currentReferenceLedger()), source);
    renderPnlCurve();
    renderSimulation();
    renderPnlChart(performanceMonthlyRows());
    renderHistoricalPnl();
  });
  elements.pnlCurve.addEventListener('click', (event) => {
    const button = event.target.closest('[data-asset-range]');
    if (!button) {
      return;
    }
    appState.performanceRange = button.dataset.assetRange || '1D';
    renderPnlCurve();
  });
  elements.armLive.addEventListener('click', async () => {
    await runAction(async () => {
      const readiness = liveReadiness();
      if (!readiness.ready) {
        renderLiveReadiness(readiness);
        throw new Error('Live aun no esta preparado. Revisa el checklist.');
      }
      const confirmed = confirm('Vas a armar LIVE REAL. Las proximas senales validas podran enviar ordenes reales a BingX. Continuar?');
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
  elements.pauseEntries.addEventListener('click', async () => {
    await runAction(async () => {
      elements.bingxEntriesPaused.checked = !elements.bingxEntriesPaused.checked;
      const bingx = await saveBingxConfig();
      renderBingx(bingx, bingx.entriesPaused ? 'Entradas pausadas' : 'Entradas activas');
      renderPnl();
    });
  });
  elements.managementOnly.addEventListener('click', async () => {
    await runAction(async () => {
      elements.bingxManagementOnly.checked = !elements.bingxManagementOnly.checked;
      const bingx = await saveBingxConfig();
      renderBingx(bingx, bingx.managementOnly ? 'Solo gestion activo' : 'Gestion normal');
      renderPnl();
    });
  });
  elements.cancelRealOrders.addEventListener('click', async () => {
    await runAction(async () => {
      const confirmText = prompt('Escribe CANCELAR_ORDENES_REAL para cancelar ordenes pendientes reales.');
      if (confirmText !== 'CANCELAR_ORDENES_REAL') {
        return;
      }
      elements.emergencyStatus.textContent = 'Cancelando pendientes...';
      const response = await postJson('/api/bingx/emergency/cancel-all-real', { confirm: confirmText });
      appState.exchangeSafety = response.exchangeSafety || appState.exchangeSafety;
      renderPnl();
      elements.emergencyStatus.textContent = `${response.result?.canceled?.length || 0} canceladas`;
    });
  });
  elements.closeRealAll.addEventListener('click', async () => {
    await runAction(async () => {
      const confirmText = prompt('Escribe CERRAR_TODO_REAL para cerrar todas las posiciones reales.');
      if (confirmText !== 'CERRAR_TODO_REAL') {
        return;
      }
      elements.emergencyStatus.textContent = 'Cerrando real...';
      const response = await postJson('/api/bingx/emergency/close-all-real', { confirm: confirmText });
      appState.exchangeSafety = response.exchangeSafety || appState.exchangeSafety;
      renderPnl();
      elements.emergencyStatus.textContent = `${response.result?.orders?.length || 0} cierres enviados`;
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

  elements.telegramSourceExecute.addEventListener('change', updateTelegramSourceLiveConfirmVisibility);

  elements.saveTelegramSource.addEventListener('click', async () => {
    await runAction(async () => {
      const telegramSource = await saveTelegramSourceConfig();
      renderTelegramSource(telegramSource, 'Fuente guardada');
    });
  });

  elements.openTelegramSource.addEventListener('click', async () => {
    await runAction(async () => {
      const telegramSource = await saveTelegramSourceConfig();
      renderTelegramSource(telegramSource, 'Abriendo canal...');
      await postJson('/api/browser/open-telegram', { url: telegramSource.url });
      renderTelegramSource(telegramSource, 'Canal abierto en Chromium');
    });
  });

  elements.bingxMode.addEventListener('change', () => {
    elements.bingxLiveConfirmRow.classList.toggle('hidden', !usesLiveMode(elements.bingxMode.value));
    updateTelegramSourceLiveConfirmVisibility();
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
  appState.portfolio = state.portfolio || appState.portfolio;
  renderState();
  renderLogs();
  renderTelegramWatchPanel();
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
    appState.postsDirty = false;
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

async function loadTelegramSource() {
  const response = await fetchJson('/api/telegram-source');
  appState.telegramSource = response.telegramSource;
  renderTelegramSource(response.telegramSource);
  renderTelegramWatchPanel();
}

async function loadStrategyStudy() {
  try {
    const response = await fetchJson('/api/strategy-study/latest');
    appState.strategyStudy = response.study || null;
  } catch (error) {
    appState.strategyStudy = {
      error: error.message
    };
  }
  renderStrategyStudy();
}

async function loadOperationalStatus() {
  try {
    appState.operationalStatus = await fetchJson('/api/operational-status');
  } catch (error) {
    appState.operationalStatus = {
      error: error.message
    };
  }
  renderGuardDashboard();
}

async function loadBingx() {
  const response = await fetchJson('/api/bingx');
  appState.bingx = response.bingx;
  appState.trades = response.trades || appState.trades;
  appState.paperTrades = response.paperTrades || appState.paperTrades;
  appState.exchangePositions = response.exchangePositions || appState.exchangePositions;
  appState.exchangeSafety = response.exchangeSafety || appState.exchangeSafety;
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
    const [historicalResponse, sourcesResponse, replicaAuditResponse] = await Promise.all([
      fetchJson('/api/historical-pnl?months=72'),
      fetchJson('/api/bingx/pnl-sources').catch((error) => ({
        ok: false,
        error: error.message,
        sources: {},
        positions: {}
      })),
      fetchJson('/api/replica-audit').catch((error) => ({
        ok: false,
        error: error.message,
        audit: null
      }))
    ]);
    const historical = historicalResponse.historical;
    appState.pnlSources = sourcesResponse;
    appState.replicaAudit = replicaAuditResponse.audit || {
      error: replicaAuditResponse.error || ''
    };
    appState.pnlMeta = {
      cached: Boolean(sourcesResponse.cached),
      stale: Boolean(sourcesResponse.stale),
      warning: sourcesResponse.warning || '',
      cooldownUntil: sourcesResponse.cooldownUntil || null
    };
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
        appState.pnlMeta = {
          ...(appState.pnlMeta || {}),
          cached: Boolean(response.cached),
          stale: Boolean(response.stale),
          warning: response.warning || response.pnl?.warning || '',
          cooldownUntil: response.cooldownUntil || appState.pnlMeta?.cooldownUntil || null,
          lastGoodAt: response.lastGoodAt || null
        };
        appState.paperTrades = response.pnl?.paper?.positions || appState.paperTrades;
      } catch (error) {
        appState.pnl = {
          months: [],
          historical
        };
        appState.pnlError = error.message;
        appState.pnlMeta = {
          ...(appState.pnlMeta || {}),
          warning: error.message
        };
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

  source.addEventListener('open', () => {
    appState.eventsConnected = true;
    renderState();
  });

  source.onerror = () => {
    appState.eventsConnected = false;
    renderState();
  };

  source.addEventListener('state', (event) => {
    appState.state = JSON.parse(event.data);
    appState.logs = appState.state.logs || appState.logs;
    appState.trades = appState.state.trades || appState.trades;
    appState.exchangeSafety = appState.state.exchangeSafety || appState.exchangeSafety;
    appState.portfolio = appState.state.portfolio || appState.portfolio;
    renderState();
    if (viewIsVisible(elements.logsView)) {
      renderLogs();
    }
    if (viewIsVisible(elements.pnlView)) {
      renderPnl();
    }
    syncPostsIfNeeded(appState.state);
  });

  source.addEventListener('posts', async () => {
    appState.postsDirty = true;
    if (viewIsVisible(elements.postsView)) {
      await loadPosts();
    }
  });

  source.addEventListener('log', (event) => {
    appState.logs.unshift(JSON.parse(event.data));
    appState.logs = appState.logs.slice(0, 200);
    if (viewIsVisible(elements.logsView)) {
      renderLogs();
    }
    if (viewIsVisible(elements.pnlView)) {
      renderTelegramWatchPanel();
      renderRealModeBanner();
      loadOperationalStatus().catch(() => renderGuardDashboard());
    }
  });

  source.addEventListener('telegram', (event) => {
    const payload = JSON.parse(event.data);
    appState.telegram = payload.telegram;
    renderTelegram(payload.telegram);
  });

  source.addEventListener('telegramSource', (event) => {
    const payload = JSON.parse(event.data);
    appState.telegramSource = payload.telegramSource;
    renderTelegramSource(payload.telegramSource);
    renderTelegramWatchPanel();
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
    if (viewIsVisible(elements.pnlView)) {
      renderPnl();
    }
    if (viewIsVisible(elements.pnlView) && String(payload.status || '').endsWith('_order_sent')) {
      loadPnl().catch((error) => {
        appState.pnlError = error.message;
        renderPnl();
      });
    }
  });

  source.addEventListener('exchangePositions', (event) => {
    const payload = JSON.parse(event.data);
    appState.exchangePositions = payload.positions || [];
    appState.exchangeSafety = payload.exchangeSafety || appState.exchangeSafety;
    if (viewIsVisible(elements.pnlView)) {
      renderPnl();
      loadOperationalStatus().catch(() => renderGuardDashboard());
    }
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
    if (viewIsVisible(elements.pnlView) && (exchangePriceChanged || payload.updatedPaperPositions?.length || payload.closedPaperPositions?.length)) {
      renderPnl();
    }
  });
}

function renderState() {
  const state = appState.state || {};
  const running = Boolean(state.running);
  const phase = state.phase || 'idle';

  elements.statusPill.classList.toggle('running', running);
  elements.statusPill.classList.toggle('reconnecting', running && appState.eventsConnected === false);
  elements.statusText.textContent = running && appState.eventsConnected === false
    ? 'Reconectando panel'
    : running ? phaseLabel(phase) : 'Inactivo';
  elements.start.disabled = running;
  elements.stop.disabled = !running;
  elements.openBrowser.disabled = running;
  elements.metricTotal.textContent = String(state.stats?.totalPosts || 0);
  elements.metricVisible.textContent = String(state.visiblePosts || 0);
  elements.metricLast.textContent = formatDateTime(state.lastRunAt || state.stats?.updatedAt);

  if (state.channelUrl && !elements.channelUrl.value) {
    elements.channelUrl.value = state.channelUrl;
  }
  renderHeaderContext();
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
  const visiblePosts = posts.slice(0, appState.postsVisibleLimit);

  elements.emptyPosts.classList.toggle('hidden', posts.length > 0);
  elements.emptyPosts.textContent = emptyPostsText(query);
  elements.postsList.innerHTML = visiblePosts.map(renderPost).join('');
  renderListPagination({
    container: elements.postsPagination,
    status: elements.postsPaginationStatus,
    button: elements.postsLoadMore,
    visible: visiblePosts.length,
    total: posts.length,
    noun: 'publicaciones'
  });
}

function syncPostsIfNeeded(state) {
  const total = state?.stats?.totalPosts || 0;
  const updatedAt = state?.stats?.updatedAt || null;
  const listIsStale = total !== appState.posts.length || (updatedAt && updatedAt !== appState.postsUpdatedAt);

  if (!viewIsVisible(elements.postsView)) {
    appState.postsDirty ||= listIsStale;
    return;
  }
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
  const sourceBadge = post.source === 'telegram_web' ? '<span class="source-badge telegram-web">Telegram</span>' : '';
  const poll = post.pollOptions?.length ? `<span>Encuesta: ${escapeHtml(post.pollOptions.join(' / '))}</span>` : '';
  const sourceName = post.source === 'telegram_web'
    ? 'Telegram Web'
    : post.isMembersOnly ? 'Canal miembros' : 'Fuente';

  return `
    <article class="post-card">
      <div class="post-meta">
        <strong>${escapeHtml(sourceName)}</strong>
        <span>${escapeHtml(post.publishedText || 'Sin fecha visible')}</span>
        ${memberBadge}
        ${sourceBadge}
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
  const visibleLogs = logs.slice(0, appState.logsVisibleLimit);
  elements.logsList.innerHTML = visibleLogs.map((log) => `
    <div class="log-row ${escapeAttribute(log.level || 'info')}">
      <span class="log-level">${escapeHtml(log.level || 'info')}</span>
      <span class="log-message">${escapeHtml(log.message || '')}</span>
      <span class="log-time">${escapeHtml(formatDateTime(log.at))}</span>
    </div>
  `).join('') || '<div class="empty-state">Sin eventos todavia.</div>';
  renderListPagination({
    container: elements.logsPagination,
    status: elements.logsPaginationStatus,
    button: elements.logsLoadMore,
    visible: visibleLogs.length,
    total: logs.length,
    noun: 'eventos'
  });
}

function renderListPagination({ container, status, button, visible, total, noun }) {
  if (!container || !status || !button) {
    return;
  }
  const hasItems = total > 0;
  const hasMore = visible < total;
  container.classList.toggle('hidden', !hasItems);
  status.textContent = hasItems ? `Mostrando ${visible} de ${total} ${noun}` : `0 ${noun}`;
  button.classList.toggle('hidden', !hasMore);
  button.disabled = !hasMore;
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
  const monthlyRoi = sourceMonthlyRoi(selectedSource);
  const hasActivity = rows.some((row) => row.records || row.testOrders || row.liveOrders || row.paperPnl);
  const hasHistorical = Boolean(appState.pnl?.historical);
  const hasReference = Boolean(reference);
  const hasLocalPaper = (appState.paperTrades || []).length > 0;
  const hasPaperActivity = rows.some((row) => row.testOrders || row.openPaperTrades || row.closedPaperTrades || row.paperPnl || row.paperUnrealized);
  const hasBingxActivity = rows.some((row) => row.records || row.liveOrders);
  const cooldownText = pnlCooldownText();

  elements.refreshPnl.disabled = appState.pnlLoading || !configured;
  elements.monthReset.disabled = appState.pnlLoading;
  elements.monthResetStatus.textContent = monthResetStatusText(appState.bingx);
  renderPnlSourceGrid(sources, selectedSource.key);
  renderReliabilityPanel();
  renderCostControl(selectedSource, reference);
  renderProtectedClosePanel();
  const performanceSource = selectedPerformanceSource(sources);
  renderPerformanceSourceGrid(sources, performanceSource.key);
  renderPerformanceOverview(performanceSource, reference);
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
  elements.pnlMonthlyRoi.textContent = formatPercent(monthlyRoi);
  elements.pnlMonthlyRoi.className = amountClass(monthlyRoi);
  elements.pnlNote.textContent = sourceNoteText(selectedSource);
  renderSheetCapitalSimulator(selectedSource, monthlyRoi);

  if (!configured) {
    elements.pnlStatus.textContent = 'Configura BingX para leer el PnL mensual.';
    elements.pnlEmpty.textContent = 'Configura BingX para leer el PnL mensual.';
    elements.pnlEmpty.classList.remove('hidden');
  } else if (appState.pnlLoading) {
    elements.pnlStatus.textContent = 'Leyendo PnL de BingX...';
    elements.pnlEmpty.classList.add('hidden');
  } else if (cooldownText) {
    elements.pnlStatus.textContent = `${cooldownText}. Usando ultimo dato disponible.`;
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
  const performanceRows = performanceTableRows(performanceSource, rows, reference);
  renderPerformanceTable(performanceRows, performanceSource);
  renderPnlCurve();
  renderSimulation();
  renderPnlChart(performanceMonthlyRows(rows));
  renderLiveReadiness();
  renderRealModeBanner();
  renderGuardDashboard();
  renderHealthPanel();
  renderTelegramWatchPanel();
  renderRiskPanel(openPositions, closedPositions);
  renderExchangeSafetyPanel();
  renderTickerPnl();
  renderDailyPnl();
  renderHistoricalPnl();
  renderSheetVstAlignment(reference);
  renderOpenPositions(openPositions);
  renderStrategyStudy();
  renderRealLifecycle();
  renderMyLedger();
  renderExternalSheetEmbed();
  renderTradeHistory();
  renderRealAuditTable();
  elements.pnlNote.classList.toggle('warn', !usesLiveMode(appState.bingx?.mode));
  window.lucide?.createIcons();
}

function pnlSourceCards(reference = currentReferenceLedger()) {
  const livePositions = positionsForPnlSource('live', reference);
  const live = exchangeSourceWithPositions(appState.pnlSources?.sources?.live, livePositions, {
    key: 'live',
    label: 'Futuros reales',
    modeLabel: 'Live real',
    asset: 'USDT'
  });
  const vstPositions = positionsForPnlSource('vst', reference);
  const vst = exchangeSourceWithPositions(appState.pnlSources?.sources?.vst, vstPositions, {
    key: 'vst',
    label: 'Futuros VST',
    modeLabel: 'Demo VST',
    asset: 'VST'
  });
  const sheet = sheetPnlSource(reference);
  return [live, vst, sheet];
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
    winRate: calculateWinRate(closed),
    roiBaseline: positiveFiniteNumber(reference.startingCapital),
    equity: positiveFiniteNumber(reference.equity)
  };
}

function exchangeSourceWithPositions(source, positions, fallback) {
  const base = source || emptyClientPnlSource({
    ...fallback,
    status: appState.pnlSources?.error || 'No cargado'
  });
  const open = positions.filter((position) => position.status === 'open');
  const closed = positions.filter((position) => position.status === 'closed');
  const floating = roundPnl(open.reduce((sum, position) => (
    sum + Number(position.unrealizedPnl ?? position.paperPnl ?? 0)
  ), 0));
  const exposure = roundPnl(open.reduce((sum, position) => (
    sum + Number(position.exposure || position.notional || 0)
  ), 0));
  const closedRealized = roundPnl(closed.reduce((sum, position) => (
    sum + Number(position.realizedPnl || position.paperPnl || 0)
  ), 0));
  const realized = Number(base.realized || 0) || closedRealized;
  const closedTrades = Number(base.closedTrades || 0) || closed.length;
  const records = Number(base.records || 0) || positions.length;

  return {
    ...base,
    key: fallback.key,
    label: fallback.label,
    modeLabel: fallback.modeLabel,
    asset: base.asset || fallback.asset,
    floating,
    exposure,
    openPositions: open.length,
    closedTrades,
    records,
    winRate: base.winRate ?? calculateWinRate(closed),
    realized,
    total: roundPnl(realized + floating),
    roiBaseline: positiveFiniteNumber(base.roiBaseline || base.baseline)
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
    winRate: null,
    roiBaseline: null,
    equity: null
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
  if (sources.some((source) => source.key === 'live')) {
    return 'live';
  }
  return sources.find((source) => source.key === 'sheet' && source.available) ? 'sheet' : 'live';
}

function renderPnlSourceGrid(sources, selectedKey) {
  elements.pnlSourceGrid.innerHTML = sources.map((source) => {
    const lines = sourceSecondaryLines(source);
    const equityBaseline = sourceEquityBaselineSnapshot(source);
    return `
      <button class="pnl-source-card source-${escapeAttribute(source.key)} ${source.key === selectedKey ? 'active' : ''} ${source.available ? '' : 'unavailable'}" type="button" data-pnl-source="${escapeAttribute(source.key)}">
        <span>${escapeHtml(source.label)}</span>
        <strong class="${sourcePrimaryClass(source)}">${escapeHtml(formatSourceMoney(sourcePrimaryValue(source), source))}</strong>
        <small>${escapeHtml(source.modeLabel)} · ${escapeHtml(sourcePrimaryLabel(source))}</small>
        <em class="${escapeAttribute(sourceMonthlyRoiClass(source))}">${escapeHtml(sourceMonthlyRoiLabel(source))}</em>
        ${equityBaseline ? `
          <em class="pnl-equity-baseline ${escapeAttribute(amountClass(equityBaseline.delta))}">
            ${escapeHtml(`Equity vs capital inicial: ${formatPercent(equityBaseline.percent)}`)}
          </em>
        ` : ''}
        ${lines.length ? `
          <div>
            ${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}
          </div>
        ` : ''}
      </button>
    `;
  }).join('');
}

function renderReliabilityPanel() {
  if (!elements.reliabilityPanel || !elements.reliabilityStatus || !elements.reliabilitySummary || !elements.reliabilityCriteria) {
    return;
  }

  const gate = appState.state?.promotionGate || appState.operationalStatus?.promotionGate || {};
  const metrics = gate.metrics || {};
  const latestPackage = appState.state?.signalCoverage?.latestPackage || null;
  const openingRetries = appState.state?.openingRetryQueue || appState.state?.stopLossRetryQueue || [];
  const closeRetries = appState.state?.closeRetryQueue || appState.state?.closeGuardRetryQueue || [];
  const tone = gate.status === 'eligible_for_review'
    ? 'positive'
    : gate.status === 'blocked' ? 'negative' : 'warn';

  elements.reliabilityPanel.dataset.tone = tone;
  elements.reliabilityStatus.className = `amount ${tone}`;
  elements.reliabilityStatus.textContent = gate.label || 'Recogiendo muestra';
  elements.reliabilitySummary.innerHTML = [
    renderReliabilityMetric('Paquetes', `${metrics.packages || 0}/${gate.thresholds?.minPackages || 50}`, 'Muestra observada'),
    renderReliabilityMetric('Cobertura', formatPercent(metrics.coveragePercent || 0), `${metrics.executedOpenings || 0}/${metrics.expectedOpenings || 0} aperturas`),
    renderReliabilityMetric('Completos', formatPercent(metrics.completePercent || 0), `${metrics.completePackages || 0} paquetes completos`),
    renderReliabilityMetric('Pendientes', String(openingRetries.length + closeRetries.length), `${openingRetries.length} aperturas · ${closeRetries.length} cierres`),
    renderReliabilityMetric('Último paquete', latestPackage ? `${latestPackage.executedCount}/${latestPackage.expectedCount}` : '-', latestPackage ? formatSignalPackageStatus(latestPackage.status) : 'Sin paquete reciente')
  ].join('');
  elements.reliabilityCriteria.innerHTML = (gate.criteria || []).map((item) => `
    <div class="reliability-check ${item.ok ? 'ok' : 'missing'} ${escapeAttribute(item.group || '')}">
      <i data-lucide="${item.ok ? 'check' : item.group === 'sample' || item.group === 'transient' || (item.group === 'economics' && item.available === false) ? 'clock-3' : 'triangle-alert'}"></i>
      <span>
        <strong>${escapeHtml(item.label || item.key)}</strong>
        <small>${escapeHtml(item.detail || '-')}</small>
      </span>
    </div>
  `).join('');
}

function renderReliabilityMetric(label, value, detail) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function renderCostControl(source = selectedPnlSource(), reference = currentReferenceLedger()) {
  if (!elements.costControlPanel || !elements.costControlStatus || !elements.costControlSummary) {
    return;
  }

  const analysis = buildCostControlAnalysis(costControlSource(source, reference), reference);
  elements.costControlPanel.classList.toggle('muted', !analysis.available);
  elements.costControlStatus.textContent = analysis.available
    ? `${analysis.label} · ${analysis.asset} · ${analysis.costPressureLabel}`
    : 'Selecciona VST o real';

  if (!analysis.available) {
    elements.costControlSummary.innerHTML = `
      <div class="cost-empty">El coste operativo se calcula con datos reales de BingX para Futuros VST o Futuros reales.</div>
    `;
    elements.costControlSymbols.innerHTML = '';
    elements.costControlShadow.innerHTML = '';
    elements.costControlActions.innerHTML = '';
    return;
  }

  elements.costControlSummary.innerHTML = [
    renderCostMetric('Bruto realizado', formatMoney(analysis.grossRealized, analysis.asset), 'Antes de fees/funding', amountClass(analysis.grossRealized)),
    renderCostMetric('Fees + funding', formatMoney(analysis.totalCost, analysis.asset), `${formatMoney(analysis.fees, analysis.asset)} fees`, amountClass(analysis.totalCost)),
    renderCostMetric('Neto realizado', formatMoney(analysis.realized, analysis.asset), 'Despues de costes', amountClass(analysis.realized)),
    renderCostMetric('Fee por ejecucion', formatMoney(analysis.feePerExecution, analysis.asset), `${analysis.estimatedExecutions} ejecuciones aprox.`, amountClass(-analysis.feePerExecution)),
    renderCostMetric('Coste round-trip', formatMoney(analysis.roundTripCost, analysis.asset), 'Abrir + cerrar estimado', amountClass(-analysis.roundTripCost)),
    renderCostMetric('Break-even precio', formatPercent(analysis.breakEvenMovePercent), `${formatPercent(analysis.marginRoiBreakEven)} sobre margen`, analysis.breakEvenMovePercent > 0.18 ? 'amount negative' : analysis.breakEvenMovePercent > 0.1 ? 'warn' : 'amount positive')
  ].join('');

  elements.costControlSymbols.innerHTML = analysis.symbolRows.length
    ? analysis.symbolRows.map(renderCostSymbolRow).join('')
    : '<div class="cost-empty">Sin posiciones suficientes para calcular coste por simbolo.</div>';

  elements.costControlShadow.innerHTML = renderCostShadow(analysis.shadow);

  elements.costControlActions.innerHTML = analysis.actions.map((action) => `
    <div class="cost-action ${escapeAttribute(action.tone)}">
      <strong>${escapeHtml(action.label)}</strong>
      <span>${escapeHtml(action.detail)}</span>
    </div>
  `).join('');
}

function renderProtectedClosePanel() {
  if (!elements.protectedClosePanel || !elements.protectedCloseStatus || !elements.protectedCloseList) {
    return;
  }

  const items = protectedCloseQueueItems();
  elements.protectedClosePanel.classList.toggle('muted', !items.length);
  elements.protectedCloseStatus.textContent = items.length
    ? `${items.length} cierre(s) esperando zona valida`
    : 'Sin cierres pendientes';
  elements.protectedCloseList.innerHTML = items.length
    ? items.map(renderProtectedCloseItem).join('')
    : '<div class="protected-close-empty">No hay cierres protegidos pendientes. Si la proteccion bloquea un cierre, aparecera aqui hasta que se ejecute o caduque.</div>';
}

function protectedCloseQueueItems() {
  return [...(appState.state?.closeGuardRetryQueue || [])]
    .sort((a, b) => Date.parse(a.expiresAt || 0) - Date.parse(b.expiresAt || 0));
}

function renderProtectedCloseItem(item = {}) {
  const parsed = parseCloseGuardReason(item.lastReason);
  const modeLabel = item.executionMode === 'demo' ? 'Demo VST' : 'Live real';
  const limit = parsed.limitPercent ?? parsed.limit;
  const slippage = parsed.slippagePercent ?? parsed.slippage;
  const nextRunText = timeUntilLabel(item.nextRunAt, 'proximo intento');
  const expiresText = timeUntilLabel(item.expiresAt, 'caduca');
  const postLink = item.postUrl
    ? `<a href="${escapeAttribute(item.postUrl)}" target="_blank" rel="noreferrer">Post</a>`
    : '';
  const reasonText = protectedCloseReasonText(parsed, item.lastReason);
  const reasonClass = protectedCloseReasonClass(parsed);

  return `
    <article class="protected-close-item ${escapeAttribute(reasonClass)}">
      <div class="protected-close-head">
        <div>
          <strong>${escapeHtml(normalizeTradeSymbol(item.symbol) || 'Cierre pendiente')}</strong>
          <span>${escapeHtml(`${modeLabel} - ${item.closePercent || 100}% cierre - ${item.attempts || 0} reintentos`)}</span>
        </div>
        <span class="ledger-status warn">Protegido</span>
      </div>
      <div class="protected-close-grid">
        <div>
          <span>Señal</span>
          <strong>${escapeHtml(formatPrice(item.closePrice || parsed.signal))}</strong>
        </div>
        <div>
          <span>Mercado</span>
          <strong>${escapeHtml(formatPrice(parsed.market))}</strong>
        </div>
        <div>
          <span>Slippage</span>
          <strong class="${escapeAttribute(slippage && limit && slippage > limit ? 'negative' : 'warn')}">${escapeHtml(formatGuardPercent(slippage))}</strong>
        </div>
        <div>
          <span>Límite</span>
          <strong>${escapeHtml(formatGuardPercent(limit))}</strong>
        </div>
      </div>
      <div class="protected-close-meta">
        <span>${escapeHtml(reasonText)}</span>
        <span>${escapeHtml(nextRunText)}</span>
        <span>${escapeHtml(expiresText)}</span>
        ${postLink}
      </div>
    </article>
  `;
}

function parseCloseGuardReason(reason = '') {
  const [type = '', ...parts] = String(reason || '').split(':');
  const parsed = { type };
  for (const part of parts) {
    const match = part.match(/^([^=]+)=(.+)$/);
    if (!match) {
      continue;
    }
    const key = match[1].trim();
    const rawValue = match[2].trim();
    const number = Number(rawValue.replace('%', '').replace(',', '.'));
    parsed[key] = Number.isFinite(number) ? number : rawValue;
    if (key === 'slippage') {
      parsed.slippagePercent = parsed[key];
    }
    if (key === 'limit') {
      parsed.limitPercent = parsed[key];
    }
  }
  return parsed;
}

function protectedCloseReasonText(parsed = {}, fallback = '') {
  if (parsed.type === 'close_price_slippage') {
    return 'Protegido por slippage: espera a que el mercado vuelva cerca del precio de cierre señalado.';
  }
  if (parsed.type === 'close_net_negative') {
    return 'Protegido por neto negativo: evita cerrar si el cierre sale peor que el umbral configurado.';
  }
  return reasonLabel(fallback || parsed.type || 'close_guarded');
}

function protectedCloseReasonClass(parsed = {}) {
  if (parsed.type === 'close_price_slippage') {
    return 'warn';
  }
  if (parsed.type === 'close_net_negative') {
    return 'negative';
  }
  return 'neutral';
}

function timeUntilLabel(value, label) {
  const timestamp = Date.parse(value || 0);
  if (!Number.isFinite(timestamp)) {
    return `${label}: -`;
  }
  const diff = timestamp - Date.now();
  if (diff <= 0) {
    return `${label}: vencido`;
  }
  return `${label}: ${formatMilliseconds(diff)}`;
}

function formatMilliseconds(ms) {
  const minutes = Math.floor(ms / unitMs.minute);
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

function formatGuardPercent(value) {
  if (value == null) {
    return '-';
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  return `${number.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  })}%`;
}

function costControlSource(source = {}, reference = currentReferenceLedger()) {
  const sources = pnlSourceCards(reference);
  if (costSourceHasActivity(source, reference)) {
    return source;
  }
  return sources.find((item) => item.key === 'vst' && costSourceHasActivity(item, reference))
    || sources.find((item) => item.key === 'live' && costSourceHasActivity(item, reference))
    || source;
}

function costSourceHasActivity(source = {}, reference = currentReferenceLedger()) {
  if (source.key !== 'vst' && source.key !== 'live') {
    return false;
  }
  const positions = positionsForPnlSource(source.key, reference);
  return positions.length > 0
    || Math.abs(Number(source.fees || 0)) > 0
    || Math.abs(Number(source.funding || 0)) > 0
    || Math.abs(Number(source.realized || 0)) > 0
    || Math.abs(Number(source.grossRealized || 0)) > 0;
}

function buildCostControlAnalysis(source = {}, reference = currentReferenceLedger()) {
  const available = source.key === 'vst' || source.key === 'live';
  const asset = source.asset || (source.key === 'vst' ? 'VST' : 'USDT');
  const positions = available ? positionsForPnlSource(source.key, reference) : [];
  const open = positions.filter((position) => position.status !== 'closed');
  const closed = positions.filter((position) => position.status === 'closed');
  const fees = Number(source.fees || 0);
  const funding = Number(source.funding || 0);
  const realized = Number(source.realized || 0);
  const grossRealized = Number(source.grossRealized ?? roundPnl(realized - fees - funding));
  const totalCost = roundPnl(fees + funding);
  const marginAverage = averagePositiveNumber(positions.map((position) => position.notional));
  const exposureAverage = averagePositiveNumber(positions.map(positionExposureForCost));
  const closedExposureAverage = averagePositiveNumber(closed.map(positionExposureForCost));
  const estimatedExecutions = Math.max(1, closed.length * 2 + open.length);
  const feePerExecution = roundPnl(Math.abs(fees) / estimatedExecutions);
  const fundingPerClosed = closed.length ? Math.abs(funding) / closed.length : 0;
  const roundTripCost = roundPnl((feePerExecution * 2) + fundingPerClosed);
  const breakEvenMovePercent = exposureAverage > 0 ? (roundTripCost / exposureAverage) * 100 : null;
  const marginRoiBreakEven = marginAverage > 0 ? (roundTripCost / marginAverage) * 100 : null;
  const costPressure = grossRealized
    ? Math.abs(totalCost) / Math.max(1, Math.abs(grossRealized))
    : Math.abs(totalCost) > 0 ? Number.POSITIVE_INFINITY : 0;
  const shadow = costGuardShadow(positions, source);
  const symbolRows = costSymbolRows(positions, {
    asset,
    roundTripCost,
    fallbackExposure: closedExposureAverage || exposureAverage
  });
  const actions = costControlActions({
    costPressure,
    grossRealized,
    totalCost,
    realized,
    breakEvenMovePercent,
    marginRoiBreakEven,
    symbolRows,
    source,
    shadow
  });

  return {
    available,
    label: source.label || (source.key === 'vst' ? 'Futuros VST' : 'Futuros reales'),
    asset,
    positions,
    open,
    closed,
    fees,
    funding,
    realized,
    grossRealized,
    totalCost,
    marginAverage,
    exposureAverage,
    estimatedExecutions,
    feePerExecution,
    roundTripCost,
    breakEvenMovePercent,
    marginRoiBreakEven,
    costPressure,
    costPressureLabel: costPressureLabel(costPressure),
    shadow,
    symbolRows,
    actions
  };
}

function costGuardShadow(positions = [], source = {}) {
  const asset = source.asset || (source.key === 'vst' ? 'VST' : 'USDT');
  const enabled = appState.bingx?.costGuardEnabled !== false;
  const buffer = positiveNumber(appState.bingx?.costGuardFeeBuffer) || 2;
  const threshold = Number(appState.bingx?.costGuardMaxMarginBreakEvenPercent ?? 3);
  const rows = positions.map((position) => {
    const exposure = positionExposureForCost(position);
    const notional = Number(position.notional || 0);
    const estimatedRoundTripCost = roundPnl(exposure * COST_GUARD_TAKER_FEE_RATE * 2 * buffer);
    const breakEvenMarginRoi = notional > 0 ? (estimatedRoundTripCost / notional) * 100 : 0;
    const flagged = enabled && threshold > 0 && breakEvenMarginRoi > threshold;
    return {
      symbol: normalizeTradeSymbol(position.symbol) || '-',
      status: position.status,
      pnl: alignmentPnl(position),
      estimatedRoundTripCost,
      breakEvenMarginRoi,
      flagged
    };
  });
  const flagged = rows.filter((row) => row.flagged);
  const closedFlagged = flagged.filter((row) => row.status === 'closed');
  const flaggedPnl = roundPnl(flagged.reduce((sum, row) => sum + row.pnl, 0));
  const flaggedCost = roundPnl(flagged.reduce((sum, row) => sum + row.estimatedRoundTripCost, 0));
  const winners = closedFlagged.filter((row) => row.pnl > 0).length;
  const losers = closedFlagged.filter((row) => row.pnl < 0).length;
  return {
    enabled,
    asset,
    buffer,
    threshold,
    rows,
    flagged,
    flaggedCount: flagged.length,
    totalCount: rows.length,
    closedFlaggedCount: closedFlagged.length,
    flaggedPnl,
    flaggedCost,
    winners,
    losers,
    recommendation: costShadowRecommendation({ flagged, closedFlagged, flaggedPnl, flaggedCost })
  };
}

function renderCostShadow(shadow = {}) {
  if (!shadow.totalCount) {
    return '';
  }

  return `
    <div class="cost-shadow-header">
      <div>
        <strong>Modo sombra del filtro</strong>
        <span>No bloquea. Simula que habria pasado con umbral ${escapeHtml(formatPercent(shadow.threshold))} y colchon x${escapeHtml(String(shadow.buffer))}.</span>
      </div>
      <span class="ledger-status ${escapeAttribute(shadow.recommendation.className)}">${escapeHtml(shadow.recommendation.label)}</span>
    </div>
    <div class="cost-shadow-grid">
      ${renderCostMetric('Marcadas', `${shadow.flaggedCount}/${shadow.totalCount}`, `${shadow.closedFlaggedCount} cerradas con resultado`, shadow.flaggedCount ? 'warn' : 'amount positive')}
      ${renderCostMetric('PnL marcado', formatMoney(shadow.flaggedPnl, shadow.asset), 'Resultado de lo que habria filtrado', amountClass(shadow.flaggedPnl))}
      ${renderCostMetric('Coste estimado', formatMoney(shadow.flaggedCost, shadow.asset), 'Coste que habria evitado no entrando', amountClass(-shadow.flaggedCost))}
      ${renderCostMetric('W/L marcadas', `${shadow.winners}/${shadow.losers}`, 'Ganadoras/perdedoras dentro del filtro', shadow.losers > shadow.winners ? 'amount positive' : 'warn')}
    </div>
  `;
}

function costShadowRecommendation({ flagged = [], closedFlagged = [], flaggedPnl = 0, flaggedCost = 0 } = {}) {
  if (!flagged.length) {
    return {
      label: 'sin bloqueo',
      className: 'positive'
    };
  }
  if (closedFlagged.length < 20) {
    return {
      label: 'seguir midiendo',
      className: 'warn'
    };
  }
  if (flaggedPnl < 0 && Math.abs(flaggedPnl) > flaggedCost * 0.35) {
    return {
      label: 'bloqueo VST candidato',
      className: 'positive'
    };
  }
  return {
    label: 'mantener aviso',
    className: 'warn'
  };
}

function positionExposureForCost(position = {}) {
  const exposure = Number(position.exposure);
  if (Number.isFinite(exposure) && exposure > 0) {
    return exposure;
  }
  const notional = Number(position.notional);
  const leverage = Number(position.leverage);
  if (Number.isFinite(notional) && notional > 0 && Number.isFinite(leverage) && leverage > 0) {
    return notional * leverage;
  }
  return 0;
}

function costSymbolRows(positions = [], context = {}) {
  const bySymbol = new Map();
  for (const position of positions) {
    const symbol = normalizeTradeSymbol(position.symbol) || '-';
    const row = bySymbol.get(symbol) || {
      symbol,
      count: 0,
      closed: 0,
      wins: 0,
      pnl: 0,
      exposureValues: [],
      marginValues: []
    };
    row.count += 1;
    row.pnl = roundPnl(row.pnl + alignmentPnl(position));
    if (position.status === 'closed') {
      row.closed += 1;
      row.wins += alignmentPnl(position) > 0 ? 1 : 0;
    }
    const exposure = positionExposureForCost(position);
    if (exposure > 0) {
      row.exposureValues.push(exposure);
    }
    const margin = Number(position.notional);
    if (Number.isFinite(margin) && margin > 0) {
      row.marginValues.push(margin);
    }
    bySymbol.set(symbol, row);
  }

  return [...bySymbol.values()]
    .map((row) => {
      const avgExposure = averagePositiveNumber(row.exposureValues) || context.fallbackExposure || 0;
      const avgMargin = averagePositiveNumber(row.marginValues);
      const breakEvenMove = avgExposure > 0 ? (context.roundTripCost / avgExposure) * 100 : null;
      const breakEvenMarginRoi = avgMargin > 0 ? (context.roundTripCost / avgMargin) * 100 : null;
      return {
        ...row,
        asset: context.asset || 'USDT',
        avgExposure,
        avgMargin,
        breakEvenMove,
        breakEvenMarginRoi,
        winRate: row.closed ? (row.wins / row.closed) * 100 : null
      };
    })
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5);
}

function renderCostMetric(label, value, detail, className = '') {
  return `
    <div class="cost-metric">
      <span>${escapeHtml(label)}</span>
      <strong class="${escapeAttribute(className)}">${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function renderCostSymbolRow(row) {
  const pressureClass = row.breakEvenMove > 0.18 ? 'negative' : row.breakEvenMove > 0.1 ? 'warn' : 'positive';
  return `
    <div class="cost-symbol-row">
      <div>
        <strong>${escapeHtml(row.symbol)}</strong>
        <span>${escapeHtml(`${row.closed}/${row.count} cerradas · win ${formatPercent(row.winRate)}`)}</span>
      </div>
      <div>
        <span>PnL visible</span>
        <strong class="${amountClass(row.pnl)}">${escapeHtml(formatMoney(row.pnl, row.asset))}</strong>
      </div>
      <div>
        <span>Break-even</span>
        <strong class="${escapeAttribute(pressureClass)}">${escapeHtml(formatPercent(row.breakEvenMove))}</strong>
      </div>
      <div>
        <span>Sobre margen</span>
        <strong>${escapeHtml(formatPercent(row.breakEvenMarginRoi))}</strong>
      </div>
    </div>
  `;
}

function costControlActions(analysis) {
  const actions = [];
  if (!analysis.source?.available) {
    actions.push({
      tone: 'warn',
      label: 'Datos incompletos',
      detail: 'BingX no ha devuelto todo el historico de costes; usa el ultimo dato disponible.'
    });
  }
  if (analysis.totalCost < 0 && Math.abs(analysis.totalCost) > Math.abs(analysis.grossRealized)) {
    actions.push({
      tone: 'negative',
      label: 'El bruto no paga las fees',
      detail: 'Aunque las operaciones ganen en bruto, el neto puede quedar rojo si no hay recorrido suficiente.'
    });
  }
  if (analysis.breakEvenMovePercent > 0.12) {
    actions.push({
      tone: 'warn',
      label: 'Exigir mas recorrido',
      detail: `Cada orden necesita aprox. ${formatPercent(analysis.breakEvenMovePercent)} de precio solo para empatar costes.`
    });
  }
  if (analysis.symbolRows.some((row) => row.pnl < 0 && row.closed >= 2)) {
    actions.push({
      tone: 'warn',
      label: 'Filtrar por simbolo',
      detail: 'Hay activos con muestra negativa neta; conviene comparar BTC/ETH/SOL/SUI antes de real.'
    });
  }
  if (appState.bingx?.costGuardEnabled !== false && appState.bingx?.costGuardMode === 'block') {
    actions.push({
      tone: 'neutral',
      label: 'Bloqueo de coste activo',
      detail: 'Solo bloquea si un TP explicito no cubre el coste estimado; sin objetivo, avisa y conserva la replica.'
    });
  } else {
    actions.push({
      tone: 'neutral',
      label: 'Siguiente paso seguro',
      detail: 'Activar un filtro de coste deberia hacerse con confirmacion explicita porque puede saltarse senales.'
    });
  }
  return actions.slice(0, 4);
}

function costPressureLabel(value) {
  if (value === Number.POSITIVE_INFINITY) {
    return 'coste sin bruto';
  }
  if (value >= 1) {
    return 'coste critico';
  }
  if (value >= 0.45) {
    return 'coste alto';
  }
  if (value > 0) {
    return 'coste controlado';
  }
  return 'sin coste';
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

function renderPerformanceOverview(source = selectedPerformanceSource(), reference = currentReferenceLedger()) {
  if (!elements.performanceOverview) {
    return;
  }

  const sourcePositions = performanceSourcePositions(source.key, reference, source);
  const positions = sourcePositions.positions || [];
  const open = positions.filter((position) => position.status === 'open');
  const closed = positions.filter((position) => position.status === 'closed');
  const asset = sourcePositions.asset || source.asset || 'USDT';
  const balance = source.balance || {};
  const fees = Number(source.fees || 0);
  const funding = Number(source.funding || 0);
  const costs = roundPnl(fees + funding);
  const winRate = source.winRate ?? calculateWinRate(closed);
  const scenario = performanceScenario(open);
  const closedCount = Number(source.closedTrades || closed.length || 0);
  const equityBaseline = sourceEquityBaselineSnapshot(source);
  const statusLine = [
    source.status,
    `${open.length} abiertas`,
    `${closedCount} cerradas`
  ].filter(Boolean).join(' / ');

  const accountMetrics = [
    {
      label: source.key === 'live' ? 'Neto real' : 'Neto',
      value: formatOptionalMoney(source.total, asset),
      className: optionalAmountClass(source.total),
      detail: 'Realizado + flotante'
    },
    {
      label: 'ROI mensual',
      value: formatPercent(sourceMonthlyRoi(source)),
      className: amountClass(sourceMonthlyRoi(source)),
      detail: sourceMonthlyRoiBaseline(source)
        ? `Base ${formatMoney(sourceMonthlyRoiBaseline(source), asset)}`
        : 'Sin capital base'
    },
    ...(equityBaseline ? [
      {
        label: 'Equity vs inicial',
        value: formatMoney(equityBaseline.delta, equityBaseline.asset),
        className: amountClass(equityBaseline.delta),
        detail: `${formatPercent(equityBaseline.percent)} sobre ${formatMoney(equityBaseline.baseline, equityBaseline.asset)}`
      }
    ] : []),
    {
      label: 'Realizado',
      value: formatOptionalMoney(source.realized, asset),
      className: optionalAmountClass(source.realized),
      detail: `${closedCount} cierres`
    },
    {
      label: 'Flotante',
      value: formatOptionalMoney(source.floating, asset),
      className: optionalAmountClass(source.floating),
      detail: `${open.length} posiciones abiertas`
    },
    {
      label: 'Costes',
      value: formatOptionalMoney(costs, asset),
      className: optionalAmountClass(costs),
      detail: `Fees ${formatOptionalMoney(fees, asset)} / funding ${formatOptionalMoney(funding, asset)}`
    },
    {
      label: source.key === 'vst' ? 'Equity estrategia' : 'Equity cuenta',
      value: formatOptionalMoney(source.key === 'vst' ? balance.strategyEquity ?? balance.equity : balance.equity, asset),
      className: 'amount',
      detail: source.key === 'vst' && Number(balance.externalFunding || 0) > 0
        ? `Colateral ${formatOptionalMoney(balance.equity, asset)}`
        : `Balance ${formatOptionalMoney(balance.balance, asset)}`
    },
    ...(source.key === 'vst' && Number(balance.externalFunding || 0) > 0 ? [{
      label: 'Reserva técnica',
      value: formatOptionalMoney(balance.externalFunding, asset),
      className: 'amount',
      detail: `Objetivo libre ${formatOptionalMoney(source.technicalReserve?.target, asset)}`
    }] : []),
    {
      label: 'Margen libre',
      value: formatOptionalMoney(balance.availableMargin, asset),
      className: 'amount',
      detail: `Usado ${formatOptionalMoney(balance.usedMargin, asset)}`
    },
    {
      label: 'Exposicion viva',
      value: formatOptionalMoney(source.exposure, asset),
      className: 'amount',
      detail: `${source.openPositions || open.length} abiertas`
    },
    {
      label: 'Win rate',
      value: formatPercent(winRate),
      className: 'amount',
      detail: Number.isFinite(winRate) ? 'Cierres con PnL' : 'Sin muestra cerrada'
    }
  ];

  const scenarioMetrics = [
    {
      label: 'Ahora mismo',
      value: formatOptionalMoney(scenario.currentPnl, asset),
      className: optionalAmountClass(scenario.currentPnl),
      detail: 'PnL flotante vivo'
    },
    {
      label: 'Si todo va a TP',
      value: formatOptionalMoney(scenario.pnlAtTakeProfit, asset),
      className: optionalAmountClass(scenario.pnlAtTakeProfit),
      detail: scenario.takeProfitCount ? `${scenario.takeProfitCount}/${open.length} con TP` : 'Sin TP cargado'
    },
    {
      label: 'Si saltan los SL',
      value: formatOptionalMoney(scenario.pnlAtStopLoss, asset),
      className: optionalAmountClass(scenario.pnlAtStopLoss),
      detail: scenario.stopLossCount ? `${scenario.stopLossCount}/${open.length} con SL` : 'Sin SL cargado'
    },
    {
      label: 'Liq. mas cercana',
      value: formatOptionalPercent(scenario.minLiquidationDistancePct),
      className: liquidationClass(scenario.minLiquidationDistancePct),
      detail: scenario.minLiquidationSymbol || 'Sin dato de liquidacion'
    }
  ];

  elements.performanceOverview.innerHTML = `
    <div class="performance-overview-header">
      <div>
        <span class="performance-pill source-${escapeAttribute(source.key)}">${escapeHtml(source.modeLabel || source.label)}</span>
        <h3>${escapeHtml(source.key === 'live' ? 'Control de futuros reales' : `Control ${source.label}`)}</h3>
        <p>${escapeHtml(statusLine || 'Sin actividad cargada')}</p>
      </div>
      <div class="performance-safety ${scenario.stopLossCount === open.length && open.length ? 'ok' : 'warn'}">
        <strong>${escapeHtml(open.length ? `${scenario.stopLossCount}/${open.length}` : '0')}</strong>
        <span>con stop loss</span>
      </div>
    </div>

    <div class="performance-kpi-grid">
      ${accountMetrics.map(renderPerformanceMetric).join('')}
    </div>

    <div class="performance-scenario-grid">
      ${scenarioMetrics.map(renderPerformanceMetric).join('')}
    </div>

    <section class="performance-position-section">
      <div class="trade-section-header">
        <h3>Posiciones vivas</h3>
        <span>${escapeHtml(open.length ? 'Estimacion bruta sin comisiones' : 'Sin posiciones abiertas')}</span>
      </div>
      <div class="performance-position-grid">
        ${open.length ? open.map((position) => renderPerformancePositionCard(position, asset)).join('') : '<div class="empty-state compact">No hay posiciones abiertas en esta fuente.</div>'}
      </div>
    </section>
  `;
}

function renderPerformanceMetric(metric) {
  return `
    <div class="performance-metric">
      <span>${escapeHtml(metric.label)}</span>
      <strong class="${escapeAttribute(metric.className || 'amount')}">${escapeHtml(metric.value)}</strong>
      <small>${escapeHtml(metric.detail || '')}</small>
    </div>
  `;
}

function renderPerformancePositionCard(position, asset = positionAsset(position)) {
  const sideClass = escapeAttribute(String(position.direction || '').toLowerCase());
  const pnl = positionCurrentPnl(position);
  const takeProfitPnl = positionOutcomeAtPrice(position, position.takeProfit);
  const stopLossPnl = positionOutcomeAtPrice(position, position.stopLoss);
  const takeProfitDistance = priceDistancePercent(position.currentPrice, position.takeProfit);
  const stopLossDistance = priceDistancePercent(position.currentPrice, position.stopLoss);
  const liquidationPrice = positionLiquidationPrice(position);
  const liquidationDistance = priceDistancePercent(position.currentPrice, liquidationPrice);
  const margin = positionMargin(position);
  const exposure = positionExposure(position);
  const quantity = positionQuantity(position);
  const baseAsset = positionBaseAsset(position.symbol);

  return `
    <article class="performance-position-card ${sideClass}">
      <div class="performance-position-top">
        <div>
          <span class="side ${sideClass}">${escapeHtml(position.direction || '-')}</span>
          <strong>${escapeHtml(position.symbol || '-')}</strong>
          <small>${escapeHtml(`${formatLeverage(position.leverage)} / ${quantity ? `${formatQuantity(quantity)} ${baseAsset}` : 'cantidad -'}`)}</small>
        </div>
        <strong class="${amountClass(pnl)}">${escapeHtml(formatMoney(pnl, asset))}</strong>
      </div>
      <div class="performance-price-row">
        <span>Entrada ${escapeHtml(formatPrice(position.entryPrice))}</span>
        <span>Actual ${escapeHtml(formatPrice(position.currentPrice))}</span>
        <span>Margen ${escapeHtml(formatOptionalMoney(margin, asset))}</span>
        <span>Expo. ${escapeHtml(formatOptionalMoney(exposure, asset))}</span>
      </div>
      <div class="performance-position-metrics">
        <div>
          <span>TP ${escapeHtml(formatPrice(position.takeProfit))}</span>
          <strong class="${optionalAmountClass(takeProfitPnl)}">${escapeHtml(formatOptionalMoney(takeProfitPnl, asset))}</strong>
          <small>${escapeHtml(distanceLabel(takeProfitDistance))}</small>
        </div>
        <div>
          <span>SL ${escapeHtml(formatPrice(position.stopLoss))}</span>
          <strong class="${optionalAmountClass(stopLossPnl)}">${escapeHtml(formatOptionalMoney(stopLossPnl, asset))}</strong>
          <small>${escapeHtml(distanceLabel(stopLossDistance))}</small>
        </div>
        <div>
          <span>Liquidacion ${escapeHtml(formatPrice(liquidationPrice))}</span>
          <strong class="${liquidationClass(liquidationDistance)}">${escapeHtml(formatOptionalPercent(liquidationDistance))}</strong>
          <small>distancia</small>
        </div>
      </div>
    </article>
  `;
}

function performanceScenario(positions = []) {
  let currentPnl = 0;
  let pnlAtTakeProfit = 0;
  let pnlAtStopLoss = 0;
  let takeProfitCount = 0;
  let stopLossCount = 0;
  let minLiquidationDistancePct = null;
  let minLiquidationSymbol = '';

  for (const position of positions) {
    currentPnl += positionCurrentPnl(position);

    const tpPnl = positionOutcomeAtPrice(position, position.takeProfit);
    if (tpPnl != null) {
      pnlAtTakeProfit += tpPnl;
      takeProfitCount += 1;
    }

    const slPnl = positionOutcomeAtPrice(position, position.stopLoss);
    if (slPnl != null) {
      pnlAtStopLoss += slPnl;
      stopLossCount += 1;
    }

    const liqDistance = priceDistancePercent(position.currentPrice, positionLiquidationPrice(position));
    if (liqDistance != null && (minLiquidationDistancePct == null || liqDistance < minLiquidationDistancePct)) {
      minLiquidationDistancePct = liqDistance;
      minLiquidationSymbol = position.symbol || '';
    }
  }

  return {
    currentPnl: roundPnl(currentPnl),
    pnlAtTakeProfit: takeProfitCount ? roundPnl(pnlAtTakeProfit) : null,
    pnlAtStopLoss: stopLossCount ? roundPnl(pnlAtStopLoss) : null,
    takeProfitCount,
    stopLossCount,
    minLiquidationDistancePct,
    minLiquidationSymbol
  };
}

function positionCurrentPnl(position) {
  return roundPnl(Number(position.unrealizedPnl ?? position.paperPnl ?? position.realizedPnl ?? 0));
}

function positionOutcomeAtPrice(position, exitPrice) {
  const price = Number(exitPrice);
  const entry = Number(position.entryPrice || position.raw?.avgPrice);
  const quantity = positionQuantity(position);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(entry) || entry <= 0 || !quantity) {
    return null;
  }

  const direction = String(position.direction || position.raw?.positionSide || '').toUpperCase();
  const multiplier = direction === 'SHORT' ? -1 : 1;
  return roundPnl((price - entry) * quantity * multiplier);
}

function positionLiquidationPrice(position) {
  const value = Number(position.liquidationPrice || position.raw?.liquidationPrice);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function positionMargin(position) {
  const value = Number(position.raw?.initialMargin ?? position.notional ?? position.raw?.margin);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function positionExposure(position) {
  const value = Number(position.exposure ?? position.raw?.positionValue);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  const quantity = positionQuantity(position);
  const currentPrice = Number(position.currentPrice || position.raw?.markPrice);
  return quantity && Number.isFinite(currentPrice) ? roundPnl(quantity * currentPrice) : null;
}

function priceDistancePercent(fromPrice, targetPrice) {
  const from = Number(fromPrice);
  const target = Number(targetPrice);
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.abs(((target - from) / from) * 100);
}

function formatOptionalMoney(value, asset = 'USDT') {
  if (value == null || value === '') {
    return '-';
  }
  const number = Number(value);
  return Number.isFinite(number) ? formatMoney(number, asset) : '-';
}

function formatOptionalPercent(value) {
  if (value == null || value === '') {
    return '-';
  }
  const number = Number(value);
  return Number.isFinite(number) ? formatPercent(number) : '-';
}

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalAmountClass(value) {
  return value == null ? 'amount' : amountClass(value);
}

function positiveFiniteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function sourceMonthlyRoi(source = {}) {
  const baseline = sourceMonthlyRoiBaseline(source);
  const total = Number(source.total || 0);
  if (!Number.isFinite(total) || !baseline) {
    return null;
  }
  return (total / baseline) * 100;
}

function sourceMonthlyRoiBaseline(source = {}) {
  const explicit = positiveFiniteNumber(source.roiBaseline);
  if (explicit) {
    return explicit;
  }

  const total = Number(source.total || 0);
  const equity = positiveFiniteNumber(source.equity ?? source.balance?.strategyEquity ?? source.balance?.equity);
  if (equity && Number.isFinite(total)) {
    const baseline = equity - total;
    if (baseline > 0) {
      return baseline;
    }
  }

  const balance = positiveFiniteNumber(source.balance?.balance);
  const realized = Number(source.realized || 0);
  if (balance && Number.isFinite(realized)) {
    const baseline = balance - realized;
    if (baseline > 0) {
      return baseline;
    }
  }

  return null;
}

function sourceMonthlyRoiLabel(source = {}) {
  return `ROI mes ${formatPercent(sourceMonthlyRoi(source))}`;
}

function sourceMonthlyRoiClass(source = {}) {
  return amountClass(sourceMonthlyRoi(source));
}

function sourceEquityBaselineSnapshot(source = {}) {
  if (source.key !== 'vst' && source.key !== 'live') {
    return null;
  }
  const baseline = positiveFiniteNumber(source.roiBaseline ?? source.baseline);
  const equity = finiteNumber(source.balance?.strategyEquity ?? source.balance?.equity ?? source.equity, null);
  if (!baseline || equity == null) {
    return null;
  }
  const asset = source.asset || source.balance?.asset || 'USDT';
  const delta = roundPnl(equity - baseline);
  return {
    asset,
    baseline,
    equity,
    delta,
    percent: (delta / baseline) * 100
  };
}

function sourceEquityBaselineText(source = {}) {
  const snapshot = sourceEquityBaselineSnapshot(source);
  if (!snapshot) {
    return '';
  }
  return `Equity vs capital inicial: ${formatMoney(snapshot.delta, snapshot.asset)} (${formatPercent(snapshot.percent)})`;
}

function monthResetStatusText(bingx = {}) {
  if (!bingx?.vstPnlResetAt && !bingx?.livePnlResetAt) {
    return 'Sin reset mensual';
  }
  const month = bingx.monthlyResetMonth ? formatMonth(bingx.monthlyResetMonth) : 'mes actual';
  const vst = bingx.vstPnlResetAt ? formatDateTime(bingx.vstPnlResetAt) : 'sin corte';
  const live = bingx.livePnlResetAt ? formatDateTime(bingx.livePnlResetAt) : 'sin corte';
  return `${month}: VST ${vst} - Real ${live}`;
}

function renderSheetCapitalSimulator(source = {}, roi = sourceMonthlyRoi(source)) {
  if (!elements.sheetSimPanel || !elements.sheetSimCapital) {
    return;
  }

  const active = source.key === 'sheet';
  elements.sheetSimPanel.classList.toggle('hidden', !active);
  if (!active) {
    return;
  }

  const baseline = sourceMonthlyRoiBaseline(source);
  if (!appState.sheetSimTouched && !positiveFiniteNumber(appState.sheetSimCapital) && baseline) {
    appState.sheetSimCapital = baseline;
  }

  const capital = positiveFiniteNumber(appState.sheetSimCapital, baseline || 10000);
  const gain = Number.isFinite(Number(roi)) && capital ? roundPnl(capital * (Number(roi) / 100)) : null;
  const equity = gain == null ? null : roundPnl(capital + gain);

  if (document.activeElement !== elements.sheetSimCapital) {
    elements.sheetSimCapital.value = capital ? String(roundPnl(capital)) : '';
  }
  elements.sheetSimRoi.textContent = formatPercent(roi);
  elements.sheetSimRoi.className = amountClass(roi);
  elements.sheetSimGain.textContent = formatOptionalMoney(gain, source.asset || 'USDT');
  elements.sheetSimGain.className = amountClass(gain);
  elements.sheetSimEquity.textContent = formatOptionalMoney(equity, source.asset || 'USDT');
  elements.sheetSimEquity.className = amountClass(gain);
}

function storedSheetSimCapital() {
  try {
    return positiveFiniteNumber(window.localStorage?.getItem('futuresMagician.sheetSimCapital'));
  } catch {
    return null;
  }
}

function storeSheetSimCapital(value) {
  try {
    if (positiveFiniteNumber(value)) {
      window.localStorage?.setItem('futuresMagician.sheetSimCapital', String(value));
    } else {
      window.localStorage?.removeItem('futuresMagician.sheetSimCapital');
    }
  } catch {
    // Local storage is optional; the simulator still works for this session.
  }
}

function distanceLabel(value) {
  return value == null ? 'sin distancia' : `${formatOptionalPercent(value)} desde actual`;
}

function liquidationClass(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'amount';
  }
  if (number < 2) {
    return 'amount negative';
  }
  if (number < 5) {
    return 'amount warn';
  }
  return 'amount positive';
}

function sourcePrimaryValue(source) {
  if (source.key === 'vst' && Number.isFinite(Number(source.balance?.strategyEquity ?? source.balance?.equity))) {
    return Number(source.balance.strategyEquity ?? source.balance.equity);
  }
  return Number(source.total || 0);
}

function sourcePrimaryLabel(source) {
  if (source.key === 'vst' && Number.isFinite(Number(source.balance?.strategyEquity ?? source.balance?.equity))) {
    return 'Equity estrategia VST';
  }
  return source.key === 'live' ? 'Resultado real mes' : 'Resultado mes';
}

function sourcePrimaryClass(source) {
  const equityBaseline = sourceEquityBaselineSnapshot(source);
  if (equityBaseline) {
    return amountClass(equityBaseline.delta);
  }
  return source.key === 'vst' && Number.isFinite(Number(source.balance?.equity))
    ? 'amount'
    : amountClass(source.total);
}

function sourceHeroDetail(source) {
  const equityBaselineText = sourceEquityBaselineText(source);
  if (source.key === 'vst' && Number.isFinite(Number(source.balance?.equity))) {
    return [
      `${formatSourceMoney(source.total, source)} resultado demo mes`,
      equityBaselineText
    ].filter(Boolean).join(' Â· ');
  }
  return `${formatSourceMoney(source.realized, source)} realizado · ${formatSourceMoney(source.floating, source)} flotante`;
}

function sourceSecondaryLines(source) {
  if (source.key === 'vst' && source.balance) {
    return [
      `${formatSourceMoney(source.total, source)} resultado demo mes`,
      `${formatOptionalMoney(source.balance.availableMargin, source.asset || 'VST')} margen libre`,
      Number(source.balance.externalFunding || 0) > 0
        ? `${formatOptionalMoney(source.balance.equity, source.asset || 'VST')} colateral · ${formatOptionalMoney(source.balance.externalFunding, source.asset || 'VST')} técnico`
        : ''
    ].filter(Boolean);
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
  if (source.key === 'live') {
    return 'Futuros reales muestra solo USDT: cuenta real, posiciones reales, fees, funding y senales ejecutadas en real.';
  }
  if (source.key === 'vst') {
    return 'Futuros VST muestra BingX Demo por separado: cuenta demo, posiciones demo y resultado mensual en VST.';
  }
  return 'Cada tarjeta separa una fuente de PnL para evitar mezclar referencia y real.';
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
  const accountSource = selectedPerformanceSource(pnlSourceCards(currentReferenceLedger()));
  const targetNotional = Number(elements.pnlSimNotional.value || averagePositionNotional() || 0);
  const actualSource = source.key === 'live' || source.key === 'vst';
  const positions = actualSource ? source.positions : simulatedPositions(targetNotional, source.positions);
  const items = equityCurveItems(positions);
  const values = [0, ...items.map((item) => item.equity)];
  const finalValue = values.at(-1) || 0;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const drawdown = calculateMaxDrawdown(values);
  const chartId = 'pnl-plotly-curve';
  const curveStatusText = actualSource
    ? `${items.length} puntos reales/detectados - ${source.label}`
    : `${items.length} operaciones simuladas - ${source.label}`;
  const curvePanelStatus = actualSource ? `${items.length} puntos detectados` : curveStatusText;
  elements.pnlCurveStatus.textContent = curveStatusText;

  if (!items.length && !actualSource) {
    elements.pnlCurve.innerHTML = '<div class="pnl-chart-empty">Sin operaciones para graficar.</div>';
    return;
  }

  elements.pnlCurve.innerHTML = `
    ${actualSource ? renderAccountWaterfall(accountSource) : ''}
    <section class="detected-curve-panel">
      <div class="curve-panel-header">
        <div>
          <h4>${escapeHtml(actualSource ? 'Operaciones detectadas' : 'Curva simulada')}</h4>
          <p>${escapeHtml(actualSource ? 'Muestra operativa casada por la app o marcada a mercado.' : 'Recalcula la muestra con el capital y filtros elegidos.')}</p>
        </div>
        <span>${escapeHtml(curvePanelStatus)}</span>
      </div>
      ${items.length ? `
        <div class="plotly-curve-shell">
          <div id="${chartId}" class="plotly-curve-chart" role="img" aria-label="Curva interactiva de PnL acumulado"></div>
        </div>
        <div class="curve-stats plotly-curve-stats">
          <div>
            <span>Neto detectado</span>
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
        ${actualSource ? renderCurveTimeline(items, source.asset) : ''}
      ` : '<div class="pnl-chart-empty">Sin operaciones detectadas para graficar.</div>'}
    </section>
  `;

  if (items.length) {
    requestAnimationFrame(() => {
      renderPlotlyPnlCurve(chartId, items, {
        asset: source.asset || 'USDT',
        sourceLabel: source.label,
        title: actualSource ? 'PnL acumulado detectado' : 'PnL acumulado simulado',
        finalValue,
        maxValue,
        minValue,
        drawdown
      });
    });
  }
}

function renderPlotlyPnlCurve(chartId, items, options = {}) {
  const chart = document.getElementById(chartId);
  if (!chart) {
    return;
  }

  if (!window.Plotly?.react) {
    chart.innerHTML = '<div class="pnl-chart-empty">Cargando grafica interactiva...</div>';
    loadPlotlyLibrary()
      .then(() => renderPlotlyPnlCurve(chartId, items, options))
      .catch(() => {
        chart.innerHTML = '<div class="pnl-chart-empty">Plotly no esta disponible. Revisa la conexion y refresca la pagina.</div>';
      });
    return;
  }

  const asset = options.asset || 'USDT';
  const points = plotlyCurvePoints(items);
  const isPositive = Number(options.finalValue || 0) >= 0;
  const lineColor = isPositive ? '#087b76' : '#d73731';
  const fillColor = isPositive ? 'rgba(8, 123, 118, 0.13)' : 'rgba(215, 55, 49, 0.11)';

  const trace = {
    type: 'scatter',
    mode: 'lines+markers',
    x: points.map((point) => point.x),
    y: points.map((point) => point.equity),
    text: points.map((point) => point.label),
    customdata: points.map((point) => [
      formatMoney(point.pnl, asset),
      formatMoney(point.equity, asset),
      point.symbol || '-'
    ]),
    hovertemplate: [
      '<b>%{text}</b>',
      'Operacion: %{customdata[2]}',
      'PnL: %{customdata[0]}',
      'Acumulado: %{customdata[1]}',
      '<extra></extra>'
    ].join('<br>'),
    line: {
      color: lineColor,
      width: 3,
      shape: 'spline',
      smoothing: 0.35
    },
    marker: {
      color: lineColor,
      size: points.map((point, index) => (index === points.length - 1 ? 11 : 6)),
      line: {
        color: '#ffffff',
        width: 1.5
      }
    },
    fill: 'tozeroy',
    fillcolor: fillColor,
    name: options.sourceLabel || 'PnL'
  };

  const yValues = points.map((point) => point.equity);
  const maxAbs = Math.max(1, ...yValues.map((value) => Math.abs(Number(value || 0))));
  const tickSuffix = ` ${asset}`;
  const layout = {
    autosize: true,
    height: 360,
    margin: { l: 62, r: 24, t: 26, b: 48 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#fbfefd',
    hovermode: 'x unified',
    showlegend: false,
    font: {
      family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#102226'
    },
    xaxis: {
      title: '',
      showgrid: false,
      zeroline: false,
      tickfont: { size: 11, color: '#627579' },
      linecolor: '#d7e5e1',
      automargin: true
    },
    yaxis: {
      title: '',
      gridcolor: '#e6f0ed',
      zeroline: true,
      zerolinecolor: '#a7bab5',
      zerolinewidth: 1,
      tickfont: { size: 11, color: '#627579' },
      ticksuffix: tickSuffix,
      range: paddedPlotlyRange(yValues, maxAbs),
      automargin: true
    },
    annotations: [
      {
        xref: 'paper',
        yref: 'paper',
        x: 0,
        y: 1.08,
        xanchor: 'left',
        yanchor: 'top',
        showarrow: false,
        align: 'left',
        text: `<b>${escapePlotlyText(options.title || 'PnL acumulado')}</b><br><span style="color:#65767a">${escapePlotlyText(options.sourceLabel || '')}</span>`,
        font: { size: 13 }
      },
      {
        xref: 'paper',
        yref: 'paper',
        x: 1,
        y: 1.08,
        xanchor: 'right',
        yanchor: 'top',
        showarrow: false,
        align: 'right',
        text: `<b>${escapePlotlyText(formatMoney(options.finalValue || 0, asset))}</b><br><span style="color:#65767a">Drawdown ${escapePlotlyText(formatMoney(-(options.drawdown || 0), asset))}</span>`,
        font: { size: 13, color: lineColor }
      }
    ]
  };

  const config = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: `futures-magician-${asset.toLowerCase()}-curve`,
      height: 720,
      width: 1280,
      scale: 2
    }
  };

  window.Plotly.react(chart, [trace], layout, config);
}

function loadPlotlyLibrary() {
  if (window.Plotly?.react) {
    return Promise.resolve(window.Plotly);
  }
  if (plotlyLoadPromise) {
    return plotlyLoadPromise;
  }

  plotlyLoadPromise = PLOTLY_CDN_SOURCES
    .reduce((chain, src) => chain.catch(() => loadPlotlyScript(src)), Promise.reject(new Error('plotly_pending')))
    .then(() => {
      if (!window.Plotly?.react) {
        throw new Error('plotly_missing');
      }
      return window.Plotly;
    })
    .catch((error) => {
      plotlyLoadPromise = null;
      throw error;
    });

  return plotlyLoadPromise;
}

function loadPlotlyScript(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script) => script.src === src);
    if (existing?.dataset.plotlyLoaded === 'true' && window.Plotly?.react) {
      resolve();
      return;
    }
    if (existing && document.readyState === 'complete' && !window.Plotly?.react) {
      reject(new Error(`plotly_missing:${src}`));
      return;
    }

    const script = existing || document.createElement('script');
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`plotly_timeout:${src}`));
      }
    }, 15000);

    script.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        script.dataset.plotlyLoaded = 'true';
        resolve();
      }
    };
    script.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeout);
        reject(new Error(`plotly_error:${src}`));
      }
    };

    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.plotlyDynamic = 'true';
      document.head.appendChild(script);
    } else if (window.Plotly?.react) {
      window.clearTimeout(timeout);
      settled = true;
      resolve();
    }
  });
}

function plotlyCurvePoints(items) {
  const useDates = items.every((item) => Number.isFinite(Date.parse(item.at || '')));
  const firstTimestamp = useDates ? Date.parse(items[0]?.at || '') : null;
  const startX = Number.isFinite(firstTimestamp)
    ? new Date(Math.max(0, firstTimestamp - 60 * 1000)).toISOString()
    : 0;
  return [
    {
      x: startX,
      label: 'Inicio',
      symbol: '',
      pnl: 0,
      equity: 0
    },
    ...items.map((item, index) => ({
      x: plotlyPointX(item, index, useDates),
      label: `${index + 1}. ${item.symbol || 'Operacion'}`,
      symbol: item.symbol || '-',
      pnl: Number(item.pnl || 0),
      equity: Number(item.equity || 0)
    }))
  ];
}

function plotlyPointX(item, index, useDates = true) {
  if (!useDates) {
    return index + 1;
  }
  const timestamp = Date.parse(item.at || '');
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : index + 1;
}

function paddedPlotlyRange(values, maxAbs) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  if (min === max) {
    return [-maxAbs, maxAbs];
  }
  const padding = Math.max((max - min) * 0.16, maxAbs * 0.08);
  return [min - padding, max + padding];
}

function escapePlotlyText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAccountWaterfall(source) {
  const asset = source.asset || 'USDT';
  const grossRealized = finiteNumber(source.grossRealized, null);
  const realized = finiteNumber(source.realized, 0);
  const fees = finiteNumber(source.fees, 0);
  const funding = finiteNumber(source.funding, 0);
  const floating = finiteNumber(source.floating, 0);
  const total = finiteNumber(source.total, realized + floating);
  const equity = accountEquityValue(source, total);
  const previousEquity = finiteNumber(source.balance?.strategyBalance ?? source.balance?.balance, equity - total);
  const selectedRange = selectedAssetRange();
  const accountLine = accountAssetCurve(source, equity, total, selectedRange);
  const hasGross = grossRealized != null && Math.abs(grossRealized) > 0;
  const steps = [
    {
      key: 'realized',
      label: hasGross ? 'Cierres brutos' : 'Realizado neto',
      value: hasGross ? grossRealized : realized
    },
    ...(hasGross ? [
      { key: 'fees', label: 'Fees', value: fees },
      { key: 'funding', label: 'Funding', value: funding }
    ] : []),
    { key: 'floating', label: 'Flotante vivo', value: floating }
  ];
  const bars = waterfallBars(steps, total);
  const complete = !source.error;
  const accountScope = source.key === 'live'
    ? (complete ? 'Cuenta real' : 'Cuenta real: parcial')
    : (complete ? 'Cuenta VST' : 'Cuenta VST: parcial');
  const subtitle = complete
    ? accountScope
    : 'Rate-limit temporal';

  return `
    <section class="asset-performance-card ${escapeAttribute(amountTone(total))}">
      <div class="asset-card-copy">
        <span>Activos totales</span>
        <strong>${escapeHtml(formatMoney(equity, asset))}</strong>
        <small>≈ ${escapeHtml(formatMoney(previousEquity, asset))}</small>
        <p class="${amountClass(total)}">${escapeHtml(`PnL mes ${formatMoney(total, asset)}`)}</p>
        <div class="asset-card-actions">
          <span>${escapeHtml(subtitle)}</span>
          <span>${escapeHtml(`${source.openPositions || 0} abiertas`)}</span>
        </div>
      </div>
      <div class="asset-card-chart">
        ${renderAssetSparkline(accountLine.values, total, asset)}
        <div class="asset-chart-scale">
          <span>${escapeHtml(formatMoney(accountLine.max, asset))}</span>
          <span>${escapeHtml(formatMoney(accountLine.min, asset))}</span>
        </div>
        <div class="asset-range-tabs" aria-label="Rango de grafica">
          ${assetRangeOptions().map((option) => `
            <button class="${option.key === selectedRange ? 'active' : ''}" type="button" data-asset-range="${escapeAttribute(option.key)}">
              ${escapeHtml(option.label)}
            </button>
          `).join('')}
        </div>
      </div>
    </section>
    <section class="account-waterfall-panel">
      <div class="waterfall-summary">
        <div>
          <span>Realizado</span>
          <strong class="${amountClass(realized)}">${escapeHtml(formatMoney(realized, asset))}</strong>
        </div>
        <div>
          <span>Flotante</span>
          <strong class="${amountClass(floating)}">${escapeHtml(formatMoney(floating, asset))}</strong>
        </div>
        <div>
          <span>Fees</span>
          <strong class="${amountClass(fees)}">${escapeHtml(formatMoney(fees, asset))}</strong>
        </div>
        <div>
          <span>Funding</span>
          <strong class="${amountClass(funding)}">${escapeHtml(formatMoney(funding, asset))}</strong>
        </div>
      </div>
      <div class="account-waterfall">
        ${bars.map((bar) => `
          <div class="waterfall-row ${escapeAttribute(bar.final ? 'final' : amountTone(bar.value))}">
            <span>${escapeHtml(bar.label)}</span>
            <div class="waterfall-track" aria-hidden="true">
              <i style="left: ${escapeAttribute(bar.left)}%; width: ${escapeAttribute(bar.width)}%;"></i>
            </div>
            <strong class="${amountClass(bar.value)}">${escapeHtml(formatMoney(bar.value, asset))}</strong>
          </div>
        `).join('')}
      </div>
      <p class="curve-note">${escapeHtml(complete
        ? 'Desglose mensual de cuenta. La curva inferior es la muestra detectada por la app.'
        : 'Vista parcial por rate-limit temporal. El desglose completo vuelve cuando BingX desbloquee el resumen.')}</p>
    </section>
  `;
}

function accountEquityValue(source, total = 0) {
  const equity = finiteNumber(source.balance?.strategyEquity ?? source.balance?.equity, null);
  if (equity != null) {
    return equity;
  }
  const balance = finiteNumber(source.balance?.balance, null);
  return balance != null ? roundPnl(balance + total) : total;
}

function assetRangeOptions() {
  return [
    { key: '1D', label: '1D', ms: unitMs.day },
    { key: '7D', label: '7D', ms: 7 * unitMs.day },
    { key: '30D', label: '30D', ms: 30 * unitMs.day },
    { key: '180D', label: '180D', ms: 180 * unitMs.day }
  ];
}

function selectedAssetRange() {
  const options = assetRangeOptions();
  const selected = options.find((option) => option.key === appState.performanceRange);
  if (selected) {
    return selected.key;
  }
  appState.performanceRange = options[0].key;
  return options[0].key;
}

function assetRangeMs(key) {
  return assetRangeOptions().find((option) => option.key === key)?.ms || unitMs.day;
}

function accountAssetCurve(source, equity, total = 0, rangeKey = selectedAssetRange()) {
  const positions = performanceSourcePositions(source.key, currentReferenceLedger(), source).positions;
  const cutoff = Date.now() - assetRangeMs(rangeKey);
  const items = equityCurveItems(positions).filter((item) => {
    const timestamp = Date.parse(item.at || 0);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
  const detectedTotal = items.at(-1)?.equity || 0;
  const fallbackMove = detectedTotal || total || finiteNumber(source.floating, 0);
  const start = roundPnl(equity - fallbackMove);
  const values = [start, ...items.map((item) => roundPnl(start + item.equity))];
  if (values.length < 2 || values.at(-1) !== equity) {
    values.push(equity);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { values, min, max, range: rangeKey, points: items.length };
}

function renderAssetSparkline(values, finalValue = 0, asset = 'USDT') {
  const width = 100;
  const height = 44;
  const padding = 4;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const coordinates = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = padding + ((maxValue - value) / range) * (height - padding * 2);
    return { x, y };
  });
  const points = coordinates.map((point) => `${roundPnl(point.x)},${roundPnl(point.y)}`).join(' ');
  const last = coordinates.at(-1) || { x: width, y: height / 2 };
  const first = coordinates[0] || { x: 0, y: height / 2 };
  const areaPoints = `${points} ${roundPnl(last.x)},${height - padding} ${roundPnl(first.x)},${height - padding}`;

  return `
    <svg class="asset-sparkline ${amountTone(finalValue)}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${escapeAttribute(`Activos ${asset}`)}">
      <polygon class="asset-spark-area" points="${escapeAttribute(areaPoints)}"></polygon>
      <polyline class="asset-spark-line" points="${escapeAttribute(points)}"></polyline>
      <circle class="asset-spark-point" cx="${roundPnl(last.x)}" cy="${roundPnl(last.y)}" r="1.8"></circle>
    </svg>
  `;
}

function waterfallBars(steps, total) {
  let cumulative = 0;
  const rawBars = steps.map((step) => {
    const start = cumulative;
    cumulative = roundPnl(cumulative + Number(step.value || 0));
    return {
      label: step.label,
      value: Number(step.value || 0),
      start,
      end: cumulative,
      final: false
    };
  });
  rawBars.push({
    label: 'Neto cuenta',
    value: total,
    start: 0,
    end: total,
    final: true
  });

  const maxAbs = Math.max(1, ...rawBars.flatMap((bar) => [Math.abs(bar.start), Math.abs(bar.end)]));
  const min = -maxAbs;
  const max = maxAbs;
  const range = max - min || 1;
  return rawBars.map((bar) => {
    const start = Math.min(bar.start, bar.end);
    const end = Math.max(bar.start, bar.end);
    return {
      ...bar,
      left: roundPnl(((start - min) / range) * 100),
      width: Math.max(2, roundPnl(((end - start) / range) * 100))
    };
  });
}

function renderCurveTimeline(items, asset = 'USDT') {
  const recent = [...items].slice(-6).reverse();
  return `
    <div class="curve-timeline">
      ${recent.map((item) => `
        <div>
          <span>${escapeHtml(formatShortDateTime(item.at))}</span>
          <strong>${escapeHtml(item.symbol || '-')}</strong>
          <small class="${amountClass(item.pnl)}">${escapeHtml(formatMoney(item.pnl, asset))}</small>
          <em>${escapeHtml(item.status === 'open' ? 'abierta a mercado' : 'cerrada')}</em>
        </div>
      `).join('')}
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
        <strong class="${amountClass(row.total)}">${escapeHtml(formatMoney(row.total, row.asset || 'USDT'))}</strong>
      </div>
    `;
  }).join('');
}

function liveReadiness() {
  const bingx = appState.bingx || {};
  const telegram = appState.telegram || {};
  const health = appState.state?.health || {};
  const promotionGate = appState.state?.promotionGate || appState.operationalStatus?.promotionGate || {};
  const risk = localRiskSnapshot();
  const maxOpen = Number(bingx.maxOpenPositions || 0);
  const monthlyLimit = Number(bingx.maxMonthlyLossUSDT || 0);
  const maxSignalLeverage = Number(bingx.maxSignalLeverage || 0);
  const maxDailyOrders = Number(bingx.maxDailyOrders || 0);
  const dryRunOk = bingx.dryRunRequired === false
    || Boolean(bingx.dryRunCompletedAt)
    || (appState.paperTrades || []).length > 0;

  const items = [
    {
      key: 'monitor',
      label: 'Monitor live activo',
      ok: Boolean(appState.state?.running && appState.state?.phase === 'live' && !health.stale && !health.lastError)
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
      ok: maxOpen > 0 && maxSignalLeverage > 0 && maxDailyOrders >= 0
    },
    {
      key: 'dry-run',
      label: 'Dry-run/test ya ejecutado',
      ok: dryRunOk
    },
    {
      key: 'promotion-gate',
      label: promotionGate.label
        ? `Cohorte: ${promotionGate.label}`
        : 'Cohorte apta para revision humana',
      ok: promotionGate.eligibleForReview === true
    },
    {
      key: 'capacity',
      label: 'No hay bloqueo local',
      ok: !(maxOpen > 0 && risk.openPositions >= maxOpen)
        && !(monthlyLimit > 0 && risk.monthlyPnl <= -Math.abs(monthlyLimit))
        && !bingx.entriesPaused
        && !bingx.managementOnly
    }
  ];

  return {
    items,
    ready: items.every((item) => item.ok),
    live: usesLiveMode(bingx.mode) && bingx.liveConfirmed
  };
}

function renderLiveReadiness(readiness = liveReadiness()) {
  const missing = readiness.items.filter((item) => !item.ok).length;
  elements.liveReadinessStatus.textContent = readiness.live
    ? 'Live armado'
    : readiness.ready ? 'Listo' : `${missing} pendientes`;
  elements.liveReadinessStatus.className = amountClass(readiness.live || readiness.ready ? 1 : -1);
  elements.armLive.disabled = !readiness.ready || readiness.live;
  elements.disarmLive.disabled = !readiness.live && !usesLiveMode(appState.bingx?.mode);
  elements.liveReadinessList.innerHTML = readiness.items.map((item) => `
    <div class="live-check ${item.ok ? 'ok' : 'missing'}">
      <i data-lucide="${item.ok ? 'check' : 'x'}"></i>
      <span>${escapeHtml(item.label)}</span>
    </div>
  `).join('');
}

function renderHealthPanel() {
  const health = appState.state?.health || {};
  const scraper = health.scraper || {};
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
    ['Lecturas vacias', String(scraper.consecutiveEmptyReads || 0), scraper.consecutiveEmptyReads ? 'warn' : 'positive'],
    ['Autorecuperaciones', String(scraper.recoveryCount || 0), scraper.recoveryCount ? 'warn' : ''],
    ['WS precios', feedLabel, feed.connected ? 'positive' : feed.enabled ? 'negative' : ''],
    ['Mercado', feed.marketType ? 'Futuros USDⓈ' : '-', '']
  ].map(renderOpsMetric).join('');
}

function renderGuardDashboard() {
  if (!elements.guardStatus || !elements.guardMetrics || !elements.incidentStatus || !elements.incidentList) {
    return;
  }

  const status = appState.operationalStatus || {};
  const health = status.health || appState.state?.health || {};
  const safety = status.exchangeSafety || appState.exchangeSafety || {};
  const real = safety.real || {};
  const source = appState.telegramSource || {};
  const backup = status.backup || {};
  const incidents = status.incidents?.items || buildClientIncidents();
  const critical = incidents.filter((incident) => incident.level === 'error').length;
  const warns = incidents.filter((incident) => incident.level === 'warn').length;
  const liveReady = Boolean(appState.state?.running && appState.state?.phase === 'live' && health.level === 'ok' && !health.stale);
  const exchangeReady = safety.level === 'ok' && !safety.stale;
  const telegramReady = Boolean(source.enabled && source.url && source.executeSignals && source.liveConfirmed);
  const guardOk = liveReady && exchangeReady && telegramReady && !critical;
  const lastTrade = (appState.trades || [])[0] || null;
  const cooldown = pnlCooldownText();

  elements.guardStatus.textContent = guardOk
    ? 'Guardia estable'
    : critical ? `${critical} criticas` : 'Revisar avisos';
  elements.guardStatus.className = guardOk ? 'amount positive' : critical ? 'amount negative' : 'amount warn';
  elements.guardMetrics.innerHTML = [
    ['Live', liveReady ? 'activo' : 'revisar', liveReady ? 'positive' : 'negative'],
    ['Telegram Web', telegramReady ? 'gestion ok' : 'revisar', telegramReady ? 'positive' : 'warn'],
    ['BingX sync', safety.ageSeconds == null ? '-' : `${safety.ageSeconds}s`, exchangeReady ? 'positive' : 'negative'],
    ['Abiertas real', `${real.openPositions || 0}`, real.missingStopLoss ? 'negative' : 'positive'],
    ['Flotante', formatMoney(real.floatingPnl || 0, real.asset || 'USDT'), amountClass(real.floatingPnl || 0)],
    ['PnL historico', cooldown ? cooldown.replace('BingX PnL en cooldown hasta ', 'cooldown ') : 'ok', cooldown ? 'warn' : 'positive'],
    ['Backup auto', backupStatusText(backup), backup.lastError ? 'negative' : backup.lastRunAt ? 'positive' : 'warn'],
    ['Ultimo evento', lastTrade ? tradeStatusLabel(lastTrade.status) : '-', lastTrade && eventTone(lastTrade) === 'negative' ? 'negative' : '']
  ].map(renderOpsMetric).join('');

  elements.incidentStatus.textContent = incidents.length
    ? `${incidents.length} incidencias (${warns} avisos)`
    : '0 incidencias';
  elements.incidentStatus.className = critical ? 'amount negative' : warns ? 'amount warn' : 'amount positive';
  elements.incidentList.innerHTML = incidents.length
    ? incidents.slice(0, 8).map(renderIncidentItem).join('')
    : '<div class="empty-state compact">Sin incidencias relevantes en las ultimas 24h.</div>';
}

function renderIncidentItem(incident = {}) {
  return `
    <div class="incident-item ${escapeAttribute(incident.level || 'info')}">
      <span>${escapeHtml(formatShortDateTime(incident.at))}</span>
      <strong>${escapeHtml(incident.title || incident.type || 'Incidencia')}</strong>
      <small>${escapeHtml(truncateText(incident.message || '', 140))}</small>
    </div>
  `;
}

function buildClientIncidents() {
  const cutoff = Date.now() - 24 * unitMs.hour;
  return (appState.logs || [])
    .filter((log) => Date.parse(log.at || 0) >= cutoff)
    .map((log) => {
      const message = String(log.message || '');
      const rules = [
        [/No se detectaron mensajes Telegram/i, 'telegram_web_empty', 'Telegram Web sin mensajes visibles'],
        [/No se detectaron posts|YouTube no esta devolviendo posts/i, 'youtube_empty', 'YouTube sin posts visibles'],
        [/BingX PnL no disponible|Rate-limit PnL|frequency limit|100410/i, 'bingx_pnl_rate_limit', 'BingX PnL en rate-limit'],
        [/BingX sync|BingX safety|BingX posiciones/i, 'bingx_sync', 'Reconciliacion BingX'],
        [/Health:|Telegram health|Alerta scraper/i, 'monitor_health', 'Salud del monitor'],
        [/Backup redacted/i, 'backup', 'Backup automatico']
      ];
      const matched = rules.find(([pattern]) => pattern.test(message));
      if (!matched && log.level !== 'error') {
        return null;
      }
      return {
        at: log.at,
        level: log.level === 'error' ? 'error' : log.level === 'warn' ? 'warn' : 'info',
        type: matched?.[1] || 'error',
        title: matched?.[2] || 'Error',
        message
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

function backupStatusText(backup = {}) {
  if (backup.lastError) {
    return 'error';
  }
  if (backup.lastRunAt) {
    return humanLogAge(backup.lastRunAt);
  }
  if (backup.nextRunAt) {
    return 'programado';
  }
  return 'pendiente';
}

function renderTelegramWatchPanel() {
  if (!elements.telegramWatchStatus || !elements.telegramWatchMetrics || !elements.telegramWatchChecks) {
    return;
  }

  const source = appState.telegramSource || {};
  const active = Boolean(source.enabled && source.url);
  const lastRefresh = latestAppLog((log) => String(log.message || '').includes('Telegram Web refrescado'));
  const lastMissing = latestAppLog((log) => String(log.message || '').includes('No se detectaron mensajes Telegram'));
  const missingLastHour = countAppLogs((log) => String(log.message || '').includes('No se detectaron mensajes Telegram'), 60);
  const pnlLimit = latestAppLog((log) => String(log.message || '').includes('BingX PnL no disponible'));
  const pnlCooldown = pnlCooldownText();
  const refreshSeconds = Number(source.refreshSeconds || 0);
  const refreshAge = secondsSinceIso(lastRefresh?.at);
  const refreshStale = active
    && refreshSeconds > 0
    && Number.isFinite(refreshAge)
    && refreshAge > Math.max(refreshSeconds * 2.5, 120);
  const recentMissing = active
    && lastMissing
    && Number.isFinite(secondsSinceIso(lastMissing.at))
    && secondsSinceIso(lastMissing.at) < 30 * unitMs.minute / 1000;
  const needsLiveConfirm = usesLiveMode(appState.bingx?.mode) && source.executeSignals;
  const status = !active
    ? 'Desactivado'
    : refreshStale || recentMissing ? 'Revisar lectura' : 'Fuente activa';

  elements.telegramWatchStatus.textContent = status;
  elements.telegramWatchStatus.className = !active
    ? 'amount'
    : refreshStale || recentMissing ? 'amount warn' : 'amount positive';
  elements.telegramWatchMetrics.innerHTML = [
    ['Modo', active ? source.executeSignals ? 'Gestion' : 'Solo lectura' : 'off', active ? 'positive' : ''],
    ['Aperturas', source.executeOpenSignals ? 'habilitadas' : 'bloqueadas', source.executeOpenSignals ? 'warn' : 'positive'],
    ['Recarga', refreshSeconds ? `${refreshSeconds}s` : '-', refreshStale ? 'negative' : active ? 'positive' : ''],
    ['Ultimo refresh', lastRefresh ? humanLogAge(lastRefresh.at) : '-', refreshStale ? 'negative' : lastRefresh ? 'positive' : ''],
    ['Sin mensajes 1h', String(missingLastHour), missingLastHour ? 'warn' : 'positive'],
    ['PnL BingX', pnlCooldown ? pnlCooldown.replace('BingX PnL en cooldown hasta ', 'cooldown ') : pnlLimit && secondsSinceIso(pnlLimit.at) < 6 * 3600 ? `limit ${humanLogAge(pnlLimit.at)}` : 'ok', pnlCooldown || (pnlLimit && secondsSinceIso(pnlLimit.at) < 6 * 3600) ? 'warn' : 'positive']
  ].map(renderOpsMetric).join('');

  const checks = [
    {
      label: 'Canal configurado',
      ok: active,
      detail: active ? 'ok' : 'falta URL'
    },
    {
      label: 'Cierres/TP/SL',
      ok: Boolean(source.executeSignals),
      detail: source.executeSignals ? 'activos' : 'off'
    },
    {
      label: 'Confirmacion live',
      ok: !needsLiveConfirm || Boolean(source.liveConfirmed),
      detail: needsLiveConfirm ? source.liveConfirmed ? 'ok' : 'pendiente' : 'no aplica'
    },
    {
      label: 'Lectura reciente',
      ok: active && !refreshStale && !recentMissing,
      detail: recentMissing ? humanLogAge(lastMissing.at) : refreshStale ? 'stale' : 'ok'
    },
    {
      label: 'Aperturas desde Telegram',
      ok: !source.executeOpenSignals,
      detail: source.executeOpenSignals ? 'habilitadas' : 'bloqueadas'
    }
  ];

  elements.telegramWatchChecks.innerHTML = checks.map((check) => `
    <div class="exchange-safety-check ${check.ok ? 'ok' : 'missing'}">
      <i data-lucide="${check.ok ? 'check' : 'triangle-alert'}"></i>
      <span>${escapeHtml(check.label)}</span>
      <strong>${escapeHtml(check.detail)}</strong>
    </div>
  `).join('');
}

function renderRealModeBanner() {
  if (!elements.realModeBanner) {
    return;
  }

  const bingx = appState.bingx || {};
  const safety = appState.exchangeSafety || {};
  const health = appState.state?.health || {};
  const telegram = appState.telegram || {};
  const lastLiveEvent = (appState.trades || []).find((event) => eventAccountKey(event) === 'live' || String(event.status || '').startsWith('live_'));
  const lastError = (appState.trades || []).find((event) => event.status === 'error');
  const pnlLimit = latestAppLog((log) => String(log.message || '').includes('BingX PnL no disponible'));
  const real = safety.real || {};
  const active = usesLiveMode(bingx.mode) && bingx.liveConfirmed;
  elements.realModeBanner.classList.toggle('active', active);
  elements.realModeBanner.classList.toggle('paused', Boolean(bingx.entriesPaused || bingx.managementOnly));
  elements.realModeBanner.innerHTML = `
    <div>
      <span>${escapeHtml(active ? 'REAL ACTIVADO' : 'REAL NO ARMADO')}</span>
      <strong>${escapeHtml(realTabModeLabel(bingx.mode))}</strong>
    </div>
    <div>
      <span>Orden real</span>
      <strong>${escapeHtml(formatMoney(monthlyOrderNotional(bingx, 'USDT'), 'USDT'))}</strong>
    </div>
    <div>
      <span>Ultima ejecucion</span>
      <strong>${escapeHtml(lastLiveEvent ? formatDateTime(lastLiveEvent.at) : '-')}</strong>
    </div>
    <div>
      <span>Ultimo error</span>
      <strong>${escapeHtml(lastError ? reasonLabel(lastError.reason || lastError.status) : '-')}</strong>
    </div>
    <div>
      <span>Sync BingX</span>
      <strong>${escapeHtml(safety.ageSeconds === null || safety.ageSeconds === undefined ? '-' : `${safety.ageSeconds}s`)}</strong>
    </div>
    <div>
      <span>YouTube / Telegram</span>
      <strong>${escapeHtml(`${health.level === 'ok' ? 'YT ok' : 'YT revisar'} - ${telegram.enabled ? 'TG ok' : 'TG off'}`)}</strong>
    </div>
    <div>
      <span>Datos PnL</span>
      <strong>${escapeHtml(pnlLimit && secondsSinceIso(pnlLimit.at) < 6 * 3600 ? `Rate limit ${humanLogAge(pnlLimit.at)}` : 'BingX ok')}</strong>
    </div>
    <div>
      <span>Real abierto</span>
      <strong>${escapeHtml(`${real.openPositions || 0} - ${formatMoney(real.floatingPnl || 0, real.asset || 'USDT')}`)}</strong>
    </div>
  `;
}

function renderRiskPanel(openPositions = openPaperPositions(), closedPositions = closedPaperPositions()) {
  const risk = localRiskSnapshot(openPositions, closedPositions);
  const config = appState.bingx || {};
  const maxOpen = Number(config.maxOpenPositions || 0);
  const maxDailyOrders = Number(config.maxDailyOrders || 0);
  const dailyLimit = Number(config.maxDailyLossUSDT || 0);
  const monthlyLimit = Number(config.maxMonthlyLossUSDT || 0);
  const dailyOrders = dailyOpeningExecutions();
  const missingHardLimits = maxDailyOrders <= 0 || dailyLimit <= 0 || monthlyLimit <= 0;
  const blocked = (maxOpen > 0 && risk.openPositions >= maxOpen)
    || (dailyLimit > 0 && risk.dailyPnl <= -Math.abs(dailyLimit))
    || (monthlyLimit > 0 && risk.monthlyPnl <= -Math.abs(monthlyLimit))
    || (maxDailyOrders > 0 && dailyOrders >= maxDailyOrders)
    || config.entriesPaused
    || config.managementOnly;

  elements.riskStatus.textContent = blocked
    ? 'Bloqueo local activo'
    : missingHardLimits ? 'Limites sin tope duro' : 'Local dentro de limites';
  elements.riskStatus.className = blocked ? 'amount negative' : missingHardLimits ? 'amount warn' : 'amount positive';
  const dailyText = dailyLimit > 0
    ? `${formatUsdt(risk.dailyPnl)} / -${formatUsdt(dailyLimit)}`
    : `${formatUsdt(risk.dailyPnl)} / sin limite`;
  const monthlyText = monthlyLimit > 0
    ? `${formatUsdt(risk.monthlyPnl)} / -${formatUsdt(monthlyLimit)}`
    : `${formatUsdt(risk.monthlyPnl)} / sin limite`;

  elements.riskMetrics.innerHTML = [
    ['Abiertas local', `${risk.openPositions}/${maxOpen || '-'}`, maxOpen > 0 && risk.openPositions >= maxOpen ? 'negative' : ''],
    ['Ordenes dia', `${dailyOrders}/${maxDailyOrders || 'sin limite'}`, maxDailyOrders > 0 && dailyOrders >= maxDailyOrders ? 'negative' : maxDailyOrders > 0 ? 'positive' : 'warn'],
    ['Exposicion local', formatUsdt(risk.openExposure), ''],
    ['PnL dia local', dailyText, dailyLimit <= 0 ? 'warn' : risk.dailyPnl < 0 ? 'negative' : 'positive'],
    ['PnL mes local', monthlyText, monthlyLimit <= 0 ? 'warn' : risk.monthlyPnl < 0 ? 'negative' : 'positive']
  ].map(renderOpsMetric).join('');
}

function dailyOpeningExecutions() {
  const today = dayKeyFromValue(new Date());
  return (appState.trades || []).filter((event) => (
    dayKeyFromValue(event.at) === today
    && ['test_order_sent', 'demo_order_sent', 'live_order_sent'].includes(String(event.status || ''))
  )).length;
}

function renderExchangeSafetyPanel() {
  if (!elements.exchangeSafetyStatus || !elements.exchangeSafetyMetrics || !elements.exchangeSafetyChecks) {
    return;
  }

  const safety = appState.exchangeSafety || {};
  const real = safety.real || {};
  const level = safety.level || 'idle';
  const missingSl = Number(real.missingStopLoss || 0);
  const missingTp = Number(real.missingTakeProfit || 0);
  const balance = real.balance || {};
  const liquidation = real.nearestLiquidation || null;
  const status = level === 'ok'
    ? 'Real cubierto'
    : level === 'warn'
      ? missingSl ? 'Falta SL real' : 'Revisar sync'
      : 'Sin exchange activo';

  elements.exchangeSafetyStatus.textContent = status;
  elements.exchangeSafetyStatus.className = amountClass(level === 'ok' ? 1 : level === 'warn' ? -1 : 0);
  elements.exchangeSafetyMetrics.innerHTML = [
    ['Sync', safety.ageSeconds === null || safety.ageSeconds === undefined ? '-' : `${safety.ageSeconds}s`, safety.stale ? 'negative' : safety.enabled ? 'positive' : ''],
    ['Equity real', balance.equity == null ? '-' : formatMoney(balance.equity, balance.asset || 'USDT'), ''],
    ['Margen libre', balance.availableMargin == null ? '-' : formatMoney(balance.availableMargin, balance.asset || 'USDT'), ''],
    ['Margen usado', balance.usedMargin == null ? '-' : `${formatMoney(balance.usedMargin, balance.asset || 'USDT')} - ${formatPercent(balance.marginUsagePercent)}`, ''],
    ['Real abiertas', String(real.openPositions || 0), missingSl ? 'negative' : ''],
    ['Exposicion real', formatMoney(real.exposure || 0, real.asset || 'USDT'), ''],
    ['Flotante real', formatMoney(real.floatingPnl || 0, real.asset || 'USDT'), amountClass(real.floatingPnl || 0)],
    ['Liq. cercana', liquidation ? `${liquidation.symbol} ${formatPercent(liquidation.distancePercent)}` : '-', liquidation && liquidation.distancePercent < 5 ? 'negative' : ''],
    ['Pendientes', `${real.openOrders || 0} - huerf. ${real.orphanOrders || 0}`, real.orphanOrders ? 'negative' : '']
  ].map(renderOpsMetric).join('');

  const checks = Array.isArray(safety.checks) ? safety.checks : [];
  elements.exchangeSafetyChecks.innerHTML = checks.length
    ? checks.map((check) => `
      <div class="exchange-safety-check ${check.ok ? 'ok' : 'missing'}">
        <i data-lucide="${check.ok ? 'check' : 'triangle-alert'}"></i>
        <span>${escapeHtml(check.label)}</span>
        <strong>${escapeHtml(check.detail || '')}</strong>
      </div>
    `).join('')
    : '<div class="exchange-safety-empty">Activa BingX real o dual para reconciliar posiciones.</div>';

  if (missingSl || missingTp) {
    const missing = [
      missingSl ? `${missingSl} sin SL` : '',
      missingTp ? `${missingTp} sin TP` : ''
    ].filter(Boolean).join(' - ');
    elements.exchangeSafetyChecks.insertAdjacentHTML('beforeend', `
      <div class="exchange-safety-warning">
        ${escapeHtml(missing)}
      </div>
    `);
  }

  if (elements.emergencyStatus) {
    const paused = appState.bingx?.entriesPaused;
    const managementOnly = appState.bingx?.managementOnly;
    elements.emergencyStatus.textContent = paused
      ? 'Entradas pausadas'
      : managementOnly ? 'Solo gestion' : 'Listo';
    elements.pauseEntries.classList.toggle('active', Boolean(paused));
    elements.managementOnly.classList.toggle('active', Boolean(managementOnly));
    elements.cancelRealOrders.disabled = !usesLiveMode(appState.bingx?.mode) || !appState.bingx?.liveConfirmed;
    elements.closeRealAll.disabled = !usesLiveMode(appState.bingx?.mode) || !appState.bingx?.liveConfirmed;
  }
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

function latestAppLog(predicate) {
  return [...(appState.logs || [])]
    .filter((log) => {
      try {
        return predicate(log);
      } catch {
        return false;
      }
    })
    .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0))[0] || null;
}

function countAppLogs(predicate, minutes = 60) {
  const cutoff = Date.now() - Math.max(1, Number(minutes || 60)) * unitMs.minute;
  return (appState.logs || []).filter((log) => {
    const time = Date.parse(log.at || 0);
    if (!Number.isFinite(time) || time < cutoff) {
      return false;
    }
    try {
      return predicate(log);
    } catch {
      return false;
    }
  }).length;
}

function secondsSinceIso(value) {
  const time = Date.parse(value || 0);
  if (!Number.isFinite(time)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.round((Date.now() - time) / 1000));
}

function humanLogAge(value) {
  const seconds = secondsSinceIso(value);
  if (!Number.isFinite(seconds)) {
    return '-';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function pnlCooldownText() {
  const cooldownUntil = appState.pnlMeta?.cooldownUntil;
  if (!cooldownUntil) {
    return '';
  }
  const until = Date.parse(cooldownUntil);
  if (!Number.isFinite(until) || until <= Date.now()) {
    return '';
  }
  const time = new Date(until).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `BingX PnL en cooldown hasta ${time}`;
}

function topObjectEntries(value = {}, limit = 4) {
  return Object.entries(value || {})
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
    .slice(0, limit);
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
  const source = selectedPerformanceSource(pnlSourceCards(reference));
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
    const historicalRows = (appState.pnl?.historical?.months || [])
      .map((row) => createPnlRow(row.month, row.asset || source.asset || 'USDT', row))
      .filter((row) => row.total || row.paperPnl || row.closedTrades || row.testOrders || row.month === currentMonthKey());
    if (historicalRows.length) {
      return historicalRows;
    }
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

  if (source.month && (source.available || source.openPositions || source.closedTrades || source.total || source.floating || source.realized)) {
    const row = byMonth.get(source.month) || createPnlRow(source.month, source.asset || 'USDT', {});
    row.asset = source.asset || row.asset || 'USDT';
    row.total = roundPnl(Number(source.total || 0));
    row.realized = roundPnl(Number(source.realized || 0));
    row.paperPnl = row.total;
    row.paperRealized = row.realized;
    row.paperUnrealized = roundPnl(Number(source.floating || 0));
    row.fees = roundPnl(Number(source.fees || 0));
    row.funding = roundPnl(Number(source.funding || 0));
    row.closedTrades = Number(source.closedTrades || row.closedTrades || 0);
    row.closedPaperTrades = row.closedTrades;
    row.openPaperTrades = Number(source.openPositions || row.openPaperTrades || 0);
    row.testOrders = Number(source.records || row.testOrders || row.openPaperTrades + row.closedTrades || 0);
    byMonth.set(source.month, row);
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
    url: source.referenceLedger.url || '',
    startingCapital: source.referenceLedger.startingCapital ?? null,
    equity: source.referenceLedger.equity ?? null
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

function renderSheetVstAlignment(reference = currentReferenceLedger()) {
  if (!elements.alignmentSummary || !elements.alignmentStatus || !elements.replicaControl) {
    return;
  }

  const audit = appState.replicaAudit;
  if (audit?.summary && Array.isArray(audit.rows)) {
    renderOfficialSheetVstAlignment(audit);
    return;
  }

  elements.alignmentStatus.textContent = audit?.error ? 'Auditoría no disponible' : 'Cargando auditoría';
  elements.alignmentSummary.innerHTML = renderAlignmentMetric(
    'Control oficial',
    audit?.error ? 'Sin datos' : 'Cargando',
    audit?.error || 'Consultando Google Sheet y BingX VST',
    audit?.error ? 'amount negative' : ''
  );
  elements.replicaControl.innerHTML = renderReplicaAudit(audit);
}

function renderOfficialSheetVstAlignment(audit) {
  const summary = audit.summary || {};
  const rows = audit.rows || [];
  const hasNumericResult = (value) => value !== null
    && value !== undefined
    && value !== ''
    && Number.isFinite(Number(value));
  const sheetRows = rows.filter((row) => hasNumericResult(row.sheet?.pnl));
  const vstRows = rows.filter((row) => hasNumericResult(row.vst?.netPnl));
  const sheetWins = sheetRows.filter((row) => Number(row.sheet.pnl) > 0).length;
  const vstWins = vstRows.filter((row) => Number(row.vst.netPnl) > 0).length;
  const sheetWinRate = sheetRows.length ? (sheetWins / sheetRows.length) * 100 : null;
  const vstWinRate = vstRows.length ? (vstWins / vstRows.length) * 100 : null;
  const sheetCount = Number(summary.sheetRows || rows.length || 0);
  const executedCount = Number(summary.vstOpenings || 0);
  const missingCount = Math.max(0, sheetCount - executedCount);
  const alignedCount = Number(summary.issueCounts?.Alineada || 0);
  const reviewCount = Math.max(0, rows.length - alignedCount);

  elements.alignmentStatus.textContent = `${formatMonth(audit.month)} - ${executedCount}/${sheetCount} aperturas ejecutadas`;
  elements.alignmentSummary.innerHTML = [
    renderAlignmentMetric('Google Sheet', formatPercent(sheetWinRate), `${sheetRows.length} operaciones`, amountClass((sheetWinRate ?? 50) - 50)),
    renderAlignmentMetric('BingX VST', formatPercent(vstWinRate), `${vstRows.length} resultados auditables`, amountClass((vstWinRate ?? 50) - 50)),
    renderAlignmentMetric('Ejecutadas', `${executedCount}/${sheetCount}`, `${missingCount} no ejecutadas`, missingCount ? 'amount negative' : 'amount positive'),
    renderAlignmentMetric('Alineadas', String(alignedCount), `${reviewCount} requieren revisión`, reviewCount ? 'warn' : 'amount positive')
  ].join('');
  elements.replicaControl.innerHTML = renderReplicaAudit(audit);
}

function renderLegacySheetVstAlignment(reference = currentReferenceLedger()) {
  const alignment = buildSheetVstAlignment(reference);
  const {
    targetMonth,
    pairs,
    sheetClosed,
    vstClosed,
    sheetWinRate,
    vstWinRate,
    pairedCount,
    alignedCount,
    mismatchCount,
    missingVstCount,
    extraVstCount
  } = alignment;

  if (!reference?.positions?.length && !pairs.length) {
    elements.alignmentStatus.textContent = 'Esperando hoja y VST';
    elements.alignmentSummary.innerHTML = renderAlignmentMetric('Google Sheet', 'Sin hoja', 'No hay referencia del mes', '')
      + renderAlignmentMetric('Futuros VST', 'Sin operaciones', 'Aun no hay muestra demo', '');
    if (elements.replicaControl) {
      elements.replicaControl.innerHTML = '<div class="replica-empty">El control de replica se activara cuando existan datos de hoja y VST del mes.</div>';
    }
    elements.alignmentTable.innerHTML = '<tr><td colspan="6">Cuando haya hoja externa y operaciones VST, aqui veras la comparacion por activo y secuencia.</td></tr>';
    return;
  }

  elements.alignmentStatus.textContent = `${formatMonth(targetMonth)} - ${pairedCount} emparejadas`;
  elements.alignmentSummary.innerHTML = [
    renderAlignmentMetric('Google Sheet', formatPercent(sheetWinRate), `${sheetClosed.length} cierres`, amountClass((sheetWinRate ?? 50) - 50)),
    renderAlignmentMetric('Futuros VST', formatPercent(vstWinRate), `${vstClosed.length} cierres`, amountClass((vstWinRate ?? 50) - 50)),
    renderAlignmentMetric('Alineadas', String(alignedCount), `${pairedCount} pares detectados`, amountClass(alignedCount - mismatchCount)),
    renderAlignmentMetric('A revisar', String(mismatchCount + missingVstCount + extraVstCount), `${missingVstCount} faltan / ${extraVstCount} extra`, amountClass(-(mismatchCount + missingVstCount + extraVstCount)))
  ].join('');

  renderReplicaControl(reference, alignment);
  if (elements.alignmentTable) {
    elements.alignmentTable.innerHTML = pairs.length
    ? pairs.slice(0, 140).map(renderAlignmentRow).join('')
    : '<tr><td colspan="6">Sin operaciones del mes para comparar.</td></tr>';
  }
}

function buildSheetVstAlignment(reference = currentReferenceLedger()) {
  const targetMonth = currentMonthKey();
  const sheetRows = (reference?.positions || [])
    .map((position, index) => ({ ...position, _alignmentOrder: index, _alignmentSource: 'sheet' }))
    .filter((position) => monthKeyFromValue(position.closedAt || position.openedAt) === targetMonth);
  const vstRows = positionsForPnlSource('vst', reference)
    .map((position, index) => ({ ...position, _alignmentOrder: index, _alignmentSource: 'vst' }))
    .filter((position) => monthKeyFromValue(position.closedAt || position.openedAt) === targetMonth);
  const pairs = pairAlignmentRows(sheetRows, vstRows);
  const sheetClosed = sheetRows.filter((position) => position.status === 'closed');
  const vstClosed = vstRows.filter((position) => position.status === 'closed');
  const paired = pairs.filter((pair) => pair.sheet && pair.vst);
  const aligned = paired.filter((pair) => alignmentOutcome(pair.sheet) === alignmentOutcome(pair.vst));
  const mismatch = paired.filter((pair) => alignmentOutcome(pair.sheet) !== alignmentOutcome(pair.vst));

  return {
    targetMonth,
    pairs,
    sheetRows,
    vstRows,
    sheetClosed,
    vstClosed,
    sheetWinRate: calculateWinRate(sheetClosed),
    vstWinRate: calculateWinRate(vstClosed),
    paired,
    aligned,
    mismatch,
    pairedCount: paired.length,
    alignedCount: aligned.length,
    mismatchCount: mismatch.length,
    missingVstCount: pairs.filter((pair) => pair.sheet && !pair.vst).length,
    extraVstCount: pairs.filter((pair) => pair.vst && !pair.sheet).length
  };
}

function pairAlignmentRows(sheetRows = [], vstRows = []) {
  const symbols = new Set([
    ...sheetRows.map((position) => normalizeTradeSymbol(position.symbol)),
    ...vstRows.map((position) => normalizeTradeSymbol(position.symbol))
  ].filter(Boolean));
  const pairs = [];

  for (const symbol of [...symbols].sort()) {
    const sheetBySymbol = sheetRows
      .filter((position) => normalizeTradeSymbol(position.symbol) === symbol)
      .sort(compareAlignmentPositions);
    const vstBySymbol = vstRows
      .filter((position) => normalizeTradeSymbol(position.symbol) === symbol)
      .sort(compareAlignmentPositions);
    const max = Math.max(sheetBySymbol.length, vstBySymbol.length);
    for (let index = 0; index < max; index += 1) {
      pairs.push({
        symbol,
        sequence: index + 1,
        sheet: sheetBySymbol[index] || null,
        vst: vstBySymbol[index] || null
      });
    }
  }

  return pairs.sort((a, b) => alignmentPairSortValue(b) - alignmentPairSortValue(a) || a.symbol.localeCompare(b.symbol));
}

function compareAlignmentPositions(a, b) {
  const timeDiff = alignmentPositionSortValue(a) - alignmentPositionSortValue(b);
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return Number(a._alignmentOrder || 0) - Number(b._alignmentOrder || 0);
}

function alignmentPositionSortValue(position = {}) {
  const parsed = Date.parse(position.openedAt || position.closedAt || 0);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return Number(position._alignmentOrder || 0);
}

function alignmentPairSortValue(pair = {}) {
  return Math.max(
    alignmentPositionSortValue(pair.sheet || {}),
    alignmentPositionSortValue(pair.vst || {})
  );
}

function renderAlignmentMetric(label, value, detail, className = '') {
  return `
    <div class="alignment-card">
      <span>${escapeHtml(label)}</span>
      <strong class="${escapeAttribute(className)}">${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function renderReplicaControl(reference, alignment) {
  if (!elements.replicaControl) {
    return;
  }

  const analysis = buildReplicaControlAnalysis(reference, alignment);
  const actions = replicaRecommendedActions(analysis);
  const divergences = replicaDivergenceRows(alignment, analysis.scaleRatio);
  const statusLabel = analysis.reviewCount
    ? `${analysis.reviewCount} puntos a clavar`
    : 'Replica alineada';
  const statusClass = analysis.reviewCount ? (analysis.criticalCount ? 'negative' : 'warn') : 'positive';

  elements.replicaControl.innerHTML = `
    <div class="replica-header">
      <div>
        <strong>Control de replica</strong>
        <span>Compara hoja escalada, VST visible y BingX oficial. No modifica la operativa.</span>
      </div>
      <span class="ledger-status ${escapeAttribute(statusClass)}">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="replica-grid">
      ${renderReplicaMetric(
        'Hoja escalada',
        formatMoney(analysis.sheetScaledPnl, 'VST'),
        `${formatMoney(analysis.sheetPnl, 'USDT')} al ${formatPercent(analysis.scaleRatio * 100)} medio`,
        amountClass(analysis.sheetScaledPnl)
      )}
      ${renderReplicaMetric(
        'VST posiciones',
        formatMoney(analysis.vstPositionPnl, 'VST'),
        `${analysis.vstClosedCount} cerradas / ${analysis.vstOpenCount} abiertas`,
        amountClass(analysis.vstPositionPnl)
      )}
      ${renderReplicaMetric(
        'BingX oficial',
        analysis.officialAvailable ? formatMoney(analysis.officialTotal, 'VST') : 'Sin dato',
        analysis.officialAvailable ? `Realizado ${formatMoney(analysis.officialRealized, 'VST')}` : 'API PnL no disponible',
        analysis.officialAvailable ? amountClass(analysis.officialTotal) : ''
      )}
      ${renderReplicaMetric(
        'Gap oficial',
        analysis.officialAvailable ? formatMoney(analysis.officialGap, 'VST') : '-',
        'BingX oficial vs hoja escalada',
        analysis.officialAvailable ? amountClass(analysis.officialGap) : ''
      )}
      ${renderReplicaMetric(
        'Fees + funding',
        analysis.officialAvailable ? formatMoney(analysis.feesFunding, 'VST') : '-',
        'Coste real que no aparece igual en la hoja',
        analysis.officialAvailable ? amountClass(analysis.feesFunding) : ''
      )}
      ${renderReplicaMetric(
        'Entradas VST',
        `${analysis.sentOpenGroups}/${analysis.openSignalGroups}`,
        `${analysis.blockedThenSentCount} reintentadas / ${analysis.blockedOnlyCount} bloqueadas`,
        analysis.blockedOnlyCount ? 'amount negative' : analysis.blockedThenSentCount ? 'warn' : 'amount positive'
      )}
    </div>
    <div class="replica-columns">
      <div class="replica-box">
        <div class="replica-box-title">
          <strong>Causas del descuadre</strong>
          <span>${escapeHtml(formatMonth(analysis.targetMonth))}</span>
        </div>
        <div class="replica-list">
          ${renderReplicaCauseRows(analysis)}
        </div>
      </div>
      <div class="replica-box">
        <div class="replica-box-title">
          <strong>Filas que mas mueven el resultado</strong>
          <span>${escapeHtml(`${divergences.length} principales`)}</span>
        </div>
        <div class="replica-list">
          ${divergences.length ? divergences.map(renderReplicaDivergenceRow).join('') : '<div class="replica-empty">No hay divergencias fuertes en los pares detectados.</div>'}
        </div>
      </div>
      <div class="replica-box wide">
        <div class="replica-box-title">
          <strong>Plan para clavarlo</strong>
          <span>Sin tocar ejecucion aun</span>
        </div>
        <div class="replica-action-list">
          ${actions.map((action) => `<span>${escapeHtml(action)}</span>`).join('')}
        </div>
      </div>
    </div>
    ${renderReplicaAudit(appState.replicaAudit)}
  `;
}

function renderReplicaMetric(label, value, detail, className = '') {
  return `
    <div class="replica-metric">
      <span>${escapeHtml(label)}</span>
      <strong class="${escapeAttribute(className)}">${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function renderReplicaAudit(audit = appState.replicaAudit) {
  if (!audit) {
    return `
      <div class="replica-audit">
        <div class="replica-box-title">
          <strong>Auditoria operacion por operacion</strong>
          <span>Cargando</span>
        </div>
        <div class="replica-empty">Cargando comparador Hoja / replica teorica / BingX VST...</div>
      </div>
    `;
  }

  if (audit.error) {
    return `
      <div class="replica-audit">
        <div class="replica-box-title">
          <strong>Auditoria operacion por operacion</strong>
          <span>No disponible</span>
        </div>
        <div class="replica-empty">${escapeHtml(audit.error)}</div>
      </div>
    `;
  }

  const summary = audit.summary || {};
  const rows = audit.rows || [];
  const criticalRows = rows.filter((row) => row.severity === 'negative').length;
  const warningRows = rows.filter((row) => row.severity === 'warn').length;
  const bingxFees = Number(summary.bingxFees || 0);
  const bingxFunding = Number(summary.bingxFunding || 0);
  const actualRebate = Number(summary.actualCommissionRebate || 0);

  return `
    <div class="replica-audit">
      <div class="replica-box-title">
        <div>
          <strong>Auditoría operación por operación</strong>
          <span>${escapeHtml(`${rows.length} filas - ${criticalRows} críticas - ${warningRows} por revisar`)}</span>
        </div>
        <button class="button secondary replica-cohort-button" type="button" data-start-improvement-cohort>Nueva cohorte</button>
      </div>
      <div class="replica-audit-grid">
        ${renderReplicaMetric('Hoja externa', formatMoney(summary.sheetPnl, 'USDT'), `${summary.sheetRows || 0} filas`, amountClass(summary.sheetPnl))}
        ${renderReplicaMetric('Réplica teórica', formatMoney(summary.replicaPnl, 'VST'), `${formatMoney(summary.defaultNotionalVST, 'VST')} por orden`, amountClass(summary.replicaPnl))}
        ${renderReplicaMetric('BingX bruto', formatMoney(summary.bingxGross, 'VST'), `${summary.vstCloses || 0} cierres`, amountClass(summary.bingxGross))}
        ${renderReplicaMetric('BingX neto', formatMoney(summary.bingxNet, 'VST'), `${formatMoney(bingxFees + bingxFunding, 'VST')} costes`, amountClass(summary.bingxNet))}
        ${renderReplicaMetric('Neto con devolución', formatMoney(summary.bingxNetAfterEstimatedRebate, 'VST'), `${formatPercent(summary.estimatedCommissionRebatePercent)} de comisiones, escenario no acreditado`, amountClass(summary.bingxNetAfterEstimatedRebate))}
        ${renderReplicaMetric('Devolución detectada', formatMoney(actualRebate, 'VST'), summary.commissionRebateDetected ? 'Ingreso acreditado por BingX' : 'Sin ingreso de devolución en BingX', amountClass(actualRebate))}
        ${renderReplicaMetric('Tarifa real', formatCommissionRates(summary), 'Tarifa consultada en BingX', '')}
        ${renderReplicaMetric('Diferencia neta', formatMoney(summary.netGap, 'VST'), 'BingX neto frente a réplica teórica', amountClass(summary.netGap))}
      </div>
      ${renderImprovementCohort(audit.cohort)}
      <div class="replica-issue-strip">
        ${renderReplicaIssuePills(summary.issueCounts)}
      </div>
      <div class="replica-audit-wrap">
        <table class="replica-audit-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Activo</th>
              <th>Hoja externa</th>
              <th>Replica teorica</th>
              <th>BingX VST</th>
              <th>Desvio</th>
              <th>Causa</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.slice(0, 160).map(renderReplicaAuditRow).join('') : '<tr><td colspan="7">Sin filas auditables todavia.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderImprovementCohort(cohort) {
  if (!cohort) {
    return '<div class="replica-empty">La cohorte posterior a las mejoras todavía no está inicializada.</div>';
  }
  const summary = cohort.summary || {};
  const sample = cohort.sampleStatus || {};
  const coverage = appState.state?.signalCoverage || {};
  const coverageSummary = coverage.summary || {};
  const latestPackage = coverage.latestPackage || null;
  return `
    <section class="replica-cohort">
      <div class="replica-box-title">
        <div>
          <strong>Cohorte posterior a las mejoras</strong>
          <span>Desde ${escapeHtml(formatDateTime(cohort.startedAt))}</span>
        </div>
        <span class="ledger-status ${escapeAttribute(sample.key === 'contrastable' ? 'positive' : 'warn')}">${escapeHtml(sample.label || 'Sin muestra')}</span>
      </div>
      <div class="replica-audit-grid">
        ${renderReplicaMetric('Aperturas', String(summary.vstOpenings || 0), `${summary.sheetRows || 0} filas en la hoja`, '')}
        ${renderReplicaMetric('Cierres', String(summary.vstCloses || 0), sample.detail || 'Esperando operaciones', '')}
        ${renderReplicaMetric('Bruto', formatMoney(summary.bingxGross, 'VST'), 'Antes de costes', amountClass(summary.bingxGross))}
        ${renderReplicaMetric('Comisiones + funding', formatMoney(Number(summary.bingxFees || 0) + Number(summary.bingxFunding || 0), 'VST'), 'Coste observado', amountClass(Number(summary.bingxFees || 0) + Number(summary.bingxFunding || 0)))}
        ${renderReplicaMetric('Neto', formatMoney(summary.bingxNet, 'VST'), 'Resultado observado', amountClass(summary.bingxNet))}
        ${renderReplicaMetric('Cobertura', `${summary.vstOpenings || 0}/${summary.sheetRows || 0}`, 'Ejecuciones frente a hoja', summary.vstOpenings === summary.sheetRows && summary.sheetRows ? 'amount positive' : 'warn')}
        ${renderReplicaMetric('Paquetes completos', String(coverageSummary.completePackages || 0), `${coverageSummary.incompletePackages || 0} incompletos`, coverageSummary.incompletePackages ? 'amount negative' : 'amount positive')}
        ${renderReplicaMetric('Último paquete', latestPackage ? `${latestPackage.executedCount}/${latestPackage.expectedCount}` : 'Esperando', latestPackage ? formatSignalPackageStatus(latestPackage.status) : 'Sin señales nuevas', latestPackage?.status === 'complete' ? 'amount positive' : latestPackage?.status === 'incomplete' ? 'amount negative' : 'warn')}
      </div>
    </section>
  `;
}

function formatCommissionRates(summary = {}) {
  const taker = Number(summary.takerCommissionPercent);
  const maker = Number(summary.makerCommissionPercent);
  if (!Number.isFinite(taker) && !Number.isFinite(maker)) {
    return 'Sin dato';
  }
  return `Taker ${formatRatePercent(taker)} / Maker ${formatRatePercent(maker)}`;
}

function formatRatePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  return `${number.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
}

function formatSignalPackageStatus(status) {
  return {
    complete: 'Completo',
    incomplete: 'Incompleto',
    pending: 'Pendiente'
  }[status] || status || '-';
}

function renderReplicaIssuePills(issueCounts = {}) {
  const entries = Object.entries(issueCounts || {})
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
  if (!entries.length) {
    return '<span class="replica-issue-pill positive">Sin incidencias clasificadas</span>';
  }
  return entries.map(([label, count]) => `
    <span class="replica-issue-pill ${escapeAttribute(replicaIssueClass(label))}">
      ${escapeHtml(label)} ${escapeHtml(String(count))}
    </span>
  `).join('');
}

function replicaIssueClass(label = '') {
  if (/no ejecutada|stop|signo|fees/i.test(label)) {
    return 'negative';
  }
  if (/desviada|extra|abierta|diferencia/i.test(label)) {
    return 'warn';
  }
  return 'positive';
}

function renderReplicaAuditRow(row = {}) {
  const sheet = row.sheet || {};
  const replica = row.replica || {};
  const vst = row.vst || {};
  const diff = row.diff || {};
  const postLink = vst.postUrl
    ? `<a href="${escapeAttribute(vst.postUrl)}" target="_blank" rel="noreferrer">Post</a>`
    : '';
  const aggregation = Number(vst.aggregatedOpenings || 1) > 1
    ? `<span>${escapeHtml(`${vst.aggregatedOpenings} entradas agregadas`)}</span>`
    : '';
  return `
    <tr class="${escapeAttribute(row.severity || 'neutral')}">
      <td>
        <strong>${escapeHtml(String(row.orderNumber || row.sequence || '-'))}</strong>
        <span>${escapeHtml(formatAuditDate(vst.closingAt || vst.openingAt))}</span>
        ${aggregation}
      </td>
      <td>
        <strong>${escapeHtml(row.symbol || '-')}</strong>
        <span>${escapeHtml(row.direction || '-')}</span>
      </td>
      <td>
        <strong class="${amountClass(sheet.pnl)}">${escapeHtml(formatOptionalMoney(sheet.pnl, 'USDT'))}</strong>
        <span>${escapeHtml(`Entrada ${formatPrice(sheet.entry)} / Salida ${formatPrice(sheet.exit)}`)}</span>
      </td>
      <td>
        <strong class="${amountClass(replica.pnl)}">${escapeHtml(formatOptionalMoney(replica.pnl, 'VST'))}</strong>
        <span>${escapeHtml(`${formatOptionalMoney(replica.notional, 'VST')} margen`)}</span>
      </td>
      <td>
        <strong class="${amountClass(vst.netPnl)}">${escapeHtml(formatOptionalMoney(vst.netPnl, 'VST'))}</strong>
        <span>${escapeHtml(`Bruto ${formatOptionalMoney(vst.grossPnl, 'VST')} / Coste ${formatOptionalMoney(vst.fees, 'VST')}`)}</span>
      </td>
      <td>
        <strong class="${amountClass(diff.net)}">${escapeHtml(formatOptionalMoney(diff.net, 'VST'))}</strong>
        <span>${escapeHtml(`E ${formatOptionalPercent(diff.entryPercent)} / S ${formatOptionalPercent(diff.closePercent)}`)}</span>
      </td>
      <td>
        <strong>${escapeHtml(row.cause || '-')}</strong>
        <span>${escapeHtml(row.detail || '')}</span>
        ${postLink}
      </td>
    </tr>
  `;
}

function formatAuditDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildReplicaControlAnalysis(reference, alignment) {
  const sheetPnl = roundPnl(alignment.sheetRows.reduce((sum, position) => sum + alignmentPnl(position), 0));
  const vstPositionPnl = roundPnl(alignment.vstRows.reduce((sum, position) => sum + alignmentPnl(position), 0));
  const vstClosed = alignment.vstRows.filter((position) => position.status === 'closed');
  const vstOpen = alignment.vstRows.filter((position) => position.status !== 'closed');
  const scale = replicaScale(alignment);
  const sheetScaledPnl = roundPnl(sheetPnl * scale.ratio);
  const officialSource = appState.pnlSources?.sources?.vst || null;
  const officialTotal = finiteOrNull(officialSource?.total);
  const officialRealized = finiteOrNull(officialSource?.realized);
  const feesFunding = roundPnl(Number(officialSource?.fees || 0) + Number(officialSource?.funding || 0));
  const events = buildReplicaEventDiagnostics(alignment.targetMonth);
  const officialGap = officialTotal == null ? null : roundPnl(officialTotal - sheetScaledPnl);
  const positionGap = roundPnl(vstPositionPnl - sheetScaledPnl);
  const mismatchCount = alignment.mismatchCount || 0;
  const missingVstCount = alignment.missingVstCount || 0;
  const extraVstCount = alignment.extraVstCount || 0;
  const reviewCount = mismatchCount
    + missingVstCount
    + extraVstCount
    + events.closeNoPositionOnlyCount
    + events.blockedOnlyCount
    + (Math.abs(positionGap) > Math.max(1, Math.abs(sheetScaledPnl) * 0.08) ? 1 : 0)
    + (officialGap != null && Math.abs(officialGap) > Math.max(1, Math.abs(sheetScaledPnl) * 0.08) ? 1 : 0);
  const criticalCount = events.blockedOnlyCount
    + events.closeNoPositionOnlyCount
    + (officialGap != null && officialGap < -Math.max(5, Math.abs(sheetScaledPnl) * 0.2) ? 1 : 0);

  return {
    targetMonth: alignment.targetMonth,
    sheetPnl,
    sheetScaledPnl,
    vstPositionPnl,
    vstClosedCount: vstClosed.length,
    vstOpenCount: vstOpen.length,
    scaleRatio: scale.ratio,
    sheetAverageSize: scale.sheetAverage,
    vstAverageSize: scale.vstAverage,
    officialAvailable: officialTotal != null,
    officialTotal: officialTotal ?? 0,
    officialRealized: officialRealized ?? 0,
    officialGap: officialGap ?? 0,
    positionGap,
    feesFunding,
    mismatchCount,
    missingVstCount,
    extraVstCount,
    reviewCount,
    criticalCount,
    ...events
  };
}

function replicaScale(alignment) {
  const sheetAverage = averagePositiveNumber(alignment.sheetRows.map((position) => position.notional));
  const vstAverage = averagePositiveNumber(alignment.vstRows.map((position) => position.notional))
    || positiveNumber(appState.bingx?.monthlyOrderNotionalVST)
    || positiveNumber(appState.bingx?.defaultNotionalUSDT)
    || positiveNumber(appState.bingx?.notional);
  const ratio = sheetAverage && vstAverage ? vstAverage / sheetAverage : 0;
  return {
    ratio,
    sheetAverage: sheetAverage || 0,
    vstAverage: vstAverage || 0
  };
}

function buildReplicaEventDiagnostics(targetMonth) {
  const events = demoReplicaEvents(targetMonth);
  const openGroups = new Map();
  const closeGroups = new Map();

  for (const event of events) {
    const action = replicaEventAction(event);
    const status = String(event.status || '');
    if (action === 'OPEN') {
      const group = upsertReplicaEventGroup(openGroups, event, action);
      if (status === 'demo_order_sent') {
        group.sent = true;
      }
      if (status === 'blocked' && String(event.reason || '').includes('exchange_stop_loss_invalid')) {
        group.blocked = true;
        group.reason = event.reason || group.reason;
      }
      continue;
    }

    if (action === 'CLOSE') {
      const group = upsertReplicaEventGroup(closeGroups, event, action);
      if (status === 'demo_close_sent') {
        group.sent = true;
      }
      if (status === 'demo_close_no_position') {
        group.noPosition = true;
      }
    }
  }

  const open = [...openGroups.values()];
  const close = [...closeGroups.values()];
  const blockedOnly = open.filter((group) => group.blocked && !group.sent);
  const blockedThenSent = open.filter((group) => group.blocked && group.sent);
  const closeNoPositionOnly = close.filter((group) => group.noPosition && !group.sent);

  return {
    recentEventCount: events.length,
    openSignalGroups: open.length,
    sentOpenGroups: open.filter((group) => group.sent).length,
    blockedOnlyCount: blockedOnly.length,
    blockedThenSentCount: blockedThenSent.length,
    closeSignalGroups: close.length,
    closeNoPositionOnlyCount: closeNoPositionOnly.length,
    closeNoPositionSymbols: countReplicaGroupsBySymbol(closeNoPositionOnly),
    blockedOnlySymbols: countReplicaGroupsBySymbol(blockedOnly)
  };
}

function demoReplicaEvents(targetMonth) {
  const resetAt = Date.parse(appState.bingx?.vstPnlResetAt || 0);
  return (appState.trades || []).filter((event) => {
    const status = String(event.status || '').toLowerCase();
    const source = String(event.exchangePosition?.source || event.position?.source || '').toLowerCase();
    const isDemo = eventAccountKey(event) === 'demo'
      || String(event.executionMode || '').toLowerCase() === 'demo'
      || status.startsWith('demo_')
      || source === 'demo';
    if (!isDemo) {
      return false;
    }
    const eventTime = Date.parse(event.at || 0);
    if (Number.isFinite(resetAt) && resetAt > 0) {
      return Number.isFinite(eventTime) && eventTime >= resetAt;
    }
    return monthKeyFromValue(event.at) === targetMonth;
  });
}

function replicaEventAction(event = {}) {
  const signalAction = String(event.signal?.action || '').toUpperCase();
  const status = String(event.status || '').toLowerCase();
  if (signalAction === 'CLOSE' || signalAction === 'CLOSE_ALL' || status.includes('_close_')) {
    return 'CLOSE';
  }
  if (signalAction === 'SET_TAKE_PROFIT' || signalAction === 'SET_STOP_LOSS' || signalAction === 'MOVE_SL_BE') {
    return signalAction;
  }
  if (status === 'demo_order_sent' || status === 'blocked' || signalAction === 'OPEN' || event.signal?.entryPrice) {
    return 'OPEN';
  }
  return signalAction || 'OTHER';
}

function upsertReplicaEventGroup(groups, event, action) {
  const symbol = replicaEventSymbol(event);
  const key = [
    event.postId || event.postUrl || dayKeyFromValue(event.at) || 'sin-post',
    symbol,
    event.signal?.direction || event.order?.side || '',
    action
  ].join('|');
  const group = groups.get(key) || {
    key,
    symbol,
    action,
    firstAt: event.at,
    postUrl: event.postUrl || '',
    sent: false,
    blocked: false,
    noPosition: false,
    reason: ''
  };
  group.firstAt = newerIso(group.firstAt, event.at);
  group.postUrl ||= event.postUrl || '';
  groups.set(key, group);
  return group;
}

function replicaEventSymbol(event = {}) {
  return normalizeTradeSymbol(
    event.signal?.symbol
      || event.order?.symbol
      || event.exchangePosition?.symbol
      || event.position?.symbol
      || ''
  ) || '-';
}

function countReplicaGroupsBySymbol(groups = []) {
  const totals = {};
  for (const group of groups) {
    totals[group.symbol || '-'] = (totals[group.symbol || '-'] || 0) + 1;
  }
  return totals;
}

function renderReplicaCauseRows(analysis) {
  const rows = [
    {
      label: 'Gap posiciones vs hoja',
      value: formatMoney(analysis.positionGap, 'VST'),
      detail: 'Diferencia usando operaciones VST visibles',
      tone: amountTone(analysis.positionGap)
    },
    {
      label: 'Signo cambiado',
      value: String(analysis.mismatchCount),
      detail: 'Pares donde hoja gana y VST pierde, o al reves',
      tone: analysis.mismatchCount ? 'warn' : 'positive'
    },
    {
      label: 'Faltan en VST',
      value: String(analysis.missingVstCount),
      detail: 'Operaciones de hoja sin pareja demo',
      tone: analysis.missingVstCount ? 'negative' : 'positive'
    },
    {
      label: 'Cierres sin posicion',
      value: String(analysis.closeNoPositionOnlyCount),
      detail: replicaSymbolSummary(analysis.closeNoPositionSymbols) || 'Sin cierres perdidos',
      tone: analysis.closeNoPositionOnlyCount ? 'negative' : 'positive'
    },
    {
      label: 'Bloqueadas sin entrar',
      value: String(analysis.blockedOnlyCount),
      detail: replicaSymbolSummary(analysis.blockedOnlySymbols) || 'Sin bloqueos pendientes',
      tone: analysis.blockedOnlyCount ? 'negative' : 'positive'
    },
    {
      label: 'Reintentos por stop',
      value: String(analysis.blockedThenSentCount),
      detail: 'Entradas recuperadas tras precio/SL invalido',
      tone: analysis.blockedThenSentCount ? 'warn' : 'positive'
    }
  ];

  return rows.map((row) => `
    <div class="replica-row">
      <div>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.detail)}</span>
      </div>
      <em class="${escapeAttribute(row.tone)}">${escapeHtml(row.value)}</em>
    </div>
  `).join('');
}

function replicaDivergenceRows(alignment, scaleRatio) {
  return (alignment.pairs || [])
    .map((pair) => {
      const sheetScaled = pair.sheet ? roundPnl(alignmentPnl(pair.sheet) * scaleRatio) : 0;
      const vstPnl = pair.vst ? alignmentPnl(pair.vst) : 0;
      return {
        pair,
        sheetScaled,
        vstPnl,
        diff: roundPnl(vstPnl - sheetScaled),
        status: alignmentPairStatus(pair)
      };
    })
    .filter((row) => row.status.key !== 'aligned' || Math.abs(row.diff) > 1)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 6);
}

function renderReplicaDivergenceRow(row) {
  const symbol = row.pair.symbol || '-';
  const status = row.status;
  return `
    <div class="replica-row">
      <div>
        <strong>${escapeHtml(`${symbol} #${row.pair.sequence}`)}</strong>
        <span>Hoja escalada ${escapeHtml(formatMoney(row.sheetScaled, 'VST'))} / VST ${escapeHtml(formatMoney(row.vstPnl, 'VST'))}</span>
      </div>
      <em class="${escapeAttribute(status.className)}">${escapeHtml(status.label)}</em>
    </div>
  `;
}

function replicaRecommendedActions(analysis) {
  const actions = [];
  if (analysis.blockedOnlyCount) {
    actions.push('Priorizar cola de reintento para entradas bloqueadas por precio/stop invalido.');
  }
  if (analysis.closeNoPositionOnlyCount) {
    actions.push('Auditar cierres sin posicion: suelen explicar por que la hoja cierra algo que VST ya no tiene abierto.');
  }
  if (analysis.mismatchCount) {
    actions.push('Revisar primero las filas con signo cambiado; son las que mas rompen la replica.');
  }
  if (Math.abs(analysis.feesFunding) > 0.01) {
    actions.push('Separar rendimiento bruto y neto para no confundir estrategia con coste de BingX.');
  }
  if (analysis.missingVstCount || analysis.extraVstCount) {
    actions.push('Comparar secuencia por activo y post para detectar scraping incompleto o duplicado.');
  }
  if (!actions.length) {
    actions.push('La muestra visible esta alineada; mantener monitorizacion y ampliar historico.');
  }
  return actions.slice(0, 5);
}

function replicaSymbolSummary(values = {}) {
  return topObjectEntries(values, 4)
    .map(([symbol, count]) => `${symbol} ${count}`)
    .join(' / ');
}

function averagePositiveNumber(values = []) {
  const clean = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!clean.length) {
    return 0;
  }
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scrollAlignmentTable(direction) {
  const wrap = document.querySelector('.replica-audit-wrap, .alignment-wrap');
  if (!wrap) {
    return;
  }

  const verticalStep = Math.max(220, Math.round(wrap.clientHeight * 0.72));
  const horizontalStep = Math.max(220, Math.round(wrap.clientWidth * 0.66));
  const moves = {
    up: { top: -verticalStep, left: 0 },
    down: { top: verticalStep, left: 0 },
    left: { top: 0, left: -horizontalStep },
    right: { top: 0, left: horizontalStep }
  };
  const move = moves[direction] || moves.down;
  wrap.scrollBy({ ...move, behavior: 'smooth' });
}

function renderAlignmentRow(pair) {
  const status = alignmentPairStatus(pair);
  const sheetOutcome = alignmentOutcome(pair.sheet);
  const vstOutcome = alignmentOutcome(pair.vst);
  const rowClass = status.key === 'aligned' ? '' : 'needs-review';

  return `
    <tr class="${escapeAttribute(rowClass)}">
      <td>
        <strong>${escapeHtml(String(pair.sequence))}</strong>
        <span>${escapeHtml(formatAlignmentDate(pair))}</span>
      </td>
      <td>
        <strong>${escapeHtml(pair.symbol || '-')}</strong>
        <span>${escapeHtml(alignmentSideLabel(pair))}</span>
      </td>
      <td>${renderAlignmentPositionCell(pair.sheet, 'USDT', sheetOutcome)}</td>
      <td>${renderAlignmentPositionCell(pair.vst, 'VST', vstOutcome)}</td>
      <td>${renderAlignmentReading(pair, sheetOutcome, vstOutcome)}</td>
      <td><span class="ledger-status ${escapeAttribute(status.className)}">${escapeHtml(status.label)}</span></td>
    </tr>
  `;
}

function renderAlignmentPositionCell(position, asset, outcome = alignmentOutcome(position)) {
  if (!position) {
    return '<span class="alignment-muted">Sin registro</span>';
  }
  const pnl = alignmentPnl(position);
  return `
    <strong class="${amountClass(pnl)}">${escapeHtml(formatMoney(pnl, asset))}</strong>
    <span>${escapeHtml(alignmentOutcomeLabel(outcome))}</span>
    <span>Entrada ${escapeHtml(formatPrice(position.entryPrice))} / Salida ${escapeHtml(formatPrice(alignmentExitPrice(position)))}</span>
  `;
}

function renderAlignmentReading(pair, sheetOutcome, vstOutcome) {
  if (pair.sheet && !pair.vst) {
    return '<strong>Operacion de la hoja sin ejecucion VST</strong><span>Revisar bloqueo, precio o scraping.</span>';
  }
  if (pair.vst && !pair.sheet) {
    return '<strong>Operacion VST extra</strong><span>No aparece en la referencia externa.</span>';
  }
  if (sheetOutcome === vstOutcome) {
    return '<strong>Resultado alineado</strong><span>La direccion del resultado coincide.</span>';
  }
  return `<strong>Resultado distinto</strong><span>Sheet ${escapeHtml(alignmentOutcomeLabel(sheetOutcome))} / VST ${escapeHtml(alignmentOutcomeLabel(vstOutcome))}</span>`;
}

function alignmentPairStatus(pair) {
  if (pair.sheet && !pair.vst) {
    return { key: 'missing_vst', label: 'Falta VST', className: 'negative' };
  }
  if (pair.vst && !pair.sheet) {
    return { key: 'extra_vst', label: 'Extra VST', className: 'warn' };
  }
  if (alignmentOutcome(pair.sheet) === alignmentOutcome(pair.vst)) {
    return { key: 'aligned', label: 'Alineada', className: 'positive' };
  }
  return { key: 'mismatch', label: 'Diferente', className: 'warn' };
}

function alignmentOutcome(position) {
  if (!position) {
    return 'missing';
  }
  if (position.status !== 'closed') {
    return 'open';
  }
  const pnl = alignmentPnl(position);
  if (pnl > 0) {
    return 'win';
  }
  if (pnl < 0) {
    return 'loss';
  }
  return 'flat';
}

function alignmentOutcomeLabel(outcome) {
  if (outcome === 'win') {
    return 'Ganadora';
  }
  if (outcome === 'loss') {
    return 'Perdedora';
  }
  if (outcome === 'open') {
    return 'Abierta';
  }
  if (outcome === 'flat') {
    return 'Plana';
  }
  return 'Sin dato';
}

function alignmentPnl(position = {}) {
  return roundPnl(Number(position.paperPnl ?? position.realizedPnl ?? position.unrealizedPnl ?? 0));
}

function alignmentExitPrice(position = {}) {
  return position.closePrice ?? position.currentPrice ?? position.markPrice ?? position.entryPrice;
}

function alignmentSideLabel(pair = {}) {
  const position = pair.sheet || pair.vst || {};
  return [position.direction, formatLeverage(position.leverage)].filter(Boolean).join(' / ') || '-';
}

function formatAlignmentDate(pair = {}) {
  const position = pair.vst || pair.sheet || {};
  const date = new Date(position.closedAt || position.openedAt);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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

function performanceTableRows(source, fallbackRows = [], reference = currentReferenceLedger()) {
  const rows = performanceMonthlyRows(fallbackRows)
    .map((row) => createPnlRow(row.month, row.asset || source.asset || 'USDT', row))
    .sort((a, b) => b.month.localeCompare(a.month));

  if (rows.length) {
    return rows.map((row) => ({
      ...row,
      sourceLabel: source.key === 'sheet'
        ? (reference?.label || 'Google Sheet')
        : source.label
    }));
  }

  if (!source.month) {
    return [];
  }

  return [createPnlRow(source.month, source.asset || 'USDT', {
    total: source.total,
    realized: source.realized,
    paperPnl: source.total,
    paperRealized: source.realized,
    paperUnrealized: source.floating,
    fees: source.fees,
    funding: source.funding,
    closedTrades: source.closedTrades,
    testOrders: source.records || source.openPositions
  })].map((row) => ({
    ...row,
    sourceLabel: source.label
  }));
}

function renderPerformanceTable(rows, source) {
  elements.performanceTableTitle.textContent = `Resumen mensual - ${source.label}`;
  elements.performanceTableStatus.textContent = rows.length
    ? `${rows.length} meses - ${source.modeLabel || source.label}`
    : `Sin meses - ${source.modeLabel || source.label}`;
  elements.pnlTable.innerHTML = rows.length
    ? rows.map((row) => renderPnlRow(row, source)).join('')
    : '<tr><td colspan="8">Sin datos para esta fuente.</td></tr>';
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

function renderPnlRow(row, source = null) {
  const asset = row.asset || source?.asset || 'USDT';
  const total = Number(row.total || row.paperPnl || 0);
  const realized = Number(row.realized || row.paperRealized || 0);
  const floating = Number(row.paperUnrealized || row.floating || 0);
  const operationCount = Number(row.testOrders || row.records || (Number(row.openPaperTrades || 0) + Number(row.closedTrades || 0)) || 0);
  return `
    <tr>
      <td>
        <strong>${escapeHtml(formatMonth(row.month))}</strong>
        <span>${escapeHtml(row.sourceLabel || asset)}</span>
      </td>
      <td class="${amountClass(total)}">${escapeHtml(formatMoney(total, asset))}</td>
      <td class="${amountClass(realized)}">${escapeHtml(formatMoney(realized, asset))}</td>
      <td class="${amountClass(floating)}">${escapeHtml(formatMoney(floating, asset))}</td>
      <td class="${amountClass(row.fees)}">${escapeHtml(formatMoney(row.fees, asset))}</td>
      <td class="${amountClass(row.funding)}">${escapeHtml(formatMoney(row.funding, asset))}</td>
      <td>${escapeHtml(row.closedTrades || 0)}</td>
      <td>${escapeHtml(operationCount)}</td>
    </tr>
  `;
}

function renderOpenPositions() {
  const realPositions = positionsForPnlSource('live').filter((position) => position.status === 'open');
  const demoPositions = positionsForPnlSource('vst').filter((position) => position.status === 'open');
  const showDemoColumn = appState.bingx?.mode === 'demo' || appState.bingx?.mode === 'dual' || demoPositions.length > 0;
  const total = realPositions.length + demoPositions.length;

  elements.openPositionsList.classList.toggle('position-grid-split', showDemoColumn);
  elements.openPositionsStatus.textContent = showDemoColumn
    ? `${demoPositions.length} demo / ${realPositions.length} reales`
    : `${realPositions.length} reales`;
  elements.openPositionsEmpty.classList.toggle('hidden', showDemoColumn || total > 0);
  elements.openPositionsEmpty.textContent = 'Sin posiciones reales abiertas en USDT.';
  elements.openPositionsList.innerHTML = showDemoColumn
    ? [
      renderPositionColumn({
        key: 'demo',
        title: 'Demo VST',
        subtitle: `${demoPositions.length} abiertas`,
        positions: demoPositions
      }),
      renderPositionColumn({
        key: 'live',
        title: 'Live real',
        subtitle: `${realPositions.length} abiertas`,
        positions: realPositions
      })
    ].join('')
    : realPositions.map(renderOpenPositionCard).join('');
}

function renderPositionColumn({ key, title, subtitle, positions }) {
  const content = positions.length
    ? positions.map(renderOpenPositionCard).join('')
    : '<div class="empty-state compact">Sin posiciones abiertas.</div>';

  return `
    <section class="position-column source-${escapeAttribute(key)}">
      <div class="position-column-header">
        <div>
          <span class="source-badge ${escapeAttribute(key)}">${escapeHtml(title)}</span>
          <strong>${escapeHtml(subtitle)}</strong>
        </div>
      </div>
      <div class="position-column-list">${content}</div>
    </section>
  `;
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
  const stopProtected = hasPositionStopLoss(position);
  const takeProfitProtected = hasPositionTakeProfit(position);
  const entryLabel = position.source === 'demo' || position.source === 'live'
    ? 'Entrada media'
    : 'Entrada';
  const quantityText = quantity > 0
    ? `Cantidad ${formatQuantity(quantity)} ${baseAsset}`
    : null;
  return `
    <article class="position-card ${sideClass} source-${escapeAttribute(position.source || 'paper')}">
      <div class="position-card-top">
        <div>
          <span class="source-badge ${escapeAttribute(position.source || 'paper')}">${escapeHtml(sourceLabel)}</span>
          <span class="side ${sideClass}">${escapeHtml(position.direction || '-')}</span>
          <strong>${escapeHtml(position.symbol || '-')}</strong>
        </div>
        <span class="${amountClass(pnl)}${liveClass}">${escapeHtml(formatPositionMoney(pnl, position))}</span>
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
        ${quantityText ? `<span>${escapeHtml(quantityText)}</span>` : ''}
        <span>${escapeHtml(formatLeverage(position.leverage))}</span>
        <span>Margen ${escapeHtml(formatPositionMoney(position.notional, position))}</span>
        <span>Exposicion ${escapeHtml(formatPositionMoney(position.exposure || position.notional, position))}</span>
        <span>${escapeHtml(stopSummary)}</span>
        <span class="${escapeAttribute(stopProtected ? 'positive' : 'negative')}">${escapeHtml(stopProtected ? 'SL confirmado' : 'SL pendiente')}</span>
        <span class="${escapeAttribute(takeProfitProtected ? 'positive' : 'warn')}">${escapeHtml(takeProfitProtected ? 'TP confirmado' : 'TP pendiente')}</span>
        <span>${escapeHtml(formatDuration(position.openedAt, position.closedAt))}</span>
      </div>
    </article>
  `;
}

function hasPositionStopLoss(position = {}) {
  return Number(position.stopLoss || 0) > 0
    || (Array.isArray(position.protectiveOrders) && position.protectiveOrders.some((order) => {
      const type = String(order.type || '').toUpperCase();
      return type.includes('STOP') && !type.includes('TAKE_PROFIT') && Number(order.stopPrice || 0) > 0;
    }));
}

function hasPositionTakeProfit(position = {}) {
  return Number(position.takeProfit || 0) > 0
    || (Array.isArray(position.protectiveOrders) && position.protectiveOrders.some((order) => (
      String(order.type || '').toUpperCase().includes('TAKE_PROFIT') && Number(order.stopPrice || 0) > 0
    )));
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

function positionAsset(position) {
  if (position?.source === 'demo') {
    return 'VST';
  }
  return 'USDT';
}

function formatPositionMoney(value, position) {
  return formatMoney(value, positionAsset(position));
}

function openTradingPositions() {
  return positionsForPnlSource(selectedPnlSource().key).filter((position) => position.status === 'open');
}

function exchangePositionMode() {
  return appState.bingx?.mode === 'demo' || appState.bingx?.mode === 'live' || appState.bingx?.mode === 'dual';
}

function positionsForPnlSource(key, reference = currentReferenceLedger()) {
  if (key === 'sheet') {
    return reference?.positions || [];
  }

  if (key === 'vst') {
    const liveCurrent = (appState.bingx?.mode === 'demo' || appState.bingx?.mode === 'dual')
      ? (appState.exchangePositions || []).filter((position) => position.source === 'demo')
      : [];
    return positionsAfterSourceReset(uniquePositionsById(
      liveCurrent,
      appState.pnlSources?.positions?.vst || [],
      closedExchangePositionsForSource('demo')
    ), key);
  }

  if (key === 'live') {
    const liveCurrent = (appState.bingx?.mode === 'live' || appState.bingx?.mode === 'dual')
      ? (appState.exchangePositions || []).filter((position) => position.source === 'live')
      : [];
    return positionsAfterSourceReset(uniquePositionsById(
      liveCurrent,
      appState.pnlSources?.positions?.live || [],
      closedExchangePositionsForSource('live')
    ), key);
  }

  return exchangePositionMode() ? openExchangePositions() : openPaperPositions();
}

function positionsAfterSourceReset(positions = [], key = '') {
  const resetValue = key === 'vst'
    ? appState.bingx?.vstPnlResetAt
    : key === 'live'
      ? appState.bingx?.livePnlResetAt
      : null;
  const resetAt = Date.parse(resetValue || 0);
  if (!Number.isFinite(resetAt) || resetAt <= 0) {
    return positions;
  }

  return positions.filter((position) => {
    if (position.status === 'open') {
      return true;
    }
    const time = Date.parse(position.closedAt || position.openedAt || 0);
    return !Number.isFinite(time) || time >= resetAt;
  });
}

function uniquePositionsById(...collections) {
  const byId = new Map();
  for (const collection of collections) {
    for (const position of collection || []) {
      const key = exchangePositionKey(position);
      if (!key || byId.has(key)) {
        continue;
      }
      byId.set(key, position);
    }
  }
  return [...byId.values()];
}

function closedExchangePositionsForSource(source) {
  return (appState.trades || [])
    .filter((event) => String(event.status || '').startsWith('exchange_') && String(event.status || '').endsWith('_closed') && event.exchangePosition)
    .map((event) => ({
      ...event.exchangePosition,
      source: event.exchangePosition.source || source,
      status: 'closed',
      closedAt: event.exchangePosition.closedAt || event.at,
      paperPnl: Number(event.exchangePosition.paperPnl ?? event.exchangePosition.realizedPnl ?? 0),
      realizedPnl: Number(event.exchangePosition.realizedPnl || event.exchangePosition.paperPnl || 0),
      closeReason: event.exchangePosition.closeReason || event.reason || 'exchange_position_closed'
    }))
    .filter((position) => position.source === source);
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
    .sort((a, b) => Date.parse(curvePositionTime(a) || 0) - Date.parse(curvePositionTime(b) || 0));
  let equity = 0;
  return ordered.map((position) => {
    const pnl = Number(position.paperPnl || 0);
    equity = roundPnl(equity + pnl);
    return {
      id: position.id,
      at: curvePositionTime(position),
      symbol: position.symbol,
      status: position.status,
      pnl,
      equity
    };
  });
}

function curvePositionTime(position) {
  if (position.status === 'open') {
    return position.liveTickAt || position.updatedAt || new Date().toISOString();
  }
  return position.closedAt || position.openedAt;
}

function ensureSimulationDefault() {
  if (appState.simTouched || elements.pnlSimNotional.value) {
    return;
  }
  if (!simulationBaseSourcePositions().positions.length && appState.pnlLoading) {
    return;
  }
  const notional = averagePositionNotional() || monthlyOrderNotional(appState.bingx || {}, 'USDT') || 30;
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
  const groups = groupedSignalEvents()
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.live)
    }))
    .filter((group) => group.rows.length);
  if (groups.length) {
    elements.tradeHistoryStatus.textContent = `${groups.length} posts`;
    elements.tradeHistoryEmpty.classList.add('hidden');
    elements.tradeHistoryList.innerHTML = groups.slice(0, 8).map(renderSignalGroup).join('');
    return;
  }

  const items = tradeHistoryItems();
  elements.tradeHistoryStatus.textContent = `${items.length} eventos`;
  elements.tradeHistoryEmpty.classList.toggle('hidden', items.length > 0);
  elements.tradeHistoryList.innerHTML = items.map(renderTradeHistoryItem).join('');
}

function renderRealAuditTable() {
  if (!elements.realAuditTable) {
    return;
  }
  const events = (appState.trades || [])
    .filter((event) => eventAccountKey(event) === 'live' || event.exchangePosition?.source === 'live')
    .slice(0, 20);
  elements.realAuditTable.innerHTML = events.length
    ? events.map(renderRealAuditRow).join('')
    : '<tr><td colspan="9">Sin eventos reales auditables todavia.</td></tr>';
}

function renderMyLedger() {
  if (!elements.myLedgerBody) {
    return;
  }

  const allRows = myLedgerRows();
  const rows = sortMyLedgerRows(filterMyLedgerRows(allRows, appState.ledgerFilter));
  const openCount = allRows.filter((row) => row.rawStatus === 'open').length;
  const reviewCount = allRows.filter((row) => row.statusClass === 'negative' || row.statusClass === 'warn').length;
  elements.myLedgerStatus.textContent = allRows.length
    ? `${rows.length}/${allRows.length} filas - ${openCount} abiertas${reviewCount ? ` - ${reviewCount} revisar` : ''}`
    : '0 filas';
  elements.myLedgerEmpty.classList.toggle('hidden', rows.length > 0);
  elements.myLedgerBody.innerHTML = rows.length
    ? rows.slice(0, 120).map(renderMyLedgerRow).join('')
    : '';
  renderMyLedgerTabs(allRows);
  renderMyLedgerSummary(allRows);
  renderMyLedgerSortControl();
}

function myLedgerRows() {
  const reference = currentReferenceLedger();
  const positionRows = [
    ...positionsForPnlSource('live', reference).map((position) => positionToMyLedgerRow({ ...position, source: 'live' })),
    ...positionsForPnlSource('vst', reference).map((position) => positionToMyLedgerRow({ ...position, source: 'demo' }))
  ];
  const eventRows = (appState.trades || [])
    .filter(myLedgerEventShouldShow)
    .filter((event) => !myLedgerEventRepresentedByPosition(event, positionRows))
    .map(eventToMyLedgerRow)
    .filter(Boolean);

  return uniqueLedgerRows([...positionRows, ...eventRows])
    .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
}

function filterMyLedgerRows(rows, filter) {
  const key = filter || 'all';
  if (key === 'ops') {
    return rows.filter((row) => row.kind === 'position');
  }
  if (key === 'open') {
    return rows.filter((row) => row.rawStatus === 'open');
  }
  if (key === 'closed') {
    return rows.filter((row) => row.rawStatus === 'closed' || row.action === 'Cierre');
  }
  if (key === 'review') {
    return rows.filter((row) => row.statusClass === 'negative' || row.statusClass === 'warn');
  }
  if (key === 'vst') {
    return rows.filter((row) => row.sourceKey === 'demo');
  }
  if (key === 'live') {
    return rows.filter((row) => row.sourceKey === 'live');
  }
  return rows;
}

function sortMyLedgerRows(rows = []) {
  const direction = appState.ledgerResultSort;
  if (direction !== 'asc' && direction !== 'desc') {
    return rows;
  }

  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const pnlDiff = ledgerSortNumber(a.pnl) - ledgerSortNumber(b.pnl);
    if (pnlDiff !== 0) {
      return pnlDiff * multiplier;
    }
    const roiDiff = ledgerSortNumber(a.roi) - ledgerSortNumber(b.roi);
    if (roiDiff !== 0) {
      return roiDiff * multiplier;
    }
    return Date.parse(b.at || 0) - Date.parse(a.at || 0);
  });
}

function ledgerSortNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY;
}

function renderMyLedgerSortControl() {
  if (!elements.myLedgerResultSort) {
    return;
  }
  const direction = appState.ledgerResultSort;
  const active = direction === 'asc' || direction === 'desc';
  elements.myLedgerResultSort.classList.toggle('active', active);
  elements.myLedgerResultSort.setAttribute('aria-pressed', active ? 'true' : 'false');
  elements.myLedgerResultSort.title = direction === 'asc'
    ? 'Ordenado de menor a mayor'
    : direction === 'desc'
      ? 'Ordenado de mayor a menor'
      : 'Ordenar por PnL y ROI';
  if (elements.myLedgerResultSortState) {
    elements.myLedgerResultSortState.textContent = direction === 'asc' ? 'ASC' : direction === 'desc' ? 'DESC' : '-';
  }
}

function renderMyLedgerTabs(rows = []) {
  if (!elements.myLedgerTabs) {
    return;
  }

  const counts = {
    ops: filterMyLedgerRows(rows, 'ops').length,
    all: rows.length,
    open: filterMyLedgerRows(rows, 'open').length,
    closed: filterMyLedgerRows(rows, 'closed').length,
    review: filterMyLedgerRows(rows, 'review').length,
    vst: filterMyLedgerRows(rows, 'vst').length,
    live: filterMyLedgerRows(rows, 'live').length
  };
  elements.myLedgerTabs.querySelectorAll('[data-ledger-filter]').forEach((button) => {
    const key = button.dataset.ledgerFilter || 'all';
    button.classList.toggle('active', key === appState.ledgerFilter);
    button.dataset.count = String(counts[key] || 0);
  });
}

function renderMyLedgerSummary(rows = []) {
  if (!elements.myLedgerSummary) {
    return;
  }

  const month = currentMonthKey();
  const monthRows = rows.filter((row) => monthKeyFromValue(row.at) === month);
  const closed = monthRows.filter((row) => row.rawStatus === 'closed' || row.action === 'Cierre');
  const pnlRows = closed.filter((row) => Number.isFinite(Number(row.pnl)) && Number(row.pnl) !== 0);
  const netByAsset = ledgerTotalsByAsset(pnlRows, 'pnl');
  const open = monthRows.filter((row) => row.rawStatus === 'open');
  const review = monthRows.filter((row) => row.statusClass === 'negative' || row.statusClass === 'warn');
  const best = pnlRows.reduce((winner, row) => Number(row.pnl || 0) > Number(winner?.pnl ?? Number.NEGATIVE_INFINITY) ? row : winner, null);
  const winners = pnlRows.filter((row) => Number(row.pnl) > 0).length;
  const winRate = pnlRows.length ? (winners / pnlRows.length) * 100 : null;

  elements.myLedgerSummary.innerHTML = [
    {
      label: 'Resultado mes',
      value: formatLedgerAssetTotals(netByAsset),
      className: amountClass(ledgerDominantTotal(netByAsset)),
      detail: `${pnlRows.length} cierres con PnL`
    },
    {
      label: 'Win rate',
      value: formatPercent(winRate),
      className: winRate == null ? '' : amountClass(winRate - 50),
      detail: pnlRows.length ? `${winners}/${pnlRows.length} ganadoras` : 'Sin cierres'
    },
    {
      label: 'Abiertas',
      value: String(open.length),
      className: open.length ? 'warn' : 'positive',
      detail: open.map((row) => row.symbol.replace('-USDT', '')).slice(0, 4).join(' / ') || 'Sin exposicion'
    },
    {
      label: 'Mejor operacion',
      value: best ? formatMoney(best.pnl, best.asset) : '-',
      className: best ? amountClass(best.pnl) : '',
      detail: best ? `${best.symbol.replace('-USDT', '')} ${formatOptionalPercent(best.roi)}` : 'Sin dato'
    },
    {
      label: 'A revisar',
      value: String(review.length),
      className: review.length ? 'negative' : 'positive',
      detail: review.length ? 'Bloqueos / avisos' : 'Todo limpio'
    }
  ].map(renderLedgerSummaryCard).join('');
}

function renderLedgerSummaryCard(card) {
  return `
    <div class="ledger-summary-card">
      <span>${escapeHtml(card.label)}</span>
      <strong class="${escapeAttribute(card.className || '')}">${escapeHtml(card.value)}</strong>
      <small>${escapeHtml(card.detail || '')}</small>
    </div>
  `;
}

function ledgerTotalsByAsset(rows = [], field = 'pnl') {
  return rows.reduce((totals, row) => {
    const asset = row.asset || 'USDT';
    totals[asset] = roundPnl(Number(totals[asset] || 0) + Number(row[field] || 0));
    return totals;
  }, {});
}

function formatLedgerAssetTotals(totals = {}) {
  const entries = Object.entries(totals).filter(([, value]) => Number(value) !== 0);
  if (!entries.length) {
    return '0,00';
  }
  return entries
    .map(([asset, value]) => formatMoney(value, asset))
    .join(' / ');
}

function ledgerDominantTotal(totals = {}) {
  return Object.values(totals)
    .map(Number)
    .sort((a, b) => Math.abs(b) - Math.abs(a))[0] || 0;
}

function positionToMyLedgerRow(position = {}) {
  const account = position.source === 'demo' ? 'demo' : 'live';
  const asset = ledgerAsset(account);
  const status = String(position.status || 'open').toLowerCase();
  const pnl = ledgerPositionPnl(position);
  const notional = ledgerNumber(position.notional ?? position.margin ?? position.sizing?.notional);
  return {
    id: `position:${exchangePositionKey(position) || position.id || position.openedAt || position.symbol}`,
    kind: 'position',
    at: position.closedAt || position.openedAt || position.updatedAt || position.liveTickAt,
    openedAt: position.openedAt,
    sourceKey: account,
    sourceLabel: ledgerSourceLabel(account),
    action: status === 'closed' ? 'Cierre' : 'Posicion',
    symbol: normalizeTradeSymbol(position.symbol || ''),
    direction: position.direction || '',
    status: status === 'closed' ? closeReasonLabel(position.closeReason) : 'Abierta',
    rawStatus: status,
    statusClass: status === 'closed' ? amountClass(pnl) : 'neutral',
    entryPrice: position.entryPrice,
    exitPrice: status === 'closed' ? (position.closePrice || position.currentPrice) : position.currentPrice,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    notional,
    pnl,
    roi: ledgerRoi(pnl, notional),
    asset,
    postUrl: position.postUrl || '',
    detail: position.closeReason ? closeReasonLabel(position.closeReason) : ''
  };
}

function eventToMyLedgerRow(event = {}) {
  const account = eventAccountKey(event);
  if (account !== 'demo' && account !== 'live') {
    return null;
  }

  const signal = event.signal || {};
  const position = event.exchangePosition || event.paperPosition || event.closedPaperPositions?.[0] || {};
  const status = String(event.status || '');
  const pnl = ledgerEventPnl(event);
  const notional = ledgerNumber(event.sizing?.notional ?? position.notional);
  return {
    id: `event:${event.at || ''}:${account}:${status}:${signal.symbol || position.symbol || signal.action || ''}`,
    kind: 'event',
    at: event.at,
    openedAt: event.at,
    sourceKey: account,
    sourceLabel: ledgerSourceLabel(account),
    action: ledgerActionFromEvent(status, signal),
    symbol: normalizeTradeSymbol(signal.symbol || position.symbol || (signal.action === 'CLOSE_ALL' ? 'TODO' : '')),
    direction: signal.direction || position.direction || signal.action || '',
    status: tradeStatusLabel(status),
    rawStatus: status,
    statusClass: ledgerStatusClass(status, pnl),
    entryPrice: signal.entry?.price ?? position.entryPrice,
    exitPrice: signal.closePrice ?? position.closePrice ?? position.currentPrice,
    stopLoss: signal.stopLoss ?? position.stopLoss,
    takeProfit: signal.takeProfit ?? event.takeProfit ?? position.takeProfit,
    notional,
    pnl,
    roi: ledgerRoi(pnl, notional),
    asset: ledgerAsset(account),
    postUrl: event.postUrl || '',
    detail: event.reason ? reasonLabel(event.reason) : eventAmountText(event, account)
  };
}

function myLedgerEventShouldShow(event = {}) {
  const account = eventAccountKey(event);
  if (account !== 'demo' && account !== 'live') {
    return false;
  }

  const status = String(event.status || '').toLowerCase();
  if (status.startsWith('exchange_') && status.endsWith('_closed')) {
    return false;
  }

  return status === 'blocked'
    || status === 'error'
    || status.includes('blocked')
    || status.includes('guarded')
    || status.endsWith('_no_position')
    || status.endsWith('_order_sent')
    || status.includes('_close_')
    || status.includes('_tp_')
    || status.includes('_sl_');
}

function myLedgerEventRepresentedByPosition(event = {}, positionRows = []) {
  const status = String(event.status || '').toLowerCase();
  if (!status.endsWith('_order_sent')) {
    return false;
  }

  const account = eventAccountKey(event);
  const symbol = normalizeTradeSymbol(event.signal?.symbol || event.exchangePosition?.symbol || '');
  const eventAt = Date.parse(event.at || 0);
  return positionRows.some((row) => {
    const rowAt = Date.parse(row.openedAt || row.at || 0);
    return row.sourceKey === account
      && row.symbol === symbol
      && Number.isFinite(eventAt)
      && Number.isFinite(rowAt)
      && Math.abs(rowAt - eventAt) < 12 * unitMs.hour;
  });
}

function renderMyLedgerRow(row) {
  const postLink = row.postUrl
    ? `<a class="ledger-post-link" href="${escapeAttribute(row.postUrl)}" target="_blank" rel="noreferrer">Post</a>`
    : '-';
  const statusText = [row.action, row.status].filter(Boolean).join(' - ');
  return `
    <tr>
      <td data-label="Fecha">
        <strong>${escapeHtml(formatDateTime(row.at))}</strong>
        <span>${escapeHtml(row.detail || '')}</span>
      </td>
      <td data-label="Cuenta"><span class="source-badge ${escapeAttribute(row.sourceKey)}">${escapeHtml(row.sourceLabel)}</span></td>
      <td data-label="Activo">
        <strong>${escapeHtml(row.symbol || '-')}</strong>
        <span>${escapeHtml(row.direction || '-')}</span>
      </td>
      <td data-label="Estado"><span class="ledger-status ${escapeAttribute(row.statusClass || 'neutral')}">${escapeHtml(statusText || '-')}</span></td>
      <td data-label="Entrada / Actual">
        <strong>${escapeHtml(formatPrice(row.entryPrice))}</strong>
        <span>${escapeHtml(formatPrice(row.exitPrice))}</span>
      </td>
      <td data-label="SL / TP">
        <strong>${escapeHtml(formatPrice(row.stopLoss))}</strong>
        <span>${escapeHtml(formatPrice(row.takeProfit))}</span>
      </td>
      <td data-label="Margen">${escapeHtml(formatOptionalLedgerMoney(row.notional, row.asset))}</td>
      <td data-label="PnL / ROI" class="${amountClass(row.pnl)}">
        <strong>${escapeHtml(formatOptionalLedgerMoney(row.pnl, row.asset))}</strong>
        <span>${escapeHtml(formatOptionalPercent(row.roi))}</span>
      </td>
      <td data-label="Fuente">${postLink}</td>
    </tr>
  `;
}

function renderExternalSheetEmbed() {
  if (!elements.externalSheetFrame || !elements.externalSheetLink) {
    return;
  }

  const source = externalSheetSource();
  elements.externalSheetStatus.textContent = source.label;
  elements.externalSheetLink.classList.toggle('hidden', !source.href);
  if (source.href) {
    elements.externalSheetLink.href = source.href;
  }

  if (!source.embedUrl) {
    elements.externalSheetFrame.removeAttribute('src');
    elements.externalSheetFrame.classList.add('hidden');
    elements.externalSheetEmpty?.classList.remove('hidden');
    return;
  }

  if (elements.externalSheetFrame.getAttribute('src') !== source.embedUrl) {
    elements.externalSheetFrame.setAttribute('src', source.embedUrl);
  }
  elements.externalSheetFrame.classList.remove('hidden');
  elements.externalSheetEmpty?.classList.add('hidden');
}

function externalSheetSource() {
  const reference = currentReferenceLedger();
  const portfolio = appState.portfolio || appState.state?.portfolio || {};
  const href = reference?.url || portfolio.resolvedUrl || portfolio.url || '';
  const spreadsheetId = portfolio.spreadsheetId || spreadsheetIdFromUrl(href);
  if (spreadsheetId) {
    return {
      href: href || `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`,
      embedUrl: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/preview`,
      label: reference?.label ? `En vivo - ${reference.label}` : 'En vivo'
    };
  }

  return {
    href,
    embedUrl: '',
    label: href ? 'Enlace externo' : 'Sin hoja'
  };
}

function spreadsheetIdFromUrl(value) {
  const match = String(value || '').match(/\/spreadsheets\/d\/([^/?#]+)/);
  return match?.[1] || '';
}

function uniqueLedgerRows(rows = []) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = row.id || `${row.at}:${row.sourceKey}:${row.symbol}:${row.action}:${row.status}`;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function ledgerActionFromEvent(status, signal = {}) {
  const value = String(status || '').toLowerCase();
  if (value.includes('_tp_')) {
    return 'Take profit';
  }
  if (value.includes('_sl_')) {
    return 'Stop loss';
  }
  if (value.includes('_close_')) {
    return 'Cierre';
  }
  if (value.endsWith('_order_sent')) {
    return 'Apertura';
  }
  if (value === 'blocked' || value.includes('blocked')) {
    return 'Bloqueada';
  }
  return signal.action || 'Evento';
}

function ledgerStatusClass(status, pnl) {
  const value = String(status || '').toLowerCase();
  if (value === 'error' || value === 'blocked' || value.includes('blocked') || value.endsWith('_no_position')) {
    return 'negative';
  }
  if (value.includes('guarded')) {
    return 'warn';
  }
  if (Number.isFinite(Number(pnl)) && Number(pnl) !== 0) {
    return amountClass(pnl);
  }
  return 'neutral';
}

function ledgerEventPnl(event = {}) {
  const positions = [
    event.exchangePosition,
    event.paperPosition,
    ...(event.closedPaperPositions || [])
  ].filter(Boolean);
  return roundPnl(positions.reduce((sum, position) => sum + ledgerPositionPnl(position), 0));
}

function ledgerPositionPnl(position = {}) {
  const status = String(position.status || '').toLowerCase();
  const value = status === 'open'
    ? position.unrealizedPnl ?? position.paperPnl ?? position.realizedPnl
    : position.realizedPnl ?? position.paperPnl ?? position.unrealizedPnl;
  return roundPnl(Number(value || 0));
}

function ledgerRoi(pnl, notional) {
  const value = Number(pnl);
  const base = Number(notional);
  if (!Number.isFinite(value) || !Number.isFinite(base) || base <= 0) {
    return null;
  }
  return (value / base) * 100;
}

function ledgerSourceLabel(account) {
  return account === 'demo' ? 'Demo VST' : 'Real';
}

function ledgerAsset(account) {
  return account === 'demo' ? 'VST' : 'USDT';
}

function ledgerNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatOptionalLedgerMoney(value, asset) {
  const number = Number(value);
  return Number.isFinite(number) ? formatMoney(number, asset) : '-';
}

function renderRealLifecycle() {
  if (!elements.realLifecycleStatus || !elements.realLifecycleList) {
    return;
  }

  const groups = groupedSignalEvents()
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.live)
    }))
    .filter((group) => group.rows.length)
    .slice(0, 6);

  elements.realLifecycleStatus.textContent = groups.length
    ? `${groups.length} senales recientes`
    : '0 senales';
  elements.realLifecycleList.innerHTML = groups.length
    ? groups.map(renderRealLifecycleGroup).join('')
    : '<div class="empty-state compact">Sin senales reales auditables todavia.</div>';
}

function renderStrategyStudy() {
  if (!elements.strategyStudyStatus || !elements.strategyStudyGrid || !elements.strategyStudyInsights) {
    return;
  }

  const study = appState.strategyStudy;
  if (!study) {
    elements.strategyStudyStatus.textContent = 'Cargando';
    elements.strategyStudyGrid.innerHTML = '<div class="empty-state compact">Cargando estudio...</div>';
    elements.strategyStudyInsights.innerHTML = '';
    return;
  }

  if (study.error) {
    elements.strategyStudyStatus.textContent = 'No disponible';
    elements.strategyStudyGrid.innerHTML = `<div class="empty-state compact">${escapeHtml(study.error)}</div>`;
    elements.strategyStudyInsights.innerHTML = '';
    return;
  }

  const perf = study.performance || {};
  const sample = study.sample || {};
  const signal = study.signalStats || {};
  const quality = study.dataQuality || {};
  elements.strategyStudyStatus.textContent = study.generatedAt
    ? `Actualizado ${formatShortDateTime(study.generatedAt)}`
    : 'Informe cargado';
  elements.strategyStudyGrid.innerHTML = [
    ['Cierres reales', String(perf.closedTrades || 0), perf.closedTrades >= 100 ? 'positive' : 'warn'],
    ['Win rate', formatPercent(perf.winRate), amountClass(Number(perf.winRate || 0) - 50)],
    ['Profit factor', formatRatio(perf.profitFactor), Number(perf.profitFactor || 0) >= 1 ? 'positive' : 'negative'],
    ['Neto cerrado', formatMoney(perf.netPnl || 0, 'USDT'), amountClass(perf.netPnl || 0)],
    ['Senales parseadas', String(sample.parsedSignals || signal.total || 0), ''],
    ['Gestion vs aperturas', `${signal.managementCount || 0}/${signal.openCount || 0}`, signal.managementCount ? 'positive' : 'warn'],
    ['Fuente historico', quality.orderHistoryAvailable ? 'BingX ok' : 'fallback local', quality.orderHistoryAvailable ? 'positive' : 'warn'],
    ['Comisiones', formatMoney(perf.commission || 0, 'USDT'), amountClass(perf.commission || 0)]
  ].map(renderOpsMetric).join('');

  const outcomes = topObjectEntries(perf.outcomes, 4)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || '-';
  const symbols = topObjectEntries(signal.symbols, 4)
    .map(([key, value]) => `${key.replace('-USDT', '')}: ${value}`)
    .join(' | ') || '-';
  const management = topObjectEntries(study.playbook?.managementActions, 4)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || '-';

  elements.strategyStudyInsights.innerHTML = `
    <div>
      <strong>Estado estadistico</strong>
      <span>${escapeHtml(study.statisticalStatus || 'Sin conclusion todavia.')}</span>
    </div>
    <div>
      <strong>Resultados</strong>
      <span>${escapeHtml(outcomes)}</span>
    </div>
    <div>
      <strong>Simbolos mas usados</strong>
      <span>${escapeHtml(symbols)}</span>
    </div>
    <div>
      <strong>Gestion detectada</strong>
      <span>${escapeHtml(management)}</span>
    </div>
  `;
}

function renderRealLifecycleGroup(group) {
  const totals = signalGroupTotals(group);
  const postLink = group.postUrl
    ? `<a href="${escapeAttribute(group.postUrl)}" target="_blank" rel="noreferrer">Post</a>`
    : '';
  return `
    <article class="real-lifecycle-card">
      <div class="real-lifecycle-header">
        <div>
          <strong>${escapeHtml(signalGroupTitle(group))}</strong>
          <span>${escapeHtml(formatDateTime(group.at))}</span>
        </div>
        <div class="signal-group-status">
          <span class="${escapeAttribute(totals.liveClass)}">Real ${escapeHtml(totals.live)}</span>
          ${postLink}
        </div>
      </div>
      <div class="real-lifecycle-rows">
        ${group.rows.map(renderRealLifecycleRow).join('')}
      </div>
    </article>
  `;
}

function renderRealLifecycleRow(row) {
  const event = row.live || {};
  const status = String(event.status || '');
  const steps = orderLifecycleText(event).split(' > ').filter(Boolean);
  const failed = eventTone(event) === 'negative' || status === 'blocked' || status === 'error';
  return `
    <div class="real-lifecycle-row">
      <div class="real-lifecycle-symbol">
        <strong>${escapeHtml(row.symbol || event.signal?.symbol || '-')}</strong>
        <span>${escapeHtml(row.direction || event.signal?.direction || event.signal?.action || '-')}</span>
      </div>
      <div class="real-lifecycle-steps">
        ${steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const cls = failed && isLast ? 'failed' : 'done';
          return `<span class="${escapeAttribute(cls)}">${escapeHtml(step)}</span>`;
        }).join('')}
      </div>
      <div class="real-lifecycle-result ${escapeAttribute(eventTone(event))}">
        <strong>${escapeHtml(tradeStatusLabel(event.status))}</strong>
        <span>${escapeHtml(event.reason ? reasonLabel(event.reason) : eventAmountText(event, 'live') || '-')}</span>
      </div>
    </div>
  `;
}

function renderRealAuditRow(event) {
  const signalText = event.signal?.rawText || [event.signal?.symbol, event.signal?.direction || event.signal?.action].filter(Boolean).join(' ');
  const orderText = auditOrderText(event);
  const responseText = auditResponseText(event);
  const pnl = Number(event.exchangePosition?.paperPnl ?? event.exchangePosition?.unrealizedPnl ?? event.closedPaperPositions?.[0]?.paperPnl ?? 0);
  const feeFunding = auditFeeFundingText(event);
  return `
    <tr>
      <td>${escapeHtml(formatDateTime(event.at))}</td>
      <td><span>${escapeHtml(truncateText(signalText || '-', 90))}</span></td>
      <td>${escapeHtml(tradeStatusLabel(event.status))}</td>
      <td>${escapeHtml(orderText)}</td>
      <td>${escapeHtml(responseText)}</td>
      <td>${escapeHtml(auditSnapshotText(event))}</td>
      <td class="${amountClass(pnl)}">${escapeHtml(formatMoney(pnl, 'USDT'))}</td>
      <td>${escapeHtml(feeFunding)}</td>
      <td>${escapeHtml(reasonLabel(event.reason || event.status || '-'))}</td>
    </tr>
  `;
}

function auditOrderText(event = {}) {
  const order = event.order || event.exchangeClose?.orders?.[0]?.order || event.exchangeCancel?.canceled?.[0]?.order;
  const id = order?.clientOrderId || order?.orderId || order?.orderID || event.response?.data?.order?.orderId || '';
  const type = order?.type || event.status || '';
  return [type, id].filter(Boolean).join(' - ') || '-';
}

function auditResponseText(event = {}) {
  const data = event.response?.data || event.exchangeClose?.orders?.[0]?.response?.data || event.exchangeCancel?.canceled?.[0]?.response?.data;
  const id = data?.order?.orderId || data?.orderId || data?.orderID || data?.positionId || '';
  return id ? `ok - ${id}` : (event.response ? 'ok' : '-');
}

function auditSnapshotText(event = {}) {
  const snapshot = event.auditSnapshot || {};
  const safety = snapshot.exchangeSafety || {};
  const real = safety.real || {};
  const health = snapshot.health || {};
  const pieces = [
    safety.level ? `sync ${safety.level}` : '',
    safety.ageSeconds === null || safety.ageSeconds === undefined ? '' : `${safety.ageSeconds}s`,
    health.level ? `YT ${health.level}` : '',
    `SL ${real.protectedStopLoss || 0}/${real.openPositions || 0}`,
    real.balance?.equity == null ? '' : `eq ${formatMoney(real.balance.equity, real.balance.asset || 'USDT')}`
  ].filter(Boolean);
  return pieces.join(' - ') || '-';
}

function auditFeeFundingText(event = {}) {
  if (event.costGuard?.enabled) {
    return costGuardText(event.costGuard);
  }
  const raw = event.exchangePosition?.raw || {};
  const realized = raw.realisedProfit || raw.realizedProfit;
  return realized ? `realizado ${realized}` : '-';
}

function truncateText(value, maxLength = 120) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function groupedSignalEvents() {
  const groups = new Map();
  for (const event of appState.trades || []) {
    if (!event.signal?.symbol) {
      continue;
    }

    const key = event.postId || event.postUrl || event.signal.rawText || `${event.at}:${event.signal.symbol}`;
    const group = groups.get(key) || {
      key,
      at: event.at,
      postUrl: event.postUrl || '',
      rows: new Map(),
      events: []
    };
    group.at = newerIso(group.at, event.at);
    group.postUrl ||= event.postUrl || '';
    group.events.push(event);

    const symbol = normalizeTradeSymbol(event.signal.symbol);
    const rowKey = `${symbol}:${event.signal.direction || event.signal.action || ''}`;
    const row = group.rows.get(rowKey) || {
      symbol,
      direction: event.signal.direction || event.signal.action || '',
      demo: null,
      live: null,
      other: []
    };
    const account = eventAccountKey(event);
    if (account === 'demo') {
      row.demo = event;
    } else if (account === 'live') {
      row.live = event;
    } else {
      row.other.push(event);
    }
    group.rows.set(rowKey, row);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rows: [...group.rows.values()]
    }))
    .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
}

function renderSignalGroup(group) {
  const totals = signalGroupTotals(group);
  const postLink = group.postUrl
    ? `<a href="${escapeAttribute(group.postUrl)}" target="_blank" rel="noreferrer">Post</a>`
    : '';

  return `
    <article class="signal-group">
      <div class="signal-group-header">
        <div>
          <strong>${escapeHtml(signalGroupTitle(group))}</strong>
          <span>${escapeHtml(formatDateTime(group.at))}</span>
        </div>
        <div class="signal-group-status">
          <span class="${escapeAttribute(totals.liveClass)}">Real ${escapeHtml(totals.live)}</span>
          ${postLink}
        </div>
      </div>
      <div class="signal-grid">
        <div class="signal-grid-head">Señal</div>
        <div class="signal-grid-head">Real USDT</div>
        ${group.rows.map(renderSignalRow).join('')}
      </div>
    </article>
  `;
}

function renderSignalRow(row) {
  return `
    <div class="signal-cell signal-cell-main">
      <strong>${escapeHtml(row.symbol || '-')}</strong>
      <span>${escapeHtml(row.direction || '-')}</span>
    </div>
    ${renderSignalAccountCell(row.live, 'live')}
  `;
}

function renderSignalAccountCell(event, account) {
  if (!event) {
    return '<div class="signal-cell muted">Sin evento</div>';
  }

  const tone = eventTone(event);
  const amount = eventAmountText(event, account);
  const detail = event.reason ? reasonLabel(event.reason) : amount;
  const lifecycle = orderLifecycleText(event);
  return `
    <div class="signal-cell ${escapeAttribute(tone)}">
      <strong>${escapeHtml(tradeStatusLabel(event.status))}</strong>
      <span>${escapeHtml(detail || amount || '-')}</span>
      <small>${escapeHtml(lifecycle)}</small>
    </div>
  `;
}

function orderLifecycleText(event = {}) {
  const status = String(event.status || '');
  const steps = ['Recibida', 'Parseada'];
  if (status === 'blocked' || status === 'error' || status === 'skipped') {
    steps.push(status === 'blocked' ? 'Bloqueada' : status === 'error' ? 'Error' : 'Omitida');
    return steps.join(' > ');
  }
  steps.push('Validada');
  if (status.endsWith('_order_sent') || event.order) {
    steps.push('Orden enviada');
  }
  if (event.response) {
    steps.push('Aceptada');
  }
  if (status.endsWith('_sl_sent') || hasEventStopLoss(event)) {
    steps.push('SL confirmado');
  }
  if (status.endsWith('_tp_sent') || hasEventTakeProfit(event)) {
    steps.push('TP confirmado');
  }
  if (status.includes('close')) {
    steps.push(status.includes('stop') ? 'Cerrada por SL' : status.includes('tp') ? 'Cerrada por TP' : 'Cerrada');
  }
  return steps.join(' > ');
}

function hasEventStopLoss(event = {}) {
  return Boolean(event.signal?.stopLoss || event.order?.stopLoss || event.exchangeStopLoss?.orders?.length);
}

function hasEventTakeProfit(event = {}) {
  return Boolean(event.signal?.takeProfits?.length || event.order?.takeProfit || event.exchangeTakeProfit?.orders?.length);
}

function signalGroupTitle(group) {
  const symbols = [...new Set(group.rows.map((row) => row.symbol).filter(Boolean))];
  return symbols.length ? `Orden ${symbols.join(' / ')}` : 'Orden de YouTube';
}

function signalGroupTotals(group) {
  const total = group.rows.length || 0;
  const liveOk = group.rows.filter((row) => row.live && eventTone(row.live) !== 'negative').length;
  return {
    live: `${liveOk}/${total}`,
    liveClass: liveOk === total && total ? 'positive' : liveOk ? 'warn' : 'negative'
  };
}

function eventAccountKey(event) {
  const explicit = String(event.executionMode || '').toLowerCase();
  if (explicit === 'demo' || explicit === 'live') {
    return explicit;
  }
  const status = String(event.status || '').toLowerCase();
  if (status.startsWith('demo_')) {
    return 'demo';
  }
  if (status.startsWith('live_')) {
    return 'live';
  }
  return event.exchangePosition?.source || event.position?.source || 'other';
}

function eventTone(event) {
  const status = String(event.status || '');
  if (status === 'error' || status === 'blocked' || status.endsWith('_no_position')) {
    return 'negative';
  }
  if (status.endsWith('_order_sent') || status.endsWith('_close_sent') || status.endsWith('_tp_sent') || status.includes('_sl_be_')) {
    return 'positive';
  }
  return 'neutral';
}

function eventAmountText(event, account) {
  if (event.sizing?.notional) {
    const amount = formatMoney(event.sizing.notional, event.sizing.asset || (account === 'demo' ? 'VST' : 'USDT'));
    return event.costGuard?.warn ? `${amount} · ${costGuardText(event.costGuard)}` : amount;
  }
  if (event.closePercent) {
    return `${event.closePercent}% cierre`;
  }
  if (event.takeProfit) {
    return `TP ${formatPrice(event.takeProfit)}`;
  }
  return '';
}

function costGuardText(costGuard = {}) {
  const asset = costGuard.asset || 'USDT';
  const label = costGuard.block
    ? 'Coste bloqueo'
    : costGuard.warn ? 'Coste aviso' : 'Coste ok';
  return `${label}: ${formatMoney(costGuard.bufferedRoundTripCost || costGuard.estimatedRoundTripCost || 0, asset)} / BE ${formatPercent(costGuard.breakEvenMarginRoiPercent)}`;
}

function newerIso(a, b) {
  return Date.parse(b || 0) > Date.parse(a || 0) ? b : a;
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
        <span class="${amountClass(item.pnl)}">${escapeHtml(formatMoney(item.pnl, item.asset || 'USDT'))}</span>
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

function renderTelegramSource(telegramSource = appState.telegramSource, message = '') {
  if (!telegramSource) {
    return;
  }
  appState.telegramSource = telegramSource;
  elements.telegramSourceEnabled.checked = Boolean(telegramSource.enabled);
  elements.telegramSourceUrl.value = telegramSource.url || '';
  elements.telegramSourceMax.value = telegramSource.maxMessages || 40;
  elements.telegramSourceRefresh.value = telegramSource.refreshSeconds || 30;
  elements.telegramSourceExecute.checked = Boolean(telegramSource.executeSignals);
  elements.telegramSourceOpenSignals.checked = Boolean(telegramSource.executeOpenSignals);
  elements.telegramSourceLiveConfirm.checked = Boolean(telegramSource.liveConfirmed);
  updateTelegramSourceLiveConfirmVisibility();

  const active = telegramSource.enabled && telegramSource.url;
  const trading = telegramSource.executeSignals
    ? telegramSource.executeOpenSignals ? 'Gestion + aperturas' : 'Gestion de posiciones'
    : 'Solo lectura';
  const refreshLabel = telegramSource.refreshSeconds ? ` · recarga ${telegramSource.refreshSeconds}s` : '';
  elements.telegramSourceStatus.textContent = message || (active ? `Fuente activa · ${trading}${refreshLabel}` : 'Fuente desactivada');
  elements.telegramSourceStatus.classList.toggle('ok', Boolean(message) || Boolean(active));
  elements.telegramSourceStatus.classList.toggle('warn', Boolean(telegramSource.executeSignals && !telegramSource.liveConfirmed && usesLiveMode(appState.bingx?.mode)));
  renderHeaderContext();
}

function updateTelegramSourceLiveConfirmVisibility() {
  const needsConfirm = Boolean(elements.telegramSourceExecute.checked && usesLiveMode(elements.bingxMode.value));
  elements.telegramSourceLiveConfirmRow.classList.toggle('hidden', !needsConfirm);
}

function telegramSourcePayload() {
  return {
    enabled: elements.telegramSourceEnabled.checked,
    url: elements.telegramSourceUrl.value,
    maxMessages: Number(elements.telegramSourceMax.value),
    refreshSeconds: Number(elements.telegramSourceRefresh.value),
    executeSignals: elements.telegramSourceExecute.checked,
    executeOpenSignals: elements.telegramSourceOpenSignals.checked,
    liveConfirmed: elements.telegramSourceLiveConfirm.checked
  };
}

async function saveTelegramSourceConfig() {
  const response = await putJson('/api/telegram-source', telegramSourcePayload());
  appState.telegramSource = response.telegramSource;
  return response.telegramSource;
}

function renderBingx(bingx = appState.bingx, message = '') {
  if (!bingx) {
    return;
  }

  appState.bingx = bingx;
  const monthlyInitialCapitalUSDT = Number(bingx.monthlyInitialCapitalUSDT || 300);
  const monthlyInitialCapitalVST = Number(bingx.monthlyInitialCapitalVST || bingx.vstBaseCapital || 300);
  const monthlyOrderPercent = Number(bingx.monthlyOrderPercent || bingx.vstCapitalPercent || 10);
  const monthlyOrderUSDT = monthlyOrderNotional({
    monthlyInitialCapitalUSDT,
    monthlyOrderPercent
  }, 'USDT');
  elements.bingxEnabled.checked = Boolean(bingx.enabled);
  elements.bingxMode.value = bingx.mode || 'test';
  elements.bingxMargin.value = bingx.marginType || 'ISOLATED';
  elements.bingxVstStopWorkingType.value = bingx.vstStopWorkingType || 'CONTRACT_PRICE';
  elements.bingxLiveStopWorkingType.value = bingx.liveStopWorkingType || 'MARK_PRICE';
  elements.bingxApiKey.value = '';
  elements.bingxApiSecret.value = '';
  elements.bingxApiKey.placeholder = bingx.apiKeyConfigured ? `API key guardada ${bingx.apiKeyPreview}` : 'BingX API key';
  elements.bingxApiSecret.placeholder = bingx.apiSecretConfigured ? `Secret guardado ${bingx.apiSecretPreview}` : 'BingX API secret';
  elements.bingxMonthlyInitialUsdt.value = monthlyInitialCapitalUSDT;
  elements.bingxMonthlyOrderPercent.value = monthlyOrderPercent;
  elements.bingxNotional.value = monthlyOrderUSDT;
  elements.bingxMaxNotional.value = monthlyOrderUSDT;
  elements.bingxMaxLeverage.value = bingx.maxLeverage || 5;
  elements.bingxSymbols.value = bingx.allowedSymbols || '';
  elements.bingxRequireSl.checked = Boolean(bingx.requireStopLoss);
  elements.bingxForceMarket.checked = Boolean(bingx.forceMarketEntries);
  elements.bingxEntriesPaused.checked = Boolean(bingx.entriesPaused);
  elements.bingxManagementOnly.checked = Boolean(bingx.managementOnly);
  elements.bingxMaxOpen.value = bingx.maxOpenPositions || 5;
  elements.bingxMaxDailyOrders.value = bingx.maxDailyOrders ?? 0;
  elements.bingxMaxSignalLeverage.value = bingx.maxSignalLeverage || 125;
  elements.bingxMaxSignalAge.value = bingx.maxSignalAgeMinutes ?? 5;
  elements.bingxMaxEntryDeviation.value = bingx.maxEntryDeviationPercent ?? 0.15;
  elements.bingxMaxStopDistance.value = bingx.maxStopDistancePercent ?? 5;
  elements.bingxCostGuardEnabled.checked = bingx.costGuardEnabled !== false;
  elements.bingxCostGuardMode.value = bingx.costGuardMode || 'block';
  elements.bingxCostGuardBuffer.value = bingx.costGuardFeeBuffer ?? 2;
  elements.bingxCostGuardMaxMargin.value = bingx.costGuardMaxMarginBreakEvenPercent ?? 3;
  elements.bingxEstimatedFeeRebate.value = bingx.estimatedCommissionRebatePercent ?? 22;
  elements.bingxVstBaseCapital.value = monthlyInitialCapitalVST;
  elements.bingxVstCapitalPercent.value = monthlyOrderPercent;
  elements.bingxDailyLoss.value = bingx.maxDailyLossUSDT ?? 100;
  elements.bingxMonthlyLoss.value = bingx.maxMonthlyLossUSDT ?? 500;
  elements.bingxDryRunRequired.checked = bingx.dryRunRequired !== false;
  elements.bingxLiveConfirm.checked = Boolean(bingx.liveConfirmed);
  elements.bingxLiveConfirmRow.classList.toggle('hidden', !usesLiveMode(elements.bingxMode.value));
  updateTelegramSourceLiveConfirmVisibility();

  const ready = bingx.enabled && bingx.apiKeyConfigured && bingx.apiSecretConfigured && (!usesLiveMode(bingx.mode) || bingx.liveConfirmed);
  const modeLabel = bingxModeLabel(bingx.mode);
  const triggerLabel = `SL VST ${stopWorkingTypeLabel(bingx.vstStopWorkingType)} - SL real ${stopWorkingTypeLabel(bingx.liveStopWorkingType)}`;
  elements.bingxStatus.textContent = `${message || (ready ? `${modeLabel} activo` : `${modeLabel} desactivado`)}. ${triggerLabel}`;
  elements.bingxStatus.classList.toggle('ok', Boolean(message) || Boolean(ready && !usesLiveMode(bingx.mode)));
  elements.bingxStatus.classList.toggle('warn', usesLiveMode(bingx.mode) && (ready || bingx.enabled));
  renderHeaderContext();
}

function renderHeaderContext() {
  const telegramEnabled = Boolean(appState.telegramSource?.enabled && appState.telegramSource?.url);
  elements.headerSourceStatus.textContent = telegramEnabled ? 'YouTube + Telegram' : 'YouTube';

  const bingx = appState.bingx;
  const mode = bingx?.mode || 'test';
  elements.headerModeStatus.textContent = bingxModeLabel(mode);
  elements.headerModeChip.dataset.tone = usesLiveMode(mode)
    ? 'live'
    : mode === 'demo' ? 'demo' : 'test';
}

function initializeResponsiveControls() {
  setControlsCollapsed(window.matchMedia('(max-width: 820px)').matches);
}

function setControlsCollapsed(collapsed) {
  elements.toolPanel?.classList.toggle('mobile-collapsed', Boolean(collapsed));
  elements.toggleControls?.setAttribute('aria-expanded', String(!collapsed));
  elements.toggleControls?.classList.toggle('active', !collapsed);
}

function monthlyOrderNotional(bingx = {}, asset = 'USDT') {
  const base = asset === 'VST'
    ? Number(bingx.monthlyInitialCapitalVST || bingx.vstBaseCapital || 300)
    : Number(bingx.monthlyInitialCapitalUSDT || 300);
  const percent = Number(bingx.monthlyOrderPercent || bingx.vstCapitalPercent || 10);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(percent) || percent <= 0) {
    return 30;
  }
  return roundPnl(base * (percent / 100));
}

function stopWorkingTypeLabel(value) {
  return String(value || '').toUpperCase() === 'CONTRACT_PRICE' ? 'último precio' : 'precio de marca';
}

async function saveBingxConfig() {
  const monthlyInitialCapitalUSDT = Number(elements.bingxMonthlyInitialUsdt.value);
  const monthlyInitialCapitalVST = Number(elements.bingxVstBaseCapital.value);
  const monthlyOrderPercent = Number(elements.bingxMonthlyOrderPercent.value);
  const monthlyOrderUSDT = monthlyOrderNotional({
    monthlyInitialCapitalUSDT,
    monthlyOrderPercent
  }, 'USDT');
  const payload = {
    enabled: elements.bingxEnabled.checked,
    mode: elements.bingxMode.value,
    marginType: elements.bingxMargin.value,
    vstStopWorkingType: elements.bingxVstStopWorkingType.value,
    liveStopWorkingType: elements.bingxLiveStopWorkingType.value,
    defaultNotionalUSDT: monthlyOrderUSDT,
    maxNotionalUSDT: monthlyOrderUSDT,
    monthlyInitialCapitalUSDT,
    monthlyInitialCapitalVST,
    monthlyOrderPercent,
    maxLeverage: Number(elements.bingxMaxLeverage.value),
    allowedSymbols: elements.bingxSymbols.value,
    requireStopLoss: elements.bingxRequireSl.checked,
    forceMarketEntries: elements.bingxForceMarket.checked,
    entriesPaused: elements.bingxEntriesPaused.checked,
    managementOnly: elements.bingxManagementOnly.checked,
    maxOpenPositions: Number(elements.bingxMaxOpen.value),
    maxDailyOrders: Number(elements.bingxMaxDailyOrders.value),
    maxSignalLeverage: Number(elements.bingxMaxSignalLeverage.value),
    maxSignalAgeMinutes: Number(elements.bingxMaxSignalAge.value),
    maxEntryDeviationPercent: Number(elements.bingxMaxEntryDeviation.value),
    maxStopDistancePercent: Number(elements.bingxMaxStopDistance.value),
    costGuardEnabled: elements.bingxCostGuardEnabled.checked,
    costGuardMode: elements.bingxCostGuardMode.value,
    costGuardFeeBuffer: Number(elements.bingxCostGuardBuffer.value),
    costGuardMaxMarginBreakEvenPercent: Number(elements.bingxCostGuardMaxMargin.value),
    estimatedCommissionRebatePercent: Number(elements.bingxEstimatedFeeRebate.value),
    vstBaseCapital: monthlyInitialCapitalVST,
    vstCapitalPercent: monthlyOrderPercent,
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
    source: position.source,
    asset: positionAsset(position),
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
    source: 'paper',
    asset: 'USDT',
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
      source: eventAccountKey(event),
      asset: eventAccountKey(event) === 'demo' ? 'VST' : 'USDT',
      symbol: event.signal?.symbol || (event.signal?.action === 'CLOSE_ALL' ? 'TODO' : ''),
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

function formatShortDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date).replace('.', '');
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
    demo_close_all_sent: 'cierre total demo VST',
    demo_close_all_no_position: 'demo sin posicion',
    demo_close_no_position: 'demo sin posicion',
    demo_tp_sent: 'TP demo VST enviado',
    demo_tp_no_position: 'TP demo sin posicion',
    demo_tp_blocked: 'TP demo bloqueado',
    demo_sl_sent: 'SL demo VST enviado',
    demo_sl_no_position: 'SL demo sin posicion',
    demo_sl_blocked: 'SL demo bloqueado',
    demo_sl_be_detected: 'SL BE demo detectado',
    test_order_sent: 'test enviada',
    live_order_sent: 'live enviada',
    live_close_sent: 'cierre live enviado',
    live_close_all_sent: 'cierre total live',
    live_close_all_no_position: 'live sin posicion',
    live_close_no_position: 'live sin posicion',
    live_tp_sent: 'TP live enviado',
    live_tp_no_position: 'TP live sin posicion',
    live_tp_blocked: 'TP live bloqueado',
    live_sl_sent: 'SL live enviado',
    live_sl_no_position: 'SL live sin posicion',
    live_sl_blocked: 'SL live bloqueado',
    live_sl_be_detected: 'SL BE live detectado',
    exchange_stop_closed: 'stop BingX cerrado',
    exchange_signal_closed: 'cierre BingX ejecutado',
    exchange_position_closed: 'posicion BingX cerrada',
    paper_close_sent: 'cierre paper',
    paper_close_all_sent: 'cierre total paper',
    paper_close_all_no_position: 'paper sin posicion',
    paper_tp_sent: 'TP paper',
    paper_tp_no_position: 'TP paper sin posicion',
    paper_sl_sent: 'SL paper',
    paper_sl_no_position: 'SL paper sin posicion',
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
    live: 'Live real',
    dual: 'VST + Live real'
  }[value] || 'Test order';
}

function realTabModeLabel(value) {
  return usesLiveMode(value) ? 'Live real USDT' : bingxModeLabel(value);
}

function usesLiveMode(value) {
  return value === 'live' || value === 'dual';
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
  elements.postsTab.setAttribute('aria-selected', String(posts));
  elements.logsTab.setAttribute('aria-selected', String(logs));
  elements.pnlTab.setAttribute('aria-selected', String(pnl));
  elements.postsTab.tabIndex = posts ? 0 : -1;
  elements.logsTab.tabIndex = logs ? 0 : -1;
  elements.pnlTab.tabIndex = pnl ? 0 : -1;
  elements.postsActions?.classList.toggle('hidden', !posts);
  elements.postsView.classList.toggle('hidden', !posts);
  elements.logsView.classList.toggle('hidden', !logs);
  elements.pnlView.classList.toggle('hidden', !pnl);
  if (posts) {
    if (appState.postsDirty || !appState.posts.length) {
      loadPosts().catch((error) => showClientError(error.message));
    } else {
      renderPosts();
    }
  } else if (logs) {
    renderLogs();
  } else if (pnl) {
    renderPnl();
  }
}

function viewIsVisible(element) {
  return Boolean(element && !element.classList.contains('hidden'));
}

function applyHashNavigation() {
  const target = pnlHashTarget();
  if (!target) {
    return;
  }

  switchView('pnl');
  const finish = () => requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'start' });
  });

  if (appState.pnl) {
    finish();
    return;
  }

  loadPnl()
    .catch((error) => {
      appState.pnlError = error.message;
      renderPnl();
    })
    .finally(finish);
}

function pnlHashTarget() {
  const rawId = String(window.location.hash || '').replace(/^#/, '');
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // Conserva el ancla literal si la URL contiene una secuencia incompleta.
  }
  if (!id) {
    return null;
  }
  const target = document.getElementById(id);
  return target && elements.pnlView?.contains(target) ? target : null;
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
