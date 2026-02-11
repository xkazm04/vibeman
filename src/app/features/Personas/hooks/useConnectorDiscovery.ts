'use client';

import { useState, useRef, useCallback } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import * as api from '@/app/features/Personas/lib/personaApi';
import type { ConnectorDiscoveryResult } from '@/lib/personas/connectorDiscovery';

type DiscoveryPhase = 'idle' | 'discovering' | 'preview' | 'saving' | 'saved';

interface UseConnectorDiscoveryReturn {
  phase: DiscoveryPhase;
  outputLines: string[];
  result: ConnectorDiscoveryResult | null;
  error: string | null;
  startDiscovery: (serviceName: string, context?: string) => Promise<void>;
  saveConnector: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useConnectorDiscovery(): UseConnectorDiscoveryReturn {
  const [phase, setPhase] = useState<DiscoveryPhase>('idle');
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [result, setResult] = useState<ConnectorDiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const createConnectorDefinition = usePersonaStore((s) => s.createConnectorDefinition);
  const fetchConnectorDefinitions = usePersonaStore((s) => s.fetchConnectorDefinitions);

  const startDiscovery = useCallback(
    async (serviceName: string, context?: string) => {
      setPhase('discovering');
      setOutputLines([]);
      setResult(null);
      setError(null);

      try {
        const { discoveryId } = await api.startConnectorDiscovery(serviceName, context);

        const url = `/api/personas/connectors/discover/${discoveryId}/stream`;
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.line) {
              setOutputLines((prev) => [...prev, data.line]);
            }

            if (data.done) {
              eventSource.close();
              eventSourceRef.current = null;

              if (data.result) {
                setResult(data.result as ConnectorDiscoveryResult);
                setPhase('preview');
              } else if (data.error) {
                setError(data.error);
                setPhase('idle');
              } else {
                setError('Discovery completed without a result');
                setPhase('idle');
              }
            }
          } catch {
            // Skip unparseable events
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;
          if (!result) {
            setError('Connection to discovery stream lost');
            setPhase('idle');
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start discovery');
        setPhase('idle');
      }
    },
    [result]
  );

  const saveConnector = useCallback(async () => {
    if (!result) return;

    setPhase('saving');
    setError(null);

    try {
      await createConnectorDefinition({
        name: result.connector.name,
        label: result.connector.label,
        icon_url: result.connector.icon_url,
        color: result.connector.color,
        category: result.connector.category,
        fields: result.connector.fields,
        healthcheck_config: result.connector.healthcheck_config,
        services: result.connector.services,
        events: result.connector.events,
      });

      await fetchConnectorDefinitions();
      setPhase('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connector');
      setPhase('preview');
    }
  }, [result, createConnectorDefinition, fetchConnectorDefinitions]);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setPhase('idle');
    setOutputLines([]);
  }, []);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setPhase('idle');
    setOutputLines([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    phase,
    outputLines,
    result,
    error,
    startDiscovery,
    saveConnector,
    cancel,
    reset,
  };
}
