'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';
import { durations, scales, offsets } from '@/lib/design-tokens';

/**
 * Color schemes for IconButton
 */
export type IconButtonColorScheme =
  | 'blue'
  | 'cyan'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'green'
  | 'emerald'
  | 'slate'
  | 'gray';

/**
 * Size variants for IconButton
 */
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconButtonProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Click handler */
  onClick?: () => void;
  /** Accessible label for screen readers (required for accessibility) */
  'aria-label': string;
  /** Tooltip text (falls back to aria-label if not provided) */
  tooltip?: string;
  /** Color scheme */
  colorScheme?: IconButtonColorScheme;
  /** Size variant */
  size?: IconButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Enable hover animation */
  animate?: boolean;
  /** Variant style */
  variant?: 'solid' | 'ghost' | 'outline';
}

/**
 * Color scheme configurations
 */
const colorSchemes: Record<
  IconButtonColorScheme,
  {
    solid: { bg: string; hover: string; text: string; border: string };
    ghost: { bg: string; hover: string; text: string };
    outline: { bg: string; hover: string; text: string; border: string };
  }
> = {
  blue: {
    solid: {
      bg: 'bg-gradient-to-r from-blue-600/40 to-cyan-600/40',
      hover: 'hover:from-blue-500/50 hover:to-cyan-500/50',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-blue-500/20',
      text: 'text-blue-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
    },
  },
  cyan: {
    solid: {
      bg: 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40',
      hover: 'hover:from-cyan-500/50 hover:to-blue-500/50',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      // Theme-aware: uses theme tokens when rendered
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-cyan-500/20',
      text: 'text-cyan-400',
      // Theme-aware: uses theme tokens when rendered
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/40',
      // Theme-aware: uses theme tokens when rendered
    },
  },
  indigo: {
    solid: {
      bg: 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40',
      hover: 'hover:from-indigo-500/50 hover:to-purple-500/50',
      text: 'text-indigo-300',
      border: 'border-indigo-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-indigo-500/20',
      text: 'text-indigo-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-indigo-500/20',
      text: 'text-indigo-400',
      border: 'border-indigo-500/40',
    },
  },
  purple: {
    solid: {
      bg: 'bg-gradient-to-r from-purple-600/40 to-pink-600/40',
      hover: 'hover:from-purple-500/50 hover:to-pink-500/50',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-purple-500/20',
      text: 'text-purple-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
    },
  },
  pink: {
    solid: {
      bg: 'bg-gradient-to-r from-pink-600/40 to-purple-600/40',
      hover: 'hover:from-pink-500/50 hover:to-purple-500/50',
      text: 'text-pink-300',
      border: 'border-pink-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-pink-500/20',
      text: 'text-pink-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-pink-500/20',
      text: 'text-pink-400',
      border: 'border-pink-500/40',
    },
  },
  red: {
    solid: {
      bg: 'bg-gradient-to-r from-red-600/40 to-orange-600/40',
      hover: 'hover:from-red-500/50 hover:to-orange-500/50',
      text: 'text-red-300',
      border: 'border-red-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-red-500/20',
      text: 'text-red-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/40',
    },
  },
  orange: {
    solid: {
      bg: 'bg-gradient-to-r from-orange-600/40 to-red-600/40',
      hover: 'hover:from-orange-500/50 hover:to-red-500/50',
      text: 'text-orange-300',
      border: 'border-orange-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-orange-500/20',
      text: 'text-orange-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/40',
    },
  },
  amber: {
    solid: {
      bg: 'bg-gradient-to-r from-amber-600/40 to-yellow-600/40',
      hover: 'hover:from-amber-500/50 hover:to-yellow-500/50',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-amber-500/20',
      text: 'text-amber-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
    },
  },
  yellow: {
    solid: {
      bg: 'bg-gradient-to-r from-yellow-500/40 to-amber-500/40',
      hover: 'hover:from-yellow-400/50 hover:to-amber-400/50',
      text: 'text-yellow-300',
      border: 'border-yellow-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-yellow-500/20',
      text: 'text-yellow-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/40',
    },
  },
  green: {
    solid: {
      bg: 'bg-gradient-to-r from-green-600/40 to-emerald-600/40',
      hover: 'hover:from-green-500/50 hover:to-emerald-500/50',
      text: 'text-green-300',
      border: 'border-green-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-green-500/20',
      text: 'text-green-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/40',
    },
  },
  emerald: {
    solid: {
      bg: 'bg-gradient-to-r from-emerald-600/40 to-cyan-600/40',
      hover: 'hover:from-emerald-500/50 hover:to-cyan-500/50',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-emerald-500/20',
      text: 'text-emerald-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
    },
  },
  slate: {
    solid: {
      bg: 'bg-gradient-to-r from-slate-600/40 to-gray-700/40',
      hover: 'hover:from-slate-500/50 hover:to-gray-600/50',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-slate-500/20',
      text: 'text-slate-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-slate-500/20',
      text: 'text-slate-400',
      border: 'border-slate-500/40',
    },
  },
  gray: {
    solid: {
      bg: 'bg-gradient-to-r from-gray-600/40 to-gray-700/40',
      hover: 'hover:from-gray-500/50 hover:to-gray-600/50',
      text: 'text-gray-300',
      border: 'border-gray-500/30',
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-gray-500/20',
      text: 'text-gray-400',
    },
    outline: {
      bg: 'bg-transparent',
      hover: 'hover:bg-gray-500/20',
      text: 'text-gray-400',
      border: 'border-gray-500/40',
    },
  },
};

/**
 * Size configurations (icon size and padding)
 */
const sizeClasses: Record<IconButtonSize, { icon: string; padding: string }> = {
  xs: { icon: 'w-3 h-3', padding: 'p-1' },
  sm: { icon: 'w-4 h-4', padding: 'p-1.5' },
  md: { icon: 'w-5 h-5', padding: 'p-2' },
  lg: { icon: 'w-6 h-6', padding: 'p-2.5' },
  xl: { icon: 'w-7 h-7', padding: 'p-3' },
};

/**
 * IconButton - Standardized icon button component with accessibility
 *
 * Features:
 * - Consistent icon sizing across all instances
 * - Built-in accessibility with required aria-label
 * - Multiple color schemes matching app design language
 * - Hover states and animations
 * - Loading and disabled states
 * - Multiple size variants
 * - Solid, ghost, and outline variants
 *
 * @example
 * <IconButton
 *   icon={Trash2}
 *   aria-label="Delete project"
 *   onClick={handleDelete}
 *   colorScheme="red"
 *   size="md"
 * />
 */
export default function IconButton({
  icon: Icon,
  onClick,
  'aria-label': ariaLabel,
  tooltip,
  colorScheme = 'gray',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  animate = true,
  variant = 'ghost',
}: IconButtonProps) {
  const { getThemeColors, theme } = useThemeStore();
  const colors = getThemeColors();
  const focusRingClasses = getFocusRingStyles(theme);
  
  // Get theme-aware scheme for cyan color scheme
  const getScheme = () => {
    if (colorScheme === 'cyan') {
      const themeSchemes = {
        solid: {
          bg: `bg-gradient-to-r ${colors.primaryFrom} to-blue-600/40`,
          hover: 'hover:opacity-80',
          text: colors.textLight,
          border: colors.border,
        },
        ghost: {
          bg: 'bg-transparent',
          hover: `hover:${colors.bg}`,
          text: colors.text,
        },
        outline: {
          bg: 'bg-transparent',
          hover: `hover:${colors.bg}`,
          text: colors.text,
          border: colors.borderHover,
        },
      };
      return themeSchemes[variant];
    }
    return colorSchemes[colorScheme][variant];
  };
  
  const scheme = getScheme();
  const sizeConfig = sizeClasses[size];

  const baseClasses = `
    ${scheme.bg}
    ${scheme.hover}
    ${scheme.text}
    ${'border' in scheme ? `border ${scheme.border}` : ''}
    ${sizeConfig.padding}
    rounded-lg
    transition-all
    duration-200
    flex
    items-center
    justify-center
    ${focusRingClasses}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  const content = loading ? (
    <svg
      className={`animate-spin ${sizeConfig.icon}`}
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
    <Icon className={sizeConfig.icon} />
  );

  if (animate && !disabled && !loading) {
    return (
      <motion.button
        type={type}
        className={baseClasses}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        title={tooltip || ariaLabel}
        whileHover={{ scale: scales.hover, y: offsets.liftSubtle }}
        whileTap={{ scale: scales.tap }}
        transition={{ duration: durations.fast }}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
    >
      {content}
    </button>
  );
}
