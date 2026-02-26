'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, AlertTriangle, ArrowRight, Target } from 'lucide-react';
import type { BlastRadiusResult, ImpactLevel } from '../sub_WorkspaceArchitecture/lib/blastRadiusEngine';
import { BLAST_RADIUS_COLORS } from '../sub_WorkspaceArchitecture/lib/blastRadiusEngine';

interface BlastRadiusPanelProps {
  result: BlastRadiusResult | null;
  originName: string;
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
}

const IMPACT_LABELS: Record<ImpactLevel, string> = {
  origin: 'Origin',
  direct: 'Direct',
  second: '2nd Order',
  third: '3rd Order+',
};

const RISK_LABELS: Record<ImpactLevel, string> = {
  origin: 'Source',
  direct: 'High Risk',
  second: 'Medium Risk',
  third: 'Low Risk',
};

export default function BlastRadiusPanel({
  result,
  originName,
  onClose,
  onNodeClick,
}: BlastRadiusPanelProps) {
  if (!result) return null;

  const { summary, affectedNodes } = result;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15 }}
        className="absolute top-4 right-4 z-20 w-72"
      >
        <div className="bg-zinc-900/95 backdrop-blur-md rounded-xl border border-red-500/20 shadow-2xl shadow-red-500/5 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md" style={{ background: `${BLAST_RADIUS_COLORS.origin}20` }}>
                <Zap className="w-3.5 h-3.5" style={{ color: BLAST_RADIUS_COLORS.origin }} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200">Impact Mode</h3>
                <p className="text-2xs text-zinc-500 mt-0.5">Blast radius from <span className="text-zinc-300">{originName}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Summary badges */}
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-zinc-800/30">
            <SummaryBadge level="direct" count={summary.direct} />
            <SummaryBadge level="second" count={summary.second} />
            <SummaryBadge level="third" count={summary.third} />
            <span className="text-2xs text-zinc-600 ml-auto">
              {summary.total} affected
            </span>
          </div>

          {/* Affected nodes list */}
          <div className="max-h-64 overflow-y-auto">
            {affectedNodes.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Target className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No downstream dependencies</p>
                <p className="text-2xs text-zinc-600 mt-1">This node has no outgoing connections</p>
              </div>
            ) : (
              <div className="py-1">
                {affectedNodes.map((node) => (
                  <button
                    key={node.nodeId}
                    onClick={() => onNodeClick?.(node.nodeId)}
                    className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-zinc-800/50 transition-colors text-left group"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: BLAST_RADIUS_COLORS[node.impactLevel] }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-zinc-300 truncate block group-hover:text-zinc-100 transition-colors">
                        {node.nodeName}
                      </span>
                    </div>
                    <span
                      className="text-2xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        color: BLAST_RADIUS_COLORS[node.impactLevel],
                        background: `${BLAST_RADIUS_COLORS[node.impactLevel]}15`,
                      }}
                    >
                      {RISK_LABELS[node.impactLevel]}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {summary.total > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800/30 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500/60" />
              <span className="text-2xs text-zinc-600">
                Changes may require updates in {summary.total} service{summary.total !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function SummaryBadge({ level, count }: { level: ImpactLevel; count: number }) {
  if (count === 0) return null;
  const color = BLAST_RADIUS_COLORS[level];

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-medium"
      style={{
        color,
        background: `${color}12`,
        border: `1px solid ${color}25`,
      }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {count} {IMPACT_LABELS[level]}
    </div>
  );
}
