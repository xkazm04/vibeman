/**
 * Declarative filter algebra for Tinder dimensions.
 *
 * Encodes filter interaction rules (XOR exclusivity, independence) in a
 * FilterSpec so they are visible, testable, and extensible without touching
 * hook internals.
 */

// ---------------------------------------------------------------------------
// Spec types
// ---------------------------------------------------------------------------

/** A single filter dimension in the spec. */
export interface FilterDimensionSpec {
  /** Unique name identifying this dimension (e.g. 'category', 'scanType'). */
  name: string;
  /**
   * Names of dimensions that are mutually exclusive with this one.
   * When this dimension is activated, exclusive dimensions are cleared.
   */
  exclusive?: string[];
}

/** Declares all filter dimensions and their interaction rules. */
export interface FilterSpec {
  dimensions: FilterDimensionSpec[];
}

/** Map of dimension name → current selected value (null = not set). */
export type FilterState = Record<string, string | null>;

// ---------------------------------------------------------------------------
// The Tinder filter spec — single source of truth for filter rules
// ---------------------------------------------------------------------------

export const TINDER_FILTER_SPEC: FilterSpec = {
  dimensions: [
    { name: 'category', exclusive: ['scanType'] },
    { name: 'scanType', exclusive: ['category'] },
    { name: 'context' },
  ],
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * When a dimension is activated (selected as the active filter group),
 * return the names of all dimensions that should be cleared.
 *
 * For the Tinder spec: activating 'category' clears 'scanType' and vice versa.
 * Activating 'context' clears nothing (it's independent).
 */
export function getDimensionsToClear(
  spec: FilterSpec,
  activatedDimension: string,
): string[] {
  const dim = spec.dimensions.find(d => d.name === activatedDimension);
  if (!dim) return [];

  const toClear: string[] = [];

  // Clear all exclusive dimensions
  if (dim.exclusive) {
    toClear.push(...dim.exclusive);
  }

  // Also clear self (switching dimension resets the current selection)
  toClear.push(activatedDimension);

  return toClear;
}

/**
 * Given the current active dimension selector and filter state, resolve
 * which filters are actually active. Dimensions that are exclusive with
 * the active dimension are suppressed (returned as null).
 *
 * This replaces the manual `activeScanType = filterDimension === 'scan_type' ? ... : null`
 * pattern scattered across hooks.
 */
export function resolveActiveFilters(
  spec: FilterSpec,
  activeDimension: string,
  state: FilterState,
): FilterState {
  const activeDim = spec.dimensions.find(d => d.name === activeDimension);
  if (!activeDim) return { ...state };

  // Collect all dimensions that are suppressed by the active one
  const suppressed = new Set<string>();
  for (const dim of spec.dimensions) {
    if (dim.name === activeDimension) continue;
    // If this dim is exclusive with the active one, suppress it
    if (activeDim.exclusive?.includes(dim.name)) {
      suppressed.add(dim.name);
    }
  }

  const result: FilterState = {};
  for (const dim of spec.dimensions) {
    result[dim.name] = suppressed.has(dim.name) ? null : (state[dim.name] ?? null);
  }
  return result;
}

/**
 * Apply state transitions when a dimension is activated. Returns a new state
 * with cleared dimensions as specified by the spec's exclusivity rules.
 *
 * This replaces the manual `setSelectedCategory(null); setSelectedScanType(null);`
 * in handleSetFilterDimension.
 */
export function applyDimensionSwitch(
  spec: FilterSpec,
  state: FilterState,
  activatedDimension: string,
): FilterState {
  const toClear = getDimensionsToClear(spec, activatedDimension);
  const result = { ...state };
  for (const name of toClear) {
    result[name] = null;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Server-side filter application
// ---------------------------------------------------------------------------

/** A typed filter predicate with the dimension it applies to. */
export interface FilterPredicate<T> {
  dimension: string;
  apply: (item: T) => boolean;
}

/**
 * Build an array of active filter predicates from the spec + state + matchers.
 * Only predicates for dimensions with non-null active values are included.
 */
export function buildActivePredicates<T>(
  spec: FilterSpec,
  activeDimension: string,
  state: FilterState,
  matchers: Record<string, (value: string, item: T) => boolean>,
): FilterPredicate<T>[] {
  const active = resolveActiveFilters(spec, activeDimension, state);
  const predicates: FilterPredicate<T>[] = [];

  for (const dim of spec.dimensions) {
    const value = active[dim.name];
    const matcher = matchers[dim.name];
    if (value != null && matcher) {
      predicates.push({
        dimension: dim.name,
        apply: (item: T) => matcher(value, item),
      });
    }
  }

  return predicates;
}

/**
 * Apply all active filter predicates to an array of items.
 * All predicates are AND-combined (item must pass all).
 */
export function applyFilterPredicates<T>(
  items: T[],
  predicates: FilterPredicate<T>[],
): T[] {
  if (predicates.length === 0) return items;
  return items.filter(item => predicates.every(p => p.apply(item)));
}

// ---------------------------------------------------------------------------
// Query param builder (client-side)
// ---------------------------------------------------------------------------

/**
 * Append filter-related query params based on the active filters.
 * Only non-null active dimensions are appended.
 */
export function appendFilterParams(
  params: URLSearchParams,
  spec: FilterSpec,
  activeDimension: string,
  state: FilterState,
  /** Map dimension name → query param name (defaults to dimension name). */
  paramNames?: Record<string, string>,
): void {
  const active = resolveActiveFilters(spec, activeDimension, state);
  for (const dim of spec.dimensions) {
    const value = active[dim.name];
    if (value != null) {
      const paramName = paramNames?.[dim.name] ?? dim.name;
      params.append(paramName, value);
    }
  }
}
