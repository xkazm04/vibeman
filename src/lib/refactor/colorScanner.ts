/**
 * Color Pattern Scanner
 * 
 * Scans source files to identify hardcoded cyan color classes
 * that need to be replaced with theme tokens.
 * 
 * Requirements: 1.1, 1.2
 */

import * as fs from 'fs';
import * as path from 'path';

export type ColorCategory = 'text' | 'border' | 'background' | 'shadow' | 'gradient';

export interface ColorPattern {
  line: number;
  column: number;
  original: string;
  category: ColorCategory;
}

export interface ScanResult {
  filePath: string;
  lineCount: number;
  colorPatterns: ColorPattern[];
}

/**
 * Regex patterns for detecting cyan color classes
 */
const CYAN_PATTERNS: { pattern: RegExp; category: ColorCategory }[] = [
  // Text colors
  { pattern: /text-cyan-\d{2,3}/g, category: 'text' },
  
  // Border colors (with optional opacity)
  { pattern: /border-cyan-\d{2,3}(?:\/\d+)?/g, category: 'border' },
  
  // Background colors (with optional opacity)
  { pattern: /bg-cyan-\d{2,3}(?:\/\d+)?/g, category: 'background' },
  
  // Shadow/glow colors
  { pattern: /shadow-cyan-\d{2,3}(?:\/\d+)?/g, category: 'shadow' },
  
  // Gradient colors
  { pattern: /from-cyan-\d{2,3}/g, category: 'gradient' },
  { pattern: /via-cyan-\d{2,3}/g, category: 'gradient' },
  { pattern: /to-cyan-\d{2,3}/g, category: 'gradient' },
];

/**
 * Scans a single line of content for cyan color patterns
 */
export function scanLine(content: string, lineNumber: number): ColorPattern[] {
  const patterns: ColorPattern[] = [];
  
  for (const { pattern, category } of CYAN_PATTERNS) {
    // Reset regex state for each line
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(content)) !== null) {
      patterns.push({
        line: lineNumber,
        column: match.index,
        original: match[0],
        category,
      });
    }
  }
  
  return patterns;
}

/**
 * Scans file content for cyan color patterns
 */
export function scanContent(content: string): ColorPattern[] {
  const lines = content.split('\n');
  const patterns: ColorPattern[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const linePatterns = scanLine(lines[i], i + 1);
    patterns.push(...linePatterns);
  }
  
  return patterns;
}

/**
 * Scans a single file for cyan color patterns
 */
export function scanFile(filePath: string): ScanResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const colorPatterns = scanContent(content);
  
  return {
    filePath,
    lineCount: lines.length,
    colorPatterns,
  };
}

/**
 * Recursively finds all .ts and .tsx files in a directory
 */
export function findSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        findSourceFiles(fullPath, files);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Scans a directory for all files containing cyan color patterns
 */
export function scanDirectory(dir: string): ScanResult[] {
  const files = findSourceFiles(dir);
  const results: ScanResult[] = [];
  
  for (const file of files) {
    const result = scanFile(file);
    if (result.colorPatterns.length > 0) {
      results.push(result);
    }
  }
  
  return results;
}
