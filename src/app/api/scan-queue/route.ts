/**
 * Scan Queue API
 * GET: Get queue items for a project
 * POST: Create a new queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';

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
    logger.error('Error fetching queue items:', { error: error });
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

    // Validate scan type
    const validScanTypes: ScanType[] = [
      'zen_architect',
      'bug_hunter',
      'perf_optimizer',
      'security_protector',
      'insight_synth',
      'ambiguity_guardian',
      'business_visionary',
      'ui_perfectionist',
      'feature_scout',
      'onboarding_optimizer',
      'ai_integration_scout',
      'delight_designer'
    ];

    if (!validScanTypes.includes(scanType)) {
      return NextResponse.json(
        { error: 'Invalid scan type' },
        { status: 400 }
      );
    }

    // Create queue item
    const queueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const queueItem = scanQueueDb.createQueueItem({
      id: queueId,
      project_id: projectId,
      scan_type: scanType,
      context_id: contextId,
      trigger_type: triggerType,
      trigger_metadata: triggerMetadata,
      priority: priority || 0,
      auto_merge_enabled: autoMergeEnabled || false
    });

    return NextResponse.json({ queueItem }, { status: 201 });
  } catch (error) {
    logger.error('Error creating queue item:', { error: error });
    return NextResponse.json(
      { error: 'Failed to create queue item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
