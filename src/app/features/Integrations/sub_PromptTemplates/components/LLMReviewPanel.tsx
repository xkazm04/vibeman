'use client';

/**
 * LLMReviewPanel
 * AI-powered template review and improvement suggestions
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Star, Check, AlertTriangle, Loader2, Wand2 } from 'lucide-react';
import ProviderSelector from '@/components/llm/ProviderSelector';
import type { SupportedProvider } from '@/lib/llm/types';
import type { PromptTemplateCategory } from '@/app/db/models/types';

interface TemplateFeedback {
  clarity: number;
  completeness: number;
  suggestions: string[];
  improvedVersion?: string;
}

interface LLMReviewPanelProps {
  templateContent: string;
  category: PromptTemplateCategory;
  onApply: (improvedContent: string) => void;
  onClose: () => void;
}

export function LLMReviewPanel({
  templateContent,
  category,
  onApply,
  onClose,
}: LLMReviewPanelProps) {
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('ollama');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<TemplateFeedback | null>(null);

  const handleReview = async () => {
    if (!templateContent.trim()) return;

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch('/api/prompt-templates/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateContent,
          category,
          provider: selectedProvider,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback(data);
      } else {
        setError(data.error || 'Failed to review template');
      }
    } catch {
      setError('Failed to connect to LLM service');
    } finally {
      setLoading(false);
    }
  };

  // Render score stars
  const renderScore = (score: number, label: string) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i <= score
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-600'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">{score}/5</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-gray-700/50 bg-purple-900/10"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
            <Sparkles className="w-4 h-4" />
            LLM Template Review
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Selection & Review Button */}
        {!feedback && (
          <div className="flex items-center gap-3">
            <ProviderSelector
              selectedProvider={selectedProvider}
              onSelectProvider={setSelectedProvider}
              compact
              showAllProviders
            />
            <button
              onClick={handleReview}
              disabled={loading || !templateContent.trim()}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Review Template
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-gray-400 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            Analyzing template with {selectedProvider}...
          </div>
        )}

        {/* Feedback Results */}
        {feedback && (
          <div className="space-y-4">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-800/30 rounded-lg">
              {renderScore(feedback.clarity, 'Clarity')}
              {renderScore(feedback.completeness, 'Completeness')}
            </div>

            {/* Suggestions */}
            {feedback.suggestions.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Suggestions:</p>
                <ul className="space-y-1.5">
                  {feedback.suggestions.map((suggestion, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-gray-300 bg-gray-800/30 px-3 py-2 rounded"
                    >
                      <Check className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improved Version */}
            {feedback.improvedVersion && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">Improved Version:</p>
                  <button
                    onClick={() => {
                      onApply(feedback.improvedVersion!);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    Apply
                  </button>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                    {feedback.improvedVersion}
                  </pre>
                </div>
              </div>
            )}

            {/* Review Again */}
            <button
              onClick={() => setFeedback(null)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Review again with different provider
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
