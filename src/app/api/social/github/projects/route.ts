import { NextRequest, NextResponse } from 'next/server';

// GitHub Projects V2 configuration
const GITHUB_PROJECT_NUMBER = 1;
const GITHUB_PROJECT_OWNER = process.env.GITHUB_OWNER || 'xkazm04';
const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

interface AddToProjectRequest {
  feedbackId: string;
  title: string;
  body: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function executeGraphQL<T>(query: string, variables: Record<string, unknown>, token: string): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL API error: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  if (!result.data) {
    throw new Error('No data returned from GitHub API');
  }

  return result.data;
}

// Get the project ID for the user's project
async function getProjectId(token: string): Promise<string> {
  const query = `
    query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
          title
        }
      }
    }
  `;

  const data = await executeGraphQL<{
    user: { projectV2: { id: string; title: string } | null };
  }>(query, { owner: GITHUB_PROJECT_OWNER, number: GITHUB_PROJECT_NUMBER }, token);

  if (!data.user?.projectV2) {
    throw new Error(`Project #${GITHUB_PROJECT_NUMBER} not found for user ${GITHUB_PROJECT_OWNER}`);
  }

  return data.user.projectV2.id;
}

// Get the Status field ID and Backlog option ID
async function getStatusFieldInfo(projectId: string, token: string): Promise<{
  fieldId: string;
  backlogOptionId: string;
}> {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  const data = await executeGraphQL<{
    node: { field: { id: string; options: Array<{ id: string; name: string }> } | null };
  }>(query, { projectId }, token);

  if (!data.node?.field) {
    throw new Error('Status field not found in project');
  }

  const backlogOption = data.node.field.options.find(
    opt => opt.name.toLowerCase() === 'backlog'
  );

  if (!backlogOption) {
    throw new Error('Backlog option not found in Status field');
  }

  return {
    fieldId: data.node.field.id,
    backlogOptionId: backlogOption.id,
  };
}

// Add a draft issue to the project
async function addDraftIssue(
  projectId: string,
  title: string,
  body: string,
  token: string
): Promise<string> {
  const query = `
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {
        projectId: $projectId
        title: $title
        body: $body
      }) {
        projectItem {
          id
        }
      }
    }
  `;

  const data = await executeGraphQL<{
    addProjectV2DraftIssue: { projectItem: { id: string } };
  }>(query, { projectId, title, body }, token);

  return data.addProjectV2DraftIssue.projectItem.id;
}

// Set the Status field to Backlog
async function setItemStatus(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
  token: string
): Promise<void> {
  const query = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await executeGraphQL(query, { projectId, itemId, fieldId, optionId }, token);
}

/**
 * POST /api/social/github/projects
 * Adds a feedback item to GitHub Projects as a draft issue in Backlog
 */
export async function POST(request: NextRequest) {
  try {
    const body: AddToProjectRequest = await request.json();
    const { feedbackId, title, body: issueBody } = body;

    if (!feedbackId || !title) {
      return NextResponse.json(
        { error: 'feedbackId and title are required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('[GitHub Projects] GITHUB_TOKEN not configured');
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 500 }
      );
    }

    console.log(`[GitHub Projects] Adding feedback ${feedbackId} to project...`);

    // Step 1: Get project ID
    const projectId = await getProjectId(githubToken);
    console.log(`[GitHub Projects] Found project ID: ${projectId}`);

    // Step 2: Get Status field info
    const { fieldId, backlogOptionId } = await getStatusFieldInfo(projectId, githubToken);
    console.log(`[GitHub Projects] Found Status field: ${fieldId}, Backlog option: ${backlogOptionId}`);

    // Step 3: Add draft issue
    const itemId = await addDraftIssue(
      projectId,
      title,
      `${issueBody}\n\n---\n*Feedback ID: ${feedbackId}*`,
      githubToken
    );
    console.log(`[GitHub Projects] Created draft issue: ${itemId}`);

    // Step 4: Set status to Backlog
    await setItemStatus(projectId, itemId, fieldId, backlogOptionId, githubToken);
    console.log(`[GitHub Projects] Set status to Backlog`);

    return NextResponse.json({
      success: true,
      feedbackId,
      projectItemId: itemId,
      status: 'Backlog',
    });
  } catch (error) {
    console.error('[GitHub Projects] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/github/projects
 * Check GitHub Projects integration status
 */
export async function GET() {
  const hasToken = !!process.env.GITHUB_TOKEN;

  return NextResponse.json({
    status: hasToken ? 'configured' : 'not_configured',
    projectOwner: GITHUB_PROJECT_OWNER,
    projectNumber: GITHUB_PROJECT_NUMBER,
  });
}
