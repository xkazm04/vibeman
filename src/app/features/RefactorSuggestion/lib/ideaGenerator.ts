/**
 * Idea Generator for Refactor Suggestions
 *
 * Converts refactor suggestions into Ideas that can be tracked
 * and implemented through the Vibeman automation system.
 */

import { ideaDb } from '@/app/db';
import type { RefactorSuggestion } from './refactorSuggestionEngine';

// Generate unique idea ID
function generateIdeaId(): string {
  return `idea_refactor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique scan ID for ideas
function generateScanId(): string {
  return `scan_refactor_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface IdeaGenerationResult {
  success: boolean;
  ideaId?: string;
  error?: string;
}

/**
 * Map refactor suggestion severity to idea effort (inverse relationship)
 */
function mapSeverityToEffort(severity: RefactorSuggestion['severity']): number {
  // Higher severity often correlates with more urgent but potentially quick wins
  // Lower severity might need more careful refactoring
  const mapping: Record<string, number> = {
    critical: 2, // Medium effort - urgent but focused
    high: 2,     // Medium effort
    medium: 2,   // Medium effort
    low: 1,      // Low effort - usually simple fixes
  };
  return mapping[severity] || 2;
}

/**
 * Map refactor suggestion impact to idea impact
 */
function mapImpact(impact: RefactorSuggestion['impact']): number {
  const mapping: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };
  return mapping[impact] || 2;
}

/**
 * Map category to idea category
 */
function mapCategory(category: RefactorSuggestion['category']): string {
  const mapping: Record<string, string> = {
    'anti-pattern': 'refactoring',
    'duplication': 'refactoring',
    'coupling': 'architecture',
    'complexity': 'refactoring',
    'clean-code': 'enhancement',
  };
  return mapping[category] || 'refactoring';
}

/**
 * Generate an idea from a refactor suggestion
 */
export function generateIdeaFromSuggestion(
  suggestion: RefactorSuggestion,
  projectId: string
): IdeaGenerationResult {
  try {
    // Build a comprehensive description
    const description = [
      suggestion.description,
      '',
      '## Suggested Fix',
      suggestion.suggestedFix,
      '',
      '## Refactoring Steps',
      ...suggestion.refactorSteps.map((step, i) => `${i + 1}. ${step}`),
    ];

    if (suggestion.cleanArchitecturePrinciple) {
      description.push('', `**Clean Architecture Principle**: ${suggestion.cleanArchitecturePrinciple}`);
    }

    if (suggestion.files.length > 0) {
      description.push('', '## Affected Files', ...suggestion.files.map(f => `- ${f}`));
    }

    // Create the idea using createIdea method
    const idea = ideaDb.createIdea({
      id: generateIdeaId(),
      scan_id: generateScanId(),
      project_id: projectId,
      title: suggestion.title,
      description: description.join('\n'),
      category: mapCategory(suggestion.category),
      effort: mapSeverityToEffort(suggestion.severity),
      impact: mapImpact(suggestion.impact),
      scan_type: 'refactor_suggestion_engine',
      status: 'pending',
      reasoning: suggestion.cleanArchitecturePrinciple
        ? `This refactoring addresses a ${suggestion.category} issue and follows ${suggestion.cleanArchitecturePrinciple}.`
        : `This refactoring addresses a ${suggestion.category} issue.`,
    });

    return {
      success: true,
      ideaId: idea.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating idea',
    };
  }
}

/**
 * Generate ideas from multiple refactor suggestions
 */
export function generateIdeasFromSuggestions(
  suggestions: RefactorSuggestion[],
  projectId: string,
  options: {
    maxIdeas?: number;
    severityFilter?: RefactorSuggestion['severity'][];
    categoryFilter?: RefactorSuggestion['category'][];
    skipExisting?: boolean;
  } = {}
): {
  created: string[];
  skipped: number;
  failed: number;
  errors: string[];
} {
  const {
    maxIdeas = 20,
    severityFilter,
    categoryFilter,
    skipExisting = true,
  } = options;

  const result = {
    created: [] as string[],
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Filter suggestions
  let filtered = suggestions;

  if (severityFilter && severityFilter.length > 0) {
    filtered = filtered.filter(s => severityFilter.includes(s.severity));
  }

  if (categoryFilter && categoryFilter.length > 0) {
    filtered = filtered.filter(s => categoryFilter.includes(s.category));
  }

  // Limit to maxIdeas
  filtered = filtered.slice(0, maxIdeas);

  // Check existing ideas to avoid duplicates
  const existingIdeas = skipExisting ? ideaDb.getIdeasByProject(projectId) : [];
  const existingTitles = new Set(existingIdeas.map(i => i.title.toLowerCase()));

  for (const suggestion of filtered) {
    // Skip if idea with same title exists
    if (skipExisting && existingTitles.has(suggestion.title.toLowerCase())) {
      result.skipped++;
      continue;
    }

    const genResult = generateIdeaFromSuggestion(suggestion, projectId);

    if (genResult.success && genResult.ideaId) {
      result.created.push(genResult.ideaId);
    } else {
      result.failed++;
      if (genResult.error) {
        result.errors.push(genResult.error);
      }
    }
  }

  return result;
}

/**
 * Build a Claude Code requirement from a suggestion
 */
export function buildRequirementFromSuggestion(
  suggestion: RefactorSuggestion,
  projectPath: string
): string {
  const lines = [
    `# ${suggestion.title}`,
    '',
    `## Category: ${suggestion.category}`,
    `## Severity: ${suggestion.severity}`,
    `## Effort: ${suggestion.effort} | Impact: ${suggestion.impact}`,
    '',
    '## Description',
    suggestion.description,
    '',
    '## Suggested Fix',
    suggestion.suggestedFix,
    '',
    '## Refactoring Steps',
    ...suggestion.refactorSteps.map((step, i) => `${i + 1}. ${step}`),
    '',
    '## Affected Files',
    ...suggestion.files.map(f => `- \`${f}\``),
  ];

  if (suggestion.lineNumbers) {
    lines.push('', '## Specific Lines');
    for (const [file, lineNums] of Object.entries(suggestion.lineNumbers)) {
      lines.push(`- ${file}: lines ${lineNums.slice(0, 10).join(', ')}${lineNums.length > 10 ? '...' : ''}`);
    }
  }

  if (suggestion.cleanArchitecturePrinciple) {
    lines.push('', `## Clean Architecture Principle`);
    lines.push(suggestion.cleanArchitecturePrinciple);
  }

  lines.push('', '## Implementation Guidelines');
  lines.push('1. Read the affected files before making changes');
  lines.push('2. Maintain existing functionality');
  lines.push('3. Follow the project\'s code style');
  lines.push('4. Add comments where logic is complex');
  lines.push('5. Run type checks after changes: `npx tsc --noEmit`');

  if (suggestion.requirementTemplate) {
    lines.push('', '---', '', suggestion.requirementTemplate);
  }

  return lines.join('\n');
}
