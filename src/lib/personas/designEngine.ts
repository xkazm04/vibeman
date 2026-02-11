/**
 * Persona Design Engine
 *
 * Spawns Claude Code CLI to analyze a user's natural language instruction
 * and generate a complete persona configuration (prompt, tools, triggers).
 *
 * Follows the same buffer/streaming pattern as executionEngine.ts.
 */

import type { DbPersona, DbPersonaToolDefinition } from '@/app/db/models/persona.types';
import type { DesignAnalysisResult, DesignStatus, DesignTestResult } from '@/app/features/Personas/lib/designTypes';
import { parseStructuredPrompt } from './promptMigration';

// ============================================================================
// In-memory state for streaming (persisted on globalThis to survive HMR)
// ============================================================================

// Attach Maps to globalThis so Next.js hot-module-replacement doesn't wipe
// running analysis state when dev-mode reloads this module.
const g = globalThis as Record<string, unknown>;

type ConversationEntry = { role: 'user' | 'assistant'; content: string };
type TestStatusEntry = { done: boolean; result: DesignTestResult | null; error: string | null };

/** Output lines per design analysis for SSE streaming */
const designBuffers: Map<string, string[]> =
  (g.__designBuffers as Map<string, string[]>) ?? new Map();
g.__designBuffers = designBuffers;

/** Status of each design analysis */
const designStatuses: Map<string, DesignStatus> =
  (g.__designStatuses as Map<string, DesignStatus>) ?? new Map();
g.__designStatuses = designStatuses;

/** Conversation history per design session for multi-turn refinement */
const designConversations: Map<string, ConversationEntry[]> =
  (g.__designConversations as Map<string, ConversationEntry[]>) ?? new Map();
g.__designConversations = designConversations;

/** Test buffers for feasibility testing */
const testBuffers: Map<string, string[]> =
  (g.__designTestBuffers as Map<string, string[]>) ?? new Map();
g.__designTestBuffers = testBuffers;

/** Test statuses */
const testStatuses: Map<string, TestStatusEntry> =
  (g.__designTestStatuses as Map<string, TestStatusEntry>) ?? new Map();
g.__designTestStatuses = testStatuses;

/**
 * Consume output lines from a running/completed design analysis.
 * Returns lines starting from `offset` for incremental streaming.
 */
export function consumeDesignOutput(designId: string, offset: number = 0): string[] {
  const buffer = designBuffers.get(designId);
  if (!buffer) return [];
  return buffer.slice(offset);
}

/** Get number of buffered output lines */
export function getDesignBufferLength(designId: string): number {
  return designBuffers.get(designId)?.length ?? 0;
}

/** Get the completion status of a design analysis */
export function getDesignStatus(designId: string): DesignStatus | null {
  return designStatuses.get(designId) ?? null;
}

/** Clean up buffers for a completed design analysis */
export function cleanupDesign(designId: string): void {
  designBuffers.delete(designId);
  designStatuses.delete(designId);
  designConversations.delete(designId);
}

// ============================================================================
// Test buffer accessors
// ============================================================================

export function consumeTestOutput(designId: string, offset: number = 0): string[] {
  const buffer = testBuffers.get(designId);
  if (!buffer) return [];
  return buffer.slice(offset);
}

export function getTestBufferLength(designId: string): number {
  return testBuffers.get(designId)?.length ?? 0;
}

export function getTestStatus(designId: string): TestStatusEntry | null {
  return testStatuses.get(designId) ?? null;
}

export function cleanupTest(designId: string): void {
  testBuffers.delete(designId);
  testStatuses.delete(designId);
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildDesignPrompt(
  instruction: string,
  persona: DbPersona,
  allTools: DbPersonaToolDefinition[],
  currentTools: DbPersonaToolDefinition[],
  mode: 'create' | 'edit'
): string {
  const parts: string[] = [];

  parts.push(`You are an expert AI agent designer. Your task is to ${mode === 'create' ? 'design' : 'modify'} a persona agent configuration based on the user's instructions.`);
  parts.push('');

  // User instruction
  parts.push('# User Request');
  parts.push(instruction);
  parts.push('');

  // Context
  parts.push('# Context');
  parts.push(`Persona name: ${persona.name}`);
  parts.push(`Persona description: ${persona.description || 'Not set'}`);
  parts.push(`Mode: ${mode}`);
  parts.push('');

  // Current state for edit mode
  if (mode === 'edit') {
    const currentPrompt = parseStructuredPrompt(persona.structured_prompt ?? null);
    if (currentPrompt) {
      parts.push('# Current Structured Prompt');
      parts.push('```json');
      parts.push(JSON.stringify(currentPrompt, null, 2));
      parts.push('```');
      parts.push('');
    } else if (persona.system_prompt) {
      parts.push('# Current System Prompt');
      parts.push(persona.system_prompt);
      parts.push('');
    }

    if (currentTools.length > 0) {
      parts.push('# Currently Assigned Tools');
      for (const t of currentTools) {
        parts.push(`- ${t.name} (${t.category}): ${t.description}`);
      }
      parts.push('');
    }

    // Include notification channels
    if (persona.notification_channels) {
      try {
        const channels = JSON.parse(persona.notification_channels);
        if (Array.isArray(channels) && channels.length > 0) {
          parts.push('# Current Notification Channels');
          for (const ch of channels) {
            parts.push(`- ${ch.type}: ${JSON.stringify(ch.config)} (enabled: ${ch.enabled})`);
          }
          parts.push('');
        }
      } catch {
        // Invalid JSON - skip
      }
    }
  }

  // Available tools catalog
  if (allTools.length > 0) {
    parts.push('# Available Tools');
    parts.push('These tools can be assigned to this persona:');
    for (const t of allTools) {
      const credNote = t.requires_credential_type ? ` [requires: ${t.requires_credential_type}]` : '';
      parts.push(`- ${t.name} (${t.category}): ${t.description}${credNote}`);
    }
    parts.push('');
  }

  // Output requirements
  parts.push('# Output Requirements');
  parts.push('');
  parts.push('Output a single valid JSON object. Do NOT wrap it in markdown code fences.');
  parts.push('The JSON must match this exact schema:');
  parts.push('');
  parts.push(`{
  "structured_prompt": {
    "identity": "Who this agent is, its role and personality",
    "instructions": "Detailed step-by-step behavioral instructions",
    "toolGuidance": "When and how to use each assigned tool",
    "examples": "Example interactions, inputs, and expected outputs",
    "errorHandling": "How to handle failures, retries, fallback behavior",
    "customSections": [
      { "title": "Section Title", "content": "Section content" }
    ]
  },
  "suggested_tools": ["tool_name_from_available_list"],
  "suggested_triggers": [
    {
      "trigger_type": "polling|schedule|manual|webhook",
      "config": { "interval_seconds": 1800 },
      "description": "Human-readable description of this trigger"
    }
  ],
  "full_prompt_markdown": "# Full Prompt\\n\\nRendered markdown version of the complete prompt...",
  "summary": "One-line summary of the designed agent",
  "design_highlights": [
    {
      "category": "Category Name",
      "icon": "LucideIconName",
      "color": "text-blue-400",
      "items": ["Bullet point 1", "Bullet point 2"],
      "section": "identity|instructions|toolGuidance|examples|errorHandling|custom_section_title"
    }
  ],
  "suggested_connectors": [
    {
      "name": "connector_name",
      "setup_url": "https://official-docs.example.com/api-keys",
      "setup_instructions": "1. Go to Settings > API Keys\\n2. Create new key\\n3. Copy the key",
      "oauth_type": null,
      "credential_fields": [
        { "key": "api_key", "label": "API Key", "type": "password", "required": true }
      ],
      "related_tools": ["tool_name_from_available_list"],
      "related_triggers": [0]
    }
  ],
  "suggested_notification_channels": [
    {
      "type": "slack|telegram|email",
      "description": "Why this channel is needed",
      "required_connector": "connector_name",
      "config_hints": { "channel": "#alerts" }
    }
  ],
  "feasibility": {
    "confirmed_capabilities": ["capability that works"],
    "issues": ["issue found during verification"],
    "overall_feasibility": "ready|partial|blocked"
  }
}`);
  parts.push('');

  // Guidelines
  parts.push('# Design Guidelines');
  parts.push('');
  parts.push('1. **identity**: Define a clear role, expertise areas, and communication style');
  parts.push('2. **instructions**: Be specific and actionable. Include decision trees where appropriate');
  parts.push('3. **toolGuidance**: For each suggested tool, explain WHEN to use it and with what parameters');
  parts.push('4. **examples**: Provide 2-3 concrete examples of agent behavior');
  parts.push('5. **errorHandling**: Cover network failures, rate limits, invalid data, credential expiry');
  parts.push('6. **customSections**: Create additional sections ONLY if the use case genuinely warrants them (e.g., "Compliance Rules", "Data Privacy", "Escalation Protocol")');
  parts.push('7. **suggested_tools**: ONLY suggest tools from the Available Tools list above. If no tools exist, use an empty array');
  parts.push('8. **suggested_triggers**: Recommend triggers that match the use case');
  parts.push('9. **full_prompt_markdown**: Create a well-structured markdown document covering the complete agent behavior');
  parts.push('10. **design_highlights**: Generate 3-6 highlights covering categories like: Connectors & Permissions, Automation & Events, Error Handling & Recovery, Behavioral Guidelines, Data Processing, Security & Compliance. Each highlight has 2-5 concise bullet points. Use Lucide icon names (Plug, Zap, Shield, Clock, Code, Brain, Settings, AlertTriangle) and Tailwind color classes (text-blue-400, text-amber-400, text-emerald-400, text-purple-400, text-rose-400, text-cyan-400). IMPORTANT: Each highlight MUST include a "section" field mapping it to the most relevant structured_prompt field: "identity", "instructions", "toolGuidance", "examples", or "errorHandling". If a highlight relates to a custom section, use the exact custom section title as the section value. Highlights about general persona behavior map to "instructions", tool-related highlights map to "toolGuidance", error/recovery highlights map to "errorHandling", identity/personality highlights map to "identity"');
  parts.push('11. **suggested_connectors**: For each connector, provide the name, a setup_url pointing to official documentation for obtaining credentials (if known), brief setup_instructions, credential_fields describing what credentials are needed (key/label/type/required), and link related_tools (from suggested_tools) and related_triggers (indices into suggested_triggers array) to this connector. Set oauth_type to null for most connectors. IMPORTANT for Google services (gmail, google_calendar, google_drive): Set oauth_type to "google" — the app has a built-in OAuth 2.0 authorization flow that replaces manual token entry. credential_fields MUST be exactly: [{ "key": "client_id", "label": "Client ID", "type": "text", "required": true }, { "key": "client_secret", "label": "Client Secret", "type": "password", "required": true }, { "key": "refresh_token", "label": "Refresh Token", "type": "password", "required": true }]. Set setup_url to "https://console.cloud.google.com/apis/credentials" and setup_instructions to: "1. Go to Google Cloud Console > APIs & Services > Credentials\\n2. Create a new OAuth 2.0 Client ID (type: Desktop app)\\n3. Enable the required API (Gmail API, Calendar API, etc.)\\n4. Copy the Client ID and Client Secret below\\n5. Click Authorize with Google to complete the connection".');
  parts.push('12. **Notification channels**: If the user mentions wanting notifications, alerts, or messages via Slack, Telegram, email, or similar, populate suggested_notification_channels. This ensures the persona is configured with proper communication channels. Also add relevant messaging instructions to the prompt instructions section (e.g., "After completing the task, send a summary message to the user").');
  parts.push('13. **Data efficiency**: The toolGuidance section MUST include data-fetching constraints for EVERY data-reading tool. These constraints prevent the agent from fetching excessive data. For each tool, specify: (a) default maxResults/limit, (b) required date/time filters (e.g., Gmail: always use `after:{epoch}` in queries; Slack: always use `oldest` parameter; HTTP APIs: always use since/from_date parameters), (c) required scope narrowing (e.g., "only read channels listed in instructions", "only fetch unread emails"). The system will inject runtime timestamps automatically — write the toolGuidance assuming `after:` and `since:` values will be available at execution time. This is CRITICAL for personas that run on polling triggers.');
  const nextNum = 14;
  parts.push(`${nextNum}. **feasibility**: After generating the configuration, verify feasibility inline. Check that every tool in suggested_tools exists in the Available Tools list. Check if tools requiring credentials have matching connectors. Verify trigger configurations are reasonable. Output the assessment in the "feasibility" field. Use "ready" when everything checks out, "partial" when some capabilities work but others need attention, "blocked" when critical tools or credentials are missing.`);
  if (mode === 'edit') {
    parts.push(`${nextNum + 1}. **Editing**: Preserve existing configuration where the user instruction does not request changes. Merge changes thoughtfully.`);
  }
  parts.push('');
  parts.push('Output the JSON now:');

  return parts.join('\n');
}

// ============================================================================
// JSON Extraction
// ============================================================================

function normalizeConnectors(result: DesignAnalysisResult): DesignAnalysisResult {
  if (Array.isArray(result.suggested_connectors)) {
    result.suggested_connectors = result.suggested_connectors.map((c: unknown) =>
      typeof c === 'string' ? { name: c } : c
    ) as DesignAnalysisResult['suggested_connectors'];
  }
  return result;
}

function extractDesignResult(rawOutput: string): DesignAnalysisResult | null {
  if (!rawOutput.trim()) return null;

  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(rawOutput.trim());
    if (parsed.structured_prompt && parsed.summary) return normalizeConnectors(parsed);
  } catch { /* continue */ }

  // Strategy 2: Extract from markdown code fence
  const fenceMatch = rawOutput.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed.structured_prompt && parsed.summary) return normalizeConnectors(parsed);
    } catch { /* continue */ }
  }

  // Strategy 3: Find the largest JSON object with structured_prompt key
  const startIdx = rawOutput.indexOf('{"structured_prompt"');
  if (startIdx >= 0) {
    // Walk forward to find the matching closing brace
    let depth = 0;
    for (let i = startIdx; i < rawOutput.length; i++) {
      if (rawOutput[i] === '{') depth++;
      if (rawOutput[i] === '}') depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(rawOutput.slice(startIdx, i + 1));
          if (parsed.structured_prompt && parsed.summary) return normalizeConnectors(parsed);
        } catch { /* continue */ }
        break;
      }
    }
  }

  // Strategy 4: Find any JSON object between first { and last }
  const braceStart = rawOutput.indexOf('{');
  const braceEnd = rawOutput.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    try {
      const parsed = JSON.parse(rawOutput.slice(braceStart, braceEnd + 1));
      if (parsed.structured_prompt) return normalizeConnectors(parsed);
    } catch { /* continue */ }
  }

  return null;
}

// ============================================================================
// Main Engine
// ============================================================================

export interface DesignEngineInput {
  designId: string;
  instruction: string;
  persona: DbPersona;
  allTools: DbPersonaToolDefinition[];
  currentTools: DbPersonaToolDefinition[];
  mode: 'create' | 'edit';
}

/**
 * Run a design analysis using Claude Code CLI.
 * Non-blocking — call and let it run in background.
 * Use consumeDesignOutput() and getDesignStatus() to monitor.
 */
export function runDesignAnalysis(input: DesignEngineInput): void {
  const { spawn } = require('child_process');

  // Initialize buffer and status
  designBuffers.set(input.designId, []);
  designStatuses.set(input.designId, { done: false, result: null, error: null });

  const appendOutput = (line: string) => {
    const buffer = designBuffers.get(input.designId);
    if (buffer) buffer.push(line);
  };

  const setStatus = (done: boolean, result: DesignAnalysisResult | null, error: string | null) => {
    designStatuses.set(input.designId, { done, result, error });
  };

  // Build prompt
  const prompt = buildDesignPrompt(
    input.instruction,
    input.persona,
    input.allTools,
    input.currentTools,
    input.mode
  );

  appendOutput(`[Design] Analyzing: "${input.instruction.slice(0, 100)}${input.instruction.length > 100 ? '...' : ''}"`);
  appendOutput(`[Design] Mode: ${input.mode}`);
  appendOutput(`[Design] Available tools: ${input.allTools.length}`);
  appendOutput(`[Design] Prompt length: ${prompt.length} chars`);
  appendOutput('');

  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'claude.cmd' : 'claude';
    const args = [
      '-p',
      '-',
      '--output-format',
      'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ];

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const childProcess = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env,
    });

    // Pipe prompt to stdin
    childProcess.stdin.write(prompt);
    childProcess.stdin.end();

    let fullOutput = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;

      for (const line of text.split('\n')) {
        if (!line.trim()) continue;

        // Try to extract assistant message content for display
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                appendOutput(block.text.slice(0, 200));
              }
            }
          } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            appendOutput(parsed.delta.text.slice(0, 200));
          } else if (parsed.type === 'result') {
            appendOutput('[Design] Received result event');
          }
        } catch {
          // Not JSON — show raw line
          if (line.trim().length > 0 && line.trim().length < 300) {
            appendOutput(line.trim());
          }
        }
      }
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) appendOutput(`[stderr] ${text}`);
    });

    childProcess.on('close', (code: number) => {
      appendOutput('');
      appendOutput(`[Design] Process exited with code: ${code}`);

      if (code === 0) {
        // Extract the assistant text content from stream-json output
        const assistantText = extractAssistantText(fullOutput);
        const result = extractDesignResult(assistantText);

        if (result) {
          appendOutput('[Design] Successfully parsed design result');
          appendOutput(`[Design] Summary: ${result.summary}`);
          appendOutput(`[Design] Tools: ${result.suggested_tools.join(', ') || 'none'}`);
          appendOutput(`[Design] Triggers: ${result.suggested_triggers.length}`);
          setStatus(true, result, null);

          // Save conversation history for refinement
          const history = designConversations.get(input.designId) || [];
          history.push({ role: 'user', content: input.instruction });
          history.push({ role: 'assistant', content: assistantText });
          designConversations.set(input.designId, history);
        } else {
          appendOutput('[Design] Warning: Could not parse JSON from output');
          appendOutput('[Design] Raw output length: ' + assistantText.length);
          setStatus(true, null, 'Failed to parse design result from Claude output');
        }
      } else {
        appendOutput(`[Design] Analysis failed with exit code ${code}`);
        setStatus(true, null, `Design analysis failed (exit code ${code})`);
      }

      // Schedule buffer cleanup
      setTimeout(() => cleanupDesign(input.designId), 5 * 60 * 1000);
    });

    childProcess.on('error', (err: Error) => {
      if (err.message.includes('ENOENT') || err.message.includes('spawn claude')) {
        appendOutput('[Design] Claude CLI not found — running in simulation mode');
        appendOutput('[Design] Install: https://docs.claude.com/claude-code');
        appendOutput('');

        // Return a simulation result
        const simResult: DesignAnalysisResult = {
          structured_prompt: {
            identity: `I am ${input.persona.name}, designed based on your instructions.`,
            instructions: `[SIMULATION] Based on your instruction: "${input.instruction}"\n\nThis is a simulated result. Install Claude Code CLI for real design analysis.`,
            toolGuidance: '',
            examples: '',
            errorHandling: 'Report errors clearly and suggest retries.',
            customSections: [],
          },
          suggested_tools: [],
          suggested_triggers: [{ trigger_type: 'manual', config: {}, description: 'Manual execution' }],
          full_prompt_markdown: `# ${input.persona.name}\n\n*Simulated design — install Claude CLI for real analysis*\n\n${input.instruction}`,
          summary: `[Simulated] ${input.instruction.slice(0, 80)}`,
        };

        setStatus(true, simResult, null);
      } else {
        appendOutput(`[Design] Error: ${err.message}`);
        setStatus(true, null, `Spawn error: ${err.message}`);
      }

      setTimeout(() => cleanupDesign(input.designId), 5 * 60 * 1000);
    });

    // 5-minute timeout for design analysis
    const timeout = setTimeout(() => {
      if (!childProcess.killed) {
        appendOutput('[Design] Timeout reached (5 min), killing process');
        childProcess.kill();
      }
    }, 5 * 60 * 1000);

    childProcess.on('close', () => clearTimeout(timeout));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    appendOutput(`[Design] Exception: ${msg}`);
    setStatus(true, null, `Exception: ${msg}`);
    setTimeout(() => cleanupDesign(input.designId), 5 * 60 * 1000);
  }
}

/**
 * Extract assistant text content from Claude stream-json output.
 * The stream-json format outputs JSON lines with type fields.
 */
function extractAssistantText(rawOutput: string): string {
  const textParts: string[] = [];

  for (const line of rawOutput.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      // Handle assistant message with content blocks
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          }
        }
      }
      // Handle content_block_delta (streaming chunks)
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        textParts.push(parsed.delta.text);
      }
      // Handle result event that may contain the final text
      if (parsed.type === 'result' && parsed.result?.text) {
        textParts.push(parsed.result.text);
      }
    } catch {
      // Not JSON — could be the raw text output
      // Only include if it looks like it could be part of JSON
      if (line.trim().startsWith('{') || line.trim().startsWith('"')) {
        textParts.push(line.trim());
      }
    }
  }

  // If we got structured text, join it
  if (textParts.length > 0) {
    return textParts.join('');
  }

  // Fallback: return the raw output for the extractor to try
  return rawOutput;
}

// ============================================================================
// Refinement Engine
// ============================================================================

export interface DesignRefineInput {
  designId: string;
  followUpMessage: string;
  persona: DbPersona;
  allTools: DbPersonaToolDefinition[];
  currentTools: DbPersonaToolDefinition[];
  mode: 'create' | 'edit';
}

function buildRefinementPrompt(
  conversations: ConversationEntry[],
  followUp: string,
  persona: DbPersona,
  allTools: DbPersonaToolDefinition[],
  currentTools: DbPersonaToolDefinition[],
  mode: 'create' | 'edit'
): string {
  const parts: string[] = [];

  parts.push(`You are an expert AI agent designer. You previously designed a persona agent configuration, and the user wants to refine it.`);
  parts.push('');

  // Conversation history
  parts.push('# Previous Conversation');
  for (const turn of conversations) {
    parts.push(`## ${turn.role === 'user' ? 'User' : 'Assistant'}`);
    parts.push(turn.content.slice(0, 2000));
    parts.push('');
  }

  // Follow-up
  parts.push('# New Refinement Request');
  parts.push(followUp);
  parts.push('');

  // Context
  parts.push('# Context');
  parts.push(`Persona name: ${persona.name}`);
  parts.push(`Mode: ${mode}`);
  parts.push('');

  if (allTools.length > 0) {
    parts.push('# Available Tools');
    for (const t of allTools) {
      const credNote = t.requires_credential_type ? ` [requires: ${t.requires_credential_type}]` : '';
      parts.push(`- ${t.name} (${t.category}): ${t.description}${credNote}`);
    }
    parts.push('');
  }

  // Same output schema as initial design
  parts.push('# Output Requirements');
  parts.push('');
  parts.push('Output a single valid JSON object matching the SAME schema as before:');
  parts.push('{ "structured_prompt": {...}, "suggested_tools": [...], "suggested_triggers": [...], "full_prompt_markdown": "...", "summary": "...", "design_highlights": [...], "suggested_connectors": [...], "suggested_notification_channels": [...], "feasibility": { "confirmed_capabilities": [...], "issues": [...], "overall_feasibility": "ready|partial|blocked" } }');
  parts.push('');
  parts.push('Each design_highlights entry MUST include a "section" field mapping to the relevant structured_prompt field (identity, instructions, toolGuidance, examples, errorHandling, or a custom section title).');
  parts.push('Include inline feasibility verification in the "feasibility" field. Check all suggested_tools exist in Available Tools, verify credential requirements, and check trigger reasonability.');
  parts.push('');
  parts.push('Incorporate the refinement request while preserving what was good from the previous design. Output the JSON now:');

  return parts.join('\n');
}

/**
 * Run a design refinement using conversation history.
 */
export function runDesignRefinement(input: DesignRefineInput): void {
  const { spawn } = require('child_process');

  // Reinitialize buffer for same designId
  designBuffers.set(input.designId, []);
  designStatuses.set(input.designId, { done: false, result: null, error: null });

  const appendOutput = (line: string) => {
    const buffer = designBuffers.get(input.designId);
    if (buffer) buffer.push(line);
  };

  const setStatus = (done: boolean, result: DesignAnalysisResult | null, error: string | null) => {
    designStatuses.set(input.designId, { done, result, error });
  };

  const conversations = designConversations.get(input.designId) || [];
  const prompt = buildRefinementPrompt(
    conversations,
    input.followUpMessage,
    input.persona,
    input.allTools,
    input.currentTools,
    input.mode
  );

  appendOutput(`[Refine] Follow-up: "${input.followUpMessage.slice(0, 100)}${input.followUpMessage.length > 100 ? '...' : ''}"`);
  appendOutput(`[Refine] Conversation turns: ${conversations.length}`);
  appendOutput('');

  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'claude.cmd' : 'claude';
    const args = ['-p', '-', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const childProcess = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env,
    });

    childProcess.stdin.write(prompt);
    childProcess.stdin.end();

    let fullOutput = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) appendOutput(block.text.slice(0, 200));
            }
          } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            appendOutput(parsed.delta.text.slice(0, 200));
          }
        } catch {
          if (line.trim().length > 0 && line.trim().length < 300) appendOutput(line.trim());
        }
      }
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) appendOutput(`[stderr] ${text}`);
    });

    childProcess.on('close', (code: number) => {
      appendOutput('');
      appendOutput(`[Refine] Process exited with code: ${code}`);

      if (code === 0) {
        const assistantText = extractAssistantText(fullOutput);
        const result = extractDesignResult(assistantText);

        if (result) {
          appendOutput('[Refine] Successfully parsed refined result');
          setStatus(true, result, null);

          // Append to conversation history
          const history = designConversations.get(input.designId) || [];
          history.push({ role: 'user', content: input.followUpMessage });
          history.push({ role: 'assistant', content: assistantText });
          designConversations.set(input.designId, history);
        } else {
          setStatus(true, null, 'Failed to parse refinement result');
        }
      } else {
        setStatus(true, null, `Refinement failed (exit code ${code})`);
      }

      setTimeout(() => cleanupDesign(input.designId), 5 * 60 * 1000);
    });

    childProcess.on('error', (err: Error) => {
      appendOutput(`[Refine] Error: ${err.message}`);
      setStatus(true, null, `Spawn error: ${err.message}`);
      setTimeout(() => cleanupDesign(input.designId), 5 * 60 * 1000);
    });

    const timeout = setTimeout(() => {
      if (!childProcess.killed) {
        appendOutput('[Refine] Timeout reached (5 min), killing process');
        childProcess.kill();
      }
    }, 5 * 60 * 1000);

    childProcess.on('close', () => clearTimeout(timeout));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    appendOutput(`[Refine] Exception: ${msg}`);
    setStatus(true, null, `Exception: ${msg}`);
    setTimeout(() => cleanupDesign(input.designId), 5 * 60 * 1000);
  }
}

// ============================================================================
// Test Feasibility Engine
// ============================================================================

export interface DesignTestInput {
  designId: string;
  designResult: DesignAnalysisResult;
  persona: DbPersona;
  allTools: DbPersonaToolDefinition[];
  credentials: Array<{ id: string; name: string; service_type: string }>;
}

function buildTestPrompt(
  designResult: DesignAnalysisResult,
  persona: DbPersona,
  allTools: DbPersonaToolDefinition[],
  credentials: Array<{ id: string; name: string; service_type: string }>
): string {
  const parts: string[] = [];

  parts.push('You are a QA engineer verifying the feasibility of an AI agent configuration.');
  parts.push('');
  parts.push('# Agent Design');
  parts.push(`Name: ${persona.name}`);
  parts.push(`Summary: ${designResult.summary}`);
  parts.push(`Tools: ${designResult.suggested_tools.join(', ') || 'none'}`);
  parts.push(`Triggers: ${designResult.suggested_triggers.map(t => t.description).join(', ') || 'none'}`);
  parts.push('');

  parts.push('# Available Tools');
  for (const t of allTools) {
    const credNote = t.requires_credential_type ? ` [requires: ${t.requires_credential_type}]` : '';
    parts.push(`- ${t.name} (${t.category})${credNote}`);
  }
  parts.push('');

  parts.push('# Available Credentials');
  for (const c of credentials) {
    parts.push(`- ${c.name} (${c.service_type})`);
  }
  if (credentials.length === 0) parts.push('- None configured');
  parts.push('');

  parts.push('# Task');
  parts.push('Verify the following:');
  parts.push('1. Are all suggested tools available in the tools list?');
  parts.push('2. Do tools requiring credentials have matching credentials?');
  parts.push('3. Are the trigger configurations reasonable?');
  parts.push('4. Can the prompt instructions be executed with the given tools?');
  parts.push('');

  parts.push('# Output Requirements');
  parts.push('Output a single valid JSON object:');
  parts.push(`{
  "confirmed_capabilities": ["capability that works"],
  "issues": ["issue description"],
  "overall_feasibility": "ready|partial|blocked"
}`);
  parts.push('');
  parts.push('- "ready": All tools and credentials are available, configuration is sound');
  parts.push('- "partial": Some capabilities work but others need attention');
  parts.push('- "blocked": Critical missing tools or credentials prevent operation');
  parts.push('');
  parts.push('Output the JSON now:');

  return parts.join('\n');
}

function extractTestResult(rawOutput: string): DesignTestResult | null {
  if (!rawOutput.trim()) return null;

  const strategies = [
    () => JSON.parse(rawOutput.trim()),
    () => {
      const m = rawOutput.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      return m ? JSON.parse(m[1].trim()) : null;
    },
    () => {
      const s = rawOutput.indexOf('{');
      const e = rawOutput.lastIndexOf('}');
      return s >= 0 && e > s ? JSON.parse(rawOutput.slice(s, e + 1)) : null;
    },
  ];

  for (const strategy of strategies) {
    try {
      const parsed = strategy();
      if (parsed?.overall_feasibility && Array.isArray(parsed.confirmed_capabilities)) {
        return parsed;
      }
    } catch { /* continue */ }
  }

  return null;
}

export function runDesignTest(input: DesignTestInput): void {
  const { spawn } = require('child_process');

  testBuffers.set(input.designId, []);
  testStatuses.set(input.designId, { done: false, result: null, error: null });

  const appendOutput = (line: string) => {
    const buffer = testBuffers.get(input.designId);
    if (buffer) buffer.push(line);
  };

  const setStatus = (done: boolean, result: DesignTestResult | null, error: string | null) => {
    testStatuses.set(input.designId, { done, result, error });
  };

  const prompt = buildTestPrompt(input.designResult, input.persona, input.allTools, input.credentials);

  appendOutput('[Test] Starting feasibility test...');
  appendOutput(`[Test] Checking ${input.designResult.suggested_tools.length} tools, ${input.credentials.length} credentials`);
  appendOutput('');

  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'claude.cmd' : 'claude';
    const args = ['-p', '-', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const childProcess = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env,
    });

    childProcess.stdin.write(prompt);
    childProcess.stdin.end();

    let fullOutput = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) appendOutput(block.text.slice(0, 200));
            }
          } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            appendOutput(parsed.delta.text.slice(0, 200));
          }
        } catch {
          if (line.trim().length > 0 && line.trim().length < 300) appendOutput(line.trim());
        }
      }
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) appendOutput(`[stderr] ${text}`);
    });

    childProcess.on('close', (code: number) => {
      appendOutput('');
      appendOutput(`[Test] Process exited with code: ${code}`);

      if (code === 0) {
        const assistantText = extractAssistantText(fullOutput);
        const result = extractTestResult(assistantText);

        if (result) {
          appendOutput('[Test] Feasibility test complete');
          appendOutput(`[Test] Status: ${result.overall_feasibility}`);
          setStatus(true, result, null);
        } else {
          setStatus(true, null, 'Failed to parse test result');
        }
      } else {
        setStatus(true, null, `Test failed (exit code ${code})`);
      }

      setTimeout(() => cleanupTest(input.designId), 5 * 60 * 1000);
    });

    childProcess.on('error', (err: Error) => {
      appendOutput(`[Test] Error: ${err.message}`);
      setStatus(true, null, `Spawn error: ${err.message}`);
      setTimeout(() => cleanupTest(input.designId), 5 * 60 * 1000);
    });

    // 2-minute timeout for test
    const timeout = setTimeout(() => {
      if (!childProcess.killed) {
        appendOutput('[Test] Timeout reached (2 min), killing process');
        childProcess.kill();
      }
    }, 2 * 60 * 1000);

    childProcess.on('close', () => clearTimeout(timeout));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    appendOutput(`[Test] Exception: ${msg}`);
    setStatus(true, null, `Exception: ${msg}`);
    setTimeout(() => cleanupTest(input.designId), 5 * 60 * 1000);
  }
}
