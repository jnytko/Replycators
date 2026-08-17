/**
 * ReplyCators — Utility Helpers
 * TD-004 / RC-015 (Phase 1): Extracted pure utility functions from dashboard.js
 *
 * These functions are stateless and have no DOM or chrome.* dependencies.
 * They can be used independently and are easy to unit-test.
 *
 * STATUS: This file documents the canonical implementations.
 * The root dashboard.js still contains copies of these functions as inline
 * implementations (required for the flat-deployment model).
 * When Phase 2 (TypeScript migration) lands, dashboard.js will import these.
 */

'use strict';

/**
 * Escape a string for safe insertion into HTML.
 * Prevents XSS from user-controlled content.
 *
 * @param {unknown} s - Value to escape
 * @returns {string}
 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Semver-aware version comparison.
 * Compares each numeric segment in order.
 *
 * @param {string} va - Version string "MAJOR.MINOR.PATCH"
 * @param {string} vb - Version string to compare against
 * @returns {number} negative if va < vb, 0 if equal, positive if va > vb
 */
function cmpSemver(va, vb) {
  const pa = va.split('.').map(Number);
  const pb = vb.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Set the text content of an element by ID.
 * No-op if the element does not exist.
 *
 * @param {string} id - Element ID
 * @param {unknown} value - Text to set
 */
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value == null ? '' : value);
}

/**
 * Set the status/class of a status element.
 *
 * @param {HTMLElement|null} el - Element to update
 * @param {string} message - Status message
 * @param {'success'|'error'|'warning'|'neutral'} type - Visual type
 */
function setStatus(el, message, type) {
  if (!el) return;
  el.textContent  = message;
  el.className    = 'rc-status rc-status--' + (type || 'neutral');
  el.style.display = message ? 'block' : 'none';
}

// ── Export for use in non-extension contexts (tests, Node scripts) ────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { esc, cmpSemver, setEl, setStatus };
}
