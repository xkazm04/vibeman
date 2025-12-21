import { NextRequest, NextResponse } from 'next/server';
import type { GitHubIssueData } from '@/app/features/Social/lib/types/aiTypes';
import { generateGitHubIssueMarkdown } from '@/app/features/Social/lib/types/aiTypes';

// GitHub API configuration - can be overridden via environment variables
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'xkazm04';
const GITHUB_REPO = process.env.GITHUB_REPO || 'vibeman';
const GITHUB_API_BASE = 'https://api.github.com';

interface CreateIssueRequest {
  feedbackId: string;
  issue: GitHubIssueData;
}

interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
}

/**
 * POST /api/social/github
 * Creates a GitHub issue
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateIssueRequest = await request.json();
    const { feedbackId, issue } = body;

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'feedbackId is required' },
        { status: 400 }
      );
    }

    if (!issue || !issue.title) {
      return NextResponse.json(
        { error: 'issue data with title is required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('[GitHub API] GITHUB_TOKEN not configured');
      return NextResponse.json(
        { error: 'GitHub integration not configured. Please add GITHUB_TOKEN to environment.' },
        { status: 500 }
      );
    }

    // Generate markdown body for the issue
    const issueBody = generateGitHubIssueMarkdown(issue) + '\n\n---\n\n@copilot please implement this fix.';

    const githubPayload = {
      title: issue.title,
      body: issueBody,
      labels: issue.labels || ['bug', 'ai-generated'],
    };

    console.log(`[GitHub API] Creating issue for feedback ${feedbackId}:`, {
      title: issue.title,
      labels: githubPayload.labels,
    });

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(githubPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GitHub API] Failed to create issue:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        {
          error: `GitHub API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const createdIssue: GitHubIssueResponse = await response.json();

    console.log(`[GitHub API] Successfully created issue #${createdIssue.number}:`, createdIssue.html_url);

    return NextResponse.json({
      success: true,
      feedbackId,
      issue: {
        id: createdIssue.id,
        number: createdIssue.number,
        title: createdIssue.title,
        url: createdIssue.html_url,
        state: createdIssue.state,
      },
    });
  } catch (error) {
    console.error('[GitHub API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/github
 * Check GitHub integration status
 */
export async function GET() {
  const hasToken = !!process.env.GITHUB_TOKEN;

  return NextResponse.json({
    status: hasToken ? 'configured' : 'not_configured',
    repository: `${GITHUB_OWNER}/${GITHUB_REPO}`,
    apiVersion: '2022-11-28',
  });
}
