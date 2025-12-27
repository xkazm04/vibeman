// Social feature main exports
export { SocialLayout, default } from './SocialLayout';

// Components - export directly to avoid conflicts
export {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
} from './components';

// Hooks - export specific hooks
export { useSplitView } from './hooks/useSplitView';

// Types - import from specific modules as needed
export type { FeedbackItem, KanbanChannel } from './lib/types/feedbackTypes';
export type { FeedbackAnalysisResult, AIProcessingStatus } from './lib/types/aiTypes';

// State providers
export { KanbanStateProviders } from './state/KanbanStateProviders';
