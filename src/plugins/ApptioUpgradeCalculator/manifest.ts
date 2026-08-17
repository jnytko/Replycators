/**
 * ApptioUpgradeCalculator Plugin — manifest declaration.
 *
 * Plugin ID:  com.replycators.apptio-planning-upgrade-calculator
 * Category:   enterprise
 * Version:    1.0.0
 */

import type { PluginManifest } from '@replycators/sdk';

export const APPTIO_UPGRADE_MANIFEST: PluginManifest = {
  id: 'com.replycators.apptio-planning-upgrade-calculator',
  name: 'Apptio Planning Upgrade Calculator',
  version: '1.0.0',
  description:
    'Calculates Apptio Planning upgrade dates for customers. ' +
    'Dynamically retrieves the official IBM Community release schedule and falls back to ' +
    'a cached or local schedule when the IBM Community page is unavailable. ' +
    'Supports known and unknown upgrade day calculations, sandbox windows, ' +
    'and generates professional customer response templates.',
  author: 'ReplyCators Platform',
  category: 'enterprise',
  tags: ['apptio', 'planning', 'upgrade', 'schedule', 'ibm'],
  permissions: ['storage'],
  settings: [
    {
      key: 'autoRefresh',
      label: 'Auto-refresh schedule on open',
      description: 'Automatically fetch the latest IBM Community schedule each time the plugin is opened',
      type: 'boolean',
      default: true,
      group: 'Schedule',
    },
    {
      key: 'refreshIntervalHours',
      label: 'Refresh interval (hours)',
      description: 'How many hours before the cached schedule is considered stale and a live refresh is attempted',
      type: 'number',
      default: 24,
      group: 'Schedule',
    },
  ],
  enabled: true,
};
