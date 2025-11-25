/**
 * Refactor Analysis Results API
 *
 * Retrieves the stored results of a completed refactor analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/api-helpers';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  try {
    const { queueId } = await params;

    if (!queueId) {
      return createErrorResponse('Queue ID is required', 400);
    }

    // Results are stored in a temporary file during background processing
    const resultsPath = path.join(process.cwd(), 'temp', 'refactor-results', `${queueId}.json`);

    try {
      const resultsData = await fs.readFile(resultsPath, 'utf-8');
      const results = JSON.parse(resultsData);

      return NextResponse.json(results);
    } catch (error) {
      // If file doesn't exist, return empty result
      return NextResponse.json({
        opportunities: [],
        summary: {},
        wizardPlan: null,
        packages: [],
        context: null,
        dependencyGraph: null,
      });
    }
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to retrieve results',
      500
    );
  }
}
