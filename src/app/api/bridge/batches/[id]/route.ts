/**
 * Bridge API - Batch by ID
 * GET: Get batch details
 * DELETE: Delete a batch
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';

const VALID_BATCH_IDS = ['batch1', 'batch2', 'batch3', 'batch4'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    if (!VALID_BATCH_IDS.includes(id)) {
      return bridgeErrorResponse('Invalid batch ID. Must be: batch1, batch2, batch3, or batch4', 400);
    }

    // Return batch placeholder - actual state is client-side
    return bridgeSuccessResponse({
      batch: {
        id,
        name: `Batch ${id.replace('batch', '')}`,
        status: 'idle',
        taskCount: 0,
        completedCount: 0,
        failedCount: 0,
      },
      message: 'Batch state is managed client-side. Connect to SSE stream for real-time updates.',
    });
  } catch (error) {
    console.error('[Bridge/Batches] GET by ID error:', error);
    return bridgeErrorResponse('Failed to fetch batch', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    if (!VALID_BATCH_IDS.includes(id)) {
      return bridgeErrorResponse('Invalid batch ID', 400);
    }

    // Return instruction for client-side batch deletion
    return bridgeSuccessResponse({
      success: true,
      instruction: 'deleteBatch',
      params: { batchId: id },
      message: 'Use TaskRunner store deleteBatch action to delete the batch',
    });
  } catch (error) {
    console.error('[Bridge/Batches] DELETE error:', error);
    return bridgeErrorResponse('Failed to delete batch', 500);
  }
}
