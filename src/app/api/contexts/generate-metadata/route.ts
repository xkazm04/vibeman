import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { contextGroupQueries } from '@/lib/queries/contextQueries';
import { withObservability } from '@/lib/observability/middleware';

interface ContextMetadata {
  title: string;
  description: string;
  groupId: string | null;
  groupName: string | null;
}

interface FileContent {
  path: string;
  content: string;
}

interface RequestBody {
  projectId: string;
  projectPath: string;
  filePaths: string[];
  provider?: string;
  model?: string;
}

/**
 * POST /api/contexts/generate-metadata
 *
 * Generates metadata for a context using LLM:
 * - Title (1-2 words)
 * - Description (detailed)
 * - Context group assignment (from existing groups)
 */
async function handlePost(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { projectId, projectPath, filePaths, provider, model } = body;

    // Validate input
    const validationError = validateInput(projectId, projectPath, filePaths);
    if (validationError) {
      return validationError;
    }

    // Fetch existing context groups for this project
    const contextGroups = await contextGroupQueries.getGroupsByProject(projectId);

    // Read file contents
    const fileContents = await readFileContents(projectPath, filePaths);

    if (fileContents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files could be read successfully' },
        { status: 400 }
      );
    }

    // Build prompt for LLM
    const prompt = buildMetadataPrompt(filePaths, fileContents, contextGroups);

    // Generate metadata using LLM
    const metadata = await generateMetadata(prompt, provider, model, contextGroups);

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate metadata',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate request input parameters
 */
function validateInput(
  projectId: string,
  projectPath: string,
  filePaths: string[]
): NextResponse | null {
  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'projectId is required' },
      { status: 400 }
    );
  }

  if (!projectPath) {
    return NextResponse.json(
      { success: false, error: 'projectPath is required' },
      { status: 400 }
    );
  }

  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return NextResponse.json(
      { success: false, error: 'filePaths array is required' },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Read file contents from disk
 */
async function readFileContents(
  projectPath: string,
  filePaths: string[]
): Promise<FileContent[]> {
  const fileContents: FileContent[] = [];
  const maxFiles = 10;
  const maxCharsPerFile = 400;

  for (const filePath of filePaths.slice(0, maxFiles)) {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(projectPath, filePath);

      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      fileContents.push({
        path: filePath,
        content: content.substring(0, maxCharsPerFile),
      });
    } catch (err) {
      // Continue with other files
      continue;
    }
  }

  return fileContents;
}

/**
 * Build prompt for LLM metadata generation
 */
function buildMetadataPrompt(
  filePaths: string[],
  fileContents: FileContent[],
  contextGroups: any[]
): string {
  const parentFile = filePaths[0];
  const groupsDescription = contextGroups.length > 0
    ? contextGroups
        .map(g => `- "${g.name}" (ID: ${g.id})`)
        .join('\n')
    : 'No context groups exist yet.';

  return `You are analyzing a code context to generate metadata.

**Context Information:**
- Parent file: ${parentFile}
- Total files in context: ${filePaths.length}
- File paths: ${filePaths.slice(0, 5).join(', ')}${filePaths.length > 5 ? '...' : ''}

**File Contents Preview:**
${fileContents.map(f => `
File: ${f.path}
\`\`\`
${f.content}
\`\`\`
`).join('\n')}

**Available Context Groups:**
${groupsDescription}

**Task:**
Generate metadata for this context in JSON format:

1. **title**: A concise 1-2 word name (e.g., "User Auth", "Dashboard", "Payment Flow")
2. **description**: A detailed 2-4 sentence description of what this context does, its purpose, and key components
3. **groupId**: The ID of the most appropriate context group from the list above, or null if none fit well
4. **groupName**: The name of the selected group, or null if none selected

**Response Format:**
\`\`\`json
{
  "title": "...",
  "description": "...",
  "groupId": "..." or null,
  "groupName": "..." or null
}
\`\`\`

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Generate metadata using LLM
 */
async function generateMetadata(
  prompt: string,
  provider: string | undefined,
  model: string | undefined,
  contextGroups: any[]
): Promise<ContextMetadata> {
  const selectedProvider: SupportedProvider = (provider as SupportedProvider) || 'ollama';

  const result = await llmManager.generate({
    prompt,
    provider: selectedProvider,
    model: model,
    maxTokens: 1000,
    temperature: 0.7,
    taskType: 'context-metadata-generation',
    taskDescription: 'Generate context metadata (title, description, group)',
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate metadata');
  }

  // Parse LLM response
  return parseMetadataResponse(result.response, contextGroups);
}

/**
 * Parse LLM response into ContextMetadata
 */
function parseMetadataResponse(
  response: string,
  contextGroups: any[]
): ContextMetadata {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const metadata: ContextMetadata = {
      title: parsed.title || 'Untitled Context',
      description: parsed.description || 'No description available.',
      groupId: parsed.groupId || null,
      groupName: parsed.groupName || null,
    };

    // Validate groupId exists
    if (metadata.groupId) {
      const groupExists = contextGroups.some(g => g.id === metadata.groupId);
      if (!groupExists) {
        metadata.groupId = null;
        metadata.groupName = null;
      }
    }

    return metadata;
  } catch (parseError) {
    // Fallback metadata
    return {
      title: 'Untitled',
      description: 'Context metadata generation failed',
      groupId: null,
      groupName: null,
    };
  }
}

export const POST = withObservability(handlePost, '/api/contexts/generate-metadata');
