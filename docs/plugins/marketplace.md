# Marketplace - Plugin Documentation

## Sections
- Overview
- Current State
- Planned Plugins
- Public API
- Ownership Boundaries

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.marketplace` |
| Version | 1.0.0 |
| Category | Platform |
| Status | Active (preview only) |

Displays planned future plugins as preview cards. Provides a visual roadmap of the plugin ecosystem.

---

## Current State

Marketplace is under active development. Plugins shown are **planned features**, not currently installable. A "Coming Soon" banner is rendered above plugin cards. Full plugin distribution, installation, and update infrastructure is planned for a future release.

---

## Planned Plugins

| Plugin | Category | Description |
|--------|----------|-------------|
| ServiceNow | ITSM | Extract and manage ServiceNow incidents |
| Jira | Project Management | View and interact with Jira issues |
| Confluence | Productivity | Search and embed Confluence pages |
| Microsoft 365 | Productivity | Teams, Outlook, SharePoint integration |
| Azure DevOps | Developer Tools | Work items, pipelines, and repos |
| Power BI | Analytics | Embed and interact with Power BI reports |
| Zendesk | ITSM | Manage support tickets |
| AI Assistant | AI | WatsonX, OpenAI, or Azure AI integration |
| SAP | Enterprise | SAP transaction helper |
| Workday | Enterprise | HR and financial data |

---

## Public API

```js
window.ReplyCatorsPlugins.Marketplace = {
  render,  // called on navigate; renders Coming Soon banner and plugin cards
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Marketplace card rendering | Plugin |
| Coming Soon banner | Plugin |
| Planned plugin data | `MARKETPLACE_PLUGINS` array in `dashboard.js` |
