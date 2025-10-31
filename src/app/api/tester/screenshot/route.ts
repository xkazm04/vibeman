/**
 * Screenshot API endpoint
 * POST /api/tester/screenshot
 * Executes test scenarios and captures screenshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScenario, getAllScenarios } from '../scenarios';
import { connectToBrowser } from '../lib/browserbase';
import { executeScenario, executeScenarios } from '../lib/screenshotExecutor';

export const maxDuration = 60; // 60 seconds max execution time
export const dynamic = 'force-dynamic';

interface ScreenshotRequest {
  scenarioId?: string;
  scenarioIds?: string[];
  executeAll?: boolean;
}

/**
 * Check if URL is localhost
 */
function isLocalhostUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Pre-check: Verify target URL is accessible
 */
async function checkServerAccessibility(url: string): Promise<void> {
  try {
    console.log(`[Screenshot API] Checking server accessibility: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    console.log(`[Screenshot API] ✅ Server is accessible`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Cannot connect to ${url}. Is your dev server running? Try: npm run dev`
      );
    }
    throw new Error(
      `Cannot connect to ${url}. Error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
  }
}

export async function POST(request: NextRequest) {
  let browser;

  try {
    const body: ScreenshotRequest = await request.json();
    const { scenarioId, scenarioIds, executeAll } = body;

    console.log('[Screenshot API] Request received:', body);

    // Validate request
    if (!scenarioId && !scenarioIds && !executeAll) {
      return NextResponse.json(
        { error: 'Must provide scenarioId, scenarioIds, or executeAll flag' },
        { status: 400 }
      );
    }

    // Determine which scenarios to check
    let scenariosToCheck: any[] = [];
    if (executeAll) {
      scenariosToCheck = getAllScenarios();
    } else if (scenarioIds && scenarioIds.length > 0) {
      scenariosToCheck = scenarioIds
        .map((id) => getScenario(id))
        .filter((s) => s !== null);
    } else if (scenarioId) {
      const scenario = getScenario(scenarioId);
      if (scenario) scenariosToCheck = [scenario];
    }

    // Check if any scenario uses localhost
    const usesLocalhost = scenariosToCheck.some((s) => isLocalhostUrl(s.baseUrl));

    // Pre-check: Verify server is accessible (for localhost URLs)
    if (usesLocalhost && scenariosToCheck.length > 0) {
      try {
        await checkServerAccessibility(scenariosToCheck[0].baseUrl);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Server not accessible',
            details: error instanceof Error ? error.message : 'Unknown error',
            hint: 'Make sure your dev server is running on the correct port',
          },
          { status: 503 }
        );
      }
    }

    // Connect to browser (force local for localhost URLs)
    browser = await connectToBrowser(usesLocalhost);
    console.log('[Screenshot API] Browser connected');

    // Determine which scenarios to execute
    let results;

    if (executeAll) {
      // Execute all scenarios
      const scenarios = getAllScenarios();
      console.log(`[Screenshot API] Executing all ${scenarios.length} scenarios`);
      results = await executeScenarios(browser, scenarios);
    } else if (scenarioIds && scenarioIds.length > 0) {
      // Execute multiple specific scenarios
      const scenarios = scenarioIds
        .map((id) => getScenario(id))
        .filter((s) => s !== null);

      if (scenarios.length === 0) {
        return NextResponse.json(
          { error: 'No valid scenarios found' },
          { status: 404 }
        );
      }

      console.log(`[Screenshot API] Executing ${scenarios.length} scenarios`);
      results = await executeScenarios(browser, scenarios as any);
    } else if (scenarioId) {
      // Execute single scenario
      const scenario = getScenario(scenarioId);

      if (!scenario) {
        return NextResponse.json(
          { error: `Scenario not found: ${scenarioId}` },
          { status: 404 }
        );
      }

      console.log(`[Screenshot API] Executing scenario: ${scenario.name}`);
      const result = await executeScenario(browser, scenario);
      results = [result];
    } else {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Close browser
    await browser.close();
    console.log('[Screenshot API] Browser closed');

    // Return results
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error('[Screenshot API] Error:', error);

    // Cleanup browser if it exists
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[Screenshot API] Error closing browser:', closeError);
      }
    }

    return NextResponse.json(
      {
        error: 'Screenshot execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to list available scenarios
 */
export async function GET() {
  try {
    const scenarios = getAllScenarios();

    return NextResponse.json({
      scenarios: scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        actionCount: s.actions.length,
      })),
    });
  } catch (error) {
    console.error('[Screenshot API] Error listing scenarios:', error);

    return NextResponse.json(
      {
        error: 'Failed to list scenarios',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
