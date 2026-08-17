# ReplyCators - Installation Guide

## Sections
- Runtime-First Policy
- Prerequisites
- Quick Start
- Clean-Machine Setup (Execute Feature)
- Building from Source
- Development Workflow
- Permissions
- Usage Guide
- Troubleshooting
- Packaging

---

## Runtime-First Policy

All build tools live at `[current project root folder]\Runtime\NodeJS`. Do NOT run `npm install` inside this repository as a default step. Check Runtime\NodeJS first. See `AGENTS.md` § 13-A.

---

## Prerequisites

- Microsoft Edge (Chromium) 120+
- Node.js 18+ at `[current project root folder]\Runtime\NodeJS` (build only)
- npm 9+ (build only)

---

## Quick Start

Clone the repository and load the extension without building:

```powershell
git clone https://github.com/jnytko/Replycators.git
cd Replycators
```

Then load it in Edge:

1. Open `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the **project root** - the folder containing `manifest.json`
5. ReplyCators icon appears in the toolbar

> Load the project root, not `src/` or `dist/`.

---

## Clean-Machine Setup (Execute Feature)

Required for the Salesforce Case Extractor Execute feature. **Windows only.**

> **Access requirement:** Steps 5-10 require **IBM internal access**. The IBM Bob CLI is only available through IBM internal channels and is not accessible to external contributors. Steps 1-3 (loading the extension) have no access gate and work for anyone.

| # | Step | Command / Location | Verify |
|---|------|--------------------|--------|
| 1 | Install Edge 120+ | https://www.microsoft.com/edge | `edge://version/` |
| 2 | Clone project | `git clone https://github.com/jnytko/Replycators.git` | Root has `manifest.json` |
| 3 | Load extension | `edge://extensions/` - Load unpacked - project root | Icon in toolbar |
| 4 | Install Node.js 18+ | https://nodejs.org | `node --version` |
| 5 | Install IBM Bob CLI | IBM internal channels (IBM employees only) | `bob --version` |
| 6 | Run pre-flight | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check` | All checks show [PASS] |
| 7 | Register auto-start (optional) | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install` | Task Scheduler entry created |
| 8 | Start Bob Helper | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start` | Terminal: `Bob helper listening on http://127.0.0.1:47123` |
| 9 | Set Working Directory | Settings -> Salesforce Case Extractor -> Bob Working Directory - enter the absolute path where Bob runs on this machine (e.g. `C:\Users\<you>\bob-workspace`) | Diagnostics: Bob Working Directory Pass |
| 10 | Validate | Maintenance Center -> Diagnostics -> System Checks | Bob Helper Server and Bob Working Directory both Pass |

> **Note:** The Bob Working Directory (step 9) is machine-specific and is stored in browser storage only. It is never committed to the repository and must be re-entered on every new machine.

**Common first-run failures:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Execute button amber warning | Bob Helper not running | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start` |
| Bob CLI not found on PATH | IBM Bob not installed | Install Bob, add to PATH, restart server |
| Bob Working Directory not configured | Field empty | Settings -> Salesforce Case Extractor -> Bob Working Directory |
| EADDRINUSE port 47123 | Port conflict | Close other terminal or set `REPLYCATORS_BOB_HELPER_PORT` |
| `node` not recognized | Node.js not on PATH | Install Node.js 18+, open new terminal, verify `node --version` |
| Bob terminal opens then closes | Bob error | Check `%TEMP%\replycators-bob-helper\` for prompt file; check Activity Log |

---

## Building from Source

```powershell
# Runtime-First: check Runtime\NodeJS first. Exception path only:
#   npm install      <- delete node_modules/ immediately after
npm run build          # production build -> dist/
npm run build:dev      # development build with source maps
npm run watch          # incremental watch build
npm run typecheck      # type-check only
```

---

## Development Workflow

### Editing root-level files (flat deployment)

| File(s) | Edit for |
|---------|---------|
| `dashboard.html`, `dashboard.js` | UI and feature changes |
| `background.js` | Background service worker |
| `sf-content.js` | Salesforce content script |
| `plugins/cloudability/content/cloudability-detector.js`, `plugins/cloudability/content/cloudability-interceptor.js` | Cloudability content scripts |

After editing:
1. `edge://extensions/` -> click **Reload** on the ReplyCators card
2. Re-open the extension popup

Sync to `dist/` after edits:
```powershell
Copy-Item "dashboard.html" -Destination "dist\dashboard.html" -Force
Copy-Item "dashboard.js"   -Destination "dist\dashboard.js"   -Force
```
Or: `npm run sync`

### Working with TypeScript source

1. Run `npm run watch` in a terminal
2. Load `dist/` in Edge only when validating TypeScript build output
3. Edit `src/` files -> webpack auto-rebuilds
4. Click **Reload** in `edge://extensions/`

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Plugin settings and data persistence |
| `tabs` | Detect Salesforce and Cloudability tabs |
| `tabGroups` | Create and name tab groups (Workspace Starter) |
| `scripting` | Inject content scripts |
| `contextMenus` | Right-click menu actions |
| `alarms` | Scheduled background tasks |
| `bookmarks` | Edge Bookmark Finder |
| `sidePanel` | Side panel mode support |
| `windows` | Enumerate windows for Cloudability tab detection |
| `downloads` | Salesforce case data download |

Host permissions:

| Host | Purpose |
|------|---------|
| `https://*.salesforce.com/*` | Salesforce Case Extractor |
| `https://*.lightning.force.com/*` | Salesforce Case Extractor |
| `https://*.apptio.com/*` | Cloudability OrgID |
| `https://*.apps.papt.to/*` | Cloudability OrgID |
| `https://community.ibm.com/*` | Apptio Planning Upgrade Calculator |
| `https://www.ibm.com/*` | Apptio Documentation Finder |

---

## Usage Guide

### Dashboard
Main popup: Dashboard widgets -> Plugin Manager -> Activity Log -> Notifications -> Diagnostics -> Settings -> Plugin views (sidebar).

### Salesforce Case Extractor
1. Navigate to a Salesforce Case page
2. Open ReplyCators - detection banner shows checkmark if case page detected
3. Click **Extract**
4. Use Copy or Download to export

Extracted fields: case number, subject, account, contact, description, agent description, all feed posts (chronological, classified by type).

### IBM Bob Execute Setup
1. Install IBM Bob and ensure `bob` is on PATH
2. Run pre-flight checks: `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check`
3. Optionally register auto-start: `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install`
4. Start server: `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start`
5. Set Bob Working Directory: Settings -> Salesforce Case Extractor -> Bob Working Directory

### Running the Bob Helper Server

```powershell
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1          # start (default)
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start    # explicit start
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check    # pre-flight checks
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install  # register auto-start
node .\tools\bob-helper-server.js  # direct Node start (advanced / debug use)
```

Server listens on `http://127.0.0.1:47123`. Leave terminal open. Bob Working Directory stored in browser storage - must be re-entered on new machines.

### Cloudability OrgID
- Retrieved automatically when a Cloudability tab is open
- Cached 24 hours
- Manual refresh via **Refresh OrgID** button
- Never erased on failure - always shows last known good value

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Extension won't load | Select the project root (containing `manifest.json`). Check `edge://extensions/` -> Details -> Errors. |
| Salesforce Extractor not working | Must be on a Salesforce Lightning case page (URL: `salesforce.com` or `lightning.force.com`). |
| OrgID shows Retrieving indefinitely | Ensure a Cloudability tab is open and loaded. Click **Refresh OrgID**. Check Activity Log. |
| Console errors in popup | Right-click popup -> Inspect -> Console. Background errors: `edge://extensions/` -> Inspect views: service worker. |
| Execute fails with "Failed to reach Bob helper" | Run `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start` to start the server. |

See `TROUBLESHOOTING.md` for detailed diagnostics.

---

## Packaging

```powershell
npm run package  # creates build/replycators.zip
```

See `PACKAGING.md` for the full packaging and pre-release checklist.
