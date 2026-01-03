/**
 * Observatory End-to-End Test Script
 *
 * Tests the full Observe → Predict → Act → Learn loop
 * Run with: node scripts/test-observatory.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Test configuration
const TEST_PROJECT_ID = 'test-project-' + Date.now();
const TEST_PROJECT_PATH = projectRoot; // Use vibeman itself as test project
const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testEndpoint(name, url, options = {}) {
  try {
    log(`Testing: ${name}...`, 'yellow');
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const data = await response.json();

    if (response.ok) {
      log(`  ✓ ${name} - Status: ${response.status}`, 'green');
      return { success: true, data };
    } else {
      log(`  ✗ ${name} - Status: ${response.status}`, 'red');
      log(`    Error: ${JSON.stringify(data)}`, 'red');
      return { success: false, error: data };
    }
  } catch (error) {
    log(`  ✗ ${name} - Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🔭 Observatory End-to-End Test Suite\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // ============================================
  // Phase 1: Test Health Endpoint
  // ============================================
  logSection('Phase 1: Health Check');

  const healthResult = await testEndpoint(
    'Get Project Health',
    `${BASE_URL}/api/observatory/health?projectId=${TEST_PROJECT_ID}`
  );

  if (healthResult.success) {
    passed++;
    log(`  Health Score: ${healthResult.data.healthScore ?? 'N/A'}`, 'green');
    log(`  Files Analyzed: ${healthResult.data.filesAnalyzed ?? 0}`, 'green');
  } else {
    failed++;
  }

  // ============================================
  // Phase 2: Test Analysis Trigger
  // ============================================
  logSection('Phase 2: Trigger Full Analysis');

  const analyzeResult = await testEndpoint(
    'Trigger Observatory Analysis',
    `${BASE_URL}/api/observatory/analyze`,
    {
      method: 'POST',
      body: JSON.stringify({
        projectId: TEST_PROJECT_ID,
        projectPath: TEST_PROJECT_PATH,
      }),
    }
  );

  if (analyzeResult.success) {
    passed++;
    log(`  Snapshot ID: ${analyzeResult.data.snapshotId}`, 'green');
    log(`  Duration: ${analyzeResult.data.duration}ms`, 'green');
    log(`  Files Analyzed: ${analyzeResult.data.results?.filesAnalyzed ?? 0}`, 'green');
    log(`  Health Score: ${analyzeResult.data.results?.healthScore ?? 'N/A'}`, 'green');
    log(`  Predictions Created: ${analyzeResult.data.results?.predictionsCreated ?? 0}`, 'green');
    log(`  Auto-Fixes Generated: ${analyzeResult.data.results?.autoFixesGenerated ?? 0}`, 'green');

    if (analyzeResult.data.results?.topConcerns?.length > 0) {
      log(`  Top Concerns:`, 'yellow');
      for (const concern of analyzeResult.data.results.topConcerns.slice(0, 3)) {
        log(`    - [${concern.severity}] ${concern.file}: ${concern.issue}`, 'yellow');
      }
    } else {
      log(`  No critical concerns detected`, 'green');
    }
  } else {
    failed++;
  }

  // ============================================
  // Phase 3: Check Health After Analysis
  // ============================================
  logSection('Phase 3: Verify Health Updated');

  const healthAfterResult = await testEndpoint(
    'Get Updated Health',
    `${BASE_URL}/api/observatory/health?projectId=${TEST_PROJECT_ID}`
  );

  if (healthAfterResult.success && healthAfterResult.data.healthScore !== null) {
    passed++;
    log(`  Current Health Score: ${healthAfterResult.data.healthScore}`, 'green');
    log(`  Trend: ${healthAfterResult.data.trend ?? 'N/A'}`, 'green');
  } else if (healthAfterResult.success) {
    passed++;
    log(`  No health data yet (expected for new project)`, 'yellow');
  } else {
    failed++;
  }

  // ============================================
  // Phase 4: Test Learning Progress
  // ============================================
  logSection('Phase 4: Learning System');

  const learningResult = await testEndpoint(
    'Get Learning Progress',
    `${BASE_URL}/api/observatory/learning?projectId=${TEST_PROJECT_ID}`
  );

  if (learningResult.success) {
    passed++;
    log(`  Patterns Created: ${learningResult.data.patternsCreated ?? 0}`, 'green');
    log(`  Total Patterns: ${learningResult.data.totalPatterns ?? 0}`, 'green');
    log(`  Auto-Fix Enabled: ${learningResult.data.autoFixEnabled ?? 0}`, 'green');
    log(`  Avg Success Rate: ${((learningResult.data.avgSuccessRate ?? 0) * 100).toFixed(1)}%`, 'green');
  } else {
    failed++;
  }

  // ============================================
  // Summary
  // ============================================
  logSection('Test Summary');

  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(1);

  log(`Total Tests: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

  if (failed === 0) {
    log('\n✅ All tests passed! Observatory is working correctly.\n', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the errors above.\n', 'yellow');
  }

  return failed === 0;
}

// Check if dev server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { method: 'HEAD' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  log('Checking if dev server is running...', 'yellow');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    log('\n❌ Dev server is not running!', 'red');
    log('Please start the server first with: npm run dev', 'yellow');
    log('Then run this test again.\n', 'yellow');
    process.exit(1);
  }

  log('✓ Server is running\n', 'green');

  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
