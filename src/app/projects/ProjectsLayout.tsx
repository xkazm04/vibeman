'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Zap,
} from 'lucide-react';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../stores/projectsToolbarStore';
import { useProjectConfigStore } from '../../stores/projectConfigStore';
import AIProjectReviewModal from './AIProjectReviewModal';
import ProjectAdd from './ProjectSetting/ProjectAdd';
import ProjectManagement from './ProjectSetting/ProjectManagement';

interface ProjectsLayoutProps {
  // Goals Management - these will be passed from GoalsLayout
  selectedGoal?: any;
  onAnalyzeGoal?: () => void;
  onRefreshGoals?: () => void;
}

export default function ProjectsLayout({
  selectedGoal,
  onAnalyzeGoal,
  onRefreshGoals
}: ProjectsLayoutProps) {
  const { isActive } = useAnalysisStore();
  const { activeProject } = useActiveProjectStore();
  const { syncWithServer } = useProjectConfigStore();
  const {
    showAddProject,
    showAIReview,
    setShowAddProject,
    setShowAddGoal,
    setShowAIReview
  } = useProjectsToolbarStore();


  // Goals Management Handlers
  const handleAddGoal = () => {
    setShowAddGoal(true);
  };

  // AI Features Handlers
  const handleAIProjectReview = () => {
    setShowAIReview(true);
  };

  // Handle project added - refresh the project list
  const handleProjectAdded = async () => {
    await syncWithServer();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full py-4 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/30 ${isActive ? 'shadow-lg shadow-purple-500/20' : ''
          }`}
      >
        <div className="h-full w-full flex items-center justify-between px-6 gap-8">

          {/* Left Section: Project Management */}
          <ProjectManagement />


          {/* Right Section: Goals & AI Actions */}
          <div className="flex items-center space-x-4">

            {/* AI Features Group */}
            <div className="relative flex items-center space-x-3 px-4 py-3 bg-gray-800/30 rounded-lg border border-gray-700/40 min-w-0">
              {/* Section Label */}
              <div className="absolute -top-2 left-2 px-2 py-0.5 bg-gray-900 rounded text-xs font-bold text-amber-400 tracking-wider">
                Actions
              </div>

              <div className="flex items-center space-x-3">
                {/* Add Goal Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddGoal}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-md text-purple-400 transition-all duration-300 group text-sm"
                  title="Add new goal"
                >
                  <Target className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="font-medium">Goal</span>
                </motion.button>
                {/* AI Project Review Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAIProjectReview}
                  disabled={!activeProject}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-md text-amber-400 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title="AI-powered project review and analysis"
                >
                  <Zap className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-medium">Plan</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Project Review Modal */}
      <AIProjectReviewModal
        isOpen={showAIReview}
        onClose={() => setShowAIReview(false)}
      />

      {/* Add Project Modal */}
      <ProjectAdd
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        onProjectAdded={handleProjectAdded}
      />
    </>
  );
}