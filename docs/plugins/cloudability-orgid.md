# Cloudability OrgID - Plugin Documentation

## Sections
- Overview
- Permissions
- Content Scripts
- Retrieval Workflow
- RC_CLD_ORG_UPDATE Broadcast
- Storage
- Active-Tab-Only Enforcement
- Startup Behavior
- Dashboard Widget
- Public API
- Ownership Boundaries
- Known Limitations

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.cloudability-orgid` |
| Version | 4.0.3 |
| Category | Cloud |
| Status | Active |

Automatically resolves the Cloudability Organisation ID (OrgID) with zero user interaction. Only the **active (focused)** browser tab is ever queried - background Cloudability tabs are intentionally ignored.

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Query open tabs to find the active Cloudability page |
| `windows` | Enumerate windows with populated tab lists |
| `scripting` | Inject content scripts on Cloudability pages |
| `host: *.apptio.com/*` | Access Cloudability on Apptio-hosted domains |
| `host: *.apps.papt.to/*` | Access Cloudability on PAPT domains |
| `alarms` | Background refresh scheduling |

---

## Content Scripts

| Script | World | Injected on | Purpose |
|--------|-------|-------------|---------|
| `plugins/cloudability/content/cloudability-interceptor.js` | MAIN | `*/cloudability*` at `document_start` | Patches XHR and fetch to intercept `/v3/internal/organization/settings`; posts `CLOUDABILITY_ORG_DATA` window event |
| `plugins/cloudability/content/cloudability-detector.js` | ISOLATED | `*/cloudability*` at `document_end` | Listens for `CLOUDABILITY_ORG_DATA`; forwards `{ id, name }` to background via `RC_CLD_ORG_READY` |

---

## Retrieval Workflow

### Push path (automatic)
```
Active Cloudability tab calls /v3/internal/organization/settings
  -> plugins/cloudability/content/cloudability-interceptor.js intercepts XHR/fetch
  -> Posts CLOUDABILITY_ORG_DATA window event
  -> plugins/cloudability/content/cloudability-detector.js catches event
  -> Sends RC_CLD_ORG_READY to background.js
  -> background.js caches OrgID, broadcasts RC_CLD_ORG_UPDATE
  -> Plugin receives update -> UI shows "Live"
```

### Pull path (manual refresh or startup)
```
orgIdGetActiveTab() queries chrome.windows.getAll({ populate: true })
  -> Returns ONLY active tab matching Cloudability URL pattern
  -> RC_GET_CLOUDABILITY_ORG sent to background
  -> background.js calls orgIdRetrieveOnce() on the active tab
  -> Interceptor fires on next natural API call
  -> OrgID returned; background caches and broadcasts RC_CLD_ORG_UPDATE
```

The pull path does NOT navigate the SPA to `#/settings`. If no API call occurs within the timeout, the pull fails gracefully and the cached value is retained.

---

## RC_CLD_ORG_UPDATE Broadcast

Emitted by `background.js` on every successful OrgID retrieval:

| Path | Trigger | Emitter |
|------|---------|---------|
| Push (interceptor) | `RC_CLD_ORG_READY` received | `orgIdHandlePush()` |
| Pull (manual/startup) | `orgIdRetrieveOnce()` succeeds | `orgIdRetrieveOnce()` |
| Cache hit | `orgIdRetrieve()` returns valid cache | `orgIdRetrieve()` |

---

## Storage

| Key | Content |
|-----|---------|
| `rc:plugin:com.replycators.cloudability-orgid:orgid-cache` | `{ orgId, orgName, retrievedAt, originDomain }` |

No enforced TTL. Cache is never erased on failed refresh - last known good value is always retained.

---

## Active-Tab-Only Enforcement

`orgIdGetActiveTab()` in `background.js`:
- Uses `chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })`
- Returns ONLY the tab marked `active: true` matching a Cloudability URL
- Returns `null` if no such tab - retrieval is aborted, no fallback to background tabs

`chrome.tabs.onUpdated` applies `if (!tab.active) return` before any retrieval.

---

## Startup Behavior

1. `init()` - binds button event listeners, loads cached value from storage if present, updates plugin view and widget.
2. On first `onNavigate()` - may attempt live retrieval based on active tab state.
3. Manual refresh uses the active-tab-only lookup and updates both plugin view and widget together.

---

## Dashboard Widget

| Element | Description |
|---------|-------------|
| `#cld-widget-orgname` | Organisation name |
| `#cld-widget-orgid` | Current OrgID value (shows "-" until first retrieval) |
| `#cld-widget-copy` | Copy button (disabled until OrgID available) |
| `#cld-widget-refresh` | Refresh button (always enabled) |

---

## Public API

```js
window.ReplyCatorsPlugins.CloudabilityOrgId = {
  init,
  onNavigate,
  getState,
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| XHR/fetch interception | `plugins/cloudability/content/cloudability-interceptor.js` (MAIN world) |
| Message forwarding to background | `plugins/cloudability/content/cloudability-detector.js` (ISOLATED world) |
| OrgID caching and RC_CLD_ORG_UPDATE broadcast | `background.js` |
| Alarm scheduling | `background.js` |
| Active-tab enforcement (background) | `background.js` `orgIdGetActiveTab()` |
| Active-tab enforcement (plugin) | `plugins/cloudability-orgid.js` `findCloudabilityTab()` |
| UI rendering and state | `plugins/cloudability-orgid.js` |

---

## Known Limitations

- Requires the active (focused) tab to be a Cloudability page.
- If the Cloudability tab is not focused, retrieval will not occur until the user switches to it.
- Pull path depends on SPA making a natural `/v3/internal/organization/settings` call; if not triggered, pull times out and falls back to cache.
- Exponential back-off retry: up to 3 retries, base delay 2s.
