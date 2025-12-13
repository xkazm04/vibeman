#!/usr/bin/env node
/**
 * Remove custom logger definitions that conflict with the imported logger
 */

import fs from 'fs';

const files = [
  'src/app/api/annette/analyze/route.ts',
  'src/app/api/annette/chat/route.ts',
  'src/app/api/annette/scan-briefing/route.ts',
  'src/app/api/annette/status/route.ts',
  'src/app/api/build-fixer/lib/buildScanner.ts',
  'src/app/api/build-fixer/lib/requirementCreator.ts',
  'src/app/api/claude-code/initialize/route.ts',
  'src/app/api/claude-code/initialize/structuralContextScan.ts',
];

function removeCustomLogger(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Pattern to match custom logger definitions with various structures
  // Handles multi-line definitions with nested braces
  const patterns = [
    // Pattern 1: // Logger utility\nconst logger = {...};
    /\/\/\s*Logger\s+utility\s*\n\s*const\s+logger\s*=\s*\{[\s\S]*?\n\};\s*\n?/g,
    // Pattern 2: Just const logger = {...}; with nested structure
    /const\s+logger\s*=\s*\{\s*\n(?:[^}]*\n)*\s*\};\s*\n?/g,
  ];

  for (const pattern of patterns) {
    content = content.replace(pattern, '\n');
  }

  // Clean up double newlines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

console.log('🔧 Removing custom logger definitions...\n');

let fixed = 0;
for (const file of files) {
  try {
    if (removeCustomLogger(file)) {
      fixed++;
    } else {
      console.log(`⚠️  No changes needed: ${file}`);
    }
  } catch (err) {
    console.log(`❌ Error processing ${file}: ${err.message}`);
  }
}

console.log(`\n✅ Fixed ${fixed} files`);
