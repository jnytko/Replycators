/**
 * Apptio Documentation Finder - ReplyCators Plugin
 * v1.0.0
 *
 * Full product integration of the standalone Apptio-Documentation-Finder
 * into ReplyCators as a native plugin.
 *
 * Storage namespace: rc:plugin:com.replycators.apptio-docs-finder:*
 *
 * Migrates legacy adn_* keys on first load. See adnMigrateStorage().
 *
 * Plugin ID:  com.replycators.apptio-docs-finder
 * View ID:    plugin-apptio-docs-finder
 * Category:   productivity
 */

(function () {
  'use strict';

  // ── Plugin registration ─────────────────────────────────────────────────────

  const PLUGIN_ID = 'com.replycators.apptio-docs-finder';

  const plugin = {
    id:                      PLUGIN_ID,
    init,
    render,
    onNavigate,
    _onSettingChanged,
    _doRefreshFromSettings,
    _clearAllData,
    refreshCache,
    clearCache,
  };

  function app() { return window.ReplyCatorsApp; }

  // ── Storage keys (ReplyCators namespace) ────────────────────────────────────

  const STORE = {
    SOURCES:      'rc:plugin:com.replycators.apptio-docs-finder:sources',
    QUICK_LINKS:  'rc:plugin:com.replycators.apptio-docs-finder:quick-links',
    RECENT:       'rc:plugin:com.replycators.apptio-docs-finder:recent-searches',
    OPENED:       'rc:plugin:com.replycators.apptio-docs-finder:recently-opened',
    FAVORITES:    'rc:plugin:com.replycators.apptio-docs-finder:favorites',
    SETTINGS:     'rc:plugin:com.replycators.apptio-docs-finder:settings',
    LAST_REFRESH: 'rc:plugin:com.replycators.apptio-docs-finder:last-refresh',
    DIAG:         'rc:plugin:com.replycators.apptio-docs-finder:diag',
  };

  // Legacy key names used by the standalone extension - migrated once on first load.
  const LEGACY_KEYS = {
    SOURCES:      'adn_sources',
    QUICK_LINKS:  'adn_quicklinks',
    RECENT:       'adn_recent',
    OPENED:       'adn_opened',
    FAVORITES:    'adn_favorites',
    SETTINGS:     'adn_settings',
    LAST_REFRESH: 'adn_last_refresh',
    DIAG:         'adn_diag',
  };

  const MAX_RECENT    = 20;
  const MAX_OPENED    = 30;
  const MAX_FAVORITES = 50;

  // ── IBM Documentation constants ─────────────────────────────────────────────

  const IBM_SEARCH_BASE = 'https://www.ibm.com/docs/en/search';
  const IBM_DOCS_BASE   = 'https://www.ibm.com/docs/en';

  const DOMAIN_SCOPES = {
    apptio:        'apptio-commercial',
    platform:      'apptio-platform',
    cloudability:  'cloudability-commercial',
    targetprocess: 'targetprocess',
  };

  const DEFAULT_SOURCES = [
    { id: 'apptio-all',          domain: 'apptio',        label: 'All Apptio',            scope: 'apptio-commercial',                                         hint: 'Search all Apptio documentation', url: IBM_DOCS_BASE + '/apptio-commercial' },
    { id: 'tbm-studio',          domain: 'apptio',        label: 'TBM Studio',            scope: 'apptio-commercial/tbm-studio/saas',                         hint: 'Modeling, functions, LOOKUP, allocations, DataLink', url: IBM_DOCS_BASE + '/apptio-commercial/tbm-studio' },
    { id: 'costing',             domain: 'apptio',        label: 'Costing',               scope: 'apptio-commercial/costing-standard/saas',                   hint: 'Cost allocation, drivers, showback, chargeback', url: IBM_DOCS_BASE + '/apptio-commercial/costing-standard' },
    { id: 'planning',            domain: 'apptio',        label: 'Planning',              scope: 'apptio-commercial/planning-standard/saas',                  hint: 'Labor planning, forecasting, budgeting, fiscal year', url: IBM_DOCS_BASE + '/apptio-commercial/planning-standard' },
    { id: 'billing',             domain: 'apptio',        label: 'Billing',               scope: 'apptio-commercial/billing-standard/saas',                   hint: 'Subscription management, invoicing, usage reporting', url: IBM_DOCS_BASE + '/apptio-commercial/billing-standard' },
    { id: 'benchmarking',        domain: 'apptio',        label: 'Benchmarking',          scope: 'apptio-commercial/apptio-benchmarking/saas',                hint: 'IT spend benchmarks, KPIs, peer comparison', url: IBM_DOCS_BASE + '/apptio-commercial/apptio-benchmarking' },
    { id: 'platform-all',        domain: 'platform',      label: 'All Platform',          scope: 'apptio-platform',                                           hint: 'All Apptio Platform features', url: IBM_DOCS_BASE + '/apptio-platform' },
    { id: 'platform-datalink',   domain: 'platform',      label: 'Datalink',              scope: 'apptio-platform/datalink/saas',                             hint: 'Data connectors, scheduled imports, pipelines', url: IBM_DOCS_BASE + '/apptio-platform/datalink' },
    { id: 'platform-datalink-classic', domain: 'platform', label: 'Datalink (Classic)',   scope: 'apptio-platform/datalink-classic/saas',                     hint: 'Classic Datalink connector configuration', url: IBM_DOCS_BASE + '/apptio-platform/datalink-classic' },
    { id: 'cloudability-all',    domain: 'cloudability',  label: 'All Cloudability',      scope: 'cloudability-commercial',                                   hint: 'All Cloudability features', url: IBM_DOCS_BASE + '/cloudability-commercial' },
    { id: 'cloudability-enterprise', domain: 'cloudability', label: 'Enterprise',         scope: 'cloudability-commercial/cloudability-enterprise/saas',       hint: 'Enterprise cloud cost management, rightsizing', url: IBM_DOCS_BASE + '/cloudability-commercial/cloudability-enterprise' },
    { id: 'cloudability-fp',     domain: 'cloudability',  label: 'Financial Planning',    scope: 'cloudability-commercial/financial-planning/saas',            hint: 'Cloud budget planning, forecast variance', url: IBM_DOCS_BASE + '/cloudability-commercial/financial-planning' },
    { id: 'cloudability-savings', domain: 'cloudability', label: 'Savings Automation',   scope: 'cloudability-commercial/savings-automation/saas',            hint: 'Reserved instances, savings plans automation', url: IBM_DOCS_BASE + '/cloudability-commercial/savings-automation' },
    { id: 'tp-all',              domain: 'targetprocess', label: 'All Targetprocess',     scope: 'targetprocess',                                             hint: 'All Targetprocess features', url: IBM_DOCS_BASE + '/targetprocess' },
    { id: 'tp-atp',              domain: 'targetprocess', label: 'Targetprocess (ATP)',   scope: 'targetprocess/atp/saas',                                    hint: 'Agile planning, portfolio, hierarchy, boards, metrics', url: IBM_DOCS_BASE + '/targetprocess/atp' },
  ];

  const DEFAULT_QUICK_LINKS = [
    { label: 'TBM Studio',          url: IBM_DOCS_BASE + '/apptio-commercial/tbm-studio/saas',               group: 'apptio' },
    { label: 'Costing',             url: IBM_DOCS_BASE + '/apptio-commercial/costing-standard/saas',         group: 'apptio' },
    { label: 'Planning',            url: IBM_DOCS_BASE + '/apptio-commercial/planning-standard/saas',        group: 'apptio' },
    { label: 'Billing',             url: IBM_DOCS_BASE + '/apptio-commercial/billing-standard/saas',         group: 'apptio' },
    { label: 'Benchmarking',        url: IBM_DOCS_BASE + '/apptio-commercial/apptio-benchmarking/saas',      group: 'apptio' },
    { label: 'Datalink',            url: IBM_DOCS_BASE + '/apptio-platform/datalink/saas',                   group: 'platform' },
    { label: 'Datalink Classic',    url: IBM_DOCS_BASE + '/apptio-platform/datalink-classic/saas',           group: 'platform' },
    { label: 'Administration',      url: IBM_SEARCH_BASE + '/administration?scope=apptio-platform',          group: 'platform' },
    { label: 'Reports',             url: IBM_SEARCH_BASE + '/reports?scope=apptio-platform',                 group: 'platform' },
    { label: 'User Management',     url: IBM_SEARCH_BASE + '/user+management?scope=apptio-platform',         group: 'platform' },
    { label: 'Enterprise',          url: IBM_DOCS_BASE + '/cloudability-commercial/cloudability-enterprise/saas', group: 'cloudability' },
    { label: 'Financial Planning',  url: IBM_DOCS_BASE + '/cloudability-commercial/financial-planning/saas', group: 'cloudability' },
    { label: 'Savings Automation',  url: IBM_DOCS_BASE + '/cloudability-commercial/savings-automation/saas', group: 'cloudability' },
    { label: 'Rightsizing',         url: IBM_SEARCH_BASE + '/rightsizing?scope=cloudability-commercial',     group: 'cloudability' },
    { label: 'Business Mapping',    url: IBM_SEARCH_BASE + '/business+mapping?scope=cloudability-commercial', group: 'cloudability' },
    { label: 'Targetprocess (ATP)', url: IBM_DOCS_BASE + '/targetprocess/atp/saas',                          group: 'targetprocess' },
    { label: 'Portfolio',           url: IBM_SEARCH_BASE + '/portfolio?scope=targetprocess',                  group: 'targetprocess' },
    { label: 'Hierarchy',           url: IBM_SEARCH_BASE + '/hierarchy?scope=targetprocess',                  group: 'targetprocess' },
    { label: 'Boards',              url: IBM_SEARCH_BASE + '/boards?scope=targetprocess',                     group: 'targetprocess' },
    { label: 'Metrics',             url: IBM_SEARCH_BASE + '/metrics?scope=targetprocess',                    group: 'targetprocess' },
  ];

  const DEFAULT_PLUGIN_SETTINGS = {
    openInNewTab:      true,
    saveSearchHistory: true,
    saveOpenHistory:   true,
  };

  // ── Plugin state ─────────────────────────────────────────────────────────────

  let _sources         = [];
  let _quickLinks      = [];
  let _settings        = { ...DEFAULT_PLUGIN_SETTINGS };
  let _activeDomain    = 'apptio';
  let _activeTab       = 'search';  // 'search'|'favs'|'recent'|'opened'|'status'
  let _overlay         = null;      // null | 'sources' | 'test'
  let _debugOpen       = false;
  let _pendingUrl      = '';
  let _rendered        = false;     // true after first render() call
  // F-09: guard so _migrateStorage() issues at most one storage round-trip per session.
  let _migrationDone   = false;
  // F-01: guard so the document keydown listener is registered exactly once per session.
  let _keydownBound    = false;

  // ── Storage helpers ──────────────────────────────────────────────────────────

  function _set(data) {
    return new Promise(r => chrome.storage.local.set(data, r));
  }
  function _get(keys) {
    return new Promise(r => chrome.storage.local.get(keys, r));
  }

  async function _getSources()      { const r = await _get([STORE.SOURCES]);      return r[STORE.SOURCES]      || DEFAULT_SOURCES; }
  async function _saveSources(s)    { await _set({ [STORE.SOURCES]: s, [STORE.LAST_REFRESH]: new Date().toISOString() }); }
  async function _resetSources()    { await _set({ [STORE.SOURCES]: DEFAULT_SOURCES }); }
  async function _getQuickLinks()   { const r = await _get([STORE.QUICK_LINKS]);  return r[STORE.QUICK_LINKS]  || DEFAULT_QUICK_LINKS; }
  async function _saveQuickLinks(l) { await _set({ [STORE.QUICK_LINKS]: l }); }
  async function _resetQuickLinks() { await _set({ [STORE.QUICK_LINKS]: DEFAULT_QUICK_LINKS }); }

  async function _getRecentSearches() { const r = await _get([STORE.RECENT]); return r[STORE.RECENT] || []; }
  async function _saveRecentSearch(entry) {
    const cur = await _getRecentSearches();
    const deduped = cur.filter(e => e.url !== entry.url);
    await _set({ [STORE.RECENT]: [{ ...entry, at: new Date().toISOString() }, ...deduped].slice(0, MAX_RECENT) });
  }
  async function _clearRecent() { await _set({ [STORE.RECENT]: [] }); }

  async function _getRecentlyOpened() { const r = await _get([STORE.OPENED]); return r[STORE.OPENED] || []; }
  async function _saveRecentlyOpened(entry) {
    const cur = await _getRecentlyOpened();
    const deduped = cur.filter(e => e.url !== entry.url);
    await _set({ [STORE.OPENED]: [{ ...entry, openedAt: new Date().toISOString() }, ...deduped].slice(0, MAX_OPENED) });
  }
  async function _clearRecentlyOpened() { await _set({ [STORE.OPENED]: [] }); }

  async function _getFavorites()      { const r = await _get([STORE.FAVORITES]); return r[STORE.FAVORITES] || []; }
  async function _addFavorite(entry) {
    const cur = await _getFavorites();
    if (cur.find(f => f.url === entry.url)) return;
    if (cur.length >= MAX_FAVORITES) cur.pop();
    await _set({ [STORE.FAVORITES]: [{ ...entry, savedAt: new Date().toISOString() }, ...cur] });
  }
  async function _removeFavorite(url) {
    const cur = await _getFavorites();
    await _set({ [STORE.FAVORITES]: cur.filter(f => f.url !== url) });
  }
  async function _clearFavorites()    { await _set({ [STORE.FAVORITES]: [] }); }

  async function _getSettings() {
    const r = await _get([STORE.SETTINGS]);
    return { ...DEFAULT_PLUGIN_SETTINGS, ...(r[STORE.SETTINGS] || {}) };
  }
  async function _getLastRefresh() { const r = await _get([STORE.LAST_REFRESH]); return r[STORE.LAST_REFRESH] || null; }

  async function _saveDiag(record)  { await _set({ [STORE.DIAG]: record }); }

  async function _clearAllData() {
    await Promise.all([_clearRecent(), _clearRecentlyOpened(), _clearFavorites()]);
  }

  async function clearCache() {
    try {
      await Promise.all([
        _set({ [STORE.SOURCES]: [] }),
        _set({ [STORE.QUICK_LINKS]: [] }),
        _set({ [STORE.LAST_REFRESH]: null }),
        _set({ [STORE.DIAG]: null }),
      ]);
      _sources = [];
      _quickLinks = [];
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  }

  async function refreshCache() {
    try {
      const result = await _fetchLiveSources();
      await _saveSources(result.sources);
      await _saveQuickLinks(result.quickLinks);
      _sources = result.sources;
      _quickLinks = result.quickLinks;
      return { ok: true, updatedAt: new Date().toISOString() };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  }

  async function _getIndexStats() {
    const [srcs, favorites, recent, opened, meta] = await Promise.all([
      _getSources(),
      _getFavorites(),
      _getRecentSearches(),
      _getRecentlyOpened(),
      _get([STORE.LAST_REFRESH, STORE.QUICK_LINKS]),
    ]);
    const domainCounts = {};
    srcs.forEach(s => { domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1; });
    const ql = meta[STORE.QUICK_LINKS] || DEFAULT_QUICK_LINKS;
    return {
      totalSources:    srcs.length,
      totalFavorites:  favorites.length,
      totalRecent:     recent.length,
      totalOpened:     opened.length,
      totalQuickLinks: ql.length,
      domainCounts,
      lastRefresh:     meta[STORE.LAST_REFRESH] || null,
    };
  }

  // ── Storage migration ────────────────────────────────────────────────────────
  // Migrates legacy adn_* keys (standalone extension) to the rc:plugin:* namespace.
  // Idempotent: checks for legacy data presence; skips if already migrated.

  async function _migrateStorage() {
    // F-09: skip storage round-trip entirely after first successful migration check.
    if (_migrationDone) return;
    _migrationDone = true;

    const legacyValues = await _get(Object.values(LEGACY_KEYS));
    const hasSomeLegacy = Object.values(LEGACY_KEYS).some(k => legacyValues[k] !== undefined);
    if (!hasSomeLegacy) return; // nothing to migrate

    const migrations = {};
    if (legacyValues[LEGACY_KEYS.SOURCES]      !== undefined) migrations[STORE.SOURCES]      = legacyValues[LEGACY_KEYS.SOURCES];
    if (legacyValues[LEGACY_KEYS.QUICK_LINKS]  !== undefined) migrations[STORE.QUICK_LINKS]  = legacyValues[LEGACY_KEYS.QUICK_LINKS];
    if (legacyValues[LEGACY_KEYS.RECENT]       !== undefined) migrations[STORE.RECENT]       = legacyValues[LEGACY_KEYS.RECENT];
    if (legacyValues[LEGACY_KEYS.OPENED]       !== undefined) migrations[STORE.OPENED]       = legacyValues[LEGACY_KEYS.OPENED];
    if (legacyValues[LEGACY_KEYS.FAVORITES]    !== undefined) migrations[STORE.FAVORITES]    = legacyValues[LEGACY_KEYS.FAVORITES];
    if (legacyValues[LEGACY_KEYS.SETTINGS]     !== undefined) migrations[STORE.SETTINGS]     = legacyValues[LEGACY_KEYS.SETTINGS];
    if (legacyValues[LEGACY_KEYS.LAST_REFRESH] !== undefined) migrations[STORE.LAST_REFRESH] = legacyValues[LEGACY_KEYS.LAST_REFRESH];
    if (legacyValues[LEGACY_KEYS.DIAG]         !== undefined) migrations[STORE.DIAG]         = legacyValues[LEGACY_KEYS.DIAG];

    await _set(migrations);
    await new Promise(r => chrome.storage.local.remove(Object.values(LEGACY_KEYS), r));

    app()?.addLog?.('info', PLUGIN_ID, 'Storage migration complete - legacy adn_* keys moved to rc:plugin namespace');
  }

  // ── URL builders ─────────────────────────────────────────────────────────────

  function _buildUrlSafe(query, scope, domain) {
    const q = (query || '').trim();
    if (!q) return { url: IBM_SEARCH_BASE, query: '', scope: '', scopeSource: 'none' };
    const effectiveScope = scope || DOMAIN_SCOPES[domain] || '';
    const scopeSource    = scope ? 'source' : (DOMAIN_SCOPES[domain] ? 'domain-fallback' : 'none');
    const base = IBM_SEARCH_BASE + '/' + encodeURIComponent(q);
    const url  = effectiveScope ? base + '?scope=' + encodeURIComponent(effectiveScope) : base;
    return { url, query: q, scope: effectiveScope, scopeSource };
  }

  // ── IBM Docs live fetch ───────────────────────────────────────────────────────

  // F-16: timeout constant for the IBM Docs API fetch (15 seconds).
  const FETCH_TIMEOUT_MS = 15000;

  async function _fetchLiveSources(onProgress) {
    const progress = (pct, msg) => { if (onProgress) onProgress(pct, msg); };
    const FETCH_URL = 'https://www.ibm.com/docs/api/v1/products';
    const diag = { at: new Date().toISOString(), success: false, requestUrl: FETCH_URL, httpStatus: null, httpStatusText: null, responseBytes: null, parseResult: null, totalProducts: null, matchedProducts: null, errorPhase: null, errorDetail: null };

    progress(10, 'Connecting to IBM Documentation API…');
    let resp;
    try {
      // F-16: abort if IBM Docs API does not respond within FETCH_TIMEOUT_MS.
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        resp = await fetch(FETCH_URL, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (netErr) {
      const isTimeout = netErr?.name === 'AbortError';
      diag.errorPhase  = isTimeout ? 'timeout' : 'network';
      diag.errorDetail = netErr.message;
      await _saveDiag(diag);
      app()?.addLog?.('error', PLUGIN_ID, 'IBM Docs fetch - ' + (isTimeout ? 'timed out after ' + (FETCH_TIMEOUT_MS / 1000) + ' s' : 'network error: ' + netErr.message));
      throw new Error(isTimeout
        ? 'IBM Docs API did not respond within ' + (FETCH_TIMEOUT_MS / 1000) + ' seconds. Try again later.'
        : 'Network error - cannot reach IBM Docs API. Check your internet connection.\nError: ' + netErr.message);
    }

    diag.httpStatus = resp.status; diag.httpStatusText = resp.statusText || '';
    progress(30, 'Receiving product catalog from IBM…');

    let rawText;
    try { rawText = await resp.text(); } catch (bodyErr) {
      diag.errorPhase = 'read-body'; diag.errorDetail = bodyErr.message;
      await _saveDiag(diag);
      throw new Error('HTTP ' + resp.status + ' - failed to read response body: ' + bodyErr.message);
    }
    diag.responseBytes = rawText.length;

    if (!resp.ok) {
      diag.errorPhase = 'http-status'; diag.errorDetail = 'HTTP ' + resp.status + ' ' + (resp.statusText || '');
      await _saveDiag(diag);
      app()?.addLog?.('error', PLUGIN_ID, 'IBM Docs API returned HTTP ' + resp.status);
      throw new Error('IBM Docs API returned HTTP ' + resp.status + '. The service may be temporarily unavailable.');
    }

    progress(50, 'Parsing product catalog…');
    let all;
    try { all = JSON.parse(rawText); diag.parseResult = 'ok'; } catch (parseErr) {
      diag.errorPhase = 'json-parse'; diag.parseResult = parseErr.message; diag.errorDetail = rawText.slice(0, 120);
      await _saveDiag(diag);
      throw new Error('Failed to parse IBM Docs API response as JSON.\nParse error: ' + parseErr.message);
    }

    if (!Array.isArray(all)) {
      diag.errorPhase = 'structure'; diag.errorDetail = 'Expected array, got ' + typeof all;
      await _saveDiag(diag);
      throw new Error('IBM Docs API response was not an array.');
    }
    diag.totalProducts = all.length;

    progress(70, 'Filtering Apptio ecosystem products…');
    const relevant = all.filter(p => p.productUrlKey && (
      p.productUrlKey === 'apptio' ||
      p.productUrlKey === 'cloudability' ||
      p.productUrlKey === 'targetprocess' ||
      p.productUrlKey.startsWith('apptio-') ||
      p.productUrlKey.startsWith('cloudability-') ||
      p.productUrlKey.startsWith('targetprocess/')
    ));
    diag.matchedProducts = relevant.length;

    if (relevant.length === 0) {
      diag.errorPhase = 'filter'; diag.errorDetail = '0 of ' + all.length + ' products matched filter';
      await _saveDiag(diag);
      throw new Error('IBM Docs API returned ' + all.length + ' products but 0 matched the Apptio ecosystem filter. The catalog structure may have changed.');
    }

    const domainOf = key => {
      if (key.startsWith('cloudability'))    return 'cloudability';
      if (key.startsWith('targetprocess'))   return 'targetprocess';
      if (key.startsWith('apptio-platform')) return 'platform';
      return 'apptio';
    };

    progress(90, 'Building documentation index…');
    const sources = relevant.map(p => {
      const domain = domainOf(p.productUrlKey);
      const scope  = p.productUrlKey || DOMAIN_SCOPES[domain] || '';
      return { id: p.key || p.productUrlKey, domain, label: p.name, scope, hint: '', url: IBM_DOCS_BASE + '/' + p.productUrlKey };
    });

    const quickLinks = sources.map(s => ({ label: s.label, url: s.url, group: s.domain }));

    diag.success = true;
    await _saveDiag(diag);
    progress(100, 'Documentation index ready.');
    return { sources, quickLinks };
  }

  // ── Utility helpers ──────────────────────────────────────────────────────────

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _relTime(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  function _setMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className   = 'adf-status-msg adf-status-msg--' + type;
    el.hidden      = !msg;
  }

  function _openUrl(url) {
    chrome.tabs.create({ url });
  }

  function _$(id) { return document.getElementById(id); }

  // ── Selected source helper ───────────────────────────────────────────────────

  function _selectedSource() {
    const sel = _$('adf-source-select');
    return _sources.find(s => s.id === (sel ? sel.value : '')) || null;
  }

  // ── Main UI builder ──────────────────────────────────────────────────────────

  function _renderMainUI(containerEl) {
    const _ih = window.ReplyCatorsIconHelper;

    // Reveal the static tab bar (hidden until the main UI is ready)
    const tabBar = document.getElementById('adf-tab-bar');
    if (tabBar) tabBar.hidden = false;

    // Remove the initial loading placeholder
    const initLoading = document.getElementById('adf-initial-loading');
    if (initLoading) initLoading.remove();

    // Render tab panels directly into the panels-host container.
    // Tab bar lives in static HTML as a sibling of rc-plugin-header.
    containerEl.innerHTML = `
      <!-- ── SEARCH VIEW ─────────────────────────────────────────────── -->
      <div id="adf-view-search" class="rc-plugin-tab-panel rc-plugin-tab-panel--active adf-tab-panel">
        <div class="adf-search-form">
          <div class="adf-field">
            <label class="adf-label" for="adf-query">Search IBM Documentation</label>
            <div class="adf-input-wrap" id="adf-input-wrap">
              ${_ih ? _ih.renderIcon('actions.search',{size:13,decorative:true,className:'adf-input-icon'}) : ''}
              <input id="adf-query" class="rc-input" type="text"
                     placeholder="e.g. lookup, allocation, rightsizing…"
                     autocomplete="off" spellcheck="false"
                     title="Enter a search term to find IBM Apptio documentation"
                     aria-label="Search IBM Documentation" />
              <button class="adf-clear-btn" id="adf-clear" aria-label="Clear search query" title="Clear search query" hidden>×</button>
            </div>
          </div>

          <div class="adf-field">
            <label class="adf-label">Domain</label>
            <div class="adf-domain-btns" role="group" aria-label="Domain filter">
              <button class="adf-domain-btn adf-domain-btn--active" data-adf-domain="apptio"        aria-pressed="true"  title="Search Apptio product documentation">Apptio</button>
              <button class="adf-domain-btn"                         data-adf-domain="platform"      aria-pressed="false" title="Search Apptio Platform documentation">Platform</button>
              <button class="adf-domain-btn"                         data-adf-domain="cloudability"  aria-pressed="false" title="Search Cloudability documentation">Cloudability</button>
              <button class="adf-domain-btn"                         data-adf-domain="targetprocess" aria-pressed="false" title="Search Targetprocess documentation">Targetprocess</button>
            </div>
          </div>

          <div class="adf-field">
            <label class="adf-label" for="adf-source-select">
              Category
              <span class="adf-label-hint">optional</span>
            </label>
            <select id="adf-source-select" class="rc-input rc-input--sm" aria-label="Documentation category" title="Narrow search to a specific product category"></select>
          </div>

          <div class="adf-action-row">
            <button class="rc-btn rc-btn--primary" id="adf-btn-search" title="Search IBM Documentation with the current query and filters">${_ih ? _ih.renderIcon('actions.search',{size:13,decorative:true}) : ''}Search IBM Docs</button>
            <button class="rc-btn rc-btn--secondary" id="adf-btn-fav-search" title="Save this search as a favorite" aria-label="Save current search as favorite">Save</button>
            <button class="rc-btn rc-btn--ghost" id="adf-btn-sources" title="Manage documentation sources (add, edit, reset) - keyboard shortcut: S" aria-label="Manage documentation sources">Sources</button>
          </div>

          <!-- URL debug panel -->
          <div class="adf-debug-panel">
            <button class="adf-debug-toggle" id="adf-debug-toggle" aria-expanded="false" title="Toggle URL preview panel"><span class="adf-chevron" id="adf-debug-chevron" aria-hidden="true" style="display:inline-block;width:10px;height:10px;vertical-align:middle;margin-right:4px;">›</span>URL Preview
            </button>
            <div class="adf-debug-body" id="adf-debug-body" hidden>
              <div class="adf-debug-row"><span class="adf-dk">Domain</span><span class="adf-dv" id="adf-db-domain">-</span></div>
              <div class="adf-debug-row"><span class="adf-dk">Category</span><span class="adf-dv" id="adf-db-cat">-</span></div>
              <div class="adf-debug-row"><span class="adf-dk">Scope</span><span class="adf-dv adf-mono" id="adf-db-scope">-</span></div>
              <div class="adf-debug-row"><span class="adf-dk">Scope via</span><span class="adf-dv" id="adf-db-scope-src">-</span></div>
              <div class="adf-debug-row adf-scope-warn" id="adf-scope-warn" hidden>
                <span class="adf-dk" style="color:var(--rc-warning,#fbbf24)">Warning:</span>
                <span class="adf-dv" style="color:var(--rc-warning,#fbbf24)">No scope - search will include all IBM products</span>
              </div>
              <div class="adf-debug-row"><span class="adf-dk">URL</span><span class="adf-dv adf-mono" id="adf-db-url">-</span></div>
            </div>
          </div>
        </div>

        <!-- Quick links -->
        <section class="adf-section" id="adf-ql-section">
          <div class="adf-section-hdr">
            <span class="adf-section-title">Quick Links</span>
            <span class="adf-section-hint" id="adf-ql-domain-hint"></span>
          </div>
          <div id="adf-quick-links" class="adf-quick-links"></div>
        </section>
      </div>

      <!-- ── FAVORITES VIEW ───────────────────────────────────────────── -->
      <div id="adf-view-favs" class="rc-plugin-tab-panel adf-tab-panel" hidden>
        <div class="adf-view-toolbar">
          <span class="adf-view-count" id="adf-favs-count"></span>
          <button class="rc-btn rc-btn--ghost rc-btn--xs" id="adf-clear-favs"
                  title="Remove all saved favorites - cannot be undone">Clear all</button>
        </div>
        <ul id="adf-favs-list" class="adf-item-list"></ul>
        <div class="adf-empty-state" id="adf-favs-empty" hidden>
          <p>No favorites yet.</p>
          <p class="rc-muted" style="font-size:12px;">Use the save action on a recent or opened item to add it here.</p>
        </div>
      </div>

      <!-- ── RECENT SEARCHES VIEW ─────────────────────────────────────── -->
      <div id="adf-view-recent" class="rc-plugin-tab-panel adf-tab-panel" hidden>
        <div class="adf-view-toolbar">
          <span class="adf-view-count" id="adf-recent-count"></span>
          <button class="rc-btn rc-btn--ghost rc-btn--xs" id="adf-clear-recent"
                  title="Clear all recent search history - cannot be undone">Clear all</button>
        </div>
        <ul id="adf-recent-list" class="adf-item-list"></ul>
        <div class="adf-empty-state" id="adf-recent-empty" hidden>
          <p>No recent searches yet.</p>
          <p class="rc-muted" style="font-size:12px;">Your last ${MAX_RECENT} searches will appear here.</p>
        </div>
      </div>

      <!-- ── RECENTLY OPENED VIEW ─────────────────────────────────────── -->
      <div id="adf-view-opened" class="rc-plugin-tab-panel adf-tab-panel" hidden>
        <div class="adf-view-toolbar">
          <span class="adf-view-count" id="adf-opened-count"></span>
          <button class="rc-btn rc-btn--ghost rc-btn--xs" id="adf-clear-opened"
                  title="Clear all opened pages history - cannot be undone">Clear all</button>
        </div>
        <ul id="adf-opened-list" class="adf-item-list"></ul>
        <div class="adf-empty-state" id="adf-opened-empty" hidden>
          <p>No pages opened yet.</p>
          <p class="rc-muted" style="font-size:12px;">The last ${MAX_OPENED} IBM Docs pages you open will appear here.</p>
        </div>
      </div>

      <!-- ── INDEX STATUS VIEW ────────────────────────────────────────── -->
      <div id="adf-view-status" class="rc-plugin-tab-panel adf-tab-panel" hidden>
        <div id="adf-status-grid" class="adf-status-grid"></div>
        <div id="adf-domain-breakdown" class="adf-domain-breakdown"></div>
        <div class="adf-status-actions">
          <button class="rc-btn rc-btn--secondary" id="adf-btn-refresh-from-status"
                  title="Refresh all documentation sources from IBM Documentation API">
            ↻ Refresh Sources from IBM Docs
          </button>
        </div>
        <div class="adf-status-msg" id="adf-index-status-msg" hidden></div>
      </div>

      <!-- ── SOURCES OVERLAY ──────────────────────────────────────────── -->
      <div class="adf-overlay" id="adf-overlay-sources" hidden>
        <div class="adf-overlay-hdr">
          <span class="adf-overlay-title">Documentation Sources</span>
          <button class="rc-btn rc-btn--ghost rc-btn--xs" id="adf-back-sources"
                  title="Close Documentation Sources">Close</button>
        </div>
        <p class="rc-muted" style="font-size:12px;margin-bottom:8px;">
          Each source maps a label to an IBM Documentation scope path (the URL segment after <code>ibm.com/docs/en/</code>).<br>
          Example: <code>apptio-commercial/tbm-studio/saas</code>
        </p>
        <div class="adf-sources-actions">
          <button class="rc-btn rc-btn--secondary rc-btn--sm" id="adf-btn-refresh-cats"
                  title="Fetch current product list from IBM Documentation API and rebuild sources">↻ Refresh from IBM Docs</button>
          <button class="rc-btn rc-btn--ghost rc-btn--sm" id="adf-btn-reset-sources"
                  title="Reset all sources to the built-in defaults">Reset defaults</button>
        </div>
        <div class="adf-status-bar">
          <span class="adf-status-msg" id="adf-refresh-status" hidden></span>
        </div>
        <div class="adf-sources-header">
          <span>Label</span><span>IBM Docs scope path</span><span>Domain</span><span></span>
        </div>
        <div id="adf-sources-list" class="adf-sources-list"></div>
        <button class="rc-btn rc-btn--ghost rc-btn--sm" id="adf-btn-add-source"
                style="margin-top:8px;"
                title="Add a new custom documentation source">+ Add source</button>
      </div>`;

    // Bind all UI controls after the HTML is in the DOM
    _bindAll();
    _renderSourceSelect();
    _renderQuickLinks();
    _updateDebug();
    _refreshFavsBadge();

    // Focus search input
    setTimeout(() => { const el = _$('adf-query'); if (el) el.focus(); }, 50);
  }

  // ── Tab switching ────────────────────────────────────────────────────────────

  function _showTab(name) {
    _activeTab = name;
    _overlay   = null;

    // Use platform standard tab classes (rc-plugin-tab / rc-plugin-tab--active)
    document.querySelectorAll('.rc-plugin-tab[data-adf-tab]').forEach(btn => {
      const active = btn.dataset.adfTab === name;
      btn.classList.toggle('rc-plugin-tab--active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    const viewIds = ['search', 'favs', 'recent', 'opened', 'status'];
    viewIds.forEach(id => {
      const el = _$('adf-view-' + id);
      if (!el) return;
      const active = id === name;
      el.hidden = !active;
      el.classList.toggle('rc-plugin-tab-panel--active', active);
    });
    const overlaySrc = _$('adf-overlay-sources');
    if (overlaySrc) overlaySrc.hidden = true;

    if (name === 'favs')   _renderFavorites();
    if (name === 'recent') _renderRecent();
    if (name === 'opened') _renderOpened();
    if (name === 'status') _renderStatus();
  }

  function _showOverlay(name) {
    _overlay = name;
    ['search', 'favs', 'recent', 'opened', 'status'].forEach(id => {
      const el = _$('adf-view-' + id);
      if (!el) return;
      el.hidden = true;
      el.classList.remove('rc-plugin-tab-panel--active');
    });
    const overlaySrc = _$('adf-overlay-sources');
    if (overlaySrc) overlaySrc.hidden = name !== 'sources';
    if (name === 'sources') _renderSourcesList();
  }

  function _closeOverlay() {
    _overlay = null;
    ['search', 'favs', 'recent', 'opened', 'status'].forEach(id => {
      const el = _$('adf-view-' + id);
      if (!el) return;
      const active = id === _activeTab;
      el.hidden = !active;
      el.classList.toggle('rc-plugin-tab-panel--active', active);
    });
    const overlaySrc = _$('adf-overlay-sources');
    if (overlaySrc) overlaySrc.hidden = true;
    if (_activeTab === 'search') {
      const el = _$('adf-query');
      if (el) el.focus();
    }
  }

  // ── Domain / category ────────────────────────────────────────────────────────

  function _renderSourceSelect() {
    const sel = _$('adf-source-select');
    if (!sel) return;
    const opts = _sources.filter(s => s.domain === _activeDomain);
    sel.innerHTML = opts.map(s => `<option value="${_esc(s.id)}" title="${_esc(s.hint || '')}">${_esc(s.label)}</option>`).join('');
    _updateDebug();
  }

  function _renderQuickLinks() {
    const el      = _$('adf-quick-links');
    const hintEl  = _$('adf-ql-domain-hint');
    if (!el) return;
    const filtered = _quickLinks.filter(l => l.group === _activeDomain);
    if (hintEl) hintEl.textContent = _activeDomain.charAt(0).toUpperCase() + _activeDomain.slice(1);
    el.innerHTML = '';
    if (!filtered.length) {
      el.innerHTML = `<p class="rc-muted" style="font-size:12px;">No quick links for this domain. Use Settings → Refresh Categories to load them.</p>`;
      return;
    }
    const chips = document.createElement('div');
    chips.className = 'adf-ql-chips';
    filtered.forEach(link => {
      const btn = document.createElement('button');
      btn.className   = 'adf-ql-chip';
      btn.textContent = link.label;
      btn.title       = link.url;
      btn.addEventListener('click', () => _openUrl(link.url));
      chips.appendChild(btn);
    });
    el.appendChild(chips);
  }

  // ── Debug / URL preview ──────────────────────────────────────────────────────

  function _updateDebug() {
    const src   = _selectedSource();
    const query = (_$('adf-query') || {}).value || '';
    const result = _buildUrlSafe(query.trim(), src ? src.scope : '', _activeDomain);
    const domainSources = _sources.filter(s => s.domain === _activeDomain);
    const scopedCount   = domainSources.filter(s => s.scope).length;

    const setDv = (id, txt) => { const el = _$(id); if (el) el.textContent = txt; };
    setDv('adf-db-domain',    _activeDomain.charAt(0).toUpperCase() + _activeDomain.slice(1));
    setDv('adf-db-cat',       src ? src.label : '-');
    setDv('adf-db-scope',     result.scope || '(no scope - will search all IBM Docs)');
    setDv('adf-db-scope-src', result.scopeSource === 'domain-fallback' ? 'domain fallback (' + DOMAIN_SCOPES[_activeDomain] + ')' : result.scopeSource === 'source' ? 'source' : '-');
    setDv('adf-db-url',       result.url || IBM_SEARCH_BASE);
    const warnEl = _$('adf-scope-warn');
    if (warnEl) warnEl.hidden = !!result.scope;
  }

  // ── Favorites ────────────────────────────────────────────────────────────────

  async function _renderFavorites() {
    const items   = await _getFavorites();
    const countEl = _$('adf-favs-count');
    const listEl  = _$('adf-favs-list');
    const emptyEl = _$('adf-favs-empty');
    if (countEl) countEl.textContent = items.length ? items.length + ' saved' : '';
    if (emptyEl) emptyEl.hidden = items.length > 0;
    if (!listEl) return;
    listEl.innerHTML = '';
    items.forEach(item => {
      listEl.appendChild(_makeItemCard(item, 'fav', async () => {
        await _removeFavorite(item.url);
        _renderFavorites();
        _refreshFavsBadge();
      }));
    });
    _refreshFavsBadge();
  }

  async function _refreshFavsBadge() {
    const favs    = await _getFavorites();
    const badgeEl = _$('adf-favs-badge');
    const countEl = _$('adf-favs-count');
    if (badgeEl) { badgeEl.textContent = favs.length || ''; badgeEl.hidden = favs.length === 0; }
    if (countEl) countEl.textContent = favs.length ? favs.length + ' saved' : '';
  }

  // ── Recent ───────────────────────────────────────────────────────────────────

  async function _renderRecent() {
    const items   = await _getRecentSearches();
    const countEl = _$('adf-recent-count');
    const listEl  = _$('adf-recent-list');
    const emptyEl = _$('adf-recent-empty');
    if (countEl) countEl.textContent = items.length ? items.length + ' searches' : '';
    if (emptyEl) emptyEl.hidden = items.length > 0;
    if (!listEl) return;
    listEl.innerHTML = '';
    items.forEach(item => {
      listEl.appendChild(_makeItemCard(item, 'recent', async () => {
        await _addFavorite({ label: item.query, url: item.url, domain: item.domain });
        _refreshFavsBadge();
      }));
    });
  }

  // ── Opened ───────────────────────────────────────────────────────────────────

  async function _renderOpened() {
    const items   = await _getRecentlyOpened();
    const countEl = _$('adf-opened-count');
    const listEl  = _$('adf-opened-list');
    const emptyEl = _$('adf-opened-empty');
    if (countEl) countEl.textContent = items.length ? items.length + ' pages' : '';
    if (emptyEl) emptyEl.hidden = items.length > 0;
    if (!listEl) return;
    listEl.innerHTML = '';
    items.forEach(item => {
      listEl.appendChild(_makeItemCard(item, 'opened', async () => {
        await _addFavorite({ label: item.label || item.url, url: item.url, domain: item.domain || '' });
        _refreshFavsBadge();
      }));
    });
  }

  // ── Item card ────────────────────────────────────────────────────────────────

  function _makeItemCard(item, type, actionFn) {
    const li    = document.createElement('li');
    li.className = 'adf-item-card';
    const label  = item.label || item.query || item.url;
    const domain = item.domain || '';
    const ts     = item.savedAt || item.at || item.openedAt || '';
    const timeStr = ts ? _relTime(ts) : '';
    const _ih = window.ReplyCatorsIconHelper;
    const actionIcon  = type === 'fav'
      ? _ih.renderIcon('states.success', { size: 12, decorative: true })
      : _ih.renderIcon('actions.add',    { size: 12, decorative: true });
    const actionTitle = type === 'fav' ? 'Remove from favorites' : 'Add to favorites';

    li.innerHTML = `
      <div class="adf-ic-body" tabindex="0" role="button" title="${_esc(item.url)}">
        <span class="adf-ic-label">${_esc(label)}</span>
        <span class="adf-ic-meta">
          ${domain  ? `<span class="adf-ic-domain">${_esc(domain)}</span>` : ''}
          ${timeStr ? `<span class="adf-ic-time">${_esc(timeStr)}</span>` : ''}
        </span>
      </div>
      <div class="adf-ic-actions">
        <button class="adf-ic-btn js-star" title="${actionTitle}" aria-label="${actionTitle}">${actionIcon}</button>
        <button class="adf-ic-btn js-open" title="Open in IBM Docs" aria-label="Open in IBM Docs">↗</button>
      </div>`;

    const body = li.querySelector('.adf-ic-body');
    body.addEventListener('click',   () => _openUrl(item.url));
    body.addEventListener('keydown', e => { if (e.key === 'Enter') _openUrl(item.url); });
    li.querySelector('.js-open').addEventListener('click', e => { e.stopPropagation(); _openUrl(item.url); });
    li.querySelector('.js-star').addEventListener('click', e => { e.stopPropagation(); actionFn(); });

    return li;
  }

  // ── Index status ─────────────────────────────────────────────────────────────

  async function _renderStatus() {
    const gridEl  = _$('adf-status-grid');
    const brkEl   = _$('adf-domain-breakdown');
    if (!gridEl || !brkEl) return;
    const stats = await _getIndexStats();
    gridEl.innerHTML = `
      <div class="adf-stat-card"><div class="adf-stat-val">${stats.totalSources}</div><div class="adf-stat-key">Sources</div></div>
      <div class="adf-stat-card"><div class="adf-stat-val">${stats.totalFavorites}</div><div class="adf-stat-key">Favorites</div></div>
      <div class="adf-stat-card"><div class="adf-stat-val">${stats.totalQuickLinks || 0}</div><div class="adf-stat-key">Quick Links</div></div>
      <div class="adf-stat-card"><div class="adf-stat-val">${stats.totalRecent}</div><div class="adf-stat-key">Searches</div></div>`;
    const lastRef = stats.lastRefresh
      ? new Date(stats.lastRefresh).toLocaleString()
      : 'Never refreshed - click Refresh below';
    brkEl.innerHTML = `
      <div style="font-size:11px;font-weight:600;color:var(--rc-text-muted);margin-bottom:6px;">Sources by domain</div>
      ${Object.entries(stats.domainCounts).map(([d, n]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="min-width:90px;font-size:12px;">${_esc(d)}</span>
          <div style="flex:1;background:var(--rc-surface);border-radius:4px;height:6px;overflow:hidden;">
            <div style="width:${Math.round(n / stats.totalSources * 100)}%;background:var(--rc-accent);height:100%;border-radius:4px;"></div>
          </div>
          <span style="font-size:11px;color:var(--rc-text-muted);">${n}</span>
        </div>`).join('')}
      <div style="font-size:11px;color:var(--rc-text-muted);margin-top:6px;">Last refreshed: ${_esc(lastRef)}</div>`;
  }

  // ── Shared refresh ────────────────────────────────────────────────────────────

  async function _doRefresh(statusEl) {
    if (statusEl) _setMsg(statusEl, 'Fetching IBM Documentation catalog…', 'checking');
    app()?.addLog?.('info', PLUGIN_ID, 'Refresh started: fetching IBM Documentation catalog');
    app()?.addNotification?.('Apptio Docs Finder', 'Refreshing documentation sources from IBM…', 'info', PLUGIN_ID);
    try {
      const result = await _fetchLiveSources();
      await _saveSources(result.sources);
      await _saveQuickLinks(result.quickLinks);
      _sources    = result.sources;
      _quickLinks = result.quickLinks;
      _renderSourceSelect();
      _renderQuickLinks();
      const domainCount = Object.keys(result.sources.reduce((acc, s) => { acc[s.domain] = 1; return acc; }, {})).length;
      const msg = 'Loaded ' + result.sources.length + ' sources across ' + domainCount + ' domains';
      if (statusEl) _setMsg(statusEl, msg, 'ok');
      app()?.addLog?.('info', PLUGIN_ID, 'Refresh complete: ' + result.sources.length + ' sources, ' + result.quickLinks.length + ' quick links across ' + domainCount + ' domains');
      app()?.addNotification?.('Apptio Docs Finder', 'Refresh complete - ' + result.sources.length + ' sources loaded.', 'success', PLUGIN_ID);
    } catch (err) {
      const firstLine = err.message.split('\n')[0];
      if (statusEl) _setMsg(statusEl, firstLine, 'error');
      app()?.addLog?.('error', PLUGIN_ID, 'Refresh failed: ' + err.message);
      app()?.addNotification?.('Apptio Docs Finder', 'Refresh failed: ' + firstLine, 'error', PLUGIN_ID);
    }
  }

  // ── Sources overlay ───────────────────────────────────────────────────────────

  function _renderSourcesList() {
    const listEl = _$('adf-sources-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    _sources.forEach(s => _appendSourceRow(s));
  }

  function _appendSourceRow(src) {
    const listEl = _$('adf-sources-list');
    if (!listEl) return;
    const row = document.createElement('div');
    row.className = 'adf-source-row';
    row.dataset.id = src.id;
    row.innerHTML = `
      <input class="rc-input rc-input--sm" type="text" placeholder="Label" value="${_esc(src.label)}" data-f="label" title="Short label for this documentation source" />
      <input class="rc-input rc-input--sm adf-mono" type="text" placeholder="Scope path (e.g. apptio-commercial/tbm-studio/saas)" value="${_esc(src.scope)}" data-f="scope" title="IBM Docs scope path - the URL segment after ibm.com/docs/en/" style="font-size:11px;" />
      <select class="rc-input rc-input--sm" data-f="domain" title="Domain this source belongs to" style="min-width:0">
        <option value="apptio"        ${src.domain === 'apptio'        ? 'selected' : ''}>Apptio</option>
        <option value="platform"      ${src.domain === 'platform'      ? 'selected' : ''}>Platform</option>
        <option value="cloudability"  ${src.domain === 'cloudability'  ? 'selected' : ''}>Cloudability</option>
        <option value="targetprocess" ${src.domain === 'targetprocess' ? 'selected' : ''}>Targetprocess</option>
      </select>
      <button class="rc-btn rc-btn--ghost rc-btn--xs js-del-src" title="Remove this source" style="padding:2px 6px;">×</button>`;
    row.querySelector('.js-del-src').addEventListener('click', () => row.remove());
    listEl.appendChild(row);
  }

  async function _flushSourcesList() {
    const listEl = _$('adf-sources-list');
    if (!listEl) return;
    const updated = [];
    listEl.querySelectorAll('.adf-source-row').forEach(row => {
      const label  = row.querySelector('[data-f="label"]').value.trim();
      const scope  = row.querySelector('[data-f="scope"]').value.trim();
      const domain = row.querySelector('[data-f="domain"]').value;
      if (label) updated.push({ id: row.dataset.id, domain, label, scope, hint: '' });
    });
    if (updated.length) await _saveSources(updated);
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  async function _doSearch() {
    const queryEl = _$('adf-query');
    const query = queryEl ? queryEl.value.trim() : '';
    if (!query) {
      const wrap = _$('adf-input-wrap');
      if (wrap) {
        wrap.style.borderColor = 'var(--rc-error,#f87171)';
        wrap.style.boxShadow   = '0 0 0 3px rgba(248,113,113,.18)';
        setTimeout(() => { wrap.style.borderColor = ''; wrap.style.boxShadow = ''; }, 700);
      }
      if (queryEl) queryEl.focus();
      return;
    }
    const src    = _selectedSource();
    const result = _buildUrlSafe(query, src ? src.scope : '', _activeDomain);
    const domain = _activeDomain.charAt(0).toUpperCase() + _activeDomain.slice(1);
    const entry  = { query, domain, category: src ? src.label : '', url: result.url };

    if (_settings.saveSearchHistory) await _saveRecentSearch(entry);
    if (_settings.saveOpenHistory)   await _saveRecentlyOpened({ label: query + ' - ' + (src ? src.label : domain), url: result.url, domain });

    app()?.addLog?.('info', PLUGIN_ID, 'Searched IBM Docs: "' + query + '" - ' + domain + (src ? ' / ' + src.label : ''));
    _openUrl(result.url);
  }

  // ── Event bindings ────────────────────────────────────────────────────────────

  function _bindAll() {
    // Tab bar
    // Tab bar - uses platform standard rc-plugin-tab elements (v1.43.4)
    document.querySelectorAll('.rc-plugin-tab[data-adf-tab]').forEach(btn => {
      btn.addEventListener('click', () => _showTab(btn.dataset.adfTab));
    });

    // Domain buttons
    document.querySelectorAll('.adf-domain-btn[data-adf-domain]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeDomain = btn.dataset.adfDomain;
        document.querySelectorAll('.adf-domain-btn').forEach(b => {
          b.classList.toggle('adf-domain-btn--active', b.dataset.adfDomain === _activeDomain);
          b.setAttribute('aria-pressed', String(b.dataset.adfDomain === _activeDomain));
        });
        _renderSourceSelect();
        _renderQuickLinks();
        _updateDebug();
      });
    });

    // Search input
    const queryEl = _$('adf-query');
    const clearEl = _$('adf-clear');
    const selEl   = _$('adf-source-select');
    if (queryEl) {
      queryEl.addEventListener('input', () => {
        if (clearEl) clearEl.hidden = !queryEl.value;
        _updateDebug();
      });
      queryEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); _doSearch(); }
      });
    }
    if (clearEl) {
      clearEl.addEventListener('click', () => {
        if (queryEl) { queryEl.value = ''; queryEl.focus(); }
        clearEl.hidden = true;
        _updateDebug();
      });
    }
    if (selEl) selEl.addEventListener('change', _updateDebug);

    // Search button
    const searchBtn = _$('adf-btn-search');
    if (searchBtn) searchBtn.addEventListener('click', _doSearch);

    // Save search as favorite
    const favSearchBtn = _$('adf-btn-fav-search');
    if (favSearchBtn) {
      favSearchBtn.addEventListener('click', async () => {
        const query = queryEl ? queryEl.value.trim() : '';
        if (!query) { if (queryEl) queryEl.focus(); return; }
        const src    = _selectedSource();
        const result = _buildUrlSafe(query, src ? src.scope : '', _activeDomain);
        const domain = _activeDomain.charAt(0).toUpperCase() + _activeDomain.slice(1);
        await _addFavorite({ label: query + ' - ' + (src ? src.label : domain), url: result.url, query, domain });
        favSearchBtn.textContent = 'Saved';
        setTimeout(() => { favSearchBtn.textContent = 'Save'; }, 1000);
        _refreshFavsBadge();
      });
    }

    // Sources overlay button
    const sourcesBtn = _$('adf-btn-sources');
    if (sourcesBtn) sourcesBtn.addEventListener('click', () => _showOverlay('sources'));

    // Debug toggle
    const debugToggle = _$('adf-debug-toggle');
    const debugBody   = _$('adf-debug-body');
    const debugChev   = _$('adf-debug-chevron');
    if (debugToggle) {
      debugToggle.addEventListener('click', () => {
        _debugOpen = !_debugOpen;
        if (debugBody) debugBody.hidden = !_debugOpen;
        if (debugChev) debugChev.classList.toggle('adf-chevron--open', _debugOpen);
        debugToggle.setAttribute('aria-expanded', String(_debugOpen));
      });
    }

    // Favorites clear
    const clearFavsBtn = _$('adf-clear-favs');
    if (clearFavsBtn) {
      clearFavsBtn.addEventListener('click', async () => {
        if (!confirm('Remove all favorites?')) return;
        await _clearFavorites();
        _renderFavorites();
        _refreshFavsBadge();
        app()?.addLog?.('info', PLUGIN_ID, 'All favorites cleared by user');
      });
    }

    // Recent clear
    const clearRecentBtn = _$('adf-clear-recent');
    if (clearRecentBtn) {
      clearRecentBtn.addEventListener('click', async () => {
        if (!confirm('Clear all recent searches?')) return;
        await _clearRecent();
        const listEl = _$('adf-recent-list');
        const emptyEl = _$('adf-recent-empty');
        if (listEl) listEl.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
        const countEl = _$('adf-recent-count');
        if (countEl) countEl.textContent = '';
        app()?.addLog?.('info', PLUGIN_ID, 'Recent searches cleared by user');
      });
    }

    // Opened clear
    const clearOpenedBtn = _$('adf-clear-opened');
    if (clearOpenedBtn) {
      clearOpenedBtn.addEventListener('click', async () => {
        if (!confirm('Clear all opened pages history?')) return;
        await _clearRecentlyOpened();
        const listEl = _$('adf-opened-list');
        const emptyEl = _$('adf-opened-empty');
        if (listEl) listEl.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
        const countEl = _$('adf-opened-count');
        if (countEl) countEl.textContent = '';
        app()?.addLog?.('info', PLUGIN_ID, 'Opened pages cleared by user');
      });
    }

    // Index status refresh
    const refreshStatusBtn = _$('adf-btn-refresh-from-status');
    if (refreshStatusBtn) {
      refreshStatusBtn.addEventListener('click', async () => {
        refreshStatusBtn.disabled = true;
        await _doRefresh(_$('adf-index-status-msg'));
        await _renderStatus();
        refreshStatusBtn.disabled = false;
      });
    }

    // Sources overlay bindings
    const backSourcesBtn   = _$('adf-back-sources');
    const resetSourcesBtn  = _$('adf-btn-reset-sources');
    const refreshCatsBtn   = _$('adf-btn-refresh-cats');
    const addSourceBtn     = _$('adf-btn-add-source');

    if (backSourcesBtn) {
      backSourcesBtn.addEventListener('click', async () => {
        await _flushSourcesList();
        _sources = await _getSources();
        _renderSourceSelect();
        _closeOverlay();
      });
    }
    if (resetSourcesBtn) {
      resetSourcesBtn.addEventListener('click', async () => {
        if (!confirm('Reset all sources to defaults?')) return;
        await _resetSources();
        await _resetQuickLinks();
        _sources    = await _getSources();
        _quickLinks = await _getQuickLinks();
        _renderSourcesList();
        _renderSourceSelect();
        _renderQuickLinks();
        _setMsg(_$('adf-refresh-status'), 'Reset to defaults', 'ok');
        app()?.addLog?.('info', PLUGIN_ID, 'Documentation sources reset to defaults by user');
      });
    }
    if (refreshCatsBtn) refreshCatsBtn.addEventListener('click', () => _doRefresh(_$('adf-refresh-status')));
    if (addSourceBtn) {
      addSourceBtn.addEventListener('click', () => {
        _appendSourceRow({ id: 'new-' + Date.now(), domain: 'apptio', label: '', scope: '', hint: '' });
      });
    }

    // Keyboard shortcuts - F-01: register exactly once per session.
    if (!_keydownBound) {
      document.addEventListener('keydown', _handleKeydown);
      _keydownBound = true;
    }
  }

  function _handleKeydown(e) {
    const viewEl = document.getElementById('view-plugin-apptio-docs-finder');
    if (!viewEl || !viewEl.classList.contains('rc-view--active')) return;
    const container = _$('adf-docs-container');
    if (!container) return;
    if (e.key === 'Escape') {
      if (_overlay) { _closeOverlay(); return; }
      if (_activeTab !== 'search') { _showTab('search'); const el = _$('adf-query'); if (el) el.focus(); }
      return;
    }
    const queryEl = _$('adf-query');
    const activeIsInput = document.activeElement === queryEl || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && !activeIsInput && !_overlay) {
      _showOverlay('sources');
    }
  }

  // ── Plugin lifecycle - public API ─────────────────────────────────────────────

  /**
   * Called by dashboard.js initSettings() when the user changes a setting toggle
   * in the global Settings view. Keeps the plugin's in-memory _settings in sync.
   * @param {string} key   - the settings key (e.g. 'saveSearchHistory')
   * @param {*}      value - the new value
   */
  function _onSettingChanged(key, value) {
    if (key in _settings) {
      _settings[key] = value;
    }
  }

  /**
   * Called by dashboard.js initSettings() when the user clicks the Refresh button
   * in the global Settings panel. Delegates to the shared _doRefresh() path.
   */
  function _doRefreshFromSettings() {
    if (!_rendered) return;
    _doRefresh(null);
  }

  /**
   * init() - called once at startup. Bind widget button only (no async I/O).
   * Async data load is deferred to onNavigate() as per the lazy-init pattern.
   */
  function init() {
    // Bind the dashboard widget open button
    const widgetBtn = document.getElementById('adf-widget-open-btn');
    if (widgetBtn) {
      widgetBtn.addEventListener('click', () => {
        app()?.navigateTo?.('plugin-apptio-docs-finder');
      });
    }
    app()?.addLog?.('info', PLUGIN_ID, 'Apptio Documentation Finder initialized');
  }

  /**
   * onNavigate() - called when user navigates to this plugin view.
   * Performs storage migration and loads data, then renders.
   */
  async function onNavigate() {
    const container = document.getElementById('adf-docs-container');
    if (!container) return;

    // Run storage migration once (idempotent)
    await _migrateStorage();

    // Load plugin settings
    _settings = await _getSettings();

    if (!_rendered) {
      // Load sources/quick-links from storage (falls back to DEFAULT_SOURCES /
      // DEFAULT_QUICK_LINKS automatically when storage is empty - no live fetch
      // required before the main UI can appear).
      [_sources, _quickLinks] = await Promise.all([_getSources(), _getQuickLinks()]);
      _renderMainUI(container);
      _rendered = true;

      // Attempt a background refresh the first time the view is opened so the
      // category list stays current - but never block or replace the main UI.
      const lastRefresh = await _getLastRefresh();
      if (!lastRefresh) {
        _doRefresh(null).catch(() => {});
      }
    } else {
      // Return visit - reset any open overlay, go to Search tab, refresh state.
      if (_overlay) _closeOverlay();
      if (_activeTab !== 'search') _showTab('search');
      _refreshFavsBadge();
    }
  }

  /**
   * render() - called when user re-navigates to this view after it was rendered.
   * Delegates to onNavigate for simplicity.
   */
  async function render() {
    await onNavigate();
  }

  // ── Self-register ─────────────────────────────────────────────────────────────

  window.ReplyCatorsPlugins                    = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.ApptioDocsFinder   = plugin;

})();
