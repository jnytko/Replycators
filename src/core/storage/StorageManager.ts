/**
 * StorageManager — Namespaced Chrome Storage wrapper.
 * All plugins get isolated key namespaces via the platform.
 */

import type { IStorageService } from '../../sdk/types';

type StorageArea = 'sync' | 'local' | 'session';

export class StorageManager implements IStorageService {
  private readonly namespace: string;
  private readonly area: StorageArea;

  constructor(namespace: string, area: StorageArea = 'local') {
    this.namespace = namespace;
    this.area = area;
  }

  private key(k: string): string {
    return `rc:${this.namespace}:${k}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const fullKey = this.key(key);
    return new Promise((resolve) => {
      chrome.storage[this.area].get(fullKey, (result) => {
        resolve(result[fullKey] as T | undefined);
      });
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const fullKey = this.key(key);
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].set({ [fullKey]: value }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.key(key);
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].remove(fullKey, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
  }

  async clear(prefix?: string): Promise<void> {
    const searchPrefix = prefix ? this.key(prefix) : `rc:${this.namespace}:`;
    return new Promise((resolve) => {
      chrome.storage[this.area].get(null, (all) => {
        const keysToRemove = Object.keys(all).filter(k => k.startsWith(searchPrefix));
        if (keysToRemove.length === 0) { resolve(); return; }
        chrome.storage[this.area].remove(keysToRemove, () => resolve());
      });
    });
  }

  async getAll<T>(prefix: string): Promise<Record<string, T>> {
    const fullPrefix = this.key(prefix);
    return new Promise((resolve) => {
      chrome.storage[this.area].get(null, (all) => {
        const result: Record<string, T> = {};
        for (const [k, v] of Object.entries(all)) {
          if (k.startsWith(fullPrefix)) {
            const shortKey = k.slice(`rc:${this.namespace}:`.length);
            result[shortKey] = v as T;
          }
        }
        resolve(result);
      });
    });
  }
}

// ─── Global Platform Storage factory ─────────────────────────────────────────

const storageCache = new Map<string, StorageManager>();

export function getStorage(namespace: string, area: StorageArea = 'local'): StorageManager {
  const cacheKey = `${namespace}:${area}`;
  if (!storageCache.has(cacheKey)) {
    storageCache.set(cacheKey, new StorageManager(namespace, area));
  }
  return storageCache.get(cacheKey)!;
}
