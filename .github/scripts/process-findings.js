#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

function parseRepo() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !repo.includes('/')) {
    throw new Error('GITHUB_REPOSITORY must be set as owner/repo');
  }
  const [owner, name] = repo.split('/');
  return { owner, repo: name };
}

function ghRequest(method, requestPath, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');

  const payload = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'api.github.com',
    path: requestPath,
    method,
    headers: {
      'User-Agent': 'replycators-governance-agent',
      Accept: 'application/vnd.github+json',
      Authorization: `token ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };

  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        let parsed = null;
        if (data) {
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
        }
        if (!ok) {
          return reject(new Error(`GitHub API ${method} ${requestPath} failed: ${res.statusCode} ${JSON.stringify(parsed)}`));
        }
        resolve(parsed);
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function readFindings(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const findings = JSON.parse(raw);
  if (!Array.isArray(findings)) {
    throw new Error(`Expected findings array at ${filePath}`);
  }
  return findings;
}

function normalizeFinding(finding) {
  const safeSeverity = String(finding.severity || 'medium').trim().toLowerCase();
  const safeSource = String(finding.source || 'architecture').trim().toLowerCase();
  return {
    finding_id: String(finding.finding_id || '').trim(),
    severity: safeSeverity,
    source: safeSource,
    component: String(finding.component || 'unknown').trim(),
    summary: String(finding.summary || finding.title || finding.component || 'Governance finding').trim(),
    evidence: String(finding.evidence || 'No evidence provided').trim(),
    root_cause: String(finding.root_cause || 'Root cause pending analysis').trim(),
    acceptance_criteria: String(finding.acceptance_criteria || 'Define acceptance criteria during triage').trim(),
    recommended_action: String(finding.recommended_action || 'Follow remediation prompt from docs/PROMPT-CATALOG.md').trim(),
    confidence: finding.confidence === undefined ? null : Number(finding.confidence)
  };
}

function toFindingLabel(findingId) {
  return `finding:${findingId}`;
}

function buildIssueTitle(finding) {
  const prefix = `[${finding.severity.toUpperCase()}]`;
  return `${prefix} ${finding.summary}`;
}

function buildIssueBody(finding) {
  return [
    '## Governance Finding',
    '',
    `- **Finding ID:** ${finding.finding_id}`,
    `- **Severity:** ${finding.severity}`,
    `- **Source:** ${finding.source}`,
    `- **Component:** ${finding.component}`,
    finding.confidence !== null ? `- **Confidence:** ${finding.confidence}%` : null,
    '',
    '### Evidence',
    finding.evidence,
    '',
    '### Root Cause',
    finding.root_cause,
    '',
    '### Recommended Action',
    finding.recommended_action,
    '',
    '### Acceptance Criteria',
    finding.acceptance_criteria,
    '',
    '### Prompt Source',
    'Derived from `docs/PROMPT-CATALOG.md` governance automation workflows.',
    ''
  ].filter(Boolean).join('\n');
}

async function findExistingIssue(owner, repo, findingId) {
  const targetLabel = toFindingLabel(findingId);
  const queryLabels = encodeURIComponent('governance:reviewed');
  let page = 1;
  while (true) {
    const requestPath = `/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}&labels=${queryLabels}`;
    const issues = await ghRequest('GET', requestPath);
    if (!Array.isArray(issues) || issues.length === 0) {
      return null;
    }
    const match = issues.find((issue) => {
      const labels = Array.isArray(issue.labels)
        ? issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean)
        : [];
      return labels.includes(targetLabel);
    });
    if (match) {
      return match;
    }
    if (issues.length < 100) {
      return null;
    }
    page += 1;
  }
}

async function createIssue(owner, repo, finding) {
  const labels = [
    `severity:${finding.severity}`,
    'state:new',
    `source:${finding.source}`,
    toFindingLabel(finding.finding_id),
    'governance:reviewed'
  ];

  return ghRequest('POST', `/repos/${owner}/${repo}/issues`, {
    title: buildIssueTitle(finding),
    body: buildIssueBody(finding),
    labels
  });
}

async function updateIssue(owner, repo, issue, finding) {
  const labels = Array.from(new Set([
    ...issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean),
    `severity:${finding.severity}`,
    `source:${finding.source}`,
    toFindingLabel(finding.finding_id),
    'governance:reviewed'
  ]));

  return ghRequest('PATCH', `/repos/${owner}/${repo}/issues/${issue.number}`, {
    title: buildIssueTitle(finding),
    body: buildIssueBody(finding),
    labels,
    state: 'open'
  });
}

async function main() {
  const fileArg = process.argv[2] || '.governance/findings/validated-findings.json';
  const findingsPath = path.resolve(process.cwd(), fileArg);
  const findings = readFindings(findingsPath).map(normalizeFinding);
  const { owner, repo } = parseRepo();

  const created = [];
  const updated = [];

  for (const finding of findings) {
    if (!finding.finding_id) {
      throw new Error(`Missing finding_id in ${findingsPath}`);
    }

    const existing = await findExistingIssue(owner, repo, finding.finding_id);
    if (existing) {
      const res = await updateIssue(owner, repo, existing, finding);
      updated.push({ finding_id: finding.finding_id, issue_number: res.number });
      console.log(`Updated issue #${res.number} for ${finding.finding_id}`);
    } else {
      const res = await createIssue(owner, repo, finding);
      created.push({ finding_id: finding.finding_id, issue_number: res.number });
      console.log(`Created issue #${res.number} for ${finding.finding_id}`);
    }
  }

  const summary = { total: findings.length, created, updated };
  const outPath = path.resolve(process.cwd(), '.governance/findings/process-summary.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`Processed ${findings.length} findings`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
