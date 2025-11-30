/**
 * AI-Powered Refactor Suggestion Engine
 *
 * Automatically scans the codebase for anti-patterns, duplicated logic,
 * and overly coupled components. Generates targeted refactoring suggestions
 * that can be executed via Claude Code.
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import {
  detectDuplication,
  detectLongFunctions,
  detectConsoleStatements,
  detectAnyTypes,
  detectComplexConditionals,
  detectHighComplexityFunctions,
  detectMagicNumbers,
  detectUnusedImports,
  detectCrossFileDuplication,
  type DuplicationMatch,
  type ComplexConditional,
  type MagicNumber,
} from '@/app/features/RefactorWizard/lib/patternDetectors';

export interface RefactorSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'anti-pattern' | 'duplication' | 'coupling' | 'complexity' | 'clean-code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  files: string[];
  lineNumbers?: Record<string, number[]>;
  suggestedFix: string;
  refactorSteps: string[];
  cleanArchitecturePrinciple?: string;
  autoFixAvailable: boolean;
  requirementTemplate?: string;
}

export interface SuggestionEngineResult {
  suggestions: RefactorSuggestion[];
  summary: {
    totalIssues: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    topPriorityCount: number;
  };
  analysisMetadata: {
    filesAnalyzed: number;
    totalLines: number;
    scanDurationMs: number;
  };
}

export interface SuggestionEngineConfig {
  enableAntiPatternDetection: boolean;
  enableDuplicationDetection: boolean;
  enableCouplingAnalysis: boolean;
  enableComplexityAnalysis: boolean;
  enableCleanCodeChecks: boolean;
  severityThreshold: 'low' | 'medium' | 'high';
  maxSuggestions: number;
}

const DEFAULT_CONFIG: SuggestionEngineConfig = {
  enableAntiPatternDetection: true,
  enableDuplicationDetection: true,
  enableCouplingAnalysis: true,
  enableComplexityAnalysis: true,
  enableCleanCodeChecks: true,
  severityThreshold: 'low',
  maxSuggestions: 50,
};

/**
 * Main entry point for the refactor suggestion engine
 */
export async function analyzeForRefactorSuggestions(
  files: FileAnalysis[],
  config: Partial<SuggestionEngineConfig> = {}
): Promise<SuggestionEngineResult> {
  const startTime = Date.now();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const suggestions: RefactorSuggestion[] = [];

  // Run all detection passes
  if (fullConfig.enableAntiPatternDetection) {
    suggestions.push(...detectAntiPatterns(files));
  }

  if (fullConfig.enableDuplicationDetection) {
    suggestions.push(...detectDuplicationIssues(files));
  }

  if (fullConfig.enableCouplingAnalysis) {
    suggestions.push(...detectCouplingIssues(files));
  }

  if (fullConfig.enableComplexityAnalysis) {
    suggestions.push(...detectComplexityIssues(files));
  }

  if (fullConfig.enableCleanCodeChecks) {
    suggestions.push(...detectCleanCodeViolations(files));
  }

  // Filter by severity threshold
  const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
  const thresholdRank = severityRank[fullConfig.severityThreshold];
  const filteredSuggestions = suggestions.filter(
    s => severityRank[s.severity] >= thresholdRank
  );

  // Sort by priority (severity + effort/impact ratio)
  const sortedSuggestions = filteredSuggestions.sort((a, b) => {
    const aScore = severityRank[a.severity] * 10 +
      (severityRank[a.impact as 'low' | 'medium' | 'high'] || 2) -
      (severityRank[a.effort as 'low' | 'medium' | 'high'] || 2);
    const bScore = severityRank[b.severity] * 10 +
      (severityRank[b.impact as 'low' | 'medium' | 'high'] || 2) -
      (severityRank[b.effort as 'low' | 'medium' | 'high'] || 2);
    return bScore - aScore;
  });

  // Limit to max suggestions
  const finalSuggestions = sortedSuggestions.slice(0, fullConfig.maxSuggestions);

  // Build summary
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  finalSuggestions.forEach(s => {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1;
  });

  const topPriorityCount = finalSuggestions.filter(
    s => s.severity === 'critical' || s.severity === 'high'
  ).length;

  return {
    suggestions: finalSuggestions,
    summary: {
      totalIssues: finalSuggestions.length,
      byCategory,
      bySeverity,
      topPriorityCount,
    },
    analysisMetadata: {
      filesAnalyzed: files.length,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      scanDurationMs: Date.now() - startTime,
    },
  };
}

/**
 * Detect anti-patterns in the codebase
 */
function detectAntiPatterns(files: FileAnalysis[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  for (const file of files) {
    // Detect god functions (very long functions)
    const longFunctions = detectLongFunctions(file.content);
    if (longFunctions.length > 0) {
      suggestions.push({
        id: `anti-pattern-god-function-${file.path}`,
        title: 'God Function Detected',
        description: `File ${getFileName(file.path)} contains ${longFunctions.length} function(s) exceeding 50 lines. Large functions violate the Single Responsibility Principle.`,
        category: 'anti-pattern',
        severity: longFunctions.length >= 3 ? 'high' : 'medium',
        effort: 'medium',
        impact: 'high',
        files: [file.path],
        lineNumbers: { [file.path]: longFunctions },
        suggestedFix: 'Extract smaller, focused functions with single responsibilities.',
        refactorSteps: [
          'Identify logical sections within the function',
          'Extract each section into a separate helper function',
          'Name functions to clearly describe their purpose',
          'Use dependency injection for shared state',
          'Add unit tests for each extracted function',
        ],
        cleanArchitecturePrinciple: 'Single Responsibility Principle (SRP)',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('god-function', file.path, longFunctions),
      });
    }

    // Detect console statements (debug code left in production)
    const consoleStatements = detectConsoleStatements(file.content);
    if (consoleStatements.length > 3) {
      suggestions.push({
        id: `anti-pattern-console-${file.path}`,
        title: 'Excessive Console Statements',
        description: `File ${getFileName(file.path)} contains ${consoleStatements.length} console statements. Consider using a proper logging utility.`,
        category: 'anti-pattern',
        severity: 'low',
        effort: 'low',
        impact: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: consoleStatements },
        suggestedFix: 'Replace console statements with a logging utility that supports log levels and can be disabled in production.',
        refactorSteps: [
          'Create or import a logging utility',
          'Replace console.log with logger.debug()',
          'Replace console.error with logger.error()',
          'Configure log levels per environment',
        ],
        cleanArchitecturePrinciple: 'Separation of Concerns',
        autoFixAvailable: true,
        requirementTemplate: generateRequirementTemplate('console-cleanup', file.path, consoleStatements),
      });
    }

    // Detect any types (TypeScript anti-pattern)
    const anyTypes = detectAnyTypes(file.content);
    if (anyTypes.length > 5) {
      suggestions.push({
        id: `anti-pattern-any-type-${file.path}`,
        title: 'Excessive Use of "any" Type',
        description: `File ${getFileName(file.path)} uses "any" type ${anyTypes.length} times. This defeats TypeScript's type safety.`,
        category: 'anti-pattern',
        severity: anyTypes.length >= 10 ? 'high' : 'medium',
        effort: 'medium',
        impact: 'high',
        files: [file.path],
        lineNumbers: { [file.path]: anyTypes },
        suggestedFix: 'Replace "any" with specific types or use generics for flexibility.',
        refactorSteps: [
          'Identify the actual type being used at runtime',
          'Create interfaces or type aliases for complex types',
          'Use generics when the type should be flexible',
          'Use "unknown" for truly unknown types (requires type guards)',
          'Update function signatures to use proper types',
        ],
        cleanArchitecturePrinciple: 'Dependency Inversion Principle',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('remove-any-types', file.path, anyTypes),
      });
    }
  }

  return suggestions;
}

/**
 * Detect duplication issues across files
 */
function detectDuplicationIssues(files: FileAnalysis[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  // Within-file duplication
  for (const file of files) {
    const duplicates = detectDuplication(file.content);
    if (duplicates.length >= 4) {
      suggestions.push({
        id: `duplication-within-${file.path}`,
        title: 'Code Duplication Within File',
        description: `File ${getFileName(file.path)} has ${duplicates.length} instances of duplicated code blocks.`,
        category: 'duplication',
        severity: duplicates.length >= 8 ? 'high' : 'medium',
        effort: 'medium',
        impact: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: duplicates },
        suggestedFix: 'Extract duplicated code into reusable functions or custom hooks.',
        refactorSteps: [
          'Identify the common pattern across duplicated blocks',
          'Create a new function with parameters for variations',
          'Replace all duplicates with calls to the new function',
          'Consider if a higher-order function or factory is more appropriate',
          'Add tests for the extracted function',
        ],
        cleanArchitecturePrinciple: 'DRY (Don\'t Repeat Yourself)',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('extract-duplicates', file.path, duplicates),
      });
    }
  }

  // Cross-file duplication
  const crossFileDuplicates = detectCrossFileDuplication(
    files.map(f => ({ path: f.path, content: f.content }))
  );

  // Group by unique file pairs
  const filePairGroups = new Map<string, DuplicationMatch[]>();
  for (const match of crossFileDuplicates) {
    const key = [match.file1, match.file2].sort().join('|');
    const group = filePairGroups.get(key) || [];
    group.push(match);
    filePairGroups.set(key, group);
  }

  for (const [key, matches] of filePairGroups) {
    if (matches.length >= 2) {
      const [file1, file2] = key.split('|');
      suggestions.push({
        id: `duplication-cross-${key.replace(/[/\\|]/g, '-')}`,
        title: 'Cross-File Code Duplication',
        description: `Found ${matches.length} similar code blocks between ${getFileName(file1)} and ${getFileName(file2)}.`,
        category: 'duplication',
        severity: matches.length >= 5 ? 'high' : 'medium',
        effort: 'high',
        impact: 'high',
        files: [file1, file2],
        lineNumbers: {
          [file1]: matches.map(m => m.line1),
          [file2]: matches.map(m => m.line2),
        },
        suggestedFix: 'Extract shared code into a common utility module or shared hook.',
        refactorSteps: [
          'Create a new shared utility file',
          'Move the common code to the utility file',
          'Export the function/component from the utility',
          'Import and use in both original files',
          'Remove the duplicated code',
          'Update any imports in dependent files',
        ],
        cleanArchitecturePrinciple: 'Single Source of Truth',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('extract-shared-utility', file1, matches.map(m => m.line1)),
      });
    }
  }

  return suggestions;
}

/**
 * Detect coupling issues in the codebase
 */
function detectCouplingIssues(files: FileAnalysis[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  // Detect files with excessive imports (high coupling)
  for (const file of files) {
    const importCount = countImports(file.content);
    if (importCount > 15) {
      suggestions.push({
        id: `coupling-excessive-imports-${file.path}`,
        title: 'High Module Coupling',
        description: `File ${getFileName(file.path)} has ${importCount} imports, indicating tight coupling with other modules.`,
        category: 'coupling',
        severity: importCount >= 25 ? 'high' : 'medium',
        effort: 'high',
        impact: 'high',
        files: [file.path],
        suggestedFix: 'Consider breaking down the component or using dependency injection.',
        refactorSteps: [
          'Analyze which imports are actually used',
          'Group related functionality into sub-components',
          'Extract smaller, focused modules',
          'Use composition instead of direct imports where possible',
          'Consider using a facade pattern to simplify imports',
        ],
        cleanArchitecturePrinciple: 'Loose Coupling',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('reduce-coupling', file.path, []),
      });
    }

    // Detect unused imports
    const unusedImports = detectUnusedImports(file.content);
    if (unusedImports.length > 0) {
      suggestions.push({
        id: `coupling-unused-imports-${file.path}`,
        title: 'Unused Imports',
        description: `File ${getFileName(file.path)} has ${unusedImports.length} potentially unused imports.`,
        category: 'coupling',
        severity: 'low',
        effort: 'low',
        impact: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: unusedImports },
        suggestedFix: 'Remove unused imports to reduce bundle size and improve clarity.',
        refactorSteps: [
          'Review each flagged import',
          'Remove imports that are truly unused',
          'Keep type-only imports if needed for TypeScript',
          'Run linter to verify no new issues',
        ],
        cleanArchitecturePrinciple: 'YAGNI (You Ain\'t Gonna Need It)',
        autoFixAvailable: true,
        requirementTemplate: generateRequirementTemplate('remove-unused-imports', file.path, unusedImports),
      });
    }
  }

  return suggestions;
}

/**
 * Detect complexity issues
 */
function detectComplexityIssues(files: FileAnalysis[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  for (const file of files) {
    // Detect complex conditionals
    const complexConditionals = detectComplexConditionals(file.content);
    const highSeverityConditionals = complexConditionals.filter(c => c.severity === 'high');

    if (highSeverityConditionals.length > 0) {
      suggestions.push({
        id: `complexity-conditionals-${file.path}`,
        title: 'Complex Conditional Logic',
        description: `File ${getFileName(file.path)} has ${highSeverityConditionals.length} complex conditional statement(s) that are hard to maintain.`,
        category: 'complexity',
        severity: 'high',
        effort: 'medium',
        impact: 'high',
        files: [file.path],
        lineNumbers: { [file.path]: highSeverityConditionals.map(c => c.line) },
        suggestedFix: 'Simplify conditionals using early returns, guard clauses, or extract to named functions.',
        refactorSteps: [
          'Use early returns to reduce nesting',
          'Extract complex boolean expressions into named variables',
          'Consider using a strategy or state pattern for complex branching',
          'Break down nested conditions into separate functions',
          'Add comments explaining complex business logic',
        ],
        cleanArchitecturePrinciple: 'Keep It Simple (KISS)',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('simplify-conditionals', file.path, highSeverityConditionals.map(c => c.line)),
      });
    }

    // Detect high cyclomatic complexity functions
    const highComplexityFunctions = detectHighComplexityFunctions(file.content);
    if (highComplexityFunctions.length > 0) {
      suggestions.push({
        id: `complexity-cyclomatic-${file.path}`,
        title: 'High Cyclomatic Complexity',
        description: `File ${getFileName(file.path)} contains ${highComplexityFunctions.length} function(s) with cyclomatic complexity > 10.`,
        category: 'complexity',
        severity: 'high',
        effort: 'high',
        impact: 'high',
        files: [file.path],
        lineNumbers: { [file.path]: highComplexityFunctions.map(f => f.line) },
        suggestedFix: 'Reduce complexity by extracting sub-functions and simplifying control flow.',
        refactorSteps: [
          'Identify independent code paths',
          'Extract each path into a separate function',
          'Use polymorphism instead of switch/case where applicable',
          'Consider using lookup tables instead of conditional chains',
          'Aim for cyclomatic complexity under 10',
        ],
        cleanArchitecturePrinciple: 'Single Level of Abstraction',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('reduce-complexity', file.path, highComplexityFunctions.map(f => f.line)),
      });
    }
  }

  return suggestions;
}

/**
 * Detect clean code violations
 */
function detectCleanCodeViolations(files: FileAnalysis[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  for (const file of files) {
    // Detect magic numbers
    const magicNumbers = detectMagicNumbers(file.content);
    const significantMagicNumbers = magicNumbers.filter(m => m.severity !== 'low');

    if (significantMagicNumbers.length >= 3) {
      suggestions.push({
        id: `clean-code-magic-numbers-${file.path}`,
        title: 'Magic Numbers Detected',
        description: `File ${getFileName(file.path)} contains ${significantMagicNumbers.length} magic numbers that should be extracted to named constants.`,
        category: 'clean-code',
        severity: significantMagicNumbers.some(m => m.severity === 'high') ? 'medium' : 'low',
        effort: 'low',
        impact: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: significantMagicNumbers.map(m => m.line) },
        suggestedFix: 'Extract magic numbers into named constants with descriptive names.',
        refactorSteps: [
          'Identify the purpose of each magic number',
          'Create constants at the top of the file or in a config module',
          'Use descriptive names like MAX_RETRY_COUNT, TIMEOUT_MS',
          'Replace magic numbers with the constants',
          'Consider grouping related constants in an object',
        ],
        cleanArchitecturePrinciple: 'Self-Documenting Code',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('extract-constants', file.path, significantMagicNumbers.map(m => m.line)),
      });
    }

    // Check for very large files
    if (file.lines > 500) {
      suggestions.push({
        id: `clean-code-large-file-${file.path}`,
        title: 'Oversized File',
        description: `File ${getFileName(file.path)} has ${file.lines} lines. Consider splitting into smaller, focused modules.`,
        category: 'clean-code',
        severity: file.lines >= 1000 ? 'high' : 'medium',
        effort: 'high',
        impact: 'high',
        files: [file.path],
        suggestedFix: 'Split the file into smaller modules based on responsibility.',
        refactorSteps: [
          'Identify distinct responsibilities within the file',
          'Group related functions/components together',
          'Create new files for each responsibility group',
          'Move code to new files while maintaining exports',
          'Update imports in dependent files',
          'Create an index file if needed for convenience',
        ],
        cleanArchitecturePrinciple: 'Single Responsibility Principle',
        autoFixAvailable: false,
        requirementTemplate: generateRequirementTemplate('split-large-file', file.path, []),
      });
    }
  }

  return suggestions;
}

/**
 * Generate a Claude Code requirement template for the refactor
 */
function generateRequirementTemplate(
  refactorType: string,
  filePath: string,
  lineNumbers: number[]
): string {
  const lineInfo = lineNumbers.length > 0
    ? `Focus on lines: ${lineNumbers.slice(0, 10).join(', ')}${lineNumbers.length > 10 ? '...' : ''}`
    : '';

  const templates: Record<string, string> = {
    'god-function': `# Refactor God Functions

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Break down large functions into smaller, focused helper functions following the Single Responsibility Principle.

## Requirements
1. Identify logical sections within each flagged function
2. Extract each section into a well-named helper function
3. Ensure extracted functions have single responsibilities
4. Maintain the same behavior (no functional changes)
5. Add JSDoc comments to new functions`,

    'console-cleanup': `# Remove Console Statements

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Replace console statements with a proper logging utility or remove debug statements.

## Requirements
1. Remove or replace all console.log statements
2. Consider using a logging utility with log levels
3. Keep console.error for actual error handling if appropriate`,

    'remove-any-types': `# Replace Any Types with Proper Types

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Replace all "any" types with proper TypeScript types or generics.

## Requirements
1. Analyze the runtime type for each "any" usage
2. Create interfaces or type aliases as needed
3. Use generics for flexible/reusable code
4. Use "unknown" with type guards where truly unknown`,

    'extract-duplicates': `# Extract Duplicated Code

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Extract duplicated code blocks into reusable functions.

## Requirements
1. Identify the common pattern in duplicated blocks
2. Create a new function with parameters for variations
3. Replace all duplicates with calls to the new function
4. Add appropriate tests for the extracted function`,

    'extract-shared-utility': `# Extract Shared Utility

## Target
- Files: Multiple files with shared code

## Task
Create a shared utility module for duplicated code across files.

## Requirements
1. Create a new utility file in the appropriate location
2. Move the common code to the utility
3. Export the shared function/component
4. Update all files to import from the new utility`,

    'reduce-coupling': `# Reduce Module Coupling

## Target
- File: ${getFileName(filePath)}

## Task
Reduce the number of imports and module dependencies.

## Requirements
1. Analyze which imports are actually used
2. Consider breaking into smaller components
3. Use composition or dependency injection
4. Apply facade pattern where appropriate`,

    'remove-unused-imports': `# Remove Unused Imports

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Remove all unused imports from the file.

## Requirements
1. Remove imports that are not used anywhere in the file
2. Keep type-only imports if needed for TypeScript
3. Verify no runtime errors after removal`,

    'simplify-conditionals': `# Simplify Complex Conditionals

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Simplify complex conditional logic for better readability.

## Requirements
1. Use early returns to reduce nesting
2. Extract complex boolean expressions into named variables
3. Consider strategy pattern for complex branching
4. Add comments for remaining complex logic`,

    'reduce-complexity': `# Reduce Cyclomatic Complexity

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Reduce cyclomatic complexity of flagged functions.

## Requirements
1. Extract independent code paths into separate functions
2. Use polymorphism instead of switch/case where applicable
3. Use lookup tables instead of conditional chains
4. Aim for cyclomatic complexity under 10`,

    'extract-constants': `# Extract Magic Numbers to Constants

## Target
- File: ${getFileName(filePath)}
${lineInfo}

## Task
Replace magic numbers with named constants.

## Requirements
1. Create descriptive constant names (e.g., MAX_RETRIES, TIMEOUT_MS)
2. Define constants at file top or in config module
3. Replace all magic number occurrences
4. Group related constants logically`,

    'split-large-file': `# Split Large File

## Target
- File: ${getFileName(filePath)}

## Task
Split the oversized file into smaller, focused modules.

## Requirements
1. Identify distinct responsibilities
2. Create new files for each responsibility
3. Maintain exports and update imports
4. Create index file if needed`,
  };

  return templates[refactorType] || `# Refactor ${getFileName(filePath)}

Apply the suggested refactoring to improve code quality.`;
}

/**
 * Convert suggestions to RefactorOpportunity format for compatibility
 */
export function convertToOpportunities(suggestions: RefactorSuggestion[]): RefactorOpportunity[] {
  return suggestions.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    category: mapCategory(s.category),
    severity: s.severity,
    impact: `${s.impact} - ${s.cleanArchitecturePrinciple || 'Clean Architecture'}`,
    effort: s.effort,
    files: s.files,
    lineNumbers: s.lineNumbers,
    suggestedFix: s.suggestedFix,
    autoFixAvailable: s.autoFixAvailable,
    estimatedTime: estimateTime(s.effort),
  }));
}

function mapCategory(category: RefactorSuggestion['category']): RefactorOpportunity['category'] {
  const mapping: Record<string, RefactorOpportunity['category']> = {
    'anti-pattern': 'code-quality',
    'duplication': 'duplication',
    'coupling': 'architecture',
    'complexity': 'maintainability',
    'clean-code': 'code-quality',
  };
  return mapping[category] || 'code-quality';
}

function estimateTime(effort: 'low' | 'medium' | 'high'): string {
  const times = { low: '15-30 min', medium: '1-2 hours', high: '2-4 hours' };
  return times[effort] || '1 hour';
}

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function countImports(content: string): number {
  const importMatches = content.match(/^import\s+/gm);
  return importMatches?.length || 0;
}
