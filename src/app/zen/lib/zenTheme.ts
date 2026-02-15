/**
 * Zen Theme Constants
 *
 * Unified color tokens and spacing scale for all Zen mode components.
 * Ensures visual consistency across ZenHeader, MissionControl, etc.
 */

// ── Color Tokens ──────────────────────────────────────────────

export const zen = {
  /** Primary accent gradient (cyan → blue) for buttons, progress bars, active indicators */
  gradient: 'from-cyan-500 to-blue-500',
  /** Hover state of the primary gradient */
  gradientHover: 'from-cyan-400 to-blue-400',
  /** Disabled/inactive gradient */
  gradientDisabled: 'from-gray-700 to-gray-700',
  /** Primary accent gradient as CSS for inline styles */
  gradientCSS: 'linear-gradient(to right, #06b6d4, #3b82f6)',

  /** Primary accent color for text, icons, small indicators */
  accent: 'text-cyan-400',
  /** Accent background (10% opacity) for badges, tags, icon containers */
  accentBg: 'bg-cyan-500/10',
  /** Accent border (20% opacity) for outlined containers */
  accentBorder: 'border-cyan-500/20',
  /** Combined accent surface: bg + border + text */
  accentSurface: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',

  /** Accent solid for dots, pulsing indicators */
  accentDot: 'bg-cyan-400',
  /** Slightly deeper dot for layered pulse effects */
  accentDotDeep: 'bg-cyan-500',

  /** Shadow glow for elevated accent elements */
  accentShadow: 'shadow-lg shadow-cyan-500/10',

  /** Surface colors */
  surface: 'bg-gray-800/40',
  surfaceHover: 'bg-gray-800/60',
  surfaceBorder: 'border-gray-700/50',
  surfaceDivider: 'border-gray-800',
  surfaceDividerSubtle: 'border-gray-800/50',

  /** Background gradients for full-page layouts */
  bgSolid: 'bg-gray-950',
  bgGradient: 'bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950',

  /** Text hierarchy */
  textPrimary: 'text-white',
  textSecondary: 'text-gray-300',
  textTertiary: 'text-gray-400',
  textMuted: 'text-gray-500',
  textFaint: 'text-gray-400',

  /** Status colors (reusable across stats, event feeds, session indicators) */
  statusRunning: 'text-green-400',
  statusPending: 'text-amber-400',
  statusCompleted: 'text-green-400',
  statusFailed: 'text-red-400',
} as const;

// ── Spacing Scale ─────────────────────────────────────────────
// Consistent spacing hierarchy for Zen components.
// Use these values to maintain visual rhythm.

export const zenSpacing = {
  /** Inline element gaps (icons + labels, small groups) */
  gapInline: 'gap-2',
  /** Component-level gaps (stat items, cards in a row) */
  gapComponent: 'gap-3',
  /** Section-level gaps (sidebar sections, major layout areas) */
  gapSection: 'gap-4',

  /** Tight inner padding (status badges, compact items) */
  padTight: 'px-3 py-1.5',
  /** Standard inner padding (cards, panels) */
  padStandard: 'px-4 py-3',
  /** Spacious padding (page sections, major containers) */
  padSpacious: 'px-6 py-4',

  /** Vertical spacing between stacked sections */
  stackTight: 'space-y-2',
  stackNormal: 'space-y-3',
  stackWide: 'space-y-4',
} as const;
