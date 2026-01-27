'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Map, GitBranch, Layers, FileText } from 'lucide-react';
import ContextMapPanel from './ContextMapPanel';
import ArchitectureAnalysisPanel from './ArchitectureAnalysisPanel';
import CrossTaskPanel from './CrossTaskPanel';
import ImplementationPlansManager from './ImplementationPlansManager';
import CrossTaskPlanViewer from './CrossTaskPlanViewer';

type BottomBarTab = 'context-map' | 'architecture' | 'cross-task' | 'plans';

interface TabConfig {
  id: BottomBarTab;
  label: string;
  icon: typeof Map;
  color: string;
}

const TABS: TabConfig[] = [
  { id: 'context-map', label: 'Context Map', icon: Map, color: 'cyan' },
  { id: 'architecture', label: 'Architecture', icon: GitBranch, color: 'purple' },
  { id: 'cross-task', label: 'Cross Task', icon: Layers, color: 'amber' },
  { id: 'plans', label: 'Plans', icon: FileText, color: 'emerald' },
];

interface ArchitectureBottomBarProps {
  workspaceId: string | null;
  projects: Array<{ id: string; name: string; path: string }>;
}

export default function ArchitectureBottomBar({
  workspaceId,
  projects,
}: ArchitectureBottomBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomBarTab>('context-map');
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);

  const handleViewPlan = (planId: string) => {
    setViewingPlanId(planId);
  };

  const handleClosePlanViewer = () => {
    setViewingPlanId(null);
  };

  return (
    <>
      <div className="flex-shrink-0 mb-[100px]">
        {/* Header bar with tabs integrated */}
        <div className="h-10 flex items-center bg-zinc-900/60 backdrop-blur-sm border-t border-cyan-500/10">
          {/* Left: Tab switcher */}
          <div className="flex items-center gap-0.5 px-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClasses = {
                cyan: isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800/50',
                purple: isActive
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800/50',
                amber: isActive
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800/50',
                emerald: isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800/50',
              }[tab.color];

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (!isExpanded) setIsExpanded(true);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${colorClasses}`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Center: Expand/Collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 h-full flex items-center justify-center hover:bg-zinc-800/40 transition-all group"
          >
            <ChevronUp
              className={`w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-all duration-200 ${
                isExpanded ? '' : 'rotate-180'
              }`}
            />
            {!isExpanded && (
              <span className="ml-2 text-[11px] text-zinc-500 group-hover:text-zinc-400">
                Click to expand
              </span>
            )}
          </button>

          {/* Right: Project count badge */}
          <div className="px-3">
            {projects.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[10px] text-cyan-400/70 border border-cyan-500/20">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 280, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-cyan-500/10 bg-zinc-900/80"
            >
              {/* Tab Content - Centered with max width */}
              <div className="h-full flex justify-center">
                <div className="w-full max-w-4xl h-full">
                  <AnimatePresence mode="wait">
                    {activeTab === 'context-map' && (
                      <motion.div
                        key="context-map"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                      >
                        <ContextMapPanel projects={projects} />
                      </motion.div>
                    )}
                    {activeTab === 'architecture' && (
                      <motion.div
                        key="architecture"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                      >
                        <ArchitectureAnalysisPanel
                          workspaceId={workspaceId}
                          projects={projects}
                        />
                      </motion.div>
                    )}
                    {activeTab === 'cross-task' && (
                      <motion.div
                        key="cross-task"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                      >
                        <CrossTaskPanel
                          workspaceId={workspaceId}
                          projects={projects}
                          onViewPlan={handleViewPlan}
                        />
                      </motion.div>
                    )}
                    {activeTab === 'plans' && (
                      <motion.div
                        key="plans"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                      >
                        <ImplementationPlansManager
                          workspaceId={workspaceId}
                          onViewPlan={handleViewPlan}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Plan Viewer Modal */}
      <AnimatePresence>
        {viewingPlanId && (
          <CrossTaskPlanViewer
            planId={viewingPlanId}
            onClose={handleClosePlanViewer}
          />
        )}
      </AnimatePresence>
    </>
  );
}
