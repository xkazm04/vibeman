/**
 * ImpactAnalysisPanel Component
 * Displays the detailed impact analysis results in a slide-out panel
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  FileCode,
  TestTube2,
  Package,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { ImpactAnalysisResult, ImpactItem, ImpactSeverity } from '../sub_DocsAnalysis/lib/impactSimulator/types';

interface ImpactAnalysisPanelProps {
  result: ImpactAnalysisResult;
  onClose: () => void;
  onConfirmMove?: () => void;
  isOpen: boolean;
}

// Severity color mapping
const severityColors: Record<ImpactSeverity, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

// Icon mapping for categories
const categoryIcons = {
  import_path: FileCode,
  test_breakage: TestTube2,
  build_impact: Package,
  refactor_effort: Clock,
  dependency: ArrowRight,
  api_contract: AlertCircle,
};

// Collapsible section component
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-gray-700/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-800/40 hover:bg-gray-800/60 transition-colors"
        data-testid={`impact-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {badge}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-gray-900/40">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Impact item card
function ImpactItemCard({ item }: { item: ImpactItem }) {
  const colors = severityColors[item.severity];
  const Icon = categoryIcons[item.category] || AlertCircle;

  return (
    <div
      className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
      data-testid={`impact-item-${item.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white">{item.title}</h4>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${colors.bg} ${colors.text}`}
            >
              {item.severity}
            </span>
          </div>
          <p className="text-xs text-gray-400">{item.description}</p>
          {item.estimatedEffort && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
              <span>{item.estimatedEffort.files} files</span>
              <span>~{item.estimatedEffort.hours.toFixed(1)}h</span>
            </div>
          )}
          {item.affectedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.affectedFiles.slice(0, 3).map((file, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-[9px] rounded bg-gray-700/50 text-gray-400 truncate max-w-[150px]"
                  title={file}
                >
                  {file.split('/').pop()}
                </span>
              ))}
              {item.affectedFiles.length > 3 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded bg-gray-700/50 text-gray-400">
                  +{item.affectedFiles.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImpactAnalysisPanel({
  result,
  onClose,
  onConfirmMove,
  isOpen,
}: ImpactAnalysisPanelProps) {
  const { proposedMove, summary, impactItems, warnings, recommendations } = result;
  const summaryColors = severityColors[summary.riskLevel];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="impact-panel-backdrop"
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-gray-900 border-l border-gray-700/50 z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            data-testid="impact-analysis-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
              <div>
                <h2 className="text-lg font-semibold text-white">Impact Analysis</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Predicted changes for this architectural move
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                data-testid="impact-panel-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Move Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <ArrowRight className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Proposed Move</h3>
                    <p className="text-xs text-gray-400">{proposedMove.contextName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 rounded bg-gray-800/60 text-gray-300">
                    {proposedMove.sourceGroupName}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {proposedMove.targetGroupName}
                  </span>
                </div>
                {proposedMove.sourceLayer !== proposedMove.targetLayer && (
                  <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Layer change: {proposedMove.sourceLayer || 'none'} → {proposedMove.targetLayer || 'none'}
                  </div>
                )}
              </div>

              {/* Effort Summary */}
              <div
                className={`p-4 rounded-xl border ${summaryColors.bg} ${summaryColors.border}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">Refactoring Effort</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${summaryColors.bg} ${summaryColors.text}`}
                  >
                    {summary.complexity}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{summary.totalFiles}</div>
                    <div className="text-[10px] text-gray-400">Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{summary.totalImportChanges}</div>
                    <div className="text-[10px] text-gray-400">Imports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{summary.estimatedHours}h</div>
                    <div className="text-[10px] text-gray-400">Est. Time</div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <CollapsibleSection
                  title="Warnings"
                  defaultOpen={true}
                  badge={
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                      {warnings.length}
                    </span>
                  }
                >
                  <div className="space-y-2">
                    {warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200">{warning}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Impact Items */}
              <CollapsibleSection
                title="Detailed Impact"
                defaultOpen={true}
                badge={
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-400">
                    {impactItems.length}
                  </span>
                }
              >
                <div className="space-y-3">
                  {impactItems.map(item => (
                    <ImpactItemCard key={item.id} item={item} />
                  ))}
                </div>
              </CollapsibleSection>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <CollapsibleSection
                  title="Recommendations"
                  badge={
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                      {recommendations.length}
                    </span>
                  }
                >
                  <div className="space-y-2">
                    {recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-200">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Import Path Changes */}
              {result.importPathChanges.length > 0 && (
                <CollapsibleSection
                  title="Import Path Changes"
                  badge={
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-400">
                      {result.importPathChanges.length}
                    </span>
                  }
                >
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.importPathChanges.slice(0, 10).map((change, i) => (
                      <div key={i} className="p-2 rounded bg-gray-800/50 text-xs font-mono">
                        <div className="text-gray-400 truncate" title={change.filePath}>
                          {change.filePath.split('/').slice(-2).join('/')}
                        </div>
                        <div className="text-red-400/80 line-through truncate">{change.oldImport}</div>
                        <div className="text-emerald-400/80 truncate">{change.newImport}</div>
                      </div>
                    ))}
                    {result.importPathChanges.length > 10 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{result.importPathChanges.length - 10} more changes
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Test Breakages */}
              {result.testBreakages.length > 0 && (
                <CollapsibleSection
                  title="Potential Test Breakages"
                  badge={
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                      {result.testBreakages.length}
                    </span>
                  }
                >
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.testBreakages.map((test, i) => (
                      <div key={i} className="p-2 rounded bg-gray-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-300 truncate">
                            {test.testFile.split('/').pop()}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              test.confidence > 70
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {test.confidence}%
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">{test.reason}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4" />
                <span>Analysis is predictive and may not capture all impacts</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  data-testid="impact-panel-cancel-btn"
                >
                  Cancel
                </button>
                {onConfirmMove && (
                  <button
                    onClick={onConfirmMove}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      summary.riskLevel === 'critical'
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                    }`}
                    data-testid="impact-panel-confirm-btn"
                  >
                    {summary.riskLevel === 'critical' ? 'Proceed Anyway' : 'Apply Move'}
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
