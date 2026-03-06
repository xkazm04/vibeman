import { NextRequest, NextResponse } from 'next/server';
import { getScanOrchestrator, initializeScanOrchestrator } from '@/lib/scan/scanOrchestrator';
import { createFileGatherer } from '@/lib/scan/fileGatherer';
import { logger } from '@/lib/logger';

/**
 * POST /api/scan/full
 * 
 * Execute a comprehensive scan combining structure analysis and agent ideas
 * 
 * Request body:
 * {
 *   projectId: string
 *   projectPath: string
 *   projectType: 'nextjs' | 'fastapi' | 'django' | 'express' | 'generic'
 *   agentPersona?: string (agent to use for analysis, e.g., 'zen_architect', 'bug_hunter')
 *   provider?: 'gemini' | 'openai' | 'anthropic'
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   projectId: string
 *   structureFindings?: Finding[]
 *   agentFindings?: Finding[]
 *   metrics?: { filesAnalyzed, issuesFound, avgSeverity }
 *   error?: string
 * }
 */

interface FullScanRequest {
  projectId: string;
  projectPath: string;
  projectType: 'nextjs' | 'fastapi' | 'django' | 'express' | 'generic';
  agentPersona?: string;
  provider?: string;
}

interface Finding {
  id?: string;
  title: string;
  description: string;
  severity?: 'error' | 'warning' | 'info';
  filePath?: string;
  lineNumber?: number;
}

interface FullScanResponse {
  success: boolean;
  projectId?: string;
  structureFindings?: Finding[];
  agentFindings?: Finding[];
  metrics?: {
    filesAnalyzed: number;
    filteredCount: number;
    issuesTotalCount: number;
    avgSeverity?: string;
  };
  duration?: number;
  error?: string;
}

function validateFullScanRequest(body: Partial<FullScanRequest>): string | null {
  if (!body.projectId || !body.projectPath) {
    return 'projectId and projectPath are required';
  }

  if (!body.projectType || !['nextjs', 'fastapi', 'django', 'express', 'generic'].includes(body.projectType)) {
    return 'Valid projectType is required: nextjs, fastapi, django, express, or generic';
  }

  return null;
}

async function handlePost(request: NextRequest): Promise<NextResponse<FullScanResponse>> {
  const startTime = Date.now();

  try {
    const body: FullScanRequest = await request.json();

    const validationError = validateFullScanRequest(body);
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
      agentPersona = 'zen_architect',
      provider = 'gemini'
    } = body;

    logger.info('Processing full scan request', {
      projectId,
      projectType,
      agentPersona,
      provider
    });

    // Initialize orchestrator if needed
    let orchestrator = getScanOrchestrator();
    if (!orchestrator) {
      const fileGatherer = createFileGatherer('http');
      initializeScanOrchestrator(fileGatherer);
      orchestrator = getScanOrchestrator();
    }

    if (!orchestrator) {
      throw new Error('Failed to initialize ScanOrchestrator');
    }

    logger.info('Executing full scan', { projectId });

    // Execute full scan (structure + agent)
    const results = await orchestrator.executeFullScan(
      projectId,
      projectPath,
      projectType,
      agentPersona,
      provider as any
    );

    // Separate structure and agent findings
    const allFindings: Finding[] = [];
    let totalFilesAnalyzed = 0;

    for (const result of results) {
      totalFilesAnalyzed += result.metadata?.fileCount || 0;
      for (const finding of result.findings) {
        allFindings.push({
          id: finding.id,
          title: finding.title,
          description: finding.description,
          severity: finding.severity || 'info',
          filePath: finding.filePath,
          lineNumber: finding.lineNumber
        });
      }
    }

    // Transform findings by category for response
    // Note: Category info is in the result, we'll label structure vs agent by order
    const structureFindings: Finding[] = [];
    const agentFindings: Finding[] = [];

    if (results.length >= 1) {
      // First result is structure scan
      for (const finding of results[0].findings) {
        structureFindings.push({
          id: finding.id,
          title: finding.title,
          description: finding.description,
          severity: finding.severity || 'info',
          filePath: finding.filePath,
          lineNumber: finding.lineNumber
        });
      }
    }

    if (results.length >= 2) {
      // Second result is agent scan
      for (const finding of results[1].findings) {
        agentFindings.push({
          id: finding.id,
          title: finding.title,
          description: finding.description,
          severity: finding.severity || 'info',
          filePath: finding.filePath,
          lineNumber: finding.lineNumber
        });
      }
    }

    // Calculate metrics
    const severityMap: Record<string, number> = { error: 3, warning: 2, info: 1 };
    const totalSeverity = allFindings.reduce((sum: number, f: Finding) => {
      const sev = f.severity || 'info';
      return sum + (severityMap[sev] || 1);
    }, 0);
    const avgSeverity =
      allFindings.length > 0
        ? (totalSeverity / allFindings.length).toFixed(2)
        : '0.00';

    const duration = Date.now() - startTime;

    logger.info('Full scan completed', {
      projectId,
      structureCount: structureFindings.length,
      agentCount: agentFindings.length,
      totalFindings: allFindings.length,
      duration
    });

    return NextResponse.json({
      success: true,
      projectId,
      structureFindings,
      agentFindings,
      metrics: {
        filesAnalyzed: totalFilesAnalyzed,
        filteredCount: allFindings.length,
        issuesTotalCount: allFindings.length,
        avgSeverity
      },
      duration
    });
  } catch (error) {
    logger.error('Full scan failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export const POST = handlePost;
export const maxDuration = 300; // 5 minutes for comprehensive scans
