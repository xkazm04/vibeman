'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { IntegrationErrorBoundary } from '@/components/IntegrationErrorBoundary';
import {
  RefactorSuggestionPanel,
  type RefactorSuggestion,
  type SuggestionEngineResult,
} from '@/app/features/RefactorSuggestion';
import {
  convertSuggestionToOpportunity,
  convertSuggestionsToOpportunities,
} from '../lib/suggestionAdapter';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export interface SuggestionIntegrationPanelProps {
  /** Project path for scanning */
  projectPath: string;
  /** Project type (e.g., 'next.js', 'react') */
  projectType?: string;
  /** Project ID for API calls */
  projectId: string;
  /** Callback when suggestions are loaded and converted */
  onSuggestionsLoaded: (suggestions: RefactorOpportunity[]) => void;
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Callback to toggle expand/collapse */
  onToggleExpand: () => void;
  /** Optional callback for error logging */
  onError?: (error: Error) => void;
}

/**
 * Integration panel that wraps RefactorSuggestionPanel from the unused module.
 *
 * Handles:
 * - Loading suggestions via the RefactorSuggestionPanel
 * - Converting suggestions to RefactorOpportunity format via adapter
 * - Emitting converted suggestions to parent component
 * - Expand/collapse toggle functionality
 *
 * Requirements: 1.1, 1.3
 */
function SuggestionIntegrationPanelInner({
  projectPath,
  projectType,
  projectId,
  onSuggestionsLoaded,
  isExpanded,
  onToggleExpand,
  onError,
}: SuggestionIntegrationPanelProps) {
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);

  /**
   * Handle suggestion selection from the inner panel.
   * Converts the suggestion and notifies parent.
   */
  const handleSuggestionSelect = useCallback(
    (suggestion: RefactorSuggestion) => {
      try {
        const opportunity = convertSuggestionToOpportunity(suggestion);
        onSuggestionsLoaded([opportunity]);
      } catch (error) {
        console.error('[SuggestionIntegrationPanel] Failed to convert suggestion:', error);
        onError?.(error instanceof Error ? error : new Error('Conversion failed'));
      }
    },
    [onSuggestionsLoaded, onError]
  );

  /**
   * Handle when ideas are generated from suggestions.
   * This is called when user clicks "Generate Ideas" in the inner panel.
   */
  const handleGenerateIdeas = useCallback(
    (suggestionIds: string[]) => {
      console.log('[SuggestionIntegrationPanel] Ideas generated for:', suggestionIds);
    },
    []
  );

  return (
    <div
      className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-900/50"
      data-testid="suggestion-integration-panel"
    >
      {/* Collapsible Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
        data-testid="suggestion-panel-toggle"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200">
            AI Refactor Suggestions
          </span>
          {suggestionCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-xs text-cyan-400 border border-cyan-500/30">
              {suggestionCount} found
            </span>
          )}
        </div>
        {!hasLoadedSuggestions && (
          <span className="text-xs text-gray-500">Click to scan</span>
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-700/40"
          >
            <RefactorSuggestionPanel
              projectId={projectId}
              projectPath={projectPath}
              projectType={projectType}
              onSuggestionSelect={handleSuggestionSelect}
              onGenerateIdeas={handleGenerateIdeas}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * SuggestionIntegrationPanel wrapped with error boundary for graceful degradation.
 *
 * If the RefactorSuggestion module fails to load or throws an error,
 * this component will hide itself and log the error.
 */
export default function SuggestionIntegrationPanel(props: SuggestionIntegrationPanelProps) {
  const handleError = useCallback(
    (error: Error) => {
      console.error('[SuggestionIntegrationPanel] Integration error:', error);
      props.onError?.(error);
    },
    [props.onError]
  );

  return (
    <IntegrationErrorBoundary
      integrationName="suggestion"
      onError={handleError}
      fallback={
        <div className="border border-gray-700/50 rounded-lg p-4 bg-gray-900/50">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">AI suggestions unavailable</span>
          </div>
        </div>
      }
    >
      <SuggestionIntegrationPanelInner {...props} />
    </IntegrationErrorBoundary>
  );
}
