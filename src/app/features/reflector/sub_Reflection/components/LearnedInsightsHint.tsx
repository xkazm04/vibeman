'use client';

/**
 * LearnedInsightsHint — one honest inline line about the Brain's learned-insight
 * gate. When insights are still gathering data (gated), it shows concrete
 * progress toward the effectiveness-scoring threshold instead of silently
 * rendering nothing. It is intentionally a single line, not a panel/dashboard:
 * when insights are actually available (state 'ok'), or there's simply nothing to
 * say, it renders nothing at all.
 *
 * Backed by the `gates` block on GET /api/brain/context.
 */

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface InsightGates {
  state: 'ok' | 'gated' | 'empty' | 'error';
  resolvedDirections: number;
  requiredDirections: number;
  insightsConsidered: number;
  insightsSurfaced: number;
}

export default function LearnedInsightsHint({ projectId }: { projectId: string | null }) {
  const [gates, setGates] = useState<InsightGates | null>(null);

  useEffect(() => {
    if (!projectId) {
      setGates(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brain/context?projectId=${encodeURIComponent(projectId)}`);
        if (!res.ok) return;
        const body = await res.json();
        const g: InsightGates | undefined = body?.data?.context?.gates;
        if (!cancelled && g) setGates(g);
      } catch {
        // Non-critical — the hint just stays hidden.
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (!projectId || !gates) return null;

  // Only speak up when there's honest, actionable progress to show. When
  // insights exist ('ok') the dashboard already surfaces them — stay silent.
  let message: string | null = null;
  if (gates.state === 'gated') {
    const remaining = Math.max(0, gates.requiredDirections - gates.resolvedDirections);
    message = `Learned insights unlock after ${remaining} more resolved direction${remaining === 1 ? '' : 's'} — ${gates.resolvedDirections}/${gates.requiredDirections} so far.`;
  } else if (gates.state === 'empty' && gates.insightsConsidered > 0) {
    message = 'No learned insight has proven effective yet — none has lifted your acceptance rate.';
  } else if (gates.state === 'error') {
    message = 'Learned-insight effectiveness is temporarily unavailable.';
  }

  if (!message) return null;

  return (
    <div
      className="flex items-center gap-2 text-xs text-gray-500 px-3 py-1.5 rounded-md border border-gray-700/40 bg-gray-900/30"
      data-testid="learned-insights-hint"
    >
      <Sparkles className="w-3 h-3 text-cyan-500/70 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
