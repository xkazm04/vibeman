/**
 * Focus Ring Styles Utility
 *
 * Provides theme-aware focus-visible ring styles for keyboard accessibility.
 * Uses focus-visible:ring-2 focus-visible:ring-offset-2 with theme-specific ring colors:
 * - Midnight Pulse: cyan (cyan-500/60)
 * - Phantom Frequency: purple (purple-500/60)
 * - Shadow Nexus: rose (rose-500/60)
 *
 * Uses focus-visible (not focus) so rings only appear on keyboard navigation,
 * not on mouse clicks. The ring-offset matches the dark theme background (#0f0f23).
 */

import { AppTheme, THEME_CONFIGS } from '@/stores/themeStore';

/**
 * Focus ring color configurations per theme
 */
const FOCUS_RING_COLORS: Record<AppTheme, string> = {
  midnight: 'focus-visible:ring-cyan-500/60',
  phantom: 'focus-visible:ring-purple-500/60',
  shadow: 'focus-visible:ring-rose-500/60',
};

/**
 * Returns theme-aware focus-visible ring Tailwind classes
 *
 * @param theme - The current app theme
 * @returns Tailwind class string for focus-visible ring styling
 *
 * @example
 * const focusClasses = getFocusRingStyles('midnight');
 * // Returns: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-[#0f0f23]"
 */
export function getFocusRingStyles(theme: AppTheme): string {
  const ringColor = FOCUS_RING_COLORS[theme];
  return `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringColor} focus-visible:ring-offset-[#0f0f23]`;
}

/**
 * Returns the focus ring color class for a given theme
 *
 * @param theme - The current app theme
 * @returns Just the ring color class (e.g., "focus-visible:ring-cyan-500/60")
 */
export function getFocusRingColor(theme: AppTheme): string {
  return FOCUS_RING_COLORS[theme];
}

/**
 * Base focus-visible ring classes without the color (for use with custom colors)
 */
export const FOCUS_RING_BASE = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f23]';

/**
 * Pre-computed focus ring class strings for each theme
 * Use these for static class assignments when theme is known at compile time
 */
export const FOCUS_RING_CLASSES = {
  midnight: `${FOCUS_RING_BASE} focus-visible:ring-cyan-500/60`,
  phantom: `${FOCUS_RING_BASE} focus-visible:ring-purple-500/60`,
  shadow: `${FOCUS_RING_BASE} focus-visible:ring-rose-500/60`,
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
