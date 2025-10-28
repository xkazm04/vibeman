/**
 * Project AI Prompt Builders
 *
 * Wrappers for building AI prompts using the standardized prompt system
 */

import { buildPrompt, SectionBuilders, formatIdea, formatGoal } from '@/lib/prompts';
import type { PromptBuildResult } from '@/lib/prompts';

/**
 * Build high-level documentation prompt
 */
export function buildHighLevelDocsPrompt(
  projectName: string,
  analysis: any,
  userVision?: string
): PromptBuildResult {
  // Build sections
  const aiDocsSection = analysis?.aiDocs
    ? `## Existing AI Documentation\n\n${analysis.aiDocs}`
    : '';

  const analysisSection = buildAnalysisDataSection(projectName, analysis);

  const userVisionSection = userVision
    ? `## Creator's Vision\n\nThe project creator has shared their vision:\n\n"${userVision}"\n\nUse this vision as the foundation for your analysis. Ensure the documentation reflects and expands upon this stated vision, connecting it to the actual implementation you observe in the codebase.`
    : '';

  return buildPrompt('high_level_docs', {
    values: {
      PROJECT_NAME: projectName,
      AI_DOCS_SECTION: aiDocsSection,
      ANALYSIS_SECTION: analysisSection,
      USER_VISION_SECTION: userVisionSection,
    },
  });
}

/**
 * Build strategic goals prompt
 */
export function buildStrategicGoalsPrompt(
  projectName: string,
  analysis: any,
  existingGoals?: any[]
): PromptBuildResult {
  const aiDocsSection = analysis?.aiDocs
    ? `## AI Documentation\n\n${analysis.aiDocs.slice(0, 5000)}`
    : '';

  const analysisSection = buildAnalysisDataSection(projectName, analysis);

  const existingGoalsSection = existingGoals && existingGoals.length > 0
    ? SectionBuilders.existingItems('Existing Goals', formatGoal, 'status')(existingGoals)
    : '';

  return buildPrompt('strategic_goals', {
    values: {
      PROJECT_NAME: projectName,
      AI_DOCS_SECTION: aiDocsSection,
      ANALYSIS_SECTION: analysisSection,
      EXISTING_GOALS_SECTION: existingGoalsSection,
    },
  });
}

/**
 * Build idea generation prompt
 */
export function buildIdeaGenerationPrompt(
  scanType: 'overall' | 'bug_hunter' | 'insight_synth',
  options: {
    projectName?: string;
    aiDocs?: string;
    context?: any;
    codeFiles?: Array<{ path: string; content: string }>;
    existingIdeas?: any[];
  }
): PromptBuildResult {
  const aiDocsSection = options.aiDocs
    ? `## AI Documentation\n\n${options.aiDocs.slice(0, 5000)}`
    : '';

  const contextSection = options.context
    ? buildContextDataSection(options.context)
    : '';

  const codeSection =
    options.codeFiles && options.codeFiles.length > 0
      ? SectionBuilders.files('Code Files')(options.codeFiles)
      : '';

  const existingIdeasSection =
    options.existingIdeas && options.existingIdeas.length > 0
      ? buildExistingIdeasSection(options.existingIdeas)
      : '';

  return buildPrompt('idea_generation', {
    values: {
      AI_DOCS_SECTION: aiDocsSection,
      CONTEXT_SECTION: contextSection,
      CODE_SECTION: codeSection,
      EXISTING_IDEAS_SECTION: existingIdeasSection,
    },
  }, scanType);
}

/**
 * Build context description prompt
 */
export function buildContextDescriptionPrompt(
  contextName: string,
  initialDescription: string,
  files: Array<{ path: string; content?: string }>
): PromptBuildResult {
  const fileList = files
    .map((f, idx) => `${idx + 1}. ${f.path}`)
    .join('\n');

  return buildPrompt('context_description', {
    values: {
      CONTEXT_NAME: contextName,
      INITIAL_DESCRIPTION: initialDescription,
      FILE_LIST: fileList,
    },
  });
}

/**
 * Build context documentation prompt
 */
export function buildContextDocumentationPrompt(
  contextName: string,
  description: string,
  files: Array<{ path: string; content: string }>
): PromptBuildResult {
  const fileContents = files
    .map((f) => `### ${f.path}\n\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  return buildPrompt('context_documentation', {
    values: {
      CONTEXT_NAME: contextName,
      DESCRIPTION: description,
      FILE_CONTENTS: fileContents,
    },
  });
}

/**
 * Helper: Build analysis data section
 */
function buildAnalysisDataSection(projectName: string, analysis: any): string {
  let section = `## Available Project Data\n\n**Project Name**: ${projectName}\n\n`;

  // Add technologies if available
  if (analysis?.stats?.technologies?.length > 0) {
    section += `**Technologies Detected**: ${analysis.stats.technologies.join(', ')}\n\n`;
  }

  // Add configuration files
  if (analysis?.codebase?.configFiles?.length > 0) {
    section += `**Configuration Files**:\n`;
    section += analysis.codebase.configFiles
      .slice(0, 5)
      .map((f: any) => {
        const truncatedContent = f.content
          ? f.content.slice(0, 1000)
          : 'Content not available';
        return `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${truncatedContent}\n\`\`\``;
      })
      .join('\n');
    section += '\n\n';
  }

  // Add documentation files
  if (analysis?.codebase?.documentationFiles?.length > 0) {
    section += `**Existing Documentation**:\n`;
    section += analysis.codebase.documentationFiles
      .map((f: any) => {
        const truncatedContent = f.content
          ? f.content.slice(0, 2000)
          : 'Content not available';
        return `\n### ${f.path}\n\`\`\`markdown\n${truncatedContent}\n\`\`\``;
      })
      .join('\n');
    section += '\n\n';
  }

  // Add feature contexts
  if (analysis?.codebase?.contexts?.length > 0) {
    section += `**Feature Contexts** (Organized codebase groups):\n\n`;
    section += `The codebase is organized into ${analysis.codebase.contexts.length} feature contexts. Each context represents a related group of functionality with its own documentation.\n\n`;

    analysis.codebase.contexts.forEach((ctx: any, index: number) => {
      section += `### Context ${index + 1}: ${ctx.name}\n\n`;

      if (ctx.description && ctx.description.trim()) {
        section += `**Description:**\n${ctx.description}\n\n`;
      } else {
        section += `**Description:** No description available\n\n`;
      }

      if (ctx.file_paths && ctx.file_paths.length > 0) {
        section += `**Files in this context (${ctx.file_paths.length}):**\n`;
        const filesToShow = ctx.file_paths.slice(0, 10);
        section += filesToShow.map((f: string) => `- ${f}`).join('\n');
        if (ctx.file_paths.length > 10) {
          section += `\n- ...and ${ctx.file_paths.length - 10} more files`;
        }
        section += '\n\n';
      }

      section += '---\n\n';
    });
  } else if (analysis?.codebase?.mainFiles?.length > 0) {
    section += `**Sample Code Files** (for architecture understanding):\n`;
    section += analysis.codebase.mainFiles
      .slice(0, 10)
      .map((f: any) => {
        const truncatedContent = f.content
          ? f.content.slice(0, 1200)
          : 'Content not available';
        return `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${truncatedContent}\n\`\`\``;
      })
      .join('\n');
    section += '\n\n';
  }

  // Add project structure
  if (analysis?.structure) {
    section += `**Project Structure Overview**:\n\`\`\`\n${JSON.stringify(
      analysis.structure,
      null,
      2
    ).slice(0, 1500)}\n\`\`\`\n\n`;
  }

  return section;
}

/**
 * Helper: Build context data section for idea generation
 */
function buildContextDataSection(context: any): string {
  if (!context) return '';

  let section = `## Context Information\n\n`;
  section += `**Name**: ${context.name}\n\n`;

  if (context.description) {
    section += `**Description**: ${context.description}\n\n`;
  }

  if (context.file_paths && context.file_paths.length > 0) {
    section += `**Files** (${context.file_paths.length}):\n`;
    section += context.file_paths.map((f: string) => `- ${f}`).join('\n');
    section += '\n\n';
  }

  return section;
}

/**
 * Helper: Build existing ideas section with grouping
 */
function buildExistingIdeasSection(ideas: any[]): string {
  const grouped: Record<string, any[]> = {
    pending: [],
    accepted: [],
    rejected: [],
    implemented: [],
  };

  ideas.forEach((idea) => {
    const status = idea.status || 'pending';
    if (grouped[status]) {
      grouped[status].push(idea);
    }
  });

  let section = `## Existing Ideas\n\n`;
  section += `**CRITICAL**: Do NOT suggest ideas similar to the ones listed below, especially rejected ones.\n\n`;

  // Pending ideas
  if (grouped.pending.length > 0) {
    section += `### Pending Ideas (${grouped.pending.length})\n`;
    section += `These are awaiting review. Avoid suggesting similar ideas.\n\n`;
    section += grouped.pending.map(formatIdea).join('\n');
    section += '\n\n';
  }

  // Accepted ideas
  if (grouped.accepted.length > 0) {
    section += `### Accepted Ideas (${grouped.accepted.length})\n`;
    section += `These have been approved. Do not duplicate.\n\n`;
    section += grouped.accepted.map(formatIdea).join('\n');
    section += '\n\n';
  }

  // Rejected ideas
  if (grouped.rejected.length > 0) {
    section += `### Rejected Ideas (${grouped.rejected.length})\n`;
    section += `**IMPORTANT**: These were explicitly rejected. Learn from them and avoid similar suggestions:\n\n`;
    section += grouped.rejected.map(formatIdea).join('\n');
    section += '\n\n';
  }

  // Implemented ideas
  if (grouped.implemented.length > 0) {
    section += `### Implemented Ideas (${grouped.implemented.length})\n`;
    section += `These are already done. No need to suggest again.\n\n`;
    section += grouped.implemented.map(formatIdea).join('\n');
    section += '\n\n';
  }

  return section;
}
