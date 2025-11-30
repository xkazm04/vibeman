/**
 * Color Token Mapper
 * 
 * Maps hardcoded cyan Tailwind classes to theme tokens from the theme store.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import type { ThemeColors } from '@/stores/themeStore';
import type { ColorCategory } from './colorScanner';

export interface ColorMapping {
  pattern: RegExp;
  category: ColorCategory;
  tokenPath: keyof ThemeColors;
}

/**
 * Mapping of cyan color patterns to theme tokens.
 * 
 * The midnight theme uses cyan as its base color, so these mappings
 * ensure visual parity when the default theme is active.
 */
export const COLOR_MAPPINGS: ColorMapping[] = [
  // Text colors - map cyan shades to semantic text tokens
  { pattern: /text-cyan-200/, category: 'text', tokenPath: 'textLight' },
  { pattern: /text-cyan-300/, category: 'text', tokenPath: 'text' },
  { pattern: /text-cyan-400/, category: 'text', tokenPath: 'textDark' },
  
  // Border colors - map cyan borders with opacity to semantic border tokens
  { pattern: /border-cyan-500\/20/, category: 'border', tokenPath: 'borderLight' },
  { pattern: /border-cyan-500\/30/, category: 'border', tokenPath: 'border' },
  { pattern: /border-cyan-500\/50/, category: 'border', tokenPath: 'borderHover' },
  
  // Background colors - map cyan backgrounds with opacity to semantic bg tokens
  { pattern: /bg-cyan-500\/5/, category: 'background', tokenPath: 'bgLight' },
  { pattern: /bg-cyan-500\/10/, category: 'background', tokenPath: 'bg' },
  { pattern: /bg-cyan-500\/20/, category: 'background', tokenPath: 'bgHover' },
  
  // Shadow/glow colors - map cyan shadows to glow token
  { pattern: /shadow-cyan-500\/\d+/, category: 'shadow', tokenPath: 'glow' },
  
  // Gradient colors - map cyan gradient stops to primary gradient tokens
  { pattern: /from-cyan-\d+/, category: 'gradient', tokenPath: 'primaryFrom' },
  { pattern: /via-cyan-\d+/, category: 'gradient', tokenPath: 'primaryVia' },
  { pattern: /to-cyan-\d+/, category: 'gradient', tokenPath: 'primaryTo' },
];

/**
 * Result of mapping a color class to a theme token
 */
export interface MappingResult {
  original: string;
  tokenPath: keyof ThemeColors;
  category: ColorCategory;
  matched: boolean;
}

/**
 * Maps a hardcoded cyan color class to its corresponding theme token.
 * 
 * @param colorClass - The original Tailwind color class (e.g., "text-cyan-400")
 * @returns MappingResult with the token path if matched, or matched: false if no mapping exists
 */
export function mapColorToToken(colorClass: string): MappingResult {
  for (const mapping of COLOR_MAPPINGS) {
    if (mapping.pattern.test(colorClass)) {
      return {
        original: colorClass,
        tokenPath: mapping.tokenPath,
        category: mapping.category,
        matched: true,
      };
    }
  }
  
  return {
    original: colorClass,
    tokenPath: 'text', // Default fallback
    category: 'text',
    matched: false,
  };
}

/**
 * Gets the theme token value for a given token path.
 * This is used to verify that the mapping produces the correct visual result.
 * 
 * @param colors - The ThemeColors object from the theme store
 * @param tokenPath - The key in ThemeColors to retrieve
 * @returns The Tailwind class string for that token
 */
export function getTokenValue(colors: ThemeColors, tokenPath: keyof ThemeColors): string {
  return colors[tokenPath];
}

/**
 * Transforms a color class to use a theme token reference.
 * Returns the template literal expression to use in code.
 * 
 * @param colorClass - The original Tailwind color class
 * @returns The transformed expression using theme tokens, or null if no mapping
 */
export function transformToTokenExpression(colorClass: string): string | null {
  const result = mapColorToToken(colorClass);
  
  if (!result.matched) {
    return null;
  }
  
  // Return the expression that would be used in a template literal
  // e.g., ${getThemeColors().text}
  return `\${getThemeColors().${result.tokenPath}}`;
}

/**
 * Checks if a color class has a valid mapping to a theme token.
 * 
 * @param colorClass - The Tailwind color class to check
 * @returns true if the class can be mapped to a theme token
 */
export function hasMapping(colorClass: string): boolean {
  return mapColorToToken(colorClass).matched;
}

/**
 * Gets all mappable color patterns for a given category.
 * 
 * @param category - The color category to filter by
 * @returns Array of ColorMapping objects for that category
 */
export function getMappingsForCategory(category: ColorCategory): ColorMapping[] {
  return COLOR_MAPPINGS.filter(m => m.category === category);
}
