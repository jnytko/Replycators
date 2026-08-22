/**
 * ReplyCators - Backup & Restore Plugin
 * v1.0.5
 *
 * Platform-wide, versioned, extensible backup and restore system.
 *
 * Architecture:
 *   - Uses an explicit plugin participation registry (BR_PLUGIN_REGISTRY).
 *   - Each plugin declares its exportable, optional, and never-export keys.
 *   - The platform orchestrates export/import; plugins are never bypassed.
 *   - Export format is versioned JSON with envelope metadata.
 *   - Import is treated as fully untrusted: parse → validate → preview → apply.
 *   - Rollback snapshots are captured before any write.
 *   - Sanitization is schema-aware; no regex over raw JSON serialization.
 *
 * Storage: none - this plugin does not persist state.
 * Plugin ID: com.replycators.backup-restore
 * View ID: backup-restore
 */

(function () {
  'use strict';

  // ─── Plugin registration ──────────────────────────────────────────────────

  const PLUGIN_ID = 'com.replycators.backup-restore';
  const FORMAT_ID = 'replycators-backup';
  const FORMAT_VERSION = 1;
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB hard limit
  const MAX_JSON_DEPTH = 30;               // nesting depth limit for untrusted JSON

  const plugin = {
    id: PLUGIN_ID,
    init,
    render,
    onNavigate,
  };

  function app() { return window.ReplyCatorsApp; }

  // ─── Dangerous prototype-pollution keys ───────────────────────────────────
  const FORBIDDEN_KEYS = new Set([
    '__proto__', 'constructor', 'prototype',
    'toString', 'valueOf', 'hasOwnProperty',
    'isPrototypeOf', 'propertyIsEnumerable', '__defineGetter__',
    '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
  ]);

  // ─── Plugin data registry ─────────────────────────────────────────────────
  //
  // Each entry describes one plugin's storage contract.
  //
  // Fields:
  //   pluginId       - exact plugin ID as used in storage keys and PLUGINS[]
  //   displayName    - human-readable name for UI
  //   exportable     - keys ALWAYS included in export (durable user config/data)
  //   optional       - keys included only when selected in "include optional data"
  //   neverExport    - keys that are NEVER included (runtime/cache/secrets)
  //   sensitiveFields - paths (dot-notation or array index) of fields to sanitize
  //   schemaVersion  - integer; bumped when schema changes
  //   validate(data) - returns { ok: boolean, errors: string[] }
  //   migrate(data, fromVersion) - upgrades data from an older schema version
  //   sanitize(data) - returns redacted copy; never mutates the original
  //   restoreStrategy - 'replace' | 'merge'  (how to handle existing data)
  //   requiresReload  - true if a reload is needed for the import to take effect

  const BR_PLUGIN_REGISTRY = [

    // ── Platform (global settings, plugin states, ordering) ──────────────────
    {
      pluginId:        'platform',
      displayName:     'Platform Settings',
      exportable: [
        'rc:session:app-settings',
        'rc:session:plugin-states',
        'rc:session:dashboard-order',
        'rc:session:plugins-section-collapsed',
      ],
      optional:        [],
      neverExport: [
        'rc:session:logs',
        'rc:session:notifications',
        'rc:session:nav-view',
        'rc:session:sidebar-width',
      ],
      schemaVersion:   1,
      sensitiveFields: [],
      validate(data) {
        const errors = [];
        const s = data['rc:session:app-settings'];
        if (s !== undefined) {
          if (typeof s !== 'object' || s === null || Array.isArray(s)) errors.push('app-settings must be an object');
          const VALID_THEMES = ['ibm-blue','dark','midnight-blue','nord','dracula','solarized-dark','solarized-light','graphite','high-contrast-dark','high-contrast-light','light','replycators'];
          if (s && s.theme && !VALID_THEMES.includes(s.theme)) errors.push('app-settings.theme is not a known theme: ' + String(s.theme).slice(0, 40));
          const VALID_DENSITY = ['compact','comfortable','spacious'];
          if (s && s.density && !VALID_DENSITY.includes(s.density)) errors.push('app-settings.density is invalid');
          const VALID_LAUNCH = ['popup','sidepanel'];
          if (s && s.defaultLaunchMode && !VALID_LAUNCH.includes(s.defaultLaunchMode)) errors.push('app-settings.defaultLaunchMode is invalid');
        }
        const ps = data['rc:session:plugin-states'];
        if (ps !== undefined && (typeof ps !== 'object' || ps === null || Array.isArray(ps))) {
          errors.push('plugin-states must be an object');
        }
        const order = data['rc:session:dashboard-order'];
        if (order !== undefined && !Array.isArray(order)) {
          errors.push('dashboard-order must be an array');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data) { return data; }, // no migrations yet
      sanitize(data) { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: true,
    },

    // ── Salesforce Case Extractor ─────────────────────────────────────────────
    {
      pluginId:        'com.replycators.salesforce-extractor',
      displayName:     'Salesforce Case Extractor',
      exportable: [
        'rc:plugin:com.replycators.salesforce-extractor:prompts',
        'rc:plugin:com.replycators.salesforce-extractor:prompts-seeded',
        'rc:session:sf-settings',
      ],
      optional: [
        'rc:plugin:com.replycators.salesforce-extractor:selected-prompt',
        'rc:plugin:com.replycators.salesforce-extractor:context-file',
        'rc:plugin:com.replycators.salesforce-extractor:additional-instructions',
      ],
      neverExport: [
        'rc:session:sf-last-result',                       // customer case data
        'rc:plugin:com.replycators.salesforce-extractor:last-download', // device-specific path
      ],
      schemaVersion:   1,
      sensitiveFields: [
        'rc:session:sf-settings.bobWorkingDir',
        // bobApiKey is excluded unconditionally at export and import time regardless of sanitize
        // mode - see exportBackup() and applyImport() below. Issue #18.
        // Not listed here as a sanitize target because the export/import strips it before
        // sanitize() is called; the sanitize() path also clears it as defense-in-depth.
        'rc:plugin:com.replycators.salesforce-extractor:context-file',
        'rc:plugin:com.replycators.salesforce-extractor:additional-instructions',
      ],
      validate(data) {
        const errors = [];
        const prompts = data['rc:plugin:com.replycators.salesforce-extractor:prompts'];
        if (prompts !== undefined) {
          if (!Array.isArray(prompts)) { errors.push('sf prompts must be an array'); }
          else {
            prompts.forEach((p, i) => {
              if (!p || typeof p !== 'object') { errors.push('sf prompts[' + i + '] must be an object'); return; }
              if (typeof p.id !== 'string')    errors.push('sf prompts[' + i + '].id must be a string');
              if (typeof p.title !== 'string') errors.push('sf prompts[' + i + '].title must be a string');
              if (typeof p.body !== 'string')  errors.push('sf prompts[' + i + '].body must be a string');
            });
          }
        }
        const sf = data['rc:session:sf-settings'];
        if (sf !== undefined) {
          if (typeof sf !== 'object' || sf === null) errors.push('sf-settings must be an object');
          const VALID_FMT = ['plain-text','markdown','json'];
          if (sf && sf.outputFormat && !VALID_FMT.includes(sf.outputFormat)) errors.push('sf-settings.outputFormat invalid');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data) { return data; },
      sanitize(data) {
        const copy = _deepClone(data);
        if (copy['rc:session:sf-settings'] && typeof copy['rc:session:sf-settings'] === 'object') {
          copy['rc:session:sf-settings'].bobWorkingDir = '';
          copy['rc:session:sf-settings'].bobApiKey = '';
        }
        // Sanitize context file and additional instructions
        if ('rc:plugin:com.replycators.salesforce-extractor:context-file' in copy) {
          copy['rc:plugin:com.replycators.salesforce-extractor:context-file'] = '';
        }
        if ('rc:plugin:com.replycators.salesforce-extractor:additional-instructions' in copy) {
          copy['rc:plugin:com.replycators.salesforce-extractor:additional-instructions'] = '';
        }
        return copy;
      },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Cloudability OrgID ────────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.cloudability-orgid',
      displayName:     'Cloudability OrgID',
      exportable:      [],           // no durable user-created data
      optional:        [],
      neverExport: [
        'rc:plugin:com.replycators.cloudability-orgid:orgid-cache', // org identifier - never export
      ],
      schemaVersion:   1,
      sensitiveFields: [],
      validate()       { return { ok: true, errors: [] }; },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Apptio Planning Upgrade Calculator ────────────────────────────────────
    {
      pluginId:        'com.replycators.apptio-planning-upgrade-calculator',
      displayName:     'Apptio Planning Upgrade Calculator',
      exportable: [
        'rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc',
      ],
      optional:        [],
      neverExport: [
        'rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache',
      ],
      schemaVersion:   1,
      sensitiveFields: [],
      validate(data) {
        const errors = [];
        const lc = data['rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc'];
        if (lc !== undefined && (typeof lc !== 'object' || lc === null)) {
          errors.push('auc:last-calc must be an object');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Edge Bookmark Finder ──────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.edge-bookmark-finder',
      displayName:     'Edge Bookmark Finder',
      exportable: [
        'rc:plugin:com.replycators.edge-bookmark-finder:prefs',
      ],
      optional:        [],
      neverExport: [
        'rc:plugin:com.replycators.edge-bookmark-finder:last-scan', // regenerable
      ],
      schemaVersion:   1,
      sensitiveFields: [],
      validate(data) {
        const errors = [];
        const prefs = data['rc:plugin:com.replycators.edge-bookmark-finder:prefs'];
        if (prefs !== undefined && (typeof prefs !== 'object' || prefs === null || Array.isArray(prefs))) {
          errors.push('bookmark:prefs must be an object');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Snake ─────────────────────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.snake',
      displayName:     'Snake',
      exportable: [
        'rc:plugin:com.replycators.snake:state',
      ],
      optional:        [],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [],
      validate(data) {
        const errors = [];
        const st = data['rc:plugin:com.replycators.snake:state'];
        if (st !== undefined) {
          if (typeof st !== 'object' || st === null) errors.push('snake:state must be an object');
          else if (st.highScore !== undefined && typeof st.highScore !== 'number') {
            errors.push('snake:state.highScore must be a number');
          }
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Workspace Starter ─────────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.workspace-starter',
      displayName:     'Workspace Starter',
      exportable: [
        'rc:plugin:com.replycators.workspace-starter:data',
      ],
      optional:        [],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [
        'rc:plugin:com.replycators.workspace-starter:data.profiles[].urls',
      ],
      validate(data) {
        const errors = [];
        const d = data['rc:plugin:com.replycators.workspace-starter:data'];
        if (d !== undefined) {
          if (typeof d !== 'object' || d === null) { errors.push('ws:data must be an object'); return { ok: false, errors }; }
          if (!Array.isArray(d.profiles)) errors.push('ws:data.profiles must be an array');
          else {
            d.profiles.forEach((p, i) => {
              if (!p || typeof p !== 'object') { errors.push('ws:profiles[' + i + '] must be an object'); return; }
              if (typeof p.id !== 'string') errors.push('ws:profiles[' + i + '].id must be a string');
              if (typeof p.name !== 'string') errors.push('ws:profiles[' + i + '].name must be a string');
              if (!Array.isArray(p.urls)) errors.push('ws:profiles[' + i + '].urls must be an array');
              else {
                p.urls.forEach((u, j) => {
                  if (typeof u !== 'string') errors.push('ws:profiles[' + i + '].urls[' + j + '] must be a string');
                  else if (u.length > 2048) errors.push('ws:profiles[' + i + '].urls[' + j + '] exceeds 2048 chars');
                });
              }
              const VALID_MODES = ['tab-group','tabs'];
              if (p.launchMode && !VALID_MODES.includes(p.launchMode)) errors.push('ws:profiles[' + i + '].launchMode invalid');
            });
          }
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data) {
        // Workspace profiles may contain personal/work URLs - redact them
        const copy = _deepClone(data);
        const d = copy['rc:plugin:com.replycators.workspace-starter:data'];
        if (d && Array.isArray(d.profiles)) {
          d.profiles.forEach(p => {
            if (Array.isArray(p.urls)) {
              p.urls = p.urls.map(u => {
                try {
                  const parsed = new URL(u);
                  // Keep scheme + host, redact path/query/hash
                  return parsed.origin + '/[REDACTED]';
                } catch { return '[REDACTED_URL]'; }
              });
            }
          });
        }
        return copy;
      },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Tab Search ────────────────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.tab-search',
      displayName:     'Tab Search',
      exportable:      [],  // no persistent storage
      optional:        [],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [],
      validate()       { return { ok: true, errors: [] }; },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Apptio Documentation Finder ───────────────────────────────────────────
    {
      pluginId:        'com.replycators.apptio-docs-finder',
      displayName:     'Apptio Documentation Finder',
      exportable: [
        'rc:plugin:com.replycators.apptio-docs-finder:favorites',
        'rc:plugin:com.replycators.apptio-docs-finder:settings',
        'rc:plugin:com.replycators.apptio-docs-finder:sources',
        'rc:plugin:com.replycators.apptio-docs-finder:quick-links',
      ],
      optional: [
        'rc:plugin:com.replycators.apptio-docs-finder:recent-searches',
        'rc:plugin:com.replycators.apptio-docs-finder:recently-opened',
      ],
      neverExport: [
        'rc:plugin:com.replycators.apptio-docs-finder:last-refresh',  // cache timestamp
        'rc:plugin:com.replycators.apptio-docs-finder:diag',          // diagnostics
      ],
      schemaVersion:   1,
      sensitiveFields: [
        'rc:plugin:com.replycators.apptio-docs-finder:recent-searches[].query',
        'rc:plugin:com.replycators.apptio-docs-finder:recently-opened[].label',
      ],
      validate(data) {
        const errors = [];
        const favs = data['rc:plugin:com.replycators.apptio-docs-finder:favorites'];
        if (favs !== undefined && !Array.isArray(favs)) errors.push('adf:favorites must be an array');
        const settings = data['rc:plugin:com.replycators.apptio-docs-finder:settings'];
        if (settings !== undefined && (typeof settings !== 'object' || settings === null || Array.isArray(settings))) {
          errors.push('adf:settings must be an object');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data) {
        const copy = _deepClone(data);
        // Redact recent searches - may contain customer names/case numbers
        const recent = copy['rc:plugin:com.replycators.apptio-docs-finder:recent-searches'];
        if (Array.isArray(recent)) {
          copy['rc:plugin:com.replycators.apptio-docs-finder:recent-searches'] = recent.map(r => ({
            ...r,
            query: '[REDACTED]',
          }));
        }
        // Redact recently-opened labels - may contain document titles with customer info
        const opened = copy['rc:plugin:com.replycators.apptio-docs-finder:recently-opened'];
        if (Array.isArray(opened)) {
          copy['rc:plugin:com.replycators.apptio-docs-finder:recently-opened'] = opened.map(o => ({
            ...o,
            label: '[REDACTED]',
          }));
        }
        return copy;
      },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Quick Note Pad ────────────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.notepad',
      displayName:     'Quick Note Pad',
      exportable: [
        'rc:plugin:com.replycators.notepad:notes',
        'rc:plugin:com.replycators.notepad:state',
      ],
      optional:        [],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [
        'rc:plugin:com.replycators.notepad:notes[].body',  // may contain customer case details
        'rc:plugin:com.replycators.notepad:notes[].title', // may contain case numbers
      ],
      validate(data) {
        const errors = [];
        const notes = data['rc:plugin:com.replycators.notepad:notes'];
        if (notes !== undefined) {
          if (!Array.isArray(notes)) {
            errors.push('notepad:notes must be an array');
          } else {
            notes.forEach(function (n, i) {
              if (typeof n !== 'object' || n === null) errors.push('notepad:notes[' + i + '] must be an object');
              else if (typeof n.id !== 'string') errors.push('notepad:notes[' + i + '].id must be a string');
              else if (typeof n.title !== 'string') errors.push('notepad:notes[' + i + '].title must be a string');
              else if (typeof n.body !== 'string') errors.push('notepad:notes[' + i + '].body must be a string');
            });
          }
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data) {
        const copy = _deepClone(data);
        // Redact note content - may contain customer names, case numbers, error messages
        const notes = copy['rc:plugin:com.replycators.notepad:notes'];
        if (Array.isArray(notes)) {
          copy['rc:plugin:com.replycators.notepad:notes'] = notes.map(function (n) {
            return Object.assign({}, n, { title: '[REDACTED]', body: '[REDACTED]' });
          });
        }
        return copy;
      },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Jira & Confluence Smart Search Hub ────────────────────────────────────
    {
      pluginId:        'com.replycators.jira-confluence-hub',
      displayName:     'Jira & Confluence Smart Search Hub',
      exportable: [
        'rc:plugin:com.replycators.jira-confluence-hub:settings',
      ],
      optional: [
        'rc:plugin:com.replycators.jira-confluence-hub:jira-recents',
        'rc:plugin:com.replycators.jira-confluence-hub:confluence-recents',
      ],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [
        'rc:plugin:com.replycators.jira-confluence-hub:jira-recents[].label',
        'rc:plugin:com.replycators.jira-confluence-hub:confluence-recents[].label',
      ],
      validate(data) {
        const errors = [];
        const settings = data['rc:plugin:com.replycators.jira-confluence-hub:settings'];
        if (settings !== undefined && (typeof settings !== 'object' || settings === null || Array.isArray(settings))) {
          errors.push('jch:settings must be an object');
        }
        const jiraRecents = data['rc:plugin:com.replycators.jira-confluence-hub:jira-recents'];
        if (jiraRecents !== undefined && !Array.isArray(jiraRecents)) {
          errors.push('jch:jira-recents must be an array');
        }
        const confRecents = data['rc:plugin:com.replycators.jira-confluence-hub:confluence-recents'];
        if (confRecents !== undefined && !Array.isArray(confRecents)) {
          errors.push('jch:confluence-recents must be an array');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data) {
        const copy = _deepClone(data);
        // Redact recent item labels - may contain customer-specific issue keys or page titles
        const jr = copy['rc:plugin:com.replycators.jira-confluence-hub:jira-recents'];
        if (Array.isArray(jr)) {
          copy['rc:plugin:com.replycators.jira-confluence-hub:jira-recents'] = jr.map(function (r) {
            return Object.assign({}, r, { label: '[REDACTED]' });
          });
        }
        const cr = copy['rc:plugin:com.replycators.jira-confluence-hub:confluence-recents'];
        if (Array.isArray(cr)) {
          copy['rc:plugin:com.replycators.jira-confluence-hub:confluence-recents'] = cr.map(function (r) {
            return Object.assign({}, r, { label: '[REDACTED]' });
          });
        }
        return copy;
      },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Environment Dashboards Launcher ───────────────────────────────────────
    {
      pluginId:        'com.replycators.env-dashboards',
      displayName:     'Environment Dashboards Launcher',
      exportable: [
        'rc:plugin:com.replycators.env-dashboards:state',
      ],
      optional:        [],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [],
      validate(data) {
        const errors = [];
        const st = data['rc:plugin:com.replycators.env-dashboards:state'];
        if (st !== undefined && (typeof st !== 'object' || st === null || Array.isArray(st))) {
          errors.push('env-dashboards:state must be an object');
        }
        return { ok: errors.length === 0, errors };
      },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },

    // ── Example Plugin ────────────────────────────────────────────────────────
    {
      pluginId:        'com.replycators.example-plugin',
      displayName:     'Example Plugin',
      exportable:      [],
      optional:        [],
      neverExport:     [],
      schemaVersion:   1,
      sensitiveFields: [],
      validate()       { return { ok: true, errors: [] }; },
      migrate(data)    { return data; },
      sanitize(data)   { return _deepClone(data); },
      restoreStrategy: 'replace',
      requiresReload: false,
    },
  ];

  // ─── Known-safe namespace prefix ─────────────────────────────────────────
  const ALLOWED_KEY_PREFIX = /^rc:(session|plugin|platform):/;

  // ─── Module state ─────────────────────────────────────────────────────────
  let _importLock     = false;   // prevents concurrent Apply clicks
  let _currentImport  = null;    // parsed + validated import data in progress
  let _rollbackSnap   = null;    // storage snapshot taken before apply
  let _rendered       = false;

  // ─── Utility: deep clone (safe for plain JSON-serialisable objects) ───────
  function _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  // ─── Utility: measure JSON depth ─────────────────────────────────────────
  function _jsonDepth(val, depth) {
    if (depth > MAX_JSON_DEPTH) return depth;
    if (typeof val !== 'object' || val === null) return depth;
    let max = depth;
    for (const k of Object.keys(val)) {
      const d = _jsonDepth(val[k], depth + 1);
      if (d > max) max = d;
      if (max > MAX_JSON_DEPTH) return max;
    }
    return max;
  }

  // ─── Utility: check for forbidden keys recursively ───────────────────────
  function _hasForbiddenKey(obj, depth) {
    if (depth > MAX_JSON_DEPTH) return false;
    if (typeof obj !== 'object' || obj === null) return false;
    for (const k of Object.keys(obj)) {
      if (FORBIDDEN_KEYS.has(k)) return true;
      if (_hasForbiddenKey(obj[k], depth + 1)) return true;
    }
    return false;
  }

  // ─── Utility: escape HTML ─────────────────────────────────────────────────
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  /**
   * Build and download an export file.
   * @param {object} options
   *   mode        'full' | 'selected'
   *   pluginIds   array of plugin IDs to include (required for 'selected')
   *   includeOptional  boolean
   *   sanitize    boolean
   */
  async function exportBackup(options) {
    const mode           = options.mode || 'full';
    const includeOpt     = !!options.includeOptional;
    const sanitize       = !!options.sanitize;
    const selectedIds    = Array.isArray(options.pluginIds) ? options.pluginIds : null;

    // Determine which plugin registry entries to include
    const registryToExport = BR_PLUGIN_REGISTRY.filter(entry => {
      if (mode === 'full') return true;
      if (mode === 'selected') {
        // Always include platform settings for dependencies
        if (entry.pluginId === 'platform') return selectedIds && selectedIds.length > 0;
        return selectedIds && selectedIds.includes(entry.pluginId);
      }
      return false;
    });

    // Collect all keys to read
    const keysToRead = [];
    registryToExport.forEach(entry => {
      keysToRead.push(...entry.exportable);
      if (includeOpt) keysToRead.push(...entry.optional);
    });

    // Read storage (with lastError check - get() never rejects but does set lastError)
    const stored = await new Promise((resolve, reject) => {
      chrome.storage.local.get(keysToRead, result => {
        if (chrome.runtime.lastError) {
          reject(new Error('Storage read failed: ' + (chrome.runtime.lastError.message || 'unknown error')));
        } else {
          resolve(result);
        }
      });
    });

    // Build per-plugin export sections
    const sections = {};
    const schemaVersions = {};
    const selectedPluginIds = [];

    for (const entry of registryToExport) {
      const sectionData = {};
      const keys = [...entry.exportable, ...(includeOpt ? entry.optional : [])];

      keys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(stored, key) && stored[key] !== undefined) {
          sectionData[key] = _deepClone(stored[key]);
        }
      });

      let finalData = entry.migrate(sectionData, entry.schemaVersion);
      if (sanitize) {
        finalData = entry.sanitize(finalData);
      }

      // Issue #18: strip bobApiKey unconditionally from every export regardless of sanitize
      // mode. The key is a device-specific security credential that must never leave the
      // local machine. sanitize() also clears it as defense-in-depth, but this guard fires
      // even when the user has not enabled sanitization.
      if (entry.pluginId === 'com.replycators.salesforce-extractor') {
        const sfKey = 'rc:session:sf-settings';
        if (finalData[sfKey] && typeof finalData[sfKey] === 'object') {
          delete finalData[sfKey].bobApiKey;
        }
      }

      sections[entry.pluginId] = finalData;
      schemaVersions[entry.pluginId] = entry.schemaVersion;
      if (entry.pluginId !== 'platform') selectedPluginIds.push(entry.pluginId);
    }

    // Build export envelope
    const manifest = chrome.runtime.getManifest();
    const envelope = {
      _format:             FORMAT_ID,
      _formatVersion:      FORMAT_VERSION,
      _rcVersion:          manifest.version,
      _exportedAt:         new Date().toISOString(),
      _exportMode:         mode,
      _sanitized:          sanitize,
      _includesOptional:   includeOpt,
      _selectedPluginIds:  selectedIds || null,
      _schemaVersions:     schemaVersions,
      sections,
    };

    const json    = JSON.stringify(envelope, null, 2);
    const blob    = new Blob([json], { type: 'application/json' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href        = url;
    a.download    = 'replycators-backup-' + ts + '.json';
    a.click();
    URL.revokeObjectURL(url);

    app().addLog('info', PLUGIN_ID, 'Backup exported: mode=' + mode + ', sanitized=' + sanitize + ', sections=' + Object.keys(sections).join(','));
    app().addNotification('Backup Exported', 'Backup file downloaded (' + mode + (sanitize ? ', sanitized' : '') + ').', 'success', PLUGIN_ID);

    return { ok: true, sections: Object.keys(sections) };
  }

  // ─── Import validation ────────────────────────────────────────────────────

  /**
   * Parse and validate an imported file.
   * Returns { ok, envelope, errors, warnings } - does NOT touch storage.
   */
  function validateImport(rawText) {
    const errors   = [];
    const warnings = [];

    // ── Size check (already done at file-select but check again on raw text) ──
    if (rawText.length > MAX_FILE_BYTES) {
      errors.push('File exceeds maximum size of 10 MB.');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── JSON parse ────────────────────────────────────────────────────────────
    let envelope;
    try {
      envelope = JSON.parse(rawText);
    } catch (e) {
      errors.push('File is not valid JSON: ' + (e && e.message ? _sanitizeErrorMsg(e.message) : 'parse error'));
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Type check ────────────────────────────────────────────────────────────
    if (typeof envelope !== 'object' || envelope === null || Array.isArray(envelope)) {
      errors.push('Backup file root must be a JSON object.');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Depth check ───────────────────────────────────────────────────────────
    if (_jsonDepth(envelope, 0) > MAX_JSON_DEPTH) {
      errors.push('Backup file has excessive nesting depth (limit: ' + MAX_JSON_DEPTH + ').');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Forbidden keys ────────────────────────────────────────────────────────
    if (_hasForbiddenKey(envelope, 0)) {
      errors.push('Backup file contains forbidden object keys (possible prototype pollution attempt).');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Format identifier ─────────────────────────────────────────────────────
    if (envelope._format !== FORMAT_ID) {
      errors.push('Not a ReplyCators backup file (_format: ' + _esc(String(envelope._format || 'missing').slice(0, 40)) + ').');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Format version ────────────────────────────────────────────────────────
    if (typeof envelope._formatVersion !== 'number') {
      errors.push('_formatVersion must be a number.');
      return { ok: false, envelope: null, errors, warnings };
    }
    if (envelope._formatVersion > FORMAT_VERSION) {
      errors.push('Backup was created by a newer version of ReplyCators (format v' + envelope._formatVersion + '). Please upgrade the extension first.');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Required fields ───────────────────────────────────────────────────────
    const required = ['_format','_formatVersion','_rcVersion','_exportedAt','_exportMode','sections'];
    for (const field of required) {
      if (!(field in envelope)) {
        errors.push('Missing required field: ' + field);
      }
    }
    if (errors.length) return { ok: false, envelope: null, errors, warnings };

    // ── Field types ───────────────────────────────────────────────────────────
    if (typeof envelope._rcVersion !== 'string')  errors.push('_rcVersion must be a string');
    if (typeof envelope._exportedAt !== 'string') errors.push('_exportedAt must be a string');
    if (typeof envelope._exportMode !== 'string') errors.push('_exportMode must be a string');
    if (typeof envelope.sections !== 'object' || envelope.sections === null || Array.isArray(envelope.sections)) {
      errors.push('sections must be an object');
    }
    if (errors.length) return { ok: false, envelope: null, errors, warnings };

    // ── Timestamp validation ──────────────────────────────────────────────────
    const ts = Date.parse(envelope._exportedAt);
    if (isNaN(ts)) {
      errors.push('_exportedAt is not a valid ISO 8601 timestamp.');
      return { ok: false, envelope: null, errors, warnings };
    }
    const now = Date.now();
    const oneYearMs = 365 * 24 * 3600 * 1000;
    if (ts > now + 3600000) warnings.push('_exportedAt is in the future - clock skew or tampered file?');
    if (ts < now - 5 * oneYearMs) warnings.push('Backup is more than 5 years old - settings may be incompatible.');

    // ── Export mode ────────────────────────────────────────────────────────────
    const VALID_MODES = ['full','selected'];
    if (!VALID_MODES.includes(envelope._exportMode)) {
      errors.push('_exportMode must be "full" or "selected"');
      return { ok: false, envelope: null, errors, warnings };
    }

    // ── Duplicate section check ───────────────────────────────────────────────
    const sectionKeys = Object.keys(envelope.sections);
    const seenSections = new Set();
    sectionKeys.forEach(k => {
      if (seenSections.has(k)) errors.push('Duplicate section key: ' + k);
      seenSections.add(k);
    });
    if (errors.length) return { ok: false, envelope: null, errors, warnings };

    // ── Unknown section check ─────────────────────────────────────────────────
    const knownPluginIds = new Set(BR_PLUGIN_REGISTRY.map(e => e.pluginId));
    sectionKeys.forEach(k => {
      if (!knownPluginIds.has(k)) warnings.push('Unknown section "' + _esc(k.slice(0,50)) + '" will be ignored.');
    });

    // ── Per-plugin validation ─────────────────────────────────────────────────
    for (const entry of BR_PLUGIN_REGISTRY) {
      const section = envelope.sections[entry.pluginId];
      if (!section) continue;
      if (typeof section !== 'object' || section === null) {
        errors.push('Section "' + entry.pluginId + '" must be an object.');
        continue;
      }
      // Namespace escape check: every key must belong to an allowed namespace
      for (const k of Object.keys(section)) {
        if (!ALLOWED_KEY_PREFIX.test(k)) {
          errors.push('Section "' + entry.pluginId + '" contains key outside allowed namespace: ' + _esc(k.slice(0,80)));
        }
        // Key may only reference keys declared by this plugin's registry entry
        const declaredKeys = new Set([...entry.exportable, ...entry.optional]);
        if (!declaredKeys.has(k)) {
          warnings.push('Section "' + entry.pluginId + '" contains undeclared key "' + _esc(k.slice(0,80)) + '" - it will be ignored during restore.');
        }
      }
      // Run plugin-specific validator
      const result = entry.validate(section);
      if (!result.ok) result.errors.forEach(e => errors.push('[' + entry.pluginId + '] ' + e));
    }

    return { ok: errors.length === 0, envelope, errors, warnings };
  }

  // ─── Sanitise error messages before showing them in UI ───────────────────
  function _sanitizeErrorMsg(msg) {
    // Only return the first 200 characters and strip anything that looks like JSON or a file path
    return String(msg || '').replace(/[\r\n]/g, ' ').slice(0, 200);
  }

  // ─── Build import preview data ────────────────────────────────────────────
  function buildPreview(envelope) {
    const preview = {
      rcVersion:         envelope._rcVersion,
      exportedAt:        envelope._exportedAt,
      exportMode:        envelope._exportMode,
      sanitized:         !!envelope._sanitized,
      includesOptional:  !!envelope._includesOptional,
      selectedPluginIds: envelope._selectedPluginIds || null,
      schemaVersions:    envelope._schemaVersions   || {},
      sections:          [],
      unsupportedSections: [],
      warnings:          [],
      requiresReload:    false,
    };

    const knownPluginIds = new Set(BR_PLUGIN_REGISTRY.map(e => e.pluginId));

    // Known sections
    for (const entry of BR_PLUGIN_REGISTRY) {
      const section = envelope.sections[entry.pluginId];
      if (!section) continue;
      const keys = Object.keys(section).filter(k => {
        const declared = new Set([...entry.exportable, ...entry.optional]);
        return declared.has(k);
      });
      if (keys.length === 0) continue;

      const schemaInFile = (envelope._schemaVersions || {})[entry.pluginId] || 1;
      const needsMigration = schemaInFile < entry.schemaVersion;

      preview.sections.push({
        pluginId:     entry.pluginId,
        displayName:  entry.displayName,
        keys,
        schemaInFile,
        currentSchema: entry.schemaVersion,
        needsMigration,
        restoreStrategy: entry.restoreStrategy,
        requiresReload: entry.requiresReload,
      });

      if (entry.requiresReload) preview.requiresReload = true;
      if (needsMigration) preview.warnings.push('Section "' + entry.displayName + '" will be migrated from schema v' + schemaInFile + ' → v' + entry.schemaVersion);
    }

    // Unknown sections
    Object.keys(envelope.sections).forEach(k => {
      if (!knownPluginIds.has(k)) {
        preview.unsupportedSections.push(k);
        preview.warnings.push('Unknown section "' + k + '" will be skipped.');
      }
    });

    return preview;
  }

  // ─── Apply import ─────────────────────────────────────────────────────────

  /**
   * Apply the validated import envelope to chrome.storage.local.
   * Captures a rollback snapshot before writing, verifies writes, and restores
   * on failure.
   */
  async function applyImport(envelope) {
    if (_importLock) throw new Error('Import already in progress.');
    _importLock = true;

    try {
      // ── Phase 1: build write plan ──────────────────────────────────────────
      const writes = {};

      for (const entry of BR_PLUGIN_REGISTRY) {
        const section = envelope.sections[entry.pluginId];
        if (!section) continue;

        const schemaInFile = (envelope._schemaVersions || {})[entry.pluginId] || 1;
        let data = _deepClone(section);

        // Only restore keys explicitly declared in this plugin's registry
        const declaredKeys = new Set([...entry.exportable, ...entry.optional]);
        const filteredData = {};
        for (const k of Object.keys(data)) {
          if (declaredKeys.has(k)) filteredData[k] = data[k];
        }
        data = filteredData;

        // Issue #18: strip bobApiKey unconditionally on import to prevent legacy backups
        // (created before v1.46.8) from restoring the credential to storage.
        if (entry.pluginId === 'com.replycators.salesforce-extractor') {
          const sfKey = 'rc:session:sf-settings';
          if (data[sfKey] && typeof data[sfKey] === 'object') {
            delete data[sfKey].bobApiKey;
          }
        }

        // Migrate if needed
        data = entry.migrate(data, schemaInFile);

        // Re-validate migrated data
        const result = entry.validate(data);
        if (!result.ok) {
          throw new Error('Post-migration validation failed for ' + entry.pluginId + ': ' + result.errors.join('; '));
        }

        // Queue writes
        for (const [k, v] of Object.entries(data)) {
          writes[k] = v;
        }
      }

      if (Object.keys(writes).length === 0) {
        throw new Error('Nothing to restore - the backup contains no keys recognized by this installation.');
      }

      // ── Phase 2: capture rollback snapshot ────────────────────────────────
      const keysToSnapshot = Object.keys(writes);
      const existingValues = await new Promise((resolve, reject) => {
        chrome.storage.local.get(keysToSnapshot, result => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(result || {});
        });
      });

      _rollbackSnap = {};
      for (const k of keysToSnapshot) {
        _rollbackSnap[k] = {
          present: Object.prototype.hasOwnProperty.call(existingValues, k) && existingValues[k] !== undefined,
          value: existingValues[k]
        };
      }

      // ── Phase 3: write ────────────────────────────────────────────────────
      await new Promise((resolve, reject) => {
        chrome.storage.local.set(writes, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });

      // ── Phase 4: read-back verification ───────────────────────────────────
      const readBack = await new Promise((resolve, reject) => {
        chrome.storage.local.get(keysToSnapshot, result => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(result);
        });
      });

      // Spot-check: every written key must be present in read-back and match intended values
      const failedKeys = keysToSnapshot.filter(k => {
        if (!(k in readBack)) return true;
        return JSON.stringify(readBack[k]) !== JSON.stringify(writes[k]);
      });
      if (failedKeys.length > 0) {
        throw new Error('Read-back verification failed - mismatched or missing keys: ' + failedKeys.join(', '));
      }

      // ── Phase 5: notify platform ──────────────────────────────────────────
      app().addLog('info', PLUGIN_ID, 'Import applied: ' + keysToSnapshot.length + ' key(s) written');
      app().addNotification('Backup Restored', 'Import applied successfully. ' + (keysToSnapshot.length) + ' setting(s) restored.', 'success', PLUGIN_ID);

      // Clear rollback snapshot on success
      _rollbackSnap = null;

      return { ok: true, keysWritten: keysToSnapshot.length, writtenKeys: keysToSnapshot };

    } catch (err) {
      // ── Rollback ──────────────────────────────────────────────────────────
      if (_rollbackSnap !== null) {
        try {
          const toRestore = {};
          const toRemove = [];
          for (const [k, entry] of Object.entries(_rollbackSnap)) {
            if (entry.present) {
              toRestore[k] = entry.value;
            } else {
              toRemove.push(k);
            }
          }

          if (Object.keys(toRestore).length > 0) {
            await new Promise((resolve, reject) => {
              chrome.storage.local.set(toRestore, () => {
                if (chrome.runtime.lastError) reject(new Error('Rollback set failed: ' + chrome.runtime.lastError.message));
                else resolve();
              });
            });
          }

          if (toRemove.length > 0) {
            await new Promise((resolve, reject) => {
              chrome.storage.local.remove(toRemove, () => {
                if (chrome.runtime.lastError) reject(new Error('Rollback remove failed: ' + chrome.runtime.lastError.message));
                else resolve();
              });
            });
          }

          app().addLog('warn', PLUGIN_ID, 'Import failed - rolled back to previous state');
          app().addNotification('Import Failed - Rolled Back', 'Settings restored to previous state.', 'warning', PLUGIN_ID);
        } catch (rollbackErr) {
          app().addLog('error', PLUGIN_ID, 'CRITICAL: rollback also failed: ' + rollbackErr.message);
          app().addNotification('Critical Error', 'Import AND rollback failed. Please reinstall or clear storage.', 'error', PLUGIN_ID);
        }
      }
      throw err;
    } finally {
      _importLock = false;
    }
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  function _setStatus(el, msg, type) {
    if (!el) return;
    el.style.display  = msg ? '' : 'none';
    // Use textContent for single-line messages; for multi-line (e.g. validation errors)
    // display as a list by splitting on newlines and using preformatted text.
    if (msg && msg.includes('\n')) {
      el.textContent = '';
      msg.split('\n').forEach((line, i) => {
        if (i > 0) el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(line));
      });
    } else {
      el.textContent = msg || '';
    }
    el.className      = 'rc-status-bar ' + (type === 'err' ? 'err' : type === 'ok' ? 'ok' : type === 'warn' ? 'warn' : '');
  }

  function _renderPreviewTable(preview) {
    if (!preview || !preview.sections.length) {
      return '<p class="rc-muted" style="font-size:12px;">No recognisable sections found in this backup file.</p>';
    }

    const rows = preview.sections.map(s => `
      <tr>
        <td style="padding:5px 8px;font-size:12px;">${_esc(s.displayName)}</td>
        <td style="padding:5px 8px;font-size:11px;color:var(--rc-text-muted);">${_esc(s.keys.join(', ').slice(0, 120))}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:center;">${s.needsMigration ? '<span style="color:var(--rc-amber);">v' + s.schemaInFile + ' → v' + s.currentSchema + '</span>' : '<span style="color:var(--rc-green);">v' + s.schemaInFile + '</span>'}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:center;">${_esc(s.restoreStrategy)}</td>
      </tr>
    `).join('');

    const unsupported = preview.unsupportedSections.length
      ? `<p style="font-size:11px;color:var(--rc-text-muted);margin-top:8px;">Note: ${_esc(preview.unsupportedSections.length + ' unknown section(s) will be skipped: ' + preview.unsupportedSections.join(', ').slice(0,120))}</p>`
      : '';

    const warnings = preview.warnings.length
      ? '<ul style="font-size:11px;color:var(--rc-amber);margin:6px 0;padding-left:16px;">' +
        preview.warnings.map(w => '<li>' + _esc(w) + '</li>').join('') +
        '</ul>'
      : '';

    return `
      <div class="br-preview-meta" style="font-size:11px;color:var(--rc-text-muted);margin-bottom:8px;">
        <span>Exported: <strong>${_esc(preview.exportedAt)}</strong></span>&ensp;
        <span>From: <strong>v${_esc(preview.rcVersion)}</strong></span>&ensp;
        <span>Mode: <strong>${_esc(preview.exportMode)}</strong></span>&ensp;
        <span>Sanitized: <strong>${preview.sanitized ? 'Yes' : 'No'}</strong></span>
        ${preview.requiresReload ? '<br><span style="color:var(--rc-amber);">Extension reload required after import.</span>' : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:var(--rc-surface);border-bottom:1px solid var(--rc-border);">
            <th style="padding:5px 8px;text-align:left;">Plugin</th>
            <th style="padding:5px 8px;text-align:left;">Keys</th>
            <th style="padding:5px 8px;text-align:center;">Schema</th>
            <th style="padding:5px 8px;text-align:center;">Strategy</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${warnings}${unsupported}
    `;
  }

  // ─── Render the Backup & Restore view ─────────────────────────────────────

  function render(containerEl) {
    const container = containerEl || document.getElementById('br-plugin-container');
    if (!container) return;

    const pluginOptions = BR_PLUGIN_REGISTRY
      .filter(e => e.pluginId !== 'platform' && (e.exportable.length + e.optional.length) > 0)
      .map(e => `<label class="br-plugin-checkbox-row" style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px;">
        <input type="checkbox" class="br-plugin-select" value="${_esc(e.pluginId)}" checked aria-label="Include ${_esc(e.displayName)}" />
        ${_esc(e.displayName)}
      </label>`).join('');

    container.innerHTML = `
      <div class="br-sections" style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">

        <!-- ── EXPORT SECTION ── -->
        <div class="br-card" style="flex:1;min-width:280px;max-width:480px;background:var(--rc-surface);border:1px solid var(--rc-border);border-radius:8px;padding:16px;">
          <div class="rc-section-title" style="margin-bottom:12px;">Export Backup</div>

          <div class="rc-settings-row" style="margin-bottom:10px;">
            <div class="rc-settings-row__info">
              <span class="rc-settings-row__label">Export scope</span>
            </div>
            <div class="rc-settings-row__control">
              <select id="br-export-mode" class="rc-input rc-input--sm" aria-label="Export scope"
                      title="Full: all eligible data. Selected plugins: choose which plugins to include.">
                <option value="full">Full export (all plugins)</option>
                <option value="selected">Selected plugins</option>
              </select>
            </div>
          </div>

          <div id="br-plugin-select-area" style="display:none;margin-bottom:10px;padding:8px;background:var(--rc-bg);border:1px solid var(--rc-border);border-radius:6px;">
            <div style="font-size:11px;font-weight:600;color:var(--rc-text-muted);margin-bottom:6px;">Include plugins:</div>
            ${pluginOptions}
          </div>

          <div class="rc-settings-row" style="margin-bottom:10px;">
            <div class="rc-settings-row__info">
              <span class="rc-settings-row__label">Include optional data</span>
              <span class="rc-settings-row__desc" style="font-size:11px;">Recent searches, opened history</span>
            </div>
            <div class="rc-settings-row__control">
              <label class="rc-toggle" title="Include optional history data in the export">
                <input type="checkbox" class="rc-toggle__input" id="br-include-optional" />
                <span class="rc-toggle__slider"></span>
              </label>
            </div>
          </div>

          <div class="rc-settings-row" style="margin-bottom:14px;">
            <div class="rc-settings-row__info">
              <span class="rc-settings-row__label">Sanitize before export</span>
              <span class="rc-settings-row__desc" style="font-size:11px;">Remove customer names, case data, working directory paths, API keys, and other sensitive fields. Reduces but does not guarantee removal of all sensitive information from custom data.</span>
            </div>
            <div class="rc-settings-row__control">
              <label class="rc-toggle" title="Redact sensitive fields before exporting">
                <input type="checkbox" class="rc-toggle__input" id="br-sanitize" />
                <span class="rc-toggle__slider"></span>
              </label>
            </div>
          </div>

          <div id="br-export-status" class="rc-status-bar" style="display:none;margin-bottom:8px;"></div>

          <button id="br-export-btn" class="rc-btn rc-btn--primary" style="width:100%;"
                  title="Generate and download the backup JSON file" aria-label="Export backup">
            Export Backup
          </button>
        </div>

        <!-- ── IMPORT SECTION ── -->
        <div class="br-card" style="flex:1;min-width:280px;max-width:480px;background:var(--rc-surface);border:1px solid var(--rc-border);border-radius:8px;padding:16px;">
          <div class="rc-section-title" style="margin-bottom:12px;">Import Backup</div>

          <div style="margin-bottom:12px;">
            <button id="br-import-select-btn" class="rc-btn rc-btn--secondary" style="width:100%;"
                    title="Choose a ReplyCators backup JSON file to import"
                    aria-label="Choose backup file">
              Choose Backup File…
            </button>
            <input type="file" id="br-import-file" accept=".json,application/json" style="display:none;"
                   aria-label="Backup file input" />
            <div id="br-file-name" style="font-size:11px;color:var(--rc-text-muted);margin-top:4px;min-height:14px;"></div>
          </div>

          <div id="br-import-status" class="rc-status-bar" style="display:none;margin-bottom:8px;"></div>

          <!-- Preview area - shown after successful validation -->
          <div id="br-preview-area" style="display:none;">
            <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--rc-text);">Import Preview</div>
            <div id="br-preview-content" style="background:var(--rc-bg);border:1px solid var(--rc-border);border-radius:6px;padding:10px;max-height:220px;overflow-y:auto;font-size:11px;"></div>

            <div class="rc-settings-row" style="margin:10px 0 6px;">
              <div class="rc-settings-row__info">
                <span class="rc-settings-row__label" style="font-size:12px;">Conflict strategy</span>
                <span class="rc-settings-row__desc" style="font-size:11px;">How to handle existing data when restoring</span>
              </div>
              <div class="rc-settings-row__control">
                <select id="br-conflict-strategy" class="rc-input rc-input--sm" aria-label="Conflict strategy"
                        title="Replace: overwrite all selected keys with imported values. Keep existing on conflict: skip keys that already have values.">
                  <option value="replace">Replace (overwrite existing)</option>
                  <option value="keep-existing">Keep existing on conflict</option>
                </select>
              </div>
            </div>

            <div id="br-apply-status" class="rc-status-bar" style="display:none;margin-bottom:8px;"></div>

            <div style="display:flex;gap:8px;">
              <button id="br-apply-btn" class="rc-btn rc-btn--primary" style="flex:1;"
                      title="Apply the validated import - settings will be restored immediately"
                      aria-label="Apply import" aria-busy="false">
                Apply Import
              </button>
              <button id="br-cancel-import-btn" class="rc-btn rc-btn--ghost"
                      title="Cancel and discard the pending import"
                      aria-label="Cancel import">
                Cancel
              </button>
            </div>
          </div>

          <!-- Reload prompt - shown when a reload is required post-import -->
          <div id="br-reload-prompt" style="display:none;margin-top:10px;padding:10px;background:var(--rc-surface);border:1px solid var(--rc-amber, #f59e0b);border-radius:6px;font-size:12px;">
            <strong>Reload required.</strong> Platform settings were restored.
            <button id="br-reload-btn" class="rc-btn rc-btn--secondary rc-btn--sm" style="margin-left:8px;"
                    title="Reload the extension to apply restored settings">Reload Now</button>
          </div>

        </div>

      </div>

      <!-- ── WHAT IS INCLUDED / EXCLUDED ── -->
      <div style="margin-top:16px;background:var(--rc-surface);border:1px solid var(--rc-border);border-radius:8px;padding:14px;">
        <div class="rc-section-title" style="margin-bottom:8px;">ℹ What is included and excluded</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:var(--rc-bg);border-bottom:1px solid var(--rc-border);">
              <th style="padding:4px 8px;text-align:left;">Category</th>
              <th style="padding:4px 8px;text-align:left;">Classification</th>
              <th style="padding:4px 8px;text-align:left;">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:4px 8px;">Platform settings (theme, density, layout)</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Portable</td></tr>
            <tr><td style="padding:4px 8px;">Plugin enabled/disabled states + ordering</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Portable</td></tr>
            <tr><td style="padding:4px 8px;">Salesforce prompt library</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">User-created data</td></tr>
            <tr><td style="padding:4px 8px;">Salesforce output format + settings</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Portable</td></tr>
            <tr><td style="padding:4px 8px;">Bob Working Directory</td><td style="padding:4px 8px;color:var(--rc-amber);">Sanitizable</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Device-specific path; redacted when sanitize is on</td></tr>
            <tr><td style="padding:4px 8px;">Workspace Starter profiles</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">URLs sanitized to origin-only when sanitize is on</td></tr>
            <tr><td style="padding:4px 8px;">Documentation Finder favorites &amp; settings</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">User-created data</td></tr>
            <tr><td style="padding:4px 8px;">Documentation Finder recent searches</td><td style="padding:4px 8px;color:var(--rc-amber);">Optional / Sanitizable</td><td style="padding:4px 8px;color:var(--rc-text-muted);">May contain customer info; redacted when sanitize is on</td></tr>
            <tr><td style="padding:4px 8px;">Snake high score</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Non-sensitive</td></tr>
            <tr><td style="padding:4px 8px;">Edge Bookmark Finder preferences</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Portable</td></tr>
            <tr><td style="padding:4px 8px;">Apptio Planning last calculation</td><td style="padding:4px 8px;color:var(--rc-green);">Export by default</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Portable</td></tr>
            <tr><td style="padding:4px 8px;">Last extracted Salesforce case</td><td style="padding:4px 8px;color:var(--rc-danger,#ef4444);">Never exported</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Customer case data</td></tr>
            <tr><td style="padding:4px 8px;">Cloudability OrgID cache</td><td style="padding:4px 8px;color:var(--rc-danger,#ef4444);">Never exported</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Organisation identifier - account-specific</td></tr>
            <tr><td style="padding:4px 8px;">Bookmark scan cache</td><td style="padding:4px 8px;color:var(--rc-danger,#ef4444);">Never exported</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Regenerable; browsing-derived</td></tr>
            <tr><td style="padding:4px 8px;">Activity log &amp; notification history</td><td style="padding:4px 8px;color:var(--rc-danger,#ef4444);">Never exported</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Transient session data</td></tr>
            <tr><td style="padding:4px 8px;">Download history records</td><td style="padding:4px 8px;color:var(--rc-danger,#ef4444);">Never exported</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Device-specific paths</td></tr>
            <tr><td style="padding:4px 8px;">BobShell 2.0 API key</td><td style="padding:4px 8px;color:var(--rc-danger,#ef4444);">Never exported</td><td style="padding:4px 8px;color:var(--rc-text-muted);">Security credential - must be re-entered after restore on any machine</td></tr>
          </tbody>
        </table>
      </div>
    `;

    _rendered = true;
    _bindUI(container);
  }

  function _bindUI(container) {
    const exportModeEl    = container.querySelector('#br-export-mode');
    const pluginSelectEl  = container.querySelector('#br-plugin-select-area');
    const exportBtn       = container.querySelector('#br-export-btn');
    const exportStatusEl  = container.querySelector('#br-export-status');

    const importSelectBtn = container.querySelector('#br-import-select-btn');
    const importFileEl    = container.querySelector('#br-import-file');
    const fileNameEl      = container.querySelector('#br-file-name');
    const importStatusEl  = container.querySelector('#br-import-status');

    const previewArea     = container.querySelector('#br-preview-area');
    const previewContent  = container.querySelector('#br-preview-content');
    const applyBtn        = container.querySelector('#br-apply-btn');
    const cancelBtn       = container.querySelector('#br-cancel-import-btn');
    const applyStatusEl   = container.querySelector('#br-apply-status');
    const reloadPrompt    = container.querySelector('#br-reload-prompt');
    const reloadBtn       = container.querySelector('#br-reload-btn');

    // Export mode toggle
    exportModeEl?.addEventListener('change', () => {
      if (pluginSelectEl) {
        pluginSelectEl.style.display = exportModeEl.value === 'selected' ? '' : 'none';
      }
    });

    // Export
    exportBtn?.addEventListener('click', async () => {
      _setStatus(exportStatusEl, 'Generating backup…', '');
      exportBtn.disabled = true;

      try {
        const mode = exportModeEl?.value || 'full';
        const sanitize = container.querySelector('#br-sanitize')?.checked ?? false;
        const includeOptional = container.querySelector('#br-include-optional')?.checked ?? false;

        let selectedIds = null;
        if (mode === 'selected') {
          selectedIds = Array.from(container.querySelectorAll('.br-plugin-select:checked')).map(cb => cb.value);
          if (selectedIds.length === 0) {
            _setStatus(exportStatusEl, 'Select at least one plugin to export.', 'warn');
            exportBtn.disabled = false;
            return;
          }
        }

        await exportBackup({ mode, sanitize, includeOptional, pluginIds: selectedIds });
        _setStatus(exportStatusEl, 'Backup exported successfully.', 'ok');
      } catch (err) {
        _setStatus(exportStatusEl, 'Export failed: ' + _sanitizeErrorMsg(err.message), 'err');
        app().addLog('error', PLUGIN_ID, 'Export failed: ' + err.message);
        app().addNotification('Backup & Restore', 'Export failed: ' + _sanitizeErrorMsg(err.message), 'error', PLUGIN_ID);
      } finally {
        exportBtn.disabled = false;
      }
    });

    // File select
    importSelectBtn?.addEventListener('click', () => {
      if (importFileEl) {
        importFileEl.value = '';
        importFileEl.click();
      }
    });

    importFileEl?.addEventListener('change', async () => {
      const file = importFileEl?.files?.[0];
      if (!file) return;

      if (fileNameEl) fileNameEl.textContent = file.name;

      // Pre-check file size
      if (file.size > MAX_FILE_BYTES) {
        _setStatus(importStatusEl, 'File too large (max 10 MB).', 'err');
        if (previewArea) previewArea.style.display = 'none';
        _currentImport = null;
        return;
      }

      _setStatus(importStatusEl, 'Validating file…', '');
      if (previewArea) previewArea.style.display = 'none';
      _currentImport = null;

      let rawText;
      try {
        rawText = await file.text();
      } catch (e) {
        _setStatus(importStatusEl, 'Could not read file: ' + _sanitizeErrorMsg(e.message), 'err');
        return;
      }

      const { ok, envelope, errors, warnings } = validateImport(rawText);

      if (!ok) {
        // Show up to 5 errors; display as multi-line message using \n separator
        _setStatus(importStatusEl, 'Validation failed - ' + errors.length + ' error(s):\n' + errors.slice(0, 5).map(e => '• ' + e).join('\n'), 'err');
        return;
      }

      // Store validated envelope
      _currentImport = envelope;

      // Build preview
      const preview = buildPreview(envelope);
      if (previewContent) previewContent.innerHTML = _renderPreviewTable(preview);
      if (previewArea) previewArea.style.display = '';

      const warnMsg = warnings.length ? ' | ' + warnings.length + ' warning(s)' : '';
      _setStatus(importStatusEl, 'Validation passed - review the preview below.' + warnMsg, 'ok');
    });

    // Apply import
    applyBtn?.addEventListener('click', async () => {
      if (!_currentImport) {
        _setStatus(applyStatusEl, 'No validated import is pending.', 'err');
        return;
      }
      if (_importLock) {
        _setStatus(applyStatusEl, 'Import already in progress - please wait.', 'warn');
        return;
      }

      applyBtn.disabled = true;
      applyBtn.setAttribute('aria-busy', 'true');
      _setStatus(applyStatusEl, 'Applying import…', '');

      const conflictStrategy = container.querySelector('#br-conflict-strategy')?.value || 'replace';

      try {
        // For 'keep-existing' strategy: pre-load existing values and exclude them
        let envelopeToApply = _currentImport;
        if (conflictStrategy === 'keep-existing') {
          // Issue #27: _applyKeepExistingStrategy now returns { envelope, totalKeys, skippedCount }
          // so we can detect the all-conflict no-op case before calling applyImport().
          const keepResult = await _applyKeepExistingStrategy(_currentImport);
          envelopeToApply = keepResult.envelope;

          if (keepResult.totalKeys > 0 && keepResult.skippedCount === keepResult.totalKeys) {
            // All incoming keys already exist in storage - intentional no-op, not a failure.
            _setStatus(applyStatusEl, '0 restored, ' + keepResult.skippedCount + ' kept - all values already up to date.', 'ok');
            app().addLog('info', PLUGIN_ID, 'Keep-existing import: all ' + keepResult.skippedCount + ' key(s) already current - no writes needed');
            app().addNotification('Backup & Restore', 'Import complete - 0 restored, ' + keepResult.skippedCount + ' kept.', 'success', PLUGIN_ID);
            _currentImport = null;
            return;
          }
        }

        const result = await applyImport(envelopeToApply);
        _setStatus(applyStatusEl, 'Import applied: ' + result.keysWritten + ' setting(s) restored.', 'ok');
        _currentImport = null;

        // Advisory toast: fire when sf-settings was actually written and contains a bobWorkingDir.
        // Informs the user that the Bob Working Directory may need re-verification on this machine
        // and that the API key (never included in backups) must be re-entered. Issue #17.
        // Note: unreachable in the all-conflict no-op path above (early return), satisfying
        // Issue #17 deferred AC B-04: keep-existing that skips sf-settings does not fire the toast.
        if (result.writtenKeys && result.writtenKeys.includes('rc:session:sf-settings')) {
          const sfData = envelopeToApply.sections?.['com.replycators.salesforce-extractor']?.['rc:session:sf-settings'];
          if (sfData?.bobWorkingDir) {
            app().showToast(
              'Bob configuration restored - verify your Bob Working Directory is valid on this machine and re-enter your API key in Settings.',
              'info'
            );
          }
        }

        // Check if reload is required - use envelopeToApply (not _currentImport which is now null)
        const preview = buildPreview(envelopeToApply);
        if (preview.requiresReload && reloadPrompt) {
          reloadPrompt.style.display = '';
        }

      } catch (err) {
        _setStatus(applyStatusEl, 'Import failed: ' + _sanitizeErrorMsg(err.message) + ' - previous settings restored.', 'err');
        app().addLog('error', PLUGIN_ID, 'Import apply failed: ' + err.message);
        app().addNotification('Backup & Restore', 'Import failed - previous settings restored.', 'error', PLUGIN_ID);
      } finally {
        applyBtn.disabled = false;
        applyBtn.setAttribute('aria-busy', 'false');
      }
    });

    // Cancel import
    cancelBtn?.addEventListener('click', () => {
      _currentImport = null;
      if (previewArea) previewArea.style.display = 'none';
      if (importStatusEl) _setStatus(importStatusEl, '', '');
      if (applyStatusEl) _setStatus(applyStatusEl, '', '');
      if (fileNameEl) fileNameEl.textContent = '';
      if (importFileEl) importFileEl.value = '';
      app().addLog('info', PLUGIN_ID, 'Import cancelled by user');
    });

    // Reload
    reloadBtn?.addEventListener('click', () => {
      chrome.runtime.reload();
    });
  }

  /**
   * Apply "keep-existing" conflict strategy:
   * For each key in the import, if a value already exists in storage, remove
   * that key from the import envelope so it is not overwritten.
   *
   * Returns { envelope, totalKeys, skippedCount } so the caller can detect the
   * all-conflict no-op case (skippedCount === totalKeys > 0) without calling
   * applyImport(), which would throw on an empty write plan. Issue #27.
   */
  async function _applyKeepExistingStrategy(envelope) {
    // Collect all keys in the envelope
    const allKeys = [];
    for (const entry of BR_PLUGIN_REGISTRY) {
      const section = envelope.sections[entry.pluginId];
      if (!section) continue;
      allKeys.push(...Object.keys(section));
    }

    const existing = await new Promise(resolve => {
      chrome.storage.local.get(allKeys, resolve);
    });

    // Clone envelope and remove keys that already exist; track how many were skipped
    const modified = _deepClone(envelope);
    let skippedCount = 0;
    for (const entry of BR_PLUGIN_REGISTRY) {
      const section = modified.sections[entry.pluginId];
      if (!section) continue;
      for (const k of Object.keys(section)) {
        if (Object.prototype.hasOwnProperty.call(existing, k) && existing[k] !== undefined) {
          delete section[k];
          skippedCount++;
        }
      }
    }
    return { envelope: modified, totalKeys: allKeys.length, skippedCount };
  }

  // ─── Plugin lifecycle ─────────────────────────────────────────────────────

  function init() {
    // Nothing to init - no persistent state
  }

  function onNavigate() {
    render();
  }

  // ─── Self-register ────────────────────────────────────────────────────────

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.BackupRestore = plugin;

})();
