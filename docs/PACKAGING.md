# ReplyCators - Packaging Instructions

## Sections
- Runtime-First Policy
- Overview
- Creating a Distributable Package
- Root and dist/ Sync
- Adding New Plugin Content Scripts
- Versioning
- Pre-release Checklist
- Documentation Policy

---

## Runtime-First Policy

All build tools live at `[current project root folder]\Runtime\NodeJS`. Do NOT run `npm install` inside this repository as a default step. See `AGENTS.md` § 13-A.

---

## Overview

- **Root-level flat files** (`dashboard.html`, `dashboard.js`, `background.js`, content scripts) - what the loaded extension uses.
- **`dist/`** - mirrors root; compiled from `src/` via webpack.
- `manifest.json` at root references flat files (not `dist/`).

---

## Creating a Distributable Package

### Step 1: Build

```powershell
# Runtime-First: check Runtime\NodeJS first. Exception path only:
#   npm install   <- delete node_modules/ immediately after
npm run build
```

Compiles TypeScript and refreshes `dist/`:
```
dist/
├── manifest.json
├── background.js, dashboard.html, dashboard.js, options.html
├── sf-content.js
├── styles/platform.css, styles/dashboard.css
└── assets/icons/icon16.png, icon48.png, icon128.png
```

### Step 2: Create ZIP

```powershell
npm run package
# Output: build/replycators.zip
```

### Step 3: Load in Edge (Developer Mode)

1. Open `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** - select project root for development, or `dist/` for mirror validation

### Step 4: Submit to Edge Add-ons Store

1. Sign in at https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview
2. Create new submission, upload `build/replycators.zip`, fill listing details, submit.

---

## Root and dist/ Sync

After editing any file, sync to `dist/`.

Edit hand-authored root files (`background.js`, `dashboard.html`, `dashboard.js`, `options.html`, `manifest.json`, `styles/`) at root and run `npm run sync`.

Edit plugin-owned files directly at their canonical location (`plugins/<name>/...`) and run `npm run sync`. The `plugins/` directory is synced recursively to `dist/plugins/` - no intermediate root copies are created.

| Canonical source | dist/ target |
|-----------------|-------------|
| `background.js` | `dist/background.js` |
| `dashboard.html` | `dist/dashboard.html` |
| `dashboard.js` | `dist/dashboard.js` |
| `options.html` | `dist/options.html` |
| `manifest.json` | `dist/manifest.json` |
| `styles/platform.css` | `dist/styles/platform.css` |
| `styles/dashboard.css` | `dist/styles/dashboard.css` |
| `assets/icons/*.png` | `dist/assets/icons/*.png` |
| `plugins/salesforce/content/sf-content.js` | `dist/plugins/salesforce/content/sf-content.js` |
| `plugins/cloudability/content/cloudability-detector.js` | `dist/plugins/cloudability/content/cloudability-detector.js` |
| `plugins/cloudability/content/cloudability-interceptor.js` | `dist/plugins/cloudability/content/cloudability-interceptor.js` |
| `plugins/apptio-upgrade-calculator/apptio-schedule.json` | `dist/plugins/apptio-upgrade-calculator/apptio-schedule.json` |

Quick sync:
```powershell
npm run sync
```

---

## Adding New Plugin Content Scripts

1. Create file at `plugins/<myplugin>/content/my-content.js` (mirroring the Salesforce/Cloudability pattern)
2. Add to `manifest.json` `content_scripts`:
   ```json
   { "matches": ["https://*.mysite.com/*"], "js": ["plugins/<myplugin>/content/my-content.js"] }
   ```
3. Add host permission to `manifest.json` if needed.
4. Run `npm run sync` - the `plugins/` directory sync picks it up automatically. No webpack rule or SYNC_MAP entry required.

---

## Versioning

SemVer `MAJOR.MINOR.PATCH`. Full policy: `AGENTS.md` § 12.

| Segment | When |
|---------|------|
| MAJOR | Breaking changes, architectural redesign, user migration required |
| MINOR | New features, new plugin, new integration |
| PATCH | Bug fixes, UI polish, doc corrections |

---

## Pre-release Checklist

Complete every item before `npm run package`.

**Extension version:**
- [ ] `manifest.json` - `"version"` updated
- [ ] `package.json` - `"version"` matches `manifest.json`
- [ ] `dist/manifest.json` - synced from root
- [ ] `AGENTS.md` - Project Overview version updated
- [ ] `dashboard.html` - `<span id="rc-platform-version">` updated
- [ ] `dashboard.js` - file header comment version updated

**Changed plugins (repeat for each):**
- [ ] `dashboard.js` - `PLUGINS` array version entry updated
- [ ] `AGENTS.md` - Plugin Inventory table version updated
- [ ] `README.md` - Built-in Plugins table updated
- [ ] `CHANGELOG.md` - latest entry plugin version list updated

**Documentation:**
- [ ] `CHANGELOG.md` - new entry added with full format
- [ ] All changed feature docs updated

**Release artefact:**
```powershell
npm run package
Rename-Item "build\replycators.zip" "build\replycators-1.47.10.zip"
```

---

## Documentation Policy

Update all version references before packaging. No release ZIP with version mismatches. See `AGENTS.md` § 23-A for full documentation maintenance rules.
