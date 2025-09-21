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

---

### Tool Selection Logic

When analyzing user questions, consider:

1. **Goal-related keywords**: goals, objectives, targets, roadmap, planning, achievements, milestones
2. **Count queries**: "how many", "count of", "number of"
3. **Status queries**: "completed", "in progress", "pending", "done"
4. **Project overview**: "what is this project about", "project summary"

### Future Tools (Coming Soon)
- get_project_tasks: Fetch project tasks and their status
- get_project_files: Analyze project file structure
- get_project_metrics: Get development metrics and statistics
- get_project_dependencies: Analyze project dependencies
- get_recent_activity: Show recent project activity and changes
`;

export function getToolDefinitions(): string {
  return ANNETTE_TOOL_DEFINITIONS;
}