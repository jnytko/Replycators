/**
 * src/plugins/WorkspaceStarter/manifest.ts
 *
 * Plugin manifest for the Workspace Starter plugin.
 * Used by the TypeScript/Webpack build path (dist/).
 * The root flat-deployment implementation lives in dashboard.js.
 */

export const WorkspaceStarterManifest = {
  id:          'com.replycators.workspace-starter',
  name:        'Workspace Starter',
  version:     '2.0.0',
  description: 'Launch your entire daily workspace with a single click. Features: per-profile Tab Group or Individual Tabs mode, Current/New Window targeting, Favorites with dashboard quick-launch, launch statistics, categories, recent workspaces, and JSON import/export.',
  author:      'ReplyCators Platform',
  category:    'productivity',
  tags:        ['workspace', 'launcher', 'startup', 'tabs', 'productivity', 'favorites', 'categories'],
  icon:        '☉',
  viewId:      'plugin-workspace-starter',
} as const;
