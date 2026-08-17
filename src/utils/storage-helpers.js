/**
 * ReplyCators — Storage Helpers
 * TD-004 / RC-015 (Phase 1): Extracted storage key constants and helper logic
 *
 * Centralises all chrome.storage.local key constants in one place.
 * During the flat-deployment era these are duplicated inline in dashboard.js,
 * but extracting them here makes the canonical list auditable and testable.
 *
 * STATUS: Reference module.
 * Root dashboard.js still uses inline RC_STORE and per-plugin key constants.
 * Phase 2 will consume these as a proper module import.
 *
 * IMPORTANT: Storage keys are permanent once in production.
 * Renaming a key requires a MAJOR version bump and a data migration.
 * @see AGENTS.md §9 Storage Architecture
 */

'use strict';

// ── Platform session keys ─────────────────────────────────────────────────────

const RC_STORE = Object.freeze({
  LOGS:          'rc:session:logs',
  NOTIFS:        'rc:session:notifications',
  SF_RESULT:     'rc:session:sf-last-result',
  NAV_VIEW:      'rc:session:nav-view',
  SF_SETTINGS:   'rc:session:sf-settings',
  PLUGIN_STATES: 'rc:session:plugin-states',
  APP_SETTINGS:  'rc:session:app-settings',
  DASH_ORDER:    'rc:session:dashboard-order',
});

// ── Per-plugin keys ───────────────────────────────────────────────────────────

const PLUGIN_KEYS = Object.freeze({
  CLOUDABILITY_ORGID_CACHE: 'rc:plugin:com.replycators.cloudability-orgid:orgid-cache',

  EDGE_BOOKMARK_PREFS:      'rc:plugin:com.replycators.edge-bookmark-finder:prefs',
  EDGE_BOOKMARK_LAST_SCAN:  'rc:plugin:com.replycators.edge-bookmark-finder:last-scan',

  AUC_SCHEDULE_CACHE:       'rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache',
  AUC_LAST_CALC:            'rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc',

  WS_PROFILES:              'rc:plugin:com.replycators.workspace-starter:profiles',
  WS_LAST_LAUNCHED:         'rc:plugin:com.replycators.workspace-starter:last-launched',
  WS_RECENTS:               'rc:plugin:com.replycators.workspace-starter:recents',

  SNAKE_STATE:              'rc:plugin:com.replycators.snake:state',
});

/**
 * Returns all RC_STORE keys as an array — used by restoreSession() to batch-read storage.
 * @returns {string[]}
 */
function getAllSessionKeys() {
  return Object.values(RC_STORE);
}

/**
 * Validates that a storage key matches the required rc: prefix convention.
 * @param {string} key
 * @returns {boolean}
 */
function isValidStorageKey(key) {
  return typeof key === 'string' && /^rc:(session|platform|plugin|settings):/.test(key);
}

// ── Export ────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RC_STORE, PLUGIN_KEYS, getAllSessionKeys, isValidStorageKey };
}
