import { TaskData } from './backlogTypes';

/**
 * Validate task data has all required fields
 */
export function validateTaskData(taskData: TaskData): boolean {
  return !!(
    taskData.title &&
    taskData.description &&
    taskData.steps &&
    taskData.type
  );
}

/**
 * Format date relative to now
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Clean filepath by removing action suffixes
 */
export function cleanFilepath(filepath: string): string {
  return filepath.replace(/\|(create|update)$/, '').trim();
}

/**
 * Extract filename from filepath
 */
export function getFilenameFromPath(filepath: string): string {
  return filepath.split('/').pop() || filepath;
}
