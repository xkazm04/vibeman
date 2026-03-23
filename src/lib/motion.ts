/**
 * Unified motion constants for consistent animation choreography.
 *
 * Duration tiers, easing curves, and reusable Framer Motion variants
 * shared across the entire app. Import from here instead of hardcoding
 * animation values in individual components.
 */

import type { Transition, Variants } from 'framer-motion';

// ── Duration tiers ────────────────────────────────────────────────────────────

export const duration = {
  /** Micro-interactions: hover, tap, tooltip show/hide */
  snappy: 0.15,
  /** Standard transitions: fade, slide, scale */
  normal: 0.2,
  /** Deliberate animations: layout shifts, entrance sequences */
  deliberate: 0.3,
  /** Expand/collapse: accordion, panel toggle */
  expand: 0.4,
  /** Progress bars, emphasis entrances */
  slow: 0.5,
  /** SVG path draws, chart entrances, dramatic reveals */
  dramatic: 0.8,
  /** Full sweep animations: long path traces, complex choreography */
  sweep: 1.2,
} as const;

// ── Easing curves ─────────────────────────────────────────────────────────────

export const easing = {
  /** Elements entering the viewport — decelerates into place */
  entrance: [0.0, 0.0, 0.2, 1] as const,    // easeOut
  /** Elements leaving the viewport — accelerates away */
  exit: [0.4, 0.0, 1, 1] as const,           // easeIn
  /** Shape/layout morphs — symmetric acceleration */
  morph: [0.4, 0.0, 0.2, 1] as const,        // easeInOut
} as const;

// ── Preset transitions ────────────────────────────────────────────────────────

export const transition = {
  snappy: { duration: duration.snappy, ease: easing.entrance } satisfies Transition,
  normal: { duration: duration.normal, ease: easing.entrance } satisfies Transition,
  deliberate: { duration: duration.deliberate, ease: easing.entrance } satisfies Transition,
  expand: { duration: duration.expand, ease: easing.morph } satisfies Transition,
  exit: { duration: duration.snappy, ease: easing.exit } satisfies Transition,
  slow: { duration: duration.slow, ease: easing.entrance } satisfies Transition,
  dramatic: { duration: duration.dramatic, ease: easing.entrance } satisfies Transition,
  sweep: { duration: duration.sweep, ease: easing.morph } satisfies Transition,
  spring: { type: 'spring' as const, stiffness: 100, damping: 15 },
} as const;

// ── Reusable variants ─────────────────────────────────────────────────────────

/** Fade in + slide up — standard entrance for cards, panels */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.deliberate },
  exit: { opacity: 0, y: -8, transition: transition.exit },
};

/** Fade only — tooltips, overlays, detail cards */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.snappy },
  exit: { opacity: 0, transition: transition.snappy },
};

/** Scale entrance — cards in a staggered grid */
export const scaleEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
};

/** Expand/collapse — accordion, collapsible panels */
export const expandCollapse: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: transition.expand },
  exit: { height: 0, opacity: 0, transition: transition.expand },
};

// ── Scale presets ────────────────────────────────────────────────────────────

export const scales = {
  /** Minimal hover scale (1.01) - subtle, cards */
  hoverMinimal: 1.01,
  /** Subtle hover scale (1.02) - cards, list items */
  hoverSubtle: 1.02,
  /** Standard hover scale (1.05) - buttons, interactive elements */
  hover: 1.05,
  /** Pronounced hover scale (1.1) - emphasis, large CTAs */
  hoverPronounced: 1.1,
  /** Standard tap scale (0.95) - default press feedback */
  tap: 0.95,
  /** Subtle tap scale (0.98) - cards, large elements */
  tapSubtle: 0.98,
  /** Pronounced tap scale (0.9) - emphasis, bounce effect */
  tapPronounced: 0.9,
} as const;

// ── Y-offset presets ─────────────────────────────────────────────────────────

export const offsets = {
  /** Subtle lift (-1px) - buttons, small elements */
  liftSubtle: -1,
  /** Standard lift (-2px) - cards, interactive panels */
  liftY: -2,
  /** Pronounced lift (-4px) - emphasis, floating elements */
  liftPronounced: -4,
} as const;

// ── Micro-interaction presets ─────────────────────────────────────────────────

export const hover = {
  /** Subtle lift for cards */
  lift: { scale: scales.hoverMinimal },
  /** Noticeable lift for buttons */
  button: { scale: scales.hoverSubtle },
  /** Interactive card with vertical shift */
  card: { scale: 1.03, y: offsets.liftY },
} as const;

export const tap = {
  press: { scale: scales.tapSubtle },
  subtle: { scale: 0.995 },
} as const;

// ── Pulse / breathing presets ─────────────────────────────────────────────────

export const pulse = {
  ring: {
    animate: { opacity: [0.3, 0.8, 0.3] as number[] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  },
  glow: (borderColor: string) => ({
    animate: {
      boxShadow: [
        `0 0 0px ${borderColor}`,
        `0 0 12px ${borderColor}`,
        `0 0 0px ${borderColor}`,
      ],
      opacity: [0.6, 1, 0.6] as number[],
    },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  }),
};

// ── Stagger helper ────────────────────────────────────────────────────────────

/** Returns a stagger container variant for orchestrating children */
export const staggerContainer = (staggerDelay = 0.05): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

// ── CSS transition strings ───────────────────────────────────────────────────
// For inline `style={{ transition }}` on SVG elements and non-Framer contexts.

/** Maps easing names to CSS cubic-bezier strings */
export const cssEasing = {
  entrance: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  morph: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Build a CSS transition string from motion constants.
 * @example cssTransition(['opacity', 'stroke-width'], 'snappy')
 * // → "opacity 0.15s cubic-bezier(0, 0, 0.2, 1), stroke-width 0.15s cubic-bezier(0, 0, 0.2, 1)"
 */
export function cssTransition(
  properties: string | string[],
  tier: keyof typeof duration = 'normal',
  ease: keyof typeof cssEasing = 'entrance',
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  const d = duration[tier];
  const e = cssEasing[ease];
  return props.map(p => `${p} ${d}s ${e}`).join(', ');
}

/**
 * Returns '' (no transition) when reduced motion is preferred,
 * otherwise delegates to cssTransition().
 */
export function cssTransitionSafe(
  prefersReduced: boolean,
  properties: string | string[],
  tier: keyof typeof duration = 'normal',
  ease: keyof typeof cssEasing = 'entrance',
): string {
  return prefersReduced ? 'none' : cssTransition(properties, tier, ease);
}

// ── Reduced-motion safe values ────────────────────────────────────────────────

/** Zero-motion overrides — used when prefers-reduced-motion is active */
export const reducedMotion = {
  duration: 0.01,
  transition: { duration: 0.01 } satisfies Transition,
  noAnimation: { opacity: 1, y: 0, scale: 1, height: 'auto' },
} as const;
