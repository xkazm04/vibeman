/**
 * Focus Mode Types
 * Types for focus sessions, pomodoro tracking, and productivity analytics
 */

// Focus session status
export type FocusSessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'abandoned';

// Database types for focus sessions
export interface DbFocusSession {
  id: string;
  project_id: string;
  goal_id: string | null; // Optional link to a goal
  context_id: string | null; // Optional link to a context

  // Session configuration
  title: string;
  description: string | null;
  duration_minutes: number; // Planned duration
  session_type: 'pomodoro' | 'deep_work' | 'custom';

  // Status tracking
  status: FocusSessionStatus;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;

  // Time tracking
  total_elapsed_seconds: number; // Actual time worked
  total_paused_seconds: number; // Time spent paused

  // Pomodoro tracking
  pomodoro_count: number; // Number of completed pomodoros
  pomodoro_target: number; // Target number of pomodoros
  current_pomodoro_start: string | null; // When current pomodoro started

  // Productivity metrics
  productivity_score: number | null; // AI-calculated score 0-100
  focus_quality: 'excellent' | 'good' | 'fair' | 'poor' | null;
  distractions_count: number; // User-reported distractions

  // AI suggestions
  ai_suggested_duration: number | null; // AI-suggested optimal duration
  ai_suggestion_reason: string | null; // Why AI suggested this duration

  // Session notes
  notes: string | null;
  accomplishments: string | null; // What was accomplished (JSON array)

  // Metadata
  created_at: string;
  updated_at: string;
}

// Focus break between sessions
export interface DbFocusBreak {
  id: string;
  session_id: string;
  break_type: 'short' | 'long' | 'custom';
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  skipped: number; // Boolean flag (0 or 1)
  created_at: string;
}

// Daily focus statistics
export interface DbFocusStats {
  id: string;
  project_id: string;
  date: string; // YYYY-MM-DD

  // Session counts
  total_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;

  // Time tracking
  total_focus_minutes: number;
  total_break_minutes: number;

  // Pomodoro stats
  total_pomodoros: number;

  // Quality metrics
  avg_productivity_score: number | null;
  avg_focus_quality: string | null;

  // Streak tracking
  current_streak_days: number;
  longest_streak_days: number;

  // Implementation correlation
  implementations_during_focus: number;
  ideas_generated_during_focus: number;

  created_at: string;
  updated_at: string;
}

// API Response types
export interface FocusSessionResponse {
  id: string;
  projectId: string;
  goalId: string | null;
  contextId: string | null;
  title: string;
  description: string | null;
  durationMinutes: number;
  sessionType: 'pomodoro' | 'deep_work' | 'custom';
  status: FocusSessionStatus;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  totalElapsedSeconds: number;
  totalPausedSeconds: number;
  pomodoroCount: number;
  pomodoroTarget: number;
  currentPomodoroStart: string | null;
  productivityScore: number | null;
  focusQuality: 'excellent' | 'good' | 'fair' | 'poor' | null;
  distractionsCount: number;
  aiSuggestedDuration: number | null;
  aiSuggestionReason: string | null;
  notes: string | null;
  accomplishments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FocusStatsResponse {
  projectId: string;
  date: string;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  totalPomodoros: number;
  avgProductivityScore: number | null;
  avgFocusQuality: string | null;
  currentStreakDays: number;
  longestStreakDays: number;
  implementationsDuringFocus: number;
  ideasGeneratedDuringFocus: number;
}

// Create session request
export interface CreateFocusSessionRequest {
  projectId: string;
  goalId?: string;
  contextId?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  sessionType: 'pomodoro' | 'deep_work' | 'custom';
  pomodoroTarget?: number;
  useAiSuggestion?: boolean;
}

// Update session request
export interface UpdateFocusSessionRequest {
  status?: FocusSessionStatus;
  notes?: string;
  accomplishments?: string[];
  distractionsCount?: number;
  productivityScore?: number;
  focusQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

// Timer state for frontend
export interface FocusTimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  remainingSeconds: number;
  currentPomodoroNumber: number;
  isOnBreak: boolean;
  breakRemainingSeconds: number;
}

// Pomodoro configuration
export interface PomodoroConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakAfter: number; // After how many pomodoros
}

// Default pomodoro configuration
export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfter: 4,
};

// Focus mode UI settings
export interface FocusModeSettings {
  showOnlyCurrentTask: boolean;
  hideNotifications: boolean;
  playCompletionSound: boolean;
  autoStartBreaks: boolean;
  pomodoroConfig: PomodoroConfig;
}

export const DEFAULT_FOCUS_SETTINGS: FocusModeSettings = {
  showOnlyCurrentTask: true,
  hideNotifications: true,
  playCompletionSound: true,
  autoStartBreaks: true,
  pomodoroConfig: DEFAULT_POMODORO_CONFIG,
};
