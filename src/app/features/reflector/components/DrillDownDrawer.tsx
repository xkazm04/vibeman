'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, XIcon, Loader2,
  Lightbulb, Zap, Target,
} from 'lucide-react';
import { DbIdea } from '@/app/db';

/** Describes what chart segment was clicked to open the drill-down */
export interface DrillDownContext {
  /** Human-readable title shown in the drawer header */
  title: string;
  /** Subtitle / secondary label (e.g. "Tuesday" or "feature_scout") */
  subtitle?: string;
  /** Accent color for the drawer header border */
  accentColor?: string;
  /** The list of ideas to display */
  ideas: DrillDownIdea[];
  /** Optional summary stats shown in the header */
  stats?: {
    total?: number;
    accepted?: number;
    rejected?: number;
    pending?: number;
    acceptanceRate?: number;
  };
}

/** Minimal idea shape the drawer needs to render */
export interface DrillDownIdea {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  scanType?: string;
  effort?: number | null;
  impact?: number | null;
  createdAt?: string;
  /** Full DbIdea for action support */
  _raw?: DbIdea;
}

interface DrillDownDrawerProps {
  context: DrillDownContext | null;
  onClose: () => void;
  /** Called after an idea is accepted/rejected so parent can refresh */
  onIdeaAction?: (ideaId: string, action: 'accepted' | 'rejected') => void;
}

const STATUS_CONFIG = {
  accepted: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Accepted' },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Rejected' },
  implemented: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Implemented' },
  pending: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Pending' },
} as const;

export default function DrillDownDrawer({ context, onClose, onIdeaAction }: DrillDownDrawerProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  // Reset filter when context changes
  useEffect(() => {
    setFilter(null);
  }, [context]);

  const handleAction = useCallback(async (ideaId: string, action: 'accepted' | 'rejected') => {
    setProcessingId(ideaId);
    try {
      const response = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ideaId, status: action }),
      });
      if (response.ok) {
        onIdeaAction?.(ideaId, action);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setProcessingId(null);
    }
  }, [onIdeaAction]);

  const filteredIdeas = filter
    ? context?.ideas.filter(i => i.status === filter) ?? []
    : context?.ideas ?? [];

  // Count by status
  const statusCounts = context?.ideas.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <AnimatePresence>
      {context && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 flex flex-col
              bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900
              border-l shadow-2xl shadow-black/50"
            style={{ borderColor: context.accentColor || 'rgba(107, 114, 128, 0.3)' }}
          >
            {/* Header */}
            <div
              className="flex-shrink-0 px-5 py-4 border-b"
              style={{ borderColor: context.accentColor || 'rgba(107, 114, 128, 0.2)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-white truncate">
                      {context.title}
                    </h2>
                  </div>
                  {context.subtitle && (
                    <p className="text-xs font-mono text-gray-500 ml-6">{context.subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Close drill-down"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Stats summary */}
              {context.stats && (
                <div className="flex items-center gap-3 mb-3">
                  {context.stats.total !== undefined && (
                    <div className="px-2 py-1 bg-gray-800/60 rounded border border-gray-700/50">
                      <span className="text-[10px] text-gray-500 font-mono">TOTAL </span>
                      <span className="text-xs text-white font-mono font-bold">{context.stats.total}</span>
                    </div>
                  )}
                  {context.stats.acceptanceRate !== undefined && (
                    <div className="px-2 py-1 bg-gray-800/60 rounded border border-gray-700/50">
                      <span className="text-[10px] text-gray-500 font-mono">RATE </span>
                      <span className={`text-xs font-mono font-bold ${
                        context.stats.acceptanceRate >= 70 ? 'text-emerald-400' :
                        context.stats.acceptanceRate >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>{context.stats.acceptanceRate}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilter(null)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-all border ${
                    filter === null
                      ? 'bg-gray-700/60 text-white border-gray-500/50'
                      : 'bg-gray-800/40 text-gray-500 border-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  ALL {context.ideas.length}
                </button>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  if (!config) return null;
                  return (
                    <button
                      key={status}
                      onClick={() => setFilter(filter === status ? null : status)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-all border ${
                        filter === status
                          ? `${config.bg} ${config.color} ${config.border}`
                          : 'bg-gray-800/40 text-gray-500 border-gray-700/30 hover:text-gray-300'
                      }`}
                    >
                      {config.label.toUpperCase()} {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ideas List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredIdeas.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-gray-600"
                  >
                    <Lightbulb className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-mono">NO_MATCHING_IDEAS</p>
                  </motion.div>
                ) : (
                  filteredIdeas.map((idea, index) => {
                    const statusConf = STATUS_CONFIG[idea.status];
                    const isProcessing = processingId === idea.id;

                    return (
                      <motion.div
                        key={idea.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        className={`group relative rounded-lg border p-3 transition-all duration-200
                          ${statusConf.border} ${statusConf.bg}
                          hover:shadow-lg hover:shadow-black/20`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Status indicator */}
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            idea.status === 'accepted' ? 'bg-emerald-400' :
                            idea.status === 'rejected' ? 'bg-red-400' :
                            idea.status === 'implemented' ? 'bg-cyan-400' :
                            'bg-purple-400'
                          }`} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 leading-relaxed mb-1">
                              {idea.title}
                            </p>

                            {idea.description && (
                              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-1.5">
                                {idea.description}
                              </p>
                            )}

                            {/* Metadata row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusConf.bg} ${statusConf.color} ${statusConf.border} border`}>
                                {statusConf.label}
                              </span>

                              {idea.scanType && (
                                <span className="text-[9px] font-mono text-gray-600 px-1.5 py-0.5 rounded bg-gray-800/40 border border-gray-700/30">
                                  {idea.scanType.replace(/_/g, ' ')}
                                </span>
                              )}

                              {idea.effort != null && (
                                <span className="text-[9px] font-mono text-gray-600">
                                  E:{idea.effort}
                                </span>
                              )}
                              {idea.impact != null && (
                                <span className="text-[9px] font-mono text-gray-600">
                                  I:{idea.impact}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons for pending ideas */}
                          {idea.status === 'pending' && (
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleAction(idea.id, 'accepted')}
                                    className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30
                                      hover:bg-emerald-500/20 transition-all"
                                    title="Accept idea"
                                    aria-label={`Accept: ${idea.title}`}
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </button>
                                  <button
                                    onClick={() => handleAction(idea.id, 'rejected')}
                                    className="p-1.5 rounded-md bg-red-500/10 border border-red-500/30
                                      hover:bg-red-500/20 transition-all"
                                    title="Reject idea"
                                    aria-label={`Reject: ${idea.title}`}
                                  >
                                    <XIcon className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-gray-800/50 bg-gray-950/80">
              <div className="flex items-center justify-between text-[10px] text-gray-600 font-mono">
                <span>SHOWING {filteredIdeas.length} OF {context.ideas.length}</span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  DRILL_DOWN_VIEW
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Convert a DbIdea to a DrillDownIdea
 */
export function dbIdeaToDrillDown(idea: DbIdea): DrillDownIdea {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    scanType: idea.scan_type,
    effort: idea.effort,
    impact: idea.impact,
    createdAt: idea.created_at,
    _raw: idea,
  };
}
