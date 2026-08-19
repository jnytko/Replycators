# ADR-009 - Prompt Governance Catalog

## Status

`Active`

## Date

2026-01

## Context

ReplyCators development is predominantly AI-assisted. As of v1.46.4, all substantive code is AI-generated
by a three-person team with limited programming experience in the project languages.

The AI agents that generate code are governed by `AGENTS.md` (approximately 4,000 lines of authoritative
briefing), which covers architecture invariants, forbidden changes, storage schema, versioning, and platform
standards. However, a critical gap existed: no shared record of the prompts used to invoke those AI agents.

As a result:
- Effective prompts were siloed in individual contributor heads
- When contributors changed or AI tools were updated, prompt knowledge was lost
- There was no way to verify that prompts correctly reflected the current AGENTS.md version
- AI output quality varied significantly depending on who crafted the prompt
- No traceability existed linking AI-generated code to the context under which it was produced

The project needed a lightweight, maintainable mechanism to capture, version, and review the prompts used
in development - governed like documentation, not locked to individuals.

## Decision

Introduce a Prompt Governance Catalog stored at `docs/PROMPT-CATALOG.md` in the repository root.

The catalog is a Markdown file - not a separate tool or database. Each prompt entry is a structured
record with: name, owner, purpose, prerequisites, full prompt text, expected output, validation checklist,
feedback log, and revision history.

Governance rules:
- Prompts enter as `Draft`, advance to `Active` after PR review
- A maximum of 5 prompts per category enforces deduplication discipline
- Quarterly review cycle validates each prompt against the current `AGENTS.md`
- Prompts not used in 6 months are reviewed for retirement
- Prompts are versioned (1.0, 1.1, 2.0) independently of the platform version

The catalog is seeded with 7 prompts covering the most common AI workflows:
Plugin Creation (x2), Platform Changes (x1), Documentation (x2), Debugging (x1), Code Review (x1).

## Alternatives Considered

| Option | Description | Why Not Chosen |
|--------|-------------|----------------|
| Individual contributor notes | Each contributor maintains their own prompt library | Knowledge remains siloed; no distribution benefit; no versioning or review |
| External prompt management tool | Dedicated tool such as PromptLayer or similar | Adds external dependency; overkill for a 3-person team; increases cognitive overhead; catalog would drift from codebase versioning |
| Inline prompts in AGENTS.md | Embed prompts directly into AGENTS.md | AGENTS.md is already ~4,000 lines; adding full prompts would make it unmaintainable; prompt lifecycle is different from architecture governance |
| No catalog (status quo) | Continue relying on individual knowledge | Accepted risk of knowledge loss, inconsistent AI output, no traceability — unacceptable long-term |

## Impact

- Every contributor now has access to tested, reviewed prompts for the most common workflows
- AI output quality becomes consistent regardless of which contributor runs the prompt
- Prompts are co-versioned with the codebase via the repository's git history
- PRs that add or modify prompts go through the same review process as code and documentation
- New contributors can reach productive AI-assisted output on Day 1 by using catalog prompts
- Quarterly review cadence ensures prompts stay accurate as AGENTS.md evolves
- `docs/PROMPT-CATALOG.md` must be updated whenever AGENTS.md changes in a way that affects prompt accuracy (see AGENTS.md §23-A Documentation Maintenance Rules)

### Files affected

| File | Change |
|------|--------|
| `docs/PROMPT-CATALOG.md` | New file - AI prompt governance catalog |
| `docs/CONTRIBUTOR-ONBOARDING.md` | References PROMPT-CATALOG.md in AI-assisted development section |
| `docs/index.md` | New entry in Repository Governance table |
| `AGENTS.md §23` | Documentation Map updated to include PROMPT-CATALOG.md |
| `AGENTS.md §23-A` | Maintenance rule: update PROMPT-CATALOG.md when AGENTS.md sections referenced by prompts change |

### Mandatory implementation rules

1. Any new AI prompt used more than twice must be proposed for inclusion in the catalog
2. All catalog prompts must explicitly prohibit em-dashes (per AGENTS.md §28 ASCII Punctuation Standard)
3. All catalog prompts must require AGENTS.md to be loaded as a prerequisite
4. Prompts that reference a specific AGENTS.md section number must be reviewed when that section changes

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Catalog becomes stale as AGENTS.md evolves | Medium | Quarterly review cadence; AGENTS.md maintenance rule in §23-A |
| Contributors skip catalog and use ad-hoc prompts | Medium | Catalog referenced directly in CONTRIBUTOR-ONBOARDING.md; AGENTS.md §23 documentation map |
| Prompt text leaks sensitive implementation details | Low | Governance review step explicitly checks for PII and internal credentials before merge |
| 5-prompt per category limit is too restrictive | Low | Limit is a forcing function for deduplication, not a hard ceiling - can be revised via new ADR |

## Follow-up Actions

- [ ] Assign a Prompt Governance Lead (replace `[ASSIGN]` placeholder in PROMPT-CATALOG.md)
- [ ] Collect feedback on seed prompts from all three contributors after first use
- [ ] Set calendar reminder for first quarterly review (2026-04)
- [ ] Evaluate adding a `Release` category prompt for version bump automation
- [ ] Update `AGENTS.md §23` Documentation Map to include PROMPT-CATALOG.md
- [ ] Update `AGENTS.md §23-A` to add maintenance rule for prompt catalog

---

## Change History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-01 | Engineering Assessment | Initial version |
