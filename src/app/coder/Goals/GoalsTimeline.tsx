'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Goal } from '../../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusIcon, getStatusStyle } from '@/helpers/timelineStyles';
import { TIMELINE_CONSTANTS, calculateOptimalTimelineOffset, sortGoalsByOrder } from './lib';

interface GoalsTimelineProps {
  goals: Goal[];
  selectedGoal: Goal | null;
  onGoalSelect: (goal: Goal) => void;
}

export default function GoalsTimeline({ goals, selectedGoal, onGoalSelect }: GoalsTimelineProps) {
  const [slideOffset, setSlideOffset] = useState(0);
  const { MAX_VISIBLE_GOALS, GOAL_WIDTH, SCROLL_DURATION } = TIMELINE_CONSTANTS;
  const TIMELINE_WIDTH = MAX_VISIBLE_GOALS * GOAL_WIDTH; // Fixed width for visible area
  
  const sortedGoals = sortGoalsByOrder(goals);
  
  // Set the optimal offset when goals change
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
          className="flex py-2 items-center relative"
          animate={{ x: -slideOffset }}
          transition={{ duration: SCROLL_DURATION, ease: "easeInOut" }}
          style={{ width: `${sortedGoals.length * GOAL_WIDTH}px` }}
        >
          {sortedGoals.map((goal, index) => {
            const isSelected = selectedGoal?.id === goal.id;
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * TIMELINE_CONSTANTS.ANIMATION_DELAY_PER_ITEM }}
                className="relative flex items-center justify-center"
                style={{ width: `${GOAL_WIDTH}px` }}
                onClick={() => onGoalSelect(goal)}
              >
                {/* Goal Point */}
                <div className={getStatusStyle(goal.status, isSelected)}>
                  {getStatusIcon(goal.status)}
                  
                  {/* Enhanced glow effects for selected goal */}
                  {isSelected && (
                    <>
                      {/* Pulsing outer glow */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ 
                          opacity: [0.4, 0.8, 0.4],
                          scale: [1.5, 2.5, 1.5]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 rounded-full bg-yellow-400/40 blur-md -z-20"
                      />
                      
                      {/* Breathing inner glow */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: [0.6, 1, 0.6],
                          scale: [1, 1.3, 1]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 rounded-full bg-yellow-300/60 blur-sm -z-10"
                      />
                      
                      {/* Shimmer effect */}
                      <motion.div
                        initial={{ opacity: 0, rotate: 0 }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          rotate: 360
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-yellow-200/80 to-transparent blur-[1px] -z-5"
                      />
                    </>
                  )}
                  
                  {/* Standard glow effect for in progress goal */}
                  {goal.status === 'in_progress' && !isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1.2, 1.8, 1.2]
                      }}
                      transition={{ 
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
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