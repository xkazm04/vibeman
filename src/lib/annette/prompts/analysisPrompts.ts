/**
 * Analysis Prompt Templates
 * Read-only CLI prompts for codebase analysis via Claude Code
 */

export type AnalysisType = 'architecture' | 'quality' | 'security' | 'performance';

interface AnalysisPromptConfig {
  contextName: string;
  filePaths: string[];
  apiRoutes?: string[];
}

const READ_ONLY_PREAMBLE = `## CRITICAL: READ-ONLY MODE
- DO NOT create, edit, or modify any files
- DO NOT use Write, Edit, or Bash tools that modify state
- ONLY use Read, Grep, Glob, and LSP tools for analysis
- Return your analysis as structured markdown with the sections below`;

const OUTPUT_FORMAT = `## Required Output Format

Structure your response using EXACTLY these sections:

## FINDINGS
For each finding, use this format:
### [Critical] or [High] or [Medium] or [Low] — issue title
Description of the issue, why it matters, and which files are affected.
**Files:** \`path/to/file1.ts\`, \`path/to/file2.ts\`

## RECOMMENDATIONS
For each recommendation, use this numbered format:
### 1. recommendation title
**Effort:** small | medium | large
**Impact:** high | medium | low
**Files:** \`path/to/file.ts\`
Description of what should be done and why.

## SUMMARY
One paragraph: total findings count, top priority, executive-level assessment.`;

/**
 * Build a complete analysis prompt for the given type
 */
export function buildAnalysisPrompt(
  type: AnalysisType,
  config: AnalysisPromptConfig
): string {
  const fileList = config.filePaths.map(p => `- \`${p}\``).join('\n');
  const apiSection = config.apiRoutes?.length
    ? `\n## API Routes\n${config.apiRoutes.map(r => `- \`${r}\``).join('\n')}\n`
    : '';

  const header = `# ${capitalize(type)} Analysis: ${config.contextName}

${READ_ONLY_PREAMBLE}

## Files to Analyze
${fileList}
${apiSection}
## Instructions
Thoroughly read and analyze the listed files. Use Grep and Glob to discover related files not in the list.
Focus your analysis on the specific criteria below.
`;

  const typePrompt = getTypeSpecificPrompt(type);

  return `${header}
${typePrompt}

${OUTPUT_FORMAT}

Begin your analysis now. Read the files and report your findings.`;
}

function getTypeSpecificPrompt(type: AnalysisType): string {
  switch (type) {
    case 'architecture':
      return `## Analysis Focus: Architecture

### 1. Pattern Consistency
- What design patterns are used? (Repository, Factory, Observer, MVC, etc.)
- Are patterns applied consistently across files?
- Where do patterns break down or diverge?

### 2. Coupling & Cohesion
- Identify high-coupling points (files importing from many different modules)
- Identify low-cohesion files (doing too many unrelated things)
- Check for circular dependencies or tangled import chains

### 3. Abstraction Opportunities
- Repeated code blocks that could be extracted into shared utilities
- Missing interfaces or type abstractions
- Over-abstraction (unnecessary layers, premature generalization)

### 4. Integration Points
- How does this module connect to other parts of the codebase?
- API boundaries — are contracts well-defined?
- Shared state management — are store dependencies clear?

### 5. Module Organization
- File naming conventions — consistent?
- Directory structure — logical grouping?
- Export patterns — barrel files, default vs named exports`;

    case 'quality':
      return `## Analysis Focus: Code Quality

### 1. Error Handling
- Are errors caught and handled appropriately?
- Are there try/catch blocks without meaningful error recovery?
- Are API errors propagated with useful messages?
- Are edge cases handled (null, undefined, empty arrays)?

### 2. Type Safety
- Are there \`any\` types that should be properly typed?
- Are function signatures precise or overly loose?
- Are union types used where appropriate?
- Are there type assertions (as) that mask real issues?

### 3. Code Complexity
- Functions exceeding 50 lines that should be split
- Deeply nested conditionals (>3 levels)
- Complex boolean expressions without named variables
- Switch/if chains that could be strategy patterns

### 4. Maintainability
- Dead code or unreachable branches
- Duplicated logic across files
- Magic numbers or strings without constants
- Unclear variable/function names

### 5. Testing Gaps
- Critical business logic without test coverage
- Complex branching without corresponding test cases
- Functions with side effects that are hard to test`;

    case 'security':
      return `## Analysis Focus: Security

### 1. Input Validation
- Are API route inputs validated before use?
- Are query parameters sanitized?
- Are file paths validated (no path traversal)?
- Are JSON bodies parsed safely?

### 2. Authentication & Authorization
- Are endpoints properly protected?
- Are there endpoints that should require auth but don't?
- Are permissions checked before sensitive operations?

### 3. Data Exposure
- Are sensitive fields (API keys, tokens) excluded from responses?
- Are error messages leaking internal details?
- Are database queries returning more fields than needed?
- Are logs containing sensitive data?

### 4. Injection Risks
- SQL injection via string concatenation in queries
- Command injection via unsanitized shell arguments
- XSS via unescaped user content in rendering
- Path injection via user-controlled file paths

### 5. Dependency Risks
- Are there known vulnerable package patterns?
- Are there hardcoded credentials or API keys?
- Are environment variables accessed safely?`;

    case 'performance':
      return `## Analysis Focus: Performance

### 1. Rendering Efficiency
- Components re-rendering unnecessarily (missing memoization)
- Large lists without virtualization
- Heavy computations inside render (should be useMemo)
- Missing React.memo on expensive child components

### 2. Data Fetching
- N+1 query patterns (fetching in loops)
- Missing caching for repeated API calls
- Fetching more data than needed
- Missing pagination for large datasets

### 3. Bundle & Load
- Large imports that could be lazy-loaded
- Dynamic imports where appropriate
- Unused imports bloating bundle
- Heavy libraries used for simple tasks

### 4. State Management
- Store subscriptions triggering unnecessary re-renders
- Large state objects where selective subscriptions would help
- Missing useShallow for Zustand selectors
- Derived state recomputed on every render

### 5. Async Operations
- Missing cancellation for abandoned requests
- Race conditions in concurrent state updates
- Missing debounce/throttle on frequent operations
- Blocking operations on the main thread`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
