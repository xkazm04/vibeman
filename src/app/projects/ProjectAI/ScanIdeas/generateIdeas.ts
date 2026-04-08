import { ideaDb } from '@/app/db';
import { generateWithLLM, DefaultProviderStorage } from '@/lib/llm';
import { buildIdeaGenerationPrompt } from './lib/promptBuilder';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { logger } from '@/lib/logger';
import { IMPLEMENTATION_PROCEDURE_EXTENSION } from './prompts/schemaTemplate';
import { fetchValidGoalIds, fetchContextData } from './lib/contextFetcher';
import { parseAndValidateIdeas } from './lib/ideaParser';
import { createScanAndSaveIdeas } from './lib/ideaSaver';
import { recordIdeaGenerationSignal } from './lib/signalRecorder';


export interface IdeaGenerationOptions {
  projectId: string;
  projectName: string;
  projectPath: string;
  contextId?: string;
  provider?: string;
  scanType?: ScanType;
  detailed?: boolean;
  codebaseFiles?: Array<{ path: string; content: string; type: string }>;
}

export interface GeneratedIdea {
  category?: string; // Accepts any string, IdeaCategory provides standard guideline values (defaults to 'general')
  title: string; // Required - ideas without title will be skipped
  description?: string; // Optional
  reasoning?: string; // Optional
  procedure?: string[]; // Ordered implementation steps (detailed mode only)
  effort?: number; // 1-10 scale: 1 = trivial, 10 = massive
  impact?: number; // 1-10 scale: 1 = negligible, 10 = transformational
  risk?: number; // 1-10 scale: 1 = very safe, 10 = critical
  goal_id?: string; // Optional - related goal ID if there's a significant match
}

/**
 * Generate ideas for a project or specific context
 * Uses multi-dimensional analysis similar to advisor system
 */
export async function generateIdeas(options: IdeaGenerationOptions): Promise<{
  success: boolean;
  ideas?: GeneratedIdea[];
  scanId?: string;
  error?: string;
}> {
  try {
    const {
      projectId,
      projectName,
      projectPath,
      contextId,
      provider,
      scanType,
      detailed = false,
      codebaseFiles = []
    } = options;

    logger.info('Starting idea generation', { projectName });

    // Fetch valid goal IDs for validation later
    const validGoalIds = fetchValidGoalIds(projectId);

    // NOTE: AI documentation (CLAUDE.md/AI.md) is intentionally excluded from idea generation
    // to reduce prompt size and avoid excessive token usage

    // Get context information if provided
    const { context } = fetchContextData(contextId);

    // 3. Get existing ideas to prevent duplicates
    logger.info('Fetching existing ideas');
    const existingIdeas = contextId
      ? ideaDb.getIdeasByContext(contextId)
      : ideaDb.getIdeasByProject(projectId);

    // 4. Build prompt using specialized prompt builder
    const effectiveScanType: ScanType = scanType ?? 'zen_architect';
    logger.info('Building prompt', { scanType: effectiveScanType });
    const promptResult = buildIdeaGenerationPrompt(effectiveScanType, {
      projectId,
      projectName,
      aiDocs: null, // AI docs excluded to reduce prompt size
      context,
      codeFiles: codebaseFiles,
      existingIdeas,
    });

    const prompt = detailed
      ? promptResult.fullPrompt + IMPLEMENTATION_PROCEDURE_EXTENSION
      : promptResult.fullPrompt;
    logger.info('Sending prompt to LLM', { promptLength: prompt.length, detailed });

    // 6. Generate ideas using LLM with config from standardized template
    const selectedProvider = (provider as any) || DefaultProviderStorage.getDefaultProvider();
    logger.info('Using LLM provider', { provider: selectedProvider });

    const result = await generateWithLLM(prompt, {
      provider: selectedProvider,
      projectId,
      taskType: 'idea_generation',
      taskDescription: `Generate ideas for ${projectName}${contextId ? ` - Context: ${contextId}` : ''}`,
      maxTokens: promptResult.llmConfig.maxTokens || 30000,
      temperature: promptResult.llmConfig.temperature || 0.7
    });

    if (!result.success || !result.response) {
      throw new Error(result.error || 'Failed to generate ideas');
    }

    logger.info('LLM response received');

    // 7. Parse JSON response using robust parser
    const parsedIdeas = parseAndValidateIdeas(result.response);

    // Resolve actual provider/model from LLM response (may differ from selected due to fallback)
    const actualProvider = result.provider || selectedProvider;
    const actualModel = result.model || undefined;

    // 8. Create scan record and save ideas to database
    const { scanId } = createScanAndSaveIdeas({
      parsedIdeas,
      projectId,
      projectName,
      contextId,
      context,
      effectiveScanType,
      actualProvider,
      actualModel,
      validGoalIds,
      detailed,
      inputTokens: result.usage?.prompt_tokens,
      outputTokens: result.usage?.completion_tokens,
    });

    // Record Brain signal for idea generation activity
    recordIdeaGenerationSignal(projectId, contextId, context?.name || undefined);

    return {
      success: true,
      ideas: parsedIdeas,
      scanId
    };

  } catch (error) {
    logger.error('Idea generation error', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
