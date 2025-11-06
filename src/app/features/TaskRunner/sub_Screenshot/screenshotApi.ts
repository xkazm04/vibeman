/**
 * Screenshot API helper
 * Triggers screenshot capture for a context after requirement completion
 */

/**
 * Trigger screenshot capture for a context (fire-and-forget)
 * This function does not wait for the screenshot to complete
 *
 * @param contextId - The context ID to capture screenshot for
 * @returns void (fire-and-forget)
 */
export function triggerScreenshotCapture(contextId: string): void {
  // Fire-and-forget: Start the request but don't wait for it
  fetch('/api/tester/screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextId }),
  })
    .then(() => {
      // Screenshot triggered successfully
    })
    .catch(() => {
      // Screenshot request failed (non-blocking)
    });

  // Return immediately, don't wait for the response
}

/**
 * Get context ID from requirement name via idea lookup
 * Queries the ideas table to find the context_id associated with a requirement
 *
 * @param requirementName - The requirement file name
 * @returns Promise<string | null> - The context ID or null if not found
 */
export async function getContextIdFromRequirement(requirementName: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/ideas/by-requirement?requirementId=${encodeURIComponent(requirementName)}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.idea && data.idea.context_id) {
      return data.idea.context_id;
    }

    return null;
  } catch (error) {
    return null;
  }
}
