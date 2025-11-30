'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Button style variants matching the app's design language
 */
export type ButtonVariant =
  | 'primary'      // Cyan/Blue accent
  | 'secondary'    // Gray/neutral
  | 'success'      // Green
  | 'danger'       // Red
  | 'warning'      // Amber/Orange
  | 'ghost'        // Transparent with hover
  | 'outline';     // Border only

/**
 * Button size variants
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AnimatedButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button variant style */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Tooltip text */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Disable animations */
  disableAnimation?: boolean;
  /** Custom hover scale (default: 1.02) */
  hoverScale?: number;
  /** Custom tap scale (default: 0.98) */
  tapScale?: number;
  /** Form ID to associate with (for submit buttons) */
  form?: string;
}

/**
 * Get variant style configurations matching app theme
 */
function getVariantStyles(): Record<ButtonVariant, string> {
  const { getThemeColors } = useThemeStore.getState();
  const colors = getThemeColors();
  
  return {
    primary: `${colors.bg} ${colors.text} ${colors.border} hover:${colors.bgHover}`,
    secondary: 'bg-gray-700/50 text-gray-300 border-gray-600/50 hover:bg-gray-700/70 hover:text-gray-200',
    success: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
    ghost: 'bg-transparent text-gray-400 border-transparent hover:bg-gray-700/30 hover:text-gray-300',
    outline: 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700/30 hover:border-gray-500',
  };
}

/**
 * Size configurations
 */
const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-sm',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Icon size classes based on button size
 */
const iconSizes: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * AnimatedButton - A generic reusable button component with Framer Motion animations
 *
 * Features:
 * - Consistent hover and tap animations
 * - Multiple style variants matching app design
 * - Icon support with positioning
 * - Loading state with spinner
 * - Disabled state handling
 * - Configurable animations
 * - Follows existing UI patterns
 *
 * @example
 * // Basic usage
 * <AnimatedButton onClick={handleClick}>
 *   Click me
 * </AnimatedButton>
 *
 * @example
 * // With icon and variant
 * <AnimatedButton
 *   variant="primary"
 *   icon={Plus}
 *   iconPosition="left"
 *   onClick={handleAdd}
 * >
 *   Add Item
 * </AnimatedButton>
 *
 * @example
 * // Loading state
 * <AnimatedButton loading={isSubmitting} variant="success">
 *   Submit
 * </AnimatedButton>
 */
export default function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  title,
  className = '',
  disableAnimation = false,
  hoverScale = 1.02,
  tapScale = 0.98,
  form,
}: AnimatedButtonProps) {
  const variantStyles = getVariantStyles();
  
  // Base classes shared by all buttons
  const baseClasses = `
    inline-flex
    items-center
    justify-center
    gap-2
    font-mono
    font-medium
    rounded-md
    border
    transition-all
    duration-200
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Content with icon and loading spinner
  const content = (
    <>
      {loading && (
        <svg
          className={`animate-spin ${iconSizes[size]}`}
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
      )}
      {Icon && iconPosition === 'left' && !loading && (
        <Icon className={iconSizes[size]} />
      )}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className={iconSizes[size]} />
      )}
    </>
  );

  // Return animated or static button based on settings
  if (!disableAnimation && !disabled && !loading) {
    return (
      <motion.button
        type={type}
        className={baseClasses}
        onClick={onClick}
        disabled={disabled || loading}
        title={title}
        form={form}
        whileHover={{ scale: hoverScale, y: -1 }}
        whileTap={{ scale: tapScale }}
        transition={{ duration: 0.2 }}
      >
        {content}
      </motion.button>
    );
  }

  // Static button for disabled/loading states or when animation is disabled
  return (
    <button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      form={form}
    >
      {content}
    </button>
  );
}
