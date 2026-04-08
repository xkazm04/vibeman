/**
 * Shared Brain constants & types
 *
 * Canonical location for signal-type-related exports consumed across
 * multiple sub-features (Canvas, Palace, Timeline, etc.).
 * Keeps sub-features decoupled from each other.
 */

import { SIGNAL_METADATA, getVisualizableSignalTypes } from '@/types/signals';
import type { BehavioralSignalType } from '@/types/signals';

export type SignalType = BehavioralSignalType;

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
