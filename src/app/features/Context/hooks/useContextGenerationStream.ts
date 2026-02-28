/**
 * useContextGenerationStream
 *
 * Hook to connect to SSE stream for context generation updates.
 * Uses shared useSSEStream for connection/parsing, adds domain-specific logic.
 */

import { useRef, useMemo } from 'react';
import { useContextGenerationStore } from '@/stores/contextGenerationStore';
import { useSSEStream, type SSEStreamHandlers } from '@/hooks/useSSEStream';

interface UseContextGenerationStreamParams {
  streamUrl: string | null;
}

/** Summary data shape from context generation */
interface ContextGenerationSummary {
  groupsCreated: number;
  contextsCreated: number;
  relationshipsCreated: number;
  filesAnalyzed: number;
}

/**
 * Parse structured JSON summary from CLI output
 * Looks for: ```json:context-generation-summary { ... } ```
 */
function parseStructuredSummary(content: string): ContextGenerationSummary | null {
  const jsonBlockMatch = content.match(/```json:context-generation-summary\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1].trim());
      if (
        typeof parsed.groupsCreated === 'number' &&
        typeof parsed.contextsCreated === 'number' &&
        typeof parsed.relationshipsCreated === 'number' &&
        typeof parsed.filesAnalyzed === 'number'
      ) {
        return {
          groupsCreated: parsed.groupsCreated,
          contextsCreated: parsed.contextsCreated,
          relationshipsCreated: parsed.relationshipsCreated,
          filesAnalyzed: parsed.filesAnalyzed,
        };
      }
    } catch {
      // JSON parse failed, fall through
    }
  }
  return null;
}

function createMsg(type: 'system' | 'output' | 'error', content: string) {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    content,
    timestamp: Date.now(),
  };
}

export function useContextGenerationStream({ streamUrl }: UseContextGenerationStreamParams) {
  const { appendMessage, setStatus, setSummary, setError } = useContextGenerationStore();

  const summaryDataRef = useRef({
    groupsCreated: 0,
    contextsCreated: 0,
    relationshipsCreated: 0,
    filesAnalyzed: 0,
  });

  const handlers: SSEStreamHandlers = useMemo(() => ({
    onConnected: (data) => {
      const model = (data.data?.model as string) || 'Claude';
      appendMessage(createMsg('system', `Connected to ${model}`));
    },

    onMessage: (content) => {
      appendMessage(createMsg('output', content));

      const structuredSummary = parseStructuredSummary(content);
      if (structuredSummary) {
        summaryDataRef.current = structuredSummary;
      }
    },

    onToolUse: (toolName) => {
      appendMessage(createMsg('system', `Using tool: ${toolName}`));
    },

    onToolResult: (content) => {
      const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
      appendMessage(createMsg('output', preview));
    },

    onError: (errorMsg) => {
      appendMessage(createMsg('error', errorMsg));
      setError(errorMsg);
      setStatus('failed');
    },

    onResult: () => {
      appendMessage(createMsg('system', 'Context generation completed'));
      setSummary(summaryDataRef.current);
      setStatus('completed');

      // Deferred cleanup: delete old data now that new data has been created
      const scan = useContextGenerationStore.getState().activeScan;
      if (scan?.previousDataIds) {
        fetch('/api/context-generation/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: scan.projectId,
            previousDataIds: scan.previousDataIds,
          }),
        }).catch(err => console.error('[ContextGeneration] Deferred cleanup failed:', err));
      }
    },

    onConnectionError: () => {
      console.error('[ContextGenerationStream] EventSource error');
    },
  }), [appendMessage, setStatus, setSummary, setError]);

  useSSEStream({ streamUrl, handlers });
}

export default useContextGenerationStream;
