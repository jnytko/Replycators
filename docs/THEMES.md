# ReplyCators - Theme System

## Sections
- Overview
- Available Themes
- Dark/Light Detection
- CSS Architecture
- Applying a Theme
- Font Availability
- Adding a New Theme

---

## Overview

12 built-in themes. Active theme stored in `appSettings.theme`, applied as `data-theme` on `<body>`. All CSS uses `--rc-*` custom properties defined in `styles/platform.css`.

---

## Available Themes

| Value | Name | Type |
|-------|------|------|
| `ibm-blue` | IBM Blue | Dark (default) |
| `dark` | Dark | Dark |
| `midnight-blue` | Midnight Blue | Dark |
| `nord` | Nord | Dark |
| `dracula` | Dracula | Dark |
| `solarized-dark` | Solarized Dark | Dark |
| `solarized-light` | Solarized Light | Light |
| `graphite` | Graphite | Dark |
| `high-contrast-dark` | High Contrast Dark | Dark |
| `high-contrast-light` | High Contrast Light | Light |
| `light` | Light | Light |
| `replycators` | ReplyCators Signature | Dark |

---

## Dark/Light Detection

`DARK_THEME_SET` in `dashboard.js` drives the sidebar quick-toggle icon:

```js
const DARK_THEME_SET = new Set([
  'dark', 'midnight-blue', 'nord', 'dracula', 'solarized-dark',
  'graphite', 'high-contrast-dark', 'ibm-blue', 'replycators',
]);
```

Quick-toggle remembers last dark and last light selection - switching back restores original choice.

---

## CSS Architecture

All theme colours defined as CSS custom properties in `platform.css` under `[data-theme="<value>"]`.

| Property | Purpose |
|----------|---------|
| `--rc-bg` | Page background |
| `--rc-surface` | Card/panel background |
| `--rc-surface-hover` | Hover state background |
| `--rc-border` | Dividers and borders |
| `--rc-text` | Primary text |
| `--rc-text-muted` | Secondary/muted text |
| `--rc-accent` | Primary action colour |
| `--rc-accent-hover` | Accent hover state |
| `--rc-sidebar-bg` | Sidebar background |
| `--rc-sidebar-text` | Sidebar text |
| `--rc-sidebar-active-bg` | Active nav item background |
| `--rc-topbar-bg` | Top bar background |

---

## Applying a Theme

```js
applyTheme('nord');      // Updates body.dataset.theme + appSettings.theme + UI
persistAppSettings();    // Write to chrome.storage.local
```

---

## Font Availability

Custom fonts (Inter, Roboto, Open Sans, IBM Plex Sans, Source Sans Pro) require installation on the user's machine. Fallback: Segoe UI. Settings view shows a live availability badge via `document.fonts.check()`. See `FONT-STRATEGY.md`.

---

## Adding a New Theme

1. Add `[data-theme="my-theme"]` block to `styles/platform.css` with all `--rc-*` properties.
2. Add option to `<select id="settings-theme">` in `dashboard.html`.
3. If dark: add value to `DARK_THEME_SET` in `dashboard.js`.
4. Update `THEMES.md` and `CHANGELOG.md`.
