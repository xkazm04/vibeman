/**
 * Standup Module Types
 * Shared type definitions for the standup automation system
 */

// Goal candidate from LLM generation
export interface GoalCandidate {
  title: string;
  description: string;
  reasoning: string;
  priorityScore: number;
  suggestedContext?: string;
  category: string;
  source: string;
  relatedItems?: string[];
}

// Project with its generated candidates
export interface ProjectCandidates {
  projectId: string;
  projectName: string;
  candidates: GoalCandidate[];
}

// Automation service status
export interface AutomationStatus {
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
  totalCyclesRun: number;
  stats: {
    goalsEvaluated: number;
    statusesUpdated: number;
    goalsGenerated: number;
    tasksCreated: number;
  };
}

// Automation configuration
export interface AutomationConfig {
  enabled: boolean;
  intervalMinutes: number;
  autonomyLevel: 'suggest' | 'cautious' | 'autonomous';
  strategy: 'build' | 'polish';
  modes: {
    evaluateGoals: boolean;
    updateStatuses: boolean;
    generateGoals: boolean;
    createAnalysisTasks: boolean;
  };
}

// Goal item in project review
export interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  context_id: string | null;
  order_index: number;
}

export type GoalStatus = 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';

// Status display configuration
export interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  border: string;
}

// Project with goals summary
export interface ProjectWithGoals {
  id: string;
  name: string;
  path: string;
  type: string;
  goalsCount: number;
  openCount: number;
  inProgressCount: number;
}

// Option configuration for selectors
export interface OptionConfig {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  bg?: string;
  border?: string;
}

export interface IntervalOption {
  value: number;
  label: string;
}
