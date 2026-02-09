/**
 * Architecture visualization theme - single source of truth for all Matrix colors.
 * Import `archTheme` everywhere instead of hardcoding hex values.
 */

export const archTheme = {
  /** Surface / background fills (darkest → lightest) */
  surface: {
    /** Deepest background behind everything (#08080a) */
    deepBg: '#08080a',
    /** SVG canvas and state screens (#0a0a0c) */
    canvas: '#0a0a0c',
    /** Node card fill, inactive grid cell (#141418) */
    card: '#141418',
    /** Diagonal/self cell, dot pattern, tier aggregate (#1a1a20) */
    muted: '#1a1a20',
    /** Active/hovered cell fill (#1e293b) */
    active: '#1e293b',
  },

  /** Border / stroke colors */
  border: {
    /** Node card border (#2a2a35) */
    card: '#2a2a35',
  },

  /** Text fills (brightest → dimmest) */
  text: {
    /** Primary: node names, tier labels (#ffffff) */
    primary: '#ffffff',
    /** Secondary: source/target names in tooltips (#e5e7eb) */
    secondary: '#e5e7eb',
    /** Muted: protocol labels, data flow descriptions (#9ca3af) */
    muted: '#9ca3af',
    /** Dim: framework, clean branch, arrows, connection counts (#6b7280) */
    dim: '#6b7280',
    /** Faintest: file/context counts (#4b5563) */
    faint: '#4b5563',
  },

  /** Indicator / accent colors */
  indicator: {
    /** Dirty branch marker — amber (#f59e0b) */
    dirty: '#f59e0b',
    /** Active cell stroke — blue (#3b82f6) */
    activeBorder: '#3b82f6',
  },
} as const;

export type ArchTheme = typeof archTheme;
