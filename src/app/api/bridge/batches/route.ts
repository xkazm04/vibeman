/**
 * Bridge API - Batches
 * GET: List all batches with status
 * POST: Create a new batch
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { BridgeBatch, BridgeBatchStatus } from '@/lib/bridge/types';

// Note: We can't directly access Zustand stores from API routes
// Instead, we'll provide endpoints that the client can use to manage batches
// The actual batch state is managed client-side via the TaskRunner store

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    // Return batch configuration information
    // Actual batch state is managed client-side
    const batches: BridgeBatch[] = [
      { id: 'batch1', name: 'Batch A', status: 'idle', taskCount: 0, completedCount: 0, failedCount: 0 },
      { id: 'batch2', name: 'Batch B', status: 'idle', taskCount: 0, completedCount: 0, failedCount: 0 },
      { id: 'batch3', name: 'Batch C', status: 'idle', taskCount: 0, completedCount: 0, failedCount: 0 },
      { id: 'batch4', name: 'Batch D', status: 'idle', taskCount: 0, completedCount: 0, failedCount: 0 },
    ];

    return bridgeSuccessResponse({
      batches,
      message: 'Batch state is managed client-side. Use SSE stream for real-time updates.',
    });
  } catch (error) {
    console.error('[Bridge/Batches] GET error:', error);
    return bridgeErrorResponse('Failed to fetch batches', 500);
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { batchId, name, taskIds } = body;

    if (!batchId) {
      return bridgeErrorResponse('batchId is required (batch1, batch2, batch3, or batch4)', 400);
    }

    if (!['batch1', 'batch2', 'batch3', 'batch4'].includes(batchId)) {
      return bridgeErrorResponse('Invalid batchId. Must be: batch1, batch2, batch3, or batch4', 400);
    }

    if (!taskIds || !Array.isArray(taskIds)) {
      return bridgeErrorResponse('taskIds array is required', 400);
    }

    // Return instruction for client-side batch creation
    return bridgeSuccessResponse({
      success: true,
      instruction: 'createBatch',
      params: {
        batchId,
        name: name || `Batch ${batchId.replace('batch', '')}`,
        taskIds,
      },
      message: 'Use TaskRunner store createBatch action to create the batch',
    });
  } catch (error) {
    console.error('[Bridge/Batches] POST error:', error);
    return bridgeErrorResponse('Failed to create batch', 500);
  }
}
