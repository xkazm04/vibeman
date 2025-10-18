# LangGraph Tools - Quick Start Guide

## 🚀 Getting Started

### 1. Basic Usage

Test the LangGraph API with a simple read-only query:

```bash
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me all projects",
    "projectId": "vibeman",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "userIntent": "List all registered projects",
  "toolsUsed": [{
    "name": "get_all_projects",
    "description": "Successfully executed get_all_projects",
    "parameters": {},
    "result": { "projects": [...] }
  }],
  "response": "Here are all the projects:\n- Project1: Description\n- Project2: Description",
  "confidence": 95,
  "needsConfirmation": false
}
```

### 2. Testing Tool Categories

#### Read-Only Tools (Safe)
```bash
# Get project backlog
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "What tasks are in the backlog?", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'

# Get folder structure
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me the project structure", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'

# Get background tasks
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "What tasks are running?", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'
```

#### Action Tools (Require Confirmation)
```bash
# Create project (will ask for confirmation)
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a new project called TestApp in /path/to/project", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'

# Response will have needsConfirmation: true
# Then approve with:
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a new project called TestApp in /path/to/project", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "userConfirmation": true}'
```

#### Monitoring Tools
```bash
# Get call statistics
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me voicebot call statistics", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'

# Evaluate a call
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "Evaluate call ABC123", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'
```

## 📚 Tool Reference

### Available Tool Categories

```typescript
import { 
  READ_ONLY_TOOLS,           // 7 tools - safe queries
  PROJECT_MANAGEMENT_TOOLS,  // 3 tools - requires confirmation
  CONTEXT_DOCUMENTATION_TOOLS, // 4 tools
  TASK_BACKLOG_TOOLS,        // 3 tools
  BACKGROUND_PROCESSING_TOOLS, // 3 tools
  FILE_OPERATIONS_TOOLS,     // 2 tools
  AI_ASSISTED_TOOLS,         // 3 tools
  MONITORING_TOOLS,          // 4 tools
  AVAILABLE_TOOLS            // All 29 tools combined
} from '@/lib/langgraph';
```

### Quick Tool Lookup

```typescript
import { getToolByName, getToolsByCategory, getDestructiveTools } from '@/lib/langgraph';

// Find specific tool
const backlogTool = getToolByName('get_project_backlog');

// Get all read-only tools
const readOnlyTools = getToolsByCategory('read-only');

// Get operations that need confirmation
const dangerousTools = getDestructiveTools();
```

## 🔧 Adding a New Tool

### Step 1: Define Tool
```typescript
// src/lib/langgraph/langTools.ts

export const MY_CATEGORY_TOOLS: ToolDefinition[] = [
  {
    name: 'my_new_tool',
    description: 'Does something useful. Use when user asks to...',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'First parameter' },
        param2: { type: 'number', description: 'Second parameter (optional)' }
      },
      required: ['param1']
    }
  }
];

// Add to master list
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  ...READ_ONLY_TOOLS,
  ...MY_CATEGORY_TOOLS,
  // ...
];
```

### Step 2: Implement Executor
```typescript
// src/lib/langgraph/langHelpers.ts

else if (toolName === 'my_new_tool') {
  endpoint = `${baseUrl}/api/my-endpoint`;
  method = 'POST';
  body = { param1: parameters.param1, param2: parameters.param2 };
}
```

### Step 3: Create API Route
```typescript
// src/app/api/my-endpoint/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { param1, param2 } = await request.json();
  
  // Your implementation here
  const result = await doSomething(param1, param2);
  
  return NextResponse.json({
    success: true,
    data: result
  });
}
```

### Step 4: Test
```bash
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{"message": "Use my new tool with param1=test", "projectId": "vibeman", "provider": "anthropic", "model": "claude-3-5-sonnet-20241022"}'
```

## 🎯 Common Use Cases

### 1. Project Information
```typescript
// User: "What projects do we have?"
// Tool: get_all_projects
// Confidence: 95%
// Confirmation: No
```

### 2. Backlog Analysis
```typescript
// User: "How many tasks are pending in project X?"
// Tool: get_project_backlog
// Confidence: 90%
// Confirmation: No
```

### 3. Code Quality Check
```typescript
// User: "Analyze the quality of src/components/*.tsx"
// Tool: analyze_code_quality
// Confidence: 85%
// Confirmation: No (but may take 10-30s)
```

### 4. Create Documentation
```typescript
// User: "Generate docs for these files"
// Tool: generate_documentation
// Confidence: 80%
// Confirmation: Optional (ask for format preference)
```

### 5. Delete Operation
```typescript
// User: "Delete project TestApp"
// Tool: delete_project
// Confidence: 95%
// Confirmation: REQUIRED (destructive)
// isDestructive: true
```

## ⚠️ Important Notes

### Destructive Operations
Always require confirmation for:
- `delete_project`
- `delete_context`
- `delete_backlog_item`
- `cancel_background_task`

### Long-Running Operations
These may take 10-30 seconds:
- `analyze_code_quality`
- `generate_documentation`
- `suggest_improvements`
- `generate_context`

### Parameter Validation
- Required parameters must be provided
- Optional parameters have defaults
- Types are enforced (string, number, boolean, array, object)

## 🐛 Troubleshooting

### Tool Not Found
```json
{
  "success": false,
  "error": "Unknown tool: tool_name",
  "toolsUsed": []
}
```

**Fix**: Check tool name spelling, verify it exists in `AVAILABLE_TOOLS`

### Missing Parameters
```json
{
  "error": "Parameter 'projectId' is required"
}
```

**Fix**: Provide all required parameters in the message or explicitly

### API Endpoint Not Found
```json
{
  "error": "API call failed: 404 Not Found"
}
```

**Fix**: Implement the API endpoint in `src/app/api/`

### Confirmation Blocked
```json
{
  "needsConfirmation": true,
  "confirmationQuestion": "Are you sure...?"
}
```

**Fix**: Send request again with `userConfirmation: true`

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "response": "Human-readable answer",
  "toolsUsed": [
    {
      "name": "tool_name",
      "description": "Successfully executed...",
      "parameters": { "param": "value" },
      "result": { "data": "..." }
    }
  ],
  "userIntent": "What user wanted to do",
  "confidence": 95,
  "needsConfirmation": false
}
```

### Confirmation Required
```json
{
  "success": true,
  "needsConfirmation": true,
  "confirmationType": "yes_no",
  "confirmationQuestion": "Are you sure you want to delete...?",
  "toolsToUse": [{"name": "delete_project", "parameters": {...}}],
  "userIntent": "Delete a project",
  "confidence": 95,
  "isDestructive": true
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "toolsUsed": [],
  "response": "Error processing request",
  "confidence": 0,
  "needsConfirmation": false
}
```

## 🔗 Related Documentation

- **Full Tool Reference**: [LANGGRAPH_TOOLS.md](./LANGGRAPH_TOOLS.md)
- **Prompt Editing Guide**: [LANGGRAPH_PROMPTS_GUIDE.md](./LANGGRAPH_PROMPTS_GUIDE.md)
- **Implementation Details**: [LANGGRAPH_TOOLS_IMPLEMENTATION.md](./LANGGRAPH_TOOLS_IMPLEMENTATION.md)
- **Internal APIs**: [llm_tool_definitions.md](./llm_tool_definitions.md)

## 💡 Tips

1. **Start Simple**: Test read-only tools first
2. **Check Confidence**: Low confidence (<70%) means clarification needed
3. **Use Confirmation**: Always confirm destructive operations
4. **Monitor Performance**: AI-assisted tools take longer
5. **Read Responses**: LLM provides reasoning and alternatives
6. **Chain Tools**: Some queries need multiple tools
7. **Handle Errors**: Check `success` field first

---

**Ready to start?** Try the first example at the top! 🚀
