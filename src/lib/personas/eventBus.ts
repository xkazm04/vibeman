/**
 * Persona Event Bus
 *
 * SQLite-backed central pub/sub system for the persona agent framework.
 * All events (webhooks, execution completions, persona actions, credential events)
 * flow through one pipeline.
 *
 * Features:
 * - Adaptive polling (5s active, 30s idle)
 * - In-memory handler registry for built-in event types
 * - Subscription matching: personas declare "trigger me on event X"
 * - globalThis singleton for Next.js HMR survival
 * - Safe lazy imports to avoid circular dependency chains
 */

import type {
  PersonaEventType,
  PersonaEventSourceType,
  CreatePersonaEventInput,
} from '@/app/db/models/persona.types';
import {
  personaEventRepository,
  eventSubscriptionRepository,
  personaRepository,
  personaExecutionRepository,
} from '@/app/db/repositories/persona.repository';
import { personaToolRepository } from '@/app/db/repositories/persona.repository';

// ============================================================================
// Types
// ============================================================================

export type EventHandler = (
  event: {
    id: string;
    event_type: PersonaEventType;
    source_type: PersonaEventSourceType;
    source_id: string | null;
    target_persona_id: string | null;
    payload: Record<string, unknown> | null;
    project_id: string;
  },
  alreadyEnqueued: Set<string>,
) => void | Promise<void>;

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVALS = {
  ACTIVE_MS: 5000,    // 5 seconds when events are flowing
  IDLE_MS: 30000,     // 30 seconds when idle
  MAX_BACKOFF: 4,     // Consecutive empty polls before switching to idle
} as const;

/** Maximum depth for event chains to prevent infinite loops (A→B→C→stop) */
const MAX_EVENT_DEPTH = 3;

/** Cooldown period: don't re-trigger same persona for same event type within this window */
const PERSONA_COOLDOWN_MS = 60_000;

const GLOBAL_KEY = '__vibeman_personaEventBus__';

// ============================================================================
// Event Bus Class
// ============================================================================

class PersonaEventBus {
  private isRunning = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveEmpty = 0;
  private handlers = new Map<PersonaEventType, EventHandler[]>();
  /** Cooldown tracker: `personaId:eventType` → last enqueue timestamp */
  private recentEnqueues = new Map<string, number>();

  constructor() {
    // Register built-in handlers
    this.registerHandler('persona_action', this.handlePersonaAction.bind(this));
    this.registerHandler('webhook_received', this.handleWebhookReceived.bind(this));
    this.registerHandler('execution_completed', this.handleExecutionCompleted.bind(this));
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.consecutiveEmpty = 0;
    this.poll();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getStatus(): { isRunning: boolean; consecutiveEmpty: number; intervalMs: number; pendingCount: number } {
    return {
      isRunning: this.isRunning,
      consecutiveEmpty: this.consecutiveEmpty,
      intervalMs: this.getInterval(),
      pendingCount: personaEventRepository.countPending(),
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Publish an event to the bus. Inserts into DB and returns the event ID.
   */
  publish(input: CreatePersonaEventInput): string {
    const event = personaEventRepository.publish(input);
    return event.id;
  }

  /**
   * Register a handler for a specific event type.
   */
  registerHandler(eventType: PersonaEventType, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  // --------------------------------------------------------------------------
  // Polling Loop
  // --------------------------------------------------------------------------

  private getInterval(): number {
    if (this.consecutiveEmpty < POLL_INTERVALS.MAX_BACKOFF) return POLL_INTERVALS.ACTIVE_MS;
    return POLL_INTERVALS.IDLE_MS;
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const processed = await this.processEvents();
      if (processed > 0) {
        this.consecutiveEmpty = 0;
      } else {
        this.consecutiveEmpty = Math.min(this.consecutiveEmpty + 1, POLL_INTERVALS.MAX_BACKOFF + 1);
      }
    } catch (err) {
      console.error('[EventBus] Poll error:', err);
    }

    if (this.isRunning) {
      this.pollTimer = setTimeout(() => this.poll(), this.getInterval());
    }
  }

  /**
   * Process all pending events. Returns count of events processed.
   */
  private async processEvents(): Promise<number> {
    const pending = personaEventRepository.getPending(50);
    let processed = 0;

    for (const event of pending) {
      try {
        // Mark processing
        personaEventRepository.updateStatus(event.id, 'processing');

        // Parse payload
        let payload: Record<string, unknown> | null = null;
        if (event.payload) {
          try { payload = JSON.parse(event.payload); } catch { /* keep null */ }
        }

        const eventData = {
          id: event.id,
          event_type: event.event_type as PersonaEventType,
          source_type: event.source_type as PersonaEventSourceType,
          source_id: event.source_id,
          target_persona_id: event.target_persona_id,
          payload,
          project_id: event.project_id,
        };

        // Track which personas are enqueued by built-in handlers to avoid
        // double-enqueue when matchSubscriptions also matches them
        const alreadyEnqueued = new Set<string>();

        // 1. Run built-in handlers (may enqueue direct targets)
        const handlers = this.handlers.get(eventData.event_type) || [];
        for (const handler of handlers) {
          await handler(eventData, alreadyEnqueued);
        }

        // 2. Check subscriptions and trigger matching personas (skips alreadyEnqueued)
        await this.matchSubscriptions(eventData, alreadyEnqueued);

        // Mark completed
        personaEventRepository.updateStatus(event.id, 'completed', { processed_at: new Date().toISOString() });
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        personaEventRepository.updateStatus(event.id, 'failed', { error_message: msg });
        processed++;
      }
    }

    return processed;
  }

  // --------------------------------------------------------------------------
  // Subscription Matching
  // --------------------------------------------------------------------------

  /**
   * Find subscriptions that match this event and trigger corresponding personas.
   * Includes multiple loop-prevention guards:
   *  1. Depth limit — reject events deeper than MAX_EVENT_DEPTH
   *  2. Self-loop — skip if the completing persona is the subscriber
   *  3. Chain cycle — skip if the originating persona in the chain matches
   *  4. Direct-target dedup — skip subscription if built-in handler already enqueued this persona
   *  5. Cooldown — don't re-trigger same persona+eventType within PERSONA_COOLDOWN_MS
   *  6. Payload-type filter — match event.payload.type against source_filter.payload_type
   *  7. System-event filter — skip system-sourced events when source_filter.exclude_system is set
   */
  private async matchSubscriptions(
    event: {
      id: string;
      event_type: PersonaEventType;
      source_type: PersonaEventSourceType;
      source_id: string | null;
      target_persona_id: string | null;
      payload: Record<string, unknown> | null;
      project_id: string;
    },
    alreadyEnqueued: Set<string>,
  ): Promise<void> {
    // Extract chain metadata from payload
    const meta = (event.payload as Record<string, unknown> | null)?._meta as
      | { depth?: number; source_persona_id?: string }
      | undefined;
    const eventDepth = meta?.depth ?? 0;
    const chainSourcePersonaId = meta?.source_persona_id ?? null;

    // GUARD 1: Depth limit — hard stop for deep event chains
    if (eventDepth >= MAX_EVENT_DEPTH) return;

    const subscriptions = eventSubscriptionRepository.getByEventType(event.event_type);

    for (const sub of subscriptions) {
      if (!sub.enabled) continue;

      // GUARD 2: Self-loop (original) — source persona can't trigger itself
      if (event.source_id === sub.persona_id) continue;

      // GUARD 3: Self-loop (execution_completed) — the persona that just finished
      // can't re-trigger itself. For execution_completed events, target_persona_id
      // is the persona that ran; for persona_action it's the intended recipient.
      if (event.event_type === 'execution_completed' && event.target_persona_id === sub.persona_id) continue;

      // GUARD 4: Chain cycle — the persona that originated this event chain can't
      // be re-triggered downstream (prevents A→B→A loops)
      if (chainSourcePersonaId && chainSourcePersonaId === sub.persona_id) continue;

      // GUARD 5: Direct-target dedup — built-in handlers (persona_action, webhook_received)
      // already enqueued explicit targets; skip them in subscription matching
      if (alreadyEnqueued.has(sub.persona_id)) continue;

      // GUARD 6: Cooldown — don't re-trigger same persona for same event type too quickly
      const cooldownKey = `${sub.persona_id}:${event.event_type}`;
      const lastEnqueue = this.recentEnqueues.get(cooldownKey);
      if (lastEnqueue && (Date.now() - lastEnqueue) < PERSONA_COOLDOWN_MS) continue;

      // Check source filter (existing + new payload_type and exclude_system)
      if (sub.source_filter) {
        try {
          const filter = JSON.parse(sub.source_filter);
          if (filter.source_type && filter.source_type !== event.source_type) continue;
          if (filter.source_id && filter.source_id !== event.source_id) continue;

          // GUARD 7a: Payload-type filter — only match specific event subtypes
          if (filter.payload_type) {
            const allowedTypes = (filter.payload_type as string).split(',').map((t: string) => t.trim());
            const payloadType = (event.payload as Record<string, unknown> | null)?.type as string | undefined;
            if (!payloadType || !allowedTypes.includes(payloadType)) continue;
          }

          // GUARD 7b: System-event filter — skip events from system sources (CLI tasks)
          if (filter.exclude_system && event.source_type === 'system') continue;
        } catch { /* no filter = match all */ }
      }

      // Record cooldown and enqueue
      this.recentEnqueues.set(cooldownKey, Date.now());
      alreadyEnqueued.add(sub.persona_id);
      this.enqueuePersonaExecution(sub.persona_id, event);
    }

    // Periodically clean up stale cooldown entries
    this.cleanupCooldowns();
  }

  /**
   * Remove expired cooldown entries to prevent memory leaks.
   */
  private cleanupCooldowns(): void {
    const now = Date.now();
    for (const [key, ts] of this.recentEnqueues) {
      if (now - ts > PERSONA_COOLDOWN_MS * 2) {
        this.recentEnqueues.delete(key);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Built-in Handlers
  // --------------------------------------------------------------------------

  /**
   * Handle persona_action events (one persona triggering another mid-execution).
   * Enqueues the explicit target and records it in alreadyEnqueued to prevent
   * matchSubscriptions from double-enqueueing the same persona.
   */
  private async handlePersonaAction(event: Parameters<EventHandler>[0], alreadyEnqueued: Set<string>): Promise<void> {
    if (!event.target_persona_id) return;
    this.enqueuePersonaExecution(event.target_persona_id, event);
    alreadyEnqueued.add(event.target_persona_id);
  }

  /**
   * Handle webhook_received events (external HTTP POST to a webhook trigger).
   * Enqueues the explicit target and records it in alreadyEnqueued.
   */
  private async handleWebhookReceived(event: Parameters<EventHandler>[0], alreadyEnqueued: Set<string>): Promise<void> {
    if (!event.target_persona_id) return;
    this.enqueuePersonaExecution(event.target_persona_id, event);
    alreadyEnqueued.add(event.target_persona_id);
  }

  /**
   * Handle execution_completed events (audit/logging, subscription matching handled separately).
   */
  private async handleExecutionCompleted(_event: Parameters<EventHandler>[0], _alreadyEnqueued: Set<string>): Promise<void> {
    // No built-in action needed — subscription matching handles triggering other personas.
    // This handler exists for future extensibility (metrics, cleanup, etc.)
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Enqueue a persona for execution based on an event.
   * Uses lazy require() to avoid circular imports with executionQueue.
   */
  private enqueuePersonaExecution(personaId: string, event: Parameters<EventHandler>[0]): void {
    try {
      const persona = personaRepository.getById(personaId);
      if (!persona || !persona.enabled) return;

      const tools = personaToolRepository.getToolDefsForPersona(personaId);

      // Create execution record
      const execution = personaExecutionRepository.create(personaId, undefined, {
        _event: {
          event_id: event.id,
          event_type: event.event_type,
          source_type: event.source_type,
          source_id: event.source_id,
          payload: event.payload,
        },
      });

      // Lazy import to avoid circular: eventBus → executionQueue → executionEngine → eventBus
      const { personaExecutionQueue } = require('./executionQueue');
      personaExecutionQueue.enqueue(execution.id, persona, tools, {
        _event: {
          event_id: event.id,
          event_type: event.event_type,
          source_type: event.source_type,
          payload: event.payload,
        },
      });
    } catch (err) {
      console.error(`[EventBus] Failed to enqueue persona ${personaId}:`, err);
    }
  }
}

// ============================================================================
// Singleton (globalThis for Next.js HMR survival)
// ============================================================================

function getEventBus(): PersonaEventBus {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new PersonaEventBus();
  }
  return g[GLOBAL_KEY] as PersonaEventBus;
}

export const personaEventBus = getEventBus();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => personaEventBus.stop());
  process.on('SIGINT', () => { personaEventBus.stop(); process.exit(0); });
  process.on('SIGTERM', () => { personaEventBus.stop(); process.exit(0); });
}
