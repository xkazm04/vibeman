/**
 * Scan type enums and interfaces
 */

export type ScanType =
  | 'zen_architect'
  | 'bug_hunter'
  | 'perf_optimizer'
  | 'security_protector'
  | 'insight_synth'
  | 'ambiguity_guardian'
  | 'business_visionary'
  | 'ui_perfectionist'
  | 'feature_scout'
  | 'onboarding_optimizer'
  | 'ai_integration_scout'
  | 'delight_designer'
  | 'refactor_analysis';

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
  scanType: ScanType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ideaCount: number;
  error?: string;
}
