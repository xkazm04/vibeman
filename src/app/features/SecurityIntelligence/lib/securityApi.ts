/**
 * Security Intelligence API Client
 * Provides functions to interact with the security intelligence endpoints
 */

import type {
  SecurityIntelligence,
  SecurityAlert,
  StaleBranch,
  SecurityDashboardSummary,
  RiskPrediction,
  CommunityScoreApiResponse,
} from '@/app/db/models/security-intelligence.types';

const API_BASE = '/api/security-intelligence';

/**
 * Fetch dashboard summary
 */
export async function fetchDashboardSummary(includeAlerts: boolean = true): Promise<{
  summary: SecurityDashboardSummary;
  pendingAlerts?: SecurityAlert[];
}> {
  const params = new URLSearchParams();
  if (includeAlerts) params.set('includeAlerts', 'true');

  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }
  return response.json();
}

/**
 * Fetch security intelligence for a specific project
 */
export async function fetchProjectIntelligence(
  projectId: string,
  includeAlerts: boolean = false
): Promise<{
  intelligence: SecurityIntelligence;
  alerts?: SecurityAlert[];
}> {
  const params = new URLSearchParams({ projectId });
  if (includeAlerts) params.set('includeAlerts', 'true');

  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch project intelligence');
  }
  return response.json();
}

/**
 * Update security intelligence for a project
 */
export async function updateProjectIntelligence(
  data: Partial<SecurityIntelligence> & { projectId: string; projectName: string; projectPath: string }
): Promise<{ intelligence: SecurityIntelligence }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update project intelligence');
  }
  return response.json();
}

/**
 * Fetch security alerts
 */
export async function fetchAlerts(
  projectId?: string,
  unacknowledgedOnly: boolean = true
): Promise<{ alerts: SecurityAlert[] }> {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (unacknowledgedOnly) params.set('unacknowledgedOnly', 'true');

  const response = await fetch(`${API_BASE}/alerts?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch alerts');
  }
  return response.json();
}

/**
 * Create a security alert
 */
export async function createAlert(
  alert: Omit<SecurityAlert, 'id' | 'createdAt' | 'acknowledged' | 'acknowledgedAt' | 'acknowledgedBy' | 'resolved' | 'resolvedAt'>
): Promise<{ alert: SecurityAlert }> {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  });
  if (!response.ok) {
    throw new Error('Failed to create alert');
  }
  return response.json();
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  id: string,
  acknowledgedBy?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'acknowledge', acknowledgedBy }),
  });
  if (!response.ok) {
    throw new Error('Failed to acknowledge alert');
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'resolve' }),
  });
  if (!response.ok) {
    throw new Error('Failed to resolve alert');
  }
}

/**
 * Fetch stale branches
 */
export async function fetchStaleBranches(
  projectId?: string,
  autoCloseEligibleOnly: boolean = false
): Promise<{ branches: StaleBranch[] }> {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (autoCloseEligibleOnly) params.set('autoCloseEligibleOnly', 'true');

  const response = await fetch(`${API_BASE}/stale-branches?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stale branches');
  }
  return response.json();
}

/**
 * Auto-close a stale branch
 */
export async function autoCloseBranch(
  id: string,
  projectPath: string
): Promise<{ success: boolean; branchName?: string }> {
  const response = await fetch(`${API_BASE}/stale-branches`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'auto-close', projectPath }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to auto-close branch');
  }
  return response.json();
}

/**
 * Preserve a stale branch (prevent auto-close)
 */
export async function preserveBranch(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/stale-branches`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'preserve' }),
  });
  if (!response.ok) {
    throw new Error('Failed to preserve branch');
  }
}

/**
 * Calculate risk score for a project
 */
export async function calculateRiskScore(projectId: string): Promise<RiskPrediction & { projectId: string }> {
  const response = await fetch(`${API_BASE}/risk-score?projectId=${projectId}`);
  if (!response.ok) {
    throw new Error('Failed to calculate risk score');
  }
  return response.json();
}

/**
 * Get community score for a package
 */
export async function getCommunityScore(
  packageName: string,
  packageVersion?: string
): Promise<CommunityScoreApiResponse> {
  const params = new URLSearchParams({ packageName });
  if (packageVersion) params.set('packageVersion', packageVersion);

  const response = await fetch(`${API_BASE}/community-scores?${params}`);
  if (!response.ok) {
    throw new Error('Failed to get community score');
  }
  return response.json();
}

/**
 * Submit a vote for a package
 */
export async function submitVote(
  projectId: string,
  packageName: string,
  packageVersion: string,
  vote: 'positive' | 'negative'
): Promise<void> {
  const response = await fetch(`${API_BASE}/community-scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, packageName, packageVersion, vote }),
  });
  if (!response.ok) {
    throw new Error('Failed to submit vote');
  }
}
