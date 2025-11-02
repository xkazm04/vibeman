/**
 * Context Screenshot Executor
 * Parses test scenarios from context and executes them with Playwright
 */

import { Browser } from 'playwright';
import { join } from 'path';

export interface ContextScenarioInput {
  contextId: string;
  contextName: string;
  scenario: string; // Can be JSON array or natural language text
  baseUrl: string;
}

export interface ScenarioResult {
  success: boolean;
  screenshotPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Execute a test scenario from context
 */
export async function executeContextScenario(
  browser: Browser,
  input: ContextScenarioInput
): Promise<ScenarioResult> {
  const startTime = Date.now();
  let page;

  try {
    console.log(`[ContextScreenshot] Executing scenario for: ${input.contextName}`);

    // Create new page
    page = await browser.newPage();

    // Parse scenario into steps (handles both JSON array and natural language)
    const steps = parseScenario(input.scenario);
    console.log(`[ContextScreenshot] Parsed ${steps.length} steps from scenario`);

    // Execute each step
    for (const step of steps) {
      await executeStep(page, step, input.baseUrl);
    }

    // Generate screenshot filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${input.contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.png`;
    const screenshotDir = join(process.cwd(), 'public', 'screenshots', 'contexts');
    const screenshotPath = join(screenshotDir, filename);

    // Ensure directory exists
    const { mkdirSync, existsSync } = await import('fs');
    if (!existsSync(screenshotDir)) {
      mkdirSync(screenshotDir, { recursive: true });
    }

    // Take screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`[ContextScreenshot] ✅ Screenshot saved: ${screenshotPath}`);

    // Close page
    await page.close();

    const duration = Date.now() - startTime;

    return {
      success: true,
      screenshotPath: `/screenshots/contexts/${filename}`,
      duration,
    };
  } catch (error) {
    console.error('[ContextScreenshot] Error:', error);

    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('[ContextScreenshot] Error closing page:', closeError);
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Parse scenario text into executable steps
 * Handles both JSON array format and natural language text
 */
function parseScenario(scenario: string): ScenarioStep[] {
  const steps: ScenarioStep[] = [];

  // Try parsing as JSON first (new structured format)
  try {
    const parsed = JSON.parse(scenario);
    if (Array.isArray(parsed)) {
      console.log('[ContextScreenshot] Parsing JSON array format');
      return parsed.map((step: any) => {
        if (step.type === 'navigate') {
          return { type: 'navigate', target: step.url };
        } else if (step.type === 'wait') {
          return { type: 'wait', value: step.delay?.toString() || '1000' };
        } else if (step.type === 'click') {
          return { type: 'click', target: step.selector };
        }
        return { type: 'wait', value: '1000' };
      });
    }
  } catch (e) {
    // Not JSON, fall through to natural language parsing
    console.log('[ContextScreenshot] Parsing natural language format');
  }

  // Natural language parsing (legacy format)
  const lines = scenario.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Parse numbered steps (e.g., "1. Navigate to /dashboard")
    const numberedMatch = line.match(/^\d+\.\s*(.+)/);
    if (numberedMatch) {
      const step = parseStepText(numberedMatch[1]);
      if (step) steps.push(step);
      continue;
    }

    // Parse bullet points (e.g., "- Click on Settings")
    const bulletMatch = line.match(/^[-*]\s*(.+)/);
    if (bulletMatch) {
      const step = parseStepText(bulletMatch[1]);
      if (step) steps.push(step);
      continue;
    }

    // Try parsing as plain text
    const step = parseStepText(line);
    if (step) steps.push(step);
  }

  return steps;
}

interface ScenarioStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll';
  target?: string;
  value?: string;
}

/**
 * Parse individual step text into action
 */
function parseStepText(text: string): ScenarioStep | null {
  const lowerText = text.toLowerCase();

  // Navigate patterns
  if (lowerText.includes('navigate') || lowerText.includes('go to') || lowerText.includes('open')) {
    const pathMatch = text.match(/\/([\w\-/]*)/);
    if (pathMatch) {
      return { type: 'navigate', target: pathMatch[0] };
    }
  }

  // Click patterns
  if (lowerText.includes('click')) {
    // Try to extract data-testid
    const testidMatch = text.match(/['"`]([^'"`]+)['"`]/);
    if (testidMatch) {
      return { type: 'click', target: `[data-testid="${testidMatch[1]}"]` };
    }
    // Try to extract button text
    const buttonMatch = text.match(/click (?:on |the )?['"`]?([^'"`]+?)['"`]?\s*(?:button)?$/i);
    if (buttonMatch) {
      return { type: 'click', target: `text=${buttonMatch[1]}` };
    }
  }

  // Type patterns
  if (lowerText.includes('type') || lowerText.includes('enter') || lowerText.includes('fill')) {
    const parts = text.split(/into|in/i);
    if (parts.length === 2) {
      const value = parts[0].replace(/type|enter|fill/i, '').trim().replace(/['"`]/g, '');
      const testidMatch = parts[1].match(/['"`]([^'"`]+)['"`]/);
      if (testidMatch) {
        return { type: 'type', target: `[data-testid="${testidMatch[1]}"]`, value };
      }
    }
  }

  // Wait patterns
  if (lowerText.includes('wait')) {
    const timeMatch = text.match(/(\d+)\s*(ms|milliseconds|s|seconds)?/);
    if (timeMatch) {
      const time = parseInt(timeMatch[1]);
      const unit = timeMatch[2] || 's';
      const ms = unit.startsWith('s') ? time * 1000 : time;
      return { type: 'wait', value: ms.toString() };
    }
    return { type: 'wait', value: '1000' }; // Default 1 second
  }

  // Scroll patterns
  if (lowerText.includes('scroll')) {
    return { type: 'scroll' };
  }

  return null;
}

/**
 * Execute a single step
 */
async function executeStep(page: any, step: ScenarioStep, baseUrl: string): Promise<void> {
  console.log(`[ContextScreenshot] Executing step:`, step);

  switch (step.type) {
    case 'navigate':
      const url = step.target?.startsWith('/') ? `${baseUrl}${step.target}` : step.target;
      await page.goto(url || baseUrl);
      await page.waitForLoadState('networkidle');
      break;

    case 'click':
      if (step.target) {
        await page.click(step.target);
        await page.waitForTimeout(500); // Wait for UI to update
      }
      break;

    case 'type':
      if (step.target && step.value) {
        await page.fill(step.target, step.value);
        await page.waitForTimeout(300);
      }
      break;

    case 'wait':
      const waitTime = step.value ? parseInt(step.value) : 1000;
      await page.waitForTimeout(waitTime);
      break;

    case 'scroll':
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      break;

    default:
      console.warn(`[ContextScreenshot] Unknown step type: ${step.type}`);
  }
}
