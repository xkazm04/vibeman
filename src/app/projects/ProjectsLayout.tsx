'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Zap,
  Trash2,
} from 'lucide-react';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../stores/projectsToolbarStore';
import { useProjectConfigStore } from '../../stores/projectConfigStore';
import { deleteProject } from './ProjectSetting/lib/projectApi';
import HighLevelDocsModalWrapper from './HighLevelDocsModalWrapper';
import ProjectAdd from './ProjectSetting/ProjectAdd';
import ProjectEdit from './ProjectSetting/ProjectEdit';
import ProjectManagement from './ProjectSetting/ProjectManagement';
import ReviewerPanel from '../reviewer/ReviewerPanel';
import CodeReviewModal from '../reviewer/CodeReviewModal';
import { ActionGroup, ActionConfig } from '@/components/ui';
import GlowWrapper from '@/app/features/Onboarding/components/GlowWrapper';
import { useActiveOnboardingStep } from '@/app/features/Onboarding/lib/useOnboardingConditions';


export default function ProjectsLayout() {
  const { isActive } = useAnalysisStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { syncWithServer } = useProjectConfigStore();

  // Onboarding
  const { isGenerateDocsActive } = useActiveOnboardingStep();

  const {
    showAddProject,
    showEditProject,
    showAIReview,
    setShowAddProject,
    setShowEditProject,
    setShowAddGoal,
    setShowAIReview,
  } = useProjectsToolbarStore();

  // Code Review Modal state - managed at layout level for proper z-index
  const [showCodeReviewModal, setShowCodeReviewModal] = useState(false);

  // Handle code review completion
  const handleCodeReviewComplete = () => {
    setShowCodeReviewModal(false);
    // The ReviewerPanel will auto-refresh its count via useEffect
  };


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
    // Only sync for additions, as they need to fetch the full project data
    await syncWithServer();
  };

  // Handle project updated - no need to refresh, optimistic updates handle it
  const handleProjectUpdated = () => {
    // Stores are already updated optimistically, no need to fetch
    console.log('[ProjectsLayout] Project updated via optimistic update');
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!activeProject) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete project "${activeProject.name}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      const success = await deleteProject(activeProject.id);
      if (success) {
        // Refresh the project list and let the store handle clearing active project
        await syncWithServer();
        // Check if there are other projects available
        const { getAllProjects } = useProjectConfigStore.getState();
        const remainingProjects = getAllProjects();
        if (remainingProjects.length > 0) {
          // Set the first available project as active
          setActiveProject(remainingProjects[0]);
        }
      } else {
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  // Define actions for ActionGroup
  const projectActions: ActionConfig[] = [
    {
      id: 'add-goal',
      icon: Target,
      text: 'Goal',
      onClick: handleAddGoal,
      tooltip: 'Add new goal',
      colorScheme: 'blue',
      iconAnimation: 'rotate',
    },
    {
      id: 'ai-review',
      icon: Zap,
      text: 'Plan',
      onClick: handleAIProjectReview,
      tooltip: 'AI-powered project review and analysis',
      disabled: !activeProject,
      colorScheme: 'amber',
      iconAnimation: 'scale',
    },
    {
      id: 'delete-project',
      icon: Trash2,
      text: '',
      onClick: handleDeleteProject,
      tooltip: 'Delete current project',
      disabled: !activeProject,
      colorScheme: 'red',
      iconOnly: true,
      iconAnimation: 'scale',
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full py-4 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/30 ${isActive ? 'shadow-lg shadow-blue-500/20' : ''
          }`}
      >
        <div className="h-full w-full flex items-center justify-between px-6 gap-8">

          {/* Left Section: Project Management */}
          <ProjectManagement />

          {/* Middle Section: Reviewer Panel */}
          <ReviewerPanel onOpenReview={() => setShowCodeReviewModal(true)} />

          {/* Right Section: Goals & AI Actions */}
          <div className="flex items-center space-x-4">
            <GlowWrapper isActive={isGenerateDocsActive}>
              <ActionGroup label="Actions" actions={projectActions} />
            </GlowWrapper>
          </div>
        </div>
      </motion.div>

      {/* High-Level Documentation Modal */}
      <HighLevelDocsModalWrapper
        isOpen={showAIReview}
        onClose={() => setShowAIReview(false)}
      />

      {/* Add Project Modal */}
      <ProjectAdd
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        onProjectAdded={handleProjectAdded}
      />

      {/* Edit Project Modal */}
      <ProjectEdit
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        onProjectUpdated={handleProjectUpdated}
        project={activeProject}
      />

      {/* Code Review Modal - Rendered at layout level for proper z-index */}
      {showCodeReviewModal && (
        <CodeReviewModal
          isOpen={showCodeReviewModal}
          onClose={() => setShowCodeReviewModal(false)}
          onComplete={handleCodeReviewComplete}
          projectId={activeProject?.id || ''}
        />
      )}
    </>
  );
}