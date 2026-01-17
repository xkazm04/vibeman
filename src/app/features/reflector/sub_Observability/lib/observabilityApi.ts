/**
 * API functions for Observability Dashboard
 */

import { ObsStatsResponse, ObsConfigResponse, OnboardingResult, ObsEndpointSummary } from './types';

interface StatsApiResponse {
  success: boolean;
  hasData: boolean;
  message?: string;
  stats: ObsStatsResponse | null;
  topEndpoints?: ObsEndpointSummary[];
  highErrorEndpoints?: ObsEndpointSummary[];
}

interface ConfigApiResponse {
  success: boolean;
  config: ObsConfigResponse | null;
  message?: string;
}

/**
 * Fetch observability stats for a project
 */
export async function fetchObservabilityStats(projectId: string, days: number = 7): Promise<StatsApiResponse> {
  const response = await fetch(`/api/observability/stats?projectId=${encodeURIComponent(projectId)}&days=${days}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch observability config for a project
 */
export async function fetchObservabilityConfig(projectId: string): Promise<ConfigApiResponse> {
  const response = await fetch(`/api/observability/config?projectId=${encodeURIComponent(projectId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update observability config
 */
export async function updateObservabilityConfig(
  projectId: string,
  updates: Partial<{
    enabled: boolean;
    provider: 'local' | 'sentry';
    sentry_dsn: string | null;
    sample_rate: number;
    endpoints_to_track: string[] | null;
  }>
): Promise<ConfigApiResponse> {
  const response = await fetch('/api/observability/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ...updates })
  });

  if (!response.ok) {
    throw new Error(`Failed to update config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create observability config
 */
export async function createObservabilityConfig(
  projectId: string,
  config: Partial<{
    enabled: boolean;
    provider: 'local' | 'sentry';
    sentry_dsn: string;
    sample_rate: number;
    endpoints_to_track: string[];
  }> = {}
): Promise<ConfigApiResponse> {
  const response = await fetch('/api/observability/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ...config })
  });

  if (!response.ok) {
    throw new Error(`Failed to create config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate onboarding requirement file
 */
export async function generateOnboardingRequirement(
  projectId: string,
  projectPath: string,
  projectName?: string
): Promise<OnboardingResult> {
  const response = await fetch('/api/observability/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      project_path: projectPath,
      project_name: projectName
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate onboarding: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if project is registered for observability
 */
export async function checkProjectRegistration(projectId: string): Promise<{
  registered: boolean;
  enabled: boolean;
  hasData: boolean;
  config: ObsConfigResponse | null;
}> {
  const response = await fetch(`/api/observability/register?projectId=${encodeURIComponent(projectId)}`);

  if (!response.ok) {
    throw new Error(`Failed to check registration: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    registered: data.registered,
    enabled: data.enabled,
    hasData: data.hasData,
    config: data.config
  };
}

/**
 * Onboarding status for stepper
 */
export interface OnboardingStatus {
  frameworkDetected: boolean;
  framework: string | null;
  requirementGenerated: boolean;
  requirementPath: string | null;
  hasData: boolean;
  endpointCount: number;
}

/**
 * Check detailed onboarding status for the stepper
 */
export async function checkOnboardingStatus(
  projectId: string,
  projectPath: string
): Promise<OnboardingStatus> {
  // Check if requirement file exists
  const onboardResponse = await fetch(`/api/observability/onboard?projectId=${encodeURIComponent(projectId)}&projectPath=${encodeURIComponent(projectPath)}`);

  let onboardData = { framework: null, requirementExists: false, requirementPath: null };
  if (onboardResponse.ok) {
    onboardData = await onboardResponse.json();
  }

  // Check if we have data
  const registration = await checkProjectRegistration(projectId);

  // If we have data, get endpoint count
  let endpointCount = 0;
  if (registration.hasData) {
    try {
      const stats = await fetchObservabilityStats(projectId, 7);
      endpointCount = stats.stats?.summary.unique_endpoints || 0;
    } catch {
      // Ignore errors getting count
    }
  }

  return {
    frameworkDetected: !!onboardData.framework,
    framework: onboardData.framework,
    requirementGenerated: onboardData.requirementExists,
    requirementPath: onboardData.requirementPath,
    hasData: registration.hasData,
    endpointCount
  };
}
