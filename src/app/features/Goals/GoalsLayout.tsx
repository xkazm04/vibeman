'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, Circle, Clock, XCircle, HelpCircle } from 'lucide-react';

import ProjectsLayout from '../../projects/ProjectsLayout';
import GoalsAddModal from './sub_GoalModal/components/GoalsAddModal';
import GoalsDetailModalContent from './sub_GoalModal/components/GoalsDetailModalContent';
import { Goal } from '../../../types';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import { getNextOrder } from './sub_GoalModal/lib';
import ImplementationLogList from './sub_ImplementationLog/ImplementationLogList';
import ScreenCatalog from './sub_ScreenCatalog/ScreenCatalog';
import EventsBarChart from './sub_EventsBarChart/EventsBarChart';

interface GoalsLayoutProps {
  projectId: string | null;
}

const STATUS_ICONS = {
  open: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  rejected: XCircle,
  undecided: HelpCircle,
};

const STATUS_COLORS = {
  open: 'text-blue-400',
  in_progress: 'text-cyan-400',
  done: 'text-green-400',
  rejected: 'text-red-400',
  undecided: 'text-gray-400',
};

function GoalsLayoutContent({ projectId }: GoalsLayoutProps) {
  const { activeProject } = useActiveProjectStore();
  const { goals, createGoal, updateGoal } = useGoalContext();
  const { showAddGoal, setShowAddGoal } = useProjectsToolbarStore();
  const { showShellModal, hideModal } = useGlobalModal();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Filter goals for active project
  const projectGoals = goals.filter(goal => goal.projectId === activeProject?.id);

  const handleGoalClick = (goal: Goal) => {
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
        content: { enabled: true },
        customContent: (
          <GoalsDetailModalContent
            goal={goal}
            projectId={activeProject?.id || null}
            onSave={updateGoal}
            onClose={hideModal}
          />
        ),
        isTopMost: true
      }
    );
  };

  const handleAddNewGoal = async (newGoal: Omit<Goal, 'id' | 'order' | 'projectId'>) => {
    if (!activeProject) return;

    const goalWithOrder = {
      ...newGoal,
      projectId: activeProject.id,
      order: getNextOrder(projectGoals)
    };

    const createdGoal = await createGoal(goalWithOrder);
    if (createdGoal) {
      setShowAddGoal(false);
    }
  };

  return (
    <>
      {/* Projects Toolbar */}
      <ProjectsLayout />

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Goals List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-64 flex-shrink-0 bg-gray-900/50 border-r border-gray-700/50 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Goals</h2> 
              <span className="ml-auto text-xs text-gray-500 font-mono">
                {projectGoals.length}
              </span>
            </div>
          </div>

          {/* Goals List */}
          <div className="p-2 space-y-1">
            <AnimatePresence>
              {projectGoals.map((goal) => {
                const StatusIcon = STATUS_ICONS[goal.status];
                const statusColor = STATUS_COLORS[goal.status];

                return (
                  <motion.button
                    key={goal.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => handleGoalClick(goal)}
                    data-testid={`goal-item-${goal.id}`}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg border transition-all
                      ${selectedGoal?.id === goal.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <StatusIcon className={`w-3.5 h-3.5 ${statusColor} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate" title={goal.title}>
                          {goal.title}
                        </p>
                        {goal.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {projectGoals.length === 0 && (
              <div className="text-center py-8 px-4">
                <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No goals yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Click the Goal button in the toolbar to add one
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Main Area - Implementation Logs, Events Bar Chart, and Screen Catalog */}
        <div className="flex flex-col gap-4 overflow-hidden bg-gray-950/50 p-4">
          {/* Top Row - Implementation Logs and Events Bar Chart */}
          <div className="flex flex-row gap-4">
            {/* Implementation Logs - Left */}
            <div className="flex overflow-y-auto">
              {projectId ? (
                <ImplementationLogList projectId={projectId} limit={10} />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24"
                >
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Project Selected</h3>
                  <p className="text-gray-500">
                    Select a project from the toolbar above to view implementation logs
                  </p>
                </motion.div>
              )}
            </div>

            {/* Events Bar Chart - Right */}
            {projectId && (
              <div className="flex overflow-y-auto">
                <EventsBarChart projectId={projectId} limit={10} />
              </div>
            )}
          </div>

          {/* Bottom Row - Screen Catalog */}
          <ScreenCatalog projectId={projectId} />
        </div>
      </div>

      {/* Add Goal Modal */}
      <GoalsAddModal
        isOpen={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSubmit={handleAddNewGoal}
      />
    </>
  );
}

export default function GoalsLayout({ projectId }: GoalsLayoutProps) {
  return (
    <GoalProvider projectId={projectId}>
      <GoalsLayoutContent projectId={projectId} />
    </GoalProvider>
  );
}
