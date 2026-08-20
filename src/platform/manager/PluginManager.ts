/**
 * PluginManager — High-level orchestrator for plugin lifecycle management.
 * Persists enable/disable state, coordinates load order, manages health.
 */

import { PluginLoader } from '../loader/PluginLoader';
import { PluginRegistry } from '../registry/PluginRegistry';
import { getStorage } from '../../core/storage/StorageManager';
import { getLogger } from '../../core/logging/Logger';

const logger = getLogger('platform:manager');
const storage = getStorage('platform', 'local');

const DISABLED_PLUGINS_KEY = 'disabled_plugins';

export class PluginManager {
  private static instance: PluginManager;
  private disabledPlugins = new Set<string>();
  private initialized = false;
  private initialization: Promise<void> | null = null;

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  initialize(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    if (this.initialization) return this.initialization;

    // Publish initialized only after every required startup step succeeds.
    const initialization = this.initializeInternal()
      .then(() => { this.initialized = true; })
      .finally(() => { this.initialization = null; });
    this.initialization = initialization;
    return initialization;
  }

  private async initializeInternal(): Promise<void> {

    // Restore persisted disable list
    const storedDisabled = await storage.get<unknown>(DISABLED_PLUGINS_KEY);
    const disabled = Array.isArray(storedDisabled)
      ? storedDisabled.filter((id): id is string => typeof id === 'string')
      : [];
    this.disabledPlugins = new Set(disabled);

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

    const loader = PluginLoader.getInstance();
    if (!loader.isLoaded(pluginId)) {
      await loader.load(pluginId);
    } else {
      await loader.activate(pluginId);
    }

    this.disabledPlugins.delete(pluginId);
    try {
      await this.persistDisabledList();
    } catch (err) {
      this.disabledPlugins.add(pluginId);
      await loader.deactivate(pluginId);
      throw err;
    }

    logger.info(`Plugin enabled: ${pluginId}`);
  }

  async disablePlugin(pluginId: string): Promise<void> {
    if (this.disabledPlugins.has(pluginId)) {
      logger.warn(`Plugin "${pluginId}" is already disabled.`);
      return;
    }

    const loader = PluginLoader.getInstance();
    await loader.deactivate(pluginId);

    this.disabledPlugins.add(pluginId);
    try {
      await this.persistDisabledList();
    } catch (err) {
      this.disabledPlugins.delete(pluginId);
      await loader.activate(pluginId);
      throw err;
    }

    logger.info(`Plugin disabled: ${pluginId}`);
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
