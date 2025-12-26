'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageSquare, Construction } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

/**
 * Parliament Dashboard Wrapper
 * Displays the multi-agent debate system components
 */
export default function ParliamentDashboard() {
  const { activeProject } = useActiveProjectStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white">Parliament</h2>
            <p className="text-sm text-gray-400">
              Multi-agent debate system for superior decision making
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Agent System</span>
          </div>
          <div className="text-2xl font-light text-white">12+ Agents</div>
          <p className="text-xs text-gray-500 mt-1">
            Specialized AI agents for different perspectives
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Debate Rounds</span>
          </div>
          <div className="text-2xl font-light text-white">3-5 Rounds</div>
          <p className="text-xs text-gray-500 mt-1">
            Iterative deliberation until consensus
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Quality</span>
          </div>
          <div className="text-2xl font-light text-white">Enhanced</div>
          <p className="text-xs text-gray-500 mt-1">
            Better decisions through diverse viewpoints
          </p>
        </motion.div>
      </div>

      {/* Main Content - Under Construction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 overflow-hidden"
      >
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <Construction className="w-16 h-16 text-amber-400/50 mb-4" />
          <h3 className="text-xl font-light text-gray-300 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500">
            Agent Reputation Dashboard is under development.
          </p>
        </div>
      </motion.div>

      {/* Info Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30"
      >
        <p className="text-sm text-blue-300">
          <span className="font-medium">How it works:</span> The Parliament system
          uses specialized AI agents that debate and vote on ideas, ensuring
          thorough evaluation from multiple perspectives before implementation.
        </p>
      </motion.div>
    </div>
  );
}
