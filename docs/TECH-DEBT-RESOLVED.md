# Resolved Technical Debt Archive

## Sections

- Overview
- Resolved Items Table
- Resolution Notes

---

## Overview

**Archive document.** All 18 original technical debt items have been fully resolved.
Active agents: consult `AGENTS.md §18` for current debt status.

To add new debt: create a new TD entry here with status `Open` and add a reference from the relevant section of `AGENTS.md`.

---

## Resolved Items Table

| ID | Priority | Resolved | Summary |
|----|----------|----------|---------|
| TD-001 | High | v1.17.0 | `dashboard.js` monolith (~5,411 lines) modularised; all 8 plugin implementations extracted to `plugins/*.js`. Post-refactor validated v1.18.0. |
| TD-002 | High | v1.11.0 | No postbuild sync - `build/sync-root.js` added; `postbuild` npm hook runs automatically. |
| TD-003 | Medium | Deferred | Automated test coverage zero. Jest introduced then removed v1.16.0. Manual QA is current strategy. Planned after first stable release. |
| TD-004 | Low | v1.18.0 | Font strategy: 5 options silently fall back on machines without fonts. Option D (Hybrid) implemented. |
| TD-005 | Low | v1.11.0 | Custom font fallback audit. Superseded by TD-004 in v1.18.0. See `docs/FONT-STRATEGY.md`. |
| TD-006 | Low | v1.11.0 | `rc:session:*` namespace conflates session and persistent data. Migration plan at `docs/STORAGE-MIGRATION-ROADMAP.md`. Blocked on future MAJOR release. |
| TD-007 | Medium | v1.11.0 | No CI/CD. GitHub Actions added (`.github/workflows/ci.yml`): typecheck, webpack build, sync-verify. Test job removed v1.16.0. |
| TD-008 | Low | v1.11.0 | Dead `RC_UPGRADE_FETCH_SCHEDULE` handler in `src/background/service-worker.ts` removed. |
| TD-009 | Low | v1.10.1 | Plugin Inventory showed Workspace Starter v1.0.0 after v2.0.0 - corrected. |
| TD-010 | High | v1.11.1 | `__tests__/` folder blocked extension loading (reserved `__` prefix) - renamed to `tests/`. Removed entirely v1.16.0. Section 25 Extension Compatibility Rules added to AGENTS.md. |
| TD-011 | Medium | v1.12.0 | `node_modules/` (82 MB) left in repository - removed. Dependency Installation Policy hardened in AGENTS.md §13. |
| TD-012 | Medium | v1.13.0 | Runtime-First Policy not enforced - AGENTS.md §13-A added with full governance. |
| TD-013 | High | v1.13.1 | Workspace Starter Tab Group broken: `"tabGroups"` permission absent from manifest.json; global `wsTabGroups` setting overrode per-profile `launchMode`. Both fixed. |
| TD-014 | High | v1.14.0 | Edge Bookmark Finder: only icon opened bookmarks; full row now is primary click target with keyboard nav. RC-UX010 pattern documented. |
| TD-015 | Medium | v1.15.0 | `npm install` as default in docs - all docs updated with Runtime-First Policy notice. |
| TD-016 | High | v1.15.0 | Workspace Starter startup race: `navigateTo()` fired `wsRenderView()` before `wsLoadData` async callback completed - fixed. |
| TD-017 | Medium | v1.16.0 | Automated testing infrastructure introduced prematurely - entire Jest/jsdom removed. §26 Testing Strategy updated. |
| TD-018 | High | v1.22.1 | `native-host/` (Bob Bridge) left after migration to HTTP helper - deleted. `PromptExecutionPanel.ts` corrected to HTTP path. `nativeMessaging` removed from `manifest.json`. |

---

## Resolution Notes

### TD-001 - Plugin Modularisation

`dashboard.js` reduced to ~1,794 lines (orchestrator only). Plugins extracted to:
- `plugins/salesforce-case-extractor.js`
- `plugins/cloudability-orgid.js`
- `plugins/example-plugin.js`
- `plugins/bookmark-finder.js`
- `plugins/apptio-upgrade-calculator.js`
- `plugins/snake.js`
- `plugins/workspace-starter.js`
- `plugins/marketplace.js`

All plugins self-register on `window.ReplyCatorsPlugins`. Shared services via `window.ReplyCatorsApp`. See `docs/ADR-008-plugin-module-architecture.md`.

### TD-003 - Deferred Testing

Automated testing will be reintroduced when: architecture stable (RC-015 Phase 2), plugin interfaces stable, storage schema stable, UI workflow stable. Framework must be approved by repository owner. See `AGENTS.md §26`.

### TD-006 - Storage Migration

Keys misclassified in `rc:session:*`: `rc:session:plugin-states`, `rc:session:dashboard-order`, `rc:session:nav-view`, `rc:session:notifications`. Full plan at `docs/STORAGE-MIGRATION-ROADMAP.md`.

### TD-018 - Bob Bridge Cleanup

`native-host/` deleted entirely. `PromptExecutionPanel.ts` `invokeBob()` now sends `chrome.runtime.sendMessage({ type: 'RC_EXECUTE_BOB', ... })`. `nativeMessaging` permission intentionally absent from `manifest.json`.

---

*Archived from `AGENTS.md §18` in v1.37.0.*
