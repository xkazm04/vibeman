import { generateWithLLM, DefaultProviderStorage } from '../../../lib/llm';
import { buildHighLevelDocsPrompt } from './lib/promptBuilder';

// Generate AI documentation review
export async function generateAIReview(projectName: string, analysis: any, projectId?: string, provider?: string, userVision?: string): Promise<string> {
  // Use the standardized high-level docs prompt
  const promptResult = buildHighLevelDocsPrompt(projectName, analysis, userVision);
  const prompt = promptResult.fullPrompt;
  const result = await generateWithLLM(prompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'ai_review',
    taskDescription: `Generate AI review for ${projectName}`,
    maxTokens: promptResult.llmConfig.maxTokens || 4000,
    temperature: promptResult.llmConfig.temperature || 0.7
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate AI review');
  }

  return result.response;
}