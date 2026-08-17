/**
 * SalesforceExtractorUI — v3.0.0 — Unified Prompt Architecture
 *
 * This is the entry-point that wires together all reusable platform components:
 *  - PromptRegistry    — all prompt definitions, persisted
 *  - PromptSelector    — scalable list-based prompt chooser
 *  - PromptExecutionPanel — shared attachment + execution UI for every prompt
 *  - PromptManager     — full CRUD for built-in and custom prompts
 *
 * The extraction panel (Salesforce tab detection, Extract button, preview)
 * remains here — it owns the case text that feeds into the execution panel.
 *
 * Architecture guarantee:
 *  - No prompt receives special UI treatment.
 *  - Adding a new prompt requires zero UI code.
 *  - All prompts support 0–6 attachments using the same framework.
 */

import type { PluginContext } from '@replycators/sdk';
import { SalesforceExtractionService } from '../background/ExtractionService';
import type { SalesforceExtractResult } from '../background/ExtractionService';
import { promptRegistry } from '../prompts/PromptRegistry';
import { PromptSelector } from '../prompts/PromptSelector';
import { PromptExecutionPanel } from '../prompts/PromptExecutionPanel';
import { PromptManager } from '../prompts/PromptManager';
import type { PromptDefinition } from '../prompts/types';

export function renderSalesforceUI(container: HTMLElement, ctx: PluginContext): void {
  container.innerHTML = getShellHTML();
  initUI(container, ctx).catch(err => {
    ctx.services.logger.error('SalesforceExtractorUI init failed:', err);
  });
}

// ─── Shell HTML ───────────────────────────────────────────────────

function getShellHTML(): string {
  return `
    <div class="sf-extractor-root" style="padding:0;">
      <div class="rc-panel-header">
        <span class="rc-panel-title">☁️ Salesforce Case Extractor</span>
        <span class="rc-badge rc-badge--blue">CRM</span>
      </div>

      <div class="rc-panel-body">

        <!-- ── SECTION 1: Case Extraction ── -->
        <div class="rc-section-block" id="sf-extraction-section">
          <div class="rc-section-header">Case Extraction</div>

          <div id="sf-tab-detection-banner" class="rc-status rc-status--neutral" style="margin-bottom:8px;">
            ⏳ Checking for active Salesforce Case…
          </div>

          <div class="rc-form-group">
            <label class="rc-label" for="sf-case-number">Case Number <span class="rc-muted">(optional)</span></label>
            <div class="rc-input-row">
              <input type="text" id="sf-case-number" class="rc-input" placeholder="e.g. TS0012345678"
                autocomplete="off" spellcheck="false" />
              <button id="sf-btn-extract" class="rc-btn rc-btn--primary" disabled>
                <span class="rc-btn-icon">📋</span> Extract
              </button>
            </div>
            <p class="rc-helper-text">
              Leave blank to extract from the active Salesforce Case tab.
              Enter a case number to search all open Salesforce tabs.
            </p>
          </div>

          <div id="sf-extract-status" class="rc-status rc-status--neutral" style="display:none;"></div>

          <!-- Case preview (collapsible) -->
          <div id="sf-preview-section" class="rc-section-block" style="display:none;">
            <div class="rc-preview-toolbar">
              <span class="rc-preview-label">Extracted Case Text</span>
              <div class="rc-preview-actions">
                <button id="sf-btn-copy" class="rc-btn rc-btn--secondary rc-btn--sm">📋 Copy</button>
                <button id="sf-btn-download" class="rc-btn rc-btn--secondary rc-btn--sm">⬇️ Download</button>
                <button id="sf-btn-clear" class="rc-btn rc-btn--ghost rc-btn--sm">✕ Clear</button>
              </div>
            </div>
            <textarea id="sf-preview" class="rc-textarea rc-textarea--mono" readonly rows="10"
              placeholder="Extracted case summary will appear here…"></textarea>
          </div>
        </div>

        <!-- ── SECTION 2: Prompt Selection ── -->
        <div class="rc-section-block">
          <div class="rc-section-header">Select Prompt</div>
          <div id="prompt-selector-mount"></div>
        </div>

        <!-- ── SECTION 3: Execution Panel (attachments + run) ── -->
        <div class="rc-section-block" id="exec-panel-section">
          <div class="rc-section-header">Execute with Bob</div>
          <div id="exec-panel-mount"></div>
        </div>

        <!-- ── SECTION 4: Prompt Manager (shown in-place when "Manage" is clicked) ── -->
        <div class="rc-section-block" id="prompt-manager-section" style="display:none;">
          <div id="prompt-manager-mount"></div>
        </div>

      </div>
    </div>
  `;
}

// ─── Initialization ───────────────────────────────────────────────

async function initUI(container: HTMLElement, ctx: PluginContext): Promise<void> {
  // ── Load registry first ──────────────────────────────────────────
  await promptRegistry.load();

  // ── DOM refs ─────────────────────────────────────────────────────
  const inputEl          = container.querySelector<HTMLInputElement>('#sf-case-number')!;
  const bannerEl         = container.querySelector<HTMLElement>('#sf-tab-detection-banner')!;
  const extractStatusEl  = container.querySelector<HTMLElement>('#sf-extract-status')!;
  const previewEl        = container.querySelector<HTMLTextAreaElement>('#sf-preview')!;
  const previewSection   = container.querySelector<HTMLElement>('#sf-preview-section')!;
  const btnExtract       = container.querySelector<HTMLButtonElement>('#sf-btn-extract')!;
  const btnCopy          = container.querySelector<HTMLButtonElement>('#sf-btn-copy')!;
  const btnDownload      = container.querySelector<HTMLButtonElement>('#sf-btn-download')!;
  const btnClear         = container.querySelector<HTMLButtonElement>('#sf-btn-clear')!;
  const selectorMount    = container.querySelector<HTMLElement>('#prompt-selector-mount')!;
  const execMount        = container.querySelector<HTMLElement>('#exec-panel-mount')!;
  const managerSection   = container.querySelector<HTMLElement>('#prompt-manager-section')!;
  const managerMount     = container.querySelector<HTMLElement>('#prompt-manager-mount')!;

  // ── Extraction state ─────────────────────────────────────────────
  let lastCaseText = '';

  // ── Build unified execution panel ───────────────────────────────
  const executionPanel = new PromptExecutionPanel({
    container: execMount,
    getCaseText: () => lastCaseText,
  });

  // ── Build prompt selector ────────────────────────────────────────
  let selectedPrompt: PromptDefinition | null = null;

  const promptSelector = new PromptSelector({
    container: selectorMount,
    onSelect: (prompt) => {
      selectedPrompt = prompt;
      executionPanel.setPrompt(prompt);
    },
    onManage: () => {
      managerSection.style.display = 'block';
      managerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      renderManager();
    },
  });

  // ── Populate selector ────────────────────────────────────────────
  const refreshSelector = (): void => {
    const visible = promptRegistry.getVisible();
    promptSelector.setPrompts(visible);
    // Re-select current if still available, or select first
    const currentId = selectedPrompt?.id ?? null;
    const stillExists = currentId ? visible.find(p => p.id === currentId) : null;
    const toSelect = stillExists ?? visible[0] ?? null;
    if (toSelect) {
      promptSelector.setSelected(toSelect.id);
      selectedPrompt = toSelect;
      executionPanel.setPrompt(toSelect);
    } else {
      promptSelector.setSelected(null);
      selectedPrompt = null;
      executionPanel.setPrompt(null);
    }
  };
  refreshSelector();

  // ── Prompt Manager ───────────────────────────────────────────────
  let managerInstance: PromptManager | null = null;

  const renderManager = (): void => {
    managerInstance = new PromptManager({
      container: managerMount,
      onClose: () => {
        managerSection.style.display = 'none';
        managerInstance = null;
      },
      onPromptsChanged: refreshSelector,
    });
  };

  // ── Detection banner (lazy — runs only on user interaction) ──────
  //
  // Validation is deferred until the user types a case number or clicks
  // Extract.  No content-script injection, no tab scanning, and no
  // background work occurs during plugin mount or ReplyCators startup.
  //
  // Initial state: Extract button disabled, banner shows idle hint.
  setStatus(bannerEl, 'ℹ️ Enter a case number above, or switch to a Salesforce Case tab and click Extract.', 'neutral');
  bannerEl.style.display = 'block';
  btnExtract.disabled = false; // enabled — validation runs at click time

  inputEl.addEventListener('input', () => {
    const pos = inputEl.selectionStart;
    inputEl.value = inputEl.value.toUpperCase();
    inputEl.setSelectionRange(pos, pos);
    // Clear any stale banner state when the user edits the input.
    // Full validation runs when Extract is clicked.
    if (inputEl.value.trim().length > 0) {
      setStatus(bannerEl, 'ℹ️ Case number entered — will search all open Salesforce tabs.', 'neutral');
    } else {
      setStatus(bannerEl, 'ℹ️ Enter a case number above, or switch to a Salesforce Case tab and click Extract.', 'neutral');
    }
  });

  /**
   * Validate that the currently active browser tab is a Salesforce page.
   * Called only at Extract-click time — never on mount or in the background.
   *
   * Returns the active Salesforce tab, or null with a user-facing error message
   * already shown in the banner.
   */
  async function validateActiveTabForExtraction(): Promise<chrome.tabs.Tab | null> {
    setStatus(bannerEl, '⏳ Checking active tab…', 'neutral');

    const sfTab = await getActiveSalesforceTab();
    if (!sfTab) {
      setStatus(bannerEl,
        '❌ Salesforce tab inactive. Please switch to an active Salesforce case tab and try again.',
        'error');
      return null;
    }

    // Inject content script and probe whether the active page is a Case page.
    await safeInject(sfTab.id!);
    const isCasePage = await new Promise<boolean>(resolve => {
      chrome.tabs.sendMessage(
        sfTab.id!,
        { type: 'SF_IS_CASE_PAGE', pluginId: 'com.replycators.salesforce-extractor' },
        (response) => {
          if (chrome.runtime.lastError || !response) { resolve(false); return; }
          resolve(!!response.isCasePage);
        }
      );
    });

    if (isCasePage) {
      const tabTitle = sfTab.title ? ' — ' + sfTab.title.replace(/\s*[-|].*$/, '').trim() : '';
      setStatus(bannerEl, '✅ Salesforce Case detected' + tabTitle, 'success');
      return sfTab;
    } else {
      setStatus(bannerEl,
        '❌ Active Salesforce tab is not a Case page. Please open a Salesforce Case and try again.',
        'error');
      return null;
    }
  }

  // ── Extract button ───────────────────────────────────────────────
  btnExtract.addEventListener('click', async () => {
    previewSection.style.display = 'none';
    previewEl.value = '';
    lastCaseText = '';
    btnExtract.disabled = true;

    const caseNumber = inputEl.value.trim();

    try {
      const svc = new SalesforceExtractionService(ctx.services);
      let result: SalesforceExtractResult | null = null;

      if (caseNumber) {
        // Case-number path: search all open Salesforce tabs.
        setStatus(extractStatusEl, `⏳ Searching for case ${caseNumber}…`, 'neutral');
        result = await svc.extractByCaseNumber(caseNumber);
        if (!result) {
          setStatus(extractStatusEl, `❌ Case ${caseNumber} not found in any open Salesforce tab.`, 'error');
          return;
        }
      } else {
        // Active-tab path: validate the active tab first, then extract.
        // This is the ONLY place tab validation and content-script injection happen.
        setStatus(extractStatusEl, '⏳ Extracting from active Salesforce Case tab…', 'neutral');
        const sfTab = await validateActiveTabForExtraction();
        if (!sfTab) {
          // validateActiveTabForExtraction() already updated the banner.
          return;
        }
        result = await svc.extractFromTab(sfTab.id!, '');
        if (!result) {
          setStatus(extractStatusEl, '❌ This page is not a supported Salesforce Case page.', 'error');
          return;
        }
        if (result.caseNumber) inputEl.value = result.caseNumber;
      }

      lastCaseText = result.rawText || formatResult(result);
      previewEl.value = lastCaseText;
      previewSection.style.display = 'block';
      setStatus(extractStatusEl, `✅ Extracted case ${result.caseNumber || 'data'} successfully`, 'success');
    } catch (err) {
      setStatus(extractStatusEl, `❌ Extraction failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      btnExtract.disabled = false;
    }
  });

  // ── Preview toolbar ──────────────────────────────────────────────
  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(previewEl.value);
      setStatus(extractStatusEl, '✅ Copied to clipboard!', 'success');
    } catch {
      setStatus(extractStatusEl, '❌ Clipboard write failed', 'error');
    }
  });

  btnDownload.addEventListener('click', () => {
    const text = previewEl.value;
    if (!text) return;
    const filename = (inputEl.value.trim() || 'salesforce_case') + '.txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnClear.addEventListener('click', () => {
    previewEl.value = '';
    lastCaseText = '';
    previewSection.style.display = 'none';
    setStatus(extractStatusEl, '', 'neutral');
    extractStatusEl.style.display = 'none';
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

function setStatus(el: HTMLElement, message: string, type: 'neutral' | 'success' | 'error' | 'warning'): void {
  el.textContent = message;
  el.className = `rc-status rc-status--${type}`;
  el.style.display = message ? 'block' : 'none';
}

function formatResult(result: SalesforceExtractResult): string {
  const SEP  = '='.repeat(72);
  const SEP2 = '-'.repeat(72);
  let out = '';

  out += `${SEP}\nSALESFORCE CASE INFORMATION\n${SEP}\n\n`;
  out += `Case Number : ${result.caseNumber || 'N/A'}\n`;
  out += `Subject     : ${result.subject || 'N/A'}\n`;
  out += `Account     : ${result.accountName || 'N/A'}\n`;
  out += `Contact     : ${result.contactName || 'N/A'}\n`;
  out += `Status      : ${(result as any).status || 'N/A'}\n`;
  out += `Priority    : ${(result as any).priority || 'N/A'}\n\n`;

  out += `${SEP2}\nDESCRIPTION\n${SEP2}\n\n`;
  out += `${result.description || '(No description)'}\n\n`;

  if ((result as any).agentDescription) {
    out += `${SEP2}\nAGENT DESCRIPTION\n${SEP2}\n\n`;
    out += `${(result as any).agentDescription}\n\n`;
  }

  if (result.posts?.length > 0) {
    out += `${SEP}\nCASE HISTORY  (chronological — oldest first)\n${SEP}\n\n`;
    result.posts.forEach((post, i) => {
      const typeTag = (post as any).type === 'internal' ? '[Internal Post]' : '[Customer Post]';
      out += `Post #${i + 1}  ${typeTag}\n`;
      out += `Author    : ${post.author}\n`;
      out += `Timestamp : ${post.timestamp}\n\n`;
      out += `${post.content}\n\n${SEP2}\n\n`;
    });
  } else {
    out += `${SEP}\nCASE HISTORY\n${SEP}\n\n(No feed posts found on this page)\n\n`;
  }

  out += `${SEP}\nEND OF CASE SUMMARY\n${SEP}\n`;
  return out;
}

/**
 * Returns the CURRENTLY ACTIVE tab if and only if it is a Salesforce page.
 *
 * Rules (matching the spec):
 *  - Only the focused window's active tab is considered.
 *  - Background Salesforce tabs are ignored.
 *  - Cached Salesforce tabs are ignored.
 *  - Any non-Salesforce active tab returns null.
 *
 * This function does NOT fall back to searching all tabs.  If the active tab
 * is not Salesforce, it returns null and the caller shows an error.
 */
function getActiveSalesforceTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    // Query only the active tab in the last-focused window.
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs.length) { resolve(null); return; }
      const tab = tabs[0];
      if (tab.url && /salesforce\.com|lightning\.force\.com/i.test(tab.url)) {
        resolve(tab);
      } else {
        resolve(null);
      }
    });
  });
}

function safeInject(tabId: number): Promise<void> {
  return chrome.scripting.executeScript({ target: { tabId }, files: ['sf-content.js'] })
    .then(() => {})
    .catch(() => {});
}
