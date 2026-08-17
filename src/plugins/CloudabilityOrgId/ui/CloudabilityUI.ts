/**
 * CloudabilityUI — Renders the Cloudability OrgID plugin view.
 *
 * Role change: the UI is now a pure consumer of OrgID.
 *
 *   • On mount, it reads from the cache (OrgID is typically already available).
 *   • It subscribes to 'cld:org-retrieved' on the EventBus and updates live.
 *   • It shows a status badge indicating whether OrgID came from cache or was
 *     resolved in real-time.
 *   • A "Refresh" button is available as a fallback for edge cases where the
 *     automatic enrichment has not yet resolved (e.g. no Cloudability tab open).
 *   • The primary "Retrieve OrgID" button is replaced by the live status badge.
 *
 * No popup.  No mandatory fetch.  No waiting.
 */

import type { PluginContext } from '@replycators/sdk';
import { OrgIdBackgroundService } from '../background/OrgIdBackgroundService';
import type { OrgData } from '../background/OrgIdBackgroundService';

const PLUGIN_ID = 'com.replycators.cloudability-orgid';

export function renderCloudabilityUI(container: HTMLElement, ctx: PluginContext): void {
  container.innerHTML = getCloudabilityHTML();
  bindCloudabilityEvents(container, ctx);
}

// ─── HTML template ─────────────────────────────────────────────────────────────

function getCloudabilityHTML(): string {
  return `
    <div class="rc-panel-header">
      <span class="rc-panel-title">🔑 Cloudability OrgID</span>
      <span class="cld-status-badge cld-status-badge--idle" id="cld-status-badge">⏳ Resolving…</span>
    </div>

    <div class="rc-panel-body">

      <!-- Result Card -->
      <div class="cld-result-card rc-section-block" id="cld-result-card">
        <div class="cld-result-card__header">
          <span class="cld-result-card__title">Cloudability OrgID</span>
          <span class="cld-result-card__source" id="cld-source-label">Source: —</span>
        </div>
        <div class="cld-orgid-row">
          <div class="cld-orgid-display cld-orgid-display--empty" id="cld-orgid-value">—</div>
          <button id="cld-copy-btn" class="rc-btn rc-btn--secondary rc-btn--sm" disabled title="Copy OrgID to clipboard">
            📋 Copy
          </button>
        </div>
        <div class="cld-orgname-row">
          <span class="cld-orgname-label">Organisation Name</span>
          <span id="cld-orgname-value" class="cld-orgname-value">—</span>
        </div>
        <div id="cld-retrieved-at" class="rc-muted" style="font-size:11px;margin-top:4px;display:none;"></div>
        <div id="cld-result-status" class="rc-status rc-status--neutral" style="display:none;"></div>
      </div>

      <!-- Action Row (lightweight — refresh is the only mandatory action) -->
      <div class="cld-action-row">
        <button id="cld-refresh-btn" class="rc-btn rc-btn--secondary">🔄 Refresh OrgID</button>
        <button id="cld-include-diag-btn" class="rc-btn rc-btn--ghost rc-btn--sm" disabled>
          📊 Include in Diagnostics
        </button>
      </div>

      <!-- Context info -->
      <div class="rc-info-cards">
        <div class="rc-info-card">
          <div class="rc-info-card__icon">⚡</div>
          <div>
            <div class="rc-info-card__title">Automatic background retrieval</div>
            <div class="rc-info-card__body">
              OrgID is resolved automatically whenever a Cloudability page
              (<code>*.apptio.com/cloudability*</code>) is open in any tab.
              No action is required.  The value is cached for 24 hours.
            </div>
          </div>
        </div>
        <div class="rc-info-card">
          <div class="rc-info-card__icon">🔄</div>
          <div>
            <div class="rc-info-card__title">When to use Refresh</div>
            <div class="rc-info-card__body">
              Use <strong>Refresh OrgID</strong> only if the displayed value is
              missing or stale, or if no Cloudability tab was open during startup.
              Requires a Cloudability page to be open in any tab.
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

// ─── Event binding ──────────────────────────────────────────────────────────────

function bindCloudabilityEvents(container: HTMLElement, ctx: PluginContext): void {
  const statusBadge    = container.querySelector<HTMLElement>('#cld-status-badge')!;
  const refreshBtn     = container.querySelector<HTMLButtonElement>('#cld-refresh-btn')!;
  const copyBtn        = container.querySelector<HTMLButtonElement>('#cld-copy-btn')!;
  const includeDiagBtn = container.querySelector<HTMLButtonElement>('#cld-include-diag-btn')!;
  const orgIdEl        = container.querySelector<HTMLElement>('#cld-orgid-value')!;
  const orgNameEl      = container.querySelector<HTMLElement>('#cld-orgname-value')!;
  const sourceLabel    = container.querySelector<HTMLElement>('#cld-source-label')!;
  const retrievedAtEl  = container.querySelector<HTMLElement>('#cld-retrieved-at')!;
  const statusEl       = container.querySelector<HTMLElement>('#cld-result-status')!;

  const svc = new OrgIdBackgroundService(ctx.services);
  let currentOrgData: OrgData | null = null;

  // ── Populate from cache immediately on view mount ──────────────────────────
  // The cache is read once at view mount.  If OrgID is already available from
  // a previous session or from a background enrichment that ran before the user
  // opened this view, it is displayed instantly — no waiting, no fetch.
  svc.loadCachedOrgData().then((cached) => {
    if (cached) {
      applyOrgData(cached, 'cache');
    } else {
      // No cached value — show "waiting for enrichment" state
      setStatusBadge(statusBadge, 'resolving');
      setStatus(statusEl, '⏳ OrgID not yet available. Open a Cloudability tab to trigger automatic resolution, or use Refresh.', 'neutral');
    }
  }).catch((err: unknown) => {
    ctx.services.logger.warn(`Failed to load cached OrgID: ${String(err)}`);
  });

  // ── Subscribe to live enrichment events ───────────────────────────────────
  // When the background service resolves or refreshes OrgID while this view is
  // open, the UI updates automatically — zero user interaction needed.
  const unsubscribe = ctx.services.events.on('cld:org-retrieved', (data: unknown) => {
    const orgData = data as OrgData;
    if (orgData?.id) {
      applyOrgData(orgData, 'live');
    }
  });

  // Clean up subscription when the container is removed from the DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ── Refresh (fallback only) ────────────────────────────────────────────────
  async function runRefresh(): Promise<void> {
    refreshBtn.disabled = true;
    setStatusBadge(statusBadge, 'resolving');
    setStatus(statusEl, '⏳ Refreshing OrgID…', 'neutral');

    ctx.services.logger.info('OrgID manual refresh triggered from UI');

    const timeoutMs = await ctx.services.settings
      .get<number>(PLUGIN_ID, 'timeoutMs')
      .catch(() => 8000) as number;

    // forceRefresh=true to bypass cache on explicit user request
    const outcome = await svc.retrieve(timeoutMs ?? 8000, true);

    if (outcome.success) {
      applyOrgData(outcome.data, 'live');
      setStatus(statusEl, '', 'neutral');
      ctx.services.notifications.show({
        id:       `cld-orgid-${Date.now()}`,
        title:    'Cloudability OrgID Refreshed',
        message:  `OrgID: ${outcome.data.id}` +
                  (outcome.data.name ? ` | Org: ${outcome.data.name}` : ''),
        type:     'success',
        duration: 4000,
        pluginId: PLUGIN_ID,
      });
    } else {
      const isTimeout = /timeout/i.test(outcome.error);
      setStatusBadge(statusBadge, 'error');
      setStatus(statusEl, outcome.error, isTimeout ? 'warning' : 'error');
      ctx.services.notifications.show({
        id:       `cld-error-${Date.now()}`,
        title:    `Cloudability OrgID — ${isTimeout ? 'Timeout' : 'Failed'}`,
        message:  outcome.error,
        type:     isTimeout ? 'warning' : 'error',
        duration: 6000,
        pluginId: PLUGIN_ID,
      });
    }

    refreshBtn.disabled = false;
  }

  refreshBtn.addEventListener('click', () => {
    runRefresh().catch(unexpectedError(ctx, 'refresh'));
  });

  // ── Copy ───────────────────────────────────────────────────────────────────
  copyBtn.addEventListener('click', async () => {
    if (!currentOrgData) return;
    try {
      await navigator.clipboard.writeText(currentOrgData.id);
      ctx.services.logger.info(`OrgID copied to clipboard: ${currentOrgData.id}`);
      ctx.services.notifications.show({
        id:       `cld-copy-${Date.now()}`,
        title:    'Cloudability OrgID',
        message:  `OrgID copied: ${currentOrgData.id}`,
        type:     'info',
        duration: 3000,
        pluginId: PLUGIN_ID,
      });
    } catch (err) {
      ctx.services.logger.error(`Clipboard write failed: ${String(err)}`);
      setStatus(statusEl, 'Clipboard write failed', 'error');
    }
  });

  // ── Include in Diagnostics ─────────────────────────────────────────────────
  includeDiagBtn.addEventListener('click', () => {
    if (!currentOrgData) return;
    ctx.services.logger.info(`OrgID added to diagnostic context: ${currentOrgData.id}`);
    ctx.services.events.emit('cld:include-in-diagnostics', currentOrgData);
    ctx.services.notifications.show({
      id:       `cld-diag-${Date.now()}`,
      title:    'Cloudability OrgID',
      message:  `OrgID included in diagnostics: ${currentOrgData.id}`,
      type:     'info',
      duration: 3000,
      pluginId: PLUGIN_ID,
    });
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function applyOrgData(data: OrgData, source: 'cache' | 'live'): void {
    currentOrgData = data;

    orgIdEl.textContent = data.id;
    orgIdEl.className   = 'cld-orgid-display cld-orgid-display--success';
    orgNameEl.textContent = data.name || '—';

    const sourceText = source === 'cache' ? 'Source: cache (background enrichment)' : 'Source: Cloudability settings API';
    sourceLabel.textContent = sourceText;

    if (data.retrievedAt) {
      retrievedAtEl.textContent = `Last retrieved: ${new Date(data.retrievedAt).toLocaleString()}`;
      retrievedAtEl.style.display = 'block';
    }

    copyBtn.disabled        = false;
    refreshBtn.disabled     = false;
    includeDiagBtn.disabled = false;

    setStatusBadge(statusBadge, source === 'cache' ? 'cached' : 'live');
    setStatus(statusEl, '', 'neutral');
  }
}

// ─── Badge helpers ──────────────────────────────────────────────────────────────

type BadgeState = 'idle' | 'resolving' | 'cached' | 'live' | 'error';

function setStatusBadge(el: HTMLElement, state: BadgeState): void {
  const labels: Record<BadgeState, string> = {
    idle:      '⏸ Idle',
    resolving: '⏳ Resolving…',
    cached:    '✅ Cached',
    live:      '✅ Live',
    error:     '⚠ Failed',
  };
  el.textContent = labels[state];
  el.className = `cld-status-badge cld-status-badge--${state}`;
}

function setStatus(el: HTMLElement, message: string, type: 'neutral' | 'success' | 'error' | 'warning'): void {
  el.textContent   = message;
  el.className     = `rc-status rc-status--${type}`;
  el.style.display = message ? 'block' : 'none';
}

function unexpectedError(ctx: PluginContext, op: string): (err: unknown) => void {
  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.services.logger.error(`Unexpected error during ${op}: ${msg}`);
  };
}
