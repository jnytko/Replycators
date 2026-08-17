/**
 * ReplyCators — Notification Helpers
 * TD-004 / RC-015 (Phase 1): Extracted notification logic from dashboard.js
 *
 * Provides the pure notification filtering, ring-buffer management, and
 * notification object construction — extracted from the dashboard.js monolith.
 *
 * STATUS: Reference implementation only.
 * The root dashboard.js still contains inline implementations.
 * Phase 2 (TypeScript migration) will import these modules.
 *
 * @see dashboard.js addNotification(), renderNotifications(), markAllRead()
 */

'use strict';

const VALID_NOTIF_TYPES = ['success', 'info', 'warning', 'error'];
const MAX_NOTIF_STORE   = 100;

/**
 * Determines whether a notification of the given type should be displayed
 * given the current application settings.
 *
 * @param {object} settings - Current appSettings object
 * @param {'success'|'info'|'warning'|'error'} type - Notification type
 * @returns {boolean}
 */
function isNotifAllowed(settings, type) {
  if (!settings.notifEnabled) return false;
  const key = 'notif' + type.charAt(0).toUpperCase() + type.slice(1);
  return !!settings[key];
}

/**
 * Normalises a notification type string.
 * Any unknown type maps to 'info'.
 *
 * @param {string} type
 * @returns {'success'|'info'|'warning'|'error'}
 */
function normaliseNotifType(type) {
  return VALID_NOTIF_TYPES.includes(type) ? type : 'info';
}

/**
 * Builds a notification object from its constituent parts.
 *
 * @param {string} title
 * @param {string} message
 * @param {string} type
 * @param {string} source - Plugin ID or 'platform'
 * @param {number} idCounter - Current counter value (will be incremented externally)
 * @returns {{ id: string, title: string, message: string, type: string, pluginId: string, timestamp: number, read: boolean }}
 */
function buildNotif(title, message, type, source, idCounter) {
  return {
    id:        'notif-' + idCounter,
    title:     String(title),
    message:   String(message),
    type:      normaliseNotifType(type),
    pluginId:  source || 'platform',
    timestamp: Date.now(),
    read:      false,
  };
}

/**
 * Adds a notification to the ring-buffer store.
 * Newest items are at index 0. Store is capped at MAX_NOTIF_STORE.
 *
 * @param {Array} store - Mutable notification array
 * @param {object} notif - Notification object from buildNotif()
 */
function pushNotif(store, notif) {
  store.unshift(notif);
  if (store.length > MAX_NOTIF_STORE) store.pop();
}

/**
 * Marks all notifications in the store as read.
 *
 * @param {Array} store
 */
function markAllRead(store) {
  store.forEach(n => { n.read = true; });
}

// ── Export ────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isNotifAllowed,
    normaliseNotifType,
    buildNotif,
    pushNotif,
    markAllRead,
    VALID_NOTIF_TYPES,
    MAX_NOTIF_STORE,
  };
}
