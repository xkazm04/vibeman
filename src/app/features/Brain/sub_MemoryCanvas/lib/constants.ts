import type { SignalType } from './types';

export const COLORS: Record<SignalType, string> = {
  git_activity: '#10b981',
  api_focus: '#3b82f6',
  context_focus: '#a855f7',
  implementation: '#f59e0b',
};

export const LABELS: Record<SignalType, string> = {
  git_activity: 'Git',
  api_focus: 'API',
  context_focus: 'Context',
  implementation: 'Impl',
};

export const CONTEXT_NAMES = [
  'Auth Module', 'Payment Gateway', 'User Dashboard', 'API Layer',
  'Data Pipeline', 'Search Engine', 'Notification System', 'File Storage',
  'Analytics Engine', 'Config Service',
];

export const SUMMARIES: Record<SignalType, string[]> = {
  git_activity: ['Committed refactor', 'Merged feature', 'Fixed conflicts', 'Pushed hotfix', 'Tagged release', 'Rebased branch'],
  api_focus: ['Optimized endpoint', 'Added rate limit', 'Fixed CORS', 'Cached queries', 'Added versioning', 'Updated docs'],
  context_focus: ['Analyzed deps', 'Mapped relations', 'Scanned debt', 'Reviewed arch', 'Updated bounds', 'Audited exports'],
  implementation: ['Built feature', 'Created hook', 'Added dark mode', 'Refactored state', 'Built drag-drop', 'Added shortcuts'],
};

export const BG = '#0f0f11';
export const BUBBLE_SCALE = 28;
export const BUBBLE_PADDING = 20;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const FOCUS_ZOOM_THRESHOLD = 1.8;
export const LANE_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];
