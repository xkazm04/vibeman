import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, content } = body;

    if (!fileId || content === undefined) {
      return NextResponse.json(
        { error: 'File ID and content are required' },
        { status: 400 }
      );
    }

    // Get the file record
    const file = codeGenerationDb.getGeneratedFileById(fileId);
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get the session to find project path
    const session = codeGenerationDb.getSession(file.session_id);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Apply the file changes
    try {
      // Use the project path stored in the session, or fetch it from projects API as fallback
      let projectPath = session.project_path || process.cwd();
      
      if (!session.project_path) {
        console.warn('No project path in session, fetching from projects API...');
        try {
          // Get all projects and find the matching one
          const projectsResponse = await fetch(`${request.nextUrl.origin}/api/projects`);
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            const project = projectsData.projects?.find((p: any) => p.id === session.project_id);
            if (project) {
              projectPath = project.path;
              console.log(`Found project for file application: ${project.name} at ${projectPath}`);
            } else {
              console.warn(`Project ${session.project_id} not found, using default path`);
            }
          }
        } catch (projectError) {
          console.warn('Could not fetch project details for file application:', projectError);
        }
      } else {
        console.log(`Using project path from session: ${projectPath}`);
      }
      
      const fullFilePath = join(projectPath, file.filepath);
      console.log(`Applying file changes to: ${fullFilePath}`);
      
      // Ensure directory exists
      const fileDir = dirname(fullFilePath);
      if (!existsSync(fileDir)) {
        await mkdir(fileDir, { recursive: true });
      }

      // Write the file
      await writeFile(fullFilePath, content, 'utf-8');
      
      console.log(`Successfully applied changes to file: ${file.filepath}`);
    } catch (fileError) {
      console.error('Failed to write file:', fileError);
      return NextResponse.json(
        { error: 'Failed to apply file changes' },
        { status: 500 }
      );
    }

    // Update file status to accepted
    const updatedFile = codeGenerationDb.updateGeneratedFile(fileId, {
      status: 'accepted'
    });

    if (!updatedFile) {
      return NextResponse.json(
        { error: 'Failed to update file status' },
        { status: 500 }
      );
    }

    // Check if all files in the session are completed
    const sessionFiles = codeGenerationDb.getGeneratedFilesBySession(file.session_id);
    const allCompleted = sessionFiles.every(f => f.status !== 'pending');
    
    if (allCompleted) {
      // Update session status to completed
      codeGenerationDb.updateSession(file.session_id, {
        status: 'completed'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'File accepted and applied successfully',
      file: updatedFile
    });

  } catch (error) {
    console.error('Failed to accept file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}