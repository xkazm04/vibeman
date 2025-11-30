/**
 * Sketch Cleanup Utility Service
 * 
 * Provides non-blocking deletion of Leonardo AI generations.
 * Used to clean up sketch images after final image generation,
 * when starting over, or when selecting a specific sketch.
 * 
 * Requirements: FR-2.1, FR-2.2, FR-2.3, NFR-1
 */

import { logger } from '../logger'

/**
 * Response structure from the batch delete API
 */
interface BatchDeleteResponse {
  success: boolean
  deleted: string[]
  failed: { id: string; error: string }[]
  error?: string
}

/**
 * Delete multiple Leonardo generations by ID.
 * 
 * This function is non-blocking (fire-and-forget) - it will not throw errors
 * or block the calling code. All errors are logged for monitoring.
 * 
 * @param generationIds - Array of Leonardo generation IDs to delete
 * @returns void - Function returns immediately, deletion happens in background
 * 
 * Requirements:
 * - FR-2.1: Track generationIds during sketch generation for later cleanup
 * - FR-2.2: Clear local sketch state and trigger API deletion
 * - FR-2.3: Delete unused sketches when user selects one
 * - NFR-1: Sketch deletion should be non-blocking (fire-and-forget with error logging)
 */
export function deleteGenerations(generationIds: string[]): void {
  // Handle empty array gracefully - no API call needed
  if (!generationIds || generationIds.length === 0) {
    logger.debug('deleteGenerations called with empty array, skipping')
    return
  }

  // Filter out any invalid IDs (empty strings, null, undefined)
  const validIds = generationIds.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  )

  if (validIds.length === 0) {
    logger.debug('deleteGenerations: no valid IDs after filtering, skipping')
    return
  }

  logger.info('Initiating sketch cleanup', { 
    count: validIds.length,
    generationIds: validIds,
  })

  // Fire-and-forget: don't await, just log results
  performDeletion(validIds).catch((error) => {
    // This catch handles any unexpected errors in the async function itself
    logger.error('Unexpected error in sketch cleanup', {
      error: error instanceof Error ? error.message : String(error),
      generationIds: validIds,
    })
  })
}

/**
 * Internal async function that performs the actual deletion.
 * Separated to allow fire-and-forget pattern in deleteGenerations.
 */
async function performDeletion(generationIds: string[]): Promise<void> {
  try {
    const response = await fetch('/api/ai/generations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationIds }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      logger.error('Sketch cleanup API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        generationIds,
      })
      return
    }

    const result: BatchDeleteResponse = await response.json()

    // Log successful deletions at debug level
    if (result.deleted.length > 0) {
      logger.debug('Sketches deleted successfully', {
        count: result.deleted.length,
        deleted: result.deleted,
      })
    }

    // Log failures at error level for monitoring
    if (result.failed.length > 0) {
      logger.error('Some sketch deletions failed', {
        timestamp: new Date().toISOString(),
        failedCount: result.failed.length,
        failed: result.failed,
      })
    }

    // Log overall result
    if (result.success) {
      logger.info('Sketch cleanup completed successfully', {
        deletedCount: result.deleted.length,
      })
    } else {
      logger.warn('Sketch cleanup completed with failures', {
        deletedCount: result.deleted.length,
        failedCount: result.failed.length,
      })
    }
  } catch (error) {
    // Network errors, JSON parse errors, etc.
    logger.error('Sketch cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
      generationIds,
    })
  }
}

/**
 * Delete a single Leonardo generation by ID.
 * Convenience wrapper around deleteGenerations for single ID deletion.
 * 
 * @param generationId - Single Leonardo generation ID to delete
 */
export function deleteGeneration(generationId: string): void {
  if (!generationId || generationId.trim().length === 0) {
    logger.debug('deleteGeneration called with empty ID, skipping')
    return
  }
  
  deleteGenerations([generationId])
}
