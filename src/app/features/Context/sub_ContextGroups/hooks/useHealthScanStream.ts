/**
 * useHealthScanStream Hook
 *
 * Connects to SSE stream for real-time health scan output.
 * Handles connection management, message parsing, and automatic reconnection.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useGroupHealthStore, type TerminalMessage } from '@/stores/groupHealthStore';
import type { HealthScanSummary } from '@/app/db/models/group-health.types';

interface UseHealthScanStreamOptions {
  groupId: string;
  streamUrl: string | null;
  onComplete?: (summary: HealthScanSummary) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to connect to SSE stream for health scan output
 */
export function useHealthScanStream({
  groupId,
  streamUrl,
  onComplete,
  onError,
}: UseHealthScanStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const {
    appendMessage,
    updateScanProgress,
    setScanStatus,
    setScanSummary,
    setScanError,
  } = useGroupHealthStore();

  // Create a terminal message
  const createMessage = useCallback((
    type: TerminalMessage['type'],
    content: string
  ): TerminalMessage => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    content,
    timestamp: Date.now(),
  }), []);

  // Handle incoming SSE messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          // CLI initialized
          setScanStatus(groupId, 'running');
          if (data.data?.model) {
            appendMessage(groupId, createMessage('system', `Connected to ${data.data.model}`));
          }
          break;

        case 'message':
          // Assistant message from CLI
          const content = data.data?.content || '';
          if (content) {
            appendMessage(groupId, createMessage('output', content));
          }
          break;

        case 'tool_use':
          // Tool being used by CLI
          const toolName = data.data?.toolName || 'unknown';
          appendMessage(groupId, createMessage('system', `Using tool: ${toolName}`));
          break;

        case 'tool_result':
          // Tool result (skip verbose output, just show truncated version)
          const resultContent = data.data?.content || '';
          if (resultContent && resultContent.length > 0) {
            const preview = resultContent.length > 100
              ? resultContent.substring(0, 100) + '...'
              : resultContent;
            appendMessage(groupId, createMessage('output', preview));
          }
          break;

        case 'error':
          // Error from CLI
          const errorMsg = data.data?.error || data.data?.message || 'Unknown error';
          setScanError(groupId, errorMsg);
          appendMessage(groupId, createMessage('error', errorMsg));
          onError?.(errorMsg);
          break;

        case 'result':
          // Scan completed
          setScanStatus(groupId, 'completed');
          appendMessage(groupId, createMessage('system', 'Scan completed'));
          // Note: Summary parsing would need to be done separately by parsing CLI output
          break;

        case 'heartbeat':
          // Ignore heartbeats
          break;

        case 'stdout':
          // Raw stdout output
          const rawContent = data.data?.raw || '';
          if (rawContent && rawContent.trim()) {
            appendMessage(groupId, createMessage('output', rawContent.trim()));
          }
          break;

        case 'output':
          // Fallback for output type (legacy)
          appendMessage(groupId, createMessage('output', data.content || data.text || ''));
          break;

        case 'progress':
          // Progress update
          if (typeof data.progress === 'number') {
            updateScanProgress(groupId, data.progress);
          }
          break;

        case 'status':
          // Status change
          if (data.status === 'running') {
            setScanStatus(groupId, 'running');
          }
          break;

        case 'complete':
        case 'failed':
          // Handle legacy event types
          if (data.type === 'failed') {
            const failMsg = data.error || data.message || 'Scan failed';
            setScanError(groupId, failMsg);
            appendMessage(groupId, createMessage('error', failMsg));
            onError?.(failMsg);
          } else {
            setScanStatus(groupId, 'completed');
            appendMessage(groupId, createMessage('system', 'Scan completed'));
          }
          break;

        default:
          // Log unhandled message types for debugging
          console.debug('[HealthScan] Unhandled event type:', data.type, data);
      }
    } catch (e) {
      console.warn('[HealthScan] Failed to parse SSE message:', e);
    }
  }, [groupId, appendMessage, createMessage, updateScanProgress, setScanStatus, setScanSummary, setScanError, onComplete, onError]);

  // Handle SSE connection error
  const handleError = useCallback((event: Event) => {
    console.warn('[HealthScan] SSE connection error, closing...');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Check if scan is still in running/pending state - if so, mark as failed
    const currentScan = useGroupHealthStore.getState().getActiveScan(groupId);
    if (currentScan && (currentScan.status === 'running' || currentScan.status === 'pending')) {
      const errorMsg = 'Connection to CLI lost - execution may have failed';
      setScanError(groupId, errorMsg);
      appendMessage(groupId, createMessage('error', errorMsg));
      onError?.(errorMsg);
    }
  }, [groupId, setScanError, appendMessage, createMessage, onError]);

  // Connect to SSE stream
  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new connection
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = handleMessage;
    eventSource.onerror = handleError;

    // Cleanup on unmount or streamUrl change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [streamUrl, handleMessage, handleError]);

  // Manual disconnect function
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
