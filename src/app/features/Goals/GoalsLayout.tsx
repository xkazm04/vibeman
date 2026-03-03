'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, ChevronRight } from 'lucide-react';

import ProjectsLayout from '@/app/projects/ProjectsLayout';
import DashboardSectionHeader from './components/DashboardSectionHeader';
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
import StandupHistoryTimeline from '@/app/features/DailyStandup/components/StandupHistoryTimeline';
import { ContextTargetsList } from '@/components/ContextComponents';
import GoalEmptyState from './components/GoalEmptyState';
import { GoalProgressMini } from './components/GoalProgressRing';
import GlassCard from '@/components/cards/GlassCard';

interface GoalsLayoutProps {
  projectId: string | null;
}

interface GoalListItemProps {
  goal: Goal;
  isSelected: boolean;
  isFocused: boolean;
  onClick: (goal: Goal) => void;
  tabIndex: number;
}

const GoalListItem = React.memo(function GoalListItem({ goal, isSelected, isFocused, onClick, tabIndex }: GoalListItemProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const statusConfig = getStatusConfig(goal.status);
  const StatusIcon = statusConfig.icon;
  const statusColor = statusConfig.color;
  const progress = goal.progress || 0;

  React.useEffect(() => {
    if (isFocused && ref.current && document.activeElement?.closest('[role="listbox"]')) {
      ref.current.focus();
    }
  }, [isFocused]);

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onClick(goal)}
      role="option"
      aria-selected={isSelected}
      tabIndex={tabIndex}
      className={
        'w-full text-left px-4 py-3 rounded-xl border transition-all group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
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
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Goals are already filtered by projectId in the GoalProvider
  const projectGoals = goals;

  // Calculate goal statistics for progress display
  const completedGoals = useMemo(() => projectGoals.filter(g => g.status === 'done').length, [projectGoals]);

  const handleGoalClick = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
  }, []);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    const count = projectGoals.length;
    if (count === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => (i + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => (i - 1 + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const goal = projectGoals[focusedIndex];
      if (goal) handleGoalClick(goal);
    }
  }, [projectGoals, focusedIndex, handleGoalClick]);

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
            <DashboardSectionHeader
              title="MISSION CONTROL"
              icon={<LayoutDashboard className="w-5 h-5 text-primary" />}
              action={
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
              }
            />

            <GlassCard variant="panel" className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/5 bg-white/[0.03]">
                <DashboardSectionHeader
                  title="Active Goals"
                  variant="secondary"
                  action={
                    <button
                      onClick={() => setShowAddGoal(true)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                      data-testid="add-goal-btn"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  }
                />
              </div>

              <div
                className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
                role="listbox"
                aria-label="Goals"
                onKeyDown={handleListKeyDown}
              >
                <AnimatePresence>
                  {projectGoals.map((goal, idx) => (
                    <GoalListItem
                      key={goal.id}
                      goal={goal}
                      isSelected={selectedGoal?.id === goal.id}
                      isFocused={focusedIndex === idx}
                      onClick={handleGoalClick}
                      tabIndex={focusedIndex === idx ? 0 : -1}
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
            </GlassCard>
          </div>

          {/* Middle Column: Implementation Logs (5 cols) */}
          <div className="col-span-5 flex flex-col gap-4 h-full">
            <DashboardSectionHeader title="System Logs" />
            
            <GlassCard variant="panel" className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
              <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                {projectId ? (
                  <ImplementationLogList projectId={projectId} limit={20} />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/30">
                    Select a project to view logs
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Analytics & Catalog (4 cols) */}
          <div className="col-span-4 flex flex-col gap-4 h-full">
            {/* Top: Events Chart */}
            <GlassCard variant="panel" className="shrink-0 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/5 bg-white/[0.03]">
                <DashboardSectionHeader title="Activity Velocity" variant="secondary" />
              </div>
              <div className="p-4 relative">
                {projectId && <EventsBarChart projectId={projectId} limit={10} />}
              </div>
            </GlassCard>

            {/* Middle: Standup History Timeline */}
            <GlassCard variant="panel" className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="p-4 border-b border-white/5 bg-white/[0.03]">
                <DashboardSectionHeader title="Standup History" variant="secondary" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {projectId ? (
                  <StandupHistoryTimeline projectId={projectId} limit={30} />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/30 text-xs">
                    Select a project
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Bottom: Screen Catalog */}
            <GlassCard variant="panel" className="shrink-0 h-[200px] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/5 bg-white/[0.03]">
                <DashboardSectionHeader title="Visual Assets" variant="secondary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <ScreenCatalog projectId={projectId} />
              </div>
            </GlassCard>
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
