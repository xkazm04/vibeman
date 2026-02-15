'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, ChevronRight } from 'lucide-react';
import { Caveat } from 'next/font/google';

import ProjectsLayout from '@/app/projects/ProjectsLayout';
import GoalModal from './sub_GoalModal/GoalModal';
import { Goal } from '../../../types';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { getNextOrder } from './sub_GoalModal/lib';
import { getStatusConfig } from './sub_GoalModal/lib/goalConstants';
import ImplementationLogList from './sub_ImplementationLog/ImplementationLogList';
import ScreenCatalog from './sub_ScreenCatalog/ScreenCatalog';
import EventsBarChart from './sub_EventsBarChart/EventsBarChart';
import { ContextTargetsList } from '@/components/ContextComponents';
import GoalEmptyState from './components/GoalEmptyState';
import { GoalProgressMini } from './components/GoalProgressRing';

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface GoalsLayoutProps {
  projectId: string | null;
}

interface GoalListItemProps {
  goal: Goal;
  isSelected: boolean;
  onClick: (goal: Goal) => void;
}

const GoalListItem = React.memo(function GoalListItem({ goal, isSelected, onClick }: GoalListItemProps) {
  const statusConfig = getStatusConfig(goal.status);
  const StatusIcon = statusConfig.icon;
  const statusColor = statusConfig.color;
  const progress = goal.progress || 0;

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onClick(goal)}
      className={
        'w-full text-left px-4 py-3 rounded-xl border transition-all group relative overflow-hidden ' +
        (isSelected
          ? 'bg-primary/10 border-primary/30'
          : 'bg-transparent border-transparent hover:bg-primary/5 hover:border-primary/10')
      }
    >
      {isSelected && (
        <motion.div
          layoutId="activeGoalGlow"
          className="absolute inset-0 bg-primary/5"
        />
      )}
      <div className="relative flex items-start gap-3">
        <StatusIcon className={'w-4 h-4 ' + statusColor + ' mt-0.5'} />
        <div className="flex-1 min-w-0">
          <p className={'text-sm font-medium truncate ' + (isSelected ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')}>
            {goal.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">ID-{goal.id.slice(0, 4)}</span>
            {progress > 0 && (
              <span className="text-[10px] font-mono text-blue-400/70">{progress}%</span>
            )}
          </div>
          {/* Lifecycle progress bar */}
          {progress > 0 && (
            <div className="mt-1.5 h-1 bg-primary/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
        <ChevronRight className={'w-4 h-4 text-muted-foreground/60 transition-transform ' + (isSelected ? 'text-primary translate-x-1' : 'group-hover:text-muted-foreground')} />
      </div>
    </motion.button>
  );
});

function GoalsLayoutContent({ projectId }: GoalsLayoutProps) {
  const { activeProject } = useActiveProjectStore();
  const { goals, createGoal, updateGoal } = useGoalContext();
  const { showAddGoal, setShowAddGoal } = useProjectsToolbarStore();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Goals are already filtered by projectId in the GoalProvider
  const projectGoals = goals;

  // Calculate goal statistics for progress display
  const completedGoals = useMemo(() => projectGoals.filter(g => g.status === 'done').length, [projectGoals]);

  const handleGoalClick = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
  }, []);

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
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Projects Toolbar */}
      <div className="z-20">
        <ProjectsLayout />
      </div>

      {/* Main Content - Dashboard Grid */}
      <div className="flex-1 p-6 overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/80 pointer-events-none" />
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-12 gap-6 h-full max-w-[1920px] mx-auto">
          
          {/* Left Column: Goals List (3 cols) */}
          <div className="col-span-3 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                <h2 className={caveat.className + ' text-2xl font-bold text-primary tracking-wide'} style={{ textShadow: '0 0 15px rgba(59, 130, 246, 0.3)' }}>
                  MISSION CONTROL
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {projectGoals.length > 0 && (
                  <GoalProgressMini
                    completed={completedGoals}
                    total={projectGoals.length}
                  />
                )}
                <span className="px-2 py-1 rounded bg-primary/10 text-xs font-mono text-primary/70 border border-primary/20">
                  {projectGoals.length} OBJECTIVES
                </span>
              </div>
            </div>

            <div className="flex-1 bg-secondary/60 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_30px_rgba(59,130,246,0.05)]">
              <div className="p-4 border-b border-primary/10 bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary/50 uppercase tracking-wider">Active Goals</span>
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="p-1.5 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                    data-testid="add-goal-btn"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                <AnimatePresence>
                  {projectGoals.map((goal) => (
                    <GoalListItem
                      key={goal.id}
                      goal={goal}
                      isSelected={selectedGoal?.id === goal.id}
                      onClick={handleGoalClick}
                    />
                  ))}
                </AnimatePresence>
                
                {projectGoals.length === 0 && (
                  <GoalEmptyState
                    onAddGoal={() => setShowAddGoal(true)}
                    className="px-2"
                  />
                )}

                {/* Context Targets Section */}
                {projectId && (
                  <div className="mt-2 px-2">
                    <ContextTargetsList
                      projectId={projectId}
                      compact
                      defaultCollapsed
                      maxItems={10}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Column: Implementation Logs (5 cols) */}
          <div className="col-span-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className={caveat.className + ' text-xl font-bold text-primary/80 tracking-wide'}>System Logs</h2>
            </div>
            
            <div className="flex-1 bg-secondary/60 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden relative shadow-[0_0_30px_rgba(59,130,246,0.05)]">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
              <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                {projectId ? (
                  <ImplementationLogList projectId={projectId} limit={20} />
                ) : (
                  <div className="flex items-center justify-center h-full text-primary/30">
                    Select a project to view logs
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Analytics & Catalog (4 cols) */}
          <div className="col-span-4 flex flex-col gap-6 h-full">
            {/* Top: Events Chart */}
            <div className="h-1/3 bg-secondary/60 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_30px_rgba(59,130,246,0.05)]">
              <div className="p-4 border-b border-primary/10 bg-primary/5">
                <h3 className="text-xs font-mono text-primary/50 uppercase tracking-wider">Activity Velocity</h3>
              </div>
              <div className="flex-1 p-4 relative">
                {projectId && <EventsBarChart projectId={projectId} limit={10} />}
              </div>
            </div>

            {/* Bottom: Screen Catalog */}
            <div className="flex-1 bg-secondary/60 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_30px_rgba(59,130,246,0.05)]">
              <div className="p-4 border-b border-primary/10 bg-primary/5">
                <h3 className="text-xs font-mono text-primary/50 uppercase tracking-wider">Visual Assets</h3>
              </div>
              <div className="flex-1 overflow-hidden">
                <ScreenCatalog projectId={projectId} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Goal Modal */}
      <GoalModal
        mode="add"
        isOpen={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSubmit={handleAddNewGoal}
      />

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalModal
          mode="detail"
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedGoal(null);
          }}
          goal={selectedGoal}
          projectId={activeProject?.id || null}
          onSave={updateGoal}
        />
      )}
    </div>
  );
}

export default function GoalsLayout({ projectId }: GoalsLayoutProps) {
  return (
    <GoalProvider projectId={projectId}>
      <GoalsLayoutContent projectId={projectId} />
    </GoalProvider>
  );
}
