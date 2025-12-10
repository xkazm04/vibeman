'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';
import { durations, scales, offsets } from '@/lib/design-tokens';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Button variant styles - controls the visual appearance
 */
export type UnifiedButtonVariant =
  | 'solid'      // Gradient background with border
  | 'outline'    // Transparent with visible border
  | 'ghost'      // Transparent, no border, subtle hover
  | 'glass'      // Glassmorphic effect with backdrop blur
  | 'gradient';  // Full gradient (stronger than solid)

/**
 * Color scheme options - 13 color presets
 */
export type UnifiedButtonColorScheme =
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
 * Button size options - 5 size presets
 */
export type UnifiedButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Animation preset options - 5 animation behaviors
 */
export type UnifiedButtonAnimation =
  | 'default'    // scale: 1.05, y: -1, tap: 0.95
  | 'subtle'     // scale: 1.02, tap: 0.98
  | 'bounce'     // scale: 1.1, tap: 0.9
  | 'lift'       // y: -2, tap: scale 0.95
  | 'none';      // no animation

/**
 * UnifiedButton props interface
 */
export interface UnifiedButtonProps {
  /** Button content */
  children?: React.ReactNode;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional Lucide icon component */
  icon?: LucideIcon;
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right';
  /** Icon size override (default based on button size) */
  iconSize?: string;
  /** Button visual variant */
  variant?: UnifiedButtonVariant;
  /** Color scheme from 13 options */
  colorScheme?: UnifiedButtonColorScheme;
  /** Button size */
  size?: UnifiedButtonSize;
  /** Animation preset */
  animation?: UnifiedButtonAnimation;
  /** Custom hover scale (overrides animation preset) */
  hoverScale?: number;
  /** Custom tap scale (overrides animation preset) */
  tapScale?: number;
  /** Custom hover y offset (overrides animation preset) */
  hoverY?: number;
  /** Icon-only mode - renders as square button */
  isIconOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Tooltip/title text */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Aria label for accessibility */
  'aria-label'?: string;
  /** Form ID to associate with */
  form?: string;
  /** Data test ID for automated testing */
  'data-testid'?: string;
}

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/**
 * Animation preset configurations
 */
const ANIMATION_PRESETS: Record<
  UnifiedButtonAnimation,
  { scale?: number; y?: number; tapScale: number; duration: number }
> = {
  default: { scale: scales.hover, y: offsets.liftSubtle, tapScale: scales.tap, duration: durations.fast },
  subtle: { scale: scales.hoverSubtle, tapScale: scales.tapSubtle, duration: durations.normal },
  bounce: { scale: scales.hoverPronounced, tapScale: scales.tapPronounced, duration: durations.normal },
  lift: { y: offsets.liftY, tapScale: scales.tap, duration: durations.fast },
  none: { tapScale: 1, duration: 0 },
};

/**
 * Size configurations for padding, text, icon, and gap
 */
const SIZE_CONFIGS: Record<
  UnifiedButtonSize,
  { padding: string; iconOnlyPadding: string; text: string; iconSize: string; gap: string }
> = {
  xs: { padding: 'px-2 py-1', iconOnlyPadding: 'p-1', text: 'text-xs', iconSize: 'w-3 h-3', gap: 'gap-1' },
  sm: { padding: 'px-3 py-1.5', iconOnlyPadding: 'p-1.5', text: 'text-xs', iconSize: 'w-3.5 h-3.5', gap: 'gap-1.5' },
  md: { padding: 'px-4 py-2', iconOnlyPadding: 'p-2', text: 'text-sm', iconSize: 'w-4 h-4', gap: 'gap-2' },
  lg: { padding: 'px-6 py-3', iconOnlyPadding: 'p-2.5', text: 'text-base', iconSize: 'w-5 h-5', gap: 'gap-2' },
  xl: { padding: 'px-8 py-4', iconOnlyPadding: 'p-3', text: 'text-lg', iconSize: 'w-6 h-6', gap: 'gap-2.5' },
};

/**
 * Color scheme configurations for each variant
 */
const COLOR_SCHEMES: Record<
  UnifiedButtonColorScheme,
  Record<UnifiedButtonVariant, string>
> = {
  blue: {
    solid: 'bg-gradient-to-r from-blue-600/40 to-cyan-600/40 hover:from-blue-500/50 hover:to-cyan-500/50 text-blue-300 border-blue-500/30',
    outline: 'bg-transparent hover:bg-blue-500/20 text-blue-400 border-blue-500/40',
    ghost: 'bg-transparent hover:bg-blue-500/20 text-blue-400 border-transparent',
    glass: 'bg-blue-500/10 backdrop-blur-sm hover:bg-blue-500/20 text-blue-400 border-blue-500/30',
    gradient: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-blue-500/30 shadow-lg shadow-blue-500/20',
  },
  cyan: {
    solid: 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-500/50 hover:to-blue-500/50 text-cyan-300 border-cyan-500/30',
    outline: 'bg-transparent hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    ghost: 'bg-transparent hover:bg-cyan-500/20 text-cyan-400 border-transparent',
    glass: 'bg-cyan-500/10 backdrop-blur-sm hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    gradient: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-500/30 shadow-lg shadow-cyan-500/20',
  },
  indigo: {
    solid: 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 hover:from-indigo-500/50 hover:to-purple-500/50 text-indigo-300 border-indigo-500/30',
    outline: 'bg-transparent hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    ghost: 'bg-transparent hover:bg-indigo-500/20 text-indigo-400 border-transparent',
    glass: 'bg-indigo-500/10 backdrop-blur-sm hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-indigo-500/30 shadow-lg shadow-indigo-500/20',
  },
  purple: {
    solid: 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 hover:from-purple-500/50 hover:to-pink-500/50 text-purple-300 border-purple-500/30',
    outline: 'bg-transparent hover:bg-purple-500/20 text-purple-400 border-purple-500/40',
    ghost: 'bg-transparent hover:bg-purple-500/20 text-purple-400 border-transparent',
    glass: 'bg-purple-500/10 backdrop-blur-sm hover:bg-purple-500/20 text-purple-400 border-purple-500/30',
    gradient: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-purple-500/30 shadow-lg shadow-purple-500/20',
  },
  pink: {
    solid: 'bg-gradient-to-r from-pink-600/40 to-purple-600/40 hover:from-pink-500/50 hover:to-purple-500/50 text-pink-300 border-pink-500/30',
    outline: 'bg-transparent hover:bg-pink-500/20 text-pink-400 border-pink-500/40',
    ghost: 'bg-transparent hover:bg-pink-500/20 text-pink-400 border-transparent',
    glass: 'bg-pink-500/10 backdrop-blur-sm hover:bg-pink-500/20 text-pink-400 border-pink-500/30',
    gradient: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-pink-500/30 shadow-lg shadow-pink-500/20',
  },
  red: {
    solid: 'bg-gradient-to-r from-red-600/40 to-orange-600/40 hover:from-red-500/50 hover:to-orange-500/50 text-red-300 border-red-500/30',
    outline: 'bg-transparent hover:bg-red-500/20 text-red-400 border-red-500/40',
    ghost: 'bg-transparent hover:bg-red-500/20 text-red-400 border-transparent',
    glass: 'bg-red-500/10 backdrop-blur-sm hover:bg-red-500/20 text-red-400 border-red-500/30',
    gradient: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white border-red-500/30 shadow-lg shadow-red-500/20',
  },
  orange: {
    solid: 'bg-gradient-to-r from-orange-600/40 to-red-600/40 hover:from-orange-500/50 hover:to-red-500/50 text-orange-300 border-orange-500/30',
    outline: 'bg-transparent hover:bg-orange-500/20 text-orange-400 border-orange-500/40',
    ghost: 'bg-transparent hover:bg-orange-500/20 text-orange-400 border-transparent',
    glass: 'bg-orange-500/10 backdrop-blur-sm hover:bg-orange-500/20 text-orange-400 border-orange-500/30',
    gradient: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-orange-500/30 shadow-lg shadow-orange-500/20',
  },
  amber: {
    solid: 'bg-gradient-to-r from-amber-600/40 to-yellow-600/40 hover:from-amber-500/50 hover:to-yellow-500/50 text-amber-300 border-amber-500/30',
    outline: 'bg-transparent hover:bg-amber-500/20 text-amber-400 border-amber-500/40',
    ghost: 'bg-transparent hover:bg-amber-500/20 text-amber-400 border-transparent',
    glass: 'bg-amber-500/10 backdrop-blur-sm hover:bg-amber-500/20 text-amber-400 border-amber-500/30',
    gradient: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-gray-900 border-amber-500/30 shadow-lg shadow-amber-500/20',
  },
  yellow: {
    solid: 'bg-gradient-to-r from-yellow-500/40 to-amber-500/40 hover:from-yellow-400/50 hover:to-amber-400/50 text-yellow-300 border-yellow-500/30',
    outline: 'bg-transparent hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    ghost: 'bg-transparent hover:bg-yellow-500/20 text-yellow-400 border-transparent',
    glass: 'bg-yellow-500/10 backdrop-blur-sm hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    gradient: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 border-yellow-500/30 shadow-lg shadow-yellow-500/20',
  },
  green: {
    solid: 'bg-gradient-to-r from-green-600/40 to-emerald-600/40 hover:from-green-500/50 hover:to-emerald-500/50 text-green-300 border-green-500/30',
    outline: 'bg-transparent hover:bg-green-500/20 text-green-400 border-green-500/40',
    ghost: 'bg-transparent hover:bg-green-500/20 text-green-400 border-transparent',
    glass: 'bg-green-500/10 backdrop-blur-sm hover:bg-green-500/20 text-green-400 border-green-500/30',
    gradient: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-green-500/30 shadow-lg shadow-green-500/20',
  },
  emerald: {
    solid: 'bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 hover:from-emerald-500/50 hover:to-cyan-500/50 text-emerald-300 border-emerald-500/30',
    outline: 'bg-transparent hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    ghost: 'bg-transparent hover:bg-emerald-500/20 text-emerald-400 border-transparent',
    glass: 'bg-emerald-500/10 backdrop-blur-sm hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    gradient: 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-emerald-500/30 shadow-lg shadow-emerald-500/20',
  },
  slate: {
    solid: 'bg-gradient-to-r from-slate-600/40 to-gray-700/40 hover:from-slate-500/50 hover:to-gray-600/50 text-slate-300 border-slate-500/30',
    outline: 'bg-transparent hover:bg-slate-500/20 text-slate-400 border-slate-500/40',
    ghost: 'bg-transparent hover:bg-slate-500/20 text-slate-400 border-transparent',
    glass: 'bg-slate-500/10 backdrop-blur-sm hover:bg-slate-500/20 text-slate-400 border-slate-500/30',
    gradient: 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600 text-white border-slate-500/30 shadow-lg shadow-slate-500/20',
  },
  gray: {
    solid: 'bg-gradient-to-r from-gray-600/40 to-gray-700/40 hover:from-gray-500/50 hover:to-gray-600/50 text-gray-300 border-gray-500/30',
    outline: 'bg-transparent hover:bg-gray-500/20 text-gray-400 border-gray-500/40',
    ghost: 'bg-transparent hover:bg-gray-500/20 text-gray-400 border-transparent',
    glass: 'bg-gray-500/10 backdrop-blur-sm hover:bg-gray-500/20 text-gray-400 border-gray-500/30',
    gradient: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white border-gray-500/30 shadow-lg shadow-gray-500/20',
  },
};

// =============================================================================
// UNIFIED BUTTON COMPONENT
// =============================================================================

/**
 * UnifiedButton - A single, consolidated button component
 *
 * This component replaces MotionButton, AnimatedButton, GradientButton, and IconButton
 * with a unified API that exposes orthogonal concerns:
 * - variant: solid, outline, ghost, glass, gradient
 * - colorScheme: 13 color options
 * - size: xs, sm, md, lg, xl
 * - animation: default, subtle, bounce, lift, none
 * - isIconOnly: boolean for icon-only buttons
 *
 * @example
 * // Basic usage
 * <UnifiedButton onClick={handleClick}>
 *   Click me
 * </UnifiedButton>
 *
 * @example
 * // Icon with text
 * <UnifiedButton
 *   icon={Trash2}
 *   colorScheme="red"
 *   variant="outline"
 *   onClick={handleDelete}
 * >
 *   Delete
 * </UnifiedButton>
 *
 * @example
 * // Icon only button
 * <UnifiedButton
 *   icon={Plus}
 *   isIconOnly
 *   colorScheme="green"
 *   size="sm"
 *   aria-label="Add item"
 *   onClick={handleAdd}
 * />
 *
 * @example
 * // Gradient CTA button
 * <UnifiedButton
 *   variant="gradient"
 *   colorScheme="purple"
 *   size="lg"
 *   animation="bounce"
 * >
 *   Get Started
 * </UnifiedButton>
 *
 * @example
 * // Glassmorphic button
 * <UnifiedButton
 *   variant="glass"
 *   colorScheme="cyan"
 *   icon={Settings}
 * >
 *   Settings
 * </UnifiedButton>
 */
export default function UnifiedButton({
  children,
  onClick,
  icon: Icon,
  iconPosition = 'left',
  iconSize,
  variant = 'ghost',
  colorScheme = 'gray',
  size = 'md',
  animation = 'default',
  hoverScale,
  tapScale,
  hoverY,
  isIconOnly = false,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  title,
  className = '',
  'aria-label': ariaLabel,
  form,
  'data-testid': testId,
}: UnifiedButtonProps) {
  const { getThemeColors, theme } = useThemeStore();
  const colors = getThemeColors();
  const focusRingClasses = getFocusRingStyles(theme);

  // Get animation configuration
  const animConfig = ANIMATION_PRESETS[animation];
  const sizeConfig = SIZE_CONFIGS[size];

  // Get theme-aware color class for cyan color scheme
  const getColorClass = (): string => {
    if (colorScheme === 'cyan') {
      const themeSchemes: Record<UnifiedButtonVariant, string> = {
        solid: `bg-gradient-to-r ${colors.primaryFrom} to-blue-600/40 hover:opacity-80 ${colors.textLight} ${colors.border}`,
        outline: `bg-transparent hover:${colors.bg} ${colors.text} ${colors.borderHover}`,
        ghost: `bg-transparent hover:${colors.bg} ${colors.text} border-transparent`,
        glass: `${colors.bg} backdrop-blur-sm hover:${colors.bgHover} ${colors.text} ${colors.border}`,
        gradient: `bg-gradient-to-r ${colors.primaryFrom} to-blue-600 hover:opacity-90 text-white ${colors.border} shadow-lg shadow-cyan-500/20`,
      };
      return themeSchemes[variant];
    }
    return COLOR_SCHEMES[colorScheme][variant];
  };

  const colorClass = getColorClass();

  // Determine final icon size
  const finalIconSize = iconSize || sizeConfig.iconSize;

  // Determine padding based on isIconOnly
  const paddingClass = isIconOnly ? sizeConfig.iconOnlyPadding : sizeConfig.padding;

  // Build base classes
  const baseClasses = `
    inline-flex
    items-center
    justify-center
    ${paddingClass}
    ${!isIconOnly ? sizeConfig.gap : ''}
    ${sizeConfig.text}
    ${colorClass}
    ${fullWidth ? 'w-full' : ''}
    ${variant !== 'ghost' ? 'border' : ''}
    rounded-lg
    font-medium
    transition-all
    duration-200
    ${focusRingClasses}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Loading spinner
  const spinner = (
    <svg
      className={`animate-spin ${finalIconSize}`}
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
  );

  // Button content
  const content = (
    <>
      {loading && spinner}
      {Icon && iconPosition === 'left' && !loading && <Icon className={finalIconSize} />}
      {children && !isIconOnly && <span>{children}</span>}
      {Icon && iconPosition === 'right' && !loading && <Icon className={finalIconSize} />}
    </>
  );

  // Build hover animation object
  const hoverAnimation: Record<string, number> = {};
  if (hoverScale !== undefined) {
    hoverAnimation.scale = hoverScale;
  } else if (animConfig.scale !== undefined) {
    hoverAnimation.scale = animConfig.scale;
  }
  if (hoverY !== undefined) {
    hoverAnimation.y = hoverY;
  } else if (animConfig.y !== undefined) {
    hoverAnimation.y = animConfig.y;
  }

  // Build tap animation object
  const tapAnimation = {
    scale: tapScale !== undefined ? tapScale : animConfig.tapScale,
  };

  // Common props for both static and animated buttons
  const commonProps = {
    type,
    className: baseClasses,
    onClick,
    disabled: disabled || loading,
    title: title || (isIconOnly ? ariaLabel : undefined),
    'aria-label': ariaLabel,
    form,
    'data-testid': testId,
  };

  // Return static button if disabled, loading, or no animation
  if (disabled || loading || animation === 'none') {
    return (
      <button {...commonProps}>
        {content}
      </button>
    );
  }

  // Return animated button
  return (
    <motion.button
      {...commonProps}
      whileHover={Object.keys(hoverAnimation).length > 0 ? hoverAnimation : undefined}
      whileTap={tapAnimation}
      transition={{ duration: animConfig.duration }}
    >
      {content}
    </motion.button>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Re-export types for external use
 */
export type {
  UnifiedButtonVariant as ButtonVariant,
  UnifiedButtonColorScheme as ButtonColorScheme,
  UnifiedButtonSize as ButtonSize,
  UnifiedButtonAnimation as ButtonAnimation,
};
