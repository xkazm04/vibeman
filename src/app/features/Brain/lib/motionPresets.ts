/**
 * Brain module motion presets
 *
 * Shared animation variants for detail panels across the Brain module.
 * Import these instead of defining inline motion props in individual components.
 */

import type { Variants } from 'framer-motion';

/** Bottom sheet drawer — slides up from below with spring physics */
export const bottomSheet: Variants = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: '100%' },
};

export const bottomSheetTransition = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 260,
};

/** Side panel — slides in from the right with a quick tween */
export const sidePanel: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const sidePanelTransition = {
  duration: 0.2,
  ease: [0.0, 0.0, 0.2, 1] as const,
};

/** Inline expand — drops down for drill-down panels within cards */
export const inlineExpand: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const inlineExpandTransition = {
  duration: 0.15,
  ease: [0.0, 0.0, 0.2, 1] as const,
};

/** Full drawer — slides in from the right edge, covering full height */
export const fullDrawer: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

export const fullDrawerTransition = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 300,
};

/** Collapse — height-based expand/collapse for toggled sections within cards */
export const collapse: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

export const collapseTransition = {
  duration: 0.2,
  ease: [0.0, 0.0, 0.2, 1] as const,
};
