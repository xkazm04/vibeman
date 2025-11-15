/**
 * API Route: Execute Test Scenario
 * POST /api/test-scenarios/execute
 * Executes a test scenario using Playwright
 */

import { NextRequest, NextResponse } from 'next/server';
import { testScenarioDb, testExecutionDb, visualDiffDb } from '@/app/db';
import { chromium } from 'playwright-core';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, baseUrl, captureScreenshots = true } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    // Get scenario
    const scenario = testScenarioDb.getById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Create execution record
    const execution = testExecutionDb.create(scenarioId, scenario.project_id);
    const executionId = execution.id;

    // Update status to running
    testExecutionDb.update(executionId, {
      status: 'running',
      completed_at: new Date().toISOString()
    });

    const startTime = Date.now();
    let browser;
    const screenshots: Array<{
      filePath: string;
      stepName: string;
      timestamp: string;
      viewport: { width: number; height: number };
    }> = [];

    const consoleOutput: string[] = [];

    try {
      // Launch browser
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      const page = await context.newPage();

      // Collect console messages
      page.on('console', msg => {
        consoleOutput.push(`[${msg.type()}] ${msg.text()}`);
      });

      // Navigate to base URL
      const url = baseUrl || 'http://localhost:3000';
      await page.goto(url, { waitUntil: 'networkidle' });

      // Execute each step
      for (const step of scenario.user_flows) {
        try {
          console.log(`Executing step ${step.step}: ${step.description}`);

          switch (step.action) {
            case 'click':
              await page.locator(step.selector).click();
              await page.waitForTimeout(500); // Wait for animations
              break;

            case 'type':
              await page.locator(step.selector).fill(step.value || '');
              break;

            case 'scroll':
              await page.locator(step.selector).scrollIntoViewIfNeeded();
              break;

            case 'hover':
              await page.locator(step.selector).hover();
              break;

            case 'wait':
              await page.waitForSelector(step.selector, { timeout: 5000 });
              break;

            case 'assert':
              const element = page.locator(step.selector);
              if (step.value) {
                const text = await element.textContent();
                if (text !== step.value) {
                  throw new Error(`Assertion failed: expected "${step.value}", got "${text}"`);
                }
              } else {
                await element.waitFor({ state: 'visible' });
              }
              break;
          }

          // Capture screenshot after significant actions
          if (captureScreenshots && ['click', 'type', 'assert'].includes(step.action)) {
            const screenshotDir = join(process.cwd(), 'screenshots', 'test-runs', executionId);
            if (!existsSync(screenshotDir)) {
              await mkdir(screenshotDir, { recursive: true });
            }

            const screenshotPath = join(screenshotDir, `step_${step.step}.png`);
            const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true });

            screenshots.push({
              filePath: screenshotPath,
              stepName: step.description,
              timestamp: new Date().toISOString(),
              viewport: { width: 1920, height: 1080 }
            });

            // Create visual diff record (baseline will be created on first run)
            visualDiffDb.create({
              execution_id: executionId,
              baseline_screenshot: screenshotPath.replace('test-runs', 'baselines'),
              current_screenshot: screenshotPath,
              step_name: step.description,
              viewport_width: 1920,
              viewport_height: 1080,
              metadata: {
                url,
                step: step.step,
                action: step.action
              }
            });
          }
        } catch (stepError) {
          console.error(`Step ${step.step} failed:`, stepError);
          throw stepError;
        }
      }

      // Test passed
      const executionTime = Date.now() - startTime;
      testExecutionDb.update(executionId, {
        status: 'passed',
        execution_time_ms: executionTime,
        screenshots,
        console_output: consoleOutput.join('\n'),
        completed_at: new Date().toISOString()
      });

      await browser.close();

      return NextResponse.json({
        success: true,
        execution: testExecutionDb.getById(executionId),
        screenshots: screenshots.length
      });
    } catch (error) {
      // Test failed
      const executionTime = Date.now() - startTime;
      testExecutionDb.update(executionId, {
        status: 'failed',
        execution_time_ms: executionTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        console_output: consoleOutput.join('\n'),
        screenshots,
        completed_at: new Date().toISOString()
      });

      if (browser) {
        await browser.close();
      }

      return NextResponse.json({
        success: false,
        execution: testExecutionDb.getById(executionId),
        error: error instanceof Error ? error.message : 'Test execution failed'
      });
    }
  } catch (error) {
    console.error('Error executing test scenario:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute test scenario',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-scenarios/execute?executionId=xxx
 * Get execution results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }

    const execution = testExecutionDb.getById(executionId);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get visual diffs
    const visualDiffs = visualDiffDb.getAllByExecution(executionId);

    return NextResponse.json({
      execution,
      visualDiffs,
      visualDiffsCount: visualDiffs.length
    });
  } catch (error) {
    console.error('Error fetching execution results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution results' },
      { status: 500 }
    );
  }
}
