/**
 * @fileoverview Droppable zone wrapper hook for @dnd-kit
 *
 * This hook wraps @dnd-kit's useDroppable with common patterns and
 * visual state management for drop zones.
 *
 * @example Basic usage
 * ```tsx
 * import { useDroppableZone } from '@/hooks/dnd/useDroppableZone';
 *
 * function DropZone({ groupId, isDragActive }: Props) {
 *   const {
 *     ref,
 *     isOver,
 *     zoneState,
 *     zoneStyle,
 *   } = useDroppableZone({
 *     id: groupId,
 *     data: { type: 'group', groupId },
 *     isDragActive,
 *   });
 *
 *   return (
 *     <div
 *       ref={ref}
 *       style={zoneStyle}
 *       className={`drop-zone ${zoneState}`}
 *     >
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With custom styling
 * ```tsx
 * const { zoneState, isOver } = useDroppableZone({
 *   id: groupId,
 *   isDragActive,
 *   styleConfig: {
 *     idleBackground: 'transparent',
 *     readyBackground: 'rgba(6, 182, 212, 0.05)',
 *     hoverBackground: 'rgba(6, 182, 212, 0.1)',
 *     hoverBorderColor: 'rgba(6, 182, 212, 0.6)',
 *     hoverScale: 1.02,
 *   },
 * });
 * ```
 */

import { useMemo, CSSProperties, RefCallback } from 'react';
import { useDroppable, UseDroppableArguments } from '@dnd-kit/core';

/**
 * Visual state of the drop zone
 */
export type DropZoneState = 'idle' | 'ready' | 'hover';

/**
 * Style configuration for drop zone states
 */
export interface DropZoneStyleConfig {
  /** Background color when idle */
  idleBackground?: string;
  /** Border color when idle */
  idleBorderColor?: string;
  /** Background color when ready for drop (drag active) */
  readyBackground?: string;
  /** Border color when ready */
  readyBorderColor?: string;
  /** Border style when ready (e.g., 'dashed') */
  readyBorderStyle?: string;
  /** Background color when hovered */
  hoverBackground?: string;
  /** Border color when hovered */
  hoverBorderColor?: string;
  /** Box shadow when hovered */
  hoverBoxShadow?: string;
  /** Scale transform when hovered */
  hoverScale?: number;
  /** Transition duration in ms */
  transitionDuration?: number;
}

/**
 * Default style configuration
 */
export const DEFAULT_DROP_ZONE_STYLES: DropZoneStyleConfig = {
  idleBackground: 'transparent',
  idleBorderColor: 'rgba(255, 255, 255, 0.05)',
  readyBackground: 'rgba(6, 182, 212, 0.05)',
  readyBorderColor: 'rgba(6, 182, 212, 0.3)',
  readyBorderStyle: 'dashed',
  hoverBackground: 'rgba(6, 182, 212, 0.1)',
  hoverBorderColor: 'rgba(6, 182, 212, 0.6)',
  hoverBoxShadow: '0 0 40px rgba(6, 182, 212, 0.3)',
  hoverScale: 1.02,
  transitionDuration: 300,
};

/**
 * Hook configuration options
 */
export interface UseDroppableZoneOptions {
  /** Unique identifier for the drop zone */
  id: string;
  /** Data to pass with the droppable */
  data?: UseDroppableArguments['data'];
  /** Whether the droppable is disabled */
  disabled?: boolean;
  /** Whether a drag operation is currently active */
  isDragActive?: boolean;
  /** Style configuration for visual states */
  styleConfig?: Partial<DropZoneStyleConfig>;
  /** Whether to apply automatic styling */
  applyStyles?: boolean;
}

/**
 * Return value from useDroppableZone hook
 */
export interface UseDroppableZoneReturn {
  /** Ref callback to attach to the droppable element */
  ref: RefCallback<HTMLElement>;
  /** Whether an item is currently over this zone */
  isOver: boolean;
  /** Current visual state of the zone */
  zoneState: DropZoneState;
  /** Pre-computed styles for the zone */
  zoneStyle: CSSProperties;
  /** Whether the zone is active (ready to receive drops) */
  isActive: boolean;
  /** CSS class names for the current state */
  zoneClassName: string;
  /** Data-testid attribute value */
  testId: string;
}

/**
 * A wrapper hook for @dnd-kit's useDroppable with common patterns.
 *
 * Provides:
 * - Visual state management (idle, ready, hover)
 * - Pre-computed styles for each state
 * - CSS class name generation
 * - Test ID generation
 *
 * @param options - Configuration options
 * @returns Droppable state and props
 */
export function useDroppableZone(
  options: UseDroppableZoneOptions
): UseDroppableZoneReturn {
  const {
    id,
    data,
    disabled = false,
    isDragActive = false,
    styleConfig = {},
    applyStyles = true,
  } = options;

  const { setNodeRef, isOver } = useDroppable({
    id,
    data,
    disabled,
  });

  // Merge style config with defaults
  const styles = useMemo(
    () => ({ ...DEFAULT_DROP_ZONE_STYLES, ...styleConfig }),
    [styleConfig]
  );

  // Compute zone state
  const zoneState: DropZoneState = useMemo(() => {
    if (isOver) return 'hover';
    if (isDragActive) return 'ready';
    return 'idle';
  }, [isOver, isDragActive]);

  // Compute zone styles
  const zoneStyle: CSSProperties = useMemo(() => {
    if (!applyStyles) return {};

    const baseTransition = `all ${styles.transitionDuration}ms ease`;

    switch (zoneState) {
      case 'hover':
        return {
          backgroundColor: styles.hoverBackground,
          borderColor: styles.hoverBorderColor,
          boxShadow: styles.hoverBoxShadow,
          transform: styles.hoverScale !== 1 ? `scale(${styles.hoverScale})` : undefined,
          transition: baseTransition,
        };
      case 'ready':
        return {
          backgroundColor: styles.readyBackground,
          borderColor: styles.readyBorderColor,
          borderStyle: styles.readyBorderStyle,
          transform: 'scale(0.98)',
          opacity: 0.8,
          transition: baseTransition,
        };
      default:
        return {
          backgroundColor: styles.idleBackground,
          borderColor: styles.idleBorderColor,
          transition: baseTransition,
        };
    }
  }, [zoneState, styles, applyStyles]);

  // Generate class names
  const zoneClassName = useMemo(() => {
    const classes = ['drop-zone', `drop-zone--${zoneState}`];
    if (isOver) classes.push('drop-zone--over');
    if (isDragActive) classes.push('drop-zone--drag-active');
    return classes.join(' ');
  }, [zoneState, isOver, isDragActive]);

  const testId = `drop-zone-${id}`;
  const isActive = isDragActive || isOver;

  return {
    ref: setNodeRef,
    isOver,
    zoneState,
    zoneStyle,
    isActive,
    zoneClassName,
    testId,
  };
}
