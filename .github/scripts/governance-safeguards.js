#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = [
  'finding_id',
  'severity',
  'component',
  'evidence',
  'root_cause',
  'acceptance_criteria'
];

const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
const VALID_SOURCES = new Set(['architecture', 'security', 'performance', 'qa', 'documentation', 'release']);

function readFindings(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`Expected findings array in ${inputPath}`);
  }
  return data;
}

function normalizeFinding(finding, defaultSource) {
  const normalized = { ...finding };
  normalized.severity = String(normalized.severity || '').trim().toLowerCase();
  normalized.source = String(normalized.source || defaultSource || '').trim().toLowerCase();
  normalized.finding_id = String(normalized.finding_id || '').trim();
  normalized.component = String(normalized.component || '').trim();
  normalized.evidence = String(normalized.evidence || '').trim();
  normalized.root_cause = String(normalized.root_cause || '').trim();
  normalized.acceptance_criteria = String(normalized.acceptance_criteria || '').trim();
  if (normalized.recommended_action !== undefined) {
    normalized.recommended_action = String(normalized.recommended_action || '').trim();
  }
  return normalized;
}

function validateFinding(finding) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!finding[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (finding.severity && !VALID_SEVERITIES.has(finding.severity)) {
    errors.push(`Invalid severity: ${finding.severity}`);
  }
  if (finding.source && !VALID_SOURCES.has(finding.source)) {
    errors.push(`Invalid source: ${finding.source}`);
  }
  if (finding.evidence && finding.evidence.length < 15) {
    errors.push('Evidence is too short to be actionable');
  }
  if (finding.acceptance_criteria && finding.acceptance_criteria.length < 10) {
    errors.push('Acceptance criteria is too short to validate remediation');
  }

  return errors;
}

function main() {
  const inputArg = process.argv[2] || '.governance/findings/raw-findings.json';
  const defaultSource = process.argv[3] || '';
  const outputArg = process.argv[4] || '.governance/findings/validated-findings.json';

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(process.cwd(), outputArg);

  const findings = readFindings(inputPath);
  const valid = [];
  const rejected = [];

  for (const finding of findings) {
    const normalized = normalizeFinding(finding, defaultSource);
    const errors = validateFinding(normalized);
    if (errors.length > 0) {
      rejected.push({ finding: normalized, errors });
    } else {
      valid.push(normalized);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(valid, null, 2));

  const report = {
    input: inputPath,
    output: outputPath,
    total: findings.length,
    accepted: valid.length,
    rejected: rejected.length,
    rejected_items: rejected
  };

  const reportPath = outputPath.replace(/\.json$/i, '.report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Safeguards accepted ${valid.length}/${findings.length} findings`);
  if (rejected.length > 0) {
    console.log(`Rejected findings report: ${reportPath}`);
  }
}

main();
