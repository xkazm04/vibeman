/**
 * Idea Category Type Definition
 * Central source of truth for idea categorization
 */

/**
 * Standard idea categories
 * These are the recommended/guideline categories for ideas
 */
export const IDEA_CATEGORIES = [
  'functionality',
  'performance',
  'maintenance',
  'ui',
  'code_quality',
  'user_benefit'
] as const;

/**
 * Idea category type
 * Union of standard categories as the primary type
 */
export type IdeaCategory = typeof IDEA_CATEGORIES[number];

/**
 * Type guard to check if a string is a standard category
 */
export function isStandardCategory(category: string): category is IdeaCategory {
  return IDEA_CATEGORIES.includes(category as IdeaCategory);
}

/**
 * Get all standard categories as an array
 */
export function getStandardCategories(): readonly IdeaCategory[] {
  return IDEA_CATEGORIES;
}

