import { ideaDb, scanDb } from '@/app/db';
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
  category: string; // Accepts any string, IdeaCategory provides standard guideline values
  title: string;
  description: string;
  reasoning: string;
  effort?: number; // 1 = lowest, 3 = highest
  impact?: number; // 1 = lowest, 3 = highest
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
      scanType = 'overall',
      codebaseFiles = []
    } = options;

    console.log(`[generateIdeas] Starting idea generation for project: ${projectName}`);

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
    const savedIdeas = parsedIdeas.map(idea => {
      const ideaId = uuidv4();
      return ideaDb.createIdea({
        id: ideaId,
        scan_id: scanId,
        project_id: projectId,
        context_id: contextId || null,
        scan_type: scanType,
        category: idea.category,
        title: idea.title,
        description: idea.description,
        reasoning: idea.reasoning,
        status: 'pending',
        effort: idea.effort || null,
        impact: idea.impact || null
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
