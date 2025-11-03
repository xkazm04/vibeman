#!/usr/bin/env node
/**
 * Fix logger calls to use proper context objects
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  let content = await fs.readFile(fullPath, 'utf-8');
  const original = content;

  // Fix logger.error('message', error) => logger.error('message', { error })
  content = content.replace(
    /logger\.(error|warn|info|debug)\(([^,]+),\s*error\s*\)/g,
    'logger.$1($2, { error })'
  );

  // Fix logger.error('message', err) => logger.error('message', { error: err })
  content = content.replace(
    /logger\.(error|warn|info|debug)\(([^,]+),\s*err\s*\)/g,
    'logger.$1($2, { error: err })'
  );

  // Fix any remaining patterns where error is not wrapped
  content = content.replace(
    /logger\.(error|warn)\(([^,]+),\s*\{?\s*error:\s*error\s*\}?\s*\)/g,
    'logger.$1($2, { error })'
  );

  if (content !== original) {
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`✅ Fixed ${filePath}`);
    return true;
  }
  return false;
}

async function addMissingImports(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  let content = await fs.readFile(fullPath, 'utf-8');
  const original = content;

  // Add missing api-helpers import to context-groups
  if (filePath === 'src/app/api/context-groups/route.ts' && !content.includes('api-helpers')) {
    content = content.replace(
      "import { logger } from '@/lib/logger';",
      "import { logger } from '@/lib/logger';\nimport { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';"
    );
  }

  if (content !== original) {
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`✅ Added imports to ${filePath}`);
    return true;
  }
  return false;
}

const files = [
  'src/app/api/context-groups/route.ts',
  'src/app/api/contexts/route.ts',
  'src/app/api/file-dependencies/route.ts',
  'src/app/api/file-fixer/route.ts',
  'src/app/api/file-scanner/route.ts',
  'src/app/api/file-watch/route.ts',
  'src/app/api/goals/route.ts',
];

async function main() {
  console.log('Fixing logger calls and imports...\n');

  for (const file of files) {
    await addMissingImports(file);
    await fixFile(file);
  }

  console.log('\n✅ All fixes applied');
}

main().catch(console.error);
