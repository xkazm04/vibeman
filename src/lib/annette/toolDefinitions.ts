/**
 * Unified Tool Definitions
 * Single source of truth for all Annette tools.
 *
 * Each tool declares its category, Anthropic input_schema, UI metadata
 * (label, triggerPrompt, isCLI, requiresInput), and description — all in one place.
 *
 * toolRegistry.ts and capabilityManifest.ts both derive from this file,
 * so adding/renaming a tool is a single-definition change with compile-time safety.
 */

// ── Types ────────────────────────────────────────────────────────────

export type ToolCategory =
  | 'brain'
  | 'directions'
  | 'ideas'
  | 'goals'
  | 'contexts'
  | 'tasks'
  | 'projects'
  | 'standup'
  | 'analysis';

export interface ToolInputProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolInputProperty>;
  required?: string[];
}

/** Full definition for a single tool */
export interface UnifiedToolDef {
  /** Tool name sent to/from the Anthropic API (e.g. 'get_behavioral_context') */
  name: string;
  /** Which executor category handles this tool */
  category: ToolCategory;
  /** Tool description for the LLM */
  description: string;
  /** Anthropic tool_use input_schema */
  inputSchema: ToolInputSchema;
  /** Short human-readable label for UI */
  label: string;
  /** Natural language prompt that triggers this tool via chat */
  triggerPrompt: string;
  /** Whether this tool triggers a CLI execution */
  isCLI?: boolean;
  /** Whether this tool requires parameters the user must provide */
  requiresInput?: boolean;
}

/** Category metadata for UI display */
export interface CategoryMeta {
  id: ToolCategory;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color prefix
}

// ── Category metadata ────────────────────────────────────────────────

export const CATEGORY_META: CategoryMeta[] = [
  { id: 'brain',      label: 'Brain & Learning',     description: 'Behavioral analysis, reflections, and learning insights',             icon: 'Brain',         color: 'purple' },
  { id: 'directions', label: 'Directions',            description: 'Generate, review, and manage improvement directions',                 icon: 'Compass',       color: 'cyan' },
  { id: 'ideas',      label: 'Ideas',                 description: 'Browse, evaluate, and manage AI-generated improvement ideas',         icon: 'Lightbulb',     color: 'yellow' },
  { id: 'goals',      label: 'Goals',                 description: 'Manage development goals and track progress',                         icon: 'Target',        color: 'green' },
  { id: 'contexts',   label: 'Contexts',              description: 'Explore and manage code contexts (feature areas)',                    icon: 'FolderTree',    color: 'blue' },
  { id: 'tasks',      label: 'Execution',             description: 'Queue and run Claude Code implementations',                          icon: 'Terminal',      color: 'amber' },
  { id: 'projects',   label: 'Project',               description: 'Project structure, files, and information',                           icon: 'FolderOpen',    color: 'slate' },
  { id: 'standup',    label: 'Standup & Reporting',   description: 'Standups, automation, and progress reports',                          icon: 'ClipboardList', color: 'indigo' },
  { id: 'analysis',   label: 'Analysis',              description: 'Codebase health assessment and deep context analysis',                icon: 'Search',        color: 'rose' },
];

// ── Tool definitions ─────────────────────────────────────────────────

export const TOOL_DEFINITIONS: UnifiedToolDef[] = [
  // ── Brain ──────────────────────────────────────────────────────────
  {
    name: 'get_behavioral_context',
    category: 'brain',
    description: 'Get the current behavioral context showing user focus areas, trends, and patterns from the Brain system',
    inputSchema: {
      type: 'object',
      properties: {
        window_days: { type: 'string', description: 'Number of days to look back (default: 7)' },
      },
    },
    label: 'Brain Context',
    triggerPrompt: 'Show me my current brain context and behavioral patterns',
  },
  {
    name: 'get_outcomes',
    category: 'brain',
    description: 'Get recent implementation outcomes (success/failure/revert stats) for directions',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Max number of outcomes to return (default: 10)' },
      },
    },
    label: 'Outcomes',
    triggerPrompt: 'Show me recent implementation outcomes',
  },
  {
    name: 'get_reflection_status',
    category: 'brain',
    description: 'Get the current Brain reflection status: when last reflected, decisions since, and if threshold is approaching',
    inputSchema: { type: 'object', properties: {} },
    label: 'Reflection Status',
    triggerPrompt: 'What is the current reflection status?',
  },
  {
    name: 'trigger_reflection',
    category: 'brain',
    description: 'Manually trigger a Brain reflection session to analyze patterns and update guidance. Requires confirmation.',
    inputSchema: { type: 'object', properties: {} },
    label: 'Trigger Reflection',
    triggerPrompt: 'Trigger a brain reflection now',
  },
  {
    name: 'get_signals',
    category: 'brain',
    description: 'Query raw behavioral signals by type (git_activity, api_focus, context_focus, implementation)',
    inputSchema: {
      type: 'object',
      properties: {
        signal_type: { type: 'string', description: 'Filter by signal type', enum: ['git_activity', 'api_focus', 'context_focus', 'implementation'] },
        limit: { type: 'string', description: 'Max signals to return (default: 20)' },
      },
    },
    label: 'Signals',
    triggerPrompt: 'Show me recent behavioral signals',
  },
  {
    name: 'get_insights',
    category: 'brain',
    description: 'Get learning insights from the most recent Brain reflection (preferences, patterns, warnings)',
    inputSchema: { type: 'object', properties: {} },
    label: 'Insights',
    triggerPrompt: 'Show me the latest brain insights',
  },

  // ── Directions ─────────────────────────────────────────────────────
  {
    name: 'generate_directions',
    category: 'directions',
    description: 'Generate new improvement directions for a specific context or the whole project',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: { type: 'string', description: 'Optional context ID to focus generation on' },
        count: { type: 'string', description: 'Number of directions to generate (default: 3)' },
      },
    },
    label: 'Generate Directions',
    triggerPrompt: 'Generate new directions for my project',
  },
  {
    name: 'list_directions',
    category: 'directions',
    description: 'List existing directions for the project, optionally filtered by status',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['pending', 'accepted', 'rejected', 'implemented'] },
        limit: { type: 'string', description: 'Max directions to return (default: 10)' },
      },
    },
    label: 'List Directions',
    triggerPrompt: 'Show me all pending directions',
  },
  {
    name: 'get_direction_detail',
    category: 'directions',
    description: 'Get full details of a specific direction by ID',
    inputSchema: {
      type: 'object',
      properties: {
        direction_id: { type: 'string', description: 'The direction ID to look up' },
      },
      required: ['direction_id'],
    },
    label: 'Direction Detail',
    triggerPrompt: 'Show me direction details',
    requiresInput: true,
  },
  {
    name: 'accept_direction',
    category: 'directions',
    description: 'Accept a direction for implementation. This queues a Claude Code requirement.',
    inputSchema: {
      type: 'object',
      properties: {
        direction_id: { type: 'string', description: 'The direction ID to accept' },
      },
      required: ['direction_id'],
    },
    label: 'Accept Direction',
    triggerPrompt: 'Accept a direction for implementation',
    requiresInput: true,
  },
  {
    name: 'reject_direction',
    category: 'directions',
    description: 'Reject/delete a direction that is not useful',
    inputSchema: {
      type: 'object',
      properties: {
        direction_id: { type: 'string', description: 'The direction ID to reject' },
      },
      required: ['direction_id'],
    },
    label: 'Reject Direction',
    triggerPrompt: 'Reject a direction',
    requiresInput: true,
  },

  // ── Ideas ──────────────────────────────────────────────────────────
  {
    name: 'browse_ideas',
    category: 'ideas',
    description: 'Get the next pending idea to review (tinder-style)',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: { type: 'string', description: 'Optional context ID to filter ideas' },
      },
    },
    label: 'Browse Ideas',
    triggerPrompt: 'Show me the next idea to review',
  },
  {
    name: 'accept_idea',
    category: 'ideas',
    description: 'Accept an idea, creating a requirement for implementation',
    inputSchema: {
      type: 'object',
      properties: {
        idea_id: { type: 'string', description: 'The idea ID to accept' },
      },
      required: ['idea_id'],
    },
    label: 'Accept Idea',
    triggerPrompt: 'Accept the current idea',
    requiresInput: true,
  },
  {
    name: 'reject_idea',
    category: 'ideas',
    description: 'Reject an idea, removing it from the queue',
    inputSchema: {
      type: 'object',
      properties: {
        idea_id: { type: 'string', description: 'The idea ID to reject' },
      },
      required: ['idea_id'],
    },
    label: 'Reject Idea',
    triggerPrompt: 'Reject the current idea',
    requiresInput: true,
  },
  {
    name: 'generate_ideas',
    category: 'ideas',
    description: 'Trigger idea generation for a context using AI agents',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: { type: 'string', description: 'Context ID to generate ideas for' },
      },
      required: ['context_id'],
    },
    label: 'Generate Ideas',
    triggerPrompt: 'Generate new ideas for my project',
    requiresInput: true,
  },
  {
    name: 'get_idea_stats',
    category: 'ideas',
    description: 'Get statistics about ideas: total, accepted, rejected, pending counts',
    inputSchema: { type: 'object', properties: {} },
    label: 'Idea Stats',
    triggerPrompt: 'Show me idea statistics',
  },

  // ── Goals ──────────────────────────────────────────────────────────
  {
    name: 'list_goals',
    category: 'goals',
    description: 'List all goals for the current project with their status',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['open', 'in_progress', 'done'] },
      },
    },
    label: 'List Goals',
    triggerPrompt: 'Show me all project goals',
  },
  {
    name: 'create_goal',
    category: 'goals',
    description: 'Create a new development goal for the project',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal title' },
        description: { type: 'string', description: 'Goal description' },
        context_id: { type: 'string', description: 'Optional context to associate with' },
      },
      required: ['title'],
    },
    label: 'Create Goal',
    triggerPrompt: 'Create a new goal',
    requiresInput: true,
  },
  {
    name: 'update_goal',
    category: 'goals',
    description: 'Update a goal status or details',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'Goal ID to update' },
        status: { type: 'string', description: 'New status', enum: ['open', 'in_progress', 'done'] },
        title: { type: 'string', description: 'Updated title' },
        description: { type: 'string', description: 'Updated description' },
      },
      required: ['goal_id'],
    },
    label: 'Update Goal',
    triggerPrompt: 'Update a goal',
    requiresInput: true,
  },
  {
    name: 'generate_goal_candidates',
    category: 'goals',
    description: 'Use AI to suggest potential goals based on project analysis',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'string', description: 'Number of candidates to generate (default: 3)' },
      },
    },
    label: 'Goal Candidates',
    triggerPrompt: 'Suggest new goal candidates for my project',
  },

  // ── Contexts ───────────────────────────────────────────────────────
  {
    name: 'list_contexts',
    category: 'contexts',
    description: 'List all code contexts (feature areas / business domains) for the project',
    inputSchema: { type: 'object', properties: {} },
    label: 'List Contexts',
    triggerPrompt: 'List all project contexts',
  },
  {
    name: 'get_context_detail',
    category: 'contexts',
    description: 'Get detailed information about a specific context including files and description',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: { type: 'string', description: 'Context ID to get details for' },
      },
      required: ['context_id'],
    },
    label: 'Context Detail',
    triggerPrompt: 'Show me context details',
    requiresInput: true,
  },
  {
    name: 'scan_contexts',
    category: 'contexts',
    description: 'Trigger a scan to discover or update code contexts in the project',
    inputSchema: { type: 'object', properties: {} },
    label: 'Scan Contexts',
    triggerPrompt: 'Scan and discover project contexts',
  },
  {
    name: 'generate_description',
    category: 'contexts',
    description: 'Generate an AI description for a context based on its files',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: { type: 'string', description: 'Context ID to generate description for' },
      },
      required: ['context_id'],
    },
    label: 'Generate Description',
    triggerPrompt: 'Generate a description for a context',
    requiresInput: true,
  },
  {
    name: 'find_context_by_query',
    category: 'contexts',
    description: 'Find the most relevant context for a natural language query. Searches by keywords, name, description, and API surface. Returns top 3 matches with entry points.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query (e.g., "login page", "database migrations", "brain signals")' },
      },
      required: ['query'],
    },
    label: 'Find Context',
    triggerPrompt: 'Find a context related to',
    requiresInput: true,
  },

  // ── Tasks / Execution ──────────────────────────────────────────────
  {
    name: 'get_queue_status',
    category: 'tasks',
    description: 'Get the current scan/execution queue status and pending items',
    inputSchema: { type: 'object', properties: {} },
    label: 'Queue Status',
    triggerPrompt: 'Show me the execution queue status',
  },
  {
    name: 'queue_requirement',
    category: 'tasks',
    description: 'Queue a requirement for Claude Code execution',
    inputSchema: {
      type: 'object',
      properties: {
        requirement_name: { type: 'string', description: 'Name/title for the requirement' },
        requirement_content: { type: 'string', description: 'Content/instructions for the requirement' },
      },
      required: ['requirement_name', 'requirement_content'],
    },
    label: 'Queue Requirement',
    triggerPrompt: 'Queue a new requirement',
    requiresInput: true,
  },
  {
    name: 'get_execution_status',
    category: 'tasks',
    description: 'Get the status of currently running Claude Code executions',
    inputSchema: { type: 'object', properties: {} },
    label: 'Execution Status',
    triggerPrompt: 'What is the current execution status?',
  },
  {
    name: 'get_implementation_logs',
    category: 'tasks',
    description: 'Get recent implementation logs showing what was executed',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Max logs to return (default: 5)' },
      },
    },
    label: 'Implementation Logs',
    triggerPrompt: 'Show me recent implementation logs',
  },
  {
    name: 'execute_now',
    category: 'tasks',
    description: 'Create and immediately execute a requirement with Claude Code. The execution progress will be shown inline in the chat. Use this when the user wants to see something implemented right away.',
    inputSchema: {
      type: 'object',
      properties: {
        requirement_name: { type: 'string', description: 'Name/title for the requirement' },
        requirement_content: { type: 'string', description: 'Detailed instructions for Claude Code to implement' },
      },
      required: ['requirement_name', 'requirement_content'],
    },
    label: 'Execute Now',
    triggerPrompt: 'Execute a requirement now',
    isCLI: true,
    requiresInput: true,
  },
  {
    name: 'execute_requirement',
    category: 'tasks',
    description: 'Execute an existing requirement file with Claude Code. The execution progress will be shown inline in the chat.',
    inputSchema: {
      type: 'object',
      properties: {
        requirement_name: { type: 'string', description: 'Name of the existing requirement file to execute' },
      },
      required: ['requirement_name'],
    },
    label: 'Execute Requirement',
    triggerPrompt: 'Execute requirement',
    isCLI: true,
    requiresInput: true,
  },

  // ── Projects ───────────────────────────────────────────────────────
  {
    name: 'get_project_structure',
    category: 'projects',
    description: 'Get the project file/folder structure',
    inputSchema: {
      type: 'object',
      properties: {
        depth: { type: 'string', description: 'Max directory depth (default: 3)' },
      },
    },
    label: 'Project Structure',
    triggerPrompt: 'Show me the project structure',
  },
  {
    name: 'list_projects',
    category: 'projects',
    description: 'List all registered projects',
    inputSchema: { type: 'object', properties: {} },
    label: 'List Projects',
    triggerPrompt: 'Show me all projects',
  },
  {
    name: 'get_project_files',
    category: 'projects',
    description: 'Get files in a specific project directory',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Relative directory path to list (default: root)' },
      },
    },
    label: 'Project Files',
    triggerPrompt: 'Show project files',
    requiresInput: true,
  },

  // ── Standup / Reporting ────────────────────────────────────────────
  {
    name: 'generate_standup',
    category: 'standup',
    description: 'Generate an AI-powered standup report based on recent activity',
    inputSchema: { type: 'object', properties: {} },
    label: 'Generate Standup',
    triggerPrompt: 'Generate a standup report',
  },
  {
    name: 'get_standup_history',
    category: 'standup',
    description: 'Get previous standup reports',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Number of standups to return (default: 5)' },
      },
    },
    label: 'Standup History',
    triggerPrompt: 'Show me standup history',
  },
  {
    name: 'run_automation',
    category: 'standup',
    description: 'Run the standup automation workflow (evaluates goals, creates tasks)',
    inputSchema: { type: 'object', properties: {} },
    label: 'Run Automation',
    triggerPrompt: 'Run the standup automation',
  },

  // ── Analysis ───────────────────────────────────────────────────────
  {
    name: 'assess_codebase_health',
    category: 'analysis',
    description: 'Quick health assessment of all project contexts using Brain signals, implementation outcomes, and activity data. Returns contexts ranked by health score. No CLI execution needed — instant results from DB.',
    inputSchema: {
      type: 'object',
      properties: {
        min_score: { type: 'string', description: 'Only return contexts at or below this health score (0-100). Default: show all.' },
      },
    },
    label: 'Codebase Health',
    triggerPrompt: 'Assess the codebase health',
  },
  {
    name: 'analyze_context',
    category: 'analysis',
    description: 'Deep analysis of a specific context/module using Claude Code CLI in read-only mode. Reads actual source files, checks patterns, reports findings. Shows real-time progress in inline terminal. Use assess_codebase_health first to identify which contexts need analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        context_id: { type: 'string', description: 'Context ID to analyze (from list_contexts or assess_codebase_health)' },
        analysis_type: { type: 'string', description: 'Focus area for the analysis', enum: ['architecture', 'quality', 'security', 'performance'] },
      },
      required: ['context_id'],
    },
    label: 'Analyze Context',
    triggerPrompt: 'Analyze a context in depth',
    isCLI: true,
    requiresInput: true,
  },
  {
    name: 'get_analysis_findings',
    category: 'analysis',
    description: 'Parse the results from a completed analyze_context CLI execution. Returns structured findings with severity levels, recommendations with effort/impact, and executive summary. Call this after the inline terminal shows the analysis is complete.',
    inputSchema: {
      type: 'object',
      properties: {
        requirement_name: { type: 'string', description: 'The analysis requirement name returned by analyze_context' },
      },
      required: ['requirement_name'],
    },
    label: 'Analysis Findings',
    triggerPrompt: 'Show me the analysis findings',
    requiresInput: true,
  },
  {
    name: 'create_directions_from_analysis',
    category: 'analysis',
    description: 'Convert analysis findings into actionable direction cards that can be accepted for implementation. Creates directions from the top recommendations sorted by impact.',
    inputSchema: {
      type: 'object',
      properties: {
        findings_json: { type: 'string', description: 'The _rawResult JSON string from get_analysis_findings' },
        max_directions: { type: 'string', description: 'Maximum number of directions to create (default: 3)' },
      },
      required: ['findings_json'],
    },
    label: 'Directions from Analysis',
    triggerPrompt: 'Create directions from the analysis findings',
    requiresInput: true,
  },
];

// ── Derived lookup maps (computed once at module load) ────────────────

/** Map from tool name → category for O(1) dispatch */
export const TOOL_TO_CATEGORY: Record<string, ToolCategory> = {};

/** Map from tool name → full definition */
export const TOOL_BY_NAME: Record<string, UnifiedToolDef> = {};

for (const def of TOOL_DEFINITIONS) {
  TOOL_TO_CATEGORY[def.name] = def.category;
  TOOL_BY_NAME[def.name] = def;
}

/** All valid tool names as a union type for compile-time safety */
export type ToolName = (typeof TOOL_DEFINITIONS)[number]['name'];
