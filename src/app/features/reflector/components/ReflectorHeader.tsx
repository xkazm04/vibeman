'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar } from 'lucide-react';
import { ReflectorStats } from '../lib/statsHelpers';

interface ReflectorHeaderProps {
  stats: ReflectorStats;
}

export default function ReflectorHeader({ stats }: ReflectorHeaderProps) {
  return (
    <motion.div
      className="border-b border-yellow-700/40 bg-gray-900/60 backdrop-blur-xl"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          {/* Left: Title */}
          <div className="flex items-center space-x-4">
            <motion.div
              className="p-3 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 rounded-xl border border-yellow-500/40"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Trophy className="w-6 h-6 text-yellow-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                Reflector
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Implemented ideas and achievements
              </p>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <div className="text-sm">
                <span className="text-gray-500">Today:</span>{' '}
                <span className="text-yellow-400 font-mono font-semibold">{stats.today}</span>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Week:</span>{' '}
              <span className="text-yellow-400 font-mono font-semibold">{stats.week}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Month:</span>{' '}
              <span className="text-amber-400 font-mono font-semibold">{stats.month}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}














