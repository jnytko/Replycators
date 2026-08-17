# ReplyCators AI Plugin Kit

## Sections

- Purpose and use cases
- Icon system
- Architecture summary
- AI agent operating rules
- Repository discovery workflow
- Example Plugin guide
- Workflow A - Create from Example Plugin
- Workflow B - Create from scratch
- Workflow C - Convert an existing extension
- Extension component classification
- Plugin registration
- Lifecycle implementation
- UI and navigation integration
- Settings integration
- Storage integration
- Messaging and events
- Permissions and security
- Accessibility and localization
- Cleanup and resource ownership
- Manual validation checklist
- Troubleshooting
- Marketplace limitations
- Reusable AI prompts
- Optional scaffolding tool

---

## Purpose and use cases

Entry point for AI coding agents and developers creating, migrating, or maintaining ReplyCators plugins.

Source of truth order: runtime implementation → first-party plugins → Example Plugin → documentation. If any source conflicts with the runtime, the runtime wins.

| Use case | Section |
|---|---|
| Understand how plugins work | §Architecture, §Example Plugin |
| Create a plugin from Example Plugin | §Workflow A |
| Create a plugin from scratch | §Workflow B |
| Convert an existing browser extension | §Workflow C |
| Extend or maintain an existing plugin | §Validation, §Troubleshooting |

---

## Icon system

All icons must use **Streamline Ultimate Colors - Free** through the local asset library, central semantic registry, and shared renderer. This policy is non-negotiable.

| Property | Value |
|---|---|
| Pack | Streamline Ultimate Colors - Free |
| License | CC BY 4.0 - attribution required |
| Local folder | `assets/icons/streamline-ultimate-colors-free/` |
| Registry | `plugins/shared/icon-helper.js` - `ICON_REGISTRY` |
| Renderer | `window.ReplyCatorsIconHelper.renderIcon()` |

Plugin PLUGINS[] entry must declare `icon` as a semantic ID:
```javascript
icon: 'plugins.myFeature',  // semantic ID from ICON_REGISTRY - NOT an emoji or path
```

Prohibited: Lucide, Google Material, emoji, Unicode pictographs, handwritten SVG, remote URLs, icon fonts, private plugin icon registries.

Full policy: `docs/ICON-SYSTEM.md`.

---

## Architecture summary

### Active runtime

| File | Role |
|---|---|
| `manifest.json` | Extension manifest. Declares `background.js` as service worker, `dashboard.html` as popup. |
| `dashboard.html` | Popup HTML shell. Pre-declares all views and containers. Loads plugin scripts before `dashboard.js`. |
| `dashboard.js` | Application orchestrator. Owns startup, navigation, settings, plugin registry (`PLUGINS[]`), visibility, ordering, notifications, logs, diagnostics. |
| `plugins/*.js` | Plugin runtime modules. Each is a self-contained IIFE. |
| `background.js` | Background service worker. Handles messaging, OrgID enrichment, context menus. |
| `styles/platform.css` | CSS variables, themes, layout primitives. |
| `styles/dashboard.css` | Dashboard-specific styles. |

**`src/` is inactive** - TypeScript stubs for a future migration. Editing `src/` has zero effect.

### Plugin architecture

```
window.ReplyCatorsPlugins.<RegistrationKey> = plugin object
window.ReplyCatorsApp                        = shared platform services
```

### Platform services (window.ReplyCatorsApp)

| Method/Property | Description |
|---|---|
| `addLog(level, pluginId, message)` | Write to Activity log |
| `addNotification(title, msg, type, pluginId)` | Post notification and toast |
| `showToast(message, type, title)` | Show dismissible toast only |
| `navigateTo(viewId)` | Navigate to a view |
| `getSetting(key)` | Read a platform setting |
| `getAppSettings()` | Read full settings object |
| `pluginStates` | `{ [pluginId]: { enabled } }` |
| `esc(str)` | HTML-escape a string (XSS prevention) |
| `setStatus(el, msg, type)` | Update a status element |
| `RC_STORE` | Storage key constants |

Do not call `dashboard.js` functions directly. Do not access any other globals.

### PLUGINS[] entry format

```javascript
{
  id:          'com.replycators.<slug>',   // permanent - never change after release
  name:        'Display Name',
  version:     '1.0.0',
  description: 'One-line description.',
  author:      'Author name',
  category:    'productivity',
  tags:        ['tag1', 'tag2'],
  icon:        'plugins.examplePlugin',   // semantic ID from icon-helper.js registry
  viewId:      'plugin-<slug>',
}
```

### Storage

Plugin keys must follow `rc:plugin:<plugin-id>:<key>`. Never write to `rc:session:*`.

---

## AI agent operating rules

```
REPLYCATORS AI AGENT RULES - READ BEFORE MODIFYING ANY FILE

1. INSPECT FIRST. Read dashboard.js (PLUGINS[], navigateTo(), _safeInit block),
   dashboard.html (view containers, widget cards, script loading), and
   plugins/example-plugin.js before writing any code.

2. ACTIVE RUNTIME IS THE ROOT. The browser loads from the repository root.
   Never edit src/ expecting live behavior. Never edit dist/ directly.

3. PLATFORM SERVICES ONLY. Plugins communicate through window.ReplyCatorsApp.
   Never call dashboard.js functions directly. Never create new globals outside
   window.ReplyCatorsPlugins.<YourUniqueKey>.

4. STORAGE NAMESPACE. All plugin storage keys must be:
   rc:plugin:<your-plugin-id>:<key>
   Never write to rc:session:* - those keys are owned by dashboard.js.

5. LAZY-INIT PATTERN. init() is synchronous. No async I/O in init().
   Defer chrome.storage.local.get(), chrome.tabs.query(), and all async
   operations to onNavigate() or render().

6. LIFECYCLE METHODS ONLY. Supported: init, render, onNavigate, onLeave.
   Do not invent lifecycle methods.

7. PRESERVE OWNERSHIP BOUNDARIES. Do not modify another plugin's storage,
   DOM, or settings. Do not override the ReplyCatorsApp interface.

8. DO NOT COPY EXTENSION ARCHITECTURE. A browser extension is not a plugin.
   Permissions, background scripts, service workers, content scripts, and
   extension storage require individual architectural decisions.

9. REUSE EXISTING INFRASTRUCTURE. Use addLog(), addNotification(), showToast(),
   navigateTo(), and existing platform CSS classes.

10. DISPOSE LISTENERS. Every event listener, timer, and observer added during
    onNavigate() or render() must be removed in onLeave().

11. PRESERVE ACCESSIBILITY. Use semantic markup, keyboard operation, aria-labels,
    visible focus, and accessible error/status messages.

12. DO NOT INTRODUCE DEPENDENCIES. No npm packages, CDN scripts, or external
    frameworks. The plugin must run as a plain IIFE.

13. NO HARDCODED CREDENTIALS. Do not embed API keys, tokens, or passwords.

14. VALIDATE MANUALLY. After completing the plugin, verify it loads without
    console errors, navigation works, lifecycle fires correctly, and no Example
    Plugin identifiers remain.

15. STATE LIMITATIONS CLEARLY. If a required capability has no direct plugin
    equivalent, state the limitation and propose an architecture decision.
```

---

## Repository discovery workflow

Before creating or modifying any plugin:

```
Step 1. Read AGENTS.md - runtime locations, critical rules, architecture.
Step 2. Read dashboard.js PLUGINS[] array and DEFAULT_PLUGIN_ORDER.
Step 3. Read dashboard.js navigateTo() - how plugins receive navigation events.
Step 4. Read dashboard.js DOMContentLoaded block - _safeInit() calls.
Step 5. Read dashboard.html bottom - script loading order.
Step 6. Read plugins/example-plugin.js - canonical reference implementation.
Step 7. Read at least one first-party plugin (e.g. plugins/tab-search.js).
Step 8. Read docs/STORAGE.md - all storage keys and namespaces.
Step 9. Read docs/PLUGIN-SDK.md - platform standards.
```

Confirm before proceeding:
- The plugin ID does not exist in `PLUGINS[]`
- The registration key does not exist in `window.ReplyCatorsPlugins`
- The destination file `plugins/<slug>.js` does not already exist

---

## Example Plugin guide

**File:** `plugins/example-plugin.js`
**Plugin ID:** `com.replycators.example-plugin`
**Registration key:** `window.ReplyCatorsPlugins.ExamplePlugin`

The Example Plugin is the canonical verified reference. Every new plugin should be modeled after it.

### What the Example Plugin demonstrates

| Capability | Code location |
|---|---|
| IIFE structure | Outer `(function() { 'use strict'; ... })();` |
| Plugin descriptor | `const plugin = { id, init, onNavigate, onLeave }` |
| Platform services access | `function app() { return window.ReplyCatorsApp; }` |
| init() - sync only | Binds widget button and action button |
| onNavigate() | Logs navigation event |
| onLeave() | Logs leave event |
| Self-registration | `window.ReplyCatorsPlugins.ExamplePlugin = plugin;` |

### Identifiers that MUST be changed

| Identifier | Example Plugin value | Rule |
|---|---|---|
| Plugin ID | `com.replycators.example-plugin` | Must be unique; never reuse |
| Registration key | `ExamplePlugin` | Must be unique |
| View ID | `plugin-example` | Must be unique |
| Widget button ID | `ex-widget-open-btn` | `ex-` prefix is Example Plugin only |
| Action button ID | `ex-say-hello` | Must be unique |

---

## Workflow A - Create from Example Plugin

```
Step 1.  Choose a unique slug: lowercase, digits, hyphens only. Example: my-feature

Step 2.  Derive identifiers:
         Plugin ID:        com.replycators.my-feature
         Registration key: MyFeature   (slug to PascalCase)
         View ID:          plugin-my-feature
         DOM prefix:       mf           (initials of slug words)

Step 3.  Optionally scaffold:
         npm run create-plugin -- --name "My Feature" --id my-feature --type widget
         Or copy plugins/example-plugin.js to plugins/my-feature.js manually.

Step 4.  Replace ALL Example Plugin identifiers:
         'com.replycators.example-plugin'  →  'com.replycators.my-feature'
         ExamplePlugin                      →  MyFeature
         'plugin-example'                   →  'plugin-my-feature'
         ex-widget-open-btn                 →  mf-widget-open-btn

Step 5.  Implement plugin logic.
         Keep init() synchronous. Move async I/O to onNavigate().
         Add onLeave() cleanup for any resources acquired in onNavigate().

Step 6.  Add metadata to PLUGINS[] in dashboard.js:
         {
           id: 'com.replycators.my-feature',
           name: 'My Feature',
           version: '1.0.0',
           description: 'What this plugin does.',
           author: 'Author',
           category: 'productivity',
           tags: ['feature'],
           icon: 'plugins.examplePlugin',
           viewId: 'plugin-my-feature',
         },

Step 7.  Add view container to dashboard.html (before </main>):
         <div class="rc-view" id="view-plugin-my-feature">
           <div class="rc-panel-header">
             <span class="rc-panel-title">
               <span data-icon="plugins.examplePlugin" aria-hidden="true" class="rc-widget-icon"></span>
               My Feature
             </span>
           </div>
           <div class="rc-panel-body" id="mf-container"></div>
         </div>

Step 8.  Add widget card to dashboard.html (#rc-dashboard-widgets):
         <div class="rc-widget-card" data-plugin-widget="com.replycators.my-feature">
           <div class="rc-widget-card__header">
             <span class="rc-widget-card__title">My Feature</span>
             <button class="rc-widget-card__open" data-view="plugin-my-feature"
                     title="Open My Feature" aria-label="Open My Feature">↗</button>
           </div>
           <div class="rc-widget-card__body" style="padding:12px 14px 14px;">
             <button id="mf-widget-open-btn" class="rc-btn rc-btn--primary rc-btn--sm"
                     title="Open My Feature">Open My Feature</button>
           </div>
         </div>
         NOTE: Do NOT add a sidebar nav button - applyPluginVisibility() builds it automatically.

Step 9.  Load script in dashboard.html, BEFORE <script src="dashboard.js">:
         <script src="plugins/my-feature.js"></script>

Step 10. Wire lifecycle hooks in dashboard.js:
         a) In the _safeInit block:
            _safeInit('MyFeature', () => window.ReplyCatorsPlugins?.MyFeature?.init?.());

         b) In navigateTo(), navigation delegate block:
            if (view === 'plugin-my-feature')
              window.ReplyCatorsPlugins?.MyFeature?.onNavigate?.();

         c) In navigateTo(), leave block (before currentView is updated):
            if (currentView === 'plugin-my-feature' && view !== 'plugin-my-feature')
              window.ReplyCatorsPlugins?.MyFeature?.onLeave?.();

Step 11. Add plugin filter option to #activity-plugin-filter in dashboard.html:
         <option value="com.replycators.my-feature">My Feature</option>

Step 12. Sync to dist/:
         npm run sync

Step 13. Reload extension at edge://extensions/.
         Verify: no console errors, nav button appears, view renders, lifecycle
         methods fire, widget works, no Example Plugin identifiers remain.
```

### Post-creation identifier checklist

Search new plugin file for these strings - none should appear:
- `com.replycators.example-plugin`
- `ExamplePlugin`
- `plugin-example`
- `ex-widget-open-btn`
- `ex-say-hello`
- `Example Plugin` (except in comments)

---

## Workflow B - Create from scratch

### Minimum required skeleton

```javascript
/**
 * My Plugin
 * plugins/my-plugin.js
 * Plugin ID: com.replycators.my-plugin
 */
(function() {
  'use strict';

  const PLUGIN_ID = 'com.replycators.my-plugin';

  const plugin = { id: PLUGIN_ID, init, onNavigate, onLeave };

  function app() { return window.ReplyCatorsApp; }

  function init() {
    // Synchronous only - bind UI controls
    document.getElementById('mp-widget-open-btn')?.addEventListener('click', function() {
      app().navigateTo('plugin-my-plugin');
    });
  }

  function onNavigate() {
    app().addLog('info', PLUGIN_ID, 'My Plugin opened');
    // Read storage, query tabs, render view here.
  }

  function onLeave() {
    app().addLog('info', PLUGIN_ID, 'My Plugin closed');
    // Pause timers, remove active-view listeners.
  }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.MyPlugin = plugin;
})();
```

### Storage access pattern

```javascript
const KEY = 'rc:plugin:com.replycators.my-plugin:data';

function loadData(callback) {
  chrome.storage.local.get([KEY], function(result) {
    if (chrome.runtime.lastError) {
      app().addLog('error', PLUGIN_ID, 'Read failed: ' + chrome.runtime.lastError.message);
      callback(null); return;
    }
    callback(result[KEY] || null);
  });
}

function saveData(data) {
  if (!data) return;
  chrome.storage.local.set({ [KEY]: data }, function() {
    if (chrome.runtime.lastError) {
      app().addLog('error', PLUGIN_ID, 'Write failed: ' + chrome.runtime.lastError.message);
    }
  });
}
```

### Scratch plugin checklist

- [ ] Plugin ID follows `com.replycators.<slug>` convention
- [ ] Registration key is unique (`window.ReplyCatorsPlugins.<Key>`)
- [ ] `init()` is synchronous - no async I/O
- [ ] All async I/O is in `onNavigate()` or `render()`
- [ ] All storage keys follow `rc:plugin:<id>:<key>` convention
- [ ] No `rc:session:*` keys written
- [ ] `app().addLog()` used for logging - no `console.log()`
- [ ] `app().addNotification()` used for notifications - no custom toasts
- [ ] Platform CSS classes used - no inline styles
- [ ] `app().esc()` or `textContent` used for user data
- [ ] `onLeave()` cleans up resources from `onNavigate()`/`render()`
- [ ] Entry added to `PLUGINS[]` in `dashboard.js`
- [ ] View container added to `dashboard.html`
- [ ] Widget card added to `dashboard.html`
- [ ] Script loaded before `dashboard.js` in `dashboard.html`
- [ ] `_safeInit`, `onNavigate` delegate, and `onLeave` block wired in `dashboard.js`
- [ ] No manual nav button added to `dashboard.html`

---

## Workflow C - Convert an existing extension

### Constraint

A browser extension is **not** a plugin. Extensions run their own background service worker, content scripts, and popup. A ReplyCators plugin runs inside the existing popup as an IIFE with no independent background context. Converting requires architectural adaptation, not a file copy.

### Component inventory checklist

Before touching any file, inventory every component:

**Manifest:** Manifest version (V2/V3), permissions, host permissions, extension ID, web-accessible resources

**Scripts:** Background script purpose, content script target URLs and purposes, popup JS purpose, options page JS purpose

**Storage:** Every `chrome.storage.local` key, every `chrome.storage.sync` key, IndexedDB/localStorage, sensitive values

**APIs used:** `chrome.tabs`, `chrome.windows`, `chrome.bookmarks`, `chrome.identity`, `fetch()`/XHR endpoints, native messaging, WebSockets

**Other:** Third-party CDN dependencies, external services, analytics, localization, CSP exceptions

### Component classification

Assign every component to exactly one category:

| Category | Meaning |
|---|---|
| Reuse directly | Self-contained logic with no extension-specific dependencies |
| Reuse after adaptation | Logic that needs storage keys renamed, APIs wrapped, or UI rebuilt |
| Replace with ReplyCators infrastructure | Platform already provides this |
| Do not migrate | Unsupported, out of scope, or blocked |
| Requires architecture decision | Cannot be decided without human input |

### Extension-to-plugin mapping

| Extension component | Plugin equivalent |
|---|---|
| Popup HTML + JS | Plugin view + `plugins/<slug>.js` |
| Options page | Settings section in `#view-settings` |
| `chrome.storage.local` | `chrome.storage.local` with renamed keys: `rc:plugin:<id>:<key>` |
| `chrome.storage.sync` | `chrome.storage.local` (sync reserved for future SDK) |
| Popup startup logic | `init()` (sync bindings) + `onNavigate()` (async data) |
| Tab/page change handling | `onNavigate()` or `chrome.tabs.onActivated` in `background.js` |
| Periodic background task | `background.js` alarm handler |
| Content script | Add to root + `manifest.json` `content_scripts` |
| Extension messaging | `chrome.runtime.sendMessage` in `background.js` |
| Custom notifications | `app().addNotification()` |
| Custom logger | `app().addLog()` |
| Context menus | Add to `background.js` |
| Native messaging | HTTP helper server (`tools/bob-helper-server.js`) |
| CDN scripts | Not permitted - CSP blocks external scripts |
| Analytics/telemetry | Not permitted without explicit approval |

### Components requiring background.js changes

These cannot live in a plugin IIFE:
- Periodic alarms (`chrome.alarms`)
- Tab lifecycle listeners (`chrome.tabs.onActivated`, `chrome.tabs.onUpdated`)
- Context menus (`chrome.contextMenus`)
- Responding to content-script messages
- Receiving push messages

### Migration steps

```
Step 1.  Complete the component inventory.
Step 2.  Complete the component classification.
Step 3.  Identify blockers. Resolve before continuing.
Step 4.  Create plugins/<slug>.js using Workflow A or B.
Step 5.  Migrate "Reuse directly" business logic.
Step 6.  Adapt "Reuse after adaptation" components:
         - Rename storage keys to rc:plugin:<id>:<key>
         - Replace chrome.storage.sync with chrome.storage.local
         - Rebuild UI using ReplyCators platform classes
         - Replace custom notifications with app().addNotification()
         - Replace custom logging with app().addLog()
Step 7.  Migrate user data from old keys to new keys (if needed). Must be idempotent.
Step 8.  Add background.js sections for background-only behaviors.
Step 9.  Add content scripts to root + manifest.json (if needed).
Step 10. Register the plugin (Steps 6-12 of Workflow A).
Step 11. Validate (see Manual Validation Checklist).
```

---

## Extension component classification

Quick-reference:

| Component | Classification |
|---|---|
| Business logic (pure functions) | Reuse directly |
| Data transformation / validation | Reuse directly |
| Chrome storage reads/writes | Reuse after adaptation (rename keys) |
| Popup HTML markup | Reuse after adaptation (rebuild with platform classes) |
| Options page settings | Replace with ReplyCators settings section |
| Custom toast system | Replace with app().addNotification() |
| Custom logger | Replace with app().addLog() |
| Background service worker | Do not migrate - integrate into existing background.js |
| Content scripts | Reuse after adaptation (add to root + manifest.json) |
| Extension manifest permissions | Do not copy - justify each permission individually |
| Authentication tokens / credentials | Do not migrate - requires architecture decision |
| CDN scripts | Do not migrate - CSP blocks |
| Analytics / telemetry | Do not migrate - requires human approval |
| `chrome.identity` | Requires architecture decision |
| Native messaging | Replace with HTTP helper server |
| Extension-specific storage keys | Do not copy - rename to rc:plugin:<id>:<key> |

---

## Plugin registration

Every plugin requires entries in three files.

### 1. plugin file - `plugins/<slug>.js`

Plain IIFE. Self-registers under `window.ReplyCatorsPlugins.<Key>`.

### 2. metadata - `dashboard.js` PLUGINS[]

```javascript
{
  id:          'com.replycators.<slug>',
  name:        'Display Name',
  version:     '1.0.0',
  description: 'One-line description.',
  author:      'Author',
  category:    'productivity',
  tags:        [],
  icon:        'plugins.examplePlugin',
  viewId:      'plugin-<slug>',
},
```

### 3. view + widget + script - `dashboard.html`

- View container: `<div class="rc-view" id="view-plugin-<slug>">`
- Widget card: `<div class="rc-widget-card" data-plugin-widget="com.replycators.<slug>">`
- Script tag: `<script src="plugins/<slug>.js"></script>` before `dashboard.js`

### 4. lifecycle wiring - `dashboard.js` DOMContentLoaded block

```javascript
_safeInit('<Key>', () => window.ReplyCatorsPlugins?.<Key>?.init?.());
```

And in `navigateTo()`:
```javascript
if (view === 'plugin-<slug>') window.ReplyCatorsPlugins?.<Key>?.onNavigate?.();
// In the leave block:
if (currentView === 'plugin-<slug>' && view !== 'plugin-<slug>')
  window.ReplyCatorsPlugins?.<Key>?.onLeave?.();
```

---

## Lifecycle implementation

| Method | Required | When | Async I/O |
|---|---|---|---|
| `init()` | Yes | Once at DOMContentLoaded | Forbidden |
| `render()` | Optional | On navigate (if registered) | Allowed |
| `onNavigate()` | Recommended | User navigates to plugin view | Allowed |
| `onLeave()` | Recommended | User navigates away | Allowed |

**init():** Synchronous only. Bind click handlers. Must be idempotent.

**onNavigate():** Async I/O allowed. Read storage, query tabs, render the view. Must be idempotent.

**render():** Use when view needs to be rebuilt on demand. Called from `navigateTo()` delegate or from your own code.

**onLeave():** Remove event listeners, timers, intervals, observers added in `onNavigate()`/`render()`. Do NOT remove listeners from `init()`. Do NOT clear persisted data. Do NOT call `onLeave()` from your own code.

---

## UI and navigation integration

### View container

Every plugin view is `<div class="rc-view" id="view-plugin-<slug>">`. Only one view is visible at a time - `navigateTo()` toggles `rc-view--active`.

### Sidebar nav button

Do NOT add manually. `applyPluginVisibility()` builds it dynamically from `PLUGINS[]`.

### Navigation

Use `app().navigateTo('plugin-<slug>')` from code.
Add `data-view="plugin-<slug>"` to any button that should navigate on click.

### Approved platform CSS classes

```
Headers:  .rc-panel-header, .rc-panel-title, .rc-view__header, .rc-view__title
Sections: .rc-section-block, .rc-section-header-row, .rc-section-title
Buttons:  .rc-btn, .rc-btn--primary, .rc-btn--secondary, .rc-btn--ghost, .rc-btn--danger
          .rc-btn--sm, .rc-btn--xs
Forms:    .rc-form-group, .rc-label, .rc-input, .rc-textarea, .rc-helper-text
States:   .rc-status--neutral/ok/warn/error, .rc-empty-state, .rc-empty-state__title
Badges:   .rc-badge, .rc-badge--blue, .rc-badge--green, .rc-badge--amber
```

---

## Settings integration

### Plugin-owned settings

Store in `rc:plugin:<plugin-id>:settings`. Read in `onNavigate()`. Write from settings controls in the Settings view.

### Settings view controls

```html
<div class="rc-settings-group">
  <div class="rc-settings-group__title">My Plugin</div>
  <div class="rc-settings-row">
    <div class="rc-settings-row__info">
      <span class="rc-settings-row__label">My Option</span>
      <span class="rc-settings-row__desc">What this option does.</span>
    </div>
    <div class="rc-settings-row__control">
      <label class="rc-toggle">
        <input type="checkbox" class="rc-toggle__input" id="mp-settings-my-option" />
        <span class="rc-toggle__slider"></span>
      </label>
    </div>
  </div>
</div>
```

Bind in `init()`. Restore state in `onNavigate()` after loading settings.

---

## Storage integration

Keys:
```
rc:plugin:<plugin-id>:*     - owned by this plugin
rc:session:*                 - owned by dashboard.js - do NOT write to these
rc:platform:*                - owned by dashboard.js - do NOT write to these
```

Safe read pattern:
```javascript
const KEY = 'rc:plugin:com.replycators.my-plugin:data';
chrome.storage.local.get([KEY], function(result) {
  if (chrome.runtime.lastError) {
    app().addLog('error', PLUGIN_ID, 'Read failed: ' + chrome.runtime.lastError.message);
    return;
  }
  const data = result[KEY] || null;
});
```

Safe write pattern:
```javascript
chrome.storage.local.set({ [KEY]: value }, function() {
  if (chrome.runtime.lastError) {
    app().addLog('error', PLUGIN_ID, 'Write failed: ' + chrome.runtime.lastError.message);
  }
});
```

Migration from extension storage (idempotent):
```javascript
chrome.storage.local.get(['old-key'], function(oldData) {
  const value = oldData['old-key'];
  if (value !== undefined) {
    chrome.storage.local.set({ 'rc:plugin:com.replycators.my-plugin:data': value }, function() {
      chrome.storage.local.remove('old-key');
    });
  }
});
```

---

## Messaging and events

### Plugin to Background

```javascript
chrome.runtime.sendMessage({ type: 'MY_MESSAGE_TYPE', payload: { ... } }, function(response) {
  if (chrome.runtime.lastError) {
    app().addLog('error', PLUGIN_ID, 'Message failed: ' + chrome.runtime.lastError.message);
    return;
  }
});
```

### Plugin to Content Script

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (!tabs[0]) return;
  chrome.tabs.sendMessage(tabs[0].id, { type: 'MY_COMMAND', pluginId: PLUGIN_ID }, function(response) {
    if (chrome.runtime.lastError) { /* handle */ }
  });
});
```

---

## Permissions and security

Existing permissions in `manifest.json`: `storage`, `tabs`, `activeTab`, `windows`, `bookmarks`, `sidePanel`, `alarms`, `contextMenus`, `scripting`, `tabGroups`, `downloads`

A new plugin must NOT add permissions to `manifest.json` without:
1. Documented reason why existing permissions are insufficient
2. Privacy impact assessment
3. Explicit approval from the repository owner

Security rules:
- No credentials in code or storage
- Use `app().esc()` or `textContent` for user-visible data
- No external scripts (CSP blocks CDN loading)
- Document every external endpoint

---

## Accessibility and localization

Requirements:
- Semantic HTML elements (`<button>`, `<label>`, `<input>`, `<select>`)
- Every interactive element needs `title` and/or `aria-label`
- Keyboard operation: all actions reachable by Tab and Enter/Space
- Visible focus: do not remove `:focus-visible` outlines
- Status/error messages use `aria-live="polite"` where they update dynamically
- No color-only communication

Theming:
- Use CSS custom properties from `styles/platform.css` - never hardcode colors
- Do not set `data-theme` on `document.body` - the platform handles this

---

## Cleanup and resource ownership

| Resource | Register in | Dispose in |
|---|---|---|
| Widget button listener | `init()` | Never (lives for popup session) |
| View-specific listener | `onNavigate()` / `render()` | `onLeave()` |
| `setInterval` / `setTimeout` | `onNavigate()` / `render()` | `onLeave()` |
| `MutationObserver` | `onNavigate()` / `render()` | `onLeave()` |
| In-progress `fetch` | `onNavigate()` | `onLeave()` (use AbortController) |
| Plugin storage | Any time | Only when plugin is removed |

---

## Manual validation checklist

```
Loading
[ ] Extension reloads at edge://extensions/ with no errors.
[ ] Popup opens with no console errors.
[ ] Plugin appears in Plugin Manager with correct name and version.
[ ] Plugin nav button appears in the sidebar.

Lifecycle
[ ] Navigating to the plugin view: onNavigate() fires (check Activity log).
[ ] Navigating away: onLeave() fires (check Activity log).
[ ] Widget "Open" button navigates to the plugin view.
[ ] Reopening the popup: plugin state is correctly restored.

UI
[ ] View container renders without layout breaks.
[ ] Widget card shows correct title and button.
[ ] Empty, loading, and error states render correctly.
[ ] All buttons are keyboard-accessible (Tab + Enter/Space).
[ ] All interactive elements have title or aria-label.

Platform integration
[ ] addLog() entries appear in Activity log with correct plugin ID.
[ ] addNotification() entries appear in Notifications view.
[ ] Settings persist across popup close and reopen.
[ ] Storage keys follow rc:plugin:<id>:<key>.
[ ] No writes to rc:session:* keys.

Identifier cleanliness (when derived from Example Plugin)
[ ] No com.replycators.example-plugin in the plugin file.
[ ] No ExamplePlugin registration key in the plugin file.
[ ] No plugin-example view ID in the plugin file.
[ ] No ex- DOM ID prefix in the plugin file.
[ ] No "Example Plugin" string used as the plugin name.

Sync
[ ] npm run sync completes without errors.
[ ] dist/ mirrors the root files.
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Plugin nav button missing | Entry missing from `PLUGINS[]` | Add to `PLUGINS[]` |
| Plugin view shows nothing | View container ID mismatch | Check `id="view-plugin-<slug>"` matches `viewId` |
| init() not called | Plugin not in `_safeInit()` | Add `_safeInit('<Key>', () => ...)` |
| onNavigate() not called | Not wired in `navigateTo()` | Add `if (view === 'plugin-<slug>')` delegate |
| onLeave() not called | Not wired in leave block | Add leave guard before `currentView = view` |
| Widget button not working | ID mismatch or listener in wrong lifecycle | Check element ID; ensure listener in `init()` |
| Storage not persisting | Key written to `rc:session:*` | Rename to `rc:plugin:<id>:<key>` |
| "Cannot read property of null" | DOM element accessed before render | Use `?.` optional chaining |
| Duplicate nav button | Manual nav button in `dashboard.html` | Remove - `applyPluginVisibility` builds it |
| Theme not applied | Hardcoded color values | Use CSS custom properties |

---

## Marketplace limitations

- Plugins cannot be installed from the Marketplace at runtime
- There is no Marketplace submission API
- `MARKETPLACE_PLUGINS[]` is hardcoded in `dashboard.js`
- Adding to Marketplace list requires a `dashboard.js` code change
- Do not implement Marketplace distribution or installation automation

---

## Reusable AI prompts

### Prompt 1 - Analyze extension for migration

```
You are a ReplyCators Plugin Platform Engineer. Analyze the browser extension at
[PATH/URL] and produce a migration inventory. Do not change any files.

For every component, identify: name, file, purpose, browser APIs used, permissions,
storage keys (and sensitivity), external services, classification (Reuse directly |
Reuse after adaptation | Replace with ReplyCators infrastructure | Do not migrate |
Requires architecture decision).

After inventory, identify: migration blockers, architecture decisions needed, complexity.
Base analysis on docs/AI-PLUGIN-KIT.md. Do not propose implementation yet.
```

### Prompt 2 - Convert extension to plugin

```
You are a ReplyCators Plugin Platform Engineer. Convert these extension components
into a ReplyCators plugin: [Paste migration inventory from Prompt 1]

Rules:
1. Read plugins/example-plugin.js and use as structural baseline.
2. Follow docs/AI-PLUGIN-KIT.md §Workflow C.
3. Do not copy manifest, permissions, or storage keys without adaptation.
4. Rename all storage keys to rc:plugin:<new-plugin-id>:<key>.
5. Replace custom notifications with app().addNotification().
6. Replace custom logging with app().addLog().
7. Rebuild UI with ReplyCators platform CSS classes.
8. Keep init() synchronous - move async I/O to onNavigate().
9. Use the smallest complete implementation.
10. List every Do Not Migrate item and unresolved limitation.
```

### Prompt 3 - Create from Example Plugin

```
You are a ReplyCators Plugin Platform Engineer. Create a new plugin based on
plugins/example-plugin.js.

Plugin details: Name: [NAME] | ID slug: [SLUG] | Purpose: [PURPOSE] | Type: basic|widget|settings

Rules:
1. Read plugins/example-plugin.js first.
2. Replace ALL Example Plugin-specific identifiers (see docs/AI-PLUGIN-KIT.md §Example Plugin).
3. Follow docs/AI-PLUGIN-KIT.md §Workflow A.
4. Keep init() synchronous. Move async I/O to onNavigate().
5. Use rc:plugin:com.replycators.[SLUG]:<key> for all storage keys.
6. Use app().addLog() for logging, app().addNotification() for notifications.
7. Use ReplyCators platform CSS classes - no inline styles.
8. Provide snippets for: dashboard.js PLUGINS[], dashboard.html view container,
   dashboard.html widget card, dashboard.js _safeInit block, dashboard.js
   navigateTo() wiring.
```

### Prompt 4 - Create from scratch

```
You are a ReplyCators Plugin Platform Engineer. Create a minimal new plugin.
Name: [NAME] | ID slug: [SLUG] | Purpose: [PURPOSE]

Rules:
1. Read plugins/example-plugin.js to understand structural pattern.
2. Follow docs/AI-PLUGIN-KIT.md §Workflow B.
3. Use minimum lifecycle methods: init, onNavigate, onLeave.
4. Keep init() synchronous.
5. Use rc:plugin:com.replycators.[SLUG]:<key> for storage keys.
6. Register under window.ReplyCatorsPlugins.[PascalCaseKey].
7. Use app().addLog() and app().addNotification() - no console.log().
8. No inline styles - use platform CSS classes.
9. No external dependencies.
10. Provide registration snippets for dashboard.js and dashboard.html.
```

### Prompt 5 - Review existing plugin

```
You are a ReplyCators Plugin Platform Engineer. Review plugins/[SLUG].js.

Check:
1. Lifecycle - init() synchronous; onNavigate/onLeave wired; cleanup complete.
2. Storage - keys follow rc:plugin:<id>:<key>; no rc:session:* writes.
3. Logging - app().addLog() used; no console.log/warn/error.
4. Notifications - app().addNotification() used; no custom toast containers.
5. UI - platform CSS classes; no hardcoded colors; accessible markup.
6. Security - no credentials; esc() used for user data.
7. Registration - unique ID, key, view ID; no Example Plugin values.
8. Cleanup - view-specific listeners removed in onLeave().
9. Compatibility - no rc:session:* writes; no other plugin's storage accessed.
10. Errors - chrome.runtime.lastError handled in all storage callbacks.

For each issue: location, problem, fix. Do not rewrite the entire plugin.
```

---

## Optional scaffolding tool

```bash
npm run create-plugin
npm run create-plugin -- --name "My Plugin" --id my-plugin --type widget
```

Modes: `basic` | `widget` | `settings`
Flags: `--settings`, `--storage`, `--author`, `--description`, `--icon`

The generator creates `plugins/<slug>.js` from the Example Plugin baseline and prints exact registration snippets. It is optional - the workflows above work without it.
