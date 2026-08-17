/**
 * ReplyCators — RC-015 Phase 1: Postbuild Root Sync Script
 *
 * Copies the extension runtime files from their authoritative sources into
 * dist/ so the dist/ mirror stays identical to what the browser extension
 * loads from root.
 *
 * SCOPE: Only files that the browser extension RUNTIME needs.
 *   - Documentation (AGENTS.md, CHANGELOG.md), build metadata (package.json),
 *     and similar non-runtime files are NOT synced — they do not belong in dist/.
 *
 * Source locations:
 *   Root (hand-authored):
 *     background.js            ← active background service worker
 *     dashboard.js             ← active dashboard controller
 *     dashboard.html           ← active popup HTML
 *     options.html             ← active options page
 *     manifest.json            ← extension manifest
 *     styles/platform.css      ← active CSS
 *     styles/dashboard.css     ← active CSS
 *
 *   Plugin-owned (canonical source lives inside the plugin; synced directly to dist/):
 *     plugins/salesforce/content/sf-content.js
 *         final package path: plugins/salesforce/content/sf-content.js
 *     plugins/apptio-upgrade-calculator/apptio-schedule.json
 *         final package path: plugins/apptio-upgrade-calculator/apptio-schedule.json
 *
 *   Directories synced (root → dist/):
 *     assets/icons/            ← extension icons (icon16.png, icon48.png, icon128.png)
 *     plugins/                 ← plugin runtime modules + content scripts + plugin data
 *
 * Usage:
 *   node build/sync-root.js              — perform sync (fails on mismatch after dry-run)
 *   node build/sync-root.js --verify     — verify only (no write); exits 1 if out-of-sync
 *   node build/sync-root.js --dry-run    — print what would be copied; no writes
 *
 * Exit codes:
 *   0 — success / already in sync
 *   1 — out-of-sync detected (--verify mode) or sync failed
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.resolve(ROOT, 'dist');

// ── File map: source path → dist path (relative to ROOT) ─────────────────────
// Only extension RUNTIME files. No documentation, no build metadata.
//
// All files: authoritative source is at root, dist/ is the mirror.
// Plugin-owned files are covered by SYNC_DIRS (plugins/ → dist/plugins/).
const SYNC_MAP = [
  // Hand-authored root files → dist/
  ['background.js',               'dist/background.js'],
  ['dashboard.js',                'dist/dashboard.js'],
  ['dashboard.html',              'dist/dashboard.html'],
  ['options.html',                'dist/options.html'],
  ['manifest.json',               'dist/manifest.json'],
  ['styles/platform.css',         'dist/styles/platform.css'],
  ['styles/dashboard.css',        'dist/styles/dashboard.css'],
];

// ── Directory map: root dir → dist dir (relative to ROOT) ────────────────────
// Each entry is [srcDirRel, dstDirRel]. All files (including subdirectories) are synced recursively.
// plugins/ covers all plugin runtime modules, content scripts, and plugin-owned data files.
const SYNC_DIRS = [
  ['assets/icons', 'dist/assets/icons'],
  ['plugins',      'dist/plugins'],
];

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const verifyOnly = args.includes('--verify');
const dryRun     = args.includes('--dry-run');

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(filepath) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function filesEqual(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const sa = fs.statSync(a), sb = fs.statSync(b);
  if (sa.size !== sb.size) return false;
  // Compare content for small files (<= 2 MB); for larger files size equality is enough
  if (sa.size <= 2 * 1024 * 1024) {
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  }
  return true;
}

function syncFile(srcRel, dstRel) {
  const src = path.join(ROOT, srcRel);
  const dst = path.join(ROOT, dstRel);

  if (!fs.existsSync(src)) {
    console.warn(`  ⚠  SKIP  ${srcRel} (source not found)`);
    return;
  }

  if (!fs.existsSync(dst)) {
    missing++;
    outOfSync++;
    if (verifyOnly) {
      console.error(`  ✗  MISSING  ${dstRel}`);
    } else if (dryRun) {
      console.log(`  →  WOULD COPY  ${srcRel}  →  ${dstRel}  (missing)`);
    } else {
      ensureDir(dst);
      fs.copyFileSync(src, dst);
      copied++;
      console.log(`  ✓  COPIED  ${srcRel}  →  ${dstRel}  (was missing)`);
    }
    return;
  }

  if (!filesEqual(src, dst)) {
    outOfSync++;
    if (verifyOnly) {
      console.error(`  ✗  OUT-OF-SYNC  ${dstRel}`);
    } else if (dryRun) {
      console.log(`  →  WOULD COPY  ${srcRel}  →  ${dstRel}  (differs)`);
    } else {
      ensureDir(dst);
      fs.copyFileSync(src, dst);
      copied++;
      console.log(`  ✓  COPIED  ${srcRel}  →  ${dstRel}`);
    }
  } else {
    console.log(`  ✔  IN-SYNC  ${dstRel}`);
  }
}

function syncDirectory(srcDirRel, dstDirRel) {
  const srcDir = path.join(ROOT, srcDirRel);
  const dstDir = path.join(ROOT, dstDirRel);

  if (!fs.existsSync(srcDir)) {
    console.warn(`  ⚠  SKIP DIR  ${srcDirRel} (source directory not found)`);
    return;
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcRel = path.join(srcDirRel, entry.name);
    const dstRel = path.join(dstDirRel, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      syncDirectory(srcRel, dstRel);
      continue;
    }

    if (!entry.isFile()) continue;

    const src = path.join(srcDir, entry.name);
    const dst = path.join(ROOT, dstRel);

    if (!fs.existsSync(dst)) {
      missing++;
      outOfSync++;
      if (verifyOnly) {
        console.error(`  ✗  MISSING  ${dstRel}`);
      } else if (dryRun) {
        console.log(`  →  WOULD COPY  ${srcRel}  →  ${dstRel}  (missing)`);
      } else {
        ensureDir(dst);
        fs.copyFileSync(src, dst);
        copied++;
        console.log(`  ✓  COPIED  ${srcRel}  →  ${dstRel}  (was missing)`);
      }
    } else if (!filesEqual(src, dst)) {
      outOfSync++;
      if (verifyOnly) {
        console.error(`  ✗  OUT-OF-SYNC  ${dstRel}`);
      } else if (dryRun) {
        console.log(`  →  WOULD COPY  ${srcRel}  →  ${dstRel}  (differs)`);
      } else {
        ensureDir(dst);
        fs.copyFileSync(src, dst);
        copied++;
        console.log(`  ✓  COPIED  ${srcRel}  →  ${dstRel}`);
      }
    } else {
      console.log(`  ✔  IN-SYNC  ${dstRel}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

let outOfSync = 0;
let copied    = 0;
let missing   = 0;

console.log(`[sync-root] ${verifyOnly ? 'Verifying' : dryRun ? 'Dry-run' : 'Syncing'} sources → dist/ ...\n`);

// Ensure dist/ exists before syncing
if (!fs.existsSync(DIST) && !verifyOnly) {
  fs.mkdirSync(DIST, { recursive: true });
}

// Step 1: Sync root files → dist/
console.log('  -- Root → dist/ --');
for (const [srcRel, dstRel] of SYNC_MAP) {
  syncFile(srcRel, dstRel);
}
console.log('');

// Step 2: Sync directories root → dist/
// plugins/ covers plugin runtime modules, content scripts, AND plugin-owned data
// (e.g. plugins/salesforce/content/sf-content.js,
//       plugins/apptio-upgrade-calculator/apptio-schedule.json)
for (const [srcDirRel, dstDirRel] of SYNC_DIRS) {
  syncDirectory(srcDirRel, dstDirRel);
}

const totalItems = SYNC_MAP.length +
  SYNC_DIRS.reduce((acc, [srcDirRel]) => {
    const srcDir = path.join(ROOT, srcDirRel);
    return acc + (fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(f => fs.statSync(path.join(srcDir, f)).isFile()).length : 0);
  }, 0);

console.log('');
if (verifyOnly) {
  if (outOfSync === 0) {
    console.log(`[sync-root] ✅ All files are in sync.`);
    process.exit(0);
  } else {
    console.error(`[sync-root] ❌ ${outOfSync} file(s) out of sync. Run: node build/sync-root.js`);
    process.exit(1);
  }
} else if (dryRun) {
  console.log(`[sync-root] Dry-run complete — ${outOfSync} file(s) would be copied.`);
} else {
  console.log(`[sync-root] ✅ Sync complete — ${copied} file(s) copied, already in sync the rest.`);
}
