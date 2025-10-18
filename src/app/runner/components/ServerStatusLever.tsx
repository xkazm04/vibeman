'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ServerStatus } from '../types';

interface ServerStatusLeverProps {
  serverStatus: ServerStatus;
  onToggle: (e: React.MouseEvent) => void;
}

const ServerStatusLever = React.memo(({ serverStatus, onToggle }: ServerStatusLeverProps) => {
  const { isRunning, hasError, isStopping, isLoading } = serverStatus;

  const getTitle = () => {
    if (isStopping) return 'Stopping Server...';
    if (hasError) return 'Clear Error State';
    if (isRunning) return 'Stop Server';
    return 'Start Server';
  };

  const getStatusColor = () => {
    if (isStopping || isLoading) {
      return 'bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/40';
    }
    if (hasError) {
      return 'bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/40';
    }
    if (isRunning) {
      return 'bg-green-500 border-green-400 shadow-lg shadow-green-500/40';
    }
    return 'bg-red-500 border-red-400 shadow-lg shadow-red-500/40';
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={isLoading || isStopping}
      className="relative cursor-pointer w-4 h-8 bg-gray-800 rounded-full border border-gray-600 focus:outline-none disabled:opacity-50"
      title={getTitle()}
    >
      {/* Lever Track */}
      <div className="absolute inset-0.5 bg-gray-900 rounded-full">
        {/* Lever Handle */}
        <motion.div
          animate={{ y: isRunning ? 12 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.3 }}
          className="relative w-3 h-3 mx-auto"
        >
          {/* Main Circle */}
          <div className={`w-3 h-3 rounded-full border transition-all duration-300 ${getStatusColor()}`}>
            {/* Loading Spinner */}
            {(isLoading || isStopping) && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0.5 border border-white border-t-transparent rounded-full"
              />
            )}
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
});

ServerStatusLever.displayName = 'ServerStatusLever';

export default ServerStatusLever;