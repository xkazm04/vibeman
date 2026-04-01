import { readFile } from 'fs/promises';

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

