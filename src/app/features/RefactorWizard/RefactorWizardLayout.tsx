'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { X, Sparkles } from 'lucide-react';
import ScanStep from './components/ScanStep';
import ConfigStep from './components/ConfigStep';
import ReviewStep from './components/ReviewStep';
import ExecuteStep from './components/ExecuteStep';
import ResultsStep from './components/ResultsStep';
import WizardProgress from './components/WizardProgress';

export default function RefactorWizardLayout() {
  const { isWizardOpen, closeWizard, currentStep, resetWizard } = useRefactorStore();

  const handleClose = () => {
    closeWizard();
    // Reset after animation completes
    setTimeout(() => resetWizard(), 300);
  };

  return (
    <AnimatePresence>
      {isWizardOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
            data-testid="wizard-backdrop"
          />

          {/* Wizard Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black/90 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 max-w-6xl w-full max-h-[90vh] overflow-hidden" data-testid="refactor-wizard-modal">
              {/* Header */}
              <div className="relative px-8 py-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                      <Sparkles className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-light text-white tracking-wide">
                        AI-Powered Refactor Wizard
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Analyze, plan, and execute large-scale code improvements
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                    data-testid="close-refactor-wizard"
                  >
                    <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </button>
                </div>

                {/* Progress Indicator */}
                <WizardProgress />
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                <AnimatePresence mode="wait">
                  {currentStep === 'scan' && <ScanStep key="scan" />}
                  {currentStep === 'config' && <ConfigStep key="config" />}
                  {currentStep === 'review' && <ReviewStep key="review" />}
                  {currentStep === 'execute' && <ExecuteStep key="execute" />}
                  {currentStep === 'results' && <ResultsStep key="results" />}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
