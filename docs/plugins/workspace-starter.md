# Workspace Starter - Plugin Documentation

## Sections
- Overview
- Features
- Storage
- Settings
- Startup Behavior
- Launch Behavior
- Default Profiles
- Public API
- Ownership Boundaries

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.workspace-starter` |
| Version | 2.0.2 |
| Category | Productivity |
| Status | Active |

Launch an entire daily workspace with a single click. Users define named profiles with one or more URLs. Each profile stores its own launch mode.

---

## Features

- Profile CRUD (create, read, update, delete)
- Duplicate a profile
- Favorites (pin profiles for quick access)
- Categories (organise profiles by category label)
- Recents (tracks last 5 launched profiles)
- Last-launched tracking
- Launch with optional tab grouping (Edge 89+ / Chrome 89+)
- Capture current browser window as a new profile
- Import / export profiles (JSON)
- Migration support for legacy profile schemas
- Dashboard widget with favorite shortcuts and Re-launch Last button

---

## Storage

All data stored under a **single composite key**:

| Key | Content |
|-----|---------|
| `rc:plugin:com.replycators.workspace-starter:data` | `{ profiles, lastLaunchedId, recents }` |

**Profile schema:**
```ts
{
  id: string;          // UUID
  name: string;
  urls: string[];
  launchMode: 'tab-group' | 'tabs';
  category?: string;
  favorite: boolean;
  createdAt: number;   // Unix timestamp
}
```

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Tab Groups | on | Default launch mode when creating a new profile or capturing the current window. Existing profiles keep their own stored launch mode. |

Stored in `appSettings.wsDefaultTabGroups` (platform settings).

---

## Startup Behavior

1. `init()` - loads all profiles, recents, and last-launched from storage.
2. After data loads, `wsRenderView()` is called unconditionally.
3. `wsUpdateWidget()` - updates Dashboard widget with profile count, favorites shortcuts, and last-launched info.

---

## Launch Behavior

On `wsLaunchProfile(id)`:
1. Opens all URLs in the profile as new tabs.
2. If `launchMode` is `tab-group`: groups tabs under a tab group named after the profile (via `chrome.tabGroups`).
3. If `launchMode` is `tabs`: opens as plain tabs with no grouping.
4. Pushes profile ID to recents (max 5).
5. Updates last launched.
6. Persists the updated data object.

---

## Default Profiles

On first install with no saved data, seeds an initial "Support Morning" profile with:
- `https://ibmsf.lightning.force.com/lightning`
- `https://five9-vcc.okta.com/app/five9agentdesktopplus/exk4p33owXasyyCi5696/sso/saml`
- `https://apptio.atlassian.net/jira/your-work`

---

## Public API

```js
window.ReplyCatorsPlugins.WorkspaceStarter = {
  init,    // called once at startup; loads data and wires widget
  render,  // called on navigate to view; renders workspace management UI
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Profile CRUD | Plugin |
| Launch orchestration | Plugin |
| Tab grouping | Plugin (via `chrome.tabGroups`) |
| Import / export | Plugin |
| Recents and favorites | Plugin |
| Dashboard widget | Plugin |
| Persistence | Plugin (single composite key) |
