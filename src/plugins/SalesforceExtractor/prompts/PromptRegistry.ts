/**
 * Unified Prompt System — PromptRegistry
 *
 * Owns all prompt definitions and their persistence.
 * All prompts — built-in and custom — are stored and retrieved through
 * this single registry. No caller should hard-code prompt IDs or
 * treat any prompt category differently.
 */

import type { PromptDefinition, PromptStore } from './types';

const STORAGE_KEY = 'sf_prompt_store';
const STORE_VERSION = 1;
const MAX_CUSTOM_PROMPTS = 50;

// ─── Default built-in prompts ─────────────────────────────────────────────────
// These are the initial seeds. Once stored, the user's saved version takes over.

const BUILTIN_PROMPTS: PromptDefinition[] = [
  {
    id: 'builtin-understand-case',
    name: 'Understand Case',
    description: 'Analyse the case context and produce a concise understanding summary.',
    promptText: `You are a technical support engineer. Read the Salesforce case below and produce a structured understanding summary.

Include:
- What the customer is experiencing
- The product / component affected
- Severity and urgency indicators
- Any error messages or codes mentioned
- What the customer has already tried
- Suggested immediate next steps

{{CASE_TEXT}}`,
    systemText: 'You are an expert Apptio One support engineer. Be concise and precise.',
    executionInstructions: 'Bob will analyse the case and return a structured understanding summary.',
    order: 0,
    visible: true,
    enabled: true,
    source: 'builtin',
  },
  {
    id: 'builtin-research-case',
    name: 'Research Case',
    description: 'Research the issue across known product documentation and KB articles.',
    promptText: `You are a technical support engineer researching an escalated Salesforce case.

Given the case details below, search available documentation, known issues, and KB articles to:
- Identify the most likely root cause(s)
- List relevant KB articles or documentation sections
- Describe any known similar incidents and their resolutions
- Propose a recommended investigation path

{{CASE_TEXT}}`,
    systemText: 'You are an expert Apptio One support engineer with deep product knowledge.',
    executionInstructions: 'Bob will research the issue and return relevant documentation and resolution paths.',
    order: 1,
    visible: true,
    enabled: true,
    source: 'builtin',
  },
];

// ─── PromptRegistry ───────────────────────────────────────────────────────────

export class PromptRegistry {
  private store: PromptStore | null = null;

  /** Load stored prompts, seeding from built-ins if first run. */
  async load(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const saved = result[STORAGE_KEY] as PromptStore | undefined;
        if (saved && saved.version === STORE_VERSION) {
          // Merge: ensure any new built-ins that aren't in the store get added
          this.store = this.mergeBuiltins(saved);
        } else {
          this.store = this.buildDefaultStore();
        }
        resolve();
      });
    });
  }

  /** Persist current state to storage. */
  async save(): Promise<void> {
    if (!this.store) return;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: this.store }, resolve);
    });
  }

  /** Return all prompts in display order, filtered by visible flag. */
  getVisible(): PromptDefinition[] {
    return this.getOrdered().filter(p => p.visible);
  }

  /** Return all prompts in display order regardless of visibility. */
  getOrdered(): PromptDefinition[] {
    if (!this.store) return [];
    return this.store.order
      .map(id => this.store!.prompts[id])
      .filter(Boolean);
  }

  /** Return a single prompt by id. */
  getById(id: string): PromptDefinition | undefined {
    return this.store?.prompts[id];
  }

  /**
   * Upsert a prompt definition.
   * For built-in prompts, updates all mutable fields (name, description,
   * promptText, systemText, executionInstructions, visible, enabled) but
   * preserves the source='builtin' marker so the prompt cannot be deleted.
   */
  async upsert(prompt: PromptDefinition): Promise<void> {
    if (!this.store) await this.load();
    const existing = this.store!.prompts[prompt.id];
    // Preserve source if it already exists (never allow downgrading builtin→custom)
    const merged: PromptDefinition = {
      ...prompt,
      source: existing?.source ?? prompt.source,
      lastModified: new Date().toISOString(),
    };
    this.store!.prompts[prompt.id] = merged;
    if (!this.store!.order.includes(prompt.id)) {
      this.store!.order.push(prompt.id);
    }
    await this.save();
  }

  /** Create a new custom prompt. */
  async create(partial: Pick<PromptDefinition, 'name' | 'description' | 'promptText' | 'systemText' | 'executionInstructions'>): Promise<PromptDefinition> {
    if (!this.store) await this.load();
    const customCount = Object.values(this.store!.prompts).filter(p => p.source === 'custom').length;
    if (customCount >= MAX_CUSTOM_PROMPTS) {
      throw new Error(`Maximum of ${MAX_CUSTOM_PROMPTS} custom prompts reached.`);
    }
    const id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const maxOrder = this.getOrdered().reduce((m, p) => Math.max(m, p.order), -1);
    const prompt: PromptDefinition = {
      id,
      name: partial.name || 'Untitled Prompt',
      description: partial.description,
      promptText: partial.promptText || '',
      systemText: partial.systemText,
      executionInstructions: partial.executionInstructions,
      order: maxOrder + 1,
      visible: true,
      enabled: true,
      source: 'custom',
      lastModified: new Date().toISOString(),
    };
    this.store!.prompts[id] = prompt;
    this.store!.order.push(id);
    await this.save();
    return prompt;
  }

  /** Duplicate any prompt (built-in or custom) into a new custom prompt. */
  async duplicate(id: string): Promise<PromptDefinition | null> {
    const source = this.getById(id);
    if (!source) return null;
    return this.create({
      name: source.name + ' (Copy)',
      description: source.description,
      promptText: source.promptText,
      systemText: source.systemText,
      executionInstructions: source.executionInstructions,
    });
  }

  /**
   * Delete a prompt.
   * Built-in prompts cannot be deleted — call returns false.
   */
  async delete(id: string): Promise<boolean> {
    if (!this.store) return false;
    const prompt = this.store.prompts[id];
    if (!prompt || prompt.source === 'builtin') return false;
    delete this.store.prompts[id];
    this.store.order = this.store.order.filter(oid => oid !== id);
    await this.save();
    return true;
  }

  /**
   * Reorder prompts. The caller supplies a complete ordered array of ids.
   * Missing ids are appended at the end.
   */
  async reorder(orderedIds: string[]): Promise<void> {
    if (!this.store) return;
    // Rebuild order: provided ids first, then any that were omitted
    const all = new Set(this.store.order);
    const provided = orderedIds.filter(id => all.has(id));
    const remainder = this.store.order.filter(id => !provided.includes(id));
    this.store.order = [...provided, ...remainder];
    // Sync the order field on each prompt definition
    this.store.order.forEach((id, idx) => {
      if (this.store!.prompts[id]) this.store!.prompts[id].order = idx;
    });
    await this.save();
  }

  // ─── Private helpers ───────────────────────────────────────────

  private buildDefaultStore(): PromptStore {
    const prompts: Record<string, PromptDefinition> = {};
    const order: string[] = [];
    BUILTIN_PROMPTS.forEach(p => {
      prompts[p.id] = { ...p };
      order.push(p.id);
    });
    return { prompts, order, version: STORE_VERSION };
  }

  private mergeBuiltins(saved: PromptStore): PromptStore {
    // Add any built-in that is new (not yet in saved store)
    BUILTIN_PROMPTS.forEach(bp => {
      if (!saved.prompts[bp.id]) {
        saved.prompts[bp.id] = { ...bp };
        saved.order.unshift(bp.id); // prepend new built-ins
      }
    });
    return saved;
  }
}

/** Singleton — one registry per plugin session. */
export const promptRegistry = new PromptRegistry();
