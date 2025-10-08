export const ANNETTE_TOOL_DEFINITIONS = `
### Available Tools

#### 1. get_project_goals
**Purpose**: Fetches all goals and objectives for a specific project
**When to use**: When users ask about:
- Project goals, objectives, or targets
- What the project is trying to achieve
- Goal counts, status, or progress
- Project planning and roadmap questions

**Parameters**:
- projectId (string, required): The ID of the project to fetch goals for

**Returns**: 
- Array of goal objects with id, title, description, status, and order information
- Goal counts and status distribution
- Project planning insights

**Example usage scenarios**:
- "How many goals are in this project?"
- "What are the main objectives?"
- "Show me the project roadmap"
- "What goals are completed?"

#### 2. get_project_backlog
**Purpose**: Retrieves all backlog items and tasks for a specific project
**When to use**: When users ask about:
- Pending tasks and work items
- Project backlog status and priorities
- What work is planned or in progress
- Task management and workflow questions

**Parameters**:
- projectId (string, required): The ID of the project to fetch backlog for

**Returns**: 
- Array of backlog items with id, title, description, status, agent, and steps
- Task counts by status (pending, in_progress, completed)
- Work prioritization insights

**Example usage scenarios**:
- "What's in the backlog?"
- "Show me pending tasks"
- "What work is planned?"
- "How many tasks are in progress?"

#### 3. get_project_contexts
**Purpose**: Fetches all contexts and context groups for a project
**When to use**: When users ask about:
- Project documentation structure
- Available code contexts and bundles
- How code is organized and grouped
- Context management questions

**Parameters**:
- projectId (string, required): The ID of the project to fetch contexts for

**Returns**: 
- Array of context objects with names, descriptions, and file paths
- Context groups and their organization
- Documentation structure insights

**Example usage scenarios**:
- "What contexts exist in this project?"
- "Show me the documentation structure"
- "How is the code organized?"
- "What context groups are available?"

#### 4. get_context_groups
**Purpose**: Retrieves context groups and their organization for a project
**When to use**: When users ask about:
- How contexts are grouped and categorized
- Context organization structure
- Documentation hierarchy questions

**Parameters**:
- projectId (string, required): The ID of the project to fetch context groups for

**Returns**: 
- Array of context group objects with names, colors, and associated contexts
- Group organization structure
- Context categorization insights

**Example usage scenarios**:
- "How are contexts grouped?"
- "Show me the context categories"
- "What documentation groups exist?"

---

### Tool Selection Logic

When analyzing user questions, consider these patterns:

1. **Goal-related keywords**: goals, objectives, targets, roadmap, planning, achievements, milestones
2. **Task-related keywords**: backlog, tasks, work, todo, pending, progress, development
3. **Context-related keywords**: contexts, documentation, code organization, structure, groups
4. **Count queries**: "how many", "count of", "number of", "total"
5. **Status queries**: "completed", "in progress", "pending", "done"
6. **Overview queries**: "what is", "show me", "list", "summary"

### Multi-Tool Scenarios
Consider using multiple tools when users ask broad questions:
- "Give me a project overview" → Use goals + backlog + contexts
- "What's the current status?" → Use goals + backlog  
- "How is work organized?" → Use backlog + contexts + context groups

### Future Tools (Coming Soon)
- get_project_files: Analyze project file structure
- get_project_metrics: Get development metrics and statistics
- get_project_dependencies: Analyze project dependencies
- get_recent_activity: Show recent project activity and changes
`;

export function getToolDefinitions(): string {
  return ANNETTE_TOOL_DEFINITIONS;
}