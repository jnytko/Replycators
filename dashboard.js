/**
 * ReplyCators — Dashboard Controller
 * v1.46.9
 *
 * Application shell and orchestrator for the ReplyCators plugin-based Edge extension.
 * Owns: startup coordination, session restoration, shared services (window.ReplyCatorsApp),
 * navigation, settings, plugin registry (PLUGINS[]), ordering (dashboardOrder),
 * notification/log system, themes, and diagnostics.
 *
 * Plugin implementations live in plugins/*.js and self-register on window.ReplyCatorsPlugins.
 * All plugin ↔ platform communication goes through window.ReplyCatorsApp — no direct
 * dashboard.js function calls from plugins are permitted.
 *
 * See docs/ARCHITECTURE.md for the full boot sequence and ownership model.
 */

'use strict';

// ─── Persistence Layer ────────────────────────────────────────────────────────
//
// Storage keys (all under chrome.storage.local):
//   RC_STORE.LOGS                — Activity log entries (capped at 500)
//   RC_STORE.NOTIFS              — Notification history (capped at 100)
//   RC_STORE.SF_RESULT           — Last successful Salesforce extraction result
//   RC_STORE.NAV_VIEW            — Last active view ID
//   RC_STORE.SF_SETTINGS         — Salesforce plugin settings { outputFormat, postSort, autoFill, source, privacyMode, bobWorkingDir, bobApiKey, bobUseBob1, inclInternal, inclJiraEtl, inclDiag, diagnosticMode }
//   RC_STORE.PLUGIN_STATES       — Plugin enabled/disabled map
//   RC_STORE.APP_SETTINGS        — All platform settings (theme, font, density, etc.)
//   RC_STORE.DASH_ORDER          — Plugin dashboard widget order
//   RC_STORE.PLUGINS_COLLAPSED   — Plugins sidebar section collapsed state
//
//   v4.0.0 Salesforce Case Extractor additions:
//   RC_STORE.SF_PROMPTS          — Prompt list (array of PromptEntry)
//   RC_STORE.SF_PROMPTS_SEEDED   — boolean — default prompts seeded once
//   RC_STORE.SF_LAST_DOWNLOAD    — Last download record { downloadId, filename, state, ... }
//   RC_STORE.SF_SELECTED_PROMPT  — Last selected prompt id
//   RC_STORE.SF_CONTEXT_FILE     — Last context file path
//   RC_STORE.SF_ADDITIONAL_INSTRUCTIONS — Last additional instructions text

const RC_STORE = {
  LOGS:                       'rc:session:logs',
  NOTIFS:                     'rc:session:notifications',
  SF_RESULT:                  'rc:session:sf-last-result',
  NAV_VIEW:                   'rc:session:nav-view',
  SF_SETTINGS:                'rc:session:sf-settings',
  PLUGIN_STATES:              'rc:session:plugin-states',
  APP_SETTINGS:               'rc:session:app-settings',
  DASH_ORDER:                 'rc:session:dashboard-order',
  PLUGINS_COLLAPSED:          'rc:session:plugins-section-collapsed',
  SIDEBAR_WIDTH:              'rc:session:sidebar-width',
  // v4.0.0 — Salesforce Case Extractor
  SF_PROMPTS:                 'rc:plugin:com.replycators.salesforce-extractor:prompts',
  SF_PROMPTS_SEEDED:          'rc:plugin:com.replycators.salesforce-extractor:prompts-seeded',
  SF_LAST_DOWNLOAD:           'rc:plugin:com.replycators.salesforce-extractor:last-download',
  // v4.1.0 — Salesforce Case Extractor
  SF_SELECTED_PROMPT:         'rc:plugin:com.replycators.salesforce-extractor:selected-prompt',
  SF_CONTEXT_FILE:            'rc:plugin:com.replycators.salesforce-extractor:context-file',
  SF_ADDITIONAL_INSTRUCTIONS: 'rc:plugin:com.replycators.salesforce-extractor:additional-instructions',
  // v1.26.0 — Apptio Documentation Finder
  ADF_SETTINGS:               'rc:plugin:com.replycators.apptio-docs-finder:settings',
  // v1.38.0 — Diagnostics check result persistence (chrome.storage.local — survives restarts)
  PREFLIGHT_RESULTS:          'rc:platform:preflight-results',
  // F-15: include in the startup batch so no second read is needed at boot.
  PREFLIGHT_EVER_RAN:         'rc:platform:preflight-ever-ran',
};

// F-03: _PREFLIGHT_EVER_RAN_KEY removed — use RC_STORE.PREFLIGHT_EVER_RAN directly.
// The constant duplicated the string already in RC_STORE.PREFLIGHT_EVER_RAN.
// Any drift between the two would silently break the first-ever-run guard.

const RC_CACHE_REFRESH_TIMEOUT_MS = 30000;
const RC_CACHE_STATUS = {
  FRESH: 'Fresh',
  AGING: 'Aging',
  EXPIRED: 'Expired',
  MISSING: 'Missing',
  INVALID: 'Invalid',
  REFRESHING: 'Refreshing',
  REFRESH_FAILED: 'Refresh Failed',
  CLEAR_FAILED: 'Clear Failed',
  UNKNOWN: 'Unknown',
};

const CACHE_REGISTRY = [
  {
    id: 'cloudability-orgid-cache',
    ownerPluginId: 'com.replycators.cloudability-orgid',
    ownerPluginName: 'Cloudability OrgID',
    displayName: 'OrgID Cache',
    description: 'Last successful Cloudability OrgID retrieval.',
    storageArea: 'chrome.storage.local',
    storageKey: 'rc:plugin:com.replycators.cloudability-orgid:orgid-cache',
    schemaVersion: 1,
    ttlMs: 24 * 60 * 60 * 1000,
    sensitivity: 'internal identifier',
    // Accept both plugin-writer schema { orgId, orgName, retrievedAt, originDomain }
    // and background-writer schema { id, name, retrievedAt } (CS-FV1-001 fix).
    validate: value => !!(value && typeof value === 'object' && (
      (typeof value.orgId === 'string' && value.orgId.trim()) ||
      (typeof value.id    === 'string' && value.id.trim())
    )),
    getUpdatedAt: value => value && value.retrievedAt ? normalizeTimestamp(value.retrievedAt) : null,
    getCreatedAt: value => value && value.retrievedAt ? normalizeTimestamp(value.retrievedAt) : null,
    supportsRefresh: true,
    supportsClear: true,
    refresh: () => window.ReplyCatorsPlugins?.CloudabilityOrgId?.refreshCache?.(),
    clear: () => window.ReplyCatorsPlugins?.CloudabilityOrgId?.clearCache?.(),
  },
  {
    id: 'apptio-planning-schedule-cache',
    ownerPluginId: 'com.replycators.apptio-planning-upgrade-calculator',
    ownerPluginName: 'Apptio Planning Upgrade Calculator',
    displayName: 'Release Schedule Cache',
    description: 'Cached IBM Community release schedule data.',
    storageArea: 'chrome.storage.local',
    storageKey: 'rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache',
    schemaVersion: 1,
    ttlMs: 24 * 60 * 60 * 1000,
    sensitivity: 'product metadata',
    validate: value => !!(value && typeof value === 'object' && Array.isArray(value.releases) && value.releases.length && value.lastUpdated),
    getUpdatedAt: value => value && value.lastUpdated ? normalizeTimestamp(value.lastUpdated) : null,
    getCreatedAt: value => value && value.lastUpdated ? normalizeTimestamp(value.lastUpdated) : null,
    supportsRefresh: true,
    supportsClear: true,
    refresh: () => window.ReplyCatorsPlugins?.ApptioUpgradeCalculator?.refreshCache?.(),
    clear: () => window.ReplyCatorsPlugins?.ApptioUpgradeCalculator?.clearCache?.(),
  },
  {
    id: 'apptio-docs-sources-cache',
    ownerPluginId: 'com.replycators.apptio-docs-finder',
    ownerPluginName: 'Apptio Documentation Finder',
    displayName: 'Documentation Sources Cache',
    description: 'Fetched IBM Docs source catalog and quick links.',
    storageArea: 'chrome.storage.local',
    storageKey: 'rc:plugin:com.replycators.apptio-docs-finder:sources',
    logicalKeys: [
      'rc:plugin:com.replycators.apptio-docs-finder:sources',
      'rc:plugin:com.replycators.apptio-docs-finder:quick-links',
      'rc:plugin:com.replycators.apptio-docs-finder:last-refresh',
      'rc:plugin:com.replycators.apptio-docs-finder:diag',
    ],
    legacyKeys: ['adn_sources', 'adn_quicklinks', 'adn_last_refresh', 'adn_diag'],
    schemaVersion: 2,
    ttlMs: 24 * 60 * 60 * 1000,
    sensitivity: 'document metadata',
    validate: value => !!(value && typeof value === 'object' && Array.isArray(value.sources)),
    getUpdatedAt: value => value && value.lastRefresh ? normalizeTimestamp(value.lastRefresh) : null,
    getCreatedAt: value => value && value.lastRefresh ? normalizeTimestamp(value.lastRefresh) : null,
    supportsRefresh: true,
    supportsClear: true,
    readValue: keys => ({
      sources: keys['rc:plugin:com.replycators.apptio-docs-finder:sources'],
      quickLinks: keys['rc:plugin:com.replycators.apptio-docs-finder:quick-links'],
      lastRefresh: keys['rc:plugin:com.replycators.apptio-docs-finder:last-refresh'],
      diag: keys['rc:plugin:com.replycators.apptio-docs-finder:diag'],
    }),
    refresh: () => window.ReplyCatorsPlugins?.ApptioDocsFinder?.refreshCache?.(),
    clear: () => window.ReplyCatorsPlugins?.ApptioDocsFinder?.clearCache?.(),
  },
  {
    id: 'salesforce-last-result-cache',
    ownerPluginId: 'com.replycators.salesforce-extractor',
    ownerPluginName: 'Salesforce Case Extractor',
    displayName: 'Last Extraction Result',
    description: 'Most recent extracted Salesforce case result.',
    storageArea: 'chrome.storage.local',
    storageKey: RC_STORE.SF_RESULT,
    schemaVersion: 1,
    ttlMs: null,
    sensitivity: 'customer case data',
    validate: value => !!(value && typeof value === 'object' && typeof value.rawText === 'string' && value.rawText.length),
    getUpdatedAt: value => value && value.extractedAt ? normalizeTimestamp(value.extractedAt) : null,
    getCreatedAt: value => value && value.extractedAt ? normalizeTimestamp(value.extractedAt) : null,
    supportsRefresh: false,
    supportsClear: true,
    clear: () => clearStorageKey(RC_STORE.SF_RESULT),
  },
  {
    id: 'bookmark-scan-cache',
    ownerPluginId: 'com.replycators.edge-bookmark-finder',
    ownerPluginName: 'Edge Bookmark Finder',
    displayName: 'Bookmark Scan Cache',
    description: 'Cached bookmark tree scan used by Bookmark Finder.',
    storageArea: 'chrome.storage.local',
    storageKey: 'rc:plugin:com.replycators.edge-bookmark-finder:last-scan',
    schemaVersion: 1,
    ttlMs: null,
    sensitivity: 'browsing-derived metadata',
    validate: value => !!(value && typeof value === 'object' && Array.isArray(value.bookmarks) && Array.isArray(value.folders) && value.scannedAt),
    getUpdatedAt: value => value && value.scannedAt ? normalizeTimestamp(value.scannedAt) : null,
    getCreatedAt: value => value && value.scannedAt ? normalizeTimestamp(value.scannedAt) : null,
    supportsRefresh: true,
    supportsClear: true,
    refresh: () => window.ReplyCatorsPlugins?.EdgeBookmarkFinder?.refreshCache?.(),
    clear: () => window.ReplyCatorsPlugins?.EdgeBookmarkFinder?.clearCache?.(),
  },
];

const CACHE_REGISTRY_KEYS = Array.from(new Set(CACHE_REGISTRY.flatMap(entry => entry.logicalKeys || [entry.storageKey])));
let cacheInspectorState = {
  items: [],
  storage: null,
  summary: null,
  orphanedKeys: [],
  activeTab: 'overview',
  filtersBound: false,
  actionState: {},
};

// ─── Sidebar resize bounds ────────────────────────────────────────────────────
const SIDEBAR_MIN_WIDTH = 120;
const SIDEBAR_MAX_WIDTH = 600;

// ─── Popup width sentinel ─────────────────────────────────────────────────────
// Tracks the current configured popup width. Starts at the default 800 px.
// Updated by applyPopupSize() whenever the user changes the Popup Size setting.
// detectAndApplySidePanelMode() reads this as one signal among several.
let RC_POPUP_WIDTH = 800;

// Popup size presets (width x height in px).
// Chrome / Edge extension action-popup hard limit: 800 x 600 px.
// All preset dimensions and custom clamp bounds are kept within this limit.
const POPUP_BROWSER_MAX_W = 800;
const POPUP_BROWSER_MAX_H = 600;

const POPUP_SIZE_PRESETS = {
  compact:  { w: 680, h: 480 },
  standard: { w: 800, h: 580 },  // default — matches the original fixed layout
};

// ─── Popup context flag ───────────────────────────────────────────────────────
// Evaluated once at script parse time using the DEFAULT popup width (800px) before
// any JS-driven CSS resize has occurred. At this early moment the stylesheet still
// declares --rc-popup-w: 800px, so:
//   - Popup context   → window.innerWidth === 800  → _startupIsSidePanel = false
//   - Side panel      → window.innerWidth ≠   800  → _startupIsSidePanel = true
//
// applyPopupSize() sets _isConfiguredPopup = !_startupIsSidePanel, meaning:
//   - Popup context:     _isConfiguredPopup = true  (skip geometry re-check)
//   - Side panel context: _isConfiguredPopup = false (use geometry as before)
//
// WHY THIS IS NEEDED:
//   After applyPopupSize() sets --rc-popup-w to e.g. 960px, the CSS is applied
//   synchronously but the browser's window resize is asynchronous. When
//   detectAndApplySidePanelMode() runs immediately afterwards, window.innerWidth
//   still reports the pre-resize width (800), which causes:
//     800 !== RC_POPUP_WIDTH(960)  →  isSidePanel = true  →  body.rc-sidepanel applied
//   This breaks the popup layout by applying fluid side-panel overrides.
const _startupIsSidePanel = window.innerWidth !== 800;
let _isConfiguredPopup = false;


// ─── Plugin section collapse state ───────────────────────────────────────────
//
// Tracks whether the Plugins sidebar section is collapsed.
// Default: expanded (false).  Persisted to RC_STORE.PLUGINS_COLLAPSED.

let pluginsSectionCollapsed = false;

/** Persist the current plugins-section collapsed state. */
function persistPluginsSectionCollapsed() {
  chrome.storage.local.set({ [RC_STORE.PLUGINS_COLLAPSED]: pluginsSectionCollapsed }, () => {
    if (chrome.runtime.lastError) {
      addLog('warn', 'platform', '[RC] persistPluginsSectionCollapsed failed: ' + chrome.runtime.lastError.message);
    }
  });
}

/**
 * Apply the plugins section collapsed/expanded state to the DOM.
 * Updates:
 *   - #rc-plugin-nav-items class (rc-plugins-collapsed)
 *   - #rc-plugins-section-toggle aria-expanded attribute
 * Safe to call at any time (elements may not yet exist on very first call —
 * the function is also called from applyPluginVisibility after items are built).
 */
function applyPluginsSectionState() {
  const container = document.getElementById('rc-plugin-nav-items');
  const toggle    = document.getElementById('rc-plugins-section-toggle');

  if (container) {
    if (pluginsSectionCollapsed) {
      container.classList.add('rc-plugins-collapsed');
    } else {
      container.classList.remove('rc-plugins-collapsed');
    }
  }
  if (toggle) {
    toggle.setAttribute('aria-expanded', pluginsSectionCollapsed ? 'false' : 'true');
  }
}

// ─── Default Settings ─────────────────────────────────────────────────────────
//
// All platform settings with their defaults.  This object is loaded from
// storage on startup and written back on every change.  It is the single
// source of truth for every preference in the Settings view.

const DEFAULT_SETTINGS = {
  // Appearance
  theme:              'ibm-blue',
  font:               'system',
  density:            'comfortable',
  // Accessibility
  largerFont:         false,
  reducedAnimations:  false,
  highContrast:       false,
  enhancedFocus:      false,
  // Notifications
  notifEnabled:       true,
  notifSuccess:       true,
  notifWarning:       true,
  notifError:         true,
  notifInfo:          true,
  notifDuration:      4000,   // ms
  notifPosition:      'bottom-right',
  // Dashboard preferences
  dashShowCards:      true,
  dashCompact:        false,
  dashRememberLast:   true,
  // Logging
  logLevel:           'normal', // 'normal' | 'verbose' | 'debug'
  // Extension behavior
  defaultLaunchMode:  'popup',  // 'popup' | 'sidepanel'
  // Popup size (popup mode only — does not affect side panel)
  popupSize:          'standard', // 'compact' | 'standard' | 'custom'
  popupCustomWidth:   800,
  popupCustomHeight:  580,
  // Snake plugin
  snakeSpeed:         'classic',  // 'slow' | 'classic' | 'fast'
  // Workspace Starter
  wsDefaultTabGroups: true,       // default launchMode for new profiles: true = 'tab-group'
};

/** Live settings object — mutated in place, then persisted. */
let appSettings = { ...DEFAULT_SETTINGS };

/** Persist the full settings object immediately. */
function persistAppSettings() {
  chrome.storage.local.set({ [RC_STORE.APP_SETTINGS]: appSettings }, () => {
    if (chrome.runtime.lastError) {
      addLog('warn', 'platform', '[RC] persistAppSettings failed: ' + chrome.runtime.lastError.message);
    }
  });
}

/** Debounce timer used for log/notif writes — avoids a storage write per keystroke. */
let _logSaveTimer   = null;
let _notifSaveTimer = null;

/** Persist the log store after a debounce (avoids rapid successive writes).
 *  PERF-003: debounce raised from 300 ms to 1500 ms. Log/notification history
 *  is retrospective — a 1.5-second flush delay has no user-visible impact while
 *  reducing storage write frequency by ~5× during active operations. */
function persistLogs() {
  clearTimeout(_logSaveTimer);
  _logSaveTimer = setTimeout(() => {
    chrome.storage.local.set({ [RC_STORE.LOGS]: logStore.slice(0, 500) });
  }, 1500);
}

/** Persist the notification store after a debounce.
 *  PERF-003: debounce raised from 300 ms to 1500 ms (same rationale as persistLogs). */
function persistNotifs() {
  clearTimeout(_notifSaveTimer);
  _notifSaveTimer = setTimeout(() => {
    chrome.storage.local.set({ [RC_STORE.NOTIFS]: notifStore.slice(0, 100) });
  }, 1500);
}

/** Persist the last Salesforce extraction result immediately. */
function persistSfResult(result) {
  if (!result) {
    chrome.storage.local.remove(RC_STORE.SF_RESULT);
    return;
  }
  chrome.storage.local.set({ [RC_STORE.SF_RESULT]: result });
}

// F-07: debounce timer for navigation view persistence.
// Rapid successive navigateTo() calls (e.g. startup redirect from a disabled
// plugin) should not each issue an independent storage write.  A 300 ms debounce
// collapses a redirect chain into a single write while still persisting reliably.
let _navViewSaveTimer = null;

/** Persist the current navigation view after a short debounce. */
function persistNavView(view) {
  clearTimeout(_navViewSaveTimer);
  _navViewSaveTimer = setTimeout(() => {
    chrome.storage.local.set({ [RC_STORE.NAV_VIEW]: view });
  }, 300);
}

/**
 * Persist Salesforce settings.
 * F-08: DOM elements for the SF plugin view only exist after the view is first rendered.
 * For fields that may be absent, fall back to the last-restored in-memory value so that
 * an unrelated settings save (e.g. theme change) cannot reset SF-specific fields to defaults.
 */
function persistSfSettings() {
  const fmt          = document.getElementById('sf-output-format')?.value  || 'plain-text';
  const postSort     = document.getElementById('sf-post-sort')?.value      || 'asc';
  const autoFill     = document.getElementById('sf-auto-fill')?.checked ?? true;
  const selectEl     = document.getElementById('sf-source-select');
  const source       = selectEl ? selectEl.value : 'active';

  // F-08: for boolean fields that live exclusively in the SF plugin view, prefer
  // the live DOM value when the element exists, otherwise fall back to the last
  // stored value so we do not silently overwrite with a hardcoded default.
  const sfRst = _restoredSfSettings || {};
  const _sfBool = (id, storedKey, defaultVal) => {
    const el = document.getElementById(id);
    if (el) return el.checked;
    return typeof sfRst[storedKey] === 'boolean' ? sfRst[storedKey] : defaultVal;
  };
  const privacyMode    = _sfBool('sf-privacy-mode',    'privacyMode',    true);
  const inclInternal   = _sfBool('sf-incl-internal',   'inclInternal',   false);
  const inclJiraEtl    = _sfBool('sf-incl-jira-etl',   'inclJiraEtl',    false);
  const inclDiag       = _sfBool('sf-incl-diag',       'inclDiag',       false);
  const diagnosticMode = _sfBool('sf-diagnostic-mode', 'diagnosticMode', false);

  // v1.26.1: read from the editable text input (replaces Browse-button model)
  const inputEl      = document.getElementById('sf-bob-working-dir-input');
  const bobWorkingDir = inputEl ? (inputEl.value || '').trim()
    : (typeof sfRst.bobWorkingDir === 'string' ? sfRst.bobWorkingDir : '');
  // v1.45.0: API key is read from module-level committed variable — NEVER from the DOM input
  // directly, to prevent the key being silently re-persisted on unrelated settings changes.
  const bobApiKey  = _committedBobApiKey;
  const bobUseBob1El = document.getElementById('sf-bob-use-bob1');
  const bobUseBob1 = bobUseBob1El ? bobUseBob1El.checked
    : (typeof sfRst.bobUseBob1 === 'boolean' ? sfRst.bobUseBob1 : false);
  chrome.storage.local.set({ [RC_STORE.SF_SETTINGS]: { outputFormat: fmt, postSort, autoFill, source, privacyMode, bobWorkingDir, inclInternal, inclJiraEtl, inclDiag, diagnosticMode, bobApiKey, bobUseBob1 } }, () => {
    if (chrome.runtime.lastError) {
      addLog('warn', 'platform', '[RC] persistSfSettings failed: ' + chrome.runtime.lastError.message);
    }
  });
}

/** Persist plugin enabled/disabled states. */
function persistPluginStates() {
  chrome.storage.local.set({ [RC_STORE.PLUGIN_STATES]: pluginStates }, () => {
    if (chrome.runtime.lastError) {
      addLog('warn', 'platform', '[RC] persistPluginStates failed: ' + chrome.runtime.lastError.message);
    }
  });
}

/**
 * Restore all persisted session state from chrome.storage.local.
 * Called once at startup.  Returns a Promise that resolves when all
 * state has been loaded into memory — so callers can safely render
 * after awaiting this.
 *
 * Handles missing, null, or malformed data gracefully (treats as empty).
 */
function restoreSession() {
  return new Promise(resolve => {
    const keys = Object.values(RC_STORE);
    chrome.storage.local.get(keys, stored => {
      try {
        // ── Logs ────────────────────────────────────────────────────────────
        const savedLogs = stored[RC_STORE.LOGS];
        if (Array.isArray(savedLogs) && savedLogs.length > 0) {
          // Merge into logStore — avoid duplicates by ID
          const existingIds = new Set(logStore.map(e => e.id));
          const toAdd = savedLogs.filter(e => e && e.id && !existingIds.has(e.id));
          logStore.push(...toAdd);
          // Keep newest-first ordering, re-sort by timestamp descending
          logStore.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          // Sync ID counter so new entries get unique IDs above existing ones
          const maxId = logStore.reduce((max, e) => {
            const n = parseInt(String(e.id).replace('log-', ''), 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0);
          if (maxId > logIdCounter) logIdCounter = maxId;
        }

        // ── Notifications ────────────────────────────────────────────────────
        const savedNotifs = stored[RC_STORE.NOTIFS];
        if (Array.isArray(savedNotifs) && savedNotifs.length > 0) {
          const existingIds = new Set(notifStore.map(n => n.id));
          const toAdd = savedNotifs.filter(n => n && n.id && !existingIds.has(n.id));
          notifStore.push(...toAdd);
          notifStore.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          const maxId = notifStore.reduce((max, n) => {
            const num = parseInt(String(n.id).replace('notif-', ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          if (maxId > notifIdCounter) notifIdCounter = maxId;
        }

        // ── Salesforce result ────────────────────────────────────────────────
        const sfResult = stored[RC_STORE.SF_RESULT];
        if (sfResult && sfResult.rawText) {
          _restoredSfResult = sfResult;
        }

        // ── Plugin states ────────────────────────────────────────────────────
        const savedStates = stored[RC_STORE.PLUGIN_STATES];
        if (savedStates && typeof savedStates === 'object') {
          PLUGINS.forEach(p => {
            if (Object.prototype.hasOwnProperty.call(savedStates, p.id)) {
              pluginStates[p.id] = {
                enabled: savedStates[p.id]?.enabled !== false,
              };
            }
          });
        }

        // ── Dashboard order ──────────────────────────────────────────────────
        // Load the persisted order.  If a saved order exists, use it as the
        // source of truth.  Normalize it so that:
        //   1. Plugin IDs no longer in PLUGINS are pruned (removed plugin).
        //   2. Plugin IDs in PLUGINS but absent from the saved order are
        //      appended at the end — this handles plugins added after the
        //      user last saved their order, so new plugins always appear
        //      rather than silently vanishing from the Dashboard.
        const savedDashOrder = stored[RC_STORE.DASH_ORDER];
        if (Array.isArray(savedDashOrder) && savedDashOrder.length > 0) {
          const knownIds    = new Set(PLUGINS.map(p => p.id));
          const savedSet    = new Set(savedDashOrder);
          // Keep only IDs that still exist as registered plugins.
          const normalized  = savedDashOrder.filter(id => knownIds.has(id));
          // Append any new plugins not present in the saved order.
          PLUGINS.forEach(p => {
            if (!savedSet.has(p.id)) normalized.push(p.id);
          });
          dashboardOrder = normalized;
        }
        // If no valid saved order exists, dashboardOrder keeps its
        // DEFAULT_PLUGIN_ORDER value — the canonical default is preserved.

        const savedView = stored[RC_STORE.NAV_VIEW];
        if (savedView && typeof savedView === 'string') {
          _restoredNavView = savedView;
        }

        // ── SF settings ──────────────────────────────────────────────────────
        const sfSettings = stored[RC_STORE.SF_SETTINGS];
        if (sfSettings && typeof sfSettings === 'object') {
          _restoredSfSettings = sfSettings;
        }

        // ── SF v4 prompt/download state ──────────────────────────────────────
        const savedDownload = stored[RC_STORE.SF_LAST_DOWNLOAD];
        if (savedDownload && typeof savedDownload === 'object') {
          _restoredSfLastDownload = savedDownload;
        }
        const savedSelectedPrompt = stored[RC_STORE.SF_SELECTED_PROMPT];
        if (savedSelectedPrompt && typeof savedSelectedPrompt === 'string') {
          _restoredSfSelectedPrompt = savedSelectedPrompt;
        }
        const savedContextFile = stored[RC_STORE.SF_CONTEXT_FILE];
        if (savedContextFile && typeof savedContextFile === 'string') {
          _restoredSfContextFile = savedContextFile;
        }
        const savedAdditionalInstructions = stored[RC_STORE.SF_ADDITIONAL_INSTRUCTIONS];
        if (savedAdditionalInstructions && typeof savedAdditionalInstructions === 'string') {
          _restoredSfAdditionalInstructions = savedAdditionalInstructions;
        }

        // ── App / platform settings ──────────────────────────────────────────
        const savedAppSettings = stored[RC_STORE.APP_SETTINGS];
        if (savedAppSettings && typeof savedAppSettings === 'object') {
          // Merge over defaults so new settings added in future versions
          // always get a sensible default even on first open after upgrade.
          appSettings = { ...DEFAULT_SETTINGS, ...savedAppSettings };
        }

        // ── Plugins section collapsed state ──────────────────────────────────
        const savedCollapsed = stored[RC_STORE.PLUGINS_COLLAPSED];
        if (typeof savedCollapsed === 'boolean') {
          pluginsSectionCollapsed = savedCollapsed;
        }

        // ── Sidebar width (side panel only) ──────────────────────────────────
        const savedSidebarWidth = stored[RC_STORE.SIDEBAR_WIDTH];
        if (savedSidebarWidth && typeof savedSidebarWidth === 'string' &&
            /^\d+(\.\d+)?px$/.test(savedSidebarWidth)) {
          const w = parseFloat(savedSidebarWidth);
          if (w >= SIDEBAR_MIN_WIDTH && w <= SIDEBAR_MAX_WIDTH) {
            _restoredSidebarWidth = savedSidebarWidth;
          }
        }

        // ── ADF settings — seed cache from startup batch (F-13) ──────────────
        // Seeding _adfSettingsCache here (synchronously, from the already-loaded
        // startup batch) means wireAdfToggle() writes are safe immediately after
        // DOMContentLoaded, with no async race window.
        const adfCfgBatch = stored[RC_STORE.ADF_SETTINGS];
        if (adfCfgBatch && typeof adfCfgBatch === 'object') {
          _adfSettingsCache = Object.assign(
            { openInNewTab: true, saveSearchHistory: true, saveOpenHistory: true },
            adfCfgBatch
          );
        }

        // ── Preflight ever-ran flag (F-15) ───────────────────────────────────
        // Read as part of the startup batch so the boot sequence does not need
        // a second chrome.storage.local.get just to check this boolean flag.
        _restoredPreflightEverRan = !!stored[RC_STORE.PREFLIGHT_EVER_RAN];

      } catch (err) {
        // Never crash on bad stored data
        addLog('warn', 'platform', '[RC] restoreSession error (data may be corrupt - skipping): ' + String(err));
      }

      resolve();
    });
  });
}

// ─── Notification System ──────────────────────────────────────────────────────
//
// Notification types and their visual treatment:
//   success  — green   — operation completed successfully
//   info     — blue    — neutral information, no action required
//   warning  — amber   — potential issue, action may be needed
//   error    — red     — operation failed, action required
//
// Every call to addNotification() also shows a short-lived toast.

const notifStore = [];   // { id, title, message, type, pluginId, timestamp, read }
let notifIdCounter = 0;

/**
 * Icon helper for notifications, toasts, and the activity log.
 * Returns an <img> tag using the Streamline semantic registry when icon-helper.js
 * is loaded; falls back to a plain text label when it is not yet available.
 */
function _notifIconHtml(type) {
  const idMap = { success: 'states.success', info: 'states.info', warning: 'states.warning', error: 'states.error' };
  const semanticId = idMap[type] || 'states.info';
  const helper = window.ReplyCatorsIconHelper;
  if (helper && helper.iconImgTag) return helper.iconImgTag(semanticId, 16);
  // Fallback text labels (accessible text, no emoji pictographs)
  const textMap = { success: '[ok]', info: '[i]', warning: '[!]', error: '[x]' };
  return textMap[type] || '[i]';
}
/**
 * Icons used consistently across notifications, toasts, and the activity log.
 * F-03: evaluated lazily on first access so icon-helper.js has time to load.
 * Each type is cached after first resolution.
 */
const _NOTIF_ICON_CACHE = {};
function _getNotifIcon(type) {
  if (!_NOTIF_ICON_CACHE[type]) {
    _NOTIF_ICON_CACHE[type] = _notifIconHtml(type);
  }
  return _NOTIF_ICON_CACHE[type];
}
/** Compatibility alias — callers that use NOTIF_ICONS[type] continue to work. */
const NOTIF_ICONS = new Proxy({}, {
  get(_, type) { return _getNotifIcon(type); },
});

/** Icons used for activity log level display. */
const LOG_LEVEL_ICONS = { debug: 'states.info', info: 'states.info', warn: 'states.warning', error: 'states.error' };

/**
 * Add a platform notification and show a matching toast.
 * Respects per-type notification settings — if a type is disabled in
 * Settings, the notification is silently dropped (not stored, no toast).
 *
 * @param {string} title    Short summary shown in the notification header.
 * @param {string} message  Full detail shown in the notification body.
 * @param {'success'|'info'|'warning'|'error'} type  Severity / outcome type.
 * @param {string} [source] Plugin ID or 'platform' (default).
 */
// F-12: debounce timers for list rebuilds triggered by addNotification()/addLog().
// During active plugin operations many entries arrive in rapid succession; batching
// the DOM rebuild into a single rAF-aligned flush avoids O(n) full rebuilds per entry.
let _notifRenderTimer = null;
let _logRenderTimer   = null;

function addNotification(title, message, type, source) {
  const VALID_TYPES = ['success', 'info', 'warning', 'error'];
  const normType    = VALID_TYPES.includes(type) ? type : 'info';

  // Respect notification settings — drop if globally disabled or type disabled
  if (!appSettings.notifEnabled) return null;
  const typeKey = 'notif' + normType.charAt(0).toUpperCase() + normType.slice(1);
  if (!appSettings[typeKey]) return null;

  const notif = {
    id:        'notif-' + (++notifIdCounter),
    title:     String(title),
    message:   String(message),
    type:      normType,
    pluginId:  source || 'platform',
    timestamp: Date.now(),
    read:      false,
  };
  notifStore.unshift(notif);           // newest first
  if (notifStore.length > 100) notifStore.pop();

  persistNotifs();  // persist after every mutation
  updateNotifBadge();
  showToast(message, normType, title);

  // F-12: Re-render notification view when it is open, but debounce rapid bursts.
  // A 50 ms debounce collapses back-to-back notifications (e.g. bulk operations)
  // into a single DOM rebuild while remaining imperceptible to the user.
  if (currentView === 'notifications') {
    clearTimeout(_notifRenderTimer);
    _notifRenderTimer = setTimeout(renderNotifications, 50);
  }

  return notif;
}

function markAllRead() {
  notifStore.forEach(n => { n.read = true; });
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = notifStore.filter(n => !n.read).length;
  const badge  = document.getElementById('rc-notif-count');
  const dot    = document.getElementById('rc-notif-dot');
  if (badge) {
    badge.textContent   = unread;
    badge.style.display = unread > 0 ? 'inline-flex' : 'none';
  }
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}

function renderNotifications() {
  const list = document.getElementById('rc-notif-list');
  if (!list) return;
  markAllRead();

  if (!notifStore.length) {
    list.innerHTML = '<div class="rc-ops-empty">No notifications yet.</div>';
    return;
  }

  list.innerHTML = notifStore.map(n => {
    const time = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = new Date(n.timestamp).toLocaleDateString();
    const icon = NOTIF_ICONS[n.type] || _notifIconHtml('info');
    // Friendly source label: strip reverse-domain prefix for display
    const sourceLabel = n.pluginId === 'platform'
      ? 'Platform'
      : n.pluginId.replace(/^com\.replycators\./, '');
    return `
      <div class="rc-notif-item rc-notif-item--${n.type}">
        <div class="rc-notif-item__header">
          <span class="rc-notif-item__icon">${icon}</span>
          <strong class="rc-notif-item__title">${esc(n.title)}</strong>
          <span class="rc-notif-item__plugin" title="${esc(n.pluginId)}">${esc(sourceLabel)}</span>
          <span class="rc-notif-item__time" title="${date}">${time}</span>
        </div>
        <div class="rc-notif-item__body">${esc(n.message)}</div>
      </div>`;
  }).join('');
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

const logStore = [];   // { id, level, pluginId, message, timestamp }
let logIdCounter = 0;

/**
 * Add a structured log entry.
 * Respects the logLevel setting: 'normal' hides 'debug'; 'verbose' shows all.
 *
 * @param {'debug'|'info'|'warn'|'error'} level   Severity level.
 * @param {string}                         source  Plugin ID or 'platform'.
 * @param {string}                         message Human-readable message.
 */
function addLog(level, source, message) {
  const VALID_LEVELS = ['debug', 'info', 'warn', 'error'];
  const normLevel    = VALID_LEVELS.includes(level) ? level : 'info';

  // Log level filtering: normal → suppress debug; verbose/debug → allow all
  if (normLevel === 'debug' && appSettings.logLevel === 'normal') return null;
  const entry = {
    id:        'log-' + (++logIdCounter),
    level:     normLevel,
    pluginId:  source || 'platform',
    message:   String(message),
    timestamp: Date.now(),
  };
  logStore.unshift(entry);             // newest first
  if (logStore.length > 500) logStore.pop();

  persistLogs();  // persist after every mutation

  // F-12: Re-render activity view when it is open, but debounce rapid bursts.
  // Same 50 ms strategy as addNotification() — collapses high-frequency log
  // writes (e.g. SF extraction producing 10–20 entries) into a single repaint.
  if (currentView === 'notifications' && currentOperationsTab === 'activity') {
    clearTimeout(_logRenderTimer);
    _logRenderTimer = setTimeout(renderActivityLog, 50);
  }

  return entry;
}

function renderActivityLog() {
  const list = document.getElementById('rc-log-list');
  if (!list) return;

  const levelFilter  = document.getElementById('activity-log-level')?.value  || '';
  const pluginFilter = document.getElementById('activity-plugin-filter')?.value || '';

  const filtered = logStore.filter(e =>
    (!levelFilter  || e.level    === levelFilter) &&
    (!pluginFilter || e.pluginId === pluginFilter)
  );

  // Update section-header count badge
  const countEl = document.getElementById('rc-activity-count');
  if (countEl) {
    countEl.textContent = filtered.length
      ? filtered.length + (filtered.length !== logStore.length ? ' of ' + logStore.length : '') + ' entries'
      : '';
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="rc-ops-empty">' +
      (logStore.length ? 'No entries match the current filter.' : 'No log entries yet. Interact with a plugin to generate logs.') +
      '</div>';
    return;
  }

  list.innerHTML = filtered.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const iconId = LOG_LEVEL_ICONS[e.level] || 'states.info';
    const iconHtml = window.ReplyCatorsIconHelper?.iconImgTag?.(iconId, 16) ||
      '<img src="' + (window.ReplyCatorsIconHelper?.getSemanticIconPath?.(iconId) || 'assets/icons/streamline-ultimate-colors-free/status/info.svg') +
      '" aria-hidden="true" width="16" height="16" style="display:inline;vertical-align:middle;margin-right:4px;">';
    return `
      <div class="rc-log-entry rc-log-entry--${e.level}"
           title="${esc(e.level.toUpperCase())}: ${esc(e.message)}">
        <span class="rc-log-entry__time">${time}</span>
        <span class="rc-log-entry__level">${iconHtml} ${e.level.toUpperCase()}</span>
        <span class="rc-log-entry__plugin">${esc(e.pluginId)}</span>
        <span class="rc-log-entry__msg">${esc(e.message)}</span>
      </div>`;
  }).join('');
}

function initActivityView() {
  const levelSel  = document.getElementById('activity-log-level');
  const pluginSel = document.getElementById('activity-plugin-filter');
  const clearBtn  = document.getElementById('activity-clear-btn');

  // Plugin filter options are already present as static HTML in dashboard.html.
  // Do NOT dynamically append them again here — that would create duplicates
  // for every plugin every time the popup opens.

  levelSel?.addEventListener('change',  renderActivityLog);
  pluginSel?.addEventListener('change', renderActivityLog);
  clearBtn?.addEventListener('click', () => {
    logStore.length = 0;
    chrome.storage.local.remove(RC_STORE.LOGS);
    renderActivityLog();
    addLog('info', 'platform', 'Activity log cleared by user');
  });
}

// ─── Appearance / Settings Application ───────────────────────────────────────

/**
 * Apply a theme by setting data-theme on <body>.
 * Keeps the sidebar toggle icon in sync and updates the settings select.
 */
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  appSettings.theme = theme;

  // Sidebar quick-toggle icon: show sun on dark themes, moon on light themes
  // Uses DARK_THEME_SET (defined below) — single source of truth.
  const icon = document.getElementById('rc-theme-icon');
  if (icon) {
    const isDark = DARK_THEME_SET.has(theme);
    const iconId = isDark ? 'appearance.themeLight' : 'appearance.themeDark';
    const helper = window.ReplyCatorsIconHelper;
    if (helper && helper.iconImgTag) {
      icon.innerHTML = helper.iconImgTag(iconId, 20);
    } else {
      // renderSemanticIcons() will replace data-icon spans; set attribute for it to pick up
      icon.setAttribute('data-icon', iconId);
    }
  }

  const sel = document.getElementById('settings-theme');
  if (sel) sel.value = theme;
}

/**
 * Apply font family by setting data-font on <body>.
 * CSS reads this attribute and applies the correct font stack.
 *
 * TD-004 Option D: After applying, update the availability badge in Settings
 * using document.fonts.check() so users can see whether the selected font is
 * actually installed or silently falling back to the system font.
 */
function applyFont(font) {
  document.body.dataset.font = font;
  appSettings.font = font;
  const sel = document.getElementById('settings-font');
  if (sel) sel.value = font;
  updateFontAvailabilityBadge(font);
}

/**
 * Update the font availability indicator badge (#font-availability-badge).
 * Uses the CSS Font Loading API (document.fonts.check) to detect whether the
 * selected font is actually installed on this machine.
 *
 * System default always passes — it resolves to the OS UI font stack.
 * For non-system fonts the check uses a visible test string at 12px.
 *
 * TD-004 — Option D implementation (v1.18.0).
 */
function updateFontAvailabilityBadge(font) {
  const badge = document.getElementById('font-availability-badge');
  const row   = document.getElementById('font-availability-row');
  if (!badge) return;

  // System default is always available — hide the row entirely.
  if (font === 'system') {
    if (row) row.style.display = 'none';
    badge.textContent = '';
    badge.className = 'rc-settings-row__label rc-font-badge';
    badge.removeAttribute('title');
    return;
  }

  // Non-system font selected — ensure the row is visible.
  if (row) row.style.display = '';

  // Map setting values to font family names used in CSS.
  const FONT_NAMES = {
    'inter':           'Inter',
    'roboto':          'Roboto',
    'open-sans':       'Open Sans',
    'ibm-plex-sans':   'IBM Plex Sans',
    'source-sans-pro': 'Source Sans Pro',
  };
  const fontName = FONT_NAMES[font];
  if (!fontName) return;

  // document.fonts.check() requires a size + family string.
  const available = document.fonts.check('12px "' + fontName + '"');
  if (available) {
    badge.textContent = fontName + ' is available on this machine';
    badge.className   = 'rc-settings-row__label rc-font-badge rc-font-badge--ok';
    badge.title       = fontName + ' is installed and will be applied.';
  } else {
    badge.textContent = fontName + ' is not installed - displaying Segoe UI instead';
    badge.className   = 'rc-settings-row__label rc-font-badge rc-font-badge--warn';
    badge.title       = fontName + ' is not available on this machine. The UI will use the Segoe UI fallback.';
  }
}

/**
 * Apply UI density by setting data-density on <body>.
 * CSS reads this and adjusts padding/spacing via custom properties.
 */
function applyDensity(density) {
  document.body.dataset.density = density;
  appSettings.density = density;
  const sel = document.getElementById('settings-density');
  if (sel) sel.value = density;
}

/**
 * Render all semantic icons in the DOM.
 *
 * For each element with data-icon="category.id", replaces it with an <img>
 * tag that loads the corresponding SVG icon from the local registry.
 *
 * This is called during DOMContentLoaded after settings are applied,
 * ensuring icons are visible on first paint and theme-aware.
 */
function renderSemanticIcons() {
  if (!window.ReplyCatorsIconHelper) return; // icon-helper.js not loaded

  // Size lookup: detect the rendering context from the nearest ancestor class.
  // Prevents the default 24px from overflowing constrained containers.
  function _iconSize(el) {
    if (el.closest('.rc-plugin-header__icon')) return 20;
    if (el.closest('.rc-nav__icon'))           return 16;
    if (el.closest('.rc-widget-card__title'))  return 16;
    if (el.closest('.rc-doc-icon'))            return 16;
    return 24;
  }

  const elements = document.querySelectorAll('[data-icon]');
  elements.forEach(el => {
    const iconId = el.getAttribute('data-icon');
    if (iconId) {
      const isDecorative = el.hasAttribute('aria-hidden');
      const className = el.getAttribute('class') || '';
      const html = window.ReplyCatorsIconHelper.renderIcon(iconId, {
        decorative: isDecorative,
        className: className,
        size: _iconSize(el)
      });
      // Create a container and parse the HTML safely
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const img = temp.firstChild;
      if (img) {
        el.replaceWith(img);
      }
    }
  });
}

/**
 * Apply all accessibility settings as data-* attributes on <body>.
 * CSS reads these and enables/disables the corresponding rules.
 */
function applyAccessibility() {
  const b = document.body;
  b.dataset.largerFont        = appSettings.largerFont        ? 'true' : 'false';
  b.dataset.reducedAnimations = appSettings.reducedAnimations ? 'true' : 'false';
  b.dataset.highContrast      = appSettings.highContrast      ? 'true' : 'false';
  b.dataset.enhancedFocus     = appSettings.enhancedFocus     ? 'true' : 'false';

  // Sync checkboxes in settings view if already rendered
  const syncCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  syncCheck('settings-larger-font',        appSettings.largerFont);
  syncCheck('settings-reduced-animations', appSettings.reducedAnimations);
  syncCheck('settings-high-contrast',      appSettings.highContrast);
  syncCheck('settings-enhanced-focus',     appSettings.enhancedFocus);
}

/**
 * Apply dashboard preferences: compact mode and show/hide plugin cards.
 *
 * RC-002 fix: dashShowCards now toggles body.dataset.dashShowCards so CSS
 *             can hide/show .rc-widget-card elements.
 */
function applyDashboardPrefs() {
  document.body.dataset.dashCompact   = appSettings.dashCompact   ? 'true' : 'false';
  document.body.dataset.dashShowCards = appSettings.dashShowCards ? 'true' : 'false';
}

/**
 * Apply the user-configured popup size by setting --rc-popup-w / --rc-popup-h
 * CSS custom properties on :root.
 *
 * Only takes effect in Popup mode — Side Panel uses 100vw / 100vh and overrides
 * these with !important rules that take precedence over the CSS variables.
 *
 * Also updates the RC_POPUP_WIDTH sentinel so detectAndApplySidePanelMode()
 * correctly identifies the popup context when a non-default width is in use.
 *
 * Validation: custom values are clamped to the browser-enforced maximum of
 * 800x600 (Chrome/Edge action-popup hard limit) with a sane minimum of 400x300.
 * Values outside the valid range fall back to the standard preset.
 * Legacy values 'small', 'medium', 'large' are migrated to 'compact'/'standard'.
 */
function applyPopupSize() {
  // Migrate stale preset names written by earlier versions.
  if (appSettings.popupSize === 'small')  { appSettings.popupSize = 'compact';  persistAppSettings(); }
  if (appSettings.popupSize === 'medium') { appSettings.popupSize = 'standard'; persistAppSettings(); }
  if (appSettings.popupSize === 'large')  { appSettings.popupSize = 'standard'; persistAppSettings(); }

  const preset = appSettings.popupSize || 'standard';
  let w, h;

  if (preset === 'custom') {
    const cw = parseInt(appSettings.popupCustomWidth,  10);
    const ch = parseInt(appSettings.popupCustomHeight, 10);
    // Clamp to browser limits — silently corrects any previously-stored values
    // that were saved when the upper bound was incorrectly set to 1600/1200.
    w = isNaN(cw) ? POPUP_SIZE_PRESETS.standard.w
      : Math.min(POPUP_BROWSER_MAX_W, Math.max(400, cw));
    h = isNaN(ch) ? POPUP_SIZE_PRESETS.standard.h
      : Math.min(POPUP_BROWSER_MAX_H, Math.max(300, ch));
    // Write clamped values back so storage stays clean.
    if (w !== cw) appSettings.popupCustomWidth  = w;
    if (h !== ch) appSettings.popupCustomHeight = h;
  } else {
    const p = POPUP_SIZE_PRESETS[preset] || POPUP_SIZE_PRESETS.standard;
    w = p.w;
    h = p.h;
  }

  document.documentElement.style.setProperty('--rc-popup-w', w + 'px');
  document.documentElement.style.setProperty('--rc-popup-h', h + 'px');

  // Keep the sentinel in sync so side-panel detection stays accurate.
  RC_POPUP_WIDTH = w;

  // Mark this document as a configured popup so that detectAndApplySidePanelMode()
  // does not misclassify a larger-than-800 popup as a side-panel due to the async
  // delay between CSS resize and window.innerWidth updating.
  // Respect _startupIsSidePanel: if this document opened inside a genuine side panel
  // (innerWidth != 800 at script-parse time), do not override that detection.
  _isConfiguredPopup = !_startupIsSidePanel;

  // Show/hide the custom dimension inputs based on the selected preset.
  const customRow = document.getElementById('settings-popup-custom-row');
  if (customRow) {
    customRow.style.display = (preset === 'custom') ? '' : 'none';
  }
}

/**
 * Apply all persisted settings to the DOM in one pass.
 * Called once on startup after restoreSession().
 */
function applyAllSettings() {
  applyTheme(appSettings.theme);
  applyFont(appSettings.font);
  applyDensity(appSettings.density);
  applyAccessibility();
  applyDashboardPrefs();
  applyPopupSize();
}

// Dark-theme set used for the quick toggle — must stay in sync with platform.css
const DARK_THEME_SET = new Set([
  'dark', 'midnight-blue', 'nord', 'dracula', 'solarized-dark',
  'graphite', 'high-contrast-dark', 'ibm-blue', 'replycators',
]);

function initTheme() {
  // RC-013 fix: quick-toggle remembers the previous dark/light theme so
  //             switching back restores the original selection, not just 'dark'.
  document.getElementById('rc-theme-toggle')?.addEventListener('click', () => {
    const cur  = appSettings.theme || 'ibm-blue';
    const isCurrentlyDark = DARK_THEME_SET.has(cur);
    if (isCurrentlyDark) {
      appSettings._lastDarkTheme = cur;
      const next = appSettings._lastLightTheme || 'light';
      applyTheme(next);
    } else {
      appSettings._lastLightTheme = cur;
      const next = appSettings._lastDarkTheme || 'ibm-blue';
      applyTheme(next);
    }
    persistAppSettings();
    addLog('info', 'platform', 'Theme toggled to: ' + appSettings.theme);
  });
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const FEEDBACK_RECIPIENTS = Object.freeze([
  'Jakub.Nytko@ibm.com',
  'Marcin.Jorasz@ibm.com'
]);
const FEEDBACK_RECIPIENTS_TEXT = FEEDBACK_RECIPIENTS.join('\n');
const FEEDBACK_MAX_SUBJECT = 160;
const FEEDBACK_MAX_MESSAGE = 5000;
const FEEDBACK_MAILTO_LIMIT = 1800;
let feedbackDiagnosticsFileName = null;
let lastGeneratedFeedbackMailto = '';

let currentView = 'dashboard';

/**
 * Navigate to a view by ID.
 *
 * If the view belongs to a disabled plugin, redirect to the Plugin Manager
 * and show a warning.  This enforces the plugin lifecycle — disabled plugins
 * are completely inaccessible through any navigation path.
 */
let currentOperationsTab = 'notifications';

function setOperationsTab(tab) {
  currentOperationsTab = ['notifications', 'activity'].includes(tab) ? tab : 'notifications';
  const tabs = {
    notifications: document.getElementById('rc-center-tab-notifications'),
    activity:      document.getElementById('rc-center-tab-activity'),
  };
  const panels = {
    notifications: document.getElementById('rc-center-panel-notifications'),
    activity:      document.getElementById('rc-center-panel-activity'),
  };
  Object.keys(tabs).forEach(key => {
    const active = key === currentOperationsTab;
    tabs[key]?.setAttribute('aria-selected', active ? 'true' : 'false');
    tabs[key]?.classList.toggle('rc-btn--primary', active);
    tabs[key]?.classList.toggle('rc-btn--ghost', !active);
    if (panels[key]) panels[key].hidden = !active;
  });
  if (currentOperationsTab === 'notifications') renderNotifications();
  if (currentOperationsTab === 'activity') renderActivityLog();
}

let currentMaintenanceTab = 'diagnostics';

function setMaintenanceTab(tab) {
  currentMaintenanceTab = ['diagnostics', 'backup'].includes(tab) ? tab : 'diagnostics';
  const tabs = {
    diagnostics: document.getElementById('rc-maint-tab-diagnostics'),
    backup:      document.getElementById('rc-maint-tab-backup'),
  };
  const panels = {
    diagnostics: document.getElementById('rc-maint-panel-diagnostics'),
    backup:      document.getElementById('rc-maint-panel-backup'),
  };
  Object.keys(tabs).forEach(key => {
    const active = key === currentMaintenanceTab;
    tabs[key]?.setAttribute('aria-selected', active ? 'true' : 'false');
    tabs[key]?.classList.toggle('rc-btn--primary', active);
    tabs[key]?.classList.toggle('rc-btn--ghost', !active);
    if (panels[key]) panels[key].hidden = !active;
  });
  if (currentMaintenanceTab === 'diagnostics') {
    // Always bind sub-tab controls so Overview/Cache switching works immediately.
    bindCacheInspectorControls();
    // Restore persisted check-card results instantly (no re-run of checks).
    restorePreflightResults();
    // Load Overview JSON and Cache & Storage data. This is the only path that
    // populates #rc-diag-output and the cache inspector — it must run on every
    // Diagnostics tab activation, not only on explicit Refresh.
    loadDiagnostics();
  }
  if (currentMaintenanceTab === 'backup') window.ReplyCatorsPlugins?.BackupRestore?.onNavigate?.();
}

function navigateTo(view) {
  // Guard: check whether this view belongs to a disabled plugin.
  // BUG-E fix: clarify the enabled check — a plugin is disabled only when
  // explicitly set to false; undefined/missing defaults to enabled.
  const targetPlugin = PLUGINS.find(p => p.viewId === view);
  if (targetPlugin && pluginStates[targetPlugin.id]?.enabled === false) {
    // Plugin is disabled — redirect to Plugin Manager with a warning toast.
    // BUG-A fix: use addNotification() so the master switch is respected.
    // showToast() is intentionally bypassed here because disabling a plugin
    // is a system-level redirect, not a user-initiated notification event.
    // We show it unconditionally because the user explicitly tried to navigate.
    showToast(
      targetPlugin.name + ' is disabled. Enable it in Plugin Manager to access this view.',
      'warning', 'Plugin Disabled', true   // force=true: system redirect always shown
    );
    view = 'plugins';   // redirect
  }

  // Dispatch onLeave to the plugin we are navigating away from (F-002).
  // Driven by PLUGINS[].leaveHook — no manual per-plugin if-chain needed.
  const leavingPlugin = PLUGINS.find(p => p.viewId === currentView);
  if (leavingPlugin && leavingPlugin.leaveHook && currentView !== view) {
    window.ReplyCatorsPlugins?.[leavingPlugin.pluginKey]?.[leavingPlugin.leaveHook]?.();
  }

  if (view === 'activity') {
    setOperationsTab('activity');
    view = 'notifications';
  } else if (view === 'notifications') {
    setOperationsTab('notifications');
  } else if (view === 'diagnostics') {
    // Compat redirect: old 'diagnostics' deep-links now land in Maintenance Center
    setMaintenanceTab('diagnostics');
    view = 'maintenance';
  } else if (view === 'backup-restore') {
    // Compat redirect: old 'backup-restore' nav now lands in Maintenance Center → Backup tab
    setMaintenanceTab('backup');
    view = 'maintenance';
  }

  currentView = view;
  persistNavView(view);  // persist immediately
  document.querySelectorAll('.rc-view').forEach(v => v.classList.remove('rc-view--active'));
  document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('rc-nav__item--active'));

  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('rc-view--active');

  const btnEl = document.querySelector('[data-view="' + view + '"]');
  if (btnEl) btnEl.classList.add('rc-nav__item--active');

  const crumb = document.getElementById('rc-breadcrumb');
  if (crumb) {
    crumb.textContent = btnEl ? (btnEl.querySelector('.rc-nav__label')?.textContent || view) : view;
  }

  // Render view-specific content on navigate
  if (view === 'notifications')    setOperationsTab(currentOperationsTab || 'notifications');
  if (view === 'maintenance')      setMaintenanceTab(currentMaintenanceTab || 'diagnostics');
  if (view === 'feedback')         refreshFeedbackUI();
  if (view === 'documentation')    window.ReplyCatorsPlugins?.Documentation?.render?.();
  // Dispatch navHook to the plugin we are navigating into (F-002).
  // Driven by PLUGINS[].navHook — adding a new plugin only requires an entry
  // in PLUGINS[]; no manual edit to this function is needed.
  const arrivingPlugin = PLUGINS.find(p => p.viewId === view);
  if (arrivingPlugin && arrivingPlugin.pluginKey && arrivingPlugin.navHook) {
    window.ReplyCatorsPlugins?.[arrivingPlugin.pluginKey]?.[arrivingPlugin.navHook]?.();
  }
}

/**
 * Apply plugin visibility across the entire UI based on current pluginStates.
 *
 * For each plugin:
 *   - ENABLED:  Show sidebar nav button, dashboard widget card, quick-action card
 *   - DISABLED: Hide sidebar nav button, dashboard widget card, quick-action card
 *
 * This is the single function that enforces plugin lifecycle in the UI.
 * Called after every enable/disable toggle and on every startup.
 *
 * RC-UX002 / RC-F009 fix: Plugin nav items are no longer hardcoded in dashboard.html.
 * This function now builds missing nav buttons on first call, then shows/hides them
 * on subsequent calls.  This ensures:
 *   1. The sidebar "Plugins" section is always driven by the PLUGINS registry.
 *   2. Disabled plugins do not appear as ghost nav entries.
 *   3. New plugins automatically appear without manual HTML changes.
 */
function applyPluginVisibility() {
  const navContainer = document.getElementById('rc-plugin-nav-items');

  PLUGINS.forEach(p => {
    const enabled = pluginStates[p.id]?.enabled !== false;

    // ── Sidebar nav button ────────────────────────────────────────────────────
    // Build the button if it does not yet exist (first call after page load).
    let navBtn = navContainer
      ? navContainer.querySelector(`[data-view="${p.viewId}"]`)
      : null;

    if (!navBtn && navContainer) {
      // Create the nav item dynamically — single source of truth is PLUGINS array.
      navBtn = document.createElement('button');
      navBtn.className  = 'rc-nav__item';
      navBtn.dataset.view = p.viewId;
      navBtn.title      = p.description || p.name;
      // Use the semantic icon ID from the plugin descriptor, resolved via icon-helper.
      // p.icon is a semantic ID (e.g. 'plugins.tabSearch') — never a raw emoji here.
      const navIconHtml = window.ReplyCatorsIconHelper?.iconImgTag?.(p.icon || 'fallback.unknownPlugin', 20) ||
        `<img src="assets/icons/streamline-ultimate-colors-free/plugins/unknown.svg" aria-hidden="true" width="20" height="20" alt="" class="rc-icon" style="display:inline;vertical-align:middle;flex-shrink:0;">`;
      navBtn.innerHTML  = `<span class="rc-nav__icon" aria-hidden="true">${navIconHtml}</span>` +
                          `<span class="rc-nav__label">${esc(p.name)}</span>`;
      navBtn.addEventListener('click', () => navigateTo(p.viewId));
      navContainer.appendChild(navBtn);
    }

    if (navBtn) {
      navBtn.style.display = enabled ? '' : 'none';
    }

    // ── Dashboard widget card ─────────────────────────────────────────────────
    // Widget cards carry a data-plugin-widget attribute set to the plugin ID
    const widget = document.querySelector(`.rc-widget-card[data-plugin-widget="${p.id}"]`);
    if (widget) {
      widget.style.display = enabled ? '' : 'none';
    }

    // ── Quick-action card ─────────────────────────────────────────────────────
    // Quick-action cards carry a data-plugin-action attribute set to the plugin ID
    const action = document.querySelector(`.rc-action-card[data-plugin-action="${p.id}"]`);
    if (action) {
      action.style.display = enabled ? '' : 'none';
    }
  });

  // ── Dashboard widgets empty-state ─────────────────────────────────────────
  // Show the empty-state message when every plugin widget is hidden.
  const allDisabled = PLUGINS.every(p => pluginStates[p.id]?.enabled === false);
  const emptyState  = document.getElementById('rc-widgets-empty-state');
  if (emptyState) emptyState.style.display = allDisabled ? 'block' : 'none';

  // If the currently displayed view belongs to a plugin that just got disabled,
  // redirect to dashboard.
  // BUG-E fix: consistent explicit === false check.
  const currentPlugin = PLUGINS.find(p => p.viewId === currentView);
  if (currentPlugin && pluginStates[currentPlugin.id]?.enabled === false) {
    navigateTo('dashboard');
  }

  updateStats();

  // Re-apply collapse state after items are (re-)built so the class
  // is always in sync with the in-memory flag.
  applyPluginsSectionState();
}

// ─── Plugins data ─────────────────────────────────────────────────────────────

// ─── PLUGINS registry ─────────────────────────────────────────────────────────
//
// Each entry is the single source of truth for a plugin's metadata AND its
// navigation lifecycle hooks.
//
// Fields used by navigateTo() dispatch (F-002):
//   pluginKey  — key on window.ReplyCatorsPlugins (e.g. 'SalesforceCaseExtractor')
//   navHook    — method called when navigating INTO this plugin's view
//                ('onNavigate' | 'render')
//   leaveHook  — method called when navigating AWAY from this plugin's view
//                ('onLeave' | null — omit or null if the plugin has no leave cleanup)
//
// Adding a new plugin: set pluginKey, navHook, and leaveHook here.
// navigateTo() will pick them up automatically — no manual if-chain edit needed.
//
// VERSION SYNC REMINDER: when bumping a plugin version, update BOTH this array
// AND the matching <span class="rc-plugin-header__version"> in dashboard.html.
// The two locations must stay identical. See AGENTS.md §12 Authoritative Version
// Locations for the full list.

const PLUGINS = [
  {
    id: 'com.replycators.salesforce-extractor',
    name: 'Salesforce Case Extractor',
    version: '4.12.4',
    description: 'Extracts Salesforce case data - case number, subject, account, contact, description, agent description, severity level, primary product, next action datetime, and a unified chronological feed (customer, internal, JIRA/ETL, and diagnostic posts) - into a structured plain-text summary. Uses clone-based DOM cleanup (v0.4.5 engine), multi-strategy record container resolution, parent-case post filtering, and a diagnostic system.',
    author: 'ReplyCators Platform',
    category: 'apptione',
    tags: ['salesforce', 'crm', 'support'],
    icon: 'plugins.salesforceCaseExtractor',
    viewId: 'plugin-salesforce',
    pluginKey: 'SalesforceCaseExtractor',
    navHook: 'onNavigate',
    leaveHook: null,
  },
  {
    id: 'com.replycators.cloudability-orgid',
    name: 'Cloudability OrgID',
    version: '4.0.4',
    description: 'Retrieves the Cloudability Organisation ID by intercepting the Cloudability settings API. Requires an open Cloudability tab.',
    author: 'ReplyCators Platform',
    category: 'cloudability',
    tags: ['cloudability', 'orgid', 'apptio'],
    icon: 'plugins.cloudabilityOrgId',
    viewId: 'plugin-cloudability-orgid',
    pluginKey: 'CloudabilityOrgId',
    navHook: 'onNavigate',
    leaveHook: null,
  },
  {
    id: 'com.replycators.example-plugin',
    name: 'Example Plugin',
    version: '1.0.2',
    description: 'A minimal reference plugin showing all SDK capabilities. Use as a template for new plugins.',
    author: 'ReplyCators Platform',
    category: 'general',
    tags: ['example', 'template'],
    icon: 'plugins.examplePlugin',
    viewId: 'plugin-example',
    pluginKey: 'ExamplePlugin',
    navHook: 'onNavigate',
    leaveHook: 'onLeave',
  },
  {
    id: 'com.replycators.edge-bookmark-finder',
    name: 'Edge Bookmark Finder',
    version: '1.0.2',
    description: 'Search Microsoft Edge bookmarks across the complete bookmark hierarchy - Bookmark Bar, Other Bookmarks, nested folders. Real-time multi-word search by title, URL, domain, or folder. Duplicate detection and analytics included.',
    author: 'ReplyCators Platform',
    category: 'general',
    tags: ['bookmarks', 'edge', 'search', 'productivity'],
    icon: 'plugins.edgeBookmarkFinder',
    viewId: 'plugin-edge-bookmarks',
    pluginKey: 'EdgeBookmarkFinder',
    navHook: 'render',
    leaveHook: null,
  },
  {
    id: 'com.replycators.apptio-planning-upgrade-calculator',
    name: 'Apptio Planning Upgrade Calculator',
    version: '1.0.3',
    description: 'Calculates Apptio Planning upgrade dates. Dynamically retrieves the IBM Community release schedule with live fetch, cache, and local fallback. Supports known and unknown upgrade day calculations, sandbox windows, and generates professional customer response templates.',
    author: 'ReplyCators Platform',
    category: 'planning',
    tags: ['apptio', 'planning', 'upgrade', 'schedule'],
    icon: 'plugins.apptioUpgradeCalculator',
    viewId: 'plugin-apptio-upgrade-calc',
    pluginKey: 'ApptioUpgradeCalculator',
    navHook: 'render',
    leaveHook: null,
  },
  {
    id: 'com.replycators.snake',
    name: 'Snake',
    version: '1.0.1',
    description: 'Classic retro arcade Snake game faithfully recreated inside ReplyCators. Monochrome LCD screen, pixelated segments, classic movement mechanics, high score persistence.',
    author: 'ReplyCators Platform',
    category: 'general',
    tags: ['snake', 'retro', 'arcade', 'game'],
    icon: 'plugins.snake',
    viewId: 'plugin-snake',
    pluginKey: 'Snake',
    navHook: 'onNavigate',
    leaveHook: 'onLeave',
  },
  {
    id: 'com.replycators.workspace-starter',
    name: 'Workspace Starter',
    version: '2.0.2',
    description: 'Launch your entire daily workspace with a single click. Create named workspace profiles containing multiple URLs - open all tabs at once, automatically grouped. Capture your current browser window as a new profile instantly.',
    author: 'ReplyCators Platform',
    category: 'general',
    tags: ['workspace', 'launcher', 'startup', 'tabs', 'productivity'],
    icon: 'plugins.workspaceStarter',
    viewId: 'plugin-workspace-starter',
    pluginKey: 'WorkspaceStarter',
    navHook: 'render',
    leaveHook: null,
  },
  {
    id: 'com.replycators.tab-search',
    name: 'Tab Search',
    version: '1.0.1',
    description: 'Search, filter, navigate, and manage all currently open browser tabs across all windows. Instant search by title, URL, or hostname. Duplicate detection, grouping by domain, sort options, and tab statistics.',
    author: 'ReplyCators Platform',
    category: 'general',
    tags: ['tabs', 'search', 'browser', 'productivity', 'navigation'],
    icon: 'plugins.tabSearch',
    viewId: 'plugin-tab-search',
    pluginKey: 'TabSearch',
    navHook: 'render',
    leaveHook: null,
  },
  {
    id: 'com.replycators.apptio-docs-finder',
    name: 'Apptio Documentation Finder',
    version: '1.0.2',
    description: 'Search IBM Apptio documentation instantly. Supports Apptio, Platform, Cloudability, and Targetprocess product families. Live category refresh from IBM Documentation API, favorites, recent searches, and URL previews.',
    author: 'ReplyCators Platform',
    category: 'general',
    tags: ['ibm', 'apptio', 'documentation', 'search', 'productivity'],
    icon: 'plugins.apptioDocsFinder',
    viewId: 'plugin-apptio-docs-finder',
    pluginKey: 'ApptioDocsFinder',
    navHook: 'onNavigate',
    leaveHook: null,
  },
  {
    id: 'com.replycators.env-dashboards',
    name: 'Environment Dashboards Launcher',
    version: '1.4.0',
    description: 'Launches Splunk and Grafana monitoring dashboards for any customer environment with one click. Auto-resolves Namespace, Cluster, Region, and AWS datasource from the environment name. Supports *.apptio.com and *.apps.papt.to tab detection.',
    author: 'ReplyCators Platform',
    category: 'apptione',
    tags: ['splunk', 'grafana', 'dashboard', 'monitoring', 'support', 'environment', 'akp'],
    icon: 'plugins.envDashboards',
    viewId: 'plugin-env-dashboards',
    pluginKey: 'EnvDashboards',
    navHook: 'onNavigate',
    leaveHook: 'onLeave',
  },
];

const MARKETPLACE_PLUGINS = [
  { name: 'ServiceNow',    icon: 'marketplacePlugins.servicenow',   category: 'itsm',              desc: 'Extract and manage ServiceNow incidents and requests.' },
  { name: 'Jira',          icon: 'marketplacePlugins.jira',         category: 'project-management', desc: 'View and interact with Jira issues directly.' },
  { name: 'Confluence',    icon: 'marketplacePlugins.confluence',   category: 'productivity',       desc: 'Search and embed Confluence pages.' },
  { name: 'Microsoft 365', icon: 'marketplacePlugins.microsoft365', category: 'productivity',       desc: 'Integrate with Teams, Outlook, and SharePoint.' },
  { name: 'Azure DevOps',  icon: 'marketplacePlugins.azureDevOps',  category: 'developer-tools',    desc: 'Work items, pipelines, and repos.' },
  { name: 'Power BI',      icon: 'marketplacePlugins.powerBi',      category: 'analytics',          desc: 'Embed and interact with Power BI reports.' },
  { name: 'Zendesk',       icon: 'marketplacePlugins.zendesk',      category: 'itsm',              desc: 'Manage support tickets directly from the browser.' },
  { name: 'AI Assistant',  icon: 'marketplacePlugins.aiAssistant',  category: 'ai-assistant',       desc: 'Integrate with WatsonX, OpenAI, or Azure AI.' },
  { name: 'SAP',           icon: 'marketplacePlugins.sap',          category: 'enterprise',         desc: 'SAP transaction helper and data extractor.' },
  { name: 'Workday',       icon: 'marketplacePlugins.workday',      category: 'enterprise',         desc: 'HR and financial data at your fingertips.' },
];

// ─── Plugin Documentation Mapping ────────────────────────────────────────────
//
// Centralized mapping from plugin viewId to Documentation topic ID.
// Every plugin must have a corresponding entry here.
// Used by navigateToPluginDoc() and exposed via window.ReplyCatorsApp.
//
// Topic IDs must match keys in CONTENT_MAP inside plugins/documentation.js.
// When a new plugin is added:
//   1. Add a Documentation topic in plugins/documentation.js CONTENT_MAP.
//   2. Add the viewId -> topicId entry here.
//
// Missing entries cause navigateToPluginDoc() to open the root Documentation view.
const PLUGIN_DOC_MAP = {
  'plugin-salesforce':          'salesforce',
  'plugin-cloudability-orgid':  'cloudability-orgid',
  'plugin-env-dashboards':      'env-dashboards',
  'plugin-workspace-starter':   'workspace-starter',
  'plugin-tab-search':          'tab-search',
  'plugin-apptio-docs-finder':  'apptio-docs-finder',
  'plugin-apptio-upgrade-calc': 'apptio-calculator',
  'plugin-edge-bookmarks':      'bookmark-finder',
  'plugin-snake':               'snake',
  'plugin-example':             'example-plugin',
};

/**
 * Navigate to the Documentation view and open the topic that corresponds to
 * the given plugin viewId.
 *
 * If the plugin has no registered documentation topic the view opens at the
 * root Documentation page so the user is never stranded.
 *
 * Called from plugin header "Docs" buttons and widget card "Docs" links.
 *
 * @param {string} viewId  The plugin view ID (e.g. 'plugin-salesforce').
 */
function navigateToPluginDoc(viewId) {
  const topicId = PLUGIN_DOC_MAP[viewId] || null;
  if (topicId) {
    // Pre-select the topic so it is shown immediately when Documentation renders.
    const docs = window.ReplyCatorsPlugins?.Documentation;
    if (docs && typeof docs.setTopic === 'function') {
      docs.setTopic(topicId);
    } else {
      // Store pending topic in a module-level variable; picked up by the next render.
      window._rcDocsPendingTopic = topicId;
    }
  }
  navigateTo('documentation');
}

// ─── Canonical default plugin order ──────────────────────────────────────────
//
// This is the ONE authoritative default.  Rules:
//   • Ordering follows the IA priority model:
//       1. High-frequency productivity tools (CRM, cloud, search, workspace)
//       2. Enterprise utilities (upgrade calculator)
//       3. Discovery/leisure (docs finder, bookmarks, tab search)
//       4. Games (snake)
//       5. Reference template (example, always last)
//   • User-defined order (restored from storage) always takes precedence.
//   • This constant is never written to storage — it is only used when no
//     saved order exists.
//
// Any plugin ID present in PLUGINS but absent from this list is appended at
// the end (before Example Plugin) so new plugins never silently disappear.
const DEFAULT_PLUGIN_ORDER = [
  // #1 - #4: primary CRM, cloud, docs, and environment support tools
  'com.replycators.salesforce-extractor',           // #1
  'com.replycators.cloudability-orgid',             // #2
  'com.replycators.apptio-docs-finder',             // #3
  'com.replycators.env-dashboards',                 // #4
  // #5 - #7: productivity and workspace tools
  'com.replycators.workspace-starter',              // #5
  'com.replycators.tab-search',                     // #6
  'com.replycators.edge-bookmark-finder',           // #7
  // #8: enterprise utilities
  'com.replycators.apptio-planning-upgrade-calculator', // #8
  // #9 - #10: games and reference
  'com.replycators.snake',                          // #9
  'com.replycators.example-plugin',                 // #10
];

// Dashboard widget display order — array of plugin IDs.
// Initialised from DEFAULT_PLUGIN_ORDER; overwritten from chrome.storage on startup.
// Mutated by Move Up / Move Down.  Persisted via persistDashboardOrder().
let dashboardOrder = DEFAULT_PLUGIN_ORDER.slice();

/** Persist dashboard order to chrome.storage.local */
function persistDashboardOrder() {
  chrome.storage.local.set({ [RC_STORE.DASH_ORDER]: dashboardOrder }, () => {
    if (chrome.runtime.lastError) {
      addLog('warn', 'platform', '[RC] persistDashboardOrder failed: ' + chrome.runtime.lastError.message);
    }
  });
}

const pluginStates = {};
PLUGINS.forEach(p => { pluginStates[p.id] = { enabled: true }; });
// Example Plugin is disabled by default — it is a developer reference template, not a production tool.
// Users can enable it manually in Plugin Manager. It must always be last in DEFAULT_PLUGIN_ORDER.
pluginStates['com.replycators.example-plugin'] = { enabled: false };

// ─── Plugin Manager ───────────────────────────────────────────────────────────

// ─── Plugin Manager — sort state ─────────────────────────────────────────────
let pmSortField = 'name';   // 'name' | 'version' | 'status'
let pmSortAsc   = true;

// RC-UX005: Plugin Manager filter state — persists for the session
let pmFilterText     = '';
let pmFilterStatus   = '';
let pmFilterCategory = '';

function renderPluginGrid() {
  const grid = document.getElementById('rc-plugin-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // ── Build filtered + sorted plugin list ───────────────────────────────────
  const qText = pmFilterText.toLowerCase();
  const filteredPlugins = PLUGINS.filter(function(p) {
    if (qText) {
      const hay = (p.name + ' ' + p.description + ' ' + p.tags.join(' ')).toLowerCase();
      if (!hay.includes(qText)) return false;
    }
    if (pmFilterStatus) {
      const enabled = pluginStates[p.id]?.enabled !== false;
      if (pmFilterStatus === 'active'   && !enabled) return false;
      if (pmFilterStatus === 'inactive' &&  enabled) return false;
    }
    if (pmFilterCategory && p.category !== pmFilterCategory) return false;
    return true;
  });

  // Update count badge
  const countEl = document.getElementById('rc-pm-count');
  if (countEl) {
    if (pmFilterText || pmFilterStatus || pmFilterCategory) {
      countEl.textContent = filteredPlugins.length + ' of ' + PLUGINS.length + ' plugins';
    } else {
      countEl.textContent = '';
    }
  }

  // ── Sort header ────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'rc-plist-header';
  header.innerHTML =
    '<span class="rc-plist-col rc-plist-col--status"></span>' +
    '<span class="rc-plist-col rc-plist-col--name rc-plist-sort" data-sort="name">Plugin ' +
      (pmSortField === 'name' ? (pmSortAsc ? '▲' : '▼') : '') + '</span>' +
    '<span class="rc-plist-col rc-plist-col--version rc-plist-sort" data-sort="version">Version ' +
      (pmSortField === 'version' ? (pmSortAsc ? '▲' : '▼') : '') + '</span>' +
    '<span class="rc-plist-col rc-plist-col--desc">Description</span>' +
    '<span class="rc-plist-col rc-plist-col--tags">Tags</span>' +
    '<span class="rc-plist-col rc-plist-col--toggle rc-plist-sort" data-sort="status">Enabled ' +
      (pmSortField === 'status' ? (pmSortAsc ? '▲' : '▼') : '') + '</span>' +
    '<span class="rc-plist-col rc-plist-col--open">Open</span>' +
    '<span class="rc-plist-col rc-plist-col--order">Dashboard Order</span>';

  header.querySelectorAll('.rc-plist-sort').forEach(function(th) {
    th.style.cursor = 'pointer';
    th.addEventListener('click', function() {
      const f = th.dataset.sort;
      if (pmSortField === f) { pmSortAsc = !pmSortAsc; } else { pmSortField = f; pmSortAsc = true; }
      renderPluginGrid();
    });
  });
  grid.appendChild(header);

  // RC-016 fix: semver-aware version comparison — compare each numeric segment.
  function cmpSemver(va, vb) {
    const pa = va.split('.').map(Number);
    const pb = vb.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  // ── Sort plugins ───────────────────────────────────────────────────────────
  const sorted = filteredPlugins.slice().sort(function(a, b) {
    let cmp = 0;
    if (pmSortField === 'name')    { cmp = a.name.localeCompare(b.name); }
    if (pmSortField === 'version') { cmp = cmpSemver(a.version, b.version); }
    if (pmSortField === 'status')  {
      const ae = pluginStates[a.id]?.enabled !== false ? 'enabled' : 'disabled';
      const be = pluginStates[b.id]?.enabled !== false ? 'enabled' : 'disabled';
      cmp = ae.localeCompare(be);
    }
    return pmSortAsc ? cmp : -cmp;
  });

  sorted.forEach(function(p) {
    const isEnabled = pluginStates[p.id]?.enabled !== false;
    const pos       = dashboardOrder.indexOf(p.id);
    const isFirst   = pos === 0;
    const isLast    = pos === dashboardOrder.length - 1;
    const tags      = p.tags.slice(0, 3).map(function(t) {
      return '<span class="rc-tag">' + esc(t) + '</span>';
    }).join('');

    const row = document.createElement('div');
    row.className = 'rc-plist-row' + (isEnabled ? '' : ' rc-plist-row--disabled');
    row.dataset.pluginId = p.id;
    row.dataset.category = p.category;
    row.dataset.status   = isEnabled ? 'active' : 'inactive';
    row.title = esc(p.description);

    row.innerHTML =
      '<span class="rc-plist-col rc-plist-col--status">' +
        '<span class="rc-health rc-health--' + (isEnabled ? 'active' : 'inactive') + '"></span>' +
      '</span>' +
      '<span class="rc-plist-col rc-plist-col--name">' +
        '<span class="rc-plist-icon" aria-hidden="true">' + (window.ReplyCatorsIconHelper?.resolvePluginIconTag?.(p.icon, 20) || '') + '</span>' +
        '<span class="rc-plist-name">' + esc(p.name) + '</span>' +
      '</span>' +
      '<span class="rc-plist-col rc-plist-col--version rc-muted">v' + esc(p.version) + '</span>' +
      '<span class="rc-plist-col rc-plist-col--desc rc-muted">' +
        esc(p.description.substring(0, 80)) + (p.description.length > 80 ? '…' : '') +
        (p.description.length > 80
          ? ' <button class="rc-plist-desc-expand js-desc-expand" title="Show full description" aria-label="Expand description">▾</button>'
          : '') +
      '</span>' +
      '<span class="rc-plist-col rc-plist-col--tags">' + (tags || '<span class="rc-tag">' + esc(p.category) + '</span>') + '</span>' +
      '<span class="rc-plist-col rc-plist-col--toggle">' +
        '<label class="rc-toggle" title="' + (isEnabled ? 'Disable' : 'Enable') + ' ' + esc(p.name) + '" aria-label="' + (isEnabled ? 'Disable' : 'Enable') + ' ' + esc(p.name) + '">' +
          '<input type="checkbox" class="rc-toggle__input js-toggle" ' + (isEnabled ? 'checked' : '') + ' aria-label="' + (isEnabled ? 'Enabled' : 'Disabled') + ': ' + esc(p.name) + '" />' +
          '<span class="rc-toggle__slider"></span>' +
        '</label>' +
      '</span>' +
      '<span class="rc-plist-col rc-plist-col--open">' +
        '<button class="rc-btn rc-btn--ghost rc-btn--xs js-open" title="Open ' + esc(p.name) + '" aria-label="Open ' + esc(p.name) + '">Open</button>' +
      '</span>' +
      '<span class="rc-plist-col rc-plist-col--order">' +
        '<button class="rc-btn rc-btn--ghost rc-btn--xs js-order-up"' + (isFirst ? ' disabled' : '') + ' title="Move Up">▲</button>' +
        '<button class="rc-btn rc-btn--ghost rc-btn--xs js-order-down"' + (isLast ? ' disabled' : '') + ' title="Move Down">▼</button>' +
        '<span class="rc-plist-pos rc-muted">#' + (pos + 1) + '</span>' +
      '</span>';

    // RC-UX006: Expand full description inline
    const descExpandBtn = row.querySelector('.js-desc-expand');
    if (descExpandBtn) {
      descExpandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const existing = row.nextElementSibling;
        if (existing && existing.classList.contains('rc-plist-detail-row')) {
          existing.remove();
          descExpandBtn.textContent = '▾';
          descExpandBtn.title = 'Show full description';
        } else {
          const detail = document.createElement('div');
          detail.className = 'rc-plist-detail-row';
          detail.innerHTML =
            '<span class="rc-plist-detail-icon" aria-hidden="true">' + (window.ReplyCatorsIconHelper?.resolvePluginIconTag?.(p.icon, 32) || '') + '</span>' +
            '<div class="rc-plist-detail-body">' +
              '<div class="rc-plist-detail-desc">' + esc(p.description) + '</div>' +
              '<div class="rc-plist-detail-meta">' +
                '<span class="rc-tag">' + esc(p.category) + '</span>' +
                p.tags.map(function(t) { return '<span class="rc-tag">' + esc(t) + '</span>'; }).join('') +
              '</div>' +
            '</div>';
          row.insertAdjacentElement('afterend', detail);
          descExpandBtn.textContent = '▴';
          descExpandBtn.title = 'Hide full description';
        }
      });
    }

    // Open plugin view
    row.querySelector('.js-open').addEventListener('click', function() {
      navigateTo(p.viewId);
    });

    // Enable / disable toggle
    row.querySelector('.js-toggle').addEventListener('change', function(e) {
      pluginStates[p.id].enabled = e.target.checked;
      persistPluginStates();
      const action = e.target.checked ? 'enabled' : 'disabled';
      renderPluginGrid();
      applyPluginVisibility();
      addLog('info', p.id, 'Plugin "' + p.name + '" ' + action);
      addNotification(
        p.name + ' ' + action.charAt(0).toUpperCase() + action.slice(1),
        'Plugin "' + p.name + '" has been ' + action + '.',
        e.target.checked ? 'success' : 'info',
        p.id
      );
    });

    // Move Up
    var upBtn = row.querySelector('.js-order-up');
    if (upBtn) {
      upBtn.addEventListener('click', function() {
        var idx = dashboardOrder.indexOf(p.id);
        if (idx > 0) {
          var tmp = dashboardOrder[idx - 1];
          dashboardOrder[idx - 1] = dashboardOrder[idx];
          dashboardOrder[idx] = tmp;
          persistDashboardOrder();
          applyDashboardOrder();
          renderPluginGrid();
          addLog('info', 'platform', 'Dashboard: "' + p.name + '" moved up');
        }
      });
    }

    // Move Down
    var downBtn = row.querySelector('.js-order-down');
    if (downBtn) {
      downBtn.addEventListener('click', function() {
        var idx = dashboardOrder.indexOf(p.id);
        if (idx !== -1 && idx < dashboardOrder.length - 1) {
          var tmp = dashboardOrder[idx + 1];
          dashboardOrder[idx + 1] = dashboardOrder[idx];
          dashboardOrder[idx] = tmp;
          persistDashboardOrder();
          applyDashboardOrder();
          renderPluginGrid();
          addLog('info', 'platform', 'Dashboard: "' + p.name + '" moved down');
        }
      });
    }

    grid.appendChild(row);
  });

  // Empty state when no plugins match filters
  if (sorted.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rc-plist-empty';
    empty.textContent = 'No plugins match the current filters.';
    grid.appendChild(empty);
  }

  setEl('rc-plugin-count', PLUGINS.length);
}

/**
 * Re-order ALL plugin-ordered UI surfaces according to dashboardOrder.
 *
 * This is the SINGLE function that enforces plugin order across every surface.
 * There is exactly ONE source of truth: dashboardOrder[] / rc:session:dashboard-order.
 *
 * Surfaces updated:
 *   1. Dashboard widget cards   (#rc-dashboard-widgets .rc-widget-card)
 *   2. Left navigation buttons  (#rc-plugin-nav-items [data-view])
 *
 * Both are re-ordered by appending elements in dashboardOrder sequence.
 * DOM append moves an existing element to the end — elements not found in
 * dashboardOrder are left in place (e.g. if the list hasn't been restored yet).
 *
 * Called:
 *   - On startup (after restoreSession + applyPluginVisibility have both run)
 *   - After every Move Up / Move Down in Plugin Manager
 */
function applyDashboardOrder() {
  // ── 1. Dashboard widget cards ─────────────────────────────────────────────
  const widgets = document.getElementById('rc-dashboard-widgets');
  if (widgets) {
    dashboardOrder.forEach(function(pluginId) {
      const card = widgets.querySelector('.rc-widget-card[data-plugin-widget="' + pluginId + '"]');
      if (card) widgets.appendChild(card);  // moves to end in order
    });
  }

  // ── 2. Left navigation buttons ────────────────────────────────────────────
  // Nav buttons are created by applyPluginVisibility() on first call.
  // Re-ordering is safe at any point after they exist; missing buttons are
  // simply skipped (nothing breaks if the nav hasn't been built yet).
  const navContainer = document.getElementById('rc-plugin-nav-items');
  if (navContainer) {
    dashboardOrder.forEach(function(pluginId) {
      const plugin = PLUGINS.find(function(p) { return p.id === pluginId; });
      if (!plugin) return;
      const navBtn = navContainer.querySelector('[data-view="' + plugin.viewId + '"]');
      if (navBtn) navContainer.appendChild(navBtn);  // moves to end in order
    });
  }
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
// Marketplace rendering is handled by the Marketplace plugin module.
// Dashboard.js retains MARKETPLACE_PLUGINS as the data source, exposed
// through window.ReplyCatorsApp.getMarketplacePlugins().

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * RC-007 fix: query the background plugin registry for real error counts.
 * Falls back to 0 gracefully if the background worker is unavailable.
 *
 * The background round-trip (RC_GET_REGISTRY) is deferred to a setTimeout(0)
 * so it does not add latency to the synchronous startup render path.
 * The local counts (active/inactive/total) are updated immediately.
 */
function updateStats() {
  // BUG-C fix: use optional chaining so that plugins without a state entry
  // (edge case: PLUGINS array updated before restoreSession completes) do not throw.
  const active   = PLUGINS.filter(p =>  pluginStates[p.id]?.enabled !== false).length;
  const inactive = PLUGINS.filter(p =>  pluginStates[p.id]?.enabled === false).length;
  setEl('stat-total-plugins',    PLUGINS.length);
  setEl('stat-active-plugins',   active);
  setEl('stat-inactive-plugins', inactive);
  setEl('rc-plugin-count',       PLUGINS.length);

  // Defer the background round-trip to after the current call stack completes
  // so it does not hold up the synchronous startup render.
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'RC_GET_REGISTRY' }, response => {
      if (chrome.runtime.lastError || !response?.plugins) {
        setEl('stat-error-plugins', 0);
        return;
      }
      const errors = response.plugins.filter(p => p.health?.status === 'error').length;
      setEl('stat-error-plugins', errors);
    });
  }, 0);
}

function normalizeTimestamp(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    if (!isFinite(value) || value <= 0) return null;
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? null : parsed;
}

function formatDuration(ms) {
  if (ms == null || !isFinite(ms) || ms < 0) return '-';
  const minute = 60000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (ms < minute) return Math.round(ms / 1000) + ' sec';
  if (ms < hour) return Math.round(ms / minute) + ' min';
  if (ms < day) return Math.round(ms / hour) + ' hr';
  return Math.round(ms / day) + ' d';
}

function formatTimestamp(ms) {
  if (!ms || !isFinite(ms)) return '-';
  return new Date(ms).toLocaleString();
}

function estimateSizeBytes(value) {
  if (value == null) return 0;
  try { return new Blob([JSON.stringify(value)]).size; } catch (_) { return null; }
}

function formatBytes(bytes) {
  if (bytes == null || !isFinite(bytes)) return 'Unknown';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function sanitizeLogicalKey(key) {
  if (!key) return '-';
  return String(key).replace(/(:)([^:]{6,})(?=$|:)/g, function(match, prefix, segment) {
    if (/^rc:/.test(match) || /^adn_/.test(match) || /^com\./.test(segment)) return match;
    return prefix + segment.slice(0, 3) + '…';
  });
}

function clearStorageKey(key) {
  return new Promise(resolve => {
    chrome.storage.local.remove(key, function() {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || 'Storage remove failed' });
        return;
      }
      resolve({ ok: true });
    });
  });
}

function withTimeout(promise, timeoutMs) {
  return new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: 'Operation timed out after ' + Math.round(timeoutMs / 1000) + ' seconds.' });
    }, timeoutMs);
    Promise.resolve(promise).then(result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }).catch(err => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: err && err.message ? err.message : String(err) });
    });
  });
}

function evaluateCacheStatus(entry, value, now) {
  const valid = entry.validate ? entry.validate(value) : value != null;
  if (value == null) return RC_CACHE_STATUS.MISSING;
  if (!valid) return RC_CACHE_STATUS.INVALID;
  const updatedAt = entry.getUpdatedAt ? entry.getUpdatedAt(value) : null;
  if (!entry.ttlMs) return RC_CACHE_STATUS.FRESH;
  if (!updatedAt || !isFinite(updatedAt)) return RC_CACHE_STATUS.INVALID;
  const ageMs = Math.max(0, now - updatedAt);
  if (ageMs >= entry.ttlMs) return RC_CACHE_STATUS.EXPIRED;
  if (ageMs >= entry.ttlMs * 0.75) return RC_CACHE_STATUS.AGING;
  return RC_CACHE_STATUS.FRESH;
}

// F-001: collectCacheDiagnostics accepts a skipOrphanCheck flag.
// When true (used by loadDiagnostics on every Diagnostics tab activation) only the
// registered cache keys are fetched via a targeted get, avoiding a full get(null)
// deserialisation of the entire 5 MB store.  When false (used by loadCacheInspector
// on explicit cache-tab open) the full get(null) runs so orphaned-key detection works.
async function collectCacheDiagnostics(skipOrphanCheck) {
  const now = Date.now();
  let localData;
  let orphanedKeys = [];
  if (skipOrphanCheck) {
    // F-001: targeted read — only fetch keys the registry actually uses.
    localData = await new Promise(resolve => chrome.storage.local.get(CACHE_REGISTRY_KEYS, resolve));
  } else {
    // Full read — needed for orphan detection (must enumerate all rc:plugin:* keys).
    localData = await new Promise(resolve => chrome.storage.local.get(null, resolve));
  }
  const localBytes = await new Promise(resolve => chrome.storage.local.getBytesInUse(null, resolve));
  const quota = chrome.storage.local.QUOTA_BYTES || null;
  const items = CACHE_REGISTRY.map(entry => {
    const value = entry.readValue ? entry.readValue(localData) : localData[entry.storageKey];
    const updatedAt = entry.getUpdatedAt ? entry.getUpdatedAt(value) : null;
    const createdAt = entry.getCreatedAt ? entry.getCreatedAt(value) : null;
    const sizeBytes = estimateSizeBytes(value);
    const actionState = cacheInspectorState.actionState[entry.id] || {};
    const computedStatus = evaluateCacheStatus(entry, value, now);
    const status = actionState.statusOverride || computedStatus;
    const ageMs = updatedAt ? Math.max(0, now - updatedAt) : null;
    const expiryAt = entry.ttlMs && updatedAt ? updatedAt + entry.ttlMs : null;
    return {
      id: entry.id,
      ownerPluginId: entry.ownerPluginId,
      ownerPluginName: entry.ownerPluginName,
      displayName: entry.displayName,
      description: entry.description,
      storageArea: entry.storageArea,
      storageKey: entry.storageKey,
      logicalKeys: entry.logicalKeys || [entry.storageKey],
      legacyKeys: entry.legacyKeys || [],
      schemaVersion: entry.schemaVersion,
      ttlMs: entry.ttlMs,
      status,
      ageMs,
      expiryAt,
      updatedAt,
      createdAt,
      sizeBytes,
      sensitivity: entry.sensitivity,
      supportsRefresh: !!entry.supportsRefresh,
      supportsClear: !!entry.supportsClear,
      error: actionState.error || null,
    };
  });
  if (!skipOrphanCheck) {
    const registeredKeys = new Set(CACHE_REGISTRY.flatMap(entry => entry.logicalKeys || [entry.storageKey]));
    orphanedKeys = Object.keys(localData).filter(key => key.startsWith('rc:plugin:') && !registeredKeys.has(key));
  }
  return {
    items,
    // F-001/F-010: expose localData so callers can extract additional keys from the
    // already-fetched storage snapshot without issuing a second chrome.storage.local.get.
    localData,
    summary: {
      registeredCount: items.length,
      freshCount: items.filter(item => item.status === RC_CACHE_STATUS.FRESH).length,
      expiredCount: items.filter(item => item.status === RC_CACHE_STATUS.EXPIRED).length,
      invalidCount: items.filter(item => item.status === RC_CACHE_STATUS.INVALID).length,
      totalEstimatedSize: items.reduce((sum, item) => sum + (item.sizeBytes || 0), 0),
    },
    orphanedKeys,
    storage: { localBytes, quota, usagePct: quota ? (localBytes / quota) : null },
  };
}

function renderCacheSummary(state) {
  const el = document.getElementById('rc-cache-summary');
  if (!el) return;
  const cards = [
    ['Registered caches', state.summary.registeredCount],
    ['Fresh', state.summary.freshCount],
    ['Expired', state.summary.expiredCount],
    ['Invalid', state.summary.invalidCount],
    ['Estimated cache size', formatBytes(state.summary.totalEstimatedSize)],
    ['Storage used', formatBytes(state.storage.localBytes)],
  ];
  el.innerHTML = cards.map(card => '<div class="rc-cache-summary__card"><div class="rc-cache-summary__value">' + esc(String(card[1])) + '</div><div class="rc-cache-summary__label">' + esc(card[0]) + '</div></div>').join('');
}

function renderCacheFilterOptions(state) {
  const pluginSelect = document.getElementById('rc-cache-filter-plugin');
  if (!pluginSelect) return;
  const selected = pluginSelect.value || 'all';
  const names = Array.from(new Set(state.items.map(item => item.ownerPluginName))).sort();
  pluginSelect.innerHTML = '<option value="all">All plugins</option>' + names.map(name => '<option value="' + esc(name) + '">' + esc(name) + '</option>').join('');
  pluginSelect.value = names.includes(selected) ? selected : 'all';
}

function renderCacheGroups() {
  const container = document.getElementById('rc-cache-groups');
  if (!container) return;
  const pluginFilter = document.getElementById('rc-cache-filter-plugin')?.value || 'all';
  const statusFilter = document.getElementById('rc-cache-filter-status')?.value || 'all';
  const areaFilter = document.getElementById('rc-cache-filter-area')?.value || 'all';
  const filtered = cacheInspectorState.items.filter(item => {
    if (pluginFilter !== 'all' && item.ownerPluginName !== pluginFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (areaFilter !== 'all' && item.storageArea !== areaFilter) return false;
    return true;
  });
  if (!filtered.length) {
    const _ih = window.ReplyCatorsIconHelper;
    container.innerHTML = '<div class="rc-empty-state">' + (_ih ? _ih.renderIcon('navigation.backup',{size:32,decorative:true}) : '') + '<p>No registered caches match the current filters.</p></div>';
    return;
  }
  const groups = new Map();
  filtered.forEach(item => {
    if (!groups.has(item.ownerPluginName)) groups.set(item.ownerPluginName, []);
    groups.get(item.ownerPluginName).push(item);
  });
  container.innerHTML = Array.from(groups.entries()).map(function(entry) {
    const name = entry[0];
    const items = entry[1];
    return '<section class="rc-cache-group"><div class="rc-cache-group__title">' + esc(name) + '</div>' + items.map(function(item) {
      const action = cacheInspectorState.actionState[item.id] || {};
      const badgeClass = item.status === RC_CACHE_STATUS.FRESH ? 'rc-badge--green' : ((item.status === RC_CACHE_STATUS.EXPIRED || item.status === RC_CACHE_STATUS.REFRESH_FAILED || item.status === RC_CACHE_STATUS.CLEAR_FAILED) ? 'rc-badge--red' : 'rc-badge--amber');
      const expiryLabel = item.expiryAt ? (item.expiryAt <= Date.now() ? 'Expired' : 'Expires ' + formatTimestamp(item.expiryAt)) : 'Not time-based';
      return '<article class="rc-cache-card rc-cache-card--' + esc(item.status) + '">' +
        '<div class="rc-cache-card__header">' +
          '<div><div class="rc-cache-card__title">' + esc(item.displayName) + '</div><div class="rc-cache-card__meta-value">' + esc(item.description) + '</div></div>' +
          '<span class="rc-badge ' + badgeClass + '">' + esc(item.status) + '</span>' +
        '</div>' +
        '<div class="rc-cache-card__meta">' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Logical key</span><span class="rc-cache-card__meta-value">' + esc(sanitizeLogicalKey(item.logicalKeys.join(', '))) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Data age</span><span class="rc-cache-card__meta-value">' + esc(formatDuration(item.ageMs)) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">TTL</span><span class="rc-cache-card__meta-value">' + esc(item.ttlMs ? formatDuration(item.ttlMs) : 'Non-expiring') + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Expiry state</span><span class="rc-cache-card__meta-value">' + esc(expiryLabel) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Approximate size</span><span class="rc-cache-card__meta-value">' + esc(formatBytes(item.sizeBytes)) + ' (estimated)</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Last updated</span><span class="rc-cache-card__meta-value">' + esc(formatTimestamp(item.updatedAt)) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Storage area</span><span class="rc-cache-card__meta-value">' + esc(item.storageArea) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Sensitivity</span><span class="rc-cache-card__meta-value">' + esc(item.sensitivity) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Schema version</span><span class="rc-cache-card__meta-value">' + esc(String(item.schemaVersion)) + '</span></div>' +
          '<div class="rc-cache-card__meta-item"><span class="rc-cache-card__meta-label">Error state</span><span class="rc-cache-card__meta-value">' + esc(item.error || 'None') + '</span></div>' +
        '</div>' +
        '<div class="rc-cache-card__actions">' +
          (item.supportsRefresh ? '<button class="rc-btn rc-btn--secondary rc-btn--sm" type="button" data-cache-action="refresh" data-cache-id="' + esc(item.id) + '"' + (action.busy ? ' disabled' : '') + ' title="Refresh this cache via its owning plugin">' + esc(action.busy && action.type === 'refresh' ? 'Refreshing…' : 'Refresh') + '</button>' : '') +
          (item.supportsClear ? '<button class="rc-btn rc-btn--ghost rc-btn--sm" type="button" data-cache-action="clear" data-cache-id="' + esc(item.id) + '"' + (action.busy ? ' disabled' : '') + ' title="Clear this cache only">' + esc(action.busy && action.type === 'clear' ? 'Clearing…' : 'Clear') + '</button>' : '') +
        '</div>' +
      '</article>';
    }).join('') + '</section>';
  }).join('');
}

function bindCacheInspectorControls() {
  if (cacheInspectorState.filtersBound) return;
  cacheInspectorState.filtersBound = true;
  document.getElementById('rc-cache-filter-plugin')?.addEventListener('change', renderCacheGroups);
  document.getElementById('rc-cache-filter-status')?.addEventListener('change', renderCacheGroups);
  document.getElementById('rc-cache-filter-area')?.addEventListener('change', renderCacheGroups);
  document.getElementById('rc-diag-tab-overview')?.addEventListener('click', function() { setDiagnosticsTab('overview'); });
  document.getElementById('rc-diag-tab-checks')?.addEventListener('click',   function() { setDiagnosticsTab('checks'); });
  document.getElementById('rc-diag-tab-cache')?.addEventListener('click',    function() { setDiagnosticsTab('cache'); });
  document.getElementById('rc-cache-groups')?.addEventListener('click', handleCacheInspectorAction);
}

// Valid tab values: 'overview' | 'checks' | 'cache'
function setDiagnosticsTab(tab) {
  cacheInspectorState.activeTab = tab;
  const TABS = ['overview', 'checks', 'cache'];
  TABS.forEach(t => {
    const btn   = document.getElementById('rc-diag-tab-' + t);
    const panel = document.getElementById('rc-diag-panel-' + t);
    const active = t === tab;
    if (btn) {
      btn.className = 'rc-btn ' + (active ? 'rc-btn--primary' : 'rc-btn--ghost') + ' rc-btn--sm';
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    if (panel) panel.hidden = !active;
  });
}

async function handleCacheInspectorAction(event) {
  const btn = event.target.closest('[data-cache-action]');
  if (!btn) return;
  const cacheId = btn.getAttribute('data-cache-id');
  const action = btn.getAttribute('data-cache-action');
  const entry = CACHE_REGISTRY.find(item => item.id === cacheId);
  if (!entry) return;
  if (action === 'clear' && !confirm('Clear only the cache "' + entry.displayName + '"? Settings and user-created data are not affected.')) return;
  cacheInspectorState.actionState[cacheId] = { busy: true, type: action, statusOverride: action === 'refresh' ? RC_CACHE_STATUS.REFRESHING : null, error: null };
  renderCacheGroups();
  const statusEl = document.getElementById('rc-cache-inspector-status');
  if (statusEl) setStatus(statusEl, (action === 'refresh' ? 'Refreshing ' : 'Clearing ') + entry.displayName + '…', 'neutral');
  const runner = action === 'refresh' ? entry.refresh : entry.clear;
  const result = await withTimeout(typeof runner === 'function' ? runner() : Promise.resolve({ ok: false, error: 'Operation not supported' }), RC_CACHE_REFRESH_TIMEOUT_MS);
  cacheInspectorState.actionState[cacheId] = {
    busy: false,
    type: action,
    statusOverride: result && result.ok ? null : (action === 'refresh' ? RC_CACHE_STATUS.REFRESH_FAILED : RC_CACHE_STATUS.CLEAR_FAILED),
    error: result && result.ok ? null : (result && result.error ? result.error : 'Operation failed'),
  };
  if (statusEl) {
    if (result && result.ok) setStatus(statusEl, entry.displayName + ' ' + (action === 'refresh' ? 'refreshed.' : 'cleared.'), 'success');
    else setStatus(statusEl, entry.displayName + ' ' + (action === 'refresh' ? 'refresh failed.' : 'clear failed.') + ' ' + (result?.error || ''), 'error');
  }
  await loadCacheInspector();
}

async function loadCacheInspector() {
  bindCacheInspectorControls();
  const statusEl = document.getElementById('rc-cache-inspector-status');
  if (statusEl && statusEl.hidden) setStatus(statusEl, 'Collecting registered cache metadata…', 'neutral');
  try {
    const state = await collectCacheDiagnostics();
    cacheInspectorState.items = state.items;
    cacheInspectorState.summary = state.summary;
    cacheInspectorState.orphanedKeys = state.orphanedKeys;
    cacheInspectorState.storage = state.storage;
    renderCacheFilterOptions(cacheInspectorState);
    renderCacheSummary(cacheInspectorState);
    renderCacheGroups();
    if (statusEl && (!statusEl.textContent || /Collecting registered cache metadata/.test(statusEl.textContent))) {
      const warning = cacheInspectorState.storage.usagePct >= 0.8 || cacheInspectorState.orphanedKeys.length > 0;
      setStatus(statusEl, 'Registered caches: ' + cacheInspectorState.summary.registeredCount + (cacheInspectorState.orphanedKeys.length ? ' · Orphaned keys: ' + cacheInspectorState.orphanedKeys.length : '') + (cacheInspectorState.storage.usagePct >= 0.8 ? ' · Storage usage high' : ''), warning ? 'warning' : 'success');
    }
    setDiagnosticsTab(cacheInspectorState.activeTab || 'overview');
  } catch (err) {
    if (statusEl) setStatus(statusEl, 'Cache inspector failed: ' + String(err), 'error');
    const container = document.getElementById('rc-cache-groups');
    if (container) container.innerHTML = '<div class="rc-empty-state"><img src="assets/icons/streamline-ultimate-colors-free/status/warning.svg" aria-hidden="true" width="20" height="20" alt="" style="vertical-align:middle;margin-right:6px;">Unable to load cache diagnostics.</div>';
  }
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

// ── Pre-flight Check helpers ──────────────────────────────────────────────────

// Generation counter — incremented on every Run All invocation.
// Each check captures the generation at start; if it differs at completion the
// result is discarded (stale-result guard for rapid re-runs or navigation).
let _preflightGeneration = 0;
// Running flag prevents duplicate concurrent runs from a rapid double-click.
let _preflightRunning = false;
// Guard flag for loadDiagnostics — prevents stacked concurrent Overview/Cache loads
// triggered by rapid tab switching or multiple setMaintenanceTab calls.
let _diagLoading = false;

/**
 * Build a single pre-flight check card element.
 *
 * @param {object} opts
 * @param {'pass'|'warn'|'fail'|'info'|'skip'|'checking'} opts.status
 * @param {string}  opts.label      - Short check name shown in bold.
 * @param {string}  opts.detail     - Description of the result (wraps).
 * @param {string}  [opts.remediation] - Optional remediation guidance shown below detail.
 * @param {string}  [opts.action]   - Text for an inline action button (optional).
 * @param {Function}[opts.onAction] - Click handler for the action button (optional).
 * @param {Function}[opts.onRetry]  - Click handler for the Retry button (optional).
 * @returns {HTMLElement}
 */
function _buildPreflightCard(opts) {
  // Status icon mapping to Streamline semantic IDs.
  const STATUS_ICON = {
    pass:     'states.success',
    warn:     'states.warning',
    fail:     'states.error',
    info:     'states.info',
    skip:     'states.unavailable',
    checking: 'states.loading',
  };
  // Text labels alongside icons so color-blind users get text cues too.
  const STATUS_TEXT = {
    pass:     { text: 'Healthy',    ariaLabel: 'Healthy' },
    warn:     { text: 'Warning',    ariaLabel: 'Warning' },
    fail:     { text: 'Unavailable',ariaLabel: 'Unavailable' },
    info:     { text: 'Info',       ariaLabel: 'Info' },
    skip:     { text: 'Skipped',    ariaLabel: 'Skipped' },
    checking: { text: 'Checking',   ariaLabel: 'Checking' },
  };
  const meta = STATUS_TEXT[opts.status] || STATUS_TEXT.info;
  const iconId = STATUS_ICON[opts.status] || STATUS_ICON.info;

  const card = document.createElement('div');
  card.className = 'rc-preflight-card rc-preflight-card--' + opts.status;
  card.setAttribute('role', 'listitem');
  card.title = opts.label + ': ' + opts.detail;
  // F-011: data attribute so _retryPreflightSingle can locate and replace this card
  // by label without a full re-run of all checks.
  card.dataset.checkLabel = opts.label;

  // Icon badge — Streamline SVG via shared renderer
  const icon = document.createElement('span');
  icon.className = 'rc-preflight-card__icon';
  icon.setAttribute('aria-hidden', 'true');
  if (window.ReplyCatorsIconHelper) {
    icon.innerHTML = window.ReplyCatorsIconHelper.renderIcon(iconId, { size: 16, decorative: true });
  }

  // Status badge — visible text label; hidden from AT (card title carries the full label)
  const badge = document.createElement('span');
  badge.className       = 'rc-preflight-card__badge';
  badge.textContent     = meta.text;
  badge.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'rc-preflight-card__body';

  const labelEl = document.createElement('div');
  labelEl.className   = 'rc-preflight-card__label';
  labelEl.textContent = opts.label;

  const detailEl = document.createElement('div');
  detailEl.className   = 'rc-preflight-card__detail';
  detailEl.textContent = opts.detail;

  body.appendChild(labelEl);
  body.appendChild(detailEl);

  // Optional remediation guidance (separate line, muted style)
  if (opts.remediation) {
    const remEl = document.createElement('div');
    remEl.className   = 'rc-preflight-card__remediation';
    remEl.textContent = opts.remediation;
    body.appendChild(remEl);
  }

  // Optional inline action button
  if (opts.action && opts.onAction) {
    const btn = document.createElement('button');
    btn.className   = 'rc-preflight-card__action';
    btn.textContent = opts.action;
    btn.type        = 'button';
    btn.addEventListener('click', opts.onAction);
    body.appendChild(btn);
  }

  // Optional retry button — always last in the card
  if (opts.onRetry) {
    const retryBtn = document.createElement('button');
    retryBtn.className   = 'rc-preflight-card__retry';
    retryBtn.textContent = 'Retry';
    retryBtn.type        = 'button';
    retryBtn.title       = 'Re-run this check';
    retryBtn.setAttribute('aria-label', 'Retry check: ' + opts.label);
    retryBtn.addEventListener('click', opts.onRetry);
    body.appendChild(retryBtn);
  }

  const iconBadgeWrap = document.createElement('div');
  iconBadgeWrap.className = 'rc-preflight-card__status';
  iconBadgeWrap.appendChild(icon);
  iconBadgeWrap.appendChild(badge);

  card.appendChild(iconBadgeWrap);
  card.appendChild(body);
  return card;
}

/**
 * Build a section group header element for the pre-flight grid.
 *
 * @param {string} title - Group title text.
 * @returns {HTMLElement}
 */
function _buildPreflightGroupHeader(title) {
  const h = document.createElement('div');
  h.className   = 'rc-preflight-group-header';
  h.textContent = title;
  h.setAttribute('role', 'heading');
  h.setAttribute('aria-level', '3');
  return h;
}

/**
 * Update the pre-flight summary bar (#rc-preflight-summary).
 *
 * @param {Array<{status:string}>} cards - Array of card option objects.
 * @param {number} durationMs - Total check duration in milliseconds.
 */
function _updatePreflightSummary(cards, durationMs) {
  const bar = document.getElementById('rc-preflight-summary');
  if (!bar) return;

  const counts = { pass: 0, warn: 0, fail: 0, info: 0, skip: 0, checking: 0 };
  cards.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  const active = cards.filter(c => c.status !== 'skip');
  const overallFail = counts.fail > 0;
  const overallWarn = !overallFail && counts.warn > 0;
  const overallClass = overallFail ? 'fail' : (overallWarn ? 'warn' : 'pass');
  const overallText  = overallFail ? 'Issues detected'
    : (overallWarn ? 'Warnings present' : 'All checks healthy');

  const ts = new Date().toLocaleTimeString();

  bar.className = 'rc-preflight__summary rc-preflight__summary--' + overallClass;
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = '';

  const statusSpan = document.createElement('span');
  statusSpan.className   = 'rc-preflight__summary-status';
  statusSpan.textContent = overallText;

  const detailSpan = document.createElement('span');
  detailSpan.className   = 'rc-preflight__summary-detail';
  detailSpan.textContent =
    active.length + ' checked - ' +
    counts.fail + ' failed, ' + counts.warn + ' warnings, ' + counts.pass + ' healthy' +
    (counts.skip ? ', ' + counts.skip + ' skipped' : '') +
    ' · Last run: ' + ts +
    (durationMs != null ? ' (' + (durationMs / 1000).toFixed(1) + ' s)' : '');

  bar.appendChild(statusSpan);
  bar.appendChild(detailSpan);
}

/**
 * Announce a short status message to screen readers via the ARIA live region.
 *
 * @param {string} message
 */
function _announcePreflightStatus(message) {
  const live = document.getElementById('rc-preflight-live');
  if (!live) return;
  live.textContent = '';
  // Brief timeout ensures AT re-announces even when the text does not change
  setTimeout(() => { live.textContent = message; }, 50);
}

/**
 * Run all pre-flight checks and populate #rc-preflight-checks.
 *
 * Architecture:
 *   - Generation counter + running flag prevent duplicate concurrent runs.
 *   - Each async check wraps its outcome in a normalized descriptor object
 *     { status, label, detail, remediation?, action?, onAction?, onRetry? }.
 *   - Checks are grouped by dependency category before rendering.
 *   - All checks run in parallel within their group; one failure never blocks others.
 *   - Stale-result guard: if the generation changes before a check resolves, the
 *     result is discarded and the card is not appended to the DOM.
 *
 * Groups:
 *   Storage       — CHECK-01: Storage quota
 *   Permissions   — CHECK-02..04: host permissions, CHECK-11: bookmarks API
 *   Local Runtime — CHECK-05: Bob Helper server, CHECK-05b: port sync,
 *                   CHECK-NEW-CLI: Bob CLI, CHECK-NEW-NODE: Node.js runtime,
 *                   CHECK-06: Bob Working Directory
 *   External      — CHECK-07: IBM Docs API
 *   Browser Context — CHECK-08: Salesforce tab, CHECK-09: Cloudability tab
 */
// Bob Helper port used by pre-flight diagnostics checks (CHECK-05, CHECK-05b).
// See build/bob-helper-config.js for the canonical reference and sync checklist.
//
// SYNC REQUIRED - this value is duplicated in background.js (BOB_HELPER_PORT)
// and tools/bob-helper-server.js (PORT fallback). Change all three together.
// The CHECK-05b check will detect a runtime mismatch, but a build-time sync failure
// will silently break the Salesforce Execute workflow.
const _BOB_HELPER_PORT_DIAG = 47123;
// Minimum Bob CLI major version required for BobShell 2.0 features (Salesforce Execute).
// If the detected major version is below this value the Bob Version check emits a warn card.
// Suppress the check entirely when Bob 1.0 mode is intentionally active (bobUseBob1 === true).
const _BOB_MIN_MAJOR_VERSION = 2;

async function loadPreflightChecks() {
  // ── Concurrency guard ──────────────────────────────────────────────────────
  if (_preflightRunning) return;
  _preflightRunning = true;
  _preflightGeneration++;
  const myGen = _preflightGeneration;

  const container = document.getElementById('rc-preflight-checks');
  if (!container) { _preflightRunning = false; return; }

  // Show loading state
  container.innerHTML = '<div class="rc-preflight__loading" role="status" aria-live="polite">Checking dependencies\u2026</div>';
  _announcePreflightStatus('Running pre-flight checks\u2026');

  const runBtn = document.getElementById('rc-preflight-run-all');
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = 'Running\u2026'; }

  const startMs = Date.now();

  const SF_ID  = 'com.replycators.salesforce-extractor';
  const CLD_ID = 'com.replycators.cloudability-orgid';
  const ADF_ID = 'com.replycators.apptio-docs-finder';
  const BM_ID  = 'com.replycators.edge-bookmark-finder';

  const sfEnabled  = pluginStates[SF_ID]?.enabled  !== false;
  const cldEnabled = pluginStates[CLD_ID]?.enabled !== false;
  const adfEnabled = pluginStates[ADF_ID]?.enabled !== false;
  const bmEnabled  = pluginStates[BM_ID]?.enabled  !== false;

  const LOCAL_QUOTA = chrome.storage.local.QUOTA_BYTES; // 5,242,880

  // ── CHECK-01: Storage quota ─────────────────────────────────────────────────
  const checkStorage = () => new Promise(resolve => {
    chrome.storage.local.getBytesInUse(null, bytes => {
      if (bytes === undefined) {
        resolve({ status: 'info', label: 'Storage Quota',
          detail: 'Usage unknown - storage API unavailable.',
          onRetry: () => _retryPreflightSingle(checkStorage, 'storage', myGen) });
        return;
      }
      const usedKb  = Math.round(bytes / 1024);
      const totalKb = Math.round(LOCAL_QUOTA / 1024);
      const pct     = bytes / LOCAL_QUOTA;
      const detail  = usedKb + ' KB / ' + totalKb + ' KB (' + Math.round(pct * 100) + '% used)';
      if (pct >= 0.95) {
        resolve({ status: 'fail', label: 'Storage Quota', detail: 'Critical - ' + detail,
          remediation: 'Clear the Activity Log or disable plugins to reduce storage use.',
          action: 'Open Activity Log', onAction: () => navigateTo('activity') });
      } else if (pct >= 0.80) {
        resolve({ status: 'warn', label: 'Storage Quota', detail: 'High usage - ' + detail,
          remediation: 'Consider clearing old log entries via the Activity Log.',
          action: 'Open Activity Log', onAction: () => navigateTo('activity') });
      } else {
        resolve({ status: 'pass', label: 'Storage Quota', detail: 'Healthy - ' + detail });
      }
    });
  });

  // ── CHECK-02: Salesforce host permissions ───────────────────────────────────
  const checkPermSalesforce = () => new Promise(resolve => {
    if (!sfEnabled) {
      resolve({ status: 'skip', label: 'Host Permissions: Salesforce',
        detail: 'Plugin disabled - skipped.' });
      return;
    }
    chrome.permissions.contains(
      { origins: ['https://*.salesforce.com/*', 'https://*.lightning.force.com/*'] },
      granted => {
        resolve({
          status: granted ? 'pass' : 'fail',
          label:  'Host Permissions: Salesforce',
          detail: granted
            ? 'Granted for *.salesforce.com and *.lightning.force.com.'
            : 'Missing - content script cannot inject.',
          remediation: granted ? undefined
            : 'Go to edge://extensions/ → ReplyCators → Site Access and allow salesforce.com.',
        });
      }
    );
  });

  // ── CHECK-03: Cloudability host permissions ─────────────────────────────────
  const checkPermCloudability = () => new Promise(resolve => {
    if (!cldEnabled) {
      resolve({ status: 'skip', label: 'Host Permissions: Cloudability',
        detail: 'Plugin disabled - skipped.' });
      return;
    }
    chrome.permissions.contains(
      { origins: ['https://*.apptio.com/*', 'https://*.apps.papt.to/*'] },
      granted => {
        resolve({
          status: granted ? 'pass' : 'fail',
          label:  'Host Permissions: Cloudability',
          detail: granted
            ? 'Granted for *.apptio.com and *.apps.papt.to.'
            : 'Missing - OrgID retrieval will fail.',
          remediation: granted ? undefined
            : 'Go to edge://extensions/ → ReplyCators → Site Access and allow apptio.com.',
        });
      }
    );
  });

  // ── CHECK-04: IBM Docs / Community host permissions ─────────────────────────
  const checkPermIbm = () => new Promise(resolve => {
    if (!adfEnabled) {
      resolve({ status: 'skip', label: 'Host Permissions: IBM Docs',
        detail: 'Plugin disabled - skipped.' });
      return;
    }
    chrome.permissions.contains(
      { origins: ['https://www.ibm.com/*', 'https://community.ibm.com/*'] },
      granted => {
        resolve({
          status: granted ? 'pass' : 'fail',
          label:  'Host Permissions: IBM Docs',
          detail: granted
            ? 'Granted for ibm.com and community.ibm.com.'
            : 'Missing - Documentation Finder and Upgrade Calculator will fail.',
          remediation: granted ? undefined
            : 'Go to edge://extensions/ → ReplyCators → Site Access and allow ibm.com.',
        });
      }
    );
  });

  // ── CHECK-11: Bookmarks API permission ──────────────────────────────────────
  const checkPermBookmarks = () => new Promise(resolve => {
    if (!bmEnabled) {
      resolve({ status: 'skip', label: 'Permission: Bookmarks API',
        detail: 'Plugin disabled - skipped.' });
      return;
    }
    chrome.permissions.contains({ permissions: ['bookmarks'] }, granted => {
      resolve({
        status: granted ? 'pass' : 'fail',
        label:  'Permission: Bookmarks API',
        detail: granted
          ? 'Bookmarks API permission granted.'
          : 'Missing - Edge Bookmark Finder cannot read bookmarks.',
        remediation: granted ? undefined : 'Reload the extension from edge://extensions/.',
      });
    });
  });

  // ── CHECK-05: Bob Helper server ─────────────────────────────────────────────
  // Determines if the helper process is reachable and whether Bob CLI is found.
  // Uses the `ready` field from /health to distinguish "server up" from "server+CLI ready".
  // F-008: uses _getBobHealthResponse() so the RC_BOB_HEALTH message is sent exactly
  // once per preflight run, shared with checkBobHelperPortSync below.
  const checkBobHelper = () => {
    if (!sfEnabled) {
      return Promise.resolve({ status: 'skip', label: 'Bob Helper Server',
        detail: 'Salesforce plugin disabled - skipped.' });
    }
    return _getBobHealthResponse().then(response => {
      if (!response) {
        return { status: 'info', label: 'Bob Helper Server',
          detail: 'Could not reach background worker to probe the server.',
          remediation: 'If the background service worker is suspended, reload the extension.',
          onRetry: () => _retryPreflightSingle(checkBobHelper, 'bob-helper', myGen) };
      }
      if (response.ok && response.ready !== false) {
        const portLabel = response.port || _BOB_HELPER_PORT_DIAG;
        return { status: 'pass', label: 'Bob Helper Server',
          detail: 'Running on port ' + portLabel + '.' };
      } else if (response.ok && response.ready === false) {
        return { status: 'warn', label: 'Bob Helper Server',
          detail: 'Server is running but IBM Bob CLI was not found on PATH.',
          remediation: 'Install IBM Bob and restart the helper: powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start' };
      } else {
        return { status: 'warn', label: 'Bob Helper Server',
          detail: 'Not running - Salesforce Execute is unavailable.',
          remediation: 'Start the helper: run powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start',
          onRetry: () => _retryPreflightSingle(checkBobHelper, 'bob-helper', myGen) };
      }
    });
  };

  // ── CHECK-05b: Bob Helper Port Sync ────────────────────────────────────────
  // F-008: uses _getBobHealthResponse() — shared with checkBobHelper above.
  const checkBobHelperPortSync = () => {
    if (!sfEnabled) {
      return Promise.resolve({ status: 'skip', label: 'Bob Helper Port Sync',
        detail: 'Salesforce plugin disabled - skipped.' });
    }
    return _getBobHealthResponse().then(response => {
      if (!response || !response.ok) {
        return { status: 'skip', label: 'Bob Helper Port Sync',
          detail: 'Server not running - see Bob Helper Server check.' };
      }
      if (typeof response.port !== 'number') {
        return { status: 'info', label: 'Bob Helper Port Sync',
          detail: 'Server does not expose port field - update bob-helper-server.js to v1.27.4+.' };
      }
      if (response.port === _BOB_HELPER_PORT_DIAG) {
        return { status: 'pass', label: 'Bob Helper Port Sync',
          detail: 'Extension and server agree on port ' + _BOB_HELPER_PORT_DIAG + '.' };
      } else {
        return { status: 'fail', label: 'Bob Helper Port Sync',
          detail: 'Port mismatch: extension uses ' + _BOB_HELPER_PORT_DIAG + ', server uses ' + response.port + '.',
          remediation: 'Update BOB_HELPER_PORT in background.js to ' + response.port + ' or restart the server without REPLYCATORS_BOB_HELPER_PORT set.' };
      }
    });
  };

  // F-008: shared Bob health response — checkBobHelper and checkBobHelperPortSync
  // both need RC_BOB_HEALTH.  Running them in parallel via Promise.allSettled would
  // fire two independent background messages and two HTTP requests to /health.
  // We share one Promise so the message is sent exactly once.
  // Same lazy-init pattern as _getCliCheckResponse() below.
  let _bobHealthPromise = null;
  function _getBobHealthResponse() {
    if (!_bobHealthPromise) {
      _bobHealthPromise = new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'RC_BOB_HEALTH' }, response => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response || null);
          }
        });
      });
    }
    return _bobHealthPromise;
  }

  // F-13: shared CLI check response — checkBobCli and checkNodeRuntime both need
  // the same RC_PREFLIGHT_CLI_CHECK round-trip.  Running them in parallel via
  // Promise.allSettled would fire two independent background messages for a single
  // logical /cli-check HTTP call.  We share one Promise so the background message
  // is sent exactly once and both checks read from the same response.
  //
  // The shared promise is lazily created on first access; subsequent calls within
  // this loadPreflightChecks() invocation reuse the cached result.
  let _cliCheckPromise = null;
  function _getCliCheckResponse() {
    if (!_cliCheckPromise) {
      _cliCheckPromise = new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'RC_PREFLIGHT_CLI_CHECK' }, response => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response || null);
          }
        });
      });
    }
    return _cliCheckPromise;
  }

  // ── CHECK-NEW-CLI: Bob CLI on PATH ──────────────────────────────────────────
  // Calls /cli-check on the helper server via RC_PREFLIGHT_CLI_CHECK to obtain
  // sanitized CLI metadata.  Separate from server-health check — dedicated card.
  // Dependency: helper server must be running (skips gracefully if not).
  const checkBobCli = () => new Promise(resolve => {
    if (!sfEnabled) {
      resolve({ status: 'skip', label: 'Bob CLI (IBM Bob)',
        detail: 'Salesforce plugin disabled - skipped.' });
      return;
    }
    _getCliCheckResponse().then(response => {
      if (!response) {
        resolve({ status: 'info', label: 'Bob CLI (IBM Bob)',
          detail: 'Could not reach background worker for CLI check.',
          onRetry: () => _retryPreflightSingle(checkBobCli, 'bob-cli', myGen) });
        return;
      }
      if (!response.ok && response.serverDown) {
        // Helper not running - server check already reports this
        resolve({ status: 'skip', label: 'Bob CLI (IBM Bob)',
          detail: 'Helper server not running - see Bob Helper Server check.' });
        return;
      }
      if (!response.ok) {
        resolve({ status: 'warn', label: 'Bob CLI (IBM Bob)',
          detail: 'CLI check returned an error: ' + (response.error || 'unknown'),
          onRetry: () => _retryPreflightSingle(checkBobCli, 'bob-cli', myGen) });
        return;
      }
      if (response.bobFound) {
        const versionStr = response.bobVersion ? ' (version: ' + response.bobVersion + ')' : '';
        const nameStr    = response.bobBasename ? response.bobBasename : 'bob';
        resolve({ status: 'pass', label: 'Bob CLI (IBM Bob)',
          detail: nameStr + ' found on PATH' + versionStr + '.' });
      } else {
        resolve({ status: 'fail', label: 'Bob CLI (IBM Bob)',
          detail: 'IBM Bob CLI not found on PATH.',
          remediation: 'Install IBM Bob and ensure it is on the system PATH, then restart the helper server.',
          onRetry: () => _retryPreflightSingle(checkBobCli, 'bob-cli', myGen) });
      }
    });
  });

  // ── CHECK-NEW-BOBVER: Bob CLI version validation ────────────────────────────
  // Reads bobVersionOk / bobVersionWarning from the /cli-check response.
  // F-13: reuses _getCliCheckResponse() — no second RC_PREFLIGHT_CLI_CHECK message.
  // Guard 1: sfEnabled — skip if SF plugin is disabled (matches all SF checks).
  // Guard 2: _restoredSfSettings?.bobUseBob1 — skip if Bob 1.0 mode is intentionally active
  //          (issue #22: users in Bob 1.0 mode must never see a misleading 'update required' warn).
  const checkBobVersion = () => new Promise(resolve => {
    if (!sfEnabled) {
      resolve({ status: 'skip', label: 'Bob Version',
        detail: 'Salesforce plugin disabled - skipped.' });
      return;
    }
    const useBob1 = _restoredSfSettings?.bobUseBob1 === true;
    if (useBob1) {
      resolve({ status: 'info', label: 'Bob Version',
        detail: 'Bob 1.0 mode active - version check skipped.' });
      return;
    }
    _getCliCheckResponse().then(response => {
      if (!response) {
        resolve({ status: 'info', label: 'Bob Version',
          detail: 'Could not reach background worker for version check.',
          onRetry: () => _retryPreflightSingle(checkBobVersion, 'bob-version', myGen) });
        return;
      }
      if (!response.ok && response.serverDown) {
        resolve({ status: 'skip', label: 'Bob Version',
          detail: 'Helper server not running - see Bob Helper Server check.' });
        return;
      }
      if (!response.ok) {
        resolve({ status: 'warn', label: 'Bob Version',
          detail: 'Version check returned an error: ' + (response.error || 'unknown'),
          onRetry: () => _retryPreflightSingle(checkBobVersion, 'bob-version', myGen) });
        return;
      }
      if (!response.bobFound) {
        resolve({ status: 'skip', label: 'Bob Version',
          detail: 'Bob CLI not found - see Bob CLI (IBM Bob) check.' });
        return;
      }
      if (response.bobVersionOk === null || response.bobVersionOk === undefined) {
        resolve({ status: 'info', label: 'Bob Version',
          detail: 'Version unavailable - cannot determine if Bob meets the minimum requirement.' });
        return;
      }
      if (response.bobVersionOk === false) {
        resolve({ status: 'warn', label: 'Bob Version',
          detail: response.bobVersionWarning || 'Bob version below minimum required - update recommended.',
          remediation: 'Update IBM Bob to version ' + _BOB_MIN_MAJOR_VERSION + '.x or later.' });
      } else {
        resolve({ status: 'pass', label: 'Bob Version',
          detail: 'Bob ' + (response.bobVersion || '(version unknown)') + ' meets the minimum version requirement.' });
      }
    });
  });

  // ── CHECK-NEW-NODE: Node.js runtime (via helper) ────────────────────────────
  // Reports the Node.js runtime that is running the helper server.
  // Dependency: helper server must be running (skips gracefully if not).
  // Only basename is shown — full path is never exposed in the UI.
  // F-13: reuses _getCliCheckResponse() — no second RC_PREFLIGHT_CLI_CHECK message.
  const checkNodeRuntime = () => new Promise(resolve => {
    if (!sfEnabled) {
      resolve({ status: 'skip', label: 'Node.js Runtime',
        detail: 'Salesforce plugin disabled - skipped.' });
      return;
    }
    _getCliCheckResponse().then(response => {
      if (!response) {
        resolve({ status: 'info', label: 'Node.js Runtime',
          detail: 'Could not reach background worker for Node.js check.',
          onRetry: () => _retryPreflightSingle(checkNodeRuntime, 'node-runtime', myGen) });
        return;
      }
      if (!response.ok && response.serverDown) {
        resolve({ status: 'skip', label: 'Node.js Runtime',
          detail: 'Helper server not running - see Bob Helper Server check.' });
        return;
      }
      if (!response.ok) {
        resolve({ status: 'warn', label: 'Node.js Runtime',
          detail: 'Node.js check returned an error: ' + (response.error || 'unknown'),
          onRetry: () => _retryPreflightSingle(checkNodeRuntime, 'node-runtime', myGen) });
        return;
      }
      if (response.nodeFound && response.nodeVersion) {
        // Validate version is an acceptable format before display
        const verStr = /^[\d.]+$/.test(response.nodeVersion || '') ? response.nodeVersion : '(version unavailable)';
        const majorStr = verStr.split('.')[0];
        const major = parseInt(majorStr, 10);
        if (!isNaN(major) && major < 18) {
          resolve({ status: 'warn', label: 'Node.js Runtime',
            detail: 'Node.js v' + verStr + ' detected - Node 18 or later is required.',
            remediation: 'Update Node.js to v18+ and restart the helper server.' });
        } else {
          resolve({ status: 'pass', label: 'Node.js Runtime',
            detail: 'Node.js v' + verStr + ' detected (meets ≥ 18 requirement).' });
        }
      } else {
        resolve({ status: 'info', label: 'Node.js Runtime',
          detail: 'Node.js runtime metadata unavailable from helper server.' });
      }
    });
  });

  // ── CHECK-06: Bob Working Directory ────────────────────────────────────────
  const checkBobWorkingDir = () => new Promise(resolve => {
    if (!sfEnabled) {
      resolve({ status: 'skip', label: 'Bob Working Directory',
        detail: 'Salesforce plugin disabled - skipped.' });
      return;
    }
    chrome.storage.local.get([RC_STORE.SF_SETTINGS], data => {
      const settings = data[RC_STORE.SF_SETTINGS] || {};
      const dir = typeof settings.bobWorkingDir === 'string' ? settings.bobWorkingDir.trim() : '';
      if (dir) {
        // Show only the basename for privacy — the full path is in Settings
        const basename = dir.replace(/.*[/\\]/, '') || dir;
        resolve({ status: 'pass', label: 'Bob Working Directory',
          detail: 'Configured: \u2026' + basename });
      } else {
        resolve({ status: 'warn', label: 'Bob Working Directory',
          detail: 'Not configured - Execute is disabled until a path is set.',
          remediation: 'Open Options and set Bob Working Directory under Salesforce Case Extractor.',
          action: 'Open Options', onAction: () => navigateTo('settings') });
      }
    });
  });

  // ── CHECK-07: IBM Docs API — cached status ──────────────────────────────────
  const checkIbmDocsApi = () => new Promise(resolve => {
    if (!adfEnabled) {
      resolve({ status: 'skip', label: 'IBM Docs API',
        detail: 'Documentation Finder disabled - skipped.' });
      return;
    }
    chrome.storage.local.get([
      'rc:plugin:com.replycators.apptio-docs-finder:diag',
      'rc:plugin:com.replycators.apptio-docs-finder:last-refresh',
    ], data => {
      const rec         = data['rc:plugin:com.replycators.apptio-docs-finder:diag'] || null;
      const lastRefresh = data['rc:plugin:com.replycators.apptio-docs-finder:last-refresh'] || null;
      if (!rec && !lastRefresh) {
        resolve({ status: 'info', label: 'IBM Docs API',
          detail: 'No refresh recorded yet - open Documentation Finder to initialise.' });
        return;
      }
      const ageMin = lastRefresh
        ? Math.round((Date.now() - new Date(lastRefresh).getTime()) / 60000)
        : null;
      const ageStr = ageMin !== null
        ? (ageMin < 60 ? ageMin + ' min ago' : Math.round(ageMin / 60) + ' hr ago')
        : 'unknown age';
      if (rec && rec.success === false) {
        // Surface error phase but NOT error detail — may contain URLs or response bodies
        const phase = rec.errorPhase ? ' (phase: ' + rec.errorPhase + ')' : '';
        resolve({ status: 'warn', label: 'IBM Docs API',
          detail: 'Last refresh failed ' + ageStr + phase + '. Sources may be stale.',
          remediation: 'Open Documentation Finder to trigger a fresh refresh.' });
      } else {
        resolve({ status: 'pass', label: 'IBM Docs API',
          detail: 'Last successful refresh: ' + ageStr + '.' });
      }
    });
  });

  // ── CHECK-08: Active Salesforce tab ────────────────────────────────────────
  const checkSalesforceTab = () => new Promise(resolve => {
    if (!sfEnabled) {
      resolve({ status: 'skip', label: 'Salesforce Browser Context',
        detail: 'Plugin disabled - skipped.' });
      return;
    }
    chrome.tabs.query({}, tabs => {
      const allTabs = tabs || [];
      // Check for active case page
      const sfCaseTab = allTabs.find(t =>
        t.active && t.url &&
        /https:\/\/[^/]*(salesforce\.com|lightning\.force\.com)\/lightning\/r\/Case\//.test(t.url)
      );
      if (sfCaseTab) {
        // Sanitize: show page title, not full URL
        const display = sfCaseTab.title ? sfCaseTab.title.replace(/\s*[-|].*$/, '').trim() : 'Case page';
        resolve({ status: 'pass', label: 'Salesforce Browser Context',
          detail: 'Active case page: ' + display + '.' });
        return;
      }
      const anySfActive = allTabs.find(t =>
        t.active && t.url && /(salesforce\.com|lightning\.force\.com)/.test(t.url)
      );
      const anySfTab = allTabs.find(t =>
        t.url && /(salesforce\.com|lightning\.force\.com)/.test(t.url)
      );
      if (anySfActive) {
        resolve({ status: 'warn', label: 'Salesforce Browser Context',
          detail: 'Salesforce is active but not on a Case page.',
          remediation: 'Navigate to a Case record to enable extraction.' });
      } else if (anySfTab) {
        resolve({ status: 'warn', label: 'Salesforce Browser Context',
          detail: 'Salesforce tab open in background - navigate to a Case page.',
          remediation: 'Make the Salesforce Case tab active to enable extraction.' });
      } else {
        resolve({ status: 'info', label: 'Salesforce Browser Context',
          detail: 'No Salesforce tab open.',
          remediation: 'Open Salesforce and navigate to a Case record to use extraction.' });
      }
    });
  });

  // ── CHECK-09: Active Cloudability tab ──────────────────────────────────────
  // Security: never expose cached OrgID value in the health summary.
  const checkCloudabilityTab = () => new Promise(resolve => {
    if (!cldEnabled) {
      resolve({ status: 'skip', label: 'Cloudability Browser Context',
        detail: 'Plugin disabled - skipped.' });
      return;
    }
    const hasActive = window.ReplyCatorsPlugins?.CloudabilityOrgId?.hasActiveCloudabilityTab;
    if (!hasActive) {
      resolve({ status: 'info', label: 'Cloudability Browser Context',
        detail: 'Plugin not yet initialised - navigate to the Cloudability plugin first.' });
      return;
    }
    hasActive(active => {
      if (active) {
        resolve({ status: 'pass', label: 'Cloudability Browser Context',
          detail: 'Active Cloudability tab detected - OrgID retrieval available.' });
      } else {
        const cldState = window.ReplyCatorsPlugins?.CloudabilityOrgId?.getState?.();
        // Deliberately do NOT show orgId — it is a sensitive identifier
        const hasCached = !!(cldState?.orgId);
        resolve({ status: 'warn', label: 'Cloudability Browser Context',
          detail: hasCached
            ? 'No active Cloudability tab - showing previously cached OrgID.'
            : 'No active Cloudability tab - OrgID not yet retrieved.',
          remediation: 'Open a Cloudability tab and navigate to the OrgID plugin to refresh.' });
      }
    });
  });

  // ── Run all checks in parallel; results are grouped by category ─────────────
  //
  // Ownership rule (determines which panel each group renders into):
  //   System Checks panel (#rc-preflight-checks)  — permissions, runtime,
  //     external services, and active browser context.
  //   Cache & Storage panel (#rc-storage-checks) — storage quota only.
  //   Overview panel — summary bar + warning links only; no cards rendered here.
  //
  const GROUPS = {
    'Storage':          { title: 'Storage',               checks: [checkStorage],                                                                 panel: 'cache' },
    'Permissions':      { title: 'Browser Permissions',   checks: [checkPermSalesforce, checkPermCloudability, checkPermIbm, checkPermBookmarks], panel: 'checks' },
    'LocalRuntime':     { title: 'Local Runtime',         checks: [checkBobHelper, checkBobHelperPortSync, checkBobCli, checkBobVersion, checkNodeRuntime, checkBobWorkingDir], panel: 'checks' },
    'ExternalServices': { title: 'External Services',     checks: [checkIbmDocsApi],                                                             panel: 'checks' },
    'BrowserContext':   { title: 'Active Browser Context',checks: [checkSalesforceTab, checkCloudabilityTab],                                    panel: 'checks' },
  };

  // Collect all check promises; track which group each belongs to
  const groupOrder = ['Storage', 'Permissions', 'LocalRuntime', 'ExternalServices', 'BrowserContext'];
  const allPromises = [];
  const promiseGroupMap = []; // parallel array: promiseGroupMap[i] = groupKey for allPromises[i]

  groupOrder.forEach(key => {
    GROUPS[key].checks.forEach(fn => {
      allPromises.push(fn());
      promiseGroupMap.push(key);
    });
  });

  const settled = await Promise.allSettled(allPromises);

  // Stale-result guard: discard results if a newer run started
  if (myGen !== _preflightGeneration) {
    _preflightRunning = false;
    return;
  }

  const durationMs = Date.now() - startMs;

  // Normalise results to descriptor objects
  const descriptors = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      status: 'info',
      label:  promiseGroupMap[i] + ' check #' + i,
      detail: 'Check could not run: ' + String(result.reason),
    };
  });

  // Summary bar reflects System Checks panel (Storage Quota lives in Cache & Storage)
  const checksDescriptors = descriptors.filter((_, i) => GROUPS[promiseGroupMap[i]].panel === 'checks');
  _updatePreflightSummary(checksDescriptors, durationMs);

  // ── Render System Checks cards (#rc-preflight-checks) ──────────────────────
  container.innerHTML = '';
  container.setAttribute('aria-label', 'Dependency check results');

  let groupStartIndex = 0;
  groupOrder.forEach(key => {
    const group = GROUPS[key];
    const count = group.checks.length;
    const groupDescs = descriptors.slice(groupStartIndex, groupStartIndex + count);
    groupStartIndex += count;

    if (group.panel !== 'checks') return; // Only System Checks panel cards here

    const header = _buildPreflightGroupHeader(group.title);
    container.appendChild(header);

    if (groupDescs.every(d => d.status === 'skip')) {
      const skippedEl = document.createElement('div');
      skippedEl.className   = 'rc-preflight-group-skipped';
      skippedEl.textContent = 'All checks in this group skipped (plugins disabled).';
      container.appendChild(skippedEl);
    } else {
      groupDescs.forEach(desc => container.appendChild(_buildPreflightCard(desc)));
    }
  });

  // ── Render Storage check into Cache & Storage tab (#rc-storage-checks) ──────
  const storageContainer = document.getElementById('rc-storage-checks');
  if (storageContainer) {
    storageContainer.innerHTML = '';
    let storageIdx = 0;
    groupOrder.forEach(key => {
      const group = GROUPS[key];
      const count = group.checks.length;
      const groupDescs = descriptors.slice(storageIdx, storageIdx + count);
      storageIdx += count;

      if (group.panel !== 'cache') return;

      const header = _buildPreflightGroupHeader(group.title);
      storageContainer.appendChild(header);

      if (groupDescs.every(d => d.status === 'skip')) {
        const skippedEl = document.createElement('div');
        skippedEl.className   = 'rc-preflight-group-skipped';
        skippedEl.textContent = 'All checks in this group skipped.';
        storageContainer.appendChild(skippedEl);
      } else {
        groupDescs.forEach(desc => storageContainer.appendChild(_buildPreflightCard(desc)));
      }
    });
  }

  // Announce result to screen readers
  const failCount = descriptors.filter(d => d.status === 'fail').length;
  const warnCount = descriptors.filter(d => d.status === 'warn').length;
  const announcement = failCount > 0
    ? 'Pre-flight complete: ' + failCount + ' issue' + (failCount !== 1 ? 's' : '') + ' detected.'
    : warnCount > 0
      ? 'Pre-flight complete: ' + warnCount + ' warning' + (warnCount !== 1 ? 's' : '') + '.'
      : 'Pre-flight complete: all dependencies healthy.';
  _announcePreflightStatus(announcement);

  // ── Persist results to chrome.storage.local ─────────────────────────────────
  // Strip function properties (onAction, onRetry) — not serialisable.
  // The stored shape is intentionally minimal: only what is needed to re-render.
  const storable = descriptors.map(d => ({
    status:      d.status,
    label:       d.label,
    detail:      d.detail,
    remediation: d.remediation,
  }));
  chrome.storage.local.set({
    [RC_STORE.PREFLIGHT_RESULTS]: {
      descriptors: storable,
      runAt:       Date.now(),
      durationMs,
    },
  });

  // Restore Run All button
  if (runBtn) { runBtn.disabled = false; runBtn.textContent = 'Run Checks'; }
  _preflightRunning = false;
}

/**
 * Re-run a single pre-flight check and replace its card in the container.
 * Uses the same generation mechanism to discard stale results.
 * F-011: replaces only the targeted card (located by data-check-label) rather
 * than triggering a full re-run of all checks.
 *
 * @param {Function} checkFn   - The check function to re-run.
 * @param {string}   checkId   - Logical identifier for logging (not used for DOM lookup).
 * @param {number}   gen       - Generation at the time this retry was initiated.
 */
async function _retryPreflightSingle(checkFn, checkId, gen) {
  // Noop if a full Run All started since this retry was triggered
  if (gen !== _preflightGeneration) return;
  try {
    const desc = await checkFn();
    if (gen !== _preflightGeneration) return;

    // F-011: Replace only the card for this check rather than re-running all checks.
    // Cards carry data-check-label set by _buildPreflightCard; locate by that attribute.
    // Search both panel containers — storage checks live in #rc-storage-checks.
    const newCard = _buildPreflightCard(desc);
    const panels = [
      document.getElementById('rc-preflight-checks'),
      document.getElementById('rc-storage-checks'),
    ];
    let replaced = false;
    for (const panel of panels) {
      if (!panel) continue;
      const existing = panel.querySelector('[data-check-label="' + esc(desc.label) + '"]');
      if (existing) {
        existing.replaceWith(newCard);
        replaced = true;
        break;
      }
    }
    // Fallback: if the card wasn't found (first-ever run with no rendered cards yet),
    // trigger a full re-run so the UI is not left blank.
    if (!replaced) {
      _preflightRunning = false;
      loadPreflightChecks();
    }
  } catch (_) {
    // Retry failure is non-fatal — full Run All will surface the issue
    _preflightRunning = false;
  }
}

/**
 * Restore the most recently persisted check results from chrome.storage.local
 * and render them without running any checks.
 *
 * Called on every popup/side-panel open (and Diagnostics tab activation) to
 * ensure previously completed results are visible immediately.  When no saved
 * results exist the summary bar is left in its default "Ready" state.
 *
 * @returns {Promise<boolean>} Resolves true when results were found and
 *   rendered; false when storage was empty (no prior run).
 */
async function restorePreflightResults() {
  const saved = await new Promise(r =>
    chrome.storage.local.get([RC_STORE.PREFLIGHT_RESULTS], data => r(data[RC_STORE.PREFLIGHT_RESULTS]))
  );
  if (!saved || !Array.isArray(saved.descriptors) || saved.descriptors.length === 0) {
    return false;
  }

  const container = document.getElementById('rc-preflight-checks');
  const bar       = document.getElementById('rc-preflight-summary');
  if (!container || !bar) return false;

  const { descriptors, runAt, durationMs } = saved;

  // Group metadata — MUST stay in sync with the GROUPS constant in loadPreflightChecks().
  // F-07: sizes must equal the lengths of the corresponding 'checks' arrays there.
  //   Storage:          1 check  (checkStorage)
  //   Permissions:      4 checks (checkPermSalesforce, checkPermCloudability, checkPermIbm, checkPermBookmarks)
  //   LocalRuntime:     6 checks (checkBobHelper, checkBobHelperPortSync, checkBobCli, checkBobVersion, checkNodeRuntime, checkBobWorkingDir)
  //   ExternalServices: 1 check  (checkIbmDocsApi)
  //   BrowserContext:   2 checks (checkSalesforceTab, checkCloudabilityTab)
  // If a check is added to any group in loadPreflightChecks(), update the size here.
  // panel: 'checks' → rendered in #rc-preflight-checks (System Checks tab)
  // panel: 'cache'  → rendered in #rc-storage-checks (Cache & Storage tab)
  const GROUPS_ORDER = ['Storage', 'Permissions', 'LocalRuntime', 'ExternalServices', 'BrowserContext'];
  const GROUP_META = {
    Storage:          { title: 'Storage',               panel: 'cache',  size: 1 },
    Permissions:      { title: 'Browser Permissions',   panel: 'checks', size: 4 },
    LocalRuntime:     { title: 'Local Runtime',         panel: 'checks', size: 6 },
    ExternalServices: { title: 'External Services',     panel: 'checks', size: 1 },
    BrowserContext:   { title: 'Active Browser Context',panel: 'checks', size: 2 },
  };

  // F-07: runtime guard — if the stored descriptor count does not match the
  // expected total, the persisted results are from an older or newer version.
  // Silently discard them rather than rendering cards against the wrong labels.
  const expectedTotal = GROUPS_ORDER.reduce((sum, key) => sum + GROUP_META[key].size, 0);
  if (descriptors.length !== expectedTotal) {
    addLog('info', 'platform',
      'Diagnostics: stored check results have ' + descriptors.length +
      ' entries (expected ' + expectedTotal + ') — skipping cached restore');
    return false;
  }

  // ── Re-render summary bar — System Checks groups only (cached indicator) ─────
  const checksDescs = descriptors.filter((_, i) => {
    // Reconstruct which group each descriptor belongs to by offset
    let offset = 0;
    for (const key of GROUPS_ORDER) {
      const m = GROUP_META[key];
      if (i < offset + m.size) return m.panel === 'checks';
      offset += m.size;
    }
    return true;
  });

  const counts = { pass: 0, warn: 0, fail: 0, info: 0, skip: 0 };
  checksDescs.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });
  const active      = checksDescs.filter(d => d.status !== 'skip');
  const overallFail = counts.fail > 0;
  const overallWarn = !overallFail && counts.warn > 0;
  const overallClass = overallFail ? 'fail' : (overallWarn ? 'warn' : 'pass');
  const overallText  = overallFail ? 'Issues detected'
    : (overallWarn ? 'Warnings present' : 'All checks healthy');

  const ts      = runAt ? new Date(runAt).toLocaleTimeString() : 'unknown';
  const dateStr = runAt ? new Date(runAt).toLocaleDateString() : '';
  const durStr  = durationMs != null ? ' (' + (durationMs / 1000).toFixed(1) + ' s)' : '';

  bar.className = 'rc-preflight__summary rc-preflight__summary--' + overallClass;
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = '';

  const statusSpan = document.createElement('span');
  statusSpan.className   = 'rc-preflight__summary-status';
  statusSpan.textContent = overallText;

  const detailSpan = document.createElement('span');
  detailSpan.className   = 'rc-preflight__summary-detail';
  detailSpan.textContent =
    active.length + ' checked - ' +
    counts.fail + ' failed, ' + counts.warn + ' warnings, ' + counts.pass + ' healthy' +
    (counts.skip ? ', ' + counts.skip + ' skipped' : '') +
    ' · Last checked: ' + dateStr + ' ' + ts + durStr + ' (cached)';

  bar.appendChild(statusSpan);
  bar.appendChild(detailSpan);

  // ── Re-render cards — split by panel ownership ──────────────────────────────
  // Cached results have no retry handlers; navigation action buttons are omitted
  // because stale context makes them misleading.
  function _renderCachedGroup(targetContainer, descs, title) {
    const header = _buildPreflightGroupHeader(title);
    targetContainer.appendChild(header);
    if (descs.every(d => d.status === 'skip')) {
      const skippedEl = document.createElement('div');
      skippedEl.className   = 'rc-preflight-group-skipped';
      skippedEl.textContent = 'All checks in this group skipped (plugins disabled).';
      targetContainer.appendChild(skippedEl);
    } else {
      descs.forEach(d => targetContainer.appendChild(_buildPreflightCard({
        status:      d.status,
        label:       d.label,
        detail:      d.detail,
        remediation: d.remediation,
      })));
    }
  }

  container.innerHTML = '';
  container.setAttribute('aria-label', 'Dependency check results (cached)');
  const storageContainer = document.getElementById('rc-storage-checks');
  if (storageContainer) storageContainer.innerHTML = '';

  let idx = 0;
  GROUPS_ORDER.forEach(key => {
    const meta       = GROUP_META[key];
    const groupDescs = descriptors.slice(idx, idx + meta.size);
    idx += meta.size;

    if (meta.panel === 'checks') {
      _renderCachedGroup(container, groupDescs, meta.title);
    } else if (meta.panel === 'cache' && storageContainer) {
      _renderCachedGroup(storageContainer, groupDescs, meta.title);
    }
  });

  // ── Update Overview snapshot warning list from the freshly rendered results ─
  // renderOverviewSnapshot is called from loadDiagnostics (which may not have run
  // yet on this popup open), so we call it with basic manifest data here so the
  // warnings section is immediately populated from the cached descriptors.
  const manifest = chrome.runtime.getManifest();
  const ua = navigator.userAgent;
  const edgeM = ua.match(/Edg\/([\d.]+)/);
  const chromeM = ua.match(/Chrome\/([\d.]+)/);
  renderOverviewSnapshot({
    name:         manifest.name,
    version:      manifest.version,
    browser:      (edgeM ? 'Microsoft Edge' : 'Chromium') + ' ' + ((edgeM || chromeM || ['', '?'])[1]),
    platform:     navigator.platform,
    pluginTotal:  PLUGINS.length,
    pluginActive: PLUGINS.filter(p => pluginStates[p.id]?.enabled !== false).length,
    logErrors:    logStore.filter(e => e.level === 'error').length,
    logWarnings:  logStore.filter(e => e.level === 'warn').length,
  });

  _announcePreflightStatus('Last check: ' + dateStr + ' ' + ts + ' (cached results restored)');
  return true;
}

function getFeedbackField(id) {
  return document.getElementById(id);
}

function getFeedbackValue(id) {
  const el = getFeedbackField(id);
  return el ? String(el.value || '').trim() : '';
}

function setFeedbackStatus(message, tone) {
  const el = document.getElementById('rc-feedback-status');
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    el.className = 'rc-status rc-status--neutral';
    return;
  }
  el.style.display = 'block';
  el.textContent = message;
  el.className = 'rc-status rc-status--' + (tone || 'neutral');
}

function setFeedbackError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || '';
}

function validateFeedbackForm() {
  const category = getFeedbackValue('rc-feedback-category');
  const subject = getFeedbackValue('rc-feedback-subject');
  const message = getFeedbackValue('rc-feedback-message');
  let valid = true;
  setFeedbackError('rc-feedback-category-error', '');
  setFeedbackError('rc-feedback-subject-error', '');
  setFeedbackError('rc-feedback-message-error', '');

  if (!category) {
    setFeedbackError('rc-feedback-category-error', 'Select a feedback category.');
    valid = false;
  }
  if (!subject) {
    setFeedbackError('rc-feedback-subject-error', 'Enter a subject.');
    valid = false;
  } else if (subject.length > FEEDBACK_MAX_SUBJECT) {
    setFeedbackError('rc-feedback-subject-error', 'Subject must be ' + FEEDBACK_MAX_SUBJECT + ' characters or fewer.');
    valid = false;
  }
  if (!message) {
    setFeedbackError('rc-feedback-message-error', 'Enter a message.');
    valid = false;
  } else if (message.length > FEEDBACK_MAX_MESSAGE) {
    setFeedbackError('rc-feedback-message-error', 'Message must be ' + FEEDBACK_MAX_MESSAGE + ' characters or fewer.');
    valid = false;
  }
  const button = document.getElementById('rc-feedback-open-email');
  if (button) button.disabled = !valid;
  return valid;
}

function getFeedbackDiagnosticsData() {
  const manifest = chrome.runtime.getManifest();
  const ua = navigator.userAgent;
  const edgeM = ua.match(/Edg\/([\d.]+)/);
  const chromeM = ua.match(/Chrome\/([\d.]+)/);
  const enabledPluginIds = PLUGINS.filter(p => pluginStates[p.id]?.enabled !== false).map(p => p.id);
  const pluginStatuses = PLUGINS.map(p => '- ' + p.id + ': ' + (pluginStates[p.id]?.enabled !== false ? 'active' : 'inactive'));
  return {
    manifest,
    browserName: edgeM ? 'Microsoft Edge' : 'Chromium',
    browserVersion: ((edgeM || chromeM || ['', 'unknown'])[1] || 'Not available'),
    enabledPluginIds,
    pluginStatuses,
    generatedAt: new Date().toString(),
  };
}

/**
 * Build a feedback diagnostics summary string.
 *
 * @param {boolean} [includeQuotas=true] When false the "Storage quotas" section
 *   is omitted — used for the mailto body to stay within URL length limits.
 *   The same data is available in the downloaded JSON diagnostics attachment.
 */
function buildFeedbackDiagnosticsSummary(includeQuotas) {
  const diagnostics = getFeedbackDiagnosticsData();
  const lines = [
    'Diagnostic summary',
    '------------------',
    'ReplyCators version: ' + diagnostics.manifest.version,
    'Extension version: ' + diagnostics.manifest.version,
    'Build: Not available',
    'Browser: ' + diagnostics.browserName,
    'Browser version: ' + diagnostics.browserVersion,
    'Platform: ' + (navigator.platform || 'Not available'),
    'Locale: ' + (navigator.language || 'Not available'),
    'Theme: ' + (appSettings.theme || 'Not available'),
    'Enabled plugins: ' + (diagnostics.enabledPluginIds.join(', ') || 'Not available'),
    'Diagnostics schema version: 1.0',
    'Generated at: ' + diagnostics.generatedAt,
    'Correlation ID: Not available',
    'Diagnostics file: ' + (feedbackDiagnosticsFileName || 'Not available'),
    '',
    'Plugin status details',
    '---------------------',
    diagnostics.pluginStatuses.join('\n') || 'Not available',
    '',
    'Activity counters',
    '-----------------',
    'Log entries: ' + logStore.length,
    'Notifications: ' + notifStore.length,
    'Errors: ' + logStore.filter(e => e.level === 'error').length,
    'Warnings: ' + logStore.filter(e => e.level === 'warn').length,
  ];
  if (includeQuotas !== false) {
    lines.push(
      '',
      'Storage quotas',
      '--------------',
      'Local quota: ' + chrome.storage.local.QUOTA_BYTES + ' bytes',
      'Sync quota: ' + chrome.storage.sync.QUOTA_BYTES + ' bytes'
    );
  }
  return lines.join('\n');
}

function refreshFeedbackUI() {
  const include = document.getElementById('rc-feedback-include-diagnostics');
  const preview = document.getElementById('rc-feedback-diagnostics-preview');
  if (preview) {
    preview.textContent = include && include.checked ? buildFeedbackDiagnosticsSummary() : 'Diagnostic summary excluded from the email body.';
  }
  validateFeedbackForm();
}

function buildFeedbackBody() {
  const body = [
    'ReplyCators feedback',
    '--------------------',
    '',
    'Category: ' + (getFeedbackValue('rc-feedback-category') || 'Not available'),
    'Subject: ' + (getFeedbackValue('rc-feedback-subject') || 'Not available'),
    '',
    'User message:',
    getFeedbackValue('rc-feedback-message') || 'Not available'
  ];
  const include = document.getElementById('rc-feedback-include-diagnostics');
  if (include && include.checked) {
    body.push('', buildFeedbackDiagnosticsSummary(false));
  }
  return body.join('\n');
}

function buildFeedbackMailto() {
  const subject = '[' + getFeedbackValue('rc-feedback-category') + '] ' + getFeedbackValue('rc-feedback-subject');
  const mailto = 'mailto:' + FEEDBACK_RECIPIENTS.join(';') + '?subject=' + encodeURIComponent(subject.replace(/[\r\n]+/g, ' ')) + '&body=' + encodeURIComponent(buildFeedbackBody().replace(/\r\n/g, '\n'));
  lastGeneratedFeedbackMailto = mailto;
  return mailto;
}

function copyFeedbackText(text, successMessage) {
  navigator.clipboard.writeText(text).then(() => {
    setFeedbackStatus(successMessage, 'success');
  }).catch(() => {
    setFeedbackStatus('Clipboard copy failed. Create the email manually if needed.', 'warning');
  });
}

function downloadFeedbackDiagnostics() {
  const content = JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: buildFeedbackDiagnosticsSummary()
  }, null, 2);
  feedbackDiagnosticsFileName = 'ReplyCators-Diagnostics-' + new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19) + '.json';
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = feedbackDiagnosticsFileName;
  a.click();
  URL.revokeObjectURL(url);
  refreshFeedbackUI();
  setFeedbackStatus('Diagnostics downloaded. Attach the file manually after the draft opens.', 'success');
}

function clearFeedbackForm() {
  ['rc-feedback-category', 'rc-feedback-subject', 'rc-feedback-message'].forEach(id => {
    const el = getFeedbackField(id);
    if (el) el.value = '';
  });
  const include = document.getElementById('rc-feedback-include-diagnostics');
  if (include) include.checked = true;
  setFeedbackStatus('', 'neutral');
  refreshFeedbackUI();
}

function openFeedbackEmailClient() {
  if (!validateFeedbackForm()) {
    setFeedbackStatus('Correct the validation errors before opening the email client.', 'warning');
    return;
  }
  const mailto = buildFeedbackMailto();
  if (mailto.length > FEEDBACK_MAILTO_LIMIT) {
    setFeedbackStatus('The prepared email is too long for reliable automatic handoff. Use the copy actions for manual submission.', 'warning');
    return;
  }
  window.location.href = mailto;
  setFeedbackStatus('Email draft handoff started. Review the draft, add any attachments, and send it from your email application. ReplyCators does not send or confirm delivery.', 'success');
}

function initFeedbackForm() {
  ['rc-feedback-category', 'rc-feedback-subject', 'rc-feedback-message'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', refreshFeedbackUI);
    document.getElementById(id)?.addEventListener('change', refreshFeedbackUI);
  });
  document.getElementById('rc-feedback-include-diagnostics')?.addEventListener('change', refreshFeedbackUI);
  document.getElementById('rc-feedback-download-diagnostics')?.addEventListener('click', downloadFeedbackDiagnostics);
  document.getElementById('rc-feedback-open-email')?.addEventListener('click', openFeedbackEmailClient);
  document.getElementById('rc-feedback-clear')?.addEventListener('click', clearFeedbackForm);
  document.getElementById('rc-feedback-copy-addresses')?.addEventListener('click', () => copyFeedbackText(FEEDBACK_RECIPIENTS_TEXT, 'Email addresses copied.'));
  document.getElementById('rc-feedback-copy-subject')?.addEventListener('click', () => copyFeedbackText('[' + getFeedbackValue('rc-feedback-category') + '] ' + getFeedbackValue('rc-feedback-subject'), 'Subject copied.'));
  document.getElementById('rc-feedback-copy-feedback')?.addEventListener('click', () => copyFeedbackText(buildFeedbackBody(), 'Feedback copied.'));
  refreshFeedbackUI();
}


/**
 * Render the concise Overview snapshot panel (#rc-overview-snapshot).
 *
 * Displays a compact grid of platform, browser, plugin, and activity facts.
 * Also populates #rc-overview-warnings with high-priority items (fail/warn)
 * sourced from the most recently persisted check results, with links that
 * open the relevant System Checks or Cache & Storage tab.
 *
 * Called by loadDiagnostics() after data is ready, and by
 * restorePreflightResults() so the snapshot is immediately visible on open.
 *
 * @param {object} opts
 * @param {string}  opts.name        Extension name
 * @param {string}  opts.version     Extension version
 * @param {string}  opts.browser     Browser name + version
 * @param {string}  opts.platform    navigator.platform
 * @param {number}  opts.pluginTotal Total plugin count
 * @param {number}  opts.pluginActive Active plugin count
 * @param {number}  opts.logErrors   Error log count
 * @param {number}  opts.logWarnings Warning log count
 */
function renderOverviewSnapshot(opts) {
  const snap = document.getElementById('rc-overview-snapshot');
  if (!snap) return;

  // ── Compact stat cards ─────────────────────────────────────────────────────
  const rows = [
    { label: 'Extension',      value: opts.name + ' v' + opts.version },
    { label: 'Browser',        value: opts.browser + (opts.platform ? ' · ' + opts.platform : '') },
    { label: 'Plugins',        value: opts.pluginActive + ' active / ' + opts.pluginTotal + ' total' },
    { label: 'Log entries',    value: opts.logErrors + ' error' + (opts.logErrors !== 1 ? 's' : '') +
                                      ', ' + opts.logWarnings + ' warning' + (opts.logWarnings !== 1 ? 's' : '') },
  ];

  snap.innerHTML = '';
  snap.className = 'rc-diag-overview__snapshot';
  rows.forEach(row => {
    const card = document.createElement('div');
    card.className = 'rc-diag-overview__stat';

    const lbl = document.createElement('span');
    lbl.className   = 'rc-diag-overview__stat-label';
    lbl.textContent = row.label;

    const val = document.createElement('span');
    val.className   = 'rc-diag-overview__stat-value';
    val.textContent = row.value;

    card.appendChild(lbl);
    card.appendChild(val);
    snap.appendChild(card);
  });

  // ── High-priority warnings from persisted check results ────────────────────
  // Read synchronously from storage; the result may already be available if
  // restorePreflightResults() was called before renderOverviewSnapshot().
  const warnEl = document.getElementById('rc-overview-warnings');
  if (!warnEl) return;

  chrome.storage.local.get([RC_STORE.PREFLIGHT_RESULTS], data => {
    const saved = data[RC_STORE.PREFLIGHT_RESULTS];
    if (!saved || !Array.isArray(saved.descriptors)) {
      warnEl.hidden = true;
      return;
    }
    // Checks panel owns: Permissions, LocalRuntime, ExternalServices, BrowserContext
    // Cache panel owns: Storage — links go to Cache & Storage tab
    const STORAGE_LABELS = ['Storage Quota'];
    const priority = saved.descriptors.filter(d => d.status === 'fail' || d.status === 'warn');
    if (priority.length === 0) {
      warnEl.hidden = true;
      return;
    }

    warnEl.hidden = false;
    warnEl.innerHTML = '';

    const heading = document.createElement('div');
    heading.className   = 'rc-diag-overview__warn-heading';
    heading.textContent = 'High-priority items';
    warnEl.appendChild(heading);

    priority.forEach(d => {
      const row = document.createElement('div');
      row.className = 'rc-diag-overview__warn-row rc-diag-overview__warn-row--' + d.status;

      const badge = document.createElement('span');
      badge.className   = 'rc-diag-overview__warn-badge';
      badge.textContent = d.status === 'fail' ? 'FAIL' : 'WARN';

      const text = document.createElement('span');
      text.className   = 'rc-diag-overview__warn-text';
      text.textContent = d.label + ': ' + d.detail;

      // Link opens the owning tab
      const targetTab = STORAGE_LABELS.includes(d.label) ? 'cache' : 'checks';
      const link = document.createElement('button');
      link.className   = 'rc-diag-overview__warn-link';
      link.type        = 'button';
      link.textContent = targetTab === 'cache' ? 'View in Cache & Storage →' : 'View in System Checks →';
      link.setAttribute('aria-label', 'Open ' + d.label + ' in ' + (targetTab === 'cache' ? 'Cache & Storage' : 'System Checks'));
      link.addEventListener('click', () => setDiagnosticsTab(targetTab));

      row.appendChild(badge);
      row.appendChild(text);
      row.appendChild(link);
      warnEl.appendChild(row);
    });
  });
}

async function loadDiagnostics() {
  // Concurrent-run guard — prevents stacked loads from rapid tab-switching or
  // repeated setMaintenanceTab calls before the first load completes.
  if (_diagLoading) return;
  _diagLoading = true;

  // Always bind sub-tab controls before anything async so all three tab
  // clicks work even if the user switches tabs before data arrives.
  bindCacheInspectorControls();

  const output    = document.getElementById('rc-diag-output');
  const statusEl  = document.getElementById('rc-cache-inspector-status');
  const refreshEl = document.getElementById('rc-diag-refresh');

  if (output) output.textContent = 'Loading…';
  if (refreshEl) { refreshEl.disabled = true; refreshEl.textContent = '↺ Loading…'; }

  try {
    const manifest   = chrome.runtime.getManifest();
    const ua         = navigator.userAgent;
    const edgeM      = ua.match(/Edg\/([\d.]+)/);
    const chromeM    = ua.match(/Chrome\/([\d.]+)/);

    // F-001: pass skipOrphanCheck=true so only CACHE_REGISTRY_KEYS are fetched
    // (targeted read instead of get(null)), avoiding full store deserialisation.
    // F-010: ADF keys are already in CACHE_REGISTRY_KEYS; read them from the
    // returned localData snapshot instead of issuing a second targeted get.
    const cacheState = await collectCacheDiagnostics(true);

    const _snapshotData  = cacheState.localData;
    const adfDiagRecord  = _snapshotData['rc:plugin:com.replycators.apptio-docs-finder:diag'] || null;
    const adfLastRefresh = _snapshotData['rc:plugin:com.replycators.apptio-docs-finder:last-refresh'] || null;
    const adfSources     = _snapshotData['rc:plugin:com.replycators.apptio-docs-finder:sources'];
    const adfSourceCount = Array.isArray(adfSources) ? adfSources.length : 0;

    cacheInspectorState.items = cacheState.items;
    cacheInspectorState.summary = cacheState.summary;
    cacheInspectorState.orphanedKeys = cacheState.orphanedKeys;
    cacheInspectorState.storage = cacheState.storage;
    renderCacheFilterOptions(cacheInspectorState);
    renderCacheSummary(cacheInspectorState);
    renderCacheGroups();

    // Keep whichever tab the user already selected; fall back to Overview.
    setDiagnosticsTab(cacheInspectorState.activeTab || 'overview');

    // ── Concise Overview snapshot (platform + browser + plugin + activity) ───
    // Storage and cache details belong in Cache & Storage tab only.
    const browserName = edgeM ? 'Microsoft Edge' : 'Chromium';
    const browserVer  = (edgeM || chromeM || ['', 'unknown'])[1];
    renderOverviewSnapshot({
      name:         manifest.name,
      version:      manifest.version,
      browser:      browserName + ' ' + browserVer,
      platform:     navigator.platform,
      pluginTotal:  PLUGINS.length,
      pluginActive: PLUGINS.filter(p => pluginStates[p.id]?.enabled !== false).length,
      logErrors:    logStore.filter(e => e.level === 'error').length,
      logWarnings:  logStore.filter(e => e.level === 'warn').length,
    });

    // ── Technical details JSON — placed behind <details> in the Overview tab ─
    const diag = {
      platform: { name: manifest.name, version: manifest.version },
      browser: {
        name:     browserName,
        version:  browserVer,
        platform: navigator.platform,
      },
      plugins: {
        total:  PLUGINS.length,
        active: PLUGINS.filter(p => pluginStates[p.id]?.enabled !== false).length,
        list:   PLUGINS.map(p => ({ id: p.id, name: p.name, status: pluginStates[p.id]?.enabled !== false ? 'active' : 'inactive' })),
      },
      cloudabilityOrgID: (function() {
        const s = window.ReplyCatorsPlugins?.CloudabilityOrgId?.getState?.() || {};
        return {
          source:       'Cloudability settings API',
          orgIdPresent: !!s.orgId,
          orgNamePresent: !!s.orgName,
          retrievedAt:  s.retrievedAt ? new Date(s.retrievedAt).toISOString() : null,
        };
      })(),
      apptioDocsFinder: {
        sourcesInStorage:      adfSourceCount,
        lastRefresh:           adfLastRefresh ? new Date(adfLastRefresh).toISOString() : null,
        lastRefreshSuccess:    adfDiagRecord  ? !!adfDiagRecord.success : null,
        lastRefreshErrorPhase: adfDiagRecord  ? (adfDiagRecord.errorPhase  || null) : null,
        lastRefreshProducts:   adfDiagRecord  ? (adfDiagRecord.matchedProducts != null ? adfDiagRecord.matchedProducts + ' matched / ' + (adfDiagRecord.totalProducts || '?') + ' total' : null) : null,
        storageNamespace:      'rc:plugin:com.replycators.apptio-docs-finder:*',
      },
      activity: {
        totalLogEntries:    logStore.length,
        totalNotifications: notifStore.length,
        errors:   logStore.filter(e => e.level === 'error').length,
        warnings: logStore.filter(e => e.level === 'warn').length,
      },
      timestamp: new Date().toISOString(),
    };
    if (output) output.textContent = JSON.stringify(diag, null, 2);
    if (statusEl && (!statusEl.textContent || /Collecting registered cache metadata|Loading/.test(statusEl.textContent))) {
      const warning = cacheState.storage.usagePct >= 0.8 || cacheState.orphanedKeys.length > 0;
      setStatus(statusEl, 'Registered caches: ' + cacheState.summary.registeredCount + (cacheState.orphanedKeys.length ? ' · Orphaned keys: ' + cacheState.orphanedKeys.length : '') + (cacheState.storage.usagePct >= 0.8 ? ' · Storage usage high' : ''), warning ? 'warning' : 'success');
    }
    addLog('info', 'platform', 'Diagnostics loaded');
  } catch (err) {
    // Never leave any tab in an indefinite loading state — show an actionable
    // error message with a retry suggestion instead.
    if (output) {
      output.textContent = 'Diagnostics failed to load.\n\nError: ' + String(err) +
        '\n\nClick ↺ Refresh to try again.';
    }
    const cacheGroupsEl = document.getElementById('rc-cache-groups');
    if (cacheGroupsEl) {
      cacheGroupsEl.innerHTML =
        '<div class="rc-empty-state" style="padding:12px;">' +
        '<p><strong>Cache data unavailable.</strong> ' + esc(String(err)) + '</p>' +
        '<p style="margin-top:8px;">Click <strong>↺ Refresh</strong> to try again.</p></div>';
    }
    if (statusEl) setStatus(statusEl, 'Diagnostics failed: ' + String(err), 'error');
    addLog('error', 'platform', 'Diagnostics failed: ' + String(err));
  } finally {
    // Always release the guard and restore the Refresh button regardless of
    // success, failure, empty data, or cancellation.
    _diagLoading = false;
    if (refreshEl) { refreshEl.disabled = false; refreshEl.textContent = '↺ Refresh'; }
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

/**
 * Show a short-lived toast notification.
 *
 * Toasts auto-dismiss after the configured duration.  An × button allows early dismissal.
 * Use type 'success', 'info', 'warning', or 'error'.
 *
 * BUG-A fix: showToast() was being called directly by 7 call sites, all of which
 * bypassed the notification master switch and per-type filters in addNotification().
 * Fix: apply the same filter guards here so that ALL toast display — regardless of
 * call path — respects the user's notification settings.
 *
 * Exception: pass force=true to bypass filtering for critical system-level messages
 * (e.g. plugin-disabled redirect) that must always be shown.
 */
const RC_MAX_TOASTS = 2;   // Maximum simultaneous visible toasts

function showToast(message, type, title, force) {
  const container = document.getElementById('rc-toast-container');
  if (!container) return;

  const VALID_TYPES = ['success', 'info', 'warning', 'error'];
  const normType    = VALID_TYPES.includes(type) ? type : 'info';

  // Respect notification settings unless force=true
  if (!force && appSettings) {
    if (!appSettings.notifEnabled) return;
    const typeKey = 'notif' + normType.charAt(0).toUpperCase() + normType.slice(1);
    if (!appSettings[typeKey]) return;
  }

  // ── Toast limit: evict the oldest toast when at capacity ──────────────────
  // This prevents visual clutter when many operations complete in rapid succession.
  const existing = container.querySelectorAll('.rc-toast');
  if (existing.length >= RC_MAX_TOASTS) {
    existing[0].remove();   // remove the oldest (first child = earliest appended)
  }

  const icon = NOTIF_ICONS[normType] || _notifIconHtml('info');

  const toast = document.createElement('div');
  toast.className = 'rc-toast rc-toast--' + normType;
  toast.setAttribute('role', 'alert');
  toast.innerHTML =
    (title ? `<div class="rc-toast__title">${icon} ${esc(title)}</div>` : '') +
    `<div class="rc-toast__message">${esc(message)}</div>
     <button class="rc-toast__close" title="Dismiss this notification">×</button>`;
  toast.querySelector('.rc-toast__close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  // Use the configured notification duration (default 4 000 ms)
  const duration = (appSettings && appSettings.notifDuration) || 4000;
  setTimeout(() => toast.classList.add('rc-toast--exit'), duration - 500);
  setTimeout(() => toast.remove(),                         duration);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

// F-11: in-memory cache for ADF settings used by wireAdfToggle() to avoid
// read-modify-write storage round-trips on every checkbox change.
// Seeded by syncSettingsUI() immediately after initSettings() is called.
// Defaults mirror DEFAULT_PLUGIN_SETTINGS in apptio-docs-finder.js.
let _adfSettingsCache = { openInNewTab: true, saveSearchHistory: true, saveOpenHistory: true };

// ── _committedBobApiKey ───────────────────────────────────────────────────────
// The API key that has been explicitly saved by the user.  persistSfSettings()
// reads this variable — NEVER the DOM input — so unrelated settings changes
// (output format, checkboxes, etc.) cannot re-persist a partially-typed or
// empty key.  Seeded from storage by syncSettingsUI() on startup.
// ZERO-LOGGING POLICY: this value must never appear in any log call.
let _committedBobApiKey = '';

// ── _setDirStatus ─────────────────────────────────────────────────────────────
// Module-scope helper so both initSettings() (Save button handler) and
// syncSettingsUI() (restore path) can access it without scoping gymnastics.
// Updates the status strip and input border for the Bob Working Directory field.
function _setDirStatus(msg, cls) {
  const strip   = document.getElementById('sf-bob-working-dir-status');
  const inputEl = document.getElementById('sf-bob-working-dir-input');
  if (!strip) return;
  if (!msg) {
    strip.hidden = true;
    strip.textContent = '';
    strip.className = 'rc-status-bar';
  } else {
    strip.hidden = false;
    strip.textContent = msg;
    strip.className = 'rc-status-bar' + (cls ? ' ' + cls : '');
  }
  if (inputEl) {
    inputEl.classList.remove('rc-input--error', 'rc-input--ok');
    if (cls === 'err') inputEl.classList.add('rc-input--error');
    if (cls === 'ok')  inputEl.classList.add('rc-input--ok');
  }
}

// ── _setApiKeyStatus ──────────────────────────────────────────────────────────
// Parallel to _setDirStatus — updates the API key status strip and input border.
function _setApiKeyStatus(msg, cls) {
  const strip   = document.getElementById('sf-bob-api-key-status');
  const inputEl = document.getElementById('sf-bob-api-key-input');
  if (!strip) return;
  if (!msg) {
    strip.hidden = true;
    strip.textContent = '';
    strip.className = 'rc-status-bar';
  } else {
    strip.hidden = false;
    strip.textContent = msg;
    strip.className = 'rc-status-bar' + (cls ? ' ' + cls : '');
  }
  if (inputEl) {
    inputEl.classList.remove('rc-input--error', 'rc-input--ok');
    if (cls === 'err') inputEl.classList.add('rc-input--error');
    if (cls === 'ok')  inputEl.classList.add('rc-input--ok');
  }
}

function initSettings() {
  // ── Appearance ────────────────────────────────────────────────────────────
  document.getElementById('settings-theme')?.addEventListener('change', e => {
    applyTheme(e.target.value);
    persistAppSettings();
    addLog('info', 'platform', 'Theme changed to: ' + e.target.value);
  });

  document.getElementById('settings-font')?.addEventListener('change', e => {
    applyFont(e.target.value);
    persistAppSettings();
    addLog('info', 'platform', 'Font changed to: ' + e.target.value);
  });

  document.getElementById('settings-density')?.addEventListener('change', e => {
    applyDensity(e.target.value);
    persistAppSettings();
    addLog('info', 'platform', 'Density changed to: ' + e.target.value);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────
  function wireAccessibilityToggle(id, key) {
    document.getElementById(id)?.addEventListener('change', e => {
      appSettings[key] = e.target.checked;
      applyAccessibility();
      persistAppSettings();
      addLog('info', 'platform', key + ' set to: ' + e.target.checked);
    });
  }
  wireAccessibilityToggle('settings-larger-font',        'largerFont');
  wireAccessibilityToggle('settings-reduced-animations', 'reducedAnimations');
  wireAccessibilityToggle('settings-high-contrast',      'highContrast');
  wireAccessibilityToggle('settings-enhanced-focus',     'enhancedFocus');

  // ── Notifications ─────────────────────────────────────────────────────────
  function wireNotifToggle(id, key) {
    document.getElementById(id)?.addEventListener('change', e => {
      appSettings[key] = e.target.checked;
      persistAppSettings();
    });
  }
  wireNotifToggle('settings-notif-enabled', 'notifEnabled');
  wireNotifToggle('settings-notif-success', 'notifSuccess');
  wireNotifToggle('settings-notif-warning', 'notifWarning');
  wireNotifToggle('settings-notif-error',   'notifError');
  wireNotifToggle('settings-notif-info',    'notifInfo');

  document.getElementById('settings-notif-duration')?.addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 1000 && v <= 30000) {
      appSettings.notifDuration = v;
      persistAppSettings();
    }
  });

  document.getElementById('settings-notif-position')?.addEventListener('change', e => {
    appSettings.notifPosition = e.target.value;
    applyNotifPosition(e.target.value);
    persistAppSettings();
  });

  // ── Dashboard preferences ─────────────────────────────────────────────────
  document.getElementById('settings-dash-show-cards')?.addEventListener('change', e => {
    appSettings.dashShowCards = e.target.checked;
    applyDashboardPrefs();
    persistAppSettings();
  });
  document.getElementById('settings-dash-compact')?.addEventListener('change', e => {
    appSettings.dashCompact = e.target.checked;
    applyDashboardPrefs();
    persistAppSettings();
  });
  document.getElementById('settings-dash-remember-last')?.addEventListener('change', e => {
    appSettings.dashRememberLast = e.target.checked;
    persistAppSettings();
  });

  // ── Logging preferences ───────────────────────────────────────────────────
  document.getElementById('settings-log-level')?.addEventListener('change', e => {
    appSettings.logLevel = e.target.value;
    persistAppSettings();
    addLog('info', 'platform', 'Log level changed to: ' + e.target.value);
  });

  // ── Extension behavior ────────────────────────────────────────────────────
  document.getElementById('settings-default-launch-mode')?.addEventListener('change', e => {
    appSettings.defaultLaunchMode = e.target.value;
    persistAppSettings();
    // Notify the background worker so it can reconfigure chrome.action immediately
    chrome.runtime.sendMessage({ type: 'RC_SET_LAUNCH_MODE', payload: { mode: e.target.value } });
    addLog('info', 'platform', 'Default launch mode changed to: ' + e.target.value);
  });

  // ── Popup window size ─────────────────────────────────────────────────────
  document.getElementById('settings-popup-size')?.addEventListener('change', e => {
    appSettings.popupSize = e.target.value;
    applyPopupSize();
    persistAppSettings();
    addLog('info', 'platform', 'Popup size changed to: ' + e.target.value);
  });

  document.getElementById('settings-popup-custom-width')?.addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 400 && v <= POPUP_BROWSER_MAX_W) {
      appSettings.popupCustomWidth = v;
      applyPopupSize();
      persistAppSettings();
    }
  });

  document.getElementById('settings-popup-custom-height')?.addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 300 && v <= POPUP_BROWSER_MAX_H) {
      appSettings.popupCustomHeight = v;
      applyPopupSize();
      persistAppSettings();
    }
  });

  // ── Snake plugin ──────────────────────────────────────────────────────────
  document.getElementById('settings-snake-speed')?.addEventListener('change', e => {
    appSettings.snakeSpeed = e.target.value;
    persistAppSettings();
    window.ReplyCatorsPlugins?.Snake?.applySpeed?.(e.target.value);
    addLog('info', 'com.replycators.snake', 'Snake speed changed to: ' + e.target.value);
  });

  // ── Salesforce plugin settings ────────────────────────────────────────────
  document.getElementById('sf-output-format')?.addEventListener('change', persistSfSettings);
  document.getElementById('sf-post-sort')?.addEventListener('change', persistSfSettings);
  document.getElementById('sf-auto-fill')?.addEventListener('change', persistSfSettings);

  // v1.40.0: Bob Working Directory — Save button model.
  // The input is free-text only.  Storage is written only on explicit Save click after
  // server-side validation succeeds.  The plugin module is notified immediately on
  // every keystroke (no debounce) so the Execute-button disabled-state stays live.

  // Notify the plugin on every keystroke so the Execute button reflects the
  // current typed value in real time — no storage write at this point.
  document.getElementById('sf-bob-working-dir-input')?.addEventListener('input', () => {
    const clean = (document.getElementById('sf-bob-working-dir-input')?.value || '').trim();
    window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onWorkingDirChanged?.(clean);
    // Clear any residual validation state so the status strip resets when the user edits.
    _setDirStatus('', '');
  });

  // Save button: validate via server then persist only on success.
  document.getElementById('sf-bob-working-dir-save')?.addEventListener('click', () => {
    _handleBobWorkingDirSave();
  });

  // Also allow Enter in the input field to trigger Save.
  document.getElementById('sf-bob-working-dir-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _handleBobWorkingDirSave(); }
  });

  // ── _commitBobWorkingDir: persist and notify after successful validation ────
  function _commitBobWorkingDir(dir) {
    // Write the new dir to appSettings-derived sfSettings and persist.
    persistSfSettings();
    // Notify plugin module so Execute-button state is updated immediately.
    window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onWorkingDirChanged?.(dir);
    addLog('info', 'com.replycators.salesforce-extractor',
      'Bob Working Directory saved: ' + (dir || '(empty)'));
  }

  // ── _handleBobWorkingDirSave: validate via server then commit ───────────────
  function _handleBobWorkingDirSave() {
    const inputEl = document.getElementById('sf-bob-working-dir-input');
    const saveBtn = document.getElementById('sf-bob-working-dir-save');
    const dir = (inputEl?.value || '').trim();

    // Empty is a valid "clear" operation — commit immediately without server round-trip.
    if (!dir) {
      _setDirStatus('', '');
      _commitBobWorkingDir('');
      return;
    }

    // Client-side quick checks before the server round-trip.
    const isWindowsAbsolute = /^[A-Za-z]:[/\\]/.test(dir) || dir.startsWith('\\\\');
    const isUnixAbsolute    = dir.startsWith('/');
    if (!isWindowsAbsolute && !isUnixAbsolute) {
      _setDirStatus('\u26a0\ufe0f Path must be an absolute path (e.g. C:\\Work\\Bob)', 'err');
      return;
    }
    if (dir.includes('%') || dir.includes('"')) {
      _setDirStatus('\u26a0\ufe0f Path must not contain % or " characters', 'err');
      return;
    }

    // Disable the Save button while the server round-trip is in-flight.
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Checking\u2026'; }
    _setDirStatus('\u23f3 Validating path\u2026', '');

    // Ask the background to forward GET /cli-check?dir= to the helper server.
    chrome.runtime.sendMessage({ type: 'RC_PREFLIGHT_CLI_CHECK', payload: { dir } }, response => {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
      if (chrome.runtime.lastError) {
        _setDirStatus('\u274c Helper server not reachable — run powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start first', 'err');
        return;
      }
      if (!response?.ok) {
        const msg = response?.serverDown
          ? 'Helper server not reachable — run powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start first'
          : (response?.error || 'Validation failed');
        _setDirStatus('\u274c ' + msg, 'err');
        return;
      }
      if (response.dirOk === false) {
        _setDirStatus('\u274c ' + (response.dirError || 'Invalid directory'), 'err');
        return;
      }
      // Server confirmed the directory is valid.
      _setDirStatus('\u2705 Path saved', 'ok');
      _commitBobWorkingDir(dir);
    });
  }

  // ── BobShell 2.0 API Key ──────────────────────────────────────────────────
  // The key is saved only on explicit click of the Save button (or Enter in the
  // input).  On every keystroke the plugin module is notified so the Execute
  // button disabled-state stays live without a storage write.

  document.getElementById('sf-bob-api-key-input')?.addEventListener('input', () => {
    const typed = (document.getElementById('sf-bob-api-key-input')?.value || '').trim();
    // Notify plugin so Execute-button gating reflects the current typed value.
    window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onApiKeyChanged?.(typed);
    // Clear any residual validation state when the user edits.
    _setApiKeyStatus('', '');
  });

  document.getElementById('sf-bob-api-key-save')?.addEventListener('click', () => {
    _handleBobApiKeySave();
  });

  document.getElementById('sf-bob-api-key-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _handleBobApiKeySave(); }
  });

  // Show/hide toggle for the password input.
  document.getElementById('sf-bob-api-key-show')?.addEventListener('click', () => {
    const inputEl = document.getElementById('sf-bob-api-key-input');
    if (!inputEl) return;
    if (inputEl.type === 'password') {
      inputEl.type = 'text';
      document.getElementById('sf-bob-api-key-show').title = 'Hide the API key value';
    } else {
      inputEl.type = 'password';
      document.getElementById('sf-bob-api-key-show').title = 'Show or hide the API key value';
    }
  });

  // ── sf-bob-use-bob1 toggle ─────────────────────────────────────────────────
  document.getElementById('sf-bob-use-bob1')?.addEventListener('change', e => {
    const useBob1 = e.target.checked;
    // Disable/enable the API key input and Save button.
    const keyInput = document.getElementById('sf-bob-api-key-input');
    const keyBtn   = document.getElementById('sf-bob-api-key-save');
    const showBtn  = document.getElementById('sf-bob-api-key-show');
    if (keyInput) keyInput.disabled = useBob1;
    if (keyBtn)   keyBtn.disabled   = useBob1;
    if (showBtn)  showBtn.disabled  = useBob1;
    if (useBob1)  _setApiKeyStatus('API key not required (Bob 1.0 mode)', '');
    else          _setApiKeyStatus('', '');
    // Notify plugin module so Execute-button state updates immediately.
    window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onBobVersionModeChanged?.(useBob1);
    // Persist the new value.
    persistSfSettings();
    addLog('info', 'com.replycators.salesforce-extractor',
      'Bob version mode changed: useBob1=' + useBob1);
  });

  // ── _commitBobApiKey: persist and notify after user saves ──────────────────
  function _commitBobApiKey(key) {
    _committedBobApiKey = key;
    persistSfSettings();
    // Notify plugin module so Execute-button state updates immediately.
    window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onApiKeyChanged?.(key);
    // ZERO-LOGGING POLICY: log presence only, never value.
    addLog('info', 'com.replycators.salesforce-extractor',
      'BobShell 2.0 API key saved: ' + (key ? '[set]' : '[not set]'));
  }

  // ── _handleBobApiKeySave: validate then commit ─────────────────────────────
  function _handleBobApiKeySave() {
    const inputEl = document.getElementById('sf-bob-api-key-input');
    const saveBtn = document.getElementById('sf-bob-api-key-save');
    const key = (inputEl?.value || '').trim();

    // Empty is a valid "clear" operation.
    if (!key) {
      _setApiKeyStatus('', '');
      _commitBobApiKey('');
      showToast('BobShell API key cleared.', 'info');
      return;
    }

    // Basic format guard - Bob API keys are non-whitespace strings.
    if (/\s/.test(key)) {
      _setApiKeyStatus('\u26a0\ufe0f API key must not contain spaces', 'err');
      return;
    }

    // Disable the button while committing.
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving\u2026'; }

    _commitBobApiKey(key);

    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    _setApiKeyStatus('\u2705 API key saved', 'ok');
    showToast('BobShell 2.0 API key saved.', 'success');
  }

  // ── Workspace Starter — Tab Groups default setting ────────────────────────
  // Controls the default launchMode for newly created profiles.
  // Existing profiles are unaffected — launchMode is per-profile and stored with the profile.
  document.getElementById('ws-setting-tab-groups')?.addEventListener('change', function(e) {
    appSettings.wsDefaultTabGroups = e.target.checked;
    persistAppSettings();
    addLog('info', 'com.replycators.workspace-starter', 'Workspace Starter default tab groups set to: ' + e.target.checked);
  });

  // ── Apptio Documentation Finder — global settings panel ──────────────────
  // These toggles are mirrored into the plugin's own settings storage so the
  // plugin reads its own rc:plugin:* key while the Settings view provides a
  // single integrated home for all plugin settings.
  //
  // F-11: _adfSettingsCache is declared at module scope (see below initSettings).
  // Each toggle change writes the merged cached object directly — no storage
  // read-modify-write round-trip.  Seeded by syncSettingsUI().
  function wireAdfToggle(id, key) {
    document.getElementById(id)?.addEventListener('change', function(e) {
      // F-11: update the in-memory cache and write the merged object directly —
      // no storage read needed.
      _adfSettingsCache[key] = e.target.checked;
      chrome.storage.local.set({ [RC_STORE.ADF_SETTINGS]: _adfSettingsCache });
      addLog('info', 'com.replycators.apptio-docs-finder', 'Setting ' + key + ' set to: ' + e.target.checked);
      // Notify the plugin module if it is loaded so its in-memory state stays in sync
      window.ReplyCatorsPlugins?.ApptioDocsFinder?._onSettingChanged?.(key, e.target.checked);
    });
  }
  wireAdfToggle('adf-settings-save-search-history', 'saveSearchHistory');
  wireAdfToggle('adf-settings-save-open-history',   'saveOpenHistory');

  document.getElementById('adf-settings-refresh-btn')?.addEventListener('click', function() {
    // Delegate to the plugin module's refresh action if the view is open
    window.ReplyCatorsPlugins?.ApptioDocsFinder?._doRefreshFromSettings?.();
    addLog('info', 'com.replycators.apptio-docs-finder', 'Refresh triggered from Settings panel');
  });

  document.getElementById('adf-settings-clear-history-btn')?.addEventListener('click', function() {
    if (!confirm('Clear all Documentation Finder search and opened history? This cannot be undone.')) return;
    const plugin = window.ReplyCatorsPlugins?.ApptioDocsFinder;
    if (plugin?._clearAllData) {
      plugin._clearAllData().then(function() {
        addNotification('Apptio Docs Finder', 'Search and opened history cleared.', 'success', 'com.replycators.apptio-docs-finder');
        addLog('info', 'com.replycators.apptio-docs-finder', 'Search and opened history cleared from Settings panel');
      }).catch(function(err) {
        addNotification('Apptio Docs Finder', 'Failed to clear history: ' + String(err), 'error', 'com.replycators.apptio-docs-finder');
        addLog('error', 'com.replycators.apptio-docs-finder', 'Failed to clear history: ' + String(err));
      });
    } else {
      // Plugin not loaded yet — clear directly from storage
      chrome.storage.local.remove([
        'rc:plugin:com.replycators.apptio-docs-finder:recent-searches',
        'rc:plugin:com.replycators.apptio-docs-finder:recently-opened',
        'rc:plugin:com.replycators.apptio-docs-finder:favorites',
      ], function() {
        addNotification('Apptio Docs Finder', 'Search and opened history cleared.', 'success', 'com.replycators.apptio-docs-finder');
        addLog('info', 'com.replycators.apptio-docs-finder', 'Search and opened history cleared directly from Settings panel');
      });
    }
  });

}

/**
 * Apply notification container position.
 * The CSS class on .rc-toast-container determines where toasts appear.
 */
function applyNotifPosition(position) {
  const container = document.getElementById('rc-toast-container');
  if (!container) return;
  container.className = 'rc-toast-container rc-toast-container--' + (position || 'bottom-right');
}

/**
 * Sync all settings controls in the Settings view to the current appSettings values.
 * Called once after the Settings view first becomes visible (or on DOMContentLoaded).
 */
function syncSettingsUI() {
  const setVal  = (id, val) => { const el = document.getElementById(id); if (el) el.value   = String(val); };
  const setChk  = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

  setVal('settings-theme',           appSettings.theme);
  setVal('settings-font',            appSettings.font);
  setVal('settings-density',         appSettings.density);
  setChk('settings-larger-font',     appSettings.largerFont);
  setChk('settings-reduced-animations', appSettings.reducedAnimations);
  setChk('settings-high-contrast',   appSettings.highContrast);
  setChk('settings-enhanced-focus',  appSettings.enhancedFocus);

  setChk('settings-notif-enabled',   appSettings.notifEnabled);
  setChk('settings-notif-success',   appSettings.notifSuccess);
  setChk('settings-notif-warning',   appSettings.notifWarning);
  setChk('settings-notif-error',     appSettings.notifError);
  setChk('settings-notif-info',      appSettings.notifInfo);
  setVal('settings-notif-duration',  appSettings.notifDuration);
  setVal('settings-notif-position',  appSettings.notifPosition);

  setChk('settings-dash-show-cards',    appSettings.dashShowCards);
  setChk('settings-dash-compact',       appSettings.dashCompact);
  setChk('settings-dash-remember-last', appSettings.dashRememberLast);

  setVal('settings-log-level',             appSettings.logLevel);
  setVal('settings-default-launch-mode',   appSettings.defaultLaunchMode);
  setVal('settings-popup-size',            appSettings.popupSize);
  setVal('settings-popup-custom-width',    appSettings.popupCustomWidth);
  setVal('settings-popup-custom-height',   appSettings.popupCustomHeight);
  setVal('settings-snake-speed',           appSettings.snakeSpeed);
  setChk('ws-setting-tab-groups',          appSettings.wsDefaultTabGroups !== false);
  // Show/hide custom size row immediately when the settings panel opens.
  applyPopupSize();

  // v1.40.0: Restore SF Bob working directory into the editable text input.
  // When a previously-saved directory is restored, show a neutral ✓ "saved" indicator
  // so users can see at a glance that the field has a value (without re-validating
  // the path on every popup open — that would add a server round-trip at startup).
  const _savedBobDir = typeof _restoredSfSettings?.bobWorkingDir === 'string'
    ? _restoredSfSettings.bobWorkingDir.trim() : '';
  if (_savedBobDir) {
    const inputEl = document.getElementById('sf-bob-working-dir-input');
    if (inputEl) inputEl.value = _savedBobDir;
    // Ensure the SF plugin module has the correct value after DOM is ready.
    window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onWorkingDirChanged?.(_savedBobDir);
    // Show a neutral saved indicator — validates style without a server round-trip.
    _setDirStatus('\u2713 Saved: ' + _savedBobDir.replace(/.*[/\\]/, '') || _savedBobDir, 'ok');
  }

  // v1.45.0: Restore BobShell 2.0 API key and Bob 1.0 mode toggle.
  // The key is restored into the module-level _committedBobApiKey variable so
  // persistSfSettings() reads the correct value on the next save.  The DOM input
  // shows a masked placeholder when a key is present — the actual value is loaded
  // into the input field so it can be edited and re-saved if needed.
  const _savedBobApiKey = typeof _restoredSfSettings?.bobApiKey === 'string'
    ? _restoredSfSettings.bobApiKey : '';
  _committedBobApiKey = _savedBobApiKey;
  const _savedBobUseBob1 = _restoredSfSettings?.bobUseBob1 === true;
  const _keyInputEl  = document.getElementById('sf-bob-api-key-input');
  const _keyBtnEl    = document.getElementById('sf-bob-api-key-save');
  const _keyShowEl   = document.getElementById('sf-bob-api-key-show');
  const _useBob1El   = document.getElementById('sf-bob-use-bob1');
  if (_useBob1El) _useBob1El.checked = _savedBobUseBob1;
  if (_keyInputEl) {
    _keyInputEl.value    = _savedBobApiKey;
    _keyInputEl.disabled = _savedBobUseBob1;
  }
  if (_keyBtnEl)  _keyBtnEl.disabled  = _savedBobUseBob1;
  if (_keyShowEl) _keyShowEl.disabled = _savedBobUseBob1;
  if (_savedBobUseBob1) {
    _setApiKeyStatus('API key not required (Bob 1.0 mode)', '');
  } else if (_savedBobApiKey) {
    // ZERO-LOGGING POLICY: show presence indicator only.
    _setApiKeyStatus('\u2713 API key saved: [set]', 'ok');
  }
  // Notify plugin so Execute-button gating is correct from the start.
  window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onApiKeyChanged?.(_committedBobApiKey);
  window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.onBobVersionModeChanged?.(_savedBobUseBob1);

  // Restore Diagnostic Mode toggle into the Settings UI checkbox.
  // The plugin's _sfDiagnosticMode variable is seeded from this same
  // restoredSettings object inside the plugin's own init() call.
  const diagModeSettingEl = document.getElementById('sf-diagnostic-mode');
  if (diagModeSettingEl && typeof _restoredSfSettings?.diagnosticMode === 'boolean') {
    diagModeSettingEl.checked = _restoredSfSettings.diagnosticMode;
  }

  // v1.45.1: Restore Sort Posts preference.
  const postSortSettingEl = document.getElementById('sf-post-sort');
  if (postSortSettingEl && typeof _restoredSfSettings?.postSort === 'string') {
    postSortSettingEl.value = _restoredSfSettings.postSort;
  }

  // Apptio Documentation Finder — restore toggles.
  // F-13: _adfSettingsCache is pre-seeded synchronously from the startup batch
  // in restoreSession() so wireAdfToggle() writes are safe immediately with no
  // async race window.  Apply the already-seeded values to the checkboxes now.
  // Keep the async read as a safety net for the rare case where restoreSession
  // found no stored value (first-ever open or corrupted storage).
  const _applyAdfToggles = () => {
    const setChkById = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    setChkById('adf-settings-save-search-history', _adfSettingsCache.saveSearchHistory !== false);
    setChkById('adf-settings-save-open-history',   _adfSettingsCache.saveOpenHistory   !== false);
  };
  // The cache already contains startup-batch data if storage had a value.
  // Apply synchronously to avoid any flicker or race on first toggle interaction.
  _applyAdfToggles();
  // Safety-net async read: only re-reads if the cache still holds pure defaults
  // (meaning restoreSession found nothing — new install or cleared storage).
  const _adfIsDefault = _adfSettingsCache.saveSearchHistory === true &&
                        _adfSettingsCache.saveOpenHistory   === true &&
                        _adfSettingsCache.openInNewTab      === true;
  if (_adfIsDefault) {
    chrome.storage.local.get([RC_STORE.ADF_SETTINGS], function(stored) {
      const adfCfg = stored[RC_STORE.ADF_SETTINGS];
      if (adfCfg && typeof adfCfg === 'object') {
        _adfSettingsCache = Object.assign({ openInNewTab: true, saveSearchHistory: true, saveOpenHistory: true }, adfCfg);
        _applyAdfToggles();
      }
    });
  }

  // TD-004: refresh availability badge whenever settings panel opens.
  updateFontAvailabilityBadge(appSettings.font);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(text) {
  return String(text).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}
function setStatus(el, message, type) {
  el.textContent   = message;
  // Preserve any additional classes on the element (e.g. sf-banner-inline)
  const extra = Array.from(el.classList).filter(c => !c.startsWith('rc-status'));
  el.className = 'rc-status rc-status--' + type + (extra.length ? ' ' + extra.join(' ') : '');
  if (message) {
    el.hidden        = false;
    el.style.display = '';
  } else {
    el.hidden        = true;
    el.style.display = '';
  }
}

// ─── Sidebar Resize ──────────────────────────────────────────────────────────

/**
 * Initialise the sidebar drag-resize handle.
 * Only active in Side Panel mode — in action-popup mode the handle is hidden by CSS.
 *
 * Save-flush strategy:
 *   The side panel is a separate browser document. When the user drags and the
 *   mouse exits the panel frame into the main browser content area, the side
 *   panel's document never receives mouseup — the release fires in the tab's
 *   document instead. Without a flush path, dragging = true forever and the
 *   save never executes.
 *
 *   We flush (commit the current width and end the drag) on:
 *     1. document mouseup  — normal release inside the panel frame
 *     2. document mouseleave — mouse left the panel frame during drag
 *     3. window blur        — panel lost focus (covers keyboard dismiss / tab switch)
 */
function initSidebarResize() {
  const handle  = document.getElementById('rc-sidebar-resize-handle');
  const sidebar = document.getElementById('rc-sidebar');
  if (!handle || !sidebar) return;

  // F-10: the resize handle is only functional in Side Panel mode.
  // In popup mode the handle is hidden by CSS, so registering document-level
  // mouseup / mouseleave / window.blur listeners that fire on every event is
  // unnecessary overhead. Register them only when this is actually a side panel.
  // Use _startupIsSidePanel — the most reliable signal (evaluated at parse time
  // before any JS-driven CSS resize has occurred).
  if (!_startupIsSidePanel) return;

  let dragging = false;
  let startX   = 0;
  let startW   = 0;

  /** Commit the current width to storage and reset drag state. */
  function commitDrag() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('rc-sidebar-resize-handle--dragging');
    sidebar.classList.remove('rc-sidebar--resizing');   // restore CSS transition
    document.body.style.userSelect = '';
    document.body.style.cursor     = '';

    // Read back the current rendered width (clamped value already applied by
    // mousemove, or fall back to getBoundingClientRect if no move occurred).
    const finalW = sidebar.style.getPropertyValue('--sidebar-width').trim() ||
                   sidebar.getBoundingClientRect().width + 'px';
    chrome.storage.local.set({ [RC_STORE.SIDEBAR_WIDTH]: finalW });
    addLog('debug', 'platform', 'Sidebar width saved: ' + finalW);
  }

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX;
    startW = sidebar.getBoundingClientRect().width;
    handle.classList.add('rc-sidebar-resize-handle--dragging');
    sidebar.classList.add('rc-sidebar--resizing');      // disables CSS transition for smooth drag
    document.body.style.userSelect = 'none';    // prevent text selection while dragging
    document.body.style.cursor     = 'ew-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    const newW  = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startW + delta));
    // Set directly on the sidebar element so it overrides any class-level
    // --sidebar-width value (e.g. from .rc-sidebar--expanded).
    sidebar.style.setProperty('--sidebar-width', newW + 'px');
  });

  // Normal release inside the panel frame.
  document.addEventListener('mouseup', commitDrag);

  // Mouse exited the side panel frame while dragging (e.g. moved into the main
  // browser content area). The matching mouseup fires in the tab document, not
  // here — without this listener the drag would never commit.
  document.addEventListener('mouseleave', commitDrag);

  // Panel lost focus (tab switch, keyboard dismiss, click outside panel).
  window.addEventListener('blur', commitDrag);
}

/**
 * Apply the sidebar width that was batch-read during restoreSession().
 * Only applies in Side Panel mode — called after detectAndApplySidePanelMode().
 *
 * The value is already validated and range-checked inside restoreSession(), so
 * this function is a straightforward synchronous DOM write — no extra storage
 * round-trip is required.
 */
function restoreSidebarWidth() {
  // Use _startupIsSidePanel in addition to the class check — the class may not
  // have been applied yet if this is called early, but _startupIsSidePanel is
  // evaluated at parse time and is always reliable.
  if (!_startupIsSidePanel && !document.body.classList.contains('rc-sidepanel')) return;
  if (!_restoredSidebarWidth) return;

  const sidebar = document.getElementById('rc-sidebar');
  if (sidebar) {
    sidebar.style.setProperty('--sidebar-width', _restoredSidebarWidth);
    // Restoring a user-set width means the sidebar should be expanded
    sidebar.classList.add('rc-sidebar--expanded');
  }
  addLog('debug', 'platform', 'Sidebar width restored: ' + _restoredSidebarWidth);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
//
// Boot sequence (v1.20.1 — lazy-init performance pass):
//
//   1. restoreSession() — reads all persisted state from chrome.storage.local
//      into in-memory stores (logStore, notifStore, pluginStates,
//      _restoredSfResult, _restoredNavView, _restoredSfSettings, etc.).
//   2. applyAllSettings() — applies saved theme/font/density/accessibility to DOM.
//   3. renderPluginGrid() — first render using restored pluginStates.
//   4. applyPluginVisibility() — sidebar + widget show/hide; creates nav buttons.
//      ↳ calls updateStats() synchronously (local counts only);
//        RC_GET_REGISTRY background round-trip deferred via setTimeout(0).
//   5. applyDashboardOrder() — reorders dashboard widgets + nav buttons.
//   6. Plugin modules init — each plugin's init() binds UI controls only.
//      No async I/O (tab scans, chrome.storage reads) runs at init() time.
//      Heavy work is deferred to onNavigate() / render() for each plugin.
//   7. initSettings() / syncSettingsUI() + initActivityView() — view wiring.
//   8. updateNotifBadge() — restores unread count from restored notifications.
//   9. navigateTo(lastView) — restores last active view; triggers plugin
//      onNavigate() if the restored view is a plugin view (lazy tab scan, etc.)
//  10. Startup log entry added AFTER restore so it appears in sequence.
//  11. (deferred) RC_GET_REGISTRY background message + AUC migration check.

/** Staging variables — set by restoreSession(), consumed by plugin module init. */
let _restoredSfResult               = null;   // { rawText, caseNumber, accountName, posts, extractedAt }
let _restoredNavView                = null;   // string e.g. 'plugin-salesforce'
let _restoredSfSettings             = null;   // { outputFormat, postSort, autoFill, source, bobWorkingDir, bobApiKey, bobUseBob1, ... }
// v4.0/4.1 SF additions
let _restoredSfLastDownload         = null;   // { downloadId, filename, state, ... }
let _restoredSfSelectedPrompt       = null;   // prompt id string
let _restoredSfContextFile          = null;   // file path string
let _restoredSfAdditionalInstructions = null; // additional instructions text
let _restoredSidebarWidth           = null;   // CSS string e.g. '220px' — sidebar drag width (side panel only)
// F-15: loaded in the restoreSession() batch — avoids a separate storage read at boot.
let _restoredPreflightEverRan       = false;  // boolean — true if preflight checks have run at least once

// ─── Shared Platform Services (window.ReplyCatorsApp) ─────────────────────────
//
// All plugin modules access platform services exclusively through this interface.
// No plugin may call dashboard.js functions directly — all communication goes
// through window.ReplyCatorsApp or chrome extension APIs.
window.ReplyCatorsApp = {
  // Logging
  addLog,
  // Notifications
  addNotification,
  showToast,
  // Navigation
  navigateTo,
  // Persistence
  persistSfResult,
  persistSfSettings,
  persistAppSettings,
  // Settings access
  getSetting: (key) => appSettings[key],
  getAppSettings: () => appSettings,
  // Plugin state access.
  // pluginStates getter returns the live internal object for backward-compat
  // with existing module code (app().pluginStates[id].enabled read pattern).
  // Plugins must treat this as read-only — writes bypass persistPluginStates()
  // and will not be persisted. (F-010)
  get pluginStates() { return pluginStates; },
  // getPluginStates() returns a shallow copy — prevents external slot assignment
  // while remaining safe for the read-only [id].enabled access pattern.
  getPluginStates: () => Object.assign({}, pluginStates),
  // Marketplace data
  getMarketplacePlugins: () => MARKETPLACE_PLUGINS,
  // Utilities
  esc,
  setStatus,
  setEl,
  // Storage key registry (for plugin modules)
  RC_STORE,
  CACHE_REGISTRY,
  loadCacheInspector,
  // Documentation navigation
  navigateToPluginDoc,
  PLUGIN_DOC_MAP,
};

// NOTE: navigation is available to plugins exclusively through window.ReplyCatorsApp.navigateTo.
// The window.navigateTo alias was removed to enforce the architecture boundary.
document.addEventListener('DOMContentLoaded', () => {
  // ── Step 1: restore all persisted state, then render ───────────────────────
  restoreSession().then(() => {

    // ── Step 2: apply all persisted settings to the DOM ───────────────────
    //   Must happen before any render so the correct theme/font/density/
    //   accessibility values are in place from the first paint.
    applyAllSettings();
    applyNotifPosition(appSettings.notifPosition);


    // ── Step 2b: render all semantic icons from the icon registry ────────
    // Each element with data-icon="category.id" will have its content
    // populated with the corresponding Unicode character from the registry.
    renderSemanticIcons();

    // ── Step 3: init UI subsystems ────────────────────────────────────────
    initTheme();
    renderPluginGrid();
    // Marketplace is rendered by the Marketplace plugin module

    // Apply plugin visibility AFTER renderPluginGrid so the plugin cards
    // exist before we try to hide/show sidebar nav buttons and widgets.
    // This call also CREATES the left nav buttons (first call after page load).
    applyPluginVisibility();

    // ── Step 3a: apply persisted plugin order across ALL surfaces ─────────
    //   MUST be called AFTER applyPluginVisibility() so that the left nav
    //   buttons already exist when applyDashboardOrder() re-orders them.
    //   applyDashboardOrder() is the single function that enforces
    //   rc:session:dashboard-order on both dashboard widgets AND left nav.
    //   Without this call the left nav always renders in PLUGINS[] declaration
    //   order and widgets render in HTML source order — both ignoring the
    //   user's saved order from Plugin Manager.
    applyDashboardOrder();

    // ── Step 3b: initialise all plugin modules ────────────────────────────
    // Each plugin module exposes its public API via window.ReplyCatorsPlugins.
    // init() is called once here; plugin modules handle their own state.
    // Heavy async I/O (tab scans, storage reads) is deferred inside each
    // plugin's init() to avoid blocking the initial render.
    //
    // DIAG-001 fix: each init() is wrapped in an individual try/catch so that
    // one failing plugin cannot halt the entire boot sequence. A thrown error
    // inside init() previously caused JavaScript execution to stop, skipping all
    // subsequent inits, initSettings(), and navigateTo(lastView).
    // With this fix, each plugin is isolated: an error is logged and the next
    // plugin continues to initialise normally.
    function _safeInit(name, fn) {
      try { fn(); } catch (e) {
        addLog('error', 'platform', 'Plugin init failed [' + name + ']: ' + (e?.message || String(e)));
      }
    }

    _safeInit('SalesforceCaseExtractor', () =>
      window.ReplyCatorsPlugins?.SalesforceCaseExtractor?.init?.(
        _restoredSfResult,
        _restoredSfSettings,
        {
          lastDownload:           _restoredSfLastDownload,
          selectedPrompt:         _restoredSfSelectedPrompt,
          contextFile:            _restoredSfContextFile,
          additionalInstructions: _restoredSfAdditionalInstructions,
        }
      )
    );
    _safeInit('CloudabilityOrgId',         () => window.ReplyCatorsPlugins?.CloudabilityOrgId?.init?.());
    _safeInit('ExamplePlugin',             () => window.ReplyCatorsPlugins?.ExamplePlugin?.init?.());
    _safeInit('EdgeBookmarkFinder',        () => window.ReplyCatorsPlugins?.EdgeBookmarkFinder?.init?.());
    _safeInit('ApptioUpgradeCalculator',   () => window.ReplyCatorsPlugins?.ApptioUpgradeCalculator?.init?.());
    _safeInit('Snake',                     () => window.ReplyCatorsPlugins?.Snake?.init?.(appSettings.snakeSpeed || 'classic'));
    _safeInit('WorkspaceStarter',          () => window.ReplyCatorsPlugins?.WorkspaceStarter?.init?.(currentView));
    _safeInit('TabSearch',                 () => window.ReplyCatorsPlugins?.TabSearch?.init?.());
    _safeInit('ApptioDocsFinder',          () => window.ReplyCatorsPlugins?.ApptioDocsFinder?.init?.());
    _safeInit('EnvDashboards',             () => window.ReplyCatorsPlugins?.EnvDashboards?.init?.());
    _safeInit('BackupRestore',             () => window.ReplyCatorsPlugins?.BackupRestore?.init?.());
    _safeInit('Marketplace',               () => window.ReplyCatorsPlugins?.Marketplace?.render?.());

    initSettings();
    syncSettingsUI();      // populate all settings controls with current values
    initActivityView();

    // ── Step 6: restore unread notification badge ──────────────────────────
    updateNotifBadge();

    // ── Step 7: (removed) SF detection deferred to first navigation ──────
    // sfRefreshDetectionBanner was called here unconditionally on every startup,
    // triggering chrome.windows.getAll() + tabs.sendMessage() before the user
    // even opens the Salesforce plugin. Detection is now lazy: it fires only
    // when the user navigates to plugin-salesforce (via navigateTo → onNavigate).

    // ── Step 8: startup log entry (after restore so ordering is correct) ───
    const mfVersion = chrome.runtime.getManifest().version;
    addLog('info', 'platform', 'ReplyCators v' + mfVersion + ' started — session restored');
    addLog('info', 'platform', PLUGINS.length + ' plugin(s) registered: ' + PLUGINS.map(p => p.name).join(', '));

    // ── Step 8b: Diagnostics startup logic ────────────────────────────────────
    //
    // Strategy:
    //   A. Restore persisted results immediately so the Diagnostics panel always
    //      shows the last-known state (never the blank "Ready" placeholder) when
    //      the user opens the popup or side panel.
    //
    //   B. Run checks automatically exactly once — on the extension's very first
    //      startup ever.  The flag is stored in chrome.storage.local so it
    //      survives browser restarts, extension reloads, and updates.
    //      - If the flag is absent → first-ever startup → set flag, run checks.
    //      - If the flag is present → already ran once historically → skip.
    //
    // Manual runs (Run Checks button, Retry buttons) are always available and
    // replace stored results on completion.
    restorePreflightResults();   // A: always restore — fast, non-blocking

    // B: Auto-run checks exactly once — on the extension's very first startup.
    // F-15: _restoredPreflightEverRan was loaded during the restoreSession() batch,
    // eliminating the separate chrome.storage.local.get call that existed here.
    // F-03: use RC_STORE.PREFLIGHT_EVER_RAN directly — _PREFLIGHT_EVER_RAN_KEY removed.
    if (!_restoredPreflightEverRan) {
      chrome.storage.local.set({ [RC_STORE.PREFLIGHT_EVER_RAN]: true });
      addLog('info', 'platform', 'First-ever startup — running Diagnostics checks automatically');
      loadPreflightChecks();
    }
    // else: not the first startup; cached results already restored above

    // ── Step 9: version badge ──────────────────────────────────────────────
    setEl('rc-platform-version', 'v' + mfVersion);

    // ── Step 10: sidebar toggle ────────────────────────────────────────────
    document.getElementById('rc-sidebar-toggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('rc-sidebar');
      sidebar.classList.toggle('rc-sidebar--expanded');
      // RC-UX001: dismiss the first-open hint once user interacts with toggle
      sidebar.classList.remove('rc-sidebar--hint');
    });

    // ── Step 10a: plugins section collapse toggle ─────────────────────────
    // Bind the #rc-plugins-section-toggle button.  On click, flip the flag,
    // persist, and re-apply the DOM state immediately.
    document.getElementById('rc-plugins-section-toggle')?.addEventListener('click', () => {
      pluginsSectionCollapsed = !pluginsSectionCollapsed;
      persistPluginsSectionCollapsed();
      applyPluginsSectionState();
      addLog('info', 'platform',
        'Plugins sidebar section ' + (pluginsSectionCollapsed ? 'collapsed' : 'expanded'));
    });

    // Apply initial collapsed state now that the button and container exist.
    applyPluginsSectionState();

    // RC-UX001: In Popup mode, briefly pulse the sidebar brand area so
    // first-time users discover the ☰ expand control. Auto-removes after 3s.
    // _isConfiguredPopup covers non-800 popup sizes where innerWidth may differ.
    if (_isConfiguredPopup || window.innerWidth === RC_POPUP_WIDTH) {
      const sidebar = document.getElementById('rc-sidebar');
      if (sidebar) {
        sidebar.classList.add('rc-sidebar--hint');
        setTimeout(function() {
          if (sidebar) sidebar.classList.remove('rc-sidebar--hint');
        }, 3000);
      }
    }

    // ── Step 10b: sidebar search — filter visible plugin nav items ─────────
    // BUG-D fix: #rc-search had no event handler. Wire it to filter the plugin
    // nav buttons in real time by name (case-insensitive substring match).
    document.getElementById('rc-search')?.addEventListener('input', function() {
      const q = this.value.trim().toLowerCase();
      document.querySelectorAll('#rc-plugin-nav-items [data-view]').forEach(btn => {
        const label = btn.querySelector('.rc-nav__label')?.textContent?.toLowerCase() || '';
        // Always respect plugin-disabled state (already enforced by applyPluginVisibility)
        const pluginId = btn.dataset.view;
        const plugin   = PLUGINS.find(p => p.viewId === pluginId);
        const isEnabled = !plugin || pluginStates[plugin.id]?.enabled !== false;
        if (!isEnabled) return;  // hidden by plugin state — don't touch
        btn.style.display = (!q || label.includes(q)) ? '' : 'none';
      });
      // If the query is cleared, re-apply full plugin visibility
      if (!q) applyPluginVisibility();
    });

    // ── Step 10c: Plugin Manager filter bar — RC-UX005 ───────────────────
    document.getElementById('rc-pm-search')?.addEventListener('input', function() {
      pmFilterText = this.value.trim();
      renderPluginGrid();
    });
    document.getElementById('rc-pm-status-filter')?.addEventListener('change', function() {
      pmFilterStatus = this.value;
      renderPluginGrid();
    });
    document.getElementById('rc-pm-category-filter')?.addEventListener('change', function() {
      pmFilterCategory = this.value;
      renderPluginGrid();
    });

    // ── Step 11: nav item clicks — hard-coded platform nav buttons only ───
    // Plugin nav buttons already have listeners from applyPluginVisibility().
    // We must NOT re-add listeners to all [data-view] elements here — that
    // would double-up every nav handler causing two navigateTo() calls per click.
    // Only bind the static platform-level nav buttons that are hardcoded in HTML
    // and not managed by applyPluginVisibility().
    document.querySelectorAll('.rc-nav > .rc-nav__item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });

    // ── Step 11b: dashboard widget "Open Full View" and action-card buttons ──
    // These buttons carry data-view but are NOT plugin nav buttons — they are
    // static widget-card expand icons (↗) and quick-action cards hardcoded in
    // dashboard.html.  applyPluginVisibility() does not touch them, so they need
    // their own delegated listener.  Event delegation on the document handles
    // widget cards that may be reordered without needing re-binding.
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.rc-widget-card__open[data-view], .rc-action-card[data-view]');
      if (!btn) return;
      navigateTo(btn.dataset.view);
    });

    // ── Step 11c: plugin documentation buttons ────────────────────────────
    // All "Docs" buttons — in widget cards (.rc-widget-docs-btn) and panel
    // headers (.rc-panel-docs-btn) — carry data-doc-view and use a single
    // delegated handler.  navigateToPluginDoc() resolves the topic via
    // PLUGIN_DOC_MAP and opens the centralized Documentation view directly
    // at the correct topic.
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-doc-view]');
      if (!btn) return;
      navigateToPluginDoc(btn.dataset.docView);
    });

    // ── Step 12: topbar refresh button ────────────────────────────────────
    document.getElementById('rc-refresh-btn')?.addEventListener('click', () => {
      renderPluginGrid();
      applyPluginVisibility();
      addLog('info', 'platform', 'Dashboard refreshed');
      showToast('Dashboard refreshed', 'info');
    });

    // ── Step 12b: "Open in Side Panel" topbar button ──────────────────────
    document.getElementById('rc-sidepanel-btn')?.addEventListener('click', () => {
      openInSidePanel();
    });

    // ── Step 12c: "Return to Popup" topbar button (RC-UX012) ──────────────
    // Visible only in Side Panel context (CSS hides it in popup mode).
    // Calls openInPopup() which asks the background worker to open the
    // popup via chrome.action.openPopup().
    document.getElementById('rc-popup-btn')?.addEventListener('click', () => {
      openInPopup();
    });

    // ── Step 13: notification indicator ──────────────────────────────────
    document.getElementById('rc-notif-indicator')?.addEventListener('click', () => navigateTo('notifications'));

    // ── Step 13b: notification view — Clear All and Mark All Read ─────────
    // RC-UI008 fix: add actionable controls to the Notifications view so
    // users do not need to navigate to Activity Log to clear the history.
    document.getElementById('rc-notif-clear-all')?.addEventListener('click', () => {
      notifStore.length = 0;
      chrome.storage.local.remove(RC_STORE.NOTIFS);
      updateNotifBadge();
      renderNotifications();
      addLog('info', 'platform', 'Notifications cleared by user');
      showToast('All notifications cleared', 'info');
    });
    document.getElementById('rc-notif-mark-read')?.addEventListener('click', () => {
      markAllRead();
      renderNotifications();
      addLog('info', 'platform', 'All notifications marked as read');
    });

    // ── Step 14: diagnostics refresh + pre-flight Run All + Maintenance Center tabs ──
    document.getElementById('rc-diag-refresh')?.addEventListener('click', loadDiagnostics);
    document.getElementById('rc-center-tab-notifications')?.addEventListener('click', () => setOperationsTab('notifications'));
    document.getElementById('rc-center-tab-activity')?.addEventListener('click', () => setOperationsTab('activity'));
    document.getElementById('rc-maint-tab-diagnostics')?.addEventListener('click', () => setMaintenanceTab('diagnostics'));
    document.getElementById('rc-maint-tab-backup')?.addEventListener('click', () => setMaintenanceTab('backup'));
    initFeedbackForm();
    document.getElementById('rc-preflight-run-all')?.addEventListener('click', () => {
      // Reset running flag so a manual Run All always triggers a fresh run
      _preflightRunning = false;
      loadPreflightChecks();
    });

    // ── Step 15: restore last active view ─────────────────────────────────
    //   Navigate to the saved view if it exists, otherwise stay on 'dashboard'.
    //   Skip diagnostics on restore (it always reloads fresh anyway).
    //   Also skip if the saved view belongs to a currently disabled plugin —
    //   navigateTo() already handles that redirect, but we want to log it.
    const viewToRestore = (_restoredNavView && _restoredNavView !== 'diagnostics' &&
                           _restoredNavView !== 'backup-restore' &&
                           appSettings.dashRememberLast)
      ? _restoredNavView
      : 'dashboard';
    navigateTo(viewToRestore);

    // ── Step 16: detect side panel context and apply fluid layout ─────────
    detectAndApplySidePanelMode();

    // ── Step 16c: init sidebar resize handle + restore saved width ────────
    initSidebarResize();
    restoreSidebarWidth();

    // ── Step 16b: clean up stale launch-mode key written by v1.8.0 ────────
    // v1.8.0 wrote 'rc:ui:launch-mode' = 'sidepanel' on every panel open.
    // Detection is now geometry-only so this key is never read again.
    // Remove it silently to keep storage clean.
    chrome.storage.local.remove('rc:ui:launch-mode');
  });
});

// ─── Side Panel ───────────────────────────────────────────────────────────────

/**
 * Detect whether this page is running as a side panel (vs. popup).
 *
 * Detection is geometry-only — no persistent storage flag is used.
 *
 * Why geometry-only?
 *   The popup is hard-constrained to 800 px wide by dashboard.css. The side
 *   panel frame is always wider than that (Edge minimum panel width is ~300 px
 *   but in practice sits in a resizable pane ≥ 300 px alongside the browser
 *   chrome, so window.innerWidth will always exceed 800 px when in a panel).
 *   Persisting a 'sidepanel' flag and reading it back in the popup caused the
 *   button to be hidden on every subsequent popup open after first side panel
 *   use — even after the side panel was closed.
 *
 * We apply body.rc-sidepanel to enable fluid CSS only when we can be certain
 * from geometry that this instance is running inside the panel frame.
 */
// F-03: track whether the resize listener has been registered so it is added
// at most once, even if detectAndApplySidePanelMode() is called multiple times.
let _sidePanelResizeListenerAdded = false;

function detectAndApplySidePanelMode() {
  // Two contexts this page runs in:
  //   1. Action popup — window.innerWidth matches configured popup width (default 800)
  //   2. Side panel   — window.innerWidth varies; panel frame is never a fixed popup size
  //
  // Only context 2 gets the rc-sidepanel class and fluid layout.
  //
  // IMPORTANT: when the user has configured a non-default popup size (e.g. Large = 960px),
  // _isConfiguredPopup is set by applyPopupSize(). In that case we definitively know
  // this is a popup — skip the geometry check entirely.  Without this guard, a 960px
  // popup whose actual window.innerWidth is capped by the browser below RC_POPUP_WIDTH
  // would satisfy (innerWidth != RC_POPUP_WIDTH) and be falsely classified as side-panel,
  // causing body.rc-sidepanel to be applied and breaking the popup layout.
  if (_isConfiguredPopup) {
    addLog('debug', 'platform', 'Popup mode (configured size, width=' + window.innerWidth + ')');
    return;   // definitively a popup — do not apply side-panel overrides
  }

  const isSidePanel = window.innerWidth !== RC_POPUP_WIDTH;

  if (isSidePanel) {
    document.body.classList.add('rc-sidepanel');
    addLog('debug', 'platform', 'Side panel mode (width=' + window.innerWidth + ')');

    const sidebar = document.getElementById('rc-sidebar');
    if (sidebar && !sidebar.classList.contains('rc-sidebar--expanded')) {
      sidebar.classList.add('rc-sidebar--expanded');
    }

    // F-03: register the resize listener exactly once per document lifetime.
    if (!_sidePanelResizeListenerAdded) {
      _sidePanelResizeListenerAdded = true;
      window.addEventListener('resize', () => {
        if (!document.body.classList.contains('rc-sidepanel')) {
          document.body.classList.add('rc-sidepanel');
        }
      }, { passive: true });
    }
  }
}

/**
 * Open the native extension popup anchored to the toolbar icon —
 * identical to the user clicking the ReplyCators icon in the Edge toolbar.
 *
 * Passes the active tabId so the background can close the side panel for
 * this tab before opening the popup (avoids "Failed to open popup" error
 * when both are visible simultaneously).
 */
function openInPopup() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabId = tabs[0]?.id ?? null;
    chrome.runtime.sendMessage({ type: 'RC_OPEN_POPUP', payload: { tabId } }, response => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message;
        showToast('Could not open popup: ' + msg, 'error', 'Open as Popup', true);
        addLog('error', 'platform', 'openInPopup error: ' + msg);
        return;
      }
      if (!response?.ok) {
        const msg = response?.error || 'Unknown error';
        showToast('Could not open popup: ' + msg, 'error', 'Open as Popup', true);
        addLog('error', 'platform', 'openInPopup failed: ' + msg);
        return;
      }
      addLog('info', 'platform', 'Native toolbar popup opened');
    });
  });
}

/**
 * Open ReplyCators in the browser side panel.
 * Opens the side panel, switches the toolbar icon back to side-panel mode
 * (setPopup('')), and closes this window if it is a popup.
 */
function openInSidePanel() {
  if (!chrome.sidePanel || !chrome.sidePanel.open) {
    showToast('Side Panel is not supported in this browser.', 'warning', 'Side Panel');
    addLog('warn', 'platform', 'chrome.sidePanel.open not available');
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const windowId = tabs[0]?.windowId;
    chrome.sidePanel.open({ windowId }, () => {
      if (chrome.runtime.lastError) {
        showToast('Could not open Side Panel: ' + chrome.runtime.lastError.message, 'error', 'Side Panel');
        addLog('error', 'platform', 'sidePanel.open error: ' + chrome.runtime.lastError.message);
        return;
      }
      // Restore side-panel toolbar mode so subsequent icon clicks open the panel.
      chrome.runtime.sendMessage({ type: 'RC_SET_LAUNCH_MODE', payload: { mode: 'sidepanel' } });
      addLog('info', 'platform', 'Side panel opened — closing popup');
      // Close this window. Works when running as a popup; no-op in the side panel.
      window.close();
    });
  });
}
