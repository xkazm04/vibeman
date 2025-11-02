/**
 * Context Group Color Palette
 *
 * Predefined colors for context groups (9 colors for 3x3 grid).
 * This is the single source of truth for all context color assignments.
 */
export const CONTEXT_GROUP_COLORS = [
  '#8B5CF6', // blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#EC4899', // red
  '#84CC16', // Lime
  '#6366F1', // slate
] as const;

/**
 * Type for valid context colors
 */
export type ContextColor = typeof CONTEXT_GROUP_COLORS[number];

/**
 * Hook to access context colors
 * Provides the color palette and utility functions
 */
export const useContextColors = () => {
  return {
    colors: CONTEXT_GROUP_COLORS,
    getColorByIndex: (index: number) => CONTEXT_GROUP_COLORS[index % CONTEXT_GROUP_COLORS.length],
    isValidColor: (color: string): color is ContextColor =>
      CONTEXT_GROUP_COLORS.includes(color as ContextColor),
  };
};
