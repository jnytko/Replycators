# Changelog Archive

## Sections

- Overview
- Release Entries (v1.27.1 and below)

---

## Overview

**Archive scope:** Verbose release entries for platform versions v1.27.1 and below.
These entries are preserved for historical reference and traceability.

- For recent verbose entries (v1.27.2 and above): see [CHANGELOG.md](../CHANGELOG.md).
- For a quick summary of all versions: see the Version History Reference table in CHANGELOG.md.

---

## Release Entries


## [1.27.1] — 2025-07-24 (corrected)

### Documentation — Root-runtime guidance alignment

**Type:** Governance

**Summary:** Corrected documentation drift around the active load path, plugin-development workflow, and working-directory links. The updated docs now consistently describe the repository root as the authoritative runtime, treat `dist/` as a mirror/package target, and remove stale README guidance that implied `src/`-only plugin work updates the running extension.

**Files changed:**
- `README.md` — Corrected extension version to 1.27.1; fixed `docs/WORKING_DIRECTORY.md` links; replaced stale TypeScript-only plugin-development steps with root-runtime workflow guidance; clarified `dist/` is not the primary load path
- `docs/INSTALLATION.md` — Updated last-updated marker to 1.27.1; corrected load instructions so root is the normal development target and `dist/` is optional for mirror validation
- `docs/PACKAGING.md` — Updated last-updated marker to 1.27.1; aligned packaging guidance with root-first runtime architecture; corrected `dist/assets/icons/` mirror path and `dist/` output description

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
- `styles/dashboard.css` — Added complete `adf-*` CSS rules using only `var(--rc-*)` design tokens
- `AGENTS.md` — Updated Plugin Inventory, Plugin Source Locations, Source of Truth Matrix, Storage Schema, Active Views table, Project version (1.26.0)
- `package.json` — Version bumped to 1.26.0

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

**Summary:** Resolves 8 High-severity performance and diagnostics issues identified in the Performance & Diagnostics Assessment (v1.24.0). No new features or behaviour changes beyond the fixes described.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — PERF-001: removed `changeInfo.url` branch; added Salesforce URL pre-filter; `onActivated` pre-fetches tab URL before calling detection. PERF-006: `sfCheckHelperHealth()` 30-second cool-down added.
- `dashboard.js` — DIAG-001: wrapped all 8 plugin `init()` calls in `_safeInit()`. PERF-003: debounce raised 300ms → 1500ms.
- `background.js` — PERF-002: `chrome.tabs.onActivated` checks URL pattern before storage read.
- `plugins/apptio-upgrade-calculator.js` — PERF-005: cache-first waterfall.
- `plugins/workspace-starter.js` — DIAG-006: `wsSaveProfiles()` error callback added.
- `plugins/bookmark-finder.js` — PERF-004: quota guard before writing scan cache.
- `manifest.json`, `package.json` — version bumped to 1.25.4

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

**Summary:** When Bob Working Directory is configured, picking an attachment file now stores and displays the full absolute path (`<bobWorkingDir>\<filename>`) instead of the bare filename.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `_sfAttachName()` helper added; `fileInput.addEventListener('change')` uses it; `_renderFileList` row label updated
- `dist/plugins/salesforce-case-extractor.js` — same changes synced

**Breaking changes:** None.

**Plugin versions at this release:** Salesforce Case Extractor: 4.6.0 (all others unchanged from v1.25.2)

---

## [1.25.2] — 2025-07-26

### Bob Helper — Fix: working directory never applied to launcher

**Type:** Bug Fix

**Summary:** `bob` was always starting in the Bob Helper server's process cwd instead of the user-configured path. Root cause: `cmd.exe /c script.cmd arg1 arg2 arg3` silently drops positional arguments. Fix: added `call` between `/c` and the launcher path.

**Files changed:**
- `tools/bob-helper-server.js` — `spawnArgs` changed from `['/c', launcherPath, ...]` to `['/c', 'call', launcherPath, ...]`

**Breaking changes:** None.

---

## [1.25.1] — 2025-07-26

### Salesforce Case Extractor — Bob Working Directory: folder picker instead of free-text input

**Type:** Enhancement (UI)

**Summary:** "Bob Working Directory" setting now uses a Browse… button (native Windows folder picker via PowerShell `FolderBrowserDialog`) instead of free-text input. Added `✕ Clear` button.

**Files changed:**
- `dashboard.html` — Replaced text input with `#sf-bob-working-dir-display` + Browse + Clear buttons
- `dashboard.js` — `_sfApplyBobWorkingDir()` helper; Browse/Clear wired via `RC_PICK_BOB_DIR`
- `background.js` — `RC_PICK_BOB_DIR` handler added
- `tools/bob-helper-server.js` — `POST /pick-dir` endpoint added
- `plugins/salesforce-case-extractor.js` — `onWorkingDirChanged(path)` public API added
- `src/plugins/SalesforceExtractor/manifest.ts` — Plugin version corrected to `4.6.0`

**Breaking changes:** None.

---

## [1.25.0] — 2025-07-26

### Salesforce Case Extractor — Bob Working Directory configuration

**Type:** Feature

**Summary:** Adds "Bob Working Directory" setting under Settings → Salesforce Case Extractor. The configured path is passed through the full execution pipeline so `bob` is invoked from that directory. Execute button disabled when path is empty. Bob Helper validates the path before spawning the launcher.

**Files changed:**
- `dashboard.html`, `dashboard.js` — New `#sf-bob-working-dir` text input; `RC_STORE.SF_BOB_WORKING_DIR` key added
- `plugins/salesforce-case-extractor.js` — `_bobWorkingDir` state; `_isBobWorkingDirConfigured()` predicate; plugin version bumped to `4.6.0`
- `background.js` — `RC_EXECUTE_BOB` handler extracts and forwards `workingDir`
- `tools/bob-helper-server.js` — `/execute` validates and uses `workingDir`
- `tools/bob-launcher-template.cmd` — Accepts `%3` as `RC_WORKING_DIR`; performs `cd /d` before `bob`

**Breaking changes:** None.

---

## [1.24.0] — 2025-07-25

### Salesforce Case Extractor — Privacy Mode: email and inline contact redaction

**Type:** Enhancement

**Summary:** Extends Privacy Mode with three-pass redaction: (1) structured Contact field (`[REDACTED_CONTACT]`), (2) email addresses (`[REDACTED_EMAIL]`), (3) inline contact name occurrences throughout post bodies. New `_sfEscapeRegex()` helper introduced.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `sfApplyPrivacy()` rewritten with three-pass logic; plugin version bumped to `4.5.0`
- `dashboard.js`, `dashboard.html` — version bumped to `1.24.0`; SF plugin version updated to `4.5.0`
- `manifest.json`, `package.json` — version bumped to `1.24.0`

**Breaking changes:** None. The `[REDACTED]` token updated to `[REDACTED_CONTACT]` — output text change when Privacy Mode is on; no code depends on the token value.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.5.0 (all others unchanged)

---

## [1.23.1] — 2025-07-24

### Salesforce Case Extractor — "Copy with Prompt" button

**Type:** Feature

**Summary:** Adds a "📋 Copy with Prompt" button between Copy and Download. Assembles the full prompt (selected prompt + case data + Additional Requests) and copies to clipboard without sanitization.

**Files changed:**
- `dashboard.html` — New `#sf-btn-copy-prompt` button
- `plugins/salesforce-case-extractor.js` — `btnCopyPrompt` click handler; plugin version bumped to `4.4.0`
- `dashboard.js` — SF plugin version bumped to `4.4.0`

**Breaking changes:** None.

---

## [1.23.0] — 2025-07-23

### Salesforce Case Extractor + Platform — Bob Helper server health check

**Type:** Enhancement

**Summary:** Probes Bob Helper server (`GET /health`) every time the SF plugin view is opened. Execute buttons gain visual warning state when server unreachable. New `RC_BOB_HEALTH` message handler in `background.js`. Also documents `REPLYCATORS_BOB_HELPER_DEBUG` diagnostic flag.

**Files changed:**
- `background.js` — `RC_BOB_HEALTH` handler added (3s timeout)
- `plugins/salesforce-case-extractor.js` — `_helperHealthy` flag; `sfCheckHelperHealth()` on every navigate; `rc-btn--helper-down` class applied when down; Execute pre-flight guard
- `styles/dashboard.css` — `.rc-btn--helper-down` rule (amber border, reduced opacity)
- `docs/TROUBLESHOOTING.md` — `REPLYCATORS_BOB_HELPER_DEBUG` instructions added
- `manifest.json`, `package.json` — version bumped to 1.23.0

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.3.0 (all others unchanged)

---

## [1.22.2] — 2025-07-22

### Platform — Bob-bridge audit follow-up

**Type:** Governance / Documentation

**Summary:** Resolved all remaining cleanup items from the bob-bridge deprecation audit. Renamed stale `// ─── Bob Bridge execution` comment to `// ─── Bob Helper execution`, removed dead `native-host/` ignore rules from `.gitignore`, annotated the stale merge assessment report with an advisory banner, and added comprehensive Bob Helper setup documentation.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — section banner comment renamed
- `.gitignore` — Removed dead `native-host/` ignore block
- `docs/reports/Salesforce-Extractor-Merge-Assessment.html` — Advisory banner added
- `docs/TROUBLESHOOTING.md`, `docs/plugins/salesforce-case-extractor.md`, `docs/INSTALLATION.md`, `README.md` — Bob Helper setup documentation added

**Breaking changes:** None.

---

## [1.22.1] — 2025-07-22

### Platform — Bob Bridge cleanup (TD-018)

**Type:** Governance / Bug Fix

**Summary:** Removed the deprecated `native-host/` directory (Bob Bridge native messaging host) and corrected `PromptExecutionPanel.ts` to use the active HTTP helper execution path.

**Files changed:**
- `native-host/` — Deleted entirely
- `src/plugins/SalesforceExtractor/prompts/PromptExecutionPanel.ts` — `invokeBob()` corrected to use `chrome.runtime.sendMessage({ type: 'RC_EXECUTE_BOB', ... })`
- `plugins/salesforce-case-extractor.js` — comment attribution updated
- `AGENTS.md` — TD-018 added; Bob execution path documented

**Breaking changes:** None. The `native-host/` directory was already non-functional.

---

## [1.22.0] — 2025-07-21

### Salesforce Case Extractor — Privacy Mode

**Type:** Feature

**Summary:** Added "Privacy mode" checkbox to the Extract tab toolbar. When enabled (default), Contact field masked as `[REDACTED]`. Preference persisted in `rc:session:sf-settings`.

**Files changed:**
- `dashboard.html` — `#sf-privacy-mode` checkbox added; SF badge bumped to v4.3.0
- `dashboard.js` — `persistSfSettings()` reads/writes `privacyMode`
- `plugins/salesforce-case-extractor.js` — `sfPrivacyEnabled()`, `sfApplyPrivacy()`, `_lastRawText` cache

**Breaking changes:** None.

---

## [1.22.0] — 2025-07-18 *(backported from source)*

### Platform — UI/UX Modernization

**Type:** UI / Enhancement

**Summary:** Platform-wide visual design modernization across all UI components. Zero functional changes. Resolved: stat card accent pattern, widget card header, nav active state indicator, button modernization, toggle switches, health dots, status indicators, empty states, scrollbar thinned, global focus-visible ring, button active press state.

**Files changed:**
- `styles/platform.css`, `styles/dashboard.css` — component styles modernized
- `dashboard.html` — widget card arrows replaced with SVG external-link icons

**Breaking changes:** None.

---

## [1.21.3] — 2025-07-18 *(backported)*

### Salesforce Case Extractor — Dashboard Widget Detection Fix

**Type:** Bug Fix

**Summary:** Dashboard widget stuck on "Checking for active case…" because `sfRefreshDetectionBanner` had an early-return guard on `#sf-tab-detection-banner` absence. Fixed by removing the gate and calling `registerTabListeners()` + `sfRefreshDetectionBanner()` eagerly from `init()`.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — `sfRefreshDetectionBanner()` gate removed; `init()` calls both functions at startup

**Breaking changes:** None.

---

## [1.21.2] — 2025-07-17 *(backported)*

### Documentation — Full In-Extension Help & Documentation Audit and Update

**Type:** Governance / Documentation

**Summary:** Complete audit and rewrite of all 14 topics in `plugins/documentation.js`. Every topic compared against the actual running extension and corrected.

**Files changed:**
- `plugins/documentation.js` — all 14 topics updated

### Cloudability OrgID — Refresh Dead-End Fix and Active-Tab Status Consistency

**Type:** Bug Fix / UI

**Summary:** Three defects fixed: (1) Refresh dead-end when no active Cloudability tab; (2) stale onNavigate state preserving cached OrgID without updating badge; (3) incorrect info card text stating OrgID retrieved when Cloudability "open in any tab" (requirement: active tab only).

**Files changed:**
- `plugins/cloudability-orgid.js` — Refresh re-enabled; `cldShowUnavailable()` re-enables Refresh; `onNavigate()` always calls unavailable on no-tab
- `dashboard.html` — Info card text corrected

---

## [1.21.1] — 2025-07-17 *(backported)*

### Platform — Settings Appearance Gap Fix

**Type:** Bug Fix / UI

**Summary:** Empty row visible between Font and UI Density settings when system font selected. Fixed by hiding `#font-availability-row` when `font === 'system'`.

**Files changed:**
- `dashboard.js` — `updateFontAvailabilityBadge()` hides/shows row
- `styles/dashboard.css` — removed `min-height: 14px` from `.rc-font-badge`

### Salesforce Case Extractor — Documentation Updated to v4.2.0

**Type:** Governance / Documentation

**Summary:** `docs/plugins/salesforce-case-extractor.md` updated from v3.2.1 to v4.2.0.

---

## [1.21.1] — 2025-07-20

### Platform — Bob Execution Migration Cleanup

**Type:** Governance / Bug Fix

**Summary:** Removed dead code and corrected naming artefacts from Chrome Native Messaging bridge migration. Renamed `bobBridgeRequestSeq → bobHelperRequestSeq`, `isBobBridgeDebugEnabled → isBobHelperDebugEnabled`. Removed `nativeMessaging` permission from `manifest.json`.

**Files changed:**
- `background.js` — Removed `BOB_BRIDGE_HOST_NAME`; renamed functions; corrected RC_EXECUTE_BOB comment
- `plugins/salesforce-case-extractor.js` — Fixed `response?.hostPid → response?.helperPid`; updated log strings
- `manifest.json` — Removed `nativeMessaging` permission
- `.gitignore` — Added `**/.bob/`, `native-host/install.log`, `native-host/com.replycators.bob_bridge.json`
- `tools/test-spawn.js`, `tools/verify-prompt.js` — Deleted (development experiments)

**Breaking changes:** None. Extension reload required at `edge://extensions/`.

---

## [1.21.0] — 2025-07-16

### Salesforce Case Extractor — Unified Prompt System and Attachment Framework

**Type:** Feature / Refactor

**Summary:** Replaced per-prompt file-array-driven UI with a single shared execution panel. Every prompt now renders through one identical panel (0–6 attachments, Additional Requests textarea, Execute button). Prompt definitions now contain only `id`, `title`, `body`, `isDefault`, `createdAt`, `updatedAt`. Prompt selection redesigned from radio buttons to scalable scrollable list.

**Files changed:**
- `plugins/salesforce-case-extractor.js` — Removed `_fileState`; added `MAX_ATTACHMENTS`, `_execAttachments`; replaced `renderExecFields()` with `renderUnifiedExecPanel()`
- `styles/platform.css` — Added unified prompt execution panel CSS

### Cloudability OrgID — Dashboard Widget Parity and Auto-Detection

**Type:** Bug Fix / Feature

**Summary:** Fixed dashboard widget stuck on "—" / "Retrieving…" after OrgID retrieved. Four root causes fixed. Added `cld-widget-orgname` to widget. `init()` now pre-populates from cache then triggers live retrieval if Cloudability tab is active.

### Cloudability OrgID — Stale Data from Wrong Tab Fixed

**Type:** Bug Fix

**Summary:** OrgID was being retrieved from the first Cloudability tab in the tab list, not the active one. `orgIdEnrichIfPossible()` called `orgIdRetrieve(false)` (cache hit) instead of force-refresh. Both defects fixed.

### Cloudability OrgID — Active-Tab-Only Enforcement

**Type:** Bug Fix

**Summary:** Replaced all `chrome.tabs.query({})` patterns with `chrome.windows.getAll()` active-only lookup. Added `if (!tab.active) return` guard to `chrome.tabs.onUpdated`.

### Dashboard — "Open Full View" Widget Buttons Regression Fixed

**Type:** Bug Fix

**Summary:** Widget card `rc-widget-card__open` and quick-action `rc-action-card` buttons had no click listener. Fixed by adding a delegated `document.addEventListener('click')` handler (Step 11b).

**Breaking changes:** None.

**Plugin versions at this release:**
- Salesforce Case Extractor: 4.2.0
- Cloudability OrgID: 4.0.0 (all others unchanged)

---

## [1.20.2] — 2025-07-25 (Release Readiness Pass)

### Platform — Release Readiness: Code Quality, Simplification, and Documentation

**Type:** Enhancement / Governance

**Summary:** Stale file header removed from `dashboard.js`, `LOG_LEVEL_ICONS` lifted to module scope, `window.navigateTo` global alias removed, `sfAdditionalInstructionsKey()` helper added, documentation updated, `Salesforce-Extractor-Merge-Assessment.html` moved to `docs/reports/`.

### Salesforce Case Extractor — Active Tab Validation Fix

**Type:** Bug Fix

**Summary:** Extraction was succeeding even when the active browser tab was not Salesforce. The stage-2 fallback in `getActiveSalesforceTab()` (searching all tabs regardless of active state) has been removed.

**Plugin versions at this release:**
- Salesforce Case Extractor: 3.2.1
- Cloudability OrgID: 3.0.0 (all others unchanged)

---

## [1.20.1] — 2025-07-25

### Platform — Startup Performance Optimization

**Type:** Enhancement

**Summary:** Eliminated three expensive async I/O operations on every popup open: SF tab scan deferred to first navigate, Cloudability tab scan deferred to first navigate, AUC migration check wrapped in `setTimeout(0)`, `RC_GET_REGISTRY` deferred with `setTimeout(0)`, duplicate nav click listeners eliminated.

**Files changed:**
- `dashboard.js` — Removed startup SF/CLD tab scans; deferred RC_GET_REGISTRY; fixed duplicate nav listeners
- `plugins/salesforce-case-extractor.js` — `registerTabListeners()` moved to first `sfRefreshDetectionBanner()` call
- `plugins/cloudability-orgid.js` — Deferred `findCloudabilityTab()` from `init()` to new `onNavigate()`
- `plugins/apptio-upgrade-calculator.js` — Migration check wrapped in `setTimeout(0)`

---

## [1.20.0] — 2025-07-25

### Platform — Documentation System

**Type:** Feature / Governance

**Summary:** Implemented a complete documentation system. Added in-extension Help & Documentation view with 14 topics. Created engineering docs for storage, settings, themes, startup flow, contributing, and troubleshooting. Created per-plugin reference documentation for all 8 plugins. Added Documentation Maintenance Rules (§ 23-A) to AGENTS.md.

**Files created:**
- `plugins/documentation.js` — In-extension documentation plugin (14 topics)
- `docs/STORAGE.md`, `docs/SETTINGS.md`, `docs/THEMES.md`, `docs/STARTUP-FLOW.md`, `docs/CONTRIBUTING.md`, `docs/TROUBLESHOOTING.md` — Engineering docs
- `docs/plugins/salesforce-case-extractor.md`, `docs/plugins/cloudability-orgid.md`, `docs/plugins/bookmark-finder.md`, `docs/plugins/apptio-upgrade-calculator.md`, `docs/plugins/workspace-starter.md`, `docs/plugins/tab-search.md`, `docs/plugins/snake.md`, `docs/plugins/marketplace.md` — Plugin docs

---

## [1.19.0] — 2025-07-24

### Platform — Tab Search Plugin

**Type:** Feature

**Summary:** Added Tab Search plugin (`com.replycators.tab-search` v1.0.0) — instant browser tab search, filter, sort, group by domain, duplicate detection, per-tab actions, and statistics.

**Files changed:**
- `plugins/tab-search.js` — New plugin
- `dashboard.html` — Tab Search view and widget added
- `dashboard.js` — Tab Search registered in PLUGINS array

---

## [1.18.0] — 2025-07-24

### Platform — TD-001 Regression Repair (Post-Refactor Audit)

**Type:** Bug Fix / Governance

**Summary:** Five regressions identified and fixed after TD-001 plugin extraction refactor:
- **R1:** Workspace Starter seed URL corrected (ibmsf.lightning.force.com)
- **R2:** Workspace Starter startup race — `init()` callback now calls `wsRenderView()` after data loads
- **R3:** Snake six sub-issues (game loop guard, HUD on every tick, startGame draw, onLeave auto-pause, imageSmoothingEnabled, duplicate showOverlay)
- **R4:** Cloudability stale cached OrgID — `cldRestoreCache()` memory-only; `cldShowUnavailable()` added
- **R5:** Bookmark Finder stuck on "Scanning" — `render()` now self-resolves container

Two additional documentation defects corrected (WS storage keys, version number).

**Files changed:**
- `plugins/workspace-starter.js`, `plugins/snake.js`, `plugins/cloudability-orgid.js`, `plugins/bookmark-finder.js` — Bug fixes
- `AGENTS.md` — Version and WS storage schema corrected

---

## [1.17.0] — 2025-07-22

### Platform — QA Remediation (RC-001, RC-003, RC-004)

**Type:** Bug Fix / Governance

**Summary:** RC-001: version aligned to 1.17.0 across all files. RC-003: Workspace Starter "Tab Groups" toggle now wired to `appSettings.wsDefaultTabGroups` with persistence. RC-004: Workspace Starter plugin version corrected to 2.0.0 in `PLUGINS[]`.

---

## [1.16.2] — 2025-07-21

### Platform — Navigation Scalability (RC-NAV001–004)

**Type:** Enhancement / Bug Fix

**Summary:** Fixed sidebar nav scroll by adding `min-height: 0` to `.rc-nav` (classic flexbox scroll fix). Plugin nav items use slightly reduced vertical padding. Side panel expanded sidebar set to 220px. All changes pure CSS.

---

## [1.16.1] — 2025-07-21

### Platform — Plugin Navigation Order Synchronization (RC-020)

**Type:** Bug Fix

**Summary:** Left nav always rendered in `PLUGINS[]` declaration order, ignoring user-saved order. Fixed: `applyDashboardOrder()` now re-orders both dashboard widgets AND left nav buttons. Startup sequence corrected: `applyPluginVisibility()` before `applyDashboardOrder()`.

---

## [1.16.0] — 2025-07-18

### Platform — Remove Premature Automated Testing Infrastructure (TD-017)

**Type:** Governance / Architecture

**Summary:** Removed 136-test Jest/jsdom suite (premature — architecture still evolving). Manual QA is current validation strategy. Testing planned after first stable release.

**What was removed:** `tests/` folder, `jest`/`jest-environment-jsdom`/`@types/jest` devDependencies, `jest` config block, `npm test`/`test:coverage`/`test:watch` scripts, CI unit-test job.

---

## [1.15.0] — 2025-07-18

### Platform — Runtime-First Documentation Coverage & Workspace Starter Startup Fix (TD-015, TD-016)

**Type:** Governance / Bug Fix

**Summary:** TD-015: All documentation now leads with Runtime-First Policy notice. TD-016: Workspace Starter "No workspace profiles yet" startup race fixed — `wsLoadData` callback now calls `wsRenderView()` when Workspace Starter is the active view.

---

## [1.14.0] — 2025-07-17

### Platform — Edge Bookmark Finder Full-Row Interaction (TD-014)

**Type:** Enhancement / Bug Fix

**Summary:** Full row now the primary click target (`role="button"`, `tabindex="0"`, `cursor: pointer`, hover highlight, `:focus-visible` ring). `bmOpenBookmark()` extracted as single source of truth. Event delegation on container. Keyboard: Enter/Space open. Secondary buttons `tabindex="-1"`. Documented as Interactive List Item Pattern (RC-UX010).

---

## [1.13.1] — 2025-07-17

### Platform — Workspace Starter Tab Group Fix (TD-013)

**Type:** Bug Fix

**Summary:** `"tabGroups"` permission was absent from `manifest.json` — without it `chrome.tabGroups` is `undefined` at runtime. Permission added; Tab Group mode now works.

---

## [1.13.0] — 2025-07-17

### Platform — Runtime-First Architecture Enforcement & Governance (TD-012)

**Type:** Governance / Architecture

**Summary:** Prior governance framed `npm install → build → delete` as "acceptable (transient)". TD-012 corrects this. Runtime at `C:\Work\Bob\Runtime\NodeJS` is now the authoritative first choice. § 13-A Runtime-First Policy added to AGENTS.md.

---

## [1.12.0] — 2025-07-17

### Platform — Repository Hygiene & Technical Debt Reassessment (TD-011)

**Type:** Governance / Hygiene

**Summary:** `node_modules/` (82 MB) left present in repository — removed. AGENTS.md governance hardened with explicit `node_modules` lifecycle rule, updated Absolute Prohibitions, post-task hygiene verification command.

---

## [1.11.1] — 2025-07-17

### Platform — Extension Loading Fix: `__tests__/` → `tests/` (TD-010)

**Type:** Bug Fix / Governance

**Summary:** Microsoft Edge refused to load extension because `__tests__/` is reserved by the Edge/Chrome extension system. Renamed to `tests/`. Jest config updated. § 25 Extension Compatibility Rules added to AGENTS.md.

---

## [1.11.0] — 2025-07-17

### Platform — Technical Debt Remediation Program (TD-001 through TD-008)

**Type:** Governance / Enhancement / Bug Fix

**Summary:** Eight TD items reviewed. TD-002 resolved: `build/sync-root.js` + `postbuild` hook. TD-005 resolved: font strategy documented. TD-007 resolved: `.github/workflows/ci.yml` added. TD-008 resolved: dead `RC_UPGRADE_FETCH_SCHEDULE` handler removed. TD-001, TD-003, TD-004, TD-006 partially resolved with roadmaps.

---

## [1.10.1] — 2025-07-17

### Platform — Final Release QA Remediation (RC-025 through RC-029)

**Type:** Bug Fix / Governance

**Summary:** Five documentation/dist-sync defects: `dist/manifest.json`, `dist/dashboard.html`, `dist/dashboard.js`, `dist/package.json` version fields corrected; `README.md` plugin table updated to current versions.

---

## [1.10.0] — 2025-07-15

### Platform — Workspace Starter Plugin Migration

**Type:** Feature

**Summary:** Workspace Starter plugin migrated from standalone extension into native ReplyCators plugin. Full CRUD workspace profile management, Tab Group support, Save Current Window, persistence across restarts.

> ⚠️ Originally shipped as `2.1.0`. Corrected to `1.10.0` — adding a plugin is a MINOR increment.

---

## [1.9.1] — 2025-07-15

### Platform — UI/UX Remediation Pass (Session 3)

**Type:** Bug Fix | UI | Enhancement

**Summary:** Fixed AUC tab active-state CSS, added Plugin Manager filter bar, added inline plugin description expansion, improved Edge Bookmark Finder 200-cap notice, added Popup sidebar discoverability hint, added accessibility improvements.

> ⚠️ Originally shipped as `2.0.1`. Corrected to `1.9.1` — PATCH increment.

---

## [1.9.0] — 2025-07-15

### Platform — Snake Plugin

**Type:** Feature

**Summary:** Added Snake plugin — classic retro arcade Snake game. LCD monochrome rendering, pixelated canvas, retro-style dotted border, requestAnimationFrame game loop. High score persists to `chrome.storage.local`. Speed setting persists. D-pad controls in Side Panel mode.

> ⚠️ Originally shipped as `2.0.0`. Corrected to `1.9.0` — adding a plugin is a MINOR increment.

---

## [1.8.1] — 2025-07-15

### Platform — Side Panel Launcher Lifecycle Fix

**Type:** Bug Fix

**Summary:** `openInSidePanel()` wrote `rc:ui:launch-mode = 'sidepanel'` on every click, permanently hiding the ⊞ button on future popup opens. Fixed: `detectAndApplySidePanelMode()` now uses geometry-only detection (`window.innerWidth > 820`). Stale `rc:ui:launch-mode` keys silently removed on startup. CSS rule changed from `display:none` to `pointer-events:none` on the button.

---

## [1.8.0] — 2025-07-15

### Platform — Side Panel Mode + Toast Notification Limit + Salesforce v3.2.0 Extract-First UI

**Type:** Feature / UX

**Summary:**
- **Side Panel:** Users can open ReplyCators as a persistent browser side panel via ⊞ topbar button. `body.rc-sidepanel` CSS class for fluid layout. `sidePanel` permission added.
- **Toast Limit:** `showToast()` enforces max 2 simultaneous toasts (`RC_MAX_TOASTS = 2`).
- **SF v3.2.0 Extract-First UI:** Extract button promoted to top. Source radio replaced by `<select>` dropdown. Detection banner rendered inline. Case Number field hidden in Active Tab mode.

---

## [1.7.0] — 2025-07-15

### Salesforce Case Extractor — v3.1.0

**Type:** Feature / UX

**Summary:** Replaced implicit extraction logic with explicit Source radio selector (`Active Salesforce Tab` / `Search by Case Number`). Default is always Active Tab mode. Case Number field disabled unless Search mode. Selected source persists via `rc:session:sf-settings`.

---

## [1.6.0] — 2025-07-15

### Salesforce Case Extractor — v3.0.0 (Engine Replacement)

**Type:** Refactor / Enhancement

**Summary:** Replaced v2.1.0 `sf-content.js` extraction engine with v0.4.3 from `ReplyCators-salesforce-extractor` standalone project. Clone-based DOM cleanup, multi-strategy record container resolution, parent-case post filtering, diagnostic system. Message protocol (`SF_EXTRACT`/`SF_IS_CASE_PAGE`) unchanged. Status and Priority fields removed from extraction output.

---

## [1.5.2] — 2025-07-14

### Platform — Release-Gate Bug Fixes

**Type:** Bug Fix

**Summary:** Seven defects: `showToast()` bypassed notification master switch (BUG-A), duplicate `DARK_THEMES` constant (BUG-B), unsafe `pluginStates` access (BUG-C), sidebar search non-functional (BUG-D), double-negation logic risk (BUG-E), activity log missing plugin filter options (BUG-F), `#rc-platform-version` badge hardcoded (BUG-G).

---

## [1.5.1] — 2025-07-14

### Platform — QA Defect Remediation

**Type:** Bug Fix

**Summary:** Fixed 15 of 18 defects from Principal QA Assessment. Key fixes: double bootstrap on install, Show Plugin Cards setting, Notification master switch and filters, Error Plugins stat from background registry, theme quick-toggle memory, settingsManager.getAll() stub.

---

## [1.5.0] — 2025-07-14

### Apptio Planning Upgrade Calculator — v1.0.0 (Platform Integration)

**Type:** Feature

**Summary:** Integrated Apptio Planning Upgrade Calculator as native ReplyCators plugin. Dynamic IBM Community schedule retrieval, QA-hardened multi-strategy HTML parser, 24-hour cache, local fallback, three-tab UI (Next Release, Calculator, Schedule), known/unknown upgrade day calculations, Copy Summary and Copy Customer Response actions.

---

## [1.4.0] — 2025-07-04

### Apptio Planning Upgrade Calculator — v2.0.0 (Full Plugin Rewrite)

**Type:** Feature / Enhancement

**Summary:** Full plugin rewrite. 4-tab layout (Next Release, Calculator, Schedule, Maintenance). Known/unknown upgrade day calculation with full Mon–Sun day tables, sandbox/production windows, professional customer response templates, NEW/DATE CHANGED badges.

**Breaking changes:** Storage key `last-result` replaced by `last-calc` (different shape). Plugin-internal only.

---

## [1.3.0] — 2025-07-03

### Platform — Three New Plugins

**Type:** Feature

**Summary:** Added three new plugins: Apptio Planning Upgrade Calculator, Case Timeline Visualizer, and Edge Bookmark Finder. Added `bookmarks` permission.

---

## [1.0.0] — 2025-01-01

### Platform — Initial Release

**Type:** Feature

**Summary:** Initial release of the ReplyCators plugin-based Microsoft Edge Extension platform. Two production plugins (Salesforce Case Extractor, Cloudability OrgID) and one reference template plugin (Example Plugin). Four-layer clean architecture (Core → Platform → SDK → Plugins), TypeScript 5.4, Webpack build, flat-deployment.

---

## [1.0.0] — 2025-01-01 (Governance)

### Project — Versioning Policy and Documentation Governance

**Type:** Governance

**Summary:** Established formal versioning policy (SemVer), documentation policy, change tracking standard, and agent operating rules. Created CHANGELOG.md as the authoritative change history.

---

*End of archive. For recent entries see [CHANGELOG.md](../CHANGELOG.md).*
