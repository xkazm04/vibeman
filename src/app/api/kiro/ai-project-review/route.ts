import { NextRequest, NextResponse } from 'next/server';
import { generateAIReview } from '@/app/projects/ProjectAI/promptFunctions';
import { analyzeProjectStructure } from '@/lib/projectAnalysis';

interface ProjectReviewRequest {
  projectId: string;
  projectPath: string;
  projectName: string;
  mode?: 'docs' | 'goals' | 'context' | 'code';
  provider?: string;
}

function validateProjectReviewRequest(data: Partial<ProjectReviewRequest>): string | null {
  if (!data.projectId || !data.projectPath || !data.projectName) {
    return 'Project ID, path, and name are required';
  }

  if (data.projectPath.includes('..') || data.projectPath.includes('~')) {
    return 'Invalid project path';
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const data: ProjectReviewRequest = await request.json();
    const { projectId, projectPath, projectName, mode = 'docs', provider } = data;

    const validationError = validateProjectReviewRequest(data);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    try {
      // Analyze the project structure
      const projectAnalysis = await analyzeProjectStructure(projectPath);

      let result;

      // Generate content based on mode
      switch (mode) {
        case 'docs':
          const aiReview = await generateAIReview(projectName, projectAnalysis, projectId, provider);
          result = {
            success: true,
            analysis: aiReview,
            projectInfo: {
              name: projectName,
              path: projectPath,
              structure: projectAnalysis.structure,
              stats: projectAnalysis.stats
            }
          };
          break;
        default:
          throw new Error(`Invalid mode: ${mode}`);
      }

      return NextResponse.json(result);
    } catch (analysisError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to analyze project: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
