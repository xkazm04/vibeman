/**
 * Lifecycle Quality Gate API
 * POST: Run a quality gate check
 */

import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { QualityGateType } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleTypes';
import { projectDb } from '@/lib/project_database';
import {
  createApiSuccessResponse,
  createApiErrorResponse,
  ApiErrorCode,
  handleApiError as handleApiErrorCentral,
  extractRequestContext,
} from '@/lib/api-errors';

const execAsync = promisify(exec);

const VALID_GATES: QualityGateType[] = [
  'type_check', 'lint', 'unit_test', 'integration_test', 'build', 'security_scan', 'coverage'
];

interface GateResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  output?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gate, projectId, timeout = 300000 } = body;

    if (!gate) {
      return createApiErrorResponse(
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        'gate is required',
        { fieldErrors: { gate: 'gate is required' }, logError: false }
      );
    }

    if (!VALID_GATES.includes(gate as QualityGateType)) {
      return createApiErrorResponse(
        ApiErrorCode.INVALID_FIELD_VALUE,
        `Invalid gate: ${gate}. Valid gates: ${VALID_GATES.join(', ')}`,
        { fieldErrors: { gate: `Must be one of: ${VALID_GATES.join(', ')}` }, logError: false }
      );
    }

    // Run the gate in the TARGET project's directory. Without this, every gate
    // (npm audit, tsc, build, tests, coverage) ran in vibeman's own CWD, so the
    // PASS/FAIL described vibeman regardless of which project the caller asked about.
    let cwd: string | undefined;
    if (projectId) {
      const project = projectDb.getProject(projectId);
      if (!project) {
        return createApiErrorResponse(
          ApiErrorCode.INVALID_FIELD_VALUE,
          `Project not found: ${projectId}`,
          { fieldErrors: { projectId: 'Unknown project' }, logError: false }
        );
      }
      cwd = project.path;
    }

    const result = await runGate(gate as QualityGateType, timeout, cwd);

    return createApiSuccessResponse(result);
  } catch (error) {
    return handleApiErrorCentral(error, 'POST /api/lifecycle/quality-gate', ApiErrorCode.INTERNAL_ERROR, extractRequestContext(request));
  }
}

async function runGate(gate: QualityGateType, timeout: number, cwd?: string): Promise<GateResult> {
  const startTime = Date.now();

  try {
    switch (gate) {
      case 'type_check':
        return await runTypeCheck(timeout, cwd);

      case 'lint':
        return await runLint(timeout, cwd);

      case 'build':
        return await runBuild(timeout, cwd);

      case 'unit_test':
        return await runTests('unit', timeout, cwd);

      case 'integration_test':
        return await runTests('integration', timeout, cwd);

      case 'security_scan':
        return await runSecurityScan(timeout, cwd);

      case 'coverage':
        return await runCoverage(timeout, cwd);

      default:
        return {
          passed: false,
          message: `Unknown gate type: ${gate}`,
        };
    }
  } catch (error) {
    return {
      passed: false,
      message: `Gate ${gate} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown',
      },
    };
  }
}

async function runTypeCheck(timeout: number, cwd?: string): Promise<GateResult> {
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', { timeout, cwd });

    return {
      passed: true,
      message: 'TypeScript type check passed',
      output: stdout,
      details: {
        hasWarnings: stderr.length > 0,
      },
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      passed: false,
      message: 'TypeScript type check failed',
      output: execError.stdout || execError.stderr || execError.message || '',
      details: {
        errors: execError.stderr?.split('\n').filter(Boolean).length || 0,
      },
    };
  }
}

async function runLint(timeout: number, cwd?: string): Promise<GateResult> {
  try {
    const { stdout, stderr } = await execAsync('npm run lint', { timeout, cwd });

    return {
      passed: true,
      message: 'Linting passed',
      output: stdout,
      details: {
        hasWarnings: stderr.length > 0 || stdout.includes('warning'),
      },
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      passed: false,
      message: 'Linting failed',
      output: execError.stdout || execError.stderr || execError.message || '',
    };
  }
}

async function runBuild(timeout: number, cwd?: string): Promise<GateResult> {
  try {
    const { stdout, stderr } = await execAsync('npm run build', { timeout, cwd });

    return {
      passed: true,
      message: 'Build completed successfully',
      output: stdout,
      details: {
        hasWarnings: stderr.length > 0,
      },
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      passed: false,
      message: 'Build failed',
      output: execError.stdout || execError.stderr || execError.message || '',
    };
  }
}

async function runTests(type: 'unit' | 'integration', timeout: number, cwd?: string): Promise<GateResult> {
  try {
    // Try common test commands
    const testCommands = type === 'unit'
      ? ['npm test -- --watchAll=false', 'npm run test:unit', 'npx jest --passWithNoTests']
      : ['npm run test:integration', 'npm run test:e2e'];

    let lastError: unknown = null;

    for (const cmd of testCommands) {
      try {
        const { stdout } = await execAsync(cmd, { timeout, cwd });
        return {
          passed: true,
          message: `${type} tests passed`,
          output: stdout,
        };
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    // No test runner found — report as not passed so callers don't treat it as "tests passed"
    return {
      passed: false,
      message: `No ${type} tests configured — gate cannot pass without a test runner`,
      details: {
        status: 'no_tests',
        warning: 'No test command found. Configure a test runner to enable this gate.',
      },
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      passed: false,
      message: `${type} tests failed`,
      output: execError.stdout || execError.stderr || execError.message || '',
    };
  }
}

// Evaluate a parsed `npm audit --json` report against the high/critical
// threshold. Shared by both the zero-exit and non-zero-exit paths so the gate
// applies the same rule regardless of npm's exit code.
function evaluateAuditResult(auditResult: { metadata?: { vulnerabilities?: Record<string, number> } }): GateResult {
  const vulns = auditResult.metadata?.vulnerabilities;
  const highVulns = vulns?.high || 0;
  const criticalVulns = vulns?.critical || 0;

  if (highVulns > 0 || criticalVulns > 0) {
    return {
      passed: false,
      message: `Found ${criticalVulns} critical and ${highVulns} high vulnerabilities`,
      details: vulns,
    };
  }

  return {
    passed: true,
    message: 'No high or critical vulnerabilities found',
    details: vulns,
  };
}

async function runSecurityScan(timeout: number, cwd?: string): Promise<GateResult> {
  try {
    const { stdout } = await execAsync('npm audit --json', { timeout, cwd });
    try {
      return evaluateAuditResult(JSON.parse(stdout));
    } catch {
      return { passed: true, message: 'Security scan passed (audit output not JSON)', output: stdout };
    }
  } catch (error: unknown) {
    // `npm audit` exits NON-ZERO whenever ANY vulnerability exists, but still
    // writes the full report as JSON to stdout. The previous code blanket-passed
    // here, so a project with critical/high CVEs always passed the gate. Evaluate
    // the report from stdout against the same threshold instead.
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    const out = (execError.stdout || '').trim();
    if (out) {
      try {
        return evaluateAuditResult(JSON.parse(out));
      } catch {
        // fall through — audit ran but produced unparseable output
      }
    }
    // No parseable audit report (npm missing, no lockfile, registry/network
    // failure). We cannot assert the project is clean, so do NOT pass — surface
    // it the same way the test/coverage gates report an unrunnable gate.
    return {
      passed: false,
      message: 'Security scan could not be evaluated',
      details: {
        status: 'no_tests',
        warning: 'npm audit produced no parseable output (missing lockfile, npm, or registry access).',
      },
      output: execError.stdout || execError.stderr || execError.message || '',
    };
  }
}

async function runCoverage(timeout: number, cwd?: string): Promise<GateResult> {
  try {
    const { stdout } = await execAsync('npm run test:coverage -- --watchAll=false', { timeout, cwd });

    // Try to parse coverage percentage from output
    const coverageMatch = stdout.match(/All files[^\n]*\|\s*(\d+\.?\d*)/);
    const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

    const threshold = 70; // 70% coverage threshold

    if (coverage >= threshold) {
      return {
        passed: true,
        message: `Coverage ${coverage.toFixed(1)}% meets threshold (${threshold}%)`,
        details: { coverage, threshold },
      };
    }

    return {
      passed: false,
      message: `Coverage ${coverage.toFixed(1)}% below threshold (${threshold}%)`,
      details: { coverage, threshold },
    };
  } catch (error: unknown) {
    // No coverage command available — cannot pass without measurement
    return {
      passed: false,
      message: 'Coverage check failed — no coverage command configured',
      details: {
        status: 'no_tests',
        warning: 'Coverage not configured. Add a test:coverage script to enable this gate.',
      },
    };
  }
}
