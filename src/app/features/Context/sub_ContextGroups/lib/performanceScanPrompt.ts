/**
 * Performance Scan Prompt Builder
 *
 * Builds the prompt for Claude Code CLI to find and fix performance issues.
 * Focus: Non-breaking performance optimizations without architecture changes.
 * Also generates strategic Directions for larger performance improvements.
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

export interface PerformanceScanPromptOptions {
  groupName: string;
  groupId: string;
  projectId: string;
  projectPath: string;
  filePaths: string[];
  projectType?: 'nextjs' | 'react' | 'express' | 'fastapi' | 'django' | 'rails' | 'generic' | 'combined';
  apiBaseUrl?: string;
  contextGroupInfo?: ContextGroupInfo;
}

/**
 * Build the performance scan prompt for Claude Code CLI
 * Uses shared base infrastructure for consistent Direction generation
 */
export function buildPerformanceScanPrompt({
  groupName,
  groupId,
  projectId,
  projectPath,
  filePaths,
  projectType = 'generic',
  apiBaseUrl = 'http://localhost:3000',
  contextGroupInfo,
}: PerformanceScanPromptOptions): string {
  // Build context group info from file paths if not provided
  const effectiveContextGroupInfo: ContextGroupInfo = contextGroupInfo || {
    filesByCategory: categorizeFiles(filePaths),
    detectedPatterns: detectPatterns(filePaths),
  };

  const baseOptions: BaseScanPromptOptions = {
    scanType: 'performance',
    groupName,
    groupId,
    projectId,
    projectPath,
    filePaths,
    apiBaseUrl,
    projectType,
    contextGroupInfo: effectiveContextGroupInfo,
  };

  const isFrontend = ['nextjs', 'react', 'combined'].includes(projectType);
  const isBackend = ['express', 'fastapi', 'django', 'rails', 'combined'].includes(projectType);

  // Build conditional sections based on project type
  let frontendSection = '';
  if (isFrontend) {
    frontendSection = `
### Frontend Optimizations

#### 1. React Memoization (AUTO-FIX)
- Add React.memo() to components that receive stable props
- Wrap expensive calculations in useMemo()
- Wrap callback functions in useCallback() to prevent child re-renders
- **AVOID**: Over-memoizing simple components (adds overhead)

#### 2. Lazy Loading (AUTO-FIX)
- Convert heavy component imports to React.lazy() + Suspense
- Add dynamic imports for route-specific code
- Defer loading of below-the-fold content
- **AVOID**: Lazy loading critical above-the-fold content

#### 3. Event Optimization (AUTO-FIX)
- Add debounce to search/filter inputs (300-500ms)
- Add throttle to scroll/resize handlers (100-200ms)
- Use passive event listeners where appropriate
- **AVOID**: Debouncing user actions that need immediate feedback

#### 4. Render Optimization (AUTO-FIX)
- Move inline object/array definitions outside render
- Extract static data to module scope
- Replace .map().filter() chains with single-pass reduce
- Use key props correctly for list rendering
- **AVOID**: Premature optimization of simple renders
`;
  }

  let backendSection = '';
  if (isBackend) {
    backendSection = `
### Backend Optimizations

#### 1. Database Query Optimization (AUTO-FIX)
- Add .select() to limit returned columns
- Convert N+1 queries to batch queries
- Add appropriate WHERE clauses
- Use index hints where supported
- **AVOID**: Changing query semantics or result shape

#### 2. Caching Patterns (AUTO-FIX)
- Add memoization to pure functions
- Cache expensive computations with TTL
- Add request-level caching for repeated calls
- **AVOID**: Caching dynamic or user-specific data incorrectly

#### 3. Async Optimization (AUTO-FIX)
- Convert sequential awaits to Promise.all() where independent
- Add early returns to skip unnecessary processing
- Use streams for large data transfers
- **AVOID**: Parallelizing dependent operations
`;
  }

  const immediateActionsSection = `${frontendSection}${backendSection}
### Universal Optimizations

#### 1. Loop Optimization (AUTO-FIX)
- Convert nested loops to hash maps where O(n) possible
- Use Set/Map for O(1) lookups instead of Array.includes()
- Break early from loops when result is found
- Cache array lengths in tight loops
- **AVOID**: Micro-optimizations that hurt readability

#### 2. Object/Array Operations (AUTO-FIX)
- Use object spread carefully (shallow copy overhead)
- Prefer mutation in isolated functions over spread chains
- Use typed arrays for numeric data
- **AVOID**: Changing immutability patterns in state management

#### 3. String Operations (AUTO-FIX)
- Use template literals over concatenation
- Cache regex patterns used repeatedly
- Use array join() for building long strings
- **AVOID**: Breaking string formatting patterns

### Implementation Rules

**SAFE to modify:**
- Add memoization wrappers (React.memo, useMemo, useCallback)
- Add debounce/throttle to event handlers
- Convert sequential to parallel async operations
- Optimize data structure usage
- Add lazy loading

**DO NOT modify:**
- Component API or props interface
- State management patterns or store structure
- API contracts or response shapes
- Authentication/authorization logic
- Error handling behavior`;

  const content: ScanSpecificContent = {
    title: 'Performance Scan',
    missionPart1: 'Immediate Optimizations: Apply safe, non-breaking performance improvements',
    missionPart2: 'Strategic Directions: Identify larger performance opportunities requiring dedicated sessions',
    immediateActionsSection,
    directionCategories: [
      { name: 'Rendering Architecture', description: 'Virtual scrolling, windowing, progressive rendering patterns' },
      { name: 'Data Loading Strategy', description: 'Prefetching, background sync, incremental loading, streaming' },
      { name: 'Caching Architecture', description: 'Multi-layer caching, cache invalidation strategies, stale-while-revalidate' },
      { name: 'Code Splitting', description: 'Route-based splitting, component-level splitting, dynamic imports strategy' },
      { name: 'State Optimization', description: 'Normalized state, selective subscriptions, derived state patterns' },
      { name: 'Network Optimization', description: 'Request batching, connection pooling, compression strategies' },
    ],
    excellentDirections: [
      'Implement virtual scrolling for large lists with dynamic row heights',
      'Build intelligent prefetching system for predictive data loading',
      'Create service worker caching strategy with offline-first approach',
      'Implement React Server Components for improved initial load performance',
      'Build optimistic UI update system with automatic rollback on failure',
    ],
    badDirections: [
      'Make it faster (too vague)',
      'Add useMemo (too small)',
      'Optimize the database (not actionable)',
      'Improve performance (not strategic)',
    ],
    whenToGenerateCriteria: [
      'Rendering bottleneck that needs architectural solution (not just memoization)',
      'Data loading pattern that would benefit from systematic optimization',
      'Opportunity to introduce caching at multiple layers',
      'Component tree that would benefit from virtualization',
      'API patterns that could benefit from batching or prefetching',
    ],
    maxDirections: '0-2',
    directionMarkdownSections: `## Vision
What this performance improvement achieves and its expected impact.

## Performance Impact
- Metric 1: expected improvement (e.g., "50% reduction in initial load time")
- Metric 2: expected improvement (e.g., "Smooth 60fps scrolling for 10k+ items")

## Current Bottleneck
Description of the current performance issue and its root cause.

## Technical Approach
Step-by-step strategy for implementing the optimization.

## Components Affected
1. Component/file 1 - what changes
2. Component/file 2 - what changes

## Files to Modify
- \`path/to/file1.ts\` - change description
- \`path/to/file2.tsx\` - change description

## Success Criteria
- [ ] Performance criterion 1 (measurable)
- [ ] Performance criterion 2 (measurable)
- [ ] No regression in functionality

## Benchmarking Plan
How to measure before/after performance.

## Potential Risks
- Risk 1 and mitigation
- Risk 2 and mitigation`,
    summaryJsonExample: `{
  "filesScanned": <number>,
  "filesOptimized": <number>,
  "optimizations": {
    "memoization": <count>,
    "lazyLoading": <count>,
    "asyncParallel": <count>,
    "dataStructure": <count>,
    "eventHandling": <count>,
    "caching": <count>
  },
  "directionsGenerated": <number>
}`,
  };

  return buildBaseScanPrompt(baseOptions, content);
}

/** Performance scan summary type */
export interface PerformanceScanSummary {
  filesScanned: number;
  filesOptimized: number;
  optimizations: {
    memoization: number;
    lazyLoading: number;
    asyncParallel: number;
    dataStructure: number;
    eventHandling: number;
    caching: number;
  };
  directionsGenerated: number;
}

/**
 * Parse the performance scan summary from CLI output
 * Uses shared base parser for consistency
 */
export function parsePerformanceScanSummary(output: string): PerformanceScanSummary | null {
  return parseBaseScanSummary<PerformanceScanSummary>(output);
}
