/**
 * Test Runner — orchestrates running use cases through the design engine
 * and evaluating results. Saves to both filesystem and SQLite.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DbPersona, DbPersonaToolDefinition } from '@/app/db/models/persona.types';
import type {
  DesignTestCase,
  TestRunConfig,
  TestRunResult,
  TestCaseResult,
  TestCaseStatus,
} from './testTypes';
import { buildDesignPrompt, extractDesignResult, extractAssistantText } from '../designEngine';
import { evaluateStructural, evaluateSemantic } from './testEvaluator';
import { generateJsonReport, generateMarkdownReport } from './testReporter';
import { extractPatterns, persistPatterns } from './patternExtractor';
import { suggestAdjustment } from './adjustmentSuggester';
import type { UseCaseFlow } from './flowTypes';
import { extractUseCaseFlows } from './flowExtractor';
import { checkDuplicate } from './duplicateDetector';

// ============================================================================
// globalThis buffers for SSE streaming (survives Next.js HMR)
// ============================================================================

const g = globalThis as Record<string, unknown>;

const testRunBuffers: Map<string, string[]> =
  (g.__designReviewBuffers as Map<string, string[]>) ?? new Map();
g.__designReviewBuffers = testRunBuffers;

type TestRunStatus = { done: boolean; result: TestRunResult | null; error: string | null };

const testRunStatuses: Map<string, TestRunStatus> =
  (g.__designReviewStatuses as Map<string, TestRunStatus>) ?? new Map();
g.__designReviewStatuses = testRunStatuses;

// ============================================================================
// Buffer accessors (for SSE streaming)
// ============================================================================

export function consumeTestRunOutput(testRunId: string, offset: number = 0): string[] {
  const buffer = testRunBuffers.get(testRunId);
  if (!buffer) return [];
  return buffer.slice(offset);
}

export function getTestRunStatus(testRunId: string): TestRunStatus | null {
  return testRunStatuses.get(testRunId) ?? null;
}

export function cleanupTestRun(testRunId: string): void {
  testRunBuffers.delete(testRunId);
  testRunStatuses.delete(testRunId);
}

// ============================================================================
// Builtin tool definitions (mock data, no DB needed)
// ============================================================================

const BUILTIN_TOOLS: Record<string, { category: string; description: string; requires_credential_type: string | null; script_path: string }> = {
  http_request: { category: 'http', description: 'Make HTTP requests to external APIs', requires_credential_type: 'http', script_path: 'persona-tools/http/request.ts' },
  gmail_read: { category: 'gmail', description: 'Read emails from Gmail inbox', requires_credential_type: 'gmail', script_path: 'persona-tools/gmail/read.ts' },
  gmail_send: { category: 'gmail', description: 'Send emails via Gmail', requires_credential_type: 'gmail', script_path: 'persona-tools/gmail/send.ts' },
  gmail_search: { category: 'gmail', description: 'Search emails in Gmail', requires_credential_type: 'gmail', script_path: 'persona-tools/gmail/search.ts' },
  gmail_mark_read: { category: 'gmail', description: 'Mark emails as read in Gmail', requires_credential_type: 'gmail', script_path: 'persona-tools/gmail/mark-read.ts' },
  file_read: { category: 'filesystem', description: 'Read files from the filesystem', requires_credential_type: null, script_path: 'persona-tools/filesystem/read.ts' },
  file_write: { category: 'filesystem', description: 'Write files to the filesystem', requires_credential_type: null, script_path: 'persona-tools/filesystem/write.ts' },
};

function createMockPersona(testCase: DesignTestCase): DbPersona {
  return {
    id: `test-${testCase.id}`,
    project_id: 'test-project',
    name: testCase.mockContext.personaName,
    description: testCase.mockContext.personaDescription,
    system_prompt: '',
    structured_prompt: null,
    icon: null,
    color: null,
    enabled: 1,
    max_concurrent: 1,
    timeout_ms: 180000,
    notification_channels: null,
    last_design_result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockTools(toolNames: string[]): DbPersonaToolDefinition[] {
  const now = new Date().toISOString();
  return toolNames
    .filter(name => BUILTIN_TOOLS[name])
    .map(name => {
      const def = BUILTIN_TOOLS[name];
      return {
        id: `ptooldef_test_${name}`,
        name,
        category: def.category,
        description: def.description,
        script_path: def.script_path,
        input_schema: null,
        output_schema: null,
        requires_credential_type: def.requires_credential_type,
        is_builtin: 1,
        created_at: now,
        updated_at: now,
      };
    });
}

// ============================================================================
// CLI spawning — synchronous (Promise-wrapped) design analysis
// ============================================================================

/** Ensure .claude/logs/design-reviews/ directory exists and return path */
function getLogDir(): string {
  const logDir = path.join(process.cwd(), '.claude', 'logs', 'design-reviews');
  try { fs.mkdirSync(logDir, { recursive: true }); } catch { /* ok */ }
  return logDir;
}

/** Append a line to the centralized session log file */
function writeSessionLog(logFile: string, line: string): void {
  try { fs.appendFileSync(logFile, line + '\n'); } catch { /* ok */ }
}

function runDesignCli(
  prompt: string,
  timeoutMs: number = 1800000,
  options?: { logLabel?: string; appendOutput?: (line: string) => void },
): Promise<{ text: string; exitCode: number }> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'claude.cmd' : 'claude';
    const args = ['-p', '-', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const execDir = path.join(os.tmpdir(), `vibeman-design-test-${Date.now()}`);
    try { fs.mkdirSync(execDir, { recursive: true }); } catch { /* ok */ }

    // Centralized session log file for debugging
    const logDir = getLogDir();
    const label = (options?.logLabel ?? 'cli').replace(/[^a-zA-Z0-9_-]/g, '_');
    const logFile = path.join(logDir, `${label}_${Date.now()}.log`);
    const log = options?.appendOutput;

    writeSessionLog(logFile, `=== CLI Session: ${options?.logLabel ?? 'unknown'} ===`);
    writeSessionLog(logFile, `Timestamp: ${new Date().toISOString()}`);
    writeSessionLog(logFile, `Timeout: ${timeoutMs}ms`);
    writeSessionLog(logFile, `Prompt length: ${prompt.length} chars`);
    writeSessionLog(logFile, `---STDOUT---`);

    try {
      const child = spawn(command, args, {
        cwd: execDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows,
        env,
      });

      child.stdin.write(prompt);
      child.stdin.end();

      let fullOutput = '';
      let lastDataAt = Date.now();
      let bytesReceived = 0;
      let timedOut = false;

      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        fullOutput += chunk;
        bytesReceived += data.length;
        lastDataAt = Date.now();
        // Stream raw output to log file in real-time
        writeSessionLog(logFile, chunk);
      });

      child.stderr.on('data', (data: Buffer) => {
        writeSessionLog(logFile, `[STDERR] ${data.toString()}`);
      });

      // Heartbeat: log progress every 30s so user knows it's alive
      const heartbeat = setInterval(() => {
        const elapsed = Math.round((Date.now() - (lastDataAt - (bytesReceived > 0 ? 0 : Date.now() - lastDataAt))) / 1000);
        const silenceSec = Math.round((Date.now() - lastDataAt) / 1000);
        if (log && silenceSec >= 30) {
          log(`    ... CLI running (${bytesReceived} bytes received, ${silenceSec}s since last data)`);
        }
        writeSessionLog(logFile, `[HEARTBEAT] bytes=${bytesReceived}, silence=${silenceSec}s`);
      }, 30000);

      const timer = setTimeout(() => {
        timedOut = true;
        writeSessionLog(logFile, `\n[TIMEOUT] Killing after ${timeoutMs}ms (bytes received: ${bytesReceived})`);
        if (log) log(`    CLI TIMEOUT after ${Math.round(timeoutMs / 1000)}s — killing process`);
        if (!child.killed) child.kill();
      }, timeoutMs);

      child.on('close', (code: number) => {
        clearTimeout(timer);
        clearInterval(heartbeat);
        writeSessionLog(logFile, `\n---END---`);
        writeSessionLog(logFile, `Exit code: ${code ?? 'null'} | Timed out: ${timedOut} | Bytes: ${bytesReceived}`);
        try { fs.rmSync(execDir, { recursive: true, force: true }); } catch { /* ok */ }
        resolve({ text: fullOutput, exitCode: timedOut ? 124 : (code ?? 1) });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        clearInterval(heartbeat);
        writeSessionLog(logFile, `\n[ERROR] ${err.message}`);
        try { fs.rmSync(execDir, { recursive: true, force: true }); } catch { /* ok */ }
        resolve({ text: `CLI error: ${err.message}`, exitCode: 1 });
      });
    } catch (err: unknown) {
      try { fs.rmSync(execDir, { recursive: true, force: true }); } catch { /* ok */ }
      const msg = err instanceof Error ? err.message : String(err);
      writeSessionLog(logFile, `[SPAWN ERROR] ${msg}`);
      resolve({ text: `Spawn error: ${msg}`, exitCode: 1 });
    }
  });
}

// ============================================================================
// Single test execution
// ============================================================================

export async function runSingleTest(
  testCase: DesignTestCase,
  outputDir: string,
  appendOutput?: (line: string) => void,
): Promise<TestCaseResult> {
  const log = appendOutput ?? (() => {});
  const startTime = Date.now();
  const errors: string[] = [];

  // Create case output directory
  const caseDir = path.join(outputDir, 'cases', testCase.id);
  try { fs.mkdirSync(caseDir, { recursive: true }); } catch { /* ok */ }

  // Build mock data
  const mockPersona = createMockPersona(testCase);
  const mockTools = createMockTools(testCase.mockContext.availableTools);

  log(`  Building prompt (${mockTools.length} tools available)...`);

  // Build the design prompt
  const prompt = buildDesignPrompt(
    testCase.instruction,
    mockPersona,
    mockTools,
    [], // no current tools (create mode)
    testCase.mode,
  );

  // Run CLI
  log(`  Spawning Claude CLI for design analysis...`);
  const { text: rawOutput, exitCode } = await runDesignCli(prompt, 1800000, {
    logLabel: `design_${testCase.id}`,
    appendOutput: log,
  });

  // Save CLI log
  try { fs.writeFileSync(path.join(caseDir, 'cli.log'), rawOutput); } catch { /* ok */ }

  if (exitCode !== 0) {
    const reason = exitCode === 124 ? 'CLI timed out (1800s)' : `CLI exited with code ${exitCode}`;
    errors.push(reason);
    log(`  ${reason} — check .claude/logs/design-reviews/ for full output`);
    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      status: 'error',
      designResult: null,
      structuralEvaluation: { passed: false, score: 0, checks: [] },
      semanticEvaluation: null,
      connectorsUsed: [],
      triggerTypes: [],
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  // Extract and parse result
  const assistantText = extractAssistantText(rawOutput);
  const designResult = extractDesignResult(assistantText);

  if (!designResult) {
    errors.push('Failed to parse design result from CLI output');
    log(`  Failed to parse design result`);
    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      status: 'error',
      designResult: null,
      structuralEvaluation: { passed: false, score: 0, checks: [] },
      semanticEvaluation: null,
      connectorsUsed: [],
      triggerTypes: [],
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  // Save design result
  try { fs.writeFileSync(path.join(caseDir, 'design-result.json'), JSON.stringify(designResult, null, 2)); } catch { /* ok */ }
  log(`  Design result parsed: "${designResult.summary}"`);

  // Extract connectors and trigger types from result
  const connectorsUsed = (designResult.suggested_connectors ?? []).map(c => typeof c === 'string' ? c : c.name);
  const triggerTypes = (designResult.suggested_triggers ?? []).map(t => t.trigger_type);

  // Structural evaluation
  log(`  Running structural evaluation...`);
  const structuralEvaluation = evaluateStructural(designResult, testCase.expectations.structural);
  try { fs.writeFileSync(path.join(caseDir, 'structural-eval.json'), JSON.stringify(structuralEvaluation, null, 2)); } catch { /* ok */ }
  log(`  Structural: ${structuralEvaluation.passed ? 'PASS' : 'FAIL'} (${structuralEvaluation.score}/100)`);

  // Semantic evaluation
  log(`  Running semantic evaluation (spawning 2nd CLI)...`);
  let semanticEvaluation = null;
  try {
    semanticEvaluation = await evaluateSemantic(designResult, testCase);
    if (semanticEvaluation) {
      try { fs.writeFileSync(path.join(caseDir, 'semantic-eval.json'), JSON.stringify(semanticEvaluation, null, 2)); } catch { /* ok */ }
      log(`  Semantic: ${semanticEvaluation.passed ? 'PASS' : 'FAIL'} (${semanticEvaluation.overallScore}/100)`);
    } else {
      log(`  Semantic: skipped (parse failure)`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Semantic evaluation failed: ${msg}`);
    log(`  Semantic evaluation error: ${msg}`);
  }

  // Extract use case flows for activity diagram visualization
  log(`  Extracting use case flows...`);
  let flows: UseCaseFlow[] | undefined;
  try {
    const extracted = await extractUseCaseFlows(designResult, testCase);
    if (extracted) {
      flows = extracted;
      try { fs.writeFileSync(path.join(caseDir, 'flows.json'), JSON.stringify(flows, null, 2)); } catch { /* ok */ }
      log(`  Extracted ${flows.length} use case flow(s)`);
    } else {
      log(`  Flow extraction: skipped (parse failure)`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Flow extraction failed: ${msg}`);
    log(`  Flow extraction error: ${msg}`);
  }

  // Determine overall status
  let status: TestCaseStatus = 'passed';
  if (!structuralEvaluation.passed) status = 'failed';
  if (semanticEvaluation && !semanticEvaluation.passed) status = 'failed';
  if (errors.length > 0 && !designResult) status = 'error';

  return {
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    status,
    designResult,
    structuralEvaluation,
    semanticEvaluation,
    connectorsUsed,
    triggerTypes,
    errors,
    flows,
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// Full test suite execution
// ============================================================================

export async function runTestSuite(config: TestRunConfig): Promise<TestRunResult> {
  const { testRunId, useCases, outputDir } = config;

  // Initialize buffers
  testRunBuffers.set(testRunId, []);
  testRunStatuses.set(testRunId, { done: false, result: null, error: null });

  const appendOutput = (line: string) => {
    const buffer = testRunBuffers.get(testRunId);
    if (buffer) buffer.push(line);
  };

  // Create output directory
  try { fs.mkdirSync(outputDir, { recursive: true }); } catch { /* ok */ }

  appendOutput(`[TestRunner] Starting test suite: ${testRunId}`);
  appendOutput(`[TestRunner] Test cases: ${useCases.length}`);
  appendOutput('');

  const startedAt = new Date().toISOString();
  const results: TestCaseResult[] = [];
  let duplicatesSkipped = 0;

  // Run tests sequentially
  for (let i = 0; i < useCases.length; i++) {
    const testCase = useCases[i];
    appendOutput(`[${i + 1}/${useCases.length}] Starting: ${testCase.name}...`);

    const result = await runSingleTest(testCase, outputDir, appendOutput);
    results.push(result);

    const icon = result.status === 'passed' ? 'PASS' : result.status === 'failed' ? 'FAIL' : 'ERROR';
    appendOutput(`[${i + 1}/${useCases.length}] ${icon} — Structural: ${result.structuralEvaluation.score}/100` +
      (result.semanticEvaluation ? `, Semantic: ${result.semanticEvaluation.overallScore}/100` : '') +
      ` (${Math.round(result.durationMs / 1000)}s)`);

    // Duplicate check — skip DB save if semantically identical to existing review
    if (result.designResult && checkDuplicate(result, appendOutput)) {
      appendOutput(`  SKIP — not saved (duplicate of existing review)`);
      appendOutput('');
      duplicatesSkipped++;
      continue;
    }
    appendOutput('');

    // Save to DB
    let savedReviewId: string | null = null;
    try {
      const { personaDb } = require('@/app/db');
      const saved = personaDb.designReviews.create({
        test_case_id: testCase.id,
        test_case_name: testCase.name,
        instruction: testCase.instruction,
        status: result.status,
        structural_score: result.structuralEvaluation.score,
        semantic_score: result.semanticEvaluation?.overallScore ?? null,
        connectors_used: JSON.stringify(result.connectorsUsed),
        trigger_types: JSON.stringify(result.triggerTypes),
        design_result: result.designResult ? JSON.stringify(result.designResult) : null,
        structural_evaluation: JSON.stringify(result.structuralEvaluation),
        semantic_evaluation: result.semanticEvaluation ? JSON.stringify(result.semanticEvaluation) : null,
        use_case_flows: result.flows ? JSON.stringify(result.flows) : null,
        test_run_id: testRunId,
        reviewed_at: new Date().toISOString(),
      });
      savedReviewId = saved.id as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendOutput(`[TestRunner] Warning: Failed to save to DB: ${msg}`);
    }

    // Phase 3: Extract learned patterns from passing reviews
    if (result.status === 'passed' && result.designResult && savedReviewId) {
      try {
        const patterns = extractPatterns(result.designResult);
        if (patterns.length > 0) {
          persistPatterns(patterns, savedReviewId);
          appendOutput(`  Extracted ${patterns.length} learned pattern(s)`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        appendOutput(`  Pattern extraction warning: ${msg}`);
      }
    }

    // Phase 2: Generate adjustment suggestion for failed reviews
    if (result.status === 'failed' && savedReviewId) {
      try {
        const failedChecks = result.structuralEvaluation.checks.filter(c => !c.passed);
        const adjustment = suggestAdjustment(testCase.instruction, failedChecks, 0);
        if (adjustment) {
          const { personaDb } = require('@/app/db');
          const db = require('@/app/db/drivers').getConnection();
          db.prepare(
            'UPDATE persona_design_reviews SET suggested_adjustment = ? WHERE id = ?'
          ).run(JSON.stringify(adjustment), savedReviewId);
          appendOutput(`  Suggested adjustment: ${adjustment.appliedFixes.join(', ')}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        appendOutput(`  Adjustment suggestion warning: ${msg}`);
      }
    }
  }

  const completedAt = new Date().toISOString();
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errored = results.filter(r => r.status === 'error').length;

  const runResult: TestRunResult = {
    testRunId,
    startedAt,
    completedAt,
    totalTests: useCases.length,
    passed,
    failed,
    errored,
    results,
  };

  // Generate reports
  try {
    fs.writeFileSync(path.join(outputDir, 'results.json'), generateJsonReport(runResult));
    fs.writeFileSync(path.join(outputDir, 'report.md'), generateMarkdownReport(runResult));
  } catch { /* ok */ }

  // Summary
  appendOutput(`[TestRunner] Completed: ${passed} passed, ${failed} failed, ${errored} errors`);
  if (duplicatesSkipped > 0) {
    appendOutput(`[TestRunner] Duplicates skipped: ${duplicatesSkipped}`);
  }
  appendOutput(`[TestRunner] Reports saved to ${outputDir}`);
  appendOutput(`[TestRunner] CLI session logs: .claude/logs/design-reviews/`);

  // Update status
  testRunStatuses.set(testRunId, { done: true, result: runResult, error: null });

  // Schedule cleanup
  setTimeout(() => cleanupTestRun(testRunId), 10 * 60 * 1000);

  return runResult;
}
