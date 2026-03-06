/**
 * Scan Queue API
 * GET: Get queue items for a project
 * POST: Create a new queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';
import type { DbScanQueueItem } from '@/app/db/models/types';
import { ALL_SCAN_TYPES, isValidScanType, type ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { generateQueueId } from '@/lib/idGenerator';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  createMissingFieldError,
} from '@/app/features/Ideas/lib/ideasHandlers';

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  if (!projectId) {
    return createMissingFieldError('projectId');
  }

  let queueItems;
  if (status) {
    queueItems = scanQueueDb.getQueueByStatus(projectId, status as DbScanQueueItem['status']);
  } else {
    queueItems = scanQueueDb.getQueueByProject(projectId);
  }

  return NextResponse.json({ queueItems });
}

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const {
    projectId,
    scanType,
    contextId,
    triggerType = 'manual',
    triggerMetadata,
    priority,
    autoMergeEnabled
  } = body;

  if (!projectId || !scanType) {
    return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
      message: 'projectId and scanType are required',
    });
  }

  // Validate scan type using centralized config
  if (!isValidScanType(scanType)) {
    return createIdeasErrorResponse(IdeasErrorCode.INVALID_FILTER, {
      field: 'scanType',
      message: `Invalid scan type: ${scanType}. Valid types: ${ALL_SCAN_TYPES.join(', ')}`,
    });
  }

  // Create queue item
  const queueId = generateQueueId();

  const queueItem = scanQueueDb.createQueueItem({
    id: queueId,
    project_id: projectId,
    scan_type: scanType as ScanType,
    context_id: contextId,
    trigger_type: triggerType,
    trigger_metadata: triggerMetadata,
    priority: priority || 0,
    auto_merge_enabled: autoMergeEnabled || false
  });

  // Notify worker immediately instead of waiting for next poll cycle
  // This enables event-driven processing with O(1) latency
  scanQueueWorker.notifyNewItem();

  return NextResponse.json({ queueItem }, { status: 201 });
}

export const GET = createRouteHandler(handleGet, { endpoint: '/api/scan-queue' });
export const POST = createRouteHandler(handlePost, { endpoint: '/api/scan-queue', method: 'POST' });
