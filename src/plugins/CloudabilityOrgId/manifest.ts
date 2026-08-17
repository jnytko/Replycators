/**
 * CloudabilityOrgId Plugin — Manifest declaration.
 *
 * Version 3.0.0 — Background enrichment provider.
 *   • OrgID is resolved automatically in the background.
 *   • No user action required.
 *   • Results are cached and shared across the platform.
 */

import type { PluginManifest } from '@replycators/sdk';

export const CLD_MANIFEST: PluginManifest = {
  id: 'com.replycators.cloudability-orgid',
  name: 'Cloudability OrgID',
  version: '3.0.0',
  description:
    'Background context enrichment service: automatically resolves the Cloudability ' +
    'Organisation ID whenever a Cloudability tab is open. No user action required. ' +
    'Results are cached and published to all platform consumers via the EventBus.',
  author: 'ReplyCators Platform',
  category: 'cloud',
  tags: ['cloudability', 'orgid', 'apptio', 'cloud-analytics', 'background-enrichment'],
  permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'alarms'],
  hostPermissions: [
    'https://*.apptio.com/*',
    'https://*.apps.papt.to/*',
  ],
  contentScripts: [
    // MAIN world: intercepts XHR/fetch before any SPA code runs.
    // Active on all matching pages automatically — no injection needed.
    {
      matches: [
        'https://*.apptio.com/cloudability*',
        'https://*.apps.papt.to/cloudability*',
      ],
      js: ['plugins/cloudability/content/cloudability-interceptor.js'],
      runAt: 'document_start',
      world: 'MAIN',
    },
    // ISOLATED world: receives postMessage from MAIN world, pushes OrgID to background.
    // This is the proactive push path — fires without any user action.
    {
      matches: [
        'https://*.apptio.com/cloudability*',
        'https://*.apps.papt.to/cloudability*',
      ],
      js: ['plugins/cloudability/content/cloudability-detector.js'],
      runAt: 'document_end',
    },
  ],
  settings: [
    {
      key: 'timeoutMs',
      label: 'Retrieval Timeout (ms)',
      description: 'Maximum time to wait for OrgID from the Cloudability settings API (per attempt).',
      type: 'number',
      default: 8000,
      group: 'Behavior',
    },
    {
      key: 'cacheTtlMs',
      label: 'Cache TTL (ms)',
      description: 'How long a cached OrgID remains valid before re-fetching. Default: 86400000 (24 hours).',
      type: 'number',
      default: 86400000,
      group: 'Behavior',
    },
  ],
  enabled: true,
};
