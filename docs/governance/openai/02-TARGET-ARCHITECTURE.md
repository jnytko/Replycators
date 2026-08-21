# Target Architecture

## Overview

The recommended architecture is hybrid. GitHub owns workflow state and change control. OpenAI provides structured analysis. Codex performs repository-aware implementation.

```text
GitHub event or schedule
          |
          v
GitHub Actions orchestrator
          |
          v
OpenAI Responses API
Audit, normalize, classify
          |
          v
GitHub Issues
Persistent work queue
          |
          v
Eligibility controller
     +----+----+
     |         |
     v         v
Escalate    Codex task
               |
               v
        Branch and changes
               |
               v
          Pull request
               |
               v
       CI and regression
               |
               v
    Documentation alignment
               |
               v
    Release-readiness result
```

## Component responsibilities

### GitHub Actions

GitHub Actions provides:

- Scheduled and manual triggers.
- Stage sequencing.
- Concurrency control.
- Permission boundaries.
- Retry and failure handling.
- CI and artifact publication.

It remains the intended controller because the repository already uses GitHub Actions for deterministic CI and a manual release-readiness gate. Agent-driven governance workflows must be added only after their provider, permissions, secrets, and failure behavior are explicitly configured and validated.

### OpenAI Responses API

The Responses API provides:

- Prompt execution.
- Structured Outputs using JSON Schema.
- Finding classification.
- Evidence summaries.
- Triage explanations.
- Release-decision analysis.
- Optional background processing for long audits.
- Function calls to narrowly scoped application tools.

The API must not receive unrestricted GitHub or shell authority.

### Codex

Codex provides:

- Repository inspection.
- Reproduction of validated findings.
- Focused file edits.
- Test and build execution.
- Root-to-`dist/` synchronization.
- Pull-request preparation.

Codex tasks must be bounded by the GitHub issue and `AGENTS.md`.

### ChatGPT

ChatGPT is the interactive governance console. It can help users:

- Review findings.
- Explain eligibility decisions.
- Compare audit runs.
- Inspect release blockers.
- Draft remediation instructions.
- Review pull requests against acceptance criteria.

ChatGPT conversation history must not be the only persistent copy of governance state.

### GitHub Issues

Issues retain:

- Finding evidence.
- Prompt and run lineage.
- Priority and eligibility.
- Lifecycle state.
- Related findings.
- Branch, commit, and pull-request links.
- Validation and disposition records.

### Pull requests

Pull requests enforce:

- One bounded implementation concern.
- Required review.
- CI and regression checks.
- Risk and rollback summaries.
- Documentation and version alignment.

## State ownership

| State | Owner |
|---|---|
| Current audit execution | GitHub Actions run |
| Prompt definitions | `docs/PROMPT-CATALOG.md` |
| Finding contract | Versioned JSON Schema |
| Durable finding status | GitHub Issue |
| Implementation state | Branch and pull request |
| Validation state | Required checks and artifacts |
| Release decision | Release-readiness artifact and issue summary |

## Canonical issue lifecycle

```text
state:new
  -> state:triage
  -> state:validated
  -> state:implementation
  -> state:testing
  -> state:verification
  -> state:documentation
  -> state:done
```

Alternative terminal outcomes are:

- `state:invalid`
- `state:deferred`
- `state:blocked` with `governance:escalation` when required

Only one lifecycle state label may be present at a time.

## Execution boundaries

Use separate workflows for separate permission classes:

| Workflow class | Minimum permissions |
|---|---|
| Read-only audit | `contents: read` |
| Issue reconciliation | `contents: read`, `issues: write` |
| Remediation | `contents: write`, `issues: write`, `pull-requests: write`, `actions: read` |
| Release assessment | `contents: read`, `issues: read`, `pull-requests: read`, `actions: read` |

Do not grant write permissions to all audit jobs for convenience.

## Recommended implementation boundary

OpenAI governance files should live under `.github/` when activated. They must not be placed in the ReplyCators extension runtime.

Suggested production structure:

```text
.github/
  governance/
    config.json
    prompts/
    schemas/
  scripts/
    openai-audit.js
    reconcile-findings.js
    evaluate-eligibility.js
    assess-release.js
  workflows/
    openai-governance-audit.yml
    openai-governance-remediation.yml
    openai-governance-release.yml
```

The example files in this documentation pack are not production files. Copy them only after review.
