/**
 * UpgradeScheduleService.ts
 *
 * Retrieves, parses, caches, and serves the Apptio Planning release schedule.
 *
 * Priority:
 *   1. Live IBM Community page  (always tried first)
 *   2. Cached schedule          (chrome.storage.local — if < TTL hours old and cache valid)
 *   3. Local fallback           (schedule.json bundled with extension)
 *
 * QA Hardening Applied:
 *   - Version pattern anchored to the Apptio x.y format (guards against matching
 *     unrelated numbers like phone numbers, build IDs, etc.)
 *   - Cache validation: checks for presence, type, release count, and date validity
 *   - Cache corruption handled: malformed cache silently discarded, falls through to local
 *   - Both sandbox and production dates validated before accepting a release entry
 *   - Deduplication uses Map to keep first-seen entry per version
 *   - Three text-extraction strategies: structured table > paragraph/text-block > full body scan
 *   - Configurable TTL (defaulting to 24 h) passed in from caller
 *   - Manual refresh clears cache then re-runs full waterfall
 */

import type { IStorageService, ILogger } from '@replycators/sdk';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ReleaseEntry {
  version: string;       // e.g. "5.28"
  sandboxDate: string;   // YYYY-MM-DD
  productionDate: string; // YYYY-MM-DD
}

export type ScheduleSource = 'live' | 'cache' | 'local';

export interface Schedule {
  releases: ReleaseEntry[];
  lastUpdated: string;   // ISO timestamp
  source: ScheduleSource;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const IBM_COMMUNITY_URL =
  'https://community.ibm.com/community/user/viewdocument/apptio-planning-whats-new-cumula' +
  '?CommunityKey=4100dfb8-fc23-4203-83c7-019253cf7c0b&tab=librarydocuments';

const CACHE_STORAGE_KEY = 'schedule-cache';
const DEFAULT_TTL_MS    = 24 * 60 * 60 * 1000; // 24 h
const FALLBACK_SCHEDULE_PATH = 'plugins/apptio-upgrade-calculator/apptio-schedule.json';

// ─── Version Pattern ──────────────────────────────────────────────────────────
//
// Matches "X.Y", "X.YY", or "X.YYY" for any major version ≥ 3 (1-2 digits).
// The lower bound of 3 excludes common noise numbers that appear in web pages
// (e.g. "1.5 GHz", "2.4 GHz") while supporting all known and future Apptio
// Planning major versions (3.x, 5.x, 6.x, 7.x, 8.x, 9.x, 10.x, 11.x …).
// Minor part is 1–3 digits so "6.0", "6.1", "10.0" are all valid.
// The mandatory \b word-boundaries prevent matching mid-string sequences.
//
const VERSION_RE = /\b((?:[3-9]|[1-9]\d)\.\d{1,3})\b/;
const VERSION_VALUE_RE = /^(?:[3-9]|[1-9]\d)\.\d{1,3}$/;

// ─── Date Extraction Helpers ──────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
};

function parseNamedDate(month: string, day: string, year: string): string | null {
  const m = MONTH_MAP[month.toLowerCase()];
  if (!m) return null;
  const d = parseInt(day, 10);
  if (isNaN(d) || d < 1 || d > 31) return null;
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 2020 || y > 2040) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractDates(text: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  function add(d: string) {
    if (d && !seen.has(d)) { seen.add(d); results.push(d); }
  }

  // Named month: "July 13, 2026" or "Jul 13 2026"
  const namedRe = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(text)) !== null) {
    const d = parseNamedDate(m[1], m[2], m[3]);
    if (d) add(d);
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashRe = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  while ((m = slashRe.exec(text)) !== null) {
    const mo = parseInt(m[1], 10), dy = parseInt(m[2], 10), yr = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31 && yr >= 2020 && yr <= 2040) {
      add(`${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`);
    }
  }

  // ISO YYYY-MM-DD
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = isoRe.exec(text)) !== null) {
    const yr = parseInt(m[1], 10), mo = parseInt(m[2], 10), dy = parseInt(m[3], 10);
    if (yr >= 2020 && yr <= 2040 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
      add(`${m[1]}-${m[2]}-${m[3]}`);
    }
  }

  return results;
}

function extractVersion(text: string): string | null {
  const m = text.match(VERSION_RE);
  return m ? m[1] : null;
}

function isValidDateStr(s: string): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [year, month, day] = s.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function isReleaseEntry(value: unknown): value is ReleaseEntry {
  if (!value || typeof value !== 'object') return false;
  const release = value as Record<string, unknown>;
  return typeof release.version === 'string' && VERSION_VALUE_RE.test(release.version) &&
    typeof release.sandboxDate === 'string' && isValidDateStr(release.sandboxDate) &&
    typeof release.productionDate === 'string' && isValidDateStr(release.productionDate);
}

function addDaysToStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  // Format local calendar components; toISOString() can shift the date by timezone.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Parsing Strategies ───────────────────────────────────────────────────────

function buildEntryFromCells(cells: string[]): ReleaseEntry | null {
  const allText = cells.join(' ');
  const version = extractVersion(allText);
  if (!version) return null;

  const dates = extractDates(allText);
  if (dates.length < 1) return null;

  let sandboxDate: string | null = null;
  let productionDate: string | null = null;

  if (dates.length >= 2) {
    sandboxDate    = dates[0];
    productionDate = dates[1];
  } else {
    const lower = allText.toLowerCase();
    if (lower.includes('sandbox')) {
      sandboxDate    = dates[0];
      productionDate = addDaysToStr(dates[0], 7);
    } else {
      productionDate = dates[0];
      sandboxDate    = addDaysToStr(dates[0], -7);
    }
  }

  if (!productionDate || !isValidDateStr(productionDate)) return null;
  if (!sandboxDate    || !isValidDateStr(sandboxDate))    {
    sandboxDate = addDaysToStr(productionDate, -7);
  }

  return { version, sandboxDate, productionDate };
}

function parseFromTables(doc: Document): ReleaseEntry[] {
  const releases: ReleaseEntry[] = [];
  const tables = doc.querySelectorAll('table');
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'))
        .map(c => (c as HTMLElement).innerText || c.textContent || '');
      const entry = buildEntryFromCells(cells);
      if (entry) releases.push(entry);
    }
  }
  return deduplicateReleases(releases);
}

function parseFromParagraphs(doc: Document): ReleaseEntry[] {
  const releases: ReleaseEntry[] = [];
  // Try list items and paragraphs which sometimes contain release info
  const candidates = doc.querySelectorAll('li, p, td, div');
  for (const el of candidates) {
    const text = (el as HTMLElement).innerText || el.textContent || '';
    const version = extractVersion(text);
    if (!version) continue;
    const dates = extractDates(text);
    if (dates.length < 1) continue;
    const entry = buildEntryFromCells([text]);
    if (entry) releases.push(entry);
  }
  return deduplicateReleases(releases);
}

function parseFromBodyText(text: string): ReleaseEntry[] {
  const releases: ReleaseEntry[] = [];
  const lines = text.split(/[\n\r]+/);
  for (const line of lines) {
    const version = extractVersion(line);
    if (!version) continue;
    const dates = extractDates(line);
    if (dates.length < 1) continue;
    const entry = buildEntryFromCells([line]);
    if (entry) releases.push(entry);
  }
  return deduplicateReleases(releases);
}

function deduplicateReleases(releases: ReleaseEntry[]): ReleaseEntry[] {
  const seen = new Map<string, ReleaseEntry>();
  for (const r of releases) {
    if (!seen.has(r.version)) seen.set(r.version, r);
  }
  return Array.from(seen.values()).sort(
    (a, b) => compareVersions(a.version, b.version)
  );
}

function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor] = a.split('.').map(Number);
  const [bMajor, bMinor] = b.split('.').map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

function parseReleasesFromHtml(html: string): ReleaseEntry[] {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');

  // Strategy 1: structured table
  const tableReleases = parseFromTables(doc);
  if (tableReleases.length > 0) return tableReleases;

  // Strategy 2: paragraphs / list items
  const paraReleases = parseFromParagraphs(doc);
  if (paraReleases.length > 0) return paraReleases;

  // Strategy 3: full body text scan
  const bodyText = doc.body ? (doc.body.innerText || doc.body.textContent || '') : html;
  return parseFromBodyText(bodyText);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the live IBM Community schedule.
 * Throws on network or HTTP error — caller handles fallback.
 */
async function fetchLiveSchedule(logger: ILogger): Promise<ReleaseEntry[]> {
  logger.info('Fetching live schedule from IBM Community');
  const response = await fetch(IBM_COMMUNITY_URL, {
    method:  'GET',
    cache:   'no-store',
    headers: { Accept: 'text/html' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const html     = await response.text();
  logger.debug(`Received ${html.length} bytes from IBM Community`);
  const releases = parseReleasesFromHtml(html);
  logger.info(`Parsed ${releases.length} releases from live IBM Community page`);
  return releases;
}

/**
 * Load cached schedule from plugin storage.
 * Returns null if cache is absent, invalid, expired, or corrupt.
 */
async function loadCachedSchedule(
  storage: IStorageService,
  logger: ILogger,
  ttlMs: number
): Promise<Schedule | null> {
  try {
    const cached = await storage.get<Schedule>(CACHE_STORAGE_KEY);
    if (!cached)                               { return null; }
    if (!cached.releases || !Array.isArray(cached.releases)) {
      logger.warn('Cache validation failed: missing or malformed releases array');
      return null;
    }
    if (cached.releases.length === 0)          {
      logger.warn('Cache validation failed: releases array is empty');
      return null;
    }
    if (!cached.releases.every(isReleaseEntry)) {
      logger.warn('Cache validation failed: invalid release entry');
      return null;
    }
    if (!cached.lastUpdated)                   {
      logger.warn('Cache validation failed: missing lastUpdated field');
      return null;
    }
    const updatedAt = new Date(cached.lastUpdated).getTime();
    const ageMs = Date.now() - updatedAt;
    if (isNaN(ageMs))                          {
      logger.warn('Cache validation failed: lastUpdated is not a valid date');
      return null;
    }
    if (ageMs < 0 || ageMs > Math.max(0, ttlMs)) {
      logger.info(`Cache expired (age ${Math.round(ageMs / 60000)} min, TTL ${Math.round(ttlMs / 60000)} min)`);
      return null;
    }
    logger.info(`Cache hit (age ${Math.round(ageMs / 60000)} min): ${cached.releases.length} releases`);
    return { ...cached, source: 'cache' };
  } catch (err) {
    logger.warn('Cache load error (treating as cache miss): ' + String(err));
    return null;
  }
}

/**
 * Persist schedule to plugin storage.
 */
async function cacheSchedule(
  storage: IStorageService,
  schedule: Schedule,
  logger: ILogger
): Promise<void> {
  try {
    await storage.set(CACHE_STORAGE_KEY, schedule);
    logger.debug('Schedule cached successfully');
  } catch (err) {
    logger.warn('Failed to cache schedule: ' + String(err));
  }
}

/**
 * Load the bundled local fallback schedule (schedule.json).
 */
async function loadLocalSchedule(logger: ILogger): Promise<Schedule> {
  try {
    const url  = chrome.runtime.getURL(FALLBACK_SCHEDULE_PATH);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: unknown = await resp.json();
    const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const releases = Array.isArray(record.releases)
      ? record.releases.filter(isReleaseEntry)
      : [];
    logger.info(`Loaded ${releases.length} releases from local fallback schedule`);
    return {
      releases,
      lastUpdated: typeof record.lastUpdated === 'string'
        ? record.lastUpdated
        : new Date().toISOString(),
      source: 'local',
    };
  } catch (err) {
    logger.error('Failed to load local fallback schedule: ' + String(err));
    return { releases: [], lastUpdated: new Date().toISOString(), source: 'local' };
  }
}

/**
 * Main schedule retrieval function.
 *
 * Waterfall:
 *   1. Live IBM Community fetch → cache result → return
 *   2. Valid cache → return
 *   3. Local fallback → return
 */
export async function getSchedule(
  storage: IStorageService,
  logger: ILogger,
  ttlMs = DEFAULT_TTL_MS
): Promise<Schedule> {
  logger.info('getSchedule() — starting retrieval waterfall');

  // ── 1. Live fetch ────────────────────────────────────────────────────────
  try {
    const liveReleases = await fetchLiveSchedule(logger);
    if (liveReleases.length > 0) {
      const schedule: Schedule = {
        releases:    liveReleases,
        lastUpdated: new Date().toISOString(),
        source:      'live',
      };
      await cacheSchedule(storage, schedule, logger);
      logger.info(`Live schedule loaded: ${liveReleases.length} releases`);
      return schedule;
    }
    logger.warn('Live fetch succeeded but returned 0 releases — falling through to cache');
  } catch (err) {
    logger.warn('Live fetch failed: ' + String(err));
  }

  // ── 2. Cache ─────────────────────────────────────────────────────────────
  const cached = await loadCachedSchedule(storage, logger, ttlMs);
  if (cached) {
    logger.info(`Using cached schedule: ${cached.releases.length} releases`);
    return cached;
  }

  // ── 3. Local fallback ────────────────────────────────────────────────────
  logger.warn('Falling back to local schedule.json');
  return loadLocalSchedule(logger);
}

/**
 * Force a live refresh — ignores cache TTL.
 * Clears the cache entry first so loadCachedSchedule() returns null
 * even if the cache would otherwise still be valid.
 */
export async function refreshSchedule(
  storage: IStorageService,
  logger: ILogger
): Promise<Schedule> {
  logger.info('refreshSchedule() — clearing cache and re-fetching');
  try {
    await storage.remove(CACHE_STORAGE_KEY);
  } catch (err) {
    logger.warn('Failed to clear cache before refresh: ' + String(err));
  }
  return getSchedule(storage, logger, 0); // TTL=0 forces live fetch even if cache were present
}

// ─── Re-export helpers for UI ─────────────────────────────────────────────────

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FORMAT_OPTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

/** Parse "YYYY-MM-DD" as a local date (prevents UTC midnight → previous-day shift). */
export function parseDate(str: string): Date {
  if (!str) return new Date(NaN);
  const parts = str.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function subtractDays(date: Date, n: number): Date {
  return addDays(date, -n);
}

/** Returns the first date on or after startDate whose weekday equals targetDay (0=Sun…6=Sat). */
export function firstWeekdayOnOrAfter(startDate: Date, targetDay: number): Date {
  const d    = new Date(startDate);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Calendar-day count from a to b. */
export function daysBetween(a: Date, b: Date): number {
  const MS = 86400000;
  const aMs = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bMs = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bMs - aMs) / MS);
}

export function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', FORMAT_OPTS);
}
