/**
 * Jira & Confluence Smart Search Hub - ReplyCators Plugin
 * v1.0.0
 *
 * Unified smart-search and navigation hub for Jira and Confluence.
 * Detects input type automatically (issue key, full URL, Confluence path,
 * or generic search phrase) and offers context-aware action buttons.
 * Maintains separate recent-history lists for Jira and Confluence.
 *
 * Plugin ID:  com.replycators.jira-confluence-hub
 * View ID:    plugin-jira-confluence-hub
 * Category:   apptione
 *
 * Storage keys (all chrome.storage.local):
 *   rc:plugin:com.replycators.jira-confluence-hub:settings
 *   rc:plugin:com.replycators.jira-confluence-hub:jira-recents
 *   rc:plugin:com.replycators.jira-confluence-hub:confluence-recents
 */

(function () {
  'use strict';

  const PLUGIN_ID   = 'com.replycators.jira-confluence-hub';
  const MAX_RECENTS = 20;

  const STORE = {
    SETTINGS:          'rc:plugin:' + PLUGIN_ID + ':settings',
    JIRA_RECENTS:      'rc:plugin:' + PLUGIN_ID + ':jira-recents',
    CONFLUENCE_RECENTS:'rc:plugin:' + PLUGIN_ID + ':confluence-recents',
  };

  const DEFAULT_SETTINGS = {
    jiraBaseUrl:      'https://apptio.atlassian.net',
    confluenceBaseUrl:'https://apptio.atlassian.net/wiki',
    recentLimit:      10,
    openIn:           'new-tab',
  };

  // ── Input type detectors ─────────────────────────────────────────────────────

  /** Matches Jira issue keys: PROJECT-12345 */
  const ISSUE_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

  function detectInputType(raw) {
    const v = (raw || '').trim();
    if (!v) return 'empty';
    if (/^https?:\/\//i.test(v)) {
      if (/atlassian\.net\/wiki/i.test(v)) return 'confluence-url';
      if (/atlassian\.net\/browse\//i.test(v)) return 'jira-url';
      return 'generic-url';
    }
    if (ISSUE_KEY_RE.test(v)) return 'issue-key';
    // Confluence path: SPACE/pages/ID/Title or similar
    if (/^[A-Za-z0-9]+\/pages\/\d+\//i.test(v)) return 'confluence-path';
    return 'search-phrase';
  }

  // ── Storage helpers ──────────────────────────────────────────────────────────

  function _set(data) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.set(data, function () {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        resolve();
      });
    });
  }

  function _get(keys) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get(keys, function (result) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        resolve(result);
      });
    });
  }

  async function _loadSettings() {
    const r = await _get([STORE.SETTINGS]);
    return Object.assign({}, DEFAULT_SETTINGS, r[STORE.SETTINGS] || {});
  }

  async function _saveSettings(s) {
    await _set({ [STORE.SETTINGS]: s });
  }

  async function _loadRecents(key, limit) {
    const r = await _get([key]);
    return (r[key] || []).slice(0, limit || MAX_RECENTS);
  }

  async function _pushRecent(key, entry, limit) {
    const cur = await _loadRecents(key, MAX_RECENTS);
    const deduped = cur.filter(function (e) { return e.url !== entry.url; });
    const updated = [Object.assign({}, entry, { openedAt: new Date().toISOString() })].concat(deduped).slice(0, limit || MAX_RECENTS);
    await _set({ [key]: updated });
    return updated;
  }

  async function _clearRecents(key) {
    await _set({ [key]: [] });
  }

  // ── URL builders ─────────────────────────────────────────────────────────────

  function buildJiraIssueUrl(base, issueKey) {
    return base.replace(/\/+$/, '') + '/browse/' + encodeURIComponent(issueKey.trim().toUpperCase());
  }

  function buildJiraSearchUrl(base, query) {
    return base.replace(/\/+$/, '') + '/issues/?jql=textfields+~+%22' + encodeURIComponent(query.trim()) + '%2A%22';
  }

  function buildConfluencePageUrl(base, path) {
    return base.replace(/\/+$/, '') + '/' + path.replace(/^\//, '');
  }

  function buildConfluenceSearchUrl(base, query) {
    return base.replace(/\/+$/, '') + '/search?text=' + encodeURIComponent(query.trim());
  }

  function buildJiraDashboardUrl(base) {
    return base.replace(/\/+$/, '') + '/jira/for-you?tab=assigned';
  }

  function buildConfluenceHomeUrl(base) {
    return base.replace(/\/+$/, '') + '/home';
  }

  // ── Tab opener ───────────────────────────────────────────────────────────────

  function _openUrl(url, openIn) {
    if (openIn === 'current-tab') {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url: url });
        } else {
          chrome.tabs.create({ url: url, active: true });
        }
      });
    } else {
      chrome.tabs.create({ url: url, active: true });
    }
  }

  // ── Plugin state ─────────────────────────────────────────────────────────────

  let _settings      = Object.assign({}, DEFAULT_SETTINGS);
  let _jiraRecents   = [];
  let _confRecents   = [];
  let _activeTab     = 'jira'; // 'jira' | 'confluence'
  let _rendered      = false;

  function app() { return window.ReplyCatorsApp; }

  // ── Main render ──────────────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('jch-container');
    if (!container) return;

    container.innerHTML = _buildHtml();
    _rendered = true;
    _bindEvents(container);
  }

  function _buildHtml() {
    const s = _settings;
    return `
      <div class="jch-body" id="jch-body">

        <!-- Search hero -->
        <div class="jch-search-hero">
          <div class="jch-search-row">
            <input
              id="jch-input"
              type="text"
              class="rc-input jch-search-input"
              placeholder="Issue key, URL, Confluence path, or search phrase..."
              autocomplete="off"
              spellcheck="false"
              title="Enter a Jira issue key (VAN-46375), a Jira or Confluence URL, a Confluence path, or any search phrase"
            />
            <button id="jch-clear-input" class="rc-btn rc-btn--ghost rc-btn--sm jch-clear-btn"
                    title="Clear search input" aria-label="Clear search input">&#10005;</button>
          </div>
          <div id="jch-type-badge" class="jch-type-hint"></div>
        </div>

        <!-- Action buttons -->
        <div id="jch-actions" class="jch-actions rc-plugin-action-bar">
          <button id="jch-btn-open-jira" class="rc-btn rc-btn--primary rc-btn--sm" hidden
                  title="Open Jira issue">Open Jira Issue</button>
          <button id="jch-btn-search-jira" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Search Jira with this query">Search Jira</button>
          <button id="jch-btn-open-confluence" class="rc-btn rc-btn--secondary rc-btn--sm" hidden
                  title="Open Confluence page">Open Confluence Page</button>
          <button id="jch-btn-search-confluence" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Search Confluence with this query">Search Confluence</button>
        </div>

        <!-- Quick links -->
        <div class="jch-quick-links">
          <span class="jch-quick-label">Quick:</span>
          <button id="jch-btn-jira-dashboard" class="rc-btn rc-btn--ghost rc-btn--sm"
                  title="Open Jira - My Work dashboard (assigned issues)">Jira Dashboard</button>
          <button id="jch-btn-confluence-home" class="rc-btn rc-btn--ghost rc-btn--sm"
                  title="Open Confluence home">Confluence Home</button>
        </div>

        <!-- Recent items - tabs -->
        <div class="jch-recents-section">
          <div class="rc-plugin-tabs" role="tablist" aria-label="Recent items">
            <button id="jch-tab-jira" class="rc-plugin-tab rc-plugin-tab--active" role="tab"
                    aria-selected="true" aria-controls="jch-panel-jira">Jira Recents</button>
            <button id="jch-tab-confluence" class="rc-plugin-tab" role="tab"
                    aria-selected="false" aria-controls="jch-panel-confluence">Confluence Recents</button>
          </div>

          <div id="jch-panel-jira" class="jch-recents-panel" role="tabpanel" aria-labelledby="jch-tab-jira">
            ${_buildRecentsList(_jiraRecents, _settings.recentLimit, 'jira')}
          </div>
          <div id="jch-panel-confluence" class="jch-recents-panel" role="tabpanel" aria-labelledby="jch-tab-confluence" hidden>
            ${_buildRecentsList(_confRecents, _settings.recentLimit, 'confluence')}
          </div>
        </div>

      </div>
    `;
  }

  function _buildRecentsList(items, limit, type) {
    const shown = items.slice(0, limit || _settings.recentLimit);
    if (!shown.length) {
      return `<div class="rc-plugin-empty rc-plugin-empty--compact">
        <div class="rc-plugin-empty__title">No recent ${type === 'jira' ? 'Jira' : 'Confluence'} items yet.</div>
        <div class="rc-plugin-empty__body">Items you open will appear here.</div>
      </div>`;
    }
    return `<div class="rc-plugin-list jch-recents-list">` +
      shown.map(function (item, i) {
        const label = item.label || item.url;
        const esc   = app() ? app().esc(label) : label.replace(/</g, '&lt;');
        const escUrl = app() ? app().esc(item.url) : item.url.replace(/</g, '&lt;');
        return `<div class="rc-plugin-list-item" role="button" tabindex="0"
                     data-url="${escUrl}" data-recent-type="${type}" data-recent-idx="${i}"
                     title="Open: ${esc}">
          <span class="rc-plugin-list-item__title">${esc}</span>
          <button class="rc-btn rc-btn--ghost rc-btn--sm jch-copy-url" data-url="${escUrl}"
                  title="Copy URL" tabindex="-1" aria-label="Copy URL">&#10073;</button>
        </div>`;
      }).join('') +
      `</div>
      <div class="jch-recents-footer">
        <button class="rc-btn rc-btn--ghost rc-btn--sm jch-clear-recents" data-type="${type}"
                title="Clear ${type === 'jira' ? 'Jira' : 'Confluence'} recent history">Clear History</button>
      </div>`;
  }

  // ── Event binding ────────────────────────────────────────────────────────────

  function _bindEvents(container) {
    const input        = container.querySelector('#jch-input');
    const clearInputBtn= container.querySelector('#jch-clear-input');
    const typeBadge    = container.querySelector('#jch-type-badge');
    const btnOpenJira  = container.querySelector('#jch-btn-open-jira');
    const btnSearchJira= container.querySelector('#jch-btn-search-jira');
    const btnOpenConf  = container.querySelector('#jch-btn-open-confluence');
    const btnSearchConf= container.querySelector('#jch-btn-search-confluence');
    const btnJiraDash  = container.querySelector('#jch-btn-jira-dashboard');
    const btnConfHome  = container.querySelector('#jch-btn-confluence-home');
    const tabJira      = container.querySelector('#jch-tab-jira');
    const tabConf      = container.querySelector('#jch-tab-confluence');
    const panelJira    = container.querySelector('#jch-panel-jira');
    const panelConf    = container.querySelector('#jch-panel-confluence');

    // Input live update
    let _inputTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(_inputTimer);
      _inputTimer = setTimeout(function () { _updateActions(input, typeBadge, btnOpenJira, btnSearchJira, btnOpenConf, btnSearchConf); }, 120);
    });

    // Enter triggers primary action
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const type = detectInputType(input.value);
      _triggerPrimary(input.value, type);
    });

    clearInputBtn.addEventListener('click', function () {
      input.value = '';
      typeBadge.textContent = '';
      btnOpenJira.style.display = 'none';
      btnOpenConf.style.display = 'none';
      input.focus();
    });

    // Action buttons
    btnOpenJira.addEventListener('click', function () {
      const v = input.value.trim();
      const type = detectInputType(v);
      _handleOpenJira(v, type);
    });

    btnSearchJira.addEventListener('click', function () {
      const v = input.value.trim();
      if (!v) { _openAndRecord(buildJiraDashboardUrl(_settings.jiraBaseUrl), 'Jira Dashboard', 'jira'); return; }
      _openAndRecord(buildJiraSearchUrl(_settings.jiraBaseUrl, v), 'Search: ' + v, 'jira');
    });

    btnOpenConf.addEventListener('click', function () {
      const v = input.value.trim();
      const type = detectInputType(v);
      _handleOpenConfluence(v, type);
    });

    btnSearchConf.addEventListener('click', function () {
      const v = input.value.trim();
      if (!v) { _openAndRecord(buildConfluenceHomeUrl(_settings.confluenceBaseUrl), 'Confluence Home', 'confluence'); return; }
      _openAndRecord(buildConfluenceSearchUrl(_settings.confluenceBaseUrl, v), 'Search: ' + v, 'confluence');
    });

    // Quick links
    btnJiraDash.addEventListener('click', function () {
      _openAndRecord(buildJiraDashboardUrl(_settings.jiraBaseUrl), 'Jira Dashboard', 'jira');
    });

    btnConfHome.addEventListener('click', function () {
      _openAndRecord(buildConfluenceHomeUrl(_settings.confluenceBaseUrl), 'Confluence Home', 'confluence');
    });

    // Tab switching
    tabJira.addEventListener('click', function () {
      _setTab('jira', tabJira, tabConf, panelJira, panelConf);
    });
    tabConf.addEventListener('click', function () {
      _setTab('confluence', tabJira, tabConf, panelJira, panelConf);
    });

    // Recents list - delegated
    container.addEventListener('click', function (e) {
      const copyBtn = e.target.closest('.jch-copy-url');
      if (copyBtn) {
        e.stopPropagation();
        navigator.clipboard.writeText(copyBtn.dataset.url).then(function () {
          app().addNotification('Jira & Confluence Hub', 'URL copied to clipboard.', 'success', PLUGIN_ID);
        }).catch(function (err) {
          app().addLog('error', PLUGIN_ID, 'Clipboard write failed: ' + String(err));
        });
        return;
      }
      const clearBtn = e.target.closest('.jch-clear-recents');
      if (clearBtn) {
        const t = clearBtn.dataset.type;
        _doClearRecents(t, panelJira, panelConf);
        return;
      }
      const row = e.target.closest('.rc-plugin-list-item[data-url]');
      if (row && row.dataset.url) {
        const rType = row.dataset.recentType;
        _openAndRecord(row.dataset.url, row.querySelector('span').textContent, rType);
      }
    });

    container.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.rc-plugin-list-item[data-url]');
      if (row && row.dataset.url) {
        e.preventDefault();
        _openAndRecord(row.dataset.url, row.querySelector('span').textContent, row.dataset.recentType);
      }
    });

    // Initial state
    _updateActions(input, typeBadge, btnOpenJira, btnSearchJira, btnOpenConf, btnSearchConf);
  }

  function _setTab(name, tabJira, tabConf, panelJira, panelConf) {
    _activeTab = name;
    const isJira = name === 'jira';
    tabJira.classList.toggle('rc-plugin-tab--active', isJira);
    tabConf.classList.toggle('rc-plugin-tab--active', !isJira);
    tabJira.setAttribute('aria-selected', String(isJira));
    tabConf.setAttribute('aria-selected', String(!isJira));
    if (isJira) { panelJira.removeAttribute('hidden'); panelConf.setAttribute('hidden', ''); }
    else        { panelConf.removeAttribute('hidden'); panelJira.setAttribute('hidden', ''); }
  }

  function _updateActions(input, typeBadge, btnOpenJira, btnSearchJira, btnOpenConf, btnSearchConf) {
    const v = (input.value || '').trim();
    const type = detectInputType(v);
    const labels = {
      'empty':          '',
      'issue-key':      'Jira issue key detected',
      'jira-url':       'Jira URL detected',
      'confluence-url': 'Confluence URL detected',
      'confluence-path':'Confluence path detected',
      'generic-url':    'URL detected - will search',
      'search-phrase':  'Search phrase',
    };
    typeBadge.textContent = v ? (labels[type] || '') : '';

    // Primary action visibility
    const showOpenJira = (type === 'issue-key' || type === 'jira-url');
    const showOpenConf = (type === 'confluence-url' || type === 'confluence-path');
    btnOpenJira.style.display = showOpenJira ? '' : 'none';
    btnOpenConf.style.display = showOpenConf ? '' : 'none';

    // Relabel Search buttons when relevant
    btnSearchJira.textContent  = (type === 'issue-key') ? 'Search Jira for ' + v : 'Search Jira';
    btnSearchConf.textContent  = (type === 'issue-key') ? 'Search Confluence for ' + v : 'Search Confluence';
  }

  function _triggerPrimary(v, type) {
    switch (type) {
      case 'issue-key':       _handleOpenJira(v, type);      break;
      case 'jira-url':        _handleOpenJira(v, type);      break;
      case 'confluence-url':  _handleOpenConfluence(v, type); break;
      case 'confluence-path': _handleOpenConfluence(v, type); break;
      default:
        // Generic: search Jira by default
        if (v) _openAndRecord(buildJiraSearchUrl(_settings.jiraBaseUrl, v), 'Search: ' + v, 'jira');
        break;
    }
  }

  function _handleOpenJira(v, type) {
    if (!v) return;
    let url, label;
    if (type === 'issue-key') {
      url   = buildJiraIssueUrl(_settings.jiraBaseUrl, v);
      label = v.toUpperCase();
    } else {
      url   = v;
      label = v;
    }
    _openAndRecord(url, label, 'jira');
  }

  function _handleOpenConfluence(v, type) {
    if (!v) return;
    let url, label;
    if (type === 'confluence-path') {
      url   = buildConfluencePageUrl(_settings.confluenceBaseUrl, v);
      label = v;
    } else {
      url   = v;
      label = v;
    }
    _openAndRecord(url, label, 'confluence');
  }

  function _openAndRecord(url, label, recordType) {
    _openUrl(url, _settings.openIn);
    app().addLog('info', PLUGIN_ID, 'Opened ' + recordType + ': ' + url);
    const key = recordType === 'jira' ? STORE.JIRA_RECENTS : STORE.CONFLUENCE_RECENTS;
    _pushRecent(key, { url: url, label: label }, _settings.recentLimit).then(function (updated) {
      if (recordType === 'jira') {
        _jiraRecents = updated;
        const panel = document.getElementById('jch-panel-jira');
        if (panel) panel.innerHTML = _buildRecentsList(_jiraRecents, _settings.recentLimit, 'jira');
      } else {
        _confRecents = updated;
        const panel = document.getElementById('jch-panel-confluence');
        if (panel) panel.innerHTML = _buildRecentsList(_confRecents, _settings.recentLimit, 'confluence');
      }
    }).catch(function (err) {
      app().addLog('error', PLUGIN_ID, 'Failed to save recent: ' + String(err));
    });
  }

  function _doClearRecents(type, panelJira, panelConf) {
    const key = type === 'jira' ? STORE.JIRA_RECENTS : STORE.CONFLUENCE_RECENTS;
    _clearRecents(key).then(function () {
      if (type === 'jira') {
        _jiraRecents = [];
        if (panelJira) panelJira.innerHTML = _buildRecentsList([], _settings.recentLimit, 'jira');
      } else {
        _confRecents = [];
        if (panelConf) panelConf.innerHTML = _buildRecentsList([], _settings.recentLimit, 'confluence');
      }
      app().addNotification('Jira & Confluence Hub', (type === 'jira' ? 'Jira' : 'Confluence') + ' recent history cleared.', 'success', PLUGIN_ID);
      app().addLog('info', PLUGIN_ID, type + ' recents cleared');
    }).catch(function (err) {
      app().addLog('error', PLUGIN_ID, 'Clear recents failed: ' + String(err));
    });
  }

  // ── Settings helpers (called by dashboard.js applySettings/bindSettings hooks) ──

  function _onSettingChanged() {
    const jiraEl = document.getElementById('jch-settings-jira-url');
    const confEl = document.getElementById('jch-settings-conf-url');
    const limEl  = document.getElementById('jch-settings-recent-limit');
    const openEl = document.getElementById('jch-settings-open-in');
    if (jiraEl) _settings.jiraBaseUrl      = jiraEl.value.trim() || DEFAULT_SETTINGS.jiraBaseUrl;
    if (confEl) _settings.confluenceBaseUrl= confEl.value.trim() || DEFAULT_SETTINGS.confluenceBaseUrl;
    if (limEl)  _settings.recentLimit      = parseInt(limEl.value, 10) || DEFAULT_SETTINGS.recentLimit;
    if (openEl) _settings.openIn           = openEl.value || DEFAULT_SETTINGS.openIn;
    _saveSettings(_settings).then(function () {
      app().addLog('info', PLUGIN_ID, 'Settings saved');
    }).catch(function (err) {
      app().addLog('error', PLUGIN_ID, 'Settings save failed: ' + String(err));
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  function init() {
    // Wire widget open button
    document.getElementById('jch-widget-open-btn')?.addEventListener('click', function () {
      app().navigateTo('plugin-jira-confluence-hub');
    });
    // Wire widget Jira dashboard quick-open button
    document.getElementById('jch-widget-jira-btn')?.addEventListener('click', function () {
      chrome.tabs.create({ url: buildJiraDashboardUrl(_settings.jiraBaseUrl), active: true });
      app().addLog('info', PLUGIN_ID, 'Widget: opened Jira Dashboard');
    });
    // Wire settings change listeners
    ['jch-settings-jira-url','jch-settings-conf-url','jch-settings-recent-limit','jch-settings-open-in'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', _onSettingChanged);
    });
    app().addLog('info', PLUGIN_ID, 'Jira & Confluence Smart Search Hub initialised');
  }

  function onNavigate() {
    app().addLog('info', PLUGIN_ID, 'Jira & Confluence Hub opened');
    Promise.all([
      _loadSettings(),
      _loadRecents(STORE.JIRA_RECENTS, MAX_RECENTS),
      _loadRecents(STORE.CONFLUENCE_RECENTS, MAX_RECENTS),
    ]).then(function (results) {
      _settings    = results[0];
      _jiraRecents = results[1];
      _confRecents = results[2];
      render();
    }).catch(function (err) {
      app().addLog('error', PLUGIN_ID, 'Failed to load data on navigate: ' + String(err));
      render(); // render with defaults
    });
  }

  // ── Self-registration ─────────────────────────────────────────────────────────

  const plugin = {
    id: PLUGIN_ID,
    init,
    onNavigate,
    _onSettingChanged,
  };

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.JiraConfluenceHub = plugin;

})();
