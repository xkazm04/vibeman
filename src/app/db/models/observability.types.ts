/**
 * Database model types for API Observability
 * Tracks API endpoint usage, response times, and error rates
 */

/**
 * Raw API call log entry
 */
export interface DbObsApiCall {
  id: string;
  project_id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status_code: number | null;
  response_time_ms: number | null;
  request_size_bytes: number | null;
  response_size_bytes: number | null;
  user_agent: string | null;
  error_message: string | null;
  called_at: string;
  created_at: string;
}

/**
 * Aggregated endpoint statistics (hourly rollups)
 */
export interface DbObsEndpointStats {
  id: string;
  project_id: string;
  endpoint: string;
  method: string;
  period_start: string;
  period_end: string;
  call_count: number;
  avg_response_time_ms: number | null;
  max_response_time_ms: number | null;
  error_count: number;
  total_request_bytes: number;
  total_response_bytes: number;
  created_at: string;
}

/**
 * Observability configuration per project
 */
export interface DbObsConfig {
  id: string;
  project_id: string;
  enabled: number; // Boolean 0|1
  provider: 'local' | 'sentry';
  sentry_dsn: string | null;
  sample_rate: number;
  endpoints_to_track: string | null; // JSON array, null = all
  created_at: string;
  updated_at: string | null;
}

// ===== Create/Update DTOs =====

export interface CreateObsApiCall {
  project_id: string;
  endpoint: string;
  method: DbObsApiCall['method'];
  status_code?: number;
  response_time_ms?: number;
  request_size_bytes?: number;
  response_size_bytes?: number;
  user_agent?: string;
  error_message?: string;
  called_at?: string;
}

export interface CreateObsEndpointStats {
  project_id: string;
  endpoint: string;
  method: string;
  period_start: string;
  period_end: string;
  call_count: number;
  avg_response_time_ms?: number;
  max_response_time_ms?: number;
  error_count?: number;
  total_request_bytes?: number;
  total_response_bytes?: number;
}

export interface UpdateObsEndpointStats {
  call_count?: number;
  avg_response_time_ms?: number;
  max_response_time_ms?: number;
  error_count?: number;
  total_request_bytes?: number;
  total_response_bytes?: number;
}

export interface CreateObsConfig {
  project_id: string;
  enabled?: boolean;
  provider?: 'local' | 'sentry';
  sentry_dsn?: string;
  sample_rate?: number;
  endpoints_to_track?: string[];
}

export interface UpdateObsConfig {
  enabled?: boolean;
  provider?: 'local' | 'sentry';
  sentry_dsn?: string | null;
  sample_rate?: number;
  endpoints_to_track?: string[] | null;
}

// ===== Query/Response Types =====

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

export interface ObsConfigResponse extends Omit<DbObsConfig, 'enabled' | 'endpoints_to_track'> {
  enabled: boolean;
  endpoints_to_track: string[] | null;
}
