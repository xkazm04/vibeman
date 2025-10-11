/**
 * Context Module Constants
 * Centralized configuration for icons, colors, and UI constants
 */

import { 
  Code, 
  Database, 
  Layers, 
  Grid, 
  Activity, 
  Cpu, 
  Zap, 
  Settings,
  LucideIcon 
} from 'lucide-react';

/**
 * Icon mapping for context groups based on group name patterns
 */
export const GROUP_ICON_MAPPING: Record<string, LucideIcon> = {
  api: Database,
  backend: Database,
  ui: Layers,
  component: Layers,
  util: Grid,
  helper: Grid,
  test: Activity,
  spec: Activity,
  config: Cpu,
  setting: Cpu,
  default: Code
};

/**
 * Available icon options for group customization
 */
export const ICON_OPTIONS = [
  { name: 'Code', icon: Code },
  { name: 'Database', icon: Database },
  { name: 'Layers', icon: Layers },
  { name: 'Grid', icon: Grid },
  { name: 'Activity', icon: Activity },
  { name: 'Cpu', icon: Cpu },
  { name: 'Zap', icon: Zap },
  { name: 'Settings', icon: Settings },
] as const;

/**
 * Timeline format options for date formatting
 */
export const DATE_FORMAT_OPTIONS = {
  SHORT: {
    year: 'numeric' as const,
    month: 'short' as const,
    day: 'numeric' as const,
  },
  LONG: {
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
  },
  TIME_ONLY: {
    hour: '2-digit' as const,
    minute: '2-digit' as const,
  }
};

/**
 * Grid layout configurations based on item count
 */
export const GRID_LAYOUT_CONFIG = {
  1: 'grid-cols-1 max-w-md mx-auto',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2',
  6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  9: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  default: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
};

/**
 * Animation constants for consistent motion
 */
export const ANIMATION_CONFIG = {
  SPRING: { stiffness: 300, damping: 30 },
  DURATION: {
    FAST: 0.2,
    NORMAL: 0.3,
    SLOW: 0.5
  },
  DELAY_PER_ITEM: 0.1,
  GRID_DURATION: 12,
  PARTICLE_DURATION: 3
};

/**
 * Context file modal constants
 */
export const MODAL_CONSTANTS = {
  MAX_HEIGHT: '85vh',
  MAX_WIDTH: '5xl',
  PREVIEW_MODE: {
    EDIT: 'edit' as const,
    PREVIEW: 'preview' as const
  }
};

/**
 * File path display constants
 */
export const FILE_DISPLAY_CONFIG = {
  MAX_PREVIEW_FILES: 15,
  GRID_COLUMNS: 3,
  MAX_PATH_LENGTH: 50
};

/**
 * Context menu action types
 */
export const CONTEXT_MENU_ACTIONS = {
  SELECT: 'select',
  TOGGLE_BACKLOG: 'toggleForBacklog',
  COPY: 'copy',
  EDIT: 'edit',
  DELETE: 'delete',
  OPEN: 'open',
  CONTEXT_FILE: 'contextFile'
} as const;

export type ContextMenuAction = typeof CONTEXT_MENU_ACTIONS[keyof typeof CONTEXT_MENU_ACTIONS];
