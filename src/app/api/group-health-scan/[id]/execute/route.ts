/**
 * API Route: Execute Group Health Scan
 *
 * POST /api/group-health-scan/[id]/execute
 * Starts CLI execution for a pending health scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { groupHealthDb, contextDb, contextGroupDb } from '@/app/db';
import { startExecution } from '@/lib/claude-terminal/cli-service';
import { buildRefactorScanPrompt } from '@/app/features/Context/sub_ContextGroups/lib/healthScanPrompt';
import { buildBeautifyScanPrompt } from '@/app/features/Context/sub_ContextGroups/lib/beautifyScanPrompt';
import { buildPerformanceScanPrompt } from '@/app/features/Context/sub_ContextGroups/lib/performanceScanPrompt';
import { buildProductionScanPrompt } from '@/app/features/Context/sub_ContextGroups/lib/productionScanPrompt';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { aiOrchestrator } from '@/lib/ai/aiOrchestrator';

type ScanType = 'refactor' | 'beautify' | 'performance' | 'production';

interface ExecuteRequestBody {
  projectPath: string;
  scanType?: ScanType;
}

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let scanId: string | null = null;

  try {
    const { id } = await params;
    scanId = id;
    const body = await request.json() as ExecuteRequestBody;
    const { projectPath, scanType = 'refactor' } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Get the scan record
    const scan = groupHealthDb.getById(id);
    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Check scan status - allow both pending and failed (retry)
    if (scan.status !== 'pending' && scan.status !== 'failed') {
      return NextResponse.json(
        { error: `Scan is already ${scan.status}` },
        { status: 400 }
      );
    }

    // Get the group info for the prompt
    const group = contextGroupDb.getGroupById(scan.group_id);
    if (!group) {
      // Mark scan as failed since group doesn't exist
      groupHealthDb.failScan(id);
      return NextResponse.json(
        { error: 'Context group not found' },
        { status: 404 }
      );
    }

    // Get file paths from contexts in this group
    const contexts = contextDb.getContextsByGroup(scan.group_id);
    const filePaths: string[] = [];
    for (const ctx of contexts) {
      const paths = typeof ctx.file_paths === 'string'
        ? JSON.parse(ctx.file_paths)
        : ctx.file_paths;
      if (Array.isArray(paths)) {
        filePaths.push(...paths);
      }
    }

    if (filePaths.length === 0) {
      // Mark scan as failed since no files
      groupHealthDb.failScan(id);
      return NextResponse.json(
        { error: 'No files found in this group\'s contexts' },
        { status: 400 }
      );
    }

    // Build enriched context graph for architectural awareness
    const contextGroupInfo = aiOrchestrator.buildScanContext(
      scan.project_id,
      scan.group_id,
      filePaths
    );

    // Build the scan prompt based on scan type
    const promptOptions = {
      groupName: group.name,
      groupId: group.id,
      projectId: scan.project_id,
      projectPath,
      filePaths,
      autoFix: true,
      contextGroupInfo,
    };

    let prompt: string;
    switch (scanType) {
      case 'beautify':
        prompt = buildBeautifyScanPrompt(promptOptions);
        break;
      case 'performance':
        prompt = buildPerformanceScanPrompt(promptOptions);
        break;
      case 'production':
        prompt = buildProductionScanPrompt(promptOptions);
        break;
      case 'refactor':
      default:
        prompt = buildRefactorScanPrompt({
          ...promptOptions,
          includeComplexityAnalysis: true,
        });
        break;
    }

    logger.info('[API] Starting health scan CLI execution:', {
      scanId: id,
      scanType,
      groupId: group.id,
      groupName: group.name,
      fileCount: filePaths.length,
    });

    // Start the CLI execution
    let executionId: string;
    try {
      executionId = startExecution(projectPath, prompt);
    } catch (execError) {
      // CLI failed to start - mark scan as failed
      logger.error('[API] Failed to start CLI execution:', { execError });
      groupHealthDb.failScan(id);
      return NextResponse.json(
        { error: `Failed to start CLI: ${execError instanceof Error ? execError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Update scan record with execution ID and status
    groupHealthDb.update(id, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    const streamUrl = `/api/claude-terminal/stream?executionId=${executionId}`;

    logger.info('[API] Health scan execution started:', {
      scanId: id,
      executionId,
      streamUrl,
    });

    return NextResponse.json({
      success: true,
      executionId,
      streamUrl,
    });
  } catch (error) {
    logger.error('[API] Group health scan execute error:', { error });

    // Mark scan as failed on any error
    if (scanId) {
      try {
        groupHealthDb.failScan(scanId);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/group-health-scan/[id]/execute');
