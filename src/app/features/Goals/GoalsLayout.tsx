'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, Circle, Clock, XCircle, HelpCircle, LayoutDashboard, Plus, ChevronRight } from 'lucide-react';
import { Caveat } from 'next/font/google';

import ProjectsLayout from '@/app/projects/ProjectsLayout';
import GoalModal from './sub_GoalModal/GoalModal';
import { Goal } from '../../../types';
import { GoalProvider, useGoalContext } from '@/contexts/GoalContext';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { getNextOrder } from './sub_GoalModal/lib';
import ImplementationLogList from './sub_ImplementationLog/ImplementationLogList';
import ScreenCatalog from './sub_ScreenCatalog/ScreenCatalog';
import EventsBarChart from './sub_EventsBarChart/EventsBarChart';
import { ContextTargetsList } from '@/components/ContextComponents';

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

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
  in_progress: 'text-primary',
  done: 'text-green-400',
  rejected: 'text-red-400',
  undecided: 'text-muted-foreground',
};

function GoalsLayoutContent({ projectId }: GoalsLayoutProps) {
  const { activeProject } = useActiveProjectStore();
  const { goals, createGoal, updateGoal } = useGoalContext();
  const { showAddGoal, setShowAddGoal } = useProjectsToolbarStore();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Goals are already filtered by projectId in the GoalProvider
  const projectGoals = goals;

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailModal(true);
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
              <span className="px-2 py-1 rounded bg-primary/10 text-xs font-mono text-primary/70 border border-primary/20">
                {projectGoals.length} OBJECTIVES
              </span>
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
                  {projectGoals.map((goal) => {
                    const StatusIcon = STATUS_ICONS[goal.status];
                    const statusColor = STATUS_COLORS[goal.status];

                    return (
                      <motion.button
                        key={goal.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleGoalClick(goal)}
                        className={
                          'w-full text-left px-4 py-3 rounded-xl border transition-all group relative overflow-hidden ' +
                          (selectedGoal?.id === goal.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-transparent border-transparent hover:bg-primary/5 hover:border-primary/10')
                        }
                      >
                        {selectedGoal?.id === goal.id && (
                          <motion.div 
                            layoutId="activeGoalGlow"
                            className="absolute inset-0 bg-primary/5"
                          />
                        )}
                        <div className="relative flex items-start gap-3">
                          <StatusIcon className={'w-4 h-4 ' + statusColor + ' mt-0.5'} />
                          <div className="flex-1 min-w-0">
                            <p className={'text-sm font-medium truncate ' + (selectedGoal?.id === goal.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')}>
                              {goal.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">ID-{goal.id.slice(0,4)}</span>
                            </div>
                          </div>
                          <ChevronRight className={'w-4 h-4 text-muted-foreground/60 transition-transform ' + (selectedGoal?.id === goal.id ? 'text-primary translate-x-1' : 'group-hover:text-muted-foreground')} />
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                
                {projectGoals.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                    <Target className="w-8 h-8 text-primary/20 mb-2" />
                    <p className="text-sm text-primary/30">No active objectives</p>
                  </div>
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
