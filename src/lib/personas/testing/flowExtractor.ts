/**
 * Flow Extractor — spawns a Claude CLI call to extract use case flow graphs
 * from a DesignAnalysisResult. The flows are used for activity diagram visualization.
 *
 * Pattern: Same as evaluateSemantic() in testEvaluator.ts —
 * separate CLI call for isolated concern.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import type { DesignTestCase } from './testTypes';
import type { UseCaseFlow } from './flowTypes';
import { extractAssistantText } from '../designEngine';

// ============================================================================
// Constants
// ============================================================================

const FLOW_EXTRACTION_TIMEOUT_MS = 90000; // 90s — simpler than full design

// ============================================================================
// Prompt Builder
// ============================================================================

function buildFlowExtractionPrompt(
  designResult: DesignAnalysisResult,
  testCase: DesignTestCase
): string {
  const designJson = JSON.stringify({
    structured_prompt: designResult.structured_prompt,
    suggested_tools: designResult.suggested_tools,
    suggested_triggers: designResult.suggested_triggers,
    suggested_connectors: designResult.suggested_connectors,
    design_highlights: designResult.design_highlights,
    feasibility: designResult.feasibility,
    suggested_event_subscriptions: designResult.suggested_event_subscriptions,
    summary: designResult.summary,
  }, null, 2);

  return `You are a workflow analyst. Given this persona design result, extract 1-3 distinct use case flows as activity diagrams.

Each flow represents a distinct end-to-end scenario the persona handles.

## Node Types

Use EXACTLY these node types:
- "start" — The trigger/entry point (schedule timer, webhook receipt, event subscription)
- "end" — Completion/output of the flow
- "action" — A step the persona performs (reading data, transforming, filtering, aggregating)
- "decision" — A branching condition (if/else logic, pattern matching)
- "connector" — An external service interaction. MUST include the "connector" field with the service name (e.g. "gmail", "slack", "github", "http", "google_calendar", "google_drive")
- "event" — An event bus emission or subscription (emit_event, persona_action)
- "error" — An error handling path (retry, fallback, notification)

## Edge Variants

Use these edge variants:
- "default" — Normal flow
- "yes" — True branch from a decision
- "no" — False branch from a decision
- "error" — Error/exception path

## Rules

1. Each flow MUST have exactly one "start" node and at least one "end" node
2. Every node MUST have a unique id within its flow (use short ids like "n1", "n2", etc.)
3. Every edge MUST have a unique id (use "e1", "e2", etc.)
4. Connector nodes MUST have the "connector" field set to the service name
5. Decision nodes should have exactly 2 outgoing edges (yes/no or success/error)
6. Keep labels concise (max 5 words)
7. Add "detail" field for longer explanations where helpful
8. Flow names should be descriptive action phrases (e.g. "Process urgent emails", "Generate daily digest")
9. Extract 1-3 flows — focus on the MAIN use case first, then variations or error scenarios

## Output Format

Return ONLY valid JSON in this exact structure:
\`\`\`json
{
  "flows": [
    {
      "id": "flow-1",
      "name": "Main Use Case Name",
      "description": "Brief description of what this flow does",
      "nodes": [
        { "id": "n1", "type": "start", "label": "Trigger label", "detail": "Optional detail" },
        { "id": "n2", "type": "connector", "label": "Read emails", "connector": "gmail" },
        { "id": "n3", "type": "decision", "label": "Is urgent?" },
        { "id": "n4", "type": "action", "label": "Categorize" },
        { "id": "n5", "type": "connector", "label": "Send summary", "connector": "slack" },
        { "id": "n6", "type": "end", "label": "Complete" }
      ],
      "edges": [
        { "id": "e1", "source": "n1", "target": "n2", "variant": "default" },
        { "id": "e2", "source": "n2", "target": "n3", "variant": "default" },
        { "id": "e3", "source": "n3", "target": "n4", "label": "Yes", "variant": "yes" },
        { "id": "e4", "source": "n3", "target": "n6", "label": "No", "variant": "no" },
        { "id": "e5", "source": "n4", "target": "n5", "variant": "default" },
        { "id": "e6", "source": "n5", "target": "n6", "variant": "default" }
      ]
    }
  ]
}
\`\`\`

<design_result>
${designJson}
</design_result>

<original_instruction>
${testCase.instruction}
</original_instruction>

Return ONLY the JSON object. No explanation, no markdown outside the json block.`;
}

// ============================================================================
// CLI Spawning (mirrors runDesignCli in testRunner.ts)
// ============================================================================

function runFlowCli(prompt: string): Promise<{ text: string; exitCode: number }> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'claude.cmd' : 'claude';
    const args = ['-p', '-', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const execDir = path.join(os.tmpdir(), `vibeman-flow-extract-${Date.now()}`);
    try { fs.mkdirSync(execDir, { recursive: true }); } catch { /* ok */ }

    try {
      const child = spawn(command, args, {
        cwd: execDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows,
        env,
      });

      child.stdin.write(prompt);
      child.stdin.end();

      let fullOutput = '';

      child.stdout.on('data', (data: Buffer) => {
        fullOutput += data.toString();
      });

      child.stderr.on('data', () => { /* ignore stderr */ });

      const timer = setTimeout(() => {
        if (!child.killed) child.kill();
      }, FLOW_EXTRACTION_TIMEOUT_MS);

      child.on('close', (code: number) => {
        clearTimeout(timer);
        try { fs.rmSync(execDir, { recursive: true, force: true }); } catch { /* ok */ }
        resolve({ text: fullOutput, exitCode: code ?? 1 });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        try { fs.rmSync(execDir, { recursive: true, force: true }); } catch { /* ok */ }
        resolve({ text: `CLI error: ${err.message}`, exitCode: 1 });
      });
    } catch (err: unknown) {
      try { fs.rmSync(execDir, { recursive: true, force: true }); } catch { /* ok */ }
      const msg = err instanceof Error ? err.message : String(err);
      resolve({ text: `Spawn error: ${msg}`, exitCode: 1 });
    }
  });
}

// ============================================================================
// JSON Extraction (mirrors extractDesignResult pattern)
// ============================================================================

function extractFlowsFromText(text: string): UseCaseFlow[] | null {
  // Strategy 1: Find ```json ... ``` block
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1].trim());
      if (parsed?.flows && Array.isArray(parsed.flows)) return validateFlows(parsed.flows);
    } catch { /* try next strategy */ }
  }

  // Strategy 2: Find { "flows": ... } pattern
  const flowsMatch = text.match(/\{\s*"flows"\s*:\s*\[[\s\S]*?\]\s*\}/);
  if (flowsMatch) {
    try {
      const parsed = JSON.parse(flowsMatch[0]);
      if (parsed?.flows && Array.isArray(parsed.flows)) return validateFlows(parsed.flows);
    } catch { /* try next strategy */ }
  }

  // Strategy 3: Try parsing entire text as JSON
  try {
    const parsed = JSON.parse(text.trim());
    if (parsed?.flows && Array.isArray(parsed.flows)) return validateFlows(parsed.flows);
  } catch { /* failed */ }

  return null;
}

function validateFlows(flows: unknown[]): UseCaseFlow[] | null {
  const valid: UseCaseFlow[] = [];

  for (const flow of flows) {
    const f = flow as Record<string, unknown>;
    if (!f.id || !f.name || !Array.isArray(f.nodes) || !Array.isArray(f.edges)) continue;
    if (f.nodes.length < 2) continue; // Need at least start + end

    // Basic node validation
    const nodes = (f.nodes as Record<string, unknown>[]).filter(n =>
      n.id && n.type && n.label &&
      ['start', 'end', 'action', 'decision', 'connector', 'event', 'error'].includes(n.type as string)
    );

    // Basic edge validation
    const nodeIds = new Set(nodes.map(n => n.id as string));
    const edges = (f.edges as Record<string, unknown>[]).filter(e =>
      e.id && e.source && e.target &&
      nodeIds.has(e.source as string) && nodeIds.has(e.target as string)
    );

    if (nodes.length >= 2 && edges.length >= 1) {
      valid.push({
        id: f.id as string,
        name: f.name as string,
        description: (f.description as string) || '',
        nodes: nodes.map(n => ({
          id: n.id as string,
          type: n.type as UseCaseFlow['nodes'][0]['type'],
          label: n.label as string,
          detail: n.detail as string | undefined,
          connector: n.connector as string | undefined,
        })),
        edges: edges.map(e => ({
          id: e.id as string,
          source: e.source as string,
          target: e.target as string,
          label: e.label as string | undefined,
          variant: (e.variant as UseCaseFlow['edges'][0]['variant']) || 'default',
        })),
      });
    }
  }

  return valid.length > 0 ? valid : null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Extract use case flows from a design result by spawning a Claude CLI call.
 * Returns null if extraction fails or no valid flows are found.
 */
export async function extractUseCaseFlows(
  designResult: DesignAnalysisResult,
  testCase: DesignTestCase,
): Promise<UseCaseFlow[] | null> {
  try {
    const prompt = buildFlowExtractionPrompt(designResult, testCase);
    const { text: rawOutput, exitCode } = await runFlowCli(prompt);

    if (exitCode !== 0) {
      console.error('[FlowExtractor] CLI exited with code', exitCode);
      return null;
    }

    const assistantText = extractAssistantText(rawOutput);
    return extractFlowsFromText(assistantText);
  } catch (err) {
    console.error('[FlowExtractor] Error:', err);
    return null;
  }
}
