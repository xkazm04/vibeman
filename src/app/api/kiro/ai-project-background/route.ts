import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { eventDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { generateAIReview } from '@/app/projects/ProjectAI/promptFunctions';
import { analyzeProjectStructure, ProjectAnalysis } from '@/lib/projectAnalysis';

interface ProjectRequest {
  projectId: string;
  projectPath: string;
  projectName: string;
  mode: 'docs' | 'goals' | 'context' | 'code';
}

function validateProjectRequest(data: Partial<ProjectRequest>): string | null {
  if (!data.projectId || !data.projectPath || !data.projectName || !data.mode) {
    return 'Project ID, path, name, and mode are required';
  }

  if (data.projectPath.includes('..') || data.projectPath.includes('~')) {
    return 'Invalid project path';
  }

  return null;
}

function createEvent(projectId: string, title: string, description: string, type: 'info' | 'success' | 'error') {
  eventDb.createEvent({
    id: uuidv4(),
    project_id: projectId,
    title,
    description,
    type
  });
}

export async function POST(request: NextRequest) {
  try {
    const data: ProjectRequest = await request.json();

    const validationError = validateProjectRequest(data);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const { projectId, projectPath, projectName, mode } = data;

    // Start background processing
    processBackgroundGeneration({
      projectId,
      projectPath,
      projectName,
      mode
    });

    return NextResponse.json({
      success: true,
      message: `Background ${mode} generation started`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function capitalizeMode(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

async function generateDocs(projectId: string, projectPath: string, projectName: string, projectAnalysis: ProjectAnalysis) {
  const aiReview = await generateAIReview(projectName, projectAnalysis, projectId);

  // Save to project root/context/high.md
  const contextDir = join(projectPath, 'context');
  await fs.mkdir(contextDir, { recursive: true });
  const docsPath = join(contextDir, 'high.md');
  await fs.writeFile(docsPath, aiReview, 'utf-8');

  createEvent(projectId, 'AI Documentation Generated', 'Documentation saved to context/high.md', 'success');
}

async function processBackgroundGeneration({
  projectId,
  projectPath,
  projectName,
  mode
}: ProjectRequest) {
  try {
    createEvent(
      projectId,
      `AI ${capitalizeMode(mode)} Generation Started`,
      `Background generation of ${mode} for project ${projectName}`,
      'info'
    );

    // Analyze the project structure
    const projectAnalysis = await analyzeProjectStructure(projectPath);

    // Generate content based on mode
    switch (mode) {
      case 'docs':
        await generateDocs(projectId, projectPath, projectName, projectAnalysis);
        break;

      default:
        throw new Error(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    createEvent(
      projectId,
      `AI ${capitalizeMode(mode)} Generation Failed`,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error'
    );
  }
}

