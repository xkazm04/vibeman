import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { eventDb, contextDb } from '@/app/db';
import { ollamaClient } from '@/lib/ollama';

export async function POST(request: NextRequest) {
  try {
    const { contextId, contextName, filePaths, projectPath, projectId } = await request.json();
    
    if (!contextId || !contextName || !filePaths || !projectPath || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Context ID, name, file paths, project path, and project ID are required' },
        { status: 400 }
      );
    }

    // Log the start of background processing
    const startEventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await eventDb.createEvent({
      id: startEventId,
      project_id: projectId,
      title: 'Context File Generation Started',
      description: `Started generating context file for "${contextName}" in background`,
      type: 'info',
      agent: 'system',
      message: `Processing ${filePaths.length} files`
    });

    // Process in background (don't await)
    processContextFileGeneration({
      contextId,
      contextName,
      filePaths,
      projectPath,
      projectId
    }).catch(error => {
      console.error('Background context file generation failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Context file generation started in background',
      eventId: startEventId
    });
  } catch (error) {
    console.error('Background context generation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processContextFileGeneration({
  contextId,
  contextName,
  filePaths,
  projectPath,
  projectId
}: {
  contextId: string;
  contextName: string;
  filePaths: string[];
  projectPath: string;
  projectId: string;
}) {
  try {
    // Generate context file content using LLM
    const prompt = `Generate comprehensive documentation for the context "${contextName}" based on the following files:\n\n${filePaths.map((fp: string) => `- ${fp}`).join('\n')}\n\nProvide a detailed explanation of what these files do, how they relate to each other, and their purpose in the project.`;

    const result = await ollamaClient.generate({
      prompt,
      model: 'llama3.1:8b',
      projectId,
      taskType: 'context_generation',
      taskDescription: `Generate context documentation for: ${contextName}`
    });

    if (!result.success || !result.response) {
      throw new Error('Failed to generate context file content');
    }

    // Create the context directory in the project
    const contextDir = join(projectPath, '.kiro', 'contexts');
    if (!existsSync(contextDir)) {
      await mkdir(contextDir, { recursive: true });
    }

    // Generate the file name
    const fileName = `${contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    const filePath = join(contextDir, fileName);

    // Create context file content
    const contextContent = `# ${contextName}

## Files
${filePaths.map((fp: string) => `- \`${fp}\``).join('\n')}

## Generated Context

${result.response}

---
*Generated on ${new Date().toISOString()}*
`;

    // Save the file
    await writeFile(filePath, contextContent, 'utf-8');

    // Make path relative to project root
    const relativePath = join('.kiro', 'contexts', fileName);

    // Update the context in the database to mark it as having a context file
    contextDb.updateContext(contextId, {
      has_context_file: true,
      context_file_path: relativePath
    });

    // Log success
    const successEventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await eventDb.createEvent({
      id: successEventId,
      project_id: projectId,
      title: 'Context File Generated Successfully',
      description: `Context file for "${contextName}" has been generated and saved`,
      type: 'success',
      agent: 'system',
      message: `File saved to: context/${fileName}`
    });

    console.log(`Context file generated successfully: ${filePath}`);
  } catch (error) {
    console.error('Background context file generation failed:', error);

    // Log error
    const errorEventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await eventDb.createEvent({
      id: errorEventId,
      project_id: projectId,
      title: 'Context File Generation Failed',
      description: `Failed to generate context file for "${contextName}"`,
      type: 'error',
      agent: 'system',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}