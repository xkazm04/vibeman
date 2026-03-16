import { EnforcedStructure, DirectoryRule } from '../structureTemplates';
import { StructureViolation } from '../violationRequirementTemplate';
import {
  matchesNamePattern,
  matchesPathPattern,
  matchPattern,
  getProjectDirectories,
  getDefaultIgnorePatterns,
  ScannedItem,
} from './fileScanner';

/**
 * Violation Detector Module
 *
 * Detects structure violations by comparing the project's file tree
 * against a set of enforced directory rules and anti-pattern definitions.
 *
 * The detection pipeline:
 * 1. Scans the project file tree via {@link getProjectDirectories}
 * 2. Checks for missing top-level structure (e.g. `src/`)
 * 3. Walks every item against hierarchical {@link DirectoryRule} definitions
 * 4. Matches files against anti-pattern glob patterns
 *
 * @module violationDetector
 */

/** Standard top-level folders expected in a Next.js project. */
const STANDARD_FOLDERS = ['src', 'public', 'node_modules', '.next', '.git', 'dist', 'build'];

/** Standard hidden folders that are allowed at the project root. */
const STANDARD_HIDDEN_FOLDERS = ['.next', '.git', '.vscode', '.idea', '.claude'];

/**
 * Check if a file or folder is allowed within a directory rule.
 *
 * Iterates the rule's allowed folders or files (depending on `isDirectory`)
 * and returns whether a match was found. In strict mode, unmatched items
 * are disallowed; in non-strict mode they are allowed by default.
 *
 * @param itemName - The name of the file or folder
 * @param isDirectory - Whether the item is a directory
 * @param rule - The directory rule to check against
 * @returns Whether the item is allowed, and any matched pattern info
 */
function isAllowedInDirectory(
  itemName: string,
  isDirectory: boolean,
  rule: DirectoryRule
): { allowed: boolean; matchedPattern?: string; description?: string } {
  const allowedItems = isDirectory ? rule.allowedFolders : rule.allowedFiles;

  if (allowedItems) {
    for (const itemRule of allowedItems) {
      if (matchesNamePattern(itemName, itemRule.name)) {
        return {
          allowed: true,
          matchedPattern: itemRule.name,
          description: itemRule.description,
        };
      }
    }
  }

  return { allowed: !rule.strictMode };
}

/**
 * Find the most specific directory rule that applies to a given path.
 *
 * Walks the rule hierarchy depth-first, tracking the deepest rule whose
 * path is either an exact/pattern match or a prefix of `targetPath`.
 *
 * @param targetPath - The relative directory path to look up
 * @param allRules - Top-level directory rules to search
 * @returns The most specific matching rule, or `null` if none matches
 */
function findApplicableRule(
  targetPath: string,
  allRules: DirectoryRule[]
): DirectoryRule | null {
  let bestMatch: DirectoryRule | null = null;
  let bestMatchDepth = -1;

  function searchRules(rules: DirectoryRule[], depth: number = 0) {
    for (const rule of rules) {
      if (targetPath === rule.path || matchesPathPattern(targetPath, rule.path)) {
        if (depth > bestMatchDepth) {
          bestMatch = rule;
          bestMatchDepth = depth;
        }
      } else if (targetPath.startsWith(rule.path + '/')) {
        if (depth > bestMatchDepth) {
          bestMatch = rule;
          bestMatchDepth = depth;
        }

        if (rule.subdirectoryRules) {
          searchRules(rule.subdirectoryRules, depth + 1);
        }
      }
    }
  }

  searchRules(allRules);
  return bestMatch;
}

/**
 * Suggest a corrected location for a misplaced file or folder.
 *
 * @param itemName - The file or folder name
 * @param parentPath - The parent directory's relative path
 * @returns A human-readable suggestion for where the item should live
 */
function getSuggestedLocation(itemName: string, parentPath: string): string {
  if (parentPath === 'src') {
    if (itemName.endsWith('.tsx') || itemName.endsWith('.ts')) {
      return 'src/lib/ or src/components/ or src/app/features/';
    }
    return 'Move to appropriate subfolder (app, components, lib, hooks, stores, types)';
  }

  if (parentPath === 'src/app') {
    if (itemName.toLowerCase().includes('component')) {
      return 'src/app/features/components/';
    }
    if (!itemName.endsWith('-page')) {
      return `Rename to ${itemName}-page/ or move to src/app/features/`;
    }
    return 'src/app/features/ or rename to follow *-page pattern';
  }

  return 'Relocate or remove - see structure guidelines';
}

/**
 * Check whether a top-level folder is a recognized standard location.
 *
 * @param itemPath - Relative path whose first segment is tested
 * @returns `true` if the first-level folder is standard or a known hidden folder
 */
function isInStandardLocation(itemPath: string): boolean {
  const firstLevelFolder = itemPath.split('/')[0];
  const isStandard = STANDARD_FOLDERS.includes(firstLevelFolder);
  const isHidden = firstLevelFolder.startsWith('.');
  const isStandardHidden = isHidden && STANDARD_HIDDEN_FOLDERS.includes(firstLevelFolder);

  return isStandard || (isHidden && isStandardHidden);
}

/**
 * Check whether the project contains a `src/` folder and, if the enforced
 * structure expects one, push a violation when it is missing.
 *
 * @param items - All scanned items in the project
 * @param enforcedStructure - The enforced structure definition
 * @param violations - Mutable array to push violations into
 */
function checkForMissingSrcFolder(
  items: Map<string, ScannedItem>,
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): void {
  const hasSrcFolder = Array.from(items.keys()).some(p => p.startsWith('src/') || p === 'src');

  if (!hasSrcFolder && enforcedStructure.directoryRules[0]?.path === 'src') {
    violations.push({
      filePath: 'project-root',
      violationType: 'missing-structure',
      currentLocation: 'Project root',
      expectedLocation: 'Create src/ folder at project root',
      reason: 'Project structure expects a src/ folder containing app, components, lib, etc. but src/ folder is missing.',
      rule: 'Root structure',
    });
  }
}

/**
 * Check every scanned item against the enforced directory rules.
 *
 * Items at the project root (no parent path) are skipped. Items whose
 * parent has no matching rule are flagged if they sit outside a standard
 * top-level folder.
 *
 * @param items - All scanned items in the project
 * @param enforcedStructure - The enforced structure definition
 * @param violations - Mutable array to push violations into
 */
function processItemsAgainstRules(
  items: Map<string, ScannedItem>,
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): void {
  for (const [itemPath, itemInfo] of items.entries()) {
    const parts = itemPath.split('/');
    const itemName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    // Skip root-level items (no parent)
    if (!parentPath) continue;

    const applicableRule = findApplicableRule(parentPath, enforcedStructure.directoryRules);

    if (!applicableRule) {
      if (!isInStandardLocation(itemPath)) {
        const firstLevelFolder = itemPath.split('/')[0];
        const isHidden = firstLevelFolder.startsWith('.');
        violations.push({
          filePath: itemPath,
          violationType: 'anti-pattern',
          currentLocation: itemPath,
          expectedLocation: 'Move to src/ or remove',
          reason: `Item is in "${firstLevelFolder}/" which is not a standard Next.js folder. Expected structure has code in src/ folder. ${isHidden ? '(Non-standard hidden folder)' : ''}`,
          rule: 'Project root structure',
        });
      }
      continue;
    }

    const result = isAllowedInDirectory(itemName, itemInfo.isDirectory, applicableRule);

    if (!result.allowed) {
      const itemType = itemInfo.isDirectory ? 'Folder' : 'File';
      violations.push({
        filePath: itemPath,
        violationType: applicableRule.strictMode ? 'misplaced' : 'anti-pattern',
        currentLocation: itemPath,
        expectedLocation: getSuggestedLocation(itemName, parentPath),
        reason: `${itemType} "${itemName}" is not allowed in ${parentPath}/. ${applicableRule.strictMode ? '(Strict mode: only explicitly allowed items permitted)' : ''}`,
        rule: applicableRule.path,
      });
    }
  }
}

/**
 * Check all project files against the enforced anti-pattern definitions.
 *
 * Each anti-pattern has a glob pattern; any matching file produces a
 * violation with the suggested alternative location.
 *
 * @param items - All scanned items in the project
 * @param enforcedStructure - The enforced structure definition (may include `antiPatterns`)
 * @param violations - Mutable array to push violations into
 */
function checkAntiPatterns(
  items: Map<string, ScannedItem>,
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): void {
  if (!enforcedStructure.antiPatterns) return;

  const allPaths = Array.from(items.keys());
  for (const antiPattern of enforcedStructure.antiPatterns) {
    const matches = matchPattern(allPaths, antiPattern.pattern);
    for (const match of matches) {
      violations.push({
        filePath: match,
        violationType: 'anti-pattern',
        currentLocation: match,
        expectedLocation: antiPattern.suggestedLocation,
        reason: antiPattern.description,
        rule: antiPattern.pattern,
      });
    }
  }
}

/**
 * Scan a project against an enforced structure definition.
 *
 * This is the primary entry point for violation detection. It:
 * 1. Scans the project file tree (respecting default ignore patterns)
 * 2. Checks for a missing `src/` folder if required
 * 3. Validates every item against hierarchical directory rules
 * 4. Checks for known anti-patterns
 *
 * @param projectPath - Absolute path to the project root
 * @param enforcedStructure - The enforced structure rules to validate against
 * @returns Array of detected {@link StructureViolation} objects
 */
export async function scanWithEnforcedStructure(
  projectPath: string,
  enforcedStructure: EnforcedStructure
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  const items = await getProjectDirectories(projectPath, getDefaultIgnorePatterns());

  checkForMissingSrcFolder(items, enforcedStructure, violations);
  processItemsAgainstRules(items, enforcedStructure, violations);
  checkAntiPatterns(items, enforcedStructure, violations);

  return violations;
}
