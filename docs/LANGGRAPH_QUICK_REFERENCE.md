# LangGraph Quick Reference

## 🚀 Quick Start

### Basic Usage
```typescript
import { LangGraphRequest, LangGraphResponse } from '@/lib/langgraph';

// Send a question to LangGraph
const response = await fetch('/api/lang', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "How many goals does this project have?",
    projectId: "project-123",
    provider: "gemini",
    model: "gemini-flash-latest",
    projectContext: { id: "project-123", name: "My Project" }
  })
});

const data: LangGraphResponse = await response.json();
console.log(data.response); // AI-generated answer
console.log(data.toolsUsed); // KB tools that were used
console.log(data.confidence); // Confidence score 0-100
```

---

## 📋 API Reference

### POST /api/lang

**Request Body**:
```typescript
{
  message: string;           // User's question
  projectId: string;         // Project identifier
  provider: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  model: string;             // Model name for the provider
  projectContext?: object;   // Optional project metadata
  userConfirmation?: boolean; // Response to confirmation prompt
}
```

**Response**:
```typescript
{
  success: boolean;
  response: string;          // AI-generated answer
  toolsUsed: ToolCall[];     // KB tools executed
  userIntent?: string;       // Detected user intent
  confidence: number;        // 0-100 confidence score
  needsConfirmation: boolean; // True if confirmation needed
  confirmationQuestion?: string; // Question for user
  steps?: string[];          // Execution steps
  error?: string;            // Error message if failed
}
```

---

## 🎯 Common Use Cases

### 1. Ask About Project Goals
```typescript
const response = await fetch('/api/lang', {
  method: 'POST',
  body: JSON.stringify({
    message: "List all project goals",
    projectId: "abc123",
    provider: "ollama",
    model: "gpt-oss:20b"
  })
});
// Uses: get_project_goals tool
```

### 2. Query Backlog Items
```typescript
const response = await fetch('/api/lang', {
  method: 'POST',
  body: JSON.stringify({
    message: "What tasks are pending?",
    projectId: "abc123",
    provider: "openai",
    model: "gpt-4o"
  })
});
// Uses: get_project_backlog tool
```

### 3. Get Context Information
```typescript
const response = await fetch('/api/lang', {
  method: 'POST',
  body: JSON.stringify({
    message: "Show me all documentation contexts",
    projectId: "abc123",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514"
  })
});
// Uses: get_project_contexts tool
```

### 4. Handle Confirmations
```typescript
// First request
const initial = await fetch('/api/lang', {
  method: 'POST',
  body: JSON.stringify({
    message: "Delete all goals",
    projectId: "abc123",
    provider: "gemini",
    model: "gemini-flash-latest"
  })
});

const data = await initial.json();

if (data.needsConfirmation) {
  // Show user: data.confirmationQuestion
  // User confirms...
  
  // Second request with confirmation
  const confirmed = await fetch('/api/lang', {
    method: 'POST',
    body: JSON.stringify({
      message: "Delete all goals",
      projectId: "abc123",
      provider: "gemini",
      model: "gemini-flash-latest",
      userConfirmation: true // ← User confirmed
    })
  });
}
```

---

## 🔧 Library Functions

### From `@/lib/langgraph`:

#### Client Selection
```typescript
import { getLLMClient } from '@/lib/langgraph';

const client = getLLMClient('gemini');
const result = await client.generate({
  prompt: "Your prompt here",
  model: "gemini-flash-latest",
  taskType: "analysis"
});
```

#### Tool Execution
```typescript
import { executeTool, executeTools } from '@/lib/langgraph';

// Single tool
const result = await executeTool('get_project_goals', { projectId: '123' });

// Multiple tools
const results = await executeTools([
  { name: 'get_project_goals', parameters: { projectId: '123' } },
  { name: 'get_project_backlog', parameters: { projectId: '123' } }
]);
```

#### JSON Parsing
```typescript
import { parseJsonResponse } from '@/lib/langgraph';

const llmOutput = '```json\n{"key": "value"}\n```';
const parsed = parseJsonResponse(llmOutput);

if (parsed.success) {
  console.log(parsed.data); // { key: "value" }
} else {
  console.error(parsed.error);
}
```

#### Request Validation
```typescript
import { validateRequest } from '@/lib/langgraph';

const validation = validateRequest({
  message: "Test",
  projectId: "123",
  provider: "ollama",
  model: "gpt-oss:20b"
});

if (!validation.valid) {
  console.error(validation.error);
}
```

---

## 🛠️ Available Tools

### 1. get_project_goals
Fetches all goals for a project.
```typescript
{
  name: "get_project_goals",
  parameters: { projectId: "abc123" }
}
```

### 2. get_project_backlog
Retrieves backlog items and tasks.
```typescript
{
  name: "get_project_backlog",
  parameters: { projectId: "abc123" }
}
```

### 3. get_project_contexts
Fetches all contexts and documentation.
```typescript
{
  name: "get_project_contexts",
  parameters: { projectId: "abc123" }
}
```

### 4. get_context_groups
Retrieves context organization and groups.
```typescript
{
  name: "get_context_groups",
  parameters: { projectId: "abc123" }
}
```

---

## 🎨 Provider/Model Combinations

| Provider   | Default Model              | Alternative Models |
|------------|---------------------------|-------------------|
| Ollama     | gpt-oss:20b               | llama2, mistral   |
| OpenAI     | gpt-4o                    | gpt-4, gpt-3.5    |
| Anthropic  | claude-sonnet-4-20250514  | claude-3-opus     |
| Gemini     | gemini-flash-latest       | gemini-flash-lite-latest |

### Usage:
```typescript
// Use defaults
{ provider: "gemini", model: "gemini-flash-latest" }

// Or custom model
{ provider: "ollama", model: "llama2:70b" }
```

---

## 🔒 Knowledge Base Enforcement

### Rules:
✅ **DO**: Use tool results to answer questions  
✅ **DO**: State clearly when information isn't available  
✅ **DO**: Reference specific data from tool results  

❌ **DON'T**: Use general LLM training data  
❌ **DON'T**: Make assumptions or fabricate info  
❌ **DON'T**: Answer questions without tool data  

### Example:
```typescript
// Question: "What is machine learning?"
// Response: "I can only answer questions about your project's knowledge base."

// Question: "How many goals in this project?"
// Response: "The project has 5 active goals." ← From get_project_goals tool
```

---

## 📊 Response Confidence

### Confidence Levels:
- **90-100%**: High confidence, answer directly
- **70-89%**: Medium confidence, might ask clarification
- **50-69%**: Low confidence, likely needs confirmation
- **<50%**: Very low, may reject or ask for clarification

### Usage:
```typescript
const data = await response.json();

if (data.confidence < 70) {
  console.warn("Low confidence response:", data.confidence);
  // Maybe show alternatives: data.alternatives
}
```

---

## 🐛 Error Handling

### Common Errors:
```typescript
try {
  const response = await fetch('/api/lang', { ... });
  const data = await response.json();
  
  if (!data.success) {
    // Handle error
    console.error(data.error);
    
    // Common errors:
    // - "Message is required"
    // - "Invalid provider"
    // - "Analysis failed"
    // - "Tool execution failed"
  }
} catch (error) {
  console.error("Network error:", error);
}
```

---

## 🔄 Integration Example

### In ConversationSolution:
```typescript
// Before (direct LLM call):
const result = await processTextMessage(
  sentence, 
  conversationHistory, 
  provider, 
  model
);

// After (LangGraph pipeline):
const response = await fetch('/api/lang', {
  method: 'POST',
  body: JSON.stringify({
    message: sentence,
    projectId: getCurrentProjectId(),
    provider,
    model,
    projectContext: getProjectContext()
  })
});

const data = await response.json();
// Use: data.response, data.toolsUsed, data.confidence
```

---

## 📝 TypeScript Types

```typescript
// Import all types
import {
  LLMProvider,
  LangGraphRequest,
  LangGraphResponse,
  LangGraphState,
  ToolCall,
  ToolDefinition,
  AnalysisResult
} from '@/lib/langgraph';
```

---

## 🚦 Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200  | Success | Request processed successfully |
| 400  | Bad Request | Invalid request parameters |
| 500  | Server Error | Internal processing error |

---

## 💡 Tips

1. **Always provide projectId** - Required for tool execution
2. **Use projectContext** - Improves response quality
3. **Handle confirmations** - Check needsConfirmation flag
4. **Log toolsUsed** - Shows which KB tools were accessed
5. **Monitor confidence** - Low scores may need user review
6. **Test all providers** - Each has different strengths

---

## 📚 Further Reading

- Full documentation: `docs/LANGGRAPH_INTEGRATION_COMPLETE.md`
- Type definitions: `src/lib/langgraph/types.ts`
- Constants: `src/lib/langgraph/constants.ts`
- Prompts: `src/lib/langgraph/prompts.ts`
- Helpers: `src/lib/langgraph/helpers.ts`

