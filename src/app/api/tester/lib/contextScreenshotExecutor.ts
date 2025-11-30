/**
 * Context Screenshot Executor
 * Parses test scenarios from context and executes them with Playwright
 * Includes comprehensive error handling and validation
 */

// Type import for browser - playwright is an optional dependency
type Browser = any;
type Page = any;
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
  errorType?: 'parse' | 'navigation' | 'selector' | 'timeout' | 'file' | 'unknown';
  duration?: number;
  stepsExecuted?: number;
  totalSteps?: number;
}

interface ScenarioStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll';
  target?: string;
  value?: string;
}

interface ParseResult {
  success: boolean;
  steps: ScenarioStep[];
  error?: string;
}

// Maximum limits for safety
const MAX_SCENARIO_LENGTH = 50000;
const MAX_STEPS = 100;
const MAX_WAIT_TIME = 30000;
const STEP_TIMEOUT = 15000;
const NAVIGATION_TIMEOUT = 30000;

/**
 * Validate input parameters
 */
function validateInput(input: ContextScenarioInput): { valid: boolean; error?: string } {
  if (!input.contextId || typeof input.contextId !== 'string') {
    return { valid: false, error: 'Invalid context ID' };
  }

  if (!input.contextName || typeof input.contextName !== 'string') {
    return { valid: false, error: 'Invalid context name' };
  }

  if (!input.scenario || typeof input.scenario !== 'string') {
    return { valid: false, error: 'Invalid scenario: must be a non-empty string' };
  }

  if (input.scenario.length > MAX_SCENARIO_LENGTH) {
    return { valid: false, error: `Scenario too long (max ${MAX_SCENARIO_LENGTH} characters)` };
  }

  if (!input.baseUrl || typeof input.baseUrl !== 'string') {
    return { valid: false, error: 'Invalid base URL' };
  }

  try {
    new URL(input.baseUrl);
  } catch {
    return { valid: false, error: 'Invalid base URL format' };
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(name: string): string {
  // Remove any characters that could be used for path traversal
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Execute a test scenario from context
 */
export async function executeContextScenario(
  browser: Browser,
  input: ContextScenarioInput
): Promise<ScenarioResult> {
  const startTime = Date.now();
  let page: Page | null = null;
  let stepsExecuted = 0;

  try {
    console.log(`[ContextScreenshot] Executing scenario for: ${input.contextName}`);

    // Validate input
    const validation = validateInput(input);
    if (!validation.valid) {
      console.error(`[ContextScreenshot] Validation failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error,
        errorType: 'parse',
        duration: Date.now() - startTime,
      };
    }

    // Validate browser instance
    if (!browser || typeof browser.newPage !== 'function') {
      console.error('[ContextScreenshot] Invalid browser instance');
      return {
        success: false,
        error: 'Invalid browser instance',
        errorType: 'unknown',
        duration: Date.now() - startTime,
      };
    }

    // Parse scenario into steps
    const parseResult = parseScenario(input.scenario);
    if (!parseResult.success) {
      console.error(`[ContextScreenshot] Parse failed: ${parseResult.error}`);
      return {
        success: false,
        error: parseResult.error,
        errorType: 'parse',
        duration: Date.now() - startTime,
        stepsExecuted: 0,
        totalSteps: 0,
      };
    }

    const steps = parseResult.steps;
    console.log(`[ContextScreenshot] Parsed ${steps.length} steps from scenario`);

    if (steps.length === 0) {
      return {
        success: false,
        error: 'No valid steps found in scenario',
        errorType: 'parse',
        duration: Date.now() - startTime,
        stepsExecuted: 0,
        totalSteps: 0,
      };
    }

    // Create new page with error handling
    try {
      page = await browser.newPage();
    } catch (err) {
      console.error('[ContextScreenshot] Failed to create page:', err);
      return {
        success: false,
        error: 'Failed to create browser page',
        errorType: 'unknown',
        duration: Date.now() - startTime,
      };
    }

    // Execute each step with individual error handling
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        await executeStep(page, step, input.baseUrl);
        stepsExecuted++;
      } catch (stepError) {
        const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
        let errorType: ScenarioResult['errorType'] = 'unknown';

        if (errorMessage.includes('selector') || errorMessage.includes('locator')) {
          errorType = 'selector';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          errorType = 'timeout';
        } else if (errorMessage.includes('navigation') || errorMessage.includes('Navigate')) {
          errorType = 'navigation';
        }

        console.error(`[ContextScreenshot] Step ${i + 1} failed:`, stepError);

        // Clean up page
        await safeClosePage(page);

        return {
          success: false,
          error: `Step ${i + 1} (${step.type}) failed: ${errorMessage}`,
          errorType,
          duration: Date.now() - startTime,
          stepsExecuted,
          totalSteps: steps.length,
        };
      }
    }

    // Generate screenshot filename safely
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = sanitizeFilename(input.contextName);
    const filename = `${sanitizedName}-${timestamp}.png`;
    const screenshotDir = join(process.cwd(), 'public', 'screenshots', 'contexts');
    const screenshotPath = join(screenshotDir, filename);

    // Ensure directory exists with error handling
    try {
      const { mkdirSync, existsSync } = await import('fs');
      if (!existsSync(screenshotDir)) {
        mkdirSync(screenshotDir, { recursive: true });
      }
    } catch (dirError) {
      console.error('[ContextScreenshot] Failed to create directory:', dirError);
      await safeClosePage(page);
      return {
        success: false,
        error: 'Failed to create screenshot directory',
        errorType: 'file',
        duration: Date.now() - startTime,
        stepsExecuted,
        totalSteps: steps.length,
      };
    }

    // Take screenshot with error handling
    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        timeout: 30000,
      });
      console.log(`[ContextScreenshot] ✅ Screenshot saved: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error('[ContextScreenshot] Screenshot failed:', screenshotError);
      await safeClosePage(page);
      return {
        success: false,
        error: `Failed to save screenshot: ${screenshotError instanceof Error ? screenshotError.message : 'Unknown error'}`,
        errorType: 'file',
        duration: Date.now() - startTime,
        stepsExecuted,
        totalSteps: steps.length,
      };
    }

    // Close page
    await safeClosePage(page);

    const duration = Date.now() - startTime;

    return {
      success: true,
      screenshotPath: `/screenshots/contexts/${filename}`,
      duration,
      stepsExecuted,
      totalSteps: steps.length,
    };
  } catch (error) {
    console.error('[ContextScreenshot] Unexpected error:', error);

    await safeClosePage(page);

    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: 'unknown',
      duration,
      stepsExecuted,
    };
  }
}

/**
 * Safely close a page without throwing
 */
async function safeClosePage(page: Page | null): Promise<void> {
  if (!page) return;

  try {
    await page.close();
  } catch (closeError) {
    console.error('[ContextScreenshot] Error closing page:', closeError);
  }
}

/**
 * Parse scenario text into executable steps
 * Handles both JSON array format and natural language text
 */
function parseScenario(scenario: string): ParseResult {
  if (!scenario || typeof scenario !== 'string') {
    return { success: false, steps: [], error: 'Invalid scenario input' };
  }

  const trimmedScenario = scenario.trim();
  if (trimmedScenario.length === 0) {
    return { success: false, steps: [], error: 'Empty scenario' };
  }

  // Try parsing as JSON first (new structured format)
  try {
    const parsed = JSON.parse(trimmedScenario);
    if (Array.isArray(parsed)) {
      console.log('[ContextScreenshot] Parsing JSON array format');

      if (parsed.length > MAX_STEPS) {
        return {
          success: false,
          steps: [],
          error: `Too many steps (max ${MAX_STEPS})`,
        };
      }

      const steps: ScenarioStep[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const step = parsed[i];
        if (!step || typeof step !== 'object') {
          console.warn(`[ContextScreenshot] Invalid step at index ${i}`);
          continue;
        }

        if (step.type === 'navigate') {
          if (!step.url || typeof step.url !== 'string') {
            console.warn(`[ContextScreenshot] Navigate step ${i} missing URL`);
            continue;
          }
          steps.push({ type: 'navigate', target: step.url });
        } else if (step.type === 'wait') {
          const delay = parseInt(step.delay) || 1000;
          const safeDelay = Math.min(Math.max(delay, 0), MAX_WAIT_TIME);
          steps.push({ type: 'wait', value: safeDelay.toString() });
        } else if (step.type === 'click') {
          if (!step.selector || typeof step.selector !== 'string') {
            console.warn(`[ContextScreenshot] Click step ${i} missing selector`);
            continue;
          }
          steps.push({ type: 'click', target: step.selector });
        } else if (step.type === 'type') {
          if (!step.selector || !step.text) {
            console.warn(`[ContextScreenshot] Type step ${i} missing selector or text`);
            continue;
          }
          steps.push({ type: 'type', target: step.selector, value: step.text });
        } else if (step.type === 'scroll') {
          steps.push({ type: 'scroll' });
        } else {
          // Unknown type - add a wait as fallback
          console.warn(`[ContextScreenshot] Unknown step type at index ${i}: ${step.type}`);
          steps.push({ type: 'wait', value: '1000' });
        }
      }

      return { success: true, steps };
    }
  } catch (e) {
    // Not JSON, fall through to natural language parsing
    console.log('[ContextScreenshot] Parsing natural language format');
  }

  // Natural language parsing (legacy format)
  const steps: ScenarioStep[] = [];
  const lines = trimmedScenario.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Parse numbered steps (e.g., "1. Navigate to /dashboard")
    const numberedMatch = line.match(/^\d+\.\s*(.+)/);
    if (numberedMatch) {
      const step = parseStepText(numberedMatch[1]);
      if (step) {
        steps.push(step);
        if (steps.length >= MAX_STEPS) break;
      }
      continue;
    }

    // Parse bullet points (e.g., "- Click on Settings")
    const bulletMatch = line.match(/^[-*]\s*(.+)/);
    if (bulletMatch) {
      const step = parseStepText(bulletMatch[1]);
      if (step) {
        steps.push(step);
        if (steps.length >= MAX_STEPS) break;
      }
      continue;
    }

    // Try parsing as plain text
    const step = parseStepText(line);
    if (step) {
      steps.push(step);
      if (steps.length >= MAX_STEPS) break;
    }
  }

  return { success: true, steps };
}

/**
 * Parse individual step text into action
 */
function parseStepText(text: string): ScenarioStep | null {
  if (!text || typeof text !== 'string') return null;

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
      const safeMs = Math.min(Math.max(ms, 0), MAX_WAIT_TIME);
      return { type: 'wait', value: safeMs.toString() };
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
 * Execute a single step with timeout and error handling
 */
async function executeStep(page: Page, step: ScenarioStep, baseUrl: string): Promise<void> {
  console.log(`[ContextScreenshot] Executing step:`, step);

  switch (step.type) {
    case 'navigate':
      try {
        const url = step.target?.startsWith('/') ? `${baseUrl}${step.target}` : step.target;
        const targetUrl = url || baseUrl;

        // Validate URL
        try {
          new URL(targetUrl);
        } catch {
          throw new Error(`Invalid navigation URL: ${targetUrl}`);
        }

        await page.goto(targetUrl, { timeout: NAVIGATION_TIMEOUT });

        // Use domcontentloaded instead of networkidle for faster execution
        // networkidle can hang on pages with persistent connections
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: NAVIGATION_TIMEOUT });
        } catch {
          console.warn('[ContextScreenshot] Load state wait timed out, continuing...');
        }
      } catch (navError) {
        throw new Error(`Navigation failed: ${navError instanceof Error ? navError.message : 'Unknown error'}`);
      }
      break;

    case 'click':
      if (!step.target) {
        throw new Error('Click step missing selector');
      }
      try {
        // Wait for element to be visible before clicking
        await page.waitForSelector(step.target, { state: 'visible', timeout: STEP_TIMEOUT });
        await page.click(step.target, { timeout: STEP_TIMEOUT });
        await page.waitForTimeout(500); // Wait for UI to update
      } catch (clickError) {
        throw new Error(`Click failed on "${step.target}": ${clickError instanceof Error ? clickError.message : 'Unknown error'}`);
      }
      break;

    case 'type':
      if (!step.target) {
        throw new Error('Type step missing selector');
      }
      if (step.value === undefined) {
        throw new Error('Type step missing value');
      }
      try {
        await page.waitForSelector(step.target, { state: 'visible', timeout: STEP_TIMEOUT });
        await page.fill(step.target, step.value, { timeout: STEP_TIMEOUT });
        await page.waitForTimeout(300);
      } catch (typeError) {
        throw new Error(`Type failed on "${step.target}": ${typeError instanceof Error ? typeError.message : 'Unknown error'}`);
      }
      break;

    case 'wait':
      const waitTime = step.value ? parseInt(step.value) : 1000;
      const safeWaitTime = Math.min(Math.max(waitTime, 0), MAX_WAIT_TIME);
      await page.waitForTimeout(safeWaitTime);
      break;

    case 'scroll':
      try {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
      } catch (scrollError) {
        console.warn('[ContextScreenshot] Scroll failed:', scrollError);
        // Don't throw - scroll failures are non-critical
      }
      break;

    default:
      console.warn(`[ContextScreenshot] Unknown step type: ${(step as ScenarioStep).type}`);
  }
}
