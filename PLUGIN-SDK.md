# ReplyCators - Plugin SDK Standards

## Sections

- Overview
- AI Plugin Kit
- Scaffolding Generator
- Example Plugin
- Icon Policy
- Platform Standards
- Lifecycle
- Storage
- Logging
- Notifications
- Governance

---

## Overview

This file defines non-negotiable platform standards every plugin must follow.
For creation, migration, or maintenance workflows, start with [`docs/AI-PLUGIN-KIT.md`](docs/AI-PLUGIN-KIT.md).

---

## AI Plugin Kit

`docs/AI-PLUGIN-KIT.md` is the primary plugin guide. It covers:

- Creating a plugin from the Example Plugin
- Creating a plugin from scratch
- Converting an existing browser extension into a plugin
- Maintaining an existing plugin
- Architecture summaries, step-by-step workflows, security, accessibility, reusable AI prompts, and validation checklist

---

## Scaffolding Generator

`npm run create-plugin` creates an initial plugin file from the Example Plugin baseline. It is optional - not the complete workflow.

```powershell
npm run create-plugin
npm run create-plugin -- --name "My Plugin" --id my-plugin --type widget
```

Modes: `basic` | `widget` | `settings`
Flags: `--settings`, `--storage`, `--author`, `--description`, `--icon`

### Validation rules

- Plugin ID: `com.replycators.<slug>` - lowercase, digits, hyphens only, max 64 chars
- Rejects: path traversal, reserved IDs, existing plugin IDs, Example Plugin ID
- Rollback: removes any partially created file on failure; no shared files modified
- The Example Plugin is never overwritten

### Synchronization rule

If you change the lifecycle pattern in the Example Plugin, update `tools/create-plugin.js` to match.

| Edit target | File |
|---|---|
| Plugin lifecycle contract | `plugins/example-plugin.js` AND `tools/create-plugin.js` |
| Generator argument handling | `tools/create-plugin.js` only |
| Platform standards | `PLUGIN-SDK.md` |
| Full creation guide | `docs/AI-PLUGIN-KIT.md` |

---

## Example Plugin

**File:** `plugins/example-plugin.js`
**Plugin ID:** `com.replycators.example-plugin`

The Example Plugin is the canonical verified reference. Every plugin must be modeled on its structure.

Requirements:
- Must be free from unresolved template tokens
- Must be loadable without any generator or build step
- Must remain the smallest complete reference implementation

---

## Icon Policy

All icons must use **Streamline Ultimate Colors - Free** through the local asset library, central semantic registry, and shared renderer.

| Property | Value |
|---|---|
| Pack | Streamline Ultimate Colors - Free |
| License | CC BY 4.0 - attribution required |
| Local folder | `assets/icons/streamline-ultimate-colors-free/` |
| Registry | `plugins/shared/icon-helper.js` - `ICON_REGISTRY` |
| Renderer | `window.ReplyCatorsIconHelper.renderIcon()` |

### Plugin icon metadata

Every `PLUGINS[]` entry must declare `icon` as a semantic ID:

```javascript
icon: 'plugins.myFeature',  // semantic ID from ICON_REGISTRY
```

### Usage in plugin markup

```html
<!-- Declarative -->
<span data-icon="actions.copy" aria-hidden="true" class="rc-widget-icon"></span>
```

```javascript
// Programmatic (for markup injected after DOMContentLoaded)
window.ReplyCatorsIconHelper.renderIcon(spanElement, 'actions.copy', 16);
```

### Adding a new icon

1. Search registry in `plugins/shared/icon-helper.js` - reuse if possible
2. If no match, obtain asset only from Streamline Ultimate Colors - Free
3. Store in `assets/icons/streamline-ultimate-colors-free/`
4. Add semantic ID to `ICON_REGISTRY`
5. Preserve attribution in `THIRD_PARTY_NOTICES.md`
6. Verify offline operation after `npm run sync`

### Prohibited

Lucide, Google Material, emoji as UI icons, Unicode pictographs as UI icons, handwritten SVG, remote URLs, icon fonts, private per-plugin icon registries.

---

## Platform Standards

A plugin is **not complete** if it introduces any of:

- Custom design language
- Custom spacing scale
- Custom toast or notification system
- Custom logger
- Inconsistent action placement
- Inconsistent empty, loading, or error states
- Custom header (replacing `.rc-plugin-header`)
- Custom tab system (replacing `.rc-plugin-tabs`)
- Custom card layout (replacing `.rc-plugin-card`)
- Custom empty state (replacing `.rc-plugin-empty`)
- Custom loading state (replacing `.rc-plugin-loading`)
- Missing `.rc-plugin-header__version` (version is mandatory on every plugin)
- Category badge in header (Productivity, Enterprise, etc.) instead of version

### Primary Content First (mandatory)

The primary plugin function must be the first visible element in the plugin body. Platform standards govern structure - they must not demote business value.

**Non-negotiable content order inside `.rc-plugin-body`:**

1. **Hero element** - the main data display, primary input, or primary action
2. **Primary actions** - Refresh, Copy, Search, Launch, Extract, Run, Generate
3. **Supporting metadata** - org name, timestamps, source labels
4. **Status indicators**
5. **Guidance / how-it-works** - `.rc-info-cards`, `.rc-info-card` blocks
6. **Documentation links and advanced content**

**A plugin fails UX review when:**
- Help content is more prominent than primary functionality
- Informational cards appear before the primary data display
- Primary actions require scrolling to reach
- The user must expand a section to access the primary workflow

### Plugin page structure (mandatory)

Every plugin view must use this wrapper pattern:

```html
<div class="rc-view rc-plugin-page" id="view-plugin-<slug>">
  <div class="rc-plugin-header">
    <span class="rc-plugin-header__icon"><span data-icon="..." aria-hidden="true" class="rc-widget-icon"></span></span>
    <span class="rc-plugin-header__name">Plugin Name</span>
    <!-- MANDATORY: release version pill - must match PLUGINS[] version -->
    <span class="rc-plugin-header__version">v1.0.0</span>
    <!-- optional: dynamic status badge - only when live status to report -->
    <span class="rc-badge rc-badge--blue">Status</span>
    <!-- MANDATORY: documentation button -->
    <button class="rc-doc-icon" data-doc-view="plugin-<slug>" title="..." aria-label="...">
      <span data-icon="navigation.documentation" aria-hidden="true" style="display:block;width:16px;height:16px;"></span>
    </button>
  </div>

  <!-- Optional: primary action bar - place above rc-plugin-body for above-the-fold actions -->
  <div class="rc-plugin-action-bar" style="padding:10px 16px 0;">
    <button class="rc-btn rc-btn--primary rc-btn--sm">Primary Action</button>
  </div>

  <div class="rc-plugin-body" id="<prefix>-container">
    <!-- 1. HERO ELEMENT first -->
    <!-- 2. Supporting metadata -->
    <!-- 3. Guidance / info cards last -->
    <div class="rc-plugin-loading"><span data-icon="states.loading" aria-hidden="true"></span> Loading...</div>
  </div>
</div>
```

**Forbidden header patterns:**

| Forbidden | Use instead |
|-----------|-------------|
| `<span class="rc-badge rc-badge--blue">Productivity</span>` | `<span class="rc-plugin-header__version">v1.0.0</span>` |
| Omitting `__version` | Always include version - see Plugin Identity Standard |
| Slim header with no `__name` | Full header with icon + name + version always |

### Approved UI classes

| Purpose | Standard class | Notes |
|---|---|---|
| Plugin page wrapper | `.rc-plugin-page` | Always alongside `.rc-view` |
| Plugin header | `.rc-plugin-header` | Replaces `.rc-panel-header` for plugins |
| Header icon | `.rc-plugin-header__icon` | Wraps `data-icon` span |
| Header name | `.rc-plugin-header__name` | Plugin display name - `flex:1`, always visible |
| Header version | `.rc-plugin-header__version` | **Mandatory** - semantic version e.g. `v1.0.2` |
| Content body | `.rc-plugin-body` | Scrollable. Replaces `.rc-panel-body` |
| Section | `.rc-plugin-section` | Groups title + content |
| Section header | `.rc-plugin-section__header` | Title row |
| Section title | `.rc-plugin-section__title` | Uppercase muted label |
| Section actions | `.rc-plugin-section__actions` | Right-aligned button row |
| Card | `.rc-plugin-card` | Surface card (header/body/footer) |
| Card header | `.rc-plugin-card__header` | |
| Card title | `.rc-plugin-card__title` | |
| Card meta | `.rc-plugin-card__meta` | Source/type pill |
| Card body | `.rc-plugin-card__body` | |
| Card footer | `.rc-plugin-card__footer` | Action row |
| Action bar | `.rc-plugin-action-bar` | Primary action always first |
| Action spacer | `.rc-plugin-action-bar__spacer` | Pushes secondary actions right |
| Tab bar | `.rc-plugin-tabs` | Replaces all custom tab bars |
| Tab button | `.rc-plugin-tab` | |
| Active tab | `.rc-plugin-tab--active` | |
| Tab panel | `.rc-plugin-tab-panel` | |
| Active panel | `.rc-plugin-tab-panel--active` | |
| Empty state | `.rc-plugin-empty` | No-data state |
| Empty title | `.rc-plugin-empty__title` | |
| Empty body | `.rc-plugin-empty__body` | |
| Loading state | `.rc-plugin-loading` | Loading indicator |
| Status strip | `.rc-plugin-status` | Modifiers: `--success/warning/error/info` |
| Key-value row | `.rc-plugin-kv` | Metadata display rows |
| Stat tile | `.rc-plugin-stat` | Numeric stat with label |
| Stats row | `.rc-plugin-stats-row` | Container for stat tiles |
| List | `.rc-plugin-list` | Scrollable item list |
| List item | `.rc-plugin-list-item` | Full-row interactive item (RC-UX010) |
| Buttons | `.rc-btn` variants | `--primary`, `--secondary`, `--ghost`, `--danger`, `--sm`, `--xs` |
| Forms | `.rc-form-group`, `.rc-label`, `.rc-input`, `.rc-textarea`, `.rc-helper-text` | |
| Badges | `.rc-badge` variants | `--blue`, `--green`, `--amber`, `--red` |
| Status blocks | `.rc-status` variants | `--neutral`, `--success`, `--error`, `--warning` |
| Info cards | `.rc-info-card` | How-it-works explanatory blocks |

---

## Lifecycle

| Method | Called by | When | Async I/O |
|---|---|---|---|
| `init()` | `dashboard.js` `_safeInit()` | Once at `DOMContentLoaded` | Forbidden |
| `render()` | `dashboard.js` `navigateTo()` | On navigate to plugin view | Allowed |
| `onNavigate()` | `dashboard.js` `navigateTo()` | On navigate to plugin view | Allowed |
| `onLeave()` | `dashboard.js` leave block | When navigating away | Allowed |

**Lazy-init rule:** `init()` must bind UI controls only. Defer all async I/O to `onNavigate()` or `render()`.

---

## Storage

All plugin storage keys must follow:

```
rc:plugin:<plugin-id>:<key>
```

Plugins must never write to `rc:session:*` - that namespace is owned by `dashboard.js`.

---

## Logging

Approved API: `app().addLog(level, pluginId, message)`

Allowed levels: `debug` | `info` | `warn` | `error`

Forbidden: `console.log()`, `console.warn()`, `console.error()`, plugin-local logger wrappers.

---

## Notifications

Approved APIs: `app().addNotification(title, message, type, pluginId)` / `app().showToast(message, type, title)`

Allowed types: `success` | `info` | `warning` | `error`

Forbidden: plugin-specific toast containers, custom animation systems, custom color semantics.

---

## Governance

Code review must reject any plugin that bypasses these standards without a documented exception.
Snake may remain visually nostalgic but must still follow logging, notification, spacing, and accessibility standards.
