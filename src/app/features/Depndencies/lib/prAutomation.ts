import { spawn } from 'child_process';
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
 * Execute a shell command and return the result
 */
function execCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });
  });
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
  await execCommand('git', ['checkout', 'main'], projectPath);
  await execCommand('git', ['pull', 'origin', 'main'], projectPath);

  // Create and checkout new branch
  await execCommand('git', ['checkout', '-b', branchName], projectPath);
}

/**
 * Commit changes
 */
async function commitChanges(
  projectPath: string,
  message: string
): Promise<string> {
  await execCommand('git', ['add', 'package.json', 'package-lock.json'], projectPath);

  const commitResult = await execCommand('git', ['commit', '-m', message], projectPath);

  // Get commit SHA
  const shaResult = await execCommand('git', ['rev-parse', 'HEAD'], projectPath);

  return shaResult.stdout.trim();
}

/**
 * Push branch to remote
 */
async function pushBranch(projectPath: string, branchName: string): Promise<void> {
  await execCommand('git', ['push', '-u', 'origin', branchName], projectPath);
}

/**
 * Create a pull request using GitHub CLI
 */
async function createGitHubPr(
  projectPath: string,
  title: string,
  body: string
): Promise<{ prNumber: number; prUrl: string }> {
  const result = await execCommand(
    'gh',
    ['pr', 'create', '--title', title, '--body', body],
    projectPath
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
  const startTime = Date.now();

  const result = await execCommand('npm', ['test', '--', '--passWithNoTests'], projectPath);

  const duration = Date.now() - startTime;

  return {
    success: result.exitCode === 0,
    output: result.stdout + '\n' + result.stderr,
    exitCode: result.exitCode,
    duration
  };
}

/**
 * Run build for the project
 */
export async function runBuild(projectPath: string): Promise<TestResult> {
  const startTime = Date.now();

  const result = await execCommand('npm', ['run', 'build'], projectPath);

  const duration = Date.now() - startTime;

  return {
    success: result.exitCode === 0,
    output: result.stdout + '\n' + result.stderr,
    exitCode: result.exitCode,
    duration
  };
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
    // Create branch
    await createBranch(projectPath, branchName);

    // Apply package updates
    await applyPackageUpdates(projectPath, vulnerabilities);

    // Install dependencies
    await execCommand('npm', ['install'], projectPath);

    // Commit changes
    const commitMessage = `fix: Apply security patches for ${vulnerabilities.length} vulnerabilities

Auto-generated security patch addressing:
${vulnerabilities.slice(0, 5).map((v) => `- ${v.packageName}: ${v.severity} severity`).join('\n')}
${vulnerabilities.length > 5 ? `\n...and ${vulnerabilities.length - 5} more` : ''}

Generated by Vibeman Security Pipeline`;

    const commitSha = await commitChanges(projectPath, commitMessage);

    // Push to remote
    await pushBranch(projectPath, branchName);

    // Create PR
    const prTitle = `Security: Auto-patch ${vulnerabilities.length} vulnerabilities`;
    const prBody = patchDocument;

    const { prNumber, prUrl } = await createGitHubPr(projectPath, prTitle, prBody);

    return {
      success: true,
      branchName,
      commitSha,
      prNumber,
      prUrl
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
 * Merge PR if tests pass
 */
export async function mergePrIfTestsPass(
  projectPath: string,
  prNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get PR status
    const statusResult = await execCommand(
      'gh',
      ['pr', 'view', prNumber.toString(), '--json', 'statusCheckRollup'],
      projectPath
    );

    const prStatus = JSON.parse(statusResult.stdout);
    const checks = prStatus.statusCheckRollup || [];

    // Check if all checks passed
    const allPassed = checks.every(
      (check: StatusCheck) => check.state === 'SUCCESS' || check.conclusion === 'SUCCESS'
    );

    if (!allPassed) {
      return { success: false, error: 'Not all status checks passed' };
    }

    // Merge PR
    await execCommand(
      'gh',
      ['pr', 'merge', prNumber.toString(), '--auto', '--squash'],
      projectPath
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
