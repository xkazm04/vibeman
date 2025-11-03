import { Goal } from '../../../../types';

/**
 * Sort goals by order
 * @param goals - Array of goals
 * @returns Sorted array of goals
 */
export function sortGoalsByOrder(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => a.order - b.order);
}

/**
 * Find the first in-progress goal
 * @param goals - Array of goals
 * @returns First in-progress goal or null
 */
export function findInProgressGoal(goals: Goal[]): Goal | null {
  return goals.find(goal => goal.status === 'in_progress') || null;
}

/**
 * Get the next available order number for a new goal
 * @param goals - Array of existing goals
 * @returns Next order number
 */
export function getNextOrder(goals: Goal[]): number {
  return Math.max(...goals.map(g => g.order), 0) + 1;
}

/**
 * Format goal status for display (replace underscores with spaces)
 * @param status - Goal status
 * @returns Formatted status string
 */
export function formatStatus(status: Goal['status']): string {
  return status.replace('_', ' ');
}

/**
 * Calculate optimal timeline offset to show in-progress goal
 * @param goals - Sorted array of goals
 * @param maxVisibleGoals - Maximum number of visible goals
 * @param goalWidth - Width of each goal in pixels
 * @returns Optimal offset in pixels
 */
export function calculateOptimalTimelineOffset(
  goals: Goal[],
  maxVisibleGoals: number,
  goalWidth: number
): number {
  const inProgressGoal = findInProgressGoal(goals);
  if (!inProgressGoal || goals.length <= maxVisibleGoals) return 0;
  
  const inProgressIndex = goals.findIndex(goal => goal.id === inProgressGoal.id);
  
  // If in-progress goal is within the first visible goals, show from beginning
  if (inProgressIndex < maxVisibleGoals) return 0;
  
  // Calculate offset to put in-progress goal at the leftmost position
  const maxOffset = Math.max(0, (goals.length - maxVisibleGoals) * goalWidth);
  const desiredOffset = inProgressIndex * goalWidth;
  
  return Math.min(desiredOffset, maxOffset);
}

/**
 * Validate goal data
 * @param goal - Partial goal data
 * @returns True if valid, false otherwise
 */
export function validateGoalData(goal: Partial<Goal>): boolean {
  return Boolean(goal.title && goal.title.trim().length > 0);
}

/**
 * Format configuration presets for date display
 */
const DATE_FORMAT_OPTIONS = {
  long: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  } as const,
  short: {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  } as const,
};

/**
 * Normalize date to Date object
 * @param date - Date string or Date object
 * @returns Date object
 */
function normalizeDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Format date for display
 * @param date - Date string or Date object
 * @param format - Date format ('short' | 'long')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const dateObj = normalizeDate(date);
  const options = DATE_FORMAT_OPTIONS[format];
  return dateObj.toLocaleDateString('en-US', options);
}
