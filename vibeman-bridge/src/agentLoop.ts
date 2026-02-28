/**
 * Agentic Loop for Vibeman Bridge
 *
 * Uses vscode.lm API to select Copilot-provided models, then runs
 * an iterative tool-calling loop. Emits BridgeEvents for SSE streaming.
 */

import * as vscode from 'vscode';
import { getToolDefinitions, executeTool } from './tools';
import type { BridgeEvent } from './types';

export interface AgentLoopOptions {
  executionId: string;
  projectPath: string;
  prompt: string;
  modelId: string;
  cancelToken: { cancelled: boolean };
  emit: (event: BridgeEvent) => void;
}

const SYSTEM_INSTRUCTIONS = `You are a skilled coding assistant working on a project.
Project root: {projectPath}

You have access to these tools:
- read_file: Read file contents (always read before editing)
- write_file: Create or overwrite a file entirely
- edit_file: Replace an exact string in a file (preferred for edits)
- run_command: Execute shell commands (tests, builds, git, etc.)
- list_files: Find files by glob pattern
- search_files: Search for text/regex across files

Rules:
- Always use absolute paths or paths relative to the project root.
- Read a file before editing it.
- Prefer edit_file over write_file for existing files.
- After making changes, verify them (read the file or run tests).
- Think step by step and explain your reasoning.
- When the task is complete, summarize what you did.`;

export async function runAgentLoop(options: AgentLoopOptions): Promise<void> {
  const { executionId, projectPath, prompt, modelId, cancelToken, emit } = options;

  const config = vscode.workspace.getConfiguration('vibeman-bridge');
  const maxIterations = config.get<number>('maxIterations', 30);

  // 1. Select model
  const allModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });

  if (allModels.length === 0) {
    emit({ type: 'error', data: { error: 'No Copilot models available. Ensure GitHub Copilot is signed in.' }, timestamp: Date.now() });
    return;
  }

  // Find requested model by ID, name, or family — fall back to first available
  const model = modelId
    ? allModels.find(m =>
        m.id === modelId ||
        m.name.toLowerCase().includes(modelId.toLowerCase()) ||
        m.family.toLowerCase().includes(modelId.toLowerCase())
      ) || allModels[0]
    : allModels[0];

  emit({
    type: 'message',
    data: { type: 'assistant', content: `Using model: ${model.name} (${model.family})` },
    timestamp: Date.now(),
  });

  // 2. Build tool definitions for vscode.lm
  const toolDefs = getToolDefinitions();
  const vscodeTools: vscode.LanguageModelChatTool[] = toolDefs.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));

  // 3. Build initial messages
  const systemMsg = SYSTEM_INSTRUCTIONS.replace('{projectPath}', projectPath);
  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.User(systemMsg),
    vscode.LanguageModelChatMessage.User(prompt),
  ];

  // 4. Agentic loop
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (cancelToken.cancelled) {
      emit({ type: 'error', data: { error: 'Cancelled' }, timestamp: Date.now() });
      return;
    }

    // Send request to model
    const tokenSource = new vscode.CancellationTokenSource();
    let response: vscode.LanguageModelChatResponse;

    try {
      response = await model.sendRequest(messages, { tools: vscodeTools }, tokenSource.token);
    } catch (err) {
      const errorMsg = err instanceof vscode.LanguageModelError
        ? `Model error (${err.code}): ${err.message}`
        : err instanceof Error ? err.message : 'Unknown model error';
      emit({ type: 'error', data: { error: errorMsg }, timestamp: Date.now() });
      return;
    }

    // Stream response — collect text and tool calls
    let textContent = '';
    const toolCalls: { callId: string; name: string; input: Record<string, unknown> }[] = [];

    try {
      for await (const part of response.stream) {
        if (cancelToken.cancelled) {
          tokenSource.cancel();
          emit({ type: 'error', data: { error: 'Cancelled' }, timestamp: Date.now() });
          return;
        }

        if (part instanceof vscode.LanguageModelTextPart) {
          textContent += part.value;
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCalls.push({
            callId: part.callId,
            name: part.name,
            input: part.input as Record<string, unknown>,
          });
        }
      }
    } catch (err) {
      // Stream may error on cancellation or network issues
      if (!cancelToken.cancelled) {
        emit({
          type: 'error',
          data: { error: err instanceof Error ? err.message : 'Stream error' },
          timestamp: Date.now(),
        });
      }
      return;
    }

    // Emit assistant text if any
    if (textContent.trim()) {
      emit({
        type: 'message',
        data: { type: 'assistant', content: textContent },
        timestamp: Date.now(),
      });
    }

    // Build assistant message for conversation history
    const assistantParts: (vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart)[] = [];
    if (textContent) {
      assistantParts.push(new vscode.LanguageModelTextPart(textContent));
    }
    for (const tc of toolCalls) {
      assistantParts.push(new vscode.LanguageModelToolCallPart(tc.callId, tc.name, tc.input));
    }
    messages.push(vscode.LanguageModelChatMessage.Assistant(assistantParts));

    // If no tool calls, task is complete
    if (toolCalls.length === 0) {
      break;
    }

    // Execute each tool call
    const toolResultParts: vscode.LanguageModelToolResultPart[] = [];

    for (const tc of toolCalls) {
      if (cancelToken.cancelled) {
        emit({ type: 'error', data: { error: 'Cancelled' }, timestamp: Date.now() });
        return;
      }

      // Emit tool_use event
      emit({
        type: 'tool_use',
        data: { toolUseId: tc.callId, toolName: tc.name, toolInput: tc.input },
        timestamp: Date.now(),
      });

      // Execute the tool
      const result = await executeTool(tc.name, tc.input, projectPath);

      // Truncate very long results for the event (full result goes to model)
      const displayContent = result.output.length > 500
        ? result.output.slice(0, 500) + '... (truncated)'
        : result.output;

      // Emit tool_result event
      emit({
        type: 'tool_result',
        data: { toolUseId: tc.callId, content: displayContent },
        timestamp: Date.now(),
      });

      toolResultParts.push(
        new vscode.LanguageModelToolResultPart(tc.callId, [result.output])
      );
    }

    // Add tool results as User message (vscode.lm convention)
    messages.push(vscode.LanguageModelChatMessage.User(toolResultParts));
  }

  // 5. Emit result event
  emit({
    type: 'result',
    data: {
      sessionId: executionId,
      isError: false,
    },
    timestamp: Date.now(),
  });
}
