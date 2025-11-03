import { NextRequest, NextResponse } from 'next/server';
import { FileSystemInterface } from '../../../../lib/fileSystemInterface';
import { ClaudeTaskManager } from '../../../../lib/claudeTaskManager';
import { DevelopmentRequirement } from '../../../../types/development';
import { createErrorResponse } from '../../../../lib/api-helpers';

interface CreateRequirementParams {
  projectPath: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  files?: string[];
  estimatedComplexity?: number;
}

function createRequirement(params: CreateRequirementParams): DevelopmentRequirement {
  const {
    projectPath,
    title,
    description,
    priority = 'medium',
    files = [],
    estimatedComplexity = 5
  } = params;

  return {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectPath,
    title,
    description,
    priority,
    status: 'pending',
    files,
    estimatedComplexity,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function submitRequirementToClaudeCode(
  requirement: DevelopmentRequirement
): Promise<string> {
  const fileSystem = new FileSystemInterface(requirement.projectPath);
  await fileSystem.initialize();

  const taskManager = new ClaudeTaskManager(fileSystem, requirement.projectPath);
  return await taskManager.submitRequirement(requirement);
}

export async function POST(request: NextRequest) {
  try {
    const params = await request.json();

    // Validate required fields
    if (!params.projectPath || !params.title || !params.description) {
      return createErrorResponse(
        'Missing required fields: projectPath, title, description',
        400
      );
    }

    const requirement = createRequirement(params);
    const taskPath = await submitRequirementToClaudeCode(requirement);

    return NextResponse.json({
      success: true,
      requirement,
      taskPath,
      message: 'Requirement submitted to Claude Code'
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to create requirement',
      500
    );
  }
} 