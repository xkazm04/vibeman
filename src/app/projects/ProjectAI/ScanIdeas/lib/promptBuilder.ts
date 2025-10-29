/**
 * Prompt builder facade for idea generation
 * Bridges between generateIdeas.ts and the new prompt system in ../prompts/
 */

import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { DbContext, DbIdea } from '@/app/db';
import { buildPrompt, PromptOptions as NewPromptOptions } from '../prompts';
import { buildCodeSection, buildContextSection, buildExistingIdeasSection } from './sectionBuilders';

interface BuildPromptOptions {
  projectName: string;
  aiDocs: string | null;
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
  const { projectName, aiDocs, context, codeFiles, existingIdeas } = options;

  // Build sections
  const aiDocsSection = aiDocs
    ? `## Project Documentation\n\n${aiDocs}\n\n`
    : `## Project Documentation\n\nNo AI documentation found.\n\n`;

  const contextSection = buildContextSection(context);
  const existingIdeasSection = buildExistingIdeasSection(existingIdeas);
  const codeSection = buildCodeSection(codeFiles);

  // Create prompt options for new system
  const promptOptions: NewPromptOptions = {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection,
    hasContext: context !== null,
  };

  // Use the new prompt builder
  const fullPrompt = buildPrompt(scanType, promptOptions);

  // LLM configuration
  const llmConfig = {
    maxTokens: 30000,
    temperature: 0.7,
  };

  return {
    fullPrompt,
    llmConfig,
  };
}
