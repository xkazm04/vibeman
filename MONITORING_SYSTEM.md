# Voicebot Monitoring System

## Overview
Comprehensive call monitoring system for tracking and analyzing voicebot test sessions using SQLite database with LLM-powered evaluation and pattern detection.

## Features
- **Call Tracking**: Monitor voice sessions with status (active, completed, failed, abandoned)
- **Message Logging**: Track all user and assistant messages with timestamps and latency
- **LLM Evaluation**: Automated message quality assessment using Claude AI
- **Message Classification**: Intelligent intent and response categorization
- **Pattern Detection**: Infrastructure for identifying conversation patterns (future enhancement)
- **Statistics Dashboard**: Real-time statistics (total calls, completion rate, average duration)
- **Review Interface**: Tabbed UI for monitoring and detailed review analysis

## Database Schema

### Tables

#### `calls` table
Stores information about each voicebot session:
- `call_id` (TEXT, PK): Unique identifier for the call
- `user_id` (TEXT): User identifier
- `start_time` (TEXT): ISO timestamp when call started
- `end_time` (TEXT): ISO timestamp when call ended
- `duration` (INTEGER): Call duration in milliseconds
- `status` (TEXT): Call status (active | completed | failed | abandoned)
- `intent` (TEXT): Purpose of the call (e.g., 'async-voice-test', 'conversation-test')
- `outcome` (TEXT): Result of the call (e.g., 'test-completed', 'user-ended')
- `prompt_version_id` (TEXT): Model identifier (e.g., 'ollama:gpt-oss-20b')
- `metadata` (TEXT): JSON object with additional context
- `created_at`, `updated_at` (TEXT): Timestamps

#### `messages` table
Stores individual messages within each call:
- `message_id` (TEXT, PK): Unique identifier for the message
- `call_id` (TEXT, FK → calls.call_id): Associated call
- `role` (TEXT): Message sender (user | assistant | system)
- `content` (TEXT): Message content
- `timestamp` (TEXT): ISO timestamp
- `node_id` (TEXT): LangGraph node identifier (optional)
- `latency_ms` (INTEGER): Response latency in milliseconds
- `metadata` (TEXT): JSON object (e.g., LLM timings, model info)
- `eval_ok` (INTEGER): Evaluation passed (0 = false, 1 = true), default 0
- `review_ok` (INTEGER): Human review approved (0 = false, 1 = true), default 0
- `eval_class` (TEXT): Message classification (e.g., 'Greeting', 'Intent_FindProject')
- `created_at` (TEXT): Timestamp

#### `message_classes` enum table
Stores message classification categories:
- `class_id` (TEXT, PK): Unique identifier for the class
- `class_name` (TEXT, UNIQUE): Class name (e.g., 'Intent_FindProject')
- `description` (TEXT): Description of the class
- `frequency` (INTEGER): Number of times this class has been used, default 1
- `created_at`, `updated_at` (TEXT): Timestamps

#### `patterns` table
Stores detected conversation patterns (infrastructure ready):
- `pattern_id` (TEXT, PK): Unique identifier
- `pattern_type` (TEXT): Type (flow | decision | failure)
- `description` (TEXT): Pattern description
- `frequency` (INTEGER): Number of occurrences
- `example_call_ids` (TEXT): JSON array of call IDs
- `detected_at` (TEXT): ISO timestamp
- `metadata` (TEXT): JSON object
- `created_at`, `updated_at` (TEXT): Timestamps

### Indexes
- `idx_calls_start_time`: Quick date range queries
- `idx_calls_status`: Filter by status
- `idx_messages_call_id`: Fast message lookups per call
- `idx_messages_timestamp`: Chronological message retrieval
- `idx_messages_eval_class`: Filter by message classification
- `idx_patterns_type`: Pattern categorization
- `idx_patterns_detected_at`: Pattern timeline
- `idx_message_classes_name`: Quick class name lookups

## File Structure

```
src/
├── lib/
│   ├── monitor_database.ts      # SQLite database layer
│   └── monitorServiceDb.ts      # Service layer with type conversions
├── app/
│   ├── monitor/
│   │   ├── page.tsx                      # Main monitoring dashboard with tabs
│   │   ├── lib/
│   │   │   ├── monitorTypes.ts          # TypeScript interfaces
│   │   │   ├── monitorUtils.ts          # Helper utilities
│   │   │   └── index.ts                 # Barrel export
│   │   └── components/
│   │       ├── MonitorTabs.tsx          # Tab navigation (Monitor/Review)
│   │       ├── MonitorStatistics.tsx    # Statistics cards
│   │       ├── MonitorCallsTable.tsx    # Calls table with filters
│   │       ├── MonitorReviewTable.tsx   # Review table (10 calls × messages)
│   │       └── MonitorPatternsTable.tsx # Patterns frequency table
│   ├── api/
│   │   └── monitor/
│   │       ├── calls/route.ts           # Calls CRUD API
│   │       ├── messages/route.ts        # Messages CRUD API
│   │       ├── statistics/route.ts      # Statistics API
│   │       ├── evaluate/route.ts        # LLM evaluation API
│   │       └── patterns/route.ts        # Patterns GET API
│   └── voicebot/
│       └── components/
│           ├── AsyncVoiceSolution.tsx       # Integrated monitoring
│           └── ConversationSolution.tsx     # Integrated monitoring
data/
└── prompts/
    └── message-evaluation.txt   # LLM evaluation prompt template
database/
└── monitor.db                   # SQLite database (auto-created)
```

## Usage

### 1. Enable Monitoring
In the voicebot interface, check the "Enable Call Monitoring" checkbox before starting a test.

### 2. Run Tests
- **Async Voice**: Click the call button and speak
- **Conversation Test**: Click "Start Test" to run automated questions

### 3. View Results
Navigate to `/monitor` page to see:

#### Monitor Tab
- **Statistics**: Total calls, completion rate, average duration
- **Call Table**: All calls with status, timestamps, duration
- **Filters**: View active, completed, failed, or abandoned calls

#### Review Tab
- **Review Table**: Matrix view with calls as columns (max 10), messages as rows
  - Color-coded by role (user/assistant/system)
  - Shows evaluation status (✓ evaluated, ✗ issues)
  - Displays message classification
  - **Delete button**: Remove call + messages + patterns
  - **Evaluate button**: Run LLM evaluation on all messages
- **Patterns Table**: Shows detected patterns with type, description, and frequency

## API Endpoints

### Calls API (`/api/monitor/calls`)

**GET** - Fetch calls
```typescript
// Query params: status, startDate, endDate
GET /api/monitor/calls?status=completed
// Response: { success: true, calls: Call[] }
```

**POST** - Create call
```typescript
POST /api/monitor/calls
Body: {
  callId: string,
  userId: string,
  startTime: string, // ISO timestamp
  status: 'active',
  intent: string,
  promptVersionId: string,
  metadata: object
}
// Response: { success: true, call: Call }
```

**PATCH** - Update call
```typescript
PATCH /api/monitor/calls
Body: {
  callId: string,
  endTime?: string,
  duration?: number,
  status?: 'completed' | 'failed' | 'abandoned',
  outcome?: string
}
// Response: { success: true, call: Call }
```

**DELETE** - Delete call
```typescript
DELETE /api/monitor/calls?callId=call_123
// Response: { success: true }
```

### Messages API (`/api/monitor/messages`)

**GET** - Fetch messages for a call
```typescript
GET /api/monitor/messages?callId=call_123
// Response: { success: true, messages: Message[] }
```

**POST** - Create message
```typescript
POST /api/monitor/messages
Body: {
  messageId: string,
  callId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  timestamp: string,
  latencyMs?: number,
  metadata?: object
}
// Response: { success: true, message: Message }
```

### Statistics API (`/api/monitor/statistics`)

**GET** - Fetch statistics
```typescript
GET /api/monitor/statistics
// Response: {
//   success: true,
//   statistics: {
//     total: number,
//     completed: number,
//     failed: number,
//     abandoned: number,
//     active: number,
//     avgDuration: number
//   }
// }
```

### Evaluation API (`/api/monitor/evaluate`)

**POST** - Evaluate messages with LLM
```typescript
POST /api/monitor/evaluate
Body: {
  callId: string
}
// Response: {
//   success: true,
//   callId: string,
//   totalMessages: number,
//   evaluatedCount: number,
//   skippedCount: number,
//   errorCount: number,
//   newClassesCreated: string[],
//   results: Array<{
//     messageId: string,
//     evalClass?: string,
//     confidence?: number,
//     reasoning?: string,
//     newClass?: boolean,
//     skipped?: boolean,
//     error?: string
//   }>
// }
```

### Patterns API (`/api/monitor/patterns`)

**GET** - Fetch all patterns
```typescript
GET /api/monitor/patterns
// Response: {
//   success: true,
//   patterns: Pattern[]
// }
```

## LLM Evaluation System

### Overview
The monitoring system includes intelligent message evaluation powered by Claude AI (Anthropic). This automates quality assessment and intent classification.

### Evaluation Process

1. **Trigger**: Click the ⚡ Evaluate button in the Review tab for any call
2. **LLM Analysis**: Each message is sent to Claude with:
   - Message content and role
   - Existing message classes for context
   - Response quality guidelines (from `data/prompts/response-instructions.txt`)
3. **Classification**: LLM assigns each message to a class:
   - Uses existing classes when confidence > 0.7
   - Creates new classes for unique intents
4. **Database Update**: Updates `messages` table with:
   - `eval_ok`: Whether message follows guidelines
   - `eval_class`: Classification (e.g., 'Intent_FindProject', 'Greeting')
5. **Class Management**: Updates `message_classes` table:
   - Creates new classes with descriptions
   - Increments frequency counters for existing classes

### Message Classifications

**Common User Intent Classes:**
- `Greeting`: Initial hello, hi
- `Intent_FindProject`: User wants to search for a project
- `Intent_CreateProject`: User wants to create a new project
- `Intent_UpdateProject`: User wants to modify existing data
- `Intent_DeleteProject`: User wants to remove a project
- `Intent_GetHelp`: User needs assistance
- `Acknowledgment`: Simple yes, no, okay responses
- `Chitchat`: General conversation, off-topic

**Common Assistant Response Classes:**
- `Response_Data`: Provides data from knowledge base
- `Response_Confirmation`: Confirms an action
- `Response_Error`: Reports an error
- `Response_Question`: Asks for clarification

### Evaluation Prompt

The system uses a structured prompt template (`data/prompts/message-evaluation.txt`) that:
- Instructs LLM to check guideline compliance
- Provides existing classes for consistency
- Requires strict JSON output format
- Includes confidence scoring
- Explains reasoning for transparency

### JSON Output Format

```json
{
  "evalOk": true,
  "reviewOk": false,
  "evalClass": "Intent_FindProject",
  "classDescription": "User wants to search for a project",
  "confidence": 0.95,
  "reasoning": "Clear intent to search with specific criteria"
}
```

### Viewing Results

After evaluation:
- **Review Table**: Shows ✓ for evaluated messages, ✗ for issues
- **Message Classes**: Displays classification under each message
- **Patterns Table**: Can be used to identify conversation flows (future enhancement)

## Utility Functions

### ID Generation
```typescript
generateCallId(): string        // → "call_1234567890_abc123"
generateMessageId(): string     // → "msg_1234567890_xyz789"
generatePatternId(): string     // → "pattern_1234567890_def456"
```

### Duration Formatting
```typescript
calculateDuration(startTime, endTime): number  // → milliseconds
formatDuration(ms): string                     // → "45s" | "2m 30s"
```

### UI Helpers
```typescript
getStatusColor(status): { bg, text, border, dot }  // → Tailwind classes
getRoleColor(role): { bg, text, border }           // → Tailwind classes
truncateText(text, maxLength): string
formatTimestamp(timestamp): string  // → "Dec 14, 02:30:45 PM"
```

### localStorage
```typescript
isMonitoringEnabled(): boolean
setMonitoringEnabled(enabled: boolean): void
```

## Integration Examples

### AsyncVoiceSolution
```typescript
// On session start
if (isMonitoringEnabled()) {
  const callId = generateCallId();
  await fetch('/api/monitor/calls', {
    method: 'POST',
    body: JSON.stringify({
      callId,
      startTime: new Date().toISOString(),
      status: 'active',
      // ...
    })
  });
}

// On message exchange
if (currentCallId) {
  await fetch('/api/monitor/messages', {
    method: 'POST',
    body: JSON.stringify({
      messageId: generateMessageId(),
      callId: currentCallId,
      role: 'user',
      content: transcription,
      // ...
    })
  });
}

// On session end
if (currentCallId) {
  await fetch('/api/monitor/calls', {
    method: 'PATCH',
    body: JSON.stringify({
      callId: currentCallId,
      endTime: new Date().toISOString(),
      status: 'completed'
    })
  });
}
```

### ConversationSolution
```typescript
// Similar pattern with multi-model metadata
metadata: {
  provider,
  model,
  type: 'conversation-test',
  isMultiModel,
  questionCount: testQuestions.length
}
```

## Status Types

- **`active`**: Call in progress
- **`completed`**: Call finished successfully
- **`failed`**: Call encountered an error
- **`abandoned`**: User ended call prematurely

## Role Types

- **`user`**: User message (question, voice input)
- **`assistant`**: AI response
- **`system`**: System notification

## Future Enhancements

### Pattern Detection
Implement automatic pattern recognition:
- **Flow patterns**: Common conversation sequences
- **Decision patterns**: Decision tree branches
- **Failure patterns**: Error scenarios

### Analytics
- Call volume trends
- Success rate over time
- Latency distribution
- Popular intents

### Export
- CSV export for calls/messages
- JSON export for analysis
- Integration with analytics tools

### Alerts
- Notify on high failure rates
- Alert on slow response times
- Detect anomalies

## Notes

- Database uses WAL mode for better concurrency
- All timestamps are ISO 8601 format
- Metadata fields use JSON for flexibility
- Foreign key cascade deletes messages when call is deleted
- Statistics auto-refresh every 10 seconds on dashboard
