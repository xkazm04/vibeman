/**
 * Helper functions for test selectors
 */

/**
 * Extract filename without extension from filepath
 */
export function getFileName(filepath: string): string {
  if (!filepath || typeof filepath !== 'string') {
    return 'unknown';
  }
  try {
    const parts = filepath.split(/[/\\]/); // Handle both forward and backslashes
    const filename = parts[parts.length - 1] || 'unknown';
    return filename.replace(/\.[^/.]+$/, ''); // Remove extension
  } catch {
    return 'unknown';
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!text) {
    throw new Error('No text to copy');
  }
  await navigator.clipboard.writeText(text);
}
