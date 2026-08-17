# ReplyCators - Plugin Developer Guide

## Sections
- Runtime-First Policy
- Platform Governance
- Startup Performance Pattern
- Step 1: Create Plugin Folder
- Step 2: Declare Manifest
- Step 3: Implement Plugin Class (TypeScript)
- Step 4: Register in Bootstrap
- Step 5: Add to Flat Deployment
- Platform Services Reference
- Content Script Guidelines
- UI Tooltip Requirements
- Plugin Categories
- Best Practices
- Versioning Policy
- Documentation Policy

---

## Runtime-First Policy

All build tools (npm, TypeScript, Webpack) live at `[current project root folder]\Runtime\NodeJS`.
Running `npm install` inside this repository is the **exception path** - not the default.
Check `[current project root folder]\Runtime\NodeJS` first. Full decision tree: `AGENTS.md` § 13-A.

---

## Platform Governance

All plugins must follow these standards. Violations fail the Plugin Release Checklist.

### Design System
- Use shared ReplyCators layout classes before creating new styles.
- Match platform typography, spacing, and component patterns.
- Provide clear headers, grouped sections, and explicit empty/loading states.

### Logging
- TypeScript: use `context.services.logger`.
- Flat runtime: use `window.ReplyCatorsApp.addLog()`.
- Do not use `console.*` in plugin or platform code.

### Notifications
- TypeScript: use `context.services.notifications.show()`.
- Flat runtime: use `window.ReplyCatorsApp.showToast()`.
- Do not create plugin-specific toast renderers.
- Allowed types: `success`, `info`, `warning`, `error`.

### Forbidden
- Custom design language scoped to a single plugin
- Plugin-specific logger implementations
- Plugin-specific toast implementations
- Inconsistent empty, loading, or error states

---

## Startup Performance Pattern

**Mandatory since v1.20.1.** Violating this degrades startup for all users.

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| `init()` | Bind button/widget click handlers | `chrome.tabs.query()` |
| `init()` | Set initial DOM state from already-loaded data | `chrome.storage.local.get()` |
| `init()` | Wire keyboard shortcuts | `chrome.runtime.sendMessage()` |
| `init()` | Register widget open button | Any async I/O |
| `onNavigate()` | Tab scans, storage reads | - |
| `render()` | Full view construction and data fetch | - |

**Correct:**
```js
function init() {
  // Synchronous only - bind controls
  document.getElementById('my-widget-btn')?.addEventListener('click', () => {
    app().navigateTo('plugin-my-plugin');
  });
}

function onNavigate() {
  // I/O deferred here - only runs when user opens the view
  chrome.tabs.query({}, tabs => renderTabs(tabs));
}
```

**Forbidden:**
```js
function init() {
  chrome.tabs.query({}, tabs => renderTabs(tabs));       // tab scan on every popup open
  chrome.storage.local.get('my-data', d => render(d));  // storage read on every popup open
}
```

Wire `onNavigate()` in `dashboard.js` `navigateTo()`:
```js
if (view === 'plugin-my-plugin') window.ReplyCatorsPlugins?.MyPlugin?.onNavigate?.();
```

---

## Step 1: Create Plugin Folder

```
src/plugins/MyPlugin/
├── index.ts          - Entry point + PluginLoader.register()
├── manifest.ts       - PluginManifest declaration
├── content/          - Content scripts (plain .js, no modules)
├── background/       - Background-side services
└── ui/               - Render functions for pages/widgets
```

---

## Step 2: Declare Manifest

```typescript
// src/plugins/MyPlugin/manifest.ts
import type { PluginManifest } from '@replycators/sdk';

export const MY_MANIFEST: PluginManifest = {
  id: 'com.mycompany.my-plugin',   // reverse-domain, unique, permanent
  name: 'My Plugin',
  version: '1.0.0',
  description: 'What this plugin does.',
  author: 'My Company',
  category: 'productivity',
  tags: ['tag1', 'tag2'],
  permissions: ['storage'],
  settings: [
    { key: 'myApiKey', label: 'API Key', type: 'password', required: true, group: 'Authentication' }
  ],
};
```

---

## Step 3: Implement Plugin Class

```typescript
// src/plugins/MyPlugin/index.ts
import { PluginBase } from '@replycators/sdk';
import { PluginLoader } from '../../platform/loader/PluginLoader';
import { MY_MANIFEST } from './manifest';
import type { PluginContext, ActionContext, ActionResult } from '@replycators/sdk';

export class MyPlugin extends PluginBase {
  readonly manifest = MY_MANIFEST;

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);  // MUST call super

    context.registerPage({
      id: 'my-plugin-main', title: 'My Plugin', icon: '🔧',
      component: 'MyPluginView', route: '/plugins/my-plugin',
      showInSidebar: true, order: 20,
    });

    context.registerDashboardComponent({
      id: 'my-plugin-widget', title: 'My Plugin',
      component: 'MyPluginWidget', size: 'medium', order: 20,
    });

    context.registerAction({
      id: 'my-action', label: 'Do Something', icon: '⚡',
      handler: (ctx) => this.handleAction('my-action', ctx),
    });

    context.services.logger.info('MyPlugin initialized');
  }

  async renderView(viewId: string, container: HTMLElement): Promise<void> {
    container.innerHTML = `<div><h2>My Plugin</h2></div>`;
  }

  async handleAction(actionId: string, context: ActionContext): Promise<ActionResult> {
    if (actionId === 'my-action') return { success: true, message: 'Done!' };
    return { success: false, message: 'Unknown action' };
  }
}

PluginLoader.register(() => new MyPlugin());
```

---

## Step 4: Register in Bootstrap

```typescript
// src/platform/bootstrap.ts
async function importPlugins(): Promise<void> {
  await import('../plugins/SalesforceExtractor/index');
  // ... existing plugins ...
  await import('../plugins/MyPlugin/index');  // add this line
}
```

The platform auto-generates: storage/settings namespaces, scoped logger, settings UI, Plugin Manager card, sidebar nav entry.

---

## Step 5: Add to Flat Deployment

The active runtime uses plugin module architecture (ADR-008).

### 5a. Create the plugin module

Create `plugins/my-plugin.js` as a plain IIFE:

```javascript
(function() {
  'use strict';

  const plugin = { id: 'com.mycompany.my-plugin', init, render, onNavigate, onLeave };

  function app() { return window.ReplyCatorsApp; }

  function init() {
    // Bind DOM events only - no async I/O
    // Use app().addLog(), app().showToast(), app().navigateTo()
  }

  function render() { /* rebuild view on navigate */ }
  function onNavigate() { /* view became active - do I/O here */ }
  function onLeave() { /* view became inactive */ }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.MyPlugin = plugin;
})();
```

Never write plugin logic inside `dashboard.js`. See ADR-008.

### 5b. Register metadata in `dashboard.js`

Add to the `PLUGINS` array:

```javascript
{
  id: 'com.mycompany.my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'One-line description.',
  author: 'Author',
  category: 'productivity',
  tags: ['tag1'],
  icon: 'semantic-icon-id',
  viewId: 'plugin-my-plugin',
},
```

### 5c. Add view and widget to `dashboard.html`

```html
<!-- View container -->
<div class="rc-view" id="view-plugin-my-plugin">
  <div class="rc-panel-header">
    <span class="rc-panel-title">My Plugin</span>
    <button data-doc-view="plugin-my-plugin" class="rc-btn rc-btn--ghost rc-btn--sm rc-panel-docs-btn">Docs</button>
  </div>
  <div class="rc-panel-body" id="my-plugin-container"></div>
</div>

<!-- Dashboard widget card -->
<div class="rc-widget-card" data-plugin-widget="com.mycompany.my-plugin">
  <div class="rc-widget-card__header">
    <span class="rc-widget-card__title">My Plugin</span>
    <button data-doc-view="plugin-my-plugin" class="rc-btn rc-btn--ghost rc-btn--sm">Docs</button>
    <button class="rc-widget-card__open" data-view="plugin-my-plugin" title="Open My Plugin">↗</button>
  </div>
  <div class="rc-widget-card__body" style="padding:14px;">
    <p style="font-size:12px;color:var(--rc-text-muted);">Widget summary here.</p>
  </div>
</div>
```

Nav buttons are injected automatically by `applyPluginVisibility()`. Do NOT add a static nav button.

### 5d. Load module before `dashboard.js`

```html
<script src="plugins/my-plugin.js"></script>
<script src="dashboard.js"></script>  <!-- must remain last -->
```

### 5e. Wire lifecycle hooks in `dashboard.js`

```javascript
// In DOMContentLoaded block:
window.ReplyCatorsPlugins?.MyPlugin?.init?.();

// In navigateTo():
if (view === 'plugin-my-plugin') window.ReplyCatorsPlugins?.MyPlugin?.onNavigate?.();
```

### 5f. Sync to `dist/`

```
npm run sync
```

---

## Platform Services Reference

Available via `context.services` in TypeScript plugins.

### storage - IStorageService
```typescript
await services.storage.set('key', { value: 42 });
const data = await services.storage.get<{ value: number }>('key');
await services.storage.remove('key');
await services.storage.clear('prefix-');  // all keys with prefix
```
Keys are auto-namespaced under `rc:plugin:<pluginId>:`.

### events - IEventBus
```typescript
const unsub = services.events.on('my-event', data => console.log(data));
services.events.emit('my-event', { payload: 'hello' });
unsub();
```

### logger - ILogger

| Level | When to use |
|-------|-------------|
| `debug` | Low-signal internal diagnostics |
| `info` | Normal operation, state transitions |
| `warn` | Recoverable issues, fallback paths |
| `error` | Failed operations requiring attention |

```typescript
services.logger.info('Extraction started', { caseNumber });
services.logger.error('API call failed', error);
```

### notifications - INotificationService

| Type | When to use |
|------|-------------|
| `success` | Operation completed |
| `info` | Neutral information |
| `warning` | Potential issue |
| `error` | Operation failed |

```typescript
services.notifications.show({
  id: `my-notif-${Date.now()}`, title: 'My Plugin',
  message: 'Something happened!', type: 'success',
  duration: 4000, pluginId: manifest.id,
});
```

### settings - ISettingsService
```typescript
const apiKey = await services.settings.get<string>(manifest.id, 'myApiKey');
await services.settings.set(manifest.id, 'myApiKey', 'new-value');
await services.settings.reset(manifest.id);
```

### messaging - IMessagingService
```typescript
const response = await services.messaging.sendToTab(tabId, { type: 'MY_COMMAND', pluginId: manifest.id });
await services.messaging.injectScript(tabId, ['plugins/MyPlugin/content/my-content.js']);
const unsub = services.messaging.onMessage((msg, sender) => {
  if (msg.type === 'MY_CONTENT_RESPONSE') return { received: true };
});
```

---

## Content Script Guidelines

Content scripts must be plain JavaScript (no ES modules, no imports).

```javascript
(function () {
  'use strict';

  if (window.__rcMyPluginInstalled) return;
  window.__rcMyPluginInstalled = true;

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type !== 'MY_COMMAND') return false;
    try {
      sendResponse({ result: doWork(message.payload), success: true });
    } catch (err) {
      sendResponse({ result: null, success: false, error: String(err) });
    }
    return true; // keep channel open for async
  });

  function doWork(payload) { return document.title; }
})();
```

When extracting text from Salesforce Lightning DOM, use `cleanFieldValue(raw, fieldLabel)` from `sf-content.js` to strip label repetition and trailing action words.

---

## UI Tooltip Requirements

Every interactive element in `dashboard.html` must have a `title` attribute.

| Element | Tooltip content |
|---------|----------------|
| Navigation button | `"Navigate to <view> - <description>"` |
| Action button | `"<What it does> - <conditions>"` |
| Input field | `"<What to enter> - <format/example>"` |
| Select/dropdown | `"<What this controls>"` |
| Toggle/checkbox | `"When enabled/disabled, <what changes>"` |
| Icon-only button | `"<Full description of action>"` |

Do not repeat the label verbatim - the tooltip must add context.

---

## Plugin Categories

| Category | Examples |
|----------|---------|
| `crm` | Salesforce, HubSpot |
| `itsm` | ServiceNow, Zendesk |
| `project-management` | Jira, Azure DevOps |
| `cloud` | AWS, Azure, Cloudability |
| `analytics` | Power BI, Tableau |
| `productivity` | Confluence, Microsoft 365 |
| `ai-assistant` | WatsonX, OpenAI |
| `monitoring` | Grafana, Datadog |
| `developer-tools` | GitHub, GitLab |
| `enterprise` | SAP, Workday |
| `utility` | Generic helpers |
| `example` | Reference/template plugins |

---

## Best Practices

1. Use `context.services` - never call Chrome APIs directly in TypeScript plugins.
2. Use your plugin ID as namespace - prevents key collisions.
3. Return empty strings / null from extraction functions - never throw.
4. Guard against double injection - content scripts must check `window.__rcMyInstalled`.
5. Return `true` from message listeners to keep the async channel open.
6. Log errors - use `this.recordError(err)` from `PluginBase`.
7. Use `manifest.settings` schema - platform auto-generates settings UI.
8. Use events for cross-plugin communication - never import another plugin directly.
9. Use correct log level: `debug` for noise, `info` for state, `warn` for recoverable, `error` for failures.
10. Use correct notification type: `success`/`info`/`warning`/`error`.
11. Add `title` tooltips to every interactive element.
12. Never erase on failure - preserve last known good value; only explicit user actions should clear data.
13. Update all required documentation locations before marking a task complete.

---

## Versioning Policy

All plugins use SemVer `MAJOR.MINOR.PATCH`. Start new plugins at `1.0.0`.

| Segment | When |
|---------|------|
| MAJOR | Breaking changes to behaviour, storage schema, or public events |
| MINOR | New features or user-facing functionality |
| PATCH | Bug fixes, UI polish, doc corrections |

After incrementing:
1. Update `src/plugins/<PluginName>/manifest.ts` - `version`
2. Update `dashboard.js` - `PLUGINS` array version
3. Bump extension version by at least the same segment
4. Update `AGENTS.md` - Plugin Inventory table
5. Update `README.md` - Built-in Plugins table
6. Add `CHANGELOG.md` entry

Full versioning policy and sync locations: `AGENTS.md` § 12.

---

## Documentation Policy

Every feature, bug fix, UI change, or architectural decision must be followed by documentation updates before work is complete. See `AGENTS.md` § 23-A for the full documentation maintenance rules and per-change-type requirements.
