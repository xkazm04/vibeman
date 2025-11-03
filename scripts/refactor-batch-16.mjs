/**
 * Refactoring script for Batch 16
 * Replaces console statements with logger across all API routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const files = [
  'src/app/api/scans/route.ts',
  'src/app/api/scan-queue/route.ts',
  'src/app/api/projects/route.ts',
  'src/app/api/lang/route.ts',
  'src/app/api/implementation-logs/route.ts',
  'src/app/api/ideas/route.ts',
];

function refactorFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  let modified = false;

  // Add logger import if not present
  if (!content.includes("import { logger } from '@/lib/logger'")) {
    const importIndex = content.indexOf('\n\n');
    if (importIndex > 0) {
      content = content.slice(0, importIndex) + "\nimport { logger } from '@/lib/logger';" + content.slice(importIndex);
      modified = true;
    }
  }

  // Replace console.error statements
  const consoleErrorRegex = /console\.error\(['"]([^'"]+)['"],\s*(\w+)\);/g;
  if (consoleErrorRegex.test(content)) {
    content = content.replace(consoleErrorRegex, (match, message, errorVar) => {
      return `logger.error('${message}', { error: ${errorVar} });`;
    });
    modified = true;
  }

  // Replace console.log statements
  const consoleLogRegex = /console\.log\(/g;
  if (consoleLogRegex.test(content)) {
    content = content.replace(/console\.log\(/g, 'logger.info(');
    modified = true;
  }

  // Replace console.warn statements
  const consoleWarnRegex = /console\.warn\(/g;
  if (consoleWarnRegex.test(content)) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Refactored: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  Skipped (no changes): ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 Starting Batch 16 refactoring...\n');

  let totalModified = 0;

  for (const file of files) {
    if (refactorFile(file)) {
      totalModified++;
    }
  }

  console.log(`\n✨ Refactoring complete! Modified ${totalModified} of ${files.length} files.`);
}

main();
