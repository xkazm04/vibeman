import type { SignalType } from './types';
import { getVisualizableSignalTypes } from '@/types/signals';
// COLORS & LABELS now live in the shared Brain lib — re-export for
// backward-compat within Canvas internals.
export { COLORS, LABELS } from '../../lib/brainConstants';

export const BG = '#0f0f11';

// Visual hierarchy
export const DOT_RADIUS_MIN = 3;
export const DOT_RADIUS_MAX = 14;
export const RECENCY_GLOW_HOURS = 6;
export const LABEL_MIN_ZOOM = 0.8;
export const LABEL_COLLISION_PADDING = 4;
export const BUBBLE_SCALE = 28;
export const BUBBLE_PADDING = 20;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const FOCUS_ZOOM_THRESHOLD = 1.8;
/**
 * Lane types for timeline visualization (only visualizable types)
 */
export const LANE_TYPES: SignalType[] = getVisualizableSignalTypes();
