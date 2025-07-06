# Realtime Events Hook

This directory contains the `useRealtimeEvents` hook that integrates TanStack Query with Supabase realtime subscriptions to provide live event monitoring.

## Features

- **Real-time Updates**: Automatically receives new events as they're inserted into the database
- **TanStack Query Integration**: Leverages caching, background refetching, and error handling
- **Type Safety**: Full TypeScript support with proper type transformations
- **Filtering**: Support for session-based and flow-based filtering
- **Error Handling**: Comprehensive error states and loading indicators

## Setup

### 1. Database Setup

Run the SQL script to create the `flow_events` table:

```sql
-- See vibe/database/flow_events.sql for the complete schema
```

### 2. Enable Realtime in Supabase

In your Supabase dashboard, enable realtime for the `flow_events` table:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE flow_events;
```

### 3. Environment Variables

Make sure your Supabase credentials are set in your environment:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Usage

### Basic Usage

```tsx
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

function EventsComponent() {
  const { events, isLoading, error } = useRealtimeEvents();

  if (isLoading) return <div>Loading events...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <p>{event.description}</p>
          <span>{event.type}</span>
        </div>
      ))}
    </div>
  );
}
```

### With Filtering

```tsx
// Filter by session
const { events } = useRealtimeEvents({ 
  sessionId: 'session-123',
  limit: 25 
});

// Filter by flow
const { events } = useRealtimeEvents({ 
  flowId: 'my-flow-id',
  limit: 50 
});
```

## Event Transformation

The hook automatically transforms Supabase `flow_events` into `EventLogEntry` format:

```typescript
// Supabase flow_events
interface FlowEvent {
  id: string;
  flow_id: string;
  session_id: string;
  flow_name: string;
  status: string;
  error_message: string | null;
  // ... other fields
}

// Transformed to EventLogEntry
interface EventLogEntry {
  id: string;
  title: string;        // from flow_name
  description: string;  // from error_message, step, or status
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  agent?: string;       // from trigger_type
  message?: string;
}
```

## Type Mapping

The hook maps flow event statuses to event types:

- `completed`, `success` → `success`
- `failed`, `error` → `error`
- `warning` → `warning`
- Everything else → `info`

## Testing

Use the test endpoint to generate sample events:

```bash
# Insert a test event
curl -X POST http://localhost:3000/api/events/test

# Get recent events
curl http://localhost:3000/api/events/test
```

Or use the `TestEventButton` component in the UI.

## Query Keys

The hook uses structured query keys for caching:

```typescript
const eventKeys = {
  all: ['events'],
  byProject: (projectId: string) => ['events', 'project', projectId],
  bySession: (sessionId: string) => ['events', 'session', sessionId],
};
```

## Performance Considerations

- Events are limited to 50 by default (configurable)
- Realtime subscriptions are cleaned up automatically
- TanStack Query handles caching and deduplication
- Indexes are created on frequently queried fields

## Troubleshooting

### Realtime Not Working

1. Check that realtime is enabled for the table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE flow_events;
   ```

2. Verify Supabase credentials are correct

3. Check browser console for subscription status logs

### No Events Showing

1. Verify the table exists and has data
2. Check that the project ID filtering is correct
3. Use the test endpoint to generate sample events

### TypeScript Errors

Make sure the Supabase types are up to date in `lib/supabase.ts`. 