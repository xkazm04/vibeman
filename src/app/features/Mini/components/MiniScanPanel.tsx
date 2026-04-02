'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';

const SCAN_CATEGORIES = [
  {
    label: 'Technical',
    agents: [
      { id: 'zen_architect', name: '🏗️ Architect' },
      { id: 'bug_hunter', name: '🐛 Bugs' },
      { id: 'perf_optimizer', name: '⚡ Perf' },
      { id: 'security_protector', name: '🔒 Security' },
      { id: 'insight_synth', name: '💡 Insights' },
      { id: 'ambiguity_guardian', name: '🌀 Ambiguity' },
      { id: 'data_flow_optimizer', name: '🌊 Data Flow' },
      { id: 'dev_experience_engineer', name: '🛠️ DX' },
      { id: 'code_refactor', name: '🧹 Refactor' },
      { id: 'pragmatic_integrator', name: '🔗 Integrator' },
      { id: 'tech_innovator', name: '⚙️ Innovator' },
      { id: 'observability_scout', name: '📡 Observability' },
    ],
  },
  {
    label: 'User',
    agents: [
      { id: 'ui_perfectionist', name: '🎨 UI' },
      { id: 'delight_designer', name: '✨ Delight' },
      { id: 'user_empathy_champion', name: '💖 Empathy' },
      { id: 'brand_artist', name: '🎨 Brand' },
    ],
  },
  {
    label: 'Business',
    agents: [
      { id: 'competitor_analyst', name: '🎯 Competitor' },
      { id: 'business_visionary', name: '🚀 Visionary' },
      { id: 'feature_scout', name: '🔍 Features' },
      { id: 'ai_integration_scout', name: '🤖 AI' },
      { id: 'youtube_scout', name: '▶️ YouTube' },
    ],
  },
  {
    label: 'Mastermind',
    agents: [
      { id: 'paradigm_shifter', name: '🔮 Paradigm' },
      { id: 'moonshot_architect', name: '🌙 Moonshot' },
    ],
  },
];

type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export default function MiniScanPanel() {
  const { activeProject } = useClientProjectStore();
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['zen_architect']));
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [lastResult, setLastResult] = useState<{ count: number; time: string } | null>(null);

  const toggleType = useCallback((id: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectCategory = useCallback((agents: ReadonlyArray<{ id: string }>) => {
    setSelectedTypes(prev => {
      const ids = agents.map(a => a.id);
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = SCAN_CATEGORIES.flatMap(c => c.agents.map(a => a.id));
    setSelectedTypes(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }, []);

  const startScan = useCallback(async () => {
    if (!activeProject || selectedTypes.size === 0) return;
    setStatus('scanning');
    try {
      const res = await fetch('/api/ideas/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          scanTypes: Array.from(selectedTypes),
        }),
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      setStatus('done');
      setLastResult({ count: data.ideasGenerated || data.count || 0, time: new Date().toLocaleTimeString() });
    } catch {
      setStatus('error');
    }
  }, [activeProject, selectedTypes]);

  useEffect(() => {
    if (status === 'done' || status === 'error') {
      const timer = setTimeout(() => setStatus('idle'), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const statusDot = (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
      status === 'idle' ? 'bg-white/20' :
      status === 'scanning' ? 'bg-cyan-400 shadow-[0_0_8px_3px_rgba(34,211,238,0.6)]' :
      status === 'done' ? 'bg-emerald-400 shadow-[0_0_8px_3px_rgba(52,211,153,0.6)]' :
      'bg-red-400 shadow-[0_0_8px_3px_rgba(248,113,113,0.6)]'
    }`} />
  );

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {statusDot}
          <h3 className="text-base font-semibold text-white">Scan</h3>
        </div>
        <div className="flex items-center gap-3">
          {lastResult && (
            <span className="text-sm text-white">{lastResult.count} ideas @ {lastResult.time}</span>
          )}
          <button onClick={selectAll} className="text-sm text-white hover:text-white transition-colors">
            {selectedTypes.size === SCAN_CATEGORIES.flatMap(c => c.agents).length ? 'none' : 'all'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
        {SCAN_CATEGORIES.map(category => (
          <div key={category.label}>
            <button
              onClick={() => selectCategory(category.agents)}
              className="text-xs uppercase tracking-wider text-white/80 hover:text-white/80 mb-1.5 transition-colors"
            >
              {category.label}
            </button>
            <div className="flex flex-wrap gap-1.5">
              {category.agents.map(({ id, name }) => (
                <button
                  key={id}
                  onClick={() => toggleType(id)}
                  className={`px-2.5 py-1 rounded text-sm border transition-colors ${
                    selectedTypes.has(id)
                      ? 'bg-white/10 border-cyan-500/50 text-white'
                      : 'bg-transparent border-white/8 text-white hover:text-white hover:border-white/20'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={startScan}
        disabled={status === 'scanning' || !activeProject || selectedTypes.size === 0}
        className={`mt-3 w-full py-2 rounded text-sm font-semibold transition-colors ${
          status === 'scanning'
            ? 'bg-cyan-900/40 text-cyan-200 cursor-wait'
            : 'bg-cyan-600/25 text-cyan-200 hover:bg-cyan-600/40 border border-cyan-500/40'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {status === 'scanning' ? 'Scanning...' : `Scan ${selectedTypes.size} agent${selectedTypes.size !== 1 ? 's' : ''}`}
      </button>

      {!activeProject && (
        <p className="text-sm text-white mt-2 text-center">Select a project first</p>
      )}
    </div>
  );
}
