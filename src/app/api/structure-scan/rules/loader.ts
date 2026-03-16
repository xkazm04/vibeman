/**
 * Rules Loader
 *
 * Loads structure rules from built-in rule files and optional custom rules
 * from the project root. Custom rules allow users to tailor structure scanning
 * to their specific project conventions.
 *
 * ## Custom Rules
 *
 * Place a `.structure-rules.json` file in your project root to define custom rules.
 * Custom rules are merged with (and can override) the built-in rules.
 *
 * ### File Format
 *
 * ```json
 * {
 *   "extends": "nextjs",
 *   "rules": [
 *     {
 *       "pattern": "src/modules/**",
 *       "description": "Feature modules organized by domain",
 *       "required": true,
 *       "examples": ["src/modules/auth/index.ts"]
 *     }
 *   ],
 *   "removePatterns": ["src/stores/**"]
 * }
 * ```
 *
 * ### Fields
 *
 * - `extends` (required): Base ruleset to extend — `"nextjs"` or `"fastapi"`
 * - `rules` (optional): Additional rules to merge into the base set
 * - `removePatterns` (optional): Patterns from the base set to remove
 *
 * ### Rule Fields
 *
 * - `pattern` (required): Glob pattern to match files/folders
 * - `description` (required): What should exist at this location (used by LLMs)
 * - `required` (optional): Whether this pattern is mandatory (default: false)
 * - `examples` (optional): Example file paths matching this pattern
 * - `context` (optional): Whether this defines a scannable context boundary
 */

import { logger } from '@/lib/logger';
import type { StructureRule } from '../structureTemplates';
import { NEXTJS_RULES } from './nextjs-rules';
import { FASTAPI_RULES } from './fastapi-rules';

/** Supported project types for built-in rules */
export type RulesetType = 'nextjs' | 'fastapi';

/** Schema for custom rules file (.structure-rules.json) */
export interface CustomRulesFile {
  extends: RulesetType;
  rules?: StructureRule[];
  removePatterns?: string[];
}

/** Validation errors for a custom rules file */
export interface RuleValidationError {
  field: string;
  message: string;
}

/** Result of loading rules — includes the rules and whether custom rules were applied */
export interface LoadedRules {
  rules: StructureRule[];
  isCustom: boolean;
}

const CUSTOM_RULES_FILENAME = '.structure-rules.json';

/**
 * Get built-in rules for a project type.
 */
export function getBuiltinRules(type: RulesetType): StructureRule[] {
  switch (type) {
    case 'nextjs':
      return NEXTJS_RULES;
    case 'fastapi':
      return FASTAPI_RULES;
    default:
      throw new Error(`Unknown project type: ${type}`);
  }
}

/**
 * Validate a single structure rule object.
 * Returns an array of validation errors (empty if valid).
 */
export function validateRule(rule: unknown, index: number): RuleValidationError[] {
  const errors: RuleValidationError[] = [];
  const prefix = `rules[${index}]`;

  if (typeof rule !== 'object' || rule === null) {
    errors.push({ field: prefix, message: 'Rule must be a non-null object' });
    return errors;
  }

  const r = rule as Record<string, unknown>;

  if (typeof r.pattern !== 'string' || r.pattern.trim() === '') {
    errors.push({ field: `${prefix}.pattern`, message: 'pattern must be a non-empty string' });
  }

  if (typeof r.description !== 'string' || r.description.trim() === '') {
    errors.push({
      field: `${prefix}.description`,
      message: 'description must be a non-empty string',
    });
  }

  if (r.required !== undefined && typeof r.required !== 'boolean') {
    errors.push({ field: `${prefix}.required`, message: 'required must be a boolean' });
  }

  if (r.examples !== undefined) {
    if (!Array.isArray(r.examples) || !r.examples.every((e) => typeof e === 'string')) {
      errors.push({ field: `${prefix}.examples`, message: 'examples must be an array of strings' });
    }
  }

  if (r.context !== undefined && typeof r.context !== 'boolean') {
    errors.push({ field: `${prefix}.context`, message: 'context must be a boolean' });
  }

  return errors;
}

/**
 * Validate a custom rules file structure.
 * Returns an array of validation errors (empty if valid).
 */
export function validateCustomRulesFile(data: unknown): RuleValidationError[] {
  const errors: RuleValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push({ field: 'root', message: 'Custom rules file must be a JSON object' });
    return errors;
  }

  const d = data as Record<string, unknown>;

  // Validate extends field
  if (typeof d.extends !== 'string' || !['nextjs', 'fastapi'].includes(d.extends)) {
    errors.push({
      field: 'extends',
      message: 'extends must be "nextjs" or "fastapi"',
    });
  }

  // Validate rules array
  if (d.rules !== undefined) {
    if (!Array.isArray(d.rules)) {
      errors.push({ field: 'rules', message: 'rules must be an array' });
    } else {
      for (let i = 0; i < d.rules.length; i++) {
        errors.push(...validateRule(d.rules[i], i));
      }
    }
  }

  // Validate removePatterns
  if (d.removePatterns !== undefined) {
    if (
      !Array.isArray(d.removePatterns) ||
      !d.removePatterns.every((p) => typeof p === 'string')
    ) {
      errors.push({
        field: 'removePatterns',
        message: 'removePatterns must be an array of strings',
      });
    }
  }

  return errors;
}

/**
 * Merge custom rules into base rules.
 * - Removes patterns listed in removePatterns
 * - Appends new custom rules
 * - Custom rules with the same pattern as a base rule replace the base rule
 */
function mergeRules(baseRules: StructureRule[], custom: CustomRulesFile): StructureRule[] {
  let merged = [...baseRules];

  // Remove patterns the user wants excluded
  if (custom.removePatterns && custom.removePatterns.length > 0) {
    const removeSet = new Set(custom.removePatterns);
    merged = merged.filter((r) => !removeSet.has(r.pattern));
  }

  // Merge custom rules — replace if same pattern exists, otherwise append
  if (custom.rules && custom.rules.length > 0) {
    for (const customRule of custom.rules) {
      const existingIndex = merged.findIndex((r) => r.pattern === customRule.pattern);
      if (existingIndex >= 0) {
        merged[existingIndex] = customRule;
      } else {
        merged.push(customRule);
      }
    }
  }

  return merged;
}

/**
 * Load rules for a project type, with optional custom rules from the project root.
 * Server-side only — reads from the filesystem.
 *
 * @param type - The project type to load rules for
 * @param projectRoot - Optional project root path (defaults to process.cwd())
 */
export async function loadRules(
  type: RulesetType,
  projectRoot?: string,
): Promise<LoadedRules> {
  const baseRules = getBuiltinRules(type);

  // Client-side: return built-in rules only
  if (typeof window !== 'undefined') {
    return { rules: baseRules, isCustom: false };
  }

  // Server-side: check for custom rules file
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const root = projectRoot ?? process.cwd();
    const customPath = path.join(root, CUSTOM_RULES_FILENAME);

    try {
      const content = await fs.readFile(customPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);

      // Validate the custom rules file
      const validationErrors = validateCustomRulesFile(parsed);
      if (validationErrors.length > 0) {
        logger.warn('Invalid custom rules file, using built-in rules', {
          path: customPath,
          errors: validationErrors,
        });
        return { rules: baseRules, isCustom: false };
      }

      const customRules = parsed as CustomRulesFile;

      // Only apply if extends matches requested type
      if (customRules.extends !== type) {
        return { rules: baseRules, isCustom: false };
      }

      const merged = mergeRules(baseRules, customRules);
      return { rules: merged, isCustom: true };
    } catch {
      // File doesn't exist or can't be parsed — use defaults
      return { rules: baseRules, isCustom: false };
    }
  } catch (error) {
    logger.warn('Failed to check for custom rules file', { error });
    return { rules: baseRules, isCustom: false };
  }
}
