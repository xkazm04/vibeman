/**
 * useHealthScanStream Hook
 *
 * Connects to SSE stream for real-time health scan output.
 * Uses shared useSSEStream for connection/parsing, adds domain-specific logic.
 */

import { useMemo } from 'react';
import { useGroupHealthStore } from '@/stores/groupHealthStore';
import { useSSEStream, type SSEStreamHandlers, type SSEEventData } from '@/hooks/useSSEStream';

interface UseHealthScanStreamOptions {
  groupId: string;
  streamUrl: string | null;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

function createMsg(type: 'system' | 'output' | 'error', content: string) {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    content,
    timestamp: Date.now(),
  };
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
  const {
    appendMessage,
    updateScanProgress,
    setScanStatus,
    setScanError,
  } = useGroupHealthStore();

  const handlers: SSEStreamHandlers = useMemo(() => ({
    onConnected: (data) => {
      setScanStatus(groupId, 'running');
      if (data.data?.model) {
        appendMessage(groupId, createMsg('system', `Connected to ${data.data.model as string}`));
      }
    },

    onMessage: (content) => {
      appendMessage(groupId, createMsg('output', content));
    },

    onToolUse: (toolName) => {
      appendMessage(groupId, createMsg('system', `Using tool: ${toolName}`));
    },

    onToolResult: (content) => {
      const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
      appendMessage(groupId, createMsg('output', preview));
    },

    onError: (errorMsg) => {
      setScanError(groupId, errorMsg);
      appendMessage(groupId, createMsg('error', errorMsg));
      onError?.(errorMsg);
    },

    onResult: () => {
      setScanStatus(groupId, 'completed');
      appendMessage(groupId, createMsg('system', 'Scan completed'));
      onComplete?.();
    },

    onUnhandled: (data: SSEEventData) => {
      switch (data.type) {
        case 'stdout': {
          const rawContent = (data.data?.raw as string) || '';
          if (rawContent.trim()) {
            appendMessage(groupId, createMsg('output', rawContent.trim()));
          }
          break;
        }
        case 'output':
          appendMessage(groupId, createMsg('output', (data as Record<string, unknown>).content as string || (data as Record<string, unknown>).text as string || ''));
          break;
        case 'progress':
          if (typeof (data as Record<string, unknown>).progress === 'number') {
            updateScanProgress(groupId, (data as Record<string, unknown>).progress as number);
          }
          break;
        case 'status':
          if ((data as Record<string, unknown>).status === 'running') {
            setScanStatus(groupId, 'running');
          }
          break;
        case 'complete':
          setScanStatus(groupId, 'completed');
          appendMessage(groupId, createMsg('system', 'Scan completed'));
          onComplete?.();
          break;
        case 'failed': {
          const failMsg = (data as Record<string, unknown>).error as string || (data as Record<string, unknown>).message as string || 'Scan failed';
          setScanError(groupId, failMsg);
          appendMessage(groupId, createMsg('error', failMsg));
          onError?.(failMsg);
          break;
        }
        default:
          console.debug('[HealthScan] Unhandled event type:', data.type, data);
      }
    },

    onConnectionError: () => {
      console.warn('[HealthScan] SSE connection error, closing...');
      const currentScan = useGroupHealthStore.getState().getActiveScan(groupId);
      if (currentScan && (currentScan.status === 'running' || currentScan.status === 'pending')) {
        const errorMsg = 'Connection to CLI lost - execution may have failed';
        setScanError(groupId, errorMsg);
        appendMessage(groupId, createMsg('error', errorMsg));
        onError?.(errorMsg);
      }
    },
  }), [groupId, appendMessage, updateScanProgress, setScanStatus, setScanError, onComplete, onError]);

  return useSSEStream({ streamUrl, handlers });
}
