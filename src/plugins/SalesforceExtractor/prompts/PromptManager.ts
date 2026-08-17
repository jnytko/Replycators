/**
 * Prompt Manager UI
 *
 * Full CRUD interface for prompt management:
 *  - List all prompts (built-in and custom) in order
 *  - Edit any prompt (built-in or custom)
 *  - Delete custom prompts
 *  - Duplicate any prompt
 *  - Create new custom prompts
 *  - Reorder via up/down buttons
 *  - Toggle visibility and enabled state
 *
 * All changes persist via PromptRegistry.
 * No prompt receives special treatment.
 */

import type { PromptDefinition } from './types';
import { promptRegistry } from './PromptRegistry';

export interface PromptManagerOptions {
  container: HTMLElement;
  onClose: () => void;
  onPromptsChanged: () => void;
}

type ManagerView = 'list' | 'edit';

export class PromptManager {
  private container: HTMLElement;
  private onClose: () => void;
  private onPromptsChanged: () => void;
  private view: ManagerView = 'list';
  private editingId: string | null = null;

  constructor(opts: PromptManagerOptions) {
    this.container = opts.container;
    this.onClose = opts.onClose;
    this.onPromptsChanged = opts.onPromptsChanged;
    this.renderListView();
  }

  // ─── List View ──────────────────────────────────────────────────

  private renderListView(): void {
    this.view = 'list';
    const prompts = promptRegistry.getOrdered();

    this.container.innerHTML = `
      <div class="rc-pm-container">
        <div class="rc-pm-header">
          <span class="rc-pm-title">Manage Prompts</span>
          <div class="rc-pm-header-actions">
            <button class="rc-btn rc-btn--secondary rc-btn--sm" id="pm-btn-new">+ New Prompt</button>
            <button class="rc-btn rc-btn--ghost rc-btn--sm" id="pm-btn-close">✕ Close</button>
          </div>
        </div>

        <div class="rc-pm-body">
          <p class="rc-helper-text" style="margin-bottom:8px;">
            All prompts use the same attachment system. Built-in prompts can be edited but not deleted.
          </p>

          <div class="rc-pm-list" id="pm-list">
            ${prompts.map((p, idx) => this.renderListRow(p, idx, prompts.length)).join('')}
          </div>

          ${prompts.length === 0 ? '<div class="rc-pm-empty">No prompts. Click "+ New Prompt" to create one.</div>' : ''}
        </div>
      </div>
    `;

    this.container.querySelector('#pm-btn-new')!.addEventListener('click', () => this.openEditor(null));
    this.container.querySelector('#pm-btn-close')!.addEventListener('click', () => this.onClose());

    // Event delegation for list actions
    this.container.querySelector<HTMLElement>('#pm-list')!.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action][data-id]');
      if (!btn) return;
      const action = btn.dataset['action']!;
      const id = btn.dataset['id']!;
      await this.handleListAction(action, id);
    });
  }

  private renderListRow(p: PromptDefinition, idx: number, total: number): string {
    const isBuiltin = p.source === 'builtin';
    const sourceTag = isBuiltin
      ? '<span class="rc-tag" title="Shipped with the plugin">built-in</span>'
      : '<span class="rc-tag" title="User-created">custom</span>';
    const visIcon  = p.visible  ? '👁' : '🙈';
    const enabIcon = p.enabled  ? '✅' : '⏸';

    return `
      <div class="rc-pm-row" data-id="${p.id}">
        <div class="rc-pm-row__drag">
          <button class="rc-btn rc-btn--ghost rc-btn--xs rc-pm-move-up"
                  data-action="up" data-id="${p.id}"
                  ${idx === 0 ? 'disabled' : ''} title="Move up">↑</button>
          <button class="rc-btn rc-btn--ghost rc-btn--xs rc-pm-move-down"
                  data-action="down" data-id="${p.id}"
                  ${idx === total - 1 ? 'disabled' : ''} title="Move down">↓</button>
        </div>
        <div class="rc-pm-row__info">
          <div class="rc-pm-row__name">${escHtml(p.name)} ${sourceTag}</div>
          ${p.description ? `<div class="rc-pm-row__desc">${escHtml(p.description)}</div>` : ''}
        </div>
        <div class="rc-pm-row__actions">
          <button class="rc-btn rc-btn--ghost rc-btn--xs"
                  data-action="toggle-visible" data-id="${p.id}"
                  title="${p.visible ? 'Hide from selector' : 'Show in selector'}">${visIcon}</button>
          <button class="rc-btn rc-btn--ghost rc-btn--xs"
                  data-action="toggle-enabled" data-id="${p.id}"
                  title="${p.enabled ? 'Disable' : 'Enable'}">${enabIcon}</button>
          <button class="rc-btn rc-btn--secondary rc-btn--xs"
                  data-action="edit" data-id="${p.id}" title="Edit">✎ Edit</button>
          <button class="rc-btn rc-btn--ghost rc-btn--xs"
                  data-action="duplicate" data-id="${p.id}" title="Duplicate">⎘ Dupe</button>
          <button class="rc-btn rc-btn--danger rc-btn--xs"
                  data-action="delete" data-id="${p.id}"
                  ${isBuiltin ? 'disabled title="Built-in prompts cannot be deleted"' : 'title="Delete"'}>
            🗑
          </button>
        </div>
      </div>
    `;
  }

  private async handleListAction(action: string, id: string): Promise<void> {
    const prompt = promptRegistry.getById(id);
    if (!prompt) return;

    switch (action) {
      case 'edit':
        this.openEditor(id);
        break;

      case 'duplicate':
        await promptRegistry.duplicate(id);
        this.onPromptsChanged();
        this.renderListView();
        break;

      case 'delete':
        if (prompt.source === 'builtin') return;
        if (!confirm(`Delete "${prompt.name}"? This cannot be undone.`)) return;
        await promptRegistry.delete(id);
        this.onPromptsChanged();
        this.renderListView();
        break;

      case 'toggle-visible': {
        await promptRegistry.upsert({ ...prompt, visible: !prompt.visible });
        this.onPromptsChanged();
        this.renderListView();
        break;
      }

      case 'toggle-enabled': {
        await promptRegistry.upsert({ ...prompt, enabled: !prompt.enabled });
        this.onPromptsChanged();
        this.renderListView();
        break;
      }

      case 'up': {
        const order = promptRegistry.getOrdered().map(p => p.id);
        const idx = order.indexOf(id);
        if (idx > 0) {
          [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
          await promptRegistry.reorder(order);
          this.onPromptsChanged();
          this.renderListView();
        }
        break;
      }

      case 'down': {
        const order = promptRegistry.getOrdered().map(p => p.id);
        const idx = order.indexOf(id);
        if (idx < order.length - 1) {
          [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
          await promptRegistry.reorder(order);
          this.onPromptsChanged();
          this.renderListView();
        }
        break;
      }
    }
  }

  // ─── Edit View ──────────────────────────────────────────────────

  private openEditor(id: string | null): void {
    this.view = 'edit';
    this.editingId = id;
    const prompt = id ? promptRegistry.getById(id) : null;
    const isNew = !id;

    this.container.innerHTML = `
      <div class="rc-pm-container">
        <div class="rc-pm-header">
          <span class="rc-pm-title">${isNew ? 'New Prompt' : 'Edit Prompt'}</span>
          <div class="rc-pm-header-actions">
            <button class="rc-btn rc-btn--primary rc-btn--sm" id="pm-btn-save">💾 Save</button>
            <button class="rc-btn rc-btn--ghost rc-btn--sm" id="pm-btn-back">← Back</button>
          </div>
        </div>

        <div class="rc-pm-body rc-pm-editor">
          ${prompt?.source === 'builtin' ? `
            <div class="rc-status rc-status--neutral" style="margin-bottom:12px;">
              ℹ️ This is a built-in prompt. Your edits will be saved and take effect immediately.
              To restore the original, duplicate it before editing, or delete a copy.
            </div>
          ` : ''}

          <div class="rc-form-group">
            <label class="rc-label" for="pm-field-name">Name <span style="color:var(--rc-red)">*</span></label>
            <input id="pm-field-name" class="rc-input" type="text"
                   placeholder="e.g. Summarise for Customer"
                   value="${escHtml(prompt?.name ?? '')}" maxlength="80" />
          </div>

          <div class="rc-form-group">
            <label class="rc-label" for="pm-field-desc">Description <span class="rc-muted">(optional)</span></label>
            <input id="pm-field-desc" class="rc-input" type="text"
                   placeholder="Short description shown in the prompt list"
                   value="${escHtml(prompt?.description ?? '')}" maxlength="200" />
          </div>

          <div class="rc-form-group">
            <label class="rc-label" for="pm-field-prompt">
              Prompt Text <span style="color:var(--rc-red)">*</span>
              <span class="rc-muted" style="font-weight:400;margin-left:6px;">
                Use <code>{{CASE_TEXT}}</code> where the case data should be inserted
              </span>
            </label>
            <textarea id="pm-field-prompt" class="rc-textarea rc-textarea--mono" rows="12"
                      placeholder="You are a support engineer. Analyse the case below:\n\n{{CASE_TEXT}}"
            >${escHtml(prompt?.promptText ?? '')}</textarea>
          </div>

          <div class="rc-form-group">
            <label class="rc-label" for="pm-field-system">System Text <span class="rc-muted">(optional)</span></label>
            <textarea id="pm-field-system" class="rc-textarea" rows="3"
                      placeholder="Optional system-level instructions for Bob"
            >${escHtml(prompt?.systemText ?? '')}</textarea>
          </div>

          <div class="rc-form-group">
            <label class="rc-label" for="pm-field-instruct">Execution Instructions <span class="rc-muted">(optional)</span></label>
            <input id="pm-field-instruct" class="rc-input" type="text"
                   placeholder="What the user should expect after running this prompt"
                   value="${escHtml(prompt?.executionInstructions ?? '')}" maxlength="200" />
          </div>

          <div id="pm-save-status" class="rc-status" style="display:none;"></div>
        </div>
      </div>
    `;

    this.container.querySelector('#pm-btn-back')!.addEventListener('click', () => this.renderListView());
    this.container.querySelector('#pm-btn-save')!.addEventListener('click', () => this.saveEditor());
  }

  private async saveEditor(): Promise<void> {
    const name    = (this.container.querySelector<HTMLInputElement>('#pm-field-name')!).value.trim();
    const desc    = (this.container.querySelector<HTMLInputElement>('#pm-field-desc')!).value.trim();
    const pText   = (this.container.querySelector<HTMLTextAreaElement>('#pm-field-prompt')!).value.trim();
    const sText   = (this.container.querySelector<HTMLTextAreaElement>('#pm-field-system')!).value.trim();
    const instruct= (this.container.querySelector<HTMLInputElement>('#pm-field-instruct')!).value.trim();
    const statusEl= this.container.querySelector<HTMLElement>('#pm-save-status')!;

    if (!name) {
      showStatus(statusEl, '❌ Name is required.', 'error');
      return;
    }
    if (!pText) {
      showStatus(statusEl, '❌ Prompt text is required.', 'error');
      return;
    }

    try {
      if (this.editingId) {
        const existing = promptRegistry.getById(this.editingId)!;
        await promptRegistry.upsert({
          ...existing,
          name,
          description: desc || undefined,
          promptText: pText,
          systemText: sText || undefined,
          executionInstructions: instruct || undefined,
        });
      } else {
        await promptRegistry.create({ name, description: desc, promptText: pText, systemText: sText, executionInstructions: instruct });
      }
      this.onPromptsChanged();
      showStatus(statusEl, '✅ Saved!', 'success');
      setTimeout(() => this.renderListView(), 600);
    } catch (err) {
      showStatus(statusEl, `❌ ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function showStatus(el: HTMLElement, msg: string, type: 'success' | 'error'): void {
  el.textContent = msg;
  el.className = `rc-status rc-status--${type}`;
  el.style.display = 'block';
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
