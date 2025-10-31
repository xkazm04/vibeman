import { NextRequest, NextResponse } from 'next/server';
import { saveRequirements } from '../lib/scanOrchestrator';
import type { StructureViolation } from '../violationRequirementTemplate';

/**
 * POST /api/structure-scan/save
 *
 * Step 2 of structure scan workflow:
 * Saves requirement files after user accepts
 *
 * Request body:
 * {
 *   violations: StructureViolation[];
 *   projectPath: string;
 *   projectId: string;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   requirementFiles: string[];
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { violations, projectPath, projectId } = await request.json();

    if (!violations || !projectPath || !projectId) {
      return NextResponse.json(
        { success: false, error: 'violations, projectPath, and projectId are required' },
        { status: 400 }
      );
    }

    const result = await saveRequirements(violations as StructureViolation[], projectPath, projectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[StructureScan] Save API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
