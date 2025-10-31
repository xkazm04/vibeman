import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { contextGroupQueries } from '@/lib/queries/contextQueries';

interface ContextMetadata {
  title: string;
  description: string;
  groupId: string | null;
  groupName: string | null;
}

/**
 * POST /api/contexts/generate-metadata
 *
 * Generates metadata for a context using LLM:
 * - Title (1-2 words)
 * - Description (detailed)
 * - Context group assignment (from existing groups)
 *
 * Request body:
 * {
 *   projectId: string;
 *   projectPath: string;
 *   filePaths: string[];      // Array of relative file paths
 *   provider?: string;         // LLM provider (default: 'ollama')
 *   model?: string;            // LLM model
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   metadata?: {
 *     title: string;
 *     description: string;
 *     groupId: string | null;
 *     groupName: string | null;
 *   };
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, filePaths, provider, model } = body;

    // Validate input
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

    // Fetch existing context groups for this project
    const contextGroups = await contextGroupQueries.getGroupsByProject(projectId);

    // Read file contents (limit to first 10 files, 400 chars per file)
    const fileContents: Array<{ path: string; content: string }> = [];
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
        console.error(`Error reading file ${filePath}:`, err);
        continue;
      }
    }

    if (fileContents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files could be read successfully' },
        { status: 400 }
      );
    }

    // Build prompt for LLM
    const parentFile = filePaths[0];
    const groupsDescription = contextGroups.length > 0
      ? contextGroups
          .map(g => `- "${g.name}" (ID: ${g.id})`)
          .join('\n')
      : 'No context groups exist yet.';

    const prompt = `You are analyzing a code context to generate metadata.

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

    // Generate metadata using LLM
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
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate metadata' },
        { status: 500 }
      );
    }

    // Parse LLM response
    let metadata: ContextMetadata;

    try {
      // Try to extract JSON from response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      metadata = {
        title: parsed.title || 'Untitled Context',
        description: parsed.description || 'No description available.',
        groupId: parsed.groupId || null,
        groupName: parsed.groupName || null,
      };

      // Validate groupId exists
      if (metadata.groupId) {
        const groupExists = contextGroups.some(g => g.id === metadata.groupId);
        if (!groupExists) {
          console.warn(`LLM selected non-existent group ID: ${metadata.groupId}`);
          metadata.groupId = null;
          metadata.groupName = null;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      console.error('Raw response:', result.response);

      // Fallback metadata
      metadata = {
        title: parentFile.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Untitled',
        description: `Context containing ${filePaths.length} files starting with ${parentFile}`,
        groupId: null,
        groupName: null,
      };
    }

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error('Error generating context metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate metadata',
      },
      { status: 500 }
    );
  }
}
