/** Unified confidence-to-color mapping used across the entire app. */

export interface ConfidenceColor {
  bg: string;
  text: string;
  border: string;
  /** Solid bg class (no opacity) for progress bars / meters. */
  barBg: string;
}

/**
 * Thresholds on a 0-100 scale.
 * Sorted descending by `min` so the first match wins.
 */
const STOPS: (ConfidenceColor & { min: number })[] = [
  { min: 80, bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', barBg: 'bg-emerald-500' },
  { min: 60, bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    barBg: 'bg-cyan-500' },
  { min: 30, bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   barBg: 'bg-amber-500' },
  { min: 0,  bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     barBg: 'bg-red-500' },
];

const FALLBACK = STOPS[STOPS.length - 1];

/**
 * Map a numeric confidence value to a color set.
 *
 * Accepts values on either the 0-100 *or* 0-1 scale:
 * values <= 1 are automatically normalised to 0-100.
 */
export function getConfidenceColor(value: number): ConfidenceColor {
  const pct = value <= 1 ? value * 100 : value;
  return STOPS.find(s => pct >= s.min) ?? FALLBACK;
}

/**
 * Map a categorical confidence label to a color set.
 * Useful for APIs that return 'high' | 'medium' | 'low'.
 */
export function getCategoricalConfidenceColor(level: 'high' | 'medium' | 'low'): ConfidenceColor {
  switch (level) {
    case 'high':   return STOPS[0]; // 80+
    case 'medium': return STOPS[1]; // 60+
    case 'low':    return STOPS[2]; // 30+
  }
}
