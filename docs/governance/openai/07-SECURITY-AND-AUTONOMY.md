# Security and Autonomy

## Security objective

The governance system must improve repository health without creating a new path for unauthorized code changes, secret exposure, prompt injection, or branch-protection bypass.

## Least-privilege workflow design

Separate workflows by authority.

### Read-only audit

```yaml
permissions:
  contents: read
```

### Issue reconciliation

```yaml
permissions:
  contents: read
  issues: write
```

### Remediation

```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
  actions: read
```

### Release assessment

```yaml
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
```

Avoid placing every stage in one write-capable job.

## Secret handling

- Store `OPENAI_API_KEY` only in GitHub Actions secrets or an approved secret manager.
- Use a dedicated OpenAI project and key.
- Never include the key in prompts, logs, issues, comments, or artifacts.
- Redact authentication headers from error reports.
- Rotate the key after suspected exposure.
- Verify webhook signatures before processing OpenAI events.
- Do not accept a repository-provided URL as a webhook destination.

## Prompt-injection controls

Repository files, issue bodies, pull-request comments, and dependency content are untrusted data.

The controller must:

1. Identify instruction sources explicitly.
2. Mark repository and external text as evidence rather than authority.
3. Restrict tools available to each stage.
4. Validate every write outside the model.
5. Refuse paths that escape the repository.
6. Prevent issue text from increasing permissions.
7. Avoid exposing secret values to model context.

## Tool design

Prefer narrow functions:

- `get_repository_file`
- `search_repository`
- `find_issue_by_fingerprint`
- `create_governance_issue`
- `update_governance_state`
- `create_governance_pull_request`
- `get_required_check_results`

Avoid unrestricted functions:

- `run_arbitrary_shell`
- `write_any_file`
- `merge_any_pull_request`
- `close_any_issue`
- `delete_branch`
- `change_repository_settings`

Every tool handler must independently validate authorization, input scope, and expected state.

## Autonomy levels

### Level 0: Report only

- Read repository.
- Produce artifacts.
- No GitHub writes.

### Level 1: Issue management

- Create or update validated governance issues.
- Apply approved labels.
- No code changes.

### Level 2: Draft remediation

- Create a branch.
- Implement an eligible change.
- Open a draft pull request.
- No merge.

### Level 3: Controlled merge

- Merge only pre-approved change categories.
- Require every deterministic check.
- Continue to prohibit architecture, storage, security, and manifest changes.

ReplyCators should begin at Level 0 and advance one level at a time.

## Mandatory escalation conditions

Escalate when:

- Evidence is missing or contradictory.
- Required credentials are unavailable.
- A legal or licensing question exists.
- A storage key or plugin ID may change.
- A manifest permission may change.
- A major subsystem may be replaced.
- The estimated change exceeds thresholds.
- Manual QA fails or cannot be completed.
- The same remediation fails repeatedly.
- Repository state differs materially from the finding baseline.

## Change-size thresholds

Before enabling remediation, define numerical limits for:

- Files changed.
- Lines added and removed.
- Number of runtime entry points touched.
- Number of storage keys affected.
- Number of plugins affected.
- Maximum execution time.

Threshold failure must stop dispatch or convert the pull request to human-owned work.

## Branch and merge protection

- Preserve CODEOWNERS review requirements.
- Preserve required status checks.
- Prevent direct writes to `main`.
- Use draft pull requests initially.
- Do not permit the model to alter branch protection.
- Do not let the same unreviewed agent both define and waive its checks.

## Rollback policy

### Before merge

Prefer branch correction or abandonment. Preserve the issue, validation output, and failure evidence.

### After merge

Use a dedicated revert pull request:

1. Identify the original pull request.
2. Create a revert branch.
3. Revert the relevant commits.
4. Run required validation.
5. Open a rollback pull request.
6. Reopen the governance issue.
7. Preserve normal reviews and branch protection.

Do not push an automatic revert directly to `main`.
