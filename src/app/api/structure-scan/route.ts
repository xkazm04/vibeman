import { NextRequest, NextResponse } from 'next/server';
import {
  getStructureTemplateWithCustom,
  getEnforcedStructure,
} from './structureTemplates';
import { scanWithEnforcedStructure } from './lib/violationDetector';
import {
  scanForViolations,
  generateRequirementFiles,
} from './lib/helpers';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import {
  validateProjectPath,
  validateProjectType,
  validateProjectId,
} from '@/lib/validation/inputValidator';
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
    const validation = await validateRequestBody(request, {
      required: [
        { field: 'projectPath', validator: validateProjectPath },
        { field: 'projectType', validator: validateProjectType },
      ],
      optional: [
        { field: 'projectId', validator: validateProjectId },
      ],
    });
    if (!validation.success) return validation.error;

    const projectPath = validation.data.projectPath as string;
    const projectType = validation.data.projectType as 'nextjs' | 'fastapi';

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
