import { ideaDb, scanDb } from '@/app/db';
import { contextDb } from '@/lib/database';
import { generateWithLLM, DefaultProviderStorage } from '@/lib/llm';
import { buildAIDocsSection } from '../ScanGoals/lib/sectionBuilders';
import { readAIDocs } from '../ScanGoals/lib/utils';
import { IDEA_GENERATION_PROMPTS } from './lib/prompts';
import { buildSpecializedPrompt } from './lib/specializdPrompts';
import { buildCodeSection, buildContextSection, buildExistingIdeasSection } from './lib/sectionBuilders';
import { ScanType } from '@/app/ideas/components/ScanTypeSelector';
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
  category: 'functionality' | 'performance' | 'maintenance' | 'ui' | 'code_quality' | 'user_benefit';
  title: string;
  description: string;
  reasoning: string;
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
    const aiDocsSection = buildAIDocsSection(aiDocsContent);

    // Log AI documentation character length
    const aiDocsLength = aiDocsContent ? aiDocsContent.length : 0;
    console.log(`[generateIdeas] AI documentation loaded: ${aiDocsLength} characters`);

    // 2. Get context information if provided
    let contextSection = '';
    let contextFilesCount = 0;
    if (contextId) {
      console.log(`[generateIdeas] Fetching context: ${contextId}`);
      const context = contextDb.getContextById(contextId);
      contextSection = buildContextSection(context);

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
    const existingIdeasSection = buildExistingIdeasSection(existingIdeas);

    // 4. Build code section from provided files
    console.log(`[generateIdeas] Building code section with ${codebaseFiles.length} files...`);
    const codeSection = buildCodeSection(codebaseFiles);

    // 5. Build comprehensive prompt (use specialized prompt if scan type is not 'overall')
    const prompt = scanType === 'overall'
      ? IDEA_GENERATION_PROMPTS.buildMainPrompt({
          projectName,
          aiDocsSection,
          contextSection,
          existingIdeasSection,
          codeSection,
          hasContext: !!contextId
        })
      : buildSpecializedPrompt({
          scanType,
          projectName,
          aiDocsSection,
          contextSection,
          existingIdeasSection,
          codeSection,
          hasContext: !!contextId
        });

    console.log('[generateIdeas] Sending prompt to LLM...');
    console.log(`[generateIdeas] Prompt length: ${prompt.length} characters`);

    // 6. Generate ideas using LLM with high token limit
    const selectedProvider = (provider as any) || DefaultProviderStorage.getDefaultProvider();
    console.log(`[generateIdeas] Using provider: ${selectedProvider}`);

    const result = await generateWithLLM(prompt, {
      provider: selectedProvider,
      projectId,
      taskType: 'idea_generation',
      taskDescription: `Generate ideas for ${projectName}${contextId ? ` - Context: ${contextId}` : ''}`,
      maxTokens: 30000, // High limit for comprehensive analysis
      temperature: 0.7 // Balanced creativity
    });

    if (!result.success || !result.response) {
      throw new Error(result.error || 'Failed to generate ideas');
    }

    console.log('[generateIdeas] LLM response received');

    // 7. Parse JSON response
    let parsedIdeas: GeneratedIdea[];
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      const jsonMatch = result.response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      parsedIdeas = JSON.parse(jsonMatch[0]);
      console.log(`[generateIdeas] Parsed ${parsedIdeas.length} ideas`);
    } catch (parseError) {
      console.error('[generateIdeas] Failed to parse LLM response:', parseError);
      console.error('[generateIdeas] Raw response:', result.response);
      throw new Error('Failed to parse LLM response as JSON');
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
        status: 'pending'
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
