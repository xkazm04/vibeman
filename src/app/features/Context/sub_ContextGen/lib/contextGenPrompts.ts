/**
 * Prompt builders for context generation
 */

/**
 * Helper to format file list
 */
function formatFileList(fileContents: Array<{ path: string; content: string }>): string {
  return fileContents.map((f) => `- ${f.path}`).join('\n');
}

/**
 * Helper to format file contents with delimiters
 */
function formatFileContents(fileContents: Array<{ path: string; content: string }>): string {
  return fileContents.map((f) => `\n=== ${f.path} ===\n${f.content}`).join('\n');
}

/**
 * Helper to build common file section
 */
function buildFileSection(fileContents: Array<{ path: string; content: string }>): string {
  return `Files:
${formatFileList(fileContents)}

File Contents:
${formatFileContents(fileContents)}`;
}

/**
 * Build comprehensive context documentation prompt
 */
export function buildContextDocumentationPrompt(params: {
  contextName: string;
  description: string;
  fileContents: Array<{ path: string; content: string }>;
}): string {
  const { contextName, description, fileContents } = params;

  return `You are an expert developer writing comprehensive documentation for a codebase context named "${contextName}".

Context Description: ${description}

Files included in this context:
${formatFileList(fileContents)}

File Contents:
${formatFileContents(fileContents)}

Create detailed documentation covering:
1. Overview and purpose of this context
2. Key components and their responsibilities
3. Important patterns and conventions used
4. Data flows and interactions between files
5. Critical implementation details
6. Usage examples where applicable

Write in clear markdown format suitable for developers who need to understand and work with this code.`;
}

/**
 * Build description generation prompt for LLM
 */
export function buildDescriptionGenerationPrompt(params: {
  fileContents: Array<{ path: string; content: string }>;
}): string {
  const { fileContents } = params;

  return `You are analyzing a collection of code files to generate a comprehensive context description in clean Markdown format.

${buildFileSection(fileContents)}

Generate a well-structured Markdown document with the following sections:

## Overview
Write a comprehensive overview (NO CHARACTER LIMIT - be thorough):
- What is the primary purpose/responsibility of these files?
- What problem do they solve or what feature do they implement?
- What are the main capabilities and features provided?

## Architecture
- What are the key architectural patterns or approaches used?
- How do the components interact with each other?
- What design decisions are evident in the code?

## File Structure
For EACH file, provide:
- **\`path/to/file.ts\`** - One-sentence description of its specific use case and responsibility

Format your response as JSON with a single "description" field containing the complete markdown:
{
  "description": "# Context Overview\\n\\n## Overview\\n...\\n\\n## Architecture\\n...\\n\\n## File Structure\\n...",
  "fileStructure": ""
}

IMPORTANT: 
- Return ONLY valid JSON with the description as a single string containing markdown
- Use \\n for line breaks within the JSON string
- Do NOT truncate the description
- Do NOT include the File Structure section in a separate field - it should be part of the markdown description
- Use proper markdown formatting (headings, bold, lists, etc.)`;
}
