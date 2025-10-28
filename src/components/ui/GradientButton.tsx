'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

/**
 * Predefined gradient color schemes
 */
export type GradientColorScheme =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'green'
  | 'emerald'
  | 'cyan'
  | 'slate'
  | 'gray';

/**
 * Gradient direction options
 */
export type GradientDirection = 'r' | 'l' | 'br' | 'bl' | 'tr' | 'tl' | 'b' | 't';

/**
 * Opacity levels for gradients
 */
export type OpacityLevel = 'subtle' | 'medium' | 'strong' | 'solid';

/**
 * Custom gradient configuration
 */
export interface CustomGradient {
  from: string;
  to: string;
  via?: string;
  direction?: GradientDirection;
}

export interface GradientButtonProps {
  /** Button text content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Predefined color scheme */
  colorScheme?: GradientColorScheme;
  /** Custom gradient configuration (overrides colorScheme) */
  customGradient?: CustomGradient;
  /** Gradient direction */
  direction?: GradientDirection;
  /** Opacity level */
  opacity?: OpacityLevel;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show hover animation */
  animate?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Tooltip text */
  title?: string;
}

/**
 * Predefined gradient configurations
 */
const gradientPresets: Record<
  GradientColorScheme,
  {
    from: string;
    to: string;
    borderColor: string;
    shadowColor: string;
    textColor: string;
  }
> = {
  blue: {
    from: 'blue-600',
    to: 'cyan-600',
    borderColor: 'blue-500/30',
    shadowColor: 'blue-500/20',
    textColor: 'text-white',
  },
  indigo: {
    from: 'indigo-600',
    to: 'purple-600',
    borderColor: 'indigo-500/30',
    shadowColor: 'indigo-500/20',
    textColor: 'text-white',
  },
  purple: {
    from: 'purple-600',
    to: 'pink-600',
    borderColor: 'purple-500/30',
    shadowColor: 'purple-500/20',
    textColor: 'text-white',
  },
  pink: {
    from: 'pink-600',
    to: 'purple-600',
    borderColor: 'pink-500/30',
    shadowColor: 'pink-500/20',
    textColor: 'text-white',
  },
  red: {
    from: 'red-600',
    to: 'orange-600',
    borderColor: 'red-500/30',
    shadowColor: 'red-500/20',
    textColor: 'text-white',
  },
  orange: {
    from: 'orange-600',
    to: 'red-600',
    borderColor: 'orange-500/30',
    shadowColor: 'orange-500/20',
    textColor: 'text-white',
  },
  amber: {
    from: 'amber-600',
    to: 'yellow-600',
    borderColor: 'amber-500/30',
    shadowColor: 'amber-500/20',
    textColor: 'text-gray-900',
  },
  yellow: {
    from: 'yellow-500',
    to: 'amber-500',
    borderColor: 'yellow-500/30',
    shadowColor: 'yellow-500/20',
    textColor: 'text-gray-900',
  },
  green: {
    from: 'green-600',
    to: 'emerald-600',
    borderColor: 'green-500/30',
    shadowColor: 'green-500/20',
    textColor: 'text-white',
  },
  emerald: {
    from: 'emerald-600',
    to: 'cyan-600',
    borderColor: 'emerald-500/30',
    shadowColor: 'emerald-500/20',
    textColor: 'text-white',
  },
  cyan: {
    from: 'cyan-600',
    to: 'blue-600',
    borderColor: 'cyan-500/30',
    shadowColor: 'cyan-500/20',
    textColor: 'text-white',
  },
  slate: {
    from: 'slate-600',
    to: 'gray-700',
    borderColor: 'slate-500/30',
    shadowColor: 'slate-500/20',
    textColor: 'text-white',
  },
  gray: {
    from: 'gray-600',
    to: 'gray-700',
    borderColor: 'gray-500/30',
    shadowColor: 'gray-500/20',
    textColor: 'text-white',
  },
};

/**
 * Opacity configurations
 */
const opacityMap: Record<OpacityLevel, { bg: string; hover: string }> = {
  subtle: { bg: '/20', hover: '/30' },
  medium: { bg: '/40', hover: '/50' },
  strong: { bg: '/60', hover: '/70' },
  solid: { bg: '', hover: '' },
};

/**
 * Size configurations
 */
const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

/**
 * GradientButton - A reusable button component with flexible gradient styling
 *
 * Features:
 * - Predefined color schemes matching app design language
 * - Custom gradient support with from/to/via colors
 * - Multiple opacity levels
 * - Icon support with positioning
 * - Loading and disabled states
 * - Framer Motion animations
 * - Consistent with existing UI patterns
 *
 * @example
 * // Predefined scheme
 * <GradientButton colorScheme="blue" onClick={handleClick}>
 *   Click me
 * </GradientButton>
 *
 * @example
 * // Custom gradient
 * <GradientButton
 *   customGradient={{ from: 'purple-500', to: 'pink-500', via: 'blue-500' }}
 *   opacity="medium"
 *   icon={Zap}
 * >
 *   Custom Button
 * </GradientButton>
 */
export default function GradientButton({
  children,
  onClick,
  icon: Icon,
  iconPosition = 'left',
  colorScheme = 'blue',
  customGradient,
  direction = 'r',
  opacity = 'solid',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
  className = '',
  animate = true,
  type = 'button',
  title,
}: GradientButtonProps) {
  // Build gradient classes
  const buildGradientClasses = () => {
    const opacityConfig = opacityMap[opacity];
    const directionClass = `bg-gradient-to-${direction}`;

    if (customGradient) {
      const fromClass = `from-${customGradient.from}${opacityConfig.bg}`;
      const toClass = `to-${customGradient.to}${opacityConfig.bg}`;
      const viaClass = customGradient.via ? `via-${customGradient.via}${opacityConfig.bg}` : '';

      const hoverFromClass = `hover:from-${customGradient.from.replace(/\/\d+/, '')}${opacityConfig.hover}`;
      const hoverToClass = `hover:to-${customGradient.to.replace(/\/\d+/, '')}${opacityConfig.hover}`;
      const hoverViaClass = customGradient.via
        ? `hover:via-${customGradient.via.replace(/\/\d+/, '')}${opacityConfig.hover}`
        : '';

      return `${directionClass} ${fromClass} ${viaClass} ${toClass} ${hoverFromClass} ${hoverViaClass} ${hoverToClass}`;
    } else {
      const preset = gradientPresets[colorScheme];
      const fromClass = `from-${preset.from}${opacityConfig.bg}`;
      const toClass = `to-${preset.to}${opacityConfig.bg}`;

      // Lighter shade for hover
      const hoverFrom = preset.from.replace('600', '500');
      const hoverTo = preset.to.replace('600', '500');
      const hoverFromClass = `hover:from-${hoverFrom}${opacityConfig.hover}`;
      const hoverToClass = `hover:to-${hoverTo}${opacityConfig.hover}`;

      return `${directionClass} ${fromClass} ${toClass} ${hoverFromClass} ${hoverToClass}`;
    }
  };

  const gradientClasses = buildGradientClasses();
  const preset = customGradient ? null : gradientPresets[colorScheme];
  const borderClass = preset ? `border-${preset.borderColor}` : 'border-gray-500/30';
  const shadowClass = preset ? `shadow-${preset.shadowColor}` : 'shadow-gray-500/20';
  const textClass = preset?.textColor || 'text-white';

  const baseClasses = `
    ${gradientClasses}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${borderClass}
    ${shadowClass}
    ${textClass}
    border
    rounded-lg
    font-semibold
    shadow-lg
    transition-all
    duration-300
    flex
    items-center
    justify-center
    gap-2
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
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
      {Icon && iconPosition === 'left' && !loading && <Icon className="w-4 h-4" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && !loading && <Icon className="w-4 h-4" />}
    </>
  );

  if (animate && !disabled && !loading) {
    return (
      <motion.button
        type={type}
        className={baseClasses}
        onClick={onClick}
        disabled={disabled || loading}
        title={title}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
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
      title={title}
    >
      {content}
    </button>
  );
}
