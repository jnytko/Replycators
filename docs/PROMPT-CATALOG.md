# ReplyCators - AI Prompt Governance Catalog

**Version:** 1.0  
**Owner:** [ASSIGN — Prompt Governance Lead]  
**Last Full Review:** 2026-01  
**Next Review Due:** 2026-04 (quarterly)  
**Status:** Seeded — awaiting contributor feedback and effectiveness ratings

---

## Purpose

This catalog tracks all AI prompts used during development of ReplyCators. Prompts are engineering artifacts and are governed like documentation — they must be reviewed, versioned, and kept current.

**Why this exists:** Without a catalog, effective prompts are locked in individual contributor heads. When contributors change or AI tools update, that knowledge is lost. The catalog distributes prompt knowledge so any contributor can achieve consistent, high-quality AI output.

---

## Table of Contents

- [Governance Process](#governance-process)
- [Categories](#categories)
- [Prompt Entry Template](#prompt-entry-template)
- [Active Prompts — Plugin Creation](#active-prompts--plugin-creation)
- [Active Prompts — Platform Changes](#active-prompts--platform-changes)
- [Active Prompts — Documentation](#active-prompts--documentation)
- [Active Prompts — Debugging](#active-prompts--debugging)
- [Active Prompts — Code Review](#active-prompts--code-review)
- [Archived Prompts](#archived-prompts)

---

## Governance Process

### Adding a prompt

1. Use the Prompt Entry Template below
2. Choose the correct category (see Categories table)
3. Set status to `Draft`
4. Submit as a PR to this file
5. Reviewer verifies:
   - Output is deterministic when given the same inputs
   - Works correctly with current `AGENTS.md` context
   - Contains no sensitive data (customer PII, internal credentials)
   - Does not instruct AI to bypass Forbidden Changes
6. Once merged, status changes to `Active`

### Updating a prompt

1. Increment the version number (e.g., 1.0 → 1.1 for minor edit, 1.1 → 2.0 for new approach)
2. Describe what changed in the Revision History section
3. Submit as a PR

### Retiring a prompt

1. Change status to `Deprecated`
2. Add deprecation note with reason and alternative prompt (if available)
3. Archive after 60 days (move to Archived Prompts section at bottom of file)

### Review cadence

- **Quarterly:** Full review — test each Active prompt against current `AGENTS.md`
- **On MAJOR version bump:** Review all prompts for accuracy against new architecture
- **On plugin architecture change:** Review plugin-related prompts
- **On new AGENTS.md section:** Review prompts that reference that section

### Prompt sprawl prevention

- Maximum **5 prompts per category** before mandatory deduplication review
- If a new prompt is similar to an existing one, improve the existing one rather than creating a new entry
- Prompts not used in the past 6 months should be reviewed for retirement

---

## Categories

| Category | Purpose | Max Prompts |
|---|---|---|
| Plugin Creation | Creating new plugins from scratch or Example Plugin | 5 |
| Plugin Maintenance | Updating, debugging, or refactoring existing plugins | 5 |
| Platform Changes | Modifying `dashboard.js`, `background.js`, platform-level code | 5 |
| Documentation | Generating or updating documentation | 5 |
| Code Review | Reviewing AI-generated or human-written code | 5 |
| Debugging | Investigating bugs or unexpected behavior | 5 |
| Architecture | Architecture discussions and ADR drafting | 5 |
| Release | Preparing releases, changelogs, version bumps | 5 |

---

## Prompt Entry Template

Copy this template to add a new prompt.

```markdown
### [Category] - [Prompt Name]

| Field | Value |
|---|---|
| **Purpose** | [One sentence describing what this prompt accomplishes] |
| **Owner** | [GitHub handle] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | YYYY-MM-DD |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context
- [ ] [Any additional file that must be loaded — e.g., specific plugin file]
- [ ] [Any state that must be true before using this prompt]

#### Prompt

[Full prompt text. Use {{PLACEHOLDER}} for parameters that vary per use.]

#### Expected Output

[Describe what the AI should produce — format, length, content structure.]

#### Validation Checklist

After receiving AI output, verify:
- [ ] [Specific thing to check 1]
- [ ] [Specific thing to check 2]
- [ ] [Specific thing to check 3]

#### Usage Notes

- [Tip or caveat 1]
- [Tip or caveat 2]

#### Known Issues

- [Any known failure modes or edge cases]

#### Related Prompts

- [Name of similar or follow-up prompt in this catalog]

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| YYYY-MM-DD | @handle | Worked / Adjusted / Failed | [Notes] |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | YYYY-MM-DD | Initial version |
```

---

## Active Prompts — Plugin Creation

### Plugin Creation - Create Plugin from Example Plugin Baseline

| Field | Value |
|---|---|
| **Purpose** | Create a fully registered new plugin following Workflow A in the AI Plugin Kit |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context
- [ ] `docs/AI-PLUGIN-KIT.md` loaded into AI context
- [ ] `plugins/example-plugin.js` loaded into AI context
- [ ] `dashboard.js` PLUGINS[] section loaded (to verify no ID conflicts)

#### Prompt

```
You are working on the ReplyCators browser extension. I have loaded AGENTS.md, docs/AI-PLUGIN-KIT.md, and plugins/example-plugin.js into your context.

Create a new plugin following Workflow A (Create from Example Plugin) in the AI Plugin Kit.

Plugin specification:
- Name: {{PLUGIN_NAME}}
- Plugin ID: com.replycators.{{PLUGIN_SLUG}}
- View ID: plugin-{{PLUGIN_SLUG}}
- Category: {{CATEGORY}}
- Description: {{ONE_SENTENCE_DESCRIPTION}}
- Primary feature: {{WHAT_DOES_THIS_PLUGIN_DO_IN_1_SENTENCE}}
- Storage keys needed: {{LIST_ANY_STORAGE_KEYS_OR_"none"}}

Instructions:
1. Create the plugin file content following the Example Plugin structure exactly
2. After creating the plugin file, list (do NOT implement) all additional changes needed in dashboard.html
3. After creating the plugin file, list (do NOT implement) all additional changes needed in dashboard.js
4. Provide the complete Plugin Release Checklist (AGENTS.md §17) with items pre-filled for this plugin
5. Identify which storage keys need entries in docs/STORAGE.md and AGENTS.md §9

Do NOT modify dashboard.html or dashboard.js — only create the plugin file and list the required changes.
Do NOT use em-dashes (—) or en-dashes (–) in any user-facing string — use plain hyphens (-).
```

#### Expected Output

1. Complete `plugins/{{PLUGIN_SLUG}}.js` file content
2. Ordered list of HTML additions needed in `dashboard.html`
3. Ordered list of JS additions needed in `dashboard.js`
4. Plugin Release Checklist from AGENTS.md §17 with pre-filled items
5. List of storage keys to document

#### Validation Checklist

After receiving AI output, verify:
- [ ] Plugin file uses IIFE pattern (not ES modules)
- [ ] Plugin self-registers on `window.ReplyCatorsPlugins`
- [ ] Plugin exposes `init()`, and optionally `render()`, `onNavigate()`, `onLeave()`
- [ ] `init()` is synchronous only — no async I/O (AGENTS.md startup performance rule)
- [ ] Uses `.rc-plugin-header`, `.rc-plugin-body` layout classes
- [ ] No `console.log()` calls — only `window.ReplyCatorsApp.addLog()`
- [ ] No custom toast UI — only `window.ReplyCatorsApp.showToast()`
- [ ] Plugin ID follows `com.replycators.<slug>` format
- [ ] No em-dashes in user-facing strings

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| — | — | — | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

### Plugin Creation - Complete Plugin Registration

| Field | Value |
|---|---|
| **Purpose** | Complete all dashboard.html and dashboard.js registration steps after plugin file is created |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |

#### Prerequisites

- [ ] `AGENTS.md` loaded (especially §8, §10, §11, §17)
- [ ] `dashboard.html` loaded into AI context
- [ ] `dashboard.js` loaded into AI context (or at least the PLUGINS[] and navigation sections)
- [ ] New plugin `.js` file loaded

#### Prompt

```
I have created a new ReplyCators plugin file. I need to complete the plugin registration in dashboard.html and dashboard.js.

AGENTS.md, dashboard.html, dashboard.js, and the new plugin file are loaded into your context.

New plugin details:
- Name: {{PLUGIN_NAME}}
- Plugin ID: com.replycators.{{PLUGIN_SLUG}}
- View ID: plugin-{{PLUGIN_SLUG}}
- Category: {{CATEGORY}}
- Version: {{VERSION}}
- Icon semantic ID: {{ICON_ID}}
- Description: {{DESCRIPTION}}

Complete ALL steps in the registration checklist (AGENTS.md §10) that require modifying dashboard.html or dashboard.js:
1. Add PLUGINS[] entry to dashboard.js
2. Add plugin view HTML to dashboard.html (using .rc-plugin-page + .rc-plugin-header standard)
3. Add dashboard widget card to #rc-dashboard-widgets in dashboard.html
4. Add script tag in correct position in dashboard.html
5. Add _safeInit() call in dashboard.js DOMContentLoaded block
6. Add onNavigate() delegate in navigateTo() in dashboard.js
7. Add onLeave() call in navigateTo() leave block in dashboard.js
8. Add plugin option to #activity-plugin-filter in dashboard.html

Show exact diff for each change. Do NOT use em-dashes or en-dashes in any user-facing string.
```

#### Validation Checklist

- [ ] PLUGINS[] entry has all required fields: id, name, viewId, icon, version, description, category
- [ ] Plugin view uses `.rc-view.rc-plugin-page` wrapper
- [ ] Plugin header uses `.rc-plugin-header` with `.rc-plugin-header__name`, `.rc-plugin-header__version`
- [ ] Documentation icon button present with correct `data-doc-view` attribute
- [ ] Widget card has `data-plugin-widget` attribute
- [ ] Script tag is BEFORE `dashboard.js` script tag

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

## Active Prompts — Platform Changes

### Platform Changes - Investigate dashboard.js Function Before Modification

| Field | Value |
|---|---|
| **Purpose** | Understand a function in dashboard.js before modifying it — avoids unintended side effects |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |

#### Prerequisites

- [ ] `AGENTS.md` loaded
- [ ] Relevant section of `dashboard.js` loaded (or full file)

#### Prompt

```
I am analyzing a function in dashboard.js in the ReplyCators extension before modifying it. AGENTS.md and the relevant dashboard.js code are loaded into your context.

Function to analyze: {{FUNCTION_NAME}}

Please provide:
1. What this function does and why it exists
2. All callers of this function visible in the loaded code
3. All chrome.storage.local keys this function reads or writes (cross-reference AGENTS.md §5 Source of Truth Matrix)
4. All global/in-memory state this function reads or writes
5. Any side effects (toast notifications, log entries, DOM mutations, event dispatches)
6. Risk assessment if this function is changed incorrectly
7. Whether this change requires a PATCH, MINOR, or MAJOR version bump (per AGENTS.md §12 decision tree)
8. Whether this change requires a new ADR (per AGENTS.md §6 Architecture Decisions)

My planned change: {{DESCRIBE_PLANNED_CHANGE}}

Do not make any changes yet — analysis only.
```

#### Validation Checklist

- [ ] Callers list is complete (no orphaned references)
- [ ] Storage keys identified match Source of Truth Matrix entries
- [ ] Version classification is correct per AGENTS.md §12
- [ ] ADR requirement properly assessed

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

## Active Prompts — Documentation

### Documentation - Update AGENTS.md for New Plugin

| Field | Value |
|---|---|
| **Purpose** | Update AGENTS.md for all required sections when a new plugin is added |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context
- [ ] New plugin's `.js` file loaded

#### Prompt

```
I have added a new plugin to ReplyCators. AGENTS.md and the new plugin file are loaded into your context.

Update AGENTS.md for this plugin following the §21 Maintenance Requirements rules.

Plugin details:
- Plugin name: {{PLUGIN_NAME}}
- Plugin ID: {{PLUGIN_ID}}
- View ID: {{VIEW_ID}}
- Version: {{VERSION}}
- Category: {{CATEGORY}}
- Runtime module: {{FILENAME}}.js
- Storage keys: {{LIST_STORAGE_KEYS_OR_"none"}}
- Content scripts: {{LIST_OR_"none"}}

For each section below, provide the EXACT text to add:

1. §8 Plugin Inventory table — new row
2. §8 Plugin Source Locations table — new row
3. §9 Storage Schema — new plugin key block (if storage keys added)
4. §10 Active Views table — new row
5. §12 "Plugin versions at this release" list — new entry
6. §21 Maintenance Requirements — verify no new update triggers needed

Show the complete before/after for each section. Ensure no em-dashes in any text.
```

#### Validation Checklist

- [ ] Plugin Inventory entry has: Plugin name, View ID, Plugin ID, Version, Category
- [ ] Source Locations entry includes content script path (if applicable)
- [ ] Storage keys documented with key string, type/shape, and max entries
- [ ] Active Views entry has: View ID, nav data-view value, Description
- [ ] Plugin versions list includes all 10 plugins (add new one at correct alphabetical position)

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

### Documentation - Generate CHANGELOG.md Entry

| Field | Value |
|---|---|
| **Purpose** | Generate a correctly formatted CHANGELOG.md entry from a description of changes |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |

#### Prerequisites

- [ ] `CHANGELOG.md` loaded (to see current format and most recent entry)

#### Prompt

```
Generate a correctly formatted CHANGELOG.md entry for a ReplyCators release.

Reference the format of the most recent entry in CHANGELOG.md loaded in your context.

Release details:
- Version: {{NEW_VERSION}}
- Date: {{TODAY_DATE}}
- Component changed: {{COMPONENT}}
- Short title: {{TITLE_UNDER_60_CHARS}}
- Type: {{Bug Fix | Feature | Enhancement | Refactor | UI | Breaking}}
- Summary: {{2_SENTENCE_DESCRIPTION}}
- Files changed: {{LIST_FILES_AND_WHAT_CHANGED}}
- Breaking changes: {{None OR description + migration steps}}
- Issue number (if any): {{#NNN OR "none"}}

Current plugin versions:
- Salesforce Case Extractor: {{VERSION}}
- Cloudability OrgID: {{VERSION}}
- Edge Bookmark Finder: {{VERSION}}
- Apptio Planning Upgrade Calculator: {{VERSION}}
- Workspace Starter: {{VERSION}}
- Tab Search: {{VERSION}}
- Snake: {{VERSION}}
- Example Plugin: {{VERSION}}
- Apptio Documentation Finder: {{VERSION}}
- Environment Dashboards Launcher: {{VERSION}}

Output the complete CHANGELOG entry in the correct Markdown format.
Do NOT use em-dashes (—) or en-dashes (–) in any text — use plain hyphens (-).
```

#### Validation Checklist

- [ ] All 10 plugins listed in plugin versions section
- [ ] Type field matches the predefined list (Bug Fix | Feature | Enhancement | Refactor | UI | Breaking)
- [ ] No em-dashes or en-dashes in the output
- [ ] Files changed section lists each modified file individually
- [ ] Summary is exactly 1-2 sentences

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

## Active Prompts — Debugging

### Debugging - Investigate Storage State Anomaly

| Field | Value |
|---|---|
| **Purpose** | Debug unexpected plugin behavior by analyzing storage key ownership and lifecycle |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |

#### Prerequisites

- [ ] `AGENTS.md` loaded (§5 Source of Truth Matrix, §9 Storage Architecture)
- [ ] Affected plugin's `.js` file loaded

#### Prompt

```
I am debugging unexpected behavior in the ReplyCators extension. AGENTS.md and the affected plugin code are loaded into your context.

Symptom: {{DESCRIBE_EXACT_SYMPTOM_INCLUDING_STEPS_TO_REPRODUCE}}
Plugin affected: {{PLUGIN_NAME}}
Last known working: {{VERSION_OR_"unknown"}}
Error in console (if any): {{PASTE_OR_"none"}}

Analysis requested:
1. List all chrome.storage.local keys this plugin reads or writes — cross-reference AGENTS.md §5 and §9
2. For each key: describe expected value shape and lifecycle
3. Identify any storage key that could be stale, malformed, or contain unexpected data
4. Identify any race condition between init(), onNavigate(), and render() calls
5. Identify if any storage write is missing a corresponding read on next load
6. Propose how to verify current storage state using chrome.storage.local.get() in DevTools
7. Propose the minimal fix that addresses the root cause
8. Identify the correct PATCH/MINOR/MAJOR classification for the fix

Do not implement the fix yet. Analysis only.
```

#### Validation Checklist

- [ ] All storage keys identified match AGENTS.md §5 Source of Truth Matrix entries
- [ ] Race conditions between lifecycle phases explicitly checked
- [ ] Verification steps work in browser DevTools console
- [ ] Fix targets root cause, not symptom

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

## Active Prompts — Code Review

### Code Review - Verify AI-Generated Plugin Against Platform Standards

| Field | Value |
|---|---|
| **Purpose** | Review AI-generated plugin code for compliance with all platform standards before PR submission |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-01 |

#### Prerequisites

- [ ] `AGENTS.md` loaded (§2, §3, §8, §11, §16, §28)
- [ ] `PLUGIN-SDK.md` loaded
- [ ] Generated plugin file loaded

#### Prompt

```
Review the AI-generated plugin code for compliance with all ReplyCators platform standards. AGENTS.md, PLUGIN-SDK.md, and the plugin code are loaded into your context.

Check the following and report any violations:

CRITICAL violations (block merge):
1. Uses console.log/warn/error instead of window.ReplyCatorsApp.addLog()
2. Creates custom toast/notification UI instead of window.ReplyCatorsApp.showToast()
3. Contains em-dash (—) or en-dash (–) in any user-facing string (§28 ASCII Punctuation Standard)
4. Contains any action from the AGENTS.md §11 Forbidden Changes table
5. Creates __-prefixed directories
6. Directly imports from or modifies dist/ files
7. Contains async I/O in init() method (violates startup performance rule)
8. Uses non-Streamline icons (emoji, Font Awesome, Lucide, remote URLs, inline SVG)

STANDARD violations (should fix before merge):
9. Does not use .rc-plugin-header, .rc-plugin-body layout structure
10. Does not include .rc-plugin-header__version element
11. Does not include .rc-doc-icon documentation button in header
12. Primary workflow (hero element) is not first in plugin body (§11 Primary Workflow Protection)
13. Storage keys not following rc:plugin:com.replycators.<slug>:<key> format
14. Plugin does not self-register on window.ReplyCatorsPlugins

For each violation found:
- Quote the exact offending code
- Explain which standard it violates (cite AGENTS.md section)
- Provide the corrected code

If no violations found, state "No violations found" for each category.
```

#### Validation Checklist

- [ ] All CRITICAL violations checked and addressed
- [ ] All STANDARD violations reviewed and accepted or addressed
- [ ] Storage key format verified
- [ ] Accessibility: all interactive elements have title attributes

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01 | Initial version |

---

## Archived Prompts

_No archived prompts yet. Prompts are archived here after 60 days of Deprecated status._

---

## Prompt Effectiveness Reference

| Rating | Meaning |
|---|---|
| Not yet rated | Seeded but not tested in real use |
| 1/5 | Consistently requires major rework to get useful output |
| 2/5 | Needs significant adjustment most of the time |
| 3/5 | Works with minor adjustments |
| 4/5 | Works well with minimal adjustment |
| 5/5 | Produces correct output consistently |

**Rating system:** Each contributor who uses a prompt logs their result in the Feedback Log. Effectiveness ratings are updated quarterly based on logged feedback.
