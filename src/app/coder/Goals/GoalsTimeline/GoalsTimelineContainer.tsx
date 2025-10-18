'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Goal } from '../../../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TIMELINE_CONSTANTS, calculateOptimalTimelineOffset, sortGoalsByOrder } from '../lib';
import GoalsTimelineItem from './GoalsTimelineItem';

interface GoalsTimelineContainerProps {
  goals: Goal[];
  selectedGoal: Goal | null;
  onGoalSelect: (goal: Goal) => void;
}

export default function GoalsTimelineContainer({ 
  goals, 
  selectedGoal, 
  onGoalSelect 
}: GoalsTimelineContainerProps) {
  const [slideOffset, setSlideOffset] = useState(0);
  const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);
  const { MAX_VISIBLE_GOALS, GOAL_WIDTH, SCROLL_DURATION } = TIMELINE_CONSTANTS;
  const TIMELINE_WIDTH = MAX_VISIBLE_GOALS * GOAL_WIDTH;

  const sortedGoals = sortGoalsByOrder(goals);

  useEffect(() => {
    const optimalOffset = calculateOptimalTimelineOffset(sortedGoals, MAX_VISIBLE_GOALS, GOAL_WIDTH);
    setSlideOffset(optimalOffset);
  }, [goals, sortedGoals, MAX_VISIBLE_GOALS, GOAL_WIDTH]);

  const maxOffset = Math.max(0, (sortedGoals.length - MAX_VISIBLE_GOALS) * GOAL_WIDTH);
  const canGoBack = slideOffset > 0;
  const canGoNext = slideOffset < maxOffset;

  const handlePrevious = () => {
    if (canGoBack) {
      setSlideOffset(prev => Math.max(0, prev - GOAL_WIDTH));
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setSlideOffset(prev => Math.min(maxOffset, prev + GOAL_WIDTH));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      handleNext();
    } else if (e.deltaY < 0) {
      handlePrevious();
    }
  };

  return (
    <div
      className="flex items-center py-4 relative justify-center"
      onWheel={handleWheel}
      style={{ cursor: sortedGoals.length > MAX_VISIBLE_GOALS ? 'grab' : 'default' }}
    >
      {/* Animated Background Glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-600/10 to-transparent blur-3xl"
      />

      {/* Left Navigation */}
      <AnimatePresence>
        {canGoBack && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-gradient-to-r from-yellow-600/30 to-orange-600/30 hover:from-yellow-500/40 hover:to-orange-500/40 transition-all duration-300 border border-yellow-600/50 backdrop-blur-xl shadow-lg"
          >
            <ChevronLeft size={20} className="text-yellow-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Timeline Container */}
      <div
        className="relative overflow-hidden mx-12"
        style={{ width: `${TIMELINE_WIDTH}px` }}
      >
        {/* Futuristic Timeline Track */}
        <div className="absolute top-7 left-0 right-0 h-0.5 transform -translate-y-1/2">
          {/* Base track */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

          {/* Animated energy flow */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"
            style={{ width: '50%' }}
          />

          {/* Glow effect */}
          <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
        </div>

        {/* Connection Lines Between Goals */}
        <svg className="absolute top-1/2 left-0 right-0 h-0 transform -translate-y-1/2 pointer-events-none" style={{ zIndex: 0 }}>
          {sortedGoals.map((goal, index) => {
            if (index === sortedGoals.length - 1) return null;
            const x1 = (index * GOAL_WIDTH) + (GOAL_WIDTH / 2);
            const x2 = ((index + 1) * GOAL_WIDTH) + (GOAL_WIDTH / 2);

            return (
              <motion.line
                key={`line-${goal.id}`}
                x1={x1 - slideOffset}
                y1="0"
                x2={x2 - slideOffset}
                y2="0"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              />
            );
          })}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Sliding Goals Container */}
        <motion.div
          className="flex py-0.5 items-center relative"
          animate={{ x: -slideOffset }}
          transition={{ duration: SCROLL_DURATION, ease: "easeOut" }}
        >
          {sortedGoals.map((goal, index) => (
            <GoalsTimelineItem
              key={goal.id}
              goal={goal}
              index={index}
              isSelected={selectedGoal?.id === goal.id}
              isHovered={hoveredGoal === goal.id}
              onSelect={onGoalSelect}
              onMouseEnter={() => setHoveredGoal(goal.id)}
              onMouseLeave={() => setHoveredGoal(null)}
            />
          ))}
        </motion.div>
      </div>

      {/* Right Navigation */}
      <AnimatePresence>
        {canGoNext && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-gradient-to-r from-orange-600/30 to-red-600/30 hover:from-orange-500/40 hover:to-red-500/40 transition-all duration-300 border border-orange-600/50 backdrop-blur-xl shadow-lg"
          >
            <ChevronRight size={20} className="text-orange-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Energy Particles */}
      {selectedGoal && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: '50%', y: '50%' }}
              animate={{
                opacity: [0, 0.6, 0],
                x: ['50%', `${50 + (Math.random() - 0.5) * 100}%`],
                y: ['50%', `${50 + (Math.random() - 0.5) * 100}%`],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeOut',
              }}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full blur-sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
