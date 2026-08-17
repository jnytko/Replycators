(function() {
  'use strict';

  const plugin = {
    id: 'com.replycators.cloudability-orgid',
    init,
    getState: () => cldState,
    refreshCache: refreshCache,
    clearCache: clearCache,
  };

  const CLD_STORAGE_KEY     = 'rc:plugin:com.replycators.cloudability-orgid:orgid-cache';
  const CLD_DETECTOR_SCRIPT = 'plugins/cloudability/content/cloudability-detector.js';
  const CLD_URL_PATTERN     = /^https?:\/\/([^/]+\.apptio\.com|[^/]+\.apps\.papt\.to)\/cloudability/i;

  const cldState = {
    orgId: null,
    orgName: null,
    retrievedAt: null,
    originDomain: null,
  };

  function app() { return window.ReplyCatorsApp; }
  function pluginEnabled() { return !(app().pluginStates?.[plugin.id]?.enabled === false); }

  function cldDomainOf(url) {
    try { return new URL(url).hostname; } catch (_) { return null; }
  }

  function cldSave() {
    chrome.storage.local.set({
      [CLD_STORAGE_KEY]: {
        orgId: cldState.orgId,
        orgName: cldState.orgName,
        retrievedAt: cldState.retrievedAt,
        originDomain: cldState.originDomain,
      },
    });
  }

  function findCloudabilityTab(callback) {
    // Return the ACTIVE Cloudability tab only - never a background tab.
    // If the user's active tab is not Cloudability, callback receives null
    // and retrieval is skipped entirely.
    chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }, windows => {
      for (const win of windows) {
        const active = (win.tabs || []).find(
          t => t.active && t.url && CLD_URL_PATTERN.test(t.url)
        );
        if (active) { callback(active); return; }
      }
      callback(null); // active tab is not Cloudability
    });
  }

  function cldClearState() {
    cldState.orgId = null;
    cldState.orgName = null;
    cldState.retrievedAt = null;
    cldState.originDomain = null;
  }

  function clearCache() {
    return new Promise(resolve => {
      chrome.storage.local.remove(CLD_STORAGE_KEY, function() {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message || 'Storage remove failed' });
          return;
        }
        cldClearState();
        cldShowUnavailable();
        resolve({ ok: true });
      });
    });
  }

  function refreshCache() {
    return new Promise(resolve => {
      findCloudabilityTab(tab => {
        if (!tab) {
          resolve({ ok: false, error: 'No active Cloudability tab detected.' });
          return;
        }
        let settled = false;
        function finish(result) {
          if (settled) return;
          settled = true;
          resolve(result);
        }
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CLD_DETECTOR_SCRIPT] })
          .catch(() => null)
          .finally(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'RC_GET_CLOUDABILITY_ORG' }, response => {
              const lastErr = chrome.runtime.lastError;
              if (lastErr || !response) {
                finish({ ok: false, error: lastErr ? lastErr.message : 'No response from Cloudability detector' });
                return;
              }
              if (response.success && response.id) {
                const id = String(response.id).trim();
                const nm = response.name ? String(response.name).trim() : null;
                const domain = cldDomainOf(tab.url);
                cldState.orgId = id;
                cldState.orgName = nm;
                cldState.retrievedAt = Date.now();
                cldState.originDomain = domain;
                chrome.storage.local.set({
                  [CLD_STORAGE_KEY]: {
                    orgId: cldState.orgId,
                    orgName: cldState.orgName,
                    retrievedAt: cldState.retrievedAt,
                    originDomain: cldState.originDomain,
                  },
                }, function() {
                  if (chrome.runtime.lastError) {
                    finish({ ok: false, error: chrome.runtime.lastError.message || 'Storage write failed' });
                    return;
                  }
                  cldUpdateUI('live');
                  finish({ ok: true, updatedAt: cldState.retrievedAt });
                });
              } else {
                finish({ ok: false, error: response.error || 'OrgID not received from detector' });
              }
            });
          });
      });
    });
  }

  function cldUpdateUI(source) {
    const has = !!cldState.orgId;
    const orgIdEl      = document.getElementById('cld-orgid-value');
    const orgNameEl    = document.getElementById('cld-orgname-value');
    const copyBtn      = document.getElementById('cld-copy-btn');
    const refreshBtn   = document.getElementById('cld-refresh-btn');
    const inclBtn      = document.getElementById('cld-include-diag-btn');
    const statusEl     = document.getElementById('cld-result-status');
    const statusBadge  = document.getElementById('cld-status-badge');
    const sourceLabel  = document.getElementById('cld-source-label');
    const retrievedAt  = document.getElementById('cld-retrieved-at');

    if (orgIdEl) {
      orgIdEl.textContent = has ? cldState.orgId : 'No active Cloudability tab detected';
      orgIdEl.className   = 'cld-orgid-display' + (has ? ' cld-orgid-display--success' : ' cld-orgid-display--empty');
    }
    if (orgNameEl) orgNameEl.textContent = has ? (cldState.orgName || '-') : '-';
    if (copyBtn) copyBtn.disabled = !has;
    if (inclBtn) inclBtn.disabled = !has;
    if (refreshBtn) refreshBtn.disabled = false;

    if (statusBadge) {
      statusBadge.textContent = has ? (source === 'cache' ? 'Cached' : 'Live') : 'No active tab';
      statusBadge.className = 'rc-badge ' + (has ? 'rc-badge--green' : 'rc-badge--amber');
    }
    if (sourceLabel) {
      sourceLabel.textContent = has
        ? (source === 'cache' ? 'Source: cache' : 'Source: Cloudability settings API')
        : 'Source: -';
    }
    if (retrievedAt) {
      if (has && cldState.retrievedAt) {
        retrievedAt.textContent = 'Last retrieved: ' + new Date(cldState.retrievedAt).toLocaleString();
        retrievedAt.style.display = 'block';
      } else {
        retrievedAt.style.display = 'none';
      }
    }
    if (statusEl) statusEl.style.display = 'none';

    const wOrgId   = document.getElementById('cld-widget-orgid');
    const wOrgName = document.getElementById('cld-widget-orgname');
    const wCopy    = document.getElementById('cld-widget-copy');
    const wRefresh = document.getElementById('cld-widget-refresh');
    if (wOrgId) {
      wOrgId.textContent = has ? cldState.orgId : 'No active Cloudability tab detected';
      wOrgId.className = 'cld-orgid-display' + (has ? ' cld-orgid-display--success' : ' cld-orgid-display--empty');
    }
    if (wOrgName) wOrgName.textContent = has ? (cldState.orgName || '-') : '-';
    if (wCopy) wCopy.disabled = !has;
    if (wRefresh) wRefresh.disabled = false;
  }

  function cldRetrieve(silent) {
    if (!pluginEnabled()) {
      app().addLog('warn', plugin.id, 'Plugin is disabled - retrieval skipped');
      return;
    }

    const refreshBtn       = document.getElementById('cld-refresh-btn');
    const widgetRefreshBtn = document.getElementById('cld-widget-refresh');
    const statusEl         = document.getElementById('cld-result-status');
    const badge            = document.getElementById('cld-status-badge');

    if (refreshBtn) refreshBtn.disabled = true;
    if (widgetRefreshBtn) widgetRefreshBtn.disabled = true;
    if (badge) { badge.textContent = 'Retrieving…'; badge.className = 'rc-badge rc-badge--blue'; }
    if (statusEl) statusEl.style.display = 'none';

    app().addLog('info', plugin.id, 'OrgID retrieval started');

    findCloudabilityTab(tab => {
      if (!tab) {
        const msg = 'No active Cloudability tab detected. Switch to a Cloudability tab and try again.';
        app().addLog('warn', plugin.id, msg);
        if (!silent) {
          app().addNotification('Cloudability OrgID - No Active Tab', msg, 'warning', plugin.id);
          if (statusEl) app().setStatus(statusEl, msg, 'warning');
        }
        cldClearState();
        cldShowUnavailable();
        // Refresh buttons must stay enabled so the user can retry after switching tabs.
        if (refreshBtn) refreshBtn.disabled = false;
        if (widgetRefreshBtn) widgetRefreshBtn.disabled = false;
        return;
      }

      app().addLog('info', plugin.id, 'Tab found: tabId=' + tab.id + ' ' + (tab.title || tab.url));

      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [CLD_DETECTOR_SCRIPT] })
        .catch(err => app().addLog('debug', plugin.id, 'Detector inject note (already active?): ' + String(err)))
        .finally(() => {
          chrome.tabs.sendMessage(tab.id, { type: 'RC_GET_CLOUDABILITY_ORG' }, response => {
            const lastErr = chrome.runtime.lastError;

            if (lastErr || !response) {
              const msg = lastErr ? lastErr.message : 'No response from Cloudability detector';
              app().addLog('error', plugin.id, 'OrgID retrieval failed: ' + msg);
              if (!silent) app().addNotification('Cloudability OrgID - Failed', msg, 'error', plugin.id);
              if (statusEl) app().setStatus(statusEl, msg, 'error');
              if (refreshBtn) refreshBtn.disabled = false;
              if (widgetRefreshBtn) widgetRefreshBtn.disabled = false;
              cldClearState();
              cldShowUnavailable();
              if (badge) {
                badge.textContent = 'Failed'; badge.className = 'rc-badge rc-badge--red';
              }
              return;
            }

            if (response.success && response.id) {
              const id = String(response.id).trim();
              const nm = response.name ? String(response.name).trim() : null;
              const domain = cldDomainOf(tab.url);
              cldState.orgId = id;
              cldState.orgName = nm;
              cldState.retrievedAt = Date.now();
              cldState.originDomain = domain;
              cldSave();
              app().addLog('info', plugin.id, 'OrgID retrieved: ' + id + (nm ? ' (' + nm + ')' : '') + ' [domain: ' + (domain || 'unknown') + ']');
              app().addNotification('Cloudability OrgID Retrieved', 'OrgID: ' + id + (nm ? ' | Org: ' + nm : ''), 'success', plugin.id);
              cldUpdateUI('live');
            } else {
              const msg = response.error || 'OrgID not received from detector';
              const isTimeout = /timeout/i.test(msg);
              app().addLog(isTimeout ? 'warn' : 'error', plugin.id, 'OrgID retrieval failed: ' + msg);
              cldClearState();
              cldShowUnavailable();
              if (!silent) app().addNotification('Cloudability OrgID - ' + (isTimeout ? 'Timeout' : 'Failed'), msg, isTimeout ? 'warning' : 'error', plugin.id);
              if (statusEl) app().setStatus(statusEl, msg, isTimeout ? 'warning' : 'error');
              if (badge) { badge.textContent = isTimeout ? 'Timeout' : 'Failed'; badge.className = 'rc-badge rc-badge--red'; }
            }

            if (refreshBtn) refreshBtn.disabled = false;
            if (widgetRefreshBtn) widgetRefreshBtn.disabled = false;
          });
        });
    });
  }

  function cldShowUnavailable() {
    // Display a clear "unavailable" state in the UI when no Cloudability context exists.
    // This replaces stale cached data from previous sessions so users are not misled.
    const orgIdEl     = document.getElementById('cld-orgid-value');
    const orgNameEl   = document.getElementById('cld-orgname-value');
    const copyBtn     = document.getElementById('cld-copy-btn');
    const inclBtn     = document.getElementById('cld-include-diag-btn');
    const refreshBtn  = document.getElementById('cld-refresh-btn');
    const statusBadge = document.getElementById('cld-status-badge');
    const sourceLabel = document.getElementById('cld-source-label');
    const retrievedAt = document.getElementById('cld-retrieved-at');
    const wOrgId      = document.getElementById('cld-widget-orgid');
    const wOrgName    = document.getElementById('cld-widget-orgname');
    const wCopy       = document.getElementById('cld-widget-copy');
    const wRefresh    = document.getElementById('cld-widget-refresh');

    if (orgIdEl)   { orgIdEl.textContent = 'No active Cloudability tab detected'; orgIdEl.className = 'cld-orgid-display cld-orgid-display--empty'; }
    if (orgNameEl) orgNameEl.textContent = '-';
    if (copyBtn)   copyBtn.disabled  = true;
    if (inclBtn)   inclBtn.disabled  = true;
    // Refresh must remain enabled - user needs it to retry after switching to a Cloudability tab.
    if (refreshBtn)  refreshBtn.disabled  = false;
    if (wRefresh)    wRefresh.disabled    = false;
    if (statusBadge) { statusBadge.textContent = 'No active tab'; statusBadge.className = 'rc-badge rc-badge--amber'; }
    if (sourceLabel) sourceLabel.textContent = 'Source: -';
    if (retrievedAt) retrievedAt.style.display = 'none';
    if (wOrgId)   { wOrgId.textContent = 'No active Cloudability tab detected'; wOrgId.className = 'cld-orgid-display cld-orgid-display--empty'; }
    if (wOrgName) wOrgName.textContent = '-';
    if (wCopy)    wCopy.disabled = true;
  }

  // Tracks whether the UI event listeners have already been bound (to avoid
  // re-binding on repeated navigate calls without a page reload).
  let _cldListenersBound    = false;
  let _cldMsgListenerBound  = false;

  function init() {
    if (!pluginEnabled()) {
      cldClearState();
      cldShowUnavailable();
      app().addLog('info', plugin.id, 'Cloudability OrgID plugin disabled');
      return;
    }

    // Bind UI event listeners once at init (no async I/O here).
    if (!_cldListenersBound) {
      _cldListenersBound = true;

      document.getElementById('cld-refresh-btn')?.addEventListener('click', () => cldRetrieve(false));
      document.getElementById('cld-widget-refresh')?.addEventListener('click', () => cldRetrieve(false));

      document.getElementById('cld-copy-btn')?.addEventListener('click', async () => {
        if (!cldState.orgId) return;
        try {
          await navigator.clipboard.writeText(cldState.orgId);
          app().addLog('info', plugin.id, 'OrgID copied to clipboard: ' + cldState.orgId);
          app().addNotification('Cloudability OrgID', 'OrgID copied: ' + cldState.orgId, 'info', plugin.id);
          // addNotification() calls showToast() internally - no separate showToast needed
        } catch (e) {
          app().addLog('error', plugin.id, 'Clipboard write failed: ' + String(e));
          app().addNotification('Cloudability OrgID', 'Clipboard write failed.', 'error', plugin.id);
        }
      });

      document.getElementById('cld-include-diag-btn')?.addEventListener('click', () => {
        if (!cldState.orgId) return;
        app().addLog('info', plugin.id, 'OrgID added to diagnostic context: ' + cldState.orgId);
        app().addNotification('Cloudability OrgID', 'OrgID included in diagnostics: ' + cldState.orgId, 'info', plugin.id);
        // Navigate to diagnostics - loadDiagnostics() is called automatically by navigateTo()
        app().navigateTo('diagnostics');
        // addNotification() already showed the toast above
      });

      document.getElementById('cld-widget-copy')?.addEventListener('click', async () => {
        if (!cldState.orgId) return;
        try {
          await navigator.clipboard.writeText(cldState.orgId);
          app().addNotification('Cloudability OrgID', 'OrgID copied: ' + cldState.orgId, 'info', plugin.id);
        } catch (e) {
          app().addNotification('Cloudability OrgID', 'Clipboard write failed.', 'error', plugin.id);
        }
      });
    }

    // ── Background push listener (RC_CLD_ORG_UPDATE) ─────────────────────────
    // background.js broadcasts RC_CLD_ORG_UPDATE whenever it successfully
    // retrieves or receives a proactive push for the OrgID.  We listen here so
    // both the plugin view AND the dashboard widget update automatically - with
    // no manual refresh and no polling.
    // Bound once at plugin init; the listener survives view switches.
    if (!_cldMsgListenerBound) {
      _cldMsgListenerBound = true;
      chrome.runtime.onMessage.addListener((msg) => {
        if (!msg || msg.type !== 'RC_CLD_ORG_UPDATE' || !msg.payload?.id) return;
        const d = msg.payload;
        cldState.orgId        = String(d.id).trim();
        cldState.orgName      = d.name ? String(d.name).trim() : null;
        cldState.retrievedAt  = d.retrievedAt || Date.now();
        cldState.originDomain = null;
        cldUpdateUI('live');
        app().addLog('info', plugin.id, 'OrgID auto-updated from background: ' + cldState.orgId);
      });
    }

    // ── Startup: validate active tab first, then show data or unavailable ────
    // Always check whether the active tab is a Cloudability tab on startup so
    // the widget reflects reality immediately - matching SF Case Extractor behaviour.
    //
    // 1. Read the cache into memory only (no UI update yet).
    //    CS-FV1-001 fix: accept both plugin-writer schema (orgId) and
    //    background-writer schema (id).
    // 2. Check the active tab:
    //    If YES (Cloudability tab active) → run a live retrieval so the widget
    //    always reflects the CURRENT active org, not a potentially stale cached org.
    //    If NO (non-Cloudability tab) → call cldShowUnavailable() so the widget
    //    shows "No active Cloudability tab detected" and never displays stale data.
    //    The RC_CLD_ORG_UPDATE listener will update when the user switches tabs.
    chrome.storage.local.get([CLD_STORAGE_KEY], result => {
      const cached = result[CLD_STORAGE_KEY];
      const cachedId = cached?.orgId || cached?.id || null;
      if (cachedId && !cldState.orgId) {
        // Restore into memory only - do NOT call cldUpdateUI here.
        // The tab check below decides whether to show data or the unavailable state.
        cldState.orgId        = String(cachedId).trim();
        cldState.orgName      = cached.orgName || cached.name || null;
        cldState.retrievedAt  = cached.retrievedAt || null;
        cldState.originDomain = cached.originDomain || null;
        app().addLog('info', plugin.id, 'OrgID restored from cache (memory only): ' + cldState.orgId);
      }

      findCloudabilityTab(tab => {
        if (!tab) {
          // No active Cloudability tab - show unavailable state regardless of cache.
          // This prevents stale OrgID from a previous session misleading the user.
          cldClearState();
          cldShowUnavailable();
          app().addLog('info', plugin.id, 'No active Cloudability tab on startup - showing unavailable state');
          return;
        }
        // Active Cloudability tab found - trigger live retrieval.
        app().addLog('info', plugin.id, 'Cloudability tab active on startup - triggering live retrieval');
        cldRetrieve(true); // silent=true; will call cldUpdateUI('live') on success
      });
    });

    app().addLog('info', plugin.id, 'Cloudability OrgID plugin initialised');
  }

  // onNavigate: called by dashboard.js when the user opens the Cloudability view.
  // Triggers a fresh live retrieval each time the plugin page is opened.
  function onNavigate() {
    if (!pluginEnabled()) return;
    findCloudabilityTab(tab => {
      if (!tab) {
        // No active Cloudability tab - always show the "no active tab" badge so the
        // user clearly sees the current detection state, even if a cached value exists.
        // The cached orgId display (if any) is also cleared to avoid showing stale data.
        cldShowUnavailable();
        app().addLog('info', plugin.id, 'No active Cloudability tab found on navigate');
        return;
      }
      // Active Cloudability tab found - always do a live retrieval when the plugin
      // page opens so the value always reflects the current active organisation.
      cldRetrieve(true);
    });
  }

  /**
   * hasActiveCloudabilityTab(callback)
   * Calls callback(true) when an active Cloudability tab exists, callback(false) otherwise.
   * Used by the Diagnostics Pre-flight Check - keeps the URL-matching logic in one place.
   */
  function hasActiveCloudabilityTab(callback) {
    findCloudabilityTab(tab => callback(tab !== null));
  }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.CloudabilityOrgId = {
    ...plugin,
    onNavigate,
    hasActiveCloudabilityTab,
  };
})();