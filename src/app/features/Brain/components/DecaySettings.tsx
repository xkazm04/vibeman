'use client';

import { useState, useMemo } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import SignalDecayCurve from './SignalDecayCurve';

/**
 * DecaySettings - Panel for configuring signal weight decay parameters
 * with a visual curve preview and apply button.
 */
export default function DecaySettings() {
  const { decaySettings, setDecaySettings, applyDecay } = useBrainStore();
  const activeProject = useClientProjectStore(s => s.activeProject);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<{ affected: number } | null>(null);

  // Local editing state (so slider changes don't immediately affect the store)
  const [localFactor, setLocalFactor] = useState(decaySettings.decayFactor);
  const [localRetention, setLocalRetention] = useState(decaySettings.retentionDays);

  const hasChanges = localFactor !== decaySettings.decayFactor || localRetention !== decaySettings.retentionDays;

  // Preview: show what weight a signal from various days ago would have
  const preview = useMemo(() => {
    const days = [1, 7, 14, 30, 60];
    return days
      .filter(d => d <= localRetention)
      .map(d => ({
        day: d,
        weight: Math.pow(localFactor, d),
      }));
  }, [localFactor, localRetention]);

  const handleApply = async () => {
    if (!activeProject?.id) return;

    // Save settings to store
    setDecaySettings({ decayFactor: localFactor, retentionDays: localRetention });

    // Apply decay to database
    setIsApplying(true);
    setResult(null);
    const res = await applyDecay(activeProject.id);
    setResult(res);
    setIsApplying(false);
  };

  const handleReset = () => {
    setLocalFactor(0.9);
    setLocalRetention(30);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-200">Signal Decay</h3>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Decay Curve Visualization */}
      <div className="mb-4">
        <SignalDecayCurve decayFactor={localFactor} retentionDays={localRetention} />
      </div>

      {/* Decay Factor Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400">Decay Factor</label>
          <span className="text-xs text-zinc-300 font-mono">{localFactor.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.8}
          max={0.99}
          step={0.01}
          value={localFactor}
          onChange={e => setLocalFactor(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
          <span>Faster fade (0.80)</span>
          <span>Slower fade (0.99)</span>
        </div>
      </div>

      {/* Retention Days Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400">Retention Period</label>
          <span className="text-xs text-zinc-300 font-mono">{localRetention}d</span>
        </div>
        <input
          type="range"
          min={7}
          max={90}
          step={1}
          value={localRetention}
          onChange={e => setLocalRetention(parseInt(e.target.value))}
          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
          <span>7 days</span>
          <span>90 days</span>
        </div>
      </div>

      {/* Preview Table */}
      <div className="mb-4 p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/40">
        <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">Weight Preview</p>
        <div className="grid grid-cols-5 gap-1">
          {preview.map(p => (
            <div key={p.day} className="text-center">
              <p className="text-[10px] text-zinc-500">{p.day}d ago</p>
              <p className={`text-xs font-mono ${p.weight > 0.5 ? 'text-green-400' : p.weight > 0.2 ? 'text-amber-400' : 'text-red-400'}`}>
                {(p.weight * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        disabled={isApplying || !activeProject?.id}
        className="w-full py-2 px-3 rounded-lg text-xs font-medium transition-colors bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isApplying ? 'Applying...' : hasChanges ? 'Save & Apply Decay' : 'Apply Decay'}
      </button>

      {/* Result feedback */}
      {result && (
        <p className="text-[10px] text-zinc-500 mt-2 text-center">
          {result.affected > 0
            ? `${result.affected} signals affected`
            : 'No signals needed updating'}
        </p>
      )}
    </div>
  );
}
