import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { buildContextDescriptionPrompt } from '@/app/projects/ProjectAI/lib/promptBuilder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePaths, projectPath, provider, model } = body;

    // Validate input
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json(
        { error: 'File paths array is required' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Read file contents (limit to first 20 files, 500 chars per file for performance)
    const fileContents: Array<{ path: string; content: string }> = [];
    const maxFiles = 20;
    const maxCharsPerFile = 500;

    for (const filePath of filePaths.slice(0, maxFiles)) {
      try {
        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(projectPath, filePath);

        if (!fs.existsSync(fullPath)) {
          console.warn(`File not found: ${fullPath}`);
          continue;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        fileContents.push({
          path: filePath,
          content: content.substring(0, maxCharsPerFile),
        });
      } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
        // Continue with other files
      }
    }

    if (fileContents.length === 0) {
      return NextResponse.json(
        { error: 'No files could be read successfully' },
        { status: 400 }
      );
    }

    // Determine context name from file paths
    const contextName = body.contextName || 'Context';
    const initialDescription = body.initialDescription || '';

    // Build prompt using standardized template
    const promptResult = buildContextDescriptionPrompt(
      contextName,
      initialDescription,
      fileContents
    );

    // Generate description using LLM Manager
    // Default to ollama if no provider specified
    const selectedProvider: SupportedProvider = (provider as SupportedProvider) || 'ollama';

    const result = await llmManager.generate({
      prompt: promptResult.fullPrompt,
      provider: selectedProvider,
      model: model, // Use specified model or provider's default
      maxTokens: promptResult.llmConfig.maxTokens || 4000,
      temperature: promptResult.llmConfig.temperature || 0.7,
      taskType: 'context-description-generation',
      taskDescription: 'Generate context description from files',
    });

    if (!result.success || !result.response) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate description' },
        { status: 500 }
      );
    }

    // Parse and clean the response
    let cleanedDescription = result.response;
    let fileStructure = '';

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(result.response);

      if (parsed.description) {
        cleanedDescription = parsed.description;
        fileStructure = parsed.fileStructure || '';
      }
    } catch {
      // If JSON parsing fails, treat as raw markdown
      cleanedDescription = result.response;
    }

    // Aggressive post-processing to remove ALL JSON artifacts
    cleanedDescription = cleanedDescription
      // Remove everything before the first '#' (markdown heading)
      .replace(/^[^#]*(?=#)/s, '')
      // Remove any trailing JSON syntax: " } or "}
      .replace(/"\s*\}\s*$/g, '')
      .replace(/'\s*\}\s*$/g, '')
      // Remove standalone curly braces at end
      .replace(/\s*[\{\}]+\s*$/, '')
      // Remove any remaining quote wrappers at very end
      .replace(/["'`]+$/, '')
      // Convert escaped newlines to actual newlines
      .replace(/\\n/g, '\n')
      // Remove escaped quotes
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();

    // Clean up file structure similarly
    fileStructure = fileStructure
      .replace(/^["'`{}\[\]]+|["'`{}\[\]]+$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();

    return NextResponse.json({
      description: cleanedDescription,
      fileStructure: fileStructure,
    });
  } catch (error) {
    console.error('Error generating context description:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate description',
      },
      { status: 500 }
    );
  }
}
