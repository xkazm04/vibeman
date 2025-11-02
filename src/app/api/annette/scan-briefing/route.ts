import { NextRequest, NextResponse } from 'next/server';
import { generateScanBriefing, generateQuickScanStatus } from '@/app/features/Annette/lib/scanBriefingService';

/**
 * GET /api/annette/scan-briefing
 * Generate a scan status briefing for voicebot
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const variant = searchParams.get('variant') || 'full';
    const timeframeHours = parseInt(searchParams.get('timeframeHours') || '24', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let briefingText: string;
    let briefingData = null;

    if (variant === 'quick') {
      briefingText = await generateQuickScanStatus(projectId);
    } else {
      const briefing = await generateScanBriefing(projectId, timeframeHours);
      briefingText = briefing.text;
      briefingData = briefing.data;
    }

    return NextResponse.json({
      success: true,
      text: briefingText,
      data: briefingData
    });

  } catch (error) {
    console.error('[API] Scan briefing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate scan briefing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
