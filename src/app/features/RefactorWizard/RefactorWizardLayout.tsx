'use client';

import { useState, useCallback } from 'react';
import { useRefactorStore } from '../../../stores/refactorStore';
import WizardHeader from './components/WizardHeader';
import WizardStepRouter from './components/WizardStepRouter';
import WizardProgress from './components/WizardProgress';
import DebtPredictionLayout from '../DebtPrediction/DebtPredictionLayout';
import { DSLBuilderLayout } from './components/sub_DSLBuilder';
import QuickRefactorMode from './components/QuickRefactorMode';
import { RefactorSpec } from './lib/dslTypes';
import { generateRequirementFromSpec, generateRequirementFilename } from './lib/dslExecutor';

export default function RefactorWizardLayout() {
  const {
    isWizardOpen,
    currentStep,
    closeWizard,
    isDSLMode,
    setDSLMode,
    setCurrentStep,
  } = useRefactorStore();
  const [showDebtPrediction, setShowDebtPrediction] = useState(false);
  const [isExecutingDSL, setIsExecutingDSL] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(true); // Default to quick mode for new users

  const handleClose = () => closeWizard();

  const handleToggleDSLMode = useCallback(() => {
    setDSLMode(!isDSLMode);
  }, [isDSLMode, setDSLMode]);

  const handleOpenDebtPrediction = useCallback(() => {
    setShowDebtPrediction(true);
  }, []);

  const handleDSLExecute = useCallback(async (spec: RefactorSpec) => {
    setIsExecutingDSL(true);
    try {
      const content = generateRequirementFromSpec(spec);
      const fileName = generateRequirementFilename(spec);

      const { useActiveProjectStore } = await import('@/stores/activeProjectStore');
      const { activeProject } = useActiveProjectStore.getState();

      if (!activeProject?.path) {
        console.error('No active project');
        return;
      }

      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: activeProject.path,
          requirementName: fileName,
          content,
          overwrite: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create requirement file');
      }

      setDSLMode(false);
      setCurrentStep('results');
    } catch (error) {
      console.error('DSL execution failed:', error);
    } finally {
      setIsExecutingDSL(false);
    }
  }, [setDSLMode, setCurrentStep]);

  const handleBackFromDSL = useCallback(() => {
    setDSLMode(false);
  }, [setDSLMode]);

  if (!isWizardOpen) {
    return null;
  }

  // Quick mode - simplified interface
  if (isQuickMode && !isDSLMode) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden relative" data-testid="refactor-wizard-quick-mode">
        {/* Ambient Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Quick Mode Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10">
          <QuickRefactorMode
            onSwitchToAdvanced={() => setIsQuickMode(false)}
            onExecuteWithPackages={() => {
              // Switch to advanced mode and show execute step
              setIsQuickMode(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden relative" data-testid="refactor-wizard-layout">
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
      <WizardHeader
        isDSLMode={isDSLMode}
        onToggleDSLMode={handleToggleDSLMode}
        onOpenDebtPrediction={handleOpenDebtPrediction}
        onClose={handleClose}
        onSwitchToQuickMode={() => setIsQuickMode(true)}
      />

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {isDSLMode ? (
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
            <DSLBuilderLayout
              onExecute={handleDSLExecute}
              onBack={handleBackFromDSL}
            />
          </div>
        ) : (
          <>
            {/* Sidebar / Progress */}
            <div className="w-80 border-r border-cyan-500/10 bg-black/20 backdrop-blur-sm p-6 hidden lg:block">
              <WizardProgress />
            </div>

            {/* Main Step Content */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
              <WizardStepRouter currentStep={currentStep} />
            </div>
          </>
        )}
      </div>

      {/* Debt Prediction Modal */}
      <DebtPredictionLayout
        isOpen={showDebtPrediction}
        onClose={() => setShowDebtPrediction(false)}
      />
    </div>
  );
}
