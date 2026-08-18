# Bob Helper Server - Technical Reference

## Sections
- Overview
- Key Properties
- Architecture
- HTTP API
- Environment Variables
- Execution Flow
- Process Management Model
- Extension Messaging Protocol
- Setup and Management
- Security

---

## Overview

Local Node.js HTTP service that bridges the ReplyCators Edge extension and IBM Bob (IBM AI CLI tool). MV3 extensions cannot spawn native processes - this server runs outside the browser sandbox.

- Introduced: v1.22.1 (replaces native messaging bridge removed in TD-018)
- PowerShell migration: v1.42.2 (cmd.exe fully replaced)
- Component: `tools/bob-helper-server.js`

**Execution flow:**
1. Salesforce Case Extractor Execute button clicked
2. Prompt assembled and relayed: popup -> background service worker -> HTTP POST
3. Server writes prompt to temp file, spawns launcher template directly
4. IBM Bob spawned in a new visible PowerShell terminal window

---

## Key Properties

| Property | Value |
|----------|-------|
| Bind address | `127.0.0.1:47123` (loopback only) |
| Protocol | HTTP/1.1 - JSON request / JSON response |
| Lifecycle | Manual start per session - not auto-launched |
| State model | In-memory status cache (120s TTL) for terminal execution states |
| Execution engine | PowerShell only (`powershell.exe`) |
| Launcher template | `tools/bob-launcher-template.ps1` |
| npm dependencies | None - Node.js built-ins only |

---

## Architecture

- Extension popup sends `RC_EXECUTE_BOB` message to `background.js`
- `background.js` POSTs to `http://127.0.0.1:47123/execute`
- Server validates working directory, writes all artifact files to `%TEMP%\replycators-bob-helper\` regardless of whether a working directory is configured
- Server spawns `powershell.exe` pointing directly at `tools/bob-launcher-template.ps1` - no per-request copy is made; all request-specific data is passed via environment variables
- PowerShell executes Bob with the prompt held in memory; `workingDir` is used only as `Set-Location` context and `--include-directories` argument

---

## HTTP API

### POST /execute
Executes IBM Bob with the provided prompt.

Request:
```json
{
  "prompt": "string",
  "workingDir": "C:\\path\\to\\bob",
  "requestId": "string",
  "diagnosticMode": false
}
```

Response (success):
```json
{
  "ok": true,
  "requestId": "helper-1234567890",
  "helperPid": 12345,
  "childPid": 67890,
  "bobCommand": "C:\\...\\bob.ps1",
  "promptPath": "C:\\...\\helper-1234567890.txt",
  "workingDir": "C:\\path\\to\\bob"
}
```

Response (error):
```json
{ "ok": false, "error": "description", "requestId": "helper-1234567890" }
```

### GET /cli-check
Health check. Returns Node.js version, Bob CLI availability, and working directory validation.

Query param: `?dir=<workingDir>` - validates the specified directory.

Response:
```json
{
  "ok": true,
  "bobFound": true,
  "bobBasename": "bob.ps1",
  "bobVersion": "1.2.3",
  "nodeFound": true,
  "nodeBasename": "node.exe",
  "nodeVersion": "20.0.0",
  "execPolicy": "Bypass",
  "bobInstallInstruction": null,
  "dirOk": true,
  "dirError": null
}
```

### GET /health
Simple liveness probe.

Response:
```json
{
  "ok": true,
  "ready": true,
  "bobCommand": "C:\\...\\bob.ps1",
  "pid": 12345,
  "port": 47123,
  "tempRoot": "C:\\...\\replycators-bob-helper",
  "execPolicy": "Bypass"
}
```

`ready: false` means the server is running but `bob.ps1` is not on PATH. The extension diagnostics panel distinguishes this state.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REPLYCATORS_BOB_HELPER_PORT` | `47123` | Port the HTTP server listens on. If changed, update `BOB_HELPER_PORT` in `background.js` to match. |
| `REPLYCATORS_BOB_HELPER_DEBUG` | *(unset)* | Set to `1` to enable structured debug logging to stdout. |
| `REPLYCATORS_PS_EXEC_POLICY` | `Bypass` | Execution policy passed to `powershell.exe` spawn. |

**WARNING - `REPLYCATORS_PS_EXEC_POLICY`:** Setting this variable to `AllSigned` or `Restricted` causes all Execute requests to fail silently. Bob's launcher script (`bob-launcher-template.ps1`) is unsigned. If an admin GPO or shell profile sets a restrictive policy, override it explicitly for the helper process or exclude the launcher path via policy. See the Troubleshooting guide for diagnosis steps.

---

## Execution Flow

End-to-end flow from Execute button click to Bob terminal window:

1. User clicks **Execute** in the Salesforce Case Extractor view
2. Plugin performs a fresh `RC_BOB_HEALTH` probe - confirms server is up and Bob is on PATH
3. Plugin assembles the full prompt (case data + selected prompt template + additional instructions)
4. Plugin sends `RC_EXECUTE_BOB` message to `background.js` via `chrome.runtime.sendMessage`
5. `background.js` POSTs `{ prompt, workingDir, requestId, diagnosticMode }` to `http://127.0.0.1:47123/execute`
6. Server validates `workingDir` (must exist, absolute, no `%` or `"`, no `..` segments)
7. Server resolves `bob.ps1` path via `where.exe` (cached 60 seconds)
8. Server writes the prompt text to `%TEMP%\replycators-bob-helper\<requestId>.txt` (UTF-8, always in system temp regardless of working directory setting)
9. Server spawns `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/bob-launcher-template.ps1` with env vars injected: `RC_BOB_COMMAND`, `RC_PROMPT_FILE`, `RC_WORKING_DIR`, `RC_INCLUDE_DIR`, `RC_DIAG_MODE`, `RC_STATUS_FILE`
10. PowerShell process is detached (`stdio: 'ignore'`, `child.unref()`) - fire-and-forget
11. Server immediately returns `{ ok: true, requestId, childPid, ... }` to the extension
12. PowerShell launcher reads prompt into memory, deletes the `.txt` immediately, then invokes Bob
13. IBM Bob runs in the terminal window and displays its response
14. Server deletes `.status.json` ~20 seconds after reading a terminal state from disk (deferred server-side cleanup)

---

## Process Management Model

The helper uses a **fire-and-forget** spawn pattern, which is required by the MV3 service-worker constraint.

Key implementation details:

- `spawn()` is called with `detached: true` so the child process is not bound to the Node.js process group
- `stdio: 'ignore'` prevents the child from inheriting the helper's stdin/stdout file descriptors
- `child.unref()` releases the child from Node.js's event loop reference count - the helper can exit without waiting for the child
- The launcher template is stateless - it reads all request context from environment variables injected at spawn time; no per-request copy is made
- Spawned PowerShell windows are visible (non-hidden) so the user can see Bob's output in real time
- The helper has no mechanism to track, cancel, or monitor running Bob processes after spawn

**Temp file lifecycle:**

| File | Written to | Deleted by | When |
|------|-----------|-----------|------|
| `<requestId>.txt` | `%TEMP%\replycators-bob-helper\` | Launcher (`Remove-Item`) | Immediately after prompt is read into memory |
| `<requestId>.lock` | `%TEMP%\replycators-bob-helper\` | Launcher (`Remove-LockFile`) | Immediately after prompt is read into memory |
| `<requestId>.status.json` | `%TEMP%\replycators-bob-helper\` | Server (`setTimeout` 20s) | ~20 seconds after first terminal-state read; retained on crash path |

- On startup: files older than 24 hours in `%TEMP%\replycators-bob-helper\` are deleted (crash recovery)
- On graceful shutdown (SIGINT, SIGTERM): all remaining files in `%TEMP%\replycators-bob-helper\` are deleted
- The working directory is never used for artifact file placement; it is passed to Bob only as context (`Set-Location` / `--include-directories`)
- An in-memory status cache (120s TTL) serves terminal-state responses after `.status.json` deletion

---

## Extension Messaging Protocol

The helper server is not called directly by the extension. All communication goes through `background.js` as a relay.

| Message type | Direction | Purpose |
|-------------|-----------|---------|
| `RC_BOB_HEALTH` | popup -> background -> HTTP GET /health | Liveness and readiness probe |
| `RC_EXECUTE_BOB` | popup -> background -> HTTP POST /execute | Execute IBM Bob with assembled prompt |
| `RC_PREFLIGHT_CLI_CHECK` | popup -> background -> HTTP GET /cli-check | Validate Bob CLI availability and working directory |

`background.js` relays each message type to the corresponding HTTP endpoint and returns the JSON response payload to the calling popup context. The popup never calls the helper HTTP API directly.

---

## Setup and Management

Use the `bob-helper.ps1` management script (recommended) or start the server directly with Node.js:

```powershell
# Recommended: use the management script
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start

# Direct Node.js start (advanced / debug use)
node tools\bob-helper-server.js
```

Leave the terminal open - the server must remain running for Execute to work. To start automatically on login, register a Windows Scheduled Task (no admin required):

```powershell
powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install
```

| Task | Command |
|------|---------|
| Pre-flight checks | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 check` |
| Start server | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start` |
| Stop server | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 stop` |
| Server status | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 status` |
| Register auto-start | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 install` |
| Remove auto-start | `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 uninstall` |
| Verify server | `curl http://127.0.0.1:47123/health` |
| Enable debug logging | `$env:REPLYCATORS_BOB_HELPER_DEBUG = "1"; node tools\bob-helper-server.js` |
| Override port | `$env:REPLYCATORS_BOB_HELPER_PORT = "48000"; powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start` |

Port override: set `REPLYCATORS_BOB_HELPER_PORT` env var before starting. Also update `BOB_HELPER_PORT` in `background.js` if changed.

---

## Security

- Bound to `127.0.0.1` loopback only - not accessible from network.
- Working directory validated: must exist, must be a directory, must not contain `%`, `"`, or `..` path traversal sequences.
- All artifact files written to `%TEMP%\replycators-bob-helper\` (system temp) regardless of working directory setting - the user's project folder is never used for IPC file placement.
- Prompt `.txt` deleted by launcher immediately after reading; `.status.json` deleted by server ~20s after terminal-state read.
- No authentication - relies on OS-level localhost isolation.
- No `chrome.runtime.connectNative()` - native messaging is not used.
