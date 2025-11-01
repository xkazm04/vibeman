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

/**
 * Build requirement file content from an idea
 * Includes goal reference, context info, and skills recommendations
 */
export function buildRequirementFromIdea(options: RequirementBuilderOptions): string {
  const { idea, goal, context } = options;

  const effortLabel = idea.effort === 1 ? 'Low' : idea.effort === 2 ? 'Medium' : idea.effort === 3 ? 'High' : 'Unknown';
  const impactLabel = idea.impact === 1 ? 'Low' : idea.impact === 2 ? 'Medium' : idea.impact === 3 ? 'High' : 'Unknown';

  // Build sections
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
 * Build context section if context exists
 * Provides architectural guidance and file references
 */
function buildContextSection(context: DbContext): string {
  const filePaths = typeof context.file_paths === 'string'
    ? JSON.parse(context.file_paths)
    : context.file_paths;

  const filesList = Array.isArray(filePaths)
    ? filePaths.map(fp => `- \`${fp}\``).join('\n')
    : '';

  return `
## Context

**Note**: This section provides supporting architectural documentation and is NOT a hard requirement. Use it as guidance to understand existing code structure and maintain consistency.

### Context: ${context.name}

${context.description ? `**Description**: ${context.description}\n` : ''}
**Related Files**:
${filesList}

**Post-Implementation**: After completing this requirement, evaluate if the context description or file paths need updates. Use the appropriate API/DB query to update the context if architectural changes were made.`;
}

/**
 * Build skills section with recommendations
 */
function buildSkillsSection(idea: DbIdea): string {
  const skills: string[] = [];

  // Check if UI-related based on category or keywords
  const isUIRelated =
    idea.category === 'ui' ||
    idea.title.toLowerCase().includes('ui') ||
    idea.title.toLowerCase().includes('interface') ||
    idea.title.toLowerCase().includes('component') ||
    idea.title.toLowerCase().includes('design') ||
    idea.description?.toLowerCase().includes('interface') ||
    idea.description?.toLowerCase().includes('component') ||
    idea.description?.toLowerCase().includes('design');

  if (isUIRelated) {
    skills.push('- **compact-ui-design**: Use `.claude/skills/compact-ui-design.md` for high-quality UI design references and patterns');
  }

  // If no specific skills, provide general guidance
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
