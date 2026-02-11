'use client';

import { useRef, useCallback, useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import type { ActiveDesignSession } from '@/stores/personaStore';
import * as api from '@/app/features/Personas/lib/personaApi';
import type { DesignAnalysisResult, DesignPhase } from '@/app/features/Personas/lib/designTypes';

interface UseDesignAnalysisReturn {
  phase: DesignPhase;
  outputLines: string[];
  result: DesignAnalysisResult | null;
  error: string | null;
  currentDesignId: string | null;
  startAnalysis: (personaId: string, instruction: string) => Promise<void>;
  cancelAnalysis: () => void;
  refineAnalysis: (personaId: string, designId: string, followUpMessage: string) => Promise<void>;
  applyResult: (
    personaId: string,
    selectedTools: string[],
    selectedTriggerIndices: number[],
    selectedChannelIndices?: number[],
    selectedSubscriptionIndices?: number[]
  ) => Promise<void>;
  reset: () => void;
}

// Connectors that use the built-in Google OAuth flow
const GOOGLE_OAUTH_NAMES = new Set(['gmail', 'google_calendar', 'google_drive']);

/** Ensure oauth_type is set on Google connectors (CLI may not include it yet) */
function patchOAuthType(r: DesignAnalysisResult): DesignAnalysisResult {
  r.suggested_connectors?.forEach((c) => {
    if (!c.oauth_type && GOOGLE_OAUTH_NAMES.has(c.name)) {
      c.oauth_type = 'google';
    }
  });
  return r;
}

export function useDesignAnalysis(): UseDesignAnalysisReturn {
  // ── Store-backed session state ──────────────────────────────────
  const activeDesignSession = usePersonaStore((s) => s.activeDesignSession);
  const setActiveDesignSession = usePersonaStore((s) => s.setActiveDesignSession);
  const appendDesignOutputLine = usePersonaStore((s) => s.appendDesignOutputLine);
  const setDesignPhase = usePersonaStore((s) => s.setDesignPhase);
  const updatePersona = usePersonaStore((s) => s.updatePersona);
  const assignTool = usePersonaStore((s) => s.assignTool);
  const createTrigger = usePersonaStore((s) => s.createTrigger);
  const fetchDetail = usePersonaStore((s) => s.fetchDetail);
  const selectedPersonaId = usePersonaStore((s) => s.selectedPersonaId);

  // ── Local refs (EventSource doesn't need store persistence) ────
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectedRef = useRef(false);

  // ── Derived values from session ────────────────────────────────
  const phase: DesignPhase = activeDesignSession?.personaId === selectedPersonaId
    ? (activeDesignSession?.phase ?? 'idle')
    : 'idle';
  const outputLines = activeDesignSession?.personaId === selectedPersonaId
    ? (activeDesignSession?.outputLines ?? [])
    : [];
  const result = activeDesignSession?.personaId === selectedPersonaId
    ? (activeDesignSession?.result ?? null)
    : null;
  const error = activeDesignSession?.personaId === selectedPersonaId
    ? (activeDesignSession?.error ?? null)
    : null;
  const currentDesignId = activeDesignSession?.personaId === selectedPersonaId
    ? (activeDesignSession?.designId ?? null)
    : null;

  // ── Helper: update session in store ────────────────────────────
  const updateSession = useCallback((patch: Partial<ActiveDesignSession>) => {
    const current = usePersonaStore.getState().activeDesignSession;
    if (!current) return;
    setActiveDesignSession({ ...current, ...patch });
  }, [setActiveDesignSession]);

  const setPhase = useCallback(
    (p: DesignPhase) => {
      updateSession({ phase: p });
      setDesignPhase(p);
    },
    [updateSession, setDesignPhase]
  );

  // ── SSE connection ─────────────────────────────────────────────
  const connectToStream = useCallback(
    (designId: string, onDone: (data: { result?: DesignAnalysisResult; error?: string }) => void, replaceLines = false) => {
      const url = `/api/personas/design/${designId}/stream`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      if (replaceLines) {
        // On reconnect, we'll replace outputLines with fresh data from backend buffer
        updateSession({ outputLines: [] });
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.line) {
            appendDesignOutputLine(data.line);
          }

          if (data.done) {
            eventSource.close();
            eventSourceRef.current = null;
            onDone({ result: data.result, error: data.error });
          }
        } catch {
          // Skip unparseable events
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        onDone({ error: 'Connection to design analysis lost' });
      };
    },
    [appendDesignOutputLine, updateSession]
  );

  // ── SSE reconnection on mount ──────────────────────────────────
  useEffect(() => {
    // Only reconnect if we have an active session for the current persona in an active streaming phase
    if (!activeDesignSession) return;
    if (activeDesignSession.personaId !== selectedPersonaId) return;
    if (activeDesignSession.phase !== 'analyzing' && activeDesignSession.phase !== 'refining') return;
    // Don't reconnect if we already have an EventSource open
    if (eventSourceRef.current) return;
    // Prevent double-reconnect in StrictMode
    if (reconnectedRef.current) return;
    reconnectedRef.current = true;

    const designId = activeDesignSession.designId;
    const wasRefining = activeDesignSession.phase === 'refining';

    connectToStream(designId, (data) => {
      if (data.result) {
        const patched = patchOAuthType(data.result as DesignAnalysisResult);
        updateSession({ result: patched, phase: 'preview' });
        setDesignPhase('preview');
      } else if (data.error) {
        const fallbackPhase = wasRefining ? 'preview' : 'idle';
        updateSession({ error: data.error, phase: fallbackPhase });
        setDesignPhase(fallbackPhase);
      } else {
        const fallbackPhase = wasRefining ? 'preview' : 'idle';
        updateSession({ error: 'Design analysis completed without a result', phase: fallbackPhase });
        setDesignPhase(fallbackPhase);
      }
    }, true); // replaceLines=true on reconnect

    return () => {
      reconnectedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonaId, activeDesignSession?.phase, activeDesignSession?.personaId]);

  // ── Actions ────────────────────────────────────────────────────

  const startAnalysis = useCallback(
    async (personaId: string, instruction: string) => {
      const newSession: ActiveDesignSession = {
        personaId,
        designId: '',
        phase: 'analyzing',
        outputLines: [],
        result: null,
        error: null,
      };
      setActiveDesignSession(newSession);
      setDesignPhase('analyzing');

      try {
        const { designId } = await api.startDesignAnalysis(personaId, instruction);
        setActiveDesignSession({ ...newSession, designId });

        connectToStream(designId, (data) => {
          if (data.result) {
            const patched = patchOAuthType(data.result as DesignAnalysisResult);
            updateSession({ result: patched, phase: 'preview', designId });
            setDesignPhase('preview');
          } else if (data.error) {
            updateSession({ error: data.error, phase: 'idle' });
            setDesignPhase('idle');
          } else {
            updateSession({ error: 'Design analysis completed without a result', phase: 'idle' });
            setDesignPhase('idle');
          }
        });
      } catch (err) {
        updateSession({
          error: err instanceof Error ? err.message : 'Failed to start design analysis',
          phase: 'idle',
        });
        setDesignPhase('idle');
      }
    },
    [setActiveDesignSession, setDesignPhase, connectToStream, updateSession]
  );

  const refineAnalysis = useCallback(
    async (personaId: string, designId: string, followUpMessage: string) => {
      updateSession({ phase: 'refining', outputLines: [], error: null });
      setDesignPhase('refining');

      try {
        await api.refineDesignAnalysis(personaId, designId, followUpMessage);

        connectToStream(designId, (data) => {
          if (data.result) {
            const patched = patchOAuthType(data.result as DesignAnalysisResult);
            updateSession({ result: patched, phase: 'preview' });
            setDesignPhase('preview');
          } else if (data.error) {
            updateSession({ error: data.error, phase: 'preview' });
            setDesignPhase('preview');
          } else {
            updateSession({ error: 'Refinement completed without a result', phase: 'preview' });
            setDesignPhase('preview');
          }
        });
      } catch (err) {
        updateSession({
          error: err instanceof Error ? err.message : 'Failed to start refinement',
          phase: 'preview',
        });
        setDesignPhase('preview');
      }
    },
    [setDesignPhase, connectToStream, updateSession]
  );

  const cancelAnalysis = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setActiveDesignSession(null);
    setDesignPhase('idle');
  }, [setActiveDesignSession, setDesignPhase]);

  const applyResult = useCallback(
    async (
      personaId: string,
      selectedTools: string[],
      selectedTriggerIndices: number[],
      selectedChannelIndices?: number[],
      selectedSubscriptionIndices?: number[]
    ) => {
      const currentResult = usePersonaStore.getState().activeDesignSession?.result;
      if (!currentResult) return;

      updateSession({ phase: 'applying' });
      setDesignPhase('applying');

      try {
        // 1. Update persona with the structured prompt + save design result
        const jsonStr = JSON.stringify(currentResult.structured_prompt);
        await updatePersona(personaId, {
          structured_prompt: jsonStr,
          system_prompt: currentResult.structured_prompt.instructions,
          last_design_result: JSON.stringify(currentResult),
        });

        // 2. Assign selected tools (skip already assigned)
        for (const toolName of selectedTools) {
          try {
            await assignTool(personaId, toolName);
          } catch {
            // Tool assignment may fail if already assigned or not found — continue
          }
        }

        // 3. Create selected triggers
        for (const idx of selectedTriggerIndices) {
          const trigger = currentResult.suggested_triggers[idx];
          if (trigger) {
            try {
              await createTrigger(personaId, {
                trigger_type: trigger.trigger_type,
                config: trigger.config,
                enabled: true,
              });
            } catch {
              // Trigger creation may fail — continue
            }
          }
        }

        // 3.5 Apply notification channels (if suggested and not already configured)
        if (currentResult.suggested_notification_channels?.length && selectedChannelIndices?.length) {
          try {
            const channelRes = await fetch(`/api/personas/${personaId}/notification-channels`);
            const channelData = await channelRes.json();
            const existingChannels = channelData.channels || [];
            const existingTypes = new Set(existingChannels.map((c: { type: string }) => c.type));
            const newChannels = [...existingChannels];

            for (const idx of selectedChannelIndices) {
              const suggested = currentResult.suggested_notification_channels[idx];
              if (suggested && !existingTypes.has(suggested.type)) {
                newChannels.push({
                  id: `nc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  type: suggested.type,
                  config: suggested.config_hints || {},
                  enabled: true,
                });
              }
            }

            await fetch(`/api/personas/${personaId}/notification-channels`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channels: newChannels }),
            });
          } catch { /* continue */ }
        }

        // 3.7 Apply event subscriptions (if suggested)
        if (currentResult.suggested_event_subscriptions?.length && selectedSubscriptionIndices?.length) {
          for (const idx of selectedSubscriptionIndices) {
            const sub = currentResult.suggested_event_subscriptions[idx];
            if (sub) {
              try {
                await api.createEventSubscription({
                  persona_id: personaId,
                  event_type: sub.event_type,
                  source_filter: sub.source_filter,
                });
              } catch { /* continue */ }
            }
          }
        }

        // 4. Refresh persona detail to pick up all changes
        await fetchDetail(personaId);

        updateSession({ phase: 'applied' });
        setDesignPhase('applied');
      } catch (err) {
        updateSession({
          error: err instanceof Error ? err.message : 'Failed to apply design result',
          phase: 'preview',
        });
        setDesignPhase('preview');
      }
    },
    [updateSession, setDesignPhase, updatePersona, assignTool, createTrigger, fetchDetail]
  );

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setActiveDesignSession(null);
    setDesignPhase('idle');
  }, [setActiveDesignSession, setDesignPhase]);

  return {
    phase,
    outputLines,
    result,
    error,
    currentDesignId,
    startAnalysis,
    cancelAnalysis,
    refineAnalysis,
    applyResult,
    reset,
  };
}
