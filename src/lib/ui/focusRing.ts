/**
 * Focus Ring Styles Utility
 *
 * Provides theme-aware focus ring styles for keyboard accessibility.
 * Uses focus:ring-2 focus:ring-offset-2 with theme-specific ring colors:
 * - Midnight Pulse: cyan (cyan-500)
 * - Phantom Frequency: purple (purple-500)
 * - Shadow Nexus: rose (rose-500)
 *
 * The ring-offset-background matches the dark theme background (#0f0f23).
 */

import { AppTheme, THEME_CONFIGS } from '@/stores/themeStore';

/**
 * Focus ring color configurations per theme
 */
const FOCUS_RING_COLORS: Record<AppTheme, string> = {
  midnight: 'focus:ring-cyan-500',
  phantom: 'focus:ring-purple-500',
  shadow: 'focus:ring-rose-500',
};

/**
 * Returns theme-aware focus ring Tailwind classes
 *
 * @param theme - The current app theme
 * @returns Tailwind class string for focus ring styling
 *
 * @example
 * const focusClasses = getFocusRingStyles('midnight');
 * // Returns: "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-[#0f0f23]"
 */
export function getFocusRingStyles(theme: AppTheme): string {
  const ringColor = FOCUS_RING_COLORS[theme];
  return `focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringColor} focus:ring-offset-[#0f0f23]`;
}

/**
 * Returns the focus ring color class for a given theme
 *
 * @param theme - The current app theme
 * @returns Just the ring color class (e.g., "focus:ring-cyan-500")
 */
export function getFocusRingColor(theme: AppTheme): string {
  return FOCUS_RING_COLORS[theme];
}

/**
 * Base focus ring classes without the color (for use with custom colors)
 */
export const FOCUS_RING_BASE = 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f0f23]';

/**
 * Pre-computed focus ring class strings for each theme
 * Use these for static class assignments when theme is known at compile time
 */
export const FOCUS_RING_CLASSES = {
  midnight: `${FOCUS_RING_BASE} focus:ring-cyan-500`,
  phantom: `${FOCUS_RING_BASE} focus:ring-purple-500`,
  shadow: `${FOCUS_RING_BASE} focus:ring-rose-500`,
} as const;

/**
 * Hook-compatible focus ring getter
 * Can be used in components that need focus ring styles with the current theme
 *
 * @example
 * // In a component:
 * const { theme } = useThemeStore();
 * const focusRingClasses = getFocusRingStyles(theme);
 */
export default getFocusRingStyles;
