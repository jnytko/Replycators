# ReplyCators - Contributor Onboarding Guide

**Version:** 1.0 | **Audience:** New contributors | **Maintained by:** Repository Owner  
**Last updated:** 2026-01 | **Read time:** ~20 minutes

> **Welcome to ReplyCators!** This guide walks you through your first week as a contributor. By the end you will have loaded the extension, understood the codebase, and made your first pull request.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Ways of Working](#ways-of-working)
- [GitHub Workflow](#github-workflow)
- [AI-Assisted Development Expectations](#ai-assisted-development-expectations)
- [Documentation Standards](#documentation-standards)
- [Release Process](#release-process)
- [Definition of Done](#definition-of-done)
- [Common Contributor Mistakes](#common-contributor-mistakes)
- [First-Week Onboarding Checklist](#first-week-onboarding-checklist)
- [Getting Help](#getting-help)

---

## Project Overview

ReplyCators is a **plugin-based Microsoft Edge extension platform** for support engineers. A single dashboard UI hosts multiple plugins. The platform provides shared navigation, settings, storage, notifications, logging, and plugin lifecycle management. Plugins provide the business functionality.

**Three things to understand immediately:**

1. **The extension loads directly from the repository root.** Not `src/`. Not `dist/`. The project root folder.
2. **Most code is AI-assisted.** Read `AGENTS.md` before asking any AI to help with this codebase.
3. **3 active contributors shipping weekly.** We move fast and maintain high documentation standards.

**Current plugins (10 built-in):**

| Plugin | Purpose |
|--------|---------|
| Salesforce Case Extractor | Extracts structured case data from Salesforce Lightning |
| Cloudability OrgID | Automatically resolves Cloudability Organization ID |
| Edge Bookmark Finder | Searches Edge bookmarks in real time |
| Apptio Planning Upgrade Calculator | Calculates Apptio upgrade dates |
| Workspace Starter | Launches named workspace profiles with tab grouping |
| Tab Search | Live search across all open browser tabs |
| Snake | Classic retro Snake game |
| Apptio Documentation Finder | IBM Docs search for Apptio products |
| Environment Dashboards Launcher | Launches environment-specific dashboards |
| Example Plugin | Canonical reference implementation - read this first |

---

## Repository Structure

```
ReplyCators/
├── manifest.json          ← Extension manifest (CODEOWNER protected)
├── dashboard.html         ← UI shell - all views declared here
├── dashboard.js           ← Application orchestrator (CODEOWNER protected)
├── background.js          ← Background service worker (CODEOWNER protected)
├── options.html           ← Options page
├── styles/
│   ├── platform.css       ← Design tokens and layout primitives
│   └── dashboard.css      ← Dashboard-specific styles
├── plugins/               ← Plugin runtime modules (one .js per plugin)
│   ├── example-plugin.js  ← READ THIS FIRST - canonical reference
│   └── shared/
│       └── icon-helper.js ← Centralized icon registry and renderer
├── assets/icons/          ← Streamline SVG icons and extension icons
├── tools/                 ← Developer utilities (NOT loaded by extension)
│   ├── bob-helper-server.js  ← IBM Bob HTTP bridge
│   └── bob-helper.ps1        ← PowerShell management script
├── build/                 ← Build scripts only
├── docs/                  ← Engineering documentation (23 documents)
├── src/                   ← TypeScript stubs - INACTIVE - editing here has no effect
└── dist/                  ← Runtime mirror - NEVER edit directly
```

### The most important rule: which file to edit

| What to change | Edit this file | Never edit |
|---|---|---|
| Plugin logic or UI | `plugins/<name>.js` | `src/plugins/*/index.ts` |
| All plugin views/HTML | `dashboard.html` | `src/popup/dashboard.html` |
| Platform behavior | `dashboard.js` | `src/popup/dashboard.ts` |
| Background processing | `background.js` | `src/background/service-worker.ts` |
| Shared styling | `styles/platform.css` or `styles/dashboard.css` | `src/assets/styles/` |

**Key principle:** `src/` is inactive scaffolding for a future TypeScript migration (RC-015 Phase 2). Editing it has zero effect on the running extension. `dist/` is auto-generated — never edit it directly.

---

## Ways of Working

### Before ANY change

1. **Read AGENTS.md §1-6** (sections on Overview, Critical Rules, Active Runtime Architecture, Repository Structure, Source of Truth Matrix, Architecture Decisions)
2. **Check the Forbidden Changes table** (AGENTS.md §11) — 23 things you must never do
3. **Identify the correct file** using the decision table above
4. **Check the Source of Truth Matrix** (AGENTS.md §5) for any storage key you plan to read or write

### Making a change

1. Create a branch: `git checkout -b fix/plugin-name-short-description`
2. Edit the root file (not `src/` or `dist/`)
3. Sync to `dist/` after editing:
   ```powershell
   npm run sync     # sync without build
   # OR
   npm run build    # full build (auto-syncs via postbuild)
   ```
4. Reload extension at `edge://extensions/` → click Reload
5. Open popup/side panel — verify no console errors
6. Test manually using QA Matrix (AGENTS.md §16)
7. Update documentation (AGENTS.md §23-A — code incomplete without docs)
8. Update version numbers (AGENTS.md §12 — 10 locations, all must match)
9. Update `CHANGELOG.md` with a structured entry

### After your change

Verify the Definition of Done checklist (below) before submitting your PR.

---

## GitHub Workflow

### Branching strategy

- `main` is always in a releasable state
- All work on short-lived branches
- **Naming:** `feature/<scope>-<description>`, `fix/<scope>-<description>`, `docs/<description>`, `chore/<description>`
- Delete your branch after merge
- Direct push to `main` is strongly discouraged — always use a PR

### Commit message format

```
type(scope): short summary in imperative mood

Types:   feat | fix | docs | style | refactor | chore
Scopes:  platform | plugin/<name> | settings | ui | storage | docs
```

Examples:
```
feat(plugin/tab-search): add group-by-domain toggle
fix(plugin/workspace-starter): fix startup race on last view restore
docs(storage): document new rc:plugin:com.replycators.example:prefs key
```

### Pull request rules

1. Complete **all 37 items** in `.github/PULL_REQUEST_TEMPLATE.md` before marking PR ready for review
2. Changes to `manifest.json`, `dashboard.js`, `background.js`, `AGENTS.md`, `.github/` require CODEOWNERS review
3. CI must pass: TypeScript type-check + webpack build + root/dist sync verification
4. A PR with incomplete documentation (AGENTS.md, CHANGELOG.md, docs/) will be sent back

### When CI fails

| Failing job | Likely cause | Fix |
|---|---|---|
| TypeScript Type-check | Type error in `src/` stubs | Fix the type error in `src/` (even though inactive, must be valid) |
| Webpack Build | Webpack configuration error | Check `build/webpack.config.js` |
| Root ↔ dist/ Sync Check | Root files changed but dist/ not synced | Run `npm run sync` and commit dist/ changes |

---

## AI-Assisted Development Expectations

AI assistance is **expected and welcome**. The project is explicitly designed for AI-first development.

### Before using an AI assistant

1. Load `AGENTS.md` into your AI agent's context — it is the authoritative briefing
2. For plugin creation: also load `docs/AI-PLUGIN-KIT.md`
3. Check `docs/PROMPT-CATALOG.md` for proven, tested prompts
4. For new or existing issue work: load `docs/ISSUE-WORKFLOW.md` and search open and closed issues first

### What AI agents must NOT do (enforced via Forbidden Changes table)

| Prohibited Action | Required Instead |
|---|---|
| Edit `src/` files expecting live effect | Edit root files only |
| Edit `dist/` files directly | Edit root files + run `npm run sync` |
| Create `__`-prefixed directories | Use `tests/`, `mocks/`, `fixtures/` |
| Use `console.log()` in runtime code | Use `window.ReplyCatorsApp.addLog()` |
| Create custom toast/notification UI | Use `window.ReplyCatorsApp.showToast()` |
| Use non-Streamline icons | Use `window.ReplyCatorsIconHelper.renderIcon()` |
| Create plugin-specific CSS design language | Use `.rc-plugin-*` CSS classes from PLUGIN-SDK.md |

### Verifying AI-generated code

Before every PR that includes AI-generated code:
- [ ] Does it load without console errors at `edge://extensions/`?
- [ ] Does it use the platform design system (`.rc-plugin-*` CSS classes)?
- [ ] Does it use `ReplyCatorsApp.addLog()` instead of `console.log()`?
- [ ] Are storage keys correct (check Source of Truth Matrix in AGENTS.md §5)?
- [ ] Are there any em-dashes (—) or en-dashes (–) in user-facing strings? (Must be plain hyphens - per §28)
- [ ] Did the AI invent any APIs or methods that don't exist?
- [ ] Were all architectural constraints (Forbidden Changes) respected?

### Marking AI contributions

In your PR description, note if significant sections were AI-generated. This helps reviewers apply appropriate scrutiny.

---

## Documentation Standards

> **Hard rule:** A change is NOT done if documentation has not been updated. Code and documentation must be synchronized in the same commit.

This is enforced via the PR Release Gate checklist. PRs with stale documentation will be sent back.

### What must be updated for each change type (AGENTS.md §23-A)

| Change type | Must update |
|---|---|
| New plugin added | `AGENTS.md` §8 + §9 + §10, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, create `docs/plugins/<name>.md` |
| Plugin behavior changed | `AGENTS.md` §8, plugin doc, `CHANGELOG.md` |
| New storage key | `docs/STORAGE.md`, `AGENTS.md` §9 |
| Settings changed | `docs/SETTINGS.md`, `CHANGELOG.md` |
| UI/navigation changed | `docs/ARCHITECTURE.md`, `AGENTS.md` §10 |
| Startup flow changed | `docs/STARTUP-FLOW.md` |
| Theme added | `docs/THEMES.md` |
| Architecture decision made | Create `docs/adr/ADR-NNN-title.md` + update `AGENTS.md` §6 |

### CHANGELOG.md entry format (mandatory for every release)

```markdown
## [X.Y.Z] - YYYY-MM-DD
### [Component] - [Short title]
**Type:** Bug Fix | Feature | Enhancement | Refactor
**Summary:** 1-2 sentence description of what changed and why.
**Files changed:**
- `path/to/file` - what changed in this file
- `another/file` - what changed here
**Breaking changes:** None
**Plugin versions at this release:**
- Salesforce Case Extractor: X.Y.Z
- Cloudability OrgID: X.Y.Z
- Edge Bookmark Finder: X.Y.Z
- Apptio Planning Upgrade Calculator: X.Y.Z
- Workspace Starter: X.Y.Z
- Tab Search: X.Y.Z
- Snake: X.Y.Z
- Example Plugin: X.Y.Z
- Apptio Documentation Finder: X.Y.Z
- Environment Dashboards Launcher: X.Y.Z
```

---

## Release Process

### Version bump decision tree

```
Does anything break for existing users?  YES → MAJOR (requires 5-item approval, AGENTS.md §12)
         | NO
New user-facing capability?              YES → MINOR
         | NO
Bug fix or polish only?                  YES → PATCH
         | NO
Documentation only?                           → No version bump
```

### The 10 version locations (all must match before release)

```
1. manifest.json               → "version"
2. package.json                → "version"
3. AGENTS.md                   → Project Overview version field
4. dashboard.html              → <span id="rc-platform-version">
5. dashboard.js                → file header comment (line 1)
6. CHANGELOG.md                → latest entry header
7. docs/PACKAGING.md           → release artifact rename command
8. dist/manifest.json          → synced from root
9. dist/dashboard.html         → synced from root
10. dist/dashboard.js          → synced from root
```

**If your change affects a specific plugin**, also update:
- Plugin version in `dashboard.js` `PLUGINS[]` array
- Plugin version in `dashboard.html` plugin header `.rc-plugin-header__version`

### Packaging a release

```powershell
npm run package
Rename-Item "build\replycators.zip" "build\replycators-X.Y.Z.zip"
git tag -a vX.Y.Z -m "Release vX.Y.Z: [brief description]"
git push origin vX.Y.Z
```

Then create a GitHub Release at `github.com/jnytko/Replycators/releases/new` with the CHANGELOG entry as release notes.

---

## Definition of Done

A task is **complete** only when ALL of the following are true:

- [ ] Code works as expected in both **Popup mode** and **Side Panel mode**
- [ ] No console errors on load or on navigation to any affected view
- [ ] **QA Matrix** executed (AGENTS.md §16) for all affected workflows
- [ ] Version numbers updated in **all 10 authoritative locations** (AGENTS.md §12)
- [ ] `CHANGELOG.md` entry added with full structured format
- [ ] All affected documentation updated (AGENTS.md §23-A)
- [ ] `AGENTS.md` updated if plugin, storage key, ADR, or architecture changed
- [ ] `npm run sync:verify` passes (root and `dist/` in sync)
- [ ] PR template Release Gate checklist fully completed
- [ ] CI (typecheck, build, sync-check) passes

---

## Common Contributor Mistakes

### 1. Editing `src/` expecting live behavior
`src/` contains inactive TypeScript stubs for a future migration. Editing these files **has zero effect on the running extension**. Always edit root files: `dashboard.js`, `plugins/*.js`, `dashboard.html`.

### 2. Editing `dist/` directly
`dist/` is auto-generated. Any direct changes will be overwritten by the next `npm run sync` or `npm run build`. Never edit it.

### 3. Forgetting to sync after root edits
After editing any root file (`dashboard.html`, `dashboard.js`, etc.), run `npm run sync`. Otherwise `dist/` will be out of sync and the CI sync-check job will fail.

### 4. Creating `__`-prefixed directories
Microsoft Edge and Chrome refuse to load extensions containing directories named `__tests__`, `__mocks__`, etc. This will break the extension silently on load. Use `tests/`, `mocks/`, `fixtures/` instead.

### 5. Using `console.log()` in runtime code
Use `window.ReplyCatorsApp.addLog()` for all logging. `console.log` outputs are invisible in production context and violate the platform logging standard.

### 6. Partial version update (updating only manifest.json)
All 10 version locations must match. Updating only one will cause version display mismatches in the UI and sync-check failures. Always use the complete 10-location checklist.

### 7. Skipping the documentation co-update
Documentation must be updated in the same commit as the code change. PRs with stale documentation will be sent back. AGENTS.md §23-A defines exactly which files to update.

### 8. Creating a plugin from scratch without the Example Plugin baseline
Always start new plugins from `plugins/example-plugin.js` or use `npm run create-plugin`. Creating from scratch risks skipping required registration steps (there are 12 of them).

### 9. Adding custom CSS that duplicates platform tokens
Before creating any new CSS class, check `styles/platform.css` and `PLUGIN-SDK.md`. Most layout, spacing, and component patterns already exist as `.rc-plugin-*` classes.

### 10. Using a non-Streamline icon
All icons must come from Streamline Ultimate Colors - Free through the central registry (`plugins/shared/icon-helper.js`). Emoji, Unicode symbols, Google Material, Lucide, Font Awesome, and remote URLs are all prohibited.

### 11. Em-dash in user-facing strings
Never use `—` (U+2014 em dash) or `–` (U+2013 en dash) in any text that will be rendered in the UI. Use plain ASCII hyphen `-`. This is §28 ASCII Punctuation Standard — particularly relevant since AI tools insert em-dashes by default.

### 12. Adding a plugin without the Documentation Accessibility requirements
Every plugin must have a docs button in its header and widget card, a topic in `plugins/documentation.js`, and a `PLUGIN_DOC_MAP` entry in `dashboard.js` (AGENTS.md §27).

---

## First-Week Onboarding Checklist

### Day 1: Environment Setup

- [ ] Clone: `git clone https://github.com/jnytko/Replycators.git`
- [ ] Open Edge → `edge://extensions/` → Enable Developer Mode
- [ ] Click "Load unpacked" → select the project root folder (contains `manifest.json`)
- [ ] Verify ReplyCators icon appears in the Edge toolbar
- [ ] Open the extension popup — verify it loads without console errors (F12 to open DevTools)
- [ ] Navigate through all platform views (Dashboard, Plugins, Marketplace, Notifications, Maintenance, Settings)
- [ ] Navigate through all 10 plugin views
- [ ] Reload extension: `edge://extensions/` → click Reload next to ReplyCators

**Day 1 goal:** Extension installed and running. You can navigate all views.

---

### Day 2: Core Documentation

- [ ] Read `README.md` (5 minutes — project overview)
- [ ] Read `AGENTS.md` §1 (Project Overview) and §2 (Critical Rules)
- [ ] Read `AGENTS.md` §3 (Active Runtime Architecture) — understand dual-deployment model
- [ ] Read `AGENTS.md` §4 (Repository Structure) — understand folder purposes
- [ ] Read `AGENTS.md` §5 (Source of Truth Matrix) — understand state ownership
- [ ] Read `AGENTS.md` §6 (Architecture Decisions) — read all 8 ADRs
- [ ] Read `CONTRIBUTING.md` in full
- [ ] Open `plugins/example-plugin.js` and read it completely — this is the canonical reference

**Day 2 goal:** You understand why root files are the runtime and how plugins register.

---

### Day 3: Build Tools and Workflow

- [ ] Verify Node.js is available at `[root]\Runtime\NodeJS` (not inside this repository)
- [ ] Run `npm run typecheck` — confirm zero TypeScript errors
- [ ] Run `npm run build` — confirm webpack build succeeds
- [ ] Run `npm run sync:verify` — confirm root and `dist/` are in sync
- [ ] Make a trivial change to a comment in `dashboard.html`
- [ ] Run `npm run sync`
- [ ] Reload extension at `edge://extensions/` — verify it still loads
- [ ] Revert your change: `git checkout dashboard.html`
- [ ] Read `docs/STARTUP-FLOW.md` — understand the boot sequence

**Day 3 goal:** You can edit root files, sync to dist/, and reload the extension.

---

### Day 4: First Issue

- [ ] Go to GitHub Issues and read all open issues
- [ ] Pick a `documentation` or `good first issue` labeled issue
- [ ] Create a branch: `git checkout -b docs/your-first-contribution`
- [ ] Make your change
- [ ] Verify the Definition of Done checklist above
- [ ] Submit a **draft** PR
- [ ] Review `.github/PULL_REQUEST_TEMPLATE.md` — how many items can you complete?
- [ ] Ask for feedback from an existing contributor (convert from draft when ready)

**Day 4 goal:** First draft PR submitted with correct documentation and version handling.

---

### Day 5: Plugin Architecture Exploration

- [ ] Open `plugins/example-plugin.js` and `dashboard.js` side-by-side
- [ ] Find where `ExamplePlugin` is registered in `dashboard.js` `PLUGINS[]` array
- [ ] Find where `example-plugin.js` is loaded in `dashboard.html`
- [ ] Navigate to the Example Plugin view in the extension
- [ ] Open DevTools (F12 on popup) and observe the Activity Log
- [ ] Read `docs/STORAGE.md` — understand how plugin data persists
- [ ] Read `docs/AI-PLUGIN-KIT.md` §Architecture Summary

**Day 5 goal:** You understand the plugin registration contract and lifecycle.

---

### End of Week 1 Knowledge Check

Before starting independent work, confirm you can answer these without looking:

1. **Which files are the active runtime?**  
   Answer: Root-level files (`dashboard.html`, `dashboard.js`, `background.js`, `plugins/*.js`). Not `src/`, not `dist/`.

2. **How do you add a new plugin?**  
   Answer: Follow the 12-step registration process in AGENTS.md §10 (or `npm run create-plugin` for scaffolding).

3. **Where is the authoritative source for platform settings?**  
   Answer: `chrome.storage.local` key `rc:session:app-settings`.

4. **What three things must be updated after any code change?**  
   Answer: `AGENTS.md` (if applicable), `CHANGELOG.md`, and affected `docs/` files.

5. **What is forbidden in plugin runtime code?**  
   Answer: `console.log/warn/error`, custom toast UI, custom logger, custom icon system, custom CSS design language, em-dashes in UI strings.

6. **How do you fix a CI sync-check failure?**  
   Answer: Run `npm run sync` and commit the updated `dist/` files.

---

## Getting Help

**GitHub Issues:** Use the Bug report or Change proposal form when it fits. Use a blank issue for a concrete question or task that fits neither form. Follow `docs/ISSUE-WORKFLOW.md` and do not apply workflow or automation labels unless a maintainer directs you to do so.

**Code review:** Request review on your draft PR and ask specific questions in PR comments

**AGENTS.md search:** Use Ctrl+F before asking — most questions are answered in AGENTS.md

**Key reference documents:**
- `AGENTS.md` — Authoritative briefing for all contributors
- `docs/TROUBLESHOOTING.md` — Common runtime errors and fixes
- `docs/AI-PLUGIN-KIT.md` — AI agent workflows for plugin tasks
- `docs/CONTRIBUTING.md` — Contribution workflow and standards
- `docs/ISSUE-WORKFLOW.md` - Issue creation, validation, implementation updates, and verification
- `PLUGIN-SDK.md` — Plugin SDK standards and CSS class reference

**Before asking:** Search `AGENTS.md`, `docs/CONTRIBUTING.md`, and `docs/TROUBLESHOOTING.md`. Most questions are already answered in the existing documentation.
