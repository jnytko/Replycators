# ADR-008 - Plugin Module Architecture

## Sections

- Status
- Context
- Decision
- Architecture
- Ownership
- Consequences
- Future guidance

---

## Status

Accepted - 2025-07-16

---

## Context

Plugin implementations accumulated inside `dashboard.js`, growing it to ~5,411 lines and mixing platform orchestration with plugin-specific UI, storage, and workflow logic. This created unclear ownership boundaries, regression risk across unrelated features, and blocked future TypeScript migration.

---

## Decision

Adopt a plugin module architecture for the active popup runtime:

- Each plugin implementation lives in its own file under `plugins/`
- Each module self-registers on `window.ReplyCatorsPlugins`
- `dashboard.js` remains the application shell, startup coordinator, navigation controller, settings coordinator, and shared-service provider
- `dashboard.html` loads all plugin modules before `dashboard.js`
- Shared platform capabilities are exposed to plugins through `window.ReplyCatorsApp`

---

## Architecture

### Runtime structure

- `dashboard.html` - static shell, views, and plugin containers
- `plugins/salesforce-case-extractor.js`
- `plugins/cloudability-orgid.js`
- `plugins/example-plugin.js`
- `plugins/apptio-upgrade-calculator.js`
- `plugins/bookmark-finder.js`
- `plugins/workspace-starter.js`
- `plugins/snake.js`
- `plugins/tab-search.js`
- `plugins/marketplace.js`
- `dashboard.js` - initializes and orchestrates all of the above

### Plugin registration contract

Each plugin module publishes: `init()` plus optional `render()`, `onNavigate()`, `onLeave()`.

### Dependency model

- Plugin modules depend on `window.ReplyCatorsApp`
- `dashboard.js` depends on plugin public APIs only
- Plugin modules do not call private functions from other plugins
- Plugin modules do not duplicate dashboard helpers when an app service already exists

### Shared services (window.ReplyCatorsApp)

Provides: logging, notifications and toasts, navigation, shared settings access, persistence helpers, marketplace data access, DOM-safe utility helpers.

---

## Ownership

**Plugin modules own:**
- Plugin-specific rendering
- Plugin-specific event binding
- Plugin-specific persistence keys and migrations
- Plugin widget behavior
- Plugin workflows and feature logic

**`dashboard.js` owns:**
- Shell views and startup order
- Plugin metadata registry (`PLUGINS[]`)
- Plugin Manager
- Dashboard ordering and visibility enforcement
- Global settings coordination
- Diagnostics and shared platform state

---

## Consequences

Positive:
- Smaller and more maintainable `dashboard.js`
- Plugin changes isolated to plugin-owned modules
- Startup flow easier to validate
- Future TypeScript migration less risky

Trade-offs:
- Plugin APIs must remain stable enough for the shell to call them
- Script load order in `dashboard.html` is architecture-critical
- Flat deployment still coexists with inactive `src/` and `dist/` representations

---

## Future guidance

- New plugin behavior goes in a dedicated module under `plugins/` - not inside `dashboard.js`
- If a plugin needs a dashboard capability, add it to `window.ReplyCatorsApp` instead of coupling to shell internals
- Keep `dashboard.js` limited to orchestration concerns
- Preserve script order in `dashboard.html`: plugin modules first, shell last
- This ADR is the source of truth for popup runtime ownership boundaries
