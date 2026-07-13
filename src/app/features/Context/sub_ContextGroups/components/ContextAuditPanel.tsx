'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { auditProject, type ContextAuditResponse } from '../../lib';
import type { AuditFinding } from '@/lib/contexts/audit';

interface ContextAuditPanelProps {
  projectId: string;
  /** Deep-link callback: jump to a group when a finding references one. */
  onSelectGroup?: (groupId: string) => void;
}

const severityStyles: Record<
  AuditFinding['severity'],
  { border: string; bg: string; text: string; icon: React.ReactNode; label: string }
> = {
  warn: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Warnings',
  },
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    icon: <Info className="w-4 h-4" />,
    label: 'Suggestions',
  },
};

const SEVERITY_ORDER: AuditFinding['severity'][] = ['warn', 'info'];

/**
 * ContextAuditPanel — renders the advisory Context Balance Audit
 * (GET /api/contexts/audit) grouped by severity, with a totals rollup.
 */
export default function ContextAuditPanel({ projectId, onSelectGroup }: ContextAuditPanelProps) {
  const [report, setReport] = useState<ContextAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    auditProject(projectId)
      .then((res) => {
        if (!cancelled) setReport(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to run audit');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const grouped = useMemo(() => {
    const map: Record<AuditFinding['severity'], AuditFinding[]> = { warn: [], info: [] };
    for (const f of report?.findings ?? []) {
      map[f.severity].push(f);
    }
    return map;
  }, [report]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-sm text-gray-400 font-mono">Auditing context map…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!report) return null;

  const { totals, tier, ok } = report;

  return (
    <div className="space-y-6">
      {/* Health summary rollup */}
      <div
        className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border p-4 ${
          ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'
        }`}
      >
        <div className="flex items-center gap-2">
          {ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span className={`text-sm font-semibold ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
            {ok ? 'Balanced' : 'Needs attention'}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono uppercase tracking-wide">{tier} tier</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-300 font-mono">
          <span>{totals.groups} groups</span>
          <span>{totals.contexts} contexts</span>
          <span>{totals.files} files</span>
          <span className={totals.overlappingFiles > 0 ? 'text-amber-400' : ''}>
            {totals.overlappingFiles} overlapping
          </span>
          <span className={totals.uncategorizedContexts > 0 ? 'text-amber-400' : ''}>
            {totals.uncategorizedContexts} uncategorized
          </span>
          <span className={totals.groupsMissingDomain > 0 ? 'text-amber-400' : ''}>
            {totals.groupsMissingDomain} missing domain
          </span>
          <span className={totals.staleContexts > 0 ? 'text-amber-400' : ''}>
            {totals.staleContexts} stale
          </span>
          <span className={totals.missingFiles > 0 ? 'text-amber-400' : ''}>
            {totals.missingFiles} with missing files
          </span>
          <span className={totals.contentStaleContexts > 0 ? 'text-amber-400' : ''}>
            {totals.contentStaleContexts} content-drifted
          </span>
          <span className={totals.unresolvedCrossRefs > 0 ? 'text-amber-400' : ''}>
            {totals.unresolvedCrossRefs} broken refs
          </span>
        </div>
      </div>

      {/* No findings */}
      {report.findings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
          <p className="text-sm text-gray-300">No issues found — the context map is well balanced.</p>
        </div>
      )}

      {/* Findings grouped by severity */}
      {SEVERITY_ORDER.map((severity) => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const style = severityStyles[severity];
        return (
          <div key={severity} className="space-y-2">
            <div className={`flex items-center gap-2 ${style.text}`}>
              {style.icon}
              <h4 className="text-sm font-semibold">
                {style.label} <span className="text-gray-500">({items.length})</span>
              </h4>
            </div>
            <div className="space-y-2">
              {items.map((f, i) => {
                const clickable = !!f.groupId && !!onSelectGroup;
                return (
                  <motion.div
                    key={`${f.code}-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onSelectGroup!(f.groupId!) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectGroup!(f.groupId!);
                            }
                          }
                        : undefined
                    }
                    className={`rounded-lg border px-3 py-2.5 text-sm ${style.border} ${style.bg} ${
                      clickable
                        ? 'cursor-pointer hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-200">{f.message}</span>
                      <code className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500 font-mono pt-0.5">
                        {f.code}
                      </code>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Re-export for callers that prefer a named import.
export { ContextAuditPanel };
