/**
 * Common (language-agnostic) scan techniques
 *
 * These generic detectors wrap the low-level pattern functions from `patterns/`
 * and format their output as RefactorOpportunity objects.  They are shared by
 * every strategy that scans JS/TS codebases (NextJS, React Native, etc.).
 *
 * Technology-specific detectors (e.g. Next.js client-server mixing, React
 * Native FlatList optimisation) remain in their respective technique folders.
 */

export { checkLargeFile } from './nextjs/large-file';
export { checkDuplication } from './nextjs/duplication';
export { checkLongFunctions } from './nextjs/long-functions';
export { checkConsoleStatements } from './nextjs/console-statements';
export { checkAnyTypes } from './nextjs/any-types';
export { checkUnusedImports } from './nextjs/unused-imports';
export { checkComplexConditionals } from './nextjs/complex-conditionals';
export { checkMagicNumbers } from './nextjs/magic-numbers';
export { checkReactHookDeps } from './nextjs/react-hook-deps';
