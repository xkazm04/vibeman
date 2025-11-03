import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { createErrorResponse, notFoundResponse } from '../../../../lib/api-helpers';

interface ProjectResponse {
  projects?: Array<{ id: string; path: string; name: string }>;
}

async function getProjectPath(
  request: NextRequest,
  session: { project_path?: string; project_id: string }
): Promise<string> {
  if (session.project_path) {
    return session.project_path;
  }

  // Fallback: fetch from projects API
  try {
    const projectsResponse = await fetch(`${request.nextUrl.origin}/api/projects`);
    if (projectsResponse.ok) {
      const projectsData: ProjectResponse = await projectsResponse.json();
      const project = projectsData.projects?.find((p) => p.id === session.project_id);
      if (project) {
        return project.path;
      }
    }
  } catch (projectError) {
    // Could not fetch project details
  }

  return process.cwd();
}

async function applyFileChanges(
  filePath: string,
  content: string
): Promise<void> {
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) {
    await mkdir(fileDir, { recursive: true });
  }
  await writeFile(filePath, content, 'utf-8');
}

async function updateSessionIfComplete(sessionId: string): Promise<void> {
  const sessionFiles = codeGenerationDb.getGeneratedFilesBySession(sessionId);
  const allCompleted = sessionFiles.every(f => f.status !== 'pending');

  if (allCompleted) {
    codeGenerationDb.updateSession(sessionId, {
      status: 'completed'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, content } = body;

    if (!fileId || content === undefined) {
      return createErrorResponse('File ID and content are required', 400);
    }

    // Get the file record
    const file = codeGenerationDb.getGeneratedFileById(fileId);
    if (!file) {
      return notFoundResponse('File');
    }

    // Get the session to find project path
    const session = codeGenerationDb.getSession(file.session_id);
    if (!session) {
      return notFoundResponse('Session');
    }

    // Apply the file changes
    try {
      const projectPath = await getProjectPath(request, session);
      const fullFilePath = join(projectPath, file.filepath);
      await applyFileChanges(fullFilePath, content);
    } catch (fileError) {
      return createErrorResponse('Failed to apply file changes', 500);
    }

    // Update file status to accepted
    const updatedFile = codeGenerationDb.updateGeneratedFile(fileId, {
      status: 'accepted'
    });

    if (!updatedFile) {
      return createErrorResponse('Failed to update file status', 500);
    }

    // Check if all files in the session are completed
    await updateSessionIfComplete(file.session_id);

    return NextResponse.json({
      success: true,
      message: 'File accepted and applied successfully',
      file: updatedFile
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}