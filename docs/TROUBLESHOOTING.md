# ReplyCators - Troubleshooting Guide

## Sections
- Extension Loading
- Plugin View Issues
- Salesforce Case Extractor
- IBM Bob Execute Feature
- Cloudability OrgID
- Apptio Documentation Finder
- Apptio Planning Upgrade Calculator
- Edge Bookmark Finder
- Workspace Starter
- Tab Search
- Snake
- Backup and Restore
- General Issues
- Diagnostics
- Send Feedback

---

## Extension Loading

| Symptom | Fix |
|---------|-----|
| Extension shows error at `edge://extensions/` | Reload: toggle off -> toggle on. Verify `manifest.json` is valid JSON. |
| Extension crashes on load | Check DevTools console (F12) in popup for JS errors. |
| Load fails with directory error | Ensure no `__`-prefixed directory exists in the repo (see `AGENTS.md` § 25). |

---

## Plugin View Issues

| Symptom | Check |
|---------|-------|
| View is blank | Plugin enabled in Plugin Manager? Plugin script loaded before `dashboard.js`? |
| View container missing | Does `id="view-plugin-<name>"` exist in `dashboard.html`? |
| JS errors on navigate | Check popup DevTools console for plugin-specific errors. |

---

## Salesforce Case Extractor

### Extract button stays disabled
- Navigate to a Salesforce Case page (URL: `/lightning/r/Case/`)
- Open the Salesforce Case Extractor view at least once per session - this registers tab listeners
- Ensure tab URL matches `*.salesforce.com/*` or `*.lightning.force.com/*`

### Extraction returns empty or garbled text
- Reload the Salesforce tab
- Try **Search by Case Number** mode in the Source dropdown
- Check Activity log for extraction errors

### Content script not injecting
- Verify `https://*.salesforce.com/*` and `https://*.lightning.force.com/*` are granted under `edge://extensions/` -> site permissions

### Execute button shows "Bob Working Directory is not configured"
- Settings -> Salesforce Case Extractor -> Bob Working Directory
- Enter the absolute path where `bob` runs (e.g. `C:\Work\Bob`)
- Execute remains disabled until a non-empty valid path is configured

---

## IBM Bob Execute Feature

### Prerequisites checklist (new machine)

| Prerequisite | Verify |
|-------------|--------|
| Node.js 18+ on PATH | `node --version` |
| IBM Bob CLI on PATH | `bob --version` |
| Bob Helper server running | `curl http://127.0.0.1:47123/health` returns `{"ok":true}` |
| Bob Working Directory set | Diagnostics -> System Checks -> CHECK-06 Pass |

Run the pre-flight checker first, then start the server:

```powershell
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start
```

Verify the server is up: `curl http://127.0.0.1:47123/health`

### Execute fails with "Failed to reach Bob helper"

1. Start the server:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start
   ```
2. Leave the terminal open - the server must remain running.
3. Check **Maintenance Center -> Diagnostics -> System Checks**:
   - **Pass** - ready to use Execute
   - **Warn: Server running, Bob not on PATH** - install IBM Bob, add to PATH, restart server
   - **Warn: Not running** - run `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start`

### IBM Bob not installed or not on PATH

1. Install IBM Bob from IBM internal tooling channels. Add `bob.ps1` directory to system PATH.
2. Verify: `bob --version` in a new terminal
3. Restart the Bob Helper server (CLI path re-resolves within 60 seconds of a new install)

### Execute always fails silently (no error, no terminal window)

This symptom is caused by a restrictive PowerShell execution policy. Check whether `REPLYCATORS_PS_EXEC_POLICY` is set in your environment:

```powershell
echo $env:REPLYCATORS_PS_EXEC_POLICY
```

If set to `AllSigned` or `Restricted`, the launcher script (`bob-launcher-template.ps1`) is blocked because it is unsigned. Fix options:

- Remove or unset `REPLYCATORS_PS_EXEC_POLICY` (server defaults to `Bypass`)
- Set it explicitly to `Bypass` before starting the server: `$env:REPLYCATORS_PS_EXEC_POLICY = "Bypass"`
- If a GPO enforces the policy, work with your IT administrator to add an execution policy exception for the launcher path

### GPO execution policy blocks Execute silently

If your organisation enforces a Group Policy Object (GPO) that sets the PowerShell execution policy to `AllSigned` or `Restricted`, the unsigned launcher script (`bob-launcher-template.ps1`) is blocked and every Execute request fails silently.

Run the pre-flight checker to detect this at setup time:

```powershell
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check
```

CHECK 6 and CHECK 6b will report FAIL with an actionable remediation message. If a GPO is enforcing the policy you cannot override it directly - contact your IT administrator for an execution policy exception on the launcher path.

### Debug logging

```powershell
$env:REPLYCATORS_BOB_HELPER_DEBUG = "1"
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start
```

For advanced / direct start without the management script:
```powershell
$env:REPLYCATORS_BOB_HELPER_DEBUG = "1"
node .\tools\bob-helper-server.js
```

---

## Cloudability OrgID

| Symptom | Fix |
|---------|-----|
| "No active Cloudability tab detected" | Switch to a tab matching `*.apptio.com/cloudability*` or `*.apps.papt.to/cloudability*`, then click Refresh OrgID. |
| Stale OrgID from previous session | Click Refresh OrgID while a Cloudability tab is active. |
| Refresh times out | Navigate to Settings in Cloudability, then click Refresh OrgID - interceptor fires on next API call. |

Note: OrgID is never erased on failed refresh - extension always shows last known good value.

---

## Apptio Documentation Finder

| Symptom | Fix |
|---------|-----|
| No categories in dropdown | Index tab -> click Refresh Sources from IBM Docs. Requires internet (`ibm.com/docs/api/v1/products`). |
| "First run setup" appears every open | Internet unavailable during initial refresh. Click Retry. |
| Search opens generic IBM Docs page | Select a Domain button and Category before searching. Check URL Preview. |
| Save to Favorites has no effect | Enter a search query before clicking Save. |
| "No quick links for this domain" | Refresh sources from IBM Docs (Index tab or Sources overlay). |
| History not recording | Settings -> Apptio Documentation Finder -> enable Save search history / Save opened history. |

---

## Apptio Planning Upgrade Calculator

| Symptom | Fix |
|---------|-----|
| "Using local fallback" | Check internet. Click Refresh to retry live fetch. Local fallback has a known-good schedule. |
| Wrong date calculation | Verify version and day-of-week selection. Use "Unknown upgrade day" for a full 7-day window. |

---

## Edge Bookmark Finder

| Symptom | Fix |
|---------|-----|
| "Scanning..." stuck forever | Verify `bookmarks` permission in `manifest.json`. Reload extension. Check Activity log. |

---

## Workspace Starter

| Symptom | Fix |
|---------|-----|
| Profiles empty after reopen | Check Activity log for storage errors. Check Diagnostics for storage usage. Re-import from export if needed. |

---

## Tab Search

| Symptom | Fix |
|---------|-----|
| Tab list outdated | Click **Refresh** in Tab Search. Tab list is a point-in-time snapshot at render. |

---

## Snake

| Symptom | Fix |
|---------|-----|
| Game freezes or acts erratically | Navigate away and back. `onLeave`/`onNavigate` hooks restart the game loop cleanly. |
| High score not saving | Check Diagnostics -> Storage usage. 5 MB quota may be full. |

---

## Backup and Restore

| Symptom | Fix |
|---------|-----|
| Export button does nothing | Check Activity log for export errors. Verify browser allows extension downloads. |
| "Select at least one plugin" warning | Check a plugin checkbox, or switch to Full export (all plugins). |
| "Not a ReplyCators backup file" | Only import files downloaded from ReplyCators Backup & Restore view. File must contain `"_format": "replycators-backup"`. |
| "Backup was created by a newer version" | Upgrade ReplyCators before importing. |
| Settings not restored after import | Check Activity log for `Import apply failed` entries. If rollback also failed, re-export from working state. |
| Reload prompt after import | Platform settings restored. Click Reload Now, or close and reopen extension. |
| Workspace profiles gone after import | Import used Replace strategy. Re-import newer backup or recreate manually. Use Keep existing strategy next time. |

---

## General Issues

| Symptom | Fix |
|---------|-----|
| Settings not saving | DevTools console - look for `chrome.storage.local.set` errors. Check Diagnostics -> Storage usage (must be under 5 MB). |
| Notifications not appearing | Settings -> Notifications -> Enable Notifications on. Check per-type toggles. Check browser extension notification permissions. |
| Side Panel vs Popup behaves differently | Both load the same `dashboard.html`. Behavioral differences are bugs - report via Activity log or feedback. |

---

## Diagnostics

Navigate to **Maintenance Center -> Diagnostics** for a live snapshot:
- Platform version and browser info
- Plugin count and status
- Storage usage
- Activity log summary
- Bob Helper Server and Bob Working Directory check results

---

## Send Feedback

Navigate to **Send Feedback** in the Utility sidebar section.

Recipients: `Jakub.Nytko@ibm.com`, `Marcin.Jorasz@ibm.com`

Notes:
- ReplyCators opens the default email app via `mailto:` - it does not send directly.
- Review draft, attach files manually, send from email app.
- Use **Download Diagnostics** to generate a diagnostics file (never attached automatically).

If email app cannot open:
- Use **Copy Email Addresses** to get: `Jakub.Nytko@ibm.com`, `Marcin.Jorasz@ibm.com`
- Use **Copy Subject** and **Copy Feedback** separately.
- Create email manually and attach diagnostics file.
