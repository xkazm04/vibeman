'use client';

/**
 * AIRandomizerButton
 * LLM-powered button to generate creative random values for template variables
 */

import { useState } from 'react';
import { Dices, Loader2 } from 'lucide-react';
import ProviderSelector from '@/components/llm/ProviderSelector';
import type { SupportedProvider } from '@/lib/llm/types';
import type { PromptTemplate } from './TemplateCategoryColumn';

interface AIRandomizerButtonProps {
  template: PromptTemplate;
  onRandomize: (values: Record<string, string>) => void;
}

export function AIRandomizerButton({ template, onRandomize }: AIRandomizerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProviders, setShowProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('ollama');

  const handleRandomize = async () => {
    if (!template.id || template.variables.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/prompt-templates/ai-randomize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          provider: selectedProvider,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onRandomize(data.variables);
        setShowProviders(false);
      } else {
        setError(data.error || 'Failed to generate');
      }
    } catch {
      setError('Failed to generate random values');
    } finally {
      setLoading(false);
    }
  };

  if (template.variables.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowProviders(!showProviders)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        title="AI Randomize Variables"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Dices className="w-3 h-3" />
        )}
        AI Randomize
      </button>

      {/* Provider Dropdown */}
      {showProviders && !loading && (
        <div className="absolute right-0 top-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[200px]">
          <p className="text-xs text-gray-400 mb-2">Select LLM Provider</p>
          <ProviderSelector
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            compact
            showAllProviders
          />
          <button
            onClick={handleRandomize}
            disabled={loading}
            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs transition-colors"
          >
            <Dices className="w-3 h-3" />
            Generate Random Values
          </button>
          {error && (
            <p className="text-xs text-red-400 mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
