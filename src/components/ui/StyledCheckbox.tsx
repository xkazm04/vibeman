'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface StyledCheckboxProps {
  /** Checkbox checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Color scheme */
  colorScheme?: 'cyan' | 'blue' | 'green' | 'purple' | 'red';
  /** Tooltip text */
  title?: string;
}

/**
 * Size configurations
 */
const sizeConfig = {
  sm: {
    box: 'w-3.5 h-3.5',
    icon: 'w-2.5 h-2.5',
    label: 'text-xs',
  },
  md: {
    box: 'w-4 h-4',
    icon: 'w-3 h-3',
    label: 'text-sm',
  },
  lg: {
    box: 'w-5 h-5',
    icon: 'w-3.5 h-3.5',
    label: 'text-base',
  },
};

/**
 * Color scheme configurations
 */
const colorSchemes = {
  cyan: {
    bg: 'bg-cyan-500',
    border: 'border-cyan-500/50',
    borderHover: 'hover:border-cyan-400',
    shadow: 'shadow-cyan-500/20',
  },
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-500/50',
    borderHover: 'hover:border-blue-400',
    shadow: 'shadow-blue-500/20',
  },
  green: {
    bg: 'bg-green-500',
    border: 'border-green-500/50',
    borderHover: 'hover:border-green-400',
    shadow: 'shadow-green-500/20',
  },
  purple: {
    bg: 'bg-purple-500',
    border: 'border-purple-500/50',
    borderHover: 'hover:border-purple-400',
    shadow: 'shadow-purple-500/20',
  },
  red: {
    bg: 'bg-red-500',
    border: 'border-red-500/50',
    borderHover: 'hover:border-red-400',
    shadow: 'shadow-red-500/20',
  },
};

/**
 * StyledCheckbox - A custom checkbox component matching the app's design language
 *
 * Features:
 * - Animated checkmark with Framer Motion
 * - Multiple color schemes
 * - Size variants
 * - Optional label
 * - Disabled state support
 * - Consistent with existing UI patterns
 *
 * @example
 * <StyledCheckbox
 *   checked={isChecked}
 *   onChange={setIsChecked}
 *   label="Enable feature"
 *   colorScheme="cyan"
 * />
 */
export default function StyledCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
  colorScheme = 'cyan',
  title,
}: StyledCheckboxProps) {
  const sizeClasses = sizeConfig[size];
  const colors = colorSchemes[colorScheme];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      title={title}
    >
      <div className="relative flex items-center justify-center">
        {/* Hidden native checkbox for accessibility */}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />

        {/* Custom checkbox box */}
        <motion.div
          onClick={handleClick}
          className={`
            ${sizeClasses.box}
            relative
            rounded
            border
            transition-all
            duration-200
            ${
              checked
                ? `${colors.bg} ${colors.border} shadow-lg ${colors.shadow}`
                : 'bg-gray-900/50 border-gray-600/50 hover:bg-gray-800/50'
            }
            ${!disabled && !checked ? colors.borderHover : ''}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
        >
          {/* Checkmark icon */}
          {checked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className={`${sizeClasses.icon} text-white`} strokeWidth={3} />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Label */}
      {label && (
        <span
          className={`${sizeClasses.label} text-gray-300 ${
            disabled ? 'text-gray-500' : ''
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
}
