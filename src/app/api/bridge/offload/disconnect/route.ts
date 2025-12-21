/**
 * Bridge API - Disconnect Pairing
 * POST: Disconnect a device pairing
 */

import { NextRequest } from 'next/server';
import {
  requireBridgeAuth,
  bridgeSuccessResponse,
  bridgeErrorResponse,
} from '@/lib/bridge/auth';
import { devicePairDb, offloadQueueDb } from '@/app/db';

interface DisconnectRequest {
  devicePairId: string;
}

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as DisconnectRequest;

    if (!body.devicePairId) {
      return bridgeErrorResponse('devicePairId is required', 400);
    }

    // Get the pair to verify it exists
    const pair = devicePairDb.getById(body.devicePairId);

    if (!pair) {
      return bridgeErrorResponse('Device pair not found', 404);
    }

    // Delete any pending/synced tasks in the queue
    const deletedTasks = offloadQueueDb.deleteByDevicePair(body.devicePairId);

    // Disconnect the pairing
    const disconnected = devicePairDb.disconnect(body.devicePairId);

    if (!disconnected) {
      return bridgeErrorResponse('Failed to disconnect', 500);
    }

    return bridgeSuccessResponse({
      success: true,
      message: `Disconnected from "${pair.partner_device_name || 'partner'}"`,
      deletedTasks,
    });
  } catch (error) {
    console.error('[Bridge/Offload/Disconnect] POST error:', error);
    return bridgeErrorResponse('Failed to disconnect', 500);
  }
}
