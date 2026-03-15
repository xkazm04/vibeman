/**
 * useLLMAdvisorFlow
 * Encapsulates advisor-selection → provider-selection → generation flow
 * shared by UserInputPanel and NewTaskInputPanel.
 */

'use client';

import { useState } from 'react';
import { SupportedProvider } from '@/lib/llm/types';
import { AdvisorType } from '../lib/types';
import { toast } from '@/stores/messageStore';
import { LLMApiError } from '../lib/llmHelpers';

/**
 * Unified error handler for Manager LLM flows.
 * Maps LLMApiError.isTransient to a retry hint; otherwise shows a plain error toast.
 */
function handleManagerError(error: unknown, fallbackMessage: string): void {
  if (error instanceof LLMApiError) {
    const detail = error.isTransient
      ? `${error.userMessage} — please try again.`
      : error.userMessage;
    toast.error(fallbackMessage, detail);
  } else {
    const msg = error instanceof Error ? error.message : fallbackMessage;
    toast.error(fallbackMessage, msg);
  }
}

export type GenerationStep = 'advisor' | 'analyst';

interface UseLLMAdvisorFlowOptions {
  /** Called with the advisor's suggestion text. Caller is responsible for applying it. */
  onAdvisorSuggestion: (suggestion: string) => void;
  /** Called when analyst step succeeds. */
  onAnalystSuccess: (requirementName: string) => void;
  /** Performs the advisor LLM call and returns the suggestion string. */
  generateAdvisor: (advisorType: AdvisorType, provider: SupportedProvider) => Promise<string>;
  /** Performs the analyst LLM call + file creation, returns outcome. */
  generateAnalyst: (provider: SupportedProvider) => Promise<{
    success: boolean;
    requirementName?: string;
    error?: string;
  }>;
}

export function useLLMAdvisorFlow(options: UseLLMAdvisorFlowOptions) {
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorType | null>(null);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('openai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAdvisorClick = (advisorType: AdvisorType) => {
    setSelectedAdvisor(advisorType);
    setGenerationStep('advisor');
    setShowProviderSelector(true);
  };

  const handleSubmit = () => {
    setGenerationStep('analyst');
    setShowProviderSelector(true);
  };

  const handleProviderSelected = async (provider: SupportedProvider) => {
    setSelectedProvider(provider);
    setShowProviderSelector(false);
    setIsGenerating(true);

    try {
      if (generationStep === 'advisor' && selectedAdvisor) {
        const suggestion = await options.generateAdvisor(selectedAdvisor, provider);
        options.onAdvisorSuggestion(suggestion);
        setSelectedAdvisor(null);
      } else if (generationStep === 'analyst') {
        const result = await options.generateAnalyst(provider);
        if (result.success && result.requirementName) {
          setSuccessMessage(`Requirement created: ${result.requirementName}`);
          options.onAnalystSuccess(result.requirementName);
        } else {
          toast.error('Failed to create requirement', result.error);
        }
      }
    } catch (error) {
      handleManagerError(error, 'Failed to generate suggestion');
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  return {
    selectedAdvisor,
    showProviderSelector,
    setShowProviderSelector,
    selectedProvider,
    isGenerating,
    generationStep,
    successMessage,
    setSuccessMessage,
    handleAdvisorClick,
    handleSubmit,
    handleProviderSelected,
  };
}
