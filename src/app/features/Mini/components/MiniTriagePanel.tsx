'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  effortScale,
  impactScale,
  riskScale,
  EffortIcon,
  ImpactIcon,
  RiskIcon,
} from '@/app/features/Ideas/lib/ideaConfig';

interface TriageItem {
  type: 'idea' | 'direction';
  data: {
    id: string;
    title: string;
    description: string;
    category?: string;
    scan_type?: string;
    effort?: number;
    risk?: number;
    impact?: number;
  };
}

type ActionStatus = 'idle' | 'acting';

const CATEGORY_COLORS: Record<string, string> = {
  functionality: 'border-blue-400/50 text-blue-200 bg-blue-500/10',
  performance: 'border-yellow-400/50 text-yellow-200 bg-yellow-500/10',
  security: 'border-green-400/50 text-green-200 bg-green-500/10',
  ui: 'border-pink-400/50 text-pink-200 bg-pink-500/10',
  refactor: 'border-emerald-400/50 text-emerald-200 bg-emerald-500/10',
  architecture: 'border-indigo-400/50 text-indigo-200 bg-indigo-500/10',
  testing: 'border-cyan-400/50 text-cyan-200 bg-cyan-500/10',
};

function getCategoryStyle(category?: string): string {
  if (!category) return 'border-white/15 text-white/60 bg-white/5';
  return CATEGORY_COLORS[category.toLowerCase()] || 'border-white/15 text-white/60 bg-white/5';
}

export default function MiniTriagePanel() {
  const { activeProject } = useClientProjectStore();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [stats, setStats] = useState({ accepted: 0, rejected: 0 });

  const projectId = activeProject?.id;

  const { data, isLoading } = useQuery<{ items: TriageItem[]; total: number }>({
    queryKey: ['mini-triage', projectId],
    queryFn: async () => {
      if (!projectId) return { items: [], total: 0 };
      const res = await fetch(`/api/tinder/items?projectId=${projectId}&mode=ideas&limit=50`);
      if (!res.ok) return { items: [], total: 0 };
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const current = items[currentIndex] || null;

  const advance = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
      queryClient.invalidateQueries({ queryKey: ['mini-triage', projectId] });
    }
  }, [currentIndex, items.length, projectId, queryClient]);

  const handleAction = useCallback(async (action: 'accept' | 'reject') => {
    if (!current || !activeProject) return;
    setActionStatus('acting');
    try {
      await fetch('/api/tinder/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: current.type, itemId: current.data.id, action, projectPath: activeProject.path }),
      });
      setStats(prev => ({ ...prev, [action === 'accept' ? 'accepted' : 'rejected']: prev[action === 'accept' ? 'accepted' : 'rejected'] + 1 }));
      advance();
    } catch { /* item stays */ } finally { setActionStatus('idle'); }
  }, [current, activeProject, advance]);

  const handleSkip = useCallback(() => advance(), [advance]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleAction('accept'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleAction('reject'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); handleSkip(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction, handleSkip]);

  const statusDot = (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
      items.length === 0 ? 'bg-white/20' :
      actionStatus === 'acting' ? 'bg-amber-400 shadow-[0_0_8px_3px_rgba(251,191,36,0.6)]' :
      'bg-purple-400 shadow-[0_0_8px_3px_rgba(192,132,252,0.6)]'
    }`} />
  );

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4">
      {/* Header — source tags live here */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {statusDot}
          <h3 className="text-base font-semibold text-white">Triage</h3>
          {items.length > 0 && (
            <span className="text-sm text-white">{currentIndex + 1} / {items.length}</span>
          )}
        </div>
        {current && (
          <div className="flex items-center gap-2">
            {current.data.category && (
              <span className={`px-2.5 py-0.5 rounded text-sm font-medium border ${getCategoryStyle(current.data.category)}`}>
                {current.data.category}
              </span>
            )}
            {current.data.scan_type && (
              <span className="px-2.5 py-0.5 rounded text-sm border border-white/10 text-white bg-white/5">
                {current.data.scan_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Current Item */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-white/50 text-sm">Loading...</div>
      ) : !current ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-white text-sm">{projectId ? 'Queue empty' : 'Select project'}</span>
          <span className="text-sm text-white">{total} pending</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Metric badges row — matching original IdeaCard pattern */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {current.data.impact != null && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold tabular-nums bg-black/60 ${impactScale.entries[current.data.impact]?.color || 'text-white/50'} border-white/15`}
                title={`Impact: ${impactScale.entries[current.data.impact]?.description || current.data.impact}`}
              >
                <ImpactIcon className="w-3.5 h-3.5" />
                <span>{current.data.impact}</span>
              </div>
            )}
            {current.data.effort != null && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold tabular-nums bg-black/60 ${effortScale.entries[current.data.effort]?.color || 'text-white/50'} border-white/15`}
                title={`Effort: ${effortScale.entries[current.data.effort]?.description || current.data.effort}`}
              >
                <EffortIcon className="w-3.5 h-3.5" />
                <span>{current.data.effort}</span>
              </div>
            )}
            {current.data.risk != null && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold tabular-nums bg-black/60 ${riskScale.entries[current.data.risk]?.color || 'text-white/50'} border-white/15`}
                title={`Risk: ${riskScale.entries[current.data.risk]?.description || current.data.risk}`}
              >
                <RiskIcon className="w-3.5 h-3.5" />
                <span>{current.data.risk}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h4 className="text-base font-semibold text-white leading-snug mb-3">
            {current.data.title}
          </h4>

          {/* Description — scrollable with proper formatting */}
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-white/5 pt-3">
            <p className="text-sm text-white leading-7 whitespace-pre-wrap">
              {current.data.description}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
        <button
          onClick={() => handleAction('reject')}
          disabled={!current || actionStatus === 'acting'}
          className="flex-1 py-2.5 rounded text-sm font-semibold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-30 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={handleSkip}
          disabled={!current}
          className="px-5 py-2.5 rounded text-sm font-medium text-white border border-white/20 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => handleAction('accept')}
          disabled={!current || actionStatus === 'acting'}
          className="flex-1 py-2.5 rounded text-sm font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-30 transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
