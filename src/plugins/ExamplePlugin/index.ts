/**
 * ExamplePlugin — Minimal reference implementation.
 * Demonstrates all plugin registration capabilities.
 * Use this as a starting point for any new plugin.
 */

import { PluginBase } from '../../sdk/PluginBase';
import { PluginLoader } from '../../platform/loader/PluginLoader';
import type { PluginManifest, ActionContext, ActionResult } from '../../sdk/types';

const MANIFEST: PluginManifest = {
  id: 'com.replycators.example-plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'A minimal reference plugin showing all SDK capabilities. Use this as a template when building new plugins.',
  author: 'ReplyCators Platform',
  category: 'example',
  tags: ['example', 'template', 'reference'],
  permissions: ['storage'],
  settings: [
    {
      key: 'greetingName',
      label: 'Your Name',
      description: 'Used in the greeting widget',
      type: 'string',
      default: 'World',
      group: 'General',
    },
    {
      key: 'theme',
      label: 'Widget Theme',
      type: 'select',
      default: 'blue',
      options: [
        { value: 'blue', label: 'Blue' },
        { value: 'green', label: 'Green' },
        { value: 'purple', label: 'Purple' },
      ],
      group: 'Display',
    },
  ],
  enabled: true,
};

export class ExamplePlugin extends PluginBase {
  readonly manifest = MANIFEST;

  async initialize(context: import('../../sdk/PluginBase').PluginContext): Promise<void> {
    await super.initialize(context);

    // Register a page (appears in the sidebar nav)
    context.registerPage({
      id: 'example-main',
      title: 'Example Plugin',
      icon: 'plugins.examplePlugin',  // App-Window-Code — unique icon; do NOT reuse navigation.plugins (Plugin Manager)
      component: 'ExamplePluginView',
      route: '/plugins/example',
      showInSidebar: true,
      order: 99,
    });

    // Register a dashboard widget
    context.registerDashboardComponent({
      id: 'example-widget',
      title: 'Example Widget',
      component: 'ExampleWidget',
      size: 'small',
      order: 99,
    });

    // Register an action (callable from anywhere)
    context.registerAction({
      id: 'say-hello',
      label: 'Say Hello',
      description: 'Greet the user with a notification',
      icon: '👋',
      handler: (ctx) => this.handleAction('say-hello', ctx),
    });

    // Register a notification config
    context.registerNotification({
      id: 'example-greeting',
      title: 'Example Plugin',
      type: 'info',
      trigger: 'manual',
    });

    context.services.logger.info('ExamplePlugin initialized');
  }

  async renderView(viewId: string, container: HTMLElement): Promise<void> {
    const name = await this.ctx.services.settings.get<string>(this.manifest.id, 'greetingName') ?? 'World';
    const theme = await this.ctx.services.settings.get<string>(this.manifest.id, 'theme') ?? 'blue';

    container.innerHTML = `
      <div class="rc-panel-header">
        <span class="rc-panel-title">🧩 Example Plugin</span>
        <span class="rc-badge rc-badge--green">Template</span>
      </div>
      <div class="rc-panel-body">
        <div class="rc-example-card rc-example-card--${theme}">
          <h2>Hello, ${escapeHtml(name)}! 👋</h2>
          <p>This is the Example Plugin — a minimal reference implementation.</p>
          <p>Use it as a starting template when building your own plugins.</p>
        </div>

        <div class="rc-section-title">SDK Capabilities Demonstrated</div>
        <ul class="rc-capability-list">
          <li>✅ <code>registerPage()</code> — This page</li>
          <li>✅ <code>registerDashboardComponent()</code> — Dashboard widget</li>
          <li>✅ <code>registerAction()</code> — "Say Hello" action</li>
          <li>✅ <code>registerNotification()</code> — Notification config</li>
          <li>✅ <code>settings</code> — Greeting name &amp; theme settings</li>
          <li>✅ <code>storage</code> — Namespaced storage</li>
          <li>✅ <code>events</code> — EventBus integration</li>
          <li>✅ <code>logger</code> — Scoped logging</li>
        </ul>

        <button id="ex-say-hello" class="rc-btn rc-btn--primary" style="margin-top:16px;">
          👋 Say Hello
        </button>
      </div>`;

    container.querySelector('#ex-say-hello')?.addEventListener('click', () => {
      this.ctx.services.notifications.show({
        id: `example-greeting-${Date.now()}`,
        title: 'Example Plugin',
        message: `Hello, ${name}! The plugin is working correctly.`,
        type: 'success',
        duration: 4000,
        pluginId: this.manifest.id,
      });
    });
  }

  async handleAction(actionId: string, _context: ActionContext): Promise<ActionResult> {
    if (actionId === 'say-hello') {
      const name = await this.ctx.services.settings.get<string>(this.manifest.id, 'greetingName') ?? 'World';
      this.ctx.services.notifications.show({
        id: `example-hello-${Date.now()}`,
        title: 'Example Plugin',
        message: `Hello, ${name}!`,
        type: 'info',
        duration: 3000,
        pluginId: this.manifest.id,
      });
      return { success: true, message: `Greeted: ${name}` };
    }
    return { success: false, message: `Unknown action: ${actionId}` };
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
  );
}

// Self-register with the platform
PluginLoader.register(() => new ExamplePlugin());
