/**
 * Lifecycle Deploy API
 * POST: Deploy changes as part of the lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DeploymentTarget } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleTypes';
import { logger } from '@/lib/logger';

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
    const { target, projectId, cycleId, branch, commitMessage, ideas, gateResults } = body;

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
      ideas,
      gateResults,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error during deployment:', { error });
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

interface DeployOptions {
  projectId?: string;
  cycleId?: string;
  branch?: string;
  commitMessage?: string;
  ideas?: Array<{ id: string; title: string; category: string; description?: string }>;
  gateResults?: Array<{ type: string; passed: boolean; message?: string }>;
}

async function deploy(
  target: DeploymentTarget,
  options: DeployOptions,
): Promise<DeployResult> {
  const { cycleId, branch, commitMessage } = options;

  switch (target) {
    case 'local':
      return await deployLocal();

    case 'git_branch':
      return await deployToGitBranch(branch, commitMessage || `Automated deployment from lifecycle cycle ${cycleId}`);

    case 'pull_request':
      return await createPullRequest(cycleId || 'unknown', options);

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

async function createPullRequest(cycleId: string, options: DeployOptions = {}): Promise<DeployResult> {
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

    // Build rich PR title from idea titles
    const ideas = options.ideas || [];
    const prTitle = ideas.length > 0
      ? `[Lifecycle] ${ideas.map(i => i.title).slice(0, 3).join(', ')}`.slice(0, 100)
      : `[Lifecycle] Automated changes from cycle ${cycleId}`;

    // Build rich PR body
    const bodyParts: string[] = [
      '## Automated Lifecycle Changes',
      '',
      '> This PR was automatically created by the AI-Driven Code Quality Lifecycle system.',
      '',
      `**Cycle:** \`${cycleId}\``,
      '',
    ];

    if (ideas.length > 0) {
      bodyParts.push('### Ideas Implemented');
      for (const idea of ideas) {
        bodyParts.push(`- **${idea.title}** _(${idea.category})_`);
        if (idea.description) {
          bodyParts.push(`  ${idea.description.slice(0, 200)}`);
        }
      }
      bodyParts.push('');
    }

    const gates = options.gateResults || [];
    if (gates.length > 0) {
      bodyParts.push('### Quality Gates');
      for (const gate of gates) {
        const icon = gate.passed ? 'PASS' : 'FAIL';
        bodyParts.push(`- **${icon}** ${gate.type}${gate.message ? `: ${gate.message}` : ''}`);
      }
      bodyParts.push('');
    }

    bodyParts.push('### Review');
    bodyParts.push('Please review the changes and merge if appropriate.');
    bodyParts.push('');
    bodyParts.push('---');
    bodyParts.push('_Generated by AI-Driven Code Quality Lifecycle_');

    const prBody = bodyParts.join('\n');

    // Write body to temp file to avoid shell escaping issues
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    const bodyFile = path.join(os.tmpdir(), `lifecycle-pr-body-${Date.now()}.md`);
    await fs.writeFile(bodyFile, prBody, 'utf-8');

    try {
      const { stdout: prOutput } = await execAsync(
        `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file "${bodyFile}" --base main`
      );

      const prUrl = prOutput.trim();

      return {
        success: true,
        message: 'Pull request created',
        details: {
          branch: currentBranch,
          prUrl,
          cycleId,
          ideas_count: ideas.length,
        },
      };
    } finally {
      await fs.unlink(bodyFile).catch(() => {});
    }
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
