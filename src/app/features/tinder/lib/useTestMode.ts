/**
 * Test mode hooks for Tinder feature testing harness
 *
 * Provides React hooks for managing test mode state, mock data,
 * and replay functionality in development environments.
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DbIdea } from '@/app/db';
import {
  TestModeState,
  TestScenarioId,
  ReplaySession,
  SwipeAction,
  MockIdea,
  TEST_SCENARIOS,
  initializeTestMode,
  createReplaySession,
  recordAction,
  saveReplaySession,
  getReplaySessions,
  getReplaySession,
  deleteReplaySession,
  clearReplaySessions,
  buildTestModeUrl,
  getScenarioList,
} from './testScenarios';
import { TinderStats } from './tinderHooks';

// ===== Types =====

export interface UseTestModeResult {
  isTestMode: boolean;
  scenarioId: TestScenarioId;
  scenarioName: string;
  scenarioDescription: string;
  totalIdeas: number;
  replaySession: ReplaySession | null;
  isReplaying: boolean;
  replayProgress: number;
  scenarios: ReturnType<typeof getScenarioList>;
  savedSessions: ReplaySession[];

  // Actions
  changeScenario: (scenarioId: TestScenarioId) => void;
  startReplay: (sessionId: string) => void;
  stopReplay: () => void;
  stepReplay: () => SwipeAction | null;
  autoReplay: (intervalMs?: number) => void;
  pauseAutoReplay: () => void;
  deleteSavedSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  exitTestMode: () => void;
}

export interface UseTestModeIdeasResult {
  ideas: DbIdea[];
  currentIndex: number;
  loading: boolean;
  processing: boolean;
  hasMore: boolean;
  total: number;
  stats: TinderStats;
  remainingCount: number;
  currentIdea: DbIdea | undefined;
  handleAccept: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleDelete: () => Promise<void>;
  resetStats: () => void;
  loadIdeas: () => Promise<void>;
}

// ===== Main Test Mode Hook =====

export function useTestMode(): UseTestModeResult {
  const [testState, setTestState] = useState<TestModeState | null>(null);
  const [savedSessions, setSavedSessions] = useState<ReplaySession[]>([]);
  const autoReplayRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize test mode on mount
  useEffect(() => {
    const state = initializeTestMode();
    setTestState(state);
    setSavedSessions(getReplaySessions());
  }, []);

  const isTestMode = testState?.enabled ?? false;
  const scenarioId = testState?.scenarioId ?? 'default';
  const scenario = testState?.scenario ?? TEST_SCENARIOS.default;

  const changeScenario = useCallback((newScenarioId: TestScenarioId) => {
    if (!isTestMode) return;

    const newScenario = TEST_SCENARIOS[newScenarioId];
    const newIdeas = newScenario.generateIdeas();

    setTestState(prev => prev ? {
      ...prev,
      scenarioId: newScenarioId,
      scenario: newScenario,
      ideas: newIdeas,
      replaySession: createReplaySession(newScenarioId),
      isReplaying: false,
      replayIndex: 0,
      viewStartTime: Date.now(),
    } : null);

    // Update URL without reload
    const url = buildTestModeUrl(newScenarioId);
    window.history.replaceState({}, '', url);
  }, [isTestMode]);

  const startReplay = useCallback((sessionId: string) => {
    const session = getReplaySession(sessionId);
    if (!session) return;

    const replayScenario = TEST_SCENARIOS[session.scenarioId];

    setTestState(prev => prev ? {
      ...prev,
      scenarioId: session.scenarioId,
      scenario: replayScenario,
      ideas: replayScenario.generateIdeas(),
      replaySession: session,
      isReplaying: true,
      replayIndex: 0,
      viewStartTime: Date.now(),
    } : null);

    const url = buildTestModeUrl(session.scenarioId, sessionId);
    window.history.replaceState({}, '', url);
  }, []);

  const stopReplay = useCallback(() => {
    if (autoReplayRef.current) {
      clearInterval(autoReplayRef.current);
      autoReplayRef.current = null;
    }

    setTestState(prev => prev ? {
      ...prev,
      isReplaying: false,
      replayIndex: 0,
      replaySession: createReplaySession(prev.scenarioId),
    } : null);

    const url = buildTestModeUrl(testState?.scenarioId ?? 'default');
    window.history.replaceState({}, '', url);
  }, [testState?.scenarioId]);

  const stepReplay = useCallback((): SwipeAction | null => {
    if (!testState?.isReplaying || !testState.replaySession) return null;

    const { actions } = testState.replaySession;
    const currentIndex = testState.replayIndex;

    if (currentIndex >= actions.length) {
      stopReplay();
      return null;
    }

    const action = actions[currentIndex];

    setTestState(prev => prev ? {
      ...prev,
      replayIndex: currentIndex + 1,
    } : null);

    return action;
  }, [testState, stopReplay]);

  const autoReplay = useCallback((intervalMs: number = 1000) => {
    if (autoReplayRef.current) {
      clearInterval(autoReplayRef.current);
    }

    autoReplayRef.current = setInterval(() => {
      const action = stepReplay();
      if (!action) {
        if (autoReplayRef.current) {
          clearInterval(autoReplayRef.current);
          autoReplayRef.current = null;
        }
      }
    }, intervalMs);
  }, [stepReplay]);

  const pauseAutoReplay = useCallback(() => {
    if (autoReplayRef.current) {
      clearInterval(autoReplayRef.current);
      autoReplayRef.current = null;
    }
  }, []);

  const deleteSavedSession = useCallback((sessionId: string) => {
    deleteReplaySession(sessionId);
    setSavedSessions(getReplaySessions());
  }, []);

  const clearAllSessions = useCallback(() => {
    clearReplaySessions();
    setSavedSessions([]);
  }, []);

  const exitTestMode = useCallback(() => {
    if (autoReplayRef.current) {
      clearInterval(autoReplayRef.current);
      autoReplayRef.current = null;
    }
    window.location.href = window.location.pathname;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoReplayRef.current) {
        clearInterval(autoReplayRef.current);
      }
    };
  }, []);

  const replayProgress = useMemo(() => {
    if (!testState?.isReplaying || !testState.replaySession) return 0;
    const total = testState.replaySession.actions.length;
    if (total === 0) return 0;
    return Math.round((testState.replayIndex / total) * 100);
  }, [testState]);

  return {
    isTestMode,
    scenarioId,
    scenarioName: scenario.name,
    scenarioDescription: scenario.description,
    totalIdeas: testState?.ideas.length ?? 0,
    replaySession: testState?.replaySession ?? null,
    isReplaying: testState?.isReplaying ?? false,
    replayProgress,
    scenarios: getScenarioList(),
    savedSessions,
    changeScenario,
    startReplay,
    stopReplay,
    stepReplay,
    autoReplay,
    pauseAutoReplay,
    deleteSavedSession,
    clearAllSessions,
    exitTestMode,
  };
}

// ===== Test Mode Ideas Hook (replaces useTinderIdeas in test mode) =====

export function useTestModeIdeas(): UseTestModeIdeasResult {
  const [testState, setTestState] = useState<TestModeState | null>(null);
  const [ideas, setIdeas] = useState<MockIdea[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<TinderStats>({ accepted: 0, rejected: 0, deleted: 0 });
  const viewStartTimeRef = useRef<number>(Date.now());

  // Initialize test state
  useEffect(() => {
    const state = initializeTestMode();
    if (state) {
      setTestState(state);
      setIdeas(state.ideas);
      setLoading(false);
    }
  }, []);

  const mockApi = testState?.mockApi;
  const scenario = testState?.scenario;

  const recordSwipeAction = useCallback((ideaId: string, action: 'accept' | 'reject' | 'delete') => {
    if (!testState?.replaySession || testState.isReplaying) return;

    const updatedSession = recordAction(
      testState.replaySession,
      ideaId,
      action,
      viewStartTimeRef.current
    );

    setTestState(prev => prev ? {
      ...prev,
      replaySession: updatedSession,
    } : null);

    // Auto-save session periodically
    if (updatedSession.actions.length % 10 === 0) {
      saveReplaySession(updatedSession);
    }
  }, [testState]);

  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= ideas.length || !mockApi) return;

    const currentIdea = ideas[currentIndex];
    setProcessing(true);

    // Record the action
    recordSwipeAction(currentIdea.id, 'accept');

    // Optimistically remove the idea
    setIdeas(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await mockApi.acceptIdea(currentIdea.id);
      setStats(prev => ({ ...prev, accepted: prev.accepted + 1 }));
      viewStartTimeRef.current = Date.now();
    } catch (error) {
      alert('Test mode API failure: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Revert
      setIdeas(prev => {
        const newIdeas = [...prev];
        newIdeas.splice(currentIndex, 0, currentIdea);
        return newIdeas;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, mockApi, recordSwipeAction]);

  const handleReject = useCallback(async () => {
    if (processing || currentIndex >= ideas.length || !mockApi) return;

    const currentIdea = ideas[currentIndex];
    setProcessing(true);

    // Record the action
    recordSwipeAction(currentIdea.id, 'reject');

    // Optimistically remove the idea
    setIdeas(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await mockApi.rejectIdea(currentIdea.id);
      setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      viewStartTimeRef.current = Date.now();
    } catch (error) {
      alert('Test mode API failure: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Revert
      setIdeas(prev => {
        const newIdeas = [...prev];
        newIdeas.splice(currentIndex, 0, currentIdea);
        return newIdeas;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, mockApi, recordSwipeAction]);

  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= ideas.length || !mockApi) return;

    const currentIdea = ideas[currentIndex];

    if (!confirm('Are you sure you want to permanently delete this test idea?')) {
      return;
    }

    setProcessing(true);

    // Record the action
    recordSwipeAction(currentIdea.id, 'delete');

    // Optimistically remove the idea
    setIdeas(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await mockApi.deleteIdea(currentIdea.id);
      setStats(prev => ({ ...prev, deleted: prev.deleted + 1 }));
      viewStartTimeRef.current = Date.now();
    } catch (error) {
      alert('Test mode API failure: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Revert
      setIdeas(prev => {
        const newIdeas = [...prev];
        newIdeas.splice(currentIndex, 0, currentIdea);
        return newIdeas;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, mockApi, recordSwipeAction]);

  const resetStats = useCallback(() => {
    setStats({ accepted: 0, rejected: 0, deleted: 0 });
  }, []);

  const loadIdeas = useCallback(async () => {
    if (!scenario) return;

    setLoading(true);
    try {
      const newIdeas = scenario.generateIdeas();
      setIdeas(newIdeas);
      setCurrentIndex(0);
      setStats({ accepted: 0, rejected: 0, deleted: 0 });
      viewStartTimeRef.current = Date.now();

      // Save current session before reset
      if (testState?.replaySession && testState.replaySession.actions.length > 0) {
        saveReplaySession(testState.replaySession);
      }

      // Create new replay session
      setTestState(prev => prev ? {
        ...prev,
        replaySession: createReplaySession(prev.scenarioId),
      } : null);
    } finally {
      setLoading(false);
    }
  }, [scenario, testState]);

  // Save session on unmount
  useEffect(() => {
    return () => {
      if (testState?.replaySession && testState.replaySession.actions.length > 0) {
        saveReplaySession(testState.replaySession);
      }
    };
  }, [testState]);

  const currentIdea = ideas[currentIndex];
  const remainingCount = ideas.length - currentIndex;

  return {
    ideas: ideas as DbIdea[],
    currentIndex,
    loading,
    processing,
    hasMore: false, // Test mode loads all ideas at once
    total: testState?.ideas.length ?? 0,
    stats,
    remainingCount,
    currentIdea: currentIdea as DbIdea | undefined,
    handleAccept,
    handleReject,
    handleDelete,
    resetStats,
    loadIdeas,
  };
}

// ===== Composite Hook =====

export interface UseTinderWithTestModeResult extends UseTestModeIdeasResult {
  testMode: UseTestModeResult;
}

export function useTinderWithTestMode(selectedProjectId: string): UseTinderWithTestModeResult {
  const testMode = useTestMode();
  const testModeIdeas = useTestModeIdeas();

  // Note: When test mode is enabled, the test mode ideas hook handles everything
  // The selectedProjectId is ignored in test mode

  return {
    ...testModeIdeas,
    testMode,
  };
}
