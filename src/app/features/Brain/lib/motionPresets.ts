/**
 * Brain module motion presets
 *
 * Brain-domain drawer / panel variants. These are *consumers* of the
 * app-wide motion primitives (@/lib/motion); they do NOT re-define
 * duration or easing values. If you reach for a raw cubic-bezier or
 * literal duration in this file, import it from @/lib/motion instead.
 */

import type { Variants } from 'framer-motion';
import { duration, easing } from '@/lib/motion';

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
  duration: duration.normal,
  ease: easing.entrance,
};

/** Inline expand — drops down for drill-down panels within cards */
export const inlineExpand: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const inlineExpandTransition = {
  duration: duration.snappy,
  ease: easing.entrance,
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
  duration: duration.normal,
  ease: easing.entrance,
};
