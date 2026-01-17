/**
 * Types for Observability Dashboard
 */

export interface ObsStatsResponse {
  project_id: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_calls: number;
    unique_endpoints: number;
    avg_response_time_ms: number;
    total_errors: number;
    error_rate: number;
  };
  endpoints: ObsEndpointSummary[];
  trends: {
    endpoint: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    change_percent: number;
  }[];
}

export interface ObsEndpointSummary {
  endpoint: string;
  method: string;
  total_calls: number;
  avg_response_time_ms: number;
  max_response_time_ms: number;
  error_count: number;
  error_rate: number;
  last_called_at: string;
}

export interface ObsConfigResponse {
  id: string;
  project_id: string;
  enabled: boolean;
  provider: 'local' | 'sentry';
  sentry_dsn: string | null;
  sample_rate: number;
  endpoints_to_track: string[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface OnboardingResult {
  success: boolean;
  requirementId: string;
  requirementPath: string;
  framework: string;
  message: string;
}
