/**
 * StandupWizard Component
 * Stepper-based goal review across all projects
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, FolderKanban } from 'lucide-react';
import { useStandupWizard } from './hooks';
import { WizardHeader } from './components/WizardHeader';
import { StepperNavigation } from './components/StepperNavigation';
import { FooterNavigation } from './components/FooterNavigation';
import { CompletionScreen } from './components/CompletionScreen';
import AutomationPanel from './components/AutomationPanel';
import ProjectGoalReview from './ProjectGoalReview';

export default function StandupWizard() {
  const {
    projects,
    currentStep,
    completedSteps,
    isLoading,
    isComplete,
    currentProject,
    handleConfirmStep,
    handlePreviousStep,
    handleStepClick,
    handleRestart,
  } = useStandupWizard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <FolderKanban className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">No Projects Found</h2>
          <p className="text-gray-500">Add some projects to start your standup review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <WizardHeader
        completedCount={completedSteps.size}
        totalCount={projects.length}
      />

      {/* Stepper Navigation */}
      <StepperNavigation
        projects={projects}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Automation Panel */}
        <div className="mb-6">
          <AutomationPanel />
        </div>

        <AnimatePresence mode="wait">
          {isComplete ? (
            <CompletionScreen
              projectsCount={projects.length}
              onRestart={handleRestart}
            />
          ) : currentProject ? (
            <motion.div
              key={currentProject.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ProjectGoalReview
                projectId={currentProject.id}
                projectName={currentProject.name}
                projectPath={currentProject.path}
                projectType={currentProject.type}
                onConfirm={handleConfirmStep}
                isLastStep={currentStep === projects.length - 1}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      {!isComplete && (
        <FooterNavigation
          currentStep={currentStep}
          totalSteps={projects.length}
          completedSteps={completedSteps}
          isLastStep={currentStep === projects.length - 1}
          onPrevious={handlePreviousStep}
          onConfirm={handleConfirmStep}
          onStepClick={handleStepClick}
        />
      )}
    </div>
  );
}
