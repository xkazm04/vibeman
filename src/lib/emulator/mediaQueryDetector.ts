/**
 * Media Query Detector
 * Parses CSS for media queries and extracts responsive breakpoints
 */

export interface Breakpoint {
  name: string;
  minWidth: number | null;
  maxWidth: number | null;
  label: string;
  color: string;
  isCustom: boolean;
}

export interface MediaQueryMatch {
  query: string;
  minWidth: number | null;
  maxWidth: number | null;
  source: string;
}

// Default Tailwind CSS breakpoints
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'xs', minWidth: 0, maxWidth: 639, label: 'XS', color: '#6366f1', isCustom: false },
  { name: 'sm', minWidth: 640, maxWidth: 767, label: 'SM', color: '#8b5cf6', isCustom: false },
  { name: 'md', minWidth: 768, maxWidth: 1023, label: 'MD', color: '#a855f7', isCustom: false },
  { name: 'lg', minWidth: 1024, maxWidth: 1279, label: 'LG', color: '#d946ef', isCustom: false },
  { name: 'xl', minWidth: 1280, maxWidth: 1535, label: 'XL', color: '#ec4899', isCustom: false },
  { name: '2xl', minWidth: 1536, maxWidth: null, label: '2XL', color: '#f43f5e', isCustom: false },
];

// Common device widths for quick jumping
export const COMMON_DEVICE_WIDTHS = [
  { name: 'iPhone SE', width: 375 },
  { name: 'iPhone 14', width: 390 },
  { name: 'iPhone 14 Pro Max', width: 430 },
  { name: 'iPad Mini', width: 744 },
  { name: 'iPad', width: 820 },
  { name: 'iPad Pro 12.9', width: 1024 },
  { name: 'MacBook Air', width: 1280 },
  { name: 'MacBook Pro 14', width: 1512 },
  { name: 'Desktop HD', width: 1920 },
  { name: 'Desktop 2K', width: 2560 },
];

/**
 * Parse min-width value from a media query
 */
function parseMinWidth(query: string): number | null {
  const match = query.match(/min-width\s*:\s*(\d+(?:\.\d+)?)\s*(px|em|rem)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() || 'px';

  switch (unit) {
    case 'em':
    case 'rem':
      return Math.round(value * 16); // Assume 16px base
    default:
      return Math.round(value);
  }
}

/**
 * Parse max-width value from a media query
 */
function parseMaxWidth(query: string): number | null {
  const match = query.match(/max-width\s*:\s*(\d+(?:\.\d+)?)\s*(px|em|rem)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() || 'px';

  switch (unit) {
    case 'em':
    case 'rem':
      return Math.round(value * 16);
    default:
      return Math.round(value);
  }
}

/**
 * Parse media queries from CSS content
 */
export function parseMediaQueries(cssContent: string, source: string = 'unknown'): MediaQueryMatch[] {
  const queries: MediaQueryMatch[] = [];

  // Match @media rules with screen and width conditions
  const mediaRegex = /@media\s*([^{]+)\s*\{/gi;
  let match;

  while ((match = mediaRegex.exec(cssContent)) !== null) {
    const queryString = match[1].trim();

    // Only process screen media queries with width conditions
    if (queryString.includes('width')) {
      const minWidth = parseMinWidth(queryString);
      const maxWidth = parseMaxWidth(queryString);

      // Only include if we found at least one width condition
      if (minWidth !== null || maxWidth !== null) {
        queries.push({
          query: queryString,
          minWidth,
          maxWidth,
          source,
        });
      }
    }
  }

  return queries;
}

/**
 * Extract unique breakpoint widths from media queries
 */
export function extractBreakpointWidths(queries: MediaQueryMatch[]): number[] {
  const widths = new Set<number>();

  queries.forEach((query) => {
    if (query.minWidth !== null) {
      widths.add(query.minWidth);
    }
    if (query.maxWidth !== null) {
      widths.add(query.maxWidth);
      // Also add the next pixel for max-width breakpoints
      widths.add(query.maxWidth + 1);
    }
  });

  return Array.from(widths).sort((a, b) => a - b);
}

/**
 * Convert detected media queries to breakpoints
 */
export function queriesToBreakpoints(queries: MediaQueryMatch[]): Breakpoint[] {
  const widths = extractBreakpointWidths(queries);
  const breakpoints: Breakpoint[] = [];
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#14b8a6', '#22c55e'];

  // Create breakpoints from detected widths
  for (let i = 0; i < widths.length; i++) {
    const minWidth = widths[i];
    const maxWidth = widths[i + 1] ? widths[i + 1] - 1 : null;

    breakpoints.push({
      name: `bp-${minWidth}`,
      minWidth,
      maxWidth,
      label: `${minWidth}px`,
      color: colors[i % colors.length],
      isCustom: false,
    });
  }

  // Add 0-first breakpoint if not present
  if (breakpoints.length > 0 && breakpoints[0].minWidth !== 0) {
    breakpoints.unshift({
      name: 'bp-0',
      minWidth: 0,
      maxWidth: breakpoints[0].minWidth - 1,
      label: '0px',
      color: '#64748b',
      isCustom: false,
    });
  }

  return breakpoints;
}

/**
 * Get the active breakpoint for a given width
 */
export function getActiveBreakpoint(width: number, breakpoints: Breakpoint[]): Breakpoint | null {
  for (const bp of breakpoints) {
    const minOk = bp.minWidth === null || width >= bp.minWidth;
    const maxOk = bp.maxWidth === null || width <= bp.maxWidth;

    if (minOk && maxOk) {
      return bp;
    }
  }

  return null;
}

/**
 * Find the next breakpoint boundary from current width
 */
export function getNextBreakpoint(width: number, breakpoints: Breakpoint[]): Breakpoint | null {
  // Sort by minWidth
  const sorted = [...breakpoints].sort((a, b) => (a.minWidth || 0) - (b.minWidth || 0));

  for (const bp of sorted) {
    if (bp.minWidth !== null && bp.minWidth > width) {
      return bp;
    }
  }

  return null;
}

/**
 * Find the previous breakpoint boundary from current width
 */
export function getPreviousBreakpoint(width: number, breakpoints: Breakpoint[]): Breakpoint | null {
  // Sort by minWidth descending
  const sorted = [...breakpoints].sort((a, b) => (b.minWidth || 0) - (a.minWidth || 0));

  for (const bp of sorted) {
    if (bp.minWidth !== null && bp.minWidth < width) {
      return bp;
    }
  }

  return null;
}

/**
 * Merge custom breakpoints with detected ones
 */
export function mergeBreakpoints(
  detected: Breakpoint[],
  custom: Breakpoint[]
): Breakpoint[] {
  const merged = [...detected];

  // Add custom breakpoints that don't overlap
  for (const customBp of custom) {
    const exists = merged.some(
      (bp) =>
        bp.minWidth === customBp.minWidth ||
        (bp.name === customBp.name && !customBp.isCustom)
    );

    if (!exists) {
      merged.push({ ...customBp, isCustom: true });
    }
  }

  // Sort by minWidth
  return merged.sort((a, b) => (a.minWidth || 0) - (b.minWidth || 0));
}

/**
 * Create a custom breakpoint
 */
export function createCustomBreakpoint(
  name: string,
  minWidth: number,
  maxWidth: number | null = null
): Breakpoint {
  return {
    name,
    minWidth,
    maxWidth,
    label: name,
    color: '#14b8a6', // Teal for custom
    isCustom: true,
  };
}

/**
 * Generate ruler marks for a given range
 */
export function generateRulerMarks(
  minWidth: number,
  maxWidth: number,
  majorInterval: number = 100,
  minorInterval: number = 10
): Array<{ position: number; isMajor: boolean; label?: string }> {
  const marks: Array<{ position: number; isMajor: boolean; label?: string }> = [];

  for (let pos = minWidth; pos <= maxWidth; pos += minorInterval) {
    const isMajor = pos % majorInterval === 0;
    marks.push({
      position: pos,
      isMajor,
      label: isMajor ? `${pos}` : undefined,
    });
  }

  return marks;
}
