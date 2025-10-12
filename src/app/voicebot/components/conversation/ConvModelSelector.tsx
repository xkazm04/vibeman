'use client';

import { LLMProvider, AVAILABLE_LLM_MODELS } from '../../lib';

const LLM_PROVIDERS: Array<{ value: LLMProvider; label: string; description: string }> = [
  { value: 'ollama', label: 'Ollama', description: 'Local GPT-OSS 20B' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-5 Models' },
  { value: 'anthropic', label: 'Claude', description: 'Anthropic AI' },
  { value: 'gemini', label: 'Gemini', description: 'Google AI' }
];

interface ConvModelSelectorProps {
  provider: LLMProvider;
  model: string;
  isMultiModel: boolean;
  isPlaying: boolean;
  onProviderChange: (provider: LLMProvider) => void;
  onModelChange: (model: string) => void;
  onMultiModelChange: (enabled: boolean) => void;
}

export default function ConvModelSelector({
  provider,
  model,
  isMultiModel,
  isPlaying,
  onProviderChange,
  onModelChange,
  onMultiModelChange
}: ConvModelSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        Configuration
      </h3>
    
      {/* Multi-Model Checkbox */}
      <div className="mb-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isMultiModel}
            onChange={(e) => onMultiModelChange(e.target.checked)}
            disabled={isPlaying}
            className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500/50 disabled:opacity-50"
          />
          <span className="text-sm text-slate-300 font-medium">Multi-Model Test</span>
        </label>
        <p className="text-xs text-slate-400 mt-1">Run all models in parallel</p>
      </div>

      {/* Provider & Model - Same Column */}
      {!isMultiModel && (
        <div className="space-y-2">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                const newProvider = e.target.value as LLMProvider;
                onProviderChange(newProvider);
              }}
              disabled={isPlaying}
              className="w-full bg-slate-800/80 border border-slate-600/50 hover:border-cyan-500/50 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              {LLM_PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model</label>
            {AVAILABLE_LLM_MODELS[provider].length > 1 ? (
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isPlaying}
                className="w-full bg-slate-800/80 border border-slate-600/50 hover:border-cyan-500/50 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                {AVAILABLE_LLM_MODELS[provider].map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            ) : (
              <div className="p-2 bg-slate-800/50 border border-slate-600/30 rounded-lg">
                <div className="text-sm font-mono text-cyan-400">{model}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
