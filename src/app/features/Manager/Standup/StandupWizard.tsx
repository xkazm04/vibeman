/**
 * StandupWizard Component
 * Stepper-based goal review across all projects
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  FolderKanban,
  Target,
  CheckCircle2,
  RotateCcw,
  Bot,
} from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import ProjectGoalReview from './ProjectGoalReview';
import AutomationPanel from './components/AutomationPanel';

interface ProjectWithGoals {
  id: string;
  name: string;
  path: string;
  type: string;
  goalsCount: number;
  openCount: number;
  inProgressCount: number;
}

export default function StandupWizard() {
  const [projects, setProjects] = useState<ProjectWithGoals[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const { projects: configProjects, initializeProjects } = useProjectConfigStore();

  // Initialize projects
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Fetch goals count for each project
  useEffect(() => {
    const fetchProjectGoals = async () => {
      if (configProjects.length === 0) return;

      setIsLoading(true);
      try {
        const projectsWithGoals: ProjectWithGoals[] = [];

        for (const project of configProjects) {
          try {
            const response = await fetch(`/api/goals?projectId=${project.id}`);
            if (response.ok) {
              const data = await response.json();
              const goals = data.goals || [];
              const openCount = goals.filter((g: any) => g.status === 'open').length;
              const inProgressCount = goals.filter((g: any) => g.status === 'in_progress').length;

              projectsWithGoals.push({
                id: project.id,
                name: project.name,
                path: project.path,
                type: project.type || 'other',
                goalsCount: goals.length,
                openCount,
                inProgressCount,
              });
            }
          } catch (error) {
            console.error(`Error fetching goals for project ${project.id}:`, error);
          }
        }

        setProjects(projectsWithGoals);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectGoals();
  }, [configProjects]);

  const handleConfirmStep = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep < projects.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentStep, projects.length]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
    setIsComplete(false);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsComplete(false);
  }, []);

  const currentProject = projects[currentStep];

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
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Daily Standup
                </h1>
                <p className="text-sm text-gray-500">
                  Review goals across all projects
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {completedSteps.size} of {projects.length} reviewed
              </span>
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${(completedSteps.size / projects.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {projects.map((project, index) => {
              const isActive = index === currentStep;
              const isCompleted = completedSteps.has(index);

              return (
                <button
                  key={project.id}
                  onClick={() => handleStepClick(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                  )}
                  <span className="font-medium text-sm">{project.name}</span>
                  {(project.openCount > 0 || project.inProgressCount > 0) && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50">
                      {project.openCount + project.inProgressCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Automation Panel - Collapsible at the top */}
        <div className="mb-6">
          <AutomationPanel />
        </div>

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="p-4 bg-emerald-500/20 rounded-full border border-emerald-500/40 mb-6">
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Standup Complete!</h2>
              <p className="text-gray-400 mb-8">
                You've reviewed goals for all {projects.length} projects
              </p>
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </motion.div>
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
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {projects.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleStepClick(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentStep
                        ? 'bg-purple-500 w-6'
                        : completedSteps.has(index)
                        ? 'bg-emerald-500'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleConfirmStep}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-all"
              >
                {currentStep === projects.length - 1 ? (
                  <>
                    Complete
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Confirm & Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
