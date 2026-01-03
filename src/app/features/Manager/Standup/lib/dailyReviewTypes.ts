/**
 * Daily Review Types
 * Types for manual standup daily review system
 */

export type DailyReviewDecision = 'new_goal' | 'goal_update' | 'no_change';

export interface ProjectReviewStatus {
  projectId: string;
  projectName: string;
  projectPath: string;
  decision: DailyReviewDecision | null;
  reviewedAt: string | null;
  screenshotPath?: string;
}

export interface DailyReviewState {
  date: string; // ISO date YYYY-MM-DD
  projects: ProjectReviewStatus[];
  currentIndex: number;
  isComplete: boolean;
}

export interface DailyReviewSummary {
  date: string;
  totalProjects: number;
  reviewedCount: number;
  newGoals: number;
  goalUpdates: number;
  noChanges: number;
}
