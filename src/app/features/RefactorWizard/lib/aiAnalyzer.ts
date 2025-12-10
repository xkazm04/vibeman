import { generateWithLLM } from '@/lib/llm';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { FileAnalysis, ProjectContext } from './types';
import { deduplicateRefactorOpportunities } from '@/lib/deduplication';
import { generateAiOpportunityId } from '@/lib/idGenerator';

type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama';

interface AIOpportunityData {
  title?: string;
  description?: string;
  category?: string;
  severity?: string;
  impact?: string;
  effort?: string;
  files?: string[];
  suggestedFix?: string;
  autoFixAvailable?: boolean;
  estimatedTime?: string;
}

interface ScanOptions {
  smartMode?: boolean;
  maxFiles?: number;
  projectContext?: ProjectContext;
}

/**
 * AI-powered code analysis with Smart Mode and Context Awareness
 */

/**
 * Builds analysis prompt for AI with project context
 */
function buildAnalysisPrompt(files: FileAnalysis[], context?: ProjectContext): string {
  const fileDescriptions = files.map(f =>
    `File: ${f.path} (${f.lines} lines)\n\`\`\`typescript\n${f.content.slice(0, 2000)}\n\`\`\``
  ).join('\n\n');

  const contextSection = context ? `
## Project Context
Type: ${context.projectType}
Stack: ${context.techStack.join(', ')}
Priorities: ${context.priorities.join(', ')}
Conventions: ${context.conventions.join(', ')}
` : '';

  return `Analyze the following TypeScript/React code files for refactoring opportunities.

${contextSection}

## Focus Areas
- **Architectural**: Tight coupling, poor separation of concerns, circular dependencies
- **Performance**: Unnecessary re-renders, expensive computations, large bundle sizes
- **Security**: XSS, injection, insecure data handling, exposed secrets
- **Code Quality**: High complexity, poor naming, anti-patterns, "any" types
- **Maintainability**: Duplication, spaghetti code, lack of comments/types

## Files to Analyze
${fileDescriptions}

## Output Format
Provide a JSON array of refactoring opportunities with this structure:
[
  {
    "title": "Concise, action-oriented title",
    "description": "Detailed explanation of the issue and why it matters",
    "category": "performance|maintainability|security|code-quality|duplication|architecture",
    "severity": "low|medium|high|critical",
    "impact": "Specific benefit of fixing this (e.g., 'Reduces bundle size by 10KB')",
    "effort": "small|medium|large|extra-large",
    "files": ["path/to/file1", "path/to/file2"],
    "suggestedFix": "Technical description of how to refactor",
    "autoFixAvailable": true/false,
    "estimatedTime": "e.g., '2 hours'"
  }
]

Return ONLY valid JSON, no additional text.`;
}

/**
 * Sanitizes JSON string to fix common LLM output issues
 */
function sanitizeJSON(jsonStr: string): string {
  let sanitized = jsonStr;

  // Replace smart quotes with regular quotes
  sanitized = sanitized.replace(/[\u201C\u201D]/g, '"');
  sanitized = sanitized.replace(/[\u2018\u2019]/g, "'");

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Fix unescaped newlines within strings
  sanitized = sanitized.replace(/"([^"]*?)(?<!\\)\n([^"]*?)"/g, (match, p1, p2) => {
    return `"${p1}\\n${p2}"`;
  });

  // Remove trailing commas before ] or }
  sanitized = sanitized.replace(/,(\s*[\]\}])/g, '$1');

  // Try to fix unescaped quotes within strings by looking for patterns
  // This handles cases like: "description": "Some text with "quotes" inside"
  sanitized = sanitized.replace(
    /:\s*"([^"]*)"([^",\}\]]*)"([^"]*?)"/g,
    (match, p1, p2, p3) => `: "${p1}\\"${p2}\\"${p3}"`
  );

  return sanitized;
}

/**
 * Attempts to parse JSON with multiple strategies
 */
function tryParseJSON(jsonStr: string): AIOpportunityData[] | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Sanitize and parse
  try {
    const sanitized = sanitizeJSON(jsonStr);
    return JSON.parse(sanitized);
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Extract individual objects and reconstruct array
  try {
    const objectMatches = jsonStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      const objects: AIOpportunityData[] = [];
      for (const objStr of objectMatches) {
        try {
          const sanitized = sanitizeJSON(objStr);
          const obj = JSON.parse(sanitized);
          if (obj && typeof obj === 'object') {
            objects.push(obj);
          }
        } catch {
          // Skip malformed objects
        }
      }
      if (objects.length > 0) {
        return objects;
      }
    }
  } catch {
    // All strategies failed
  }

  return null;
}

/**
 * Parses AI response into refactoring opportunities
 */
function parseAIResponse(response: string, files: FileAnalysis[]): RefactorOpportunity[] {
  try {
    // Validate input
    if (!response || typeof response !== 'string') {
      return [];
    }

    // Extract JSON from response
    let jsonText = response.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = tryParseJSON(jsonMatch[0]);

    if (!parsed) {
      console.error('Failed to parse AI response after all sanitization attempts');
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item, index: number) => ({
      id: generateAiOpportunityId(index),
      title: item.title || 'Untitled opportunity',
      description: item.description || '',
      category: (item.category as any) || 'code-quality',
      severity: (item.severity as any) || 'medium',
      impact: item.impact || '',
      effort: (item.effort as any) || 'medium',
      files: item.files || files.map(f => f.path),
      suggestedFix: item.suggestedFix,
      autoFixAvailable: item.autoFixAvailable || false,
      estimatedTime: item.estimatedTime,
    }));
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return [];
  }
}

/**
 * Create file batches for analysis
 */
function createFileBatches(files: FileAnalysis[], batchSize: number = 5): FileAnalysis[][] {
  const batches: FileAnalysis[][] = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Filter files for Smart Mode
 * Prioritizes files with:
 * - High complexity (heuristic: length > 200 lines)
 * - Recent changes (mocked for now, would need git info)
 * - "TODO" or "FIXME" comments
 */
function filterSmartFiles(files: FileAnalysis[]): FileAnalysis[] {
  console.log('[aiAnalyzer] Smart Mode: Filtering files...');
  return files.filter(f => {
    const isLong = f.lines > 200;
    const hasTodos = f.content.includes('TODO') || f.content.includes('FIXME');
    const hasAny = f.content.includes(': any') || f.content.includes('as any');

    return isLong || hasTodos || hasAny;
  });
}

/**
 * Uses AI to analyze code for deeper refactoring opportunities
 */
export async function analyzeWithAI(
  files: FileAnalysis[],
  provider: string = 'gemini',
  model: string = 'gemini-2.0-flash-exp',
  options: ScanOptions = {}
): Promise<RefactorOpportunity[]> {
  const opportunities: RefactorOpportunity[] = [];

  // Apply Smart Mode filtering if enabled
  let filesToAnalyze = files;
  if (options.smartMode) {
    const initialCount = files.length;
    filesToAnalyze = filterSmartFiles(files);
    console.log(`[aiAnalyzer] Smart Mode: Reduced ${initialCount} files to ${filesToAnalyze.length} high-priority files.`);
  }

  // Limit max files to prevent excessive token usage
  if (options.maxFiles && filesToAnalyze.length > options.maxFiles) {
    console.log(`[aiAnalyzer] Capping analysis at ${options.maxFiles} files.`);
    filesToAnalyze = filesToAnalyze.slice(0, options.maxFiles);
  }

  // Batch files for analysis (don't send too much at once)
  const batches = createFileBatches(filesToAnalyze, 5);
  console.log(`[aiAnalyzer] Processing ${batches.length} batches...`);

  for (const batch of batches) {
    const prompt = buildAnalysisPrompt(batch, options.projectContext);

    try {
      const response = await generateWithLLM(prompt, {
        provider: provider as LLMProvider,
        model,
        temperature: 0.3,
        maxTokens: 4000,
      });

      // Validate response before parsing
      if (!response || !response.response) {
        continue;
      }

      const aiOpportunities = parseAIResponse(response.response, batch);
      opportunities.push(...aiOpportunities);
    } catch (error) {
      console.error('[aiAnalyzer] Batch analysis failed:', error);
      // Continue with next batch instead of failing completely
    }
  }

  return deduplicateRefactorOpportunities(opportunities);
}

/**
 * Deduplicates opportunities based on category, files, and description
 * Re-exported from shared deduplication module for backward compatibility
 */
export { deduplicateRefactorOpportunities as deduplicateOpportunities } from '@/lib/deduplication';
