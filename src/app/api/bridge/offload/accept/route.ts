/**
 * Bridge API - Accept Pairing
 * POST: Accept a pairing request using a code (called by passive device on active device's URL)
 */

import { NextRequest } from 'next/server';
import {
  requireBridgeAuth,
  bridgeSuccessResponse,
  bridgeErrorResponse,
} from '@/lib/bridge/auth';
import { devicePairDb } from '@/app/db';
import { AcceptPairingRequest, AcceptPairingResponse } from '@/app/db/models/offload.types';

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as AcceptPairingRequest;

    if (!body.pairingCode) {
      return bridgeErrorResponse('pairingCode is required', 400);
    }
    if (!body.deviceName) {
      return bridgeErrorResponse('deviceName is required', 400);
    }
    if (!body.callbackUrl) {
      return bridgeErrorResponse('callbackUrl is required', 400);
    }

    // Clean up expired pairs first
    devicePairDb.cleanupExpired();

    // Find the pending pair with this code
    const pair = devicePairDb.getByPairingCode(body.pairingCode);

    if (!pair) {
      return bridgeErrorResponse('Invalid or expired pairing code', 404);
    }

    // Update the pair to paired status
    const updatedPair = devicePairDb.pair(
      pair.id,
      body.callbackUrl,
      body.deviceName
    );

    if (!updatedPair) {
      return bridgeErrorResponse('Failed to complete pairing', 500);
    }

    const response: AcceptPairingResponse = {
      success: true,
      devicePairId: updatedPair.id,
      projectId: updatedPair.project_id,
      partnerDeviceName: updatedPair.device_name, // The active device's name
    };

    return bridgeSuccessResponse(response);
  } catch (error) {
    console.error('[Bridge/Offload/Accept] POST error:', error);
    return bridgeErrorResponse('Failed to accept pairing', 500);
  }
}
