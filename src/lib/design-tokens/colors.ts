/**
 * Design Tokens - Color System
 *
 * Centralized color definitions for status states, entity types, and semantic colors.
 * Provides consistent visual language across the application with support for dark/light themes.
 */

/**
 * Status color definitions for idea/task states
 */
export const statusColors = {
  accepted: {
    border: 'border-green-500/40',
    borderHover: 'hover:border-green-400/60',
    bg: 'bg-green-900/10',
    bgHover: 'hover:bg-green-800/30',
    text: 'text-green-400',
    ring: 'focus-visible:ring-green-400/70',
    hex: '#22c55e', // green-500
  },
  rejected: {
    border: 'border-red-500/40',
    borderHover: 'hover:border-red-400/60',
    bg: 'bg-red-900/10',
    bgHover: 'hover:bg-red-800/30',
    text: 'text-red-400',
    ring: 'focus-visible:ring-red-400/70',
    hex: '#ef4444', // red-500
  },
  implemented: {
    border: 'border-amber-500/40',
    borderHover: 'hover:border-amber-400/60',
    bg: 'bg-amber-900/10',
    bgHover: 'hover:bg-amber-800/30',
    text: 'text-amber-400',
    ring: 'focus-visible:ring-amber-400/70',
    hex: '#f59e0b', // amber-500
  },
  pending: {
    border: 'border-gray-600/40',
    borderHover: 'hover:border-gray-500/60',
    bg: 'bg-gray-800/20',
    bgHover: 'hover:bg-gray-700/40',
    text: 'text-gray-400',
    ring: 'focus-visible:ring-blue-400/70',
    hex: '#6b7280', // gray-500
  },
} as const;

/**
 * Entity color tokens for different types (contexts, groups, etc.)
 */
export const entityColors = {
  default: {
    hex: '#6b7280', // gray-500
    rgb: { r: 107, g: 114, b: 128 },
  },
} as const;

/**
 * Common base classes for focus states
 */
export const focusClasses = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900';

/**
 * Status type union
 */
export type StatusType = keyof typeof statusColors;

/**
 * Helper to extract RGB values from hex color
 * @param hex - Hex color string (with or without #)
 * @returns RGB values as {r, g, b} object
 */
export function getRGBFromHex(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : entityColors.default.rgb;
}

/**
 * Helper to create rgba() string from hex color with alpha
 * @param hex - Hex color string
 * @param alpha - Alpha value (0-1)
 * @returns rgba() CSS string
 */
export function hexToRGBA(hex: string, alpha: number): string {
  const rgb = getRGBFromHex(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
