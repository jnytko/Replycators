/**
 * EdgeBookmarkFinder — Plugin entry point.
 */

import { PluginBase } from '../../sdk/PluginBase';
import { PluginLoader } from '../../platform/loader/PluginLoader';
import { BOOKMARK_MANIFEST } from './manifest';
import type { ActionContext, ActionResult } from '../../sdk/types';

export class EdgeBookmarkFinderPlugin extends PluginBase {
  readonly manifest = BOOKMARK_MANIFEST;

  async initialize(context: import('../../sdk/PluginBase').PluginContext): Promise<void> {
    await super.initialize(context);

    context.registerPage({
      id: 'edge-bookmark-main',
      title: 'Edge Bookmark Finder',
      icon: '🔖',
      component: 'EdgeBookmarkFinderView',
      route: '/plugins/edge-bookmark-finder',
      showInSidebar: true,
      order: 30,
    });

    context.registerDashboardComponent({
      id: 'edge-bookmark-widget',
      title: 'Edge Bookmark Finder',
      component: 'EdgeBookmarkWidget',
      size: 'small',
      order: 30,
    });

    context.registerAction({
      id: 'search-bookmarks',
      label: 'Search Bookmarks',
      description: 'Search Microsoft Edge bookmarks by title, URL, domain, or folder',
      icon: '🔖',
      handler: (ctx) => this.handleAction('search-bookmarks', ctx),
    });

    context.registerNotification({
      id: 'bookmark-scan-complete',
      title: 'Edge Bookmark Finder',
      type: 'info',
      trigger: 'manual',
    });

    context.services.logger.info('EdgeBookmarkFinderPlugin initialized');
  }

  async renderView(_viewId: string, container: HTMLElement): Promise<void> {
    const { renderBookmarkFinderUI } = await import('./ui/BookmarkFinderUI');
    renderBookmarkFinderUI(container, this.ctx);
  }

  async handleAction(actionId: string, _context: ActionContext): Promise<ActionResult> {
    if (actionId === 'search-bookmarks') {
      return { success: true, message: 'Open the Bookmark Finder plugin to search your bookmarks.' };
    }
    return { success: false, message: `Unknown action: ${actionId}` };
  }
}

PluginLoader.register(() => new EdgeBookmarkFinderPlugin());
