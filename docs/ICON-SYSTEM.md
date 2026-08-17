# Icon System - ReplyCators

## Sections

- Two-tier policy
- Icon source
- Active icon flow
- Central icon registry
- Using icons in the UI
- Plugin icons
- Creating a new plugin icon
- Accessibility
- Themes
- Renderer guarantees
- Adding a new icon to the registry
- Maintenance
- Icon uniqueness rule
- Prohibited practices
- Validation checklist

---

## Two-tier policy

ReplyCators uses a **two-tier icon system**. The tier must match the element's role. Do not mix tiers.

### Tier 1 - Feature icons (Streamline Ultimate Colors - Free)

Use for **primary application features and navigation destinations**:
- Navigation destinations: Dashboard, Plugin Manager, Marketplace, Notifications, Options, Documentation, Backup & Restore, Activity, Diagnostics, Send Feedback
- Plugin identity icons (one per plugin, all surfaces)
- Status indicators: success, warning, error, info, loading

Test: *"Is this a place the user navigates to, or a control the user operates?"* - destinations are Tier 1; controls are Tier 2.

### Tier 2 - UI control symbols (plain Unicode)

Use plain Unicode for navigation controls and inline interface actions. Do **not** use the Streamline pack for these.

| Symbol | Usage |
|---|---|
| `☰` | Hamburger / toggle sidebar |
| `↺` | Refresh / reload |
| `↗` | Open in new tab / external link |
| `⊟` | Open in side panel |
| `⤢` | Pop out / popup mode |
| `←` `→` | Back / Forward |
| `×` | Close |
| `›` `‹` | Expand / Collapse |
| `⧉` | Copy |
| `↓` | Download |

---

## Icon source

**Streamline Ultimate Colors - Free**

| Field | Value |
|---|---|
| Official page | https://www.streamlinehq.com/icons/ultimate-colos-free |
| License | Creative Commons Attribution 4.0 International (CC BY 4.0) |
| Local asset root | `assets/icons/streamline-ultimate-colors-free/` |
| Manifest | `assets/icons/streamline-ultimate-colors-free/icon-manifest.json` |
| Total local SVGs | 100 |

No other icon family may be used. Premium Streamline assets are not permitted.

---

## Active icon flow

```
feature or plugin
  → semantic icon ID (e.g. "navigation.home")
  → central registry (plugins/shared/icon-helper.js)
  → local Streamline SVG (assets/icons/streamline-ultimate-colors-free/...)
  → shared icon renderer
  → displayed UI element
```

One registry, one renderer, one asset root.

---

## Central icon registry

**Location:** `plugins/shared/icon-helper.js`
**TypeScript mirror:** `src/icons/icon-registry.ts`

Registry categories: `navigation`, `actions`, `status`, `plugins`, `marketplace`, `utility`, `content`, `security`, `brands`, `appearance`, `fallback`

Every entry resolves to an existing file. No entry may point to a missing, deleted, or external path.

---

## Using icons in the UI

### Method 1 - HTML data-icon attribute (preferred)

```html
<!-- Feature icon (Tier 1) -->
<span class="rc-nav__icon" data-icon="navigation.home" aria-hidden="true" role="presentation"></span>
Dashboard

<!-- Plugin identity icon -->
<span data-icon="plugins.tabSearch" aria-hidden="true" class="rc-widget-icon"></span>
```

`renderSemanticIcons()` in `icon-helper.js` resolves every `data-icon` attribute during `DOMContentLoaded`.

### Method 2 - JavaScript helper

```javascript
// Render a Tier-1 icon as HTML string
const html = window.ReplyCatorsIconHelper.renderIcon('navigation.home', {
  decorative: true,
  className: 'rc-icon--sm'
});

// Icon-only control (accessible)
const html = window.ReplyCatorsIconHelper.renderIcon('navigation.notifications', {
  decorative: false,
  label: 'Notifications'
});
```

### Tier 2 control symbols (no renderIcon)

```html
<button aria-label="Toggle sidebar navigation"><span aria-hidden="true">☰</span></button>
<button aria-label="Refresh dashboard"><span aria-hidden="true">↺</span></button>
<button aria-label="Open plugin"><span aria-hidden="true" style="font-size:12px;">↗</span></button>
<button aria-label="Close">×</button>
```

Do not call `renderIcon()` for Tier-2 controls. Use Unicode directly.

---

## Plugin icons

### Active first-party plugins

| Plugin | Semantic ID | Local asset |
|---|---|---|
| Salesforce Case Extractor | `plugins.salesforceCaseExtractor` | `plugins/salesforce-case-extractor.svg` |
| Cloudability OrgID | `plugins.cloudabilityOrgId` | `plugins/cloudability-orgid.svg` |
| Edge Bookmark Finder | `plugins.edgeBookmarkFinder` | `plugins/edge-bookmark-finder.svg` |
| Apptio Planning Upgrade Calculator | `plugins.apptioUpgradeCalculator` | `plugins/apptio-upgrade-calculator.svg` |
| Apptio Documentation Finder | `plugins.apptioDocsFinder` | `plugins/apptio-docs-finder.svg` |
| Workspace Starter | `plugins.workspaceStarter` | `plugins/workspace-starter.svg` |
| Tab Search | `plugins.tabSearch` | `plugins/tab-search.svg` |
| Snake | `plugins.snake` | `plugins/snake.svg` |
| Example Plugin | `plugins.examplePlugin` | `plugins/example-plugin.svg` |
| Backup and Restore | `plugins.backupRestore` | `plugins/backup-restore.svg` |

### Fallback

Unknown or third-party plugins render `fallback.unknownPlugin` → `plugins/unknown.svg`. Every first-party plugin must have its own specific semantic ID.

---

## Creating a new plugin icon

1. Search registry in `plugins/shared/icon-helper.js` and `icon-manifest.json` - reuse if possible
2. Check local library `assets/icons/streamline-ultimate-colors-free/` for a suitable file
3. If no local file exists, download from Streamline Ultimate Colors - Free only
4. Reference only the semantic ID in plugin metadata, `data-icon` attributes, or JS calls:
   ```javascript
   icon: 'plugins.myPlugin',  // semantic ID only - never a raw path or emoji
   ```
5. Update `icon-manifest.json` with the new entry
6. Preserve attribution in `THIRD_PARTY_NOTICES.md`

---

## Accessibility

### Decorative icons (icon + visible label)

```html
<span data-icon="navigation.home" aria-hidden="true" role="presentation"></span>
Dashboard
```

- `aria-hidden="true"` hides the icon from screen readers
- Visible text label announces the destination

### Icon-only controls

```html
<button aria-label="Refresh dashboard" title="Refresh plugin statistics">
  <span data-icon="actions.refresh" aria-hidden="true"></span>
</button>
```

- Button carries a meaningful `aria-label` and `title`
- Icon is `aria-hidden="true"`

---

## Themes

Streamline Ultimate Colors SVGs are multicolor. The renderer uses `<img>` elements which preserve original colors in both light and dark themes. No manual color overrides are required.

---

## Renderer guarantees

- Resolves relative extension paths using `chrome.runtime.getURL()`
- Works in light and dark themes
- Works fully offline - all assets are local
- Complies with extension Content Security Policy
- Rejects external paths and untrusted markup
- Renders `fallback.unknownPlugin` for unrecognized third-party semantic IDs
- Known first-party IDs must resolve correctly - do not rely on fallback

---

## Adding a new icon to the registry

1. Decide semantic ID: category (e.g. `navigation`, `actions`, `plugins`) + descriptive camelCase name
2. Identify local SVG in `assets/icons/streamline-ultimate-colors-free/` by category folder
3. Add entry to `plugins/shared/icon-helper.js`
4. Add same entry to `src/icons/icon-registry.ts`
5. Add full entry to `icon-manifest.json`:
   ```json
   {
     "semanticId": "actions.save",
     "localPath": "actions/save.svg",
     "streamlineName": "floppy-disk-save",
     "category": "actions",
     "purpose": "Save changes",
     "downloadDate": "YYYY-MM-DD",
     "sourcePack": "Streamline Ultimate Colors Free"
   }
   ```
6. Run `node build/sync-root.js` to mirror the new asset to `dist/`
7. Reload the extension and verify the icon renders correctly

---

## Maintenance

- One semantic ID → one icon → one SVG file
- Changing the registry entry updates every surface automatically
- Do not hardcode paths in HTML or plugin JavaScript - always use semantic IDs

Updating an existing icon:
1. Replace or update the SVG in `assets/icons/streamline-ultimate-colors-free/<category>/`
2. Update `icon-manifest.json` if metadata changed
3. Run `node build/sync-root.js`
4. Reload the extension

---

## Icon uniqueness rule

Every primary feature, plugin, or navigation destination must use its own unique semantic icon.

| Rule | Detail |
|---|---|
| One concept → one icon | Each distinct feature or plugin maps to a different SVG |
| No cross-feature duplicates | Do not assign the same icon to multiple unrelated features |
| Platform features take precedence | If a platform feature already owns an icon, plugins must not reuse it |
| Audit before assigning | Verify the icon is not already used by another feature in `ICON_REGISTRY` |

Audit command (DevTools console):
```javascript
const reg = window.ReplyCatorsIconHelper.ICON_REGISTRY;
const seen = {}; Object.entries(reg).forEach(([cat, ids]) => {
  Object.entries(ids).forEach(([id, path]) => {
    if (!seen[path]) seen[path] = [];
    seen[path].push(cat + '.' + id);
  });
});
console.table(Object.fromEntries(Object.entries(seen).filter(([,v]) => v.length > 1)));
```

---

## Prohibited practices

| Prohibited | Reason |
|---|---|
| Tier-1 SVG for a Tier-2 control | Decorative SVG for a universal control - confuses users |
| Tier-2 symbol for a Tier-1 feature | Inconsistent, inaccessible |
| Emoji as Tier-1 feature icons | Platform-dependent rendering |
| Reusing icon from different unrelated feature | Violates icon uniqueness rule |
| Google Material, Lucide, Font Awesome | Banned icon families |
| Icon fonts | CSP incompatible, banned |
| Remote icon URLs | Fails offline; CSP violation risk |
| Inline handwritten SVG as Tier-1 icon | Bypasses registry |
| Plugin-local icon systems | Bypasses registry |

---

## Validation checklist

### Pre-flight

- [ ] `plugins/shared/icon-helper.js` exists and is valid JavaScript
- [ ] `dashboard.html` loads `icon-helper.js` in `<head>`
- [ ] `manifest.json` includes `plugins/shared/icon-helper.js` in `web_accessible_resources`
- [ ] `manifest.json` includes `assets/icons/streamline-ultimate-colors-free/**/*.svg` in `web_accessible_resources`
- [ ] `dashboard.js` contains `renderSemanticIcons()` function
- [ ] All `data-icon="..."` attributes use valid semantic IDs
- [ ] `dist/` is in sync with root files (`npm run sync:verify`)

### Runtime visual inspection

- [ ] All navigation icons render as colour SVG (no broken images)
- [ ] All plugin identity icons render in Plugin Manager, Dashboard, and Marketplace
- [ ] Status icons visible in Activity log and Notifications
- [ ] No broken-image placeholders anywhere
- [ ] Icons visible in both light and dark themes

### Icon uniqueness validation

Run in DevTools console (see audit command in Icon Uniqueness Rule section):
- [ ] No unrelated features share the same SVG icon
- [ ] Plugin Manager (`navigation.plugins`) and Example Plugin (`plugins.examplePlugin`) use different SVGs
