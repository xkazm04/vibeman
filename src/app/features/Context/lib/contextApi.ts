/**
 * Context API Operations
 * Handles all API calls related to context file management
 */

/**
 * Save context file to disk
 */
export async function saveContextFile(
  folderPath: string,
  fileName: string,
  content: string,
  projectPath: string
): Promise<void> {
  const fullProjectPath = `${projectPath}/${folderPath}/${fileName}`;

  const response = await fetch('/api/disk/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'write',
      filePath: fullProjectPath,
      content,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to save context file');
  }
}
