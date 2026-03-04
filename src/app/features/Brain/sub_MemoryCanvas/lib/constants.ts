import type { SignalType } from './types';
import { SIGNAL_METADATA, getVisualizableSignalTypes } from '@/types/signals';

/**
 * Color map for visualizable signal types (derived from canonical metadata)
 */
export const COLORS: Record<string, string> = {};
for (const type of getVisualizableSignalTypes()) {
  COLORS[type] = SIGNAL_METADATA[type].color;
}

/**
 * Short label map for visualizable signal types (derived from canonical metadata)
 */
export const LABELS: Record<string, string> = {};
for (const type of getVisualizableSignalTypes()) {
  LABELS[type] = SIGNAL_METADATA[type].shortLabel;
}

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
