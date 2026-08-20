# ReplyCators - Agent & Contributor Briefing

> Authoritative project briefing. Loaded into every Bob session automatically.
> Read in full before starting any task.

## Sections

- [Runtime Locations](#runtime-locations)
- [1. Project Overview](#1-project-overview)
- [2. Critical Rules](#2-critical-rules)
- [3. Active Runtime Architecture](#3-active-runtime-architecture)
- [4. Repository Structure](#4-repository-structure)
- [5. Source of Truth Matrix](#5-source-of-truth-matrix)
- [6. Architecture Decisions (ADRs)](#6-architecture-decisions-adrs)
- [7. State Management Rules](#7-state-management-rules)
- [8. Plugin Architecture](#8-plugin-architecture)
- [9. Storage Architecture](#9-storage-architecture)
- [10. Common Change Guide](#10-common-change-guide)
- [11. Governance Rules](#11-governance-rules)
- [12. Versioning Rules](#12-versioning-rules)
- [13. Repository Hygiene](#13-repository-hygiene)
- [13-A. Runtime-First Policy](#13-a-runtime-first-policy)
- [14. Breaking Change Process](#14-breaking-change-process)
- [15. AI Agent Workflow](#15-ai-agent-workflow)
- [16. QA Requirements](#16-qa-requirements)
- [17. Release Process](#17-release-process)
- [18. Technical Debt Register](#18-technical-debt-register)
- [19. Long-Term Architecture Direction](#19-long-term-architecture-direction)
- [20. Related Projects](#20-related-projects)
- [21. Maintenance Requirements](#21-maintenance-requirements)
- [22. Priority Framework](#22-priority-framework)
- [23. Documentation Map](#23-documentation-map)
- [23-A. Documentation Maintenance Rules](#23-a-documentation-maintenance-rules)
- [24. Known Limitations](#24-known-limitations)
- [25. Extension Compatibility Rules](#25-extension-compatibility-rules)
- [26. Testing Strategy](#26-testing-strategy)
- [27. Documentation Accessibility Standard](#27-documentation-accessibility-standard)
- [28. ASCII Punctuation Standard](#28-ascii-punctuation-standard)

---

## Runtime Locations

> Non-negotiable. Do NOT install anything inside this repository as a default step.

| Runtime | Location |
|---------|----------|
| Node / npm / tsc / Webpack / ESLint | `[root]\Runtime\NodeJS` |
| Git | `[root]\Runtime\Git` |
| Python | `[root]\Runtime\Python` |
| Java / JDK | `[root]\Runtime\Java` |
| Shared tools | `[root]\Runtime\Tools` |

**Do NOT run `npm install` / `npm ci` / `yarn install` inside this repository. See [§ 13-A](#13-a-runtime-first-policy).**

---

## 1. Project Overview

| Property | Value |
|----------|-------|
| Working directory | `[root]\WatsonX\ReplyCators\` |
| Extension version | **1.47.7** |
| Release status | **Production** |

ReplyCators is a plugin-hosting Microsoft Edge extension (Manifest V3). A single dashboard UI hosts multiple plugins. The platform provides shared navigation, settings, storage, notifications, logging, and plugin lifecycle management. Plugins provide business functionality.

### File Selection Cheat Sheet

| Task | Edit this file |
|------|---------------|
| Dashboard layout | `dashboard.html` |
| Dashboard behavior | `dashboard.js` |
| Background processing | `background.js` |
| Plugin logic | `plugins/<plugin>.js` |
| Shared styling | `styles/platform.css` |
| Dashboard-specific styling | `styles/dashboard.css` |
| Storage ownership | § 5 Source of Truth Matrix |
| New plugin registration | `PLUGINS[]` in `dashboard.js` |

### Ownership Model

| Owner | Owns |
|-------|------|
| `dashboard.js` | Platform orchestration |
| `background.js` | Background services, Chrome event handling |
| `plugins/*.js` | Plugin-specific functionality |
| `styles/platform.css` | Shared design tokens, layout primitives |
| `styles/dashboard.css` | Dashboard-specific styling |

Plugin functionality that is shared by multiple plugins belongs in platform-level code. Functionality used by only one plugin belongs in that plugin.

### Architecture Invariants

These must remain true at all times:

1. Root files are the runtime.
2. `chrome.storage.local` is the primary persistence layer.
3. `dashboard.js` is the application orchestrator.
4. Plugin IDs are permanent.
5. Popup and Side Panel share the same implementation.
6. Plugin order comes only from `rc:session:dashboard-order`.
7. Platform logging and notifications are mandatory.
8. Plugin functionality must remain modular and self-contained.

### Common AI Agent Mistakes

- Editing `src/` expecting live behavior
- Editing `dist/` directly
- Adding manual navigation buttons
- Creating a second settings store
- Creating custom notification or logging systems
- Introducing a second ordering mechanism
- Adding plugin-to-plugin coupling

---

## 2. Critical Rules

> Creating, migrating, or maintaining a plugin? Start with **`docs/AI-PLUGIN-KIT.md`**.

1. **Active extension loads from the repository ROOT** - not `src/` and not `dist/`.
2. **Do NOT edit `src/popup/dashboard.ts`** to change the dashboard. Active popup is `dashboard.html` + `dashboard.js` at root.
3. **Do NOT edit `src/background/service-worker.ts`** as the live background worker. Live worker is `background.js` at root.
4. **Root files are hand-maintained.** After any root-level change, copy the file to `dist/` to keep the mirror in sync.
5. **A task is NOT complete until:** code works, version numbers updated everywhere, `CHANGELOG.md` updated, all documentation updated, and `AGENTS.md` reflects current state.
6. **NEVER create directories beginning with `__`.** Edge and Chrome refuse to load extensions with `__`-prefixed folders. Use `tests/`, `mocks/`, `fixtures/` instead.

---

## 3. Active Runtime Architecture

### Icon System - Two-Tier Policy

> Mandatory. Enforced as an architecture rule. Do not mix tiers.

**Tier 1 - Feature Icons - Streamline Ultimate Colors Free**

Use for: primary features, navigation destinations, plugin identity icons, status indicators.

- Source: `assets/icons/streamline-ultimate-colors-free/`
- Registry: `plugins/shared/icon-helper.js` - `ICON_REGISTRY`
- Renderer: `window.ReplyCatorsIconHelper.renderIcon(semanticId, options)`
- Attribution: `Icons by Streamline (http://streamlinehq.com)` - CC BY 4.0

Mandatory workflow for every new Tier-1 icon:

1. Search `ICON_REGISTRY` in `plugins/shared/icon-helper.js` for an existing match.
2. Search `assets/icons/streamline-ultimate-colors-free/` for an existing local file.
3. Reuse an existing semantic ID if the concept matches.
4. Add a new semantic ID only for a genuinely new concept.
5. Obtain assets only from Streamline Ultimate Colors Free (CC BY 4.0). Confirm free set membership.
6. Store under `assets/icons/streamline-ultimate-colors-free/`.
7. Record in `assets/icons/streamline-ultimate-colors-free/icon-manifest.json`.
8. Preserve CC BY 4.0 attribution in `THIRD_PARTY_NOTICES.md` and `ICON-LICENSE.md`.
9. Verify `aria-hidden="true"` (decorative) or meaningful `aria-label` (interactive).
10. Verify asset is present in `dist/` after running `node build/sync-root.js`.

**Tier 2 - UI Control Symbols - Native/System Unicode**

Use for: navigation controls, inline interface actions.

| Symbol | Meaning |
|--------|---------|
| `☰` | Hamburger / toggle sidebar |
| `↺` | Refresh / reload |
| `↗` | Open in new tab |
| `⊟` | Open in side panel |
| `⤢` | Pop out / popup mode |
| `←` `→` | Back / Forward |
| `×` | Close |
| `›` `‹` | Expand / Collapse |
| `⧉` | Copy |
| `↓` | Download |

**Icon Uniqueness Rule:** Every primary feature, plugin, or navigation destination must have its own unique semantic icon. Do not assign the same icon to multiple unrelated features.

**Prohibited (architecture violation):**

- Tier-1 icons for Tier-2 controls (SVG for close/refresh button)
- Tier-2 symbols for Tier-1 destinations (emoji for nav item)
- Lucide, Google Material, Font Awesome, or any other icon pack
- Remote icon URLs or CDN-hosted icons
- Icon fonts
- Feature-local icon systems or private plugin icon registries
- Handwritten / bespoke SVG paths as product icons
- Reusing an icon already used by a different unrelated feature

### Information Architecture Grouping Rule

> Mandatory. Enforced as an architecture and design rule.

Group features sharing the same user goal under one named navigation destination. Current groupings:

| Destination | Tabs | Rationale |
|-------------|------|-----------|
| Notifications Center | Notifications, Activity | Single monitoring workflow |
| Maintenance Center | Diagnostics, Backup & Restore | Single maintenance workflow |

**Forbidden:** Separate top-level nav destinations for features serving the same underlying task. Adding a new administrative feature - evaluate Maintenance Center first.

### Shared Feature Area Layout Rule

> Mandatory. Enforced as a design system rule.

All sub-views inside one feature area must share layout, interaction model, visual hierarchy, spacing, and component usage.

| Element | Requirement |
|---------|-------------|
| Page header | One `rc-view__header` per feature area - not per tab |
| Tab navigation | One `rc-unified-tabs` row - identical look, identical ARIA pattern |
| Section header | Every tab must have `.rc-ops-section-header` row |
| Toolbar | Every tab with controls must use `.rc-activity-toolbar` |
| Scroll container | Same `max-height` and `overflow-y:auto` across all tabs |
| Empty state | All tabs use `.rc-ops-empty` |
| Button sizing | All toolbar buttons must be `rc-btn--sm` |

**Shared CSS tokens:**
```
.rc-ops-section-header        - tab-level section label row
.rc-ops-section-header__label - uppercase muted section label
.rc-ops-section-header__count - pill badge for entry count
.rc-ops-scroll                - shared scrollable container (max-height:440px)
.rc-ops-empty                 - unified empty / loading state
.rc-activity-toolbar          - shared filter/action toolbar row
```

**Prohibited:**
- Tab-specific CSS classes duplicating shared tokens
- Inline `style="display:none"` - use `hidden` attribute and CSS classes
- Different `max-height` or scroll boundaries per tab
- Action buttons full-size in one tab and small in another

### Dual Implementation Map

| Component | Root (ACTIVE) | src/ (INACTIVE) |
|-----------|---------------|-----------------|
| Background worker | `background.js` | `src/background/service-worker.ts` |
| Dashboard popup | `dashboard.html` + `dashboard.js` | `src/popup/dashboard.html` + `src/popup/dashboard.ts` |
| Options page | `options.html` | `src/popup/options.html` |
| CSS | `styles/` | `src/assets/styles/` (removed - stale scaffold deleted) |
| Content scripts | `plugins/salesforce/content/sf-content.js`, `plugins/cloudability/content/cloudability-*.js` | `src/plugins/*/content/*.js` |
| Plugins | `plugins/*.js` | `src/plugins/*/index.ts` (stubs) |

`manifest.json` declares `background.js` as service_worker and `dashboard.html` as action popup - both at root.

### All Active Entry Points

| File | Purpose |
|------|---------|
| `background.js` | Background service worker: OrgID, context menus, message routing |
| `dashboard.html` | Main popup/side-panel UI shell |
| `dashboard.js` | Application orchestrator: startup, services, navigation, settings, plugin registry, ordering |
| `options.html` | Options page (redirect to dashboard settings) |
| `styles/platform.css` | CSS variables, themes, layout primitives - authoritative root source |
| `styles/dashboard.css` | Dashboard-specific component styles - authoritative root source |

### Design System, Logging, and Notification Governance

- **UI/UX Design System is mandatory.** New screens and plugins must use shared ReplyCators layout primitives.
- **Platform logging is mandatory.** Use `ReplyCatorsApp.addLog()` in flat runtime. Do NOT use `console.log`, `console.warn`, `console.error`, or `console.debug`.
- **Platform notifications are mandatory.** Use `ReplyCatorsApp.showToast()`. Do NOT create custom toast renderers in plugins.
- **Severity vocabulary is fixed.** Log levels: `debug`, `info`, `warning`, `error`. Notification types: `success`, `info`, `warning`, `error`.
- **Definition of done:** A plugin is incomplete if it introduces a custom visual language, custom spacing scale, custom toast system, custom logger, or inconsistent action placement.

---

## 4. Repository Structure

> Root directory policy: Only runtime entry points, build entry points, and repository governance files belong at root. Everything else belongs in a subfolder.

```
[root]\WatsonX\ReplyCators\
|
+-- AGENTS.md                        <- This file - authoritative briefing
+-- CHANGELOG.md                     <- All release history
+-- README.md                        <- Project overview
+-- manifest.json                    <- Extension manifest (MV3) - ACTIVE
+-- package.json / package-lock.json / tsconfig.json
|
+-- FLAT-DEPLOYMENT FILES (ACTIVE)
+-- background.js                    <- Active background service worker
+-- dashboard.html                   <- Active popup HTML
+-- dashboard.js                     <- Active popup/dashboard controller
+-- options.html                     <- Active options page
|
+-- styles/                          <- Active CSS (platform.css, dashboard.css)
+-- assets/icons/                    <- Active extension icons (icon16/48/128.png)
|
+-- build/                           <- Build scripts
|   +-- webpack.config.js
|   +-- sync-root.js                 <- Postbuild root <-> dist/ sync (RC-015)
|   +-- package.js                   <- ZIP packaging script
|   +-- gen_icons.js / create_icons.html
|
+-- plugins/                         <- Plugin runtime modules + plugin-owned data
|   +-- *.js                         <- Plugin runtime modules (one per plugin)
|   +-- shared/                      <- Shared plugin utilities (icon-helper.js)
|   +-- salesforce/content/          <- Salesforce content script
|       +-- sf-content.js            <- Active Salesforce content script (canonical source)
|   +-- cloudability/content/        <- Cloudability content scripts
|   +-- apptio-upgrade-calculator/   <- Apptio Upgrade Calculator plugin-owned data
|       +-- apptio-schedule.json     <- Fallback upgrade schedule (canonical source)
|
+-- tools/                           <- Developer utilities (not loaded by extension)
|   +-- bob-helper-server.js         <- Bob Helper HTTP server (required for SF Execute)
|   +-- bob-launcher-template.ps1    <- PowerShell launcher template
|   +-- bob-helper.ps1               <- PowerShell management script (check/start/stop/status/install/uninstall)
|   +-- create-plugin.js             <- Optional plugin scaffolding generator
|
+-- dist/                            <- Extension runtime mirror (tracked)
|       SCOPE: Runtime files ONLY. No docs, no package metadata.
|
+-- src/                             <- TypeScript source (INACTIVE - compiles to dist/)
+-- docs/                            <- All documentation
    +-- AI-PLUGIN-KIT.md             <- Primary guide for AI agents (plugin tasks)
    +-- ARCHITECTURE.md              <- Full architecture reference
    +-- DEVELOPER_GUIDE.md           <- Plugin authoring guide
    +-- plugins/                     <- Per-plugin engineering docs
    +-- reports/                     <- Audit reports (archive)
```

---

## 5. Source of Truth Matrix

> One authoritative source per state value. Reading or writing elsewhere is a defect.

| State | Authoritative source | Storage key |
|-------|---------------------|-------------|
| All platform settings | `chrome.storage.local` | `rc:session:app-settings` |
| Active theme | `appSettings.theme` (in-memory) | `rc:session:app-settings` |
| Extension launch mode | `appSettings.defaultLaunchMode` (in-memory) | `rc:session:app-settings` |
| Popup window size preset | `appSettings.popupSize` (in-memory) | `rc:session:app-settings` |
| Popup custom width (px) | `appSettings.popupCustomWidth` (in-memory) | `rc:session:app-settings` |
| Popup custom height (px) | `appSettings.popupCustomHeight` (in-memory) | `rc:session:app-settings` |
| Plugin enabled/disabled | `chrome.storage.local` | `rc:session:plugin-states` |
| Plugin order (ALL surfaces) | `chrome.storage.local` | `rc:session:dashboard-order` |
| Notification history | `notifStore[]` (in-memory) | `rc:session:notifications` (ring buffer, 100 max) |
| Activity log | `logStore[]` (in-memory) | `rc:session:logs` (ring buffer, 500 max) |
| Last active view | `chrome.storage.local` | `rc:session:nav-view` |
| Last SF extraction result | `chrome.storage.local` | `rc:session:sf-last-result` |
| Salesforce plugin settings | `chrome.storage.local` | `rc:session:sf-settings` |
| Salesforce post sort preference | `document.getElementById('sf-post-sort').value` (in-memory) | `rc:session:sf-settings` (field `postSort` inside sf-settings object) |
| Bob Working Directory | `appSettings`-derived `sfSettings.bobWorkingDir` (in-memory) | `rc:session:sf-settings` (field inside sf-settings object) |
| BobShell 2.0 API key | `_committedBobApiKey` (in-memory) | `rc:session:sf-settings` (field `bobApiKey` inside sf-settings object) |
| Bob 1.0 mode (API key not required) | `_bobUseBob1` (in-memory) | `rc:session:sf-settings` (field `bobUseBob1` inside sf-settings object) |
| Cloudability OrgID cache | `chrome.storage.local` | `rc:plugin:com.replycators.cloudability-orgid:orgid-cache` - **never erased on failure** |
| Edge Bookmark prefs | `chrome.storage.local` | `rc:plugin:com.replycators.edge-bookmark-finder:prefs` |
| Edge Bookmark scan cache | `chrome.storage.local` | `rc:plugin:com.replycators.edge-bookmark-finder:last-scan` |
| Apptio Upgrade schedule | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache` (24h TTL) |
| Apptio Upgrade user selections | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc` |
| Workspace Starter data | `chrome.storage.local` | `rc:plugin:com.replycators.workspace-starter:data` (single composite key) |
| Snake high score | `chrome.storage.local` | `rc:plugin:com.replycators.snake:state` |
| Apptio Docs Finder sources | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:sources` |
| Apptio Docs Finder quick links | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:quick-links` |
| Apptio Docs Finder recent searches | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:recent-searches` (max 20) |
| Apptio Docs Finder recently opened | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:recently-opened` (max 30) |
| Apptio Docs Finder favorites | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:favorites` (max 50) |
| Apptio Docs Finder settings | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:settings` |
| Apptio Docs Finder last refresh | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:last-refresh` |
| Apptio Docs Finder diagnostics | `chrome.storage.local` | `rc:plugin:com.replycators.apptio-docs-finder:diag` |
| Environment Dashboards state | `chrome.storage.local` | `rc:plugin:com.replycators.env-dashboards:state` |
| Salesforce prompts | `chrome.storage.local` | `rc:plugin:com.replycators.salesforce-extractor:prompts` |
| Salesforce last download | `chrome.storage.local` | `rc:plugin:com.replycators.salesforce-extractor:last-download` |
| Salesforce selected prompt | `chrome.storage.local` | `rc:plugin:com.replycators.salesforce-extractor:selected-prompt` |
| Salesforce context file | `chrome.storage.local` | `rc:plugin:com.replycators.salesforce-extractor:context-file` |
| Salesforce additional instructions | `chrome.storage.local` | `rc:plugin:com.replycators.salesforce-extractor:additional-instructions` |
| Sidebar Plugins section collapsed | `chrome.storage.local` | `rc:session:plugins-section-collapsed` |
| Sidebar width (Side Panel) | `chrome.storage.local` | `rc:session:sidebar-width` |
| Plugin metadata registry | `dashboard.js` `PLUGINS[]` constant | In-memory source code - never read from storage |
| Plugin versions | `src/plugins/<Name>/manifest.ts` + `dashboard.js` `PLUGINS[]` | Two locations must stay in sync |

---

## 6. Architecture Decisions (ADRs)

> Every ADR is permanent. Decisions are never removed - they may be superseded by a new ADR.

### ADR-001 - Root Deployment Architecture
**Status:** Active | **Decided:** v1.0.0

Active extension loads root-level files directly from repository root, not from `dist/`.

- **Change rule:** Changing load path from root to `dist/` requires a new ADR, migration plan, and MINOR bump minimum.

### ADR-002 - Dual Implementation Strategy
**Status:** Active | **Decided:** v1.0.0

Hand-authored root flat-deployment (live) and TypeScript `src/` source tree coexist.

- **Change rule:** Unifying requires Release Gate pass, AGENTS.md update, and MINOR bump.

### ADR-003 - Single Rendering Path for Popup and Side Panel
**Status:** Active | **Decided:** v1.8.0

Both popup and side panel load `dashboard.html` + `dashboard.js`. Layout adapts via `body.rc-sidepanel` CSS class. A separate Side Panel implementation is **forbidden**.

### ADR-004 - Plugin Identity via Reverse-Domain IDs
**Status:** Active | **Decided:** v1.0.0

All plugin IDs use `com.replycators.<name>` format. Plugin IDs are **permanent** - changing one is a MAJOR breaking change.

### ADR-005 - Chrome Storage Local as Single Persistence Layer
**Status:** Active | **Decided:** v1.0.0

All session state and plugin data in `chrome.storage.local`. `chrome.storage.sync` used only for legacy `rc_theme` key.

- **Change rule:** Introducing a second storage backend requires a new ADR and migration plan.

### ADR-006 - Bidirectional Launch Mode Switching
**Status:** Active | **Decided:** v1.17.0

Users must never be trapped in a launch mode. Both Popup and Side Panel must offer an explicit mode-switch control.

**Implementation:**
- Popup to Side Panel: `#rc-sidepanel-btn` calls `openInSidePanel()` - `chrome.sidePanel.open()`
- Side Panel to Popup: `#rc-popup-btn` calls `openInPopup()` - sends `RC_OPEN_POPUP` to `background.js` - `background.js` calls `chrome.action.openPopup()`

**Visibility rules:**
- `#rc-sidepanel-btn`: always visible in popup; greyed/inactive in side panel
- `#rc-popup-btn`: `display:none` in popup; active in side panel via `body.rc-sidepanel #rc-popup-btn`

**Fallback:** Chrome/Edge < 127 does not support `chrome.action.openPopup()`. Background returns `{ unsupported: true }` and a toast instructs user to click toolbar icon.

**Forbidden:**
- Do NOT call `chrome.action.openPopup()` from `dashboard.js` directly - requires background context.
- Do NOT hide `#rc-popup-btn` inside side panel.
- Do NOT hide `#rc-sidepanel-btn` inside popup.

### ADR-007 - Plugin Navigation Scrolling-First Principle
**Status:** Active | **Decided:** v1.17.0

Navigation overflow handled through scrolling only - never by compressing icons, rows, or text.

**Binding implementation rules:**
- `.rc-nav__item`: `flex-shrink: 0`, `min-height: 32px`
- `.rc-nav__icon`: `flex-shrink: 0; width: 18px; min-width: 18px`
- Plugin nav items may use reduced padding but `min-height` never below 24px
- `.rc-nav gap: 0` - a positive gap fights `min-height` and can suppress scroll trigger

**Forbidden:**
- Remove `flex-shrink: 0` from `.rc-nav__item`
- Set `min-height` below 24px on any nav item
- Remove `flex-shrink: 0` or `min-width` from `.rc-nav__icon`
- Change `.rc-nav gap` from `0` to positive value

### ADR-008 - Plugin Module Architecture
**Status:** Active | **Decided:** v1.17.0 | **Full document:** `docs/ADR-008-plugin-module-architecture.md`

All plugin logic is extracted from `dashboard.js` into self-contained modules under `plugins/`. Each module self-registers on `window.ReplyCatorsPlugins`. `dashboard.js` is the orchestrator only.

**Architecture rules:**
- New plugin behavior goes in `plugins/<name>.js` - never inside `dashboard.js`
- Dashboard capabilities needed by a plugin are added to `window.ReplyCatorsApp`, not via direct coupling to shell internals
- Plugin modules do not call private functions from other plugins
- Script load order in `dashboard.html` is architecture-critical: plugin modules first, shell last

**Ownership boundary:**
- Plugin modules own: plugin-specific rendering, event binding, persistence keys, widget behavior, and feature logic
- `dashboard.js` owns: shell views, startup order, `PLUGINS[]` registry, Plugin Manager, ordering/visibility, global settings, diagnostics

- **Change rule:** New plugin behavior goes in `plugins/<name>.js`. Any new dashboard-level capability required by multiple plugins is added to `window.ReplyCatorsApp`.

---

## 7. State Management Rules

| Rule | Requirement |
|------|-------------|
| One source of truth | Every state has exactly one authoritative source. Consult § 5. Never maintain a competing copy. |
| Never duplicate state | Two pieces of code needing the same state both read from the single source. |
| No competing ordering systems | `rc:session:dashboard-order` is the only ordering source. `applyDashboardOrder()` is the single enforcement function. |
| Popup and side panel share all state | Same document in two surfaces. No separate state system. |
| Storage keys are permanent | Renaming or removing a key in production is a MAJOR breaking change requiring migration. |
| In-memory objects are derived from storage | Storage is source of truth. In-memory loaded at startup, written back on change. |

---

## 8. Plugin Architecture

### Plugin Inventory

| Plugin | View ID | Plugin ID | Version | Category |
|--------|---------|-----------|---------|----------|
| Salesforce Case Extractor | `plugin-salesforce` | `com.replycators.salesforce-extractor` | 4.12.4 | CRM |
| Cloudability OrgID | `plugin-cloudability-orgid` | `com.replycators.cloudability-orgid` | 4.0.4 | Cloud |
| Edge Bookmark Finder | `plugin-edge-bookmarks` | `com.replycators.edge-bookmark-finder` | 1.0.2 | Productivity |
| Apptio Planning Upgrade Calculator | `plugin-apptio-upgrade-calc` | `com.replycators.apptio-planning-upgrade-calculator` | 1.0.3 | Enterprise |
| Workspace Starter | `plugin-workspace-starter` | `com.replycators.workspace-starter` | 2.0.2 | Productivity |
| Tab Search | `plugin-tab-search` | `com.replycators.tab-search` | 1.0.1 | Productivity |
| Snake | `plugin-snake` | `com.replycators.snake` | 1.0.1 | Games |
| Example Plugin | `plugin-example` | `com.replycators.example-plugin` | 1.0.2 | Template |
| Apptio Documentation Finder | `plugin-apptio-docs-finder` | `com.replycators.apptio-docs-finder` | 1.0.3 | Productivity |
| Environment Dashboards Launcher | `plugin-env-dashboards` | `com.replycators.env-dashboards` | 1.4.0 | Support |

### Plugin Source Locations

| Plugin | TypeScript source | Content scripts | Plugin data | Runtime module |
|--------|-------------------|-----------------|-------------|----------------|
| Salesforce Case Extractor | `src/plugins/SalesforceExtractor/` | `plugins/salesforce/content/sf-content.js` v0.4.5 | None | `plugins/salesforce-case-extractor.js` |
| Cloudability OrgID | `src/plugins/CloudabilityOrgId/` | `plugins/cloudability/content/cloudability-detector.js`, `plugins/cloudability/content/cloudability-interceptor.js` | None | `plugins/cloudability-orgid.js` |
| Edge Bookmark Finder | `src/plugins/EdgeBookmarkFinder/` | None | None | `plugins/bookmark-finder.js` |
| Apptio Upgrade Calculator | `src/plugins/ApptioUpgradeCalculator/` | None | `plugins/apptio-upgrade-calculator/apptio-schedule.json` | `plugins/apptio-upgrade-calculator.js` |
| Workspace Starter | `src/plugins/WorkspaceStarter/` | None | None | `plugins/workspace-starter.js` |
| Tab Search | None | None | None | `plugins/tab-search.js` |
| Snake | `src/plugins/Snake/` (stub only) | None | None | `plugins/snake.js` |
| Example Plugin | `src/plugins/ExamplePlugin/` | None | None | `plugins/example-plugin.js` |
| Apptio Docs Finder | None | None | None | `plugins/apptio-docs-finder.js` |
| Environment Dashboards | None | None | None | `plugins/env-dashboards.js` |

### Plugin Lifecycle

```
Registration -> Initialization -> Settings Load -> View Render -> User Interaction -> Persistence -> Cleanup -> Disposal
```

| Phase | Detail |
|-------|--------|
| Registration | Metadata in `PLUGINS[]`; runtime registers on `window.ReplyCatorsPlugins.<Name>` |
| Initialization | `dashboard.js` calls `init()` during DOMContentLoaded. Bind UI controls only - no async I/O. |
| Settings Load | Plugin reads storage and shared settings through `window.ReplyCatorsApp` |
| View Render | Plugin owns its view container and widget wiring; `dashboard.js` delegates via `render()`/`onNavigate()` |
| User Interaction | Event listeners attached after render; state changes re-render only plugin-owned DOM |
| Persistence | Changes written via `chrome.storage.local`; logging/notifications through `window.ReplyCatorsApp` |
| Cleanup | On disable: `dashboard.js` hides nav/widget/action surfaces; plugin data preserved |
| Disposal | No teardown required unless plugin implements a navigation leave hook |

**Lifecycle violations:**
- Attaching event listeners before render (element doesn't exist - silent failure)
- Reading storage inside an event handler on every click (read once at init, write on change)
- Writing to storage before migration is complete

### Content Scripts

| Script | World | Injected on | Purpose |
|--------|-------|-------------|---------|
| `plugins/salesforce/content/sf-content.js` | ISOLATED | `*.salesforce.com/*`, `*.lightning.force.com/*` | Case data extraction; injection guard `window.__rcSfExtractorInstalled` |
| `plugins/cloudability/content/cloudability-interceptor.js` | MAIN | `*/cloudability*` at `document_start` | Patches XHR/fetch to intercept OrgID API calls |
| `plugins/cloudability/content/cloudability-detector.js` | ISOLATED | `*/cloudability*` at `document_end` | Receives OrgID from interceptor; forwards to background |

### Salesforce Case Extractor - Key Notes

**Message protocol:**
```
{ type: 'SF_IS_CASE_PAGE', pluginId: 'com.replycators.salesforce-extractor' }
  -> { isCasePage: boolean }
{ type: 'SF_EXTRACT', pluginId: '...', payload: { caseNumber: string } }
  -> { result, data: { caseNumber, accountName, contactName, subject, description,
                       agentDescription, posts: [{ author, timestamp, content, type }] } }
```

**Tab listener behavior:** `registerTabListeners()` is called the first time user navigates to the SF view (not at init). Attaches `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` to auto-detect case page changes. `_tabListenersRegistered` flag prevents duplicate registration.

### Workspace Starter - Schema

```ts
interface WorkspaceProfile {
  id: string; name: string; urls: string[];
  launchMode: 'tab-group' | 'tabs';
  category: string; favorite: boolean; createdAt: number;
}
interface WorkspaceStarterData {
  profiles: WorkspaceProfile[];
  lastLaunchedId: string | null;
  recents: string[]; // newest first, max 5
}
```

---

## 9. Storage Architecture

### Storage Namespaces

| Namespace | Backend | Owner | Purpose |
|-----------|---------|-------|---------|
| `rc:session:*` | `chrome.storage.local` | `dashboard.js` | Dashboard session and platform state |
| `rc:platform:*` | `chrome.storage.local` | `dashboard.js` | Platform state |
| `rc:plugin:<id>:*` | `chrome.storage.local` | Plugin modules | Per-plugin data |
| `rc:settings:<id>:*` | `chrome.storage.sync` | Platform/SDK | Reserved - future sync use |

### Session Keys

| Key | Type | Content |
|-----|------|---------|
| `rc:session:logs` | array | Activity log - ring buffer 500 max |
| `rc:session:notifications` | array | Notification history - ring buffer 100 max |
| `rc:session:sf-last-result` | object | Last SF extraction result |
| `rc:session:nav-view` | string | Last active view ID |
| `rc:session:sf-settings` | object | `{ outputFormat, postSort, autoFill, source, privacyMode, bobWorkingDir, bobApiKey, bobUseBob1, inclInternal, inclJiraEtl, inclDiag, diagnosticMode }` |
| `rc:session:plugin-states` | object | Plugin enabled map `{ [pluginId]: { enabled } }` |
| `rc:session:app-settings` | object | All platform settings |
| `rc:session:dashboard-order` | array | Plugin dashboard widget/nav order |
| `rc:session:plugins-section-collapsed` | boolean | Sidebar Plugins section state (default: false) |
| `rc:session:sidebar-width` | string | CSS string e.g. `"220px"` - Side Panel only |
| ~~`rc:ui:launch-mode`~~ | ~~string~~ | **Removed v1.8.1.** Stale key silently removed on startup. |

### Notable Plugin Keys

| Key | Content |
|-----|---------|
| `rc:plugin:com.replycators.cloudability-orgid:orgid-cache` | `{ id, name, retrievedAt, originDomain }` - never erased on failure |
| `rc:plugin:com.replycators.edge-bookmark-finder:prefs` | User preferences |
| `rc:plugin:com.replycators.edge-bookmark-finder:last-scan` | Last scan result |
| `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache` | 24h TTL |
| `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc` | User selections |
| `rc:plugin:com.replycators.workspace-starter:data` | `{ profiles, lastLaunchedId, recents }` - single composite key |
| `rc:plugin:com.replycators.snake:state` | `{ highScore }` |
| `rc:plugin:com.replycators.salesforce-extractor:prompts` | `[{ id, title, body, isDefault, createdAt, updatedAt }]` |
| `rc:plugin:com.replycators.salesforce-extractor:prompts-seeded` | boolean |
| `rc:plugin:com.replycators.salesforce-extractor:last-download` | `{ downloadId, filename, state, ... }` |
| `rc:plugin:com.replycators.salesforce-extractor:selected-prompt` | string |
| `rc:plugin:com.replycators.salesforce-extractor:context-file` | string |
| `rc:plugin:com.replycators.salesforce-extractor:additional-instructions` | string |
| `rc:plugin:com.replycators.apptio-docs-finder:sources` | `{ id, domain, label, scope, hint, url }[]` |
| `rc:plugin:com.replycators.apptio-docs-finder:quick-links` | `{ label, url, group }[]` |
| `rc:plugin:com.replycators.apptio-docs-finder:recent-searches` | max 20 |
| `rc:plugin:com.replycators.apptio-docs-finder:recently-opened` | max 30 |
| `rc:plugin:com.replycators.apptio-docs-finder:favorites` | max 50 |
| `rc:plugin:com.replycators.apptio-docs-finder:settings` | `{ openInNewTab, saveSearchHistory, saveOpenHistory }` |
| `rc:plugin:com.replycators.apptio-docs-finder:last-refresh` | ISO timestamp |
| `rc:plugin:com.replycators.apptio-docs-finder:diag` | Last refresh diagnostic record |
| `rc:plugin:com.replycators.env-dashboards:state` | `{ lastEnv, favorites, recents }` |

### Storage Migration Rules

1. Never delete a key without reading it first.
2. Never rename by write-only. Read old name first or data is silently lost.
3. Migration functions must be idempotent. Running twice must not corrupt data.
4. Old keys must be cleaned up after successful migration.
5. Backward-compatible field additions are MINOR, not MAJOR.
6. Workspace Starter migration entry-point is `wsMigrateProfiles()`.

**Key rename template:**
```js
chrome.storage.local.get(['rc:plugin:X:old-key'], function(data) {
  const old = data['rc:plugin:X:old-key'];
  if (old !== undefined) {
    chrome.storage.local.set({ 'rc:plugin:X:new-key': old }, function() {
      chrome.storage.local.remove('rc:plugin:X:old-key');
    });
  }
});
```

---

## 10. Common Change Guide

### Modifying a View or Component

| What to change | Files to edit |
|----------------|---------------|
| Dashboard view | `dashboard.html` (three semantic sections: Quick Actions, Plugin Functions, Platform Status), `dashboard.js` (`updateStats()`, `applyPluginVisibility()`) |
| Plugin Manager | `dashboard.html` (`#view-plugins`), `dashboard.js` (`renderPluginGrid()`, `togglePlugin()`, `PLUGINS[]`) |
| Settings | `dashboard.html` (`#view-settings`), `dashboard.js` (`DEFAULT_SETTINGS`, `applySettings()`, `bindSettings()`) |
| Themes | `styles/platform.css`, `dashboard.html` (`#settings-theme`), `styles/dashboard.css` |
| Background service worker | `background.js` (root) only |
| Marketplace | `dashboard.html` (`#view-marketplace`), `dashboard.js` (`renderMarketplace()`, `MARKETPLACE_PLUGINS[]`) |
| Plugin ordering | Plugin Manager Move Up/Down (reads/writes `rc:session:dashboard-order`). Do NOT manually reorder in HTML. Do NOT reorder `PLUGINS[]`. |

### Adding a New Plugin

**Start with:** `docs/AI-PLUGIN-KIT.md`

**Optional scaffolding:**
```powershell
npm run create-plugin
npm run create-plugin -- --name "My Plugin" --id my-plugin --type widget
```

**Required registration steps:**

1. Add plugin view HTML to `dashboard.html` - `<div class="rc-view" id="view-plugin-<name>">`
2. Add widget card to `dashboard.html` (`#rc-dashboard-widgets`) with `data-plugin-widget` attribute
3. Add entry to `PLUGINS[]` in `dashboard.js`
4. Wire `_safeInit('PluginKey', () => ...)` in `DOMContentLoaded` block in `dashboard.js`
5. Add `onNavigate()` delegate and `onLeave()` call in `navigateTo()` in `dashboard.js`
6. Load `plugins/<slug>.js` before `dashboard.js` in `dashboard.html`
7. Add plugin option to `#activity-plugin-filter` in `dashboard.html`
8. Create TypeScript source stub in `src/plugins/<PluginName>/`
9. Add to `src/platform/bootstrap.ts` import chain
10. If content scripts needed: add to root + `manifest.json` `content_scripts`
11. If background service needed: add inline to `background.js`
12. Complete the Plugin Release Checklist (§ 17)

> Nav buttons are NOT added manually to `dashboard.html`. `applyPluginVisibility()` builds them dynamically from `PLUGINS[]`.

### UI Rendering Map

**Startup sequence (v1.20.1 lazy-init model):**
```
User clicks icon -> Chrome loads dashboard.html (root)
  -> loads styles, dashboard.js
    -> restoreSession()
        -> applyAllSettings()         (theme/font/density/accessibility)
        -> renderPluginGrid()          (Plugin Manager rows)
        -> applyPluginVisibility()     (left nav buttons CREATED from PLUGINS[])
        -> applyDashboardOrder()       (left nav + widgets RE-ORDERED)
        -> plugin init() calls        (bind UI controls only - no async I/O)
        -> navigateTo(lastView)        (restore last active view)
```

> `applyPluginVisibility()` MUST run before `applyDashboardOrder()`. Reversing silently discards saved nav order.

### Active Views

| View ID | nav `data-view` | Description |
|---------|----------------|-------------|
| `view-dashboard` | `dashboard` | Overview: Quick Actions, Plugin Widgets, Platform Status |
| `view-plugins` | `plugins` | Plugin Manager |
| `view-marketplace` | `marketplace` | Marketplace |
| `view-notifications` | `notifications` | Notifications Center (2 tabs: Notifications, Activity) |
| `view-maintenance` | `maintenance` | Maintenance Center (2 tabs: Diagnostics, Backup & Restore) |
| `view-settings` | `settings` | Platform settings |
| `view-plugin-salesforce` | `plugin-salesforce` | Salesforce Case Extractor |
| `view-plugin-cloudability-orgid` | `plugin-cloudability-orgid` | Cloudability OrgID |
| `view-plugin-example` | `plugin-example` | Example Plugin |
| `view-plugin-edge-bookmarks` | `plugin-edge-bookmarks` | Edge Bookmark Finder |
| `view-plugin-apptio-upgrade-calc` | `plugin-apptio-upgrade-calc` | Apptio Planning Upgrade Calculator |
| `view-plugin-workspace-starter` | `plugin-workspace-starter` | Workspace Starter |
| `view-plugin-tab-search` | `plugin-tab-search` | Tab Search |
| `view-plugin-snake` | `plugin-snake` | Snake game |
| `view-plugin-apptio-docs-finder` | `plugin-apptio-docs-finder` | Apptio Documentation Finder |
| `view-plugin-env-dashboards` | `plugin-env-dashboards` | Environment Dashboards Launcher |

> Compat redirects: `navigateTo('diagnostics')` -> `maintenance` (Diagnostics tab); `navigateTo('backup-restore')` -> `maintenance` (Backup & Restore tab).

### Navigation Information Architecture

```
[ Core ]
  Dashboard (Home) - always first
[ Plugins ]  <- rc-plugins-section-divider + "Plugins" section title
  Plugin Manager
  Marketplace
  Installed toggle (#rc-plugin-nav-items injected by applyPluginVisibility())
[ rc-nav__spacer - flex:1; min-height:8px ]
[ Utility ]  <- rc-nav__divider + "Utility" section title
  Options -> Diagnostics -> Notifications -> Activity -> Backup & Restore -> Documentation
```

| Section | Items | Rule |
|---------|-------|------|
| Core | Dashboard | Home view only. Keep small. |
| Plugins | Plugin Manager, Marketplace, installed plugins | All plugin ecosystem destinations. |
| Utility | Options, Send Feedback, Diagnostics, Notifications, Activity, Backup & Restore, Documentation | Always at the bottom. Options always precedes Diagnostics. |

Plugin-contributed items always appear inside `#rc-plugin-nav-items` (Plugins section). Never assign plugin destinations to Utility.

### Navigation Scalability (RC-NAV001-005, RC-NAV-BDR001)

| Rule | ID | Requirement |
|------|----|-------------|
| Nav scrolls on overflow | RC-NAV002 | `.rc-nav` has `min-height: 0` so `overflow-y: auto` activates |
| Items never compress | RC-NAV005 | `.rc-nav__item` has `flex-shrink: 0` and `min-height: 32px` |
| Icons fixed size | RC-NAV005 | `.rc-nav__icon` has `flex-shrink: 0; width: 18px; min-width: 18px; font-size: 15px` |
| Plugin items use reduced padding | RC-NAV003 | 6px vertical padding in popup (vs 9px default); `min-height` never below 24px |
| Side panel sidebar is wider | RC-NAV001 | `body.rc-sidepanel .rc-sidebar--expanded` is 220px (vs 200px popup) |
| Sidebar right-edge divider | RC-NAV-BDR001 | `.rc-sidebar::after` pseudo-element: `position:absolute; right:0; top:0; bottom:0; width:1px; background:var(--rc-border); z-index:9; pointer-events:none`. Do NOT use `border-right` on `.rc-sidebar`. Do NOT add `margin-right` to `.rc-nav`. |

### Interactive List Item Pattern (RC-UX010)

> Binding on all new and refactored plugin UI.

When a list item has a single primary action, the entire row must be the click target.

| Requirement | Implementation |
|-------------|----------------|
| Row is primary click target | `role="button"`, `tabindex="0"`, `cursor: pointer`, click handler on row |
| Keyboard accessible | `keydown` handler: `Enter` and `Space` trigger primary action |
| Focus visible | `:focus-visible` with `box-shadow` ring - never suppress outline without replacement |
| Secondary actions | `stopPropagation()` to prevent triggering row action; `tabindex="-1"` on inner buttons |
| Single open function | Extract `openXxx(url)` used by both row click and icon click |

**Forbidden:**
- Row content non-interactive while small edge icon is the only click target
- `cursor: default` on a card-like list row
- Suppressing `outline` without `:focus-visible` replacement
- Per-element listeners inside render loop (use event delegation)

### Logging and Notification Standards

| Log level | When to use |
|-----------|-------------|
| `debug` | Low-signal internal diagnostics (suppressed at 'normal' log level) |
| `info` | Normal operation, state transitions |
| `warn` | Recoverable issues, degraded operation |
| `error` | Failed operations requiring attention |

| Notification type | When to use |
|-------------------|-------------|
| `success` | Operation completed successfully |
| `info` | Neutral information, no action required |
| `warning` | Potential issue, action may be needed |
| `error` | Operation failed, action required |

---

## 11. Governance Rules

### Plugin UI Standards

> Mandatory. Binding on all agents, contributors, and code reviews. Introduced v1.43.0.
> Reference: `PLUGIN-SDK.md §Plugin page structure`, `styles/platform.css §PLATFORM UI STANDARD`.

#### Core principle

Users should not need to learn a new UI when opening a different plugin. Every plugin must feel like part of the same product.

#### Plugin page structure (non-negotiable)

Every plugin view in `dashboard.html` must use:

| Element | Required class | Replaces |
|---------|---------------|---------|
| View wrapper | `.rc-view.rc-plugin-page` | `.rc-view` alone |
| Header | `.rc-plugin-header` | `.rc-panel-header`, `.sf-plugin-bar`, inline style headers |
| Icon slot | `.rc-plugin-header__icon` | inline icon spans |
| Name | `.rc-plugin-header__name` | `.rc-panel-title`, `.sf-plugin-title` |
| Release version | `.rc-plugin-header__version` (e.g. `v4.0.3`) | `.sf-plugin-badge`, category badges |
| Content body | `.rc-plugin-body` | `.rc-panel-body`, inline padding |
| Sections | `.rc-plugin-section` + `.rc-plugin-section__header` | inline margin hacks, custom section divs |
| Cards | `.rc-plugin-card` | `.cld-result-card`, plugin-specific card classes |
| Actions | `.rc-plugin-action-bar` | `.cld-action-row`, scattered button placement |
| Tabs | `.rc-plugin-tabs` + `.rc-plugin-tab` + `.rc-plugin-tab--active` | `.sf-inner-tabs`, `.sf-inner-tab`, `rc-unified-tabs` with `rc-btn` toggle |
| Empty state | `.rc-plugin-empty` | `.sf-lib-empty`, `.sf-dl-empty`, custom empty divs |
| Loading state | `.rc-plugin-loading` | `.rc-status.rc-status--neutral` with loading text |
| Status strip | `.rc-plugin-status` (with modifier) | `.rc-status-bar` |
| Metadata rows | `.rc-plugin-kv` | `.cld-orgname-row`, custom flex rows |
| Stat tiles | `.rc-plugin-stat` | `.auc-stat`, custom stat divs |
| List container | `.rc-plugin-list` | custom overflow-y divs |
| List item | `.rc-plugin-list-item` | custom card-like click targets |

#### Documentation button (mandatory in every plugin view)

Every plugin header must contain the standard `rc-doc-icon` button:

```html
<button class="rc-doc-icon" data-doc-view="plugin-<slug>"
        title="View <Name> documentation" aria-label="View <Name> documentation">
  <span data-icon="navigation.documentation" aria-hidden="true" style="display:block;width:16px;height:16px;"></span>
</button>
```

#### Action placement rules

1. Primary action is always the first element in `.rc-plugin-action-bar`.
2. Primary action always uses `.rc-btn--primary`.
3. Secondary actions use `.rc-btn--secondary` or `.rc-btn--ghost`.
4. Destructive actions use `.rc-btn--danger`.
5. Use `.rc-plugin-action-bar__spacer` to push secondary actions to the right.

#### Status indicator rules

| Meaning | Class |
|---------|-------|
| Success / completed | `.rc-plugin-status--success` |
| Warning / degraded | `.rc-plugin-status--warning` |
| Error / failed | `.rc-plugin-status--error` |
| Informational | `.rc-plugin-status--info` |

The same meaning must always use the same visual.

#### Empty state rules

| Scenario | Use |
|----------|-----|
| No data loaded yet | `.rc-plugin-empty` with `.rc-plugin-empty__title` + `.rc-plugin-empty__body` |
| Loading in progress | `.rc-plugin-loading` |
| Custom empty icon | `.rc-plugin-empty__icon` with a `data-icon` span |

Do not use custom empty divs, inline text, or `display:none` placeholders.

### Primary Workflow Protection

> Mandatory. Binding on all agents and contributors. Introduced v1.43.3.
> Core principle: UI consistency must never come at the expense of core functionality.

A plugin's primary purpose must remain the most visually prominent element on the page. Standardization governs structure - it must not demote business value.

#### Content hierarchy (non-negotiable order)

1. Primary plugin function (hero element - the main data/action the plugin exists for)
2. Primary actions (Refresh, Copy, Search, Launch, Extract, Run, Generate)
3. Current status
4. Supporting metadata
5. Guidance / how-it-works content
6. Documentation
7. Advanced / diagnostic information

Informational cards, how-it-works explanations, and guidance text are always **secondary content**. They must never visually compete with or replace the primary workflow.

#### Implementation rules

| Rule | Requirement |
|------|-------------|
| Primary content first | The hero element (main data display, primary input, primary action) must appear at the top of the plugin body, before any guidance or info cards |
| No scroll required | Primary workflow must be visible without scrolling in the standard 752px popup height |
| No expand required | Primary workflow must not be hidden behind collapsible sections or tabs the user must open first |
| Actions above fold | Primary action buttons (Refresh, Copy, Launch) must be visible without scrolling |
| Info cards are secondary | `.rc-info-cards` and `.rc-info-card` blocks must always appear below the primary workflow |
| Status secondary to data | Status badges supplement the primary display; they never replace it |

#### Standardization guardrail

When applying any UI standardization to a plugin, verify:
- [ ] Primary function (data display / main action) is still the first visible element
- [ ] Primary actions are immediately discoverable without scrolling
- [ ] Guidance and documentation content is placed below the primary workflow
- [ ] Information hierarchy matches the content hierarchy table above
- [ ] Standardization has not increased the number of interactions required to complete the primary task

A standardization change that demotes primary functionality is a **P2 regression** and must be fixed before any other work proceeds.

### Primary Workflow First

> Mandatory. Binding on all agents and contributors. Introduced v1.43.4.
> Extends and operationalizes Primary Workflow Protection with specific enforcement rules.

1. **Status in the header, not in the body.** Connection state, tab detection, and live retrieval status must be presented through `rc-badge` in the plugin header - not through inline banners, warning panels, or status bars inside the content area.
2. **Single primary action.** The most important action must stand alone as an `rc-btn--primary`. Do not place secondary or diagnostic actions immediately adjacent to the primary action where they compete for visual attention.
3. **Diagnostic controls are not primary workflow.** Controls used for troubleshooting, diagnostics, or developer introspection (e.g. "Include in Diagnostics", internal metadata toggles) must not appear in the primary action bar. Remove them or move them to a Settings section.
4. **Tabs only for genuinely parallel workflows.** Do not introduce tabs unless the plugin has two or more workflows of equal user value. A single primary function that also has a notifications sub-page is not two parallel workflows - use the platform Notifications Center instead.
5. **Plugin-specific tab systems are forbidden.** Every plugin that uses tabs must use `.rc-plugin-tabs` / `.rc-plugin-tab` / `.rc-plugin-tab--active`. Private CSS tab systems (e.g. `adf-tab-bar`, `adf-tab`) are a violation of the platform standard.

#### Status badge vocabulary (for header badges)

| Scenario | Badge text | Badge class |
|----------|-----------|-------------|
| Live connection / case detected | `Connected` | `rc-badge--green` |
| Retrieved from cache | `Cached` | `rc-badge--green` |
| Live data | `Live` | `rc-badge--green` |
| No active browser tab for this plugin | `No active tab` | `rc-badge--red` |
| Plugin disabled | `Disabled` | `rc-badge--red` |
| Checking / retrieving | `Checking…` | `rc-badge--amber` |
| Search mode (not a tab-detection plugin) | `Search mode` | `rc-badge--amber` |

All status badges must appear between `__version` and the `rc-doc-icon` button in the header.

### Plugin Identity Standard

> Mandatory. Binding on all agents and contributors. Introduced v1.43.3.
> Core principle: Every plugin must expose identity information using the same visual pattern.

Users should immediately recognize plugin name, version, and status using the same header layout everywhere.

#### Required plugin header elements

| Element | HTML | Required |
|---------|------|----------|
| Plugin icon | `.rc-plugin-header__icon` wrapping `data-icon` span | Mandatory |
| Plugin name | `.rc-plugin-header__name` | Mandatory - always visible, never hidden |
| Release version | `.rc-plugin-header__version` (e.g. `v4.0.3`) | Mandatory on every plugin |
| Status badge | `rc-badge` (dynamic, e.g. `rc-badge--green`) | Optional - only when the plugin has live status to report |
| Documentation icon | `.rc-doc-icon` button with `data-doc-view` | Mandatory |

Standard order: `[icon] [name] [version] [optional status badge] [doc icon]`

#### Version badge rules

- **Release Version is the default metadata badge** - use `.rc-plugin-header__version` with semantic version (e.g. `v1.0.2`).
- **Category labels are prohibited** - do not use Productivity, Utility, Enterprise, Tool, Helper, or similar labels as header badges unless there is an explicit documented business requirement approved in a new ADR.
- The version shown in the header must match the version in `PLUGINS[]` in `dashboard.js`.
- When a plugin receives a version bump, both `dashboard.js` PLUGINS[] and `dashboard.html` header must be updated in the same commit.

#### Forbidden header patterns

| Forbidden | Required instead |
|-----------|-----------------|
| Category badge (Productivity, Enterprise, Template…) | `.rc-plugin-header__version` |
| Missing plugin name | `.rc-plugin-header__name` always present |
| Missing version | `.rc-plugin-header__version` always present |
| Slim header with no name or version | Full standard header - slim modifier is removed |
| Custom header structure replacing `.rc-plugin-header` | Use `.rc-plugin-header` |
| Inline `style="justify-content:flex-end"` on header | Use standard layout - name fills space via `flex:1` |

### Forbidden Changes

> Any of the following without explicit architecture review is a defect, not a feature.

| Forbidden action | What to do instead |
|-----------------|-------------------|
| Change popup load path from root to `dist/dashboard.html` | New ADR + migration plan + MINOR bump |
| Switch active runtime from root to `dist/` | RC-015 Phase 2 procedure + full Release Gate |
| Create a second `appSettings` object or settings store | Extend `DEFAULT_SETTINGS{}` with new keys |
| Create a second plugin ordering mechanism | Use `dashboardOrder[]` and `applyDashboardOrder()` |
| Build a separate Side Panel HTML/JS | Add `body.rc-sidepanel` responsive CSS rules |
| Rename or remove a `chrome.storage.local` key without migration | Write idempotent migration function; document as MAJOR |
| Add a plugin without completing the Plugin Release Checklist | Complete every item in the Plugin Release Checklist |
| Bump MAJOR version without written justification | Apply Major Version Approval Rule (5 required items) |
| Run `npm install -> build -> delete node_modules` as standard workflow | Check `[root]\Runtime\NodeJS` first; see § 13-A |
| Install tooling into ReplyCators when Runtime can satisfy requirement | Install into `[root]\Runtime\NodeJS` |
| Directly edit any file in `dist/` | Edit root files; copy to `dist/` after |
| Add a new plugin view without using `.rc-plugin-page` + `.rc-plugin-header` | Use platform standard - see Plugin UI Standards above |
| Introduce a new tab system without using `.rc-plugin-tabs` / `.rc-plugin-tab` | Use platform standard tabs - see Plugin UI Standards above |
| Introduce a new card component when `.rc-plugin-card` covers the use case | Use `.rc-plugin-card` - see Plugin UI Standards above |
| Create a plugin-specific empty state without using `.rc-plugin-empty` | Use `.rc-plugin-empty` - see Plugin UI Standards above |
| Create a plugin-specific loading state without using `.rc-plugin-loading` | Use `.rc-plugin-loading` - see Plugin UI Standards above |
| Place guidance / info cards above the primary plugin workflow | Primary workflow first - see Primary Workflow Protection above |
| Omit `.rc-plugin-header__version` from a plugin header | Every plugin header must show release version |
| Use a category badge (Productivity, Enterprise…) in place of version | Use `.rc-plugin-header__version` - see Plugin Identity Standard above |
| Hide plugin name in a slim header with no `__name` element | Plugin name must always be visible - see Plugin Identity Standard above |
| Add a plugin-specific tab system (e.g. custom CSS tab classes) | Use `.rc-plugin-tabs` / `.rc-plugin-tab` - see Plugin UI Standards above |
| Place connection / detection status in a banner inside the plugin body | Use `rc-badge` in the plugin header - see Primary Workflow First above |
| Add diagnostic/internal controls to the primary action bar | Move to a Settings section or remove - see Primary Workflow First above |
| Add a Notifications tab to a plugin that has no secondary parallel workflow | Use the platform Notifications Center - see Primary Workflow First above |

### dashboard.js Governance

`dashboard.js` is a ~5,400-line orchestrator. Every change risks breaking unrelated features.

**Growth prevention rules:**
1. Do not add a top-level function without checking if one already exists to extend.
2. Do not duplicate initialization logic - one `DOMContentLoaded` listener.
3. Do not add a new `chrome.storage.local.get` call without checking if data is already loaded.
4. Do not create a new global variable without adding it to the Source of Truth Matrix.
5. New plugin UI code goes in a clearly delimited section using the existing banner comment style.
6. If a new feature requires > ~200 lines, evaluate whether it belongs in a separate plugin.

### Important Implementation Decisions

- **No ES module imports in `background.js`** - single-file IIFE bundle; no `import/export`.
- **Root files are hand-maintained** - root does NOT auto-update from `src/` on save. Build + copy required.
- **Idempotency guard on content scripts** - `sf-content.js` checks `window.__rcSfExtractorInstalled`.
- **Debounced persistence** - `addLog` and `addNotification` debounce storage writes by 300ms.
- **OrgID no-erase policy** - a failed refresh never removes the last known good OrgID.
- **`showToast(message, type, title, force)`** - `force=true` bypasses notification master switch for system-critical messages only.
- **Sidebar search is live-filter** - `#rc-search` filters `#rc-plugin-nav-items` buttons in real time.
- **Bob execution path (active):** `RC_EXECUTE_BOB` message -> `background.js` -> HTTP POST -> `tools/bob-helper-server.js`. The `nativeMessaging` permission is intentionally absent. `chrome.runtime.connectNative()` must NOT be used.

---

## 12. Versioning Rules

### Version Format

```
MAJOR.MINOR.PATCH   (e.g. 1.10.1)
```

Platform and plugin versions are completely independent.

### When to Increment

| Segment | Increment when |
|---------|---------------|
| PATCH | Fix with no new user-facing capability |
| MINOR | Adds capability without breaking anything |
| MAJOR | Breaking change requiring user action or destroying compatibility |

**Decision tree:**
```
Does anything break?   YES -> MAJOR (justify with all 5 required items)
      | NO
New capability added?  YES -> MINOR
      | NO
Bug fix or polish?     YES -> PATCH
      | NO
Documentation only?        NO VERSION BUMP
```

### Major Version Approval Rule

A MAJOR bump requires all 5 items:

1. Written justification - what breaks and why.
2. CHANGELOG entry with `**Breaking changes:**` and non-empty description.
3. AGENTS.md update - Architecture Decisions, Forbidden Changes, and/or Storage Schema updated.
4. Exact description of behavior that will fail for existing users.
5. Migration steps for users who have data that will be lost.

> If any item cannot be written, a MAJOR bump is not allowed. Use MINOR or PATCH instead.

### Plugin Version Rules

| Segment | When to increment |
|---------|------------------|
| MAJOR | Plugin API contract breaks, storage key migration, protocol change |
| MINOR | New capability, new UI section, new setting, new extraction strategy |
| PATCH | Bug fix, cosmetic fix, log improvement |

**Mandatory plugin versioning rule:** A change affecting a specific plugin's runtime behavior, UI, storage, diagnostics hooks, or plugin-owned documentation must increment that plugin's version in the same task.

> Current plugin versions: § 8 Plugin Inventory - single authoritative source.

### Authoritative Version Locations

All of the following must show identical platform version before any release:

| Location | Field |
|----------|-------|
| `manifest.json` | `"version"` |
| `package.json` | `"version"` |
| `AGENTS.md` | Project Overview - Extension version |
| `dashboard.html` | `<span id="rc-platform-version">` |
| `dashboard.js` | File header comment |
| `CHANGELOG.md` | Latest `## [x.x.x]` entry |
| `docs/PACKAGING.md` | `Last updated:` line |
| `dist/manifest.json` | `"version"` |
| `dist/dashboard.html` | `<span id="rc-platform-version">` |
| `dist/dashboard.js` | File header comment |
| `dist/package.json` | `"version"` |

Plugin versions: `dashboard.js` `PLUGINS[]`, § 8 Plugin Inventory in `AGENTS.md`, `README.md` Built-in Plugins table, and latest `CHANGELOG.md` entry - all must stay in sync.

### Changelog Entry Standard

```markdown
## [x.x.x] - YYYY-MM-DD
### <Component> - <short title>
**Type:** Feature | Bug Fix | Enhancement | Refactor | UI | Governance | Breaking
**Summary:** One or two sentences.
**Files changed:**
- path/to/file - what changed
**Breaking changes:** None | <description and migration path>
**Plugin versions at this release:**
- Salesforce Case Extractor: x.x.x
- Cloudability OrgID: x.x.x
- Edge Bookmark Finder: x.x.x
- Apptio Planning Upgrade Calculator: x.x.x
- Workspace Starter: x.x.x
- Snake: x.x.x
- Example Plugin: x.x.x
```

---

## 13. Repository Hygiene

### Absolute Prohibitions

| Rule | Detail |
|------|--------|
| DO NOT treat ReplyCators as a dependency cache | Source code only - not a Node install location or package manager store |
| DO NOT run tooling from inside this repository | Node.js, npm, TypeScript, Webpack, ESLint belong at `[root]\Runtime\NodeJS` |
| DO NOT create `node_modules/` as a routine step | Runtime reuse must be evaluated first |
| DO NOT leave `node_modules/` present after task completion | Delete immediately after builds/tests |
| DO NOT copy Node.js or any runtime into this repository | Runtimes belong at `[root]\Runtime\NodeJS` |
| DO NOT commit build caches | `.npm/`, `.yarn/`, `pnpm-store/`, `npm-cache/` |
| DO NOT commit `dist/` temporary artefacts | `*.crx`, `*.zip`, `*.pem` - `dist/` itself IS tracked |
| DO NOT commit test/coverage output | `coverage/`, `.nyc_output/`, `test-results/` |
| DO NOT commit OS/editor noise | `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/` |
| DO NOT commit `.bob/` | Bob agent workspace folder is local-only |
| DO NOT create directories beginning with `__` | Edge/Chrome refuse to load such extensions |
| DO NOT put docs or package metadata in `dist/` | Runtime files only |

### Repository Hygiene Checklist

Run before every release AND after every build/test session:

- [ ] `node_modules/` does not exist anywhere under the repository root
- [ ] No runtime distribution folder exists inside the repository
- [ ] No package manager cache directories present
- [ ] `dist/` contains only compiled output - no stale map files
- [ ] `.gitignore` is up to date
- [ ] No `.log`, `.zip`, `.crx`, `.pem`, or `.key` files in the tree
- [ ] `AGENTS.md` reflects the current repository state
- [ ] No directories beginning with `__` exist

**Quick hygiene verification:**
```powershell
Test-Path node_modules  # must return False
Get-ChildItem -Recurse -Directory -Filter "__*" | Where-Object { $_.FullName -notlike "*\node_modules\*" }  # must return nothing
```

---

## 13-A. Runtime-First Policy

> Binding on all AI agents and contributors.

### Rule

All JavaScript tooling belongs at `[root]\Runtime\NodeJS`. Not inside this repository.

| Runtime | Location |
|---------|----------|
| Node.js / npm / npx | `[root]\Runtime\NodeJS` |
| TypeScript / Webpack / ESLint | `[root]\Runtime\NodeJS` |
| Shared tools | `[root]\Runtime\Tools` |
| Git | `[root]\Runtime\Git` |
| Python | `[root]\Runtime\Python` |
| Java | `[root]\Runtime\Java` |

### Decision Checklist

Before installing any dependency or build tool:

- [ ] Check `[root]\Runtime\NodeJS` - does the required tool already exist? -> YES: use it from Runtime.
- [ ] Can the task be completed using tools already in Runtime? -> YES: proceed.
- [ ] Should the missing tool be installed into Runtime for reuse? -> YES (usually): install into Runtime.
- [ ] Only if Runtime cannot satisfy the requirement: create `node_modules/` transiently, document why, delete immediately after.

### node_modules Governance

| Scenario | Permitted? |
|----------|-----------|
| Runtime tooling used directly - no `node_modules/` created | Preferred |
| `node_modules/` created transiently | Exception only - delete immediately after |
| `node_modules/` left present after task | Prohibited |
| `node_modules/` committed to source control | Prohibited |

### Build Commands

```powershell
npm install           # EXCEPTION path only - Runtime-first must be evaluated first
npm run build         # production build -> dist/ + postbuild auto-sync
npm run build:dev     # development build with source maps
npm run watch         # incremental watch build
npm run typecheck     # TypeScript type-check only (no emit)
npm run clean         # removes dist/
npm run package       # clean + build + ZIP artefact
npm run sync          # manually sync root -> dist/ (RC-015 Phase 1)
npm run sync:verify   # verify root and dist/ are in sync (exits 1 if not)
npm run sync:dry-run  # print what sync would copy without writing
```

> CI/CD note: GitHub Actions jobs run `npm ci` in ephemeral runner environments. This is correct CI behavior - the Runtime-First Policy applies to local development and agent workflows, not CI runners.

---

## 14. Breaking Change Process

**What counts as breaking:**
- Renaming or removing a `chrome.storage.local` key
- Changing the shape of a stored object (removing a required field)
- Renaming or removing a public function called from more than one location
- Changing a setting key in `appSettings` / `DEFAULT_SETTINGS`
- Removing a plugin that has a dashboard widget registered

**7-Step Procedure:**

1. **Identify** - Name every storage key, function signature, or data structure that changes.
2. **Assess impact** - Determine which users are affected.
3. **Write migration** - Idempotent function: read old data -> write new -> delete old key.
4. **Version bump** - Breaking data change = MAJOR. Breaking function signature = MINOR minimum.
5. **Document** - Add to Technical Debt Register if deferred. Add ADR if permanent.
6. **Test migration** - Simulate "existing install" (pre-populate storage with old schema; run new code).
7. **Release** - Include migration notes in changelog entry.

---

## 15. AI Agent Workflow

### Runtime-First Pre-Check (required before ANY build, test, or tool invocation)

- [ ] Check `[root]\Runtime\NodeJS` - does the required tool exist?
- [ ] If yes: invoke from Runtime. Do NOT create `node_modules/` inside this repository.
- [ ] If missing: install INTO Runtime, not here.
- [ ] If Runtime cannot satisfy: document WHY before creating `node_modules/` locally.

### Before Writing Code

- [ ] Read the relevant section(s) of this AGENTS.md
- [ ] Open and read the actual file(s) to be modified - do not guess at content
- [ ] Identify which files are ACTIVE (root) vs INACTIVE (`src/`, `dist/`)
- [ ] Check the Source of Truth Matrix for any state being read or written
- [ ] Check the Forbidden Changes table
- [ ] Check the Technical Debt Register for related open items
- [ ] Identify the correct Priority level (P1-P4)
- [ ] Confirm the change does not require a Breaking Change Process
- [ ] Determine whether MAJOR, MINOR, PATCH, or no version bump is warranted

### After Writing Code

- [ ] Verify the changed file is syntactically valid
- [ ] Verify storage keys match the Storage Schema exactly
- [ ] Complete the Plugin Release Checklist if a plugin was added or modified
- [ ] Complete the Feature Implementation Checklist if a new feature was added
- [ ] Update the Technical Debt Register if any new debt was introduced
- [ ] Update the Storage Schema and Source of Truth Matrix if any new state was added
- [ ] Update the Plugin Inventory if the plugin version changed
- [ ] Update `CHANGELOG.md` with the change
- [ ] Copy changed root files to `dist/` to keep mirror current
- [ ] Run the Mandatory QA Matrix scenarios relevant to the change
- [ ] Manual QA - verify the affected workflow(s) manually in the extension

---

## 16. QA Requirements

### Mandatory QA Matrix

| Scenario | What to verify |
|----------|---------------|
| Fresh install (no prior storage) | Loads without errors. All plugins show defaults. No "undefined" in UI. |
| Existing install (prior storage) | All user data loads. No data loss. Migrations run without error. |
| Browser restart | All settings and plugin data survive. |
| Popup mode (300 px) | No horizontal scroll. All buttons accessible. Text readable. |
| Popup mode (400+ px) | Full layout usable. All panels accessible. |
| Side panel mode | `body.rc-sidepanel` class applied. Tested at 300, 400, 500, 600, 700+ px. |
| Plugin enable/disable cycle | Widget appears on enable. Removed on disable. Re-enable restores widget. |
| Workspace launch (tab-group mode) | Tabs open. Tab group created and named. Stats incremented. |
| Workspace launch (individual mode) | Tabs open. No tab group created. Stats incremented. |
| Import / Export | Export produces valid JSON. Import creates profiles. Duplicate IDs handled. |
| Settings persistence | Every setting change survives a browser restart. |
| Notification system | All four types display and auto-dismiss. |
| Activity log | All significant actions produce a log entry. Log survives session. |

### Performance Budget

**Hard rules:**
1. No continuous polling - no `setInterval` without documented justification and max 60-second interval.
2. No unmanaged timers - every `setTimeout` and `setInterval` stored and cleared on cleanup.
3. No unmanaged event listeners - listeners on `document`/`window` tracked and removed when UI is removed.
4. No synchronous storage reads - `chrome.storage.local` is always async.
5. No DOM queries inside tight loops - cache `getElementById` results outside loops.

**Current budget:**

| Metric | Budget | Actual | Status |
|--------|--------|--------|--------|
| `dashboard.js` line count | < 5,500 | ~5,399 | OK |
| `setInterval` calls | <= 2 | 0 | OK |
| Storage reads on load | <= 5 batched | ~3 batched | OK |
| Storage reads per user action | 0 (use in-memory) | 0 | OK |

### UI/UX Conventions

- **Tooltips:** Every interactive element must include a `title` attribute.
- **Theme:** 12 themes supported. Applied synchronously before render via `applyTheme()`. No flicker.
- **Navigation:** `navigateTo(viewId)` persists the last view.
- **Plugin visibility:** `applyPluginVisibility()` controls nav items, widgets, and action cards.
- **Diagnostics view:** Always reloads fresh data - not restored from session.

---

## 17. Release Process

### Plugin Release Checklist

- [ ] Plugin added to `PLUGINS[]` array in `dashboard.js`
- [ ] Plugin view HTML added to `dashboard.html` using **platform standard structure** (§ 11 Plugin UI Standards):
  - [ ] View uses `.rc-view.rc-plugin-page`
  - [ ] Header uses `.rc-plugin-header` with `.rc-plugin-header__icon`, `.rc-plugin-header__name`
  - [ ] Header includes `.rc-plugin-header__version` matching version in `PLUGINS[]`
  - [ ] Header includes `.rc-doc-icon` button with correct `data-doc-view`
  - [ ] No category badge (Productivity, Enterprise, etc.) - version only
  - [ ] Content area uses `.rc-plugin-body`
  - [ ] Loading state uses `.rc-plugin-loading`
  - [ ] Empty states use `.rc-plugin-empty`
  - [ ] Any tabs use `.rc-plugin-tabs` + `.rc-plugin-tab`
  - [ ] Any cards use `.rc-plugin-card`
  - [ ] Actions use `.rc-plugin-action-bar` (primary first)
- [ ] **Primary Workflow Protection verified** (§ 11 Primary Workflow Protection):
  - [ ] Primary function / hero element is the first visible element in the plugin body
  - [ ] Primary actions are visible without scrolling
  - [ ] Guidance / info cards are placed below the primary workflow
  - [ ] No additional interaction steps required to reach primary function vs. previous version
- [ ] Plugin nav button added to `dashboard.html`
- [ ] Dashboard widget card added to `dashboard.html` (`#rc-dashboard-widgets`)
- [ ] Plugin init function added to `dashboard.js` and called from `initPlugins()`
- [ ] Plugin Manager integration verified - plugin appears, toggle works
- [ ] Plugin settings section added to `#view-settings` (if applicable)
- [ ] Storage keys documented in Storage Schema (§ 9)
- [ ] Storage keys added to Source of Truth Matrix (§ 5)
- [ ] Plugin Inventory table (§ 8) updated
- [ ] Activity Log plugin filter `<option>` added to `#activity-plugin-filter`
- [ ] TypeScript source stub created in `src/plugins/<PluginName>/`
- [ ] Plugin added to `src/platform/bootstrap.ts` import chain
- [ ] If content scripts: added to root + `manifest.json` + Content Scripts table (§ 8)
- [ ] If background service: added inline to `background.js` + documented in § 10
- [ ] `AGENTS.md` updated
- [ ] `CHANGELOG.md` updated
- [ ] Platform version bumped to next MINOR
- [ ] Version updated in all Authoritative Version Locations (§ 12)
- [ ] Popup tested: plugin view renders, all interactions work
- [ ] Side panel tested at 300, 400, 500, 600+ px
- [ ] Plugin enable/disable via Plugin Manager verified
- [ ] Documentation Accessibility Standard (§ 27) verified:
  - [ ] Documentation topic added to `plugins/documentation.js`
  - [ ] `PLUGIN_DOC_MAP` entry added in `dashboard.js`
  - [ ] Panel header Docs button present with `data-doc-view` attribute
  - [ ] Dashboard widget Docs button present with `data-doc-view` attribute

### Feature Implementation Checklist

- [ ] Settings impact - new setting? Update `DEFAULT_SETTINGS`, `applySettings()`, `bindSettings()`, HTML.
- [ ] Notification impact - correct type used, user-facing quality.
- [ ] Dashboard impact - affects stats row or widgets? Update HTML and JS.
- [ ] Plugin Manager impact - affects plugin listing? Update `PLUGINS[]`.
- [ ] Side Panel impact - renders correctly at 300-700+ px?
- [ ] Popup impact - renders correctly at 752 px fixed popup width?
- [ ] Storage impact - new storage keys? Update Schema and Source of Truth Matrix.
- [ ] Documentation updated - AGENTS.md, CHANGELOG.md, applicable `docs/` files.
- [ ] Version bump evaluated and recorded in CHANGELOG.md.
- [ ] `dist/` mirror synced.
- [ ] Documentation accessibility - plugin UI exposes a Docs button?

### Release Gate

> Every unchecked item is a hard release blocker.

**Pre-release:**
- [ ] `npm run build` completes without errors
- [ ] `npm run typecheck` produces zero errors
- [ ] Extension loads cleanly - no console errors at startup
- [ ] Navigating all views produces no console errors

**Functional verification:**
- [ ] Popup mode tested - all views accessible, no layout breaks
- [ ] Side panel tested - responsive at 300, 400, 500, 600, 700+ px
- [ ] Dashboard view - stats accurate, widgets visible, quick actions work
- [ ] Plugin Manager - all plugins listed, toggles work, ordering persists
- [ ] Settings view - all settings apply and persist
- [ ] Notification system - toasts appear, history populated
- [ ] Activity log - entries appear, filters work
- [ ] At least one critical workflow tested

**Repository hygiene:**
- [ ] `node_modules/` absent
- [ ] No temporary build artefacts committed
- [ ] `.gitignore` is current

**Documentation:**
- [ ] Platform version identical in all Authoritative Version Locations
- [ ] Plugin versions in `PLUGINS[]` match plugin manifests
- [ ] `CHANGELOG.md` entry complete
- [ ] `AGENTS.md` reflects current project state
- [ ] `dist/` version references match root version references

---

## 18. Technical Debt Register

All 18 original technical debt items (TD-001 through TD-018) have been closed or deferred as of v1.22.1.

Complete record: `docs/TECH-DEBT-RESOLVED.md`

**Deferred items (open risk - not yet resolved):**

| ID | Priority | Status | Summary |
|----|----------|--------|---------|
| TD-003 | Medium | Deferred | Zero automated test coverage. Jest introduced then removed v1.16.0. Manual QA is current strategy. Trigger: first stable release (RC-015 Phase 3). See `AGENTS.md §26`. |

**Active open items:** None beyond the deferred item above.

**Adding new debt:** Open a new TD entry in `docs/TECH-DEBT-RESOLVED.md` with status `Open` and link to it from the relevant section of AGENTS.md.

---

## 19. Long-Term Architecture Direction

**RC-015 migration phases:**

| Phase | Action | Status |
|-------|--------|--------|
| Phase 1 | `postbuild` auto-copies root -> `dist/`; `npm run sync:verify` gate before release | Complete v1.11.0 |
| Phase 1.5 (TD-001) | Modular plugin architecture: all plugin logic extracted to `plugins/*.js` modules | Complete v1.17.0, validated v1.18.0 |
| Phase 2 | Migrate plugin modules to TypeScript; Webpack bundles to `dist/dashboard.js`; root plugin files retired | Open - unblocked |
| Phase 3 (RC-018) | Full automated test coverage after first stable release | Deferred until after v1 stable |

**Guiding principles for current changes:**
- New plugin logic: self-contained and stateless where possible (easier to extract in Phase 2)
- New storage keys: follow `rc:plugin:<id>:<key>` convention
- New UI: use existing CSS variable system (no hard-coded colors)
- New features: do not depend on `dashboard.js` globals where a parameter could be passed instead

---

## 20. Related Projects

| Project | Location | Relationship |
|---------|----------|--------------|
| Workspace Starter Prototype | `[root]\WatsonX\WorkspaceStarter` | Original standalone prototype. May contain UI experiments predating ReplyCators integration. Check for drift before copying. |
| ReplyCators Salesforce Extractor | `[root]\WatsonX\ReplyCators-salesforce-extractor` | Source reference for `sf-content.js` (v0.4.3 engine). Not loaded by extension. Do not modify expecting effect on ReplyCators. |

**Cross-project rule:** Changes to shared concepts (storage key naming, plugin manifest schema, launch mode semantics) must be evaluated for impact on all related projects.

---

## 21. Maintenance Requirements

> Permanent and mandatory. Every AGENTS.md update must happen in the same change that triggers it.

| Change | Required AGENTS.md update |
|--------|--------------------------|
| New plugin added | Plugin Inventory (§ 8), Plugin Source Locations (§ 8), Storage Schema (§ 9), Source of Truth Matrix (§ 5), UI Rendering Map (§ 10), Plugin Release Checklist (§ 17) |
| New page / view added | UI Rendering Map (§ 10) |
| New background service | Background Worker section (§ 10) |
| Storage key added or changed | Storage Schema (§ 9), Source of Truth Matrix (§ 5) |
| Architecture change | Architecture Decisions (§ 6), Forbidden Changes (§ 11) |
| Build process change | Runtime & Build Environment (§ 13) |
| Content script change | Content Scripts table (§ 8) |
| Version bump | Plugin Inventory versions (§ 8), Project Overview version (§ 1) |
| New ADR raised | Architecture Decisions (§ 6) |
| New technical debt | Technical Debt Register (§ 18) |
| Testing strategy change | § 26 Testing Strategy |
| Plugin UI standard change | Plugin UI Standards (§ 11), PLUGIN-SDK.md, `styles/platform.css` |
| New shared plugin component | Plugin UI Standards (§ 11), PLUGIN-SDK.md approved classes table |

---

## 22. Priority Framework

| Level | Label | Description | SLA |
|-------|-------|-------------|-----|
| P1 | Critical | Data loss, silent corruption, crash on load, broken launch path, security issue | Fix immediately |
| P2 | High | Broken core feature, broken plugin lifecycle, regression from previous version | Fix before any new feature work |
| P3 | Medium | Missing new feature, UX degradation, non-blocking bug, incorrect display | Current or next cycle |
| P4 | Low | Documentation gap, cosmetic issue, technical debt cleanup | Batch with related work |

**Conflict resolution:** Higher priority wins. Equal priority -> more users unblocked wins. Still tied -> fewer lines of change wins. Still tied -> escalate.

---

## 23. Documentation Map

### Engineering Documentation

| File | Purpose | AI context load |
|------|---------|----------------|
| `AGENTS.md` | This file. Agent briefing, governance, standards. | Always |
| `CHANGELOG.md` | Authoritative change history. | Always (trimmed) |
| `README.md` | Project overview, quick start, plugin table. | On-demand |
| `SECURITY.md` | Security policy, threat model, data handling, vulnerability reporting. | On-demand (security tasks) |
| `docs/AI-PLUGIN-KIT.md` | Primary guide for AI agents creating/maintaining plugins. | On-demand (plugin tasks) |
| `docs/ARCHITECTURE.md` | Full architecture reference, layer stack, component descriptions. | On-demand |
| `docs/DEVELOPER_GUIDE.md` | Step-by-step plugin authoring guide. | On-demand |
| `docs/CONTRIBUTING.md` | Contribution workflow, branching strategy, versioning, commit format. | On-demand |
| `docs/CONTRIBUTOR-ONBOARDING.md` | Human contributor onboarding guide. First-week checklist, GitHub workflow, AI development expectations, Definition of Done. | On-demand (new contributors) |
| `docs/PROMPT-CATALOG.md` | AI prompt governance catalog. Versioned, reviewed prompts for all common development workflows. | On-demand (AI-assisted tasks) |
| `docs/STARTUP-FLOW.md` | Full boot sequence, plugin load order, service worker lifecycle. | On-demand |
| `docs/STORAGE.md` | Complete storage schema: all keys, namespaces, platform settings. | On-demand |
| `docs/SETTINGS.md` | Full settings reference: all settings, options, defaults. | On-demand |
| `docs/THEMES.md` | Theme system, available themes, CSS custom properties. | On-demand |
| `docs/TROUBLESHOOTING.md` | Common issues and fixes for all plugins and the platform. | On-demand |
| `docs/INSTALLATION.md` | Prerequisites, build steps, loading in Edge. | On-demand |
| `docs/PACKAGING.md` | Packaging, distribution, and pre-release versioning checklist. | On-demand |
| `docs/FONT-STRATEGY.md` | Font availability audit, fallback behavior, strategy decision. | On-demand |
| `docs/STORAGE-MIGRATION-ROADMAP.md` | Storage namespace migration plan for future MAJOR release. | On-demand |
| `docs/WORKING_DIRECTORY.md` | File sync policy between root and `dist/`. | On-demand |
| `docs/ICON-SYSTEM.md` | Authoritative icon system reference - two-tier policy, registry, renderer. | On-demand (icon tasks) |
| `docs/ADR-008-plugin-module-architecture.md` | ADR for plugin modularization (TD-001). See also § 6 ADR-008 entry. | On-demand |
| `docs/adr/ADR-TEMPLATE.md` | Lightweight ADR template. Copy to `docs/adr/ADR-NNN-title.md` to create a new record. | On-demand (ADR tasks) |
| `docs/adr/ADR-009-prompt-catalog.md` | ADR-009: Decision to introduce the AI Prompt Governance Catalog. | On-demand |
| `docs/reports/engineering-assessment-2026-01.md` | Engineering organization assessment (2026-01). Maturity score, RACI, governance artifacts, scaling readiness. | On-demand (governance tasks) |
| `docs/TECH-DEBT-RESOLVED.md` | Archive of closed/deferred technical debt items. TD-003 is deferred. | Archive-only |
| `docs/CHANGELOG-ARCHIVE.md` | Archive. Full verbose changelog entries for versions below v1.27.2. | Archive-only |
| `docs/BOB-HELPER-SERVER.md` | Consolidated technical reference for `tools/bob-helper-server.js`. | On-demand (Bob Helper tasks) |
| `PLUGIN-SDK.md` | Plugin SDK Standards - platform standards, generator reference, Example Plugin baseline. | On-demand |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist template - Release Gate embedded as checkboxes. | On-demand (PR tasks) |
| `.github/CODEOWNERS` | File ownership map for high-risk files requiring mandatory review. | On-demand (governance tasks) |
| `tools/create-plugin.js` | Optional scaffolding generator. `npm run create-plugin`. | On-demand |
| `tools/bob-helper.ps1` | PowerShell management script: check/start/stop/status/install/uninstall for Bob Helper server. | On-demand (Bob Helper tasks) |

### Plugin Documentation

| File | Plugin |
|------|--------|
| `docs/plugins/salesforce-case-extractor.md` | Salesforce Case Extractor |
| `docs/plugins/cloudability-orgid.md` | Cloudability OrgID |
| `docs/plugins/bookmark-finder.md` | Edge Bookmark Finder |
| `docs/plugins/apptio-upgrade-calculator.md` | Apptio Calculator |
| `docs/plugins/workspace-starter.md` | Workspace Starter |
| `docs/plugins/tab-search.md` | Tab Search |
| `docs/plugins/snake.md` | Snake |
| `docs/plugins/marketplace.md` | Marketplace |
| `docs/plugins/apptio-docs-finder.md` | Apptio Documentation Finder |
| `docs/plugins/backup-restore.md` | Backup & Restore |

### User Documentation (In-Extension)

`plugins/documentation.js` - In-extension Documentation plugin - 20 topics, grouped navigation (GET STARTED, CORE FEATURES, PLUGINS, PLUGIN DEVELOPMENT, SUPPORT).

**Documentation update policy:** For every change, all applicable documents above must be updated. No release may be published with stale documentation.

**Help & Documentation co-update rule:** Whenever features, navigation, plugins, settings, or workflows change, `plugins/documentation.js` must be updated in the same task.

---

## 23-A. Documentation Maintenance Rules

> Mandatory. Binding on all agents and contributors.

A code change is **not done** until the documentation reflects the new behavior.

### What Must Be Updated

| Change type | Required documentation update |
|-------------|-------------------------------|
| New plugin | `AGENTS.md § 8`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, create `docs/plugins/<name>.md`, add topic to `plugins/documentation.js` PLUGINS group |
| Plugin behavior change | `AGENTS.md § 8`, `docs/ARCHITECTURE.md`, plugin-specific doc, `CHANGELOG.md`, update topic in `plugins/documentation.js` |
| Storage key added / changed | `docs/STORAGE.md`, `docs/ARCHITECTURE.md`, `AGENTS.md § 9` |
| Settings added / changed | `docs/SETTINGS.md`, `CHANGELOG.md`, update Settings topic in `plugins/documentation.js` |
| UI or navigation change | `docs/ARCHITECTURE.md`, `AGENTS.md § 10`, update `plugins/documentation.js` |
| New platform feature / view | Update relevant topic in `plugins/documentation.js` Core Features group |
| Startup flow change | `docs/STARTUP-FLOW.md`, `AGENTS.md § 3` |
| Theme added | `docs/THEMES.md`, `CHANGELOG.md`, update Settings topic themes list |
| Architecture decision | Create or update relevant ADR in `docs/ADR-*.md` |
| Version bump | `manifest.json`, `dashboard.html` version display, `CHANGELOG.md` header |

### Anti-Drift Enforcement

| Violation | Required action |
|-----------|----------------|
| Plugin Inventory in `AGENTS.md § 8` shows old version | Update version on every plugin release |
| `docs/ARCHITECTURE.md` describes a removed feature | Remove or correct the description |
| `docs/STORAGE.md` missing a new plugin storage key | Add the key on the same commit as the code |
| `plugins/documentation.js` shows features that no longer work | Update in-extension documentation |
| `AGENTS.md` version field out of sync with `manifest.json` | Keep in sync on every release |

### Checklist Before Marking Any Task Complete

1. Re-read § 23-A.
2. Identify every document from the table above that applies.
3. Update each affected document.
4. If adding a new plugin: create `docs/plugins/<name>.md` and add topic to `plugins/documentation.js`.
5. If user-facing behavior changed: update topic content and add Release Notes entry.
6. Never leave a topic describing behavior no longer present in the runtime.

---

## 24. Known Limitations

- Content scripts are plain JavaScript IIFEs - they cannot use ES modules or TypeScript imports directly.
- **Bob execution requires `tools/bob-helper-server.js` to be running.** Execute button sends `RC_EXECUTE_BOB` -> `background.js` -> HTTP POST to `http://127.0.0.1:47123/execute`. Recommended start: `powershell -ExecutionPolicy Bypass -File tools\bob-helper.ps1 start`. Run `bob-helper.ps1 check` to validate all prerequisites on a new machine. Direct start: `node tools\bob-helper-server.js` (advanced use). New machine: verify `node --version`, `bob --version`, and `curl http://127.0.0.1:47123/health` before using Execute.
- **`REPLYCATORS_PS_EXEC_POLICY` env var controls the PowerShell execution policy for Bob spawns.** Defaults to `Bypass`. Setting to `AllSigned` or `Restricted` causes all Execute requests to fail silently - the unsigned launcher script is blocked. See `docs/BOB-HELPER-SERVER.md` Environment Variables section.
- The flat-deployment model requires `build/sync-root.js` to keep root-level files and `dist/` in sync. Run `npm run sync` after manual root edits.
- `chrome.storage.local` has a 5 MB quota shared across the extension.
- Cloudability OrgID retrieval requires an active (focused) Cloudability browser tab. Background/inactive tabs are intentionally ignored.
- No automated test coverage - validation is manual QA only until the first stable release.
- Custom font options silently fall back to Segoe UI on machines where those fonts are not installed.
- **Background worker logs are not surfaced in the dashboard Activity Log.** `background.js` maintains its own internal `logEntries[]` array (max 2000 entries, written via `createLogger()` and the EventBus). These logs cover OrgID enrichment, Bob execution, and SF download tracking. They are invisible to the user in the Activity Log view, which only shows `dashboard.js` `logStore[]` entries. A `RC_LOG_ENTRY` bridge message would be required to unify them (F-014, deferred).

---

## 25. Extension Compatibility Rules

> Permanent and mandatory.

**Microsoft Edge and Chrome refuse to load any extension containing a folder with a name beginning with `__`.**

| Forbidden | Use instead |
|-----------|-------------|
| `__tests__/` | `tests/` |
| `__mocks__/` | `mocks/` |
| `__fixtures__/` | `fixtures/` |
| `__helpers__/` | `helpers/` |
| Any `__<name>__/` | `<name>/` |

This applies regardless of framework convention. Jest's `__tests__/`, Node's `__mocks__/`, and any `__`-prefixed folder will break extension loading.

---

## 26. Testing Strategy

**Current strategy: Manual QA + Exploratory Testing**

Automated testing is intentionally postponed until after the first stable release.

### Manual QA Checklist

- [ ] Load extension at `edge://extensions/` - no errors reported
- [ ] Open popup/side panel - no console errors at startup
- [ ] Navigate to affected view(s) - verify expected behavior
- [ ] Trigger the changed workflow end-to-end
- [ ] Close and reopen - verify persistence
- [ ] Check affected plugin widget on Dashboard
- [ ] Verify no unrelated views broke (spot-check)

### AI Agent Rule - Do Not Introduce Testing Infrastructure

> Binding on all AI agents.

**MUST NOT (without explicit owner instruction):**
- Introduce Jest or any testing framework
- Create `tests/`, `test/`, `mocks/`, `fixtures/` folders for automated tests
- Add any test runner to `package.json`
- Add test execution job to `.github/workflows/ci.yml`

**MAY:**
- Suggest areas that would benefit from automated tests
- Note a testing gap in the Technical Debt Register
- Describe what a test would cover without writing it

**Bug discovery workflow:**
1. Investigate.
2. Identify root cause.
3. Implement fix.
4. Validate manually.
5. Document in CHANGELOG.md.

Do not stop at defect discovery. Self-remediation is the expected behavior.

---

## 27. Documentation Accessibility Standard

> Permanent and mandatory. Enforced as a platform rule.
> Plugins not meeting this standard fail the Plugin Release Checklist.

### Requirements

| Requirement | Rule |
|-------------|------|
| Dedicated documentation topic | Every plugin must have a topic in `plugins/documentation.js` under the PLUGINS group (in both `TOPICS_FLAT` and `CONTENT_MAP`) |
| Panel header Docs button | Every plugin view must include `<button class="rc-doc-icon" data-doc-view="plugin-<slug>" ...>` in its `.rc-plugin-header` (standard icon button, not a text button) |
| Dashboard widget Docs button | Every plugin widget card must include `<button data-doc-view="plugin-<slug>" class="rc-btn rc-btn--ghost rc-btn--sm">Docs</button>` in its card header |
| PLUGIN_DOC_MAP entry | Every plugin viewId must be mapped to its documentation topic ID in `PLUGIN_DOC_MAP` in `dashboard.js` |
| No duplicated documentation content | Plugins must not maintain their own inline documentation |
| Centralized routing | `navigateToPluginDoc(viewId)` is the only permitted navigation function for documentation |
| Works in both modes | Documentation navigation must work in both Popup and Side Panel mode |

### Forbidden

- Adding a plugin without a documentation topic
- Adding a plugin without panel header and widget card Docs buttons
- Adding a plugin without a `PLUGIN_DOC_MAP` entry
- Maintaining inline documentation content inside a plugin view or tab
- Hardcoding `navigateTo('documentation')` without pre-selecting a topic
- Using any documentation system other than `plugins/documentation.js`

`PLUGIN_DOC_MAP` in `dashboard.js` must be updated whenever: a new plugin is added, a documentation topic ID changes, or a plugin viewId changes.

---

## 28. ASCII Punctuation Standard

> Permanent and mandatory. Binding on all agents and contributors.

### Rule

Use only the standard ASCII hyphen `-` (U+002D) for all separators and dashes in every user-facing string.

**Prohibited characters (do not use in user-facing strings):**

| Unicode | Name | Example of wrong usage | Use instead |
|---------|------|------------------------|-------------|
| U+2014 | Em dash | `"Preview Catalog — Not Installable"` | `"Preview Catalog - Not Installable"` |
| U+2013 | En dash | `"last 30 days"` (with en dash between words) | `"last 30 days"` |

### Scope - User-facing strings (mandatory)

Every string rendered to the user must comply. This includes:

- `dashboard.html` - all visible text, `title` attributes, `placeholder` attributes, ARIA labels, static element content
- `dashboard.js` - all string literals assigned to `.textContent`, `.innerHTML`, `.title`, `detail:`, `description:`, notification/toast messages, diagnostics output strings
- `plugins/documentation.js` - all documentation content (entire file is user-rendered)
- All `plugins/*.js` files - notification messages, toast content, status strings, tooltip strings, error messages, plugin `description` field values, inline HTML strings, empty-state messages, banner text
- `plugins/shared/icon-helper.js` - any user-visible label strings

### Scope - Comments (advisory, not mandatory)

Source code comments (`// ...`, `/* ... */`, `<!-- ... -->`) are **excluded** from the mandatory rule.

Replace em/en dashes in comments when you are already modifying a file for another reason. Do not make comment-only cleanup passes through unrelated files.

### Enforcement rules

1. **Every new user-facing string must use `-`** - do not introduce em or en dashes in any string that will be rendered in the UI.
2. **Plugin descriptions in `PLUGINS[]`** - the `description` field is shown in Plugin Manager and the Marketplace. Use `-` only.
3. **Diagnostics `detail` strings** - shown verbatim in the Diagnostics panel. Use `-` only.
4. **Documentation content** - all content in `plugins/documentation.js` template literals is user-rendered HTML. Use `-` only.
5. **Placeholder values** (the `U+2014` em dash character was previously used as a "not yet loaded" placeholder in HTML elements) - use `-` only.
6. **Notification titles and bodies** - both arguments to `addNotification()` and `showToast()` must use `-` only.

### Verification

**Quick file check:**
```powershell
Select-String -Path "path\to\file" -Pattern "[\u2013\u2014]" | Select-Object LineNumber, Line
```

**Repository-wide audit of all user-facing plugin files:**
```powershell
$targets = @(
  "dashboard.html", "dashboard.js",
  "plugins\apptio-docs-finder.js", "plugins\apptio-upgrade-calculator.js",
  "plugins\backup-restore.js", "plugins\bookmark-finder.js",
  "plugins\cloudability-orgid.js", "plugins\documentation.js",
  "plugins\env-dashboards.js", "plugins\example-plugin.js",
  "plugins\marketplace.js", "plugins\salesforce-case-extractor.js",
  "plugins\snake.js", "plugins\tab-search.js",
  "plugins\workspace-starter.js", "plugins\shared\icon-helper.js"
)
foreach ($f in $targets) {
  $n = 0
  foreach ($c in (Get-Content $f -Raw -Encoding UTF8).ToCharArray()) {
    if ([int]$c -eq 0x2013 -or [int]$c -eq 0x2014) { $n++ }
  }
  if ($n -gt 0) { Write-Host "FAIL: $f - $n occurrences" }
}
Write-Host "Audit complete."
```

**Acceptance criteria:** The above script must print only `Audit complete.` with no `FAIL:` lines.
