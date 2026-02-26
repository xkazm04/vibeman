/**
 * Next Up Card
 * Displays predictive intent suggestions based on Markov chain analysis
 * of the developer's context transition patterns.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  Target,
  Clock,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';
import type { IntentPrediction } from '@/lib/brain/predictiveIntentEngine';

const ACCENT_COLOR = '#10b981'; // Emerald
const GLOW_COLOR = 'rgba(16, 185, 129, 0.15)';

interface PredictionData {
  predictions: IntentPrediction[];
  currentContextId: string | null;
  currentContextName: string | null;
  modelSize: number;
  accuracy: {
    total: number;
    accepted: number;
    dismissed: number;
    expired: number;
    accuracyRate: number;
  };
}

interface Props {
  projectId: string | null;
  scope?: 'project' | 'global';
}

export default function NextUpCard({ projectId, scope = 'project' }: Props) {
  const [data, setData] = useState<PredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const fetchPredictions = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/brain/predictions?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          setResolvedIds(new Set());
        }
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handleRefresh = useCallback(async () => {
    if (!projectId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/brain/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          setResolvedIds(new Set());
        }
      }
    } catch {
      // Non-critical
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, isRefreshing]);

  const handleResolve = useCallback(async (predictionId: string, action: 'accepted' | 'dismissed') => {
    try {
      await fetch('/api/brain/predictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId, action }),
      });
      setResolvedIds(prev => new Set(prev).add(predictionId));
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  if (scope === 'global') {
    return (
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-emerald-500/20">
        <div className="p-6">
          <BrainPanelHeader
            icon={Zap}
            title="Next Up"
            accentColor={ACCENT_COLOR}
            glowColor={GLOW_COLOR}
            glow
          />
          <p className="text-zinc-500 text-sm">
            Select a specific project to see predictive intent suggestions.
          </p>
        </div>
      </GlowCard>
    );
  }

  if (isLoading && !data) {
    return (
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-emerald-500/20" animate={false}>
        <div className="p-6">
          <BrainPanelHeader
            icon={Zap}
            title="Next Up"
            accentColor={ACCENT_COLOR}
            glowColor={GLOW_COLOR}
            glow
          />
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-zinc-800/30 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </GlowCard>
    );
  }

  const hasPredictions = data && data.predictions.length > 0;
  const hasModel = data && data.modelSize > 0;

  return (
    <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-emerald-500/20">
      <div className="p-6">
        <BrainPanelHeader
          icon={Zap}
          title="Next Up"
          accentColor={ACCENT_COLOR}
          glowColor={GLOW_COLOR}
          glow
          trailing={
            data?.accuracy && data.accuracy.total > 0 ? (
              <span
                className="text-2xs font-mono px-1.5 py-0.5 rounded"
                style={{
                  color: ACCENT_COLOR,
                  background: `${ACCENT_COLOR}15`,
                }}
                title={`${data.accuracy.accepted} accepted / ${data.accuracy.total} resolved predictions`}
              >
                {Math.round(data.accuracy.accuracyRate * 100)}% accurate
              </span>
            ) : undefined
          }
          right={
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              title="Refresh predictions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          }
        />

        {/* Current context indicator */}
        {data?.currentContextName && (
          <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
            <Target className="w-3 h-3" style={{ color: ACCENT_COLOR }} />
            <span>Currently in: <span className="text-zinc-300 font-medium">{data.currentContextName}</span></span>
          </div>
        )}

        {!hasPredictions && !hasModel && (
          <div className="text-center py-6">
            <Zap className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 mb-1">No predictions yet</p>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">
              The predictive engine learns from your context navigation patterns.
              Keep working and predictions will appear after enough transitions are recorded.
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
              style={{
                color: ACCENT_COLOR,
                borderColor: `${ACCENT_COLOR}40`,
                background: `${ACCENT_COLOR}10`,
              }}
            >
              {isRefreshing ? 'Analyzing...' : 'Analyze patterns'}
            </button>
          </div>
        )}

        {!hasPredictions && hasModel && (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500 mb-1">No predictions for current state</p>
            <p className="text-xs text-zinc-600">
              {data.modelSize} transitions recorded. Navigate to a context to get suggestions.
            </p>
          </div>
        )}

        {/* Prediction cards */}
        {hasPredictions && (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {data.predictions.map((prediction, index) => {
                const isResolved = resolvedIds.has(prediction.contextId);
                return (
                  <motion.div
                    key={prediction.contextId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isResolved ? 0.4 : 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative"
                  >
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                      style={{
                        background: index === 0
                          ? `linear-gradient(135deg, ${ACCENT_COLOR}08 0%, transparent 100%)`
                          : 'rgba(24, 24, 27, 0.5)',
                        borderColor: index === 0 ? `${ACCENT_COLOR}25` : 'rgba(63, 63, 70, 0.3)',
                      }}
                    >
                      {/* Rank indicator */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: `${ACCENT_COLOR}${index === 0 ? '20' : '10'}`,
                          color: index === 0 ? ACCENT_COLOR : 'rgb(161, 161, 170)',
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {prediction.contextName}
                          </span>
                          <ConfidenceBadge confidence={prediction.confidence} />
                        </div>
                        <p className="text-2xs text-zinc-500 mt-0.5 truncate">
                          {prediction.reasoning}
                        </p>
                        {prediction.avgTransitionTimeMs > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-2xs text-zinc-600">
                            <Clock className="w-2.5 h-2.5" />
                            <span>~{formatDuration(prediction.avgTransitionTimeMs)} avg</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isResolved && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleResolve(prediction.contextId, 'accepted')}
                            className="p-1 rounded-md hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors"
                            title="This prediction was correct"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleResolve(prediction.contextId, 'dismissed')}
                            className="p-1 rounded-md hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Dismiss this prediction"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {isResolved && (
                        <span className="text-2xs text-zinc-600 italic">resolved</span>
                      )}

                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Model stats footer */}
        {hasModel && (
          <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-2xs text-zinc-600">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" title="Transition model size">
                <BarChart3 className="w-3 h-3" />
                <span>{data.modelSize} transitions</span>
              </div>
              {data.accuracy.total > 0 && (
                <div className="flex items-center gap-1" title="Prediction accuracy">
                  <TrendingUp className="w-3 h-3" />
                  <span>{data.accuracy.accepted}/{data.accuracy.total} correct</span>
                </div>
              )}
            </div>
            <span className="text-zinc-700">Markov chain model</span>
          </div>
        )}
      </div>
    </GlowCard>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#6b7280';

  return (
    <span
      className="text-2xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}25`,
      }}
    >
      {pct}%
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
