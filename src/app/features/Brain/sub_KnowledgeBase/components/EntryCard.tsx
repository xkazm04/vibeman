'use client';

import { motion } from 'framer-motion';
import { BookOpen, ThumbsUp, Clock, Tag } from 'lucide-react';
import type { DbKnowledgeEntry } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_DOMAIN_LABELS } from '@/app/db/models/knowledge.types';
import { GlassCard } from '@/components/ui/GlassCard';
import { transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DOMAIN_CONFIG } from './DomainCard';
import ConfidenceBar from './ConfidenceBar';

const PATTERN_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  best_practice: { label: 'Best Practice', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  anti_pattern:  { label: 'Anti-Pattern',  className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  convention:    { label: 'Convention',     className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  gotcha:        { label: 'Gotcha',         className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  optimization:  { label: 'Optimization',   className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
};

interface EntryCardProps {
  entry: DbKnowledgeEntry;
  onClick: () => void;
  index: number;
}

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function EntryCard({ entry, onClick, index }: EntryCardProps) {
  const prefersReduced = useReducedMotion();
  const domainCfg = DOMAIN_CONFIG[entry.domain]!;
  const patternType = PATTERN_TYPE_LABELS[entry.pattern_type] ?? PATTERN_TYPE_LABELS.convention;
  const tags: string[] = (() => {
    try { return JSON.parse(entry.tags); } catch { return []; }
  })();
  const helpRate = entry.times_applied > 0
    ? Math.round((entry.times_helpful / entry.times_applied) * 100)
    : null;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...transition.normal, delay: index * 0.03 }}
    >
      <GlassCard
        hover
        clickable
        onClick={onClick}
        padding="none"
        className="p-4"
      >
        <div className="flex items-start gap-3">
          {/* Domain icon */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0 mt-0.5"
            style={{ background: domainCfg.accent }}
          >
            <domainCfg.icon className={`w-4 h-4 ${domainCfg.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-zinc-200 truncate flex-1">{entry.title}</h4>
              <span className={`px-1.5 py-0.5 text-2xs font-medium rounded border ${patternType.className}`}>
                {patternType.label}
              </span>
            </div>

            {/* Pattern preview */}
            <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{entry.pattern}</p>

            {/* Confidence bar */}
            <div className="mb-2">
              <ConfidenceBar value={entry.confidence} size="sm" showLabel />
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-2xs text-zinc-500">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {KNOWLEDGE_DOMAIN_LABELS[entry.domain]}
              </span>
              {entry.times_applied > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {helpRate !== null ? `${helpRate}%` : '0%'} ({entry.times_applied})
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {relTime(entry.created_at)}
              </span>
              {entry.source_type === 'cross_project' && (
                <span className="px-1 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">
                  cross-project
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.slice(0, 5).map(tag => (
                  <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800/60 text-2xs text-zinc-400 border border-zinc-700/30">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
                {tags.length > 5 && (
                  <span className="text-2xs text-zinc-500">+{tags.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
