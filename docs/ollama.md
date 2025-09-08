# Universal Ollama Client

This document describes the universal Ollama client system that provides centralized AI request handling with progress tracking and event logging.

## Overview

The universal Ollama client (`ollama.ts`) replaces scattered Ollama API calls throughout the codebase with a centralized, feature-rich system that provides:

- **Unified API**: Single interface for all Ollama requests
- **Progress Tracking**: Real-time progress updates for long-running requests
- **Event Logging**: Automatic success/error event logging to SQLite database
- **Error Handling**: Comprehensive error handling with connection checks
- **JSON Parsing**: Built-in JSON response parsing with fallback handling
- **Timeout Management**: Configurable timeouts for requests
- **Health Checks**: Ollama availability checking

## Usage

### Basic Usage

```typescript
import { ollamaClient } from '@/lib/ollama';

const result = await ollamaClient.generate({
  prompt: 'Your prompt here',
  projectId: 'your-project-id',
  taskType: 'task_description',
  taskDescription: 'Human readable task description'
});

if (result.success) {
  console.log('Response:', result.response);
} else {
  console.error('Error:', result.error);
}
```

### With Progress Tracking

```typescript
const result = await ollamaClient.generate({
  prompt: 'Your prompt here',
  projectId: 'your-project-id',
  taskType: 'task_description',
  taskDescription: 'Human readable task description'
}, {
  onStart: (taskId) => console.log('Started:', taskId),
  onProgress: (progress, message) => console.log(`${progress}%: ${message}`),
  onComplete: (response) => console.log('Complete:', response),
  onError: (error) => console.error('Error:', error)
});
```

### JSON Response Parsing

```typescript
const result = await ollamaClient.generate({
  prompt: 'Return JSON: {"key": "value"}',
  projectId: 'project-id'
});

if (result.success) {
  const parseResult = ollamaClient.parseJsonResponse(result.response);
  if (parseResult.success) {
    console.log('Parsed data:', parseResult.data);
  }
}
```

### Convenience Functions

```typescript
import { generateWithOllama, parseOllamaJson } from '@/lib/ollama';

// Simple generation
const result = await generateWithOllama('Your prompt', {
  projectId: 'project-id',
  taskType: 'simple_task',
  onProgress: (progress, message) => console.log(`${progress}%: ${message}`)
});

// Parse JSON response
const parseResult = await parseOllamaJson(jsonString);
```

## Event Logging

The system automatically logs events to the SQLite database:

### Success Events
- **Type**: `success`
- **Title**: "AI Generation Completed"
- **Description**: Response length and metrics
- **Message**: JSON with task details, duration, token counts, etc.

### Error Events
- **Type**: `error`
- **Title**: "AI Generation Failed" or "AI Generation Error"
- **Description**: Error message
- **Message**: Task details and error context

### Info Events
- **Type**: `info`
- **Title**: "AI Generation Started"
- **Description**: Task description
- **Message**: Task type and model information

## Configuration

### Environment Variables
- `OLLAMA_BASE_URL`: Ollama server URL (default: `http://localhost:11434`)
- `DEFAULT_MODEL`: Default model to use (default: `gpt-oss:20b`)

### Timeouts
- **Request Timeout**: 5 minutes (300,000ms)
- **Health Check Timeout**: 5 seconds

## Error Handling

The system handles various error scenarios:

1. **Connection Errors**: When Ollama is not running
2. **Timeout Errors**: When requests take too long
3. **HTTP Errors**: When Ollama returns error status codes
4. **JSON Parsing Errors**: When responses can't be parsed
5. **Model Errors**: When specified models aren't available

## Migration Guide

### Before (Old Pattern)
```typescript
async function callOllamaAPI(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      prompt,
      stream: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API error (${response.status})`);
  }
  
  const result = await response.json();
  return result.response;
}
```

### After (New Pattern)
```typescript
import { ollamaClient } from '@/lib/ollama';

const result = await ollamaClient.generate({
  prompt,
  projectId,
  taskType: 'your_task_type',
  taskDescription: 'Description of what you are doing'
});

if (!result.success) {
  throw new Error(result.error);
}

return result.response;
```

## Files Updated

The following files have been updated to use the universal client:

- `vibeman/src/app/api/kiro/generate-context/route.ts`
- `vibeman/src/app/backlogComponents/generateBacklogTask.ts`
- `vibeman/src/app/projects/ProjectAI/generateCodeTasks.ts`
- `vibeman/src/app/projects/ProjectAI/generateAIReview.ts`
- `vibeman/src/app/projects/ProjectAI/generateContexts.ts`
- `vibeman/src/app/projects/ProjectAI/generateGoals.ts`
- `vibeman/src/app/projects/ProjectAI/generateTasks.ts`

## Event System

The event system has been redesigned to use SQLite:

### Database Schema
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected')),
  agent TEXT,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Components
- **EventsPanel**: Separated event handling with modal support
- **EventTable**: Updated to support click events
- **EventRow**: Added click functionality
- **UniversalModal**: Used for displaying full event details

## Testing

Test the system using the test endpoint:

```bash
curl -X POST http://localhost:3000/api/kiro/test-ollama \
  -H "Content-Type: application/json" \
  -d '{"projectId": "test-project"}'
```

This will generate a test event and response, allowing you to verify:
1. Ollama connectivity
2. Event logging
3. Response handling
4. Error management

## Benefits

1. **Consistency**: All Ollama requests use the same interface
2. **Observability**: Automatic event logging for all AI operations
3. **Reliability**: Better error handling and timeout management
4. **Progress**: Real-time progress updates for long operations
5. **Debugging**: Centralized logging makes debugging easier
6. **Maintenance**: Single place to update Ollama integration logic