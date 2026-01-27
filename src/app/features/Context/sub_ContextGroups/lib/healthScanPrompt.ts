/**
 * Refactor Scan Prompt Builder
 *
 * Builds the prompt that Claude Code CLI will use for refactoring.
 * Defines what issues to look for, what to auto-fix, and the output format.
 * Also generates strategic Directions when larger opportunities are found.
 *
 * Uses shared baseScanPrompt infrastructure for consistent Direction generation.
 */

import {
  buildBaseScanPrompt,
  parseBaseScanSummary,
  categorizeFiles,
  detectPatterns,
  type BaseScanPromptOptions,
  type ScanSpecificContent,
  type ContextGroupInfo,
} from './baseScanPrompt';

export interface RefactorScanPromptOptions {
  groupName: string;
  groupId: string;
  projectId: string;
  projectPath: string;
  filePaths: string[];
  autoFix?: boolean;
  includeComplexityAnalysis?: boolean;
  apiBaseUrl?: string;
  contextGroupInfo?: ContextGroupInfo;
}

/**
 * Build the refactor scan prompt for Claude Code CLI
 * Uses shared base infrastructure for consistent Direction generation
 */
export function buildRefactorScanPrompt({
  groupName,
  groupId,
  projectId,
  projectPath,
  filePaths,
  autoFix = true,
  includeComplexityAnalysis = true,
  apiBaseUrl = 'http://localhost:3000',
  contextGroupInfo,
}: RefactorScanPromptOptions): string {
  // Build context group info from file paths if not provided
  const effectiveContextGroupInfo: ContextGroupInfo = contextGroupInfo || {
    filesByCategory: categorizeFiles(filePaths),
    detectedPatterns: detectPatterns(filePaths),
  };

  const baseOptions: BaseScanPromptOptions = {
    scanType: 'refactor',
    groupName,
    groupId,
    projectId,
    projectPath,
    filePaths,
    apiBaseUrl,
    contextGroupInfo: effectiveContextGroupInfo,
  };

  const immediateActionsSection = `
## CRITICAL: You MUST use the Edit tool to fix issues

For each file, you MUST:
1. Read the file using the Read tool
2. Identify issues
3. USE THE EDIT TOOL to fix each issue immediately
4. Move to the next file

### Issue Categories - FIX THESE NOW

${autoFix ? `
#### 1. Unused Imports → USE EDIT TOOL TO REMOVE
When you find an import that is never used in the file:
- Use the Edit tool to delete the entire import line
- If it's a named import like \`import { foo, bar } from 'x'\` and only foo is unused, edit to \`import { bar } from 'x'\`

**Example fix:**
\`\`\`
OLD: import { useState, useEffect, useMemo } from 'react';
// If useMemo is never used in the file
NEW: import { useState, useEffect } from 'react';
\`\`\`

#### 2. Console Statements → USE EDIT TOOL TO REMOVE
When you find console.log or console.warn:
- Use the Edit tool to delete the entire console statement
- KEEP console.error (those are intentional)
- KEEP console inside catch blocks

**Example fix:**
\`\`\`
OLD:
console.log('Debug:', data);
doSomething(data);

NEW:
doSomething(data);
\`\`\`

#### 3. 'any' Types → USE EDIT TOOL TO REPLACE
When you find explicit \`: any\` type annotations:
- Infer the correct type from usage context
- Use the Edit tool to replace with the proper type
- If you cannot determine the type, leave it as any

**Example fix:**
\`\`\`
OLD: const [items, setItems] = useState<any[]>([]);
// If items are used like items.map(item => item.name)
NEW: const [items, setItems] = useState<{ name: string }[]>([]);
\`\`\`
` : `
**AUTO-FIX IS DISABLED** - Only analyze and report issues.
`}

${includeComplexityAnalysis ? `
#### 4. Long Functions (REPORT ONLY - do not fix)
- Note functions longer than 50 lines for the summary

#### 5. High Complexity (REPORT ONLY - do not fix)
- Note deeply nested code (>4 levels) for the summary

#### 6. Code Duplication (REPORT ONLY - do not fix)
- Note similar code blocks for the summary
` : ''}

### Execution Flow

1. **For each file in the list:**
   - Read the file
   - Scan for issues
   - FIX EACH ISSUE IMMEDIATELY using the Edit tool
   - Count what you found and fixed

2. **Track your progress:**
   - Count issues found per category
   - Count issues fixed per category
   - Note any that couldn't be safely fixed

3. **After all files are processed:**
   - Generate strategic Directions if opportunities found
   - Output the final JSON summary`;

  const content: ScanSpecificContent = {
    title: 'Refactor Scan',
    missionPart1: 'Immediate Fixes: Auto-fix safe issues (unused imports, console logs, obvious any types)',
    missionPart2: 'Strategic Directions: Identify larger opportunities worthy of dedicated Claude Code sessions',
    immediateActionsSection,
    directionCategories: [
      { name: 'Architectural Patterns', description: 'Opportunities to introduce better abstractions, design patterns, or separation of concerns' },
      { name: 'Code Consolidation', description: 'Similar logic across files that could be unified into shared utilities or hooks' },
      { name: 'Type Safety', description: 'Areas where better TypeScript types would prevent bugs and improve DX' },
      { name: 'Error Handling', description: 'Missing or inconsistent error handling that needs systematic improvement' },
      { name: 'Testing Opportunities', description: 'Complex logic that lacks tests and would benefit from coverage' },
      { name: 'Performance Architecture', description: 'Structural changes needed for better performance (not micro-optimizations)' },
    ],
    excellentDirections: [
      'Implement comprehensive error boundary system with fallback UI and error reporting',
      'Extract shared validation logic into a centralized validation service',
      'Build type-safe API client with automatic retry and caching',
      'Create unified state management pattern for related components',
    ],
    badDirections: [
      'Add loading spinner (too small)',
      'Improve performance (too vague)',
      'Fix the bug (not strategic)',
      'Clean up code (not actionable)',
    ],
    whenToGenerateCriteria: [
      'A pattern that repeats across 3+ files in ways that could be abstracted',
      'Missing architectural layer that would improve maintainability',
      'Complex logic that would benefit from systematic refactoring',
      'Opportunity to introduce a proven pattern (factory, strategy, observer, etc.)',
      'Technical debt that requires dedicated attention to resolve properly',
    ],
    maxDirections: '0-3',
    directionMarkdownSections: `## Vision
What this improvement achieves and why it matters.

## Business Value
- Concrete benefit 1
- Concrete benefit 2

## Scope
What's included and what's explicitly out of scope.

## Key Components
1. Component/file 1 - what it does
2. Component/file 2 - what it does

## Technical Approach
Step-by-step implementation strategy.

## Files to Modify
- \`path/to/file1.ts\` - change description
- \`path/to/file2.tsx\` - change description

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Potential Challenges
- Challenge 1 and mitigation
- Challenge 2 and mitigation`,
    summaryJsonExample: `{
  "filesScanned": <number>,
  "filesFixed": <number>,
  "issues": {
    "unusedImports": { "found": <n>, "fixed": <n> },
    "consoleStatements": { "found": <n>, "fixed": <n> },
    "anyTypes": { "found": <n>, "fixed": <n> },
    "longFunctions": { "found": <n>, "fixed": 0 },
    "complexity": { "found": <n>, "fixed": 0 },
    "duplication": { "found": <n>, "fixed": 0 }
  },
  "directionsGenerated": <number>
}`,
  };

  return buildBaseScanPrompt(baseOptions, content);
}

// Backwards compatibility alias
export const buildHealthScanPrompt = buildRefactorScanPrompt;

/**
 * Build a lightweight prompt for quick check (no auto-fix)
 */
export function buildQuickRefactorPrompt(
  groupName: string,
  groupId: string,
  projectId: string,
  projectPath: string,
  filePaths: string[]
): string {
  return buildRefactorScanPrompt({
    groupName,
    groupId,
    projectId,
    projectPath,
    filePaths,
    autoFix: false,
    includeComplexityAnalysis: true,
  });
}

/** Refactor scan summary type */
export interface RefactorScanSummary {
  filesScanned: number;
  filesFixed: number;
  issues: {
    unusedImports: { found: number; fixed: number };
    consoleStatements: { found: number; fixed: number };
    anyTypes: { found: number; fixed: number };
    longFunctions: { found: number; fixed: number };
    complexity: { found: number; fixed: number };
    duplication: { found: number; fixed: number };
  };
  directionsGenerated: number;
}

/**
 * Parse the refactor scan summary from CLI output
 * Uses shared base parser for consistency
 */
export function parseRefactorScanSummary(output: string): RefactorScanSummary | null {
  return parseBaseScanSummary<RefactorScanSummary>(output);
}

// Backwards compatibility
export const parseHealthScanSummary = parseRefactorScanSummary;

/**
 * Calculate refactor score from issue counts
 */
export function calculateRefactorScore(issues: {
  unusedImports: number;
  consoleStatements: number;
  anyTypes: number;
  longFunctions: number;
  complexity: number;
  duplication: number;
}): number {
  let score = 100;

  score -= issues.unusedImports * 2;
  score -= issues.consoleStatements * 1;
  score -= issues.anyTypes * 3;
  score -= issues.longFunctions * 5;
  score -= issues.complexity * 5;
  score -= issues.duplication * 10;

  return Math.max(0, score);
}

// Backwards compatibility
export const calculateHealthScore = calculateRefactorScore;
