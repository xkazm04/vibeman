/**
 * Section builder functions for idea generation prompts
 * Constructs different sections of the LLM prompt from various data sources
 */

import { DbIdea, DbContext, DbGoal } from '@/app/db';
import { getBehavioralContext, formatBehavioralForPrompt } from '@/lib/brain/behavioralContext';
import { NEXTJS_STRUCTURE, type ProjectStructureTemplate } from '@/app/api/structure-scan/structureTemplates';

/**
 * Truncate long descriptions to save tokens
 */
function truncateDescription(description: string, maxLength: number = 150): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.slice(0, maxLength) + '...';
}

/**
 * Build the context information section
 */
export function buildContextSection(context: DbContext | null): string {
  if (!context) {
    return '';
  }

  let section = `## Context Information\n\n`;
  section += `**Context Name**: ${context.name}\n\n`;

  if (context.description) {
    section += `**Context Description**:\n${context.description}\n\n`;
  }

  if (context.file_paths) {
    try {
      const filePaths = JSON.parse(context.file_paths);
      if (filePaths && filePaths.length > 0) {
        section += `**Files in this Context** (${filePaths.length} files):\n`;
        filePaths.forEach((path: string) => {
          section += `- ${path}\n`;
        });
        section += '\n';
      }
    } catch (error) {
      // Silently handle JSON parsing errors - file paths may be malformed
    }
  }

  return section;
}

/**
 * Build the existing ideas section for duplicate prevention
 * OPTIMIZED: Only show pending and accepted ideas to reduce token usage
 * Rejected and implemented ideas are excluded to keep the focus on active work
 */
export function buildExistingIdeasSection(existingIdeas: DbIdea[]): string {
  // Filter to only pending and accepted ideas (remove rejected and implemented)
  const relevantIdeas = existingIdeas.filter(
    i => i.status === 'pending' || i.status === 'accepted'
  );

  if (relevantIdeas.length === 0) {
    return `## Existing Ideas\n\nNo pending or accepted ideas found. This is a fresh analysis.\n\n`;
  }

  let section = `## Existing Ideas (Avoid Duplicates)\n\n`;
  section += `Found ${relevantIdeas.length} active idea(s) (${existingIdeas.length} total, excluding rejected/implemented for brevity):\n\n`;

  // Group by status
  const pending = relevantIdeas.filter(i => i.status === 'pending');
  const accepted = relevantIdeas.filter(i => i.status === 'accepted');

  if (pending.length > 0) {
    section += `### Pending Ideas (${pending.length})\n`;
    pending.forEach((idea, index) => {
      section += `${index + 1}. **${idea.title}** (${idea.category})\n`;
      if (idea.description) {
        section += `   - ${truncateDescription(idea.description)}\n`;
      }
    });
    section += '\n';
  }

  if (accepted.length > 0) {
    section += `### Accepted Ideas (${accepted.length})\n`;
    accepted.forEach((idea, index) => {
      section += `${index + 1}. **${idea.title}** (${idea.category})\n`;
      if (idea.description) {
        section += `   - ${truncateDescription(idea.description)}\n`;
      }
    });
    section += '\n';
  }

  section += `**Critical Instructions**:\n`;
  section += `- DO NOT suggest ideas similar to the pending or accepted ideas listed above\n`;
  section += `- Focus on finding NEW opportunities not yet covered\n`;
  section += `- Consider different aspects, layers, or perspectives of the project\n\n`;

  return section;
}

/**
 * Build the project goals section for goal-idea matching
 */
export function buildGoalsSection(goals: DbGoal[]): string {
  if (goals.length === 0) {
    return `## Project Goals\n\nNo open goals found for this project.\n\n`;
  }

  let section = `## Project Goals (For Matching Ideas)\n\n`;
  section += `Found ${goals.length} open goal(s) for this project:\n\n`;

  goals.forEach((goal, index) => {
    section += `${index + 1}. **Goal ID**: ${goal.id}\n`;
    section += `   **Title**: ${goal.title}\n`;
    if (goal.description) {
      section += `   **Description**: ${goal.description}\n`;
    }
    section += `\n`;
  });

  section += `**Instructions for Goal Matching**:\n`;
  section += `- For each idea you generate, evaluate if it significantly relates to any of the goals above\n`;
  section += `- If there is a strong match based on the goal's title and description, include the goal's ID in the "goal_id" field\n`;
  section += `- If there is no clear match, leave the "goal_id" field empty or omit it\n`;
  section += `- Only match ideas to goals when there is a clear, meaningful connection\n\n`;

  return section;
}

/**
 * Build behavioral context section from Brain signals.
 * Injects user activity patterns, learned insights, and suggested priorities
 * so idea generation is informed by what the user has been working on.
 */
export function buildBehavioralSection(projectId: string): string {
  try {
    const ctx = getBehavioralContext(projectId);
    if (!ctx.hasData) return '';

    const formatted = formatBehavioralForPrompt(ctx);
    if (!formatted) return '';

    // Reframe the behavioral context for idea generation (not direction generation)
    return formatted.replace(
      'Apply these learnings when generating new directions:',
      'Apply these learnings when generating new ideas:'
    );
  } catch {
    return ''; // Never break idea generation if behavioral context fails
  }
}

/**
 * Build project structure section from template.
 * Provides all scan types with awareness of the project's architectural conventions.
 */
export function buildProjectStructureSection(template: ProjectStructureTemplate = NEXTJS_STRUCTURE): string {
  let section = `## Project Structure Standards\n\n`;
  section += `**${template.name}**\n`;
  section += `${template.description}\n\n`;

  const requiredRules = template.rules.filter(r => r.required);
  const contextRules = template.rules.filter(r => r.context);
  const antiPatterns = template.rules.filter(r => r.description.includes('AVOID'));
  const optionalRules = template.rules.filter(r => !r.required && !r.context && !r.description.includes('AVOID'));

  if (requiredRules.length > 0) {
    section += `### Core Structure (Required)\n\n`;
    for (const rule of requiredRules) {
      section += `- **\`${rule.pattern}\`**: ${rule.description}\n`;
      if (rule.examples && rule.examples.length > 0) {
        section += `  - Examples: ${rule.examples.map(e => `\`${e}\``).join(', ')}\n`;
      }
    }
    section += `\n`;
  }

  if (optionalRules.length > 0) {
    section += `### Recommended Structure\n\n`;
    for (const rule of optionalRules) {
      section += `- **\`${rule.pattern}\`**: ${rule.description}\n`;
      if (rule.examples && rule.examples.length > 0) {
        section += `  - Examples: ${rule.examples.map(e => `\`${e}\``).join(', ')}\n`;
      }
    }
    section += `\n`;
  }

  if (contextRules.length > 0) {
    section += `### Context Boundaries\n\n`;
    for (const rule of contextRules) {
      section += `- **\`${rule.pattern}\`**: ${rule.description}\n`;
      if (rule.examples && rule.examples.length > 0) {
        section += `  - Examples: ${rule.examples.map(e => `\`${e}\``).join(', ')}\n`;
      }
    }
    section += `\n`;
  }

  if (antiPatterns.length > 0) {
    section += `### Anti-Patterns to Avoid\n\n`;
    for (const rule of antiPatterns) {
      section += `- **\`${rule.pattern}\`**: ${rule.description}\n`;
    }
    section += `\n`;
  }

  return section;
}
