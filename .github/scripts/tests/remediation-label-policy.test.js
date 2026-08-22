#!/usr/bin/env node

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {
  AREA_LABELS,
  EXCLUSION_LABELS,
  ISSUE_TYPE_LABELS,
  MANAGED_STATE_LABELS,
  PRIORITY_LABELS,
  QUEUE_LABEL,
  isAvailableCandidate,
  validateIssueLabels,
  withManagedState
} = require('../remediation-label-policy');
const { validateEligibility } = require('../remediation-issue-policy');

function issue(labels, overrides = {}) {
  return {
    labels,
    state: 'open',
    ...overrides
  };
}

const inventoryPath = path.resolve(__dirname, '../../labels.json');
const inventoryNames = new Set(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')).map((label) => label.name));
const policyLabels = [
  QUEUE_LABEL,
  ...ISSUE_TYPE_LABELS,
  ...PRIORITY_LABELS,
  ...AREA_LABELS,
  ...MANAGED_STATE_LABELS,
  ...EXCLUSION_LABELS
];
for (const label of policyLabels) {
  assert.equal(inventoryNames.has(label), true, `policy label is absent from labels.json: ${label}`);
}
for (const obsoleteLabel of [
  'governance:reviewed',
  'source:architecture',
  'severity:medium',
  'state:testing',
  'state:verification',
  'state:done'
]) {
  assert.equal(inventoryNames.has(obsoleteLabel), false, `obsolete label remains in labels.json: ${obsoleteLabel}`);
}

const currentIssue = issue(['bug', 'auto-fix', 'priority:p3', 'area:platform']);
assert.deepEqual(validateIssueLabels(currentIssue), []);
assert.equal(isAvailableCandidate(currentIssue), true);

const explicitlyValidated = issue([
  'documentation',
  'auto-fix',
  'priority:p3',
  'area:backup-restore',
  'state:validated'
]);
assert.deepEqual(validateIssueLabels(explicitlyValidated), []);

assert.match(
  validateIssueLabels(issue(['bug', 'priority:p3', 'area:platform'])).join('; '),
  /missing required label auto-fix/
);
assert.match(
  validateIssueLabels(issue(['bug', 'auto-fix', 'area:platform'])).join('; '),
  /priority:p1-p4/
);
assert.match(
  validateIssueLabels(issue(['bug', 'auto-fix', 'priority:p3'])).join('; '),
  /area:\*/
);

const legacyGovernanceLabels = issue([
  'governance:reviewed',
  'state:validated',
  'source:architecture',
  'severity:medium',
  'finding:RCG-1'
]);
const legacyErrors = validateIssueLabels(legacyGovernanceLabels).join('; ');
assert.match(legacyErrors, /missing required label auto-fix/);
assert.match(legacyErrors, /issue type/);
assert.match(legacyErrors, /priority:p1-p4/);
assert.match(legacyErrors, /area:\*/);

const blocked = issue([
  'bug',
  'auto-fix',
  'priority:p2',
  'area:build-release',
  'state:blocked'
]);
assert.match(validateIssueLabels(blocked).join('; '), /issue is blocked/);
assert.equal(isAvailableCandidate(blocked), false);

const duplicate = issue([
  'bug',
  'auto-fix',
  'priority:p3',
  'area:platform',
  'duplicate'
]);
assert.match(validateIssueLabels(duplicate).join('; '), /excluded by label duplicate/);
assert.equal(isAvailableCandidate(duplicate), false);

assert.deepEqual(
  withManagedState(
    ['bug', 'auto-fix', 'priority:p3', 'area:platform', 'state:validated'],
    'state:implementation'
  ),
  ['bug', 'auto-fix', 'priority:p3', 'area:platform', 'state:implementation']
);
assert.deepEqual(
  withManagedState(
    ['bug', 'auto-fix', 'priority:p3', 'area:platform', 'state:implementation'],
    null
  ),
  ['bug', 'auto-fix', 'priority:p3', 'area:platform']
);
assert.throws(
  () => withManagedState(['auto-fix'], 'state:testing'),
  /unsupported remediation state label/
);

const currentIssueBody = [
  '## Summary',
  'The current implementation has a reproducible compatibility defect.',
  '',
  '## Code Evidence',
  '### Workflow requirement',
  'The workflow requires labels that are not present in the repository.',
  '',
  '## Steps to Reproduce',
  'Run the scheduled remediation workflow against an auto-fix issue.',
  '',
  '## Acceptance Criteria',
  '- The existing repository labels are accepted by the workflow.'
].join('\n');
assert.deepEqual(validateEligibility({ ...currentIssue, body: currentIssueBody }), []);

const alternateIssueBody = [
  '## Governance Finding',
  'The workflow state transition uses an unsupported repository label.',
  '',
  '## Root Cause (Code-Verified)',
  'The state name is hard-coded in the remediation script.',
  '',
  '## Validation Plan',
  'Run the policy tests and inspect all state-label references.',
  '',
  '## Acceptance Criteria',
  '- Only state labels defined by the repository are used.'
].join('\n');
assert.deepEqual(validateEligibility({ ...explicitlyValidated, body: alternateIssueBody }), []);

const incompleteBody = currentIssueBody.replace('## Acceptance Criteria', '## Expected Outcome');
assert.match(
  validateEligibility({ ...currentIssue, body: incompleteBody }).join('; '),
  /Acceptance Criteria/
);

console.log('Remediation eligibility policy tests passed.');
