/**
 * Scan technique definitions and groupings by project type
 * This module defines all available scan techniques and organizes them by relevance to project types
 */

export type ScanTechnique = {
  id: string;
  name: string;
  description: string;
  category: 'code-quality' | 'performance' | 'security' | 'maintainability' | 'testing' | 'architecture';
  enabled: boolean;
  detector: string; // Name of the detection function
};

export type ScanTechniqueGroup = {
  id: string;
  name: string;
  description: string;
  icon: string;
  techniques: ScanTechnique[];
  relevantForTypes: ProjectType[];
  priority: number; // Higher = more important
};

export type ProjectType = 'nextjs' | 'react' | 'fastapi' | 'python' | 'nodejs' | 'typescript' | 'generic';

/**
 * All available scan techniques
 */
export const ALL_SCAN_TECHNIQUES: ScanTechnique[] = [
  {
    id: 'large-files',
    name: 'Large Files',
    description: 'Detect files with excessive lines of code that should be split',
    category: 'maintainability',
    enabled: true,
    detector: 'checkLargeFile',
  },
  {
    id: 'code-duplication',
    name: 'Code Duplication',
    description: 'Find duplicated code blocks that can be extracted',
    category: 'maintainability',
    enabled: true,
    detector: 'checkDuplication',
  },
  {
    id: 'long-functions',
    name: 'Long Functions',
    description: 'Identify functions exceeding recommended length',
    category: 'maintainability',
    enabled: true,
    detector: 'checkLongFunctions',
  },
  {
    id: 'console-statements',
    name: 'Console Statements',
    description: 'Find console.log statements in production code',
    category: 'code-quality',
    enabled: true,
    detector: 'checkConsoleStatements',
  },
  {
    id: 'any-types',
    name: 'Any Types',
    description: 'Detect usage of "any" type in TypeScript',
    category: 'code-quality',
    enabled: true,
    detector: 'checkAnyTypes',
  },
  {
    id: 'unused-imports',
    name: 'Unused Imports',
    description: 'Find imports that are not used in the file',
    category: 'code-quality',
    enabled: true,
    detector: 'checkUnusedImports',
  },
  {
    id: 'missing-error-handling',
    name: 'Missing Error Handling',
    description: 'Detect async functions without try-catch blocks',
    category: 'security',
    enabled: true,
    detector: 'checkMissingErrorHandling',
  },
  {
    id: 'hardcoded-credentials',
    name: 'Hardcoded Credentials',
    description: 'Find potential hardcoded secrets or API keys',
    category: 'security',
    enabled: true,
    detector: 'checkHardcodedCredentials',
  },
  {
    id: 'missing-types',
    name: 'Missing Type Definitions',
    description: 'Functions without explicit return types',
    category: 'code-quality',
    enabled: true,
    detector: 'checkMissingTypes',
  },
  {
    id: 'complex-conditionals',
    name: 'Complex Conditionals',
    description: 'Deeply nested if statements that need refactoring',
    category: 'maintainability',
    enabled: true,
    detector: 'checkComplexConditionals',
  },
  {
    id: 'magic-numbers',
    name: 'Magic Numbers',
    description: 'Hardcoded numbers that should be constants',
    category: 'maintainability',
    enabled: true,
    detector: 'checkMagicNumbers',
  },
  {
    id: 'missing-tests',
    name: 'Missing Test Coverage',
    description: 'Components or functions without test files',
    category: 'testing',
    enabled: true,
    detector: 'checkMissingTests',
  },
  {
    id: 'react-hooks-deps',
    name: 'React Hook Dependencies',
    description: 'useEffect/useCallback with missing dependencies',
    category: 'code-quality',
    enabled: true,
    detector: 'checkReactHookDeps',
  },
  {
    id: 'component-complexity',
    name: 'Component Complexity',
    description: 'React components with too many responsibilities',
    category: 'architecture',
    enabled: true,
    detector: 'checkComponentComplexity',
  },
  {
    id: 'prop-drilling',
    name: 'Prop Drilling',
    description: 'Props passed through multiple component layers',
    category: 'architecture',
    enabled: true,
    detector: 'checkPropDrilling',
  },
  {
    id: 'inefficient-renders',
    name: 'Inefficient Renders',
    description: 'Components re-rendering unnecessarily',
    category: 'performance',
    enabled: true,
    detector: 'checkInefficientRenders',
  },
  {
    id: 'missing-memoization',
    name: 'Missing Memoization',
    description: 'Expensive calculations without useMemo',
    category: 'performance',
    enabled: true,
    detector: 'checkMissingMemoization',
  },
  {
    id: 'api-error-handling',
    name: 'API Error Handling',
    description: 'API routes without proper error handling',
    category: 'security',
    enabled: true,
    detector: 'checkApiErrorHandling',
  },
  {
    id: 'missing-validation',
    name: 'Missing Input Validation',
    description: 'API endpoints without request validation',
    category: 'security',
    enabled: true,
    detector: 'checkMissingValidation',
  },
  {
    id: 'circular-dependencies',
    name: 'Circular Dependencies',
    description: 'Modules that import each other',
    category: 'architecture',
    enabled: true,
    detector: 'checkCircularDependencies',
  },
];

/**
 * Scan technique groups organized by concern area
 */
export const SCAN_TECHNIQUE_GROUPS: ScanTechniqueGroup[] = [
  {
    id: 'code-quality',
    name: 'Code Quality & Standards',
    description: 'Basic code quality checks including type safety, unused code, and debugging statements',
    icon: 'CheckCircle2',
    priority: 10,
    relevantForTypes: ['nextjs', 'react', 'fastapi', 'python', 'nodejs', 'typescript', 'generic'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['console-statements', 'any-types', 'unused-imports', 'missing-types'].includes(t.id)
    ),
  },
  {
    id: 'maintainability',
    name: 'Code Maintainability',
    description: 'Detect large files, long functions, duplication, and complex logic',
    icon: 'Wrench',
    priority: 9,
    relevantForTypes: ['nextjs', 'react', 'fastapi', 'python', 'nodejs', 'typescript', 'generic'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['large-files', 'code-duplication', 'long-functions', 'complex-conditionals', 'magic-numbers'].includes(t.id)
    ),
  },
  {
    id: 'security',
    name: 'Security & Error Handling',
    description: 'Security vulnerabilities, missing error handling, and input validation',
    icon: 'Shield',
    priority: 10,
    relevantForTypes: ['nextjs', 'react', 'fastapi', 'python', 'nodejs', 'typescript', 'generic'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['missing-error-handling', 'hardcoded-credentials', 'api-error-handling', 'missing-validation'].includes(t.id)
    ),
  },
  {
    id: 'react-specific',
    name: 'React & Component Patterns',
    description: 'React-specific issues like hook dependencies, component complexity, and prop drilling',
    icon: 'Component',
    priority: 8,
    relevantForTypes: ['nextjs', 'react'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['react-hooks-deps', 'component-complexity', 'prop-drilling'].includes(t.id)
    ),
  },
  {
    id: 'performance',
    name: 'Performance Optimization',
    description: 'Identify performance bottlenecks and optimization opportunities',
    icon: 'Zap',
    priority: 7,
    relevantForTypes: ['nextjs', 'react', 'nodejs', 'typescript', 'generic'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['inefficient-renders', 'missing-memoization'].includes(t.id)
    ),
  },
  {
    id: 'architecture',
    name: 'Architecture & Design',
    description: 'Architectural issues like circular dependencies and code organization',
    icon: 'Network',
    priority: 6,
    relevantForTypes: ['nextjs', 'react', 'fastapi', 'python', 'nodejs', 'typescript', 'generic'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['circular-dependencies'].includes(t.id)
    ),
  },
  {
    id: 'testing',
    name: 'Testing & Coverage',
    description: 'Analyze test coverage and identify missing test cases',
    icon: 'TestTube',
    priority: 5,
    relevantForTypes: ['nextjs', 'react', 'fastapi', 'python', 'nodejs', 'typescript', 'generic'],
    techniques: ALL_SCAN_TECHNIQUES.filter(t =>
      ['missing-tests'].includes(t.id)
    ),
  },
];

/**
 * Get scan groups relevant for a project type, sorted by priority
 */
export function getScanGroupsForProjectType(projectType: ProjectType): ScanTechniqueGroup[] {
  return SCAN_TECHNIQUE_GROUPS
    .filter(group => group.relevantForTypes.includes(projectType))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get all techniques for a project type
 */
export function getTechniquesForProjectType(projectType: ProjectType): ScanTechnique[] {
  const groups = getScanGroupsForProjectType(projectType);
  const techniques = new Map<string, ScanTechnique>();

  groups.forEach(group => {
    group.techniques.forEach(technique => {
      techniques.set(technique.id, technique);
    });
  });

  return Array.from(techniques.values());
}

/**
 * Helper: Check if files contain a specific extension
 */
function hasFileExtension(files: { path: string }[], ...extensions: string[]): boolean {
  return files.some(f => extensions.some(ext => f.path.endsWith(ext)));
}

/**
 * Detect project type from file structure and package.json
 */
export function detectProjectType(files: { path: string; content?: string }[]): ProjectType {
  const hasFile = (pattern: string) => files.some(f => f.path.includes(pattern));
  const hasContent = (pattern: RegExp) => files.some(f => f.content && pattern.test(f.content));

  // Check for Next.js
  if (hasFile('next.config') || hasFile('app/layout.tsx') || hasFile('pages/_app')) {
    return 'nextjs';
  }

  // Check for React
  if (hasFile('package.json') && hasContent(/"react"/)) {
    return 'react';
  }

  // Check for FastAPI
  if (hasContent(/from fastapi import/) || hasContent(/@app\.get|@app\.post/)) {
    return 'fastapi';
  }

  // Check for Python
  if (hasFileExtension(files, '.py')) {
    return 'python';
  }

  // Check for TypeScript
  if (hasFile('tsconfig.json') || hasFileExtension(files, '.ts', '.tsx')) {
    return 'typescript';
  }

  // Check for Node.js
  if (hasFile('package.json')) {
    return 'nodejs';
  }

  return 'generic';
}
