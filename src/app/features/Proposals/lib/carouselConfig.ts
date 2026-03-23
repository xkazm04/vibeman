/**
 * Shared carousel animation constants.
 *
 * Both ProposalPanel and DirectionCarousel reference these values
 * so animation behaviour stays consistent across the two surfaces.
 */

// ─── Processing delays (ms) ────────────────────────────────────────
export const CAROUSEL_DELAYS = {
  accept: 600,
  acceptWithCode: 800,
  decline: 400,
} as const;

// ─── Card exit animation ────────────────────────────────────────────
export const CARD_EXIT = {
  /** Distance (px) the card travels on exit */
  distance: 400,
  /** Max rotation (deg) on exit swipe */
  rotation: 15,
  /** Scale when exiting */
  scaleOut: 0.9,
  /** Duration for exit spring */
  spring: { stiffness: 300, damping: 30 },
} as const;

// ─── Stacked-card layout ────────────────────────────────────────────
export const STACK = {
  /** Scale of background (non-main) cards */
  bgScale: 0.75,
  /** Opacity of background cards */
  bgOpacity: 0.5,
  /** Blur (px) applied to background cards */
  bgBlur: 12,
  /** Exit blur for dismissed cards */
  exitBlur: 20,
} as const;

// ─── Swipe gesture thresholds ───────────────────────────────────────
export const SWIPE = {
  threshold: 120,
  velocity: 500,
} as const;
