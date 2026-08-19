/**
 * env-content.js — ApptioOne Upgrade Calculator
 * Content script for *.apptio.com and *.apps.papt.to pages.
 *
 * Extracts live build numbers from the Calculation Queue widget using stable
 * data-test-id attributes and Server Version from the About dialog.
 *
 * Message protocol:
 *   extractEnvBuilds   -> { success, data: { hostname, label, displayName, prodBuild, stagBuild, devBuild, serverVersion } }
 *   waitForCalcQueue   -> { success } | { success: false, reason: 'timeout' }
 */

(function() {
  'use strict';

  if (window.__aoUcEnvListenerRegistered) return;
  window.__aoUcEnvListenerRegistered = true;

  function readBuild(testId) {
    var el = document.querySelector('[data-test-id="' + testId + '"]');
    if (!el) return null;
    var text = (el.textContent || el.innerText || '').trim();
    if (!text) return null;
    var m = text.match(/\d{4,6}/);
    return m ? m[0] : text;
  }

  function readServerVersion() {
    var allText = document.body ? document.body.innerText : '';
    var m = allText.match(/Server Version\s+([\d.a-z+-]+)/i);
    if (m) return m[1];
    return null;
  }

  function readEnvFromUrl() {
    var host = location.hostname.toLowerCase();
    var label = host.split('.')[0];
    var displayName = label;
    try {
      var hashParts = location.hash.replace(/^#/, '').split(':');
      if (hashParts.length >= 3 && hashParts[2]) {
        displayName = decodeURIComponent(hashParts[2].replace(/\+/g, ' '));
      }
    } catch (_) {}
    return { hostname: host, label: label, displayName: displayName };
  }

  chrome.runtime.onMessage.addListener(function(request, _sender, sendResponse) {
    if (request.action === 'aouc:extractEnvBuilds') {
      try {
        var prodBuild   = readBuild('gwt-debug-prodBuild');
        var stagBuild   = readBuild('gwt-debug-stagBuild');
        var devBuild    = readBuild('gwt-debug-devBuild');
        var serverVer   = readServerVersion();
        var envInfo     = readEnvFromUrl();
        sendResponse({ success: true, data: { hostname: envInfo.hostname, label: envInfo.label, displayName: envInfo.displayName, prodBuild: prodBuild, stagBuild: stagBuild, devBuild: devBuild, serverVersion: serverVer } });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }
    if (request.action === 'aouc:waitForCalcQueue') {
      var timeoutMs = request.timeoutMs || 20000;
      var start = Date.now();
      (function poll() {
        var el = document.querySelector('[data-test-id="gwt-debug-prodBuild"]');
        if (el && (el.textContent || '').trim()) { sendResponse({ success: true }); return; }
        if (Date.now() - start > timeoutMs) { sendResponse({ success: false, reason: 'timeout' }); return; }
        setTimeout(poll, 500);
      }());
      return true;
    }
  });

}());
