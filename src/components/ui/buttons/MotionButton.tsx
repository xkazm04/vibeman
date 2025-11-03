'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

/**
 * Animation preset configurations
 */
export type AnimationPreset =
  | 'default'      // scale: 1.05, y: -1, tap: 0.95
  | 'subtle'       // scale: 1.02, tap: 0.98
  | 'bounce'       // scale: 1.1, tap: 0.9
  | 'lift'         // y: -2, tap: scale 0.95
  | 'none';        // no animation

/**
 * Color scheme presets matching app design language
 */
export type MotionButtonColorScheme =
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
 * Button size presets
 */
export type MotionButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button style variants
 */
export type MotionButtonVariant =
  | 'solid'        // Gradient background with border
  | 'outline'      // Transparent with border
  | 'ghost'        // Transparent, no border
  | 'glassmorphic'; // Glassmorphic effect

export interface MotionButtonProps {
  /** Button content */
  children?: React.ReactNode;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right';
  /** Icon size override (default based on button size) */
  iconSize?: string;
  /** Color scheme */
  colorScheme?: MotionButtonColorScheme;
  /** Button variant style */
  variant?: MotionButtonVariant;
  /** Button size */
  size?: MotionButtonSize;
  /** Animation preset */
  animationPreset?: AnimationPreset;
  /** Custom hover scale (overrides preset) */
  hoverScale?: number;
  /** Custom tap scale (overrides preset) */
  tapScale?: number;
  /** Custom hover y offset (overrides preset) */
  hoverY?: number;
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
  /** Icon only mode (no text padding) */
  iconOnly?: boolean;
  /** Form ID to associate with */
  form?: string;
}

/**
 * Animation preset configurations
 */
const animationPresets: Record<AnimationPreset, { scale?: number; y?: number; tapScale: number; duration: number }> = {
  default: { scale: 1.05, y: -1, tapScale: 0.95, duration: 0.15 },
  subtle: { scale: 1.02, tapScale: 0.98, duration: 0.2 },
  bounce: { scale: 1.1, tapScale: 0.9, duration: 0.2 },
  lift: { y: -2, tapScale: 0.95, duration: 0.15 },
  none: { tapScale: 1, duration: 0 },
};

/**
 * Color scheme configurations for each variant
 */
const colorSchemes: Record<
  MotionButtonColorScheme,
  Record<MotionButtonVariant, string>
> = {
  blue: {
    solid: 'bg-gradient-to-r from-blue-600/40 to-cyan-600/40 hover:from-blue-500/50 hover:to-cyan-500/50 text-blue-300 border-blue-500/30',
    outline: 'bg-transparent hover:bg-blue-500/20 text-blue-400 border-blue-500/40',
    ghost: 'bg-transparent hover:bg-blue-500/20 text-blue-400 border-transparent',
    glassmorphic: 'bg-blue-500/10 backdrop-blur-sm hover:bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  cyan: {
    solid: 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-500/50 hover:to-blue-500/50 text-cyan-300 border-cyan-500/30',
    outline: 'bg-transparent hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    ghost: 'bg-transparent hover:bg-cyan-500/20 text-cyan-400 border-transparent',
    glassmorphic: 'bg-cyan-500/10 backdrop-blur-sm hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  indigo: {
    solid: 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 hover:from-indigo-500/50 hover:to-purple-500/50 text-indigo-300 border-indigo-500/30',
    outline: 'bg-transparent hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    ghost: 'bg-transparent hover:bg-indigo-500/20 text-indigo-400 border-transparent',
    glassmorphic: 'bg-indigo-500/10 backdrop-blur-sm hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  purple: {
    solid: 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 hover:from-purple-500/50 hover:to-pink-500/50 text-purple-300 border-purple-500/30',
    outline: 'bg-transparent hover:bg-purple-500/20 text-purple-400 border-purple-500/40',
    ghost: 'bg-transparent hover:bg-purple-500/20 text-purple-400 border-transparent',
    glassmorphic: 'bg-purple-500/10 backdrop-blur-sm hover:bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  pink: {
    solid: 'bg-gradient-to-r from-pink-600/40 to-purple-600/40 hover:from-pink-500/50 hover:to-purple-500/50 text-pink-300 border-pink-500/30',
    outline: 'bg-transparent hover:bg-pink-500/20 text-pink-400 border-pink-500/40',
    ghost: 'bg-transparent hover:bg-pink-500/20 text-pink-400 border-transparent',
    glassmorphic: 'bg-pink-500/10 backdrop-blur-sm hover:bg-pink-500/20 text-pink-400 border-pink-500/30',
  },
  red: {
    solid: 'bg-gradient-to-r from-red-600/40 to-orange-600/40 hover:from-red-500/50 hover:to-orange-500/50 text-red-300 border-red-500/30',
    outline: 'bg-transparent hover:bg-red-500/20 text-red-400 border-red-500/40',
    ghost: 'bg-transparent hover:bg-red-500/20 text-red-400 border-transparent',
    glassmorphic: 'bg-red-500/10 backdrop-blur-sm hover:bg-red-500/20 text-red-400 border-red-500/30',
  },
  orange: {
    solid: 'bg-gradient-to-r from-orange-600/40 to-red-600/40 hover:from-orange-500/50 hover:to-red-500/50 text-orange-300 border-orange-500/30',
    outline: 'bg-transparent hover:bg-orange-500/20 text-orange-400 border-orange-500/40',
    ghost: 'bg-transparent hover:bg-orange-500/20 text-orange-400 border-transparent',
    glassmorphic: 'bg-orange-500/10 backdrop-blur-sm hover:bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  amber: {
    solid: 'bg-gradient-to-r from-amber-600/40 to-yellow-600/40 hover:from-amber-500/50 hover:to-yellow-500/50 text-amber-300 border-amber-500/30',
    outline: 'bg-transparent hover:bg-amber-500/20 text-amber-400 border-amber-500/40',
    ghost: 'bg-transparent hover:bg-amber-500/20 text-amber-400 border-transparent',
    glassmorphic: 'bg-amber-500/10 backdrop-blur-sm hover:bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  yellow: {
    solid: 'bg-gradient-to-r from-yellow-500/40 to-amber-500/40 hover:from-yellow-400/50 hover:to-amber-400/50 text-yellow-300 border-yellow-500/30',
    outline: 'bg-transparent hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    ghost: 'bg-transparent hover:bg-yellow-500/20 text-yellow-400 border-transparent',
    glassmorphic: 'bg-yellow-500/10 backdrop-blur-sm hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  green: {
    solid: 'bg-gradient-to-r from-green-600/40 to-emerald-600/40 hover:from-green-500/50 hover:to-emerald-500/50 text-green-300 border-green-500/30',
    outline: 'bg-transparent hover:bg-green-500/20 text-green-400 border-green-500/40',
    ghost: 'bg-transparent hover:bg-green-500/20 text-green-400 border-transparent',
    glassmorphic: 'bg-green-500/10 backdrop-blur-sm hover:bg-green-500/20 text-green-400 border-green-500/30',
  },
  emerald: {
    solid: 'bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 hover:from-emerald-500/50 hover:to-cyan-500/50 text-emerald-300 border-emerald-500/30',
    outline: 'bg-transparent hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    ghost: 'bg-transparent hover:bg-emerald-500/20 text-emerald-400 border-transparent',
    glassmorphic: 'bg-emerald-500/10 backdrop-blur-sm hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  slate: {
    solid: 'bg-gradient-to-r from-slate-600/40 to-gray-700/40 hover:from-slate-500/50 hover:to-gray-600/50 text-slate-300 border-slate-500/30',
    outline: 'bg-transparent hover:bg-slate-500/20 text-slate-400 border-slate-500/40',
    ghost: 'bg-transparent hover:bg-slate-500/20 text-slate-400 border-transparent',
    glassmorphic: 'bg-slate-500/10 backdrop-blur-sm hover:bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
  gray: {
    solid: 'bg-gradient-to-r from-gray-600/40 to-gray-700/40 hover:from-gray-500/50 hover:to-gray-600/50 text-gray-300 border-gray-500/30',
    outline: 'bg-transparent hover:bg-gray-500/20 text-gray-400 border-gray-500/40',
    ghost: 'bg-transparent hover:bg-gray-500/20 text-gray-400 border-transparent',
    glassmorphic: 'bg-gray-500/10 backdrop-blur-sm hover:bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
};

/**
 * Size configurations
 */
const sizeStyles: Record<MotionButtonSize, { padding: string; text: string; iconSize: string; gap: string }> = {
  xs: { padding: 'px-2 py-1', text: 'text-xs', iconSize: 'w-3 h-3', gap: 'gap-1' },
  sm: { padding: 'px-3 py-1.5', text: 'text-xs', iconSize: 'w-3.5 h-3.5', gap: 'gap-1.5' },
  md: { padding: 'px-4 py-2', text: 'text-sm', iconSize: 'w-4 h-4', gap: 'gap-2' },
  lg: { padding: 'px-6 py-3', text: 'text-base', iconSize: 'w-5 h-5', gap: 'gap-2' },
  xl: { padding: 'px-8 py-4', text: 'text-lg', iconSize: 'w-6 h-6', gap: 'gap-2.5' },
};

/**
 * MotionButton - Centralized button component with Framer Motion animations
 *
 * Features:
 * - Consolidates all motion.button usage across the app
 * - Consistent hover/tap animations with presets
 * - Multiple color schemes matching app design language
 * - Icon support with automatic sizing
 * - Loading and disabled states
 * - Multiple style variants (solid, outline, ghost, glassmorphic)
 * - Customizable animations
 * - Accessibility support
 *
 * @example
 * // Basic usage
 * <MotionButton onClick={handleClick}>
 *   Click me
 * </MotionButton>
 *
 * @example
 * // With icon and color scheme
 * <MotionButton
 *   icon={Trash2}
 *   colorScheme="red"
 *   variant="outline"
 *   onClick={handleDelete}
 * >
 *   Delete
 * </MotionButton>
 *
 * @example
 * // Icon only button
 * <MotionButton
 *   icon={Plus}
 *   iconOnly
 *   colorScheme="green"
 *   size="sm"
 *   aria-label="Add item"
 *   onClick={handleAdd}
 * />
 *
 * @example
 * // Custom animation
 * <MotionButton
 *   animationPreset="bounce"
 *   colorScheme="purple"
 *   variant="glassmorphic"
 * >
 *   Bouncy Button
 * </MotionButton>
 */
export default function MotionButton({
  children,
  onClick,
  icon: Icon,
  iconPosition = 'left',
  iconSize,
  colorScheme = 'gray',
  variant = 'ghost',
  size = 'md',
  animationPreset = 'default',
  hoverScale,
  tapScale,
  hoverY,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  title,
  className = '',
  'aria-label': ariaLabel,
  iconOnly = false,
  form,
}: MotionButtonProps) {
  // Get animation configuration
  const animConfig = animationPresets[animationPreset];
  const sizeConfig = sizeStyles[size];
  const colorClass = colorSchemes[colorScheme][variant];

  // Determine final icon size
  const finalIconSize = iconSize || sizeConfig.iconSize;

  // Build base classes
  const baseClasses = `
    inline-flex
    items-center
    justify-center
    ${iconOnly ? 'p-2' : sizeConfig.padding}
    ${sizeConfig.gap}
    ${sizeConfig.text}
    ${colorClass}
    ${fullWidth ? 'w-full' : ''}
    ${variant !== 'ghost' ? 'border' : ''}
    rounded-lg
    font-medium
    transition-all
    duration-200
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
      {children && <span>{children}</span>}
      {Icon && iconPosition === 'right' && !loading && <Icon className={finalIconSize} />}
    </>
  );

  // Build hover animation object
  const hoverAnimation: any = {};
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
  const tapAnimation: any = {
    scale: tapScale !== undefined ? tapScale : animConfig.tapScale,
  };

  // Return static button if disabled, loading, or no animation
  if (disabled || loading || animationPreset === 'none') {
    return (
      <button
        type={type}
        className={baseClasses}
        onClick={onClick}
        disabled={disabled || loading}
        title={title}
        aria-label={ariaLabel}
        form={form}
      >
        {content}
      </button>
    );
  }

  // Return animated button
  return (
    <motion.button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel}
      form={form}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      transition={{ duration: animConfig.duration }}
    >
      {content}
    </motion.button>
  );
}
