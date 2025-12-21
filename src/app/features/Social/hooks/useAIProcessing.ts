'use client';

import { useState, useCallback } from 'react';
import type {
  AIProvider,
  AIProcessingStatus,
  FeedbackAnalysisResult,
  BatchAnalysisResponse,
  UIFeedbackItem,
  RequirementAnalysisResult,
  BatchRequirementAnalysisResponse,
} from '../lib/types/aiTypes';

interface UseAIProcessingOptions {
  onSuccess?: (results: FeedbackAnalysisResult[]) => void;
  onRequirementSuccess?: (results: RequirementAnalysisResult[]) => void;
  onError?: (error: string) => void;
  onProgress?: (current: number, total: number) => void;
}

interface AIProcessingState {
  status: AIProcessingStatus;
  provider: AIProvider;
  results: Map<string, FeedbackAnalysisResult>;
  requirementResults: Map<string, RequirementAnalysisResult>;
  error?: string;
  progress?: {
    current: number;
    total: number;
  };
}

export function useAIProcessing(options: UseAIProcessingOptions = {}) {
  const { onSuccess, onRequirementSuccess, onError, onProgress } = options;

  const [state, setState] = useState<AIProcessingState>({
    status: 'idle',
    provider: 'gemini',
    results: new Map(),
    requirementResults: new Map(),
  });

  const setProvider = useCallback((provider: AIProvider) => {
    setState((prev) => ({ ...prev, provider }));
  }, []);

  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      results: new Map(),
      requirementResults: new Map(),
      error: undefined,
      status: 'idle',
    }));
  }, []);

  // Process feedback items - calls vibeman's API
  const processFeedback = useCallback(
    async (feedbackItems: UIFeedbackItem[]) => {
      if (feedbackItems.length === 0) {
        onError?.('No feedback items selected');
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'processing',
        error: undefined,
        progress: { current: 0, total: feedbackItems.length },
      }));

      try {
        const items = feedbackItems.map((item) => ({
          id: item.id,
          channel: item.channel,
          content: item.content.body,
          sentiment: item.sentiment,
          priority: item.priority,
          tags: item.tags,
        }));

        const response = await fetch('/api/social/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: state.provider === 'claude' ? 'anthropic' : 'gemini',
            feedbackItems: items,
            stage: 'classification',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Failed to process feedback';
          throw new Error(errorMessage);
        }

        const data: BatchAnalysisResponse = await response.json();

        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid response format: missing results array');
        }

        const newResults = new Map(state.results);
        data.results.forEach((result) => {
          newResults.set(result.feedbackId, result);
        });

        setState((prev) => ({
          ...prev,
          status: 'success',
          results: newResults,
          progress: { current: data.results.length, total: feedbackItems.length },
        }));

        onSuccess?.(data.results);
        onProgress?.(data.results.length, feedbackItems.length);

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
        onError?.(errorMessage);
        throw error;
      }
    },
    [state.provider, state.results, onSuccess, onError, onProgress]
  );

  // Process requirement analysis
  const processRequirements = useCallback(
    async (feedbackItems: UIFeedbackItem[]) => {
      if (feedbackItems.length === 0) {
        onError?.('No feedback items selected');
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'processing',
        error: undefined,
        progress: { current: 0, total: feedbackItems.length },
      }));

      try {
        const items = feedbackItems.map((item) => ({
          id: item.id,
          title: item.aiResult?.title || item.content.subject || 'Untitled',
          classification: item.aiResult?.classification || 'bug',
          channel: item.channel,
          content: item.content.body,
          sentiment: item.sentiment,
          priority: item.priority,
          tags: item.tags,
          bugReference: item.bugReference,
        }));

        const response = await fetch('/api/social/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: state.provider === 'claude' ? 'anthropic' : 'gemini',
            feedbackItems: items,
            stage: 'requirement',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Failed to process requirements';
          throw new Error(errorMessage);
        }

        const data: BatchRequirementAnalysisResponse = await response.json();

        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid response format: missing results array');
        }

        const newResults = new Map(state.requirementResults);
        data.results.forEach((result) => {
          newResults.set(result.feedbackId, result);
        });

        setState((prev) => ({
          ...prev,
          status: 'success',
          requirementResults: newResults,
          progress: { current: data.results.length, total: feedbackItems.length },
        }));

        onRequirementSuccess?.(data.results);
        onProgress?.(data.results.length, feedbackItems.length);

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
        onError?.(errorMessage);
        throw error;
      }
    },
    [state.provider, state.requirementResults, onRequirementSuccess, onError, onProgress]
  );

  const getResult = useCallback(
    (feedbackId: string): FeedbackAnalysisResult | undefined => {
      return state.results.get(feedbackId);
    },
    [state.results]
  );

  const isProcessed = useCallback(
    (feedbackId: string): boolean => {
      return state.results.has(feedbackId);
    },
    [state.results]
  );

  const getRequirementResult = useCallback(
    (feedbackId: string): RequirementAnalysisResult | undefined => {
      return state.requirementResults.get(feedbackId);
    },
    [state.requirementResults]
  );

  const hasRequirementResult = useCallback(
    (feedbackId: string): boolean => {
      return state.requirementResults.has(feedbackId);
    },
    [state.requirementResults]
  );

  return {
    status: state.status,
    provider: state.provider,
    results: state.results,
    requirementResults: state.requirementResults,
    error: state.error,
    progress: state.progress,
    isProcessing: state.status === 'processing',
    setProvider,
    processFeedback,
    processRequirements,
    clearResults,
    getResult,
    isProcessed,
    getRequirementResult,
    hasRequirementResult,
  };
}
