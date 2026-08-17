/**
 * src/plugins/WorkspaceStarter/index.ts
 *
 * TypeScript plugin stub for Workspace Starter.
 * Used by the TypeScript/Webpack build path (dist/).
 *
 * The active flat-deployment implementation is entirely in:
 *   - dashboard.js  (initWorkspaceStarterPlugin, wsState, wsRenderView, etc.)
 *   - dashboard.html (#view-plugin-workspace-starter, #rc-dashboard-widgets widget)
 *   - styles/dashboard.css (ws-* classes)
 *
 * This file exists for:
 *   1. Future migration to the full TypeScript plugin SDK.
 *   2. Type safety and documentation of the plugin contract.
 *   3. Compatibility with bootstrap.ts import chains in the dist/ build.
 *
 * Storage keys (chrome.storage.local):
 *   rc:plugin:com.replycators.workspace-starter:profiles
 *     { [id: string]: { id, name, description, urls: string[], createdAt, updatedAt } }
 *   rc:plugin:com.replycators.workspace-starter:last-launched
 *     { profileId: string, profileName: string, launchedAt: number }
 */

import { WorkspaceStarterManifest } from './manifest';

export { WorkspaceStarterManifest };

/**
 * Workspace profile data model (v2).
 * Stored as a flat map under WS_PROFILES_KEY in chrome.storage.local.
 */
export interface WorkspaceProfile {
  id:           string;
  name:         string;
  description:  string;
  urls:         string[];
  createdAt:    number;
  updatedAt:    number;
  /** Per-profile launch mode: 'tab-group' (default) | 'individual' */
  launchMode:   'tab-group' | 'individual';
  /** Open In: 'current' (default) | 'new-window' */
  openIn:       'current' | 'new-window';
  /** Favorite flag — favorites appear first in the list */
  favorite:     boolean;
  /** Optional category label for grouping */
  category:     string;
  /** Running count of how many times this profile was launched */
  launchCount:  number;
  /** Timestamp of the most recent launch */
  lastLaunchAt: number | null;
}

/**
 * Last-launched record stored under WS_LAST_LAUNCHED_KEY.
 */
export interface LastLaunched {
  profileId:   string;
  profileName: string;
  launchedAt:  number;
}

/**
 * Recent-launch entry stored under WS_RECENTS_KEY.
 */
export interface RecentEntry {
  profileId:   string;
  profileName: string;
  launchedAt:  number;
}

/**
 * WorkspaceStarterPlugin stub.
 *
 * When the full TypeScript SDK migration occurs:
 *   - Extend PluginBase from src/sdk/PluginBase.ts
 *   - Move wsLoadData, wsSaveProfiles, wsLaunchProfile, etc. here as methods
 *   - Inject NotificationCenter, StorageManager, Logger via constructor
 *   - Register the plugin in src/platform/bootstrap.ts
 */
export class WorkspaceStarterPlugin {
  readonly manifest = WorkspaceStarterManifest;

  /**
   * Placeholder initialize() — matches the PluginBase contract.
   * The flat-deployment counterpart is initWorkspaceStarterPlugin() in dashboard.js.
   */
  async initialize(): Promise<void> {
    return Promise.resolve();
  }
}
