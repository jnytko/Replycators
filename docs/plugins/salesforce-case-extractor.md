# Salesforce Case Extractor - Plugin Documentation

## Sections
- Overview
- Bob Execute Prerequisites
- Permissions
- Content Script
- Fields Extracted
- Storage
- Settings
- Source Mode
- Prompt System
- Startup Behavior
- Message Protocol
- Public API
- Ownership Boundaries
- Known Limitations

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.salesforce-extractor` |
| Version | 4.12.2 |
| Category | CRM |
| Status | Active |

Extracts structured case data from open Salesforce Lightning pages. Designed for support engineers needing to quickly copy case data into replies, tickets, or internal notes.

---

## Bob Execute Prerequisites

**Windows only.** Execute uses `powershell.exe` and requires IBM Bob on PATH.

**Setup:**
```powershell
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check    # validate all prerequisites
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start    # start server
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install  # register auto-start at login
```

Server listens on `http://127.0.0.1:47123`.

**Execution path:**
```
Execute button -> RC_EXECUTE_BOB message -> background.js
  -> HTTP POST -> tools/bob-helper-server.js:47123
    -> powershell.exe -> IBM Bob (new terminal window)
```

For failures, see `TROUBLESHOOTING.md` - IBM Bob Execute Feature section.

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Detect and query active Salesforce tabs |
| `scripting` | Inject content script on demand |
| `activeTab` | Access currently active tab |
| `host: *.salesforce.com/*` | Extract from Salesforce Classic/Lightning |
| `host: *.lightning.force.com/*` | Extract from Lightning Experience |

---

## Content Script

`plugins/salesforce/content/sf-content.js` injected into Salesforce tabs (ISOLATED world):
- Auto-injected via `manifest.json` `content_scripts` at `document_idle`
- Also injected on demand via `chrome.scripting.executeScript({ files: ['plugins/salesforce/content/sf-content.js'] })`
- Idempotency guard: `window.__rcSfExtractorInstalled`
- Canonical source: `plugins/salesforce/content/sf-content.js`

---

## Fields Extracted

| Field | Notes |
|-------|-------|
| Case Number | URL pattern, page title, DOM field label |
| Subject | Cleaned of Lightning DOM contamination |
| Account Name | Cleaned of trailing action words |
| Contact Name | Cleaned |
| Description | Deduplication removes mirrored header fields and action-only lines |
| Agent Description | Internal notes field |
| Feed Posts | All customer and internal posts, chronological order |

Not extracted (removed v3.0.0): Status, Priority.

---

## Storage

### Platform-managed (owned by `dashboard.js`)
| Key | Content |
|-----|---------|
| `rc:session:sf-last-result` | `{ rawText, caseNumber, accountName, posts, extractedAt }` |
| `rc:session:sf-settings` | `{ outputFormat, postSort, autoFill, source, privacyMode, bobWorkingDir, bobApiKey, bobUseBob1, inclInternal, inclJiraEtl, inclDiag, diagnosticMode }` |

### Plugin-owned (owned by plugin module)
| Key | Content |
|-----|---------|
| `rc:plugin:com.replycators.salesforce-extractor:prompts` | `PromptEntry[]` - prompt library |
| `rc:plugin:com.replycators.salesforce-extractor:prompts-seeded` | `boolean` - defaults seeded flag |
| `rc:plugin:com.replycators.salesforce-extractor:last-download` | `{ filename, fullPath, downloadId, state, downloadedAt }` |
| `rc:plugin:com.replycators.salesforce-extractor:selected-prompt` | `string` - last selected prompt ID |
| `rc:plugin:com.replycators.salesforce-extractor:context-file` | `string` - last context file path |
| `rc:plugin:com.replycators.salesforce-extractor:additional-instructions` | `string` - last additional instructions |

---

## Settings

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Output Format | plain-text, markdown, json | plain-text | Format of extracted summary |
| Sort Posts | ascending, descending | ascending | Display order of extracted case feed posts |
| Auto-fill Case Number | on/off | on | Detects case number from active tab |
| Bob Working Directory | text | _(empty)_ | Absolute path for `bob` execution. Execute disabled until configured. |
| Diagnostic Mode | on/off | off | Bob terminal stays open showing resolved paths, exit code, and timing. |

---

## Source Mode

| Mode | Behavior |
|------|---------|
| Active Salesforce Tab | Extracts from currently focused Salesforce case tab |
| Search by Case Number | Searches all open Salesforce tabs for a specified case number |

---

## Prompt System

Every prompt uses a single unified execution panel:
- Scrollable prompt selection list
- 0-6 file attachments (any format)
- Additional Requests free-text area
- Execute button

**Prompt schema:** `id`, `title`, `body`, `isDefault`, `createdAt`, `updatedAt`

**Default prompts:**
| ID | Title |
|----|-------|
| `prompt-default-understand` | Understand Case |
| `prompt-default-research` | Research Case |

Default prompts cannot be deleted. Custom prompts: add, edit, delete, duplicate, reorder. Library tab has independent attachment state from Extract tab.

---

## Startup Behavior

1. `init()` - restores SF settings and last extraction result, wires controls. No async I/O.
2. First `onNavigate()` - calls `registerTabListeners()` (idempotent), then runs detection flow.
3. `registerTabListeners()` attaches `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` for auto-detection.

---

## Message Protocol

```
Dashboard -> Content Script:
{ type: 'SF_IS_CASE_PAGE', pluginId: 'com.replycators.salesforce-extractor' }
<- { isCasePage: boolean }

{ type: 'SF_EXTRACT', pluginId: '...', payload: { caseNumber: string } }
<- { result, data: { caseNumber, accountName, contactName, subject,
                     description, agentDescription,
                     posts: [{ author, timestamp, content, type }] } }
```

---

## Public API

```js
window.ReplyCatorsPlugins.SalesforceCaseExtractor = {
  id,          // plugin ID string
  init,        // called once at startup: init(restoredResult, restoredSettings, restoredV4)
  onNavigate,  // called when user navigates to plugin view
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Tab detection (when view open) | Plugin (`sfRefreshDetectionBanner`) |
| Tab monitoring | Plugin (`registerTabListeners`) |
| Content script injection | Plugin (`safeInject`) |
| Output rendering | Plugin |
| Result persistence | `dashboard.js` - `persistSfResult()` |
| Settings persistence | `dashboard.js` - `persistSfSettings()` |
| Prompt library | Plugin (`initSfPrompts`) |
| Download history | Plugin (`initSfDownloadInfo`) |

---

## Known Limitations

- Content scripts are plain JS IIFEs - no TypeScript imports.
- Extraction depends on Salesforce page fully loading before extracting.
