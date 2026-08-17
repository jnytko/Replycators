/**
 * EdgeBookmarkFinder — Bookmark scanning and search service.
 * Uses chrome.bookmarks API (available in extension context).
 *
 * Permissions: 'bookmarks' declared at manifest level.
 * Falls back gracefully if API is unavailable.
 */

export interface BookmarkNode {
  id: string;
  parentId?: string;
  title: string;
  url?: string;
  dateAdded?: number;
  children?: BookmarkNode[];
}

export interface FlatBookmark {
  id: string;
  title: string;
  url: string;
  domain: string;
  path: string;         // Full folder path, e.g. "Bookmarks Bar > Work > Tools"
  depth: number;
  dateAdded: number | null;
  isDuplicate?: boolean;
}

export interface FlatFolder {
  id: string;
  title: string;
  path: string;
  depth: number;
  bookmarkCount: number;
  isEmpty: boolean;
}

export interface BookmarkScan {
  bookmarks: FlatBookmark[];
  folders: FlatFolder[];
  totalBookmarks: number;
  totalFolders: number;
  deepestLevel: number;
  duplicateCount: number;
  emptyFolderCount: number;
  commonDomains: Array<{ domain: string; count: number }>;
  recentBookmarks: FlatBookmark[];
  scannedAt: number;
  permissionError: boolean;
  permissionErrorMessage?: string;
}

const PLUGIN_ID = 'com.replycators.edge-bookmark-finder';
export const PREFS_KEY  = `rc:plugin:${PLUGIN_ID}:prefs`;
export const SCAN_KEY   = `rc:plugin:${PLUGIN_ID}:last-scan`;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function buildPath(node: BookmarkNode, nodeMap: Map<string, BookmarkNode>): string {
  const parts: string[] = [];
  let current: BookmarkNode | undefined = node.parentId ? nodeMap.get(node.parentId) : undefined;
  while (current) {
    if (current.title) parts.unshift(current.title);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  return parts.join(' > ');
}

export async function scanBookmarks(): Promise<BookmarkScan> {
  // Check API availability
  if (!chrome.bookmarks) {
    return emptyResult(true, 'chrome.bookmarks API is not available in this context.');
  }

  return new Promise(resolve => {
    chrome.bookmarks.getTree(tree => {
      if (chrome.runtime.lastError) {
        resolve(emptyResult(true, chrome.runtime.lastError.message || 'Permission denied'));
        return;
      }

      const bookmarks: FlatBookmark[] = [];
      const folders:   FlatFolder[]   = [];
      const nodeMap    = new Map<string, BookmarkNode>();
      let deepestLevel = 0;

      // First pass: index all nodes
      function indexNodes(node: BookmarkNode): void {
        nodeMap.set(node.id, node);
        if (node.children) node.children.forEach(indexNodes);
      }
      tree.forEach(indexNodes);

      // Second pass: flatten
      function walk(node: BookmarkNode, depth: number): void {
        if (depth > deepestLevel) deepestLevel = depth;

        if (node.url) {
          // Leaf bookmark
          bookmarks.push({
            id: node.id,
            title: node.title || '(untitled)',
            url: node.url,
            domain: extractDomain(node.url),
            path: buildPath(node, nodeMap),
            depth,
            dateAdded: node.dateAdded || null,
            isDuplicate: false,
          });
        } else if (node.children !== undefined) {
          // Folder
          const bookmarkCount = countBookmarks(node);
          folders.push({
            id: node.id,
            title: node.title || '(root)',
            path: buildPath(node, nodeMap),
            depth,
            bookmarkCount,
            isEmpty: bookmarkCount === 0,
          });
          node.children.forEach(child => walk(child, depth + 1));
        }
      }
      tree.forEach(root => {
        if (root.children) root.children.forEach(child => walk(child, 0));
      });

      // Duplicate detection
      const urlCounts = new Map<string, number>();
      bookmarks.forEach(b => urlCounts.set(b.url, (urlCounts.get(b.url) || 0) + 1));
      let duplicateCount = 0;
      bookmarks.forEach(b => {
        if ((urlCounts.get(b.url) || 0) > 1) { b.isDuplicate = true; duplicateCount++; }
      });

      // Common domains
      const domainCounts = new Map<string, number>();
      bookmarks.forEach(b => { if (b.domain) domainCounts.set(b.domain, (domainCounts.get(b.domain) || 0) + 1); });
      const commonDomains = Array.from(domainCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      // Recent bookmarks (last 10 added)
      const recentBookmarks = bookmarks
        .filter(b => b.dateAdded !== null)
        .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
        .slice(0, 10);

      const emptyFolderCount = folders.filter(f => f.isEmpty && f.title !== '(root)').length;

      resolve({
        bookmarks,
        folders,
        totalBookmarks: bookmarks.length,
        totalFolders: folders.length,
        deepestLevel,
        duplicateCount,
        emptyFolderCount,
        commonDomains,
        recentBookmarks,
        scannedAt: Date.now(),
        permissionError: false,
      });
    });
  });
}

function countBookmarks(node: BookmarkNode): number {
  if (node.url) return 1;
  return (node.children || []).reduce((sum, child) => sum + countBookmarks(child), 0);
}

function emptyResult(permissionError: boolean, msg?: string): BookmarkScan {
  return {
    bookmarks: [], folders: [], totalBookmarks: 0, totalFolders: 0,
    deepestLevel: 0, duplicateCount: 0, emptyFolderCount: 0,
    commonDomains: [], recentBookmarks: [], scannedAt: Date.now(),
    permissionError, permissionErrorMessage: msg,
  };
}

export function searchBookmarks(
  scan: BookmarkScan,
  query: string,
  options: { includeUrls: boolean; includeFolders: boolean; titleOnly?: boolean },
): Array<FlatBookmark | FlatFolder> {
  if (!query.trim()) return scan.bookmarks;

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: Array<FlatBookmark | FlatFolder> = [];

  function matchesTerms(text: string): boolean {
    return terms.every(t => text.includes(t));
  }

  scan.bookmarks.forEach(b => {
    const searchTarget = [
      b.title.toLowerCase(),
      options.includeUrls ? b.url.toLowerCase() : '',
      options.includeUrls ? b.domain.toLowerCase() : '',
      b.path.toLowerCase(),
    ].join(' ');
    if (matchesTerms(searchTarget)) results.push(b);
  });

  if (options.includeFolders) {
    scan.folders.forEach(f => {
      if (matchesTerms(f.title.toLowerCase()) || matchesTerms(f.path.toLowerCase())) {
        results.push(f);
      }
    });
  }

  return results;
}
