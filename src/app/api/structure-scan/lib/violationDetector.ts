import { EnforcedStructure, DirectoryRule } from '../structureTemplates';
import { StructureViolation } from '../violationRequirementTemplate';
import { matchesNamePattern, matchesPathPattern, getProjectDirectories, getDefaultIgnorePatterns } from './fileScanner';

/**
 * Violation Detector Module
 * Handles detection of structure violations against enforced rules
 */

/**
 * Check if a folder/file is allowed in a directory rule
 */
function isAllowedInDirectory(
  itemName: string,
  isDirectory: boolean,
  rule: DirectoryRule
): {
  allowed: boolean;
  matchedPattern?: string;
  description?: string;
} {
  if (isDirectory && rule.allowedFolders) {
    for (const folderRule of rule.allowedFolders) {
      if (matchesNamePattern(itemName, folderRule.name)) {
        return {
          allowed: true,
          matchedPattern: folderRule.name,
          description: folderRule.description,
        };
      }
    }
  }

  if (!isDirectory && rule.allowedFiles) {
    for (const fileRule of rule.allowedFiles) {
      if (matchesNamePattern(itemName, fileRule.name)) {
        return {
          allowed: true,
          matchedPattern: fileRule.name,
          description: fileRule.description,
        };
      }
    }
  }

  // If strict mode and not found in allowed list, it's not allowed
  if (rule.strictMode) {
    return { allowed: false };
  }

  // Non-strict mode: allow by default
  return { allowed: true };
}

/**
 * Find the most specific rule that applies to a directory path
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
 * Suggest a location for a misplaced file/folder
 */
function getSuggestedLocation(itemPath: string, itemName: string, parentPath: string): string {
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
 * Check if project has src/ folder and add violation if missing
 */
function checkForMissingSrcFolder(
  items: Map<string, { isDirectory: boolean; relativePath: string }>,
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): void {
  const hasSrcFolder = Array.from(items.keys()).some(path => path.startsWith('src/') || path === 'src');

  if (!hasSrcFolder && enforcedStructure.directoryRules[0]?.path === 'src') {
    violations.push({
      filePath: 'project-root',
      violationType: 'missing-structure',
      currentLocation: 'Project root',
      expectedLocation: 'Create src/ folder at project root',
      reason: 'Project structure expects a src/ folder containing app, components, lib, etc. but src/ folder is missing. This is a fundamental structure violation.',
      rule: 'Root structure',
    });
  }
}

/**
 * Check if an item is in a standard location
 */
function isInStandardLocation(itemPath: string): boolean {
  const firstLevelFolder = itemPath.split('/')[0];
  const standardFolders = ['src', 'public', 'node_modules', '.next', '.git', 'dist', 'build'];
  const standardHiddenFolders = ['.next', '.git', '.vscode', '.idea', '.claude'];

  const isStandard = standardFolders.includes(firstLevelFolder);
  const isHidden = firstLevelFolder.startsWith('.');
  const isStandardHidden = isHidden && standardHiddenFolders.includes(firstLevelFolder);

  return isStandard || (isHidden && isStandardHidden);
}

/**
 * Create a violation for non-standard location
 */
function createNonStandardLocationViolation(itemPath: string): StructureViolation {
  const firstLevelFolder = itemPath.split('/')[0];
  const isHidden = firstLevelFolder.startsWith('.');

  return {
    filePath: itemPath,
    violationType: 'anti-pattern',
    currentLocation: itemPath,
    expectedLocation: 'Move to src/ or remove',
    reason: `Item is in "${firstLevelFolder}/" which is not a standard Next.js folder. Expected structure has code in src/ folder. ${isHidden ? '(Non-standard hidden folder)' : ''}`,
    rule: 'Project root structure',
  };
}

/**
 * Create a violation for disallowed item
 */
function createDisallowedItemViolation(
  itemPath: string,
  itemName: string,
  parentPath: string,
  isDirectory: boolean,
  applicableRule: DirectoryRule
): StructureViolation {
  const suggestedLocation = getSuggestedLocation(itemPath, itemName, parentPath);

  return {
    filePath: itemPath,
    violationType: applicableRule.strictMode ? 'misplaced' : 'anti-pattern',
    currentLocation: itemPath,
    expectedLocation: suggestedLocation,
    reason: `${isDirectory ? 'Folder' : 'File'} "${itemName}" is not allowed in ${parentPath}/. ${applicableRule.strictMode ? 'This directory has strict rules.' : 'This violates project structure conventions.'}`,
    rule: applicableRule.path,
  };
}

/**
 * Process an individual item and check for violations
 */
function processItem(
  itemPath: string,
  itemInfo: { isDirectory: boolean; relativePath: string },
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): { checked: boolean; skipped: boolean; noRule: boolean } {
  const parts = itemPath.split('/');
  const itemName = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join('/');

  // Skip root-level items (no parent)
  if (!parentPath) {
    return { checked: false, skipped: true, noRule: false };
  }

  // Find the applicable directory rule for the parent path
  const applicableRule = findApplicableRule(parentPath, enforcedStructure.directoryRules);

  if (!applicableRule) {
    // Check if it's in an unexpected location
    if (!isInStandardLocation(itemPath)) {
      violations.push(createNonStandardLocationViolation(itemPath));
    }

    return { checked: false, skipped: false, noRule: true };
  }

  // Check if this item is allowed
  const result = isAllowedInDirectory(itemName, itemInfo.isDirectory, applicableRule);

  if (!result.allowed) {
    violations.push(createDisallowedItemViolation(itemPath, itemName, parentPath, itemInfo.isDirectory, applicableRule));
  }

  return { checked: true, skipped: false, noRule: false };
}

/**
 * Scan using enforced structure rules
 */
export async function scanWithEnforcedStructure(
  projectPath: string,
  enforcedStructure: EnforcedStructure
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  // Get all items (files and directories) in the project
  const items = await getProjectDirectories(projectPath, getDefaultIgnorePatterns());

  // Check if project has src/ folder
  checkForMissingSrcFolder(items, enforcedStructure, violations);

  // Check each item against directory rules
  Array.from(items.entries()).forEach(([itemPath, itemInfo]) => {
    processItem(itemPath, itemInfo, enforcedStructure, violations);
  });

  return violations;
}
