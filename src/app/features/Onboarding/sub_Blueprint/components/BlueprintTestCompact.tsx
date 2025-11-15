'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, TestTube } from 'lucide-react';
import { useTestResultStore } from '@/stores/testResultStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface ScanTestStats {
  scanType: string;
  label: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
}

export interface BlueprintTestCompactProps {
  className?: string;
}

/**
 * Compact test results panel for Blueprint right sidebar
 * Shows test pass/fail status for each scan type in thin rows
 */
export default function BlueprintTestCompact({
  className = '',
}: BlueprintTestCompactProps) {
  const { activeProject } = useActiveProjectStore();
  const { loadTestResults, getResultsForScan, getOverallStats } = useTestResultStore();

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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!activeProject?.id) return;

    const interval = setInterval(() => {
      loadTestResults(activeProject.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeProject?.id, loadTestResults]);

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
    };
  });

  // Overall statistics
  const overallStats = activeProject?.id ? getOverallStats(activeProject.id) : null;
  const hasAnyTests = scanStats.some((stat) => stat.totalTests > 0);

  /**
   * Get status icon component for scan
   */
  function getStatusIcon(stat: ScanTestStats) {
    if (stat.runningTests > 0) {
      return Clock;
    }
    if (stat.failedTests > 0) {
      return XCircle;
    }
    if (stat.passedTests > 0) {
      return CheckCircle;
    }
    return TestTube;
  }

  /**
   * Get icon color classes based on status
   */
  function getIconColorClasses(stat: ScanTestStats): string {
    if (stat.runningTests > 0) {
      return 'border-yellow-400/60 bg-yellow-500/20 text-yellow-400';
    }
    if (stat.failedTests > 0) {
      return 'border-red-400/60 bg-red-500/20 text-red-400';
    }
    if (stat.passedTests > 0) {
      return 'border-green-400/60 bg-green-500/20 text-green-400';
    }
    return 'border-gray-600/30 bg-gray-800/20 text-gray-400';
  }

  /**
   * Get text color classes based on status
   */
  function getTextColorClasses(stat: ScanTestStats): string {
    if (stat.runningTests > 0) {
      return 'text-yellow-400';
    }
    if (stat.failedTests > 0) {
      return 'text-red-400';
    }
    if (stat.passedTests > 0) {
      return 'text-green-400';
    }
    return 'text-gray-400';
  }

  /**
   * Get row background classes based on status
   */
  function getRowBgClasses(stat: ScanTestStats): string {
    if (stat.runningTests > 0) {
      return 'bg-yellow-500/5';
    }
    if (stat.failedTests > 0) {
      return 'bg-red-500/5';
    }
    if (stat.passedTests > 0) {
      return 'bg-green-500/5';
    }
    return '';
  }

  if (!activeProject) {
    return null;
  }

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      data-testid="blueprint-test-compact"
    >
      {/* Header */}
      <div className="px-3 pt-3 mb-3">
        <h3 className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
          Test Results
        </h3>
        {hasAnyTests && overallStats && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono mt-1">
            <span className="text-green-400">{overallStats.passedTests}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{overallStats.totalTests}</span>
            {overallStats.failedTests > 0 && (
              <>
                <span className="text-gray-600 mx-0.5">•</span>
                <span className="text-red-400">{overallStats.failedTests} failed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Test result rows */}
      <div className="flex-1 overflow-y-auto">
        {!hasAnyTests ? (
          <div className="flex flex-col items-center justify-center h-full px-3">
            <TestTube className="w-6 h-6 text-gray-600 mb-2" />
            <p className="text-xs text-gray-500 font-mono text-center">
              No test results yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {scanStats.map((stat, index) => {
              // Skip scans with no tests
              if (stat.totalTests === 0) return null;

              const Icon = getStatusIcon(stat);
              const iconColorClasses = getIconColorClasses(stat);
              const textColorClasses = getTextColorClasses(stat);
              const rowBgClasses = getRowBgClasses(stat);

              return (
                <motion.div
                  key={stat.scanType}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    relative flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/50
                    ${rowBgClasses}
                  `}
                  data-testid={`test-compact-row-${stat.scanType}`}
                >
                  {/* Icon button on left */}
                  <div
                    className={`
                      flex items-center justify-center w-7 h-7 rounded-md border
                      transition-all duration-200
                      ${iconColorClasses}
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 ${stat.runningTests > 0 ? 'animate-spin' : ''}`}
                    />
                  </div>

                  {/* Text label and stats */}
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span
                      className={`
                        text-sm font-mono transition-colors
                        ${textColorClasses}
                      `}
                    >
                      {stat.label}
                    </span>

                    {/* Test count badge */}
                    <div className="flex items-center gap-1 text-xs font-mono">
                      <span className="text-green-400">
                        {stat.passedTests}
                      </span>
                      <span className="text-gray-600">/</span>
                      <span className="text-gray-400">
                        {stat.totalTests}
                      </span>
                      {stat.failedTests > 0 && (
                        <span className="ml-1 text-red-400">
                          ({stat.failedTests})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Running indicator - Static version (removed pulse animation) */}
                  {stat.runningTests > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-yellow-400 shadow-lg shadow-yellow-400/50" />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
