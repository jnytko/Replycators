/**
 * ReplyCators — Pre-built Background Service Worker
 * Self-contained compiled bundle for direct loading in Edge.
 * NOTE: This is the pre-built distribution. For development, use npm run build.
 *
 * v3 — OrgID background enrichment:
 *   OrgID is resolved automatically whenever a Cloudability tab is open.
 *   No popup, no user action, no waiting.
 *   Triggers: tab load, tab activated, RC_CLD_ORG_READY push, periodic alarm.
 */

'use strict';

// ─── Event Bus ───────────────────────────────────────────────────────────────

const EventBus = (() => {
  const subscriptions = new Map();
  const eventHistory = [];
  const MAX_HISTORY = 500;

  function emit(event, data) {
    eventHistory.push({ event, data, timestamp: Date.now() });
    if (eventHistory.length > MAX_HISTORY) eventHistory.shift();

    const subs = subscriptions.get(event);
    if (!subs || !subs.length) return;

    const snapshot = [...subs];
    for (const sub of snapshot) {
      try {
        sub.handler(data);
      } catch (err) {
        logEntries.push({
          id: `log-${++logCounter}`,
          timestamp: Date.now(),
          level: 'error',
          pluginId: 'background',
          message: '[EventBus] subscriber error',
          args: [String(err)],
        });
        if (logEntries.length > MAX_LOG) logEntries.shift();
      }
    }
    const remaining = subs.filter(s => !s.once);
    if (remaining.length !== subs.length) subscriptions.set(event, remaining);
  }

  function on(event, handler) {
    const subs = subscriptions.get(event) ?? [];
    subs.push({ handler, once: false });
    subscriptions.set(event, subs);
    return () => off(event, handler);
  }

  function off(event, handler) {
    const subs = subscriptions.get(event);
    if (subs) subscriptions.set(event, subs.filter(s => s.handler !== handler));
  }

  function getHistory(event) {
    return event ? eventHistory.filter(e => e.event === event) : [...eventHistory];
  }

  return { emit, on, off, getHistory };
})();

// ─── Logger ───────────────────────────────────────────────────────────────────

const logEntries = [];
const MAX_LOG = 2000;
let logCounter = 0;

function createLogger(pluginId) {
  function log(level, message, args) {
    const entry = { id: `log-${++logCounter}`, timestamp: Date.now(), level, pluginId, message, args: args.length ? args : undefined };
    logEntries.push(entry);
    if (logEntries.length > MAX_LOG) logEntries.shift();
    EventBus.emit('platform:log:entry', entry);
  }
  return {
    debug: (m, ...a) => log('debug', m, a),
    info:  (m, ...a) => log('info',  m, a),
    warn:  (m, ...a) => log('warn',  m, a),
    error: (m, ...a) => log('error', m, a),
    getEntries: (limit = 100) => logEntries.filter(e => e.pluginId === pluginId).slice(-limit),
  };
}

// ─── Storage Manager ─────────────────────────────────────────────────────────

const storageCache = new Map();

function createStorage(namespace, area = 'local') {
  const cacheKey = `${namespace}:${area}`;
  if (storageCache.has(cacheKey)) return storageCache.get(cacheKey);
  const keyOf = k => `rc:${namespace}:${k}`;
  const s = {
    get: (key) => new Promise(r => chrome.storage[area].get(keyOf(key), result => r(result[keyOf(key)]))),
    set: (key, value) => new Promise((r, j) => chrome.storage[area].set({ [keyOf(key)]: value }, () => chrome.runtime.lastError ? j(chrome.runtime.lastError) : r())),
    remove: (key) => new Promise((r, j) => chrome.storage[area].remove(keyOf(key), () => chrome.runtime.lastError ? j(chrome.runtime.lastError) : r())),
    clear: (prefix = '') => new Promise(r => chrome.storage[area].get(null, all => {
      const keys = Object.keys(all).filter(k => k.startsWith(`rc:${namespace}:${prefix}`));
      if (!keys.length) { r(); return; }
      chrome.storage[area].remove(keys, () => r());
    })),
  };
  storageCache.set(cacheKey, s);
  return s;
}

// ─── Notification Center ─────────────────────────────────────────────────────

const activeNotifications = new Map();
const notifHistory = [];

const notifications = {
  show(n) {
    const enriched = { ...n, timestamp: Date.now() };
    activeNotifications.set(n.id, enriched);
    notifHistory.push(enriched);
    if (notifHistory.length > 200) notifHistory.shift();
    EventBus.emit('platform:notification', { action: 'show', notification: enriched });
    if (enriched.duration > 0) setTimeout(() => notifications.dismiss(n.id), enriched.duration);
  },
  dismiss(id) {
    const n = activeNotifications.get(id);
    if (!n) return;
    activeNotifications.delete(id);
    EventBus.emit('platform:notification', { action: 'dismiss', notification: n });
  },
  getActive: () => Array.from(activeNotifications.values()),
};

// ─── Settings Manager ─────────────────────────────────────────────────────────

const settingsManager = {
  async get(pluginId, key) {
    return createStorage(`settings:${pluginId}`, 'sync').get(key);
  },
  async set(pluginId, key, value) {
    await createStorage(`settings:${pluginId}`, 'sync').set(key, value);
    EventBus.emit('platform:settings:changed', { pluginId, key, value });
  },
  // RC-014 fix: implement getAll() by reading all keys in the plugin's namespace.
  async getAll(pluginId) {
    const prefix = `rc:settings:${pluginId}:`;
    return new Promise(resolve => {
      chrome.storage.sync.get(null, all => {
        const result = {};
        for (const [k, v] of Object.entries(all)) {
          if (k.startsWith(prefix)) {
            result[k.slice(prefix.length)] = v;
          }
        }
        resolve(result);
      });
    });
  },
  async reset(pluginId, key) {
    const s = createStorage(`settings:${pluginId}`, 'sync');
    if (key) await s.remove(key); else await s.clear();
  },
};

// ─── Messaging Service ────────────────────────────────────────────────────────

const messageHandlers = [];

const messaging = {
  sendToTab: (tabId, msg) => new Promise((r, j) => chrome.tabs.sendMessage(tabId, msg, res => chrome.runtime.lastError ? j(new Error(chrome.runtime.lastError.message)) : r(res))),
  sendToBackground: (msg) => new Promise((r, j) => chrome.runtime.sendMessage(msg, res => chrome.runtime.lastError ? j(new Error(chrome.runtime.lastError.message)) : r(res))),
  onMessage: (h) => { messageHandlers.push(h); return () => { const i = messageHandlers.indexOf(h); if (i >= 0) messageHandlers.splice(i, 1); }; },
  injectScript: (tabId, files) => chrome.scripting.executeScript({ target: { tabId }, files }),
};

// ─── Plugin Registry ──────────────────────────────────────────────────────────
//
// RC-015 PHASE 2 TARGET (F-009)
//
// This registry and the buildServices() factory below are the intended
// background-side SDK for the Phase 2 TypeScript migration described in
// AGENTS.md §19 Long-Term Architecture Direction.
//
// In the current flat-deployment model (Phase 1 / Phase 1.5) no plugin
// calls registerPlugin() — plugins self-register on window.ReplyCatorsPlugins
// in dashboard.js and access platform services via window.ReplyCatorsApp.
//
// DO NOT REMOVE this code. It is the target surface for Phase 2 plugin
// module bundling. When Phase 2 lands, plugins will call registerPlugin()
// here and receive their services via buildServices(pluginId).
//
// The registry is queried via RC_GET_REGISTRY messages from dashboard.js
// to populate the diagnostics panel (background.js handles RC_GET_REGISTRY).

const registry = new Map(); // pluginId → RegistryEntry

function registerPlugin(manifest) {
  const entry = {
    manifest,
    health: { status: 'registered', errorCount: 0 },
    pages: [], widgets: [], menuItems: [], actions: new Map(),
    backgroundTasks: [], dashboardComponents: [], notifications: [],
    registeredAt: Date.now(),
  };
  registry.set(manifest.id, entry);
  EventBus.emit('platform:plugin:registered', { pluginId: manifest.id, manifest });
  return entry;
}

// ─── Plugin Platform Services builder ─────────────────────────────────────────
//
// RC-015 PHASE 2 TARGET — see Plugin Registry comment above.

function buildServices(pluginId) {
  return {
    storage: createStorage(`plugin:${pluginId}`),
    events: EventBus,
    logger: createLogger(pluginId),
    notifications,
    settings: settingsManager,
    messaging,
  };
}

// ─── OrgID Background Enrichment Service ─────────────────────────────────────
//
// Lightweight inline implementation of OrgIdBackgroundService for the
// pre-built background bundle.  Mirrors the TypeScript source exactly.
//

const ORGID_PLUGIN_ID    = 'com.replycators.cloudability-orgid';
const ORGID_CACHE_KEY    = 'orgid-cache';
const ORGID_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const ORGID_DETECTOR     = 'plugins/cloudability/content/cloudability-detector.js';
const ORGID_URL_PATTERN  = /^https?:\/\/([^/]+\.apptio\.com|[^/]+\.apps\.papt\.to)\/cloudability/i;
const ORGID_ALARM_NAME   = 'rc:cld-orgid-periodic-enrich';
const ORGID_ENRICH_INTERVAL_MIN = 30;
const ENRICH_DEBOUNCE_MS = 3000;
const MAX_RETRIES        = 3;
const RETRY_BASE_DELAY   = 2000;
const PLUGIN_STATES_KEY  = 'rc:session:plugin-states';

// F-003: in-memory TTL cache for plugin enabled states.
// Plugin enable/disable changes happen exclusively in the dashboard context.
// A 60-second TTL means at most one storage read per minute per plugin ID
// across all tab events, alarms, and enrichment calls, rather than one read
// per event regardless of frequency.
const _PLUGIN_STATE_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const _pluginStateCache = new Map(); // pluginId -> { enabled: boolean, ts: number }

/**
 * Returns a cached Promise resolving to the enabled state of `pluginId`.
 * Reads from chrome.storage.local at most once per TTL period.
 * @param {string} pluginId
 * @returns {Promise<boolean>}
 */
function getPluginEnabledState(pluginId) {
  const now = Date.now();
  const cached = _pluginStateCache.get(pluginId);
  if (cached && (now - cached.ts) < _PLUGIN_STATE_CACHE_TTL_MS) {
    return Promise.resolve(cached.enabled);
  }
  return new Promise(resolve => {
    chrome.storage.local.get([PLUGIN_STATES_KEY], result => {
      const states = result?.[PLUGIN_STATES_KEY];
      const enabled = states?.[pluginId]?.enabled !== false;
      _pluginStateCache.set(pluginId, { enabled, ts: Date.now() });
      resolve(enabled);
    });
  });
}

let orgIdInFlight        = null;   // shared Promise while a request is running
let orgIdDebounceTimer   = null;   // debounce handle
const orgIdServices      = buildServices(ORGID_PLUGIN_ID);
const orgIdLogger        = orgIdServices.logger;

const orgIdStats = {
  cacheHits: 0, cacheMisses: 0,
  liveSuccess: 0, liveFailure: 0,
  totalDurationMs: 0, lastRetrievedAt: null, retries: 0,
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function orgIdLoadCache() {
  const cached = await orgIdServices.storage.get(ORGID_CACHE_KEY);
  if (!cached?.id) return undefined;
  const age = Date.now() - (cached.retrievedAt ?? 0);
  if (age > ORGID_CACHE_TTL_MS) {
    orgIdLogger.debug(`OrgID cache expired (age=${age}ms)`);
    return undefined;
  }
  return cached;
}

async function orgIdWriteCache(data) {
  try {
    await orgIdServices.storage.set(ORGID_CACHE_KEY, data);
    orgIdLogger.debug(`OrgID cached: ${data.id}`);
  } catch (err) {
    orgIdLogger.warn(`Failed to cache OrgID: ${String(err)}`);
  }
}

/**
 * Returns the currently ACTIVE Cloudability tab in the FOCUSED window, or null.
 *
 * "Active" means the tab the user is currently looking at in the window they
 * currently have focused.  Chrome's Tab.active flag is per-window, so a
 * Cloudability tab that is active in an UNFOCUSED background window is never
 * returned.  Only the focused window contributes customer context.
 *
 * Fixes Issue #6: previously used chrome.windows.getAll({ populate: true })
 * which traversed all windows in implementation-defined order and could select
 * a Cloudability tab from a background window, resolving the wrong customer OrgID.
 *
 * Implementation: getLastFocused() provides the focused window ID; a targeted
 * tabs.query({ active: true, windowId }) then confirms whether the focused
 * window's active tab is a Cloudability URL.
 */
async function orgIdGetActiveTab() {
  return new Promise(resolve => {
    chrome.windows.getLastFocused({ populate: false, windowTypes: ['normal'] }, focusedWin => {
      if (chrome.runtime.lastError || !focusedWin?.id) {
        resolve(null);
        return;
      }
      chrome.tabs.query({ active: true, windowId: focusedWin.id }, tabs => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        const tab = (tabs || []).find(t => t.url && ORGID_URL_PATTERN.test(t.url));
        resolve(tab ?? null);
      });
    });
  });
}

async function orgIdInjectDetector(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: [ORGID_DETECTOR] });
}

function orgIdSendMessage(tabId, navigate = true) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { type: 'RC_GET_CLOUDABILITY_ORG', navigate }, response => {
      if (chrome.runtime.lastError) {
        orgIdLogger.error(`Messaging error tabId=${tabId}: ${chrome.runtime.lastError.message}`);
        resolve(null);
        return;
      }
      resolve(response ?? null);
    });
  });
}

async function orgIdRetrieveOnce(navigate = true) {
  orgIdLogger.info('OrgID retrieval started');

  const tab = await orgIdGetActiveTab();
  if (!tab?.id) {
    const error = 'No open Cloudability tab found.';
    orgIdLogger.warn(`Retrieval aborted: ${error}`);
    return { success: false, error };
  }

  orgIdLogger.info(`Cloudability tab found: tabId=${tab.id}`);
  EventBus.emit('cld:orgid-retrieval-start', { tabId: tab.id });

  try {
    await orgIdInjectDetector(tab.id);
    orgIdLogger.debug(`Detector injected into tabId=${tab.id}`);
  } catch (err) {
    orgIdLogger.debug(`Detector injection note (already active?): ${String(err)}`);
  }

  const response = await orgIdSendMessage(tab.id, navigate);
  if (!response) {
    return { success: false, error: 'No response from Cloudability detector script.' };
  }

  if (!response.success || !response.id) {
    const error = response.error ?? 'OrgID not received from detector.';
    const isTimeout = /timeout/i.test(error);
    if (isTimeout) {
      orgIdLogger.warn(`OrgID timed out: ${error}`);
    } else {
      orgIdLogger.error(`OrgID retrieval failed: ${error}`);
    }
    return { success: false, error };
  }

  const data = {
    id: String(response.id).trim(),
    name: response.name ? String(response.name).trim() : '',
    retrievedAt: Date.now(),
  };

  await orgIdWriteCache(data);
  EventBus.emit('cld:org-retrieved', data);
  EventBus.emit('cld:orgid-retrieved', { data, durationMs: 0 });
  // Push to any open dashboard/popup so the widget updates without a reload.
  chrome.runtime.sendMessage({ type: 'RC_CLD_ORG_UPDATE', payload: data })
    .catch(() => { /* dashboard may be closed — expected */ });

  orgIdLogger.info(`OrgID retrieved: ${data.id}${data.name ? ` (${data.name})` : ''}`);
  return { success: true, data, source: 'live' };
}

async function orgIdRetrieveWithRetry(navigate = true) {
  let lastError = 'Unknown error';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      orgIdStats.retries++;
      orgIdLogger.info(`OrgID retry ${attempt}/${MAX_RETRIES} — waiting ${delay}ms`);
      EventBus.emit('cld:orgid-retry', { attempt, delayMs: delay });
      await sleep(delay);
    }
    const outcome = await orgIdRetrieveOnce(navigate);
    if (outcome.success) return outcome;
    lastError = outcome.error;
    if (/no open cloudability tab/i.test(lastError)) break;
  }
  return { success: false, error: lastError };
}

async function orgIdRetrieve(forceRefresh = false, navigate = true) {
  if (!(await getPluginEnabledState(ORGID_PLUGIN_ID))) {
    return { success: false, error: 'Cloudability OrgID plugin is disabled.' };
  }

  const t0 = Date.now();

  // Cache hit path
  if (!forceRefresh) {
    const cached = await orgIdLoadCache();
    if (cached) {
      orgIdStats.cacheHits++;
      const dur = Date.now() - t0;
      EventBus.emit('cld:orgid-cache-hit', { data: cached, durationMs: dur });
      orgIdLogger.debug(`OrgID cache hit: ${cached.id} (${dur}ms)`);
      EventBus.emit('cld:orgid-telemetry', { ...orgIdStats });
      // Push cached value to any open dashboard so the widget populates immediately.
      // Without this the dashboard card stays on "⏳ Retrieving…" when the value
      // was already known but the background only performed a cache-hit (no live fetch).
      chrome.runtime.sendMessage({ type: 'RC_CLD_ORG_UPDATE', payload: cached })
        .catch(() => { /* dashboard may be closed — expected */ });
      return { success: true, data: cached, source: 'cache' };
    }
    orgIdStats.cacheMisses++;
    EventBus.emit('cld:orgid-cache-miss', {});
  }

  // Deduplication — join in-flight request
  if (orgIdInFlight) {
    orgIdLogger.debug('OrgID joining existing in-flight request');
    return orgIdInFlight;
  }

  // Start new retrieval
  orgIdInFlight = orgIdRetrieveWithRetry(navigate)
    .then(outcome => {
      const dur = Date.now() - t0;
      orgIdStats.totalDurationMs += dur;
      if (outcome.success) {
        orgIdStats.liveSuccess++;
        orgIdStats.lastRetrievedAt = Date.now();
        EventBus.emit('cld:orgid-retrieved', { data: outcome.data, durationMs: dur });
      } else {
        orgIdStats.liveFailure++;
        EventBus.emit('cld:orgid-failed', { error: outcome.error, durationMs: dur });
      }
      EventBus.emit('cld:orgid-telemetry', { ...orgIdStats });
      return outcome;
    })
    .finally(() => { orgIdInFlight = null; });

  return orgIdInFlight;
}

async function orgIdEnrichIfPossible() {
  if (!(await getPluginEnabledState(ORGID_PLUGIN_ID))) {
    if (orgIdDebounceTimer !== null) {
      clearTimeout(orgIdDebounceTimer);
      orgIdDebounceTimer = null;
    }
    return;
  }
  if (orgIdInFlight) {
    orgIdLogger.debug('OrgID enrichment skipped — request already in flight');
    return;
  }
  if (orgIdDebounceTimer !== null) clearTimeout(orgIdDebounceTimer);
  orgIdDebounceTimer = setTimeout(async () => {
    orgIdDebounceTimer = null;
    try {
      if (!(await getPluginEnabledState(ORGID_PLUGIN_ID))) return;
      const tab = await orgIdGetActiveTab();
      if (!tab?.id) {
        orgIdLogger.debug('Background enrichment skipped — no active Cloudability tab');
        return;
      }
      orgIdLogger.info(`Background enrichment triggered — tabId=${tab.id}`);
      // Use the cache when valid (forceRefresh=false) and suppress SPA navigation
      // (navigate=false).  The push path (CLOUDABILITY_ORG_DATA → RC_CLD_ORG_READY)
      // populates the cache organically whenever Cloudability calls its settings
      // endpoint.  If the cache is empty, the pull path will attempt retrieval but
      // MUST NOT navigate the SPA — it returns { success: false } instead, which is
      // the correct graceful fallback for the automated enrichment path (RC-CLD-001).
      await orgIdRetrieve(false, false);
    } catch (err) {
      orgIdLogger.debug(`Background enrichment error (suppressed): ${String(err)}`);
    }
  }, ENRICH_DEBOUNCE_MS);
}

// Handle proactive push from the content script detector.
// Called when RC_CLD_ORG_READY arrives from cloudability-detector.js.
async function orgIdHandlePush(id, name, senderTabId) {
  if (!(await getPluginEnabledState(ORGID_PLUGIN_ID))) return;

  // Accept the push only if it comes from the active Cloudability tab.
  const activeTab = await orgIdGetActiveTab();
  if (!activeTab?.id || activeTab.id !== senderTabId) return;

  const orgId = typeof id === 'string' ? id.trim() : '';
  if (!orgId) {
    orgIdLogger.debug('RC_CLD_ORG_READY received with empty id — ignoring');
    return;
  }
  const orgName = typeof name === 'string' ? name.trim() : '';

  // Dedup: skip only if the SAME org is already cached AND the push comes from
  // the same tab — don't skip if the user switched to a different Cloudability org.
  const existing = await orgIdLoadCache();
  if (existing?.id === orgId) {
    // Still push to dashboard so it reflects the current active-tab org
    // even if the cache entry is identical (dashboard may have been reopened).
    chrome.runtime.sendMessage({ type: 'RC_CLD_ORG_UPDATE', payload: existing })
      .catch(() => {});
    orgIdLogger.debug(`RC_CLD_ORG_READY: already cached (${orgId}) — refreshing dashboard`);
    return;
  }

  orgIdLogger.info(`RC_CLD_ORG_READY: proactive push received — OrgID=${orgId}`);

  const data = { id: orgId, name: orgName, retrievedAt: Date.now() };
  await orgIdWriteCache(data);
  EventBus.emit('cld:org-retrieved', data);
  EventBus.emit('cld:orgid-retrieved', { data, durationMs: 0 });
  // Push to any open dashboard/popup so the widget updates without a reload.
  chrome.runtime.sendMessage({ type: 'RC_CLD_ORG_UPDATE', payload: data })
    .catch(() => { /* dashboard may be closed — expected */ });

  orgIdLogger.info(`OrgID cached from proactive push: ${orgId}${orgName ? ` (${orgName})` : ''}`);
}

// Schedule the periodic enrichment alarm
function orgIdScheduleAlarm() {
  chrome.alarms.get(ORGID_ALARM_NAME, alarm => {
    if (!alarm) {
      chrome.alarms.create(ORGID_ALARM_NAME, {
        delayInMinutes:  ORGID_ENRICH_INTERVAL_MIN,
        periodInMinutes: ORGID_ENRICH_INTERVAL_MIN,
      });
      orgIdLogger.debug(`Periodic OrgID enrichment alarm scheduled (every ${ORGID_ENRICH_INTERVAL_MIN} min)`);
    }
  });
}

// ─── Platform Bootstrap ───────────────────────────────────────────────────────

// Single source of truth for the Bob Helper port (browser side).
// See build/bob-helper-config.js for the canonical reference and sync checklist.
// The server reads REPLYCATORS_BOB_HELPER_PORT env var; if changed there, update this constant too.
//
// SYNC REQUIRED - this value is duplicated in dashboard.js (_BOB_HELPER_PORT_DIAG)
// and tools/bob-helper-server.js (PORT fallback). Change all three together.
// The Diagnostics CHECK-05b check will detect a runtime mismatch, but a compile-time
// sync failure will silently break the Salesforce Execute workflow.
const BOB_HELPER_PORT = 47123;

const platformLogger = createLogger('background');
let bobHelperRequestSeq = 0;

function isBobHelperDebugEnabled() {
  return globalThis.REPLYCATORS_BOB_HELPER_DEBUG === true;
}

function nextBobHelperRequestId() {
  bobHelperRequestSeq += 1;
  return `bh-${Date.now()}-${bobHelperRequestSeq}`;
}

function logBobHelper(level, requestId, phase, details, extra) {
  if (!isBobHelperDebugEnabled()) return;
  const prefix = `[BobHelper][${requestId}] ${phase} — ${details}`;
  if (level === 'error') {
    platformLogger.error(prefix, extra ?? '');
    return;
  }
  if (level === 'warn') {
    platformLogger.warn(prefix, extra ?? '');
    return;
  }
  if (level === 'debug') {
    platformLogger.debug(prefix, extra ?? '');
    return;
  }
  platformLogger.info(prefix, extra ?? '');
}

// ─── Bob Helper fetch utility ─────────────────────────────────────────────────
// Centralizes the AbortController + setTimeout pattern shared by all four Bob
// Helper message handlers (RC_PREFLIGHT_CLI_CHECK, RC_BOB_HEALTH, RC_EXECUTE_BOB,
// RC_BOB_STATUS). Each handler retains its own response parsing, error messaging,
// logging, and sendResponse call - only the timeout boilerplate is abstracted.
//
// Timeout values are intentionally per-endpoint (passed by each caller):
//   /health:    3000 ms  - lightweight probe, fast failure expected
//   /cli-check: 4000 ms  - runs bob --version subprocess, needs extra margin
//   /execute:   10000 ms - fire-and-forget spawn, helper confirms quickly
//   /status:    3000 ms  - file read only, no subprocess
async function fetchBobHelper(url, fetchOptions, timeoutMs) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}


function bootstrapBackground() {
  platformLogger.info('ReplyCators background service worker started');

  // Context menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'rc-root', title: 'ReplyCators', contexts: ['page', 'selection'] });
    chrome.contextMenus.create({ id: 'rc-open-dashboard', parentId: 'rc-root', title: 'Open Dashboard', contexts: ['page', 'selection'] });
    chrome.contextMenus.create({ id: 'rc-separator-1', parentId: 'rc-root', type: 'separator', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'rc-sf-extract', parentId: 'rc-root', title: 'Extract Salesforce Case', contexts: ['page'],
      documentUrlPatterns: ['https://*.salesforce.com/*', 'https://*.lightning.force.com/*'] });
  });

  // F-06: launch mode is applied by the module-level getLaunchMode() call below,
  // which runs on every service worker wake-up including install and startup.
  // A second identical call here was redundant and caused two concurrent storage
  // reads and two chrome.action.setPopup() calls on install/startup events.

  // Schedule periodic OrgID enrichment alarm
  getPluginEnabledState(ORGID_PLUGIN_ID).then(enabled => {
    if (enabled) {
      orgIdScheduleAlarm();
      orgIdEnrichIfPossible();
    }
  });
}

// ─── Default Launch Mode storage key ──────────────────────────────────────────
// Mirrors the 'defaultLaunchMode' field inside the rc:session:app-settings object.
// Background reads this key directly to avoid deserialising the whole settings blob.
// MUST be declared before getLaunchMode() is defined and before the module-level
// call to getLaunchMode() below — const is in TDZ until its declaration executes.
const RC_APP_SETTINGS_KEY = 'rc:session:app-settings';

// RC-001 fix: bootstrapBackground() was being called twice:
//   1) on chrome.runtime.onInstalled (first install / update)
//   2) unconditionally at module evaluation (every service worker wake-up)
// This caused double context menu creation on install.
// Fix: onInstalled handles install/update; onStartup handles restarts.
// Module-level call is removed — bootstrapBackground() is only event-driven.
chrome.runtime.onInstalled.addListener(() => bootstrapBackground());
chrome.runtime.onStartup.addListener(() => bootstrapBackground());

// ── Restore launch mode on every service worker wake-up ────────────────────
// bootstrapBackground() only runs on install/startup events. When the service
// worker wakes up for other reasons (e.g. a tab event, alarm, or message),
// chrome.action has no popup configured because the state is ephemeral.
// This module-level call runs on every wake-up and restores the correct mode.
getLaunchMode().then(mode => applyLaunchMode(mode));

// ─── Tab event listeners — OrgID background enrichment ───────────────────────

// Primary trigger: fires when a Cloudability tab finishes loading.
// Only act when the tab is ACTIVE — a background Cloudability tab loading or
// navigating must not trigger retrieval.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !ORGID_URL_PATTERN.test(tab.url)) return;
  if (!tab.active) return; // background tab — ignore
  getPluginEnabledState(ORGID_PLUGIN_ID).then(enabled => {
    if (!enabled) return;
    platformLogger.info(`Active Cloudability tab loaded — triggering OrgID enrichment (tabId=${tabId})`);
    orgIdEnrichIfPossible();
  });
});

// Secondary trigger: fires when the user switches to an already-loaded Cloudability tab.
// PERF-002 fix: previously called getPluginEnabledState() (a storage read) on EVERY
// tab activation before checking whether the URL is even a Cloudability URL.
// In a MV3 service worker that is killed and restarted frequently each wake issues
// a storage read for every tab switch regardless of URL.
// Fix: check URL pattern first — only read plugin-enabled state when the URL matches.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => {
    if (chrome.runtime.lastError || !tab?.url) return;
    if (!ORGID_URL_PATTERN.test(tab.url)) return; // URL check BEFORE storage read
    getPluginEnabledState(ORGID_PLUGIN_ID).then(enabled => {
      if (!enabled) return;
      platformLogger.debug(`Cloudability tab activated — triggering OrgID enrichment (tabId=${tabId})`);
      orgIdEnrichIfPossible();
    });
  });
});

// ─── Alarm handler ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(alarm => {
  platformLogger.debug(`Alarm fired: ${alarm.name}`);
  EventBus.emit('platform:alarm', { name: alarm.name });

  if (alarm.name === ORGID_ALARM_NAME) {
    getPluginEnabledState(ORGID_PLUGIN_ID).then(enabled => {
      if (!enabled) return;
      platformLogger.debug('Periodic OrgID enrichment alarm fired');
      orgIdEnrichIfPossible();
    });
  }
});

/**
 * Read the user's preferred launch mode from storage.
 * Returns a Promise resolving to 'popup' | 'sidepanel' (default: 'popup').
 */
function getLaunchMode() {
  return new Promise(resolve => {
    chrome.storage.local.get([RC_APP_SETTINGS_KEY], result => {
      const settings = result[RC_APP_SETTINGS_KEY];
      const mode = settings && settings.defaultLaunchMode === 'sidepanel' ? 'sidepanel' : 'popup';
      resolve(mode);
    });
  });
}

/**
 * Apply chrome.action configuration based on current launch mode.
 *   popup     — sets default_popup so the standard overlay appears on icon click
 *   sidepanel — clears default_popup so onClicked fires; side panel is opened there
 */
function applyLaunchMode(mode) {
  if (mode === 'sidepanel') {
    chrome.action.setPopup({ popup: '' });
    platformLogger.info('Launch mode: Side Panel — popup cleared, onClicked active');
  } else {
    chrome.action.setPopup({ popup: 'dashboard.html' });
    platformLogger.info('Launch mode: Popup — popup set to dashboard.html');
  }
}

// ─── Extension icon click (fires only when popup is cleared) ──────────────────

chrome.action.onClicked.addListener(tab => {
  // This fires only when chrome.action has no popup set (Side Panel mode).
  // In Popup mode chrome.action.setPopup('dashboard.html') is active, so this
  // listener is bypassed and the popup opens natively.
  if (!chrome.sidePanel || !chrome.sidePanel.open) {
    // Fallback: side panel API unavailable — open popup instead
    chrome.action.setPopup({ popup: 'dashboard.html' }, () => chrome.action.openPopup?.());
    return;
  }
  chrome.sidePanel.open({ windowId: tab.windowId }, () => {
    if (chrome.runtime.lastError) {
      platformLogger.error('sidePanel.open error: ' + chrome.runtime.lastError.message);
      // Fallback: open popup
      chrome.action.setPopup({ popup: 'dashboard.html' }, () => chrome.action.openPopup?.());
    }
  });
});

// ─── Salesforce Download Tracking (FR-2.6 / FR-2.8) ─────────────────────────
//
// background.js tracks the last Salesforce case download so that the download
// history panel in the SF plugin UI can display real-time status updates.
//
// RC_DOWNLOAD_TRACK — sent by dashboard.js (salesforce-case-extractor.js module)
// immediately after chrome.downloads.download() succeeds.  Stores the pending
// record and sets _pendingDownloadId so the onChanged listener can correlate
// subsequent state transitions.
//
// Only one download is tracked at a time (_pendingDownloadId).  If a second
// download starts before the first completes, the new record overwrites the
// stored key (most-recent-wins).

const SF_PLUGIN_ID_BG      = 'com.replycators.salesforce-extractor';
const SF_LAST_DOWNLOAD_KEY = 'rc:plugin:' + SF_PLUGIN_ID_BG + ':last-download';

let _pendingDownloadId = null;

chrome.downloads.onChanged.addListener(function (delta) {
  if (!_pendingDownloadId || delta.id !== _pendingDownloadId) return;

  const newState = delta.state ? delta.state.current : null;
  if (!newState) return;

  chrome.storage.local.get(SF_LAST_DOWNLOAD_KEY, function (stored) {
    const record = stored[SF_LAST_DOWNLOAD_KEY];
    if (!record) return;

    if (newState === 'complete') {
      // Resolve the full filesystem path via downloads.search()
      chrome.downloads.search({ id: delta.id }, function (items) {
        if (items && items[0] && items[0].filename) {
          record.fullPath = items[0].filename;
        }
        record.state = 'complete';
        _pendingDownloadId = null;
        chrome.storage.local.set({ [SF_LAST_DOWNLOAD_KEY]: record });
        // Notify any open popup
        chrome.runtime.sendMessage({ type: 'RC_DOWNLOAD_UPDATED', payload: record })
          .catch(() => { /* popup may be closed — expected */ });
      });
      return;
    }

    if (newState === 'interrupted') {
      record.retryCount = (record.retryCount || 0) + 1;
      if (record.retryCount >= 3) {
        // All retries exhausted — mark as terminal interrupted
        record.state = 'interrupted';
        _pendingDownloadId = null;
        chrome.storage.local.set({ [SF_LAST_DOWNLOAD_KEY]: record });
        chrome.runtime.sendMessage({ type: 'RC_DOWNLOAD_UPDATED', payload: record })
          .catch(() => {});
      } else {
        // Record retry attempt; blob URL is already revoked so we cannot
        // re-issue the download here — mark pending and notify for UI update
        record.state = 'pending';
        chrome.storage.local.set({ [SF_LAST_DOWNLOAD_KEY]: record });
        chrome.runtime.sendMessage({ type: 'RC_DOWNLOAD_UPDATED', payload: record })
          .catch(() => {});
      }
      return;
    }

    if (newState === 'cancelled') {
      record.state = 'cancelled';
      _pendingDownloadId = null;
      chrome.storage.local.set({ [SF_LAST_DOWNLOAD_KEY]: record });
      chrome.runtime.sendMessage({ type: 'RC_DOWNLOAD_UPDATED', payload: record })
        .catch(() => {});
    }
  });
});

// ─── Service worker wake-up recovery (FR-2.8) ─────────────────────────────────
// If the service worker was killed while a download was in the 'pending' state,
// re-check the download status on the next wake-up and update the record.
chrome.storage.local.get(SF_LAST_DOWNLOAD_KEY, function (stored) {
  const record = stored[SF_LAST_DOWNLOAD_KEY];
  if (!record || record.state !== 'pending') return;
  // F-04: restore _pendingDownloadId from the recovered record so that any
  // subsequent onChanged events for this download are not silently dropped.
  if (typeof record.downloadId === 'number') {
    _pendingDownloadId = record.downloadId;
  }
  chrome.downloads.search({ id: record.downloadId }, function (items) {
    const item = items && items[0];
    if (!item) {
      record.state = 'interrupted';
    } else if (item.state === 'complete') {
      record.state    = 'complete';
      record.fullPath = item.filename || record.fullPath || '';
    } else if (item.state === 'interrupted' || item.state === 'cancelled') {
      record.state = item.state;
    } else {
      return; // still in_progress — leave as pending, _pendingDownloadId already restored
    }
    _pendingDownloadId = null;
    chrome.storage.local.set({ [SF_LAST_DOWNLOAD_KEY]: record });
    chrome.runtime.sendMessage({ type: 'RC_DOWNLOAD_UPDATED', payload: record })
      .catch(() => {});
  });
});

// ─── Context menu clicks ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'rc-open-dashboard') {
    // Respect the user's preferred launch mode when triggered from context menu
    getLaunchMode().then(mode => {
      if (mode === 'sidepanel' && chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ windowId: tab.windowId });
      } else {
        chrome.action.openPopup?.();
      }
    });
  } else if (info.menuItemId === 'rc-sf-extract' && tab?.id) {
    EventBus.emit('sf:extract-request', { tabId: tab.id });
  }
});

// ─── Message routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type ?? '';

  // ── OrgID proactive push from content script detector ─────────────────────
  // cloudability-detector.js sends this automatically whenever the Cloudability
  // SPA calls /v3/internal/organization/settings — no user action required.
  if (type === 'RC_CLD_ORG_READY') {
    const payload = message.payload ?? {};
    orgIdHandlePush(payload.id, payload.name, sender.tab?.id).catch(err => {
      platformLogger.error(`RC_CLD_ORG_READY handler error: ${String(err)}`);
    });
    sendResponse({ received: true });
    return true;
  }

  if (type === 'RC_GET_REGISTRY') {
    const plugins = Array.from(registry.values()).map(e => ({
      id: e.manifest.id, name: e.manifest.name, version: e.manifest.version,
      category: e.manifest.category, status: e.health.status, health: e.health,
    }));
    sendResponse({ plugins });
    return true;
  }

  if (type === 'RC_PING') {
    sendResponse({ pong: true, version: chrome.runtime.getManifest().version });
    return true;
  }

  // ── RC_DOWNLOAD_TRACK — Salesforce download registration ─────────────────
  // salesforce-case-extractor.js sends this immediately after
  // chrome.downloads.download() succeeds.  Stores the pending record and sets
  // _pendingDownloadId so the onChanged listener can correlate state transitions.
  if (type === 'RC_DOWNLOAD_TRACK') {
    const record = message.payload;
    if (record && typeof record.downloadId === 'number') {
      _pendingDownloadId = record.downloadId;
      chrome.storage.local.set({ [SF_LAST_DOWNLOAD_KEY]: record });
    }
    sendResponse({ ok: true });
    return true;
  }

  // ── RC_PREFLIGHT_CLI_CHECK — pre-flight: Bob CLI + Node.js runtime ─────────
  // Diagnostics pre-flight system sends this to obtain sanitized CLI and Node.js
  // metadata from the helper server's /cli-check endpoint.
  // Returns { ok: true, bobFound, bobBasename, bobVersion, nodeFound, nodeBasename,
  //           nodeVersion } or { ok: false, error, serverDown } on failure.
  // Timeout: 4 s (slightly longer than /health to allow bob --version subprocess).
  //
  // Optional: payload.dir — when present, appends ?dir=<encoded-path> to the URL
  // so the server also validates the given directory and returns dirOk/dirError.
  // Used by the Settings Save button to confirm the path before persisting.
  if (type === 'RC_PREFLIGHT_CLI_CHECK') {
    let cliCheckUrl = `http://127.0.0.1:${BOB_HELPER_PORT}/cli-check`;
    const dirParam = typeof message?.payload?.dir === 'string' ? message.payload.dir.trim() : '';
    if (dirParam) {
      cliCheckUrl += '?dir=' + encodeURIComponent(dirParam);
    }
    fetchBobHelper(cliCheckUrl, { method: 'GET' }, 4000)
      .then(async response => {
        let payload = null;
        try { payload = await response.json(); } catch (_) { payload = null; }
        if (response.ok && payload) {
          sendResponse({ ok: true, ...payload });
        } else {
          sendResponse({ ok: false, error: 'CLI check returned HTTP ' + response.status });
        }
      })
      .catch(err => {
        const isTimeout = err?.name === 'AbortError';
        sendResponse({
          ok: false,
          serverDown: true,
          error: isTimeout ? 'CLI check timed out (4 s).' : 'Helper unreachable: ' + String(err),
        });
      });
    return true; // async
  }

  // ── RC_BOB_HEALTH — probe whether the local Bob helper server is running ──
  // salesforce-case-extractor.js sends this on every navigate to the SF view
  // so the Execute button can reflect the server's availability before the
  // user clicks it.  Returns { ok: true, ... } when the server responds to
  // GET /health, or { ok: false, error: '...' } otherwise.
  if (type === 'RC_BOB_HEALTH') {
    const healthUrl = `http://127.0.0.1:${BOB_HELPER_PORT}/health`;
    fetchBobHelper(healthUrl, { method: 'GET' }, 3000) // short timeout for a health probe
      .then(async response => {
        let payload = null;
        try { payload = await response.json(); } catch (_) { payload = null; }
        if (response.ok) {
          sendResponse({ ok: true, ...(payload || {}) });
        } else {
          sendResponse({ ok: false, error: 'Bob helper returned HTTP ' + response.status });
        }
      })
      .catch(err => {
        const errMsg = err?.name === 'AbortError'
          ? 'Bob helper did not respond within 3 s.'
          : 'Bob helper unreachable: ' + String(err);
        sendResponse({ ok: false, error: errMsg });
      });

    return true; // async
  }

  // ── RC_EXECUTE_BOB — Salesforce Case Extractor prompt execution ───────────
  // salesforce-case-extractor.js sends this when the user clicks Execute.
  // The assembled prompt is POSTed to the local Bob helper server
  // (tools/bob-helper-server.js) which writes a temp prompt file and spawns
  // `bob -y <promptFile>` in a new visible terminal window.
  //
  // Requires: the local helper server in tools/bob-helper-server.js to be running.
  // Design: fire-and-forget from the popup's perspective. background.js performs
  // a localhost POST so the popup does not need direct cross-origin fetch logic.
  if (type === 'RC_EXECUTE_BOB') {
    const prompt = message.payload?.prompt;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      sendResponse({ ok: false, error: 'Empty prompt — nothing to execute.' });
      return true;
    }

    const requestId      = message.payload?.requestId || nextBobHelperRequestId();
    const workingDir     = typeof message.payload?.workingDir === 'string' ? message.payload.workingDir.trim() : '';
    const diagnosticMode = message.payload?.diagnosticMode === true;
    // v1.45.0: forward API key to the helper server — NEVER log the value.
    const bobApiKey      = typeof message.payload?.bobApiKey === 'string' ? message.payload.bobApiKey : '';
    const startedAt   = Date.now();
    const trimmedPrompt = prompt.trim();
    const promptPreview = trimmedPrompt.slice(0, 120).replace(/\s+/g, ' ');
    const helperTimeoutMs = 10000;
    const helperUrl = `http://127.0.0.1:${BOB_HELPER_PORT}/execute`;

    logBobHelper('info', requestId, 'request-received', 'Local Bob helper execution requested', {
      promptLength: trimmedPrompt.length,
      promptPreview,
      workingDir: workingDir || '(none)',
      bobApiKeySet: !!bobApiKey,
      senderTabId: sender.tab?.id ?? null,
      senderUrl: sender.tab?.url ?? null,
      helperUrl,
      extensionId: chrome.runtime.id,
      browserVersion: navigator.userAgent,
      timestamp: new Date(startedAt).toISOString(),
    });

    fetchBobHelper(helperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trimmedPrompt, requestId, workingDir, diagnosticMode, bobApiKey }),
    }, helperTimeoutMs)
      .then(async response => {
        const elapsedMs = Date.now() - startedAt;
        let payload = null;
        try {
          payload = await response.json();
        } catch (_) {
          payload = null;
        }

        logBobHelper('info', requestId, 'helper-response', 'Local helper responded', {
          elapsedMs,
          status: response.status,
          ok: response.ok,
          payload,
        });

        if (!response.ok) {
          sendResponse({
            ok: false,
            error: payload?.error || ('Bob helper returned HTTP ' + response.status),
            requestId,
            elapsedMs,
          });
          return;
        }

        sendResponse({ ...(payload || {}), requestId, elapsedMs });
      })
      .catch(err => {
        const elapsedMs = Date.now() - startedAt;
        const errMsg = err?.name === 'AbortError'
          ? 'Bob helper timed out before responding.'
          : 'Failed to reach Bob helper: ' + String(err);
        platformLogger.error(errMsg);
        logBobHelper('error', requestId, 'helper-request-failed', errMsg, { elapsedMs });
        sendResponse({ ok: false, error: errMsg, requestId, elapsedMs });
      });

    return true; // async
  }

  // ── RC_BOB_STATUS — poll execution status for a dispatched Bob request ────
  // salesforce-case-extractor.js sends this after Execute to poll the
  // /status/:requestId endpoint on the helper server. Returns the status object
  // { state, exitCode, startedAt, completedAt, errorMessage } or an error.
  // Timeout: 3 s (lightweight GET - status file read only, no subprocess).
  if (type === 'RC_BOB_STATUS') {
    const statusRequestId = message.payload?.requestId;
    if (!statusRequestId || typeof statusRequestId !== 'string') {
      sendResponse({ ok: false, error: 'RC_BOB_STATUS: missing or invalid requestId' });
      return true;
    }
    const statusUrl = `http://127.0.0.1:${BOB_HELPER_PORT}/status/${encodeURIComponent(statusRequestId)}`;
    fetchBobHelper(statusUrl, { method: 'GET' }, 3000)
      .then(async response => {
        let payload = null;
        try { payload = await response.json(); } catch (_) { payload = null; }
        if (response.ok && payload) {
          sendResponse({ ok: true, ...payload });
        } else {
          sendResponse({ ok: false, error: 'Status check returned HTTP ' + response.status });
        }
      })
      .catch(err => {
        const isTimeout = err?.name === 'AbortError';
        sendResponse({
          ok: false,
          serverDown: true,
          error: isTimeout ? 'Status check timed out (3 s).' : 'Helper unreachable: ' + String(err),
        });
      });

    return true; // async
  }

  // ── Launch mode change from settings UI ───────────────────────────────────
  // RC_PICK_BOB_DIR handler removed in v1.27.6 — Settings UI Browse button was
  // removed in v1.26.1; the /pick-dir server endpoint was also removed.
  // Bob Working Directory is now a plain text input (no OS folder picker).
  // dashboard.js sends this whenever the user changes Default Launch Mode.
  // Apply chrome.action immediately so the next toolbar click uses the new mode.
  if (type === 'RC_SET_LAUNCH_MODE') {
    const mode = message.payload?.mode === 'sidepanel' ? 'sidepanel' : 'popup';
    applyLaunchMode(mode);
    sendResponse({ ok: true });
    return true;
  }

  // ── RC_OPEN_POPUP: open the native extension popup anchored to the toolbar icon ──
  //
  // Sequence:
  //   1. Close any existing extension popup window (openPopup() fails if one is open).
  //   2. Close the side panel for the sender's tab (disable + re-enable).
  //   3. chrome.action.setPopup({ popup: 'dashboard.html' }) — restore popup target.
  //   4. chrome.action.openPopup() — opens toolbar popup (Edge/Chrome 127+).
  //   5. Persist launch mode as 'popup'.
  if (type === 'RC_OPEN_POPUP') {
    const senderTabId = message.payload?.tabId || null;

    // Step 1: find and close any existing extension popup window so openPopup()
    // doesn't fail with "Failed to open popup" when one is already visible.
    // F-15: populate:true so we can inspect tab URLs and close ONLY the extension's
    // own action popup — not unrelated system popup windows (OAuth dialogs, etc.).
    const closeExistingPopup = (cb) => {
      const extOrigin = 'chrome-extension://' + chrome.runtime.id + '/';
      chrome.windows.getAll({ populate: true }, wins => {
        void chrome.runtime.lastError;
        const popupWins = wins.filter(w =>
          w.type === 'popup' &&
          (w.tabs || []).some(t => t.url && t.url.startsWith(extOrigin))
        );
        if (!popupWins.length) { cb(); return; }
        let remaining = popupWins.length;
        const done = () => { if (--remaining === 0) cb(); };
        popupWins.forEach(w => {
          chrome.windows.remove(w.id, () => { void chrome.runtime.lastError; done(); });
        });
      });
    };

    // Step 2: close side panel by disabling it for this tab then immediately re-enabling.
    const closeSidePanel = (cb) => {
      if (senderTabId && chrome.sidePanel?.setOptions) {
        chrome.sidePanel.setOptions({ tabId: senderTabId, enabled: false }, () => {
          void chrome.runtime.lastError;
          // Re-enable so it can be opened again later.
          chrome.sidePanel.setOptions({ tabId: senderTabId, enabled: true }, () => {
            void chrome.runtime.lastError;
            cb();
          });
        });
      } else {
        cb();
      }
    };

    // Steps 3+4+5: set popup target and open.
    const openNativePopup = () => {
      chrome.action.setPopup({ popup: 'dashboard.html' }, () => {
        if (chrome.runtime.lastError) {
          const msg = 'setPopup failed: ' + chrome.runtime.lastError.message;
          platformLogger.error('RC_OPEN_POPUP: ' + msg);
          sendResponse({ ok: false, error: msg });
          return;
        }
        chrome.action.openPopup(() => {
          if (chrome.runtime.lastError) {
            const msg = 'openPopup failed: ' + chrome.runtime.lastError.message;
            platformLogger.error('RC_OPEN_POPUP: ' + msg);
            sendResponse({ ok: false, error: msg });
            return;
          }
          // Persist popup launch mode.
          chrome.storage.local.get([RC_APP_SETTINGS_KEY], result => {
            const s = result[RC_APP_SETTINGS_KEY] || {};
            s.defaultLaunchMode = 'popup';
            chrome.storage.local.set({ [RC_APP_SETTINGS_KEY]: s });
          });
          platformLogger.info('RC_OPEN_POPUP: native toolbar popup opened');
          sendResponse({ ok: true });
        });
      });
    };

    closeExistingPopup(() => closeSidePanel(openNativePopup));
    return true;
  }

  // Forward to generic message handlers (registered by plugins)
  if (messageHandlers.length) {
    (async () => {
      for (const h of messageHandlers) {
        try {
          const result = await h(message, sender);
          if (result !== undefined) { sendResponse(result); return; }
        } catch(e) { /* continue */ }
      }
      sendResponse(null);
    })();
    return true;
  }

  return false;
});

platformLogger.info('Background service worker ready');
