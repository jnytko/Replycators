# INACTIVE - DO NOT EDIT THIS DIRECTORY

## Sections

- What is active
- What is this directory
- File status table
- Anti-drift rule

---

## What is active

| Change needed | Edit this file |
|---|---|
| Background service worker | `background.js` (root) |
| Popup / Side Panel UI | `dashboard.html` + `dashboard.js` (root) |
| Plugin logic | `plugins/<plugin-name>.js` (root `plugins/`) |
| CSS / Themes | `styles/platform.css` + `styles/dashboard.css` (root `styles/`) |
| Salesforce content script | `plugins/salesforce/content/sf-content.js`; then `npm run sync` |
| Cloudability content scripts | `plugins/cloudability/content/cloudability-detector.js`, `plugins/cloudability/content/cloudability-interceptor.js` |
| Apptio schedule data | `plugins/apptio-upgrade-calculator/apptio-schedule.json`; then `npm run sync` |

---

## What is this directory

`src/` contains TypeScript source stubs for a **future Phase 2 migration** to a Webpack-compiled architecture. None of these files are compiled or loaded at runtime.

The extension loads directly from the repository root via `manifest.json`.

```
ACTIVE:   repository root → browser extension
INACTIVE: src/            → (future: compiles to dist/)
MIRROR:   dist/           → auto-synced copy of root runtime files
```

---

## File status table

| Path | Status | Notes |
|---|---|---|
| `src/background/service-worker.ts` | Inactive | Future migration stub |
| `src/popup/dashboard.ts` | Inactive | Future migration stub |
| `src/popup/dashboard.html` | Inactive | Root `dashboard.html` is authoritative |
| `src/popup/options.html` | Inactive | Root `options.html` is authoritative |
| `src/platform/bootstrap.ts` | Inactive | Webpack build only |
| `src/core/*` | Inactive | TypeScript services - dist/ build only |
| `src/sdk/*` | Inactive | Plugin SDK - dist/ build only |
| `src/plugins/*/index.ts` | Inactive | Plugin stubs - dist/ build only |
| `src/utils/*.js` | Reference | Root `dashboard.js` uses inline copies |

---

## Anti-drift rule

Editing any file in `src/` has zero effect on the running extension. Always edit root-level files. See `AGENTS.md §2 Critical Rules`.
