'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  Folder, 
  Play, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  FolderX,
  Database
} from 'lucide-react';
import { Repository, SyncStatus, HealthStatus } from './types';
import { cardVariants, slideInVariants, fadeVariants, progressVariants, scaleVariants } from './variants';
import { getStatusText, getProgressPercent, formatDuration } from './functions';

interface SyncRepoListProps {
  repositories: Repository[];
  syncStatuses: Map<string, SyncStatus>;
  activeSyncs: Set<string>;
  healthStatus: HealthStatus | null;
  onStartSync: (repoName: string) => void;
  error?: string | null;
}

export default function SyncRepoList({ 
  repositories, 
  syncStatuses, 
  activeSyncs, 
  healthStatus, 
  onStartSync,
  error
}: SyncRepoListProps) {
  
  const getStatusIcon = (status: SyncStatus | undefined) => {
    switch (status?.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'scanning':
      case 'indexing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg shadow-lg">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100">Repository Management</h2>
          <div className="ml-auto bg-gray-800/50 px-3 py-1 rounded-full text-sm font-medium text-gray-300">
            {repositories.length} repositories
          </div>
        </div>
      </div>

      {/* Repository List */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {repositories.map((repo, index) => {
            const status = syncStatuses.get(repo.name);
            const isActive = activeSyncs.has(repo.name);
            const progress = getProgressPercent(status);
            const canSync = repo.exists && !isActive && healthStatus?.qdrant_connected && !error;

            return (
              <motion.div
                key={repo.name}
                variants={slideInVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={index}
                whileHover={{
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  transition: { duration: 0.2 }
                }}
                className="border-b border-gray-800/50 last:border-b-0 p-4 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Repository Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`p-2 rounded-lg shadow-sm ${
                        repo.exists 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                          : 'bg-gradient-to-r from-gray-600 to-gray-700'
                      }`}
                    >
                      {repo.exists ? (
                        <Folder className="w-4 h-4 text-white" />
                      ) : (
                        <FolderX className="w-4 h-4 text-white" />
                      )}
                    </motion.div>

                    {/* Repository Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-100 truncate group-hover:text-blue-400 transition-colors duration-200">
                          {repo.name}
                        </h3>
                        {!repo.exists && (
                          <motion.div
                            variants={scaleVariants}
                            initial="initial"
                            animate="animate"
                            className="px-2 py-1 bg-red-900/30 border border-red-800/50 text-red-300 text-xs rounded-full font-medium"
                          >
                            Missing
                          </motion.div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate font-mono">{repo.path}</p>

                      {/* Status Information */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(status)}
                          <span className="text-xs font-medium text-gray-300">
                            {getStatusText(status, isActive)}
                          </span>
                        </div>

                        {status?.endTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-400">
                              {new Date(status.endTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sync Button */}
                  <motion.button
                    onClick={() => onStartSync(repo.name)}
                    disabled={!canSync}
                    whileHover={{ scale: canSync ? 1.05 : 1 }}
                    whileTap={{ scale: canSync ? 0.95 : 1 }}
                    className="ml-3 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center gap-2"
                  >
                    {isActive ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span className="text-sm">Sync</span>
                  </motion.button>
                </div>

                {/* Progress Bar */}
                <AnimatePresence>
                  {status?.status === 'indexing' && (
                    <motion.div
                      variants={fadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="mt-3"
                    >
                      <div className="flex justify-between text-xs text-gray-300 mb-2">
                        <span className="font-medium">Indexing files...</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          variants={progressVariants}
                          initial="initial"
                          animate="animate"
                          custom={progress}
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-sm"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{status.filesProcessed || 0} processed</span>
                        <span>{status.totalFiles || 0} total</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success Status */}
                <AnimatePresence>
                  {status && status.status === 'completed' && (
                    <motion.div
                      variants={fadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="mt-3 bg-green-900/20 border border-green-800/30 rounded-lg p-3"
                    >
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="font-medium text-green-300">
                            {status.filesIndexed || 0} files indexed
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-green-400" />
                          <span className="font-medium text-green-300">
                            Duration: {formatDuration(status.startTime, status.endTime)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Status */}
                <AnimatePresence>
                  {status && status.status === 'failed' && (
                    <motion.div
                      variants={fadeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="mt-3 bg-red-900/20 border border-red-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-red-300">
                          {status.error}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {repositories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-200 mb-2">No repositories found</h4>
            <p className="text-gray-400">Configure your repository paths to get started.</p>
          </motion.div>
        )}

        {/* Error State */}
        {error && repositories.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-center border-t border-gray-800/50"
          >
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-red-300 mb-1">Connection Error</h4>
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
      `}</style>
    </motion.div>
  );
}