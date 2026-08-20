# ReplyCators

> A plugin-based Microsoft Edge extension platform for intelligent reply creation and data extraction across enterprise tools.

[![Version](https://img.shields.io/badge/version-1.45.6-blue.svg)](CHANGELOG.md)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](manifest.json)
[![Platform](https://img.shields.io/badge/platform-Microsoft%20Edge-0078D4.svg)](https://microsoftedge.microsoft.com)
[![License: Icons](https://img.shields.io/badge/icons-CC%20BY%204.0-lightgrey.svg)](ICON-LICENSE.md)

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Built-in Plugins](#built-in-plugins)
- [Project Structure](#project-structure)
- [Building from Source](#building-from-source)
- [Continuous Governance Automation](#continuous-governance-automation)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Third-Party Notices](#third-party-notices)

---

## Overview

ReplyCators is a **plugin-hosting Microsoft Edge extension** (Manifest V3). A single dashboard UI hosts multiple plugins. The platform provides shared navigation, settings, storage, notifications, logging, and plugin lifecycle management. Plugins provide the business functionality.

**Key capabilities:**

- Plugin-based architecture - enable, disable, and reorder plugins independently
- Popup and Side Panel modes with shared state
- 12 built-in themes with live preview
- Persistent activity log and notification history
- Backup and restore of all platform and plugin settings
- Built-in diagnostics and health monitoring

---

## Quick Start

Load the extension without building:

1. Open `edge://extensions/`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the **project root** - the folder containing `manifest.json`
5. The ReplyCators icon appears in the Edge toolbar

> **Important:** Load the project root, not `src/` or `dist/`.

For the full setup guide including the IBM Bob Execute feature, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## Built-in Plugins

| Plugin | Version | Category | Description |
|--------|---------|----------|-------------|
| Salesforce Case Extractor | 4.12.4 | CRM | Extracts structured case data from Salesforce Lightning pages |
| Cloudability OrgID | 4.0.3 | Cloud | Automatically resolves Cloudability Organisation ID with zero user interaction |
| Edge Bookmark Finder | 1.0.2 | Productivity | Searches Microsoft Edge bookmarks with real-time multi-word filtering |
| Apptio Planning Upgrade Calculator | 1.0.3 | Enterprise | Calculates Apptio Planning upgrade dates with dynamic release discovery |
| Workspace Starter | 2.0.3 | Productivity | Launches named workspace profiles with optional tab grouping |
| Tab Search | 1.0.1 | Productivity | Instant live search across all open browser tabs |
| Snake | 1.0.1 | Games | Classic retro Snake game with high score persistence |
| Apptio Documentation Finder | 1.0.3 | Productivity | IBM Docs search for Apptio products with favorites and quick links |
| Environment Dashboards Launcher | 1.3.0 | Support | Launches environment-specific dashboards with favorites and recents |
| Example Plugin | 1.0.2 | Template | Canonical reference implementation for plugin developers |

---

## Project Structure

```
ReplyCators/
├── manifest.json              # Extension manifest (MV3) - active
├── dashboard.html             # Main popup/side-panel UI shell - active
├── dashboard.js               # Application orchestrator - active
├── background.js              # Background service worker - active
├── options.html               # Options page - active
├── styles/
│   ├── platform.css           # Design tokens and layout primitives
│   └── dashboard.css          # Dashboard-specific styles
├── plugins/                   # Plugin runtime modules
│   ├── salesforce-case-extractor.js
│   ├── cloudability-orgid.js
│   ├── workspace-starter.js
│   ├── ... (one file per plugin)
│   └── shared/
│       └── icon-helper.js     # Centralized icon renderer
├── assets/
│   └── icons/                 # Extension icons and Streamline SVG assets
├── tools/                     # Developer utilities (not loaded by extension)
│   ├── bob-helper-server.js   # IBM Bob HTTP bridge server
│   └── bob-helper.ps1         # PowerShell management script
├── build/                     # Build scripts
├── docs/                      # Engineering documentation
├── src/                       # TypeScript source stubs (inactive - future Phase 2)
└── dist/                      # Runtime mirror (auto-synced from root)
```

> `src/` contains TypeScript stubs for a future migration. The extension loads directly from the repository root. See [src/README.md](src/README.md).

---

## Building from Source

> **Runtime-First Policy:** Build tools live at `[project root]\Runtime\NodeJS`. Check there before running `npm install`. See [AGENTS.md](AGENTS.md#13-a-runtime-first-policy).

```powershell
npm run build        # Production build -> dist/
npm run build:dev    # Development build with source maps
npm run watch        # Incremental watch build
npm run typecheck    # TypeScript type-check only (no emit)
npm run sync         # Manually sync root -> dist/
npm run sync:verify  # Verify root and dist/ are in sync (exits 1 if not)
npm run package      # Clean + build + create ZIP artefact
```

After editing any root-level file, reload the extension at `edge://extensions/`.

---

## Continuous Governance Automation

Repository governance automation is implemented in GitHub Actions and uses prompts sourced directly from `docs/PROMPT-CATALOG.md`.

- Orchestrator: `.github/workflows/governance-orchestrator.yml` (daily schedule and manual dispatch)
- Stage workflows:
  - `.github/workflows/issue-analysis.yml`
  - `.github/workflows/repository-audit.yml`
  - `.github/workflows/documentation-audit.yml`
  - `.github/workflows/defect-remediation.yml`
  - `.github/workflows/release-readiness.yml`
- Finding processors:
  - `.github/scripts/governance-safeguards.js`
  - `.github/scripts/process-findings.js`
  - `.github/scripts/prioritize-issues.js`
- Label schema: `.github/labels.json`

All findings are processed into GitHub Issues with severity, state, source, and governance labels for autonomous tracking and escalation.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Prerequisites, quick start, Bob Execute setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full architecture reference and component descriptions |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Step-by-step plugin authoring guide |
| [docs/AI-PLUGIN-KIT.md](docs/AI-PLUGIN-KIT.md) | Primary guide for AI agents creating or maintaining plugins |
| [PLUGIN-SDK.md](PLUGIN-SDK.md) | Plugin SDK standards and platform conventions |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Contribution workflow, versioning, commit format |
| [docs/STORAGE.md](docs/STORAGE.md) | Complete storage schema and namespace reference |
| [docs/SETTINGS.md](docs/SETTINGS.md) | All platform settings, options, and defaults |
| [docs/THEMES.md](docs/THEMES.md) | Theme system, available themes, CSS tokens |
| [docs/STARTUP-FLOW.md](docs/STARTUP-FLOW.md) | Full boot sequence and plugin load order |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes for all plugins |
| [docs/PACKAGING.md](docs/PACKAGING.md) | Packaging, distribution, and pre-release checklist |
| [CHANGELOG.md](CHANGELOG.md) | Full release history |
| [AGENTS.md](AGENTS.md) | Authoritative agent and contributor briefing |

### Plugin Documentation

| Plugin | Document |
|--------|----------|
| Salesforce Case Extractor | [docs/plugins/salesforce-case-extractor.md](docs/plugins/salesforce-case-extractor.md) |
| Cloudability OrgID | [docs/plugins/cloudability-orgid.md](docs/plugins/cloudability-orgid.md) |
| Edge Bookmark Finder | [docs/plugins/bookmark-finder.md](docs/plugins/bookmark-finder.md) |
| Apptio Planning Upgrade Calculator | [docs/plugins/apptio-upgrade-calculator.md](docs/plugins/apptio-upgrade-calculator.md) |
| Workspace Starter | [docs/plugins/workspace-starter.md](docs/plugins/workspace-starter.md) |
| Tab Search | [docs/plugins/tab-search.md](docs/plugins/tab-search.md) |
| Snake | [docs/plugins/snake.md](docs/plugins/snake.md) |
| Apptio Documentation Finder | [docs/plugins/apptio-docs-finder.md](docs/plugins/apptio-docs-finder.md) |
| Backup & Restore | [docs/plugins/backup-restore.md](docs/plugins/backup-restore.md) |
| Marketplace | [docs/plugins/marketplace.md](docs/plugins/marketplace.md) |

---

## Contributing

Read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full contribution workflow.

**Before making any change**, read [AGENTS.md](AGENTS.md) in full - it is the authoritative briefing for all contributors and AI agents.

Key rules:

- The active runtime loads from the **repository root** - not `src/` or `dist/`
- Never edit `dist/` files directly
- Every change to root files must be mirrored to `dist/` via `npm run sync` or `npm run build`
- A change is **not done** until documentation reflects the new behavior

---

## Third-Party Notices

Icons from [Streamline Ultimate Colors - Free](https://www.streamlinehq.com/icons/ultimate-colos-free) by Webalys / Streamline HQ, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

> Icons by [Streamline](http://streamlinehq.com)

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [ICON-LICENSE.md](ICON-LICENSE.md) for full attribution and license details.
