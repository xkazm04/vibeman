import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { getTestCases } from '@/lib/personas/testing/testCases';
import { runTestSuite } from '@/lib/personas/testing/testRunner';
import * as path from 'path';
import * as os from 'os';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get('latest');
    const connectors = searchParams.get('connectors');

    let reviews;
    if (connectors) {
      const connectorList = connectors.split(',').map(c => c.trim());
      reviews = personaDb.designReviews.filterByConnectors(connectorList);
    } else if (latest === 'true') {
      reviews = personaDb.designReviews.getLatestByTestCase();
    } else {
      reviews = personaDb.designReviews.getAll();
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching design reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch design reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { useCaseIds, customInstructions } = body as { useCaseIds?: string[]; customInstructions?: string[] };

    let useCases = getTestCases(useCaseIds);

    // Add custom instructions as ad-hoc test cases
    if (customInstructions && customInstructions.length > 0) {
      const { createCustomTestCases } = require('@/lib/personas/testing/testCases');
      const customCases = createCustomTestCases(customInstructions);
      useCases = [...useCases, ...customCases];
    }

    if (useCases.length === 0) {
      return NextResponse.json({ error: 'No valid test cases or instructions provided' }, { status: 400 });
    }

    const testRunId = `trun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const outputDir = path.join(os.tmpdir(), '.claude-design-tests', 'runs', testRunId);

    // Start test suite in background (non-blocking)
    runTestSuite({ testRunId, useCases, outputDir }).catch((err) => {
      console.error(`[DesignReview] Test run ${testRunId} failed:`, err);
    });

    return NextResponse.json({ testRunId, status: 'started', totalTests: useCases.length });
  } catch (error) {
    console.error('Error starting design review run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start design review' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { olderThan } = body as { olderThan: string };

    if (!olderThan) {
      return NextResponse.json({ error: 'olderThan date required' }, { status: 400 });
    }

    personaDb.designReviews.deleteOlderThan(olderThan);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting design reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete design reviews' },
      { status: 500 }
    );
  }
}
