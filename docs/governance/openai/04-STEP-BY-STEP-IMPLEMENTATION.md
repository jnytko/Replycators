# Step-by-Step Implementation

## Overview

Implement the integration in controlled phases. Each phase adds one new class of authority only after the previous phase is stable.

## Phase 0: Confirm the baseline

### Step 0.1: Review authoritative instructions

Read:

- `AGENTS.md`
- `docs/PROMPT-CATALOG.md`
- `.github/workflows/ci.yml`
- `.github/workflows/release-readiness.yml`
- `.github/scripts/governance-safeguards.js`
- `.github/scripts/process-findings.js`
- `.github/scripts/prioritize-issues.js`

### Step 0.2: Record existing gaps

Confirm the current implementation gaps before editing:

- No agent-driven workflow is active; a supported invocation mechanism must be selected and verified.
- Finding schema is incomplete.
- Finding IDs are not sufficient for reliable deduplication.
- Lifecycle transitions stop before implementation completion.
- Stage sequencing and documentation alignment have not yet been implemented.
- Release readiness relies mainly on issue counts.
- Runtime QA is partly manual.

### Step 0.3: Make owner decisions

Decide:

- Model configuration.
- Branch naming.
- Severity weights.
- Release-blocking severity policy.
- Maximum audit and remediation batch sizes.
- Required human review categories.

Record decisions in [10-ROLLOUT-AND-DECISIONS.md](10-ROLLOUT-AND-DECISIONS.md) or a repository ADR if they become permanent architecture.

## Phase 1: Implement a read-only OpenAI audit

### Step 1.1: Copy the finding schema

Copy:

```text
docs/governance/openai/examples/finding.schema.example.json
```

to:

```text
.github/governance/schemas/finding.schema.json
```

Review it before committing.

### Step 1.2: Create the OpenAI audit script

Use [openai-audit.example.js](examples/openai-audit.example.js) as a starting point.

The production script must:

1. Load the selected prompt by stable ID.
2. Load the relevant repository context.
3. Call the Responses API.
4. Request Structured Outputs using the finding schema.
5. Write the response under `.governance/findings/`.
6. Fail safely when output is incomplete or invalid.

### Step 1.3: Add the workflow

Use [openai-governance.example.yml](examples/openai-governance.example.yml) as a starting point.

Initially allow only `workflow_dispatch`. Do not add a schedule yet.

### Step 1.4: Validate artifacts

For every output finding, verify:

- The file exists.
- The line or observed condition is correct.
- The finding does not mistake `src/` for the active runtime.
- The root cause is supported.
- Acceptance criteria are observable.
- The validation plan is executable.

### Step 1.5: Establish the baseline evaluation set

Create representative cases containing:

- A known valid architecture finding.
- A known invalid or speculative finding.
- A duplicate finding expressed differently.
- A documentation-only discrepancy.
- A finding that requires escalation.

Record expected results for later regression testing.

## Phase 2: Harden finding processing

### Step 2.1: Add schema validation

Validate the OpenAI result before running the existing safeguards. Schema failure must stop the workflow.

### Step 2.2: Generate deterministic fingerprints

Generate a fingerprint from normalized fields:

```text
source + component + problem category + normalized root cause
```

Hash the normalized value and store the result in the issue metadata.

Do not depend only on model-generated `finding_id` values.

### Step 2.3: Verify repository evidence

For each evidence record:

1. Resolve the path within the repository.
2. Reject absolute or escaping paths.
3. Confirm that the file exists at the evaluated commit.
4. Confirm that line numbers are valid when provided.
5. Require an observation with sufficient detail.

### Step 2.4: Add duplicate and recurrence handling

The reconciliation logic must distinguish:

- New finding.
- Existing open finding.
- Previously resolved finding with no recurrence.
- Previously resolved finding with current recurrence evidence.
- Duplicate from another audit source.
- Related but independent finding.

### Step 2.5: Preserve rejected findings

Write a rejection report containing:

- Original finding.
- Validation errors.
- Rejection classification.
- Run ID.
- Prompt version.

## Phase 3: Enable issue reconciliation

### Step 3.1: Add issue write permission

Update only the reconciliation job:

```yaml
permissions:
  contents: read
  issues: write
```

### Step 3.2: Update the issue format

Include:

- Run ID.
- Prompt ID and version.
- Finding ID and fingerprint.
- Severity and confidence.
- Evidence.
- Root cause.
- Acceptance criteria.
- Validation plan.
- Regression areas.
- Priority calculation.
- Final disposition section.

### Step 3.3: Implement idempotency

Running the same audit twice against the same commit must update or leave the existing issue unchanged. It must not create a second issue.

### Step 3.4: Keep triage human-controlled

New issues remain outside automated remediation until a maintainer applies `auto-fix`. Maintainers may also apply `state:validated` to record a prior validation decision, but it is not required in addition to the explicit queue label.

## Phase 4: Implement deterministic prioritization and eligibility

### Step 4.1: Resolve the scoring formula

Choose and document one authoritative severity scale.

Recommended base scores:

| Severity | Score |
|---|---:|
| Critical | 100 |
| High | 75 |
| Medium | 50 |
| Low | 25 |

### Step 4.2: Add explicit modifiers

Calculate:

```text
severity + risk + dependency + age + release impact
```

Do not ask the model to calculate the final number. The model may classify risk and release impact, but a deterministic script should calculate the score.

### Step 4.3: Add eligibility checks

Require:

- Validated evidence.
- Understood scope.
- Acceptance criteria.
- Validation path.
- Resolved dependencies.
- No conflicting finding.
- Change within autonomous limits.
- Change below configured size thresholds.

### Step 4.4: Use the existing repository labels

Do not create a parallel finding, source, severity, or lifecycle taxonomy. A queued issue must have:

- `auto-fix`.
- Exactly one issue type: `bug`, `documentation`, or `enhancement`.
- Exactly one priority: `priority:p1` through `priority:p4`.
- Exactly one recognized `area:*` label.
- Zero or one recognized state: `state:validated`, `state:implementation`, or `state:blocked`.

Use the ordinary `invalid`, `duplicate`, and `wontfix` labels as exclusion signals. Do not require `governance:reviewed`, `finding:*`, `source:*`, or `severity:*` labels.

### Step 4.5: Centralize state transitions

Create one helper that:

1. Reads current labels.
2. Removes every `state:*` label.
3. Validates the requested transition.
4. Applies `state:implementation` or `state:blocked`, or clears state when closing a successful issue.
5. Preserves the queue, type, priority, area, and unrelated labels.
6. Records the transition reason.

## Phase 5: Introduce Codex remediation

### Step 5.1: Start with manual Codex tasks

Use validated issues as task prompts. Require Codex to reproduce the issue before editing.

### Step 5.2: Enforce one issue per branch

Use existing ReplyCators branch conventions unless an owner decision changes them:

```text
fix/governance-<issue-number>
docs/governance-<issue-number>
chore/governance-<issue-number>
```

### Step 5.3: Require draft pull requests

Every automated remediation must initially create a draft pull request. It must not merge automatically.

### Step 5.4: Add bounded dispatch

Set:

- Maximum one or two concurrent remediation tasks.
- Maximum changed files.
- Maximum changed lines.
- Maximum retry count.
- Maximum execution time.

### Step 5.5: Stop on scope expansion

If remediation reveals a larger architectural problem, Codex must stop, preserve evidence, and apply the escalation path rather than broadening the change.

## Phase 6: Complete validation and regression

### Step 6.1: Run deterministic checks

At minimum:

```text
npm run typecheck
npm run build
npm run sync:verify
```

GitHub Actions runners may use `npm ci` because they are ephemeral. Local agents must follow the Runtime-First Policy.

### Step 6.2: Map changes to QA requirements

Examples:

| Change | Additional validation |
|---|---|
| Dashboard UI | Popup and Side Panel widths |
| Storage logic | Fresh and existing install behavior |
| Plugin lifecycle | Disable, enable, and re-enable behavior |
| Background messaging | Startup and message-routing behavior |
| Documentation only | Link and factual consistency checks |

### Step 6.3: Keep manual QA explicit

When browser-level automation is unavailable, record manual QA as `required`, `passed`, or `failed`. Missing manual QA must not be interpreted as a pass.

### Step 6.4: Return failed work safely

Validation failure returns the issue to `state:implementation`. Repeated failure transitions it to `state:blocked` with escalation.

## Phase 7: Move documentation alignment after remediation

The existing pre-remediation documentation audit may remain as a discovery stage. Add a post-remediation documentation gate that verifies the actual completed change.

Check:

- `CHANGELOG.md`.
- `AGENTS.md`.
- `README.md`.
- Relevant `docs/` files.
- Plugin and platform versions.
- Storage documentation.
- ADR requirements.
- Root-to-`dist/` alignment.

## Phase 8: Expand release readiness

The final decision must consume:

- Open critical and escalated issues.
- Required-check results.
- Regression reports.
- Manual QA status.
- Documentation alignment status.
- Version consistency.
- Changelog status.
- Finding disposition coverage.

A model may summarize the decision, but deterministic conditions must decide whether the gate passes.

## Phase 9: Enable scheduling

Only after the manual audit path is stable:

1. Add a conservative schedule.
2. Add concurrency protection.
3. Add budget and call limits.
4. Publish run summaries.
5. Monitor false-positive and duplicate rates.

## Phase 10: Consider selective automatic merge

Automatic merge is optional and should be the final capability introduced.

Potentially eligible categories:

- Documentation-only corrections.
- Deterministic metadata synchronization.
- Narrow governance-script tests.

Runtime, storage, manifest, permission, and architecture changes should continue to require human review.
