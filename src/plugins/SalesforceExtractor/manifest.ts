/**
 * SalesforceExtractor Plugin — manifest declaration.
 * Self-registers with the platform via PluginLoader.register().
 */

import type { PluginManifest } from '@replycators/sdk';

export const SF_MANIFEST: PluginManifest = {
  id: 'com.replycators.salesforce-extractor',
  name: 'Salesforce Case Extractor',
  version: '4.6.0',
  description: 'Extracts Salesforce case data — case number, subject, account, contact, description, agent description, and all public feed posts — into a structured plain-text summary. Uses clone-based DOM cleanup (v0.4.3 engine), multi-strategy record container resolution, parent-case post filtering, and a diagnostic system.',
  author: 'ReplyCators Platform',
  category: 'crm',
  tags: ['salesforce', 'crm', 'case-management', 'support'],
  permissions: ['storage', 'tabs', 'activeTab', 'scripting'],
  hostPermissions: [
    'https://*.salesforce.com/*',
    'https://*.lightning.force.com/*',
  ],
  contentScripts: [
    {
      matches: ['https://*.salesforce.com/*', 'https://*.lightning.force.com/*'],
      js: ['plugins/salesforce/content/sf-content.js'],
      runAt: 'document_idle',
    },
  ],
  settings: [
    {
      key: 'outputFormat',
      label: 'Output Format',
      description: 'How extracted data is formatted',
      type: 'select',
      default: 'plain-text',
      options: [
        { value: 'plain-text', label: 'Plain Text (default)' },
        { value: 'markdown', label: 'Markdown' },
        { value: 'json', label: 'JSON' },
      ],
      group: 'Output',
    },
    {
      key: 'includeMetadata',
      label: 'Include Post Metadata',
      description: 'Include author and timestamp in extracted posts',
      type: 'boolean',
      default: true,
      group: 'Output',
    },
    {
      key: 'autoFillCaseNumber',
      label: 'Auto-fill Case Number',
      description: 'Automatically detect and fill in case number from active tab',
      type: 'boolean',
      default: true,
      group: 'Behavior',
    },
  ],
  enabled: true,
};
