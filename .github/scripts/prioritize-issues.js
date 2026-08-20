#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const SEVERITY_WEIGHTS = {
  critical: 100,
  high: 75,
  medium: 45,
  low: 20
};

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

function getSeverity(labels) {
  const severityLabel = labels
    .map((l) => (typeof l === 'string' ? l : l.name))
    .find((name) => name && name.startsWith('severity:'));

  return severityLabel ? severityLabel.replace('severity:', '') : 'medium';
}

function getSource(labels) {
  const sourceLabel = labels
    .map((l) => (typeof l === 'string' ? l : l.name))
    .find((name) => name && name.startsWith('source:'));

  return sourceLabel ? sourceLabel.replace('source:', '') : 'architecture';
}

function getAgeDays(isoDate) {
  const created = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
}

function dependencyBoost(issueBody) {
  const body = String(issueBody || '');
  const dependencyMatches = body.match(/depends on:\s*#\d+/gi) || [];
  return dependencyMatches.length * 8;
}

function computePriority(issue) {
  const severity = getSeverity(issue.labels);
  const source = getSource(issue.labels);
  const base = SEVERITY_WEIGHTS[severity] || SEVERITY_WEIGHTS.medium;
  const ageDays = getAgeDays(issue.created_at);
  const ageBoost = Math.min(30, ageDays * 2);
  const dependencyBoostValue = dependencyBoost(issue.body);
  const score = base + ageBoost + dependencyBoostValue;

  return {
    score,
    severity,
    source,
    ageDays,
    dependencyBoost: dependencyBoostValue,
    escalation: score >= 95 || severity === 'critical'
  };
}

function upsertPrioritySection(body, priority) {
  const summary = [
    '## Governance Priority',
    '',
    `- **Score:** ${priority.score}`,
    `- **Severity weight:** ${SEVERITY_WEIGHTS[priority.severity] || SEVERITY_WEIGHTS.medium}`,
    `- **Age (days):** ${priority.ageDays}`,
    `- **Dependency boost:** ${priority.dependencyBoost}`,
    `- **Escalation:** ${priority.escalation ? 'yes' : 'no'}`,
    ''
  ].join('\n');

  const current = String(body || '');
  if (current.includes('## Governance Priority')) {
    return current.replace(/## Governance Priority[\s\S]*$/m, summary).trim() + '\n';
  }
  return `${current.trim()}\n\n${summary}`.trim() + '\n';
}

function withUpdatedStateLabels(labels, escalation) {
  const names = labels.map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);
  const withoutStateNew = names.filter((name) => name !== 'state:new');
  if (!withoutStateNew.includes('state:triage')) {
    withoutStateNew.push('state:triage');
  }
  if (escalation && !withoutStateNew.includes('governance:escalation')) {
    withoutStateNew.push('governance:escalation');
  }
  return Array.from(new Set(withoutStateNew));
}

async function listGovernanceIssues(owner, repo) {
  const queryLabels = encodeURIComponent('governance:reviewed');
  const all = [];
  let page = 1;
  while (true) {
    const response = await ghRequest('GET', `/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}&labels=${queryLabels}`);
    if (!Array.isArray(response) || response.length === 0) break;
    all.push(...response);
    if (response.length < 100) break;
    page += 1;
  }
  return all;
}

async function updateIssue(owner, repo, issue, priority) {
  const body = upsertPrioritySection(issue.body, priority);
  const labels = withUpdatedStateLabels(issue.labels, priority.escalation);
  return ghRequest('PATCH', `/repos/${owner}/${repo}/issues/${issue.number}`, { body, labels });
}

async function main() {
  const { owner, repo } = parseRepo();
  const issues = await listGovernanceIssues(owner, repo);

  const results = [];
  for (const issue of issues) {
    if (issue.pull_request) continue;

    const priority = computePriority(issue);
    await updateIssue(owner, repo, issue, priority);
    results.push({ issue_number: issue.number, ...priority });
    console.log(`Prioritized issue #${issue.number} with score ${priority.score}`);
  }

  const outputPath = path.resolve(process.cwd(), '.governance/findings/priorities.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Prioritized ${results.length} governance issues`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
