/**
 * PluginLoader — Instantiates plugins and runs lifecycle calls.
 * Implements lazy loading, error recovery, and sandboxed initialization.
 */

import type { IPlugin, PluginContext } from '../../sdk/PluginBase';
import type {
  PluginManifest,
  PlatformServices,
  PluginPage,
  PluginWidget,
  PluginMenuItem,
  PluginAction,
  BackgroundTask,
  DashboardComponent,
  PluginNotificationConfig,
} from '../../sdk/types';
import { PluginRegistry } from '../registry/PluginRegistry';
import { DiagnosticsCenter } from '../../core/diagnostics/DiagnosticsCenter';
import { EventBus, PlatformEvents } from '../../core/events/EventBus';
import { getLogger } from '../../core/logging/Logger';
import { getStorage } from '../../core/storage/StorageManager';
import { SettingsManager } from '../../core/settings/SettingsManager';
import { NotificationCenter } from '../../core/notifications/NotificationCenter';
import { MessagingService } from '../../core/messaging/MessagingService';

const logger = getLogger('platform:loader');

// Plugin factory: mapping from plugin ID to factory function.
// Populated at build time by each plugin calling PluginLoader.register().
type PluginFactory = () => IPlugin;
const pluginFactories = new Map<string, PluginFactory>();

export class PluginLoader {
  private static instance: PluginLoader;
  private loadedPlugins = new Map<string, IPlugin>();

  static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /** Called by each plugin module to register itself with the platform. */
  static register(factory: PluginFactory): void {
    const temp = factory();
    pluginFactories.set(temp.manifest.id, factory);
    logger.debug(`Factory registered for: ${temp.manifest.id}`);
  }

  /** Load and initialize a plugin by its ID. */
  async load(pluginId: string): Promise<IPlugin> {
    if (this.loadedPlugins.has(pluginId)) {
      logger.warn(`Plugin "${pluginId}" is already loaded.`);
      return this.loadedPlugins.get(pluginId)!;
    }

    const factory = pluginFactories.get(pluginId);
    if (!factory) {
      throw new Error(`No factory registered for plugin: ${pluginId}`);
    }

    const registry = PluginRegistry.getInstance();
    registry.setStatus(pluginId, 'loading');

    const loadStart = Date.now();
    let plugin: IPlugin;

    try {
      plugin = factory();
      const context = this.buildContext(plugin.manifest);

      // Register schema from manifest settings
      if (plugin.manifest.settings?.length) {
        SettingsManager.getInstance().registerSchema(pluginId, plugin.manifest.settings);
      }

      await plugin.initialize(context);

      const loadTime = Date.now() - loadStart;
      registry.updateHealth(pluginId, { status: 'active', loadTime, lastActivity: Date.now() });
      DiagnosticsCenter.getInstance().updatePluginHealth(pluginId, plugin.health);

      this.loadedPlugins.set(pluginId, plugin);
      logger.info(`Plugin loaded: ${pluginId} (${loadTime}ms)`);
      EventBus.getInstance().emit(PlatformEvents.PLUGIN_LOADED, { pluginId, loadTime });
      // initialize() leaves the plugin active, so publish the matching lifecycle event.
      EventBus.getInstance().emit(PlatformEvents.PLUGIN_ACTIVATED, { pluginId });

      return plugin;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      registry.updateHealth(pluginId, { status: 'error', lastError: msg, errorCount: 1 });
      logger.error(`Failed to load plugin "${pluginId}": ${msg}`);
      EventBus.getInstance().emit(PlatformEvents.PLUGIN_ERROR, { pluginId, error: msg });
      throw err;
    }
  }

  async loadAll(): Promise<void> {
    const ids = Array.from(pluginFactories.keys());
    for (const id of ids) {
      try {
        await this.load(id);
      } catch (_) {
        // Error already logged; continue loading others
      }
    }
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) { await this.load(pluginId); return; }
    await plugin.activate();
    PluginRegistry.getInstance().setStatus(pluginId, 'active');
    EventBus.getInstance().emit(PlatformEvents.PLUGIN_ACTIVATED, { pluginId });
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) return;
    await plugin.deactivate();
    PluginRegistry.getInstance().setStatus(pluginId, 'inactive');
    EventBus.getInstance().emit(PlatformEvents.PLUGIN_DEACTIVATED, { pluginId });
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) return;
    await plugin.destroy();
    this.loadedPlugins.delete(pluginId);
    PluginRegistry.getInstance().setStatus(pluginId, 'inactive');
  }

  getPlugin(pluginId: string): IPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  getLoadedPlugins(): IPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }

  getRegisteredFactories(): string[] {
    return Array.from(pluginFactories.keys());
  }

  private buildContext(manifest: PluginManifest): PluginContext {
    const { id: pluginId } = manifest;
    const registry = PluginRegistry.getInstance();
    registry.register(manifest);

    const services: PlatformServices = {
      storage: getStorage(`plugin:${pluginId}`),
      events: EventBus.getInstance(),
      logger: getLogger(pluginId),
      notifications: NotificationCenter.getInstance(),
      settings: SettingsManager.getInstance(),
      messaging: MessagingService.getInstance(),
    };

    const context: PluginContext = {
      manifest,
      services,
      registerPage: (page: PluginPage) => registry.registerPage(pluginId, page),
      registerWidget: (widget: PluginWidget) => registry.registerWidget(pluginId, widget),
      registerMenuItem: (item: PluginMenuItem) => registry.registerMenuItem(pluginId, item),
      registerAction: (action: PluginAction) => registry.registerAction(pluginId, action),
      registerBackgroundTask: (task: BackgroundTask) => registry.registerBackgroundTask(pluginId, task),
      registerDashboardComponent: (component: DashboardComponent) => registry.registerDashboardComponent(pluginId, component),
      registerNotification: (config: PluginNotificationConfig) => registry.registerNotification(pluginId, config),
    };

    return context;
  }
}
