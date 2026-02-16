import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function POST() {
  try {
    // Get actual personas for realistic source/target
    const personas = personaDb.personas.getAll();
    const personaIds = personas.map(p => p.id);
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)] || 'unknown';

    const projectId = 'default';
    const eventIds: string[] = [];

    // Define 5 test events
    const testEvents = [
      {
        event_type: 'webhook_received' as const,
        source_type: 'webhook' as const,
        source_id: 'test-webhook',
        target_persona_id: personaIds.length > 0 ? pick(personaIds) : null,
        payload: { type: 'test', data: { message: 'Test webhook payload', timestamp: new Date().toISOString() } },
      },
      {
        event_type: 'persona_action' as const,
        source_type: 'persona' as const,
        source_id: personaIds.length > 0 ? pick(personaIds) : 'test-persona',
        target_persona_id: personaIds.length > 1 ? pick(personaIds) : null,
        payload: { type: 'invoke', data: { action: 'analyze', priority: 'high' } },
      },
      {
        event_type: 'execution_completed' as const,
        source_type: 'execution' as const,
        source_id: 'pexec_test_' + Date.now().toString(36),
        target_persona_id: null,
        payload: { status: 'completed', duration_ms: 4200, tokens: { input: 1500, output: 800 } },
      },
      {
        event_type: 'custom' as const,
        source_type: 'persona' as const,
        source_id: personaIds.length > 0 ? pick(personaIds) : 'test-persona',
        target_persona_id: null,
        payload: { type: 'health_check', data: { status: 'healthy', uptime_hours: 72 } },
      },
      {
        event_type: 'task_created' as const,
        source_type: 'system' as const,
        source_id: 'cli-queue',
        target_persona_id: personaIds.length > 0 ? pick(personaIds) : null,
        payload: { task_id: 'task_test_' + Date.now().toString(36), requirement: 'Test requirement' },
      },
    ];

    // Create events with staggered timing
    for (let i = 0; i < testEvents.length; i++) {
      const evt = testEvents[i];
      // publish() returns a DbPersonaEvent object
      const event = personaDb.events.publish({
        project_id: projectId,
        event_type: evt.event_type,
        source_type: evt.source_type,
        source_id: evt.source_id,
        target_persona_id: evt.target_persona_id || undefined,
        payload: evt.payload,
      });
      eventIds.push(event.id);

      // Simulate processing after a short delay by updating status
      const eventId = event.id;
      if (i < 3) {
        // Mark first 3 as completed after creation
        setTimeout(() => {
          try {
            personaDb.events.updateStatus(eventId, 'completed', {
              processed_at: new Date().toISOString(),
            });
          } catch { /* ignore */ }
        }, (i + 1) * 800);
      } else if (i === 3) {
        // Mark 4th as failed
        setTimeout(() => {
          try {
            personaDb.events.updateStatus(eventId, 'failed', {
              error_message: 'Simulated test failure',
              processed_at: new Date().toISOString(),
            });
          } catch { /* ignore */ }
        }, 3200);
      }
      // 5th stays pending for a bit
    }

    return NextResponse.json({
      ok: true,
      eventIds,
      message: `Created ${eventIds.length} test events. Events will be processed over the next few seconds.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
