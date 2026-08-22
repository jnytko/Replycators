#!/usr/bin/env node

'use strict';

const { validateIssueLabels } = require('./remediation-label-policy');

function extractSectionWhere(body, matchesHeading) {
  const lines = String(body || '').split(/\r?\n/);
  let headingLevel = null;
  const start = lines.findIndex((line) => {
    const match = /^(#{2,6})\s+(.+?)\s*$/.exec(line.trim());
    if (!match || !matchesHeading(match[2].toLowerCase())) return false;
    headingLevel = match[1].length;
    return true;
  });
  if (start < 0) return '';
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const nextHeading = /^(#{2,6})\s/.exec(lines[index].trim());
    if (nextHeading && nextHeading[1].length <= headingLevel) break;
    collected.push(lines[index]);
  }
  return collected.join('\n').trim();
}

function extractSection(body, heading) {
  const normalizedHeading = heading.toLowerCase();
  return extractSectionWhere(
    body,
    (title) => title === normalizedHeading || title.startsWith(`${normalizedHeading} (`)
  );
}

function hasSubstantialSection(body, headings) {
  return headings.some((heading) => extractSection(body, heading).length >= 10);
}

function hasSubstantialEvidenceSection(body) {
  return extractSectionWhere(
    body,
    (title) => title === 'facts'
      || title === 'problem detail'
      || title === 'root cause'
      || title.startsWith('root cause (')
      || title === 'evidence'
      || title.endsWith(' evidence')
  ).length >= 10;
}

function validateEligibility(issue) {
  const errors = validateIssueLabels(issue);
  const body = String(issue.body || '');
  if (body.length < 100 || body.length > 50000) {
    errors.push('issue body length is outside the trusted range');
  }
  if (!hasSubstantialSection(body, ['Summary', 'Governance Finding'])) {
    errors.push('Summary or Governance Finding section is missing or too short');
  }
  if (!hasSubstantialEvidenceSection(body)) {
    errors.push('Evidence or Root Cause section is missing or too short');
  }
  if (!hasSubstantialSection(body, ['Steps to Reproduce', 'Test Plan', 'Validation Plan'])) {
    errors.push('Steps to Reproduce, Test Plan, or Validation Plan section is missing or too short');
  }
  if (extractSection(body, 'Acceptance Criteria').length < 10) {
    errors.push('Acceptance Criteria is missing or too short');
  }
  return errors;
}

module.exports = {
  extractSection,
  validateEligibility
};
