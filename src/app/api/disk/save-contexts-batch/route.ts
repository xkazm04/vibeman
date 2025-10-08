import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { contextDb } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

interface ContextToSave {
  filename: string;
  content: string;
  title: string;
  filePaths: string[];
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { contexts, projectPath, projectId } = await request.json();
    
    if (!contexts || !Array.isArray(contexts) || !projectPath || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Contexts array, project path, and project ID are required' },
        { status: 400 }
      );
    }

    // Ensure context directory exists
    const contextDir = join(projectPath, 'context');
    if (!existsSync(contextDir)) {
      await mkdir(contextDir, { recursive: true });
    }

    const savedContexts: Array<{ filename: string; success: boolean; error?: string }> = [];

    for (const context of contexts as ContextToSave[]) {
      try {
        // Clean the filename to prevent path issues
        const cleanFilename = context.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = join(contextDir, cleanFilename);
        const relativeContextPath = `context/${cleanFilename}`;

        // Write the context file
        await writeFile(filePath, context.content, 'utf-8');

        // Create or update database entry
        try {
          // Check if context already exists in database
          const existingContext = contextDb.findContextByFilePath(projectId, relativeContextPath);

          if (existingContext) {
            // Update existing context
            contextDb.updateContext(existingContext.id, {
              name: context.title,
              description: context.description,
              file_paths: context.filePaths,
              has_context_file: true,
              context_file_path: relativeContextPath
            });
          } else {
            // Create new context entry
            const contextId = uuidv4();
            contextDb.createContextFromFile({
              id: contextId,
              project_id: projectId,
              name: context.title,
              description: context.description,
              file_paths: context.filePaths,
              context_file_path: relativeContextPath
            });
          }
        } catch (dbError) {
          console.error(`Failed to create/update database entry for ${cleanFilename}:`, dbError);
          // Continue with file creation even if database fails
        }

        savedContexts.push({
          filename: cleanFilename,
          success: true
        });

        console.log(`Successfully saved context: ${cleanFilename}`);
      } catch (error) {
        console.error(`Failed to save context ${context.filename}:`, error);
        savedContexts.push({
          filename: context.filename,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = savedContexts.filter(c => c.success).length;
    const failureCount = savedContexts.filter(c => !c.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      message: `Saved ${successCount} contexts successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results: savedContexts,
      successCount,
      failureCount
    });
  } catch (error) {
    console.error('Batch save contexts API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}