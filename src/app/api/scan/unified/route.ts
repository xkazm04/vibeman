import { NextRequest, NextResponse } from 'next/server';
import { getScanOrchestrator, initializeScanOrchestrator } from '@/lib/scan/scanOrchestrator';
import { ScanConfig, ScanResult } from '@/lib/scan/types';
import { createFileGatherer } from '@/lib/scan/fileGatherer';
import { logger } from '@/lib/logger';

/**
 * POST /api/scan/unified
 * 
 * Execute a unified scan using the ScanOrchestrator
 * 
 * Request body:
 * {
 *   projectId: string
 *   projectPath: string
 *   projectType: 'nextjs' | 'fastapi' | 'django' | 'express' | 'generic'
 *   scanCategory: 'agent' | 'structure' | 'template' | 'blueprint'
 *   scanType?: string (agent persona or template name)
 *   provider?: 'openai' | 'anthropic' | 'groq'
 *   contextId?: string (for context-specific scans)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   scanId: string
 *   result?: ScanResult
 *   error?: string
 * }
 */

interface UnifiedScanRequest {
  projectId: string;
  projectPath: string;
  projectType: 'nextjs' | 'fastapi' | 'django' | 'express' | 'generic';
  scanCategory: 'agent' | 'structure' | 'template' | 'blueprint';
  scanType?: string;
  provider?: string;
  contextId?: string;
}

interface UnifiedScanResponse {
  success: boolean;
  scanId?: string;
  result?: ScanResult;
  error?: string;
}

function validateScanRequest(body: Partial<UnifiedScanRequest>): string | null {
  if (!body.projectId || !body.projectPath) {
    return 'projectId and projectPath are required';
  }

  if (!body.projectType || !['nextjs', 'fastapi', 'django', 'express', 'generic'].includes(body.projectType)) {
    return 'Valid projectType is required: nextjs, fastapi, django, express, or generic';
  }

  if (!body.scanCategory || !['agent', 'structure', 'template', 'blueprint'].includes(body.scanCategory)) {
    return 'Valid scanCategory is required: agent, structure, template, or blueprint';
  }

  return null;
}

async function handlePost(request: NextRequest): Promise<NextResponse<UnifiedScanResponse>> {
  try {
    const body: UnifiedScanRequest = await request.json();

    const validationError = validateScanRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const {
      projectId,
      projectPath,
      projectType,
      scanCategory,
      scanType,
      provider,
      contextId
    } = body;

    logger.info('Processing unified scan request', {
      projectId,
      scanCategory,
      scanType,
      provider
    });

    // Initialize orchestrator if needed
    const orchestrator = getScanOrchestrator();
    if (!orchestrator) {
      const fileGatherer = createFileGatherer('http');
      initializeScanOrchestrator(fileGatherer);
    }

    const scanOrchestrator = getScanOrchestrator();
    if (!scanOrchestrator) {
      throw new Error('Failed to initialize ScanOrchestrator');
    }

    // Build scan config
    const scanConfig: ScanConfig = {
      projectId,
      projectPath,
      projectType,
      scanCategory,
      scanType: scanType || 'default',
      provider: (provider as any) || 'anthropic',
      contextId
    };

    logger.info('Executing scan', { projectId, scanCategory });

    // Set up progress listener
    let progressEvents = 0;
    scanOrchestrator.onProgress(projectId, (event) => {
      progressEvents++;
      logger.info('Scan progress', {
        projectId,
        eventType: event.type,
        progress: event.progress?.message || ''
      });
    });

    // Execute scan
    const result = await scanOrchestrator.execute(scanConfig);

    logger.info('Scan completed', {
      projectId,
      findingCount: result.findings.length,
      progressEvents,
      duration: result.metadata?.duration
    });

    return NextResponse.json({
      success: true,
      scanId: result.metadata?.scanId || projectId,
      result
    });
  } catch (error) {
    logger.error('Unified scan failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scan/unified?mode=parallel
 * Execute multiple scans in parallel
 * 
 * Request body:
 * {
 *   scans: UnifiedScanRequest[]
 * }
 */
async function handleParallelScan(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; results?: ScanResult[]; error?: string }>> {
  try {
    const body = await request.json();

    if (!Array.isArray(body.scans) || body.scans.length === 0) {
      return NextResponse.json(
        { success: false, error: 'scans array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all scans
    for (const scan of body.scans) {
      const error = validateScanRequest(scan);
      if (error) {
        return NextResponse.json(
          { success: false, error },
          { status: 400 }
        );
      }
    }

    const orchestrator = getScanOrchestrator();
    if (!orchestrator) {
      const fileGatherer = createFileGatherer('http');
      initializeScanOrchestrator(fileGatherer);
    }

    const scanOrchestrator = getScanOrchestrator();
    if (!scanOrchestrator) {
      throw new Error('Failed to initialize ScanOrchestrator');
    }

    logger.info('Executing parallel scans', { count: body.scans.length });

    const configs = body.scans.map((scan: UnifiedScanRequest) => ({
      projectId: scan.projectId,
      projectPath: scan.projectPath,
      projectType: scan.projectType,
      scanCategory: scan.scanCategory,
      scanType: scan.scanType || 'default',
      provider: (scan.provider as any) || 'anthropic',
      contextId: scan.contextId
    }));

    const results = await scanOrchestrator.executeParallel(configs);

    logger.info('Parallel scans completed', {
      count: results.length,
      timestamps: results.map(r => r.metadata?.startedAt)
    });

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Parallel scans failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Main request handler
 * Routes to parallel or single scan based on query parameter
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (mode === 'parallel') {
    return handleParallelScan(request);
  }

  return handlePost(request);
}

export const maxDuration = 300; // 5 minutes for scans
