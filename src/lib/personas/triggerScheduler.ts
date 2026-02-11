/**
 * Persona Trigger Scheduler
 *
 * Singleton with adaptive polling that checks for due triggers
 * and enqueues persona executions.
 *
 * Pattern from scanQueueWorker.ts: adaptive polling with backoff.
 * - 10s poll when triggers are active, 60s when idle
 * - Queries persona_triggers WHERE enabled=1 AND next_trigger_at <= now
 * - For each due trigger: enqueue persona execution, calculate next_trigger_at
 */

import {
  personaTriggerRepository,
  personaRepository,
  personaExecutionRepository,
  credentialEventRepository,
  personaCredentialRepository,
} from '@/app/db/repositories/persona.repository';
import { personaToolRepository } from '@/app/db/repositories/persona.repository';
import { personaExecutionQueue } from './executionQueue';
import { personaEventBus } from './eventBus';

const POLL_INTERVALS = {
  BASE_MS: 10000,    // 10 seconds when active
  IDLE_MS: 60000,    // 60 seconds when idle
  MAX_BACKOFF: 3,    // Max consecutive empty polls before max interval
} as const;

class TriggerScheduler {
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private consecutiveEmpty = 0;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.consecutiveEmpty = 0;
    personaEventBus.start();
    this.poll();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    personaEventBus.stop();
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getStatus(): { isRunning: boolean; consecutiveEmpty: number; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      consecutiveEmpty: this.consecutiveEmpty,
      intervalMs: this.getInterval(),
    };
  }

  private getInterval(): number {
    if (this.consecutiveEmpty === 0) return POLL_INTERVALS.BASE_MS;
    return POLL_INTERVALS.IDLE_MS;
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const processed = await this.processDueTriggers();
      if (processed > 0) {
        this.consecutiveEmpty = 0;
      } else {
        this.consecutiveEmpty = Math.min(this.consecutiveEmpty + 1, POLL_INTERVALS.MAX_BACKOFF);
      }
    } catch {
      // Don't let errors stop the scheduler
    }

    if (this.isRunning) {
      this.pollTimer = setTimeout(() => this.poll(), this.getInterval());
    }
  }

  private async processDueTriggers(): Promise<number> {
    const now = new Date().toISOString();
    const dueTriggers = personaTriggerRepository.getDue(now);

    let processed = 0;

    for (const trigger of dueTriggers) {
      try {
        // Get persona
        const persona = personaRepository.getById(trigger.persona_id);
        if (!persona || !persona.enabled) {
          // Disable trigger if persona is disabled/deleted
          personaTriggerRepository.update(trigger.id, { enabled: false });
          continue;
        }

        // Get tools for persona
        const tools = personaToolRepository.getToolDefsForPersona(trigger.persona_id);

        // Get last completed execution for temporal context
        const recentExecs = personaExecutionRepository.getByPersonaId(trigger.persona_id, 1);
        const lastExecution = recentExecs.length > 0 && recentExecs[0].status === 'completed'
          ? { completed_at: recentExecs[0].completed_at!, duration_ms: recentExecs[0].duration_ms, status: recentExecs[0].status }
          : null;

        // Build trigger context
        let intervalSeconds: number | null = null;
        if (trigger.config) {
          try {
            const cfg = JSON.parse(trigger.config);
            intervalSeconds = cfg.intervalSeconds ?? cfg.interval_seconds ?? null;
          } catch { /* ignore */ }
        }
        const triggerContext = {
          trigger_type: trigger.trigger_type,
          interval_seconds: intervalSeconds,
        };

        // Parse trigger config for input data and event_id
        let inputData: object | undefined;
        let eventId: string | undefined;
        if (trigger.config) {
          try {
            const config = JSON.parse(trigger.config);
            inputData = config.inputData;
            eventId = config.event_id;
          } catch { /* ignore parse errors */ }
        }

        // If trigger is linked to a credential event, resolve event data
        if (eventId) {
          const credEvent = credentialEventRepository.getById(eventId);
          if (credEvent && credEvent.enabled) {
            // Update last polled timestamp on the event
            credentialEventRepository.update(credEvent.id, {
              last_polled_at: new Date().toISOString(),
            });
            // Include event info in input data
            inputData = {
              ...inputData as Record<string, unknown>,
              _event: {
                event_id: credEvent.id,
                event_name: credEvent.name,
                event_template_id: credEvent.event_template_id,
                credential_id: credEvent.credential_id,
              },
            };
          }
        }

        // Create execution
        const execution = personaExecutionRepository.create(
          trigger.persona_id,
          trigger.id,
          inputData
        );

        // Enqueue (don't await - fire and forget)
        personaExecutionQueue.enqueue(execution.id, persona, tools, inputData, lastExecution, triggerContext);

        // Calculate next trigger time
        const nextTriggerAt = this.calculateNextTrigger(trigger.trigger_type, trigger.config);
        personaTriggerRepository.markTriggered(trigger.id, nextTriggerAt);

        processed++;
      } catch {
        // Skip this trigger and continue with others
      }
    }

    return processed;
  }

  /**
   * Calculate the next trigger time based on trigger type and config.
   */
  private calculateNextTrigger(triggerType: string, configJson: string | null): string | null {
    if (triggerType === 'manual') return null; // Manual triggers don't auto-fire

    let config: Record<string, unknown> = {};
    if (configJson) {
      try { config = JSON.parse(configJson); } catch { return null; }
    }

    const intervalSeconds = (config.intervalSeconds as number) || 300; // Default 5 minutes
    const nextTime = new Date(Date.now() + intervalSeconds * 1000);
    return nextTime.toISOString();
  }
}

/** Singleton instance */
export const triggerScheduler = new TriggerScheduler();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => triggerScheduler.stop());
  process.on('SIGINT', () => { triggerScheduler.stop(); process.exit(0); });
  process.on('SIGTERM', () => { triggerScheduler.stop(); process.exit(0); });
}
