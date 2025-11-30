'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Plus, Pencil, Target, Zap, Trash2, FileCode } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useProjectsToolbarStore } from '@/stores/projectsToolbarStore';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import { useThemeStore } from '@/stores/themeStore';
import { deleteProject } from './sub_ProjectSetting/lib/projectApi';
import ProjectSelectionModal from './sub_ProjectSetting/components/ProjectSelectionModal';
import GlowWrapper from '@/app/features/Onboarding/components/GlowWrapper';
import { useActiveOnboardingStep } from '@/app/features/Onboarding/lib/useOnboardingConditions';
import type { Project } from '@/types';

interface ToolbarAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  colorScheme: 'cyan' | 'blue' | 'amber' | 'red';
  glow?: boolean;
  separateRight?: boolean;
  testId?: string;
}

export default function ProjectToolbar() {
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { syncWithServer, getAllProjects } = useProjectConfigStore();
  const {
    setShowAddProject,
    setShowEditProject,
    setShowAddGoal,
    setShowAIReview,
    setShowStructure,
  } = useProjectsToolbarStore();
  const { showFullScreenModal, hideModal } = useGlobalModal();
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // Fetch projects from API instead of store
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(true);

  const fetchProjects = React.useCallback(async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
      }
    } catch (error) {
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Onboarding
  const { isCreateProjectActive } = useActiveOnboardingStep();

  // Switch Project
  const handleSwitchProject = () => {
    if (projects.length > 0) {
      showFullScreenModal(
        'Select Project',
        <ProjectSelectionModal
          projects={projects}
          activeProject={activeProject}
          onProjectSelect={(project) => {
            setActiveProject(project);
            hideModal();
          }}
          onAddProject={() => {
            hideModal();
            setShowAddProject(true);
          }}
        />,
        {
          subtitle: 'Choose a project to work with',
          icon: FolderOpen,
          iconBgColor: `${colors.primaryFrom}/20 to-blue-600/20`,
          iconColor: colors.text,
          maxWidth: 'max-w-6xl',
          maxHeight: 'max-h-[85vh]'
        }
      );
    }
  };

  // Add Project
  const handleAddProject = () => {
    setShowAddProject(true);
  };

  // Edit Project
  const handleEditProject = () => {
    if (activeProject) {
      setShowEditProject(true);
    }
  };

  // Project Docs
  const handleProjectDocs = () => {
    setShowAIReview(true);
  };

  // Add Goal
  const handleAddGoal = () => {
    setShowAddGoal(true);
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!activeProject) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete project "${activeProject.name}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      const success = await deleteProject(activeProject.id);
      if (success) {
        // Refetch projects from API
        await fetchProjects();
        // Get updated projects and set first one as active if available
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          const remainingProjects = data.projects || [];
          if (remainingProjects.length > 0) {
            setActiveProject(remainingProjects[0]);
          } else {
            setActiveProject(null);
          }
        }
      } else {
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  // Structure Editor
  const handleStructureEditor = () => {
    if (activeProject) {
      setShowStructure(true);
    }
  };

  // Theme-aware color scheme using theme tokens for primary color
  const colorSchemes = {
    cyan: {
      bg: `${colors.primaryFrom}/20 ${colors.primaryTo}/20`.replace('from-', 'from-').replace('to-', 'to-'),
      hover: `hover:${colors.primaryFrom}/30 hover:${colors.primaryTo}/30`.replace('from-', 'from-').replace('to-', 'to-'),
      border: colors.border,
      text: colors.textDark,
      glow: colors.glow.replace('shadow-', 'shadow-').replace('/50', '/20'),
    },
    blue: {
      bg: 'from-blue-600/20 to-blue-400/20',
      hover: 'hover:from-blue-600/30 hover:to-blue-400/30',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20',
    },
    amber: {
      bg: 'from-amber-600/20 to-amber-400/20',
      hover: 'hover:from-amber-600/30 hover:to-amber-400/30',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/20',
    },
    red: {
      bg: 'from-red-600/20 to-red-400/20',
      hover: 'hover:from-red-600/30 hover:to-red-400/30',
      border: 'border-red-500/30',
      text: 'text-red-400',
      glow: 'shadow-red-500/20',
    },
  };

  // Project Tools Section
  const projectTools: ToolbarAction[] = [
    {
      id: 'switch-project',
      icon: FolderOpen,
      label: 'Switch',
      onClick: handleSwitchProject,
      disabled: loadingProjects || projects.length === 0,
      colorScheme: 'cyan',
      testId: 'toolbar-switch-project',
    },
    {
      id: 'add-project',
      icon: Plus,
      label: 'Add',
      onClick: handleAddProject,
      colorScheme: 'cyan',
      glow: isCreateProjectActive,
      testId: 'toolbar-add-project',
    },
    {
      id: 'edit-project',
      icon: Pencil,
      label: 'Edit',
      onClick: handleEditProject,
      disabled: !activeProject,
      colorScheme: 'blue',
      testId: 'toolbar-edit-project',
    },
    {
      id: 'structure',
      icon: FileCode,
      label: 'Structure',
      onClick: handleStructureEditor,
      disabled: !activeProject,
      colorScheme: 'blue',
      testId: 'toolbar-structure',
    },
    {
      id: 'delete-project',
      icon: Trash2,
      label: 'Delete',
      onClick: handleDeleteProject,
      disabled: !activeProject,
      colorScheme: 'red',
      testId: 'toolbar-delete-project',
    },
  ];

  // Actions Section
  const actionTools: ToolbarAction[] = [
    {
      id: 'add-goal',
      icon: Target,
      label: 'Goal',
      onClick: handleAddGoal,
      colorScheme: 'blue',
      testId: 'toolbar-add-goal',
    },
    {
      id: 'ai-plan',
      icon: Zap,
      label: 'Plan',
      onClick: handleProjectDocs,
      disabled: !activeProject,
      colorScheme: 'amber',
      testId: 'toolbar-ai-plan',
    },
  ];

  const renderAction = (action: ToolbarAction) => {
    const Icon = action.icon;
    const scheme = colorSchemes[action.colorScheme];

    const button = (
      <motion.div
        key={action.id}
        className="flex flex-col items-center gap-1.5"
      >
        <motion.button
          onClick={action.onClick}
          disabled={action.disabled}
          data-testid={action.testId}
          whileHover={!action.disabled ? { scale: 1.05, y: -2 } : {}}
          whileTap={!action.disabled ? { scale: 0.95 } : {}}
          className={`
            group relative p-3 rounded-xl
            bg-gradient-to-br ${scheme.bg} ${scheme.hover}
            border ${scheme.border}
            transition-all duration-300
            disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg ${scheme.glow}
            backdrop-blur-sm
          `}
        >
          {/* Glow effect on hover */}
          <motion.div
            className={`absolute inset-0 rounded-xl bg-gradient-to-br ${scheme.bg} blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10`}
          />

          {/* Icon */}
          <Icon className={`w-5 h-5 ${scheme.text} transition-transform duration-300 ${
            !action.disabled ? 'group-hover:scale-110' : ''
          }`} />
        </motion.button>

        {/* Label below icon */}
        <span className={`text-[10px] font-medium ${scheme.text} ${action.disabled ? 'opacity-40' : ''}`}>
          {action.label}
        </span>
      </motion.div>
    );

    // Always wrap with consistent structure to prevent hydration mismatch
    return (
      <GlowWrapper key={action.id} isActive={action.glow || false}>
        {button}
      </GlowWrapper>
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Project Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-3"
      >
        {activeProject ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.primary} animate-pulse shadow-lg ${colors.glow}`} />
              <h2 className="text-lg font-semibold text-white font-mono">
                {activeProject.name}
              </h2>
            </div>
            {activeProject.type && (
              <span className={`px-2 py-0.5 ${colors.bg} border ${colors.border} rounded text-[10px] font-medium ${colors.textDark} uppercase tracking-wider`}>
                {activeProject.type}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-600/50" />
            <h2 className="text-lg font-semibold text-gray-500 font-mono">
              No Project Selected
            </h2>
          </div>
        )}
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center justify-center px-6">
        <div className="flex items-center gap-6">
          {/* Project Tools Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            {projectTools.map(action => renderAction(action))}
          </motion.div>

          {/* Vertical Separator */}
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-600/50 to-transparent" />

          {/* Actions Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center gap-2"
          >
            {actionTools.map(action => renderAction(action))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
