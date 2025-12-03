/**
 * Blueprint Test Script
 *
 * Server-side test script for running blueprint and chain tests during development.
 * Usage: npx tsx scripts/test-blueprints.ts [projectPath]
 *
 * Examples:
 *   npx tsx scripts/test-blueprints.ts                    # Uses current directory
 *   npx tsx scripts/test-blueprints.ts /path/to/project   # Uses specified project
 */

import {
  BlueprintTestRunner,
  testAnalyzer,
  testAnalyzerWithProcessor,
} from '../src/lib/blueprint/testing';
import { AnalyzerId, ProcessorId } from '../src/lib/blueprint/components';
import { ProjectType } from '../src/lib/blueprint/types';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_PROJECT_PATH = process.cwd();
const DEFAULT_PROJECT_TYPE: ProjectType = 'nextjs';

interface TestConfig {
  projectPath: string;
  projectType: ProjectType;
  verbose: boolean;
}

// ============================================================================
// Test Suites
// ============================================================================

async function testSingleBlueprint(config: TestConfig): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Single Blueprint (Console Analyzer)');
  console.log('='.repeat(60));

  const runner = new BlueprintTestRunner({
    projectPath: config.projectPath,
    projectType: config.projectType,
    verbose: config.verbose,
  });

  const result = await runner.runBlueprint({
    analyzerId: 'analyzer.console' as AnalyzerId,
    name: 'Console Log Finder',
  });

  console.log('\nResult:');
  console.log(`  Status: ${result.status}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log(`  Issues Found: ${result.issues.length}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }

  if (result.issues.length > 0) {
    console.log('\n  Sample Issues:');
    result.issues.slice(0, 3).forEach((issue, i) => {
      console.log(`    ${i + 1}. [${issue.severity}] ${issue.title}`);
      console.log(`       File: ${issue.file}:${issue.line}`);
    });
  }

  return result.status !== 'error';
}

async function testBlueprintWithProcessor(config: TestConfig): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Blueprint with Processor (Console + Filter)');
  console.log('='.repeat(60));

  const runner = new BlueprintTestRunner({
    projectPath: config.projectPath,
    projectType: config.projectType,
    verbose: config.verbose,
  });

  const result = await runner.runBlueprint({
    analyzerId: 'analyzer.console' as AnalyzerId,
    processorIds: ['processor.filter' as ProcessorId],
    processorConfigs: {
      'processor.filter': {
        severities: ['warning', 'error'],
      },
    },
    name: 'Console Logs (Filtered)',
  });

  console.log('\nResult:');
  console.log(`  Status: ${result.status}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log(`  Issues After Filter: ${result.issues.length}`);

  if (result.stages.length > 0) {
    console.log('\n  Stages:');
    result.stages.forEach((stage) => {
      console.log(`    - ${stage.stageName}: ${stage.status} (${stage.duration}ms)`);
      if (stage.inputCount !== undefined) {
        console.log(`      Input: ${stage.inputCount}, Output: ${stage.outputCount}`);
      }
    });
  }

  return result.status !== 'error';
}

async function testTwoBlueprintChain(config: TestConfig): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Chain of Two Blueprints');
  console.log('='.repeat(60));

  const runner = new BlueprintTestRunner({
    projectPath: config.projectPath,
    projectType: config.projectType,
    verbose: config.verbose,
  });

  const result = await runner.runChain(
    [
      {
        analyzerId: 'analyzer.console' as AnalyzerId,
        name: 'Console Log Finder',
      },
      {
        analyzerId: 'analyzer.any-types' as AnalyzerId,
        name: 'Any Type Finder',
      },
    ],
    'Code Quality Chain'
  );

  console.log('\nChain Result:');
  console.log(`  Chain: ${result.chainName}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log(`  Total Issues: ${result.totalIssues}`);

  if (result.blueprintResults.length > 0) {
    console.log('\n  Blueprint Results:');
    result.blueprintResults.forEach((br, i) => {
      console.log(`    ${i + 1}. ${br.blueprintName}`);
      console.log(`       Status: ${br.status}, Issues: ${br.issues.length}`);
    });
  }

  return result.status !== 'error';
}

async function testHealthCheck(config: TestConfig): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Health Check');
  console.log('='.repeat(60));

  const runner = new BlueprintTestRunner({
    projectPath: config.projectPath,
    projectType: config.projectType,
    verbose: false,
  });

  const result = await runner.runHealthCheck();

  console.log('\nHealth Check Result:');
  console.log(`  Status: ${result.status}`);
  console.log('\n  Checks:');
  result.checks.forEach((check) => {
    const icon = check.status === 'pass' ? '✓' : '✗';
    console.log(`    ${icon} ${check.name}: ${check.status}`);
    if (check.message) {
      console.log(`      ${check.message}`);
    }
  });

  return result.status === 'healthy';
}

async function testMultiProcessorChain(config: TestConfig): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Blueprint with Multiple Processors');
  console.log('='.repeat(60));

  const runner = new BlueprintTestRunner({
    projectPath: config.projectPath,
    projectType: config.projectType,
    verbose: config.verbose,
  });

  const result = await runner.runBlueprint({
    analyzerId: 'analyzer.console' as AnalyzerId,
    processorIds: [
      'processor.filter' as ProcessorId,
      'processor.grouper' as ProcessorId,
    ],
    processorConfigs: {
      'processor.filter': {
        severities: ['info', 'warning', 'error'],
      },
      'processor.grouper': {
        groupBy: 'file',
      },
    },
    name: 'Console Logs (Filtered & Grouped)',
  });

  console.log('\nResult:');
  console.log(`  Status: ${result.status}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log(`  Final Issues: ${result.issues.length}`);

  if (result.stages.length > 0) {
    console.log('\n  Pipeline Stages:');
    result.stages.forEach((stage, i) => {
      const arrow = i > 0 ? '  → ' : '    ';
      console.log(`${arrow}${stage.stageName}`);
      console.log(`      Status: ${stage.status}, Duration: ${stage.duration}ms`);
      if (stage.inputCount !== undefined) {
        console.log(`      ${stage.inputCount} in → ${stage.outputCount} out`);
      }
    });
  }

  return result.status !== 'error';
}

// ============================================================================
// Quick Test Functions (for development)
// ============================================================================

async function quickAnalyzerTest(
  analyzerId: AnalyzerId,
  projectPath: string,
  projectType: ProjectType = 'nextjs'
): Promise<void> {
  console.log(`\nQuick test: ${analyzerId}`);
  console.log('-'.repeat(40));

  const result = await testAnalyzer(analyzerId, projectPath, projectType);

  console.log(`Status: ${result.status}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Duration: ${result.duration}ms`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const projectPath = args[0] || DEFAULT_PROJECT_PATH;
  const verbose = args.includes('--verbose') || args.includes('-v');

  const config: TestConfig = {
    projectPath: path.resolve(projectPath),
    projectType: DEFAULT_PROJECT_TYPE,
    verbose,
  };

  console.log('\n' + '█'.repeat(60));
  console.log('  BLUEPRINT TEST SUITE');
  console.log('█'.repeat(60));
  console.log(`\nProject Path: ${config.projectPath}`);
  console.log(`Project Type: ${config.projectType}`);
  console.log(`Verbose: ${config.verbose}`);

  const results: { name: string; passed: boolean }[] = [];

  // Run all tests
  try {
    results.push({
      name: 'Health Check',
      passed: await testHealthCheck(config),
    });

    results.push({
      name: 'Single Blueprint',
      passed: await testSingleBlueprint(config),
    });

    results.push({
      name: 'Blueprint with Processor',
      passed: await testBlueprintWithProcessor(config),
    });

    results.push({
      name: 'Multi-Processor Pipeline',
      passed: await testMultiProcessorChain(config),
    });

    results.push({
      name: 'Two Blueprint Chain',
      passed: await testTwoBlueprintChain(config),
    });
  } catch (error) {
    console.error('\nTest suite error:', error);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((r) => {
    const icon = r.passed ? '✓' : '✗';
    console.log(`  ${icon} ${r.name}: ${r.passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log(`\nTotal: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
