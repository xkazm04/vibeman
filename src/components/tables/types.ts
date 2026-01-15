import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Table column definition
 */
export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
}

/**
 * Table action button configuration
 */
export interface TableAction {
  id: string;
  icon: LucideIcon;
  label: string;
  colorScheme: 'green' | 'red' | 'cyan' | 'purple' | 'gray' | 'amber';
  onClick: (e: React.MouseEvent) => void | Promise<void>;
  visible?: boolean;
  disabled?: boolean;
}

/**
 * Badge configuration for row types
 */
export interface BadgeConfig {
  icon: LucideIcon;
  label: string;
  colorScheme: 'purple' | 'cyan' | 'green' | 'red' | 'amber' | 'gray';
}

/**
 * Color scheme styles mapping
 */
export const badgeColorSchemes: Record<BadgeConfig['colorScheme'], string> = {
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

/**
 * Action button color scheme styles
 */
export const actionColorSchemes: Record<TableAction['colorScheme'], { base: string; hover: string }> = {
  green: { base: 'text-green-400', hover: 'hover:text-green-300 hover:bg-green-500/10' },
  red: { base: 'text-red-400', hover: 'hover:text-red-300 hover:bg-red-500/10' },
  cyan: { base: 'text-cyan-400', hover: 'hover:text-cyan-300 hover:bg-cyan-500/10' },
  purple: { base: 'text-purple-400', hover: 'hover:text-purple-300 hover:bg-purple-500/10' },
  gray: { base: 'text-gray-500', hover: 'hover:text-gray-300 hover:bg-gray-500/10' },
  amber: { base: 'text-amber-400', hover: 'hover:text-amber-300 hover:bg-amber-500/10' },
};

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  icons?: LucideIcon[];
  title: string;
  description?: string;
}

/**
 * Table stats item
 */
export interface TableStat {
  value: number;
  label: string;
  colorScheme: 'purple' | 'cyan' | 'green' | 'red' | 'amber' | 'gray';
}

/**
 * Stat color mapping
 */
export const statColors: Record<TableStat['colorScheme'], string> = {
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
  green: 'text-green-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
  gray: 'text-gray-400',
};
