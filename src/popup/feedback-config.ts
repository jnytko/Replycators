export const FEEDBACK_TO_RECIPIENTS = Object.freeze([
  'Jakub.Nytko@ibm.com',
  'Marcin.Jorasz@ibm.com',
] as const);

export const FEEDBACK_COPY_RECIPIENTS = FEEDBACK_TO_RECIPIENTS.join('\n');

export const FEEDBACK_CATEGORY_OPTIONS = Object.freeze([
  { value: 'bug', label: 'Bug or problem' },
  { value: 'feature', label: 'Feature request' },
  { value: 'plugin', label: 'Plugin feedback' },
  { value: 'documentation', label: 'Documentation feedback' },
  { value: 'general', label: 'General feedback' },
  { value: 'other', label: 'Other' },
] as const);

export const FEEDBACK_SCHEMA_VERSION = '1.0';
export const DIAGNOSTICS_SCHEMA_VERSION = '1.0';
export const FEEDBACK_MAX_SUBJECT_LENGTH = 160;
export const FEEDBACK_MAX_MESSAGE_LENGTH = 5000;
export const FEEDBACK_MAX_ATTACHMENT_COUNT = 10;
export const FEEDBACK_MAX_SINGLE_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAILTO_SAFE_LENGTH_THRESHOLD = 1800;
