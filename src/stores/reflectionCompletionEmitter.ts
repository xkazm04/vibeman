/**
 * Reflection Completion Event Emitter
 *
 * Lightweight subscription pattern for reflection completion events.
 * When a reflection completes, components can subscribe to invalidate
 * their cached data (insights, effectiveness, outcomes) without polling.
 *
 * Usage in components:
 * ```ts
 * useEffect(() => {
 *   const unsubscribe = subscribeToReflectionCompletion((reflectionId, projectId) => {
 *     if (projectId === activeProject.id) {
 *       refetchInsights();
 *     }
 *   });
 *   return unsubscribe;
 * }, [activeProject.id]);
 * ```
 */

type CompletionListener = (reflectionId: string, projectId: string, scope: 'project' | 'global') => void;

class ReflectionCompletionEmitter {
  private listeners: Set<CompletionListener> = new Set();

  /**
   * Subscribe to reflection completion events.
   * @returns Unsubscribe function
   */
  subscribe(listener: CompletionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit a reflection completion event to all subscribers.
   */
  emit(reflectionId: string, projectId: string, scope: 'project' | 'global'): void {
    this.listeners.forEach(listener => {
      try {
        listener(reflectionId, projectId, scope);
      } catch (error) {
        console.error('[ReflectionCompletionEmitter] Listener error:', error);
      }
    });
  }

  /**
   * Get the number of active subscribers (for debugging).
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance
export const reflectionCompletionEmitter = new ReflectionCompletionEmitter();

/**
 * Subscribe to reflection completion events.
 * Returns an unsubscribe function for cleanup.
 */
export function subscribeToReflectionCompletion(listener: CompletionListener): () => void {
  return reflectionCompletionEmitter.subscribe(listener);
}
