# Kafka Migration Plan -- Persona Event Bus

This document outlines a phased migration from the current SQLite-backed event bus to Apache Kafka for production-grade event streaming across distributed devices.

## Current Architecture

The persona event bus uses SQLite tables (`persona_events`, `persona_event_subscriptions`) with adaptive polling (5s/30s). This works well for single-device localhost use but has limitations:

- **Single writer**: SQLite WAL mode supports concurrent reads but only one writer
- **Polling latency**: 5-30 second delay between event publish and processing
- **No cross-device**: Events are local to one SQLite database file
- **No replay**: Limited ability to replay events from arbitrary offsets

## Target Architecture

Apache Kafka provides:
- **Distributed log**: Events persisted across brokers with configurable retention
- **Real-time**: Sub-millisecond publish-to-consume latency
- **Cross-device**: Multiple consumers on different machines read from same topics
- **Replay**: Consumer groups can reset offsets to replay events
- **Ordering**: Per-partition ordering guarantees

## Topic Design

```
vibeman.persona.events.v1          # All persona events (partitioned by project_id)
vibeman.persona.webhooks.v1        # Inbound webhook payloads
vibeman.persona.actions.v1         # Inter-persona action requests
vibeman.persona.executions.v1      # Execution lifecycle events
vibeman.persona.dlq.v1             # Dead letter queue for failed processing
```

### Partition Strategy
- Partition key: `project_id` (ensures ordering within a project)
- Default partitions: 6 per topic (allows scaling to 6 concurrent consumers)

### Consumer Groups
- `vibeman-event-processor` -- Main event processing (subscription matching, handler dispatch)
- `vibeman-webhook-ingester` -- Webhook payload validation and routing
- `vibeman-audit-logger` -- Event archival to database for query/dashboard

## Migration Phases

### Phase 1: Dual-Write (Week 1-2)

Write events to both SQLite and Kafka. Read from SQLite only.

**Code changes:**
- Add `KAFKA_BROKERS` env variable (comma-separated broker list)
- Create `src/lib/personas/kafkaProducer.ts` -- singleton KafkaJS producer
- Modify `eventBus.publish()` to dual-write: SQLite INSERT + Kafka produce
- Add health check endpoint for Kafka connectivity

**Environment variables:**
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=vibeman-local
KAFKA_ENABLED=false  # Feature flag, default off
```

**Verification:**
- Monitor Kafka topic for events matching SQLite inserts
- Compare event counts between SQLite and Kafka
- Verify no duplicate events

### Phase 2: Kafka Primary, SQLite Fallback (Week 3-4)

Process events from Kafka. Fall back to SQLite polling if Kafka is unavailable.

**Code changes:**
- Create `src/lib/personas/kafkaConsumer.ts` -- consumer group with handler dispatch
- Modify `eventBus.processEvents()` to consume from Kafka when available
- Keep SQLite polling as fallback (check every 60s if Kafka consumer is healthy)
- Add circuit breaker: if Kafka fails 3x in a row, switch to SQLite for 5 minutes

**Verification:**
- Events processed within 500ms (vs 5-30s with SQLite polling)
- Fallback activates correctly when Kafka broker is stopped
- No event loss during failover

### Phase 3: Remove SQLite Processing (Week 5-6)

SQLite becomes audit log only. All event processing via Kafka.

**Code changes:**
- Remove SQLite polling loop from `eventBus.ts`
- Keep SQLite INSERT for audit/query (dashboard reads from SQLite)
- Kafka consumer writes processed results back to SQLite for dashboard
- Add `KAFKA_REQUIRED=true` mode that fails fast if Kafka is unavailable

**Verification:**
- Dashboard still shows events (from SQLite audit log)
- Cross-device: events from Device A processed by Device B
- Event replay works: reset consumer group offset, events reprocess

### Phase 4: Production Hardening (Week 7-8)

- Add schema registry (Avro/Protobuf) for event payload validation
- Add monitoring: consumer lag, throughput, error rates
- Configure retention policies per topic
- Add event versioning headers for backward compatibility
- Set up DLQ processing and alerting

## Environment Configuration

```env
# Kafka connection
KAFKA_BROKERS=broker1:9092,broker2:9092
KAFKA_CLIENT_ID=vibeman-device-001
KAFKA_SASL_USERNAME=           # Optional SASL auth
KAFKA_SASL_PASSWORD=
KAFKA_SSL_ENABLED=false

# Feature flags
KAFKA_ENABLED=false            # Master switch
KAFKA_REQUIRED=false           # Fail if Kafka unavailable
KAFKA_DUAL_WRITE=false         # Write to both SQLite + Kafka

# Consumer config
KAFKA_CONSUMER_GROUP=vibeman-event-processor
KAFKA_AUTO_OFFSET_RESET=latest # or 'earliest' for replay
```

## Code Changes Summary

| File | Phase | Change |
|------|-------|--------|
| `src/lib/personas/kafkaProducer.ts` | 1 | New -- KafkaJS producer singleton |
| `src/lib/personas/kafkaConsumer.ts` | 2 | New -- Consumer group with handler dispatch |
| `src/lib/personas/eventBus.ts` | 1-3 | Dual-write -> Kafka primary -> remove polling |
| `src/app/api/personas/events/route.ts` | 1 | Add Kafka health check to GET response |
| `.env.example` | 1 | Add Kafka environment variables |
| `package.json` | 1 | Add `kafkajs` dependency |

## Dependencies

```json
{
  "kafkajs": "^2.2.4"
}
```

## Rollback Plan

Each phase is independently reversible:
- Phase 1: Set `KAFKA_ENABLED=false` -> stops dual-write, SQLite-only
- Phase 2: Kill Kafka consumer -> circuit breaker activates SQLite polling
- Phase 3: Re-enable SQLite polling loop (git revert)
- Phase 4: Schema registry is additive, can be disabled without data loss
