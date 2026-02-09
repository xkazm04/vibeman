/**
 * Context Utility Functions
 * Pure helper functions for context operations
 */

import { LucideIcon } from 'lucide-react';
import { Context } from '../../../../stores/contextStore';
import { normalizePath, FilePath } from '../../../../utils/pathUtils';
import {
  GROUP_ICON_MAPPING,
  DATE_FORMAT_OPTIONS,
  GRID_LAYOUT_CONFIG,
  FILE_DISPLAY_CONFIG
} from './constants';

/**
 * Format date with specified format option
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'time' = 'long'): string {
  const formatOptions = format === 'short' 
    ? DATE_FORMAT_OPTIONS.SHORT 
    : format === 'time' 
    ? DATE_FORMAT_OPTIONS.TIME_ONLY 
    : DATE_FORMAT_OPTIONS.LONG;
    
  return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
}

/**
 * Get icon component for a context group based on its name
 */
export function getGroupIcon(groupName?: string): LucideIcon {
  if (!groupName) return GROUP_ICON_MAPPING.default;
  
  const name = groupName.toLowerCase();
  
  for (const [key, icon] of Object.entries(GROUP_ICON_MAPPING)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  
  return GROUP_ICON_MAPPING.default;
}

/**
 * Calculate days since creation
 */
export function calculateDaysSince(date: Date): number {
  return Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate total files across all contexts
 */
export function calculateTotalFiles(contexts: Context[]): number {
  return contexts.reduce((sum, context) => sum + context.filePaths.length, 0);
}

/**
 * Get all unique file paths from contexts (normalized)
 */
export function getUniqueFilePaths(contexts: Context[]): string[] {
  return Array.from(new Set(contexts.flatMap(context => 
    context.filePaths.map(normalizePath)
  )));
}

/**
 * Get grid layout class based on item count
 */
export function getGridLayout(itemCount: number): string {
  if (itemCount === 1) return GRID_LAYOUT_CONFIG[1];
  if (itemCount === 2) return GRID_LAYOUT_CONFIG[2];
  if (itemCount === 3) return GRID_LAYOUT_CONFIG[3];
  if (itemCount <= 4) return GRID_LAYOUT_CONFIG[4];
  if (itemCount <= 6) return GRID_LAYOUT_CONFIG[6];
  if (itemCount <= 9) return GRID_LAYOUT_CONFIG[9];
  return GRID_LAYOUT_CONFIG.default;
}

/**
 * Extract filename from full path
 */
export function extractFileName(path: string): string {
  return FilePath.from(path).fileName;
}

/**
 * Truncate path if too long
 */
export function truncatePath(path: string, maxLength: number = FILE_DISPLAY_CONFIG.MAX_PATH_LENGTH): string {
  if (path.length <= maxLength) return path;
  
  const fileName = extractFileName(path);
  const remainingLength = maxLength - fileName.length - 3; // 3 for "..."
  
  if (remainingLength <= 0) {
    return `...${fileName}`;
  }
  
  const pathStart = path.substring(0, remainingLength);
  return `${pathStart}...${fileName}`;
}

/**
 * Get file paths to display (limited count)
 */
export function getDisplayFilePaths(filePaths: string[], maxCount: number = FILE_DISPLAY_CONFIG.MAX_PREVIEW_FILES): {
  displayed: string[];
  remaining: number;
} {
  const displayed = filePaths.slice(0, maxCount);
  const remaining = Math.max(0, filePaths.length - maxCount);
  
  return { displayed, remaining };
}

/**
 * Calculate context statistics for a group
 */
export function calculateGroupStats(contexts: Context[]): {
  totalContexts: number;
  totalFiles: number;
  uniqueFiles: number;
  averageFilesPerContext: number;
} {
  const totalContexts = contexts.length;
  const totalFiles = calculateTotalFiles(contexts);
  const uniqueFiles = getUniqueFilePaths(contexts).length;
  const averageFilesPerContext = totalContexts > 0 ? Math.round(totalFiles / totalContexts) : 0;
  
  return {
    totalContexts,
    totalFiles,
    uniqueFiles,
    averageFilesPerContext
  };
}

/**
 * Sort contexts by creation date (newest first)
 */
export function sortContextsByDate(contexts: Context[], descending: boolean = true): Context[] {
  return [...contexts].sort((a, b) => {
    const timeA = a.createdAt.getTime();
    const timeB = b.createdAt.getTime();
    return descending ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Filter contexts by group
 */
export function filterContextsByGroup(contexts: Context[], groupId: string): Context[] {
  return contexts.filter(context => context.groupId === groupId);
}

/**
 * Find contexts in the same group excluding current context
 */
export function getRelatedContexts(contexts: Context[], currentContextId: string, groupId?: string): Context[] {
  if (!groupId) return [];
  
  return contexts.filter(c => c.groupId === groupId && c.id !== currentContextId);
}

/**
 * Generate markdown content statistics
 */
export function getMarkdownStats(content: string): {
  lines: number;
  characters: number;
  words: number;
} {
  const lines = content.split('\n').length;
  const characters = content.length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  
  return { lines, characters, words };
}

/**
 * Get color with opacity
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // Assumes color is in hex format
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}
