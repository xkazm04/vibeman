/**
 * Property-Based Tests for Color Pattern Scanner
 * 
 * **Feature: theme-token-refactor, Property 1: Scanner completeness**
 * **Validates: Requirements 1.1, 1.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { scanContent, scanLine, ColorCategory } from './colorScanner';





describe('Color Pattern Scanner - Property Tests', () => {
  /**
   * **Feature: theme-token-refactor, Property 1: Scanner completeness**
   * 
   * For any source file containing cyan color patterns, the scanner SHALL 
   * identify and catalog all occurrences with their exact class names and line numbers.
   */
  it('should find all injected cyan patterns in content', () => {
    fc.assert(
      fc.property(
        // Generate a list of cyan patterns with their categories
        fc.array(
          fc.tuple(
            fc.constantFrom<ColorCategory>('text', 'border', 'background', 'shadow', 'gradient'),
            fc.integer({ min: 100, max: 900 }).filter(n => n % 100 === 0)
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (patternSpecs) => {
          // Build content with known cyan patterns
          const patterns: string[] = patternSpecs.map(([category, shade]) => {
            switch (category) {
              case 'text': return `text-cyan-${shade}`;
              case 'border': return `border-cyan-${shade}/30`;
              case 'background': return `bg-cyan-${shade}/10`;
              case 'shadow': return `shadow-cyan-${shade}/50`;
              case 'gradient': return `from-cyan-${shade}`;
            }
          });
          
          // Create content with patterns spread across lines
          const content = patterns.map(p => `<div className="${p}">content</div>`).join('\n');
          
          // Scan the content
          const results = scanContent(content);
          
          // Verify all patterns were found
          const foundPatterns = results.map(r => r.original);
          
          for (const pattern of patterns) {
            expect(foundPatterns).toContain(pattern);
          }
          
          // Verify count matches
          expect(results.length).toBe(patterns.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify line numbers for each pattern', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.constantFrom<ColorCategory>('text', 'border', 'background', 'shadow', 'gradient'),
        (lineCount, category) => {
          // Create content with a pattern on a specific line
          const targetLine = Math.floor(lineCount / 2) + 1;
          const lines: string[] = [];
          
          for (let i = 1; i <= lineCount; i++) {
            if (i === targetLine) {
              lines.push(`<div className="text-cyan-400">target</div>`);
            } else {
              lines.push(`<div className="text-gray-500">other</div>`);
            }
          }
          
          const content = lines.join('\n');
          const results = scanContent(content);
          
          // Should find exactly one pattern
          expect(results.length).toBe(1);
          expect(results[0].line).toBe(targetLine);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify column positions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (padding) => {
          const prefix = ' '.repeat(padding);
          const content = `${prefix}text-cyan-300`;
          
          const results = scanLine(content, 1);
          
          expect(results.length).toBe(1);
          expect(results[0].column).toBe(padding);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should categorize patterns correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ColorCategory>('text', 'border', 'background', 'shadow', 'gradient'),
        (category) => {
          let pattern: string;
          switch (category) {
            case 'text': pattern = 'text-cyan-400'; break;
            case 'border': pattern = 'border-cyan-500/30'; break;
            case 'background': pattern = 'bg-cyan-500/10'; break;
            case 'shadow': pattern = 'shadow-cyan-500/50'; break;
            case 'gradient': pattern = 'from-cyan-500'; break;
          }
          
          const content = `<div className="${pattern}">test</div>`;
          const results = scanContent(content);
          
          expect(results.length).toBe(1);
          expect(results[0].category).toBe(category);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should find multiple patterns on the same line', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (count) => {
          const patterns = Array.from({ length: count }, (_, i) => 
            `text-cyan-${(i + 2) * 100}`
          );
          const content = `<div className="${patterns.join(' ')}">test</div>`;
          
          const results = scanContent(content);
          
          expect(results.length).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not find patterns in non-cyan content', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            'text-red-500', 'bg-blue-400', 'border-gray-300',
            'text-purple-500', 'bg-green-400', 'shadow-pink-500/50',
            'from-orange-500', 'via-yellow-500', 'to-emerald-500'
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (nonCyanPatterns) => {
          const content = nonCyanPatterns.map(p => 
            `<div className="${p}">content</div>`
          ).join('\n');
          
          const results = scanContent(content);
          
          expect(results.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
