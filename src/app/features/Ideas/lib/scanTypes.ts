/**
 * Scan type enums and interfaces
 */

export type ScanType = 
  | 'overall'
  | 'zen_architect'
  | 'bug_hunter'
  | 'perf_optimizer'
  | 'security_protector'
  | 'insight_synth'
  | 'ambiguity_guardian';

export type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export interface QueueItem {
  scanType: ScanType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ideaCount: number;
  error?: string;
}

export interface ContextQueueItem {
  contextId: string | null;
  contextName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ideaCount: number;
  error?: string;
}
