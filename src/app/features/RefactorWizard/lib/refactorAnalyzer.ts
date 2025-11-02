import { generateWithLLM } from '@/lib/llm';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface FileAnalysis {
  path: string;
  content: string;
  size: number;
  lines: number;
}

interface AnalysisResult {
  opportunities: RefactorOpportunity[];
  summary: {
    totalFiles: number;
    totalLines: number;
    issuesFound: number;
    categoryCounts: Record<string, number>;
  };
}

/**
 * Scans project files for analysis
 */
export async function scanProjectFiles(projectPath: string): Promise<FileAnalysis[]> {
  const files: FileAnalysis[] = [];

  // Patterns to scan
  const patterns = [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
  ];

  // Patterns to ignore
  const ignore = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.test.*',
    '**/*.spec.*',
  ];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore,
      absolute: true,
    });

    for (const filePath of matches) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const size = Buffer.byteLength(content, 'utf-8');

        files.push({
          path: path.relative(projectPath, filePath),
          content,
          size,
          lines,
        });
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }
  }

  return files;
}

/**
 * Analyzes code for common refactor opportunities
 */
export function analyzeCodePatterns(files: FileAnalysis[]): RefactorOpportunity[] {
  const opportunities: RefactorOpportunity[] = [];

  for (const file of files) {
    // Check for long files
    if (file.lines > 500) {
      opportunities.push({
        id: `long-file-${file.path}`,
        title: `Large file detected: ${file.path}`,
        description: `This file has ${file.lines} lines. Consider splitting it into smaller, more focused modules.`,
        category: 'maintainability',
        severity: file.lines > 1000 ? 'high' : 'medium',
        impact: 'Improves code organization and maintainability',
        effort: 'high',
        files: [file.path],
        autoFixAvailable: false,
        estimatedTime: '2-4 hours',
      });
    }

    // Check for duplicated code patterns
    const duplicatePatterns = detectDuplication(file.content);
    if (duplicatePatterns.length > 0) {
      opportunities.push({
        id: `duplication-${file.path}`,
        title: `Code duplication in ${file.path}`,
        description: `Found ${duplicatePatterns.length} duplicated code blocks that could be extracted into reusable functions.`,
        category: 'duplication',
        severity: 'medium',
        impact: 'Reduces code duplication and improves maintainability',
        effort: 'medium',
        files: [file.path],
        autoFixAvailable: true,
        estimatedTime: '1-2 hours',
      });
    }

    // Check for long functions
    const longFunctions = detectLongFunctions(file.content);
    if (longFunctions.length > 0) {
      opportunities.push({
        id: `long-functions-${file.path}`,
        title: `Long functions in ${file.path}`,
        description: `Found ${longFunctions.length} functions exceeding 50 lines. Consider breaking them into smaller functions.`,
        category: 'maintainability',
        severity: 'low',
        impact: 'Improves code readability and testability',
        effort: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: longFunctions },
        autoFixAvailable: true,
        estimatedTime: '1-3 hours',
      });
    }

    // Check for console.log statements
    const consoleStatements = detectConsoleStatements(file.content);
    if (consoleStatements.length > 0) {
      opportunities.push({
        id: `console-logs-${file.path}`,
        title: `Console statements in ${file.path}`,
        description: `Found ${consoleStatements.length} console.log statements that should be removed or replaced with proper logging.`,
        category: 'code-quality',
        severity: 'low',
        impact: 'Cleaner production code',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: consoleStatements },
        autoFixAvailable: true,
        estimatedTime: '15-30 minutes',
      });
    }

    // Check for any type usage
    const anyTypes = detectAnyTypes(file.content);
    if (anyTypes.length > 0) {
      opportunities.push({
        id: `any-types-${file.path}`,
        title: `'any' type usage in ${file.path}`,
        description: `Found ${anyTypes.length} uses of 'any' type. Consider using proper TypeScript types for better type safety.`,
        category: 'code-quality',
        severity: 'medium',
        impact: 'Improves type safety and prevents runtime errors',
        effort: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: anyTypes },
        autoFixAvailable: false,
        estimatedTime: '30-60 minutes',
      });
    }

    // Check for unused imports
    const unusedImports = detectUnusedImports(file.content);
    if (unusedImports.length > 0) {
      opportunities.push({
        id: `unused-imports-${file.path}`,
        title: `Unused imports in ${file.path}`,
        description: `Found ${unusedImports.length} potentially unused imports that could be removed.`,
        category: 'code-quality',
        severity: 'low',
        impact: 'Cleaner code and smaller bundle size',
        effort: 'low',
        files: [file.path],
        autoFixAvailable: true,
        estimatedTime: '10-15 minutes',
      });
    }
  }

  return opportunities;
}

/**
 * Uses AI to analyze code for deeper refactoring opportunities
 */
export async function analyzeWithAI(
  files: FileAnalysis[],
  provider: string = 'gemini',
  model: string = 'gemini-2.0-flash-exp'
): Promise<RefactorOpportunity[]> {
  const opportunities: RefactorOpportunity[] = [];

  // Batch files for analysis (don't send too much at once)
  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const prompt = buildAnalysisPrompt(batch);

    try {
      const response = await generateWithLLM({
        prompt,
        provider: provider as any,
        model,
        temperature: 0.3,
        maxTokens: 4000,
      });

      const aiOpportunities = parseAIResponse(response.text, batch);
      opportunities.push(...aiOpportunities);
    } catch (error) {
      console.error('AI analysis error:', error);
    }
  }

  return opportunities;
}

/**
 * Combines pattern-based and AI analysis
 */
export async function analyzeProject(
  projectPath: string,
  useAI: boolean = true,
  provider?: string,
  model?: string
): Promise<AnalysisResult> {
  // Scan files
  const files = await scanProjectFiles(projectPath);

  // Pattern-based analysis
  const patternOpportunities = analyzeCodePatterns(files);

  // AI-based analysis (if enabled)
  let aiOpportunities: RefactorOpportunity[] = [];
  if (useAI && files.length > 0) {
    aiOpportunities = await analyzeWithAI(files, provider, model);
  }

  // Combine and deduplicate
  const allOpportunities = [...patternOpportunities, ...aiOpportunities];
  const uniqueOpportunities = deduplicateOpportunities(allOpportunities);

  // Generate summary
  const categoryCounts: Record<string, number> = {};
  uniqueOpportunities.forEach(opp => {
    categoryCounts[opp.category] = (categoryCounts[opp.category] || 0) + 1;
  });

  return {
    opportunities: uniqueOpportunities,
    summary: {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      issuesFound: uniqueOpportunities.length,
      categoryCounts,
    },
  };
}

// Helper functions

function detectDuplication(content: string): number[] {
  const lines = content.split('\n');
  const patterns: Map<string, number[]> = new Map();
  const duplicates: number[] = [];

  // Simple pattern detection (3+ consecutive similar lines)
  for (let i = 0; i < lines.length - 2; i++) {
    const block = lines.slice(i, i + 3).join('\n').trim();
    if (block.length > 30) {
      if (patterns.has(block)) {
        duplicates.push(i);
      } else {
        patterns.set(block, [i]);
      }
    }
  }

  return duplicates;
}

function detectLongFunctions(content: string): number[] {
  const lines = content.split('\n');
  const longFunctions: number[] = [];
  let functionStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function start
    if (/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/.test(line)) {
      functionStart = i;
      braceCount = 0;
    }

    // Count braces
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    // Function end
    if (functionStart >= 0 && braceCount === 0 && /}/.test(line)) {
      const length = i - functionStart;
      if (length > 50) {
        longFunctions.push(functionStart);
      }
      functionStart = -1;
    }
  }

  return longFunctions;
}

function detectConsoleStatements(content: string): number[] {
  const lines = content.split('\n');
  const consoleLines: number[] = [];

  lines.forEach((line, index) => {
    if (/console\.(log|warn|error|info|debug)/.test(line)) {
      consoleLines.push(index + 1);
    }
  });

  return consoleLines;
}

function detectAnyTypes(content: string): number[] {
  const lines = content.split('\n');
  const anyLines: number[] = [];

  lines.forEach((line, index) => {
    if (/:\s*any\b/.test(line)) {
      anyLines.push(index + 1);
    }
  });

  return anyLines;
}

function detectUnusedImports(content: string): number[] {
  const lines = content.split('\n');
  const importLines: number[] = [];

  // Simple heuristic: detect import statements
  lines.forEach((line, index) => {
    if (/^import\s+.*from/.test(line.trim())) {
      // Extract imported names
      const match = line.match(/import\s+{?([^}]+)}?/);
      if (match) {
        const imports = match[1].split(',').map(i => i.trim());
        // Check if any import is not used in the file
        const hasUnused = imports.some(imp => {
          const usageRegex = new RegExp(`\\b${imp}\\b`);
          return content.split('\n').slice(index + 1).every(l => !usageRegex.test(l));
        });
        if (hasUnused) {
          importLines.push(index + 1);
        }
      }
    }
  });

  return importLines;
}

function buildAnalysisPrompt(files: FileAnalysis[]): string {
  const fileDescriptions = files.map(f =>
    `File: ${f.path} (${f.lines} lines)\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\``
  ).join('\n\n');

  return `Analyze the following TypeScript/React code files for refactoring opportunities.

Focus on:
- Architectural issues (tight coupling, poor separation of concerns)
- Performance bottlenecks (unnecessary re-renders, inefficient algorithms)
- Security vulnerabilities (XSS, injection, insecure patterns)
- Code quality issues (complexity, naming, patterns)
- Maintainability concerns (duplication, unclear logic)

${fileDescriptions}

Provide a JSON array of refactoring opportunities with this structure:
[
  {
    "title": "Brief title",
    "description": "Detailed description",
    "category": "performance|maintainability|security|code-quality|duplication|architecture",
    "severity": "low|medium|high|critical",
    "impact": "What improves",
    "effort": "low|medium|high",
    "files": ["path1", "path2"],
    "suggestedFix": "How to fix it",
    "autoFixAvailable": true/false,
    "estimatedTime": "time estimate"
  }
]

Return ONLY valid JSON, no additional text.`;
}

function parseAIResponse(response: string, files: FileAnalysis[]): RefactorOpportunity[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((item: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      title: item.title || 'Untitled opportunity',
      description: item.description || '',
      category: item.category || 'code-quality',
      severity: item.severity || 'medium',
      impact: item.impact || '',
      effort: item.effort || 'medium',
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

function deduplicateOpportunities(opportunities: RefactorOpportunity[]): RefactorOpportunity[] {
  const seen = new Set<string>();
  const unique: RefactorOpportunity[] = [];

  for (const opp of opportunities) {
    // Create a key based on category, files, and description
    const key = `${opp.category}-${opp.files.join(',')}-${opp.description.slice(0, 50)}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(opp);
    }
  }

  return unique;
}
