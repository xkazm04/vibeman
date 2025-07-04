import React from 'react';
import { motion } from 'framer-motion';

interface StatusLeverProps {
  isRunning: boolean;
  isLoading: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const StatusLever: React.FC<StatusLeverProps> = ({
  isRunning,
  isLoading,
  onToggle,
  disabled = false
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={disabled || isLoading}
      className="relative cursor-pointer w-6 h-12 bg-gray-800 rounded-full border border-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      title={isRunning ? 'Stop Server' : 'Start Server'}
    >
      {/* Lever Track */}
      <div className="absolute inset-1 bg-gray-900 rounded-full">
        {/* Lever Handle */}
        <motion.div
          animate={{
            y: isRunning ? 16 : 0
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: 0.3
          }}
          className="relative w-4 h-4 mx-auto"
        >
          {/* Main Circle */}
          <div
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              isRunning
                ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/40'
                : 'bg-red-500 border-red-400 shadow-lg shadow-red-500/40'
            }`}
          >
            {/* Loading Spinner */}
            {isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0.5 border border-white border-t-transparent rounded-full"
              />
            )}

            {/* Inner Glow Dot */}
            {!isLoading && (
              <div
                className={`absolute inset-1 rounded-full transition-all duration-300 ${
                  isRunning ? 'bg-green-300' : 'bg-red-300'
                }`}
              />
            )}
          </div>

          {/* Outer Glow Effect */}
          {isRunning && !isLoading && (
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 8px rgba(34, 197, 94, 0.3)',
                  '0 0 16px rgba(34, 197, 94, 0.6)',
                  '0 0 8px rgba(34, 197, 94, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
            />
          )}
        </motion.div>

        {/* Position Indicators */}
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-600 rounded-full" />
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-600 rounded-full" />
      </div>

      {/* Background Glow */}
      <motion.div
        animate={{
          opacity: isRunning ? 0.6 : 0.3,
          scale: isRunning ? 1.2 : 1
        }}
        transition={{ duration: 0.3 }}
        className={`absolute inset-0 rounded-full blur-md -z-10 ${
          isRunning ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}
      />
    </motion.button>
  );
}; 