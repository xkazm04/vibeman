import { goalDb } from '@/app/db';
import { generateWithLLM, DefaultProviderStorage } from '../../../../lib/llm';
import { buildStrategicGoalsPrompt } from '../lib/promptBuilder';
import { readAIDocs } from './lib/utils';

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

  // Attach AI docs to analysis if available
  const analysisWithDocs = {
    ...analysis,
    aiDocs: aiDocsContent,
  };

  // Build prompt using standardized template
  const promptResult = buildStrategicGoalsPrompt(
    projectName,
    analysisWithDocs,
    existingGoals
  );

  // Generate goals using LLM with config from template
  const result = await generateWithLLM(promptResult.fullPrompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'strategic_goals',
    taskDescription: `Generate strategic goals for ${projectName}`,
    maxTokens: promptResult.llmConfig.maxTokens || 20000,
    temperature: promptResult.llmConfig.temperature || 0.8
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate goals');
  }

  return result.response;
}
