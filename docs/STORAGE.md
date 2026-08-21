# ReplyCators - Storage Architecture

## Sections

- Overview
- Storage namespace map
- Session keys
- Plugin keys
- Unified cache registry
- Platform settings object
- Lifecycle and data retention
- Governance rules

---

## Overview

All persistent state lives in `chrome.storage.local`. No external database, no server, no sync layer (with the exception of `rc:settings:<id>:*` reserved for future cross-device use).

---

## Storage namespace map

| Namespace | Area | Owner | Purpose |
|---|---|---|---|
| `rc:session:*` | local | `dashboard.js` | Dashboard session state: logs, notifications, last-view, SF result |
| `rc:platform:*` | local | `dashboard.js` | Platform-level state |
| `rc:plugin:<id>:*` | local | Plugin modules | Plugin-specific persistent data |
| `rc:settings:<id>:*` | sync | Platform / SDK | Plugin settings - reserved for future sync use |

---

## Session keys (rc:session:*)

Managed exclusively by `dashboard.js`.

| Key | Type | Max entries | Content |
|---|---|---|---|
| `rc:session:logs` | array | 500 | Activity log entries `{ id, level, pluginId, message, timestamp }` |
| `rc:session:notifications` | array | 100 | Notification history `{ id, title, message, type, pluginId, timestamp, read }` |
| `rc:session:sf-last-result` | object | 1 | Last SF extraction `{ rawText, caseNumber, accountName, posts, extractedAt }` |
| `rc:session:nav-view` | string | 1 | Last active view ID |
| `rc:session:sf-settings` | object | 1 | SF plugin settings `{ outputFormat, postSort, autoFill, source, privacyMode, bobWorkingDir, bobApiKey, bobUseBob1, inclInternal, inclJiraEtl, inclDiag, diagnosticMode }` |
| `rc:session:plugin-states` | object | 1 | Plugin enabled/disabled map `{ [pluginId]: { enabled } }` |
| `rc:session:app-settings` | object | 1 | All platform settings |
| `rc:session:dashboard-order` | array | 1 | Ordered list of plugin IDs |
| `rc:session:plugins-section-collapsed` | boolean | 1 | Plugins sidebar section collapsed state (default: `false`) |

Backup & Restore never exports `rc:session:logs`, `rc:session:notifications`, `rc:session:nav-view`, or `rc:session:sidebar-width` - these are transient session-only keys.

---

## Plugin keys (rc:plugin:<id>:*)

### Salesforce Case Extractor

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.salesforce-extractor:prompts` | `PromptEntry[]` - user's prompt library |
| `rc:plugin:com.replycators.salesforce-extractor:prompts-seeded` | `boolean` - true once default prompts seeded |
| `rc:plugin:com.replycators.salesforce-extractor:last-download` | `{ filename, fullPath, downloadId, state, downloadedAt, retryCount }` |
| `rc:plugin:com.replycators.salesforce-extractor:selected-prompt` | `string` - last selected prompt ID |
| `rc:plugin:com.replycators.salesforce-extractor:context-file` | `string` - last used context file path |
| `rc:plugin:com.replycators.salesforce-extractor:additional-instructions` | `string` - last additional instructions text |

### Cloudability OrgID

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.cloudability-orgid:orgid-cache` | `{ orgId, orgName, retrievedAt, originDomain }` - 24h TTL cache |

### Apptio Planning Upgrade Calculator

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache` | `{ releases, lastUpdated, source }` - IBM Community schedule, 24h TTL |
| `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc` | `{ version, upgradeDay, tab }` - user's last selections |

### Edge Bookmark Finder

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.edge-bookmark-finder:prefs` | User preferences (search options, view mode) |
| `rc:plugin:com.replycators.edge-bookmark-finder:last-scan` | Last bookmark scan result |

### Snake

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.snake:state` | `{ highScore }` |

### Quick Note Pad

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.notepad:notes` | `NoteEntry[]` - up to 5 notes `{ id, title, body, updatedAt }` |
| `rc:plugin:com.replycators.notepad:state` | `{ activeId, monoMode }` - active tab ID and monospace toggle |

### Jira & Confluence Smart Search Hub

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.jira-confluence-hub:settings` | `{ jiraBase, confluenceBase, recentLimit, openIn }` |
| `rc:plugin:com.replycators.jira-confluence-hub:jira-recents` | `{ type, label, url, ts }[]` - max `recentLimit` (default 10) |
| `rc:plugin:com.replycators.jira-confluence-hub:confluence-recents` | `{ type, label, url, ts }[]` - max `recentLimit` (default 10) |

### Environment Dashboards Launcher

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.env-dashboards:state` | `{ lastEnv: string\|null, favorites: string[], recents: string[] }` - `lastEnv` is actively used for auto-selection on load; `favorites` and `recents` are persisted but not yet surfaced in the UI (planned) |

### Workspace Starter

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.workspace-starter:data` | `{ profiles, lastLaunched, recents }` - composite key |

### Tab Search

Tab Search uses no persistent storage. All data is live-queried from `chrome.tabs.query()`.

### Apptio Documentation Finder

| Key | Content |
|---|---|
| `rc:plugin:com.replycators.apptio-docs-finder:sources` | `{ id, domain, label, scope, hint, url }[]` - IBM Docs product source list |
| `rc:plugin:com.replycators.apptio-docs-finder:quick-links` | `{ label, url, group }[]` - quick-access chips per domain |
| `rc:plugin:com.replycators.apptio-docs-finder:recent-searches` | `{ query, domain, category, url, at }[]` - last 20 searches |
| `rc:plugin:com.replycators.apptio-docs-finder:recently-opened` | `{ label, url, domain, openedAt }[]` - last 30 opened pages |
| `rc:plugin:com.replycators.apptio-docs-finder:favorites` | `{ label, url, domain, savedAt }[]` - up to 50 saved items |
| `rc:plugin:com.replycators.apptio-docs-finder:settings` | `{ openInNewTab, saveSearchHistory, saveOpenHistory }` - defaults all `true` |
| `rc:plugin:com.replycators.apptio-docs-finder:last-refresh` | ISO timestamp of last successful IBM Docs API refresh |
| `rc:plugin:com.replycators.apptio-docs-finder:diag` | `{ at, success, httpStatus, responseBytes, totalProducts, matchedProducts, errorPhase, errorDetail }` |

**Legacy migration:** On first load, migrates `adn_sources`, `adn_quicklinks`, `adn_recent`, `adn_opened`, `adn_favorites`, `adn_settings`, `adn_last_refresh`, `adn_diag` to the `rc:plugin:com.replycators.apptio-docs-finder:*` namespace. Legacy keys removed after migration. Migration is idempotent.

---

## Unified cache registry

`dashboard.js` maintains an explicit cache registry for diagnostic inspection and safe cache lifecycle actions. The registry is metadata-only.

### Registered caches

| Cache ID | Owner | Storage key(s) | TTL | Sensitivity |
|---|---|---|---|---|
| `cloudability-orgid-cache` | Cloudability OrgID | `rc:plugin:com.replycators.cloudability-orgid:orgid-cache` | 24h | Internal identifier |
| `apptio-planning-schedule-cache` | Apptio Planning Upgrade Calculator | `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache` | 24h | Product metadata |
| `apptio-docs-sources-cache` | Apptio Documentation Finder | `sources`, `quick-links`, `last-refresh`, `diag` | 24h | Document metadata |
| `salesforce-last-result-cache` | Salesforce Case Extractor | `rc:session:sf-last-result` | Non-expiring | Customer case data |
| `bookmark-scan-cache` | Edge Bookmark Finder | `rc:plugin:com.replycators.edge-bookmark-finder:last-scan` | Non-expiring | Browsing-derived metadata |

### Cache contract

Each registered cache provides:
- Stable cache ID, owning plugin ID and display name
- Storage area and key mapping, schema version
- TTL (or non-expiring marker), timestamp reader normalized to epoch milliseconds
- Validation function, sensitivity classification
- Refresh hook (if supported), clear hook (if supported)

### TTL rules

- Timestamps less than `1e12` are treated as seconds and converted to milliseconds
- Status values: `Fresh`, `Aging`, `Expired`, `Missing`, `Invalid`, `Refreshing`, `Refresh Failed`, `Clear Failed`, `Unknown`
- `Aging` reported when a cache is at or above 75% of its TTL
- Non-expiring caches are validated and size-reported but not TTL-expired automatically

### Protected categories

Cache clear actions are scoped to registered cache keys only. They do NOT remove:
- Platform settings, plugin settings, user-created prompt libraries
- Favorites, recent history, workspace profiles, or other user-authored content

---

## Platform settings object

Stored at `rc:session:app-settings`. Defaults in `DEFAULT_SETTINGS` in `dashboard.js`.

| Setting | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `ibm-blue` | Active colour theme |
| `font` | string | `system` | Font family |
| `density` | string | `comfortable` | UI density (`compact`, `comfortable`, `spacious`) |
| `largerFont` | boolean | `false` | Larger base font size |
| `reducedAnimations` | boolean | `false` | Disable transitions |
| `highContrast` | boolean | `false` | High contrast rendering |
| `enhancedFocus` | boolean | `false` | Prominent focus rings |
| `notifEnabled` | boolean | `true` | Master notification switch |
| `notifSuccess/Warning/Error/Info` | boolean | `true` | Per-type notification switches |
| `notifDuration` | number | `4000` | Toast display duration (ms) |
| `notifPosition` | string | `bottom-right` | Toast anchor position |
| `dashShowCards` | boolean | `true` | Show plugin widget cards on Dashboard |
| `dashCompact` | boolean | `false` | Compact dashboard spacing |
| `dashRememberLast` | boolean | `true` | Reopen to last view |
| `logLevel` | string | `normal` | Log filtering (`normal`, `verbose`, `debug`) |
| `defaultLaunchMode` | string | `popup` | Default open mode (`popup`, `sidepanel`) |
| `snakeSpeed` | string | `classic` | Snake game speed |

---

## Lifecycle and data retention

| Data | Written | Cleared |
|---|---|---|
| Logs | Every `addLog()` call (debounced 300 ms) | Explicit Clear button; oldest dropped at 500-entry cap |
| Notifications | Every `addNotification()` call (debounced 300 ms) | Oldest dropped at 100-entry cap |
| SF result | On successful extraction | Explicit Clear button in SF plugin view |
| Nav view | Every `navigateTo()` call | Never cleared |
| SF settings | Every settings change | Never cleared |
| Plugin states | Every enable/disable toggle | Never cleared |
| App settings | Every settings change | Defaults applied on new install |
| Dashboard order | Every Move Up/Down in Plugin Manager | Normalized on startup |

---

## Governance rules

1. **Storage keys are permanent.** Renaming or removing a key is a MAJOR breaking change and requires an explicit data migration.
2. **Plugins may only write to their own namespace** (`rc:plugin:<their-id>:*`). Cross-plugin storage access is forbidden.
3. **No plugin may write to `rc:session:*`** - these keys are platform-owned and managed exclusively by `dashboard.js`.
4. **5 MB quota** - `chrome.storage.local` has a shared 5 MB limit for the entire extension.
5. See `docs/STORAGE-MIGRATION-ROADMAP.md` for the planned namespace consolidation.
