import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Read file content safely with error handling
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`Could not read file ${filePath}:`, error);
    return `[Could not read file: ${filePath}]`;
  }
}

/**
 * Read file content from project path
 */
export async function readFileFromProject(projectPath: string, filePath: string): Promise<string> {
  try {
    const fullPath = join(projectPath, filePath);
    console.log(`Attempting to read file: ${fullPath}`);
    const content = await readFile(fullPath, 'utf-8');
    console.log(`Successfully read file: ${filePath} (${content.length} characters)`);
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Could not read file ${filePath} at ${join(projectPath, filePath)}:`, errorMessage);
    return `[File not found: ${filePath}]`;
  }
}

/**
 * Read context file content
 */
export async function readContextFile(contextFilePath: string, projectPath: string): Promise<string> {
  try {
    const fullPath = join(projectPath, contextFilePath);
    const content = await readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`Could not read context file ${contextFilePath}:`, error);
    return `[Context file not found: ${contextFilePath}]`;
  }
}
