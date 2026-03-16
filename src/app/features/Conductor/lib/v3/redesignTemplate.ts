/**
 * Redesign Template — generates .claude/commands markdown for low-rated decisions
 */

import type { PipelineDecision } from './reportGenerator';

interface RedesignContext {
  goalTitle: string;
  goalDescription: string;
  projectPath: string;
  reflectionSummary?: string;
  lessonsLearned?: string[];
}

/**
 * Build a redesign command markdown file for a poorly-rated decision
 */
export function buildRedesignCommand(
  decision: PipelineDecision,
  rating: number,
  comment: string | undefined,
  context: RedesignContext
): string {
  const lines: string[] = [];

  lines.push('Redesign and reimplement the following approach that was attempted by the Conductor pipeline but rated poorly by the developer.');
  lines.push('');
  lines.push('## Original Decision');
  lines.push('');
  lines.push(`**Task:** ${decision.title}`);
  lines.push(`**What was done:** ${decision.context}`);
  lines.push(`**Type:** ${decision.type}`);
  lines.push(`**Result:** ${decision.outcome || 'unknown'}`);
  lines.push('');

  lines.push('## Why It Was Rated Poorly');
  lines.push('');
  lines.push(`**Rating:** ${rating}/5`);
  if (comment) {
    lines.push(`**Developer comment:** ${comment}`);
  }
  lines.push('');

  lines.push('## Context From Pipeline');
  lines.push('');
  lines.push(`**Goal:** ${context.goalTitle} — ${context.goalDescription}`);
  if (context.reflectionSummary) {
    lines.push(`**Reflection summary:** ${context.reflectionSummary}`);
  }
  if (context.lessonsLearned?.length) {
    lines.push('**Lessons learned:**');
    for (const lesson of context.lessonsLearned) {
      lines.push(`- ${lesson}`);
    }
  }
  lines.push('');

  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Read the affected files and understand the current state');
  lines.push('2. Evaluate what went wrong with the original approach');
  lines.push('3. Design a better solution — consider:');
  lines.push('   - Different architectural approach');
  lines.push('   - Better file organization');
  lines.push('   - More robust error handling');
  lines.push('   - Simpler implementation');
  lines.push('4. Implement the redesign');
  lines.push('5. Verify with `npx tsc --noEmit`');
  lines.push('6. Commit with message: `fix(conductor-redesign): {brief description}`');
  lines.push('');

  lines.push('## Project Path');
  lines.push(`\`${context.projectPath}\``);

  return lines.join('\n');
}
