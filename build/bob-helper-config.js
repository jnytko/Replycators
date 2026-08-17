/**
 * bob-helper-config.js - Centralized Bob Helper port configuration reference
 *
 * This file is the single source of truth for the Bob Helper port number.
 * It documents all three locations where the port value appears and must stay in sync.
 *
 * DEFAULT PORT: 47123
 *
 * All three locations must show the same value:
 *
 *   1. tools/bob-helper-server.js (line ~16)
 *      const PORT = Number(process.env.REPLYCATORS_BOB_HELPER_PORT || 47123);
 *
 *   2. background.js (const BOB_HELPER_PORT)
 *      const BOB_HELPER_PORT = 47123;
 *
 *   3. dashboard.js (const _BOB_HELPER_PORT_DIAG)
 *      const _BOB_HELPER_PORT_DIAG = 47123;
 *
 * To change the port:
 *   1. Update the fallback value in tools/bob-helper-server.js
 *   2. Update BOB_HELPER_PORT in background.js
 *   3. Update _BOB_HELPER_PORT_DIAG in dashboard.js
 *   4. Update the DEFAULT PORT comment above
 *   5. Set REPLYCATORS_BOB_HELPER_PORT env var on any machine where a custom port is needed
 *
 * This file is not loaded at runtime. It exists only as documentation and as a
 * central reference so a developer searching for "47123" finds this file first.
 *
 * Why this approach:
 *   background.js is a flat IIFE bundle with no require() support at runtime.
 *   dashboard.js runs in the extension popup context (no Node.js). Neither can
 *   require() this file. The server (tools/bob-helper-server.js) COULD require it,
 *   but doing so for a single integer constant would add unnecessary indirection.
 *   Instead, this file documents all three locations and serves as a
 *   change-coordination checklist to prevent the three-literal-string drift problem.
 */

'use strict';

// Export the canonical port for any future Node.js tooling that needs it.
module.exports = {
  BOB_HELPER_PORT: 47123,
};
