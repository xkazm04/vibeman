'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Target, Lightbulb, FolderOpen, BookOpen, Loader2 } from 'lucide-react';
import ExpandChevron from '@/components/ui/ExpandChevron';
import { expandCollapse } from '@/lib/motion';

interface BacklinkItem {
  entity_type: 'idea' | 'goal' | 'context' | 'knowledge_entry';
  entity_id: string;
  title: string;
  status: string | null;
  relationship: string;
}

interface BacklinksPanelProps {
  entityType: 'context' | 'goal' | 'idea' | 'knowledge_entry';
  entityId: string;
}

const ENTITY_ICON: Record<string, typeof Target> = {
  goal: Target,
  idea: Lightbulb,
  context: FolderOpen,
  knowledge_entry: BookOpen,
};

const ENTITY_COLORS: Record<string, string> = {
  goal: 'text-amber-400',
  idea: 'text-cyan-400',
  context: 'text-purple-400',
  knowledge_entry: 'text-emerald-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  pending: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  implemented: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  deprecated: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function BacklinksPanel({ entityType, entityId }: BacklinksPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchBacklinks = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/backlinks?entity_type=${entityType}&entity_id=${entityId}`);
      if (res.ok) {
        const data = await res.json();
        setBacklinks(data.backlinks ?? []);
      }
    } catch {
      // Silent fail — backlinks are supplementary
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [entityType, entityId, fetched]);

  // Reset when entity changes
  useEffect(() => {
    setBacklinks([]);
    setFetched(false);
    setExpanded(false);
  }, [entityId]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !fetched) {
      fetchBacklinks();
    }
  };

  return (
    <div>
      {/* Toggle Header */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left group"
      >
        <div className="flex items-center justify-center w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors">
          <ExpandChevron expanded={expanded} className="w-3.5 h-3.5" />
        </div>
        <Link2 className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
          Backlinks
        </span>
        {fetched && backlinks.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-800/60 text-2xs text-zinc-500 border border-zinc-700/30">
            {backlinks.length}
          </span>
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            variants={expandCollapse}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 pl-6">
              {loading && (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                  <span className="text-xs text-zinc-500">Loading references...</span>
                </div>
              )}

              {fetched && backlinks.length === 0 && !loading && (
                <p className="text-xs text-zinc-600 py-2 italic">No cross-references found</p>
              )}

              {backlinks.map((bl) => {
                const Icon = ENTITY_ICON[bl.entity_type] ?? Link2;
                const color = ENTITY_COLORS[bl.entity_type] ?? 'text-zinc-400';
                const statusClass = bl.status ? STATUS_COLORS[bl.status] ?? STATUS_COLORS.pending : null;

                return (
                  <div
                    key={`${bl.entity_type}-${bl.entity_id}`}
                    className="flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors group/item"
                  >
                    <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-300 truncate leading-snug">
                        {bl.title}
                      </p>
                      <p className="text-2xs text-zinc-600 mt-0.5">
                        {bl.relationship}
                      </p>
                    </div>
                    {statusClass && (
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-2xs border ${statusClass}`}>
                        {bl.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
