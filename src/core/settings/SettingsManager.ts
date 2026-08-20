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
    const schema = this.schemas.get(pluginId)?.find(s => s.key === key);
    if (value !== undefined && (!schema || this.isValidValue(schema, value))) return value;

    // Fall back to schema default
    return schema?.default as T | undefined;
  }

  async set(pluginId: string, key: string, value: SettingValue): Promise<void> {
    const schema = this.schemas.get(pluginId)?.find(s => s.key === key);
    if (schema && !this.isValidValue(schema, value)) {
      throw new TypeError(`Invalid value for setting "${pluginId}:${key}"`);
    }
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
    // StorageManager already owns the settings namespace; only filter within it.
    const stored = await storage.getAll<SettingValue>('');
    for (const [key, value] of Object.entries(stored)) {
      const settingSchema = schema.find(item => item.key === key);
      if (!settingSchema || this.isValidValue(settingSchema, value)) {
        result[key] = value;
      }
    }

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

  private isValidValue(schema: PluginSettingSchema, value: unknown): value is SettingValue {
    switch (schema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && Number.isFinite(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'select':
        return typeof value === 'string' &&
          (!schema.options || schema.options.some(option => option.value === value));
    }
  }
}
