# Edge Bookmark Finder - Plugin Documentation

## Sections
- Overview
- Permissions
- Features
- Storage
- Startup Behavior
- Error Handling
- Public API
- Ownership Boundaries

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.edge-bookmark-finder` |
| Version | 1.0.2 |
| Category | Productivity |
| Status | Active |

Searches Microsoft Edge bookmarks across the complete bookmark hierarchy (Bookmark Bar, Other Bookmarks, Mobile Bookmarks, and nested folders) using `chrome.bookmarks` API.

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `bookmarks` | Access the full bookmark tree via `chrome.bookmarks.getTree()` |

---

## Features

- Recursive scan of the entire bookmark hierarchy
- Real-time multi-word search: all terms must match (AND logic)
- Search by: title, URL, domain, or folder path
- Case-insensitive partial-match search
- Full folder path shown (e.g. `Bookmark Bar > Work > Tools`)
- Per-bookmark actions: Open, Open in New Tab, Copy URL
- Duplicate URL detection with `duplicate` badge
- Empty folder detection
- Domain analytics (top 10 domains by count)
- Recent bookmarks (last 10 added)

---

## Storage

| Key | Content |
|-----|---------|
| `rc:plugin:com.replycators.edge-bookmark-finder:prefs` | User preferences (search options, view mode) |
| `rc:plugin:com.replycators.edge-bookmark-finder:last-scan` | Last bookmark scan result (for quick restore) |

---

## Startup Behavior

1. `init()` - wires the widget search button.
2. `render()` - called when user navigates to plugin view.
3. First render: `bmScanBookmarks()` traverses the full bookmark tree and caches the result.
4. Subsequent renders: uses cached scan until user clicks Refresh.

---

## Error Handling

If `chrome.bookmarks` is unavailable:
- Scan returns `{ permissionError: true, permissionErrorMessage: '...' }`.
- Plugin renders a user-facing error message.
- Permission error logged to Activity log.

---

## Public API

```js
window.ReplyCatorsPlugins.EdgeBookmarkFinder = {
  init,    // called once at startup; wires widget
  render,  // called on navigate to view; renders bookmark search UI
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Bookmark tree traversal | Plugin (`bmScanBookmarks`) |
| Search logic | Plugin (`bmSearch`) |
| Duplicate detection | Plugin |
| Domain analytics | Plugin |
| UI rendering | Plugin |
| Widget wiring | Plugin |
| Prefs and scan persistence | Plugin |
