/**
 * Batch Disk Operations API
 *
 * POST /api/disk/batch
 * Handles batch context file save with DB registration.
 *
 * Body: { contexts, projectPath, projectId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { withAccessControl, verifyProjectExists } from '@/lib/api-helpers/accessControl';
import { validateProjectPath, validateFilename } from '@/lib/pathSecurity';
import { handleApiError } from '@/lib/api-errors';
import { contextDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

interface ContextToSave {
  filename: string;
  content: string;
  title: string;
  filePaths: string[];
  description?: string;
}

async function handlePost(request: NextRequest) {
  try {
    const { contexts, projectPath, projectId } = await request.json();

    if (!contexts || !Array.isArray(contexts) || !projectPath || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Contexts array, project path, and project ID are required' },
        { status: 400 }
      );
    }

    const pathError = validateProjectPath(projectPath);
    if (pathError) {
      return NextResponse.json(
        { success: false, error: pathError },
        { status: 403 }
      );
    }

    if (!verifyProjectExists(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Project not found', projectId },
        { status: 404 }
      );
    }

    const contextDir = join(projectPath, 'context');
    if (!existsSync(contextDir)) {
      await mkdir(contextDir, { recursive: true });
    }

    const savedContexts: Array<{ filename: string; success: boolean; error?: string }> = [];

    for (const context of contexts as ContextToSave[]) {
      try {
        const cleanFilename = context.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = join(contextDir, cleanFilename);
        const relativeContextPath = `context/${cleanFilename}`;

        await writeFile(filePath, context.content, 'utf-8');

        try {
          const existingContext = contextDb.findContextByFilePath(projectId, relativeContextPath);

          if (existingContext) {
            contextDb.updateContext(existingContext.id, {
              name: context.title,
              description: context.description,
              file_paths: context.filePaths,
              has_context_file: true,
              context_file_path: relativeContextPath
            });
          } else {
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
        } catch {
          // Continue with file creation even if database fails
        }

        savedContexts.push({ filename: cleanFilename, success: true });
      } catch {
        savedContexts.push({
          filename: context.filename,
          success: false,
          error: 'Failed to save context file'
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
    return handleApiError(error, 'Save contexts batch');
  }
}

export const POST = withAccessControl(handlePost, '/api/disk/batch', { skipProjectCheck: true, minRole: 'developer' });
