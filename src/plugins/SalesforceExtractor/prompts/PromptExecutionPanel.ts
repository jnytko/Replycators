/**
 * Unified Prompt Execution Panel
 *
 * Renders the identical execution experience for every prompt.
 * This component is agnostic to which prompt is selected — it works the same
 * for built-in prompts, custom prompts, and any future prompts.
 *
 * Responsibilities:
 *  - Render the attachment drop zone, file list, and attachment controls
 *  - Assemble the final prompt string (case text + prompt template + attachments)
 *  - Send the assembled prompt to background.js via RC_EXECUTE_BOB → HTTP helper
 *  - Display execution status
 *
 * The caller provides:
 *  - The extracted case text (from the current SF extraction)
 *  - The selected PromptDefinition
 *  - A reference container element
 */

import type { PromptDefinition, PendingAttachment } from './types';
import { AttachmentManager, MAX_ATTACHMENTS, buildAcceptString } from './AttachmentManager';

export interface ExecutionPanelOptions {
  container: HTMLElement;
  getCaseText: () => string;
  onStatusChange?: (message: string, type: StatusType) => void;
}

export type StatusType = 'neutral' | 'success' | 'error' | 'warning';

// ─── PromptExecutionPanel ─────────────────────────────────────────────────────

export class PromptExecutionPanel {
  private container: HTMLElement;
  private getCaseText: () => string;
  private onStatusChange?: (message: string, type: StatusType) => void;
  private attachmentMgr: AttachmentManager;
  private selectedPrompt: PromptDefinition | null = null;

  // DOM refs
  private promptInfoEl!: HTMLElement;
  private promptNameEl!: HTMLElement;
  private promptDescEl!: HTMLElement;
  private promptInstructEl!: HTMLElement;
  private dropZoneEl!: HTMLElement;
  private fileInputEl!: HTMLInputElement;
  private attachListEl!: HTMLElement;
  private attachCountEl!: HTMLElement;
  private attachLimitEl!: HTMLElement;
  private btnExecute!: HTMLButtonElement;
  private btnClearAttach!: HTMLButtonElement;
  private statusEl!: HTMLElement;

  constructor(opts: ExecutionPanelOptions) {
    this.container = opts.container;
    this.getCaseText = opts.getCaseText;
    this.onStatusChange = opts.onStatusChange;
    this.attachmentMgr = new AttachmentManager(attachments => this.renderAttachmentList(attachments));
    this.render();
    this.bindEvents();
  }

  /** Update the panel when a new prompt is selected. */
  setPrompt(prompt: PromptDefinition | null): void {
    this.selectedPrompt = prompt;
    this.refreshPromptInfo();
    this.updateExecuteButton();
  }

  /** Expose attachment manager so callers can query if needed. */
  getAttachmentManager(): AttachmentManager {
    return this.attachmentMgr;
  }

  // ─── Render ─────────────────────────────────────────────────────

  private render(): void {
    this.container.innerHTML = `
      <div class="rc-exec-panel">
        <!-- Prompt identity -->
        <div class="rc-exec-prompt-info" id="exec-prompt-info">
          <div class="rc-exec-prompt-name" id="exec-prompt-name">No prompt selected</div>
          <div class="rc-exec-prompt-desc" id="exec-prompt-desc"></div>
          <div class="rc-exec-prompt-instruct" id="exec-prompt-instruct" style="display:none;"></div>
        </div>

        <!-- Attachment area -->
        <div class="rc-exec-attach-section">
          <div class="rc-exec-attach-header">
            <span class="rc-label">Attachments</span>
            <span class="rc-exec-attach-count" id="exec-attach-count">0 / ${MAX_ATTACHMENTS}</span>
            <button class="rc-btn rc-btn--ghost rc-btn--xs" id="exec-btn-clear-attach" style="display:none;">
              Clear all
            </button>
          </div>

          <!-- Drop zone -->
          <div class="rc-exec-drop-zone" id="exec-drop-zone" role="button" tabindex="0"
               aria-label="Drop files here or click to browse">
            <input type="file" id="exec-file-input" multiple
                   accept="${buildAcceptString()}"
                   style="display:none;" aria-hidden="true" />
            <div class="rc-exec-drop-icon">📎</div>
            <div class="rc-exec-drop-label">
              Drop files here or <span class="rc-exec-drop-link">click to browse</span>
            </div>
            <div class="rc-exec-drop-hint" id="exec-attach-limit">
              Up to ${MAX_ATTACHMENTS} files — text, CSV, JSON, YAML, XML, Markdown, log &amp; code files
            </div>
          </div>

          <!-- Attachment list -->
          <div class="rc-exec-attach-list" id="exec-attach-list"></div>
        </div>

        <!-- Status -->
        <div class="rc-status rc-status--neutral" id="exec-status" style="display:none;"></div>

        <!-- Execute button -->
        <button class="rc-btn rc-btn--primary rc-exec-run-btn" id="exec-btn-execute" disabled>
          <span class="rc-btn-icon">🚀</span>
          <span>Run with Bob</span>
        </button>
      </div>
    `;

    this.promptInfoEl    = this.container.querySelector<HTMLElement>('#exec-prompt-info')!;
    this.promptNameEl    = this.container.querySelector<HTMLElement>('#exec-prompt-name')!;
    this.promptDescEl    = this.container.querySelector<HTMLElement>('#exec-prompt-desc')!;
    this.promptInstructEl= this.container.querySelector<HTMLElement>('#exec-prompt-instruct')!;
    this.dropZoneEl      = this.container.querySelector<HTMLElement>('#exec-drop-zone')!;
    this.fileInputEl     = this.container.querySelector<HTMLInputElement>('#exec-file-input')!;
    this.attachListEl    = this.container.querySelector<HTMLElement>('#exec-attach-list')!;
    this.attachCountEl   = this.container.querySelector<HTMLElement>('#exec-attach-count')!;
    this.attachLimitEl   = this.container.querySelector<HTMLElement>('#exec-attach-limit')!;
    this.btnExecute      = this.container.querySelector<HTMLButtonElement>('#exec-btn-execute')!;
    this.btnClearAttach  = this.container.querySelector<HTMLButtonElement>('#exec-btn-clear-attach')!;
    this.statusEl        = this.container.querySelector<HTMLElement>('#exec-status')!;
  }

  // ─── Events ─────────────────────────────────────────────────────

  private bindEvents(): void {
    // Open file picker
    this.dropZoneEl.addEventListener('click', () => this.fileInputEl.click());
    this.dropZoneEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.fileInputEl.click();
    });

    // File input change
    this.fileInputEl.addEventListener('change', async () => {
      if (!this.fileInputEl.files?.length) return;
      const errors = await this.attachmentMgr.addFiles(this.fileInputEl.files);
      this.fileInputEl.value = ''; // reset so same file can be re-added if removed
      if (errors.length) this.setStatus(errors[0], 'error');
    });

    // Drag-and-drop
    this.dropZoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZoneEl.classList.add('rc-exec-drop-zone--hover');
    });
    this.dropZoneEl.addEventListener('dragleave', () => {
      this.dropZoneEl.classList.remove('rc-exec-drop-zone--hover');
    });
    this.dropZoneEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.dropZoneEl.classList.remove('rc-exec-drop-zone--hover');
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const errors = await this.attachmentMgr.addFiles(files);
      if (errors.length) this.setStatus(errors[0], 'error');
    });

    // Clear all attachments
    this.btnClearAttach.addEventListener('click', () => {
      this.attachmentMgr.clear();
      this.clearStatus();
    });

    // Execute
    this.btnExecute.addEventListener('click', () => this.execute());
  }

  // ─── Attachment list render ─────────────────────────────────────

  private renderAttachmentList(attachments: PendingAttachment[]): void {
    this.attachCountEl.textContent = `${attachments.length} / ${MAX_ATTACHMENTS}`;
    this.btnClearAttach.style.display = attachments.length > 0 ? '' : 'none';
    this.updateDropZoneState();
    this.updateExecuteButton();

    if (attachments.length === 0) {
      this.attachListEl.innerHTML = '';
      return;
    }

    this.attachListEl.innerHTML = attachments.map((a, idx) => `
      <div class="rc-attach-row" data-key="${a.key}">
        <div class="rc-attach-row__icon">${getStatusIcon(a.status)}</div>
        <div class="rc-attach-row__info">
          <div class="rc-attach-row__name" title="${escHtml(a.file.name)}">${escHtml(a.file.name)}</div>
          <div class="rc-attach-row__meta">
            ${formatBytes(a.file.size)}
            ${a.status === 'error' ? ` · <span class="rc-attach-row__error">${escHtml(a.error ?? 'Error')}</span>` : ''}
          </div>
        </div>
        <div class="rc-attach-row__actions">
          <button class="rc-btn rc-btn--ghost rc-btn--xs rc-attach-btn-up"
                  ${idx === 0 ? 'disabled' : ''} title="Move up"
                  data-key="${a.key}">↑</button>
          <button class="rc-btn rc-btn--ghost rc-btn--xs rc-attach-btn-down"
                  ${idx === attachments.length - 1 ? 'disabled' : ''} title="Move down"
                  data-key="${a.key}">↓</button>
          <button class="rc-btn rc-btn--ghost rc-btn--xs rc-attach-btn-replace"
                  title="Replace file" data-key="${a.key}">↺</button>
          <button class="rc-btn rc-btn--ghost rc-btn--xs rc-attach-btn-remove"
                  title="Remove" data-key="${a.key}">✕</button>
        </div>
      </div>
    `).join('');

    // Bind list-level actions via event delegation
    this.attachListEl.onclick = (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>('[data-key]');
      if (!btn) return;
      const key = btn.dataset['key']!;

      if (btn.classList.contains('rc-attach-btn-remove')) {
        this.attachmentMgr.remove(key);
      } else if (btn.classList.contains('rc-attach-btn-up')) {
        this.attachmentMgr.moveUp(key);
      } else if (btn.classList.contains('rc-attach-btn-down')) {
        this.attachmentMgr.moveDown(key);
      } else if (btn.classList.contains('rc-attach-btn-replace')) {
        this.openReplacePicker(key);
      }
    };
  }

  private openReplacePicker(key: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = buildAcceptString();
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      const err = await this.attachmentMgr.replace(key, input.files[0]);
      if (err) this.setStatus(err, 'error');
    };
    input.click();
  }

  private updateDropZoneState(): void {
    if (this.attachmentMgr.isFull) {
      this.dropZoneEl.classList.add('rc-exec-drop-zone--full');
      this.dropZoneEl.setAttribute('tabindex', '-1');
      this.attachLimitEl.textContent = `Maximum ${MAX_ATTACHMENTS} attachments reached.`;
    } else {
      this.dropZoneEl.classList.remove('rc-exec-drop-zone--full');
      this.dropZoneEl.setAttribute('tabindex', '0');
      this.attachLimitEl.textContent = `Up to ${MAX_ATTACHMENTS} files — text, CSV, JSON, YAML, XML, Markdown, log & code files`;
    }
  }

  // ─── Prompt info ────────────────────────────────────────────────

  private refreshPromptInfo(): void {
    if (!this.selectedPrompt) {
      this.promptNameEl.textContent = 'No prompt selected';
      this.promptDescEl.textContent = '';
      this.promptInstructEl.style.display = 'none';
      return;
    }
    this.promptNameEl.textContent = this.selectedPrompt.name;
    this.promptDescEl.textContent = this.selectedPrompt.description ?? '';
    if (this.selectedPrompt.executionInstructions) {
      this.promptInstructEl.textContent = 'ℹ️ ' + this.selectedPrompt.executionInstructions;
      this.promptInstructEl.style.display = 'block';
    } else {
      this.promptInstructEl.style.display = 'none';
    }
  }

  private updateExecuteButton(): void {
    const hasPrompt = !!this.selectedPrompt?.enabled;
    const attachmentsReady = this.attachmentMgr.isReady;
    this.btnExecute.disabled = !hasPrompt || !attachmentsReady;
  }

  // ─── Execution ──────────────────────────────────────────────────

  private async execute(): Promise<void> {
    if (!this.selectedPrompt) return;
    const caseText = this.getCaseText().trim();
    if (!caseText) {
      this.setStatus('⚠️ No case data extracted yet. Please extract a case first.', 'error');
      return;
    }

    this.btnExecute.disabled = true;
    this.setStatus('⏳ Launching Bob…', 'neutral');

    try {
      const assembledPrompt = this.assemblePrompt(caseText);
      await this.invokeBob(assembledPrompt);
      this.setStatus('✅ Bob launched successfully.', 'success');
    } catch (err) {
      this.setStatus(`❌ Failed to launch Bob: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      this.btnExecute.disabled = !this.selectedPrompt?.enabled;
    }
  }

  /**
   * Assemble the final prompt string:
   *   1. Prompt template (with {{CASE_TEXT}} replaced)
   *   2. Attachment block appended after
   *
   * If the prompt template does not contain {{CASE_TEXT}}, the case text
   * is appended at the end before attachments.
   */
  private assemblePrompt(caseText: string): string {
    if (!this.selectedPrompt) return caseText;
    const template = this.selectedPrompt.promptText;
    let assembled: string;

    if (template.includes('{{CASE_TEXT}}')) {
      assembled = template.replace('{{CASE_TEXT}}', caseText);
    } else {
      assembled = template + '\n\n' + caseText;
    }

    const attachBlock = this.attachmentMgr.buildAttachmentBlock();
    if (attachBlock) assembled += attachBlock;

    return assembled;
  }

  private invokeBob(prompt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Execution path: RC_EXECUTE_BOB → background.js → HTTP POST → tools/bob-helper-server.js
      // nativeMessaging permission is intentionally absent from manifest.json;
      // connectNative() must NOT be used here.
      const requestId = 'sf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      chrome.runtime.sendMessage(
        { type: 'RC_EXECUTE_BOB', payload: { prompt, requestId } },
        (response: { ok: boolean; error?: string; requestId?: string; helperPid?: number; childPid?: number } | undefined) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message ?? 'Unknown runtime error'));
            return;
          }
          if (response?.ok) resolve();
          else reject(new Error(response?.error ?? 'Unknown error from Bob Helper'));
        }
      );
    });
  }

  // ─── Status helpers ─────────────────────────────────────────────

  private setStatus(message: string, type: StatusType): void {
    this.statusEl.textContent = message;
    this.statusEl.className = `rc-status rc-status--${type}`;
    this.statusEl.style.display = message ? 'block' : 'none';
    this.onStatusChange?.(message, type);
  }

  private clearStatus(): void {
    this.setStatus('', 'neutral');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function getStatusIcon(status: PendingAttachment['status']): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'reading': return '⏳';
    case 'ready':   return '✅';
    case 'error':   return '❌';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
