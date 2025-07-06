'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Goal } from '../../../types';
import { HammerIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface GoalsTimelineProps {
  goals: Goal[];
  selectedGoal: Goal | null;
  onGoalSelect: (goal: Goal) => void;
}

export default function GoalsTimeline({ goals, selectedGoal, onGoalSelect }: GoalsTimelineProps) {
  const [slideOffset, setSlideOffset] = useState(0);
  const MAX_VISIBLE_GOALS = 5;
  const GOAL_WIDTH = 80; // Width of each goal including spacing (64px spacing + 16px dot)
  const TIMELINE_WIDTH = MAX_VISIBLE_GOALS * GOAL_WIDTH; // Fixed width for visible area
  
  const sortedGoals = [...goals].sort((a, b) => a.order - b.order);
  
  // Calculate the optimal slide offset to show the in-progress goal
  const calculateOptimalOffset = () => {
    const inProgressGoal = sortedGoals.find(goal => goal.status === 'in_progress');
    if (!inProgressGoal || sortedGoals.length <= MAX_VISIBLE_GOALS) return 0;
    
    const inProgressIndex = sortedGoals.findIndex(goal => goal.id === inProgressGoal.id);
    
    // If in-progress goal is within the first 5, show from beginning
    if (inProgressIndex < MAX_VISIBLE_GOALS) return 0;
    
    // Calculate offset to put in-progress goal at the leftmost position
    const maxOffset = Math.max(0, (sortedGoals.length - MAX_VISIBLE_GOALS) * GOAL_WIDTH);
    const desiredOffset = (inProgressIndex - 0) * GOAL_WIDTH;
    
    return Math.min(desiredOffset, maxOffset);
  };
  
  // Set the optimal offset when goals change
  useEffect(() => {
    const optimalOffset = calculateOptimalOffset();
    setSlideOffset(optimalOffset);
  }, [goals]);
  
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

  // Handle mouse wheel scrolling
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY > 0) {
      // Scroll down - go to next
      handleNext();
    } else if (e.deltaY < 0) {
      // Scroll up - go to previous
      handlePrevious();
    }
  };

  const getStatusStyle = (status: Goal['status'], isSelected: boolean) => {
    const baseClasses = "w-4 h-4 rounded-full border cursor-pointer transition-all duration-300 flex items-center justify-center relative";
    
    switch (status) {
      case 'done':
        return `${baseClasses} bg-gradient-to-r from-yellow-600 to-yellow-800 border-yellow-700 ${
          isSelected ? 'scale-125' : 'hover:scale-110'
        }`;
      case 'in_progress':
        return `${baseClasses} bg-gradient-to-r from-yellow-600 to-yellow-800 border-yellow-700 shadow-lg shadow-yellow-600/50 ${
          isSelected ? 'scale-125' : 'hover:scale-110'
        }`;
      case 'open':
        return `${baseClasses} bg-gradient-to-r from-yellow-600 to-yellow-800 border-yellow-700 ${
          isSelected ? 'scale-125' : 'hover:scale-110'
        }`;
      default:
        return baseClasses;
    }
  };

  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'done':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-green-300 text-xs font-bold"
          >
            ✓
          </motion.div>
        );
      case 'in_progress':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-yellow-300 text-xs font-bold"
          >
            <HammerIcon size={12} />
          </motion.div>
        );
      case 'open':
        return null; // No icon for open
      default:
        return null;
    }
  };

  return (
    <div 
      className="flex items-center py-2 relative justify-center"
      onWheel={handleWheel}
      style={{ cursor: sortedGoals.length > MAX_VISIBLE_GOALS ? 'grab' : 'default' }}
    >
      {/* Left Arrow - Absolute positioned */}
      <AnimatePresence>
        {canGoBack && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-1 rounded-full bg-yellow-600/20 hover:bg-yellow-600/30 transition-colors duration-200 border border-yellow-600/30 hover:border-yellow-600/50"
          >
            <ChevronLeft size={16} className="text-yellow-600" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Timeline Container with fixed width and overflow hidden */}
      <div 
        className="relative overflow-hidden mx-8"
        style={{ width: `${TIMELINE_WIDTH}px` }}
      >
        {/* Timeline Line - Fixed background */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-yellow-600/30 via-yellow-600/60 to-yellow-600/30 transform -translate-y-1/2" />
        
        {/* Sliding Goals Container */}
        <motion.div
          className="flex items-center relative"
          animate={{ x: -slideOffset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ width: `${sortedGoals.length * GOAL_WIDTH}px` }}
        >
          {sortedGoals.map((goal, index) => {
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-center justify-center"
                style={{ width: `${GOAL_WIDTH}px` }}
                onClick={() => onGoalSelect(goal)}
              >
                {/* Goal Point */}
                <div className={getStatusStyle(goal.status, selectedGoal?.id === goal.id)}>
                  {getStatusIcon(goal.status)}
                  
                  {/* Standard glow effect for in progress goal */}
                  {goal.status === 'in_progress' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 2 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 rounded-full bg-yellow-600/30 blur-sm -z-10"
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Right Arrow - Absolute positioned */}
      <AnimatePresence>
        {canGoNext && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={handleNext}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-1 rounded-full bg-yellow-600/20 hover:bg-yellow-600/30 transition-colors duration-200 border border-yellow-600/30 hover:border-yellow-600/50"
          >
            <ChevronRight size={16} className="text-yellow-600" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
} 