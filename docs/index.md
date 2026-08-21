# ReplyCators - Documentation Index

This page provides a navigable index of all engineering documentation for the ReplyCators project.

---

## Getting Started

| Document | Description |
|----------|-------------|
| [INSTALLATION.md](INSTALLATION.md) | Prerequisites, quick start, clean-machine setup, Bob Execute feature |
| [WORKING_DIRECTORY.md](WORKING_DIRECTORY.md) | Source of truth policy, root vs `dist/`, sync workflow |

---

## Architecture and Design

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full architecture reference: layer stack, component descriptions, plugin lifecycle, event flow, storage schema |
| [STARTUP-FLOW.md](STARTUP-FLOW.md) | Full boot sequence, plugin load order, service worker lifecycle |
| [STORAGE.md](STORAGE.md) | Complete storage schema: all keys, namespaces, data shapes |
| [SETTINGS.md](SETTINGS.md) | All platform settings, options, and defaults |
| [THEMES.md](THEMES.md) | Theme system, 12 built-in themes, CSS custom properties, adding new themes |
| [FONT-STRATEGY.md](FONT-STRATEGY.md) | Font availability audit, fallback behavior, strategy decision |
| [ICON-SYSTEM.md](ICON-SYSTEM.md) | Icon system reference: two-tier policy, registry, renderer |
| [ADR-008-plugin-module-architecture.md](ADR-008-plugin-module-architecture.md) | Architecture Decision Record for plugin modularization |
| [STORAGE-MIGRATION-ROADMAP.md](STORAGE-MIGRATION-ROADMAP.md) | Storage namespace migration plan for future MAJOR release |
| [adr/ADR-TEMPLATE.md](adr/ADR-TEMPLATE.md) | Lightweight ADR template - copy to create a new Architecture Decision Record |
| [adr/ADR-009-prompt-catalog.md](adr/ADR-009-prompt-catalog.md) | ADR-009: Decision to introduce the AI Prompt Governance Catalog |

---

## Plugin Development

| Document | Description |
|----------|-------------|
| [AI-PLUGIN-KIT.md](AI-PLUGIN-KIT.md) | **Primary guide for AI agents.** Create, migrate, or maintain plugins. Covers all workflows. |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Step-by-step plugin authoring guide for human developers |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution workflow, change guide, versioning, commit format |
| [CONTRIBUTOR-ONBOARDING.md](CONTRIBUTOR-ONBOARDING.md) | **Human contributor onboarding guide.** First-week checklist, GitHub workflow, AI development expectations, Definition of Done |
| [PROMPT-CATALOG.md](PROMPT-CATALOG.md) | AI prompt governance catalog - versioned, reviewed prompts for common development workflows |
| [../PLUGIN-SDK.md](../PLUGIN-SDK.md) | Plugin SDK standards: page structure, lifecycle, storage, logging, notifications |

---

## Operations

| Document | Description |
|----------|-------------|
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and fixes for all plugins and the platform |
| [PACKAGING.md](PACKAGING.md) | Packaging, distribution, and pre-release versioning checklist |
| [BOB-HELPER-SERVER.md](BOB-HELPER-SERVER.md) | Technical reference for `tools/bob-helper-server.js` |
| [governance/openai/README.md](governance/openai/README.md) | Start here for the OpenAI and Codex continuous repository governance implementation kit |

---

## Plugin Documentation

| Plugin | Document |
|--------|----------|
| Salesforce Case Extractor | [plugins/salesforce-case-extractor.md](plugins/salesforce-case-extractor.md) |
| Cloudability OrgID | [plugins/cloudability-orgid.md](plugins/cloudability-orgid.md) |
| Edge Bookmark Finder | [plugins/bookmark-finder.md](plugins/bookmark-finder.md) |
| Apptio Planning Upgrade Calculator | [plugins/apptio-upgrade-calculator.md](plugins/apptio-upgrade-calculator.md) |
| Workspace Starter | [plugins/workspace-starter.md](plugins/workspace-starter.md) |
| Tab Search | [plugins/tab-search.md](plugins/tab-search.md) |
| Snake | [plugins/snake.md](plugins/snake.md) |
| Apptio Documentation Finder | [plugins/apptio-docs-finder.md](plugins/apptio-docs-finder.md) |
| Backup & Restore | [plugins/backup-restore.md](plugins/backup-restore.md) |
| Marketplace | [plugins/marketplace.md](plugins/marketplace.md) |

> **Note:** Backup & Restore and Marketplace are **platform features**, not user-installable plugins registered in `PLUGINS[]`. They are listed here for documentation discoverability. Their implementations live in `plugins/backup-restore.js` and `plugins/marketplace.js` respectively.

---

## Archive and History

| Document | Description |
|----------|-------------|
| [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md) | Full verbose changelog entries older than ~90 days |
| [TECH-DEBT-RESOLVED.md](TECH-DEBT-RESOLVED.md) | Archive of all 18 resolved technical debt items (TD-001 to TD-018) |

---

## Repository Governance

| Document | Description |
|----------|-------------|
| [../AGENTS.md](../AGENTS.md) | **Authoritative agent and contributor briefing.** Read this first. |
| [../CHANGELOG.md](../CHANGELOG.md) | Full release history |
| [../PLUGIN-SDK.md](../PLUGIN-SDK.md) | Plugin SDK standards |
| [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) | Third-party software notices |
| [../ICON-LICENSE.md](../ICON-LICENSE.md) | Icon license and attribution |
| [reports/engineering-assessment-2026-01.md](reports/engineering-assessment-2026-01.md) | Engineering organization assessment: maturity score, RACI, architecture overview, governance artifacts, scaling readiness |
