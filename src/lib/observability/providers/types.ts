/**
 * Observability Provider Interface
 * Defines the contract for logging API calls and errors
 */

export interface ApiCallData {
  project_id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status_code: number;
  response_time_ms: number;
  request_size_bytes?: number;
  response_size_bytes?: number;
  user_agent?: string;
  error_message?: string;
  called_at?: string;
}

export interface ErrorData {
  project_id: string;
  endpoint?: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  context?: Record<string, unknown>;
  occurred_at?: string;
}

export interface ObservabilityProvider {
  name: string;

  /**
   * Initialize the provider (e.g., connect to service)
   */
  init(): Promise<void>;

  /**
   * Log an API call
   */
  logApiCall(data: ApiCallData): Promise<void>;

  /**
   * Log an error
   */
  logError(data: ErrorData): Promise<void>;

  /**
   * Flush any buffered data (for batch providers)
   */
  flush(): Promise<void>;

  /**
   * Cleanup and close connections
   */
  close(): Promise<void>;
}

export interface ProviderConfig {
  projectId: string;
  enabled: boolean;
  sampleRate: number;
  endpointsToTrack: string[] | null;
}
