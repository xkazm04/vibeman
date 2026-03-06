/**
 * Unified EventBus
 *
 * Single source of truth for all events in the system.
 * Replaces 8 competing event systems with one typed pub/sub bus.
 *
 * Features:
 * - Typed discriminated union events (task:*, agent:*, conductor:*, etc.)
 * - Namespace-based wildcard subscriptions (e.g., 'task:*')
 * - SSE subscriber management for real-time push to clients
 * - globalThis singleton for HMR survival
 * - In-memory ring buffer for recent event replay on SSE connect
 */

import type {
  BusEvent,
  EventKind,
  EventByKind,
  EventNamespace,
  EventHandler,
} from './types';

const GLOBAL_KEY = '__vibeman_eventBus';
const MAX_RECENT_EVENTS = 100;
const MAX_LISTENERS = 200;

type UnsubscribeFn = () => void;

interface SSESubscriber {
  id: string;
  projectId: string | null; // null = subscribe to all projects
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  closed: boolean;
}

class EventBusImpl {
  // Per-kind listeners
  private kindListeners: Map<EventKind, Set<EventHandler>> = new Map();
  // Namespace wildcard listeners (e.g., 'task' matches 'task:change', 'task:notification')
  private namespaceListeners: Map<EventNamespace, Set<EventHandler>> = new Map();
  // Global wildcard listeners (receive everything)
  private globalListeners: Set<EventHandler> = new Set();
  // SSE subscribers
  private sseSubscribers: Map<string, SSESubscriber> = new Map();
  // Recent events ring buffer for replay
  private recentEvents: BusEvent[] = [];

  // ── Publish ──────────────────────────────────────────────────────────

  /**
   * Publish an event to all matching subscribers.
   * Dispatches to: exact kind listeners → namespace wildcard → global wildcard → SSE.
   */
  emit(event: BusEvent): void {
    // Add to ring buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > MAX_RECENT_EVENTS) {
      this.recentEvents.shift();
    }

    // 1. Exact kind listeners
    const kindSet = this.kindListeners.get(event.kind);
    if (kindSet) {
      for (const handler of kindSet) {
        this.safeCall(handler, event);
      }
    }

    // 2. Namespace wildcard listeners
    const namespace = event.kind.split(':')[0] as EventNamespace;
    const nsSet = this.namespaceListeners.get(namespace);
    if (nsSet) {
      for (const handler of nsSet) {
        this.safeCall(handler, event);
      }
    }

    // 3. Global wildcard listeners
    for (const handler of this.globalListeners) {
      this.safeCall(handler, event);
    }

    // 4. Push to SSE subscribers
    this.pushToSSE(event);
  }

  // ── Subscribe ────────────────────────────────────────────────────────

  /**
   * Subscribe to a specific event kind.
   * Returns an unsubscribe function.
   */
  on<K extends EventKind>(kind: K, handler: EventHandler<EventByKind<K>>): UnsubscribeFn {
    if (!this.kindListeners.has(kind)) {
      this.kindListeners.set(kind, new Set());
    }
    const set = this.kindListeners.get(kind)!;
    if (set.size >= MAX_LISTENERS) {
      console.warn(`[EventBus] Max listeners reached for "${kind}"`);
    }
    set.add(handler as EventHandler);
    return () => { set.delete(handler as EventHandler); };
  }

  /**
   * Subscribe to all events in a namespace (e.g., 'task' matches task:change, task:notification).
   */
  onNamespace(namespace: EventNamespace, handler: EventHandler): UnsubscribeFn {
    if (!this.namespaceListeners.has(namespace)) {
      this.namespaceListeners.set(namespace, new Set());
    }
    const set = this.namespaceListeners.get(namespace)!;
    set.add(handler);
    return () => { set.delete(handler); };
  }

  /**
   * Subscribe to all events (global wildcard).
   */
  onAny(handler: EventHandler): UnsubscribeFn {
    this.globalListeners.add(handler);
    return () => { this.globalListeners.delete(handler); };
  }

  // ── SSE Management ───────────────────────────────────────────────────

  /**
   * Register an SSE subscriber. Returns subscriber ID for cleanup.
   * Optionally replays recent events for the project on connect.
   */
  addSSESubscriber(
    subscriberId: string,
    projectId: string | null,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    replay: boolean = true,
  ): void {
    const subscriber: SSESubscriber = {
      id: subscriberId,
      projectId,
      controller,
      encoder,
      closed: false,
    };

    this.sseSubscribers.set(subscriberId, subscriber);

    // Replay recent events for this project
    if (replay) {
      const relevantEvents = projectId
        ? this.recentEvents.filter(e => e.projectId === projectId || e.projectId === null)
        : this.recentEvents;

      for (const event of relevantEvents.slice(-20)) {
        this.sendSSEEvent(subscriber, event);
      }
    }
  }

  /**
   * Remove an SSE subscriber.
   */
  removeSSESubscriber(subscriberId: string): void {
    const sub = this.sseSubscribers.get(subscriberId);
    if (sub) {
      sub.closed = true;
      this.sseSubscribers.delete(subscriberId);
    }
  }

  /**
   * Get active SSE subscriber count (for diagnostics).
   */
  getSSESubscriberCount(): number {
    return this.sseSubscribers.size;
  }

  // ── Query ────────────────────────────────────────────────────────────

  /**
   * Get recent events, optionally filtered by project and/or namespace.
   */
  getRecentEvents(options?: {
    projectId?: string;
    namespace?: EventNamespace;
    limit?: number;
  }): BusEvent[] {
    let events = this.recentEvents;

    if (options?.projectId) {
      events = events.filter(e => e.projectId === options.projectId || e.projectId === null);
    }

    if (options?.namespace) {
      const ns = options.namespace;
      events = events.filter(e => e.kind.startsWith(`${ns}:`));
    }

    const limit = options?.limit ?? 50;
    return events.slice(-limit);
  }

  /**
   * Get diagnostics info.
   */
  getStats(): {
    kindListeners: Record<string, number>;
    namespaceListeners: Record<string, number>;
    globalListeners: number;
    sseSubscribers: number;
    recentEvents: number;
  } {
    const kindListeners: Record<string, number> = {};
    for (const [kind, set] of this.kindListeners) {
      kindListeners[kind] = set.size;
    }

    const namespaceListeners: Record<string, number> = {};
    for (const [ns, set] of this.namespaceListeners) {
      namespaceListeners[ns] = set.size;
    }

    return {
      kindListeners,
      namespaceListeners,
      globalListeners: this.globalListeners.size,
      sseSubscribers: this.sseSubscribers.size,
      recentEvents: this.recentEvents.length,
    };
  }

  // ── Internals ────────────────────────────────────────────────────────

  private safeCall(handler: EventHandler, event: BusEvent): void {
    try {
      handler(event);
    } catch (error) {
      console.error('[EventBus] Handler error:', error);
    }
  }

  private pushToSSE(event: BusEvent): void {
    for (const [id, subscriber] of this.sseSubscribers) {
      // Filter by project if subscriber is project-scoped
      if (subscriber.projectId && event.projectId && event.projectId !== subscriber.projectId) {
        continue;
      }

      if (!this.sendSSEEvent(subscriber, event)) {
        // Stream is dead, clean up
        this.sseSubscribers.delete(id);
      }
    }
  }

  private sendSSEEvent(subscriber: SSESubscriber, event: BusEvent): boolean {
    if (subscriber.closed) return false;

    try {
      const data = JSON.stringify(event);
      subscriber.controller.enqueue(
        subscriber.encoder.encode(`event: ${event.kind}\ndata: ${data}\n\n`)
      );
      return true;
    } catch {
      subscriber.closed = true;
      return false;
    }
  }
}

// ── Singleton via globalThis (survives HMR) ──────────────────────────────────

function getEventBus(): EventBusImpl {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new EventBusImpl();
  }
  return g[GLOBAL_KEY] as EventBusImpl;
}

/** The global EventBus instance */
export const eventBus = getEventBus();
