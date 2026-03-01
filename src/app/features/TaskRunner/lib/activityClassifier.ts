/**
 * Activity Classifier
 *
 * Parses Claude Code stream-json output to extract tool usage and classify activity.
 *
 * Delegates all raw-string parsing to the TaskOutputSchema structured parser,
 * then converts typed events into ActivityEvents for backward compatibility.
 * The TOOL_TO_ACTIVITY mapping and target extraction logic are now centralized
 * in taskOutputSchema.ts — this module is a thin adapter.
 */

import type {
  ActivityType,
} from './constants';
import type {
  ActivityEvent,
  TaskActivity,
} from './activityClassifier.types';
import {
  parseProgressLine as parseStructuredLine,
  parseAllProgressLines,
  getToolInvocations,
  type ToolInvocationEvent,
} from './taskOutputSchema';

/**
 * Activity icons for display
 */
const ACTIVITY_ICONS: Record<ActivityType, string> = {
  reading: '📖',
  editing: '✏️',
  writing: '📝',
  searching: '🔍',
  executing: '🔧',
  planning: '📋',
  thinking: '💭',
  idle: '⏸️',
};

/**
 * Activity labels for display
 */
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  reading: 'Reading',
  editing: 'Editing',
  writing: 'Writing',
  searching: 'Searching',
  executing: 'Executing',
  planning: 'Planning',
  thinking: 'Analyzing',
  idle: 'Idle',
};

/**
 * Convert a structured ToolInvocationEvent to a legacy ActivityEvent.
 */
function toActivityEvent(invocation: ToolInvocationEvent): ActivityEvent {
  return {
    type: invocation.activityType,
    tool: invocation.tool,
    target: invocation.target,
    timestamp: invocation.timestamp,
  };
}

/**
 * Parse a single line from stream-json output.
 * Returns an ActivityEvent if a tool_use is detected, null otherwise.
 *
 * Now delegates to the structured parser and converts the first
 * tool_invocation event back to the legacy ActivityEvent format.
 */
export function parseStreamJsonLine(line: string): ActivityEvent | null {
  // Wrap line in STDOUT format since parseStructuredLine expects progress line format
  const wrappedLine = `[STDOUT] ${line}`;
  const events = parseStructuredLine(wrappedLine);
  const invocations = getToolInvocations(events);

  if (invocations.length > 0) {
    return toActivityEvent(invocations[0]);
  }

  return null;
}

/**
 * Parse multiple progress lines and extract activity events.
 *
 * Now delegates to the structured parser and converts tool invocations
 * to legacy ActivityEvents.
 */
export function parseProgressLines(lines: string[]): ActivityEvent[] {
  const structuredEvents = parseAllProgressLines(lines);
  return getToolInvocations(structuredEvents).map(toActivityEvent);
}

/**
 * Classify overall activity from a list of events
 */
export function classifyActivity(events: ActivityEvent[]): TaskActivity {
  const toolCounts: Record<string, number> = {};

  // Count tool usage
  for (const event of events) {
    toolCounts[event.tool] = (toolCounts[event.tool] || 0) + 1;
  }

  // Calculate durations between events
  const eventsWithDuration = events.map((event, index) => {
    if (index === 0) return event;
    const prevEvent = events[index - 1];
    const duration = event.timestamp.getTime() - prevEvent.timestamp.getTime();
    return { ...event, duration };
  });

  // Get current activity (most recent)
  const currentActivity = eventsWithDuration.length > 0
    ? eventsWithDuration[eventsWithDuration.length - 1]
    : null;

  // Get last 5 events for history
  const activityHistory = eventsWithDuration.slice(-5);

  // Determine phase based on recent activity patterns
  const phase = determinePhase(eventsWithDuration.slice(-10));

  return {
    currentActivity,
    activityHistory,
    toolCounts,
    phase,
  };
}

/**
 * Determine the current phase of execution based on recent activity
 */
function determinePhase(recentEvents: ActivityEvent[]): TaskActivity['phase'] {
  if (recentEvents.length === 0) return 'idle';

  // Count activity types in recent events
  const typeCounts: Record<ActivityType, number> = {
    reading: 0,
    editing: 0,
    writing: 0,
    searching: 0,
    executing: 0,
    planning: 0,
    thinking: 0,
    idle: 0,
  };

  for (const event of recentEvents) {
    typeCounts[event.type]++;
  }

  // Determine phase based on dominant activity
  if (typeCounts.planning > 0 && typeCounts.editing === 0) {
    return 'planning';
  }
  if (typeCounts.executing > typeCounts.editing) {
    return 'validating';
  }
  if (typeCounts.editing > 0 || typeCounts.writing > 0) {
    return 'implementing';
  }
  if (typeCounts.reading > 0 || typeCounts.searching > 0) {
    return 'analyzing';
  }

  return 'idle';
}

/**
 * Get the icon for an activity type
 */
export function getActivityIcon(type: ActivityType): string {
  return ACTIVITY_ICONS[type] || '❓';
}

/**
 * Get the label for an activity type
 */
export function getActivityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type] || 'Unknown';
}

/**
 * Format an activity event for display
 */
export function formatActivityEvent(event: ActivityEvent): string {
  const icon = getActivityIcon(event.type);
  const label = getActivityLabel(event.type);
  const target = event.target ? ` ${event.target}` : '';
  return `${icon} ${label}${target}`;
}

/**
 * Get phase icon
 */
export function getPhaseIcon(phase: TaskActivity['phase']): string {
  switch (phase) {
    case 'analyzing': return '🔍';
    case 'planning': return '📋';
    case 'implementing': return '🔨';
    case 'validating': return '✅';
    case 'idle': return '⏸️';
    default: return '❓';
  }
}

/**
 * Get phase label
 */
export function getPhaseLabel(phase: TaskActivity['phase']): string {
  switch (phase) {
    case 'analyzing': return 'Analyzing';
    case 'planning': return 'Planning';
    case 'implementing': return 'Implementing';
    case 'validating': return 'Validating';
    case 'idle': return 'Idle';
    default: return 'Unknown';
  }
}
