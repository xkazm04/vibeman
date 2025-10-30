import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  getStructureTemplate,
  getStructureTemplateWithCustom,
  ProjectStructureTemplate,
  getEnforcedStructure,
  EnforcedStructure,
  DirectoryRule,
} from './structureTemplates';
import {
  StructureViolation,
  generateViolationRequirement,
  generateRequirementFileName,
} from './violationRequirementTemplate';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import {minimatch} from 'minimatch';

/**
 * Helper: Recursively get all files in a directory
 */
async function getAllFiles(
  dirPath: string,
  ignorePatterns: string[] = []
): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentPath: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const entryFullPath = path.join(currentPath, entry.name);

        // Check if should ignore
        const shouldIgnore = ignorePatterns.some(pattern =>
          minimatch(entryRelPath, pattern, { dot: true })
        );

        if (shouldIgnore) continue;

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        } else if (entry.isFile()) {
          // Use forward slashes for consistency
          files.push(entryRelPath.replace(/\\/g, '/'));
        }
      }
    } catch (error) {
      console.error(`[StructureScan] Error scanning ${currentPath}:`, error);
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Helper: Match files against a glob pattern
 */
function matchPattern(files: string[], pattern: string): string[] {
  return files.filter(file => minimatch(file, pattern, { dot: true }));
}

/**
 * Helper: Check if a name matches a pattern (supports wildcards like "*-page", "sub_*", "*.tsx")
 */
function matchesNamePattern(name: string, pattern: string): boolean {
  // If pattern is "*", it matches anything
  if (pattern === '*') return true;

  // If pattern has wildcards, use minimatch
  if (pattern.includes('*')) {
    return minimatch(name, pattern, { dot: true });
  }

  // Exact match
  return name === pattern;
}

/**
 * Helper: Check if a folder/file is allowed in a directory rule
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
 * Helper: Find the directory rule for a given path (supports patterns like sub_*)
 */
function findDirectoryRule(
  targetPath: string,
  rules: DirectoryRule[]
): DirectoryRule | null {
  for (const rule of rules) {
    // Check if this rule matches the target path (exact or pattern match)
    if (rule.path === targetPath || matchesPathPattern(targetPath, rule.path)) {
      return rule;
    }

    // Check subdirectory rules recursively
    if (rule.subdirectoryRules) {
      const subRule = findDirectoryRule(targetPath, rule.subdirectoryRules);
      if (subRule) return subRule;
    }
  }
  return null;
}

/**
 * Helper: Check if a path matches a pattern (e.g., "src/app/features/sub_*" matches "src/app/features/sub_auth")
 */
function matchesPathPattern(actualPath: string, patternPath: string): boolean {
  // If no wildcard, must be exact match
  if (!patternPath.includes('*')) {
    return actualPath === patternPath;
  }

  // Split both paths
  const actualParts = actualPath.split('/');
  const patternParts = patternPath.split('/');

  // Must have same number of parts
  if (actualParts.length !== patternParts.length) {
    return false;
  }

  // Check each part
  for (let i = 0; i < patternParts.length; i++) {
    if (!matchesNamePattern(actualParts[i], patternParts[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Helper: Find the most specific rule that applies to a directory path
 * Returns the rule that governs what can be placed IN this directory
 */
function findApplicableRule(
  targetPath: string,
  allRules: DirectoryRule[]
): DirectoryRule | null {
  let bestMatch: DirectoryRule | null = null;
  let bestMatchDepth = -1;

  function searchRules(rules: DirectoryRule[], depth: number = 0) {
    for (const rule of rules) {
      // Check if this rule matches exactly (this rule governs what's IN targetPath)
      if (targetPath === rule.path || matchesPathPattern(targetPath, rule.path)) {
        if (depth > bestMatchDepth) {
          bestMatch = rule;
          bestMatchDepth = depth;
        }
      } else if (targetPath.startsWith(rule.path + '/')) {
        // Target is inside this rule's directory
        // First, mark this rule as a potential match (parent rule)
        if (depth > bestMatchDepth) {
          bestMatch = rule;
          bestMatchDepth = depth;
        }

        // Then check subdirectories for a more specific match
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
 * Helper: Get unique directories from file list
 */
async function getProjectDirectories(
  projectPath: string,
  ignorePatterns: string[] = []
): Promise<Map<string, { isDirectory: boolean; relativePath: string }>> {
  const items = new Map<string, { isDirectory: boolean; relativePath: string }>();

  async function scan(currentPath: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const entryFullPath = path.join(currentPath, entry.name);

        // Check if should ignore
        const shouldIgnore = ignorePatterns.some(pattern =>
          minimatch(entryRelPath, pattern, { dot: true })
        );

        if (shouldIgnore) continue;

        // Store this item
        const normalizedPath = entryRelPath.replace(/\\/g, '/');
        items.set(normalizedPath, {
          isDirectory: entry.isDirectory(),
          relativePath: normalizedPath,
        });

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        }
      }
    } catch (error) {
      console.error(`[StructureScan] Error scanning ${currentPath}:`, error);
    }
  }

  await scan(projectPath);
  return items;
}

/**
 * Helper: Suggest a location for a misplaced file/folder
 */
function getSuggestedLocation(itemPath: string, itemName: string, parentPath: string): string {
  // Common suggestions based on item location
  if (parentPath === 'src') {
    // Items in src/ that shouldn't be there
    if (itemName.endsWith('.tsx') || itemName.endsWith('.ts')) {
      return 'src/lib/ or src/components/ or src/app/features/';
    }
    return 'Move to appropriate subfolder (app, components, lib, hooks, stores, types)';
  }

  if (parentPath === 'src/app') {
    // Folders in src/app/ that shouldn't be there
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
 * Scan using enforced structure rules (NEW METHOD)
 */
async function scanWithEnforcedStructure(
  projectPath: string,
  enforcedStructure: EnforcedStructure
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  console.log('[StructureScan] 🔍 Using enforced structure validation');

  // Get all items (files and directories) in the project
  const items = await getProjectDirectories(projectPath, [
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
    'public/**', // Skip public folder for now
  ]);

  console.log(`[StructureScan] 📁 Found ${items.size} items (files + folders)`);

  // Check if project has src/ folder (CRITICAL for structure rules that expect src/)
  const hasSrcFolder = Array.from(items.keys()).some(path => path.startsWith('src/') || path === 'src');
  console.log(`[StructureScan] 📂 Project has src/ folder: ${hasSrcFolder}`);

  if (!hasSrcFolder && enforcedStructure.directoryRules[0]?.path === 'src') {
    console.log('[StructureScan] ⚠️  WARNING: Enforced structure expects src/ folder but project does not have one!');
    violations.push({
      filePath: 'project-root',
      violationType: 'missing-structure',
      currentLocation: 'Project root',
      expectedLocation: 'Create src/ folder at project root',
      reason: 'Project structure expects a src/ folder containing app, components, lib, etc. but src/ folder is missing. This is a fundamental structure violation.',
      rule: 'Root structure',
    });
    // Still continue checking to find other violations
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
      // Log first few items with no rule for debugging
      if (noRuleCount <= 5) {
        console.log(`[StructureScan] ℹ️  No rule found for parent: ${parentPath} (item: ${itemName})`);
      }

      // If the item is in a location with no rules, it might be a violation
      // Check if it's in an unexpected location (not in standard NextJS folders)
      const firstLevelFolder = itemPath.split('/')[0];
      const standardFolders = ['src', 'public', 'node_modules', '.next', '.git', 'dist', 'build'];
      const standardHiddenFolders = ['.next', '.git', '.vscode', '.idea', '.claude'];

      // Check if this is a non-standard folder
      const isStandard = standardFolders.includes(firstLevelFolder);
      const isHidden = firstLevelFolder.startsWith('.');
      const isStandardHidden = isHidden && standardHiddenFolders.includes(firstLevelFolder);

      if (!isStandard && !(isHidden && isStandardHidden)) {
        // This is a non-standard folder/file at root level or in unexpected location
        violations.push({
          filePath: itemPath,
          violationType: 'anti-pattern',
          currentLocation: itemPath,
          expectedLocation: 'Move to src/ or remove',
          reason: `Item is in "${firstLevelFolder}/" which is not a standard Next.js folder. Expected structure has code in src/ folder. ${isHidden ? '(Non-standard hidden folder)' : ''}`,
          rule: 'Project root structure',
        });

        if (noRuleCount <= 10) {
          console.log(`[StructureScan] ❌ Unexpected location: ${itemPath} (no rule for ${parentPath})`);
        }
      }

      continue;
    }

    checkedCount++;

    // If we found a rule, check if this item is allowed
    const result = isAllowedInDirectory(itemName, itemInfo.isDirectory, applicableRule);

    // Debug: log first few checks
    if (checkedCount <= 10) {
      console.log(`[StructureScan] 🔍 Check ${checkedCount}: ${itemName} in ${parentPath}`);
      console.log(`  Rule: ${applicableRule.path} (strict: ${applicableRule.strictMode})`);
      console.log(`  Allowed: ${result.allowed}`);
    }

    if (!result.allowed) {
      const itemType = itemInfo.isDirectory ? 'Folder' : 'File';
      const allowedItemsInfo = itemInfo.isDirectory
        ? applicableRule.allowedFolders
          ? `Allowed folders: ${applicableRule.allowedFolders.map(f => f.name).join(', ')}`
          : 'No folders allowed'
        : applicableRule.allowedFiles
          ? `Allowed files: ${applicableRule.allowedFiles.map(f => f.name).join(', ')}`
          : 'No files allowed';

      violations.push({
        filePath: itemPath,
        violationType: 'anti-pattern',
        currentLocation: itemPath,
        expectedLocation: getSuggestedLocation(itemPath, itemName, parentPath),
        reason: `${itemType} "${itemName}" is not allowed in ${parentPath}/. ${applicableRule.strictMode ? '(Strict mode: only explicitly allowed items permitted) ' : ''}${allowedItemsInfo}`,
        rule: applicableRule.path,
      });

      console.log(
        `[StructureScan] ❌ Violation: ${itemPath} (not allowed in ${parentPath}/)`
      );
    }
  }

  console.log(`[StructureScan] 📊 Stats: ${checkedCount} checked, ${skippedCount} skipped (root), ${noRuleCount} no rule found`);

  // Check for anti-patterns from enforced structure
  if (enforcedStructure.antiPatterns) {
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

        console.log(`[StructureScan] ❌ Anti-pattern: ${match}`);
      }
    }
  }

  return violations;
}

/**
 * POST /api/structure-scan
 * Scan project structure and generate requirement files for violations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, projectType, projectId } = body;

    console.log('[StructureScan] 📋 Starting structure scan:', {
      projectPath,
      projectType,
      projectId,
    });

    // Validate inputs
    if (!projectPath || !projectType) {
      return NextResponse.json(
        { error: 'projectPath and projectType are required' },
        { status: 400 }
      );
    }

    if (projectType !== 'nextjs' && projectType !== 'fastapi') {
      return NextResponse.json(
        { error: 'projectType must be "nextjs" or "fastapi"' },
        { status: 400 }
      );
    }

    // Verify project path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 404 }
      );
    }

    // Try to get enforced structure first (NEW METHOD)
    const enforcedStructure = getEnforcedStructure(projectType);
    let violations: StructureViolation[] = [];

    if (enforcedStructure) {
      console.log(`[StructureScan] 📐 Using ${enforcedStructure.name} enforced structure`);
      violations = await scanWithEnforcedStructure(projectPath, enforcedStructure);
    } else {
      // Fallback to old method with custom template support
      const template = await getStructureTemplateWithCustom(projectType);
      console.log(`[StructureScan] 📐 Using ${template.name} template (fallback)${template.rules !== getStructureTemplate(projectType).rules ? ' [CUSTOM]' : ''}`);
      violations = await scanForViolations(projectPath, template);
    }

    console.log(`[StructureScan] 🔍 Found ${violations.length} violations`);

    if (violations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No structure violations found',
        violations: 0,
        requirementFiles: [],
      });
    }

    // Generate requirement files (max 20 violations per file)
    const requirementFiles = await generateRequirementFiles(
      projectPath,
      projectType,
      violations
    );

    console.log(
      `[StructureScan] ✅ Generated ${requirementFiles.length} requirement files`
    );

    return NextResponse.json({
      success: true,
      message: `Found ${violations.length} violations, created ${requirementFiles.length} requirement files`,
      violations: violations.length,
      requirementFiles,
    });
  } catch (error) {
    console.error('[StructureScan] ❌ Error:', error);
    return NextResponse.json(
      {
        error: 'Structure scan failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Scan project for structure violations
 */
async function scanForViolations(
  projectPath: string,
  template: ProjectStructureTemplate
): Promise<StructureViolation[]> {
  const violations: StructureViolation[] = [];

  try {
    console.log('[StructureScan] 🔍 Scanning project at:', projectPath);

    // Get all files in the project (exclude node_modules, .next, etc.)
    const allFiles = await getAllFiles(projectPath, [
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
    ]);

    console.log(`[StructureScan] 📁 Found ${allFiles.length} files`);

    if (allFiles.length === 0) {
      console.warn('[StructureScan] ⚠️ No files found in project');
      return violations;
    }

    // Check for anti-patterns
    for (const rule of template.rules) {
      // Skip non-anti-pattern rules
      if (!rule.description.includes('AVOID')) continue;

      try {
        // Match files against the rule pattern
        const matchedFiles = matchPattern(allFiles, rule.pattern);

        if (matchedFiles.length === 0) {
          console.log(`[StructureScan] ✓ No violations for pattern: ${rule.pattern}`);
          continue;
        }

        console.log(`[StructureScan] ⚠️ Found ${matchedFiles.length} violations for pattern: ${rule.pattern}`);

        for (const file of matchedFiles) {
          // Determine correct location based on the anti-pattern
          let expectedLocation = '';
          let reason = rule.description;

          if (file.includes('src/pages/')) {
            expectedLocation = file.replace('src/pages/', 'src/app/');
            reason = 'Use App Router (src/app/) instead of Pages Router (src/pages/)';
          } else if (file.includes('src/utils/')) {
            expectedLocation = file.replace('src/utils/', 'src/lib/');
            reason = 'Use src/lib/ instead of src/utils/ for consistency';
          } else if (file.includes('src/helpers/')) {
            expectedLocation = file.replace('src/helpers/', 'src/lib/');
            reason = 'Use src/lib/ instead of src/helpers/ for consistency';
          } else if (file.includes('app/utils/')) {
            expectedLocation = file.replace('app/utils/', 'app/core/');
            reason = 'Use app/core/ instead of app/utils/ for better organization';
          } else if (file.includes('app/helpers/')) {
            expectedLocation = file.replace('app/helpers/', 'app/core/');
            reason = 'Use app/core/ instead of app/helpers/ for better organization';
          } else {
            // Generic anti-pattern
            expectedLocation = 'See structure guidelines';
            reason = rule.description;
          }

          violations.push({
            filePath: file,
            violationType: 'anti-pattern',
            currentLocation: file,
            expectedLocation,
            reason,
            rule: rule.pattern,
          });
        }
      } catch (err) {
        console.error(`[StructureScan] Error checking pattern ${rule.pattern}:`, err);
        // Continue with next rule
      }
    }

    // Check for misplaced shared components (Next.js specific)
    if (template.type === 'nextjs') {
      try {
        // Find components that might be feature-specific but in shared folder
        const sharedComponents = matchPattern(allFiles, 'src/components/**/*.tsx')
          .filter(file => !file.startsWith('src/components/ui/')); // ui components are truly shared

        if (sharedComponents.length > 0) {
          console.log(`[StructureScan] 🔍 Checking ${sharedComponents.length} shared components for misplacement`);
          for (const component of sharedComponents) {
            const componentName = path.basename(component, '.tsx');

            // Check if this component is only used in one feature
            // (This is a heuristic - would need more sophisticated analysis)
            const featureMatch = componentName.match(/^([A-Z][a-z]+)/);
            if (featureMatch) {
              const featureName = featureMatch[1].toLowerCase();

              // Check if a feature folder exists
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
      } catch (err) {
        console.error('[StructureScan] Error checking shared components:', err);
        // Continue anyway
      }
    }
  } catch (error) {
    console.error('[StructureScan] Error in scanForViolations:', error);
    throw error;
  }

  return violations;
}

/**
 * Generate requirement files for violations (max 20 per file)
 */
async function generateRequirementFiles(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi',
  violations: StructureViolation[]
): Promise<string[]> {
  const MAX_VIOLATIONS_PER_FILE = 20;
  const batches: StructureViolation[][] = [];

  // Ensure .claude/commands folder exists
  const commandsDir = path.join(projectPath, '.claude', 'commands');
  try {
    await fs.mkdir(commandsDir, { recursive: true });
    console.log(`[StructureScan] 📁 Ensured commands folder exists: ${commandsDir}`);
  } catch (error) {
    console.error('[StructureScan] Error creating commands folder:', error);
  }

  // Delete old structure scan requirement files first
  try {
    if (await fs.access(commandsDir).then(() => true).catch(() => false)) {
      const files = await fs.readdir(commandsDir);
      for (const file of files) {
        if (file.startsWith('refactor-structure-') && file.endsWith('.md')) {
          const filePath = path.join(commandsDir, file);
          await fs.unlink(filePath);
          console.log(`[StructureScan] 🗑️  Deleted old requirement: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('[StructureScan] Error deleting old requirements:', error);
  }

  // Split violations into batches
  for (let i = 0; i < violations.length; i += MAX_VIOLATIONS_PER_FILE) {
    batches.push(violations.slice(i, i + MAX_VIOLATIONS_PER_FILE));
  }

  const totalBatches = batches.length;
  const requirementFiles: string[] = [];

  // Generate requirement file for each batch
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

    console.log(`[StructureScan] 🔧 Creating requirement file: ${fileName}`);
    console.log(`[StructureScan] 📄 Content length: ${requirementContent.length} chars`);

    // Create the requirement file
    const result = createRequirement(projectPath, fileName, requirementContent);

    console.log(`[StructureScan] 📋 createRequirement result:`, result);

    if (result.success) {
      requirementFiles.push(fileName);
      console.log(`[StructureScan] ✅ Created requirement: ${fileName}`);
    } else {
      console.error(`[StructureScan] ❌ Failed to create requirement: ${fileName}`);
      console.error(`[StructureScan] ❌ Error:`, result.error);
    }
  }

  return requirementFiles;
}
