/**
 * Section builder functions for idea generation prompts
 * Constructs different sections of the LLM prompt from various data sources
 */

import { DbIdea, DbContext } from '@/app/db';

/**
 * Build the code analysis section from codebase files
 */
export function buildCodeSection(
  files: Array<{ path: string; content: string; type: string }>
): string {
  if (files.length === 0) {
    return `## Code Files\n\nNo code files provided for analysis.\n\n`;
  }

  let section = `## Code Files for Analysis\n\n`;
  section += `Analyzing ${files.length} files from the codebase:\n\n`;

  files.forEach((file, index) => {
    const truncatedContent = file.content.length > 5000
      ? file.content.slice(0, 5000) + '\n... [truncated]'
      : file.content;

    section += `### File ${index + 1}: ${file.path}\n`;
    section += `\`\`\`${file.type || 'text'}\n${truncatedContent}\n\`\`\`\n\n`;
  });

  return section;
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
      console.error('Error parsing file paths:', error);
    }
  }

  return section;
}

/**
 * Build the existing ideas section for duplicate prevention and reflection
 */
export function buildExistingIdeasSection(existingIdeas: DbIdea[]): string {
  if (existingIdeas.length === 0) {
    return `## Existing Ideas\n\nNo existing ideas found. This is a fresh analysis.\n\n`;
  }

  let section = `## Existing Ideas (Avoid Duplicates & Learn from Rejections)\n\n`;
  section += `Found ${existingIdeas.length} existing ideas:\n\n`;

  // Group by status
  const pending = existingIdeas.filter(i => i.status === 'pending');
  const accepted = existingIdeas.filter(i => i.status === 'accepted');
  const rejected = existingIdeas.filter(i => i.status === 'rejected');
  const implemented = existingIdeas.filter(i => i.status === 'implemented');

  if (pending.length > 0) {
    section += `### Pending Ideas (${pending.length})\n`;
    pending.forEach((idea, index) => {
      section += `${index + 1}. **${idea.title}** (${idea.category})\n`;
      section += `   - ${idea.description || 'No description'}\n`;
    });
    section += '\n';
  }

  if (accepted.length > 0) {
    section += `### Accepted Ideas (${accepted.length})\n`;
    accepted.forEach((idea, index) => {
      section += `${index + 1}. **${idea.title}** (${idea.category})\n`;
      section += `   - ${idea.description || 'No description'}\n`;
      if (idea.user_feedback) {
        section += `   - User feedback: "${idea.user_feedback}"\n`;
      }
    });
    section += '\n';
  }

  if (rejected.length > 0) {
    section += `### Rejected Ideas (${rejected.length}) - Learn from these!\n`;
    section += `**IMPORTANT**: Understand WHY these were rejected to avoid similar suggestions.\n\n`;
    rejected.forEach((idea, index) => {
      section += `${index + 1}. **${idea.title}** (${idea.category}) - REJECTED\n`;
      section += `   - ${idea.description || 'No description'}\n`;
      section += `   - Reasoning: ${idea.reasoning || 'Not provided'}\n`;
      if (idea.user_feedback) {
        section += `   - **Rejection reason**: "${idea.user_feedback}"\n`;
      }
    });
    section += '\n';
  }

  if (implemented.length > 0) {
    section += `### Implemented Ideas (${implemented.length})\n`;
    implemented.forEach((idea, index) => {
      section += `${index + 1}. **${idea.title}** (${idea.category}) - DONE\n`;
    });
    section += '\n';
  }

  section += `**Critical Instructions**:\n`;
  section += `- DO NOT suggest ideas similar to pending or accepted ideas\n`;
  section += `- LEARN from rejected ideas - understand the rejection rationale\n`;
  section += `- DO NOT re-suggest rejected ideas unless you have a fundamentally different approach\n`;
  section += `- Consider building on top of implemented ideas if there's more value to add\n\n`;

  return section;
}
