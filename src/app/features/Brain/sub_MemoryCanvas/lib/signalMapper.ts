/**
 * Signal Mapper
 * Transforms DbBehavioralSignal records from the API into BrainEvent format
 * for the D3 canvas visualization.
 */

import type { BrainEvent, SignalType } from './types';
import type {
  DbBehavioralSignal,
  GitActivitySignalData,
  ApiFocusSignalData,
  ContextFocusSignalData,
  ImplementationSignalData,
  CrossTaskAnalysisSignalData,
  CrossTaskSelectionSignalData,
  CliMemorySignalData,
} from '@/app/db/models/brain.types';
import { canVisualizeSignal } from '@/types/signals';

/**
 * Extract a human-readable summary from the signal data payload
 */
function extractSummary(type: SignalType, data: Record<string, unknown>): string {
  switch (type) {
    case 'git_activity': {
      const git = data as unknown as GitActivitySignalData;
      if (git.commitMessage) return git.commitMessage.substring(0, 60);
      if (git.filesChanged?.length) return `${git.filesChanged.length} files changed`;
      return 'Git activity';
    }
    case 'api_focus': {
      const api = data as unknown as ApiFocusSignalData;
      if (api.endpoint) return `${api.method || 'GET'} ${api.endpoint}`;
      return 'API activity';
    }
    case 'context_focus': {
      const ctx = data as unknown as ContextFocusSignalData;
      if (ctx.actions?.length) return ctx.actions.join(', ');
      return 'Context focus';
    }
    case 'implementation': {
      const impl = data as unknown as ImplementationSignalData;
      if (impl.requirementName) return impl.requirementName.substring(0, 60);
      const fileCount = (impl.filesCreated?.length || 0) + (impl.filesModified?.length || 0);
      if (fileCount) return `${fileCount} files ${impl.success ? 'implemented' : 'attempted'}`;
      return impl.success ? 'Implementation success' : 'Implementation failed';
    }
    case 'cross_task_analysis': {
      const analysis = data as unknown as CrossTaskAnalysisSignalData;
      if (analysis.requirementSummary) return analysis.requirementSummary.substring(0, 60);
      return `${analysis.plansGenerated || 0} plans generated`;
    }
    case 'cross_task_selection': {
      const selection = data as unknown as CrossTaskSelectionSignalData;
      if (selection.planTitle) return selection.planTitle.substring(0, 60);
      return `Selected plan ${selection.selectedPlan}`;
    }
    case 'cli_memory': {
      const memory = data as unknown as CliMemorySignalData;
      if (memory.message) return memory.message.substring(0, 60);
      return `CLI ${memory.category || 'memory'}`;
    }
    default:
      return 'Unknown signal';
  }
}

/**
 * Map a single DbBehavioralSignal to a BrainEvent for the canvas.
 * Filters out non-visualizable signal types using canonical metadata.
 */
export function mapSignalToEvent(signal: DbBehavioralSignal): BrainEvent | null {
  const type = signal.signal_type as SignalType;

  // Only map signals that can be visualized (determined by canonical metadata)
  if (!canVisualizeSignal(type)) return null;

  // Parse data payload
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(signal.data);
  } catch {
    // If data can't be parsed, still create event with fallback summary
  }

  return {
    id: signal.id,
    type,
    context_id: signal.context_id || 'uncategorized',
    context_name: signal.context_name || 'Uncategorized',
    timestamp: new Date(signal.timestamp).getTime(),
    weight: Math.max(0.2, Math.min(2.0, signal.weight)),
    summary: extractSummary(type, data),
    x: 0,
    y: 0,
  };
}

/**
 * Map an array of signals to BrainEvents, filtering invalid entries
 * and limiting to maxCount for performance
 */
export function mapSignalsToEvents(signals: DbBehavioralSignal[], maxCount = 200): BrainEvent[] {
  const events: BrainEvent[] = [];

  for (const signal of signals) {
    if (events.length >= maxCount) break;
    const event = mapSignalToEvent(signal);
    if (event) events.push(event);
  }

  return events;
}
