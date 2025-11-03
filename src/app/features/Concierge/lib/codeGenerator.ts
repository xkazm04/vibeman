/**
 * AI Code Generator for Business Requests
 * Translates natural language feature requests into code skeletons
 */

import { generateWithLLM } from '@/lib/llm';
import { GeneratedCode, GeneratedTest } from '@/app/db';
import { contextDb } from '@/app/db';

export interface CodeGenerationRequest {
  projectId: string;
  naturalLanguageDescription: string;
  projectPath: string;
  projectType?: 'nextjs' | 'fastapi' | 'other';
  existingContexts?: Array<{
    name: string;
    description: string;
    filePaths: string[];
  }>;
}

export interface CodeGenerationResult {
  analysis: string;
  generatedCode: GeneratedCode[];
  generatedTests: GeneratedTest[];
  documentation: string;
  confidence: number;
  estimatedEffort: string;
  suggestedContexts: string[];
}

/**
 * Interface for parsed code entry during validation
 */
interface ParsedCodeEntry {
  file_path: string;
  content: string;
  action: string;
  description: string;
}

/**
 * Build context information string for prompt
 */
function buildContextInfo(existingContexts?: Array<{ name: string; description: string; filePaths: string[] }>): string {
  if (!existingContexts || existingContexts.length === 0) {
    return 'No existing contexts available';
  }

  return existingContexts
    .map(ctx => `- ${ctx.name}: ${ctx.description || 'No description'}\n  Files: ${ctx.filePaths.join(', ')}`)
    .join('\n');
}

/**
 * Build system prompt for code generation
 */
function buildCodeGenerationSystemPrompt(
  projectType: string | undefined,
  projectPath: string,
  contextInfo: string
): string {
  return `You are an expert software engineer assistant that helps translate business requirements into code implementations.

Project Type: ${projectType || 'unknown'}
Project Path: ${projectPath}

Existing Code Contexts:
${contextInfo}

Your task is to analyze the feature request and generate:
1. A detailed analysis of what needs to be implemented
2. Code files that need to be created or modified
3. Test files for the new functionality
4. Documentation for the feature
5. Confidence score (0-100) indicating how well you understand the requirement
6. Estimated effort (trivial, small, medium, large, very large)
7. Suggested contexts (which existing code areas this touches)

IMPORTANT GUIDELINES:
- Follow the project's existing patterns and conventions
- Generate complete, production-ready code skeletons
- Include proper TypeScript types and interfaces
- Add comprehensive error handling
- Include JSDoc comments for functions
- For Next.js projects, use App Router conventions
- Use path aliases like @/ for imports
- Match the existing code style and architecture
- Generate realistic test cases
- Be conservative with confidence - only give high confidence if the requirement is crystal clear

Return your response as a valid JSON object with this structure:
{
  "analysis": "Detailed analysis of what needs to be implemented...",
  "generatedCode": [
    {
      "file_path": "src/path/to/file.ts",
      "content": "// Full file content here",
      "action": "create" | "modify" | "delete",
      "description": "Brief description of what this file does"
    }
  ],
  "generatedTests": [
    {
      "file_path": "src/path/to/file.test.ts",
      "content": "// Full test file content",
      "test_framework": "jest" | "vitest" | "other",
      "description": "What these tests cover"
    }
  ],
  "documentation": "Markdown documentation for the feature",
  "confidence": 85,
  "estimatedEffort": "medium",
  "suggestedContexts": ["authentication", "api-routes"]
}`;
}

/**
 * Generate code from natural language description
 */
export async function generateCodeFromDescription(
  request: CodeGenerationRequest
): Promise<CodeGenerationResult> {
  const { projectId, naturalLanguageDescription, projectPath, projectType, existingContexts } = request;

  const contextInfo = buildContextInfo(existingContexts);
  const systemPrompt = buildCodeGenerationSystemPrompt(projectType, projectPath, contextInfo);

  const userPrompt = `Feature Request:

${naturalLanguageDescription}

Please analyze this request and generate the necessary code, tests, and documentation.`;

  try {
    const response = await generateWithLLM({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 8000,
    });

    // Parse the JSON response
    const result = parseCodeGenerationResponse(response);
    return result;
  } catch (error) {
    // TODO: Integrate with proper logging service
    throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse and validate the LLM response
 */
function parseCodeGenerationResponse(response: string): CodeGenerationResult {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonString);

    // Validate required fields
    if (!parsed.analysis || typeof parsed.analysis !== 'string') {
      throw new Error('Missing or invalid analysis field');
    }

    if (!Array.isArray(parsed.generatedCode)) {
      throw new Error('Missing or invalid generatedCode field');
    }

    if (!Array.isArray(parsed.generatedTests)) {
      throw new Error('Missing or invalid generatedTests field');
    }

    // Validate each generated code file
    parsed.generatedCode.forEach((code: ParsedCodeEntry, index: number) => {
      if (!code.file_path || !code.content || !code.action || !code.description) {
        throw new Error(`Invalid code entry at index ${index}`);
      }
      if (!['create', 'modify', 'delete'].includes(code.action)) {
        throw new Error(`Invalid action at index ${index}: ${code.action}`);
      }
    });

    // Set defaults for optional fields
    return {
      analysis: parsed.analysis,
      generatedCode: parsed.generatedCode,
      generatedTests: parsed.generatedTests || [],
      documentation: parsed.documentation || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      estimatedEffort: parsed.estimatedEffort || 'medium',
      suggestedContexts: Array.isArray(parsed.suggestedContexts) ? parsed.suggestedContexts : [],
    };
  } catch (error) {
    // TODO: Integrate with proper logging service
    throw new Error(`Failed to parse code generation response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load project contexts for code generation
 */
export async function loadProjectContexts(projectId: string) {
  try {
    const contexts = contextDb.getByProjectId(projectId);
    return contexts.map(ctx => ({
      name: ctx.name,
      description: ctx.description || '',
      filePaths: JSON.parse(ctx.file_paths),
    }));
  } catch (error) {
    // TODO: Integrate with proper logging service
    return [];
  }
}

/**
 * Validate generated code for common issues
 */
export function validateGeneratedCode(code: GeneratedCode[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  code.forEach((file, index) => {
    // Check for absolute paths
    if (file.file_path.startsWith('/') || /^[A-Z]:\\/.test(file.file_path)) {
      errors.push(`File ${index}: Should use relative path, not absolute: ${file.file_path}`);
    }

    // Check for path alias usage in Next.js files
    if (file.file_path.includes('src/') && !file.content.includes('@/')) {
      warnings.push(`File ${index}: Consider using @/ path alias for imports`);
    }

    // Check for TypeScript types
    if (file.file_path.endsWith('.ts') || file.file_path.endsWith('.tsx')) {
      if (!file.content.includes('interface') && !file.content.includes('type') && file.action === 'create') {
        warnings.push(`File ${index}: TypeScript file might benefit from type definitions`);
      }
    }

    // Check for proper error handling
    if (file.content.includes('async') && !file.content.includes('try') && !file.content.includes('catch')) {
      warnings.push(`File ${index}: Async function missing try-catch error handling`);
    }

    // Check file path structure for Next.js
    if (file.file_path.includes('app/') && file.file_path.endsWith('page.tsx')) {
      if (!file.content.includes('export default')) {
        errors.push(`File ${index}: Next.js page component must have default export`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
