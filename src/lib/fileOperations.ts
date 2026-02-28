import { readFile } from 'fs/promises';
import { join } from 'path';

/** Discriminated union for fallible file reads */
export type FileResult<E = string> =
  | { ok: true; content: string }
  | { ok: false; error: E };

/**
 * Read file content safely with error handling
 */
export async function readFileContent(filePath: string): Promise<FileResult> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return { ok: true, content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Could not read file ${filePath}:`, message);
    return { ok: false, error: `Could not read file: ${filePath}` };
  }
}

/**
 * Read file content from project path
 */
export async function readFileFromProject(projectPath: string, filePath: string): Promise<FileResult> {
  try {
    const fullPath = join(projectPath, filePath);
    const content = await readFile(fullPath, 'utf-8');
    return { ok: true, content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Could not read file ${filePath} at ${join(projectPath, filePath)}:`, errorMessage);
    return { ok: false, error: `File not found: ${filePath}` };
  }
}

/**
 * Read context file content
 */
export async function readContextFile(contextFilePath: string, projectPath: string): Promise<FileResult> {
  try {
    const fullPath = join(projectPath, contextFilePath);
    const content = await readFile(fullPath, 'utf-8');
    return { ok: true, content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Could not read context file ${contextFilePath}:`, message);
    return { ok: false, error: `Context file not found: ${contextFilePath}` };
  }
}
