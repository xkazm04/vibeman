import { goalDb } from '../../../../lib/database';
import { generateWithLLM, DefaultProviderStorage } from '../../../../lib/llm';
import { buildAnalysisSection, buildExistingGoalsSection, buildAIDocsSection } from './lib/sectionBuilders';
import { readAIDocs, readProjectGoalsTemplate } from './lib/utils';
import { DEFAULT_GOALS_PROMPT, buildGoalsPrompt } from './lib/prompts';

/**
 * Generate strategic goals for a project based on analysis data
 * @param projectName - Name of the project
 * @param projectId - Unique identifier for the project
 * @param analysis - Project analysis data containing structure, stats, codebase info
 * @param projectPath - Optional path to the project root directory
 * @param provider - Optional LLM provider to use
 * @returns Generated goals as a string (JSON format)
 */
export async function generateGoals(
  projectName: string,
  projectId: string,
  analysis: any,
  projectPath?: string,
  provider?: string
): Promise<string> {
  // Get existing goals to prevent duplicates
  const existingGoals = goalDb.getGoalsByProject(projectId);

  // Try to read AI docs if project path is provided
  let aiDocsContent: string | null = null;
  if (projectPath) {
    aiDocsContent = await readAIDocs(projectPath);
  }

  // Try to read the project goals template
  let promptTemplate = await readProjectGoalsTemplate();

  // Fallback to default template if file not found
  if (!promptTemplate) {
    console.warn('Using fallback goals prompt template');
    promptTemplate = DEFAULT_GOALS_PROMPT;
  }

  // Build all sections
  const analysisSection = buildAnalysisSection(projectName, analysis);
  const existingGoalsSection = buildExistingGoalsSection(existingGoals);
  const aiDocsSection = buildAIDocsSection(aiDocsContent);

  // Build the final prompt
  const prompt = buildGoalsPrompt(
    promptTemplate,
    aiDocsSection,
    analysisSection,
    existingGoalsSection,
    !!aiDocsContent
  );

  // Generate goals using LLM
  const result = await generateWithLLM(prompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'strategic_goals',
    taskDescription: `Generate strategic goals for ${projectName}`,
    maxTokens: 20000,
    temperature: 0.8
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate goals');
  }

  return result.response;
}
