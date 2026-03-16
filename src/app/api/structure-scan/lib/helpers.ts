import * as fs from 'fs/promises';
import * as path from 'path';
import { StructureViolation } from '../violationRequirementTemplate';
import { ProjectStructureTemplate } from '../structureTemplates';
import {
  getAllFiles,
  matchPattern,
  getDefaultIgnorePatterns,
  normalizePath,
} from './fileScanner';
import {
  generateViolationRequirement,
  generateRequirementFileName,
} from '../violationRequirementTemplate';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { logger } from '@/lib/logger';

/**
 * Structure Scan Helpers
 *
 * Utility functions for the structure-scan API endpoints. Includes request
 * validation, fallback template-based scanning, shared component analysis,
 * and batched requirement file generation.
 */

/** Maximum number of violations to include in a single requirement file. */
const MAX_VIOLATIONS_PER_FILE = 20;

/** Validated request body for the structure scan endpoint. */
export interface ScanRequestBody {
  projectPath: string;
  projectType: 'nextjs' | 'fastapi';
  projectId?: string;
}

/**
 * Validate and type-narrow the request body for a structure scan.
 *
 * @param body - The raw parsed JSON body
 * @returns An object with `valid: true` and typed `data`, or `valid: false` and an `error` message
 */
export function validateScanRequest(
  body: Record<string, unknown>
): { valid: true; data: ScanRequestBody } | { valid: false; error: string } {
  if (!body.projectPath || !body.projectType) {
    return { valid: false, error: 'projectPath and projectType are required' };
  }

  if (body.projectType !== 'nextjs' && body.projectType !== 'fastapi') {
    return { valid: false, error: 'projectType must be "nextjs" or "fastapi"' };
  }

  return {
    valid: true,
    data: {
      projectPath: body.projectPath as string,
      projectType: body.projectType as 'nextjs' | 'fastapi',
      projectId: body.projectId as string | undefined,
    },
  };
}

/**
 * Determine the suggested location for a file that matches an anti-pattern.
 *
 * Maps common anti-pattern paths (e.g. `src/pages/`, `src/utils/`) to
 * their recommended alternatives.
 *
 * @param file - The relative file path that triggered the anti-pattern
 * @param rule - The rule that was matched (used as fallback reason)
 * @returns An object with `location` and `reason` strings
 */
export function getExpectedLocationForAntiPattern(
  file: string,
  rule: { description: string }
): { location: string; reason: string } {
  const normalized = normalizePath(file);

  if (normalized.includes('src/pages/')) {
    return {
      location: normalized.replace('src/pages/', 'src/app/'),
      reason: 'Use App Router (src/app/) instead of Pages Router (src/pages/)',
    };
  }
  if (normalized.includes('src/utils/')) {
    return {
      location: normalized.replace('src/utils/', 'src/lib/'),
      reason: 'Use src/lib/ instead of src/utils/ for consistency',
    };
  }
  if (normalized.includes('src/helpers/')) {
    return {
      location: normalized.replace('src/helpers/', 'src/lib/'),
      reason: 'Use src/lib/ instead of src/helpers/ for consistency',
    };
  }
  if (normalized.includes('app/utils/')) {
    return {
      location: normalized.replace('app/utils/', 'app/core/'),
      reason: 'Use app/core/ instead of app/utils/ for better organization',
    };
  }
  if (normalized.includes('app/helpers/')) {
    return {
      location: normalized.replace('app/helpers/', 'app/core/'),
      reason: 'Use app/core/ instead of app/helpers/ for better organization',
    };
  }

  return { location: 'See structure guidelines', reason: rule.description };
}

/**
 * Check shared components in `src/components/` for potential misplacement.
 *
 * If a component's name starts with a capitalized word that matches an
 * existing feature folder under `src/app/`, the component is flagged as
 * feature-specific and should be co-located with its feature.
 *
 * @param projectPath - Absolute path to the project root
 * @param allFiles - Pre-scanned list of relative file paths
 * @param violations - Mutable array to push violations into
 */
export async function checkSharedComponents(
  projectPath: string,
  allFiles: string[],
  violations: StructureViolation[]
): Promise<void> {
  const sharedComponents = matchPattern(allFiles, 'src/components/**/*.tsx')
    .filter(file => !file.startsWith('src/components/ui/'));

  if (sharedComponents.length === 0) return;

  for (const component of sharedComponents) {
    const componentName = path.basename(component, '.tsx');
    const featureMatch = componentName.match(/^([A-Z][a-z]+)/);

    if (featureMatch) {
      const featureName = featureMatch[1].toLowerCase();
      const featurePath = path.join(projectPath, 'src', 'app', featureName);

      try {
        await fs.access(featurePath);
        violations.push({
          filePath: component,
          violationType: 'misplaced',
          currentLocation: component,
          expectedLocation: `src/app/${featureName}/${componentName}.tsx`,
          reason: `Component appears to be ${featureName}-specific and should be co-located with its feature`,
          rule: 'Feature co-location',
        });
      } catch {
        // Feature folder doesn't exist, component is likely truly shared
      }
    }
  }
}

/**
 * Scan a project for violations using the template-based fallback method.
 *
 * Used when no enforced structure is available (e.g. FastAPI projects).
 * Checks files against anti-pattern rules in the template and, for Next.js
 * projects, also checks for misplaced shared components.
 *
 * @param projectPath - Absolute path to the project root
 * @param template - The project structure template containing rules
 * @returns Array of detected {@link StructureViolation} objects
 */
export async function scanForViolations(
  projectPath: string,
  template: ProjectStructureTemplate
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  const allFiles = await getAllFiles(projectPath, getDefaultIgnorePatterns());
  if (allFiles.length === 0) return violations;

  // Check anti-pattern rules (those with 'AVOID' in description)
  for (const rule of template.rules) {
    if (!rule.description.includes('AVOID')) continue;

    const matchedFiles = matchPattern(allFiles, rule.pattern);
    for (const file of matchedFiles) {
      const { location, reason } = getExpectedLocationForAntiPattern(file, rule);
      violations.push({
        filePath: file,
        violationType: 'anti-pattern',
        currentLocation: file,
        expectedLocation: location,
        reason,
        rule: rule.pattern,
      });
    }
  }

  // Next.js-specific: check for misplaced shared components
  if (template.type === 'nextjs') {
    await checkSharedComponents(projectPath, allFiles, violations);
  }

  return violations;
}

/**
 * Delete previously generated structure-scan requirement files.
 *
 * Removes any `.md` files in the given directory whose names start
 * with `"refactor-structure-"`.
 *
 * @param commandsDir - Absolute path to the commands directory
 */
export async function cleanOldRequirementFiles(commandsDir: string): Promise<void> {
  try {
    const files = await fs.readdir(commandsDir);
    for (const file of files) {
      if (file.startsWith('refactor-structure-') && file.endsWith('.md')) {
        await fs.unlink(path.join(commandsDir, file));
      }
    }
  } catch {
    // Directory may not exist yet
  }
}

/**
 * Generate batched requirement files from a list of violations.
 *
 * Violations are split into batches of {@link MAX_VIOLATIONS_PER_FILE},
 * and each batch is written as a Claude Code requirement file under
 * `<projectPath>/.claude/commands/`.
 *
 * @param projectPath - Absolute path to the project root
 * @param projectType - The project type (`"nextjs"` or `"fastapi"`)
 * @param violations - The violations to generate requirement files for
 * @returns Array of created requirement file names
 */
export async function generateRequirementFiles(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi',
  violations: StructureViolation[]
): Promise<string[]> {
  const commandsDir = path.join(projectPath, '.claude', 'commands');

  try {
    await fs.mkdir(commandsDir, { recursive: true });
  } catch {
    // May already exist
  }

  await cleanOldRequirementFiles(commandsDir);

  const batches: StructureViolation[][] = [];
  for (let i = 0; i < violations.length; i += MAX_VIOLATIONS_PER_FILE) {
    batches.push(violations.slice(i, i + MAX_VIOLATIONS_PER_FILE));
  }

  const totalBatches = batches.length;
  const requirementFiles: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchNumber = i + 1;
    const content = generateViolationRequirement({
      projectType,
      projectPath,
      violations: batches[i],
      batchNumber,
      totalBatches,
    });

    const fileName = generateRequirementFileName(projectType, batchNumber, totalBatches);
    const result = createRequirement(projectPath, fileName, content);

    if (result.success) {
      requirementFiles.push(fileName);
    } else {
      logger.error(`Failed to create requirement: ${fileName}`, { error: result.error });
    }
  }

  return requirementFiles;
}
