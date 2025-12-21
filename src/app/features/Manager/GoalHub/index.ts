/**
 * Goal Hub Feature Module
 * Goal-driven development orchestration system
 */

// Main layout
export { default as GoalHubLayout } from './GoalHubLayout';

// Components
export { default as GoalPanel } from './components/GoalPanel';
export { default as HypothesisTracker } from './components/HypothesisTracker';
export { default as HypothesisRow } from './components/HypothesisRow';
export { default as HypothesisCard } from './components/HypothesisCard';
export { default as ActivityFeed } from './components/ActivityFeed';
export { default as BreakdownPanel } from './components/BreakdownPanel';
export { default as GoalProgress } from './components/GoalProgress';

// Types
export type {
  ExtendedGoal,
  GoalHypothesis,
  AgentResponse,
  HypothesisStatus,
  HypothesisCategory,
  EvidenceType,
} from '@/app/db/models/goal-hub.types';
