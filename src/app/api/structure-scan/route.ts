import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import {
  getStructureTemplateWithCustom,
  getEnforcedStructure,
} from './structureTemplates';
import { scanWithEnforcedStructure } from './lib/violationDetector';
import {
  validateScanRequest,
  scanForViolations,
  generateRequirementFiles,
} from './lib/helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/structure-scan
 *
 * Legacy single-step endpoint: scans project structure and generates
 * requirement files for any violations found.
 *
 * For the newer two-step workflow (analyze then decide then save), see:
 * - POST /api/structure-scan/analyze
 * - POST /api/structure-scan/save
 *
 * @param request - JSON body with `projectPath`, `projectType`, and optional `projectId`
 * @returns JSON with `success`, `violations` count, `requirementFiles`, and `message`
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateScanRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { projectPath, projectType } = validation.data;

    // Verify project path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 404 }
      );
    }

    // Scan for violations using enforced structure or template fallback
    const enforcedStructure = getEnforcedStructure(projectType);
    let violations;

    if (enforcedStructure) {
      violations = await scanWithEnforcedStructure(projectPath, enforcedStructure);
    } else {
      const template = await getStructureTemplateWithCustom(projectType);
      violations = await scanForViolations(projectPath, template);
    }

    if (violations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No structure violations found',
        violations: 0,
        requirementFiles: [],
      });
    }

    const requirementFiles = await generateRequirementFiles(
      projectPath,
      projectType,
      violations
    );

    return NextResponse.json({
      success: true,
      message: `Found ${violations.length} violations, created ${requirementFiles.length} requirement files`,
      violations: violations.length,
      requirementFiles,
    });
  } catch (error) {
    logger.error('Structure scan failed', { error });
    return NextResponse.json(
      {
        error: 'Structure scan failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
