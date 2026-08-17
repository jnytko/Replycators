/**
 * sf-content.js — ReplyCators Salesforce Case Extractor
 *
 * Active content script for the ReplyCators extension.
 * Injected into Salesforce Lightning pages.
 *
 * IMPLEMENTATION: This is the v0.4.3 extraction engine from the
 * ReplyCators-salesforce-extractor standalone project, adapted to respond
 * to the ReplyCators message protocol (SF_EXTRACT / SF_IS_CASE_PAGE).
 *
 * Why replaced (see AGENTS.md migration notes):
 *   The original sf-content.js (v2.1.0) used an IIFE approach with regex-based
 *   field extraction that was susceptible to Salesforce Lightning DOM artefacts.
 *   This v0.4.3 engine uses clone-based DOM cleanup (extractCleanText),
 *   multi-strategy record container resolution (resolveActiveRecordContainer /
 *   resolveTargetRecordContainer), parent-case post filtering (data-scope="parent"),
 *   and a diagnostic system.
 *
 * Message protocol (ReplyCators):
 *   { type: 'SF_IS_CASE_PAGE', pluginId: ... }
 *     → { isCasePage: boolean }
 *
 *   { type: 'SF_EXTRACT', pluginId: ..., payload: { caseNumber: string, options?: {
 *       inclInternal?: boolean,
 *       inclJiraEtl?:  boolean,
 *       inclDiag?:     boolean,
 *     }}}
 *     → { result: string, data: {...}, caseNumber: string, notCasePage?: boolean }
 *
 * v0.4.5 changelog (ReplyCators v1.38.1 / plugin v4.7.1):
 *   - extractAllFeedPosts() — replaces four separate extractors with a single-pass
 *     unified extractor; classifies all post types (customer / internal / jira-etl /
 *     diagnostic) in DOM order then reverses for chronological oldest-first output
 *   - extractSalesforceData() — now calls extractAllFeedPosts(); returns all_posts
 *     (single unified array) instead of separate public_posts / internal_posts /
 *     jira_etl_posts / diag_events arrays; _diagnostics simplified to postCount
 *   - formatAsPlainText() — single CASE HISTORY section; each post labeled by type
 *   - buildReplyCatorsResponse() — posts mapped from all_posts; type preserved
 *   - findFieldByLabel() — reordered so outputEl (lightning-formatted-rich-text)
 *     is checked before anchor shortcut; fixes description truncation on rich-text
 *     fields containing embedded anchor tags (e.g. TS022621347)
 *
 * v0.4.4 changelog (ReplyCators v4.7.0):
 *   - extractSeverityLevel() — reads "Severity Level" field from record layout
 *   - extractPrimaryProduct() — reads "Primary Product" field from record layout
 *   - extractNextActionDatetime() — reads "Next Action Datetime" field; also
 *     tries lightning-formatted-date-time when findFieldByLabel returns nothing
 *   - extractAllFeedPosts() — single-pass unified feed extractor (introduced here,
 *     fully wired in v0.4.5)
 *   - extractSalesforceData() now accepts an options object; new fields populated
 *   - formatAsPlainText() — new fields added to header
 *   - buildReplyCatorsResponse() — new fields mapped to camelCase
 *   - Message listener reads payload.options and passes them to extractSalesforceData()
 *
 * v0.4.3 changelog:
 *   - extractCleanText() uses textContent (not innerText) on detached clones
 *   - findFieldByLabel() Tier 1 & extractAccountName() Pass 0 strip label element
 *     from clone before fallback textContent read
 *
 * v0.4.2 changelog:
 *   - resolveTargetRecordContainer() adds Strategies 2 and 3
 *   - extractDescriptionFromInternalBody() S1 regex stops before "Agent Description:"
 *   - Parent-case post filtering via querySelector('header[data-scope="parent"]')
 *
 * v0.4 changelog:
 *   - Soft case-number mismatch guard (returns data + warning instead of null)
 *   - extractDescription() queries record-layout field first, fallback to posts
 *   - findAllInternalPostBodies() uses querySelectorAll
 *   - extractCleanText() strips buttons/icons/assistive-text from clones
 */

'use strict';

// ── Idempotent init guard ─────────────────────────────────────────────────────
if (!window.__rcSfExtractorInstalled) {
  window.__rcSfExtractorInstalled = true;

  // ── Low-level text helpers ────────────────────────────────────────────────

  /**
   * Reads the visible text of an element, collapses all whitespace to single
   * spaces, and trims. Returns '' for null/undefined — never throws.
   */
  function extractTextFromElement(element) {
    if (!element) return '';
    const raw = element.innerText || element.textContent || '';
    return raw.replace(/\s+/g, ' ').trim();
  }

  /**
   * Returns the text content of `element` after cloning it and removing all
   * child nodes that are buttons, icons, or assistive-text spans.
   * Uses textContent (not innerText) for detached-node safety (v0.4.3).
   */
  function extractCleanText(element) {
    if (!element) return '';
    const clone = element.cloneNode(true);
    for (const junk of clone.querySelectorAll(
      '.slds-assistive-text, button, lightning-button-icon, ' +
      'lightning-button, svg, [aria-hidden="true"], ' +
      'force-button-menu, lightning-icon'
    )) {
      junk.remove();
    }
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Normalises multi-line text by collapsing consecutive blank lines to one
   * and stripping leading/trailing blank lines.
   */
  function collapseLines(raw) {
    const lines = raw.split('\n').map(l => l.trim());
    const out   = [];
    let prevBlank = true;
    for (const line of lines) {
      if (line === '') {
        if (!prevBlank) out.push('');
        prevBlank = true;
      } else {
        out.push(line);
        prevBlank = false;
      }
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n');
  }

  // ── Field label lookup ──────────────────────────────────────────────────────

  /**
   * Three-tier field lookup scoped to `root`.
   *
   * Tier 1: [field-label="<label>"] attribute selector — most stable.
   * Tier 2: Regex match on label/span/div text content — catches non-standard
   *         layouts.
   * Tier 3: Returns '' if neither tier finds the field.
   */
  function findFieldByLabel(root, labelText) {
    // Tier 1 — [field-label] attribute
    try {
      const selector = `[field-label="${CSS.escape(labelText)}"]`;
      const el = root.querySelector(selector);
      if (el) {
        const outputEl = el.querySelector(
          'lightning-formatted-text, .slds-form-element__static, ' +
          'force-output-field .outputData, records-formula-output, ' +
          'lightning-formatted-rich-text, lightning-formatted-date-time'
        );
        if (outputEl) {
          const t = extractCleanText(outputEl);
          if (t) return t;
        }
        // Anchor shortcut: only when there is no rich-text output element above.
        // Applies to pure link-type fields (e.g. Account Name with an org link).
        // NOT used when a rich-text field happens to contain an embedded anchor —
        // that would return only the link text and discard the rest of the content.
        const anchor = el.querySelector('a[href]');
        if (anchor) {
          const t = extractTextFromElement(anchor);
          if (t) return t;
        }
        // v0.4.3: strip label element from clone before fallback textContent read
        const containerClone = el.cloneNode(true);
        for (const junk of containerClone.querySelectorAll(
          'label, .slds-form-element__label, .slds-assistive-text, ' +
          'button, lightning-button-icon, lightning-button, svg, ' +
          '[aria-hidden="true"], force-button-menu, lightning-icon'
        )) {
          junk.remove();
        }
        const text = (containerClone.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
    } catch {
      try {
        const el = root.querySelector(`[field-label="${labelText}"]`);
        if (el) {
          const text = extractCleanText(el);
          if (text) return text;
        }
      } catch { /* fall through to Tier 2 */ }
    }

    // Tier 2 — regex match on label element text
    const labelRe    = new RegExp(labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const candidates = root.querySelectorAll('label, span, div, dt');
    for (const el of candidates) {
      const elText = (el.innerText || el.textContent || '').trim();
      if (labelRe.test(elText) && elText.length < labelText.length + 20) {
        const parent = el.parentElement;
        if (!parent) continue;
        for (const child of parent.querySelectorAll('div, span, p, a')) {
          if (child === el || child.contains(el)) continue;
          const val = extractCleanText(child);
          if (val) return val;
        }
      }
    }

    return '';
  }

  // ── Account Name (special case) ─────────────────────────────────────────────

  /**
   * Dedicated extractor for Account Name.
   *
   * Pass 0: [field-label="Account Name"] — targets inner anchor or static text.
   * Pass 1: [data-test-id*="field-label"] sibling walk — uses extractCleanText().
   * Pass 2: Full DOM walk — reads anchor child of containing field row.
   */
  function extractAccountName(root) {
    // Pass 0 — [field-label="Account Name"]
    try {
      const el = root.querySelector('[field-label="Account Name"]');
      if (el) {
        const anchor = el.querySelector('a[href]');
        if (anchor) {
          const t = extractTextFromElement(anchor);
          if (t) return t;
        }
        const output = el.querySelector(
          'lightning-formatted-text, .slds-form-element__static, records-formula-output'
        );
        if (output) {
          const t = extractCleanText(output);
          if (t) return t;
        }
        // v0.4.3: strip label + button noise
        const containerClone = el.cloneNode(true);
        for (const junk of containerClone.querySelectorAll(
          'label, .slds-form-element__label, .slds-assistive-text, ' +
          'button, lightning-button-icon, lightning-button, svg, ' +
          '[aria-hidden="true"], force-button-menu, lightning-icon'
        )) {
          junk.remove();
        }
        const t = (containerClone.textContent || '').replace(/\s+/g, ' ').trim();
        if (t) return t;
      }
    } catch { /* continue */ }

    const accountRe = /account\s*name/i;

    // Pass 1 — [data-test-id*="field-label"] sibling walk
    for (const el of root.querySelectorAll('[data-test-id*="field-label"]')) {
      if (!accountRe.test(el.textContent)) continue;
      let sib = el.nextElementSibling;
      while (sib) {
        const anchor = sib.querySelector('a[href]');
        if (anchor) {
          const val = extractTextFromElement(anchor);
          if (val) return val;
        }
        const val = extractCleanText(sib);
        if (val) return val;
        sib = sib.nextElementSibling;
      }
    }

    // Pass 2 — full DOM walk
    for (const el of root.querySelectorAll('*')) {
      const t = (el.innerText || el.textContent || '').trim();
      if (t.toLowerCase() === 'account name') {
        const row = el.closest(
          '.slds-form__row, .slds-form-element, li, [class*="field"], td'
        );
        if (row) {
          const anchor = row.querySelector('a[href]');
          if (anchor) {
            const val = extractTextFromElement(anchor);
            if (val) return val;
          }
        }
        let sib = el.nextElementSibling;
        while (sib) {
          const anchor = sib.querySelector('a[href]');
          if (anchor) {
            const val = extractTextFromElement(anchor);
            if (val) return val;
          }
          const val = extractCleanText(sib);
          if (val) return val;
          sib = sib.nextElementSibling;
        }
      }
    }

    return '';
  }

  // ── Simple field extractors ──────────────────────────────────────────────────

  function extractContactName(root) {
    return findFieldByLabel(root, 'Contact Name');
  }

  function extractSubject(root) {
    const v = findFieldByLabel(root, 'Subject');
    if (v) return v;
    for (const el of root.querySelectorAll('h1, h2, h3')) {
      if (/subject|title/i.test(el.className || '')) {
        const t = extractTextFromElement(el);
        if (t) return t;
      }
    }
    return '';
  }

  /**
   * Three-tier case number extractor.
   * Accepts an optional root element (defaults to document for backwards compat).
   */
  function extractSeverityLevel(root) {
    return findFieldByLabel(root, 'Severity Level') || '';
  }

  function extractPrimaryProduct(root) {
    return findFieldByLabel(root, 'Primary Product') || '';
  }

  /**
   * Extracts "Next Action Datetime" from the record layout.
   * Primary path: findFieldByLabel() now includes lightning-formatted-date-time
   * in its Tier 1 selector, so the date/time value is read directly.
   * Fallback: if the value string looks like just a date (no time component),
   * try reading the raw datetime attribute from lightning-formatted-date-time.
   */
  function extractNextActionDatetime(root) {
    const val = findFieldByLabel(root, 'Next Action Datetime');
    if (val) return val;
    // Fallback: scan for the field container by attribute and read datetime directly
    try {
      const container = root.querySelector('[field-label="Next Action Datetime"]');
      if (container) {
        const dtEl = container.querySelector('lightning-formatted-date-time');
        if (dtEl) {
          const dt = dtEl.getAttribute('value') || dtEl.textContent || '';
          return dt.trim();
        }
      }
    } catch { /* ignore */ }
    return '';
  }

  function extractCaseNumber(root) {
    const r = root || document;
    const fromLabel = findFieldByLabel(r, 'Case Number');
    const m1 = fromLabel.match(/\bTS\d+\b/i);
    if (m1) return m1[0].toUpperCase();

    const bodyText = r.innerText || r.textContent || '';
    const m2 = bodyText.match(/\bTS\d+\b/i);
    if (m2) return m2[0].toUpperCase();

    const m3 = (document.title || '').match(/\bTS\d+\b/i);
    if (m3) return m3[0].toUpperCase();

    return '';
  }

  /**
   * Determines whether the current page is a Salesforce case page.
   * Used for the SF_IS_CASE_PAGE probe.
   */
  function isCasePage() {
    // Case URL pattern
    if (/\/Case\/[A-Za-z0-9]+\/view/i.test(window.location.href)) return true;
    // Case number pattern in title or URL
    if (/TS\d{7,}/i.test(document.title)) return true;
    if (/TS\d{7,}/i.test(window.location.href)) return true;
    // Salesforce lightning case page indicators
    if (document.querySelector('[field-label="Case Number"]')) return true;
    if (document.querySelector('records-record-layout-item[field-label="Case Number"]')) return true;
    if (extractCaseNumber(document)) return true;
    return false;
  }

  // ── Internal post body helpers ───────────────────────────────────────────────

  /**
   * Returns ALL lightning-formatted-rich-text elements inside internal posts.
   * v0.4: uses querySelectorAll (not querySelector) so Agent Description can be
   * found in any internal post regardless of position.
   * v0.4.2: filters out posts belonging to a parent case (data-scope="parent").
   */
  function findAllInternalPostBodies(root) {
    return Array.from(root.querySelectorAll(
      'section.entry[data-text-post="true"][data-public="false"] ' +
      'section.body lightning-formatted-rich-text'
    )).filter(bodyEl => {
      const entry = bodyEl.closest('section.entry');
      if (!entry) return true;
      return !entry.querySelector('header[data-scope="parent"]');
    });
  }

  function findInternalPostBody(root) {
    return findAllInternalPostBodies(root)[0] || null;
  }

  /**
   * Extracts the customer-facing Description from an internal post body.
   * v0.4.2: S1 regex stops before "(internal) Agent Description:".
   */
  function extractDescriptionFromInternalBody(bodyEl) {
    if (!bodyEl) return '';

    const fullText = extractTextFromElement(bodyEl);

    const s1Match = fullText.match(
      /Problem\s+Description\s*:(.*?)(?:\(internal\)\s*Agent\s+Description\s*:|Must\s+Gathers\s*:|$)/is
    );
    if (s1Match && s1Match[1].trim()) return s1Match[1].trim();

    const hrEl = bodyEl.querySelector('hr');
    if (hrEl) {
      const clone   = bodyEl.cloneNode(true);
      const cloneHr = clone.querySelector('hr');
      if (cloneHr) {
        let node = cloneHr;
        while (node) {
          const next = node.nextSibling;
          node.parentNode.removeChild(node);
          node = next;
        }
      }
      const preHr = extractTextFromElement(clone);
      if (preHr) return preHr;
    }

    return fullText;
  }

  /**
   * Extracts the Agent Description from an internal post body.
   * v0.4.1: inserts sentinel newlines between block-level elements so the
   * label regex matches reliably regardless of DOM concatenation.
   */
  function extractAgentDescriptionFromInternalBody(bodyEl) {
    if (!bodyEl) return '';

    const clone = bodyEl.cloneNode(true);

    for (const br of clone.querySelectorAll('br')) {
      br.parentNode.replaceChild(document.createTextNode('\n'), br);
    }

    for (const el of clone.querySelectorAll('b, p, div, h1, h2, h3, h4, li')) {
      el.parentNode.insertBefore(document.createTextNode('\n'), el);
    }

    const fullText = clone.textContent || '';

    const labelRe  = /\(internal\)\s*Agent\s+Description\s*:/i;
    const labelIdx = fullText.search(labelRe);
    if (labelIdx === -1) return '';

    const afterLabel = fullText.slice(labelIdx).replace(labelRe, '').trimStart();

    const truncRe    = /Must\s+Gathers\s*:|={20,}/i;
    const truncMatch = afterLabel.search(truncRe);
    const content    = truncMatch !== -1 ? afterLabel.slice(0, truncMatch) : afterLabel;

    return collapseLines(content);
  }

  // ── Compound extractors ──────────────────────────────────────────────────────

  /**
   * Extracts the customer-facing Description.
   * v0.4: record-layout field is the PRIMARY path; internal post bodies are fallback.
   */
  function extractDescription(root) {
    const fromLabel = findFieldByLabel(root, 'Description');
    if (fromLabel) return fromLabel;

    const layoutSelectors = [
      '[field-label="Description"] .slds-form-element__static',
      '[field-label="Description"] lightning-formatted-text',
      'records-record-layout-item[field-label="Description"]',
      'force-output-field[field-label="Description"]',
    ];
    for (const sel of layoutSelectors) {
      try {
        const el = root.querySelector(sel);
        if (el) {
          const t = extractCleanText(el);
          if (t) return t;
        }
      } catch { /* continue */ }
    }

    // Fallback: internal post bodies that contain "Problem Description:"
    for (const bodyEl of findAllInternalPostBodies(root)) {
      const bodyText = (bodyEl.innerText || bodyEl.textContent || '');
      if (!/Problem\s+Description\s*:/i.test(bodyText)) continue;
      const desc = extractDescriptionFromInternalBody(bodyEl);
      if (desc) return desc;
    }

    return '';
  }

  /**
   * Extracts the Agent Description from internal post bodies.
   * v0.4: iterates ALL internal post bodies via findAllInternalPostBodies().
   */
  function extractAgentDescription(root) {
    for (const bodyEl of findAllInternalPostBodies(root)) {
      const result = extractAgentDescriptionFromInternalBody(bodyEl);
      if (result) return result;
    }
    return '';
  }

  // ── Feed post extractors ─────────────────────────────────────────────────────

  function extractPostMetadata(headerElement) {
    const defaults = { author: 'Unknown Author', timestamp: 'No timestamp' };
    if (!headerElement) return defaults;

    const details = headerElement.querySelector('section.details');
    if (!details) return defaults;

    const smalls = Array.from(details.children).filter(el => el.tagName === 'SMALL');
    if (smalls.length === 0) return defaults;

    const timestampRaw = (smalls[0].textContent || '').split('|')[0].trim();
    const timestamp    = timestampRaw || defaults.timestamp;

    let author = defaults.author;
    if (smalls.length >= 2) {
      const strong = smalls[1].querySelector('strong');
      if (strong) {
        author = extractTextFromElement(strong) || defaults.author;
      } else {
        const lastSmall = smalls[smalls.length - 1].textContent || '';
        const segments  = lastSmall.split('|');
        const last      = segments[segments.length - 1].trim();
        if (last) author = last;
      }
    }

    return { author, timestamp };
  }

  /**
   * Parses a Salesforce feed timestamp string ("M/D/YYYY H:MM AM") into a
   * numeric value suitable for sorting.  Returns 0 for unrecognised formats so
   * unparseable entries sort to the top rather than throwing.
   */
  function parseSfTimestamp(ts) {
    if (!ts) return 0;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  /**
   * Extracts the text content from a feed entry body section.
   * Returns '' if no body or no content found.
   */
  function extractEntryBodyText(entry) {
    const bodySection = entry.querySelector('section.body');
    if (!bodySection) return '';
    const richText = bodySection.querySelector('lightning-formatted-rich-text');
    if (richText) {
      const t = extractTextFromElement(richText);
      if (t) return t;
    }
    const fallback = bodySection.querySelector('.slds-rich-text-editor__output');
    return fallback ? extractTextFromElement(fallback) : '';
  }

  /**
   * Single-pass unified feed extractor.
   *
   * Iterates ALL section.entry elements in DOM order (Salesforce renders
   * newest-first), classifies each by type, respects the options flags for
   * gated types, and returns a single array sorted chronologically
   * (oldest first).
   *
   * Post types:
   *   customer   — data-text-post="true"  data-public="true"  (always included)
   *   internal   — data-text-post="true"  data-public="false" non-ETL author (opt-in)
   *   jira-etl   — data-text-post="true"  data-public="false" author=/support.?etl/i (opt-in)
   *   diagnostic — data-text-post="false" header text=/diagnostic data uploaded/i (opt-in)
   */
  function extractAllFeedPosts(root, opts) {
    const entries = root.querySelectorAll('section.entry');
    const posts = [];

    for (const entry of entries) {
      // Skip parent-case posts (they belong to a linked/parent case, not this one)
      if (entry.querySelector('header[data-scope="parent"]')) continue;

      const isTextPost = entry.getAttribute('data-text-post') === 'true';
      const isPublic   = entry.getAttribute('data-public')    === 'true';

      if (isTextPost && isPublic) {
        // ── Customer / public post ──────────────────────────────────────────
        const header = entry.querySelector('c-enhanced-feed-thread-header');
        const { author, timestamp } = extractPostMetadata(header);
        const content = extractEntryBodyText(entry);
        if (!content) continue;
        posts.push({ author, timestamp, content, type: 'customer' });

      } else if (isTextPost && !isPublic) {
        // ── Internal or JIRA/ETL post ───────────────────────────────────────
        const header = entry.querySelector('c-enhanced-feed-thread-header');
        const { author, timestamp } = extractPostMetadata(header);
        const isEtl = /support.?etl/i.test(author);
        if (isEtl) {
          if (!opts.inclJiraEtl) continue;
          const content = extractEntryBodyText(entry);
          if (!content) continue;
          posts.push({ author, timestamp, content, type: 'jira-etl' });
        } else {
          if (!opts.inclInternal) continue;
          const content = extractEntryBodyText(entry);
          if (!content) continue;
          posts.push({ author, timestamp, content, type: 'internal' });
        }

      } else if (!isTextPost) {
        // ── System event — only Diagnostic Data Uploaded is opt-in ─────────
        if (!opts.inclDiag) continue;
        const header = entry.querySelector('c-enhanced-feed-thread-header');
        if (!header) continue;
        const details = header.querySelector('section.details');
        if (!details) continue;
        const headerText = Array.from(details.querySelectorAll('small'))
          .map(s => (s.textContent || '').trim()).join(' | ');
        if (!/diagnostic\s+data\s+uploaded/i.test(headerText)) continue;
        const { author, timestamp } = extractPostMetadata(header);
        posts.push({ author, timestamp, content: 'Diagnostic Data Uploaded', type: 'diagnostic' });
      }
    }

    // DOM order is newest-first; reverse to get chronological oldest-first output.
    posts.reverse();
    return posts;
  }

  // ── Record container resolution ──────────────────────────────────────────────

  function resolveActiveRecordContainer(doc) {
    try {
      const activeTab = doc.querySelector('[role="tab"][aria-selected="true"]');
      if (!activeTab) return { root: doc, containerResolved: false };

      const panelId = activeTab.getAttribute('aria-controls');
      if (!panelId) return { root: doc, containerResolved: false };

      const panel = doc.getElementById(panelId);
      if (!panel)  return { root: doc, containerResolved: false };

      return { root: panel, containerResolved: true };
    } catch {
      return { root: doc, containerResolved: false };
    }
  }

  /**
   * Resolves the target record container.
   * If requestedCaseNumber is provided: scans [role="tabpanel"] (Strategy 1),
   * verifies document case number (Strategy 2), anchors on record title (Strategy 3).
   * Falls back to resolveActiveRecordContainer().
   */
  function resolveTargetRecordContainer(doc, requestedCaseNumber) {
    if (!requestedCaseNumber) {
      return resolveActiveRecordContainer(doc);
    }

    const wanted = requestedCaseNumber.trim().toUpperCase();

    // Strategy 1 — standard ARIA tabpanel
    const panels = doc.querySelectorAll('[role="tabpanel"]');
    for (const panel of panels) {
      const cn = extractCaseNumber(panel);
      if (cn && cn.toUpperCase() === wanted) {
        return { root: panel, containerResolved: true };
      }
    }

    // Strategy 2 — verify case number against document (v0.4.2)
    const docCn = extractCaseNumber(doc);
    if (docCn && docCn.toUpperCase() === wanted) {
      return { root: doc, containerResolved: true };
    }

    // Strategy 3 — anchor on record title heading (v0.4.2)
    for (const heading of doc.querySelectorAll('h1, .slds-page-header__title')) {
      const t = (heading.textContent || '').trim();
      if (t.toUpperCase().includes(wanted)) {
        const container = heading.closest(
          '.slds-template__container, [class*="record"], .forceRecordLayout'
        ) || doc;
        return { root: container, containerResolved: container !== doc };
      }
    }

    // No match — fall back gracefully
    return resolveActiveRecordContainer(doc);
  }

  // ── Main orchestrator ────────────────────────────────────────────────────────

  function extractSalesforceData(root, options) {
    const opts = options || {};
    const case_number          = extractCaseNumber(root);
    const account_name         = extractAccountName(root);
    const contact_name         = extractContactName(root);
    const subject              = extractSubject(root);
    const description          = extractDescription(root);
    const agent_description    = extractAgentDescription(root);
    const severity_level       = extractSeverityLevel(root);
    const primary_product      = extractPrimaryProduct(root);
    const next_action_datetime = extractNextActionDatetime(root);

    // Single-pass unified feed — classifies and filters all post types in one pass
    const all_posts = extractAllFeedPosts(root, opts);

    const allFields     = ['case_number', 'account_name', 'contact_name', 'subject', 'description', 'agent_description'];
    const dataMap       = { case_number, account_name, contact_name, subject, description, agent_description };
    const fieldsFound   = allFields.filter(k => dataMap[k]);
    const fieldsMissing = allFields.filter(k => !dataMap[k]);

    const warnings = [];
    if (all_posts.filter(p => p.type === 'customer').length === 0) warnings.push('requiredPostsMissing');

    const _diagnostics = {
      containerResolved: true,
      fieldsFound,
      fieldsMissing,
      postCount: all_posts.length,
      warnings,
    };

    return {
      case_number,
      account_name,
      contact_name,
      subject,
      description,
      agent_description,
      severity_level,
      primary_product,
      next_action_datetime,
      all_posts,
      _diagnostics,
    };
  }

  // ── Formatter ────────────────────────────────────────────────────────────────

  /**
   * Converts the raw extraction object into a plain-text case summary.
   * Output matches the format expected by dashboard.js (reads response.result).
   */
  function formatAsPlainText(raw) {
    const TYPE_LABEL = {
      customer:   'Customer post',
      internal:   'Internal post',
      'jira-etl': 'JIRA/ETL post',
      diagnostic: 'Diagnostic event',
    };
    let out = '';

    out += 'Salesforce case information:\n';
    out += 'Case Number           : ' + (raw.case_number          || 'N/A') + '\n';
    out += 'Subject               : ' + (raw.subject              || 'N/A') + '\n';
    out += 'Account               : ' + (raw.account_name         || 'N/A') + '\n';
    out += 'Contact               : ' + (raw.contact_name         || 'N/A') + '\n';
    if (raw.severity_level)       out += 'Severity Level        : ' + raw.severity_level       + '\n';
    if (raw.primary_product)      out += 'Primary Product       : ' + raw.primary_product      + '\n';
    if (raw.next_action_datetime) out += 'Next Action Datetime  : ' + raw.next_action_datetime + '\n';
    out += '\n';

    out += 'Description:\n';
    out += (raw.description || '(No description)') + '\n\n';

    if (raw.agent_description) {
      out += 'Agent description:\n';
      out += raw.agent_description + '\n\n';
    }

    const posts = raw.all_posts || [];
    if (posts.length > 0) {
      out += 'Case comments: (chronological - oldest first)\n\n';

      posts.forEach(function (post, i) {
        const label = TYPE_LABEL[post.type] || post.type || 'Post';
        out += '[' + label + ' #' + (i + 1) + ']\n';
        out += 'Author    : ' + post.author    + '\n';
        out += 'Timestamp : ' + post.timestamp + '\n';
        out += '\n';
        out += post.content + '\n';
        if (i < posts.length - 1) out += '\n';
      });
    } else {
      out += 'Case comments:\n';
      out += '(No feed posts found on this page)\n';
    }

    return out;
  }

  /**
   * Maps the new data structure (snake_case) to the ReplyCators dashboard.js
   * expected shape (camelCase data object + result string).
   */
  function buildReplyCatorsResponse(raw, diagnostics) {
    const data = {
      caseNumber:          raw.case_number          || '',
      accountName:         raw.account_name         || '',
      contactName:         raw.contact_name         || '',
      subject:             raw.subject              || '',
      description:         raw.description          || '',
      agentDescription:    raw.agent_description    || '',
      severityLevel:       raw.severity_level       || '',
      primaryProduct:      raw.primary_product      || '',
      nextActionDatetime:  raw.next_action_datetime || '',
      posts: (raw.all_posts || []).map(p => ({
        author:    p.author,
        timestamp: p.timestamp,
        content:   p.content,
        type:      p.type,
      })),
    };

    return {
      result:     formatAsPlainText(raw),
      data,
      caseNumber: raw.case_number || '',
      diagnostics,
    };
  }

  // ── Message listener ─────────────────────────────────────────────────────────
  //
  // Supports the ReplyCators message protocol (type-based):
  //   { type: 'SF_IS_CASE_PAGE' }  — lightweight case-page probe
  //   { type: 'SF_EXTRACT', payload: { caseNumber } }  — full extraction
  //
  // MANDATORY PATTERN: The listener returns `true` SYNCHRONOUSLY to keep the
  // message channel open while the async work runs.

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // ── Case-page detection probe (lightweight — no extraction) ──────────────
    if (message.type === 'SF_IS_CASE_PAGE') {
      sendResponse({ isCasePage: isCasePage() });
      return true;
    }

    // ── Full extraction ──────────────────────────────────────────────────────
    if (message.type === 'SF_EXTRACT') {
      (async () => {
        try {
          // Case-page check
          if (!isCasePage()) {
            sendResponse({
              result:      null,
              data:        null,
              caseNumber:  '',
              notCasePage: true,
            });
            return;
          }

          const caseFilter  = (message.payload && message.payload.caseNumber) || '';
          const extractOpts = (message.payload && message.payload.options) || {};

          const { root, containerResolved } = resolveTargetRecordContainer(
            document,
            caseFilter
          );

          const raw = extractSalesforceData(root, extractOpts);
          raw._diagnostics.containerResolved = containerResolved;

          // Soft case-number mismatch guard (v0.4): return data with warning
          if (caseFilter) {
            const wanted  = caseFilter.trim().toUpperCase();
            const present = (raw.case_number || '').toUpperCase();
            if (!present || present !== wanted) {
              raw._diagnostics.resolvedCaseNumber = raw.case_number || '';
              raw._diagnostics.warnings.push('caseNumberMismatch');
            }
          }

          // If a filter was provided and we found a definitive mismatch (no
          // case number found at all), signal not-found so dashboard.js can
          // try the next tab.
          if (caseFilter && !raw.case_number) {
            sendResponse({ result: null, data: null, caseNumber: '' });
            return;
          }

          const { _diagnostics, ...rawFields } = raw;
          sendResponse(buildReplyCatorsResponse(rawFields, _diagnostics));

        } catch (err) {
          sendResponse({ result: null, data: null, error: String(err) });
        }
      })();
      return true; // keep channel open for async IIFE
    }

    return false; // unhandled message type
  });

} // end idempotent init guard
