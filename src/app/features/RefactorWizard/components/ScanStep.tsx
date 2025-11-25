'use client';

import React from 'react';
import { useRefactorStore } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { Scan, Zap, Shield, Code2, FileSearch, ArrowLeft, CheckCircle2, Clock, Sparkles, FolderTree } from 'lucide-react';
import {
  StepContainer,
  CyberCard,
  ProgressBar,
} from '@/components/ui/wizard';
import { StepHeader } from '@/components/ui/wizard/StepHeader';
import { motion, AnimatePresence } from 'framer-motion';
import FolderSelector from './FolderSelector';

// Animated scan visualization
function ScanVisualization({ progress }: { progress: number }) {
  return (
    <div className="relative w-full h-32 overflow-hidden rounded-xl bg-gradient-to-br from-black/40 to-black/20 border border-cyan-500/10">
      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Scanning beam */}
      <motion.div
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Scan className="w-8 h-8 text-cyan-400" />
          </div>
          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </div>

      {/* Progress percentage */}
      <div className="absolute bottom-3 right-3">
        <span className="text-2xl font-bold text-cyan-400 font-mono">
          {progress}<span className="text-sm text-cyan-400/60">%</span>
        </span>
      </div>

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full"
          initial={{ left: `${20 + i * 15}%`, bottom: '10%', opacity: 0 }}
          animate={{
            bottom: ['10%', '90%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}

// Analysis feature card
function AnalysisFeatureCard({ icon: Icon, label, color, delay }: {
  icon: React.ElementType;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex items-center gap-2 text-sm text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5 hover:border-${color}-500/30 transition-colors group`}
    >
      <div className={`p-1.5 rounded bg-${color}-500/10 group-hover:bg-${color}-500/20 transition-colors`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <span>{label}</span>
    </motion.div>
  );
}

export default function ScanStep() {
  const {
    startAnalysis,
    analysisStatus,
    analysisProgress,
    analysisProgressMessage,
    analysisError,
    setAnalysisError,
    stopPolling,
    selectedFolders,
    setSelectedFolders,
    setCurrentStep
  } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleStartScan = async () => {
    if (!activeProject?.id || !activeProject?.path) {
      alert('Please select a project first');
      return;
    }

    console.log('[ScanStep] Starting static analysis...');
    console.log('[ScanStep] Selected folders:', selectedFolders.length === 0 ? 'All (full project)' : selectedFolders);

    // Force useAI = false for initial scan
    await startAnalysis(
      activeProject.id,
      activeProject.path,
      false,
      undefined,
      undefined,
      activeProject.type,
      selectedFolders // Pass selected folders for scoping
    );
  };

  const isScanning = analysisStatus === 'scanning' || analysisStatus === 'analyzing';

  return (
    <StepContainer
      isLoading={false}
      error={analysisError}
      onErrorDismiss={() => setAnalysisError(null)}
      data-testid="scan-step-container"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentStep('settings')}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          data-testid="scan-back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {isScanning && (
          <span className="text-sm text-cyan-400 font-mono">
            {analysisProgress}% complete
          </span>
        )}
      </div>

      <StepHeader
        title="Project Analysis"
        description="Scan your codebase to discover refactoring opportunities using intelligent static analysis"
        icon={Scan}
        currentStep={2}
        totalSteps={7}
      />

      <AnimatePresence mode="wait">
        {isScanning ? (
          /* Scanning in progress view */
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Visual scan animation */}
            <CyberCard variant="glow">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Scan className="w-5 h-5 text-cyan-400" />
                    </motion.div>
                    <h3 className="text-lg font-medium text-white">Analyzing Codebase</h3>
                  </div>
                  <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400 font-mono">
                    SCANNING
                  </span>
                </div>

                <ScanVisualization progress={analysisProgress} />

                <div className="space-y-3">
                  <ProgressBar
                    progress={analysisProgress}
                    label=""
                    variant="cyan"
                    height="lg"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {analysisProgressMessage || 'Initializing scan...'}
                    </span>
                    <span className="text-cyan-400/60 font-mono text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Estimated: ~2 min
                    </span>
                  </div>
                </div>

                {/* What's happening */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <motion.div
                      animate={{ opacity: analysisProgress < 30 ? [0.5, 1, 0.5] : 1 }}
                      transition={{ duration: 1, repeat: analysisProgress < 30 ? Infinity : 0 }}
                    >
                      {analysisProgress >= 30 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <Scan className="w-3 h-3 text-cyan-400" />
                      )}
                    </motion.div>
                    <span>File scanning</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <motion.div
                      animate={{ opacity: analysisProgress >= 30 && analysisProgress < 80 ? [0.5, 1, 0.5] : analysisProgress >= 80 ? 1 : 0.3 }}
                      transition={{ duration: 1, repeat: analysisProgress >= 30 && analysisProgress < 80 ? Infinity : 0 }}
                    >
                      {analysisProgress >= 80 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <Code2 className="w-3 h-3 text-blue-400" />
                      )}
                    </motion.div>
                    <span>Pattern detection</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <motion.div
                      animate={{ opacity: analysisProgress >= 80 && analysisProgress < 95 ? [0.5, 1, 0.5] : analysisProgress >= 95 ? 1 : 0.3 }}
                      transition={{ duration: 1, repeat: analysisProgress >= 80 && analysisProgress < 95 ? Infinity : 0 }}
                    >
                      {analysisProgress >= 95 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <Shield className="w-3 h-3 text-purple-400" />
                      )}
                    </motion.div>
                    <span>Security analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <motion.div
                      animate={{ opacity: analysisProgress >= 95 ? [0.5, 1, 0.5] : 0.3 }}
                      transition={{ duration: 1, repeat: analysisProgress >= 95 && analysisProgress < 100 ? Infinity : 0 }}
                    >
                      {analysisProgress >= 100 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                      )}
                    </motion.div>
                    <span>Generating report</span>
                  </div>
                </div>
              </div>
            </CyberCard>
          </motion.div>
        ) : (
          /* Pre-scan configuration view */
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Project Info */}
            <CyberCard>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-cyan-400" />
                    Project to Analyze
                  </label>
                  <CyberCard variant="dark" className="!p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                        <Scan className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate text-lg">
                          {activeProject?.name || 'No project selected'}
                        </p>
                        <p className="text-gray-400 text-xs mt-1 truncate font-mono">
                          {activeProject?.path || 'Please select a project'}
                        </p>
                      </div>
                      {activeProject?.type && (
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-medium">
                          {activeProject.type}
                        </span>
                      )}
                    </div>
                  </CyberCard>
                </div>

                {/* Folder Selection */}
                <div>
                  <FolderSelector
                    selectedFolders={selectedFolders}
                    onFoldersChange={setSelectedFolders}
                  />
                </div>
              </div>
            </CyberCard>

            {/* Analysis Features */}
            <CyberCard variant="glow">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-cyan-300 font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Analysis Capabilities
                  </h4>
                  <span className="text-xs text-cyan-400/60 font-mono">4 MODULES</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <AnalysisFeatureCard icon={Code2} label="Code Quality" color="blue" delay={0.1} />
                  <AnalysisFeatureCard icon={Shield} label="Security" color="purple" delay={0.2} />
                  <AnalysisFeatureCard icon={FileSearch} label="Maintainability" color="green" delay={0.3} />
                  <AnalysisFeatureCard icon={Zap} label="Performance" color="yellow" delay={0.4} />
                </div>

                <p className="text-xs text-gray-500 pt-2 border-t border-white/5">
                  💡 Static analysis identifies patterns and issues without executing code. AI-powered deep analysis is available in subsequent steps.
                </p>
              </div>
            </CyberCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action - Start Analysis */}
      {!isScanning && (
        <motion.button
          onClick={handleStartScan}
          disabled={!activeProject}
          whileHover={{ scale: !activeProject ? 1 : 1.02 }}
          whileTap={{ scale: !activeProject ? 1 : 0.98 }}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none relative overflow-hidden group"
          data-testid="start-refactor-scan"
        >
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{
              backgroundImage: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="flex items-center justify-center space-x-2">
            <Scan className="w-5 h-5" />
            <span>Start Analysis</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>
        </motion.button>
      )}
    </StepContainer>
  );
}
