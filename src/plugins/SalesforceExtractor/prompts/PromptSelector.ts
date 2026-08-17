/**
 * Unified Prompt Selector
 *
 * Renders a scalable, scrollable list of prompts.
 * Designed to handle 1 prompt or 50+ prompts without redesign.
 * Replaces the old radio-button approach.
 *
 * Features:
 *  - Keyboard navigable list
 *  - Search/filter
 *  - Shows prompt name + description
 *  - Indicates built-in vs custom
 *  - Compact item height so 10–20 items fit without scrolling
 */

import type { PromptDefinition } from './types';

export interface PromptSelectorOptions {
  container: HTMLElement;
  onSelect: (prompt: PromptDefinition) => void;
  onManage: () => void;
}

export class PromptSelector {
  private container: HTMLElement;
  private onSelect: (prompt: PromptDefinition) => void;
  private onManage: () => void;
  private prompts: PromptDefinition[] = [];
  private selectedId: string | null = null;
  private filter = '';

  // DOM refs
  private searchEl!: HTMLInputElement;
  private listEl!: HTMLElement;
  private emptyEl!: HTMLElement;

  constructor(opts: PromptSelectorOptions) {
    this.container = opts.container;
    this.onSelect = opts.onSelect;
    this.onManage = opts.onManage;
    this.render();
  }

  /** Replace the full prompt list and re-render. */
  setPrompts(prompts: PromptDefinition[]): void {
    this.prompts = prompts;
    this.renderList();
  }

  /** Set the active/selected prompt id. */
  setSelected(id: string | null): void {
    this.selectedId = id;
    this.renderList();
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  // ─── Render ─────────────────────────────────────────────────────

  private render(): void {
    this.container.innerHTML = `
      <div class="rc-prompt-selector">
        <div class="rc-prompt-selector__toolbar">
          <input class="rc-input rc-input--sm rc-prompt-selector__search"
                 id="prompt-search"
                 type="search"
                 placeholder="Search prompts…"
                 autocomplete="off"
                 spellcheck="false" />
          <button class="rc-btn rc-btn--secondary rc-btn--sm" id="prompt-manage-btn" title="Manage prompts">
            ✎ Manage
          </button>
        </div>
        <div class="rc-prompt-list" id="prompt-list" role="listbox" aria-label="Select a prompt">
        </div>
        <div class="rc-prompt-list__empty" id="prompt-list-empty" style="display:none;">
          No prompts match your search.
        </div>
      </div>
    `;

    this.searchEl = this.container.querySelector<HTMLInputElement>('#prompt-search')!;
    this.listEl   = this.container.querySelector<HTMLElement>('#prompt-list')!;
    this.emptyEl  = this.container.querySelector<HTMLElement>('#prompt-list-empty')!;

    this.searchEl.addEventListener('input', () => {
      this.filter = this.searchEl.value.toLowerCase();
      this.renderList();
    });

    this.container.querySelector<HTMLButtonElement>('#prompt-manage-btn')!
      .addEventListener('click', () => this.onManage());
  }

  private renderList(): void {
    const visible = this.prompts.filter(p => {
      if (!p.visible) return false;
      if (!this.filter) return true;
      return p.name.toLowerCase().includes(this.filter) ||
             (p.description ?? '').toLowerCase().includes(this.filter);
    });

    if (visible.length === 0) {
      this.listEl.innerHTML = '';
      this.emptyEl.style.display = 'block';
      return;
    }

    this.emptyEl.style.display = 'none';
    this.listEl.innerHTML = visible.map(p => {
      const isSelected = p.id === this.selectedId;
      const badge = p.source === 'custom'
        ? '<span class="rc-tag">custom</span>'
        : '';
      const disabledAttr = p.enabled ? '' : 'aria-disabled="true"';
      return `
        <div class="rc-prompt-item ${isSelected ? 'rc-prompt-item--selected' : ''} ${!p.enabled ? 'rc-prompt-item--disabled' : ''}"
             role="option"
             aria-selected="${isSelected}"
             ${disabledAttr}
             data-id="${p.id}"
             tabindex="${isSelected ? '0' : '-1'}">
          <div class="rc-prompt-item__body">
            <div class="rc-prompt-item__name">${escHtml(p.name)} ${badge}</div>
            ${p.description ? `<div class="rc-prompt-item__desc">${escHtml(p.description)}</div>` : ''}
          </div>
          ${isSelected ? '<div class="rc-prompt-item__check">✓</div>' : ''}
        </div>
      `;
    }).join('');

    // Event delegation — single listener on list
    this.listEl.onclick = (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.rc-prompt-item');
      if (!item) return;
      const id = item.dataset['id']!;
      const prompt = this.prompts.find(p => p.id === id);
      if (!prompt || !prompt.enabled) return;
      this.selectedId = id;
      this.renderList();
      // Focus the selected item for keyboard continuity
      this.listEl.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus();
      this.onSelect(prompt);
    };

    // Keyboard navigation
    this.listEl.onkeydown = (e) => {
      const items = Array.from(this.listEl.querySelectorAll<HTMLElement>('.rc-prompt-item:not(.rc-prompt-item--disabled)'));
      const currentIdx = items.findIndex(el => el === document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[Math.min(currentIdx + 1, items.length - 1)]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[Math.max(currentIdx - 1, 0)]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.click();
      }
    };
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
