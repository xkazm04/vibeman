/**
 * POST /api/personas/seed-test
 * Seeds two test personas for smoke testing the complete event bus cycle.
 * - Persona A: "Event Publisher" -- schedule trigger, emits custom events
 * - Persona B: "Event Listener" -- subscribes to custom events, sends messages
 */
import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { triggerScheduler } from '@/lib/personas/triggerScheduler';

const PUBLISHER_PROMPT = `# Event Publisher (Smoke Test)

You are a test persona that verifies the event bus is working correctly.

## Instructions
Every time you run, you MUST output exactly this JSON block on its own line:

{"emit_event": {"type": "ping", "data": {"message": "Hello from Event Publisher", "timestamp": "CURRENT_TIMESTAMP", "test_run": true}}}

After emitting the event, output a brief confirmation message:
"Event emitted successfully. The event bus should deliver this to any subscribed personas."

Do NOT use any tools. Do NOT perform any other actions. Just emit the event and confirm.`;

const LISTENER_PROMPT = `# Event Listener (Smoke Test)

You are a test persona that reacts to events from the event bus.

## Instructions
You were triggered by an event. Check your input data for the event payload (under _event.payload).

Based on the event data, send a message to the user by outputting this JSON block:

{"user_message": {"title": "Pong! Event Received", "content": "Successfully received event from the event bus. Event type: [read from _event.event_type]. Payload: [summarize _event.payload]. The persona event bus is working end-to-end!", "priority": "normal"}}

After sending the message, output a brief confirmation:
"Message sent. The event bus smoke test is complete."

Do NOT use any tools. Do NOT perform any other actions. Just read the event and send the message.`;

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
    const publisher = personaDb.personas.create({
      name: 'Event Publisher (Test)',
      description: 'Smoke test persona that periodically emits events to the event bus',
      system_prompt: PUBLISHER_PROMPT,
      icon: '📡',
      color: '#8b5cf6',
      enabled: true,
      max_concurrent: 1,
      timeout_ms: 60000,
    });

    // Create schedule trigger for publisher (60 second interval)
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
    const listener = personaDb.personas.create({
      name: 'Event Listener (Test)',
      description: 'Smoke test persona that subscribes to events and sends confirmation messages',
      system_prompt: LISTENER_PROMPT,
      icon: '👂',
      color: '#06b6d4',
      enabled: true,
      max_concurrent: 1,
      timeout_ms: 60000,
    });

    // Create event subscription for listener (listens for custom events)
    personaDb.eventSubscriptions.create({
      persona_id: listener.id,
      event_type: 'custom',
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
