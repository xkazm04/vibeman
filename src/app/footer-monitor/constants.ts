/**
 * Configuration constants for the combined layout
 */

// Timing constants
export const REFRESH_INTERVAL = 5000; // 5 seconds
export const AUTO_STOP_DELAY = 2000; // 2 seconds
export const TRANSITION_DURATION = 300; // 300ms

// API endpoints
export const QUEUE_API_ENDPOINT = '/api/kiro/background-tasks/queue';

// UI constants
export const MAX_EVENTS_DISPLAY = 50;
export const MIN_TAP_TARGET_SIZE = 44; // 44px minimum for touch targets

// View state heights
export const VIEW_HEIGHTS = {
    minimized: 'h-12',
    normal: 'h-[50vh]',
    maximized: 'h-[80vh]'
} as const;

// Filter colors
export const FILTER_COLORS = {
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    error: 'border-red-500/50 bg-red-500/10 text-red-400',
    success: 'border-green-500/50 bg-green-500/10 text-green-400',
    pending: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    processing: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    completed: 'border-green-500/50 bg-green-500/10 text-green-400',
    cancelled: 'border-gray-500/50 bg-gray-500/10 text-gray-400',
    default: 'border-gray-500/50 bg-gray-500/10 text-gray-400'
} as const;