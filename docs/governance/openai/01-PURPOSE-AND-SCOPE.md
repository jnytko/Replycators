# Purpose and Scope

## Purpose

The OpenAI governance integration continuously evaluates ReplyCators repository health and converts supported findings into controlled GitHub work.

It is a governance system, not a generic coding assistant. Its responsibility is to maintain an evidence-based lifecycle from discovery to final disposition:

```text
Audit
  -> Normalize
  -> Validate
  -> Reconcile issue
  -> Prioritize
  -> Determine eligibility
  -> Remediate
  -> Validate and regress
  -> Align documentation
  -> Assess release readiness
```

## Intended outcomes

The integration should:

- Detect architecture, security, performance, quality, documentation, and release risks.
- Reject speculative observations that lack repository evidence.
- Convert accepted findings into persistent GitHub Issues.
- Maintain traceability between finding, issue, branch, commit, pull request, validation, and release decision.
- Automate narrow, low-risk analysis and remediation.
- Preserve ReplyCators architecture and repository governance.
- Ensure every eligible finding receives an explicit outcome.

## In scope

- Read-only repository audits.
- Finding normalization and schema validation.
- Duplicate and recurrence detection.
- GitHub Issue creation and reconciliation.
- Severity and risk-based prioritization.
- Eligibility analysis.
- Narrow bug fixes and documentation corrections.
- Targeted validation and regression verification.
- Root-to-`dist/` synchronization checks.
- Version, changelog, and documentation alignment.
- Release-readiness reporting.

## Out of scope without escalation

- Secret or credential-system changes.
- Major architecture replacement.
- Production infrastructure redesign.
- Large module deletion.
- Plugin ID changes.
- Removal or incompatible migration of production storage keys.
- Material extension permission changes.
- Legal or licensing decisions.
- Direct bypass of branch protection or CODEOWNERS.
- Automatic certification of browser behavior that has not been tested.

## ReplyCators invariants

Every OpenAI or Codex task must preserve these repository rules:

1. Root files are the active extension runtime.
2. `dist/` is the tracked runtime mirror.
3. `dashboard.js` remains the platform orchestrator.
4. Plugin behavior remains in `plugins/*.js`.
5. `chrome.storage.local` remains the primary extension persistence layer.
6. Plugin IDs and storage keys remain stable unless the formal breaking-change process is followed.
7. Popup and Side Panel share the same implementation.
8. Runtime tooling follows the Runtime-First Policy outside ephemeral CI.
9. Version, changelog, documentation, and `AGENTS.md` requirements remain binding.
10. No directory beginning with `__` may be introduced.

## Sources of truth

| Concern | Authority |
|---|---|
| Repository policy | `AGENTS.md` |
| Governance prompts | `docs/PROMPT-CATALOG.md` |
| Durable governance work | GitHub Issues |
| Code change control | GitHub pull requests and required checks |
| Lifecycle state | GitHub labels |
| Execution evidence | GitHub Actions summaries and artifacts |
| Runtime behavior | Root-level ReplyCators files |
| Release history | `CHANGELOG.md` |

Model output is never a source of truth by itself. It must be reconciled with repository evidence and deterministic safeguards.

## Success criteria

The integration succeeds when:

- Accepted findings contain concrete evidence and testable acceptance criteria.
- Repeated audits do not create duplicate issues.
- Resolved issues reopen only when current evidence proves recurrence.
- Ineligible work cannot reach implementation automatically.
- Validation failures return work to implementation or escalation.
- Manual QA requirements remain visible and blocking where appropriate.
- Every finding reaches a recorded terminal or escalation outcome.

