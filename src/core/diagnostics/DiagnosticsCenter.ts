/**
 * DiagnosticsCenter — Platform health monitoring, error tracking, and system info.
 */

import { Logger } from '../logging/Logger';
import { EventBus } from '../events/EventBus';
import { getStorage } from '../storage/StorageManager';
import type { PluginHealth } from '../../sdk/types';

export interface PlatformDiagnostics {
  platform: {
    version: string;
    uptime: number;
    startTime: number;
  };
  plugins: Record<string, PluginHealth>;
  logs: {
    total: number;
    errors: number;
    warnings: number;
    lastError?: string;
  };
  events: {
    total: number;
    recent: Array<{ event: string; timestamp: number }>;
  };
  storage: {
    localUsed?: number;
    syncUsed?: number;
    localQuota?: number;
    syncQuota?: number;
  };
  browser: {
    name: string;
    version: string;
    platform: string;
  };
}

export class DiagnosticsCenter {
  private static instance: DiagnosticsCenter;
  private startTime = Date.now();
  private pluginHealthMap = new Map<string, PluginHealth>();

  static getInstance(): DiagnosticsCenter {
    if (!DiagnosticsCenter.instance) {
      DiagnosticsCenter.instance = new DiagnosticsCenter();
    }
    return DiagnosticsCenter.instance;
  }

  updatePluginHealth(pluginId: string, health: PluginHealth): void {
    this.pluginHealthMap.set(pluginId, { ...health });
  }

  getPluginHealth(pluginId: string): PluginHealth | undefined {
    return this.pluginHealthMap.get(pluginId);
  }

  async getDiagnostics(): Promise<PlatformDiagnostics> {
    const allLogs = Logger.getAllEntries(500);
    const errors = allLogs.filter(l => l.level === 'error');
    const warnings = allLogs.filter(l => l.level === 'warn');
    const eventHistory = EventBus.getInstance().getHistory();

    let storageInfo: PlatformDiagnostics['storage'] = {};
    try {
      const localBytes = await this.getStorageBytesInUse('local');
      const syncBytes = await this.getStorageBytesInUse('sync');
      storageInfo = {
        localUsed: localBytes,
        syncUsed: syncBytes,
        localQuota: chrome.storage.local.QUOTA_BYTES,
        syncQuota: chrome.storage.sync.QUOTA_BYTES,
      };
    } catch (_) { /* non-critical */ }

    const ua = navigator.userAgent;
    const isEdge = ua.includes('Edg/');

    return {
      platform: {
        version: chrome.runtime.getManifest().version,
        uptime: Date.now() - this.startTime,
        startTime: this.startTime,
      },
      plugins: Object.fromEntries(this.pluginHealthMap),
      logs: {
        total: allLogs.length,
        errors: errors.length,
        warnings: warnings.length,
        lastError: errors.at(-1)?.message,
      },
      events: {
        total: eventHistory.length,
        recent: eventHistory.slice(-20).map(e => ({ event: e.event, timestamp: e.timestamp })),
      },
      storage: storageInfo,
      browser: {
        name: isEdge ? 'Microsoft Edge' : 'Chromium',
        version: (ua.match(/Edg\/([\d.]+)/) ?? ua.match(/Chrome\/([\d.]+)/) ?? ['', 'unknown'])[1],
        platform: navigator.platform,
      },
    };
  }

  private getStorageBytesInUse(area: 'local' | 'sync'): Promise<number> {
    return new Promise((resolve, reject) => {
      chrome.storage[area].getBytesInUse(null, (bytes) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(bytes);
      });
    });
  }
}
