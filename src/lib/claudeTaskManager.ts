import { exec } from 'child_process';
import { promisify } from 'util';
import { FileSystemInterface } from './fileSystemInterface';
import { ClaudeTask, DevelopmentRequirement } from '../types/development';

const execAsync = promisify(exec);

export class ClaudeTaskManager {
  constructor(
    private fileSystem: FileSystemInterface,
    private projectRoot: string
  ) {}

  async submitRequirement(requirement: DevelopmentRequirement): Promise<string> {
    // Create requirement file
    await this.fileSystem.createRequirement(requirement);
    
    // Create Claude task
    const task: ClaudeTask = {
        requirementId: requirement.id,
        projectPath: requirement.projectPath,
        prompt: this.generateClaudePrompt(requirement),
        context: requirement.files,
        outputPath: requirement.projectPath,
        status: 'queued',
        createdAt: new Date()
    };
    
    const taskPath = await this.fileSystem.createClaudeTask(task);

    // Let the file watcher handle execution
    return taskPath;
}

  private generateClaudePrompt(requirement: DevelopmentRequirement): string {
    return `# Development Task

Please implement the following requirement in the codebase:

**Title:** ${requirement.title}
**Priority:** ${requirement.priority}
**Complexity:** ${requirement.estimatedComplexity}/10

## Description
${requirement.description}

## Files to Focus On
${requirement.files.map(file => `- ${file}`).join('\n')}

## Instructions
1. Analyze the current codebase structure
2. Implement the requested changes following existing patterns
3. Ensure code quality and TypeScript compliance
4. Add appropriate error handling
5. Test the implementation
6. Update any relevant documentation

Please start by examining the codebase and then implement the changes step by step.
`;
  }

  private async triggerClaudeCode(taskPath: string): Promise<void> {
    try {
      // Option 1: Direct Claude Code execution
      const command = `cd "${this.projectRoot}" && claude -p "$(cat ${taskPath.replace(this.projectRoot, '.')})" --output-format json`;

      // Execute in background
      execAsync(command).then(() => {
        // Task triggered successfully
      }).catch(() => {
        // Task execution failed
      });

    } catch {
      // Failed to trigger Claude Code
    }
  }

  async checkTaskStatus(): Promise<ClaudeTask[]> {
    return this.fileSystem.getCompletedTasks();
  }

  async processCompletedTasks(): Promise<void> {
    const completedTasks = await this.checkTaskStatus();

    for (const task of completedTasks) {
      // Update requirement status in your database/state
      // Send notifications, update UI, etc.

      // Clean up task files
      await this.fileSystem.cleanupTask(task.requirementId);
    }
  }
}