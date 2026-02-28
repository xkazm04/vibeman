/**
 * Prompt builder facade for idea generation
 * Bridges between generateIdeas.ts and the new prompt system in ../prompts/
 */

import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { DbContext, DbIdea, goalDb } from '@/app/db';
import { buildPrompt, PromptOptions as NewPromptOptions } from '../prompts';
import { buildContextSection, buildExistingIdeasSection, buildGoalsSection, buildBehavioralSection, buildProjectStructureSection } from './sectionBuilders';
import { buildFeedbackSection } from '@/lib/ideas/feedbackSynthesis';

/**
 * Per-scan-type temperature configuration.
 * Precision types (bug finding, security) use lower temps.
 * Creative/visionary types use higher temps.
 */
const SCAN_TYPE_TEMPERATURE: Partial<Record<ScanType, number>> = {
  // Precision types — lower temperature for accuracy
  bug_hunter: 0.5,
  security_protector: 0.45,
  ambiguity_guardian: 0.55,
  code_refactor: 0.5,
  // Balanced types — default 0.7
  // Creative/visionary types — higher temperature
  paradigm_shifter: 0.8,
  moonshot_architect: 0.85,
  business_visionary: 0.8,
  insight_synth: 0.75,
  delight_designer: 0.75,
  tech_innovator: 0.75,
};

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
  // Project structure is included via shared builder so all scan types get architectural conventions
  const aiDocsSection = buildProjectStructureSection();

  const contextSection = buildContextSection(context);
  const existingIdeasSection = buildExistingIdeasSection(existingIdeas);
  const goalsSection = buildGoalsSection(openGoals);
  const behavioralSection = buildBehavioralSection(projectId);

  // Build feedback section (lessons learned from user decisions)
  const feedbackSection = buildFeedbackSection(
    projectId,
    context?.id || undefined,
    scanType
  );

  // Create prompt options for new system
  // Goals and feedback are passed as options so they appear BEFORE the JSON output reminder
  const promptOptions: NewPromptOptions = {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection: '', // Removed - file paths already in context section
    hasContext: context !== null,
    behavioralSection,
    goalsSection,
    feedbackSection: feedbackSection || '',
  };

  // Use the new prompt builder (goals + feedback are now embedded inside the prompt, before JSON reminder)
  const finalPrompt = buildPrompt(scanType, promptOptions);

  // LLM configuration with per-scan-type temperature
  const llmConfig = {
    maxTokens: 30000,
    temperature: SCAN_TYPE_TEMPERATURE[scanType] ?? 0.7,
  };

  return {
    fullPrompt: finalPrompt,
    llmConfig,
  };
}
