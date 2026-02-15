/**
 * Test Reporter — generates JSON and Markdown reports from test run results.
 */

import type { TestRunResult, TestCaseResult } from './testTypes';

/** Generate machine-readable JSON report */
export function generateJsonReport(result: TestRunResult): string {
  return JSON.stringify(result, null, 2);
}

/** Generate human-readable Markdown report */
export function generateMarkdownReport(result: TestRunResult): string {
  const lines: string[] = [];

  lines.push('# Persona Design Test Report');
  lines.push('');
  lines.push(`**Run ID**: ${result.testRunId}`);
  lines.push(`**Date**: ${result.startedAt}`);
  const durationMs = new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();
  const durationSec = Math.round(durationMs / 1000);
  lines.push(`**Duration**: ${durationSec}s`);
  lines.push('');

  // Summary
  const passRate = result.totalTests > 0 ? Math.round((result.passed / result.totalTests) * 100) : 0;
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Tests | ${result.totalTests} |`);
  lines.push(`| Passed | ${result.passed} (${passRate}%) |`);
  lines.push(`| Failed | ${result.failed} |`);
  lines.push(`| Errors | ${result.errored} |`);
  lines.push('');

  // Per-case results
  lines.push('## Test Results');
  lines.push('');

  for (const tc of result.results) {
    const icon = tc.status === 'passed' ? '✅' : tc.status === 'failed' ? '❌' : '⚠️';
    lines.push(`### ${icon} ${tc.testCaseName} (\`${tc.testCaseId}\`)`);
    lines.push('');
    lines.push(`**Status**: ${tc.status} | **Duration**: ${Math.round(tc.durationMs / 1000)}s`);

    if (tc.connectorsUsed.length > 0) {
      lines.push(`**Connectors**: ${tc.connectorsUsed.join(', ')}`);
    }
    if (tc.triggerTypes.length > 0) {
      lines.push(`**Triggers**: ${tc.triggerTypes.join(', ')}`);
    }
    lines.push('');

    // Structural evaluation
    lines.push('**Structural Evaluation**: ' +
      `${tc.structuralEvaluation.passed ? 'PASS' : 'FAIL'} (${tc.structuralEvaluation.score}/100)`);
    lines.push('');
    for (const check of tc.structuralEvaluation.checks) {
      const checkIcon = check.passed ? '✅' : '❌';
      lines.push(`- ${checkIcon} ${check.name}: ${check.message}`);
    }
    lines.push('');

    // Semantic evaluation
    if (tc.semanticEvaluation) {
      lines.push('**Semantic Evaluation**: ' +
        `${tc.semanticEvaluation.passed ? 'PASS' : 'FAIL'} (${tc.semanticEvaluation.overallScore}/100)`);
      lines.push('');
      for (const dim of tc.semanticEvaluation.dimensions) {
        lines.push(`- **${dim.name}**: ${dim.score}/100 — ${dim.feedback}`);
      }
      lines.push('');
      if (tc.semanticEvaluation.llmReasoning) {
        lines.push(`> ${tc.semanticEvaluation.llmReasoning}`);
        lines.push('');
      }
    } else {
      lines.push('**Semantic Evaluation**: Skipped');
      lines.push('');
    }

    // Errors
    if (tc.errors.length > 0) {
      lines.push('**Errors**:');
      for (const err of tc.errors) {
        lines.push(`- ${err}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/** Format a relative time string from an ISO date */
export function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

/** Get staleness level based on review age */
export function getStalenessLevel(isoDate: string): 'fresh' | 'stale' | 'expired' {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 30) return 'expired';
  if (diffDays > 7) return 'stale';
  return 'fresh';
}
