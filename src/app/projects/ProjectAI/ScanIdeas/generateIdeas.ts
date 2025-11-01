import { ideaDb, scanDb, goalDb } from '@/app/db';
import { contextDb } from '@/app/db';
import { generateWithLLM, DefaultProviderStorage } from '@/lib/llm';
import { readAIDocs } from '../ScanGoals/lib/utils';
import { buildIdeaGenerationPrompt } from './lib/promptBuilder';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { parseAIJsonResponse } from '@/lib/aiJsonParser';
import { v4 as uuidv4 } from 'uuid';


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
  effort?: number; // 1 = lowest, 3 = highest
  impact?: number; // 1 = lowest, 3 = highest
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

    console.log(`[generateIdeas] Starting idea generation for project: ${projectName}`);

    // Fetch valid goal IDs for validation later
    const validGoalIds = new Set(
      goalDb.getGoalsByProject(projectId).map(g => g.id)
    );
    console.log(`[generateIdeas] Found ${validGoalIds.size} valid goal IDs for validation`);

    // 1. Read AI documentation
    console.log('[generateIdeas] Reading AI documentation...');
    const aiDocsContent = await readAIDocs(projectPath);

    // Log AI documentation character length
    const aiDocsLength = aiDocsContent ? aiDocsContent.length : 0;
    console.log(`[generateIdeas] AI documentation loaded: ${aiDocsLength} characters`);

    // 2. Get context information if provided
    let context = null;
    let contextFilesCount = 0;
    if (contextId) {
      console.log(`[generateIdeas] Fetching context: ${contextId}`);
      context = contextDb.getContextById(contextId);

      // Count context files
      if (context && context.file_paths) {
        try {
          const filePaths = JSON.parse(context.file_paths);
          contextFilesCount = Array.isArray(filePaths) ? filePaths.length : 0;
        } catch (error) {
          console.error('[generateIdeas] Error parsing context file paths:', error);
        }
      }
      console.log(`[generateIdeas] Context files loaded: ${contextFilesCount} files`);
    }

    // 3. Get existing ideas to prevent duplicates
    console.log('[generateIdeas] Fetching existing ideas...');
    const existingIdeas = contextId
      ? ideaDb.getIdeasByContext(contextId)
      : ideaDb.getIdeasByProject(projectId);

    // 4. Build prompt using specialized prompt builder
    console.log(`[generateIdeas] Building prompt with scan type: ${scanType}...`);
    const promptResult = buildIdeaGenerationPrompt(scanType, {
      projectId,
      projectName,
      aiDocs: aiDocsContent,
      context,
      codeFiles: codebaseFiles,
      existingIdeas,
    });

    const prompt = promptResult.fullPrompt;
    console.log('[generateIdeas] Sending prompt to LLM...');
    console.log(`[generateIdeas] Prompt length: ${prompt.length} characters`);

    // 6. Generate ideas using LLM with config from standardized template
    const selectedProvider = (provider as any) || DefaultProviderStorage.getDefaultProvider();
    console.log(`[generateIdeas] Using provider: ${selectedProvider}`);

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

    console.log('[generateIdeas] LLM response received');

    // 7. Parse JSON response using robust parser
    let parsedIdeas: GeneratedIdea[];
    try {
      parsedIdeas = parseAIJsonResponse(result.response);

      // Validate that we got an array
      if (!Array.isArray(parsedIdeas)) {
        console.error('[generateIdeas] Parsed result is not an array:', typeof parsedIdeas);
        throw new Error('Expected JSON array, got ' + typeof parsedIdeas);
      }

      console.log(`[generateIdeas] Successfully parsed ${parsedIdeas.length} ideas`);

      // Log validation summary
      const validIdeas = parsedIdeas.filter(idea =>
        idea.title && typeof idea.title === 'string' && idea.title.trim() !== ''
      );
      const invalidIdeas = parsedIdeas.length - validIdeas.length;
      if (invalidIdeas > 0) {
        console.warn(`[generateIdeas] ${invalidIdeas} idea(s) will be skipped due to missing required fields`);
      }
    } catch (parseError) {
      console.error('[generateIdeas] Failed to parse LLM response:', parseError);
      console.error('[generateIdeas] Raw response:', result.response);
      throw new Error('Failed to parse LLM response as JSON: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
    }

    // 8. Create scan record with token tracking
    const scanId = uuidv4();
    const scanCategory = contextId ? 'context_analysis' : 'project_analysis';
    const scanSummary = `Generated ${parsedIdeas.length} ideas for ${projectName}${contextId ? ` - Context: ${contextId}` : ''}`;

    console.log('[generateIdeas] Creating scan record...');
    scanDb.createScan({
      id: scanId,
      project_id: projectId,
      scan_type: scanCategory,
      summary: scanSummary,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens
    });

    // 9. Save ideas to database
    console.log('[generateIdeas] Saving ideas to database...');
    const savedIdeas = parsedIdeas
      .filter(idea => {
        // Skip ideas without required fields
        if (!idea.title || typeof idea.title !== 'string' || idea.title.trim() === '') {
          console.warn('[generateIdeas] Skipping idea without valid title:', idea);
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
          : null;
        const reasoning = idea.reasoning && typeof idea.reasoning === 'string' && idea.reasoning.trim() !== ''
          ? idea.reasoning.trim()
          : null;

        // Validate and sanitize effort (must be 1-3 or null, default to 1 if invalid)
        const validateEffortImpact = (value: any): number | null => {
          if (value === null || value === undefined) {
            return 1; // Default to 1 if nothing provided
          }
          const num = typeof value === 'number' ? value : parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 3) {
            console.warn(`[generateIdeas] Invalid effort/impact value: ${value}, defaulting to 1`);
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
            console.warn(`[generateIdeas] Invalid goal_id "${idea.goal_id}" for idea "${title}". Setting to null.`);
            validatedGoalId = null;
          }
        }

        // Validate context_id if provided (might be passed incorrectly)
        let validatedContextId: string | null = contextId || null;
        if (validatedContextId && validatedContextId !== contextId) {
          console.warn(`[generateIdeas] Context ID mismatch detected, using provided contextId: ${contextId}`);
          validatedContextId = contextId || null;
        }

        return ideaDb.createIdea({
          id: ideaId,
          scan_id: scanId,
          project_id: projectId,
          context_id: validatedContextId,
          scan_type: scanType,
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

    console.log(`[generateIdeas] Successfully saved ${savedIdeas.length} ideas`);

    return {
      success: true,
      ideas: parsedIdeas,
      scanId
    };

  } catch (error) {
    console.error('[generateIdeas] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
