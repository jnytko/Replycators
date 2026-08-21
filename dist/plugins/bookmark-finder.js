(function() {
  'use strict';

  const plugin = {
    id: 'com.replycators.edge-bookmark-finder',
    render,
    init,
    refreshCache,
    clearCache,
  };

  const BM_PREFS_KEY_JS = 'rc:plugin:com.replycators.edge-bookmark-finder:prefs';
  const BM_SCAN_KEY     = 'rc:plugin:com.replycators.edge-bookmark-finder:last-scan';

  function app() { return window.ReplyCatorsApp; }

  function bmExtractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function clearCache() {
    return new Promise(function(resolve) {
      chrome.storage.local.remove(BM_SCAN_KEY, function() {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message || 'Storage remove failed' });
          return;
        }
        resolve({ ok: true });
      });
    });
  }

  function refreshCache() {
    return new Promise(function(resolve) {
      bmScanBookmarks(function(scan) {
        if (!scan || scan.permissionError) {
          resolve({ ok: false, error: scan?.permissionErrorMessage || 'Bookmark scan failed' });
          return;
        }
        chrome.storage.local.set({ [BM_SCAN_KEY]: scan }, function() {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message || 'Storage write failed' });
            return;
          }
          resolve({ ok: true, updatedAt: scan.scannedAt || Date.now() });
        });
      });
    });
  }

  function bmScanBookmarks(callback) {
    if (!chrome.bookmarks) {
      callback({ permissionError: true, permissionErrorMessage: 'chrome.bookmarks API is not available.', bookmarks: [], folders: [], totalBookmarks: 0, totalFolders: 0, deepestLevel: 0, duplicateCount: 0, emptyFolderCount: 0, commonDomains: [], recentBookmarks: [], scannedAt: Date.now() });
      return;
    }
    chrome.bookmarks.getTree(function(tree) {
      if (chrome.runtime.lastError) {
        callback({ permissionError: true, permissionErrorMessage: chrome.runtime.lastError.message || 'Permission denied', bookmarks: [], folders: [], totalBookmarks: 0, totalFolders: 0, deepestLevel: 0, duplicateCount: 0, emptyFolderCount: 0, commonDomains: [], recentBookmarks: [], scannedAt: Date.now() });
        return;
      }
      const bookmarks = [], folders = [], nodeMap = {};
      let deepestLevel = 0;

      function indexNodes(node) { nodeMap[node.id] = node; if (node.children) node.children.forEach(indexNodes); }
      tree.forEach(indexNodes);

      function buildPath(node) {
        const parts = [];
        let cur = node.parentId ? nodeMap[node.parentId] : null;
        while (cur) { if (cur.title) parts.unshift(cur.title); cur = cur.parentId ? nodeMap[cur.parentId] : null; }
        return parts.join(' > ');
      }
      function countBm(node) { if (node.url) return 1; return (node.children||[]).reduce(function(s,c){return s+countBm(c);},0); }

      function walk(node, depth) {
        if (depth > deepestLevel) deepestLevel = depth;
        if (node.url) {
          bookmarks.push({ id: node.id, title: node.title||'(untitled)', url: node.url, domain: bmExtractDomain(node.url), path: buildPath(node), depth: depth, dateAdded: node.dateAdded||null, isDuplicate: false });
        } else if (node.children !== undefined) {
          const bc = countBm(node);
          folders.push({ id: node.id, title: node.title||'(root)', path: buildPath(node), depth: depth, bookmarkCount: bc, isEmpty: bc===0 });
          node.children.forEach(function(c){walk(c,depth+1);});
        }
      }
      tree.forEach(function(root){ if(root.children) root.children.forEach(function(c){walk(c,0);}); });

      const urlCounts = {};
      bookmarks.forEach(function(b){ urlCounts[b.url] = (urlCounts[b.url]||0)+1; });
      let dupes = 0;
      bookmarks.forEach(function(b){ if((urlCounts[b.url]||0)>1){b.isDuplicate=true;dupes++;} });

      const dc = {};
      bookmarks.forEach(function(b){ if(b.domain) dc[b.domain]=(dc[b.domain]||0)+1; });
      const commonDomains = Object.entries(dc).sort(function(a,b){return b[1]-a[1];}).slice(0,10).map(function(e){return{domain:e[0],count:e[1]};});
      const recentBookmarks = bookmarks.filter(function(b){return b.dateAdded;}).sort(function(a,b){return(b.dateAdded||0)-(a.dateAdded||0);}).slice(0,10);

      callback({ bookmarks: bookmarks, folders: folders, totalBookmarks: bookmarks.length, totalFolders: folders.length, deepestLevel: deepestLevel, duplicateCount: dupes, emptyFolderCount: folders.filter(function(f){return f.isEmpty&&f.title!=='(root)';}).length, commonDomains: commonDomains, recentBookmarks: recentBookmarks, scannedAt: Date.now(), permissionError: false });
    });
  }

  function bmSearch(scan, query, includeUrls, includeFolders) {
    if (!query.trim()) return scan.bookmarks;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    function match(text) { return terms.every(function(t){return text.includes(t);}); }
    const results = [];
    scan.bookmarks.forEach(function(b) {
      const target = [b.title.toLowerCase(), includeUrls?b.url.toLowerCase():'', includeUrls?b.domain.toLowerCase():'', b.path.toLowerCase()].join(' ');
      if (match(target)) results.push(b);
    });
    if (includeFolders) {
      scan.folders.forEach(function(f) {
        if (match(f.title.toLowerCase()) || match(f.path.toLowerCase())) results.push(f);
      });
    }
    return results;
  }

  function getHTML() {
    return `
      <div id="bm-perm-error" class="rc-status rc-status--error" hidden></div>
      <div id="bm-stats" class="rc-stats-bar" hidden>
        <span id="bm-stat-total" class="rc-stats-bar__item" title="Total bookmarks">0 bookmarks</span>
        <span id="bm-stat-folders" class="rc-stats-bar__item" title="Total folders">0 folders</span>
        <span id="bm-stat-depth" class="rc-stats-bar__item" title="Max depth">depth 0</span>
        <span id="bm-stat-dupes" class="rc-stats-bar__item" hidden title="Duplicate URLs"></span>
        <span id="bm-stat-empty" class="rc-stats-bar__item" hidden title="Empty folders"></span>
        <div class="rc-stats-bar__spacer"></div>
        <button id="bm-scan-btn" class="rc-btn rc-btn--secondary rc-btn--sm" title="Re-scan bookmarks">Re-scan</button>
        <button id="bm-toggle-analytics" class="rc-btn rc-btn--ghost rc-btn--sm" title="Show/hide analytics">Analytics</button>
      </div>
      <div id="bm-analytics" class="rc-plugin-card" style="margin-bottom:12px;" hidden></div>
      <div class="rc-inline-filter">
        <input type="text" id="bm-search" class="rc-input rc-inline-filter__input" placeholder="Search by title, URL, domain, folder…" title="Multi-word search - all words must match" />
        <select id="bm-filter" class="rc-input rc-input--sm rc-inline-filter__select" title="Type filter">
          <option value="all">All types</option>
          <option value="bookmarks">Bookmarks only</option>
          <option value="folders">Folders only</option>
          <option value="duplicates">Duplicates only</option>
        </select>
      </div>
      <div class="rc-filter-toggles">
        <label class="rc-filter-toggle" title="Include URLs in search">
          <input type="checkbox" id="bm-opt-urls" checked /> Search URLs
        </label>
        <label class="rc-filter-toggle" title="Include folder names in search">
          <input type="checkbox" id="bm-opt-folders" checked /> Search folders
        </label>
      </div>
      <div id="bm-status" class="rc-status rc-status--neutral" hidden></div>
      <div id="bm-results-count" class="rc-results-meta"></div>
      <div id="bm-loading" class="rc-plugin-loading" hidden>${window.ReplyCatorsIconHelper ? window.ReplyCatorsIconHelper.renderIcon('states.loading',{size:14,decorative:true}) : ''} Scanning bookmarks…</div>
      <div id="bm-results" class="rc-scroll-list"></div>
      <div id="bm-recent-section" style="margin-top:16px;" hidden>
        <div class="rc-ops-section-header">
          <span class="rc-ops-section-header__label">Recently Added Bookmarks</span>
        </div>
        <div id="bm-recent-list"></div>
      </div>`;
  }

  function render(containerOrEl) {
    // Accept an explicit container element, or look it up by the known ID.
    // dashboard.js calls render() with no arguments after TD-001 refactor -
    // this makes the function self-contained so it works both ways.
    const container = containerOrEl || document.getElementById('edge-bookmark-container');
    if (!container) return;
    container.innerHTML = getHTML();
    bindEvents(container);
  }

  function bindEvents(container) {
    let scan = null;
    let prefs = { lastSearch: '', searchHistory: [], filter: 'all', includeUrls: true, includeFolders: true };

    const permError       = container.querySelector('#bm-perm-error');
    const statsEl         = container.querySelector('#bm-stats');
    const analyticsEl     = container.querySelector('#bm-analytics');
    const statTotal       = container.querySelector('#bm-stat-total');
    const statFolders     = container.querySelector('#bm-stat-folders');
    const statDepth       = container.querySelector('#bm-stat-depth');
    const statDupes       = container.querySelector('#bm-stat-dupes');
    const statEmpty       = container.querySelector('#bm-stat-empty');
    const scanBtn         = container.querySelector('#bm-scan-btn');
    const analyticsToggle = container.querySelector('#bm-toggle-analytics');
    const searchEl        = container.querySelector('#bm-search');
    const filterEl        = container.querySelector('#bm-filter');
    const optUrls         = container.querySelector('#bm-opt-urls');
    const optFolders      = container.querySelector('#bm-opt-folders');
    const loadingEl       = container.querySelector('#bm-loading');
    const resultsCount    = container.querySelector('#bm-results-count');
    const resultsEl       = container.querySelector('#bm-results');
    const recentSection   = container.querySelector('#bm-recent-section');
    const recentList      = container.querySelector('#bm-recent-list');

    function savePrefs() { chrome.storage.local.set({ [BM_PREFS_KEY_JS]: prefs }); }

    chrome.storage.local.get([BM_PREFS_KEY_JS, BM_SCAN_KEY], function(result) {
      const sp = result[BM_PREFS_KEY_JS];
      if (sp) {
        prefs = Object.assign(prefs, sp);
        searchEl.value = prefs.lastSearch || '';
        filterEl.value = prefs.filter || 'all';
        optUrls.checked    = prefs.includeUrls !== false;
        optFolders.checked = prefs.includeFolders !== false;
      }
      const cached = result[BM_SCAN_KEY];
      if (cached && cached.bookmarks) {
        scan = cached;
        updateStats();
        renderResults();
        renderRecent();
      } else {
        runScan();
      }
    });

    // PERF-004 fix: before writing the bookmark scan result to storage, check
    // current quota usage. The full scan object can reach 500 KB - 1.5 MB on
    // large bookmark libraries; unguarded writes can exhaust the 5 MB quota
    // shared by the entire extension and cause silent data loss for all plugins.
    //
    // Guard thresholds (bytes):
    //   WARN_AT  = 3 MB (3,145,728) - warn but still write.
    //   BLOCK_AT = 4 MB (4,194,304) - do not write; notify user.
    const BM_QUOTA_WARN_AT  = 3 * 1024 * 1024;  // 3 MB
    const BM_QUOTA_BLOCK_AT = 4 * 1024 * 1024;  // 4 MB

    function runScan() {
      loadingEl.removeAttribute('hidden');
      scanBtn.disabled = true;
      resultsEl.innerHTML = '';
      statsEl.setAttribute('hidden', '');
      bmScanBookmarks(function(s) {
        loadingEl.setAttribute('hidden', '');
        scanBtn.disabled = false;
        if (s.permissionError) {
          permError.textContent = s.permissionErrorMessage || 'Bookmark access denied. Ensure the "bookmarks" permission is granted.';
          permError.removeAttribute('hidden');
          app().addLog('error', plugin.id, 'permission error: ' + s.permissionErrorMessage);
          return;
        }
        permError.setAttribute('hidden', '');
        scan = s;

        // Quota pre-check before writing the scan cache to storage.
        chrome.storage.local.getBytesInUse(null, function(bytesInUse) {
          if (bytesInUse >= BM_QUOTA_BLOCK_AT) {
            app().addNotification(
              'Edge Bookmark Finder',
              'Storage is almost full (' + Math.round(bytesInUse / 1024) + ' KB used). Scan results were not cached - open Diagnostics to manage storage.',
              'error',
              plugin.id
            );
            app().addLog('error', plugin.id, 'Scan cache skipped - storage quota near limit (' + Math.round(bytesInUse / 1024) + ' KB)');
          } else {
            if (bytesInUse >= BM_QUOTA_WARN_AT) {
              app().addNotification(
                'Edge Bookmark Finder',
                'Storage usage is high (' + Math.round(bytesInUse / 1024) + ' KB of 5 MB used). Consider clearing old data.',
                'warning',
                plugin.id
              );
              app().addLog('warn', plugin.id, 'Storage at ' + Math.round(bytesInUse / 1024) + ' KB - approaching quota; scan cached anyway');
            }
            chrome.storage.local.set({ [BM_SCAN_KEY]: scan }, function() {
              if (chrome.runtime.lastError) {
                app().addLog('error', plugin.id, 'Failed to cache scan result: ' + chrome.runtime.lastError.message);
              }
            });
          }
          app().addNotification('Edge Bookmark Finder', 'Scan complete - ' + s.totalBookmarks + ' bookmarks in ' + s.totalFolders + ' folders.', 'success', plugin.id);
          app().addLog('info', plugin.id, 'Scanned ' + s.totalBookmarks + ' bookmarks, ' + s.totalFolders + ' folders');
          updateStats();
          renderResults();
          renderRecent();
        });
      });
    }

    function updateStats() {
      if (!scan) return;
      statsEl.removeAttribute('hidden');
      statTotal.textContent   = scan.totalBookmarks + ' bookmarks';
      statFolders.textContent = scan.totalFolders + ' folders';
      statDepth.textContent   = 'depth ' + scan.deepestLevel;
      if (scan.duplicateCount > 0) { statDupes.textContent = scan.duplicateCount + ' duplicates'; statDupes.removeAttribute('hidden'); }
      if (scan.emptyFolderCount > 0) { statEmpty.textContent = scan.emptyFolderCount + ' empty folders'; statEmpty.removeAttribute('hidden'); }
      if (scan.commonDomains.length > 0) {
        analyticsEl.innerHTML =
          '<div class="rc-plugin-section__header" style="margin-bottom:8px;">Top Domains</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
          scan.commonDomains.map(function(d) {
            return '<span class="rc-badge rc-badge--blue" title="' + app().esc(d.domain) + ': ' + d.count + '">' + app().esc(d.domain) + ' <strong>' + d.count + '</strong></span>';
          }).join('') + '</div>';
      }
    }

    function bmOpenBookmark(url) {
      chrome.tabs.create({ url: url, active: true });
      app().addLog('info', plugin.id, 'opened bookmark: ' + url);
    }

    function renderResults() {
      if (!scan) return;
      const q    = searchEl.value.toLowerCase().trim();
      const filt = filterEl.value;

      let results;
      if (!q) {
        if (filt === 'folders') results = scan.folders;
        else if (filt === 'duplicates') results = scan.bookmarks.filter(function(b){return b.isDuplicate;});
        else results = scan.bookmarks;
      } else {
        results = bmSearch(scan, q, optUrls.checked, optFolders.checked);
        if (filt === 'bookmarks') results = results.filter(function(r){return 'url' in r;});
        else if (filt === 'folders') results = results.filter(function(r){return !('url' in r);});
        else if (filt === 'duplicates') results = results.filter(function(r){return 'url' in r && r.isDuplicate;});
      }

      resultsCount.textContent = q ? results.length + ' result' + (results.length!==1?'s':'') + ' for "' + q + '"' : scan.totalBookmarks + ' bookmarks';
      resultsEl.innerHTML = '';

      if (results.length === 0) {
        resultsEl.innerHTML = '<div class="rc-no-results">No matching bookmarks.</div>';
        return;
      }

      const frag = document.createDocumentFragment();
      results.slice(0, 200).forEach(function(item) {
        const el = document.createElement('div');
        if ('url' in item) {
          const b = item;
          el.className = 'bm-result-row' + (b.isDuplicate ? ' bm-result-row--duplicate' : '');
          el.setAttribute('role', 'button');
          el.setAttribute('tabindex', '0');
          el.setAttribute('title', 'Open bookmark: ' + b.title);
          el.dataset.url = b.url;
          el.innerHTML =
            '<div class="bm-result-inner">' +
              '<span class="bm-result-icon" aria-hidden="true"></span>' +
              '<div class="bm-result-body">' +
                '<div class="bm-result-title" title="' + app().esc(b.title) + '">' + app().esc(b.title) + (b.isDuplicate ? ' <span class="bm-duplicate-badge">duplicate</span>' : '') + '</div>' +
                '<div class="bm-result-path" title="' + app().esc(b.path) + '">' + (app().esc(b.path) || '(root)') + '</div>' +
                '<div class="bm-result-url" title="' + app().esc(b.url) + '">' + app().esc(b.url) + '</div>' +
              '</div>' +
              '<div class="bm-result-actions">' +
                '<button class="rc-btn rc-btn--ghost rc-btn--sm bm-open" data-url="' + app().esc(b.url) + '" title="Open in new tab" tabindex="-1" aria-label="Open ' + app().esc(b.title) + ' in new tab">↗</button>' +
                '<button class="rc-btn rc-btn--ghost rc-btn--sm bm-copy" data-url="' + app().esc(b.url) + '" title="Copy URL" tabindex="-1" aria-label="Copy URL for ' + app().esc(b.title) + '">⧉</button>' +
              '</div>' +
            '</div>';
        } else {
          const f = item;
          el.className = 'bm-folder-row';
          el.innerHTML =
            '<div class="bm-folder-inner">' +
              '<span class="bm-folder-icon" aria-hidden="true"></span>' +
              '<div class="bm-folder-body">' +
                '<span class="bm-folder-title">' + app().esc(f.title) + '</span>' +
                (f.isEmpty ? ' <span class="rc-badge" style="font-size:10px;">empty</span>' : '') +
                '<div class="bm-folder-meta">' + (app().esc(f.path)||'(root)') + ' · ' + f.bookmarkCount + ' bookmarks</div>' +
              '</div>' +
            '</div>';
        }
        frag.appendChild(el);
      });
      resultsEl.appendChild(frag);

      if (results.length > 200) {
        const more = document.createElement('div');
        more.className = 'bm-cap-notice';
        more.innerHTML = '<span>Showing <strong>200 of ' + results.length + '</strong> results - use a more specific search term to see others.</span>';
        resultsEl.appendChild(more);
      }
    }

    function renderRecent() {
      if (!scan || scan.recentBookmarks.length === 0) return;
      recentSection.removeAttribute('hidden');
      recentList.innerHTML = scan.recentBookmarks.map(function(b) {
        return '<div class="bm-recent-row" role="button" tabindex="0" data-url="' + app().esc(b.url) + '" title="Open bookmark: ' + app().esc(b.title) + '">' +
          '<span class="bm-result-icon" aria-hidden="true"></span>' +
          '<span class="bm-recent-title" title="' + app().esc(b.title) + '">' + app().esc(b.title) + '</span>' +
          '<span class="bm-recent-date">' + (b.dateAdded ? new Date(b.dateAdded).toLocaleDateString() : '') + '</span>' +
          '<button class="rc-btn rc-btn--ghost rc-btn--sm bm-recent-open" data-url="' + app().esc(b.url) + '" title="Open" tabindex="-1" aria-label="Open ' + app().esc(b.title) + '">↗</button>' +
          '</div>';
      }).join('');
    }

    resultsEl.addEventListener('click', function(e) {
      const copyBtn = e.target.closest('.bm-copy');
      if (copyBtn) {
        e.stopPropagation();
        navigator.clipboard.writeText(copyBtn.dataset.url).then(function() {
          app().addNotification('Edge Bookmark Finder', 'URL copied!', 'success', plugin.id);
          app().addLog('info', plugin.id, 'copied URL: ' + copyBtn.dataset.url);
        }).catch(function(err) {
          app().addLog('error', plugin.id, 'Clipboard write failed: ' + String(err));
          app().addNotification('Edge Bookmark Finder', 'Clipboard write failed.', 'error', plugin.id);
        });
        return;
      }
      const openBtn = e.target.closest('.bm-open');
      if (openBtn) { bmOpenBookmark(openBtn.dataset.url); return; }
      const row = e.target.closest('.bm-result-row');
      if (row && row.dataset.url) { bmOpenBookmark(row.dataset.url); }
    });
    resultsEl.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.bm-result-row');
      if (row && row.dataset.url) { e.preventDefault(); bmOpenBookmark(row.dataset.url); }
    });

    recentList.addEventListener('click', function(e) {
      const openBtn = e.target.closest('.bm-recent-open');
      if (openBtn) { bmOpenBookmark(openBtn.dataset.url); return; }
      const row = e.target.closest('.bm-recent-row');
      if (row && row.dataset.url) { bmOpenBookmark(row.dataset.url); }
    });
    recentList.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.bm-recent-row');
      if (row && row.dataset.url) { e.preventDefault(); bmOpenBookmark(row.dataset.url); }
    });

    analyticsToggle.addEventListener('click', function() {
      const vis = !analyticsEl.hasAttribute('hidden');
      if (vis) { analyticsEl.setAttribute('hidden', ''); } else { analyticsEl.removeAttribute('hidden'); }
      analyticsToggle.textContent = vis ? 'Analytics' : 'Hide Analytics';
    });

    let bmTimer = null;
    searchEl.addEventListener('input', function() {
      prefs.lastSearch = searchEl.value;
      savePrefs();
      clearTimeout(bmTimer);
      bmTimer = setTimeout(function() { renderResults(); }, 200);
    });
    filterEl.addEventListener('change', function() { prefs.filter = filterEl.value; savePrefs(); renderResults(); });
    optUrls.addEventListener('change', function() { prefs.includeUrls = optUrls.checked; savePrefs(); renderResults(); });
    optFolders.addEventListener('change', function() { prefs.includeFolders = optFolders.checked; savePrefs(); renderResults(); });
    scanBtn.addEventListener('click', function() {
      app().addLog('info', plugin.id, 'manual re-scan triggered');
      runScan();
    });
  }

  function init() {
    app().addLog('info', plugin.id, 'Edge Bookmark Finder ready');
    document.getElementById('bm-widget-search-btn')?.addEventListener('click', () => {
      app().navigateTo('plugin-edge-bookmarks');
    });
  }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.EdgeBookmarkFinder = plugin;
})();