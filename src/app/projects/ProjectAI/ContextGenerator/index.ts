
import { GenerationResult, ProjectAnalysis } from './types';
import { createContextGenerationPrompt } from './ContextGeneratorPrompts';
import { ContextResponseParser } from './ContextGeneratorParser';
import { readTemplate, readExistingContexts, ensureContextDirectory } from './ContextGeneratorUtils';
import { generateWithLLM, DefaultProviderStorage } from '../../../../lib/llm';

export async function generateContexts(
  projectName: string,
  projectPath: string,
  analysis: ProjectAnalysis,
  projectId?: string,
  provider?: string
): Promise<GenerationResult> {
  try {
    console.log(`Starting context generation for project: ${projectName}`);
    console.log(`Project path: ${projectPath}`);

    // Read template files
    const contextTemplate = await readTemplate('context-template.md');
    const contextPrompt = await readTemplate('context-prompt.md');

    if (!contextTemplate || !contextPrompt) {
      throw new Error('Could not read context template files');
    }

    // Read existing context files
    const existingContexts = await readExistingContexts(projectPath);
    console.log(`Found ${existingContexts.length} existing context files`);

    // Create the prompt
    const prompt = createContextGenerationPrompt(
      projectName,
      analysis,
      existingContexts,
      contextTemplate,
      contextPrompt
    );

    console.log('Calling LLM API for context generation...');
    const result = await generateWithLLM(prompt, {
      provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
      projectId,
      taskType: 'context_generation',
      taskDescription: `Generate context files for ${projectName}`,
      maxTokens: 4000,
      temperature: 0.7
    });

    if (!result.success || !result.response) {
      throw new Error(result.error || 'Failed to generate contexts');
    }

    const response = result.response;
    console.log(`Received response from LLM (${response.length} characters)`);

    // Parse the response
    const parser = new ContextResponseParser();
    const parsedContexts = parser.parse(response);

    if (parsedContexts.length === 0) {
      console.log('No new context files to create/update');
      return {
        success: true,
        contexts: existingContexts
      };
    }

    // Ensure context directory exists
    await ensureContextDirectory(projectPath);

    // Prepare contexts for user review (don't save immediately)
    const preparedContexts: Array<{ filename: string; content: string }> = [];

    for (const context of parsedContexts) {
      // Clean the filename to prevent path issues
      const cleanFilename = context.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

      preparedContexts.push({
        filename: cleanFilename,
        content: context.content
      });

      console.log(`Prepared context for review: ${cleanFilename} (${context.content.length} characters, ${context.metadata.filePaths.length} files)`);
    }

    // Combine prepared contexts with existing ones that weren't updated
    const allContexts = [...preparedContexts];

    // Add existing contexts that weren't updated
    for (const existing of existingContexts) {
      const wasUpdated = preparedContexts.some(prepared => prepared.filename === existing.filename);
      if (!wasUpdated) {
        allContexts.push(existing);
      }
    }

    console.log(`Context generation completed. Total files prepared for review: ${allContexts.length}`);

    return {
      success: true,
      contexts: allContexts
    };

  } catch (error) {
    console.error('Failed to generate contexts:', error);
    return {
      success: false,
      contexts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export types for external use
export * from './types';