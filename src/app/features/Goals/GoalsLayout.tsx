'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, ChevronRight, ChevronUp, X, ClipboardCheck, GitBranch, GitPullRequest, History, CalendarDays } from 'lucide-react';

import ProjectsLayout from '@/app/projects/ProjectsLayout';
import DashboardSectionHeader from './components/DashboardSectionHeader';
import GoalModal from './sub_GoalModal/GoalModal';
import WeeklyCheckinModal from './components/WeeklyCheckinModal';
import ConfidenceSparkline from './components/ConfidenceSparkline';
import { Goal } from '../../../types';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { useClientProjectStore } from '../../../stores/clientProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { getNextOrder } from './sub_GoalModal/lib';
import { getStatusConfig } from './sub_GoalModal/lib/goalConstants';
import ImplementationLogList from './sub_ImplementationLog/ImplementationLogList';
import ScreenCatalog from './sub_ScreenCatalog/ScreenCatalog';
import EventsBarChart from './sub_EventsBarChart/EventsBarChart';
import StandupHistoryTimeline from '@/app/features/DailyStandup/components/StandupHistoryTimeline';
import SprintPlannerPanel from '@/app/features/DailyStandup/components/SprintPlannerPanel';
import { ContextTargetsList } from '@/components/ContextComponents';
import GoalEmptyState from './components/GoalEmptyState';
import GoalConstellation from './components/GoalConstellation';
import { GoalProgressMini } from './components/GoalProgressRing';
import GlassCard from '@/components/cards/GlassCard';
import { duration, easing } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import StaggeredReveal from '@/components/lazy/StaggeredReveal';
import PRActivityPanel from './components/PRActivityPanel';

interface GoalsLayoutProps {
  projectId: string | null;
}

interface CheckinHistory {
  confidence: number;
  weekOf: string;
}

interface GoalPRCount {
  open_count: number;
  merged_count: number;
}

interface GoalListItemProps {
  goal: Goal;
  isSelected: boolean;
  isFocused: boolean;
  onClick: (goal: Goal) => void;
  tabIndex: number;
  checkinHistory?: CheckinHistory[];
  prCount?: GoalPRCount;
}

const GoalListItem = React.memo(function GoalListItem({ goal, isSelected, isFocused, onClick, tabIndex, checkinHistory, prCount }: GoalListItemProps) {
  const prefersReduced = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const statusConfig = getStatusConfig(goal.status);
  const StatusIcon = statusConfig.icon;
  const statusColor = statusConfig.color;
  const progress = Number.isFinite(goal.progress) ? (goal.progress as number) : 0;

  React.useEffect(() => {
    if (isFocused && ref.current && document.activeElement?.closest('[role="listbox"]')) {
      ref.current.focus();
    }
  }, [isFocused]);

  return (
    <motion.button
      ref={ref}
      initial={prefersReduced ? false : { opacity: 0, x: -10 }}
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
            <span className="text-2xs font-mono text-muted-foreground/60 uppercase">ID-{goal.id.slice(0, 4)}</span>
            {progress > 0 && (
              <span className="text-2xs font-mono text-blue-400/70">{progress}%</span>
            )}
            {prCount && (prCount.open_count > 0 || prCount.merged_count > 0) && (
              <span className="inline-flex items-center gap-1 text-2xs">
                {prCount.open_count > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-500/10 text-green-400/70">
                    <GitPullRequest className="w-2.5 h-2.5" />{prCount.open_count}
                  </span>
                )}
                {prCount.merged_count > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-500/10 text-purple-400/70">
                    <GitPullRequest className="w-2.5 h-2.5" />{prCount.merged_count}
                  </span>
                )}
              </span>
            )}
            {checkinHistory && checkinHistory.length > 0 && (
              <ConfidenceSparkline history={checkinHistory} />
            )}
          </div>
          {/* Lifecycle progress bar */}
          {progress > 0 && (
            <div className="mt-1.5 h-1 bg-primary/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: duration.slow, ease: easing.entrance }}
              />
            </div>
          )}
        </div>
        <ChevronRight className={'w-4 h-4 text-muted-foreground/60 transition-transform ' + (isSelected ? 'text-primary translate-x-1' : 'group-hover:text-muted-foreground')} />
      </div>
    </motion.button>
  );
});

function AnalyticsPanels({ projectId }: { projectId: string | null }) {
  // Toggle between backward-looking standup history and forward-looking sprint plan
  const [standupView, setStandupView] = useState<'history' | 'sprint'>('history');

  return (
    <>
      {/* PR Activity */}
      {projectId && (
        <GlassCard variant="panel" className="shrink-0 overflow-hidden flex flex-col max-h-[320px]">
          <div className="p-4 border-b border-white/5 bg-white/[0.03]">
            <DashboardSectionHeader title="PR Activity" variant="secondary" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <PRActivityPanel projectId={projectId} />
          </div>
        </GlassCard>
      )}

      {/* Events Chart */}
      <GlassCard variant="panel" className="shrink-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/[0.03]">
          <DashboardSectionHeader title="Activity Velocity" variant="secondary" />
        </div>
        <div className="p-4 relative">
          {projectId && <EventsBarChart projectId={projectId} limit={10} />}
        </div>
      </GlassCard>

      {/* Standup History ↔ Sprint Planner toggle */}
      <GlassCard variant="panel" className="lg:flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-white/5 bg-white/[0.03]">
          <DashboardSectionHeader
            title={standupView === 'history' ? 'Standup History' : 'Sprint Plan'}
            variant="secondary"
            action={projectId ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStandupView('history')}
                  className={`p-1.5 rounded-lg transition-colors ${standupView === 'history' ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
                  title="Standup history"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStandupView('sprint')}
                  className={`p-1.5 rounded-lg transition-colors ${standupView === 'sprint' ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
                  title="Predictive sprint planner"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px] lg:max-h-none">
          {projectId ? (
            standupView === 'history' ? (
              <div className="p-4">
                <StandupHistoryTimeline projectId={projectId} limit={30} />
              </div>
            ) : (
              <SprintPlannerPanel projectId={projectId} />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-white/30 text-xs p-4">
              Select a project
            </div>
          )}
        </div>
      </GlassCard>

      {/* Screen Catalog */}
      <GlassCard variant="panel" className="shrink-0 h-[200px] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/[0.03]">
          <DashboardSectionHeader title="Visual Assets" variant="secondary" />
        </div>
        <div className="flex-1 overflow-hidden">
          <ScreenCatalog projectId={projectId} />
        </div>
      </GlassCard>
    </>
  );
}

function GoalsLayoutContent({ projectId }: GoalsLayoutProps) {
  const prefersReduced = useReducedMotion();
  const { activeProject } = useClientProjectStore();
  const { goals, createGoal, updateGoal } = useGoalContext();
  const { showAddGoal, setShowAddGoal } = useProjectsToolbarStore();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinHistoryMap, setCheckinHistoryMap] = useState<Record<string, Array<{ confidence: number; weekOf: string }>>>({});
  const [prCountsMap, setPrCountsMap] = useState<Record<string, GoalPRCount>>({});
  const [goalView, setGoalView] = useState<'list' | 'graph'>('list');

  // Fetch PR counts per goal
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/pull-requests?projectId=${projectId}`)
      .then(r => r.ok ? r.json() : { data: { goalCounts: [] } })
      .then(json => {
        const map: Record<string, GoalPRCount> = {};
        for (const c of (json.data?.goalCounts || [])) {
          map[c.goal_id] = { open_count: c.open_count, merged_count: c.merged_count };
        }
        setPrCountsMap(map);
      })
      .catch(() => {});
  }, [projectId]);

  // Fetch check-in history for all goals in this project
  useEffect(() => {
    if (!projectId || goals.length === 0) return;
    const controller = new AbortController();
    Promise.all(
      goals.map(g =>
        fetch(`/api/goals/checkins?goalId=${encodeURIComponent(g.id)}&limit=8`, { signal: controller.signal })
          .then(r => r.ok ? r.json() : { checkins: [] })
          .then(data => ({ goalId: g.id, checkins: (data.checkins || []).reverse().map((c: { confidence: number; week_of: string }) => ({ confidence: c.confidence, weekOf: c.week_of })) }))
          .catch(() => ({ goalId: g.id, checkins: [] }))
      )
    ).then(results => {
      const map: Record<string, Array<{ confidence: number; weekOf: string }>> = {};
      for (const r of results) {
        if (r.checkins.length > 0) map[r.goalId] = r.checkins;
      }
      setCheckinHistoryMap(map);
    });
    return () => controller.abort();
  }, [projectId, goals]);

  const handleCheckinSubmit = useCallback(async (checkins: Array<{ goalId: string; confidence: number; note: string }>) => {
    if (!projectId) return;
    await fetch('/api/goals/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, checkins }),
    });
    // Refresh check-in history
    const results = await Promise.all(
      goals.map(g =>
        fetch(`/api/goals/checkins?goalId=${encodeURIComponent(g.id)}&limit=8`)
          .then(r => r.ok ? r.json() : { checkins: [] })
          .then(data => ({ goalId: g.id, checkins: (data.checkins || []).reverse().map((c: { confidence: number; week_of: string }) => ({ confidence: c.confidence, weekOf: c.week_of })) }))
          .catch(() => ({ goalId: g.id, checkins: [] }))
      )
    );
    const map: Record<string, Array<{ confidence: number; weekOf: string }>> = {};
    for (const r of results) {
      if (r.checkins.length > 0) map[r.goalId] = r.checkins;
    }
    setCheckinHistoryMap(map);
  }, [projectId, goals]);

  // Track if we're below lg breakpoint for bottom sheet behavior
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setBottomSheetOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
      <StaggeredReveal stagger={0.14} distance={20} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Projects Toolbar */}
      <div className="z-20">
        <ProjectsLayout />
      </div>

      {/* Main Content - Responsive Dashboard Grid */}
      <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/80 pointer-events-none" />

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 blur-3xl pointer-events-none" />

        {/*
          Responsive grid:
          - default: single column, stacked
          - md: two columns — goal list + implementation logs
          - lg+: three columns — goals | logs | analytics
        */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[minmax(240px,1fr)_minmax(280px,2fr)] lg:grid-cols-[minmax(240px,3fr)_minmax(320px,5fr)_minmax(260px,4fr)] gap-4 lg:gap-6 lg:h-full max-w-[1920px] mx-auto">

          {/* Left Column: Goals List */}
          <div className="flex flex-col gap-4 min-h-[200px] sm:min-h-[280px] lg:h-full">
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
                  title={goalView === 'list' ? 'Active Goals' : 'Constellation'}
                  variant="secondary"
                  action={
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setGoalView(v => v === 'list' ? 'graph' : 'list')}
                        className={`p-1.5 rounded-lg transition-colors ${goalView === 'graph' ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
                        title={goalView === 'list' ? 'Show constellation' : 'Show goal list'}
                      >
                        <GitBranch className="w-4 h-4" />
                      </button>
                      {projectGoals.filter(g => g.status === 'open' || g.status === 'in_progress').length > 0 && (
                        <button
                          onClick={() => setShowCheckinModal(true)}
                          className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-400/60 hover:text-emerald-400 transition-colors"
                          title="Weekly confidence check-in"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddGoal(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        data-testid="add-goal-btn"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  }
                />
              </div>

              {goalView === 'list' ? (
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
                        checkinHistory={checkinHistoryMap[goal.id]}
                        prCount={prCountsMap[goal.id]}
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
              ) : (
                <div className="flex-1 min-h-0 relative">
                  {projectId && (
                    <GoalConstellation
                      goals={projectGoals}
                      projectId={projectId}
                      onGoalClick={handleGoalClick}
                    />
                  )}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Middle Column: Implementation Logs */}
          <div className="flex flex-col gap-4 min-h-[200px] sm:min-h-[280px] lg:h-full">
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

          {/* Right Column: Analytics & Catalog — only visible on lg+ as inline column */}
          <div className="hidden lg:flex flex-col gap-4 lg:h-full">
            <AnalyticsPanels projectId={projectId} />
          </div>

        </div>
      </div>
      </StaggeredReveal>

      {/* Mobile/Tablet: floating button to open analytics bottom sheet */}
      {isMobile && !bottomSheetOpen && (
        <button
          onClick={() => setBottomSheetOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium shadow-lg shadow-primary/20 hover:bg-primary transition-colors backdrop-blur-sm"
        >
          <ChevronUp className="w-4 h-4" />
          Analytics
        </button>
      )}

      {/* Mobile/Tablet: Bottom Sheet overlay for analytics */}
      <AnimatePresence>
        {isMobile && bottomSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setBottomSheetOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={prefersReduced ? false : { y: '100%' }}
              animate={{ y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { y: '100%' }}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-background/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl"
            >
              {/* Drag handle + close */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-white/20 mx-auto" />
                  <span className="text-sm font-medium text-muted-foreground">Analytics & Catalog</span>
                </div>
                <button
                  onClick={() => setBottomSheetOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <AnalyticsPanels projectId={projectId} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      {/* Weekly Confidence Check-in Modal */}
      {projectId && (
        <WeeklyCheckinModal
          isOpen={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          goals={projectGoals}
          projectId={projectId}
          onSubmit={handleCheckinSubmit}
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
