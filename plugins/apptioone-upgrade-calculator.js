/**
 * ApptioOne Upgrade Calculator
 * plugins/apptioone-upgrade-calculator.js
 *
 * Plugin ID:  com.replycators.apptioone-upgrade-calculator
 * Version:    1.0.0
 * Author:     ReplyCators Platform
 *
 * Analyzes Apptio Upgrade Requests from the TargetProcess board at
 * apptioupgrades.tpondemand.com. Auto-detects the active customer
 * environment tab (*.apptio.com / *.apps.papt.to), opens the board in
 * a temporary background tab, bulk-extracts ALL upgrade records into an
 * in-memory cache, then immediately closes the board tab. All subsequent
 * UI interactions (search, detail view, calculations) are served entirely
 * from the cache - no open tab is required after the initial extraction.
 *
 * Content scripts (declared in manifest.json):
 *   plugins/apptioone-upgrade-calculator/content/tp-content.js    - TP board extraction
 *   plugins/apptioone-upgrade-calculator/content/env-content.js   - customer env build info
 */

(function() {
  'use strict';

  const PLUGIN_ID = 'com.replycators.apptioone-upgrade-calculator';
  const VIEW_ID   = 'plugin-apptioone-upgrade-calc';
  const DOM_PFX   = 'aouc';

  const BOARD_URL =
    'https://apptioupgrades.tpondemand.com/RestUI/Board.aspx' +
    '#page=board/5114373418604114084' +
    '&appConfig=eyJhY2lkIjoiMTA1MTA5MDU0OEY2QTUyQjlFM0JCODkwRjYwQUVGMEIifQ==';

  // ── Plugin state ──────────────────────────────────────────────────────────────

  // Cache: map of entityId (string) -> { fields, timeline }
  // Populated by _buildCache(). Empty until first successful extraction.
  let _cache             = {};
  let _cacheReady        = false;
  // In-progress cache build promise. Re-used by concurrent callers so only
  // one board tab is ever opened at a time.
  let _cacheBuildPromise = null;

  // Live-builds data read from the customer's env tab
  let _lastEnv           = null;
  let _lastLiveBuilds    = null;
  let _envTabId          = null;

  // Last search results array (search-list items from cache)
  let _lastSearchResults = [];

  // Cancellation token - incremented on every new top-level operation so
  // stale UI callbacks are silently discarded.  NOTE: this must NOT be
  // checked inside _buildCache itself because the build must always run
  // to completion regardless of UI navigation events.
  let _requestId = 0;

  // Track document-level click listener (added/removed with the view)
  let _docClickListener = null;

  const plugin = { id: PLUGIN_ID, init, onNavigate, onLeave };

  function app() { return window.ReplyCatorsApp; }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _toast(type, title, message) {
    app().addNotification(title, message, type, PLUGIN_ID);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  function init() {
    // Widget button (exists in static HTML at init time)
    document.getElementById(DOM_PFX + '-widget-open-btn')?.addEventListener('click', function() {
      app().navigateTo(VIEW_ID);
    });
  }

  function onNavigate() {
    app().addLog('info', PLUGIN_ID, 'ApptioOne Upgrade Calculator opened');
    _render();
    _docClickListener = function(e) {
      const searchSection = document.getElementById(DOM_PFX + '-search-section');
      const content       = document.getElementById(DOM_PFX + '-content');
      if (searchSection && content &&
          !searchSection.contains(e.target) &&
          !content.contains(e.target)) {
        const sr = document.getElementById(DOM_PFX + '-search-results');
        if (sr) sr.classList.add('hidden');
      }
    };
    document.addEventListener('click', _docClickListener);
  }

  function onLeave() {
    app().addLog('info', PLUGIN_ID, 'ApptioOne Upgrade Calculator closed');
    _requestId++; // invalidate any in-flight async callbacks
    if (_docClickListener) {
      document.removeEventListener('click', _docClickListener);
      _docClickListener = null;
    }
  }

  // ── View rendering ─────────────────────────────────────────────────────────────

  function _render() {
    const container = document.getElementById(DOM_PFX + '-container');
    if (!container) return;
    if (container.querySelector('#' + DOM_PFX + '-status-bar')) {
      // View already rendered - just re-run navigation logic
      _onNavigate();
      return;
    }
    container.innerHTML = _getHTML();
    // Bind event handlers inside the container
    container.querySelector('#' + DOM_PFX + '-btn-refresh')?.addEventListener('click', _run);
    container.querySelector('#' + DOM_PFX + '-btn-search')?.addEventListener('click', _runSearch);
    container.querySelector('#' + DOM_PFX + '-btn-copy')?.addEventListener('click', _copyAll);
    container.querySelector('#' + DOM_PFX + '-btn-diagnose')?.addEventListener('click', _diagnose);
    container.querySelector('#' + DOM_PFX + '-search-input')?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _runSearch();
      if (e.key === 'Escape') {
        const sr = document.getElementById(DOM_PFX + '-search-results');
        const si = document.getElementById(DOM_PFX + '-search-input');
        if (sr) sr.classList.add('hidden');
        if (si) si.value = '';
      }
    });
    _onNavigate();
  }

  // ── Auto-mode ─────────────────────────────────────────────────────────────────

  function _onNavigate() {
    _setStatus('info', 'Reading active tab...');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        app().addLog('warn', PLUGIN_ID, 'tabs.query error: ' + chrome.runtime.lastError.message);
        _setStatus('info', 'Open a CT/TBM Studio tab, or search below.');
        _showSearchSection();
        return;
      }
      const tab    = (tabs || [])[0];
      const tabUrl = tab ? (tab.url || '') : '';

      const envInfo = _extractEnvInfo(tabUrl);
      if (envInfo) {
        _envTabId       = tab.id;
        _lastLiveBuilds = null;
        _lastEnv        = envInfo.hostname;

        const si = document.getElementById(DOM_PFX + '-search-input');
        if (si) si.value = envInfo.hostname;
        _showSearchSection();

        const envBadge = document.getElementById(DOM_PFX + '-env-badge');
        if (envBadge) envBadge.textContent = envInfo.displayName;

        _fetchLiveBuilds(tab.id).then(function(builds) {
          if (builds) {
            _lastLiveBuilds = builds;
            const parts = [];
            if (builds.prodBuild)     parts.push('Build ' + builds.prodBuild);
            if (builds.serverVersion) parts.push('Ver: ' + builds.serverVersion);
            const detail = parts.length > 0 ? ' (' + parts.join(' · ') + ')' : '';
            _setStatus('ok', 'Environment: ' + envInfo.displayName + detail + ' - click Search or press Enter to begin.');
          } else {
            _setStatus('ok', 'Environment: ' + envInfo.displayName + ' - click Search or press Enter to begin.');
          }
        });
        return;
      }

      if (_cacheReady) {
        _setStatus('ok', 'Cache ready - search below.');
        _showSearchSection();
        return;
      }

      _setStatus('info', 'Open a CT/TBM Studio tab, or search below.');
      _showSearchSection();
      const si = document.getElementById(DOM_PFX + '-search-input');
      if (si) si.focus();
    });
  }

  // ── Env helpers ───────────────────────────────────────────────────────────────

  function _extractEnvInfo(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const host   = parsed.hostname.toLowerCase();
      if (host.endsWith('.apptio.com')) {
        const label = host.split('.')[0];
        if (!label || label === 'www') return null;
        let displayName = label;
        try {
          const hashParts = parsed.hash.replace(/^#/, '').split(':');
          if (hashParts.length >= 3 && hashParts[2]) displayName = decodeURIComponent(hashParts[2].replace(/\+/g, ' '));
        } catch (_) {}
        return { hostname: host, label: label, displayName: displayName };
      }
      if (host.endsWith('.apps.papt.to')) {
        const label2 = host.split('.')[0];
        if (!label2) return null;
        return { hostname: host, label: label2, displayName: label2 };
      }
    } catch (_) {}
    return null;
  }

  // ── Live builds from customer env tab ─────────────────────────────────────────

  function _fetchLiveBuilds(tabId) {
    return new Promise(function(resolve) {
      chrome.scripting.executeScript(
        { target: { tabId: tabId }, files: ['plugins/apptioone-upgrade-calculator/content/env-content.js'] },
        function() {
          if (chrome.runtime.lastError) { resolve(null); return; }
          setTimeout(function() {
            chrome.tabs.sendMessage(tabId, { action: 'aouc:extractEnvBuilds' }, function(resp) {
              if (chrome.runtime.lastError || !resp || !resp.success) resolve(null);
              else resolve(resp.data || null);
            });
          }, 150);
        }
      );
    });
  }

  // ── Cache-first board management ──────────────────────────────────────────────
  //
  // _buildCache():
  //   1. Opens a temporary background tab to the board URL.
  //   2. Waits for the board to fully render.
  //   3. Injects tp-content.js and calls aouc:extractAllRows to get every row.
  //   4. Stores results in _cache (keyed by entity ID).
  //   5. Closes the temporary tab immediately.
  //   6. Sets _cacheReady = true.
  //
  // The board tab is never kept open after cache construction.

  // _buildCache() opens a temporary background tab, bulk-extracts every row,
  // writes results to _cache, then closes the tab.  The build always runs to
  // completion - it is never cancelled by _requestId changes so that UI
  // navigation during the ~30s load does not discard the work.
  // Concurrent callers share the same in-progress promise (_cacheBuildPromise).
  function _buildCache() {
    if (_cacheBuildPromise) return _cacheBuildPromise;

    _cache      = {};
    _cacheReady = false;

    _setStatus('info', 'Opening Upgrade Requests board...');
    app().addLog('info', PLUGIN_ID, 'Cache build started');

    let tempTabId = null;

    _cacheBuildPromise = chrome.tabs.create({ url: BOARD_URL, active: false })
      .then(function(tab) {
        tempTabId = tab.id;
        _setStatus('info', 'Loading board - please wait...');
        return _waitForTabLoad(tempTabId, 60000);
      })
      .then(function() {
        _setStatus('info', 'Board loaded - injecting extractor...');
        // Wait for the SPA to boot before injecting.  The static content_script
        // declaration also injects at document_idle, but a programmatically-opened
        // tab may need extra time before the board DOM is queryable.
        return new Promise(function(r) { setTimeout(r, 4000); });
      })
      .then(function() {
        return _injectAndVerify(tempTabId, 6, 2000);
      })
      .then(function(ok) {
        if (!ok) {
          _toast('warning', 'Upgrade Calculator', 'Board loaded but script could not connect. Try again.');
          return false;
        }
        _setStatus('info', 'Waiting for board rows to render...');
        return new Promise(function(resolve) {
          chrome.tabs.sendMessage(
            tempTabId,
            { action: 'aouc:waitForRows', minRows: 3, timeoutMs: 45000 },
            function(resp) {
              if (chrome.runtime.lastError) {
                app().addLog('warn', PLUGIN_ID, 'waitForRows error: ' + chrome.runtime.lastError.message);
              }
              resolve(resp || { success: false, rowCount: 0 });
            }
          );
        });
      })
      .then(function(rowsResp) {
        if (rowsResp === false) return false; // script-connect failed
        const rowCount = (rowsResp && rowsResp.rowCount) || 0;
        if (rowCount === 0) {
          _toast('warning', 'Upgrade Calculator', 'Board rows did not appear. Try again.');
          return false;
        }
        _setStatus('info', 'Extracting ' + rowCount + ' upgrade records...');
        return new Promise(function(resolve) {
          chrome.tabs.sendMessage(
            tempTabId,
            { action: 'aouc:extractAllRows' },
            function(resp) {
              if (chrome.runtime.lastError) {
                app().addLog('warn', PLUGIN_ID, 'extractAllRows error: ' + chrome.runtime.lastError.message);
                resolve(null);
              } else {
                resolve(resp);
              }
            }
          );
        });
      })
      .then(function(extractResp) {
        if (!extractResp || !extractResp.success || !extractResp.data) {
          _toast('warning', 'Upgrade Calculator', 'Extraction returned no data. Try again.');
          return false;
        }
        const records = extractResp.data.records || [];
        if (records.length === 0) {
          _toast('warning', 'Upgrade Calculator', 'Board rows loaded but no records extracted. Try again.');
          return false;
        }
        records.forEach(function(rec) {
          if (rec.id) _cache[String(rec.id)] = { fields: rec, timeline: rec._timeline || {} };
        });
        _cacheReady = true;
        const count = Object.keys(_cache).length;
        app().addLog('info', PLUGIN_ID, 'Cache built: ' + count + ' records from ' + extractResp.data.rowCount + ' board rows');
        return true;
      })
      .catch(function(err) {
        const msg = err && err.message ? err.message : String(err);
        app().addLog('error', PLUGIN_ID, 'Cache build failed: ' + msg);
        _toast('error', 'Upgrade Calculator', 'Could not load upgrade data: ' + msg);
        return false;
      })
      .then(function(result) {
        // Always close the temporary tab and clear the in-progress handle.
        _cacheBuildPromise = null;
        if (tempTabId !== null) {
          chrome.tabs.remove(tempTabId, function() {
            if (chrome.runtime.lastError) {
              app().addLog('warn', PLUGIN_ID, 'Could not close board tab: ' + chrome.runtime.lastError.message);
            }
          });
        }
        return result;
      });

    return _cacheBuildPromise;
  }

  function _waitForTabLoad(tabId, timeoutMs) {
    timeoutMs = timeoutMs || 30000;
    return new Promise(function(resolve, reject) {
      const deadline = Date.now() + timeoutMs;
      function onUpdated(id, info) {
        if (id !== tabId || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.get(tabId, function(t) { if (!chrome.runtime.lastError) resolve(t); });
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
      (function checkNow() {
        chrome.tabs.get(tabId, function(t) {
          if (chrome.runtime.lastError) { chrome.tabs.onUpdated.removeListener(onUpdated); reject(new Error(chrome.runtime.lastError.message)); return; }
          if (t.status === 'complete') { chrome.tabs.onUpdated.removeListener(onUpdated); resolve(t); return; }
          if (Date.now() > deadline) { chrome.tabs.onUpdated.removeListener(onUpdated); reject(new Error('Timed out waiting for board to load.')); return; }
          setTimeout(checkNow, 500);
        });
      }());
    });
  }

  function _injectAndVerify(tabId, retries, delayMs) {
    return new Promise(function(resolve) {
      (function attempt(i) {
        chrome.scripting.executeScript(
          { target: { tabId: tabId }, files: ['plugins/apptioone-upgrade-calculator/content/tp-content.js'] },
          function() {
            chrome.tabs.sendMessage(tabId, { action: 'aouc:search', query: '' }, function(resp) {
              if (resp) { resolve(true); return; }
              if (i < retries - 1) setTimeout(function() { attempt(i + 1); }, delayMs);
              else resolve(false);
            });
          }
        );
      }(0));
    });
  }

  // ── Cache query helpers ───────────────────────────────────────────────────────

  function _cacheSearch(query) {
    if (!query || query.trim().length < 2) return [];
    const q     = query.trim().toLowerCase();
    const qNorm = q.replace(/[.:_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const results = [];
    Object.values(_cache).forEach(function(entry) {
      const f   = entry.fields || {};
      const raw = [f.account, f.instanceUrl, f.id, f.csm, f.sfId, f.status, f.upgradeDate]
        .filter(Boolean).join(' ').toLowerCase();
      const rawNorm = raw.replace(/[.:_-]/g, ' ').replace(/\s+/g, ' ');
      if (!raw.includes(q) && !rawNorm.includes(qNorm)) return;
      results.push({ id: f.id, account: f.account || '', instanceUrl: f.instanceUrl || '', upgradeDate: f.upgradeDate || '', status: f.status || '' });
    });
    return results;
  }

  function _cacheGet(entityId) {
    return _cache[String(entityId)] || null;
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  function _runSearch() {
    const si = document.getElementById(DOM_PFX + '-search-input');
    const sr = document.getElementById(DOM_PFX + '-search-results');
    const btnSearch = document.getElementById(DOM_PFX + '-btn-search');
    if (!si || !sr) return;
    const query = si.value.trim();
    if (query.length < 2) { sr.classList.add('hidden'); return; }
    if (btnSearch) { btnSearch.disabled = true; btnSearch.textContent = '...'; }

    const reqId = ++_requestId;

    if (_cacheReady) {
      // Cache already populated - search instantly
      const results = _cacheSearch(query);
      _lastSearchResults = results;
      _setStatus('ok', results.length + ' result(s) for "' + query + '"');
      sr.innerHTML = '';
      if (results.length === 0) {
        sr.innerHTML = '<div class="aouc-search-hint">No results for "<strong>' + _esc(query) + '</strong>"</div>';
        sr.classList.remove('hidden');
      } else {
        _showResultsList(results);
      }
      if (btnSearch) { btnSearch.disabled = false; btnSearch.textContent = 'Search'; }
      return;
    }

    // Cache not ready - build it first
    sr.innerHTML = '<div class="aouc-search-hint">Opening board... this may take ~30s the first time</div>';
    sr.classList.remove('hidden');
    _setStatus('info', 'Loading board data...');

    _buildCache()
      .then(function(ok) {
        if (reqId !== _requestId) return;
        if (btnSearch) { btnSearch.disabled = false; btnSearch.textContent = 'Search'; }
        sr.innerHTML = '';
        if (!ok) {
          sr.innerHTML = '<div class="aouc-search-error">Could not load board data. Try again.</div>';
          _setStatus('warn', 'Board data not available - try again.');
          return;
        }
        const results = _cacheSearch(query);
        _lastSearchResults = results;
        _setStatus('ok', results.length + ' result(s) for "' + query + '"');
        if (results.length === 0) {
          sr.innerHTML = '<div class="aouc-search-hint">No results for "<strong>' + _esc(query) + '</strong>"</div>';
          sr.classList.remove('hidden');
        } else {
          _showResultsList(results);
        }
      })
      .catch(function(err) {
        if (reqId !== _requestId) return;
        if (btnSearch) { btnSearch.disabled = false; btnSearch.textContent = 'Search'; }
        sr.innerHTML = '<div class="aouc-search-error">Error: ' + _esc(err.message) + '</div>';
        _setStatus('err', 'Search error');
        app().addLog('error', PLUGIN_ID, 'Search failed: ' + err.message);
      });
  }

  function _showResultsList(results) {
    _lastSearchResults = results || [];
    const sr = document.getElementById(DOM_PFX + '-search-results');
    if (!sr) return;
    sr.innerHTML = '';
    sr.classList.remove('hidden');
    results.forEach(function(r) {
      const item = document.createElement('div');
      item.className = 'rc-plugin-list-item aouc-result-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.dataset.id = r.id;
      const sv    = (r.status || '').toLowerCase();
      const badge = r.status ? '<span class="rc-badge aouc-result-status" data-status="' + sv + '">' + _esc(r.status) + '</span>' : '';
      const meta  = [
        r.instanceUrl ? r.instanceUrl : null,
        r.upgradeDate ? r.upgradeDate : null,
        r.id          ? '#' + r.id   : null,
      ].filter(Boolean).join('  ·  ');
      item.innerHTML =
        '<div class="aouc-result-name">' + _esc(r.account || 'Unknown') + badge + '</div>' +
        (meta ? '<div class="aouc-result-meta rc-muted">' + _esc(meta) + '</div>' : '');
      function activate() {
        sr.querySelectorAll('.aouc-result-item').forEach(function(el) { el.classList.remove('aouc-result-item--selected'); });
        item.classList.add('aouc-result-item--selected');
        _loadById(r.id);
      }
      item.addEventListener('click', activate);
      item.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      sr.appendChild(item);
    });
  }

  // ── Load detail from cache ────────────────────────────────────────────────────

  function _loadById(entityId) {
    const content    = document.getElementById(DOM_PFX + '-content');
    const errorPanel = document.getElementById(DOM_PFX + '-error-panel');
    if (content)    content.classList.add('hidden');
    if (errorPanel) errorPanel.classList.add('hidden');

    const entry = _cacheGet(entityId);
    if (entry) {
      _renderData({ fields: entry.fields, timeline: entry.timeline });
      return;
    }
    // Entity not in cache (e.g. cache was cleared) - show warning toast
    _toast('warning', 'Upgrade Calculator', 'Record #' + entityId + ' not found in cache. Try searching again.');
    _setStatus('warn', 'Record not in cache - try searching again.');
    app().addLog('warn', PLUGIN_ID, 'loadById: entity ' + entityId + ' not in cache');
  }

  // ── Refresh ───────────────────────────────────────────────────────────────────

  function _run() {
    const reqId = ++_requestId;
    const content    = document.getElementById(DOM_PFX + '-content');
    const errorPanel = document.getElementById(DOM_PFX + '-error-panel');
    const cpFeedback = document.getElementById(DOM_PFX + '-copy-feedback');
    if (content)    content.classList.add('hidden');
    if (errorPanel) errorPanel.classList.add('hidden');
    if (cpFeedback) cpFeedback.classList.add('hidden');

    // Force a fresh build: clear the in-progress handle AND the cache.
    // _buildCache will create a new handle immediately.
    _cacheBuildPromise = null;
    _cache             = {};
    _cacheReady        = false;

    _setStatus('info', 'Rebuilding cache...');

    const query = _lastEnv || (function() {
      const si = document.getElementById(DOM_PFX + '-search-input');
      return si ? si.value.trim() : '';
    }());

    _buildCache()
      .then(function(ok) {
        if (reqId !== _requestId) return;
        if (!ok) {
          _setStatus('warn', 'Could not reload board data. Try again.');
          return;
        }
        if (query && query.length >= 2) {
          const results = _cacheSearch(query);
          _lastSearchResults = results;
          if (results.length === 1) {
            _loadById(results[0].id);
          } else if (results.length > 1) {
            _setStatus('ok', results.length + ' result(s) for "' + query + '"');
            _showResultsList(results);
          } else {
            _setStatus('ok', 'Cache refreshed - no results for "' + query + '"');
          }
        } else {
          _setStatus('ok', 'Cache refreshed - ' + Object.keys(_cache).length + ' records loaded.');
        }
      })
      .catch(function(err) {
        if (reqId !== _requestId) return;
        _setStatus('err', 'Refresh failed: ' + (err.message || String(err)));
        app().addLog('error', PLUGIN_ID, 'Refresh failed: ' + (err.message || String(err)));
      });
  }

  // ── Render extracted data ─────────────────────────────────────────────────────

  function _renderData(data) {
    const fields   = data.fields   || {};
    const timeline = data.timeline || {};
    const all      = Object.assign({}, fields, timeline);

    const FIELD_ELEMENTS = {
      id:               DOM_PFX + '-f-id',
      account:          DOM_PFX + '-f-account',
      instanceUrl:      DOM_PFX + '-f-instanceUrl',
      csm:              DOM_PFX + '-f-csm',
      currentBuild:     DOM_PFX + '-f-currentBuild',
      upgradeBuild:     DOM_PFX + '-f-upgradeBuild',
      upgradeDate:      DOM_PFX + '-f-upgradeDate',
      upgradeTime:      DOM_PFX + '-f-upgradeTime',
      upgradeType:      DOM_PFX + '-f-upgradeType',
      timeZone:         DOM_PFX + '-f-timeZone',
      sfId:             DOM_PFX + '-f-sfId',
      statusInSF:       DOM_PFX + '-f-statusInSF',
      status:           DOM_PFX + '-f-status',
      previousUpgrade:  DOM_PFX + '-t-previousUpgrade',
      currentUpgrade:   DOM_PFX + '-t-currentUpgrade',
      daysSincePrev:    DOM_PFX + '-t-daysSincePrev',
      nextUpgrade:      DOM_PFX + '-t-nextUpgrade',
      daysUntilNext:    DOM_PFX + '-t-daysUntilNext',
      upgradeFrequency: DOM_PFX + '-t-upgradeFrequency',
    };

    let found = 0;
    Object.keys(FIELD_ELEMENTS).forEach(function(key) {
      const el = document.getElementById(FIELD_ELEMENTS[key]);
      if (!el) return;
      const val = (all[key] && all[key] !== 'undefined') ? String(all[key]).trim() : '';
      if (val && val !== 'Not Found') {
        el.textContent = val;
        el.classList.remove('aouc-not-found');
        found++;
      } else {
        el.textContent = 'Not Found';
        el.classList.add('aouc-not-found');
      }
    });

    // Status colour
    const statusEl = document.getElementById(DOM_PFX + '-f-status');
    if (statusEl) {
      const sv = (fields.status || '').toLowerCase();
      statusEl.removeAttribute('data-status');
      if (sv) statusEl.setAttribute('data-status', sv);
    }

    // Account badge
    const envBadge = document.getElementById(DOM_PFX + '-env-badge');
    if (envBadge && fields.account) envBadge.textContent = fields.account;

    // Live build rows
    _updateLiveBuildRows();

    if (found === 0)    _setStatus('partial', 'No fields read from cache. Try Refresh.');
    else if (found < 5) _setStatus('partial', 'Partial data (' + found + ' fields)');
    else                _setStatus('ok', found + ' fields loaded');

    const content    = document.getElementById(DOM_PFX + '-content');
    const errorPanel = document.getElementById(DOM_PFX + '-error-panel');
    if (content)    content.classList.remove('hidden');
    if (errorPanel) errorPanel.classList.add('hidden');

    // Fetch live builds if not already loaded
    if (_envTabId && !_lastLiveBuilds) {
      _fetchLiveBuilds(_envTabId).then(function(builds) {
        if (builds) { _lastLiveBuilds = builds; _updateLiveBuildRows(); }
      });
    }
  }

  function _updateLiveBuildRows() {
    const liveBuildRow = document.getElementById(DOM_PFX + '-row-liveBuild');
    const liveBuildEl  = document.getElementById(DOM_PFX + '-f-liveProdBuild');
    const serverVerRow = document.getElementById(DOM_PFX + '-row-serverVersion');
    const serverVerEl  = document.getElementById(DOM_PFX + '-f-serverVersion');
    if (_lastLiveBuilds && _lastLiveBuilds.prodBuild && liveBuildRow && liveBuildEl) {
      liveBuildEl.textContent = 'Build ' + _lastLiveBuilds.prodBuild;
      liveBuildEl.classList.remove('aouc-not-found');
      liveBuildRow.classList.remove('hidden');
    } else if (liveBuildRow) {
      liveBuildRow.classList.add('hidden');
    }
    if (_lastLiveBuilds && _lastLiveBuilds.serverVersion && serverVerRow && serverVerEl) {
      serverVerEl.textContent = _lastLiveBuilds.serverVersion;
      serverVerEl.classList.remove('aouc-not-found');
      serverVerRow.classList.remove('hidden');
    } else if (serverVerRow) {
      serverVerRow.classList.add('hidden');
    }
  }

  // ── Copy All ──────────────────────────────────────────────────────────────────

  function _copyAll() {
    const lines = [];
    if (_lastLiveBuilds) {
      if (_lastLiveBuilds.prodBuild)     lines.push('Live Prod Build: Build ' + _lastLiveBuilds.prodBuild);
      if (_lastLiveBuilds.serverVersion) lines.push('Studio Version: ' + _lastLiveBuilds.serverVersion);
    }
    const LABELS = {
      [DOM_PFX + '-f-id']:               'ID',
      [DOM_PFX + '-f-account']:          'Account',
      [DOM_PFX + '-f-instanceUrl']:      'Instance URL',
      [DOM_PFX + '-f-csm']:              'CSM',
      [DOM_PFX + '-f-currentBuild']:     'Build in TP',
      [DOM_PFX + '-f-upgradeBuild']:     'Target Build',
      [DOM_PFX + '-f-upgradeDate']:      'Upgrade Date',
      [DOM_PFX + '-f-upgradeTime']:      'Upgrade Time',
      [DOM_PFX + '-f-upgradeType']:      'Upgrade Type',
      [DOM_PFX + '-f-timeZone']:         'Time Zone',
      [DOM_PFX + '-f-sfId']:             'Salesforce ID',
      [DOM_PFX + '-f-statusInSF']:       'Status in SF',
      [DOM_PFX + '-f-status']:           'Status',
      [DOM_PFX + '-t-previousUpgrade']:  'Previous Upgrade',
      [DOM_PFX + '-t-currentUpgrade']:   'Current Upgrade',
      [DOM_PFX + '-t-daysSincePrev']:    'Days Since Prev.',
      [DOM_PFX + '-t-nextUpgrade']:      'Next Upgrade',
      [DOM_PFX + '-t-daysUntilNext']:    'Days Until Next',
      [DOM_PFX + '-t-upgradeFrequency']: 'Upgrade Frequency',
    };
    Object.keys(LABELS).forEach(function(id) {
      const el = document.getElementById(id);
      lines.push(LABELS[id] + ': ' + (el ? el.textContent : 'Not Found'));
    });
    const text = lines.join('\n');
    navigator.clipboard.writeText(text)
      .then(function() { _showCopyFeedback(); })
      .catch(function() {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        _showCopyFeedback();
      });
  }

  function _showCopyFeedback() {
    const fb = document.getElementById(DOM_PFX + '-copy-feedback');
    if (!fb) return;
    fb.classList.remove('hidden');
    setTimeout(function() { fb.classList.add('hidden'); }, 2500);
  }

  // ── Diagnose ──────────────────────────────────────────────────────────────────

  function _diagnose() {
    const count = Object.keys(_cache).length;
    const lines = ['Cache ready: ' + _cacheReady, 'Records: ' + count];
    if (count > 0) {
      const sample = Object.values(_cache)[0];
      lines.push('Sample keys: ' + Object.keys(sample.fields || {}).join(', '));
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(function() {});
    _setStatus('partial', 'Cache debug copied - ' + count + ' records');
    app().addLog('debug', PLUGIN_ID, 'Diagnose: ' + lines.join(' | '));
  }

  // ── UI helpers ────────────────────────────────────────────────────────────────

  function _showSearchSection() {
    const ss = document.getElementById(DOM_PFX + '-search-section');
    if (ss) ss.classList.remove('hidden');
  }

  function _setStatus(type, message) {
    const bar  = document.getElementById(DOM_PFX + '-status-bar');
    const text = document.getElementById(DOM_PFX + '-status-text');
    if (!bar || !text) return;
    bar.className = 'aouc-status-bar rc-plugin-status rc-plugin-status--' + (type === 'ok' ? 'success' : type === 'err' ? 'error' : type === 'partial' ? 'warning' : 'info');
    text.textContent = message;
  }

  function _esc(s) {
    if (app() && typeof app().esc === 'function') return app().esc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── HTML template ─────────────────────────────────────────────────────────────

  function _getHTML() {
    return `
      <!-- Action bar -->
      <div class="rc-plugin-action-bar" style="padding:10px 16px 0;">
        <button id="${DOM_PFX}-btn-refresh" class="rc-btn rc-btn--primary rc-btn--sm"
                title="Rebuild cache and re-run last search">&#8635; Refresh</button>
        <span class="rc-plugin-action-bar__spacer"></span>
        <button id="${DOM_PFX}-btn-diagnose" class="rc-btn rc-btn--ghost rc-btn--sm"
                title="Copy cache diagnostic data to clipboard">Debug</button>
      </div>

      <!-- Status bar -->
      <div id="${DOM_PFX}-status-bar" class="aouc-status-bar rc-plugin-status rc-plugin-status--info">
        <span id="${DOM_PFX}-status-text">Reading active tab...</span>
      </div>

      <!-- Search section -->
      <div id="${DOM_PFX}-search-section" class="rc-plugin-section hidden" style="padding:8px 16px 0;">
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="${DOM_PFX}-search-input" class="rc-input" type="text"
                 placeholder="Search account or instance URL..." autocomplete="off"
                 aria-label="Search account or instance URL" style="flex:1;">
          <button id="${DOM_PFX}-btn-search" class="rc-btn rc-btn--primary rc-btn--sm"
                  title="Search the Upgrade Requests board">Search</button>
        </div>
        <div id="${DOM_PFX}-search-results" class="aouc-search-results rc-plugin-list hidden" style="margin-top:6px;"></div>
      </div>

      <!-- Main content panel -->
      <div id="${DOM_PFX}-content" class="rc-plugin-body hidden" style="padding:12px 16px;">

        <!-- Request Details section -->
        <div class="rc-plugin-section">
          <div class="rc-plugin-section__header">
            <span class="rc-plugin-section__title">Request Details</span>
            <span id="${DOM_PFX}-env-badge" class="rc-badge rc-badge--blue" style="font-size:11px;"></span>
          </div>

          <!-- Stat tiles: ID · Account · Status -->
          <div class="rc-plugin-stats-row" style="margin-bottom:8px;">
            <div class="rc-plugin-stat">
              <span class="rc-plugin-stat__label">ID</span>
              <span class="rc-plugin-stat__value" id="${DOM_PFX}-f-id" style="font-family:monospace;">-</span>
            </div>
            <div class="rc-plugin-stat" style="flex:2;">
              <span class="rc-plugin-stat__label">Account</span>
              <span class="rc-plugin-stat__value" id="${DOM_PFX}-f-account">-</span>
            </div>
            <div class="rc-plugin-stat">
              <span class="rc-plugin-stat__label">Status</span>
              <span class="rc-plugin-stat__value aouc-status-cell" id="${DOM_PFX}-f-status">-</span>
            </div>
          </div>

          <!-- Detail fields as kv rows -->
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Instance URL</span>  <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-instanceUrl">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">CSM</span>            <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-csm">-</span></div>
          <div class="rc-plugin-kv hidden" id="${DOM_PFX}-row-liveBuild">
            <span class="rc-plugin-kv__key">Live Prod Build</span>
            <span class="rc-plugin-kv__value aouc-mono aouc-accent" id="${DOM_PFX}-f-liveProdBuild">-</span>
          </div>
          <div class="rc-plugin-kv hidden" id="${DOM_PFX}-row-serverVersion">
            <span class="rc-plugin-kv__key">Studio Version</span>
            <span class="rc-plugin-kv__value aouc-mono aouc-accent" id="${DOM_PFX}-f-serverVersion">-</span>
          </div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Build in TP</span>    <span class="rc-plugin-kv__value aouc-mono" id="${DOM_PFX}-f-currentBuild">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Target Build</span>   <span class="rc-plugin-kv__value aouc-mono" id="${DOM_PFX}-f-upgradeBuild">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Upgrade Date</span>   <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-upgradeDate">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Upgrade Time</span>   <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-upgradeTime">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Upgrade Type</span>   <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-upgradeType">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Time Zone</span>      <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-timeZone">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Salesforce ID</span>  <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-sfId">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Status in SF</span>   <span class="rc-plugin-kv__value" id="${DOM_PFX}-f-statusInSF">-</span></div>
        </div>

        <!-- Upgrade Timeline section -->
        <div class="rc-plugin-section">
          <div class="rc-plugin-section__header">
            <span class="rc-plugin-section__title">Upgrade Timeline</span>
          </div>
          <div class="rc-plugin-stats-row" style="margin-bottom:8px;">
            <div class="rc-plugin-stat">
              <span class="rc-plugin-stat__label">Days Since Prev.</span>
              <span class="rc-plugin-stat__value aouc-accent" id="${DOM_PFX}-t-daysSincePrev">-</span>
            </div>
            <div class="rc-plugin-stat">
              <span class="rc-plugin-stat__label">Days Until Next</span>
              <span class="rc-plugin-stat__value aouc-accent" id="${DOM_PFX}-t-daysUntilNext">-</span>
            </div>
            <div class="rc-plugin-stat">
              <span class="rc-plugin-stat__label">Frequency</span>
              <span class="rc-plugin-stat__value" id="${DOM_PFX}-t-upgradeFrequency">-</span>
            </div>
          </div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Previous Upgrade</span> <span class="rc-plugin-kv__value" id="${DOM_PFX}-t-previousUpgrade">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Current Upgrade</span>  <span class="rc-plugin-kv__value" id="${DOM_PFX}-t-currentUpgrade">-</span></div>
          <div class="rc-plugin-kv"><span class="rc-plugin-kv__key">Next Upgrade</span>     <span class="rc-plugin-kv__value" id="${DOM_PFX}-t-nextUpgrade">-</span></div>
        </div>

        <!-- Actions -->
        <div class="rc-plugin-action-bar" style="padding:0 0 8px;">
          <button id="${DOM_PFX}-btn-copy" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Copy all extracted fields to clipboard">&#10697; Copy All</button>
          <span id="${DOM_PFX}-copy-feedback" class="rc-badge rc-badge--green hidden" style="margin-left:8px;">Copied &#10003;</span>
        </div>
      </div>

      <!-- Error panel removed: failures are reported via ReplyCators notifications (app().addNotification) -->
    `;
  }

  // ── Self-registration ─────────────────────────────────────────────────────────
  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.ApptioOneUpgradeCalculator = plugin;

})();
