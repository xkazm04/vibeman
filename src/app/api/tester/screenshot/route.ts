/**
 * Screenshot API endpoint
 * POST /api/tester/screenshot
 * Executes test scenarios from context and captures screenshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDb } from '@/app/db';
import { projectDb } from '@/lib/project_database';
import { connectToBrowser } from '../lib/browserbase';
import { executeContextScenario } from '../lib/contextScreenshotExecutor';
import { logger } from '@/lib/logger';

export const maxDuration = 60; // 60 seconds max execution time
export const dynamic = 'force-dynamic';

interface ScreenshotRequest {
  contextId: string;
  scanOnly?: boolean; // Pre-scan mode to check if scenario exists
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
    logger.info(`[Screenshot API] Checking server accessibility: ${url}`);
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

    logger.info(`[Screenshot API] ✅ Server is accessible`);
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
    const { contextId, scanOnly = false } = body;

    logger.info('[Screenshot API] Request received:', { contextId, scanOnly });

    // Validate request
    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    // Get context from database
    const context = contextDb.getContextById(contextId);
    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    // Calculate days since last test
    let daysAgo: number | null = null;
    if (context.test_updated) {
      const lastTest = new Date(context.test_updated);
      const now = new Date();
      const diffMs = now.getTime() - lastTest.getTime();
      daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    // Check if test scenario exists
    if (!context.test_scenario || context.test_scenario.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'No test scenario found',
        contextId: context.id,
        contextName: context.name,
        hasScenario: false,
        daysAgo: null,
      });
    }

    // If scanOnly mode, return scenario info
    if (scanOnly) {
      return NextResponse.json({
        success: true,
        contextId: context.id,
        contextName: context.name,
        hasScenario: true,
        scenario: context.test_scenario,
        daysAgo,
      });
    }

    // Get project details for base URL
    const project = projectDb.getProject(context.project_id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Construct base URL (assume localhost dev server)
    const baseUrl = `http://localhost:${project.port || 3000}`;

    // Pre-check: Verify server is accessible
    try {
      await checkServerAccessibility(baseUrl);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Dev server not accessible',
          details: error instanceof Error ? error.message : 'Unknown error',
          hint: `Make sure your dev server is running on port ${project.port || 3000}`,
        },
        { status: 503 }
      );
    }

    // Connect to browser (force local for localhost)
    browser = await connectToBrowser(true);
    logger.info('[Screenshot API] Browser connected');

    // Execute context scenario
    logger.info(`[Screenshot API] Executing scenario for context: ${context.name}`);
    const result = await executeContextScenario(
      browser,
      {
        contextId: context.id,
        contextName: context.name,
        scenario: context.test_scenario,
        baseUrl,
      }
    );

    // Close browser
    await browser.close();
    logger.info('[Screenshot API] Browser closed');

    // Update test_updated timestamp and preview path if successful
    if (result.success && result.screenshotPath) {
      const now = new Date().toISOString();
      const updated = contextDb.updateContext(contextId, {
        test_updated: now,
        preview: result.screenshotPath, // Update preview with screenshot path
      });
      logger.info(`[Screenshot API] ✅ Updated test_updated and preview for context: ${context.name}`);
      logger.info(`[Screenshot API] Updated context:`, { updated });
      logger.info(`[Screenshot API] Preview path saved:`, { data: result.screenshotPath });
    }

    // Return result
    return NextResponse.json({
      success: result.success,
      contextId: context.id,
      contextName: context.name,
      screenshotPath: result.screenshotPath,
      error: result.error,
      duration: result.duration,
    });
  } catch (error) {
    logger.error('[Screenshot API] Error:', { error });

    // Cleanup browser if it exists
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        logger.error('[Screenshot API] Error closing browser:', { closeError });
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
 * GET endpoint to check screenshot status for a context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    const context = contextDb.getContextById(contextId);
    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    // Calculate days since last test
    let daysAgo: number | null = null;
    if (context.test_updated) {
      const lastTest = new Date(context.test_updated);
      const now = new Date();
      const diffMs = now.getTime() - lastTest.getTime();
      daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      contextId: context.id,
      contextName: context.name,
      hasScenario: !!(context.test_scenario && context.test_scenario.trim()),
      testUpdated: context.test_updated,
      daysAgo,
    });
  } catch (error) {
    logger.error('[Screenshot API] Error:', { error });

    return NextResponse.json(
      {
        error: 'Failed to get screenshot status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
