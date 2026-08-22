# ReplyCators - Startup Flow

## Sections

- Overview
- Boot sequence
- Plugin load order
- Service worker
- Session state restoration

---

## Overview

The ReplyCators extension popup is a single HTML page (`dashboard.html` at root) that loads plugin modules before its orchestrator (`dashboard.js`). On every open, the platform restores all session state from `chrome.storage.local` in a single call, then initializes the full UI.

**Performance rule (v1.20.1+):** Plugin `init()` is synchronous (UI bindings only). All async I/O (tab scans, storage reads) is deferred to `onNavigate()` or `render()`.

---

## Boot sequence

```
Browser opens popup / side panel
  → dashboard.html loads (synchronous)
      → plugins/shared/icon-helper.js          → icon registry + renderer available
      → plugins/notepad.js                     → self-registers on window.ReplyCatorsPlugins
      → plugins/jira-confluence-hub.js         → self-registers
      → plugins/apptio-docs-finder.js          → self-registers
      → plugins/documentation.js              → self-registers
      → plugins/salesforce-case-extractor.js  → self-registers
      → plugins/cloudability-orgid.js          → self-registers
      → plugins/example-plugin.js              → self-registers
      → plugins/bookmark-finder.js             → self-registers
      → plugins/apptio-upgrade-calculator.js   → self-registers
      → plugins/snake.js                       → self-registers
      → plugins/workspace-starter.js           → self-registers
      → plugins/tab-search.js                  → self-registers
      → plugins/env-dashboards.js              → self-registers
      → plugins/marketplace.js                 → self-registers
      → plugins/backup-restore.js              → self-registers
      → dashboard.js                           → DOMContentLoaded handler runs
          → restoreSession()                   (single chrome.storage.local.get for ALL keys)
          → applyAllSettings()                 (theme, font, density, accessibility)
          → initTheme()                        (binds sidebar toggle button)
          → applyPluginVisibility()            (injects nav items; updateStats() called here)
          → applyDashboardOrder()              (reorders widget cards + nav buttons)
          → _safeInit calls (each synchronous - bind UI only, no async I/O):
              SalesforceCaseExtractor.init()   (wires widget button only - no tab I/O)
              CloudabilityOrgId.init()         (binds UI buttons only - no tab scan)
              ExamplePlugin.init()
              EdgeBookmarkFinder.init()        (wires widget)
              ApptioUpgradeCalculator.init()   (wires widget; migration check deferred)
              Snake.init()                     (loads high score; wires widget)
              WorkspaceStarter.init()          (loads profiles async; updates widget)
              TabSearch.init()                 (wires widget)
              Notepad.init()
              JiraConfluenceHub.init()
              ApptioDocsFinder.init()
              EnvDashboards.init()
              BackupRestore.init()
              Marketplace.render()             (populates marketplace cards - synchronous)
          → initSettings() / syncSettingsUI()  (binds settings controls)
          → initActivityView()                 (binds activity log controls)
          → updateNotifBadge()                 (restores unread badge count)
          → navigateTo(lastView)               (resumes last active view)
                if view = plugin-salesforce:   sfRefreshDetectionBanner() + tab listeners
                if view = plugin-cld-orgid:    CloudabilityOrgId.onNavigate() + tab scan
          → Startup log entry written
          → Extension is ready
          → (deferred - setTimeout(0))
              RC_GET_REGISTRY background message (updates error plugin count in stats)
              ApptioUpgradeCalculator migration check
```

**Ordering contract:** `applyPluginVisibility()` MUST run before `applyDashboardOrder()`. `applyPluginVisibility()` creates the nav buttons; `applyDashboardOrder()` re-orders them. Reversing this order silently discards the saved nav order.

**Init pattern:** Each plugin is initialized via `_safeInit('PluginKey', () => ...)` directly in the `DOMContentLoaded` block. There is no `initPlugins()` wrapper function.

---

## Plugin load order

Plugin scripts must be loaded **before** `dashboard.js` in `dashboard.html`. This is architecture-critical - `dashboard.js` calls plugin `init()` during `DOMContentLoaded`, and plugin objects must already be on `window.ReplyCatorsPlugins` at that point.

Current load order in `dashboard.html`:
```html
<script src="plugins/shared/icon-helper.js"></script>
<script src="plugins/notepad.js"></script>
<script src="plugins/jira-confluence-hub.js"></script>
<script src="plugins/apptio-docs-finder.js"></script>
<script src="plugins/documentation.js"></script>
<script src="plugins/salesforce-case-extractor.js"></script>
<script src="plugins/cloudability-orgid.js"></script>
<script src="plugins/example-plugin.js"></script>
<script src="plugins/bookmark-finder.js"></script>
<script src="plugins/apptio-upgrade-calculator.js"></script>
<script src="plugins/snake.js"></script>
<script src="plugins/workspace-starter.js"></script>
<script src="plugins/tab-search.js"></script>
<script src="plugins/env-dashboards.js"></script>
<script src="plugins/marketplace.js"></script>
<script src="plugins/backup-restore.js"></script>
<script src="dashboard.js"></script>
```

---

## Service worker

`background.js` is loaded independently by the browser when the extension is installed or the browser starts. It is not part of the popup boot sequence. It handles:

- Bidirectional launch-mode switching (Side Panel / Popup)
- `RC_OPEN_POPUP` message from the Side Panel "Return to Popup" button
- Cloudability background alarm refresh (30-minute interval)
- Content script injection coordination

---

## Session state restoration

`restoreSession()` performs a **single** `chrome.storage.local.get` call for all `RC_STORE` keys, then populates all in-memory stores:

- Logs merged and deduplicated by entry ID
- Notifications merged and deduplicated by entry ID
- Last Salesforce result staged for UI restoration
- Plugin states loaded and defaults applied for any new plugin
- Dashboard order loaded and normalized (missing plugins appended)
- App settings merged over `DEFAULT_SETTINGS`

After `restoreSession()`, all init functions run with pre-populated in-memory state.
