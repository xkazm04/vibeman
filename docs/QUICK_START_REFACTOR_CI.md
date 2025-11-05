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
cp .refactor-ci.example.json .refactor-ci.json
cp .refactor-pr.example.json .refactor-pr.json
```

**Recommended starter config** (edit `.refactor-ci.json`):

```json
{
  "severity": "medium",
  "categories": ["code-quality", "maintainability"],
  "provider": "gemini",
  "model": "gemini-flash-latest",
  "autoPR": false
}
```

This config:
- ✅ Medium+ severity only (focuses on important issues)
- ✅ Selected categories for code quality
- ✅ Uses Gemini Flash (fast and cost-effective)
- ✅ Manual PR creation (you control when)

## Step 3: Test Locally

Run analysis to see what would be found:

```bash
npm run refactor:ci -- --project ./src --verbose
```

You should see output like:

```
Vibeman Refactor CI
===================
Project: C:\Users\...\vibeman\src
AI Analysis: true
Provider: gemini
Model: gemini-flash-latest

Starting analysis...

Analysis complete!
Total issues found: 23
  Critical: 0
  High: 5
  Medium: 12
  Low: 6
```

## Step 4: Output to JSON

Save results to a file:

```bash
npm run refactor:ci -- --project ./src --output refactor-results.json --verbose
```

This creates a JSON file with all findings that can be used for PR creation.

## Step 5: Enable GitHub Actions

The workflow is already configured in `.github/workflows/refactor-check.yml`.

**To enable it:**

1. Commit the workflow file:
   ```bash
   git add .github/workflows/refactor-check.yml
   git commit -m "Add automated refactor CI workflow"
   git push
   ```

2. The workflow will now run:
   - On every PR to `main`/`master`/`develop`
   - Manually via GitHub Actions UI (with optional PR creation)

## Step 6: Create a Refactor PR (Optional)

Once you have results, create a PR:

```bash
npm run create-refactor-pr -- --results refactor-results.json --verbose
```

This will:
1. Create a new branch `refactor/automated-<timestamp>`
2. Commit the results
3. Push to GitHub
4. Create a PR with a detailed summary

## Step 7: Review Your First Refactor PR

Once the PR is created, you'll see:

**Title**: `Automated Refactor: 23 improvements`

**Body**:
```markdown
## Automated Refactor Suggestions

### Summary
- **Total Issues**: 23
- **Critical**: 0
- **High**: 5
- **Medium**: 12
- **Low**: 6

### Issues by Category
- **code-quality**: 15
- **maintainability**: 8

### High Priority Issues
1. **'any' type usage in src/types.ts**
   - Category: code-quality
   - Impact: Improves type safety
   - Effort: medium
   ...
```

## Step 8: Review and Merge

Review the suggested changes and merge when ready!

## Next Steps

### Expand Configuration

Once comfortable, expand to more categories:

```json
{
  "severity": "low",
  "categories": [
    "code-quality",
    "maintainability",
    "performance",
    "duplication",
    "security"
  ],
  "provider": "gemini",
  "model": "gemini-flash-latest",
  "autoPR": true
}
```

### Add LLM Provider (for AI analysis)

Set environment variables:

- `GOOGLE_API_KEY` - for Gemini (recommended, free tier available)
- `OPENAI_API_KEY` - for OpenAI
- `ANTHROPIC_API_KEY` - for Claude

Or add to `.env`:
```
GOOGLE_API_KEY=your-api-key
```

### Advanced Filters

```bash
# Only performance issues
npm run refactor:ci -- --project ./src --category performance

# Only critical severity
npm run refactor:ci -- --project ./src --severity critical

# Disable AI (pattern-based only)
npm run refactor:ci -- --project ./src --no-ai

# Custom provider
npm run refactor:ci -- --project ./src --provider openai --model gpt-4
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

- Lower severity: `--severity low`
- Add more categories
- Enable AI analysis (remove `--no-ai`)
- Check project path is correct

## Full Documentation

For comprehensive documentation, see:
- [docs/REFACTOR_CI_GUIDE.md](./REFACTOR_CI_GUIDE.md) - Complete guide
- [.github/workflows/refactor-check.yml](../.github/workflows/refactor-check.yml) - CI workflow

## Support

Questions? [Create an issue](https://github.com/yourusername/vibeman/issues)
