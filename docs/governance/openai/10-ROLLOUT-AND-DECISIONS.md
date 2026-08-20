# Rollout and Decisions

## Rollout principle

Introduce one new authority class at a time. A successful read-only audit does not justify immediate autonomous remediation or merge.

## Stage 1: Audit only

Capabilities:

- Manual trigger.
- Read repository.
- Call OpenAI.
- Produce validated artifacts.

Exit criteria:

- At least three representative runs reviewed.
- Stable schema compliance.
- Acceptable false-positive rate.
- No sensitive information in artifacts.
- Cost and latency within expected bounds.

## Stage 2: Issue reconciliation

Capabilities:

- Create and update governance issues.
- Apply approved labels.
- Record fingerprints and lineage.

Exit criteria:

- No duplicate issues in repeated runs.
- Recurrence handling tested.
- State transitions tested.
- Issue formatting remains stable.

## Stage 3: Automated prioritization

Capabilities:

- Classify risk and release impact.
- Calculate deterministic priority.
- Recommend eligibility.

Exit criteria:

- Priority calculations are reproducible.
- Eligibility cannot bypass missing evidence.
- Oversized or prohibited work escalates.

## Stage 4: Draft remediation

Capabilities:

- Dispatch validated issues to Codex.
- Create isolated branches.
- Open draft pull requests.

Exit criteria:

- Scope remains bounded.
- CI and branch protection operate correctly.
- Manual QA requirements remain blocking.
- Repeated failure escalates safely.

## Stage 5: Scheduled operation

Capabilities:

- Conservative recurring audit schedule.
- Bounded remediation concurrency.
- Monitoring and budget alerts.

Exit criteria:

- Operational metrics remain within agreed thresholds.
- Incident and secret-rotation procedures have been exercised.
- Owners understand suspension and rollback procedures.

## Stage 6: Selective automatic merge

This stage is optional.

Potential eligible categories:

- Documentation-only corrections.
- Deterministic synchronization updates.
- Narrow governance test additions.

Continue requiring human review for:

- Runtime behavior.
- Storage.
- Manifest permissions.
- Background messaging.
- Architecture.
- Security.
- Licensing.

## Required owner decisions

Complete this table before enabling write-capable automation.

| Decision | Recommended initial value | Owner decision |
|---|---|---|
| Branch naming | Preserve `fix/**`, `docs/**`, `chore/**` | Pending |
| Severity bases | 100, 75, 50, 25 | Pending |
| Release blockers | Critical, escalation, failed required checks | Pending |
| Audit model | Configurable; evaluate current balanced model | Pending |
| High-risk review model | Configurable; evaluate current frontier model | Pending |
| Findings per stage | Maximum 15 | Pending |
| Concurrent remediation | 1 initially | Pending |
| Maximum changed files | Define before Stage 4 | Pending |
| Maximum changed lines | Define before Stage 4 | Pending |
| Automatic merge | Disabled initially | Pending |
| Artifact retention | Define repository policy | Pending |
| Manual Edge QA | Required for affected runtime behavior | Pending |
| Secondary reviewer | Optional for high-risk findings | Pending |

## Go-live checklist

- [ ] OpenAI project and key are dedicated to ReplyCators governance.
- [ ] Secrets are stored in GitHub Actions.
- [ ] Finding schema is versioned.
- [ ] Prompt IDs and versions are stable.
- [ ] Audit output passes schema validation.
- [ ] Evidence paths are verified.
- [ ] Fingerprints are deterministic.
- [ ] Duplicate and recurrence tests pass.
- [ ] State transitions are centralized and tested.
- [ ] Permissions are separated by workflow class.
- [ ] Budget and concurrency limits are configured.
- [ ] Branch protection and CODEOWNERS are active.
- [ ] Manual QA remains explicit.
- [ ] Rollback and suspension procedures are documented.
- [ ] Release readiness consumes deterministic evidence.

## Recommended immediate next action

Implement Stage 1 only:

1. Review the example finding schema.
2. Create the OpenAI project and GitHub secret.
3. Adapt the read-only audit script.
4. Add a manual-dispatch workflow with `contents: read`.
5. Run one architecture audit.
6. Review the artifact manually.
7. Record false positives before changing any issue or repository state.
