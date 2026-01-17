import { NextRequest, NextResponse } from 'next/server';
import {
  initializeClaudeFolder,
  createContextScanRequirement,
  createStructureRulesFile,
  copyDefaultSkills,
} from '@/app/Claude/lib/claudeCodeManager';
import { logger } from '@/lib/logger';


interface InitializationResult {
  created: boolean;
  filePath?: string;
  error?: string;
}

interface SkillsCopyResult {
  copied: boolean;
  files?: string[];
  skipped?: string[];
  errors?: Array<{ file: string; error: string }>;
}

interface InitializeResponse {
  message: string;
  structure?: unknown;
  contextScanRequirement: InitializationResult;
  structureRules: InitializationResult;
  skills: SkillsCopyResult;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): { valid: boolean; error?: string; projectPath?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { projectPath } = body as { projectPath?: string };

  if (!projectPath) {
    return { valid: false, error: 'Project path is required' };
  }

  return { valid: true, projectPath };
}

/**
 * Handle context scan requirement creation
 */
function handleContextScanRequirement(
  projectId: string | undefined,
  projectPath: string,
  projectName: string | undefined
): InitializationResult {
  if (!projectId) {
    return { created: false };
  }

  const result = createContextScanRequirement(projectPath, projectId, projectName);

  if (!result.success) {
    logger.warn('Failed to create context scan requirement:', result.error);
  }

  return result.success
    ? { created: true, filePath: result.filePath }
    : { created: false, error: result.error };
}

/**
 * Handle structure rules file creation
 */
function handleStructureRulesFile(
  projectType: string | undefined,
  projectPath: string
): InitializationResult {
  if (!projectType || (projectType !== 'nextjs' && projectType !== 'fastapi')) {
    return { created: false };
  }

  const result = createStructureRulesFile(projectPath, projectType);

  if (!result.success) {
    logger.warn('Failed to create structure rules file:', result.error);
  }

  return result.success
    ? { created: true, filePath: result.filePath }
    : { created: false, error: result.error };
}

/**
 * Handle default skills copying
 */
function handleSkillsCopy(projectPath: string): SkillsCopyResult {
  const result = copyDefaultSkills(projectPath);

  if (!result.success && result.errors.length > 0) {
    logger.warn('Some skills failed to copy:', result.errors);
  }

  return {
    copied: result.copied.length > 0,
    files: result.copied.length > 0 ? result.copied : undefined,
    skipped: result.skipped.length > 0 ? result.skipped : undefined,
    errors: result.errors.length > 0 ? result.errors : undefined,
  };
}

/**
 * POST /api/claude-code/initialize
 * Initialize Claude Code folder structure in a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(body);

    if (!validation.valid || !validation.projectPath) {
      return NextResponse.json(
        { error: validation.error || 'Validation failed' },
        { status: 400 }
      );
    }

    const { projectPath, projectName, projectId, projectType } = body as {
      projectPath: string;
      projectName?: string;
      projectId?: string;
      projectType?: string;
    };

    // Initialize Claude Code folder structure
    const result = initializeClaudeFolder(projectPath, projectName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initialize Claude Code' },
        { status: 500 }
      );
    }

    // Create optional files
    const requirementResult = handleContextScanRequirement(projectId, projectPath, projectName);
    const structureRulesResult = handleStructureRulesFile(projectType, projectPath);
    const skillsResult = handleSkillsCopy(projectPath);

    const response: InitializeResponse = {
      message: 'Claude Code initialized successfully',
      structure: result.structure,
      contextScanRequirement: requirementResult,
      structureRules: structureRulesResult,
      skills: skillsResult,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error initializing Claude Code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize' },
      { status: 500 }
    );
  }
}
