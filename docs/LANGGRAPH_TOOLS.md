# LangGraph Tools System

## Overview

The LangGraph tooling system provides LLM agents with access to 40+ internal API endpoints organized into 8 logical categories. This enables intelligent routing, execution, and orchestration of complex operations across the Vibeman platform.

## Architecture

### Core Components

1. **Tool Definitions** (`src/lib/langgraph/langTools.ts`)
   - Organized by functional categories
   - Each tool includes: name, description, parameters schema
   - Supports both read-only and action-oriented operations

2. **Tool Executor** (`src/lib/langgraph/langHelpers.ts`)
   - Maps tool names to actual API endpoints
   - Handles HTTP method selection (GET, POST, PUT, DELETE)
   - Manages query parameters and request bodies
   - Provides error handling and result formatting

3. **Analysis Orchestrator** (`src/lib/langgraph/langPrompts.ts`)
   - Categorizes tools for better LLM understanding
   - Implements tool selection strategy
   - Enforces confirmation for destructive operations
   - Supports multi-tool queries and tool chaining

4. **Prompt Templates** (`data/prompts/`)
   - `analysis-task.txt`: Instructions for tool selection
   - `response-instructions.txt`: How to use tool results
   - `response-guidelines.txt`: Formatting and presentation rules

## Tool Categories

### 1. Read-Only Operations (7 tools)
Safe operations that only retrieve information.

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_project_contexts` | Retrieve contexts and groups | projectId |
| `get_all_projects` | List all projects | - |
| `get_project_backlog` | Fetch backlog items | projectId |
| `get_folder_structure` | Analyze project structure | projectPath (optional) |
| `get_background_tasks` | View task queue status | projectId, status, limit (all optional) |
| `get_requirements_status` | Check requirement processing | - |
| `get_reviewer_pending_files` | List files awaiting review | - |

**When to Use**: User asks questions like "what projects exist?", "show me backlog", "what's in the queue?"

### 2. Project Management (3 tools)
Operations for managing projects and configuration.

| Tool | Confirmation | Description | Parameters |
|------|-------------|-------------|------------|
| `create_project` | ⚠️ Yes | Register new project | id, name, path, description, git |
| `update_project` | ⚠️ Yes | Modify project settings | projectId, updates |
| `delete_project` | 🔴 Required | Remove project | projectId |

**When to Use**: User says "add new project", "update settings", "delete project X"

**Safety**: All operations require user confirmation. Delete is marked DESTRUCTIVE.

### 3. Context & Documentation (4 tools)
Managing code contexts and documentation bundles.

| Tool | Confirmation | Description | Parameters |
|------|-------------|-------------|------------|
| `create_context` | Optional | Create documentation bundle | projectId, name, files, description |
| `update_context` | Optional | Modify context | contextId, updates |
| `delete_context` | ⚠️ Yes | Remove context | contextId |
| `generate_context` | Optional | AI-powered context generation | projectId, files, instructions |

**When to Use**: User asks to "create context", "group these files", "auto-generate docs"

### 4. Task & Backlog Management (3 tools)
Managing tasks and backlog items.

| Tool | Confirmation | Description | Parameters |
|------|-------------|-------------|------------|
| `create_backlog_item` | Optional | Add new task | projectId, title, description, priority, tags |
| `update_backlog_item` | Optional | Modify task | itemId, updates |
| `delete_backlog_item` | ⚠️ Yes | Remove task | itemId |

**When to Use**: User says "add to backlog", "update this task", "mark as complete"

### 5. Background Processing (3 tools)
Managing asynchronous task queue.

| Tool | Confirmation | Description | Parameters |
|------|-------------|-------------|------------|
| `queue_background_task` | Optional | Queue async task | projectId, taskType, taskData, priority |
| `cancel_background_task` | ⚠️ Yes | Stop running task | taskId |
| `retry_failed_task` | Optional | Retry failed operation | taskId |

**When to Use**: User wants to "run this in background", "cancel task X", "retry failed job"

### 6. File Operations (2 tools)
File and folder management.

| Tool | Description | Parameters |
|------|-------------|------------|
| `read_file_content` | Read file contents | filePath |
| `search_files` | Find files by pattern | projectPath, pattern, includeContent |

**When to Use**: User asks "show me the file", "find all .ts files", "search for X"

### 7. AI-Assisted Operations (3 tools)
LLM-powered intelligent processing.

| Tool | Description | Parameters |
|------|-------------|------------|
| `analyze_code_quality` | AI code quality analysis | files, focus (security/performance/maintainability) |
| `generate_documentation` | AI documentation generation | files, format (markdown/jsdoc/inline) |
| `suggest_improvements` | AI improvement suggestions | files, context |

**When to Use**: User asks "analyze code", "generate docs", "suggest improvements"

**Note**: These operations may take longer due to LLM processing.

### 8. Monitoring Tools (4 tools)
Voicebot call monitoring and evaluation.

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_monitor_calls` | Fetch call history | status, startDate, endDate (all optional) |
| `get_monitor_statistics` | Get call metrics | - |
| `evaluate_call_messages` | LLM message evaluation | callId |
| `get_message_patterns` | Get conversation patterns | - |

**When to Use**: User asks about "call history", "monitoring stats", "evaluate this call"

## Tool Selection Strategy

### Analysis Flow

1. **Intent Recognition**: LLM analyzes user message to determine intent
2. **Category Matching**: Maps intent to tool categories
3. **Tool Selection**: Chooses specific tools with parameters
4. **Confirmation Check**: Determines if user confirmation needed
5. **Execution**: Runs tools in parallel or sequentially
6. **Response Generation**: Formats results using tool outputs

### Confirmation Rules

**Always Require Confirmation:**
- Destructive operations (delete, remove)
- Critical data modifications (project settings)
- Operations marked with 🔴 or ⚠️

**Optional Confirmation:**
- Create operations (can ask for details)
- Update operations (verify changes)
- Ambiguous requests (confidence < 80%)

**No Confirmation:**
- Read-only operations (get, list, fetch)
- Background task queuing
- File content reading

### Confidence Scoring

- **90-100%**: Clear intent, exact tool match, proceed immediately
- **70-89%**: Good match, minor assumptions, may ask for clarity
- **50-69%**: Multiple interpretations, requires clarification
- **Below 50%**: Unclear intent, suggest alternatives

## Usage Examples

### Example 1: Simple Read-Only Query

**User**: "Show me all projects"

**Analysis**:
```json
{
  "userIntent": "List all registered projects",
  "needsTools": true,
  "toolsToUse": [{"name": "get_all_projects", "parameters": {}}],
  "confidence": 95,
  "needsConfirmation": false,
  "isDestructive": false
}
```

**Execution**: Calls `GET /api/projects`

**Response**: Lists all projects with names, IDs, and descriptions

---

### Example 2: Multi-Tool Query

**User**: "What's in the backlog for project X and how many tasks are there?"

**Analysis**:
```json
{
  "userIntent": "Fetch backlog and count tasks",
  "needsTools": true,
  "toolsToUse": [
    {"name": "get_project_backlog", "parameters": {"projectId": "X"}}
  ],
  "confidence": 90,
  "needsConfirmation": false
}
```

**Execution**: Calls `GET /api/backlog?projectId=X`

**Response**: Lists backlog items and provides count

---

### Example 3: Destructive Operation

**User**: "Delete project MyApp"

**Analysis**:
```json
{
  "userIntent": "Remove project from system",
  "needsTools": true,
  "toolsToUse": [
    {"name": "delete_project", "parameters": {"projectId": "MyApp"}}
  ],
  "confidence": 95,
  "needsConfirmation": true,
  "confirmationType": "yes_no",
  "confirmationQuestion": "Are you sure you want to delete project 'MyApp'? This action cannot be undone.",
  "isDestructive": true
}
```

**Execution**: Waits for user confirmation → Calls `DELETE /api/projects`

**Response**: Confirms deletion and lists affected resources

---

### Example 4: AI-Assisted Operation

**User**: "Analyze the code quality of src/components/*.tsx files"

**Analysis**:
```json
{
  "userIntent": "Run AI code quality analysis",
  "needsTools": true,
  "toolsToUse": [
    {
      "name": "analyze_code_quality",
      "parameters": {
        "files": ["src/components/*.tsx"],
        "focus": "all"
      }
    }
  ],
  "confidence": 85,
  "needsConfirmation": false
}
```

**Execution**: Calls `POST /api/kiro/analyze-quality` (may take 10-30s)

**Response**: Provides quality scores, issues found, and recommendations

---

### Example 5: Ambiguous Request

**User**: "Update the project"

**Analysis**:
```json
{
  "userIntent": "Modify project (unclear which project and what to update)",
  "needsTools": false,
  "confidence": 40,
  "needsConfirmation": true,
  "confirmationType": "clarification",
  "confirmationQuestion": "Which project do you want to update, and what changes would you like to make?",
  "alternatives": [
    "Update project settings (name, description, path)",
    "Update project metadata",
    "Update project dependencies"
  ]
}
```

**Execution**: Waits for user clarification

**Response**: Asks for specific project ID and fields to update

## API Endpoint Mapping

### Internal API Structure

All tools map to endpoints under `/api/`:

```
/api/
├── projects (GET, POST, PUT, DELETE)
├── contexts (GET, POST, PUT, DELETE)
├── backlog (GET, POST, PUT, DELETE)
├── kiro/
│   ├── folder-structure (GET)
│   ├── background-tasks (GET, POST, DELETE)
│   ├── file-content (GET)
│   ├── search-files (GET)
│   ├── analyze-quality (POST)
│   ├── generate-docs (POST)
│   └── suggest-improvements (POST)
├── requirements/
│   └── status (GET)
├── reviewer/
│   └── pending-files (GET)
└── monitor/
    ├── calls (GET)
    ├── statistics (GET)
    ├── evaluate (POST)
    └── patterns (GET)
```

### Request/Response Format

**Standard Success Response**:
```json
{
  "success": true,
  "data": { /* results */ },
  "message": "Operation completed"
}
```

**Standard Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "details": { /* error context */ }
}
```

## Helper Functions

### `getToolsByCategory(category: string)`
Returns tools for a specific category.

```typescript
const readOnlyTools = getToolsByCategory('read-only');
// Returns: [get_project_contexts, get_all_projects, ...]
```

### `getToolByName(name: string)`
Finds a specific tool by name.

```typescript
const tool = getToolByName('get_project_backlog');
// Returns: ToolDefinition with description and parameters
```

### `getDestructiveTools()`
Returns all operations that require confirmation.

```typescript
const destructive = getDestructiveTools();
// Returns: [delete_project, delete_context, delete_backlog_item, ...]
```

## Extending the System

### Adding a New Tool

1. **Define Tool in `langTools.ts`**:
```typescript
export const NEW_CATEGORY_TOOLS: ToolDefinition[] = [
  {
    name: 'my_new_tool',
    description: 'Does something useful. Use when user asks...',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Description of param1'
        }
      },
      required: ['param1']
    }
  }
];
```

2. **Add to Master List**:
```typescript
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  ...READ_ONLY_TOOLS,
  ...NEW_CATEGORY_TOOLS,
  // ...
];
```

3. **Implement Executor in `langHelpers.ts`**:
```typescript
else if (toolName === 'my_new_tool') {
  endpoint = `${baseUrl}/api/my-endpoint`;
  method = 'POST';
  body = parameters;
}
```

4. **Create API Endpoint** (`src/app/api/my-endpoint/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const { param1 } = await request.json();
  // Implementation
  return NextResponse.json({ success: true, data: result });
}
```

5. **Update Prompts** (if needed):
   - Add examples to `analysis-task.txt`
   - Add response formatting to `response-guidelines.txt`

### Testing New Tools

```bash
# Test via LangGraph API
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Use my new tool with param1=test",
    "projectId": "vibeman",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }'
```

## Best Practices

### For LLM Agents

1. **Always use existing tools** - Don't suggest manual approaches when tools exist
2. **Prefer read-only first** - Check data before modifying
3. **Require confirmation** - For any destructive operations
4. **Provide alternatives** - When confidence < 80%
5. **Chain tools logically** - Fetch data → Analyze → Update
6. **Handle errors gracefully** - Suggest fixes when tools fail

### For Developers

1. **Keep descriptions clear** - Help LLM understand when to use each tool
2. **Use consistent naming** - `get_*` for reads, `create_*`, `update_*`, `delete_*` for actions
3. **Document parameters** - Specify required vs optional clearly
4. **Add confirmation flags** - Mark destructive operations
5. **Return consistent formats** - Use standard success/error responses
6. **Test tool execution** - Verify endpoint mapping works correctly

## Troubleshooting

### Tool Not Executing

1. Check tool name matches definition exactly
2. Verify endpoint exists and is accessible
3. Check parameter types match schema
4. Review API endpoint response format

### Wrong Tool Selected

1. Improve tool description with more keywords
2. Add usage examples to prompt templates
3. Check for conflicting tool descriptions
4. Increase specificity in tool parameters

### Confirmation Not Triggering

1. Verify `isDestructive` flag is set
2. Check tool description includes "DESTRUCTIVE" or "REQUIRES"
3. Ensure analysis prompt checks for destructive operations
4. Review confirmation logic in route handler

## Performance Considerations

- **Parallel Execution**: Read-only tools can run in parallel
- **Sequential Chaining**: Some operations require order (get → update)
- **Timeout Handling**: AI-assisted operations may take 10-30 seconds
- **Rate Limiting**: Consider API rate limits for batch operations
- **Caching**: Cache frequently accessed read-only data

## Security

- **Validation**: All tool parameters validated before execution
- **Authentication**: API endpoints should verify user permissions
- **Confirmation**: Destructive operations require explicit user approval
- **Audit Logging**: Track all tool executions for accountability
- **Input Sanitization**: Prevent injection attacks in parameters

---

**Last Updated**: 2025-01-14  
**Version**: 1.0.0  
**Maintainer**: Vibeman Platform Team
