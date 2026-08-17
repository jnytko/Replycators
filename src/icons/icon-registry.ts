/**
 * Central Icon Registry — Streamline Ultimate Colors - Free
 *
 * NOTE: This TypeScript file is part of the inactive src/ architecture.
 * The ACTIVE runtime uses plugins/shared/icon-helper.js at root.
 *
 * This file is updated for policy compliance:
 * All icon values map to local Streamline Ultimate Colors — Free SVG paths.
 * No emoji, Unicode pictographs, or other icon packs are permitted.
 *
 * Official source: https://www.streamlinehq.com/icons/ultimate-colos-free
 * License: CC BY 4.0 — Attribution: Icons by Streamline (http://streamlinehq.com)
 *
 * Usage:
 *   import { getSemanticIconPath } from './icon-registry';
 *   const path = getSemanticIconPath('navigation.home');
 *   // Returns 'assets/icons/streamline-ultimate-colors-free/navigation/home.svg'
 *
 * Icon policy:
 *   All ReplyCators UI icons must use Streamline Ultimate Colors — Free through the
 *   local asset library, central semantic registry, and shared renderer.
 *   Lucide, Google Material, emoji, Unicode pictographs, text symbols, handwritten SVG,
 *   remote icons, icon fonts, and feature-local icon systems are prohibited.
 */

const BASE = 'assets/icons/streamline-ultimate-colors-free/';

export const ICON_REGISTRY = {
  // ─── Navigation ──────────────────────────────────────────────────────
  navigation: {
    home:          BASE + 'navigation/home.svg',          // Home-Dashboard
    plugins:       BASE + 'navigation/plugins.svg',       // Plugin-Manager (puzzle modules)
    marketplace:   BASE + 'navigation/marketplace.svg',   // Shop-Sign-Open (open shop door)
    settings:      BASE + 'navigation/settings.svg',      // Cog (classic gear)
    diagnostics:   BASE + 'navigation/diagnostics.svg',   // Network-Signal-Diagnostics
    notifications: BASE + 'navigation/notifications.svg', // Bell-Notification
    activity:      BASE + 'navigation/activity.svg',      // Activity-Log-Clock
    backup:        BASE + 'navigation/backup.svg',        // Server-Backup
    documentation: BASE + 'navigation/documentation.svg', // Book-Book-Pages
    reports:       BASE + 'navigation/reports.svg',       // Graph-Stats-Circle
  },

  // ─── Actions ─────────────────────────────────────────────────────────
  actions: {
    search:           BASE + 'actions/search.svg',
    refresh:          BASE + 'actions/refresh.svg',
    sync:             BASE + 'actions/sync.svg',
    syncLock:         BASE + 'actions/sync-lock.svg',
    toggleMenu:       BASE + 'actions/toggle-menu.svg',
    menu:             BASE + 'actions/menu.svg',
    copy:             BASE + 'actions/copy.svg',
    download:         BASE + 'actions/download.svg',
    upload:           BASE + 'actions/upload.svg',
    externalLink:     BASE + 'actions/external-link.svg',
    add:              BASE + 'actions/add.svg',
    remove:           BASE + 'actions/remove.svg',
    edit:             BASE + 'actions/edit.svg',
    filter:           BASE + 'actions/filter.svg',
    share:            BASE + 'actions/share.svg',
    delete:           BASE + 'actions/delete.svg',
    check:            BASE + 'actions/check.svg',
    checkSquare:      BASE + 'actions/check-square.svg',
    badgeCheck:       BASE + 'actions/badge-check.svg',
    expand:           BASE + 'actions/expand.svg',
    collapse:         BASE + 'actions/collapse.svg',
    expandWindow:     BASE + 'actions/expand-window.svg',
    shrinkWindow:     BASE + 'actions/shrink-window.svg',
    back:             BASE + 'actions/back.svg',
    forward:          BASE + 'actions/forward.svg',
    undo:             BASE + 'actions/undo.svg',
    tag:              BASE + 'actions/tag.svg',
    toggleOn:         BASE + 'actions/toggle-on.svg',
    attach:           BASE + 'actions/attach.svg',
    print:            BASE + 'actions/print.svg',
    zoomIn:           BASE + 'actions/zoom-in.svg',
    zoomOut:          BASE + 'actions/zoom-out.svg',
  },

  // ─── Status ──────────────────────────────────────────────────────────
  states: {
    success:     BASE + 'status/success.svg',
    warning:     BASE + 'status/warning.svg',
    error:       BASE + 'status/error.svg',
    info:        BASE + 'status/info.svg',
    infoCircle:  BASE + 'status/info-circle.svg',
    loading:     BASE + 'status/loading.svg',
    loadingHalf: BASE + 'utility/loading-half.svg',
    unavailable: BASE + 'status/unavailable.svg',
    working:     BASE + 'status/working.svg',
    pending:     BASE + 'status/pending.svg',
    broadcast:   BASE + 'status/broadcast.svg',
  },

  // ─── Appearance ──────────────────────────────────────────────────────
  appearance: {
    themeDark:     BASE + 'utility/theme-dark.svg',
    themeLight:    BASE + 'utility/theme-light.svg',
    sidePanelMode: BASE + 'utility/side-panel-mode.svg',  // Layout-Left
    popupMode:     BASE + 'utility/popup-mode.svg',       // App-Window-Two
  },

  // ─── Utility ─────────────────────────────────────────────────────────
  utility: {
    sendFeedback:    BASE + 'utility/paper-write.svg',
    // display-mode toggles — canonical IDs referenced by dashboard.html data-icon attributes
    sidePanelMode:   BASE + 'utility/side-panel-mode.svg',  // Browser-Page-Layout
    popupMode:       BASE + 'utility/popup-mode.svg',       // Expand-2
    calendar:        BASE + 'utility/calendar.svg',
    cloud:           BASE + 'utility/cloud.svg',
    cloudAdd:        BASE + 'utility/cloud-add.svg',
    cloudWarning:    BASE + 'utility/cloud-warning.svg',
    database:        BASE + 'utility/database.svg',
    databaseConnect: BASE + 'utility/database-connect.svg',
    diagnostics:     BASE + 'utility/diagnostics.svg',
    folder:          BASE + 'utility/folder.svg',
    hardDrive:       BASE + 'utility/hard-drive.svg',
    history:         BASE + 'utility/history.svg',
    layout:          BASE + 'utility/layout.svg',
    link:            BASE + 'utility/link.svg',
    monitor:         BASE + 'utility/monitor.svg',
    network:         BASE + 'utility/network.svg',
    person:          BASE + 'utility/person.svg',
    pin:             BASE + 'utility/pin.svg',
    refreshLock:     BASE + 'utility/refresh-lock.svg',
    server:          BASE + 'utility/server.svg',
    settingsSlider:  BASE + 'utility/settings-slider.svg',
    settingsSearch:  BASE + 'utility/settings-search.svg',
    stats:           BASE + 'utility/stats.svg',
    about:           BASE + 'utility/about.svg',
    user:            BASE + 'utility/user.svg',
    userChat:        BASE + 'utility/user-chat.svg',
    team:            BASE + 'utility/team.svg',
    usersGroup:      BASE + 'utility/users-group.svg',
    peopleSearch:    BASE + 'utility/people-search.svg',
    hierarchy:       BASE + 'utility/hierarchy.svg',
    orgChart:        BASE + 'utility/org-chart.svg',
    gauge:           BASE + 'utility/gauge.svg',
    stopwatch:       BASE + 'utility/stopwatch.svg',
    binoculars:      BASE + 'utility/binoculars.svg',
    calculator:      BASE + 'utility/calculator.svg',
    creditCard:      BASE + 'utility/credit-card.svg',
    megaphone:       BASE + 'utility/megaphone.svg',
    rss:             BASE + 'utility/rss.svg',
    toolbox:         BASE + 'utility/toolbox.svg',
    laptop:          BASE + 'utility/laptop.svg',
    appCode:         BASE + 'utility/app-code.svg',
    emailSend:       BASE + 'utility/email-send.svg',
    emailInbox:      BASE + 'utility/email-inbox.svg',
    emailSearch:     BASE + 'utility/email-search.svg',
    presentation:    BASE + 'utility/presentation.svg',
    todoList:        BASE + 'utility/todo-list.svg',
    idea:            BASE + 'utility/idea.svg',
    chatBubble:      BASE + 'utility/chat-bubble.svg',
    chatTyping:      BASE + 'utility/chat-typing.svg',
    officeDesk:      BASE + 'utility/office-desk.svg',
    power:           BASE + 'utility/power.svg',
  },

  // ─── Content ─────────────────────────────────────────────────────────
  content: {
    archive:     BASE + 'content/archive.svg',
    book:        BASE + 'content/book.svg',
    bookOpen:    BASE + 'content/book-open.svg',
    bookClosed:  BASE + 'content/book-closed.svg',
    checklist:   BASE + 'content/checklist.svg',
    document:    BASE + 'content/document.svg',
    note:        BASE + 'content/note.svg',
    notes:       BASE + 'content/notes.svg',
    penWrite:    BASE + 'content/pen-write.svg',
    fileAdd:     BASE + 'content/file-add.svg',
    fileEdit:    BASE + 'content/file-edit.svg',
    fileStack:   BASE + 'content/file-stack.svg',
    task:        BASE + 'content/task.svg',
    uploadNotes: BASE + 'content/upload-notes.svg',
  },

  // ─── Security ────────────────────────────────────────────────────────
  security: {
    key:         BASE + 'security/key.svg',
    lock:        BASE + 'security/lock.svg',
    unlock:      BASE + 'security/unlock.svg',
    shield:      BASE + 'security/shield.svg',
    shieldCheck: BASE + 'security/shield-check.svg',
    shieldLock:  BASE + 'security/shield-lock.svg',
  },

  // ─── Brands ──────────────────────────────────────────────────────────
  brands: {
    amazon:      BASE + 'brands/amazon.svg',
    apple:       BASE + 'brands/apple.svg',
    dropbox:     BASE + 'brands/dropbox.svg',
    github:      BASE + 'brands/github.svg',
    google:      BASE + 'brands/google.svg',
    googleDrive: BASE + 'brands/google-drive.svg',
    linkedin:    BASE + 'brands/linkedin.svg',
    microsoft:   BASE + 'brands/microsoft.svg',
  },

  // ─── Plugins – Built-in ────────────────────────────────────────────────
  plugins: {
    salesforceCaseExtractor: BASE + 'plugins/salesforce-case-extractor.svg', // Cloud-Data-Transfer
    cloudabilityOrgId:       BASE + 'plugins/cloudability-orgid.svg',        // Human-Resources-Hierarchy-Man
    edgeBookmarkFinder:      BASE + 'plugins/edge-bookmark-finder.svg',      // Bookmarks-Document
    apptioUpgradeCalculator: BASE + 'plugins/apptio-upgrade-calculator.svg', // Analytics-Board-Graph-Line
    apptioDocsFinder:        BASE + 'plugins/apptio-docs-finder.svg',        // Book-Search
    workspaceStarter:        BASE + 'plugins/workspace-starter.svg',         // Launch-Go
    tabSearch:               BASE + 'plugins/tab-search.svg',                // Network-Search
    snake:                   BASE + 'plugins/snake.svg',                     // Chess-Knight
    examplePlugin:           BASE + 'plugins/example-plugin.svg',            // App-Window-Code (code template window — distinct from Plugin Manager's Module-Puzzle)
    backupRestore:           BASE + 'plugins/backup-restore.svg',            // Server-Refresh-1
  },

  // ─── Documentation ─────────────────────────────────────────────────────
  documentation: {
    gettingStarted:  BASE + 'navigation/documentation.svg',
    troubleshooting: BASE + 'navigation/diagnostics.svg',
    releaseNotes:    BASE + 'content/checklist.svg',
    feature:         BASE + 'utility/stats.svg',
  },

  // ─── Fallback ──────────────────────────────────────────────────────────
  fallback: {
    unknownPlugin: BASE + 'plugins/unknown.svg',
    construction:  BASE + 'status/warning.svg',
  },
} as const;

/**
 * Resolve a semantic icon dot-path to a local Streamline SVG path.
 *
 * @param semanticId - Dot-separated semantic ID like 'navigation.home'
 * @returns Local SVG path or fallback path
 *
 * @example
 *   getSemanticIconPath('navigation.home')
 *   // → 'assets/icons/streamline-ultimate-colors-free/navigation/home.svg'
 */
export function getSemanticIconPath(semanticId: string): string {
  const parts = semanticId.split('.');
  if (parts.length !== 2) {
    return ICON_REGISTRY.fallback.unknownPlugin;
  }
  const [category, id] = parts;
  const cat = (ICON_REGISTRY as Record<string, Record<string, string>>)[category];
  if (cat && id in cat) {
    return cat[id];
  }
  return ICON_REGISTRY.fallback.unknownPlugin;
}

/** @deprecated Use getSemanticIconPath instead. */
export const getIcon = getSemanticIconPath.bind(null);

/** Get all icon paths organized by category. */
export function getAllIcons() {
  return ICON_REGISTRY;
}
