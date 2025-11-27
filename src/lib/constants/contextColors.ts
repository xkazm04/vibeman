/**
 * Context Group Color Palette
 *
 * Predefined colors for context groups (18 colors for variety).
 * This is the single source of truth for all context color assignments.
 */
export const CONTEXT_GROUP_COLORS = [
  // Row 1 - Original colors
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#6366F1', // Indigo
  // Row 2 - Extended palette
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7', // Purple
  '#22C55E', // Green
  '#E11D48', // Rose
  '#0EA5E9', // Sky
  '#FACC15', // Yellow
  '#64748B', // Slate
  '#D946EF', // Fuchsia
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
