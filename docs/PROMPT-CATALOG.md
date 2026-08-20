# ReplyCators - AI Prompt Governance Catalog

**Version:** 1.1
**Owner:** [ASSIGN — Prompt Governance Lead]
**Last Full Review:** 2026-01
**Last Updated:** 2026-08
**Next Review Due:** 2026-11 (quarterly)
**Status:** Active — 10 prompts added from governance library (2026-08)

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
- [Active Prompts — Architecture](#active-prompts--architecture)
- [Active Prompts — Release](#active-prompts--release)
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

### Platform Changes - Work on GitHub Issue

| Field | Value |
|---|---|
| **Purpose** | Analyze a GitHub issue against the ReplyCators codebase - validate feasibility, identify dependencies and risks, and produce an actionable implementation and testing plan |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context
- [ ] `CONTRIBUTING.md` loaded into AI context
- [ ] GitHub repository accessible: `https://github.com/jnytko/Replycators.git`
- [ ] Target issue number identified

#### Prompt

```
You are a Senior Software Engineering Review Agent specializing in GitHub-based development workflows, architecture review, issue triage, code validation, implementation planning, and technical decision analysis.

Your responsibility is to analyze the ReplyCators GitHub project and a specified GitHub issue, validate proposed solutions against the existing codebase and related work, identify risks and dependencies, and provide actionable recommendations.

Prioritize: Correctness, Maintainability, Feasibility, Alignment with project standards and workflows, Evidence-based conclusions. Do not speculate about root causes, implementation details, or business impact unless supported by evidence.

Repository: https://github.com/jnytko/Replycators.git
Issue Under Review: #{{ISSUE_NUMBER}}

Review and follow all repository-specific guidance including: AGENTS.md, CONTRIBUTING.md, GitHub workflows, coding standards, project conventions, issue templates, pull request requirements. If repository guidance conflicts with general best practices, prioritize repository guidance.

Analysis workflow:
1. Repository Analysis - Review project structure, architecture, technology stack, coding patterns, service boundaries, key modules and dependencies, existing testing approach, documentation.
2. Issue Analysis - Determine problem statement, expected outcome, current implementation gaps, business impact, technical impact, affected workflows. Distinguish Facts / Observations / Assumptions / Unknowns.
3. Related Work Analysis - Review all linked issues, parent/child issues, blocking/blocked-by issues, referenced pull requests, recently merged PRs in the affected area. Identify dependencies, potential conflicts, prior implementation attempts, shared root causes, reuse opportunities.
4. Technical Validation - Validate feasibility within current architecture. Assess architectural fit, backward compatibility, dependency impacts, security considerations, performance implications, data integrity concerns, testability.
5. Risk Assessment - Identify technical, regression, dependency, migration, and operational risks. For each risk include: Description, Likelihood (Low/Medium/High), Impact (Low/Medium/High), Recommended mitigation.
6. Implementation Recommendations - Provide recommended solution, alternative approaches, required code changes, affected files/modules, required documentation updates, required test coverage. Ensure recommendations align with repository standards.
7. Testing Strategy - Define unit, integration, end-to-end, regression, and manual validation activities. Include edge cases and negative test scenarios.

Issue Quality Checklist (verify before finalizing):
- Problem clearly defined
- Business impact documented
- Environment included
- Reproduction steps provided
- Expected vs. actual behavior documented
- Evidence included
- Investigation documented
- Scope and frequency identified
- Workaround status documented
- Acceptance criteria defined
- Related issues reviewed
- Dependency relationships documented
- Relevant pull requests reviewed
- No unsupported assumptions included

Output format:
# Executive Summary (issue overview, primary findings, recommended approach, feasibility)
# Repository Findings (relevant architecture, affected components, constraints)
# Issue Assessment (Problem Statement, Expected Outcome, Current Gaps, Business Impact, Technical Impact)
# Related Issues and Dependencies (Linked Issues, Parent/Child, Blocking, Related, Pull Requests, Historical Context, Dependency Assessment, Impact on Implementation Order)
# Feasibility Review
# Risk Assessment (table: Risk, Likelihood, Impact, Mitigation)
# Recommended Solution (Primary Recommendation, Alternative Options, Affected Areas)
# Implementation Plan (step-by-step, required code changes, documentation changes, test updates)
# Testing Plan (Unit, Integration, End-to-End, Regression, Manual Validation)
# Open Questions / Unknowns

The final analysis must be actionable by an engineer without requiring an immediate follow-up meeting or clarification. Analyze not only the target issue but also all accessible related issues, dependency relationships, and relevant pull requests that could materially affect implementation, testing, prioritization, rollout sequencing, or architectural decisions.
```

#### Expected Output

- Structured analysis report covering all 7 workflow stages
- Risk table with likelihood/impact/mitigation
- Step-by-step implementation plan
- Testing strategy including edge cases
- Open questions list

#### Validation Checklist

After receiving AI output, verify:
- [ ] Issue quality checklist is addressed
- [ ] All related issues and PRs are accounted for
- [ ] Recommendations reference `AGENTS.md` constraints (Forbidden Changes, Source of Truth Matrix, etc.)
- [ ] Risk table includes regression risk for `dashboard.js` changes
- [ ] Implementation plan includes version bump assessment per `AGENTS.md §12`

#### Usage Notes

- Replace `{{ISSUE_NUMBER}}` with the GitHub issue number before sending
- Load `docs/AI-PLUGIN-KIT.md` into context for plugin-related issues
- Ensure `AGENTS.md §15 AI Agent Workflow` checklist is completed before implementation begins

#### Related Prompts

- Platform Changes - Investigate dashboard.js Function Before Modification
- Plugin Creation - Create Plugin from Example Plugin Baseline
- Debugging - Defect Remediation

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

## Active Prompts — Documentation

### Documentation - Documentation Alignment and Maintenance

| Field | Value |
|---|---|
| **Purpose** | Audit whether documentation matches implementation, identify missing or outdated documentation, verify em-dash compliance, and assess release documentation adequacy |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] All documentation files accessible (`docs/`, `plugins/documentation.js`, `CHANGELOG.md`, `README.md`)
- [ ] Source code accessible for cross-referencing

#### Prompt

```
Act as a Principal Technical Documentation Auditor combining expertise in technical writing, documentation engineering, software architecture, developer experience, and release-readiness governance.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for project rules, constraints, conventions, documentation standards, and ownership boundaries. Use implementation as the source of truth for current behavior. If implementation, documentation, tests, schemas, or release artifacts conflict, record the conflict rather than resolving it through assumptions. If AGENTS.md is missing or unreadable, record the limitation and continue using available evidence.

This is a read-only review. Do NOT modify source code, documentation, configuration, tests, schemas, release artifacts, dependencies, or generated assets. Do NOT rewrite documentation, generate corrections, generate patches, or create files.

Perform a focused documentation alignment review to determine whether:
- Documentation matches implementation
- Public behavior is documented
- Configuration and settings are documented
- APIs and integration points are documented
- Startup, lifecycle, persistence, and operational behavior are documented
- Release documentation is adequate
- Em dash characters (U+2014) exist in documentation or user-facing text

Treat missing, inaccurate, obsolete, contradictory, unverifiable, or non-compliant documentation as findings.

Review: AGENTS.md, Architecture documentation, SDK documentation, Storage documentation, Settings documentation, Themes documentation, Startup-flow documentation, Contributing documentation, Troubleshooting documentation, Plugin documentation, User documentation, Release notes.

EM DASH VERIFICATION: Search applicable documentation and user-facing content for U+2014. Record only confirmed occurrences. Ignore standard hyphens, en dashes, and minus signs.

Coverage status values: COMPLETE / PARTIAL / MISSING / NOT APPLICABLE / UNABLE TO VERIFY

Return only:
DOCUMENTATION VERDICT (DOCUMENTATION COMPLETE / DOCUMENTATION COMPLETE WITH GAPS / DOCUMENTATION REQUIRES UPDATE)
TOP FINDINGS (max 15: Finding ID, Severity, Affected Document, One-line Description, Evidence)
DOCUMENTATION COVERAGE GAPS (significant missing or partial coverage only)
EM DASH RESULTS (PASS / REMOVAL REQUIRED / INCOMPLETE; if occurrences exist include count and affected files)
AGENTS.MD OBSERVATIONS (material issues affecting documentation governance only)
INVESTIGATION NEEDED (items genuinely lacking evidence)
NEXT IMPLEMENTATION PRIORITIES (max 10)

Keep findings concise. For insufficient evidence state exactly: Unable to verify from available evidence.
```

#### Expected Output

- Documentation verdict
- Top findings with severity and affected document
- Coverage gaps for significant documentation areas
- Em dash compliance result with file-level detail if violations found
- Prioritized next actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] Verdict is evidence-based - not assumption-based
- [ ] Em dash result is explicit (PASS or REMOVAL REQUIRED)
- [ ] All major documentation areas are assessed
- [ ] No documentation was modified (audit only)
- [ ] Findings reference specific document + section where possible

#### Usage Notes

- Run before any release to catch documentation drift
- Load `docs/PROMPT-CATALOG.md` §28 ASCII Punctuation Standard alongside `AGENTS.md` for em-dash context
- Em dash violations in user-facing strings are a `AGENTS.md §28` compliance violation - treat as release risk

#### Related Prompts

- Update AGENTS.md for New Plugin
- Generate CHANGELOG.md Entry
- Release Readiness

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

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

### Debugging - Defect Remediation

| Field | Value |
|---|---|
| **Purpose** | Validate a defect report, identify the deepest supported root cause, assess severity, and define a behavior-preserving remediation objective |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context
- [ ] All available defect reports, QA findings, test results, and logs loaded
- [ ] Affected source files loaded

#### Prompt

```
Act as a Principal Defect Analysis and Root Cause Investigation Specialist combining Principal Software Engineer, Root Cause Investigator, and Principal QA Engineer expertise.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for project requirements, expected behavior, architecture, constraints, conventions, testing standards, and terminology. If AGENTS.md conflicts with this prompt, follow AGENTS.md and document the conflict.

Analyze the current workspace including all available QA findings, defect reports, test results, logs, source code, configuration, and supporting evidence.

This is a read-only defect validation and root-cause analysis. Do NOT modify source code, configuration, tests, fixtures, dependencies, documentation, or generated assets. Do NOT implement fixes, generate patches, create files, or run destructive commands.

For each reported defect:
1. Validate the report.
2. Identify the deepest supported root cause.
3. Assess severity and confidence.
4. Identify impact and regression exposure.
5. Define a behavior-preserving remediation objective.
6. Define validation requirements.

Assign validation status: CONFIRMED / PARTIALLY CONFIRMED / UNABLE TO VERIFY / REJECTED

For every CONFIRMED or PARTIALLY CONFIRMED defect identify:
- Observed failure and expected behavior
- Trigger, symptom, contributing factors, root cause
- Remediation Objective
- Minimum Safe Scope
- Likely Affected Components
- Constraints from AGENTS.md
- Required Behavior Preservation
- Acceptance Criteria

Return only:
DEFECT VERDICT (READY FOR IMPLEMENTATION / READY FOR IMPLEMENTATION WITH RISKS / ADDITIONAL INVESTIGATION REQUIRED)
VALIDATED DEFECTS (max 5 lines per defect: ID, Status, Severity, Root Cause, Remediation Objective, Evidence)
REJECTED OR UNVERIFIED (ID, Status, one-line reason)
INVESTIGATION NEEDED
NEXT IMPLEMENTATION PRIORITIES (max 10 items)

Keep all findings concise. For insufficient evidence state exactly: Unable to verify from available evidence.
```

#### Expected Output

- Defect verdict with implementation readiness classification
- Per-defect: validation status, severity, root cause, remediation objective, and evidence
- Rejected/unverified items with reasons
- Prioritized next implementation actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] Each defect has an assigned validation status
- [ ] Root cause is supported by specific code evidence (file/function references)
- [ ] Remediation objective is scoped to root cause - not symptoms
- [ ] No fixes were implemented (analysis only)
- [ ] AGENTS.md constraints are referenced in the remediation scope

#### Usage Notes

- Use this prompt before implementing any bug fix to ensure root cause is correctly identified
- Load prior audit outputs (Architecture Audit, QA Gate) into context for richer cross-referencing
- Follow up with the Regression Verification prompt after fixes are implemented

#### Related Prompts

- Regression Verification
- Release QA Gate

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

### Debugging - Regression Verification

| Field | Value |
|---|---|
| **Purpose** | Perform post-remediation regression verification - confirm defects are fixed, root causes addressed, and no new regressions introduced |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context
- [ ] Previous defect, remediation, and QA findings loaded as context
- [ ] Changed source files loaded

#### Prompt

```
Act as a Release Regression Verification Authority combining Principal QA Engineer, Regression Testing Lead, Production Validation Engineer, and Senior Software Engineer expertise.

Read and understand AGENTS.md before beginning. Review previous defect, remediation, and QA findings when available - treat them as claims, not proof.

This is a read-only verification. Do NOT modify source code, configuration, tests, dependencies, documentation, or project state. Do NOT implement fixes, create patches, refactor code, or create files.

Perform focused post-remediation verification. Determine whether:
1. Defects are actually fixed.
2. Root causes were addressed.
3. Behavior remains stable.
4. Regressions were introduced.
5. Release risk changed.

For every defect assign exactly one result:
FULLY FIXED / PARTIALLY FIXED / NOT FIXED / REGRESSION INTRODUCED / NOT TESTABLE

Evaluate regression risk in affected areas: Dashboard, Plugin Framework, Plugin Manager, Navigation, Startup, Settings, Storage, Background Worker, Themes, Popup Mode, Side Panel Mode.

Classify evidence as: Runtime Verified / Automated Test / Reproduced Failure / Static Code Evidence / Historical Comparison / Report Claim Only / Unable to Verify

Return only:
REGRESSION VERDICT (REMEDIATION VERIFIED / REMEDIATION VERIFIED WITH RISKS / REMEDIATION NOT VERIFIED)
DEFECT RESULTS (max 5 lines per defect: ID, Result, Root Cause Status, Evidence, Regression Risk)
NEW REGRESSIONS (ID, Severity, Description, Evidence)
REGRESSION RISKS (evidence-supported only)
NOT TESTABLE ITEMS
NEXT IMPLEMENTATION PRIORITIES (max 10 items)

Keep findings concise. For insufficient evidence state exactly: Unable to verify from available evidence.
```

#### Expected Output

- Regression verdict with confidence classification
- Per-defect fix validation result with evidence classification
- Any newly introduced regressions
- Prioritized next implementation actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] Every remediated defect has an assigned result status
- [ ] Evidence classification is assigned to each finding
- [ ] Any new regressions are identified with supporting evidence
- [ ] No fixes were implemented (verification only)
- [ ] NOT TESTABLE items have a documented reason

#### Usage Notes

- Run this prompt after implementing fixes from the Defect Remediation prompt
- Load prior audit outputs into context for cross-referencing
- If verdict is REMEDIATION NOT VERIFIED, return to Defect Remediation before proceeding to release

#### Related Prompts

- Defect Remediation
- Release QA Gate
- Release Readiness

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

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

## Active Prompts — Architecture

### Architecture - Architecture Audit

| Field | Value |
|---|---|
| **Purpose** | Perform an evidence-based architecture review of the ReplyCators codebase covering ownership, modularity, technical debt, dependencies, and scalability |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] Full codebase accessible in the workspace

#### Prompt

```
Act as a Principal Software Architect specializing in architecture audits, modular systems, ownership models, dependency management, technical debt reduction, safe refactoring, and long-term product evolution.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as the authoritative source for project requirements, architecture, ownership, constraints, conventions, and terminology. If AGENTS.md conflicts with this prompt, follow AGENTS.md and document the conflict. If AGENTS.md is missing or unreadable, record this as a review limitation and continue using available evidence.

Analyze the ReplyCators codebase in the current workspace. Assume existing functionality works as intended. Do not review feature correctness or business logic unless it creates an architectural, ownership, dependency, scalability, maintainability, or technical-debt concern.

This is a read-only architecture audit. Do NOT modify source code, tests, configuration, dependencies, generated assets, project documentation, or create files. Do NOT implement fixes, refactor code, or generate patches.

Perform an evidence-based architecture review focused on: ownership boundaries, separation of concerns, system modularity, dependency direction, encapsulation, technical debt, scalability, refactoring readiness, maintainability, cognitive load, and development friction.

Review areas: Dashboard, Plugin Framework, Plugin Manager, Startup Flow, Storage, Messaging, Settings, Themes, Popup Mode, Side Panel Mode, Background Worker.

Assess architecture validation items using PASS / PARTIAL / FAIL / UNABLE TO VERIFY with concise evidence only.

Evaluate technical debt: duplicate code, dead code, unused code, circular dependencies, hidden dependencies, ownership violations, responsibility overlap, tight coupling, leaky abstractions, architectural drift, encapsulation failures, over-engineering, redundant layers, fragile lifecycle patterns, maintainability risks, scalability risks. Report only evidence-supported findings.

Return only:
ARCHITECTURE VERDICT (ARCHITECTURE HEALTHY / ARCHITECTURE HEALTHY WITH RISKS / ARCHITECTURE REQUIRES ATTENTION)
ARCHITECTURE VALIDATION (Validation Item, Status, Evidence)
TOP FINDINGS (max 15: Finding ID, Severity, Affected Components, One-line Description, Evidence)
SIMPLIFICATION OPPORTUNITIES (max 5)
INVESTIGATION NEEDED (only items that genuinely lack evidence)
NEXT IMPLEMENTATION PRIORITIES (max 10)

Keep findings concise. For insufficient evidence state exactly: Unable to verify from available code.
```

#### Expected Output

- Architecture verdict
- Per-area validation results with evidence
- Top findings with severity and affected components
- Simplification opportunities
- Prioritized implementation actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] Verdict is supported by specific evidence citations
- [ ] All 11 review areas are addressed
- [ ] Architecture validation items use only allowed status values
- [ ] No code was modified (analysis only)
- [ ] Findings do not exceed 15

#### Usage Notes

- Run at the start of a release cycle to identify systemic issues before feature work
- Load `docs/ARCHITECTURE.md` alongside `AGENTS.md` for richer context
- Follow up with the Security & Chrome Compliance Audit or Performance & Diagnostics Audit as needed

#### Related Prompts

- Security & Chrome Compliance Audit
- Performance & Diagnostics Audit
- Release Candidate Stabilization

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

### Architecture - Security and Chrome Compliance Audit

| Field | Value |
|---|---|
| **Purpose** | Determine whether security, privacy, Manifest V3, permissions, or Chrome Web Store concerns make the current release candidate unsuitable for release |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] `manifest.json` accessible
- [ ] Full codebase accessible in the workspace

#### Prompt

```
Act as an independent Security and Compliance Review Panel combining the expertise of a Principal Security Engineer, Manifest V3 Specialist, Chrome Extension Security Auditor, and Chrome Web Store Compliance Reviewer.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for project requirements, architecture, supported behavior, constraints, trust boundaries, data-handling expectations, and release standards. If project guidance conflicts with platform or store requirements, report the conflict. If AGENTS.md is missing or unreadable, record the limitation and continue using available evidence.

This is a read-only assessment. Do NOT modify source code, manifests, configuration, dependencies, tests, documentation, build artifacts, or project state. Do NOT implement fixes, change permissions, generate patches, or create files.

Determine whether security, privacy, Manifest V3, packaging, permissions, architecture, or Chrome Web Store concerns make the current Release Candidate unsuitable for release. Apply a skeptical but evidence-based mindset. Attempt to invalidate security claims, challenge trust/permission/privacy assumptions, validate evidence before concluding risk. Do not invent vulnerabilities or exaggerate theoretical concerns.

Review where applicable: manifest.json, permissions, host permissions, content scripts, background service worker, dashboard, popup, side panel, internal/external messaging, storage, logging, network requests, authentication, tokens, external services, Tabs API, Scripting API, web-accessible resources, CSP, third-party dependencies, build output.

For each permission classify: REQUIRED / OVERBROAD / UNUSED / UNJUSTIFIED / OPTIONAL CANDIDATE / NOT VERIFIABLE

Return only:
SECURITY VERDICT (PASS / PASS WITH RISKS / FAIL)
CRITICAL FINDINGS (Critical issues only)
HIGH FINDINGS (High issues only)
PERMISSION CONCERNS (OVERBROAD, UNUSED, UNJUSTIFIED, OPTIONAL CANDIDATE only)
PRIVACY CONCERNS (evidence-supported only)
MV3 / STORE RISKS (evidence-supported only)
EVIDENCE GAPS (only gaps affecting release confidence)
NEXT IMPLEMENTATION PRIORITIES (max 10)

Keep findings concise. For insufficient evidence state exactly: Not Verifiable from available evidence.
```

#### Expected Output

- Security verdict (PASS / PASS WITH RISKS / FAIL)
- Critical and high findings with evidence
- Permission classification for significant permissions
- Privacy and MV3/store risk assessment
- Evidence gaps affecting release confidence

#### Validation Checklist

After receiving AI output, verify:
- [ ] Verdict is evidence-based, not assumption-based
- [ ] All permissions are classified
- [ ] Critical findings have specific evidence citations
- [ ] No code was modified (analysis only)
- [ ] UNVERIFIED RISK is used for unproven concerns

#### Usage Notes

- Run before every release candidate submission
- Load `SECURITY.md` alongside `AGENTS.md` for context
- A FAIL verdict is a hard release blocker - do not bypass

#### Related Prompts

- Architecture Audit
- Release QA Gate
- Release Readiness

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

### Architecture - Performance and Diagnostics Audit

| Field | Value |
|---|---|
| **Purpose** | Identify conditions that may negatively affect performance, reliability, diagnostics, and production readiness before a release |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] Full codebase accessible in the workspace

#### Prompt

```
Act as a Principal Software Performance, Reliability, Diagnostics, and Production Readiness Engineer conducting a pre-production technical assessment.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for project requirements, architecture, constraints, conventions, expected behavior, operational standards, and terminology. If AGENTS.md conflicts with this prompt, follow AGENTS.md and document the conflict. If AGENTS.md is missing or unreadable, record the limitation and continue using available evidence.

This is a read-only assessment. Do NOT modify source code, configuration, tests, dependencies, documentation, lockfiles, generated assets, or project state. Do NOT implement optimizations, add instrumentation, add telemetry, add retries, add tests, refactor code, generate patches, or create files.

Do not report measurements not actually observed, runtime behavior not actually observed, or test results not actually observed. Clearly distinguish: Measured findings / Reproduced findings / Static indicators / Unverified risks.

Identify conditions that may negatively affect: performance, responsiveness, stability, reliability, scalability, resource efficiency, failure isolation, recovery, observability, diagnosability, operational readiness, and production readiness.

Review areas: Application Startup, Dashboard, Plugin Loading, Plugin Lifecycle, Plugin Rendering, Storage Access, Search, Settings, Marketplace. Also assess: shared services, state management, caching, background processing, event systems, API interactions, concurrency controls, resource ownership.

Performance evaluation: excessive rendering/refreshes/subscriptions/state propagation/storage access, expensive startup operations, blocking execution paths, CPU/memory risks, event-listener/timer/resource leaks, race conditions.

Diagnostics evaluation: error handling, exception boundaries, logging quality, startup/plugin/storage diagnostics, failure isolation, recovery behavior, timeout/cancellation/retry handling.

Return only:
PERFORMANCE VERDICT (HEALTHY / HEALTHY WITH RISKS / REQUIRES OPTIMIZATION)
TOP FINDINGS (max 15: ID, Severity, Component, Description, Evidence)
PERFORMANCE RISKS (evidence-supported only)
DIAGNOSTICS GAPS (issues affecting troubleshooting or operations only)
PRODUCTION READINESS CONCERNS (release-relevant only)
INVESTIGATION NEEDED (items genuinely lacking evidence)
NEXT IMPLEMENTATION PRIORITIES (max 10)

Keep findings concise. For insufficient evidence state exactly: Unable to verify from available evidence.
```

#### Expected Output

- Performance verdict
- Top findings with severity, component, and evidence
- Performance risks and diagnostics gaps
- Production readiness concerns
- Prioritized implementation actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] Verdict is supported by specific evidence
- [ ] All reviewed areas are addressed
- [ ] Evidence type is classified for each finding (Measured / Reproduced / Static Indicator / Unverified Risk)
- [ ] No code was modified (analysis only)
- [ ] Performance budget items from `AGENTS.md §16` are cross-referenced

#### Usage Notes

- Run alongside the Architecture Audit for a comprehensive pre-release picture
- Focus particularly on the plugin lifecycle and startup sequence per `AGENTS.md §10`
- Note: without runtime profiling, most findings will be Static Indicator confidence

#### Related Prompts

- Architecture Audit
- Release Candidate Stabilization
- Release Readiness

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

## Active Prompts — Release

### Release - Release Candidate Stabilization

| Field | Value |
|---|---|
| **Purpose** | Identify evidence-supported stability issues affecting reliability, persistence, startup behavior, plugin behavior, and lifecycle correctness in a release candidate |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] Full codebase accessible in the workspace
- [ ] Any prior audit outputs (Architecture, Security, Performance) available as context

#### Prompt

```
Act as a Release Candidate Stabilization Lead combining Principal Software Engineer, Principal Chrome Extension Engineer, Production Stability Engineer, and Reliability Engineer expertise.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for project requirements, expected behavior, architecture, constraints, conventions, ownership, and release standards. If AGENTS.md conflicts with this prompt, follow AGENTS.md and document the conflict. If AGENTS.md is missing or unreadable, record the limitation and continue using available evidence.

This is a read-only stabilization assessment. Do NOT modify source code, configuration, tests, dependencies, documentation, generated assets, or project state. Do NOT implement fixes, refactor code, generate patches, or create files.

Focus only on release-candidate stabilization. Identify evidence-supported issues affecting: reliability, stability, persistence, startup behavior, state restoration, plugin behavior, cross-mode consistency, lifecycle correctness, and near-term release risk.

Prioritize: confirmed defects, incomplete implementations, runtime failures, persistence failures, lifecycle failures, restoration failures, invalid-state handling.

Do NOT focus on: feature redesign, architecture redesign, general cleanup, cosmetic improvements, broad optimization, documentation review, security review, full repository audit.

Review: dashboard.js, Plugin Manager, Plugin Framework, Settings, Storage, Startup Flow, Background Worker, Themes, Popup Mode, Side Panel Mode, registered plugins.

Pay particular attention to Chrome Extension lifecycle boundaries: background service-worker lifecycle, context invalidation, extension reload, browser restart, state restoration, asynchronous messaging, cross-context synchronization.

For impacted plugins determine: PASS / PASS WITH RISK / FAIL / NOT TESTABLE / NOT APPLICABLE

Return only:
STABILIZATION VERDICT (STABLE / STABLE WITH RISKS / ADDITIONAL WORK REQUIRED)
TOP STABILITY FINDINGS (max 15: ID, Severity, Component, Description, Evidence)
PLUGIN RISKS (affected plugins only)
STARTUP AND RESTORATION RISKS (evidence-supported only)
PERSISTENCE RISKS (evidence-supported only)
NOT TESTABLE AREAS
NEXT IMPLEMENTATION PRIORITIES (max 10)

Keep findings concise. For insufficient evidence state exactly: Unable to verify from available evidence.
```

#### Expected Output

- Stabilization verdict
- Top stability findings with severity and evidence
- Plugin-level risk assessment
- Startup, restoration, and persistence risk summary
- Prioritized next actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] Verdict is evidence-based
- [ ] Plugin statuses use only the allowed values
- [ ] Chrome Extension lifecycle boundaries are explicitly assessed
- [ ] No code was modified (analysis only)
- [ ] Findings are scoped to stabilization - not feature or architecture work

#### Usage Notes

- Run this prompt after Architecture, Security, and Performance audits
- Load previous audit outputs as context for cross-referencing
- A verdict of ADDITIONAL WORK REQUIRED blocks progression to the Release QA Gate

#### Related Prompts

- Architecture Audit
- Release QA Gate
- Release Readiness

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

### Release - Release QA Gate

| Field | Value |
|---|---|
| **Purpose** | Perform independent release gate validation to determine whether a release candidate is releasable - identifies blockers, major defects, regressions, and critical validation gaps |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] Prior audit outputs (Architecture, Security, Performance, Stabilization) available as context
- [ ] Full codebase accessible in the workspace

#### Prompt

```
Act as an independent Release Gate Authority combining the expertise of a Principal QA Engineer, Release Validation Lead, and Production Readiness Auditor.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for requirements, expected behavior, supported environments, architecture constraints, quality standards, and release criteria. If AGENTS.md conflicts with this prompt, follow AGENTS.md and document the conflict. If AGENTS.md is missing or unreadable, record this as a release-gate limitation and continue using available evidence.

Assume ReplyCators is not release-ready until sufficient evidence demonstrates otherwise. Apply a skeptical but evidence-based approach. Challenge release-readiness claims. Treat missing evidence as risk. Do not issue PASS unless release-critical areas are sufficiently supported.

This is a read-only release-gate review. Do NOT modify source code, configuration, tests, dependencies, documentation, generated assets, or project state. Do NOT implement fixes, generate patches, or create files.

Review evidence for: Dashboard, Plugin Manager, Marketplace, Settings, Themes, Accessibility, Storage, Startup, Navigation, Popup Mode, Side Panel Mode, Background Worker, Extension lifecycle.

Area status values: PASS / PASS WITH RISK / FAIL / NOT TESTABLE / NOT APPLICABLE
Do not mark PASS without supporting evidence.

Plugin status values: WORKING / PARTIALLY WORKING / BROKEN / UNTESTED / NOT APPLICABLE

Verdict rules:
PASS - No Critical findings, No High release blockers, Sufficient release evidence exists.
PASS WITH RISKS - No release blockers, Remaining risks are bounded and non-critical.
FAIL - Critical issue exists, High release blocker exists, Core workflow unreliable, Production-readiness unsupported, or Evidence insufficient for a defensible release decision.

Return only:
QA GATE VERDICT (PASS / PASS WITH RISKS / FAIL)
AREA RESULTS (each area: Area, Status, Evidence - max 2 lines per area)
RELEASE BLOCKERS (Critical or High only)
HIGH RISKS (evidence-supported only)
VALIDATION GAPS (only gaps materially affecting release confidence)
PLUGIN CONCERNS (only plugins with issues or risk)
NEXT ACTIONS (max 10)

Keep findings concise. When validation cannot be completed state exactly: Unable to verify from available evidence.
```

#### Expected Output

- QA gate verdict (PASS / PASS WITH RISKS / FAIL)
- Per-area release-critical status with evidence
- Release blockers and high risks
- Plugin concerns
- Next actions for unresolved issues

#### Validation Checklist

After receiving AI output, verify:
- [ ] PASS verdict is supported by evidence - not assumptions
- [ ] Every release-critical area has an assigned status
- [ ] Release blockers reference specific evidence
- [ ] No code was modified (gate review only)
- [ ] FAIL verdict lists specific blockers - not vague concerns

#### Usage Notes

- This is a gate prompt - a FAIL verdict stops the release until blockers are resolved
- Load all prior audit outputs as context (Architecture, Security, Performance, Stabilization)
- After resolving blockers, re-run this prompt before proceeding to Release Readiness

#### Related Prompts

- Release Candidate Stabilization
- Defect Remediation
- Regression Verification
- Release Readiness

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

---

### Release - Release Readiness

| Field | Value |
|---|---|
| **Purpose** | Perform the final release governance decision - synthesize all prior audit evidence and determine whether the release should proceed |
| **Owner** | [ASSIGN] |
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | 2026-08 |
| **Effectiveness** | Not yet rated |

#### Prerequisites

- [ ] `AGENTS.md` loaded into AI context (authoritative source)
- [ ] All prior audit outputs available as context (Architecture, Security, Performance, Stabilization, QA Gate, Defect Remediation, Regression Verification, Documentation Alignment)
- [ ] `manifest.json` and release artifacts accessible

#### Prompt

```
Act as an independent Senior Release Governance Board combining the expertise of a Release Manager, Principal QA Engineer, Chrome Web Store Reviewer, and Production Readiness Auditor.

Read and understand AGENTS.md before beginning. Treat AGENTS.md as authoritative for project requirements, supported behavior, release criteria, constraints, conventions, and ownership. If AGENTS.md conflicts with this prompt, follow AGENTS.md and document the conflict. If AGENTS.md is missing or unreadable, record this as an evidence gap and assess its impact on the release decision.

This is the final governance stage. Do NOT re-run full audits. Do NOT modify source code, configuration, release artifacts, or documentation. Do NOT implement fixes, refactor code, generate patches, or create files.

Review available outputs from: Architecture Audit, Defect Analysis, Documentation Audit, Performance Assessment, Regression Verification, Release Candidate Stabilization, QA Gate Assessment, Security Assessment.

Also review when available: manifest, release artifact, package contents, version metadata, store assets, deployment instructions, migration guidance, release notes.

Determine:
1. Is sufficient evidence available?
2. Are required review stages completed?
3. Are critical issues unresolved?
4. Are release blockers present?
5. Are accepted risks properly documented?
6. Is Chrome-extension packaging readiness supported?
7. Is production release defensible?

Reject approval based on: assumptions, "looks good", report existence alone, previous approvals without evidence.

Evidence source classification: Available or Missing / Current or Potentially Stale / Relevant or Superseded / Evidence Quality / Confidence (High/Medium/Low)

Provide readiness scoring (0-100 each, one decimal place):
- Reliability / Security / Store Readiness / User Experience / Accessibility / Performance / Maintainability / Documentation
- OVERALL READINESS SCORE

Release cannot be approved when any of the following exist: Unresolved Critical issue, Unresolved High release blocker, Material security/privacy/compliance/reliability concern, Failed startup/persistence/primary workflow validation, Missing regression verification, Missing required validation stage, Material evidence gap.

Release decision rules:
RELEASE READY - No blockers remain, Sufficient validation exists, Evidence supports release.
RELEASE READY WITH RISKS - No blockers remain, Remaining risks are bounded and understood.
NOT RELEASE READY - Any blocker remains, Evidence is insufficient, Required validation is missing.

Return only:
FINAL RELEASE DECISION (RELEASE READY / RELEASE READY WITH RISKS / NOT RELEASE READY)
OVERALL READINESS SCORE
KEY RELEASE BLOCKERS (blocking findings only)
SIGNIFICANT RISKS (evidence-supported only)
EVIDENCE GAPS (only gaps affecting release confidence)
REQUIRED ACTIONS BEFORE RELEASE (max 10)
CONFLICTING EVIDENCE (material conflicts only)
CONFIDENCE (HIGH / MEDIUM / LOW)

Keep findings concise. For insufficient evidence state exactly: Unable to verify from available evidence.
```

#### Expected Output

- Final release decision with confidence level
- Readiness scores across 8 dimensions plus overall
- Key blockers and significant risks
- Required pre-release actions

#### Validation Checklist

After receiving AI output, verify:
- [ ] RELEASE READY verdict is supported by all required prior stage outputs
- [ ] Readiness scores are evidence-based - not optimistic assumptions
- [ ] All 8 scoring dimensions are present
- [ ] No code was modified (governance only)
- [ ] Conflicting evidence between audits is explicitly surfaced

#### Usage Notes

- This is the final prompt in the release pipeline - run last, after all other audits
- A RELEASE READY decision requires all prior stage gate prompts to have passed or have documented accepted risks
- The OVERALL READINESS SCORE is a reference metric - the FINAL RELEASE DECISION governs

#### Related Prompts

- Release QA Gate
- Regression Verification
- Security and Chrome Compliance Audit

#### Feedback Log

| Date | Contributor | Result | Notes |
|---|---|---|---|
| - | - | - | Seeded, not yet tested |

#### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08 | Initial version - imported from governance library |

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
