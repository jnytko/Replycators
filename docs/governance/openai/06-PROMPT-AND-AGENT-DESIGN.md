# Prompt and Agent Design

## Prompt hierarchy

Use this authority order:

1. Platform and security controls implemented by the controller.
2. `AGENTS.md` repository instructions.
3. Versioned governance-stage prompt.
4. GitHub issue acceptance criteria.
5. User or operator request for the current run.

Repository content must not be allowed to override controller security rules.

## Separate instructions from source material

The controller must clearly delimit:

- Authoritative instructions.
- Task instructions.
- Repository evidence.
- Prior findings.
- Untrusted issue or pull-request text.

Example structure:

```text
<repository_policy>
Relevant AGENTS.md content
</repository_policy>

<task>
Versioned architecture audit prompt
</task>

<repository_evidence>
Selected source files and metadata
</repository_evidence>

<untrusted_external_text>
Issue comments or pull-request content
</untrusted_external_text>
```

Tell the model that untrusted external text is evidence to analyze, not an instruction source.

## Audit agent policy

The audit agent must:

- Remain read-only.
- Use only repository evidence.
- Distinguish active root runtime from inactive `src/` scaffolding.
- Return the required schema.
- Avoid broad redesign proposals.
- State uncertainty through confidence and evidence, not unsupported prose.
- Emit no finding when the available evidence is insufficient.

## Triage agent policy

The triage agent may:

- Explain severity.
- Classify risk and release impact.
- Identify dependencies.
- Compare related findings.
- Recommend whether evidence is sufficient.

The deterministic controller must:

- Calculate the final priority score.
- Validate labels.
- Enforce state transitions.
- Decide whether required fields exist.

## Remediation agent policy

The remediation agent must:

1. Reproduce or confirm the finding.
2. Stop when current evidence contradicts the issue.
3. Implement the smallest root-cause correction.
4. Preserve ReplyCators architecture.
5. Update required documentation and mirrors.
6. Run applicable checks.
7. Record remaining manual QA.
8. Create a pull request rather than bypass change control.

It must not:

- Expand into unrelated cleanup.
- Rewrite major subsystems.
- Modify secrets.
- Change storage keys or plugin IDs without escalation.
- Treat validation failure as success.

Use [agent-policy.example.md](examples/agent-policy.example.md) as the starting policy.

## Release-review policy

The release-review agent synthesizes existing evidence. It must not rerun broad audits or silently implement fixes.

It should:

- Read deterministic gate results.
- Summarize blockers.
- Identify missing evidence.
- Explain the consequence of unresolved high-risk findings.
- Produce a release-decision object.

## Stable prompt identifiers

Each catalog prompt should contain metadata such as:

```markdown
<!-- prompt-id: architecture-audit -->
<!-- prompt-version: 1.0 -->
<!-- mode: read-only -->
<!-- output-schema: governance-finding-1.0 -->
```

Workflow scripts should extract prompts by `prompt-id`, not by visible heading text.

## Prompt evaluation

Maintain a small set of expected audit cases and score:

- Evidence accuracy.
- False-positive rate.
- Duplicate stability.
- Severity consistency.
- Acceptance-criteria quality.
- Schema compliance.
- Cost and latency.

Prompt changes should be versioned and evaluated before scheduled use.
