/**
 * Parse and validate integer query parameters with bounds checking
 *
 * Prevents NaN propagation into SQL queries by validating and clamping
 * numeric parameters. Returns validated numbers or throws a descriptive
 * error for 400 responses.
 *
 * @param value - The query parameter value to parse (string | null)
 * @param options - Validation options
 * @returns Validated and clamped integer
 * @throws Error with descriptive message if validation fails
 *
 * @example
 * // Basic usage with default
 * const limit = parseQueryInt(searchParams.get('limit'), { default: 50, min: 1, max: 100 });
 *
 * @example
 * // Required parameter (no default)
 * const windowDays = parseQueryInt(searchParams.get('windowDays'), { min: 1, max: 365 });
 */
export function parseQueryInt(
  value: string | null,
  options: {
    min?: number;
    max?: number;
    default?: number;
    paramName?: string;
  } = {}
): number {
  const { min, max, default: defaultValue, paramName = 'parameter' } = options;

  // If null/undefined and default provided, use default
  if (value === null || value === undefined || value === '') {
    if (defaultValue !== undefined) {
      // Apply bounds to default value too
      return clampValue(defaultValue, min, max);
    }
    throw new Error(`${paramName} is required`);
  }

  // Parse to number
  const parsed = parseInt(value, 10);

  // Check for NaN
  if (isNaN(parsed)) {
    throw new Error(`${paramName} must be a valid integer, got: ${value}`);
  }

  // Apply bounds
  return clampValue(parsed, min, max);
}

/**
 * Clamp a value within min/max bounds
 */
function clampValue(value: number, min?: number, max?: number): number {
  let clamped = value;
  if (min !== undefined && clamped < min) {
    clamped = min;
  }
  if (max !== undefined && clamped > max) {
    clamped = max;
  }
  return clamped;
}
