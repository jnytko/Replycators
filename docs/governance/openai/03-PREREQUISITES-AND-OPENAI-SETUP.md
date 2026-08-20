# Prerequisites and OpenAI Setup

## Prerequisites

Before implementation, confirm:

- The repository is hosted on GitHub.
- GitHub Actions is enabled.
- Branch protection and CODEOWNERS expectations are understood.
- An OpenAI API project is available.
- The person configuring secrets has repository administration access.
- `AGENTS.md` and `docs/PROMPT-CATALOG.md` are current.
- Existing CI, release-readiness workflow, governance scripts, and label schema are treated as the implementation baseline.

## Step 1: Choose the first operating mode

Start in read-only audit mode.

The first workflow may:

- Check out the repository.
- Read repository files.
- Call the OpenAI Responses API.
- Validate structured findings.
- Upload artifacts.

It must not:

- Create or edit issues.
- Create branches.
- Modify files.
- Open or merge pull requests.

## Step 2: Create an OpenAI API project

Create a dedicated OpenAI API project for repository governance. Do not reuse a personal experimental key if the workflow will become a shared repository control.

Record the project owner, purpose, and expected workflows in the team password or secret-management system. Do not record the key itself in repository documentation.

## Step 3: Create the API key

Create a key dedicated to ReplyCators governance.

The key should be:

- Stored only in GitHub Actions secrets or an approved secret store.
- Rotatable without code changes.
- Separate from development or unrelated production keys.
- Subject to project-level usage monitoring.

## Step 4: Add GitHub secrets

In the GitHub repository:

1. Open **Settings**.
2. Open **Secrets and variables**.
3. Open **Actions**.
4. Create `OPENAI_API_KEY`.
5. If background webhooks will be used later, create `OPENAI_WEBHOOK_SECRET`.

Do not add OpenAI keys to repository variables. Use encrypted secrets.

## Step 5: Select the model policy

Use a configurable model name rather than hard-coding different models across scripts.

Recommended configuration fields:

```json
{
  "audit_model": "gpt-5.6-terra",
  "high_risk_review_model": "gpt-5.6-sol",
  "normalization_model": "gpt-5.6-luna",
  "reasoning_effort": "medium"
}
```

Treat these values as initial evaluation settings. Confirm current availability in official OpenAI documentation before activation.

## Step 6: Establish budget controls

Define:

- Maximum OpenAI calls per run.
- Maximum findings per stage.
- Maximum audit frequency.
- Maximum input size.
- Maximum output tokens.
- Maximum concurrent remediation tasks.
- Monthly usage alert threshold.

Cost control should be implemented in the controller, not left to prompt wording alone.

## Step 7: Define the repository context package

Do not send the entire repository by default. Construct stage-specific context.

Every audit should receive:

- The applicable `AGENTS.md` sections.
- The selected prompt from `docs/PROMPT-CATALOG.md`.
- Repository file inventory.
- Relevant source files.
- Relevant architecture documentation.
- The evaluated commit SHA.
- Prior matching findings when checking recurrence.

Exclude:

- Secrets.
- Generated archives.
- Binary assets unless required.
- Unrelated source files.
- Local-only workspace state.

## Step 8: Define GitHub permissions

The first workflow should use:

```yaml
permissions:
  contents: read
```

Add `issues: write` only when issue reconciliation is deliberately enabled.

## Step 9: Prepare local review

Before enabling a schedule:

1. Run the workflow manually.
2. Download the artifact.
3. Validate every finding against the repository.
4. Record false positives.
5. Adjust prompt and evidence requirements.
6. Repeat for at least three representative runs.

## Step 10: Approve progression criteria

Do not proceed to automatic issue creation until:

- Structured output succeeds reliably.
- Evidence paths resolve.
- Duplicate findings are stable across runs.
- Unsupported findings are rejected.
- Costs are within the intended budget.
- No sensitive data appears in prompts or artifacts.
