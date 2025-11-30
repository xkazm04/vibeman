'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Database, FileText, RefreshCw } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Individual toolbar action button configuration
 */
export interface ToolbarAction {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Accessible label for screen readers (required) */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Tooltip text (falls back to label if not provided) */
  tooltip?: string;
  /** Color scheme for the button */
  colorScheme?: 'blue' | 'cyan' | 'purple' | 'green' | 'orange' | 'slate';
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export interface ProjectToolbarProps {
  /** Array of action buttons to display */
  actions: ToolbarAction[];
  /** Additional CSS classes */
  className?: string;
  /** Position the toolbar */
  position?: 'top-center' | 'top-right' | 'top-left';
  /** Show background blur and border */
  styled?: boolean;
}

/**
 * Get color scheme configurations for toolbar buttons with theme support
 */
function getColorSchemes() {
  const { getThemeColors } = useThemeStore.getState();
  const themeColors = getThemeColors();
  
  return {
    blue: {
      bg: 'bg-blue-600/20',
      hover: 'hover:bg-blue-500/30',
      text: 'text-blue-400',
      glow: 'hover:shadow-blue-500/30',
    },
    cyan: {
      bg: themeColors.bg,
      hover: `hover:${themeColors.bgHover}`,
      text: themeColors.text,
      glow: `hover:${themeColors.shadow}`,
    },
    purple: {
      bg: 'bg-purple-600/20',
      hover: 'hover:bg-purple-500/30',
      text: 'text-purple-400',
      glow: 'hover:shadow-purple-500/30',
    },
    green: {
      bg: 'bg-green-600/20',
      hover: 'hover:bg-green-500/30',
      text: 'text-green-400',
      glow: 'hover:shadow-green-500/30',
    },
    orange: {
      bg: 'bg-orange-600/20',
      hover: 'hover:bg-orange-500/30',
      text: 'text-orange-400',
      glow: 'hover:shadow-orange-500/30',
    },
    slate: {
      bg: 'bg-slate-600/20',
      hover: 'hover:bg-slate-500/30',
      text: 'text-slate-400',
      glow: 'hover:shadow-slate-500/30',
    },
  };
}

/**
 * Position configurations
 */
const positionClasses: Record<string, string> = {
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-6',
  'top-left': 'top-4 left-6',
};

/**
 * Individual toolbar button component
 */
const ToolbarButton: React.FC<{
  action: ToolbarAction;
}> = ({ action }) => {
  const colorSchemes = getColorSchemes();
  const scheme = colorSchemes[action.colorScheme || 'slate'];
  const Icon = action.icon;

  const baseClasses = `
    ${scheme.bg}
    ${scheme.hover}
    ${scheme.text}
    ${scheme.glow}
    p-2.5
    rounded-lg
    transition-all
    duration-200
    flex
    items-center
    justify-center
    border
    border-gray-700/40
    shadow-lg
    ${action.disabled || action.loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `
    .trim()
    .replace(/\s+/g, ' ');

  const content = action.loading ? (
    <svg
      className="animate-spin w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ) : (
    <Icon className="w-5 h-5" />
  );

  return (
    <motion.button
      type="button"
      className={baseClasses}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      aria-label={action.label}
      title={action.tooltip || action.label}
      whileHover={!action.disabled && !action.loading ? { scale: 1.05, y: -2 } : {}}
      whileTap={!action.disabled && !action.loading ? { scale: 0.95 } : {}}
      transition={{ duration: 0.15 }}
    >
      {content}
    </motion.button>
  );
};

/**
 * ProjectToolbar - A horizontally aligned toolbar for quick-action icons
 *
 * Features:
 * - Space-efficient horizontal row layout
 * - Lucide icons with Framer Motion hover animations
 * - Fully keyboard-focusable with aria-labels
 * - Responsive: collapses to stacked layout on small screens
 * - Multiple positioning options
 * - Customizable color schemes per button
 * - Loading and disabled states
 *
 * @example
 * <ProjectToolbar
 *   actions={[
 *     {
 *       icon: Database,
 *       label: "Sync database",
 *       onClick: handleDbSync,
 *       colorScheme: "blue",
 *     },
 *     {
 *       icon: FileText,
 *       label: "View documentation",
 *       onClick: handleViewDocs,
 *       colorScheme: "cyan",
 *     },
 *   ]}
 *   position="top-center"
 *   styled
 * />
 */
export default function ProjectToolbar({
  actions,
  className = '',
  position = 'top-center',
  styled = true,
}: ProjectToolbarProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const containerClasses = styled
    ? `
      bg-gray-900/80
      backdrop-blur-xl
      border
      border-gray-700/40
      rounded-xl
      shadow-2xl
    `.trim().replace(/\s+/g, ' ')
    : '';

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-40 ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={containerClasses}>
        {/* Horizontal row layout - responsive to stacked on mobile */}
        <div className="flex flex-row sm:flex-row flex-wrap gap-2 p-2">
          {actions.map((action, index) => (
            <ToolbarButton key={index} action={action} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Default preset actions for common use cases
 */
export const defaultActions: {
  dbSync: (onClick: () => void) => ToolbarAction;
  viewDocs: (onClick: () => void) => ToolbarAction;
  refresh: (onClick: () => void) => ToolbarAction;
} = {
  dbSync: (onClick) => ({
    icon: Database,
    label: 'Sync database',
    onClick,
    tooltip: 'Synchronize database',
    colorScheme: 'blue',
  }),
  viewDocs: (onClick) => ({
    icon: FileText,
    label: 'View documentation',
    onClick,
    tooltip: 'View project documentation',
    colorScheme: 'cyan',
  }),
  refresh: (onClick) => ({
    icon: RefreshCw,
    label: 'Refresh',
    onClick,
    tooltip: 'Refresh data',
    colorScheme: 'green',
  }),
};
