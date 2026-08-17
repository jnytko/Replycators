# Apptio Documentation Finder - Plugin Reference

## Sections
- Overview
- Features
- Architecture
- UI Structure
- Default Sources
- Storage
- Settings
- Public API
- Keyboard Shortcuts
- Permissions
- Diagnostics
- Ownership Boundaries

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.apptio-docs-finder` |
| Version | 1.0.2 |
| Category | Productivity |
| Status | Active |
| Runtime module | `plugins/apptio-docs-finder.js` |

Gives support engineers instant access to IBM Documentation for all Apptio ecosystem products without leaving the extension. Searches open in the user's browser on IBM Docs. Integrated from standalone `Apptio-Documentation-Finder` extension in v1.26.0.

---

## Features

- Keyword search across IBM Apptio documentation catalogue
- Domain filtering (Apptio, Platform, Cloudability, Targetprocess)
- Category scoping within a domain
- Saved favorites (up to 50)
- Recent searches (last 20)
- Recently opened pages (last 30)
- Documentation index with live stats and last refresh time
- Quick Links chips per domain
- Sources manager overlay (view, edit, add, reset)
- URL Preview panel - inspect exact IBM Docs URL before opening
- First-run setup with live IBM Docs API refresh
- Keyboard shortcuts
- Diagnostics panel

---

## Architecture

Self-contained IIFE, self-registers on `window.ReplyCatorsPlugins.ApptioDocsFinder`. Follows lazy-init: `init()` binds widget button only; all async I/O deferred to `onNavigate()`.

**Data flow on navigate:**
```
onNavigate()
  -> _migrateStorage()    idempotent adn_* -> rc:plugin:* migration
  -> _getSettings()       load plugin settings
  -> _getSources()        load sources (falls back to DEFAULT_SOURCES)
  -> _getQuickLinks()     load quick links
  -> _renderMainUI()      build 5-tab + sources overlay UI
  -> _doRefresh()         background refresh (first visit only, if no prior refresh)
```

**IBM Docs API:**
```
GET https://www.ibm.com/docs/api/v1/products
```
Requires `https://www.ibm.com/*` host permission. If unreachable, existing sources are retained.

---

## UI Structure

### Tabs

| Tab | Description |
|-----|-------------|
| Search | Query input, domain filter, category select, search button, Save, Sources, URL Preview, Quick Links |
| Favorites | Saved favorites - up to 50; tab badge shows count |
| Recent | Last 20 search queries |
| Opened | Last 30 opened IBM Docs pages |
| Index | Sources, favorites, quick links, searches stats, last refresh time |

### Domain Buttons

| Button | Domain key | IBM Docs scope |
|--------|-----------|----------------|
| Apptio | `apptio` | `apptio-commercial` |
| Platform | `platform` | `apptio-platform` |
| Cloudability | `cloudability` | `cloudability-commercial` |
| Targetprocess | `targetprocess` | `targetprocess` |

---

## Default Sources

| ID | Domain | Label | IBM Docs Scope |
|----|--------|-------|----------------|
| `apptio-all` | apptio | All Apptio | `apptio-commercial` |
| `tbm-studio` | apptio | TBM Studio | `apptio-commercial/tbm-studio/saas` |
| `costing` | apptio | Costing | `apptio-commercial/costing-standard/saas` |
| `planning` | apptio | Planning | `apptio-commercial/planning-standard/saas` |
| `billing` | apptio | Billing | `apptio-commercial/billing-standard/saas` |
| `benchmarking` | apptio | Benchmarking | `apptio-commercial/apptio-benchmarking/saas` |
| `platform-all` | platform | All Platform | `apptio-platform` |
| `platform-datalink` | platform | Datalink | `apptio-platform/datalink/saas` |
| `platform-datalink-classic` | platform | Datalink (Classic) | `apptio-platform/datalink-classic/saas` |
| `cloudability-all` | cloudability | All Cloudability | `cloudability-commercial` |
| `cloudability-enterprise` | cloudability | Enterprise | `cloudability-commercial/cloudability-enterprise/saas` |
| `cloudability-fp` | cloudability | Financial Planning | `cloudability-commercial/financial-planning/saas` |
| `cloudability-savings` | cloudability | Savings Automation | `cloudability-commercial/savings-automation/saas` |
| `tp-all` | targetprocess | All Targetprocess | `targetprocess` |
| `tp-atp` | targetprocess | Targetprocess (ATP) | `targetprocess/atp/saas` |

---

## Storage

Namespace: `rc:plugin:com.replycators.apptio-docs-finder:*`

| Key | Type | Content |
|-----|------|---------|
| `:sources` | array | `{ id, domain, label, scope, hint, url }[]` |
| `:quick-links` | array | `{ label, url, group }[]` |
| `:recent-searches` | array (max 20) | `{ query, domain, category, url, at }[]` |
| `:recently-opened` | array (max 30) | `{ label, url, domain, openedAt }[]` |
| `:favorites` | array (max 50) | `{ label, url, domain, savedAt }[]` |
| `:settings` | object | `{ openInNewTab, saveSearchHistory, saveOpenHistory }` - all default `true` |
| `:last-refresh` | string | ISO timestamp of last successful IBM Docs API refresh |
| `:diag` | object | Last refresh diagnostic record |

**Storage migration from standalone extension (idempotent):**

| Legacy key | Migrated to |
|-----------|-------------|
| `adn_sources` | `:sources` |
| `adn_quicklinks` | `:quick-links` |
| `adn_recent` | `:recent-searches` |
| `adn_opened` | `:recently-opened` |
| `adn_favorites` | `:favorites` |
| `adn_settings` | `:settings` |
| `adn_last_refresh` | `:last-refresh` |
| `adn_diag` | `:diag` |

---

## Settings

Stored in `:settings`, surfaced in global Settings view under Apptio Documentation Finder.

| Key | Label | Default |
|-----|-------|---------|
| `saveSearchHistory` | Save search history | `true` |
| `saveOpenHistory` | Save opened history | `true` |

Settings changes routed through `dashboard.js` -> `_onSettingChanged(key, value)`.

---

## Public API

| Method | Called by | Description |
|--------|-----------|-------------|
| `init()` | `dashboard.js` startup | Binds widget open button |
| `render()` / `onNavigate()` | `dashboard.js` navigate | Runs migration, loads data, renders UI |
| `_onSettingChanged(key, value)` | `dashboard.js` Settings | Keeps in-memory settings in sync |
| `_doRefreshFromSettings()` | `dashboard.js` Settings refresh | Triggers IBM Docs API refresh |
| `_clearAllData()` | `dashboard.js` Settings clear | Clears recent, opened, favorites |

---

## Keyboard Shortcuts

| Shortcut | Condition | Action |
|----------|-----------|--------|
| `Enter` | Focus in search input | Execute search |
| `S` | Not in text field, no overlay, Search tab active | Open Sources overlay |
| `Escape` | Sources overlay open | Close Sources overlay |
| `Escape` | No overlay, not on Search tab | Return to Search tab |

---

## Permissions

Requires `https://www.ibm.com/*` in `manifest.json` `host_permissions` (added v1.26.0). No additional `permissions` entries required.

---

## Diagnostics

`:diag` stores the last IBM Docs API refresh attempt:

| Field | Type | Description |
|-------|------|-------------|
| `at` | string | ISO timestamp |
| `success` | boolean | Whether refresh succeeded |
| `httpStatus` | number | HTTP status code |
| `responseBytes` | number | Response size in bytes |
| `totalProducts` | number | Total products returned |
| `matchedProducts` | number | Products matched to known scopes |
| `errorPhase` | string | Phase that failed (fetch, parse, save) |
| `errorDetail` | string | Error message detail |

---

## Ownership Boundaries

All responsibilities owned by the plugin module (`plugins/apptio-docs-finder.js`) except:
- Settings persistence routed through `dashboard.js`
- Host permission `https://www.ibm.com/*` declared in `manifest.json`
