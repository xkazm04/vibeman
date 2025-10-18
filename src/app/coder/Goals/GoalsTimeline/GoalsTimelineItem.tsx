'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Goal } from '../../../../types';
import { getStatusConfig } from '../lib/goalConstants';

interface GoalsTimelineItemProps {
  goal: Goal;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (goal: Goal) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function GoalsTimelineItem({
  goal,
  index,
  isSelected,
  isHovered,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: GoalsTimelineItemProps) {
  const statusConfig = getStatusConfig(goal.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      className="relative flex flex-col items-center justify-center group"
      onClick={() => onSelect(goal)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Goal Node Container */}
      <div className="relative">
        {/* Main Goal Circle */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-12 h-12 rounded-full cursor-pointer transition-all duration-300 ${
            isSelected
              ? 'bg-gradient-to-br from-blue-400 via-orange-500 to-red-500 shadow-2xl shadow-yellow-500/50'
              : goal.status === 'in_progress'
              ? 'bg-gradient-to-br from-blue-500/80 to-orange-500/80 shadow-lg shadow-yellow-500/30'
              : goal.status === 'done'
              ? 'bg-gradient-to-br from-green-500/70 to-emerald-500/70 shadow-md shadow-green-500/20'
              : 'bg-gradient-to-br from-gray-600/60 to-gray-700/60 shadow-md'
          } flex items-center justify-center border-2 ${
            isSelected ? 'border-yellow-300' : 'border-white/20'
          }`}
        >
          {/* Icon */}
          <StatusIcon
            className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-200'}`}
          />

          {/* Pulsing Effect for Selected */}
          {isSelected && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-yellow-400/30 blur-md"
              />
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2"
              >
                <div className="absolute top-0 left-1/2 w-1 h-1 bg-cyan-300 rounded-full blur-sm" />
                <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-orange-300 rounded-full blur-sm" />
                <div className="absolute left-0 top-1/2 w-1 h-1 bg-red-300 rounded-full blur-sm" />
                <div className="absolute right-0 top-1/2 w-1 h-1 bg-pink-300 rounded-full blur-sm" />
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {/* Goal Title */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{
          opacity: isSelected ? 1 : (isHovered ? 0.9 : 0.6),
          y: 0,
          scale: isSelected ? 1.05 : (isHovered ? 1.02 : 1)
        }}
        transition={{ delay: index * 0.08 + 0.1 }}
        className={`mt-3 text-[14px] uppercase font-semibold text-center px-2 max-w-full transition-all duration-300 ${
          isSelected
            ? 'text-yellow-300'
            : isHovered
            ? 'text-gray-300'
            : 'text-gray-500'
        }`}
      >
        {goal.title}
      </motion.div>
    </motion.div>
  );
}
