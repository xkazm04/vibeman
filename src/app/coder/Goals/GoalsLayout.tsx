'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import GoalsTimeline from './GoalsTimeline';
import ProjectsLayout from '../../projects/ProjectsLayout';
import GoalsAddModal from './GoalsAddModal';
import GoalsDetailModalContent from './GoalsDetailModalContent';
import GoalsTitle from './GoalsTitle';
import { Goal } from '../../../types';
import { useGoals } from '../../../hooks/useGoals';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { useStore } from '../../../stores/nodeStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import AnalysisClient from '../../../lib/analysisClient';
import { findInProgressGoal, getNextOrder } from './lib';

export default function GoalsLayout() {
  const { activeProject, fileStructure } = useActiveProjectStore();
  const { goals, createGoal, updateGoal, fetchGoals } = useGoals(activeProject?.id || null);
  const { startAnalysis } = useAnalysisStore();
  const { getProject } = useProjectConfigStore();
  const { getSelectedFilePaths } = useStore();
  const { showAddGoal, setShowAddGoal, setSelectedGoal: setToolbarSelectedGoal } = useProjectsToolbarStore();
  const { showShellModal, hideModal } = useGlobalModal();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Set initial selected goal when goals are loaded
  useEffect(() => {
    if (goals.length > 0 && !selectedGoal) {
      const inProgressGoal = findInProgressGoal(goals);
      const firstGoal = goals[0];
      setSelectedGoal(inProgressGoal || firstGoal);
    }
  }, [goals, selectedGoal]);

  // Sync selected goal with toolbar store
  useEffect(() => {
    if (selectedGoal) {
      setToolbarSelectedGoal(selectedGoal);
    }
  }, [selectedGoal, setToolbarSelectedGoal]);

  // Update selected goal when goals array changes (after updates)
  useEffect(() => {
    if (selectedGoal && goals.length > 0) {
      const updatedGoal = goals.find(goal => goal.id === selectedGoal.id);
      if (updatedGoal && (
        updatedGoal.title !== selectedGoal.title ||
        updatedGoal.description !== selectedGoal.description ||
        updatedGoal.status !== selectedGoal.status
      )) {
        setSelectedGoal(updatedGoal);
      }
    }
  }, [goals, selectedGoal]);

  const handleTimelineGoalSelect = (goal: Goal) => {
    if (goal.id !== selectedGoal?.id) {
      setIsTransitioning(true);
      // Fade out current goal
      setTimeout(() => {
        setSelectedGoal(goal);
        setIsTransitioning(false);
      }, 150); // Half of the transition duration
    }
  };

  const handleGoalDetailClick = () => {
    if (!selectedGoal) return;

    showShellModal(
      {
        title: 'Goal Details',
        subtitle: 'Review and manage your objective',
        icon: Target,
        iconBgColor: 'from-blue-600/20 to-slate-600/20',
        iconColor: 'text-blue-400',
        maxWidth: 'max-w-6xl',
        maxHeight: 'max-h-[90vh]'
      },
      {
        customContent: (
          <GoalsDetailModalContent
            goal={selectedGoal}
            projectId={activeProject?.id || null}
            onSave={updateGoal}
            onClose={hideModal}
          />
        ),
        isTopMost: true
      }
    );
  };

  const handleAnalyzeGoal = async () => {
    if (!selectedGoal || !activeProject) return;

    const project = getProject(activeProject.id);
    if (!project?.git?.repository) {
      console.error('No repository URL found for project');
      return;
    }

    // Get selected file paths from the current project
    const impactedFiles = getSelectedFilePaths(fileStructure, activeProject.id);

    // Start analysis state with project ID
    startAnalysis(selectedGoal.id, activeProject.id);

    // Trigger n8n webhook
    try {
      console.log('impactedFiles', impactedFiles);
      const response = await AnalysisClient.triggerAnalysis({
        repository: project.git.repository,
        goal: selectedGoal.title,
        description: selectedGoal.description,
        goalId: selectedGoal.id,
        branch: project.git.branch,
        projectId: activeProject.id,
        impactedFiles: impactedFiles.length > 0 ? impactedFiles : undefined
      });

      if (!response.success) {
        console.error('Analysis failed:', response.error);
      } else {
        console.log('Analysis started successfully:', response.message);
        if (impactedFiles.length > 0) {
          console.log('Impacted files:', impactedFiles);
        }
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    }
  };

  const handleAddNewGoal = async (newGoal: Omit<Goal, 'id' | 'order' | 'projectId'>) => {
    if (!activeProject) return;

    const goalWithOrder = {
      ...newGoal,
      projectId: activeProject.id,
      order: getNextOrder(goals)
    };

    const createdGoal = await createGoal(goalWithOrder);
    if (createdGoal) {
      setShowAddGoal(false);
    }
  };

  return (
    <>
      {/* Unified Projects Toolbar */}
      <ProjectsLayout
        selectedGoal={selectedGoal}
        onAnalyzeGoal={handleAnalyzeGoal}
        onRefreshGoals={fetchGoals}
      />
      {selectedGoal && (
        <GoalsTitle
          selectedGoal={selectedGoal}
          isTransitioning={isTransitioning}
          handleGoalDetailClick={handleGoalDetailClick}
        />
      )}
      
      {/* Goals Timeline */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full py-2 bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 backdrop-blur-xl border-b border-gray-600/30"
      >
        <GoalsTimeline
          goals={goals}
          selectedGoal={selectedGoal}
          onGoalSelect={handleTimelineGoalSelect}
        />
      </motion.div>

      {/* Add Goal Modal */}
      <GoalsAddModal
        isOpen={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSubmit={handleAddNewGoal}
      />
    </>
  );
} 