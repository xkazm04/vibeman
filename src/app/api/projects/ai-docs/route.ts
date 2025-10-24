import { NextRequest, NextResponse } from 'next/server';
import { generateAIReview } from '@/app/projects/ProjectAI/generateAIReview';

export async function POST(request: NextRequest) {
  try {
    const { projectName, analysis, projectId, provider } = await request.json();

    if (!projectName || !analysis) {
      return NextResponse.json(
        { success: false, error: 'Project name and analysis are required' },
        { status: 400 }
      );
    }

    const aiReview = await generateAIReview(projectName, analysis, projectId, provider);

    return NextResponse.json({
      success: true,
      review: aiReview
    });

  } catch (error) {
    console.error('AI docs generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate AI documentation' 
      },
      { status: 500 }
    );
  }
}