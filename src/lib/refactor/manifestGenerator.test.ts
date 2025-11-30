/**
 * Property-Based Tests for Manifest Generator
 * 
 * **Feature: theme-token-refactor, Property 6: Manifest completeness**
 * **Validates: Requirements 1.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateManifest,
  calculateSummary,
  scanResultToFileEntry,
  exceedsLineThreshold,
  getFilesOverThreshold,
  getTotalPatternCount,
  updateFileStatus,
  addExtractedComponent,
  LINE_COUNT_THRESHOLD,
  MANIFEST_VERSION,
} from './manifestGenerator';
import type { ScanResult, ColorPattern, ColorCategory } from './colorScanner';

/**
 * Arbitrary generator for ColorCategory
 */
const colorCategoryArb = fc.constantFrom<ColorCategory>(
  'text', 'border', 'background', 'shadow', 'gradient'
);

/**
 * Arbitrary generator for ColorPattern
 */
const colorPatternArb = fc.record({
  line: fc.integer({ min: 1, max: 1000 }),
  column: fc.integer({ min: 0, max: 200 }),
  original: fc.constantFrom(
    'text-cyan-300', 'text-cyan-400', 'border-cyan-500/30',
    'bg-cyan-500/10', 'shadow-cyan-500/50', 'from-cyan-500'
  ),
  category: colorCategoryArb,
});

/**
 * Arbitrary generator for ScanResult
 */
const scanResultArb = fc.record({
  filePath: fc.string({ minLength: 5, maxLength: 100 }).map(s => `/src/${s}.tsx`),
  lineCount: fc.integer({ min: 1, max: 500 }),
  colorPatterns: fc.array(colorPatternArb, { minLength: 0, maxLength: 20 }),
});


describe('Manifest Generator - Property Tests', () => {
  /**
   * **Feature: theme-token-refactor, Property 6: Manifest completeness**
   * 
   * For any scan operation, the resulting manifest SHALL contain entries
   * for all affected files with accurate color pattern counts and line counts.
   */
  it('should contain entries for all scanned files', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 0, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          // Manifest should have same number of files as scan results
          expect(manifest.totalFiles).toBe(scanResults.length);
          expect(manifest.files.length).toBe(scanResults.length);
          
          // Every scan result should have a corresponding file entry
          for (const scanResult of scanResults) {
            const fileEntry = manifest.files.find(f => f.path === scanResult.filePath);
            expect(fileEntry).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have accurate line counts for all files', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          for (const scanResult of scanResults) {
            const fileEntry = manifest.files.find(f => f.path === scanResult.filePath);
            expect(fileEntry?.lineCount).toBe(scanResult.lineCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have accurate color pattern counts for all files', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          for (const scanResult of scanResults) {
            const fileEntry = manifest.files.find(f => f.path === scanResult.filePath);
            expect(fileEntry?.colorReplacements).toBe(scanResult.colorPatterns.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly count patterns by category in summary', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          // Calculate expected counts manually
          const expectedCounts: Record<ColorCategory, number> = {
            text: 0,
            border: 0,
            background: 0,
            shadow: 0,
            gradient: 0,
          };
          
          for (const result of scanResults) {
            for (const pattern of result.colorPatterns) {
              expectedCounts[pattern.category]++;
            }
          }
          
          // Verify summary matches
          expect(manifest.summary.byCategory).toEqual(expectedCounts);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly count files over 200 lines', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          const expectedCount = scanResults.filter(
            r => r.lineCount > LINE_COUNT_THRESHOLD
          ).length;
          
          expect(manifest.summary.filesOver200Lines).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should initialize all files with pending status', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          for (const file of manifest.files) {
            expect(file.status).toBe('pending');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should initialize all files with empty extractedComponents', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          for (const file of manifest.files) {
            expect(file.extractedComponents).toEqual([]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include version and timestamp in manifest', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 0, maxLength: 10 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          
          expect(manifest.version).toBe(MANIFEST_VERSION);
          expect(manifest.timestamp).toBeDefined();
          expect(typeof manifest.timestamp).toBe('string');
          // Timestamp should be a valid ISO date string
          expect(() => new Date(manifest.timestamp)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Manifest Generator - Helper Functions', () => {
  it('exceedsLineThreshold should correctly identify files over threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (lineCount) => {
          const result = exceedsLineThreshold(lineCount);
          expect(result).toBe(lineCount > LINE_COUNT_THRESHOLD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getFilesOverThreshold should return only files exceeding threshold', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          const filesOver = getFilesOverThreshold(manifest);
          
          // All returned files should exceed threshold
          for (const file of filesOver) {
            expect(file.lineCount).toBeGreaterThan(LINE_COUNT_THRESHOLD);
          }
          
          // Count should match summary
          expect(filesOver.length).toBe(manifest.summary.filesOver200Lines);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getTotalPatternCount should sum all color replacements', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 1, maxLength: 20 }),
        (scanResults) => {
          const manifest = generateManifest(scanResults);
          const totalCount = getTotalPatternCount(manifest);
          
          const expectedTotal = scanResults.reduce(
            (sum, r) => sum + r.colorPatterns.length, 0
          );
          
          expect(totalCount).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updateFileStatus should update only the specified file', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 2, maxLength: 10 }),
        fc.constantFrom<'transformed' | 'extracted' | 'complete'>('transformed', 'extracted', 'complete'),
        (scanResults, newStatus) => {
          const manifest = generateManifest(scanResults);
          const targetPath = manifest.files[0].path;
          
          const updated = updateFileStatus(manifest, targetPath, newStatus);
          
          // Target file should have new status
          const targetFile = updated.files.find(f => f.path === targetPath);
          expect(targetFile?.status).toBe(newStatus);
          
          // Other files should remain unchanged
          for (const file of updated.files) {
            if (file.path !== targetPath) {
              expect(file.status).toBe('pending');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addExtractedComponent should add component to correct file', () => {
    fc.assert(
      fc.property(
        fc.array(scanResultArb, { minLength: 2, maxLength: 10 }),
        fc.string({ minLength: 3, maxLength: 30 }),
        (scanResults, componentName) => {
          const manifest = generateManifest(scanResults);
          const targetPath = manifest.files[0].path;
          
          const updated = addExtractedComponent(manifest, targetPath, componentName);
          
          // Target file should have the component
          const targetFile = updated.files.find(f => f.path === targetPath);
          expect(targetFile?.extractedComponents).toContain(componentName);
          
          // Other files should remain unchanged
          for (const file of updated.files) {
            if (file.path !== targetPath) {
              expect(file.extractedComponents).toEqual([]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('scanResultToFileEntry should correctly convert scan result', () => {
    fc.assert(
      fc.property(
        scanResultArb,
        (scanResult) => {
          const entry = scanResultToFileEntry(scanResult);
          
          expect(entry.path).toBe(scanResult.filePath);
          expect(entry.lineCount).toBe(scanResult.lineCount);
          expect(entry.colorReplacements).toBe(scanResult.colorPatterns.length);
          expect(entry.status).toBe('pending');
          expect(entry.extractedComponents).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
