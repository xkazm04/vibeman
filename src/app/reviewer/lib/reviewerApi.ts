/**
 * Reviewer API Operations
 * Handles all API calls for code review functionality
 */

import {
  PendingCountResponse,
  PendingSessionsResponse,
  FileActionResponse,
  AcceptFileRequest,
  RejectFileRequest,
  DeclineSessionRequest
} from './reviewerTypes';

/**
 * Fetch count of pending files for review
 */
export async function fetchPendingCount(projectId: string): Promise<number> {
  const response = await fetch(`/api/reviewer/pending-count?projectId=${projectId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch pending count');
  }
  
  const data: PendingCountResponse = await response.json();
  return data.count || 0;
}

/**
 * Fetch pending review sessions grouped by task
 */
export async function fetchPendingSessions(projectId: string): Promise<PendingSessionsResponse> {
  const response = await fetch(`/api/reviewer/pending-sessions?projectId=${projectId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch pending sessions');
  }
  
  return await response.json();
}

/**
 * Accept a file and apply changes
 */
export async function acceptFile(request: AcceptFileRequest): Promise<FileActionResponse> {
  const response = await fetch('/api/reviewer/accept-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error('Failed to accept file');
  }

  return await response.json();
}

/**
 * Reject a file and discard changes
 */
export async function rejectFile(request: RejectFileRequest): Promise<FileActionResponse> {
  const response = await fetch('/api/reviewer/reject-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error('Failed to reject file');
  }

  return await response.json();
}

/**
 * Decline entire session (reject all files in session)
 */
export async function declineSession(request: DeclineSessionRequest): Promise<FileActionResponse> {
  const response = await fetch('/api/reviewer/decline-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error('Failed to decline session');
  }

  return await response.json();
}
