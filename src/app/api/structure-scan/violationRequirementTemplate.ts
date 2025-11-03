/**
 * Template for generating Claude Code requirement files for structure violations
 *
 * IMPORTANT: To modify structure rules, edit the EnforcedStructure definitions in
 * structureTemplates.ts. The getNextJSGuidelines() and getFastAPIGuidelines()
 * functions in this file dynamically parse those structures.
 *
 * Do NOT hardcode structure rules here - they should come from structureTemplates.ts
 */

import {
  getEnforcedStructure,
  generateGuidelinesFromEnforcedStructure,
} from './structureTemplates';

export interface StructureViolation {
  filePath: string;
  violationType: 'misplaced' | 'anti-pattern' | 'missing-structure';
  currentLocation: string;
  expectedLocation: string;
  reason: string;
  rule: string;
}

export interface RequirementFileConfig {
  projectType: 'nextjs' | 'fastapi';
  projectPath: string;
  violations: StructureViolation[];
  batchNumber: number;
  totalBatches: number;
}

/**
 * Helper: Get issue type label
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
 * Helper: Get action required text based on violation type
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
 * Helper: Format a single violation for the requirement file
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
 * Generate a Claude Code requirement file for structure violations
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
 * Generate a filename for the requirement file
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
