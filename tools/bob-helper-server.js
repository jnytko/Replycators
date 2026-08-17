#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

// ── Centralized port configuration ──────────────────────────────────────────
// Single source of truth for the Bob Helper port number.
// browser-side constants (background.js BOB_HELPER_PORT, dashboard.js _BOB_HELPER_PORT_DIAG)
// must stay in sync with this value. See build/bob-helper-config.js for the
// canonical reference that documents all three locations.
const PORT = Number(process.env.REPLYCATORS_BOB_HELPER_PORT || 47123);
const HOST = '127.0.0.1';

// ── CORS policy (H-001) ──────────────────────────────────────────────────────
// Only the ReplyCators extension service worker is a legitimate caller.
// Extension service workers send an Origin header of the form:
//   chrome-extension://<extension-id>
// Web pages and other origins are blocked by returning null for any other Origin,
// which the browser treats as a CORS failure.
// When no Origin header is present (e.g. direct curl from localhost) the request
// is still served — non-browser callers (health checks, developer CLI) do not
// send CORS headers and are unaffected.
function getAllowedOrigin(requestOrigin) {
  if (!requestOrigin) return null; // no CORS header needed for non-browser requests
  if (requestOrigin.startsWith('chrome-extension://') ||
      requestOrigin.startsWith('moz-extension://')) {
    return requestOrigin; // reflect the exact extension origin back
  }
  return 'null'; // block all other browser origins
}
const DEBUG_ENABLED = process.env.REPLYCATORS_BOB_HELPER_DEBUG === '1';
const LAUNCHER_TEMPLATE_PATH = path.join(__dirname, 'bob-launcher-template.ps1');
const TEMP_ROOT = path.join(os.tmpdir(), 'replycators-bob-helper');

// PS_EXEC_POLICY: execution policy passed to powershell.exe spawn.
// Override via REPLYCATORS_PS_EXEC_POLICY env var (default: 'Bypass').
// WARNING: Setting this to 'AllSigned' or 'Restricted' causes all Execute
// requests to fail silently. Document as a configuration hazard.
const PS_EXEC_POLICY = process.env.REPLYCATORS_PS_EXEC_POLICY || 'Bypass';

// Prompt files older than this threshold are eligible for age-based cleanup.
// Reduced from 7 days to 24 hours because the lock-file protocol guarantees
// that any .txt without a sibling .lock is safe to remove immediately after
// the launcher reads the prompt. The 24h guard only exists for crash recovery.
const OLD_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cache for resolved Bob CLI path. Refreshed every BOB_RESOLVE_TTL_MS to avoid
// a spawnSync('where.exe', ...) call on every health probe and execute request.
const BOB_RESOLVE_TTL_MS = 60 * 1000; // 60 seconds (reduced from 5 min so a fresh bobshell install is detected quickly)
let _bobCommandCache = undefined; // undefined = never resolved; null = not found
let _bobCommandResolvedAt = 0;

function log(message, extra) {
  if (!DEBUG_ENABLED) return;
  const timestamp = new Date().toISOString();
  const suffix = extra === undefined ? '' : ' ' + JSON.stringify(extra);
  process.stdout.write(`[BobHelper][${timestamp}] ${message}${suffix}\n`);
}

// Resolve Bob CLI path. Only bob.ps1 is accepted - the PowerShell execution engine
// requires a .ps1 script as the spawn target. bob.cmd and bare executables are rejected.
// CF2 fix: removed dead candidates 'pwsh' and 'powershell' that could never satisfy the
// .endsWith('.ps1') filter, eliminating two redundant where.exe calls per probe.
function resolveBobCommand() {
  const now = Date.now();
  if (_bobCommandCache !== undefined && (now - _bobCommandResolvedAt) < BOB_RESOLVE_TTL_MS) {
    return _bobCommandCache;
  }
  let found = null;
  const result = spawnSync('where.exe', ['bob.ps1'], { encoding: 'utf8', windowsHide: true });
  if (result.status === 0) {
    const match = (result.stdout || '').split(/\r?\n/).map(line => line.trim()).find(Boolean);
    if (match && match.toLowerCase().endsWith('.ps1')) {
      found = match;
    }
  }
  _bobCommandCache = found;
  _bobCommandResolvedAt = now;
  return found;
}

function ensureTempRoot() {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
}

// ── Lock file helpers ────────────────────────────────────────────────────────
// A .lock companion file is written alongside every prompt .txt file.
// The launcher deletes the .lock immediately after reading the prompt.
// Cleanup functions treat a .txt with no sibling .lock as safe to delete.
// A .txt whose .lock still exists means the launcher has not yet consumed it
// and must be protected from cleanup. The 24h age guard overrides this as a
// crash recovery fallback.

function lockPath(promptPath) {
  return promptPath.replace(/\.txt$/, '.lock');
}

function writeLockFile(promptPath) {
  try {
    fs.writeFileSync(lockPath(promptPath), '', 'utf8');
  } catch (_) { /* non-fatal - lock creation failure does not block execution */ }
}

function hasLockFile(promptPath) {
  try {
    return fs.existsSync(lockPath(promptPath));
  } catch (_) {
    return false;
  }
}

// ── Status file helpers ──────────────────────────────────────────────────────
// A .status.json file is written alongside every prompt .txt file so the
// GET /status/:requestId endpoint can report execution progress.
// Schema: { state: 'pending'|'running'|'completed'|'failed',
//           exitCode: null|number, startedAt: null|number,
//           completedAt: null|number, errorMessage: null|string }

function statusPath(promptPath) {
  return promptPath.replace(/\.txt$/, '.status.json');
}

function writeStatusFile(promptPath, status) {
  try {
    fs.writeFileSync(statusPath(promptPath), JSON.stringify(status), 'utf8');
  } catch (_) { /* non-fatal */ }
}

function readStatusFile(requestId) {
  // Status files may be in TEMP_ROOT or in a working directory tracked via
  // _usedPromptDirs. Search all known locations.
  const candidates = [TEMP_ROOT, ..._usedPromptDirs];
  for (const dir of candidates) {
    const filePath = path.join(dir, requestId + '.status.json');
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (_) { /* skip unreadable file */ }
  }
  return null;
}

// Delete temp files older than maxAgeMs from TEMP_ROOT.
// Lock-aware: skip any .txt file whose sibling .lock still exists (launcher
// has not yet consumed the prompt). The 24h age guard overrides as a crash
// recovery fallback regardless of lock presence.
function cleanupOldTempFiles(maxAgeMs) {
  try {
    if (!fs.existsSync(TEMP_ROOT)) return;
    const now = Date.now();
    const entries = fs.readdirSync(TEMP_ROOT);
    let deleted = 0;
    for (const entry of entries) {
      const filePath = path.join(TEMP_ROOT, entry);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;
        const age = now - stat.mtimeMs;
        if (age <= maxAgeMs) continue;
        // Age threshold exceeded - always delete regardless of lock state.
        fs.unlinkSync(filePath);
        deleted++;
      } catch (_) { /* skip files that cannot be read or deleted */ }
    }
    if (deleted > 0) {
      process.stdout.write(`Bob helper: cleaned up ${deleted} temp file(s) older than ${Math.round(maxAgeMs / 3600000)} hour(s) from ${TEMP_ROOT}\n`);
    }
  } catch (_) { /* non-fatal - startup cleanup failure should not block the server */ }
}

// Delete ALL temp files on graceful server shutdown.
// Lock-aware: skip any .txt file whose sibling .lock still exists (launcher
// may still be reading the prompt). Status files are deleted unconditionally.
function cleanupAllTempFiles() {
  let deleted = 0;

  // 1. TEMP_ROOT files.
  try {
    if (fs.existsSync(TEMP_ROOT)) {
      const entries = fs.readdirSync(TEMP_ROOT);
      for (const entry of entries) {
        const filePath = path.join(TEMP_ROOT, entry);
        try {
          if (!fs.statSync(filePath).isFile()) continue;
          // Protect .txt files that still have a .lock sibling (launcher not yet done).
          if (entry.endsWith('.txt') && hasLockFile(filePath)) continue;
          fs.unlinkSync(filePath);
          deleted++;
        } catch (_) { /* skip - file may be open by a running Bob process */ }
      }
    }
  } catch (_) { /* non-fatal */ }

  // 2. Prompt .txt files written directly into tracked working directories.
  for (const promptDir of _usedPromptDirs) {
    try {
      if (!fs.existsSync(promptDir)) continue;
      const entries = fs.readdirSync(promptDir);
      for (const entry of entries) {
        if (!entry.endsWith('.txt') && !entry.endsWith('.lock') && !entry.endsWith('.status.json')) continue;
        const filePath = path.join(promptDir, entry);
        try {
          // Protect .txt files still locked by the launcher.
          if (entry.endsWith('.txt') && hasLockFile(filePath)) continue;
          fs.unlinkSync(filePath);
          deleted++;
        } catch (_) { /* skip - may be open by running Bob process */ }
      }
    } catch (_) { /* non-fatal */ }
  }

  if (deleted > 0) {
    process.stdout.write(`Bob helper: cleaned up ${deleted} temp file(s) on shutdown.\n`);
  }
}

const _usedPromptDirs = new Set();

function resolvePromptDir(workingDir) {
  if (!workingDir) return TEMP_ROOT;
  _usedPromptDirs.add(workingDir);
  return workingDir;
}

function writePromptFile(requestId, prompt, workingDir) {
  const promptDir = resolvePromptDir(workingDir);
  if (promptDir === TEMP_ROOT) ensureTempRoot();
  const promptPath = path.join(promptDir, `${requestId}.txt`);
  fs.writeFileSync(promptPath, prompt, 'utf8');
  // Write the lock file immediately after the prompt to protect it from cleanup
  // until the launcher has consumed the content (see lock-file protocol above).
  writeLockFile(promptPath);
  // Pre-create a status file so /status/:requestId returns 'pending' immediately.
  writeStatusFile(promptPath, {
    state: 'pending',
    exitCode: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  });
  return promptPath;
}

function sendJson(res, statusCode, payload, requestOrigin) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  };
  const allowed = getAllowedOrigin(requestOrigin);
  if (allowed !== null) headers['Access-Control-Allow-Origin'] = allowed;
  res.writeHead(statusCode, headers);
  res.end(body);
}

// Validate a working directory path. Returns a Promise<{ ok, error? }>.
// Cheap string checks run synchronously; the filesystem stat uses fs.promises.stat
// so it never blocks the Node.js event loop. A 5-second timeout guard prevents an
// indefinite hang when the path resolves to a disconnected UNC network share.
function validateWorkingDir(dir) {
  if (!dir || typeof dir !== 'string') {
    return Promise.resolve({ ok: false, error: 'Working directory must be a non-empty string.' });
  }
  if (!path.isAbsolute(dir)) {
    return Promise.resolve({ ok: false, error: 'Working directory must be an absolute path.' });
  }
  if (dir.includes('%')) {
    return Promise.resolve({ ok: false, error: 'Working directory path must not contain percent signs (%).' });
  }
  if (dir.includes('"')) {
    return Promise.resolve({ ok: false, error: 'Working directory path must not contain double-quote characters (").' });
  }

  // ── Change F: canonical path traversal prevention ──────────────────────────
  // path.normalize() collapses any embedded '..' or '.' segments (e.g. C:\work\..\etc
  // becomes C:\etc) before the segment-level check. path.resolve() further ensures
  // the canonical form is used for comparison. Together these prevent traversal
  // payloads that bypass a pure segment-split check.
  const normalized = path.resolve(path.normalize(dir));
  if (normalized !== path.resolve(dir)) {
    return Promise.resolve({ ok: false, error: 'Working directory path must not contain path traversal sequences.' });
  }
  // Also check each segment explicitly as a belt-and-suspenders guard.
  const segments = normalized.split(/[/\\]/);
  if (segments.some(seg => seg === '..')) {
    return Promise.resolve({ ok: false, error: 'Working directory path must not contain path traversal sequences (..).' });
  }

  const statPromise = fs.promises.stat(normalized).then(stat => {
    if (!stat.isDirectory()) {
      return { ok: false, error: 'Working directory path is not a directory: ' + normalized };
    }
    return { ok: true };
  }).catch(err => {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      return { ok: false, error: 'Working directory does not exist: ' + normalized };
    }
    return { ok: false, error: 'Cannot access working directory: ' + (err.message || err.code) };
  });

  // 5-second timeout prevents indefinite event-loop hang on disconnected network shares.
  const timeoutPromise = new Promise(resolve =>
    setTimeout(() => resolve({ ok: false, error: 'Timed out accessing working directory (possible disconnected network share): ' + normalized }), 5000)
  );

  return Promise.race([statPromise, timeoutPromise]);
}

const server = http.createServer((req, res) => {
  const reqOrigin = req.headers['origin'] || null;

  if (req.method === 'OPTIONS') {
    const allowed = getAllowedOrigin(reqOrigin);
    const headers = {
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (allowed !== null) headers['Access-Control-Allow-Origin'] = allowed;
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    const bobCommand = resolveBobCommand();
    sendJson(res, 200, {
      ok: true,
      ready: bobCommand !== null,
      bobCommand,
      pid: process.pid,
      port: PORT,
      tempRoot: TEMP_ROOT,
      execPolicy: PS_EXEC_POLICY,
    }, reqOrigin);
    return;
  }

  if (req.method === 'GET' && (req.url === '/cli-check' || req.url.startsWith('/cli-check?'))) {
    const bobCommand = resolveBobCommand();
    const nodeExe = process.execPath || null;
    const nodeBasename = nodeExe ? path.basename(nodeExe) : null;
    let bobVersion = null;
    if (bobCommand) {
      try {
        const vResult = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', PS_EXEC_POLICY, '-Command', `& "${bobCommand}" --version`], {
          encoding: 'utf8', windowsHide: true,
          timeout: 3000,
        });
        if (vResult.status === 0) {
          const raw = (vResult.stdout || '').trim().split(/\r?\n/)[0];
          if (/^[\w.\-+\s]{1,80}$/.test(raw)) bobVersion = raw;
        }
      } catch (_) { /* non-fatal */ }
    }

    let dirOk = null;
    let dirError = null;
    const parsedUrl = new URL(req.url, 'http://localhost');
    const dirParam = parsedUrl.searchParams.get('dir');

    // validateWorkingDir is async (uses fs.promises.stat to avoid blocking the event loop).
    // Use an immediately-invoked async function to keep the rest of the handler sequential.
    (async () => {
      if (dirParam !== null) {
        const checkResult = await validateWorkingDir(dirParam.trim());
        dirOk = checkResult.ok;
        dirError = checkResult.error || null;
      }

      const response = {
        ok: true,
        bobFound:    bobCommand !== null,
        bobBasename: bobCommand ? path.basename(bobCommand) : null,
        bobVersion,
        nodeFound:   nodeExe !== null,
        nodeBasename,
        nodeVersion: process.versions?.node || null,
        execPolicy:  PS_EXEC_POLICY,
        bobInstallInstruction: bobCommand === null ? "IBM Bob CLI (bob.ps1) is required. Install via 'npm install -g bobshell' or refer to documentation." : null,
      };
      if (dirOk !== null) {
        response.dirOk = dirOk;
        response.dirError = dirError;
      }
      sendJson(res, 200, response, reqOrigin);
    })().catch(err => {
      sendJson(res, 500, { ok: false, error: 'cli-check failed: ' + err.message }, reqOrigin);
    });
    return;
  }

  // -- GET /status/:requestId - execution status polling ----------------------
  // Returns the current execution state for a given requestId.
  // States: pending (queued) | running (Bob started) | completed | failed
  // The status file is written by writePromptFile() as 'pending' and updated
  // by the launcher via the RC_STATUS_FILE env var.
  const statusMatch = req.method === 'GET' && req.url.match(/^\/status\/([a-zA-Z0-9_\-]+)$/);
  if (statusMatch) {
    const requestId = statusMatch[1];
    const status = readStatusFile(requestId);
    if (!status) {
      sendJson(res, 404, { ok: false, error: 'No status record found for requestId: ' + requestId }, reqOrigin);
      return;
    }
    sendJson(res, 200, { ok: true, requestId, ...status }, reqOrigin);
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    // Async handler: validateWorkingDir is async to avoid blocking the event loop on
    // network paths. The callback is declared async so we can await the validation.
    req.on('end', async () => {
      let payload;
      try {
        payload = body ? JSON.parse(body) : {};
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'Invalid JSON: ' + err.message }, reqOrigin);
        return;
      }

      const requestId    = payload.requestId || `helper-${Date.now()}`;
      const prompt       = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
      const workingDir   = typeof payload.workingDir === 'string' ? payload.workingDir.trim() : '';
      const diagnosticMode = payload.diagnosticMode === true;
      // v1.45.0: API key forwarded from extension — injected into child env, never logged.
      const bobApiKey    = typeof payload.bobApiKey === 'string' ? payload.bobApiKey : '';

      const safeIncludeDir = workingDir.replace(/[/\\]+$/, '');

      if (!prompt) {
        sendJson(res, 400, { ok: false, error: 'Empty prompt - nothing to execute.', requestId }, reqOrigin);
        return;
      }

      if (workingDir) {
        const dirCheck = await validateWorkingDir(workingDir);
        if (!dirCheck.ok) {
          sendJson(res, 400, { ok: false, error: dirCheck.error, requestId, workingDir }, reqOrigin);
          return;
        }
      }

      const bobCommand = resolveBobCommand();
      if (!bobCommand) {
        sendJson(res, 500, {
          ok: false,
          error: "IBM Bob CLI (bob.ps1) not found on PATH. Please install IBM Bob via 'npm install -g bobshell' or consult documentation.",
          requestId
        }, reqOrigin);
        return;
      }

      let promptPath;
      try {
        promptPath = writePromptFile(requestId, prompt, workingDir);
      } catch (err) {
        sendJson(res, 500, { ok: false, error: 'Failed to write prompt file: ' + err.message, requestId }, reqOrigin);
        return;
      }

      log('Prepared prompt file', { requestId, bobCommand, promptPath, workingDir: workingDir || '(none)', diagnosticMode, bobApiKeySet: !!bobApiKey });

      // Spawn the launcher template in a new visible PowerShell console window.
      //
      // shell:true routes through cmd.exe internally, which allocates a real
      // console for the child process.  Spawning powershell.exe directly with
      // spawn() does not allocate a new console when the Node process itself has
      // no attached console - the PowerShell process starts with no window at all
      // regardless of windowsHide:false.  shell:true is the minimal fix that
      // keeps PowerShell as the launcher while ensuring the window is visible.
      const spawnCmd = `powershell.exe -NoProfile -ExecutionPolicy ${PS_EXEC_POLICY} -File "${LAUNCHER_TEMPLATE_PATH}"`;
      const spawnOpts = {
        shell: true,
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        env: {
          ...process.env,
          RC_BOB_COMMAND:   bobCommand,
          RC_PROMPT_FILE:   promptPath,
          RC_WORKING_DIR:   workingDir || '',
          RC_INCLUDE_DIR:   safeIncludeDir,
          RC_DIAG_MODE:     diagnosticMode ? '1' : '0',
          RC_STATUS_FILE:   statusPath(promptPath),
          // v1.45.0: inject BOB_API_KEY only when the caller provided one.
          // Absent when Bob 1.0 mode is active (empty string passed).
          ...(bobApiKey ? { BOB_API_KEY: bobApiKey } : {}),
        },
      };
      if (workingDir) {
        spawnOpts.cwd = workingDir;
      }

      const child = spawn(spawnCmd, [], spawnOpts);

      child.once('error', err => {
        log('Launch failed', { requestId, error: err.message });
        sendJson(res, 500, { ok: false, error: 'Failed to launch Bob: ' + err.message, requestId, promptPath }, reqOrigin);
      });

      child.once('spawn', () => {
        child.unref();
        log('Launch succeeded', { requestId, bobCommand, childPid: child.pid ?? null, promptPath, workingDir: workingDir || '(none)' });
        sendJson(res, 200, {
          ok: true,
          requestId,
          helperPid: process.pid,
          childPid: child.pid ?? null,
          bobCommand,
          promptPath,
          workingDir: workingDir || null,
        }, reqOrigin);
      });
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found' }, reqOrigin);
});

server.on('error', err => {
  process.stderr.write(`Bob helper failed to start: ${err.message}\n`);
  process.exit(1);
});

let _shutdownRegistered = false;
function _registerShutdownCleanup() {
  if (_shutdownRegistered) return;
  _shutdownRegistered = true;

  function onShutdown(signal) {
    process.stdout.write(`\nBob helper: received ${signal} - cleaning temp files and exiting.\n`);
    cleanupAllTempFiles();
    process.exit(signal === 'SIGTERM' ? 0 : 130);
  }

  process.once('SIGINT',  () => onShutdown('SIGINT'));
  process.once('SIGTERM', () => onShutdown('SIGTERM'));
  process.once('exit',    () => { cleanupAllTempFiles(); });
}

server.listen(PORT, HOST, () => {
  log('Helper listening', { host: HOST, port: PORT, pid: process.pid, tempRoot: TEMP_ROOT });
  process.stdout.write(`Bob helper listening on http://${HOST}:${PORT}\n`);

  const bobAtStart = resolveBobCommand();
  if (bobAtStart) {
    process.stdout.write(`Bob CLI found: ${bobAtStart}\n`);
  } else {
    process.stdout.write(
      'WARNING: IBM Bob CLI (bob.ps1) not found on PATH.\n' +
      '  The server is running but Execute requests will fail until Bob is installed.\n' +
      '  Install IBM Bob via: npm install -g bobshell\n' +
      '  Ensure bob.ps1 is on the system PATH, then restart this server.\n'
    );
  }

  cleanupOldTempFiles(OLD_FILE_MAX_AGE_MS);
  _registerShutdownCleanup();
});
