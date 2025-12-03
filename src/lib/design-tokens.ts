/**
 * Centralized Design Tokens
 *
 * This file exports standardized values for animations, spacing, colors, and shadows.
 * Use these tokens throughout the codebase to ensure visual consistency.
 *
 * @example
 * import { animation, colors, shadows } from '@/lib/design-tokens';
 *
 * <motion.div
 *   whileHover={{ scale: animation.scales.hover, y: animation.offsets.liftY }}
 *   whileTap={{ scale: animation.scales.tap }}
 *   transition={{ duration: animation.durations.normal }}
 * />
 */

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

/**
 * Animation duration values in seconds
 */
export const durations = {
  /** Fast animations (0.15s) - buttons, icons, micro-interactions */
  fast: 0.15,
  /** Normal animations (0.2s) - default for most transitions */
  normal: 0.2,
  /** Slow animations (0.3s) - modals, panels, emphasis */
  slow: 0.3,
  /** Very slow animations (0.4s) - page transitions, large elements */
  verySlow: 0.4,
} as const;

/**
 * Scale transform values for hover/tap states
 */
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

/**
 * Y-axis offset values for lift/hover effects (in pixels)
 */
export const offsets = {
  /** Subtle lift (-1px) - buttons, small elements */
  liftSubtle: -1,
  /** Standard lift (-2px) - cards, interactive panels */
  liftY: -2,
  /** Pronounced lift (-4px) - emphasis, floating elements */
  liftPronounced: -4,
} as const;

/**
 * Pre-composed animation presets for common use cases
 */
export const animationPresets = {
  /** Default button animation */
  button: {
    whileHover: { scale: scales.hover, y: offsets.liftSubtle },
    whileTap: { scale: scales.tap },
    transition: { duration: durations.fast },
  },
  /** Subtle button animation */
  buttonSubtle: {
    whileHover: { scale: scales.hoverSubtle },
    whileTap: { scale: scales.tapSubtle },
    transition: { duration: durations.normal },
  },
  /** Bouncy button animation */
  buttonBounce: {
    whileHover: { scale: scales.hoverPronounced },
    whileTap: { scale: scales.tapPronounced },
    transition: { duration: durations.normal, type: 'spring', stiffness: 400 },
  },
  /** Card hover animation */
  card: {
    whileHover: { scale: scales.hoverSubtle, y: offsets.liftY },
    whileTap: { scale: scales.tapSubtle },
    transition: { duration: durations.normal },
  },
  /** Minimal card animation */
  cardMinimal: {
    whileHover: { scale: scales.hoverMinimal },
    transition: { duration: durations.normal },
  },
  /** Icon button animation */
  icon: {
    whileHover: { scale: scales.hover, y: offsets.liftSubtle },
    whileTap: { scale: scales.tap },
    transition: { duration: durations.fast },
  },
  /** Lift only animation (no scale) */
  lift: {
    whileHover: { y: offsets.liftY },
    transition: { duration: durations.normal },
  },
} as const;

// Combine for convenient import
export const animation = {
  durations,
  scales,
  offsets,
  presets: animationPresets,
} as const;

// =============================================================================
// COLOR TOKENS - OPACITY SCALES
// =============================================================================

/**
 * Standard opacity suffixes for Tailwind classes
 * Use with template literals: `bg-blue-500${opacity.subtle}`
 */
export const opacity = {
  /** Minimal opacity (/10) - very subtle highlights */
  minimal: '/10',
  /** Subtle opacity (/20) - light accents, shadows */
  subtle: '/20',
  /** Light opacity (/30) - borders, light backgrounds */
  light: '/30',
  /** Medium opacity (/40) - standard backgrounds, gradients base */
  medium: '/40',
  /** Standard opacity (/50) - balanced visibility */
  standard: '/50',
  /** Strong opacity (/60) - emphasized backgrounds */
  strong: '/60',
  /** Heavy opacity (/70) - hover states, focus */
  heavy: '/70',
  /** Dense opacity (/80) - near-solid backgrounds */
  dense: '/80',
  /** Near-solid opacity (/90) - modals, overlays */
  nearSolid: '/90',
  /** Full opacity (/95) - almost opaque */
  full: '/95',
} as const;

/**
 * Numeric opacity values (0-1 scale) for CSS/JS usage
 */
export const opacityValues = {
  minimal: 0.1,
  subtle: 0.2,
  light: 0.3,
  medium: 0.4,
  standard: 0.5,
  strong: 0.6,
  heavy: 0.7,
  dense: 0.8,
  nearSolid: 0.9,
  full: 0.95,
} as const;

// =============================================================================
// SEMANTIC BACKGROUND TOKENS
// =============================================================================

/**
 * Semantic background classes for consistent UI elements
 */
export const backgrounds = {
  /** Card backgrounds */
  card: {
    base: 'bg-gray-900/40',
    hover: 'bg-gray-900/50',
    active: 'bg-gray-900/60',
  },
  /** Panel/section backgrounds */
  panel: {
    base: 'bg-gray-800/40',
    hover: 'bg-gray-800/50',
    active: 'bg-gray-800/60',
  },
  /** Modal/overlay backgrounds */
  modal: {
    base: 'bg-gray-800/90',
    backdrop: 'bg-black/60',
  },
  /** Input field backgrounds */
  input: {
    base: 'bg-gray-800/40',
    focus: 'bg-gray-800/60',
  },
  /** Dropdown/menu backgrounds */
  dropdown: {
    base: 'bg-gray-900/95',
    item: 'bg-gray-800/40',
    itemHover: 'bg-gray-700/50',
  },
} as const;

// =============================================================================
// GRADIENT TOKENS
// =============================================================================

/**
 * Semantic color gradient base classes (direction excluded for flexibility)
 * Use with gradient direction: `bg-gradient-to-r ${gradients.blue.solid}`
 */
export const gradients = {
  blue: {
    solid: 'from-blue-600/40 to-cyan-600/40',
    solidHover: 'from-blue-500/50 to-cyan-500/50',
    solidActive: 'from-blue-500/60 to-cyan-500/60',
    outline: 'from-blue-500/20 to-cyan-500/20',
    outlineHover: 'from-blue-500/30 to-cyan-500/30',
  },
  cyan: {
    solid: 'from-cyan-600/40 to-blue-600/40',
    solidHover: 'from-cyan-500/50 to-blue-500/50',
    solidActive: 'from-cyan-500/60 to-blue-500/60',
    outline: 'from-cyan-500/20 to-blue-500/20',
    outlineHover: 'from-cyan-500/30 to-blue-500/30',
  },
  purple: {
    solid: 'from-purple-600/40 to-pink-600/40',
    solidHover: 'from-purple-500/50 to-pink-500/50',
    solidActive: 'from-purple-500/60 to-pink-500/60',
    outline: 'from-purple-500/20 to-pink-500/20',
    outlineHover: 'from-purple-500/30 to-pink-500/30',
  },
  pink: {
    solid: 'from-pink-600/40 to-purple-600/40',
    solidHover: 'from-pink-500/50 to-purple-500/50',
    solidActive: 'from-pink-500/60 to-purple-500/60',
    outline: 'from-pink-500/20 to-purple-500/20',
    outlineHover: 'from-pink-500/30 to-purple-500/30',
  },
  green: {
    solid: 'from-green-600/40 to-emerald-600/40',
    solidHover: 'from-green-500/50 to-emerald-500/50',
    solidActive: 'from-green-500/60 to-emerald-500/60',
    outline: 'from-green-500/20 to-emerald-500/20',
    outlineHover: 'from-green-500/30 to-emerald-500/30',
  },
  emerald: {
    solid: 'from-emerald-600/40 to-green-600/40',
    solidHover: 'from-emerald-500/50 to-green-500/50',
    solidActive: 'from-emerald-500/60 to-green-500/60',
    outline: 'from-emerald-500/20 to-green-500/20',
    outlineHover: 'from-emerald-500/30 to-green-500/30',
  },
  amber: {
    solid: 'from-amber-600/40 to-yellow-600/40',
    solidHover: 'from-amber-500/50 to-yellow-500/50',
    solidActive: 'from-amber-500/60 to-yellow-500/60',
    outline: 'from-amber-500/20 to-yellow-500/20',
    outlineHover: 'from-amber-500/30 to-yellow-500/30',
  },
  yellow: {
    solid: 'from-yellow-600/40 to-amber-600/40',
    solidHover: 'from-yellow-500/50 to-amber-500/50',
    solidActive: 'from-yellow-500/60 to-amber-500/60',
    outline: 'from-yellow-500/20 to-amber-500/20',
    outlineHover: 'from-yellow-500/30 to-amber-500/30',
  },
  red: {
    solid: 'from-red-600/40 to-orange-600/40',
    solidHover: 'from-red-500/50 to-orange-500/50',
    solidActive: 'from-red-500/60 to-orange-500/60',
    outline: 'from-red-500/20 to-orange-500/20',
    outlineHover: 'from-red-500/30 to-orange-500/30',
  },
  orange: {
    solid: 'from-orange-600/40 to-red-600/40',
    solidHover: 'from-orange-500/50 to-red-500/50',
    solidActive: 'from-orange-500/60 to-red-500/60',
    outline: 'from-orange-500/20 to-red-500/20',
    outlineHover: 'from-orange-500/30 to-red-500/30',
  },
  slate: {
    solid: 'from-slate-600/40 to-gray-600/40',
    solidHover: 'from-slate-500/50 to-gray-500/50',
    solidActive: 'from-slate-500/60 to-gray-500/60',
    outline: 'from-slate-500/20 to-gray-500/20',
    outlineHover: 'from-slate-500/30 to-gray-500/30',
  },
  gray: {
    solid: 'from-gray-600/40 to-slate-600/40',
    solidHover: 'from-gray-500/50 to-slate-500/50',
    solidActive: 'from-gray-500/60 to-slate-500/60',
    outline: 'from-gray-500/20 to-slate-500/20',
    outlineHover: 'from-gray-500/30 to-slate-500/30',
  },
  white: {
    solid: 'from-white/10 to-gray-100/10',
    solidHover: 'from-white/20 to-gray-100/20',
    solidActive: 'from-white/30 to-gray-100/30',
    outline: 'from-white/5 to-gray-100/5',
    outlineHover: 'from-white/10 to-gray-100/10',
  },
} as const;

/**
 * Semantic gradient types for UI elements
 */
export const semanticGradients = {
  info: gradients.blue,
  success: gradients.green,
  warning: gradients.amber,
  danger: gradients.red,
  neutral: gradients.slate,
  primary: gradients.cyan,
  secondary: gradients.purple,
} as const;

// =============================================================================
// BORDER TOKENS
// =============================================================================

/**
 * Border color classes with standard opacity
 */
export const borders = {
  blue: {
    base: 'border-blue-500/30',
    hover: 'border-blue-500/40',
    focus: 'border-blue-500/50',
  },
  cyan: {
    base: 'border-cyan-500/30',
    hover: 'border-cyan-500/40',
    focus: 'border-cyan-500/50',
  },
  purple: {
    base: 'border-purple-500/30',
    hover: 'border-purple-500/40',
    focus: 'border-purple-500/50',
  },
  pink: {
    base: 'border-pink-500/30',
    hover: 'border-pink-500/40',
    focus: 'border-pink-500/50',
  },
  green: {
    base: 'border-green-500/30',
    hover: 'border-green-500/40',
    focus: 'border-green-500/50',
  },
  emerald: {
    base: 'border-emerald-500/30',
    hover: 'border-emerald-500/40',
    focus: 'border-emerald-500/50',
  },
  amber: {
    base: 'border-amber-500/30',
    hover: 'border-amber-500/40',
    focus: 'border-amber-500/50',
  },
  yellow: {
    base: 'border-yellow-500/30',
    hover: 'border-yellow-500/40',
    focus: 'border-yellow-500/50',
  },
  red: {
    base: 'border-red-500/30',
    hover: 'border-red-500/40',
    focus: 'border-red-500/50',
  },
  orange: {
    base: 'border-orange-500/30',
    hover: 'border-orange-500/40',
    focus: 'border-orange-500/50',
  },
  gray: {
    base: 'border-gray-700/40',
    hover: 'border-gray-600/50',
    focus: 'border-gray-500/60',
  },
  slate: {
    base: 'border-slate-700/40',
    hover: 'border-slate-600/50',
    focus: 'border-slate-500/60',
  },
  white: {
    base: 'border-white/20',
    hover: 'border-white/30',
    focus: 'border-white/40',
  },
} as const;

/**
 * Semantic border types
 */
export const semanticBorders = {
  info: borders.blue,
  success: borders.green,
  warning: borders.amber,
  danger: borders.red,
  neutral: borders.gray,
  primary: borders.cyan,
  secondary: borders.purple,
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

/**
 * Shadow color classes with standard opacity
 */
export const shadows = {
  blue: {
    subtle: 'shadow-blue-500/20',
    normal: 'shadow-blue-500/30',
    glow: 'shadow-blue-500/50',
  },
  cyan: {
    subtle: 'shadow-cyan-500/20',
    normal: 'shadow-cyan-500/30',
    glow: 'shadow-cyan-500/50',
  },
  purple: {
    subtle: 'shadow-purple-500/20',
    normal: 'shadow-purple-500/30',
    glow: 'shadow-purple-500/50',
  },
  pink: {
    subtle: 'shadow-pink-500/20',
    normal: 'shadow-pink-500/30',
    glow: 'shadow-pink-500/50',
  },
  green: {
    subtle: 'shadow-green-500/20',
    normal: 'shadow-green-500/30',
    glow: 'shadow-green-500/50',
  },
  emerald: {
    subtle: 'shadow-emerald-500/20',
    normal: 'shadow-emerald-500/30',
    glow: 'shadow-emerald-500/50',
  },
  amber: {
    subtle: 'shadow-amber-500/20',
    normal: 'shadow-amber-500/30',
    glow: 'shadow-amber-500/50',
  },
  yellow: {
    subtle: 'shadow-yellow-500/20',
    normal: 'shadow-yellow-500/30',
    glow: 'shadow-yellow-500/50',
  },
  red: {
    subtle: 'shadow-red-500/20',
    normal: 'shadow-red-500/30',
    glow: 'shadow-red-500/50',
  },
  orange: {
    subtle: 'shadow-orange-500/20',
    normal: 'shadow-orange-500/30',
    glow: 'shadow-orange-500/50',
  },
  gray: {
    subtle: 'shadow-gray-500/10',
    normal: 'shadow-gray-500/20',
    glow: 'shadow-gray-500/40',
  },
  black: {
    subtle: 'shadow-black/20',
    normal: 'shadow-black/40',
    glow: 'shadow-black/60',
  },
} as const;

/**
 * Semantic shadow types
 */
export const semanticShadows = {
  info: shadows.blue,
  success: shadows.green,
  warning: shadows.amber,
  danger: shadows.red,
  neutral: shadows.gray,
  primary: shadows.cyan,
  secondary: shadows.purple,
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

/**
 * Standard spacing values (in Tailwind units)
 * Can be used for padding, margin, gaps
 */
export const spacing = {
  /** Extra small (1 = 0.25rem = 4px) */
  xs: 1,
  /** Small (2 = 0.5rem = 8px) */
  sm: 2,
  /** Medium (3 = 0.75rem = 12px) */
  md: 3,
  /** Default (4 = 1rem = 16px) */
  default: 4,
  /** Large (6 = 1.5rem = 24px) */
  lg: 6,
  /** Extra large (8 = 2rem = 32px) */
  xl: 8,
  /** 2XL (12 = 3rem = 48px) */
  '2xl': 12,
  /** 3XL (16 = 4rem = 64px) */
  '3xl': 16,
} as const;

/**
 * Gap tokens for flex/grid layouts
 */
export const gaps = {
  /** Tight gap (gap-1) */
  tight: 'gap-1',
  /** Small gap (gap-2) */
  sm: 'gap-2',
  /** Medium gap (gap-3) */
  md: 'gap-3',
  /** Default gap (gap-4) */
  default: 'gap-4',
  /** Large gap (gap-6) */
  lg: 'gap-6',
  /** Extra large gap (gap-8) */
  xl: 'gap-8',
} as const;

// =============================================================================
// TRANSITION TOKENS
// =============================================================================

/**
 * Transition preset classes for CSS transitions
 */
export const transitions = {
  /** Fast transitions for micro-interactions */
  fast: 'transition-all duration-150 ease-out',
  /** Default transitions */
  normal: 'transition-all duration-200 ease-out',
  /** Slow transitions for emphasis */
  slow: 'transition-all duration-300 ease-out',
  /** Color-only transitions */
  colors: 'transition-colors duration-200 ease-out',
  /** Opacity-only transitions */
  opacity: 'transition-opacity duration-200 ease-out',
  /** Transform-only transitions */
  transform: 'transition-transform duration-200 ease-out',
} as const;

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

/**
 * All color-related tokens grouped together
 */
export const colors = {
  opacity,
  opacityValues,
  backgrounds,
  gradients,
  semanticGradients,
  borders,
  semanticBorders,
  shadows,
  semanticShadows,
} as const;

/**
 * Default export with all tokens
 */
const designTokens = {
  animation,
  durations,
  scales,
  offsets,
  animationPresets,
  colors,
  opacity,
  opacityValues,
  backgrounds,
  gradients,
  semanticGradients,
  borders,
  semanticBorders,
  shadows,
  semanticShadows,
  spacing,
  gaps,
  transitions,
} as const;

export default designTokens;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Duration = keyof typeof durations;
export type Scale = keyof typeof scales;
export type Offset = keyof typeof offsets;
export type AnimationPreset = keyof typeof animationPresets;
export type Opacity = keyof typeof opacity;
export type BackgroundType = keyof typeof backgrounds;
export type GradientColor = keyof typeof gradients;
export type BorderColor = keyof typeof borders;
export type ShadowColor = keyof typeof shadows;
export type SemanticColor = keyof typeof semanticGradients;
export type Spacing = keyof typeof spacing;
export type Gap = keyof typeof gaps;
export type Transition = keyof typeof transitions;
