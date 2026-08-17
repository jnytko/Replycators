/**
 * Unified Prompt System — Type Definitions
 *
 * A PromptDefinition describes only the prompt itself (content, metadata, display).
 * It carries zero knowledge of attachment controls, UI widgets, or execution logic.
 * Those concerns belong entirely to the shared platform layer.
 */

// ─── Prompt definition ────────────────────────────────────────────────────────

export interface PromptDefinition {
  /** Stable identifier — never changes once created. UUID for custom, fixed slug for built-ins. */
  id: string;
  /** Human-readable name shown in the prompt selector. */
  name: string;
  /** Optional short description shown in prompt list / editor. */
  description?: string;
  /** The prompt body sent to Bob. May include {{CASE_TEXT}} placeholder. */
  promptText: string;
  /** Optional system-level instructions prepended to Bob invocation. */
  systemText?: string;
  /** Extra execution notes displayed in the execution panel. */
  executionInstructions?: string;
  /** 0-based sort order in the prompt list. */
  order: number;
  /** Whether this prompt is shown in the selector. */
  visible: boolean;
  /** Whether this prompt can be executed. */
  enabled: boolean;
  /**
   * 'builtin' = shipped with the plugin, editable but not deletable.
   * 'custom'  = created by the user, fully editable and deletable.
   */
  source: 'builtin' | 'custom';
  /** ISO timestamp of last user edit. Undefined for never-edited built-ins. */
  lastModified?: string;
}

// ─── Storage envelope ─────────────────────────────────────────────────────────

export interface PromptStore {
  /** All prompt definitions, keyed by id. */
  prompts: Record<string, PromptDefinition>;
  /** Ordered list of prompt ids for rendering. */
  order: string[];
  /** Version stamp for future migrations. */
  version: number;
}

// ─── Attachment ───────────────────────────────────────────────────────────────

/**
 * A single pending attachment — a File selected by the user plus optional metadata.
 * AttachmentManager converts these into inline text chunks appended to the prompt.
 *
 * Supported formats are determined at runtime from SUPPORTED_ATTACHMENT_TYPES —
 * never hardcoded here. The system accepts any format the platform can read.
 */
export interface PendingAttachment {
  /** Stable local key (Math.random()-based) for list identity. */
  key: string;
  /** The original File object from the input element. */
  file: File;
  /** Human-readable status for the attachment row. */
  status: 'pending' | 'reading' | 'ready' | 'error';
  /** Decoded text content — set after the file is read. */
  content?: string;
  /** Error message if reading failed. */
  error?: string;
}

// ─── Execution payload ────────────────────────────────────────────────────────

/**
 * The complete payload assembled by the execution panel and sent via the Bob execution helper.
 */
export interface ExecutionPayload {
  /** The assembled prompt string (case text + prompt template + attachments). */
  prompt: string;
  /** Snapshot of the selected prompt id for logging. */
  promptId: string;
  /** Number of attachments included. */
  attachmentCount: number;
}
