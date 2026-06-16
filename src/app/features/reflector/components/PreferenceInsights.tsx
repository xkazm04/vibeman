'use client';

/**
 * PreferenceInsights — surfaces the goal-preference-learning profile so users can
 * see what the AI has inferred from the goal candidates they accept, reject, and
 * tweak (the rejection-reason breakdown in particular).
 *
 * Backed by GET /api/goals/preference-insights. Hidden until there's enough data.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, ThumbsDown, Loader2 } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';

const CATEGORY_LABELS: Record<string, string> = {
  too_tactical: 'Too tactical',
  too_vague: 'Too vague',
  wrong_scope: 'Wrong scope',
  already_addressed: 'Already addressed',
  low_priority: 'Low priority',
  misaligned_theme: 'Misaligned theme',
  too_ambitious: 'Too ambitious',
  other: 'Other',
};

interface Profile {
  totalDecisions: number;
  acceptRate: number;
  rejectRate: number;
  tweakRate: number;
  topRejectionCategories: Array<{ category: string; count: number; percentage: number }>;
  acceptedThemes: Record<string, number>;
  observations: string[];
}

interface InsightsResponse {
  success: boolean;
  profile: Profile | null;
  hasEnoughData: boolean;
}

export default function PreferenceInsights() {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id;

  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/goals/preference-insights?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) setData(await res.json());
    } catch {
      // Non-critical.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  if (!projectId) return null;
  // Hide entirely until the AI has actually learned something.
  if (!loading && (!data || !data.hasEnoughData || !data.profile)) return null;

  const profile = data?.profile;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-cyan-900/10 backdrop-blur-sm p-5 mb-6"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <Brain className="w-4 h-4 text-cyan-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-cyan-100">What we&apos;ve learned about your goals</h3>
          <p className="text-xs text-gray-500">From the goal candidates you accept, reject, and tweak</p>
        </div>
      </div>

      {loading && !profile ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your decisions…
        </div>
      ) : profile ? (
        <div className="space-y-4">
          {/* Action rates */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Accepted', value: profile.acceptRate, color: 'text-emerald-400' },
              { label: 'Rejected', value: profile.rejectRate, color: 'text-red-400' },
              { label: 'Tweaked', value: profile.tweakRate, color: 'text-amber-400' },
            ].map((r) => (
              <div key={r.label} className="rounded-lg bg-gray-800/40 border border-gray-700/40 p-2.5 text-center">
                <div className={`text-lg font-semibold ${r.color}`}>{Math.round(r.value * 100)}%</div>
                <div className="text-[11px] text-gray-500">{r.label}</div>
              </div>
            ))}
          </div>

          {/* Rejection reasons */}
          {profile.topRejectionCategories.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
                <ThumbsDown className="w-3 h-3" /> Why you reject candidates
              </div>
              <div className="space-y-1.5">
                {profile.topRejectionCategories.slice(0, 4).map((c) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-32 flex-shrink-0">
                      {CATEGORY_LABELS[c.category] ?? c.category}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500/60 to-orange-500/60"
                        style={{ width: `${Math.min(100, c.percentage)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 w-9 text-right flex-shrink-0">
                      {Math.round(c.percentage)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High-signal observations */}
          {profile.observations.length > 0 && (
            <ul className="space-y-1">
              {profile.observations.slice(0, 3).map((o, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                  <span className="text-cyan-500 mt-0.5">•</span> {o}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-gray-600">
            Based on {profile.totalDecisions} decision{profile.totalDecisions === 1 ? '' : 's'}.
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
