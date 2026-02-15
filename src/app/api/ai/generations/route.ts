import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { withObservability } from '@/lib/observability/middleware'
import { withRateLimit } from '@/lib/api-helpers/rateLimiter'

interface DeleteResult {
  id: string
  error: string
}

/**
 * DELETE /api/ai/generations
 * Delete multiple Leonardo generations by ID (batch delete)
 * 
 * Request body:
 * {
 *   generationIds: string[]
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   deleted: string[]
 *   failed: { id: string, error: string }[]
 * }
 * 
 * Requirements: FR-1.2
 */
async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json()
    const { generationIds } = body

    // Validate input
    if (!generationIds || !Array.isArray(generationIds)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'generationIds array is required',
          deleted: [],
          failed: [],
        },
        { status: 400 }
      )
    }

    // Filter out invalid IDs
    const validIds = generationIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0
    )

    if (validIds.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: [],
        failed: [],
        message: 'No valid generation IDs provided',
      })
    }

    // Get Leonardo API key from environment
    const leonardoApiKey = process.env.LEONARDO_API_KEY
    if (!leonardoApiKey) {
      logger.error('LEONARDO_API_KEY is not configured', {
        requestedIds: validIds.length,
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leonardo API is not configured',
          deleted: [],
          failed: validIds.map(id => ({ id, error: 'API not configured' })),
        },
        { status: 503 }
      )
    }

    const deleted: string[] = []
    const failed: DeleteResult[] = []

    // Delete each generation
    // Using Promise.allSettled to handle partial failures gracefully
    const deletePromises = validIds.map(async (generationId) => {
      try {
        const response = await fetch(
          `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${leonardoApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok || response.status === 404) {
          // 404 means already deleted, treat as success for idempotency
          return { id: generationId, success: true }
        }

        const errorData = await response.json().catch(() => ({}))
        return { 
          id: generationId, 
          success: false, 
          error: errorData.error || `HTTP ${response.status}`,
        }
      } catch (error) {
        return { 
          id: generationId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    const results = await Promise.allSettled(deletePromises)

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { id, success, error } = result.value
        if (success) {
          deleted.push(id)
        } else {
          failed.push({ id, error: error || 'Unknown error' })
        }
      } else {
        // Promise rejected (shouldn't happen with our try/catch, but handle it)
        logger.error('Unexpected promise rejection in batch delete', {
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        })
      }
    })

    // Log failures for monitoring (NFR-2)
    if (failed.length > 0) {
      logger.error('Batch delete partial failures', {
        failedCount: failed.length,
        failedIds: failed.map(f => f.id),
        errors: failed.map(f => ({ id: f.id, error: f.error })),
      })
    }

    // Log successful deletions at debug level
    if (deleted.length > 0) {
      logger.debug('Batch delete completed', {
        deletedCount: deleted.length,
        failedCount: failed.length,
      })
    }

    return NextResponse.json({
      success: failed.length === 0,
      deleted,
      failed,
    })

  } catch (error) {
    // Log unexpected errors with details (NFR-2)
    logger.error('Unexpected error in batch delete API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process batch delete',
        deleted: [],
        failed: [],
      },
      { status: 500 }
    )
  }
}

export const DELETE = withObservability(withRateLimit(handleDelete, '/api/ai/generations', 'expensive'), '/api/ai/generations')
