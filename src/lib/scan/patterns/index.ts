/**
 * Pattern detection exports
 * Consolidated pattern detectors for code analysis
 */

// Duplication patterns
export {
  detectDuplication,
  detectCrossFileDuplication,
  type DuplicationMatch,
} from './duplication';

// Function patterns
export {
  detectLongFunctions,
  detectHighComplexityFunctions,
  calculateCyclomaticComplexity,
} from './functions';

// Code quality patterns
export {
  detectConsoleStatements,
  detectAnyTypes,
  detectUnusedImports,
} from './code-quality';

// Conditional complexity patterns
export {
  detectComplexConditionals,
  type ComplexConditional,
} from './conditionals';

// Magic numbers
export {
  detectMagicNumbers,
  type MagicNumber,
} from './constants';

// React hooks
export {
  detectReactHookDeps,
  type HookDependencyIssue,
} from './react-hooks';
