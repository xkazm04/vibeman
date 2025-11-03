#!/usr/bin/env node
/**
 * Batch 17 Refactoring Script
 * Systematically applies code quality improvements to API routes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Helper to read file
async function readFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  return await fs.readFile(fullPath, 'utf-8');
}

// Helper to write file
async function writeFile(filePath, content) {
  const fullPath = path.join(projectRoot, filePath);
  await fs.writeFile(fullPath, content, 'utf-8');
}

// Replace console statements with logger
function replaceConsoleWithLogger(content) {
  let modified = content;
  let hasChanges = false;

  // Replace console.error
  if (modified.includes('console.error')) {
    modified = modified.replace(/console\.error\(/g, 'logger.error(');
    hasChanges = true;
  }

  // Replace console.log
  if (modified.includes('console.log')) {
    modified = modified.replace(/console\.log\(/g, 'logger.info(');
    hasChanges = true;
  }

  // Replace console.warn
  if (modified.includes('console.warn')) {
    modified = modified.replace(/console\.warn\(/g, 'logger.warn(');
    hasChanges = true;
  }

  // Replace console.debug
  if (modified.includes('console.debug')) {
    modified = modified.replace(/console\.debug\(/g, 'logger.debug(');
    hasChanges = true;
  }

  // Add logger import if changes were made and it's not already imported
  if (hasChanges && !modified.includes("from '@/lib/logger'")) {
    // Find the last import statement
    const importRegex = /import .+ from .+;/g;
    const imports = modified.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      modified = modified.replace(
        lastImport,
        lastImport + "\nimport { logger } from '@/lib/logger';"
      );
    }
  }

  return modified;
}

// Add error helper imports and functions
function addErrorHelpers(content) {
  // Check if already has api-helpers import
  if (content.includes("from '@/lib/api-helpers'")) {
    return content;
  }

  // Check if file uses NextResponse.json error patterns
  const hasErrorResponses = content.includes('NextResponse.json({ error:') ||
    content.includes('NextResponse.json({error:');

  if (!hasErrorResponses) {
    return content;
  }

  // Find the last import statement
  const importRegex = /import .+ from .+;/g;
  const imports = content.match(importRegex);
  if (!imports || imports.length === 0) {
    return content;
  }

  const lastImport = imports[imports.length - 1];
  const newImport = "\nimport { createErrorResponse, handleError, notFoundResponse } from '@/lib/api-helpers';";

  return content.replace(lastImport, lastImport + newImport);
}

// Replace error response patterns with helpers
function replaceErrorPatterns(content) {
  let modified = content;

  // Replace: NextResponse.json({ error: 'message' }, { status: 404 })
  // with: notFoundResponse('Resource')
  modified = modified.replace(
    /NextResponse\.json\(\s*{\s*error:\s*['"](.+?)\s*not found['"].*?\s*}\s*,\s*{\s*status:\s*404\s*}\s*\)/gi,
    (match, resource) => {
      // Extract just the resource name (e.g., "Goal" from "Goal not found")
      const resourceName = resource.trim();
      return `notFoundResponse('${resourceName}')`;
    }
  );

  // Replace: NextResponse.json({ error: 'message' }, { status: 400/500 })
  // with: createErrorResponse('message', status)
  modified = modified.replace(
    /NextResponse\.json\(\s*{\s*error:\s*(['"][^'"]+['"])\s*}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
    (match, message, status) => {
      return `createErrorResponse(${message}, ${status})`;
    }
  );

  return modified;
}

// Main refactoring function
async function refactorFile(filePath) {
  console.log(`\nRefactoring: ${filePath}`);

  try {
    let content = await readFile(filePath);
    const original = content;

    // Apply transformations
    content = replaceConsoleWithLogger(content);
    content = addErrorHelpers(content);
    content = replaceErrorPatterns(content);

    if (content !== original) {
      await writeFile(filePath, content);
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error refactoring ${filePath}:`, error.message);
    return false;
  }
}

// Files to refactor
const filesToRefactor = [
  'src/app/api/goals/route.ts',
  'src/app/api/file-watch/route.ts',
  'src/app/api/file-fixer/route.ts',
  'src/app/api/file-dependencies/route.ts',
  'src/app/api/contexts/route.ts',
  'src/app/api/context-groups/route.ts',
];

// Run refactoring
async function main() {
  console.log('='.repeat(60));
  console.log('Batch 17 Refactoring Script');
  console.log('='.repeat(60));

  let filesModified = 0;
  for (const file of filesToRefactor) {
    const modified = await refactorFile(file);
    if (modified) filesModified++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Refactoring complete: ${filesModified}/${filesToRefactor.length} files modified`);
  console.log('='.repeat(60));
}

main().catch(console.error);
