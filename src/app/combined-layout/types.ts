// Types for the combined layout system
export type ViewState = 'normal' | 'maximized' | 'minimized';

export interface FilterOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | null;
  count: number;
}

export interface EventData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  details?: string;
}

export interface TaskData {
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
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskCounts {
  pending: number;
  processing: number;
  completed: number;
  error: number;
  cancelled: number;
}

export interface CombinedLayoutProps {
  className?: string;
  initialViewState?: ViewState;
}

export interface PanelControlsProps {
  viewState: ViewState;
  isLoading: boolean;
  isQueueActive: boolean;
  taskCounts: TaskCounts;
  onViewStateChange: (state: ViewState) => void;
  onRefresh: () => Promise<void>;
  onStartQueue: () => Promise<void>;
  onStopQueue: () => Promise<void>;
}

export interface FilterBarProps {
  options: FilterOption[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  className?: string;
}

export interface StatusIndicatorProps {
  isActive: boolean;
  label: string;
  className?: string;
}