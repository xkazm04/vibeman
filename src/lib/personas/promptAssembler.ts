/**
 * Prompt Assembler for Persona Agent System
 *
 * Builds the full prompt that gets piped to Claude Code CLI.
 * Combines persona system prompt, tool documentation, input data,
 * credential file paths, and output format instructions.
 */

import * as path from 'path';
import type { DbPersona, DbPersonaToolDefinition } from '@/app/db/models/persona.types';
import { parseStructuredPrompt } from './promptMigration';
import type { StructuredPrompt } from './promptMigration';

export interface PromptAssemblyInput {
  persona: DbPersona;
  tools: DbPersonaToolDefinition[];
  inputData?: object;
  credentialFilePaths?: Map<string, string>; // tool_name -> temp file path
  projectRoot?: string; // absolute path for resolving tool script paths
  lastExecution?: {
    completed_at: string;
    duration_ms: number | null;
    status: string;
  } | null;
  triggerContext?: {
    trigger_type: string;
    interval_seconds: number | null;
  } | null;
}

/**
 * Manual review protocol section injected into all prompts.
 */
const MANUAL_REVIEW_PROTOCOL = `## Manual Review Protocol
If you encounter a situation that requires human review, output a JSON block:
\`\`\`json
{"manual_review": {"title": "...", "description": "...", "severity": "info|warning|critical", "suggested_actions": ["..."]}}
\`\`\``;

const USER_MESSAGE_PROTOCOL = `## User Message Protocol
When you want to send a notification or message to the user, output a JSON block:
\`\`\`json
{"user_message": {"title": "Brief Title", "content": "Message body...", "priority": "low|normal|high"}}
\`\`\`
Use this for status updates, results summaries, alerts, or any communication to the user.
Messages are delivered to all configured notification channels.`;

const EVENT_ACTION_PROTOCOL = `## Event Action Protocol
To trigger another persona agent or emit a custom event, output a JSON block:
\`\`\`json
{"persona_action": {"target": "persona_name", "action": "execute", "input": {"key": "value"}}}
\`\`\`
To delegate a task to another persona:
\`\`\`json
{"persona_action": {"target": "persona_name", "action": "task", "input": {"title": "Task title", "description": "What needs to be done"}}}
\`\`\`
To emit a custom event for any subscribed persona to pick up:
\`\`\`json
{"emit_event": {"type": "custom_event_name", "data": {"key": "value"}}}
\`\`\`
Actions are processed IMMEDIATELY during execution. The target persona will be triggered automatically.`;

/**
 * Build an event trigger context section when the persona was triggered by an event.
 */
function buildEventContext(inputData?: object): string | null {
  if (!inputData) return null;
  const data = inputData as Record<string, unknown>;
  const eventInfo = data._event as Record<string, unknown> | undefined;
  if (!eventInfo) return null;

  const lines = ['## Trigger Context', 'You were triggered by an event from the event bus:'];
  if (eventInfo.event_type) lines.push(`- **Event Type**: ${eventInfo.event_type}`);
  if (eventInfo.source_type) lines.push(`- **Source**: ${eventInfo.source_type}${eventInfo.source_id ? ` / ${eventInfo.source_id}` : ''}`);
  if (eventInfo.payload) {
    lines.push('- **Payload**:');
    lines.push('```json');
    lines.push(JSON.stringify(eventInfo.payload, null, 2));
    lines.push('```');
  }
  lines.push('');
  lines.push('Use this event information to determine what action to take.');
  return lines.join('\n');
}

/**
 * Assemble the full prompt for a persona execution.
 *
 * If the persona has a structured_prompt (JSON), it uses the structured sections.
 * Otherwise falls back to the flat system_prompt.
 */
export function assemblePrompt(input: PromptAssemblyInput): string {
  const structured: StructuredPrompt | null = parseStructuredPrompt(
    input.persona.structured_prompt ?? null
  );

  if (structured) {
    return assembleStructuredPrompt(input, structured);
  }

  return assembleFlatPrompt(input);
}

/**
 * Build prompt from structured sections.
 */
function assembleStructuredPrompt(
  input: PromptAssemblyInput,
  sp: StructuredPrompt
): string {
  const sections: string[] = [];

  // 1. Persona header + description
  sections.push(`# Persona: ${input.persona.name}`);
  if (input.persona.description) {
    sections.push(`## Description\n${input.persona.description}`);
  }

  // 2. Identity
  if (sp.identity.trim()) {
    sections.push(`## Identity\n${sp.identity}`);
  }

  // 3. Instructions
  if (sp.instructions.trim()) {
    sections.push(`## Instructions\n${sp.instructions}`);
  }

  // 4. Tool Guidance
  if (sp.toolGuidance.trim()) {
    sections.push(`## Tool Guidance\n${sp.toolGuidance}`);
  }

  // 5. Available tools
  if (input.tools.length > 0) {
    sections.push('## Available Tools');
    sections.push('You have access to the following tools. Execute them via bash commands as shown below.');
    sections.push('');
    for (const tool of input.tools) {
      const toolDoc = buildToolDocumentation(tool, input.credentialFilePaths, input.projectRoot);
      sections.push(toolDoc);
    }
  }

  // 5b. Execution context
  const execContext = buildExecutionContext(input);
  if (execContext) sections.push(execContext);

  // 5c. Data fetching optimization
  const fetchGuidelines = buildDataFetchingGuidelines(input);
  if (fetchGuidelines) sections.push(fetchGuidelines);

  // 6. Examples
  if (sp.examples.trim()) {
    sections.push(`## Examples\n${sp.examples}`);
  }

  // 7. Error Handling
  if (sp.errorHandling.trim()) {
    sections.push(`## Error Handling\n${sp.errorHandling}`);
  }

  // 8. Custom sections
  for (const cs of sp.customSections) {
    if (cs.content.trim()) {
      sections.push(`## ${cs.title}\n${cs.content}`);
    }
  }

  // 9. Input data
  if (input.inputData && Object.keys(input.inputData).length > 0) {
    sections.push('## Input Data');
    sections.push('```json');
    sections.push(JSON.stringify(input.inputData, null, 2));
    sections.push('```');
  }

  // 9b. Event trigger context (when triggered by event bus)
  const eventCtx = buildEventContext(input.inputData);
  if (eventCtx) sections.push(eventCtx);

  // 10. Manual Review Protocol
  sections.push(MANUAL_REVIEW_PROTOCOL);

  // 11. User Message Protocol
  sections.push(USER_MESSAGE_PROTOCOL);

  // 11b. Event Action Protocol
  sections.push(EVENT_ACTION_PROTOCOL);

  // 12. Output format instructions
  sections.push('## Output Requirements');
  sections.push('After completing your task, output a JSON summary of what you did:');
  sections.push('```json');
  sections.push(JSON.stringify({
    summary: '<brief description of what was accomplished>',
    actions_taken: ['<list of actions performed>'],
    results: '<any relevant output data>',
    errors: '<any errors encountered, or null>',
  }, null, 2));
  sections.push('```');

  // 13. Execution instruction
  sections.push(buildExecutionInstruction(input));

  return sections.join('\n\n');
}

/**
 * Build prompt from flat system_prompt (legacy path).
 */
function assembleFlatPrompt(input: PromptAssemblyInput): string {
  const sections: string[] = [];

  // 1. Persona identity and instructions
  sections.push(`# Persona: ${input.persona.name}`);
  if (input.persona.description) {
    sections.push(`## Description\n${input.persona.description}`);
  }
  sections.push(`## Instructions\n${input.persona.system_prompt}`);

  // 2. Available tools
  if (input.tools.length > 0) {
    sections.push('## Available Tools');
    sections.push('You have access to the following tools. Execute them via bash commands as shown below.');
    sections.push('');

    for (const tool of input.tools) {
      const toolDoc = buildToolDocumentation(tool, input.credentialFilePaths, input.projectRoot);
      sections.push(toolDoc);
    }
  }

  // 2b. Execution context
  const execContextFlat = buildExecutionContext(input);
  if (execContextFlat) sections.push(execContextFlat);

  // 2c. Data fetching optimization
  const fetchGuidelinesFlat = buildDataFetchingGuidelines(input);
  if (fetchGuidelinesFlat) sections.push(fetchGuidelinesFlat);

  // 3. Input data
  if (input.inputData && Object.keys(input.inputData).length > 0) {
    sections.push('## Input Data');
    sections.push('```json');
    sections.push(JSON.stringify(input.inputData, null, 2));
    sections.push('```');
  }

  // 3b. Event trigger context (when triggered by event bus)
  const eventCtxFlat = buildEventContext(input.inputData);
  if (eventCtxFlat) sections.push(eventCtxFlat);

  // 4. Manual Review Protocol
  sections.push(MANUAL_REVIEW_PROTOCOL);

  // 5. User Message Protocol
  sections.push(USER_MESSAGE_PROTOCOL);

  // 5b. Event Action Protocol
  sections.push(EVENT_ACTION_PROTOCOL);

  // 6. Output format instructions
  sections.push('## Output Requirements');
  sections.push('After completing your task, output a JSON summary of what you did:');
  sections.push('```json');
  sections.push(JSON.stringify({
    summary: '<brief description of what was accomplished>',
    actions_taken: ['<list of actions performed>'],
    results: '<any relevant output data>',
    errors: '<any errors encountered, or null>',
  }, null, 2));
  sections.push('```');

  // 7. Execution instruction
  sections.push(buildExecutionInstruction(input));

  return sections.join('\n\n');
}

/**
 * Build a clear execution instruction so Claude acts on the persona prompt
 * instead of treating it as content to analyze.
 */
function buildExecutionInstruction(input: PromptAssemblyInput): string {
  const lines: string[] = ['## EXECUTE NOW'];
  lines.push('You ARE the persona described above. The sections above are YOUR identity and instructions — not a user request to analyze.');

  if (input.inputData && Object.keys(input.inputData).length > 0) {
    lines.push('Process the Input Data according to your instructions and available tools.');
  } else if (input.tools.length > 0) {
    lines.push('Execute your primary function now using your available tools. Follow your instructions.');
  } else {
    lines.push('Execute your primary function now. Follow your instructions and produce the required output.');
  }

  return lines.join('\n');
}

/**
 * Build execution context section with temporal information.
 */
function buildExecutionContext(input: PromptAssemblyInput): string | null {
  if (!input.lastExecution && !input.triggerContext) return null;

  const lines: string[] = ['## Execution Context'];

  const now = new Date();

  if (input.lastExecution?.completed_at) {
    const lastTime = new Date(input.lastExecution.completed_at);
    const diffMs = now.getTime() - lastTime.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffLabel = diffMins < 1 ? 'less than a minute ago'
      : diffMins < 60 ? `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
      : `${Math.round(diffMins / 60)} hour${Math.round(diffMins / 60) === 1 ? '' : 's'} ago`;

    lines.push(`- **Last execution**: ${input.lastExecution.completed_at} (${diffLabel})`);
    lines.push(`- **Last execution status**: ${input.lastExecution.status}`);
    if (input.lastExecution.duration_ms) {
      lines.push(`- **Last duration**: ${(input.lastExecution.duration_ms / 1000).toFixed(1)}s`);
    }
  } else {
    lines.push('- **First execution**: This is the first time this persona is running');
  }

  if (input.triggerContext) {
    lines.push(`- **Trigger type**: ${input.triggerContext.trigger_type}`);
    if (input.triggerContext.interval_seconds) {
      const mins = Math.round(input.triggerContext.interval_seconds / 60);
      lines.push(`- **Execution frequency**: Every ${mins < 1 ? `${input.triggerContext.interval_seconds}s` : `${mins} minute${mins === 1 ? '' : 's'}`}`);
    }
  }

  lines.push(`- **Current time**: ${now.toISOString()}`);

  return lines.join('\n');
}

/**
 * Build dynamic data-fetching optimization guidelines based on tools and context.
 * Generates tool-specific query constraints to prevent fetching excessive data.
 */
function buildDataFetchingGuidelines(input: PromptAssemblyInput): string | null {
  if (input.tools.length === 0) return null;

  const lines: string[] = ['## Data Fetching Optimization'];
  lines.push('CRITICAL: Follow these rules to keep executions fast and efficient.');
  lines.push('');

  // Calculate the lookback window
  let lookbackIso: string | null = null;
  let lookbackLabel = '';

  if (input.lastExecution?.completed_at) {
    // Use last execution time with 1-minute buffer for overlap safety
    const lastTime = new Date(input.lastExecution.completed_at);
    lastTime.setMinutes(lastTime.getMinutes() - 1);
    lookbackIso = lastTime.toISOString();

    const diffMs = new Date().getTime() - lastTime.getTime();
    const diffMins = Math.round(diffMs / 60000);
    lookbackLabel = diffMins < 60 ? `~${diffMins} minutes` : `~${Math.round(diffMins / 60)} hours`;
  } else if (input.triggerContext?.interval_seconds) {
    // First run with a known interval: look back 2x the interval as a reasonable default
    const lookbackMs = input.triggerContext.interval_seconds * 2 * 1000;
    const lookbackDate = new Date(Date.now() - lookbackMs);
    lookbackIso = lookbackDate.toISOString();
    const mins = Math.round(lookbackMs / 60000);
    lookbackLabel = mins < 60 ? `~${mins} minutes` : `~${Math.round(mins / 60)} hours`;
  } else {
    // No context at all: default to last 24 hours
    const lookbackDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    lookbackIso = lookbackDate.toISOString();
    lookbackLabel = '24 hours';
  }

  // Calculate epoch seconds for Gmail-style after: filter
  const lookbackEpoch = lookbackIso ? Math.floor(new Date(lookbackIso).getTime() / 1000) : null;

  // Collect tool categories for specific guidance
  const categories = new Set(input.tools.map(t => t.category));
  const toolNames = new Set(input.tools.map(t => t.name));

  // General rules
  lines.push('### General Rules');
  lines.push(`- Only fetch data from the last ${lookbackLabel} (since ${lookbackIso})`);
  lines.push('- Always use the smallest `maxResults`/`limit` that satisfies your task');
  lines.push('- If a tool supports date/time filters, ALWAYS use them');
  lines.push('- Process results incrementally — do not fetch everything then filter in memory');
  lines.push('');

  // Gmail-specific
  if (categories.has('gmail')) {
    lines.push('### Gmail Tools');
    if (lookbackEpoch) {
      lines.push(`- For gmail_read and gmail_search: ALWAYS include \`after:${lookbackEpoch}\` in the query parameter`);
      lines.push(`  Example: \`{"query": "is:unread after:${lookbackEpoch}", "maxResults": 10}\``);
    }
    lines.push('- Default maxResults: 10 (increase only if your task requires more)');
    lines.push('- Use specific label filters (is:unread, label:INBOX) to narrow scope');
    lines.push('- When searching, combine filters: `from:sender@example.com after:{epoch} is:unread`');
    lines.push('');
  }

  // Slack-specific
  if (categories.has('slack') || toolNames.has('slack_read') || toolNames.has('slack_send')) {
    lines.push('### Slack Tools');
    if (lookbackIso) {
      const slackTs = (new Date(lookbackIso).getTime() / 1000).toFixed(6);
      lines.push(`- For slack_read: use \`oldest\` parameter set to \`${slackTs}\``);
    }
    lines.push('- Default limit: 20 messages per channel');
    lines.push('- Only read channels relevant to your task');
    lines.push('');
  }

  // HTTP-specific
  if (categories.has('http') || toolNames.has('http_request')) {
    lines.push('### HTTP/API Tools');
    lines.push('- When calling APIs that support pagination, fetch only the first page');
    if (lookbackIso) {
      lines.push(`- If the API supports date filters, pass since/after/from_date: ${lookbackIso}`);
    }
    lines.push('- Set reasonable timeouts and use GET over POST where possible');
    lines.push('');
  }

  // GitHub-specific
  if (categories.has('github') || toolNames.has('github_api')) {
    lines.push('### GitHub Tools');
    if (lookbackIso) {
      lines.push(`- Use \`since\` parameter: ${lookbackIso}`);
      lines.push(`- For issues/PRs: use \`sort=updated&direction=desc&since=${lookbackIso}\``);
    }
    lines.push('- Default per_page: 10');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build documentation block for a single tool.
 */
function buildToolDocumentation(
  tool: DbPersonaToolDefinition,
  credentialFilePaths?: Map<string, string>,
  projectRoot?: string
): string {
  const lines: string[] = [];

  lines.push(`### Tool: ${tool.name}`);
  lines.push(`**Category**: ${tool.category}`);
  lines.push(`**Description**: ${tool.description}`);

  // Resolve script path to absolute so it works from any cwd
  const scriptPath = path.isAbsolute(tool.script_path)
    ? tool.script_path
    : path.resolve(projectRoot || process.cwd(), tool.script_path);

  // Build the command
  const args: string[] = [`npx tsx "${scriptPath}"`];
  args.push("--input '<JSON input>'");

  // Add credential file path if tool requires credentials
  if (tool.requires_credential_type && credentialFilePaths) {
    const credPath = credentialFilePaths.get(tool.name);
    if (credPath) {
      args.push(`--credentials "${credPath}"`);
    }
  }

  lines.push(`**Usage**: \`${args.join(' ')}\``);

  // Input schema
  if (tool.input_schema) {
    try {
      const schema = typeof tool.input_schema === 'string' ? JSON.parse(tool.input_schema) : tool.input_schema;
      lines.push(`**Input Schema**: \`${JSON.stringify(schema)}\``);
    } catch {
      lines.push(`**Input Schema**: ${tool.input_schema}`);
    }
  }

  // Output schema
  if (tool.output_schema) {
    try {
      const schema = typeof tool.output_schema === 'string' ? JSON.parse(tool.output_schema) : tool.output_schema;
      lines.push(`**Output Schema**: \`${JSON.stringify(schema)}\``);
    } catch {
      lines.push(`**Output Schema**: ${tool.output_schema}`);
    }
  }

  lines.push('**Output**: JSON on stdout. Exit code 0 = success.');
  lines.push('');

  return lines.join('\n');
}
