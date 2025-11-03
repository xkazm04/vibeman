/**
 * Unified Requirement File Builder
 * Creates Claude Code requirement files from ideas with proper structure
 */

import { DbIdea, DbGoal, DbContext } from '@/app/db';

export interface RequirementBuilderOptions {
  idea: DbIdea;
  goal?: DbGoal | null;
  context?: DbContext | null;
}

type EffortLevel = 'Low' | 'Medium' | 'High' | 'Unknown';
type ImpactLevel = 'Low' | 'Medium' | 'High' | 'Unknown';

/**
 * Get effort label from numeric value
 */
function getEffortLabel(effort: number | null): EffortLevel {
  if (effort === 1) return 'Low';
  if (effort === 2) return 'Medium';
  if (effort === 3) return 'High';
  return 'Unknown';
}

/**
 * Get impact label from numeric value
 */
function getImpactLabel(impact: number | null): ImpactLevel {
  if (impact === 1) return 'Low';
  if (impact === 2) return 'Medium';
  if (impact === 3) return 'High';
  return 'Unknown';
}

/**
 * Build metadata section
 */
function buildMetadataSection(idea: DbIdea, effortLabel: string, impactLabel: string): string {
  return `## Metadata
- **Category**: ${idea.category}
- **Effort**: ${effortLabel} (${idea.effort || 'N/A'}/3)
- **Impact**: ${impactLabel} (${idea.impact || 'N/A'}/3)
- **Scan Type**: ${idea.scan_type}
- **Generated**: ${new Date(idea.created_at).toLocaleString()}`;
}

/**
 * Build description section with reasoning
 */
function buildDescriptionSection(idea: DbIdea): string {
  let section = `## Description\n${idea.description || 'No description provided'}`;

  if (idea.reasoning) {
    section += `\n\n## Reasoning\n${idea.reasoning}`;
  }

  return section;
}

/**
 * Parse file paths from context
 */
function parseContextFilePaths(context: DbContext): string[] {
  const filePaths = typeof context.file_paths === 'string'
    ? JSON.parse(context.file_paths)
    : context.file_paths;

  return Array.isArray(filePaths) ? filePaths : [];
}

/**
 * Build context section if context exists
 * Provides architectural guidance and file references
 */
function buildContextSection(context: DbContext): string {
  const filePaths = parseContextFilePaths(context);
  const filesList = filePaths.map(fp => `- \`${fp}\``).join('\n');

  return `
## Context

**Note**: This section provides supporting architectural documentation and is NOT a hard requirement. Use it as guidance to understand existing code structure and maintain consistency.

### Context: ${context.name}

${context.description ? `**Description**: ${context.description}\n` : ''}**Related Files**:
${filesList}

**Post-Implementation**: After completing this requirement, evaluate if the context description or file paths need updates. Use the appropriate API/DB query to update the context if architectural changes were made.`;
}

/**
 * Check if idea is UI-related based on category or keywords
 */
function isUIRelatedIdea(idea: DbIdea): boolean {
  const uiKeywords = ['ui', 'interface', 'component', 'design'];

  return idea.category === 'ui' ||
    uiKeywords.some(keyword =>
      idea.title.toLowerCase().includes(keyword) ||
      idea.description?.toLowerCase().includes(keyword) ||
      false
    );
}

/**
 * Build skills section with recommendations
 */
function buildSkillsSection(idea: DbIdea): string {
  const skills: string[] = [];

  if (isUIRelatedIdea(idea)) {
    skills.push('- **compact-ui-design**: Use `.claude/skills/compact-ui-design.md` for high-quality UI design references and patterns');
  }

  if (skills.length === 0) {
    return `
## Recommended Skills

Use Claude Code skills as appropriate for implementation guidance. Check \`.claude/skills/\` directory for available skills.`;
  }

  return `
## Recommended Skills

${skills.join('\n')}`;
}

/**
 * Build notes section with goal reference
 */
function buildNotesSection(goal?: DbGoal | null): string {
  if (!goal) {
    return `
## Notes

This requirement was generated from an AI-evaluated project idea. No specific goal is associated with this idea.`;
  }

  return `
## Notes

This requirement was created to fulfill a goal: **${goal.title}**

${goal.description ? `**Goal Description**: ${goal.description}` : ''}`;
}

/**
 * Build requirement file content from an idea
 * Includes goal reference, context info, and skills recommendations
 */
export function buildRequirementFromIdea(options: RequirementBuilderOptions): string {
  const { idea, goal, context } = options;

  const effortLabel = getEffortLabel(idea.effort);
  const impactLabel = getImpactLabel(idea.impact);

  const metadataSection = buildMetadataSection(idea, effortLabel, impactLabel);
  const descriptionSection = buildDescriptionSection(idea);
  const contextSection = context ? buildContextSection(context) : '';
  const skillsSection = buildSkillsSection(idea);
  const notesSection = buildNotesSection(goal);

  return `# ${idea.title}

${metadataSection}

${descriptionSection}
${contextSection}
${skillsSection}
${notesSection}`;
}
