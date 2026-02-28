/**
 * useSSEStream - Shared SSE event stream hook
 *
 * Manages EventSource lifecycle and parses standard SSE event types
 * (connected, message, tool_use, tool_result, error, result, heartbeat).
 * Consumers provide domain-specific handlers via callbacks.
 */

import { useEffect, useRef, useCallback } from 'react';

/** Parsed SSE event data passed to handlers */
export interface SSEEventData {
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Handlers that consumers provide to react to SSE events */
export interface SSEStreamHandlers {
  onConnected?: (data: SSEEventData) => void;
  onMessage?: (content: string, data: SSEEventData) => void;
  onToolUse?: (toolName: string, data: SSEEventData) => void;
  onToolResult?: (content: string, data: SSEEventData) => void;
  onError?: (error: string, data: SSEEventData) => void;
  onResult?: (data: SSEEventData) => void;
  /** Catch-all for event types not covered above (e.g. stdout, progress, status) */
  onUnhandled?: (data: SSEEventData) => void;
  /** Called when the EventSource connection itself errors out */
  onConnectionError?: () => void;
}

interface UseSSEStreamOptions {
  streamUrl: string | null;
  handlers: SSEStreamHandlers;
}

export function useSSEStream({ streamUrl, handlers }: UseSSEStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: SSEEventData = JSON.parse(event.data);
      const h = handlersRef.current;

      switch (data.type) {
        case 'connected':
          h.onConnected?.(data);
          break;

        case 'message': {
          const content = (data.data?.content as string) || '';
          if (content) {
            h.onMessage?.(content, data);
          }
          break;
        }

        case 'tool_use': {
          const toolName = (data.data?.toolName as string) || 'unknown';
          h.onToolUse?.(toolName, data);
          break;
        }

        case 'tool_result': {
          const rawContent = data.data?.content;
          const resultContent = typeof rawContent === 'string'
            ? rawContent
            : Array.isArray(rawContent)
              ? rawContent.map((b: { text?: string }) => b.text || '').join('\n')
              : String(rawContent || '');
          if (resultContent.length > 0) {
            h.onToolResult?.(resultContent, data);
          }
          break;
        }

        case 'error': {
          const errorMsg = (data.data?.error as string) || (data.data?.message as string) || 'Unknown error';
          h.onError?.(errorMsg, data);
          break;
        }

        case 'result':
          h.onResult?.(data);
          break;

        case 'heartbeat':
          break;

        default:
          h.onUnhandled?.(data);
          break;
      }
    } catch {
      // Plain text fallback — treat as message content
      if (event.data && typeof event.data === 'string') {
        handlersRef.current.onMessage?.(event.data, { type: 'message' });
      }
    }
  }, []);

  const handleError = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    handlersRef.current.onConnectionError?.();
  }, []);

  useEffect(() => {
    if (!streamUrl) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = handleMessage;
    eventSource.onerror = handleError;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [streamUrl, handleMessage, handleError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return {
    isConnected: !!eventSourceRef.current,
    disconnect,
  };
}
