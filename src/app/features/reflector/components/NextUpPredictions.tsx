'use client';

/**
 * NextUpPredictions — surfaces the predictive-intent engine's "what you'll work
 * on next" suggestions (Markov chain over context transitions) and closes the
 * accuracy feedback loop by letting the user accept/dismiss each prediction.
 *
 * Backed by GET/PATCH /api/brain/predictions. Renders nothing until a model
 * exists, so it stays out of the way for fresh projects.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Loader2, Compass } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { toast } from '@/stores/messageStore';

interface Prediction {
  id: string;
  predicted_context_id: string;
  predicted_context_name: string;
  confidence: number;
  reasoning: string | null;
}

interface PredictionsResponse {
  success: boolean;
  predictions: Prediction[];
  accuracy: { total: number; accepted: number; dismissed: number; accuracyRate: number };
  modelSize: number;
}

export default function NextUpPredictions() {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id;

  const [data, setData] = useState<PredictionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/brain/predictions?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) setData(await res.json());
    } catch {
      // Non-critical — the panel just stays hidden.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (p: Prediction, action: 'accepted' | 'dismissed') => {
    if (!projectId) return;
    setResolving(p.id);
    try {
      await fetch('/api/brain/predictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId: p.id, action, projectId }),
      });
      setData((prev) =>
        prev ? { ...prev, predictions: prev.predictions.filter((x) => x.id !== p.id) } : prev
      );
      if (action === 'accepted') toast.success('Marked as next up', p.predicted_context_name);
    } catch {
      toast.error('Could not record your choice');
    } finally {
      setResolving(null);
    }
  };

  if (!projectId) return null;

  const predictions = data?.predictions ?? [];
  const accuracy = data?.accuracy;

  // Stay hidden when there's no model and nothing to show.
  if (!loading && predictions.length === 0 && (data?.modelSize ?? 0) === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-gray-900/80 to-purple-900/10 backdrop-blur-sm p-5 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <Compass className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-purple-100">Next Up</h3>
            <p className="text-xs text-gray-500">Where you&apos;re likely to work next, learned from your flow</p>
          </div>
        </div>
        {accuracy && accuracy.total > 0 && (
          <span className="text-[11px] text-gray-500">
            {Math.round(accuracy.accuracyRate * 100)}% accepted · {accuracy.total} tracked
          </span>
        )}
      </div>

      {loading && predictions.length === 0 ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your patterns…
        </div>
      ) : predictions.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          No prediction yet — keep moving across contexts and a pattern will emerge.
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {predictions.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-gray-200 font-medium truncate">{p.predicted_context_name}</span>
                    <span className="text-[11px] text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      {Math.round(p.confidence * 100)}%
                    </span>
                  </div>
                  {p.reasoning && <p className="text-xs text-gray-500 mt-1 truncate">{p.reasoning}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => resolve(p, 'accepted')}
                    disabled={resolving === p.id}
                    className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50"
                    title="Yes, that's next"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => resolve(p, 'dismissed')}
                    disabled={resolving === p.id}
                    className="p-1.5 rounded-md bg-gray-700/40 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Not really"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
