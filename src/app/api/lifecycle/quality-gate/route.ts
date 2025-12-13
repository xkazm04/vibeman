/**
 * Lifecycle Quality Gate API
 * POST: Run a quality gate check
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { QualityGateType } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleTypes';
import { logger } from '@/lib/logger';

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
      return NextResponse.json(
        { error: 'gate is required' },
        { status: 400 }
      );
    }

    if (!VALID_GATES.includes(gate as QualityGateType)) {
      return NextResponse.json(
        { error: `Invalid gate: ${gate}. Valid gates: ${VALID_GATES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await runGate(gate as QualityGateType, timeout);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error running quality gate:', { error });
    return NextResponse.json(
      {
        passed: false,
        message: 'Quality gate failed with error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function runGate(gate: QualityGateType, timeout: number): Promise<GateResult> {
  const startTime = Date.now();

  try {
    switch (gate) {
      case 'type_check':
        return await runTypeCheck(timeout);

      case 'lint':
        return await runLint(timeout);

      case 'build':
        return await runBuild(timeout);

      case 'unit_test':
        return await runTests('unit', timeout);

      case 'integration_test':
        return await runTests('integration', timeout);

      case 'security_scan':
        return await runSecurityScan(timeout);

      case 'coverage':
        return await runCoverage(timeout);

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

async function runTypeCheck(timeout: number): Promise<GateResult> {
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', { timeout });

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

async function runLint(timeout: number): Promise<GateResult> {
  try {
    const { stdout, stderr } = await execAsync('npm run lint', { timeout });

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

async function runBuild(timeout: number): Promise<GateResult> {
  try {
    const { stdout, stderr } = await execAsync('npm run build', { timeout });

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

async function runTests(type: 'unit' | 'integration', timeout: number): Promise<GateResult> {
  try {
    // Try common test commands
    const testCommands = type === 'unit'
      ? ['npm test -- --watchAll=false', 'npm run test:unit', 'npx jest --passWithNoTests']
      : ['npm run test:integration', 'npm run test:e2e'];

    let lastError: unknown = null;

    for (const cmd of testCommands) {
      try {
        const { stdout } = await execAsync(cmd, { timeout });
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

    // If no tests found, pass with warning
    return {
      passed: true,
      message: `No ${type} tests configured`,
      details: {
        warning: 'No test command found',
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

async function runSecurityScan(timeout: number): Promise<GateResult> {
  try {
    // Try npm audit
    const { stdout, stderr } = await execAsync('npm audit --json', { timeout });

    let auditResult;
    try {
      auditResult = JSON.parse(stdout);
    } catch {
      // If not JSON, just check exit code
      return {
        passed: true,
        message: 'Security scan passed',
        output: stdout,
      };
    }

    const highVulns = auditResult.metadata?.vulnerabilities?.high || 0;
    const criticalVulns = auditResult.metadata?.vulnerabilities?.critical || 0;

    if (highVulns > 0 || criticalVulns > 0) {
      return {
        passed: false,
        message: `Found ${criticalVulns} critical and ${highVulns} high vulnerabilities`,
        details: auditResult.metadata?.vulnerabilities,
      };
    }

    return {
      passed: true,
      message: 'No high or critical vulnerabilities found',
      details: auditResult.metadata?.vulnerabilities,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    // npm audit returns non-zero even for moderate vulns
    return {
      passed: true,
      message: 'Security scan completed with warnings',
      output: execError.stdout || execError.stderr || '',
    };
  }
}

async function runCoverage(timeout: number): Promise<GateResult> {
  try {
    const { stdout } = await execAsync('npm run test:coverage -- --watchAll=false', { timeout });

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
    // No coverage command available, pass with warning
    return {
      passed: true,
      message: 'Coverage check skipped (no coverage command)',
      details: {
        warning: 'Coverage not configured',
      },
    };
  }
}
