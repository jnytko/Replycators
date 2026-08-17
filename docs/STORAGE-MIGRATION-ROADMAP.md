# Storage Namespace Migration Roadmap

## Sections

- Status
- Current State Audit
- Impact Assessment
- Migration Plan
- Migration Template

---

## Status

**Created:** v1.11.0 (TD-006)
**Status:** Deferred - migration roadmap only. No changes made.
**Action required:** None until a MAJOR release is justified for other reasons.

---

## Current State Audit

All runtime state uses `chrome.storage.local` with `rc:session:*` prefix. Several keys are misclassified - they contain persistent configuration, not session data.

| Key | Actual lifecycle | Correct namespace |
|-----|-----------------|-------------------|
| `rc:session:logs` | Transient - activity history | `rc:session:*` correct |
| `rc:session:notifications` | Transient - ring buffer | `rc:session:*` correct |
| `rc:session:sf-last-result` | Transient - last extraction | `rc:session:*` correct |
| `rc:session:nav-view` | Transient - last view | `rc:session:*` correct |
| `rc:session:app-settings` | **Persistent config** - all platform prefs | Should be `rc:config:*` |
| `rc:session:plugin-states` | **Persistent config** - enabled/disabled | Should be `rc:config:*` |
| `rc:session:dashboard-order` | **Persistent config** - widget order | Should be `rc:config:*` |
| `rc:session:sf-settings` | **Persistent config** - SF output prefs | Should be `rc:config:*` |

---

## Impact Assessment

**This is a naming/documentation issue only - not a functional defect.** All data is stored and read correctly.

**Risk:** HIGH
- Renaming any key causes all users to lose that data on first open after upgrade.
- Each key rename = read old + write new + delete old (3 storage operations per key, 12 total).
- Partial failure leaves users with corrupted state.

**Benefit:** LOW (developer clarity only - no user-facing changes)

**Decision:** Defer to a future MAJOR release. Do not migrate in v1.x.

---

## Migration Plan

Bundle this migration with a MAJOR release justified by other breaking changes.

### Phase 1 - Dual-write (transition release)
1. On startup: read both old and new keys.
2. If old key exists and new key absent: copy data to new key, keep old key.
3. Write all updates to new key only.

### Phase 2 - Remove old keys (one release later)
1. Read old key one final time.
2. Migrate if old exists and new absent.
3. Delete old key unconditionally.

### Keys to migrate

| Old key | New key |
|---------|---------|
| `rc:session:app-settings` | `rc:config:app-settings` |
| `rc:session:plugin-states` | `rc:config:plugin-states` |
| `rc:session:dashboard-order` | `rc:config:dashboard-order` |
| `rc:session:sf-settings` | `rc:config:sf-settings` |

### MAJOR release changelog requirements
1. Written justification in `CHANGELOG.md` under `**Breaking changes:**`.
2. Migration instructions for users.
3. Rollback procedure.
4. All 5 items from the Major Version Approval Rule (AGENTS.md §12).

---

## Migration Template

```js
async function migrateSessionToConfig(oldKey, newKey) {
  return new Promise(resolve => {
    chrome.storage.local.get([oldKey, newKey], data => {
      const oldData = data[oldKey];
      const newData = data[newKey];
      if (oldData !== undefined && newData === undefined) {
        chrome.storage.local.set({ [newKey]: oldData }, () => {
          chrome.storage.local.remove(oldKey, resolve);
        });
      } else {
        resolve();
      }
    });
  });
}
```
