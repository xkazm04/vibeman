/**
 * Scan Queue API
 * GET: Get queue items for a project
 * POST: Create a new queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';
import { ALL_SCAN_TYPES, isValidScanType, resolveScanType } from '@/app/features/Ideas/lib/scanTypes';
import { generateQueueId } from '@/lib/idGenerator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let queueItems;
    if (status) {
      queueItems = scanQueueDb.getQueueByStatus(projectId, status as any);
    } else {
      queueItems = scanQueueDb.getQueueByProject(projectId);
    }

    return NextResponse.json({ queueItems });
  } catch (error) {
    console.error('Error fetching queue items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'projectId and scanType are required' },
        { status: 400 }
      );
    }

    // Resolve aliases and validate scan type using centralized config
    const resolved = resolveScanType(scanType);
    if (!resolved) {
      return NextResponse.json(
        { error: `Invalid scan type: ${scanType}. Valid types: ${ALL_SCAN_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Create queue item
    const queueId = generateQueueId();

    const queueItem = scanQueueDb.createQueueItem({
      id: queueId,
      project_id: projectId,
      scan_type: resolved,
      context_id: contextId,
      trigger_type: triggerType,
      trigger_metadata: triggerMetadata,
      priority: priority || 0,
      auto_merge_enabled: autoMergeEnabled || false
    });

    return NextResponse.json({ queueItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating queue item:', error);
    return NextResponse.json(
      { error: 'Failed to create queue item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
