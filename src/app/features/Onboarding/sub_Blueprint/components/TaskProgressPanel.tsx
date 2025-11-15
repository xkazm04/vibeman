/**
 * TaskProgressPanel Component
 *
 * Side panel that displays progress toward 100 auto-generated tasks.
 * Appears on the right side of the Blueprint layout with a collapsible interface.
 * Features a smooth, blueprint-inspired design.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Target, CheckCircle2, Circle, Zap } from 'lucide-react';

// Dummy data for now - will be replaced with real data later
const DUMMY_TASKS = {
  completed: 23,
  total: 100,
  recentTasks: [
    { id: 1, name: 'Fix build error in auth module', completed: true },
    { id: 2, name: 'Optimize database queries', completed: true },
    { id: 3, name: 'Add input validation', completed: true },
    { id: 4, name: 'Refactor user service', completed: false },
    { id: 5, name: 'Implement caching layer', completed: false },
  ],
};

export const TaskProgressPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Hidden by default
  const { completed, total, recentTasks } = DUMMY_TASKS;
  const percentage = Math.round((completed / total) * 100);

  // Calculate completion milestone
  const nextMilestone = Math.ceil(completed / 25) * 25;
  const tasksToMilestone = nextMilestone - completed;

  const togglePanel = () => setIsExpanded(!isExpanded);

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed right-0 top-20 z-40 h-[calc(100vh-2rem)]"
    >
      <div className="relative h-full flex items-stretch">
        {/* Toggle Button */}
        <button
          onClick={togglePanel}
          className="
            absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full
            bg-slate-900/95 backdrop-blur-sm
            border border-cyan-500/40 border-r-0
            rounded-l-xl p-3
            hover:bg-slate-800/95 transition-all duration-300
            shadow-[0_0_20px_rgba(6,182,212,0.15)]
            group
          "
          data-testid="task-panel-toggle"
        >
          <div className="relative">
            {isExpanded ? (
              <ChevronRight size={20} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            ) : (
              <ChevronLeft size={20} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            )}
            {/* Indicator when not expanded - Static version (removed pulse animation) */}
            {!isExpanded && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
            )}
          </div>
        </button>

        {/* Panel Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="
                relative overflow-hidden
                bg-gradient-to-br from-slate-900/95 via-blue-950/40 to-slate-900/95
                backdrop-blur-md
                border-l border-cyan-500/30
                shadow-[0_0_60px_rgba(6,182,212,0.15)]
              "
            >
              {/* Blueprint grid overlay */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="w-full h-full" style={{
                  backgroundImage: `
                    linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }} />
              </div>

              <div className="relative h-full flex flex-col p-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-5 pb-5 border-b border-cyan-500/20">
                  <div className="mt-1 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <Target className="text-cyan-400" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-cyan-400 font-bold text-xl tracking-wide uppercase">
                      Task Queue
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-mono">
                      {completed} / {total} completed
                    </p>
                  </div>
                </div>

                {/* Circular Progress */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-36 h-36">
                    {/* Background circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="rgba(6,182,212,0.1)"
                        strokeWidth="8"
                        fill="none"
                      />
                      {/* Progress circle */}
                      <motion.circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="url(#progressGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "377", strokeDashoffset: 377 }}
                        animate={{
                          strokeDashoffset: 377 - (377 * percentage) / 100,
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        className="text-4xl font-bold text-cyan-400"
                      >
                        {percentage}%
                      </motion.div>
                      <div className="text-xs text-slate-400 mt-1">progress</div>
                    </div>
                  </div>
                </div>

                {/* Milestone Info */}
                <div className="mb-4 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-cyan-400" />
                    <span className="text-xs text-cyan-300 font-medium uppercase tracking-wide">
                      Next Milestone
                    </span>
                  </div>
                  <div className="text-slate-300 text-sm">
                    {tasksToMilestone} task{tasksToMilestone !== 1 ? 's' : ''} until <span className="text-cyan-400 font-bold">{nextMilestone}</span>
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-3 font-semibold">
                    Recent Tasks
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-cyan-500/5 [&::-webkit-scrollbar-track]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50" data-testid="task-list-container">
                    {recentTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * index, duration: 0.3 }}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
                        data-testid={`task-item-${task.id}`}
                      >
                        {task.completed ? (
                          <CheckCircle2
                            size={16}
                            className="text-cyan-400 mt-0.5 flex-shrink-0"
                          />
                        ) : (
                          <Circle
                            size={16}
                            className="text-slate-600 mt-0.5 flex-shrink-0 group-hover:text-slate-500 transition-colors"
                          />
                        )}
                        <span className={`text-xs leading-tight ${
                          task.completed ? 'text-slate-400 line-through' : 'text-slate-300'
                        }`}>
                          {task.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="mt-4 pt-4 border-t border-cyan-500/20 grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-slate-800/30">
                    <div className="text-xl font-bold text-cyan-400">{completed}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Done</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-800/30">
                    <div className="text-xl font-bold text-slate-400">{total - completed}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Remaining</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};
