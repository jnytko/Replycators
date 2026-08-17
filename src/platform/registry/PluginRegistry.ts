/**
 * PluginRegistry — Single source of truth for all registered plugins.
 * Stores manifests, health, and registered capabilities.
 */

import type {
  PluginManifest,
  PluginHealth,
  PluginStatus,
  PluginPage,
  PluginWidget,
  PluginMenuItem,
  PluginAction,
  BackgroundTask,
  DashboardComponent,
  PluginNotificationConfig,
} from '../../sdk/types';
import { EventBus, PlatformEvents } from '../../core/events/EventBus';
import { getLogger } from '../../core/logging/Logger';

const logger = getLogger('platform:registry');

export interface RegistryEntry {
  manifest: PluginManifest;
  health: PluginHealth;
  pages: PluginPage[];
  widgets: PluginWidget[];
  menuItems: PluginMenuItem[];
  actions: Map<string, PluginAction>;
  backgroundTasks: BackgroundTask[];
  dashboardComponents: DashboardComponent[];
  notifications: PluginNotificationConfig[];
  registeredAt: number;
}

export class PluginRegistry {
  private static instance: PluginRegistry;
  private entries = new Map<string, RegistryEntry>();

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  register(manifest: PluginManifest): RegistryEntry {
    if (this.entries.has(manifest.id)) {
      logger.warn(`Plugin "${manifest.id}" is already registered. Re-registering.`);
    }

    const entry: RegistryEntry = {
      manifest,
      health: { status: 'registered', errorCount: 0 },
      pages: [],
      widgets: [],
      menuItems: [],
      actions: new Map(),
      backgroundTasks: [],
      dashboardComponents: [],
      notifications: [],
      registeredAt: Date.now(),
    };

    this.entries.set(manifest.id, entry);
    logger.info(`Plugin registered: ${manifest.id} v${manifest.version}`);
    EventBus.getInstance().emit(PlatformEvents.PLUGIN_REGISTERED, { pluginId: manifest.id, manifest });
    return entry;
  }

  unregister(pluginId: string): void {
    this.entries.delete(pluginId);
    EventBus.getInstance().emit(PlatformEvents.PLUGIN_REMOVED, { pluginId });
  }

  get(pluginId: string): RegistryEntry | undefined {
    return this.entries.get(pluginId);
  }

  getAll(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getActive(): RegistryEntry[] {
    return this.getAll().filter(e => e.health.status === 'active');
  }

  updateHealth(pluginId: string, health: Partial<PluginHealth>): void {
    const entry = this.entries.get(pluginId);
    if (!entry) return;
    Object.assign(entry.health, health);
  }

  setStatus(pluginId: string, status: PluginStatus): void {
    this.updateHealth(pluginId, { status, lastActivity: Date.now() });
  }

  // ─── Capability registration (called by PluginContext) ───────────────────

  registerPage(pluginId: string, page: PluginPage): void {
    this.entries.get(pluginId)?.pages.push(page);
  }

  registerWidget(pluginId: string, widget: PluginWidget): void {
    this.entries.get(pluginId)?.widgets.push(widget);
  }

  registerMenuItem(pluginId: string, item: PluginMenuItem): void {
    this.entries.get(pluginId)?.menuItems.push(item);
  }

  registerAction(pluginId: string, action: PluginAction): void {
    this.entries.get(pluginId)?.actions.set(action.id, action);
  }

  registerBackgroundTask(pluginId: string, task: BackgroundTask): void {
    this.entries.get(pluginId)?.backgroundTasks.push(task);
  }

  registerDashboardComponent(pluginId: string, component: DashboardComponent): void {
    this.entries.get(pluginId)?.dashboardComponents.push(component);
  }

  registerNotification(pluginId: string, config: PluginNotificationConfig): void {
    this.entries.get(pluginId)?.notifications.push(config);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  getAllPages(): Array<PluginPage & { pluginId: string }> {
    return this.getActive().flatMap(e =>
      e.pages.map(p => ({ ...p, pluginId: e.manifest.id }))
    );
  }

  getAllWidgets(): Array<PluginWidget & { pluginId: string }> {
    return this.getActive().flatMap(e =>
      e.widgets.map(w => ({ ...w, pluginId: e.manifest.id }))
    );
  }

  getAllDashboardComponents(): Array<DashboardComponent & { pluginId: string }> {
    return this.getActive().flatMap(e =>
      e.dashboardComponents.map(c => ({ ...c, pluginId: e.manifest.id }))
    );
  }

  getAction(pluginId: string, actionId: string): PluginAction | undefined {
    return this.entries.get(pluginId)?.actions.get(actionId);
  }

  has(pluginId: string): boolean {
    return this.entries.has(pluginId);
  }

  count(): number {
    return this.entries.size;
  }
}
