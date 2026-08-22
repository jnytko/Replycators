#!/usr/bin/env node

'use strict';

const QUEUE_LABEL = 'auto-fix';

const ISSUE_TYPE_LABELS = new Set([
  'bug',
  'documentation',
  'enhancement'
]);

const PRIORITY_LABELS = new Set([
  'priority:p1',
  'priority:p2',
  'priority:p3',
  'priority:p4'
]);

const AREA_LABELS = new Set([
  'area:apptio',
  'area:backup-restore',
  'area:bob-helper',
  'area:build-release',
  'area:cloudability',
  'area:governance',
  'area:platform',
  'area:plugins',
  'area:salesforce',
  'area:snake',
  'area:workspace'
]);

const MANAGED_STATE_LABELS = new Set([
  'state:blocked',
  'state:implementation',
  'state:validated'
]);

const EXCLUSION_LABELS = new Set([
  'duplicate',
  'invalid',
  'wontfix'
]);

function labelNames(issue) {
  return (issue.labels || [])
    .map((label) => typeof label === 'string' ? label : label.name)
    .filter(Boolean);
}

function labelsInSet(labels, allowed) {
  return labels.filter((label) => allowed.has(label));
}

function validateIssueLabels(issue) {
  const errors = [];
  const labels = labelNames(issue);

  if (issue.pull_request) errors.push('pull requests are never eligible');
  if (issue.state !== 'open') errors.push('issue is not open');
  if (!labels.includes(QUEUE_LABEL)) errors.push(`missing required label ${QUEUE_LABEL}`);

  if (labelsInSet(labels, ISSUE_TYPE_LABELS).length !== 1) {
    errors.push('exactly one recognized issue type label is required');
  }
  if (labelsInSet(labels, PRIORITY_LABELS).length !== 1) {
    errors.push('exactly one recognized priority:p1-p4 label is required');
  }
  if (labelsInSet(labels, AREA_LABELS).length !== 1) {
    errors.push('exactly one recognized area:* label is required');
  }

  const stateLabels = labels.filter((label) => label.startsWith('state:'));
  if (stateLabels.some((label) => !MANAGED_STATE_LABELS.has(label))) {
    errors.push('issue contains an unrecognized state:* label');
  }
  if (stateLabels.length > 1) {
    errors.push('at most one recognized state:* label is allowed');
  }
  if (labels.includes('state:blocked')) errors.push('issue is blocked');
  if (labels.includes('state:implementation')) errors.push('issue is already in implementation');

  const exclusions = labelsInSet(labels, EXCLUSION_LABELS);
  if (exclusions.length) errors.push(`issue is excluded by label ${exclusions.join(', ')}`);

  return errors;
}

function isAvailableCandidate(issue) {
  const labels = labelNames(issue);
  return !issue.pull_request
    && issue.state === 'open'
    && labels.includes(QUEUE_LABEL)
    && !labels.includes('state:blocked')
    && !labels.includes('state:implementation')
    && labelsInSet(labels, EXCLUSION_LABELS).length === 0;
}

function withManagedState(labels, nextState = null) {
  if (nextState !== null && !MANAGED_STATE_LABELS.has(nextState)) {
    throw new Error(`unsupported remediation state label: ${nextState}`);
  }
  const updated = labels.filter((label) => !label.startsWith('state:'));
  if (nextState) updated.push(nextState);
  return Array.from(new Set(updated));
}

module.exports = {
  AREA_LABELS,
  EXCLUSION_LABELS,
  ISSUE_TYPE_LABELS,
  MANAGED_STATE_LABELS,
  PRIORITY_LABELS,
  QUEUE_LABEL,
  isAvailableCandidate,
  labelNames,
  validateIssueLabels,
  withManagedState
};
