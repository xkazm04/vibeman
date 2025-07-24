'use client';

import { motion } from 'framer-motion';
import { 
  Database, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  CheckCircle, 
  Loader2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Repository, SyncStatus, HealthStatus } from './types';
import { cardVariants } from './variants';

interface SyncControlsProps {
  repositories: Repository[];
  activeSyncs: Set<string>;
  syncStatuses: Map<string, SyncStatus>;
  healthStatus: HealthStatus | null;
  onSyncAll: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function SyncControls({ 
  repositories, 
  activeSyncs, 
  syncStatuses, 
  healthStatus, 
  onSyncAll,
  isLoading,
  error
}: SyncControlsProps) {
  const completedCount = Array.from(syncStatuses.values()).filter(s => s.status === 'completed').length;
  const failedCount = Array.from(syncStatuses.values()).filter(s => s.status === 'failed').length;
  const canSyncAll = activeSyncs.size === 0 && healthStatus?.qdrant_connected && !error;

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-2xl shadow-xl mb-6 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-4 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
          </div>

          <motion.button
            onClick={onSyncAll}
            disabled={!canSyncAll || isLoading}
            whileHover={{ scale: canSyncAll && !isLoading ? 1.05 : 1 }}
            whileTap={{ scale: canSyncAll && !isLoading ? 0.95 : 1 }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center gap-2"
          >
            {activeSyncs.size > 0 || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            <span className="text-sm">Sync All Repositories</span>
          </motion.button>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 text-center hover:bg-gray-800/50 transition-colors duration-200"
          >
            <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <motion.p
              key={repositories.length}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-semibold text-gray-100"
            >
              {repositories.length}
            </motion.p>
            <p className="text-xs text-gray-400">Total</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 text-center hover:bg-gray-800/50 transition-colors duration-200"
          >
            <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <motion.p
              key={activeSyncs.size}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-semibold text-gray-100"
            >
              {activeSyncs.size}
            </motion.p>
            <p className="text-xs text-gray-400">Active</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 text-center hover:bg-gray-800/50 transition-colors duration-200"
          >
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <motion.p
              key={completedCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-semibold text-gray-100"
            >
              {completedCount}
            </motion.p>
            <p className="text-xs text-gray-400">Completed</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 text-center hover:bg-gray-800/50 transition-colors duration-200"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <motion.p
              key={failedCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-semibold text-gray-100"
            >
              {failedCount}
            </motion.p>
            <p className="text-xs text-gray-400">Failed</p>
          </motion.div>
        </div>

        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-300 font-medium">API Connection Error</p>
            </div>
            <p className="text-xs text-red-400 mt-1">{error}</p>
          </motion.div>
        )}

        {!healthStatus?.qdrant_connected && !error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-sm text-amber-300 font-medium">Qdrant connection required to sync repositories</p>
            </div>
          </motion.div>
        )}

        {activeSyncs.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-blue-300 font-medium">
                {activeSyncs.size} repository{activeSyncs.size > 1 ? 'ies' : 'y'} currently syncing...
              </p>
            </div>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <p className="text-sm text-gray-300">Loading repositories...</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}