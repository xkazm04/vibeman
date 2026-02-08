/**
 * Design Tokens
 *
 * Centralized design system for colors, status states, and entity styling.
 * Export all utilities for consistent visual language across the application.
 */

export {
  statusColors,
  entityColors,
  focusClasses,
  getRGBFromHex,
  hexToRGBA,
} from './colors';

export type { StatusType } from './colors';

export {
  useEntityStyling,
  getStatusClasses,
  getStatusTextClass,
} from './useEntityStyling';

export type { EntityStylingOptions, EntityStylingResult, StatusType as StatusTypeFromHook } from './useEntityStyling';
