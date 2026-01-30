/**
 * Utility Functions
 * Common helpers used across the application
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 * Used for conditional class name composition
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
