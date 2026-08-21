# ReplyCators - Architecture Documentation

> **Active runtime:** The root flat-deployment (`dashboard.html`, `dashboard.js`, `plugins/*.js`, `background.js`).
> The TypeScript `src/` layer described in the Component Descriptions section below is **inactive scaffolding**
> for a future migration (RC-015 Phase 2). Editing `src/` files has **no effect on the running extension**.
> See `AGENTS.md §3 Dual Implementation Map` and `ADR-002`.

## Sections

- Overview
- Architectural principles
- Layer architecture
- Component descriptions
- Platform views
- Left navigation structure
- Feedback handoff
- Plugin descriptions
- Plugin lifecycle
- Event flow
- Logging
- Notifications
- Design system
- Plugin isolation
- Messaging
- Storage schema
- Session persistence
- Adding a new plugin

---

## Overview

ReplyCators is a **plugin-based Microsoft Edge Extension platform** built on Manifest V3. The active popup runtime is a root-level flat deployment composed of `dashboard.html`, `dashboard.js`, and plugin runtime modules under `plugins/`.

Platform is generic. Domain-specific behavior lives in plugin modules that self-register on `window.ReplyCatorsPlugins`, while `dashboard.js` provides orchestration and shared services.

---

## Architectural principles

| Principle | Implementation |
|-----------|----------------|
| Single Responsibility | Each module has one reason to change |
| Open/Closed | Platform is open for extension (plugins) but closed for modification |
| Liskov Substitution | All plugins satisfy the `IPlugin` interface contract |
| Interface Segregation | Plugins receive `PlatformServices` - use only what they need |
| Dependency Inversion | Plugins depend on abstractions, not concrete implementations |

---

## Layer architecture

```
PLUGINS LAYER:   SalesforceExtractor | CloudabilityOrgId | ExamplePlugin
                 EdgeBookmarkFinder  | ApptioUpgradeCalculator | WorkspaceStarter
                        uses
SDK LAYER:       PluginBase | IPlugin | PluginContext | Types
                        depends on
PLATFORM LAYER:  PluginLoader | PluginRegistry | PluginManager
                        depends on
CORE LAYER:      EventBus | StorageManager | Logger | NotificationCenter
                 SettingsManager | MessagingService | DiagnosticsCenter
```

---

## Component descriptions

### Core Layer (src/core/) - INACTIVE - future TypeScript migration only

> These files exist as scaffolding for RC-015 Phase 2. They are **not loaded by the active runtime**.
> The active equivalents are implemented inline in `dashboard.js` and `plugins/*.js`.
> The v1.47.10 hardening pass added runtime validation, asynchronous error containment,
> transactional lifecycle state changes, and verified packaged-asset paths to this scaffold.

| Component | File | Purpose (planned) |
|-----------|------|---------|
| EventBus | `events/EventBus.ts` | Pub/sub event system. Tracks up to 500 events. |
| StorageManager | `storage/StorageManager.ts` | Namespaced Chrome storage wrapper. |
| Logger | `logging/Logger.ts` | Structured leveled plugin-scoped logging. 2000-entry ring buffer. |
| NotificationCenter | `notifications/NotificationCenter.ts` | Toast + notification history. 200-entry history. |
| SettingsManager | `settings/SettingsManager.ts` | Plugin settings with schema + sync storage. |
| MessagingService | `messaging/MessagingService.ts` | Unified Chrome runtime messaging abstraction. |
| DiagnosticsCenter | `diagnostics/DiagnosticsCenter.ts` | Health monitoring, storage usage, browser info. |

### Platform Layer (src/platform/) - INACTIVE - future TypeScript migration only

| Component | File | Purpose (planned) |
|-----------|------|---------|
| PluginRegistry | `registry/PluginRegistry.ts` | Manifests, health, capabilities. |
| PluginLoader | `loader/PluginLoader.ts` | Factory-based instantiation, lifecycle orchestration. |
| PluginManager | `manager/PluginManager.ts` | Enable/disable persistence, startup initialization. |
| Bootstrap | `bootstrap.ts` | Initializes all services; imports plugin registrations. |

### SDK Layer (src/sdk/) - INACTIVE - future TypeScript migration only

| File | Purpose (planned) |
|------|---------|
| `types.ts` | All TypeScript interfaces. Plugin contract. |
| `PluginBase.ts` | Abstract base class with lifecycle defaults. |
| `index.ts` | Public exports. |

### Popup Runtime (dashboard.html + plugins/*.js + dashboard.js)

| Component | Purpose |
|-----------|---------|
| `dashboard.html` | Full popup HTML shell. All views and plugin containers pre-declared. |
| `dashboard.js` | Application shell and orchestrator. Owns startup, plugin registry, navigation, settings, visibility/order, diagnostics, logging, and notifications. |
| `plugins/` | Runtime plugin implementations. Each self-registers on `window.ReplyCatorsPlugins`. |

---

## Platform views

| View | data-view ID | Nav section | Description |
|------|-------------|------------|-------------|
| Dashboard | `dashboard` | Core | Overview: stats, widgets, quick actions |
| Plugin Manager | `plugins` | Plugins | Enable/disable/reorder installed plugins |
| Marketplace | `marketplace` | Plugins | Preview of planned future plugins |
| Options | `settings` | Utility | Appearance, accessibility, notification, plugin options |
| Send Feedback | `feedback` | Utility | Prepares a mailto draft; no direct email sending |
| Notifications Center | `notifications` | Utility | Grouped view: Notifications tab + Activity tab |
| Maintenance Center | `maintenance` | Utility | Grouped view: Diagnostics tab + Backup & Restore tab |
| Documentation | `documentation` | Utility | In-extension Help - `plugins/documentation.js` |

> `navigateTo('diagnostics')` and `navigateTo('backup-restore')` are compat redirects that resolve to `maintenance` and activate the corresponding tab.
> `navigateTo('activity')` resolves to `notifications` and activates the Activity tab.

---

## Left navigation structure

```
[ Core ]
  Dashboard (Home)

[ Plugins ]  (section divider + "Plugins" heading)
  Plugin Manager
  Marketplace
  Installed (collapsible toggle)
    #rc-plugin-nav-items - injected by applyPluginVisibility()

[ spacer ]

[ Utility ]  (rc-nav__divider + "Utility" heading)
  Options              (data-view="settings" - label renamed in v1.32.0)
  Send Feedback
  Notifications Center (tabs: Notifications, Activity)
  Maintenance Center   (tabs: Diagnostics, Backup & Restore)
  Documentation
```

Nav rules:
- New primary landing views belong in **Core** (keep small)
- Plugin management or functionality belongs in **Plugins**
- Configuration, health, support, administration belongs in **Utility**
- Plugin-contributed items always appear in `#rc-plugin-nav-items` - never in Utility
- Options always precedes Notifications Center in Utility (canonical ordering rule)
- The "Options" nav label maps to `data-view="settings"` - do not change the route ID
- **Information Architecture Grouping Rule:** features sharing the same user goal are grouped under one named destination. Diagnostics and Backup & Restore share a maintenance workflow - they are tabs in Maintenance Center, not separate top-level items. Adding a new administrative feature - evaluate Maintenance Center first.

Sidebar right-edge divider (RC-NAV-BDR001 v3): `.rc-sidebar::after` is an absolutely positioned pseudo-element (`position:absolute; right:0; top:0; bottom:0; width:1px; background:var(--rc-border); z-index:9; pointer-events:none`). Do NOT restore `border-right` on `.rc-sidebar` - the pseudo-element replaced it because `border-right` was covered by the WebKit custom scrollbar track in popup collapsed mode.

---

## Feedback handoff

The feedback workflow uses **no backend or direct email transport**.

- Recipients are configured in `dashboard.html` (`#feedback-recipients` or equivalent hardcoded `mailto:` target) - **not** in `src/popup/feedback-config.ts`, which is an inactive TypeScript stub
- The mail handoff uses a `mailto:` URI with To recipients, subject, user message, and a plain-text diagnostic summary
- ReplyCators never sends email directly and cannot confirm delivery
- The downloadable diagnostics report is generated only after explicit user action and must be attached manually
- Sensitive payloads are not included in the mailto payload

---

## Plugin descriptions

| Plugin | Version | Description |
|--------|---------|-------------|
| Salesforce Case Extractor | 4.12.4 | Extracts Salesforce case data from Lightning pages. Multi-signal detection, field cleanup, feed posts, content script: `sf-content.js` |
| Cloudability OrgID | 4.0.5 | Background enrichment service. Resolves OrgID via proactive push (MAIN-world XHR intercept) or pull (SPA navigation). 24h TTL cache, exponential retry. No-erase policy on failure. |
| Edge Bookmark Finder | 1.0.3 | Searches Microsoft Edge bookmarks. Recursive scan, real-time multi-word search, domain analytics, duplicate detection. |
| Apptio Planning Upgrade Calculator | 1.0.3 | Calculates upgrade dates. Dynamic release discovery via IBM Community. Three-tier retrieval: live fetch, 24h cache, bundled fallback. |
| Workspace Starter | 2.0.3 | Named workspace profile launcher. Profile CRUD, favorites, categories, recents, tab grouping, import/export. |
| Tab Search | 1.0.1 | Instant browser tab search. Live query, search, sort, group-by-domain, duplicate detection, per-tab actions. No persistent storage. |
| Snake | 1.0.2 | Classic retro Snake game. Plugin-owned rendering and high score persistence. High score notification on new record. |
| Example Plugin | 1.0.2 | Canonical reference implementation. Demonstrates complete plugin lifecycle. |
| Apptio Documentation Finder | 1.0.3 | IBM Docs search for Apptio products. Fetches `ibm.com/docs/api/v1/products`. Favorites, recent searches, quick links. |
| Quick Note Pad | 1.0.0 | Persistent multi-tab notepad. Up to 5 named tabs, auto-save, copy, .txt export, monospace mode. |
| Jira & Confluence Smart Search Hub | 1.0.0 | Unified smart-search hub. Detects Jira keys, URLs, Confluence paths, and free-text queries. Recent history per product. |
| Environment Dashboards Launcher | 1.4.0 | Launches Splunk and Grafana dashboards for customer environments. Auto-resolves Namespace, Cluster, Region, and AWS datasource. Persists last-used environment across sessions. Favorites and recents fields exist in storage but are not yet surfaced in the UI (planned). |

---

## Plugin lifecycle

```
PluginLoader.register(factory)
  → factory stored
  → (on startup) PluginLoader.load(id)
      → factory() → new PluginInstance
      → buildContext(manifest) (PlatformServices + Registration methods)
      → plugin.initialize(context)
      → PluginRegistry.register(manifest)
      → health.status = 'active'
```

---

## Event flow

```
Plugin A → EventBus.emit('my-event', data)
         → EventBus distributes
              → Plugin B handler (subscribed via context.events.on)
              → Dashboard UI handler (subscribed via EventBus.on)
```

All platform-level events use `PlatformEvents` constants. All Cloudability events use `CloudabilityOrgIdEvents` constants.

---

## Logging

Approved APIs:
- TypeScript architecture: `services.logger.debug/info/warn/error()`
- Flat runtime: `ReplyCatorsApp.addLog(level, pluginId, message)`

| Level | Use |
|---|---|
| `debug` | Internal diagnostics, low-signal events |
| `info` | Normal operation, state transitions |
| `warning` | Recoverable issues, degraded operation |
| `error` | Failed operations requiring attention |

Forbidden: `console.log`, `console.warn`, `console.error`, `console.debug` in runtime code.

---

## Notifications

Approved APIs:
- TypeScript: `services.notifications.show()`
- Flat runtime: `ReplyCatorsApp.showToast()`

Allowed types: `success` | `info` | `warning` | `error`

Forbidden: plugin-owned toast containers, custom notification colors or animation systems.

---

## Design system

Approved shared CSS classes:
- Page headers: `.rc-view__header`, `.rc-view__title`, `.rc-view__subtitle`
- Sections: `.rc-section-block`
- Buttons: `.rc-btn`, `.rc-btn--primary`, `.rc-btn--secondary`, `.rc-btn--ghost`, `.rc-btn--danger`
- Forms: `.rc-form-group`, `.rc-label`, `.rc-input`, `.rc-textarea`, `.rc-helper-text`
- Status/badges: `.rc-status`, `.rc-badge`, `.rc-tag`
- Empty states: `.rc-empty-state`, `.rc-empty-state__title`, `.rc-empty-state__body`

Layout standards:
- Titles and subtitles present for every top-level platform view
- Primary actions at top-right or end of relevant toolbar
- Filters/search grouped into a single filter/action row
- Empty, loading, and error states explicit and styled with shared classes

---

## Plugin isolation

Each plugin receives:
- Storage namespace: `rc:plugin:<pluginId>:*` - cannot access other plugins' data
- Scoped logger: log entries tagged with plugin ID
- Scoped settings: `rc:settings:<pluginId>:*`
- Private service instances: no shared mutable state

Plugins communicate with each other **only** through the EventBus.

---

## Messaging

```
Popup/Dashboard → MessagingService → Content Script
Background SW   → MessagingService → Page (MAIN world)
```

`MessagingService` is the single gatekeeper for all `chrome.runtime` messaging. Plugins never call Chrome APIs directly (TypeScript architecture).

---

## Storage schema

| Namespace | Storage area | Purpose |
|---|---|---|
| `rc:platform:*` | local | Platform state |
| `rc:plugin:<id>:*` | local | Plugin-specific data |
| `rc:settings:<id>:*` | sync | Plugin settings |
| `rc:session:*` | local | Dashboard session state |

Session keys (`rc:session:*`): see `docs/STORAGE.md` for the full schema.

---

## Session persistence

```
Popup opens → restoreSession() (single chrome.storage.local.get for all keys)
  → merges logs/notifications (deduplicated by ID)
  → stages: SF result, nav view, SF settings
  → init* functions run using restored state
  → navigateTo(lastView)

On every mutation:
  addLog()            → persistLogs()         (debounced 300 ms)
  addNotification()   → persistNotifs()       (debounced 300 ms)
  runExtraction()     → persistSfResult()     (immediate)
  navigateTo()        → persistNavView()      (immediate)
  toggle plugin       → persistPluginStates() (immediate)
  SF settings change  → persistSfSettings()  (immediate)
```

---

## Adding a new plugin

1. Create plugin module under `plugins/` as a plain IIFE
2. Self-register on `window.ReplyCatorsPlugins`
3. Add metadata entry to `PLUGINS[]` in `dashboard.js`
4. Add view container and widget card to `dashboard.html`
5. Load module **before** `dashboard.js` in `dashboard.html` (load order is architecture-critical)
6. Call `init()` and optional hooks from `DOMContentLoaded` block in `dashboard.js`
7. Use `window.ReplyCatorsApp` for all shared platform services

Nav buttons are injected automatically by `applyPluginVisibility()`. Do NOT add a static nav button to `dashboard.html`.

See `docs/AI-PLUGIN-KIT.md` for the full workflow.
