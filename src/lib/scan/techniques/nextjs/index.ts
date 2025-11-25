/**
 * Next.js scan techniques
 * Individual check functions for code quality and framework-specific patterns
 */

// Generic code quality techniques
export { checkLargeFile } from './large-file';
export { checkDuplication } from './duplication';
export { checkLongFunctions } from './long-functions';
export { checkConsoleStatements } from './console-statements';
export { checkAnyTypes } from './any-types';
export { checkUnusedImports } from './unused-imports';
export { checkComplexConditionals } from './complex-conditionals';
export { checkMagicNumbers } from './magic-numbers';
export { checkReactHookDeps } from './react-hook-deps';

// Next.js specific techniques
export { checkClientServerMixing } from './client-server-mixing';
export { checkImageOptimization } from './image-optimization';
export { checkDynamicImports } from './dynamic-imports';
export { checkMetadataAPI } from './metadata-api';
