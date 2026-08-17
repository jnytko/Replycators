/**
 * cloudability-detector.js
 * ReplyCators — CloudabilityOrgId Plugin
 *
 * Runs in the ISOLATED world (document_end) on:
 *   *://*.apptio.com/cloudability*
 *   *://*.apps.papt.to/cloudability*
 *
 * Also injected on-demand by OrgIdBackgroundService for tabs already open.
 * Idempotent guard: window.__rcCldDetector.
 *
 * Background enrichment:
 *   When the MAIN-world interceptor fires CLOUDABILITY_ORG_DATA on page load
 *   (e.g. the Cloudability SPA calls the settings endpoint during its normal
 *   startup), this script catches it and proactively notifies the background
 *   service worker via chrome.runtime.sendMessage({ type: 'RC_CLD_ORG_READY' }).
 *   The service worker caches the result and publishes it to all consumers
 *   automatically — no user action needed.
 *
 *   The existing RC_GET_CLOUDABILITY_ORG pull path is preserved as a fallback
 *   for on-demand retrieval and manual refresh.
 */
(function () {
  'use strict';

  // ── Idempotent guard ─────────────────────────────────────────────────────────
  if (window.__rcCldDetector) {
    // Already running — nothing to do.
    return;
  }
  window.__rcCldDetector = true;

  /** Session-scoped cache — populated when the interceptor fires. */
  var cachedOrg = null;   // { id, name }

  // ─── Helper: push OrgID to background service worker ────────────────────────
  //
  // Called whenever we acquire a fresh OrgID (either from the interceptor firing
  // organically, or from an explicit RC_GET_CLOUDABILITY_ORG request).
  // The service worker deduplicates and caches, so it is safe to call multiple times.
  //
  function pushOrgToBackground(id, name) {
    if (!id) return;
    try {
      chrome.runtime.sendMessage(
        { type: 'RC_CLD_ORG_READY', payload: { id: id, name: name || '' } },
        function () {
          // Swallow "no listener" error that occurs during background SW startup.
          if (chrome.runtime.lastError) { /* intentionally ignored */ }
        }
      );
    } catch (_) {
      // Extension context may have been invalidated (page unload, etc.).
    }
  }

  // ── Receive CLOUDABILITY_ORG_DATA from the MAIN-world interceptor ────────────
  //
  // This fires whenever the Cloudability SPA calls /v3/internal/organization/settings
  // — including during the SPA's own startup sequence.  We catch it here and push
  // the data proactively to the background without waiting for any user action.
  //
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    var d = event.data;
    if (!d || d.type !== 'CLOUDABILITY_ORG_DATA') return;

    var org = d.data || {};
    var id  = String(org.id  || '').trim();
    var nm  = String(org.name || '').trim();

    if (id) {
      var isNew = !cachedOrg || cachedOrg.id !== id;
      cachedOrg = { id: id, name: nm };

      // Signal any waiting RC_GET_CLOUDABILITY_ORG handler
      window.dispatchEvent(new CustomEvent('__rcOrgReady'));

      // Proactive push — notify the background enrichment service automatically.
      // This is the key behaviour change: OrgID is pushed without any user action.
      if (isNew) {
        pushOrgToBackground(id, nm);
      }
    }
  });

  // ── Message listener (background → content via chrome.tabs.sendMessage) ──────
  //
  // Pull path — used when the background service explicitly requests OrgID
  // (e.g. on-demand retrieve or manual refresh from the UI).
  //
  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || msg.type !== 'RC_GET_CLOUDABILITY_ORG') return false;

    // navigate=false is set by the background automated-enrichment path (RC-CLD-001).
    // When false, the detector MUST NOT touch window.location.hash.  If no cached
    // OrgID is available it responds immediately with success:false so the background
    // can fall back gracefully.  Hash navigation is reserved for explicit user-initiated
    // refresh (navigate=true, the default).
    var allowNavigate = (msg.navigate !== false);

    var resolved   = false;
    var prevHash   = window.location.hash;
    var onSettings = (prevHash === '#/settings');

    function finish(result) {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('__rcOrgReady', onOrgReady);
      clearTimeout(timer);
      // Restore hash only if we actually navigated away
      if (allowNavigate && !onSettings && window.location.hash !== prevHash) {
        try { window.location.hash = prevHash; } catch (_) { /* ignore */ }
      }
      sendResponse(result);
    }

    function onOrgReady() {
      if (cachedOrg && cachedOrg.id) {
        finish({ success: true, id: cachedOrg.id, name: cachedOrg.name });
      }
    }

    // Fast-path: OrgID already captured this page-session
    if (cachedOrg && cachedOrg.id) {
      sendResponse({ success: true, id: cachedOrg.id, name: cachedOrg.name });
      return true;
    }

    // Non-navigating path (automated enrichment): no cached data available.
    // Respond immediately — the push path will populate the cache when the SPA
    // next calls its settings endpoint.
    if (!allowNavigate) {
      sendResponse({ success: false, id: null, name: null,
                     error: 'No cached OrgID — push path will populate on next SPA request.' });
      return true;
    }

    window.addEventListener('__rcOrgReady', onOrgReady);

    // Step 1: Reset the MAIN-world interceptor's capture flag so it re-emits
    window.postMessage({ type: 'RESET_ORG_CAPTURE' }, '*');

    // Step 2: Navigate SPA to #/settings to trigger the settings API call.
    //         Bounce (→ #/ → #/settings) if already there so the SPA re-fetches.
    if (onSettings) {
      try { window.location.hash = '#/'; } catch (_) { /* ignore */ }
      setTimeout(function () {
        try { window.location.hash = '#/settings'; } catch (_) { /* ignore */ }
      }, 150);
    } else {
      try { window.location.hash = '#/settings'; } catch (_) { /* ignore */ }
    }

    // Step 3: 8-second fail-safe timeout
    var timer = setTimeout(function () {
      finish({
        success: false,
        id:      null,
        name:    null,
        error:   'Timeout: OrgID not received within 8 s. ' +
                 'Ensure a Cloudability page is open and fully loaded, then retry.',
      });
    }, 8000);

    return true; // keep message channel open for async sendResponse
  });

})();
