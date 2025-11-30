/**
 * Manifest Generation Test
 * 
 * This test generates the manifest.json file by scanning the src/components directory.
 * Run with: npx vitest run src/lib/refactor/generateManifest.test.ts
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scanDirectory } from './colorScanner';
import { generateManifest } from './manifestGenerator';

describe('Manifest Generation', () => {
  it('should scan components directory and generate manifest', () => {
    // Get the project root (vibeman directory)
    const projectRoot = path.resolve(__dirname, '../../..');
    const scanDir = path.join(projectRoot, 'src/components');
    const outputPath = path.join(__dirname, 'manifest.json');
    
    console.log(`\nScanning directory: ${scanDir}`);
    
    // Verify the directory exists
    expect(fs.existsSync(scanDir)).toBe(true);
    
    // Scan the directory for cyan color patterns
    const scanResults = scanDirectory(scanDir);
    
    console.log(`Found ${scanResults.length} files with cyan color patterns`);
    
    // Generate the manifest
    const manifest = generateManifest(scanResults);
    
    // Save the manifest
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    
    console.log(`\nManifest saved to: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  Total files: ${manifest.totalFiles}`);
    console.log(`  Files over 200 lines: ${manifest.summary.filesOver200Lines}`);
    console.log(`  Patterns by category:`);
    console.log(`    - Text: ${manifest.summary.byCategory.text}`);
    console.log(`    - Border: ${manifest.summary.byCategory.border}`);
    console.log(`    - Background: ${manifest.summary.byCategory.background}`);
    console.log(`    - Shadow: ${manifest.summary.byCategory.shadow}`);
    console.log(`    - Gradient: ${manifest.summary.byCategory.gradient}`);
    
    // List affected files
    console.log(`\nAffected files:`);
    for (const file of manifest.files) {
      const relativePath = path.relative(projectRoot, file.path);
      console.log(`  - ${relativePath} (${file.colorReplacements} patterns, ${file.lineCount} lines)`);
    }
    
    // Assertions
    expect(manifest.totalFiles).toBeGreaterThan(0);
    expect(manifest.files.length).toBe(manifest.totalFiles);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
