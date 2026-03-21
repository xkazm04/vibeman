/**
 * Brain module typography constants
 *
 * Two-tier type system for consistent text rendering across
 * all Brain SVG/canvas visualizations.
 *
 * - DISPLAY_FONT: headings, empty state text, room names, labels
 * - DATA_FONT: axis ticks, counts, timestamps, numeric data
 */

/** Display text: headings, labels, room names */
export const DISPLAY_FONT = 'Inter, system-ui, sans-serif';

/** Numeric/data text: axis ticks, counts, timestamps */
export const DATA_FONT = "'JetBrains Mono', monospace";

/** Standard font sizes for visualization text */
export const FONT_SIZE = {
  /** Axis tick labels, small data annotations */
  axis: 9,
  /** General labels, badge text, SVG labels */
  label: 11,
  /** Headings, empty state titles */
  heading: 16,
  /** Sub-headings, card titles */
  subheading: 14,
} as const;
