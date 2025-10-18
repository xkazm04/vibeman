import { backlogDb } from '../../../../lib/backlogDatabase';
import { ollamaClient } from '../../../../lib/ollama';
import { 
  BacklogTask, 
  CodingTaskResponse 
} from './backlogTypes';
import { readFileFromProject } from './fileOperations';
import { parseCodeResponse } from './codeParser';
import { buildCodingFilesContext } from './promptBuilder';
import { generateCodingTaskPrompt } from '../prompts/codingTaskPrompt';

// Generate code for a backlog task
export async function generateCodingTask(taskId: string, projectPath: string): Promise<CodingTaskResponse> {
  try {
    console.log(`Starting code generation for task: ${taskId}`);
    console.log(`Project path: ${projectPath}`);

    // Get the task from database
    const task = backlogDb.getBacklogItemById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const parsedTask: BacklogTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      steps: task.steps ? JSON.parse(task.steps) : [],
      impacted_files: task.impacted_files ? JSON.parse(task.impacted_files) : [],
      project_id: task.project_id
    };

    console.log(`Task: ${parsedTask.title}`);
    console.log(`Impacted files: ${parsedTask.impacted_files.length}`);

    // Build files context using helper
    const { filesContext, filesToCreate, filesToUpdate } = await buildCodingFilesContext(
      parsedTask.impacted_files,
      projectPath,
      readFileFromProject
    );

    // Build the coding prompt using helper
    const prompt = generateCodingTaskPrompt({
      title: parsedTask.title,
      description: parsedTask.description,
      steps: parsedTask.steps,
      impactedFiles: parsedTask.impacted_files,
      filesContext,
      filesToCreate,
      filesToUpdate
    });

    console.log('Calling Ollama API for code generation...');
    const result = await ollamaClient.generate({
      prompt,
      projectId: parsedTask.project_id,
      taskType: 'code_generation',
      taskDescription: `Generate code for task: ${parsedTask.title}`
    });

    if (!result.success || !result.response) {
      throw new Error(result.error || 'Failed to generate code');
    }

    const response = result.response;
    console.log(`Received response from Ollama (${response.length} characters)`);

    if (!response || response.trim().length === 0) {
      throw new Error('Received empty response from Ollama API');
    }

    // Parse the generated code using helper
    const generatedFiles = parseCodeResponse(response);

    if (generatedFiles.length === 0) {
      throw new Error('No code files were generated from the AI response');
    }

    // Read original content for files being updated
    for (const file of generatedFiles) {
      if (file.action === 'update') {
        file.originalContent = await readFileFromProject(projectPath, file.filepath);
      }
    }

    console.log(`Code generation completed. Generated ${generatedFiles.length} files`);

    return {
      success: true,
      generatedFiles
    };

  } catch (error) {
    console.error('Failed to generate code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
