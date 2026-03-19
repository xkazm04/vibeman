'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown, Trash2, Copy, BookOpen, Code2, AlertTriangle, FileText, Tag } from 'lucide-react';
import type { DbKnowledgeEntry } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_LAYER_LABELS } from '@/app/db/models/knowledge.types';
import type { KnowledgeCategory, KnowledgeLayer } from '@/app/db/models/knowledge.types';
import { transition, fadeOnly } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ConfidenceBar from './ConfidenceBar';

interface EntryDetailPanelProps {
  entry: DbKnowledgeEntry | null;
  onClose: () => void;
  onFeedback: (entryId: string, helpful: boolean) => void;
  onDelete: (id: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  scan: 'Pattern Scan',
  insight_graduation: 'Insight Graduation',
  cli_session: 'CLI Session',
  cross_project: 'Cross-Project',
  manual: 'Manual Entry',
};

const PATTERN_TYPE_COLORS: Record<string, string> = {
  best_practice: 'text-emerald-400',
  anti_pattern: 'text-red-400',
  convention: 'text-blue-400',
  gotcha: 'text-amber-400',
  optimization: 'text-cyan-400',
};

export default function EntryDetailPanel({ entry, onClose, onFeedback, onDelete }: EntryDetailPanelProps) {
  const prefersReduced = useReducedMotion();

  const parseJson = (str: string): string[] => {
    try { return JSON.parse(str); } catch { return []; }
  };

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
            initial={prefersReduced ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={transition.expand}
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
                    <h2 className="text-base font-semibold text-zinc-100 truncate">{entry.title}</h2>
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
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6">
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

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => onFeedback(entry.id, true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Helpful
                </button>
                <button
                  onClick={() => onFeedback(entry.id, false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Not Helpful
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => {
                    onDelete(entry.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
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
