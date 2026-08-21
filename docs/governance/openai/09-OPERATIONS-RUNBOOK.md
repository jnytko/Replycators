# Operations Runbook

## Routine operation

For each scheduled or manual run:

1. Confirm the run baseline commit.
2. Confirm the prompt and schema versions.
3. Review workflow completion status.
4. Review accepted and rejected finding counts.
5. Review issue reconciliation results.
6. Review unexpected cost or latency changes.
7. Review escalations and incomplete evidence.
8. Preserve the final run manifest.

## Run manifest

Each run should record:

- Run ID.
- Trigger.
- Start and completion timestamps.
- Repository SHA.
- Prompt IDs and versions.
- Schema versions.
- Model configurations.
- Findings accepted and rejected.
- Issues created, updated, or reopened.
- Remediation tasks dispatched.
- Validation outcomes.
- Final dispositions.
- Release decision.
- Retry and failure events.

## Monitoring metrics

Track:

- Findings generated.
- Finding acceptance rate.
- Duplicate rate.
- Recurrence rate.
- Issues resolved.
- Mean time to resolution.
- Validation pass rate.
- Regression rate.
- Pull-request success rate.
- Reopened issue rate.
- Escalation rate.
- Manual-intervention rate.
- OpenAI usage per resolved issue.

## Failure classification

### Retryable

Examples:

- Temporary API availability failure.
- GitHub rate limit with a known reset time.
- Transient artifact upload failure.

Use bounded exponential backoff.

### Non-retryable

Examples:

- Invalid schema.
- Missing required prompt.
- Unsupported schema version.
- Prohibited path.

Stop the stage and publish a failure report.

### Authentication

Examples:

- Missing `OPENAI_API_KEY`.
- Revoked GitHub token.
- Invalid webhook signature.

Stop immediately. Do not print credential values.

### Repository state

Examples:

- Evaluated commit no longer matches remediation branch baseline.
- Required file was deleted.
- Branch protection blocks the requested operation.

Re-evaluate or escalate rather than forcing the operation.

### Validation

Examples:

- Build failure.
- Root-to-`dist/` mismatch.
- Regression detected.
- Required manual QA failed.

Return the issue to implementation or block after the retry threshold.

## Retry policy

Recommended initial policy:

- Maximum three attempts for transient API or network failures.
- No automatic retry for schema, policy, or authorization failures.
- One remediation retry after a clear validation failure.
- Escalation after repeated remediation failure.

## Suspending automation

Suspend scheduled governance when:

- False-positive rate rises unexpectedly.
- Duplicate issues are created.
- Costs exceed the agreed threshold.
- The OpenAI model or API behavior changes materially.
- Repository architecture changes invalidate prompts.
- Write-capable workflows perform an unexpected action.
- Secret exposure is suspected.

Keep manual dispatch available only after confirming it is safe.

## Secret rotation

1. Disable scheduled write-capable workflows.
2. Revoke the affected OpenAI key.
3. Create a replacement key in the approved project.
4. Update `OPENAI_API_KEY` in GitHub Actions secrets.
5. Review logs and artifacts for exposure.
6. Run a read-only smoke test.
7. Re-enable automation.

## Model or prompt change

1. Keep the current production setting recorded.
2. Run the evaluation set with the candidate configuration.
3. Compare quality, cost, and latency.
4. Approve or reject the change.
5. Update configuration and prompt version.
6. Retain rollback instructions.

## Incident response

When the workflow performs an unexpected write:

1. Disable the affected workflow.
2. Preserve the Actions run and artifacts.
3. Identify the token and permissions used.
4. Revoke credentials when exposure is possible.
5. Revert through a reviewed pull request when required.
6. Reopen affected issues.
7. Determine whether prompt, controller, or tool validation failed.
8. Add a deterministic safeguard before reactivation.

## Release operation

Before accepting a release-readiness result, verify:

- Deterministic gates were executed against the intended commit.
- Required CI checks passed.
- Manual QA is complete.
- Documentation and versions are aligned.
- No critical or escalated blocker remains.
- Every run finding has a recognized disposition.
