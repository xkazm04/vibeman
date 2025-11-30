/**
 * Property-Based Tests for Color Token Mapper
 * 
 * **Feature: theme-token-refactor, Property 2: Color transformation correctness**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  mapColorToToken, 
  getTokenValue, 
  hasMapping,
  COLOR_MAPPINGS,
  transformToTokenExpression 
} from './colorMapper';
import { THEME_CONFIGS } from '@/stores/themeStore';
import type { ColorCategory } from './colorScanner';

// The midnight theme uses cyan as its base color
const midnightColors = THEME_CONFIGS.midnight.colors;

/**
 * Known cyan color classes that should map to specific tokens
 */
const KNOWN_MAPPINGS: { colorClass: string; expectedToken: keyof typeof midnightColors; category: ColorCategory }[] = [
  // Text colors
  { colorClass: 'text-cyan-200', expectedToken: 'textLight', category: 'text' },
  { colorClass: 'text-cyan-300', expectedToken: 'text', category: 'text' },
  { colorClass: 'text-cyan-400', expectedToken: 'textDark', category: 'text' },
  
  // Border colors
  { colorClass: 'border-cyan-500/20', expectedToken: 'borderLight', category: 'border' },
  { colorClass: 'border-cyan-500/30', expectedToken: 'border', category: 'border' },
  { colorClass: 'border-cyan-500/50', expectedToken: 'borderHover', category: 'border' },
  
  // Background colors
  { colorClass: 'bg-cyan-500/5', expectedToken: 'bgLight', category: 'background' },
  { colorClass: 'bg-cyan-500/10', expectedToken: 'bg', category: 'background' },
  { colorClass: 'bg-cyan-500/20', expectedToken: 'bgHover', category: 'background' },
];

describe('Color Token Mapper - Property Tests', () => {
  /**
   * **Feature: theme-token-refactor, Property 2: Color transformation correctness**
   * 
   * For any hardcoded cyan color class (text, border, background, shadow, or gradient),
   * the transformer SHALL produce the semantically equivalent theme token that renders
   * identically when the midnight theme is active.
   */
  it('should map known cyan classes to tokens that render identically in midnight theme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_MAPPINGS),
        ({ colorClass, expectedToken }) => {
          const result = mapColorToToken(colorClass);
          
          // Should match
          expect(result.matched).toBe(true);
          
          // Should map to the expected token
          expect(result.tokenPath).toBe(expectedToken);
          
          // The token value in midnight theme should match the original class
          const tokenValue = getTokenValue(midnightColors, result.tokenPath);
          expect(tokenValue).toBe(colorClass);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly categorize all mapped color classes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_MAPPINGS),
        ({ colorClass, category }) => {
          const result = mapColorToToken(colorClass);
          
          expect(result.matched).toBe(true);
          expect(result.category).toBe(category);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce valid template expressions for all mappable classes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_MAPPINGS),
        ({ colorClass, expectedToken }) => {
          const expression = transformToTokenExpression(colorClass);
          
          // Should produce a valid expression
          expect(expression).not.toBeNull();
          expect(expression).toContain('getThemeColors()');
          expect(expression).toContain(expectedToken);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for unmapped color classes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'text-red-500',
          'bg-blue-400',
          'border-gray-300',
          'text-purple-500',
          'shadow-pink-500/50',
          'from-orange-500'
        ),
        (nonCyanClass) => {
          const result = mapColorToToken(nonCyanClass);
          expect(result.matched).toBe(false);
          
          const expression = transformToTokenExpression(nonCyanClass);
          expect(expression).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle shadow patterns with various opacities', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 100 }),
        (opacity) => {
          const colorClass = `shadow-cyan-500/${opacity}`;
          const result = mapColorToToken(colorClass);
          
          expect(result.matched).toBe(true);
          expect(result.category).toBe('shadow');
          expect(result.tokenPath).toBe('glow');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle gradient patterns with various shades', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('from', 'via', 'to'),
        fc.integer({ min: 100, max: 900 }).filter(n => n % 100 === 0),
        (prefix, shade) => {
          const colorClass = `${prefix}-cyan-${shade}`;
          const result = mapColorToToken(colorClass);
          
          expect(result.matched).toBe(true);
          expect(result.category).toBe('gradient');
          
          // Verify correct token mapping
          const expectedToken = prefix === 'from' ? 'primaryFrom' 
            : prefix === 'via' ? 'primaryVia' 
            : 'primaryTo';
          expect(result.tokenPath).toBe(expectedToken);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent hasMapping results with mapColorToToken', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...KNOWN_MAPPINGS.map(m => m.colorClass),
          'text-red-500',
          'bg-blue-400',
          'border-gray-300'
        ),
        (colorClass) => {
          const mappingResult = mapColorToToken(colorClass);
          const hasMappingResult = hasMapping(colorClass);
          
          expect(hasMappingResult).toBe(mappingResult.matched);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure all COLOR_MAPPINGS have corresponding midnight theme values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COLOR_MAPPINGS),
        (mapping) => {
          // Every mapping should reference a valid token in ThemeColors
          const tokenValue = midnightColors[mapping.tokenPath];
          expect(tokenValue).toBeDefined();
          expect(typeof tokenValue).toBe('string');
          expect(tokenValue.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
