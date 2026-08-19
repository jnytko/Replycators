/**
 * ApptioOne Upgrade Calculator
 * plugins/apptioone-upgrade-calculator.js
 *
 * Plugin ID:  com.replycators.apptioone-upgrade-calculator
 * Version:    1.0.1
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

  const STORAGE_KEY = 'rc:plugin:com.replycators.apptioone-upgrade-calculator:last-calc';

  // Cache: map of entityId (string) -> { fields, timeline }
  // Populated by _buildCache(query). Scoped to the last search query.
  // Persisted to chrome.storage.local so it survives extension close/reopen.
  let _cache             = {};
  let _cacheReady        = false;
  let _cacheQuery        = '';   // query that produced the current cache
  let _cachedCustomer    = '';   // display label for the cached customer (account name)
  // In-progress cache build promise - shared by concurrent callers.
  let _cacheBuildPromise = null;

  // Live-builds data read from the active customer env tab
  let _lastEnv           = null;   // hostname of the active env tab
  let _lastLiveBuilds    = null;
  let _envTabId          = null;

  // Last search results array
  let _lastSearchResults = [];

  // Cancellation token for UI callbacks (NOT used inside _buildCache).
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

  // ── Storage persistence ───────────────────────────────────────────────────────

  function _saveToStorage() {
    if (!_cacheReady || Object.keys(_cache).length === 0) return;
    const payload = {
      cache:           _cache,
      cacheQuery:      _cacheQuery,
      cachedCustomer:  _cachedCustomer,
      savedAt:         Date.now(),
    };
    chrome.storage.local.set({ [STORAGE_KEY]: payload }, function() {
      if (chrome.runtime.lastError) {
        app().addLog('warn', PLUGIN_ID, 'Could not persist cache: ' + chrome.runtime.lastError.message);
      }
    });
  }

  function _restoreFromStorage(callback) {
    chrome.storage.local.get([STORAGE_KEY], function(data) {
      const saved = data[STORAGE_KEY];
      if (saved && saved.cache && Object.keys(saved.cache).length > 0) {
        _cache          = saved.cache;
        _cacheQuery     = saved.cacheQuery  || '';
        _cachedCustomer = saved.cachedCustomer || _cacheQuery;
        _cacheReady     = true;
        app().addLog('info', PLUGIN_ID, 'Cache restored: ' + Object.keys(_cache).length + ' records for "' + _cacheQuery + '"');
      }
      if (callback) callback();
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  function init() {
    // Widget button (exists in static HTML at init time)
    document.getElementById(DOM_PFX + '-widget-open-btn')?.addEventListener('click', function() {
      app().navigateTo(VIEW_ID);
    });
    // Restore persisted cache so it is available before the view is opened
    _restoreFromStorage(null);
  }

  function onNavigate() {
    app().addLog('info', PLUGIN_ID, 'ApptioOne Upgrade Calculator opened');
    _render();
    _docClickListener = function(e) {
      // The native <select> manages its own open/close; nothing to do here.
      // Keep the listener registered so onLeave can cleanly remove it.
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
    container.querySelector('#' + DOM_PFX + '-btn-load-cached')?.addEventListener('click', _loadCachedResults);
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
    _showSearchSection();
    _updateCachedCustomerRow();

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        app().addLog('warn', PLUGIN_ID, 'tabs.query error: ' + chrome.runtime.lastError.message);
        _setStatus(_cacheReady ? 'ok' : 'info', _cacheReady ? 'Cache ready - or enter a new search.' : 'Open a CT/TBM Studio tab, or search below.');
        _updateActiveTabRow(null);
        return;
      }
      const tab    = (tabs || [])[0];
      const tabUrl = tab ? (tab.url || '') : '';
      const envInfo = _extractEnvInfo(tabUrl);

      if (envInfo) {
        _envTabId       = tab.id;
        _lastLiveBuilds = null;
        _lastEnv        = envInfo.hostname;
        _updateActiveTabRow(envInfo);
        _setStatus('ok', 'Active: ' + envInfo.displayName + ' - press Search or use cached data above.');
        _fetchLiveBuilds(tab.id).then(function(builds) {
          if (builds) {
            _lastLiveBuilds = builds;
            const parts = [];
            if (builds.prodBuild)     parts.push('Build ' + builds.prodBuild);
            if (builds.serverVersion) parts.push('Ver: ' + builds.serverVersion);
            const detail = parts.length > 0 ? ' (' + parts.join(' · ') + ')' : '';
            _setStatus('ok', 'Active: ' + envInfo.displayName + detail);
          }
        });
      } else {
        _updateActiveTabRow(null);
        _setStatus(_cacheReady ? 'ok' : 'info', _cacheReady ? 'Cache ready - or enter a new search.' : 'Open a CT/TBM Studio tab, or search below.');
      }
    });
  }

  function _updateCachedCustomerRow() {
    const row   = document.getElementById(DOM_PFX + '-cached-row');
    const label = document.getElementById(DOM_PFX + '-cached-label');
    const btn   = document.getElementById(DOM_PFX + '-btn-load-cached');
    if (!row) return;
    if (_cacheReady && _cachedCustomer) {
      if (label) label.textContent = _cachedCustomer;
      row.classList.remove('hidden');
      if (btn) btn.disabled = false;
    } else {
      row.classList.add('hidden');
    }
  }

  function _updateActiveTabRow(envInfo) {
    const row   = document.getElementById(DOM_PFX + '-tab-row');
    const input = document.getElementById(DOM_PFX + '-search-input');
    if (!row) return;
    if (envInfo) {
      if (input) input.value = envInfo.hostname;
      row.classList.remove('hidden');
    } else {
      if (input) input.value = '';
      row.classList.remove('hidden'); // always show search row
    }
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
  // _buildCache(query):
  //   1. Opens a temporary background tab to the board URL.
  //   2. Waits for the content script to respond (static manifest injection).
  //   3. Waits for board rows to appear.
  //   4. Sends aouc:searchAndExtract with the query — extracts only matching rows.
  //   5. Stores results in _cache keyed by entity ID.
  //   6. Closes the temporary tab immediately.
  //
  // Only rows matching the search query are extracted, keeping the payload small.
  // Concurrent calls with the same pending promise share the in-flight result.

  function _buildCache(query) {
    if (_cacheBuildPromise) return _cacheBuildPromise;

    _cache      = {};
    _cacheReady = false;

    _setStatus('info', 'Opening Upgrade Requests board...');
    app().addLog('info', PLUGIN_ID, 'Cache build started for query: ' + query);

    let tempTabId = null;

    _cacheBuildPromise = chrome.tabs.create({ url: BOARD_URL, active: false })
      .then(function(tab) {
        tempTabId = tab.id;
        _setStatus('info', 'Loading board - please wait...');
        return _waitForTabLoad(tempTabId, 60000);
      })
      .then(function() {
        _setStatus('info', 'Waiting for board to become ready...');
        return _waitForContentScript(tempTabId, 60000);
      })
      .then(function(ready) {
        if (!ready) {
          _toast('warning', 'Upgrade Calculator', 'Board did not respond. Try again.');
          return false;
        }
        _setStatus('info', 'Waiting for board rows to render...');
        return _waitForRowsPromise(tempTabId, 3, 60000);
      })
      .then(function(rowCount) {
        if (rowCount === false) return false;
        if (!rowCount) {
          _toast('warning', 'Upgrade Calculator', 'Board rows did not appear. Try again.');
          return false;
        }
        _setStatus('info', 'Searching for "' + query + '"...');
        app().addLog('info', PLUGIN_ID, 'Board ready (' + rowCount + ' rows) - running searchAndExtract');
        return new Promise(function(resolve) {
          chrome.tabs.sendMessage(
            tempTabId,
            { action: 'aouc:searchAndExtract', query: query },
            function(resp) {
              if (chrome.runtime.lastError) {
                app().addLog('warn', PLUGIN_ID, 'searchAndExtract error: ' + chrome.runtime.lastError.message);
                resolve(null);
              } else {
                resolve(resp);
              }
            }
          );
        });
      })
      .then(function(resp) {
        app().addLog('info', PLUGIN_ID,
          'searchAndExtract response: success=' + (resp && resp.success) +
          ' records=' + (resp && resp.data && resp.data.records ? resp.data.records.length : 'n/a') +
          (resp && resp.error ? ' error=' + resp.error : '')
        );
        if (!resp || !resp.success || !resp.data) {
          const errMsg = (resp && resp.error) ? resp.error : 'no response';
          _toast('warning', 'Upgrade Calculator', 'Search failed: ' + errMsg + '. Try again.');
          return false;
        }
        const records = resp.data.records || [];
        if (records.length === 0) {
          // No error - simply no results for this query
          _cacheReady = true;
          app().addLog('info', PLUGIN_ID, 'No records matched query "' + query + '"');
          return true;
        }
        records.forEach(function(rec) {
          if (rec.id) _cache[String(rec.id)] = { fields: rec, timeline: rec._timeline || {} };
        });
        _cacheReady     = true;
        // Pick the most representative account name for display
        _cachedCustomer = records[0].account || query;
        app().addLog('info', PLUGIN_ID, 'Cache built: ' + Object.keys(_cache).length + ' records for "' + query + '"');
        _saveToStorage();
        return true;
      })
      .catch(function(err) {
        const msg = err && err.message ? err.message : String(err);
        app().addLog('error', PLUGIN_ID, 'Cache build failed: ' + msg);
        _toast('error', 'Upgrade Calculator', 'Could not load data: ' + msg);
        return false;
      })
      .then(function(result) {
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

  // Poll until the content script responds to a ping, or timeoutMs elapses.
  // No executeScript — the static manifest declaration handles injection.
  function _waitForContentScript(tabId, timeoutMs) {
    return new Promise(function(resolve) {
      const deadline = Date.now() + (timeoutMs || 30000);
      (function probe() {
        chrome.tabs.sendMessage(tabId, { action: 'aouc:ping' }, function(resp) {
          if (!chrome.runtime.lastError && resp && resp.ok) { resolve(true); return; }
          if (Date.now() >= deadline) { resolve(false); return; }
          setTimeout(probe, 1500);
        });
      }());
    });
  }

  // Poll getAllRows in the content script until minRows appear, or timeoutMs elapses.
  // Returns the row count (number) on success, or false on timeout/error.
  function _waitForRowsPromise(tabId, minRows, timeoutMs) {
    return new Promise(function(resolve) {
      const deadline = Date.now() + (timeoutMs || 30000);
      (function poll() {
        chrome.tabs.sendMessage(tabId, { action: 'aouc:rowCount' }, function(resp) {
          if (chrome.runtime.lastError) {
            if (Date.now() >= deadline) { resolve(false); return; }
            setTimeout(poll, 1500);
            return;
          }
          const n = (resp && resp.rowCount) || 0;
          if (n >= minRows) { resolve(n); return; }
          if (Date.now() >= deadline) { resolve(n > 0 ? n : false); return; }
          setTimeout(poll, 1500);
        });
      }());
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

    // Cache hit: same query already resolved
    if (_cacheReady && _cacheQuery === query) {
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

    // Different query or cache empty - rebuild for this query
    _cacheBuildPromise = null;
    _cache      = {};
    _cacheReady = false;
    _cacheQuery = query;

    sr.innerHTML = '<div class="aouc-search-hint">Opening board... this may take ~30s the first time</div>';
    sr.classList.remove('hidden');
    _setStatus('info', 'Loading board data...');

    _buildCache(query)
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

    if (results.length === 1) {
      // Single result: load directly, no picker needed
      sr.classList.add('hidden');
      _loadById(results[0].id);
      return;
    }

    // Populate the native <select> — the browser handles dropdown/dismiss behaviour
    sr.innerHTML = '';
    // Placeholder prompt option
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = results.length + ' results — pick one...';
    prompt.disabled = true;
    prompt.selected = true;
    sr.appendChild(prompt);

    results.forEach(function(r) {
      const opt = document.createElement('option');
      opt.value = r.id;
      const date = r.upgradeDate || '';
      const id   = r.id ? '#' + r.id : '';
      opt.textContent = (r.account || 'Unknown') + (date ? '  \u00B7  ' + date : '') + (id ? '  ' + id : '');
      sr.appendChild(opt);
    });

    sr.classList.remove('hidden');

    // One-time change handler: load on pick, then hide and reset the select
    function onPick() {
      const entityId = sr.value;
      if (!entityId) return;
      sr.removeEventListener('change', onPick);
      const chosen = results.find(function(r) { return String(r.id) === String(entityId); });
      const si = document.getElementById(DOM_PFX + '-search-input');
      if (si && chosen) si.value = chosen.account || chosen.instanceUrl || si.value;
      sr.classList.add('hidden');
      sr.innerHTML = '';
      _loadById(entityId);
    }
    sr.addEventListener('change', onPick);
  }

  // ── Load cached customer results (from persistent storage) ───────────────────

  function _loadCachedResults() {
    if (!_cacheReady) return;
    const results = _cacheSearch(_cacheQuery);
    if (results.length === 0) {
      _setStatus('warn', 'No results in cache for "' + _cacheQuery + '"');
      return;
    }
    _showResultsList(results);
    _setStatus('ok', results.length + ' cached result(s) for "' + (_cachedCustomer || _cacheQuery) + '"');
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
    _cacheBuildPromise = null;
    _cache             = {};
    _cacheReady        = false;

    _setStatus('info', 'Rebuilding cache...');

    const query = _lastEnv || (function() {
      const si = document.getElementById(DOM_PFX + '-search-input');
      return si ? si.value.trim() : '';
    }());

    _buildCache(query)
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
            _setStatus('ok', 'No results for "' + query + '" after refresh.');
          }
        } else {
          _setStatus('ok', 'Ready - enter a search query below.');
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
      <div id="${DOM_PFX}-search-section" class="rc-plugin-section hidden" style="padding:6px 16px 6px;">

        <!-- Row 1: Cached customer (hidden until cache is populated) -->
        <div id="${DOM_PFX}-cached-row" class="hidden"
             style="display:flex;align-items:center;gap:6px;margin-bottom:5px;
                    padding:5px 8px;border-radius:4px;background:var(--rc-surface,#1e2128);
                    border:1px solid var(--rc-border,#2e3340);">
          <span style="font-size:11px;color:var(--rc-muted,#8b929e);white-space:nowrap;">Cached:</span>
          <span id="${DOM_PFX}-cached-label" class="rc-plugin-kv__value"
                style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;"></span>
          <button id="${DOM_PFX}-btn-load-cached" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Show cached results for this customer" style="white-space:nowrap;">Show</button>
        </div>

        <!-- Row 2: Active tab / manual search -->
        <div id="${DOM_PFX}-tab-row" style="display:flex;gap:6px;align-items:center;">
          <input id="${DOM_PFX}-search-input" class="rc-input" type="text"
                 placeholder="Search account or instance URL..." autocomplete="off"
                 aria-label="Search account or instance URL" style="flex:1;">
          <button id="${DOM_PFX}-btn-search" class="rc-btn rc-btn--primary rc-btn--sm"
                  title="Search the Upgrade Requests board">Search</button>
        </div>

        <!-- Result picker (native select, appears below search row) -->
        <select id="${DOM_PFX}-search-results" class="rc-input hidden" size="1"
                aria-label="Select an upgrade request"
                style="width:100%;margin-top:4px;cursor:pointer;"></select>
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
