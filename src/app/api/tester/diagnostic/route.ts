/**
 * Diagnostic endpoint to check screenshot feature setup
 * GET /api/tester/diagnostic
 */

import { NextResponse } from 'next/server';
import { isBrowserbaseConfigured } from '../lib/browserbase';
import { chromium } from 'playwright-core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    checks: [] as any[],
    summary: {
      allPassed: true,
      criticalIssues: 0,
      warnings: 0,
    },
  };

  // Check 1: Dev server accessibility
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('http://localhost:3000', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    diagnostics.checks.push({
      name: 'Dev Server (localhost:3000)',
      status: response.ok ? 'PASS' : 'FAIL',
      message: response.ok
        ? '✅ Server is accessible'
        : `❌ Server responded with ${response.status}`,
      severity: response.ok ? 'info' : 'critical',
    });

    if (!response.ok) {
      diagnostics.summary.allPassed = false;
      diagnostics.summary.criticalIssues++;
    }
  } catch (error) {
    diagnostics.checks.push({
      name: 'Dev Server (localhost:3000)',
      status: 'FAIL',
      message: '❌ Cannot connect. Is your dev server running?',
      hint: 'Run: npm run dev',
      severity: 'critical',
    });
    diagnostics.summary.allPassed = false;
    diagnostics.summary.criticalIssues++;
  }

  // Check 2: Browserbase configuration
  const browserbaseConfigured = isBrowserbaseConfigured();
  diagnostics.checks.push({
    name: 'Browserbase Configuration',
    status: browserbaseConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    message: browserbaseConfigured
      ? '⚠️ Browserbase is configured but cannot access localhost. Will use local browser.'
      : 'ℹ️ Using local Playwright browser',
    severity: 'info',
  });

  // Check 3: Chromium browser availability
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();

    diagnostics.checks.push({
      name: 'Chromium Browser',
      status: 'PASS',
      message: '✅ Chromium is installed and working',
      severity: 'info',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNotInstalled = errorMessage.includes('Executable doesn\'t exist');

    diagnostics.checks.push({
      name: 'Chromium Browser',
      status: 'FAIL',
      message: isNotInstalled
        ? '❌ Chromium not installed'
        : `❌ Chromium error: ${errorMessage}`,
      hint: isNotInstalled ? 'Run: npx playwright install chromium' : undefined,
      severity: 'critical',
    });

    diagnostics.summary.allPassed = false;
    diagnostics.summary.criticalIssues++;
  }

  // Check 4: Screenshot directory
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
    await fs.access(screenshotDir);

    diagnostics.checks.push({
      name: 'Screenshot Directory',
      status: 'PASS',
      message: `✅ Directory exists: ${screenshotDir}`,
      severity: 'info',
    });
  } catch (error) {
    diagnostics.checks.push({
      name: 'Screenshot Directory',
      status: 'WARN',
      message: '⚠️ Screenshot directory will be created on first run',
      severity: 'warning',
    });
    diagnostics.summary.warnings++;
  }

  // Check 5: Available scenarios
  try {
    const { getAllScenarios } = await import('../scenarios');
    const scenarios = getAllScenarios();

    diagnostics.checks.push({
      name: 'Test Scenarios',
      status: 'PASS',
      message: `✅ ${scenarios.length} scenarios available: ${scenarios.map((s) => s.id).join(', ')}`,
      severity: 'info',
    });
  } catch (error) {
    diagnostics.checks.push({
      name: 'Test Scenarios',
      status: 'FAIL',
      message: '❌ Failed to load scenarios',
      severity: 'critical',
    });
    diagnostics.summary.allPassed = false;
    diagnostics.summary.criticalIssues++;
  }

  // Generate recommendations
  const recommendations = [];

  if (diagnostics.summary.criticalIssues > 0) {
    recommendations.push('⚠️ Fix critical issues before running screenshots');
  }

  const devServerCheck = diagnostics.checks.find((c) => c.name === 'Dev Server (localhost:3000)');
  if (devServerCheck?.status === 'FAIL') {
    recommendations.push('1. Start your dev server: npm run dev');
  }

  const chromiumCheck = diagnostics.checks.find((c) => c.name === 'Chromium Browser');
  if (chromiumCheck?.status === 'FAIL') {
    recommendations.push('2. Install Chromium: npx playwright install chromium');
  }

  if (diagnostics.summary.allPassed) {
    recommendations.push('✅ All systems ready! You can run screenshots now.');
    recommendations.push('Try: POST /api/tester/screenshot with {"scenarioId": "home"}');
  }

  return NextResponse.json({
    ...diagnostics,
    recommendations,
  });
}
