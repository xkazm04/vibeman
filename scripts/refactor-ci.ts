#!/usr/bin/env ts-node
/**
 * Headless CI/CD Refactor Tool
 *
 * Runs the refactor wizard in headless mode, analyzes code,
 * and outputs results in JSON format for CI/CD integration.
 *
 * Usage:
 *   npm run refactor:ci -- --project ./path/to/project --output results.json
 *   npm run refactor:ci -- --project ./path/to/project --auto-pr
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject } from '../src/app/features/RefactorWizard/lib/refactorAnalyzer';
import type { RefactorOpportunity } from '../src/stores/refactorStore';

interface CLIOptions {
  project: string;
  output?: string;
  autoPR?: boolean;
  config?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  provider?: string;
  model?: string;
  noAI?: boolean;
  verbose?: boolean;
}

interface RefactorCIConfig {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  categories?: string[];
  excludePatterns?: string[];
  provider?: string;
  model?: string;
  autoPR?: boolean;
  prBranch?: string;
  prTitle?: string;
  prBody?: string;
}

interface RefactorCIResult {
  success: boolean;
  timestamp: string;
  projectPath: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    categoryCounts: Record<string, number>;
  };
  opportunities: RefactorOpportunity[];
  config: RefactorCIConfig;
  error?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    project: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--project':
      case '-p':
        options.project = next;
        i++;
        break;
      case '--output':
      case '-o':
        options.output = next;
        i++;
        break;
      case '--auto-pr':
        options.autoPR = true;
        break;
      case '--config':
      case '-c':
        options.config = next;
        i++;
        break;
      case '--severity':
      case '-s':
        options.severity = next as CLIOptions['severity'];
        i++;
        break;
      case '--category':
        options.category = next;
        i++;
        break;
      case '--provider':
        options.provider = next;
        i++;
        break;
      case '--model':
        options.model = next;
        i++;
        break;
      case '--no-ai':
        options.noAI = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Vibeman Refactor CI - Headless Refactor Analysis Tool

Usage:
  npm run refactor:ci [options]

Options:
  -p, --project <path>      Project path to analyze (default: current directory)
  -o, --output <file>       Output JSON file path
  --auto-pr                 Automatically create a PR with refactor suggestions
  -c, --config <file>       Configuration file path (.refactor-ci.json)
  -s, --severity <level>    Minimum severity level (low|medium|high|critical)
  --category <category>     Filter by category (performance|maintainability|security|code-quality|duplication|architecture)
  --provider <provider>     LLM provider (ollama|openai|anthropic|gemini)
  --model <model>           LLM model name
  --no-ai                   Disable AI analysis (pattern-based only)
  -v, --verbose             Verbose output
  -h, --help                Show this help message

Examples:
  # Basic analysis
  npm run refactor:ci -- --project ./src

  # Output to JSON file
  npm run refactor:ci -- --project ./src --output results.json

  # Auto-create PR
  npm run refactor:ci -- --project ./src --auto-pr

  # Filter by severity
  npm run refactor:ci -- --project ./src --severity high

  # Use specific LLM provider
  npm run refactor:ci -- --project ./src --provider openai --model gpt-4
`);
}

/**
 * Load configuration from file
 */
function loadConfig(configPath?: string): RefactorCIConfig {
  const defaultConfigPath = path.join(process.cwd(), '.refactor-ci.json');
  const targetPath = configPath || defaultConfigPath;

  if (!fs.existsSync(targetPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading config from ${targetPath}:`, error);
    return {};
  }
}

/**
 * Filter opportunities based on configuration
 */
function filterOpportunities(
  opportunities: RefactorOpportunity[],
  config: RefactorCIConfig,
  options: CLIOptions
): RefactorOpportunity[] {
  let filtered = [...opportunities];

  // Filter by severity
  const minSeverity = options.severity || config.severity;
  if (minSeverity) {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    filtered = filtered.filter(opp => severityOrder.indexOf(opp.severity) >= minIndex);
  }

  // Filter by category
  const category = options.category;
  if (category) {
    filtered = filtered.filter(opp => opp.category === category);
  } else if (config.categories && config.categories.length > 0) {
    filtered = filtered.filter(opp => config.categories!.includes(opp.category));
  }

  return filtered;
}

/**
 * Generate summary statistics
 */
function generateSummary(opportunities: RefactorOpportunity[]) {
  const summary = {
    totalIssues: opportunities.length,
    criticalIssues: opportunities.filter(o => o.severity === 'critical').length,
    highIssues: opportunities.filter(o => o.severity === 'high').length,
    mediumIssues: opportunities.filter(o => o.severity === 'medium').length,
    lowIssues: opportunities.filter(o => o.severity === 'low').length,
    categoryCounts: {} as Record<string, number>,
  };

  opportunities.forEach(opp => {
    summary.categoryCounts[opp.category] = (summary.categoryCounts[opp.category] || 0) + 1;
  });

  return summary;
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();
  const config = loadConfig(options.config);

  // Resolve project path
  const projectPath = path.resolve(options.project);

  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Project path does not exist: ${projectPath}`);
    process.exit(1);
  }

  if (options.verbose) {
    console.log('Vibeman Refactor CI');
    console.log('===================');
    console.log(`Project: ${projectPath}`);
    console.log(`AI Analysis: ${!options.noAI}`);
    if (options.provider) console.log(`Provider: ${options.provider}`);
    if (options.model) console.log(`Model: ${options.model}`);
    console.log('');
  }

  try {
    // Run analysis
    if (options.verbose) {
      console.log('Starting analysis...');
    }

    const useAI = !options.noAI;
    const provider = options.provider || config.provider;
    const model = options.model || config.model;

    const result = await analyzeProject(projectPath, useAI, provider, model);

    // Filter opportunities
    const filteredOpportunities = filterOpportunities(
      result.opportunities,
      config,
      options
    );

    // Generate summary
    const summary = generateSummary(filteredOpportunities);

    if (options.verbose) {
      console.log(`\nAnalysis complete!`);
      console.log(`Total issues found: ${summary.totalIssues}`);
      console.log(`  Critical: ${summary.criticalIssues}`);
      console.log(`  High: ${summary.highIssues}`);
      console.log(`  Medium: ${summary.mediumIssues}`);
      console.log(`  Low: ${summary.lowIssues}`);
      console.log('');
    }

    // Build result
    const ciResult: RefactorCIResult = {
      success: true,
      timestamp: new Date().toISOString(),
      projectPath,
      summary,
      opportunities: filteredOpportunities,
      config: {
        ...config,
        provider,
        model,
      },
    };

    // Output to file or stdout
    const output = JSON.stringify(ciResult, null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, output, 'utf-8');
      if (options.verbose) {
        console.log(`Results written to: ${options.output}`);
      }
    } else {
      console.log(output);
    }

    // Auto-create PR if requested
    if (options.autoPR || config.autoPR) {
      if (options.verbose) {
        console.log('\nTriggering PR automation...');
      }
      // This will be handled by the PR automation service
      // For now, just output a flag that can be picked up by CI
      const prFlag = {
        createPR: true,
        resultFile: options.output || 'refactor-results.json',
      };
      fs.writeFileSync('.refactor-pr-flag.json', JSON.stringify(prFlag, null, 2));
    }

    // Exit with non-zero code if critical or high severity issues found
    if (summary.criticalIssues > 0 || summary.highIssues > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    const errorResult: RefactorCIResult = {
      success: false,
      timestamp: new Date().toISOString(),
      projectPath,
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        categoryCounts: {},
      },
      opportunities: [],
      config,
      error: error instanceof Error ? error.message : String(error),
    };

    const output = JSON.stringify(errorResult, null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, output, 'utf-8');
    } else {
      console.error(output);
    }

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main, parseArgs, loadConfig, filterOpportunities };
