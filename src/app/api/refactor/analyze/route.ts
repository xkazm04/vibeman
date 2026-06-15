/**
 * API Route: Refactor Analyze
 *
 * POST /api/refactor/analyze - Run the static refactor scanner over a project
 * and return detected refactoring opportunities.
 *
 * Bridges the live refactor store (src/stores/slices/refactor/*) to the live
 * detection engine (src/lib/scan/*). It picks the appropriate ScanStrategy for
 * the project, scans the selected folders, and runs the technique detectors for
 * the selected scan groups.
 *
 * Request body:
 * {
 *   projectPath: string;            // absolute path to the project root
 *   projectType?: ProjectType;      // optional explicit tech stack (auto-detected otherwise)
 *   selectedGroups?: string[];      // optional scan-group IDs to filter detectors
 *   selectedFolders?: string[];     // optional folders to limit the scan to
 * }
 *
 * Response (200):
 * {
 *   opportunities: RefactorOpportunity[];
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScanStrategy } from '@/lib/scan';
import type { ProjectType } from '@/lib/scan';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import {
  validateRequiredFields,
  handleApiError,
  extractRequestContext,
} from '@/lib/api-errors';

interface AnalyzeRequestBody {
  projectPath?: string;
  projectType?: ProjectType;
  selectedGroups?: string[];
  selectedFolders?: string[];
}

interface AnalyzeResponse {
  opportunities: RefactorOpportunity[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestContext = extractRequestContext(request);

  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { projectPath, projectType, selectedGroups, selectedFolders } = body;

    const validationResponse = validateRequiredFields(
      { projectPath },
      ['projectPath']
    );
    if (validationResponse) {
      return validationResponse;
    }

    // projectPath is guaranteed non-empty by validateRequiredFields above.
    const strategy = await getScanStrategy(projectPath as string, projectType);
    const files = await strategy.scanProjectFiles(projectPath as string, selectedFolders);
    const opportunities = await strategy.detectOpportunities(files, selectedGroups);

    const response: AnalyzeResponse = { opportunities };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, 'refactor analyze POST', undefined, requestContext);
  }
}
