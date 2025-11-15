/**
 * Playwright Test Skeleton Generator
 * Generates executable Playwright test code from test scenarios
 */

import type { UserFlowStep } from '@/app/db';

/**
 * Generate Playwright test code from user flow steps
 */
export function generatePlaywrightTest(
  scenarioName: string,
  description: string,
  userFlows: UserFlowStep[],
  baseUrl: string = 'http://localhost:3000'
): string {
  const testName = scenarioName.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();

  let code = `import { test, expect } from '@playwright/test';

/**
 * Test: ${scenarioName}
 * ${description}
 * Generated: ${new Date().toISOString()}
 */
test.describe('${scenarioName}', () => {
  test('${description}', async ({ page }) => {
    // Navigate to the application
    await page.goto('${baseUrl}');
`;

  // Generate steps
  for (const step of userFlows) {
    code += `\n    // Step ${step.step}: ${step.description}\n`;

    switch (step.action) {
      case 'click':
        code += `    await page.locator('${step.selector}').click();\n`;
        if (step.expectedOutcome) {
          code += `    // Expected: ${step.expectedOutcome}\n`;
        }
        break;

      case 'type':
        code += `    await page.locator('${step.selector}').fill('${step.value || ''}');\n`;
        if (step.expectedOutcome) {
          code += `    // Expected: ${step.expectedOutcome}\n`;
        }
        break;

      case 'scroll':
        code += `    await page.locator('${step.selector}').scrollIntoViewIfNeeded();\n`;
        break;

      case 'hover':
        code += `    await page.locator('${step.selector}').hover();\n`;
        break;

      case 'wait':
        code += `    await page.waitForSelector('${step.selector}');\n`;
        break;

      case 'assert':
        if (step.value) {
          code += `    await expect(page.locator('${step.selector}')).toHaveText('${step.value}');\n`;
        } else {
          code += `    await expect(page.locator('${step.selector}')).toBeVisible();\n`;
        }
        break;

      case 'screenshot':
        const screenshotName = `${testName}_step_${step.step}.png`;
        code += `    await page.screenshot({ path: 'screenshots/${screenshotName}', fullPage: true });\n`;
        break;

      default:
        code += `    // TODO: Implement ${step.action} action for ${step.selector}\n`;
    }
  }

  // Add final screenshot
  code += `\n    // Take final screenshot for visual regression\n`;
  code += `    await page.screenshot({ path: 'screenshots/${testName}_final.png', fullPage: true });\n`;

  code += `  });
});
`;

  return code;
}

/**
 * Generate test with visual regression
 */
export function generateVisualRegressionTest(
  scenarioName: string,
  description: string,
  userFlows: UserFlowStep[],
  baseUrl: string = 'http://localhost:3000'
): string {
  const testName = scenarioName.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();

  let code = `import { test, expect } from '@playwright/test';
import { compareScreenshots } from './utils/visual-diff';

/**
 * Visual Regression Test: ${scenarioName}
 * ${description}
 * Generated: ${new Date().toISOString()}
 */
test.describe('${scenarioName} - Visual Regression', () => {
  test('${description}', async ({ page }) => {
    // Navigate to the application
    await page.goto('${baseUrl}');

    const screenshots = [];
`;

  // Generate steps with screenshots
  for (const step of userFlows) {
    code += `\n    // Step ${step.step}: ${step.description}\n`;

    // Add the action
    switch (step.action) {
      case 'click':
        code += `    await page.locator('${step.selector}').click();\n`;
        break;
      case 'type':
        code += `    await page.locator('${step.selector}').fill('${step.value || ''}');\n`;
        break;
      case 'scroll':
        code += `    await page.locator('${step.selector}').scrollIntoViewIfNeeded();\n`;
        break;
      case 'hover':
        code += `    await page.locator('${step.selector}').hover();\n`;
        break;
      case 'wait':
        code += `    await page.waitForSelector('${step.selector}');\n`;
        break;
    }

    // Take screenshot after each major action
    if (['click', 'type'].includes(step.action)) {
      code += `    await page.waitForTimeout(500); // Wait for animations\n`;
      code += `    const screenshot${step.step} = await page.screenshot({ fullPage: true });\n`;
      code += `    screenshots.push({ name: '${step.description}', buffer: screenshot${step.step} });\n`;
    }
  }

  code += `
    // Store screenshots for comparison
    // In a real implementation, these would be compared against baselines
    for (const { name, buffer } of screenshots) {
      // await compareScreenshots(name, buffer, '${testName}');
      console.log(\`Screenshot captured: \${name}\`);
    }
  });
});
`;

  return code;
}

/**
 * Generate test configuration file
 */
export function generatePlaywrightConfig(projectName: string, baseUrl: string): string {
  return `import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ${projectName}
 * Generated: ${new Date().toISOString()}
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: '${baseUrl}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: '${baseUrl}',
    reuseExistingServer: !process.env.CI,
  },
});
`;
}

/**
 * Generate utility for visual diff comparison
 */
export function generateVisualDiffUtility(): string {
  return `import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Compare two screenshots and generate a diff image
 */
export async function compareScreenshots(
  name: string,
  currentBuffer: Buffer,
  testName: string
): Promise<{
  diffPercentage: number;
  hasDifferences: boolean;
  diffImagePath?: string;
}> {
  const baselinePath = join('screenshots', 'baselines', \`\${testName}_\${name}.png\`);
  const currentPath = join('screenshots', 'current', \`\${testName}_\${name}.png\`);
  const diffPath = join('screenshots', 'diffs', \`\${testName}_\${name}_diff.png\`);

  // Save current screenshot
  await writeFile(currentPath, currentBuffer);

  try {
    // Load baseline image
    const baselineBuffer = await readFile(baselinePath);
    const baseline = PNG.sync.read(baselineBuffer);
    const current = PNG.sync.read(currentBuffer);

    // Ensure dimensions match
    if (baseline.width !== current.width || baseline.height !== current.height) {
      console.warn(\`Dimension mismatch for \${name}\`);
      return { diffPercentage: 100, hasDifferences: true };
    }

    // Create diff image
    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const numDiffPixels = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      baseline.width,
      baseline.height,
      { threshold: 0.1 }
    );

    const diffPercentage = (numDiffPixels / (baseline.width * baseline.height)) * 100;
    const hasDifferences = diffPercentage > 0.1; // 0.1% threshold

    if (hasDifferences) {
      // Save diff image
      await writeFile(diffPath, PNG.sync.write(diff));
      return { diffPercentage, hasDifferences, diffImagePath: diffPath };
    }

    return { diffPercentage, hasDifferences: false };
  } catch (error) {
    // No baseline exists, save current as baseline
    console.log(\`Creating baseline for \${name}\`);
    await writeFile(baselinePath, currentBuffer);
    return { diffPercentage: 0, hasDifferences: false };
  }
}
`;
}

/**
 * Generate package.json scripts for testing
 */
export function generateTestScripts(): Record<string, string> {
  return {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report",
    "test:codegen": "playwright codegen"
  };
}
