#!/usr/bin/env node
/**
 * Fix corrupted import statements where logger import was incorrectly inserted
 */

import fs from 'fs';

const corruptedFiles = [
  'src/app/api/architecture-graph/route.ts',
  'src/app/api/autonomous-ci/route.ts',
  'src/app/api/hypothesis-testing/generate/route.ts',
  'src/app/api/hypothesis-testing/route.ts',
  'src/app/api/onboarding-accelerator/generate/route.ts',
  'src/app/api/onboarding-accelerator/modules/route.ts',
  'src/app/api/onboarding-accelerator/quiz/route.ts',
  'src/app/api/onboarding-accelerator/route.ts',
  'src/app/api/project-health/route.ts',
  'src/app/api/red-team/[id]/route.ts',
  'src/app/api/red-team/attacks/[id]/route.ts',
  'src/app/api/red-team/attacks/route.ts',
  'src/app/api/red-team/debate/route.ts',
  'src/app/api/red-team/route.ts',
  'src/app/api/red-team/vulnerabilities/[id]/route.ts',
  'src/app/api/red-team/vulnerabilities/route.ts',
  'src/app/api/roi-simulator/portfolio/optimize/route.ts',
  'src/app/api/roi-simulator/refactorings/route.ts',
  'src/app/api/roi-simulator/simulations/route.ts',
  'src/app/api/roi-simulator/simulations/run/route.ts',
  'src/app/api/strategic-roadmap/generate/route.ts',
  'src/app/api/strategic-roadmap/route.ts',
  'src/app/api/tech-debt/predictions/[id]/route.ts',
  'src/app/api/tech-debt/predictions/route.ts',
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Pattern 1: import { incorrectly inserted in the middle of an import block
  // import {
  // import { logger } from '@/lib/logger';
  //   something,
  // } from 'somewhere';

  // We need to find: import {\nimport { logger }... and fix it
  const corruptedImportPattern = /import\s*\{\s*\nimport\s*\{\s*logger\s*\}\s*from\s*['"]@\/lib\/logger['"];\s*\n/g;

  content = content.replace(corruptedImportPattern, (match) => {
    return "import {\n";
  });

  // Also need to add the logger import at the proper location if it was removed
  // But first let's check if logger is still used in the file

  // Pattern 2: The logger import might be in the middle of the import block still
  // import {
  // import { logger } from '@/lib/logger';
  //   item1,
  const inlineLoggerPattern = /^(import\s*\{[^}]*?)import\s*\{\s*logger\s*\}\s*from\s*['"]@\/lib\/logger['"];\s*\n/gm;
  content = content.replace(inlineLoggerPattern, '$1');

  if (content !== originalContent) {
    // We made changes, now ensure logger is properly imported at the top
    // First check if logger is used
    if (content.includes('logger.')) {
      // Check if there's already a proper logger import
      if (!/import\s*\{\s*logger\s*\}\s*from\s*['"]@\/lib\/logger['"]/.test(content)) {
        // Find where to add the import - after all other imports
        const importEndMatch = content.match(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm);
        if (importEndMatch && importEndMatch.length > 0) {
          // Find the position of the last import
          let lastImportIndex = 0;
          for (const imp of importEndMatch) {
            const idx = content.indexOf(imp, lastImportIndex);
            if (idx !== -1) {
              lastImportIndex = idx + imp.length;
            }
          }
          // Insert after the last import
          content = content.slice(0, lastImportIndex) +
                    "\nimport { logger } from '@/lib/logger';" +
                    content.slice(lastImportIndex);
        }
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

console.log('🔧 Fixing corrupted import statements...\n');

let fixed = 0;
for (const file of corruptedFiles) {
  try {
    if (fixFile(file)) {
      fixed++;
    } else {
      console.log(`⚠️  No changes needed: ${file}`);
    }
  } catch (err) {
    console.log(`❌ Error processing ${file}: ${err.message}`);
  }
}

console.log(`\n✅ Fixed ${fixed} files`);
