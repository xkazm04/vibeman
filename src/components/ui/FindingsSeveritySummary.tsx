'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, FileCode } from 'lucide-react';
import type { ScanFinding } from '@/lib/scan/types';

interface FindingsSeveritySummaryProps {
  findings: ScanFinding[];
}

type Severity = 'error' | 'warning' | 'info';

interface CategoryGroup {
  category: string;
  findings: ScanFinding[];
  severityCounts: Record<Severity, number>;
}

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; bar: string; label: string }> = {
  error:   { color: 'text-red-400',   bg: 'bg-red-500',   bar: 'bg-red-500',   label: 'Errors' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-400', bar: 'bg-amber-400', label: 'Warnings' },
  info:    { color: 'text-sky-400',   bg: 'bg-sky-400',   bar: 'bg-sky-400',   label: 'Info' },
};

const SEVERITY_ORDER: Severity[] = ['error', 'warning', 'info'];

function classifyCategory(finding: ScanFinding): string {
  if (finding.filePath) {
    const ext = finding.filePath.split('.').pop()?.toLowerCase();
    if (ext === 'ts' || ext === 'tsx') return 'TypeScript';
    if (ext === 'js' || ext === 'jsx') return 'JavaScript';
    if (ext === 'css' || ext === 'scss') return 'Styles';
    if (ext === 'json') return 'Configuration';
  }
  if (finding.title) {
    const t = finding.title.toLowerCase();
    if (t.includes('import') || t.includes('export')) return 'Imports & Exports';
    if (t.includes('type') || t.includes('interface')) return 'Type Safety';
    if (t.includes('perf') || t.includes('optim')) return 'Performance';
    if (t.includes('security') || t.includes('vuln')) return 'Security';
    if (t.includes('style') || t.includes('css')) return 'Styles';
    if (t.includes('test')) return 'Testing';
    if (t.includes('complex') || t.includes('refactor')) return 'Complexity';
    if (t.includes('dupl')) return 'Duplication';
  }
  return 'General';
}

export default function FindingsSeveritySummary({ findings }: FindingsSeveritySummaryProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredSegment, setHoveredSegment] = useState<Severity | null>(null);

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
    for (const f of findings) {
      const sev = f.severity || 'info';
      counts[sev]++;
    }
    return counts;
  }, [findings]);

  const total = findings.length;

  const categoryGroups = useMemo(() => {
    const map = new Map<string, ScanFinding[]>();
    for (const f of findings) {
      const cat = classifyCategory(f);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f);
    }

    const groups: CategoryGroup[] = [];
    for (const [category, catFindings] of map) {
      const severityCounts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
      for (const f of catFindings) {
        severityCounts[f.severity || 'info']++;
      }
      groups.push({ category, findings: catFindings, severityCounts });
    }

    // Sort: most errors first, then most warnings, then most findings
    groups.sort((a, b) => {
      if (a.severityCounts.error !== b.severityCounts.error) return b.severityCounts.error - a.severityCounts.error;
      if (a.severityCounts.warning !== b.severityCounts.warning) return b.severityCounts.warning - a.severityCounts.warning;
      return b.findings.length - a.findings.length;
    });

    return groups;
  }, [findings]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (total === 0) return null;

  return (
    <div className="space-y-3">
      {/* Severity Summary Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            {total} finding{total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            {SEVERITY_ORDER.map(sev => {
              const count = severityCounts[sev];
              if (count === 0) return null;
              const cfg = SEVERITY_CONFIG[sev];
              return (
                <span key={sev} className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                  {count} {cfg.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>

        {/* Proportional bar */}
        <div className="relative h-2 rounded-full bg-gray-800/60 overflow-hidden flex">
          {SEVERITY_ORDER.map(sev => {
            const count = severityCounts[sev];
            if (count === 0) return null;
            const pct = (count / total) * 100;
            const cfg = SEVERITY_CONFIG[sev];
            return (
              <motion.div
                key={sev}
                className={`relative h-full ${cfg.bar} cursor-default`}
                initial={{ width: 0 }}
                animate={{
                  width: `${pct}%`,
                  opacity: hoveredSegment && hoveredSegment !== sev ? 0.4 : 1,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                onMouseEnter={() => setHoveredSegment(sev)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
          })}

          {/* Tooltip */}
          <AnimatePresence>
            {hoveredSegment && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 border border-gray-700 shadow-lg z-10"
              >
                <span className={`text-xs font-medium ${SEVERITY_CONFIG[hoveredSegment].color}`}>
                  {severityCounts[hoveredSegment]} {SEVERITY_CONFIG[hoveredSegment].label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category Groups */}
      <div className="space-y-1.5">
        {categoryGroups.map((group, idx) => {
          const isExpanded = expandedCategories.has(group.category);
          return (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
              className="rounded-lg bg-gray-800/30 border border-gray-700/40 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/20 transition-colors text-left"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                </motion.div>

                <span className="text-sm font-medium text-gray-200 flex-1">
                  {group.category}
                </span>

                {/* Severity dot indicators */}
                <div className="flex items-center gap-1.5">
                  {SEVERITY_ORDER.map(sev => {
                    const count = group.severityCounts[sev];
                    if (count === 0) return null;
                    return (
                      <span
                        key={sev}
                        className={`w-1.5 h-1.5 rounded-full ${SEVERITY_CONFIG[sev].bg}`}
                        title={`${count} ${SEVERITY_CONFIG[sev].label.toLowerCase()}`}
                      />
                    );
                  })}
                </div>

                {/* Count badge */}
                <span className="text-2xs px-1.5 py-0.5 rounded-full bg-gray-700/60 text-gray-400 font-mono">
                  {group.findings.length}
                </span>
              </button>

              {/* Expanded findings */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 space-y-1">
                      {group.findings.map((finding, fIdx) => {
                        const sev = finding.severity || 'info';
                        const cfg = SEVERITY_CONFIG[sev];
                        return (
                          <motion.div
                            key={finding.id || `${finding.title}-${fIdx}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: fIdx * 0.02, duration: 0.15 }}
                            className="flex items-start gap-2 py-1.5 px-2 rounded bg-gray-900/30 border border-gray-700/20"
                          >
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.bg}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-200 font-medium truncate">
                                  {finding.title}
                                </span>
                                {finding.impact && (
                                  <span className="text-2xs px-1 py-0.5 rounded bg-gray-700/40 text-gray-500 flex-shrink-0">
                                    {finding.impact}
                                  </span>
                                )}
                              </div>
                              {finding.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {finding.description}
                                </p>
                              )}
                              {finding.filePath && (
                                <div className="flex items-center gap-1 mt-1">
                                  <FileCode className="w-3 h-3 text-cyan-400/60 flex-shrink-0" />
                                  <span className="text-cyan-400/80 font-mono text-xs truncate">
                                    {finding.filePath}
                                    {finding.lineNumber ? `:${finding.lineNumber}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
