/**
 * EventBus — Publish/Subscribe event system for the ReplyCators Platform.
 * Decouples plugins and core services; plugins communicate only through events.
 */

import type { IEventBus, EventHandler } from '../../sdk/types';
import { getLogger } from '../logging/Logger';

interface Subscription {
  handler: EventHandler;
  once: boolean;
}

export class EventBus implements IEventBus {
  private static instance: EventBus;
  private subscriptions = new Map<string, Subscription[]>();
  private eventHistory: Array<{ event: string; data: unknown; timestamp: number }> = [];
  private readonly maxHistory = 500;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(event: string, data?: unknown): void {
    this.recordHistory(event, data);
    const subs = this.subscriptions.get(event);
    if (!subs || subs.length === 0) return;

    // Snapshot to handle once-removal during iteration
    const snapshot = [...subs];
    for (const sub of snapshot) {
      try {
        sub.handler(data);
      } catch (err) {
        getLogger('platform').error(`EventBus handler error for event "${event}"`, err);
      }
    }

    // Remove once-handlers
    const remaining = subs.filter(s => !s.once);
    if (remaining.length !== subs.length) {
      this.subscriptions.set(event, remaining);
    }
  }

  on(event: string, handler: EventHandler): () => void {
    this.addSubscription(event, handler, false);
    return () => this.off(event, handler);
  }

  once(event: string, handler: EventHandler): void {
    this.addSubscription(event, handler, true);
  }

  off(event: string, handler: EventHandler): void {
    const subs = this.subscriptions.get(event);
    if (!subs) return;
    this.subscriptions.set(event, subs.filter(s => s.handler !== handler));
  }

  getHistory(event?: string): Array<{ event: string; data: unknown; timestamp: number }> {
    if (event) return this.eventHistory.filter(e => e.event === event);
    return [...this.eventHistory];
  }

  private addSubscription(event: string, handler: EventHandler, once: boolean): void {
    const subs = this.subscriptions.get(event) ?? [];
    subs.push({ handler, once });
    this.subscriptions.set(event, subs);
  }

  private recordHistory(event: string, data: unknown): void {
    this.eventHistory.push({ event, data, timestamp: Date.now() });
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
  }
}

// ─── Platform Event Names ─────────────────────────────────────────────────────

export const PlatformEvents = {
  PLUGIN_REGISTERED: 'platform:plugin:registered',
  PLUGIN_LOADED:     'platform:plugin:loaded',
  PLUGIN_ACTIVATED:  'platform:plugin:activated',
  PLUGIN_DEACTIVATED:'platform:plugin:deactivated',
  PLUGIN_ERROR:      'platform:plugin:error',
  PLUGIN_REMOVED:    'platform:plugin:removed',
  SETTINGS_CHANGED:  'platform:settings:changed',
  NOTIFICATION:      'platform:notification',
  LOG_ENTRY:         'platform:log:entry',
  THEME_CHANGED:     'platform:theme:changed',
  NAVIGATE:          'platform:navigate',
  SEARCH:            'platform:search',
  ACTIVITY:          'platform:activity',
} as const;

export type PlatformEventName = typeof PlatformEvents[keyof typeof PlatformEvents];

// ─── Cloudability OrgID Background Enrichment Events ─────────────────────────
//
// These events form the contract between the OrgIdBackgroundService and all
// platform consumers (UI components, other plugins, telemetry).
//
// Publishing pattern:
//   - 'cld:org-retrieved'         : emitted on every successful OrgID resolution
//                                   (legacy event name; maintained for backwards compat)
//   - 'cld:orgid-retrieved'       : new canonical event; includes durationMs
//   - 'cld:orgid-cache-hit'       : cache was read successfully; includes data + durationMs
//   - 'cld:orgid-cache-miss'      : cache was empty or expired
//   - 'cld:orgid-cache-cleared'   : cache was explicitly cleared
//   - 'cld:orgid-failed'          : retrieval failed; includes error string + durationMs
//   - 'cld:orgid-retry'           : a retry is being attempted; includes attempt + delayMs
//   - 'cld:orgid-retrieval-start' : retrieval has started for a specific tabId
//   - 'cld:orgid-telemetry'       : periodic telemetry snapshot (hit/miss/failure rates)
//   - 'cld:include-in-diagnostics': user requested OrgID be added to the diagnostic report

export const CloudabilityOrgIdEvents = {
  ORG_RETRIEVED:        'cld:org-retrieved',         // legacy (backwards compat)
  ORGID_RETRIEVED:      'cld:orgid-retrieved',        // canonical; { data, durationMs }
  CACHE_HIT:            'cld:orgid-cache-hit',        // { data, durationMs }
  CACHE_MISS:           'cld:orgid-cache-miss',       // {}
  CACHE_CLEARED:        'cld:orgid-cache-cleared',    // {}
  RETRIEVAL_FAILED:     'cld:orgid-failed',           // { error, durationMs }
  RETRIEVAL_START:      'cld:orgid-retrieval-start',  // { tabId }
  RETRY:                'cld:orgid-retry',             // { attempt, delayMs }
  TELEMETRY:            'cld:orgid-telemetry',         // OrgIdStats snapshot
  INCLUDE_IN_DIAG:      'cld:include-in-diagnostics', // OrgData
} as const;

export type CloudabilityOrgIdEventName =
  typeof CloudabilityOrgIdEvents[keyof typeof CloudabilityOrgIdEvents];
