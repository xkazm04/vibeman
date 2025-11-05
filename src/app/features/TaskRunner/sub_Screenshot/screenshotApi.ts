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
    .then(response => {
      if (response.ok) {
        console.log(`[Screenshot] Successfully triggered screenshot for context: ${contextId}`);
      } else {
        console.warn(`[Screenshot] Screenshot request failed with status: ${response.status}`);
      }
    })
    .catch(error => {
      console.warn(`[Screenshot] Screenshot request error (non-blocking):`, error);
    });

  // Return immediately, don't wait for the response
  console.log(`[Screenshot] Screenshot capture initiated for context: ${contextId}`);
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
      console.log(`[Screenshot] No idea found for requirement: ${requirementName}`);
      return null;
    }

    const data = await response.json();

    if (data.idea && data.idea.context_id) {
      console.log(`[Screenshot] Found context_id for requirement ${requirementName}: ${data.idea.context_id}`);
      return data.idea.context_id;
    }

    console.log(`[Screenshot] Idea found but no context_id for requirement: ${requirementName}`);
    return null;
  } catch (error) {
    console.warn(`[Screenshot] Failed to get context_id for requirement ${requirementName}:`, error);
    return null;
  }
}
