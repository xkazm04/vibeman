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
 * Scan using enforced structure rules
 */
export async function scanWithEnforcedStructure(
  projectPath: string,
  enforcedStructure: EnforcedStructure
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  console.log('[ViolationDetector] 🔍 Using enforced structure validation');

  // Get all items (files and directories) in the project
  const items = await getProjectDirectories(projectPath, getDefaultIgnorePatterns());

  console.log(`[ViolationDetector] 📁 Found ${items.size} items (files + folders)`);

  // Check if project has src/ folder
  const hasSrcFolder = Array.from(items.keys()).some(path => path.startsWith('src/') || path === 'src');
  console.log(`[ViolationDetector] 📂 Project has src/ folder: ${hasSrcFolder}`);

  if (!hasSrcFolder && enforcedStructure.directoryRules[0]?.path === 'src') {
    console.log('[ViolationDetector] ⚠️  WARNING: Enforced structure expects src/ folder but project does not have one!');
    violations.push({
      filePath: 'project-root',
      violationType: 'missing-structure',
      currentLocation: 'Project root',
      expectedLocation: 'Create src/ folder at project root',
      reason: 'Project structure expects a src/ folder containing app, components, lib, etc. but src/ folder is missing. This is a fundamental structure violation.',
      rule: 'Root structure',
    });
  }

  // Check each item against directory rules
  let checkedCount = 0;
  let skippedCount = 0;
  let noRuleCount = 0;

  for (const [itemPath, itemInfo] of items.entries()) {
    const parts = itemPath.split('/');
    const itemName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    // Skip root-level items (no parent)
    if (!parentPath) {
      skippedCount++;
      continue;
    }

    // Find the applicable directory rule for the parent path
    const applicableRule = findApplicableRule(parentPath, enforcedStructure.directoryRules);

    if (!applicableRule) {
      noRuleCount++;

      if (noRuleCount <= 5) {
        console.log(`[ViolationDetector] ℹ️  No rule found for parent: ${parentPath} (item: ${itemName})`);
      }

      // Check if it's in an unexpected location
      const firstLevelFolder = itemPath.split('/')[0];
      const standardFolders = ['src', 'public', 'node_modules', '.next', '.git', 'dist', 'build'];
      const standardHiddenFolders = ['.next', '.git', '.vscode', '.idea', '.claude'];

      const isStandard = standardFolders.includes(firstLevelFolder);
      const isHidden = firstLevelFolder.startsWith('.');
      const isStandardHidden = isHidden && standardHiddenFolders.includes(firstLevelFolder);

      if (!isStandard && !(isHidden && isStandardHidden)) {
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

    checkedCount++;

    // Check if this item is allowed
    const result = isAllowedInDirectory(itemName, itemInfo.isDirectory, applicableRule);

    if (!result.allowed) {
      const suggestedLocation = getSuggestedLocation(itemPath, itemName, parentPath);

      violations.push({
        filePath: itemPath,
        violationType: applicableRule.strictMode ? 'disallowed-file' : 'anti-pattern',
        currentLocation: itemPath,
        expectedLocation: suggestedLocation,
        reason: `${itemInfo.isDirectory ? 'Folder' : 'File'} "${itemName}" is not allowed in ${parentPath}/. ${applicableRule.strictMode ? 'This directory has strict rules.' : 'This violates project structure conventions.'}`,
        rule: applicableRule.path,
      });

      if (checkedCount <= 10) {
        console.log(`[ViolationDetector] ❌ Violation: ${itemName} in ${parentPath} (not allowed)`);
      }
    }
  }

  console.log(`[ViolationDetector] ✅ Scan complete: ${violations.length} violations found`);
  console.log(`[ViolationDetector] 📊 Stats: ${checkedCount} checked, ${skippedCount} skipped, ${noRuleCount} no-rule`);

  return violations;
}
