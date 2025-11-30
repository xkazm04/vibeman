import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/ai/generations/[generationId]
 * Delete a single Leonardo generation by ID
 * 
 * Requirements: FR-1.1
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const { generationId } = await params

    if (!generationId || typeof generationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    // Get Leonardo API key from environment
    const leonardoApiKey = process.env.LEONARDO_API_KEY
    if (!leonardoApiKey) {
      console.error('LEONARDO_API_KEY is not configured')
      return NextResponse.json(
        { success: false, error: 'Leonardo API is not configured' },
        { status: 503 }
      )
    }

    // Call Leonardo API to delete the generation
    // https://docs.leonardo.ai/reference/deletegenerationbyid
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Leonardo API delete error:', {
        generationId,
        status: response.status,
        error: errorData,
      })

      // Return success for 404 (already deleted) to make operation idempotent
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          message: 'Generation already deleted or not found',
        })
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || 'Failed to delete generation',
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Generation deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting generation:', error)

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete generation',
      },
      { status: 500 }
    )
  }
}
