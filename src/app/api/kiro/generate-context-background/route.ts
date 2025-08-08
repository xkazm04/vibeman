import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { ContextFileGenerator } from '@/services/contextFileGenerator';
import { eventDb } from '@/lib/database';

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
    // Create a mock context object for the generator
    const mockContext = {
      id: contextId,
      name: contextName,
      filePaths: filePaths,
      description: `Generated context for ${contextName}`,
      hasContextFile: false,
      contextFilePath: null
    };

    // Generate the context file content
    const generatedContent = await ContextFileGenerator.generateContextFile({
      context: mockContext,
      onProgress: (status) => {
        console.log(`Background generation progress: ${status}`);
      }
    });

    // Create the context directory in the project
    const contextDir = join(projectPath, 'context');
    if (!existsSync(contextDir)) {
      await mkdir(contextDir, { recursive: true });
    }

    // Generate the file name
    const fileName = `${contextName.toLowerCase().replace(/\s+/g, '_')}_context.md`;
    const filePath = join(contextDir, fileName);

    // Save the file
    await writeFile(filePath, generatedContent, 'utf-8');

    // Update the context in the database to mark it as having a context file
    const { contextDb } = await import('@/lib/database');
    const relativePath = `context/${fileName}`;
    
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