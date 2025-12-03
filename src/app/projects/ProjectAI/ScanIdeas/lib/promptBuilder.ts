/**
 * Prompt builder facade for idea generation
 * Bridges between generateIdeas.ts and the new prompt system in ../prompts/
 */

import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { DbContext, DbIdea, goalDb } from '@/app/db';
import { buildPrompt, PromptOptions as NewPromptOptions } from '../prompts';
import { buildContextSection, buildExistingIdeasSection, buildGoalsSection } from './sectionBuilders';

interface BuildPromptOptions {
  projectId: string;
  projectName: string;
  aiDocs?: string | null; // Deprecated - no longer used, kept for backward compatibility
  context: DbContext | null;
  codeFiles: Array<{ path: string; content: string; type: string }>;
  existingIdeas: DbIdea[];
}

/**
 * Build idea generation prompt using the new prompt system
 */
export function buildIdeaGenerationPrompt(
  scanType: ScanType,
  options: BuildPromptOptions
): {
  fullPrompt: string;
  llmConfig: {
    maxTokens: number;
    temperature: number;
  };
} {
  const { projectId, projectName, context, existingIdeas } = options;

  // Fetch open goals for the project
  const allGoals = goalDb.getGoalsByProject(projectId);
  const openGoals = allGoals.filter(goal => goal.status === 'open');

  // Build sections
  // NOTE: AI documentation (CLAUDE.md/AI.md) is intentionally excluded to reduce prompt size
  const aiDocsSection = '';

  const contextSection = buildContextSection(context);
  const existingIdeasSection = buildExistingIdeasSection(existingIdeas);
  const goalsSection = buildGoalsSection(openGoals);

  // Create prompt options for new system
  const promptOptions: NewPromptOptions = {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection: '', // Removed - file paths already in context section
    hasContext: context !== null,
  };

  // Use the new prompt builder
  const fullPrompt = buildPrompt(scanType, promptOptions);

  // Append goals section to the prompt
  const finalPrompt = fullPrompt + '\n\n' + goalsSection;

  // LLM configuration
  const llmConfig = {
    maxTokens: 30000,
    temperature: 0.7,
  };

  return {
    fullPrompt: finalPrompt,
    llmConfig,
  };
}
