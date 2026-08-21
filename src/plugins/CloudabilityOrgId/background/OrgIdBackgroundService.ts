/**
 * OrgIdBackgroundService — Proactive background enrichment engine for Cloudability OrgID.
 *
 * Design goals:
 *   • OrgID is resolved automatically whenever a Cloudability tab is available.
 *   • No popup, no user click, no waiting — OrgID is "already there" when needed.
 *   • Request deduplication — a single in-flight request services all concurrent callers.
 *   • Intelligent caching — storage-backed with configurable TTL; cache hit avoids all network.
 *   • Event-driven triggers — responds to tab navigation, platform boot, and explicit refresh.
 *   • Lightweight — no polling loops; all work is event-triggered.
 *   • Retry with exponential back-off; never crashes the platform on failure.
 *   • Full telemetry — durations, hit/miss rates, failure rates tracked on EventBus.
 *
 * Public API surface:
 *   enrichIfPossible()    — opportunistic, debounced, no-op if already resolved
 *   retrieve()            — forced retrieval (respects deduplication)
 *   loadCachedOrgData()   — synchronous-ish read from chrome.storage.local
 *   clearCache()          — evict the stored OrgID
 *   getStats()            — current telemetry snapshot
 */

import type { PlatformServices } from '@replycators/sdk';

// ─── Public DTOs ──────────────────────────────────────────────────────────────

export interface OrgData {
  readonly id: string;
  readonly name: string;
  readonly retrievedAt: number;
}

export interface OrgRetrievalResult {
  readonly success: true;
  readonly data: OrgData;
  readonly source: 'cache' | 'live';
}

export interface OrgRetrievalFailure {
  readonly success: false;
  readonly error: string;
}

export type OrgRetrievalOutcome = OrgRetrievalResult | OrgRetrievalFailure;

// ─── Internal types ───────────────────────────────────────────────────────────

interface DetectorResponse {
  success: boolean;
  id: string | null;
  name: string | null;
  error?: string;
}

function isOrgData(value: unknown): value is OrgData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.id === 'string' && data.id.trim().length > 0 &&
    typeof data.name === 'string' &&
    typeof data.retrievedAt === 'number' && Number.isFinite(data.retrievedAt);
}

function isDetectorResponse(value: unknown): value is DetectorResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  return typeof response.success === 'boolean' &&
    (response.id === null || typeof response.id === 'string') &&
    (response.name === null || typeof response.name === 'string') &&
    (response.error === undefined || typeof response.error === 'string');
}

interface OrgIdStats {
  cacheHits: number;
  cacheMisses: number;
  liveSuccess: number;
  liveFailure: number;
  totalDurationMs: number;
  lastRetrievedAt: number | null;
  retries: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY            = 'orgid-cache';
const DETECTOR_SCRIPT      = 'plugins/cloudability/content/cloudability-detector.js';
const CLOUDABILITY_PATTERN = /^https?:\/\/([^/]+\.apptio\.com|[^/]+\.apps\.papt\.to)\/cloudability/i;

/**
 * Default TTL for a cached OrgID (ms).  OrgIDs are stable identifiers that
 * rarely change, so 24 h is a sensible default.  Override via plugin setting
 * 'cacheTtlMs'.
 */
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/** Maximum number of automatic retry attempts after a transient failure. */
const MAX_RETRIES = 3;

/** Base delay for exponential back-off (ms). */
const RETRY_BASE_DELAY_MS = 2000;

/** Minimum interval between two opportunistic enrichment attempts (ms). */
const ENRICH_DEBOUNCE_MS = 3000;

// ─── Service ──────────────────────────────────────────────────────────────────

export class OrgIdBackgroundService {
  private readonly services: PlatformServices;

  /**
   * In-flight request promise — shared among all concurrent callers to prevent
   * duplicate API calls.  Cleared once the request settles.
   */
  private inFlight: Promise<OrgRetrievalOutcome> | null = null;

  /** Debounce timer handle for opportunistic enrichment. */
  private enrichDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Telemetry counters. */
  private stats: OrgIdStats = {
    cacheHits:       0,
    cacheMisses:     0,
    liveSuccess:     0,
    liveFailure:     0,
    totalDurationMs: 0,
    lastRetrievedAt: null,
    retries:         0,
  };

  constructor(services: PlatformServices) {
    this.services = services;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Opportunistically enrich OrgID in the background.
   *
   * Safe to call frequently — debounced.  Returns early if:
   *   • A valid cached OrgID already exists (TTL not expired).
   *   • A retrieval is already in flight.
   *   • No Cloudability tab is open.
   *
   * @param timeoutMs  Per-attempt timeout (default: 8 s).
   * @param tabId      When the caller already knows which tab is a Cloudability page,
   *                   pass it here to skip the chrome.tabs.query() round-trip.  This
   *                   makes enrichment more reliable when triggered from tab events.
   *
   * Never throws.
   */
  enrichIfPossible(timeoutMs?: number, tabId?: number): void {
    if (this.inFlight) {
      this.services.logger.debug('OrgID enrichment skipped — request already in flight');
      return;
    }

    if (this.enrichDebounceTimer !== null) {
      clearTimeout(this.enrichDebounceTimer);
    }

    this.enrichDebounceTimer = setTimeout(() => {
      this.enrichDebounceTimer = null;
      this._runEnrichment(timeoutMs, tabId).catch((err: unknown) => {
        // Enrichment is always fire-and-forget; never propagate.
        this.services.logger.debug(`Background enrichment error (suppressed): ${String(err)}`);
      });
    }, ENRICH_DEBOUNCE_MS);
  }

  /**
   * Retrieve the Cloudability OrgID, respecting cache and in-flight deduplication.
   *
   * If a valid cached entry exists it is returned immediately (cache hit).
   * If a retrieval is already in flight, the caller joins the existing request.
   * Otherwise a new retrieval is started.
   *
   * @param timeoutMs  Per-attempt timeout for the detector message (default 8 s).
   * @param forceRefresh  When true, bypass the cache and always retrieve live.
   */
  async retrieve(
    timeoutMs = 8000,
    forceRefresh = false,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS
  ): Promise<OrgRetrievalOutcome> {
    const t0 = Date.now();

    // ── Cache hit path ───────────────────────────────────────────────────────
    if (!forceRefresh) {
      const cached = await this.loadCachedOrgData(cacheTtlMs);
      if (cached) {
        this.stats.cacheHits++;
        const dur = Date.now() - t0;
        this.services.events.emit('cld:orgid-cache-hit', { data: cached, durationMs: dur });
        this.services.logger.debug(`OrgID cache hit: ${cached.id} (${dur}ms)`);
        this._emitTelemetry();
        return { success: true, data: cached, source: 'cache' };
      }
      this.stats.cacheMisses++;
      this.services.events.emit('cld:orgid-cache-miss', {});
    }

    // ── Deduplication — join in-flight request ───────────────────────────────
    if (this.inFlight) {
      this.services.logger.debug('OrgID retrieval joining existing in-flight request');
      return this.inFlight;
    }

    // ── Start new retrieval ──────────────────────────────────────────────────
    this.inFlight = this._retrieveWithRetry(timeoutMs)
      .then((outcome) => {
        const dur = Date.now() - t0;
        this.stats.totalDurationMs += dur;
        if (outcome.success) {
          this.stats.liveSuccess++;
          this.stats.lastRetrievedAt = Date.now();
          this.services.events.emit('cld:orgid-retrieved', { data: outcome.data, durationMs: dur });
        } else {
          this.stats.liveFailure++;
          this.services.events.emit('cld:orgid-failed', { error: outcome.error, durationMs: dur });
        }
        this._emitTelemetry();
        return outcome;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  /**
   * Attempt to load a previously cached OrgID from chrome.storage.local.
   * Returns undefined if no cached entry exists OR if the TTL has expired.
   */
  async loadCachedOrgData(cacheTtlMs?: number): Promise<OrgData | undefined> {
    const cached = await this.services.storage.get<unknown>(CACHE_KEY);
    if (!isOrgData(cached)) {
      this.services.logger.debug('Cache miss: no OrgID in storage');
      return undefined;
    }

    const ttl = Math.max(0, cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
    const age = Date.now() - cached.retrievedAt;
    if (age < 0 || age > ttl) {
      this.services.logger.debug(
        `Cache miss: OrgID ${cached.id} expired (age=${age}ms, ttl=${ttl}ms)`
      );
      return undefined;
    }

    this.services.logger.debug(`Cache hit: OrgID=${cached.id} age=${age}ms`);
    return cached;
  }

  /** Clear the cached OrgID. */
  async clearCache(): Promise<void> {
    await this.services.storage.remove(CACHE_KEY);
    this.services.logger.debug('OrgID cache cleared');
    this.services.events.emit('cld:orgid-cache-cleared', {});
  }

  /** Current telemetry snapshot. */
  getStats(): Readonly<OrgIdStats> {
    return { ...this.stats };
  }

  // ─── Private — retrieval pipeline ────────────────────────────────────────────

  /**
   * Retrieval with exponential back-off retry.
   * Attempt 1 → wait 2 s → attempt 2 → wait 4 s → attempt 3 → wait 8 s → attempt 4.
   */
  private async _retrieveWithRetry(timeoutMs: number): Promise<OrgRetrievalOutcome> {
    let lastError = 'Unknown error';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.stats.retries++;
        this.services.logger.info(
          `OrgID retry ${attempt}/${MAX_RETRIES} — waiting ${delay}ms`
        );
        this.services.events.emit('cld:orgid-retry', { attempt, delayMs: delay });
        await sleep(delay);
      }

      const outcome = await this._retrieveOnce(timeoutMs);
      if (outcome.success) return outcome;

      lastError = outcome.error;

      // Don't retry on "no tab" — retrying immediately won't help
      if (/no open cloudability tab/i.test(lastError)) {
        this.services.logger.warn('OrgID retrieval aborted: no Cloudability tab open');
        break;
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * Single retrieval attempt:
   *   1. Find a Cloudability tab (or use the provided tabId).
   *   2. Inject detector (idempotent).
   *   3. Send RC_GET_CLOUDABILITY_ORG and await response.
   *   4. Cache + emit.
   */
  private async _retrieveOnce(timeoutMs: number): Promise<OrgRetrievalOutcome> {
    const logger = this.services.logger;

    logger.info('OrgID retrieval started');

    // Step 1: Locate Cloudability tab
    const tab = await this._findCloudabilityTab();
    if (!tab?.id) {
      const error =
        'No open Cloudability tab found. Open a page at ' +
        '*.apptio.com/cloudability* and try again.';
      logger.warn(`Retrieval aborted: ${error}`);
      return { success: false, error };
    }

    return this._retrieveWithTabId(tab.id, timeoutMs);
  }

  /**
   * Perform the actual retrieval against a specific known Cloudability tabId.
   * Shared by _retrieveOnce (which resolves the tab first) and _runEnrichment
   * (which may already have the tabId from a tab event).
   */
  private async _retrieveWithTabId(tabId: number, timeoutMs: number): Promise<OrgRetrievalOutcome> {
    const logger = this.services.logger;

    logger.info(`Cloudability tab targeted: tabId=${tabId}`);
    this.services.events.emit('cld:orgid-retrieval-start', { tabId });

    // Step 2: Inject detector (idempotent; MAIN-world interceptor already present via manifest)
    try {
      await this._injectDetector(tabId);
      logger.debug(`Detector injected into tabId=${tabId}`);
    } catch (err) {
      logger.debug(`Detector injection note (already active?): ${String(err)}`);
    }

    // Step 3: Request OrgID from the detector
    const response = await this._sendRetrievalMessage(tabId, timeoutMs);
    if (!response) {
      const error = 'No response from Cloudability detector script.';
      logger.error(error);
      return { success: false, error };
    }

    if (!response.success || !response.id) {
      const error = response.error ?? 'OrgID not received from detector.';
      const isTimeout = /timeout/i.test(error);
      if (isTimeout) {
        logger.warn(`OrgID retrieval timed out after ${timeoutMs}ms: ${error}`);
      } else {
        logger.error(`OrgID retrieval failed: ${error}`);
      }
      return { success: false, error };
    }

    // Step 4: Build result and persist
    const data: OrgData = {
      id:           String(response.id).trim(),
      name:         response.name ? String(response.name).trim() : '',
      retrievedAt:  Date.now(),
    };

    await this._cacheOrgData(data);

    // Emit the full org:retrieved event so all plugins and the UI update reactively.
    // NOTE: we also emit on EventBus as 'cld:org-retrieved' (legacy name) for backwards
    // compatibility with any existing subscriber.
    this.services.events.emit('cld:org-retrieved', data);

    logger.info(
      `OrgID retrieved: ${data.id}` +
      (data.name ? ` (${data.name})` : '') +
      ' [source: Cloudability settings API]'
    );

    return { success: true, data, source: 'live' };
  }

  /**
   * Opportunistic enrichment — returns early if cache is still fresh.
   *
   * @param timeoutMs  Per-attempt timeout.
   * @param knownTabId  When supplied, use this tab directly instead of querying all tabs.
   *                    Avoids a chrome.tabs.query() call and makes targeting more reliable.
   */
  private async _runEnrichment(timeoutMs?: number, knownTabId?: number): Promise<void> {
    const logger = this.services.logger;

    // Check if we already have a fresh cached value before going further
    const cached = await this.loadCachedOrgData();
    if (cached) {
      logger.debug(`Background enrichment skipped — valid cache (OrgID=${cached.id})`);
      return;
    }

    // Resolve the target tab: use the provided tabId directly, or query all tabs.
    let targetTabId: number | undefined = knownTabId;
    if (!targetTabId) {
      const tab = await this._findCloudabilityTab();
      if (!tab?.id) {
        logger.debug('Background enrichment skipped — no Cloudability tab open');
        return;
      }
      targetTabId = tab.id;
    }

    if (this.inFlight) {
      logger.debug('Background enrichment joining existing in-flight request');
      await this.inFlight;
      return;
    }

    logger.info(`Background enrichment triggered — tabId=${targetTabId}`);
    // The known-tab path still participates in global request deduplication.
    this.inFlight = this._retrieveWithTabId(targetTabId, timeoutMs ?? 8000)
      .finally(() => { this.inFlight = null; });
    const outcome = await this.inFlight;

    if (!outcome.success) {
      logger.warn(`Background enrichment failed: ${outcome.error}`);
    }
  }

  // ─── Private — helpers ────────────────────────────────────────────────────────

  private _findCloudabilityTab(): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          this.services.logger.error(`Tab query failed: ${chrome.runtime.lastError.message}`);
          resolve(undefined);
          return;
        }
        const found = tabs.find(
          (t) => !!t.url && CLOUDABILITY_PATTERN.test(t.url)
        );
        resolve(found);
      });
    });
  }

  private async _injectDetector(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      files:  [DETECTOR_SCRIPT],
    });
  }

  private _sendRetrievalMessage(tabId: number, timeoutMs: number): Promise<DetectorResponse | null> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: DetectorResponse | null): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => {
        this.services.logger.warn(`Detector message timed out on tabId=${tabId}`);
        finish(null);
      }, Math.max(1, timeoutMs));

      chrome.tabs.sendMessage(
        tabId,
        { type: 'RC_GET_CLOUDABILITY_ORG' },
        (response: unknown) => {
          if (chrome.runtime.lastError) {
            this.services.logger.error(
              `Messaging error on tabId=${tabId}: ${chrome.runtime.lastError.message}`
            );
            finish(null);
            return;
          }
          if (!isDetectorResponse(response)) {
            this.services.logger.error(`Invalid detector response on tabId=${tabId}`);
            finish(null);
            return;
          }
          finish(response);
        }
      );
    });
  }

  private async _cacheOrgData(data: OrgData): Promise<void> {
    try {
      await this.services.storage.set(CACHE_KEY, data);
      this.services.logger.debug(`OrgID cached: ${data.id}`);
    } catch (err) {
      this.services.logger.warn(`Failed to cache OrgID: ${String(err)}`);
    }
  }

  private _emitTelemetry(): void {
    this.services.events.emit('cld:orgid-telemetry', { ...this.stats });
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
