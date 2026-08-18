(function() {
  'use strict';

  // ─── Plugin registration ──────────────────────────────────────────────────
  const plugin = {
    id: 'com.replycators.salesforce-extractor',
    init,
    onNavigate: sfRefreshDetectionBanner,
    onWorkingDirChanged,
    onApiKeyChanged,
    onBobVersionModeChanged,
  };

  function app() { return window.ReplyCatorsApp; }
  function RC_STORE() { return app().RC_STORE || {}; }

  function pluginEnabled() {
    return !(app().pluginStates?.[plugin.id]?.enabled === false);
  }

  // ─── Module-level state ───────────────────────────────────────────────────
  let _promptSaveLock       = Promise.resolve(); // serialises persistPrompts() calls
  let _lastDownloadRecord   = null;              // mirrors SF_LAST_DOWNLOAD in memory
  let currentPrompts        = [];                // live prompt array
  let _sfEditingId          = null;              // prompt id being edited (null = Add mode)
  let _sfActiveExecPromptId = null;              // prompt id shown in Extract exec panel
  let _tabListenersRegistered = false;
  let _lastRawText          = '';               // sort-applied, privacy-unapplied text shown in the preview
  let _lastBaseText         = '';               // original ASC text from content script (source for re-sort)
  let _lastExtractionPosts  = [];               // raw posts array from last extraction (for re-sort on demand)
  let _helperHealthy        = null;             // null = unknown, true = running, false = down
  let _lastHealthCheckAt    = 0;               // epoch ms of last completed health probe (PERF-006)
  let _bobWorkingDir        = '';               // user-configured working directory for bob execution
  let _bobApiKey            = '';               // BobShell 2.0 API key — NEVER log the value
  let _bobUseBob1           = false;            // when true, BOB_API_KEY injection is skipped
  let _sfDiagnosticMode     = false;            // when true, passes RC_DIAG_MODE=1 to the launcher
  let _additionalInstructionsWriteTimer = null; // debounce timer for persisting additional instructions
  let _sfDownloadMsgListenerBound = false;       // F-01: guard — addListener called at most once per document

  // ─── Attachment state ─────────────────────────────────────────────────────
  //
  // Each entry: { file: File, name: string }
  // Upper limit: MAX_ATTACHMENTS (10) - identical for every prompt.
  // No file-type restrictions; no prompt-specific rules.
  // ─────────────────────────────────────────────────────────────────────────
  const MAX_ATTACHMENTS = 10;
  const MAX_PROMPT_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB hard limit on assembled prompt
  const FILES_READ_TIMEOUT_MS = 10000;            // 10 second timeout on FileReader operations
  let _execAttachments  = [];   // Extract tab attachments
  let _execAdditional   = '';   // Extract tab "Additional Requests" text

  // ─── Default prompts ─────────────────────────────────────────────────────
  //
  // Prompt schema:
  //   id        {string}   - stable unique identifier
  //   title     {string}   - display name (editable)
  //   body      {string}   - prompt text (editable)
  //   createdAt {number}   - epoch ms
  //   updatedAt {number}   - epoch ms
  //
  // Prompts do NOT contain upload widgets, attachment controls, or file lists.
  // All execution UI (attachments, Additional Requests, Execute) is provided
  // by renderUnifiedExecPanel() - identical for every prompt.
  // ─────────────────────────────────────────────────────────────────────────
  const SF_DEFAULT_PROMPTS = [
    {
      id:        'prompt-default-understand',
      title:     'Understand Case',
      body:      'Role: You are an analytical assistant specializing in breaking down and clarifying technical issues or questions, particularly within the IBM Apptio ecosystem.\n\nContext Sources (Use for Reference and Accuracy):\nWhen relevant, use the following documentation to improve understanding, terminology, and context:\n\t\u2022 Cloudability: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas\n\t\u2022 Apptio BI: https://www.ibm.com/docs/en/apptio-platform/apptio-bi/saas\n\t\u2022 Access Administration: https://www.ibm.com/docs/en/apptio-platform/access-administration/saas\n\t\u2022 IBM Community (Apptio-related discussions and knowledge): https://community.ibm.com/community/user/groups/community-home?CommunityKey=15c0e07d-35c0-49de-a84b-019253d13376\nTask:\n\t1. Carefully review the input and identify the core problem or question.\n\t2. Use relevant IBM Apptio (Cloudability, BI, Access Administration) concepts when applicable to improve clarity and accuracy.\n\t3. Break the content into clear, logical sections that improve understanding for both humans and AI systems.\n\t4. Rewrite unclear or poorly structured parts for clarity without changing the original meaning.\n\t5. Highlight key elements such as context, objectives, dependencies, constraints, and assumptions.\n\t6. Do not use any MCPs or interfaces unless explicitly instructed otherwise\nOutput Requirements:\nStructure your response using the following format:\n\t\u2022 Summary of the Issue\n\t\t\u25e6 A concise, plain-language overview of the problem or question\n\t\u2022 Key Components\n\t\t\u25e6 Logical breakdown (e.g., context, product area, stakeholders, data involved, dependencies)\n\t\t\u25e6 Clearly indicate if the issue relates to: Cloudability / Apptio BI / Access Administration / General platform or unclear\n\t\u2022 Clarified Problem Statement\n\t\t\u25e6 A cleaner, precise rewrite of the issue optimized for understanding\n\t\u2022 Assumptions & Implicit Details\n\t\t\u25e6 List inferred assumptions or missing context\n\t\u2022 Open Questions / Gaps\n\t\t\u25e6 Identify unclear, missing, or ambiguous details that should be clarified\n\t\u2022 Structured Version for AI Reuse\n\t\t\u25e6 Provide a refined, well-structured version of the problem suitable for reuse in another AI prompt\nFiles or Text:',
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id:        'prompt-default-research',
      title:     'Research Case',
      body:      '\u2022 Role: You are an AI assistant that retrieves, analyzes, and synthesizes information from JIRA and Confluence using Prism MCP, iris-gateway, or Atlassian MCP (whichever integration is available and accessible).\n\n\u2022 Objective: Answer the user\'s query by combining information from JIRA issues and tickets, Confluence documentation, and an optional companion file containing common issues per project.\n\n\u2022 Workflow:\n\t\u2022 Understand the User Request\n\t\u2022 Review Optional Companion File (Top Issues by Project)\n\t\u2022 Retrieve Data from JIRA and Confluence\n\t\u2022 Analyze and Correlate Findings\n\t\u2022 Generate the Response\n\n\u2022 Response Sections: Summary | Pattern Match Analysis | Relevant JIRA Items | Relevant Confluence Content | Recommended Actions | Notes / Risks\n\n\u2022 Constraints: Be concise, factual, and evidence-based. Never invent tickets, pages, causes, fixes, or documentation.\n\nFiles or Text:',
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  // ─── Privacy mode - redact customer-identifying information ──────────────
  //
  // sfApplyPrivacy() applies four passes over the formatted rawText string.
  // Pass 0 runs unconditionally (it is a display artefact fix, not PII gating).
  // Passes 1-3 run only when Privacy Mode is enabled.
  //
  //   0. Salesforce/Jira rendering artefacts (unconditional):
  //      a. Jira mention tokens - replaces "[~accountid:<id>:<uuid>]" artefacts
  //         produced by the Jira-to-Salesforce ETL bridge with "[Jira mention]".
  //         These tokens are never meaningful to a reader and always indicate a
  //         raw Jira @-mention that was not resolved during sync.
  //      b. Salesforce Case Summary disclaimer - removes the boilerplate line
  //         "Case Summary post indicates the current values of these fields,
  //         not the values as they were submitted" that Salesforce injects into
  //         Case Summary system posts. The sentence carries no informational
  //         value for case analysis. After removal, consecutive blank lines
  //         produced by the excision are collapsed to a single blank line.
  //
  //   1. Contact name line - replaces "Contact     : <value>" with
  //      "Contact     : [REDACTED_CONTACT]"
  //      (existing behaviour, token updated to the new standard)
  //
  //   2. Email addresses - detects and replaces all RFC 5321-style email
  //      addresses (including subdomains, plus-addressing, quoted local-parts,
  //      and mixed-case) with "[REDACTED_EMAIL]" everywhere they appear in the
  //      text, including inside post bodies and descriptions.
  //
  //   3. Inline contact occurrences - replaces any further occurrence of the
  //      raw contact name value with "[REDACTED_CONTACT]" so that the name
  //      cannot leak through post content or the description block.
  //      This pass is skipped when the contact name field is "N/A" or empty.
  //
  // Assumptions:
  //   - Jira mention pattern: [~accountid:<numeric-id>:<uuid>] where the UUID
  //     is a standard hyphenated UUID (v4 form). The numeric account ID segment
  //     is optional in some older Jira versions so the pattern allows it to be
  //     absent. The entire token including brackets is replaced.
  //   - Case Summary disclaimer is matched case-insensitively to handle any
  //     capitalisation variant Salesforce may produce. Leading/trailing
  //     whitespace on the matched line is consumed so no blank stub remains.
  //   - Email regex targets the standard addr-spec form
  //     `local@domain.tld`; quoted local-parts and IP-literal domains are
  //     outside scope (they are vanishingly rare in Salesforce case data).
  //   - Contact-name inline redaction is case-insensitive.
  //   - If the contact name contains regex meta-characters they are escaped
  //     before building the inline-search pattern.
  //   - Pass order: Jira mentions + disclaimer first, then contact-line, email,
  //     inline-contact. This ensures artefact tokens cannot interfere with the
  //     email pass and that the contact-line capture in pass 1 is clean.
  //
  // Operates on the already-formatted rawText string so no changes are needed
  // to the content script.

  /** Escapes a string for safe use inside a RegExp pattern. */
  function _sfEscapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function sfPrivacyEnabled() {
    const el = document.getElementById('sf-privacy-mode');
    return el ? el.checked : true; // default: on
  }

  // Jira @-mention token pattern: [~accountid:<numeric-id>:<uuid>]
  // The numeric-id segment and colon separator are optional to handle both the
  // current Jira Cloud format and older Server/DC variants that emit only the UUID.
  // Examples matched:
  //   [~accountid:712020:46268819-fe9e-4ff4-ba2c-d6a04a2f9e2d]
  //   [~accountid:46268819-fe9e-4ff4-ba2c-d6a04a2f9e2d]
  const JIRA_MENTION_PATTERN = /\[~accountid:[^\]]+\]/gi;

  // Salesforce Case Summary disclaimer boilerplate.
  // Matches the full sentence on its own line (with any surrounding whitespace)
  // so the line is removed entirely rather than leaving a blank stub.
  // The \s* on each side of the sentence consumes leading/trailing spaces;
  // the \n? at the end eats the newline so no extra blank line is left.
  const SF_CASE_SUMMARY_DISCLAIMER =
    /[ \t]*Case Summary post indicates the current values of these fields,[ \t]*\n?[ \t]*not the values as they were submitted[ \t]*\n?/gi;

  function sfApplyPrivacy(text) {
    // ── Pass 0: remove Salesforce/Jira rendering artefacts (unconditional) ───
    // Runs before the privacy-mode guard so artefacts are always cleaned up
    // regardless of whether the user has Privacy Mode switched on or off.
    text = text.replace(JIRA_MENTION_PATTERN, '[Jira mention]');
    text = text.replace(SF_CASE_SUMMARY_DISCLAIMER, '');
    // Collapse any double-blank lines produced by the disclaimer removal.
    text = text.replace(/\n{3,}/g, '\n\n');

    if (!sfPrivacyEnabled()) return text;

    // ── Pass 1: redact the Contact structured field line ─────────────────────
    // Matches "Contact     : <anything except newline>" (existing behaviour).
    // Capture group 2 is held to drive pass 3 (inline contact redaction).
    let contactName = '';
    text = text.replace(/^(Contact\s+:\s)(.+)$/m, (match, prefix, name) => {
      contactName = name.trim();
      return prefix + '[REDACTED_CONTACT]';
    });

    // ── Pass 2: redact email addresses ───────────────────────────────────────
    // Covers: standard local-part chars (letters, digits, ._%+-), @,
    // one or more domain labels separated by dots, a TLD of 2-63 chars.
    // The pattern is intentionally broad: it matches anything that looks
    // like an email so no PII leaks, even if the address is slightly
    // malformed.  Case-insensitive flag handles mixed-case addresses.
    const EMAIL_PATTERN = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,63}/gi;
    text = text.replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');

    // ── Pass 3: redact inline occurrences of the contact name ────────────────
    // Skipped when the field was empty or "N/A" (nothing to redact).
    if (contactName && contactName !== 'N/A' && contactName !== '[REDACTED_CONTACT]') {
      const inlinePattern = new RegExp(_sfEscapeRegex(contactName), 'gi');
      text = text.replace(inlinePattern, '[REDACTED_CONTACT]');
    }

    return text;
  }

  // ─── sfBuildSortedText ────────────────────────────────────────────────────
  //
  // Re-assembles the CASE HISTORY plain-text block from the structured posts
  // array, applying the user's preferred sort direction.
  //
  // When sortDir is "asc" (the default) the function is a no-op and returns
  // rawText unchanged - the content script already produces oldest-first order
  // so no rebuild is required.
  //
  // When sortDir is "desc" the posts array is reversed on a shallow copy and
  // the CASE HISTORY section in rawText is replaced with a rebuilt block that
  // iterates the reversed array.  The header label is updated accordingly.
  //
  // Guards:
  //   - Returns rawText unchanged when rawText is empty, posts is not a
  //     non-empty array, or the CASE HISTORY separator is not found.
  //   - Any sortDir value other than "desc" falls through to the ascending
  //     default (safe for missing or corrupt stored values).
  //
  function sfBuildSortedText(rawText, posts, sortDir) {
    if (!rawText || !Array.isArray(posts) || posts.length === 0) return rawText;
    if (sortDir !== 'desc') return rawText;

    const TYPE_LABEL = {
      customer:   'Customer post',
      internal:   'Internal post',
      'jira-etl': 'JIRA/ETL post',
      diagnostic: 'Diagnostic event',
    };

    // Shallow-copy then reverse so the original array is never mutated.
    const sorted = posts.slice().reverse();

    let block = 'Case comments: (chronological - newest first)\n\n';
    sorted.forEach(function(post, i) {
      const label = TYPE_LABEL[post.type] || post.type || 'Post';
      block += '[' + label + ' #' + (i + 1) + ']\n';
      block += 'Author    : ' + post.author    + '\n';
      block += 'Timestamp : ' + post.timestamp + '\n';
      block += '\n';
      block += post.content + '\n';
      if (i < sorted.length - 1) block += '\n';
    });

    // Replace from the Case comments heading to the end of the document.
    const histStart = rawText.indexOf('\nCase comments:');
    if (histStart === -1) return rawText; // unexpected format guard
    return rawText.slice(0, histStart + 1) + block;
  }

  // ─── Helper: strip legacy files[] from stored prompts ────────────────────
  function normalisePrompt(p) {
    delete p.files;
    return p;
  }

  // ─── SF storage key helpers ───────────────────────────────────────────────
  function sfKey(suffix) {
    const store = RC_STORE();
    return store['SF_' + suffix] || ('rc:plugin:' + plugin.id + ':' + suffix.toLowerCase().replace(/_/g, '-'));
  }

  function sfPromptsKey()                  { return sfKey('PROMPTS'); }
  function sfSeededKey()                   { return sfKey('PROMPTS_SEEDED'); }
  function sfDownloadKey()                 { return sfKey('LAST_DOWNLOAD'); }
  function sfSelPromptKey()                { return sfKey('SELECTED_PROMPT'); }
  function sfCtxFileKey()                  { return sfKey('CONTEXT_FILE'); }

  // ─── _sfSyncCopyPromptBtn ─────────────────────────────────────────────────
  // Enables "Copy with Prompt" when either extracted content exists OR at least
  // one file attachment is present.  Must be called everywhere btnCopyPrompt
  // state changes: clearExtractedState, extraction success, restore, attach/detach.
  function _sfSyncCopyPromptBtn() {
    const btn = document.getElementById('sf-btn-copy-prompt');
    if (!btn) return;
    const hasContent = !!_lastRawText;
    const hasFiles   = _execAttachments.length > 0;
    btn.disabled = !(hasContent || hasFiles);
  }

  // ─── clearExtractedState ──────────────────────────────────────────────────
  function clearExtractedState() {
    const statusEl    = document.getElementById('sf-status');
    const previewEl   = document.getElementById('sf-preview');
    const btnCopy     = document.getElementById('sf-btn-copy');
    const btnDownload = document.getElementById('sf-btn-download');
    const inputEl     = document.getElementById('sf-case-number');

    if (statusEl)    statusEl.style.display = 'none';
    if (previewEl)   previewEl.value = '';
    if (btnCopy)     btnCopy.disabled = true;
    if (btnDownload) btnDownload.disabled = true;
    if (inputEl)     inputEl.value = '';
    _lastRawText  = '';
    _lastBaseText = '';
    _lastExtractionPosts = [];
    _sfSyncCopyPromptBtn();
    app().persistSfResult(null);
  }

  // ─── sfRefreshDetectionBanner ─────────────────────────────────────────────
  // Runs the full detection flow. bannerEl may be absent (e.g. when called from
  // the tab-change listeners while the Dashboard is shown instead of the SF
  // plugin page). All banner-specific calls are guarded with `if (bannerEl)` so
  // the function always proceeds to update #sf-widget-status regardless.
  async function sfRefreshDetectionBanner() {
    // Probe helper health on every navigate so Execute buttons reflect reality.
    sfCheckHelperHealth();
    // sf-tab-detection-banner removed in v1.43.4 - status now surfaces through
    // #sf-status-badge in the plugin header (same pattern as Cloudability OrgID).
    const badgeEl        = document.getElementById('sf-status-badge');
    const btnExtract     = document.getElementById('sf-btn-extract');
    const widgetStatusEl = document.getElementById('sf-widget-status');
    const caseRowEl      = document.getElementById('sf-case-row');

    function _setBadge(text, type) {
      if (!badgeEl) return;
      // type: 'success' -> green, 'error' -> red, 'neutral'/'checking' -> amber, hidden when empty
      const map = { success: 'rc-badge--green', error: 'rc-badge--red', neutral: 'rc-badge--amber' };
      badgeEl.textContent = text;
      badgeEl.className   = 'rc-badge ' + (map[type] || 'rc-badge--amber');
      badgeEl.style.display = text ? '' : 'none';
    }

    if (!pluginEnabled()) {
      clearExtractedState();
      _setBadge('Disabled', 'error');
      if (widgetStatusEl) widgetStatusEl.textContent = '\u274c Plugin disabled';
      if (btnExtract) btnExtract.disabled = true;
      return;
    }

    const selectEl = document.getElementById('sf-source-select');
    const isSearch = selectEl && selectEl.value === 'search';

    if (caseRowEl) caseRowEl.style.display = isSearch ? 'flex' : 'none';

    if (isSearch) {
      _setBadge('Search mode', 'neutral');
      if (widgetStatusEl) widgetStatusEl.textContent = '';
      if (btnExtract) btnExtract.disabled = false;
      return;
    }

    _setBadge('Checking\u2026', 'neutral');
    if (widgetStatusEl) widgetStatusEl.textContent = '\u23f3 Checking\u2026';

    const sfTab = await getActiveSalesforceTab();
    if (!sfTab) {
      _setBadge('No active tab', 'error');
      if (widgetStatusEl) widgetStatusEl.textContent = '\u274c No Salesforce tab open';
      if (btnExtract) btnExtract.disabled = true;
      return;
    }

    await safeInject(sfTab.id);
    const isCasePage = await new Promise(resolve => {
      chrome.tabs.sendMessage(
        sfTab.id,
        { type: 'SF_IS_CASE_PAGE', pluginId: plugin.id },
        response => {
          if (chrome.runtime.lastError || !response) { resolve(false); return; }
          resolve(!!response.isCasePage);
        }
      );
    });

    if (isCasePage) {
      _setBadge('Connected', 'success');
      if (widgetStatusEl) widgetStatusEl.textContent = '\u2705 Salesforce Case detected';
      if (btnExtract) btnExtract.disabled = false;
    } else {
      _setBadge('No active tab', 'error');
      if (widgetStatusEl) widgetStatusEl.textContent = '\u274c No Salesforce Case detected';
      if (btnExtract) btnExtract.disabled = true;
    }
  }

  // ─── Salesforce URL helper ────────────────────────────────────────────────
  // Single source of truth for "is this a Salesforce URL?" used by tab
  // listeners (pre-filter) and tab query functions (getSalesforceTabs,
  // getActiveSalesforceTab). Parses the hostname for exact boundary matching;
  // prevents substring spoofing (e.g. "notsalesforce.com" or a query param
  // containing "salesforce.com"). Issue #13 fix.
  //
  // Valid hostnames:
  //   salesforce.com, *.salesforce.com
  //   lightning.force.com, *.lightning.force.com
  function isSalesforceUrl(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname === 'salesforce.com'
        || hostname.endsWith('.salesforce.com')
        || hostname === 'lightning.force.com'
        || hostname.endsWith('.lightning.force.com');
    } catch (_) {
      return false; // unparseable URL - not Salesforce
    }
  }

  // ─── Tab change listeners for auto-detection ──────────────────────────────
  // Registered once from init() so the Dashboard widget stays accurate even
  // when the user never navigates to the SF plugin page.
  //
  // PERF-001 fix: onUpdated previously triggered on ANY tab URL change across
  // ALL windows (the `changeInfo.url` branch), initiating the full 4-step async
  // detection pipeline including an HTTP health probe on every SPA navigation.
  // Fixed by:
  //   (1) Removing the `|| changeInfo.url` branch - only `status === 'complete'`
  //       triggers detection (page fully loaded, not mid-SPA nav).
  //   (2) Adding a Salesforce URL pre-filter via isSalesforceUrl() - non-SF tabs
  //       are ignored before any async work is started.
  function registerTabListeners() {
    if (_tabListenersRegistered) return;
    _tabListenersRegistered = true;

    // Re-run detection whenever the active tab changes.
    // F-002: check the URL before triggering the full async detection pipeline.
    // For non-SF tabs: skip the pipeline entirely (no injection, no case-page check).
    // For SF tabs: run the full detection so the banner and widget stay accurate.
    // When the user switches away from a SF tab to a non-SF tab, the banner state
    // is already cleared by the preceding sfRefreshDetectionBanner call on that
    // SF tab's deactivation; no reset is needed here.
    chrome.tabs.onActivated.addListener(({ tabId }) => {
      chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError || !tab?.url) return;
        // Only trigger the detection pipeline when switching to a Salesforce tab.
        if (!isSalesforceUrl(tab.url)) return;
        sfRefreshDetectionBanner();
      });
    });

    // Trigger only on full page-load completion (not on SPA hash/pushState
    // changes which fire `changeInfo.url`). Pre-filter to Salesforce domains
    // so a user with 20+ tabs navigating SPAs does not trigger the detection
    // pipeline on every URL change.
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status !== 'complete') return;
      if (!isSalesforceUrl(tab?.url)) return;
      sfRefreshDetectionBanner();
    });

    app().addLog('debug', plugin.id, 'Tab change listeners registered for auto-detection');
  }

  // ─── Bob Helper server health check ──────────────────────────────────────
  // Probes GET /health via background.js (RC_BOB_HEALTH). Updates _helperHealthy
  // and refreshes the visual state of all Execute buttons currently in the DOM.
  //
  // PERF-006 fix: the previous implementation issued an unconditional 3-second
  // timeout HTTP probe on every SF view navigate (and on every tab event when
  // tab listeners fired sfRefreshDetectionBanner). Each failed probe held a
  // background message channel slot open for the full 3-second timeout.
  //
  // Fix: add a 30-second cool-down. If the health state is already known and the
  // last probe completed less than 30 seconds ago, skip the network round-trip.
  // The probe always runs when state is unknown (first call) and when the user
  // explicitly clicks Execute (force=true). On state-change the log is emitted.
  const HEALTH_COOLDOWN_MS = 30_000;

  function sfCheckHelperHealth(force) {
    // Skip if we already probed within the cool-down window (unless forced).
    if (!force && _helperHealthy !== null && (Date.now() - _lastHealthCheckAt) < HEALTH_COOLDOWN_MS) {
      return;
    }
    chrome.runtime.sendMessage({ type: 'RC_BOB_HEALTH' }, response => {
      if (chrome.runtime.lastError) {
        // background.js unreachable - treat as unknown, don't block
        _helperHealthy = null;
        return;
      }
      const wasHealthy = _helperHealthy;
      // CF1 fix: check response.ready (bob.ps1 found) in addition to response.ok (server reachable).
      // response.ready === false means the server is up but bob.ps1 is not on PATH -
      // treat as unhealthy so the Execute button reflects the true readiness state.
      _helperHealthy    = !!(response?.ok && response?.ready !== false);
      _lastHealthCheckAt = Date.now(); // record probe completion time for cool-down
      _applyHelperHealthToExecBtns();

      // Log only when state changes to avoid spamming the activity log
      if (wasHealthy !== _helperHealthy) {
        if (_helperHealthy) {
          // Use response.port when present (v1.27.4+) so the log reflects the actual port if
          // REPLYCATORS_BOB_HELPER_PORT was changed from the default.
          const portLabel = response?.port || 47123;
          app().addLog('info', plugin.id, 'Bob Helper server is running (port ' + portLabel + ')');
        } else {
          const reason = response?.ready === false
            ? 'Bob CLI (bob.ps1) not found on PATH - install Bob and restart the helper server'
            : (response?.error || 'unknown');
          app().addLog('warn', plugin.id, 'Bob Helper server not reachable: ' + reason +
            ' - run tools/bob-helper.ps1 start before using Execute');
        }
      }
    });
  }

  // Returns true when a non-empty working directory has been configured.
  function _isBobWorkingDirConfigured() {
    return typeof _bobWorkingDir === 'string' && _bobWorkingDir.trim().length > 0;
  }

  // Returns true when the API key requirement is satisfied.
  // Satisfied when: Bob 1.0 mode is active OR a non-empty key has been provided.
  function _isBobApiKeyReady() {
    if (_bobUseBob1) return true;
    return typeof _bobApiKey === 'string' && _bobApiKey.trim().length > 0;
  }

  // Updates the title/disabled state of every Execute button in the SF view
  // to reflect both the Bob Helper server health AND the working directory + API key config.
  function _applyHelperHealthToExecBtns() {
    const execBtns = document.querySelectorAll('[id$="-exec-btn"]');
    execBtns.forEach(btn => {
      if (!_isBobWorkingDirConfigured()) {
        btn.title = 'Bob Working Directory is not configured. Set it in Settings - Salesforce Case Extractor.';
        btn.classList.add('rc-btn--helper-down');
        btn.disabled = true;
      } else if (!_isBobApiKeyReady()) {
        btn.title = 'BobShell 2.0 API key is not set. Add it in Settings - Salesforce Case Extractor, or check "API key not required" for Bob 1.0.';
        btn.classList.add('rc-btn--helper-down');
        btn.disabled = true;
      } else if (_helperHealthy === false) {
        btn.title = 'Bob Helper server is not running. Run: powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start';
        btn.classList.add('rc-btn--helper-down');
        btn.disabled = false;
      } else {
        btn.title = '';
        btn.classList.remove('rc-btn--helper-down');
        btn.disabled = false;
      }
    });
  }

  // ─── Tab switching ────────────────────────────────────────────────────────
  // Uses .rc-plugin-tab / .rc-plugin-tab--active (platform standard, v1.43.0).
  function _sfSwitchTab(tabId) {
    document.querySelectorAll('.rc-plugin-tab[data-tab]').forEach(t => {
      const isActive = t.dataset.tab === tabId;
      t.classList.toggle('rc-plugin-tab--active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    // Panel activation uses rc-plugin-tab-panel--active (platform standard, v1.43.5).
    // rc-plugin-tab-panel--overflow-hidden modifier on #tab-extract preserves inner scroll.
    ['extract', 'management', 'history'].forEach(id => {
      const panel = document.getElementById('tab-' + id);
      if (panel) panel.classList.toggle('rc-plugin-tab-panel--active', id === tabId);
    });
  }

  // ─── Prompt persistence ───────────────────────────────────────────────────
  function persistPrompts(prompts) {
    _promptSaveLock = _promptSaveLock.then(() => new Promise((resolve, reject) => {
      chrome.storage.local.getBytesInUse(null, bytes => {
        if (bytes > 4.5 * 1024 * 1024) {
          const msg = 'Storage limit approaching (' + Math.round(bytes / 1024) + ' KB). Delete some prompts to free space.';
          app().addLog('warn', plugin.id, 'Storage quota: ' + msg);
          app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
          reject(new Error(msg));
          return;
        }
        chrome.storage.local.set({ [sfPromptsKey()]: prompts }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    }));
    return _promptSaveLock;
  }

  // ─── Attachment name helper ───────────────────────────────────────────────
  // Returns the display/label name for an attachment slot.
  // When _bobWorkingDir is configured, prepends it so the full path is stored
  // in the slot and appears as the label in the prompt sent to bob.
  // When not configured, returns the bare filename (browser default behaviour).
  function _sfAttachName(basename) {
    const dir = _bobWorkingDir.trim();
    if (!dir) return basename;
    // Normalise to Windows-style backslash separator; strip any trailing separator.
    const normDir = dir.replace(/\/+$/, '').replace(/\\+$/, '');
    return normDir + '\\' + basename;
  }

  // ─── Unified Execution Panel ──────────────────────────────────────────────
  //
  // Renders the IDENTICAL execution UI for every prompt.
  // Switching prompts changes only the panel title - never the structure,
  // never the controls, never the attachment model.
  //
  // Supports:
  //   • 0-MAX_ATTACHMENTS file attachments (any file type - no restrictions)
  //   • One "Additional Requests" free-text area
  //   • Execute button
  //   • Status display
  //
  // panelId: 'exec' | 'lib'   - determines which attachment/additional state arrays to use
  // container: element to render into
  // prompt: the currently selected prompt (used only for title + body)
  // statusEl: element for status messages (may be null - panel creates its own)
  //
  function renderUnifiedExecPanel(panelId, container, prompt, statusEl) {
    // Always uses Extract tab state (Library tab removed)
    const attachState   = _execAttachments;
    const getAdditional = () => _execAdditional;
    const setAdditional = v => { _execAdditional = v; };

    // Clear container
    while (container.firstChild) container.removeChild(container.firstChild);

    // ── Prompt title row ─────────────────────────────────────────────────────
    const titleEl = document.createElement('div');
    titleEl.className = 'sf-exec-panel__title';
    titleEl.id        = panelId + '-unified-title';
    titleEl.textContent = prompt ? prompt.title : '';
    container.appendChild(titleEl);

    // ── Attachment section ────────────────────────────────────────────────────
    const attachSection = document.createElement('div');
    attachSection.className = 'sf-unified-attach-section';

    const attachHeader = document.createElement('div');
    attachHeader.className = 'sf-unified-attach-header';
    const attachLabel = document.createElement('span');
    attachLabel.className = 'sf-unified-attach-label';
    attachLabel.textContent = 'Attachments';
    const attachCount = document.createElement('span');
    attachCount.className = 'sf-unified-attach-count';
    attachCount.id = panelId + '-attach-count';
    attachCount.textContent = attachState.length + ' / ' + MAX_ATTACHMENTS;
    attachHeader.appendChild(attachLabel);
    attachHeader.appendChild(attachCount);
    attachSection.appendChild(attachHeader);

    // File list
    const fileList = document.createElement('div');
    fileList.className = 'sf-unified-file-list';
    fileList.id = panelId + '-file-list';
    attachSection.appendChild(fileList);

    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type     = 'file';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.setAttribute('aria-hidden', 'true');
    attachSection.appendChild(fileInput);

    // Add attachment button
    const addBtn = document.createElement('button');
    addBtn.className = 'rc-btn rc-btn--secondary rc-btn--xs sf-unified-add-btn';
    addBtn.id        = panelId + '-add-attach-btn';
    addBtn.textContent = '+ Add File';
    addBtn.title       = _isBobWorkingDirConfigured()
      ? 'Add up to ' + MAX_ATTACHMENTS + ' files - select files from ' + _bobWorkingDir.trim()
      : 'Add up to ' + MAX_ATTACHMENTS + ' files - any format';
    attachSection.appendChild(addBtn);

    container.appendChild(attachSection);

    // ── Additional Requests ───────────────────────────────────────────────────
    const addlSection = document.createElement('div');
    addlSection.className = 'sf-unified-addl-section';

    const addlLabel = document.createElement('div');
    addlLabel.className = 'sf-exec-panel__label';
    addlLabel.textContent = 'Additional Requests';
    addlSection.appendChild(addlLabel);

    const addlSub = document.createElement('div');
    addlSub.className = 'sf-exec-panel__sub';
    addlSub.textContent = 'Optional instructions appended to the prompt';
    addlSection.appendChild(addlSub);

    const addlTa = document.createElement('textarea');
    addlTa.className   = 'rc-textarea sf-unified-addl-textarea';
    addlTa.rows        = 2;
    addlTa.placeholder = 'Optional instructions\u2026';
    addlTa.value       = getAdditional();
    addlTa.addEventListener('input', () => {
      setAdditional(addlTa.value);
      
      // Debounce: only write to storage after 1 second of inactivity
      clearTimeout(_additionalInstructionsWriteTimer);
      _additionalInstructionsWriteTimer = setTimeout(() => {
        const key = sfKey('additional-instructions');
        chrome.storage.local.set({ [key]: addlTa.value }, () => {
          if (chrome.runtime.lastError) {
            app().addLog('warning', plugin.id, 'Failed to persist additional instructions: ' + chrome.runtime.lastError.message);
          }
        });
      }, 1000);
    });
    addlSection.appendChild(addlTa);

    container.appendChild(addlSection);

    // ── Execute button ────────────────────────────────────────────────────────
    const btnRow = document.createElement('div');
    btnRow.className = 'sf-unified-btn-row';

    const execBtn = document.createElement('button');
    execBtn.className = 'rc-btn rc-btn--primary rc-btn--xs';
    execBtn.id        = panelId + '-exec-btn';
    execBtn.innerHTML = '\u25b6 Execute';
    btnRow.appendChild(execBtn);

    container.appendChild(btnRow);

    // ── Status ────────────────────────────────────────────────────────────────
    // Use the provided statusEl if given; otherwise create one inside the container.
    let panelStatusEl = statusEl;
    if (!panelStatusEl) {
      panelStatusEl = document.createElement('div');
      panelStatusEl.className  = 'rc-status-bar';
      panelStatusEl.style.display = 'none';
      panelStatusEl.style.marginTop = '5px';
      container.appendChild(panelStatusEl);
    }

    // ── Event: add files ──────────────────────────────────────────────────────
    addBtn.addEventListener('click', () => {
      if (attachState.length >= MAX_ATTACHMENTS) {
        _setSt(panelStatusEl, '\u274c Maximum ' + MAX_ATTACHMENTS + ' attachments reached.', 'err');
        return;
      }
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      const rejected = [];
      files.forEach(file => {
        if (attachState.length >= MAX_ATTACHMENTS) {
          rejected.push(file.name);
          return;
        }
        // Change D: validate each file before accepting.
        // Zero-byte files produce empty attachment lines - reject early.
        if (file.size === 0) {
          rejected.push(file.name + ' (empty file)');
          return;
        }
        // Files larger than MAX_PROMPT_SIZE_BYTES cannot fit in the prompt anyway.
        if (file.size > MAX_PROMPT_SIZE_BYTES) {
          rejected.push(file.name + ' (exceeds ' + (MAX_PROMPT_SIZE_BYTES / (1024 * 1024)).toFixed(0) + 'MB limit)');
          return;
        }
        attachState.push({ file, name: _sfAttachName(file.name) });
      });
      fileInput.value = '';
      _renderFileList(panelId, fileList, attachCount, attachState, panelStatusEl, execBtn);
      _sfSyncCopyPromptBtn();
      if (rejected.length > 0) {
        _setSt(panelStatusEl, '\u26a0\ufe0f ' + rejected.length + ' file(s) skipped: ' + rejected.join('; '), 'warn');
      }
    });

    // ── Initial render of any previously-attached files ───────────────────────
    _renderFileList(panelId, fileList, attachCount, attachState, panelStatusEl, execBtn);

    // ── Execute handler ───────────────────────────────────────────────────────
    execBtn.addEventListener('click', () => {
      if (!prompt) {
        _setSt(panelStatusEl, '\u274c No prompt selected.', 'err');
        return;
      }

      // Pre-flight: Bob Working Directory must be configured.
      if (!_isBobWorkingDirConfigured()) {
        _setSt(panelStatusEl,
          '\u274c Bob Working Directory is not configured. Set it in Settings - Salesforce Case Extractor.',
          'err');
        return;
      }

      // Pre-flight: API key must be ready (unless Bob 1.0 mode is active).
      if (!_isBobApiKeyReady()) {
        _setSt(panelStatusEl,
          '\u274c BobShell 2.0 API key is not set. Add it in Settings - Salesforce Case Extractor, or check "API key not required" for Bob 1.0.',
          'err');
        return;
      }

      _setSt(panelStatusEl, '\u23f3 Preparing prompt\u2026', '');
      execBtn.disabled = true;

      // Always issue a fresh health probe before executing.  The probe is async -
      // we wait for its result in the callback before proceeding.  This eliminates
      // the race where a stale _helperHealthy === false (from an earlier failed
      // background probe) would block execution even though the server is now running.
      chrome.runtime.sendMessage({ type: 'RC_BOB_HEALTH' }, healthResponse => {
        if (chrome.runtime.lastError || !healthResponse?.ok) {
          execBtn.disabled = false;
          _helperHealthy = false;
          _lastHealthCheckAt = Date.now();
          _applyHelperHealthToExecBtns();
          _setSt(panelStatusEl,
            '\u274c Bob Helper server is not running. Run: powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start',
            'err');
          return;
        }

        // CF1 fix: gate on response.ready as well as response.ok.
        // ready === false means server is up but bob.ps1 not found - block Execute.
        if (healthResponse?.ready === false) {
          execBtn.disabled = false;
          _helperHealthy = false;
          _lastHealthCheckAt = Date.now();
          _applyHelperHealthToExecBtns();
          _setSt(panelStatusEl,
            '\u274c IBM Bob CLI (bob.ps1) not found on PATH. Install Bob and restart the helper server.',
            'err');
          return;
        }

        // Server confirmed healthy and Bob CLI found - update cached state.
        _helperHealthy = true;
        _lastHealthCheckAt = Date.now();
        _applyHelperHealthToExecBtns();

      const additional = getAdditional().trim();

      // Case data from sf-preview - only included when no files are attached.
      const caseData = (document.getElementById('sf-preview')?.value || '').trim();

      // Files: use paths only - do NOT read file contents.
      // Bob receives the file paths inline in the prompt and reads the files
      // itself via --include-directories="<workingDir>".  Embedding file
      // content via FileReader would duplicate the data Bob already has access
      // to, and would include the full case text when the attached file IS
      // the case export (e.g. TS022749108.txt).
      const hasFiles = attachState.length > 0;
      const filePaths = hasFiles
        ? attachState.map(a => '"' + a.name + '"').join(', ')
        : '';

      // Guard: refuse to execute if there is nothing to work with.
      if (!hasFiles && !caseData) {
        execBtn.disabled = false;
        _setSt(panelStatusEl,
          '\u274c No case data. Extract a case first, or re-attach your file - attachments are cleared when the extension is closed.',
          'err');
        return;
      }

      // Files attached  → prompt body + file paths; case data suppressed.
      // No files        → prompt body + case data.
      const assembled = hasFiles
        ? buildAssembledPrompt(prompt.body + ' ' + filePaths, '', additional, '')
        : buildAssembledPrompt(prompt.body, '', additional, caseData);

      // Change G: use Blob.size for accurate UTF-8 byte count.
      // assembled.length is char count (UTF-16 code units), not bytes.
      // new Blob([assembled]).size returns the correct UTF-8 encoded byte length.
      const assembledByteSize = new Blob([assembled]).size;

      // Guard: validate total assembled prompt size before dispatch.
      if (assembledByteSize > MAX_PROMPT_SIZE_BYTES) {
        execBtn.disabled = false;
        const sizeInMb = (assembledByteSize / (1024 * 1024)).toFixed(1);
        const limitInMb = (MAX_PROMPT_SIZE_BYTES / (1024 * 1024)).toFixed(1);
        _setSt(panelStatusEl,
          '\u274c Assembled prompt exceeds ' + limitInMb + 'MB limit (current: ' + sizeInMb + 'MB). Remove attachments or additional instructions.',
          'err');
        app().addLog('error', plugin.id, 'Prompt size validation failed: ' + sizeInMb + 'MB > ' + limitInMb + 'MB limit');
        return;
      }

      execBtn.disabled = false;
      sfExecuteWithBob(assembled, panelStatusEl, _bobWorkingDir.trim(), _sfDiagnosticMode, _bobUseBob1 ? '' : _bobApiKey);

      }); // end RC_BOB_HEALTH callback
    });
  }

  // ── Helper: render the attachment file list ──────────────────────────────
  function _renderFileList(panelId, listEl, countEl, attachState, statusEl, execBtn) {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    countEl.textContent = attachState.length + ' / ' + MAX_ATTACHMENTS;

    if (attachState.length === 0) return;

    attachState.forEach((slot, idx) => {
      const row = document.createElement('div');
      row.className = 'sf-unified-file-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'sf-unified-file-name';
      // Display only the basename for readability; show full path in tooltip.
      const baseName = slot.name.replace(/^.*[\\/]/, '');
      nameEl.textContent = slot.name.includes('\\') || slot.name.includes('/')
        ? baseName + '  -  ' + slot.name
        : slot.name;
      nameEl.title = slot.name;
      row.appendChild(nameEl);

      // Replace button
      const replaceInput = document.createElement('input');
      replaceInput.type  = 'file';
      replaceInput.style.display = 'none';
      replaceInput.setAttribute('aria-hidden', 'true');
      replaceInput.addEventListener('change', () => {
        const f = replaceInput.files?.[0];
        if (!f) return;
        attachState[idx] = { file: f, name: _sfAttachName(f.name) };
        replaceInput.value = '';
        _renderFileList(panelId, listEl, countEl, attachState, statusEl, execBtn);
      });
      row.appendChild(replaceInput);

      const replaceBtn = document.createElement('button');
      replaceBtn.className   = 'rc-btn rc-btn--ghost rc-btn--xs';
      replaceBtn.textContent = '\u21ba';
      replaceBtn.title       = 'Replace file';
      replaceBtn.addEventListener('click', () => { replaceInput.value = ''; replaceInput.click(); });
      row.appendChild(replaceBtn);

      // Move up
      const upBtn = document.createElement('button');
      upBtn.className   = 'rc-btn rc-btn--ghost rc-btn--xs';
      upBtn.textContent = '\u2191';
      upBtn.title       = 'Move up';
      upBtn.disabled    = idx === 0;
      upBtn.addEventListener('click', () => {
        if (idx === 0) return;
        const tmp = attachState[idx - 1];
        attachState[idx - 1] = attachState[idx];
        attachState[idx]     = tmp;
        _renderFileList(panelId, listEl, countEl, attachState, statusEl, execBtn);
      });
      row.appendChild(upBtn);

      // Move down
      const downBtn = document.createElement('button');
      downBtn.className   = 'rc-btn rc-btn--ghost rc-btn--xs';
      downBtn.textContent = '\u2193';
      downBtn.title       = 'Move down';
      downBtn.disabled    = idx === attachState.length - 1;
      downBtn.addEventListener('click', () => {
        if (idx >= attachState.length - 1) return;
        const tmp = attachState[idx + 1];
        attachState[idx + 1] = attachState[idx];
        attachState[idx]     = tmp;
        _renderFileList(panelId, listEl, countEl, attachState, statusEl, execBtn);
      });
      row.appendChild(downBtn);

      // Remove
      const removeBtn = document.createElement('button');
      removeBtn.className   = 'rc-btn rc-btn--ghost rc-btn--xs';
      removeBtn.textContent = '\u2715';
      removeBtn.title       = 'Remove';
      removeBtn.addEventListener('click', () => {
        attachState.splice(idx, 1);
        _renderFileList(panelId, listEl, countEl, attachState, statusEl, execBtn);
        _sfSyncCopyPromptBtn();
      });
      row.appendChild(removeBtn);

      listEl.appendChild(row);
    });
  }

  // ── Helper: set status bar message ──────────────────────────────────────
  function _setSt(el, msg, cls) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'rc-status-bar' + (cls ? ' ' + cls : '');
    el.style.display = msg ? '' : 'none';
  }

  // ─── Show exec panel (Extract tab right column) ───────────────────────────
  function _sfShowExecPanel(promptId) {
    const panel     = document.getElementById('sf-exec-panel');
    const dynFields = document.getElementById('exec-fields-dynamic');
    const statusEl  = document.getElementById('sf-exec-status');
    if (!panel || !dynFields) return;

    _sfActiveExecPromptId = promptId || null;

    if (!promptId) {
      panel.style.display = 'none';
      return;
    }

    const prompt = currentPrompts.find(p => p.id === promptId);
    if (!prompt) { panel.style.display = 'none'; return; }

    panel.style.display = '';
    renderUnifiedExecPanel('exec', dynFields, prompt, statusEl);
  }

  // ─── Prompt form helpers ──────────────────────────────────────────────────
  function validatePromptForm() {
    const titleEl = document.getElementById('sf-prompt-title');
    const bodyEl  = document.getElementById('sf-prompt-body');
    const title   = titleEl ? titleEl.value.trim() : '';
    const body    = bodyEl  ? bodyEl.value.trim()  : '';
    const errors  = [];
    if (!title)              errors.push('Title cannot be empty.');
    if (title.length > 100)  errors.push('Title cannot exceed 100 characters.');
    if (!body)               errors.push('Body cannot be empty.');
    if (body.length > 10000) errors.push('Body cannot exceed 10,000 characters.');
    return { valid: errors.length === 0, title, body, errors };
  }

  function showMgmtStatus(type, msg) {
    const el = document.getElementById('sf-mgmt-status');
    if (!el) return;
    el.textContent = msg;
    const cls = { ok: 'ok', warn: 'warn', err: 'err', info: 'info' }[type] || '';
    el.className = 'rc-status-bar' + (cls ? ' ' + cls : '');
    el.style.display = '';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 3000);
  }

  function _sfToggleAddForm(open) {
    const form  = document.getElementById('sf-add-form');
    const arrow = document.getElementById('sf-add-arrow');
    if (!form) return;
    if (open === undefined) open = !form.classList.contains('open');
    form.classList.toggle('open', open);
    if (arrow) arrow.textContent = open ? '\u25b2' : '\u25bc';
    if (!open) {
      const titleInput = document.getElementById('sf-prompt-title');
      const bodyInput  = document.getElementById('sf-prompt-body');
      const errEl      = document.getElementById('sf-add-form-error');
      const submitBtn  = document.getElementById('sf-prompt-submit');
      if (titleInput) titleInput.value = '';
      if (bodyInput)  bodyInput.value  = '';
      if (errEl)      { errEl.textContent = ''; errEl.style.display = 'none'; }
      if (submitBtn)  { submitBtn.textContent = '\u2713 Save Prompt'; _sfEditingId = null; }
    }
  }

  // ─── Prompt management list rendering ────────────────────────────────────
  //
  // All prompts are:
  //   - editable (title + body)
  //   - reorderable (move up / move down)
  //   - duplicatable
  //   - deletable
  // ─────────────────────────────────────────────────────────────────────────
  function renderPromptManagementList(prompts) {
    const tbody   = document.getElementById('sf-mgmt-tbody');
    const emptyEl = document.getElementById('sf-mgmt-empty');
    if (!tbody) return;

    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    const total = prompts.length;

    prompts.forEach((prompt, idx) => {
      const tr = document.createElement('tr');

      // Name
      const tdName = document.createElement('td');
      tdName.className = 'td-name';
      tdName.textContent = prompt.title;
      tr.appendChild(tdName);

      // Order position
      const tdOrder = document.createElement('td');
      tdOrder.className = 'td-order';
      tdOrder.textContent = String(idx + 1);
      tr.appendChild(tdOrder);

      // Actions
      const tdActions = document.createElement('td');
      tdActions.className = 'td-actions';

      function makeBtn(label, title, extraCls, disabled) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.className = 'rc-btn rc-btn--ghost rc-btn--xs';
        if (extraCls) btn.classList.add(extraCls);
        if (disabled) btn.disabled = true;
        return btn;
      }

      const upBtn  = makeBtn('\u2191', 'Move up',   '', idx === 0);
      const dnBtn  = makeBtn('\u2193', 'Move down', '', idx === total - 1);
      const editBtn = makeBtn('Edit',      'Edit prompt',      '', false);
      const dupBtn  = makeBtn('Duplicate', 'Duplicate prompt', '', false);
      const delBtn  = makeBtn('Delete',    'Delete prompt',    '', false);
      delBtn.classList.replace('rc-btn--ghost', 'rc-btn--danger');

      tdActions.appendChild(upBtn);
      tdActions.appendChild(dnBtn);
      tdActions.appendChild(editBtn);
      tdActions.appendChild(dupBtn);
      tdActions.appendChild(delBtn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);

      // ── Move up ──────────────────────────────────────────────────────
      upBtn.addEventListener('click', () => {
        if (idx === 0) return;
        const moved = currentPrompts.slice();
        [moved[idx - 1], moved[idx]] = [moved[idx], moved[idx - 1]];
        persistPrompts(moved).then(() => {
          currentPrompts = moved;
          renderPromptManagementList(moved);
          renderAllPromptUIs(moved);
        }).catch(err => showMgmtStatus('err', '\u274c Move failed: ' + (err.message || err)));
      });

      // ── Move down ─────────────────────────────────────────────────────
      dnBtn.addEventListener('click', () => {
        if (idx >= total - 1) return;
        const moved = currentPrompts.slice();
        [moved[idx + 1], moved[idx]] = [moved[idx], moved[idx + 1]];
        persistPrompts(moved).then(() => {
          currentPrompts = moved;
          renderPromptManagementList(moved);
          renderAllPromptUIs(moved);
        }).catch(err => showMgmtStatus('err', '\u274c Move failed: ' + (err.message || err)));
      });

      // ── Edit ──────────────────────────────────────────────────────────
      editBtn.addEventListener('click', () => {
        const titleInput = document.getElementById('sf-prompt-title');
        const bodyInput  = document.getElementById('sf-prompt-body');
        const submitBtn  = document.getElementById('sf-prompt-submit');
        if (titleInput) titleInput.value = prompt.title;
        if (bodyInput)  bodyInput.value  = prompt.body;
        if (submitBtn)  { submitBtn.textContent = '\u2713 Update Prompt'; _sfEditingId = prompt.id; }
        _sfToggleAddForm(true);
        if (titleInput) titleInput.focus();
      });

      // ── Duplicate ────────────────────────────────────────────────────
      dupBtn.addEventListener('click', () => {
        const now = Date.now();
        const copy = {
          id:        'prompt-user-' + now,
          title:     prompt.title + ' (copy)',
          body:      prompt.body,
          createdAt: now,
          updatedAt: now,
        };
        const updated = currentPrompts.slice();
        updated.splice(idx + 1, 0, copy);
        persistPrompts(updated).then(() => {
          currentPrompts = updated;
          renderPromptManagementList(updated);
          renderAllPromptUIs(updated);
          showMgmtStatus('ok', '\u2713 "' + copy.title + '" created.');
        }).catch(err => showMgmtStatus('err', '\u274c Duplicate failed: ' + (err.message || err)));
      });

      // ── Delete ───────────────────────────────────────────────────────
      {
        const confirmRow = document.createElement('tr');
        confirmRow.className = 'sf-confirm-row';
        confirmRow.id = 'mgmt-confirm-' + prompt.id;
        confirmRow.setAttribute('role', 'alertdialog');
        confirmRow.setAttribute('aria-label', 'Confirm deletion of "' + prompt.title + '"');

        const confirmTd = document.createElement('td');
        confirmTd.colSpan = 4;
        const inner = document.createElement('div');
        inner.className = 'sf-confirm-inner';
        const msgSpan = document.createElement('span');
        msgSpan.className = 'sf-confirm-msg';
        msgSpan.textContent = '\u26a0\ufe0f Delete "' + prompt.title + '"? This cannot be undone.';
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'rc-btn rc-btn--danger rc-btn--xs';
        confirmBtn.textContent = 'Confirm Delete';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'rc-btn rc-btn--ghost rc-btn--xs';
        cancelBtn.textContent = 'Cancel';
        inner.appendChild(msgSpan);
        inner.appendChild(confirmBtn);
        inner.appendChild(cancelBtn);
        confirmTd.appendChild(inner);
        confirmRow.appendChild(confirmTd);
        tbody.appendChild(confirmRow);

        delBtn.addEventListener('click',    () => { confirmRow.style.display = 'table-row'; });
        cancelBtn.addEventListener('click', () => {
          confirmRow.style.display = 'none';
          document.removeEventListener('keydown', escHandler);
        });
        function escHandler(e) {
          if (e.key === 'Escape' && confirmRow.style.display === 'table-row') {
            confirmRow.style.display = 'none';
            document.removeEventListener('keydown', escHandler);
          }
        }
        document.addEventListener('keydown', escHandler);
        confirmBtn.addEventListener('click', () => {
          const updated = currentPrompts.filter(p => p.id !== prompt.id);
          persistPrompts(updated).then(() => {
            currentPrompts = updated;
            renderPromptManagementList(updated);
            renderAllPromptUIs(updated);
            showMgmtStatus('ok', '\u2713 "' + prompt.title + '" deleted.');
          }).catch(err => showMgmtStatus('err', '\u274c Delete failed: ' + (err.message || err)));
        });
      }
    });

    if (emptyEl) emptyEl.style.display = prompts.length === 0 ? '' : 'none';
  }

  // ─── Prompt pick list (Extract tab right column) ──────────────────────────
  function renderExtractPromptPicks(prompts) {
    const container = document.getElementById('sf-prompt-list-scroll');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    prompts.forEach(prompt => {
      const item = document.createElement('div');
      item.className = 'sf-prompt-pick-item';
      item.id = 'pick-' + prompt.id;
      item.dataset.promptId = prompt.id;

      const radioId = 'radio-' + prompt.id;
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'prompt-pick'; radio.className = 'sf-prompt-radio';
      radio.id = radioId; radio.value = prompt.id;
      radio.setAttribute('aria-label', prompt.title);

      const label = document.createElement('label');
      label.htmlFor = radioId;
      label.style.cssText = 'cursor:pointer;flex:1;';
      label.textContent = prompt.title;

      item.appendChild(radio);
      item.appendChild(label);

      item.addEventListener('click', () => {
        document.querySelectorAll('.sf-prompt-pick-item').forEach(i => i.classList.remove('is-selected'));
        item.classList.add('is-selected');
        radio.checked = true;
        _sfShowExecPanel(prompt.id);
        chrome.storage.local.set({ [sfSelPromptKey()]: prompt.id });
      });

      container.appendChild(item);
    });
  }

  function renderAllPromptUIs(prompts) {
    renderExtractPromptPicks(prompts);
  }

  // ─── initSfPrompts - seeding, restore, management bindings ───────────────
  function initSfPrompts(restoredV4) {
    chrome.storage.local.get([sfSeededKey(), sfPromptsKey()], stored => {
      const seeded  = stored[sfSeededKey()];
      const prompts = stored[sfPromptsKey()];

      if (!seeded) {
        const seedObj = { [sfPromptsKey()]: SF_DEFAULT_PROMPTS, [sfSeededKey()]: true };
        chrome.storage.local.set(seedObj, () => app().addLog('info', plugin.id, 'Prompts seeded (' + SF_DEFAULT_PROMPTS.length + ')'));
        currentPrompts = SF_DEFAULT_PROMPTS.map(p => normalisePrompt(Object.assign({}, p)));
      } else {
        const raw   = Array.isArray(prompts) ? prompts : SF_DEFAULT_PROMPTS.slice();
        const valid = raw
          .filter(p => p && typeof p.id === 'string' && p.id && typeof p.title === 'string' && p.title && typeof p.body === 'string')
          .map(p => normalisePrompt(p));
        if (valid.length !== raw.length) {
          app().addLog('warn', plugin.id, 'Filtered ' + (raw.length - valid.length) + ' invalid prompt(s)');
          app().addNotification('Salesforce Case Extractor', 'Some stored prompts were invalid and were removed.', 'warning', plugin.id);
          chrome.storage.local.set({ [sfPromptsKey()]: valid });
        }
        currentPrompts = valid.length > 0 ? valid : SF_DEFAULT_PROMPTS.map(p => normalisePrompt(Object.assign({}, p)));
      }

      renderPromptManagementList(currentPrompts);
      renderAllPromptUIs(currentPrompts);

      // Restore selected prompt
      const restoredSelectedPrompt = restoredV4?.selectedPrompt;
      if (restoredSelectedPrompt) {
        const exists   = currentPrompts.some(p => p.id === restoredSelectedPrompt);
        const targetId = exists ? restoredSelectedPrompt : (currentPrompts[0]?.id || null);
        if (targetId) {
          const pickItem = document.getElementById('pick-' + targetId);
          if (pickItem) {
            pickItem.classList.add('is-selected');
            const radio = document.getElementById('radio-' + targetId);
            if (radio) radio.checked = true;
            _sfShowExecPanel(targetId);
          }
        }
      }

      // Add / Edit form bindings
      document.getElementById('sf-add-trigger')?.addEventListener('click', () => _sfToggleAddForm());
      document.getElementById('sf-prompt-cancel')?.addEventListener('click', () => _sfToggleAddForm(false));

      const submitBtn = document.getElementById('sf-prompt-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const errEl  = document.getElementById('sf-add-form-error');
          const result = validatePromptForm();
          if (!result.valid) {
            if (errEl) { errEl.textContent = result.errors[0]; errEl.style.display = ''; }
            return;
          }
          if (errEl) errEl.style.display = 'none';
          const now = Date.now();

          if (_sfEditingId) {
            const updated = currentPrompts.map(p =>
              p.id === _sfEditingId
                ? { id: p.id, title: result.title, body: result.body, createdAt: p.createdAt, updatedAt: now }
                : p
            );
            persistPrompts(updated).then(() => {
              currentPrompts = updated;
              renderPromptManagementList(updated); renderAllPromptUIs(updated);
              showMgmtStatus('ok', '\u2713 "' + result.title + '" updated.');
              _sfToggleAddForm(false);
            }).catch(err => { if (errEl) { errEl.textContent = '\u274c Save failed: ' + (err.message || err); errEl.style.display = ''; } });
          } else {
            const newPrompt = { id: 'prompt-user-' + now, title: result.title, body: result.body, createdAt: now, updatedAt: now };
            const updated   = currentPrompts.concat([newPrompt]);
            persistPrompts(updated).then(() => {
              currentPrompts = updated;
              renderPromptManagementList(updated); renderAllPromptUIs(updated);
              showMgmtStatus('ok', '\u2713 "' + result.title + '" saved.');
              _sfToggleAddForm(false);
            }).catch(err => { if (errEl) { errEl.textContent = '\u274c Save failed: ' + (err.message || err); errEl.style.display = ''; } });
          }
        });
      }
    });
  }

  // ─── Download history ─────────────────────────────────────────────────────
  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10)  return 'just now';
    if (secs < 60)  return secs + ' sec ago';
    const mins = Math.floor(secs / 60);
    if (mins < 60)  return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago';
    const days = Math.floor(hrs / 24);
    return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  }

  function renderDownloadInfo(record) {
    const table      = document.getElementById('sf-dl-table');
    const emptyEl    = document.getElementById('sf-dl-empty');
    const filenameEl = document.getElementById('dl-filename');
    const badgeEl    = document.getElementById('dl-badge');
    const pathEl     = document.getElementById('dl-path');
    const timeEl     = document.getElementById('dl-time');

    if (!record) {
      if (table)   table.style.display   = 'none';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }

    if (table)   table.style.display   = '';
    if (emptyEl) emptyEl.style.display = 'none';

    const STATE_LABEL = { pending: 'Pending', complete: 'Downloaded', interrupted: 'Interrupted', cancelled: 'Cancelled' };
    const STATE_CLASS = { pending: 'pending', complete: 'complete', interrupted: 'interrupted', cancelled: 'cancelled' };

    if (filenameEl) filenameEl.textContent = record.filename || '-';
    if (badgeEl) {
      badgeEl.textContent = STATE_LABEL[record.state] || record.state;
      badgeEl.className   = 'sf-dl-badge ' + (STATE_CLASS[record.state] || '');
    }
    if (pathEl) {
      const short = record.fullPath ? record.fullPath.replace(/.*[\\/]/, '\u2026\\') : '-';
      pathEl.textContent = short;
      pathEl.title = record.fullPath || '';
    }
    if (timeEl) timeEl.textContent = record.downloadedAt ? relativeTime(record.downloadedAt) : '-';
  }

  function initSfDownloadInfo(restoredV4) {
    if (restoredV4?.lastDownload) {
      _lastDownloadRecord = restoredV4.lastDownload;
      renderDownloadInfo(_lastDownloadRecord);
    } else {
      renderDownloadInfo(null);
    }

    document.getElementById('sf-dl-copy-path')?.addEventListener('click', () => {
      if (!_lastDownloadRecord?.fullPath) return;
      navigator.clipboard.writeText(_lastDownloadRecord.fullPath).then(() => {
        const btn = document.getElementById('sf-dl-copy-path');
        if (btn) { const orig = btn.textContent; btn.textContent = '\u2705 Copied!'; setTimeout(() => { btn.textContent = orig; }, 1400); }
      }).catch(err => {
        app().addLog('error', plugin.id, '\u274c Clipboard write failed: ' + err.message);
        app().addNotification('Salesforce Case Extractor', 'Clipboard write failed.', 'error', plugin.id);
      });
    });

    const clearRecord = () => {
      chrome.storage.local.remove(sfDownloadKey(), () => { _lastDownloadRecord = null; renderDownloadInfo(null); });
    };
    document.getElementById('sf-dl-clear-row')?.addEventListener('click', clearRecord);
    document.getElementById('sf-dl-clear-all')?.addEventListener('click', clearRecord);

    // Listen for background download state updates.
    // F-01: bound at most once per document lifetime — prevents accumulation in Side Panel.
    if (!_sfDownloadMsgListenerBound) {
      _sfDownloadMsgListenerBound = true;
      chrome.runtime.onMessage.addListener(msg => {
        if (!msg || msg.type !== 'RC_DOWNLOAD_UPDATED' || !msg.payload) return;
        _lastDownloadRecord = msg.payload;
        renderDownloadInfo(_lastDownloadRecord);

        // On complete: log the download path (attachment state is managed by the user)
        if (msg.payload.state === 'complete' && msg.payload.fullPath) {
          chrome.storage.local.set({ [sfCtxFileKey()]: msg.payload.fullPath });
          app().addLog('info', plugin.id, 'Download complete: ' + msg.payload.fullPath);
        }
      });
    }
  }

  // ─── Prompt assembly ──────────────────────────────────────────────────────
  function buildAssembledPrompt(body, contextFilePath, additional, caseData) {
    // Defensive: ensure all inputs are strings (or empty) to prevent "null"/"undefined" appearing in output
    const safePart = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val !== 'string') return String(val);
      return val;
    };
    
    const parts = [
      safePart(body).trim(),
      caseData && safePart(caseData).trim(),
      contextFilePath && safePart(contextFilePath).trim(),
      additional && safePart(additional).trim()
    ].filter(p => p && p.length > 0);
    
    // Do NOT escape quotes here - the prompt is written to a UTF-8 .txt file and
    // delivered to Bob via PowerShell stdin pipe. Pre-escaping causes double-escaping
    // and garbled characters in Bob's received prompt.
    return parts.join('\n\n');
  }

  // ─── Bob Helper execution ─────────────────────────────────────────────────
  // bobApiKey is intentionally omitted from logs — zero-logging policy.
  function sfExecuteWithBob(assembledPrompt, statusEl, workingDir, diagnosticMode, bobApiKey) {
    function setSt(msg, cls) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'rc-status-bar' + (cls ? ' ' + cls : '');
      statusEl.style.display = msg ? '' : 'none';
    }
    const requestId = 'sf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    setSt('\u23f3 Sending to IBM Bob\u2026', '');
    app().addLog('info', plugin.id, 'Execute command sent [requestId=' + requestId + ', promptBytes=' + new Blob([assembledPrompt]).size + ', cwd=' + (workingDir || '(none)') + (diagnosticMode ? ', diagMode=on' : '') + ']');

    // ── Change B: execution status polling ────────────────────────────────────
    // After dispatch, poll /status/:requestId every 3 seconds to update the
    // status bar with live execution state. Stops when completed/failed or after
    // MAX_POLL_ATTEMPTS attempts (5 min at 3s interval).
    const POLL_INTERVAL_MS  = 3000;
    const MAX_POLL_ATTEMPTS = 100; // 5 minutes maximum
    let _pollTimer = null;
    let _pollCount = 0;

    function stopPolling() {
      if (_pollTimer !== null) {
        clearTimeout(_pollTimer);
        _pollTimer = null;
      }
    }

    function pollStatus() {
      _pollCount += 1;
      if (_pollCount > MAX_POLL_ATTEMPTS) {
        stopPolling();
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'RC_BOB_STATUS', payload: { requestId } },
        statusResp => {
          if (chrome.runtime.lastError || !statusResp?.ok) {
            // Server temporarily unreachable during polling - just try again next tick.
            _pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS);
            return;
          }
          const state = statusResp.state;
          if (state === 'running') {
            setSt('\u23f3 IBM Bob is running\u2026', '');
            _pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS);
          } else if (state === 'completed') {
            stopPolling();
            setSt('\u2705 IBM Bob completed successfully', 'ok');
            app().addLog('info', plugin.id, 'Bob execution completed [requestId=' + requestId + ', exitCode=' + (statusResp.exitCode ?? 0) + ']');
          } else if (state === 'failed') {
            stopPolling();
            const errDetail = statusResp.errorMessage ? ' - ' + statusResp.errorMessage : '';
            setSt('\u274c IBM Bob finished with an error' + errDetail, 'err');
            app().addLog('error', plugin.id, 'Bob execution failed [requestId=' + requestId + ', exitCode=' + (statusResp.exitCode ?? 'n/a') + errDetail + ']');
            app().addNotification('Salesforce Case Extractor', '\u274c Bob execution failed' + errDetail, 'error', plugin.id);
          } else {
            // pending or unknown - keep polling
            _pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS);
          }
        }
      );
    }

    chrome.runtime.sendMessage(
      { type: 'RC_EXECUTE_BOB', payload: { prompt: assembledPrompt, requestId, workingDir: workingDir || '', diagnosticMode: !!diagnosticMode, bobApiKey: bobApiKey || '' } },
      response => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || 'Unknown error';
          setSt('\u274c Execution failed. ' + errMsg, 'err');
          app().addLog('error', plugin.id, 'RC_EXECUTE_BOB error: ' + errMsg);
          app().addNotification('Salesforce Case Extractor', '\u274c Bob execution failed: ' + errMsg, 'error', plugin.id);
          return;
        }
        if (response?.ok) {
          setSt('\u23f3 IBM Bob is starting\u2026', '');
          app().addLog('info', plugin.id, 'Bob Helper confirmed dispatch [requestId=' + (response?.requestId || requestId) + ', elapsedMs=' + (response?.elapsedMs ?? 'n/a') + ', helperPid=' + (response?.helperPid ?? 'n/a') + ', childPid=' + (response?.childPid ?? 'n/a') + ']');
          // Begin polling for execution state transitions.
          _pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS);
        } else {
          const errMsg = response?.error || 'Unknown error from Bob Helper';
          setSt('\u274c Execution failed. See Activity Log for details.', 'err');
          app().addLog('error', plugin.id, 'Bob Helper error [requestId=' + (response?.requestId || requestId) + ']: ' + errMsg);
          app().addNotification('Salesforce Case Extractor', '\u274c Bob execution failed: ' + errMsg, 'error', plugin.id);
        }
      }
    );
  }

  // ─── Chrome tab helpers ───────────────────────────────────────────────────
  function getSalesforceTabs(activeOnly) {
    return new Promise(resolve => {
      const query = activeOnly ? { active: true } : {};
      chrome.tabs.query(query, tabs => {
        resolve((tabs || []).filter(t => isSalesforceUrl(t.url)));
      });
    });
  }

  /**
   * Returns the currently ACTIVE Salesforce tab, or null if no active tab is Salesforce.
   *
   * Checks only active tabs - the tab the user is currently looking at in each
   * browser window (prioritising the focused window). A background Salesforce tab
   * is explicitly NOT returned even if it exists.
   *
   * Removed the old fallback that searched all tabs for any Salesforce URL -
   * that fallback allowed extraction when the active tab was a non-Salesforce page
   * (e.g. edge://extensions, Google, Apptio) as long as Salesforce was open
   * somewhere in the background.
   */
  function getActiveSalesforceTab() {
    return new Promise(resolve => {
      chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }, windows => {
        // Sort so the focused window is checked first - its active tab is the
        // one the user is currently looking at.
        const sorted = windows.slice().sort((a, b) => (b.focused ? 1 : 0) - (a.focused ? 1 : 0));
        for (const win of sorted) {
          const active = (win.tabs || []).find(t => t.active && isSalesforceUrl(t.url));
          if (active) { resolve(active); return; }
        }
        // No active Salesforce tab found in any window - return null.
        // Do NOT fall back to searching background/inactive tabs.
        resolve(null);
      });
    });
  }

  function safeInject(tabId) {
    return chrome.scripting.executeScript({ target: { tabId }, files: ['plugins/salesforce/content/sf-content.js'] })
      .catch(err => app().addLog('debug', plugin.id, 'Content script inject (may already be present): ' + String(err)));
  }

  function extractFromTab(tabId, caseNumber, options) {
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, { type: 'SF_EXTRACT', pluginId: plugin.id, payload: { caseNumber, options: options || {} } }, response => {
        if (chrome.runtime.lastError) {
          app().addLog('debug', plugin.id, 'sendMessage error on tab ' + tabId + ': ' + chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        if (response && response.notCasePage) { resolve('NOT_CASE_PAGE'); return; }
        if (!response || response.result === null) { resolve(null); return; }
        resolve({ ...(response.data || {}), rawText: response.result, caseNumber: response.caseNumber });
      });
    });
  }

  // ─── Working directory public API ─────────────────────────────────────────
  // Called by dashboard.js when the user picks or clears the Bob Working Directory
  // via the Browse... / Clear buttons in Settings (v1.25.1).
  function onWorkingDirChanged(newPath) {
    _bobWorkingDir = (typeof newPath === 'string' ? newPath : '').trim();
    _applyHelperHealthToExecBtns();
  }

  // ─── API key public API ────────────────────────────────────────────────────
  // Called by dashboard.js on every keystroke in the API key input and on
  // explicit Save so the Execute button reflects the current state in real time.
  // ZERO-LOGGING POLICY: value must never appear in any log call.
  function onApiKeyChanged(newKey) {
    _bobApiKey = (typeof newKey === 'string' ? newKey : '').trim();
    _applyHelperHealthToExecBtns();
  }

  // Called by dashboard.js when the "API key not required" (Bob 1.0) toggle changes.
  function onBobVersionModeChanged(useBob1) {
    _bobUseBob1 = !!useBob1;
    _applyHelperHealthToExecBtns();
  }

  // ─── Main init ────────────────────────────────────────────────────────────
  function init(restoredResult, restoredSettings, restoredV4) {
    const inputEl          = document.getElementById('sf-case-number');
    const statusEl         = document.getElementById('sf-status');
    const previewEl        = document.getElementById('sf-preview');
    const btnExtract       = document.getElementById('sf-btn-extract');
    const btnCopy          = document.getElementById('sf-btn-copy');
    const btnCopyPrompt    = document.getElementById('sf-btn-copy-prompt');
    const btnDownload      = document.getElementById('sf-btn-download');
    const btnClear         = document.getElementById('sf-btn-clear');
    if (!btnExtract) return;

    // Register tab listeners eagerly so the Dashboard widget reflects reality
    // immediately, even when the user never navigates to the SF plugin page.
    registerTabListeners();

    // Run initial detection to populate the widget status on startup.
    sfRefreshDetectionBanner();

    // Restore SF settings
    if (restoredSettings) {
      const fmtSel = document.getElementById('sf-output-format');
      const autoEl = document.getElementById('sf-auto-fill');
      if (fmtSel && restoredSettings.outputFormat) fmtSel.value = restoredSettings.outputFormat;
      if (autoEl && typeof restoredSettings.autoFill === 'boolean') autoEl.checked = restoredSettings.autoFill;
      const sourceSelectEl = document.getElementById('sf-source-select');
      if (sourceSelectEl) sourceSelectEl.value = restoredSettings.source || 'active';
      const privacyEl = document.getElementById('sf-privacy-mode');
      if (privacyEl && typeof restoredSettings.privacyMode === 'boolean') privacyEl.checked = restoredSettings.privacyMode;

      // Restore extraction toggle states
      const inclIntEl   = document.getElementById('sf-incl-internal');
      const inclJiraEl  = document.getElementById('sf-incl-jira-etl');
      const inclDiagEl  = document.getElementById('sf-incl-diag');
      if (inclIntEl  && typeof restoredSettings.inclInternal === 'boolean') inclIntEl.checked  = restoredSettings.inclInternal;
      if (inclJiraEl && typeof restoredSettings.inclJiraEtl  === 'boolean') inclJiraEl.checked = restoredSettings.inclJiraEtl;
      if (inclDiagEl && typeof restoredSettings.inclDiag     === 'boolean') inclDiagEl.checked = restoredSettings.inclDiag;

      // Restore the Bob working directory.
      // v1.26.1: the Settings UI uses an editable text input; value is read from storage here.
      if (typeof restoredSettings.bobWorkingDir === 'string') {
        _bobWorkingDir = restoredSettings.bobWorkingDir.trim();
      }

      // v1.45.0: Restore API key and Bob 1.0 mode.
      // ZERO-LOGGING POLICY: _bobApiKey value must never appear in any log.
      if (typeof restoredSettings.bobApiKey === 'string') {
        _bobApiKey = restoredSettings.bobApiKey;
      }
      if (typeof restoredSettings.bobUseBob1 === 'boolean') {
        _bobUseBob1 = restoredSettings.bobUseBob1;
      }

      // Restore Diagnostic Mode toggle.
      const diagModeEl = document.getElementById('sf-diagnostic-mode');
      if (diagModeEl && typeof restoredSettings.diagnosticMode === 'boolean') {
        diagModeEl.checked = restoredSettings.diagnosticMode;
      }
      _sfDiagnosticMode = !!(restoredSettings.diagnosticMode);

      // v4.12.0: Restore Sort Posts preference.
      const postSortEl = document.getElementById('sf-post-sort');
      if (postSortEl && typeof restoredSettings.postSort === 'string') {
        postSortEl.value = restoredSettings.postSort;
      }
    }

    clearExtractedState();

    // Restore previous extraction result
    if (restoredResult?.rawText) {
      _lastExtractionPosts = restoredResult.posts || [];
      _lastBaseText = restoredResult.rawText;               // treat restored text as base for re-sort
      _lastRawText  = restoredResult.rawText;
      previewEl.value = sfApplyPrivacy(restoredResult.rawText);
      if (inputEl && restoredResult.caseNumber) inputEl.value = restoredResult.caseNumber;
      if (btnCopy)     btnCopy.disabled     = false;
      if (btnDownload) btnDownload.disabled = false;
      _sfSyncCopyPromptBtn();
    }

    inputEl?.addEventListener('input', () => {
      const pos = inputEl.selectionStart;
      inputEl.value = inputEl.value.toUpperCase();
      inputEl.setSelectionRange(pos, pos);
    });

    const sourceSelect = document.getElementById('sf-source-select');
    if (sourceSelect) {
      sourceSelect.addEventListener('change', () => {
        sfRefreshDetectionBanner();
        app().persistSfSettings();
      });
    }

    // Privacy mode toggle - re-render preview from the unredacted source
    const privacyCheckbox = document.getElementById('sf-privacy-mode');
    if (privacyCheckbox) {
      privacyCheckbox.addEventListener('change', () => {
        if (_lastRawText) {
          previewEl.value = sfApplyPrivacy(_lastRawText);
        }
        app().persistSfSettings();
      });
    }

    // Bob Working Directory is managed via the editable text input in Settings.
    // dashboard.js calls onWorkingDirChanged() on every 'input' event.
    // No additional listener is needed here.

    // Sort Posts preference - re-render preview from the original base text, then persist
    document.getElementById('sf-post-sort')?.addEventListener('change', function() {
      if (_lastBaseText) {
        _lastRawText   = sfBuildSortedText(_lastBaseText, _lastExtractionPosts, this.value);
        previewEl.value = sfApplyPrivacy(_lastRawText);
      }
      app().persistSfSettings();
    });

    // Extraction scope toggles - persist on change
    ['sf-incl-internal', 'sf-incl-jira-etl', 'sf-incl-diag'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => app().persistSfSettings());
    });

    // Diagnostic Mode toggle - update module variable and persist on change
    document.getElementById('sf-diagnostic-mode')?.addEventListener('change', function() {
      _sfDiagnosticMode = !!this.checked;
      app().persistSfSettings();
    });

    // Helper to read current extraction options from the UI
    function _getExtractionOptions() {
      return {
        inclInternal: !!(document.getElementById('sf-incl-internal')?.checked),
        inclJiraEtl:  !!(document.getElementById('sf-incl-jira-etl')?.checked),
        inclDiag:     !!(document.getElementById('sf-incl-diag')?.checked),
      };
    }

    async function runExtraction() {
      previewEl.value = '';
      btnExtract.disabled = true;

      const selectEl      = document.getElementById('sf-source-select');
      const useSearch     = selectEl && selectEl.value === 'search';
      const caseNumber    = useSearch ? (inputEl?.value.trim() || '') : '';
      const extractOpts   = _getExtractionOptions();

      app().addLog('info', plugin.id, 'Extraction started' + (useSearch ? ' for case ' + caseNumber : ' from active tab'));

      try {
        let result = null;

        if (useSearch) {
          if (!caseNumber) {
            const msg = '\u274c Please enter a case number to search.';
            app().setStatus(statusEl, msg, 'error');
            app().addLog('warn', plugin.id, msg);
            app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
            return;
          }
          app().setStatus(statusEl, '\u23f3 Searching for case ' + caseNumber + '\u2026', 'neutral');
          const tabs = await getSalesforceTabs(false);
          if (!tabs.length) {
            const msg = '\u274c No open Salesforce tabs found. Open a Salesforce case page first.';
            app().setStatus(statusEl, msg, 'error');
            app().addLog('warn', plugin.id, msg);
            app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
            return;
          }
          app().addLog('info', plugin.id, 'Scanning ' + tabs.length + ' Salesforce tab(s) for case ' + caseNumber);
          for (const tab of tabs) {
            await safeInject(tab.id);
            result = await extractFromTab(tab.id, caseNumber, extractOpts);
            if (result === 'NOT_CASE_PAGE') continue;
            if (result) break;
          }
          if (!result || result === 'NOT_CASE_PAGE') {
            const msg = '\u274c Case ' + caseNumber + ' not found in any open Salesforce tab.';
            app().setStatus(statusEl, msg, 'error');
            app().addLog('warn', plugin.id, msg);
            app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
            return;
          }
        } else {
          app().setStatus(statusEl, '\u23f3 Extracting from active Salesforce Case tab\u2026', 'neutral');
          const tab = await getActiveSalesforceTab();
          if (!tab) {
            const msg = '\u274c Salesforce tab inactive. Please switch to an active Salesforce case tab and try again.';
            app().setStatus(statusEl, msg, 'error');
            app().addLog('warn', plugin.id, 'Extraction blocked - active tab is not Salesforce');
            app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
            sfRefreshDetectionBanner();
            return;
          }
          app().addLog('info', plugin.id, 'Injecting content script into tab: ' + (tab.title || tab.id));
          await safeInject(tab.id);
          result = await extractFromTab(tab.id, '', extractOpts);
          if (result === 'NOT_CASE_PAGE') {
            const msg = '\u274c This page is not a supported Salesforce Case page. Please open a Salesforce Case and try again.';
            app().setStatus(statusEl, msg, 'error');
            app().addLog('warn', plugin.id, 'Not a case page: ' + (tab.title || tab.url));
            app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
            sfRefreshDetectionBanner();
            return;
          }
          if (!result) {
            const msg = '\u274c Could not extract data from this page. Make sure a Salesforce case is open.';
            app().setStatus(statusEl, msg, 'error');
            app().addLog('warn', plugin.id, msg);
            app().addNotification('Salesforce Case Extractor', msg, 'warning', plugin.id);
            return;
          }
        }

        // ── Success ────────────────────────────────────────────────────────
        const rawPosts = result.posts || [];
        _lastExtractionPosts = rawPosts;
        _lastBaseText  = result.rawText || '';                                   // always ASC — source for re-sort
        const sortDir  = document.getElementById('sf-post-sort')?.value || 'asc';
        _lastRawText   = sfBuildSortedText(_lastBaseText, rawPosts, sortDir);
        previewEl.value = sfApplyPrivacy(_lastRawText);
        if (useSearch) {
          inputEl.value = '';
          app().persistSfSettings();
        } else if (result.caseNumber) {
          inputEl.value = result.caseNumber;
        }
        if (btnCopy)     btnCopy.disabled     = false;
        if (btnDownload) btnDownload.disabled = false;
        _sfSyncCopyPromptBtn();

        // Warn when internal content was requested and found
        const hasInternalContent = extractOpts.inclInternal || extractOpts.inclJiraEtl || extractOpts.inclDiag;
        if (hasInternalContent) {
          app().addNotification('Salesforce Case Extractor',
            'Internal posts included - review before sharing externally.', 'warning', plugin.id);
        }

        app().persistSfResult({
          rawText:     _lastRawText,
          caseNumber:  result.caseNumber || '',
          accountName: result.accountName || '',
          posts:       result.posts || [],
          extractedAt: Date.now(),
        });

        const postCount   = result.posts?.length || 0;
        const internalCnt = result.posts?.filter(p => p.type === 'internal').length || 0;
        const customerCnt = postCount - internalCnt;
        const successMsg  = '\u2705 Extracted case ' + (result.caseNumber || 'data') + ' successfully';
        const detailMsg   = 'Case: ' + (result.caseNumber || 'N/A') +
                            ' | Posts: ' + postCount +
                            ' (' + customerCnt + ' customer, ' + internalCnt + ' internal)';

        app().setStatus(statusEl, successMsg, 'success');
        app().addLog('info', plugin.id, successMsg + ' - ' + detailMsg);
        app().addNotification('Extracted: ' + (result.caseNumber || 'Case'), detailMsg, 'success', plugin.id);

      } catch (err) {
        const msg = '\u274c Extraction failed: ' + String(err);
        app().setStatus(statusEl, msg, 'error');
        app().addLog('error', plugin.id, msg);
        app().addNotification('Salesforce Case Extractor - Error', msg, 'error', plugin.id);
      } finally {
        btnExtract.disabled = false;
      }
    }

    btnExtract.addEventListener('click', runExtraction);
    document.getElementById('sf-widget-extract-btn')?.addEventListener('click', () => {
      app().navigateTo('plugin-salesforce');
      setTimeout(runExtraction, 80);
    });

    btnCopy?.addEventListener('click', async () => {
      const caseLabel = inputEl?.value.trim() || 'data';
      try {
        await navigator.clipboard.writeText(previewEl.value);
        const msg = 'Copied ' + caseLabel + ' to clipboard';
        app().setStatus(statusEl, '\u2705 Copied to clipboard!', 'success');
        app().addLog('info', plugin.id, msg);
        app().addNotification('Salesforce Case Extractor', msg, 'info', plugin.id);
      } catch (err) {
        const msg = 'Clipboard write failed: ' + String(err);
        app().setStatus(statusEl, '\u274c ' + msg, 'error');
        app().addLog('error', plugin.id, msg);
        app().addNotification('Salesforce Case Extractor', msg, 'error', plugin.id);
      }
    });

    // ── Copy with Prompt ──────────────────────────────────────────────────────
    // Assembles the full prompt (prompt body + content + additional requests)
    // and copies to clipboard.
    //
    // Content inclusion rule:
    //   • Files attached → output quoted comma-separated file paths; omit case data
    //                       (files are the intended content source - paths let Bob
    //                        read them directly)
    //   • No files attached → include case data from the preview textarea
    //
    // C2: Button is enabled when files are attached OR case data exists (see
    //     _sfSyncCopyPromptBtn), so both paths must be reachable independently.
    btnCopyPrompt?.addEventListener('click', async () => {
      const caseLabel = inputEl?.value.trim() || 'data';

      // Require an active prompt selection
      if (!_sfActiveExecPromptId) {
        app().setStatus(statusEl,
          '\u274c No prompt selected. Choose a prompt from the Prompt Selection panel first.',
          'error');
        app().addLog('warn', plugin.id, 'Copy with Prompt blocked - no prompt selected');
        return;
      }

      const prompt = currentPrompts.find(p => p.id === _sfActiveExecPromptId);
      if (!prompt) {
        app().setStatus(statusEl, '\u274c Selected prompt not found.', 'error');
        app().addLog('warn', plugin.id, 'Copy with Prompt blocked - prompt id not in currentPrompts: ' + _sfActiveExecPromptId);
        return;
      }

      const additional = _execAdditional.trim();
      const hasFiles   = _execAttachments.length > 0;

      // When files are attached, output quoted comma-separated paths.
      // When no files are attached, use the extracted case preview as content.
      let contextBlock;
      let caseData;
      if (hasFiles) {
        // C1: Output full file paths as a quoted comma-separated list.
        // Paths come from a.name which already includes _bobWorkingDir prefix
        // when a working directory is configured.
        contextBlock = _execAttachments.map(a => '"' + a.name + '"').join(', ');
        caseData = '';
      } else {
        const previewText = previewEl.value.trim();
        if (!previewText) {
          app().setStatus(statusEl,
            '\u274c No case data to copy. Extract a case or attach a file first.',
            'error');
          app().addLog('warn', plugin.id, 'Copy with Prompt blocked - no case data and no files');
          return;
        }
        contextBlock = '';
        caseData     = previewText;
      }

      // When files are attached contextBlock contains quoted file paths that
      // should appear inline (space-separated) after the prompt body, not as a
      // separate paragraph.  Pass them appended to body so buildAssembledPrompt
      // joins only caseData / additional with \n\n; omit contextFilePath arg.
      const assembled = hasFiles
        ? buildAssembledPrompt(prompt.body + ' ' + contextBlock, '', additional, caseData)
        : buildAssembledPrompt(prompt.body, contextBlock, additional, caseData);

      try {
        await navigator.clipboard.writeText(assembled);
        const msg = hasFiles
          ? 'Copied prompt + ' + _execAttachments.length + ' file path(s) to clipboard'
          : 'Copied prompt + case ' + caseLabel + ' to clipboard';
        app().setStatus(statusEl, '\u2705 Copied prompt to clipboard!', 'success');
        app().addLog('info', plugin.id, msg + ' (prompt: ' + prompt.title + ', length: ' + assembled.length + ')');
        app().addNotification('Salesforce Case Extractor', msg, 'info', plugin.id);
      } catch (err) {
        const msg = 'Clipboard write failed: ' + String(err);
        app().setStatus(statusEl, '\u274c ' + msg, 'error');
        app().addLog('error', plugin.id, msg);
        app().addNotification('Salesforce Case Extractor', msg, 'error', plugin.id);
      }
    });

    btnDownload?.addEventListener('click', () => {
      if (!previewEl.value) return;
      const caseLabel = inputEl?.value.trim() || 'salesforce_case';
      const filename  = caseLabel + '.txt';
      const blob      = new Blob([previewEl.value], { type: 'text/plain' });
      const blobUrl   = URL.createObjectURL(blob);
      chrome.downloads.download({ url: blobUrl, filename, saveAs: false }, downloadId => {
        URL.revokeObjectURL(blobUrl);
        if (chrome.runtime.lastError || downloadId === undefined) {
          app().addLog('error', plugin.id, 'Download failed: ' + (chrome.runtime.lastError?.message || 'unknown'));
          return;
        }
        const record = { filename, fullPath: '', downloadId, state: 'pending', downloadedAt: Date.now(), retryCount: 0 };
        chrome.runtime.sendMessage({ type: 'RC_DOWNLOAD_TRACK', payload: record });
        app().addLog('info', plugin.id, 'Download initiated: ' + filename + ' (id=' + downloadId + ')');
        app().addNotification('Salesforce Case Extractor', 'Downloading: ' + filename, 'info', plugin.id);
      });
    });

    btnClear?.addEventListener('click', () => {
      previewEl.value = '';
      if (statusEl) statusEl.style.display = 'none';
      app().persistSfResult(null);
      app().addLog('info', plugin.id, 'Preview cleared');
    });

    // Inner tab switching - uses standard .rc-plugin-tab elements (v1.43.0)
    _sfSwitchTab('extract');
    document.querySelectorAll('.rc-plugin-tab[data-tab]').forEach(tabEl => {
      tabEl.addEventListener('click', () => _sfSwitchTab(tabEl.dataset.tab));
    });

    // v4 prompt management + download history
    initSfDownloadInfo(restoredV4);
    initSfPrompts(restoredV4);
  }

  // ─── Register with platform ───────────────────────────────────────────────
  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.SalesforceCaseExtractor = plugin;
})();
