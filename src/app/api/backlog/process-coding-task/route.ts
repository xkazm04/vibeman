import { NextRequest, NextResponse } from 'next/server';
import { generateCodingTask } from '../../../backlogComponents/generateCodingTask';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { backlogDb } from '../../../../lib/backlogDatabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, projectPath } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log(`Processing coding task: ${taskId}`);

    // Get the task from database
    const task = backlogDb.getBacklogItemById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Create a code generation session
    const sessionId = uuidv4();
    const session = codeGenerationDb.createSession({
      id: sessionId,
      task_id: taskId,
      project_id: task.project_id,
      project_path: projectPath,
      total_files: 0 // Will be updated after generation
    });

    // Update session status to in_progress
    codeGenerationDb.updateSession(sessionId, { status: 'in_progress' });

    try {
      // Generate the code
      const result = await generateCodingTask(taskId, projectPath || '');

      if (result.success && result.generatedFiles) {
        console.log(`Generated ${result.generatedFiles.length} files for task ${taskId}`);

        // Update session with total files count
        codeGenerationDb.updateSession(sessionId, {
          processed_files: result.generatedFiles.length
        });

        // Store each generated file
        for (const file of result.generatedFiles) {
          const fileId = uuidv4();
          console.log(`Storing generated file: ${file.filepath} (${file.action}, ${file.content.length} chars)`);
          codeGenerationDb.createGeneratedFile({
            id: fileId,
            session_id: sessionId,
            filepath: file.filepath,
            action: file.action,
            generated_content: file.content,
            original_content: file.originalContent
          });
          console.log(`Stored file with ID: ${fileId}`);
        }

        // Update session status to completed
        codeGenerationDb.updateSession(sessionId, {
          status: 'completed'
        });

        // Update task status to completed
        backlogDb.updateBacklogItem(taskId, { status: 'accepted' });

        return NextResponse.json({
          success: true,
          sessionId: sessionId,
          generatedFiles: result.generatedFiles.length,
          message: 'Code generation completed successfully'
        });

      } else {
        // Generation failed
        codeGenerationDb.updateSession(sessionId, {
          status: 'failed',
          error_message: result.error || 'Code generation failed'
        });

        // Revert task status
        backlogDb.updateBacklogItem(taskId, { status: 'accepted' });

        return NextResponse.json(
          { error: result.error || 'Code generation failed' },
          { status: 500 }
        );
      }

    } catch (generationError) {
      console.error('Code generation error:', generationError);

      // Update session status to failed
      codeGenerationDb.updateSession(sessionId, {
        status: 'failed',
        error_message: generationError instanceof Error ? generationError.message : 'Unknown error'
      });

      // Revert task status
      backlogDb.updateBacklogItem(taskId, { status: 'accepted' });

      throw generationError;
    }

  } catch (error) {
    console.error('Failed to process coding task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}