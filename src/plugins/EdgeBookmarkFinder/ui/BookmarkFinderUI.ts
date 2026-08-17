/**
 * EdgeBookmarkFinder — Dashboard UI.
 */

import type { PluginContext } from '@replycators/sdk';
import {
  scanBookmarks, searchBookmarks,
  PREFS_KEY, SCAN_KEY,
  type BookmarkScan, type FlatBookmark, type FlatFolder,
} from '../BookmarkService';

const PLUGIN_ID = 'com.replycators.edge-bookmark-finder';

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
  );
}

interface Prefs {
  lastSearch: string;
  searchHistory: string[];
  filter: string;
  includeUrls: boolean;
  includeFolders: boolean;
}

export function renderBookmarkFinderUI(container: HTMLElement, ctx: PluginContext): void {
  container.innerHTML = getHTML();
  bindEvents(container, ctx);
}

function getHTML(): string {
  return `
    <div class="rc-panel-header">
      <span class="rc-panel-title">🔖 Edge Bookmark Finder</span>
      <span class="rc-badge rc-badge--blue">Productivity</span>
    </div>
    <div class="rc-panel-body">

      <!-- Permission error -->
      <div id="bm-perm-error" class="rc-status rc-status--error" style="display:none;"></div>

      <!-- Stats row -->
      <div id="bm-stats" class="rc-section-block" style="display:none;margin-bottom:12px;font-size:12px;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
          <span id="bm-stat-total" title="Total bookmarks scanned">🔖 0 bookmarks</span>
          <span id="bm-stat-folders" title="Total folders scanned">📁 0 folders</span>
          <span id="bm-stat-depth" title="Maximum folder nesting level">⬇️ depth 0</span>
          <span id="bm-stat-dupes" title="Bookmarks sharing the same URL" style="display:none;"></span>
          <span id="bm-stat-empty" title="Folders containing no bookmarks" style="display:none;"></span>
          <div style="flex:1;"></div>
          <button id="bm-scan-btn" class="rc-btn rc-btn--secondary rc-btn--sm"
                  title="Re-scan all bookmarks. Use after adding or removing bookmarks.">🔄 Re-scan</button>
          <button id="bm-toggle-analytics" class="rc-btn rc-btn--ghost rc-btn--sm"
                  title="Show or hide domain analytics">📊 Analytics</button>
        </div>
      </div>

      <!-- Analytics panel -->
      <div id="bm-analytics" class="rc-section-block" style="display:none;margin-bottom:12px;font-size:12px;"></div>

      <!-- Search bar -->
      <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        <input type="text" id="bm-search" class="rc-input" placeholder="Search by title, URL, domain, folder…"
               style="flex:1;"
               title="Search bookmarks. Multi-word: type multiple words separated by spaces. All words must match." />
        <select id="bm-filter" class="rc-input rc-input--sm" style="max-width:140px;"
                title="Restrict search to a specific type">
          <option value="all">All types</option>
          <option value="bookmarks">Bookmarks only</option>
          <option value="folders">Folders only</option>
          <option value="duplicates">Duplicates only</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;font-size:11px;color:var(--rc-text-muted);">
        <label style="display:flex;gap:4px;align-items:center;cursor:pointer;"
               title="Include bookmark URLs in search matching">
          <input type="checkbox" id="bm-opt-urls" checked /> Search URLs
        </label>
        <label style="display:flex;gap:4px;align-items:center;cursor:pointer;"
               title="Include folder names in search matching">
          <input type="checkbox" id="bm-opt-folders" checked /> Search folders
        </label>
      </div>

      <!-- Status message -->
      <div id="bm-status" class="rc-status rc-status--neutral" style="display:none;"></div>

      <!-- Results count -->
      <div id="bm-results-count" style="font-size:11px;color:var(--rc-text-muted);margin-bottom:8px;"></div>

      <!-- Results list -->
      <div id="bm-loading" class="rc-status rc-status--neutral" style="display:none;">⏳ Scanning bookmarks…</div>
      <div id="bm-results" style="max-height:420px;overflow-y:auto;"></div>

      <!-- Recent bookmarks section -->
      <div id="bm-recent-section" style="display:none;margin-top:16px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--rc-text-muted);">🕐 Recently Added Bookmarks</div>
        <div id="bm-recent-list"></div>
      </div>

    </div>`;
}

function bindEvents(container: HTMLElement, ctx: PluginContext): void {
  const logger = ctx.services.logger;
  let scan: BookmarkScan | null = null;
  let prefs: Prefs = {
    lastSearch: '', searchHistory: [], filter: 'all',
    includeUrls: true, includeFolders: true,
  };

  const permError        = container.querySelector<HTMLElement>('#bm-perm-error')!;
  const statsEl          = container.querySelector<HTMLElement>('#bm-stats')!;
  const analyticsEl      = container.querySelector<HTMLElement>('#bm-analytics')!;
  const statTotal        = container.querySelector<HTMLElement>('#bm-stat-total')!;
  const statFolders      = container.querySelector<HTMLElement>('#bm-stat-folders')!;
  const statDepth        = container.querySelector<HTMLElement>('#bm-stat-depth')!;
  const statDupes        = container.querySelector<HTMLElement>('#bm-stat-dupes')!;
  const statEmpty        = container.querySelector<HTMLElement>('#bm-stat-empty')!;
  const scanBtn          = container.querySelector<HTMLButtonElement>('#bm-scan-btn')!;
  const analyticsToggle  = container.querySelector<HTMLButtonElement>('#bm-toggle-analytics')!;
  const searchEl         = container.querySelector<HTMLInputElement>('#bm-search')!;
  const filterEl         = container.querySelector<HTMLSelectElement>('#bm-filter')!;
  const optUrls          = container.querySelector<HTMLInputElement>('#bm-opt-urls')!;
  const optFolders       = container.querySelector<HTMLInputElement>('#bm-opt-folders')!;
  const statusEl         = container.querySelector<HTMLElement>('#bm-status')!;
  const resultsCount     = container.querySelector<HTMLElement>('#bm-results-count')!;
  const loadingEl        = container.querySelector<HTMLElement>('#bm-loading')!;
  const resultsEl        = container.querySelector<HTMLElement>('#bm-results')!;
  const recentSection    = container.querySelector<HTMLElement>('#bm-recent-section')!;
  const recentList       = container.querySelector<HTMLElement>('#bm-recent-list')!;

  // Load prefs
  chrome.storage.local.get([PREFS_KEY, SCAN_KEY], result => {
    const savedPrefs = result[PREFS_KEY] as Prefs | undefined;
    if (savedPrefs) {
      prefs = { ...prefs, ...savedPrefs };
      searchEl.value  = prefs.lastSearch || '';
      filterEl.value  = prefs.filter || 'all';
      optUrls.checked    = prefs.includeUrls !== false;
      optFolders.checked = prefs.includeFolders !== false;
    }
    // Use cached scan if available
    const cachedScan = result[SCAN_KEY] as BookmarkScan | undefined;
    if (cachedScan && cachedScan.bookmarks) {
      scan = cachedScan;
      updateStats();
      renderResults();
      renderRecent();
    } else {
      runScan();
    }
  });

  function savePrefs(): void {
    chrome.storage.local.set({ [PREFS_KEY]: prefs });
  }

  async function runScan(): Promise<void> {
    loadingEl.style.display = 'block';
    scanBtn.disabled = true;
    resultsEl.innerHTML = '';
    statsEl.style.display = 'none';

    try {
      scan = await scanBookmarks();
      if (scan.permissionError) {
        permError.textContent = '❌ ' + (scan.permissionErrorMessage || 'Bookmark access denied. The "bookmarks" permission may not be granted.');
        permError.style.display = 'block';
        logger.error(`${PLUGIN_ID}: permission error — ${scan.permissionErrorMessage}`);
        return;
      }
      permError.style.display = 'none';
      chrome.storage.local.set({ [SCAN_KEY]: scan });
      logger.info(`${PLUGIN_ID}: scanned ${scan.totalBookmarks} bookmarks, ${scan.totalFolders} folders`);
      updateStats();
      renderResults();
      renderRecent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`${PLUGIN_ID}: scan error — ${msg}`);
      setStatus('❌ Scan failed: ' + msg, 'error');
    } finally {
      loadingEl.style.display = 'none';
      scanBtn.disabled = false;
    }
  }

  function updateStats(): void {
    if (!scan) return;
    statsEl.style.display = 'block';
    statTotal.textContent   = `🔖 ${scan.totalBookmarks} bookmarks`;
    statFolders.textContent = `📁 ${scan.totalFolders} folders`;
    statDepth.textContent   = `⬇️ depth ${scan.deepestLevel}`;

    if (scan.duplicateCount > 0) {
      statDupes.textContent = `⚠ ${scan.duplicateCount} duplicates`;
      statDupes.style.display = 'inline';
    }
    if (scan.emptyFolderCount > 0) {
      statEmpty.textContent = `📭 ${scan.emptyFolderCount} empty folders`;
      statEmpty.style.display = 'inline';
    }

    // Analytics
    if (scan.commonDomains.length > 0) {
      analyticsEl.innerHTML = `
        <div style="font-weight:600;margin-bottom:8px;">Top Domains</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${scan.commonDomains.map(d =>
            `<span class="rc-badge rc-badge--blue" title="${esc(d.domain)}: ${d.count} bookmarks" style="cursor:default;">
              ${esc(d.domain)} <strong>${d.count}</strong>
            </span>`
          ).join('')}
        </div>`;
    }
  }

  function renderResults(): void {
    if (!scan) return;
    const q    = searchEl.value.toLowerCase().trim();
    const filt = filterEl.value;

    let results: Array<FlatBookmark | FlatFolder>;

    if (!q) {
      // No search — show all bookmarks
      results = scan.bookmarks;
      if (filt === 'folders')    results = scan.folders as any;
      if (filt === 'duplicates') results = scan.bookmarks.filter(b => b.isDuplicate);
    } else {
      results = searchBookmarks(scan, q, {
        includeUrls: optUrls.checked,
        includeFolders: optFolders.checked,
      });
      if (filt === 'bookmarks')  results = results.filter(r => 'url' in r);
      if (filt === 'folders')    results = results.filter(r => !('url' in r));
      if (filt === 'duplicates') results = results.filter(r => 'url' in r && (r as FlatBookmark).isDuplicate);
    }

    resultsCount.textContent = q
      ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${q}"`
      : `${scan.totalBookmarks} bookmarks`;
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="rc-empty-state"><div class="rc-empty-state__title">No matching bookmarks</div><div class="rc-empty-state__body">Try broader search terms, a different filter, or enable folder and URL matching.</div></div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    results.slice(0, 200).forEach(item => {
      const el = document.createElement('div');

      if ('url' in item) {
        const b = item as FlatBookmark;
        el.style.cssText = `border-bottom:1px solid var(--rc-border);padding:7px 4px;${b.isDuplicate ? 'background:var(--rc-surface);' : ''}`;
        el.innerHTML = `
          <div style="display:flex;align-items:flex-start;gap:6px;">
            <span style="font-size:14px;margin-top:1px;">🔖</span>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--rc-text);"
                   title="${esc(b.title)}">${esc(b.title)}${b.isDuplicate ? ' <span style="color:#f59e0b;font-size:10px;">⚠ duplicate</span>' : ''}</div>
              <div style="font-size:11px;color:var(--rc-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                   title="${esc(b.path)}">${esc(b.path) || '(root)'}</div>
              <div style="font-size:11px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                   title="${esc(b.url)}">${esc(b.url)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button class="rc-btn rc-btn--ghost rc-btn--sm bm-open-btn" data-url="${esc(b.url)}"
                      title="Open bookmark in a new tab">↗</button>
              <button class="rc-btn rc-btn--ghost rc-btn--sm bm-copy-btn" data-url="${esc(b.url)}"
                      title="Copy URL to clipboard">📋</button>
            </div>
          </div>`;
      } else {
        const f = item as FlatFolder;
        el.style.cssText = 'border-bottom:1px solid var(--rc-border);padding:7px 4px;';
        el.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;">📁</span>
            <div style="flex:1;">
              <span style="font-weight:600;font-size:12px;color:var(--rc-text);">${esc(f.title)}</span>
              ${f.isEmpty ? '<span style="color:#f59e0b;font-size:10px;margin-left:4px;">empty</span>' : ''}
              <div style="font-size:11px;color:var(--rc-text-muted);">${esc(f.path) || '(root)'} · ${f.bookmarkCount} bookmarks</div>
            </div>
          </div>`;
      }

      fragment.appendChild(el);
    });

    resultsEl.appendChild(fragment);

    if (results.length > 200) {
      const more = document.createElement('div');
      more.style.cssText = 'padding:8px;text-align:center;color:var(--rc-text-muted);font-size:11px;';
      more.textContent = `Showing first 200 of ${results.length} results. Refine your search to narrow results.`;
      resultsEl.appendChild(more);
    }

    // Bind open/copy buttons
    resultsEl.querySelectorAll<HTMLButtonElement>('.bm-open-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url!;
        chrome.tabs.create({ url, active: true });
        logger.info(`${PLUGIN_ID}: opened bookmark — ${url}`);
      });
    });
    resultsEl.querySelectorAll<HTMLButtonElement>('.bm-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url!;
        navigator.clipboard.writeText(url).then(() => {
          ctx.services.notifications.show({
            id: 'bm-copy-' + Date.now(),
            title: 'Bookmark Finder',
            message: 'URL copied!',
            type: 'success',
            duration: 2000,
            pluginId: PLUGIN_ID,
          });
          logger.info(`${PLUGIN_ID}: copied URL — ${url}`);
        });
      });
    });
  }

  function renderRecent(): void {
    if (!scan || scan.recentBookmarks.length === 0) return;
    recentSection.style.display = 'block';
    recentList.innerHTML = scan.recentBookmarks.map(b => `
      <div style="display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--rc-border);padding:5px 0;font-size:11px;">
        <span>🔖</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(b.title)}">${esc(b.title)}</span>
        <span style="color:var(--rc-text-muted);font-size:10px;">${b.dateAdded ? new Date(b.dateAdded).toLocaleDateString() : ''}</span>
        <button class="rc-btn rc-btn--ghost rc-btn--sm bm-recent-open" data-url="${esc(b.url)}"
                title="Open: ${esc(b.url)}">↗</button>
      </div>`).join('');

    recentList.querySelectorAll<HTMLButtonElement>('.bm-recent-open').forEach(btn => {
      btn.addEventListener('click', () => chrome.tabs.create({ url: btn.dataset.url!, active: true }));
    });
  }

  // Analytics toggle
  analyticsToggle.addEventListener('click', () => {
    const visible = analyticsEl.style.display !== 'none';
    analyticsEl.style.display = visible ? 'none' : 'block';
    analyticsToggle.textContent = visible ? '📊 Analytics' : '📊 Hide Analytics';
  });

  // Search
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchEl.addEventListener('input', () => {
    prefs.lastSearch = searchEl.value;
    if (prefs.lastSearch && !prefs.searchHistory.includes(prefs.lastSearch)) {
      prefs.searchHistory = [prefs.lastSearch, ...prefs.searchHistory].slice(0, 20);
    }
    savePrefs();
    clearTimeout(searchTimer!);
    searchTimer = setTimeout(() => renderResults(), 200);
  });
  filterEl.addEventListener('change', () => { prefs.filter = filterEl.value; savePrefs(); renderResults(); });
  optUrls.addEventListener('change',    () => { prefs.includeUrls    = optUrls.checked;    savePrefs(); renderResults(); });
  optFolders.addEventListener('change', () => { prefs.includeFolders = optFolders.checked; savePrefs(); renderResults(); });

  // Re-scan
  scanBtn.addEventListener('click', () => {
    logger.info(`${PLUGIN_ID}: manual re-scan triggered`);
    runScan();
  });

  function setStatus(msg: string, type: 'neutral' | 'success' | 'error'): void {
    statusEl.textContent   = msg;
    statusEl.className     = `rc-status rc-status--${type}`;
    statusEl.style.display = msg ? 'block' : 'none';
  }
}
