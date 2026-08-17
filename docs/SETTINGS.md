# ReplyCators - Settings Reference

## Sections
- Overview
- Appearance
- Accessibility
- Notifications
- Dashboard Preferences
- Logging
- Extension Behavior
- Plugin Settings
- Implementation Notes

---

## Overview

All settings stored in `chrome.storage.local` under `rc:session:app-settings`. Restored on every popup open via `applyAllSettings()` in `dashboard.js`. Access via Settings in the sidebar.

---

## Appearance

| Setting | Options | Default |
|---------|---------|---------|
| Theme | ibm-blue, dark, midnight-blue, nord, dracula, solarized-dark, solarized-light, graphite, high-contrast-dark, high-contrast-light, light, replycators | `ibm-blue` |
| Font | system, inter, roboto, open-sans, ibm-plex-sans, source-sans-pro | `system` |
| UI Density | compact, comfortable, spacious | `comfortable` |

- Custom fonts fall back to Segoe UI if not installed.
- A live availability badge shows whether the selected font is installed.

---

## Accessibility

| Setting | Default | Description |
|---------|---------|-------------|
| Larger Font Size | off | Increases base font size ~20%. |
| Reduce Animations | off | Disables all CSS transitions and fade-in effects. |
| High Contrast Mode | off | Increases text and border contrast ratios. |
| Enhanced Focus Indicators | off | Adds prominent focus rings for keyboard navigation. |

---

## Notifications

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Notifications | on | Master switch. Disables all toasts and notification history when off. |
| Success Notifications | on | Controls green success toasts. |
| Warning Notifications | on | Controls amber warning toasts. |
| Error Notifications | on | Controls red error toasts. |
| Info Notifications | on | Controls blue informational toasts. |
| Notification Duration | 4s | Auto-dismiss delay. Options: 2s, 4s, 6s, 10s, 30s. |
| Notification Position | bottom-right | Options: bottom-right, bottom-left, top-right, top-left. |

---

## Dashboard Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| Show Plugin Cards | on | Displays plugin widget cards on the Dashboard. |
| Compact Dashboard | off | Reduces padding in the Dashboard view. |
| Remember Last Opened View | on | Reopens to the last active view instead of Dashboard. |

---

## Logging

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Log Level | normal, verbose, debug | `normal` | `normal` captures info/warn/error. `verbose`/`debug` include debug-level entries. |

---

## Extension Behavior

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Default Launch Mode | popup, sidepanel | `popup` | How ReplyCators opens when you click the toolbar icon. |

---

## Plugin Settings

### Snake
| Setting | Options | Default |
|---------|---------|---------|
| Game Speed | slow, classic, fast | `classic` |

### Salesforce Case Extractor
| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Output Format | plain-text, markdown, json | `plain-text` | How extracted case data is formatted. |
| Auto-fill Case Number | on/off | on | Detects and fills case number from the active Salesforce tab. |
| Bob Working Directory | text | _(empty)_ | Absolute path where the `bob` command is executed. Validated on Execute. |
| Diagnostic Mode | on/off | off | When enabled, the Bob terminal window stays open showing resolved paths, exit code, and timing. |

### Workspace Starter
| Setting | Default | Description |
|---------|---------|-------------|
| Tab Groups | on | New profiles default to grouped tabs (requires Edge 89+). Individual profiles can override via `launchMode`. |

### Apptio Documentation Finder
| Setting | Default | Description |
|---------|---------|-------------|
| Save search history | on | Records searches to Recent tab (max 20). |
| Save opened history | on | Records opened pages to Opened tab (max 30). |

> Apptio Documentation Finder settings stored in `rc:plugin:com.replycators.apptio-docs-finder:settings`, not `rc:session:app-settings`.

---

## Implementation Notes

- New settings always have defaults - added keys are merged over `DEFAULT_SETTINGS` on restore.
- Settings persist immediately via `persistAppSettings()` (platform) or `persistSfSettings()` (Salesforce).
- Plugin settings are read from `window.ReplyCatorsApp.appSettings` at render time.
- The sidebar footer quick-toggle cycles between last-used dark and light themes.
- Full storage schema: `STORAGE.md`.
