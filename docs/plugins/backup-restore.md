# Backup and Restore - Plugin Documentation

## Sections
- Overview
- Architecture
- Export Format
- Data Classification
- Sanitization
- Import Validation
- Restore Strategies
- Transaction Safety
- Plugin Contract
- Compatibility

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.backup-restore` |
| Version | 1.0.0 |
| Category | Platform utility |
| Storage | None (this plugin does not persist state) |

Platform-wide backup and restore. Export all settings and supported data to a versioned JSON file; restore on another computer or after reinstalling.

---

## Architecture

Uses an explicit plugin participation registry (`BR_PLUGIN_REGISTRY`). Every plugin that participates declares:
- Which keys are exportable by default / optional / never exported
- Which fields are sensitive and how to sanitize them
- A schema version, migration function, validation function, and restore strategy

The platform orchestrates export and import. Plugin data is always written only to keys declared in the registry entry.

---

## Export Format

```json
{
  "_format": "replycators-backup",
  "_formatVersion": 1,
  "_rcVersion": "1.28.0",
  "_exportedAt": "2025-01-01T00:00:00.000Z",
  "_exportMode": "full",
  "_sanitized": false,
  "_includesOptional": false,
  "_selectedPluginIds": null,
  "_schemaVersions": { "platform": 1, ... },
  "sections": {
    "platform": { "rc:session:app-settings": { ... }, ... },
    "com.replycators.salesforce-extractor": { ... }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `_format` | string | Must be `"replycators-backup"` |
| `_formatVersion` | number | Integer; current: 1 |
| `_exportMode` | string | `"full"` or `"selected"` |
| `_sanitized` | boolean | Whether sanitization was applied |
| `_includesOptional` | boolean | Whether optional data was included |
| `_selectedPluginIds` | array|null | Plugin IDs selected (null = all) |

---

## Data Classification

### Exported by default
| Data | Storage key |
|------|-------------|
| Platform settings | `rc:session:app-settings` |
| Plugin enabled/disabled | `rc:session:plugin-states` |
| Dashboard order | `rc:session:dashboard-order` |
| Salesforce prompt library | `rc:plugin:com.replycators.salesforce-extractor:prompts` |
| Salesforce settings | `rc:session:sf-settings` |
| Workspace profiles | `rc:plugin:com.replycators.workspace-starter:data` |
| Documentation Finder favorites | `rc:plugin:com.replycators.apptio-docs-finder:favorites` |
| Documentation Finder settings | `rc:plugin:com.replycators.apptio-docs-finder:settings` |
| Documentation Finder sources | `rc:plugin:com.replycators.apptio-docs-finder:sources` |
| Documentation Finder quick links | `rc:plugin:com.replycators.apptio-docs-finder:quick-links` |
| Bookmark Finder preferences | `rc:plugin:com.replycators.edge-bookmark-finder:prefs` |
| Snake high score | `rc:plugin:com.replycators.snake:state` |
| Apptio Planning last calculation | `rc:plugin:com.replycators.apptio-planning-upgrade-calculator:last-calc` |

### Optional (included when "Include optional data" is checked)
| Data | Storage key |
|------|-------------|
| Salesforce selected prompt | `rc:plugin:com.replycators.salesforce-extractor:selected-prompt` |
| Salesforce context file | `rc:plugin:com.replycators.salesforce-extractor:context-file` |
| Salesforce additional instructions | `rc:plugin:com.replycators.salesforce-extractor:additional-instructions` |
| Documentation Finder recent searches | `rc:plugin:com.replycators.apptio-docs-finder:recent-searches` |
| Documentation Finder recently opened | `rc:plugin:com.replycators.apptio-docs-finder:recently-opened` |

### Never exported
| Data | Reason |
|------|--------|
| Last extracted Salesforce case | Customer case data |
| Cloudability OrgID cache | Account-specific identifier |
| Bookmark scan cache | Regenerable |
| Activity log | Transient session data |
| Notification history | Transient session data |
| Download history | Device-specific paths |
| Apptio Planning schedule cache | Regenerable external data |
| Documentation Finder diagnostics | Operational metadata |

---

## Sanitization

When "Sanitize before export" is enabled:

| Field | Redaction |
|-------|-----------|
| `sf-settings.bobWorkingDir` | Replaced with empty string |
| `sf:context-file` | Replaced with empty string |
| `sf:additional-instructions` | Replaced with empty string |
| Workspace Starter profile URLs | Path/query replaced with `[REDACTED]`; scheme + host retained |
| Documentation Finder recent queries | Replaced with `[REDACTED]` |
| Documentation Finder recently-opened labels | Replaced with `[REDACTED]` |

Note: Cannot guarantee removal of sensitive information from prompt body text or custom data outside the sanitization contract.

---

## Import Validation

Every imported file is treated as untrusted. Validation checks:
1. File size <= 10 MB
2. Valid JSON syntax
3. Root is an object
4. JSON nesting depth <= 30
5. No forbidden keys (`__proto__`, `constructor`, `prototype`)
6. `_format` matches `"replycators-backup"`
7. `_formatVersion` is a number, not greater than current format version
8. All required top-level fields present with correct types
9. `_exportedAt` is valid ISO 8601
10. `_exportMode` is `"full"` or `"selected"`
11. No duplicate section keys
12. All storage keys in allowed namespaces (`rc:session:*`, `rc:plugin:*`, `rc:platform:*`)
13. All storage keys declared in plugin registry entries
14. Per-plugin field validation (types, value ranges, schema correctness)

---

## Restore Strategies

| Strategy | Behavior |
|----------|---------|
| Replace | All keys in the import overwrite existing values |
| Keep existing on conflict | Keys already in storage are skipped; only missing keys are written |

---

## Transaction Safety

Import sequence:
1. Build write plan (validate all keys, run migrations, filter to declared keys)
2. Capture rollback snapshot for all affected keys
3. Write to storage
4. Read-back verification (every written key must be present)
5. Notify platform

If any step fails, rollback snapshot is restored. If rollback also fails, a critical error notification is shown.

---

## Plugin Contract

Add an entry to `BR_PLUGIN_REGISTRY` in `plugins/backup-restore.js`:

```js
{
  pluginId:        'com.replycators.my-plugin',
  displayName:     'My Plugin',
  exportable:      ['rc:plugin:com.replycators.my-plugin:user-data'],
  optional:        ['rc:plugin:com.replycators.my-plugin:history'],
  neverExport:     ['rc:plugin:com.replycators.my-plugin:cache'],
  schemaVersion:   1,
  sensitiveFields: ['rc:plugin:com.replycators.my-plugin:user-data.customerField'],
  validate(data) {
    const errors = [];
    return { ok: errors.length === 0, errors };
  },
  migrate(data, fromVersion) { return data; },
  sanitize(data) {
    const copy = _deepClone(data);
    // redact sensitive fields
    return copy;
  },
  restoreStrategy: 'replace',
  requiresReload: false,
}
```

---

## Compatibility

- Format version 1 is the current and only supported version.
- `_formatVersion > 1` is rejected with a clear error.
- Older schema versions trigger the `migrate()` function.
- Unknown sections are warned about and skipped - never written to storage.
