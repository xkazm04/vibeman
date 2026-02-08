'use client';

/**
 * Blueprint Test Panel
 * Displays real-time test pass/fail status for each project column in Blueprint
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Image, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useTestResultStore } from '@/stores/testResultStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface ScanTestStats {
  scanType: string;
  label: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
  lastRunAt: string | null;
  screenshots: string[];
}

export function BlueprintTestPanel() {
  const { activeProject } = useActiveProjectStore();
  const { results, loading, loadTestResults, getResultsForScan, getOverallStats } = useTestResultStore();

  const [expanded, setExpanded] = useState(false);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Scan types mapped to Blueprint columns
  const scanTypes: Array<{ id: string; label: string }> = [
    { id: 'build', label: 'Build' },
    { id: 'contexts', label: 'Contexts' },
    { id: 'photo', label: 'Photo' },
    { id: 'structure', label: 'Structure' },
    { id: 'vision', label: 'Vision' },
  ];

  // Load test results on mount and when project changes
  useEffect(() => {
    if (activeProject?.id) {
      loadTestResults(activeProject.id);
    }
  }, [activeProject?.id, loadTestResults]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || !activeProject?.id) return;

    const interval = setInterval(() => {
      loadTestResults(activeProject.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeProject?.id, loadTestResults]);

  // Get statistics for each scan type
  const scanStats: ScanTestStats[] = scanTypes.map((scan) => {
    const result = activeProject?.id ? getResultsForScan(activeProject.id, scan.id) : null;

    return {
      scanType: scan.id,
      label: scan.label,
      totalTests: result?.totalTests || 0,
      passedTests: result?.passedTests || 0,
      failedTests: result?.failedTests || 0,
      runningTests: result?.runningTests || 0,
      lastRunAt: result?.lastRunAt || null,
      screenshots: result?.screenshots || [],
    };
  });

  // Overall statistics
  const overallStats = activeProject?.id ? getOverallStats(activeProject.id) : null;

  const hasAnyTests = scanStats.some((stat) => stat.totalTests > 0);

  /**
   * Get status icon for scan
   */
  function getStatusIcon(stat: ScanTestStats) {
    if (stat.runningTests > 0) {
      return <Clock className="w-4 h-4 text-yellow-400 animate-spin" data-testid={`scan-status-running-${stat.scanType}`} />;
    }
    if (stat.failedTests > 0) {
      return <XCircle className="w-4 h-4 text-red-400" data-testid={`scan-status-failed-${stat.scanType}`} />;
    }
    if (stat.passedTests > 0) {
      return <CheckCircle className="w-4 h-4 text-green-400" data-testid={`scan-status-passed-${stat.scanType}`} />;
    }
    return <div className="w-4 h-4 rounded-full border border-cyan-500/30" data-testid={`scan-status-empty-${stat.scanType}`} />;
  }

  /**
   * Get status color for scan
   */
  function getStatusColor(stat: ScanTestStats): string {
    if (stat.runningTests > 0) return 'border-yellow-500/30 bg-yellow-950/10';
    if (stat.failedTests > 0) return 'border-red-500/30 bg-red-950/10';
    if (stat.passedTests > 0) return 'border-green-500/30 bg-green-950/10';
    return 'border-cyan-500/20 bg-slate-900/20';
  }

  /**
   * Format last run time
   */
  function formatLastRun(timestamp: string | null): string {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  if (!activeProject) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-8 right-8 z-40 w-96"
      data-testid="blueprint-test-panel"
    >
      {/* Header - Always visible */}
      <div
        className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 rounded-t-lg p-4 cursor-pointer hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5"
        onClick={() => setExpanded(!expanded)}
        data-testid="test-panel-header"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: expanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            </motion.div>
            <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-widest">
              Test Results
            </h3>
          </div>

          {/* Overall stats */}
          {hasAnyTests && overallStats && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-green-400" data-testid="overall-passed-count">
                {overallStats.passedTests}
              </span>
              <span className="text-cyan-500/40">/</span>
              <span className="text-cyan-300/60" data-testid="overall-total-count">
                {overallStats.totalTests}
              </span>
              {overallStats.failedTests > 0 && (
                <>
                  <span className="text-cyan-500/40 ml-1">|</span>
                  <span className="text-red-400" data-testid="overall-failed-count">
                    {overallStats.failedTests} failed
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-cyan-300/50">
            <Clock className="w-3 h-3 animate-spin" />
            <span>Loading test results...</span>
          </div>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-950/90 backdrop-blur-md border-x border-b border-cyan-500/30 rounded-b-lg overflow-hidden"
          >
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {/* No tests message */}
              {!hasAnyTests && (
                <div className="text-center py-8 text-cyan-300/40" data-testid="no-tests-message">
                  <p className="text-sm">No test results yet.</p>
                  <p className="text-xs mt-1">Run scans to generate tests.</p>
                </div>
              )}

              {/* Scan type cards */}
              {hasAnyTests && scanStats.map((stat) => {
                if (stat.totalTests === 0) return null;

                const isSelected = selectedScan === stat.scanType;
                const statusColor = getStatusColor(stat);

                return (
                  <motion.div
                    key={stat.scanType}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`border rounded-lg p-3 transition-all cursor-pointer hover:border-cyan-400/40 ${statusColor}`}
                    onClick={() => setSelectedScan(isSelected ? null : stat.scanType)}
                    data-testid={`scan-test-card-${stat.scanType}`}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(stat)}
                        <span className="text-sm font-mono text-cyan-100" data-testid={`scan-label-${stat.scanType}`}>
                          {stat.label}
                        </span>
                      </div>
                      {isSelected ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>

                    {/* Test counts */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-green-400" data-testid={`scan-passed-${stat.scanType}`}>
                          {stat.passedTests}
                        </span>
                      </div>
                      {stat.failedTests > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span className="text-red-400" data-testid={`scan-failed-${stat.scanType}`}>
                            {stat.failedTests}
                          </span>
                        </div>
                      )}
                      {stat.runningTests > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400" data-testid={`scan-running-${stat.scanType}`}>
                            {stat.runningTests}
                          </span>
                        </div>
                      )}
                      <span className="text-cyan-300/40 ml-auto">
                        {formatLastRun(stat.lastRunAt)}
                      </span>
                    </div>

                    {/* Screenshot count */}
                    {stat.screenshots.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-cyan-300/60">
                        <Image className="w-3 h-3" />
                        <span data-testid={`scan-screenshots-${stat.scanType}`}>
                          {stat.screenshots.length} screenshots
                        </span>
                      </div>
                    )}

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-cyan-500/10 space-y-2"
                        >
                          {/* Screenshot links */}
                          {stat.screenshots.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-cyan-400 font-mono mb-1">Screenshots:</div>
                              {stat.screenshots.slice(0, 5).map((screenshot, idx) => (
                                <a
                                  key={idx}
                                  href={screenshot}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-cyan-300/60 hover:text-cyan-300 transition-colors"
                                  data-testid={`screenshot-link-${stat.scanType}-${idx}`}
                                >
                                  <Eye className="w-3 h-3" />
                                  <span className="truncate">{screenshot.split('/').pop()}</span>
                                </a>
                              ))}
                              {stat.screenshots.length > 5 && (
                                <div className="text-xs text-cyan-300/40">
                                  +{stat.screenshots.length - 5} more
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Auto-refresh toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
                <span className="text-xs text-cyan-300/50">Auto-refresh</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAutoRefresh(!autoRefresh);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    autoRefresh
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800/50 text-cyan-300/50 border border-cyan-500/10'
                  }`}
                  data-testid="auto-refresh-toggle"
                >
                  {autoRefresh ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
