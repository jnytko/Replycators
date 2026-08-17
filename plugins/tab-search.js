(function() {
  'use strict';

  const plugin = {
    id: 'com.replycators.tab-search',
    render,
    init,
  };

  function app() { return window.ReplyCatorsApp; }

  // ─── Tab data helpers ─────────────────────────────────────────────────────

  function getHostname(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function getAllTabs() {
    return new Promise(resolve => {
      chrome.tabs.query({}, tabs => resolve(tabs || []));
    });
  }

  function findDuplicates(tabs) {
    const urlCounts = {};
    tabs.forEach(t => {
      if (t.url) urlCounts[t.url] = (urlCounts[t.url] || 0) + 1;
    });
    return urlCounts;
  }

  function buildStats(tabs) {
    const urlCounts = findDuplicates(tabs);
    const duplicateUrls = new Set(Object.keys(urlCounts).filter(u => urlCounts[u] > 1));
    const uniqueDomains = new Set(tabs.map(t => getHostname(t.url)).filter(Boolean));
    return {
      total: tabs.length,
      active: tabs.filter(t => t.active).length,
      duplicates: tabs.filter(t => duplicateUrls.has(t.url)).length,
      uniqueDomains: uniqueDomains.size,
    };
  }

  function scoreTabRecentActivity(tab) {
    // Edge/Chrome expose lastAccessed on tab objects (MV3)
    return tab.lastAccessed || 0;
  }

  function sortTabs(tabs, sortBy) {
    const copy = tabs.slice();
    if (sortBy === 'title') {
      copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'domain') {
      copy.sort((a, b) => getHostname(a.url || '').localeCompare(getHostname(b.url || '')));
    } else if (sortBy === 'recent') {
      copy.sort((a, b) => scoreTabRecentActivity(b) - scoreTabRecentActivity(a));
    }
    // default: natural (browser order)
    return copy;
  }

  function filterTabs(tabs, query) {
    if (!query.trim()) return tabs;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return tabs.filter(tab => {
      const haystack = [
        (tab.title || '').toLowerCase(),
        (tab.url || '').toLowerCase(),
        getHostname(tab.url || '').toLowerCase(),
      ].join(' ');
      return terms.every(t => haystack.includes(t));
    });
  }

  function groupByHostname(tabs) {
    const groups = {};
    tabs.forEach(tab => {
      const host = getHostname(tab.url || '') || '(no domain)';
      (groups[host] = groups[host] || []).push(tab);
    });
    return groups;
  }

  // ─── HTML ─────────────────────────────────────────────────────────────────

  function getHTML() {
    return `
      <div id="ts-stats-bar" style="display:none;margin-bottom:12px;background:var(--rc-surface);border:1px solid var(--rc-border);border-radius:6px;padding:10px 12px;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:12px;">
          <span id="ts-stat-total"   title="Total open tabs across all windows">0 tabs</span>
          <span id="ts-stat-active"  title="Currently active tabs (one per window)">0 active</span>
          <span id="ts-stat-dupes"   title="Tabs sharing a URL with at least one other tab" style="display:none;"></span>
          <span id="ts-stat-domains" title="Number of unique domains across all tabs">0 domains</span>
          <div style="flex:1;"></div>
          <button id="ts-refresh-btn" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Re-scan all open tabs to reflect the current browser state">Refresh</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input type="text" id="ts-search" class="rc-input"
               placeholder="Search by title, URL, or domain…"
               autocomplete="off" spellcheck="false"
               title="Filter tabs instantly - matches title, full URL, and hostname" style="flex:1;" />
        <select id="ts-sort" class="rc-input rc-input--sm" style="max-width:140px;"
                title="Choose the order tabs are displayed">
          <option value="natural">Browser Order</option>
          <option value="title">Sort by Title</option>
          <option value="domain">Sort by Domain</option>
          <option value="recent">Recently Active</option>
        </select>
        <select id="ts-group-mode" class="rc-input rc-input--sm" style="max-width:140px;"
                title="Group tabs by hostname, or show a flat list">
          <option value="flat">Flat List</option>
          <option value="grouped">Group by Domain</option>
        </select>
      </div>

      <div id="ts-results-meta" style="font-size:11px;color:var(--rc-text-muted);margin-bottom:6px;"></div>
      <div id="ts-loading" class="rc-status rc-status--neutral" style="display:none;">${window.ReplyCatorsIconHelper ? window.ReplyCatorsIconHelper.renderIcon('states.loading',{size:14,decorative:true}) : ''} Loading tabs…</div>
      <div id="ts-results" style="max-height:420px;overflow-y:auto;"></div>`;
  }

  // ─── Render a single tab row ──────────────────────────────────────────────

  function renderTabRow(tab, urlCounts) {
    const isDuplicate = (urlCounts[tab.url] || 0) > 1;
    const hostname    = getHostname(tab.url || '');
    const faviconSrc  = tab.favIconUrl
      ? app().esc(tab.favIconUrl)
      : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="%23666"/></svg>';

    const activeIndicator = tab.active
      ? '<span title="This tab is currently active" style="color:var(--rc-success,#22c55e);font-size:10px;font-weight:700;margin-left:4px;">● ACTIVE</span>'
      : '';

    const dupeIndicator = isDuplicate
      ? '<span class="bm-duplicate-badge" title="Duplicate URL - another open tab shares this address">duplicate</span>'
      : '';

    const windowInfo = tab.windowId
      ? `<span title="Window ID ${tab.windowId}" style="font-size:10px;color:var(--rc-text-muted);margin-left:4px;">[Win ${tab.windowId}]</span>`
      : '';

    const titleText = tab.title || '(untitled)';
    const urlText   = tab.url   || '';

    return `<div class="ts-tab-row${tab.active ? ' ts-tab-row--active' : ''}"
                 role="button" tabindex="0"
                 data-tab-id="${tab.id}"
                 data-window-id="${tab.windowId || ''}"
                 title="Switch to: ${app().esc(titleText)}">
      <div class="ts-tab-inner">
        <img class="ts-tab-favicon" src="${faviconSrc}"
             alt="" aria-hidden="true"
             onerror="this.style.display='none'" />
        <div class="ts-tab-body">
          <div class="ts-tab-title" title="${app().esc(titleText)}">
            ${app().esc(titleText)}${activeIndicator}${dupeIndicator}${windowInfo}
          </div>
          <div class="ts-tab-url" title="${app().esc(urlText)}">${app().esc(urlText)}</div>
        </div>
        <div class="ts-tab-actions">
          <button class="rc-btn rc-btn--ghost rc-btn--sm ts-action-switch"
                  data-tab-id="${tab.id}" data-window-id="${tab.windowId || ''}"
                  title="Switch to this tab" tabindex="-1">↗</button>
          <button class="rc-btn rc-btn--ghost rc-btn--sm ts-action-copy-url"
                  data-url="${app().esc(urlText)}"
                  title="Copy URL to clipboard" tabindex="-1" aria-label="Copy URL">⧉</button>
          <button class="rc-btn rc-btn--ghost rc-btn--sm ts-action-copy-title"
                  data-title="${app().esc(titleText)}"
                  title="Copy page title to clipboard" tabindex="-1" aria-label="Copy title">T</button>
          <button class="rc-btn rc-btn--ghost rc-btn--sm ts-action-new-window"
                  data-url="${app().esc(urlText)}"
                  title="Open this tab in a new window" aria-label="Open this tab in a new window" tabindex="-1">↗</button>
          <button class="rc-btn rc-btn--ghost rc-btn--sm ts-action-close"
                  data-tab-id="${tab.id}"
                  title="Close this tab" aria-label="Close this tab" tabindex="-1">×</button>
        </div>
      </div>
    </div>`;
  }

  // ─── Render results ───────────────────────────────────────────────────────

  function renderResults(container, allTabs, query, sortBy, groupMode) {
    const resultsEl  = container.querySelector('#ts-results');
    const metaEl     = container.querySelector('#ts-results-meta');
    const statsBar   = container.querySelector('#ts-stats-bar');
    const statTotal  = container.querySelector('#ts-stat-total');
    const statActive = container.querySelector('#ts-stat-active');
    const statDupes  = container.querySelector('#ts-stat-dupes');
    const statDoms   = container.querySelector('#ts-stat-domains');

    // Stats
    const stats = buildStats(allTabs);
    statsBar.style.display = 'block';
    statTotal.textContent  = `${stats.total} tab${stats.total !== 1 ? 's' : ''}`;
    statActive.textContent = `${stats.active} active`;
    statDoms.textContent   = `${stats.uniqueDomains} domain${stats.uniqueDomains !== 1 ? 's' : ''}`;
    if (stats.duplicates > 0) {
      statDupes.textContent = `${stats.duplicates} duplicate${stats.duplicates !== 1 ? 's' : ''}`;
      statDupes.style.display = 'inline';
    } else {
      statDupes.style.display = 'none';
    }

    const urlCounts = findDuplicates(allTabs);
    const filtered  = filterTabs(allTabs, query);
    const sorted    = sortTabs(filtered, sortBy);

    // Results count
    metaEl.textContent = query
      ? `${sorted.length} result${sorted.length !== 1 ? 's' : ''} for "${query}"`
      : `${sorted.length} tab${sorted.length !== 1 ? 's' : ''}`;

    if (sorted.length === 0) {
      resultsEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--rc-text-muted);">No matching tabs.</div>';
      return;
    }

    let html = '';

    if (groupMode === 'grouped') {
      const groups = groupByHostname(sorted);
      for (const [host, tabs] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
        html += `<div class="ts-group-header" title="Domain: ${app().esc(host)}">
          <span class="ts-group-label">${app().esc(host)}</span>
          <span class="ts-group-count">${tabs.length} tab${tabs.length !== 1 ? 's' : ''}</span>
        </div>`;
        html += tabs.map(t => renderTabRow(t, urlCounts)).join('');
      }
    } else {
      html = sorted.map(t => renderTabRow(t, urlCounts)).join('');
    }

    resultsEl.innerHTML = html;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  function switchToTab(tabId, windowId) {
    const id = parseInt(tabId, 10);
    const wid = parseInt(windowId, 10);
    if (!isNaN(wid) && wid > 0) {
      chrome.windows.update(wid, { focused: true }, () => {
        chrome.tabs.update(id, { active: true }, () => {
          app().addLog('info', plugin.id, 'Switched to tab ' + id);
        });
      });
    } else {
      chrome.tabs.update(id, { active: true }, () => {
        app().addLog('info', plugin.id, 'Switched to tab ' + id);
      });
    }
  }

  function closeTab(tabId) {
    const id = parseInt(tabId, 10);
    chrome.tabs.remove(id, () => {
      app().addLog('info', plugin.id, 'Closed tab ' + id);
    });
  }

  function openInNewWindow(url) {
    chrome.windows.create({ url, focused: true }, () => {
      app().addLog('info', plugin.id, 'Opened in new window: ' + url);
    });
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      app().addNotification('Tab Search', 'Copied ' + label + ' to clipboard', 'success', plugin.id);
      app().addLog('info', plugin.id, 'Copied ' + label);
    }).catch(err => {
      app().addLog('error', plugin.id, 'Clipboard write failed: ' + err);
      app().addNotification('Tab Search', 'Clipboard write failed.', 'error', plugin.id);
    });
  }

  // ─── render() - called by dashboard.js on navigate ───────────────────────

  function render(containerOrEl) {
    const container = containerOrEl || document.getElementById('ts-plugin-container');
    if (!container) return;
    container.innerHTML = getHTML();
    bindEvents(container);
  }

  // ─── bindEvents ──────────────────────────────────────────────────────────

  function bindEvents(container) {
    let allTabs = [];
    let query    = '';
    let sortBy   = 'natural';
    let groupMode = 'flat';

    const searchEl    = container.querySelector('#ts-search');
    const sortEl      = container.querySelector('#ts-sort');
    const groupEl     = container.querySelector('#ts-group-mode');
    const loadingEl   = container.querySelector('#ts-loading');
    const refreshBtn  = container.querySelector('#ts-refresh-btn');
    const resultsEl   = container.querySelector('#ts-results');

    function loadAndRender() {
      loadingEl.style.display = 'block';
      resultsEl.innerHTML = '';
      getAllTabs().then(tabs => {
        allTabs = tabs;
        loadingEl.style.display = 'none';
        renderResults(container, allTabs, query, sortBy, groupMode);
        app().addLog('info', plugin.id, 'Loaded ' + tabs.length + ' tabs');
      });
    }

    // Initial load
    loadAndRender();

    // Search - instant filter (no debounce needed; array filter is O(n) on in-memory data)
    searchEl.addEventListener('input', () => {
      query = searchEl.value;
      renderResults(container, allTabs, query, sortBy, groupMode);
    });

    sortEl.addEventListener('change', () => {
      sortBy = sortEl.value;
      renderResults(container, allTabs, query, sortBy, groupMode);
    });

    groupEl.addEventListener('change', () => {
      groupMode = groupEl.value;
      renderResults(container, allTabs, query, sortBy, groupMode);
    });

    refreshBtn.addEventListener('click', () => {
      loadAndRender();
    });

    // Delegated event handling for tab rows and action buttons
    resultsEl.addEventListener('click', e => {
      // Action buttons - check most specific targets first
      const switchBtn = e.target.closest('.ts-action-switch');
      if (switchBtn) {
        e.stopPropagation();
        switchToTab(switchBtn.dataset.tabId, switchBtn.dataset.windowId);
        return;
      }
      const copyUrlBtn = e.target.closest('.ts-action-copy-url');
      if (copyUrlBtn) {
        e.stopPropagation();
        copyToClipboard(copyUrlBtn.dataset.url, 'URL');
        return;
      }
      const copyTitleBtn = e.target.closest('.ts-action-copy-title');
      if (copyTitleBtn) {
        e.stopPropagation();
        copyToClipboard(copyTitleBtn.dataset.title, 'title');
        return;
      }
      const newWindowBtn = e.target.closest('.ts-action-new-window');
      if (newWindowBtn) {
        e.stopPropagation();
        openInNewWindow(newWindowBtn.dataset.url);
        return;
      }
      const closeBtn = e.target.closest('.ts-action-close');
      if (closeBtn) {
        e.stopPropagation();
        const tabId = closeBtn.dataset.tabId;
        // Remove row immediately for instant feedback, then close
        const row = closeBtn.closest('.ts-tab-row');
        if (row) row.remove();
        allTabs = allTabs.filter(t => String(t.id) !== String(tabId));
        renderResults(container, allTabs, query, sortBy, groupMode);
        closeTab(tabId);
        return;
      }
      // Click on row body - switch to tab
      const row = e.target.closest('.ts-tab-row');
      if (row) {
        switchToTab(row.dataset.tabId, row.dataset.windowId);
      }
    });

    // Keyboard: Enter on a row switches to tab
    resultsEl.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.ts-tab-row');
      if (row) { e.preventDefault(); switchToTab(row.dataset.tabId, row.dataset.windowId); }
    });
  }

  // ─── init() - called once by dashboard.js on startup ─────────────────────

  function init() {
    app().addLog('info', plugin.id, 'Tab Search ready');
    document.getElementById('ts-widget-open-btn')?.addEventListener('click', () => {
      app().navigateTo('plugin-tab-search');
    });
  }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.TabSearch = plugin;
})();
