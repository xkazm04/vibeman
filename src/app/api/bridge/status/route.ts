/**
 * Bridge API - Status
 * GET: Get bridge system status
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';
import { BridgeStatusResponse } from '@/lib/bridge/types';

const BRIDGE_VERSION = '1.0.0';

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const status: BridgeStatusResponse = {
      status: 'ok',
      version: BRIDGE_VERSION,
      connectedClients: bridgeEvents.getClientCount(),
      activeBatches: 0, // Note: Batch state is client-side, can't determine from server
      timestamp: new Date().toISOString(),
    };

    return bridgeSuccessResponse(status);
  } catch (error) {
    console.error('[Bridge/Status] GET error:', error);
    return bridgeErrorResponse('Failed to get status', 500);
  }
}
