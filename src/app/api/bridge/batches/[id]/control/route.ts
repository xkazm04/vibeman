/**
 * Bridge API - Batch Control
 * POST: Start, pause, stop, or resume a batch
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { BatchControlRequest } from '@/lib/bridge/types';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';

const VALID_BATCH_IDS = ['batch1', 'batch2', 'batch3', 'batch4'];
const VALID_ACTIONS = ['start', 'pause', 'stop', 'resume'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id: batchId } = await params;
    const body: BatchControlRequest = await request.json();
    const { action } = body;

    if (!VALID_BATCH_IDS.includes(batchId)) {
      return bridgeErrorResponse('Invalid batch ID. Must be: batch1, batch2, batch3, or batch4', 400);
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return bridgeErrorResponse('Invalid action. Must be: start, pause, stop, or resume', 400);
    }

    // Map action to store method
    let instruction: string;
    switch (action) {
      case 'start':
        instruction = 'startBatch';
        break;
      case 'pause':
        instruction = 'pauseBatch';
        break;
      case 'stop':
        instruction = 'deleteBatch';
        break;
      case 'resume':
        instruction = 'resumeBatch';
        break;
      default:
        return bridgeErrorResponse('Invalid action', 400);
    }

    // Emit batch progress event (will be picked up by SSE clients)
    bridgeEvents.emit('batch_progress', {
      batchId,
      action,
      timestamp: new Date().toISOString(),
    }, '*'); // Broadcast to all projects

    // Return instruction for client-side execution
    return bridgeSuccessResponse({
      success: true,
      instruction,
      params: { batchId },
      action,
      message: `Use TaskRunner store ${instruction} action to ${action} the batch`,
    });
  } catch (error) {
    console.error('[Bridge/Batches] Control error:', error);
    return bridgeErrorResponse('Failed to control batch', 500);
  }
}
