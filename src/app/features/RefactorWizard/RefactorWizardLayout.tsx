'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useRefactorStore } from '../../../stores/refactorStore';
import WizardProgress from './components/WizardProgress';
import SettingsStep from './components/SettingsStep';
import ScanStep from './components/ScanStep';
import PlanStep from './components/PlanStep';
import ReviewStep from './components/ReviewStep';
import PackageStep from './components/PackageStep';
import ExecuteStep from './components/ExecuteStep';
import ResultsStep from './components/ResultsStep';

export default function RefactorWizardLayout() {
  const { isWizardOpen, currentStep, closeWizard } = useRefactorStore();

  const handleClose = () => closeWizard();

  return (
    <AnimatePresence>
      {isWizardOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-7xl h-[90vh] bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col relative"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />

            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-cyan-500/10 bg-cyan-950/20 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                  <span className="text-cyan-400 font-bold text-lg">RW</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Refactor Wizard</h1>
                  <p className="text-xs text-cyan-400/60 font-mono">AI-POWERED CODE EVOLUTION</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleClose}
                  className="group relative p-2 hover:bg-white/5 rounded-full transition-colors"
                  data-testid="close-refactor-wizard"
                >
                  <X className="w-6 h-6 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
                  <span className="sr-only">Close Wizard</span>
                </button>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative z-10">
              {/* Sidebar / Progress */}
              <div className="w-80 border-r border-cyan-500/10 bg-black/20 backdrop-blur-sm p-6 hidden lg:block">
                <WizardProgress />
              </div>

              {/* Main Step Content */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="max-w-5xl mx-auto"
                  >
                    {currentStep === 'settings' && <SettingsStep />}
                    {currentStep === 'scan' && <ScanStep />}
                    {currentStep === 'plan' && <PlanStep />}
                    {currentStep === 'review' && <ReviewStep />}
                    {currentStep === 'package' && <PackageStep />}
                    {currentStep === 'execute' && <ExecuteStep />}
                    {currentStep === 'results' && <ResultsStep />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
