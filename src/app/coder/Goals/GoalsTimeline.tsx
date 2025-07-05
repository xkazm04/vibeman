'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Goal } from '../../../types';
import { HammerIcon } from 'lucide-react';

interface GoalsTimelineProps {
  goals: Goal[];
  selectedGoal: Goal | null;
  onGoalSelect: (goal: Goal) => void;
}

export default function GoalsTimeline({ goals, selectedGoal, onGoalSelect }: GoalsTimelineProps) {
  const sortedGoals = [...goals].sort((a, b) => a.order - b.order);

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
    <div className="flex items-center py-2">
      {/* Timeline with connected dots */}
      <div className="relative flex items-center">
        {/* Timeline Line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-yellow-600/30 via-yellow-600/60 to-yellow-600/30 transform -translate-y-1/2" />
        
        {/* Goal Points */}
        <div className="flex items-center relative">
          {sortedGoals.map((goal, index) => {
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-center"
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

                {/* Spacing between dots */}
                {index < sortedGoals.length - 1 && (
                  <div className="w-16 h-px" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 