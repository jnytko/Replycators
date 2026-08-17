/**
 * Example Plugin - Canonical Generator Baseline
 * plugins/example-plugin.js
 *
 * Plugin ID:  com.replycators.example-plugin
 * Version:    1.0.0
 * Author:     ReplyCators Platform
 *
 * PURPOSE
 * ───────
 * This is the canonical reference implementation for ReplyCators plugins.
 * It is the verified baseline from which the Plugin Generator (tools/create-plugin.js)
 * derives all generated plugin structures.
 *
 * Every generated plugin is a parameterized version of this file.
 * Keep this file synchronized with the generator templates.
 *
 * WHAT THIS DEMONSTRATES
 * ──────────────────────
 * • Plugin registration: window.ReplyCatorsPlugins.ExamplePlugin
 * • Lifecycle methods: init(), onNavigate(), onLeave()
 * • Platform logging: app().addLog()
 * • Platform notifications: app().addNotification() / app().showToast()
 * • Platform navigation: app().navigateTo()
 * • Lazy-init pattern: no async I/O in init()
 * • Widget button wiring from init()
 * • Semantic icon ID in PLUGINS[] metadata (see dashboard.js)
 *
 * ICONS - MANDATORY POLICY
 * ─────────────────────────
 * All icons must use Streamline Ultimate Colors - Free through the central registry and renderer.
 *
 * Plugin icon metadata uses a semantic ID:
 *   icon: 'plugins.examplePlugin'   ← in dashboard.js PLUGINS[] entry
 *
 * In HTML, use a data-icon span (resolved at DOMContentLoaded by renderSemanticIcons()):
 *   <span data-icon="plugins.examplePlugin" aria-hidden="true" class="rc-widget-icon"></span>
 *
 * For markup injected after DOMContentLoaded, call the renderer directly:
 *   window.ReplyCatorsIconHelper.renderIcon(spanEl, 'plugins.examplePlugin', 18);
 *
 * All semantic IDs are defined in plugins/shared/icon-helper.js ICON_REGISTRY.
 * All assets are in assets/icons/streamline-ultimate-colors-free/.
 * License: CC BY 4.0 - attribution: Icons by Streamline (http://streamlinehq.com)
 *
 * Prohibited: Lucide, Google Material, emoji, Unicode pictographs, handwritten SVG,
 *             remote URLs, icon fonts, private per-plugin icon registries.
 *
 * FLAT-RUNTIME ONLY
 * ─────────────────
 * This plugin runs in the active flat-deployment runtime (plugins/*.js loaded
 * by dashboard.html). It uses window.ReplyCatorsApp and window.ReplyCatorsPlugins.
 * The TypeScript SDK services (context.services.*) are part of the inactive
 * src/ architecture and are NOT available here. See AGENTS.md §3.
 *
 * GENERATOR MAINTENANCE NOTE
 * ──────────────────────────
 * If you change the plugin lifecycle pattern here, update tools/create-plugin.js
 * to reflect the change. The Example Plugin and the generator must stay in sync.
 * See docs/PLUGIN-SDK.md §Example Plugin Synchronization.
 */

(function() {
  'use strict';

  /**
   * Plugin descriptor.
   * Expose only the properties and lifecycle methods supported by the loader.
   * dashboard.js calls these via optional chaining:
   *   window.ReplyCatorsPlugins?.ExamplePlugin?.init?.()
   *   window.ReplyCatorsPlugins?.ExamplePlugin?.onNavigate?.()
   *   window.ReplyCatorsPlugins?.ExamplePlugin?.onLeave?.()
   */
  const plugin = {
    id: 'com.replycators.example-plugin',
    init,
    onNavigate,
    onLeave,
  };

  /**
   * Access the shared platform services exposed by dashboard.js.
   * All plugin ↔ platform communication goes through this interface.
   * Never call dashboard.js functions directly.
   */
  function app() { return window.ReplyCatorsApp; }

  // ─── Lifecycle methods ─────────────────────────────────────────────────────

  /**
   * init() - Called ONCE by dashboard.js during DOMContentLoaded startup.
   *
   * Lifecycle phase: Initialization
   * Called by: dashboard.js _safeInit('ExamplePlugin', ...)
   * Arguments: none
   * Returns: void (synchronous)
   * Async I/O: FORBIDDEN - lazy-init pattern (DEVELOPER_GUIDE.md §Startup Performance Pattern)
   *
   * Use init() to:
   *   ✅ Bind button and widget click handlers
   *   ✅ Set initial DOM state from already-restored data
   *   ❌ Do NOT call chrome.tabs.query(), chrome.storage.local.get(), or any async I/O
   *
   * Must be idempotent: calling twice must not register duplicate event handlers.
   */
  function init() {
    // Wire the widget "Open Plugin" button to navigate to the full plugin view.
    // This is the approved pattern for widget-to-view navigation.
    document.getElementById('ex-widget-open-btn')?.addEventListener('click', function() {
      app().navigateTo('plugin-example');
    });

    // Wire the "Say Hello" button in the plugin view.
    document.getElementById('ex-say-hello')?.addEventListener('click', function() {
      app().addLog('info', plugin.id, 'Say Hello action triggered');
      // addNotification() records the notification AND shows the toast - no separate showToast needed
      app().addNotification(
        'Example Plugin',
        'Hello, World! The Example Plugin is working correctly.',
        'success',
        plugin.id
      );
    });
  }

  /**
   * onNavigate() - Called by dashboard.js when the user navigates to
   *                the plugin view ("plugin-example").
   *
   * Lifecycle phase: Navigation
   * Called by: dashboard.js navigateTo() - if (view === 'plugin-example')
   * Arguments: none
   * Returns: void
   * Async I/O: ALLOWED - deferred I/O goes here, not in init()
   *
   * Must be idempotent: repeated navigation must not cause duplicate renders.
   */
  function onNavigate() {
    app().addLog('info', plugin.id, 'Example Plugin view opened');
    // For a minimal reference plugin, no async I/O is needed on navigate.
    // Real plugins would read storage or query tabs here.
  }

  /**
   * onLeave() - Called by dashboard.js when the user navigates AWAY from
   *             the plugin view.
   *
   * Lifecycle phase: Cleanup
   * Called by: dashboard.js navigateTo() - leave block
   * Arguments: none
   * Returns: void
   *
   * Responsibilities:
   *   - Pause timers or animations (if any).
   *   - Remove event listeners that only apply while the view is active.
   *   - Do NOT remove listeners registered in init() - those survive navigation.
   *   - Do NOT clear persisted data - only stop ongoing activity.
   */
  function onLeave() {
    app().addLog('info', plugin.id, 'Example Plugin view closed');
    // No active-view resources to clean up in this minimal implementation.
  }

  // ─── Self-registration ─────────────────────────────────────────────────────
  //
  // Every plugin registers under window.ReplyCatorsPlugins.<RegistrationKey>.
  // dashboard.js discovers plugins by reading these properties.
  // The registration key must be unique across all loaded plugins.
  //
  // Convention: slug "my-plugin" → key "MyPlugin"
  // This must be the last statement in the IIFE.

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.ExamplePlugin = plugin;

})();
