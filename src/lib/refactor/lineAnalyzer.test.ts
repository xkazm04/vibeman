/**
 * Property-Based Tests for Line Count Analyzer
 * 
 * **Feature: theme-token-refactor, Property 4: Line count threshold detection**
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  analyzeLineCount,
  exceedsLineThreshold,
  getCodeLineCount,
  isBlankLine,
  isSingleLineComment,
  LINE_COUNT_THRESHOLD,
} from './lineAnalyzer';

describe('Line Count Analyzer - Property Tests', () => {
  /**
   * **Feature: theme-token-refactor, Property 4: Line count threshold detection**
   * 
   * For any file exceeding 200 lines after transformation, the system SHALL 
   * flag the file for component extraction.
   */
  it('should flag files with code lines exceeding threshold', () => {
    fc.assert(
      fc.property(
        // Generate a number of code lines above threshold
        fc.integer({ min: LINE_COUNT_THRESHOLD + 1, max: LINE_COUNT_THRESHOLD + 100 }),
        (codeLineCount) => {
          // Generate content with exactly codeLineCount code lines
          const codeLines = Array.from(
            { length: codeLineCount },
            (_, i) => `const x${i} = ${i};`
          );
          const content = codeLines.join('\n');

          const result = analyzeLineCount(content);

          expect(result.exceedsThreshold).toBe(true);
          expect(result.codeLines).toBe(codeLineCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not flag files with code lines at or below threshold', () => {
    fc.assert(
      fc.property(
        // Generate a number of code lines at or below threshold
        fc.integer({ min: 1, max: LINE_COUNT_THRESHOLD }),
        (codeLineCount) => {
          const codeLines = Array.from(
            { length: codeLineCount },
            (_, i) => `const x${i} = ${i};`
          );
          const content = codeLines.join('\n');

          const result = analyzeLineCount(content);

          expect(result.exceedsThreshold).toBe(false);
          expect(result.codeLines).toBe(codeLineCount);
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should exclude blank lines from code count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 5, max: 30 }),
        (codeLineCount, blankLineCount) => {
          // Create content with code lines followed by blank lines
          const lines: string[] = [];
          for (let i = 0; i < codeLineCount; i++) {
            lines.push(`const x${i} = ${i};`);
          }
          for (let i = 0; i < blankLineCount; i++) {
            lines.push('');
          }
          const content = lines.join('\n');

          const result = analyzeLineCount(content);

          expect(result.codeLines).toBe(codeLineCount);
          expect(result.blankLines).toBe(blankLineCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude single-line comments from code count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 5, max: 30 }),
        (codeLineCount, commentLineCount) => {
          // Create content with code lines and comment lines
          const lines: string[] = [];
          for (let i = 0; i < codeLineCount; i++) {
            lines.push(`const x${i} = ${i};`);
          }
          for (let i = 0; i < commentLineCount; i++) {
            lines.push(`// This is comment ${i}`);
          }
          const content = lines.join('\n');

          const result = analyzeLineCount(content);

          expect(result.codeLines).toBe(codeLineCount);
          expect(result.commentLines).toBe(commentLineCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude block comments from code count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 2, max: 10 }),
        (codeLineCount, blockCommentLines) => {
          // Create content with code lines and a block comment
          const lines: string[] = [];
          for (let i = 0; i < codeLineCount; i++) {
            lines.push(`const x${i} = ${i};`);
          }
          // Add block comment
          lines.push('/*');
          for (let i = 0; i < blockCommentLines - 2; i++) {
            lines.push(` * Comment line ${i}`);
          }
          lines.push(' */');
          const content = lines.join('\n');

          const result = analyzeLineCount(content);

          expect(result.codeLines).toBe(codeLineCount);
          expect(result.commentLines).toBe(blockCommentLines);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly sum all line types to total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 30 }),
        fc.integer({ min: 2, max: 15 }),
        fc.integer({ min: 2, max: 15 }),
        (codeLineCount, blankLineCount, commentLineCount) => {
          const lines: string[] = [];
          
          // Add code lines
          for (let i = 0; i < codeLineCount; i++) {
            lines.push(`const x${i} = ${i};`);
          }
          // Add blank lines
          for (let i = 0; i < blankLineCount; i++) {
            lines.push('');
          }
          // Add comment lines
          for (let i = 0; i < commentLineCount; i++) {
            lines.push(`// Comment ${i}`);
          }
          
          const content = lines.join('\n');
          const result = analyzeLineCount(content);

          expect(result.totalLines).toBe(codeLineCount + blankLineCount + commentLineCount);
          expect(result.codeLines + result.blankLines + result.commentLines).toBe(result.totalLines);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Line Count Analyzer - Helper Functions', () => {
  it('isBlankLine should identify blank lines correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (spaceCount) => {
          const line = ' '.repeat(spaceCount);
          expect(isBlankLine(line)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isSingleLineComment should identify // comments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        (indent, commentText) => {
          const line = ' '.repeat(indent) + '// ' + commentText;
          expect(isSingleLineComment(line)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exceedsLineThreshold should match analyzeLineCount result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 300 }),
        (lineCount) => {
          const lines = Array.from({ length: lineCount }, (_, i) => `const x${i} = ${i};`);
          const content = lines.join('\n');

          const result = analyzeLineCount(content);
          const exceeds = exceedsLineThreshold(content);

          expect(exceeds).toBe(result.exceedsThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getCodeLineCount should return codeLines from analyzeLineCount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (lineCount) => {
          const lines = Array.from({ length: lineCount }, (_, i) => `const x${i} = ${i};`);
          const content = lines.join('\n');

          const result = analyzeLineCount(content);
          const codeCount = getCodeLineCount(content);

          expect(codeCount).toBe(result.codeLines);
        }
      ),
      { numRuns: 100 }
    );
  });
});
