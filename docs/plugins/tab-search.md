# Tab Search - Plugin Documentation

## Sections
- Overview
- Features
- Permissions
- Storage
- Startup Behavior
- Public API
- Ownership Boundaries
- Known Limitations

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.tab-search` |
| Version | 1.0.1 |
| Category | Productivity |
| Status | Active |

Instant search, filtering, sorting, and management of all currently open browser tabs across all windows.

---

## Features

- Live tab query: `chrome.tabs.query({})` on every render
- Instant search: title, full URL, hostname; all terms must match (AND logic)
- Sort modes: browser order, alphabetical by title, alphabetical by domain, recently active (`tab.lastAccessed`)
- Group mode: flat list or grouped by hostname
- Statistics bar: total tabs, active tabs, duplicate count, unique domain count
- Duplicate detection: shared URL flagged with `duplicate` badge
- Active tab highlighted with accent left-border
- Per-tab actions: Switch to, Copy URL, Copy title, Open in new window, Close tab
- Refresh button to re-query all tabs

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Query, activate, close, and manage tabs |
| `windows` | Focus the window containing a tab |

Both permissions already present in `manifest.json` - no new permissions required.

---

## Storage

None. All data is live-queried from `chrome.tabs.query()` on every render. No persistence.

---

## Startup Behavior

1. `init()` - wires dashboard widget button (`ts-widget-open-btn`).
2. `render()` - called on navigate; triggers fresh `chrome.tabs.query({})`.

---

## Public API

```js
window.ReplyCatorsPlugins.TabSearch = {
  init,    // called once at startup; wires widget
  render,  // called on navigate to view; queries tabs and renders UI
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Tab querying | Plugin (`getAllTabs`) |
| Search and sort logic | Plugin |
| Duplicate detection | Plugin (`findDuplicates`) |
| Domain grouping | Plugin |
| Statistics computation | Plugin (`buildStats`) |
| Tab actions (switch/copy/close) | Plugin |
| Widget wiring | Plugin |

---

## Known Limitations

- `tab.lastAccessed` may not be present in all browsers. "Recently Active" sort falls back to browser order when unavailable.
- Tab favicons rendered via `tab.favIconUrl` - tabs with no favicon show a generic icon.
