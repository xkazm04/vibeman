import { NextRequest, NextResponse } from 'next/server';
import { generateRefactorScript } from '@/app/features/RefactorWizard/lib/scriptGenerator';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export async function POST(request: NextRequest) {
  try {
    const { opportunities } = await request.json();

    if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
      return NextResponse.json(
        { error: 'Opportunities array is required' },
        { status: 400 }
      );
    }

    // Generate script
    const script = await generateRefactorScript(opportunities as RefactorOpportunity[]);

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      {
        error: 'Script generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
