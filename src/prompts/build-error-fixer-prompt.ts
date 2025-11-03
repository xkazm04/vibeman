export const BUILD_ERROR_FIXER_PROMPT = `You are a build error fixing assistant. Your task is to analyze the provided code file and fix specific build errors while being extremely conservative to avoid breaking working code.

## Your Mission:
Fix ONLY the specific build errors provided. Do NOT make any other changes to the code.

## Critical Rules:
- **CONSERVATIVE APPROACH**: If you're unsure how to fix an error, leave it alone rather than risk breaking working code
- **MINIMAL CHANGES**: Make the smallest possible change to fix each error
- **PRESERVE FUNCTIONALITY**: Never change the logic or behavior of the code
- **EXACT FIXES ONLY**: Only fix the specific errors listed - ignore other potential issues
- **SAFETY FIRST**: If a fix might break something else, skip that error

## Error Types You Can Fix:
1. **TypeScript Errors**: Missing types, incorrect type assignments, missing imports
2. **ESLint Errors**: Code style issues, unused variables, missing semicolons
3. **Import Errors**: Missing imports, incorrect import paths
4. **Syntax Errors**: Missing brackets, semicolons, etc.

## Error Types to AVOID Fixing:
- Complex logic errors that require understanding business requirements
- Architectural changes
- Performance optimizations
- Refactoring suggestions
- Errors in external dependencies

## Response Format:
You MUST respond with a valid JSON object in this exact structure:

\`\`\`json
{
  "hasChanges": boolean,
  "fixedErrors": [
    {
      "line": number,
      "column": number,
      "originalError": "Original error message",
      "fixApplied": "Description of fix applied",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "skippedErrors": [
    {
      "line": number,
      "column": number,
      "originalError": "Original error message",
      "reason": "Why this error was skipped"
    }
  ],
  "updatedCode": "The complete updated file content here"
}
\`\`\`

## Build Errors to Fix:
{{buildErrors}}

## File Information:
File path: {{filePath}}
File content:
\`\`\`{{fileExtension}}
{{fileContent}}
\`\`\`

## Instructions:
1. Analyze each build error carefully
2. For each error, determine if you can fix it safely with high confidence
3. Apply minimal fixes only for errors you're certain about
4. Skip any error that might require complex changes or could break functionality
5. Provide the complete updated file content
6. List all fixes applied and errors skipped with reasons

Remember: It's better to skip an error than to introduce new bugs. Be conservative and only fix what you're absolutely certain about.`;

export interface BuildErrorForFix {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'typescript' | 'eslint' | 'webpack' | 'nextjs' | 'unknown';
  rule?: string;
}

export interface BuildErrorFixResult {
  hasChanges: boolean;
  fixedErrors: Array<{
    line: number;
    column: number;
    originalError: string;
    fixApplied: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  skippedErrors: Array<{
    line: number;
    column: number;
    originalError: string;
    reason: string;
  }>;
  updatedCode: string;
}

function getFileExtension(filePath: string): string {
  return filePath.split('.').pop() || '';
}

function formatBuildErrors(filePath: string, buildErrors: BuildErrorForFix[]): string {
  const relevantErrors = buildErrors.filter(error => error.file === filePath);

  if (relevantErrors.length === 0) {
    return 'No build errors found for this file.';
  }

  return relevantErrors
    .map(error => {
      const location = error.line && error.column
        ? `Line ${error.line}, Column ${error.column}`
        : 'Unknown location';
      const rule = error.rule ? ` (${error.rule})` : '';
      return `- ${location}: ${error.message}${rule} [${error.type}/${error.severity}]`;
    })
    .join('\n');
}

function replacePromptPlaceholders(
  template: string,
  filePath: string,
  fileContent: string,
  buildErrors: string
): string {
  return template
    .replace('{{buildErrors}}', buildErrors)
    .replace('{{filePath}}', filePath)
    .replace('{{fileContent}}', fileContent)
    .replace('{{fileExtension}}', getFileExtension(filePath));
}

export function createBuildErrorFixerPrompt(
  filePath: string,
  fileContent: string,
  buildErrors: BuildErrorForFix[]
): string {
  const formattedErrors = formatBuildErrors(filePath, buildErrors);
  return replacePromptPlaceholders(
    BUILD_ERROR_FIXER_PROMPT,
    filePath,
    fileContent,
    formattedErrors
  );
}