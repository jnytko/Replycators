/**
 * Platform Bootstrap — Initializes all core services and loads plugins.
 * Entry point for both background worker and popup context.
 */

import { EventBus } from '../core/events/EventBus';
import { getLogger } from '../core/logging/Logger';
import { NotificationCenter } from '../core/notifications/NotificationCenter';
import { SettingsManager } from '../core/settings/SettingsManager';
import { MessagingService } from '../core/messaging/MessagingService';
import { PluginLoader } from '../platform/loader/PluginLoader';
import { PluginManager } from '../platform/manager/PluginManager';

const logger = getLogger('platform');

export async function bootstrapPlatform(): Promise<void> {
  logger.info('ReplyCators Platform bootstrapping...');

  // Initialize singletons
  EventBus.getInstance();
  NotificationCenter.getInstance();
  SettingsManager.getInstance();
  MessagingService.getInstance();

  // Import plugin registrations (each calls PluginLoader.register())
  await importPlugins();

  // Load and activate all enabled plugins
  const manager = PluginManager.getInstance();
  await manager.initialize();

  logger.info('Platform bootstrap complete.');
}

async function importPlugins(): Promise<void> {
  // ── Plugins with src/ stubs (need index.ts before Phase 2 migration) ───────
  //   SalesforceExtractor     → src/plugins/SalesforceExtractor/   (stub dir exists, no index.ts)
  //   CloudabilityOrgId       → src/plugins/CloudabilityOrgId/     (stub dir exists, no index.ts)
  //   ExamplePlugin           → src/plugins/ExamplePlugin/         (stub dir exists, no index.ts)
  //   EdgeBookmarkFinder      → src/plugins/EdgeBookmarkFinder/     (stub dir exists, no index.ts)
  //   ApptioUpgradeCalculator → src/plugins/ApptioUpgradeCalculator/ (stub dir exists, no index.ts)
  //   WorkspaceStarter        → src/plugins/WorkspaceStarter/       (stub dir exists, no index.ts)
  //
  // ── Plugins WITHOUT src/ stubs (runtime-module-only; need stub dir + index.ts) ──
  //   TabSearch               → src/plugins/TabSearch/              (MISSING — add before Phase 2)
  //   ApptioDocsFinder        → src/plugins/ApptioDocsFinder/       (MISSING — add before Phase 2)
  //   Snake                   → src/plugins/Snake/                  (MISSING — add before Phase 2)
  //   Marketplace             → src/plugins/Marketplace/            (MISSING — add before Phase 2)
  //   BackupRestore           → src/plugins/BackupRestore/          (MISSING — add before Phase 2)
  //
  // NOTE: All import() calls below use try/catch so a missing index.ts at build
  // time is caught gracefully rather than aborting the entire bootstrap.
  // Add the missing stubs above before enabling their import() calls here.

  try {
    await import('../plugins/SalesforceExtractor/index');
  } catch (err) {
    logger.warn('SalesforceExtractor plugin not loaded:', err);
  }

  try {
    await import('../plugins/CloudabilityOrgId/index');
  } catch (err) {
    logger.warn('CloudabilityOrgId plugin not loaded:', err);
  }

  try {
    await import('../plugins/ExamplePlugin/index');
  } catch (err) {
    logger.warn('ExamplePlugin not loaded:', err);
  }

  try {
    await import('../plugins/EdgeBookmarkFinder/index');
  } catch (err) {
    logger.warn('EdgeBookmarkFinder plugin not loaded:', err);
  }

  try {
    await import('../plugins/ApptioUpgradeCalculator/index');
  } catch (err) {
    logger.warn('ApptioUpgradeCalculator plugin not loaded:', err);
  }

  // WorkspaceStarter stub dir exists but index.ts is not yet written.
  // Uncomment when src/plugins/WorkspaceStarter/index.ts is created:
  // try {
  //   await import('../plugins/WorkspaceStarter/index');
  // } catch (err) {
  //   logger.warn('WorkspaceStarter plugin not loaded:', err);
  // }
}
