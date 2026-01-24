/**
 * Screenshot API Helper
 *
 * This module handles automatic screenshot capture for contexts after requirement completion.
 * It uses a **fire-and-forget pattern** - screenshot requests are triggered but never awaited.
 *
 * ## Why Fire-and-Forget?
 *
 * During batch execution of requirements, waiting for screenshots would:
 * 1. **Block the execution queue** - Each screenshot takes 5-30 seconds (Playwright startup, navigation, capture)
 * 2. **Cascade delays** - 10 requirements x 15 seconds = 2.5 minutes of unnecessary waiting
 * 3. **Risk timeouts** - Long-running screenshot operations could cause request timeouts
 *
 * Screenshots are **non-critical** - if they fail, the implementation is still complete.
 * The user can manually capture screenshots later via the Context Preview UI.
 *
 * ## Error Handling Philosophy
 *
 * **Errors are intentionally suppressed** because:
 * - Screenshot failures don't affect implementation success
 * - Logging errors would clutter the console during batch operations
 * - The batch execution must continue regardless of screenshot status
 *
 * ## Debugging Screenshot Failures
 *
 * Since errors are suppressed, debugging can be challenging. This module provides:
 * - `logScreenshotDebug()` - Logs failures to localStorage for later inspection
 * - `getScreenshotDebugLogs()` - Retrieves debug logs for troubleshooting
 * - `clearScreenshotDebugLogs()` - Clears the debug log storage
 *
 * To debug screenshot issues:
 * 1. Open browser DevTools console
 * 2. Run: `JSON.parse(localStorage.getItem('screenshot_debug_logs') || '[]')`
 * 3. Review the failure entries with timestamps and error messages
 *
 * ## Common Failure Modes
 *
 * | Symptom | Likely Cause | Solution |
 * |---------|--------------|----------|
 * | No screenshots appear | Dev server not running | Start `npm run dev` before batch execution |
 * | "Network error" in logs | API endpoint unreachable | Check if localhost:3000 is accessible |
 * | "No test scenario" | Context has no test scenario | Add test scenario in Context Preview |
 * | "Playwright error" | Browser automation failed | Check Playwright installation, try `npx playwright install` |
 * | "Timeout" | Page took too long to load | Optimize dev server startup or page load time |
 *
 * @module screenshotApi
 */

/** Maximum number of debug log entries to keep in localStorage */
const MAX_DEBUG_LOG_ENTRIES = 50;

/** localStorage key for screenshot debug logs */
const DEBUG_LOG_KEY = 'screenshot_debug_logs';

/**
 * Debug log entry structure for screenshot operations
 */
interface ScreenshotDebugLogEntry {
  /** ISO timestamp of the event */
  timestamp: string;
  /** Context ID that was being captured */
  contextId: string;
  /** 'success' | 'error' | 'started' */
  status: 'success' | 'error' | 'started';
  /** Error message if status is 'error', otherwise undefined */
  error?: string;
  /** HTTP status code if available */
  httpStatus?: number;
}

/**
 * Logs screenshot operation events to localStorage for debugging.
 *
 * Since screenshot errors are intentionally suppressed (fire-and-forget pattern),
 * this function provides a way to capture and review failures without blocking execution.
 *
 * Logs are stored in localStorage under the key 'screenshot_debug_logs' as a JSON array.
 * Old entries are automatically pruned to keep only the most recent 50 entries.
 *
 * @param entry - The debug log entry to store
 *
 * @example
 * // Log a failure
 * logScreenshotDebug({
 *   timestamp: new Date().toISOString(),
 *   contextId: 'ctx_123',
 *   status: 'error',
 *   error: 'Network request failed'
 * });
 *
 * // Later, retrieve logs in DevTools console:
 * // JSON.parse(localStorage.getItem('screenshot_debug_logs') || '[]')
 */
function logScreenshotDebug(entry: ScreenshotDebugLogEntry): void {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    const existingLogs: ScreenshotDebugLogEntry[] = JSON.parse(
      localStorage.getItem(DEBUG_LOG_KEY) || '[]'
    );

    // Add new entry
    existingLogs.push(entry);

    // Prune old entries to prevent localStorage from growing unbounded
    const prunedLogs = existingLogs.slice(-MAX_DEBUG_LOG_ENTRIES);

    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(prunedLogs));
  } catch {
    // Silently fail if localStorage is unavailable or quota exceeded
    // This is a debug feature, so we don't want it to cause issues
  }
}

/**
 * Retrieves all screenshot debug logs from localStorage.
 *
 * Use this function in the browser DevTools console to inspect screenshot failures:
 * ```js
 * // In DevTools console:
 * import { getScreenshotDebugLogs } from './screenshotApi';
 * console.table(getScreenshotDebugLogs());
 * ```
 *
 * Or directly via localStorage:
 * ```js
 * JSON.parse(localStorage.getItem('screenshot_debug_logs') || '[]')
 * ```
 *
 * @returns Array of debug log entries, newest last
 */
export function getScreenshotDebugLogs(): ScreenshotDebugLogEntry[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    return JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Clears all screenshot debug logs from localStorage.
 *
 * Call this after reviewing logs or when starting a fresh debugging session.
 *
 * @example
 * // Clear logs before starting a new batch execution
 * clearScreenshotDebugLogs();
 */
export function clearScreenshotDebugLogs(): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(DEBUG_LOG_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Triggers screenshot capture for a context using the fire-and-forget pattern.
 *
 * ## Fire-and-Forget Behavior
 *
 * This function initiates a screenshot request but **does not wait for it to complete**.
 * The function returns immediately after starting the HTTP request, allowing the
 * calling code (typically batch execution) to continue without delay.
 *
 * ## Why Errors Are Ignored
 *
 * **This is intentional design, not an oversight.** During batch requirement execution:
 * - Each screenshot capture takes 5-30 seconds (Playwright startup, page load, capture)
 * - Waiting would cause unacceptable delays in batch processing
 * - Screenshot failures don't invalidate the implementation work
 * - Users can manually capture screenshots later via the Context Preview UI
 *
 * ## Debugging Failed Screenshots
 *
 * Since errors are suppressed, use the debug logging mechanism:
 *
 * ```js
 * // In browser DevTools console:
 * JSON.parse(localStorage.getItem('screenshot_debug_logs') || '[]')
 * ```
 *
 * The logs capture:
 * - Timestamp of each attempt
 * - Context ID being captured
 * - Success/error status
 * - Error messages (if failed)
 * - HTTP status codes
 *
 * ## Prerequisites for Successful Screenshots
 *
 * 1. **Dev server must be running** - Screenshots navigate to localhost:3000
 * 2. **Context must have a test scenario** - Provides the URL/route to capture
 * 3. **Playwright must be installed** - Run `npx playwright install` if missing
 * 4. **No port conflicts** - Port 3000 must be available
 *
 * @param contextId - The context ID to capture a screenshot for. Must correspond
 *                    to a context that has a test scenario defined.
 * @returns void - Returns immediately; screenshot capture happens asynchronously
 *
 * @example
 * // Typical usage in batch execution
 * if (taskStatus.status === 'completed') {
 *   const contextId = await getContextIdFromRequirement(requirementName);
 *   if (contextId) {
 *     triggerScreenshotCapture(contextId); // Non-blocking, returns immediately
 *   }
 *   // Execution continues immediately, not waiting for screenshot
 * }
 *
 * @see {@link getScreenshotDebugLogs} - To retrieve debug logs
 * @see {@link clearScreenshotDebugLogs} - To clear debug logs
 * @see {@link getContextIdFromRequirement} - To look up context ID from requirement name
 */
export function triggerScreenshotCapture(contextId: string): void {
  // Log the start of the screenshot attempt for debugging
  logScreenshotDebug({
    timestamp: new Date().toISOString(),
    contextId,
    status: 'started',
  });

  // Fire-and-forget: Start the request but don't wait for it
  // This is intentional - we don't want to block batch execution
  fetch('/api/tester/screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextId }),
  })
    .then((response) => {
      // Log success or HTTP error status for debugging
      logScreenshotDebug({
        timestamp: new Date().toISOString(),
        contextId,
        status: response.ok ? 'success' : 'error',
        httpStatus: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      });
    })
    .catch((error: Error) => {
      // Log network/fetch errors for debugging
      // These errors are INTENTIONALLY not re-thrown or displayed
      // See module-level documentation for rationale
      logScreenshotDebug({
        timestamp: new Date().toISOString(),
        contextId,
        status: 'error',
        error: error.message || 'Unknown fetch error',
      });
    });

  // Return immediately - the promise is intentionally not awaited
  // This allows batch execution to continue without waiting for screenshots
}

/**
 * Retrieves the context ID associated with a requirement by querying the ideas table.
 *
 * This function is used to link completed requirements back to their source context,
 * enabling automatic screenshot capture of the relevant UI area after implementation.
 *
 * ## How It Works
 *
 * 1. Queries `/api/ideas/by-requirements` batch API with a 1-element array
 * 2. The API looks up the idea that generated this requirement
 * 3. Returns the `context_id` from the idea record (if found)
 *
 * ## Error Handling
 *
 * Returns `null` silently for any error condition:
 * - API returns non-200 status
 * - Idea not found in database
 * - Idea exists but has no context_id
 * - Network error
 *
 * This is intentional - missing context IDs should not block execution.
 * Screenshots are optional enhancement, not a critical requirement.
 *
 * @param requirementName - The requirement file name (without .md extension)
 * @returns The context ID if found, null otherwise
 *
 * @example
 * // Look up context for a completed requirement
 * const contextId = await getContextIdFromRequirement('implement-dark-mode');
 * if (contextId) {
 *   triggerScreenshotCapture(contextId);
 * }
 * // If null, no screenshot is attempted - this is expected behavior
 *
 * @see {@link triggerScreenshotCapture} - Uses this to determine which context to screenshot
 */
export async function getContextIdFromRequirement(requirementName: string): Promise<string | null> {
  try {
    const response = await fetch('/api/ideas/by-requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementIds: [requirementName] }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const idea = data.ideas?.[requirementName];

    if (idea?.context_id) {
      return idea.context_id;
    }

    return null;
  } catch {
    // Network errors are silently ignored - context lookup is non-critical
    return null;
  }
}
