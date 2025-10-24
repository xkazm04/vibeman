import { NextRequest, NextResponse } from 'next/server';
import {
  initializeClaudeFolder,
  createContextScanRequirement,
  createStructureRulesFile,
} from '@/app/Claude/lib/claudeCodeManager';

/**
 * POST /api/claude-code/initialize
 * Initialize Claude Code folder structure in a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, projectName, projectId, projectType } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Initialize Claude Code folder structure
    const result = initializeClaudeFolder(projectPath, projectName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initialize Claude Code' },
        { status: 500 }
      );
    }

    // If projectId is provided, create the context scan requirement file
    let requirementResult;
    if (projectId) {
      requirementResult = createContextScanRequirement(
        projectPath,
        projectId,
        projectName
      );

      if (!requirementResult.success) {
        console.warn(
          'Failed to create context scan requirement:',
          requirementResult.error
        );
        // Don't fail the entire initialization if requirement creation fails
      }
    }

    // If projectType is provided, create structure rules file
    let structureRulesResult;
    if (projectType && (projectType === 'nextjs' || projectType === 'fastapi')) {
      structureRulesResult = createStructureRulesFile(
        projectPath,
        projectType
      );

      if (!structureRulesResult.success) {
        console.warn(
          'Failed to create structure rules file:',
          structureRulesResult.error
        );
        // Don't fail the entire initialization if structure rules creation fails
      }
    }

    return NextResponse.json({
      message: 'Claude Code initialized successfully',
      structure: result.structure,
      contextScanRequirement: requirementResult?.success
        ? {
            created: true,
            filePath: requirementResult.filePath,
          }
        : {
            created: false,
            error: requirementResult?.error,
          },
      structureRules: structureRulesResult?.success
        ? {
            created: true,
            filePath: structureRulesResult.filePath,
          }
        : {
            created: false,
            error: structureRulesResult?.error,
          },
    });
  } catch (error) {
    console.error('Error initializing Claude Code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize' },
      { status: 500 }
    );
  }
}
