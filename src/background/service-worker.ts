/**
 * Background Service Worker — ReplyCators
 * Initializes the platform and handles background tasks.
 *
 * OrgID background enrichment:
 *   The service worker listens for chrome.tabs.onUpdated events.
 *   When a Cloudability tab becomes complete (status === 'complete'),
 *   it triggers the OrgIdBackgroundService to opportunistically enrich
 *   the OrgID in the background — no user action required.
 *
 *   It also handles the RC_CLD_ORG_READY push message from the content
 *   script detector, which fires automatically whenever the Cloudability
 *   SPA calls /v3/internal/organization/settings during its own startup.
 *
 *   Both paths result in an OrgID that is cached and published to the
 *   EventBus before any user interaction.
 */

import { bootstrapPlatform } from '../platform/bootstrap';
import { getLogger } from '../core/logging/Logger';
import { PluginRegistry } from '../platform/registry/PluginRegistry';
import { PluginManager } from '../platform/manager/PluginManager';
import { EventBus, PlatformEvents } from '../core/events/EventBus';
import { OrgIdBackgroundService } from '../plugins/CloudabilityOrgId/background/OrgIdBackgroundService';
import { getStorage } from '../core/storage/StorageManager';
import { NotificationCenter } from '../core/notifications/NotificationCenter';
import { SettingsManager } from '../core/settings/SettingsManager';
import { MessagingService } from '../core/messaging/MessagingService';

const logger = getLogger('background');

/** URL pattern used to detect Cloudability tabs. */
const CLOUDABILITY_PATTERN = /^https?:\/\/([^/]+\.apptio\.com|[^/]+\.apps\.papt\.to)\/cloudability/i;

/** Plugin ID for the CloudabilityOrgId plugin (used for settings lookup). */
const ORGID_PLUGIN_ID = 'com.replycators.cloudability-orgid';

// ─── Bootstrap on install / service worker start ──────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info(`Extension installed/updated. Reason: ${details.reason}`);
  await bootstrapPlatform();
});

// Also bootstrap on service worker startup (after browser restart)
bootstrapPlatform().catch(err => {
  logger.error(`[RC:background] Bootstrap failed: ${String(err)}`);
});

// ─── Context Menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'rc-root',
      title: 'ReplyCators',
      contexts: ['page', 'selection'],
    });

    chrome.contextMenus.create({
      id: 'rc-open-dashboard',
      parentId: 'rc-root',
      title: 'Open Dashboard',
      contexts: ['page', 'selection'],
    });

    chrome.contextMenus.create({
      id: 'rc-separator-1',
      parentId: 'rc-root',
      type: 'separator',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'rc-sf-extract',
      parentId: 'rc-root',
      title: 'Extract Salesforce Case',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://*.salesforce.com/*',
        'https://*.lightning.force.com/*',
      ],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'rc-open-dashboard') {
    chrome.action.openPopup?.();
  } else if (info.menuItemId === 'rc-sf-extract' && tab?.id) {
    EventBus.getInstance().emit('sf:extract-request', { tabId: tab.id });
  }
});

// ─── OrgID Background Enrichment — Tab navigation trigger ─────────────────────
//
// When a Cloudability tab finishes loading (status === 'complete'), trigger
// enrichment against THAT specific tab.  Passing the tabId directly avoids
// a second chrome.tabs.query() round-trip and guarantees we use the tab we
// just confirmed as a Cloudability page.
//

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !CLOUDABILITY_PATTERN.test(tab.url)) return;

  logger.info(`Cloudability tab loaded — triggering background OrgID enrichment (tabId=${tabId})`);
  _triggerBackgroundEnrichment(tabId);
});

// ─── OrgID Background Enrichment — Tab activated trigger ──────────────────────
//
// When the user switches to an already-loaded Cloudability tab, trigger
// enrichment against that specific tab.
//

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    if (!CLOUDABILITY_PATTERN.test(tab.url)) return;
    logger.debug(`Cloudability tab activated — triggering background OrgID enrichment (tabId=${tabId})`);
    _triggerBackgroundEnrichment(tabId);
  });
});

// ─── OrgID Background Enrichment — Window focus trigger ───────────────────────
//
// When the user brings a window into focus (switching from another app, clicking
// a browser window, etc.), check if the active tab in that window is Cloudability
// and trigger enrichment if so.  This covers the case where the user had
// Cloudability open and then opens ReplyCators — the onActivated event may not
// fire for an already-active tab.
//

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (chrome.runtime.lastError || !tabs[0]?.url) return;
    if (!CLOUDABILITY_PATTERN.test(tabs[0].url)) return;
    const tabId = tabs[0].id;
    if (!tabId) return;
    logger.debug(`Window focused with active Cloudability tab — triggering enrichment (tabId=${tabId})`);
    _triggerBackgroundEnrichment(tabId);
  });
});

// ─── Message routing from popup/content scripts ───────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type: string = message?.type ?? '';

  // ── OrgID push from content script detector (proactive path) ──────────────
  //
  // TD-008 resolved (v1.11.0): RC_UPGRADE_FETCH_SCHEDULE handler was removed.
  //
  // The handler existed in this TypeScript build target but was NEVER present in
  // the active runtime (background.js). No sender in dashboard.js or any active
  // code ever emitted this message type. The Apptio Upgrade Calculator plugin
  // fetches IBM Community schedule data directly via dashboard.js using a
  // fetch() call under the extension's host_permissions — it does not route
  // through the background worker.
  //
  // Evidence:
  //   grep RC_UPGRADE_FETCH_SCHEDULE background.js   → no match
  //   grep RC_UPGRADE_FETCH_SCHEDULE dashboard.js    → no match
  //
  // Removed in v1.11.0. Safe to delete: zero runtime impact.
  // ──────────────────────────────────────────────────────────────────────────

  //
  // The cloudability-detector.js content script sends this message whenever
  // the Cloudability SPA organically calls the settings endpoint (e.g. on
  // startup, when opening the Settings page, etc.).  The background caches and
  // publishes the OrgID immediately without any user interaction.
  //
  if (type === 'RC_CLD_ORG_READY') {
    const payload = message.payload ?? {};
    _handleOrgReadyPush(payload.id, payload.name).catch((err: unknown) => {
      logger.error(`RC_CLD_ORG_READY handler error: ${String(err)}`);
    });
    sendResponse({ received: true });
    return true;
  }

  if (type === 'RC_GET_PLUGIN_STATUS') {
    const manager = PluginManager.getInstance();
    sendResponse({ statuses: manager.getStatus() });
    return true;
  }

  if (type === 'RC_TOGGLE_PLUGIN') {
    const { pluginId, enabled } = message.payload ?? {};
    const manager = PluginManager.getInstance();
    const op = enabled ? manager.enablePlugin(pluginId) : manager.disablePlugin(pluginId);
    op.then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  if (type === 'RC_GET_REGISTRY') {
    const entries = PluginRegistry.getInstance().getAll().map(e => ({
      id: e.manifest.id,
      name: e.manifest.name,
      version: e.manifest.version,
      category: e.manifest.category,
      status: e.health.status,
      health: e.health,
    }));
    sendResponse({ plugins: entries });
    return true;
  }

  return false;
});

// ─── Alarm handler for scheduled background tasks ─────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  logger.debug(`Alarm fired: ${alarm.name}`);
  EventBus.getInstance().emit('platform:alarm', { name: alarm.name });

  // Periodic OrgID enrichment alarm — triggered by the plugin's background task
  if (alarm.name === 'rc:cld-orgid-periodic-enrich') {
    logger.debug('Periodic OrgID enrichment alarm fired');
    _triggerBackgroundEnrichment();
  }
});

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Build a minimal PlatformServices bundle for use by background-only services.
 * The full platform is already bootstrapped by bootstrapPlatform(); this just
 * wires the singletons into the shape OrgIdBackgroundService expects.
 */
function _buildBgServices() {
  return {
    storage:       getStorage(`plugin:${ORGID_PLUGIN_ID}`),
    events:        EventBus.getInstance(),
    logger:        getLogger(ORGID_PLUGIN_ID),
    notifications: NotificationCenter.getInstance(),
    settings:      SettingsManager.getInstance(),
    messaging:     MessagingService.getInstance(),
  };
}

/** Shared background service instance — created lazily, reused across calls. */
let _bgSvc: OrgIdBackgroundService | null = null;

function _getBackgroundSvc(): OrgIdBackgroundService {
  if (!_bgSvc) {
    _bgSvc = new OrgIdBackgroundService(_buildBgServices());
  }
  return _bgSvc;
}

/**
 * Trigger an opportunistic (debounced) background enrichment.
 * When tabId is provided the enrichment is targeted at that specific tab,
 * avoiding a second chrome.tabs.query() round-trip.
 * Safe to call from any event handler; never throws.
 */
function _triggerBackgroundEnrichment(tabId?: number): void {
  try {
    _getBackgroundSvc().enrichIfPossible(undefined, tabId);
  } catch (err) {
    logger.error(`Background enrichment trigger error: ${String(err)}`);
  }
}

/**
 * Handle a proactive OrgID push from the content script.
 * Caches the OrgID directly — no round-trip to the tab needed.
 */
async function _handleOrgReadyPush(id: unknown, name: unknown): Promise<void> {
  const orgId = typeof id === 'string' ? id.trim() : '';
  if (!orgId) {
    logger.debug('RC_CLD_ORG_READY received with empty id — ignoring');
    return;
  }

  const orgName = typeof name === 'string' ? name.trim() : '';

  const svc = _getBackgroundSvc();

  // Check if we already have this OrgID cached — avoid redundant writes
  const existing = await svc.loadCachedOrgData();
  if (existing?.id === orgId) {
    logger.debug(`RC_CLD_ORG_READY: OrgID already cached (${orgId}) — skipping`);
    return;
  }

  logger.info(`RC_CLD_ORG_READY: proactive push received — OrgID=${orgId}`);

  // Write to cache directly via the service (uses the plugin storage namespace)
  const services = _buildBgServices();
  const data = { id: orgId, name: orgName, retrievedAt: Date.now() };
  await services.storage.set('orgid-cache', data);

  // Publish to EventBus so all subscribers (plugin instances, UI) receive it
  services.events.emit('cld:org-retrieved', data);
  services.events.emit('cld:orgid-retrieved', { data, durationMs: 0 });

  logger.info(`OrgID cached from proactive push: ${orgId}${orgName ? ` (${orgName})` : ''}`);
}

logger.info('Background service worker ready.');
