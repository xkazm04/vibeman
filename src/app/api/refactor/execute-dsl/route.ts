import { NextRequest, NextResponse } from 'next/server';
import { generateRequirementFromSpec, generateRequirementFilename, generateAutonomousExecutionPlan, createInitialExecutionResult } from '@/app/features/RefactorWizard/lib/dslExecutor';
import { validateSpec, hasBlockingErrors } from '@/app/features/RefactorWizard/lib/dslValidator';
import { RefactorSpec, ExecutionResult } from '@/app/features/RefactorWizard/lib/dslTypes';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/refactor/execute-dsl
 *
 * Execute a DSL specification by generating Claude Code requirement files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spec, projectPath, projectId } = body as {
      spec: RefactorSpec;
      projectPath: string;
      projectId?: string;
    };

    // Validate required fields
    if (!spec) {
      return NextResponse.json(
        { error: 'Spec is required' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Validate spec
    const validationErrors = validateSpec(spec);
    if (hasBlockingErrors(validationErrors)) {
      return NextResponse.json(
        {
          error: 'Spec has validation errors',
          validationErrors: validationErrors.filter(e => e.severity === 'error'),
        },
        { status: 400 }
      );
    }

    // Create result tracker
    const result = createInitialExecutionResult(spec);

    // Ensure .claude/commands directory exists
    const claudeDir = path.join(projectPath, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');

    try {
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.mkdir(commandsDir, { recursive: true });
    } catch (mkdirError) {
      console.error('[DSL Executor] Failed to create directories:', mkdirError);
    }

    // Generate requirement content
    const requirementContent = generateRequirementFromSpec(spec);
    const fileName = generateRequirementFilename(spec);
    const filePath = path.join(commandsDir, `${fileName}.md`);

    // Write requirement file
    await fs.writeFile(filePath, requirementContent, 'utf-8');

    // Generate autonomous execution plan if in auto mode
    let executionPlan: string | undefined;
    if (spec.execution?.mode === 'auto') {
      executionPlan = generateAutonomousExecutionPlan(spec);
      const planPath = path.join(commandsDir, `${fileName}-plan.md`);
      await fs.writeFile(planPath, executionPlan, 'utf-8');
    }

    // Update result
    const finalResult: ExecutionResult = {
      ...result,
      status: 'completed',
      endTime: new Date(),
      summary: {
        ...result.summary,
        rulesApplied: spec.transformations.filter(r => r.enabled !== false).length,
        filesModified: 1, // The requirement file
      },
    };

    return NextResponse.json({
      success: true,
      result: finalResult,
      files: {
        requirement: filePath,
        executionPlan: executionPlan ? path.join(commandsDir, `${fileName}-plan.md`) : undefined,
      },
      message: `Created requirement file: ${fileName}.md`,
    });

  } catch (error) {
    console.error('[DSL Executor] Execution failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/refactor/execute-dsl
 *
 * Get available DSL templates
 */
export async function GET() {
  try {
    const { ALL_TEMPLATES } = await import('@/app/features/RefactorWizard/lib/dslTemplates');

    return NextResponse.json({
      templates: ALL_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
      })),
    });
  } catch (error) {
    console.error('[DSL Executor] Failed to get templates:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}
