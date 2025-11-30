/**
 * Context Target Popup Component
 *
 * Allows users to define strategic goals and assess current fulfillment
 * for software contexts, with AI-assisted generation focused on user value
 * and productivity gains.
 *
 * Uses centralized context metadata cache for:
 * - Reading cached context data
 * - Real-time sync with other components
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Context } from '@/stores/context/contextStoreTypes';
import { SupportedProvider } from '@/lib/llm/types';
import { useContextWithCache } from '@/hooks/useContextMetadata';

// Library imports
import { generateContextAnalysisPrompt, generateContextAnalysis } from './lib';

// Component imports
import {
  PopupHeader,
  ProviderSelectorPanel,
  StatusBar,
  TargetInputs,
  PopupFooter,
  ProgressIndicator,
} from './components';

interface ContextTargetPopupProps {
  context: Context;
  onSave: (id: string, target: string, fulfillment: string) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
  queueLength: number;
  currentIndex: number;
}

export default function ContextTargetPopup({
  context: propContext,
  onSave,
  onSkip,
  onClose,
  queueLength,
  currentIndex,
}: ContextTargetPopupProps) {
  // Get cached context with real-time updates
  const { context: cachedContext } = useContextWithCache(propContext.id);

  // Use cached context if available, fallback to prop
  const context = cachedContext ?? propContext;

  // Form state
  const [target, setTarget] = useState(context.target || '');
  const [fulfillment, setFulfillment] = useState(context.target_fulfillment || '');
  const [isSaving, setIsSaving] = useState(false);

  // AI generation state
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('gemini');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Reset state when context changes (either from prop or cache)
  useEffect(() => {
    setTarget(context.target || '');
    setFulfillment(context.target_fulfillment || '');
    setGenerationError(null);
    setGenerationProgress('');
    setIsGenerating(false);
    setShowProviderSelector(false);
  }, [context.id, context.target, context.target_fulfillment]);

  // Handle save action
  const handleSave = async () => {
    if (!target.trim()) return;

    setIsSaving(true);
    try {
      await onSave(context.id, target, fulfillment);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle AI generation button click
  const handleGenerateClick = () => {
    setShowProviderSelector(!showProviderSelector);
  };

  // Handle provider selection and start generation
  const handleProviderSelect = (provider: SupportedProvider) => {
    setSelectedProvider(provider);
    setShowProviderSelector(false);
    handleGenerateWithLLM(provider);
  };

  // Execute AI generation
  const handleGenerateWithLLM = async (provider: SupportedProvider) => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Generate the prompt
      const prompt = generateContextAnalysisPrompt(context);

      // Call the API
      const result = await generateContextAnalysis({
        prompt,
        provider,
        contextName: context.name,
        onProgress: (message) => setGenerationProgress(message),
      });

      if (result.success && result.target && result.fulfillment) {
        setTarget(result.target);
        setFulfillment(result.fulfillment);
      } else {
        setGenerationError(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationError(errorMsg);
      console.error('Error generating with LLM:', error);
    } finally {
      // Keep showing "Complete!" message briefly before clearing
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress('');
      }, 1000);
    }
  };

  // Handle error retry
  const handleRetry = () => {
    setGenerationError(null);
    setShowProviderSelector(true);
  };

  // Handle error dismissal
  const handleDismissError = () => {
    setGenerationError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
      className="w-full"
    >
      {/* Glass Container with enhanced backdrop */}
      <div className="relative bg-gray-900/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(6,182,212,0.3),0_0_80px_rgba(6,182,212,0.15)]">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-blue-500/5" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />

        {/* Header */}
        <PopupHeader
          contextName={context.name}
          isGenerating={isGenerating}
          onGenerateClick={handleGenerateClick}
          onClose={onClose}
        />

        {/* Provider Selector Panel */}
        <ProviderSelectorPanel
          isVisible={showProviderSelector}
          selectedProvider={selectedProvider}
          isGenerating={isGenerating}
          onSelectProvider={handleProviderSelect}
        />

        {/* Status Bar (Progress/Error) */}
        <StatusBar
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          generationError={generationError}
          onDismissError={handleDismissError}
          onRetry={handleRetry}
        />

        {/* Body */}
        <div className="relative p-5 space-y-5">
          {/* Progress Indicator */}
          <ProgressIndicator currentIndex={currentIndex} queueLength={queueLength} />

          {/* Target Inputs */}
          <TargetInputs
            target={target}
            fulfillment={fulfillment}
            isGenerating={isGenerating}
            onTargetChange={setTarget}
            onFulfillmentChange={setFulfillment}
          />
        </div>

        {/* Footer */}
        <PopupFooter target={target} isSaving={isSaving} onSkip={onSkip} onSave={handleSave} />
      </div>
    </motion.div>
  );
}
