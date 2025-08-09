'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoalsTimeline from './GoalsTimeline';
import ProjectsLayout from '../../projects/ProjectsLayout';
import GoalsAddModal from './GoalsAddModal';
import GoalsDetailModal from './GoalsDetailModal_Glass';
import { Goal } from '../../../types';
import { useGoals } from '../../../hooks/useGoals';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { useStore } from '../../../stores/nodeStore';
import AnalysisClient from '../../../lib/analysisClient';
import GoalsTitle from './GoalsTitle';

export default function GoalsLayout() {
  const { activeProject, fileStructure } = useActiveProjectStore();
  const { goals, loading, error, createGoal, updateGoal, fetchGoals } = useGoals(activeProject?.id || null);
  const { startAnalysis, isActive } = useAnalysisStore();
  const { getProject } = useProjectConfigStore();
  const { getSelectedFilePaths } = useStore();
  const { showAddGoal, setShowAddGoal, setSelectedGoal: setToolbarSelectedGoal } = useProjectsToolbarStore();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Set initial selected goal when goals are loaded
  useEffect(() => {
    if (goals.length > 0 && !selectedGoal) {
      const inProgressGoal = goals.find(goal => goal.status === 'in_progress');
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
    if (selectedGoal) {
      setIsDetailModalOpen(true);
    }
  };

  // This function is no longer needed as the button is in ProjectsLayout
  // The modal state is managed by the toolbar store

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

    const maxOrder = Math.max(...goals.map(g => g.order), 0);
    const goalWithOrder = {
      ...newGoal,
      projectId: activeProject.id,
      order: maxOrder + 1
    };

    const createdGoal = await createGoal(goalWithOrder);
    if (createdGoal) {
      setShowAddGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-16 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/30 mb-6">
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-gray-400">Loading goals...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-16 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/30 mb-6">
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Unified Projects Toolbar */}
      <ProjectsLayout
        selectedGoal={selectedGoal}
        onAnalyzeGoal={handleAnalyzeGoal}
        onRefreshGoals={fetchGoals}
      />
      {selectedGoal && <GoalsTitle
        selectedGoal={selectedGoal}
        isTransitioning={isTransitioning}
        handleGoalDetailClick={handleGoalDetailClick}
      />}
      {/* Goals-specific content below the toolbar */}
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


      {/* Goal Detail Modal */}
      <GoalsDetailModal
        goal={selectedGoal}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={updateGoal}
        projectId={activeProject?.id || null}
      />

      {/* Add Goal Modal */}
      <GoalsAddModal
        isOpen={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSubmit={handleAddNewGoal}
      />
    </>
  );
} 