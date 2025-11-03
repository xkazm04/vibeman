'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { Scan, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import {
  WizardStepContainer,
  WizardHeader,
  CyberCard,
  ProgressBar,
} from '@/components/ui/wizard';
import { motion } from 'framer-motion';

export default function ScanStep() {
  const { startAnalysis, analysisStatus, analysisProgress, analysisError } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [useAI, setUseAI] = useState(true);

  const handleStartScan = async () => {
    if (!activeProject?.id || !activeProject?.path) {
      alert('Please select a project first');
      return;
    }

    await startAnalysis(activeProject.id, activeProject.path);
  };

  const isScanning = analysisStatus === 'scanning' || analysisStatus === 'analyzing';

  return (
    <WizardStepContainer>
      {/* Header */}
      <WizardHeader
        title="Project Analysis"
        description="Scan your codebase to discover refactoring opportunities"
      />

      {/* Options Card */}
      <CyberCard>
        <div className="space-y-4">
          {/* Project Info */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Project to Analyze
            </label>
            <CyberCard variant="dark" className="!p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                  <Scan className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {activeProject?.name || 'No project selected'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1 truncate">
                    {activeProject?.path || 'Please select a project'}
                  </p>
                </div>
              </div>
            </CyberCard>
          </div>

          {/* AI Toggle */}
          <label className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/40 hover:border-cyan-500/20 transition-all duration-200 group">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-500/30 group-hover:border-purple-500/50 transition-colors">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
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
              className="w-5 h-5 accent-cyan-500 cursor-pointer"
            />
          </label>

          {/* Scan Types */}
          <div className="grid grid-cols-2 gap-3">
            <CyberCard variant="dark" className="!p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              </div>
              <p className="text-white font-medium text-sm mb-1">Pattern Detection</p>
              <p className="text-gray-400 text-xs">
                Fast rule-based analysis
              </p>
            </CyberCard>
            {useAI && (
              <CyberCard variant="glow" className="!p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                </div>
                <p className="text-white font-medium text-sm mb-1">Deep AI Analysis</p>
                <p className="text-gray-400 text-xs">
                  Contextual understanding
                </p>
              </CyberCard>
            )}
          </div>
        </div>
      </CyberCard>

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
        <ProgressBar
          progress={analysisProgress}
          label={analysisStatus === 'scanning' ? 'Scanning files...' : 'Analyzing code...'}
          variant="cyan"
        />
      )}

      {/* Start Button */}
      <button
        onClick={handleStartScan}
        disabled={isScanning || !activeProject}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none relative overflow-hidden group"
        data-testid="start-refactor-scan"
      >
        {/* Blueprint grid pattern overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
             style={{
               backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
               backgroundSize: '20px 20px'
             }}
        />

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
    </WizardStepContainer>
  );
}
