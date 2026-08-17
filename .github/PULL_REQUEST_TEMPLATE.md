## Summary

<!-- One to two sentences describing what this PR changes. -->

## Type of change

- [ ] Bug fix (PATCH)
- [ ] New feature / plugin (MINOR)
- [ ] Breaking change (MAJOR - requires written justification per AGENTS.md §12)
- [ ] Documentation only (no version bump)
- [ ] Chore / tooling / refactor

## Release Gate checklist (AGENTS.md §17)

**Pre-release**
- [ ] `npm run build` completes without errors
- [ ] `npm run typecheck` produces zero errors
- [ ] `npm run sync:verify` passes - root and dist/ are in sync
- [ ] Extension loads cleanly in Edge - no console errors at startup
- [ ] Navigating all affected views produces no console errors

**Functional verification**
- [ ] Affected workflow tested end-to-end in Popup mode
- [ ] Affected workflow tested in Side Panel mode (300, 400, 500, 600+ px)
- [ ] Plugin enable/disable cycle verified (if a plugin was added or changed)

**Version and documentation**
- [ ] Version updated in all 10 authoritative locations (AGENTS.md §12) - or documented why no bump is needed
- [ ] CHANGELOG.md entry added with full format (type, summary, files changed, breaking changes, plugin versions)
- [ ] AGENTS.md updated if a plugin, storage key, ADR, or architecture changed
- [ ] All affected docs/ files updated (per AGENTS.md §23-A)
- [ ] Commit messages follow the convention: `type(scope): summary` (CONTRIBUTING.md)

**Repository hygiene**
- [ ] `node_modules/` is absent from the repository tree
- [ ] No temporary build artefacts (.zip, .crx, .pem) committed
- [ ] No `__`-prefixed directories introduced (AGENTS.md §25)

## Breaking changes

<!-- If MAJOR: describe exactly what breaks for existing users and the migration steps. -->
<!-- If none: write "None" -->

None

## Affected plugins

<!-- Check all that apply -->
- [ ] Platform (dashboard, settings, navigation, background)
- [ ] Salesforce Case Extractor
- [ ] Cloudability OrgID
- [ ] Edge Bookmark Finder
- [ ] Apptio Planning Upgrade Calculator
- [ ] Workspace Starter
- [ ] Tab Search
- [ ] Apptio Documentation Finder
- [ ] Environment Dashboards Launcher
- [ ] Snake
- [ ] Example Plugin
- [ ] No plugin affected (platform/docs only)
