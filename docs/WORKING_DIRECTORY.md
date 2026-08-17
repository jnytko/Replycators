# ReplyCators - Working Directory Policy

## Sections

- Source of truth
- Applying changes
- Loadable folders
- File map

---

## Source of truth

**The project root** (the repository folder containing `manifest.json`, `dashboard.js`, `background.js`, `styles/`) is the authoritative source for all hand-authored runtime files.

Plugin-owned resources (content scripts, data files) live inside their plugin directories under `plugins/` and are the authoritative source at their plugin-owned paths.

Never edit files in Edge system folders, browser extension caches, or `dist/` directly.

---

## Applying changes

1. Edit files inside the project root (or plugin-owned path)
2. Sync to `dist/`:
   - `npm run build` - runs postbuild which auto-syncs all root runtime files to `dist/`
   - `npm run sync` - manual sync without a full build
   - `npm run sync:verify` - pre-release gate; exits 1 if anything is out of sync
3. In Edge: go to `edge://extensions/` and click Reload

---

## Loadable folders

| Folder | Use |
|---|---|
| Project root (contains `manifest.json`) | Primary - load this one |
| `dist/` | Mirror - kept in sync by `build/sync-root.js` |

---

## File map

| Canonical source | dist/ mirror |
|---|---|
| `manifest.json` | `dist/manifest.json` |
| `background.js` | `dist/background.js` |
| `dashboard.html` | `dist/dashboard.html` |
| `dashboard.js` | `dist/dashboard.js` |
| `options.html` | `dist/options.html` |
| `styles/platform.css` | `dist/styles/platform.css` |
| `styles/dashboard.css` | `dist/styles/dashboard.css` |
| `assets/icons/*.png` | `dist/assets/icons/*.png` |
| `plugins/salesforce/content/sf-content.js` | `dist/plugins/salesforce/content/sf-content.js` |
| `plugins/cloudability/content/cloudability-detector.js` | `dist/plugins/cloudability/content/cloudability-detector.js` |
| `plugins/cloudability/content/cloudability-interceptor.js` | `dist/plugins/cloudability/content/cloudability-interceptor.js` |
| `plugins/apptio-upgrade-calculator/apptio-schedule.json` | `dist/plugins/apptio-upgrade-calculator/apptio-schedule.json` |

Plugin-owned files (`plugins/salesforce/content/sf-content.js`, `plugins/apptio-upgrade-calculator/apptio-schedule.json`) are canonical sources inside `plugins/`. They are synced directly to the same plugin-owned path in `dist/` by the `plugins/ -> dist/plugins/` directory sync in `build/sync-root.js`. No root copies exist.

**Not synced to dist/:** `AGENTS.md`, `CHANGELOG.md`, `package.json`, `README.md`, documentation, reports. These are repository governance files and must NOT exist in `dist/`.
