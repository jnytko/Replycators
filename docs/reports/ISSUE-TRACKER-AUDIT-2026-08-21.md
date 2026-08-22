# Issue Tracker Audit - 2026-08-21

Repository: `jnytko/Replycators`  
Code baseline: `d6939ad` (`main`)  
Scope: all 61 GitHub issues visible on 2026-08-21 (32 open, 29 closed)  
Method: issue bodies, labels, milestones, comments, closure notes, and the active root runtime were reviewed. No GitHub records were changed.

## Taxonomy and milestone recommendation

Use one label from each applicable family: type (`bug`, `enhancement`, `documentation`, `maintenance`), severity (`severity:critical|high|medium|low`), component (`component:<name>`), and workflow (`state:needs-info|validated|duplicate|invalid|resolved`). Priority remains a project field (`P0`-`P3`), not a label. Create a `1.47.x Maintenance` milestone for contained fixes and a `1.48.0 Architecture` milestone for new contracts or managed-policy work.

## Executive disposition

| Disposition | Count | Action |
|---|---:|---|
| Valid | 45 | Retain; 16 are already resolved and 29 remain actionable. |
| Needs Info | 2 | Do not schedule until evidence or product decisions are supplied. |
| Duplicate | 7 | Keep closed and link only to the canonical issue. |
| Invalid | 7 | Keep closed, except convert #59 from an issue into governance documentation/project state. |

---

## #1 / [PERF] Extend and standardize plugin state caching strategy

- **Issue Reference:** [#1 / [PERF] Extend and standardize plugin state caching strategy](https://github.com/jnytko/Replycators/issues/1)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - the cited `settingsManager.getAll()` path belongs to inactive Phase 2 scaffolding and has no active-runtime caller.
- **Refined Title:** `[Phase 2]: Reassess settings caching when the SDK gains active consumers`
- **Updated Specification:**
  - **Summary:** Do not add caching to an unused settings path. Reopen only when Phase 2 activates it and a measured read pattern warrants a cache.
  - **Steps / Expected Behavior:** Identify an active caller, capture storage-read frequency and latency, then define invalidation on writes and `chrome.storage.onChanged`.
  - **Actual Result:** No active consumer exists; the proposed cache would add stale-state risk without benefit.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:phase-2-sdk`, `state:invalid`; **Priority:** P3; **Milestone / Component:** Backlog / Phase 2 SDK.

## #2 / [PERF] Cache DOM queries in settings panel initialization

- **Issue Reference:** [#2 / [PERF] Cache DOM queries in settings panel initialization](https://github.com/jnytko/Replycators/issues/2)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - roughly 25 ID lookups occur only during settings synchronization and no performance trace demonstrates user-visible delay.
- **Refined Title:** `[Settings]: Profile synchronization before caching DOM references`
- **Updated Specification:**
  - **Summary:** Preserve direct lookups unless profiling identifies a material settings-render bottleneck.
  - **Steps / Expected Behavior:** Provide repeatable timings and define a cache lifetime safe across rerenders.
  - **Actual Result:** The proposal is speculative and could retain stale elements.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:settings`, `state:invalid`; **Priority:** P3; **Milestone / Component:** None / Settings.

## #3 / [PERF] Optimize EventBus filtering and subscription overhead

- **Issue Reference:** [#3 / [PERF] Optimize EventBus filtering and subscription overhead](https://github.com/jnytko/Replycators/issues/3)
- **Issue Type:** Maintenance
- **Validation Assessment:** Duplicate - identical to canonical #12.
- **Refined Title:** `[Duplicate]: Track EventBus allocation analysis in #12`
- **Updated Specification:** **Summary:** No independent work. **Steps / Expected:** Preserve any evidence on #12. **Actual Result:** Duplicate reporting would split one code path.
- **Recommended Metadata:** **Labels:** `duplicate`, `maintenance`, `component:event-bus`, `state:duplicate`; **Priority:** P3; **Milestone / Component:** None / Phase 2 EventBus.

## #4 / [PERF] Fix unbounded notification history memory growth

- **Issue Reference:** [#4 / [PERF] Fix unbounded notification history memory growth](https://github.com/jnytko/Replycators/issues/4)
- **Issue Type:** Maintenance
- **Validation Assessment:** Duplicate - identical to #9, whose premise is invalid.
- **Refined Title:** `[Duplicate]: Track notification-history cap analysis in #9`
- **Updated Specification:** **Summary:** No independent work. **Steps / Expected:** Refer to #9's bounded-array analysis. **Actual Result:** The array is capped immediately at 200 entries.
- **Recommended Metadata:** **Labels:** `duplicate`, `maintenance`, `component:notifications`, `state:duplicate`; **Priority:** P3; **Milestone / Component:** None / Notifications.

## #5 / [MAINT][P4] Centralize Bob Helper fetch timeout handling

- **Issue Reference:** [#5 / [MAINT][P4] Centralize Bob Helper fetch timeout handling](https://github.com/jnytko/Replycators/issues/5)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - implemented in v1.46.1 with shared timeout handling and endpoint-specific bounds.
- **Refined Title:** `[Bob Helper]: Centralize bounded fetch handling`
- **Updated Specification:** **Summary:** Use one helper for Bob HTTP timeouts. **Steps / Expected:** All four message handlers clear timers and preserve their timeout/error semantics. **Actual Result:** Resolved and verified; retain as release history.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:bob-helper`, `state:resolved`; **Priority:** P3; **Milestone / Component:** Released v1.46.1 / Bob Helper.

## #6 / [BUG][P2] Resolve active customer context from the focused browser window

- **Issue Reference:** [#6 / [BUG][P2] Resolve active customer context from the focused browser window](https://github.com/jnytko/Replycators/issues/6)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - cross-window selection could use the wrong customer context; PR #57 resolved all identified paths.
- **Refined Title:** `[Customer Context]: Restrict active-tab resolution to the focused window`
- **Updated Specification:** **Summary:** Resolve Cloudability and environment context only from the focused window. **Steps / Expected:** With two windows, actions use the active tab in the focused one. **Actual Result:** Resolved in v1.46.2.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:browser-context`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.46.2 / Browser context.

## #7 / [PERF] Profile and optimize regex in high-frequency tab events

- **Issue Reference:** [#7 / [PERF] Profile and optimize regex in high-frequency tab events](https://github.com/jnytko/Replycators/issues/7)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - the regex is compiled once and no profile identifies it as material.
- **Refined Title:** `[Tab Events]: Profile URL matching before changing validation`
- **Updated Specification:** **Summary:** Retain exact hostname validation. **Steps / Expected:** Reopen only with a trace showing meaningful regex cost. **Actual Result:** Current single tests are not a validated bottleneck.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:tab-detection`, `state:invalid`; **Priority:** P3; **Milestone / Component:** None / Tab detection.

## #8 / [PERF] Migrate download tracking from callbacks to async/await

- **Issue Reference:** [#8 / [PERF] Migrate download tracking from callbacks to async/await](https://github.com/jnytko/Replycators/issues/8)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - syntax style alone does not establish a race, failure, or measurable improvement.
- **Refined Title:** `[Downloads]: Refactor callback state only with a verified defect`
- **Updated Specification:** **Summary:** Avoid a standalone style rewrite. **Steps / Expected:** Supply a reproducible state-tracking failure before changing the flow. **Actual Result:** Existing callback behavior has no reported correctness defect.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:downloads`, `state:invalid`; **Priority:** P3; **Milestone / Component:** None / Downloads.

## #9 / [PERF] Fix unbounded notification history memory growth

- **Issue Reference:** [#9 / [PERF] Fix unbounded notification history memory growth](https://github.com/jnytko/Replycators/issues/9)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - push followed by immediate shift bounds the array at 200 entries.
- **Refined Title:** `[Notifications]: Profile bounded history eviction before replacing it`
- **Updated Specification:** **Summary:** No memory leak exists. **Steps / Expected:** Reopen only if a profile shows 200-entry `shift()` cost matters. **Actual Result:** History is strictly bounded.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:notifications`, `state:invalid`; **Priority:** P3; **Milestone / Component:** None / Notifications.

## #10 / [PERF] Reduce unnecessary array allocations in hot event paths

- **Issue Reference:** [#10 / [PERF] Reduce unnecessary array allocations in hot event paths](https://github.com/jnytko/Replycators/issues/10)
- **Issue Type:** Maintenance
- **Validation Assessment:** Duplicate - same inactive EventBus allocation concern as #12.
- **Refined Title:** `[Duplicate]: Track EventBus allocations in #12`
- **Updated Specification:** **Summary:** Consolidate evidence under #12. **Steps / Expected:** No separate implementation. **Actual Result:** Same snapshot/filter path.
- **Recommended Metadata:** **Labels:** `duplicate`, `maintenance`, `component:event-bus`, `state:duplicate`; **Priority:** P3; **Milestone / Component:** None / Phase 2 EventBus.

## #11 / [PERF] Optimize chrome.storage.sync queries to avoid full-load

- **Issue Reference:** [#11 / [PERF] Optimize chrome.storage.sync queries to avoid full-load](https://github.com/jnytko/Replycators/issues/11)
- **Issue Type:** Maintenance
- **Validation Assessment:** Duplicate - same unused settings-manager path as #1.
- **Refined Title:** `[Duplicate]: Track Phase 2 settings reads in #1`
- **Updated Specification:** **Summary:** No separate work. **Steps / Expected:** Reassess when the SDK has callers. **Actual Result:** Active runtime does not execute the read.
- **Recommended Metadata:** **Labels:** `duplicate`, `maintenance`, `component:phase-2-sdk`, `state:duplicate`; **Priority:** P3; **Milestone / Component:** None / Phase 2 SDK.

## #12 / [PERF] Optimize EventBus filtering and subscription overhead

- **Issue Reference:** [#12 / [PERF] Optimize EventBus filtering and subscription overhead](https://github.com/jnytko/Replycators/issues/12)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - the active runtime has no subscribers or history consumers, and the zero-subscriber path allocates no snapshot.
- **Refined Title:** `[Phase 2]: Reassess EventBus indexing after activation`
- **Updated Specification:** **Summary:** Defer optimization until EventBus activation. **Steps / Expected:** Measure event volume, subscriber count, and history queries first. **Actual Result:** Current overhead is unreachable or bounded.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:event-bus`, `state:invalid`; **Priority:** P3; **Milestone / Component:** Backlog / Phase 2 EventBus.

## #13 / [BUG] Inconsistent Salesforce URL pattern between tab listeners and tab query functions

- **Issue Reference:** [#13 / [BUG] Inconsistent Salesforce URL pattern between tab listeners and tab query functions](https://github.com/jnytko/Replycators/issues/13)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - inconsistent host matching could create detection disagreement; resolved in v1.46.3.
- **Refined Title:** `[Salesforce]: Use one canonical hostname predicate for tab detection`
- **Updated Specification:** **Summary:** All Salesforce paths must share exact host-boundary validation. **Steps / Expected:** Equivalent URLs yield identical listener/query results. **Actual Result:** Resolved in commit `cd49f79`.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:salesforce`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.46.3 / Salesforce.

## #14 / [BOB-HELPER] Temp prompt files accumulate in working directory - add post-completion active cleanup

- **Issue Reference:** [#14 / [BOB-HELPER] Temp prompt files accumulate in working directory - add post-completion active cleanup](https://github.com/jnytko/Replycators/issues/14)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - temporary prompt/status artifacts accumulated and required bounded cleanup; implementation and manual QA are recorded.
- **Refined Title:** `[Bob Helper]: Remove temporary execution artifacts after completion`
- **Updated Specification:** **Summary:** Keep prompt/status lifecycle bounded without breaking late polling. **Steps / Expected:** Success, failure, timeout, and restart leave no working-directory artifacts. **Actual Result:** Resolved and QA verified.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:bob-helper`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.46.x / Bob Helper.

## #15 / [BOB-HELPER] Status file polling returns 404 after file deletion - add in-memory status cache

- **Issue Reference:** [#15 / [BOB-HELPER] Status file polling returns 404 after file deletion - add in-memory status cache](https://github.com/jnytko/Replycators/issues/15)
- **Issue Type:** Bug
- **Validation Assessment:** Duplicate - this is an acceptance case of #14's cleanup design.
- **Refined Title:** `[Duplicate]: Preserve late status polling under #14`
- **Updated Specification:** **Summary:** Keep bounded status retention in #14. **Steps / Expected:** Late polls return terminal status during the retention window. **Actual Result:** Separate implementation would risk non-atomic cleanup.
- **Recommended Metadata:** **Labels:** `duplicate`, `bug`, `component:bob-helper`, `state:duplicate`; **Priority:** P2; **Milestone / Component:** Released with #14 / Bob Helper.

## #16 / [BOB-HELPER] Named pipe IPC - eliminate temp files entirely (long-term architecture)

- **Issue Reference:** [#16 / [BOB-HELPER] Named pipe IPC - eliminate temp files entirely (long-term architecture)](https://github.com/jnytko/Replycators/issues/16)
- **Issue Type:** Feature Request
- **Validation Assessment:** Valid - feasible long-term architecture, but not justified after bounded cleanup and correctly closed as not planned.
- **Refined Title:** `[Bob Helper]: Evaluate named-pipe IPC after file-lifecycle stabilization`
- **Updated Specification:** **Summary:** Treat named pipes as an architectural option, not a current defect fix. **Steps / Expected:** Require an ADR, cross-version compatibility matrix, security model, and measured benefit. **Actual Result:** File cleanup removed the immediate driver.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:low`, `component:bob-helper`, `state:resolved`; **Priority:** P3; **Milestone / Component:** Future architecture / Bob Helper.

## #17 / [BACKUP] Post-import advisory toast when Bob Working Directory or API key was restored

- **Issue Reference:** [#17 / [BACKUP] Post-import advisory toast when Bob Working Directory or API key was restored](https://github.com/jnytko/Replycators/issues/17)
- **Issue Type:** Feature Request
- **Validation Assessment:** Valid - users needed an advisory tied to keys actually written; shipped in v1.46.5.
- **Refined Title:** `[Backup]: Notify users when restored Bob settings require review`
- **Updated Specification:** **Summary:** Report only sensitive Bob settings actually written. **Steps / Expected:** Merge/overwrite show accurate advice; keep-existing skips do not. **Actual Result:** Resolved with written-key identities.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:medium`, `component:backup-restore`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.46.5 / Backup & Restore.

## #18 / [BACKUP] bobApiKey exported in plaintext in full/unsanitized backups

- **Issue Reference:** [#18 / [BACKUP] bobApiKey exported in plaintext in full/unsanitized backups](https://github.com/jnytko/Replycators/issues/18)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - the composite Salesforce settings object made the key reachable despite dead field-level protection; fixed in v1.46.8.
- **Refined Title:** `[Backup Security]: Exclude Bob API keys from every export mode`
- **Updated Specification:** **Summary:** Credentials must never enter backup bytes. **Steps / Expected:** Search every export mode and nested settings object; key is absent while nonsecret settings remain. **Actual Result:** Resolved in commit `0d8686e`.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:backup-restore`, `component:security`, `state:resolved`; **Priority:** P1; **Milestone / Component:** Released v1.46.8 / Backup Security.

## #19 / [BACKUP] 'What is included' table missing API key row - misleads users about backup contents

- **Issue Reference:** [#19 / [BACKUP] 'What is included' table missing API key row - misleads users about backup contents](https://github.com/jnytko/Replycators/issues/19)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - UI disclosure did not match credential handling; resolved with #18 in v1.46.8.
- **Refined Title:** `[Backup Documentation]: State that Bob API keys are never exported`
- **Updated Specification:** **Summary:** Backup UI must explicitly list credential exclusion. **Steps / Expected:** Included-data table and sanitization help agree with actual bytes. **Actual Result:** Resolved in v1.46.8.
- **Recommended Metadata:** **Labels:** `bug`, `documentation`, `severity:medium`, `component:backup-restore`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.46.8 / Backup UX.

## #20 / [DIAGNOSTICS] Add Bob version validation check to Diagnostics panel

- **Issue Reference:** [#20 / [DIAGNOSTICS] Add Bob version validation check to Diagnostics panel](https://github.com/jnytko/Replycators/issues/20)
- **Issue Type:** Feature Request
- **Validation Assessment:** Valid - a bounded version check was implemented and its Bob 1.0 exception was covered.
- **Refined Title:** `[Diagnostics]: Validate the installed Bob version when applicable`
- **Updated Specification:** **Summary:** Surface compatible, outdated, unavailable, and Bob 1.0 states. **Steps / Expected:** Diagnostics never blocks startup and provides actionable results. **Actual Result:** Resolved and test cases recorded.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:medium`, `component:diagnostics`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.46.x / Diagnostics.

## #21 / [BACKUP] Advisory toast fires incorrectly when 'Keep existing' strategy skips sf-settings write

- **Issue Reference:** [#21 / [BACKUP] Advisory toast fires incorrectly when 'Keep existing' strategy skips sf-settings write](https://github.com/jnytko/Replycators/issues/21)
- **Issue Type:** Bug
- **Validation Assessment:** Duplicate - this is the negative acceptance case for #17.
- **Refined Title:** `[Duplicate]: Gate restored-setting advice by keys written in #17`
- **Updated Specification:** **Summary:** No advisory for skipped conflicts. **Steps / Expected:** Use written-key identities, not a total count. **Actual Result:** Implemented under #17.
- **Recommended Metadata:** **Labels:** `duplicate`, `bug`, `component:backup-restore`, `state:duplicate`; **Priority:** P2; **Milestone / Component:** Released with #17 / Backup & Restore.

## #22 / [DIAGNOSTICS] Bob version check must guard against Bob 1.0 mode - suppress misleading 'update required' warning

- **Issue Reference:** [#22 / [DIAGNOSTICS] Bob version check must guard against Bob 1.0 mode - suppress misleading 'update required' warning](https://github.com/jnytko/Replycators/issues/22)
- **Issue Type:** Bug
- **Validation Assessment:** Duplicate - Bob 1.0 handling is an acceptance case of #20 and was implemented there.
- **Refined Title:** `[Duplicate]: Handle Bob 1.0 mode in #20`
- **Updated Specification:** **Summary:** Suppress Bob 2 upgrade warnings in Bob 1.0 mode. **Steps / Expected:** Mode-specific diagnostics remain accurate. **Actual Result:** Covered by #20.
- **Recommended Metadata:** **Labels:** `duplicate`, `bug`, `component:diagnostics`, `state:duplicate`; **Priority:** P2; **Milestone / Component:** Released with #20 / Diagnostics.

## #23 / [BUG][P1] Preserve Salesforce results on init and purge all state on Clear

- **Issue Reference:** [#23 / [BUG][P1] Preserve Salesforce results on init and purge all state on Clear](https://github.com/jnytko/Replycators/issues/23)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - initialization destroyed persisted results while Clear did not consistently purge all state; fixed in v1.46.9.
- **Refined Title:** `[Salesforce State]: Preserve results during initialization and fully clear on request`
- **Updated Specification:** **Summary:** Separate UI reset from destructive state clearing. **Steps / Expected:** Reopen restores saved extraction; Clear removes UI, memory, and storage. **Actual Result:** Resolved in `dd02d73`.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:salesforce`, `state:resolved`; **Priority:** P1; **Milestone / Component:** Released v1.46.9 / Salesforce.

## #24 / [BUG][P2] Preserve Workspace Plain Tabs mode through migration

- **Issue Reference:** [#24 / [BUG][P2] Preserve Workspace Plain Tabs mode through migration](https://github.com/jnytko/Replycators/issues/24)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - operator precedence coerced valid `tabs` profiles to tab groups; fixed in v1.47.1.
- **Refined Title:** `[Workspace Migration]: Preserve valid launch modes`
- **Updated Specification:** **Summary:** Accept only `tabs` or `tab-group`; use legacy `tabGroup` only as fallback. **Steps / Expected:** All migration fixtures preserve intended modes. **Actual Result:** Resolved in `b722505`.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:workspace-starter`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.47.1 / Workspace Starter.

## #25 / [BUG][P1] Make Apptio Docs legacy migration transactional

- **Issue Reference:** [#25 / [BUG][P1] Make Apptio Docs legacy migration transactional](https://github.com/jnytko/Replycators/issues/25)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - destructive legacy cleanup required commit-before-delete and retry safety; the issue is closed after implementation.
- **Refined Title:** `[Apptio Docs Migration]: Commit new storage before deleting legacy keys`
- **Updated Specification:** **Summary:** Migration must be idempotent and failure-safe. **Steps / Expected:** Failed writes preserve legacy data; successful writes verify before cleanup. **Actual Result:** Resolved; retain as migration history.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:apptio-docs`, `state:resolved`; **Priority:** P1; **Milestone / Component:** Released v1.47.x / Apptio Docs Finder.

## #26 / [BUG][P1] Make backup rollback restore the exact pre-import state

- **Issue Reference:** [#26 / [BUG][P1] Make backup rollback restore the exact pre-import state](https://github.com/jnytko/Replycators/issues/26)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - rollback needed absence tracking and two-way restoration; resolved in `6947e76`.
- **Refined Title:** `[Backup Rollback]: Restore values and key absence exactly`
- **Updated Specification:** **Summary:** Snapshot presence plus values before import. **Steps / Expected:** Rollback restores old keys, removes newly introduced keys, and reports rollback failure. **Actual Result:** Resolved and deep equality verified.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:backup-restore`, `state:resolved`; **Priority:** P1; **Milestone / Component:** Released v1.47.x / Backup & Restore.

## #27 / [BUG][P2] Treat all-conflict Keep existing imports as successful no-ops

- **Issue Reference:** [#27 / [BUG][P2] Treat all-conflict Keep existing imports as successful no-ops](https://github.com/jnytko/Replycators/issues/27)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - a correct no-op was conflated with an unrecognized backup; fixed in v1.47.8.
- **Refined Title:** `[Backup Import]: Report all-conflict keep-existing runs as successful no-ops`
- **Updated Specification:** **Summary:** Distinguish skipped conflicts from zero recognized data. **Steps / Expected:** All-conflict imports show success/information with skip counts and write nothing. **Actual Result:** Resolved in v1.47.8.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:backup-restore`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.47.8 / Backup & Restore.

## #28 / [BUG][P2] Make Cloudability enable and disable lifecycle reversible without reload

- **Issue Reference:** [#28 / [BUG][P2] Make Cloudability enable and disable lifecycle reversible without reload](https://github.com/jnytko/Replycators/issues/28)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - early-return initialization prevented later enablement; resolved in plugin v4.0.5.
- **Refined Title:** `[Cloudability Lifecycle]: Keep enable and disable reversible without reload`
- **Updated Specification:** **Summary:** Bind once and gate actions by current state. **Steps / Expected:** Disable and re-enable repeatedly without duplicate listeners or reload. **Actual Result:** Resolved in `5300163`.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:cloudability`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released plugin v4.0.5 / Cloudability.

## #29 / [BUG][P2] Record Workspace launch success only after browser APIs complete

- **Issue Reference:** [#29 / [BUG][P2] Record Workspace launch success only after browser APIs complete](https://github.com/jnytko/Replycators/issues/29)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD still commits success before callbacks and dereferences possibly missing tabs.
- **Refined Title:** `[Workspace Launch]: Commit success only after tab creation completes`
- **Updated Specification:**
  - **Summary:** Await every tab creation, classify full/partial/failure, and group/focus only valid tab IDs.
  - **Steps / Expected Behavior:** Force one and all tab creations to fail. Full failure must not update recents/last-launched; partial success must report counts; full success remains unchanged.
  - **Actual Result:** `wsLaunchProfile()` writes success state synchronously and does not check `chrome.runtime.lastError`.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:workspace-starter`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Workspace Starter.

## #30 / [BUG][P2] Bound Apptio Upgrade refresh and preserve last-known-good cache

- **Issue Reference:** [#30 / [BUG][P2] Bound Apptio Upgrade refresh and preserve last-known-good cache](https://github.com/jnytko/Replycators/issues/30)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD has an unbounded fetch and clears the cache before forced refresh succeeds.
- **Refined Title:** `[Apptio Upgrade]: Bound live refresh and retain last-known-good data`
- **Updated Specification:**
  - **Summary:** Apply a 15-second abort bound; replace cached data only after a successful nonempty response.
  - **Steps / Expected Behavior:** With a valid cache, simulate offline/stalled/empty responses. Refresh re-enables, cache bytes remain unchanged, and stale cache is identified in the UI.
  - **Actual Result:** A stalled request can hang and a failed forced refresh destroys the cache.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:apptio-upgrade`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Apptio Upgrade Calculator.

## #31 / [A11Y][P2] Fix interactive-row keyboard semantics across plugins

- **Issue Reference:** [#31 / [A11Y][P2] Fix interactive-row keyboard semantics across plugins](https://github.com/jnytko/Replycators/issues/31)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - three keyboard gaps remain, but the Environment Dashboards nested-role claim is obsolete on HEAD and must be removed.
- **Refined Title:** `[Accessibility]: Make secondary row actions and Space activation keyboard-operable`
- **Updated Specification:**
  - **Summary:** Make Tab Search and Bookmark Finder secondary actions reachable through a documented composite/roving pattern, and support Space on Apptio Docs item bodies.
  - **Steps / Expected Behavior:** Keyboard-only users can invoke every action exactly once; Enter and Space activate row primaries; focus order is predictable.
  - **Actual Result:** Inner actions use `tabindex="-1"` with no alternative keyboard path, and Apptio Docs handles Enter only. Environment Dashboard cards are already noninteractive containers with real buttons.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:accessibility`, `component:plugin-ui`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Shared plugin interaction pattern.

## #32 / [A11Y][P2] Scope Snake hotkeys away from focused controls

- **Issue Reference:** [#32 / [A11Y][P2] Scope Snake hotkeys away from focused controls](https://github.com/jnytko/Replycators/issues/32)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - the document-level handler does not inspect focus target.
- **Refined Title:** `[Snake Accessibility]: Ignore game hotkeys while non-game controls have focus`
- **Updated Specification:** **Summary:** Scope hotkeys to the game surface and exclude inputs/buttons except intentional game controls. **Steps / Expected:** Enter/Space on Pause changes state once; controls keep native behavior; canvas/D-pad gameplay remains functional. **Actual Result:** Document-level keys can double-trigger or redirect gameplay.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:snake`, `component:accessibility`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Snake.

## #33 / [UX][P2] Make Snake canvas responsive in narrow side panels

- **Issue Reference:** [#33 / [UX][P2] Make Snake canvas responsive in narrow side panels](https://github.com/jnytko/Replycators/issues/33)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD forces a 400x220 CSS canvas, which exceeds narrow side-panel content width.
- **Refined Title:** `[Snake Layout]: Scale the canvas down within narrow side panels`
- **Updated Specification:** **Summary:** Preserve logical/backing dimensions while scaling display size down, never up. **Steps / Expected:** Verify 300, 360, 480, and 800 px widths at 1x/2x DPR with no horizontal overflow and correct overlays. **Actual Result:** Fixed CSS width clips the game.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:snake`, `component:ui`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Snake.

## #34 / [BUG][P2] Reset Salesforce Connected state on non-Salesforce tab activation

- **Issue Reference:** [#34 / [BUG][P2] Reset Salesforce Connected state on non-Salesforce tab activation](https://github.com/jnytko/Replycators/issues/34)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD returns for non-Salesforce tabs without resetting persistent side-panel state.
- **Refined Title:** `[Salesforce Detection]: Clear connected UI when focus leaves Salesforce`
- **Updated Specification:** **Summary:** Reset badge/widget/button state without clearing stored extraction or probing the non-Salesforce page. **Steps / Expected:** Switch away and back in Side Panel; UI immediately disconnects then accurately reconnects. **Actual Result:** Stale Connected state remains visible and actionable.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:salesforce`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Salesforce.

## #35 / [PRIVACY][P1] Correct Salesforce-to-Bob data-flow disclosures and add consent controls

- **Issue Reference:** [#35 / [PRIVACY][P1] Correct Salesforce-to-Bob data-flow disclosures and add consent controls](https://github.com/jnytko/Replycators/issues/35)
- **Issue Type:** Feature Request
- **Validation Assessment:** Valid - current SECURITY.md stops at loopback and does not disclose Bob's downstream cloud processing.
- **Refined Title:** `[Bob Privacy]: Disclose cloud processing and require informed execution consent`
- **Updated Specification:** **Summary:** Document storage, loopback, process, and cloud boundaries; obtain persisted, revocable consent before first Execute. **Steps / Expected:** First Execute explains transmitted fields and policy links; decline blocks execution; administrators can disable it. **Actual Result:** Users see incomplete local-only language and no explicit consent control.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:high`, `component:privacy`, `component:salesforce`, `state:validated`; **Priority:** P1; **Milestone / Component:** 1.48.0 Architecture / Salesforce-to-Bob privacy.

## #36 / [PRIVACY][P1] Make Privacy Mode protect Salesforce case data at rest

- **Issue Reference:** [#36 / [PRIVACY][P1] Make Privacy Mode protect Salesforce case data at rest](https://github.com/jnytko/Replycators/issues/36)
- **Issue Type:** Feature Request
- **Validation Assessment:** Valid - current mode redacts preview while raw extraction persists in local storage.
- **Refined Title:** `[Salesforce Privacy]: Redact persisted case data when Privacy Mode is enabled`
- **Updated Specification:** **Summary:** Define and enforce Privacy Mode scope for preview and persistence, with explicit retention. **Steps / Expected:** Storage inspection shows redacted fields and a redaction marker; raw in-memory data remains available only for the active Bob flow; TTL cleanup is verified. **Actual Result:** Raw PII remains under `rc:session:sf-last-result`.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:high`, `component:privacy`, `component:salesforce`, `state:validated`; **Priority:** P1; **Milestone / Component:** 1.48.0 Architecture / Salesforce privacy.

## #37 / [BUG][P2] Stop Cloudability MAIN-world interception when the plugin is disabled

- **Issue Reference:** [#37 / [BUG][P2] Stop Cloudability MAIN-world interception when the plugin is disabled](https://github.com/jnytko/Replycators/issues/37)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - static MAIN-world injection and monkey-patching remain independent of plugin state.
- **Refined Title:** `[Cloudability Isolation]: Prevent disabled plugins from intercepting page traffic`
- **Updated Specification:** **Summary:** Split immediate message/cache gating from an architectural dynamic-injection solution. **Steps / Expected:** Disabled state emits no OrgID messages or cache writes; full unpatch/no-injection behavior requires a separate ADR and reload semantics. **Actual Result:** Interceptor executes on every matched navigation.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:cloudability`, `component:privacy`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x gating + 1.48.0 architecture / Cloudability content scripts.

## #38 / [CI][P2] Restore a green TypeScript and Webpack release gate

- **Issue Reference:** [#38 / [CI][P2] Restore a green TypeScript and Webpack release gate](https://github.com/jnytko/Replycators/issues/38)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - missing/stale TypeScript contracts broke CI; recent commits restored the gate and the issue is closed.
- **Refined Title:** `[CI]: Restore TypeScript and Webpack release validation`
- **Updated Specification:** **Summary:** Keep typecheck/build green without changing the root-runtime ownership model. **Steps / Expected:** Clean checkout passes `typecheck`, production build, and sync verification. **Actual Result:** Resolved on main through PR #66 and follow-up hardening.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:ci`, `state:resolved`; **Priority:** P2; **Milestone / Component:** Released v1.47.10 / CI.

## #39 / [CI][P2] Validate the active root runtime in release CI

- **Issue Reference:** [#39 / [CI][P2] Validate the active root runtime in release CI](https://github.com/jnytko/Replycators/issues/39)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - CI still type-checks inactive TypeScript and builds, but performs no syntax/manifest-reference validation over active root JS.
- **Refined Title:** `[CI]: Syntax-check and validate every active root runtime entry`
- **Updated Specification:** **Summary:** Add a dependency-free verifier for manifest JSON, referenced files, and all root/plugin/content-script JavaScript. **Steps / Expected:** Inject a syntax error or remove a manifest target; CI must fail before packaging. **Actual Result:** Sync can faithfully copy invalid root code into dist.
- **Recommended Metadata:** **Labels:** `bug`, `severity:high`, `component:ci`, `component:active-runtime`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Release CI.

## #40 / [GOVERNANCE][P2] Replace placeholder CODEOWNERS and advertise private security reporting

- **Issue Reference:** [#40 / [GOVERNANCE][P2] Replace placeholder CODEOWNERS and advertise private security reporting](https://github.com/jnytko/Replycators/issues/40)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - CODEOWNERS is now populated, but private reporting remains undiscoverable and sensitive path coverage is incomplete.
- **Refined Title:** `[Security Governance]: Enable private vulnerability reporting and complete ownership coverage`
- **Updated Specification:** **Summary:** Remove already-completed placeholder work from scope; enable GitHub Private Vulnerability Reporting, link it from SECURITY.md, verify branch protection, and cover launcher/content-script paths. **Steps / Expected:** A reporter can submit privately and a test PR requests the correct owner. **Actual Result:** SECURITY.md still says to contact the owner and warns against public exploit details without a concrete private route.
- **Recommended Metadata:** **Labels:** `maintenance`, `documentation`, `severity:high`, `component:security-governance`, `state:validated`; **Priority:** P2; **Milestone / Component:** 1.47.x Maintenance / Repository security.

## #41 / [BUG][P3] Record all plugin-originated Apptio Docs opens in Opened history

- **Issue Reference:** [#41 / [BUG][P3] Record all plugin-originated Apptio Docs opens in Opened history](https://github.com/jnytko/Replycators/issues/41)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - `_openUrl()` still bypasses history, so quick links and item-card opens are omitted.
- **Refined Title:** `[Apptio Docs History]: Record every successful plugin-originated page open`
- **Updated Specification:** **Summary:** Centralize tab creation and conditional history recording. **Steps / Expected:** Every open path records exactly once only after successful tab creation, respects the setting, deduplicates, and caps at 30. **Actual Result:** Only the search path saves history.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:apptio-docs`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Apptio Docs Finder.

## #42 / [A11Y][P3] Replace Apptio Upgrade private tab system with platform tabs

- **Issue Reference:** [#42 / [A11Y][P3] Replace Apptio Upgrade private tab system with platform tabs](https://github.com/jnytko/Replycators/issues/42)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - current tabs have basic ARIA but use private styling, inline display, and no roving keyboard navigation.
- **Refined Title:** `[Apptio Upgrade Accessibility]: Adopt the shared tabs interaction contract`
- **Updated Specification:** **Summary:** Use shared tab classes, `hidden` panels, roving tabindex, Arrow/Home/End keys, and correct focus/ARIA state. **Steps / Expected:** Keyboard traversal follows APG tabs and Refresh remains outside the tablist. **Actual Result:** Mouse activation works, but the platform contract is incomplete.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:medium`, `component:apptio-upgrade`, `component:accessibility`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Apptio Upgrade UI.

## #43 / [BUG][P3] Preserve an intentionally empty Workspace profile list

- **Issue Reference:** [#43 / [BUG][P3] Preserve an intentionally empty Workspace profile list](https://github.com/jnytko/Replycators/issues/43)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD treats an existing empty array as absent and reseeds defaults.
- **Refined Title:** `[Workspace Persistence]: Preserve an intentionally empty profile collection`
- **Updated Specification:** **Summary:** Seed defaults only when the key is absent or structurally corrupt, not when `profiles` is empty. **Steps / Expected:** Delete all, reopen, and remain empty; fresh install still seeds once; corrupt data warns and recovers. **Actual Result:** `saved.profiles.length > 0` resurrects defaults.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:workspace-starter`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Workspace Starter.

## #44 / [BUG][P3] Allow Snake to move into a tail cell that vacates this tick

- **Issue Reference:** [#44 / [BUG][P3] Allow Snake to move into a tail cell that vacates this tick](https://github.com/jnytko/Replycators/issues/44)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - collision is evaluated against the full pre-move body before non-growth tail removal.
- **Refined Title:** `[Snake Rules]: Permit entry into a tail cell vacated on the same tick`
- **Updated Specification:** **Summary:** Exclude the tail from self-collision only on non-growth ticks. **Steps / Expected:** Tail-cell move succeeds without food, fails with food, and body/wall collisions remain unchanged. **Actual Result:** Valid movement can cause false game over.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:snake`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Snake.

## #45 / [BUG][P3] Normalize warning severity consistently across runtime and docs

- **Issue Reference:** [#45 / [BUG][P3] Normalize warning severity consistently across runtime and docs](https://github.com/jnytko/Replycators/issues/45)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - AGENTS.md mandates `warning`, Env Dashboards emits it, and `addLog()` accepts only `warn`, coercing entries to info.
- **Refined Title:** `[Logging]: Normalize documented warning severity to the stored warn level`
- **Updated Specification:** **Summary:** Accept `warning` as an alias, migrate emitters to one canonical public vocabulary, and keep the stored/filter value stable. **Steps / Expected:** Env Dashboard warning paths appear in the Warning filter and badge counts. **Actual Result:** They are stored as info.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:logging`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Platform logging.

## #46 / [DOCS][P3] Make the Backup and Restore help topic reachable

- **Issue Reference:** [#46 / [DOCS][P3] Make the Backup and Restore help topic reachable](https://github.com/jnytko/Replycators/issues/46)
- **Issue Type:** Task
- **Validation Assessment:** Valid - content exists but is absent from the navigable/searchable topic registry.
- **Refined Title:** `[Help]: Add Backup and Restore to documentation navigation and search`
- **Updated Specification:** **Summary:** Register the existing topic, add a working Maintenance Center link, and verify Docs-button routing. **Steps / Expected:** Browse/search/link paths all select `backup-restore` and render the full content. **Actual Result:** `setTopic()` silently ignores the unregistered ID.
- **Recommended Metadata:** **Labels:** `documentation`, `severity:medium`, `component:help-docs`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Documentation plugin.

## #47 / [PERF][P4] Debounce Bookmark Finder preference persistence

- **Issue Reference:** [#47 / [PERF][P4] Debounce Bookmark Finder preference persistence](https://github.com/jnytko/Replycators/issues/47)
- **Issue Type:** Maintenance
- **Validation Assessment:** Needs Info - the write-per-keystroke fact is valid, but no quota, latency, or user-impact evidence justifies scheduling a timer lifecycle change.
- **Refined Title:** `[Bookmark Finder]: Measure search-preference write pressure before debouncing`
- **Updated Specification:** **Summary:** Instrument storage writes and latency during realistic side-panel sessions. **Steps / Expected:** Supply baseline counts and a threshold; if exceeded, add a trailing save with blur/leave/unload flush and fake-timer tests. **Actual Result:** Redundant writes occur, but impact is hypothetical.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:bookmark-finder`, `state:needs-info`; **Priority:** P3; **Milestone / Component:** Performance backlog / Bookmark Finder.

## #48 / [BUILD][P3] Make dist verification exact and remove package-metadata contradiction

- **Issue Reference:** [#48 / [BUILD][P3] Make dist verification exact and remove package-metadata contradiction](https://github.com/jnytko/Replycators/issues/48)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - `sync-root.js` still skips missing sources and never rejects extra dist files.
- **Refined Title:** `[Build]: Enforce exact root-to-dist parity`
- **Updated Specification:** **Summary:** Fail on missing configured sources, missing destinations, content drift, and unapproved extras; resolve `dist/package.json` policy. **Steps / Expected:** Mutation fixtures for each class exit nonzero; clean committed and rebuilt trees match. **Actual Result:** The verifier can report success for incomplete or polluted dist trees.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:build`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Build sync.

## #49 / [BUILD][P3] Make icon verification complete, provenance-aware, and CI-enforced

- **Issue Reference:** [#49 / [BUILD][P3] Make icon verification complete, provenance-aware, and CI-enforced](https://github.com/jnytko/Replycators/issues/49)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD still finds zero `_BASE` paths, checks a hard-coded subset, returns success on failures, and is absent from CI.
- **Refined Title:** `[Build]: Fail CI on icon registry, sync, manifest, or provenance errors`
- **Updated Specification:** **Summary:** Parse the actual registry form, validate all assets and manifest entries, enforce provenance, and exit nonzero. **Steps / Expected:** Remove any registered icon or attribution entry; verifier and CI fail. **Actual Result:** Current script can print issues and exit zero.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:build`, `component:icons`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Icon pipeline.

## #50 / [RELEASE][P3] Enforce one automated version contract

- **Issue Reference:** [#50 / [RELEASE][P3] Enforce one automated version contract](https://github.com/jnytko/Replycators/issues/50)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - some original values have advanced, but SECURITY.md is still at 1.45.x, governance lists still diverge, and no automated parity gate exists.
- **Refined Title:** `[Release]: Define and automatically verify the authoritative version contract`
- **Updated Specification:** **Summary:** Rebaseline all checks to current 1.47.10; designate one canonical list, resolve `dist/package.json`, and add a CI verifier. **Steps / Expected:** Change any authoritative value and CI fails with the exact file/field. **Actual Result:** Manual lists and stale security support text remain.
- **Recommended Metadata:** **Labels:** `maintenance`, `documentation`, `severity:medium`, `component:release`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Release governance.

## #51 / [ARCH][P3] Reconcile inactive TypeScript plugin metadata before Phase 2

- **Issue Reference:** [#51 / [ARCH][P3] Reconcile inactive TypeScript plugin metadata before Phase 2](https://github.com/jnytko/Replycators/issues/51)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - recent TypeScript hardening did not establish automated metadata parity with the active registry.
- **Refined Title:** `[Phase 2]: Reconcile and verify inactive plugin metadata against the active registry`
- **Updated Specification:** **Summary:** Align versions, descriptions, permissions, and paths or explicitly mark source manifests non-authoritative. **Steps / Expected:** A parity verifier reports every plugin and CI blocks drift before Phase 2 reuse. **Actual Result:** Dual metadata remains manually synchronized.
- **Recommended Metadata:** **Labels:** `maintenance`, `documentation`, `severity:medium`, `component:phase-2-sdk`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.48.0 Architecture / Phase 2 readiness.

## #52 / [DOCS][P3] Align architecture, startup flow, plugin checklist, and Env Dashboard docs

- **Issue Reference:** [#52 / [DOCS][P3] Align architecture, startup flow, plugin checklist, and Env Dashboard docs](https://github.com/jnytko/Replycators/issues/52)
- **Issue Type:** Task
- **Validation Assessment:** Valid - governance comments confirm stale startup/navigation/runtime descriptions remain.
- **Refined Title:** `[Architecture Docs]: Align startup, navigation, plugin checklist, and Environment Dashboard state`
- **Updated Specification:** **Summary:** Remove obsolete `initPlugins()`/manual-nav guidance, document grouped destinations, current `_safeInit()` order, and `env-dashboards` storage schema. **Steps / Expected:** Every authoritative diagram and checklist traces to current root code. **Actual Result:** Contributors can follow contradictory or inactive-layer instructions.
- **Recommended Metadata:** **Labels:** `documentation`, `severity:medium`, `component:architecture-docs`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Architecture documentation.

## #53 / [BUILD][P3] Propagate packaging failures with a nonzero exit status

- **Issue Reference:** [#53 / [BUILD][P3] Propagate packaging failures with a nonzero exit status](https://github.com/jnytko/Replycators/issues/53)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - HEAD still ends with `createPackage().catch(console.error)`, so asynchronous archive failures can exit successfully.
- **Refined Title:** `[Packaging]: Exit nonzero on archive or output-stream failure`
- **Updated Specification:** **Summary:** Reject on archive/output errors, set exit code 1, and emit success only after close. **Steps / Expected:** Force finalization and write failures; both command and npm script fail with no success message. **Actual Result:** Top-level rejection is logged but swallowed.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:packaging`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Packaging.

## #54 / [CI][P3] Pin Actions to commits and declare least-privilege token permissions

- **Issue Reference:** [#54 / [CI][P3] Pin Actions to commits and declare least-privilege token permissions](https://github.com/jnytko/Replycators/issues/54)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - least-privilege `contents: read` now exists in CI, but all actions remain on mutable major tags and other workflows must be included.
- **Refined Title:** `[CI Supply Chain]: Pin every third-party Action to a reviewed commit SHA`
- **Updated Specification:** **Summary:** Remove completed permissions work from the CI subtask; inventory all workflows, pin each `uses:` to a full SHA with version comments, and automate update review. **Steps / Expected:** Policy scan finds no mutable tags; workflows retain minimum permissions and pass. **Actual Result:** `checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, and `github-script@v7` remain mutable.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:medium`, `component:ci`, `component:security`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / GitHub Actions.

## #55 / [SECURITY][P3] Remove unnecessary web-accessible resource exposure

- **Issue Reference:** [#55 / [SECURITY][P3] Remove unnecessary web-accessible resource exposure](https://github.com/jnytko/Replycators/issues/55)
- **Issue Type:** Maintenance
- **Validation Assessment:** Valid - current WAR entries expose broad icon globs and local JSON to matched web origins without an identified page-world consumer.
- **Refined Title:** `[Manifest Security]: Remove or narrowly justify web-accessible resources`
- **Updated Specification:** **Summary:** Test extension-page consumers without WAR, remove unused entries, and document exact page-world needs for any retained path. **Steps / Expected:** Popup/side-panel resources still load; matched pages cannot probe removed paths. **Actual Result:** Six host families can request broad asset sets.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:medium`, `component:manifest`, `component:security`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.47.x Maintenance / Manifest hardening.

## #56 / [ENTERPRISE][P3] Add a managed policy surface for privacy and plugin controls

- **Issue Reference:** [#56 / [ENTERPRISE][P3] Add a managed policy surface for privacy and plugin controls](https://github.com/jnytko/Replycators/issues/56)
- **Issue Type:** Feature Request
- **Validation Assessment:** Needs Info - technically feasible, but policy ownership, supported browsers, precedence, rollout, and administrator requirements are product decisions not established by the issue.
- **Refined Title:** `[Enterprise Policy]: Define managed privacy, Bob, plugin, and retention controls`
- **Updated Specification:** **Summary:** Run a product/architecture discovery before implementation. **Steps / Expected:** Name policy owners, Edge/Chrome deployment targets, precedence over local settings, live-update behavior, migration/defaults, and support commitments; approve an ADR and schema. **Actual Result:** The issue jumps directly to a broad implementation contract without validated customers or governance decisions.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:medium`, `component:enterprise-policy`, `state:needs-info`; **Priority:** P3; **Milestone / Component:** Discovery / Enterprise administration.

## #59 / [Governance] Continuous Repository Governance State

- **Issue Reference:** [#59 / [Governance] Continuous Repository Governance State](https://github.com/jnytko/Replycators/issues/59)
- **Issue Type:** Maintenance
- **Validation Assessment:** Invalid - a mutable governance-state ledger has no discrete acceptance criteria and is not assignable sprint work.
- **Refined Title:** `[Governance]: Publish continuous audit state outside the issue backlog`
- **Updated Specification:** **Summary:** Move cycle state to a project view, dashboard, or versioned report and close the issue. **Steps / Expected:** Findings link to discrete issues; the ledger exposes baseline, run date, status, and artifacts without counting as product backlog. **Actual Result:** An open issue conflates operational state with actionable work.
- **Recommended Metadata:** **Labels:** `maintenance`, `severity:low`, `component:governance`, `state:invalid`; **Priority:** P3; **Milestone / Component:** Governance operations / Project metadata.

## #60 / [ARCH][P3] Enforce synchronous plugin initialization contract

- **Issue Reference:** [#60 / [ARCH][P3] Enforce synchronous plugin initialization contract](https://github.com/jnytko/Replycators/issues/60)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - Workspace Starter, Snake, and Salesforce `init()` paths still start storage or browser/helper I/O.
- **Refined Title:** `[Plugin Lifecycle]: Move asynchronous hydration out of synchronous initialization`
- **Updated Specification:** **Summary:** Add a documented post-startup hydration/navigation phase and keep `init()` binding-only. **Steps / Expected:** Fresh/restore startup preserves widgets and direct restored views; one hydration failure cannot block shell or other plugins. **Actual Result:** Plugin-specific async work and race compensation remain in initialization.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:plugin-lifecycle`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.48.0 Architecture / Plugin lifecycle.

## #61 / [ARCH][P3] Replace mutable appSettings exposure with bounded updates

- **Issue Reference:** [#61 / [ARCH][P3] Replace mutable appSettings exposure with bounded updates](https://github.com/jnytko/Replycators/issues/61)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - `getAppSettings()` still returns the live object and Snake mutates it before whole-object persistence; background remains another writer.
- **Refined Title:** `[Settings Ownership]: Expose immutable reads and validated bounded updates`
- **Updated Specification:** **Summary:** Return snapshots/read-only access and provide field-level validated mutation through one documented owner. **Steps / Expected:** Theme, sizing, launch mode, and Snake speed survive reopen/restart without lost updates or storage-key migration. **Actual Result:** Arbitrary live mutation and stale whole-object writes are possible.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:settings`, `component:architecture`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.48.0 Architecture / Platform settings.

## #62 / [ARCH][P3] Restore plugin settings ownership boundaries

- **Issue Reference:** [#62 / [ARCH][P3] Restore plugin settings ownership boundaries](https://github.com/jnytko/Replycators/issues/62)
- **Issue Type:** Feature Request
- **Validation Assessment:** Valid - dashboard.js still binds plugin controls, embeds plugin storage keys, calls underscored methods, and performs fallback deletion.
- **Refined Title:** `[Plugin Architecture]: Return plugin settings behavior to owning modules`
- **Updated Specification:** **Summary:** Define a narrow public settings registration/coordination contract; keep the shared Settings destination while moving persistence and private workflows into plugins. **Steps / Expected:** Search finds no plugin-private calls or raw plugin keys in dashboard.js; all affected settings behave in Popup/Side Panel and across enable/disable/restart. **Actual Result:** The orchestrator is a plugin implementation surface.
- **Recommended Metadata:** **Labels:** `enhancement`, `severity:medium`, `component:plugin-architecture`, `component:settings`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.48.0 Architecture / Plugin settings contract.

## #63 / [ARCH][P3] Stop treating the inert background registry as active diagnostics

- **Issue Reference:** [#63 / [ARCH][P3] Stop treating the inert background registry as active diagnostics](https://github.com/jnytko/Replycators/issues/63)
- **Issue Type:** Bug
- **Validation Assessment:** Valid - `registerPlugin()` has no active caller while dashboard statistics still interpret an empty `RC_GET_REGISTRY` response as zero errors.
- **Refined Title:** `[Diagnostics]: Derive plugin health from an active runtime source`
- **Updated Specification:** **Summary:** Populate a real health registry or render the statistic unavailable; do not let Phase 2 scaffolding drive active UI. **Steps / Expected:** Force a plugin initialization failure and verify accurate health; service-worker suspension remains nonfatal and explicit. **Actual Result:** An always-empty registry produces a false healthy count.
- **Recommended Metadata:** **Labels:** `bug`, `severity:medium`, `component:diagnostics`, `component:architecture`, `state:validated`; **Priority:** P3; **Milestone / Component:** 1.48.0 Architecture / Runtime diagnostics.

## Recommended execution order

1. **Immediate P1 privacy/security:** #35, #36; finish #40's private-reporting scope.
2. **P2 correctness and CI:** #29, #30, #31, #32, #33, #34, #37, #39.
3. **Contained P3 maintenance:** #41-#46, #48-#55.
4. **Architecture milestone:** #60-#63, coordinated so lifecycle, settings ownership, and diagnostics contracts do not conflict.
5. **Discovery only:** #47 and #56. Close/move #59.

## Tracker hygiene actions

- Add the proposed severity/component/workflow labels before relying on `release-readiness.yml`; it currently counts labels that most issues do not have.
- Create the two proposed milestones and assign all open validated issues.
- Update #31, #40, #50, and #54 to remove claims already resolved on HEAD.
- Close #59 after moving its content to a governance artifact/project view.
- Keep closed duplicate/invalid issues searchable, but do not add milestones or reopen them.
