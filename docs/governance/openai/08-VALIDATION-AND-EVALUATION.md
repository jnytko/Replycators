# Validation and Evaluation

## Purpose

The integration must be tested at three levels:

1. Model-output quality.
2. Deterministic workflow behavior.
3. Repository remediation and regression behavior.

## Model-output evaluation

Create a representative evaluation set with known expected outcomes.

Include:

- Valid architecture defect.
- Valid documentation discrepancy.
- False-positive candidate.
- Duplicate phrased differently.
- Recurring resolved defect.
- Escalation-required finding.
- Inactive `src/` file that must not be treated as live runtime.
- Evidence with an invalid path.

Score each run for:

| Measure | Meaning |
|---|---|
| Schema compliance | Output matches the required JSON Schema |
| Evidence precision | Referenced evidence proves the claim |
| Finding recall | Expected valid findings are detected |
| False-positive rate | Unsupported findings are avoided |
| Severity agreement | Severity matches reviewer expectations |
| Duplicate stability | Equivalent findings produce the same fingerprint input |
| Acceptance quality | Criteria are observable and testable |
| Cost | API use remains within budget |
| Latency | Workflow completes within the intended window |

Do not promote a prompt or model configuration based on one successful run.

## Contract tests

Test that:

- Valid findings pass schema validation.
- Missing required fields fail.
- Unknown severity values fail.
- Absolute and escaping evidence paths fail.
- Unsupported schema versions fail.
- Regression status cannot pass with required manual QA incomplete.
- Release readiness cannot pass while a deterministic gate is false.

## Reconciliation tests

Test:

- New finding creates one issue.
- Same finding and commit creates no duplicate.
- Same defect with revised wording resolves to the same fingerprint.
- Unrelated finding produces a different fingerprint.
- Closed issue remains closed without recurrence evidence.
- Closed issue reopens with current recurrence evidence.
- Conflicting findings remain linked for triage.

## State-machine tests

Test every allowed and forbidden transition.

Examples:

- An open issue with `auto-fix`, one issue type, one priority, one area, and no state is eligible.
- The same issue with optional `state:validated` remains eligible.
- An issue without `auto-fix`, a required classification, or sufficient evidence is rejected.
- An issue with `state:blocked` or `state:implementation` is not selected for another run.
- State transition removes the previous state label.
- An issue never retains two `state:*` labels.
- A failed remediation applies `state:blocked`; a successful remediation clears the managed state and closes the issue.

## Remediation validation

Every remediation pull request must verify:

- Finding reproduction or independent confirmation.
- Smallest practical root-cause correction.
- No unrelated refactoring.
- Required root-runtime files changed.
- Required `dist/` mirror updated.
- Storage and plugin identities preserved.
- Required documentation updated.
- Required checks completed.

## ReplyCators baseline checks

The deterministic CI baseline is:

```text
npm run typecheck
npm run build
npm run sync:verify
```

GitHub Actions may install dependencies in the ephemeral workspace. Local and agent sessions must follow `AGENTS.md` Runtime-First rules.

## Manual QA matrix

When applicable, record:

- Fresh install.
- Existing install.
- Browser restart.
- Popup at 300 px.
- Popup at wider sizes.
- Side Panel at 300, 400, 500, 600, and 700+ px.
- Plugin disable, enable, and re-enable.
- Settings persistence.
- Notification and activity behavior.
- Changed content-script or background-message path.

Manual QA must have an explicit owner and evidence reference.

## Prompt change validation

When changing a governance prompt:

1. Increment its prompt version.
2. Run the evaluation set against old and new versions.
3. Compare accuracy, false positives, cost, latency, and schema compliance.
4. Record the decision.
5. Roll back when the new prompt degrades required measures.

## Rollout gates

Advance from audit-only to issue writing only when:

- Schema success is reliable.
- Evidence paths validate.
- False positives are acceptably low.
- Duplicate behavior is stable.
- No sensitive information appears in artifacts.

Advance from issue writing to remediation only when:

- State transitions are tested.
- Eligibility is deterministic.
- Branch and pull-request creation is isolated.
- CI protects `main`.
- Manual QA requirements cannot be bypassed.
