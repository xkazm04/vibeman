import { NextRequest, NextResponse } from 'next/server';
import { generateScanBriefing, generateQuickScanStatus } from '@/app/features/Annette/lib/scanBriefingService';
import { logger } from '@/lib/logger';


interface ScanBriefingResponse {
  success: boolean;
  text?: string;
  data?: unknown;
  error?: string;
  details?: string;
}

/**
 * Validate request parameters
 */
function validateRequest(searchParams: URLSearchParams): { valid: boolean; error?: string; projectId?: string } {
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return { valid: false, error: 'Project ID is required' };
  }

  return { valid: true, projectId };
}

/**
 * Generate briefing based on variant
 */
async function generateBriefing(
  variant: string,
  projectId: string,
  timeframeHours: number
): Promise<{ text: string; data?: unknown }> {
  if (variant === 'quick') {
    const text = await generateQuickScanStatus(projectId);
    return { text };
  }

  const briefing = await generateScanBriefing(projectId, timeframeHours);
  return { text: briefing.text, data: briefing.data };
}

/**
 * GET /api/annette/scan-briefing
 * Generate a scan status briefing for voicebot
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validation = validateRequest(searchParams);

    if (!validation.valid || !validation.projectId) {
      return NextResponse.json<ScanBriefingResponse>(
        { success: false, error: validation.error || 'Validation failed' },
        { status: 400 }
      );
    }

    const variant = searchParams.get('variant') || 'full';
    const timeframeHours = parseInt(searchParams.get('timeframeHours') || '24', 10);

    const { text, data } = await generateBriefing(variant, validation.projectId, timeframeHours);

    return NextResponse.json<ScanBriefingResponse>({
      success: true,
      text,
      data
    });

  } catch (error) {
    logger.error('Scan briefing error:', error);
    return NextResponse.json<ScanBriefingResponse>(
      {
        success: false,
        error: 'Failed to generate scan briefing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
