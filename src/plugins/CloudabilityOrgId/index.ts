/**
 * CloudabilityOrgId Plugin — Core plugin class.
 *
 * Role change: this plugin is now a background enrichment provider.
 *
 *   • On initialize() it immediately attempts background OrgID resolution.
 *   • It registers a periodic alarm-based background task for ongoing enrichment.
 *   • It subscribes to EventBus enrichment events to keep its in-memory state fresh.
 *   • It exposes a 'retrieve-cloudability-orgid' action as a manual refresh fallback.
 *   • The UI (CloudabilityUI) is a pure consumer that reads from the cache; it does
 *     not drive OrgID retrieval on its own.
 *
 * No popup, no dedicated OrgID window, no manual user action required.
 */

import { PluginBase } from '@replycators/sdk';
import { PluginLoader } from '@replycators/platform/loader/PluginLoader';
import { CLD_MANIFEST } from './manifest';
import type { PluginContext } from '@replycators/sdk';
import type { ActionContext, ActionResult } from '@replycators/sdk';
import { OrgIdBackgroundService } from './background/OrgIdBackgroundService';
import type { OrgData } from './background/OrgIdBackgroundService';

const PLUGIN_ID  = 'com.replycators.cloudability-orgid';
const ALARM_NAME = 'rc:cld-orgid-periodic-enrich';

/** Periodic enrichment interval — 30 min.  Keeps OrgID current without polling. */
const PERIODIC_ENRICH_INTERVAL_MIN = 30;

export class CloudabilityOrgIdPlugin extends PluginBase {
  readonly manifest = CLD_MANIFEST;

  /** In-memory session state — kept in sync via EventBus subscription. */
  private currentOrgData: OrgData | null = null;

  /** Lazily-created background service (reused for the plugin lifetime). */
  private svc: OrgIdBackgroundService | null = null;

  /** Unsubscribe function returned by EventBus.on(). */
  private unsubscribeOrgRetrieved: (() => void) | null = null;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    // ── Register plugin page ─────────────────────────────────────────────────
    context.registerPage({
      id:            'cld-orgid-main',
      title:         'Cloudability OrgID',
      icon:          '🔑',
      component:     'CloudabilityOrgIdView',
      route:         '/plugins/cloudability-orgid',
      showInSidebar: true,
      order:         20,
    });

    // ── Register dashboard widget ────────────────────────────────────────────
    context.registerDashboardComponent({
      id:        'cld-orgid-widget',
      title:     'Cloudability OrgID',
      component: 'CloudabilityOrgIdWidget',
      size:      'medium',
      order:     20,
    });

    // ── Register actions ─────────────────────────────────────────────────────
    context.registerAction({
      id:          'retrieve-cloudability-orgid',
      label:       'Retrieve Cloudability OrgID',
      description: 'Manually trigger a background OrgID refresh (normally not needed)',
      icon:        '🔑',
      handler:     (ctx: import('@replycators/sdk').ActionContext) => this.handleAction('retrieve-cloudability-orgid', ctx),
    });

    context.registerAction({
      id:          'copy-cloudability-orgid',
      label:       'Copy Cloudability OrgID',
      description: 'Copy the current OrgID to the clipboard',
      icon:        '📋',
      handler:     (ctx: import('@replycators/sdk').ActionContext) => this.handleAction('copy-cloudability-orgid', ctx),
    });

    // ── Register periodic background task (alarm-based) ──────────────────────
    context.registerBackgroundTask({
      id:        'cld-orgid-periodic-enrich',
      name:      'Cloudability OrgID Periodic Enrichment',
      alarmName: ALARM_NAME,
      handler:   () => this._getService().enrichIfPossible(),
    });

    // Schedule the periodic alarm
    this._schedulePeriodicAlarm();

    // ── Subscribe to enrichment events for reactive in-memory state ──────────
    this.unsubscribeOrgRetrieved = context.services.events.on(
      'cld:org-retrieved',
      (data: unknown) => {
        if (!isOrgData(data)) {
          context.services.logger.warn('Ignored malformed OrgID event payload');
          return;
        }
        this.currentOrgData = data;
        context.services.logger.debug(
          `Plugin in-memory OrgID updated: ${this.currentOrgData.id}`
        );
      }
    );

    // ── Restore cached OrgID immediately (sync startup) ──────────────────────
    // This ensures that if OrgID was cached in a previous session, it is
    // available before any user interaction happens.
    await this._restoreCachedOrgData();

    // ── Kick off background enrichment immediately ────────────────────────────
    // If a Cloudability tab is already open, we resolve OrgID right now.
    // If not, this is a no-op (debounced, non-throwing).
    this._getService().enrichIfPossible();

    context.services.logger.info(
      `${this.manifest.name} v${this.manifest.version} initialized ` +
      `(background enrichment active)`
    );
  }

  async activate(): Promise<void> {
    await super.activate();
    this.ctx.services.logger.info(`${this.manifest.name} activated`);
    // Re-trigger enrichment in case we were deactivated and a tab became available
    this._getService().enrichIfPossible();
  }

  async deactivate(): Promise<void> {
    await super.deactivate();
    this.ctx.services.logger.info(`${this.manifest.name} deactivated`);
  }

  async destroy(): Promise<void> {
    await super.destroy();
    this.unsubscribeOrgRetrieved?.();
    this.unsubscribeOrgRetrieved = null;
    this.currentOrgData = null;
    this.svc = null;
    this.ctx.services.logger.info(`${this.manifest.name} destroyed`);
  }

  // ─── View rendering ─────────────────────────────────────────────────────────

  async renderView(_viewId: string, container: HTMLElement): Promise<void> {
    const { renderCloudabilityUI } = await import('./ui/CloudabilityUI');
    renderCloudabilityUI(container, this.ctx);
  }

  // ─── Action handling ────────────────────────────────────────────────────────

  async handleAction(actionId: string, _context: ActionContext): Promise<ActionResult> {
    if (actionId === 'retrieve-cloudability-orgid') {
      const timeoutMs = await this.ctx.services.settings
        .get<number>(PLUGIN_ID, 'timeoutMs')
        .catch(() => 8000) as number;

      // forceRefresh=true: bypass cache so the user gets a fresh value
      const outcome = await this._getService().retrieve(timeoutMs ?? 8000, true);

      if (outcome.success) {
        return {
          success: true,
          message: `OrgID retrieved: ${outcome.data.id}`,
          data:    outcome.data,
        };
      }
      return { success: false, message: outcome.error };
    }

    if (actionId === 'copy-cloudability-orgid') {
      if (!this.currentOrgData) {
        return { success: false, message: 'No OrgID available. Open a Cloudability tab to trigger background retrieval.' };
      }
      try {
        await navigator.clipboard.writeText(this.currentOrgData.id);
        return { success: true, message: `OrgID copied: ${this.currentOrgData.id}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Clipboard write failed: ${msg}` };
      }
    }

    return { success: false, message: `Unknown action: ${actionId}` };
  }

  // ─── Message handling (from content scripts) ────────────────────────────────

  async handleMessage(type: string, payload: unknown): Promise<unknown> {
    // RC_CLD_ORG_READY is now primarily handled in the service worker.
    // This path handles the case where the popup context catches it first.
    if (type === 'RC_CLD_ORG_READY' || type === 'CLD_ORG_DATA_READY') {
      this.ctx.services.events.emit('cld:org-retrieved', payload);
      return { received: true };
    }
    return null;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private _getService(): OrgIdBackgroundService {
    if (!this.svc) {
      this.svc = new OrgIdBackgroundService(this.ctx.services);
    }
    return this.svc;
  }

  private async _restoreCachedOrgData(): Promise<void> {
    try {
      const cached = await this._getService().loadCachedOrgData();
      if (cached) {
        this.currentOrgData = cached;
        this.ctx.services.logger.debug(`Cached OrgID restored on startup: ${cached.id}`);
        // Republish so any already-mounted UI components get the value
        this.ctx.services.events.emit('cld:org-retrieved', cached);
      }
    } catch (err) {
      this.ctx.services.logger.warn(`Failed to restore cached OrgID: ${String(err)}`);
    }
  }

  private _schedulePeriodicAlarm(): void {
    try {
      chrome.alarms.get(ALARM_NAME, (alarm) => {
        if (!alarm) {
          chrome.alarms.create(ALARM_NAME, {
            delayInMinutes:    PERIODIC_ENRICH_INTERVAL_MIN,
            periodInMinutes:   PERIODIC_ENRICH_INTERVAL_MIN,
          });
          this.ctx.services.logger.debug(
            `Periodic OrgID enrichment alarm scheduled (every ${PERIODIC_ENRICH_INTERVAL_MIN} min)`
          );
        }
      });
    } catch (err) {
      // chrome.alarms may not be available in popup context — not critical
      this.ctx.services.logger.debug(`Alarm scheduling skipped: ${String(err)}`);
    }
  }
}

// Self-register with the platform
PluginLoader.register(() => new CloudabilityOrgIdPlugin());

function isOrgData(value: unknown): value is OrgData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.id === 'string' && data.id.trim().length > 0 &&
    typeof data.name === 'string' &&
    typeof data.retrievedAt === 'number' && Number.isFinite(data.retrievedAt);
}
