/**
 * Gradient Utilities for Dynamic Color Transitions
 *
 * Provides color interpolation and gradient generation utilities
 * for smooth transitions between context group colors.
 */

// Cache for glass gradient computations
// Key format: "baseColor|accentColor" (accentColor may be undefined)
const glassGradientCache = new Map<string, {
  background: string;
  borderColor: string;
  shadowColor: string;
  glowColor: string;
}>();

// Pre-computed gradients for standard group colors (computed at module load)
// These 18 colors from CONTEXT_GROUP_COLORS are pre-warmed in the cache
const PRECOMPUTED_COLORS = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
  '#EC4899', '#84CC16', '#6366F1', '#14B8A6', '#F97316', '#A855F7',
  '#22C55E', '#E11D48', '#0EA5E9', '#FACC15', '#64748B', '#D946EF',
] as const;

/**
 * Parse a hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB values to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Interpolate between two colors
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param factor - Interpolation factor (0-1)
 * @returns Interpolated color (hex)
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const r = rgb1.r + (rgb2.r - rgb1.r) * factor;
  const g = rgb1.g + (rgb2.g - rgb1.g) * factor;
  const b = rgb1.b + (rgb2.b - rgb1.b) * factor;

  return rgbToHex(r, g, b);
}

/**
 * Generate a CSS gradient between two colors with smooth transitions
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param direction - Gradient direction (default: 'to right')
 * @param opacity - Opacity for the gradient colors (0-1)
 * @returns CSS gradient string
 */
export function generateGradient(
  color1: string,
  color2: string,
  direction: string = 'to right',
  opacity: number = 1
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  return `linear-gradient(${direction}, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${opacity}), rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, ${opacity}))`;
}

/**
 * Generate a multi-stop gradient for smooth color flow
 * @param colors - Array of colors to interpolate
 * @param direction - Gradient direction
 * @param opacity - Opacity for the gradient colors (0-1)
 * @returns CSS gradient string
 */
export function generateMultiStopGradient(
  colors: string[],
  direction: string = 'to right',
  opacity: number = 1
): string {
  if (colors.length === 0) return 'transparent';
  if (colors.length === 1) {
    const rgb = hexToRgb(colors[0]);
    return `linear-gradient(${direction}, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}))`;
  }

  const stops = colors.map((color, index) => {
    const rgb = hexToRgb(color);
    const percent = (index / (colors.length - 1)) * 100;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}) ${percent}%`;
  });

  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

/**
 * Generate a glassmorphism-style gradient with subtle color accents
 * Results are cached by color pair for efficient re-renders.
 * @param baseColor - Primary accent color
 * @param accentColor - Secondary accent color (optional)
 * @returns Object with CSS properties for glassmorphism effect
 */
export function generateGlassGradient(baseColor: string, accentColor?: string): {
  background: string;
  borderColor: string;
  shadowColor: string;
  glowColor: string;
} {
  // Check cache first
  const cacheKey = `${baseColor}|${accentColor ?? ''}`;
  const cached = glassGradientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Compute gradient
  const rgb = hexToRgb(baseColor);
  const accent = accentColor ? hexToRgb(accentColor) : rgb;

  const result = {
    background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 0%, rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.04) 50%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02) 100%)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    shadowColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
    glowColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
  };

  // Cache result
  glassGradientCache.set(cacheKey, result);

  return result;
}

/**
 * Create a smooth transition gradient between adjacent group colors
 * Used for the gradient dividers between context group cards
 * @param prevColor - Color of previous group
 * @param nextColor - Color of next group
 * @param intensity - Intensity of the transition (0-1)
 * @returns CSS gradient for the transition zone
 */
export function createTransitionGradient(
  prevColor: string,
  nextColor: string,
  intensity: number = 0.5
): string {
  const midColor = interpolateColor(prevColor, nextColor, 0.5);
  const rgb1 = hexToRgb(prevColor);
  const rgb2 = hexToRgb(midColor);
  const rgb3 = hexToRgb(nextColor);

  return `linear-gradient(135deg,
    rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${intensity * 0.3}) 0%,
    rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, ${intensity * 0.5}) 50%,
    rgba(${rgb3.r}, ${rgb3.g}, ${rgb3.b}, ${intensity * 0.3}) 100%)`;
}

/**
 * Generate accent color palette based on a base color
 * Creates harmonious accent options for personalization
 * @param baseColor - Base hex color
 * @returns Array of complementary accent colors
 */
export function generateAccentPalette(baseColor: string): string[] {
  const rgb = hexToRgb(baseColor);

  // Convert to HSL for easier manipulation
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    const rNorm = rgb.r / 255;
    const gNorm = rgb.g / 255;
    const bNorm = rgb.b / 255;

    if (max === rNorm) {
      h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    } else if (max === gNorm) {
      h = ((bNorm - rNorm) / d + 2) / 6;
    } else {
      h = ((rNorm - gNorm) / d + 4) / 6;
    }
  }

  // Generate complementary colors with different hue shifts
  const hueShifts = [0, 0.083, 0.167, -0.083, -0.167]; // 0, 30, 60, -30, -60 degrees

  return hueShifts.map(shift => {
    const newH = (h + shift + 1) % 1;
    return hslToHex(newH, s, l);
  });
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return rgbToHex(r * 255, g * 255, b * 255);
}

/**
 * Predefined accent color palettes for quick selection
 */
export const ACCENT_PALETTES = {
  ocean: ['#0EA5E9', '#06B6D4', '#14B8A6', '#22C55E', '#3B82F6'],
  sunset: ['#F59E0B', '#F97316', '#EF4444', '#EC4899', '#D946EF'],
  forest: ['#22C55E', '#10B981', '#14B8A6', '#84CC16', '#6366F1'],
  midnight: ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'],
  fire: ['#EF4444', '#F97316', '#F59E0B', '#FACC15', '#EC4899'],
  neutral: ['#64748B', '#71717A', '#78716C', '#6B7280', '#525252'],
} as const;

export type AccentPaletteName = keyof typeof ACCENT_PALETTES;

// Pre-warm the cache with standard group colors at module load time
// This ensures zero computation cost on first render for common colors
function prewarmGlassGradientCache(): void {
  for (const color of PRECOMPUTED_COLORS) {
    generateGlassGradient(color);
  }
}

// Execute pre-warming immediately when module loads
prewarmGlassGradientCache();
