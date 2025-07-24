'use client';

import { motion } from 'framer-motion';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Server, 
  Brain, 
  Shield,
  WifiOff
} from 'lucide-react';
import { HealthStatus } from './types';
import { cardVariants } from './variants';

interface SyncStatusCardProps {
  healthStatus: HealthStatus | null;
  onRefresh: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function SyncStatusCard({ healthStatus, onRefresh, isLoading, error }: SyncStatusCardProps) {
  const healthItems = [
    {
      icon: Server,
      label: "Qdrant Vector DB",
      status: healthStatus?.qdrant_connected,
      statusText: healthStatus?.qdrant_connected ? 'Connected' : 'Disconnected',
      gradient: "from-emerald-500 to-teal-500",
      bg: "from-emerald-900/20 to-teal-900/20",
      border: "border-emerald-800/30"
    },
    {
      icon: Brain,
      label: "OpenAI Embeddings",
      status: healthStatus?.openai_configured,
      statusText: healthStatus?.openai_configured ? 'Configured' : 'Not configured',
      gradient: "from-blue-500 to-cyan-500",
      bg: "from-blue-900/20 to-cyan-900/20",
      border: "border-blue-800/30"
    },
    {
      icon: Shield,
      label: "System Status",
      status: healthStatus?.status === 'ok',
      statusText: healthStatus?.status || 'Unknown',
      gradient: "from-purple-500 to-pink-500",
      bg: "from-purple-900/20 to-pink-900/20",
      border: "border-purple-800/30"
    }
  ];

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
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-100">System Health Monitor</h2>
          </div>
          <motion.button
            onClick={onRefresh}
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </motion.button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-4 bg-red-900/20 border-b border-red-800/30"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300 font-medium">Connection Error</span>
          </div>
          <p className="text-xs text-red-400 mt-1">{error}</p>
        </motion.div>
      )}

      {/* Health Status Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden bg-gradient-to-br ${item.bg} border ${item.border} rounded-xl p-3 group hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 bg-gradient-to-r ${item.gradient} rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <item.icon className="w-3 h-3 text-white" />
                </div>
                <motion.div
                  animate={item.status && !error ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {error ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : item.status ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </motion.div>
              </div>
              <h3 className="font-semibold text-gray-200 text-xs mb-1">{item.label}</h3>
              <p className={`text-xs font-medium ${
                error ? 'text-red-400' : 
                item.status ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {error ? 'Error' : item.statusText}
              </p>
              <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            </motion.div>
          ))}
        </div>

        {/* Last Updated */}
        {healthStatus && !error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 text-xs text-gray-400 bg-gray-800/30 rounded-lg p-2"
          >
            Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-xs text-gray-400 bg-gray-800/30 rounded-lg p-2 flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            Checking system health...
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}