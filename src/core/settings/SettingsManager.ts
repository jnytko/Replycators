/**
 * SettingsManager — Per-plugin settings with schema validation and sync storage.
 */

import type {
  ISettingsService,
  SettingValue,
  PluginSettingSchema,
} from '../../sdk/types';
import { getStorage } from '../storage/StorageManager';
import { EventBus, PlatformEvents } from '../events/EventBus';

export class SettingsManager implements ISettingsService {
  private static instance: SettingsManager;
  private schemas = new Map<string, PluginSettingSchema[]>();

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  registerSchema(pluginId: string, schema: PluginSettingSchema[]): void {
    this.schemas.set(pluginId, schema);
  }

  getSchema(pluginId: string): PluginSettingSchema[] {
    return this.schemas.get(pluginId) ?? [];
  }

  getAllSchemas(): Map<string, PluginSettingSchema[]> {
    return new Map(this.schemas);
  }

  async get<T extends SettingValue>(pluginId: string, key: string): Promise<T | undefined> {
    const storage = getStorage(`settings:${pluginId}`, 'sync');
    const value = await storage.get<T>(key);
    if (value !== undefined) return value;

    // Fall back to schema default
    const schema = this.schemas.get(pluginId)?.find(s => s.key === key);
    return schema?.default as T | undefined;
  }

  async set(pluginId: string, key: string, value: SettingValue): Promise<void> {
    const storage = getStorage(`settings:${pluginId}`, 'sync');
    await storage.set(key, value);

    EventBus.getInstance().emit(PlatformEvents.SETTINGS_CHANGED, {
      pluginId,
      key,
      value,
    });
  }

  async getAll(pluginId: string): Promise<Record<string, SettingValue>> {
    const schema = this.schemas.get(pluginId) ?? [];
    const result: Record<string, SettingValue> = {};

    // Start with defaults
    for (const s of schema) {
      if (s.default !== undefined) result[s.key] = s.default;
    }

    // Override with stored values
    const storage = getStorage(`settings:${pluginId}`, 'sync');
    const stored = await storage.getAll<SettingValue>(`settings:${pluginId}:`);
    Object.assign(result, stored);

    return result;
  }

  async reset(pluginId: string, key?: string): Promise<void> {
    const storage = getStorage(`settings:${pluginId}`, 'sync');
    if (key) {
      await storage.remove(key);
    } else {
      await storage.clear();
    }
    EventBus.getInstance().emit(PlatformEvents.SETTINGS_CHANGED, { pluginId, key, value: null });
  }
}
