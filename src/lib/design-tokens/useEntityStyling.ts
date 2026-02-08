/**
 * useEntityStyling Hook
 *
 * Provides consistent styling utilities for entities based on their type and state.
 * Returns Tailwind classes, RGB values, and inline styles for unified visual language.
 */

import { useMemo } from 'react';
import { statusColors, focusClasses, getRGBFromHex, hexToRGBA } from './colors';
import type { StatusType } from './colors';

export type { StatusType };

export interface EntityStylingOptions {
  /** Status of the entity (accepted, rejected, implemented, pending) */
  status?: StatusType;
  /** Custom hex color for the entity (e.g., from context group) */
  color?: string;
  /** Whether the entity is currently selected */
  isSelected?: boolean;
}

export interface EntityStylingResult {
  /** Combined Tailwind classes for the entity */
  classes: string;
  /** RGB values from the entity color */
  rgb: { r: number; g: number; b: number };
  /** Inline styles for background and border */
  styles: {
    backgroundColor?: string;
    borderColor?: string;
  };
  /** Status-specific text color class */
  statusTextClass: string;
  /** Box shadow for hover effects */
  boxShadow: {
    default: string;
    hover: string;
  };
}

/**
 * Hook to get consistent styling for entities based on their state
 *
 * @param options - Entity styling configuration
 * @returns Styling utilities (classes, RGB, inline styles)
 *
 * @example
 * ```tsx
 * const { classes, rgb, styles } = useEntityStyling({
 *   status: 'accepted',
 *   color: '#3b82f6',
 *   isSelected: true
 * });
 *
 * return (
 *   <div className={classes} style={styles}>
 *     {content}
 *   </div>
 * );
 * ```
 */
export function useEntityStyling(options: EntityStylingOptions = {}): EntityStylingResult {
  const { status, color, isSelected = false } = options;

  return useMemo(() => {
    const rgb = color ? getRGBFromHex(color) : { r: 107, g: 114, b: 128 };

    // Status-based styling
    if (status && statusColors[status]) {
      const statusConfig = statusColors[status];

      return {
        classes: `${focusClasses} ${statusConfig.border} ${statusConfig.bg} ${statusConfig.borderHover} ${statusConfig.bgHover} ${statusConfig.ring}`,
        rgb,
        styles: {},
        statusTextClass: statusConfig.text,
        boxShadow: {
          default: '0 0 0 rgba(0, 0, 0, 0)',
          hover: '0 0 8px rgba(107, 114, 128, 0.3)',
        },
      };
    }

    // Color-based styling (for context groups, custom entities)
    if (color && isSelected) {
      return {
        classes: `border-2 text-white transition-all`,
        rgb,
        styles: {
          backgroundColor: hexToRGBA(color, 0.25),
          borderColor: color,
        },
        statusTextClass: 'text-white',
        boxShadow: {
          default: `0 0 12px ${hexToRGBA(color, 0.4)}`,
          hover: `0 0 12px ${hexToRGBA(color, 0.4)}`,
        },
      };
    }

    // Default unselected state
    return {
      classes: `bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300 transition-all`,
      rgb,
      styles: {},
      statusTextClass: 'text-gray-400',
      boxShadow: {
        default: '0 0 0 rgba(0, 0, 0, 0)',
        hover: '0 0 8px rgba(107, 114, 128, 0.3)',
      },
    };
  }, [status, color, isSelected]);
}

/**
 * Get status classes for a specific status without using the hook
 * Useful for non-component contexts or static configurations
 *
 * @param status - Status type
 * @returns Combined Tailwind classes
 */
export function getStatusClasses(status: StatusType): string {
  const statusConfig = statusColors[status];
  return `${focusClasses} ${statusConfig.border} ${statusConfig.bg} ${statusConfig.borderHover} ${statusConfig.bgHover} ${statusConfig.ring}`;
}

/**
 * Get status text color class
 *
 * @param status - Status type
 * @returns Tailwind text color class
 */
export function getStatusTextClass(status: StatusType): string {
  return statusColors[status].text;
}
