/**
 * useSSEStreamWithBackoff - SSE stream hook with exponential backoff reconnection
 *
 * For long-lived SSE connections (e.g. notification streams) that should
 * automatically reconnect on failure using exponential backoff with jitter.
 * Backoff resets on successful message receipt.
 *
 * Backoff schedule: 1s → 2s → 4s → 8s → 16s → 30s (capped), with ±25% jitter.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEStreamWithBackoffOptions {
  /** SSE endpoint URL. Pass null to disable. */
  url: string | null;
  /** Named event listeners (e.g. { notification: handler }). If not provided, uses onmessage. */
  eventListeners?: Record<string, (event: MessageEvent) => void>;
  /** Fallback handler for unnamed messages (onmessage). */
  onMessage?: (event: MessageEvent) => void;
  /** Initial backoff delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum backoff delay in ms (default: 30000) */
  maxDelay?: number;
}

/** Add jitter of ±25% to a delay value */
function withJitter(delay: number): number {
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

export function useSSEStreamWithBackoff({
  url,
  eventListeners,
  onMessage,
  initialDelay = 1000,
  maxDelay = 30000,
}: UseSSEStreamWithBackoffOptions) {
  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(initialDelay);
  const mountedRef = useRef(true);

  // Keep listeners in a ref so reconnects always use the latest callbacks
  const eventListenersRef = useRef(eventListeners);
  eventListenersRef.current = eventListeners;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback((streamUrl: string) => {
    if (!mountedRef.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus('connecting');
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setStatus('connected');
      // Reset backoff on successful connection
      backoffRef.current = initialDelay;
    };

    // Attach named event listeners
    const listeners = eventListenersRef.current;
    if (listeners) {
      for (const [eventName, handler] of Object.entries(listeners)) {
        es.addEventListener(eventName, (event) => {
          // Reset backoff on successful message receipt
          backoffRef.current = initialDelay;
          handler(event as MessageEvent);
        });
      }
    }

    // Attach generic onmessage handler
    if (onMessageRef.current) {
      es.onmessage = (event) => {
        backoffRef.current = initialDelay;
        onMessageRef.current?.(event);
      };
    }

    es.onerror = () => {
      if (!mountedRef.current) return;

      es.close();
      eventSourceRef.current = null;
      setStatus('disconnected');

      // Schedule reconnect with exponential backoff + jitter
      const delay = withJitter(backoffRef.current);
      backoffRef.current = Math.min(backoffRef.current * 2, maxDelay);

      clearRetryTimeout();
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect(streamUrl);
        }
      }, delay);
    };
  }, [initialDelay, maxDelay, clearRetryTimeout]);

  useEffect(() => {
    mountedRef.current = true;
    backoffRef.current = initialDelay;

    if (url) {
      connect(url);
    }

    return () => {
      mountedRef.current = false;
      clearRetryTimeout();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [url, connect, clearRetryTimeout, initialDelay]);

  return { status };
}
