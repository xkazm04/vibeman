# Claude Code Session Manager for Next.js

A comprehensive guide and implementation for efficiently managing Claude Code sessions from a Next.js server-side application.

## Key Concepts

### Session Management Strategies

1. **Session Persistence**: Store session IDs in a database to maintain context across tasks
2. **Context Compaction**: Use `/compact` equivalent to reduce context when approaching limits
3. **Session Forking**: Create branches from existing sessions for experimental tasks
4. **Automatic Cleanup**: Monitor context usage and clean/restart sessions proactively

### Context Window Limits

- **Standard**: 200K tokens across all models
- **Enterprise Sonnet 4.5**: 500K tokens
- **Recommendation**: Avoid using final 20% of context for complex tasks (performance degrades)

## Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   API Routes    │───▶│ Session Manager │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│         ┌────────────────────────┼────────────────────────┐    │
│         ▼                        ▼                        ▼    │
│  ┌─────────────┐    ┌───────────────────┐    ┌────────────┐   │
│  │   Database  │    │ Claude Agent SDK  │    │   Redis    │   │
│  │  (Sessions) │    │   (Execution)     │    │  (Cache)   │   │
│  └─────────────┘    └───────────────────┘    └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Files Structure

```
src/
├── lib/
│   └── claude/
│       ├── session-manager.ts    # Core session management
│       ├── context-tracker.ts    # Track context usage
│       ├── types.ts              # TypeScript types
│       └── storage/
│           └── prisma-storage.ts # Database adapter
├── hooks/
│   └── use-claude-session.ts     # React hook
├── app/
│   └── api/
│       └── claude/
│           ├── task/route.ts     # Execute tasks
│           ├── session/route.ts  # Session CRUD
│           └── compact/route.ts  # Context compaction
├── examples/
│   └── usage-examples.ts         # Usage patterns
└── prisma/
    └── schema.prisma             # Database schema
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
echo "ANTHROPIC_API_KEY=your-api-key" >> .env
echo "DATABASE_URL=postgresql://..." >> .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

## Core Concepts

### Why Session Persistence Matters

When you create a new session for each task, Claude starts fresh without context. By persisting sessions:

1. **Better Quality**: Claude remembers previous decisions, code patterns, and context
2. **Fewer Tokens**: No need to re-explain the project structure each time
3. **Faster Responses**: Claude doesn't need to re-analyze the codebase
4. **Consistency**: Claude maintains consistent coding style across tasks

### Context Window Management

The context window is 200K tokens (500K for Enterprise Sonnet 4.5). As you add tasks:

```
Task 1: ~5K tokens   → Context: 5K/200K (2.5%)
Task 2: ~8K tokens   → Context: 13K/200K (6.5%)
Task 3: ~12K tokens  → Context: 25K/200K (12.5%)
...
Task 20: ~15K tokens → Context: 150K/200K (75%) ⚠️ Getting full!
```

**Recommendation**: Compact when reaching 80% to maintain quality.

### Auto-Compaction

The system automatically compacts sessions when they approach the limit:

```typescript
const result = await sessionManager.executeTask({
  prompt: 'Your task here',
  sessionId: existingSessionId,
  projectId,
  userId,
  options: {
    autoCompact: true,      // Enable auto-compaction
    compactThreshold: 80,   // Compact at 80% usage
  },
});
```

When compaction triggers, Claude summarizes the conversation history, reducing tokens while preserving important context.

## API Reference

### Execute a Task

```typescript
POST /api/claude/task
{
  "prompt": "Your task description",
  "projectId": "project-123",
  "userId": "user-456",
  "sessionId": "optional-session-id",  // Omit to create new session
  "model": "sonnet",                   // sonnet | opus | haiku
  "maxTurns": 10,
  "allowedTools": ["Read", "Write", "Edit", "Bash"],
  "permissionMode": "acceptEdits",     // default | acceptEdits | plan
  "autoCompact": true,
  "compactThreshold": 80,
  "forkSession": false                 // true to branch from existing
}
```

Response:
```typescript
{
  "success": true,
  "sessionId": "abc-123",
  "result": "Task output here...",
  "contextInfo": {
    "estimatedTokens": 45000,
    "maxTokens": 200000,
    "usagePercentage": 22.5,
    "shouldCompact": false,
    "canContinue": true
  },
  "duration": {
    "total": 5432,
    "api": 4210
  },
  "cost": 0.0034,
  "turns": 3
}
```

### Manage Sessions

```typescript
// List sessions
GET /api/claude/session?projectId=xxx&userId=yyy

// Get specific session
GET /api/claude/session?sessionId=abc-123

// Get or create session for project
POST /api/claude/session
{
  "action": "getOrCreate",
  "projectId": "xxx",
  "userId": "yyy",
  "preferActive": true
}

// Start fresh (archive existing)
POST /api/claude/session
{
  "action": "startFresh",
  "projectId": "xxx",
  "userId": "yyy",
  "sessionId": "optional-current-session"
}

// Cleanup old sessions
POST /api/claude/session
{
  "action": "cleanup",
  "projectId": "xxx",
  "userId": "yyy",
  "maxAge": 604800000,  // 7 days in ms
  "keepActive": true
}
```

### Manual Compaction

```typescript
// Check if compaction needed
GET /api/claude/compact?sessionId=abc-123&threshold=80

// Trigger compaction
POST /api/claude/compact
{
  "sessionId": "abc-123",
  "summaryInstructions": "Focus on code changes and architectural decisions"
}
```

## Best Practices

### 1. Group Related Tasks

```typescript
// ✅ Good: Related tasks in same session
const result1 = await executeTask('Design the API schema');
const result2 = await executeTask('Implement the endpoints', { sessionId: result1.sessionId });
const result3 = await executeTask('Add validation', { sessionId: result1.sessionId });

// ❌ Bad: Each task in new session (loses context)
const result1 = await executeTask('Design the API schema');
const result2 = await executeTask('Implement the endpoints');  // No sessionId - new session
```

### 2. Use Session Forking for Experiments

```typescript
// Try alternative approaches without losing main session
const mainResult = await executeTask('Implement auth with JWT');

const graphqlExperiment = await executeTask('Try implementing with GraphQL', {
  sessionId: mainResult.sessionId,
  forkSession: true,  // Creates branch
});

// Continue main session (unaffected by experiment)
const mainContinue = await executeTask('Add refresh tokens', {
  sessionId: mainResult.sessionId,
});
```

### 3. Compact Proactively

```typescript
// Check context before starting complex task
const contextInfo = await sessionManager.getSessionContext(sessionId);

if (contextInfo.usagePercentage > 70) {
  await sessionManager.compactSession({ 
    sessionId,
    summaryInstructions: 'Preserve code changes and file locations',
  });
}

// Now safe to run complex task
await sessionManager.executeTask({ ... });
```

### 4. Use Project-Scoped Sessions

```typescript
// Each project gets its own session pool
const webAppSession = await getOrCreate('web-app', userId);
const apiSession = await getOrCreate('api-server', userId);
const docsSession = await getOrCreate('documentation', userId);
```

## Known Limitations

1. **Token counting is approximate**: The context tracker estimates tokens. For precise counts, use Anthropic's token counting API.

2. **Session resume requires CLI**: The TypeScript SDK's `resume` parameter requires the Claude Code CLI to be installed and accessible.

3. **No historical message replay**: Currently, resuming a session doesn't replay historical messages through the SDK (see [GitHub issue #14](https://github.com/anthropics/claude-agent-sdk-typescript/issues/14)).

4. **Compaction is a workaround**: True context clearing isn't available in headless mode. Compaction works by asking Claude to summarize, which reduces but doesn't precisely control token usage.

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...

# Optional
CLAUDE_WORKING_DIR=/path/to/default/working/directory
CLAUDE_DEFAULT_MODEL=sonnet  # sonnet | opus | haiku
```

## Troubleshooting

### "Session not found" error
- Ensure the session ID is correct and the session hasn't been deleted
- Check database connection

### Context keeps growing even after compaction
- Compaction reduces but doesn't eliminate context
- Consider starting a fresh session for truly unrelated tasks

### Slow performance at high context
- This is expected; Claude processes more context
- Compact earlier (e.g., at 60% instead of 80%)
- Use `maxTurns` to limit iteration depth
