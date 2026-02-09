'use client';

import { LLMProvider, AVAILABLE_LLM_MODELS, VoiceProvider, NOVA_SONIC_VOICES } from '../../lib';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

const LLM_PROVIDERS: Array<{ value: LLMProvider; label: string; description: string }> = [
  { value: 'ollama', label: 'Ollama', description: 'Local GPT-OSS 20B' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-5 Models' },
  { value: 'anthropic', label: 'Claude', description: 'Anthropic AI' },
  { value: 'gemini', label: 'Gemini', description: 'Google AI' }
];

const VOICE_PROVIDERS: Array<{ value: VoiceProvider; label: string; description: string }> = [
  { value: 'elevenlabs', label: 'ElevenLabs', description: 'STT + LLM + TTS pipeline' },
  { value: 'nova-sonic', label: 'Nova Sonic', description: 'AWS unified speech-to-speech' }
];

interface ConvModelSelectorProps {
  provider: LLMProvider;
  model: string;
  isMultiModel: boolean;
  isPlaying: boolean;
  voiceProvider: VoiceProvider;
  novaVoiceId: string;
  onProviderChange: (provider: LLMProvider) => void;
  onModelChange: (model: string) => void;
  onMultiModelChange: (enabled: boolean) => void;
  onVoiceProviderChange: (provider: VoiceProvider) => void;
  onNovaVoiceChange: (voiceId: string) => void;
}

export default function ConvModelSelector({
  provider,
  model,
  isMultiModel,
  isPlaying,
  voiceProvider,
  novaVoiceId,
  onProviderChange,
  onModelChange,
  onMultiModelChange,
  onVoiceProviderChange,
  onNovaVoiceChange
}: ConvModelSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        Configuration
      </h3>

      {/* Voice Provider Toggle */}
      <div className="mb-3">
        <label className="block text-sm text-slate-400 mb-1">Voice Provider</label>
        <div className="flex gap-2">
          {VOICE_PROVIDERS.map((vp) => (
            <button
              key={vp.value}
              onClick={() => onVoiceProviderChange(vp.value)}
              disabled={isPlaying}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                ${voiceProvider === vp.value
                  ? vp.value === 'nova-sonic'
                    ? 'bg-orange-600/20 border-orange-500/50 text-orange-300 shadow-lg shadow-orange-500/10'
                    : 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-800/50 border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="font-semibold">{vp.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{vp.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Nova Sonic Voice Selector */}
      {voiceProvider === 'nova-sonic' && (
        <div className="mb-3">
          <label className="block text-sm text-slate-400 mb-1">Nova Voice</label>
          <UniversalSelect
            value={novaVoiceId}
            onChange={(value) => onNovaVoiceChange(value)}
            options={NOVA_SONIC_VOICES.map(v => ({
              value: v.value,
              label: `${v.label} (${v.language})`
            }))}
            disabled={isPlaying}
            variant="default"
          />
        </div>
      )}

      {/* Multi-Model Checkbox - only for ElevenLabs pipeline */}
      {voiceProvider === 'elevenlabs' && (
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
          <p className="text-sm text-slate-400 mt-1">Run all models in parallel</p>
        </div>
      )}

      {/* Provider & Model - only for ElevenLabs (Nova Sonic has its own LLM) */}
      {voiceProvider === 'elevenlabs' && !isMultiModel && (
        <div className="space-y-2">
          {/* Provider Selector */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">LLM Provider</label>
            <UniversalSelect
              value={provider}
              onChange={(value) => {
                const newProvider = value as LLMProvider;
                onProviderChange(newProvider);
              }}
              options={LLM_PROVIDERS.map(p => ({
                value: p.value,
                label: p.label
              }))}
              disabled={isPlaying}
              variant="default"
            />
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Model</label>
            {AVAILABLE_LLM_MODELS[provider].length > 1 ? (
              <UniversalSelect
                value={model}
                onChange={(value) => onModelChange(value)}
                options={AVAILABLE_LLM_MODELS[provider].map(m => ({
                  value: m.value,
                  label: m.label
                }))}
                disabled={isPlaying}
                variant="default"
              />
            ) : (
              <div className="p-2 bg-slate-800/50 border border-slate-600/30 rounded-lg">
                <div className="text-sm font-mono text-cyan-400">{model}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nova Sonic info badge */}
      {voiceProvider === 'nova-sonic' && (
        <div className="mt-2 p-2 bg-orange-950/30 border border-orange-500/20 rounded-lg">
          <div className="text-[11px] text-orange-300/80 font-mono">
            Nova 2 Sonic (eu-north-1) — unified S2S model, LLM built-in
          </div>
        </div>
      )}
    </div>
  );
}
