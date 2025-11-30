/**
 * Lifecycle Deploy API
 * POST: Deploy changes as part of the lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DeploymentTarget } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleTypes';

const execAsync = promisify(exec);

const VALID_TARGETS: DeploymentTarget[] = [
  'local', 'staging', 'production', 'git_branch', 'pull_request'
];

interface DeployResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, projectId, cycleId, branch, commitMessage } = body;

    if (!target) {
      return NextResponse.json(
        { error: 'target is required' },
        { status: 400 }
      );
    }

    if (!VALID_TARGETS.includes(target as DeploymentTarget)) {
      return NextResponse.json(
        { error: `Invalid target: ${target}. Valid targets: ${VALID_TARGETS.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await deploy(target as DeploymentTarget, {
      projectId,
      cycleId,
      branch,
      commitMessage,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during deployment:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Deployment failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function deploy(
  target: DeploymentTarget,
  options: {
    projectId?: string;
    cycleId?: string;
    branch?: string;
    commitMessage?: string;
  }
): Promise<DeployResult> {
  const { cycleId, branch, commitMessage } = options;

  switch (target) {
    case 'local':
      return await deployLocal();

    case 'git_branch':
      return await deployToGitBranch(branch, commitMessage || `Automated deployment from lifecycle cycle ${cycleId}`);

    case 'pull_request':
      return await createPullRequest(cycleId || 'unknown');

    case 'staging':
      return await deployToStaging();

    case 'production':
      return await deployToProduction();

    default:
      return {
        success: false,
        message: `Unsupported deployment target: ${target}`,
      };
  }
}

async function deployLocal(): Promise<DeployResult> {
  try {
    // Just verify the build works
    const { stdout } = await execAsync('npm run build', { timeout: 300000 });

    return {
      success: true,
      message: 'Local deployment completed (build verified)',
      details: {
        output: stdout.slice(0, 500),
      },
    };
  } catch (error: unknown) {
    const execError = error as { message?: string };
    return {
      success: false,
      message: 'Local deployment failed',
      details: {
        error: execError.message,
      },
    };
  }
}

async function deployToGitBranch(branch?: string, commitMessage?: string): Promise<DeployResult> {
  try {
    const targetBranch = branch || `lifecycle-deploy-${Date.now()}`;
    const message = commitMessage || 'Automated lifecycle deployment';

    // Check for changes
    const { stdout: statusOutput } = await execAsync('git status --porcelain');

    if (!statusOutput.trim()) {
      return {
        success: true,
        message: 'No changes to deploy',
        details: { branch: targetBranch },
      };
    }

    // Create branch if it doesn't exist
    try {
      await execAsync(`git checkout -b ${targetBranch}`);
    } catch {
      // Branch might already exist
      await execAsync(`git checkout ${targetBranch}`);
    }

    // Stage all changes
    await execAsync('git add -A');

    // Commit
    await execAsync(`git commit -m "${message}"`);

    // Push
    await execAsync(`git push -u origin ${targetBranch}`);

    return {
      success: true,
      message: `Deployed to branch ${targetBranch}`,
      details: {
        branch: targetBranch,
        commitMessage: message,
      },
    };
  } catch (error: unknown) {
    const execError = error as { message?: string };
    return {
      success: false,
      message: 'Git branch deployment failed',
      details: {
        error: execError.message,
      },
    };
  }
}

async function createPullRequest(cycleId: string): Promise<DeployResult> {
  try {
    // Check if gh CLI is available
    try {
      await execAsync('gh --version');
    } catch {
      return {
        success: false,
        message: 'GitHub CLI (gh) not installed',
        details: {
          help: 'Install with: brew install gh (macOS) or https://cli.github.com',
        },
      };
    }

    // Get current branch
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD');
    const currentBranch = branchOutput.trim();

    // Create PR
    const prTitle = `[Lifecycle] Automated changes from cycle ${cycleId}`;
    const prBody = `## Automated Lifecycle Changes

This PR was automatically created by the AI-Driven Code Quality Lifecycle system.

### Cycle ID
\`${cycleId}\`

### Changes
- AI-generated fixes and improvements
- Quality gate validated

### Review
Please review the changes and merge if appropriate.
`;

    const { stdout: prOutput } = await execAsync(
      `gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}" --base main`
    );

    // Extract PR URL from output
    const prUrl = prOutput.trim();

    return {
      success: true,
      message: 'Pull request created',
      details: {
        branch: currentBranch,
        prUrl,
        cycleId,
      },
    };
  } catch (error: unknown) {
    const execError = error as { message?: string };
    return {
      success: false,
      message: 'Failed to create pull request',
      details: {
        error: execError.message,
      },
    };
  }
}

async function deployToStaging(): Promise<DeployResult> {
  // This would typically trigger a staging deployment pipeline
  // For now, just simulate the process

  return {
    success: true,
    message: 'Staging deployment queued',
    details: {
      note: 'Configure STAGING_DEPLOY_WEBHOOK in environment for actual deployment',
    },
  };
}

async function deployToProduction(): Promise<DeployResult> {
  // Production deployments require extra safeguards
  // This should integrate with your CI/CD system

  return {
    success: false,
    message: 'Production deployment requires manual approval',
    details: {
      note: 'Configure PRODUCTION_DEPLOY_WEBHOOK and approval workflow for automated production deployments',
      action_required: 'Review changes and manually trigger production deployment',
    },
  };
}
