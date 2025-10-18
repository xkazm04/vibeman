// import { BackgroundTask } from '../types/backgroundTasks';

// Temporary interface until BackgroundTask type is available
interface BackgroundTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  [key: string]: any;
}

export interface ViewState {
  current: 'normal' | 'maximized' | 'minimized';
  set: (state: 'normal' | 'maximized' | 'minimized') => void;
}

export interface FilterState {
  eventFilter: string;
  setEventFilter: (filter: string) => void;
  taskFilter: string;
  setTaskFilter: (filter: string) => void;
}

export interface QueueControls {
  isQueueActive: boolean;
  startQueue: () => Promise<void>;
  stopQueue: () => Promise<void>;
  taskCounts: {
    pending: number;
    processing: number;
    completed: number;
    error: number;
  };
}

export interface RefreshControls {
  isLoading: boolean;
  hasErrors: boolean;
  handleRefresh: () => Promise<void>;
  eventsError: Error | null;
  tasksError: Error | null;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  task: BackgroundTask | null;
}

export interface MonitorLayoutProps {
  children: React.ReactNode;
  viewState: ViewState;
  queueControls: QueueControls;
  refreshControls: RefreshControls;
  totalItems: number;
}