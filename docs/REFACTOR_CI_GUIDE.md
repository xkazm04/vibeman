# CI/CD Automated Refactor PRs - Complete Guide

## Overview

The Vibeman Refactor CI system enables **automated code quality improvements** through continuous integration. It runs the refactor wizard in headless mode, analyzes your codebase, and can automatically create pull requests with improvement suggestions.

### Key Features

- **Headless Refactor Analysis**: Run code analysis in CI/CD pipelines without a UI
- **Multi-Provider AI Support**: Works with OpenAI, Anthropic, Gemini, and Ollama
- **Automated PR Creation**: Automatically create PRs with refactor suggestions
- **Status Checks**: Block PRs with critical code quality issues
- **Configurable Filters**: Control severity levels and categories
- **JSON Output**: Machine-readable results for custom workflows

---

## Quick Start

### 1. Local Usage

Run refactor analysis locally:

```bash
# Basic analysis
npm run refactor:ci -- --project ./src

# Output to JSON file
npm run refactor:ci -- --project ./src --output results.json --verbose

# Filter by severity
npm run refactor:ci -- --project ./src --severity high

# Use specific AI provider
npm run refactor:ci -- --project ./src --provider openai --model gpt-4
```

### 2. GitHub Actions Setup

The workflow is already configured in `.github/workflows/refactor-check.yml`.

**Automatic triggers:**
- On every pull request to `main`, `master`, or `develop` branches
- Manual trigger via workflow dispatch

**What it does:**
1. Runs refactor analysis on the codebase
2. Posts a comment on the PR with results
3. Creates a status check (blocks merge if critical issues found)
4. Optionally creates a new PR with refactor suggestions

### 3. Enable Auto-PR Creation

**Option A: Manual workflow dispatch**
1. Go to Actions tab in GitHub
2. Select "Automated Refactor Check" workflow
3. Click "Run workflow"
4. Check "Create PR with refactor suggestions"

**Option B: Add label to PR**
- Add the `auto-refactor` label to any PR to trigger automatic refactor PR creation

---

## Configuration

### Refactor CI Config (`.refactor-ci.json`)

Controls analysis behavior:

```json
{
  "severity": "medium",
  "categories": [
    "performance",
    "maintainability",
    "security",
    "code-quality"
  ],
  "excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ],
  "provider": "gemini",
  "model": "gemini-flash-latest",
  "autoPR": false
}
```

**Options:**

- `severity`: Minimum severity level (`low` | `medium` | `high` | `critical`)
- `categories`: Array of categories to include
  - `performance` - Performance optimizations
  - `maintainability` - Code organization and readability
  - `security` - Security vulnerabilities
  - `code-quality` - Code quality improvements
  - `duplication` - Code duplication
  - `architecture` - Architectural improvements
- `excludePatterns`: File patterns to exclude
- `provider`: LLM provider (`ollama` | `openai` | `anthropic` | `gemini`)
- `model`: Model name
- `autoPR`: Automatically create PR with results

### PR Automation Config (`.refactor-pr.json`)

Controls PR creation behavior:

```json
{
  "branch": "refactor/automated-improvements",
  "title": "Automated Refactor Improvements",
  "body": "Custom PR description",
  "baseBranch": "main",
  "labels": [
    "refactor",
    "automated",
    "code-quality"
  ],
  "reviewers": ["username1", "username2"],
  "assignees": ["username1"]
}
```

**Options:**

- `branch`: Branch name for the refactor PR (auto-generated if not specified)
- `title`: PR title
- `body`: Custom PR body (merged with auto-generated summary)
- `baseBranch`: Base branch to merge into (default: `main`)
- `labels`: Array of labels to add to the PR
- `reviewers`: Array of GitHub usernames to request reviews from
- `assignees`: Array of GitHub usernames to assign the PR to

---

## CLI Reference

### `npm run refactor:ci`

Runs headless refactor analysis.

**Options:**

```
-p, --project <path>      Project path to analyze (default: current directory)
-o, --output <file>       Output JSON file path
--auto-pr                 Automatically create a PR with refactor suggestions
-c, --config <file>       Configuration file path (.refactor-ci.json)
-s, --severity <level>    Minimum severity level (low|medium|high|critical)
--category <category>     Filter by category
--provider <provider>     LLM provider (ollama|openai|anthropic|gemini)
--model <model>           LLM model name
--no-ai                   Disable AI analysis (pattern-based only)
-v, --verbose             Verbose output
-h, --help                Show help message
```

**Examples:**

```bash
# Basic analysis with verbose output
npm run refactor:ci -- --project ./src --verbose

# High-severity issues only, output to file
npm run refactor:ci -- --project ./src --severity high --output results.json

# Use OpenAI GPT-4 for analysis
npm run refactor:ci -- --project ./src --provider openai --model gpt-4

# Pattern-based analysis only (no AI)
npm run refactor:ci -- --project ./src --no-ai

# Filter by category
npm run refactor:ci -- --project ./src --category security
```

### `npm run create-refactor-pr`

Creates a GitHub PR from refactor analysis results.

**Options:**

```
-r, --results <file>      Path to refactor results JSON file
-b, --branch <name>       Branch name for the PR (default: auto-generated)
-t, --title <title>       PR title (default: auto-generated)
-c, --config <file>       Configuration file path (.refactor-pr.json)
--dry-run                 Show what would be done without creating PR
-v, --verbose             Verbose output
-h, --help                Show help message
```

**Examples:**

```bash
# Create PR from results
npm run create-refactor-pr -- --results refactor-results.json --verbose

# Custom branch and title
npm run create-refactor-pr -- \
  --results results.json \
  --branch fix/code-quality \
  --title "Code quality improvements"

# Dry run (preview without creating)
npm run create-refactor-pr -- --results results.json --dry-run
```

---

## GitHub Actions Workflow Details

### Workflow File

Location: `.github/workflows/refactor-check.yml`

### Jobs

#### 1. `refactor-analysis`

Runs on every PR to main branches.

**Steps:**
1. Checkout code
2. Setup Node.js and install dependencies
3. Run `npm run refactor:ci`
4. Upload results as artifact
5. Parse results and extract metrics
6. Post comment on PR with summary
7. Create status check
8. Fail if critical issues found

#### 2. `create-refactor-pr`

Runs conditionally when:
- Workflow dispatch with `create_pr = true`, OR
- PR has `auto-refactor` label

**Steps:**
1. Checkout code
2. Download analysis results
3. Setup Git configuration
4. Run `npm run create-refactor-pr`
5. Push new PR to GitHub

### Required Permissions

The workflow requires these permissions:
- `contents: write` - For creating branches and commits
- `pull-requests: write` - For creating PRs and comments
- `checks: write` - For status checks

### Environment Variables

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Customizing the Workflow

You can customize the workflow by:

1. **Changing trigger branches:**
   ```yaml
   on:
     pull_request:
       branches:
         - main
         - develop
         - feature/*
   ```

2. **Adjusting severity threshold:**
   ```yaml
   - name: Run refactor analysis
     run: |
       npm run refactor:ci -- \
         --project ./src \
         --severity critical  # Only fail on critical issues
   ```

3. **Changing analysis scope:**
   ```yaml
   run: |
     npm run refactor:ci -- \
       --project ./src/components  # Analyze only components
   ```

---

## Integration Strategies

### Strategy 1: Quality Gate (Recommended)

**Goal:** Block PRs with critical code quality issues

**Setup:**
1. Use default `.github/workflows/refactor-check.yml`
2. Set severity to `high` in workflow
3. Status check will fail on critical/high issues

**Result:** PRs with serious code quality issues cannot be merged

### Strategy 2: Continuous Improvement

**Goal:** Automatically create refactor PRs for review

**Setup:**
1. Enable workflow dispatch with `create_pr = true`
2. Run weekly via cron schedule:
   ```yaml
   on:
     schedule:
       - cron: '0 0 * * 0'  # Every Sunday at midnight
   ```
3. Review and merge refactor PRs

**Result:** Continuous, automated code quality improvements

### Strategy 3: Developer Awareness

**Goal:** Inform developers about issues without blocking

**Setup:**
1. Set severity to `medium` or `low`
2. Post comment but don't fail the build
3. Optional: Create refactor PRs for high-priority items

**Result:** Developers are aware of issues but can still merge

### Strategy 4: Pre-merge Refactor

**Goal:** Auto-refactor before merging feature PRs

**Setup:**
1. Add `auto-refactor` label to feature PRs
2. Refactor PR is created automatically
3. Review both PRs together

**Result:** Feature and refactor PRs are reviewed in parallel

---

## Output Format

### JSON Result Structure

```json
{
  "success": true,
  "timestamp": "2025-11-05T20:00:00.000Z",
  "projectPath": "/path/to/project",
  "summary": {
    "totalIssues": 42,
    "criticalIssues": 2,
    "highIssues": 8,
    "mediumIssues": 20,
    "lowIssues": 12,
    "categoryCounts": {
      "code-quality": 15,
      "maintainability": 12,
      "performance": 8,
      "duplication": 5,
      "security": 2
    }
  },
  "opportunities": [
    {
      "id": "console-logs-src/app.ts",
      "title": "Console statements in src/app.ts",
      "description": "Found 5 console.log statements...",
      "category": "code-quality",
      "severity": "low",
      "impact": "Cleaner production code",
      "effort": "low",
      "files": ["src/app.ts"],
      "lineNumbers": { "src/app.ts": [10, 25, 42, 58, 91] },
      "autoFixAvailable": true,
      "estimatedTime": "15-30 minutes"
    }
  ],
  "config": {
    "provider": "gemini",
    "model": "gemini-flash-latest"
  }
}
```

### Exit Codes

- `0` - Success, no critical/high issues
- `1` - Failure (critical or high severity issues found, or analysis error)

---

## Advanced Usage

### Custom CI/CD Platforms

#### GitLab CI

```yaml
refactor-check:
  stage: test
  script:
    - npm ci
    - npm run refactor:ci -- --project ./src --output results.json
  artifacts:
    reports:
      junit: results.json
    paths:
      - refactor-results.json
  only:
    - merge_requests
```

#### Jenkins Pipeline

```groovy
pipeline {
  agent any
  stages {
    stage('Refactor Analysis') {
      steps {
        sh 'npm ci'
        sh 'npm run refactor:ci -- --project ./src --output results.json'
      }
      post {
        always {
          archiveArtifacts artifacts: 'refactor-results.json'
        }
      }
    }
  }
}
```

### Custom Result Processing

Process results programmatically:

```typescript
import * as fs from 'fs';

const results = JSON.parse(fs.readFileSync('refactor-results.json', 'utf-8'));

// Filter critical issues
const critical = results.opportunities.filter(o => o.severity === 'critical');

// Group by category
const byCategory = results.opportunities.reduce((acc, opp) => {
  acc[opp.category] = acc[opp.category] || [];
  acc[opp.category].push(opp);
  return acc;
}, {});

// Generate custom report
console.log(`Found ${critical.length} critical issues`);
```

---

## Troubleshooting

### Common Issues

#### 1. "GitHub CLI not authenticated"

**Solution:**
```bash
gh auth login
```

Or set `GITHUB_TOKEN` environment variable in CI.

#### 2. "Analysis failed"

Check:
- Project path exists
- Dependencies are installed (`npm ci`)
- LLM provider credentials are configured

#### 3. "No changes to commit"

The PR automation script requires changes to exist. Run refactor analysis first, then apply suggested changes before creating PR.

#### 4. Permission denied on workflow

Ensure repository settings allow:
- Actions to create PRs
- Workflow has write permissions

Go to: Repository Settings > Actions > General > Workflow permissions

---

## Best Practices

### 1. Start with Quality Gates

Begin with blocking critical issues only:
```json
{
  "severity": "critical"
}
```

Gradually increase to `high` or `medium` as code quality improves.

### 2. Use Custom Categories

Focus on high-impact categories first:
```json
{
  "categories": ["security", "performance"]
}
```

### 3. Incremental Adoption

- Week 1: Enable analysis, don't block PRs
- Week 2: Block critical issues only
- Week 3: Add automated refactor PRs
- Week 4: Block high-severity issues

### 4. Review Automation Results

Always review automated PRs before merging:
- Verify suggested changes make sense
- Test functionality isn't broken
- Ensure coding style is preserved

### 5. Tune AI Provider

Different providers have different strengths:
- **Gemini Flash**: Fast, cost-effective, good for large codebases
- **GPT-4**: High quality, best for complex analysis
- **Claude**: Excellent code understanding, good for architecture issues
- **Ollama (local)**: Privacy-focused, no API costs

---

## FAQ

**Q: Does this work with GitLab/Bitbucket?**
A: The PR automation is GitHub-specific, but the CLI tool works anywhere. Adapt the workflow to your platform.

**Q: Can I run this locally?**
A: Yes! Use `npm run refactor:ci` to analyze your code anytime.

**Q: How much does AI analysis cost?**
A: Depends on provider. Gemini Flash is cheapest, Ollama is free (local). Use `--no-ai` for pattern-based analysis only.

**Q: Can I customize the analysis rules?**
A: The pattern detectors are in `src/app/features/RefactorWizard/lib/patternDetectors.ts`. You can add custom rules there.

**Q: Does this modify my code automatically?**
A: No. It only suggests changes via PRs. You review and merge.

**Q: What about private repositories?**
A: Works perfectly. GitHub Actions have automatic access to private repos.

---

## Support & Contributing

- **Issues**: https://github.com/your-org/vibeman/issues
- **Documentation**: https://github.com/your-org/vibeman/docs
- **Discussions**: https://github.com/your-org/vibeman/discussions

---

**Generated by Vibeman Refactor CI**
