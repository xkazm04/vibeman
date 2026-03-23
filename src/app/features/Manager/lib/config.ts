/**
 * Manager feature configuration constants.
 * Centralises tuneable thresholds, timeouts, and limits so they can be
 * adjusted without hunting through component files.
 */

/**
 * Minimum number of cross-context implementation log entries required before
 * a flow arrow is rendered on the DevelopmentFlowMap. Set to 1 to show all
 * observed flows; increase to reduce visual noise on busy maps.
 */
export const MIN_ARROW_THRESHOLD = 1;

/**
 * Success-rate boundary above which a flow arrow (or badge) is coloured green.
 * A rate strictly greater than this value is considered "healthy".
 */
export const SUCCESS_RATE_HIGH = 0.8;

/**
 * Success-rate boundary at or above which a flow arrow (or badge) is coloured
 * yellow (warning). Rates below this value are coloured red (critical).
 */
export const SUCCESS_RATE_LOW = 0.5;

/**
 * Maximum number of individual implementation-log entries fetched and rendered
 * inside the CrossContextDetail slide-out panel. Caps the number of sequential
 * API calls made when a user opens a high-volume flow pair.
 */
export const CROSS_CONTEXT_LOG_PAGE_SIZE = 20;
