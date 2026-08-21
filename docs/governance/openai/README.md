# OpenAI Governance Starter Kit

This directory is the implementation entry point for adding OpenAI-powered continuous repository governance to ReplyCators.

The design keeps GitHub Actions as the scheduler, GitHub Issues as the durable work queue, pull requests as the change-control boundary, the OpenAI Responses API as the structured analysis layer, and Codex as the repository implementation agent.

This starter kit is documentation and examples only. Nothing in this directory is loaded by the ReplyCators Edge extension or executed by the existing governance workflows.

## Start here

Read and use the documents in this order:

1. [01-PURPOSE-AND-SCOPE.md](01-PURPOSE-AND-SCOPE.md) - Understand the objective, boundaries, and success criteria.
2. [02-TARGET-ARCHITECTURE.md](02-TARGET-ARCHITECTURE.md) - Understand how OpenAI, Codex, GitHub Actions, Issues, and pull requests work together.
3. [03-PREREQUISITES-AND-OPENAI-SETUP.md](03-PREREQUISITES-AND-OPENAI-SETUP.md) - Prepare the OpenAI project, secrets, permissions, and initial operating mode.
4. [04-STEP-BY-STEP-IMPLEMENTATION.md](04-STEP-BY-STEP-IMPLEMENTATION.md) - Follow the implementation sequence from read-only audit to controlled remediation.
5. [05-DATA-CONTRACTS.md](05-DATA-CONTRACTS.md) - Implement the finding, regression, and release-decision contracts.
6. [06-PROMPT-AND-AGENT-DESIGN.md](06-PROMPT-AND-AGENT-DESIGN.md) - Configure system instructions, task prompts, and autonomy boundaries.
7. [07-SECURITY-AND-AUTONOMY.md](07-SECURITY-AND-AUTONOMY.md) - Apply least privilege, secret handling, approval, and rollback rules.
8. [08-VALIDATION-AND-EVALUATION.md](08-VALIDATION-AND-EVALUATION.md) - Test model output, governance scripts, remediation, and regression behavior.
9. [09-OPERATIONS-RUNBOOK.md](09-OPERATIONS-RUNBOOK.md) - Operate, monitor, retry, suspend, and recover the workflow.
10. [10-ROLLOUT-AND-DECISIONS.md](10-ROLLOUT-AND-DECISIONS.md) - Roll out safely and record the remaining owner decisions.

## Copy-ready examples

The [examples](examples/) directory contains non-runtime templates:

- [agent-policy.example.md](examples/agent-policy.example.md)
- [finding.schema.example.json](examples/finding.schema.example.json)
- [openai-audit.example.js](examples/openai-audit.example.js)
- [openai-governance.example.yml](examples/openai-governance.example.yml)

Review and adapt these examples before copying them into `.github/`. They intentionally do not modify the existing governance implementation.

## Recommended first milestone

Implement only a read-only architecture audit:

1. Create an OpenAI API project and restricted API key.
2. Store the key as the GitHub Actions secret `OPENAI_API_KEY`.
3. Copy and review the finding schema.
4. Adapt the audit script to extract one prompt from `docs/PROMPT-CATALOG.md`.
5. Run the audit manually through `workflow_dispatch`.
6. Upload the result as an artifact.
7. Review at least three runs before enabling automatic issue creation.

Do not begin with autonomous remediation or automatic merge.

## Definition of done

The complete governance integration is operational when:

- All audit stages emit a validated, versioned finding format.
- Duplicate and recurring findings are distinguished reliably.
- GitHub Issues preserve finding lineage and lifecycle state.
- Only validated and eligible findings reach implementation.
- Each remediation uses an isolated branch and pull request.
- Required CI, regression, documentation, and manual QA evidence is recorded.
- Every finding is resolved, invalidated, deferred with justification, or escalated.
- Release readiness is derived from stored evidence rather than a model assertion alone.
