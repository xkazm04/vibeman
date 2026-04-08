'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown, Trash2, Copy, BookOpen, Code2, AlertTriangle, FileText, Tag, Map, ShieldCheck, Clock, Activity } from 'lucide-react';
import { KBErrorBanner } from './KBErrorStates';
import type { DbKnowledgeEntry, KnowledgeEntryProvenance } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_LAYER_LABELS } from '@/app/db/models/knowledge.types';
import type { KnowledgeCategory, KnowledgeLayer } from '@/app/db/models/knowledge.types';
import { fadeOnly } from '@/lib/motion';
import { parseJsonArray } from '@/lib/json-utils';
import { fullDrawer, fullDrawerTransition } from '../../lib/motionPresets';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ConfidenceBar from './ConfidenceBar';
import { BacklinksPanel } from '@/components/ui';

interface EntryDetailPanelProps {
  entry: DbKnowledgeEntry | null;
  onClose: () => void;
  onFeedback: (entryId: string, helpful: boolean) => void;
  onDelete: (id: string) => void;
  onOpenHubEditor?: (entry: DbKnowledgeEntry) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  scan: 'Pattern Scan',
  insight_graduation: 'Insight Graduation',
  cli_session: 'CLI Session',
  cross_project: 'Cross-Project',
  manual: 'Manual Entry',
};

function computeKnowledgeProvenance(entry: DbKnowledgeEntry): KnowledgeEntryProvenance {
  const now = Date.now();
  const createdMs = new Date(entry.created_at).getTime();
  const ageDays = Math.max(0, Math.floor((now - createdMs) / 86_400_000));

  let daysSinceLastApplied: number | null = null;
  if (entry.last_applied_at) {
    const lastMs = new Date(entry.last_applied_at).getTime();
    daysSinceLastApplied = Math.max(0, Math.floor((now - lastMs) / 86_400_000));
  }

  const helpfulnessRatio = entry.times_applied > 0
    ? Math.round((entry.times_helpful / entry.times_applied) * 100) / 100
    : null;

  const battleTested = entry.times_applied >= 10 && (helpfulnessRatio ?? 0) >= 0.7;

  return {
    sourceType: entry.source_type,
    sourceLabel: SOURCE_LABELS[entry.source_type] ?? entry.source_type,
    sourceProjectId: entry.source_project_id,
    sourceInsightId: entry.source_insight_id,
    confidence: entry.confidence,
    timesApplied: entry.times_applied,
    timesHelpful: entry.times_helpful,
    helpfulnessRatio,
    daysSinceLastApplied,
    ageDays,
    battleTested,
  };
}

const PATTERN_TYPE_COLORS: Record<string, string> = {
  best_practice: 'text-emerald-400',
  anti_pattern: 'text-red-400',
  convention: 'text-blue-400',
  gotcha: 'text-amber-400',
  optimization: 'text-cyan-400',
  hub: 'text-purple-400',
};

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const TITLE_ID = 'entry-detail-title';

export default function EntryDetailPanel({ entry, onClose, onFeedback, onDelete, onOpenHubEditor }: EntryDetailPanelProps) {
  const prefersReduced = useReducedMotion();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteGateReady, setDeleteGateReady] = useState(false);
  const deleteGateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset state when entry changes
  useEffect(() => {
    setConfirmDelete(false);
    setDeleteGateReady(false);
    setFeedbackError(null);
    if (deleteGateTimer.current) clearTimeout(deleteGateTimer.current);
  }, [entry?.id]);

  // Clean up gate timer on unmount
  useEffect(() => {
    return () => {
      if (deleteGateTimer.current) clearTimeout(deleteGateTimer.current);
    };
  }, []);

  // When entering confirm mode, start the 2-second countdown
  useEffect(() => {
    if (confirmDelete) {
      setDeleteGateReady(false);
      deleteGateTimer.current = setTimeout(() => {
        setDeleteGateReady(true);
      }, 2000);
    } else {
      setDeleteGateReady(false);
      if (deleteGateTimer.current) clearTimeout(deleteGateTimer.current);
    }
  }, [confirmDelete]);

  // Auto-focus close button on open
  useEffect(() => {
    if (entry) {
      // Small delay to let framer-motion render the panel
      const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [entry]);

  // Focus trap + Escape handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  const parseJson = (str: string): string[] => parseJsonArray(str);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <AnimatePresence>
      {entry && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={fadeOnly}
            initial={prefersReduced ? false : 'hidden'}
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            onKeyDown={handleKeyDown}
            variants={fullDrawer}
            initial={prefersReduced ? false : 'initial'}
            animate="animate"
            exit="exit"
            transition={fullDrawerTransition}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800/50 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 bg-purple-500/10"
                  >
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 id={TITLE_ID} className="text-base font-semibold text-zinc-100 truncate">{entry.title}</h2>
                    <p className="text-xs text-zinc-500">
                      {KNOWLEDGE_LAYER_LABELS[entry.layer as KnowledgeLayer] ?? entry.layer}
                      <span className="mx-1">{'>'}</span>
                      {KNOWLEDGE_CATEGORY_LABELS[entry.domain as KnowledgeCategory] ?? entry.domain}
                      <span className="mx-1.5">·</span>
                      <span className={PATTERN_TYPE_COLORS[entry.pattern_type] ?? 'text-zinc-400'}>
                        {entry.pattern_type.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  aria-label="Close detail panel"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6">
              {/* Hub CTA */}
              {entry.pattern_type === 'hub' && onOpenHubEditor && (
                <button
                  onClick={() => { onClose(); onOpenHubEditor(entry); }}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors text-left"
                >
                  <Map className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-purple-300">Open Map of Content</p>
                    <p className="text-xs text-zinc-500">View and manage linked entries in this hub</p>
                  </div>
                </button>
              )}

              {/* Confidence */}
              <div>
                <SectionLabel icon={BookOpen} label="Confidence" />
                <div className="mt-2">
                  <ConfidenceBar value={entry.confidence} size="md" showLabel />
                </div>
              </div>

              {/* Pattern */}
              <div>
                <SectionLabel icon={FileText} label="Pattern" />
                <div className="relative mt-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{entry.pattern}</p>
                  <button
                    onClick={() => copyToClipboard(entry.pattern)}
                    className="absolute top-2 right-2 p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rationale */}
              {entry.rationale && (
                <div>
                  <SectionLabel icon={BookOpen} label="Rationale" />
                  <p className="mt-2 text-sm text-zinc-400">{entry.rationale}</p>
                </div>
              )}

              {/* Code Example */}
              {entry.code_example && (
                <div>
                  <SectionLabel icon={Code2} label="Code Example" />
                  <div className="relative mt-2">
                    <pre className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50 text-xs text-zinc-300 overflow-x-auto">
                      <code>{entry.code_example}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(entry.code_example!)}
                      className="absolute top-2 right-2 p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Anti-Pattern */}
              {entry.anti_pattern && (
                <div>
                  <SectionLabel icon={AlertTriangle} label="Anti-Pattern" />
                  <div className="mt-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-sm text-red-300/80 whitespace-pre-wrap">{entry.anti_pattern}</p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {entry.tags && (
                <div>
                  <SectionLabel icon={Tag} label="Tags" />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parseJson(entry.tags).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-2xs text-zinc-400 border border-zinc-700/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance Trail */}
              <ProvenanceSection entry={entry} />

              {/* Cross-References */}
              <BacklinksPanel entityType="knowledge_entry" entityId={entry.id} />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <MetaItem label="Language" value={entry.language} />
                <MetaItem label="Layer" value={KNOWLEDGE_LAYER_LABELS[entry.layer as KnowledgeLayer] ?? entry.layer} />
                <MetaItem label="Category" value={KNOWLEDGE_CATEGORY_LABELS[entry.domain as KnowledgeCategory] ?? entry.domain} />
                <MetaItem label="Source" value={SOURCE_LABELS[entry.source_type] ?? entry.source_type} />
                <MetaItem label="Applied" value={`${entry.times_applied} times`} />
                <MetaItem label="Helpful" value={entry.times_applied > 0 ? `${Math.round((entry.times_helpful / entry.times_applied) * 100)}%` : 'N/A'} />
                <MetaItem label="Created" value={new Date(entry.created_at).toLocaleDateString()} />
                <MetaItem label="Status" value={entry.status} />
              </div>

              {/* Feedback error */}
              <AnimatePresence>
                {feedbackError && (
                  <div className="pb-2">
                    <KBErrorBanner
                      error={feedbackError}
                      context="feedback"
                      compact
                      reducedMotion={prefersReduced}
                      onDismiss={() => setFeedbackError(null)}
                    />
                  </div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => {
                    setFeedbackError(null);
                    try { onFeedback(entry.id, true); } catch { setFeedbackError('Failed to submit feedback'); }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Helpful
                </button>
                <button
                  onClick={() => {
                    setFeedbackError(null);
                    try { onFeedback(entry.id, false); } catch { setFeedbackError('Failed to submit feedback'); }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Not Helpful
                </button>
                <div className="flex-1" />
                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (!deleteGateReady) return;
                        onDelete(entry.id);
                        onClose();
                      }}
                      disabled={!deleteGateReady}
                      className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 border border-red-500 transition-colors overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* Countdown progress bar that shrinks from 100% to 0% over 2s */}
                      {!deleteGateReady && (
                        <span
                          className="absolute inset-y-0 left-0 bg-red-400/30 transition-all duration-[2000ms] ease-linear"
                          style={{ width: '0%' }}
                          ref={(el) => {
                            // Trigger the animation on next frame
                            if (el) requestAnimationFrame(() => { el.style.width = '100%'; });
                          }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteGateReady ? 'Confirm' : 'Wait...'}
                      </span>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-zinc-800/30 border border-zinc-800/30">
      <p className="text-2xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-xs text-zinc-300 capitalize">{value}</p>
    </div>
  );
}

function ProvenanceSection({ entry }: { entry: DbKnowledgeEntry }) {
  const prov = computeKnowledgeProvenance(entry);

  const freshnessLabel = (() => {
    if (prov.daysSinceLastApplied === null) return 'Never applied';
    if (prov.daysSinceLastApplied <= 7) return 'Fresh (< 1 week)';
    if (prov.daysSinceLastApplied <= 30) return 'Recent (< 1 month)';
    if (prov.daysSinceLastApplied <= 90) return 'Aging (< 3 months)';
    return 'Stale (> 3 months)';
  })();

  const freshnessColor = (() => {
    if (prov.daysSinceLastApplied === null) return 'text-zinc-500';
    if (prov.daysSinceLastApplied <= 7) return 'text-emerald-400';
    if (prov.daysSinceLastApplied <= 30) return 'text-cyan-400';
    if (prov.daysSinceLastApplied <= 90) return 'text-amber-400';
    return 'text-red-400';
  })();

  const trustLabel = (() => {
    if (prov.battleTested) return 'Battle-tested';
    if (prov.timesApplied >= 5 && (prov.helpfulnessRatio ?? 0) >= 0.5) return 'Proven';
    if (prov.timesApplied >= 1) return 'Used';
    return 'Untested';
  })();

  const trustColor = (() => {
    if (prov.battleTested) return 'text-emerald-400';
    if (prov.timesApplied >= 5 && (prov.helpfulnessRatio ?? 0) >= 0.5) return 'text-cyan-400';
    if (prov.timesApplied >= 1) return 'text-zinc-300';
    return 'text-zinc-500';
  })();

  return (
    <div>
      <SectionLabel icon={ShieldCheck} label="Provenance" />
      <div className="mt-2 space-y-2">
        {/* Trust badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${trustColor}`}>
            {trustLabel}
          </span>
          {prov.battleTested && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-2xs text-emerald-400 font-medium border border-emerald-500/20">
              Reliable
            </span>
          )}
        </div>

        {/* Provenance details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Activity className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <span className="text-2xs">Origin:</span>
            <span className="text-zinc-300 text-2xs">{prov.sourceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <span className="text-2xs">Age:</span>
            <span className="text-zinc-300 text-2xs">{prov.ageDays}d</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ThumbsUp className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <span className="text-2xs">Helpful:</span>
            <span className="text-zinc-300 text-2xs">
              {prov.helpfulnessRatio !== null ? `${Math.round(prov.helpfulnessRatio * 100)}%` : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className={`w-3 h-3 flex-shrink-0 ${freshnessColor}`} />
            <span className="text-2xs">Freshness:</span>
            <span className={`text-2xs ${freshnessColor}`}>{freshnessLabel}</span>
          </div>
        </div>

        {/* Reinforcement bar */}
        {prov.timesApplied > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-emerald-500/60 transition-all"
                style={{ width: `${Math.min(100, (prov.timesApplied / 50) * 100)}%` }}
              />
            </div>
            <span className="text-2xs text-zinc-500 tabular-nums whitespace-nowrap">
              {prov.timesApplied} applied / {prov.timesHelpful} helpful
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
