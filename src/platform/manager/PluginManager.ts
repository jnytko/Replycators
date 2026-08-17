/**
 * PluginManager — High-level orchestrator for plugin lifecycle management.
 * Persists enable/disable state, coordinates load order, manages health.
 */

import { PluginLoader } from '../loader/PluginLoader';
import { PluginRegistry } from '../registry/PluginRegistry';
import { getStorage } from '../../core/storage/StorageManager';
import { getLogger } from '../../core/logging/Logger';
import { EventBus, PlatformEvents } from '../../core/events/EventBus';

const logger = getLogger('platform:manager');
const storage = getStorage('platform', 'local');

const DISABLED_PLUGINS_KEY = 'disabled_plugins';

export class PluginManager {
  private static instance: PluginManager;
  private disabledPlugins = new Set<string>();
  private initialized = false;

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Restore persisted disable list
    const disabled = await storage.get<string[]>(DISABLED_PLUGINS_KEY) ?? [];
    disabled.forEach(id => this.disabledPlugins.add(id));

    logger.info(`PluginManager initialized. Disabled plugins: [${disabled.join(', ')}]`);

    // Load all registered plugins except disabled ones
    const loader = PluginLoader.getInstance();
    const factories = loader.getRegisteredFactories();

    for (const pluginId of factories) {
      if (this.disabledPlugins.has(pluginId)) {
        logger.info(`Skipping disabled plugin: ${pluginId}`);
        continue;
      }
      try {
        await loader.load(pluginId);
      } catch (err) {
        logger.error(`Failed to load plugin on startup: ${pluginId}`, err);
      }
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    if (!this.disabledPlugins.has(pluginId)) {
      logger.warn(`Plugin "${pluginId}" is already enabled.`);
      return;
    }

    this.disabledPlugins.delete(pluginId);
    await this.persistDisabledList();

    const loader = PluginLoader.getInstance();
    if (!loader.isLoaded(pluginId)) {
      await loader.load(pluginId);
    } else {
      await loader.activate(pluginId);
    }

    logger.info(`Plugin enabled: ${pluginId}`);
    EventBus.getInstance().emit(PlatformEvents.PLUGIN_ACTIVATED, { pluginId });
  }

  async disablePlugin(pluginId: string): Promise<void> {
    this.disabledPlugins.add(pluginId);
    await this.persistDisabledList();

    const loader = PluginLoader.getInstance();
    await loader.deactivate(pluginId);

    logger.info(`Plugin disabled: ${pluginId}`);
    EventBus.getInstance().emit(PlatformEvents.PLUGIN_DEACTIVATED, { pluginId });
  }

  async removePlugin(pluginId: string): Promise<void> {
    const loader = PluginLoader.getInstance();
    await loader.unload(pluginId);
    PluginRegistry.getInstance().unregister(pluginId);
    logger.info(`Plugin removed: ${pluginId}`);
  }

  isEnabled(pluginId: string): boolean {
    return !this.disabledPlugins.has(pluginId);
  }

  getStatus(): Array<{ pluginId: string; enabled: boolean; loaded: boolean }> {
    const loader = PluginLoader.getInstance();
    const allIds = loader.getRegisteredFactories();
    return allIds.map(id => ({
      pluginId: id,
      enabled: this.isEnabled(id),
      loaded: loader.isLoaded(id),
    }));
  }

  private async persistDisabledList(): Promise<void> {
    await storage.set(DISABLED_PLUGINS_KEY, Array.from(this.disabledPlugins));
  }
}
