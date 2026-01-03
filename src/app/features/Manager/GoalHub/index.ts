/**
 * Goal Hub Feature Module
 * Goal-driven development orchestration system
 */

// Main layout
export { default as GoalHubLayout } from './GoalHubLayout';

// Components
export { default as GoalListPanel } from './components/GoalListPanel';
export { default as GoalListItem } from './components/GoalListItem';
export { default as GoalContextMenu } from './components/GoalContextMenu';
export { default as GoalHubHeader } from './components/GoalHubHeader';
export { default as SyncButtons } from './components/SyncButtons';
export { default as GoalDetailPanel } from './components/GoalDetailPanel';
export { default as GoalAddDrawer } from './components/GoalAddDrawer';
export { default as EmptyProjectState } from './components/EmptyProjectState';
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
