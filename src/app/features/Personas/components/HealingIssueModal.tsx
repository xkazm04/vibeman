'use client';

import { X, AlertTriangle, Wrench, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  prompt: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  tool: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  config: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  external: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

interface HealingIssueModalProps {
  issue: {
    id: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    suggested_fix: string | null;
    persona_id: string;
    execution_id: string | null;
    created_at: string;
    auto_fixed?: number;
    status?: string;
  };
  onResolve: (id: string) => void;
  onClose: () => void;
}

export default function HealingIssueModal({ issue, onResolve, onClose }: HealingIssueModalProps) {
  const sev = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.medium;
  const cat = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.prompt;
  const isAutoFixed = issue.auto_fixed === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg mx-4 bg-background border border-primary/20 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-primary/10">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-sm font-semibold text-foreground/90 mb-2">{issue.title}</h3>
            <div className="flex items-center gap-2">
              {isAutoFixed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" />
                  auto-fixed
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase rounded-md border ${sev.bg} ${sev.text} ${sev.border}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {issue.severity}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase rounded-md border ${cat.bg} ${cat.text} ${cat.border}`}>
                {issue.category}
              </span>
              <span className="text-[10px] text-muted-foreground/40">
                {new Date(issue.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground/50 hover:text-foreground/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h4 className="text-xs font-mono uppercase text-muted-foreground/50 mb-2">Analysis</h4>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {issue.description}
            </div>
          </div>

          {issue.suggested_fix && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="text-xs font-mono uppercase text-emerald-400/80">Suggested Fix</h4>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {issue.suggested_fix}
              </div>
            </div>
          )}

          {issue.execution_id && (
            <div className="text-[10px] font-mono text-muted-foreground/30">
              Execution: {issue.execution_id}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-primary/10 bg-secondary/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground/60 hover:text-foreground/80 rounded-lg hover:bg-secondary/60 transition-colors"
          >
            Close
          </button>
          {!isAutoFixed && (
            <button
              onClick={() => onResolve(issue.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Resolve
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
