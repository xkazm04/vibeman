/**
 * Implementation Accept Tool
 *
 * Reusable tool for accepting/marking implementations as tested.
 * Can be used in Manager, Annette, or any other feature that manages implementation logs.
 *
 * Usage:
 * ```typescript
 * import { acceptImplementation } from '@/lib/tools/implementation-accept';
 *
 * const result = await acceptImplementation('log-id-123');
 * if (result.success) {
 *   console.log('Implementation accepted!');
 * }
 * ```
 */

/**
 * Result of accepting an implementation
 */
export interface AcceptImplementationResult {
  success: boolean;
  error?: string;
}

/**
 * Accept an implementation by marking it as tested
 *
 * This updates the implementation log to mark it as tested/accepted,
 * effectively removing it from the "needs review" queue.
 *
 * @param implementationLogId - ID of the implementation log to accept
 * @returns Result with success status
 */
export async function acceptImplementation(
  implementationLogId: string
): Promise<AcceptImplementationResult> {
  try {
    console.log('[ImplementationAccept] Accepting implementation:', implementationLogId);

    if (!implementationLogId) {
      throw new Error('Implementation log ID is required');
    }

    // Mark as tested via API
    const response = await fetch(`/api/implementation-logs/${implementationLogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tested: true }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to accept implementation');
    }

    console.log('[ImplementationAccept] Successfully accepted implementation');

    return { success: true };
  } catch (error) {
    console.error('[ImplementationAccept] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch accept multiple implementations
 *
 * Useful for accepting multiple implementations at once.
 *
 * @param implementationLogIds - Array of implementation log IDs to accept
 * @returns Result with success status and any failed IDs
 */
export async function batchAcceptImplementations(
  implementationLogIds: string[]
): Promise<{
  success: boolean;
  acceptedCount: number;
  failedIds: string[];
  errors: Record<string, string>;
}> {
  console.log('[ImplementationAccept] Batch accepting', implementationLogIds.length, 'implementations');

  const results = await Promise.allSettled(
    implementationLogIds.map(id => acceptImplementation(id))
  );

  const failedIds: string[] = [];
  const errors: Record<string, string> = {};
  let acceptedCount = 0;

  results.forEach((result, index) => {
    const id = implementationLogIds[index];
    if (result.status === 'fulfilled' && result.value.success) {
      acceptedCount++;
    } else {
      failedIds.push(id);
      if (result.status === 'fulfilled') {
        errors[id] = result.value.error || 'Unknown error';
      } else {
        errors[id] = result.reason?.message || 'Promise rejected';
      }
    }
  });

  console.log('[ImplementationAccept] Batch complete:', acceptedCount, 'succeeded,', failedIds.length, 'failed');

  return {
    success: failedIds.length === 0,
    acceptedCount,
    failedIds,
    errors,
  };
}

/**
 * Reject an implementation (mark as needs revision)
 *
 * This is the opposite of accept - it marks an implementation as needing revision.
 * Can be extended to add rejection reasons, notes, etc.
 *
 * @param implementationLogId - ID of the implementation log to reject
 * @param reason - Optional reason for rejection
 * @returns Result with success status
 */
export async function rejectImplementation(
  implementationLogId: string,
  reason?: string
): Promise<AcceptImplementationResult> {
  try {
    console.log('[ImplementationAccept] Rejecting implementation:', implementationLogId);

    if (!implementationLogId) {
      throw new Error('Implementation log ID is required');
    }

    // Mark as needs revision via API
    // Note: This assumes the API supports a 'needs_revision' or similar field
    // Adjust based on actual API implementation
    const response = await fetch(`/api/implementation-logs/${implementationLogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tested: false,
        needs_revision: true,
        rejection_reason: reason,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to reject implementation');
    }

    console.log('[ImplementationAccept] Successfully rejected implementation');

    return { success: true };
  } catch (error) {
    console.error('[ImplementationAccept] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
