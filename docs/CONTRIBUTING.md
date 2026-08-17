# ReplyCators - Contributing Guide

## Sections

- Before you start
- Making a code change
- Adding a new plugin
- Icon system rules
- Design system rules
- Versioning
- Commit message format
- Documentation maintenance

---

## Before you start

Read [`AGENTS.md`](../AGENTS.md) in full before making any change. It is the authoritative briefing for all contributors and AI agents.

Key rules:
- The active runtime is at the **repository root** - not `src/`, not `dist/`
- Never edit `dist/` files directly
- Every change to root files must be mirrored to `dist/` via `npm run sync` or `npm run build`
- Validation is manual QA only - see `AGENTS.md §26`

---

## Making a code change

### 1. Identify the right file

| Change | File |
|---|---|
| UI change | `dashboard.html` |
| Platform logic | `dashboard.js` |
| Plugin change | `plugins/<name>.js` |
| CSS | `styles/platform.css` or `styles/dashboard.css` |
| Background worker | `background.js` |

Never edit `src/` expecting live behavior. The TypeScript sources in `src/` are inactive stubs.

### 2. Sync to dist/

```powershell
npm run sync        # sync all changed root files
npm run build       # full build + auto-sync
```

### 3. Validate manually

Load at `edge://extensions/` and reload, then:
- Open the popup/side panel - verify no console errors
- Navigate to the affected view(s)
- Trigger the changed workflow end-to-end
- Close and reopen - verify persistence
- Spot-check unrelated views

### 4. Update documentation

A change is **not done** if documentation still describes the old behavior.

| Change type | Files to update |
|---|---|
| New plugin | `AGENTS.md §8`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, create `docs/plugins/<name>.md` |
| Plugin behavior change | `AGENTS.md §8`, `docs/ARCHITECTURE.md`, plugin doc, `CHANGELOG.md` |
| Storage key added | `docs/STORAGE.md`, `docs/ARCHITECTURE.md`, `AGENTS.md §9` |
| Settings change | `docs/SETTINGS.md`, `CHANGELOG.md` |
| UI / navigation change | `docs/ARCHITECTURE.md`, `AGENTS.md §10` |
| Startup flow change | `docs/STARTUP-FLOW.md` |
| Theme change | `docs/THEMES.md` |

### 5. Update version numbers

- `manifest.json` - `"version"` field
- `dashboard.html` - version span `id="rc-platform-version"`
- `CHANGELOG.md` - new entry at the top

---

## Adding a new plugin

Start with **[`docs/AI-PLUGIN-KIT.md`](AI-PLUGIN-KIT.md)** - the primary plugin creation guide.

Optional scaffolding (creates plugin file only - does not complete registration):

```powershell
npm run create-plugin
npm run create-plugin -- --name "My Plugin" --id my-plugin --type widget
```

Registration steps (follow full checklist in `AGENTS.md §10`):

1. Create `plugins/<name>.js` as a plain IIFE, self-registers on `window.ReplyCatorsPlugins.<Key>`
2. Add metadata to `PLUGINS[]` in `dashboard.js`
3. Add view container to `dashboard.html`
4. Add widget card to `dashboard.html`
5. Load script before `dashboard.js` in `dashboard.html`
6. Wire `init()` in `_safeInit()` block in `dashboard.js`
7. Wire `onNavigate()` in `navigateTo()` delegate block in `dashboard.js`
8. Wire `onLeave()` in `navigateTo()` leave block in `dashboard.js`
9. Update `AGENTS.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`
10. Create `docs/plugins/<name>.md`

---

## Icon system rules

All icons must use the centralized Streamline icon system. See [`docs/ICON-SYSTEM.md`](ICON-SYSTEM.md) for the full policy.

Icon flow: `feature or plugin → semantic icon ID → central registry → local Streamline SVG → shared renderer → UI`

Steps when adding any icon:
1. Search `plugins/shared/icon-helper.js` and `icon-manifest.json` for an existing semantic ID
2. Reuse an existing ID if the meaning matches
3. If a new concept is needed, check `assets/icons/streamline-ultimate-colors-free/` for a local file
4. If no local file exists, download from Streamline Ultimate Colors - Free only: https://www.streamlinehq.com/icons/ultimate-colos-free
5. Add the semantic ID to `plugins/shared/icon-helper.js`, `src/icons/icon-registry.ts`, and `icon-manifest.json`
6. Reference only the semantic ID in plugin metadata, `data-icon` attributes, or JS calls
7. Run `node build/sync-root.js` to copy the new asset to `dist/`

Prohibited: emoji, Unicode pictographs, text symbols as icons, Google Material, Lucide, Font Awesome, icon fonts, remote URLs, inline handwritten SVG, plugin-local icon registries.

---

## Design system rules

All new UI must use shared platform CSS classes. See [`PLUGIN-SDK.md`](../PLUGIN-SDK.md) for the full list.

Forbidden:
- Custom design language for a single plugin
- Plugin-specific toast containers
- `console.log()` / `console.warn()` / `console.error()` in runtime code
- Arbitrary one-off font sizes when a shared class exists

---

## Versioning

See `AGENTS.md §12` for the complete policy.

| Segment | When |
|---|---|
| PATCH | Bug fixes, non-visible changes |
| MINOR | New features, new plugins, new settings (additive, non-breaking) |
| MAJOR | Breaking changes, storage schema changes, architecture overhauls |

---

## Commit message format

```
<type>(<scope>): <short summary>

Types:  feat | fix | docs | style | refactor | chore
Scopes: platform | plugin/<name> | settings | ui | storage | docs
```

Examples:
```
feat(plugin/tab-search): add group-by-domain toggle
fix(plugin/workspace-starter): fix startup race on last view restore
```

---

## Documentation maintenance

A change is **incomplete** if documentation has not been updated. Code and documentation must remain synchronized at all times.
