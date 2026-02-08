/**
 * Capability Manifest
 * Structured registry of all Annette tool capabilities organized by category.
 * Source of truth for what Annette can do — drives both display and invocation.
 */

export interface ToolCapability {
  name: string;
  label: string;
  description: string;
  /** Natural language prompt that triggers this tool via chat */
  triggerPrompt: string;
  /** Whether this tool triggers a CLI execution */
  isCLI?: boolean;
  /** Whether this tool requires parameters the user must provide */
  requiresInput?: boolean;
}

export interface CapabilityCategory {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color prefix (e.g., 'cyan', 'purple')
  tools: ToolCapability[];
}

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    id: 'brain',
    label: 'Brain & Learning',
    description: 'Behavioral analysis, reflections, and learning insights',
    icon: 'Brain',
    color: 'purple',
    tools: [
      {
        name: 'get_behavioral_context',
        label: 'Brain Context',
        description: 'View current behavioral context: focus areas, trends, and patterns',
        triggerPrompt: 'Show me my current brain context and behavioral patterns',
      },
      {
        name: 'get_outcomes',
        label: 'Outcomes',
        description: 'See recent implementation outcomes — success, failure, and revert stats',
        triggerPrompt: 'Show me recent implementation outcomes',
      },
      {
        name: 'get_reflection_status',
        label: 'Reflection Status',
        description: 'Check when Brain last reflected and if a new reflection is approaching',
        triggerPrompt: 'What is the current reflection status?',
      },
      {
        name: 'trigger_reflection',
        label: 'Trigger Reflection',
        description: 'Manually trigger a Brain reflection to analyze patterns and update guidance',
        triggerPrompt: 'Trigger a brain reflection now',
      },
      {
        name: 'get_signals',
        label: 'Signals',
        description: 'Query raw behavioral signals: git activity, API focus, context focus',
        triggerPrompt: 'Show me recent behavioral signals',
      },
      {
        name: 'get_insights',
        label: 'Insights',
        description: 'View learning insights from reflections — preferences, patterns, warnings',
        triggerPrompt: 'Show me the latest brain insights',
      },
    ],
  },
  {
    id: 'directions',
    label: 'Directions',
    description: 'Generate, review, and manage improvement directions',
    icon: 'Compass',
    color: 'cyan',
    tools: [
      {
        name: 'generate_directions',
        label: 'Generate Directions',
        description: 'Generate new improvement directions for a context or the whole project',
        triggerPrompt: 'Generate new directions for my project',
      },
      {
        name: 'list_directions',
        label: 'List Directions',
        description: 'List existing directions filtered by status',
        triggerPrompt: 'Show me all pending directions',
      },
      {
        name: 'get_direction_detail',
        label: 'Direction Detail',
        description: 'Get full details of a specific direction',
        triggerPrompt: 'Show me direction details',
        requiresInput: true,
      },
      {
        name: 'accept_direction',
        label: 'Accept Direction',
        description: 'Accept a direction for implementation — queues a Claude Code requirement',
        triggerPrompt: 'Accept a direction for implementation',
        requiresInput: true,
      },
      {
        name: 'reject_direction',
        label: 'Reject Direction',
        description: 'Reject a direction that is not useful',
        triggerPrompt: 'Reject a direction',
        requiresInput: true,
      },
    ],
  },
  {
    id: 'ideas',
    label: 'Ideas',
    description: 'Browse, evaluate, and manage AI-generated improvement ideas',
    icon: 'Lightbulb',
    color: 'yellow',
    tools: [
      {
        name: 'browse_ideas',
        label: 'Browse Ideas',
        description: 'Get the next pending idea to review (tinder-style)',
        triggerPrompt: 'Show me the next idea to review',
      },
      {
        name: 'accept_idea',
        label: 'Accept Idea',
        description: 'Accept an idea, creating a requirement for implementation',
        triggerPrompt: 'Accept the current idea',
        requiresInput: true,
      },
      {
        name: 'reject_idea',
        label: 'Reject Idea',
        description: 'Reject an idea, removing it from the queue',
        triggerPrompt: 'Reject the current idea',
        requiresInput: true,
      },
      {
        name: 'generate_ideas',
        label: 'Generate Ideas',
        description: 'Trigger idea generation for a context using AI agents',
        triggerPrompt: 'Generate new ideas for my project',
        requiresInput: true,
      },
      {
        name: 'get_idea_stats',
        label: 'Idea Stats',
        description: 'Get idea statistics: total, accepted, rejected, pending counts',
        triggerPrompt: 'Show me idea statistics',
      },
    ],
  },
  {
    id: 'goals',
    label: 'Goals',
    description: 'Manage development goals and track progress',
    icon: 'Target',
    color: 'green',
    tools: [
      {
        name: 'list_goals',
        label: 'List Goals',
        description: 'List all goals with their current status',
        triggerPrompt: 'Show me all project goals',
      },
      {
        name: 'create_goal',
        label: 'Create Goal',
        description: 'Create a new development goal for the project',
        triggerPrompt: 'Create a new goal',
        requiresInput: true,
      },
      {
        name: 'update_goal',
        label: 'Update Goal',
        description: 'Update a goal status or details',
        triggerPrompt: 'Update a goal',
        requiresInput: true,
      },
      {
        name: 'generate_goal_candidates',
        label: 'Goal Candidates',
        description: 'Use AI to suggest potential goals based on project analysis',
        triggerPrompt: 'Suggest new goal candidates for my project',
      },
    ],
  },
  {
    id: 'contexts',
    label: 'Contexts',
    description: 'Explore and manage code contexts (feature areas)',
    icon: 'FolderTree',
    color: 'blue',
    tools: [
      {
        name: 'list_contexts',
        label: 'List Contexts',
        description: 'List all code contexts (feature areas / business domains)',
        triggerPrompt: 'List all project contexts',
      },
      {
        name: 'get_context_detail',
        label: 'Context Detail',
        description: 'Get detailed info about a context including files and description',
        triggerPrompt: 'Show me context details',
        requiresInput: true,
      },
      {
        name: 'scan_contexts',
        label: 'Scan Contexts',
        description: 'Discover or update code contexts in the project',
        triggerPrompt: 'Scan and discover project contexts',
      },
      {
        name: 'generate_description',
        label: 'Generate Description',
        description: 'Generate an AI description for a context based on its files',
        triggerPrompt: 'Generate a description for a context',
        requiresInput: true,
      },
      {
        name: 'find_context_by_query',
        label: 'Find Context',
        description: 'Search contexts by natural language query — keywords, name, API surface',
        triggerPrompt: 'Find a context related to',
        requiresInput: true,
      },
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    description: 'Queue and run Claude Code implementations',
    icon: 'Terminal',
    color: 'amber',
    tools: [
      {
        name: 'get_queue_status',
        label: 'Queue Status',
        description: 'Check the execution queue status and pending items',
        triggerPrompt: 'Show me the execution queue status',
      },
      {
        name: 'queue_requirement',
        label: 'Queue Requirement',
        description: 'Queue a requirement for Claude Code execution',
        triggerPrompt: 'Queue a new requirement',
        requiresInput: true,
      },
      {
        name: 'get_execution_status',
        label: 'Execution Status',
        description: 'Check the status of currently running Claude Code executions',
        triggerPrompt: 'What is the current execution status?',
      },
      {
        name: 'get_implementation_logs',
        label: 'Implementation Logs',
        description: 'View recent implementation logs showing what was executed',
        triggerPrompt: 'Show me recent implementation logs',
      },
      {
        name: 'execute_now',
        label: 'Execute Now',
        description: 'Create and immediately execute a requirement with Claude Code',
        triggerPrompt: 'Execute a requirement now',
        isCLI: true,
        requiresInput: true,
      },
      {
        name: 'execute_requirement',
        label: 'Execute Requirement',
        description: 'Execute an existing requirement file with Claude Code',
        triggerPrompt: 'Execute requirement',
        isCLI: true,
        requiresInput: true,
      },
    ],
  },
  {
    id: 'project',
    label: 'Project',
    description: 'Project structure, files, and information',
    icon: 'FolderOpen',
    color: 'slate',
    tools: [
      {
        name: 'get_project_structure',
        label: 'Project Structure',
        description: 'View the project file/folder structure',
        triggerPrompt: 'Show me the project structure',
      },
      {
        name: 'list_projects',
        label: 'List Projects',
        description: 'List all registered projects',
        triggerPrompt: 'Show me all projects',
      },
      {
        name: 'get_project_files',
        label: 'Project Files',
        description: 'Get files in a specific project directory',
        triggerPrompt: 'Show project files',
        requiresInput: true,
      },
    ],
  },
  {
    id: 'standup',
    label: 'Standup & Reporting',
    description: 'Standups, automation, and progress reports',
    icon: 'ClipboardList',
    color: 'indigo',
    tools: [
      {
        name: 'generate_standup',
        label: 'Generate Standup',
        description: 'Generate an AI-powered standup report from recent activity',
        triggerPrompt: 'Generate a standup report',
      },
      {
        name: 'get_standup_history',
        label: 'Standup History',
        description: 'View previous standup reports',
        triggerPrompt: 'Show me standup history',
      },
      {
        name: 'run_automation',
        label: 'Run Automation',
        description: 'Run the standup automation workflow (evaluates goals, creates tasks)',
        triggerPrompt: 'Run the standup automation',
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    description: 'Codebase health assessment and deep context analysis',
    icon: 'Search',
    color: 'rose',
    tools: [
      {
        name: 'assess_codebase_health',
        label: 'Codebase Health',
        description: 'Quick health assessment of all contexts using Brain signals and outcomes',
        triggerPrompt: 'Assess the codebase health',
      },
      {
        name: 'analyze_context',
        label: 'Analyze Context',
        description: 'Deep analysis of a specific context using Claude Code in read-only mode',
        triggerPrompt: 'Analyze a context in depth',
        isCLI: true,
        requiresInput: true,
      },
      {
        name: 'get_analysis_findings',
        label: 'Analysis Findings',
        description: 'Parse results from a completed context analysis',
        triggerPrompt: 'Show me the analysis findings',
        requiresInput: true,
      },
      {
        name: 'create_directions_from_analysis',
        label: 'Directions from Analysis',
        description: 'Convert analysis findings into actionable direction cards',
        triggerPrompt: 'Create directions from the analysis findings',
        requiresInput: true,
      },
    ],
  },
];

/** Flat lookup: tool name → label (replaces TOOL_LABELS in ToolCallDisplay) */
export const TOOL_LABELS: Record<string, string> = {};
/** Flat lookup: tool name → category */
export const TOOL_CATEGORIES: Record<string, string> = {};
/** Flat lookup: tool name → ToolCapability */
export const TOOL_MAP: Record<string, ToolCapability> = {};

for (const cat of CAPABILITY_CATEGORIES) {
  for (const tool of cat.tools) {
    TOOL_LABELS[tool.name] = tool.label;
    TOOL_CATEGORIES[tool.name] = cat.id;
    TOOL_MAP[tool.name] = tool;
  }
}

/** Count tool usage from a list of messages (based on toolCalls arrays) */
export function countToolUsage(
  messages: Array<{ toolCalls?: Array<{ name: string }> }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const msg of messages) {
    if (!msg.toolCalls) continue;
    for (const tc of msg.toolCalls) {
      counts[tc.name] = (counts[tc.name] || 0) + 1;
    }
  }
  return counts;
}
