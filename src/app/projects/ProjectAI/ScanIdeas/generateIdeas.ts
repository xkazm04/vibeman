import { ideaDb, scanDb, goalDb } from '@/app/db';
import { contextDb } from '@/app/db';
import { generateWithLLM, DefaultProviderStorage } from '@/lib/llm';
import { buildIdeaGenerationPrompt } from './lib/promptBuilder';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { parseAIJsonResponse } from '@/lib/aiJsonParser';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { signalCollector } from '@/lib/brain/signalCollector';


export interface IdeaGenerationOptions {
  projectId: string;
  projectName: string;
  projectPath: string;
  contextId?: string;
  provider?: string;
  scanType?: ScanType;
  codebaseFiles?: Array<{ path: string; content: string; type: string }>;
}

export interface GeneratedIdea {
  category?: string; // Accepts any string, IdeaCategory provides standard guideline values (defaults to 'general')
  title: string; // Required - ideas without title will be skipped
  description?: string; // Optional
  reasoning?: string; // Optional
  effort?: number; // 1-10 scale: 1 = trivial, 10 = massive
  impact?: number; // 1-10 scale: 1 = negligible, 10 = transformational
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
      codebaseFiles = []
    } = options;

    logger.info('Starting idea generation', { projectName });

    // Fetch valid goal IDs for validation later
    const validGoalIds = new Set(
      goalDb.getGoalsByProject(projectId).map(g => g.id)
    );
    logger.info('Found valid goal IDs for validation', { count: validGoalIds.size });

    // NOTE: AI documentation (CLAUDE.md/AI.md) is intentionally excluded from idea generation
    // to reduce prompt size and avoid excessive token usage

    // Get context information if provided
    let context = null;
    let contextFilesCount = 0;
    if (contextId) {
      logger.info('Fetching context', { contextId });
      context = contextDb.getContextById(contextId);

      // Count context files
      if (context && context.file_paths) {
        try {
          const filePaths = JSON.parse(context.file_paths);
          contextFilesCount = Array.isArray(filePaths) ? filePaths.length : 0;
        } catch (error) {
          logger.error('Error parsing context file paths', { error });
        }
      }
      logger.info('Context files loaded', { fileCount: contextFilesCount });
    }

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

    const prompt = promptResult.fullPrompt;
    logger.info('Sending prompt to LLM', { promptLength: prompt.length });

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
    let parsedIdeas: GeneratedIdea[];
    try {
      const parseResult = parseAIJsonResponse(result.response);

      // Validate that we got an array
      if (!Array.isArray(parseResult)) {
        logger.error('Parsed result is not an array', { type: typeof parseResult });
        throw new Error('Expected JSON array, got ' + typeof parseResult);
      }
      parsedIdeas = parseResult as GeneratedIdea[];

      logger.info('Successfully parsed ideas', { count: parsedIdeas.length });

      // Log validation summary
      const validIdeas = parsedIdeas.filter(idea =>
        idea.title && typeof idea.title === 'string' && idea.title.trim() !== ''
      );
      const invalidIdeas = parsedIdeas.length - validIdeas.length;
      if (invalidIdeas > 0) {
        logger.warn('Ideas will be skipped due to missing required fields', { count: invalidIdeas });
      }
    } catch (parseError) {
      logger.error('Failed to parse LLM response', { error: parseError, rawResponse: result.response });
      throw new Error('Failed to parse LLM response as JSON: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
    }

    // 8. Create scan record with token tracking
    const scanId = uuidv4();
    const scanCategory = contextId ? 'context_analysis' : 'project_analysis';
    const scanSummary = `Generated ${parsedIdeas.length} ideas for ${projectName}${contextId ? ` - Context: ${contextId}` : ''}`;

    logger.info('Creating scan record');
    scanDb.createScan({
      id: scanId,
      project_id: projectId,
      scan_type: scanCategory,
      summary: scanSummary,
      input_tokens: result.usage?.prompt_tokens,
      output_tokens: result.usage?.completion_tokens
    });

    // 9. Save ideas to database
    logger.info('Saving ideas to database');
    const savedIdeas = parsedIdeas
      .filter(idea => {
        // Skip ideas without required fields
        if (!idea.title || typeof idea.title !== 'string' || idea.title.trim() === '') {
          logger.warn('Skipping idea without valid title', { idea });
          return false;
        }
        return true;
      })
      .map(idea => {
        const ideaId = uuidv4();

        // Ensure all required fields have valid values with fallbacks
        const category = idea.category && typeof idea.category === 'string' && idea.category.trim() !== ''
          ? idea.category.trim()
          : 'general';

        const title = idea.title.trim();
        const description = idea.description && typeof idea.description === 'string' && idea.description.trim() !== ''
          ? idea.description.trim()
          : undefined;
        const reasoning = idea.reasoning && typeof idea.reasoning === 'string' && idea.reasoning.trim() !== ''
          ? idea.reasoning.trim()
          : undefined;

        // Validate and sanitize effort (must be 1-10 or null, default to 1 if invalid)
        const validateEffortImpact = (value: any): number | null => {
          if (value === null || value === undefined) {
            return 1; // Default to 1 if nothing provided
          }
          const num = typeof value === 'number' ? value : parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 10) {
            logger.warn('Invalid effort/impact value, defaulting to 1', { value });
            return 1; // Force to 1 if invalid
          }
          return num;
        };

        const effort = validateEffortImpact(idea.effort);
        const impact = validateEffortImpact(idea.impact);

        // Validate goal_id - ensure it exists in the database
        let validatedGoalId: string | null = null;
        if (idea.goal_id && typeof idea.goal_id === 'string') {
          if (validGoalIds.has(idea.goal_id)) {
            validatedGoalId = idea.goal_id;
          } else {
            logger.warn('Invalid goal_id for idea, setting to null', { goalId: idea.goal_id, title });
            validatedGoalId = null;
          }
        }

        // Validate context_id if provided (might be passed incorrectly)
        let validatedContextId: string | null = contextId || null;
        if (validatedContextId && validatedContextId !== contextId) {
          logger.warn('Context ID mismatch detected, using provided contextId', { contextId });
          validatedContextId = contextId || null;
        }

        return ideaDb.createIdea({
          id: ideaId,
          scan_id: scanId,
          project_id: projectId,
          context_id: validatedContextId,
          scan_type: effectiveScanType,
          category,
          title,
          description,
          reasoning,
          status: 'pending',
          effort,
          impact,
          goal_id: validatedGoalId
        });
      });

    logger.info('Successfully saved ideas', { count: savedIdeas.length });

    // Record Brain signal for idea generation activity
    try {
      signalCollector.recordApiFocus(projectId, {
        endpoint: '/api/ideas/generate',
        method: 'POST',
        callCount: 1,
        avgResponseTime: 0,
        errorRate: 0,
      }, contextId || undefined, context?.name || undefined);
    } catch {
      // Signal recording must never break idea generation
    }


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
