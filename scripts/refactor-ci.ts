#!/usr/bin/env node
/**
 * CI/CD Headless Refactor Tool
 *
 * Runs the refactor wizard in headless mode, aggregates suggestions,
 * and creates a PR with the applied refactors.
 *
 * Usage:
 *   npm run refactor:ci -- [options]
 *
 * Options:
 *   --project-path <path>    Path to the project to analyze (default: current directory)
 *   --config <path>          Path to refactor config file (default: .refactor.config.json)
 *   --pr-title <title>       Custom PR title
 *   --pr-branch <branch>     Custom PR branch name (default: auto-refactor-TIMESTAMP)
 *   --base-branch <branch>   Base branch for PR (default: main)
 *   --dry-run                Run analysis without creating PR
 *   --auto-fix-only          Only apply opportunities with autoFixAvailable=true
 *   --severity <level>       Minimum severity level (low, medium, high, critical)
 *   --category <cat>         Filter by category (comma-separated)
 *   --provider <provider>    LLM provider for AI analysis (ollama, openai, anthropic, gemini)
 *   --model <model>          LLM model name
 *   --skip-ai                Skip AI analysis, use pattern detection only
 */

import { analyzeProject } from '../src/app/features/RefactorWizard/lib/refactorAnalyzer';
import type { RefactorOpportunity } from '../src/stores/refactorStore';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RefactorConfig {
  enabled: boolean;
  autoFixOnly?: boolean;
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  categories?: string[];
  excludePatterns?: string[];
  maxOpportunitiesPerPR?: number;
  requireApproval?: boolean;
  provider?: string;
  model?: string;
  skipAI?: boolean;
}

interface CLIOptions {
  projectPath: string;
  configPath: string;
  prTitle?: string;
  prBranch?: string;
  baseBranch: string;
  dryRun: boolean;
  autoFixOnly?: boolean;
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  categories?: string[];
  provider?: string;
  model?: string;
  skipAI?: boolean;
}

const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    projectPath: process.cwd(),
    configPath: path.join(process.cwd(), '.refactor.config.json'),
    baseBranch: 'main',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--project-path':
        options.projectPath = args[++i];
        break;
      case '--config':
        options.configPath = args[++i];
        break;
      case '--pr-title':
        options.prTitle = args[++i];
        break;
      case '--pr-branch':
        options.prBranch = args[++i];
        break;
      case '--base-branch':
        options.baseBranch = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--auto-fix-only':
        options.autoFixOnly = true;
        break;
      case '--severity':
        options.minSeverity = args[++i] as any;
        break;
      case '--category':
        options.categories = args[++i].split(',');
        break;
      case '--provider':
        options.provider = args[++i];
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--skip-ai':
        options.skipAI = true;
        break;
    }
  }

  return options;
}

/**
 * Load refactor configuration
 */
function loadConfig(configPath: string): RefactorConfig {
  const defaultConfig: RefactorConfig = {
    enabled: true,
    autoFixOnly: false,
    minSeverity: 'low',
    maxOpportunitiesPerPR: 50,
    requireApproval: false,
    skipAI: false,
  };

  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return { ...defaultConfig, ...config };
  } catch (error) {
    console.warn(`Warning: Failed to load config from ${configPath}, using defaults`);
    return defaultConfig;
  }
}

/**
 * Filter opportunities based on config and CLI options
 */
function filterOpportunities(
  opportunities: RefactorOpportunity[],
  config: RefactorConfig,
  options: CLIOptions
): RefactorOpportunity[] {
  let filtered = opportunities;

  // Auto-fix only
  const autoFixOnly = options.autoFixOnly ?? config.autoFixOnly ?? false;
  if (autoFixOnly) {
    filtered = filtered.filter(o => o.autoFixAvailable);
  }

  // Minimum severity
  const minSeverity = options.minSeverity ?? config.minSeverity ?? 'low';
  filtered = filtered.filter(o => severityOrder[o.severity] >= severityOrder[minSeverity]);

  // Categories
  const categories = options.categories ?? config.categories;
  if (categories && categories.length > 0) {
    filtered = filtered.filter(o => categories.includes(o.category));
  }

  // Max opportunities
  const maxOpportunities = config.maxOpportunitiesPerPR ?? 50;
  if (filtered.length > maxOpportunities) {
    // Prioritize by severity
    filtered = filtered
      .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
      .slice(0, maxOpportunities);
  }

  return filtered;
}

/**
 * Generate PR description from opportunities
 */
function generatePRDescription(opportunities: RefactorOpportunity[]): string {
  const categoryCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};

  opportunities.forEach(o => {
    categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
    severityCounts[o.severity] = (severityCounts[o.severity] || 0) + 1;
  });

  const description = `## Automated Refactor Summary

This PR contains automated refactoring suggestions identified by the Vibeman Refactor Wizard.

### Overview
- **Total Issues Addressed**: ${opportunities.length}
- **Auto-fixable**: ${opportunities.filter(o => o.autoFixAvailable).length}

### By Category
${Object.entries(categoryCounts)
  .map(([cat, count]) => `- **${cat}**: ${count} issue${count !== 1 ? 's' : ''}`)
  .join('\n')}

### By Severity
${Object.entries(severityCounts)
  .map(([sev, count]) => `- **${sev}**: ${count} issue${count !== 1 ? 's' : ''}`)
  .join('\n')}

### Refactor Opportunities

${opportunities.map((o, i) => `
#### ${i + 1}. ${o.title}
- **Category**: ${o.category}
- **Severity**: ${o.severity}
- **Effort**: ${o.effort}
- **Auto-fix Available**: ${o.autoFixAvailable ? '✅' : '❌'}
- **Impact**: ${o.impact}
- **Description**: ${o.description}
- **Files**: ${o.files.join(', ')}
${o.suggestedFix ? `- **Suggested Fix**: ${o.suggestedFix}` : ''}
`).join('\n---\n')}

---

🤖 *Generated by [Vibeman CI/CD Refactor Tool](https://github.com/yourusername/vibeman)*
`;

  return description;
}

/**
 * Create a new branch for the refactor PR
 */
async function createRefactorBranch(branchName: string, baseBranch: string): Promise<void> {
  console.log(`📌 Creating branch: ${branchName} from ${baseBranch}`);

  // Ensure we're on the base branch and it's up to date
  await execAsync(`git checkout ${baseBranch}`);
  await execAsync(`git pull origin ${baseBranch}`);

  // Create and checkout new branch
  await execAsync(`git checkout -b ${branchName}`);
}

/**
 * Create requirement files for opportunities
 */
async function createRequirementFiles(
  opportunities: RefactorOpportunity[],
  projectPath: string
): Promise<string[]> {
  const requirementsDir = path.join(projectPath, '.claude', 'commands');

  // Ensure directory exists
  if (!fs.existsSync(requirementsDir)) {
    fs.mkdirSync(requirementsDir, { recursive: true });
  }

  const BATCH_SIZE = 20;
  const batches = [];
  for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
    batches.push(opportunities.slice(i, i + BATCH_SIZE));
  }

  const createdFiles: string[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const fileName = `auto-refactor-batch-${batchIndex + 1}.md`;
    const filePath = path.join(requirementsDir, fileName);

    // Generate requirement content
    const content = generateRequirementContent(batch, batchIndex + 1, batches.length);

    fs.writeFileSync(filePath, content, 'utf-8');
    createdFiles.push(fileName);
  }

  return createdFiles;
}

/**
 * Generate requirement file content
 */
function generateRequirementContent(
  opportunities: RefactorOpportunity[],
  batchNum: number,
  totalBatches: number
): string {
  return `# Automated Refactor - Batch ${batchNum}/${totalBatches}

## Overview
This requirement contains ${opportunities.length} refactoring opportunities identified by automated analysis.

## Refactor Opportunities

${opportunities.map((o, i) => `
### ${i + 1}. ${o.title}

**Category**: ${o.category}
**Severity**: ${o.severity}
**Effort**: ${o.effort}
**Auto-fix Available**: ${o.autoFixAvailable ? 'Yes' : 'No'}

**Description**: ${o.description}

**Impact**: ${o.impact}

**Files**:
${o.files.map(f => `- \`${f}\``).join('\n')}

${o.lineNumbers ? `**Line Numbers**: ${JSON.stringify(o.lineNumbers)}` : ''}

${o.suggestedFix ? `**Suggested Fix**:\n${o.suggestedFix}` : ''}

${o.estimatedTime ? `**Estimated Time**: ${o.estimatedTime}` : ''}

---
`).join('\n')}

## Instructions

1. Review each refactoring opportunity carefully
2. Apply the suggested changes to the indicated files
3. Ensure all changes maintain existing functionality
4. Run tests to verify no regressions
5. Add appropriate data-testid attributes to any new interactive components

## Notes

- This is an automated refactor batch
- Prioritize auto-fixable items first
- Ensure code style consistency
- Update documentation if needed
`;
}

/**
 * Commit changes and create PR
 */
async function commitAndCreatePR(
  options: CLIOptions,
  opportunities: RefactorOpportunity[],
  requirementFiles: string[]
): Promise<void> {
  const prTitle = options.prTitle || `[Auto-Refactor] Fix ${opportunities.length} code quality issues`;
  const prDescription = generatePRDescription(opportunities);

  console.log('📝 Committing changes...');

  // Add requirement files
  await execAsync('git add .claude/commands/auto-refactor-*.md');

  // Commit
  await execAsync(`git commit -m "${prTitle}

This commit adds ${requirementFiles.length} requirement file(s) for automated refactoring.

Files created:
${requirementFiles.map(f => `- ${f}`).join('\n')}

Total opportunities: ${opportunities.length}
"`);

  console.log('🚀 Pushing branch...');
  await execAsync(`git push origin ${options.prBranch}`);

  console.log('🔀 Creating PR...');

  // Create PR using GitHub CLI
  const prDescriptionFile = path.join(process.cwd(), '.pr-description.tmp');
  fs.writeFileSync(prDescriptionFile, prDescription);

  try {
    const { stdout } = await execAsync(
      `gh pr create --title "${prTitle}" --body-file "${prDescriptionFile}" --base ${options.baseBranch} --head ${options.prBranch}`
    );
    console.log(stdout);

    // Add label
    await execAsync(`gh pr edit --add-label "automated-refactor,code-quality"`);

    console.log('✅ PR created successfully!');
  } finally {
    // Clean up temp file
    if (fs.existsSync(prDescriptionFile)) {
      fs.unlinkSync(prDescriptionFile);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Vibeman CI/CD Refactor Tool\n');

  const options = parseArgs();
  const config = loadConfig(options.configPath);

  if (!config.enabled) {
    console.log('ℹ️  Refactor CI is disabled in config');
    process.exit(0);
  }

  console.log(`📂 Project path: ${options.projectPath}`);
  console.log(`⚙️  Config path: ${options.configPath}`);
  console.log(`🎯 Base branch: ${options.baseBranch}`);
  console.log(`${options.dryRun ? '🧪 DRY RUN MODE' : ''}\n`);

  // Run analysis
  console.log('🔬 Running refactor analysis...');
  const useAI = !(options.skipAI ?? config.skipAI ?? false);
  const provider = options.provider ?? config.provider;
  const model = options.model ?? config.model;

  const result = await analyzeProject(options.projectPath, useAI, provider, model);

  console.log(`✅ Analysis complete: ${result.opportunities.length} opportunities found`);
  console.log(`   - Total files scanned: ${result.summary.totalFiles}`);
  console.log(`   - Total lines: ${result.summary.totalLines}\n`);

  // Filter opportunities
  const filteredOpportunities = filterOpportunities(result.opportunities, config, options);

  console.log(`🎯 Filtered to ${filteredOpportunities.length} opportunities`);

  if (filteredOpportunities.length === 0) {
    console.log('✨ No refactoring opportunities match the criteria. Exiting.');
    process.exit(0);
  }

  // Show summary
  console.log('\n📊 Summary:');
  const categoryCounts: Record<string, number> = {};
  filteredOpportunities.forEach(o => {
    categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
  });
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count}`);
  });

  if (options.dryRun) {
    console.log('\n🧪 DRY RUN - Skipping PR creation');
    console.log('\nOpportunities that would be included:');
    filteredOpportunities.forEach((o, i) => {
      console.log(`${i + 1}. [${o.severity}] ${o.title}`);
    });
    process.exit(0);
  }

  // Create branch
  const branchName = options.prBranch || `auto-refactor-${Date.now()}`;
  await createRefactorBranch(branchName, options.baseBranch);

  // Create requirement files
  console.log('\n📄 Creating requirement files...');
  const requirementFiles = await createRequirementFiles(filteredOpportunities, options.projectPath);
  console.log(`✅ Created ${requirementFiles.length} requirement file(s)`);

  // Commit and create PR
  await commitAndCreatePR(options, filteredOpportunities, requirementFiles);

  console.log('\n✅ All done!');
  console.log('\n💡 Next steps:');
  console.log('   1. Review the PR on GitHub');
  console.log('   2. Use Claude Code to execute the requirement files');
  console.log('   3. Test the changes');
  console.log('   4. Merge the PR');
}

// Run
main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
