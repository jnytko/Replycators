/**
 * Icon Helper - Streamline Ultimate Colors (Free)
 * plugins/shared/icon-helper.js
 *
 * Provides icon resolution and rendering using official local SVG files from
 * the Streamline Ultimate Colors - Free pack.
 *
 * Icon Pack:    Streamline Ultimate Colors - Free
 * Official:     https://www.streamlinehq.com/icons/ultimate-colos-free
 * Source repo:  https://github.com/webalys-hq/streamline-vectors (ultimate/colors/)
 * License:      Creative Commons Attribution 4.0 International (CC BY 4.0)
 * Attribution:  Icons by Streamline (http://streamlinehq.com)
 * Download:     2025-07-16
 *
 * All icon paths are relative to the extension root.
 * All assets are bundled locally - no external URLs are referenced at runtime.
 * Multicolor artwork is preserved; currentColor is NOT forced.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO-TIER ICON POLICY  (MANDATORY - do not deviate)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TIER 1 - Feature icons  →  Streamline Ultimate Colors - Free (this library)
 *   Use for primary application features and navigation destinations:
 *     Dashboard, Plugin Manager, Marketplace, Notifications, Settings/Options,
 *     Help & Documentation, Backup & Restore, Activity, Diagnostics,
 *     Send Feedback, plugin identity icons, status indicators (success/warning/
 *     error/info/loading), and similar primary feature areas.
 *
 * TIER 2 - UI control symbols  →  native/system Unicode characters
 *   Use plain Unicode for navigation controls and inline interface actions:
 *     ☰  hamburger / toggle menu
 *     ↺  refresh / reload
 *     ↗  open in new tab / external link
 *     ⊟  open in side panel
 *     ⤢  pop out / popup mode
 *     ←  back       →  forward
 *     ×  close      ›  expand chevron   ‹  collapse chevron
 *     ⧉  copy       ↓  download
 *     ✅  success    ❌  error  (where text symbols communicate more clearly)
 *
 * NEVER use this library for Tier-2 controls. NEVER replace Tier-2 symbols
 * with decorative icon-pack artwork. The distinction must be consistent across
 * every view, plugin, template, and documentation example.
 *
 * See AGENTS.md §Icon System and docs/ICON-GUIDELINES.md for full policy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

(function() {

  const _BASE = 'assets/icons/streamline-ultimate-colors-free/';

  /**
   * Central icon registry - maps semantic IDs to local Streamline SVG paths.
   * All paths are relative to the extension root.
   * Every value must resolve to a file under assets/icons/streamline-ultimate-colors-free/.
   */
  const ICON_REGISTRY = {
    // ── Navigation ────────────────────────────────────────────────────────────
    // All navigation/ SVGs are semantically matched to their views.
    navigation: {
      home:          _BASE + 'navigation/home.svg',          // Home-Dashboard
      plugins:       _BASE + 'navigation/plugins.svg',       // Plugin-Manager (puzzle modules)
      marketplace:   _BASE + 'navigation/marketplace.svg',   // Shop-Sign-Open (open shop door)
      settings:      _BASE + 'navigation/settings.svg',      // Cog (classic gear = settings)
      diagnostics:   _BASE + 'navigation/diagnostics.svg',   // Network-Signal-Diagnostics
      notifications: _BASE + 'navigation/notifications.svg', // Bell-Notification
      activity:      _BASE + 'navigation/activity.svg',      // Activity-Log-Clock
      backup:        _BASE + 'navigation/backup.svg',        // Server-Backup
      documentation: _BASE + 'navigation/documentation.svg', // Book-Book-Pages
      reports:       _BASE + 'navigation/reports.svg',       // Graph-Stats-Circle
    },

    // ── Actions ───────────────────────────────────────────────────────────────
    actions: {
      search:         _BASE + 'actions/search.svg',
      refresh:        _BASE + 'actions/refresh.svg',
      sync:           _BASE + 'actions/sync.svg',
      syncLock:       _BASE + 'actions/sync-lock.svg',
      toggleMenu:     _BASE + 'actions/toggle-menu.svg',
      menu:           _BASE + 'actions/menu.svg',
      openExternal:   _BASE + 'actions/external-link.svg',
      copy:           _BASE + 'actions/copy.svg',
      download:       _BASE + 'actions/download.svg',
      upload:         _BASE + 'actions/upload.svg',
      add:            _BASE + 'actions/add.svg',
      remove:         _BASE + 'actions/remove.svg',
      edit:           _BASE + 'actions/edit.svg',
      settings:       _BASE + 'navigation/settings.svg',
      filter:         _BASE + 'actions/filter.svg',
      share:          _BASE + 'actions/share.svg',
      delete:         _BASE + 'actions/delete.svg',
      check:          _BASE + 'actions/check.svg',
      checkSquare:    _BASE + 'actions/check-square.svg',
      badgeCheck:     _BASE + 'actions/badge-check.svg',
      expand:         _BASE + 'actions/expand.svg',
      collapse:       _BASE + 'actions/collapse.svg',
      expandWindow:   _BASE + 'actions/expand-window.svg',
      shrinkWindow:   _BASE + 'actions/shrink-window.svg',
      back:           _BASE + 'actions/back.svg',
      forward:        _BASE + 'actions/forward.svg',
      arrowLeftCircle:  _BASE + 'actions/arrow-left-circle.svg',
      arrowRightCircle: _BASE + 'actions/arrow-right-circle.svg',
      undo:           _BASE + 'actions/undo.svg',
      tag:            _BASE + 'actions/tag.svg',
      toggleOn:       _BASE + 'actions/toggle-on.svg',
      attach:         _BASE + 'actions/attach.svg',
      print:          _BASE + 'actions/print.svg',
      zoomIn:         _BASE + 'actions/zoom-in.svg',
      zoomOut:        _BASE + 'actions/zoom-out.svg',
    },

    // ── States & Status Indicators ────────────────────────────────────────────
    states: {
      success:     _BASE + 'status/success.svg',
      warning:     _BASE + 'status/warning.svg',
      error:       _BASE + 'status/error.svg',
      info:        _BASE + 'status/info.svg',
      infoCircle:  _BASE + 'status/info-circle.svg',
      loading:     _BASE + 'status/loading.svg',
      loadingHalf: _BASE + 'utility/loading-half.svg',
      unavailable: _BASE + 'status/unavailable.svg',
      working:     _BASE + 'status/working.svg',
      pending:     _BASE + 'status/pending.svg',
      broadcast:   _BASE + 'status/broadcast.svg',
    },

    // ── Appearance ────────────────────────────────────────────────────────────
    // sidePanelMode: Layout-Left (explicit left panel = side panel view)
    // popupMode: App-Window-Two (small overlay window = popup view)
    appearance: {
      themeDark:     _BASE + 'utility/theme-dark.svg',
      themeLight:    _BASE + 'utility/theme-light.svg',
      sidePanelMode: _BASE + 'utility/side-panel-mode.svg',  // Layout-Left
      popupMode:     _BASE + 'utility/popup-mode.svg',       // App-Window-Two
    },

    // ── Utility ───────────────────────────────────────────────────────────────
    utility: {
      sendFeedback:    _BASE + 'utility/paper-write.svg',
      // display-mode toggles - canonical IDs referenced by dashboard.html data-icon attributes
      sidePanelMode:   _BASE + 'utility/side-panel-mode.svg',  // Browser-Page-Layout
      popupMode:       _BASE + 'utility/popup-mode.svg',       // Expand-2
      calendar:        _BASE + 'utility/calendar.svg',
      cloud:           _BASE + 'utility/cloud.svg',
      cloudAdd:        _BASE + 'utility/cloud-add.svg',
      cloudWarning:    _BASE + 'utility/cloud-warning.svg',
      database:        _BASE + 'utility/database.svg',
      databaseConnect: _BASE + 'utility/database-connect.svg',
      diagnostics:     _BASE + 'utility/diagnostics.svg',
      folder:          _BASE + 'utility/folder.svg',
      hardDrive:       _BASE + 'utility/hard-drive.svg',
      history:         _BASE + 'utility/history.svg',
      layout:          _BASE + 'utility/layout.svg',
      link:            _BASE + 'utility/link.svg',
      monitor:         _BASE + 'utility/monitor.svg',
      network:         _BASE + 'utility/network.svg',
      person:          _BASE + 'utility/person.svg',
      pin:             _BASE + 'utility/pin.svg',
      refreshLock:     _BASE + 'utility/refresh-lock.svg',
      server:          _BASE + 'utility/server.svg',
      settingsSlider:  _BASE + 'utility/settings-slider.svg',
      settingsSearch:  _BASE + 'utility/settings-search.svg',
      stats:           _BASE + 'utility/stats.svg',
      about:           _BASE + 'utility/about.svg',
      user:            _BASE + 'utility/user.svg',
      userChat:        _BASE + 'utility/user-chat.svg',
      team:            _BASE + 'utility/team.svg',
      usersGroup:      _BASE + 'utility/users-group.svg',
      peopleSearch:    _BASE + 'utility/people-search.svg',
      hierarchy:       _BASE + 'utility/hierarchy.svg',
      orgChart:        _BASE + 'utility/org-chart.svg',
      gauge:           _BASE + 'utility/gauge.svg',
      stopwatch:       _BASE + 'utility/stopwatch.svg',
      binoculars:      _BASE + 'utility/binoculars.svg',
      calculator:      _BASE + 'utility/calculator.svg',
      creditCard:      _BASE + 'utility/credit-card.svg',
      megaphone:       _BASE + 'utility/megaphone.svg',
      rss:             _BASE + 'utility/rss.svg',
      toolbox:         _BASE + 'utility/toolbox.svg',
      laptop:          _BASE + 'utility/laptop.svg',
      appCode:         _BASE + 'utility/app-code.svg',
      emailSend:       _BASE + 'utility/email-send.svg',
      emailInbox:      _BASE + 'utility/email-inbox.svg',
      emailSearch:     _BASE + 'utility/email-search.svg',
      presentation:    _BASE + 'utility/presentation.svg',
      todoList:        _BASE + 'utility/todo-list.svg',
      idea:            _BASE + 'utility/idea.svg',
      chatBubble:      _BASE + 'utility/chat-bubble.svg',
      chatTyping:      _BASE + 'utility/chat-typing.svg',
      officeDesk:      _BASE + 'utility/office-desk.svg',
      power:           _BASE + 'utility/power.svg',
    },

    // ── Content ───────────────────────────────────────────────────────────────
    content: {
      archive:     _BASE + 'content/archive.svg',
      book:        _BASE + 'content/book.svg',
      bookOpen:    _BASE + 'content/book-open.svg',
      bookClosed:  _BASE + 'content/book-closed.svg',
      checklist:   _BASE + 'content/checklist.svg',
      document:    _BASE + 'content/document.svg',
      note:        _BASE + 'content/note.svg',
      notes:       _BASE + 'content/notes.svg',
      penWrite:    _BASE + 'content/pen-write.svg',
      fileAdd:     _BASE + 'content/file-add.svg',
      fileEdit:    _BASE + 'content/file-edit.svg',
      fileStack:   _BASE + 'content/file-stack.svg',
      task:        _BASE + 'content/task.svg',
      uploadNotes: _BASE + 'content/upload-notes.svg',
    },

    // ── Security ──────────────────────────────────────────────────────────────
    security: {
      key:         _BASE + 'security/key.svg',
      lock:        _BASE + 'security/lock.svg',
      unlock:      _BASE + 'security/unlock.svg',
      shield:      _BASE + 'security/shield.svg',
      shieldCheck: _BASE + 'security/shield-check.svg',
      shieldLock:  _BASE + 'security/shield-lock.svg',
    },

    // ── Brands ────────────────────────────────────────────────────────────────
    brands: {
      amazon:      _BASE + 'brands/amazon.svg',
      apple:       _BASE + 'brands/apple.svg',
      dropbox:     _BASE + 'brands/dropbox.svg',
      github:      _BASE + 'brands/github.svg',
      google:      _BASE + 'brands/google.svg',
      googleDrive: _BASE + 'brands/google-drive.svg',
      linkedin:    _BASE + 'brands/linkedin.svg',
      microsoft:   _BASE + 'brands/microsoft.svg',
    },

    // ── Plugins - Built-in ────────────────────────────────────────────────────
    plugins: {
      salesforceCaseExtractor:      _BASE + 'plugins/salesforce-case-extractor.svg', // Cloud-Data-Transfer
      cloudabilityOrgId:            _BASE + 'plugins/cloudability-orgid.svg',        // Human-Resources-Hierarchy-Man (org chart = org ID)
      edgeBookmarkFinder:           _BASE + 'plugins/edge-bookmark-finder.svg',      // Bookmarks-Document
      apptioUpgradeCalculator:      _BASE + 'plugins/apptio-upgrade-calculator.svg', // Analytics-Board-Graph-Line (upgrade trend)
      apptioDocsFinder:             _BASE + 'plugins/apptio-docs-finder.svg',        // Book-Search
      workspaceStarter:             _BASE + 'plugins/workspace-starter.svg',         // Launch-Go (rocket)
      tabSearch:                    _BASE + 'plugins/tab-search.svg',                // Network-Search (browser + magnifier)
      snake:                        _BASE + 'plugins/snake.svg',                     // Chess-Knight (classic game piece)
      examplePlugin:                _BASE + 'plugins/example-plugin.svg',            // App-Window-Code (code template window - distinct from Plugin Manager's Module-Puzzle)
      backupRestore:                _BASE + 'plugins/backup-restore.svg',            // Server-Refresh-1
      envDashboards:                _BASE + 'plugins/env-dashboards.svg',            // Monitor + bar chart + launch arrow (custom, Streamline-style)
    },

    // ── Marketplace Plugins ───────────────────────────────────────────────────
    marketplacePlugins: {
      servicenow:   _BASE + 'plugins/servicenow.svg',
      jira:         _BASE + 'plugins/jira.svg',
      confluence:   _BASE + 'plugins/confluence.svg',
      microsoft365: _BASE + 'plugins/microsoft365.svg',
      azureDevOps:  _BASE + 'plugins/azure-devops.svg',
      powerBi:      _BASE + 'plugins/powerbi.svg',
      zendesk:      _BASE + 'plugins/zendesk.svg',
      aiAssistant:  _BASE + 'plugins/ai-assistant.svg',
      sap:          _BASE + 'plugins/sap.svg',
      workday:      _BASE + 'plugins/workday.svg',
    },

    // ── Documentation & Help ──────────────────────────────────────────────────
    documentation: {
      gettingStarted:  _BASE + 'plugins/workspace-starter.svg',
      troubleshooting: _BASE + 'navigation/diagnostics.svg',
      releaseNotes:    _BASE + 'content/checklist.svg',
      feature:         _BASE + 'utility/stats.svg',
    },

    // ── Fallback ──────────────────────────────────────────────────────────────
    fallback: {
      unknownPlugin: _BASE + 'plugins/unknown.svg',
      construction:  _BASE + 'status/warning.svg',
    },
  };

  // ── Validation: ensure no path references legacy systems ──────────────────
  // Guard: every registered value must start with the Streamline base path.
  // This prevents accidental re-introduction of material-symbols or emoji paths.
  (function _validateRegistry() {
    function checkObj(obj, path) {
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        var v = obj[k];
        if (typeof v === 'object') { checkObj(v, path + '.' + k); }
        else if (typeof v === 'string' && v.indexOf(_BASE) !== 0) {
          console.warn('[icon-helper] Registry entry "' + path + '.' + k + '" does not use Streamline base: ' + v);
        }
      }
    }
    checkObj(ICON_REGISTRY, 'ICON_REGISTRY');
  })();

  /**
   * Get SVG file path by category and ID.
   * @param {string} category
   * @param {string} id
   * @returns {string} local SVG path
   */
  function getIconPath(category, id) {
    var cat = ICON_REGISTRY[category];
    if (cat && typeof cat === 'object' && id in cat) {
      return cat[id];
    }
    return ICON_REGISTRY.fallback.unknownPlugin;
  }

  /**
   * Get icon by dot-separated semantic path (e.g. 'navigation.home').
   * @param {string} semanticId
   * @returns {string} local SVG path
   */
  function getSemanticIconPath(semanticId) {
    var parts = String(semanticId || '').split('.');
    if (parts.length !== 2) return ICON_REGISTRY.fallback.unknownPlugin;
    return getIconPath(parts[0], parts[1]);
  }

  /**
   * Backward-compatible alias. Returns the SVG path.
   * Previous implementations returned a Unicode character; callers that
   * expected a character now receive an SVG path which should be embedded
   * via renderIcon() or iconImgTag().
   */
  function getSemanticIcon(semanticId) {
    return getSemanticIconPath(semanticId);
  }

  /**
   * Render a decorative or labelled icon as a safe <img> tag.
   * Preserves Streamline multicolor artwork - does NOT force currentColor.
   *
   * @param {string} semanticId   e.g. 'navigation.home'
   * @param {object} [options]
   * @param {boolean} [options.decorative=true]  aria-hidden when true
   * @param {string}  [options.label]            accessible label (requires decorative=false)
   * @param {string}  [options.className]        additional CSS class names
   * @param {number}  [options.size=24]          width/height in pixels
   * @returns {string} HTML img element string
   */
  function renderIcon(semanticId, options) {
    options = options || {};
    var iconPath    = getSemanticIconPath(semanticId);
    var isDecorative = options.decorative !== false;
    var label       = options.label || '';
    var className   = options.className ? (' class="' + options.className + '"') : '';
    var size        = options.size || 24;
    var attrs;

    if (isDecorative) {
      attrs = 'aria-hidden="true" focusable="false" alt=""';
    } else {
      attrs = 'alt="' + label.replace(/"/g, '&quot;') + '" role="img"';
    }

    return '<img src="' + iconPath + '" ' + attrs + ' width="' + size + '" height="' + size + '"' + className +
           ' style="display:inline;vertical-align:middle;flex-shrink:0;">';
  }

  /**
   * Convenience: return a ready-to-insert decorative <img> tag.
   * Size defaults to 20×20 for sidebar nav and action buttons.
   *
   * @param {string} semanticId  e.g. 'plugins.salesforceCaseExtractor'
   * @param {number} [size=20]
   * @returns {string} HTML img element string
   */
  function iconImgTag(semanticId, size) {
    var px = size || 20;
    var path = getSemanticIconPath(semanticId);
    return '<img src="' + path + '" aria-hidden="true" focusable="false" width="' + px + '" height="' + px +
           '" alt="" class="rc-icon" style="display:inline;vertical-align:middle;flex-shrink:0;">';
  }

  /**
   * Resolve a plugin icon field to an <img> tag.
   * Accepts a semantic ID (new style) or a legacy emoji (old style).
   * Never renders raw emoji or Unicode pictographs.
   *
   * @param {string} iconValue  semantic ID like 'plugins.tabSearch', or legacy emoji
   * @param {number} [size=20]
   * @returns {string} HTML img element string
   */
  function resolvePluginIconTag(iconValue, size) {
    if (!iconValue) {
      return iconImgTag('fallback.unknownPlugin', size);
    }
    // Semantic ID format: 'category.id' (no surrogate pairs, under 60 chars)
    if (iconValue.indexOf('.') !== -1 && iconValue.length < 60 && !/[\u{1F000}-\u{1FFFF}]/u.test(iconValue)) {
      return iconImgTag(iconValue, size);
    }
    // Legacy emoji - map to semantic ID then render
    var mapped = migrateLegacyEmoji(iconValue);
    if (mapped) return iconImgTag(mapped, size);
    // Unknown - use fallback
    return iconImgTag('fallback.unknownPlugin', size);
  }

  /**
   * Map legacy emoji values to semantic IDs (migration lookup only).
   * These are never rendered as emoji - they produce the Streamline fallback.
   */
  var LEGACY_EMOJI_MAP = {
    '\u2601\uFE0F': 'plugins.salesforceCaseExtractor',    // ☁️
    '\uD83D\uDD11': 'plugins.cloudabilityOrgId',           // 🔑
    '\uD83E\uDDE9': 'plugins.examplePlugin',               // 🧩
    '\uD83D\uDD16': 'plugins.edgeBookmarkFinder',          // 🔖
    '\uD83D\uDCC5': 'plugins.apptioUpgradeCalculator',     // 📅
    '\uD83D\uDC0D': 'plugins.snake',                       // 🐍
    '\u2609':       'plugins.workspaceStarter',            // ⊙
    '\uD83D\uDD0D': 'plugins.tabSearch',                   // 🔍
    '\uD83D\uDCDA': 'plugins.apptioDocsFinder',            // 📚
    '\uD83D\uDE80': 'documentation.gettingStarted',        // 🚀
    '\uD83C\uDFE0': 'navigation.home',                     // 🏠
    '\uD83C\uDFEA': 'navigation.marketplace',              // 🏪
    '\u2699\uFE0F': 'navigation.settings',                 // ⚙️
    '\uD83E\uDE7A': 'navigation.diagnostics',              // 🩺
    '\uD83D\uDD14': 'navigation.notifications',            // 🔔
    '\uD83D\uDCCB': 'navigation.activity',                 // 📋
    '\uD83D\uDDE4': 'navigation.backup',                   // 🗄
    '\uD83D\uDCD6': 'navigation.documentation',            // 📖
    '\uD83D\uDCBE': 'plugins.backupRestore',               // 💾
  };

  function migrateLegacyEmoji(emoji) {
    return LEGACY_EMOJI_MAP[emoji] || null;
  }

  /** Get all icons organized by category. */
  function getAllIcons() {
    return ICON_REGISTRY;
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  window.ReplyCatorsIconHelper = {
    getIconPath,
    getSemanticIconPath,
    getSemanticIcon,
    iconImgTag,
    resolvePluginIconTag,
    renderIcon,
    getAllIcons,
    migrateLegacyEmoji,
    ICON_REGISTRY,
  };

})();
