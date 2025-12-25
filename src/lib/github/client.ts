/**
 * GitHub GraphQL Client
 * Handles authentication and API calls to GitHub Projects V2
 */

import { createLogger } from '@/lib/utils/logger';
import type { GitHubProjectConfig, GitHubProject, GitHubProjectItem } from './types';

const logger = createLogger('GitHubClient');

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Check if GitHub is configured via environment variables
 */
export function isGitHubConfigured(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

/**
 * Get GitHub token from environment
 */
export function getGitHubToken(): string | null {
  return process.env.GITHUB_TOKEN || null;
}

// ============================================================================
// GRAPHQL CLIENT
// ============================================================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

/**
 * Execute a GraphQL query against GitHub API
 */
export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string
): Promise<T> {
  const authToken = token || getGitHubToken();

  if (!authToken) {
    throw new Error('GitHub token not configured. Set GITHUB_TOKEN environment variable.');
  }

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Github-Next-Global-ID': '1', // Use new global IDs
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${text}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join(', ');
    throw new Error(`GitHub GraphQL errors: ${errorMessages}`);
  }

  if (!result.data) {
    throw new Error('No data returned from GitHub API');
  }

  return result.data;
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

/**
 * Get project details including field configuration
 */
export async function getProject(
  projectId: string,
  token?: string
): Promise<GitHubProject | null> {
  const query = `
    query GetProject($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          title
          number
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphqlRequest<{ node: GitHubProject }>(query, { projectId }, token);
    return data.node;
  } catch (error) {
    logger.error('Failed to get project:', error);
    return null;
  }
}

/**
 * Find project by owner and number
 */
export async function findProjectByNumber(
  owner: string,
  projectNumber: number,
  token?: string
): Promise<GitHubProject | null> {
  // First try as user
  const userQuery = `
    query FindUserProject($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
          title
          number
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const userData = await graphqlRequest<{ user: { projectV2: GitHubProject } }>(
      userQuery,
      { owner, number: projectNumber },
      token
    );
    if (userData.user?.projectV2) {
      return userData.user.projectV2;
    }
  } catch {
    // Try as organization
  }

  // Try as organization
  const orgQuery = `
    query FindOrgProject($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
          title
          number
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const orgData = await graphqlRequest<{ organization: { projectV2: GitHubProject } }>(
      orgQuery,
      { owner, number: projectNumber },
      token
    );
    if (orgData.organization?.projectV2) {
      return orgData.organization.projectV2;
    }
  } catch (error) {
    logger.error('Failed to find project:', error);
  }

  return null;
}

// ============================================================================
// ITEM MUTATIONS
// ============================================================================

/**
 * Add a draft item to the project
 */
export async function addDraftItem(
  projectId: string,
  title: string,
  body?: string,
  token?: string
): Promise<string> {
  const mutation = `
    mutation AddDraftItem($projectId: ID!, $title: String!, $body: String) {
      addProjectV2DraftItem(input: {
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

  const data = await graphqlRequest<{
    addProjectV2DraftItem: { projectItem: { id: string } }
  }>(mutation, { projectId, title, body }, token);

  return data.addProjectV2DraftItem.projectItem.id;
}

/**
 * Update a single select field (like Status)
 */
export async function updateSingleSelectField(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
  token?: string
): Promise<void> {
  const mutation = `
    mutation UpdateItemField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
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

  await graphqlRequest(mutation, { projectId, itemId, fieldId, optionId }, token);
}

/**
 * Update a date field (like Target Date)
 */
export async function updateDateField(
  projectId: string,
  itemId: string,
  fieldId: string,
  date: string, // ISO date string (YYYY-MM-DD)
  token?: string
): Promise<void> {
  const mutation = `
    mutation UpdateDateField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $date: Date!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { date: $date }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await graphqlRequest(mutation, { projectId, itemId, fieldId, date }, token);
}

/**
 * Update item title/body (for draft items)
 */
export async function updateDraftItem(
  projectId: string,
  itemId: string,
  title: string,
  body?: string,
  token?: string
): Promise<void> {
  // For draft items, we need to update via the item's content
  // This is a limitation - draft items can only update title through archive/recreate
  // For now, we'll just update status fields
  logger.warn('Draft item title update not fully supported - only status updates work');
}

/**
 * Delete an item from the project
 */
export async function deleteItem(
  projectId: string,
  itemId: string,
  token?: string
): Promise<void> {
  const mutation = `
    mutation DeleteItem($projectId: ID!, $itemId: ID!) {
      deleteProjectV2Item(input: {
        projectId: $projectId
        itemId: $itemId
      }) {
        deletedItemId
      }
    }
  `;

  await graphqlRequest(mutation, { projectId, itemId }, token);
}

/**
 * Get a project item by ID
 */
export async function getProjectItem(
  itemId: string,
  token?: string
): Promise<GitHubProjectItem | null> {
  const query = `
    query GetItem($itemId: ID!) {
      node(id: $itemId) {
        ... on ProjectV2Item {
          id
          content {
            __typename
            ... on DraftIssue {
              title
              body
            }
            ... on Issue {
              title
              body
            }
            ... on PullRequest {
              title
              body
            }
          }
          fieldValues(first: 10) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldSingleSelectValue {
                field { ... on ProjectV2SingleSelectField { name } }
                name
              }
              ... on ProjectV2ItemFieldDateValue {
                field { ... on ProjectV2Field { name } }
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphqlRequest<{ node: GitHubProjectItem }>(query, { itemId }, token);
    return data.node;
  } catch (error) {
    logger.error('Failed to get project item:', error);
    return null;
  }
}
