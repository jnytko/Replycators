# Data Contracts

## Purpose

The model and workflow scripts must communicate through versioned contracts. Free-form prose is suitable for human summaries but not for state transitions or GitHub writes.

## Finding contract

The canonical finding envelope contains:

- `schema_version`
- `run_id`
- `repository_sha`
- `prompt_id`
- `prompt_version`
- `findings[]`

Each finding contains:

- Stable finding ID for human reference.
- Deterministic fingerprint for reconciliation.
- Source and severity.
- Confidence.
- Affected component.
- Summary and description.
- Repository evidence.
- Root cause.
- Recommended action.
- Acceptance criteria.
- Validation plan.
- Regression areas.
- Dependencies.
- Release impact.

Use [finding.schema.example.json](examples/finding.schema.example.json) as the initial contract.

## Evidence contract

Each evidence item should contain:

```json
{
  "path": "dashboard.js",
  "line": 125,
  "observation": "The observed code path bypasses the required platform service."
}
```

Rules:

- Paths must be repository-relative.
- Paths must not escape the repository.
- Line numbers are optional but must be valid when supplied.
- Observations must describe the repository condition, not only the conclusion.
- Evidence must refer to the evaluated commit.

## Fingerprint contract

The controller, not the model, should generate fingerprints.

Recommended input:

```text
normalized source
normalized component
normalized problem category
normalized root cause
```

Normalize whitespace, case, separators, and known aliases before hashing.

The fingerprint must remain stable when wording changes but the underlying defect does not.

## Regression result contract

A regression result should include:

```json
{
  "schema_version": "1.0",
  "run_id": "governance-123",
  "issue_number": 42,
  "pull_request_number": 77,
  "repository_sha": "commit-sha",
  "status": "passed",
  "checks": [
    {
      "name": "typecheck",
      "status": "passed",
      "evidence": "GitHub Actions check URL"
    }
  ],
  "manual_qa": [
    {
      "scenario": "Side Panel at 300 px",
      "status": "required",
      "evidence": null
    }
  ],
  "unresolved_risks": []
}
```

Allowed overall statuses should be:

- `passed`
- `failed`
- `incomplete`
- `blocked`

An incomplete manual requirement prevents an overall `passed` result when that scenario is mandatory.

## Release-decision contract

The release decision should separate deterministic gates from narrative analysis:

```json
{
  "schema_version": "1.0",
  "run_id": "governance-123",
  "repository_sha": "commit-sha",
  "decision": "not_ready",
  "deterministic_gates": {
    "critical_findings_clear": true,
    "escalations_clear": false,
    "required_checks_passed": true,
    "regression_complete": true,
    "manual_qa_complete": false,
    "documentation_aligned": true,
    "versions_consistent": true,
    "all_findings_disposed": false
  },
  "blockers": [
    "Manual Side Panel verification is incomplete."
  ],
  "summary": "Release is not ready because required evidence is incomplete."
}
```

The model may write `summary` and explain blockers. It must not override failed deterministic gates.

## Issue metadata contract

Store machine-readable metadata in a stable issue-body block:

```markdown
<!-- replycators-governance
schema_version: 1.0
fingerprint: sha256-value
run_id: governance-123
prompt: architecture-audit@1.0
repository_sha: commit-sha
-->
```

Do not parse human prose to recover critical identifiers.

## Versioning rules

- Additive optional fields may use a minor schema revision.
- Removing or changing required fields requires a new major schema version.
- Workflows must reject unsupported schema versions.
- Historical artifacts retain their original schema version.
- Schema migrations must be deterministic and tested.
