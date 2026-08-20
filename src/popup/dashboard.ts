/**
 * Dashboard Controller — Main popup/dashboard entry point.
 * Bootstraps platform, renders plugin cards, manages navigation.
 */

import { bootstrapPlatform } from '../platform/bootstrap';
import { PluginRegistry } from '../platform/registry/PluginRegistry';
import { PluginManager } from '../platform/manager/PluginManager';
import { PluginLoader } from '../platform/loader/PluginLoader';
import { EventBus, PlatformEvents } from '../core/events/EventBus';
import { Logger } from '../core/logging/Logger';
import { NotificationCenter } from '../core/notifications/NotificationCenter';
import { DiagnosticsCenter } from '../core/diagnostics/DiagnosticsCenter';
import { getStorage } from '../core/storage/StorageManager';
import { getSemanticIcon } from '../icons/icon-registry';
import {
  DIAGNOSTICS_SCHEMA_VERSION,
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_COPY_RECIPIENTS,
  FEEDBACK_MAX_ATTACHMENT_COUNT,
  FEEDBACK_MAX_MESSAGE_LENGTH,
  FEEDBACK_MAX_SINGLE_ATTACHMENT_BYTES,
  FEEDBACK_MAX_SUBJECT_LENGTH,
  FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES,
  FEEDBACK_SCHEMA_VERSION,
  FEEDBACK_TO_RECIPIENTS,
  MAILTO_SAFE_LENGTH_THRESHOLD,
} from './feedback-config';
import type { LogEntry, LogLevel, PlatformNotification, NotificationType } from '../sdk/types';

// ─── Dashboard Order Persistence ─────────────────────────────────────────────

const platformStorage = getStorage('platform');
const DASHBOARD_ORDER_KEY = 'dashboard-plugin-order';

async function loadDashboardOrder(): Promise<string[]> {
  return (await platformStorage.get<string[]>(DASHBOARD_ORDER_KEY)) ?? [];
}

async function saveDashboardOrder(order: string[]): Promise<void> {
  await platformStorage.set(DASHBOARD_ORDER_KEY, order);
}

interface FeedbackAttachmentReminder {
  id: string;
  name: string;
  size: number;
}

interface DiagnosticsDownloadState {
  filename: string;
  content: string;
  generatedAt: string;
}

interface FeedbackDraftState {
  diagnosticsFile?: DiagnosticsDownloadState;
  attachmentReminders: FeedbackAttachmentReminder[];
  lastManualFallbackReason?: string;
}

const feedbackState: FeedbackDraftState = {
  attachmentReminders: [],
};

let lastFocusedElement: HTMLElement | null = null;

// ─── Initialize ──────────────────────────────────────────────────────────────

(async () => {
  await bootstrapPlatform();
  initTheme();
  renderPluginNav();
  await renderDashboard();
  await renderPluginManager();
  renderMarketplace();
  bindNavigation();
  bindSearch();
  bindSettings();
  bindActivityView();
  bindDiagnosticsView();
  bindFeedbackView();
  subscribeToEvents();
  updateStats();

  // Version
  const manifest = chrome.runtime.getManifest();
  const vEl = document.getElementById('rc-platform-version');
  if (vEl) vEl.textContent = `v${manifest.version}`;
})();

// ─── Theme ───────────────────────────────────────────────────────────────────

function initTheme(): void {
  const saved = localStorage.getItem('rc-theme') ?? 'dark';
  applyTheme(saved);
  document.getElementById('rc-theme-toggle')?.addEventListener('click', () => {
    const current = document.body.dataset['theme'] ?? 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('rc-theme', next);
  });
}

function applyTheme(theme: string): void {
  document.body.dataset['theme'] = theme;
  const icon = document.getElementById('rc-theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  const sel = document.getElementById('settings-theme') as HTMLSelectElement;
  if (sel) sel.value = theme;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

let currentView = 'dashboard';

function bindNavigation(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset['view'] ?? 'dashboard'));
  });

  document.getElementById('rc-sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('rc-sidebar')?.classList.toggle('rc-sidebar--collapsed');
  });
}

function navigateTo(view: string): void {
  currentView = view;

  // Deactivate all views
  document.querySelectorAll('.rc-view').forEach(v => v.classList.remove('rc-view--active'));
  document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('rc-nav__item--active'));

  // Activate target
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('rc-view--active');

  const btnEl = document.querySelector<HTMLButtonElement>(`[data-view="${view}"]`);
  if (btnEl) btnEl.classList.add('rc-nav__item--active');

  // Update breadcrumb
  const crumb = document.getElementById('rc-breadcrumb');
  if (crumb) crumb.textContent = btnEl?.querySelector('.rc-nav__label')?.textContent ?? view;

  // If plugin view: navigate to plugin container
  if (view.startsWith('plugin-')) {
    document.getElementById('view-plugin-content')?.classList.add('rc-view--active');
  }
}

// ─── Dashboard Rendering ──────────────────────────────────────────────────────

async function renderDashboard(): Promise<void> {
  const registry = PluginRegistry.getInstance();
  const components = registry.getAllDashboardComponents();
  const container = document.getElementById('rc-dashboard-widgets')!;
  const actionsGrid = document.getElementById('rc-quick-actions-grid')!;

  container.innerHTML = '';

  if (components.length === 0) {
    container.innerHTML = createEmptyState('No dashboard widgets yet', 'Active plugins can register widgets here for at-a-glance platform insights.');
  } else {
    // Apply persisted order: sort components by saved order, append unknowns at end
    const savedOrder = await loadDashboardOrder();
    const ordered = [...components].sort((a, b) => {
      const ai = savedOrder.indexOf(a.pluginId);
      const bi = savedOrder.indexOf(b.pluginId);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    for (const comp of ordered) {
      const card = createDashboardWidget(comp);
      container.appendChild(card);
    }
  }

  // Quick actions
  actionsGrid.innerHTML = '';
  const entries = registry.getActive();
  const actions = entries.flatMap(e =>
    Array.from(e.actions.values()).map(a => ({ ...a, pluginId: e.manifest.id }))
  );

  if (actions.length === 0) {
    actionsGrid.innerHTML = createEmptyState('No quick actions available', 'Plugin actions will appear here when active plugins register them with the platform.');
  } else {
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = 'rc-action-card';
      btn.innerHTML = `<span class="rc-action-card__icon">${action.icon ?? '⚡'}</span>
                       <span class="rc-action-card__label">${escapeHtml(action.label)}</span>`;
      btn.addEventListener('click', async () => {
        const plugin = PluginLoader.getInstance().getPlugin(action.pluginId);
        if (plugin) {
          const result = await plugin.handleAction(action.id, {});
          showToast({
            message: result.message ?? 'Action executed',
            type: result.success ? 'success' : 'error',
            title: action.label,
            source: action.pluginId,
          });
        }
      });
      actionsGrid.appendChild(btn);
    }
  }
}

function createDashboardWidget(comp: { id: string; title: string; pluginId: string; size: string }): HTMLElement {
  const card = document.createElement('div');
  card.className = `rc-widget-card rc-widget-card--${comp.size}`;
  card.dataset['componentId'] = comp.id;
  card.dataset['pluginId'] = comp.pluginId;
  card.innerHTML = `
    <div class="rc-widget-card__header">
      <span class="rc-widget-card__title">${escapeHtml(comp.title)}</span>
      <button class="rc-widget-card__open" data-view="plugin-${comp.pluginId}" title="Open plugin">↗</button>
    </div>
    <div class="rc-widget-card__body" id="widget-${comp.id}">
      <div class="rc-widget-loading">Loading...</div>
    </div>`;

  card.querySelector('.rc-widget-card__open')?.addEventListener('click', () => {
    navigateTo(`plugin-${comp.pluginId}`);
  });

  // Render widget content
  setTimeout(async () => {
    const bodyEl = document.getElementById(`widget-${comp.id}`);
    if (!bodyEl) return;
    const plugin = PluginLoader.getInstance().getPlugin(comp.pluginId);
    if (plugin) {
      try {
        await plugin.renderView(comp.id, bodyEl);
      } catch (_) {
        bodyEl.innerHTML = '<div class="rc-empty-state rc-empty-state--error"><div class="rc-empty-state__title">Widget unavailable</div><div class="rc-empty-state__body">The plugin widget could not be rendered.</div></div>';
      }
    }
  }, 50);

  return card;
}

// ─── Plugin Manager Rendering ────────────────────────────────────────────────

// ─── Plugin Manager — sort state ──────────────────────────────────────────────

type SortField = 'name' | 'version' | 'status';
let pmSortField: SortField = 'name';
let pmSortAsc = true;

async function renderPluginManager(): Promise<void> {
  const registry = PluginRegistry.getInstance();
  const entries = registry.getAll();
  const container = document.getElementById('rc-plugin-grid')!;
  container.innerHTML = '';

  if (entries.length === 0) {
    container.innerHTML = createEmptyState('No plugins installed', 'Install or enable plugins to manage them here.');
    document.getElementById('rc-plugin-count')!.textContent = '0';
    return;
  }

  // ── Sort header ──
  const savedOrder = await loadDashboardOrder();

  const header = document.createElement('div');
  header.className = 'rc-plist-header';
  header.innerHTML = `
    <span class="rc-plist-col rc-plist-col--status"></span>
    <span class="rc-plist-col rc-plist-col--name rc-plist-sort" data-sort="name">
      Plugin ${pmSortField === 'name' ? (pmSortAsc ? '▲' : '▼') : ''}
    </span>
    <span class="rc-plist-col rc-plist-col--version rc-plist-sort" data-sort="version">
      Version ${pmSortField === 'version' ? (pmSortAsc ? '▲' : '▼') : ''}
    </span>
    <span class="rc-plist-col rc-plist-col--tags">Tags</span>
    <span class="rc-plist-col rc-plist-col--toggle rc-plist-sort" data-sort="status">
      Enabled ${pmSortField === 'status' ? (pmSortAsc ? '▲' : '▼') : ''}
    </span>
    <span class="rc-plist-col rc-plist-col--open">Open</span>
    <span class="rc-plist-col rc-plist-col--order">Order</span>`;

  header.querySelectorAll<HTMLElement>('.rc-plist-sort').forEach(th => {
    th.addEventListener('click', async () => {
      const field = th.dataset['sort'] as SortField;
      if (pmSortField === field) { pmSortAsc = !pmSortAsc; }
      else { pmSortField = field; pmSortAsc = true; }
      await renderPluginManager();
    });
  });
  container.appendChild(header);

  // ── Sort entries ──
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    if (pmSortField === 'name')    cmp = a.manifest.name.localeCompare(b.manifest.name);
    if (pmSortField === 'version') cmp = a.manifest.version.localeCompare(b.manifest.version);
    if (pmSortField === 'status')  cmp = a.health.status.localeCompare(b.health.status);
    return pmSortAsc ? cmp : -cmp;
  });

  for (const entry of sorted) {
    container.appendChild(await createPluginRow(entry, savedOrder, sorted));
  }

  document.getElementById('rc-plugin-count')!.textContent = String(entries.length);
}

async function createPluginRow(
  entry: ReturnType<PluginRegistry['getAll']>[0],
  savedOrder: string[],
  allEntries: ReturnType<PluginRegistry['getAll']>
): Promise<HTMLElement> {
  const { manifest, health } = entry;
  const manager = PluginManager.getInstance();
  const isEnabled = manager.isEnabled(manifest.id);
  const statusClass = `rc-health--${health.status}`;
  const tags = (manifest.tags ?? []).slice(0, 3).map((t: string) => `<span class="rc-tag">${escapeHtml(t)}</span>`).join('');

  // Determine current position in saved order (fall back to registration order)
  const orderList: string[] = savedOrder.length > 0
    ? savedOrder
    : allEntries.map(e => e.manifest.id);
  const pos = orderList.indexOf(manifest.id);
  const isFirst = pos === 0 || (pos === -1 && allEntries[0].manifest.id === manifest.id);
  const isLast  = pos === orderList.length - 1 || (pos === -1 && allEntries[allEntries.length - 1].manifest.id === manifest.id);

  const row = document.createElement('div');
  row.className = `rc-plist-row${isEnabled ? '' : ' rc-plist-row--disabled'}`;
  row.dataset['pluginId'] = manifest.id;
  row.dataset['category'] = manifest.category;
  row.dataset['status'] = health.status;
  row.title = escapeHtml(manifest.description);

  row.innerHTML = `
    <span class="rc-plist-col rc-plist-col--status">
      <span class="rc-health ${statusClass}" title="${health.status}"></span>
    </span>
    <span class="rc-plist-col rc-plist-col--name">
      <span class="rc-plist-icon">${manifest.icon ?? getCategoryIcon(manifest.category)}</span>
      <span class="rc-plist-name">${escapeHtml(manifest.name)}</span>
    </span>
    <span class="rc-plist-col rc-plist-col--version rc-muted">v${escapeHtml(manifest.version)}</span>
    <span class="rc-plist-col rc-plist-col--tags">${tags || `<span class="rc-tag">${escapeHtml(manifest.category)}</span>`}</span>
    <span class="rc-plist-col rc-plist-col--toggle">
      <label class="rc-toggle" title="${isEnabled ? 'Disable' : 'Enable'} plugin">
        <input type="checkbox" class="rc-toggle__input js-plugin-toggle" ${isEnabled ? 'checked' : ''} />
        <span class="rc-toggle__slider"></span>
      </label>
    </span>
    <span class="rc-plist-col rc-plist-col--open">
      <button class="rc-btn rc-btn--ghost rc-btn--xs js-plugin-open">Open</button>
    </span>
    <span class="rc-plist-col rc-plist-col--order">
      <button class="rc-btn rc-btn--ghost rc-btn--xs js-order-up" ${isFirst ? 'disabled' : ''} title="Move Up">▲</button>
      <button class="rc-btn rc-btn--ghost rc-btn--xs js-order-down" ${isLast ? 'disabled' : ''} title="Move Down">▼</button>
    </span>`;

  // Open plugin
  row.querySelector('.js-plugin-open')?.addEventListener('click', () => {
    loadPluginView(manifest.id);
    navigateTo(`plugin-${manifest.id}`);
  });

  // Enable/disable toggle
  const toggle = row.querySelector<HTMLInputElement>('.js-plugin-toggle')!;
  toggle.addEventListener('change', async () => {
    try {
      if (toggle.checked) {
        await manager.enablePlugin(manifest.id);
        showToast({ message: `${manifest.name} enabled`, type: 'success', title: 'Plugin Manager', source: manifest.id });
      } else {
        await manager.disablePlugin(manifest.id);
        showToast({ message: `${manifest.name} disabled`, type: 'info', title: 'Plugin Manager', source: manifest.id });
      }
      updateStats();
      renderPluginNav();
    } catch (err) {
      showToast({ message: `Toggle failed: ${String(err)}`, type: 'error', title: manifest.name, source: manifest.id });
      toggle.checked = !toggle.checked;
    }
  });

  // Move Up
  row.querySelector('.js-order-up')?.addEventListener('click', async () => {
    const current = await loadDashboardOrder();
    const list = current.length > 0 ? [...current] : allEntries.map(e => e.manifest.id);
    const idx = list.indexOf(manifest.id);
    if (idx > 0) {
      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
      await saveDashboardOrder(list);
      await renderPluginManager();
      await renderDashboard();
      showToast({ message: `${manifest.name} moved up`, type: 'info', title: 'Plugin order updated', source: manifest.id });
    }
  });

  // Move Down
  row.querySelector('.js-order-down')?.addEventListener('click', async () => {
    const current = await loadDashboardOrder();
    const list = current.length > 0 ? [...current] : allEntries.map(e => e.manifest.id);
    const idx = list.indexOf(manifest.id);
    if (idx !== -1 && idx < list.length - 1) {
      [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
      await saveDashboardOrder(list);
      await renderPluginManager();
      await renderDashboard();
      showToast({ message: `${manifest.name} moved down`, type: 'info', title: 'Plugin order updated', source: manifest.id });
    }
  });

  return row;
}

function loadPluginView(pluginId: string): void {
  const viewId = `plugin-${pluginId}`;
  let viewEl = document.getElementById(`view-${viewId}`);

  if (!viewEl) {
    viewEl = document.createElement('div');
    viewEl.className = 'rc-view rc-plugin-view';
    viewEl.id = `view-${viewId}`;
    document.getElementById('rc-plugin-views')!.appendChild(viewEl);

    // Add nav item if not present
    if (!document.querySelector(`[data-view="${viewId}"]`)) {
      const btn = document.createElement('button');
      const entry = PluginRegistry.getInstance().get(pluginId);
      btn.className = 'rc-nav__item';
      btn.dataset['view'] = viewId;
      btn.innerHTML = `<span class="rc-nav__icon">${entry?.manifest.icon ?? getCategoryIcon(entry?.manifest.category ?? 'utility')}</span>
                       <span class="rc-nav__label">${escapeHtml(entry?.manifest.name ?? pluginId)}</span>`;
      btn.addEventListener('click', () => navigateTo(viewId));
      document.getElementById('rc-plugin-nav-items')!.appendChild(btn);
    }

    // Render plugin content
    const plugin = PluginLoader.getInstance().getPlugin(pluginId);
    if (plugin) {
      plugin.renderView('main', viewEl).catch(() => {
        viewEl!.innerHTML = '<div class="rc-view-error">Plugin view failed to render.</div>';
      });
    } else {
      const entry = PluginRegistry.getInstance().get(pluginId);
      viewEl.innerHTML = `
        <div class="rc-view__header">
          <h1 class="rc-view__title">${escapeHtml(entry?.manifest.name ?? pluginId)}</h1>
        </div>
        <div class="rc-panel-body rc-muted">Plugin is not currently active.</div>`;
    }
  }
}

// ─── Plugin Nav ───────────────────────────────────────────────────────────────

function renderPluginNav(): void {
  const navContainer = document.getElementById('rc-plugin-nav-items')!;
  navContainer.innerHTML = '';
  const pages = PluginRegistry.getInstance().getAllPages().filter(p => p.showInSidebar);

  if (pages.length === 0) {
    navContainer.innerHTML = '<div class="rc-nav__empty">No plugin pages</div>';
    return;
  }

  pages.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  for (const page of pages) {
    const btn = document.createElement('button');
    const viewId = `plugin-${page.pluginId}`;
    btn.className = 'rc-nav__item';
    btn.dataset['view'] = viewId;
    btn.innerHTML = `<span class="rc-nav__icon">${page.icon ?? '🔌'}</span>
                     <span class="rc-nav__label">${escapeHtml(page.title)}</span>`;
    btn.addEventListener('click', () => {
      loadPluginView(page.pluginId);
      navigateTo(viewId);
    });
    navContainer.appendChild(btn);
  }
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

function renderMarketplace(): void {
  const grid = document.getElementById('rc-marketplace-grid')!;
  const futurePlugins = [
    { name: 'ServiceNow', icon: '🎫', category: 'itsm', desc: 'Extract and manage ServiceNow incidents and requests.', status: 'coming-soon' },
    { name: 'Jira', icon: '📌', category: 'project-management', desc: 'View and interact with Jira issues directly.', status: 'coming-soon' },
    { name: 'Confluence', icon: '📚', category: 'productivity', desc: 'Search and embed Confluence pages.', status: 'coming-soon' },
    { name: 'Microsoft 365', icon: '🪟', category: 'productivity', desc: 'Integrate with Teams, Outlook, and SharePoint.', status: 'coming-soon' },
    { name: 'Azure DevOps', icon: '☁️', category: 'developer-tools', desc: 'Work items, pipelines, and repos from Azure DevOps.', status: 'coming-soon' },
    { name: 'Power BI', icon: '📊', category: 'analytics', desc: 'Embed and interact with Power BI reports.', status: 'coming-soon' },
    { name: 'Zendesk', icon: '🎧', category: 'itsm', desc: 'Manage support tickets directly from the browser.', status: 'coming-soon' },
    { name: 'AI Assistant', icon: '🤖', category: 'ai-assistant', desc: 'Integrate with WatsonX, OpenAI, or Azure AI.', status: 'coming-soon' },
    { name: 'SAP', icon: '⚙️', category: 'enterprise', desc: 'SAP transaction helper and data extractor.', status: 'coming-soon' },
    { name: 'Workday', icon: '🧑‍💼', category: 'enterprise', desc: 'HR and financial data at your fingertips.', status: 'coming-soon' },
  ];

  grid.innerHTML = '';
  for (const p of futurePlugins) {
    const card = document.createElement('div');
    card.className = 'rc-marketplace-card';
    card.innerHTML = `
      <div class="rc-marketplace-card__icon">${p.icon}</div>
      <div class="rc-marketplace-card__meta">
        <div class="rc-marketplace-card__name">${escapeHtml(p.name)}</div>
        <span class="rc-badge rc-badge--category">${p.category}</span>
      </div>
      <p class="rc-marketplace-card__desc">${escapeHtml(p.desc)}</p>
      <div class="rc-marketplace-card__footer">
        <span class="rc-coming-soon">Coming Soon</span>
      </div>`;
    grid.appendChild(card);
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function bindActivityView(): void {
  const logList = document.getElementById('rc-log-list')!;
  const levelFilter = document.getElementById('activity-log-level') as HTMLSelectElement;
  const pluginFilter = document.getElementById('activity-plugin-filter') as HTMLSelectElement;
  const clearBtn = document.getElementById('activity-clear-btn')!;

  // Populate plugin filter
  const entries = PluginRegistry.getInstance().getAll();
  for (const e of entries) {
    const opt = document.createElement('option');
    opt.value = e.manifest.id;
    opt.textContent = e.manifest.name;
    pluginFilter.appendChild(opt);
  }

  function renderLogs(): void {
    const level = levelFilter.value;
    const plugin = pluginFilter.value;
    const logs = Logger.getAllEntries(200)
      .filter(l => (!level || l.level === level) && (!plugin || l.pluginId === plugin))
      .reverse();

    logList.innerHTML = '';
    if (logs.length === 0) {
      logList.innerHTML = '<div class="rc-log-empty">No activity matches the current filters.</div>';
      return;
    }
    for (const entry of logs) {
      logList.appendChild(createLogEntry(entry));
    }
  }

  levelFilter.addEventListener('change', renderLogs);
  pluginFilter.addEventListener('change', renderLogs);
  clearBtn.addEventListener('click', () => { Logger.clearEntries(); renderLogs(); });

  EventBus.getInstance().on(PlatformEvents.LOG_ENTRY, () => {
    if (currentView === 'activity') renderLogs();
  });

  // Initial render when view is opened
  document.querySelector('[data-view="activity"]')?.addEventListener('click', renderLogs);
}

function createLogEntry(entry: LogEntry): HTMLElement {
  const el = document.createElement('div');
  const normalizedLevel = normalizeLogLevel(entry.level);
  const time = new Date(entry.timestamp).toLocaleTimeString();
  el.className = `rc-log-entry rc-log-entry--${normalizedLevel}`;
  el.innerHTML = `
    <span class="rc-log-entry__time">${time}</span>
    <span class="rc-log-entry__level">${normalizedLevel.toUpperCase()}</span>
    <span class="rc-log-entry__plugin">${entry.pluginId || 'platform'}</span>
    <span class="rc-log-entry__msg">${escapeHtml(entry.message)}</span>`;
  return el;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

function subscribeToEvents(): void {
  const bus = EventBus.getInstance();

  bus.on(PlatformEvents.NOTIFICATION, (data: unknown) => {
    const payload = data as { action: string; notification: PlatformNotification };
    if (payload.action === 'show') {
      showToast({
        message: payload.notification.message,
        type: payload.notification.type,
        title: payload.notification.title,
        source: payload.notification.pluginId,
      });
      updateNotifBadge();
      if (currentView === 'notifications') renderNotificationList();
    }
  });

  bus.on(PlatformEvents.PLUGIN_LOADED, async () => {
    updateStats();
    renderPluginNav();
    await renderPluginManager();
    await renderDashboard();
  });

  bus.on(PlatformEvents.PLUGIN_ACTIVATED, async () => { updateStats(); await renderPluginManager(); });
  bus.on(PlatformEvents.PLUGIN_DEACTIVATED, async () => { updateStats(); await renderPluginManager(); });
}

function renderNotificationList(): void {
  const list = document.getElementById('rc-notif-list')!;
  const notifs = NotificationCenter.getInstance().getHistory(50).reverse();
  list.innerHTML = '';
  if (notifs.length === 0) {
    list.innerHTML = createEmptyState('No notifications', 'Platform and plugin updates will appear here when something needs your attention.');
    return;
  }
  for (const n of notifs) {
    const el = document.createElement('div');
    const time = n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : '';
    el.className = `rc-notif-item rc-notif-item--${n.type}`;
    el.innerHTML = `
      <div class="rc-notif-item__header">
        <span class="rc-notif-item__icon">${getToastIcon(n.type)}</span>
        <span class="rc-notif-item__title">${escapeHtml(n.title)}</span>
        <span class="rc-notif-item__plugin">${escapeHtml(n.pluginId ?? 'platform')}</span>
        <span class="rc-notif-item__time">${time}</span>
      </div>
      <div class="rc-notif-item__body">${escapeHtml(n.message)}</div>`;
    list.appendChild(el);
  }
}

function updateNotifBadge(): void {
  const count = NotificationCenter.getInstance().getUnreadCount();
  const badge = document.getElementById('rc-notif-count')!;
  const dot = document.getElementById('rc-notif-dot')!;
  const navBadge = document.querySelector<HTMLElement>('#rc-notif-count')!;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
  dot.style.display = count > 0 ? 'block' : 'none';
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

function bindDiagnosticsView(): void {
  document.getElementById('rc-diag-refresh')?.addEventListener('click', loadDiagnostics);
  document.querySelector('[data-view="diagnostics"]')?.addEventListener('click', loadDiagnostics);
}

async function loadDiagnostics(): Promise<void> {
  const output = document.getElementById('rc-diag-output')!;
  output.textContent = 'Loading diagnostics...';
  try {
    const diag = await DiagnosticsCenter.getInstance().getDiagnostics();
    output.textContent = JSON.stringify(diag, null, 2);
  } catch (err) {
    output.textContent = `Error: ${String(err)}`;
  }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

function bindFeedbackView(): void {
  const navIcon = document.getElementById('rc-feedback-nav-icon');
  if (navIcon) navIcon.textContent = getSemanticIcon('documentation.feature');

  const categorySelect = document.getElementById('rc-feedback-category') as HTMLSelectElement | null;
  if (categorySelect) {
    for (const option of FEEDBACK_CATEGORY_OPTIONS) {
      const el = document.createElement('option');
      el.value = option.value;
      el.textContent = option.label;
      categorySelect.appendChild(el);
    }
  }

  renderFeedbackRecipients();
  renderFeedbackAttachments();
  void refreshDiagnosticsPreview();

  document.getElementById('rc-feedback-open-dialog')?.addEventListener('click', () => {
    openFeedbackDialog();
  });

  document.getElementById('rc-feedback-close')?.addEventListener('click', (event) => {
    event.preventDefault();
    cancelFeedbackWorkflow();
  });

  document.getElementById('rc-feedback-cancel')?.addEventListener('click', (event) => {
    event.preventDefault();
    cancelFeedbackWorkflow();
  });

  document.getElementById('rc-feedback-open-email')?.addEventListener('click', async () => {
    await handleOpenEmailClient();
  });

  document.getElementById('rc-feedback-generate-diagnostics')?.addEventListener('click', async () => {
    await generateDiagnosticsDownload();
  });

  document.getElementById('rc-feedback-download-diagnostics')?.addEventListener('click', () => {
    downloadDiagnosticsFile();
  });

  document.getElementById('rc-feedback-copy-addresses')?.addEventListener('click', async () => {
    await copyFeedbackValue(FEEDBACK_COPY_RECIPIENTS, 'Feedback copied for manual submission.');
  });

  document.getElementById('rc-feedback-copy-subject')?.addEventListener('click', async () => {
    await copyFeedbackValue(buildPreparedSubject(), 'Feedback copied for manual submission.');
  });

  document.getElementById('rc-feedback-copy-body')?.addEventListener('click', async () => {
    await copyFeedbackValue(await buildPreparedBody(), 'Feedback copied for manual submission.');
  });

  const attachmentPicker = document.getElementById('rc-feedback-attachment-picker') as HTMLInputElement | null;
  document.getElementById('rc-feedback-add-attachments')?.addEventListener('click', () => {
    attachmentPicker?.click();
  });

  attachmentPicker?.addEventListener('change', () => {
    const files = attachmentPicker.files ? Array.from(attachmentPicker.files) : [];
    addAttachmentReminders(files);
    attachmentPicker.value = '';
  });

  document.getElementById('rc-feedback-include-plugins')?.addEventListener('change', () => { void refreshDiagnosticsPreview(); });
  document.getElementById('rc-feedback-include-locale')?.addEventListener('change', () => { void refreshDiagnosticsPreview(); });
  document.getElementById('rc-feedback-include-correlation')?.addEventListener('change', () => { void refreshDiagnosticsPreview(); });

  const dialog = document.getElementById('rc-feedback-dialog') as HTMLDialogElement | null;
  dialog?.addEventListener('close', () => {
    clearFeedbackStatus();
    lastFocusedElement?.focus();
  });
}

function openFeedbackDialog(): void {
  const dialog = document.getElementById('rc-feedback-dialog') as HTMLDialogElement | null;
  if (!dialog) return;

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.showModal();
  announceFeedbackStatus('Feedback dialog opened.');
  const firstField = document.getElementById('rc-feedback-category') as HTMLSelectElement | null;
  firstField?.focus();
}

function closeFeedbackDialog(): void {
  const dialog = document.getElementById('rc-feedback-dialog') as HTMLDialogElement | null;
  if (dialog?.open) dialog.close();
}

function cancelFeedbackWorkflow(): void {
  clearFeedbackValidation();
  clearFeedbackStatus();
  feedbackState.attachmentReminders = [];
  feedbackState.diagnosticsFile = undefined;
  feedbackState.lastManualFallbackReason = undefined;
  renderFeedbackAttachments();
  renderDiagnosticsFileState();
  setManualInstructions('Feedback preparation cancelled.');
  announceFeedbackStatus('Feedback preparation cancelled.');
  closeFeedbackDialog();
}

function renderFeedbackRecipients(): void {
  const list = document.getElementById('rc-feedback-recipients');
  if (!list) return;
  list.innerHTML = '';
  for (const recipient of FEEDBACK_TO_RECIPIENTS) {
    const item = document.createElement('li');
    item.textContent = recipient;
    list.appendChild(item);
  }
}

function getFeedbackFieldValue(id: string): string {
  const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  return field?.value.trim() ?? '';
}

function setFeedbackError(id: string, message: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearFeedbackValidation(): void {
  setFeedbackError('rc-feedback-category-error', '');
  setFeedbackError('rc-feedback-subject-error', '');
  setFeedbackError('rc-feedback-message-error', '');
}

function validateFeedbackForm(): boolean {
  clearFeedbackValidation();

  const category = getFeedbackFieldValue('rc-feedback-category');
  const subject = getFeedbackFieldValue('rc-feedback-subject');
  const message = getFeedbackFieldValue('rc-feedback-message');
  let valid = true;

  if (!FEEDBACK_CATEGORY_OPTIONS.some(option => option.value === category)) {
    setFeedbackError('rc-feedback-category-error', 'Select a feedback category.');
    valid = false;
  }
  if (!subject) {
    setFeedbackError('rc-feedback-subject-error', 'Enter a subject.');
    valid = false;
  } else if (subject.length > FEEDBACK_MAX_SUBJECT_LENGTH) {
    setFeedbackError('rc-feedback-subject-error', `Subject must be ${FEEDBACK_MAX_SUBJECT_LENGTH} characters or fewer.`);
    valid = false;
  }
  if (!message) {
    setFeedbackError('rc-feedback-message-error', 'Enter a message or issue description.');
    valid = false;
  } else if (message.length > FEEDBACK_MAX_MESSAGE_LENGTH) {
    setFeedbackError('rc-feedback-message-error', `Message must be ${FEEDBACK_MAX_MESSAGE_LENGTH} characters or fewer.`);
    valid = false;
  }

  if (!valid) announceFeedbackStatus('Validation errors need attention.');
  return valid;
}

async function refreshDiagnosticsPreview(): Promise<void> {
  const preview = document.getElementById('rc-feedback-diagnostics-preview');
  if (!preview) return;
  preview.textContent = 'Loading diagnostics preview...';
  preview.textContent = await buildDiagnosticsSummary();
  renderDiagnosticsFileState();
}

async function buildDiagnosticsSummary(): Promise<string> {
  const diagnostics = await DiagnosticsCenter.getInstance().getDiagnostics();
  const manifest = chrome.runtime.getManifest();
  const includePlugins = (document.getElementById('rc-feedback-include-plugins') as HTMLInputElement | null)?.checked ?? true;
  const includeLocale = (document.getElementById('rc-feedback-include-locale') as HTMLInputElement | null)?.checked ?? true;
  const includeCorrelation = (document.getElementById('rc-feedback-include-correlation') as HTMLInputElement | null)?.checked ?? true;
  const lines: string[] = [];

  lines.push('Diagnostic summary');
  lines.push('------------------');
  lines.push(`ReplyCators version: ${manifest.version}`);
  lines.push(`Extension version: ${manifest.version}`);
  lines.push('Build: Not available');
  lines.push(`Browser: ${diagnostics.browser.name || 'Not available'}`);
  lines.push(`Browser version: ${diagnostics.browser.version || 'Not available'}`);
  lines.push(`Platform: ${diagnostics.browser.platform || 'Not available'}`);
  lines.push('Application host: Microsoft Edge extension');
  lines.push('Installation channel: Not available');
  if (includeLocale) {
    lines.push(`Locale: ${navigator.language || 'Not available'}`);
    lines.push(`Theme: ${(document.body.dataset['theme'] ?? 'Not available') || 'Not available'}`);
  }
  if (includePlugins) {
    const plugins = Object.entries(diagnostics.plugins)
      .filter(([, health]) => health.status === 'active')
      .map(([pluginId]) => {
        const entry = PluginRegistry.getInstance().get(pluginId);
        return `${pluginId}@${entry?.manifest.version ?? 'Not available'}`;
      });
    lines.push(`Enabled plugins: ${plugins.length > 0 ? plugins.join(', ') : 'Not available'}`);
  }
  lines.push(`Diagnostics schema version: ${DIAGNOSTICS_SCHEMA_VERSION}`);
  lines.push(`Generated at: ${new Date().toString()}`);
  if (includeCorrelation) {
    lines.push('Correlation ID: Not available');
    lines.push(`Diagnostics file: ${feedbackState.diagnosticsFile?.filename ?? 'Not available'}`);
  }

  return lines.join('\n');
}

function renderDiagnosticsFileState(): void {
  const info = document.getElementById('rc-feedback-diagnostics-file');
  const button = document.getElementById('rc-feedback-download-diagnostics') as HTMLButtonElement | null;
  if (info) {
    info.textContent = feedbackState.diagnosticsFile
      ? `Diagnostics file ready: ${feedbackState.diagnosticsFile.filename}. Download Diagnostics saves the file locally. Attach it manually in your email application.`
      : 'No diagnostics file generated yet.';
  }
  if (button) button.disabled = !feedbackState.diagnosticsFile;
}

async function generateDiagnosticsDownload(): Promise<void> {
  try {
    const diagnostics = await DiagnosticsCenter.getInstance().getDiagnostics();
    const now = new Date();
    const filename = `ReplyCators-Diagnostics-${formatTimestampForFilename(now)}.json`;
    const content = JSON.stringify({
      schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
      generatedAt: now.toISOString(),
      replyCatorsVersion: chrome.runtime.getManifest().version,
      browser: diagnostics.browser,
      plugins: Object.fromEntries(
        Object.entries(diagnostics.plugins)
          .filter(([, health]) => health.status === 'active')
          .map(([pluginId, health]) => {
            const entry = PluginRegistry.getInstance().get(pluginId);
            return [pluginId, { version: entry?.manifest.version ?? 'Not available', status: health.status }];
          })
      ),
      storage: diagnostics.storage,
      logs: {
        total: diagnostics.logs.total,
        errors: diagnostics.logs.errors,
        warnings: diagnostics.logs.warnings,
      },
      events: {
        total: diagnostics.events.total,
      },
    }, null, 2);

    feedbackState.diagnosticsFile = {
      filename,
      content,
      generatedAt: now.toISOString(),
    };
    renderDiagnosticsFileState();
    await refreshDiagnosticsPreview();
    announceFeedbackStatus('Diagnostics downloaded.');
  } catch {
    announceFeedbackStatus('Diagnostics generation failed.');
  }
}

function downloadDiagnosticsFile(): void {
  if (!feedbackState.diagnosticsFile) return;
  const blob = new Blob([feedbackState.diagnosticsFile.content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = feedbackState.diagnosticsFile.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  announceFeedbackStatus('Diagnostics downloaded.');
}

function addAttachmentReminders(files: File[]): void {
  if (files.length === 0) return;

  let totalSize = feedbackState.attachmentReminders.reduce((sum, file) => sum + file.size, 0);
  for (const file of files) {
    if (!file.name || file.size === 0) continue;
    if (feedbackState.attachmentReminders.some(existing => existing.name === file.name && existing.size === file.size)) continue;
    if (feedbackState.attachmentReminders.length >= FEEDBACK_MAX_ATTACHMENT_COUNT) break;
    if (file.size > FEEDBACK_MAX_SINGLE_ATTACHMENT_BYTES) continue;
    if (totalSize + file.size > FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES) continue;
    feedbackState.attachmentReminders.push({
      id: `${file.name}-${file.size}`,
      name: file.name,
      size: file.size,
    });
    totalSize += file.size;
  }
  renderFeedbackAttachments();
}

function renderFeedbackAttachments(): void {
  const list = document.getElementById('rc-feedback-attachments');
  const help = document.getElementById('rc-feedback-attachment-help');
  if (!list || !help) return;

  list.innerHTML = '';
  if (feedbackState.attachmentReminders.length === 0) {
    list.innerHTML = '<li class="rc-feedback-attachment-empty">No attachment reminders selected.</li>';
    help.textContent = 'Selected files are used only for reminder names and sizes. ReplyCators does not upload or attach them.';
    return;
  }

  for (const attachment of feedbackState.attachmentReminders) {
    const item = document.createElement('li');
    item.className = 'rc-feedback-attachment';
    item.innerHTML = `<span>${escapeHtml(attachment.name)} (${formatBytes(attachment.size)})</span>`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rc-btn rc-btn--ghost rc-btn--xs';
    button.textContent = 'Remove';
    button.setAttribute('aria-label', `Remove attachment reminder ${attachment.name}`);
    button.addEventListener('click', () => {
      feedbackState.attachmentReminders = feedbackState.attachmentReminders.filter(file => file.id !== attachment.id);
      renderFeedbackAttachments();
    });
    item.appendChild(button);
    list.appendChild(item);
  }

  help.textContent = 'Attachments cannot be added automatically to your email application. After the draft opens, attach the files listed below manually.';
}

function buildPreparedSubject(): string {
  const category = getFeedbackFieldValue('rc-feedback-category');
  const categoryLabel = FEEDBACK_CATEGORY_OPTIONS.find(option => option.value === category)?.label ?? 'Feedback';
  return `[${categoryLabel}] ${getFeedbackFieldValue('rc-feedback-subject')}`;
}

async function buildPreparedBody(): Promise<string> {
  const diagnosticsSummary = await buildDiagnosticsSummary();
  const lines: string[] = [
    'ReplyCators feedback',
    '--------------------',
    '',
    `Category: ${FEEDBACK_CATEGORY_OPTIONS.find(option => option.value === getFeedbackFieldValue('rc-feedback-category'))?.label ?? 'Not available'}`,
    `Subject: ${getFeedbackFieldValue('rc-feedback-subject') || 'Not available'}`,
    '',
    'User message:',
    getFeedbackFieldValue('rc-feedback-message') || 'Not available',
    '',
    diagnosticsSummary,
  ];

  if (feedbackState.diagnosticsFile) {
    lines.push('', 'Downloaded diagnostics report', '---------------------------', `Diagnostics file: ${feedbackState.diagnosticsFile.filename}`, 'Attach the diagnostics file manually in your email application.');
  }

  if (feedbackState.attachmentReminders.length > 0) {
    lines.push('', 'Manual attachments', '------------------');
    for (const attachment of feedbackState.attachmentReminders) {
      lines.push(`- ${attachment.name} (${formatBytes(attachment.size)})`);
    }
    lines.push('Attachments cannot be added automatically. Add them manually after the draft opens.');
  }

  return lines.join('\n');
}

async function handleOpenEmailClient(): Promise<void> {
  if (!validateFeedbackForm()) return;

  const subject = buildPreparedSubject();
  const body = await buildPreparedBody();
  const mailto = buildMailtoUri(subject, body);

  if (mailto.length > MAILTO_SAFE_LENGTH_THRESHOLD) {
    feedbackState.lastManualFallbackReason = 'The prepared draft is too long for reliable automatic handoff.';
    setManualInstructions('The prepared draft is too long for reliable automatic handoff. Copy the recipients, subject, and feedback, then create the email manually in your preferred email application.');
    announceFeedbackStatus('Email application could not be opened.');
    return;
  }

  try {
    window.location.href = mailto;
    feedbackState.lastManualFallbackReason = undefined;
    setManualInstructions(buildAttachmentReminderText('Email draft handoff started. Review the draft, attach files manually, and send it from your email application.'));
    announceFeedbackStatus('Email draft handoff started.');
  } catch {
    feedbackState.lastManualFallbackReason = 'The email application could not be opened.';
    setManualInstructions('The email application could not be opened. Copy the recipients, subject, and feedback, then create the email manually in your preferred email application.');
    announceFeedbackStatus('Email application could not be opened.');
  }
}

function buildMailtoUri(subject: string, body: string): string {
  const query = new URLSearchParams({
    subject: sanitizeMailtoValue(subject),
    body: sanitizeMailtoValue(body),
  });
  return `mailto:${FEEDBACK_TO_RECIPIENTS.join(',')}?${query.toString()}`;
}

function sanitizeMailtoValue(value: string): string {
  return value.replace(/[\r\n]+/g, '\n').replace(/[&?]/g, match => (match === '&' ? '%26' : '%3F'));
}

async function copyFeedbackValue(value: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    setManualInstructions(buildAttachmentReminderText('Use the copied values to create the email manually if needed.'));
    announceFeedbackStatus(successMessage);
  } catch {
    announceFeedbackStatus('Clipboard copy failed.');
  }
}

function setManualInstructions(message: string): void {
  const instructions = document.getElementById('rc-feedback-manual-instructions');
  if (instructions) instructions.textContent = message;
}

function buildAttachmentReminderText(prefix: string): string {
  const attachmentNames = feedbackState.attachmentReminders.map(file => file.name);
  const diagnosticsName = feedbackState.diagnosticsFile?.filename;
  const parts = [prefix];
  if (diagnosticsName) parts.push(`Diagnostics file to attach manually: ${diagnosticsName}.`);
  if (attachmentNames.length > 0) parts.push(`Selected attachments to add manually: ${attachmentNames.join(', ')}.`);
  return parts.join(' ');
}

function announceFeedbackStatus(message: string): void {
  const status = document.getElementById('rc-feedback-status');
  if (status) status.textContent = message;
}

function clearFeedbackStatus(): void {
  announceFeedbackStatus('');
}

function formatTimestampForFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function bindSettings(): void {
  const themeSelect = document.getElementById('settings-theme') as HTMLSelectElement;
  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
    localStorage.setItem('rc-theme', themeSelect.value);
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function updateStats(): void {
  const entries = PluginRegistry.getInstance().getAll();
  const active = entries.filter(e => e.health.status === 'active').length;
  const inactive = entries.filter(e => e.health.status === 'inactive' || e.health.status === 'disabled').length;
  const error = entries.filter(e => e.health.status === 'error').length;

  const set = (id: string, val: number) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };
  set('stat-total-plugins', entries.length);
  set('stat-active-plugins', active);
  set('stat-inactive-plugins', inactive);
  set('stat-error-plugins', error);
  set('rc-plugin-count', entries.length);
}

// ─── Search ───────────────────────────────────────────────────────────────────

function bindSearch(): void {
  const searchInput = document.getElementById('rc-search') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    document.querySelectorAll<HTMLElement>('.rc-plist-row').forEach(row => {
      const name = (row.querySelector('.rc-plist-name')?.textContent ?? '').toLowerCase();
      const desc = (row.title ?? '').toLowerCase();
      row.style.display = !q || name.includes(q) || desc.includes(q) ? '' : 'none';
    });
  });

  const filterInput = document.getElementById('plugin-filter-input') as HTMLInputElement;
  const filterCategory = document.getElementById('plugin-filter-category') as HTMLSelectElement;
  const filterStatus = document.getElementById('plugin-filter-status') as HTMLSelectElement;

  const applyFilters = () => {
    const q = filterInput.value.toLowerCase();
    const cat = filterCategory.value;
    const status = filterStatus.value;
    document.querySelectorAll<HTMLElement>('.rc-plist-row').forEach(row => {
      const name = (row.querySelector('.rc-plist-name')?.textContent ?? '').toLowerCase();
      const rowCat = row.dataset['category'] ?? '';
      const rowStatus = row.dataset['status'] ?? '';
      const matchQ = !q || name.includes(q);
      const matchCat = !cat || rowCat === cat;
      const matchStatus = !status || rowStatus === status;
      row.style.display = matchQ && matchCat && matchStatus ? '' : 'none';
    });
  };

  filterInput.addEventListener('input', applyFilters);
  filterCategory.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

type ToastOptions = {
  message: string;
  type?: NotificationType;
  title?: string;
  source?: string;
};

function showToast({ message, type = 'info', title, source }: ToastOptions): void {
  const container = document.getElementById('rc-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `rc-toast rc-toast--${type}`;
  toast.innerHTML = `
    <div class="rc-toast__header">
      <span class="rc-toast__icon">${getToastIcon(type)}</span>
      <div class="rc-toast__meta">
        ${title ? `<div class="rc-toast__title">${escapeHtml(title)}</div>` : ''}
        ${source ? `<div class="rc-toast__source">${escapeHtml(source)}</div>` : ''}
      </div>
      <button class="rc-toast__close" aria-label="Dismiss notification">×</button>
    </div>
    <div class="rc-toast__message">${escapeHtml(message)}</div>`;

  toast.querySelector('.rc-toast__close')?.addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('rc-toast--exit'), 3500);
  setTimeout(() => toast.remove(), 4000);
}

function getToastIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    success: '✓',
    info: 'i',
    warning: '!',
    error: '×',
  };
  return icons[type];
}

function normalizeLogLevel(level: LogLevel): 'debug' | 'info' | 'warning' | 'error' {
  if (level === 'warn') return 'warning';
  if (level === 'error') return 'error';
  return level;
}

function createEmptyState(title: string, body: string): string {
  return `<div class="rc-empty-state"><div class="rc-empty-state__title">${escapeHtml(title)}</div><div class="rc-empty-state__body">${escapeHtml(body)}</div></div>`;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return String(text).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'crm': '☁️', 'itsm': '🎫', 'project-management': '📌',
    'cloud': '🌤️', 'analytics': '📊', 'productivity': '⚡',
    'ai-assistant': '🤖', 'monitoring': '🩺', 'integration': '🔗',
    'developer-tools': '🛠️', 'enterprise': '🏢', 'utility': '🔧', 'example': '🧩',
  };
  return icons[category] ?? '🔌';
}

// Refresh button
document.getElementById('rc-refresh-btn')?.addEventListener('click', async () => {
  await renderDashboard();
  await renderPluginManager();
  updateStats();
});
