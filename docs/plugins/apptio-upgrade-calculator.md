# Apptio Planning Upgrade Calculator - Plugin Documentation

## Sections
- Overview
- Features
- Storage
- Schedule Retrieval
- Startup Behavior
- Public API
- Settings
- Ownership Boundaries
- Known Limitations

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.apptio-planning-upgrade-calculator` |
| Version | 1.0.3 |
| Category | Enterprise |
| Status | Active |

Calculates Apptio Planning upgrade dates for support engineers. Given a customer's current version and upgrade day, computes exact production and sandbox upgrade dates. Dynamically retrieves the IBM Community release schedule - no hardcoded version list.

---

## Features

- Three-tier schedule retrieval (live, cached, fallback)
- Three-tab UI: Next Release, Calculator, Release Schedule table
- Known upgrade day: calculates first occurrence of specified weekday on/after production upgrade date
- Unknown upgrade day: produces full 7-day window table
- Copy Summary and Copy Customer Response actions
- Version display: current and next scheduled release

---

## Storage

| Key | Content | TTL |
|-----|---------|-----|
| `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:schedule-cache` | `{ releases, lastUpdated, source }` | 24 hours |
| `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc` | `{ version, upgradeDay, tab }` | No expiry |

`last-calc` persists user's last selections for restore on next open.

---

## Schedule Retrieval

| Source | URL | Triggered when |
|--------|-----|----------------|
| Live | IBM Community "What's New" page | Always tried first |
| Cache | `chrome.storage.local` | Live fetch fails or cache is fresh (<24h) |
| Local fallback | `plugins/apptio-upgrade-calculator/apptio-schedule.json` (bundled at plugin-owned path; `chrome.runtime.getURL` resolves this path at runtime) | Cache stale and live fetch fails |

Parser applies three strategies (table, element/paragraph, full body scan). Version regex anchored to Apptio Planning format `(\d+\.\d{2,})`.

---

## Startup Behavior

1. `init()` - registers widget button handler. Parser migration check deferred to `setTimeout(0)` to avoid blocking startup.
2. `render()` - called on navigate to plugin view; restores `last-calc` prefs, fetches/loads schedule.
3. If cache is fresh: renders from cache. Otherwise attempts live fetch.

---

## Public API

```js
window.ReplyCatorsPlugins.ApptioUpgradeCalculator = {
  init,    // called once at startup; wires widget
  render,  // called on navigate to view; loads schedule and renders UI
};
```

---

## Settings

None. No user-configurable settings beyond version selector, upgrade day selector, and tab navigation within the plugin UI.

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Schedule fetch and parsing | Plugin |
| Cache management | Plugin |
| Date calculations | Plugin |
| UI rendering | Plugin |
| Widget wiring | Plugin |
| Last-calc persistence | Plugin |

---

## Known Limitations

- IBM Community page structure changes could break the live parser. Local fallback ensures plugin remains functional.
