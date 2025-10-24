/**
 * API functions for file operations in ScanHigh module
 * Handles saving generated markdown content with proper validation and error handling
 */

export interface SaveFileRequest {
  folderPath: string;
  fileName: string;
  content: string;
  projectPath?: string;
}

export interface SaveFileResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Saves generated markdown content to the specified location
 * @param request Save file request parameters
 * @returns Promise with save operation result
 */
export async function saveGeneratedContent(request: SaveFileRequest): Promise<SaveFileResponse> {
  // Validate content before saving - ensure it's not empty or just whitespace
  if (!request.content || request.content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }

  // Sanitize filename to prevent path traversal and invalid characters
  const sanitizedFileName = sanitizeFileName(request.fileName);
  
  // Ensure the file has the correct extension
  const finalFileName = ensureMarkdownExtension(sanitizedFileName);

  try {
    const response = await fetch('/api/disk/save-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderPath: request.folderPath,
        fileName: finalFileName,
        content: request.content,
        projectPath: request.projectPath
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SaveFileResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to save file');
    }

    return result;
  } catch (error) {
    console.error('Failed to save generated content:', error);
    throw error;
  }
}

/**
 * Sanitizes filename to prevent security issues and ensure compatibility
 * @param fileName Original filename
 * @returns Sanitized filename
 */
function sanitizeFileName(fileName: string): string {
  // Remove or replace invalid characters
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid Windows/Unix characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Limit length
}

/**
 * Ensures the filename has a .md extension
 * @param fileName Filename to check
 * @returns Filename with .md extension
 */
function ensureMarkdownExtension(fileName: string): string {
  if (!fileName.toLowerCase().endsWith('.md')) {
    return `${fileName}.md`;
  }
  return fileName;
}

/**
 * Validates markdown content for common issues that might cause save failures
 * @param content Markdown content to validate
 * @returns Validation result
 */
export function validateMarkdownContent(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for minimum content length
  if (content.trim().length < 10) {
    errors.push('Content is too short to be meaningful');
  }

  // Check for potential encoding issues
  if (content.includes('\uFFFD')) {
    errors.push('Content contains invalid Unicode characters');
  }

  // Check for extremely long lines that might cause issues
  const lines = content.split('\n');
  const longLines = lines.filter(line => line.length > 10000);
  if (longLines.length > 0) {
    errors.push(`Content contains ${longLines.length} extremely long lines that might cause display issues`);
  }

  // Check for potential binary data
  const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F]/;
  if (binaryPattern.test(content)) {
    errors.push('Content appears to contain binary data');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Prepares content for saving by cleaning and validating it
 * @param content Raw content from the editor
 * @returns Cleaned and validated content ready for saving
 */
export function prepareContentForSave(content: string): string {
  // Normalize line endings
  let cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove excessive blank lines (more than 2 consecutive)
  cleanContent = cleanContent.replace(/\n{4,}/g, '\n\n\n');
  
  // Ensure file ends with a single newline
  cleanContent = cleanContent.replace(/\n*$/, '\n');
  
  // Remove trailing whitespace from lines
  cleanContent = cleanContent.replace(/[ \t]+$/gm, '');
  
  return cleanContent;
}