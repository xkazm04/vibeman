'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Trash2 } from 'lucide-react';

interface IdeaStats {
  total: number;
  pending: number;
  accepted: number;
  implemented: number;
}

interface IdeasHeaderProps {
  stats: IdeaStats;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  showDeleteConfirm: boolean;
  deletingAll: boolean;
  onDeleteAllClick: () => void;
  onDeleteAllConfirm: () => void;
  onDeleteAllCancel: () => void;
}

export default function IdeasHeader({
  stats,
  filterStatus,
  onFilterStatusChange,
  showDeleteConfirm,
  deletingAll,
  onDeleteAllClick,
  onDeleteAllConfirm,
  onDeleteAllCancel,
}: IdeasHeaderProps) {
  return (
    <motion.div
      className="border-b border-gray-700/40 bg-gray-900/60 backdrop-blur-xl"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/30 rounded-xl border border-blue-500/40"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Lightbulb className="w-6 h-6 text-blue-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                All Ideas
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                LLM-generated insights across all projects
              </p>
            </div>
          </div>

          {/* Stats - Right */}
          <div className="flex items-center space-x-6">
            <div className="text-xs">
              <span className="text-gray-500">Total:</span>{' '}
              <span className="text-white font-mono font-semibold">{stats.total}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Pending:</span>{' '}
              <span className="text-blue-400 font-mono font-semibold">{stats.pending}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Accepted:</span>{' '}
              <span className="text-green-400 font-mono font-semibold">{stats.accepted}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Implemented:</span>{' '}
              <span className="text-amber-400 font-mono font-semibold">{stats.implemented}</span>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              className="px-3 py-1.5 bg-gray-800/60 border border-gray-700/40 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500/40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
            </select>

            {/* Delete All Button */}
            {!showDeleteConfirm ? (
              <motion.button
                onClick={onDeleteAllClick}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Delete all ideas (for testing)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All</span>
              </motion.button>
            ) : (
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={onDeleteAllConfirm}
                  disabled={deletingAll}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/40 border border-red-500/60 rounded-lg text-xs text-red-300 font-bold transition-all disabled:opacity-50"
                  whileHover={{ scale: deletingAll ? 1 : 1.05 }}
                  whileTap={{ scale: deletingAll ? 1 : 0.95 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingAll ? 'Deleting...' : 'Confirm'}</span>
                </motion.button>
                <button
                  onClick={onDeleteAllCancel}
                  disabled={deletingAll}
                  className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
