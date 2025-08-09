// Background Task Types (client-safe)
export interface BackgroundTask {
  id: string;
  project_id: string;
  project_name: string;
  project_path: string;
  task_type: 'docs' | 'tasks' | 'goals' | 'context' | 'code';
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  result_data: string | null; // JSON string
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskQueueSettings {
  id: number;
  is_active: number; // SQLite boolean (0/1)
  poll_interval: number;
  max_concurrent_tasks: number;
  last_poll_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCounts {
  pending: number;
  processing: number;
  completed: number;
  error: number;
  cancelled: number;
}

export interface QueueSettings {
  isActive: boolean;
  pollInterval: number;
  maxConcurrentTasks: number;
  lastPollAt: string | null;
}