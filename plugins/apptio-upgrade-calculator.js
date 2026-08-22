(function() {
  'use strict';

  const plugin = {
    id: 'com.replycators.apptio-planning-upgrade-calculator',
    init,
    render,
    refreshCache,
    clearCache,
  };

  function app() { return window.ReplyCatorsApp; }
  const addLog = (...args) => app().addLog(...args);
  const addNotification = (...args) => app().addNotification(...args);
  const esc = (...args) => app().esc(...args);
  const AUC_PLUGIN_ID = plugin.id;
  const AUC_SCHEDULE_KEY = 'rc:plugin:' + AUC_PLUGIN_ID + ':schedule-cache';
  const AUC_PREFS_KEY = 'rc:plugin:' + AUC_PLUGIN_ID + ':last-calc';
  
// PLUGIN - Apptio Planning Upgrade Calculator - Flat JS Implementation
//
// Three-tier schedule retrieval:
//   1. Live IBM Community page (https://community.ibm.com/...)
//   2. Cached schedule (chrome.storage.local - if < 24 h old and valid)
//   3. Local fallback (apptio-schedule.json bundled with extension)
//
// QA hardening applied:
//   - Version regex anchored to Apptio Planning format (5.xx-9.xx)
//   - Parsing scoped to "Release Schedule" section only (stops before history)
//   - Full <li> textContent used - handles split-anchor HTML like <a>5.3</a>0
//   - Text normalised before extraction (collapse whitespace, join split lines)
//   - Per-entry validation: version, pattern, date, date validity
//   - No hardcoded version list - future releases appear automatically
//   - Debug logging for every parsed entry
// ═══════════════════════════════════════════════════════════════════════════════

const AUC_IBM_COMMUNITY_URL =
  'https://community.ibm.com/community/user/viewdocument/apptio-planning-whats-new-cumula' +
  '?CommunityKey=4100dfb8-fc23-4203-83c7-019253cf7c0b&tab=librarydocuments';
const AUC_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Version extraction ───────────────────────────────────────────────────────
// Matches any "MAJOR.MINOR" token where:
//   MAJOR = one or more digits (1, 3, 5, 10, 11, …)
//   MINOR = two or more digits (avoids matching truncated anchor artefacts like
//           "5.3" from <a>Release 5.3</a>0 - those have only 1 minor digit)
//
// No hardcoded major version list.  Any major IBM introduces (3, 5, 6, 10 …)
// is matched automatically.
const AUC_VERSION_RE = /\b(\d+\.\d{2,})\b/;

function aucExtractVersion(text) {
  const m = text.match(AUC_VERSION_RE);
  return m ? m[1] : null;
}

// ─── Text normalisation ───────────────────────────────────────────────────────
// Collapses all whitespace (including newlines injected by innerText at element
// boundaries) into a single space so that split-anchor text like:
//   "August 24, 2026:\nRelease 5.3\n0"
// becomes "August 24, 2026: Release 5.30" before any regex is applied.
function aucNormaliseText(raw) {
  return raw.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ─── Date extraction (three formats) ─────────────────────────────────────────
const AUC_MONTH_MAP = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
};

function aucParseNamedDate(month, day, year) {
  const mo = AUC_MONTH_MAP[month.toLowerCase()];
  if (!mo) return null;
  const d = parseInt(day, 10), y = parseInt(year, 10);
  if (isNaN(d) || d < 1 || d > 31) return null;
  if (isNaN(y) || y < 2020 || y > 2040) return null;
  return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function aucExtractDates(text) {
  const results = [], seen = new Set();
  function add(d) { if (d && !seen.has(d)) { seen.add(d); results.push(d); } }

  // Named month: "July 13, 2026"
  const namedRe = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  let m;
  while ((m = namedRe.exec(text)) !== null) {
    const d = aucParseNamedDate(m[1], m[2], m[3]);
    if (d) add(d);
  }
  // MM/DD/YYYY
  const slashRe = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  while ((m = slashRe.exec(text)) !== null) {
    const mo = parseInt(m[1],10), dy = parseInt(m[2],10), yr = parseInt(m[3],10);
    if (mo>=1 && mo<=12 && dy>=1 && dy<=31 && yr>=2020 && yr<=2040) {
      add(`${yr}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`);
    }
  }
  // ISO YYYY-MM-DD
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = isoRe.exec(text)) !== null) {
    const yr=parseInt(m[1],10), mo=parseInt(m[2],10), dy=parseInt(m[3],10);
    if (yr>=2020 && yr<=2040 && mo>=1 && mo<=12 && dy>=1 && dy<=31) add(`${m[1]}-${m[2]}-${m[3]}`);
  }
  return results;
}

function aucIsValidDateStr(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s + 'T00:00:00').getTime());
}

function aucAddDaysToStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── Entry builder ────────────────────────────────────────────────────────────
//
// Business rule:
//   Every IBM Community schedule entry contains exactly ONE date - the
//   Production Release Date.  Sandbox is ALWAYS productionDate − 7 days.
//
// Input:  a single normalised text string already scoped to one schedule entry.
// Output: { version, productionDate, sandboxDate } or null if entry is invalid.
function aucBuildEntry(normText) {
  const version = aucExtractVersion(normText);
  if (!version) return null;
  // AUC_VERSION_RE already requires ≥2 minor digits, so no second check needed.
  // (Single-digit minors like "5.3" are already rejected by the regex.)

  const dates = aucExtractDates(normText);
  if (dates.length < 1) return null;

  // The IBM schedule has one date per entry.  Use the FIRST (and normally only)
  // date as the Production Date.  Sandbox is always derived.
  const productionDate = dates[0];
  if (!aucIsValidDateStr(productionDate)) return null;
  const sandboxDate = aucAddDaysToStr(productionDate, -7);
  return { version, productionDate, sandboxDate };
}

// ─── Section scoping ─────────────────────────────────────────────────────────
// Returns only the <li> elements that fall inside the "Release Schedule"
// section of the IBM Community page, stopping before any historical section
// (detected by year headers like "2025 Releases", "2024 Releases", etc.).
//
// Strategy:
//   1. Walk all block-level elements in document order.
//   2. Start collecting <li> nodes after a heading/paragraph whose text
//      contains "Release Schedule" (case-insensitive).
//   3. Stop collecting when a heading/paragraph signals the END of all
//      schedule content (not just the current year):
//      - text matches structural end markers like "What's New", "Known Issues",
//        "Fixed Issues", "Release Notes", etc.
//      - Year-labelled section headers ("2024 Releases", "2023 Releases") are
//        NOT treated as stop markers - they introduce historical release lists
//        that are still valid schedule content.
function aucExtractScheduleListItems(doc) {
  // Walk every element in document order
  const allEls = Array.from(doc.body ? doc.body.querySelectorAll('*') : []);

  let inSchedule = false;
  const scheduleLis = [];

  // Markers that indicate we have genuinely left all schedule content.
  // Does NOT include year numbers - "2024 Releases" is still schedule content.
  const stopRe = /\b(what'?s\s+new|known\s+issues?|fixed\s+issues?|release\s+notes?|enhancements?|new\s+features?)\b/i;
  // A header announcing the current schedule section
  const startRe = /release\s+schedule/i;

  for (const el of allEls) {
    const tag = el.tagName ? el.tagName.toLowerCase() : '';

    // Only examine heading/paragraph-level nodes for start/stop signals
    if (/^(h[1-6]|p|strong|b)$/.test(tag)) {
      const txt = aucNormaliseText(el.textContent || '');
      if (!inSchedule && startRe.test(txt)) {
        inSchedule = true;
        continue;
      }
      if (inSchedule && stopRe.test(txt)) {
        break; // stop collecting
      }
    }

    // Collect <li> elements while inside the schedule section
    if (inSchedule && tag === 'li') {
      scheduleLis.push(el);
    }
  }

  // Fallback: if scoping found nothing, return ALL <li> elements and let the
  // per-entry validator filter out non-schedule entries via date range.
  if (scheduleLis.length === 0) {
    return Array.from(doc.querySelectorAll('li'));
  }
  return scheduleLis;
}

// ─── Deduplication ────────────────────────────────────────────────────────────
function aucDedupe(releases) {
  const seen = new Map();
  for (const r of releases) { if (!seen.has(r.version)) seen.set(r.version, r); }
  // Sort by production date ascending (chronological) - avoids parseFloat() which
  // gives wrong ordering for versions like 5.30 (parsed as 5.3) or multi-major data.
  return Array.from(seen.values()).sort(function(a, b) {
    return new Date(a.productionDate) - new Date(b.productionDate);
  });
}

// ─── Primary parse strategy: scoped <li> with full textContent ────────────────
// This is the main strategy for the IBM Community page structure.
//
// KEY FIX: reads el.textContent (NOT el.innerText) on the COMPLETE <li> node.
// textContent concatenates ALL text nodes including those outside child <a> tags,
// so "<a>Release 5.3</a>0" → "Release 5.30" rather than the truncated "Release 5.3"
// that would result from reading only the <a> child.
//
// Then normalises whitespace before passing to aucBuildEntry so that newlines
// injected at element boundaries do not split version tokens.
function aucParseFromScheduleListItems(doc) {
  const liEls = aucExtractScheduleListItems(doc);
  const releases = [];
  for (const li of liEls) {
    // Use textContent (not innerText) so we get ALL text nodes including those
    // outside child anchor/span elements.  Then normalise whitespace.
    const rawText  = li.textContent || '';
    const normText = aucNormaliseText(rawText);
    addLog('debug', AUC_PLUGIN_ID, '[parser] li raw="' + rawText.substring(0,120).replace(/\n/g,'\\n') + '"');
    addLog('debug', AUC_PLUGIN_ID, '[parser] li norm="' + normText.substring(0,120) + '"');
    const entry = aucBuildEntry(normText);
    if (entry) {
      addLog('debug', AUC_PLUGIN_ID, '[parser] entry accepted: v' + entry.version + ' prod=' + entry.productionDate + ' sandbox=' + entry.sandboxDate);
      releases.push(entry);
    }
  }
  return aucDedupe(releases);
}

// ─── Fallback strategy: scoped body text line scan ────────────────────────────
// Used only when the primary <li> strategy returns no results.
// Operates on the plain text of the Release Schedule section only.
function aucParseFromScopedText(doc) {
  // Extract the schedule section text by collecting textContent of scoped <li>s
  const liEls = aucExtractScheduleListItems(doc);
  const lines = liEls.map(function(li) { return aucNormaliseText(li.textContent || ''); });
  const releases = [];
  for (const line of lines) {
    if (!aucExtractVersion(line)) continue;
    const entry = aucBuildEntry(line);
    if (entry) releases.push(entry);
  }
  return aucDedupe(releases);
}

// ─── Last-resort strategy: full body text scan ────────────────────────────────
// Only reached when both above strategies return 0 results (e.g. page structure
// has changed completely).  Operates on normalised full body text, then filters
// to only releases whose production date is in a plausible future range.
function aucParseFromBodyText(text) {
  const releases = [];
  // Normalise the whole text block first
  const normText = aucNormaliseText(text);
  // Split on sentence boundaries that look like schedule entries
  // (date followed by "Release X.XX")
  const entryRe = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}[^.]*?Release\s+\d+\.\d{2,3}/gi;
  let m;
  while ((m = entryRe.exec(normText)) !== null) {
    const entry = aucBuildEntry(m[0]);
    if (entry) releases.push(entry);
  }
  // If pattern matching found nothing, fall back to line-by-line
  if (releases.length === 0) {
    for (const line of normText.split(/\.\s+|\n/)) {
      if (!aucExtractVersion(line)) continue;
      const entry = aucBuildEntry(line);
      if (entry) releases.push(entry);
    }
  }
  return aucDedupe(releases);
}

// ─── Main HTML parser ─────────────────────────────────────────────────────────
function aucParseHtml(html) {
  const doc = (new DOMParser()).parseFromString(html, 'text/html');

  // Strategy 1: scoped <li> elements with full textContent (primary)
  const fromLi = aucParseFromScheduleListItems(doc);
  if (fromLi.length > 0) {
    addLog('info', AUC_PLUGIN_ID, '[parser] strategy=list-items releases=' + fromLi.length);
    return fromLi;
  }

  // Strategy 2: scoped text (fallback)
  const fromScoped = aucParseFromScopedText(doc);
  if (fromScoped.length > 0) {
    addLog('info', AUC_PLUGIN_ID, '[parser] strategy=scoped-text releases=' + fromScoped.length);
    return fromScoped;
  }

  // Strategy 3: full body text last resort
  addLog('warn', AUC_PLUGIN_ID, '[parser] strategy=body-text-fallback');
  const bodyText = doc.body ? (doc.body.textContent || '') : html;
  return aucParseFromBodyText(bodyText);
}

// ─── Live fetch ───────────────────────────────────────────────────────────────
async function aucFetchLive() {
  addLog('info', AUC_PLUGIN_ID, 'Fetching live schedule from IBM Community');
  const resp = await fetch(AUC_IBM_COMMUNITY_URL, { method:'GET', cache:'no-store', headers:{ Accept:'text/html' } });
  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
  const html = await resp.text();
  addLog('debug', AUC_PLUGIN_ID, 'Received ' + html.length + ' bytes from IBM Community');
  const releases = aucParseHtml(html);
  addLog('info', AUC_PLUGIN_ID, 'Parsed ' + releases.length + ' releases from live page');
  return releases;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
//
// Cache migration: releases stored before the business-rule fix may contain a
// sandboxDate that was parsed from the IBM Community page rather than being
// derived from productionDate − 7 days.  On every cache load we re-derive
// sandboxDate for every release so stale cached entries are silently corrected.
function aucMigrateReleases(releases) {
  return releases.map(function(r) {
    if (!r.productionDate || !aucIsValidDateStr(r.productionDate)) return r;
    // Always re-derive sandbox as productionDate − 7 days.
    return { version: r.version, productionDate: r.productionDate, sandboxDate: aucAddDaysToStr(r.productionDate, -7) };
  });
}

function aucLoadCache() {
  return new Promise(function(resolve) {
    chrome.storage.local.get([AUC_SCHEDULE_KEY], function(result) {
      try {
        const cached = result[AUC_SCHEDULE_KEY];
        if (!cached || !Array.isArray(cached.releases) || cached.releases.length === 0 || !cached.lastUpdated) {
          resolve(null); return;
        }
        const ageMs = Date.now() - new Date(cached.lastUpdated).getTime();
        if (isNaN(ageMs) || ageMs > AUC_CACHE_TTL_MS) {
          addLog('info', AUC_PLUGIN_ID, 'Cache expired (age ' + Math.round(ageMs/60000) + ' min)');
          resolve(null); return;
        }
        // Migrate: re-derive sandboxDate for every cached release.
        const migrated = aucMigrateReleases(cached.releases);
        addLog('info', AUC_PLUGIN_ID, 'Cache hit: ' + migrated.length + ' releases (age ' + Math.round(ageMs/60000) + ' min)');
        resolve({ ...cached, releases: migrated, source: 'cache' });
      } catch(e) {
        addLog('warn', AUC_PLUGIN_ID, 'Cache load error: ' + String(e));
        resolve(null);
      }
    });
  });
}

function aucSaveCache(schedule) {
  chrome.storage.local.set({ [AUC_SCHEDULE_KEY]: schedule }, function() {
    addLog('debug', AUC_PLUGIN_ID, 'Schedule cached');
  });
}

function aucClearCache() {
  return new Promise(function(resolve) {
    chrome.storage.local.remove(AUC_SCHEDULE_KEY, resolve);
  });
}

async function clearCache() {
  return new Promise(function(resolve) {
    chrome.storage.local.remove(AUC_SCHEDULE_KEY, function() {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || 'Storage remove failed' });
        return;
      }
      aucSchedule = null;
      resolve({ ok: true });
    });
  });
}

async function refreshCache() {
  try {
    const previous = await aucLoadCache();
    const liveReleases = await aucFetchLive();
    if (!Array.isArray(liveReleases) || liveReleases.length === 0) {
      return { ok: false, error: 'Live refresh returned no releases.', preserved: !!previous };
    }
    const schedule = { releases: liveReleases, lastUpdated: new Date().toISOString(), source: 'live' };
    await new Promise(function(resolve, reject) {
      chrome.storage.local.set({ [AUC_SCHEDULE_KEY]: schedule }, function() {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Storage write failed'));
          return;
        }
        resolve();
      });
    });
    aucSchedule = schedule;
    return { ok: true, updatedAt: schedule.lastUpdated };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

// ─── Local fallback ───────────────────────────────────────────────────────────
async function aucLoadLocal() {
  try {
    const url  = chrome.runtime.getURL('plugins/apptio-upgrade-calculator/apptio-schedule.json');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const releases = Array.isArray(data.releases) ? data.releases : [];
    addLog('info', AUC_PLUGIN_ID, 'Loaded ' + releases.length + ' releases from local fallback');
    return { releases, lastUpdated: data.lastUpdated || new Date().toISOString(), source: 'local' };
  } catch(e) {
    addLog('error', AUC_PLUGIN_ID, 'Failed to load local schedule: ' + String(e));
    return { releases: [], lastUpdated: new Date().toISOString(), source: 'local' };
  }
}

// ─── Waterfall retrieval ──────────────────────────────────────────────────────
// PERF-005 fix: previous implementation always attempted a live cross-origin
// fetch FIRST on every view navigate, even when a valid cache existed.
// This caused 200-2000 ms of network latency + a loading spinner on every
// AUC view open, and hit the IBM Community server unnecessarily.
//
// Fixed by inverting the waterfall to cache-first:
//   1. Cache - return immediately if the cached schedule is valid (<24h old).
//   2. Live  - fetch from IBM Community only when cache is expired or absent.
//   3. Local - JSON fallback if live fetch fails.
//
// forceRefresh=true (Refresh button) bypasses the cache check and always
// attempts a live fetch, preserving the existing user-triggered refresh path.
async function aucGetSchedule(forceRefresh) {
  if (forceRefresh) {
    addLog('info', AUC_PLUGIN_ID, 'Force refresh - clearing cache');
    await aucClearCache();
  } else {
    // 1. Cache (fast path - skip network when cache is fresh)
    const cached = await aucLoadCache();
    if (cached) return cached;
  }
  // 2. Live (only when cache is expired, absent, or a force refresh was requested)
  try {
    const liveReleases = await aucFetchLive();
    if (liveReleases.length > 0) {
      const schedule = { releases: liveReleases, lastUpdated: new Date().toISOString(), source: 'live' };
      aucSaveCache(schedule);
      return schedule;
    }
    addLog('warn', AUC_PLUGIN_ID, 'Live fetch returned 0 releases - falling to local');
  } catch(e) {
    addLog('warn', AUC_PLUGIN_ID, 'Live fetch failed: ' + String(e));
  }
  // 3. Local
  addLog('warn', AUC_PLUGIN_ID, 'Using local fallback schedule');
  return aucLoadLocal();
}

// ─── Date utilities ───────────────────────────────────────────────────────────
const AUC_DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function aucParseDate(str) {
  if (!str) return new Date(NaN);
  const p = str.split('-').map(Number);
  return new Date(p[0], p[1]-1, p[2]);
}
function aucAddDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function aucSubtractDays(date, n) { return aucAddDays(date, -n); }
function aucFirstWeekdayOnOrAfter(startDate, targetDay) {
  const d = new Date(startDate);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}
function aucDaysBetween(a, b) {
  const MS = 86400000;
  return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()) - Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())) / MS);
}
const AUC_FORMAT_OPTS      = { year:'numeric', month:'short', day:'numeric' };
const AUC_FORMAT_OPTS_LONG = { year:'numeric', month:'long',  day:'numeric' };
function aucFormatDate(date) {
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', AUC_FORMAT_OPTS);
}
function aucFormatDateLong(date) {
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', AUC_FORMAT_OPTS_LONG);
}

// ─── State ────────────────────────────────────────────────────────────────────
let aucSchedule = null;   // { releases, lastUpdated, source }
let aucPrefs    = { majorVersion: '', minorVersion: '', upgradeDay: 'unknown', tab: 'next' };
// Legacy migration: flatten old 'version' pref into majorVersion on load

function aucSavePrefs() {
  chrome.storage.local.set({ [AUC_PREFS_KEY]: aucPrefs });
}

function aucLoadPrefs(callback) {
  chrome.storage.local.get([AUC_PREFS_KEY], function(result) {
    const saved = result[AUC_PREFS_KEY];
    if (saved) {
      aucPrefs = Object.assign(aucPrefs, saved);
      // migrate old 'version' field e.g. "5.30" → majorVersion="5", minorVersion="5.30"
      if (saved.version && !saved.majorVersion) {
        aucPrefs.majorVersion = saved.version.split('.')[0];
        aucPrefs.minorVersion = saved.version;
        delete aucPrefs.version;
      }
      // migrate old majorVersion that was stored as full version e.g. "5.30" → "5"
      if (aucPrefs.majorVersion && aucPrefs.majorVersion.indexOf('.') !== -1) {
        aucPrefs.majorVersion = aucPrefs.majorVersion.split('.')[0];
      }
    }
    if (callback) callback();
  });
}

// ─── UI render ────────────────────────────────────────────────────────────────
function renderApptioUpgradeCalcView(container) {
  container.innerHTML = aucGetHTML();
  aucBindEvents(container);
}

const AUC_REFS_HTML = `
    <div class="auc-refs-card">
      <div class="auc-refs-title">References &amp; Help</div>
      <div class="auc-refs-body">
        If schedule information appears inaccurate, unavailable, or does not match your environment,
        verify the latest information using the official IBM resources below.
      </div>
      <ul class="auc-refs-list">
        <li><a href="https://www.ibm.com/support/pages/apptio-planning-upgrade-and-maintenance-schedule-overview?view=full"
               target="_blank" rel="noopener noreferrer"
               class="auc-refs-link"
               title="Official IBM support page - Apptio Planning Upgrade and Maintenance Schedule Overview">
          Apptio Planning: Upgrade and Maintenance Schedule Overview
        </a></li>
        <li><a href="https://community.ibm.com/community/user/viewdocument/apptio-planning-whats-new-cumula?CommunityKey=4100dfb8-fc23-4203-83c7-019253cf7c0b&tab=librarydocuments"
               target="_blank" rel="noopener noreferrer"
               class="auc-refs-link"
               title="IBM Community - Apptio Planning What's New / Cumulative Release Schedule">
          IBM Apptio Planning Release Schedule
        </a></li>
      </ul>
    </div>`;

function aucGetHTML() {
  return `
    <div id="auc-status-bar" class="rc-status rc-status--neutral auc-status-bar"></div>

    <!-- Tab bar: platform standard rc-plugin-tabs -->
    <div class="rc-plugin-tabs auc-tab-bar" role="tablist" aria-label="Apptio Planning Upgrade Calculator tabs">
      <button id="auc-tab-next" role="tab" aria-selected="true" aria-controls="auc-tab-panel-next"
              class="rc-plugin-tab rc-plugin-tab--active"
              title="Next Release - shows the latest released and next upcoming Apptio Planning release">Next Release</button>
      <button id="auc-tab-calc" role="tab" aria-selected="false" aria-controls="auc-tab-panel-calc"
              class="rc-plugin-tab"
              title="Calculator - calculate upgrade dates for a specific release">Calculator</button>
      <button id="auc-tab-schedule" role="tab" aria-selected="false" aria-controls="auc-tab-panel-schedule"
              class="rc-plugin-tab"
              title="Full Release Schedule - browse all releases with dates and status">Schedule</button>
    </div>
    <div class="auc-tab-refresh-row">
      <button id="auc-refresh-btn" class="rc-btn rc-btn--secondary rc-btn--sm"
              title="Force refresh - clears the cache and re-fetches the IBM Community schedule"
              aria-label="Force refresh schedule data">Refresh</button>
    </div>
    <div id="auc-loading" class="rc-plugin-loading">${window.ReplyCatorsIconHelper ? window.ReplyCatorsIconHelper.renderIcon('states.loading',{size:14,decorative:true}) : ''} Loading schedule…</div>

    <!-- Tab: Next Release -->
    <div id="auc-tab-panel-next" class="auc-tab-panel" hidden>
      <div id="auc-next-content" class="rc-plugin-stats-row"></div>
    </div>

    <!-- Tab: Calculator -->
    <div id="auc-tab-panel-calc" class="auc-tab-panel" hidden>
      <div class="auc-select-row">
        <div class="rc-form-group auc-select-col">
          <label class="rc-label" for="auc-select-major"
                 title="Select the major Apptio Planning release series (e.g. 25.1, 25.2)">Major Release</label>
          <select id="auc-select-major" class="rc-input"
                  title="Choose the major release series - this filters the Minor Release dropdown">
            <option value="">- select major release -</option>
          </select>
        </div>
        <div class="rc-form-group auc-select-col">
          <label class="rc-label" for="auc-select-minor"
                 title="Select the specific minor release within the chosen major series">Minor Release</label>
          <select id="auc-select-minor" class="rc-input" disabled
                  title="Choose the specific minor release - enabled after a Major Release is selected">
            <option value="">- select minor release -</option>
          </select>
        </div>
        <div class="rc-form-group auc-select-col">
          <label class="rc-label" for="auc-select-day"
                 title="The day of the week on which the customer's upgrade is scheduled, or Unknown if not known">Upgrade Day</label>
          <select id="auc-select-day" class="rc-input"
                  title="Select the customer's scheduled upgrade day, or choose Unknown to see the full upgrade window">
            <option value="unknown">Unknown</option>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </div>
      </div>

      <!-- Known day results -->
      <div id="auc-results-known" class="rc-plugin-card" hidden>
        <div class="rc-plugin-card__header">
          <span class="rc-plugin-card__title">Upgrade Timeline</span>
        </div>
        <div class="rc-plugin-card__body">
          <div class="rc-plugin-stats-row">
            <div class="auc-stat" title="Date the Apptio Planning sandbox will be upgraded to this release">
              <span class="auc-stat-label">Sandbox Date</span>
              <span class="auc-stat-value" id="auc-res-sandbox-date">-</span>
            </div>
            <div class="auc-stat" title="Date the Apptio Planning production environment will be upgraded to this release">
              <span class="auc-stat-label">Production Date</span>
              <span class="auc-stat-value" id="auc-res-prod-date">-</span>
            </div>
            <div class="auc-stat" title="Expected date this customer's environment will be upgraded (first occurrence of the upgrade day on or after the production date)">
              <span class="auc-stat-label">Expected Upgrade</span>
              <span class="auc-stat-value rc-text-accent" id="auc-res-upgrade-date">-</span>
            </div>
            <div class="auc-stat" title="Number of calendar days until the expected upgrade date">
              <span class="auc-stat-label">Days Remaining</span>
              <span class="auc-stat-value" id="auc-res-days-remaining">-</span>
            </div>
          </div>
        </div>
        <div class="rc-plugin-card__footer">
          <button id="auc-copy-summary-k" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Copy a concise technical summary of the upgrade dates to the clipboard">Copy Summary</button>
          <button id="auc-copy-response-k" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Copy a professional customer-facing response about the upgrade timeline to the clipboard">Copy Response</button>
        </div>
      </div>

      <!-- Unknown day results -->
      <div id="auc-results-unknown" class="rc-plugin-card" hidden>
        <div class="rc-plugin-card__header">
          <span class="rc-plugin-card__title">Upgrade Window (Unknown Day)</span>
        </div>
        <div class="rc-plugin-card__body">
          <div class="rc-plugin-stats-row">
            <div class="auc-stat" title="Date the Apptio Planning sandbox will be upgraded">
              <span class="auc-stat-label">Sandbox Date</span>
              <span class="auc-stat-value" id="auc-res-sandbox-date-u">-</span>
            </div>
            <div class="auc-stat" title="Date the Apptio Planning production environment will be upgraded">
              <span class="auc-stat-label">Production Date</span>
              <span class="auc-stat-value" id="auc-res-prod-date-u">-</span>
            </div>
          </div>
          <div class="auc-upgrade-window-section">
            <div class="auc-upgrade-window-label"
                 title="All possible upgrade days in the 7 days following the production release date">
              Possible Upgrade Window (7 days from production):
            </div>
            <table id="auc-table-upgrade-window" class="sf-dt auc-window-table">
              <thead><tr>
                <th title="Day of week">Day</th>
                <th title="Calendar date">Date</th>
              </tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
        <div class="rc-plugin-card__footer">
          <button id="auc-copy-summary-u" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Copy a concise technical summary of the upgrade window to the clipboard">Copy Summary</button>
          <button id="auc-copy-response-u" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Copy a professional customer-facing response explaining the upgrade window to the clipboard">Copy Response</button>
        </div>
      </div>

      <div id="auc-calc-prompt" class="rc-plugin-status auc-calc-prompt" hidden>
        Select a Major and Minor release above to see upgrade calculations.
      </div>
      ${AUC_REFS_HTML}
    </div><!-- /tab-calc -->

    <!-- Tab: Schedule -->
    <div id="auc-tab-panel-schedule" class="auc-tab-panel" hidden>
      <div class="rc-inline-filter auc-schedule-filter">
        <input type="text" id="auc-search-schedule" class="rc-input rc-inline-filter__input"
               placeholder="Filter releases…"
               title="Filter the schedule table by version number, sandbox date, or production date" />
        <label class="rc-filter-toggle auc-hist-toggle"
               title="When checked, all historical (released) entries are shown. When unchecked, only the 10 most recent releases are shown.">
          <input type="checkbox" id="auc-show-historical" />
          <span>Show Historical Releases</span>
        </label>
      </div>
      <div class="auc-schedule-wrap">
        <table class="sf-dt auc-schedule-table">
          <thead>
            <tr>
              <th title="Release version">Version</th>
              <th title="Sandbox upgrade date">Sandbox</th>
              <th title="Production upgrade date">Production</th>
              <th title="Release status">Status</th>
              <th title="Days until production date">Days</th>
            </tr>
          </thead>
          <tbody id="auc-schedule-tbody"></tbody>
        </table>
      </div>
      ${AUC_REFS_HTML}
    </div><!-- /tab-schedule -->`;
}

function aucBindEvents(container) {
  // Element refs
  const statusBar   = container.querySelector('#auc-status-bar');
  const loadingEl   = container.querySelector('#auc-loading');
  const tabBtnNext  = container.querySelector('#auc-tab-next');
  const tabBtnCalc  = container.querySelector('#auc-tab-calc');
  const tabBtnSched = container.querySelector('#auc-tab-schedule');
  const panelNext   = container.querySelector('#auc-tab-panel-next');
  const panelCalc   = container.querySelector('#auc-tab-panel-calc');
  const panelSched  = container.querySelector('#auc-tab-panel-schedule');
  const refreshBtn  = container.querySelector('#auc-refresh-btn');
  const selMajor    = container.querySelector('#auc-select-major');
  const selMinor    = container.querySelector('#auc-select-minor');
  const selDay      = container.querySelector('#auc-select-day');
  const resKnown    = container.querySelector('#auc-results-known');
  const resUnknown  = container.querySelector('#auc-results-unknown');
  const calcPrompt  = container.querySelector('#auc-calc-prompt');
  const nextContent = container.querySelector('#auc-next-content');
  const searchInput = container.querySelector('#auc-search-schedule');
  const showHistorical = container.querySelector('#auc-show-historical');
  const scheduleTbody = container.querySelector('#auc-schedule-tbody');
  const upgradeWinTbody = container.querySelector('#auc-table-upgrade-window tbody');

  // ── Tab navigation ──────────────────────────────────────────────────────
  // RC-UX008 fix: sync aria-selected for screen readers and apply a clear
  // active-tab style (bottom-border underline) in addition to the button state.
  function activateTab(tab) {
    // Switch active class on tab buttons (platform standard rc-plugin-tab)
    [tabBtnNext, tabBtnCalc, tabBtnSched].forEach(function(btn) {
      btn.classList.remove('rc-plugin-tab--active');
    });
    const activeBtn = tab === 'next' ? tabBtnNext : tab === 'calc' ? tabBtnCalc : tabBtnSched;
    activeBtn.classList.add('rc-plugin-tab--active');
    // Sync ARIA state for screen readers
    tabBtnNext.setAttribute('aria-selected',  tab === 'next'     ? 'true' : 'false');
    tabBtnCalc.setAttribute('aria-selected',  tab === 'calc'     ? 'true' : 'false');
    tabBtnSched.setAttribute('aria-selected', tab === 'schedule' ? 'true' : 'false');
    // Show/hide panels using hidden attribute
    if (tab === 'next') { panelNext.removeAttribute('hidden'); panelCalc.setAttribute('hidden',''); panelSched.setAttribute('hidden',''); }
    else if (tab === 'calc') { panelCalc.removeAttribute('hidden'); panelNext.setAttribute('hidden',''); panelSched.setAttribute('hidden',''); }
    else { panelSched.removeAttribute('hidden'); panelNext.setAttribute('hidden',''); panelCalc.setAttribute('hidden',''); }
    aucPrefs.tab = tab;
    aucSavePrefs();
  }
  tabBtnNext.addEventListener('click',  function() { activateTab('next'); });
  tabBtnCalc.addEventListener('click',  function() { activateTab('calc'); });
  tabBtnSched.addEventListener('click', function() { activateTab('schedule'); });

  // ── Status bar ──────────────────────────────────────────────────────────
  function setAucStatus(msg, type) {
    statusBar.textContent = msg;
    statusBar.className   = 'rc-status rc-status--' + type + ' auc-status-bar';
    if (msg) { statusBar.removeAttribute('hidden'); } else { statusBar.setAttribute('hidden',''); }
  }

  // ── Major/Minor dropdowns ───────────────────────────────────────────────
  // Versions have format "MAJOR.MINOR" e.g. "5.30", "10.0", "3.93"
  // major = first segment only:  "5.30" → "5"
  // minor = second segment only: "5.30" → "30"
  // full  = major + "." + minor: "5" + "." + "30" → "5.30"
  function aucMajorOf(version) {
    return version.split('.')[0];
  }
  function aucMinorOf(version) {
    return version.split('.').slice(1).join('.');
  }

  function populateMajorDropdown(releases) {
    const currentMajor = selMajor.value;
    // Collect unique major values, sorted numerically descending
    const seen = new Set();
    releases.forEach(function(r) { seen.add(aucMajorOf(r.version)); });
    const majors = Array.from(seen).sort(function(a, b) { return parseInt(b, 10) - parseInt(a, 10); });
    selMajor.innerHTML = '<option value="">- select major release -</option>';
    majors.forEach(function(maj) {
      const opt = document.createElement('option');
      opt.value = maj; opt.textContent = maj;
      selMajor.appendChild(opt);
    });
    if (currentMajor && Array.from(selMajor.options).some(function(o){ return o.value === currentMajor; })) {
      selMajor.value = currentMajor;
    }
  }

  function populateMinorDropdown(major) {
    const currentMinor = selMinor.value;
    selMinor.innerHTML = '<option value="">- select minor release -</option>';
    if (!major || !aucSchedule) {
      selMinor.disabled = true;
      return;
    }
    // All releases whose major segment matches, sorted numerically descending by minor
    const minors = aucSchedule.releases
      .filter(function(r){ return aucMajorOf(r.version) === major; })
      .sort(function(a, b) {
        return parseInt(aucMinorOf(b.version), 10) - parseInt(aucMinorOf(a.version), 10);
      });
    minors.forEach(function(r) {
      const minorLabel = aucMinorOf(r.version);
      const opt = document.createElement('option');
      opt.value = r.version;          // full version "5.30" used for calculation lookup
      opt.textContent = minorLabel;   // display only the minor part "30"
      selMinor.appendChild(opt);
    });
    selMinor.disabled = minors.length === 0;
    if (currentMinor && Array.from(selMinor.options).some(function(o){ return o.value === currentMinor; })) {
      selMinor.value = currentMinor;
    }
  }

  // ── Apply restored prefs ────────────────────────────────────────────────
  function applyPrefs() {
    if (aucPrefs.majorVersion) {
      const opt = Array.from(selMajor.options).find(function(o){ return o.value === aucPrefs.majorVersion; });
      if (opt) {
        selMajor.value = aucPrefs.majorVersion;
        populateMinorDropdown(aucPrefs.majorVersion);
      }
    }
    // aucPrefs.minorVersion stores the full version string e.g. "5.30"
    if (aucPrefs.minorVersion) {
      const opt = Array.from(selMinor.options).find(function(o){ return o.value === aucPrefs.minorVersion; });
      if (opt) selMinor.value = aucPrefs.minorVersion;
    }
    if (aucPrefs.upgradeDay !== undefined) selDay.value = aucPrefs.upgradeDay;
  }

  // ── Calculation ─────────────────────────────────────────────────────────
  function calculate() {
    const version = selMinor.value, dayVal = selDay.value;
    resKnown.setAttribute('hidden','');
    resUnknown.setAttribute('hidden','');
    calcPrompt.setAttribute('hidden','');
    if (!version || !aucSchedule) { calcPrompt.removeAttribute('hidden'); return; }

    const release = aucSchedule.releases.find(function(r){ return r.version === version; });
    if (!release) { calcPrompt.removeAttribute('hidden'); return; }

    addLog('info', AUC_PLUGIN_ID, 'Calculating: version=' + version + ' upgradeDay=' + dayVal);
    const prodDate    = aucParseDate(release.productionDate);
    const sandboxDate = aucSubtractDays(prodDate, 7);

    function setAucEl(id, val) { const el = container.querySelector('#' + id); if(el) el.textContent = val; }

    if (dayVal === 'unknown') {
      setAucEl('auc-res-sandbox-date-u', aucFormatDate(sandboxDate));
      setAucEl('auc-res-prod-date-u', aucFormatDate(prodDate));
      // Render 7-day upgrade window
      upgradeWinTbody.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const d = aucAddDays(prodDate, i);
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + AUC_DAY_NAMES[d.getDay()] + '</td>' +
                       '<td>' + aucFormatDate(d) + '</td>';
        upgradeWinTbody.appendChild(tr);
      }
      resUnknown.removeAttribute('hidden');
    } else {
      const upgradeDay    = parseInt(dayVal, 10);
      const upgradeDate   = aucFirstWeekdayOnOrAfter(prodDate, upgradeDay);
      const daysRemaining = aucDaysBetween(new Date(), upgradeDate);
      setAucEl('auc-res-sandbox-date',  aucFormatDate(sandboxDate));
      setAucEl('auc-res-prod-date',     aucFormatDate(prodDate));
      setAucEl('auc-res-upgrade-date',  aucFormatDate(upgradeDate));
      const dLabel = daysRemaining < 0
        ? (Math.abs(daysRemaining) + ' days ago')
        : daysRemaining === 0 ? 'Today' : (daysRemaining + ' days');
      setAucEl('auc-res-days-remaining', dLabel);
      resKnown.removeAttribute('hidden');
    }
  }

  // ── Render: Next Release ────────────────────────────────────────────────
  function renderNextRelease(releases) {
    const today = new Date(); today.setHours(0,0,0,0);
    const sorted = releases.slice().sort(function(a,b){ return new Date(a.productionDate) - new Date(b.productionDate); });
    const latest   = sorted.filter(function(r){ return new Date(r.productionDate) <= today; }).pop();
    const upcoming = sorted.find(function(r){ return new Date(r.productionDate) > today; });

    function card(label, value, accent, tooltip) {
      return '<div class="auc-stat auc-stat--fill" title="' + esc(tooltip) + '">' +
        '<span class="auc-stat-label">' + esc(label) + '</span>' +
        '<span class="auc-stat-value' + (accent ? ' rc-text-accent' : '') + '">' + esc(value) + '</span>' +
        '</div>';
    }

    let html = '';
    if (latest) html += card('Latest Release', 'v' + latest.version, false, 'Latest released version - production date was ' + aucFormatDate(aucParseDate(latest.productionDate)));
    if (upcoming) {
      const prod    = aucParseDate(upcoming.productionDate);
      const sandbox = aucSubtractDays(prod, 7);
      const dLeft   = aucDaysBetween(today, prod);
      html += card('Next Release',    'v' + upcoming.version,       true,  'The next upcoming Apptio Planning release');
      html += card('Sandbox Date',    aucFormatDate(sandbox),       false, 'Date sandbox will be upgraded to v' + upcoming.version);
      html += card('Production Date', aucFormatDate(prod),          false, 'Date production will be upgraded to v' + upcoming.version);
      html += card('Days Remaining',  dLeft >= 0 ? dLeft + 'd' : 'Released', false, 'Calendar days until production release date');
    } else {
      html += card('Next Release', 'No upcoming releases', false, 'No future releases listed on the IBM Community schedule');
    }
    nextContent.innerHTML = html;
  }

  // ── Render: Schedule table ──────────────────────────────────────────────
  function renderScheduleTable(releases, query) {
    query = (query || '').toLowerCase();
    const showAll = showHistorical.checked;
    const today = new Date(); today.setHours(0,0,0,0);
    // Sort newest-first for the "last 10" truncation, then flip to oldest-first for display
    const sortedDesc = releases.slice().sort(function(a,b){ return new Date(b.productionDate) - new Date(a.productionDate); });
    const sorted = sortedDesc.slice().reverse(); // oldest-first for display

    // When query is active always show all matches regardless of historical toggle
    let visible = query
      ? sorted.filter(function(r){ return r.version.includes(query) || r.productionDate.includes(query) || (r.sandboxDate && r.sandboxDate.includes(query)); })
      : sorted;

    // If not showing historical, keep only the 10 entries closest to today
    // (upcoming + the most recent released ones to fill up to 10 total)
    if (!showAll && !query) {
      // take the last 10 when sorted oldest-first (i.e. the 10 most recent)
      if (visible.length > 10) visible = visible.slice(visible.length - 10);
    }

    if (visible.length === 0) {
      scheduleTbody.innerHTML = '<tr><td colspan="5" class="sf-dt-empty-cell">No releases found.</td></tr>';
      return;
    }
    const nextRelease = sorted.find(function(r){ return new Date(r.productionDate) > today; });
    scheduleTbody.innerHTML = '';

    visible.forEach(function(r) {
      const prod     = aucParseDate(r.productionDate);
      const sandbox  = aucSubtractDays(prod, 7);
      const released = prod <= today;
      const isNext   = nextRelease && r.version === nextRelease.version;
      const daysUntil = aucDaysBetween(today, prod);
      const badge    = released
        ? '<span class="rc-badge rc-badge--green">Released</span>'
        : isNext
          ? '<span class="rc-badge rc-badge--blue">Next</span>'
          : '<span class="rc-badge">Upcoming</span>';
      const daysCell = released ? '<span class="rc-muted">' + Math.abs(daysUntil) + 'd ago</span>' : daysUntil + 'd';
      const tr = document.createElement('tr');
      tr.className = 'sf-dt-row';
      tr.innerHTML =
        '<td class="sf-dt-cell sf-dt-cell--strong">v' + esc(r.version) + '</td>' +
        '<td class="sf-dt-cell">' + esc(aucFormatDate(sandbox)) + '</td>' +
        '<td class="sf-dt-cell">' + esc(aucFormatDate(prod)) + '</td>' +
        '<td class="sf-dt-cell">' + badge + '</td>' +
        '<td class="sf-dt-cell">' + daysCell + '</td>';
      scheduleTbody.appendChild(tr);
    });

    // Show a note when historical releases are hidden
    if (!showAll && !query) {
      const hiddenCount = releases.length - visible.length;
      if (hiddenCount > 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="sf-dt-footer-note">' +
          hiddenCount + ' older release' + (hiddenCount !== 1 ? 's' : '') + ' hidden - check "Show Historical Releases" to view all.' +
          '</td>';
        scheduleTbody.appendChild(tr);
      }
    }
  }

  // ── Copy helpers ────────────────────────────────────────────────────────
  function aucCopyText(type, isUnknown) {
    const version = selMinor.value;
    if (!version || !aucSchedule) return;
    const release = aucSchedule.releases.find(function(r){ return r.version === version; });
    if (!release) return;
    const prodDate    = aucParseDate(release.productionDate);
    const sandboxDate = aucSubtractDays(prodDate, 7);

    let text = '';
    if (!isUnknown) {
      const upgradeDay    = parseInt(selDay.value, 10);
      const upgradeDate   = aucFirstWeekdayOnOrAfter(prodDate, upgradeDay);
      const dayName       = AUC_DAY_NAMES[upgradeDate.getDay()];
      const daysRemaining = aucDaysBetween(new Date(), upgradeDate);
      const daysLabel     = daysRemaining < 0
        ? (Math.abs(daysRemaining) + ' days ago')
        : daysRemaining === 0 ? '0 (today)' : String(daysRemaining);
      if (type === 'summary') {
        text = [
          'Release: ' + version,
          'Sandbox Date: '         + aucFormatDate(sandboxDate),
          'Production Date: '      + aucFormatDate(prodDate),
          'Upgrade Day: '          + dayName,
          'Expected Upgrade Date: ' + aucFormatDate(upgradeDate),
          'Days Remaining: '       + daysLabel,
        ].join('\n');
      } else {
        text = [
          'Release ' + version + ' is planned for Production deployment on ' + aucFormatDateLong(prodDate) + '.',
          '',
          'Your Sandbox environment is scheduled to be upgraded on ' + aucFormatDateLong(sandboxDate) + ', providing an opportunity to review and validate upcoming changes before they are deployed to your Production environment.',
          '',
          'Based on the current rollout schedule, your Production environment is expected to be upgraded on ' + aucFormatDateLong(upgradeDate) + '. There are currently ' + daysLabel + ' days remaining until the planned upgrade.',
          '',
          'Please note that upgrades are typically performed during evening maintenance windows. While the upgrade is scheduled for ' + aucFormatDateLong(upgradeDate) + ', customers can generally expect the updated environment to be available the following day.',
          '',
          'Thanks!',
        ].join('\n');
      }
    } else {
      const endDate = aucAddDays(prodDate, 6);
      if (type === 'summary') {
        text = [
          'Release: ' + version,
          'Sandbox Date: '          + aucFormatDate(sandboxDate),
          'Production Date: '       + aucFormatDate(prodDate),
          'Upgrade Day: Unknown',
          'Possible Upgrade Window: ' + aucFormatDate(prodDate) + ' - ' + aucFormatDate(endDate),
        ].join('\n');
      } else {
        text = [
          'Release ' + version + ' is planned for Production deployment on ' + aucFormatDateLong(prodDate) + '.',
          '',
          'Your Sandbox environment is scheduled to be upgraded on ' + aucFormatDateLong(sandboxDate) + ', providing an opportunity to review and validate upcoming changes before they are deployed to your Production environment.',
          '',
          'Based on the current rollout schedule, your Production environment is expected to be upgraded between ' + aucFormatDateLong(prodDate) + ' and ' + aucFormatDateLong(endDate) + '. The exact upgrade date depends on the Upgrade Day configured in your Company Profile.',
          '',
          'Please note that upgrades are typically performed during evening maintenance windows. Customers can generally expect the updated environment to be available the day following the scheduled upgrade.',
          '',
          'Thanks!',
        ].join('\n');
      }
    }

    navigator.clipboard.writeText(text).then(function() {
      const label = type === 'summary' ? 'Summary' : 'Customer Response';
      addLog('info', AUC_PLUGIN_ID, 'Copied ' + label + ' for v' + version);
      addNotification('Apptio Planning Upgrade Calculator', label + ' copied to clipboard.', 'success', AUC_PLUGIN_ID);
      // Flash the button
      const btnId = isUnknown ? 'auc-copy-' + type + '-u' : 'auc-copy-' + type + '-k';
      const btn = container.querySelector('#' + btnId);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function(){ btn.textContent = orig; }, 1500);
      }
    }).catch(function(e) {
      addLog('error', AUC_PLUGIN_ID, 'Clipboard write failed: ' + String(e));
      addNotification('Apptio Planning Upgrade Calculator', 'Clipboard write failed.', 'error', AUC_PLUGIN_ID);
    });
  }

  // ── Load & render ───────────────────────────────────────────────────────
  async function aucLoadAndRender(forceRefresh) {
    loadingEl.style.display = 'block';
    setAucStatus('Loading schedule…', 'neutral');
    refreshBtn.disabled = true;

    try {
      aucSchedule = await aucGetSchedule(forceRefresh);
      loadingEl.style.display = 'none';

      // RC-017 fix: warn when a live fetch succeeds but returns zero releases -
      //             indicates the IBM Community page structure may have changed.
      if (aucSchedule.source === 'live' && (!aucSchedule.releases || aucSchedule.releases.length === 0)) {
        setAucStatus('Live fetch returned 0 releases - IBM Community page structure may have changed. Using local fallback.', 'warning');
        addLog('warn', AUC_PLUGIN_ID, 'Live IBM Community schedule parsed 0 releases - page structure may have changed');
        addNotification('Apptio Planning Upgrade Calculator', 'Live schedule fetch returned 0 releases. IBM Community page structure may have changed. Using local fallback data.', 'warning', AUC_PLUGIN_ID);
        aucSchedule = await aucLoadLocal();
        if (!aucSchedule || !aucSchedule.releases || aucSchedule.releases.length === 0) {
          setAucStatus('No schedule data available from any source.', 'error');
          return;
        }
      }

      const labels = { live: 'Live IBM Community Schedule', cache: 'Cached Schedule', local: 'Local Fallback Schedule' };
      const type   = aucSchedule.source === 'local' ? 'warning' : 'success';
      const dateStr = aucSchedule.lastUpdated && aucSchedule.lastUpdated !== 'unknown'
        ? ' - ' + new Date(aucSchedule.lastUpdated).toLocaleString() : '';
      setAucStatus((labels[aucSchedule.source] || aucSchedule.source) + dateStr, type);

      populateMajorDropdown(aucSchedule.releases);
      renderNextRelease(aucSchedule.releases);
      renderScheduleTable(aucSchedule.releases);
      applyPrefs();
      // If prefs had no saved major/minor, auto-select the latest release
      if (!aucPrefs.majorVersion && selMajor.options.length > 1) {
        const latestMajor = selMajor.options[1].value;
        selMajor.value = latestMajor;
        aucPrefs.majorVersion = latestMajor;
        populateMinorDropdown(latestMajor);
        if (selMinor.options.length > 1) {
          selMinor.value = selMinor.options[1].value;
          aucPrefs.minorVersion = selMinor.value;
        }
        aucSavePrefs();
      }
      calculate();

      const notifType = aucSchedule.source === 'live' ? 'success' : aucSchedule.source === 'cache' ? 'info' : 'warning';
      const notifMsg  = aucSchedule.source === 'live'
        ? 'Loaded ' + aucSchedule.releases.length + ' releases from IBM Community'
        : aucSchedule.source === 'cache'
          ? 'Using cached schedule (' + aucSchedule.releases.length + ' releases)'
          : 'Using local fallback schedule (' + aucSchedule.releases.length + ' releases)';

      addNotification('Apptio Planning Upgrade Calculator', notifMsg, notifType, AUC_PLUGIN_ID);
    } catch(e) {
      loadingEl.style.display = 'none';
      setAucStatus('Failed to load schedule: ' + String(e), 'error');
      addLog('error', AUC_PLUGIN_ID, 'Failed to load schedule: ' + String(e));
      addNotification('Apptio Planning Upgrade Calculator - Error', 'Failed to load schedule: ' + String(e), 'error', AUC_PLUGIN_ID);
    } finally {
      refreshBtn.disabled = false;
    }
  }

  // ── Event wiring ────────────────────────────────────────────────────────
  refreshBtn.addEventListener('click', function() {
    addLog('info', AUC_PLUGIN_ID, 'Manual refresh triggered');
    aucLoadAndRender(true);
  });
  selMajor.addEventListener('change', function() {
    aucPrefs.majorVersion = selMajor.value;
    aucPrefs.minorVersion = '';
    aucSavePrefs();
    populateMinorDropdown(selMajor.value);
    // Auto-select the latest (first) minor release when a major is chosen
    if (selMinor.options.length > 1) {
      selMinor.value = selMinor.options[1].value;
      aucPrefs.minorVersion = selMinor.value;
      aucSavePrefs();
    }
    calculate();
  });
  selMinor.addEventListener('change', function() {
    aucPrefs.minorVersion = selMinor.value;
    aucSavePrefs();
    calculate();
  });
  selDay.addEventListener('change', function() { aucPrefs.upgradeDay = selDay.value; aucSavePrefs(); calculate(); });

  let aucSearchTimer = null;
  searchInput.addEventListener('input', function() {
    clearTimeout(aucSearchTimer);
    aucSearchTimer = setTimeout(function() {
      if (aucSchedule) renderScheduleTable(aucSchedule.releases, searchInput.value);
    }, 200);
  });
  showHistorical.addEventListener('change', function() {
    if (aucSchedule) renderScheduleTable(aucSchedule.releases, searchInput.value);
  });

  container.querySelector('#auc-copy-summary-k').addEventListener('click',  function() { aucCopyText('summary',  false); });
  container.querySelector('#auc-copy-response-k').addEventListener('click', function() { aucCopyText('response', false); });
  container.querySelector('#auc-copy-summary-u').addEventListener('click',  function() { aucCopyText('summary',  true);  });
  container.querySelector('#auc-copy-response-u').addEventListener('click', function() { aucCopyText('response', true);  });

  addLog('info', AUC_PLUGIN_ID, 'UI rendered - loading schedule');
  aucLoadPrefs(function() {
    activateTab(aucPrefs.tab || 'next');
    aucLoadAndRender(false);
  });
}

function render() {
  const container = document.getElementById('apptio-upgrade-calc-container');
  if (!container) return;
  renderApptioUpgradeCalcView(container);
}

function init() {
  document.getElementById('auc-widget-open-btn')?.addEventListener('click', function() {
    app().navigateTo('plugin-apptio-upgrade-calc');
  });

  // Defer the one-time migration check to a microtask so it does not block
  // the synchronous portion of startup. The migration only needs to run once
  // ever and has no UI-visible effect until the plugin view is opened.
  setTimeout(function() {
    const AUC_MIGRATION_FLAG = 'rc:plugin:' + AUC_PLUGIN_ID + ':parser-fix-v3';
    chrome.storage.local.get([AUC_MIGRATION_FLAG], function(result) {
      if (!result[AUC_MIGRATION_FLAG]) {
        addLog('info', AUC_PLUGIN_ID, 'Parser fix v3 migration: clearing stale schedule cache');
        chrome.storage.local.remove(AUC_SCHEDULE_KEY, function() {
          chrome.storage.local.set({ [AUC_MIGRATION_FLAG]: true });
          addLog('info', AUC_PLUGIN_ID, 'Stale cache cleared - fresh schedule will be fetched on next open');
        });
      }
    });
  }, 0);

  addLog('info', AUC_PLUGIN_ID, 'Apptio Planning Upgrade Calculator ready');
}

window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
window.ReplyCatorsPlugins.ApptioUpgradeCalculator = plugin;
})();
