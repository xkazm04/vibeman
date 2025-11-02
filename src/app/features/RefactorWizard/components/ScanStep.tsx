'use client';

import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { Scan, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function ScanStep() {
  const { startAnalysis, analysisStatus, analysisProgress, analysisError } = useRefactorStore();
  const { activeProjectId, activeProjectPath } = useActiveProjectStore();
  const [useAI, setUseAI] = useState(true);

  const handleStartScan = async () => {
    if (!activeProjectId || !activeProjectPath) {
      alert('Please select a project first');
      return;
    }

    await startAnalysis(activeProjectId, activeProjectPath);
  };

  const isScanning = analysisStatus === 'scanning' || analysisStatus === 'analyzing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-light text-white mb-2">Project Analysis</h3>
        <p className="text-gray-400 text-sm">
          Scan your codebase to discover refactoring opportunities
        </p>
      </div>

      {/* Options */}
      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
        <div className="space-y-4">
          {/* Project Info */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Project to Analyze
            </label>
            <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                  <Scan className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {activeProjectId || 'No project selected'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {activeProjectPath || 'Please select a project'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Toggle */}
          <div>
            <label className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/40 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">AI-Powered Analysis</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Use AI to detect complex refactoring opportunities
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-5 h-5 accent-cyan-500"
              />
            </label>
          </div>

          {/* Scan Types */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 border border-white/10 rounded-lg p-4">
              <Zap className="w-5 h-5 text-yellow-400 mb-2" />
              <p className="text-white font-medium text-sm">Pattern Detection</p>
              <p className="text-gray-400 text-xs mt-1">
                Fast rule-based analysis
              </p>
            </div>
            {useAI && (
              <div className="bg-black/30 border border-purple-500/20 rounded-lg p-4">
                <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-white font-medium text-sm">Deep AI Analysis</p>
                <p className="text-gray-400 text-xs mt-1">
                  Contextual understanding
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {analysisError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start space-x-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Analysis Failed</p>
            <p className="text-red-200/80 text-sm mt-1">{analysisError}</p>
          </div>
        </motion.div>
      )}

      {/* Progress */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">
              {analysisStatus === 'scanning' ? 'Scanning files...' : 'Analyzing code...'}
            </span>
            <span className="text-cyan-400 font-medium">{analysisProgress}%</span>
          </div>
          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${analysisProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStartScan}
        disabled={isScanning || !activeProjectId}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none"
        data-testid="start-refactor-scan"
      >
        {isScanning ? (
          <span className="flex items-center justify-center space-x-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Scan className="w-5 h-5" />
            </motion.div>
            <span>Scanning...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center space-x-2">
            <Scan className="w-5 h-5" />
            <span>Start Analysis</span>
          </span>
        )}
      </button>
    </motion.div>
  );
}
