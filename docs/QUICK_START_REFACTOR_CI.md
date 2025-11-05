# Quick Start: CI/CD Automated Refactor

Get up and running with automated refactor PRs in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

This will install `ts-node` and other required dependencies.

## Step 2: Create Configuration

```bash
# Copy example configuration
cp .refactor.config.example.json .refactor.config.json
```

**Recommended starter config** (edit `.refactor.config.json`):

```json
{
  "enabled": true,
  "autoFixOnly": true,
  "minSeverity": "medium",
  "categories": ["code-quality", "maintainability"],
  "maxOpportunitiesPerPR": 30,
  "skipAI": true
}
```

This config:
- ✅ Only includes auto-fixable issues (safe)
- ✅ Medium+ severity only (focuses on important issues)
- ✅ Limits to 30 opportunities per PR (manageable)
- ✅ Skips AI analysis (no API keys needed)

## Step 3: Test Locally

Run a dry run to see what would be found:

```bash
npm run refactor:ci -- --dry-run
```

You should see output like:

```
🔍 Vibeman CI/CD Refactor Tool

📂 Project path: C:\Users\...\vibeman
⚙️  Config path: .refactor.config.json
🎯 Base branch: main
🧪 DRY RUN MODE

🔬 Running refactor analysis...
✅ Analysis complete: 23 opportunities found
   - Total files scanned: 145
   - Total lines: 12543

🎯 Filtered to 12 opportunities

📊 Summary:
   - code-quality: 8
   - maintainability: 4

🧪 DRY RUN - Skipping PR creation

Opportunities that would be included:
1. [medium] Console statements in src/app/page.tsx
2. [medium] Unused imports in src/components/Header.tsx
...
```

## Step 4: Run for Real (Optional)

If you're happy with the results, run without `--dry-run`:

```bash
npm run refactor:ci
```

This will:
1. Create a new branch `auto-refactor-<timestamp>`
2. Generate requirement files in `.claude/commands/`
3. Commit the files
4. Push to GitHub
5. Create a PR

## Step 5: Enable GitHub Actions

The workflow is already configured in `.github/workflows/auto-refactor.yml`.

**To enable it:**

1. Commit the workflow file:
   ```bash
   git add .github/workflows/auto-refactor.yml
   git commit -m "Add auto-refactor CI workflow"
   git push
   ```

2. The workflow will now run:
   - On every PR to `main`/`master`/`develop`
   - Weekly on Mondays at 9 AM UTC
   - Manually via GitHub Actions UI

## Step 6: Review Your First Refactor PR

Once the CI runs, you'll get a PR like this:

**Title**: `[Auto-Refactor] Fix 12 code quality issues`

**Body**:
```markdown
## Automated Refactor Summary

This PR contains automated refactoring suggestions...

### Overview
- **Total Issues Addressed**: 12
- **Auto-fixable**: 12

### By Category
- **code-quality**: 8 issues
- **maintainability**: 4 issues
...
```

## Step 7: Execute with Claude Code

The PR includes requirement files. To apply them:

```bash
# Open Claude Code
claude

# Execute the requirements
/auto-refactor-batch-1
```

Claude Code will apply the refactors automatically!

## Step 8: Test and Merge

```bash
# Run tests
npm test

# Type check
npm run build

# If all good, merge the PR
```

## Next Steps

### Expand Configuration

Once comfortable, expand to more categories:

```json
{
  "enabled": true,
  "autoFixOnly": false,
  "minSeverity": "low",
  "categories": [
    "code-quality",
    "maintainability",
    "performance",
    "duplication"
  ],
  "maxOpportunitiesPerPR": 50,
  "skipAI": false,
  "provider": "gemini",
  "model": "gemini-flash-latest"
}
```

### Add LLM Provider (for AI analysis)

Add to GitHub Secrets:

- `GOOGLE_API_KEY` - for Gemini (recommended, free tier available)
- `OPENAI_API_KEY` - for OpenAI
- `ANTHROPIC_API_KEY` - for Claude

Then set `skipAI: false` in config.

### Advanced Filters

```bash
# Only performance issues
npm run refactor:ci -- --category performance

# Only critical severity
npm run refactor:ci -- --severity critical

# Custom PR title
npm run refactor:ci -- --pr-title "Refactor: Remove console logs"
```

## Troubleshooting

### "Command not found: gh"

Install GitHub CLI:
```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
sudo apt install gh
```

Then authenticate:
```bash
gh auth login
```

### "Permission denied" on git push

Ensure you have:
- Write access to the repository
- GitHub token configured (`gh auth login`)

### No opportunities found

- Lower `minSeverity` to `"low"`
- Set `autoFixOnly: false`
- Increase categories
- Check `excludePatterns` isn't too broad

## Full Documentation

For comprehensive documentation, see:
- [docs/CI_CD_REFACTOR.md](./CI_CD_REFACTOR.md) - Complete guide
- [scripts/README.md](../scripts/README.md) - Script reference

## Support

Questions? [Create an issue](https://github.com/yourusername/vibeman/issues)
