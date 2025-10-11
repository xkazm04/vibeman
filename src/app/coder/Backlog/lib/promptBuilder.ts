import { Context, ImpactedFile } from './backlogTypes';
import { readFileContent, readContextFile } from './fileOperations';
import { join } from 'path';

/**
 * Build context section for backlog task generation
 */
export async function buildContextSection(
  selectedContexts: Context[],
  projectPath: string
): Promise<string> {
  let contextSection = '## Selected Context Files\n\n';

  for (const context of selectedContexts) {
    contextSection += `### Context: ${context.name}\n`;
    contextSection += `**Description**: ${context.description || 'No description'}\n`;
    contextSection += `**Related Files**: ${context.filePaths.join(', ')}\n\n`;

    // Read context file if available
    if (context.contextFilePath) {
      const contextContent = await readContextFile(context.contextFilePath, projectPath);
      contextSection += `**Context Documentation**:\n\`\`\`markdown\n${contextContent.slice(0, 3000)}\n\`\`\`\n\n`;
    }

    // Read related files (first 3 to avoid overwhelming the prompt)
    const filesToRead = context.filePaths.slice(0, 3);
    for (const filePath of filesToRead) {
      const fullPath = join(projectPath, filePath);
      const fileContent = await readFileContent(fullPath);
      contextSection += `**File: ${filePath}**\n\`\`\`\n${fileContent.slice(0, 2000)}\n\`\`\`\n\n`;
    }
  }

  return contextSection;
}

/**
 * Build files section for backlog task generation
 */
export async function buildFilesSection(
  selectedFilePaths: string[],
  projectPath: string
): Promise<string> {
  let filesSection = '## Selected Files\n\n';

  for (const filePath of selectedFilePaths) {
    const fullPath = join(projectPath, filePath);
    const fileContent = await readFileContent(fullPath);
    filesSection += `### File: ${filePath}\n\`\`\`\n${fileContent.slice(0, 2500)}\n\`\`\`\n\n`;
  }

  return filesSection;
}

/**
 * Build existing tasks section to prevent duplicates
 */
export function buildExistingTasksSection(existingTasks: Array<{
  title: string;
  type: string;
  status: string;
  description: string;
}>): string {
  if (existingTasks.length === 0) {
    return '## Existing Tasks\n\nNo existing tasks.\n\n';
  }

  return `## Existing Tasks (DO NOT DUPLICATE)\n\n${existingTasks.map((task, index) =>
    `${index + 1}. **${task.title}** (${task.type}, ${task.status})\n   - ${task.description}\n`
  ).join('\n')}\n\n`;
}

/**
 * Build files context for coding task generation
 */
export async function buildCodingFilesContext(
  impactedFiles: ImpactedFile[],
  projectPath: string,
  readFileFromProject: (projectPath: string, filePath: string) => Promise<string>
): Promise<{
  filesContext: string;
  filesToCreate: ImpactedFile[];
  filesToUpdate: ImpactedFile[];
}> {
  let filesContext = '';
  const filesToCreate: ImpactedFile[] = [];
  const filesToUpdate: ImpactedFile[] = [];

  for (const file of impactedFiles) {
    // Clean the filepath
    const cleanFilepath = file.filepath.replace(/\|(create|update)$/, '').trim();
    const cleanFile = { ...file, filepath: cleanFilepath };

    if (file.type === 'create') {
      filesToCreate.push(cleanFile);
      filesContext += `\n### New File to Create: ${cleanFilepath}\n[This file will be created from scratch]\n\n`;
    } else {
      filesToUpdate.push(cleanFile);
      const content = await readFileFromProject(projectPath, cleanFilepath);
      
      if (content.startsWith('[File not found:')) {
        // File doesn't exist, treat as create
        filesToCreate.push({ ...cleanFile, type: 'create' });
        filesContext += `\n### New File to Create: ${cleanFilepath}\n[This file will be created from scratch]\n\n`;
      } else {
        filesContext += `\n### Current File to Update: ${cleanFilepath}\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\`\n\n`;
      }
    }
  }

  return { filesContext, filesToCreate, filesToUpdate };
}
