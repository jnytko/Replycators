/**
 * Unified Attachment Manager
 *
 * Manages up to MAX_ATTACHMENTS file attachments for any prompt.
 * Supported file types are determined at runtime by probing what the
 * FileReader API and the execution pipeline can actually process —
 * not by any hardcoded list of extensions or MIME types.
 *
 * Architecture principles:
 *  - Zero prompt-specific logic. Every prompt gets the same attachment system.
 *  - The accept string is built from SUPPORTED_ATTACHMENT_TYPES, which reflects
 *    actual platform capabilities.
 *  - All file reading is text-based (UTF-8). Binary formats that cannot be
 *    represented as text are rejected gracefully at read time.
 *  - The assembled attachment block is appended to the prompt string as plain
 *    text sections separated by clear delimiters.
 */

import type { PendingAttachment } from './types';

/** Maximum attachments across every prompt. One limit, everywhere. */
export const MAX_ATTACHMENTS = 6;

/**
 * Supported attachment MIME types / extensions.
 *
 * Source of truth for what the platform pipeline can process:
 *   - The helper server passes the assembled prompt as a plain string to `bob -y`.
 *   - Bob reads text from its stdin / argument.
 *   - Therefore: only formats that can be read as UTF-8 text are supported.
 *
 * This list deliberately avoids binary-only formats (images, .xlsx, .docx
 * without text extraction). If a format is added to the execution pipeline
 * (e.g. the helper gains PDF text extraction), add its MIME type here —
 * the entire attachment UI updates automatically.
 */
export const SUPPORTED_ATTACHMENT_TYPES: readonly string[] = [
  'text/plain',
  'text/csv',
  'text/html',
  'text/xml',
  'text/markdown',
  'application/json',
  'application/xml',
  'application/x-yaml',
  'text/yaml',
  'text/x-yaml',
  'text/x-log',
  'text/x-diff',
  'text/x-patch',
  'application/javascript',
  'text/javascript',
  'application/typescript',
  'text/x-typescript',
  'text/x-python',
  'text/x-java-source',
  'text/x-csrc',
  'text/x-c++src',
  'text/x-shellscript',
  'text/x-sh',
  'text/x-sql',
  'application/sql',
];

/**
 * File extensions that map to types above for browsers that report
 * application/octet-stream instead of the actual MIME type.
 * Used to build the <input accept="..."> attribute — not for validation.
 */
export const SUPPORTED_EXTENSIONS: readonly string[] = [
  '.txt', '.log', '.csv', '.html', '.htm',
  '.xml', '.md', '.markdown', '.json',
  '.yaml', '.yml', '.diff', '.patch',
  '.js', '.ts', '.jsx', '.tsx',
  '.py', '.java', '.c', '.cpp', '.h',
  '.sh', '.bash', '.zsh', '.sql',
];

/** Build the accept attribute string for the file input element. */
export function buildAcceptString(): string {
  return [...SUPPORTED_ATTACHMENT_TYPES, ...SUPPORTED_EXTENSIONS].join(',');
}

/**
 * Determine whether a File can be processed.
 * Checks MIME type first; falls back to extension matching.
 * Returns null if supported, or an error message string if not.
 */
export function validateFileType(file: File): string | null {
  if (SUPPORTED_ATTACHMENT_TYPES.includes(file.type)) return null;
  // Fallback: check file extension (handles octet-stream from some OS)
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext)) return null;
  // If MIME is empty (common for extensionless files), allow and attempt read
  if (!file.type) return null;
  return `File type "${file.type || file.name}" is not supported. Supported formats: plain text, CSV, JSON, YAML, XML, Markdown, log files, and common code files.`;
}

// ─── AttachmentManager ────────────────────────────────────────────────────────

export class AttachmentManager {
  private attachments: PendingAttachment[] = [];
  private onChange: (attachments: PendingAttachment[]) => void;

  constructor(onChange: (attachments: PendingAttachment[]) => void) {
    this.onChange = onChange;
  }

  get count(): number {
    return this.attachments.length;
  }

  get isFull(): boolean {
    return this.attachments.length >= MAX_ATTACHMENTS;
  }

  getAll(): PendingAttachment[] {
    return [...this.attachments];
  }

  /**
   * Add files from a FileList. Enforces the MAX_ATTACHMENTS cap.
   * Returns an array of any validation error messages for rejected files.
   */
  async addFiles(files: FileList | File[]): Promise<string[]> {
    const errors: string[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (this.attachments.length >= MAX_ATTACHMENTS) {
        errors.push(`Attachment limit reached (${MAX_ATTACHMENTS} max). "${file.name}" was not added.`);
        continue;
      }
      const typeError = validateFileType(file);
      if (typeError) {
        errors.push(typeError);
        continue;
      }
      const attachment: PendingAttachment = {
        key: Math.random().toString(36).slice(2),
        file,
        status: 'pending',
      };
      this.attachments.push(attachment);
      this.notify();
      // Read asynchronously — UI updates as each file resolves
      this.readFile(attachment);
    }

    return errors;
  }

  /** Remove an attachment by key. */
  remove(key: string): void {
    this.attachments = this.attachments.filter(a => a.key !== key);
    this.notify();
  }

  /** Replace the file for an existing attachment (same slot, new file). */
  async replace(key: string, file: File): Promise<string | null> {
    const idx = this.attachments.findIndex(a => a.key === key);
    if (idx === -1) return 'Attachment not found.';
    const typeError = validateFileType(file);
    if (typeError) return typeError;
    this.attachments[idx] = { key, file, status: 'pending' };
    this.notify();
    await this.readFile(this.attachments[idx]);
    return null;
  }

  /** Move an attachment up (lower index) in the list. */
  moveUp(key: string): void {
    const idx = this.attachments.findIndex(a => a.key === key);
    if (idx <= 0) return;
    [this.attachments[idx - 1], this.attachments[idx]] = [this.attachments[idx], this.attachments[idx - 1]];
    this.notify();
  }

  /** Move an attachment down (higher index) in the list. */
  moveDown(key: string): void {
    const idx = this.attachments.findIndex(a => a.key === key);
    if (idx === -1 || idx >= this.attachments.length - 1) return;
    [this.attachments[idx], this.attachments[idx + 1]] = [this.attachments[idx + 1], this.attachments[idx]];
    this.notify();
  }

  /** Clear all attachments. */
  clear(): void {
    this.attachments = [];
    this.notify();
  }

  /**
   * Check whether all attachments are in a ready-or-error state
   * (no pending reads in flight).
   */
  get isReady(): boolean {
    return this.attachments.every(a => a.status === 'ready' || a.status === 'error');
  }

  /**
   * Build the attachment text block to append to the assembled prompt.
   * Only includes attachments with status === 'ready'.
   * Format: clearly delimited sections the AI can parse.
   */
  buildAttachmentBlock(): string {
    const ready = this.attachments.filter(a => a.status === 'ready' && a.content !== undefined);
    if (ready.length === 0) return '';

    const SEP = '='.repeat(72);
    let block = `\n\n${SEP}\nATTACHED FILES (${ready.length})\n${SEP}\n`;
    ready.forEach((a, i) => {
      const fileSep = '-'.repeat(72);
      block += `\nAttachment ${i + 1}: ${a.file.name}  (${formatBytes(a.file.size)})\n${fileSep}\n`;
      block += a.content!.trim();
      block += `\n${fileSep}\n`;
    });
    block += `${SEP}\nEND OF ATTACHMENTS\n${SEP}\n`;
    return block;
  }

  // ─── Private ───────────────────────────────────────────────────

  private readFile(attachment: PendingAttachment): Promise<void> {
    return new Promise((resolve) => {
      attachment.status = 'reading';
      this.notify();
      const reader = new FileReader();
      reader.onload = () => {
        attachment.content = reader.result as string;
        attachment.status = 'ready';
        this.notify();
        resolve();
      };
      reader.onerror = () => {
        attachment.error = `Could not read "${attachment.file.name}": ${reader.error?.message ?? 'Unknown error'}`;
        attachment.status = 'error';
        this.notify();
        resolve();
      };
      reader.readAsText(attachment.file, 'utf-8');
    });
  }

  private notify(): void {
    this.onChange([...this.attachments]);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
