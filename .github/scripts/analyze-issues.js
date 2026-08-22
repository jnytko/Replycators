const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

// Load prompts
const updateGithubPrompt = fs.readFileSync('.github/prompts/12-update-github.txt', 'utf8');
const workOnIssuePrompt = fs.readFileSync('.github/prompts/10-work-on-github-issue.txt', 'utf8');
const implementPrompt = fs.readFileSync('.github/prompts/11-implement.txt', 'utf8');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY secret not set');
  process.exit(1);
}

async function callOpenAI(systemPrompt, userMessage) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    throw error;
  }
}

async function getAutoFixIssues() {
  const cmd = `gh issue list --repo ${REPO} --state open --label "auto-fix" --limit 10 --json number,title,body`;
  const output = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(output);
}

async function postCommentToIssue(issueNumber, comment) {
  const cmd = `gh issue comment ${issueNumber} --repo ${REPO} --body "${comment.replace(/"/g, '\\"')}"`;
  execSync(cmd, { encoding: 'utf8' });
}

async function analyzeIssue(issue) {
  console.log(`\n📋 Analyzing Issue #${issue.number}: ${issue.title}`);

  const issueContext = `
Issue #${issue.number}: ${issue.title}

Body:
${issue.body || 'No description provided'}

Analyze this issue in the context of the Replycators repository.
  `;

  try {
    // Stage 1: Update GitHub Issue Status
    console.log('  Stage 1: Updating GitHub issue status...');
    const updateGithubAnalysis = await callOpenAI(
      updateGithubPrompt,
      issueContext
    );

    // Stage 2: Work on GitHub Issue
    console.log('  Stage 2: Working on GitHub issue analysis...');
    const workOnIssueAnalysis = await callOpenAI(
      workOnIssuePrompt,
      issueContext + '\n\n' + updateGithubAnalysis
    );

    // Stage 3: Implementation Plan
    console.log('  Stage 3: Creating implementation plan...');
    const implementAnalysis = await callOpenAI(
      implementPrompt,
      issueContext + '\n\n' + updateGithubAnalysis + '\n\n' + workOnIssueAnalysis
    );

    // Combine findings into a single comment
    const analysisComment = `## 🤖 Automated Analysis

### Stage 1: Issue Status Update
${updateGithubAnalysis}

### Stage 2: Issue & Dependency Analysis
${workOnIssueAnalysis}

### Stage 3: Implementation Plan
${implementAnalysis}

---
_Analysis completed at ${new Date().toISOString()}_`;

    // Post comment to issue
    console.log('  Posting analysis to issue...');
    await postCommentToIssue(issue.number, analysisComment);
    console.log(`  ✅ Analysis posted to #${issue.number}`);

  } catch (error) {
    console.error(`  ❌ Error analyzing issue #${issue.number}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting sequential issue analysis...\n');

  try {
    const issues = await getAutoFixIssues();

    if (issues.length === 0) {
      console.log('No issues with "auto-fix" label found.');
      return;
    }

    console.log(`Found ${issues.length} issue(s) to analyze.\n`);

    // Process issues sequentially (NOT in parallel)
    for (const issue of issues) {
      await analyzeIssue(issue);
      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ All issues analyzed successfully!');

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
