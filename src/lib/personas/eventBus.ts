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

export type EventHandler = (event: {
  id: string;
  event_type: PersonaEventType;
  source_type: PersonaEventSourceType;
  source_id: string | null;
  target_persona_id: string | null;
  payload: Record<string, unknown> | null;
  project_id: string;
}) => void | Promise<void>;

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVALS = {
  ACTIVE_MS: 5000,    // 5 seconds when events are flowing
  IDLE_MS: 30000,     // 30 seconds when idle
  MAX_BACKOFF: 4,     // Consecutive empty polls before switching to idle
} as const;

const GLOBAL_KEY = '__vibeman_personaEventBus__';

// ============================================================================
// Event Bus Class
// ============================================================================

class PersonaEventBus {
  private isRunning = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveEmpty = 0;
  private handlers = new Map<PersonaEventType, EventHandler[]>();

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

        // 1. Run built-in handlers
        const handlers = this.handlers.get(eventData.event_type) || [];
        for (const handler of handlers) {
          await handler(eventData);
        }

        // 2. Check subscriptions and trigger matching personas
        await this.matchSubscriptions(eventData);

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
   */
  private async matchSubscriptions(event: {
    id: string;
    event_type: PersonaEventType;
    source_type: PersonaEventSourceType;
    source_id: string | null;
    target_persona_id: string | null;
    payload: Record<string, unknown> | null;
    project_id: string;
  }): Promise<void> {
    // Get enabled subscriptions for this event type
    const subscriptions = eventSubscriptionRepository.getByEventType(event.event_type);

    for (const sub of subscriptions) {
      if (!sub.enabled) continue;

      // Skip if this subscription's persona was the source (prevent loops)
      if (event.source_id === sub.persona_id) continue;

      // Check source filter
      if (sub.source_filter) {
        try {
          const filter = JSON.parse(sub.source_filter);
          if (filter.source_type && filter.source_type !== event.source_type) continue;
          if (filter.source_id && filter.source_id !== event.source_id) continue;
        } catch { /* no filter = match all */ }
      }

      // Trigger the subscribed persona
      this.enqueuePersonaExecution(sub.persona_id, event);
    }
  }

  // --------------------------------------------------------------------------
  // Built-in Handlers
  // --------------------------------------------------------------------------

  /**
   * Handle persona_action events (one persona triggering another mid-execution).
   */
  private async handlePersonaAction(event: Parameters<EventHandler>[0]): Promise<void> {
    if (!event.target_persona_id) return;

    // Enqueue is handled by matchSubscriptions or direct target
    // For direct targets, we enqueue immediately
    this.enqueuePersonaExecution(event.target_persona_id, event);
  }

  /**
   * Handle webhook_received events (external HTTP POST to a webhook trigger).
   */
  private async handleWebhookReceived(event: Parameters<EventHandler>[0]): Promise<void> {
    if (!event.target_persona_id) return;
    // Webhook events with explicit target are handled directly
    this.enqueuePersonaExecution(event.target_persona_id, event);
  }

  /**
   * Handle execution_completed events (audit/logging, subscription matching handled separately).
   */
  private async handleExecutionCompleted(_event: Parameters<EventHandler>[0]): Promise<void> {
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
