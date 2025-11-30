/**
 * DSL Types for Declarative Refactoring Specifications
 *
 * This module defines the schema for refactoring specifications that users
 * can write as YAML/JSON configs. The DSL transforms refactoring from a
 * manual process into a declarative, automated transformation pipeline.
 */

// ============================================================================
// CORE DSL TYPES
// ============================================================================

/**
 * Root specification for a refactoring DSL document
 */
export interface RefactorSpec {
  /** Spec version for compatibility */
  version: '1.0';

  /** Human-readable name for this refactoring spec */
  name: string;

  /** Description of what this spec does */
  description?: string;

  /** Target scope for the transformations */
  scope: ScopeConfig;

  /** List of transformation rules to apply */
  transformations: TransformationRule[];

  /** Execution configuration */
  execution?: ExecutionConfig;

  /** Validation and testing configuration */
  validation?: ValidationConfig;

  /** Metadata and tags */
  metadata?: SpecMetadata;
}

/**
 * Defines what files/directories the transformations target
 */
export interface ScopeConfig {
  /** Include patterns (glob format) */
  include: string[];

  /** Exclude patterns (glob format) */
  exclude?: string[];

  /** File types to target */
  fileTypes?: ('tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'scss' | 'json' | 'md')[];

  /** Target specific modules/directories */
  modules?: string[];
}

// ============================================================================
// TRANSFORMATION RULES
// ============================================================================

/**
 * A single transformation rule
 */
export interface TransformationRule {
  /** Unique identifier for this rule */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this rule does */
  description?: string;

  /** The type of transformation */
  type: TransformationType;

  /** Pattern to match for this transformation */
  pattern: PatternConfig;

  /** What to transform it into */
  replacement?: ReplacementConfig;

  /** Conditions that must be true for this rule to apply */
  conditions?: ConditionConfig[];

  /** Priority for rule ordering (higher = first) */
  priority?: number;

  /** Whether this rule is enabled */
  enabled?: boolean;

  /** Estimated impact */
  impact?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Types of transformations supported by the DSL
 */
export type TransformationType =
  // Pattern-based transforms
  | 'find-replace'         // Simple text find/replace
  | 'regex-replace'        // Regex-based replacement
  | 'ast-transform'        // AST-aware transformation

  // Structural transforms
  | 'extract-component'    // Extract code into new component
  | 'extract-hook'         // Extract logic into custom hook
  | 'extract-utility'      // Extract into utility function
  | 'inline'               // Inline function/component calls
  | 'move-file'            // Move file to new location
  | 'rename-export'        // Rename exported symbol

  // Migration transforms
  | 'upgrade-syntax'       // Upgrade to newer syntax (e.g., class → function)
  | 'migrate-import'       // Change import paths
  | 'migrate-api'          // Update API usage patterns

  // Code quality transforms
  | 'add-type'            // Add TypeScript types
  | 'add-error-handling'  // Wrap with try/catch
  | 'add-memoization'     // Add useMemo/useCallback
  | 'remove-dead-code'    // Remove unused code
  | 'consolidate'         // Merge duplicate code

  // Custom transforms
  | 'custom';             // User-defined transformation

// ============================================================================
// PATTERN CONFIGURATION
// ============================================================================

/**
 * Configuration for pattern matching
 */
export interface PatternConfig {
  /** Pattern type */
  type: 'text' | 'regex' | 'ast' | 'semantic';

  /** The pattern to match */
  match: string;

  /** Named capture groups for use in replacement */
  captures?: Record<string, string>;

  /** Additional context requirements */
  context?: PatternContext;

  /** Case sensitivity */
  caseSensitive?: boolean;

  /** Match whole words only */
  wholeWord?: boolean;
}

/**
 * Context requirements for pattern matching
 */
export interface PatternContext {
  /** Must be inside a specific construct */
  insideOf?: string[];

  /** Must not be inside these constructs */
  notInsideOf?: string[];

  /** Must have these imports present */
  requiredImports?: string[];

  /** File must match these patterns */
  filePattern?: string;
}

// ============================================================================
// REPLACEMENT CONFIGURATION
// ============================================================================

/**
 * Configuration for replacement/transformation
 */
export interface ReplacementConfig {
  /** The replacement template (can use capture group references) */
  template?: string;

  /** For extract transforms: new file name/path */
  targetPath?: string;

  /** For extract transforms: template for the extracted code */
  extractTemplate?: string;

  /** For import migrations: new import path */
  newImport?: string;

  /** Whether to add new imports */
  addImports?: ImportConfig[];

  /** Whether to remove old imports */
  removeImports?: string[];

  /** Custom transformation function (for 'custom' type) */
  customTransform?: string;
}

/**
 * Import configuration for adding new imports
 */
export interface ImportConfig {
  /** The import source */
  from: string;

  /** Named imports */
  named?: string[];

  /** Default import name */
  default?: string;

  /** Type-only import */
  typeOnly?: boolean;
}

// ============================================================================
// CONDITION CONFIGURATION
// ============================================================================

/**
 * Conditions for when a rule should apply
 */
export interface ConditionConfig {
  /** Type of condition */
  type: 'file-exists' | 'import-present' | 'export-present' | 'env-var' | 'custom';

  /** Value to check */
  value: string;

  /** Negate the condition */
  negate?: boolean;
}

// ============================================================================
// EXECUTION CONFIGURATION
// ============================================================================

/**
 * Configuration for how transformations are executed
 */
export interface ExecutionConfig {
  /** Execution mode */
  mode: 'preview' | 'apply' | 'auto';

  /** Whether to run tests after each transformation */
  runTestsAfterEach?: boolean;

  /** Whether to commit after each transformation */
  commitAfterEach?: boolean;

  /** Commit message template */
  commitTemplate?: string;

  /** Whether to run type checking */
  typeCheck?: boolean;

  /** Whether to run linting */
  lint?: boolean;

  /** Maximum parallel transformations */
  parallelism?: number;

  /** Stop on first error */
  stopOnError?: boolean;

  /** Dry run (preview only) */
  dryRun?: boolean;
}

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

/**
 * Validation configuration for post-transformation checks
 */
export interface ValidationConfig {
  /** Run npm test */
  runTests?: boolean;

  /** Run TypeScript type checking */
  runTypeCheck?: boolean;

  /** Run ESLint */
  runLint?: boolean;

  /** Run build */
  runBuild?: boolean;

  /** Custom validation commands */
  customCommands?: string[];

  /** Required test coverage percentage */
  minCoverage?: number;
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Metadata for the spec
 */
export interface SpecMetadata {
  /** Author of the spec */
  author?: string;

  /** Creation date */
  created?: string;

  /** Last modified date */
  modified?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Whether this is a template */
  isTemplate?: boolean;

  /** Template category */
  templateCategory?: 'migration' | 'cleanup' | 'security' | 'performance' | 'architecture';

  /** Estimated effort */
  effort?: 'small' | 'medium' | 'large' | 'extra-large';

  /** Risk level */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// PREDEFINED TEMPLATES
// ============================================================================

/**
 * Template for common refactoring patterns
 */
export interface RefactorTemplate {
  id: string;
  name: string;
  description: string;
  category: 'migration' | 'cleanup' | 'security' | 'performance' | 'architecture';
  tags: string[];
  spec: Partial<RefactorSpec>;
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

/**
 * Result of a single transformation
 */
export interface TransformationResult {
  ruleId: string;
  ruleName: string;
  filesAffected: string[];
  changesCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  preview?: TransformationPreview[];
}

/**
 * Preview of a single file change
 */
export interface TransformationPreview {
  filePath: string;
  changeType: 'modify' | 'create' | 'delete' | 'move';
  oldContent?: string;
  newContent?: string;
  diff?: string;
  lineNumbers?: { start: number; end: number };
}

/**
 * Overall execution result
 */
export interface ExecutionResult {
  specName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  transformations: TransformationResult[];
  summary: {
    totalRules: number;
    rulesApplied: number;
    rulesFailed: number;
    rulesSkipped: number;
    filesModified: number;
    linesChanged: number;
  };
  validation?: {
    testsPass: boolean;
    typeCheckPass: boolean;
    lintPass: boolean;
    buildPass: boolean;
  };
  error?: string;
  startTime: Date;
  endTime?: Date;
}

// ============================================================================
// BUILDER STATE
// ============================================================================

/**
 * State for the visual DSL builder
 */
export interface DSLBuilderState {
  /** Current spec being edited */
  currentSpec: RefactorSpec | null;

  /** Whether in edit mode */
  isEditing: boolean;

  /** Currently selected rule */
  selectedRuleId: string | null;

  /** Validation errors */
  validationErrors: ValidationError[];

  /** Preview results */
  preview: TransformationPreview[] | null;

  /** Execution status */
  executionStatus: 'idle' | 'previewing' | 'executing' | 'completed' | 'failed';

  /** Execution result */
  executionResult: ExecutionResult | null;

  /** Available templates */
  templates: RefactorTemplate[];

  /** Recently used specs */
  recentSpecs: { name: string; timestamp: Date }[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Type guard for checking if a value is a valid RefactorSpec
 */
export function isValidRefactorSpec(value: unknown): value is RefactorSpec {
  if (!value || typeof value !== 'object') return false;
  const spec = value as Record<string, unknown>;
  return (
    spec.version === '1.0' &&
    typeof spec.name === 'string' &&
    typeof spec.scope === 'object' &&
    Array.isArray(spec.transformations)
  );
}

/**
 * Create an empty spec with defaults
 */
export function createEmptySpec(): RefactorSpec {
  return {
    version: '1.0',
    name: 'New Refactoring Spec',
    description: '',
    scope: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
      fileTypes: ['ts', 'tsx'],
    },
    transformations: [],
    execution: {
      mode: 'preview',
      runTestsAfterEach: false,
      commitAfterEach: false,
      typeCheck: true,
      lint: true,
      stopOnError: true,
      dryRun: true,
    },
    validation: {
      runTests: true,
      runTypeCheck: true,
      runLint: true,
      runBuild: false,
    },
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: [],
      effort: 'medium',
      riskLevel: 'medium',
    },
  };
}

/**
 * Create an empty transformation rule
 */
export function createEmptyRule(): TransformationRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'New Rule',
    description: '',
    type: 'find-replace',
    pattern: {
      type: 'text',
      match: '',
      caseSensitive: true,
    },
    replacement: {
      template: '',
    },
    enabled: true,
    priority: 0,
    impact: 'medium',
  };
}
