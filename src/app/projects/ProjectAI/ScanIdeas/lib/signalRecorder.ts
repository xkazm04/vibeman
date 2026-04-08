import { signalCollector } from '@/lib/brain/signalCollector';

/**
 * Record a Brain signal for idea generation activity.
 * This must never break idea generation, so errors are silently swallowed.
 */
export function recordIdeaGenerationSignal(
  projectId: string,
  contextId?: string,
  contextName?: string
): void {
  try {
    signalCollector.recordApiFocus(projectId, {
      endpoint: '/api/ideas/generate',
      method: 'POST',
      callCount: 1,
      avgResponseTime: 0,
      errorRate: 0,
    }, contextId || undefined, contextName || undefined);
  } catch {
    // Signal recording must never break idea generation
  }
}
