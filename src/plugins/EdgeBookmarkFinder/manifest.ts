/**
 * EdgeBookmarkFinder Plugin — manifest declaration.
 */

import type { PluginManifest } from '@replycators/sdk';

export const BOOKMARK_MANIFEST: PluginManifest = {
  id: 'com.replycators.edge-bookmark-finder',
  name: 'Edge Bookmark Finder',
  version: '1.0.0',
  description: 'Search Microsoft Edge bookmarks across the complete bookmark hierarchy — Bookmark Bar, Other Bookmarks, Mobile Bookmarks, nested folders. Real-time search by title, URL, domain, or folder.',
  author: 'ReplyCators Platform',
  category: 'productivity',
  tags: ['bookmarks', 'edge', 'search', 'productivity'],
  permissions: ['storage'],
  settings: [
    {
      key: 'includeUrls',
      label: 'Search URLs',
      description: 'Include URL content in search results',
      type: 'boolean',
      default: true,
      group: 'Search',
    },
    {
      key: 'includeFolders',
      label: 'Search Folder Names',
      description: 'Include folder names in search results',
      type: 'boolean',
      default: true,
      group: 'Search',
    },
    {
      key: 'detectDuplicates',
      label: 'Detect Duplicate URLs',
      description: 'Highlight bookmarks that share the same URL',
      type: 'boolean',
      default: true,
      group: 'Analysis',
    },
    {
      key: 'detectEmpty',
      label: 'Detect Empty Folders',
      description: 'Highlight folders with no bookmarks',
      type: 'boolean',
      default: true,
      group: 'Analysis',
    },
  ],
  enabled: true,
};
