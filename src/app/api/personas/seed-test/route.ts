/**
 * POST /api/personas/seed-test
 * Seeds two test personas for smoke testing the complete event bus cycle.
 * Creates personas with the same structure as those created via the UI + Design tab.
 * - Persona A: "Event Publisher" -- schedule trigger, emits custom events
 * - Persona B: "Event Listener" -- subscribes to custom events, sends messages
 */
import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { triggerScheduler } from '@/lib/personas/triggerScheduler';
import type { StructuredPrompt } from '@/lib/personas/promptMigration';

// ── Structured Prompts (matches Design tab output format) ───────────────

const PUBLISHER_STRUCTURED: StructuredPrompt = {
  identity: 'You are Event Publisher, a smoke-test persona that verifies the event bus is working correctly by periodically emitting ping events.',
  instructions: `Every time you run, output exactly this JSON block on its own line:

{"emit_event": {"type": "ping", "data": {"message": "Hello from Event Publisher", "timestamp": "CURRENT_TIMESTAMP", "test_run": true}}}

After emitting the event, output a brief confirmation:
"Event emitted successfully. The event bus should deliver this to any subscribed personas."

Do NOT use any tools. Do NOT perform any other actions. Just emit the event and confirm.`,
  toolGuidance: 'This persona does not use any tools. All output is via JSON protocol blocks.',
  examples: `Example output:
{"emit_event": {"type": "ping", "data": {"message": "Hello from Event Publisher", "timestamp": "2026-02-11T20:00:00.000Z", "test_run": true}}}
Event emitted successfully. The event bus should deliver this to any subscribed personas.`,
  errorHandling: 'If you encounter any issue, still attempt to emit the event. Do not use tools or ask questions.',
  customSections: [],
};

const LISTENER_STRUCTURED: StructuredPrompt = {
  identity: 'You are Event Listener, a smoke-test persona that reacts to events from the event bus by sending confirmation messages.',
  instructions: `You were triggered by an event. Check your trigger context for the event payload.

Based on the event data, send a message to the user by outputting this JSON block on its own line:

{"user_message": {"title": "Pong! Event Received", "content": "Successfully received event from the event bus. Event type: [read from trigger context]. Payload: [summarize the payload]. The persona event bus is working end-to-end!", "priority": "normal"}}

After sending the message, output a brief confirmation:
"Message sent. The event bus smoke test is complete."

Do NOT use any tools. Do NOT perform any other actions. Just read the event and send the message.`,
  toolGuidance: 'This persona does not use any tools. All output is via JSON protocol blocks.',
  examples: `Example output when triggered by a ping event:
{"user_message": {"title": "Pong! Event Received", "content": "Successfully received event from the event bus. Event type: custom. Payload: A ping from Event Publisher with test_run=true. The persona event bus is working end-to-end!", "priority": "normal"}}
Message sent. The event bus smoke test is complete.`,
  errorHandling: 'If the event payload is missing or malformed, still send a user_message describing what you received.',
  customSections: [],
};

export async function POST() {
  try {
    // Check if test personas already exist
    const existing = personaDb.personas.getAll();
    const existingPublisher = existing.find(p => p.name === 'Event Publisher (Test)');
    const existingListener = existing.find(p => p.name === 'Event Listener (Test)');

    if (existingPublisher && existingListener) {
      return NextResponse.json({
        message: 'Test personas already exist',
        publisher: { id: existingPublisher.id, name: existingPublisher.name },
        listener: { id: existingListener.id, name: existingListener.name },
      });
    }

    // Create Persona A: Event Publisher
    const publisherPrompt = JSON.stringify(PUBLISHER_STRUCTURED);
    const publisher = personaDb.personas.create({
      name: 'Event Publisher (Test)',
      description: 'Smoke-test persona that periodically emits ping events to the event bus.',
      system_prompt: PUBLISHER_STRUCTURED.instructions,
      structured_prompt: publisherPrompt,
      icon: '📡',
      color: '#8b5cf6',
      enabled: true,
    });

    // Create schedule trigger for publisher (60-second interval)
    const trigger = personaDb.triggers.create({
      persona_id: publisher.id,
      trigger_type: 'schedule',
      config: { interval_seconds: 60 },
      enabled: true,
    });

    // Set next trigger to 60s from now
    personaDb.triggers.update(trigger.id, {
      next_trigger_at: new Date(Date.now() + 60000).toISOString(),
    });

    // Create Persona B: Event Listener
    const listenerPrompt = JSON.stringify(LISTENER_STRUCTURED);
    const listener = personaDb.personas.create({
      name: 'Event Listener (Test)',
      description: 'Smoke-test persona that subscribes to events and sends confirmation messages.',
      system_prompt: LISTENER_STRUCTURED.instructions,
      structured_prompt: listenerPrompt,
      icon: '👂',
      color: '#06b6d4',
      enabled: true,
    });

    // Create event subscription for listener — only ping subtype from publisher
    personaDb.eventSubscriptions.create({
      persona_id: listener.id,
      event_type: 'custom',
      source_filter: { payload_type: 'ping' },
      enabled: true,
    });

    // Ensure scheduler and event bus are running
    const schedulerStatus = triggerScheduler.getStatus();
    if (!schedulerStatus.isRunning) {
      triggerScheduler.start();
    }

    return NextResponse.json({
      message: 'Test personas created successfully',
      publisher: {
        id: publisher.id,
        name: publisher.name,
        trigger_id: trigger.id,
        next_trigger: new Date(Date.now() + 60000).toISOString(),
      },
      listener: {
        id: listener.id,
        name: listener.name,
        subscription: 'custom events',
      },
      scheduler: triggerScheduler.getStatus(),
      instructions: [
        '1. Wait ~60 seconds for the Publisher trigger to fire',
        '2. Publisher will emit a "ping" event via emit_event JSON',
        '3. Event bus will process the event and match Listener subscription',
        '4. Listener will execute and output a user_message',
        '5. Check Overview > Messages tab for the "Pong!" message',
        '6. Check Overview > Events tab for the event chain',
      ],
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
