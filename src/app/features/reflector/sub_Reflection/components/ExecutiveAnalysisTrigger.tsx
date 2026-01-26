'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Clock } from 'lucide-react';
import { useReflectorStore } from '@/stores/reflectorStore';
import type { ComparisonFilterState } from '../lib/types';

interface ExecutiveAnalysisTriggerProps {
  filters: ComparisonFilterState;
  projectName?: string;
  projectPath?: string;
  onAnalysisStart?: () => void;
}

export function ExecutiveAnalysisTrigger({
  filters,
  projectName,
  projectPath,
  onAnalysisStart,
}: ExecutiveAnalysisTriggerProps) {
  const {
    analysisStatus,
    lastAnalysis,
    error,
    triggerAnalysis,
    clearError,
  } = useReflectorStore();

  const isRunning = analysisStatus === 'running';
  const isLoading = analysisStatus === 'pending';

  const handleTrigger = useCallback(async () => {
    clearError();
    await triggerAnalysis({
      projectId: filters.projectId,
      projectName,
      contextId: filters.contextId,
      contextName: undefined, // Could be enhanced to pass context name
      timeWindow: filters.timeWindow || 'all',
    });
    onAnalysisStart?.();
  }, [filters, projectName, triggerAnalysis, clearError, onAnalysisStart]);

  // Format last analysis time
  const lastAnalysisTime = lastAnalysis?.completed_at
    ? new Date(lastAnalysis.completed_at).toLocaleString()
    : null;

  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileHover={{ scale: isRunning ? 1 : 1.02 }}
        whileTap={{ scale: isRunning ? 1 : 0.98 }}
        onClick={handleTrigger}
        disabled={isRunning || isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isRunning || isLoading
            ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg hover:shadow-purple-500/20'
        }`}
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isRunning ? 'Analysis Running...' : isLoading ? 'Starting...' : 'AI Deep Analysis'}
      </motion.button>

      {lastAnalysisTime && !isRunning && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Last: {lastAnalysisTime}</span>
        </div>
      )}

      {error && !isRunning && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
