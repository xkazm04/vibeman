import {
  executeCommand,
  executeCommandWithTiming,
  executeCommandWithJsonOutput,
  validateCommitMessage,
} from '@/lib/command';
import { VulnerabilityInfo } from '@/app/db/models/security-patch.types';
import { PatchProposal } from './patchGenerator';

interface StatusCheck {
  state?: string;
  conclusion?: string;
}

export interface PrCreationResult {
  success: boolean;
  branchName: string;
  commitSha?: string;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

export interface TestResult {
  success: boolean;
  output: string;
  exitCode: number;
  duration: number;
}

/**
 * Apply package updates to package.json
 */
async function applyPackageUpdates(
  projectPath: string,
  vulnerabilities: VulnerabilityInfo[]
): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');

  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  // Update dependencies and devDependencies
  vulnerabilities.forEach((vuln) => {
    if (packageJson.dependencies?.[vuln.packageName]) {
      packageJson.dependencies[vuln.packageName] = vuln.fixedVersion;
    }
    if (packageJson.devDependencies?.[vuln.packageName]) {
      packageJson.devDependencies[vuln.packageName] = vuln.fixedVersion;
    }
  });

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

/**
 * Create a Git branch for the security patch
 */
async function createBranch(projectPath: string, branchName: string): Promise<void> {
  // Ensure we're on a clean branch
  await executeCommand('git', ['checkout', 'main'], {
    cwd: projectPath,
    argValidator: null,
  });
  await executeCommand('git', ['pull', 'origin', 'main'], {
    cwd: projectPath,
    argValidator: null,
  });

  // Create and checkout new branch
  // branchName is generated internally (security/auto-patch-{timestamp}), so it's safe
  await executeCommand('git', ['checkout', '-b', branchName], {
    cwd: projectPath,
    argValidator: null,
  });
}

/**
 * Commit changes
 */
async function commitChanges(
  projectPath: string,
  message: string
): Promise<string> {
  // Validate commit message to prevent injection
  const validation = validateCommitMessage(message);
  if (!validation.valid) {
    throw new Error(`Invalid commit message: ${validation.error}`);
  }
  const safeMessage = validation.sanitized!;

  await executeCommand('git', ['add', 'package.json', 'package-lock.json'], {
    cwd: projectPath,
    argValidator: null, // Static args, no validation needed
  });

  await executeCommand('git', ['commit', '-m', safeMessage], {
    cwd: projectPath,
    argValidator: null, // We've already validated the message
  });

  // Get commit SHA
  const shaResult = await executeCommand('git', ['rev-parse', 'HEAD'], {
    cwd: projectPath,
    argValidator: null,
  });

  return shaResult.stdout.trim();
}

/**
 * Push branch to remote
 */
async function pushBranch(projectPath: string, branchName: string): Promise<void> {
  // branchName is generated internally (security/auto-patch-{timestamp}), so it's safe
  await executeCommand('git', ['push', '-u', 'origin', branchName], {
    cwd: projectPath,
    argValidator: null,
  });
}

/**
 * Create a pull request using GitHub CLI
 */
async function createGitHubPr(
  projectPath: string,
  title: string,
  body: string
): Promise<{ prNumber: number; prUrl: string }> {
  // Title and body are generated internally, so skip validation
  const result = await executeCommand(
    'gh',
    ['pr', 'create', '--title', title, '--body', body],
    {
      cwd: projectPath,
      argValidator: null,
    }
  );

  // Extract PR URL from output
  const prUrl = result.stdout.trim();

  // Extract PR number from URL
  const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
  const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : 0;

  return { prNumber, prUrl };
}

/**
 * Run tests for the project
 */
export async function runTests(projectPath: string): Promise<TestResult> {
  const result = await executeCommandWithTiming(
    'npm',
    ['test', '--', '--passWithNoTests'],
    {
      cwd: projectPath,
      argValidator: null,
    }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout + '\n' + result.stderr,
    exitCode: result.exitCode,
    duration: result.duration
  };
}

/**
 * Run build for the project
 */
export async function runBuild(projectPath: string): Promise<TestResult> {
  const result = await executeCommandWithTiming(
    'npm',
    ['run', 'build'],
    {
      cwd: projectPath,
      argValidator: null,
    }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout + '\n' + result.stderr,
    exitCode: result.exitCode,
    duration: result.duration
  };
}

/**
 * Generate commit message for security patches
 */
function generateSecurityCommitMessage(vulnerabilities: VulnerabilityInfo[]): string {
  const vulnList = vulnerabilities
    .slice(0, 5)
    .map((v) => `- ${v.packageName}: ${v.severity} severity`)
    .join('\n');

  const moreCount = vulnerabilities.length > 5
    ? `\n...and ${vulnerabilities.length - 5} more`
    : '';

  return `fix: Apply security patches for ${vulnerabilities.length} vulnerabilities

Auto-generated security patch addressing:
${vulnList}${moreCount}

Generated by Vibeman Security Pipeline`;
}

/**
 * Helper to handle PR creation steps
 */
async function executePrSteps(
  projectPath: string,
  branchName: string,
  vulnerabilities: VulnerabilityInfo[],
  patchDocument: string
): Promise<Omit<PrCreationResult, 'success' | 'branchName'>> {
  // Create branch
  await createBranch(projectPath, branchName);

  // Apply package updates
  await applyPackageUpdates(projectPath, vulnerabilities);

  // Install dependencies
  await executeCommand('npm', ['install'], {
    cwd: projectPath,
    argValidator: null,
  });

  // Commit changes
  const commitMessage = generateSecurityCommitMessage(vulnerabilities);
  const commitSha = await commitChanges(projectPath, commitMessage);

  // Push to remote
  await pushBranch(projectPath, branchName);

  // Create PR
  const prTitle = `Security: Auto-patch ${vulnerabilities.length} vulnerabilities`;
  const { prNumber, prUrl } = await createGitHubPr(projectPath, prTitle, patchDocument);

  return { commitSha, prNumber, prUrl };
}

/**
 * Create a pull request with security patches
 */
export async function createSecurityPr(
  projectPath: string,
  vulnerabilities: VulnerabilityInfo[],
  proposals: PatchProposal[],
  patchDocument: string
): Promise<PrCreationResult> {
  const branchName = `security/auto-patch-${Date.now()}`;

  try {
    const result = await executePrSteps(projectPath, branchName, vulnerabilities, patchDocument);

    return {
      success: true,
      branchName,
      ...result
    };
  } catch (error) {
    return {
      success: false,
      branchName,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check if all PR status checks passed
 */
function allStatusChecksPassed(checks: StatusCheck[]): boolean {
  return checks.every(
    (check) => check.state === 'SUCCESS' || check.conclusion === 'SUCCESS'
  );
}

/**
 * Merge PR if tests pass
 */
export async function mergePrIfTestsPass(
  projectPath: string,
  prNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get PR status
    const { data: prStatus } = await executeCommandWithJsonOutput<{ statusCheckRollup?: StatusCheck[] }>(
      'gh',
      ['pr', 'view', prNumber.toString(), '--json', 'statusCheckRollup'],
      {
        cwd: projectPath,
        acceptNonZero: true,
        argValidator: null,
      }
    );

    const checks = prStatus.statusCheckRollup || [];

    // Check if all checks passed
    if (!allStatusChecksPassed(checks)) {
      return { success: false, error: 'Not all status checks passed' };
    }

    // Merge PR
    await executeCommand(
      'gh',
      ['pr', 'merge', prNumber.toString(), '--auto', '--squash'],
      {
        cwd: projectPath,
        argValidator: null,
      }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
