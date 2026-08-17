#!/usr/bin/env node
/**
 * ReplyCators — Plugin Generator
 * tools/create-plugin.js
 *
 * Generates a new plugin from the canonical Example Plugin baseline.
 * Every generated structure is derived from the verified Example Plugin
 * (plugins/example-plugin.js) and maintained first-party plugin patterns.
 *
 * Usage:
 *   Interactive:       node tools/create-plugin.js
 *   Non-interactive:   node tools/create-plugin.js --name "My Plugin" --id my-plugin --type widget
 *
 * Supported template modes: basic | widget | settings
 * Optional flags:            --settings  (add settings integration)
 *                            --storage   (add namespaced storage)
 *                            --author "Name"
 *                            --description "One-line description"
 *                            --icon plugins.myPlugin   (semantic ID from icon-helper.js)
 *
 * See docs/PLUGIN-SDK.md for full documentation.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const readline = require('readline');

// ─── Constants ────────────────────────────────────────────────────────────────

const REPO_ROOT       = path.resolve(__dirname, '..');
const PLUGINS_DIR     = path.join(REPO_ROOT, 'plugins');
const DASHBOARD_JS    = path.join(REPO_ROOT, 'dashboard.js');
const DASHBOARD_HTML  = path.join(REPO_ROOT, 'dashboard.html');
const MANIFEST_JSON   = path.join(REPO_ROOT, 'manifest.json');

const EXAMPLE_PLUGIN_ID  = 'com.replycators.example-plugin';
const PLUGIN_ID_PREFIX   = 'com.replycators.';

/** Reserved plugin IDs that must never be overwritten by the generator. */
const RESERVED_IDS = new Set([
  EXAMPLE_PLUGIN_ID,
  'com.replycators.salesforce-extractor',
  'com.replycators.cloudability-orgid',
  'com.replycators.edge-bookmark-finder',
  'com.replycators.apptio-planning-upgrade-calculator',
  'com.replycators.workspace-starter',
  'com.replycators.tab-search',
  'com.replycators.snake',
  'com.replycators.apptio-docs-finder',
]);

/** Characters not permitted in a plugin slug (the part after the domain prefix). */
const SLUG_FORBIDDEN_RE = /[^a-z0-9-]/;

const SUPPORTED_TYPES   = ['basic', 'widget', 'settings'];
const DEFAULT_AUTHOR    = 'ReplyCators Platform';
const DEFAULT_VERSION   = '1.0.0';
const DEFAULT_ICON      = 'fallback.unknownPlugin';

// ─── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name')        { args.name        = argv[++i]; }
    else if (a === '--id')     { args.id          = argv[++i]; }
    else if (a === '--type')   { args.type        = argv[++i]; }
    else if (a === '--author') { args.author      = argv[++i]; }
    else if (a === '--desc' || a === '--description') { args.description = argv[++i]; }
    else if (a === '--icon')   { args.icon        = argv[++i]; }
    else if (a === '--settings') { args.settings  = true; }
    else if (a === '--storage')  { args.storage   = true; }
    else if (a === '--force')    { args.force     = true; }
  }
  return args;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate and normalize the plugin slug (the short name portion used
 * for the file-system path, registration key, and DOM IDs).
 *
 * Valid: lowercase letters, digits, hyphens. No leading/trailing hyphens.
 * Returns { ok, slug, error }.
 */
function validateSlug(input) {
  if (!input || typeof input !== 'string') {
    return { ok: false, error: 'Slug is required.' };
  }
  const slug = input.trim().toLowerCase();
  if (!slug) {
    return { ok: false, error: 'Slug must not be empty or whitespace-only.' };
  }
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return { ok: false, error: 'Slug must not contain path separators or traversal sequences.' };
  }
  if (SLUG_FORBIDDEN_RE.test(slug)) {
    return { ok: false, error: 'Slug may only contain lowercase letters, digits, and hyphens.' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, error: 'Slug must not start or end with a hyphen.' };
  }
  if (slug.length > 64) {
    return { ok: false, error: 'Slug must not exceed 64 characters.' };
  }
  return { ok: true, slug };
}

/**
 * Derive the full plugin ID (reverse-domain) from a slug.
 * If the caller already passed a full ID beginning with the prefix, extract the slug.
 */
function resolvePluginId(rawInput) {
  let slug = rawInput.trim().toLowerCase();
  // Strip prefix if the user provided the full ID
  if (slug.startsWith(PLUGIN_ID_PREFIX)) {
    slug = slug.slice(PLUGIN_ID_PREFIX.length);
  }
  const v = validateSlug(slug);
  if (!v.ok) return v;
  return { ok: true, slug, id: PLUGIN_ID_PREFIX + slug };
}

/**
 * Validate the display name.
 * Allows Unicode letters, digits, spaces, and common punctuation.
 */
function validateDisplayName(input) {
  if (!input || typeof input !== 'string') {
    return { ok: false, error: 'Display name is required.' };
  }
  const name = input.trim();
  if (!name) {
    return { ok: false, error: 'Display name must not be empty or whitespace-only.' };
  }
  if (name.length > 60) {
    return { ok: false, error: 'Display name must not exceed 60 characters.' };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(name)) {
    return { ok: false, error: 'Display name must not contain control characters.' };
  }
  return { ok: true, name };
}

/**
 * Check whether a plugin ID is already registered in dashboard.js PLUGINS[].
 * Also checks whether the destination file already exists.
 */
function checkDuplicates(pluginId, slug) {
  const errors = [];

  // Guard: cannot reuse reserved IDs
  if (RESERVED_IDS.has(pluginId)) {
    errors.push(`Plugin ID "${pluginId}" is reserved and cannot be reused.`);
  }

  // Guard: destination file must not exist
  const destFile = path.join(PLUGINS_DIR, slug + '.js');
  if (fs.existsSync(destFile)) {
    errors.push(`File already exists: plugins/${slug}.js`);
  }

  // Guard: check PLUGINS[] array in dashboard.js for the plugin ID
  if (fs.existsSync(DASHBOARD_JS)) {
    const src = fs.readFileSync(DASHBOARD_JS, 'utf8');
    if (src.includes(`'${pluginId}'`) || src.includes(`"${pluginId}"`)) {
      errors.push(`Plugin ID "${pluginId}" is already registered in dashboard.js PLUGINS[].`);
    }
  }

  return errors;
}

// ─── Registration key derivation ─────────────────────────────────────────────

/**
 * Derive the window.ReplyCatorsPlugins registration key from a slug.
 * e.g. "my-plugin" → "MyPlugin"
 */
function slugToRegistrationKey(slug) {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Derive a CSS/DOM id prefix from a slug.
 * e.g. "my-plugin" → "mp"  (initials, lowercase)
 * Falls back to first 3 chars if only one word.
 */
function slugToPrefix(slug) {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3);
  return parts.map(p => p[0]).join('');
}

// ─── Template rendering ───────────────────────────────────────────────────────

/**
 * Replace all occurrences of template variables in a string.
 * Uses explicit delimited tokens — never performs unsafe global slug replacement.
 */
function renderTemplate(src, vars) {
  let out = src;
  for (const [key, value] of Object.entries(vars)) {
    // Token format: {{VARIABLE_NAME}}
    const token = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
    out = out.replace(token, () => String(value));
  }
  return out;
}

// ─── Template definitions ─────────────────────────────────────────────────────
//
// Templates are derived directly from plugins/example-plugin.js and maintained
// first-party plugin patterns. Each template section is controlled and explicit.
// No unresolved tokens remain after renderTemplate().

function getPluginTemplate(opts) {
  const { slug, id, name, description, author, icon, type,
          includeSettings, includeStorage, registrationKey, prefix } = opts;

  const storageKey = `rc:plugin:${id}:data`;

  // ── Storage section (optional) ────────────────────────────────────────────
  const storageBlock = includeStorage ? `
  // ─── Storage ─────────────────────────────────────────────────────────────────
  //
  // Key: ${storageKey}
  // Namespace convention: rc:plugin:<plugin-id>:<key>
  // Never write to rc:session:* — that namespace is owned by dashboard.js.
  const STORAGE_KEY = '${storageKey}';

  /**
   * Load persisted plugin data from chrome.storage.local.
   * Called from onNavigate() — not from init() (lazy-init pattern).
   * @param {function} callback  Receives the stored data object or null.
   */
  function loadData(callback) {
    chrome.storage.local.get([STORAGE_KEY], function(result) {
      if (chrome.runtime.lastError) {
        app().addLog('error', PLUGIN_ID, 'Storage read failed: ' + chrome.runtime.lastError.message);
        callback(null);
        return;
      }
      callback(result[STORAGE_KEY] || null);
    });
  }

  /**
   * Save data to plugin-scoped storage.
   * @param {object} data  Plain object to persist. Must not contain undefined values.
   */
  function saveData(data) {
    if (data === undefined || data === null) return;
    chrome.storage.local.set({ [STORAGE_KEY]: data }, function() {
      if (chrome.runtime.lastError) {
        app().addLog('error', PLUGIN_ID, 'Storage write failed: ' + chrome.runtime.lastError.message);
      }
    });
  }
` : '';

  // ── Settings section (optional) ───────────────────────────────────────────
  // Settings for the flat runtime are stored in chrome.storage.local under the
  // plugin namespace and rendered inside the platform Settings view's plugin
  // section (dashboard.html #view-settings). Plugins bind to their own controls.
  const settingsKey = `rc:plugin:${id}:settings`;
  const settingsBlock = includeSettings ? `
  // ─── Settings ─────────────────────────────────────────────────────────────────
  //
  // Settings key: ${settingsKey}
  // Settings are read by the plugin and saved back via chrome.storage.local.
  // The platform Settings view contains plugin-specific sections rendered in
  // dashboard.html; this plugin binds its settings controls below.

  const SETTINGS_KEY = '${settingsKey}';

  const DEFAULT_SETTINGS = {
    // Add plugin-specific setting keys and default values here.
    // Example:
    //   enabled: true,
    //   displayCount: 10,
  };

  /** Live settings object — loaded from storage at onNavigate(). */
  let pluginSettings = { ...DEFAULT_SETTINGS };

  /**
   * Load persisted settings from chrome.storage.local.
   * @param {function} callback  Receives the merged settings object.
   */
  function loadSettings(callback) {
    chrome.storage.local.get([SETTINGS_KEY], function(result) {
      if (chrome.runtime.lastError) {
        app().addLog('warn', PLUGIN_ID, 'Settings load failed — using defaults');
        callback({ ...DEFAULT_SETTINGS });
        return;
      }
      const stored = result[SETTINGS_KEY];
      const merged = (stored && typeof stored === 'object')
        ? { ...DEFAULT_SETTINGS, ...stored }
        : { ...DEFAULT_SETTINGS };
      callback(merged);
    });
  }

  /**
   * Save settings back to storage after validation.
   * Invalid values must not be persisted.
   * @param {object} settings  The settings object to save.
   */
  function saveSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      app().addLog('error', PLUGIN_ID, 'saveSettings: invalid settings object — not persisted');
      return;
    }
    // TODO: Add plugin-specific validation before saving.
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, function() {
      if (chrome.runtime.lastError) {
        app().addLog('error', PLUGIN_ID, 'Settings save failed: ' + chrome.runtime.lastError.message);
        return;
      }
      app().addLog('info', PLUGIN_ID, 'Settings saved');
    });
  }

  /** Bind settings controls in the platform Settings view. */
  function bindSettingsControls() {
    // Example: bind a toggle in the Settings view
    // const myToggle = document.getElementById('${prefix}-settings-my-option');
    // myToggle?.addEventListener('change', function() {
    //   pluginSettings.enabled = this.checked;
    //   saveSettings(pluginSettings);
    // });
    // TODO: Bind your plugin-specific settings controls here.
  }
` : '';

  // ── init() body ───────────────────────────────────────────────────────────
  const initBody = `
    // ── init() is called ONCE at startup (DOMContentLoaded).
    // Rules (lazy-init pattern — mandatory since v1.20.1):
    //   ✅ Bind button and widget click handlers synchronously.
    //   ✅ Set initial DOM state from already-restored data.
    //   ❌ Do NOT call chrome.tabs.query() or chrome.storage.local.get() here.
    //   ❌ Do NOT start any async I/O — defer to onNavigate() or render().
    //
    // Widget button — opens the full plugin view.
    document.getElementById('${prefix}-widget-open-btn')?.addEventListener('click', function() {
      app().navigateTo('plugin-${slug}');
    });
${includeSettings ? `
    // Bind settings controls after DOM is ready.
    bindSettingsControls();` : ''}`;

  // ── render() body ─────────────────────────────────────────────────────────
  const renderBody = type === 'basic' ? '' : `

  /**
   * render() — Build or rebuild the full plugin view.
   *
   * Called by dashboard.js when the user navigates to this plugin's view
   * (see navigateTo() delegation). May also be called to refresh the view
   * after a data change.
   *
   * Async I/O (storage reads, tab queries) is permitted here because this
   * only runs when the user actively opens the plugin view.
   */
  function render() {
    const container = document.getElementById('${prefix}-container');
    if (!container) return;
${includeStorage ? `
    // Load persisted data before rendering.
    loadData(function(data) {
      renderView(container, data);
    });` : `
    renderView(container, null);`}
  }

  /**
   * renderView() — Populate the view container with content.
   * @param {HTMLElement} container  The plugin view container.
   * @param {object|null} data       Persisted plugin data (may be null on first use).
   */
  function renderView(container, data) {
    // Loading state: shown briefly while async I/O completes.
    // Empty state: shown when there is no data to display.
    // Error state: shown when a critical operation fails.

    if (!data) {
      // Empty state — uses platform standard rc-plugin-empty component
      container.innerHTML = [
        '<div class="rc-plugin-empty">',
        '  <p class="rc-plugin-empty__title">Nothing here yet</p>',
        '  <p class="rc-plugin-empty__body">Use the controls below to get started.</p>',
        '</div>',
        // TODO: Add your plugin UI here.
        '<div class="rc-plugin-action-bar" style="margin-top:8px;">',
        '  <!-- TODO: Add primary action button -->',
        '</div>',
      ].join('\\n');
    } else {
      // Normal state — display loaded data.
      container.innerHTML = [
        // TODO: Replace with your actual content rendering.
        '<div class="rc-plugin-section">',
        '  <div class="rc-plugin-section__header">',
        '    <span class="rc-plugin-section__title">Results</span>',
        '  </div>',
        '  <p class="rc-muted">Data loaded. Replace with your content rendering.</p>',
        '</div>',
      ].join('\\n');
    }
  }
`;

  // ── onNavigate() / onLeave() ──────────────────────────────────────────────
  const navBody = `

  /**
   * onNavigate() — Called by dashboard.js when the user navigates to this
   * plugin's view (view id: "plugin-${slug}").
   *
   * This is the correct place for deferred async I/O that was NOT allowed
   * in init(). Examples: storage reads, tab queries, background messages.
   */
  function onNavigate() {
    app().addLog('info', PLUGIN_ID, '${name} view opened');
${includeSettings ? `
    // Load current settings before rendering.
    loadSettings(function(settings) {
      pluginSettings = settings;
      ${type !== 'basic' ? "render();" : "// TODO: Apply settings to the view."}
    });` : (type !== 'basic' ? '    render();' : '    // TODO: Add navigation logic here.')}
  }

  /**
   * onLeave() — Called by dashboard.js when the user navigates AWAY from
   * this plugin's view.
   *
   * Responsibilities:
   *   - Pause timers or animations.
   *   - Remove event listeners that only apply when the view is active.
   *   - Do NOT clear persisted data — only stop ongoing activity.
   */
  function onLeave() {
    app().addLog('info', PLUGIN_ID, '${name} view closed');
    // TODO: Clean up any view-specific resources here.
  }
`;

  // ── Registration object ───────────────────────────────────────────────────
  const registrationProps = [
    `    id: PLUGIN_ID,`,
    `    init,`,
    ...(type !== 'basic' ? [`    render,`] : []),
    `    onNavigate,`,
    `    onLeave,`,
  ];

  // ── Full file ─────────────────────────────────────────────────────────────
  return `/**
 * ${name}
 * plugins/${slug}.js
 *
 * Plugin ID:  ${id}
 * Version:    ${DEFAULT_VERSION}
 * Author:     ${author}
 * Category:   productivity
 * Template:   ${type} (generated from Example Plugin baseline)
 *
 * ${description}
 *
 * Registration: window.ReplyCatorsPlugins.${registrationKey}
 *
 * Generated by: npm run create-plugin
 * Generator baseline: plugins/example-plugin.js
 */

(function() {
  'use strict';

  const PLUGIN_ID = '${id}';

  const plugin = {
${registrationProps.join('\n')}
  };

  /** Access the shared platform services exposed by dashboard.js. */
  function app() { return window.ReplyCatorsApp; }
${storageBlock}${settingsBlock}${renderBody}
  /**
   * init() — Called ONCE by dashboard.js during DOMContentLoaded startup.
   *
   * Lifecycle phase: Initialization
   * Called by: dashboard.js _safeInit() block
   * Arguments: none (unless dashboard.js passes initial restored state)
   * Returns: void (synchronous)
   * Async I/O: FORBIDDEN — see lazy-init pattern in DEVELOPER_GUIDE.md
   *
   * Must be idempotent: calling twice must not register duplicate handlers.
   */
  function init() {${initBody}
  }

  /**
   * onNavigate() — Called by dashboard.js when the user navigates to
   *                "plugin-${slug}".
   *
   * Lifecycle phase: Navigation
   * Called by: dashboard.js navigateTo() delegate block
   * Arguments: none
   * Returns: void
   * Async I/O: ALLOWED — defer all I/O to here from init()
   *
   * Must be idempotent: repeated calls must not cause duplicate renders.
   */
  function onNavigate() {${navBody.slice(navBody.indexOf('\n    app()'))}}

  /**
   * onLeave() — Called by dashboard.js when the user navigates AWAY.
   *
   * Lifecycle phase: Cleanup
   * Called by: dashboard.js navigateTo() leave block
   * Arguments: none
   * Returns: void
   *
   * Responsibilities: pause timers, remove active-view-only listeners.
   * Do NOT remove listeners registered in init() — those survive navigation.
   */
  function onLeave() {
    app().addLog('info', PLUGIN_ID, '${name} view closed');
    // TODO: Add cleanup for view-specific resources.
  }
${type !== 'basic' ? `
  /**
   * render() — Build or rebuild the plugin view.
   *
   * Lifecycle phase: Render
   * Called by: onNavigate() and on demand after data changes.
   * Arguments: none
   * Returns: void
   * Async I/O: ALLOWED
   */
  function render() {
    const container = document.getElementById('${prefix}-container');
    if (!container) return;
${includeStorage ? `
    loadData(function(data) {
      _renderView(container, data);
    });` : `
    _renderView(container, null);`}
  }

  function _renderView(container, data) {
    if (!data) {
      container.innerHTML = [
        '<div class="rc-plugin-empty">',
        '  <p class="rc-plugin-empty__title">Nothing here yet</p>',
        '  <p class="rc-plugin-empty__body">Use the controls below to get started.</p>',
        '</div>',
        '<div class="rc-plugin-action-bar" style="margin-top:8px;">',
        '  <!-- TODO: Add primary action button here. -->',
        '</div>',
      ].join('\\n');
    } else {
      container.innerHTML = [
        '<div class="rc-plugin-section">',
        '  <div class="rc-plugin-section__header">',
        '    <span class="rc-plugin-section__title">Results</span>',
        '  </div>',
        '  <!-- TODO: Replace with your content rendering. -->',
        '  <p class="rc-muted">Data loaded. Replace with your content rendering.</p>',
        '</div>',
      ].join('\\n');
    }
  }` : ''}
${includeStorage ? `
  // Storage helpers exposed inline — no separate helper module needed.
  // Key: ${storageKey}
  function loadData(callback) {
    chrome.storage.local.get([STORAGE_KEY], function(result) {
      if (chrome.runtime.lastError) {
        app().addLog('error', PLUGIN_ID, 'Storage read failed: ' + chrome.runtime.lastError.message);
        callback(null);
        return;
      }
      callback(result[STORAGE_KEY] || null);
    });
  }

  function saveData(data) {
    if (data === undefined || data === null) return;
    chrome.storage.local.set({ [STORAGE_KEY]: data }, function() {
      if (chrome.runtime.lastError) {
        app().addLog('error', PLUGIN_ID, 'Storage write failed: ' + chrome.runtime.lastError.message);
      }
    });
  }

  const STORAGE_KEY = '${storageKey}';` : ''}
${includeSettings ? `
  // Settings helpers — see settingsBlock above.
  const SETTINGS_KEY = '${settingsKey}';

  const DEFAULT_SETTINGS = {
    // TODO: Add your plugin-specific setting keys and defaults here.
  };

  let pluginSettings = { ...DEFAULT_SETTINGS };

  function loadSettings(callback) {
    chrome.storage.local.get([SETTINGS_KEY], function(result) {
      if (chrome.runtime.lastError) {
        app().addLog('warn', PLUGIN_ID, 'Settings load failed — using defaults');
        callback({ ...DEFAULT_SETTINGS });
        return;
      }
      const stored = result[SETTINGS_KEY];
      callback((stored && typeof stored === 'object')
        ? { ...DEFAULT_SETTINGS, ...stored }
        : { ...DEFAULT_SETTINGS });
    });
  }

  function saveSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      app().addLog('error', PLUGIN_ID, 'saveSettings: invalid settings — not persisted');
      return;
    }
    // TODO: Add validation before saving.
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, function() {
      if (chrome.runtime.lastError) {
        app().addLog('error', PLUGIN_ID, 'Settings save failed: ' + chrome.runtime.lastError.message);
        return;
      }
      app().addLog('info', PLUGIN_ID, 'Settings saved');
    });
  }

  function bindSettingsControls() {
    // TODO: Bind your plugin-specific settings controls from dashboard.html.
    // Example: document.getElementById('${prefix}-settings-option')?.addEventListener(...);
  }` : ''}

  // ── Self-registration ─────────────────────────────────────────────────────
  //
  // Registers this plugin under window.ReplyCatorsPlugins.${registrationKey}.
  // Dashboard.js reads this property to find and call lifecycle methods.
  // This must be the last statement in the IIFE.
  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.${registrationKey} = plugin;

})();
`;
}

// ─── Manual registration snippets ────────────────────────────────────────────

/**
 * Generate the manual registration instructions printed after generation.
 * These tell the developer exactly what to add to dashboard.js and dashboard.html.
 */
function buildRegistrationInstructions(opts) {
  const { slug, id, name, description, author, icon, type,
          registrationKey, prefix, includeSettings } = opts;

  const openSvg = `<span aria-hidden="true" style="display:inline-block;font-size:12px;line-height:1;">↗</span>`;

  return `
╔══════════════════════════════════════════════════════════════════╗
║  MANUAL REGISTRATION STEPS REQUIRED                             ║
╚══════════════════════════════════════════════════════════════════╝

The generator has created plugins/${slug}.js.
You must now complete these 5 manual steps to register the plugin.

──────────────────────────────────────────────────────────────────
STEP 1 — Add to PLUGINS[] in dashboard.js
──────────────────────────────────────────────────────────────────
Find the closing ]; of the PLUGINS array and add before it:

  {
    id: '${id}',
    name: '${name}',
    version: '1.0.0',
    description: '${description}',
    author: '${author}',
    category: 'productivity',
    tags: [],
    icon: '${icon}',
    viewId: 'plugin-${slug}',
  },

──────────────────────────────────────────────────────────────────
STEP 1b — Add to PLUGIN_DOC_MAP in dashboard.js
──────────────────────────────────────────────────────────────────
Find the PLUGIN_DOC_MAP constant and add a mapping entry:

  'plugin-${slug}': '${slug}',

Note: The documentation topic ID must match the topic ID registered in
plugins/documentation.js. Add the documentation topic BEFORE registering
the plugin. See AGENTS.md Documentation Accessibility Standard.

──────────────────────────────────────────────────────────────────
STEP 2 — Add view HTML to dashboard.html
──────────────────────────────────────────────────────────────────
Find the last <div class="rc-view" ...> plugin view block and add after it:

        <!-- ${name.toUpperCase()} PLUGIN VIEW -->
        <div class="rc-view rc-plugin-page" id="view-plugin-${slug}">
          <div class="rc-plugin-header">
            <span class="rc-plugin-header__icon"><span data-icon="${icon}" aria-hidden="true" class="rc-widget-icon"></span></span>
            <span class="rc-plugin-header__name">${name}</span>
            <span class="rc-plugin-header__version">v1.0.0</span>
            <button class="rc-doc-icon" data-doc-view="plugin-${slug}"
                    title="View ${name} documentation" aria-label="View ${name} documentation">
              <span data-icon="navigation.documentation" aria-hidden="true" style="display:block;width:16px;height:16px;"></span>
            </button>
          </div>
          <div class="rc-plugin-body" id="${prefix}-container">
            <!-- Populated by init() / render() -->
            <div class="rc-plugin-loading"><span data-icon="states.loading" aria-hidden="true"></span> Loading ${name}...</div>
          </div>
        </div>

──────────────────────────────────────────────────────────────────
STEP 3 — Add widget card to dashboard.html
──────────────────────────────────────────────────────────────────
Find the #rc-dashboard-widgets section and add a widget card:

            <!-- ${name} widget -->
            <div class="rc-widget-card" data-plugin-widget="${id}">
              <div class="rc-widget-card__header">
                <div class="rc-widget-card__title-group">
                  <span class="rc-widget-card__title"><span data-icon="${icon}" aria-hidden="true" class="rc-widget-icon"></span> ${name}</span>
                  <button class="rc-doc-icon" data-doc-view="plugin-${slug}"
                          title="View ${name} documentation" aria-label="View ${name} documentation">
                    <span data-icon="navigation.documentation" aria-hidden="true" style="display:block;width:16px;height:16px;"></span>
                  </button>
                </div>
                <button class="rc-widget-card__open" data-view="plugin-${slug}"
                        title="Open ${name}" aria-label="Open ${name}">
                  ${openSvg}
                </button>
              </div>
              <div class="rc-widget-card__body" style="padding:12px 14px 14px;">
                <p class="rc-muted" style="font-size:12px;margin-bottom:10px;">${description}</p>
                <button id="${prefix}-widget-open-btn" class="rc-btn rc-btn--primary rc-btn--sm"
                        title="Open ${name}">Open ${name}</button>
              </div>
            </div>

──────────────────────────────────────────────────────────────────
STEP 4 — Load the script in dashboard.html
──────────────────────────────────────────────────────────────────
Add BEFORE <script src="dashboard.js"></script>:

  <script src="plugins/${slug}.js"></script>

──────────────────────────────────────────────────────────────────
STEP 5 — Wire lifecycle hooks in dashboard.js
──────────────────────────────────────────────────────────────────
a) In the _safeInit block (DOMContentLoaded), add:

    _safeInit('${registrationKey}', () => window.ReplyCatorsPlugins?.${registrationKey}?.init?.());

b) In navigateTo(), add the onNavigate delegate:

    if (view === 'plugin-${slug}') window.ReplyCatorsPlugins?.${registrationKey}?.onNavigate?.();

c) In navigateTo(), add the onLeave call (before currentView is updated):

    if (currentView === 'plugin-${slug}' && view !== 'plugin-${slug}')
      window.ReplyCatorsPlugins?.${registrationKey}?.onLeave?.();

d) In the #activity-plugin-filter <select> in dashboard.html, add an option:

    <option value="${id}">${name}</option>

e) After adding the plugin, run:

    npm run sync

──────────────────────────────────────────────────────────────────
${includeSettings ? `STEP 5f — Add settings section to dashboard.html
──────────────────────────────────────────────────────────────────
In #view-settings, add a settings group for your plugin:

            <div class="rc-settings-group">
              <div class="rc-settings-group__title">${name}</div>
              <!-- TODO: Add settings rows here using rc-settings-row pattern. -->
              <!-- See docs/SETTINGS.md for supported field types.            -->
            </div>

──────────────────────────────────────────────────────────────────
` : ''}
──────────────────────────────────────────────────────────────────
DOCUMENTATION REQUIREMENT (mandatory - platform standard)
──────────────────────────────────────────────────────────────────
Before the plugin is considered complete you must:

  1. Add a documentation topic to plugins/documentation.js TOPICS_FLAT + CONTENT_MAP.
     Topic ID: '${slug}'
     Group:    'PLUGINS'

  2. Add a PLUGIN_DOC_MAP entry in dashboard.js (Step 1b above).

  3. Verify the Docs button in the panel header routes to your topic.

Plugins without documentation integration fail the Plugin Release Checklist.
See AGENTS.md Documentation Accessibility Standard for the full requirements.

──────────────────────────────────────────────────────────────────
See docs/DEVELOPER_GUIDE.md for the complete walkthrough.
`;
}

// ─── Interactive mode ─────────────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function runInteractive(rl, prefilled) {
  console.log('\n🔌 ReplyCators Plugin Generator');
  console.log('   Derived from the canonical Example Plugin baseline.\n');

  // Display Name
  let name = prefilled.name || '';
  while (true) {
    if (!name) name = await prompt(rl, '  Plugin display name: ');
    const v = validateDisplayName(name);
    if (v.ok) { name = v.name; break; }
    console.log('  ✗ ' + v.error);
    name = '';
  }

  // Plugin ID slug
  let slug = '', id = '';
  while (true) {
    const defaultSlug = prefilled.id
      ? prefilled.id.replace(PLUGIN_ID_PREFIX, '')
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const input = await prompt(rl, `  Plugin ID slug [${defaultSlug}]: `);
    const raw = input.trim() || defaultSlug;
    const r = resolvePluginId(raw);
    if (!r.ok) { console.log('  ✗ ' + r.error); continue; }
    const dupes = checkDuplicates(r.id, r.slug);
    if (dupes.length) { dupes.forEach(e => console.log('  ✗ ' + e)); continue; }
    slug = r.slug; id = r.id;
    break;
  }

  // Type
  let type = prefilled.type || '';
  while (!SUPPORTED_TYPES.includes(type)) {
    type = await prompt(rl, '  Template type (basic / widget / settings) [widget]: ');
    if (!type) type = 'widget';
    if (!SUPPORTED_TYPES.includes(type)) console.log('  ✗ Supported types: ' + SUPPORTED_TYPES.join(', '));
  }

  // Description
  let description = prefilled.description || '';
  if (!description) description = await prompt(rl, '  Description [One-line description.]: ');
  if (!description) description = 'One-line description.';

  // Author
  let author = prefilled.author || DEFAULT_AUTHOR;
  const authorInput = await prompt(rl, `  Author [${DEFAULT_AUTHOR}]: `);
  if (authorInput.trim()) author = authorInput.trim();

  // Icon
  let icon = prefilled.icon || DEFAULT_ICON;
  const iconInput = await prompt(rl, `  Icon emoji [${DEFAULT_ICON}]: `);
  if (iconInput.trim()) icon = iconInput.trim();

  // Options
  const addSettings = type === 'settings' ||
    (await prompt(rl, '  Include settings integration? (y/N): ')).toLowerCase() === 'y';
  const addStorage = (await prompt(rl, '  Include storage integration? (y/N): ')).toLowerCase() === 'y';

  const registrationKey = slugToRegistrationKey(slug);
  const prefix          = slugToPrefix(slug);

  console.log('\n  ─────────────────────────────────────────');
  console.log(`  Summary`);
  console.log(`  Plugin:     ${name}`);
  console.log(`  ID:         ${id}`);
  console.log(`  Type:       ${type}`);
  console.log(`  Reg. key:   window.ReplyCatorsPlugins.${registrationKey}`);
  console.log(`  File:       plugins/${slug}.js`);
  console.log(`  Settings:   ${addSettings ? 'yes' : 'no'}`);
  console.log(`  Storage:    ${addStorage  ? 'yes' : 'no'}`);
  console.log('  Baseline:   Example Plugin (plugins/example-plugin.js)');
  console.log('  ─────────────────────────────────────────\n');

  const confirm = await prompt(rl, '  Create plugin? (Y/n): ');
  if (confirm.trim().toLowerCase() === 'n') {
    console.log('  Cancelled.\n');
    return null;
  }

  return { slug, id, name, description, author, icon, type,
           includeSettings: addSettings, includeStorage: addStorage,
           registrationKey, prefix };
}

// ─── Non-interactive mode ─────────────────────────────────────────────────────

function runNonInteractive(args) {
  if (!args.name) { console.error('Error: --name is required.'); process.exit(1); }
  if (!args.id)   { console.error('Error: --id is required.'); process.exit(1); }
  if (!args.type) { console.error('Error: --type is required (basic | widget | settings).'); process.exit(1); }

  const vn = validateDisplayName(args.name);
  if (!vn.ok) { console.error('Error: ' + vn.error); process.exit(1); }

  const r = resolvePluginId(args.id);
  if (!r.ok) { console.error('Error: ' + r.error); process.exit(1); }

  if (!SUPPORTED_TYPES.includes(args.type)) {
    console.error('Error: Unsupported type "' + args.type + '". Use: ' + SUPPORTED_TYPES.join(', '));
    process.exit(1);
  }

  const dupes = checkDuplicates(r.id, r.slug);
  if (dupes.length) { dupes.forEach(e => console.error('Error: ' + e)); process.exit(1); }

  const includeSettings = args.type === 'settings' || !!args.settings;
  const includeStorage  = !!args.storage;

  return {
    slug: r.slug,
    id:   r.id,
    name: vn.name,
    description:      args.description || 'One-line description.',
    author:           args.author      || DEFAULT_AUTHOR,
    icon:             args.icon        || DEFAULT_ICON,
    type:             args.type,
    includeSettings,
    includeStorage,
    registrationKey:  slugToRegistrationKey(r.slug),
    prefix:           slugToPrefix(r.slug),
  };
}

// ─── File generation ──────────────────────────────────────────────────────────

function generateFiles(opts) {
  const destFile = path.join(PLUGINS_DIR, opts.slug + '.js');

  // Safety: ensure destination stays within plugins/
  const resolved = path.resolve(PLUGINS_DIR, opts.slug + '.js');
  if (!resolved.startsWith(PLUGINS_DIR + path.sep) && resolved !== path.join(PLUGINS_DIR, opts.slug + '.js')) {
    throw new Error('Path traversal detected — aborting.');
  }

  // Final duplicate guard
  if (fs.existsSync(destFile)) {
    throw new Error('File already exists: ' + destFile);
  }

  const content = getPluginTemplate(opts);

  // Check for any accidentally unresolved tokens
  const unresolvedTokens = content.match(/\{\{[A-Z_]+\}\}/g);
  if (unresolvedTokens) {
    throw new Error('Unresolved template tokens: ' + unresolvedTokens.join(', '));
  }

  // ASCII punctuation validation - em dashes and en dashes are not permitted
  // in generated plugin files (AGENTS.md ASCII Punctuation Standard).
  const emDashMatches  = content.match(/\u2014/g);  // em dash (—)
  const enDashMatches  = content.match(/\u2013/g);  // en dash (-)
  if (emDashMatches || enDashMatches) {
    const problems = [];
    if (emDashMatches)  problems.push(`${emDashMatches.length} em dash(es) (—)`);
    if (enDashMatches)  problems.push(`${enDashMatches.length} en dash(es) (-)`);
    throw new Error(
      'ASCII punctuation violation in generated content: ' + problems.join(', ') +
      '. Use a standard hyphen (-) instead.'
    );
  }

  // Write the file
  fs.writeFileSync(destFile, content, 'utf8');
  return destFile;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2);
  const args    = parseArgs(rawArgs);

  const isNonInteractive = !!(args.name && args.id && args.type);

  let opts = null;
  let rl   = null;

  try {
    if (isNonInteractive) {
      opts = runNonInteractive(args);
    } else {
      rl   = readline.createInterface({ input: process.stdin, output: process.stdout });
      opts = await runInteractive(rl, args);
      rl.close();
      if (!opts) process.exit(0);
    }

    // Generate the plugin file
    console.log('\n⚙  Generating plugin...');
    const destFile = generateFiles(opts);
    console.log(`✅ Created: plugins/${opts.slug}.js`);

    // Print manual registration instructions
    console.log(buildRegistrationInstructions(opts));

    console.log('✅ Plugin generated successfully.');
    console.log(`   Template mode:   ${opts.type}`);
    console.log(`   Baseline:        Example Plugin (plugins/example-plugin.js)\n`);

  } catch (err) {
    if (rl) rl.close();

    // Rollback: remove the destination file if it was partially written
    const destFile = path.join(PLUGINS_DIR, (opts?.slug || '_failed') + '.js');
    if (opts?.slug && fs.existsSync(destFile)) {
      try { fs.unlinkSync(destFile); console.error('  Rolled back: ' + destFile); } catch (_) { /* ignore */ }
    }

    console.error('\n❌ Generation failed: ' + (err.message || err));
    console.error('   Repository unchanged. No manual repair required.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
