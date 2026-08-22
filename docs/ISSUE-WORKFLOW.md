# ReplyCators Issue Workflow

This guide defines how human contributors and AI agents create, validate, implement, and update ReplyCators issues. Use it with the repository instructions in [`AGENTS.md`](../AGENTS.md) and the contribution process in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Choose the right creation path

| Path | Use when | Do not use when |
|------|----------|-----------------|
| **Bug report** | Existing behavior is incorrect, inconsistent, unsafe, inaccessible, or unexpectedly degraded | The request is primarily for a new capability or planned repository improvement |
| **Change proposal** | Proposing a feature, documentation task, maintenance change, build/release improvement, architecture work, governance change, or new plugin | Reporting a reproducible defect in existing behavior |
| **Blank issue** | Neither specialized form fits and the work is still concrete and actionable | Avoiding relevant required fields in a specialized form |

Security reports must follow [`SECURITY.md`](../SECURITY.md). Never put credentials, customer data, private case content, or sensitive exploit details in a public issue.

## Before creating an issue

1. Read the applicable repository instructions and linked documentation.
2. Search both open and closed issues for duplicates, prior decisions, and related work.
3. Inspect the current repository state when the report makes a code, configuration, workflow, or documentation claim.
4. Select the form that matches the requested outcome.
5. Include only evidence that is safe to publish.

Use these evidence terms consistently:

- **Fact** - directly supported by repository content, observed behavior, logs, or linked records.
- **Inference** - a conclusion drawn from facts; state the reasoning and confidence.
- **Proposal** - a possible solution or requirement that has not yet been accepted.
- **Unknown** - information that is unavailable or still requires verification.

## Validation and triage

Before implementation, validate the issue against the current default branch and accessible GitHub history:

1. Confirm the problem or requested outcome still applies.
2. Reproduce the behavior or provide a deterministic repository-based validation path.
3. Identify the smallest affected scope and the authoritative active files.
4. Review related open and closed issues, pull requests, ADRs, and dependencies.
5. Refine acceptance criteria so every item is observable and verifiable.
6. Record risks, constraints, assumptions, and unresolved questions.
7. Apply labels only when supported by evidence:
   - one type when applicable: `bug`, `enhancement`, or `documentation`;
   - one `area:*` label for the primary affected area;
   - one `priority:p1` through `priority:p4` label after impact is validated;
   - workflow labels such as `auto-fix` and `state:*` only according to repository automation rules.

Do not add `auto-fix`, `state:validated`, or another automation-control label merely because an issue is detailed. These labels can trigger or gate repository automation and require intentional maintainer use.

## Implementation planning

An issue is ready for implementation when it has:

- a confirmed problem or approved requested outcome;
- defined in-scope and out-of-scope boundaries;
- identified dependencies and relevant prior work;
- verifiable acceptance criteria;
- an applicable validation plan;
- no unresolved decision that materially changes the solution.

Do not silently broaden scope. If implementation evidence invalidates an assumption or changes the acceptance criteria, update the issue before continuing with the expanded work.

## Updating an existing issue

Preserve the original issue history. Add chronological comments instead of rewriting or deleting earlier evidence. Use the smallest applicable update format below.

### Validation update

```markdown
## Validation update - YYYY-MM-DD

**Result:** Confirmed | Needs information | Not reproducible | Duplicate | Superseded

### Facts and evidence
- ...

### Scope and dependencies
- ...

### Acceptance criteria changes
- Added: ...
- Removed or changed: ... because ...

### Next step
- ...
```

### Implementation update

```markdown
## Implementation update - YYYY-MM-DD

**Status:** In progress | Blocked | Ready for verification

### Changes completed
- ...

### Validation performed
- Command or manual scenario: result

### Deviations, risks, or new evidence
- ...

### Remaining work
- ...
```

### Final verification update

```markdown
## Final verification - YYYY-MM-DD

**Result:** Pass | Partial | Fail

### Acceptance criteria
- [x] ... - evidence
- [ ] ... - reason and owner

### Validation evidence
- ...

### Remaining risks or follow-up
- None, or link each required follow-up issue.
```

## AI-agent requirements

For every new or existing issue, an AI agent must:

1. Read the applicable `AGENTS.md` instructions and linked repository documentation.
2. Search accessible open and closed issues and relevant pull requests before declaring work unique.
3. Use the closest issue form for new work and this guide for structured updates.
4. Populate relevant fields with verified repository evidence; state missing information as unknown.
5. Distinguish facts, inferences, proposals, and unresolved questions.
6. Validate reproduction or repository evidence, scope, dependencies, and acceptance criteria before implementation.
7. Avoid inventing requirements, impact, priority, or user intent.
8. Update the issue when implementation findings change scope, assumptions, risks, or acceptance criteria.
9. Record implementation status, actual validation evidence, and remaining work without claiming unrun checks.
10. Follow repository conventions for labels, issue references, branches, commits, pull requests, documentation, and testing.

When access is unavailable, identify the missing source or permission and avoid fabricating conclusions.
