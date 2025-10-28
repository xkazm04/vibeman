'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface ActionConfig {
  /** Unique identifier for the action */
  id: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Button label text */
  text: string;
  /** Click handler */
  onClick: () => void;
  /** Tooltip text */
  tooltip?: string;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Gradient color scheme: 'blue' | 'amber' | 'red' | 'green' | 'purple' */
  colorScheme?: 'blue' | 'amber' | 'red' | 'green' | 'purple';
  /** Icon-only mode (no text) */
  iconOnly?: boolean;
  /** Icon animation on hover */
  iconAnimation?: 'rotate' | 'scale' | 'none';
}

interface ActionGroupProps {
  /** Optional label for the action group */
  label?: string;
  /** Array of action configurations */
  actions: ActionConfig[];
  /** Additional CSS classes for the container */
  className?: string;
}

const colorSchemes = {
  blue: {
    bg: 'from-blue-500/20 to-red-500/20',
    hover: 'hover:from-blue-500/30 hover:to-red-500/30',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  amber: {
    bg: 'from-amber-500/20 to-orange-500/20',
    hover: 'hover:from-amber-500/30 hover:to-orange-500/30',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  red: {
    bg: 'from-red-500/20 to-red-600/20',
    hover: 'hover:from-red-500/30 hover:to-red-600/30',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  green: {
    bg: 'from-green-500/20 to-emerald-500/20',
    hover: 'hover:from-green-500/30 hover:to-emerald-500/30',
    border: 'border-green-500/30',
    text: 'text-green-400',
  },
  purple: {
    bg: 'from-purple-500/20 to-pink-500/20',
    hover: 'hover:from-purple-500/30 hover:to-pink-500/30',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
};

const iconAnimations = {
  rotate: 'group-hover:rotate-90 transition-transform duration-300',
  scale: 'group-hover:scale-110 transition-transform duration-300',
  none: '',
};

/**
 * ActionGroup - Reusable component for rendering a styled container with action buttons
 *
 * Provides consistent layout and styling for groups of action buttons with:
 * - Optional group label
 * - Icon and text support
 * - Hover animations
 * - Color scheme variants
 * - Tooltip support
 * - Disabled states
 */
export default function ActionGroup({ label, actions, className = '' }: ActionGroupProps) {
  return (
    <div className={`relative flex items-center space-x-3 px-4 py-3 bg-gray-800/30 rounded-lg border border-gray-700/40 min-w-0 ${className}`}>
      {/* Optional Section Label */}
      {label && (
        <div className="absolute -top-2 left-2 px-2 py-0.5 bg-gray-900 rounded text-sm font-bold text-amber-400 tracking-wider">
          {label}
        </div>
      )}

      <div className="flex items-center space-x-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const scheme = colorSchemes[action.colorScheme || 'blue'];
          const animation = iconAnimations[action.iconAnimation || 'scale'];

          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`flex items-center ${action.iconOnly ? 'justify-center px-2' : 'space-x-2 px-3'} py-1.5 bg-gradient-to-r ${scheme.bg} ${scheme.hover} border ${scheme.border} rounded-md ${scheme.text} transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed ${action.iconOnly ? '' : 'text-sm'}`}
              title={action.tooltip || action.text}
            >
              <Icon className={`w-3 h-3 ${animation}`} />
              {!action.iconOnly && <span className="font-medium">{action.text}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
