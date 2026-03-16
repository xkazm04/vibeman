/**
 * Violation Requirement Template Module
 *
 * Generates Markdown requirement files from detected structure violations.
 * These files are designed to be consumed by Claude Code or reviewed by
 * developers during refactoring.
 *
 * ## How to Add or Modify Structure Rules
 *
 * Structure rules are defined in `structureTemplates.ts`, NOT in this file.
 * This file only formats violations into readable requirement documents.
 *
 * To add a new rule:
 * 1. Open `structureTemplates.ts`
 * 2. Find the `EnforcedStructure` for your project type (e.g. `NEXTJS_ENFORCED_STRUCTURE`)
 * 3. Add a `DirectoryRule` to `directoryRules` for folder-level enforcement, or
 *    add an entry to `antiPatterns` for glob-based pattern detection
 * 4. For `DirectoryRule`:
 *    - Set `path` to the directory being enforced (e.g. `'src/app'`)
 *    - List allowed folders/files with name patterns and descriptions
 *    - Set `strictMode: true` to disallow anything not explicitly listed
 *    - Nest rules via `subdirectoryRules` for deeper enforcement
 * 5. For `antiPatterns`:
 *    - Set `pattern` to a glob (e.g. `'src/utils/**'`)
 *    - Provide `description` explaining why it's an anti-pattern
 *    - Set `suggestedLocation` to guide the developer
 *
 * The `getNextJSGuidelines()` and `getFastAPIGuidelines()` functions in this
 * file dynamically parse those structures — do NOT hardcode rules here.
 *
 * @module violationRequirementTemplate
 */

import {
  getEnforcedStructure,
  generateGuidelinesFromEnforcedStructure,
} from './structureTemplates';

/**
 * A single structure violation detected during a project scan.
 *
 * Used throughout the scanning pipeline — from detection in
 * `violationDetector` through to requirement generation.
 */
export interface StructureViolation {
  /** Relative path to the violating file or directory. */
  filePath: string;
  /** Classification of the violation. */
  violationType: 'misplaced' | 'anti-pattern' | 'missing-structure';
  /** Where the item currently lives. */
  currentLocation: string;
  /** Where the item should be moved or what structure should be created. */
  expectedLocation: string;
  /** Human-readable explanation of why this is a violation. */
  reason: string;
  /** The rule or pattern that triggered this violation. */
  rule: string;
}

/**
 * Configuration for generating a batched requirement file.
 *
 * When many violations are found, they can be split into batches
 * so each requirement file stays focused and manageable.
 */
export interface RequirementFileConfig {
  /** The project framework type. */
  projectType: 'nextjs' | 'fastapi';
  /** Absolute path to the project root. */
  projectPath: string;
  /** Violations included in this batch. */
  violations: StructureViolation[];
  /** 1-based index of this batch. */
  batchNumber: number;
  /** Total number of batches. */
  totalBatches: number;
}

/**
 * Map a violation type to a human-readable label for requirement files.
 *
 * @param violationType - The violation type string
 * @returns A descriptive label (e.g. `'File in wrong location'`)
 */
function getIssueTypeLabel(violationType: string): string {
  switch (violationType) {
    case 'misplaced':
      return 'File in wrong location';
    case 'anti-pattern':
      return 'Anti-pattern detected';
    default:
      return 'Missing expected structure';
  }
}

/**
 * Generate actionable Markdown instructions for resolving a violation.
 *
 * @param violation - The violation to generate instructions for
 * @returns A Markdown bullet list describing the required actions
 */
function getActionRequiredText(violation: StructureViolation): string {
  switch (violation.violationType) {
    case 'misplaced':
      return `- Move \`${violation.currentLocation}\` to \`${violation.expectedLocation}\`
- Update all imports that reference this file
- Verify the file works correctly in the new location`;
    case 'anti-pattern':
      return `- Refactor or relocate \`${violation.currentLocation}\`
- Follow the pattern: ${violation.expectedLocation}
- Update imports and references`;
    default:
      return `- Create the expected structure at \`${violation.expectedLocation}\`
- Follow the guideline: ${violation.reason}`;
  }
}

/**
 * Format a single violation as a numbered Markdown section.
 *
 * @param violation - The violation to format
 * @param index - Zero-based index (rendered as 1-based in output)
 * @returns A Markdown string with issue details and action items
 */
function formatViolation(violation: StructureViolation, index: number): string {
  return `
### ${index + 1}. ${violation.filePath}

**Issue**: ${getIssueTypeLabel(violation.violationType)}

**Current Location**: \`${violation.currentLocation}\`

**Expected Location**: \`${violation.expectedLocation}\`

**Reason**: ${violation.reason}

**Action Required**:
${getActionRequiredText(violation)}
`;
}

/**
 * Generate a complete Markdown requirement file for a batch of violations.
 *
 * The output includes an overview, detailed violation sections, project-type-
 * specific guidelines, step-by-step instructions, and success criteria.
 *
 * @param config - Configuration specifying the project, violations, and batch info
 * @returns A full Markdown document string ready to be written to disk
 *
 * @example
 * ```ts
 * const md = generateViolationRequirement({
 *   projectType: 'nextjs',
 *   projectPath: '/home/user/my-app',
 *   violations: detectedViolations,
 *   batchNumber: 1,
 *   totalBatches: 1,
 * });
 * ```
 */
export function generateViolationRequirement(config: RequirementFileConfig): string {
  const { projectType, projectPath, violations, batchNumber, totalBatches } = config;

  const violationsList = violations
    .map((v, idx) => formatViolation(v, idx))
    .join('\n---\n');

  return `# Structure Refactoring (Batch ${batchNumber}/${totalBatches})

## Project Type: ${projectType === 'nextjs' ? 'Next.js 15 (App Router)' : 'FastAPI'}

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected

${violationsList}

## General Structure Guidelines for ${projectType === 'nextjs' ? 'Next.js' : 'FastAPI'}

${projectType === 'nextjs' ? getNextJSGuidelines() : getFastAPIGuidelines()}

## Instructions

1. **Review Each Violation**: Understand why the current structure is problematic
2. **Plan the Refactoring**: Identify all files that need to be moved/modified
3. **Move Files Systematically**: Use your file operations to move files
4. **Update Imports**: Search for and update all import statements that reference moved files
5. **Test After Each Move**: Verify the application still works correctly
6. **Commit Changes**: Group related moves into logical commits

## Important Notes

- **DO NOT** break existing functionality while refactoring
- **DO** update all import statements after moving files
- **DO** test the application after major structural changes
- **DO** preserve file content - only change locations and imports
- **AVOID** moving too many files at once - refactor incrementally

## Success Criteria

✅ All ${violations.length} violations in this batch are resolved
✅ All imports are updated and working
✅ Application builds without errors
✅ No broken functionality

## Project Path

\`${projectPath}\`

Begin refactoring now. Work through each violation systematically.
`;
}

function getNextJSGuidelines(): string {
  const enforcedStructure = getEnforcedStructure('nextjs');

  if (enforcedStructure) {
    // Use dynamically generated guidelines from enforced structure
    return generateGuidelinesFromEnforcedStructure(enforcedStructure);
  }

  // Fallback to hardcoded guidelines if enforced structure not available
  return `
### Next.js 15 App Router Structure

**Core Directories:**
- \`src/app/\` - Pages, layouts, and route handlers (App Router)
- \`src/app/api/\` - API routes (route.ts files)
- \`src/app/[feature]/\` - Feature-specific pages and components
- \`src/components/\` - Shared/reusable components only
- \`src/lib/\` - Business logic, utilities, services
- \`src/stores/\` - Zustand state management
- \`src/hooks/\` - Custom React hooks
- \`src/types/\` - TypeScript type definitions
- \`src/lib/queries/\` - Database query functions

**Key Principles:**
1. **Feature Co-location**: Keep feature-specific components in their feature folders (e.g., \`src/app/goals/GoalsList.tsx\`)
2. **Shared Components**: Only put truly reusable components in \`src/components/\`
3. **App Router Only**: Use \`src/app/\` not \`src/pages/\` (Pages Router is legacy)
4. **Consistent Naming**: Use \`src/lib/\` for all utilities (not utils/, helpers/, etc.)
5. **API Routes**: Follow Next.js conventions with route.ts files
`;
}

function getFastAPIGuidelines(): string {
  const enforcedStructure = getEnforcedStructure('fastapi');

  if (enforcedStructure) {
    // Use dynamically generated guidelines from enforced structure
    return generateGuidelinesFromEnforcedStructure(enforcedStructure);
  }

  // Fallback to hardcoded guidelines if enforced structure not available
  // TODO: Create FASTAPI_ENFORCED_STRUCTURE in structureTemplates.ts for dynamic guidelines
  return `
### FastAPI Project Structure

**Core Directories:**
- \`app/\` - All application code goes here
- \`app/main.py\` - FastAPI app instance and startup
- \`app/api/\` - API route handlers (routers)
- \`app/models/\` - Database models and Pydantic schemas
- \`app/services/\` - Business logic layer
- \`app/core/\` - Configuration, settings, security
- \`app/db/\` - Database connection and session management
- \`app/crud/\` - Database CRUD operations

**Key Principles:**
1. **Separation of Concerns**: Keep routes, services, and data access separate
2. **Single Responsibility**: Each module should have one clear purpose
3. **Dependency Injection**: Use FastAPI's dependency system
4. **Configuration**: Centralize config in \`app/core/config.py\`
5. **Type Safety**: Use Pydantic models for validation
`;
}

/**
 * Generate a dated filename for a requirement file.
 *
 * Single-batch format: `refactor-structure-{type}-{YYYYMMDD}`
 * Multi-batch format:  `refactor-structure-{type}-{YYYYMMDD}-batch-{n}-of-{total}`
 *
 * @param projectType - The project type slug (e.g. `'nextjs'`)
 * @param batchNumber - 1-based batch index
 * @param totalBatches - Total number of batches
 * @returns A filename string (without extension)
 *
 * @example
 * ```ts
 * generateRequirementFileName('nextjs', 1, 1);
 * // => 'refactor-structure-nextjs-20250315'
 *
 * generateRequirementFileName('nextjs', 2, 3);
 * // => 'refactor-structure-nextjs-20250315-batch-2-of-3'
 * ```
 */
export function generateRequirementFileName(
  projectType: string,
  batchNumber: number,
  totalBatches: number
): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (totalBatches === 1) {
    return `refactor-structure-${projectType}-${timestamp}`;
  }
  return `refactor-structure-${projectType}-${timestamp}-batch-${batchNumber}-of-${totalBatches}`;
}
