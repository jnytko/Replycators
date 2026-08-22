# Environment Dashboards Launcher

**Plugin ID:** `com.replycators.env-dashboards`
**Version:** 1.4.0
**Category:** Support
**View ID:** `plugin-env-dashboards`

---

## Overview

Launches Splunk and Grafana monitoring dashboards for customer environments with a single click. Automatically resolves the Namespace, Cluster, Region, and AWS datasource from a given environment name. Supports tab detection on `*.apptio.com` and `*.apps.papt.to` domains.

---

## Features

### Implemented

- **Environment input** - type or paste an environment name; the plugin resolves dashboard URLs automatically.
- **One-click launch** - opens Splunk and Grafana dashboards directly in new tabs.
- **Active tab detection** - detects the current Apptio or PAPT environment from the active browser tab and pre-fills the input.
- **Last-used environment persistence** - the most recently used environment is saved and restored on next open (`lastEnv` field in `rc:plugin:com.replycators.env-dashboards:state`).

### Planned (not yet implemented)

- **Favorites** - `favorites: string[]` is persisted in storage but there is no UI to add, remove, or display favorites.
- **Recents** - `recents: string[]` is persisted in storage but the recents list is not rendered in the plugin UI.

---

## Storage

| Key | Schema | Notes |
|-----|--------|-------|
| `rc:plugin:com.replycators.env-dashboards:state` | `{ lastEnv: string\|null, favorites: string[], recents: string[] }` | `lastEnv` is actively used; `favorites` and `recents` are stored but not yet surfaced in the UI |

---

## How it works

1. On navigate, the plugin reads the active browser tab URL and checks whether it matches a known Apptio or PAPT pattern.
2. If matched, the environment name is extracted and pre-filled into the input.
3. If not matched, the last-used environment (`lastEnv`) is restored from storage.
4. When the user submits an environment name, the plugin constructs Splunk and Grafana URLs by resolving Namespace, Cluster, Region, and AWS datasource from a built-in environment map.
5. Dashboard tabs open in the browser; the environment name is saved to `lastEnv`.

---

## Supported domains for tab detection

- `*.apptio.com`
- `*.apps.papt.to`

---

## Backup & Restore

The plugin state key (`rc:plugin:com.replycators.env-dashboards:state`) is included in the Backup & Restore registry with `restoreStrategy: 'replace'`. Exports and imports preserve `lastEnv`, `favorites`, and `recents`.

---

## Known limitations

- Favorites and recents are written to storage but the UI to manage them is not implemented. This is a planned enhancement.
- Dashboard URL construction depends on the built-in environment map. Environments not present in the map will not resolve correctly.
