/**
 * Bridge API - Offload Pairing
 * POST: Generate a pairing code for device pairing
 */

import { NextRequest } from 'next/server';
import {
  requireBridgeAuth,
  bridgeSuccessResponse,
  bridgeErrorResponse,
} from '@/lib/bridge/auth';
import { devicePairDb } from '@/app/db';
import { CreatePairingRequest, CreatePairingResponse } from '@/app/db/models/offload.types';

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as CreatePairingRequest;

    if (!body.projectId) {
      return bridgeErrorResponse('projectId is required', 400);
    }
    if (!body.deviceName) {
      return bridgeErrorResponse('deviceName is required', 400);
    }

    // Clean up any expired pending pairs first
    devicePairDb.cleanupExpired();

    // Check if there's already an active pair for this project
    const existingPair = devicePairDb.getActivePair(body.projectId);
    if (existingPair) {
      return bridgeErrorResponse(
        `Project already paired with "${existingPair.partner_device_name}". Disconnect first.`,
        409
      );
    }

    // Create new pairing with code
    const pair = devicePairDb.create({
      projectId: body.projectId,
      deviceName: body.deviceName,
      deviceRole: 'active',
    });

    // Calculate expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const response: CreatePairingResponse = {
      pairingCode: pair.pairing_code!,
      expiresAt,
      devicePairId: pair.id,
    };

    return bridgeSuccessResponse(response, 201);
  } catch (error) {
    console.error('[Bridge/Offload/Pair] POST error:', error);
    return bridgeErrorResponse('Failed to create pairing code', 500);
  }
}

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return bridgeErrorResponse('projectId query parameter is required', 400);
    }

    // Get active pair for project
    const pair = devicePairDb.getActivePair(projectId);

    if (!pair) {
      return bridgeSuccessResponse({ paired: false, pair: null });
    }

    return bridgeSuccessResponse({
      paired: true,
      pair: {
        id: pair.id,
        deviceName: pair.device_name,
        deviceRole: pair.device_role,
        partnerDeviceName: pair.partner_device_name,
        partnerUrl: pair.partner_url,
        status: pair.status,
        lastHeartbeatAt: pair.last_heartbeat_at,
      },
    });
  } catch (error) {
    console.error('[Bridge/Offload/Pair] GET error:', error);
    return bridgeErrorResponse('Failed to get pairing status', 500);
  }
}
