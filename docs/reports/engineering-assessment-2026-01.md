# ReplyCators Engineering Organization Assessment
**Date:** 2026-01  
**Repository:** github.com/jnytko/Replycators  
**Version assessed:** 1.46.4  
**Assessor role:** Senior Engineering Operating Model Consultant  

---

## Quick Navigation

1. [Executive Summary](#1-executive-summary)
2. [Current-State Assessment](#2-current-state-assessment)
3. [Repository Analysis](#3-repository-analysis)
4. [Architecture Analysis](#4-architecture-analysis)
5. [Governance Analysis](#5-governance-analysis)
6. [AI-Assisted Development Assessment](#6-ai-assisted-development-assessment)
7. [RACI Matrix](#7-raci-matrix)
8. [ADR Template](#8-adr-template)
9. [Contributor Onboarding Guide](#9-contributor-onboarding-guide)
10. [Prompt Governance Catalog](#10-prompt-governance-catalog)
11. [Weekly Release Review Checklist](#11-weekly-release-review-checklist)
12. [Architecture Overview](#12-architecture-overview)
13. [Release Lifecycle](#13-release-lifecycle)
14. [Knowledge Map](#14-knowledge-map)
15. [Backlog and Issue Governance](#15-backlog-and-issue-governance)
16. [Repository Standards](#16-repository-standards)
17. [Engineering Lifecycle Standard](#17-engineering-lifecycle-standard)
18. [Scaling Readiness Assessment](#18-scaling-readiness-assessment)
19. [Prioritized Roadmap](#19-prioritized-roadmap)

---

## 1. EXECUTIVE SUMMARY

### Overall Maturity Score: 7.5/10

ReplyCators demonstrates **exceptional governance maturity for a 3-person, AI-assisted development team**. The comprehensive AGENTS.md and structured documentation system reveal deliberate investment in sustainability and knowledge transfer. However, scalability beyond the current team remains untested, and several governance mechanisms exist only in documentation without enforcement tooling.

### Key Strengths

1. World-class AI agent briefing documentation (AGENTS.md — ~4,000 lines)
2. Architectural decision capture — 8 documented ADRs with permanent rationale
3. Comprehensive storage schema documentation — 42 authoritative state entries
4. Plugin isolation architecture — 10 plugins with clear ownership boundaries
5. Manual QA discipline enforced via PR template (37-item Release Gate)
6. Dual deployment model explicitly governed (root authoritative, dist/ mirrored)

### Key Weaknesses

1. No human-readable contributor onboarding path — AGENTS.md is written for AI agents
2. Implicit RACI model — ownership practiced but not declared
3. Prompt governance is ad-hoc — no catalog, versioning, or review process
4. Release process aspirational — weekly cadence not formalized as procedure
5. Knowledge concentration — single CODEOWNER; bus factor = 1
6. Zero automated testing (acknowledged TD-003, deferred)

### Top Risks

| Risk | Severity | Mitigation Status |
|------|----------|-------------------|
| Knowledge concentration (bus factor = 1) | Critical | None |
| Prompt knowledge locked in contributor heads | High | None |
| Weekly release cadence lacks formal procedure | Medium | None |
| Scaling untested beyond 3 contributors | Medium | None |
| Manual QA bottleneck | Medium | Acknowledged, deferred |

### Strategic Opportunities

1. Formalize prompt lifecycle management — treat prompts as first-class artifacts
2. Document tribal knowledge explicitly — create human-readable onboarding
3. Implement lightweight release automation — scripted gates
4. Establish RACI clarity — enable distributed decision-making
5. Add ADR for prompt governance (ADR-009 proposed)

### Recommended Immediate Priorities (P0/P1)

1. Update .github/CODEOWNERS with real GitHub usernames
2. Create docs/CONTRIBUTOR-ONBOARDING.md
3. Create docs/PROMPT-CATALOG.md and seed with 5 initial prompts
4. Assign RACI matrix owners explicitly
5. Add npm audit to CI pipeline

---

## 2. CURRENT-STATE ASSESSMENT

### Technology Stack

| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| Runtime | Browser Extension (Manifest V3) | v3 | Active |
| Browser | Microsoft Edge (Chromium) | 120+ | Production |
| Active Runtime | Hand-authored JavaScript (ES6+) | - | Root flat-deployment |
| Future Runtime | TypeScript | 5.4.5 | Inactive scaffolding (RC-015 Phase 2) |
| Build | Webpack | 5.91.0 | Development only |
| Build | Node.js | 18+ | External Runtime directory |
| Storage | chrome.storage.local API | - | Primary persistence |
| Auxiliary | Node.js HTTP server (Bob Helper) | - | Manual start, loopback only |

### Engineering Processes

| Process | Exists? | Documented? | Enforced? |
|---------|---------|-------------|-----------|
| Branching strategy | Yes | Yes | Partial |
| Commit message format | Yes | Yes | No (manual convention) |
| Version bumping | Yes | Yes | Partial (manual sync, 10 locations) |
| PR review | Yes | Yes | Yes (CODEOWNERS + checklist) |
| CI validation | Yes | Yes | Yes (typecheck, build, sync) |
| Release tagging | Partial | No | No |
| Defect triage | Yes | Partial | No |
| Architecture review | Yes | Yes | Partial (ADR process underused) |
| Prompt review | No | No | No |

### AGENTS.md Content Split

- Technical guidance: ~70% (architecture, storage schema, plugin lifecycle, design system)
- Process guidance: ~30% (versioning, governance, release checklist, AI workflow)

**Critical finding:** AGENTS.md is written primarily for AI agents, not human contributors. A human-readable onboarding guide is missing.

### Documentation Quality

| Document Type | Count | Quality |
|---------------|-------|---------|
| Architecture docs | 5 | Excellent |
| Plugin-specific docs | 10 | Good |
| Process docs | 4 | Good (missing onboarding, release procedure) |
| ADRs | 8 | Excellent (underused recently) |
| Governance docs | 4 | Excellent (prompt governance absent) |

---

## 3. REPOSITORY ANALYSIS

### Plugin Inventory

| Plugin | Version | Health |
|--------|---------|--------|
| Salesforce Case Extractor | 4.12.3 | Healthy |
| Cloudability OrgID | 4.0.4 | Healthy |
| Edge Bookmark Finder | 1.0.2 | Healthy |
| Apptio Planning Upgrade Calculator | 1.0.3 | Healthy |
| Workspace Starter | 2.0.2 | Healthy |
| Tab Search | 1.0.1 | Healthy |
| Snake | 1.0.1 | Healthy |
| Apptio Documentation Finder | 1.0.2 | Healthy |
| Environment Dashboards Launcher | 1.3.0 | Healthy |
| Example Plugin | 1.0.2 | Reference only |

### Codebase Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Total plugins | 10 | Healthy modularity |
| dashboard.js LOC | ~1,794 | Excellent (reduced from 5,411 via TD-001) |
| Documentation files | 23 + 10 plugin docs | Excellent coverage |
| Storage keys | 42 | Well-governed |
| ADRs | 8 | Good, could be more frequent |
| Open technical debt | 1 (TD-003 deferred) | Excellent — 18 resolved |

### Release Cadence (Observed)

47 releases from 1.0.0 to 1.46.4 over approximately 3 months = ~3 releases/week. This exceeds the stated weekly goal, indicating the team ships frequently but without a formal weekly gate.

### Repository Health Checks

- CODEOWNERS exists but uses placeholder @owner (not real GitHub usernames)
- CI pipeline runs 3 jobs (typecheck, build, sync-check)
- npm audit NOT in CI pipeline (security gap)
- ESLint deferred (lint script returns 0 with advisory message)
- Branch protection rules not confirmed active (recommended: enable in GitHub Settings)

---

## 4. ARCHITECTURE ANALYSIS

### Layer Architecture

```
PLUGINS LAYER:   salesforce-case-extractor | cloudability-orgid | workspace-starter
                 bookmark-finder | apptio-upgrade-calculator | tab-search
                 snake | apptio-docs-finder | env-dashboards | example-plugin
                         uses services from
ORCHESTRATOR:    dashboard.js (startup, navigation, settings, PLUGINS[], ordering)
                         depends on
BACKGROUND:      background.js (tab events, OrgID enrichment, Bob bridge)
                         all use
STORAGE:         chrome.storage.local (42 keys, namespaced)
```

### Architectural Patterns

| Pattern | Implementation | Assessment |
|---------|----------------|------------|
| Plugin Architecture | Self-registering IIFEs on window.ReplyCatorsPlugins | Excellent |
| Orchestrator | dashboard.js coordinates, delegates to plugins | Good |
| Single Source of Truth | 42 storage keys mapped to authoritative owners | Excellent |
| Event Bus | Chrome runtime messaging | Standard |
| Namespace Segregation | rc:session:*, rc:plugin:<id>:* | Good |
| Dual Deployment | Root authoritative, dist/ mirror | Functional (manual sync burden) |
| Lazy Initialization | No I/O in init(); defer to onNavigate/render | Excellent |

### Architecture Invariants (from AGENTS.md)

1. Root files are the runtime
2. chrome.storage.local is the primary persistence layer
3. dashboard.js is the application orchestrator
4. Plugin IDs are permanent
5. Popup and Side Panel share the same implementation
6. Plugin order comes only from rc:session:dashboard-order
7. Platform logging and notifications are mandatory
8. Plugin functionality must remain modular and self-contained

### Architecture Health: 8/10

The plugin architecture (ADR-008) is well-executed. The modular refactor (TD-001) reduced dashboard.js from 5,411 to 1,794 lines. Each plugin is a self-contained IIFE with clear lifecycle hooks and no cross-plugin coupling.

Primary concern: dual deployment model (root + dist/) creates manual synchronization burden. The postbuild hook mitigates this for full builds, but direct root edits require manual npm run sync.

---

## 5. GOVERNANCE ANALYSIS

### Decision-Making Model (Current)

- Architecture decisions: ADR process (8 documented)
- High-risk changes: CODEOWNERS review (manifest.json, dashboard.js, AGENTS.md, SECURITY.md)
- Documentation: co-update rule (§23-A)
- No declared RACI
- No escalation path documented
- No product roadmap ownership

### Governance Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No RACI matrix | Unclear ownership, decision paralysis risk | P1 |
| No prompt governance | Knowledge loss, inconsistency | P0 |
| No release procedure | Uneven quality, week-to-week variation | P1 |
| No human onboarding | New contributor friction | P1 |
| CODEOWNERS placeholder @owner | Review cannot be enforced | P0 |
| No git release tagging procedure | Release traceability gap | P2 |
| ADR process underused (none since v1.17.0) | Decisions undocumented | P2 |

### Security Posture

| Control | Status |
|---------|--------|
| Data handling documented | Good (SECURITY.md) |
| No remote telemetry | Excellent |
| Least-privilege permissions | Good (audited v1.45.4) |
| Strict CSP | Good (script-src 'self'; object-src 'none') |
| Bob Helper loopback-only | Good (127.0.0.1:47123, CORS-restricted) |
| Threat model documented | Good |
| CODEOWNERS on manifest.json | Good |
| Vulnerability reporting process | Basic (GitHub Issues only) |
| npm audit in CI | Missing |
| Dependency vulnerability scanning | Missing |

---

## 6. AI-ASSISTED DEVELOPMENT ASSESSMENT

### AI Governance Score: 6/10

Strong documentation for AI agents; weak governance over AI artifacts (prompts).

### Strengths

1. AGENTS.md as AI briefing — 4,000-line document structured for LLM consumption
2. AI Plugin Kit — dedicated workflows A/B/C for plugin creation
3. Forbidden Changes table — prevents 23 common AI agent mistakes
4. Source of Truth Matrix — eliminates ambiguity (42 state entries)
5. ASCII Punctuation Standard (§28) — prevents AI em-dash insertion
6. AI Agent Workflow (§15) — pre-check and post-check lists

### Gaps

1. No prompt catalog — prompts are not tracked or versioned
2. No prompt review process — no governance over approved prompts
3. No prompt effectiveness tracking
4. No AI-generated code markers in git history
5. No prompt ownership model

### AI-Specific Risks

| Risk | Likelihood | Impact |
|------|------------|--------|
| Effective prompts lost over time | High | Medium |
| Inconsistent guidance across contributors | High | Medium |
| AI-generated technical debt accumulation | Medium | High |
| Prompt sprawl | High | Low |
| AI hallucinations accepted without verification | Low | High (mitigated by mandatory QA) |

---

## 7. RACI MATRIX

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

| Responsibility | Contributor A | Contributor B | Contributor C | Notes |
|---|:---:|:---:|:---:|---|
| **Product Direction** | | | | |
| Feature prioritization | A/R | C | C | A owns roadmap |
| Plugin acceptance | A | C | C | |
| User feedback triage | A/R | C | C | |
| **Architecture** | | | | |
| ADR creation | A | C | C | A is architect |
| Platform design changes | A | R/C | R/C | |
| Plugin architecture review | A | R | R | |
| Breaking change approval | A | C | C | |
| **Repository Administration** | | | | |
| CODEOWNERS enforcement | A/R | I | I | Update @owner placeholder NOW |
| Branch protection rules | A/R | I | I | |
| CI/CD pipeline changes | A | R | R | |
| **Release Management** | | | | |
| Version bump authority | A | R | R | |
| Release approval (Go/No-Go) | A | C | C | |
| CHANGELOG.md | R | R | R | Author writes entry |
| Git tag creation | A/R | I | I | |
| **Documentation** | | | | |
| AGENTS.md maintenance | A | C | C | |
| Plugin documentation | R | C | I | Plugin author writes |
| Architecture documentation | A | R | R | |
| Onboarding guide | A/R | C | C | Currently missing |
| **Prompt Governance** | | | | |
| Prompt catalog | [ASSIGN] | C | C | New role |
| Prompt review/approval | [ASSIGN] | C | C | |
| Prompt versioning | [ASSIGN] | R | R | |
| **Quality Assurance** | | | | |
| Manual QA execution | R | R | R | All contributors |
| QA matrix maintenance | A | C | C | |
| Defect triage | A | R | R | |
| **Security** | | | | |
| Security policy updates | A | C | C | |
| Vulnerability triage | A | R | R | |
| Permission audit | A | R | R | |
| **Backlog Management** | | | | |
| Issue triage | A | R | R | |
| Issue prioritization | A | C | C | |
| Issue assignment | A | R | R | |
| **Contributor Onboarding** | | | | |
| Onboarding guide maintenance | [ASSIGN] | C | C | Missing today |
| New contributor mentorship | A | R | R | |
| **Knowledge Management** | | | | |
| Documentation architecture | A | C | C | |
| Technical debt register | A | R | R | |
| ADR creation | A | R | R | |

---

## 8. ADR TEMPLATE

Store individual ADRs as `docs/adr/ADR-NNN-title.md`

```markdown
# ADR-NNN - [Title: Action-Oriented, < 60 characters]

## Status
[Accepted | Superseded by ADR-XXX | Deprecated | Proposed]
**Decided:** YYYY-MM-DD | **Authors:** [GitHub handles]

## Context
[Problem requiring a decision. 1-3 paragraphs.]

## Decision
[Clear, unambiguous statement of the decision. < 100 words.]

**Rationale:**
- [Reason 1]
- [Reason 2]

## Alternatives Considered

### Alternative A: [Name]
**Pros:** [advantages] | **Cons:** [disadvantages] | **Why rejected:** [1-2 sentences]

### Alternative B: [Name]
[Same structure]

## Consequences

**Positive:** [Benefits]
**Negative:** [Drawbacks]
**Neutral:** [Changes with no positive/negative value]

## Implementation

| Component | Change | Owner | Est. Effort |
|-----------|--------|-------|-------------|
| [file] | [change] | [who] | [hours] |

## Migration Path (if breaking)
1. [Step 1]
2. [Step 2]

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk] | H/M/L | H/M/L | [How to address] |

## Follow-up Actions
- [ ] Update AGENTS.md §[section]
- [ ] Update docs/ARCHITECTURE.md
- [ ] Communicate in CHANGELOG.md

## References
- [AGENTS.md §X]
- [Related ADR-YYY]
- [GitHub Issue #NNN]
```

### Example ADR: ADR-009 - Centralized Prompt Catalog

```markdown
# ADR-009 - Centralized Prompt Catalog for AI-Assisted Development

## Status
Proposed — 2026-01

## Context
ReplyCators is developed using AI-assisted workflows. Effective prompts are not tracked, versioned, or shared. This creates knowledge loss, inconsistency, and onboarding friction. Currently, AGENTS.md provides excellent context for AI agents but no catalog exists for human-authored prompts used during development.

## Decision
Establish docs/PROMPT-CATALOG.md to track, version, and review all AI prompts used during development. Prompts are engineering artifacts and receive the same governance as documentation.

**Rationale:**
- Prompts are engineering artifacts (like code or docs) and deserve governance
- Sharing effective prompts reduces onboarding time and improves consistency
- Versioning prompts enables learning which prompts produce quality results
- A catalog creates a continuous improvement feedback loop

## Alternatives Considered

### Status Quo (No Formal Catalog)
**Why rejected:** Does not address knowledge loss or inconsistency.

### Prompts as Code Comments
**Why rejected:** Poor discoverability; fragments prompts across 1,794+ line files.

### Separate Repository
**Why rejected:** Over-engineered for a 3-person single-project team.

## Consequences
**Positive:** Accelerated onboarding, consistency, knowledge distribution, learning
**Negative:** Maintenance burden; catalog must stay current
**Neutral:** Prompts become first-class artifacts

## Implementation

| Component | Change | Owner | Est. Effort |
|-----------|--------|-------|-------------|
| docs/PROMPT-CATALOG.md | Create with template + 5 initial prompts | A | 4 hours |
| AGENTS.md | Add §Prompt Governance with link | A | 1 hour |
| PR template | Add prompt update reminder | A | 30 min |
| CONTRIBUTING.md | Document when to add prompts | A | 1 hour |

## Follow-up Actions
- [ ] Create docs/PROMPT-CATALOG.md
- [ ] Seed with 5 initial prompts from AI-PLUGIN-KIT.md
- [ ] Update AGENTS.md
- [ ] Update PR template
- [ ] Schedule 4-week retrospective
```

---

## 9. CONTRIBUTOR ONBOARDING GUIDE

Create as: `docs/CONTRIBUTOR-ONBOARDING.md`

```markdown
# ReplyCators - Contributor Onboarding Guide

Welcome to ReplyCators. This guide walks you through your first week.

---

## Project Overview

ReplyCators is a plugin-based Microsoft Edge extension platform for support engineers.
The extension loads directly from the repository root (not src/ or dist/).
Most code is AI-assisted. Read AGENTS.md before using AI to help.

---

## Repository Structure — Decision Table

| What to change | Edit this file |
|---|---|
| Plugin logic or UI | plugins/<name>.js |
| All plugin views/HTML | dashboard.html |
| Platform behavior | dashboard.js |
| Background processing | background.js |
| Shared styling | styles/platform.css or styles/dashboard.css |

NEVER edit src/ (inactive TypeScript stubs) or dist/ (auto-generated mirror).

---

## Ways of Working

### Before any change
1. Read AGENTS.md §1-6 (Overview through Architecture Decisions)
2. Verify change is not in Forbidden Changes table (AGENTS.md §11)
3. Identify the correct file (table above)

### Making a change
1. Create branch: git checkout -b fix/plugin-name-description
2. Edit root file
3. Sync: npm run sync (or npm run build)
4. Reload at edge://extensions/
5. Test (QA Matrix, AGENTS.md §16)
6. Update docs (§23-A co-update rule)
7. Update version (§12 — 10 locations)
8. Update CHANGELOG.md

---

## GitHub Workflow

Commit format: type(scope): summary
Types: feat | fix | docs | style | refactor | chore
Scopes: platform | plugin/<name> | settings | ui | storage | docs

PR rules:
- Complete all 37 items in .github/PULL_REQUEST_TEMPLATE.md
- CODEOWNERS-protected files (manifest.json, dashboard.js, background.js, AGENTS.md) require owner review
- CI must pass: typecheck, webpack build, sync-check

---

## AI-Assisted Development Expectations

Before using AI:
1. Load AGENTS.md into AI context — it is the authoritative briefing
2. For plugin creation: also load docs/AI-PLUGIN-KIT.md
3. Check docs/PROMPT-CATALOG.md for proven prompts

AI must not:
- Edit src/ expecting live behavior
- Edit dist/ directly
- Create __-prefixed directories
- Use console.log() (use ReplyCatorsApp.addLog())
- Create custom toast UI (use ReplyCatorsApp.showToast())

Mark AI-generated sections in your PR description.

---

## Documentation Standards

A change is NOT done without documentation updates (AGENTS.md §23-A is mandatory).

| Change type | Must update |
|---|---|
| New plugin | AGENTS.md §8, ARCHITECTURE.md, CHANGELOG.md, create docs/plugins/<name>.md |
| Plugin behavior | AGENTS.md §8, plugin doc, CHANGELOG.md |
| New storage key | docs/STORAGE.md, AGENTS.md §9 |
| Settings change | docs/SETTINGS.md, CHANGELOG.md |

---

## Release Process

Version locations (all 10 must match before release):
1. manifest.json
2. package.json
3. AGENTS.md (Project Overview)
4. dashboard.html (<span id="rc-platform-version">)
5. dashboard.js (file header comment)
6. CHANGELOG.md (latest entry)
7. docs/PACKAGING.md (last updated line)
8. dist/manifest.json
9. dist/dashboard.html
10. dist/dashboard.js

---

## Definition of Done

- [ ] Code works in Popup and Side Panel modes
- [ ] No console errors on load or navigation
- [ ] Manual QA checklist (AGENTS.md §16) executed
- [ ] Version numbers updated in all 10 locations
- [ ] CHANGELOG.md entry added
- [ ] All affected docs/ files updated
- [ ] npm run sync:verify passes
- [ ] CI passes (typecheck, build, sync-check)

---

## Common Mistakes

1. Editing src/ — it has no effect on the running extension
2. Editing dist/ directly — overwritten by next sync
3. Forgetting npm run sync after root edits — CI sync-check will fail
4. Creating __-prefixed directories — Edge refuses to load extension
5. Using console.log() — use ReplyCatorsApp.addLog()
6. Updating only manifest.json version — all 10 locations must match
7. Skipping documentation co-update — change is incomplete without it
8. Creating a plugin from scratch without Example Plugin baseline

---

## First-Week Onboarding Checklist

### Day 1: Setup
- [ ] Clone repo and load in Edge at edge://extensions/
- [ ] Verify extension popup loads without errors
- [ ] Navigate through all plugins

### Day 2: Read Core Docs
- [ ] README.md
- [ ] AGENTS.md §1-6
- [ ] CONTRIBUTING.md
- [ ] plugins/example-plugin.js (reference implementation)

### Day 3: Build Tools
- [ ] Verify Node.js at [root]\Runtime\NodeJS
- [ ] npm run typecheck — confirm zero errors
- [ ] npm run build — confirm success
- [ ] npm run sync:verify — confirm root and dist/ in sync

### Day 4: First Issue
- [ ] Read all open GitHub Issues
- [ ] Pick a documentation-only or good-first-issue
- [ ] Create branch, make change, submit draft PR

### Day 5: Plugin Exploration
- [ ] Open plugins/example-plugin.js and dashboard.js side-by-side
- [ ] Find where ExamplePlugin registers in PLUGINS[]
- [ ] Read docs/STORAGE.md

### End of Week Knowledge Check
- Which files are the active runtime? (Root-level files, not src/ or dist/)
- How do you add a new plugin? (AGENTS.md §10 — 12 steps)
- Where is the authoritative source for app settings? (chrome.storage.local key rc:session:app-settings)
- What must be updated with every code change? (AGENTS.md, CHANGELOG.md, affected docs/)

---

## Getting Help
- GitHub Issues: Open with label "question"
- Code review: Ask specific questions in PR comments
- AGENTS.md: Search before asking — most questions answered there
```

---

## 10. PROMPT GOVERNANCE CATALOG

Create as: `docs/PROMPT-CATALOG.md`

### Structure

```markdown
# ReplyCators - AI Prompt Governance Catalog

Version: 1.0 | Owner: [Prompt Governance Lead] | Next Review: Quarterly

## Governance Process

Adding: Create entry → PR review → Active status
Updating: Increment version → PR
Retiring: Status = Deprecated → Archive after 60 days
Review cadence: Quarterly full test against current AGENTS.md

## Categories
- Plugin Creation
- Plugin Maintenance
- Platform Changes
- Documentation
- Code Review
- Debugging
- Architecture
- Release

## Prompt Entry Template

### [Category] - [Name]

| Field | Value |
|---|---|
| Purpose | [One sentence] |
| Owner | [GitHub handle] |
| Status | Draft / Active / Deprecated |
| Version | 1.0 |
| Last Updated | YYYY-MM-DD |

#### Prerequisites
- [ ] AGENTS.md loaded
- [ ] [Additional files]

#### Prompt
[Full prompt text — use {{PLACEHOLDER}} for parameters]

#### Expected Output
[Format, length, structure]

#### Validation
- [ ] [Check 1]
- [ ] [Check 2]

#### Feedback Log
| Date | Contributor | Result | Notes |
```

### Initial Prompts (seed from AI-PLUGIN-KIT.md)

1. **Plugin Creation - Create from Example Baseline**
   - Prerequisites: AGENTS.md, AI-PLUGIN-KIT.md, example-plugin.js
   - Creates new plugin following Workflow A

2. **Platform Changes - Investigate dashboard.js Function**
   - Prerequisites: AGENTS.md, relevant function code
   - Explains function, callers, state, risks

3. **Documentation - Update AGENTS.md for New Plugin**
   - Prerequisites: AGENTS.md, new plugin file
   - Updates §8, §9, §10, §12 with exact before/after text

4. **Debugging - Investigate Storage Key Conflict**
   - Prerequisites: AGENTS.md, plugin code
   - Identifies storage keys, lifecycle, and fix

5. **Code Review - Verify AI-Generated Plugin**
   - Prerequisites: AGENTS.md, generated plugin file
   - Checks against all governance rules before PR submission

### Prompt Governance Rules

1. All prompts require PR review before Active status
2. No sensitive data in prompts — use {{PLACEHOLDER}}
3. Quarterly full review against current AGENTS.md
4. Version prompts like code — increment on every change
5. Every prompt must have a named owner
6. Maximum 5 prompts per category before deduplication review
7. Deprecated prompts archived after 60 days
8. Effectiveness logged by every user

---

## 11. WEEKLY RELEASE REVIEW CHECKLIST

### Pre-Meeting Preparation

- [ ] npm run typecheck — zero errors required
- [ ] npm run sync:verify — root and dist/ in sync required
- [ ] Review closed GitHub Issues since last release
- [ ] Review open P1/P2 Issues

### 1. Feature Review (10 min)

- [ ] Review all MINOR changes since last release
- [ ] Verify each tested in Popup and Side Panel
- [ ] Verify new plugins follow UI standards (AGENTS.md §11)
- [ ] No unauthorized platform changes buried in plugin commits
- [ ] Feature documentation complete

### 2. Defect Review (10 min)

- [ ] All new bug Issues triaged with P1/P2/P3/P4 label
- [ ] All P1 defects resolved before release
- [ ] All P2 defects have owner and ETA

### 3. Documentation Review (5 min)

- [ ] AGENTS.md version matches CHANGELOG.md latest entry
- [ ] README.md plugin table reflects current versions
- [ ] All changed plugins have updated docs/plugins/ files
- [ ] CHANGELOG.md entry complete (type, summary, files, breaking, plugin versions)

### 4. Security Review (5 min)

- [ ] Review manifest.json permission changes
- [ ] No new remote network calls added
- [ ] Bob Helper remains loopback-only
- [ ] npm audit run — CRITICAL/HIGH addressed before release

### 5. AI-Generated Code Review (5 min)

- [ ] AI-generated sections identified from PR descriptions
- [ ] AI-generated code manually tested (not just reviewed)
- [ ] No AI hallucinations: invented APIs, non-existent methods
- [ ] No em-dashes or Unicode punctuation in user-facing strings (§28)
- [ ] Storage keys correct (Source of Truth Matrix)
- [ ] No Forbidden Changes introduced

### 6. Versioning Validation (5 min)

- [ ] PATCH/MINOR/MAJOR classification correct
- [ ] All 10 version locations consistent
- [ ] Plugin versions in PLUGINS[] match dashboard.html headers
- [ ] Plugin versions match AGENTS.md §8 Plugin Inventory

### 7. Release Approval

**Go criteria (all required):**
- [ ] Zero P1 open defects
- [ ] CI passing on main
- [ ] QA Matrix executed
- [ ] Version locations consistent
- [ ] CHANGELOG.md current
- [ ] Security review passed

**Release commands:**
```powershell
npm run package
Rename-Item "build\replycators.zip" "build\replycators-X.Y.Z.zip"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### 8. Post-Release Monitoring (48 hours)

- [ ] Monitor GitHub Issues for new bug reports
- [ ] Verify extension loads after update
- [ ] Close resolved Issues
- [ ] Confirm CHANGELOG.md and README.md reflect current version

### Issue Priority Reference

| Label | Block Release? |
|---|---|
| P1-critical | YES |
| P2-high | YES unless imminent fix |
| P3-medium | No (ship with known issue note) |
| P4-low | No |
| security | YES if CVSS > 5 |

---

## 12. ARCHITECTURE OVERVIEW

### 12.1 System Context

```
[User: Support Engineer]
      ↓ Popup / Side Panel
[ReplyCators Extension]
      ↓ Content Scripts      → [Salesforce Lightning] (DOM extraction)
      ↓ XHR Interception     → [Cloudability] (OrgID detection)
      ↓ chrome.tabs.create   → [Apptio Products] (dashboard launching)
      ↓ HTTP → localhost     → [IBM Bob CLI] (prompt execution)
      ↓ chrome.* APIs        → [Microsoft Edge] (storage, tabs, bookmarks)
```

### 12.2 Component Layers

```
[dashboard.html + dashboard.js]
  → Plugin Modules (×10): each an IIFE, self-registers on window.ReplyCatorsPlugins
      → window.ReplyCatorsApp (shared services: addLog, showToast, navigateTo)
      → chrome.storage.local (plugin-specific keys: rc:plugin:<id>:*)
  → background.js (service worker)
      → content scripts (sf-content.js ISOLATED, cloudability-interceptor.js MAIN)
      → HTTP POST → bob-helper-server.js → IBM Bob CLI
  → chrome.storage.local (session keys: rc:session:*)
```

### 12.3 Startup Sequence

```
Browser opens popup
  → dashboard.html loads
      → plugins/*.js (×10) — each registers on window.ReplyCatorsPlugins
      → dashboard.js — DOMContentLoaded handler
          → restoreSession() — SINGLE chrome.storage.local.get() for ALL keys
          → applyAllSettings() (theme, font, density)
          → applyPluginVisibility() (build nav from PLUGINS[])
          → applyDashboardOrder() (reorder widgets + nav)
          → plugin.init() ×10 (synchronous only — no I/O)
          → navigateTo(lastView) (restore last active view)
          → Extension ready (~100ms)
```

### 12.4 Integration Inventory

| Integration | Mechanism | Purpose | Security |
|---|---|---|---|
| Salesforce | Content Script ISOLATED world | DOM case data extraction | Read-only, sandboxed |
| Cloudability | Content Script MAIN world | XHR interception for OrgID | Elevated, monitored |
| Apptio Products | chrome.tabs.create | Dashboard launching | No injection |
| IBM Bob CLI | HTTP → loopback → PowerShell | AI prompt execution | Loopback only, CORS-restricted |
| Edge Bookmarks | chrome.bookmarks | Search and open bookmarks | Standard permission |
| Edge Tab Groups | chrome.tabGroups | Workspace profiles | Standard permission |

---

## 13. RELEASE LIFECYCLE

### Weekly Release Phases

**Monday — Planning**
- Triage open GitHub Issues (15 min)
- Prioritize and assign for the week
- Set weekly release goal

**Mon-Thu — Development**
- Edit root files (not src/ or dist/)
- Run npm run sync after every edit
- Manual QA per change (AGENTS.md §16 QA Matrix)
- Update docs and version before Thursday EOD
- Create PR with Release Gate checklist complete

**Thursday — Review**
- Code review (logic, standards, AI hygiene)
- CODEOWNERS review for high-risk files
- Merge approved PRs to main

**Friday — Validation and Release**
- npm run typecheck → npm run sync:verify → npm audit
- Full QA Matrix (30 min)
- Weekly Release Review (30-45 min)
- Go/No-Go decision
- If Go: npm run package → tag → GitHub Release
- Post-release monitoring begins (48 hours)

**Last Friday of Month — Retrospective**
1. What shipped this month?
2. What regressions occurred?
3. What slowed us down?
4. What prompts worked well or poorly?
5. Pick one process improvement for next month

### Rollback Procedure

If critical defect found post-release:
1. git revert <commit-hash>
2. Bump PATCH version
3. Rebuild and re-release
4. Communicate in GitHub Issue: "[v1.X.Y] Rolled back due to [REASON]"

---

## 14. KNOWLEDGE MAP

### Recommended Knowledge Architecture

```
docs/
├── index.md                          ← Navigation hub
├── ARCHITECTURE.md                   ← Full architecture reference
├── AI-PLUGIN-KIT.md                  ← AI agent workflows
├── DEVELOPER_GUIDE.md                ← Plugin authoring guide
├── CONTRIBUTING.md                   ← Contribution workflow
├── INSTALLATION.md                   ← Setup guide
├── TROUBLESHOOTING.md                ← Issues and fixes
├── STORAGE.md                        ← Storage schema
├── SETTINGS.md                       ← Platform settings
├── THEMES.md                         ← Theme system
├── STARTUP-FLOW.md                   ← Boot sequence
├── PACKAGING.md                      ← Build and distribution
├── WORKING_DIRECTORY.md              ← Root vs dist/ governance
├── ICON-SYSTEM.md                    ← Icon governance
├── BOB-HELPER-SERVER.md              ← Bob HTTP server reference
├── PROMPT-CATALOG.md                 ← [NEW] AI prompt catalog
├── CONTRIBUTOR-ONBOARDING.md         ← [NEW] Human onboarding guide
├── adr/                              ← [NEW] Individual ADR files
│   ├── TEMPLATE.md
│   ├── ADR-001-root-deployment.md
│   ├── ADR-002-dual-implementation.md
│   └── ADR-009-prompt-catalog.md     ← [NEW]
├── plugins/                          ← Per-plugin documentation
│   └── [10 plugin docs]
├── reports/                          ← Audit reports (this file)
├── TECH-DEBT-RESOLVED.md             ← Closed debt archive
└── CHANGELOG-ARCHIVE.md             ← Historical changelog
```

### Document Ownership

| Document | Owner | Update Trigger |
|---|---|---|
| AGENTS.md | Contributor A | Every significant change |
| CHANGELOG.md | Change author | Every release |
| docs/ARCHITECTURE.md | Contributor A | Structural changes |
| docs/plugins/<name>.md | Plugin author | Plugin changes |
| docs/PROMPT-CATALOG.md | Prompt Lead | New prompts or quarterly |
| docs/CONTRIBUTOR-ONBOARDING.md | Contributor A | Process changes |

---

## 15. BACKLOG AND ISSUE GOVERNANCE

### Issue States

```
New → Triaged → In Progress → In Review → Resolved → Closed
              ↓
         Won't Fix / Duplicate / Cannot Reproduce
```

### Priority Labels

| Label | Meaning | Release Blocker? |
|---|---|---|
| P1-critical | Data loss, crash, broken launch | YES |
| P2-high | Broken core feature, regression | YES unless imminent fix |
| P3-medium | Feature, UX issue, non-blocking bug | No |
| P4-low | Cosmetic, docs gap | No |

### Type Labels

bug | enhancement | documentation | security | good-first-issue | help-wanted | blocked | question

### Triage Rules

**Weekly Triage (Monday, 15 min):**
1. Assign P1/P2/P3/P4 to all New issues
2. Assign type label
3. Assign to contributor or mark help-wanted
4. Close Won't Fix / Duplicate with explanation

**P1 Triage (immediate):**
1. Verify P1 classification (data loss, crash, broken launch)
2. Assign within 4 hours
3. Create hotfix branch
4. Resolve within 24 hours
5. Release as PATCH outside normal cadence

### Escalation Rules

| Trigger | Action |
|---|---|
| P1 open > 4 hours | All contributors notified |
| P2 open > 1 week | Reassign or defer |
| P3 open > 4 weeks | Reassign, defer, or close |
| No reporter response > 2 weeks | Close as Cannot Reproduce |

### Backlog Health Rules

- No unassigned P1/P2 issues
- Max 20 open issues before dedicated triage session
- Stale issues (30 days no activity) require decision
- Always 1-3 good-first-issue tagged

---

## 16. REPOSITORY STANDARDS

### Structure Rules

Root directory: Only extension entry points, build config, governance files.

Directory purposes: See AGENTS.md §4 Repository Structure.

Prohibited: node_modules/, .zip/.crx/.pem build artifacts, __-prefixed directories.

### Naming Conventions

| Type | Convention |
|---|---|
| Plugin modules | kebab-case.js |
| CSS classes | rc- prefix + BEM |
| Plugin IDs | com.replycators.<slug> |
| Storage keys | rc:session:* / rc:plugin:<id>:* |
| Branches | feature/ fix/ docs/ chore/ release/ |
| Commits | type(scope): summary |

### Documentation Requirements

- Every code change: CHANGELOG.md entry + AGENTS.md update + docs/ update
- Every new plugin: docs/plugins/<name>.md required
- Documentation health: Quarterly review

### PR Standards

- Summary: 1-2 sentences
- Type of change declared
- Release Gate checklist complete (37 items)
- CI passing

### AI-Generated Code Standards

Requirements before merging:
- Manually tested (not just reviewed)
- Platform design system followed (no console.log, no custom toast)
- Storage keys verified against Source of Truth Matrix
- No em-dashes in user-facing strings (§28)
- No AI hallucinations (invented APIs, wrong paths)
- PR description notes AI-generated sections

Prohibited in AI-generated code: console.log/warn/error, custom toast UI, custom icon systems, em-dash (U+2014), en-dash (U+2013), direct dist/ edits, __-prefixed directories.

### Versioning Standards

| Segment | When |
|---|---|
| MAJOR | Breaking change, storage migration, architecture overhaul |
| MINOR | New feature, new plugin, new setting (additive) |
| PATCH | Bug fix, cosmetic change, doc correction |

10 version locations — all must match before release (AGENTS.md §12).

MAJOR approval requires all 5 items (AGENTS.md §12 Major Version Approval Rule).

### Release Tagging

Every release must have:
- Annotated git tag: vX.Y.Z
- GitHub Release with CHANGELOG.md entry as release notes
- Release ZIP as release asset

### Branch Strategy

- Trunk-based development (main + short-lived feature/fix branches)
- main is always releasable
- Direct push to main discouraged
- Recommended branch protection: require PR + CI + CODEOWNERS review

---

## 17. ENGINEERING LIFECYCLE STANDARD

### Ownership Model

| Role | Responsibilities | Holder |
|---|---|---|
| Platform Owner | Architecture, release approval, repo admin, escalation | Contributor A |
| Plugin Engineer | Plugin dev, testing, docs | Contributor B / C |
| Release Manager | Weekly release, checklist | Contributor A |
| Documentation Owner | AGENTS.md, doc architecture | Contributor A |
| Prompt Governance Lead | Prompt catalog, AI review | [ASSIGN] |

### Decision Authority

| Change Type | Can Decide Alone | Requires Discussion |
|---|---|---|
| PATCH bug fix | Any contributor | — |
| MINOR feature | Any contributor | Discuss intent first |
| MAJOR breaking change | Platform Owner only | Team review required |
| Permission change | Platform Owner only | Team review required |
| New plugin | Platform Owner | Team review |
| ADR | Platform Owner | Team input welcome |

### Architecture Review Triggers

Create an ADR when:
- Introducing a new persistence mechanism
- Changing the plugin registration contract
- Adding new host permissions
- Changing popup/side panel interaction model
- Introducing a new background service
- Changing the build toolchain

### Documentation Governance (Mandatory)

"Code is not done without documentation." (§23-A non-negotiable rule)

Every code change accompanied by documentation updates.
Every architectural decision documented as ADR.

### Release Governance

- Release authority: Platform Owner
- Release frequency: Weekly target (every Friday)
- Hotfix releases: Anytime for P1 defects
- All releases through Release Gate checklist

### Prompt Governance

Prompts are first-class artifacts:
- Cataloged in docs/PROMPT-CATALOG.md
- Versioned (increment on change)
- Reviewed before Active status
- Tested quarterly
- Owned by named contributor

### Meeting Cadence

| Meeting | Frequency | Duration | Owner |
|---|---|---|---|
| Weekly Issue Triage | Monday | 15 min | A |
| Weekly Release Review | Friday | 30-45 min | A |
| Monthly Retrospective | Last Friday | 30 min | A |
| Quarterly Docs Review | Quarterly | 1 hour | A |
| Quarterly Prompt Review | Quarterly | 30 min | Prompt Lead |

---

## 18. SCALING READINESS ASSESSMENT

### Current State (3 Contributors): Score 7/10

| Dimension | Score | Gap |
|---|---|---|
| Documentation | 9/10 | Missing onboarding guide |
| Tooling | 7/10 | CI exists, no test automation |
| Process | 7/10 | AGENTS.md strong, release procedure weak |
| Knowledge distribution | 5/10 | Single CODEOWNER, implicit RACI |
| Onboarding | 4/10 | No human onboarding path |
| Prompt governance | 3/10 | No catalog or process |

### Stage 1: 2-4 Contributors

**Readiness: Ready with small additions**

Risks:
- New contributors overwhelmed by AGENTS.md
- Version bump errors from parallel PRs
- Documentation staleness from parallel changes

Required controls:
- [ ] docs/CONTRIBUTOR-ONBOARDING.md completed
- [ ] CODEOWNERS updated with second reviewer
- [ ] RACI matrix communicated
- [ ] docs/PROMPT-CATALOG.md seeded with 5 prompts
- [ ] PR review SLA: 24-hour response, 48-hour merge

### Stage 2: 5-10 Contributors

**Readiness: NOT READY — significant additions required**

Risks:
- Parallel PR conflicts on documentation and version numbers
- Plugin quality regression without automated testing
- 37-item PR checklist becomes friction
- Architecture drift from independent decisions
- AGENTS.md unmanageable as single document
- Prompt knowledge concentration becomes acute

Required controls:
- [ ] Automated testing (TD-003 — critical at this scale)
- [ ] ESLint in CI
- [ ] Commitlint in CI
- [ ] Version bump automation (semantic-release or similar)
- [ ] ADR process enforced, not optional
- [ ] AGENTS.md split by concern into separately maintained docs
- [ ] Plugin review process formalized
- [ ] GitHub Projects or Milestone planning

Required architecture changes:
- TypeScript migration (RC-015 Phase 2) critical for type safety
- Plugin interface formally typed and tested
- ESM or bundle-per-plugin to prevent global namespace pollution

### Stage 3: 10+ Contributors

**Readiness: NOT READY — process redesign required**

Risks:
- AGENTS.md governance breaks down as single document
- Manual QA completely unscalable
- Bus factor extends to all contributors
- Decision velocity slows
- Plugin portfolio becomes full-time activity
- Security review cannot be manual

Required controls:
- [ ] Full automated test suite (unit, integration, E2E)
- [ ] Formal plugin API versioning and stability guarantees
- [ ] RFC process for MAJOR changes
- [ ] Formal security review with dedicated reviewer
- [ ] Plugin marketplace governance (submission, review, retirement)
- [ ] Structured multi-week onboarding program
- [ ] Community moderation guidelines
- [ ] Automated dependency management (Dependabot)

---

## 19. PRIORITIZED ROADMAP

### Immediate (This Week) — P0/P1

| Action | Effort | Impact |
|---|---|---|
| Update .github/CODEOWNERS with real GitHub usernames | 30 min | High |
| Create docs/CONTRIBUTOR-ONBOARDING.md | 4 hrs | High |
| Create docs/PROMPT-CATALOG.md — seed 5 prompts | 3 hrs | High |
| Assign RACI matrix owners (communicate to team) | 1 hr | High |
| Add npm audit to CI pipeline | 30 min | Medium |

### This Month — P1/P2

| Action | Effort | Impact |
|---|---|---|
| Create docs/adr/ folder — move ADR-008 + create ADR-009 | 2 hrs | Medium |
| Formalize weekly release procedure | 3 hrs | High |
| Add git release tagging to release process | 1 hr | Medium |
| Test onboarding guide with real new contributor | 4 hrs | High |
| Conduct first monthly retrospective | 30 min | Medium |

### This Quarter — P2/P3

| Action | Effort | Impact |
|---|---|---|
| Begin TypeScript migration investigation (RC-015 Phase 2) | 8 hrs | High (long-term) |
| Run first quarterly docs review | 1 hr | Medium |
| Run first quarterly prompt catalog review | 30 min | Medium |
| Evaluate commitlint for enforcement | 2 hrs | Low |
| Evaluate automated release notes | 4 hrs | Medium |
| Evaluate Dependabot for dependency management | 2 hrs | Medium |

### Next 6 Months — P2/P3

| Action | Effort | Impact |
|---|---|---|
| Initiate TD-003 automated test plan | 40+ hrs | High |
| ESLint configuration and CI integration | 8 hrs | Medium |
| Plugin portfolio review (deprecation policy) | 4 hrs | Medium |
| Contributor ladder definition | 4 hrs | Medium |
| Evaluate RFC process for architectural changes | 2 hrs | Medium |

---

## Summary: What This Project Does Exceptionally Well

1. AGENTS.md as living AI + human briefing document — model for AI-first projects
2. Source of Truth Matrix — 42 state entries, single authoritative owners
3. Plugin isolation architecture — 10 plugins, no cross-coupling
4. ADR discipline — decisions documented with context, alternatives, consequences
5. Comprehensive CHANGELOG — structured, file-level traceability
6. Technical debt transparency — 18 items tracked, resolved, archived
7. Forbidden Changes table — prevents 23 common AI and human mistakes
8. Storage namespace governance — prevents key collisions
9. Security-first posture — loopback-only, no telemetry, strict CSP
10. ASCII Punctuation Standard — governance down to the character level

The gaps are real and addressable. The foundation is outstanding.
```
