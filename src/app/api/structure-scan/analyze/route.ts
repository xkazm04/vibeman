import { NextRequest, NextResponse } from 'next/server';
import { analyzeStructure } from '../lib/scanOrchestrator';

/**
 * POST /api/structure-scan/analyze
 *
 * Step 1 of structure scan workflow:
 * Analyzes project structure and returns violations for user decision
 *
 * Request body:
 * {
 *   projectPath: string;
 *   projectType: 'nextjs' | 'fastapi';
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   violations: StructureViolation[];
 *   violationCount: number;
 *   message?: string;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectPath, projectType } = await request.json();

    if (!projectPath || !projectType) {
      return NextResponse.json(
        { success: false, error: 'projectPath and projectType are required' },
        { status: 400 }
      );
    }

    const result = await analyzeStructure(projectPath, projectType);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[StructureScan] API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
