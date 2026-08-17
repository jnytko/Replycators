/**
 * cloudability-interceptor.js
 * ReplyCators — CloudabilityOrgId Plugin
 *
 * Runs in the MAIN world (document_start) on:
 *   *://*.apptio.com/cloudability*
 *   *://*.apps.papt.to/cloudability*
 *
 * Purpose:
 *   Patches window.XMLHttpRequest and window.fetch to intercept the Cloudability
 *   internal settings API response and extract the organisation id/name.
 *   Sends a postMessage(CLOUDABILITY_ORG_DATA) to the ISOLATED-world detector
 *   the moment valid data is captured.
 *
 * Design (matches reference implementation — cloudability-interceptor.js):
 *   - Captures only the first matching response unless reset via RESET_ORG_CAPTURE.
 *   - Listens for RESET_ORG_CAPTURE so subsequent retrieval requests work.
 *   - Uses postMessage to cross the MAIN/ISOLATED boundary.
 *   - Both XHR and fetch are patched for maximum compatibility.
 */
(function () {
  'use strict';

  // Guard: run once per page context.
  if (window.__rcCldInterceptor) return;
  window.__rcCldInterceptor = true;

  /** Whether we have already captured org data for this session. */
  var orgDataCaptured = false;

  var SETTINGS_PATH = '/v3/internal/organization/settings';

  // ── Reset listener ───────────────────────────────────────────────────────────
  // The ISOLATED-world detector sends RESET_ORG_CAPTURE before forcing a
  // SPA navigation so we emit the data again for a fresh retrieval.
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'RESET_ORG_CAPTURE') {
      orgDataCaptured = false;
    }
  });

  // ── Helper: emit org data via postMessage ─────────────────────────────────
  function emitOrgData(id, name) {
    if (orgDataCaptured) return;
    if (!id) return;
    orgDataCaptured = true;
    window.postMessage(
      { type: 'CLOUDABILITY_ORG_DATA', data: { id: id, name: name || '' } },
      '*'
    );
  }

  // ── XHR patch ─────────────────────────────────────────────────────────────
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._rcUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var url = this._rcUrl || '';
    if (typeof url === 'string' && url.includes(SETTINGS_PATH) && !orgDataCaptured) {
      var xhr = this;
      xhr.addEventListener('load', function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            emitOrgData(data.id, data.name);
          } catch (_) { /* non-JSON or unexpected shape — ignore */ }
        }
      });
    }
    return originalSend.apply(this, arguments);
  };

  // ── fetch patch ───────────────────────────────────────────────────────────
  var originalFetch = window.fetch;
  window.fetch = function () {
    var url = arguments[0];
    var urlStr = (typeof url === 'string') ? url : (url && url.url) ? url.url : '';
    if (urlStr.includes(SETTINGS_PATH) && !orgDataCaptured) {
      return originalFetch.apply(this, arguments).then(function (response) {
        var clone = response.clone();
        clone.json().then(function (data) {
          emitOrgData(data.id, data.name);
        }).catch(function () { /* non-JSON — ignore */ });
        return response;
      });
    }
    return originalFetch.apply(this, arguments);
  };

})();
