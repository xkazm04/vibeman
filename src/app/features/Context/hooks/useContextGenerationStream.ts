/**
 * useContextGenerationStream
 *
 * Hook to connect to SSE stream for context generation updates.
 * Parses CLI output and updates store state.
 */

import { useEffect, useRef } from 'react';
import { useContextGenerationStore, type TerminalMessage } from '@/stores/contextGenerationStore';

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
  // Look for the specific JSON block format
  const jsonBlockMatch = content.match(/```json:context-generation-summary\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1].trim());
      // Validate expected fields exist and are numbers
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

export function useContextGenerationStream({ streamUrl }: UseContextGenerationStreamParams) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { appendMessage, setStatus, setSummary, setError } = useContextGenerationStore();

  // Track accumulated summary data
  const summaryDataRef = useRef({
    groupsCreated: 0,
    contextsCreated: 0,
    relationshipsCreated: 0,
    filesAnalyzed: 0,
  });

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    // Don't reconnect if already connected to same URL
    if (eventSourceRef.current) {
      return;
    }

    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      appendMessage({
        id: `msg-${Date.now()}`,
        type: 'system',
        content: 'Connected to CLI stream',
        timestamp: Date.now(),
      });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different event types from SSE stream
        // SSE stream sends: connected, message, tool_use, tool_result, result, error, heartbeat
        if (data.type === 'connected') {
          // CLI initialized
          const model = data.data?.model || 'Claude';
          appendMessage({
            id: `msg-${Date.now()}`,
            type: 'system',
            content: `Connected to ${model}`,
            timestamp: Date.now(),
          });
        } else if (data.type === 'message') {
          // Assistant text content
          const content = data.data?.content || '';
          if (content) {
            const message: TerminalMessage = {
              id: `msg-${Date.now()}-${Math.random()}`,
              type: 'output',
              content,
              timestamp: Date.now(),
            };
            appendMessage(message);

            // Try to extract structured JSON summary from output
            const structuredSummary = parseStructuredSummary(content);
            if (structuredSummary) {
              // Replace entire summary with structured data (single source of truth)
              summaryDataRef.current = structuredSummary;
            }
          }
        } else if (data.type === 'tool_use') {
          // Tool being used by CLI
          const toolName = data.data?.toolName || 'unknown';
          appendMessage({
            id: `msg-${Date.now()}`,
            type: 'system',
            content: `Using tool: ${toolName}`,
            timestamp: Date.now(),
          });
        } else if (data.type === 'tool_result') {
          // Tool result - show truncated preview
          // Defensive: content may arrive as object/array if normalization was bypassed
          const rawContent = data.data?.content;
          const resultContent = typeof rawContent === 'string'
            ? rawContent
            : Array.isArray(rawContent)
              ? rawContent.map((b: { text?: string }) => b.text || '').join('\n')
              : String(rawContent || '');
          if (resultContent && resultContent.length > 0) {
            const preview = resultContent.length > 100
              ? resultContent.substring(0, 100) + '...'
              : resultContent;
            appendMessage({
              id: `msg-${Date.now()}`,
              type: 'output',
              content: preview,
              timestamp: Date.now(),
            });
          }
        } else if (data.type === 'error') {
          const errorMsg = data.data?.error || data.data?.message || 'Unknown error';
          appendMessage({
            id: `msg-${Date.now()}`,
            type: 'error',
            content: errorMsg,
            timestamp: Date.now(),
          });
          setError(errorMsg);
          setStatus('failed');
          eventSource.close();
          eventSourceRef.current = null;
        } else if (data.type === 'result') {
          // CLI execution completed
          appendMessage({
            id: `msg-${Date.now()}`,
            type: 'system',
            content: 'Context generation completed',
            timestamp: Date.now(),
          });

          // Set summary with accumulated data
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

          // Close connection
          eventSource.close();
          eventSourceRef.current = null;
        } else if (data.type === 'heartbeat') {
          // Ignore heartbeats
        }
      } catch (parseError) {
        // Handle plain text messages
        if (event.data && typeof event.data === 'string') {
          appendMessage({
            id: `msg-${Date.now()}`,
            type: 'output',
            content: event.data,
            timestamp: Date.now(),
          });
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('[ContextGenerationStream] EventSource error:', error);
      // Only clean up - completion is handled by the result event handler
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [streamUrl, appendMessage, setStatus, setSummary, setError]);
}

export default useContextGenerationStream;
