# CI/CD Automated Refactor PRs

## Overview

The CI/CD Automated Refactor system runs the Refactor Wizard in headless mode on every PR, aggregates code quality suggestions, and automatically creates refactor PRs. This ensures continuous code quality improvement without manual intervention.

## Features

- **Automated Analysis**: Runs on every PR and on a weekly schedule
- **AI-Powered Detection**: Leverages LLM providers for intelligent refactor suggestions
- **Pattern Detection**: Uses built-in pattern detectors for common issues
- **Configurable Filtering**: Filter by severity, category, auto-fix availability
- **PR Creation**: Automatically creates PRs with requirement files
- **Status Checks**: Integrates with GitHub PR status checks
- **Batch Processing**: Groups opportunities into manageable batches

## Quick Start

### 1. Setup Configuration

Create a `.refactor.config.json` file in your project root:

```bash
cp .refactor.config.example.json .refactor.config.json
```

Edit the configuration to match your preferences:

```json
{
  "enabled": true,
  "autoFixOnly": false,
  "minSeverity": "medium",
  "categories": ["performance", "maintainability", "code-quality"],
  "maxOpportunitiesPerPR": 50,
  "provider": "gemini",
  "model": "gemini-flash-latest"
}
```

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

**Optional - for AI analysis**:
- `OPENAI_API_KEY` - For OpenAI provider
- `ANTHROPIC_API_KEY` - For Anthropic/Claude provider
- `GOOGLE_API_KEY` - For Gemini provider

If no API keys are provided, the tool will use pattern-based detection only.

### 3. Enable GitHub Actions

The workflow file is already included at `.github/workflows/auto-refactor.yml`. It will automatically:

- Run on every PR to `main`, `master`, or `develop`
- Run weekly on Mondays at 9 AM UTC
- Allow manual triggering with custom parameters

### 4. Add NPM Script

Add to your `package.json`:

```json
{
  "scripts": {
    "refactor:ci": "ts-node scripts/refactor-ci.ts"
  }
}
```

## Usage

### Running Locally

Test the refactor tool locally before CI/CD integration:

```bash
# Dry run (analysis only, no PR creation)
npm run refactor:ci -- --dry-run

# Auto-fix only
npm run refactor:ci -- --auto-fix-only

# Filter by severity
npm run refactor:ci -- --severity high

# Filter by category
npm run refactor:ci -- --category performance,security

# Custom PR title and branch
npm run refactor:ci -- --pr-title "Refactor: Code quality improvements" --pr-branch refactor/quality-fixes

# Skip AI analysis (pattern detection only)
npm run refactor:ci -- --skip-ai

# Use specific LLM provider
npm run refactor:ci -- --provider openai --model gpt-4o
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--project-path <path>` | Path to analyze | Current directory |
| `--config <path>` | Config file path | `.refactor.config.json` |
| `--pr-title <title>` | Custom PR title | Auto-generated |
| `--pr-branch <branch>` | PR branch name | `auto-refactor-TIMESTAMP` |
| `--base-branch <branch>` | Base branch for PR | `main` |
| `--dry-run` | Analysis only, no PR | `false` |
| `--auto-fix-only` | Only auto-fixable issues | From config |
| `--severity <level>` | Min severity (low/medium/high/critical) | From config |
| `--category <cats>` | Filter categories (comma-separated) | From config |
| `--provider <provider>` | LLM provider (ollama/openai/anthropic/gemini) | From config |
| `--model <model>` | LLM model name | From config |
| `--skip-ai` | Skip AI analysis | `false` |

## Configuration Reference

### `.refactor.config.json`

```typescript
{
  // Enable/disable the refactor CI
  "enabled": boolean,

  // Only include auto-fixable opportunities
  "autoFixOnly": boolean,

  // Minimum severity: "low" | "medium" | "high" | "critical"
  "minSeverity": string,

  // Filter by categories
  "categories": string[],
  // Available: "performance", "maintainability", "security",
  //           "code-quality", "duplication", "architecture"

  // Exclude file patterns (glob patterns)
  "excludePatterns": string[],

  // Maximum opportunities per PR (prioritizes by severity)
  "maxOpportunitiesPerPR": number,

  // Require manual approval before merging
  "requireApproval": boolean,

  // LLM provider for AI analysis
  "provider": "ollama" | "openai" | "anthropic" | "gemini",

  // LLM model name
  "model": string,

  // Skip AI analysis (use pattern detection only)
  "skipAI": boolean
}
```

### Category Types

- **`performance`**: Performance optimizations
- **`maintainability`**: Code organization and readability
- **`security`**: Security vulnerabilities and best practices
- **`code-quality`**: Type safety, unused code, console statements
- **`duplication`**: Code duplication detection
- **`architecture`**: Architectural improvements

### Severity Levels

- **`low`**: Minor improvements (e.g., unused imports, console logs)
- **`medium`**: Moderate issues (e.g., any types, code duplication)
- **`high`**: Important issues (e.g., large files, long functions)
- **`critical`**: Critical issues (e.g., security vulnerabilities)

## GitHub Actions Workflow

### Triggers

1. **Pull Request Events**: Runs on every PR to main branches
2. **Weekly Schedule**: Monday 9 AM UTC
3. **Manual Dispatch**: Trigger manually with custom parameters

### Workflow Inputs (Manual Trigger)

- **`severity`**: Minimum severity level (low/medium/high/critical)
- **`auto_fix_only`**: Only auto-fixable issues (boolean)
- **`dry_run`**: Dry run mode (boolean)

### Status Checks

The workflow adds a status check `refactor/auto-analysis` to PRs:
- ✅ **Success**: Analysis completed, results available
- ❌ **Failure**: Analysis failed, check logs

### PR Comments

The workflow automatically comments on PRs with:
- Summary of analysis
- Link to refactor PR (if created)
- Number of opportunities found

## Integration with Claude Code

The refactor tool creates requirement files in `.claude/commands/` that can be executed using Claude Code:

### 1. Review Generated Requirements

After the refactor PR is created, the requirements are in:
```
.claude/commands/auto-refactor-batch-1.md
.claude/commands/auto-refactor-batch-2.md
...
```

### 2. Execute with Claude Code

```bash
# Open Claude Code
claude

# Execute the requirements
/auto-refactor-batch-1
/auto-refactor-batch-2
```

### 3. Verify Changes

```bash
# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

### 4. Commit and Merge

```bash
git add .
git commit -m "Apply automated refactor suggestions"
git push
```

## Best Practices

### Configuration Tips

1. **Start Conservative**: Begin with `autoFixOnly: true` and `minSeverity: "high"`
2. **Gradual Expansion**: Slowly lower severity and include manual fixes
3. **Category Focus**: Focus on 1-2 categories at a time
4. **Batch Size**: Keep `maxOpportunitiesPerPR` between 20-50 for manageable reviews

### Review Process

1. **Automated PRs**: Review refactor PRs carefully before merging
2. **Test Coverage**: Always run tests after applying refactors
3. **Manual Verification**: Don't blindly trust AI suggestions
4. **Incremental Merges**: Merge small batches frequently

### CI/CD Integration

1. **Branch Protection**: Require status checks to pass
2. **Code Owners**: Assign code owners to refactor PRs
3. **Auto-merge**: Consider auto-merge for low-severity, auto-fix items
4. **Notifications**: Configure Slack/email notifications for refactor PRs

## Troubleshooting

### "No opportunities found"

- Check your `.refactor.config.json` filters
- Verify `excludePatterns` isn't too broad
- Try lowering `minSeverity`
- Check if `autoFixOnly` is too restrictive

### "PR creation failed"

- Ensure `GITHUB_TOKEN` has sufficient permissions
- Check GitHub CLI (`gh`) is installed
- Verify branch protection rules allow bot commits

### "Analysis timeout"

- Reduce `maxOpportunitiesPerPR`
- Skip AI analysis with `skipAI: true`
- Increase workflow timeout in `.github/workflows/auto-refactor.yml`

### "LLM API errors"

- Verify API keys are set in GitHub secrets
- Check provider/model names are correct
- Fall back to pattern detection with `skipAI: true`

## Advanced Usage

### Custom Pattern Detectors

Add custom pattern detectors in `src/app/features/RefactorWizard/lib/patternDetectors.ts`:

```typescript
export function detectCustomPattern(content: string): number[] {
  // Your detection logic
  return lineNumbers;
}
```

Update `refactorAnalyzer.ts` to use your detector:

```typescript
import { detectCustomPattern } from './patternDetectors';

function checkCustomPattern(file: FileAnalysis): RefactorOpportunity | null {
  const matches = detectCustomPattern(file.content);
  // Generate opportunity
}
```

### Multi-Repository Setup

For organizations managing multiple repositories:

1. Create a shared `.refactor.config.json` template
2. Use repository variables for different configurations
3. Centralize LLM API keys in organization secrets
4. Create a reusable workflow with `workflow_call`

### Integration with Other Tools

- **ESLint**: Combine with ESLint auto-fix
- **Prettier**: Run after refactors
- **TypeScript**: Type check before PR creation
- **Jest**: Run tests as part of analysis

## Examples

### Example 1: Security-focused Refactor

```json
{
  "enabled": true,
  "autoFixOnly": false,
  "minSeverity": "high",
  "categories": ["security"],
  "maxOpportunitiesPerPR": 20,
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
```

### Example 2: Quick Wins Only

```json
{
  "enabled": true,
  "autoFixOnly": true,
  "minSeverity": "low",
  "maxOpportunitiesPerPR": 100,
  "skipAI": true
}
```

### Example 3: Performance Optimization

```json
{
  "enabled": true,
  "autoFixOnly": false,
  "minSeverity": "medium",
  "categories": ["performance", "architecture"],
  "maxOpportunitiesPerPR": 30,
  "provider": "openai",
  "model": "gpt-4o"
}
```

## Roadmap

Future enhancements:

- [ ] GitLab CI/CD support
- [ ] Bitbucket Pipelines integration
- [ ] Auto-merge for approved patterns
- [ ] Custom rule configuration
- [ ] Refactor impact metrics
- [ ] A/B testing for AI vs pattern detection
- [ ] Integration with SonarQube/CodeClimate
- [ ] Multi-language support

## Support

For issues or questions:

- GitHub Issues: [Create an issue](https://github.com/yourusername/vibeman/issues)
- Documentation: [Vibeman Docs](https://vibeman.dev/docs)
- Community: [Discord](https://discord.gg/vibeman)

## License

MIT License - see [LICENSE](../LICENSE) file for details.
