/**
 * Screenshot executor - handles browser automation and screenshot capture
 */

import { Browser, Page } from 'playwright-core';
import { TestScenario, ScenarioAction } from '../scenarios';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ScreenshotResult {
  success: boolean;
  screenshotPath?: string;
  error?: string;
  metadata: {
    scenarioId: string;
    scenarioName: string;
    timestamp: string;
    duration: number;
  };
}

/**
 * Execute a single action in the browser
 */
async function executeAction(page: Page, action: ScenarioAction): Promise<void> {
  console.log(`[Executor] Executing action: ${action.type}${action.selector ? ` (selector: ${action.selector})` : ''}${action.url ? ` (url: ${action.url})` : ''}`);

  switch (action.type) {
    case 'navigate':
      if (!action.url) throw new Error('Navigate action requires URL');
      // Use 'domcontentloaded' instead of 'networkidle' for Next.js dev server
      // which has active connections (hot reload, fast refresh, etc.)
      await page.goto(action.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log(`[Executor] Navigation complete`);
      break;

    case 'click':
      if (!action.selector) throw new Error('Click action requires selector');
      // Wait for element to be visible and clickable before clicking
      console.log(`[Executor] Waiting for element: ${action.selector}`);
      await page.waitForSelector(action.selector, { state: 'visible', timeout: 10000 });
      console.log(`[Executor] Element found, clicking...`);
      await page.click(action.selector);
      console.log(`[Executor] Click complete`);
      break;

    case 'wait':
      const delay = action.delay || 1000;
      await page.waitForTimeout(delay);
      break;

    case 'scroll':
      const scrollY = action.scrollY || 0;
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      break;

    case 'type':
      if (!action.selector || !action.text) {
        throw new Error('Type action requires selector and text');
      }
      await page.fill(action.selector, action.text);
      break;

    default:
      throw new Error(`Unknown action type: ${(action as any).type}`);
  }
}

/**
 * Ensure screenshot directory exists
 */
async function ensureScreenshotDirectory(scenarioName: string): Promise<string> {
  const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots', scenarioName);
  await fs.mkdir(screenshotsDir, { recursive: true });
  return screenshotsDir;
}

/**
 * Execute a test scenario and capture screenshot
 */
export async function executeScenario(
  browser: Browser,
  scenario: TestScenario
): Promise<ScreenshotResult> {
  const startTime = Date.now();
  let page: Page | null = null;

  try {
    console.log(`[Executor] Starting scenario: ${scenario.name}`);
    console.log(`[Executor] Target URL: ${scenario.baseUrl}`);

    // Create new page/context
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      // Ignore HTTPS errors for localhost
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Add error listeners for debugging
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type}]`, msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.error('[Browser Page Error]', error.message);
    });

    page.on('requestfailed', (request) => {
      console.error('[Browser Request Failed]', request.url(), request.failure()?.errorText);
    });

    // Execute all actions in sequence
    for (const action of scenario.actions) {
      await executeAction(page, action);
    }

    // Ensure screenshot directory exists
    const screenshotDir = await ensureScreenshotDirectory(scenario.id);

    // Generate consistent filename (no timestamp - will replace existing file)
    const screenshotName = scenario.screenshotName || scenario.id;
    const filename = `${screenshotName}.png`;
    const screenshotPath = path.join(screenshotDir, filename);

    // Capture screenshot (will overwrite if file exists)
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`[Executor] Screenshot saved: ${screenshotPath}`);

    // Close page and context
    await context.close();

    const duration = Date.now() - startTime;

    return {
      success: true,
      screenshotPath: `/screenshots/${scenario.id}/${filename}`,
      metadata: {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  } catch (error) {
    console.error(`[Executor] Error executing scenario:`, error);

    // Clean up page if it exists
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('[Executor] Error closing page:', closeError);
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  }
}

/**
 * Execute multiple scenarios in sequence
 */
export async function executeScenarios(
  browser: Browser,
  scenarios: TestScenario[]
): Promise<ScreenshotResult[]> {
  const results: ScreenshotResult[] = [];

  for (const scenario of scenarios) {
    const result = await executeScenario(browser, scenario);
    results.push(result);
  }

  return results;
}
