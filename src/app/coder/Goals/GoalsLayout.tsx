'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoalsTimeline from './GoalsTimeline';
import GoalsActions from './GoalsActions';
import GoalsAddModal from './GoalsAddModal';
import GoalsDetailModal from './GoalsDetailModal';
import { Goal } from '../../../types';
import { useGoals } from '../../../hooks/useGoals';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import AnalysisClient from '../../../lib/analysisClient';

export default function GoalsLayout() {
  const { activeProject } = useActiveProjectStore();
  const { goals, loading, error, createGoal, updateGoal } = useGoals(activeProject?.id || null);
  const { startAnalysis } = useAnalysisStore();
  const { getProject } = useProjectConfigStore();
  
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Set initial selected goal when goals are loaded
  useEffect(() => {
    if (goals.length > 0 && !selectedGoal) {
      const inProgressGoal = goals.find(goal => goal.status === 'in_progress');
      const firstGoal = goals[0];
      setSelectedGoal(inProgressGoal || firstGoal);
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

  const handleAddGoal = () => {
    setIsAddModalOpen(true);
  };

  const handleAnalyzeGoal = async () => {
    if (!selectedGoal || !activeProject) return;
    
    const project = getProject(activeProject.id);
    if (!project?.git?.repository) {
      console.error('No repository URL found for project');
      return;
    }
    
    // Start analysis state
    startAnalysis(selectedGoal.id);
    
    // Trigger n8n webhook
    try {
      const response = await AnalysisClient.triggerAnalysis({
        repository: project.git.repository,
        goal: selectedGoal.title,
        branch: project.git.branch
      });
      
      if (!response.success) {
        console.error('Analysis failed:', response.error);
      } else {
        console.log('Analysis started successfully:', response.message);
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    }
  };

  const handleAddNewGoal = async (newGoal: Omit<Goal, 'id' | 'order'>) => {
    const maxOrder = Math.max(...goals.map(g => g.order), 0);
    const goalWithOrder = { ...newGoal, order: maxOrder + 1 };
    
    const createdGoal = await createGoal(goalWithOrder);
    if (createdGoal) {
      setIsAddModalOpen(false);
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full h-16 
        bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/30 mb-6"
      >
        <div className="h-full w-full flex items-center justify-between px-6">
          {/* Timeline on the left */}
          <div className="flex-shrink-0">
            <GoalsTimeline 
              goals={goals}
              selectedGoal={selectedGoal}
              onGoalSelect={handleTimelineGoalSelect}
            />
          </div>

          {/* Goal title in the center */}
          <div className="flex-1 flex justify-center px-8">
            {selectedGoal && (
              <motion.div
                key={selectedGoal.id} // Force re-render on goal change
                initial={{ opacity: 0, y: 5 }}
                animate={{ 
                  opacity: isTransitioning ? 0 : 1, 
                  y: isTransitioning ? -5 : 0 
                }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="text-center cursor-pointer group"
                onClick={handleGoalDetailClick}
              >
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: isTransitioning ? 0 : 1,
                    y: isTransitioning ? -3 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="text-lg font-semibold text-white tracking-wide leading-tight group-hover:text-slate-200 transition-colors duration-200"
                >
                  {selectedGoal.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: isTransitioning ? 0 : 1,
                    y: isTransitioning ? -2 : 0
                  }}
                  transition={{ duration: 0.3, delay: 0.05, ease: "easeInOut" }}
                  className="text-xs text-slate-400 capitalize mt-1 font-medium tracking-wider group-hover:text-slate-300 transition-colors duration-200"
                >
                  {selectedGoal.status.replace('_', ' ')}
                </motion.p>
              </motion.div>
            )}
          </div>

          {/* Actions on the right */}
          <div className="flex-shrink-0">
            <GoalsActions
              selectedGoal={selectedGoal}
              onAddGoal={handleAddGoal}
              onAnalyzeGoal={handleAnalyzeGoal}
            />
          </div>
        </div>
      </motion.div>

      {/* Goal Detail Modal */}
      <GoalsDetailModal
        goal={selectedGoal}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={updateGoal}
      />

      {/* Add Goal Modal */}
      <GoalsAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddNewGoal}
      />
    </>
  );
} 