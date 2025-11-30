/**
 * Code Generation Validators
 *
 * Reusable, testable validation functions for generated code.
 * Each validator checks for specific code quality issues.
 */

import { GeneratedCode } from '@/app/db';

/**
 * Result of a single validation check
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Combined validation result with aggregated errors and warnings
 */
export interface CombinedValidationResult extends ValidationResult {
  validatorResults: Record<string, ValidationResult>;
}

/**
 * Validator function signature
 */
export type ValidatorFn = (code: GeneratedCode, index: number) => ValidationResult;

/**
 * Creates an empty validation result
 */
function createEmptyResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

/**
 * Validates that file paths are relative, not absolute.
 * Absolute paths are problematic as they are machine-specific.
 *
 * @param code - The generated code entry to validate
 * @param index - The index of this entry in the code array
 * @returns Validation result with errors if absolute paths detected
 *
 * @example
 * // Returns error for Unix absolute path
 * validateNoAbsolutePaths({ file_path: '/Users/project/src/file.ts', ... }, 0)
 * // Returns error for Windows absolute path
 * validateNoAbsolutePaths({ file_path: 'C:\\Projects\\file.ts', ... }, 0)
 * // Returns valid for relative path
 * validateNoAbsolutePaths({ file_path: 'src/components/Button.tsx', ... }, 0)
 */
export function validateNoAbsolutePaths(code: GeneratedCode, index: number): ValidationResult {
  const result = createEmptyResult();

  const isUnixAbsolutePath = code.file_path.startsWith('/');
  const isWindowsAbsolutePath = /^[A-Z]:\\/.test(code.file_path);
  const isAbsolutePath = isUnixAbsolutePath || isWindowsAbsolutePath;

  if (isAbsolutePath) {
    result.valid = false;
    result.errors.push(`File ${index}: Should use relative path, not absolute: ${code.file_path}`);
  }

  return result;
}

/**
 * Validates that TypeScript files include type definitions.
 * New TypeScript files should define interfaces or types.
 *
 * @param code - The generated code entry to validate
 * @param index - The index of this entry in the code array
 * @returns Validation result with warnings if types are missing
 *
 * @example
 * // Returns warning for new .ts file without type definitions
 * validateTypeScriptTypes({ file_path: 'src/utils.ts', content: 'function foo() {}', action: 'create', ... }, 0)
 * // Returns valid for file with interface
 * validateTypeScriptTypes({ file_path: 'src/types.ts', content: 'interface User {}', action: 'create', ... }, 0)
 */
export function validateTypeScriptTypes(code: GeneratedCode, index: number): ValidationResult {
  const result = createEmptyResult();

  const isTypeScriptFile = code.file_path.endsWith('.ts') || code.file_path.endsWith('.tsx');
  const hasInterface = code.content.includes('interface');
  const hasTypeDefinition = code.content.includes('type ');
  const isNewFile = code.action === 'create';
  const lacksTypeDefinitions = !hasInterface && !hasTypeDefinition;

  if (isTypeScriptFile && lacksTypeDefinitions && isNewFile) {
    result.warnings.push(`File ${index}: TypeScript file might benefit from type definitions`);
  }

  return result;
}

/**
 * Validates that async functions have proper error handling.
 * Async code without try-catch can lead to unhandled rejections.
 *
 * @param code - The generated code entry to validate
 * @param index - The index of this entry in the code array
 * @returns Validation result with warnings if error handling is missing
 *
 * @example
 * // Returns warning for async function without try-catch
 * validateErrorHandling({ content: 'async function fetch() { await api.get(); }', ... }, 0)
 * // Returns valid for async function with try-catch
 * validateErrorHandling({ content: 'async function fetch() { try { await api.get(); } catch (e) {} }', ... }, 0)
 */
export function validateErrorHandling(code: GeneratedCode, index: number): ValidationResult {
  const result = createEmptyResult();

  const hasAsyncCode = code.content.includes('async');
  const hasTryBlock = code.content.includes('try');
  const hasCatchBlock = code.content.includes('catch');
  const lacksErrorHandling = hasAsyncCode && !hasTryBlock && !hasCatchBlock;

  if (lacksErrorHandling) {
    result.warnings.push(`File ${index}: Async function missing try-catch error handling`);
  }

  return result;
}

/**
 * Validates Next.js specific conventions.
 * - Page components must have default exports
 * - Files in src directory should use @/ path alias
 *
 * @param code - The generated code entry to validate
 * @param index - The index of this entry in the code array
 * @returns Validation result with errors/warnings for convention violations
 *
 * @example
 * // Returns error for page without default export
 * validateNextJsConventions({ file_path: 'app/page.tsx', content: 'export const Page = () => {}', ... }, 0)
 * // Returns warning for missing path alias
 * validateNextJsConventions({ file_path: 'src/components/Button.tsx', content: 'import { x } from "../lib"', ... }, 0)
 */
export function validateNextJsConventions(code: GeneratedCode, index: number): ValidationResult {
  const result = createEmptyResult();

  // Check for path alias usage in Next.js files
  const isInSrcDirectory = code.file_path.includes('src/');
  const usesPathAlias = code.content.includes('@/');

  if (isInSrcDirectory && !usesPathAlias) {
    result.warnings.push(`File ${index}: Consider using @/ path alias for imports`);
  }

  // Check file path structure for Next.js
  const isNextJsAppPage = code.file_path.includes('app/') && code.file_path.endsWith('page.tsx');
  const hasDefaultExport = code.content.includes('export default');

  if (isNextJsAppPage && !hasDefaultExport) {
    result.valid = false;
    result.errors.push(`File ${index}: Next.js page component must have default export`);
  }

  return result;
}

/**
 * Merges multiple validation results into one.
 */
function mergeResults(results: ValidationResult[]): ValidationResult {
  return results.reduce(
    (acc, result) => ({
      valid: acc.valid && result.valid,
      errors: [...acc.errors, ...result.errors],
      warnings: [...acc.warnings, ...result.warnings],
    }),
    createEmptyResult()
  );
}

/**
 * Composes multiple validators and runs them all on a single code entry.
 *
 * @param validators - Array of validator functions to apply
 * @returns A combined validator function
 */
export function composeValidators(...validators: ValidatorFn[]): ValidatorFn {
  return (code: GeneratedCode, index: number): ValidationResult => {
    const results = validators.map(validator => validator(code, index));
    return mergeResults(results);
  };
}

/**
 * Default validators used for standard code validation
 */
export const defaultValidators: ValidatorFn[] = [
  validateNoAbsolutePaths,
  validateTypeScriptTypes,
  validateErrorHandling,
  validateNextJsConventions,
];

/**
 * Validates generated code using all default validators.
 * This is the main entry point for code validation.
 *
 * @param code - Array of generated code entries to validate
 * @returns Combined validation result with all errors and warnings
 *
 * @example
 * const result = validateGeneratedCode(generatedFiles);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Warnings:', result.warnings);
 * }
 */
export function validateGeneratedCode(code: GeneratedCode[]): ValidationResult {
  const composedValidator = composeValidators(...defaultValidators);
  const results = code.map((file, index) => composedValidator(file, index));
  return mergeResults(results);
}

/**
 * Validates generated code with detailed results per validator.
 * Useful for debugging or showing specific validation feedback.
 *
 * @param code - Array of generated code entries to validate
 * @returns Combined result with individual validator results
 */
export function validateGeneratedCodeDetailed(code: GeneratedCode[]): CombinedValidationResult {
  const validatorResults: Record<string, ValidationResult> = {
    absolutePaths: createEmptyResult(),
    typeScriptTypes: createEmptyResult(),
    errorHandling: createEmptyResult(),
    nextJsConventions: createEmptyResult(),
  };

  code.forEach((file, index) => {
    // Run each validator and collect results
    const absolutePathsResult = validateNoAbsolutePaths(file, index);
    const typeScriptTypesResult = validateTypeScriptTypes(file, index);
    const errorHandlingResult = validateErrorHandling(file, index);
    const nextJsConventionsResult = validateNextJsConventions(file, index);

    // Merge into validator-specific results
    validatorResults.absolutePaths = mergeResults([validatorResults.absolutePaths, absolutePathsResult]);
    validatorResults.typeScriptTypes = mergeResults([validatorResults.typeScriptTypes, typeScriptTypesResult]);
    validatorResults.errorHandling = mergeResults([validatorResults.errorHandling, errorHandlingResult]);
    validatorResults.nextJsConventions = mergeResults([validatorResults.nextJsConventions, nextJsConventionsResult]);
  });

  // Combine all results
  const allResults = Object.values(validatorResults);
  const combined = mergeResults(allResults);

  return {
    ...combined,
    validatorResults,
  };
}
