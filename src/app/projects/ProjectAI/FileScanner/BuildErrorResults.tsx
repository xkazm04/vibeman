import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, AlertTriangle, FileText, Code, Wrench, Zap, HelpCircle } from 'lucide-react';
import { BuildError, BuildScanStats } from '@/lib/scanner/buildErrorScanner';

interface BuildErrorResultsProps {
  isOpen: boolean;
  onClose: () => void;
  errors: BuildError[];
  warnings: BuildError[];
  stats: BuildScanStats;
  buildCommand: string;
  executionTime: number;
  fixedErrors?: Array<{
    file: string;
    line: number;
    column: number;
    originalError: string;
    fixApplied: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  skippedErrors?: Array<{
    file: string;
    line: number;
    column: number;
    originalError: string;
    reason: string;
  }>;
  fixStats?: {
    filesProcessed: number;
    errorsFixed: number;
    errorsSkipped: number;
    filesWithChanges: number;
  };
}

export default function BuildErrorResults({
  isOpen,
  onClose,
  errors,
  warnings,
  stats,
  buildCommand,
  executionTime,
  fixedErrors = [],
  skippedErrors = [],
  fixStats
}: BuildErrorResultsProps) {
  const [displayedIssues, setDisplayedIssues] = useState<BuildError[]>([]);
  const [loadedCount, setLoadedCount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allIssues = [...errors, ...(showWarnings ? warnings : [])];

  // Load initial results
  useEffect(() => {
    if (isOpen && allIssues.length > 0) {
      setDisplayedIssues(allIssues.slice(0, 20));
      setLoadedCount(20);
    }
  }, [isOpen, allIssues]);

  // Infinite scroll handler
  const handleScroll = () => {
    if (!scrollRef.current || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreResults();
    }
  };

  const loadMoreResults = () => {
    if (isLoading || loadedCount >= allIssues.length) return;

    setIsLoading(true);

    setTimeout(() => {
      const nextBatch = allIssues.slice(loadedCount, loadedCount + 20);
      setDisplayedIssues(prev => [...prev, ...nextBatch]);
      setLoadedCount(prev => prev + 20);
      setIsLoading(false);
    }, 300);
  };

  const getErrorIcon = (error: BuildError) => {
    if (error.severity === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;

    switch (error.type) {
      case 'typescript': return <Code className="w-5 h-5 text-blue-400" />;
      case 'eslint': return <Wrench className="w-5 h-5 text-blue-400" />;
      case 'webpack': return <Zap className="w-5 h-5 text-orange-400" />;
      case 'nextjs': return <FileText className="w-5 h-5 text-green-400" />;
      default: return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getErrorTypeColor = (type: string) => {
    const colors = {
      'typescript': 'text-blue-400 bg-blue-500/20',
      'eslint': 'text-blue-400 bg-blue-500/20',
      'webpack': 'text-orange-400 bg-orange-500/20',
      'nextjs': 'text-green-400 bg-green-500/20',
      'unknown': 'text-gray-400 bg-gray-500/20'
    };
    return colors[type as keyof typeof colors] || colors.unknown;
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'error'
      ? 'text-red-400 bg-red-500/20'
      : 'text-yellow-400 bg-yellow-500/20';
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-green-500/20 text-green-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-orange-500/20 text-orange-400'
    };
    return colors[confidence];
  };

  const getIssueBorderColor = (severity: string) => {
    return severity === 'error'
      ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
      : 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onWheel={(e) => {
        // Only prevent default if the scroll is not within the results container
        if (!scrollRef.current?.contains(e.target as Node)) {
          e.preventDefault();
        }
      }}
    >
      <motion.div
        className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Build Error Results
              </h2>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-red-400">{stats.totalErrors} errors</span>
                <span className="text-yellow-400">{stats.totalWarnings} warnings</span>
                <span className="text-gray-400">{(executionTime / 1000).toFixed(1)}s execution</span>
                <span className="text-blue-400 font-mono text-sm">{buildCommand}</span>
                {fixStats && (
                  <>
                    <span className="text-green-400">{fixStats.errorsFixed} fixed</span>
                    <span className="text-yellow-400">{fixStats.errorsSkipped} skipped</span>
                  </>
                )}
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="p-4 border-b border-gray-700/50 bg-gray-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              {stats.typescriptErrors > 0 && (
                <span className="flex items-center space-x-1 text-blue-400">
                  <Code className="w-4 h-4" />
                  <span>{stats.typescriptErrors} TS</span>
                </span>
              )}
              {stats.eslintErrors > 0 && (
                <span className="flex items-center space-x-1 text-blue-400">
                  <Wrench className="w-4 h-4" />
                  <span>{stats.eslintErrors} ESLint</span>
                </span>
              )}
              {stats.webpackErrors > 0 && (
                <span className="flex items-center space-x-1 text-orange-400">
                  <Zap className="w-4 h-4" />
                  <span>{stats.webpackErrors} Webpack</span>
                </span>
              )}
              {stats.nextjsErrors > 0 && (
                <span className="flex items-center space-x-1 text-green-400">
                  <FileText className="w-4 h-4" />
                  <span>{stats.nextjsErrors} Next.js</span>
                </span>
              )}
              {stats.unparsedErrors > 0 && (
                <span className="text-gray-400">{stats.unparsedErrors} unparsed</span>
              )}
            </div>

            <motion.button
              onClick={() => setShowWarnings(!showWarnings)}
              className={`px-3 py-1 rounded text-sm transition-colors ${showWarnings
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showWarnings ? 'Hide' : 'Show'} Warnings
            </motion.button>
          </div>
        </div>

        {/* Fix Results Section */}
        {fixStats && (fixedErrors.length > 0 || skippedErrors.length > 0) && (
          <div className="p-6 border-b border-gray-700/50 bg-gray-900/20">
            <h3 className="text-lg font-semibold text-white mb-4">Error Fixing Results</h3>

            {/* Fixed Errors */}
            {fixedErrors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">✅ Fixed Errors ({fixedErrors.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fixedErrors.map((fix, index) => (
                    <div key={index} className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono text-green-300">{fix.file}:{fix.line}:{fix.column}</span>
                        <span className={`px-2 py-1 rounded text-sm ${getConfidenceColor(fix.confidence)}`}>
                          {fix.confidence} confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{fix.originalError}</p>
                      <p className="text-sm text-green-300">Fix: {fix.fixApplied}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Errors */}
            {skippedErrors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-400 mb-2">⚠️ Skipped Errors ({skippedErrors.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {skippedErrors.map((skip, index) => (
                    <div key={index} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono text-yellow-300">{skip.file}:{skip.line}:{skip.column}</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{skip.originalError}</p>
                      <p className="text-sm text-yellow-300">Reason: {skip.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results List */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-3"
          onScroll={handleScroll}
          onWheel={(e) => e.stopPropagation()}
          style={{ overscrollBehavior: 'contain' }}
        >
          <AnimatePresence>
            {displayedIssues.map((issue, index) => (
              <motion.div
                key={`${issue.file}-${issue.line}-${issue.column}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg ${getIssueBorderColor(issue.severity)}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Error Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getErrorIcon(issue)}
                  </div>

                  {/* Error Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-white font-semibold truncate">{issue.file}</h3>
                      {issue.line && (
                        <span className="text-sm text-gray-400 font-mono">
                          {issue.line}:{issue.column}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getErrorTypeColor(issue.type)}`}>
                        {issue.type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                    </div>

                    <p className={`text-sm mb-2 ${issue.severity === 'error' ? 'text-red-300' : 'text-yellow-300'
                      }`}>
                      {issue.message}
                    </p>

                    {/* Rule/Code */}
                    {issue.rule && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Rule:</span>
                        <span className="text-sm text-gray-400 font-mono bg-gray-800/50 px-2 py-1 rounded">
                          {issue.rule}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex items-center space-x-3 text-gray-400">
                <motion.div
                  className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-sm">Loading more results...</span>
              </div>
            </motion.div>
          )}

          {/* Load More Button */}
          {!isLoading && loadedCount < allIssues.length && (
            <motion.button
              onClick={loadMoreResults}
              className="w-full p-4 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Load More ({allIssues.length - loadedCount} remaining)</span>
            </motion.button>
          )}

          {/* End Message */}
          {loadedCount >= allIssues.length && allIssues.length > 20 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              All {allIssues.length} issues loaded
            </div>
          )}

          {/* No Issues Message */}
          {allIssues.length === 0 && (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Build Issues Found!</h3>
              <p className="text-gray-400">Your project compiled successfully without errors or warnings.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {Math.min(loadedCount, allIssues.length)} of {allIssues.length} issues
            </div>
            <motion.button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700/70 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Close
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}