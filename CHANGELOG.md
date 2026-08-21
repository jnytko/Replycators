# ReplyCators - Changelog

All notable changes to the ReplyCators platform and its plugins are recorded here.

> **Structure:** Full verbose entries appear in reverse-chronological order below for the most recent releases.
> A complete **Version History Reference** summary table is at the bottom of this file.
> Verbose entries for versions below **v1.27.2** are archived in [`docs/CHANGELOG-ARCHIVE.md`](docs/CHANGELOG-ARCHIVE.md).
> The archive boundary is version-based (not time-based) to ensure a stable, predictable cutoff.

---

## [1.49.8] - 2026-08-21
### Cloudability OrgID - Stop detector from forwarding data when plugin is disabled
**Type:** Bug Fix
**Summary:** `cloudability-detector.js` now reads `rc:session:plugin-states` at startup and exits immediately if the Cloudability OrgID plugin is disabled, preventing any `RC_CLD_ORG_READY` messages and OrgID cache updates when the plugin is off. A tracking comment documenting the known MAIN-world interceptor limitation (Option B - dynamic registration) is added to `cloudability-interceptor.js`. The MAIN-world XHR/fetch patches remain on the page when the plugin is disabled - full suppression requires dynamic content script registration (Option B, separate ADR per AGENTS.md §6).
**Files changed:**
- `plugins/cloudability/content/cloudability-detector.js` - Added `rc:session:plugin-states` check at entry; all listeners and background push only run when the plugin is enabled
- `plugins/cloudability/content/cloudability-interceptor.js` - Added tracking comment describing the MAIN-world limitation and Option B architectural work item
- `dist/plugins/cloudability/content/cloudability-detector.js` - Mirror sync
- `dist/plugins/cloudability/content/cloudability-interceptor.js` - Mirror sync
- `dashboard.js` - Cloudability OrgID version `4.0.5` -> `4.0.6`; platform version `1.49.7` -> `1.49.8`
- `dashboard.html` - Cloudability plugin header version synced to `v4.0.6`; platform version display updated to `v1.49.8`
- `manifest.json`, `package.json` - Platform version `1.49.7` -> `1.49.8`
- `AGENTS.md` - Extension version and Cloudability plugin inventory version updated
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.5
- Cloudability OrgID: 4.0.6
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.4

---

## [1.49.7] - 2026-08-21
### Salesforce Case Extractor - Reset connected state on non-Salesforce tab activation
**Type:** Bug Fix
**Summary:** Fixed the Side Panel Salesforce status getting stuck in a false Connected state after switching to a non-Salesforce tab. The tab-activation pre-filter now performs a cheap UI-only reset for non-Salesforce tabs while still skipping the expensive detection pipeline and preserving the last extracted result in storage.
**Files changed:**
- `plugins/salesforce-case-extractor.js` - Reset badge, widget status, and Extract button state immediately when the active tab is not Salesforce; keep the async detection pipeline filtered out for non-Salesforce tabs
- `dashboard.js` - Salesforce Case Extractor version `4.12.4` -> `4.12.5`; platform version `1.49.6` -> `1.49.7`
- `dashboard.html` - Salesforce plugin header version synced to `v4.12.5`; platform version display updated to `v1.49.7`
- `manifest.json` - Version `1.49.6` -> `1.49.7`
- `package.json` - Version `1.49.6` -> `1.49.7`
- `README.md` - Version badge and Salesforce plugin version updated
- `AGENTS.md` - Extension version and Salesforce plugin inventory version updated
- `docs/ARCHITECTURE.md` - Salesforce plugin version table updated
- `docs/plugins/salesforce-case-extractor.md` - Startup behavior note added for non-Salesforce tab activation in Side Panel mode; version table synced to `4.12.5`
- `plugins/documentation.js` - In-extension Salesforce workflow note added for the non-Salesforce tab reset behavior
- `dist/` - Mirror sync of changed runtime files and versioned metadata
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.5
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.4

---

## [1.49.6] - 2026-08-21
### Workspace Starter - Defer launch success until tab creation completes
**Type:** Bug Fix
**Summary:** Fixed Workspace Starter so it records launch success only after Chrome tab-creation callbacks complete. Full failures now leave recents and last-launched untouched, partial failures show warning feedback with opened/failed counts, and each failed tab creation is logged for diagnostics.
**Files changed:**
- `plugins/workspace-starter.js` - Reworked `wsLaunchProfile()` to await tab creation callbacks, guard null/invalid tabs, group only successful tabs, and commit success state only after verified opens; plugin version `2.0.3` -> `2.0.4`
- `dashboard.js` - Workspace Starter version `2.0.3` -> `2.0.4`; platform `1.49.5` -> `1.49.6`
- `dashboard.html` - Platform version display `v1.49.5` -> `v1.49.6`; Workspace Starter header version `2.0.3` -> `2.0.4`
- `manifest.json`, `package.json` - Platform version `1.49.5` -> `1.49.6`
- `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/plugins/workspace-starter.md`, `plugins/documentation.js` - Updated Workspace Starter versions and launch-behavior documentation
- `dist/manifest.json`, `dist/package.json`, `dist/dashboard.html`, `dist/dashboard.js`, `dist/plugins/workspace-starter.js` - Mirror of root after sync
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.4
- Tab Search: 1.0.1
- Snake: 1.0.4
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.49.5] - 2026-08-25
### Snake - Scope hotkeys away from focused controls
**Type:** Bug Fix
**Summary:** Fixed double state-transition when pressing Enter or Space on the Pause button (or any other focused interactive control). Added an early return in `handleKey()` when the event target is a BUTTON, SELECT, INPUT, A, or TEXTAREA so the document-level listener no longer intercepts keys already handled by a focused element.
**Files changed:**
- `plugins/snake.js` - Added interactive-control target guard at top of `handleKey()`; added explanatory comment on `attachKeys`/`detachKeys`
- `dist/plugins/snake.js` - Mirror of root
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.4
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.49.4] - 2026-08-25
### Snake - Responsive canvas in narrow side panels
**Type:** Bug Fix
**Summary:** Fixed the Snake game canvas clipping in Side Panel mode at widths below 620px. The canvas CSS display size is now scaled responsively to fit the available content area while maintaining the 400:220 aspect ratio. The backing buffer (DPR-aware) and all game-logic coordinates are unchanged.
**Files changed:**
- `plugins/snake.js` - Added `applyCanvasDisplaySize()` function; removed hardcoded CSS `style.width/height` from `initView()`; added responsive size call in `onNavigate()` with `window resize` listener; added listener cleanup in `onLeave()`
- `styles/dashboard.css` - Updated comment on `#snk-canvas` rule to reflect the new responsive CSS size contract
- `dist/plugins/snake.js` - Mirror of root
- `dist/styles/dashboard.css` - Mirror of root
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.3
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.49.3] - 2026-08-25
### Docs - Align architecture, startup flow, plugin checklist, and Env Dashboard docs
**Type:** Documentation
**Summary:** Resolved six documentation drift issues identified in GitHub issue [DOCS][P3]. Corrected `initPlugins()` references to the actual `_safeInit()` / `DOMContentLoaded` pattern, removed the contradictory manual nav button checklist step, updated the navigation model to the grouped Notifications Center / Maintenance Center structure, aligned all plugin version numbers, added missing plugins (Quick Note Pad, Jira & Confluence Hub) to architecture and README tables, clarified which Environment Dashboards features are implemented vs. planned, added missing storage keys to `docs/STORAGE.md`, and created `docs/plugins/env-dashboards.md`.
**Files changed:**
- `AGENTS.md` - Plugin Release Checklist: removed manual nav button step; replaced `initPlugins()` with `_safeInit()` / DOMContentLoaded pattern
- `docs/ARCHITECTURE.md` - Platform views table: grouped nav model (Notifications Center, Maintenance Center); Left navigation structure updated; plugin versions and descriptions updated; added Quick Note Pad and Jira & Confluence Hub; env-dashboards capabilities qualified
- `docs/STARTUP-FLOW.md` - Boot sequence updated to current _safeInit() pattern and full plugin list; plugin load order updated to match current dashboard.html; init pattern note added
- `docs/STORAGE.md` - Added Quick Note Pad, Jira & Confluence Smart Search Hub, and Environment Dashboards Launcher plugin key sections
- `README.md` - Version badge updated to 1.49.2; Built-in Plugins table corrected (versions, added Quick Note Pad and Jira & Confluence Hub, env-dashboards description qualified); plugin doc table updated with env-dashboards link
- `docs/plugins/env-dashboards.md` - Created; documents implemented features, planned features, storage schema, and known limitations
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.2
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.49.2] - 2026-08-22
### Platform Audit - Backup & Restore + Notification gaps resolved
**Type:** Bug Fix / Enhancement
**Summary:** Comprehensive integration audit covering all plugins. Three gaps resolved: (1) Environment Dashboards Launcher (`com.replycators.env-dashboards` v1.4.0) was absent from `BR_PLUGIN_REGISTRY` despite owning a persistent `rc:plugin:com.replycators.env-dashboards:state` storage key - entry added with full validate/migrate/sanitize contract and `restoreStrategy: 'replace'`. (2) Edge Bookmark Finder had no success notification after a scan completed - `addNotification('success')` added after scan so the Notifications Center and toast system reflect the result. (3) Snake had no platform-visible milestone event when a new high score was achieved - `addNotification('success')` added in `gameOver()` guarded by `isNewHigh`. Backup & Restore plugin bumped to v1.0.5. Edge Bookmark Finder bumped to v1.0.3. Snake bumped to v1.0.2.
**Files changed:**
- `plugins/backup-restore.js` - `BR_PLUGIN_REGISTRY`: new entry for `com.replycators.env-dashboards` (exportable state, validate, sanitize, replace strategy); file header `v1.0.4` -> `v1.0.5`
- `plugins/bookmark-finder.js` - Added `app().addNotification('success')` on scan complete with bookmark and folder count
- `plugins/snake.js` - Added `isNewHigh` guard and `app().addNotification('success')` in `gameOver()` when a new high score is set
- `dashboard.js` - Edge Bookmark Finder version `1.0.2` -> `1.0.3`; Snake version `1.0.1` -> `1.0.2`; file header `v1.49.1` -> `v1.49.2`
- `dashboard.html` - Edge Bookmark Finder header `v1.0.2` -> `v1.0.3`; Snake header `v1.0.1` -> `v1.0.2`; platform version `v1.49.1` -> `v1.49.2`
- `manifest.json` - Version `1.49.1` -> `1.49.2`
- `package.json` - Version `1.49.1` -> `1.49.2`
- `AGENTS.md` - §1 version updated; §8 plugin versions updated
- `CHANGELOG.md` - This entry
- `dist/` - Mirror sync of all changed root files
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.3
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.2
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.49.1] - 2026-08-22
### Quick Note Pad + Backup & Restore - Order fix, notifications, backup integration
**Type:** Bug Fix / Enhancement
**Summary:** Three corrections to the v1.49.0 Quick Note Pad release: (1) DEFAULT_PLUGIN_ORDER corrected - Apptio Docs Finder restored to #4, Quick Note Pad moved to #5, matching the user-confirmed plugin manager ordering. (2) Key notepad actions (create note, delete note, copy to clipboard, export .txt) now fire `addNotification()` so events appear in the Notifications Center and Activity Log - previously only `showToast()` was called. (3) Backup & Restore `BR_PLUGIN_REGISTRY` extended with full entries for Quick Note Pad (exportable notes + state, sanitize redacts body and title) and Jira & Confluence Smart Search Hub (exportable settings, optional recents, sanitize redacts recent labels). Backup & Restore plugin bumped to v1.0.4.
**Files changed:**
- `dashboard.js` - DEFAULT_PLUGIN_ORDER: notepad swapped #4 -> #5, apptio-docs-finder swapped #5 -> #4; version header `v1.49.0` -> `v1.49.1`
- `plugins/notepad.js` - `addNotification()` added for: create note, delete note, copy (replaces showToast), export (replaces showToast); `deletedTitle` captured before splice for correct deletion message
- `plugins/backup-restore.js` - BR_PLUGIN_REGISTRY: new entries for `com.replycators.notepad` (exportable notes + state, schema validate, sanitize) and `com.replycators.jira-confluence-hub` (exportable settings, optional recents, sanitize); file header `v1.0.3` -> `v1.0.4`
- `manifest.json` - Version `1.49.0` -> `1.49.1`
- `package.json` - Version `1.49.0` -> `1.49.1`
- `AGENTS.md` - §1 version updated
- `CHANGELOG.md` - This entry
- `dist/` - Mirror sync of all changed root files
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.49.0] - 2026-08-22
### Quick Note Pad - New plugin (v1.0.0)
**Type:** Feature
**Summary:** Added the Quick Note Pad plugin (`com.replycators.notepad` v1.0.0). Provides a persistent multi-tab scratch pad with up to 5 named note tabs, 300 ms debounced auto-save on every keystroke, copy-to-clipboard, .txt export, monospace toggle, and a dashboard widget showing an active-note preview. Notes survive popup close, browser restart, and all session boundaries. Zero new Chrome permissions; pure `chrome.storage.local`.
**Files changed:**
- `plugins/notepad.js` - New plugin module (IIFE, self-registers on `window.ReplyCatorsPlugins.Notepad`); multi-note state, debounced save, tab switching, title editing, copy, export, mono toggle, widget update, full lifecycle (init/onNavigate/onLeave)
- `plugins/shared/icon-helper.js` - Added `notepad` to `plugins:` section of `ICON_REGISTRY` pointing at existing `content/note.svg`
- `assets/icons/streamline-ultimate-colors-free/icon-manifest.json` - Added `plugins.notepad` entry
- `plugins/documentation.js` - Added `notepad` topic to NAV_GROUPS `plugins` array and `CONTENT_MAP`; topics count updated 23 -> 24
- `dashboard.html` - Script tag for `plugins/notepad.js`; Quick Action button "Notes"; Dashboard widget card with preview and Open Notes button; plugin view `#view-plugin-notepad` (standard `.rc-plugin-page`); settings group (Notes Limit); activity log filter option; platform version `v1.48.0` -> `v1.49.0`
- `dashboard.js` - New entry in `PLUGINS[]`; `PLUGIN_DOC_MAP` entry; `DEFAULT_PLUGIN_ORDER` slot #4 (renumbered #5-#12); `_safeInit('Notepad', ...)` call; file header version `v1.48.0` -> `v1.49.0`
- `src/plugins/Notepad/index.ts` - TypeScript stub
- `src/plugins/Notepad/manifest.ts` - Plugin manifest stub
- `manifest.json` - Version `1.48.0` -> `1.49.0`
- `package.json` - Version `1.48.0` -> `1.49.0`
- `AGENTS.md` - §1 version, §5 Source of Truth Matrix, §8 Plugin Inventory + Plugin Source Locations + Notable Plugin Keys, §10 Active Views
- `CHANGELOG.md` - This entry
- `dist/` - Mirror sync of all changed root files
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Quick Note Pad: 1.0.0
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.48.0] - 2026-08-22
### Jira & Confluence Smart Search Hub - New plugin (Phase 1)
**Type:** Feature
**Summary:** Added the Jira & Confluence Smart Search Hub plugin (`com.replycators.jira-confluence-hub` v1.0.0). Provides a unified smart search box that detects input type (Jira issue key, full Jira URL, full Confluence URL, Confluence path, or search phrase) and offers context-appropriate actions: Open Issue, Open Page, Search Jira, Search Confluence, Search Both. Stores recent Jira and Confluence navigations/searches with configurable retention (default 10 per type). All navigation opens the browser directly - no external API calls or new Chrome permissions required.
**Files changed:**
- `plugins/jira-confluence-hub.js` - New plugin module (IIFE, self-registers on `window.ReplyCatorsPlugins.JiraConfluenceHub`); smart input detection, URL builders, recent items, settings load/save, full lifecycle (init/render/onNavigate/onLeave)
- `plugins/shared/icon-helper.js` - Added `jiraConfluenceHub` entry to `plugins:` section of `ICON_REGISTRY` pointing to existing `assets/icons/streamline-ultimate-colors-free/plugins/jira.svg`
- `plugins/documentation.js` - Added `jira-confluence-hub` topic to NAV_GROUPS `plugins` array and `CONTENT_MAP`; topics count updated 22 -> 23
- `dashboard.html` - Script tag for `plugins/jira-confluence-hub.js`; Quick Action button; Dashboard widget card; plugin view `#view-plugin-jira-confluence-hub` (standard `.rc-plugin-page` structure); settings group (Jira Base URL, Confluence Base URL, Recent Items Limit, Open Results In); activity log filter option; platform version display `v1.47.8` -> `v1.48.0`
- `dashboard.js` - New entry in `PLUGINS[]`; `PLUGIN_DOC_MAP` entry; `DEFAULT_PLUGIN_ORDER` slot #3; `_safeInit('JiraConfluenceHub', ...)` call; file header version `v1.47.8` -> `v1.48.0`
- `src/plugins/JiraConfluenceHub/index.ts` - TypeScript stub
- `src/plugins/JiraConfluenceHub/manifest.ts` - Plugin manifest stub
- `manifest.json` - Version `1.47.8` -> `1.48.0`
- `package.json` - Version `1.47.8` -> `1.48.0`
- `AGENTS.md` - §1 version, §5 Source of Truth Matrix, §8 Plugin Inventory + Plugin Source Locations + Notable Plugin Keys, §10 Active Views
- `CHANGELOG.md` - This entry
- `dist/` - Mirror sync of all changed root files
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Jira & Confluence Smart Search Hub: 1.0.0
- Environment Dashboards Launcher: 1.4.0

---

## [1.47.9] - 2026-08-22
### Cloudability OrgID - Fix enable/disable lifecycle reversibility without reload (Issue #28)
**Type:** Bug Fix
**Summary:** Resolved two lifecycle defects in `plugins/cloudability-orgid.js`. Scenario A: when the plugin started the session disabled, `init()` returned early before binding any UI event listeners, leaving Refresh, Copy, Include-in-Diagnostics, widget Refresh, and widget Copy permanently inert for the rest of the session even after re-enabling via Plugin Manager. Scenario B: when the plugin started enabled and was then disabled, the `chrome.runtime.onMessage` listener for `RC_CLD_ORG_UPDATE` remained permanently active, silently mutating `cldState` and writing Activity Log entries despite the plugin being off. Fixed by moving all listener binding unconditionally above the `pluginEnabled()` guard (Steps 1 and 2), then adding `if (!pluginEnabled()) return;` as the first line in every handler and in the `RC_CLD_ORG_UPDATE` message handler. The `pluginEnabled()` early-exit block is preserved as Step 3 to control initial UI state when starting disabled. The `_cldListenersBound` / `_cldMsgListenerBound` idempotency flags remain fully effective - listeners are still bound exactly once per session. `rc:plugin:com.replycators.cloudability-orgid:orgid-cache` is never touched by this change.
**Files changed:**
- `plugins/cloudability-orgid.js` - listener binding moved above pluginEnabled() guard; pluginEnabled() gate added in 5 UI handlers and 1 message handler; plugin version 4.0.4 -> 4.0.5
- `dist/plugins/cloudability-orgid.js` - mirror sync
- `dashboard.js` - Cloudability OrgID version 4.0.4 -> 4.0.5 in PLUGINS[]
- `dist/dashboard.js` - mirror sync
- `dashboard.html` - rc-plugin-header__version v4.0.4 -> v4.0.5
- `dist/dashboard.html` - mirror sync
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.5
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Environment Dashboards Launcher: 1.4.0

---


## [1.47.8] - 2026-08-21
### Backup & Restore - Treat all-conflict Keep existing imports as successful no-ops (Issue #27)
**Type:** Bug Fix
**Summary:** When all incoming backup keys already exist in storage, the "Keep existing on conflict" import strategy now correctly completes with a success notification ("0 restored, N kept - all values already up to date.") instead of throwing "Nothing to restore" and displaying a red failure notification. `_applyKeepExistingStrategy()` now returns skip metadata alongside the filtered envelope; the apply handler intercepts the all-conflict case before reaching `applyImport()`. The zero-writes error message in `applyImport()` is narrowed to the genuinely empty-backup case. Also resolves the deferred Issue #17 acceptance criterion B-04: advisory toast does not fire when keep-existing skips `rc:session:sf-settings`.
**Files changed:**
- `plugins/backup-restore.js` - `_applyKeepExistingStrategy()` returns `{ envelope, totalKeys, skippedCount }`; apply handler intercepts all-conflict no-op with success path; zero-writes error message narrowed; plugin version 1.0.2 -> 1.0.3
- `dist/plugins/backup-restore.js` - mirror sync
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Environment Dashboards Launcher: 1.4.0

---

## [1.47.7] - 2026-08-21
### Backup & Restore - Restore exact pre-import state and verify written values (Issue #26)
**Type:** Bug Fix
**Summary:** Corrected three transactional integrity flaws in backup import rollback and verification. Snapshot capture now tracks key absence so newly created keys are completely removed upon rollback, rollback failure rejection is properly propagated without falsely reporting restoration, and read-back verification performs value equality checks against intended writes.
**Files changed:**
- `plugins/backup-restore.js` - capture key presence metadata in rollback snapshot; restore values and remove newly-created keys on rollback; strictly propagate rollback errors; verify written values via serialization equality check during Phase 4 read-back; plugin version 1.0.1 - 1.0.2
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Environment Dashboards Launcher: 1.4.0

---

## [1.47.6] - 2026-08-21
### Apptio Documentation Finder - Preserve legacy data when migration verification fails (Issue #25)
**Type:** Bug Fix
**Summary:** The Apptio Documentation Finder's legacy `adn_*` storage migration now treats storage operations as fallible, verifies namespaced writes before removing legacy keys, and preserves legacy data for retry if migration fails. The plugin also catches storage-write failures in affected user flows so storage errors surface as controlled logs and user notifications instead of silent or uncaught failures.
**Files changed:**
- `plugins/apptio-docs-finder.js` - make storage helpers reject on `chrome.runtime.lastError`; add `_remove()`; verify migrated writes before deleting legacy keys; keep legacy data on failure; catch newly surfaced storage failures in affected save/clear flows; plugin version 1.0.2 - 1.0.3
- `dashboard.js` - Apptio Documentation Finder version 1.0.2 - 1.0.3
- `dashboard.html` - Apptio Documentation Finder header version 1.0.2 - 1.0.3
- `README.md` - Apptio Documentation Finder version 1.0.2 - 1.0.3
- `docs/plugins/apptio-docs-finder.md` - Apptio Documentation Finder version 1.0.2 - 1.0.3
- `AGENTS.md` - Apptio Documentation Finder inventory version 1.0.2 - 1.0.3
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.3
- Environment Dashboards Launcher: 1.4.0

---

## [1.47.1] - 2026-08-20
### Workspace Starter - Fix operator-precedence bug corrupting launchMode on every load (Issue #24)
**Type:** Bug Fix
**Summary:** A JavaScript operator-precedence bug in `wsMigrateProfiles()` silently converted any profile with `launchMode: 'tabs'` (Plain Tabs) to `'tab-group'` on every popup open. Because `wsMigrateProfiles()` is called on every load via `wsLoadData()`, the corruption was reapplied each session. The expression `p.launchMode || p.tabGroup ? 'tab-group' : 'tabs'` was parsed as `(p.launchMode || p.tabGroup) ? 'tab-group' : 'tabs'`; since the string `'tabs'` is truthy, the ternary always produced `'tab-group'`. The fix replaces the expression with an explicit enum validity check that preserves any already-valid `launchMode` value unchanged and correctly migrates legacy `tabGroup: boolean` profiles. Note: profiles that were already corrupted (stored as `'tab-group'` when the user intended `'tabs'`) cannot be automatically repaired - affected users should manually set those profiles back to Plain Tabs.
**Files changed:**
- `plugins/workspace-starter.js` - `wsMigrateProfiles()` line 108: replace precedence-buggy expression with explicit enum check; plugin version 2.0.2 - 2.0.3
- `dist/plugins/workspace-starter.js` - mirror
- `dashboard.js` - Workspace Starter version 2.0.2 - 2.0.3; platform v1.47.0 - v1.47.1
- `dashboard.html` - v1.47.1; Workspace Starter header version span 2.0.2 - 2.0.3
- `manifest.json`, `package.json` - v1.47.1
- `dist/manifest.json`, `dist/package.json`, `dist/dashboard.html`, `dist/dashboard.js`, `dist/plugins/workspace-starter.js` - v1.47.1
- `AGENTS.md` - v1.47.1; Workspace Starter 2.0.3
- `README.md` - Workspace Starter 2.0.3
- `docs/PACKAGING.md` - v1.47.1 artefact name
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.3
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.4.0

---

## [1.46.9] - 2026-08-20
### Salesforce Case Extractor - Fix init data loss and Clear ghost-data (Issue #23)
**Type:** Bug Fix
**Summary:** Two independent lifecycle bugs in the Salesforce Case Extractor caused data loss and ghost-data reappearance for all users. Bug 1: `clearExtractedState()` was called unconditionally at init, which removed `rc:session:sf-last-result` from storage before the restore check ran - saved extractions survived exactly one popup reopen and were silently lost on every subsequent open. Bug 2: the Clear button handler cleared the textarea and storage but left `_lastRawText`, `_lastBaseText`, `_lastExtractionPosts`, and `_execAttachments` populated, so toggling Privacy Mode or Sort after clearing re-populated the preview with the just-cleared case data. Fix 1 introduces `_resetUiOnly()`, a non-destructive init-time reset that blanks UI elements without touching storage or buffers; init now calls this instead of `clearExtractedState()`. Fix 2 replaces the Clear button handler with a comprehensive purge that zeros all four module-level buffers, clears all UI elements, disables Copy and Download, and calls `_sfSyncCopyPromptBtn()` before persisting the cleared state.
**Files changed:**
- `plugins/salesforce-case-extractor.js` - add `_resetUiOnly()` function; replace `clearExtractedState()` call at init with `_resetUiOnly()`; replace Clear button handler with full buffer + UI purge; add `_execAttachments = []` to `clearExtractedState()` for consistency; plugin version v4.12.3 - v4.12.4
- `dist/plugins/salesforce-case-extractor.js` - mirror
- `dashboard.js` - Salesforce Case Extractor version 4.12.3 - 4.12.4; platform v1.46.8 - v1.46.9
- `manifest.json`, `package.json`, `dashboard.html` - v1.46.9
- `dist/manifest.json`, `dist/package.json`, `dist/dashboard.html`, `dist/dashboard.js` - v1.46.9
- `AGENTS.md` - v1.46.9; Salesforce Case Extractor 4.12.4
- `docs/PACKAGING.md` - v1.46.9 artefact name
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.4
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.4.0

---

## [1.46.8] - 2026-08-20
### Security / Backup & Restore - Strip bobApiKey unconditionally from every export and import (Issues #18, #19)
**Type:** Security / Bug Fix
**Summary:** The BobShell 2.0 API key (`bobApiKey`) was exported in plaintext in any unsanitized backup because `rc:session:sf-settings` is in the Salesforce plugin's `exportable` array and the export pipeline never reads `neverExport`. This release strips the field unconditionally at two enforcement points: inside `exportBackup()` after sanitize, and inside `applyImport()` before writes, so that neither new backups nor legacy backup restores can move the credential through the backup pipeline. The "What is included and excluded" UI table now includes a row for the BobShell 2.0 API key. The sanitize toggle description now mentions "API keys". The dead `sensitiveFields` entry for `bobApiKey` is annotated with a comment explaining the enforcement points. Closes #18. Resolves #19.
**Files changed:**
- `plugins/backup-restore.js` - unconditional `bobApiKey` strip on export (after sanitize block) and on import (after filteredData construction); UI table row added; sanitize description updated; sensitiveFields annotated; plugin version v1.0.1
- `dist/plugins/backup-restore.js` - mirror
- `manifest.json`, `package.json`, `dashboard.html`, `dashboard.js` - v1.46.8
- `dist/manifest.json`, `dist/package.json`, `dist/dashboard.html`, `dist/dashboard.js` - v1.46.8
- `AGENTS.md` - v1.46.8
- `docs/PACKAGING.md` - v1.46.8 artefact name
- `plugins/documentation.js` - Backup & Restore help topic: Important Exclusions list updated
**Breaking changes:** Legacy backups created before v1.46.8 that contain `bobApiKey` will no longer restore that field. The key must be re-entered in Settings after any restore (this was always required from v1.46.5; the advisory toast from Issue #17 already communicates this).
**Security note:** Users who shared or archived backup files created before this release should consider rotating their BobShell API key.
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.3
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.4.0

---

## [1.46.7] - 2026-08-20
### Platform - Quick Actions audit: Cloudability OrgID added; developer documentation updated
**Type:** Enhancement + Documentation
**Summary:** Platform-wide audit of Dashboard Quick Actions coverage. Cloudability OrgID (dashboard order #2, used on every cloud cost case) was the only high-frequency production plugin without a Quick Action card. Card added. Three developer-facing documents were also missing all Quick Actions guidance - `docs/AI-PLUGIN-KIT.md`, `PLUGIN-SDK.md`, and `tools/create-plugin.js` now include eligibility criteria, registration pattern, label conventions, ordering rule, and a reference table of current Quick Actions so future plugin authors know exactly when and how to expose Dashboard shortcuts.
**Files changed:**
- `dashboard.html` - Cloudability OrgID Quick Action card added (between "Extract SF Case" and "Search Tabs")
- `docs/AI-PLUGIN-KIT.md` - New "Quick Actions integration" section added; section added to table of contents; Quick Action evaluation checklist item added to Workflow B scratch checklist
- `PLUGIN-SDK.md` - New "Quick Actions" section added; section added to table of contents
- `tools/create-plugin.js` - "QUICK ACTIONS" evaluation step added to registration instructions output
- `dist/*` - Mirror synced
**Breaking changes:** None - additive only. All existing Quick Actions unchanged.
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.3
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.4.0

---


## [1.46.6] - 2026-08-20
### Environment Dashboards Launcher - Open Blank launch mode (v1.4.0)
**Type:** Feature
**Summary:** Adds a second launch mode to every dashboard card - "Open Blank". Clicking "Open Blank" opens the target dashboard at its base URL with no injected parameters: no environment prefix, no namespace, no cluster, no datasource, no region, and no Splunk form fields. The existing "Open" action is fully preserved and unchanged. Both buttons appear side-by-side in each card's action row. A `BLANK_URLS` lookup table maps each dashboard ID to its base URL; future dashboards automatically gain Open Blank support by adding a single entry to this table.
**Files changed:**
- `plugins/env-dashboards.js` - `BLANK_URLS` map added; `handleOpenBlank()` function added; `buildCard()` and `buildCardPvc()` updated to render both Open and Open Blank buttons with `data-action` attribute; delegated click handler updated to route by `data-action`; card `role="button"` / `tabindex="0"` / `data-dashboard-id` moved from card div to individual buttons (correct accessibility model); keyboard handler on card removed (buttons are individually focusable and keyboard-activated natively); version bumped 1.3.0 - 1.4.0; emoji literals replaced with HTML entity equivalents
- `styles/dashboard.css` - `.edl-open-blank-btn` rule added (subtle opacity differentiation from primary Open)
- `dashboard.html` - Plugin header version badge updated to v1.4.0
- `dashboard.js` - PLUGINS[] env-dashboards version updated to 1.4.0
- `dist/*` - Mirror synced
**Breaking changes:** None - existing Open behavior is fully preserved. Cards no longer carry `role="button"` on the card container div; click-to-open is now on individual buttons (correct semantic HTML).
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.3
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.4.0

---


## [1.46.5] - 2026-08-19
### Backup & Restore - Post-import advisory toast when Bob Working Directory or API key was restored (Issue #17)
**Type:** Enhancement
**Summary:** After a successful import that restores `rc:session:sf-settings` with a non-empty `bobWorkingDir`, an advisory info toast now appears informing the user that the Bob Working Directory should be verified on this machine and that the API key (never included in backups) must be re-entered. The advisory fires only when `rc:session:sf-settings` was actually written to storage, determined by the new `writtenKeys` array in `applyImport()`'s return value - backups without an SF section, imports using the keep-existing strategy that skip the sf-settings key, and backups with an empty `bobWorkingDir` all remain silent. Blocked acceptance criterion (keep-existing all-conflict scenario) deferred to Issue #27.
**Files changed:**
- `plugins/backup-restore.js` - `applyImport()` return value extended with `writtenKeys: keysToSnapshot` (array of written key names, additive alongside existing `keysWritten` count); advisory toast block added in apply click handler success path after status display
- `dist/plugins/backup-restore.js` - Mirror synced
- `manifest.json` - Version bumped to 1.46.5
- `package.json` - Version bumped to 1.46.5
- `dashboard.html` - Platform version display bumped to v1.46.5
- `dashboard.js` - File header comment bumped to v1.46.5
- `AGENTS.md` - Platform version updated to 1.46.5
- `dist/*` - Mirror synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.3
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.46.4] - 2026-08-19
### Bob Helper - Isolate IPC artifact files to system temp and add prompt-file active cleanup (Issue #14)
**Type:** Bug Fix + Enhancement
**Summary:** Fixes a P1 security and UX defect where Bob Helper artifact files (`<requestId>.txt`, `.status.json`) were written directly into the user's configured Bob Working Directory (their IDE project folder) when one was set. Prompt `.txt` files could contain Salesforce case data and persist indefinitely in the project folder after a server crash because the in-memory `_usedPromptDirs` tracking was lost on restart and `cleanupOldTempFiles()` only scanned `TEMP_ROOT`. The fix unconditionally routes all artifact files to `TEMP_ROOT`, deletes the `.txt` immediately after the launcher reads it into memory, and deletes `.status.json` ~20 seconds after the server reads a terminal state from disk. An in-memory status cache (120s TTL) ensures late status polls after file deletion do not receive spurious 404 responses. Issue #15 (status 404 after file deletion) is resolved as part of this fix.
**Files changed:**
- `tools/bob-helper-server.js` - `resolvePromptDir()` simplified to always return `TEMP_ROOT`; `_usedPromptDirs` Set and working-directory loop in `cleanupAllTempFiles()` removed; `readStatusFile()` simplified to single TEMP_ROOT path with cache fallback, terminal-state caching, and deferred `unlinkSync`; `_statusCache`, `_cacheStatus()`, `_readStatusFromCache()`, `STATUS_CACHE_TTL_MS`, `STATUS_FILE_DELETE_DELAY_MS` added; `setInterval` cache eviction added with `.unref()` (setInterval count: 1, budget: <= 2)
- `tools/bob-launcher-template.ps1` - prompt `.txt` deleted immediately after `Remove-LockFile` (prompt held in memory for Bob invocation)
- `docs/BOB-HELPER-SERVER.md` - Architecture, Execution Flow (steps 8, 12, 14), Process Management temp file lifecycle (new table, corrected 7-day -> 24-hour eviction threshold, working-dir placement removed), Key Properties state model, Security section all updated
- `manifest.json` - Version bumped to 1.46.4
- `package.json` - Version bumped to 1.46.4
- `dashboard.html` - Platform version display bumped to v1.46.4
- `dashboard.js` - File header comment bumped to v1.46.4
- `AGENTS.md` - Platform version updated to 1.46.4
- `docs/PACKAGING.md` - Release artefact rename command updated to 1.46.4
- `dist/*` - Mirror synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.3
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.46.3] - 2026-08-19
### Salesforce Case Extractor - Consolidate Salesforce URL matching to a single hostname-parsing helper (Issue #13)
**Type:** Bug Fix
**Summary:** Fixes a silent detection gap where `SF_URL_PATTERN` (the tab listener pre-filter) used a stricter regex than the inline literals in `getSalesforceTabs()` and `getActiveSalesforceTab()`. A Salesforce tab URL without a trailing slash (e.g. `https://myorg.salesforce.com` before redirect) passed the extraction-time checks but failed the listener gate, causing the status badge to remain stale on tab switch. The fix replaces all three divergent patterns with a single `isSalesforceUrl(url)` helper that uses the native `URL` constructor for exact hostname boundary matching, eliminating both the detection gap and a substring spoofing surface (e.g. `notsalesforce.com` or a query param containing `salesforce.com` would previously match the permissive inline regex).
**Files changed:**
- `plugins/salesforce-case-extractor.js` - `SF_URL_PATTERN` constant removed; `isSalesforceUrl(url)` helper added; tab listener gate (lines 428, 439) and both tab query functions (`getSalesforceTabs` line 1544, `getActiveSalesforceTab` line 1568) updated to use the helper
- `dashboard.js` - PLUGINS[] Salesforce Case Extractor version bumped to 4.12.3; file header comment bumped to v1.46.3
- `dashboard.html` - Salesforce plugin header version bumped to v4.12.3; platform version display bumped to v1.46.3
- `manifest.json` - Version bumped to 1.46.3
- `package.json` - Version bumped to 1.46.3
- `AGENTS.md` - Platform version and Salesforce Case Extractor Plugin Inventory version updated
- `docs/PACKAGING.md` - Release artefact rename command updated to 1.46.3
- `dist/*` - Mirror synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.3
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.46.2] - 2026-08-18
### Background / Cloudability OrgID / Env Dashboards - Resolve active customer context from focused window only (Issue #6)
**Type:** Bug Fix
**Summary:** Fixes a correctness bug where `orgIdGetActiveTab()` (background.js), `findCloudabilityTab()` (cloudability-orgid.js), and `handleOpen()` (env-dashboards.js) could select an active Cloudability or customer tab from an unfocused background window. Chrome's `Tab.active` flag is per-window; all three callers were traversing or querying across all windows and returning the first matching tab regardless of window focus. With multiple windows open this caused OrgID retrieval to resolve the wrong customer's organisation, and Env Dashboards to launch for the wrong customer environment. The fix scopes all three queries to the focused/current window only.
**Files changed:**
- `background.js` - `orgIdGetActiveTab()` replaced: `chrome.windows.getAll({ populate: true })` traversal replaced with `chrome.windows.getLastFocused({ populate: false })` + `chrome.tabs.query({ active: true, windowId: focusedWin.id })`; JSDoc updated to document the correctness semantics
- `plugins/cloudability-orgid.js` - `findCloudabilityTab()` replaced: `chrome.windows.getAll({ populate: true })` traversal replaced with `chrome.tabs.query({ active: true, currentWindow: true })`; comment corrected
- `plugins/env-dashboards.js` - `handleOpen()` query narrowed from `{ active: true }` (all windows) to `{ active: true, currentWindow: true }`; misleading comment corrected
- `manifest.json` - Version bumped to 1.46.2
- `package.json` - Version bumped to 1.46.2
- `dashboard.html` - Platform version display bumped to v1.46.2; Cloudability OrgID header version bumped to v4.0.4
- `dashboard.js` - File header comment bumped to v1.46.2; PLUGINS[] Cloudability OrgID version bumped to 4.0.4
- `AGENTS.md` - Platform version and Cloudability OrgID Plugin Inventory version updated
- `docs/PACKAGING.md` - Release artefact rename command updated to 1.46.2
- `dist/*` - Mirror synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.2
- Cloudability OrgID: 4.0.4
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.46.1] - 2026-08-18
### Background - Centralize Bob Helper fetch timeout handling (Issue #5)
**Type:** Refactor
**Summary:** Introduces `fetchBobHelper(url, fetchOptions, timeoutMs)` - a single utility function that encapsulates the `AbortController + setTimeout` timeout pattern shared by all four Bob Helper message handlers. Each of the four handlers (`RC_PREFLIGHT_CLI_CHECK`, `RC_BOB_HEALTH`, `RC_EXECUTE_BOB`, `RC_BOB_STATUS`) previously implemented an identical inline boilerplate block. All four now delegate the timeout/abort plumbing to the shared utility while retaining their own response parsing, error message strings, logging, and `sendResponse` calls. No behavior change - all per-endpoint timeout values (3000/4000/10000 ms) are preserved as named arguments.
**Files changed:**
- `background.js` - `fetchBobHelper()` utility added (~line 603); four handler boilerplate blocks replaced with calls to the utility; header comment bumped to v1.46.1
- `manifest.json` - Version bumped to 1.46.1
- `package.json` - Version bumped to 1.46.1
- `dashboard.html` - Version display bumped to v1.46.1
- `dashboard.js` - File header comment bumped to v1.46.1
- `AGENTS.md` - Version field updated to 1.46.1
- `docs/PACKAGING.md` - Release artefact rename command updated to 1.46.1
- `dist/*` - Mirror synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.2
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.46.0] - 2026-08-17
### Diagnostics - Add Bob version validation check (Issues #20, #22)
**Type:** Enhancement
**Summary:** Adds a new "Bob Version" check to the Local Runtime group in the Diagnostics panel. The check reads `bobVersionOk` and `bobVersionWarning` from the `/cli-check` response (added to `bob-helper-server.js` as additive fields) and emits a `warn` card when the detected Bob CLI major version is below the minimum required (v2). The check correctly uses the F-13 shared `_getCliCheckResponse()` lazy promise so exactly one `RC_PREFLIGHT_CLI_CHECK` message fires per diagnostics run. Two mandatory guards are implemented: the `sfEnabled` guard (skip if Salesforce plugin is disabled, matching all SF-related checks) and the `bobUseBob1` guard (emit `info` card when Bob 1.0 mode is intentionally active, suppressing a misleading "update required" warning). The `restorePreflightResults()` F-07 size constant for the `LocalRuntime` group is updated from 5 to 6 to match the new check count, preventing silent cache discard on next Diagnostics open. A `_BOB_MIN_MAJOR_VERSION = 2` constant is defined alongside `_BOB_HELPER_PORT_DIAG` for maintainability.
**Files changed:**
- `dashboard.js` - `_BOB_MIN_MAJOR_VERSION = 2` constant; `checkBobVersion` function; added to `GROUPS['LocalRuntime'].checks`; `restorePreflightResults()` comment and `GROUP_META.LocalRuntime.size` updated from 5 to 6; version header bumped to v1.46.0
- `dashboard.html` - Version display bumped to v1.46.0
- `manifest.json` - Version bumped to 1.46.0
- `package.json` - Version bumped to 1.46.0
- `tools/bob-helper-server.js` - `/cli-check` response extended with `bobVersionOk` (boolean|null) and `bobVersionWarning` (string|null); `BOB_MIN_MAJOR_VERSION = 2` constant defined locally
- `AGENTS.md` - Version field updated to 1.46.0
- `docs/PACKAGING.md` - Release artefact rename command updated to 1.46.0
- `dist/*` - Mirror synced
**Breaking changes:** None. Server-side fields are additive; existing consumers of `/cli-check` are unaffected. `bob-helper-server.js` must be restarted to serve the new fields.
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.2
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.45.6] - 2025-07-19
### Salesforce Case Extractor - ASCII punctuation compliance and documentation corrections (D-001, D-002, D-004)
**Type:** Bug Fix
**Summary:** Resolves three findings from the pre-production defect analysis. Replaces two U+2014 em-dash characters in user-facing Activity Log and Notification strings with ASCII hyphens, satisfying the §28 ASCII Punctuation Standard. Updates the `RC_STORE.SF_SETTINGS` comment in `dashboard.js` to document the two fields (`bobApiKey`, `bobUseBob1`) added in v1.45.0 but missing from the schema comment. Removes dead code and misleading `sensitiveFields` metadata from the `platform` registry entry in `backup-restore.js` — the `rc:session:sf-settings` key is not in that entry's `exportable` list and the sanitize block could never execute; the SF plugin entry already correctly sanitizes that key.
**Files changed:**
- `plugins/salesforce-case-extractor.js` - D-001: L1858 `\u2014` -> ` - ` in addLog string; L1865 `\u2014` -> ` - ` in addNotification title
- `dashboard.js` - D-002: RC_STORE.SF_SETTINGS comment updated to include bobApiKey and bobUseBob1 fields
- `plugins/backup-restore.js` - D-004: platform registry entry sensitiveFields cleared; sanitize() simplified to _deepClone(data) (dead sf-settings block removed)
- `dist/*` - All three dist mirrors synced
- `dashboard.html` - SF plugin header version bumped to v4.12.2
- `README.md` - SF plugin version updated to 4.12.2
- `AGENTS.md` - Plugin Inventory SF version updated to 4.12.2
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.2
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.45.5] - 2025-07-19
### Platform - Performance, diagnostics, and reliability improvements (F-001 to F-011)
**Type:** Enhancement | Bug Fix
**Summary:** Implements performance, diagnostics, and reliability findings from the pre-production technical assessment. Key improvements: diagnostics page now uses a targeted storage read (CACHE_REGISTRY_KEYS) instead of a full get(null) snapshot, eliminating a redundant broad storage read; ADF diagnostic values are read from the shared cache snapshot rather than a second storage call; Bob Helper health check is now a shared lazy promise deduplicated across both preflight checks (previously sent two independent RC_BOB_HEALTH messages per load); preflight card retry now replaces only the specific card by data-check-label attribute instead of re-rendering the entire preflight panel; background plugin-state lookups are now TTL-cached (60s) to avoid repeated storage reads per context-menu or message event; the Salesforce tab-activated listener now skips sfRefreshDetectionBanner() when the activated tab is not a Salesforce URL, eliminating unnecessary cross-plugin calls on every tab switch.
**Files changed:**
- `dashboard.js` - F-001/F-010: collectCacheDiagnostics uses CACHE_REGISTRY_KEYS targeted read when skipOrphanCheck=true; loadDiagnostics passes skipOrphanCheck=true and reads ADF values from cacheState.localData (no second storage get); collectCacheDiagnostics returns localData in result. F-008: _getBobHealthResponse() shared lazy promise in loadPreflightChecks(); checkBobHelper and checkBobHelperPortSync use shared promise (no duplicate RC_BOB_HEALTH messages). F-011: _buildPreflightCard sets card.dataset.checkLabel; _retryPreflightSingle finds card by data-check-label and replaces only that card. Version bumped to v1.45.5.
- `background.js` - F-003: Added _pluginStateCache Map and _PLUGIN_STATE_CACHE_TTL_MS=60000; getPluginEnabledState() now returns cached value within TTL window; cache invalidated on plugin state change messages.
- `plugins/salesforce-case-extractor.js` - F-002: onActivated handler now checks SF_URL_PATTERN.test(tab.url) before calling sfRefreshDetectionBanner(); non-SF tab activations are ignored.
- `dashboard.html` - Version display bumped to v1.45.5
- `manifest.json` - Version bumped to 1.45.5
- `package.json` - Version bumped to 1.45.5
- `AGENTS.md` - Version field updated to 1.45.5
- `dist/*` - Mirror synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.45.4] - 2025-07-18
### Platform - Security and compliance hardening (H-001, H-002, EG-001, PERM)
**Type:** Security | Compliance
**Summary:** Implements four security and compliance findings from the independent security review. Restricts the Bob Helper server CORS policy from wildcard to extension-origin-only, removing cross-site request exposure for the API key transmission path. Narrows web_accessible_resources from <all_urls> to the six specific host patterns the extension operates on, and removes sf-content.js, cloudability-detector.js, styles/*.css, and icon-helper.js from the WAR list (none of these require WAR for their actual usage). Removes the unused `notifications` permission (chrome.notifications is not called anywhere in the runtime). Removes the redundant `activeTab` permission (fully superseded by the `tabs` permission for the extension's access patterns).
**Files changed:**
- `tools/bob-helper-server.js` - Added `getAllowedOrigin()` CORS policy helper; replaced `Access-Control-Allow-Origin: *` with origin-reflected `chrome-extension://` allowlist in `sendJson()` and OPTIONS preflight handler; all 13 `sendJson()` call sites updated to pass request origin (H-001)
- `manifest.json` - Removed `activeTab` and `notifications` from permissions; narrowed WAR matches from `<all_urls>` to 6 host patterns; removed sf-content.js, cloudability-detector.js, styles/*.css, icon-helper.js from resources list (H-002, EG-001, PERM)
- `dist/manifest.json` - Mirror synced
- `dashboard.js` - Version header bumped to v1.45.4
- `dashboard.html` - Version display bumped to v1.45.4
- `dist/dashboard.js` - Mirror synced
- `dist/dashboard.html` - Mirror synced
- `package.json` - Version bumped to 1.45.4
- `AGENTS.md` - Version field updated to 1.45.4
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.45.3] - 2025-07-17
### Platform - Architecture audit remediation (F-002, F-009, F-010, F-014)
**Type:** Refactor | Enhancement
**Summary:** Implements four targeted architecture improvements from the platform audit. Replaces hardcoded per-plugin if-chains in navigateTo() with a data-driven dispatch table powered by new pluginKey, navHook, and leaveHook fields in PLUGINS[]. Adding a new plugin no longer requires editing navigateTo(). Adds explicit Phase 2 migration comments to the background.js SDK (registerPlugin/buildServices) to prevent accidental deletion of intentionally retained code. Makes getPluginStates() return a shallow copy to prevent external slot assignment bypassing persistPluginStates(). Documents the background worker logging gap in AGENTS.md Known Limitations. No user-facing behavior change. No storage or API changes.
**Files changed:**
- `dashboard.js` - Added pluginKey/navHook/leaveHook fields to all PLUGINS[] entries; replaced 13-line if-chain in navigateTo() onLeave dispatch with 3-line data-driven loop; replaced 10-line if-chain in navigateTo() navHook dispatch with 3-line data-driven loop; added VERSION SYNC REMINDER comment to PLUGINS[] header; changed getPluginStates() to return Object.assign({}, pluginStates) shallow copy; bumped version to v1.45.3
- `background.js` - Added RC-015 Phase 2 Target comments to Plugin Registry and buildServices sections
- `AGENTS.md` - Bumped platform version to 1.45.3; added background worker logging gap to Known Limitations
- `manifest.json` - Bumped to 1.45.3
- `package.json` - Bumped to 1.45.3
- `dashboard.html` - Bumped platform version display to v1.45.3
- `dist/` - Mirrors synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.45.2] - 2025-07-17
### Salesforce Case Extractor - Inline sort control and Privacy Mode relocation
**Type:** UI | Enhancement
**Summary:** Moves Sort Posts control from the global Settings page into the Extract tab options row, making it immediately accessible in context. Re-renders the preview in real time when sort order changes. Relocates Privacy Mode checkbox from the primary action toolbar into the same options row under a new Display group, reducing visual clutter in the toolbar and grouping related secondary controls together. No behaviour, logic, defaults, or storage schema changes.
**Files changed:**
- `dashboard.html` - Removed Sort Posts row from Settings; moved sf-post-sort select into Extract tab options row under Display group; removed Privacy Mode from toolbar row 1; added Privacy Mode into Extract tab options row under Display group; added sf-extract-options__sep separator div; bumped SF plugin view header to v4.12.1; bumped platform version to v1.45.2
- `dashboard.js` - Bumped version to v1.45.2; bumped SF plugin version to 4.12.1
- `styles/dashboard.css` - Removed .sf-privacy-label rules; added .sf-extract-options__sep, .sf-extract-options__sort, .sf-extract-options__item--inline; tightened warn-tint selector to Include-group only
- `plugins/salesforce-case-extractor.js` - Added _lastBaseText and _lastExtractionPosts module variables; populated on extraction success and session restore; wired sort change listener to re-render preview from _lastBaseText; cleared both on clearExtractedState()
- `manifest.json` - Bumped to 1.45.2
- `package.json` - Bumped to 1.45.2
- `AGENTS.md` - Bumped platform and SF plugin versions
- `dist/` - Mirrors synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.45.1] - 2025-07-15
### Salesforce Case Extractor - User-configurable post sort order
**Type:** Feature
**Summary:** Adds a Sort Posts setting to Options - Salesforce Case Extractor. Users can choose Ascending (oldest first, default) or Descending (newest first). The selected order is applied at the dashboard layer after extraction using the new sfBuildSortedText() helper, which rebuilds the CASE HISTORY block from the structured posts array when Descending is selected. For the default Ascending order the function is a no-op, returning rawText unchanged. The preference persists to rc:session:sf-settings and is restored on next open. Copy, Download, Execute, and session-restore all use the sorted output.
**Files changed:**
- `dashboard.html` - Added Sort Posts select row in Salesforce Case Extractor settings group; corrected plugin header version to v4.12.0
- `dashboard.js` - Added postSort read in persistSfSettings(); added postSort to stored sf-settings object; added sf-post-sort change listener; added restore block in syncSettingsUI(); bumped SF plugin version to 4.12.0; bumped dashboard version to v1.45.1
- `plugins/salesforce-case-extractor.js` - Added sfBuildSortedText() helper; added sf-post-sort restore in init() settings block; added sf-post-sort change listener; applied sfBuildSortedText() in runExtraction() success path; updated persistSfResult() to store sorted _lastRawText
- `AGENTS.md` - Added postSort to Source of Truth Matrix; updated sf-settings schema in Session Keys; bumped SF plugin version to 4.12.0
- `docs/STORAGE.md` - Updated rc:session:sf-settings schema to full field list including postSort
- `docs/plugins/salesforce-case-extractor.md` - Added Sort Posts to Settings table; updated rc:session:sf-settings storage entry
- `plugins/documentation.js` - Updated What Gets Extracted bullet and Output Formats section to document Sort Posts
- `dist/` - Mirrors synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.12.0
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.45.0] - 2025-07-14
### Salesforce Case Extractor - BobShell 2.0 API Key support
**Type:** Feature
**Summary:** Adds a BobShell 2.0 API Key setting to the Salesforce Case Extractor section of Settings. The key is stored securely in `rc:session:sf-settings`, masked in the UI, and injected as `BOB_API_KEY` into the PowerShell child process environment at Execute time. A "API key not required" toggle disables the requirement for Bob 1.0 users. Execute buttons are gated on both the working directory and the API key being configured (or Bob 1.0 mode active).
**Files changed:**
- `dashboard.html` - Added BobShell 2.0 API Key input row and "API key not required" toggle row in SF Settings section
- `dashboard.js` - Added `_committedBobApiKey` module-level variable, `_setApiKeyStatus()` helper, API key event listeners and `_handleBobApiKeySave()` / `_commitBobApiKey()` handlers, `sf-bob-use-bob1` toggle handler, and `syncSettingsUI()` restore block for new fields; SF plugin version bumped to 4.11.0; platform version bumped to 1.45.0
- `plugins/salesforce-case-extractor.js` - Added `_bobApiKey` / `_bobUseBob1` module vars, `_isBobApiKeyReady()`, updated `_applyHelperHealthToExecBtns()` with API key gate, added pre-flight check in Execute handler, updated `sfExecuteWithBob()` signature and `RC_EXECUTE_BOB` payload, added `onApiKeyChanged()` and `onBobVersionModeChanged()` public methods, updated plugin registration object and `init()` restore block
- `background.js` - Extracts `bobApiKey` from `RC_EXECUTE_BOB` payload; logs `bobApiKeySet` boolean only (never value); forwards key in POST body to helper server
- `tools/bob-helper-server.js` - Extracts `bobApiKey` from POST body; logs `bobApiKeySet` boolean only; conditionally adds `BOB_API_KEY` to `spawnOpts.env`
- `tools/bob-launcher-template.ps1` - Updated header comment to document `BOB_API_KEY` env var; added masked `[set]/[not set]` diagnostic output line
- `plugins/backup-restore.js` - Added `bobApiKey` to `sensitiveFields` and `sanitize()` in both platform and SF plugin entries
- `AGENTS.md` - Fixed §5 Source of Truth Matrix error (Bob Working Directory was incorrectly listed at a separate plugin key); added `bobApiKey` and `bobUseBob1` rows; updated §9 sf-settings schema; bumped SF plugin version to 4.11.0; bumped platform version to 1.45.0
- `README.md` - Updated Salesforce Case Extractor version to 4.11.0
- `manifest.json` - Version bumped to 1.45.0
- `package.json` - Version bumped to 1.45.0
- `dist/` - Mirrors synced
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.11.0
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.44.6] - 2026-08-14
### Bob Helper - Bob v1/v2 compatibility, execution status polling, lock-file cleanup protocol, attachment validation, path traversal hardening, port config reference
**Type:** Feature | Enhancement | Bug Fix
**Summary:** Seven targeted improvements to the Bob Helper execution pipeline. Bob 2.x is now supported via runtime version detection (`bob -v`) and inline `-p` flag invocation; Bob 1.x legacy pipe path is retained as the fallback. A lock-file protocol (`<requestId>.lock`) prevents the cleanup race condition where the server could delete a prompt file before the launcher finished reading it. Execution status polling (`/status/:requestId` endpoint + launcher writes `.status.json`) lets the SF plugin UI show live `starting - running - completed/failed` state instead of a fire-and-forget "Sent to IBM Bob" message. Attachment validation now rejects zero-byte and oversized files with a user-visible warning before they reach the prompt assembly stage. `build/bob-helper-config.js` is added as a single-location documentation reference for the port constant. Path traversal prevention is hardened with `path.resolve(path.normalize())` canonical comparison. Prompt size check now uses `new Blob([]).size` for correct UTF-8 byte count instead of JS char count.

**Changes:**

1. **`tools/bob-launcher-template.ps1` (Change A):** Adds `Write-BobStatus` and `Remove-LockFile` helper functions. Detects Bob major version via `bob -v`; branches to `& $env:RC_BOB_COMMAND -p $promptContent` for Bob 2.x, retains stdin-pipe invocation for Bob 1.x. Reads prompt content and removes lock file before invoking Bob. Writes `running` status at start; `completed` or `failed` at completion; `failed` in the catch block. `RC_STATUS_FILE` env var injected by server.
2. **`tools/bob-helper-server.js` (Changes B, C, E, F):** Lock-file protocol - `writeLockFile()`, `hasLockFile()` written alongside every prompt; cleanup skips `.txt` with live `.lock`. Status-file protocol - `writeStatusFile()`, `readStatusFile()` pre-create `.status.json` as `pending`; `GET /status/:requestId` endpoint returns current state. `RC_STATUS_FILE` env var passed to launcher. `OLD_FILE_MAX_AGE_MS` reduced from 7 days to 24 hours. Change F: `path.resolve(path.normalize())` canonical comparison in `validateWorkingDir()`. Change E: comment updated to reference `build/bob-helper-config.js`. ASCII punctuation standard applied to user-facing strings.
3. **`background.js` (Changes B, E):** Added `RC_BOB_STATUS` message handler that proxies `GET /status/:requestId` to the helper server (3 s timeout). Updated `BOB_HELPER_PORT` comment to reference `build/bob-helper-config.js`.
4. **`plugins/salesforce-case-extractor.js` (Changes B, D, G):** Change B - `sfExecuteWithBob()` now polls `RC_BOB_STATUS` every 3 s (max 100 attempts / 5 min), updating status bar through `starting - running - completed/failed` states. Change D - `fileInput` change handler validates each file for zero-byte and oversize before accepting; rejected files shown in status bar. Change G - prompt size check uses `new Blob([assembled]).size` instead of `assembled.length`. Log message updated to use `promptBytes` (byte count) instead of `promptLength` (char count).
5. **`dashboard.js` (Change E):** `_BOB_HELPER_PORT_DIAG` comment updated to reference `build/bob-helper-config.js`.
6. **`build/bob-helper-config.js` (new, Change E):** Documents all three port locations; exports `BOB_HELPER_PORT` for future Node tooling.

**Files changed:**
- `tools/bob-launcher-template.ps1` - Bob v1/v2 branching, status writes, lock removal, Remove-LockFile helper
- `tools/bob-helper-server.js` - lock-file protocol, status endpoint, path traversal hardening, 24h cleanup, port comment
- `background.js` - RC_BOB_STATUS handler, port comment update
- `plugins/salesforce-case-extractor.js` - status polling, attachment validation, byte-count fix
- `dashboard.js` - port comment update
- `build/bob-helper-config.js` - new: centralized port reference

**Breaking changes:** None. Bob 1.x environments continue to work via the version-detection fallback path.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.10.0
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.44.5] - 2026-08-09
### Bob Helper - Fix Execute producing no visible PowerShell window
**Type:** Bug Fix
**Summary:** The IBM Bob launcher window was never visible when clicking Execute. Root cause: Node's `spawn()` does not allocate a new console for the child process when the Node server itself has no attached console (the normal case when started from a Scheduled Task, a non-interactive session, or any context without a terminal). Spawning `powershell.exe` directly produced a process with no window handle regardless of `windowsHide:false`. Fix: add `shell:true` to the `spawn()` call. Node routes `shell:true` through `cmd.exe` internally, which allocates a real console for the child. PowerShell renders its window in that console. Confirmed working via direct `/execute` POST test producing a visible window.

**Changes:**

1. **`tools/bob-helper-server.js` spawn call updated:** `shell:true` added. Command restructured from an args array to a single command string (required by `shell:true`). `detached:true` and `stdio:'ignore'` retained for fire-and-forget. `windowsHide:false` retained so the window is visible.

**Files changed:**
- `tools/bob-helper-server.js` - spawn: shell:true added, command restructured to string form

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.44.4] - 2026-08-09
### Bob Helper - Fix Invoke-Install parameter names and task registration reliability
**Type:** Bug Fix
**Summary:** Fixes three bugs in `Invoke-Install` that prevented the Scheduled Task from registering. (1) `New-ScheduledTaskSettingsSet` was called with non-existent parameters `-DisallowStartIfOnBatteries` and `-StopIfGoingOnBatteries` - replaced with the correct `-AllowStartIfOnBatteries` and `-DontStopIfGoingOnBatteries` switch parameters. (2) The `AtLogOn` trigger delay of `PT15S` (15 seconds) is below the Task Scheduler XML minimum and causes HRESULT 0x80041318 on all tested Windows versions - the delay line is removed entirely; the server starts immediately at logon. (3) `Register-ScheduledTask` was called without `-ErrorAction Stop`, so CimExceptions were non-terminating: the `[OK]` message and `exit 0` ran even when the task was never created. Added `-ErrorAction Stop` so the `catch` block correctly fires on failure.

**Changes:**

1. **`-DisallowStartIfOnBatteries $false` removed:** Not a valid parameter. Replaced with `-AllowStartIfOnBatteries` (switch - presence means allow start on battery).
2. **`-StopIfGoingOnBatteries $false` removed:** Not a valid parameter. Replaced with `-DontStopIfGoingOnBatteries` (switch - presence means do not stop when going on battery).
3. **`$trigger.Delay` line removed:** `PT15S` rejected by Task Scheduler XML schema (HRESULT 0x80041318). The delay was a nicety; removing it causes the server to start immediately at logon, which is acceptable.
4. **`-ErrorAction Stop` added to `Register-ScheduledTask`:** Converts the non-terminating CimException to a terminating error so the `catch` block correctly handles failures instead of printing `[OK]` on a failed registration.

**Files changed:**
- `tools/bob-helper.ps1` - Invoke-Install: parameter names corrected, delay removed, ErrorAction Stop added

**Breaking changes:** None. Users who previously ran `bob-helper.ps1 install` had a broken task that was never actually registered. Re-running `install` now creates the task correctly.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.44.3] - 2026-08-09
### Bob Helper - Fix Scheduled Task window station; correct Execute status message
**Type:** Bug Fix
**Summary:** Fixes the root cause of the PowerShell window not appearing when Execute is clicked after the Bob Helper server is started via the Scheduled Task (`bob-helper.ps1 install`). The task previously used `-WindowStyle Hidden`, which caused Node.js to inherit a hidden window station. Any child process spawned from that session - including the IBM Bob launcher window - also inherited the hidden station and could not create a visible window. Changed to `-WindowStyle Normal` so the helper server runs in an interactive window station and can produce visible child windows. Also corrects the misleading Execute status message from "check your terminal" to "check your IBM Bob window", which accurately describes the visible window that now opens.

**Changes:**

1. **`tools/bob-helper.ps1` line 312 fixed:** Scheduled Task action argument changed from `-WindowStyle Hidden` to `-WindowStyle Normal`. The helper server must run in an interactive window station so that `spawn('powershell.exe', ..., { windowsHide: false })` in `bob-helper-server.js` can produce a visible child window. The `-NonInteractive` flag is retained - it suppresses interactive prompts in the helper process itself and is correct.

2. **`plugins/salesforce-case-extractor.js` line 1299 fixed:** Execute success status message updated from "Sent to IBM Bob - check your terminal" to "Sent to IBM Bob - check your IBM Bob window". The previous message was misleading when no standalone terminal was open; the new message accurately describes the dedicated IBM Bob window that the launcher opens.

3. **`dist/plugins/salesforce-case-extractor.js` synced:** dist mirror updated to match root.

**Root cause analysis:** `windowsHide: false` on the Node.js `spawn()` call correctly sets the `CREATE_NO_WINDOW` flag to absent, but cannot override a hidden window station inherited from the parent process. The hidden window station was introduced by the Scheduled Task's `-WindowStyle Hidden` flag. File creation confirmed back-end chain was working; window non-appearance confirmed the window station inheritance as the failure boundary.

**Files changed:**
- `tools/bob-helper.ps1` - Scheduled Task action: -WindowStyle Hidden -> -WindowStyle Normal
- `plugins/salesforce-case-extractor.js` - Execute status message updated
- `dist/plugins/salesforce-case-extractor.js` - dist mirror synced

**Breaking changes:** None. Users who registered the Scheduled Task with a prior `bob-helper.ps1 install` must re-run `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install` to replace the task with the corrected action. Existing manual-start (`bob-helper.ps1 start`) users are unaffected.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.44.2] - 2026-08-09
### Platform - Remove plugin-owned root copies; migrate sf-content.js and apptio-schedule.json to plugin-owned paths
**Type:** Refactor
**Summary:** Eliminates root-level copies of plugin-owned files. `sf-content.js` relocated from root to `plugins/salesforce/content/sf-content.js` (canonical active source, mirroring Cloudability content-script structure). `apptio-schedule.json` package path moved from extension root to `plugins/apptio-upgrade-calculator/apptio-schedule.json`. All runtime consumers, manifest entries, build rules, and sync rules updated. Root copies and dist root copies removed. Build and sync no longer generate root copies.

**Changes:**

1. **`plugins/salesforce/content/sf-content.js` created:** Active Salesforce content script relocated from root `sf-content.js` to `plugins/salesforce/content/sf-content.js`. Consistent with Cloudability structure (`plugins/cloudability/content/`).

2. **`manifest.json` updated:** `content_scripts[0].js` changed from `["sf-content.js"]` to `["plugins/salesforce/content/sf-content.js"]`. `web_accessible_resources` updated: `"sf-content.js"` replaced with `"plugins/salesforce/content/sf-content.js"`; `"apptio-schedule.json"` replaced with `"plugins/apptio-upgrade-calculator/apptio-schedule.json"`.

3. **`plugins/salesforce-case-extractor.js` updated:** `safeInject()` `chrome.scripting.executeScript({ files: [...] })` updated from `['sf-content.js']` to `['plugins/salesforce/content/sf-content.js']`.

4. **`plugins/apptio-upgrade-calculator.js` updated:** `aucLoadLocal()` `chrome.runtime.getURL(...)` updated from `'apptio-schedule.json'` to `'plugins/apptio-upgrade-calculator/apptio-schedule.json'`.

5. **`build/webpack.config.js` updated:** Both copy rules updated to emit plugin-owned paths. `apptio-schedule.json` rule output: `'apptio-schedule.json'` changed to `'plugins/apptio-upgrade-calculator/apptio-schedule.json'`. `sf-content.js` rule source changed to `plugins/salesforce/content/sf-content.js`; output changed to `'plugins/salesforce/content/sf-content.js'`.

6. **`build/sync-root.js` simplified:** Removed `PLUGIN_OWNED_MAP` (source-to-root copy step). Removed `sf-content.js` and `apptio-schedule.json` from `SYNC_MAP`. Plugin-owned files covered by `plugins/ -> dist/plugins/` directory sync. Repository root no longer used as generated output storage.

7. **Root and dist root copies deleted:** `sf-content.js`, `apptio-schedule.json`, `dist/sf-content.js`, `dist/apptio-schedule.json` removed. Not recreated by sync or build.

8. **`plugins/documentation.js` updated:** User-visible reference to `apptio-schedule.json` filename replaced with generic description.

9. **Documentation updated:** `AGENTS.md` (§3, §4, §8), `docs/WORKING_DIRECTORY.md`, `docs/PACKAGING.md`, `docs/plugins/apptio-upgrade-calculator.md`, `docs/plugins/salesforce-case-extractor.md`, `src/README.md`.

**Files changed:**
- `plugins/salesforce/content/sf-content.js` - CREATED: active content script at plugin-owned path
- `sf-content.js` - DELETED: root copy removed
- `apptio-schedule.json` - DELETED: root copy removed
- `dist/sf-content.js` - DELETED
- `dist/apptio-schedule.json` - DELETED
- `manifest.json` - content_scripts and web_accessible_resources updated
- `plugins/salesforce-case-extractor.js` - safeInject executeScript path updated
- `plugins/apptio-upgrade-calculator.js` - aucLoadLocal getURL path updated
- `build/webpack.config.js` - both plugin-owned copy rules updated
- `build/sync-root.js` - PLUGIN_OWNED_MAP and stale SYNC_MAP entries removed
- `plugins/documentation.js` - user-visible path reference removed
- `AGENTS.md` - §3, §4, §8 updated
- `docs/WORKING_DIRECTORY.md` - file map updated
- `docs/PACKAGING.md` - sync table and content-script guide updated
- `docs/plugins/apptio-upgrade-calculator.md` - Schedule Retrieval updated
- `docs/plugins/salesforce-case-extractor.md` - Content Script section updated
- `src/README.md` - What is active table updated
- `dist/*` - all runtime mirrors re-synced

**Breaking changes:** None for users. All functionality preserved. Internal extension package paths changed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---



## [1.44.0] - 2026-08-08
### Platform - Bob Helper PowerShell management script
**Type:** Feature
**Summary:** Introduces `tools/bob-helper.ps1`, a pure PowerShell management script for the Bob Helper server. Adds 8-check pre-flight validation including GPO execution policy detection, Scheduled Task auto-start management, and a convenience wrapper over the server lifecycle. Updates all user-visible remediation strings to reference the new `bob-helper.ps1 start` command. Re-baselines `docs/reports/bob-helper-ps1-implementation-guide.md` against v1.43.10.

**Changes:**

1. **`tools/bob-helper.ps1` created:** 192-line PowerShell management script. Verbs: `check` (8 pre-flight checks), `start` (foreground launch with Node >= 18 guard), `stop` (health-probe-first PID lookup, CimInstance fallback), `status` (all 7 `/health` fields), `install` (Windows Scheduled Task, no admin, 15s delay, XmlConvert type-safe), `uninstall [-Kill]`, `help`. Compatible with Windows PowerShell 5.1+.

2. **GPO execution policy detection (new capability):** `check` verb CHECK 6 detects `MachinePolicy` and `UserPolicy` execution policies set to `AllSigned` or `Restricted` and outputs an IT contact message. CHECK 6b detects a restrictive `REPLYCATORS_PS_EXEC_POLICY` environment variable that would cause silent Execute failures. Neither check existed in the deleted `bob-helper.cmd`.

3. **Legacy Scheduled Task detection (new capability):** `check` verb CHECK 7 inspects any existing task named `ReplyCators Bob Helper` - if it finds a cmd.exe action (from a pre-v1.43.9 `bob-helper.cmd install`), it outputs a WARN with the exact re-registration command. Users who installed the task before v1.43.9 should run `bob-helper.ps1 install` to update it.

4. **User-visible remediation strings updated:** All 7 user-facing strings in `dashboard.js` (diagnostics panel remediation) and `plugins/salesforce-case-extractor.js` (button tooltip, exec panel status, activity log) updated from `node tools\bob-helper-server.js` to `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start`. This makes the management interface discoverable from the first point of failure.

5. **Documentation updated:** `docs/INSTALLATION.md` (12 bob-helper.cmd refs replaced), `docs/plugins/salesforce-case-extractor.md` (3 refs replaced), `docs/BOB-HELPER-SERVER.md` Setup and Management table expanded with all 6 PS1 verbs, `docs/TROUBLESHOOTING.md` new GPO policy section added, `plugins/documentation.js` (2 locations updated), `AGENTS.md` tools tree + §23 + §24 updated.

6. **Implementation guide re-baselined:** `docs/reports/bob-helper-ps1-implementation-guide.md` re-baselined against v1.43.10. Score updated from 81 to 92. All stale V1-V5 prerequisite values corrected. Phases 4 and 5 marked complete. Phase 3 task list rewritten for post-cleanup-plan state. Finding B retracted (companion document exists).

**Files changed:**
- `tools/bob-helper.ps1` - CREATED: PowerShell management script v1.0.0
- `plugins/salesforce-case-extractor.js` - 3 user-visible strings updated to PS1 invocation
- `dashboard.js` - 4 remediation strings updated to PS1 invocation; header version bumped
- `plugins/documentation.js` - 2 in-extension references updated
- `docs/BOB-HELPER-SERVER.md` - Setup and Management section expanded
- `docs/TROUBLESHOOTING.md` - GPO section added
- `docs/INSTALLATION.md` - All 12 bob-helper.cmd references replaced
- `docs/plugins/salesforce-case-extractor.md` - 3 prerequisite commands replaced
- `AGENTS.md` - tools tree, §23 Documentation Map, §24 Known Limitations, version updated
- `docs/reports/bob-helper-ps1-implementation-guide.md` - full re-baseline against v1.43.10
- `dist/*` - all runtime mirrors synced

**Breaking changes:** None. `bob-helper.ps1 start` starts the same `bob-helper-server.js` that the extension communicates with. HTTP API, port, and extension integration are unchanged.

**Migration note:** Users who registered a Scheduled Task via `bob-helper.cmd install` before v1.43.9 will have a task pointing to the deleted CMD file. Run `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install` to re-register with the PowerShell action. The `check` verb CHECK 7 detects this condition and outputs the exact command.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.44.1] - 2026-08-09
### Platform - Repository source ownership reorganization
**Type:** Refactor
**Summary:** Established correct architectural ownership for plugin-owned source files that were previously located at the repository root. Moved `apptio-schedule.json` to its owning plugin directory. Established `src/plugins/SalesforceExtractor/content/sf-content.js` as the canonical source for the Salesforce content script. Both files now generate root copies via `build/sync-root.js` for ADR-001 developer-mode loading, while canonical sources live with their owning plugins. Removed stale `src/assets/styles/` scaffold. Updated all documentation to reflect the new source ownership model.

**Changes:**

1. **`apptio-schedule.json` relocated:** Canonical source moved from repository root to `plugins/apptio-upgrade-calculator/apptio-schedule.json`. Root copy (`apptio-schedule.json`) and `dist/apptio-schedule.json` are now generated/maintained by `build/sync-root.js`. Extension package path `apptio-schedule.json` unchanged - manifest `web_accessible_resources` and `chrome.runtime.getURL('apptio-schedule.json')` in `plugins/apptio-upgrade-calculator.js` require this package-root path.

2. **`sf-content.js` source ownership established:** Canonical source confirmed as `src/plugins/SalesforceExtractor/content/sf-content.js` (pre-existing). Root `sf-content.js` is a generated copy maintained by `build/sync-root.js`. Manifest `content_scripts` path `sf-content.js` unchanged.

3. **`build/sync-root.js` restructured:** Added `PLUGIN_OWNED_MAP` table (canonical source -> root copy sync step). Script now performs two-phase sync: (1) plugin-owned canonical source -> root copy; (2) root -> dist/. Comment header updated to document ownership model.

4. **`build/webpack.config.js` updated:** `apptio-schedule.json` copy rule now sources from `plugins/apptio-upgrade-calculator/apptio-schedule.json`. `sf-content.js` copy rule confirmed sourcing from `src/plugins/SalesforceExtractor/content/sf-content.js`.

5. **Stale `src/assets/styles/` removed:** `src/assets/styles/platform.css` and `src/assets/styles/dashboard.css` were scaffold stubs with no consumers - deleted. `src/assets/` directory removed.

6. **Stale documentation stubs removed:** `docs/ICON-SYSTEM-IMPLEMENTATION.md` and `docs/ICON-SYSTEM-VALIDATION.md` were 16-line redirect-only stubs with no content - deleted.

7. **Documentation updated across all affected files:** `AGENTS.md` (§3 Dual Implementation Map, §4 Repository Structure tree, §8 Plugin Source Locations table and Content Scripts table), `docs/WORKING_DIRECTORY.md` (file map rewritten as three-column source/root/dist table), `docs/PACKAGING.md` (Root and dist/ Sync section and Adding New Plugin Content Scripts section rewritten), `docs/plugins/apptio-upgrade-calculator.md` (Schedule Retrieval table), `docs/plugins/salesforce-case-extractor.md` (Content Script section), `src/README.md` (What is active table).

**Files changed:**
- `plugins/apptio-upgrade-calculator/apptio-schedule.json` - CREATED: canonical source (moved from repository root)
- `apptio-schedule.json` - now a generated root copy (content unchanged)
- `build/sync-root.js` - restructured with PLUGIN_OWNED_MAP; comment header updated
- `build/webpack.config.js` - apptio-schedule.json source path updated; sf-content.js copy rule confirmed
- `src/assets/styles/platform.css` - DELETED: stale scaffold, no consumers
- `src/assets/styles/dashboard.css` - DELETED: stale scaffold, no consumers
- `docs/ICON-SYSTEM-IMPLEMENTATION.md` - DELETED: redirect-only stub
- `docs/ICON-SYSTEM-VALIDATION.md` - DELETED: redirect-only stub
- `AGENTS.md` - §3, §4, §8 updated with correct source ownership references
- `docs/WORKING_DIRECTORY.md` - file map rewritten
- `docs/PACKAGING.md` - sync and content-script sections rewritten
- `docs/plugins/apptio-upgrade-calculator.md` - Schedule Retrieval table updated
- `docs/plugins/salesforce-case-extractor.md` - Content Script section updated
- `src/README.md` - What is active table updated

**Breaking changes:** None. All extension package paths unchanged. `apptio-schedule.json` still resolves at package root. `sf-content.js` still resolves at package root. All manifest entries, runtime URLs, and `chrome.scripting.executeScript` paths unchanged.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.43.10] - 2026-08-08
### Platform - Notification audit: silent failure remediation across 5 plugins
**Type:** Bug Fix
**Summary:** Comprehensive notification audit across all 10 installed plugins. Resolved 8 silent failure cases where user-triggered operations failed without any persistent notification or toast. All 6 affected files now consistently use `addNotification()` on failure, matching the established pattern in Salesforce Case Extractor, Workspace Starter, and Cloudability OrgID. Apptio Documentation Finder assessed in detail: its notification behavior is consistent and correct - the perceived gap was due to it being a search/navigation plugin where successful operations open a browser tab (immediate feedback) rather than producing a persistent result. One missing `addLog` added for sources reset.

**Changes:**

1. **`plugins/tab-search.js` - clipboard failure notification:** `copyToClipboard()` catch block added `addNotification('Tab Search', 'Clipboard write failed.', 'error', ...)`. Previously only logged.
2. **`plugins/apptio-upgrade-calculator.js` - clipboard failure notification:** `aucCopyText()` catch block added `addNotification` for clipboard write failure. Previously only logged.
3. **`plugins/salesforce-case-extractor.js` - three clipboard failure notifications:** (a) Download path copy `.catch()` expanded from one-liner to add `addNotification`. (b) Main case copy `catch` block added `addNotification`. (c) Copy-with-prompt `catch` block added `addNotification`. All were previously only logged or had inline-status-only.
4. **`plugins/bookmark-finder.js` - clipboard failure notification:** URL copy `.then()` expanded to add `.catch()` handler with `addLog` + `addNotification`. Previously had no rejection handling at all.
5. **`plugins/backup-restore.js` - export and import-apply failure notifications:** Export `catch` added `addNotification('Backup & Restore', 'Export failed: ...', 'error', ...)`. Import apply `catch` added `addNotification('Backup & Restore', 'Import failed - previous settings restored.', 'error', ...)`. Both previously had inline status and log but no persistent notification.
6. **`plugins/apptio-docs-finder.js` - sources reset log:** Reset sources/quick-links handler added `addLog('info', ...)` for the reset action. Previously had no log entry.

**Files changed:**
- `plugins/tab-search.js` - `copyToClipboard()` catch: added `addNotification`
- `plugins/apptio-upgrade-calculator.js` - `aucCopyText()` catch: added `addNotification`
- `plugins/salesforce-case-extractor.js` - three clipboard catch blocks: added `addNotification`
- `plugins/bookmark-finder.js` - URL copy: added `.catch()` with `addLog` and `addNotification`
- `plugins/backup-restore.js` - export and import-apply catch blocks: added `addNotification`
- `plugins/apptio-docs-finder.js` - sources reset handler: added `addLog`
- `dist/plugins/*` - all runtime mirrors synced

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.43.9] - 2026-08-08
### Platform - Bob Helper cleanup: CMD removal, server optimization, documentation enhancement
**Type:** Refactor | Bug Fix
**Summary:** Executes the Bob Helper cleanup plan from `docs/reports/bob-helper-cleanup-plan.md`. Eliminates the CMD/PowerShell hybrid architecture by removing `tools/bob-helper.cmd` (688 lines), optimizes the server with three targeted fixes, and remediates documentation gaps across six files. The SF Extractor Execute workflow, background relay protocol, and HTTP API contract are fully preserved.

**Changes:**

1. **`tools/bob-helper.cmd` deleted (Phase 5):** The 688-line CMD management script is removed. All user-visible references to `bob-helper.cmd` in extension UI, diagnostics remediation text, tooltips, activity log messages, and in-extension documentation are updated to `node tools\bob-helper-server.js`. Historical references in CHANGELOG.md and `docs/reports/` are preserved as-is.

2. **Per-request launcher copy removed (Phase 3.1 - TD-03):** The `writeLauncherFile()` function and its per-request file copy to `%TEMP%\replycators-bob-helper\<reqId>.ps1` are removed. The server now spawns directly from the stateless `tools/bob-launcher-template.ps1`. All request-specific data flows through environment variables (unchanged behavior). Error response and log fields referring to `launcherPath` cleaned up.

3. **Bob CLI cache TTL reduced to 60 seconds (Phase 3.2 - F-06):** `BOB_RESOLVE_TTL_MS` changed from `5 * 60 * 1000` (5 minutes) to `60 * 1000` (60 seconds). A freshly installed `bobshell` is now detected within 60 seconds instead of up to 5 minutes.

4. **`validateWorkingDir()` traversal hardening (Phase 3.3 - S-03):** Adds explicit `..` segment detection after the existing `%` and `"` checks. Splits the path on both forward-slash and backslash and checks each segment; valid absolute Windows paths and UNC paths are never rejected. HTTP 400 returned with a clear error message on traversal attempt.

5. **`REPLYCATORS_PS_EXEC_POLICY` documented everywhere (Phase 2.1 / F-10):** The undocumented server env var is now documented in: (1) `tools/bob-helper-server.js` inline comment with WARNING about `AllSigned`/`Restricted` causing silent Execute failure; (2) `docs/BOB-HELPER-SERVER.md` new Environment Variables section; (3) `AGENTS.md` Known Limitations; (4) `docs/TROUBLESHOOTING.md` new "Execute always fails silently" section.

6. **`docs/BOB-HELPER-SERVER.md` enhanced (Phase 2.2 - TD-04):** Four new sections added: Environment Variables, Execution Flow (14-step end-to-end), Process Management Model, and Extension Messaging Protocol. Response examples corrected from simplified `success` payload to actual `ok`-based server payloads. Architecture and Setup sections updated to reflect removal of per-request copy and CMD management script.

**Files changed:**
- `tools/bob-helper.cmd` - DELETED
- `tools/bob-helper-server.js` - inline comment updated; `writeLauncherFile()` removed; `BOB_RESOLVE_TTL_MS` 300s -> 60s; `validateWorkingDir()` traversal check added; spawn updated to use `LAUNCHER_TEMPLATE_PATH` directly; error/log payloads cleaned of `launcherPath`
- `docs/BOB-HELPER-SERVER.md` - full enhancement: 4 new sections; response examples corrected; architecture and setup updated
- `AGENTS.md` - repository structure updated (bob-helper.cmd removed from tools tree); Known Limitations updated (start command + REPLYCATORS_PS_EXEC_POLICY)
- `docs/TROUBLESHOOTING.md` - IBM Bob Execute section: start command updated, cache TTL note corrected, silent failure section added, debug logging updated
- `dashboard.js` - 4 diagnostics remediation strings updated
- `plugins/salesforce-case-extractor.js` - 3 user-visible strings updated (activity log, button tooltip, exec panel status)
- `plugins/documentation.js` - 3 in-extension documentation references updated
- `dist/*` - all runtime mirrors synced

**Breaking changes:** None to extension functionality. `tools/bob-helper.cmd` is no longer present; users who relied on it should use `node tools\bob-helper-server.js` directly. The `/execute` HTTP response no longer includes `launcherPath` in success or error payloads - any external tooling that parsed this field must be updated.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.43.8] - 2026-08-08
### Platform - Popup size guardrails + side-panel misclassification fix
**Type:** Bug Fix | Feature
**Summary:** Two fixes to the popup window sizing feature introduced in v1.43.7. (1) Corrects preset and custom dimension values that exceeded the Chrome/Edge action-popup hard limit of 800x600 px - Large preset corrected from 960x700 to 800x600, custom input bounds clamped from 400-1600/300-1200 to 400-800/300-600, stored over-limit values auto-corrected on next load. (2) Fixes a side-panel misclassification bug: when a popup larger than 800px was configured, the asynchronous browser window resize meant window.innerWidth still reported 800 when detectAndApplySidePanelMode() ran, causing a non-800 RC_POPUP_WIDTH comparison to falsely identify the popup as a side panel and apply body.rc-sidepanel overrides, breaking popup layout.

**Root cause (side-panel misclassification):**
- applyPopupSize() sets RC_POPUP_WIDTH = 960 synchronously but Chrome resizes the window asynchronously
- detectAndApplySidePanelMode() runs in the same synchronous block: window.innerWidth(800) !== RC_POPUP_WIDTH(960) = true, falsely classified as side panel
- body.rc-sidepanel applied: 100vw/100vh overrides, fluid CSS, sidebar expanded — popup layout broken

**Fix:**
- Added const _startupIsSidePanel = window.innerWidth !== 800 evaluated at script-parse time (before any JS CSS resize)
- Added let _isConfiguredPopup set to !_startupIsSidePanel by applyPopupSize()
- detectAndApplySidePanelMode() returns early when _isConfiguredPopup is true (definitively popup context)
- initSidebarResize() and restoreSidebarWidth() use _startupIsSidePanel for reliable side-panel-only activation
- sidebar hint pulse uses _isConfiguredPopup to fire correctly in all popup sizes
- POPUP_BROWSER_MAX_W = 800, POPUP_BROWSER_MAX_H = 600 constants guard all dimension logic

**Files changed:**
- `dashboard.js` - POPUP_BROWSER_MAX_W/H constants; fixed POPUP_SIZE_PRESETS.large; _startupIsSidePanel and _isConfiguredPopup flags; clamped custom value validation and stored-value migration; updated detectAndApplySidePanelMode, initSidebarResize, restoreSidebarWidth, sidebar hint
- `dashboard.html` - Large option label corrected to 800x600; custom input max attributes corrected; description text updated
**Breaking changes:** None - Large preset now correctly maps to 800x600 (the actual browser max). Any previously-stored custom width/height values exceeding 800/600 are silently clamped on next open.
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.43.7] - 2026-08-08
### Platform - Design system unification: SF and ADF tab content layout + card containment
**Type:** UI | Architecture
**Summary:** Full design-system unification of Salesforce Case Extractor and Apptio Documentation Finder tab content areas. Both plugins now render with the same visual rhythm as all compliant plugins: 16px padding from the tab bar to content, content areas contained in card structures with 8px border-radius headers, and `background: var(--rc-bg)` on tab panel backgrounds. The SF Extract tab toolbar/workspace is wrapped in a card shell with rounded corners. SF Prompt Management and Download History tabs each receive a card wrapper (`sf-mgmt-card`, `sf-dl-card`) around their toolbar and content. ADF tab panels are updated from 12px/10px to 16px/14px (matching `rc-plugin-body`). First-run card and debug panel border-radius normalized to 8px.

**Files changed:**
- `styles/dashboard.css` - added `#tab-extract`, `#tab-management`, `#tab-history` panel background and padding rules; added `.sf-mgmt-card`, `.sf-dl-card` card wrapper classes; updated `.sf-extract-toolbar` and `.sf-extract-options` to use side/bottom border structure with 8px top radius and `margin: 0 10px`; updated `.sf-extract-workspace` with matching margin and bottom radius; updated `.sf-mgmt-toolbar` and `.sf-dl-toolbar` with `border-radius: 8px 8px 0 0`; updated `.adf-tab-panel` padding/gap to 16px/14px; `.adf-debug-panel` radius 6px -> 8px; `.adf-fr-card` radius 10px -> 8px
- `dashboard.html` - SF tab 2 (Prompt Management) and tab 3 (Download History) content wrapped in `sf-mgmt-card` and `sf-dl-card` div wrappers respectively
- `dist/*` - synced
**Breaking changes:** None - all changes are CSS layout and HTML structural wrapper additions; all IDs, event handlers, and JS logic unchanged

### Platform - Compact card density + user-configurable popup window size
**Type:** Enhancement | Feature
**Summary:** Two improvements. (1) Environment Dashboards Launcher card layout is tightened for better information density - more cards fit on screen without scrolling while all content and buttons remain accessible. (2) New "Popup Window Size" setting lets users choose Small (680x480), Medium (800x580, default), Large (960x700), or Custom dimensions for the popup window. Side Panel mode is unaffected.

**Files changed:**
- `styles/dashboard.css` - compact EDL card CSS: reduced padding, gap, margins, border-radius, and hint spacing; popup sizing now uses --rc-popup-w / --rc-popup-h CSS custom properties instead of hard-coded px values; .rc-shell updated to use the same variables
- `dashboard.js` - RC_POPUP_WIDTH changed to `let`; added POPUP_SIZE_PRESETS constant; added `popupSize`, `popupCustomWidth`, `popupCustomHeight` to DEFAULT_SETTINGS; added `applyPopupSize()` function; called from `applyAllSettings()` and `syncSettingsUI()`; wired three new settings event handlers
- `dashboard.html` - added "Popup Window Size" settings group after "Extension Behavior" with size preset select and conditionally visible custom dimensions row
- `manifest.json`, `package.json`, `dist/*` - version bump and sync
**Breaking changes:** None - all new settings default to the existing 800x580 medium preset; existing user preferences are unaffected
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.43.6] - 2026-08-08
### Platform - Root cause fix: plugin view container architecture (position:absolute removed)
**Type:** Bug Fix | Architecture
**Summary:** Identifies and removes the root cause of the edge-to-edge header rendering in Apptio Documentation Finder and Salesforce Case Extractor. Both views used `position: absolute; inset: 0; padding: 0 !important` at the `#view-plugin-*` ID level, which tore the views out of normal document flow, pinned them flush to all four edges of their container, and stripped the 16px padding that produces the card-gap visible in all compliant plugins. This was not a header CSS problem — it was a container architecture problem. Fix: remove both ID-level overrides entirely; add `.rc-plugin-page.rc-view--active { display: flex; flex: 1; flex-direction: column }` so plugin views participate in the flex chain of `rc-view-container` and fill available height correctly with their 16px padding intact.

**Root cause (structural):**
- `#view-plugin-salesforce` and `#view-plugin-apptio-docs-finder` both had `position: absolute; inset: 0` — this pinned the view flush to the `rc-view-container` edges (which has `position: relative`), removing all parent padding
- `padding: 0 !important` overrode the `rc-view { padding: 16px }` base rule — this is the 16px that creates the card-gap visible in compliant plugins
- `display: flex; flex-direction: column` at the ID level changed the layout model from `display: block` (base `.rc-view--active`) — other plugin views do NOT set this
- The net result: header flush to left/top/right edges, no whitespace around it, not visually distinct from the view container

**Why compliant plugins look correct:**
- Edge Bookmark Finder, Cloudability, Workspace Starter, Tab Search, etc. — zero ID-level overrides
- They inherit `rc-view { padding: 16px }` and `rc-view--active { display: block }` unchanged
- `rc-plugin-header` sits inside the padded block, rendering as a card with 16px whitespace on all sides

**Fix - `styles/dashboard.css`:**
- Removed `#view-plugin-salesforce` block (22 lines, including both `display:none` and `.rc-view--active` rules)
- Removed `#view-plugin-apptio-docs-finder` block (16 lines, including both rules)
- Added `.rc-plugin-page.rc-view--active { display: flex; flex: 1; flex-direction: column }` — scoped only to plugin-page views so Dashboard/Settings/etc. keep `display: block`
- Simplified `#adf-docs-container` (removed `position: relative`, simplified `flex` shorthand)

**Files changed:**
- `styles/dashboard.css` - removed 2 ID-level view overrides; added 1 scoped platform rule
- `dist/styles/dashboard.css` - synced
**Breaking changes:** None - visual/layout fix only; no IDs, storage keys, APIs, or functional behavior changed
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

### Platform - Header component standardization: Apptio Docs Finder + Salesforce Case Extractor
**Type:** UI | Architecture | Bug Fix
**Summary:** Eliminates the remaining header-component inconsistency in Apptio Documentation Finder and Salesforce Case Extractor. Root causes: (1) ADF's `_renderMainUI()` injected `rc-plugin-tabs` inside the scrollable `rc-plugin-body` container, placing the tab bar in the scroll region rather than as a fixed sibling of `rc-plugin-header`; (2) ADF used a private `adf-tab-content` class instead of the platform-standard `rc-plugin-tab-panel`; (3) Salesforce had a stale header name ("SF Case Extractor") and mismatched version badge (`v4.7.2` vs `v4.9.1` in PLUGINS[]). Both plugins now use the identical DOM hierarchy, CSS classes, and layout approach as every other compliant plugin.

**Root causes:**
- ADF tab bar was rendered by JS into `#adf-docs-container.rc-plugin-body`, inside the scroll region, not as a direct sibling of `rc-plugin-header`
- ADF used private `adf-tab-content` class with duplicated flex/overflow/padding CSS instead of `rc-plugin-tab-panel`
- Private `adf-tab-bar` and `adf-tab` CSS remained in `dashboard.css` as a dead parallel tab system
- Salesforce header `__name` said "SF Case Extractor" (should be "Salesforce Case Extractor" per PLUGINS[])
- Salesforce header `__version` said `v4.7.2` (stale; PLUGINS[] has 4.9.1)

**Fix - `dashboard.html` (Apptio Documentation Finder):**
- Moved `rc-plugin-tabs` tab bar to static HTML as a direct sibling of `rc-plugin-header`, with `hidden` attribute until `onNavigate()` renders the main UI
- Changed `#adf-docs-container` class from `rc-plugin-body` to `adf-panels-host` (flex column, fills remaining height)
- Initial loading placeholder now has `id="adf-initial-loading"` so JS can remove it cleanly

**Fix - `dashboard.html` (Salesforce Case Extractor):**
- `rc-plugin-header__name` corrected from "SF Case Extractor" to "Salesforce Case Extractor"
- `rc-plugin-header__version` corrected from `v4.7.2` to `v4.9.1` to match PLUGINS[]

**Fix - `plugins/apptio-docs-finder.js`:**
- `_renderMainUI()` no longer injects a tab bar; instead reveals the static `#adf-tab-bar` and removes `#adf-initial-loading`
- Tab panel divs changed from `adf-tab-content` to `rc-plugin-tab-panel adf-tab-panel`
- `_showTab()`, `_showOverlay()`, `_closeOverlay()` now toggle `rc-plugin-tab-panel--active` class alongside the `hidden` attribute

**Fix - `styles/dashboard.css`:**
- Removed `adf-tab-bar`, `.adf-tab`, `.adf-tab--active`, `.adf-tab--active::after` (duplicated private tab system)
- Replaced `adf-tab-content` with `adf-tab-panel` (padding+gap only; `rc-plugin-tab-panel` provides flex/overflow/min-height)
- Updated `#view-plugin-apptio-docs-finder` comment to reflect new layout architecture

**Files changed:**
- `dashboard.html` - ADF tab bar moved to static HTML; SF name and version corrected
- `plugins/apptio-docs-finder.js` - tab bar injection removed; `adf-tab-content` migrated to `rc-plugin-tab-panel`
- `styles/dashboard.css` - private ADF tab system removed; `adf-tab-content` replaced with `adf-tab-panel`
- `dist/dashboard.html`, `dist/plugins/apptio-docs-finder.js`, `dist/styles/dashboard.css` - synced
**Breaking changes:** None - structural/visual fix only; no IDs, storage keys, APIs, or functional behavior changed
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

### Platform - Icon size normalization: context-aware rendering + header height fix
**Type:** Bug Fix
**Summary:** Fixes plugin header heights being taller than the 44px spec on Salesforce Case Extractor and Apptio Documentation Finder (and potentially others). Root cause: `renderSemanticIcons()` used a flat 24px default for all `[data-icon]` elements, causing SVG icons to overflow their 20px constrained containers and push header row height beyond 44px. Fix adds a context-aware size lookup (`_iconSize()`) and CSS overflow guards on all constrained icon containers.

**Root cause:**
`renderSemanticIcons()` called `renderIcon(id, { size: 24 })` for every `[data-icon]` element regardless of context. The `.rc-plugin-header__icon` container was `20x20px` with `display:flex` but without `overflow:hidden`, so a 24px img inflated the header row.

**Fix - `dashboard.js`:**
- `renderSemanticIcons()` now calls `_iconSize(el)` before rendering each icon
- `_iconSize()` returns the correct pixel size based on the nearest ancestor container class:
  - `.rc-plugin-header__icon` -> 20px (was 24px - was causing header height bug)
  - `.rc-nav__icon` -> 16px (fits 18px nav container)
  - `.rc-widget-card__title` -> 16px (inline with 12px text)
  - `.rc-doc-icon` -> 16px (24x24 button, 16px icon)
  - `.rc-panel-docs-btn` -> 14px
  - default -> 24px (unchanged for large icon contexts)

**Fix - `styles/platform.css`:**
- `.rc-plugin-header__icon`: added `overflow: hidden` defensive guard
- `.rc-plugin-header__icon img`: enforces `width: 20px; height: 20px` via `!important` to override inline `width`/`height` attributes on the rendered `<img>`

**Fix - `styles/dashboard.css`:**
- `.rc-nav__icon`: added `overflow: hidden; display: flex; align-items: center; justify-content: center`
- `.rc-nav__icon img`: enforces `width: 16px; height: 16px`
- `.rc-widget-card__title`: changed to `display: inline-flex; align-items: center; gap: 5px`
- `.rc-widget-card__title img`: enforces `width: 16px; height: 16px`

**All three plugin headers now render at identical 44px height with 20px icons.**

**Files changed:**
- `dashboard.js` - `renderSemanticIcons()` context-aware `_iconSize()` function
- `styles/platform.css` - `.rc-plugin-header__icon` overflow guard + img size enforcement
- `styles/dashboard.css` - nav icon + widget card title icon size guards
**Breaking changes:** None - visual fix only; no IDs, storage keys, or APIs changed
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.43.5] - 2026-08-08
### Platform - Final design system enforcement: tab panel migration, body class normalization, dead CSS removal
**Type:** Enhancement
**Summary:** Completes the platform design system enforcement cycle. Migrates Salesforce tab panels from legacy `sf-tab-panel` / `.active` to `rc-plugin-tab-panel` / `rc-plugin-tab-panel--active`. Normalizes all JS-rendered plugin body containers (Workspace Starter, Tab Search, Apptio Docs Finder, Environment Dashboards) to `rc-plugin-body`. Removes 68 lines of dead legacy CSS (`sf-plugin-bar`, `sf-inner-tabs`, `sf-inner-tab`, `sf-tab-panel`). Adds `rc-plugin-tab-panel--overflow-hidden` modifier for inner-scroll panels.

**Salesforce Case Extractor - tab panel migration:**
- `#tab-extract` class: `sf-tab-panel active` -> `rc-plugin-tab-panel rc-plugin-tab-panel--active rc-plugin-tab-panel--overflow-hidden`
- `#tab-management` class: `sf-tab-panel` -> `rc-plugin-tab-panel`
- `#tab-history` class: `sf-tab-panel` -> `rc-plugin-tab-panel`
- `role="tabpanel"` + `aria-labelledby` attributes added to all three panels
- `_sfSwitchTab()` JS: `panel.classList.toggle('active', ...)` -> `panel.classList.toggle('rc-plugin-tab-panel--active', ...)`

**Body container normalization (4 plugins):**
- `#ws-plugin-container`: inline `style="flex:1..."` -> `class="rc-plugin-body"` (ID preserved)
- `#ts-plugin-container`: inline `style="flex:1..."` -> `class="rc-plugin-body"` (ID preserved)
- `#adf-docs-container`: inline `style="flex:1..."` -> `class="rc-plugin-body"` (ID preserved)
- `#edl-container`: inline `style="flex:1..."` -> `class="rc-plugin-body"` (ID preserved)

**Platform CSS addition:**
- `rc-plugin-tab-panel--overflow-hidden` modifier added to `styles/platform.css` for panels where inner content manages its own scroll

**Dead CSS removal from `styles/dashboard.css`:**
- `.sf-plugin-bar` - removed (was replaced by `.rc-plugin-header`)
- `.sf-plugin-title` - removed
- `.sf-plugin-badge` - removed (was replaced by `.rc-plugin-header__version`)
- `.sf-inner-tabs` / `.sf-inner-tabs::-webkit-scrollbar` - removed (was replaced by `.rc-plugin-tabs`)
- `.sf-inner-tab` / `.sf-inner-tab:hover` / `.sf-inner-tab.active` - removed (was replaced by `.rc-plugin-tab`)
- `.sf-tab-panel` / `.sf-tab-panel.active` - removed (was replaced by `.rc-plugin-tab-panel`)
- Replacement comment added for future reference

**Design system completeness — all 10 plugins now use exclusively:**
- `rc-plugin-page` (view wrapper)
- `rc-plugin-header` (+ `__icon`, `__name`, `__version`)
- `rc-plugin-tabs` / `rc-plugin-tab` / `rc-plugin-tab--active` (tab bar)
- `rc-plugin-tab-panel` / `rc-plugin-tab-panel--active` (tab panels)
- `rc-plugin-body` (scrollable content area)
- `rc-plugin-action-bar` (primary actions)
- `rc-doc-icon` (documentation button)

**Files changed:**
- `dashboard.html` - SF tab panels migrated; 4 body containers normalized
- `plugins/salesforce-case-extractor.js` - _sfSwitchTab() uses rc-plugin-tab-panel--active
- `styles/platform.css` - rc-plugin-tab-panel--overflow-hidden modifier added
- `styles/dashboard.css` - 68 lines of dead legacy CSS removed
**Breaking changes:** None — all element IDs preserved; JS behavior unchanged
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

## [1.43.4] - 2026-08-08
### Platform - Primary workflow consistency audit: SF status badge, ADF tabs, CLD cleanup, EDL simplification
**Type:** Enhancement + Bug Fix
**Summary:** Second round of platform-wide UX consistency work. Resolves four specific deviations identified through screenshot audit: Salesforce missing header status badge, Apptio Docs Finder using private tab CSS, Cloudability exposing a diagnostic control in the primary action bar, and Environment Dashboards carrying an unnecessary Notifications tab. Adds `Primary Workflow First` governance section to AGENTS.md.

**Salesforce Case Extractor - header status badge:**
- Removed `#sf-tab-detection-banner` inline status bar from the Extract tab toolbar
- Added `#sf-status-badge` `rc-badge` to the plugin header (same pattern as Cloudability OrgID)
- `sfRefreshDetectionBanner()` refactored: new `_setBadge(text, type)` helper drives header badge
- Status vocabulary: `Connected` (green), `No active tab` (red), `Checking…` (amber), `Search mode` (amber), `Disabled` (red)
- Plugin header now matches Cloudability OrgID pattern: icon + name + version + status badge + doc icon

**Apptio Documentation Finder - platform tab standard:**
- `_renderMainUI()` now emits `rc-plugin-tabs` / `rc-plugin-tab` / `rc-plugin-tab--active` instead of `adf-tab-bar` / `adf-tab` / `adf-tab--active`
- `_showTab()` queries `.rc-plugin-tab[data-adf-tab]` and toggles `rc-plugin-tab--active`
- `_bindAll()` attaches click listeners to `.rc-plugin-tab[data-adf-tab]`
- `data-adf-tab` attribute preserved — tab routing logic unchanged
- `adf-tab-badge` span for Favorites count preserved on tab button
- Tab bar now visually identical to Salesforce Case Extractor and Environment Dashboards

**Cloudability OrgID - primary action bar cleanup:**
- Removed `Include in Diagnostics` button from primary action bar
- Primary action bar now contains only: `Refresh OrgID` + spacer + source label
- JS guards (`if (inclBtn)` / optional chaining) ensure no errors from removed element

**Environment Dashboards Launcher - Notifications tab removed:**
- Removed `Notifications` tab from plugin tab bar — plugin is now single-view
- Removed `edl-panel-notifications`, `edl-tab-notifications` HTML
- `edl-container` promoted to direct flex child of plugin page (no wrapping panel div)
- `setTab()` and `renderPluginNotifications()` functions removed from `env-dashboards.js`
- `_tabsWired` flag removed
- Plugin-scoped notifications remain available in the platform Notifications Center

**AGENTS.md governance:**
- Added `Primary Workflow First` section (5 rules + status badge vocabulary table)
- Forbidden Changes extended with 4 new violations (private tab systems, body status banners, diagnostic controls in action bar, unnecessary Notifications tabs)

**Files changed:**
- `dashboard.html` - SF header badge; CLD action bar; EDL tab bar + notifications panel removed
- `plugins/salesforce-case-extractor.js` - sfRefreshDetectionBanner() refactored
- `plugins/apptio-docs-finder.js` - tab HTML + _showTab() + _bindAll() updated
- `plugins/env-dashboards.js` - setTab(), renderPluginNotifications() removed; onNavigate() simplified
- `AGENTS.md` - Primary Workflow First section + Forbidden Changes extensions
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

## [1.43.3] - 2026-08-08
### Platform - Cloudability OrgID UX regression fix + platform-wide plugin identity standardization
**Type:** Bug Fix + Enhancement
**Summary:** Fixes a UX regression in the Cloudability OrgID plugin where the primary OrgID display was demoted below informational content. Adds mandatory version badges to all plugin headers, removes category badges, restores Snake plugin name in header, and introduces governance rules for Primary Workflow Protection and Plugin Identity Standard.

**Part 1 - Cloudability OrgID primary workflow restoration:**
- OrgID hero display (`.cld-primary-block`) promoted to first visible element in plugin body
- Refresh OrgID and Include in Diagnostics actions moved above fold to action bar immediately below header
- Source label moved inline with action bar
- Removed redundant card wrapper duplicating header-level information
- Info cards retained below primary block
- All element IDs preserved - zero JavaScript behavior changes

**Part 2 - Plugin Identity Standard (all 10 plugins):**
- Every plugin header now shows: icon + name + version + [optional status] + doc icon
- Added `.rc-plugin-header__version` to all 9 previously missing plugins
- Removed category badges: Productivity (x3), Enterprise (x1), Template (x1)
- Snake header restored to full standard (icon + name + version)
- Apptio Documentation Finder slim header upgraded to full standard header
- `.rc-plugin-header__name` now `flex:1` - version/status/doc-icon always align right

**Governance and SDK:**
- `AGENTS.md`: Primary Workflow Protection section added with content hierarchy and standardization guardrail
- `AGENTS.md`: Plugin Identity Standard section added with required elements, version rules, forbidden patterns
- `AGENTS.md`: Forbidden Changes extended with 5 new violations; Plugin Release Checklist extended
- `PLUGIN-SDK.md`: Primary Content First mandatory section added; version changed from optional to mandatory
- `tools/create-plugin.js`: Generated header now includes `rc-plugin-header__version v1.0.0`
- `styles/platform.css`: `.cld-primary-block`, `.cld-meta-row` added; `__name` flex:1

**Files changed:**
- `dashboard.html` - Cloudability OrgID restructured; all 9 plugin headers updated
- `styles/platform.css` - New primary-block styles + header name flex update
- `AGENTS.md` - Two new governance sections; checklist and forbidden changes updated
- `PLUGIN-SDK.md` - Primary Content First + forbidden header patterns
- `tools/create-plugin.js` - Version badge in generated header
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

## [1.43.2] - 2026-08-08

### Platform - Plugin UI Standard Design System

**Type:** Enhancement
**Summary:** Introduces a unified Platform UI Standard design system across all plugin views. Creates a comprehensive shared component library in `styles/platform.css`, migrates all plugin views in `dashboard.html` to use the standard components, updates the Plugin SDK reference, updates the Plugin Creator generator, and adds mandatory governance rules to `AGENTS.md`. This is the first step toward a consistent, platform-native look and feel across all plugins.

**Design system components added to `styles/platform.css`:**
- `.rc-plugin-page` - Standard plugin page flex wrapper (replaces bare `.rc-view`)
- `.rc-plugin-header` + `__icon`, `__name`, `__version` - Standard plugin header (replaces `.rc-panel-header` for plugins, `.sf-plugin-bar`)
- `.rc-plugin-body` - Standard scrollable content area (replaces `.rc-panel-body`)
- `.rc-plugin-section` + `__header`, `__title`, `__actions` - Standard section grouping
- `.rc-plugin-card` + `__header`, `__title`, `__meta`, `__body`, `__footer` - Standard card (replaces `.cld-result-card`, `.auc-stat`)
- `.rc-plugin-action-bar` + `__spacer` - Standard action row (primary action always first)
- `.rc-plugin-tabs` + `.rc-plugin-tab` + `.rc-plugin-tab--active` - Standard tab bar (replaces `.sf-inner-tabs`, `rc-unified-tabs` button-toggle pattern in plugins)
- `.rc-plugin-tab-panel` + `.rc-plugin-tab-panel--active` - Standard tab panels
- `.rc-plugin-empty` + `__icon`, `__title`, `__body` - Standard empty state
- `.rc-plugin-loading` - Standard loading indicator
- `.rc-plugin-status` + `--success/warning/error/info` - Standard status strip
- `.rc-plugin-kv` + `__label`, `__value` - Standard key-value metadata row
- `.rc-plugin-stat` + `__value`, `__label` + `.rc-plugin-stats-row` - Standard stat tiles
- `.rc-plugin-list` - Standard scrollable list container
- `.rc-plugin-list-item` + `__icon`, `__content`, `__title`, `__meta`, `__actions` - Standard interactive list item (RC-UX010 compliant)

**Plugin views migrated in `dashboard.html`:**
- Cloudability OrgID - `.rc-plugin-header`, `.rc-plugin-body`, `.rc-plugin-card`, `.rc-plugin-kv`, `.rc-plugin-card__footer` for actions
- Edge Bookmark Finder - `.rc-plugin-header`, `.rc-plugin-body`, `.rc-plugin-loading`
- Example Plugin - `.rc-plugin-header`, `.rc-plugin-body`, `.rc-plugin-section`, `.rc-plugin-action-bar`
- Apptio Planning Upgrade Calculator - `.rc-plugin-header`, `.rc-plugin-body`, `.rc-plugin-loading`
- Snake - `.rc-plugin-header` with slim variant, `.rc-plugin-page`
- Workspace Starter - `.rc-plugin-header`, standard body wrapper
- Tab Search - `.rc-plugin-header`, standard body wrapper
- Apptio Documentation Finder - `.rc-plugin-header` slim, `.rc-plugin-page`
- Salesforce Case Extractor - `.rc-plugin-header`, `.rc-plugin-header__version`, `.rc-plugin-tabs` replacing `.sf-plugin-bar`
- Environment Dashboards Launcher - `.rc-plugin-header`, `.rc-plugin-tabs` replacing `rc-view__header` + `rc-unified-tabs`

**JavaScript updated:**
- `plugins/salesforce-case-extractor.js` - Tab switching updated to use `.rc-plugin-tab` / `.rc-plugin-tab--active` (replaces `.sf-inner-tab` / `.active`)
- `plugins/env-dashboards.js` - Tab activation updated to use `.rc-plugin-tab` / `.rc-plugin-tab--active`

**Plugin SDK updated (`PLUGIN-SDK.md`):**
- Platform Standards section rewritten with new mandatory component reference table
- Mandatory plugin page structure documented with canonical HTML example
- Approved UI classes table updated to full component inventory
- Prohibited patterns list added

**Plugin Creator updated (`tools/create-plugin.js`):**
- Step 2 view template uses `.rc-view.rc-plugin-page`, `.rc-plugin-header`, `.rc-plugin-body`
- Generated `_renderView()` uses `.rc-plugin-empty` and `.rc-plugin-section`

**Governance updated (`AGENTS.md`):**
- New `§11 Plugin UI Standards` section added (core principle, page structure table, action rules, status rules, empty state rules)
- Forbidden Changes table extended with 5 new UI standard violations
- Plugin Release Checklist updated with mandatory platform standard sub-checklist
- Maintenance Requirements updated with `Plugin UI standard change` and `New shared plugin component` rows
- Documentation Accessibility Standard updated to reference `.rc-plugin-header` (replaces `.rc-panel-header`)

**Files changed:**
- `styles/platform.css` - Platform UI Standard component library added (~500 lines)
- `dashboard.html` - All 10 plugin views migrated to platform standard
- `plugins/salesforce-case-extractor.js` - Tab switching updated
- `plugins/env-dashboards.js` - Tab activation updated
- `PLUGIN-SDK.md` - Platform Standards section rewritten
- `tools/create-plugin.js` - Generator templates updated
- `AGENTS.md` - Plugin UI Standards section added, Forbidden Changes extended, checklists updated

**Breaking changes:** None - all changes are HTML/CSS class additions or replacements. All plugin IDs, storage keys, and functionality are unchanged. JavaScript behavior is identical. The old `.sf-inner-tab`/`.active` pattern is replaced with `.rc-plugin-tab`/`.rc-plugin-tab--active` in SF JS; the old `rc-btn--primary/ghost` tab toggle in env-dashboards is replaced with the same standard classes.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---


## [1.43.1] — 2026-08-07

### Platform - rc-doc-icon Standardization

**Type:** Enhancement
**Summary:** Replaces all legacy text Docs buttons (`rc-panel-docs-btn`, `rc-widget-docs-btn`) and the Environment Dashboards Help & Docs tab with a single consistent `rc-doc-icon` component - an icon-only button using the Streamline `navigation.documentation` SVG. Every plugin panel header and every widget card header now carries `rc-doc-icon` as the sole documentation entry point. AGENTS.md §28 requirements table, Plugin Release Checklist, Feature Implementation Checklist, and Plugin Creator enforcement notes updated to reference `rc-doc-icon`. Release notes updated.

**Files changed:**
- `dashboard.html` - All 10 plugin panel headers and all 10 widget card headers converted to `rc-doc-icon` pattern; Snake slim panel header added; Env Dashboards view header refactored to flex row with `rc-doc-icon` on right
- `styles/platform.css` - Added `.rc-doc-icon` component CSS (margin-left:auto, opacity, hover, focus-visible)
- `styles/dashboard.css` - Added `.rc-widget-card__title-group` flex container CSS and `.rc-widget-card__header .rc-doc-icon` override
- `tools/create-plugin.js` - Step 2 panel header template generates `rc-doc-icon`; Step 3 widget card template generates `rc-widget-card__title-group` + `rc-doc-icon`
- `plugins/documentation.js` - v1.43.0 release notes updated to describe `rc-doc-icon` standardization
- `AGENTS.md` - §27 Documentation Access Standard added (UI component/placement standard); §28 updated to reference `rc-doc-icon` (not legacy button classes); §29 ASCII Punctuation Standard (renumbered from §28); Plugin Release Checklist and Feature Implementation Checklist updated; Extension version bumped to 1.43.1
- `manifest.json`, `package.json`, `docs/PACKAGING.md` - Version bumped to 1.43.1
- `dist/*` - All dist mirrors synced

**Breaking changes:** None - `rc-doc-icon` replaces legacy text buttons and Help tab; documentation is reachable via the same `data-doc-view` routing.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.43.0] — 2026-08-07

### Platform - Unified Documentation Navigation and ASCII Punctuation Standard

**Type:** Feature
**Summary:** Implements a unified documentation navigation model across the entire extension platform. Every plugin now exposes a direct "Docs" button in both its dashboard widget card and its panel header that routes to the corresponding centralized documentation topic. The Environment Dashboards Launcher Help & Docs tab is removed and replaced with a standard Docs button. A centralized `PLUGIN_DOC_MAP` in `dashboard.js` maps every plugin viewId to its documentation topic ID. The Plugin Creator (`tools/create-plugin.js`) is updated to generate documentation-integrated scaffolding and enforce the ASCII Punctuation Standard in generated content. `AGENTS.md` is updated with the Documentation Accessibility Standard and ASCII Punctuation Standard platform rules.

**Files changed:**
- `dashboard.js` - Added `PLUGIN_DOC_MAP` constant (10 plugin entries), `navigateToPluginDoc()` helper, both exposed via `window.ReplyCatorsApp`; added Step 11c delegated click handler for `[data-doc-view]` buttons; version bumped to 1.43.0; `env-dashboards` plugin version bumped to 1.3.0
- `dashboard.html` - Added "Docs" button (`data-doc-view`) to all 10 plugin widget card headers and all plugin panel headers; removed Environment Dashboards Help & Docs tab button and panel; added Docs button in env-dashboards view header; platform version span updated to 1.43.0
- `plugins/documentation.js` - Added `setTopic()` method for pre-selecting a topic; exposed as `{ render, setTopic }` from module registration; added `window._rcDocsPendingTopic` pickup for early callers; updated env-dashboards topic to remove Help & Docs tab reference; added v1.43.0 release notes entry
- `plugins/env-dashboards.js` - Removed `renderHelp()` function and inline documentation content; removed "help" tab from tab bar and panel; added Docs button in view header navigating to centralized documentation; version bumped to 1.3.0; fixed em dashes in notification strings
- `tools/create-plugin.js` - Updated Step 2 panel header template to include Docs button with `data-doc-view`; updated Step 3 widget card template to include Docs button; added Step 1b documentation mapping registration instruction; added Documentation Requirement block in output; added ASCII punctuation validation in `generateFiles()` (fails on em/en dashes in generated content)
- `AGENTS.md` - Added Documentation Accessibility Standard platform rule; added ASCII Punctuation Standard platform rule; updated Plugin Release Checklist; updated Feature Implementation Checklist; updated Plugin Inventory (env-dashboards 1.3.0); bumped Extension version to 1.43.0
- `manifest.json`, `package.json`, `docs/PACKAGING.md` - Version bumped to 1.43.0
- `dist/*` - All dist mirrors synced

**Breaking changes:** None - Docs buttons are additive. The env-dashboards Help & Docs tab is removed; documentation is now reachable via the centralized Documentation section and the new Docs button.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.3.0

---

## [1.42.5] — 2026-08-07

### Bob Helper — Port-Based Process Kill (stop command hardening)

**Type:** Bug Fix
**Summary:** `tools\bob-helper.cmd stop` failed to find the running server when it was started via `node -e "require('./tools/bob-helper-server.js')"` (e.g. from a Scheduled Task or a custom launcher). The old WMIC and Get-CimInstance command-line match both look for the string `bob-helper-server` in the process command line, but when Node is invoked with `-e "require(...)"` the PID is present and the string matches — however the previous WMIC token parser used `tokens=2 delims= ` which shifted when WMIC output contained leading spaces, silently returning an empty token and skipping the kill. Added a new Layer 1 that looks up the PID directly from `netstat -ano` by port number (`127.0.0.1:47123`), verifies it is `node.exe` via `tasklist`, and kills it. The command-line sweeps (Get-CimInstance, WMIC) are retained as Layer 2/3 fallbacks for zombie processes not holding the port. WMIC token parsing fixed from `tokens=2` to `tokens=1` to match WMIC's actual output format.

**Files changed:**
- `tools/bob-helper.cmd` — `_KillBobHelperProcess` rewritten with three-layer strategy: (1) port-based netstat PID lookup + node.exe guard; (2) PowerShell Get-CimInstance command-line match; (3) WMIC command-line match with `tokens=1` fix

**Breaking changes:** None — stop command is strictly more reliable; behavior-identical for normal launch paths.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.2.1

---

## [1.42.4] — 2026-08-07

### Bob Helper — Reliability, Error Persistence, and Documentation Correctness

**Type:** Bug Fix
**Summary:** Four post-audit findings resolved. (1) **R-03 — Catch-block NUL stdin:** The PowerShell launcher's `catch` block displayed an error and called `Read-Host "Press Enter to close"`, but `stdio:'ignore'` binds stdin to NUL so `Read-Host` received EOF immediately and the window closed before the error was readable. Fixed by writing the error to a persistent `last-error.log` in `%TEMP%\replycators-bob-helper\` before calling `Read-Host`, so the error survives window close and can be retrieved by support or the user. (2) **R-06 — Synchronous `fs.statSync` blocking:** `validateWorkingDir()` used synchronous `fs.statSync` which blocks the entire Node.js event loop on a disconnected UNC network share (OS network timeout: 30–90 seconds). Replaced with `fs.promises.stat` and a 5-second `Promise.race` timeout; all call sites updated to `await` the result. (3) **R-04 — AGENTS.md launcher template reference:** Two locations in AGENTS.md still named `bob-launcher-template.cmd` (removed in v1.42.2). Corrected to `bob-launcher-template.ps1` with accurate descriptions. (4) **R-05 — Prompt path documentation drift:** AGENTS.md v1.40.0 note and the troubleshooting report Step 7 both described the deprecated `<workingDir>\.replycators\sessions\` subdirectory path — superseded by v1.42.2 which writes directly to `<workingDir>\<requestId>.txt`. Annotated in AGENTS.md; corrected in report. Report §8 and §10 updated to reflect CF1/CF2/CF4 as already fixed in v1.42.3.

**Files changed:**
- `tools/bob-launcher-template.ps1` — R-03: catch block now writes error to `%TEMP%\replycators-bob-helper\last-error.log` before `Read-Host`; error survives NUL stdin window-close
- `tools/bob-helper-server.js` — R-06: `validateWorkingDir()` converted to async using `fs.promises.stat` + 5-second timeout `Promise.race`; `/cli-check` handler uses async IIFE; `/execute` handler `req.on('end', ...)` callback declared `async`
- `AGENTS.md` — R-04: `bob-launcher-template.cmd` → `bob-launcher-template.ps1` in repository structure tree (line 394) and documentation map table (line 1517); R-05: v1.40.0 note annotated with superseded session-subdirectory notice; Extension version bumped to 1.42.4
- `docs/reports/bob-helper-execute-interface-troubleshooting-report.html` — R-02: CF1/CF2/CF4 in §8 and RK-01/RK-03/RK-04/RK-07 in §10 marked "Fixed v1.42.3"; R-05: Step 7 prompt path corrected; encoding row updated
- `docs/PACKAGING.md` — Last updated version bumped
- `manifest.json`, `package.json`, `dashboard.html`, `dashboard.js` — version bumped to 1.42.4
- `dist/*` — all dist mirrors synced

**Breaking changes:** None — `validateWorkingDir()` remains functionally identical for all valid inputs; only the blocking characteristic changed. The `async` declaration on the `req.on('end', ...)` callback is safe for Node.js ≥ 18.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.2.1

---

## [1.42.3] — 2026-08-07

### Bob Helper Execute Interface — Post-Migration Correctness Fixes

**Type:** Bug Fix
**Summary:** Six correctness issues introduced or exposed by the v1.42.2 PowerShell migration are resolved. (1) **CF1 — Health-check accuracy (two locations):** `_helperHealthy` was set from `response.ok` only, treating a server that is up but missing `bob.ps1` as fully healthy. Fixed in the background health-poll path (`salesforce-case-extractor.js:337`) and the Execute pre-flight path (`salesforce-case-extractor.js:622`) to check `response.ready` as well. When `ready === false`, Execute is now blocked with an actionable message rather than proceeding to an HTTP 500. (2) **CF4 — Prompt encoding on PS 5.1:** Both `Get-Content` calls in `bob-launcher-template.ps1` lacked `-Encoding UTF8`, causing non-ASCII characters (customer names, Unicode punctuation) to be silently corrupted when read on PowerShell 5.1 systems. `-Encoding UTF8` added to both calls. (3) **CF2 — Dead resolveBobCommand() candidates:** `'pwsh'` and `'powershell'` in the candidates array could never satisfy the `.endsWith('.ps1')` filter, causing two redundant `where.exe` calls on every health probe. Removed; function now makes exactly one `where.exe` call. (4) **G-05 — Stale comment:** Comment in `buildAssembledPrompt()` described CMD-style escaping which was replaced in v1.42.2; updated to describe the current PowerShell stdin pipe delivery. (5) **G-01 — Documentation drift (three files):** `docs/INSTALLATION.md`, `docs/TROUBLESHOOTING.md`, and `docs/plugins/salesforce-case-extractor.md` still referenced `bob.cmd`, `bob.exe`, and `cmd.exe` as requirements — all rejected by the server since v1.42.2. Corrected to `bob.ps1` and `powershell.exe` throughout.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — CF1 fix at line ~337 (health poll) and line ~622 (Execute pre-flight); G-05 comment update at `buildAssembledPrompt()`
- `dist/plugins/salesforce-case-extractor.js` — dist mirror synced
- `tools/bob-launcher-template.ps1` — CF4: `-Encoding UTF8` added to both `Get-Content` calls (diag mode and normal mode branches)
- `tools/bob-helper-server.js` — CF2: `resolveBobCommand()` simplified to single `where.exe bob.ps1` call; dead `'pwsh'`/`'powershell'` candidates removed
- `docs/INSTALLATION.md` — G-01: `cmd.exe` → `powershell.exe`; `bob.cmd` → `bob.ps1` in IBM Bob CLI Setup section
- `docs/TROUBLESHOOTING.md` — G-01: `bob.cmd`/`bob.exe` → `bob.ps1` in CLI-not-installed section
- `docs/plugins/salesforce-case-extractor.md` — G-01: prerequisites updated to `powershell.exe`; version/last-updated header corrected (4.6.0 / v1.27.6 → 4.9.1 / v1.42.3); execution path diagram updated to reflect PS launcher

**Breaking changes:** None — all changes are behavior-preserving fixes or documentation corrections.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.1
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.2.1

---

## [1.42.2] — 2026-08-07

### Bob Helper — PowerShell Migration Completion

**Type:** Bug Fix
**Summary:** Completed the Bob Helper cmd.exe → PowerShell migration. Three defects corrected: (1) The spawn call in `tools/bob-helper-server.js` still used `cmd.exe /c start` as an intermediary host — PowerShell was never the direct spawn target, causing env var inheritance failures and an invisible window. Changed to `spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', ...])` directly. (2) The PowerShell launcher had no top-level error handler — any validation failure caused the window to close silently before rendering output. Wrapped entire launcher body in `try/catch`; errors now display in the window with a `Read-Host` hold. (3) `bob-helper.cmd` CHECK 2 still searched for `bob.cmd` first, reporting a false PASS on machines where only `bob.cmd` was installed while the server would return HTTP 500. Rewritten to search only for `bob.ps1`.

**Files changed:**
- `tools/bob-helper-server.js` — line 312: `spawnArgs` no longer contains `['/c','start','IBM Bob','powershell.exe',...]`; line 330: spawn target changed from `cmd.exe` to `powershell.exe`
- `tools/bob-launcher-template.ps1` — entire body wrapped in `try/catch`; validation guards now use `throw` instead of `Write-Error + exit 1`; `catch` block writes error and calls `Read-Host` before `exit 1`
- `tools/bob-helper.cmd` — CHECK 2 rewritten: single `where.exe "bob.ps1"` lookup; FAIL message includes install instruction; no longer accepts `bob.cmd` as a valid Bob CLI
- `docs/reports/Bob Helper — End-to-End Prompt Flow Investigation.html` — updated throughout to reflect PowerShell-only architecture: version tag, Executive Summary layer 4, Investigation Scope, steps 13–15, component table 4, architecture diagram, Code References table, Configuration table, Findings list, Confirmed Facts table

**Breaking changes:** None — this corrects the migration to match its original intent. Users who had `bob.cmd` but not `bob.ps1` will now receive an actionable HTTP 500 error from the server rather than a silent missing window.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: 1.2.1

---

## [1.42.1] — 2026-08-07

### Environment Dashboards Launcher — Null URL Guard (v1.2.1)

**Type:** Bug Fix
**Summary:** Calling `chrome.tabs.create({ url: null })` when the active environment has an unrecognised region token (e.g. `petest-shadow`) caused a silent Chrome API error. Added an explicit null-guard after `buildPvc()` so unknown-region environments receive a descriptive warning notification instead of a broken tab open attempt.

**Files changed:**
- `plugins/env-dashboards.js` — `handleOpen()` null-check after URL builder; `addNotification()` warning with region list when `dashUrl` is null; version bumped 1.2.0 → 1.2.1

**Breaking changes:** None

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: 4.0.3
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.2
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.2
- Apptio Documentation Finder: 1.0.2
- **Environment Dashboards Launcher: 1.2.1**

---

## [1.42.0] — 2026-08-07

### Platform + Plugins — Environment Dashboards v1.2.0, Product Category Taxonomy, Notification System Standardisation

**Type:** Feature · Enhancement · Bug Fix
**Summary:** Three deliverables in one release. (1) Environment Dashboards Launcher receives a full UI overhaul — tab navigation (Dashboards / Notifications / Help & Docs), `*.apps.papt.to` URL detection, PVC "no data" regression fixed, and a dedicated Help & Docs panel with region map and usage guide. (2) Plugin Manager category filter replaced with the authoritative 15-category product taxonomy aligned to IBM product families. (3) Notification system standardised across all plugins — every `showToast()` orphan replaced with `addNotification()` so all events are stored, persisted, badged, and visible in Notifications Center.

---

### Environment Dashboards Launcher — v1.1.3 → v1.2.0

**Type:** Feature · Bug Fix
**Summary:** Tab navigation added (Dashboards / Notifications / Help & Docs). `*.apps.papt.to` URLs now detected as environment source alongside `*.apptio.com`. PVC "No data" regression fixed — `buildPvc()` now returns `null` on unknown region instead of silently falling back to EMEA values. Success and error events now generate Notifications Center entries.

**Files changed:**
- `plugins/env-dashboards.js` — `extractEnv()` extended to match `*.apps.papt.to`; `buildPvc()` returns `null` on unknown region; `setTab()` tab system; `renderPluginNotifications()` reads platform store filtered to PLUGIN_ID; `renderHelp()` static reference panel (How It Works, Supported Dashboards, Region Map, PVC Notes); `onNavigate()` wires tabs once + restores to Dashboards on re-entry; `showToast()` replaced by `addNotification()`; success notification added on dashboard open; `buildBiitData()` and `buildBiitLog()` removed (not needed); BIIT section removed from render
- `dashboard.html` — `view-plugin-env-dashboards` wrapped in 3-tab shell (Dashboards / Notifications / Help & Docs panels); `#edl-container` moved inside `#edl-panel-dashboards`
- `dashboard.js` — `env-dashboards` version field corrected 1.0.0 → 1.2.0; category `support` → `apptione`
- `styles/dashboard.css` — `.edl-help`, `.edl-help__section`, `.edl-help__steps`, `.edl-help__table`, `.edl-pvc-callout`, `.edl-pvc-callout__icon`, `.edl-pvc-callout__text`, `.edl-badge--biit`, `.edl-hint--inline` added

---

### Plugin Manager — 15-Category Product Taxonomy

**Type:** Enhancement
**Summary:** Plugin Manager category filter replaced with 15 product-aligned categories matching IBM's product portfolio. Every plugin re-assigned to its correct category.

**Category assignments:**
| Plugin | Old | New |
|---|---|---|
| Salesforce Case Extractor | `crm` | `apptione` |
| Cloudability OrgID | `cloud` | `cloudability` |
| Apptio Planning Upgrade Calculator | `enterprise` | `planning` |
| Environment Dashboards Launcher | `support` | `apptione` |
| Edge Bookmark Finder | `productivity` | `general` |
| Workspace Starter | `productivity` | `general` |
| Tab Search | `productivity` | `general` |
| Apptio Documentation Finder | `productivity` | `general` |
| Snake | `games` | `general` |
| Example Plugin | `example` | `general` |

**Available categories:** ApptioOne / Costing Billing & EBM · Apptio Planning · Apptio BI · Apptio Frontdoor · Datalink Financials (DLF) · Datalink Classic (DLC) · IBM Cloudability · Cloud Cost Management · IBM Targetprocess · Automated Data Management (ADM) · Apptio Benchmarking · Digital Fuel · Security · Upgrades & Maintenance · General / Cross-Product

**Files changed:**
- `dashboard.js` — `PLUGINS[]` category fields updated for all 10 plugins
- `dashboard.html` — `#rc-pm-category-filter` `<select>` options replaced with 15-category list

---

### Documentation Plugin — Environment Dashboards topic added

**Type:** Enhancement
**Summary:** `env-dashboards` topic added to the Plugins navigation group in the in-extension Help & Documentation plugin. Covers quick start, supported dashboards table, URL source patterns, region map, PVC notes, and tab descriptions. Topic count updated 21 → 22.

**Files changed:**
- `plugins/documentation.js` — `env-dashboards` added to `NAV_GROUPS[plugins].topics`; full content entry in `CONTENT_MAP`; topic count comment 21 → 22

---

### Notification System — Standardisation Across All Plugins

**Type:** Bug Fix
**Summary:** `showToast()` called directly from plugin code bypasses the notification store — the toast appears on screen but no entry is created in Notifications Center. All such call sites have been replaced with `addNotification()`, which stores, persists, badges, and then calls `showToast()` internally. Double-toast bugs (where both `addNotification` and an extra `showToast` were called for the same event) are also fixed.

**Root cause:** `addNotification()` is the authoritative entry point. Calling `showToast()` directly skips `notifStore`, `persistNotifs()`, `updateNotifBadge()`, and the Notifications view render. Plugins calling `showToast()` directly produced visible toasts with no Notifications Center record.

**Fixed call sites:**

*`plugins/env-dashboards.js`*
- `showToast(…'warning'…)` on no-environment detection → `addNotification(…'warning', PLUGIN_ID)`
- Added `addNotification('Dashboard Opened', …'success', PLUGIN_ID)` on successful open

*`plugins/workspace-starter.js`*
- `showToast('Profile not found.')` → `addNotification(…'error', PLUGIN_ID)`
- `showToast('No URLs in this profile.')` → `addNotification(…'warning', PLUGIN_ID)`
- `showToast('No valid URLs found…')` → `addNotification(…'warning', PLUGIN_ID)`
- `showToast('Import failed…')` → `addNotification(…'error', PLUGIN_ID)`

*`plugins/cloudability-orgid.js`*
- Copy success: removed redundant `showToast` after `addNotification` (double-toast)
- Copy failure: `showToast('Clipboard write failed')` → `addNotification(…'error', plugin.id)`
- Include-in-diagnostics: removed redundant `showToast` after `addNotification` (double-toast)
- Widget copy success: `showToast(…)` with no notification → `addNotification(…'info', plugin.id)`
- Widget copy failure: `showToast(…)` with no notification → `addNotification(…'error', plugin.id)`

*`plugins/example-plugin.js`*
- Removed redundant `showToast` after `addNotification` in Say Hello handler (double-toast)

**Files changed:**
- `plugins/env-dashboards.js`
- `plugins/workspace-starter.js`
- `plugins/cloudability-orgid.js`
- `plugins/example-plugin.js`

**Breaking changes:** None. Toast appearance and styling unchanged. `addNotification()` calls `showToast()` internally — all existing toast behaviour is preserved.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: **4.0.3** ← notification fix
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: **2.0.2** ← notification fix
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: **1.0.2** ← notification fix
- Apptio Documentation Finder: 1.0.2
- Environment Dashboards Launcher: **1.2.0** ← tabs, papt.to detection, PVC fix, notifications

---

## [1.41.0] — 2025-07-25

### Environment Dashboards Launcher — New Plugin

**Type:** Feature
**Summary:** New support-focused plugin that eliminates the manual multi-step process of opening customer environment dashboards. Given a customer environment name (e.g. `csbox-us-east-r12`), the plugin resolves all URL parameters and generates ready-to-open Splunk and Grafana dashboard URLs in one click. Includes a full Environment Resolution Engine, Dashboard Registry, Investigation Packs, auto-detection from active Apptio tabs, favorites, and recents.

**URL Intelligence Analysis completed:**
- `form.time.earliest`, `form.time.latest`, `form.selectedBuildType`, `form.includeReportUsage`, `var-datasource`, `var-cluster`, `var-biitnode`, `orgId`, `var-aws_datasource`, `var-cluster_datasource`, `from`, `to`, `timezone` → STATIC (never change)
- `form.selectedPrefix`, `form.selectedContainerPrefix`, `var-deployment` → ENVIRONMENT_DERIVED (`= env name`)
- `var-namespace`, `var-match_namespace` → NAMESPACE_DERIVED (`= "f-" + env name`)
- `var-match_cluster`, `var-cluster` (Grafana) → CLUSTER_DERIVED (region map lookup)
- `var-region` → REGION_DERIVED (region map lookup → AWS region)
- `var-persistentvolumeclaim`, `var-pod`, `var-persistentvolume`, `var-volume_id` → MANUAL (PVC Dashboard only)

**Environment Resolution Engine:**
- Parses `<prefix>-<region>-r<version>` format
- Maps region tokens to AKP clusters and AWS regions with confidence scoring
- Known mappings: `us-east → uw2p-akp-b7 / us-east-1`, `emea → ew1p-akp-b1 / eu-west-1`
- Auto-detects environment from active Apptio tab hostname (`*.apptio.com`)

**Dashboard Registry (4 dashboards):**
- Splunk: String Usage
- Splunk: Background Calculation Profiler
- Grafana: AKP BIIT Deployments
- Grafana: AKP BIIT Persistent Volumes (manual PVC parameters)

**Investigation Packs (3 packs):**
- Environment Investigation: String Usage + Calc Profiler + Deployments (1-click)
- Splunk Performance: both Splunk dashboards
- Grafana Infrastructure: both Grafana dashboards

**Power user features:**
- Favorites (star/unstar environments, max 20)
- Recents (last 10 environments)
- Dashboard search/filter
- Copy URL button on each dashboard card
- Collapsible URL preview
- Manual parameter inputs for PVC dashboard with live Open button enable/disable

**Files changed:**
- `plugins/env-dashboards.js` — new plugin (Environment Resolution Engine, Dashboard Registry, Investigation Packs, full UI)
- `assets/icons/streamline-ultimate-colors-free/plugins/env-dashboards.svg` — new plugin icon (monitor + bar chart + launch arrow)
- `assets/icons/streamline-ultimate-colors-free/icon-manifest.json` — new entry + total_files 168 → 169
- `plugins/shared/icon-helper.js` — added `plugins.envDashboards` to ICON_REGISTRY
- `dashboard.js` — PLUGINS[] entry, DEFAULT_PLUGIN_ORDER (position 3), _safeInit, navigateTo delegate, onLeave hook, version 1.40.3 → 1.41.0
- `dashboard.html` — plugin view, widget card, Quick Action button, script tag, activity log option, version display
- `styles/dashboard.css` — all EDL plugin CSS classes (env bar, resolution card, dashboard cards, pack cards, badges, parameter list, manual inputs, favorites)
- `manifest.json` — version 1.40.3 → 1.41.0
- `package.json` — version 1.40.3 → 1.41.0
- `AGENTS.md` — Plugin Inventory, Plugin Source Locations, Source of Truth Matrix, Storage Schema, UI Rendering Map, Extension version

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2
- **Environment Dashboards Launcher: 1.0.0** ← NEW

---

## [1.40.3] — 2026-08-07

### Apptio Planning Upgrade Calculator — Copy Response Closing Simplified

**Type:** Enhancement
**Summary:** The "Copy Response" output no longer includes the "phases" explanation paragraph or the schedule-change disclaimer. Both Copy Response paths (known upgrade day and unknown upgrade day) now close with "Thanks!" immediately after the maintenance window sentence.

**Files changed:**
- `plugins/apptio-upgrade-calculator.js` — removed two trailing paragraphs from both `response` branches of `aucCopyText()`; replaced with `'Thanks!'`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.3
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.40.2] — 2026-08-07

### Apptio Planning Upgrade Calculator — Enhanced Copy Response Output

**Type:** Enhancement
**Summary:** The "Copy Response" button now generates a professional, customer-ready multi-paragraph response using full month-name date formatting. The known-day path includes Days Remaining, Sandbox Date, and a maintenance-window notice. The unknown-day path covers the full upgrade window with the same professional language. Summary copies gain a "Days Remaining" field.

**Files changed:**
- `plugins/apptio-upgrade-calculator.js` — added `aucFormatDateLong()` helper (full month name, e.g. September 7, 2026); rewrote `aucCopyText()` response branches for both known-day and unknown-day paths; known-day Summary copy gains "Days Remaining" field

**Breaking changes:** None. Copy Summary output is backward-compatible; only "Days Remaining" is added. Copy Response text is updated but no storage keys or plugin interfaces changed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.2
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.40.1] — 2026-08-07

### Salesforce Case Extractor — Prompt UX Cleanup, Attachment Limit, Launcher Hardening, Prompt File Location

**Type:** Enhancement / Refactor  
**Summary:** Removes the `isDefault` prompt concept so all prompts are equal; raises the attachment limit to 10; simplifies prompt file routing to write directly into the Bob Working Directory; switches the launcher from positional arguments to named environment variables throughout.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — removed `isDefault` field from prompt schema, seeding, rendering, creation, duplication, and edit-save; all prompts are now deletable; `MAX_ATTACHMENTS` raised from 6 to 10; attachment count label updated
- `dashboard.html` — removed "Default" column from the Prompt Management table; width redistributed to "Prompt Name"
- `tools/bob-helper-server.js` — `resolvePromptDir()` writes prompt files directly into `workingDir` (no `.replycators/sessions/` subdirectory); renamed `_usedSessionDirs` → `_usedPromptDirs`; spawn call passes all launcher values via env vars (removed `bobCommand`, `promptPath`, `workingDir` from `spawnArgs`); added `RC_BOB_COMMAND`, `RC_PROMPT_FILE`, `RC_WORKING_DIR` to `env` block; updated comments
- `tools/bob-launcher-template.cmd` — removed `%~1/%~2/%~3` positional arg capture; all variables (`RC_BOB_COMMAND`, `RC_PROMPT_FILE`, `RC_WORKING_DIR`, `RC_INCLUDE_DIR`, `RC_DIAG_MODE`) now arrive exclusively via environment; error messages updated to name the missing variable

**Breaking changes:** None. Existing stored prompts without `isDefault` continue to work unchanged (`normalisePrompt()` already strips unknown fields). Prompt files are now written to `<workingDir>\<requestId>.txt` instead of `<workingDir>\.replycators\sessions\<requestId>.txt` — the session subdirectory is no longer created.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.9.0
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.1
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---


## [1.40.0] — 2026-08-06

### Salesforce Case Extractor — Bob Invocation Hardening, Save Button Validator, Temp-File Routing

**Type:** Feature / Enhancement

**Summary:** Three related improvements to the Bob execution pipeline:

**P1 — Updated Bob invocation flags:** Bob is now launched with `--trust -y --include-directories="[workingDir]"` instead of `-y`. `--trust` bypasses interactive prompts; `--include-directories` gives Bob access to the working directory's files for context. The working directory is injected as the `RC_INCLUDE_DIR` environment variable (same pattern as `RC_DIAG_MODE`) to avoid argument-shifting when `workingDir` is empty. Trailing path separators are stripped to prevent the `C:\path\"` CMD quoting hazard.

**P2 — Server-side validation hardening:** New `validateWorkingDir()` function replaces the previous inline check. Added: `isDirectory()` check (rejects file paths), `%`/`"` character rejection (both break CMD quoting even inside `set "..."` assignments), `fs.statSync()` error reporting (includes OS error code for EACCES / ETIMEDOUT). The `/cli-check` endpoint now accepts an optional `?dir=` query parameter so the Settings Save button can validate a directory server-side without a separate endpoint.

**P3 — Temp-file routing to working directory:** When a working directory is configured, prompt `.txt` files are now written to `<workingDir>\.replycators\sessions\<requestId>.txt` instead of `%TEMP%\replycators-bob-helper\`. This co-locates prompt context with the project for easier inspection. Launcher `.cmd` files always stay in `%TEMP%`. A path-length guard (240-char limit) and writeability probe fall back to `TEMP_ROOT` on failure. `cleanupAllTempFiles()` extended to also delete `.txt` files from session directories on graceful shutdown. PII disclosure note added to Settings tooltip and documentation.

**Save button + path validator:** The Bob Working Directory field now uses an explicit Save button instead of auto-saving on every keystroke. Clicking Save (or pressing Enter in the field) triggers client-side quick checks (absolute path, forbidden characters) then a server-side `GET /cli-check?dir=` validation round-trip. A status strip below the input shows ✅/⚠️/❌ feedback. Storage is only written on success. On popup reopen, a neutral "✓ Saved: [basename]" indicator is shown without re-validating. The `_setDirStatus()` helper is module-scope so both `initSettings()` and `syncSettingsUI()` can use it.

**Files changed:**
- `tools/bob-launcher-template.cmd` — updated both `:normal` and `:diag` invocation lines to `--trust -y --include-directories="%RC_INCLUDE_DIR%"`; updated comment to mention `RC_INCLUDE_DIR`; added `echo  Include : %RC_INCLUDE_DIR%` to diagnostic header
- `tools/bob-helper-server.js` — added `validateWorkingDir()` function; added `resolvePromptDir()`, `SESSION_SUBDIR`, `MAX_SESSION_PATH_LEN`, `_usedSessionDirs` constants/set; updated `writePromptFile()` to accept `workingDir`; updated call-site to pass `workingDir`; added `safeIncludeDir` normalisation; extended `env` injection with `RC_INCLUDE_DIR: safeIncludeDir`; extended `/cli-check` handler to support `?dir=` query; extended `cleanupAllTempFiles()` to purge session-dir `.txt` files on shutdown; updated inline comment on existing `existsSync` check replaced
- `background.js` — `RC_PREFLIGHT_CLI_CHECK` handler now reads `message.payload.dir` and appends `?dir=<encoded>` to the CLI-check URL when present
- `dashboard.html` — Bob Working Directory control restructured: input now inside `rc-input-row` with a Save button (`sf-bob-working-dir-save`); added `rc-status-bar` strip (`sf-bob-working-dir-status`); updated description text; added PII note; removed `style="width:100%;max-width:320px"` (width now natural within flex row)
- `dashboard.js` — replaced 400ms-debounce auto-save block with Save button handler; added module-scope `_setDirStatus()`; added `_commitBobWorkingDir()` and `_handleBobWorkingDirSave()` inside `initSettings()`; updated `syncSettingsUI()` restore path to show "✓ Saved" indicator; bumped version to v1.40.0; SF plugin version to 4.8.0
- `styles/platform.css` — added `.rc-input--error`, `.rc-input--ok` modifier classes; added `#sf-bob-working-dir-status { margin-top: 4px }` rule
- `plugins/salesforce-case-extractor.js` — updated activity log string to reflect `--trust --include-directories`
- `plugins/documentation.js` — updated Settings plugin-settings list and Execute info-box to reflect new Save button model and Bob invocation flags
- `docs/BOB-HELPER-SERVER.md` — updated invocation commands, temp-file lifecycle table, `validateWorkingDir` responsibilities, Settings UI Integration, Bob Launcher Template Logic, Prompt Injection Prevention, Temp File Security sections; bumped platform version field

**Breaking changes:** None. The old auto-save behavior for Bob Working Directory required no migration; users with a previously saved path see it restored with the "✓ Saved" indicator. Server-side validation is strictly additive — the new character and isDirectory checks only reject paths that would have failed silently at execution time anyway.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.8.0
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.1
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.39.1] — 2026-08-05

### Bob Helper — CMD Window Not Appearing (Launcher Syntax Fix)

**Type:** Bug Fix

**Summary:** The Bob terminal window stopped appearing entirely after v1.39.0. Two bugs introduced in the previous session:

1. **Argument shifting (critical):** `bob-helper-server.js` passed `diagnosticMode` as a 4th positional argument (`'0'`/`'1'`). When `workingDir` is empty, `cmd.exe` silently drops the empty-string 3rd argument and shifts `'0'` into `%3` (`RC_WORKING_DIR`). The launcher's working-directory existence check then failed with *"Working directory does not exist: 0"* and exited immediately — with `stdio: 'ignore'` binding NUL as stdin, `pause` returned instantly and the window vanished before it could be seen.

2. **Parenthesized block syntax error (critical):** `cmd.exe` fails to parse `set "RC_EXIT=%ERRORLEVEL%"` (quoted form) when it appears after a `call` inside an `if/else` parenthesized block, producing `. was unexpected at this time.` and exit code 255. This affected both normal and diagnostic branches.

**Fixes:**
- `bob-helper-server.js` — `diagnosticMode` is now passed via `spawnOpts.env` as `RC_DIAG_MODE: '1'/'0'` instead of as a 4th positional argument. The spawn args array drops to 3 positional args (`bobCommand`, `promptPath`, `workingDir`), immune to argument shifting.
- `tools/bob-launcher-template.cmd` — Rewrote the `if/else` block structure as `goto :diag` / `:normal` / `:diag` labels, which avoids all `cmd.exe` parenthesized-block expansion bugs. `set "RC_DIAG_MODE=%~4"` line removed (now read from environment). `set RC_EXIT=%ERRORLEVEL%` kept unquoted (safe outside parenthesized blocks). File rewritten with CRLF line endings (LF-only endings caused the entire file to be parsed as one line by `cmd.exe`).

**Files changed:**
- `tools/bob-helper-server.js` — removed `'0'`/`'1'` from spawn args array; added `env: { ...process.env, RC_DIAG_MODE: diagnosticMode ? '1' : '0' }` to spawnOpts; updated comment
- `tools/bob-launcher-template.cmd` — removed `set "RC_DIAG_MODE=%~4"`; replaced `if/else` parenthesized block with `goto :diag` / `:normal` / `:diag` label structure; rewrote with CRLF line endings

**Breaking changes:** None. Fully backward compatible — old helper + new launcher: `RC_DIAG_MODE` env var is unset → empty → `if ""=="1"` is false → normal mode. New helper + old launcher: old launcher ignores the env var, still reads `%~4` which is now empty → treated as normal mode.

**Plugin versions at this release:** Unchanged from v1.39.0.

---

## [1.39.0] — 2026-08-04

### Salesforce Case Extractor — Diagnostic Mode + Always-On Exit Code

**Type:** Feature / Bug Fix

**Summary:** Adds a Diagnostic Mode toggle (Settings → Salesforce Case Extractor → Diagnostic Mode) that keeps the Bob terminal window open after execution and shows resolved paths, exit code, and timing. Also fixes the silent exit of the Bob terminal window in all modes by replacing the dead `pause >nul` with unconditional exit-code capture and echo — the previous `pause` never blocked because `stdio: 'ignore'` on the spawn call binds stdin to NUL, making `pause` return immediately.

**Root cause of window closure:** `spawn('cmd.exe', ['/c', …], { stdio: 'ignore' })` attaches NUL as stdin for the child process. `pause` reads from stdin — with NUL stdin it returns immediately, so the window closed even though `pause >nul` was present. The fix replaces `pause` with `set "RC_EXIT=%ERRORLEVEL%"` (captured before any subsequent echo, preventing ERRORLEVEL reset) and `echo Bob finished (exit code: %RC_EXIT%)`.

**Files changed:**
- `tools/bob-launcher-template.cmd` — removed dead `pause >nul`; added `%4` → `RC_DIAG_MODE` parameter; unconditional exit-code capture/echo in normal branch; full diagnostic branch with `cmd /k` window hold, timestamp, resolved paths, and exit code
- `tools/bob-helper-server.js` — extracts `diagnosticMode` from POST body; passes it as `'1'`/`'0'` to launcher as 4th spawn arg; included in debug log
- `background.js` — extracts `diagnosticMode` from RC_EXECUTE_BOB payload; forwards it in HTTP POST body to helper
- `plugins/salesforce-case-extractor.js` — adds `_sfDiagnosticMode` module variable; restores from settings in `init()`; wires `change` listener on `sf-diagnostic-mode` toggle; passes flag to `sfExecuteWithBob()`; includes in RC_EXECUTE_BOB payload; Activity Log note when diagMode is on
- `dashboard.html` — new Diagnostic Mode `rc-settings-row` in SF settings group; platform version `v1.39.0`; SF plugin badge `v4.7.2`
- `dashboard.js` — `persistSfSettings()` reads and saves `diagnosticMode`; `syncSettingsUI()` restores toggle on startup; file header `v1.39.0`; SF plugin version `4.7.2`
- `manifest.json` — version `1.39.0`
- `package.json` — version `1.39.0`
- `AGENTS.md` — Extension version, Plugin Inventory, Source of Truth Matrix, Storage Schema, architecture note updated
- `docs/BOB-HELPER-SERVER.md` — storage key table and POST /execute request body table updated
- `plugins/documentation.js` — Settings, SF plugin, and Troubleshooting topics updated

**Breaking changes:** None. `diagnosticMode` is an optional boolean field with a `false` default — existing installs read `undefined` from storage which `?? false` / `=== true` guards handle correctly. Old helper binaries that receive no 4th argument see `%RC_DIAG_MODE%` as empty string, which the `if "%RC_DIAG_MODE%"=="1"` guard treats as normal mode.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.2
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.1
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.38.5] — 2026-08-04

### Cloudability OrgID — Critical SPA Navigation Regression Fix (RC-CLD-001)

**Type:** Bug Fix

**Summary:** The Cloudability OrgID automated background enrichment path was forcibly navigating the Cloudability SPA to `#/settings` on every tab activation and tab-load event when the OrgID cache was absent or expired. This caused a continuous, user-visible page-switching loop that made Cloudability unusable on affected machines. Root cause confirmed by HAR evidence (call-stack trace to `cloudability-detector.js:105`, Datadog RUM referrer/URL pair, Aptrinsic `#/settings` pageview, 274 ms long animation frame).

**Root cause:** Two compounding defects.
1. `orgIdEnrichIfPossible()` called `orgIdRetrieve(true)` — `forceRefresh=true` bypassed a valid cache on every tab event, driving the pull path unconditionally.
2. The `RC_GET_CLOUDABILITY_ORG` handler in `cloudability-detector.js` executed `window.location.hash = '#/settings'` unconditionally whenever `cachedOrg` was null, regardless of whether the caller was an automated background enrichment or a user-initiated manual refresh.

**Changes:**
- **Fix 1 (P1 — Critical):** `orgIdEnrichIfPossible()` in `background.js` now calls `orgIdRetrieve(false, false)` — `forceRefresh=false` serves the cache when valid; `navigate=false` suppresses any SPA hash navigation even on a cache miss. `orgIdRetrieve`, `orgIdRetrieveWithRetry`, and `orgIdRetrieveOnce` each accept a `navigate` parameter (default `true`) that is forwarded to `orgIdSendMessage`.
- **Fix 2 (P2 — High):** `orgIdSendMessage(tabId, navigate)` in `background.js` now passes the `navigate` flag in the message payload. The `RC_GET_CLOUDABILITY_ORG` handler in `cloudability-detector.js` reads `msg.navigate !== false` as `allowNavigate`. When `allowNavigate` is `false`, the detector returns `{ success: false }` immediately without touching `window.location.hash`. Hash navigation is reserved exclusively for user-initiated manual refresh (`navigate=true`, the default preserved for all existing call-sites in `plugins/cloudability-orgid.js`).

**Files changed:**
- `background.js` — `orgIdSendMessage`, `orgIdRetrieveOnce`, `orgIdRetrieveWithRetry`, `orgIdRetrieve`, `orgIdEnrichIfPossible` updated with `navigate` parameter chain; `forceRefresh=true` removed from enrichment path
- `cloudability-detector.js` — `allowNavigate` guard added to `RC_GET_CLOUDABILITY_ORG` handler; non-navigating early-return path added; hash-restoration conditional updated
- `dashboard.js` — Cloudability OrgID plugin version bumped to `4.0.2`; file header bumped to `v1.38.5`
- `dashboard.html` — `rc-platform-version` → `v1.38.5`
- `manifest.json` — Version bumped to `1.38.5`
- `package.json` — Version bumped to `1.38.5`
- `AGENTS.md` — Extension version and architecture note updated

**Breaking changes:** None. Cache behavior, storage keys, message types, and plugin public API are unchanged. The `RC_GET_CLOUDABILITY_ORG` message type is preserved; the new `navigate` property is opt-in and defaults to `true`, so existing callers in `plugins/cloudability-orgid.js` retain their full hash-navigation behavior.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.1
- Cloudability OrgID: 4.0.2
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.1
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.38.4] — 2026-08-06

### Platform — Performance and Reliability Patch (Round 2)

**Type:** Bug Fix / Enhancement

**Summary:** Eight findings from the second pre-production technical assessment resolved. All changes are behavior-preserving. No storage keys, plugin APIs, or public contracts changed.

**Changes:**
- **F-03 (duplicate constant):** `_PREFLIGHT_EVER_RAN_KEY` string literal removed. The single write site at boot now uses `RC_STORE.PREFLIGHT_EVER_RAN` directly, eliminating the silent-drift risk between the two identical strings.
- **Popup width sentinel:** `RC_POPUP_WIDTH = 800` constant introduced. All three `window.innerWidth` comparisons used for popup-vs-side-panel geometry detection now reference this constant. A future popup-width change requires updating one value instead of three.
- **Production readiness — persist error logging:** `persistDashboardOrder()` and `persistPluginsSectionCollapsed()` now call `console.warn` with `chrome.runtime.lastError` on write failure, matching the pattern applied to `persistAppSettings`, `persistSfSettings`, and `persistPluginStates` in v1.38.3.
- **F-12 (burst DOM rebuild):** `addNotification()` and `addLog()` now debounce their view re-render calls at 50 ms via `_notifRenderTimer` / `_logRenderTimer`. During active plugin operations (e.g. SF extraction producing 10–20 log entries in quick succession), the Activity Log and Notifications views now rebuild at most once per 50 ms instead of once per entry.
- **F-07 follow-up (bob-dir debounce):** The `sf-bob-working-dir-input` `input` event handler debounces the storage write and log entry at 400 ms. The plugin module is still notified immediately on each keystroke so the Execute-button state stays responsive; only the `persistSfSettings()` call and the log write are deferred.
- **F-13 (duplicate RC_PREFLIGHT_CLI_CHECK):** `checkBobCli` and `checkNodeRuntime` in `loadPreflightChecks()` previously each sent an independent `RC_PREFLIGHT_CLI_CHECK` background message, causing two HTTP round-trips to the bob-helper `/cli-check` endpoint per preflight run. Both now share a single `_getCliCheckResponse()` promise that sends the message exactly once per run.
- **F-09 (loadDiagnostics ordering):** `collectCacheDiagnostics()` (which calls `get(null)`) now runs first, followed by a targeted three-key `get()` for ADF raw values. The previous pre-read of the same ADF keys before the full dump is eliminated.

**Files changed:**
- `dashboard.js` — F-03, F-07 follow-up, F-09, F-12, F-13, popup width sentinel, persist error logging; file header bumped to `v1.38.4`
- `dashboard.html` — `rc-platform-version` → `v1.38.4`
- `manifest.json` — Version bumped to `1.38.4`
- `package.json` — Version bumped to `1.38.4`
- `AGENTS.md` — Extension version updated; v1.38.4 architecture note added
- `docs/PACKAGING.md` — Last updated line updated to v1.38.4

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.1
- Cloudability OrgID: 4.0.1
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.1
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.38.3] — 2026-08-06

### Platform & Apptio Docs Finder — Performance and Reliability Patch

**Type:** Bug Fix / Enhancement

**Summary:** Ten findings from a pre-production technical assessment resolved. All changes are behavior-preserving. No storage keys, plugin APIs, or public contracts changed.

**Changes:**
- **F-01 (ADF keydown leak):** `_handleKeydown` listener registered exactly once per session via `_keydownBound` module flag in `apptio-docs-finder.js`. Previously re-registered on every first-run setup retry, accumulating duplicates in long-lived Side Panel sessions.
- **F-03 (resize listener leak):** `detectAndApplySidePanelMode()` now guards the `window.resize` listener with `_sidePanelResizeListenerAdded` module flag so it is added at most once per document lifetime.
- **F-07 (nav view write debounce):** `persistNavView()` now debounces at 300 ms. Startup redirect chains (e.g., disabled plugin → plugin manager) now collapse into a single storage write instead of one per `navigateTo()` call.
- **F-09 (migration memoize):** `_migrateStorage()` in `apptio-docs-finder.js` now sets `_migrationDone = true` on first call, skipping the storage round-trip on every subsequent navigate to the ADF view.
- **F-10 (sidebar resize listeners):** `initSidebarResize()` returns early in popup mode (`window.innerWidth === 800`) — the `document.mouseup`, `document.mouseleave`, and `window.blur` handlers are no longer registered in the popup context where the resize handle is CSS-hidden and non-functional. The `body.rc-sidepanel` class check on `mousedown` is removed (now redundant given the early return).
- **F-11 (ADF toggle read-modify-write):** `wireAdfToggle()` in `initSettings()` no longer issues a `chrome.storage.local.get` on every checkbox change. A module-level `_adfSettingsCache` object is seeded by `syncSettingsUI()` and updated in place on each toggle. The merged object is written directly without a prior read.
- **F-13 (GROUP_META size documentation):** `restorePreflightResults()` `GROUP_META` size constants annotated with the exact check function names they represent, making sync failures visible during code review.
- **F-15 (preflight batch read):** `RC_STORE.PREFLIGHT_EVER_RAN` added to `RC_STORE`; `restoreSession()` now reads and stages it in `_restoredPreflightEverRan`. The boot sequence uses the staged value instead of a separate `chrome.storage.local.get` call.
- **F-16 (ADF fetch timeout):** `_fetchLiveSources()` now uses `AbortController` with a 15-second timeout. A stalled IBM Docs API request previously blocked the first-run setup UI indefinitely. Timeout is exposed in the diagnostic `errorPhase` field (`'timeout'`).
- **Diagnostics Gap (lastError):** `persistAppSettings()`, `persistSfSettings()`, and `persistPluginStates()` now call `console.warn` with the `chrome.runtime.lastError` message on write failure. Storage-quota failures are no longer silently discarded.
- **Plugin version governance:** Plugin versions were audited against the changelog and aligned with the actual plugin changes delivered in recent releases. The affected plugin versions are now explicitly maintained alongside the platform release record instead of being left stale.

**Files changed:**
- `dashboard.js` — F-03, F-07, F-10, F-11, F-13, F-15, Diagnostics Gap; plugin versions aligned for changed plugins; file header bumped to `v1.38.3`
- `plugins/apptio-docs-finder.js` — F-01, F-09, F-16
- `dashboard.html` — `rc-platform-version` → `v1.38.3`
- `manifest.json` — Version bumped to `1.38.3`
- `package.json` — Version bumped to `1.38.3`
- `AGENTS.md` — Extension version updated; Plugin Inventory and versioning governance updated; v1.38.3 architecture note added
- `README.md` — Built-in plugin version table aligned with current runtime versions
- `docs/PACKAGING.md` — Plugin version sync checklist updated to require documentation/version-surface updates for changed plugins

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.1
- Cloudability OrgID: 4.0.1
- Edge Bookmark Finder: 1.0.2
- Apptio Planning Upgrade Calculator: 1.0.1
- Workspace Starter: 2.0.1
- Tab Search: 1.0.1
- Snake: 1.0.1
- Example Plugin: 1.0.1
- Apptio Documentation Finder: 1.0.2

---

## [1.38.2] — 2026-08-06

### Dashboard — Architecture Audit Patch: Notification Argument Order, Dead Code Removal, Duplicate Consolidation

**Type:** Bug Fix / Refactor

**Summary:** Three behavior-preserving correctness fixes to `dashboard.js` identified during a systematic architecture audit. No plugin behavior, storage keys, or public APIs changed.

**Fix 1 — `addNotification()` wrong argument order (FIND-001 — High):**
The Apptio Docs Finder history-clear handler in `initSettings()` called `addNotification(type, title, message)` instead of the correct `addNotification(title, message, type, source)`. This caused: the type string `'success'`/`'error'` to appear as the notification title; `'Apptio Docs Finder'` to appear as the message body; the actual message text in the third position to fail the `VALID_TYPES` check and fall back to `'info'`, losing the intended severity. Three call sites fixed at lines 3633, 3636, 3646 (post-edit). Source argument (`'com.replycators.apptio-docs-finder'`) also added so the Activity Log filter works correctly for these entries.

**Fix 2 — Dead function `_sfApplyBobWorkingDir()` removed (FIND-002 — Medium):**
`_sfApplyBobWorkingDir(newPath)` was declared in `dashboard.js` but never called. It was introduced alongside the Browse-button model and became unreachable after the editable text-input model replaced it in v1.26.1. The equivalent logic is already inline in `syncSettingsUI()` and the `sf-bob-working-dir-input` listener. Removing it eliminates a maintenance trap (the function existed as a ghost API).

**Fix 3 — Duplicate feedback diagnostics summary functions consolidated (FIND-003 — Medium):**
`buildFeedbackDiagnosticsSummary()` and `buildFeedbackEmailDiagnosticsSummary()` were identical except that the email variant omitted the "Storage quotas" section. Consolidated into a single `buildFeedbackDiagnosticsSummary(includeQuotas)` with `includeQuotas` defaulting to `true`. The mailto body call site now passes `false` to preserve the previous email-only behaviour. The file-download call site is unchanged (implicitly gets `true`).

**Files changed:**
- `dashboard.js` — FIND-001: three `addNotification()` call-sites fixed; FIND-002: `_sfApplyBobWorkingDir()` removed; FIND-003: `buildFeedbackEmailDiagnosticsSummary()` removed, `buildFeedbackDiagnosticsSummary(includeQuotas)` updated; file header bumped to `v1.38.2`
- `dashboard.html` — `rc-platform-version` → `v1.38.2`
- `manifest.json` — Version bumped to `1.38.2`
- `package.json` — Version bumped to `1.38.2`
- `AGENTS.md` — Extension version updated; v1.38.2 long-term architecture note added

**Breaking changes:** None. Notifications now display with correct title, message, type, and source — they were previously incorrect (display bug only, no data loss). No storage keys, APIs, or plugin contracts changed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.1
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.38.1] — 2026-08-05

### Salesforce Case Extractor — Unified Chronological Feed, Description Fix, isDefault Removed

**Type:** Bug Fix / Refactor

**Summary:** Three targeted fixes to the Salesforce Case Extractor (v4.7.0 → v4.7.1). Replaces the four-section separated feed output with a single chronological unified feed, fixes a description truncation bug on rich-text fields containing embedded links, and removes the `isDefault: true` lock from the two built-in prompts.

**Fix 1 — Unified chronological feed (`extractAllFeedPosts`):**
`extractSalesforceData()` now calls the single-pass `extractAllFeedPosts()` function (introduced in v0.4.4 but not previously wired). The four separate arrays (`public_posts`, `internal_posts`, `jira_etl_posts`, `diag_events`) are replaced by a single `all_posts` array. Posts are in chronological oldest-first order (reversed from DOM order). `formatAsPlainText()` outputs one CASE HISTORY section; each entry is labeled `[Customer Post]`, `[Internal Post]`, `[JIRA/ETL Post]`, or `[Diagnostic Event]` inline. `buildReplyCatorsResponse()` maps `all_posts` directly; `type` field is preserved on each post object. `_diagnostics.postCount` reflects the total unified count; the separate `internalCount`/`jiraEtlCount`/`diagCount` fields are removed.

**Fix 2 — Description truncation on rich-text fields (`findFieldByLabel`):**
The `outputEl` query (including `lightning-formatted-rich-text`) now runs before the anchor shortcut check. Previously the anchor shortcut fired first, causing the Description field to return only the link text (e.g. `"infosys.com"`) when the rich-text content contained an embedded `<a>` tag. The anchor shortcut is now a fallback reached only when no rich-text output element is present — correctly handling pure link-type fields (e.g. Account Name) without discarding rich-text content.

**Fix 3 — Built-in prompt deletion lock removed:**
`isDefault: false` set on both `SF_DEFAULT_PROMPTS` entries (`prompt-default-understand`, `prompt-default-research`). Previously `isDefault: true` prevented deletion of these prompts. Users can now delete or replace them as needed.

**Files changed:**
- `sf-content.js` — v0.4.4 → v0.4.5: `extractSalesforceData()` uses `extractAllFeedPosts()`, returns `all_posts`; `formatAsPlainText()` single unified section with per-post type label; `buildReplyCatorsResponse()` maps from `all_posts`; `findFieldByLabel()` reordered (outputEl before anchor shortcut); file header updated to v0.4.5
- `plugins/salesforce-case-extractor.js` — Both `SF_DEFAULT_PROMPTS` entries: `isDefault: true` → `isDefault: false`
- `dashboard.js` — PLUGINS[] SF entry version `4.6.0` → `4.7.1`; file header updated to `v1.38.1`
- `dashboard.html` — `rc-platform-version` → `v1.38.1`; `sf-plugin-badge` → `v4.7.1`
- `manifest.json` — Version bumped to `1.38.1`
- `package.json` — Version bumped to `1.38.1`

**Breaking changes:** None. The unified feed format is backward-compatible — the `posts` array in the response data object already carried a `type` field distinguishing all post kinds. `formatAsPlainText()` output changes format (single section instead of four), which is expected and intentional. No storage keys changed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.1
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0


## [1.38.0] — 2026-08-05

### Salesforce Case Extractor — Extraction Toggles, New Fields, Improved Clipboard, Library Removal

**Type:** Feature / Enhancement / Refactor

**Summary:** Four coordinated enhancements to the Salesforce Case Extractor (v4.6.0 → v4.7.0). Adds three opt-in extraction toggles for internal/JIRA/diagnostic content, three new case header fields (Severity Level, Primary Product, Next Action Datetime), improved file-path clipboard output, and removes the unused Prompt Library tab.

**Enhancement A — Extraction scope toggles:**
A second toolbar row (`sf-extract-options`) below the main Extract toolbar adds three opt-in checkboxes: **Internal posts**, **JIRA/ETL posts**, and **Diagnostic data**. All default to unchecked — internal content is always opt-in. Toggle states persist in `rc:session:sf-settings` alongside existing settings. When any toggle is checked and extraction runs, a warning notification "Internal posts included — review before sharing externally." is shown.

**Enhancement B — New extracted fields:**
- `Severity Level` — extracted via `findFieldByLabel` from the record layout header
- `Primary Product` — extracted via `findFieldByLabel` from the record layout header
- `Next Action Datetime` — extracted via `findFieldByLabel` (Tier 1 selector now includes `lightning-formatted-date-time`) with a dedicated fallback that reads the raw `value` attribute directly
- All three fields appear in the SALESFORCE CASE INFORMATION header block when present (only present rows are rendered)
- Three new post sections appended after CASE HISTORY: `INTERNAL POSTS`, `JIRA/ETL POSTS`, `DIAGNOSTIC DATA EVENTS` — only rendered when the corresponding toggle was active and posts were found

**Enhancement C — Clipboard and button improvements:**
- **C1 — File path format:** When files are attached, `Copy with Prompt` now outputs quoted comma-separated full paths: `"C:\Folder\File1.zip", "C:\Folder\File2.log"`. Replaces the previous per-file placeholder block.
- **C2 — Button enablement:** `Copy with Prompt` is now enabled when at least one file is attached, even without extracted case data. A new `_sfSyncCopyPromptBtn()` helper centralises all button state management. `clearExtractedState()` now also manages `btnCopyPrompt`.
- **C3 — Placeholder text removed:** The `(content not available in clipboard copy)` annotation per file is removed. The output is now a clean path list only.

**Enhancement D — Prompt Library tab removed:**
The Prompt Library tab (tab 2 of 4) is removed. Its execution surface was identical to the Extract tab. The tab button, `#tab-library` panel HTML, all `sf-lib-*` CSS (except `.sf-lib-empty` which is shared with the management tab), and all JS functions (`renderLibraryList`, `selectLibItem`, `_sfShowLibExecFields`, `_libAttachments`, `_libAdditional`) are deleted. Notification titles previously labelled "Prompt Library" changed to "Salesforce Case Extractor".

**Files changed:**
- `sf-content.js` — v0.4.3 → v0.4.4: `extractSeverityLevel()`, `extractPrimaryProduct()`, `extractNextActionDatetime()`, `extractInternalPosts()`, `extractJiraEtlPosts()`, `extractDiagnosticEvents()` added; `findFieldByLabel()` Tier 1 selector includes `lightning-formatted-date-time`; `extractSalesforceData()` accepts `options` param; `formatAsPlainText()` extended with new header fields and optional post sections; `buildReplyCatorsResponse()` maps new camelCase fields; message listener passes `payload.options` to extractor
- `plugins/salesforce-case-extractor.js` — Library tab state/functions removed; `_sfSyncCopyPromptBtn()` added; `clearExtractedState()` extended; `extractFromTab()` passes options; `runExtraction()` reads/passes toggle options; internal content warning notification; `btnCopyPrompt` handler uses quoted path list; `renderAllPromptUIs()` simplified; `_sfSwitchTab()` removes `'library'`
- `dashboard.html` — Library tab button and `#tab-library` panel removed; `sf-extract-options` second toolbar row added with 3 checkboxes; tab comments renumbered; `sf-plugin-badge` updated to `v4.7.0`; `rc-platform-version` updated to `v1.38.0`
- `styles/dashboard.css` — All `sf-lib-*` rules removed except `.sf-lib-empty`; `.sf-extract-options*` rules added; `body.rc-sidepanel .sf-lib-exec-zone` override removed; section comment updated
- `dashboard.js` — `persistSfSettings()` writes `inclInternal`, `inclJiraEtl`, `inclDiag`; file header version updated to `v1.38.0`; storage key comment updated
- `manifest.json` — Version bumped to `1.38.0`
- `package.json` — Version bumped to `1.38.0`
- `AGENTS.md` — Plugin Inventory, Storage Schema, Source of Truth Matrix updated; version references updated

**Breaking changes:** None. The Library tab removal affects no persisted state. All stored prompts (in `rc:plugin:com.replycators.salesforce-extractor:prompts`) continue to be accessible from Prompt Management and the Extract tab prompt picker. The three new `inclInternal`/`inclJiraEtl`/`inclDiag` storage keys default to `false` on first load — existing users see no change in extraction behaviour.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.7.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---


## [1.37.0] — 2026-08-04

### Diagnostics — Three-Tab Information Architecture (Overview / System Checks / Cache & Storage)

**Type:** Feature / UX / Information Architecture

**Summary:** Reorganised the Maintenance Center → Diagnostics panel from two tabs (Overview, Cache & Storage) into three clearly separated tabs — **Overview**, **System Checks**, and **Cache & Storage** — with strict ownership of every diagnostic card. The previous two-tab layout placed all check cards (Browser Permissions, Local Runtime, External Services, Active Browser Context) in the Overview tab alongside the platform snapshot JSON, making it too long and duplicating storage information. This release enforces a single-card-one-tab ownership model.

**New tab layout:**

| Tab | Content |
|-----|---------|
| **Overview** | Health status bar · High-priority warnings with navigation links · Compact platform/browser/plugin/activity snapshot · Technical details JSON (collapsed by default) |
| **System Checks** | All dependency check cards: Browser Permissions (4), Local Runtime (5), External Services (1), Active Browser Context (2) |
| **Cache & Storage** | Storage Quota check card · Registered cache cards · Per-plugin refresh/clear actions · Orphaned key detection · Inspector filters |

**Key behavioural changes:**
- Overview never renders check cards directly — it shows counts, overall status, and a high-priority warning list with one-click links to the owning detail tab.
- Warning links navigate: Bob Helper / permissions / context issues → System Checks; Storage Quota warnings → Cache & Storage.
- The raw diagnostic JSON `<pre>` block is hidden behind a collapsed `<details>` "Technical details" control; not shown by default.
- Run Checks updates Overview (summary bar + warnings) and System Checks (all cards). Refresh updates Overview snapshot and Cache & Storage data. Tab switching never re-runs any check.
- First-ever startup auto-run flag changed from `chrome.storage.session` (session-scoped, reset on browser restart) to `chrome.storage.local` (persistent, never resets).

**Files changed:**
- `dashboard.html` — Added `#rc-diag-tab-checks` and `#rc-diag-panel-checks` between Overview and Cache; moved `#rc-preflight-checks` into System Checks panel; added `#rc-overview-warnings`, `#rc-overview-snapshot`, and `#rc-diag-tech-details` (`<details>`) to Overview panel
- `dashboard.js` — `setDiagnosticsTab()` now loops `['overview','checks','cache']`; `bindCacheInspectorControls()` wires System Checks tab click; `GROUPS` / `GROUP_META` panel values changed from `'overview'` → `'checks'`; added `renderOverviewSnapshot()` (stat cards + warning list with `setDiagnosticsTab` links); `loadDiagnostics()` and `restorePreflightResults()` both call `renderOverviewSnapshot()`; auto-run flag constant renamed from `_PREFLIGHT_SESSION_KEY` → `_PREFLIGHT_EVER_RAN_KEY` using `chrome.storage.local`; removed unused `_PREFLIGHT_IN_MEMORY_RAN` fallback; removed storage usage awaits from `loadDiagnostics()` (no longer needed in JSON since storage data lives in Cache & Storage tab)
- `styles/dashboard.css` — Added `.rc-diag-overview__snapshot`, `.rc-diag-overview__stat`, `.rc-diag-overview__warnings`, warning row/badge/link styles, and `.rc-diag-tech-details` `<details>` disclosure styles
- `plugins/documentation.js` — Updated Maintenance Center topic to describe three sub-tabs; corrected check table to 12 checks; moved Storage Quota to Cache & Storage bullet list; added Overview warning-link navigation description
- `manifest.json` — Version bumped to `1.37.0`
- `package.json` — Version bumped to `1.37.0`

**Breaking changes:** None. All diagnostic check logic, storage keys, result persistence, accessibility attributes, remediation guidance, and retry handlers are preserved. The `_PREFLIGHT_EVER_RAN_KEY` storage key (`rc:platform:preflight-ever-ran`) is new; the old session key (`rc:platform:preflight-session-ran`) is no longer written.

---

## [1.36.0] — 2026-08-03

### Platform IA — Maintenance Center

**Type:** Feature / UX / Governance

**Summary:** Moved Diagnostics out of Notifications Center and consolidated it with Backup & Restore into a new top-level **Maintenance Center** navigation destination. Notifications Center now contains only Notifications and Activity. Added the Information Architecture Grouping Rule to AGENTS.md.

**Files changed:**
- `dashboard.html` — Added `view-maintenance` with two tabs (Diagnostics, Backup & Restore); removed Diagnostics tab from `view-notifications`; replaced Backup & Restore sidebar nav button with Maintenance Center button (`utility.toolbox` icon)
- `dashboard.js` — Added `setMaintenanceTab()` function; updated `setOperationsTab()` to remove diagnostics; updated `navigateTo()` with compat redirects for `'diagnostics'` and `'backup-restore'`; updated startup view restore to skip old `'backup-restore'` ID; updated Step 14 bindings; version bumped to `1.36.0`
- `plugins/documentation.js` — Added `maintenance-center` doc topic; updated `notifications-center` content to remove Diagnostics section; updated Getting Started platform views table; updated search index keywords; updated all Troubleshooting references from `Notifications Center → Diagnostics` to `Maintenance Center → Diagnostics`
- `AGENTS.md` — Added Information Architecture Grouping Rule; updated views table; updated Shared Feature Area Layout Rule; updated Notifications Center CSS token section; version bumped to `1.36.0`
- `manifest.json` — Version bumped to `1.36.0`
- `package.json` — Version bumped to `1.36.0` (also corrects prior drift from `1.34.0`)

**Breaking changes:** None. Old `data-view="backup-restore"` links compat-redirect to `maintenance` (Backup & Restore tab) in `navigateTo()`. Old `data-view="diagnostics"` links compat-redirect to `maintenance` (Diagnostics tab).

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.35.0] — 2026-08-03

### Icon Uniqueness, Example Plugin Overhaul, Copy Button Parity, and Default Plugin Order

**Type:** Fix / Policy / UX

**Summary:** Resolved a visual identity conflict where Example Plugin and Plugin Manager shared the same icon. Introduced a mandatory icon uniqueness policy enforced in all instruction and documentation files. Standardised the copy URL button symbol across Edge Bookmark Finder and Tab Search. Set Example Plugin as disabled by default. Confirmed and locked the canonical plugin dashboard order.

---

#### Icon Uniqueness — Example Plugin Icon Replaced

- **Root cause:** `plugins/example-plugin.svg` was a byte-for-byte copy of `navigation/plugins.svg` — both were the `Module-Puzzle--Streamline-Ultimate` SVG, causing Example Plugin and Plugin Manager to show the identical icon on every surface.
- **Fix:** Replaced `assets/icons/streamline-ultimate-colors-free/plugins/example-plugin.svg` with the `App-Window-Code--Streamline-Ultimate` icon — a cyan browser window with angle-bracket code symbols. This is semantically appropriate (a code template / SDK reference) and visually completely distinct from Plugin Manager's puzzle-grid icon.
- Updated `assets/icons/streamline-ultimate-colors-free/icon-manifest.json` — `streamlineName` changed from `module-component` to `App-Window-Code`; `purpose` updated to document the semantic choice and the intentional distinction from Plugin Manager.
- Updated `plugins/shared/icon-helper.js` — `examplePlugin` registry comment updated from `// Module-Puzzle` to `// App-Window-Code (code template window — distinct from Plugin Manager's Module-Puzzle)`.
- Updated `src/icons/icon-registry.ts` — same comment update in the TypeScript mirror.
- Updated `src/plugins/ExamplePlugin/index.ts` — `registerPage()` `icon` field changed from the raw emoji `'🧩'` to the semantic ID `'plugins.examplePlugin'` with a guard comment warning against reusing `navigation.plugins`.

#### Icon Uniqueness Policy — New Mandatory Rule

Added the **Icon Uniqueness Rule** to all three authoritative documentation and instruction files:

- **`AGENTS.md`** — New *Icon Uniqueness Rule* section under the Icon System policy. Rules: one concept → one icon; no cross-feature duplicates; platform features take precedence; audit registry before assigning; shared icons must be intentional and documented. Added a DevTools console audit script. Added *Reusing an icon already used by a different unrelated feature* to the Prohibited list.
- **`docs/ICON-SYSTEM.md`** — New *Icon Uniqueness Rule* section (rule table + DevTools audit script) inserted before *Prohibited Practices*. Added the duplicate-icon prohibition row to the Prohibited Practices table.
- **`docs/ICON-SYSTEM-VALIDATION.md`** — New *Icon Uniqueness Validation* checklist section with a copy-pasteable DevTools console duplicate-detection script and three explicit validation checkboxes, including an explicit check that Plugin Manager and Example Plugin use different SVGs.

#### Copy URL Button — Parity Between Edge Bookmark Finder and Tab Search

- **Issue:** The copy URL action button showed `⧉` (symbol) in Tab Search and `Copy` (word) in Edge Bookmark Finder — inconsistent across two sibling list-item UIs.
- **Fix:** Standardised both to `⧉` — the correct Tier-2 UI control symbol per the project's two-tier icon policy.
  - `plugins/tab-search.js` — `.ts-action-copy-url` button content set to `⧉`.
  - `plugins/bookmark-finder.js` — `.bm-copy` button content changed from `Copy` to `⧉`.

#### Example Plugin — Disabled by Default

- `dashboard.js` — Added `pluginStates['com.replycators.example-plugin'] = { enabled: false }` immediately after the bulk plugin-state initialisation loop.
- Example Plugin is a developer reference template, not a production tool. It is now off on a fresh install. Users can enable it manually in Plugin Manager; their choice is persisted to `chrome.storage` and the default no longer applies once saved.
- The rule *"Example Plugin must always be last in `DEFAULT_PLUGIN_ORDER`"* is now documented in the comment adjacent to this initialisation.

#### Default Plugin Dashboard Order — Confirmed and Locked

- Confirmed that `DEFAULT_PLUGIN_ORDER` in `dashboard.js` already matches the intended canonical order. No reordering was required.
- **Canonical order (position 1–9):**
  1. Salesforce Case Extractor
  2. Cloudability OrgID
  3. Tab Search
  4. Workspace Starter
  5. Apptio Documentation Finder
  6. Edge Bookmark Finder
  7. Apptio Planning Upgrade Calculator
  8. Snake
  9. Example Plugin *(always last; disabled by default)*

---


## [1.34.0] — 2026-08-03

### Icon System — Full Repair, Streamline Migration, and Policy Hardening

**Type:** Infrastructure / Fix / Documentation

**Summary:** Completed full repair and future-proofing of the ReplyCators icon system. All broken-image placeholders have been eliminated. The platform now uses a single, centralized Streamline Ultimate Colors — Free icon pipeline for every surface. Emoji, Unicode pictographs, and all obsolete icon families have been removed from documentation, tooling, and templates.

**Broken icon fixes:**
- Repaired 8 empty `navigation/` SVG files that caused broken-image placeholders for Dashboard, Plugin Manager, Options, Diagnostics, Notifications, Activity, Backup and Restore, and Documentation navigation entries.
- Corrected 4 wrong registry paths in `src/icons/icon-registry.ts` (`navigation/plugin-manager.svg`, `navigation/backup-restore.svg`, `plugins/cloudability-org-id.svg`, `plugins/unknown-plugin.svg` — all pointed to non-existent filenames).
- Replaced the incorrect bar-chart icon for Send Feedback with `utility/paper-write.svg` (notes with pencil — feedback message concept).
- Removed the orphaned `dist/assets/icons/material-symbols/` directory (37 obsolete SVG files no longer referenced).

**Streamline library expansion:**
- Added 3 new icons: `actions/back.svg`, `actions/forward.svg`, `utility/person.svg`.
- Total local Streamline SVG count: 100 (up from 97).

**Icon manifest:**
- Rewrote `icon-manifest.json` from a flat key-value map to a full per-icon catalog with `semanticId`, `localPath`, `streamlineName`, `category`, `purpose`, `downloadDate`, and `sourcePack` fields for all 100 icons.
- Updated `total_files` from 97 to 100.
- Updated repair and correction notes.

**Documentation overhaul:**
- Rewrote `docs/ICON-SYSTEM.md` in full — replaced all emoji-based registry examples, Unicode character guidance, and incorrect plugin icon table with accurate Streamline SVG content; added prohibited practices table, renderer guarantees, and offline validation checklist.
- Added mandatory **Icon System Rules** section to `docs/CONTRIBUTING.md` with the required icon flow, step-by-step addition procedure, and forbidden practices table.
- Updated `assets/icons/streamline-ultimate-colors-free/SOURCE.md` asset count from 97 to 100.

**Tooling:**
- Fixed `tools/create-plugin.js`: removed emoji `DEFAULT_ICON = '🔌'` — replaced with semantic ID `'fallback.unknownPlugin'`.
- Fixed `tools/create-plugin.js` header comment: replaced `--icon 🔧` example with `--icon plugins.myPlugin` (semantic ID).

**Permanent icon policy (enforced from v1.34.0):**
All future icons must follow the flow: semantic ID → central registry → local Streamline SVG → shared renderer.
Emoji, Unicode pictographs, text symbols, Google Material, Lucide, Font Awesome, icon fonts, remote URLs, and plugin-local icon systems are permanently prohibited.


## [1.33.5] — 2026-08-02

### Send Feedback — Utility Workflow, Outlook Recipient Fix, and Diagnostics Expansion

**Type:** Feature / Support / Privacy / Accessibility

**Summary:** Replaced the static **Send Feedback** placeholder with a working Utility-page feedback form that prepares an unsent plain-text `mailto:` draft to `Jakub.Nytko@ibm.com` and `Marcin.Jorasz@ibm.com`, shows diagnostics before handoff, supports diagnostics download and copy-based fallback, and keeps the workflow entirely client-side. ReplyCators does not send the email directly and does not confirm delivery.

**Version progression today:**
- **v1.33.2** — Initial Utility placement for Send Feedback in the active root runtime.
- **v1.33.3** — Functional feedback form added: category, subject, message, recipient display, diagnostics preview, diagnostics download, clear action, copy fallback, and `Open Email Client`.
- **v1.33.4** — Mailto recipient separator changed from comma to semicolon for Outlook compatibility so both recipients appear as separate `To` entries.
- **v1.33.5** — Feedback email diagnostics section expanded to include richer troubleshooting context: plugin status details, activity counters, and storage quota information.

**Implementation notes:**
- Recipients are fixed in immutable configuration and are not derived from user input, plugins, or URL parameters.
- The active runtime files [`dashboard.html`](dashboard.html) and [`dashboard.js`](dashboard.js) now contain the Send Feedback page and workflow logic.
- The Send Feedback page validates category, subject, and message before allowing the mail handoff.
- The prepared email body remains plain text and includes the full feedback message plus diagnostics when enabled.
- Copy fallback actions were added for email addresses, subject, and full feedback body.
- Diagnostics download remains manual and is not attached automatically.
- Attachment handling remains manual only; ReplyCators does not upload, embed, or auto-attach files.
- The Send Feedback icon mapping was changed to a local Streamline asset dedicated to this feature only.
- No new permissions, backend services, SMTP integration, OAuth flow, or direct-send transport were added.

---

## [1.33.1] — 2025-08-01

### Sidebar — Horizontal Utility Divider Collapse Bug Fix

**Type:** Bug Fix

**Root cause:** `.rc-nav__divider` (the 1px horizontal separator above the Utility section) had no `flex-shrink` property, so it defaulted to `flex-shrink: 1`. When the plugin list expanded and the `.rc-nav` flex column tried to fit all items into its constrained height (~490px), the flex algorithm shrunk all `flex-shrink: 1` items proportionally. The divider's flex basis was only `height: 1px`, so it was immediately shrunk to 0px and became invisible — before the scrollbar even activated. The spacer was protected by `min-height: 8px` but the divider had no such guard.

**Fix:** Added `flex-shrink: 0` to `.rc-nav__divider`. Also added `flex-shrink: 0` to `.rc-nav__section-title` as a defensive guard (section headings are only visible in expanded-sidebar mode and face the same potential for collapse).

**Change:** One property added to one CSS rule.

---

## [1.33.0] — 2025-08-01

### Sidebar Divider — RC-NAV-BDR001 v3 (Pseudo-element Fix)

**Type:** Bug Fix

**Root cause:** In popup mode with the sidebar collapsed (48px) and the plugin list expanded, `.rc-nav` overflows its height and activates `overflow-y: auto`. The custom `::-webkit-scrollbar { width: 5px }` rule creates a classic (non-overlay) scrollbar at the right edge of `.rc-nav`. This scrollbar track — painted as page content AFTER the `border-right` background layer — covered the 1px border at the sidebar's right edge. The `margin-right: 1px` reservation was insufficient because subpixel rounding at common DPI scaling (125%) could collapse the 1px gap to zero physical pixels, letting the scrollbar track bleed over the border.

The side panel was unaffected because the sidebar is expanded (150px+) when in side panel mode: the scrollbar occupies a small fraction of the sidebar width and the border is far from the scrollbar.

**Fix:** Removed `border-right` from `.rc-sidebar`. Added `.rc-sidebar::after` pseudo-element:

```css
.rc-sidebar::after {
  content: '';
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 1px;
  background: var(--rc-border);
  z-index: 9;           /* above .rc-nav (auto), below resize handle (10) */
  pointer-events: none;
}
```

Removed `margin-right: 1px` from `.rc-nav` (no longer needed).

The `::after` pseudo-element belongs to the stable sidebar shell, is outside the flex/scroll flow, and paints above `.rc-nav` and its scrollbar track in every state combination (popup/side panel, collapsed/expanded, scrolled/unscrolled).

---

## [1.32.0] — 2025-08-01

### Left Navigation — Options and Diagnostics in Utility Group

**Type:** UI Improvement / Information Architecture

**Summary:** Renamed the "Settings" navigation item to "Options" to align with the platform's information architecture requirements. Options and Diagnostics are both in the Utility group, adjacent, with Options preceding Diagnostics. The internal route ID (`data-view="settings"`), storage key (`rc:session:app-settings`), and all `navigateTo('settings')` call sites are unchanged — only the visible label, tooltip, and view title changed.

**Navigation changes:**

| Location | Before | After |
|---|---|---|
| Sidebar nav label | Settings | Options |
| Sidebar nav tooltip | "Configure platform appearance and plugin settings" | "Configure platform appearance, accessibility, notifications, and plugin options" |
| Dashboard quick-action card label | Settings | Options |
| View page title (`<h1>`) | Settings | Options |
| View page subtitle | "…plugin settings" | "…plugin options" |
| Diagnostics remediation action | "Open Settings" | "Open Options" |

**Final Utility group order (confirmed canonical):**

1. Options ← `data-view="settings"`
2. Diagnostics
3. Notifications
4. Activity
5. Backup & Restore
6. Documentation

**Compatibility:** No routes, storage keys, or persisted navigation state changed. Existing deep-links and `navigateTo('settings')` call sites remain valid.

---

## [1.31.0] — 2025-08-01

### Left Navigation — Information Architecture Redesign and Sidebar Divider Fix

**Type:** UI Improvement / Bug Fix

**Summary:** Redesigned the left navigation panel information architecture so that Core destinations appear at the top, plugin-related destinations are grouped in the middle, and administrative/utility actions are grouped at the bottom. Fixed a visual regression where the right-edge sidebar divider appeared broken or missing when the Plugins section was expanded and the nav was scrollable.

**Navigation IA changes:**

The nine platform navigation items are now organized into three clearly separated sections:

| Section | Items | Purpose |
|---|---|---|
| **Core** | Dashboard | Home / landing view — always topmost |
| **Plugins** | Plugin Manager, Marketplace, ▸ Installed (dynamic plugin entries) | Plugin ecosystem destinations |
| **Utility** | Options, Diagnostics, Notifications, Activity, Backup & Restore, Documentation | Configuration, health, monitoring, admin, help |

Previous order had Plugin Manager and Marketplace at the top alongside Dashboard, and the dynamic plugin entries at the very bottom (below Settings and Diagnostics). Users had to scroll past all administrative items to reach frequently-used plugin destinations.

A `rc-nav__spacer` element (`flex:1; min-height:8px`) between the Plugins section and the Utility section pushes the Utility group toward the bottom of the panel when space permits, and collapses gracefully under overflow so all items remain reachable via the existing `overflow-y:auto` scroll.

**Sidebar divider fix (RC-NAV-BDR001):**

`border-right: 1px solid var(--rc-border)` on `.rc-sidebar` is the full-height right-edge divider. `.rc-nav` has `margin-right: 1px` to reserve the border column so the nav scroll container and its children cannot paint over the border pixel when the plugin section is expanded. The `.rc-sidebar` container is never scrolled and has an explicit height (580px popup / 100vh side panel), making it the correct and stable owner of the divider. An earlier intermediate fix using `box-shadow: inset` was superseded because inset box-shadow paints below child content in CSS paint order and was covered by the expanded nav area.

**Files modified:**
- `dashboard.html` — Left navigation restructured: Core (Dashboard) → Plugins section (Plugin Manager, Marketplace, Installed toggle, `#rc-plugin-nav-items`) → spacer → Utility section (Settings, Diagnostics, Notifications, Activity, Backup & Restore, Documentation)
- `styles/dashboard.css` — `.rc-sidebar` has `border-right: 1px solid var(--rc-border)` (RC-NAV-BDR001). `.rc-nav` has `margin-right: 1px` to prevent nav content from covering the border pixel. Added `.rc-nav__spacer { flex:1; min-height:8px }` rule
- `docs/ARCHITECTURE.md` — Updated Platform Views table with Nav section column; replaced "Left Navigation Groups" with full "Left Navigation Structure" section including ASCII diagram, classification rationale table, future-entry rules, empty-state behavior, and collapsed-mode behavior
- `AGENTS.md` — Updated "Navigation Information Architecture" subsection with new three-section model, divider/spacer details, and updated governance rules

**Breaking changes:** None. All `data-view` identifiers, routes, plugin IDs, storage keys, and active-state behavior are unchanged.

**Plugin versions at this release:** Unchanged from v1.30.0.

---

## [1.30.0] — 2025-08-01

### Developer Experience — ReplyCators AI Plugin Kit, Plugin Generator, and Example Plugin Corrections

**Type:** Feature / Documentation / Bug Fix

**Summary:** Introduced the ReplyCators AI Plugin Kit as the canonical guide for building plugins against the flat-runtime architecture. Added an optional Plugin Generator for interactive scaffolding. Corrected the Example Plugin, which was missing the `onNavigate` and `onLeave` lifecycle methods and the Dashboard widget button wiring despite both being required by the runtime contract. Updated all governance and developer documentation to reflect these changes.

**Files created:**
- `docs/AI-PLUGIN-KIT.md` — ReplyCators AI Plugin Kit. Primary reference for AI agents and developers authoring new plugins. 22 sections covering: architecture overview, AI agent operating rules (15-point block), repository discovery workflow, Example Plugin guide, Workflow A (copy from Example Plugin), Workflow B (build from scratch), Workflow C (convert extension component to plugin), extension component mapping and classification, plugin registration, full lifecycle reference, UI and navigation patterns, settings integration, storage namespace patterns, messaging, permissions and security, accessibility, theming, localization, cleanup and ownership, manual validation checklist, troubleshooting, Marketplace limitations, and 5 reusable AI prompts.
- `tools/create-plugin.js` — Optional Plugin Generator script (~575 lines). Supports `basic`, `widget`, and `settings` plugin modes. Interactive and non-interactive (`--name`, `--type`, `--settings`, `--storage`, `--force`). Validates plugin IDs, rejects reserved and duplicate IDs, prevents path traversal, rejects invalid characters. Creates `plugins/<slug>.js` from the Example Plugin baseline. Rollback on failure. Prints 5-step manual registration checklist on success.

**Files modified:**
- `plugins/example-plugin.js` — Added `onNavigate()` lifecycle method (was missing; runtime calls it on navigation away). Added `onLeave()` lifecycle method (was missing; runtime calls it on view leave). Added `id="ex-widget-open-btn"` wiring in `init()` (widget button had no ID, so the `init()` handler could not attach). Added full JSDoc lifecycle comments. Added generator maintenance note. Removed TypeScript SDK capability claims from file header.
- `dashboard.html` — Added `id="ex-widget-open-btn"` to the Example Plugin Dashboard widget card button. Updated widget card description to reference AI Plugin Kit. Replaced the TypeScript SDK capability list in the Example Plugin full view with accurate flat-runtime capabilities. Added AI Plugin Kit callout section. Changed generator reference text from "Generate a new plugin" to "Optional scaffolding".
- `dashboard.js` — Added `onNavigate` delegate call for ExamplePlugin in `navigateTo()`. Added `onLeave` block for ExamplePlugin in the leave logic of `navigateTo()`.
- `package.json` — Added `"create-plugin": "node tools/create-plugin.js"` script.
- `PLUGIN-SDK.md` — Repositioned as a short redirect document. Now points to `docs/AI-PLUGIN-KIT.md` as the primary plugin authoring guide. Plugin Generator demoted to "Optional Scaffolding Generator" section. Example Plugin synchronization rule retained.
- `AGENTS.md` — Added AI Plugin Kit callout at the top of §2 Critical Rules. Updated §4 repository structure tree entry for `create-plugin.js`. Replaced §10 "To add a new plugin" section: AI Plugin Kit is now the primary path; generator is optional. Updated §23 Documentation Map with new and corrected entries.
- `docs/CONTRIBUTING.md` — Updated "Adding a New Plugin" section: AI Plugin Kit is the primary path; generator is optional scaffolding.
- `docs/ARCHITECTURE.md` — Corrected ExamplePlugin description from "Minimal reference implementation demonstrating all SDK capabilities" to an accurate flat-runtime description referencing `init`, `render`, `onNavigate`, `onLeave`, and the AI Plugin Kit.
- `plugins/documentation.js` — Updated `example-plugin` topic with accurate lifecycle table, widget integration, and AI Plugin Kit references. Added `release-notes` entries for v1.28.0, v1.29.0, v1.29.1, and v1.30.0.

**Discrepancies corrected:**
- `plugins/example-plugin.js` only implemented `init` — `onNavigate` and `onLeave` were absent despite being wired in the runtime. Both methods are now present.
- `dashboard.js` had no `onNavigate` or `onLeave` delegate calls for ExamplePlugin. Both are now wired.
- `dashboard.html` Example Plugin full view listed `registerPage()`, `registerDashboardComponent()`, and other TypeScript SDK methods from the **inactive** `src/` architecture. These have been replaced with the actual flat-runtime capabilities.
- The Example Plugin Dashboard widget card button had no `id` attribute, making it impossible for `init()` to attach an event handler to it.

**Breaking changes:** None. All existing plugin IDs, storage keys, settings keys, messaging APIs, and user-visible behavior are unchanged. The Example Plugin correction adds missing lifecycle delegates; no existing functionality is removed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.29.1] — 2025-08-01

### Cloudability OrgID — Startup Stale Widget Regression Fix

**Type:** Bug Fix

**Summary:** The Cloudability OrgID dashboard widget incorrectly displayed an OrgID from a previous session (or previously visited tab) when the extension was opened while a non-Cloudability tab was active. The widget should always show "No active Cloudability tab detected" on startup unless the currently active browser tab is a Cloudability tab — matching the SF Case Extractor startup behaviour.

**Root Cause:** The `init()` startup block in `plugins/cloudability-orgid.js` first pre-populated `cldState` from storage and immediately called `cldUpdateUI('cache')` — painting the stale cached OrgID on the widget. It then called `findCloudabilityTab()` to check whether the active tab was Cloudability. If the active tab was **not** Cloudability, the callback returned early (`return`) without updating the UI, leaving the stale cached value visible. The correct behaviour — calling `cldShowUnavailable()` — only happened on explicit `onNavigate()` and manual `cldRetrieve()` calls, not at startup.

**Regression introduced:** v1.21.0 (startup optimization that deferred the CLD tab scan) combined with the CS-FV1-001 fix (startup cache pre-population added) left a path where the cache was painted to the UI before the tab check could clear it.

**Fix:** The startup block now restores the cached value into memory **only** (no `cldUpdateUI` call). The `findCloudabilityTab()` callback then decides the UI outcome:
- No active Cloudability tab → `cldClearState()` + `cldShowUnavailable()` (shows "No active Cloudability tab detected")
- Active Cloudability tab found → `cldRetrieve(true)` for a live retrieval (existing behaviour)

This matches the SF Case Extractor pattern exactly: `sfRefreshDetectionBanner()` is called unconditionally at `init()` and always reflects the current tab reality regardless of any stored state.

**Files changed:**
- `plugins/cloudability-orgid.js` — Startup block: removed `cldUpdateUI('cache')` call; changed no-tab path from early `return` to `cldClearState()` + `cldShowUnavailable()`; updated comments to describe correct behaviour

**Breaking changes:** None. No storage keys changed. No API changes. The RC_CLD_ORG_UPDATE listener and all other update paths are unchanged.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.29.0] — 2025-08-01

### Dashboard — Plugins-First Information Architecture Reorganization

**Type:** Enhancement / UI / Information Architecture / Accessibility

**Summary:** Reorganized the Dashboard view to put high-frequency plugin actions and functions first. Quick Actions are now at the top of the Dashboard (section 1), directly below the header, giving immediate access to the most-used features without scrolling. Plugin widget cards (Plugin Functions) are now section 2 — the primary visual focus. Platform Status (stats row) is moved to section 3 as secondary/de-emphasized information. Sidebar navigation icons are reordered by functional group: primary navigation → activity/status → configuration → secondary utilities → plugins. Quick Actions expanded to cover Tab Search, Workspace Starter, Docs Finder, and Bookmark Finder. Default plugin ordering updated to prioritize productivity tools (CRM → cloud → search → workspace → docs → bookmarks → enterprise → games → example).

**Files changed:**
- `dashboard.html` — Reordered sidebar nav icons by functional group (Notifications before Activity, Settings before Diagnostics, group comments added); reordered Dashboard view DOM: Quick Actions (section 1) → Plugin Functions (section 2) → Platform Status (section 3); added semantic `<section>` wrappers with `aria-label` for each Dashboard section; expanded Quick Actions from 4 to 6 items (added Tab Search, Workspace Starter, Docs Finder, Bookmark Finder with plugin-action data attributes); removed old Quick Actions block at bottom of Dashboard; removed standalone stats row at top of Dashboard
- `dashboard.js` — Updated `DEFAULT_PLUGIN_ORDER` to prioritize by frequency/importance: CRM → cloud → tab search → workspace → docs → bookmarks → enterprise → snake → example
- `styles/dashboard.css` — Added `.rc-dashboard-section` and `.rc-dashboard-section--secondary` wrapper styles; added `.rc-section-header` and `.rc-section-header--secondary` styles; set `rc-dashboard-widgets` and `rc-stats-row` `margin-bottom: 0` (section wrapper controls spacing); added `.rc-dashboard-widgets:empty::after` empty state; updated quick-actions grid `minmax` to 130px; added side panel responsive overrides for new sections; updated Quick Actions grid to `minmax(110px, 1fr)` in side panel
- `styles/platform.css` — Added `[data-dash-show-cards="false"] #rc-widgets-section` hide rule; improved compact-mode rules to use section-level spacing
- `dist/dashboard.html`, `dist/dashboard.js`, `dist/styles/dashboard.css`, `dist/styles/platform.css` — synced from root

**Breaking changes:** None. All existing plugin IDs, storage keys, messaging, and plugin APIs are unchanged. Users with a saved dashboard order will continue using their saved order (override takes precedence over DEFAULT_PLUGIN_ORDER).

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0


## [1.28.0] — 2025-07-31

### Diagnostics — Unified Cache Registry and Cache & Storage Inspector

**Type:** Feature / Diagnostics / Storage / Security

**Summary:** Added a centralized cache registry and a new Cache & Storage tab inside Diagnostics. Registered caches are now evaluated with consistent metadata, TTL status, estimated size, safe refresh/clear actions, orphaned key detection, and sensitivity-aware presentation that avoids exposing raw cached payloads.

**Files changed:**
- `dashboard.js` — added cache registry metadata, timestamp normalization, TTL evaluation, size estimation, cache diagnostics collection, cache action orchestration, diagnostics tab switching, and cache inspector rendering; sanitized Cloudability values in diagnostics snapshot
- `dashboard.html` — added Diagnostics tab switcher and Cache & Storage panel with filters, summary area, grouped cache list, and status surface
- `styles/dashboard.css` — added Cache & Storage inspector layout and responsive card styling
- `plugins/cloudability-orgid.js` — added plugin-owned cache refresh and clear hooks
- `plugins/apptio-upgrade-calculator.js` — added plugin-owned schedule cache refresh and clear hooks
- `plugins/apptio-docs-finder.js` — added plugin-owned documentation cache refresh and clear hooks
- `plugins/bookmark-finder.js` — added plugin-owned bookmark scan cache refresh and clear hooks
- `docs/STORAGE.md` — documented unified cache registry contract, TTL rules, protected categories, and diagnostics behavior
- `dist/dashboard.js`, `dist/dashboard.html`, `dist/styles/dashboard.css`, `dist/plugins/cloudability-orgid.js`, `dist/plugins/apptio-upgrade-calculator.js`, `dist/plugins/apptio-docs-finder.js`, `dist/plugins/bookmark-finder.js` — synced from root

**Breaking changes:** None. Existing storage keys preserved. Diagnostics adds metadata and management only.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

## [1.28.0] — 2025-07-31

### Diagnostics — Pre-flight Health Check System v2 (Full Implementation)

**Type:** Feature / Enhancement / Bug Fix / Security

**Summary:** Complete implementation of the unified Pre-flight Health Check system for the Diagnostics Center. Adds two new dependency checks (Bob CLI on PATH and Node.js runtime), redesigns the UI with grouped categories, per-card remediation guidance, retry buttons, an overall summary bar, ARIA live region for screen reader announcements, a dedicated "Run All Checks" button, and word-wrapping for detail text. Fixes a pre-existing `BOB_HELPER_PORT` undefined-reference bug in `dashboard.js`. Removes the Cloudability OrgID leak from the Cloudability context check. Adds `/cli-check` endpoint to the Bob Helper server and `RC_PREFLIGHT_CLI_CHECK` message handler to `background.js`.

**Files changed:**
- `dashboard.js` — Defined `_BOB_HELPER_PORT_DIAG = 47123` (fixes pre-existing undefined-variable bug); added generation counter `_preflightGeneration` and concurrency flag `_preflightRunning`; rewrote `_buildPreflightCard()` with status badge, remediation field, retry button, ARIA attributes; added `_buildPreflightGroupHeader()`, `_updatePreflightSummary()`, `_announcePreflightStatus()`, `_retryPreflightSingle()`; rewrote `loadPreflightChecks()` with grouped layout (Storage / Browser Permissions / Local Runtime / External Services / Active Browser Context), stale-result guard, summary bar update, screen reader announcement; added `checkBobCli` (CHECK-NEW-CLI) and `checkNodeRuntime` (CHECK-NEW-NODE); fixed Cloudability org ID leak (never shown in UI); wired `#rc-preflight-run-all` click handler; version header bumped to v1.28.0
- `dashboard.html` — Added ARIA live region `#rc-preflight-live` (assertive); added `#rc-preflight-header` wrapper with "Run All Checks" button; added `#rc-preflight-summary` status bar; added `role="list"` and `aria-label` to `#rc-preflight-checks`; moved Refresh button below Pre-flight section
- `styles/dashboard.css` — Added `.rc-sr-only` (screen-reader-only utility); `.rc-preflight__header` (flex row for title + button); `.rc-preflight__summary` and modifier classes (`--pass`, `--warn`, `--fail`) with `color-mix` tinting and `@supports` fallback; `.rc-preflight-group-header` and `.rc-preflight-group-skipped`; `.rc-preflight-card__status` (icon + badge stack); `.rc-preflight-card__badge` (text status label); `.rc-preflight-card__remediation`; `.rc-preflight-card__retry`; changed `.rc-preflight-card__label` and `.rc-preflight-card__detail` to `word-break: break-word` (was `white-space: nowrap`, causing detail text clipping); `:focus-visible` rules for action and retry buttons; `.rc-btn--sm` variant
- `background.js` — Added `RC_PREFLIGHT_CLI_CHECK` message handler: proxies `GET http://127.0.0.1:{BOB_HELPER_PORT}/cli-check` with 4 s timeout; returns `{ ok, bobFound, bobBasename, bobVersion, nodeFound, nodeBasename, nodeVersion }` or `{ ok: false, serverDown: true, error }` on failure
- `tools/bob-helper-server.js` — Added `GET /cli-check` endpoint: returns sanitized CLI/Node metadata (`bobFound`, `bobBasename`, `bobVersion` — version validated against safe regex; `nodeFound`, `nodeBasename`, `nodeVersion` from `process.versions.node`); full PATH is never exposed; `bob --version` result is range-checked before inclusion
- `dist/dashboard.js`, `dist/dashboard.html`, `dist/styles/dashboard.css`, `dist/background.js` — Synced from root

**New checks added:**

| ID | Label | Group | Scope |
|----|-------|-------|-------|
| CHECK-NEW-CLI | Bob CLI (IBM Bob) | Local Runtime | Feature-gated (SF plugin enabled) |
| CHECK-NEW-NODE | Node.js Runtime | Local Runtime | Feature-gated (SF plugin enabled) |

**Complete check inventory after v1.28.0:**

| ID | Label | Group | Scope |
|----|-------|-------|-------|
| CHECK-01 | Storage Quota | Storage | Platform — always |
| CHECK-02 | Host Permissions: Salesforce | Browser Permissions | Feature-gated (SF plugin enabled) |
| CHECK-03 | Host Permissions: Cloudability | Browser Permissions | Feature-gated (CLD plugin enabled) |
| CHECK-04 | Host Permissions: IBM Docs | Browser Permissions | Feature-gated (ADF plugin enabled) |
| CHECK-11 | Permission: Bookmarks API | Browser Permissions | Feature-gated (BM plugin enabled) |
| CHECK-05 | Bob Helper Server | Local Runtime | Feature-gated (SF plugin enabled) |
| CHECK-05b | Bob Helper Port Sync | Local Runtime | Feature-gated (SF plugin enabled) |
| CHECK-NEW-CLI | Bob CLI (IBM Bob) | Local Runtime | Feature-gated (SF plugin enabled) |
| CHECK-NEW-NODE | Node.js Runtime | Local Runtime | Feature-gated (SF plugin enabled) |
| CHECK-06 | Bob Working Directory | Local Runtime | Feature-gated (SF plugin enabled) |
| CHECK-07 | IBM Docs API | External Services | Feature-gated (ADF plugin enabled) |
| CHECK-08 | Salesforce Browser Context | Active Browser Context | Feature-gated (SF plugin enabled) |
| CHECK-09 | Cloudability Browser Context | Active Browser Context | Feature-gated (CLD plugin enabled) |

**Bug fixes included in this release:**
- **PF-FV1-001 (High):** `BOB_HELPER_PORT` was undefined in `dashboard.js` — pre-existing bug where the variable was used but never declared, causing `undefined === undefined` to always pass the port-sync check. Fixed: declared `_BOB_HELPER_PORT_DIAG = 47123`.
- **PF-FV1-002 (Medium):** `_retryPreflightSingle` called `loadPreflightChecks()` without resetting `_preflightRunning`, causing retry to be silently blocked by the concurrency guard. Fixed: reset flag before re-run.
- **Security:** Cloudability context check previously exposed `cldCached.orgId` directly in the card detail string. Fixed: detail now says "previously cached OrgID" without the value.

**Breaking changes:** None. Additive only. No storage keys modified. No existing message types changed. `RC_PREFLIGHT_CLI_CHECK` is a new message type.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---


## [1.27.6] — 2025-07-25

### Tools — Bob Helper tray removal, /pick-dir dead code cleanup, kill-logic deduplication

**Type:** Refactor / Governance

**Summary:** Three targeted simplifications to the Bob Helper subsystem: (1) `bob-helper-tray.ps1` removed — the PowerShell system-tray GUI wrapper is replaced by the existing plain-text interface (`bob-helper.cmd start` foreground, `bob-helper.cmd install` for auto-start on login); (2) the `/pick-dir` endpoint, `pickFolderWithPowershell()`, and `RC_PICK_BOB_DIR` handler are removed as confirmed dead code (Browse button removed from Settings UI in v1.26.1); (3) the duplicated WMIC + PowerShell process-kill logic in `bob-helper.cmd` is consolidated into a single shared `:_KillBobHelperProcess` subroutine. No extension functionality changes — Execute, health-check, and all other Bob Helper operations are fully preserved.

**Changes:**

1. **Removed `tools/bob-helper-tray.ps1`**
   The PowerShell Windows Forms tray icon script introduced in v1.27.6 is deleted. The `tray` verb is removed from `bob-helper.cmd`. Users who want background server execution without a terminal should use `tools\bob-helper.cmd install` to register a Windows Scheduled Task (auto-start on login, hidden execution). Users who want a visible foreground terminal use `tools\bob-helper.cmd` or `tools\bob-helper.cmd start`.

2. **Removed dead `/pick-dir` endpoint, `pickFolderWithPowershell()`, and `RC_PICK_BOB_DIR` background handler**
   The `POST /pick-dir` route was the server-side handler for the Browse button in Settings → Salesforce Case Extractor → Bob Working Directory. That button was removed from the UI in v1.26.1 (settings became a plain text input). The three layers of dead code — server function (~70 lines), server endpoint handler, background.js message handler (~40 lines) — are all removed. `powershell.exe` is no longer a server dependency.

3. **Deduplicated kill logic in `bob-helper.cmd` (`:_KillBobHelperProcess` subroutine)**
   `:CmdStop` and `:CmdStopQuiet` previously implemented identical WMIC + PowerShell Get-CimInstance fallback kill logic. This is now extracted into a single shared `:_KillBobHelperProcess` subroutine. Both callers delegate to it. Any future fix (e.g. for WMIC deprecation in Windows 11 24H2) needs to be applied in one place only. `bob-helper.cmd` updated to v1.2.0.

**Files changed:**
- `tools/bob-helper-tray.ps1` — **Deleted**
- `tools/bob-helper.cmd` — v1.1.0 → v1.2.0: `tray` verb removed; `:_KillBobHelperProcess` shared subroutine added; `:CmdStop` / `:CmdStopQuiet` refactored to delegates; help text updated
- `tools/bob-helper-server.js` — `pickFolderWithPowershell()` removed; `POST /pick-dir` handler removed (~70 lines)
- `background.js` — `RC_PICK_BOB_DIR` handler removed (~40 lines); removal comment added
- `dist/background.js` — Synced from root
- `AGENTS.md` — Repository structure, Documentation Map, Known Limitations updated; `bob-helper.cmd` version updated to v1.2.0
- `docs/BOB-HELPER-SERVER.md` — §3 file inventory, §4 architecture diagram, §5 responsibilities, §6 integration, §8 communication flows (directory-picker flow removed), §11 HTTP API (§11.3 /pick-dir section removed, routes renamed), §12 hardcoded constants (pick-dir timeout row removed), §13 starting server options (tray option removed), §14 dependencies (powershell.exe row removed), §16 messaging protocol (RC_PICK_BOB_DIR section removed), §19 limitations updated, §20 debug log example updated, §21 port constant description updated, §22 DV-001 updated, §23 appendix updated
- `docs/plugins/salesforce-case-extractor.md` — Prerequisites: tray option removed from startup list

**Breaking changes:** None to extension functionality. `tray` verb removed from `bob-helper.cmd` — users previously relying on tray should use `bob-helper.cmd install` (Scheduled Task, auto-start on login) or `bob-helper.cmd start` (foreground terminal).

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.27.5-b] — 2025-07-25

> **Note:** This entry covers an intermediate patch session. The tray icon introduced here was removed in v1.27.6. The foundational v1.27.5 scripts consolidation is in the entry below.

### Tools — Bob Helper UX hardening, tray icon, WMIC fallback, and repo hygiene

**Type:** Enhancement / Bug Fix / Governance

**Summary:** Five improvements to the Bob Helper tooling and repository hygiene: (1) `bob-helper.cmd`
now defaults to `start` when run without arguments so double-clicking works immediately;
(2) a new `tray` verb launches the server as a hidden background process via a system tray icon
(`tools/bob-helper-tray.ps1`); (3) `:CmdStop` and `:CmdStopQuiet` gain a PowerShell
`Get-CimInstance` fallback for the impending WMIC deprecation in Windows 11 24H2+;
(4) `tools/create_icons.html` is moved to `build/` alongside its scriptable sibling
`build/gen_icons.js`; (5) a stale artifact file `18` at the project root is deleted.

**Changes:**

1. **Default verb — `bob-helper.cmd` auto-start (no argument → `start`)**
   Running `tools\bob-helper.cmd` without any arguments previously showed the help screen.
   It now starts the Bob Helper server immediately, identical to `tools\bob-helper.cmd start`.
   The `help` / `-h` / `--help` / `/?` verbs still display usage. The Scheduled Task (`:CmdInstall`)
   uses the explicit `start` verb and is unaffected. Version bumped to v1.1.0.

2. **System tray icon — `bob-helper.cmd tray` + `bob-helper-tray.ps1`**
   `tools\bob-helper.cmd tray` launches a new PowerShell script `tools/bob-helper-tray.ps1`
   with `-WindowStyle Hidden`. The script starts the Node.js server as a hidden child process
   with stdout/stderr redirected to `%TEMP%\replycators-bob-helper\server.log`. A `NotifyIcon`
   tray entry provides: Status balloon, Open Log Folder, Stop Server, Restart Server, Exit.
   The tray icon is green while the server responds to `/health` and amber when it does not.
   A 30-second periodic health timer keeps the icon state current.

3. **WMIC deprecation fallback in `:CmdStop` and `:CmdStopQuiet`**
   WMIC is deprecated in Windows 11 24H2 and will be removed in a future build. Both stop
   subroutines now have a PowerShell `Get-CimInstance Win32_Process` fallback path that runs
   when WMIC returns no results. The primary WMIC path is unchanged for current Windows versions.

4. **Moved `tools/create_icons.html` → `build/create_icons.html`**
   The browser-based icon generator belongs beside its scriptable sibling `build/gen_icons.js`.
   The `tools/` directory is now exclusively Bob Helper components. No build or runtime
   dependency on this file exists; the move is purely structural.

5. **Deleted stale artifact file `18` at project root**
   A file named `18` (containing `[CHECK 1] Node.js  ...`) was an accidental redirect artifact
   from a prior `bob-helper.cmd check` invocation. Deleted.

**Files changed:**
- `tools/bob-helper.cmd` — v1.0.0 → v1.1.0: default verb, tray verb, updated help, WMIC fallback in :CmdStop/:CmdStopQuiet
- `tools/bob-helper-tray.ps1` — Created: PowerShell system tray icon script (v1.0.0)
- `build/create_icons.html` — Moved from `tools/create_icons.html`
- `18` (root) — Deleted: stale redirect artifact
- `AGENTS.md` — Repository structure, Documentation Map, Known Limitations updated
- `docs/BOB-HELPER-SERVER.md` — Starting the Server section updated with new options
- `docs/INSTALLATION.md` — Setup checklist and start options updated
- `docs/TROUBLESHOOTING.md` — Fix steps updated with no-argument and tray options
- `docs/plugins/salesforce-case-extractor.md` — Prerequisites section updated

**Breaking changes:** None. All existing verbs (`check`, `start`, `stop`, `status`, `install`,
`uninstall`) behave identically. The Scheduled Task uses `bob-helper.cmd start` explicitly
and is unaffected by the default-verb change.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.27.5] — 2025-07-25

### Platform — Bob Helper scripts consolidated into unified bob-helper.cmd

**Type:** Refactor / Enhancement / Bug Fix

**Summary:** The four individual Bob Helper management scripts (`start-bob-helper.cmd`,
`setup-check.cmd`, `install-autostart.cmd`, `uninstall-autostart.cmd`) were consolidated
into a single versioned `tools\bob-helper.cmd` management script with verb-based subcommands.
This eliminates duplicated Node.js discovery logic, fixes portability issues that caused silent
failures on machines where Node.js is not on the system PATH, fixes port hardcoding in
the pre-flight check, improves Scheduled Task resilience, and adds new `stop` and `status`
subcommands for observability.

**Root causes fixed:**

1. **P1 — Silent failure when Node.js not on PATH** — `start-bob-helper.cmd` called `node`
   bare from PATH with no fallback. Machines using nvm, fnm, Scoop, or the IBM Runtime
   (`C:\Work\Bob\Runtime\NodeJS`) would silently fail with a "not recognized" error. Fixed:
   all subcommands now use a shared `:FindNode` subroutine with 8-candidate discovery.

2. **P1 — Scheduled Task baked absolute node.exe path** — `install-autostart.cmd` hardcoded
   the resolved `node.exe` path and server script path into the task XML. After a Node upgrade
   or project move the task silently failed at login. Fixed: the task now calls
   `bob-helper.cmd start` via `cmd.exe`, so node resolution happens at task execution time.

3. **P2 — Duplicated Node discovery logic** — 16 lines of Node fallback discovery were
   copy-pasted verbatim in both `setup-check.cmd` and `install-autostart.cmd`. Fixed:
   single `:FindNode` subroutine in `bob-helper.cmd`, called by all subcommands.

4. **P2 — Port hardcoded in setup-check.cmd** — Port `47123` was a literal in the check;
   users with a custom `REPLYCATORS_BOB_HELPER_PORT` would see misleading results. Fixed:
   all subcommands read `%REPLYCATORS_BOB_HELPER_PORT%` with `47123` as the default.

5. **P2 — No guard against already-running server** — Double-clicking `start-bob-helper.cmd`
   while a server was running opened a second terminal that immediately printed a bind error
   and closed. Fixed: `:CmdStart` pre-checks the port and prints an informative message.

6. **P2 — Azure AD / Entra ID task registration** — `install-autostart.cmd` used
   `%USERDOMAIN%\%USERNAME%` for the task `<UserId>`. On Azure AD-joined machines this format
   can cause task registration to fail. Fixed: `whoami /upn` is tried first with fallback to
   `%USERDOMAIN%\%USERNAME%`.

7. **P2 — Stale doc reference in setup-check.cmd** — Line 154 referenced
   `docs\BOB-HELPER-SERVER.md` which does not exist. Fixed: now references
   `docs\TROUBLESHOOTING.md`.

8. **Minor — Node version guard missing from start-bob-helper.cmd** — Users with Node 16
   would get cryptic startup errors. Fixed: `:CmdStart` validates Node ≥ 18 before launching.

**New capabilities added:**
- `tools\bob-helper.cmd stop` — kills any running `bob-helper-server.js` Node process.
- `tools\bob-helper.cmd status` — probes `/health` and prints PID, port, Bob command, temp root.
- `tools\bob-helper.cmd help` — usage reference.
- `RC_NODE_HOME` environment variable — override Node.js directory for environments that
  cannot add Node to the system PATH.

**Minor server improvements:**
- `bob-helper-server.js`: `cleanupOldTempFiles()` now also removes empty subdirectories from
  `TEMP_ROOT` to prevent unbounded accumulation.
- `bob-helper-server.js`: `Access-Control-Allow-Origin: *` CORS header now includes a comment
  documenting why the wildcard is intentional (localhost-only binding + unpredictable
  chrome-extension:// origin).
- `bob-launcher-template.cmd`: window title now includes the prompt filename so concurrent
  Bob sessions are distinguishable in the Windows taskbar.

**Files changed:**
- `tools/bob-helper.cmd` — Created: unified management script (replaces 4 scripts below)
- `tools/start-bob-helper.cmd` — Deleted (replaced by `bob-helper.cmd start`)
- `tools/setup-check.cmd` — Deleted (replaced by `bob-helper.cmd check`)
- `tools/install-autostart.cmd` — Deleted (replaced by `bob-helper.cmd install`)
- `tools/uninstall-autostart.cmd` — Deleted (replaced by `bob-helper.cmd uninstall`)
- `tools/bob-helper-server.js` — Subdir cleanup + CORS comment
- `tools/bob-launcher-template.cmd` — Richer window title
- `plugins/salesforce-case-extractor.js` — Updated 3 user-facing string references
- `plugins/documentation.js` — Updated help text reference
- `AGENTS.md` — § 3 repository structure, § 23 documentation map, § 24 known limitations
- `docs/TROUBLESHOOTING.md` — All script references updated to new command syntax
- `docs/INSTALLATION.md` — All script references updated to new command syntax
- `docs/plugins/salesforce-case-extractor.md` — Prerequisites section updated
- `README.md` — Version field corrected

**Breaking changes:** None. The server, all HTTP endpoints, the launcher template, and all
extension-side behaviour are unchanged. The only breaking change is the removal of the four
old script names — any desktop shortcuts or documentation bookmarks to those scripts must
be updated to the new `bob-helper.cmd <verb>` form.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.27.4] — 2026-07-25

### Platform — Bob Helper portability, cross-machine setup, and diagnostics hardening

**Type:** Bug Fix / Enhancement / Governance

**Summary:** Comprehensive portability fix for the Bob Helper Server — the primary reason
the Salesforce Case Extractor Execute feature worked only on the original development machine
and failed silently on all others. Four compounding root causes were identified and addressed:
(1) NVM for Windows node discovery used an incorrect path; (2) no automated pre-flight
validation tool existed; (3) no auto-start mechanism existed for the helper server; (4) a
diagnostics gap (missing CHECK-06b port-sync check) meant port mismatches between the
extension and server were invisible to users. Additionally: graceful temp-file cleanup on
server shutdown was added to prevent PII persistence; a missing `port` field in the `/health`
response was added; and the `plugins/` directory was added to the `build/sync-root.js` sync
list, which previously meant plugin module changes would not be propagated to `dist/` by the
postbuild hook.

**Root causes fixed:**

1. **NVM for Windows path bug** — `start-bob-helper.cmd` probed `%NVM_HOME%\nodejs\node.exe`
   which is not a valid NVM for Windows path. Corrected to probe `%NVM_SYMLINK%`,
   `%APPDATA%\nvm\current\node.exe`, and fnm shims.

2. **No pre-flight validator** — New developers had no single tool to verify prerequisites
   (Node.js ≥18, IBM Bob CLI, port availability, template existence, TEMP writability).
   Created `tools/setup-check.cmd`.

3. **No auto-start mechanism** — Bob Helper had to be started manually every login. Created
   `tools/install-autostart.cmd` (Windows Scheduled Task, per-user, ONLOGON trigger) and
   corresponding `tools/uninstall-autostart.cmd`.

4. **Diagnostics gap — CHECK-06b** — If `REPLYCATORS_BOB_HELPER_PORT` env var is set on the
   server but `BOB_HELPER_PORT` in `background.js` is not updated, all Execute calls silently
   fail. Added `checkBobHelperPortSync()` (CHECK-06b) to the diagnostics panel to detect and
   report this mismatch with an actionable fix message.

5. **Missing `port` field in `/health` response** — CHECK-05 and the dashboard detail string
   had no way to know which port the server was actually on. Added `port: PORT` to the
   `/health` JSON response; updated CHECK-05 detail string and the health-check log message
   in `plugins/salesforce-case-extractor.js` to use the returned port value.

6. **No graceful shutdown / temp-file cleanup** — Salesforce case text is written to temp
   files in `%TEMP%\replycators\` for Bob CLI processing. If the server was killed (Ctrl+C,
   Task Manager, Task Scheduler stop), all in-flight temp files persisted indefinitely,
   potentially exposing customer PII. Added `cleanupAllTempFiles()` with `SIGINT`, `SIGTERM`,
   and process `exit` handlers.

7. **`plugins/` missing from sync-root.js** — `SYNC_DIRS` in `build/sync-root.js` did not
   include `['plugins', 'dist/plugins']`, so all plugin module files in `plugins/*.js` were
   never synced to `dist/` by `npm run build` or `npm run sync`. Fixed.

8. **BOB-HELPER-SERVER.md §7 stale claim** — Documented "no caching" for Bob CLI path
   resolution, but a 5-minute TTL cache has existed since earlier versions. Updated to
   accurately describe the cache.

9. **docs/plugins/salesforce-case-extractor.md version drift** — Showed plugin version
   4.3.0; corrected to 4.6.0.

**Files changed:**
- `tools/start-bob-helper.cmd` — NVM for Windows discovery corrected (multiple fallback paths)
- `tools/setup-check.cmd` — Created: pre-flight validator (5 checks, pass/fail/warn summary)
- `tools/install-autostart.cmd` — Created: Windows Scheduled Task installer (ONLOGON)
- `tools/uninstall-autostart.cmd` — Created: Windows Scheduled Task remover
- `tools/bob-helper-server.js` — Added `port` to `/health`; added graceful shutdown cleanup
- `dashboard.js` — Fixed port literal in CHECK-05 detail; added `checkBobHelperPortSync()` CHECK-06b
- `dist/dashboard.js` — Mirror synced
- `plugins/salesforce-case-extractor.js` — Fixed port literal in health-check log message
- `dist/plugins/salesforce-case-extractor.js` — Mirror synced
- `build/sync-root.js` — Added `['plugins', 'dist/plugins']` to SYNC_DIRS
- `docs/BOB-HELPER-SERVER.md` — Multiple sections updated (see below)
- `docs/INSTALLATION.md` — Added clean-machine checklist, IBM Bob CLI section, auto-start docs
- `docs/TROUBLESHOOTING.md` — Added IBM Bob CLI not installed section; updated Execute section
- `docs/ARCHITECTURE.md` — Updated last-updated marker to v1.27.3
- `docs/plugins/salesforce-case-extractor.md` — Version corrected 4.3.0→4.6.0; Windows-only note; new tools documented

**Breaking changes:** None. All existing behaviour is preserved. New diagnostics check
(CHECK-06b) only runs during the diagnostics view load — no startup cost.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.27.3] — 2026-07-24

### Platform — Side panel width now persists across sessions

**Type:** Bug Fix

**Summary:** The side panel sidebar width is now reliably saved and restored across
panel reopens and browser restarts. Two independent bugs prevented this from working:
(1) a batch-read exclusion that prevented the saved value from ever being loaded on
startup; (2) a missing save-flush path that meant width changes were silently
discarded whenever the user's mouse exited the side panel frame during a drag.

**Root cause — Bug 1 (restore never worked):**
`RC_STORE_SIDEBAR_WIDTH` was a standalone constant not included in `RC_STORE`, so
`restoreSession()` never requested it in its single batched
`chrome.storage.local.get()`. `restoreSidebarWidth()` issued its own separate async
storage call which raced against `detectAndApplySidePanelMode()` — if `body.rc-sidepanel`
was not yet set at callback time the guard returned early and discarded the saved value.

**Root cause — Bug 2 (save never completed — the primary failure):**
The side panel is a separate browser document. The `mouseup` listener was registered
on `document` inside the panel. When the user drags the resize handle and the mouse
moves into the main browser content area before releasing, `mouseup` fires in the
tab's document — not in the side panel's document. The side panel's `mouseup` listener
never fired, `dragging` remained `true`, and `chrome.storage.local.set` was never
called. The saved value in storage was always the value from the previous successful
save (or nothing, on first use).

**Fix — Bug 1:**
- Added `SIDEBAR_WIDTH: 'rc:session:sidebar-width'` to the `RC_STORE` constant so
  the value is fetched in the same batched call as all other session state.
- Moved `SIDEBAR_MIN_WIDTH` / `SIDEBAR_MAX_WIDTH` constants before `restoreSession()`.
- Added `_restoredSidebarWidth` staging variable (same pattern as `_restoredNavView`).
- Populated `_restoredSidebarWidth` inside `restoreSession()` with validation.
- Refactored `restoreSidebarWidth()` to be a synchronous DOM write from the staging var.

**Fix — Bug 2:**
- Extracted drag commit logic into a single `commitDrag()` function.
- `commitDrag()` is now called on three events: `document mouseup` (normal release
  inside the panel), `document mouseleave` (mouse exited the panel frame during drag),
  and `window blur` (panel lost focus). All three paths call `chrome.storage.local.set`.
- `commitDrag()` is idempotent — `if (!dragging) return` prevents double-saves.

**Files changed:**
- `dashboard.js` — All changes described above
- `dist/dashboard.js` — Mirror synced

**Breaking changes:** None. Storage key `rc:session:sidebar-width` is unchanged —
any width saved by a previous version is restored correctly by this version.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.27.2] — 2026-07-24 (updated)

### Documentation — v1.27.2 post-release alignment

**Type:** Governance

**Summary:** Resolved all documentation drift introduced by the v1.27.2 Bob Helper portability
fixes. Every document that described now-changed behaviours (temp cleanup, port coupling,
Bob CLI path caching, /health response schema, Node.js discovery, CHECK-05 output) has been
updated to accurately reflect the current implementation. Version markers propagated to all
authoritative locations.

**Files changed:**
- `README.md` — Extension version updated to 1.27.2
- `dist/package.json` — Version updated to 1.27.2
- `AGENTS.md` — "Current plugin versions at platform" heading updated to v1.27.2
- `docs/INSTALLATION.md` — Last-updated marker updated to v1.27.2
- `docs/PACKAGING.md` — Last-updated marker updated to v1.27.2
- `docs/TROUBLESHOOTING.md` — Last-updated marker updated to v1.27.2; Bob Helper Execute
  section rewritten to describe the new 3-state CHECK-05 diagnostic (Pass / Warn-Bob-missing /
  Warn-not-running) and include IBM Bob PATH troubleshooting guidance
- `docs/BOB-HELPER-SERVER.md` — Platform version header updated to 1.27.2; all stale
  sections updated: §11.1 /health response schema (added `ready` field); §12 Hardcoded
  Constants table (replaced 3 URL rows with single `BOB_HELPER_PORT` constant, added
  pick-dir timeout, Bob CLI TTL, corrected temp cleanup note); §12 env var description
  corrected (one edit, not three); §13 Option A description updated (6 Node.js discovery
  locations); §13 Confirming section updated (new CHECK-05 states); §14 System Dependencies
  Node.js row updated; §18 Port Conflict resolution text corrected; §18 Temp Directory
  Growth updated; §19 Limitations table updated (3 rows); §21 Changing the Port rewritten
  with BOB_HELPER_PORT snippet; §21 Temp File Accumulation rewritten; §22 DV-001 resolved
  (Browse button absence confirmed); §22 DV-003 resolved (60 s timeout confirmed in v1.27.2);
  §22 DV-004 updated with v1.27.2 line number drift note
- `bob-helper-technical-reference.html` — Platform version updated to 1.27.2
- `docs/reports/bob-helper-technical-reference.html` — Platform version updated to 1.27.2

**Breaking changes:** None

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

> 📦 **Archived:** Verbose entries for v1.27.1 and below are in [`docs/CHANGELOG-ARCHIVE.md`](docs/CHANGELOG-ARCHIVE.md).

---

Entries are in **reverse-chronological order** (newest first).
Format follows the [Versioning Rules](AGENTS.md#versioning-rules) defined in `AGENTS.md`.

---

## Entry Format

```
## [<platform-version>] — YYYY-MM-DD

### <Plugin or Platform component> — <short title>

**Type:** Feature | Bug Fix | Enhancement | Refactor | UI | Config | Breaking | Governance

**Summary:** One or two sentences describing what changed and why.

**Files changed:**
- path/to/file — what changed

**Breaking changes:** None | <description and migration path>

**Plugin versions at this release:**
- Salesforce Case Extractor: x.x.x
- Cloudability OrgID: x.x.x
- Edge Bookmark Finder: x.x.x
- Apptio Planning Upgrade Calculator: x.x.x
- Workspace Starter: x.x.x
- Snake: x.x.x
- Example Plugin: x.x.x
```

---

## Version History Reference

> ⚠️ Versions 2.0.0, 2.0.1, and 2.1.0 were incorrectly numbered. They have been renumbered
> below to match the Semantic Versioning policy documented in `AGENTS.md`. No code changes
> were made — only the version labels are corrected. The historical changes are preserved
> in full under their corrected version numbers.
>
> Correction table:
>
> | Was labelled | Corrected to | Reason |
> |---|---|---|
> | `2.0.0` | `1.9.0` | Adding Snake plugin is MINOR — additive, non-breaking |
> | `2.0.1` | `1.9.1` | Bug/UI fixes after Snake are PATCH — no new capability |
> | `2.1.0` | `1.10.0` | Adding Workspace Starter is MINOR — additive, non-breaking |

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.47.10 | 2026-08-21 | TypeScript scaffold static-safety hardening: storage/settings validation, async error containment, transactional plugin lifecycle state, external payload guards, corrected packaged-asset paths, and OrgID cache/concurrency fixes. |
| 1.37.0 | 2026-08-04 | Diagnostics three-tab IA: Overview (summary + warnings + snapshot), System Checks (all dependency cards), Cache & Storage (quota + caches). First-run auto-run flag migrated to chrome.storage.local (persistent). |
| 1.36.0 | 2026-08-03 | Maintenance Center: Diagnostics + Backup & Restore consolidated into new top-level nav destination. Notifications Center now contains only Notifications + Activity. |
| 1.35.0 | 2026-08-03 | Icon uniqueness policy added. Example Plugin icon replaced (App-Window-Code). Copy URL button standardized to ⧉. Example Plugin disabled by default. Canonical plugin order locked. |
| 1.34.0 | 2026-08-03 | Icon system full repair: 8 broken navigation SVGs repaired, 4 wrong registry paths corrected, 3 new icons added, icon-manifest.json rewritten (100 icons), emoji permanently prohibited. |
| 1.33.5 | 2026-08-02 | Send Feedback: functional mailto workflow with Outlook recipient fix and diagnostics expansion. |
| 1.33.1 | 2025-08-01 | Sidebar horizontal utility divider collapse bug fix (flex-shrink: 0 added). |
| 1.33.0 | 2025-08-01 | RC-NAV-BDR001 v3: sidebar divider as ::after pseudo-element (replaces border-right approach). |
| 1.32.0 | 2025-08-01 | Settings nav item renamed to Options. Utility group canonical order confirmed. |
| 1.31.0 | 2025-08-01 | Left nav IA redesign: Core / Plugins / Utility sections. Sidebar divider fix (RC-NAV-BDR001). |
| 1.30.0 | 2025-08-01 | AI Plugin Kit (docs/AI-PLUGIN-KIT.md). Plugin Generator (tools/create-plugin.js). Example Plugin lifecycle corrections. |
| 1.29.1 | 2025-08-01 | Cloudability OrgID startup stale widget regression fix. |
| 1.29.0 | 2025-08-01 | Dashboard IA reorganized: Quick Actions → Plugin Functions → Platform Status. Sidebar icons reordered by functional group. |
| 1.28.0 | 2025-07-31 | Diagnostics unified cache registry + Cache & Storage Inspector tab. Pre-flight Health Check System v2 (12 checks). |
| 1.27.6 | 2025-07-25 | Bob Helper: tray removal, /pick-dir dead code cleanup, kill-logic deduplication. |
| 1.27.5 | 2025-07-25 | Bob Helper scripts consolidated into unified bob-helper.cmd with 8 portability fixes. |
| 1.27.4 | 2026-07-25 | Bob Helper portability, cross-machine setup, diagnostics hardening (CHECK-06b). plugins/ sync fix. |
| 1.27.3 | 2026-07-24 | Side panel width persistence: two independent bugs fixed (batch-read exclusion + mouseup cross-frame). |
| 1.27.2 | 2026-07-24 | Documentation v1.27.2 post-release alignment. |
| 1.27.1 | 2025-07-30 | Bug fixes: Diagnostics ADF record fields corrected (errorPhase/errorDetail/matchedProducts/totalProducts instead of non-existent errors/warnings/durationMs); stale SF_BOB_WORKING_DIR key removed from RC_STORE; HTML widget order comments corrected. |
| 1.27.0 | 2025-07-29 | Diagnostics: centralized Pre-flight Check system — 10 parallel dependency checks (storage quota with threshold alerts, Salesforce/Cloudability/IBM Docs host permissions, bookmarks API permission, Bob Helper server health, Bob Working Directory, IBM Docs API cached status, active Salesforce/Cloudability tab detection); check cards with pass/warn/fail/skip/info status and inline action links; CloudabilityOrgId plugin exposes hasActiveCloudabilityTab() public API |
| 1.26.0 | 2025-07-28 | Full product integration of Apptio Documentation Finder as native ReplyCators plugin (com.replycators.apptio-docs-finder v1.0.0); IBM Docs search, domain filter, category select, favorites, recent, opened, index status, sources overlay, diagnostics; settings merged into global Settings view; storage migrated from adn_* namespace; https://www.ibm.com/* added to host_permissions |
| 1.25.4 | 2025-07-27 | Performance & diagnostics remediation: PERF-001 SF tab URL pre-filter, PERF-002 bg URL-before-storage, PERF-003 debounce 1500ms, PERF-004 bookmark quota guard, PERF-005 AUC cache-first, PERF-006 Bob Helper 30s cool-down, DIAG-001 plugin init isolation, DIAG-006 WS save error callback |
| 1.25.3 | 2025-07-26 | Salesforce Case Extractor: attachment full-path construction from Bob Working Directory; file list shows basename + full path; tooltip and Add button title updated |
| 1.25.2 | 2025-07-26 | Bob Helper: fix `cmd.exe /c` not forwarding arguments to launcher — `cd` never ran, bob always started in server cwd |
| 1.25.1 | 2025-07-26 | Bob Working Directory: replaced free-text input with Browse… button (native OS folder picker via PowerShell); Clear button; read-only display |
| 1.25.0 | 2025-07-26 | Salesforce Case Extractor v4.6.0: Bob Working Directory setting; bob runs in user-configured cwd; Execute disabled when path not set; startup warning toast |
| 1.24.0 | 2025-07-25 | Salesforce Case Extractor v4.5.0 Privacy Mode: email redaction + inline contact-name redaction; three-pass sfApplyPrivacy() with _sfEscapeRegex() helper |
| 1.23.1 | 2025-07-24 | Salesforce Case Extractor v4.4.0: "Copy with Prompt" button added between Copy and Download; copies full assembled prompt + case data to clipboard without sanitization |
| 1.23.0 | 2025-07-23 | Salesforce Case Extractor v4.3.0: Bob Helper health check — RC_BOB_HEALTH probe on navigate; Execute buttons show visual warning when server is not running; pre-flight guard blocks Execute with clear message |
| 1.22.2 | 2025-07-22 | Bob-bridge audit follow-up: stale comment renamed, dead .gitignore rules removed, stale report annotated, Bob Helper setup documentation added across TROUBLESHOOTING, plugin doc, INSTALLATION, and README |
| 1.22.1 | 2025-07-22 | Bob Bridge cleanup (TD-018): native-host/ directory removed; PromptExecutionPanel.ts execution path corrected to HTTP helper |
| 1.22.0 | 2025-07-21 | Salesforce Case Extractor v4.3.0 Privacy Mode: contact name masking with live toggle, persisted preference |
| 1.22.0 | 2025-07-18 | Platform-wide UI/UX modernization: design system refresh across all components — sidebar, topbar, stat cards, widget cards, navigation, buttons, inputs, toggles, settings, tables, toasts, badges, and dashboard HTML *(backported)* |
| 1.21.3 | 2025-07-18 | Salesforce Case Extractor Dashboard widget stuck on "Checking for active case…" — fixed by removing banner-gate from detection function and registering tab listeners eagerly at startup *(backported)* |
| 1.21.2 | 2025-07-17 | Cloudability Refresh button dead-end fix; `onNavigate` always reflects active detection state; info card corrected; in-extension documentation full audit and update *(backported)* |
| 1.21.1 | 2025-07-17 | Settings Appearance gap fix (font-availability-row); Salesforce Case Extractor documentation updated to v4.2.0 *(backported)* |
| 1.21.1 | 2025-07-20 | Bob execution migration cleanup: dead code removal, BobBridge→BobHelper rename, nativeMessaging permission removed |
| 1.21.0 | 2025-07-16 | Salesforce unified prompt system; Cloudability active-tab enforcement + dashboard parity; dashboard widget navigation fix |
| 1.20.2 | 2025-07-15 | Release Readiness Pass + Salesforce active-tab validation |
| 1.20.1 | 2025-07-25 | Startup performance optimization: lazy init for SF tab scan, Cloudability tab scan, AUC migration check, RC_GET_REGISTRY; duplicate nav listener fix |
| 1.20.0 | 2025-07-25 | Documentation system: in-extension Help & Documentation plugin with 14 topics; engineering docs and plugin docs created |
| 1.19.0 | 2025-07-24 | Tab Search plugin added (com.replycators.tab-search v1.0.0) |
| 1.18.0 | 2025-07-24 | TD-001 post-refactor regression repair (Workspace Starter, Snake, Cloudability, Bookmark Finder) |
| 1.17.0 | 2025-07-22 | QA remediation RC-001/003/004; Workspace Starter Tab Group toggle wired |
| 1.16.2 | 2025-07-21 | Navigation scalability: sidebar scroll fix (min-height: 0), plugin item padding, side panel 220px |
| 1.16.1 | 2025-07-21 | Plugin navigation order synchronization (RC-020): applyDashboardOrder() now enforces nav + widgets |
| 1.16.0 | 2025-07-18 | Removed premature automated testing infrastructure (TD-017) |
| 1.15.0 | 2025-07-18 | Runtime-first documentation coverage (TD-015); Workspace Starter startup race fix (TD-016) |
| 1.14.0 | 2025-07-17 | Edge Bookmark Finder full-row interaction (TD-014): full row as click target, keyboard navigation, event delegation |
| 1.13.1 | 2025-07-17 | Workspace Starter Tab Group fix (TD-013): tabGroups permission added; per-profile launchMode is now authoritative |
| 1.13.0 | 2025-07-17 | Runtime-First Architecture Enforcement & Governance (TD-012) |
| 1.12.0 | 2025-07-17 | Repository hygiene & Technical Debt reassessment (TD-011): node_modules removed, governance hardened |
| 1.11.1 | 2025-07-17 | Extension loading fix: __tests__/ → tests/ (TD-010) |
| 1.11.0 | 2025-07-17 | Technical Debt Remediation Program (TD-001 through TD-008): build automation, CI, sync-root, Jest foundation |
| 1.10.1 | 2025-07-17 | Final Release QA: dist/ version corrections, README updated |
| 1.10.0 | 2025-07-15 | Workspace Starter plugin integrated (com.replycators.workspace-starter v1.0.0) |
| 1.9.1  | 2025-07-15 | UI/UX remediation: Plugin Manager filter bar, tab active CSS, bookmark cap notice, sidebar hint |
| 1.9.0  | 2025-07-15 | Snake plugin added (com.replycators.snake v1.0.0) |
| 1.8.1  | 2025-07-15 | Side Panel launcher lifecycle fix: geometry-only detection; stale rc:ui:launch-mode removed |
| 1.8.0  | 2025-07-15 | Side Panel mode; toast notification limit (2 max); Salesforce Extract-First UI (v3.2.0) |
| 1.7.0  | 2025-07-15 | Salesforce Case Extractor v3.1.0: explicit Source radio selector (Active Tab / Search by Case Number) |
| 1.6.0  | 2025-07-15 | Salesforce Case Extractor v3.0.0: engine replacement (v0.4.3 — clone-based DOM extraction) |
| 1.5.2  | 2025-07-14 | Release-gate bug fixes: 7 defects (showToast filter, duplicate DARK_THEMES, sidebar search, etc.) |
| 1.5.1  | 2025-07-14 | QA defect remediation: 15 of 18 defects fixed (P1/P2) |
| 1.5.0  | 2025-07-14 | Apptio Planning Upgrade Calculator integrated (com.replycators.apptio-planning-upgrade-calculator v1.0.0) |
| 1.4.0  | 2025-07-04 | Apptio Planning Upgrade Calculator full rewrite (v2.0.0): 4-tab layout, known/unknown day calculation |
| 1.3.0  | 2025-07-03 | Three new plugins: Apptio Planning Upgrade Calculator, Edge Bookmark Finder (initial versions) |
| 1.0.0  | 2025-01-01 | Initial release: Salesforce Case Extractor, Cloudability OrgID, Example Plugin; four-layer architecture |


## [1.27.0] — 2025-07-29

### Diagnostics — Centralized Pre-flight Check System

**Type:** Feature

**Summary:** Added a Pre-flight Check section to the Diagnostics Center that validates all critical runtime dependencies in parallel and surfaces the results as structured check cards — pass, warn, fail, skip, or info — directly in the UI. Eliminates the need to hunt for dependency issues across multiple plugin views, documentation, and browser settings pages.

**Files changed:**
- `dashboard.js` — Added `_buildPreflightCard()` (card DOM factory), `loadPreflightChecks()` (10-check async orchestrator); `loadDiagnostics()` now fires `loadPreflightChecks()` in parallel; file-header version bumped to v1.27.0
- `dashboard.html` — Added `#rc-preflight-section` and `#rc-preflight-checks` grid above the existing diagnostic JSON `<pre>` block; version badge corrected to v1.27.0
- `styles/dashboard.css` — Added `.rc-preflight`, `.rc-preflight__grid`, `.rc-preflight-card`, and variant modifier classes (`--pass`, `--warn`, `--fail`, `--info`, `--skip`, `--checking`)
- `plugins/cloudability-orgid.js` — Exposed `hasActiveCloudabilityTab(callback)` on the plugin's public API so the pre-flight check can query active tab status without duplicating the URL-matching logic
- `plugins/documentation.js` — Added v1.27.0 release note entry; corrected topic count comment from 15 to 14
- `manifest.json` — Version corrected to 1.27.0 (was 1.26.0 — missed during v1.27.0 release)
- `package.json` — Version corrected to 1.27.0 (was 1.26.0 — missed during v1.27.0 release)
- `README.md` — Extension version corrected to 1.27.0; Salesforce Case Extractor version corrected to 4.6.0 (was 4.3.0)
- `dist/dashboard.js`, `dist/dashboard.html`, `dist/styles/dashboard.css`, `dist/plugins/cloudability-orgid.js` — Synced from root

**Checks implemented (MVP):**

| ID | Label | Scope |
|----|-------|-------|
| CHECK-01 | Storage Quota | Platform — always |
| CHECK-02 | Host Permissions: Salesforce | Feature-gated (SF plugin enabled) |
| CHECK-03 | Host Permissions: Cloudability | Feature-gated (CLD plugin enabled) |
| CHECK-04 | Host Permissions: IBM Docs | Feature-gated (ADF plugin enabled) |
| CHECK-05 | Bob Helper Server | Feature-gated (SF plugin enabled) |
| CHECK-06 | Bob Working Directory | Feature-gated (SF plugin enabled) |
| CHECK-07 | IBM Docs API (cached status) | Feature-gated (ADF plugin enabled) |
| CHECK-08 | Active Salesforce Tab | Feature-gated (SF plugin enabled) |
| CHECK-09 | Active Cloudability Tab | Feature-gated (CLD plugin enabled) |
| CHECK-11 | Permission: Bookmarks API | Feature-gated (BM plugin enabled) |

**Breaking changes:** None. Additive only — no existing checks, storage keys, or message handlers were modified.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- Apptio Documentation Finder: 1.0.0

---

## [1.26.0] — 2025-07-28

### Apptio Documentation Finder — Full Product Integration (v1.0.0)

**Type:** Feature

**Summary:** Full product integration of the standalone `Apptio-Documentation-Finder` extension into ReplyCators as a native plugin (`com.replycators.apptio-docs-finder`). The Documentation Finder is no longer a separate extension — it is a first-class ReplyCators plugin using the existing plugin framework, storage conventions, logging, notifications, settings, and design language. The standalone project (`C:\Work\Bob\WatsonX\Apptio-Documentation-Finder`) is no longer required.

**Files changed:**
- `plugins/apptio-docs-finder.js` — **CREATED** — IIFE plugin module (~1,000 lines): IBM Docs URL builder, live IBM Docs API fetcher, storage layer (`rc:plugin:com.replycators.apptio-docs-finder:*`), idempotent `adn_*` → `rc:plugin:*` storage migration, full UI (6-tab: Search/Favorites/Recent/Opened/Index/Settings), sources overlay, first-run setup, keyboard shortcuts, diagnostics panel. Self-registers as `window.ReplyCatorsPlugins.ApptioDocsFinder`
- `dashboard.html` — Added `#view-plugin-apptio-docs-finder` view container, dashboard widget card, `<script src="plugins/apptio-docs-finder.js">`, plugin option in `#activity-plugin-filter`, "Apptio Documentation Finder" settings group in Settings view
- `dashboard.js` — Added `ADF_SETTINGS` storage key to `RC_STORE`, plugin entry to `PLUGINS[]`, entry to `DEFAULT_PLUGIN_ORDER`, `navigateTo` hook for `plugin-apptio-docs-finder`, `_safeInit('ApptioDocsFinder', ...)`, `wireAdfToggle` for settings toggles, `syncSettingsUI()` ADF settings restore block
- `manifest.json` — Added `https://www.ibm.com/*` to `host_permissions` (required for IBM Docs API fetch)
- `styles/dashboard.css` — Added complete `adf-*` CSS rules using only `var(--rc-*)` design tokens; covers tab bar, domain filter, search form, URL preview panel, quick links, item cards, index status, sources overlay, first-run card, diagnostics panel
- `AGENTS.md` — Updated Plugin Inventory, Plugin Source Locations, Source of Truth Matrix, Storage Schema, Active Views table, Project version (1.26.0)
- `CHANGELOG.md` — This entry
- `package.json` — Version bumped to 1.26.0
- `manifest.json` — Version bumped to 1.26.0

**Breaking changes:** None — additive plugin integration. Legacy `adn_*` storage keys from the standalone extension are migrated idempotently on first plugin load.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0
- **Apptio Documentation Finder: 1.0.0 (NEW)**

---

## [1.25.4] — 2025-07-27

### Platform — Performance & Diagnostics Remediation (8 High findings)

**Type:** Bug Fix

**Summary:** Resolves 8 High-severity performance and diagnostics issues identified in the Performance & Diagnostics Assessment (v1.24.0). No new features or behaviour changes beyond the fixes described. All fixes are minimal, focused, and verified against the existing QA matrix.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — PERF-001: removed `changeInfo.url` branch from `onUpdated`; added Salesforce URL pre-filter; `onActivated` now pre-fetches tab URL before calling detection pipeline. PERF-006: `sfCheckHelperHealth()` accepts `force` parameter; 30-second cool-down added; `_lastHealthCheckAt` timestamp tracks last probe; Execute button click forces fresh probe.
- `dashboard.js` — DIAG-001: wrapped all 8 plugin `init()` calls in `_safeInit()` try/catch helper; errors are logged to Activity Log and the next plugin continues normally. PERF-003: `persistLogs()` and `persistNotifs()` debounce raised from 300 ms to 1500 ms.
- `background.js` — PERF-002: `chrome.tabs.onActivated` handler now checks URL pattern before calling `getPluginEnabledState()` (storage read); non-Cloudability tab activations no longer issue a storage read.
- `plugins/apptio-upgrade-calculator.js` — PERF-005: `aucGetSchedule()` waterfall inverted to cache-first; live cross-origin fetch to IBM Community now runs only when cache is expired, absent, or forceRefresh=true.
- `plugins/workspace-starter.js` — DIAG-006: `wsSaveProfiles()` now has an error callback on `chrome.storage.local.set()`; shows a notification and logs an error on write failure.
- `plugins/bookmark-finder.js` — PERF-004: `runScan()` calls `chrome.storage.local.getBytesInUse()` before writing scan cache; warns at 3 MB, blocks at 4 MB with user-facing notification and log entry.
- `manifest.json` — version bumped to 1.25.4
- `package.json` — version bumped to 1.25.4
- `CHANGELOG.md` — this entry

**Breaking changes:** None

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.25.3] — 2025-07-26

### Salesforce Case Extractor — Attachment full-path construction from Bob Working Directory

**Type:** Enhancement

**Summary:** When Bob Working Directory is configured, picking an attachment file now stores and displays the full absolute path (`<bobWorkingDir>\<filename>`) instead of the bare filename. This path appears in the `--- Attached file: ... ---` header sent to bob, letting bob resolve the file on disk. The row label in the attachment list shows `basename — full\path` with the complete path in the tooltip. The Add File button tooltip also reflects the configured directory. When Bob Working Directory is not set, behaviour is unchanged (bare filename only).

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `_sfAttachName()` helper added; `fileInput.addEventListener('change')` uses it; replace handler uses it; `_renderFileList` row label updated to show `basename — fullpath`; `addBtn.title` updated when dir is configured
- `dist/plugins/salesforce-case-extractor.js` — same changes synced

**Breaking changes:** None. No storage schema change. Existing in-memory attachment slots from before the popup is reloaded are unaffected (attachments do not survive popup restarts regardless).

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.25.2] — 2025-07-26

### Bob Helper — Fix: working directory never applied to launcher

**Type:** Bug Fix

**Summary:** `bob` was always starting in the Bob Helper server's process working directory instead of the user-configured path. The root cause was `cmd.exe /c script.cmd arg1 arg2 arg3` — `cmd.exe /c` only executes the first token after `/c` and silently drops all subsequent arguments, so `%~1`, `%~2`, `%~3` inside `bob-launcher-template.cmd` were always empty, `RC_WORKING_DIR` was always blank, the `cd /d` step never ran, and `bob` inherited the server's cwd instead.

The fix adds `call` between `/c` and the launcher path: `cmd.exe /c call script.cmd arg1 arg2 arg3`. With `call`, cmd.exe executes the script and correctly forwards all positional arguments as `%1 %2 %3`.

**Files changed:**
- `tools/bob-helper-server.js` — `spawnArgs` changed from `['/c', launcherPath, ...]` to `['/c', 'call', launcherPath, ...]`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.25.1] — 2025-07-26

### Salesforce Case Extractor — Bob Working Directory: folder picker instead of free-text input

**Type:** Enhancement (UI)

**Summary:** The "Bob Working Directory" setting now uses a **Browse… button** that opens a native Windows OS folder picker (via PowerShell `FolderBrowserDialog` on the Bob Helper server) instead of a free-text input field. The user cannot type a path manually. A **✕ Clear** button removes the configured path. The selected path is shown as read-only text next to the Browse button.

**Files changed:**
- `dashboard.html` — Removed `<input type="text" id="sf-bob-working-dir">`; replaced with `#sf-bob-working-dir-display` span + `#sf-bob-working-dir-browse` button + `#sf-bob-working-dir-clear` button
- `dashboard.js` — `persistSfSettings()` reads `dataset.path` from display span; `_sfApplyBobWorkingDir()` helper added; `initSettings()` wires Browse/Clear buttons via `RC_PICK_BOB_DIR` message; `syncSettingsUI()` restores path into display span and calls `onWorkingDirChanged()`
- `background.js` — `RC_PICK_BOB_DIR` handler added: calls `POST /pick-dir` on the Bob Helper server, relays result back to the Settings UI
- `tools/bob-helper-server.js` — `POST /pick-dir` endpoint added: `pickFolderWithPowershell()` spawns PowerShell `FolderBrowserDialog` (`-NonInteractive -WindowStyle Hidden`); pre-selects current dir if provided; returns `{ ok, cancelled, path }` or `{ ok, cancelled: true }` on dismiss
- `plugins/salesforce-case-extractor.js` — `onWorkingDirChanged(path)` public API added to plugin registration; old text-input `input` listener removed from `init()`; startup restore updated to set `_bobWorkingDir` only (no DOM side-effect — Settings UI is the source); `onWorkingDirChanged` exposed via `plugin` object so `window.ReplyCatorsPlugins.SalesforceCaseExtractor.onWorkingDirChanged()` is callable from `dashboard.js`
- `src/plugins/SalesforceExtractor/manifest.ts` — Plugin version corrected to `4.6.0` (was `4.5.0`)
- `dist/*` — Runtime files synced (`dist/background.js`, `dist/dashboard.html`, `dist/dashboard.js`, `dist/plugins/salesforce-case-extractor.js`)

**Breaking changes:** None. The stored `bobWorkingDir` value in `rc:session:sf-settings` is unchanged in format — it remains an absolute path string.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.25.0] — 2025-07-26

### Salesforce Case Extractor — Bob Working Directory configuration

**Type:** Feature

**Summary:** Adds a new "Bob Working Directory" setting under Settings → Salesforce Case Extractor. The configured path is passed through the entire execution pipeline (extension → background → Bob Helper server → launcher) so `bob` is invoked from that directory. The Execute button is disabled whenever the path is empty or not configured, and a startup warning toast is shown. The Bob Helper server validates the path (absolute, must exist) before spawning the launcher, and the CMD launcher performs a `cd /d` to the directory before calling `bob`.

**Files changed:**
- `dashboard.html` — New "Bob Working Directory" text input (`#sf-bob-working-dir`) added to Salesforce Case Extractor settings group; 280px wide input with placeholder
- `dashboard.js` — `RC_STORE.SF_BOB_WORKING_DIR` key added; `persistSfSettings()` reads `#sf-bob-working-dir`; `initSettings()` wires `input` listener; `syncSettingsUI()` restores persisted value; header comment updated; platform version bumped to `1.25.0`
- `plugins/salesforce-case-extractor.js` — `_bobWorkingDir` module-level state added; `_isBobWorkingDirConfigured()` predicate; `_applyHelperHealthToExecBtns()` updated to disable Execute when path not set; execute-click pre-flight guard added; `sfExecuteWithBob()` accepts and forwards `workingDir`; `init()` restores setting, wires live listener, emits startup warning when unconfigured; plugin version bumped to `4.6.0`
- `background.js` — `RC_EXECUTE_BOB` handler extracts `workingDir` from payload, includes in POST body to Bob Helper, and logs it
- `tools/bob-helper-server.js` — `/execute` endpoint extracts `workingDir`, validates it (absolute path, directory must exist), passes as `cwd` in spawn options and as 3rd argument to launcher; returned response includes `workingDir`
- `tools/bob-launcher-template.cmd` — Accepts `%3` as `RC_WORKING_DIR`; if non-empty, verifies directory exists and performs `cd /d` before calling `bob`
- `dist/*` — Runtime files synced

**Breaking changes:** None. Existing behaviour when `bobWorkingDir` is absent or empty: the `cwd` option is omitted from `spawn()` (Node defaults to the server's process cwd, as before), and the launcher skips the `cd` step. No existing storage keys renamed or removed. The new `bobWorkingDir` field is silently absent on upgrade until the user configures it.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.6.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.24.0] — 2025-07-25

### Salesforce Case Extractor — Privacy Mode: email and inline contact redaction

**Type:** Enhancement

**Summary:** Extends Privacy Mode to redact email addresses and inline contact name occurrences throughout the entire extracted content, not just the Contact field header line. `sfApplyPrivacy()` now applies three ordered passes: (1) structured Contact field redaction (existing, token updated to `[REDACTED_CONTACT]`), (2) email address redaction everywhere in the text (`[REDACTED_EMAIL]`), and (3) inline redaction of the contact name wherever it appears in post bodies, descriptions, or agent descriptions. A new `_sfEscapeRegex()` helper is introduced to safely construct the inline contact pattern from arbitrary name strings.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `sfApplyPrivacy()` rewritten with three-pass logic; `_sfEscapeRegex()` helper added; block comment updated; plugin version bumped to `4.5.0`
- `dashboard.js` — SF plugin version updated to `4.5.0`; platform header updated to `v1.24.0`
- `dashboard.html` — Platform version display updated to `v1.24.0`
- `manifest.json` — Version bumped to `1.24.0`
- `package.json` — Version bumped to `1.24.0`
- `src/plugins/SalesforceExtractor/manifest.ts` — Plugin version bumped to `4.5.0`
- `dist/*` — Runtime files synced

**Breaking changes:** None. The existing `[REDACTED]` token (used only in the Contact field line) is updated to `[REDACTED_CONTACT]` — this changes output text when Privacy Mode is on, but no code outside `sfApplyPrivacy()` reads or depends on the specific redaction token value. No storage keys changed. No UI changes. All existing Privacy Mode toggle and persistence behaviour is unchanged.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.5.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.23.1] — 2025-07-24

### Salesforce Case Extractor — "Copy with Prompt" button

**Type:** Feature

**Summary:** Adds a new "📋 Copy with Prompt" button between the existing Copy and Download buttons in the Salesforce Case Extractor. Clicking it assembles the full prompt using the currently selected prompt body, the extracted case data, and any Additional Requests text — identical to the Execute pipeline — and copies the result to the clipboard without any sanitization, escaping, or normalization. Designed for manual copy/paste workflows where users want to paste the complete, formatted prompt directly into an AI tool.

**Files changed:**
- `dashboard.html` — New `#sf-btn-copy-prompt` button inserted between `#sf-btn-copy` and `#sf-btn-download`; starts disabled; uses `rc-btn rc-btn--secondary rc-btn--xs` to match existing Copy button style
- `plugins/salesforce-case-extractor.js` — `init()`: added `btnCopyPrompt` reference; three enable sites updated; new `btnCopyPrompt` click handler: resolves active prompt from `_sfActiveExecPromptId`/`currentPrompts`, assembles via `buildAssembledPrompt()`, writes to clipboard; edge-case guards for no prompt selected, prompt not found, empty case data; activity log and notification on success/failure
- `dashboard.js` — Salesforce Case Extractor plugin version bumped to `4.4.0`
- `src/plugins/SalesforceExtractor/manifest.ts` — Version bumped to `4.4.0`
- `dist/*` — Runtime files synced (see below)

**Breaking changes:** None. The new button is additive. All existing buttons (Copy, Download, Clear, Execute) behave exactly as before. No storage keys added or changed. No new permissions required.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.4.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.23.0] — 2025-07-23

### Salesforce Case Extractor + Platform — Bob Helper server health check

**Type:** Enhancement

**Summary:** The Salesforce Case Extractor now probes the Bob Helper server (`GET /health`) every time the SF plugin view is opened, so users know immediately whether the server is running before they click Execute. Execute buttons gain a visual warning state when the server is unreachable, and a pre-flight guard returns a clear error rather than waiting for a network timeout. A new `RC_BOB_HEALTH` message handler was added to `background.js` to proxy the health request from the popup context. Also fixes the last stale reference to native messaging in the merge assessment report, and documents the `REPLYCATORS_BOB_HELPER_DEBUG` diagnostic flag.

**Files changed:**
- `background.js` — Added `RC_BOB_HEALTH` message handler: proxies `GET http://127.0.0.1:47123/health` with a 3 s timeout; returns `{ ok: true, ... }` or `{ ok: false, error: '...' }`
- `plugins/salesforce-case-extractor.js` — Added `_helperHealthy` flag; `sfCheckHelperHealth()` sends `RC_BOB_HEALTH` on every navigate and logs state changes; `_applyHelperHealthToExecBtns()` applies `rc-btn--helper-down` class and tooltip to all Execute buttons; `sfRefreshDetectionBanner()` calls `sfCheckHelperHealth()` on entry; Execute click handler pre-flight guard blocks with clear message when `_helperHealthy === false`
- `styles/dashboard.css` — Added `.rc-btn--helper-down` rule: amber border, reduced opacity, `cursor: not-allowed`
- `docs/reports/Salesforce-Extractor-Merge-Assessment.html` — Line 141: stale cell description updated from "Connects native Bob Bridge host via native messaging" to "Routes via HTTP POST to tools/bob-helper-server.js (port 47123)"
- `docs/TROUBLESHOOTING.md` — Added step 5 with `REPLYCATORS_BOB_HELPER_DEBUG` instructions; updated Note to mention new auto-check on navigate
- `manifest.json` — Version bumped to 1.23.0
- `package.json` — Version bumped to 1.23.0
- `dashboard.html` — Version display updated to v1.23.0
- `dashboard.js` — Version header updated to v1.23.0
- `dist/*` — All changed runtime files synced

**Breaking changes:** None. New message type `RC_BOB_HEALTH` is additive. The `rc-btn--helper-down` class is purely visual. No storage keys added or changed. No user data affected.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.3.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.22.2] — 2025-07-22

### Platform — Bob-bridge audit follow-up

**Type:** Governance / Documentation

**Summary:** Resolved all remaining cleanup items from the bob-bridge deprecation audit. Renamed the stale `// ─── Bob Bridge execution` section comment to `// ─── Bob Helper execution`, removed dead `native-host/` ignore rules from `.gitignore`, annotated the stale merge assessment report with an architecture-change advisory banner, and added comprehensive Bob Helper server setup documentation to the troubleshooting guide, plugin documentation, installation guide, and README.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — Line 1085: section banner comment renamed from "Bob Bridge execution" → "Bob Helper execution"
- `dist/plugins/salesforce-case-extractor.js` — Synced from root
- `.gitignore` — Removed 6-line dead `native-host/` generated-files block (the directory was deleted in v1.22.1; the ignore rules were harmless but misleading)
- `docs/reports/Salesforce-Extractor-Merge-Assessment.html` — Added amber advisory banner at top of document noting that the `nativeMessaging` architecture it describes was superseded in v1.21.1–v1.22.1
- `docs/TROUBLESHOOTING.md` — Added "Execute button produces ❌ Execution failed / Failed to reach Bob helper" troubleshooting entry under the Salesforce Case Extractor section
- `docs/plugins/salesforce-case-extractor.md` — Added "Prerequisites — Bob Execution" section at top of document with execution path diagram, start commands, and link to troubleshooting; version header updated to 4.3.0
- `docs/INSTALLATION.md` — Added "Running the Bob Helper Server" subsection under the Salesforce Case Extractor usage section
- `README.md` — Version field updated from `1.12.0` to `1.22.2`; plugin table updated to current versions (4.3.0 / 4.0.0 / 2.0.0) and Tab Search added; stale "Status, Priority" extracted-fields claim corrected
- `dashboard.html` — Version display updated to v1.22.2
- `dashboard.js` — Version header updated to v1.22.2
- `manifest.json` — Version bumped to 1.22.2
- `package.json` — Version bumped to 1.22.2
- `dist/*` — All changed runtime files synced

**Breaking changes:** None. All changes are documentation and comment corrections. No runtime behaviour is affected.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.3.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.22.1] — 2025-07-22

### Platform — Bob Bridge cleanup (TD-018)

**Type:** Governance / Bug Fix

**Summary:** Removed the deprecated `native-host/` directory (Bob Bridge native messaging host) and corrected `PromptExecutionPanel.ts` to use the active HTTP helper execution path instead of the defunct `connectNative()` call. Stale "bob-bridge" comments updated across three source files.

**Files changed:**
- `native-host/` — Deleted entirely (`bob-bridge.js`, `bob-bridge.cmd`, `install.ps1`, `uninstall.ps1`, `README.md`, generated `com.replycators.bob_bridge.json`, `install.log`, `.bob/`)
- `src/plugins/SalesforceExtractor/prompts/PromptExecutionPanel.ts` — `invokeBob()` replaced `connectNative('com.replycators.bob_bridge')` with `chrome.runtime.sendMessage({ type: 'RC_EXECUTE_BOB', payload: { prompt, requestId } })` matching the active runtime path; file header comment updated
- `src/plugins/SalesforceExtractor/prompts/AttachmentManager.ts` — "bob-bridge pipeline" → "execution pipeline" in JSDoc
- `src/plugins/SalesforceExtractor/prompts/types.ts` — "sent to bob-bridge" → "sent via the Bob execution helper" in JSDoc
- `plugins/salesforce-case-extractor.js` — Line 1079 comment attribution updated from `bob-bridge.js` to `bob-helper-server.js`
- `dist/plugins/salesforce-case-extractor.js` — Synced from root
- `AGENTS.md` — TD-018 added; active Bob execution path documented in § 19 and § 24; current state updated to v1.22.1

**Breaking changes:** None. The `native-host/` directory was already non-functional since `nativeMessaging` was removed from `manifest.json` in v1.21.1. No user data is affected.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.3.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.22.0] — 2025-07-21

### Salesforce Case Extractor — Privacy Mode

**Type:** Feature

**Summary:** Added a "Privacy mode" checkbox to the Extract tab toolbar. When enabled (default), the Contact (customer name) field is masked as `[REDACTED]` in the extracted content preview, the clipboard copy, and the downloaded `.txt` file. The unredacted text is stored in memory and in `chrome.storage.local` (raw result persisted unchanged) so toggling Privacy mode off instantly restores the full contact name without re-extracting. The preference is persisted in `rc:session:sf-settings` alongside the existing source and format settings.

**Files changed:**
- `dashboard.html` — Added `#sf-privacy-mode` checkbox + `<label class="sf-privacy-label">` in `.sf-extract-toolbar`; bumped SF plugin badge to v4.3.0; bumped platform version display to v1.22.0
- `dashboard.js` — `persistSfSettings()` now reads and writes `privacyMode` boolean; version header bumped to v1.22.0
- `plugins/salesforce-case-extractor.js` — Added `sfPrivacyEnabled()`, `sfApplyPrivacy(text)` helper and `_lastRawText` module-level cache; `runExtraction()` sets `_lastRawText` before applying privacy to `previewEl.value`; session restore applies privacy on re-display; `init()` restores `privacyMode` checkbox state from settings and attaches a `change` listener that re-renders the preview live; removed `accountName` from the activity log `detailMsg` (Contact name was never in that string; Account is not customer-identifying)
- `styles/dashboard.css` — Added `.sf-privacy-label` and `.sf-privacy-label input[type="checkbox"]` styles for inline toolbar appearance
- `manifest.json` — Version bumped to 1.22.0
- `package.json` — Version bumped to 1.22.0
- `dist/*` — All four changed runtime files synced

**Breaking changes:** None. The `privacyMode` field is a new optional boolean added to the existing `rc:session:sf-settings` object. Existing stored settings without this field default to `true` (privacy on) via the HTML `checked` attribute default.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.3.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---


## [1.22.0] — 2025-07-18 *(backported from source)*

### Platform — UI/UX Modernization

**Type:** UI / Enhancement

**Summary:** Platform-wide visual design modernization across all UI components. Zero functional changes — all plugin behavior, storage, messaging, startup, settings, and navigation logic is completely unchanged. Focus was exclusively on visual design, component consistency, accessibility, and interaction quality.

**Design issues resolved:**
- Stat cards used a dated `border-top: 3px` accent pattern; replaced with a modern left-bar accent (`::before` pseudo-element)
- Widget card headers had a contrasting `surface-2` background creating a heavy "lid" effect; unified to `surface` with a subtle `border-light` separator
- Open/launch buttons on widget cards used `↗` text character; replaced with a consistent SVG external-link icon with proper `aria-label`
- Nav active state was hard to distinguish at a glance; added a 3px left-border accent indicator for clear selection signal
- Buttons used `background: surface-2` for secondary style; modernized to `transparent` with border
- `rc-btn--danger` was always filled with danger-bg; now transparent with danger border (on hover shows bg)
- Toggle switches had no unchecked thumb styling; modernized with `text-dim` thumb unchecked → white when checked, with spring easing
- Health dots had distracting `box-shadow` glow effects; removed
- Status indicators had same-color borders as text; borders now use neutral `rgba(0,0,0,0.08)`
- Empty states used a `dashed` border; replaced with solid border + surface-2 background
- Notification left-border reduced from 4px to 3px
- Plugin list table header normalized to `border-bottom: 1px`
- Settings rows now have hover highlight
- Scrollbar thinned from 6px to 5px with pill-shaped thumb; hover state added
- Global `focus-visible` ring applied by default (2px accent outline)
- Button `active` state (press) added — `translateY(1px)` press feedback
- Input and textarea hover state added
- All transition properties scoped (no `all`) for better performance
- `rc-panel-header` background changed from `surface-2` to `surface`
- Topbar height increased from 40px to 42px
- View title increased from 17px to 18px with slight negative letter-spacing
- Quick Action cards icon now uses `text-muted` color in default state, `accent` on hover
- Footer text increased from 9px to 10px
- Sidebar logo border-radius increased from 4px to 6px
- Sidebar brand gap refined, search input now has focus ring with accent shadow

**Files changed:**
- `styles/platform.css` — Component styles modernized below token definitions
- `styles/dashboard.css` — Layout component styles modernized: sidebar brand, nav items (active indicator, hover), sidebar footer, topbar, view header, stat cards, widget cards, quick action cards, plugin list table
- `dashboard.html` — Widget card `↗` text arrows replaced with SVG external-link icons with `aria-label`; widget body padding normalized; widget body text uses `rc-muted` class

**Breaking changes:** None. Purely visual — no IDs, classes, or behavior removed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.21.3] — 2025-07-18 *(backported from source)*

### Salesforce Case Extractor — Dashboard Widget Detection Fix

**Type:** Bug Fix

**Summary:** The Dashboard widget for Salesforce Case Extractor was permanently stuck on "Checking for active case…" whenever the extension opened directly to the Dashboard view, because the core detection function (`sfRefreshDetectionBanner`) had an early-return guard that aborted if the plugin-page banner element (`#sf-tab-detection-banner`) was absent from the DOM. Fixed by: (1) removing the `bannerEl` early-return guard — all `app().setStatus(bannerEl, …)` calls are now conditional on `bannerEl` being present; (2) removing `sf-tab-detection-banner` existence checks from both tab listener callbacks; (3) calling `registerTabListeners()` and `sfRefreshDetectionBanner()` eagerly from `init()` at plugin startup.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `sfRefreshDetectionBanner()`: removed `if (!bannerEl) return` gate; all `app().setStatus(bannerEl, …)` calls guarded with `if (bannerEl)`; `registerTabListeners()`: removed `sf-tab-detection-banner` DOM checks from both listener callbacks; `init()`: calls `registerTabListeners()` + `sfRefreshDetectionBanner()` at startup

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.21.2] — 2025-07-17 *(backported from source)*

### Documentation — Full In-Extension Help & Documentation Audit and Update

**Type:** Governance / Documentation

**Summary:** Complete audit and rewrite of all 14 topics in the Help & Documentation plugin (`plugins/documentation.js`). Every topic was compared against the actual running extension and corrected. Major changes: Salesforce topic completely rewritten to cover the v4.2.0 tab-driven UI; Cloudability topic corrected with active-tab-only requirement; Settings topic expanded with missing sections; Release Notes expanded to include v1.19.0 through v1.21.2.

**Files changed:**
- `plugins/documentation.js` — All 14 topics updated; no structural or rendering changes

**Breaking changes:** None. Documentation only — no code behavior change.

---

### Cloudability OrgID — Refresh Dead-End Fix and Active-Tab Status Consistency

**Type:** Bug Fix / UI

**Summary:** Three related defects in Cloudability OrgID corrected. (1) **Refresh dead-end** — when no active Cloudability tab was detected, `cldRetrieve()` set Refresh disabled and `cldShowUnavailable()` did not re-enable it, leaving the user with no way to retry without navigating away and back. (2) **Stale onNavigate state** — `onNavigate()` preserved cached OrgID data without updating the status badge when no active tab was present. (3) **Incorrect info card text** — the "Automatic retrieval" info card stated OrgID is retrieved when Cloudability is "open in any tab"; the requirement is the **active** tab only.

**Files changed:**
- `plugins/cloudability-orgid.js` — `cldRetrieve()`: keep Refresh enabled in no-tab path; `cldShowUnavailable()`: added Refresh button re-enable; `onNavigate()`: always call `cldShowUnavailable()` on no-tab
- `dashboard.html` — Cloudability info card "Automatic retrieval" text corrected

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.21.1] — 2025-07-17 *(backported from source)*

### Platform — Settings Appearance Gap Fix

**Type:** Bug Fix / UI

**Summary:** An empty row was visible between the Font and UI Density settings in Settings → Appearance. The `#font-availability-row` was always present in the DOM and occupied vertical space even when its badge had no content (system font selected). Fixed by hiding `#font-availability-row` via `style.display = 'none'` when `font === 'system'` and restoring it when a non-system font is selected. The `min-height` workaround was removed from `.rc-font-badge`.

**Files changed:**
- `dashboard.js` — `updateFontAvailabilityBadge()`: hide/show `#font-availability-row` based on font selection
- `styles/dashboard.css` — Removed `min-height: 14px` from `.rc-font-badge`

**Breaking changes:** None.

---

### Salesforce Case Extractor — Documentation Updated to v4.2.0

**Type:** Governance / Documentation

**Summary:** `docs/plugins/salesforce-case-extractor.md` was out of date (still at version 3.2.1). Updated to reflect the current v4.2.0 implementation: correct version header, new Prompt System section, corrected `init()` signature, Source Mode behaviour note, and Release Notes section added.

**Files changed:**
- `docs/plugins/salesforce-case-extractor.md` — Updated version, added Prompt System section, corrected Public API init signature, expanded Source Mode and Settings notes, added Release Notes section

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---


## [1.21.1] — 2025-07-20

### Platform — Bob Execution Migration Cleanup

**Type:** Governance / Bug Fix

**Summary:** Removed dead code and corrected naming artefacts left over from the migration from the Chrome Native Messaging bridge (`native-host/bob-bridge`) to the local HTTP helper server (`tools/bob-helper-server.js`). The helper server has been the only active execution path since the migration; this release makes the code consistent with that reality.

**Files changed:**
- `background.js` — Removed unused `BOB_BRIDGE_HOST_NAME` constant; renamed `bobBridgeRequestSeq → bobHelperRequestSeq`, `isBobBridgeDebugEnabled() → isBobHelperDebugEnabled()` (now checks `REPLYCATORS_BOB_HELPER_DEBUG`), `nextBobBridgeRequestId() → nextBobHelperRequestId()` (prefix `bh-`), `logBobBridge() → logBobHelper()`, log prefix `[BobBridge] → [BobHelper]`; corrected RC_EXECUTE_BOB comment to describe the HTTP helper path
- `plugins/salesforce-case-extractor.js` — Fixed `response?.hostPid` → `response?.helperPid` in success log (was always logging `n/a`); updated log/error strings from "Bob Bridge" to "Bob Helper"
- `manifest.json` — Removed `nativeMessaging` permission (no `connectNative()` call exists anywhere in the codebase)
- `.gitignore` — Added `**/.bob/` (covers subdirectory agent workspaces), `native-host/install.log` (generated, machine-specific), `native-host/com.replycators.bob_bridge.json` (generated by install.ps1, contains absolute paths)
- `tools/test-spawn.js` — Deleted (one-off development experiment; tested a superseded spawn pattern)
- `tools/verify-prompt.js` — Deleted (hardcoded personal file path and customer-specific data; served its purpose as a one-time debug script)
- `dist/background.js`, `dist/plugins/salesforce-case-extractor.js`, `dist/manifest.json` — Synced from root

**Breaking changes:** None. The `nativeMessaging` permission removal requires an extension reload at `edge://extensions/` — no user data is affected. The debug flag change (`REPLYCATORS_BOB_BRIDGE_DEBUG → REPLYCATORS_BOB_HELPER_DEBUG`) only affects developers who enable diagnostic logging in the background service worker.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.21.0] — 2025-07-16

### Salesforce Case Extractor — Unified Prompt System and Attachment Framework

**Type:** Feature / Refactor

**Summary:** Replaced the per-prompt, file-array-driven execution UI with a single shared architecture. Every prompt — default or custom — now renders through one identical execution panel with 0–6 file attachments (any format), an Additional Requests textarea, and an Execute button. No prompt-specific upload logic, no hardcoded file restrictions, no special cases for Understand Case or Research Case. Prompt definitions now contain only `id`, `title`, `body`, `isDefault`, `createdAt`, `updatedAt` — no `files[]` array. The `normalisePrompt()` helper now strips any legacy `files[]` from stored prompts. Prompt selection on the Extract tab was redesigned from radio buttons to a scalable scrollable list (`sf-prompt-pick-item`) ready for 50+ prompts. Full prompt management is enabled: edit, delete, duplicate, reorder, persist — for both default and custom prompts.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — Removed `_fileState` dict and all `files[]` prompt schema; added `MAX_ATTACHMENTS`, `_execAttachments`, `_libAttachments`, `_execAdditional`, `_libAdditional` module-level state; replaced `renderExecFields()` with `renderUnifiedExecPanel()`; removed `files[]` from `SF_DEFAULT_PROMPTS`; fixed prompt update handler; removed stale `_fileState` loop from download complete handler
- `styles/platform.css` — Added unified prompt execution panel CSS section: `.sf-unified-attach-section`, `.sf-unified-attach-header`, `.sf-unified-attach-label`, `.sf-unified-attach-count`, `.sf-unified-file-list`, `.sf-unified-file-row`, `.sf-unified-file-name`, `.sf-unified-add-btn`, `.sf-unified-addl-section`, `.sf-unified-addl-textarea`, `.sf-unified-btn-row`

**Breaking changes:** None. Existing stored prompts with `files[]` are silently stripped by `normalisePrompt()` on load.

---

### Cloudability OrgID — Dashboard Widget Parity and Auto-Detection

**Type:** Bug Fix / Feature

**Summary:** Fixed the dashboard widget remaining stuck on "—" / "Retrieving…" when OrgID had already been retrieved in the plugin view. Root causes: (1) `orgIdFindTab()` in `background.js` used `{ active: true, currentWindow: true }` which returns nothing in a service worker context; (2) `orgIdRetrieve()` cache-hit path never sent `RC_CLD_ORG_UPDATE` to the dashboard; (3) `cloudability-orgid.js` `init()` only read from storage but never triggered a live retrieval; (4) dashboard widget did not display Organization Name. All four defects fixed. Added `cld-widget-orgname` element to the dashboard widget. Plugin `init()` now pre-populates from cache and then immediately triggers a live retrieval if a Cloudability tab is active.

**Files changed:**
- `background.js` — Fixed `orgIdFindTab()` to query all tabs (not `currentWindow`); added `RC_CLD_ORG_UPDATE` push on cache-hit path in `orgIdRetrieve()`; added `RC_CLD_ORG_UPDATE` push in `orgIdRetrieveOnce()` and `orgIdHandlePush()` on success
- `plugins/cloudability-orgid.js` — Added `chrome.runtime.onMessage` listener for `RC_CLD_ORG_UPDATE`; added startup cache pre-population; added live retrieval trigger on startup when Cloudability tab is active; added `cld-widget-orgname` updates to `cldUpdateUI()` and `cldShowUnavailable()`; fixed `findCloudabilityTab()` to prefer active tab
- `dashboard.html` — Added `#cld-widget-orgname` div with "Organization" label above OrgID in widget card; changed initial placeholder from "⏳ Retrieving…" to "—"

---

### Cloudability OrgID — Stale Data from Wrong Tab Fixed

**Type:** Bug Fix

**Summary:** OrgID was being retrieved from whichever Cloudability tab appeared first in the browser tab list, not necessarily the active one. With two Cloudability tabs open for different tenants (111111 and 222222), the first tab always won even when the user was looking at the second. Additionally, `orgIdEnrichIfPossible()` called `orgIdRetrieve(false)` which hit the cache instead of doing a live fetch, meaning tenant switches were served stale data.

**Files changed:**
- `background.js` — Changed `orgIdEnrichIfPossible()` to call `orgIdRetrieve(true)` (force-refresh) on tab events; updated `orgIdFindTab()` to prefer `t.active` tab before falling back to first match
- `plugins/cloudability-orgid.js` — Updated `findCloudabilityTab()` to prefer active Cloudability tab; fixed `onNavigate()` to always do live retrieval without pre-clearing state; fixed startup to trigger live retrieval when Cloudability is already active

---

### Cloudability OrgID — Active-Tab-Only Enforcement

**Type:** Bug Fix

**Summary:** Cloudability OrgID retrieval was triggering from background tabs. Any Cloudability tab loading in the background (not the active, focused tab) caused enrichment. When active tab was Google and a Cloudability tab existed elsewhere, OrgID was still retrieved and the dashboard updated. This violated the requirement: retrieval must only happen when the active browser tab is Cloudability. Fixed by replacing all `chrome.tabs.query({})` + fallback patterns with `chrome.windows.getAll()` active-only lookup. Also added `if (!tab.active) return` guard to `chrome.tabs.onUpdated` to block background tab loads from triggering enrichment.

**Files changed:**
- `background.js` — Replaced `orgIdFindTab()` with `orgIdGetActiveTab()` using `chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })`; returns only active-tab Cloudability match, null otherwise; added `if (!tab.active) return` to `chrome.tabs.onUpdated` listener; `orgIdFindTab` kept as alias for all existing callers
- `plugins/cloudability-orgid.js` — Replaced `findCloudabilityTab()` with `chrome.windows.getAll()` active-only implementation; no fallback to background tabs

---

### Dashboard — "Open Full View" Widget Buttons Regression Fixed

**Type:** Bug Fix

**Summary:** The ↗ expand buttons on all dashboard widget cards (`rc-widget-card__open`) and quick-action cards (`rc-action-card`) were visible and had correct `data-view` attributes but clicking them had no effect. No click listener was ever bound to these elements. `applyPluginVisibility()` binds listeners to plugin nav sidebar buttons only. Step 11 in boot sequence explicitly only binds `.rc-nav > .rc-nav__item[data-view]`. Widget open buttons were never covered. Fixed by adding a single delegated `click` listener on `document` that matches `.rc-widget-card__open[data-view]` and `.rc-action-card[data-view]`.

**Files changed:**
- `dashboard.js` — Added Step 11b delegated `document.addEventListener('click')` handler for `.rc-widget-card__open[data-view]` and `.rc-action-card[data-view]` buttons

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.20.2] — 2025-07-25 (Release Readiness Pass)

### Platform — Release Readiness: Code Quality, Simplification, and Documentation

**Type:** Enhancement / Governance

**Summary:** Full release readiness assessment pass: stale file header removed from `dashboard.js`, `LOG_LEVEL_ICONS` constant lifted from render-loop to module scope, `window.navigateTo` global alias removed to enforce plugin architecture boundary, missing `sfAdditionalInstructionsKey()` helper added to Salesforce plugin, documentation updated (`STORAGE.md`, `THEMES.md`, `ARCHITECTURE.md`), SF v4 storage keys fully documented, `dist/` synced to root runtime, temp file `.bob/tmp/sf-css-extract.css` removed, and `Salesforce-Extractor-Merge-Assessment.html` moved from root to `docs/reports/` to comply with root directory governance policy.

**Files changed:**
- `dashboard.js` — Replaced stale v1.9.0 header comment with accurate architectural summary; lifted `LEVEL_ICONS` to module-scope `LOG_LEVEL_ICONS`; removed `window.navigateTo` global alias
- `plugins/salesforce-case-extractor.js` — Added `sfAdditionalInstructionsKey()` helper for consistency
- `docs/STORAGE.md` — Updated version; added full Salesforce Case Extractor storage key table (6 v4 keys); added missing `rc:session:plugins-section-collapsed` key
- `docs/THEMES.md` — Updated version to v1.20.2
- `docs/ARCHITECTURE.md` — Updated version to v1.20.2
- `docs/SETTINGS.md` — Updated version to v1.20.2
- `docs/STARTUP-FLOW.md` — Updated version to v1.20.2
- `docs/TROUBLESHOOTING.md` — Updated version to v1.20.2
- `docs/DEVELOPER_GUIDE.md` — Updated version to v1.20.2
- `docs/ADR-008-plugin-module-architecture.md` — Added missing `tab-search.js` to runtime plugin list; corrected plugin load order to match `dashboard.html`
- `docs/plugins/salesforce-case-extractor.md` — Updated Storage section: split into platform-managed and plugin-owned keys; added all 6 v4 plugin-owned keys
- `AGENTS.md` — Corrected release report path from root to `docs/reports/`
- `Salesforce-Extractor-Merge-Assessment.html` — Moved from root to `docs/reports/` (root directory governance)
- `dist/` — Synced to root runtime files
- `.bob/tmp/sf-css-extract.css` — Removed temp file

**Breaking changes:** None. `window.navigateTo` was an undocumented alias; no plugin used it (verified by grep). Navigation continues through `window.ReplyCatorsApp.navigateTo` as documented.

---

## [1.20.2] — 2025-07-25

### Salesforce Case Extractor — Active Tab Validation Fix

**Type:** Bug Fix

**Summary:** Extraction was succeeding even when the active browser tab was not Salesforce (e.g. edge://extensions, Apptio, Google). The root cause was a fallback in `getActiveSalesforceTab()` that searched all browser tabs for any Salesforce URL when no active Salesforce tab was found, returning the first background tab it located. This fallback has been removed. Extraction now requires the currently active tab to be a Salesforce page — background and inactive Salesforce tabs are explicitly ignored.

**Root cause:** `getActiveSalesforceTab()` had a two-stage lookup. Stage 1 correctly required `.active && salesforce URL`. Stage 2 (the fallback) called `chrome.tabs.query({})` with no `active` filter and returned any Salesforce tab regardless of whether the user was looking at it.

**Fix:** Removed the stage-2 fallback entirely. The function now returns `null` as soon as stage 1 finds no active Salesforce tab. No background tab search is performed.

**Error message updated:** The failure message now reads: *"Salesforce tab inactive. Please switch to an active Salesforce case tab and try again."*

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `getActiveSalesforceTab()` fallback removed; error message updated

**Breaking changes:** None. The "Search by Case Number" mode (which intentionally searches all tabs for a specific case number) is unaffected — it uses `getSalesforceTabs(false)`, a separate function.

**Validation scenarios:**

| Scenario | Active tab | Expected | Result |
|---|---|---|---|
| 1 | Salesforce Case page | ✅ Extract works | ✅ Fixed |
| 2 | edge://extensions | ✅ Blocked + error | ✅ Fixed |
| 3 | Apptio (SF in background) | ✅ Blocked + error | ✅ Fixed |
| 4 | Google (SF in background) | ✅ Blocked + error | ✅ Fixed |

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.1
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.20.1] — 2025-07-25

### Platform — Startup Performance Optimization

**Type:** Enhancement

**Summary:** Eliminated three expensive async I/O operations that were executing on every popup open, regardless of which plugin the user intended to use. Startup is now significantly faster because heavy per-plugin work is deferred until the plugin view is actually opened.

**Bottlenecks removed:**

1. **Salesforce Case Extractor — tab scan on startup removed.**
   `sfRefreshDetectionBanner()` was called unconditionally on every startup, triggering `chrome.windows.getAll()` followed by `chrome.tabs.sendMessage()` before the user had opened the Salesforce view. Tab detection is now lazy: it fires only when the user navigates to the Salesforce plugin view (`onNavigate`).

2. **Salesforce Case Extractor — chrome.tabs listeners deferred.**
   `registerTabListeners()` (which adds `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` handlers) was called inside `init()` on every popup open. It is now called from `sfRefreshDetectionBanner()` on first navigation to the plugin view, still guarded by the existing `_tabListenersRegistered` flag.

3. **Cloudability OrgID — tab scan on startup removed.**
   `findCloudabilityTab()` (`chrome.tabs.query({})`) was called in `init()` on every popup open. Tab scanning is now deferred to a new `onNavigate()` method called by `navigateTo()` when the user opens the Cloudability view. Button listeners are still bound at `init()` time (synchronous, no I/O).

4. **Apptio Upgrade Calculator — migration check deferred.**
   The one-time `chrome.storage.local.get` migration flag check was running synchronously during startup. It is now deferred with `setTimeout(0)` so it does not block the startup render path.

5. **Platform — RC_GET_REGISTRY background round-trip deferred.**
   `updateStats()` was sending a `chrome.runtime.sendMessage({ type: 'RC_GET_REGISTRY' })` to the background worker as part of the synchronous startup sequence. Local stats (total/active/inactive) are still updated immediately; the background round-trip for error counts is now deferred with `setTimeout(0)`.

6. **Platform — duplicate nav click listeners eliminated.**
   Step 11 of the boot sequence was re-adding `click` listeners to all `[data-view]` elements, doubling up every navigation handler (plugin nav buttons already had listeners from `applyPluginVisibility()`). Step 11 now only targets the static platform-level nav buttons hardcoded in `dashboard.html`.

**User-facing impact:**
- Extension popup opens noticeably faster
- No functionality removed — all features work identically
- Salesforce tab detection still auto-runs immediately on first plugin view open
- Cloudability OrgID tab scan still runs immediately on first plugin view open

**Files changed:**
- `dashboard.js` — Removed startup SF banner call; deferred RC_GET_REGISTRY; fixed duplicate nav listeners; added Cloudability `onNavigate` dispatch
- `plugins/salesforce-case-extractor.js` — Removed `registerTabListeners()` from `init()`; moved call to `sfRefreshDetectionBanner()`
- `plugins/cloudability-orgid.js` — Deferred `findCloudabilityTab()` from `init()` to new `onNavigate()`; listeners are still bound at `init()`
- `plugins/apptio-upgrade-calculator.js` — Wrapped migration flag check in `setTimeout(0)`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.1
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.20.0] — 2025-07-25

### Platform — Documentation System

**Type:** Feature / Governance

**Summary:** Implemented a complete documentation system for the ReplyCators platform. Added an in-extension Help & Documentation view accessible from the Platform sidebar section (📖). Created engineering docs for storage, settings, themes, startup flow, contributing, and troubleshooting. Created per-plugin reference documentation for all 8 plugins. Added Documentation Maintenance Rules (§ 23-A) to AGENTS.md.

**User-facing changes:**
- New **Documentation** entry (📖) in the Platform sidebar section
- In-extension **Help & Documentation** view with 14 topics: Getting Started, Dashboard, Plugin Manager, Marketplace, Settings, Workspace Starter, Apptio Calculator, Cloudability OrgID, Salesforce Case Extractor, Edge Bookmark Finder, Tab Search, Snake, Troubleshooting, Release Notes
- Documentation is accessible directly inside the extension — no browser tab required
- All content is self-contained (no network requests)
- Two-pane layout: topic navigation sidebar + scrollable content area
- Fully theme-aware using `--rc-*` CSS custom properties

**Engineering documentation created:**
- `docs/STORAGE.md` — Complete storage schema (all keys, namespaces, platform settings object)
- `docs/SETTINGS.md` — Full settings reference (all settings, options, defaults, descriptions)
- `docs/THEMES.md` — Theme system, available themes, CSS custom properties, quick-toggle logic
- `docs/STARTUP-FLOW.md` — Full boot sequence with ASCII diagram, plugin load order
- `docs/CONTRIBUTING.md` — Contribution workflow, change guide, versioning, commit format
- `docs/TROUBLESHOOTING.md` — Common issues and fixes for all plugins and the platform

**Plugin documentation created:**
- `docs/plugins/salesforce-case-extractor.md`
- `docs/plugins/cloudability-orgid.md`
- `docs/plugins/bookmark-finder.md`
- `docs/plugins/apptio-upgrade-calculator.md`
- `docs/plugins/workspace-starter.md`
- `docs/plugins/tab-search.md`
- `docs/plugins/snake.md`
- `docs/plugins/marketplace.md`

**Governance:**
- `AGENTS.md § 23` Documentation Map reorganised and expanded with plugin doc table and user doc table
- `AGENTS.md § 23-A` Documentation Maintenance Rules added — binding on all agents and contributors
- `docs/ARCHITECTURE.md` — Last-updated header updated; Platform Views table added

**Files changed:**
- `plugins/documentation.js` — New: in-extension documentation plugin
- `dashboard.html` — Documentation nav button and view container added; `documentation.js` script tag added
- `dashboard.js` — Documentation navigation dispatch added to `navigateTo()`
- `styles/dashboard.css` — Documentation view CSS added
- `docs/STORAGE.md` — New
- `docs/SETTINGS.md` — New
- `docs/THEMES.md` — New
- `docs/STARTUP-FLOW.md` — New
- `docs/CONTRIBUTING.md` — New
- `docs/TROUBLESHOOTING.md` — New
- `docs/plugins/salesforce-case-extractor.md` — New
- `docs/plugins/cloudability-orgid.md` — New
- `docs/plugins/bookmark-finder.md` — New
- `docs/plugins/apptio-upgrade-calculator.md` — New
- `docs/plugins/workspace-starter.md` — New
- `docs/plugins/tab-search.md` — New
- `docs/plugins/snake.md` — New
- `docs/plugins/marketplace.md` — New
- `AGENTS.md` — § 23 expanded; § 23-A added; extension version updated to 1.20.0
- `docs/ARCHITECTURE.md` — Last-updated header updated; Platform Views table added
- `dist/` — Root files synced

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.1
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.19.0] — 2025-07-24

### Platform — Tab Search Plugin

**Type:** Feature

**Summary:** Added Tab Search plugin (`com.replycators.tab-search` v1.0.0) — instant browser tab search, filter, sort, group by domain, duplicate detection, per-tab actions, and statistics.

**Files changed:**
- `plugins/tab-search.js` — New plugin
- `dashboard.html` — Tab Search view and widget added
- `dashboard.js` — Tab Search registered in PLUGINS array

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.1
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Tab Search: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.18.0] — 2025-07-24

### Platform — TD-001 Regression Repair (Post-Refactor Audit)

**Type:** Bug Fix / Governance

**Summary:** Comprehensive regression audit following the TD-001 plugin module extraction refactor. Five known regressions identified, root-caused, fixed, and validated. Two additional documentation defects corrected. All dist/ mirrors synced.

**Regressions fixed:**

- **R1 — Workspace Starter seed URL (TD001-QA-001 HIGH):** `wsSeedDefaults()` seeded `https://apptio.lightning.force.com/` as the first Support Morning URL. Correct canonical URL is `https://ibmsf.lightning.force.com/lightning`. Root cause: URL not updated when environment changed. Fix: corrected `wsSeedDefaults()` in `plugins/workspace-starter.js`.

- **R2 — Workspace Starter startup race (TD001-QA-002 CRITICAL):** When Workspace Starter was the last active view at popup close, reopening the extension showed an empty profile list. Root cause: `dashboard.js` called `init(currentView)` before `navigateTo()` — `wsLoadData()` is async; by the time it resolved, `render()` had already been called and returned early (`wsDataLoaded=false`). Fix: `init()` callback unconditionally calls `wsRenderView()` after data loads; `render()` guards on `wsDataLoaded`. Profiles are now always visible on startup regardless of which view was last active.

- **R3 — Snake regression (TD001-QA-003 HIGH):** Multiple game loop regressions introduced during TD-001 extraction. Symptoms: HUD top-right counter never updated (showing 0), high score not persisted correctly, game continuation after pause/leave, no auto-pause on navigate-away. Root causes: (a) game loop missing `if (gameState !== 'running') return` guard — loop continued running after pause/game-over; (b) `snkUpdateHUD()` only called on food-eat event, not every tick — HUD score and high-score counters stale; (c) `startGame()` did not call `draw()+snkUpdateHUD()` immediately — first frame blank; (d) `onLeave` did not auto-pause running game; (e) `imageSmoothingEnabled=false` missing — canvas rendering blurry; (f) duplicate `showOverlay('start')` call caused start screen to flash `highScore=0` before async storage read. All six sub-issues fixed in `plugins/snake.js`.

- **R4 — Cloudability context regression (TD001-QA-004 HIGH):** Plugin displayed stale cached OrgID from previous sessions even when no Cloudability tab was open, misleading users about their current environment. Additionally, `app().loadDiagnostics()` was called in the include-diagnostics handler — `loadDiagnostics` is not exposed on `window.ReplyCatorsApp` (intentionally — `navigateTo('diagnostics')` calls it). Fix: `cldRestoreAndUpdate()` renamed to `cldRestoreCache()` (memory-only, no UI update); added `cldShowUnavailable()` to display clear unavailable state; all UI updates gated on tab presence; include-diag handler corrected to `app().navigateTo('diagnostics')`.

- **R5 — Bookmark Finder stuck on "Scanning" (TD001-QA-005 CRITICAL):** Plugin permanently displayed "Scanning bookmarks…" and never showed results. Root cause: `render()` expected a DOM container element as argument; `dashboard.js` post-TD-001 calls `render()` with no arguments; `render()` received `undefined` and returned immediately. Fix: `render()` now self-resolves container via `document.getElementById('edge-bookmark-container')` when no argument passed.

**Additional defects fixed:**

- **TD001-QA-006 MEDIUM:** AGENTS.md Source-of-Truth Matrix listed three stale Workspace Starter storage keys (`workspace-starter:profiles`, `:last-launched`, `:recents`) that were superseded by the single composite key `rc:plugin:com.replycators.workspace-starter:data`. Corrected to single-key entry.

- **TD001-QA-007 LOW:** AGENTS.md extension version listed as `1.17.0`; manifest.json and active runtime declare `1.18.0`. Corrected.

- **TD001-QA-008 LOW:** `docs/DEVELOPER_GUIDE.md` version header listed `v1.15.0`. Corrected to `v1.18.0`.

**Architecture validated:** TD-001 ownership boundaries confirmed sound. `dashboard.js` correctly contains only: orchestration, boot sequence, navigation, settings coordination, shared services, plugin registry metadata. All 7 plugins correctly self-register on `window.ReplyCatorsPlugins`. `window.ReplyCatorsApp` public surface correct — `loadDiagnostics` correctly NOT exposed (navigateTo handles it). All 12 themes validated. All settings confirmed wired and persisted. Startup boot sequence (Steps 1-16) confirmed correct.

**Files changed:**
- `plugins/workspace-starter.js` — seed URL corrected; init callback unconditionally renders
- `plugins/snake.js` — gameState guard restored; HUD on every tick; startGame draw+HUD; onLeave auto-pause; imageSmoothingEnabled; duplicate showOverlay removed
- `plugins/cloudability-orgid.js` — cldRestoreCache (memory only); cldShowUnavailable; UI gated on tab; include-diag handler corrected
- `plugins/bookmark-finder.js` — render() self-contained container lookup
- `AGENTS.md` — version 1.17.0→1.18.0; WS storage schema corrected (3 stale keys → 1 composite key)
- `docs/ARCHITECTURE.md` — last-updated header updated
- `docs/DEVELOPER_GUIDE.md` — version header corrected to v1.18.0
- `dist/plugins/workspace-starter.js` — synced from root
- `dist/plugins/snake.js` — synced from root
- `dist/plugins/cloudability-orgid.js` — synced from root
- `dist/plugins/bookmark-finder.js` — synced from root

**Breaking changes:** None. All changes are bug fixes restoring intended pre-refactor behavior. No storage key changes, no API changes, no message protocol changes.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.17.0] — 2025-07-22

### Platform — QA Remediation (RC-001, RC-003, RC-004)

**Type:** Bug Fix / Governance

**Summary:** Three defects identified during Principal QA assessment and fixed. RC-001: version string in `manifest.json` and `package.json` was stale at `1.16.2` while `dashboard.html` and `dashboard.js` already declared `v1.17.0`; aligned to 1.17.0 across all files. RC-003: the Workspace Starter "Tab Groups" toggle in Settings had no JavaScript event handler — toggling the control had no observable effect; wired to `appSettings.wsDefaultTabGroups` with persistence, logging, and `syncSettingsUI` restoration. RC-004: Workspace Starter plugin version in `PLUGINS[]` array was `1.0.0` despite the AGENTS.md Source of Truth Matrix, plugin inventory, and Workspace Starter Architecture Notes all declaring `v2.0.0`; corrected to `2.0.0`.

**Files changed:**
- `manifest.json` — version bumped to 1.17.0
- `package.json` — version bumped to 1.17.0
- `dist/manifest.json` — version bumped to 1.17.0 (dist sync)
- `dashboard.js` — DEFAULT_SETTINGS: added `wsDefaultTabGroups: true`; `initSettings()`: wired `ws-setting-tab-groups` change handler; `syncSettingsUI()`: added `setChk('ws-setting-tab-groups', ...)` restore; PLUGINS[]: Workspace Starter version corrected to `2.0.0`
- `dist/dashboard.js` — same changes synced from root

**Breaking changes:** None. The new `wsDefaultTabGroups` setting is backward-compatible; existing profiles are unaffected (launchMode is per-profile). The version alignment is a correction, not a new capability.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.16.2] — 2025-07-21

### Platform — Navigation Scalability (RC-NAV001–004)

**Type:** Enhancement / Bug Fix

**Summary:** The left sidebar navigation did not scroll when the plugin count exceeded the available height — a latent bug that would become visible as plugins are added. Root cause: `.rc-nav` had `flex: 1; overflow-y: auto` but was missing `min-height: 0`, so the flex item never got a constrained height and the scrollbar never activated (classic flexbox scroll fix). Additionally, plugin nav items now use slightly reduced vertical padding so more plugins are visible before scroll is needed, the expanded side panel sidebar is 220px (vs 200px popup) to prevent label truncation on longer plugin names, and side panel plugin nav items use even tighter spacing to take better advantage of the larger viewport. All changes are pure CSS — no JavaScript modified.

**Files changed:**
- `styles/dashboard.css` — `.rc-nav`: added `min-height: 0` (RC-NAV002); `.rc-sidebar--expanded` in side panel: 220px (RC-NAV001); `#rc-plugin-nav-items .rc-nav__item`: reduced padding in popup (7px, RC-NAV003) and side panel (5px/4px, RC-NAV004); density overrides scoped correctly; sidebar overflow comments updated
- `dashboard.html` — version badge updated to v1.16.2
- `manifest.json` — version bumped to 1.16.2
- `package.json` — version bumped to 1.16.2
- `dashboard.js` — file header version bumped to v1.16.2
- `dist/` — all runtime files synced
- `AGENTS.md` — version bumped; Navigation Scalability Strategy section added under UI/UX Conventions (§ 16)

**Breaking changes:** None — purely additive CSS changes. Plugin nav items are slightly more compact but fully readable. No storage, API, or message protocol changes.

**Navigation scalability capacity (post-fix):**
- Popup, comfortable density: 7 plugins fit without scroll; 10–12 triggers scroll (all accessible)
- Side panel, comfortable density: 15–18 plugins fit without scroll; 20+ scrolls gracefully
- Search bar in expanded sidebar remains fastest path for large plugin counts at any size

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.16.1] — 2025-07-21

### Platform — Plugin Navigation Order Synchronization (RC-020)

**Type:** Bug Fix

**Summary:** The left navigation plugin section was always rendered in `PLUGINS[]` declaration order, completely ignoring the user-defined order saved in Plugin Manager. The root cause was a two-part defect: (1) `applyDashboardOrder()` only re-ordered dashboard widget cards — it never touched the left nav; (2) in the startup sequence `applyDashboardOrder()` was called *before* `applyPluginVisibility()`, meaning the nav buttons did not yet exist when the re-order ran. Fix: `applyDashboardOrder()` is now the single enforcement function for all plugin-ordered UI surfaces — it re-orders both dashboard widgets and left nav buttons from the same `dashboardOrder[]` array (authoritative source: `rc:session:dashboard-order`). Startup sequence corrected: `applyPluginVisibility()` (creates nav buttons) now precedes `applyDashboardOrder()` (re-orders them).

**Files changed:**
- `dashboard.js` — `applyDashboardOrder()`: extended to re-order `#rc-plugin-nav-items` buttons in addition to dashboard widget cards; startup sequence corrected so `applyPluginVisibility()` runs before `applyDashboardOrder()`; file header version bumped to v1.16.1
- `dashboard.html` — version badge updated to v1.16.1
- `manifest.json` — version bumped to 1.16.1
- `package.json` — version bumped to 1.16.1
- `dist/dashboard.js`, `dist/dashboard.html`, `dist/manifest.json` — synced from root
- `AGENTS.md` — Source of Truth Matrix: plugin order row updated to reflect all UI surfaces; State Management Rules: no-competing-ordering-systems rule updated; Common Change Guide: plugin ordering guidance corrected; UI Rendering Map: startup sequence updated with ordering contract note; Forbidden Changes: updated; Plugin Version Rules: version table updated; Project Overview: version bumped

**Breaking changes:** None — only the visual order of left nav buttons changes to match what the user saved in Plugin Manager. Storage key `rc:session:dashboard-order` is unchanged.

**Root cause (for historical record):**
- `applyDashboardOrder()` only operated on `#rc-dashboard-widgets .rc-widget-card` elements — it never touched `#rc-plugin-nav-items`
- `applyPluginVisibility()` (which creates nav buttons) iterated `PLUGINS.forEach()` and appended new buttons with `navContainer.appendChild()` — always in declaration order
- `applyDashboardOrder()` was called before `applyPluginVisibility()` on startup — the nav buttons did not exist yet, so even after the fix adding nav reordering, the call was a no-op
- Net effect: left nav always displayed in PLUGINS[] source-code order, never in saved order

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.16.0] — 2025-07-18

### Platform — Remove Premature Automated Testing Infrastructure (TD-017)

**Type:** Governance / Architecture

**Summary:** ReplyCators is under active pre-release development. Architecture, plugins, storage structures, and UI workflows are still evolving. The 136-test Jest/jsdom suite introduced in v1.11.x–v1.15.0 carries a maintenance overhead that currently exceeds its value. Automated testing infrastructure has been intentionally removed to simplify development until the first stable release. Manual QA + exploratory testing is the current validation strategy. Automated testing is planned for after v1 stable when the architecture is stable.

**What was removed:**

| Item | Detail |
|------|--------|
| `tests/` folder | Entire directory deleted (8 test files, setup/, chrome-mock.js) |
| `jest` devDependency | `^29.7.0` — removed |
| `jest-environment-jsdom` devDependency | `^29.7.0` — removed |
| `@types/jest` devDependency | `^29.5.12` — removed |
| `jest` config block | Removed from `package.json` |
| `npm test` script | Removed from `package.json` |
| `npm run test:coverage` script | Removed from `package.json` |
| `npm run test:watch` script | Removed from `package.json` |
| CI unit-test job | `test:` job removed from `.github/workflows/ci.yml` |
| Coverage artifact upload | Upload test results step removed from CI |

**What was updated:**

| File | Change |
|------|--------|
| `package.json` | version → `1.16.0`; Jest deps + test scripts + jest config block removed |
| `.github/workflows/ci.yml` | Test job removed; CI-exception header updated; job numbering corrected |
| `AGENTS.md` | version → `1.16.0`; § 26 Automated Testing Standards replaced with § 26 Testing Strategy; all Jest references updated; AI agent anti-introduction rule added; § 15 agent workflow updated; Release Gate updated; § 19 current state updated; Technical Debt Register updated (TD-003, TD-007, TD-010, TD-013, TD-014, TD-015, TD-016 updated; TD-017 added) |
| `CHANGELOG.md` | This entry |
| `.gitignore` | Coverage section comment updated |

**Breaking changes:** None — extension behaviour and build process unchanged.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.15.0] — 2025-07-18

### Platform — Runtime-First Documentation Coverage & Workspace Starter Startup Fix (TD-015, TD-016)

**Type:** Governance / Bug Fix

**Summary (Phase 1 — TD-015):** Runtime-first governance was well-established in `AGENTS.md` and `ci.yml`, but `docs/INSTALLATION.md`, `docs/DEVELOPER_GUIDE.md`, `docs/PACKAGING.md`, `README.md`, and `.gitignore` still showed bare `npm install` as an unmarked default step. Any agent reading only those files would assume local installation is correct. All documentation now leads with a Runtime-First Policy notice, points to the authoritative node dependency store (`C:\Work\Bob\Runtime\NodeJS\node_modules`), and marks local `npm install` clearly as the exception path. The CI/CD workflow (`ci.yml`) is annotated with an explicit CI-exception note explaining why `npm ci` is acceptable there but not in local/agent workflows.

**Summary (Phase 2 — TD-016):** Workspace Starter showed "No workspace profiles yet" after reopening the extension when Workspace Starter was the last active view. Root cause: `wsLoadData()` uses an async `chrome.storage.local.get` callback. During startup, `navigateTo('plugin-workspace-starter')` fires synchronously — calling `wsRenderView()` before the async callback completes. At that moment `wsState.profiles` is empty, so the view renders the empty state. The Dashboard-first path worked because by the time the user navigated manually, storage had already loaded. Fix: add `if (currentView === 'plugin-workspace-starter') wsRenderView()` at the end of the `wsLoadData` callback in `initWorkspaceStarterPlugin()`. This enforces the required sequence: storage → load → state → render. 4 regression tests added.

**Phase 1 — Files changed (TD-015):**
- `.gitignore` — header rewritten: removed "Install locally via: npm install", added Runtime-First Policy reference, authoritative dep store documented
- `.github/workflows/ci.yml` — file-header CI-exception note added; `npm ci` steps annotated with CI-exception comment
- `docs/INSTALLATION.md` — Runtime-First Policy section added at top; prerequisites updated to reference Runtime; build step annotated as exception path
- `docs/DEVELOPER_GUIDE.md` — Runtime-First Policy notice added at top
- `docs/PACKAGING.md` — Runtime-First Policy notice added at top; build step annotated
- `README.md` — Quick Start updated with Runtime-first note; `npm install` marked as exception path

**Phase 2 — Files changed (TD-016):**
- `dashboard.js` — `initWorkspaceStarterPlugin()`: `wsLoadData` callback now calls `if (currentView === 'plugin-workspace-starter') wsRenderView()` after state hydration
- `dist/dashboard.js` — synced from root
- `tests/workspace-starter.test.js` — 4 new TD-015 regression tests added (startup sequence contract)

**Breaking changes:** None.

**Validation:**
- ✅ All 136 tests pass (8 suites, via `C:\Work\Bob\Runtime\NodeJS\node_modules\.bin\jest.cmd`)
- ✅ No workflow assumes `ReplyCators\node_modules` as a default step
- ✅ Runtime-first policy documented in all user-facing build docs
- ✅ Workspace Starter hydrates correctly on startup before first render

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.14.0] — 2025-07-17

### Platform — Edge Bookmark Finder Full-Row Interaction (TD-014)

**Type:** Enhancement / Bug Fix

**Summary:** The Edge Bookmark Finder's result rows and recent-bookmark rows were non-interactive — only the small ↗ icon at the edge of each row opened the bookmark. The title, URL, and row body were unclickable, had no hover affordance, and were not keyboard-accessible. This violated the platform's Interactive List Item Pattern (RC-UX010). Fixed: the full row is now the primary click target with `role="button"`, `tabindex="0"`, `cursor: pointer`, hover highlight, and `:focus-visible` ring. A shared `bmOpenBookmark()` function is the single source of truth for both row-click and icon-click. Event delegation is used on the container instead of per-row listener registration. Keyboard: Enter and Space trigger the primary action. Secondary action buttons (copy, delete) use `tabindex="-1"` so they do not break Tab navigation. This pattern is documented in AGENTS.md § 16 as the binding Interactive List Item Pattern.

**Files changed:**
- `plugins/bookmark-finder.js` — full row as click target; `bmOpenBookmark()` extracted; event delegation on container; keyboard handlers; focus-visible ring; `tabindex` attributes
- `styles/dashboard.css` — `.bm-result-row`, `.bm-recent-row` hover/focus-visible styles; cursor rule
- `AGENTS.md` — § 16 Interactive List Item Pattern (RC-UX010) added; TD-014 registered and resolved
- `manifest.json` — version bumped to 1.14.0
- `package.json` — version bumped to 1.14.0
- `dist/*` — runtime files synced

**Breaking changes:** None. The bookmark open behaviour is unchanged. Visual and interaction improvement only.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.13.1] — 2025-07-17

### Platform — Workspace Starter Tab Group Fix (TD-013)

**Type:** Bug Fix

**Summary:** Workspace Starter Tab Group mode was silently broken for all users. The `"tabGroups"` permission was absent from `manifest.json` — without it, `chrome.tabGroups` is `undefined` at runtime and any call to `chrome.tabGroups.update()` would throw. The `tabGroups` permission is required to call any `chrome.tabGroups` API. With the permission present, the `wslaunching` path that creates a named tab group now works correctly. The global `wsDefaultTabGroups` toggle in Settings → Workspace Starter continues to control whether new profiles default to tab-group mode.

**Files changed:**
- `manifest.json` — added `"tabGroups"` to `permissions` array; version bumped to 1.13.1
- `package.json` — version bumped to 1.13.1
- `AGENTS.md` — TD-013 registered and resolved; version bumped to 1.13.1
- `CHANGELOG.md` — this entry
- `dist/manifest.json` — synced

**Breaking changes:** None. Users who had Tab Groups enabled will now see tabs grouped on launch (previously silently skipped). No storage key changes.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.13.0] — 2025-07-17

### Platform — Runtime-First Architecture Enforcement & Governance (TD-012)

**Type:** Governance / Architecture

**Summary:** Prior governance (§13 Dependency Installation Policy) framed the `npm install → build → delete node_modules` cycle as "acceptable (transient)" and the lifecycle rule made it the *mandatory* default workflow. This allowed any future agent to conclude that creating `node_modules/` inside ReplyCators is the normal approach, treating the repository as a dependency staging area. TD-012 corrects this. The Runtime at `C:\Work\Bob\Runtime\NodeJS` is now the authoritative first choice for all Node.js tooling. Repository-local installation is documented as an exception that requires justified deviation from Runtime-first.

**Architecture changes:**

| Change | Location |
|--------|---------|
| New § 13-A Runtime-First Policy | `AGENTS.md` |
| Runtime Directory Standard (5 directories with purposes) | `AGENTS.md` § 13-A |
| Default Order of Operations (5-step Runtime-first sequence) | `AGENTS.md` § 13-A |
| Repository-Local Installation Exception (3-question mandatory justification gate) | `AGENTS.md` § 13-A |
| node_modules Governance table (preferred/exception/prohibited/smell) | `AGENTS.md` § 13-A |
| AI Agent Governance Dependency Decision Checklist (4-step) | `AGENTS.md` § 13-A |
| § 13 Absolute Prohibitions: 3 new rows (dependency cache, repeated install pattern, install → build → delete smell) | `AGENTS.md` § 13 |
| § 13 Dependency Installation Policy: reframed as Runtime-first; question #2 and #4 now explicitly reference Runtime | `AGENTS.md` § 13 |
| § 13 Runtime & Build Environment: expanded to full Runtime directory listing; `npm install` relabelled exception path | `AGENTS.md` § 13 |
| § 11 Forbidden Changes: 3 new rows covering install→build→delete anti-pattern, misplaced tooling installs | `AGENTS.md` § 11 |
| § 15 AI Agent Workflow: new Runtime-First Pre-Check section at top of workflow | `AGENTS.md` § 15 |
| TD-003 runtime note: documents `npm test` transient node_modules dependency | `AGENTS.md` § 18 |
| TD-007 runtime note: clarifies CI environment exemption from Runtime-First Policy | `AGENTS.md` § 18 |
| TD-012 registered and resolved | `AGENTS.md` § 18 |
| § 19 current state updated to v1.13.0 | `AGENTS.md` § 19 |

**Files changed:**
- `AGENTS.md` — version → `1.13.0`; § 1 version; § 11 Forbidden Changes (3 new rows); § 13 Absolute Prohibitions (3 new rows, 1 updated); § 13-A new section (Runtime-First Policy, Runtime Directory Standard, Default Order of Operations, Repository-Local Exception, node_modules Governance, AI Agent Decision Checklist); § 13 Dependency Installation Policy (reframed); § 13 Runtime & Build Environment (expanded); § 15 Runtime-First Pre-Check added; § 18 TD-003 and TD-007 notes updated, TD-012 added; § 19 current state updated
- `package.json` — version → `1.13.0`
- `CHANGELOG.md` — this entry

**Breaking changes:** None. No code, extension behaviour, or test coverage changed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.12.0] — 2025-07-17

### Platform — Repository Hygiene & Technical Debt Reassessment (TD-011)

**Type:** Governance / Hygiene / Enhancement

**Summary:** Technical Debt reassessment pass. All TD-001 through TD-010 items reviewed against repository state — statuses confirmed accurate. One new debt item registered (TD-011): `node_modules/` (82 MB) was left present in the repository after previous build sessions, violating the hygiene policy. Removed immediately. AGENTS.md governance hardened with explicit `node_modules` lifecycle rule, updated Absolute Prohibitions, corrected stale counts (test cases, dashboard.js line count, performance budget), and a post-task hygiene verification command. No user-facing changes. No plugin changes. MINOR bump for new AGENTS.md governance sections.

**Items resolved or updated:**

| ID | Title | Outcome |
|---|---|---|
| TD-011 | `node_modules/` left present in repository | ✅ Resolved — removed; §13 governance hardened |
| TD-003 | Test count correction | ♻️ Updated — 7 files / 91 cases (was stale: 6/90) |
| TD-004 | `dashboard.js` line count correction | ♻️ Updated — 5,284 lines (was stale: ~4,500) |

**Files changed:**
- `package.json` — version → `1.12.0`
- `manifest.json` — version → `1.12.0`
- `AGENTS.md` — version → `1.12.0`; §13 Absolute Prohibitions: two new node_modules rules; §13 Dependency Installation Policy: cardinal rule, decision table, lifecycle rule with command sequence; §13 Hygiene Checklist: `__` dir check + quick verification command; §13 Build Commands: corrected test count; §16 Performance Budget: `dashboard.js` budget raised to < 5,500 with explanatory note; §18 TD-003 corrected count; TD-004 corrected line count; TD-011 added; §19 current state updated to v1.11.1
- `CHANGELOG.md` — this entry
- `node_modules/` — **removed** (82 MB transient artefact, was left from prior sessions)

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.11.1] — 2025-07-17

### Platform — Extension Loading Fix: `__tests__/` → `tests/` (TD-010)

**Type:** Bug Fix / Governance

**Summary:** Microsoft Edge refused to load ReplyCators because the `__tests__/` directory (created during TD-003) has a name beginning with `__`, which is reserved by the Edge/Chrome extension system. The directory has been renamed to `tests/`. Jest configuration updated. All 90 existing tests continue to pass. A regression test and permanent governance rules have been added to prevent recurrence.

**Root cause:** The Jest conventional folder name `__tests__/` is incompatible with Manifest V3 extensions. Edge and Chrome reject any extension directory containing a `__`-prefixed folder at load time.

**Items resolved:**

| ID | Title | Outcome |
|---|---|---|
| TD-010 | `__tests__/` folder name blocked extension loading | ✅ Resolved — renamed to `tests/`, governance added |
| TD-003 | Automated test coverage | ♻️ Updated — test count corrected to 6 files / 90 cases; extension-compatible folder now documented |

**Files changed:**
- `tests/` — renamed from `__tests__/` (all 7 test files + `setup/` moved; no content changes)
- `tests/extension-compatibility.test.js` — new: regression test that scans for `__`-prefixed directories and fails if any are found
- `package.json` — version → `1.11.1`; Jest `testMatch` + `setupFiles` updated to `tests/` path
- `AGENTS.md` — version → `1.11.1`; Critical Rules §2 rule 6 added; Repository Structure updated; §13 Absolute Prohibitions updated; §15 AI Agent Workflow updated; §17 Release Gate updated; §18 TD-003 updated, TD-010 added; §23 Documentation Map updated; §25 Extension Compatibility Rules added (new section); §26 Automated Testing Standards added (new section)
- `CHANGELOG.md` — this entry

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.11.0] — 2025-07-17

### Platform — Technical Debt Remediation Program (TD-001 through TD-008)

**Type:** Governance / Enhancement / Bug Fix

**Summary:** Eight open Technical Debt items reviewed. Two fully resolved (TD-002, TD-007, TD-008 — plus TD-005 via documentation). Three partially resolved (TD-001, TD-003, TD-004). One deferred with roadmap (TD-006). This release improves maintainability without changing active runtime behaviour. No user-facing changes. MINOR bump applied for new `src/utils/` modules, `__tests__/` foundation, `.github/workflows/`, and `build/sync-root.js`.

**Items resolved or partially resolved:**

| ID | Title | Outcome |
|---|---|---|
| TD-001 | Dual implementation drift | Partially Resolved — Phase 1 automation complete; Phase 2 deferred |
| TD-002 | Manual root↔dist/ synchronisation | ✅ Resolved — `build/sync-root.js` + `postbuild` npm hook |
| TD-003 | Zero automated test coverage | Partially Resolved — Jest foundation: 5 test files, 60+ cases |
| TD-004 | `dashboard.js` monolith | Partially Resolved — 3 reference modules extracted to `src/utils/` |
| TD-005 | Font availability strategy | ✅ Resolved — Audit complete, Option A documented in `docs/FONT-STRATEGY.md` |
| TD-006 | Session vs persistent storage | Partially Resolved — Roadmap created in `docs/STORAGE-MIGRATION-ROADMAP.md` |
| TD-007 | No CI/CD pipeline | ✅ Resolved — `.github/workflows/ci.yml` with typecheck, test, build, sync-verify |
| TD-008 | Dead `RC_UPGRADE_FETCH_SCHEDULE` handler | ✅ Resolved — Confirmed dead, removed from `src/background/service-worker.ts` |

**Files changed:**
- `package.json` — version → `1.11.0`; added `postbuild`, `sync`, `sync:verify`, `sync:dry-run`, `test`, `test:coverage`, `test:watch` scripts; added Jest devDependencies; added Jest config
- `manifest.json` — version → `1.11.0`
- `dashboard.html` — version badge → `v1.11.0`
- `dashboard.js` — header comment → `v1.11.0`
- `AGENTS.md` — version → `1.11.0`; Technical Debt Register updated; Long-Term Architecture updated; build commands updated; Documentation Map updated; Known Limitations updated
- `build/sync-root.js` — new: RC-015 Phase 1 postbuild sync script (TD-001/TD-002)
- `__tests__/setup/chrome-mock.js` — new: Jest chrome.* mock
- `__tests__/settings.test.js` — new: Settings / DEFAULT_SETTINGS test suite
- `__tests__/plugin-ordering.test.js` — new: Plugin ordering / normalisation test suite
- `__tests__/workspace-starter.test.js` — new: Workspace Starter storage/CRUD test suite
- `__tests__/notification-filtering.test.js` — new: Notification filtering test suite
- `__tests__/helpers.test.js` — new: Utility helpers test suite
- `__tests__/storage-helpers.test.js` — new: Storage key constants test suite
- `src/utils/helpers.js` — new: Extracted utility functions (esc, cmpSemver, setEl, setStatus)
- `src/utils/storage-helpers.js` — new: Extracted storage key constants (RC_STORE, PLUGIN_KEYS)
- `src/utils/notification-helpers.js` — new: Extracted notification logic helpers
- `src/background/service-worker.ts` — removed dead `RC_UPGRADE_FETCH_SCHEDULE` handler (TD-008)
- `docs/FONT-STRATEGY.md` — new: Font availability audit and strategy decision (TD-005)
- `docs/STORAGE-MIGRATION-ROADMAP.md` — new: Storage namespace migration roadmap (TD-006)
- `.github/workflows/ci.yml` — new: GitHub Actions CI pipeline (TD-007)

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 2.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.10.1] — 2025-07-17

### Platform — Final Release QA Remediation (RC-025 through RC-029)

**Type:** Bug Fix / Governance

**Summary:** Final release QA pass. Five documentation/dist-sync defects discovered and fixed. All 29 RC items are now Fixed, Already Fixed, or Deferred with documented justification.

**Defects resolved:**

| ID | Title | Severity |
|---|---|---|
| RC-025 | `dist/manifest.json` version `2.1.0` (old label) — corrected to `1.10.1` | Low — dist/ only; root was correct |
| RC-026 | `dist/dashboard.html` version badge `v2.1.0` — corrected to `v1.10.1` | Low — cosmetic stale flash in dist/ |
| RC-027 | `dist/dashboard.js` header comment `v2.4.0` — corrected to `v1.10.1` | Negligible — comment only |
| RC-028 | `dist/package.json` and `dist/AGENTS.md` at `v1.5.2` — corrected to `v1.10.1`; Plugin Inventory updated | Low — dist/ documentation only |
| RC-029 | `README.md` at `v1.5.0` with stale plugin table — corrected to `v1.10.1`; Snake + Workspace Starter added | Low — README only |

**Files changed:**
- `manifest.json` — version → `1.10.1`
- `package.json` — version → `1.10.1`
- `dashboard.html` — version badge → `v1.10.1`
- `dashboard.js` — header comment → `v1.10.1`
- `dist/manifest.json` — version `2.1.0` → `1.10.1`
- `dist/dashboard.html` — version badge → `v1.10.1`
- `dist/dashboard.js` — header comment → `v1.10.1`
- `dist/package.json` — version `1.5.2` → `1.10.1`
- `dist/AGENTS.md` — version `1.5.2` → `1.10.1`; Plugin Inventory updated
- `README.md` — version `1.5.0` → `1.10.1`; plugin table updated
- `AGENTS.md` — RC-025 through RC-029 documented; current version references updated
- `CHANGELOG.md`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.10.0] — 2025-07-15

### Platform — Workspace Starter Plugin Migration

**Type:** Feature

**Summary:** Workspace Starter plugin migrated from the standalone `WorkspaceStarter` extension into a fully native ReplyCators plugin. Full CRUD workspace profile management, Tab Group support, Save Current Window, persistence across restarts, and full Plugin Manager / Settings / notification integration.

> ⚠️ Note on version numbering: this release was originally shipped as `2.1.0`. It has been
> corrected to `1.10.0`. Adding a plugin is a MINOR increment. No breaking change occurred.
> No storage migration was required. See AGENTS.md → Versioning Rules.

**Added:**
- Workspace Starter plugin — plugin ID `com.replycators.workspace-starter`
- Dashboard view: `#view-plugin-workspace-starter`
- Dashboard widget: profile count, last launched name, Launch Last / Open buttons
- Plugin Manager: listed with category `productivity`
- Settings section: Tab Groups toggle (`ws-setting-tab-groups`)
- Activity log filter: Workspace Starter option
- Full CRUD: create, edit, delete, duplicate profiles
- Launch: opens all profile URLs; optionally groups in a named Tab Group
- Save Current Window: captures all HTTP/HTTPS tabs as a new profile
- Storage: `rc:plugin:com.replycators.workspace-starter:profiles` and `:last-launched`
- Default workspace profile seeded on first install (Google + Outlook)

**Changed:**
- `dashboard.js`: version header → v1.10.0; `PLUGINS[]` extended; `DEFAULT_SETTINGS` gains `wsTabGroups`; boot calls `initWorkspaceStarterPlugin()`
- `dashboard.html`: plugin view, widget, Settings group, activity log option, Plugin Manager category option
- `styles/dashboard.css`: `ws-*` plugin styles appended
- `manifest.json`: version → 1.10.0
- `package.json`: version → 1.10.0
- `AGENTS.md`: Plugin Inventory, Storage Schema, UI Rendering Map updated

**Files changed:**
- `dashboard.js` — plugin logic, PLUGINS[], settings, boot
- `dashboard.html` — view, widget, settings, filters
- `styles/dashboard.css` — ws-* CSS classes
- `manifest.json` — version 1.10.0
- `package.json` — version 1.10.0
- `AGENTS.md` — documentation updated
- `src/plugins/WorkspaceStarter/index.ts` — new TypeScript stub
- `src/plugins/WorkspaceStarter/manifest.ts` — new plugin manifest

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Workspace Starter: 1.0.0 (new)
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.9.1] — 2025-07-15

### Platform — UI/UX Remediation Pass (Session 3)

**Type:** Bug Fix | UI | Enhancement

**Summary:** Comprehensive UI/UX remediation addressing all open RC defects from prior QA sessions. Fixed AUC tab active-state CSS, added Plugin Manager filter bar, added inline plugin description expansion, improved Edge Bookmark Finder 200-cap notice, added Popup sidebar discoverability hint, added accessibility improvements (aria-labels, nav landmark, tab initial state).

> ⚠️ Note on version numbering: this release was originally shipped as `2.0.1`. It has been
> corrected to `1.9.1`. These are bug fixes and UI enhancements following the Snake plugin
> addition — a PATCH increment. No breaking change. No new plugin or feature. See AGENTS.md.

**RC Defects Fixed:**

| RC ID | Type | Summary |
|-------|------|---------|
| RC-CSS-001 | Bug Fix | `.rc-tab--active` CSS class was referenced in `activateTab()` but never defined |
| RC-UX005 | Enhancement | Plugin Manager had no filter bar — added text search, status filter, category filter, live result count |
| RC-UX006 | Enhancement | Plugin descriptions truncated to 80 chars with no expand — added inline ▾ expand button |
| RC-UX009 | Enhancement | Edge Bookmark Finder 200-result cap notice was plain text — replaced with styled `bm-cap-notice` banner |
| RC-UX001 | Enhancement | Sidebar starts collapsed with no affordance — added 3s `rcHintPulse` animation on ☰ toggle |
| RC-A11Y-001 | Bug Fix | `<nav>` had no `aria-label` — screen readers could not identify the navigation landmark |
| RC-A11Y-002 | Bug Fix | AUC tab bar initial HTML had all tabs as `rc-btn--ghost` — first tab now starts as `rc-btn--primary rc-tab--active` |
| RC-A11Y-003 | Bug Fix | Plugin Manager "Open" buttons had generic `aria-label="Open"` — now include plugin name |
| RC-A11Y-004 | Bug Fix | Plugin Manager enable/disable toggles had no per-plugin `aria-label` |

**Files changed:**
- `dashboard.js` — filter state, `renderPluginGrid` filter/count, `activateTab`, RC-UX001, RC-A11Y-002/003/004
- `dashboard.html` — Plugin Manager filter bar HTML, nav `aria-label`
- `styles/dashboard.css` — `.rc-tab--active`, `.rc-pm-filter-bar`, `.rc-plist-empty`, `.rc-plist-desc-expand`, `.rc-plist-detail-row`, `.bm-cap-notice`, `.rc-sidebar--hint` + `rcHintPulse` keyframes
- `manifest.json` — version → 1.9.1

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Snake: 1.0.0
- Example Plugin: 1.0.0

---

## [1.9.0] — 2025-07-15

### Platform — Snake Plugin

**Type:** Feature

**Summary:** Added the Snake plugin — a classic retro arcade Snake game built entirely inside the ReplyCators dashboard. Features retro LCD monochrome rendering (#9CBC0F green, #0F380F ink), pixelated canvas, retro-style dotted border frame, cross-shaped food pixels, fixed-step movement (no interpolation), self-contained IIFE game loop using `requestAnimationFrame`. High score persists to `chrome.storage.local`. Game speed (Slow/Classic/Fast) persists to `appSettings`. D-pad controls appear automatically in Side Panel mode. Includes full Plugin Manager integration, dashboard widget, Settings entry, and navigation sidebar item.

> ⚠️ Note on version numbering: this release was originally shipped as `2.0.0`. It has been
> corrected to `1.9.0`. Adding a plugin is a non-breaking additive change → MINOR increment.
> No storage migration occurred. No API break occurred. No user action was required.
> The move to 2.0.0 was unjustified under Semantic Versioning. See AGENTS.md → Versioning Rules.

**Files changed:**
- `dashboard.js` — `SNK` IIFE module, `initSnakePlugin()`, PLUGINS registration, settings wiring, navigateTo hook, onLeave hook
- `dashboard.html` — nav button, dashboard widget, plugin view (canvas + overlay + d-pad + speed controls), Settings group
- `styles/dashboard.css` — Retro LCD CSS (`.snk-*` classes)
- `manifest.json` — version → 1.9.0
- `package.json` — version → 1.9.0
- `AGENTS.md` — plugin inventory updated

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Snake: 1.0.0 (new)
- Example Plugin: 1.0.0

---

## [1.8.1] — 2025-07-15

### Platform — Side Panel Launcher Lifecycle Fix

**Type:** Bug Fix

**Root cause:** `openInSidePanel()` (v1.8.0) wrote `rc:ui:launch-mode = 'sidepanel'` to
`chrome.storage.local` every time the user clicked the ⊞ button. On every subsequent popup open,
`detectAndApplySidePanelMode()` read back that stored value, applied `body.rc-sidepanel`, and the CSS
rule `body.rc-sidepanel #rc-sidepanel-btn { display: none }` permanently hid the button — even after
the side panel had been closed. The button was inaccessible on all future popup opens until the
extension was reloaded.

**Fix:**
- `detectAndApplySidePanelMode()` now uses geometry-only detection: `window.innerWidth > 820`.
  The popup is hard-constrained to 800 px; the side panel frame is always wider. No storage read.
- `openInSidePanel()` no longer writes `rc:ui:launch-mode` to storage.
- Stale `rc:ui:launch-mode` keys written by v1.8.0 are silently removed on every startup (Step 16b).
- The CSS `display:none` rule replaced with a `pointer-events:none` / dimmed-green style so the
  button remains visible inside the panel but communicates "already active" instead of disappearing.

**Files changed:**
- `dashboard.js` (detectAndApplySidePanelMode, openInSidePanel, startup cleanup)
- `styles/dashboard.css` (rc-sidepanel #rc-sidepanel-btn rule)
- `manifest.json` (version 1.8.0 → 1.8.1)
- `package.json` (version bump)
- `AGENTS.md` (version, storage schema — rc:ui:launch-mode marked removed)
- `CHANGELOG.md` (this entry)

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Example Plugin: 1.0.0

---

## [1.8.0] — 2025-07-15

### Platform — Side Panel Mode

**Type:** Feature

**Summary:** Added Side Panel support. Users can now open ReplyCators as a persistent browser side panel
(similar to Microsoft Copilot in Edge) by clicking the ⊞ button in the topbar. The side panel stays
open across tabs and lets users extract data without closing the extension. A `body.rc-sidepanel` CSS
class applies a fluid layout when running as a panel. The launch mode is persisted to
`rc:ui:launch-mode` in local storage. The button is hidden automatically when already running in the
side panel. Requires `sidePanel` permission (Chrome/Edge 114+) with graceful fallback to a toast if
the API is unavailable.

### Platform — Toast Notification Limit

**Type:** Feature / UX

**Summary:** `showToast()` now enforces a maximum of 2 simultaneous visible toasts. When a third toast
would appear, the oldest active toast is immediately removed before the new one is added. This prevents
visual clutter during rapid consecutive operations (e.g. multiple plugin actions). The limit is defined
by the constant `RC_MAX_TOASTS = 2`.

### Salesforce Case Extractor — v3.2.0 — Extract-First UI Redesign

**Type:** Feature / UX Improvement

**Summary:** Restructured the Salesforce plugin view to prioritise the Extract action. The Extract button
is now the first and most prominent control, followed by a compact Source dropdown and an optional Case
Number field that is hidden entirely when Active Tab mode is selected. Radio buttons removed; replaced
by a `<select>` dropdown consuming ~50% less vertical space. The detection status banner moves inline
next to the Extract button. All existing extraction semantics (active-tab mode, search mode, auto-clear,
persistence) are preserved.

**Changes:**
- Extract button promoted to top of panel with larger size (`rc-btn--extract`)
- Detection banner rendered inline next to Extract button (`.sf-banner-inline`)
- Source radio group replaced by `<select id="sf-source-select">` dropdown
- Case Number row (`#sf-case-row`) now hidden/shown via `display:flex/none` (not disabled)
- `sfRefreshDetectionBanner()` reads `#sf-source-select`, toggles `#sf-case-row` visibility
- `initSalesforceExtractor()` wires `change` on select instead of radio buttons
- `persistSfSettings()` reads `#sf-source-select` value
- Session restore applies saved source to `#sf-source-select.value`

**Files changed:**
- `dashboard.html` (SF view restructure, topbar ⊞ button)
- `dashboard.js` (SF select wiring, side panel functions, toast limit, version bumps)
- `styles/dashboard.css` (side panel fluid layout, SF extract-first component styles)
- `manifest.json` (version 1.7.0→1.8.0, `sidePanel` permission, `side_panel` declaration)
- `package.json` (version bump)
- `AGENTS.md` (version, plugin inventory, storage schema)
- `CHANGELOG.md` (this entry)

**Breaking changes:** None — message protocol and all plugin behaviours unchanged.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Example Plugin: 1.0.0

---

## [1.7.0] — 2025-07-15

### Salesforce Case Extractor — v3.1.0

**Type:** Feature / UX Improvement

**Summary:** Replaced the implicit "case number takes precedence" extraction logic with an explicit Source
radio selector (`Active Salesforce Tab` / `Search by Case Number`). The default source is always **Active
Salesforce Tab**, preventing accidental re-extraction of a stale case number. The Case Number field is
disabled when Active Tab mode is selected and enabled only in Search mode. A successful Search-mode
extraction auto-clears the Case Number field. The selected source persists across sessions via
`rc:session:sf-settings`. Context-sensitive help text below the Case Number field describes the active mode.

**Changes:**
- Added `Source` radio group (`#sf-source-active` / `#sf-source-search`) to the Salesforce plugin view
- Case Number field (`#sf-case-number`) is now disabled by default; enabled only in Search mode
- `sfRefreshDetectionBanner()` reads source radio to gate banner logic and field enable state
- `runExtraction()` reads source radio to determine extraction path; ignores Case Number in Active Tab mode
- Successful Search-mode extraction clears the Case Number field and persists the cleared state
- `persistSfSettings()` now saves `source` field alongside `outputFormat` and `autoFill`
- Session restore applies saved source radio; Case Number field is never pre-populated from stored results
- Helper text (`#sf-helper-text`) updates dynamically when source selection changes

**Files changed:**
- `dashboard.html` (source radio UI, Case Number field disabled, helper text element ID)
- `dashboard.js` (initSalesforceExtractor, sfRefreshDetectionBanner, persistSfSettings, startup restore)
- `manifest.json` (version bump 1.6.0 → 1.7.0)
- `package.json` (version bump 1.6.0 → 1.7.0)
- `AGENTS.md` (version bump, plugin inventory, storage schema)
- `CHANGELOG.md` (this entry)

**Breaking changes:** None — the extraction protocol (`SF_EXTRACT` / `SF_IS_CASE_PAGE`) is unchanged.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.1.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Example Plugin: 1.0.0

---

## [1.6.0] — 2025-07-15

### Salesforce Case Extractor — v3.0.0 (Engine Replacement)

**Type:** Refactor / Enhancement

**Summary:** Replaced the v2.1.0 `sf-content.js` extraction engine with the
v0.4.3 engine from the `ReplyCators-salesforce-extractor` standalone project.
The new engine uses clone-based DOM cleanup (`extractCleanText`), multi-strategy
record container resolution (`resolveActiveRecordContainer` /
`resolveTargetRecordContainer`), parent-case post filtering (`data-scope="parent"`),
and a diagnostic system that returns a detailed `_diagnostics` object alongside
extracted data. Message protocol is unchanged (`SF_EXTRACT` / `SF_IS_CASE_PAGE`).

**Improvements over v2.1.0:**
- `extractCleanText()` uses `textContent` (not `innerText`) on detached clones — correct on all Chrome versions
- `findFieldByLabel()` strips label element from clone before fallback — prevents "Account Name … Edit" noise
- `extractDescription()` queries record-layout field first; internal post bodies are fallback only
- `findAllInternalPostBodies()` uses `querySelectorAll` — Agent Description found in any internal post
- `resolveTargetRecordContainer()` adds three strategies (tabpanel, document case number, record title heading)
- Parent-case posts excluded via `querySelector('header[data-scope="parent"]')` (downward search, not `closest`)
- Soft case-number mismatch guard — data is always returned; mismatch attached as a diagnostic warning

**Files changed:**
- `sf-content.js` (replaced — new v0.4.3 engine)
- `src/plugins/SalesforceExtractor/content/sf-content.js` (synced)
- `src/plugins/SalesforceExtractor/manifest.ts` (version bump to 3.0.0)
- `dist/plugins/SalesforceExtractor/content/sf-content.js` (synced)
- `dist/manifest.json` (synced)
- `dashboard.js` (plugin version updated to 3.0.0, description updated)
- `manifest.json` (extension version bump to 1.6.0)
- `package.json` (version bump to 1.6.0)
- `AGENTS.md` (updated Salesforce implementation path, storage, migration notes)

**Breaking changes:** None — message protocol (`SF_EXTRACT`/`SF_IS_CASE_PAGE`),
storage keys, and UI DOM IDs are all unchanged.

**Note:** `Status` and `Priority` fields are no longer included in the extraction
output. The new engine focuses on fields reliably extractable from the Salesforce
Lightning DOM: Case Number, Subject, Account, Contact, Description, Agent Description,
and public feed posts.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.0.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Example Plugin: 1.0.0

---

## [1.5.2] — 2025-07-14

### Platform — v1.5.2 (Release-Gate Bug Fixes)

**Type:** Bug Fix

**Summary:** Second remediation pass — seven defects discovered during the release-gate architectural review. All are correctness or UX defects with direct user impact. No new features.

**Defects resolved:**

| ID | Title | Severity |
|---|---|---|
| BUG-A | `showToast()` bypassed notification master switch and per-type filters | High |
| BUG-B | Duplicate `DARK_THEMES` constant — `applyTheme()` had its own local array diverged from `DARK_THEME_SET` | Medium |
| BUG-C | `updateStats()` unsafe `pluginStates[p.id].enabled` access — would throw TypeError if a plugin had no state entry | Medium |
| BUG-D | Sidebar `#rc-search` input had zero event handler — search completely non-functional | High |
| BUG-E | Double-negation guard in `navigateTo()` and `applyPluginVisibility()` — inverted logic risk | Medium |
| BUG-F | Activity log plugin filter missing Salesforce Case Extractor and Example Plugin options | Medium |
| BUG-G | `#rc-platform-version` badge hardcoded as `v1.0.0` in HTML source — shown stale until JS ran | Low |

**Files changed:**
- `dashboard.js` (BUG-A, BUG-B, BUG-C, BUG-D, BUG-E)
- `dashboard.html` (BUG-F, BUG-G)
- `manifest.json` (version bump)
- `package.json` (version bump)
- `AGENTS.md` (version line, showToast API note, sidebar search note)
- `CHANGELOG.md`

**Breaking changes:** None.

**API change:** `showToast(message, type, title, force)` — 4th parameter `force=true` bypasses the notification filter for system-critical messages.

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Example Plugin: 1.0.0

---

## [1.5.1] — 2025-07-14

### Platform — v1.5.1 (QA Defect Remediation)

**Type:** Bug Fix

**Summary:** QA remediation pass fixing 15 of 18 defects identified in the Principal QA Assessment. All P1 and P2 items are resolved. P3 architectural items are documented in AGENTS.md as planned remediation.

**Defects resolved:**

| ID | Title | Severity |
|---|---|---|
| RC-001 | Double bootstrap on install | High |
| RC-002 | Show Plugin Cards setting had no effect | High |
| RC-003 | Larger Font Size applied to body only — now covers all key UI elements | Medium |
| RC-004 | High Contrast Mode now implements true accessibility-grade contrast | Medium |
| RC-005 | Notification master switch and per-type filters now gate toast display | High |
| RC-006 | Notification duration now read from appSettings | Medium |
| RC-007 | Error Plugins stat now queries background registry (was hardcoded 0) | Medium |
| RC-008 | Remember Last Position flag now respected | Medium |
| RC-009 | AGENTS.md corrected: RC_UPGRADE_FETCH_SCHEDULE reference removed | Medium |
| RC-010 | Cloudability OrgID version corrected to 3.0.0 in dashboard.js | Medium |
| RC-011 | options.html rewritten as redirect to real settings experience | Medium |
| RC-013 | Theme quick-toggle now remembers previous dark/light theme | Low |
| RC-014 | settingsManager.getAll() implemented (was stub returning {}) | Low |
| RC-016 | Plugin version sorting is now semver-aware | Low |
| RC-017 | IBM Community parser now warns on 0-release live fetch result | Low |

**Deferred (documented in AGENTS.md Architectural Remediation Plans):**

| ID | Title | Target |
|---|---|---|
| RC-012 | Font availability strategy | v1.6.0 |
| RC-015 | Dual implementation drift / build automation | v1.6.0 (Phase 1), future (Phase 2) |
| RC-018 | Automated test coverage | v1.6.0 |

**Files changed:**
- `dashboard.js` (RC-002, RC-007, RC-010, RC-013, RC-016)
- `styles/platform.css` (RC-002, RC-003, RC-004)
- `background.js` (RC-001, RC-014)
- `options.html` (RC-011)
- `AGENTS.md` (RC-009, RC-012, RC-015, RC-018)
- `CHANGELOG.md`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0
- Example Plugin: 1.0.0

---

## [1.5.0] — 2025-07-14

### Apptio Planning Upgrade Calculator — v1.0.0 (Platform Integration)

**Type:** Feature

**Summary:** Integrated the Apptio Planning Upgrade Calculator as a native ReplyCators plugin. Full dynamic IBM Community schedule retrieval with QA-hardened multi-strategy HTML parser (table → element/paragraph → body text scan), validated 24-hour cache with corruption handling, local `apptio-schedule.json` fallback, three-tab UI (Next Release, Calculator, Schedule), known/unknown upgrade day calculations, sandbox windows, Copy Summary and Copy Customer Response actions, and full ReplyCators persistence/logging/notification integration.

**Files changed:**
- `src/plugins/ApptioUpgradeCalculator/manifest.ts` (new)
- `src/plugins/ApptioUpgradeCalculator/index.ts` (new)
- `src/plugins/ApptioUpgradeCalculator/UpgradeScheduleService.ts` (new)
- `src/plugins/ApptioUpgradeCalculator/ui/UpgradeCalculatorUI.ts` (new)
- `src/platform/bootstrap.ts`
- `dashboard.html`
- `dashboard.js`
- `styles/dashboard.css`
- `manifest.json`
- `package.json`
- `apptio-schedule.json` (new)
- `AGENTS.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `CHANGELOG.md`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 1.0.0 (new)
- Example Plugin: 1.0.0

---

## [1.4.0] — 2025-07-04

### Apptio Planning Upgrade Calculator — v2.0.0 (Full Plugin Rewrite)

**Type:** Feature / Enhancement

**Summary:** Full plugin rewrite. Replaced single-panel table UI with a 4-tab layout (Next Release, Calculator, Schedule, Maintenance). Added known/unknown upgrade day calculation with full Mon–Sun day tables, sandbox and production upgrade windows, professional customer response templates, Copy Summary and Copy Response actions, NEW and DATE CHANGED badges on the schedule, source label bar, prefs persistence (tab, version, upgrade day), last calculation restore on open, and improved three-tier schedule retrieval with stale-cache fallback.

**Files changed:**
- `dashboard.js` (Plugin 1 flat JS section — full replacement)
- `src/plugins/ApptioUpgradeCalculator/UpgradeScheduleService.ts`
- `src/plugins/ApptioUpgradeCalculator/ui/UpgradeCalculatorUI.ts`
- `src/plugins/ApptioUpgradeCalculator/manifest.ts`
- `manifest.json`
- `package.json`
- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`

**Breaking changes:** Storage key `rc:plugin:com.replycators.apptio-upgrade-calculator:last-result` replaced by `rc:plugin:com.replycators.apptio-upgrade-calculator:last-calc` (different shape). Existing cached last-result entries will be silently ignored. (Plugin-internal storage change only — does not affect platform data.)

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0
- Apptio Planning Upgrade Calculator: 2.0.0
- Example Plugin: 1.0.0

---

## [1.3.0] — 2025-07-03

### Platform — v1.3.0 (Three New Plugins)

**Type:** Feature

**Summary:** Added three new production-ready plugins: Apptio Planning Upgrade Calculator, Case Timeline Visualizer, and Edge Bookmark Finder. Added `bookmarks` permission to manifest for Edge Bookmark Finder.

**Files changed:**
- `manifest.json`
- `package.json`
- `dashboard.html`
- `dashboard.js`
- `src/platform/bootstrap.ts`
- `src/plugins/ApptioUpgradeCalculator/manifest.ts` (new)
- `src/plugins/ApptioUpgradeCalculator/index.ts` (new)
- `src/plugins/ApptioUpgradeCalculator/UpgradeScheduleService.ts` (new)
- `src/plugins/ApptioUpgradeCalculator/ui/UpgradeCalculatorUI.ts` (new)
- `src/plugins/CaseTimelineVisualizer/manifest.ts` (new)
- `src/plugins/CaseTimelineVisualizer/index.ts` (new)
- `src/plugins/EdgeBookmarkFinder/manifest.ts` (new)
- `src/plugins/EdgeBookmarkFinder/index.ts` (new)
- `src/plugins/EdgeBookmarkFinder/BookmarkService.ts` (new)
- `src/plugins/EdgeBookmarkFinder/ui/BookmarkFinderUI.ts` (new)
- `AGENTS.md`
- `CHANGELOG.md`

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Edge Bookmark Finder: 1.0.0 (new)
- Apptio Planning Upgrade Calculator: 1.0.0 (new)
- Example Plugin: 1.0.0

---

## [1.0.0] — 2025-01-01

### Platform — Initial Release

**Type:** Feature

**Summary:** Initial release of the ReplyCators plugin-based Microsoft Edge Extension platform. Ships with two production plugins (Salesforce Case Extractor, Cloudability OrgID) and one reference template plugin (Example Plugin). Four-layer clean architecture (Core → Platform → SDK → Plugins), TypeScript 5.4 source with Webpack build, flat-deployment for active browser loading.

**Files changed:**
- `manifest.json`
- `package.json`
- `dashboard.html`
- `dashboard.js`
- `background.js`
- `sf-content.js`
- `cloudability-detector.js`
- `cloudability-interceptor.js`
- `styles/platform.css`
- `styles/dashboard.css`
- `src/` (full TypeScript source)
- `docs/` (full documentation suite)

**Breaking changes:** None — initial release.

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Example Plugin: 1.0.0

---

## [1.0.0] — 2025-01-01 (Governance)

### Project — Versioning Policy and Documentation Governance

**Type:** Governance

**Summary:** Established formal versioning policy (SemVer), documentation policy, change tracking standard, and agent operating rules. Created CHANGELOG.md as the authoritative change history. Updated AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/DEVELOPER_GUIDE.md, and docs/PACKAGING.md to reflect all governance standards.

**Files changed:**
- `AGENTS.md`
- `CHANGELOG.md` (this file — created)
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/PACKAGING.md`

**Breaking changes:** None — governance and documentation only.

**Plugin versions at this release:**
- Salesforce Case Extractor: 2.1.0
- Cloudability OrgID: 3.0.0
- Example Plugin: 1.0.0
