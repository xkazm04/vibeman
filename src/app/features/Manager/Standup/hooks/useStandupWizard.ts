/**
 * useStandupWizard Hook
 * Manages wizard navigation state and project data loading
 */

import { useState, useEffect, useCallback } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import type { ProjectWithGoals } from '../types';

interface UseStandupWizardResult {
  projects: ProjectWithGoals[];
  currentStep: number;
  completedSteps: Set<number>;
  isLoading: boolean;
  isComplete: boolean;
  currentProject: ProjectWithGoals | undefined;
  handleConfirmStep: () => void;
  handlePreviousStep: () => void;
  handleStepClick: (index: number) => void;
  handleRestart: () => void;
}

export function useStandupWizard(): UseStandupWizardResult {
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
              const inProgressCount = goals.filter(
                (g: any) => g.status === 'in_progress'
              ).length;

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

  return {
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
  };
}
