/**
 * StructureScanService
 *
 * Domain logic for scanning project structure against enforced rules
 * and detecting violations. Extracted from /api/structure-scan route.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  getStructureTemplate,
  getStructureTemplateWithCustom,
  ProjectStructureTemplate,
  getEnforcedStructure,
  EnforcedStructure,
  DirectoryRule,
} from '@/app/api/structure-scan/structureTemplates';
import {
  StructureViolation,
  generateViolationRequirement,
  generateRequirementFileName,
} from '@/app/api/structure-scan/violationRequirementTemplate';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { minimatch } from 'minimatch';
import { logger } from '@/lib/logger';
import { walkDirectory } from './fileWalker';

// Constants
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  '.next/**',
  '.git/**',
  'dist/**',
  'build/**',
  '__pycache__/**',
  '*.pyc',
  '.venv/**',
  'venv/**',
  '.claude/**',
  'database/**',
  'context/**',
  'public/**',
];

const STANDARD_FOLDERS = ['src', 'public', 'node_modules', '.next', '.git', 'dist', 'build'];
const STANDARD_HIDDEN_FOLDERS = ['.next', '.git', '.vscode', '.idea', '.claude'];

const MAX_VIOLATIONS_PER_FILE = 20;

// --- Pure domain helpers ---

function shouldIgnorePath(relativePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern =>
    minimatch(relativePath, pattern, { dot: true })
  );
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

async function getAllFiles(
  dirPath: string,
  ignorePatterns: string[] = []
): Promise<string[]> {
  return walkDirectory(dirPath, { ignorePatterns });
}

function matchPattern(files: string[], pattern: string): string[] {
  return files.filter(file => minimatch(file, pattern, { dot: true }));
}

function matchesNamePattern(name: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.includes('*')) {
    return minimatch(name, pattern, { dot: true });
  }
  return name === pattern;
}

function isAllowedInDirectory(
  itemName: string,
  isDirectory: boolean,
  rule: DirectoryRule
): {
  allowed: boolean;
  matchedPattern?: string;
  description?: string;
} {
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

function matchesPathPattern(actualPath: string, patternPath: string): boolean {
  if (!patternPath.includes('*')) {
    return actualPath === patternPath;
  }

  const actualParts = actualPath.split('/');
  const patternParts = patternPath.split('/');

  if (actualParts.length !== patternParts.length) {
    return false;
  }

  return patternParts.every((part, i) => matchesNamePattern(actualParts[i], part));
}

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

async function scanDirectoryItems(
  currentPath: string,
  relativePath: string,
  ignorePatterns: string[],
  items: Map<string, { isDirectory: boolean; relativePath: string }>
): Promise<void> {
  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const entryFullPath = path.join(currentPath, entry.name);

      if (shouldIgnorePath(entryRelPath, ignorePatterns)) continue;

      const normalizedPath = normalizePath(entryRelPath);
      items.set(normalizedPath, {
        isDirectory: entry.isDirectory(),
        relativePath: normalizedPath,
      });

      if (entry.isDirectory()) {
        await scanDirectoryItems(entryFullPath, entryRelPath, ignorePatterns, items);
      }
    }
  } catch (error) {
    logger.error(`Error scanning ${currentPath}:`, { error });
  }
}

async function getProjectDirectories(
  projectPath: string,
  ignorePatterns: string[] = []
): Promise<Map<string, { isDirectory: boolean; relativePath: string }>> {
  const items = new Map<string, { isDirectory: boolean; relativePath: string }>();
  await scanDirectoryItems(projectPath, '', ignorePatterns, items);
  return items;
}

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

function isStandardLocation(firstLevelFolder: string): boolean {
  const isStandard = STANDARD_FOLDERS.includes(firstLevelFolder);
  const isHidden = firstLevelFolder.startsWith('.');
  const isStandardHidden = isHidden && STANDARD_HIDDEN_FOLDERS.includes(firstLevelFolder);

  return isStandard || (isHidden && isStandardHidden);
}

function getAllowedItemsInfo(isDirectory: boolean, rule: DirectoryRule): string {
  if (isDirectory) {
    return rule.allowedFolders
      ? `Allowed folders: ${rule.allowedFolders.map(f => f.name).join(', ')}`
      : 'No folders allowed';
  } else {
    return rule.allowedFiles
      ? `Allowed files: ${rule.allowedFiles.map(f => f.name).join(', ')}`
      : 'No files allowed';
  }
}

function processItemsAgainstRules(
  items: Map<string, { isDirectory: boolean; relativePath: string }>,
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): void {
  let checkedCount = 0;
  let skippedCount = 0;
  let noRuleCount = 0;

  for (const [itemPath, itemInfo] of items.entries()) {
    const parts = itemPath.split('/');
    const itemName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    if (!parentPath) {
      skippedCount++;
      continue;
    }

    const applicableRule = findApplicableRule(parentPath, enforcedStructure.directoryRules);

    if (!applicableRule) {
      noRuleCount++;
      if (noRuleCount <= 5) {
        logger.info(`No rule found for parent: ${parentPath} (item: ${itemName})`);
      }

      const firstLevelFolder = itemPath.split('/')[0];
      if (!isStandardLocation(firstLevelFolder)) {
        const isHidden = firstLevelFolder.startsWith('.');
        violations.push({
          filePath: itemPath,
          violationType: 'anti-pattern',
          currentLocation: itemPath,
          expectedLocation: 'Move to src/ or remove',
          reason: `Item is in "${firstLevelFolder}/" which is not a standard Next.js folder. Expected structure has code in src/ folder. ${isHidden ? '(Non-standard hidden folder)' : ''}`,
          rule: 'Project root structure',
        });

        if (noRuleCount <= 10) {
          logger.info(`Unexpected location: ${itemPath} (no rule for ${parentPath})`);
        }
      }
      continue;
    }

    checkedCount++;
    const result = isAllowedInDirectory(itemName, itemInfo.isDirectory, applicableRule);

    if (checkedCount <= 10) {
      logger.debug(`Check ${checkedCount}: ${itemName} in ${parentPath}`, {
        rule: applicableRule.path,
        strict: applicableRule.strictMode,
        allowed: result.allowed
      });
    }

    if (!result.allowed) {
      const itemType = itemInfo.isDirectory ? 'Folder' : 'File';
      const allowedItemsInfo = getAllowedItemsInfo(itemInfo.isDirectory, applicableRule);

      violations.push({
        filePath: itemPath,
        violationType: 'anti-pattern',
        currentLocation: itemPath,
        expectedLocation: getSuggestedLocation(itemPath, itemName, parentPath),
        reason: `${itemType} "${itemName}" is not allowed in ${parentPath}/. ${applicableRule.strictMode ? '(Strict mode: only explicitly allowed items permitted) ' : ''}${allowedItemsInfo}`,
        rule: applicableRule.path,
      });

      logger.info(`Violation: ${itemPath} (not allowed in ${parentPath}/)`);
    }
  }

  logger.info(`Stats: ${checkedCount} checked, ${skippedCount} skipped (root), ${noRuleCount} no rule found`);
}

function checkAntiPatterns(
  items: Map<string, { isDirectory: boolean; relativePath: string }>,
  enforcedStructure: EnforcedStructure,
  violations: StructureViolation[]
): void {
  if (!enforcedStructure.antiPatterns) return;

  const allFiles = Array.from(items.keys());
  for (const antiPattern of enforcedStructure.antiPatterns) {
    const matches = matchPattern(allFiles, antiPattern.pattern);
    for (const match of matches) {
      violations.push({
        filePath: match,
        violationType: 'anti-pattern',
        currentLocation: match,
        expectedLocation: antiPattern.suggestedLocation,
        reason: antiPattern.description,
        rule: antiPattern.pattern,
      });

      logger.info(`Anti-pattern: ${match}`);
    }
  }
}

// --- Public service functions ---

export async function scanWithEnforcedStructure(
  projectPath: string,
  enforcedStructure: EnforcedStructure
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  logger.info('Using enforced structure validation');

  const items = await getProjectDirectories(projectPath, DEFAULT_IGNORE_PATTERNS);
  logger.info(`Found ${items.size} items (files + folders)`);

  const hasSrcFolder = Array.from(items.keys()).some(path => path.startsWith('src/') || path === 'src');
  logger.info(`Project has src/ folder: ${hasSrcFolder}`);

  if (!hasSrcFolder && enforcedStructure.directoryRules[0]?.path === 'src') {
    logger.warn('WARNING: Enforced structure expects src/ folder but project does not have one!');
    violations.push({
      filePath: 'project-root',
      violationType: 'missing-structure',
      currentLocation: 'Project root',
      expectedLocation: 'Create src/ folder at project root',
      reason: 'Project structure expects a src/ folder containing app, components, lib, etc. but src/ folder is missing. This is a fundamental structure violation.',
      rule: 'Root structure',
    });
  }

  processItemsAgainstRules(items, enforcedStructure, violations);
  checkAntiPatterns(items, enforcedStructure, violations);

  return violations;
}

function getExpectedLocationForAntiPattern(file: string, rule: { description: string }): { location: string; reason: string } {
  if (file.includes('src/pages/')) {
    return {
      location: file.replace('src/pages/', 'src/app/'),
      reason: 'Use App Router (src/app/) instead of Pages Router (src/pages/)'
    };
  } else if (file.includes('src/utils/')) {
    return {
      location: file.replace('src/utils/', 'src/lib/'),
      reason: 'Use src/lib/ instead of src/utils/ for consistency'
    };
  } else if (file.includes('src/helpers/')) {
    return {
      location: file.replace('src/helpers/', 'src/lib/'),
      reason: 'Use src/lib/ instead of src/helpers/ for consistency'
    };
  } else if (file.includes('app/utils/')) {
    return {
      location: file.replace('app/utils/', 'app/core/'),
      reason: 'Use app/core/ instead of app/utils/ for better organization'
    };
  } else if (file.includes('app/helpers/')) {
    return {
      location: file.replace('app/helpers/', 'app/core/'),
      reason: 'Use app/core/ instead of app/helpers/ for better organization'
    };
  }
  return {
    location: 'See structure guidelines',
    reason: rule.description
  };
}

async function checkSharedComponents(
  projectPath: string,
  allFiles: string[],
  violations: StructureViolation[]
): Promise<void> {
  const sharedComponents = matchPattern(allFiles, 'src/components/**/*.tsx')
    .filter(file => !file.startsWith('src/components/ui/'));

  if (sharedComponents.length === 0) return;

  logger.info(`Checking ${sharedComponents.length} shared components for misplacement`);

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
        // Feature folder doesn't exist, component might be truly shared
      }
    }
  }
}

export async function scanForViolations(
  projectPath: string,
  template: ProjectStructureTemplate
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  try {
    logger.info('Scanning project at:', { projectPath });

    const allFiles = await getAllFiles(projectPath, DEFAULT_IGNORE_PATTERNS);
    logger.info(`Found ${allFiles.length} files`);

    if (allFiles.length === 0) {
      logger.warn('No files found in project');
      return violations;
    }

    for (const rule of template.rules) {
      if (!rule.description.includes('AVOID')) continue;

      try {
        const matchedFiles = matchPattern(allFiles, rule.pattern);

        if (matchedFiles.length === 0) {
          logger.debug(`No violations for pattern: ${rule.pattern}`);
          continue;
        }

        logger.warn(`Found ${matchedFiles.length} violations for pattern: ${rule.pattern}`);

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
      } catch (err) {
        logger.error(`Error checking pattern ${rule.pattern}:`, { error: err });
      }
    }

    if (template.type === 'nextjs') {
      try {
        await checkSharedComponents(projectPath, allFiles, violations);
      } catch (err) {
        logger.error('Error checking shared components:', { error: err });
      }
    }
  } catch (error) {
    logger.error('Error in scanForViolations:', { error });
    throw error;
  }

  return violations;
}

async function cleanOldRequirementFiles(commandsDir: string): Promise<void> {
  try {
    const files = await fs.readdir(commandsDir);
    for (const file of files) {
      if (file.startsWith('refactor-structure-') && file.endsWith('.md')) {
        const filePath = path.join(commandsDir, file);
        await fs.unlink(filePath);
        logger.info(`Deleted old requirement: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Error deleting old requirements:', { error });
  }
}

export async function generateRequirementFiles(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi',
  violations: StructureViolation[]
): Promise<string[]> {
  const commandsDir = path.join(projectPath, '.claude', 'commands');

  try {
    await fs.mkdir(commandsDir, { recursive: true });
    logger.info(`Ensured commands folder exists: ${commandsDir}`);
  } catch (error) {
    logger.error('Error creating commands folder:', { error });
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
    const batch = batches[i];

    const requirementContent = generateViolationRequirement({
      projectType,
      projectPath,
      violations: batch,
      batchNumber,
      totalBatches,
    });

    const fileName = generateRequirementFileName(projectType, batchNumber, totalBatches);

    logger.info(`Creating requirement file: ${fileName}`, {
      contentLength: requirementContent.length
    });

    const result = createRequirement(projectPath, fileName, requirementContent);

    if (result.success) {
      requirementFiles.push(fileName);
      logger.info(`Created requirement: ${fileName}`);
    } else {
      logger.error(`Failed to create requirement: ${fileName}`, { error: result.error });
    }
  }

  return requirementFiles;
}

export interface StructureScanInput {
  projectPath: string;
  projectType: 'nextjs' | 'fastapi';
  projectId?: string;
}

export interface StructureScanResult {
  violations: StructureViolation[];
  requirementFiles: string[];
}

/**
 * Main entry point: scan a project and generate requirement files for violations.
 */
export async function runStructureScan(input: StructureScanInput): Promise<StructureScanResult> {
  const { projectPath, projectType } = input;

  logger.info('Starting structure scan:', { projectPath, projectType });

  const enforcedStructure = getEnforcedStructure(projectType);
  let violations: StructureViolation[] = [];

  if (enforcedStructure) {
    logger.info(`Using ${enforcedStructure.name} enforced structure`);
    violations = await scanWithEnforcedStructure(projectPath, enforcedStructure);
  } else {
    const template = await getStructureTemplateWithCustom(projectType);
    const isCustom = template.rules !== getStructureTemplate(projectType).rules;
    logger.info(`Using ${template.name} template (fallback)${isCustom ? ' [CUSTOM]' : ''}`);
    violations = await scanForViolations(projectPath, template);
  }

  logger.info(`Found ${violations.length} violations`);

  let requirementFiles: string[] = [];
  if (violations.length > 0) {
    requirementFiles = await generateRequirementFiles(projectPath, projectType, violations);
    logger.info(`Generated ${requirementFiles.length} requirement files`);
  }

  return { violations, requirementFiles };
}
