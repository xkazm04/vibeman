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

export const BG = '#0f0f11';

// Visual hierarchy
export const DOT_RADIUS_MIN = 3;
export const DOT_RADIUS_MAX = 14;
export const RECENCY_GLOW_HOURS = 6;
export const LABEL_MIN_ZOOM = 0.8;
export const LABEL_COLLISION_PADDING = 4;
export const BUBBLE_SCALE = 28;
export const BUBBLE_PADDING = 20;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const FOCUS_ZOOM_THRESHOLD = 1.8;
export const LANE_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];
